-- ============================================================================
-- MJ ESPORTS — Phase 5: Tournament Operations & Match Room Security Migration
-- Target Engine: Supabase PostgreSQL
-- Description:
--   1. Enforces strict server-side timing on room credential release:
--      - Credentials strictly HIDDEN before authoritative server release time.
--      - Database clock (NOW()) is authoritative; client clock spoofing is ineffective.
--   2. Enforces strict participant authorization:
--      - Registered team captains (tournament_registrations).
--      - Registered team members / squad roster (tournament_players).
--      - Rejects unregistered, rejected, cancelled, and spectator users.
--      - Blocks room credential retrieval for cancelled tournaments.
--   3. Column-Level Privilege Hardening:
--      - REVOKE SELECT (room_id, room_password) ON public.tournaments from anon/authenticated.
--      - REVOKE SELECT (room_id, room_password) ON public.matches from anon/authenticated.
--      - Drops insecure public select policy on public.matches.
--   4. Tournament Lifecycle State Machine Guard:
--      - Database trigger blocks illegal transitions (e.g. Cancelled -> Live, Completed -> Draft).
--      - Check constraint includes 'Cancelled'.
--   5. Companion RPCs & Audit Log:
--      - get_tournament_room_credentials(p_tournament_id TEXT)
--      - get_match_room_credentials(p_match_id UUID)
--      - set_tournament_room_credentials(...)
--      - match_operations_audit_log table (Zero plaintext passwords logged).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. EXTEND TOURNAMENTS TABLE WITH RELEASE TIMING COLUMNS & LIFECYCLE CONSTRAINT
-- ----------------------------------------------------------------------------

DO $$
BEGIN
  -- Add room_release_time column if not present
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'tournaments'
      AND column_name = 'room_release_time'
  ) THEN
    ALTER TABLE public.tournaments ADD COLUMN room_release_time TIMESTAMPTZ;
  END IF;

  -- Add room_release_window_minutes column if not present (default 15 minutes)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'tournaments'
      AND column_name = 'room_release_window_minutes'
  ) THEN
    ALTER TABLE public.tournaments ADD COLUMN room_release_window_minutes INTEGER DEFAULT 15;
  END IF;
END $$;

-- Align check_tournament_lifecycle_status to ensure 'Cancelled' is permitted
ALTER TABLE public.tournaments
  DROP CONSTRAINT IF EXISTS check_tournament_lifecycle_status;

ALTER TABLE public.tournaments
  ADD CONSTRAINT check_tournament_lifecycle_status
  CHECK (status IN (
    'Draft',
    'Published',
    'Registration Open',
    'Registration Closed',
    'Check-in Open',
    'Check-in Closed',
    'Room Released',
    'Live',
    'Live Now',
    'Results Pending',
    'Completed',
    'Prize Distributed',
    'Bracket Locked',
    'Archived',
    'Cancelled'
  ));

-- ----------------------------------------------------------------------------
-- 2. CREATE MATCH OPERATIONS AUDIT LOG (ZERO PLAINTEXT SECRETS)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.match_operations_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id TEXT NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_match_ops_audit_tourn
  ON public.match_operations_audit_log (tournament_id, created_at DESC);

ALTER TABLE public.match_operations_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read match audit log" ON public.match_operations_audit_log;
CREATE POLICY "Admins read match audit log"
  ON public.match_operations_audit_log FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "System insert match audit log" ON public.match_operations_audit_log;
CREATE POLICY "System insert match audit log"
  ON public.match_operations_audit_log FOR INSERT
  WITH CHECK (public.is_admin() OR (SELECT current_setting('role', true)) = 'service_role');

-- ----------------------------------------------------------------------------
-- 3. LIFECYCLE STATE TRANSITION TRIGGER
-- Prevents illegal lifecycle regressions and cancelled tournament reactivation
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enforce_tournament_lifecycle_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- 1. Disallow reopening cancelled tournaments
  IF OLD.status = 'Cancelled' AND NEW.status != 'Cancelled' THEN
    RAISE EXCEPTION 'Illegal lifecycle transition: A cancelled and refunded tournament cannot be reopened.';
  END IF;

  -- 2. Disallow regressing completed tournaments back to pre-match states
  IF OLD.status IN ('Completed', 'Prize Distributed', 'Archived')
     AND NEW.status IN ('Draft', 'Published', 'Registration Open', 'Registration Closed', 'Check-in Open', 'Check-in Closed', 'Room Released', 'Live', 'Live Now') THEN
    RAISE EXCEPTION 'Illegal lifecycle transition: Cannot regress a completed tournament back to %', NEW.status;
  END IF;

  -- 3. If tournament is being cancelled, revoke room credentials & enforce room_status = 'Draft'
  IF NEW.status = 'Cancelled' THEN
    NEW.room_status := 'Draft';
    NEW.room_id := NULL;
    NEW.room_password := NULL;
  END IF;

  -- 4. Disallow publishing credentials on a cancelled tournament
  IF NEW.status = 'Cancelled' AND NEW.room_status = 'Published' THEN
    RAISE EXCEPTION 'Illegal operation: Cannot publish room credentials for a cancelled tournament.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_tournament_lifecycle ON public.tournaments;
