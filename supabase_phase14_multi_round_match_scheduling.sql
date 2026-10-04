-- ============================================================================
-- MJ ESPORTS — Phase 14: Multi-Round Match Scheduling & Authoritative RPC Layer
-- Target Engine: Supabase PostgreSQL
-- Description:
--   1. Additively extends public.matches with round and map metadata:
--      - round_number INTEGER NOT NULL DEFAULT 1
--      - round_name TEXT NOT NULL DEFAULT 'Round 1'
--      - map_name TEXT NOT NULL DEFAULT 'Bermuda'
--      - room_release_time TIMESTAMPTZ NULL
--   2. Establishes unique constraint & performance indexes:
--      - uq_matches_tournament_match UNIQUE (tournament_id, match_number) DEFERRABLE
--      - idx_matches_tourn_schedule ON (tournament_id, match_number, scheduled_time ASC)
--      - idx_matches_status ON (status)
--   3. Hardens room credential numeric constraints on public.matches.
--   4. Implements authoritative, atomic SECURITY DEFINER RPCs:
--      - schedule_tournament_matches(p_tournament_id, p_matches)
--      - set_match_room_details(p_match_id, p_room_id, p_room_password, p_room_status, p_room_release_time)
--      - update_match_status(p_match_id, p_new_status)
--      - delete_tournament_match(p_match_id)
--   5. Enforces strict role privilege grants and search_path isolation.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. ADDITIVE SCHEMA EVOLUTION ON PUBLIC.MATCHES
-- ----------------------------------------------------------------------------

-- Add round_number
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'matches' 
      AND column_name = 'round_number'
  ) THEN
    ALTER TABLE public.matches 
      ADD COLUMN round_number INTEGER NOT NULL DEFAULT 1 
      CHECK (round_number >= 1 AND round_number <= 20);
  END IF;
END $$;

-- Add round_name
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'matches' 
      AND column_name = 'round_name'
  ) THEN
    ALTER TABLE public.matches 
      ADD COLUMN round_name TEXT NOT NULL DEFAULT 'Round 1' 
      CHECK (LENGTH(TRIM(round_name)) > 0);
  END IF;
END $$;

-- Add map_name
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'matches' 
      AND column_name = 'map_name'
  ) THEN
    ALTER TABLE public.matches 
      ADD COLUMN map_name TEXT NOT NULL DEFAULT 'Bermuda' 
      CHECK (
        map_name IN (
          'Bermuda',
          'Purgatory',
          'Kalahari',
          'Alpine',
          'NeXTerra',
          'Random',
          'Custom'
        )
      );
  END IF;
END $$;

-- Add room_release_time
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'matches' 
      AND column_name = 'room_release_time'
  ) THEN
    ALTER TABLE public.matches 
      ADD COLUMN room_release_time TIMESTAMPTZ NULL;
  END IF;
END $$;

-- Numeric constraints on room credentials for matches
ALTER TABLE public.matches DROP CONSTRAINT IF EXISTS chk_matches_room_id_numeric;
ALTER TABLE public.matches ADD CONSTRAINT chk_matches_room_id_numeric
  CHECK (room_id IS NULL OR room_id ~ '^[0-9]{1,15}$');

ALTER TABLE public.matches DROP CONSTRAINT IF EXISTS chk_matches_room_password_numeric;
ALTER TABLE public.matches ADD CONSTRAINT chk_matches_room_password_numeric
  CHECK (room_password IS NULL OR room_password ~ '^[0-9]{1,10}$');

-- Match number bounds check
ALTER TABLE public.matches DROP CONSTRAINT IF EXISTS chk_matches_number_bounds;
ALTER TABLE public.matches ADD CONSTRAINT chk_matches_number_bounds
  CHECK (match_number >= 1 AND match_number <= 20);

