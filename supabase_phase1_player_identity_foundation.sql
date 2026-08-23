-- ============================================================================
-- MJ ESPORTS — Phase 1: Player Identity Foundation Migration
-- Target Engine: Supabase PostgreSQL
-- Description: 
-- 1. Extends public.tournament_players with canonical_ign, normalized_ign,
--    and identity_status columns.
-- 2. Adds index on (tournament_id, normalized_ign) for OCR candidate matching.
-- 3. Updates register_tournament_team RPC to accept and enforce Free Fire
--    In-Game Names (IGNs) for Captain + all active teammates (Duo & Squad).
-- 4. Preserves 100% backward compatibility for existing tournaments and registrations.
-- ============================================================================

-- 1. SCHEMA EXTENSION FOR TOURNAMENT_PLAYERS
ALTER TABLE public.tournament_players
  ADD COLUMN IF NOT EXISTS canonical_ign TEXT,
  ADD COLUMN IF NOT EXISTS normalized_ign TEXT,
  ADD COLUMN IF NOT EXISTS identity_status TEXT NOT NULL DEFAULT 'REGISTERED' CHECK (identity_status IN ('REGISTERED', 'VERIFIED', 'FLAGGED'));

-- 2. LOOKUP INDEX FOR OCR CANDIDATE MATCHING
CREATE INDEX IF NOT EXISTS idx_tournament_players_norm_ign
  ON public.tournament_players (tournament_id, normalized_ign);

-- 3. DROP PREVIOUS OVERLOADS OF register_tournament_team TO PREVENT CONFLICTS
DROP FUNCTION IF EXISTS public.register_tournament_team(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT[], TEXT, INT, INT, BOOLEAN, BOOLEAN, TEXT, TEXT
);

DROP FUNCTION IF EXISTS public.register_tournament_team(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT[], TEXT, INT, INT, BOOLEAN, BOOLEAN, TEXT, TEXT, TEXT[], TEXT[]
);