CREATE TRIGGER trg_enforce_tournament_lifecycle
  BEFORE UPDATE ON public.tournaments
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_tournament_lifecycle_transition();

-- ----------------------------------------------------------------------------
-- 4. HARDENED GET_TOURNAMENT_ROOM_CREDENTIALS RPC
-- Server-side release timing + Captain & Teammate authorization + Terminal guards
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_tournament_room_credentials(
  p_tournament_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_is_admin BOOLEAN := FALSE;
  v_tourn RECORD;
  v_is_captain BOOLEAN := FALSE;
  v_is_teammate BOOLEAN := FALSE;
  v_is_in_teams_list BOOLEAN := FALSE;

  v_release_time TIMESTAMPTZ := NULL;
  v_window_mins INT := 15;
  v_match_ts TIMESTAMPTZ := NULL;
  v_time_str TEXT := '';
  v_hours INT := 0;
  v_minutes INT := 0;
  v_is_pm BOOLEAN := FALSE;
  v_match_parts TEXT[];
  v_time_parts TEXT[];
BEGIN
  -- 1. Obtain authenticated session user ID
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'UNAUTHENTICATED',
      'message', 'Authentication is required to view match room credentials.'
    );
  END IF;

  -- 2. Fetch target tournament row
  SELECT
    id, title, status, room_id, room_password, room_status,
    room_last_updated, room_published_by, room_release_time,
    room_release_window_minutes, start_date, start_time,
    match_date, match_time, teams_list, created_at
  INTO v_tourn
  FROM public.tournaments
  WHERE id = p_tournament_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'TOURNAMENT_NOT_FOUND',
      'message', 'Tournament not found.'
    );
  END IF;

  -- 3. Check Admin Role (Admins bypass timing & participant checks for operational testing)
  v_is_admin := (public.is_admin() OR (SELECT current_setting('role', true)) = 'service_role');
  IF v_is_admin THEN
    RETURN jsonb_build_object(
      'success', true,
      'room_id', COALESCE(v_tourn.room_id, ''),
      'room_password', COALESCE(v_tourn.room_password, ''),
      'room_status', COALESCE(v_tourn.room_status, 'Draft'),
      'room_release_time', v_tourn.room_release_time,
      'room_last_updated', v_tourn.room_last_updated,
      'room_published_by', v_tourn.room_published_by,
      'is_admin_override', true
    );
  END IF;

  -- 4. Tournament Lifecycle Terminal Guards
  IF LOWER(COALESCE(v_tourn.status, '')) = 'cancelled' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'TOURNAMENT_CANCELLED',
      'message', 'This tournament has been cancelled. Match room credentials are not available.'
    );
  END IF;

  IF LOWER(COALESCE(v_tourn.status, '')) IN ('completed', 'prize distributed', 'archived') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'TOURNAMENT_COMPLETED',
      'message', 'This tournament has concluded. Match room credentials are no longer active.'
    );
  END IF;

  -- 5. Room Status Guard: Must be Published by Admin
  IF COALESCE(v_tourn.room_status, 'Draft') != 'Published' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'ROOM_NOT_PUBLISHED',
      'message', 'Match room credentials have not been published yet.'
    );
  END IF;

  -- 6. AUTHORITATIVE SERVER-SIDE TIMING ENFORCEMENT
  v_window_mins := COALESCE(v_tourn.room_release_window_minutes, 15);

  -- 6.1 Check explicit room_release_time if configured
  IF v_tourn.room_release_time IS NOT NULL THEN
    v_release_time := v_tourn.room_release_time;
  ELSE
    -- 6.2 Calculate release time from match/start schedule (assumed IST +05:30)
    BEGIN
      IF v_tourn.start_date IS NOT NULL AND v_tourn.start_date ~ '^\d{4}-\d{2}-\d{2}$' THEN
        v_time_str := UPPER(TRIM(COALESCE(v_tourn.start_time, v_tourn.match_time, '18:00')));

        -- Parse 12-hour format e.g. "06:00 PM"
        IF v_time_str ~ '(\d{1,2}):(\d{2})\s*(AM|PM)' THEN
          v_is_pm := (v_time_str LIKE '%PM%');
          v_time_parts := regexp_matches(v_time_str, '(\d{1,2}):(\d{2})');
          v_hours := v_time_parts[1]::INT;
          v_minutes := v_time_parts[2]::INT;
          IF v_is_pm AND v_hours < 12 THEN v_hours := v_hours + 12; END IF;
          IF NOT v_is_pm AND v_hours = 12 THEN v_hours := 0; END IF;

          v_match_ts := (v_tourn.start_date || ' ' || LPAD(v_hours::TEXT, 2, '0') || ':' || LPAD(v_minutes::TEXT, 2, '0') || ':00+05:30')::TIMESTAMPTZ;
          v_release_time := v_match_ts - (v_window_mins * INTERVAL '1 minute');
        -- Parse 24-hour format e.g. "18:00"
        ELSIF v_time_str ~ '^\d{1,2}:\d{2}$' THEN
          v_match_ts := (v_tourn.start_date || ' ' || v_time_str || ':00+05:30')::TIMESTAMPTZ;
          v_release_time := v_match_ts - (v_window_mins * INTERVAL '1 minute');
        END IF;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_release_time := NULL;
    END;
  END IF;

  -- 6.3 If release time is resolved and server timestamp NOW() is strictly before release time:
  IF v_release_time IS NOT NULL AND NOW() < v_release_time THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'ROOM_NOT_RELEASED_YET',
      'release_time', v_release_time,
      'server_time', NOW(),
      'message', 'Match room credentials will be released at ' || to_char(v_release_time AT TIME ZONE 'Asia/Kolkata', 'HH12:MI AM') || ' IST (' || GREATEST(1, ROUND(EXTRACT(EPOCH FROM (v_release_time - NOW())) / 60)) || ' min remaining).'
    );
  END IF;

  -- 7. PARTICIPANT AUTHORIZATION BOUNDARY
  -- 7.1 Rejection check: Explicitly rejected registrations
  IF EXISTS (
    SELECT 1 FROM public.tournament_registrations
    WHERE tournament_id = p_tournament_id
      AND user_id = v_user_id
      AND LOWER(COALESCE(status, '')) = 'rejected'
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'REGISTRATION_REJECTED',
      'message', 'Your registration for this tournament was rejected. Access to room credentials is denied.'
    );
  END IF;

  -- 7.2 Rejection check: Cancelled registrations
  IF EXISTS (
    SELECT 1 FROM public.tournament_registrations
    WHERE tournament_id = p_tournament_id
      AND user_id = v_user_id
      AND LOWER(COALESCE(status, '')) = 'cancelled'
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'REGISTRATION_CANCELLED',
      'message', 'Your registration for this tournament was cancelled. Access to room credentials is denied.'
    );
  END IF;

  -- 7.3 Participant Check: Registered Captain
  SELECT EXISTS (
    SELECT 1
    FROM public.tournament_registrations
    WHERE tournament_id = p_tournament_id
      AND user_id = v_user_id
      AND (status IS NULL OR LOWER(status) IN ('approved', 'confirmed', 'active'))
  ) INTO v_is_captain;

  -- 7.4 Participant Check: Registered Teammate / Squad Roster
  IF NOT v_is_captain THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.tournament_players tp
      JOIN public.tournament_registrations tr ON tr.id = tp.registration_id
      WHERE tp.tournament_id = p_tournament_id
        AND tp.user_id = v_user_id
        AND (tr.status IS NULL OR LOWER(tr.status) IN ('approved', 'confirmed', 'active'))
    ) INTO v_is_teammate;
  END IF;

  -- 7.5 Participant Check: Fallback JSON teams_list for synchronized compatibility
  IF NOT (v_is_captain OR v_is_teammate) AND v_tourn.teams_list IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(v_tourn.teams_list) elem
      WHERE elem->>'userId' = v_user_id::TEXT
        AND LOWER(COALESCE(elem->>'status', 'confirmed')) NOT IN ('rejected', 'cancelled')
    ) INTO v_is_in_teams_list;
  END IF;

  -- If caller is neither captain nor teammate nor roster participant -> DENY
  IF NOT (v_is_captain OR v_is_teammate OR v_is_in_teams_list) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'NOT_REGISTERED',
      'message', 'You are not an authorized registered participant in this tournament.'
    );
  END IF;

  -- 8. AUTHORIZED PARTICIPANT + PUBLISHED + RELEASE WINDOW ACTIVE -> Release credentials
  RETURN jsonb_build_object(
    'success', true,
    'room_id', COALESCE(v_tourn.room_id, ''),
    'room_password', COALESCE(v_tourn.room_password, ''),
    'room_status', 'Published',
    'room_release_time', v_release_time,
    'room_last_updated', v_tourn.room_last_updated,
    'room_published_by', v_tourn.room_published_by
  );