-- Unique constraint on tournament_id + match_number (Deferrable to permit atomic reindexing)
ALTER TABLE public.matches DROP CONSTRAINT IF EXISTS uq_matches_tournament_match;
ALTER TABLE public.matches ADD CONSTRAINT uq_matches_tournament_match
  UNIQUE (tournament_id, match_number) DEFERRABLE INITIALLY DEFERRED;

-- Performance and lookup indexes
CREATE INDEX IF NOT EXISTS idx_matches_tourn_schedule
  ON public.matches (tournament_id, match_number, scheduled_time ASC);

CREATE INDEX IF NOT EXISTS idx_matches_status
  ON public.matches (status);

-- ----------------------------------------------------------------------------
-- 2. RPC 1: SCHEDULE_TOURNAMENT_MATCHES (ATOMIC ALL-OR-NOTHING)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.schedule_tournament_matches(
  p_tournament_id TEXT,
  p_matches JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_tourn RECORD;
  v_match_count INT;
  v_idx INT;
  v_match_item JSONB;
  
  -- Item attributes
  v_match_num INT;
  v_round_num INT;
  v_round_name TEXT;
  v_map_name TEXT;
  v_match_type TEXT;
  v_sched_time TIMESTAMPTZ;
  v_release_time TIMESTAMPTZ;
  v_prev_time TIMESTAMPTZ := NULL;
  
  -- Validation tracker
  v_seen_nums INT[] := ARRAY[]::INT[];
  v_active_or_completed_count INT;
BEGIN
  -- 1. Authorization: Authenticated Admin or service_role only
  v_user_id := auth.uid();
  IF v_user_id IS NULL AND (SELECT current_setting('role', true)) <> 'service_role' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'UNAUTHENTICATED',
      'message', 'Authentication required to schedule tournament matches.'
    );
  END IF;

  IF NOT (public.is_admin() OR (SELECT current_setting('role', true)) = 'service_role') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'ADMIN_REQUIRED',
      'message', 'Administrator privileges are required to schedule tournament matches.'
    );
  END IF;

  -- 2. Lock target tournament row FOR UPDATE
  SELECT * INTO v_tourn
  FROM public.tournaments
  WHERE id = p_tournament_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'TOURNAMENT_NOT_FOUND',
      'message', 'Target tournament does not exist.'
    );
  END IF;

  -- 3. Terminal state check
  IF LOWER(COALESCE(v_tourn.status, '')) IN ('completed', 'prize distributed', 'cancelled', 'archived') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_LIFECYCLE_STATE',
      'message', 'Cannot schedule matches for a tournament in terminal state: ' || v_tourn.status
    );
  END IF;

  -- 4. Payload structure & length bounds check
  IF p_matches IS NULL OR jsonb_typeof(p_matches) <> 'array' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_PAYLOAD',
      'message', 'Match schedule payload must be a non-null JSON array.'
    );
  END IF;

  v_match_count := jsonb_array_length(p_matches);
  IF v_match_count = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'EMPTY_MATCH_SCHEDULE',
      'message', 'At least one match must be scheduled.'
    );
  END IF;

  IF v_match_count > 12 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'MAX_MATCH_LIMIT_EXCEEDED',
      'message', 'A tournament can have at most 12 scheduled matches.'
    );
  END IF;

  -- 5. Verify existing active or completed matches are protected
  SELECT COUNT(*) INTO v_active_or_completed_count
  FROM public.matches
  WHERE tournament_id = p_tournament_id
    AND status IN ('Live', 'Completed');

  -- 6. Validate each item in the payload sequentially
  FOR v_idx IN 1..v_match_count LOOP
    v_match_item := p_matches->(v_idx - 1);

    -- Match number: server assigns v_idx if omitted, otherwise validate contiguousness
    IF (v_match_item->>'match_number') IS NOT NULL THEN
      v_match_num := (v_match_item->>'match_number')::INT;
    ELSE
      v_match_num := v_idx;
    END IF;

    IF v_match_num < 1 OR v_match_num > 20 THEN
      RETURN jsonb_build_object(
        'success', false,
        'error_code', 'INVALID_MATCH_NUMBER',
        'message', 'Match number must be between 1 and 20.'
      );
    END IF;

    IF v_match_num = ANY(v_seen_nums) THEN
      RETURN jsonb_build_object(
        'success', false,
        'error_code', 'DUPLICATE_MATCH_NUMBER',
        'message', 'Duplicate match number detected: ' || v_match_num
      );
    END IF;
    v_seen_nums := array_append(v_seen_nums, v_match_num);

    -- Round number (defaults to v_match_num if omitted)
    v_round_num := COALESCE((v_match_item->>'round_number')::INT, v_match_num);
    IF v_round_num < 1 OR v_round_num > 20 THEN
      RETURN jsonb_build_object(
        'success', false,
        'error_code', 'INVALID_ROUND_NUMBER',
        'message', 'Round number must be between 1 and 20.'
      );
    END IF;

    -- Round name
    v_round_name := TRIM(COALESCE(v_match_item->>'round_name', ''));
    IF v_round_name = '' THEN
      v_round_name := 'Round ' || v_match_num;
    END IF;

    -- Map name
    v_map_name := TRIM(COALESCE(v_match_item->>'map_name', 'Bermuda'));
    IF v_map_name NOT IN (
      'Bermuda',
      'Purgatory',
      'Kalahari',
      'Alpine',
      'NeXTerra',
      'Random',
      'Custom'
    ) THEN
      RETURN jsonb_build_object(
        'success', false,
        'error_code', 'INVALID_MAP_NAME',
        'message', 'Invalid map name: ' || v_map_name || '. Must be one of: Bermuda, Purgatory, Kalahari, Alpine, NeXTerra, Random, Custom.'
      );
    END IF;

    -- Match type
    v_match_type := TRIM(COALESCE(v_match_item->>'match_type', 'Battle Royale'));
    IF v_match_type NOT IN (
      'Battle Royale',
      'Clash Squad',
      'Custom',
      'Group Stage',
      'Semifinals',
      'Grand Finals'
    ) THEN
      v_match_type := 'Battle Royale';
    END IF;

    -- Scheduled time
    BEGIN
      v_sched_time := (v_match_item->>'scheduled_time')::TIMESTAMPTZ;
    EXCEPTION WHEN OTHERS THEN
      RETURN jsonb_build_object(
        'success', false,
        'error_code', 'INVALID_SCHEDULED_TIME',
        'message', 'Invalid timestamp format for scheduled_time on match #' || v_match_num
      );
    END;

    IF v_sched_time IS NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'error_code', 'MISSING_SCHEDULED_TIME',
        'message', 'scheduled_time is required for match #' || v_match_num
      );
    END IF;

    -- Chronological spacing: sequential matches must be spaced at least 15 minutes apart
    IF v_prev_time IS NOT NULL THEN
      IF v_sched_time < v_prev_time THEN
        RETURN jsonb_build_object(
          'success', false,
          'error_code', 'INVERTED_SCHEDULE_CHRONOLOGY',
          'message', 'Match #' || v_match_num || ' is scheduled earlier than previous match.'
        );
      END IF;

      IF v_sched_time < (v_prev_time + INTERVAL '15 minutes') THEN
        RETURN jsonb_build_object(
          'success', false,
          'error_code', 'CHRONOLOGY_CONFLICT',
          'message', 'Match #' || v_match_num || ' must be scheduled at least 15 minutes after Match #' || (v_match_num - 1)
        );
      END IF;
    END IF;
    v_prev_time := v_sched_time;

    -- Room release time (optional)
    IF (v_match_item->>'room_release_time') IS NOT NULL AND TRIM(v_match_item->>'room_release_time') <> '' THEN
      BEGIN
        v_release_time := (v_match_item->>'room_release_time')::TIMESTAMPTZ;
      EXCEPTION WHEN OTHERS THEN
        v_release_time := v_sched_time - INTERVAL '15 minutes';
      END;
    ELSE
      v_release_time := v_sched_time - INTERVAL '15 minutes';
    END IF;

  END LOOP;

  -- 7. Contiguity Verification: ensure match numbers form [1..v_match_count]
  FOR v_idx IN 1..v_match_count LOOP
    IF NOT (v_idx = ANY(v_seen_nums)) THEN
      RETURN jsonb_build_object(
        'success', false,
        'error_code', 'NON_CONTIGUOUS_MATCH_NUMBERS',
        'message', 'Match numbers must form a contiguous sequence starting at 1 (missing match #' || v_idx || ').'
      );
    END IF;
  END LOOP;

  -- 8. Atomic Synchronization:
  -- If no live/completed matches exist, delete old un-played Scheduled/Room Ready matches
  IF v_active_or_completed_count = 0 THEN
    DELETE FROM public.matches 
    WHERE tournament_id = p_tournament_id;
  ELSE
    -- Preserve live or completed matches, only replace future scheduled matches
    DELETE FROM public.matches 
    WHERE tournament_id = p_tournament_id 
      AND status NOT IN ('Live', 'Completed');
  END IF;

  -- 9. Insert new validated matches
  FOR v_idx IN 1..v_match_count LOOP
    v_match_item := p_matches->(v_idx - 1);
    v_match_num := COALESCE((v_match_item->>'match_number')::INT, v_idx);
    v_round_num := COALESCE((v_match_item->>'round_number')::INT, v_match_num);
    v_round_name := TRIM(COALESCE(v_match_item->>'round_name', 'Round ' || v_match_num));
    v_map_name := TRIM(COALESCE(v_match_item->>'map_name', 'Bermuda'));
    v_match_type := TRIM(COALESCE(v_match_item->>'match_type', 'Battle Royale'));
    v_sched_time := (v_match_item->>'scheduled_time')::TIMESTAMPTZ;
    
    IF (v_match_item->>'room_release_time') IS NOT NULL AND TRIM(v_match_item->>'room_release_time') <> '' THEN
      v_release_time := (v_match_item->>'room_release_time')::TIMESTAMPTZ;
    ELSE
      v_release_time := v_sched_time - INTERVAL '15 minutes';
    END IF;

    -- Avoid re-inserting if match number was preserved from a live/completed match
    IF NOT EXISTS (
      SELECT 1 FROM public.matches 
      WHERE tournament_id = p_tournament_id AND match_number = v_match_num
    ) THEN
      INSERT INTO public.matches (
        tournament_id,
        match_number,
        round_number,
        round_name,
        map_name,
        match_type,
        scheduled_time,
        room_release_time,
        status,
        room_published
      ) VALUES (
        p_tournament_id,
        v_match_num,
        v_round_num,
        v_round_name,
        v_map_name,
        v_match_type,
        v_sched_time,
        v_release_time,
        'Scheduled',
        false
      );
    END IF;
  END LOOP;

  -- 10. Audit Logging
  INSERT INTO public.match_operations_audit_log (
    tournament_id,
    action,
    actor_id,
    details
  ) VALUES (
    p_tournament_id,
    'MATCH_SCHEDULE_CONFIGURED',
    v_user_id,
    jsonb_build_object(
      'match_count', v_match_count,
      'configured_by', COALESCE((SELECT email FROM auth.users WHERE id = v_user_id), 'Admin'),
      'timestamp', NOW()
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'tournament_id', p_tournament_id,
    'match_count', v_match_count,
    'message', 'Tournament matches scheduled successfully.'
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- 3. RPC 2: SET_MATCH_ROOM_DETAILS
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_match_room_details(
  p_match_id UUID,
  p_room_id TEXT,
  p_room_password TEXT,
  p_room_status TEXT DEFAULT 'Published',
  p_room_release_time TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_match RECORD;
  v_clean_room_id TEXT;
  v_clean_password TEXT;
  v_is_published BOOLEAN;
  v_new_match_status TEXT;
BEGIN
  -- 1. Authorization: Admin or service_role only
  v_user_id := auth.uid();
  IF v_user_id IS NULL AND (SELECT current_setting('role', true)) <> 'service_role' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'UNAUTHENTICATED',
      'message', 'Authentication required.'
    );
  END IF;

  IF NOT (public.is_admin() OR (SELECT current_setting('role', true)) = 'service_role') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'ADMIN_REQUIRED',
      'message', 'Administrator privileges are required.'
    );
  END IF;

  -- 2. Fetch match record with lock
  SELECT * INTO v_match
  FROM public.matches
  WHERE id = p_match_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'MATCH_NOT_FOUND',
      'message', 'Match record does not exist.'
    );
  END IF;

  -- 3. Terminal state check
  IF v_match.status IN ('Completed', 'Cancelled') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'TERMINAL_MATCH_MODIFICATION_BLOCKED',
      'message', 'Cannot update room details for a completed or cancelled match.'
    );
  END IF;

  -- 4. Numeric input sanitization and validation
  v_clean_room_id := TRIM(COALESCE(p_room_id, ''));
  v_clean_password := TRIM(COALESCE(p_room_password, ''));

  IF v_clean_room_id <> '' AND v_clean_room_id !~ '^[0-9]{1,15}$' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_ROOM_ID',
      'message', 'Room ID must contain 1-15 numeric digits only (0-9).'
    );
  END IF;

  IF v_clean_password <> '' AND v_clean_password !~ '^[0-9]{1,10}$' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_ROOM_PASSWORD',
      'message', 'Room Password must contain 1-10 numeric digits only (0-9).'
    );
  END IF;

  v_is_published := (COALESCE(p_room_status, 'Published') = 'Published');
  
  -- Update match status to 'Room Ready' if it was 'Scheduled' and room is published
  IF v_is_published AND v_match.status = 'Scheduled' THEN
    v_new_match_status := 'Room Ready';
  ELSE
    v_new_match_status := v_match.status;
  END IF;

  -- 5. Update match row
  UPDATE public.matches
  SET
    room_id = NULLIF(v_clean_room_id, ''),
    room_password = NULLIF(v_clean_password, ''),
    room_published = v_is_published,
    room_release_time = COALESCE(p_room_release_time, room_release_time),
    status = v_new_match_status,
    updated_at = NOW()
  WHERE id = p_match_id;

  -- 6. Match 1 Backward Compatibility Mirror:
  -- If this is Match 1, mirror room credentials into public.tournaments
  IF v_match.match_number = 1 THEN
    UPDATE public.tournaments
    SET
      room_id = NULLIF(v_clean_room_id, ''),
      room_password = NULLIF(v_clean_password, ''),
      room_status = COALESCE(p_room_status, 'Published'),
      room_release_time = COALESCE(p_room_release_time, room_release_time),
      room_last_updated = NOW(),
      room_published_by = COALESCE((SELECT email FROM auth.users WHERE id = v_user_id), 'Admin'),
      updated_at = NOW()
    WHERE id = v_match.tournament_id;
  END IF;

  -- 7. Audit Logging (NEVER log plaintext password)
  INSERT INTO public.match_operations_audit_log (
    tournament_id,
    match_id,
    action,
    actor_id,
    details
  ) VALUES (
    v_match.tournament_id,
    p_match_id,
    'MATCH_ROOM_CREDENTIALS_UPDATED',
    v_user_id,
    jsonb_build_object(
      'match_number', v_match.match_number,
      'room_id', v_clean_room_id,
      'has_password', (v_clean_password <> ''),
      'room_status', COALESCE(p_room_status, 'Published'),
      'room_published', v_is_published,
      'mirrored_to_tournament', (v_match.match_number = 1),
      'timestamp', NOW()
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'match_id', p_match_id,
    'match_number', v_match.match_number,
    'room_id', v_clean_room_id,
    'room_status', COALESCE(p_room_status, 'Published'),
    'room_published', v_is_published,
    'status', v_new_match_status,
    'message', 'Match room credentials updated successfully.'
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- 4. RPC 3: UPDATE_MATCH_STATUS
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_match_status(
  p_match_id UUID,
  p_new_status TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_match RECORD;
  v_clean_status TEXT;
  v_is_valid_transition BOOLEAN := FALSE;
BEGIN
  -- 1. Authorization: Admin or service_role only
  v_user_id := auth.uid();
  IF v_user_id IS NULL AND (SELECT current_setting('role', true)) <> 'service_role' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'UNAUTHENTICATED',
      'message', 'Authentication required.'
    );
  END IF;

  IF NOT (public.is_admin() OR (SELECT current_setting('role', true)) = 'service_role') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'ADMIN_REQUIRED',
      'message', 'Administrator privileges are required.'
    );
  END IF;

  -- 2. Fetch match record with lock
  SELECT * INTO v_match
  FROM public.matches
  WHERE id = p_match_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'MATCH_NOT_FOUND',
      'message', 'Match record does not exist.'
    );
  END IF;

  v_clean_status := TRIM(p_new_status);

  -- 3. Validate status domain
  IF v_clean_status NOT IN (
    'Scheduled',
    'Check-in Open',
    'Room Ready',
    'Live',
    'Completed',
    'Cancelled'
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_STATUS',
      'message', 'Status must be one of: Scheduled, Check-in Open, Room Ready, Live, Completed, Cancelled.'
    );
  END IF;

  -- 4. Immutability of Terminal States
  IF v_match.status = 'Completed' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'COMPLETED_MATCH_IMMUTABLE',
      'message', 'Cannot modify a match that is already Completed.'
    );
  END IF;

  IF v_match.status = 'Cancelled' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'CANCELLED_MATCH_IMMUTABLE',
      'message', 'Cannot modify a match that has been Cancelled.'
    );
  END IF;

  -- 5. Anti-Rewind Rule: Live matches cannot regress to Scheduled or Check-in Open
  IF v_match.status = 'Live' AND v_clean_status IN ('Scheduled', 'Check-in Open') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'CANNOT_REWIND_LIVE_MATCH',
      'message', 'Cannot rewind a Live match back to Scheduled or Check-in Open.'
    );
  END IF;

  -- 6. Evaluate Valid Transitions:
  -- Scheduled -> Check-in Open, Room Ready, Cancelled
  -- Check-in Open -> Room Ready, Live, Cancelled
  -- Room Ready -> Live, Cancelled
  -- Live -> Completed, Cancelled
  IF v_match.status = v_clean_status THEN
    v_is_valid_transition := TRUE; -- Idempotent
  ELSIF v_match.status = 'Scheduled' AND v_clean_status IN ('Check-in Open', 'Room Ready', 'Cancelled') THEN
    v_is_valid_transition := TRUE;
  ELSIF v_match.status = 'Check-in Open' AND v_clean_status IN ('Room Ready', 'Live', 'Cancelled') THEN
    v_is_valid_transition := TRUE;
  ELSIF v_match.status = 'Room Ready' AND v_clean_status IN ('Live', 'Cancelled') THEN
    v_is_valid_transition := TRUE;
  ELSIF v_match.status = 'Live' AND v_clean_status IN ('Completed', 'Cancelled') THEN
    v_is_valid_transition := TRUE;
  END IF;

  IF NOT v_is_valid_transition THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_STATUS_TRANSITION',
      'message', 'Invalid state transition from ' || v_match.status || ' to ' || v_clean_status
    );
  END IF;

  -- 7. Update match status
  UPDATE public.matches
  SET
    status = v_clean_status,
    updated_at = NOW()
  WHERE id = p_match_id;

  -- 8. Audit Logging
  INSERT INTO public.match_operations_audit_log (
    tournament_id,
    match_id,
    action,
    actor_id,
    details
  ) VALUES (
    v_match.tournament_id,
    p_match_id,
    'MATCH_STATUS_TRANSITION',
    v_user_id,
    jsonb_build_object(
      'match_number', v_match.match_number,
      'previous_status', v_match.status,
      'new_status', v_clean_status,
      'timestamp', NOW()
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'match_id', p_match_id,
    'match_number', v_match.match_number,
    'previous_status', v_match.status,
    'status', v_clean_status,
    'message', 'Match status transitioned successfully to ' || v_clean_status
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- 5. RPC 4: DELETE_TOURNAMENT_MATCH (WITH ATOMIC RE-INDEXING)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_tournament_match(
  p_match_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_match RECORD;
  v_tourn_id TEXT;
  v_deleted_num INT;
  v_remaining_count INT;
BEGIN
  -- 1. Authorization: Admin or service_role only
  v_user_id := auth.uid();
  IF v_user_id IS NULL AND (SELECT current_setting('role', true)) <> 'service_role' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'UNAUTHENTICATED',
      'message', 'Authentication required.'
    );
  END IF;

  IF NOT (public.is_admin() OR (SELECT current_setting('role', true)) = 'service_role') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'ADMIN_REQUIRED',
      'message', 'Administrator privileges are required.'
    );
  END IF;

  -- 2. Fetch match record with lock
  SELECT * INTO v_match
  FROM public.matches
  WHERE id = p_match_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'MATCH_NOT_FOUND',
      'message', 'Match record does not exist.'
    );
  END IF;

  v_tourn_id := v_match.tournament_id;
  v_deleted_num := v_match.match_number;

  -- 3. Terminal & Active State Guards: cannot delete Live, Completed, or Cancelled matches
  IF v_match.status IN ('Live', 'Completed', 'Cancelled') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'CANNOT_DELETE_ACTIVE_OR_TERMINAL_MATCH',
      'message', 'Cannot delete a match with status: ' || v_match.status
    );
  END IF;

  -- 4. Minimum match guard: A tournament must retain at least 1 match
  SELECT COUNT(*) INTO v_remaining_count
  FROM public.matches
  WHERE tournament_id = v_tourn_id;

  IF v_remaining_count <= 1 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'CANNOT_DELETE_LAST_MATCH',
      'message', 'Cannot delete the only scheduled match in a tournament.'
    );
  END IF;

  -- 5. Delete the target match
  DELETE FROM public.matches 
  WHERE id = p_match_id;

  -- 6. Atomically re-index subsequent matches (safe due to DEFERRABLE unique constraint)
  UPDATE public.matches
  SET
    match_number = match_number - 1,
    round_number = round_number - 1,
    updated_at = NOW()
  WHERE tournament_id = v_tourn_id
    AND match_number > v_deleted_num;

  -- 7. Audit Logging
  INSERT INTO public.match_operations_audit_log (
    tournament_id,
    action,
    actor_id,
    details
  ) VALUES (
    v_tourn_id,
    'MATCH_DELETED',
    v_user_id,
    jsonb_build_object(
      'deleted_match_id', p_match_id,
      'deleted_match_number', v_deleted_num,
      'timestamp', NOW()
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'deleted_match_id', p_match_id,
    'deleted_match_number', v_deleted_num,
    'tournament_id', v_tourn_id,
    'message', 'Match deleted and subsequent rounds reindexed successfully.'
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- 6. PRIVILEGE CONTROLS (REVOKE PUBLIC / GRANT AUTHENTICATED & SERVICE ROLE)
-- ----------------------------------------------------------------------------

REVOKE EXECUTE ON FUNCTION public.schedule_tournament_matches(TEXT, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.schedule_tournament_matches(TEXT, JSONB) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.set_match_room_details(UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_match_room_details(UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.update_match_status(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_match_status(UUID, TEXT) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.delete_tournament_match(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_tournament_match(UUID) TO authenticated, service_role;

COMMIT;