-- 4. CREATE ENHANCED register_tournament_team RPC
CREATE OR REPLACE FUNCTION public.register_tournament_team(
  p_tournament_id TEXT,
  p_team_name TEXT,
  p_captain_name TEXT,
  p_email TEXT,
  p_whatsapp_number TEXT,
  p_captain_uid TEXT,
  p_teammate_uids TEXT[] DEFAULT '{}'::TEXT[],
  p_substitute_uids TEXT[] DEFAULT '{}'::TEXT[],
  p_captain_dob TEXT DEFAULT NULL,
  p_player_age INT DEFAULT NULL,
  p_preferred_seed INT DEFAULT 1,
  p_has_substitutes BOOLEAN DEFAULT FALSE,
  p_enable_sms_alerts BOOLEAN DEFAULT TRUE,
  p_mode TEXT DEFAULT 'Squad',
  p_ref_id TEXT DEFAULT NULL,
  p_teammate_igns TEXT[] DEFAULT '{}'::TEXT[],
  p_substitute_igns TEXT[] DEFAULT '{}'::TEXT[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_tournament RECORD;
  v_game TEXT;
  v_norm_captain_uid TEXT;
  v_clean_captain_ign TEXT;
  v_norm_captain_ign TEXT;
  v_norm_teammates TEXT[] := '{}'::TEXT[];
  v_clean_teammate_igns TEXT[] := '{}'::TEXT[];
  v_norm_substitutes TEXT[] := '{}'::TEXT[];
  v_clean_substitute_igns TEXT[] := '{}'::TEXT[];
  v_all_norm_uids TEXT[] := '{}'::TEXT[];
  v_conflict_uid TEXT;
  v_ref_id TEXT;
  v_registration_id UUID;
  v_new_team_json JSONB;
  v_roster_json JSONB := '[]'::JSONB;
  v_item TEXT;
  v_ign_item TEXT;
  v_active_mode TEXT;
  v_required_teammates INT;
  v_actual_teammates INT;
  v_idx INT;
BEGIN
  -- 1. Derive authenticated user_id from session context
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'UNAUTHENTICATED',
      'message', 'You must be logged in to register for a tournament.'
    );
  END IF;

  -- 2. Lock the target tournament row to prevent concurrent capacity race-conditions
  SELECT * INTO v_tournament
  FROM public.tournaments
  WHERE id = p_tournament_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'TOURNAMENT_NOT_FOUND',
      'message', 'The requested tournament does not exist.'
    );
  END IF;

  -- 3. Validate tournament status & slot capacity
  IF v_tournament.status != 'Registration Open' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'REGISTRATION_CLOSED',
      'message', 'Registration for this tournament is currently closed.'
    );
  END IF;

  IF COALESCE(v_tournament.registered_teams, 0) >= COALESCE(v_tournament.max_teams, 32) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'TOURNAMENT_FULL',
      'message', 'All registration slots for this tournament are full.'
    );
  END IF;

  -- 4. Normalize and validate Captain Game UID & In-Game Name (IGN)
  IF p_captain_uid IS NULL OR TRIM(p_captain_uid) = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_ROSTER',
      'message', 'Captain Game Character UID is required.'
    );
  END IF;

  IF p_captain_name IS NULL OR TRIM(p_captain_name) = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_ROSTER',
      'message', 'Captain In-Game Name (IGN) is required.'
    );
  END IF;

  v_norm_captain_uid := UPPER(TRIM(p_captain_uid));
  v_clean_captain_ign := TRIM(p_captain_name);
  v_norm_captain_ign := LOWER(TRIM(p_captain_name));
  v_all_norm_uids := v_all_norm_uids || v_norm_captain_uid;

  -- Normalize teammates arrays (strip empty/whitespace elements)
  IF p_teammate_uids IS NOT NULL AND array_length(p_teammate_uids, 1) > 0 THEN
    FOR v_idx IN 1..array_length(p_teammate_uids, 1) LOOP
      v_item := p_teammate_uids[v_idx];
      IF v_item IS NOT NULL AND TRIM(v_item) != '' THEN
        v_norm_teammates := v_norm_teammates || UPPER(TRIM(v_item));
        v_all_norm_uids := v_all_norm_uids || UPPER(TRIM(v_item));
        
        -- Capture corresponding teammate IGN
        IF p_teammate_igns IS NOT NULL AND array_length(p_teammate_igns, 1) >= v_idx THEN
          v_ign_item := COALESCE(TRIM(p_teammate_igns[v_idx]), '');
        ELSE
          v_ign_item := '';
        END IF;
        v_clean_teammate_igns := v_clean_teammate_igns || v_ign_item;
      END IF;
    END LOOP;
  END IF;

  -- Normalize substitutes array if substitutes enabled
  IF p_has_substitutes AND p_substitute_uids IS NOT NULL AND array_length(p_substitute_uids, 1) > 0 THEN
    FOR v_idx IN 1..array_length(p_substitute_uids, 1) LOOP
      v_item := p_substitute_uids[v_idx];
      IF v_item IS NOT NULL AND TRIM(v_item) != '' THEN
        v_norm_substitutes := v_norm_substitutes || UPPER(TRIM(v_item));
        v_all_norm_uids := v_all_norm_uids || UPPER(TRIM(v_item));

        -- Capture corresponding substitute IGN
        IF p_substitute_igns IS NOT NULL AND array_length(p_substitute_igns, 1) >= v_idx THEN
          v_ign_item := COALESCE(TRIM(p_substitute_igns[v_idx]), '');
        ELSE
          v_ign_item := '';
        END IF;
        v_clean_substitute_igns := v_clean_substitute_igns || v_ign_item;
      END IF;
    END LOOP;
  END IF;

  -- 5. Authoritative Exact Active Roster Size Enforcement
  v_active_mode := LOWER(COALESCE(p_mode, v_tournament.format, ''));
  IF v_active_mode LIKE '%solo%' THEN
    v_required_teammates := 0; -- 1 Captain + 0 Teammates = 1 Active Player
  ELSIF v_active_mode LIKE '%duo%' THEN
    v_required_teammates := 1; -- 1 Captain + 1 Teammate = 2 Active Players
  ELSIF v_active_mode LIKE '%squad%' OR v_active_mode = '' THEN
    v_required_teammates := 3; -- 1 Captain + 3 Teammates = 4 Active Players
  ELSE
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_MODE',
      'message', format('Unsupported tournament mode: %s. Expected Solo, Duo, or Squad.', p_mode)
    );
  END IF;

  v_actual_teammates := COALESCE(array_length(v_norm_teammates, 1), 0);

  IF v_actual_teammates != v_required_teammates THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_ROSTER_SIZE',
      'message', format('Exact roster size mismatch: %s mode requires exactly %s active player(s) (1 Captain + %s Teammate(s)). Received %s teammate(s).',
        UPPER(COALESCE(p_mode, 'Squad')), (v_required_teammates + 1), v_required_teammates, v_actual_teammates)
    );
  END IF;

  -- 6. Validate that every active teammate has a non-empty IGN
  IF v_actual_teammates > 0 THEN
    FOR v_idx IN 1..v_actual_teammates LOOP
      IF v_clean_teammate_igns[v_idx] IS NULL OR v_clean_teammate_igns[v_idx] = '' THEN
        RETURN jsonb_build_object(
          'success', false,
          'error_code', 'INVALID_ROSTER',
          'message', format('In-Game Name (IGN) is required for Teammate %s.', v_idx)
        );
      END IF;
    END LOOP;
  END IF;

  -- 7. Check intra-roster duplicate UIDs (Captain, Teammates, and Substitutes must all be distinct)
  IF (SELECT COUNT(*) FROM unnest(v_all_norm_uids)) != (SELECT COUNT(DISTINCT x) FROM unnest(v_all_norm_uids) x) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_ROSTER',
      'message', 'Duplicate Game UIDs detected within the submitted roster.'
    );
  END IF;

  -- 8. Check if authenticated user already has a registration in this tournament
  IF EXISTS (
    SELECT 1 FROM public.tournament_players
    WHERE tournament_id = p_tournament_id
      AND user_id = v_user_id
  ) OR EXISTS (
    SELECT 1 FROM public.tournament_registrations
    WHERE tournament_id = p_tournament_id
      AND user_id = v_user_id
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'DUPLICATE_USER_ACCOUNT',
      'message', 'You have already registered for this tournament.'
    );
  END IF;

  -- 9. Check existing tournament_players for Game UID collision in the same tournament
  SELECT game_uid INTO v_conflict_uid
  FROM public.tournament_players
  WHERE tournament_id = p_tournament_id
    AND normalized_game_uid = ANY(v_all_norm_uids)
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'DUPLICATE_GAME_UID',
      'message', 'Game UID ' || v_conflict_uid || ' is already registered in this tournament.'
    );
  END IF;

  -- Also check existing free_fire_uid in tournament_registrations table
  SELECT free_fire_uid INTO v_conflict_uid
  FROM public.tournament_registrations
  WHERE tournament_id = p_tournament_id
    AND UPPER(TRIM(free_fire_uid)) = ANY(v_all_norm_uids)
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'DUPLICATE_GAME_UID',
      'message', 'Game UID ' || v_conflict_uid || ' is already registered in this tournament.'
    );
  END IF;

  -- 10. Insert into public.tournament_registrations (FULL PRIVATE PII RECORD)
  v_ref_id := COALESCE(p_ref_id, 'REG-MJ-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8)));
  v_game := COALESCE(v_tournament.game, 'Free Fire');

  INSERT INTO public.tournament_registrations (
    tournament_id,
    team_name,
    captain_name,
    free_fire_uid,
    whatsapp_number,
    email,
    user_id,
    status,
    registered_at
  ) VALUES (
    p_tournament_id,
    p_team_name,
    p_captain_name,
    TRIM(p_captain_uid),
    p_whatsapp_number,
    p_email,
    v_user_id,
    'Approved',
    NOW()
  ) RETURNING id INTO v_registration_id;

  -- 11. Insert individual player records into public.tournament_players
  -- 11.1 Captain Player Record
  INSERT INTO public.tournament_players (
    tournament_id,
    registration_id,
    user_id,
    game,
    game_uid,
    canonical_ign,
    normalized_ign,
    player_role,
    identity_status
  ) VALUES (
    p_tournament_id,
    v_registration_id,
    v_user_id,
    v_game,
    TRIM(p_captain_uid),
    v_clean_captain_ign,
    v_norm_captain_ign,
    'Captain',
    'REGISTERED'
  );

  -- Build Captain object for structured roster JSON
  v_roster_json := v_roster_json || jsonb_build_object(
    'role', 'Captain',
    'uid', TRIM(p_captain_uid),
    'canonicalIgn', v_clean_captain_ign,
    'normalizedIgn', v_norm_captain_ign,
    'userId', v_user_id
  );

  -- 11.2 Teammate Player Records
  IF v_actual_teammates > 0 THEN
    FOR v_idx IN 1..v_actual_teammates LOOP
      INSERT INTO public.tournament_players (
        tournament_id,
        registration_id,
        user_id,
        game,
        game_uid,
        canonical_ign,
        normalized_ign,
        player_role,
        identity_status
      ) VALUES (
        p_tournament_id,
        v_registration_id,
        NULL,
        v_game,
        v_norm_teammates[v_idx],
        v_clean_teammate_igns[v_idx],
        LOWER(TRIM(v_clean_teammate_igns[v_idx])),
        'Member',
        'REGISTERED'
      );

      v_roster_json := v_roster_json || jsonb_build_object(
        'role', 'Member',
        'uid', v_norm_teammates[v_idx],
        'canonicalIgn', v_clean_teammate_igns[v_idx],
        'normalizedIgn', LOWER(TRIM(v_clean_teammate_igns[v_idx])),
        'userId', NULL
      );
    END LOOP;
  END IF;

  -- 11.3 Substitute Player Records
  IF p_has_substitutes AND array_length(v_norm_substitutes, 1) > 0 THEN
    FOR v_idx IN 1..array_length(v_norm_substitutes, 1) LOOP
      INSERT INTO public.tournament_players (
        tournament_id,
        registration_id,
        user_id,
        game,
        game_uid,
        canonical_ign,
        normalized_ign,
        player_role,
        identity_status
      ) VALUES (
        p_tournament_id,
        v_registration_id,
        NULL,
        v_game,
        v_norm_substitutes[v_idx],
        COALESCE(v_clean_substitute_igns[v_idx], ''),
        LOWER(TRIM(COALESCE(v_clean_substitute_igns[v_idx], ''))),
        'Substitute',
        'REGISTERED'
      );

      v_roster_json := v_roster_json || jsonb_build_object(
        'role', 'Substitute',
        'uid', v_norm_substitutes[v_idx],
        'canonicalIgn', COALESCE(v_clean_substitute_igns[v_idx], ''),
        'normalizedIgn', LOWER(TRIM(COALESCE(v_clean_substitute_igns[v_idx], ''))),
        'userId', NULL
      );
    END LOOP;
  END IF;

  -- 12. Build SANITIZED JSON object for public.tournaments.teams_list
  -- Preserves 'teammates' as UID array for 100% backward compatibility
  -- Adds 'teammateIgns' and structured 'roster' array for new identity features
  v_new_team_json := jsonb_build_object(
    'id', v_ref_id,
    'refId', v_ref_id,
    'name', p_team_name,
    'captain', p_captain_name,
    'freeFireUid', TRIM(p_captain_uid),
    'preferredSeed', p_preferred_seed,
    'hasSubstitutes', p_has_substitutes,
    'substitutes', COALESCE(to_jsonb(p_substitute_uids), '[]'::jsonb),
    'substituteIgns', COALESCE(to_jsonb(v_clean_substitute_igns), '[]'::jsonb),
    'enableSmsAlerts', p_enable_sms_alerts,
    'mode', p_mode,
    'teammates', COALESCE(to_jsonb(v_norm_teammates), '[]'::jsonb),
    'teammateIgns', COALESCE(to_jsonb(v_clean_teammate_igns), '[]'::jsonb),
    'roster', v_roster_json,
    'userId', v_user_id,
    'status', 'Approved',
    'rank', jsonb_array_length(COALESCE(v_tournament.teams_list, '[]'::jsonb)) + 1,
    'registeredAt', NOW()
  );

  UPDATE public.tournaments
  SET 
    registered_teams = registered_teams + 1,
    teams_list = COALESCE(teams_list, '[]'::jsonb) || v_new_team_json,
    updated_at = NOW()
  WHERE id = p_tournament_id;

  -- 13. Return success response object
  RETURN jsonb_build_object(
    'success', true,
    'refId', v_ref_id,
    'registration_id', v_registration_id,
    'message', 'Tournament registration successful.',
    'teamRecord', v_new_team_json
  );
END;
$$;

-- Grant execution privileges strictly to authenticated and service_role
REVOKE EXECUTE ON FUNCTION public.register_tournament_team FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_tournament_team TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_tournament_team TO service_role;