END;
$$;

-- Grant execution privileges for get_tournament_room_credentials
REVOKE EXECUTE ON FUNCTION public.get_tournament_room_credentials FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_tournament_room_credentials TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_tournament_room_credentials TO service_role;

-- ----------------------------------------------------------------------------
-- 5. COMPANION GET_MATCH_ROOM_CREDENTIALS RPC (FOR MATCHES TABLE ENGINE)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_match_room_credentials(
  p_match_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_is_admin BOOLEAN := FALSE;
  v_match RECORD;
  v_is_registered BOOLEAN := FALSE;
  v_release_time TIMESTAMPTZ := NULL;
BEGIN
  -- 1. Check user authentication
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'UNAUTHENTICATED',
      'message', 'Authentication required to view match room credentials.'
    );
  END IF;

  -- 2. Fetch match record
  SELECT id, tournament_id, status, room_id, room_password, room_published, scheduled_time
  INTO v_match
  FROM public.matches
  WHERE id = p_match_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'MATCH_NOT_FOUND',
      'message', 'Match not found.'
    );
  END IF;

  -- 3. Check admin override
  v_is_admin := (public.is_admin() OR (SELECT current_setting('role', true)) = 'service_role');
  IF v_is_admin THEN
    RETURN jsonb_build_object(
      'success', true,
      'room_id', COALESCE(v_match.room_id, ''),
      'room_password', COALESCE(v_match.room_password, ''),
      'status', v_match.status,
      'is_admin_override', true
    );
  END IF;

  -- 4. Status checks
  IF v_match.status = 'Cancelled' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'MATCH_CANCELLED',
      'message', 'This match has been cancelled.'
    );
  END IF;

  IF NOT v_match.room_published THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'ROOM_NOT_PUBLISHED',
      'message', 'Room credentials for this match have not been published.'
    );
  END IF;

  -- 5. Timing enforcement (15 minutes prior to scheduled_time if set)
  IF v_match.scheduled_time IS NOT NULL THEN
    v_release_time := v_match.scheduled_time - INTERVAL '15 minutes';
    IF NOW() < v_release_time THEN
      RETURN jsonb_build_object(
        'success', false,
        'error_code', 'ROOM_NOT_RELEASED_YET',
        'release_time', v_release_time,
        'server_time', NOW(),
        'message', 'Room credentials will be released 15 minutes prior to match time.'
      );
    END IF;
  END IF;

  -- 6. Participant Authorization: Must be registered in parent tournament
  SELECT EXISTS (
    SELECT 1 FROM public.tournament_registrations
    WHERE tournament_id = v_match.tournament_id
      AND user_id = v_user_id
      AND (status IS NULL OR LOWER(status) IN ('approved', 'confirmed', 'active'))
  ) OR EXISTS (
    SELECT 1 FROM public.tournament_players tp
    JOIN public.tournament_registrations tr ON tr.id = tp.registration_id
    WHERE tp.tournament_id = v_match.tournament_id
      AND tp.user_id = v_user_id
      AND (tr.status IS NULL OR LOWER(tr.status) IN ('approved', 'confirmed', 'active'))
  ) INTO v_is_registered;

  IF NOT v_is_registered THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'NOT_REGISTERED',
      'message', 'You are not an authorized registered participant in this match.'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'room_id', COALESCE(v_match.room_id, ''),
    'room_password', COALESCE(v_match.room_password, ''),
    'status', v_match.status
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_match_room_credentials FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_match_room_credentials TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_match_room_credentials TO service_role;

-- ----------------------------------------------------------------------------
-- 6. ADMIN-CONTROLLED SET_TOURNAMENT_ROOM_CREDENTIALS RPC
-- Validates numeric constraints, updates room, and writes audit log without plaintext password
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_tournament_room_credentials(
  p_tournament_id TEXT,
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
  v_admin_id UUID;
  v_clean_room_id TEXT;
  v_clean_password TEXT;
BEGIN
  -- 1. Authorization: Admins or service_role only
  v_admin_id := auth.uid();
  IF NOT (public.is_admin() OR (SELECT current_setting('role', true)) = 'service_role') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'UNAUTHORIZED',
      'message', 'Only administrators can update match room credentials.'
    );
  END IF;

  -- 2. Validate numeric inputs
  v_clean_room_id := TRIM(COALESCE(p_room_id, ''));
  v_clean_password := TRIM(COALESCE(p_room_password, ''));

  IF v_clean_room_id != '' AND v_clean_room_id !~ '^[0-9]+$' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_ROOM_ID',
      'message', 'Room ID must contain numeric digits (0-9) only.'
    );
  END IF;

  IF v_clean_password != '' AND v_clean_password !~ '^[0-9]+$' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_ROOM_PASSWORD',
      'message', 'Room Password must contain numeric digits (0-9) only.'
    );
  END IF;

  -- 3. Update tournament row
  UPDATE public.tournaments
  SET
    room_id = NULLIF(v_clean_room_id, ''),
    room_password = NULLIF(v_clean_password, ''),
    room_status = COALESCE(p_room_status, 'Published'),
    room_release_time = p_room_release_time,
    room_last_updated = NOW(),
    room_published_by = COALESCE((SELECT email FROM auth.users WHERE id = v_admin_id), 'Admin'),
    updated_at = NOW()
  WHERE id = p_tournament_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'TOURNAMENT_NOT_FOUND',
      'message', 'Tournament not found.'
    );
  END IF;

  -- 4. Record audit log (NEVER LOG PLAINTEXT PASSWORD!)
  INSERT INTO public.match_operations_audit_log (
    tournament_id,
    action,
    actor_id,
    details
  ) VALUES (
    p_tournament_id,
    'ROOM_CREDENTIALS_SET',
    v_admin_id,
    jsonb_build_object(
      'room_id_set', (v_clean_room_id != ''),
      'room_status', p_room_status,
      'release_time', p_room_release_time,
      'updated_at', NOW()
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'tournament_id', p_tournament_id,
    'room_status', p_room_status,
    'message', 'Room credentials updated successfully.'
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_tournament_room_credentials FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_tournament_room_credentials TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_tournament_room_credentials TO service_role;

-- ----------------------------------------------------------------------------
-- 7. COLUMN-LEVEL PRIVILEGE SHIELD (TOURNAMENTS & MATCHES)
-- Prevents any direct SELECT on room_id and room_password by non-admin roles
-- ----------------------------------------------------------------------------

-- 7.1 Tournaments Table Privilege Revocation
REVOKE SELECT ON public.tournaments FROM anon, authenticated, public;

GRANT SELECT (
  id,
  title,
  game,
  format,
  prize_pool,
  entry_fee,
  max_teams,
  registered_teams,
  start_date,
  start_time,
  status,
  organizer,
  description,
  rules,
  teams_list,
  room_status,
  room_last_updated,
  room_published_by,
  room_release_time,
  room_release_window_minutes,
  winner_team,
  winner_captain,
  created_at,
  updated_at,
  mode,
  map,
  registration_start,
  registration_end,
  match_date,
  match_time,
  banner_image,
  team_size
) ON public.tournaments TO anon, authenticated;

GRANT SELECT ON public.tournaments TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.tournaments TO authenticated;
GRANT ALL ON public.tournaments TO service_role;

-- 7.2 Matches Table Privilege Revocation & RLS Policy Hardening
REVOKE SELECT ON public.matches FROM anon, authenticated, public;

GRANT SELECT (
  id,
  tournament_id,
  match_number,
  match_type,
  scheduled_time,
  status,
  room_published,
  created_at,
  updated_at
) ON public.matches TO anon, authenticated;

GRANT SELECT ON public.matches TO service_role;
GRANT ALL ON public.matches TO service_role;

-- Drop legacy insecure policy that allowed reading all match columns if room_published = true
DROP POLICY IF EXISTS "Public read matches if published or admin" ON public.matches;

-- Create hardened SELECT policy on matches
CREATE POLICY "Public read matches safe if published or admin"
  ON public.matches FOR SELECT
  USING (room_published = true OR public.is_admin());

-- ----------------------------------------------------------------------------
-- 8. POSTGREST SCHEMA CACHE RELOAD
-- ----------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
