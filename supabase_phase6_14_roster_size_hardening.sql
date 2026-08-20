-- ============================================================================
-- MJ ESPORTS — Phase 6.14: Tournament Active Roster Size Hardening Migration
-- Target Engine: Supabase PostgreSQL
-- Description: Updates public.register_tournament_team SECURITY DEFINER RPC to
--              authoritatively enforce exact active roster sizes on the server-side:
--              - Solo: Exactly 1 active player (Captain + 0 teammates)
--              - Duo: Exactly 2 active players (Captain + 1 teammate)
--              - Squad: Exactly 4 active players (Captain + 3 teammates)
--              - Preserves all UID uniqueness, substitute isolation, PII sanitization,
--                row-level concurrency locking, and atomic registration guarantees.
-- ============================================================================

DROP FUNCTION IF EXISTS public.register_tournament_team(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT[], TEXT, INT, INT, BOOLEAN, BOOLEAN, TEXT, TEXT
);

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
  p_ref_id TEXT DEFAULT NULL
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
  v_norm_teammates TEXT[] := '{}'::TEXT[];
  v_norm_substitutes TEXT[] := '{}'::TEXT[];
  v_all_norm_uids TEXT[] := '{}'::TEXT[];
  v_conflict_uid TEXT;
  v_ref_id TEXT;
  v_registration_id UUID;
  v_new_team_json JSONB;
  v_item TEXT;
  v_active_mode TEXT;
  v_required_teammates INT;
  v_actual_teammates INT;
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

  -- 4. Normalize and validate Captain Game UID
  IF p_captain_uid IS NULL OR TRIM(p_captain_uid) = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_ROSTER',
      'message', 'Captain Game Character UID is required.'
    );
  END IF;

  v_norm_captain_uid := UPPER(TRIM(p_captain_uid));
  v_all_norm_uids := v_all_norm_uids || v_norm_captain_uid;

  -- Normalize teammates array (strip empty/whitespace elements)
  IF p_teammate_uids IS NOT NULL AND array_length(p_teammate_uids, 1) > 0 THEN
    FOREACH v_item IN ARRAY p_teammate_uids LOOP
      IF v_item IS NOT NULL AND TRIM(v_item) != '' THEN
        v_norm_teammates := v_norm_teammates || UPPER(TRIM(v_item));
        v_all_norm_uids := v_all_norm_uids || UPPER(TRIM(v_item));
      END IF;
    END LOOP;
  END IF;

  -- Normalize substitutes array if substitutes enabled
  IF p_has_substitutes AND p_substitute_uids IS NOT NULL AND array_length(p_substitute_uids, 1) > 0 THEN
    FOREACH v_item IN ARRAY p_substitute_uids LOOP
      IF v_item IS NOT NULL AND TRIM(v_item) != '' THEN
        v_norm_substitutes := v_norm_substitutes || UPPER(TRIM(v_item));
        v_all_norm_uids := v_all_norm_uids || UPPER(TRIM(v_item));
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

  -- 6. Check intra-roster duplicate UIDs (Captain, Teammates, and Substitutes must all be distinct)
  IF (SELECT COUNT(*) FROM unnest(v_all_norm_uids)) != (SELECT COUNT(DISTINCT x) FROM unnest(v_all_norm_uids) x) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_ROSTER',
      'message', 'Duplicate Game UIDs detected within the submitted roster.'
    );
  END IF;

  -- 7. Check if authenticated user already has a registration in this tournament
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

  -- 8. Check existing tournament_players for Game UID collision in the same tournament
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

  -- 9. Prepare reference ID and insert into public.tournament_registrations (FULL PRIVATE PII RECORD)
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

  -- 10. Insert individual player records into public.tournament_players
  -- 10.1 Captain Player Record
  INSERT INTO public.tournament_players (
    tournament_id,
    registration_id,
    user_id,
    game,
    game_uid,
    player_role
  ) VALUES (
    p_tournament_id,
    v_registration_id,
    v_user_id,
    v_game,
    TRIM(p_captain_uid),
    'Captain'
  );

  -- 10.2 Teammate Player Records
  IF v_actual_teammates > 0 THEN
    FOREACH v_item IN ARRAY v_norm_teammates LOOP
      INSERT INTO public.tournament_players (
        tournament_id,
        registration_id,
        user_id,
        game,
        game_uid,
        player_role
      ) VALUES (
        p_tournament_id,
        v_registration_id,
        NULL,
        v_game,
        TRIM(v_item),
        'Member'
      );
    END LOOP;
  END IF;

  -- 10.3 Substitute Player Records (Isolated as Substitute role, do NOT affect active capacity)
  IF p_has_substitutes AND array_length(v_norm_substitutes, 1) > 0 THEN
    FOREACH v_item IN ARRAY v_norm_substitutes LOOP
      INSERT INTO public.tournament_players (
        tournament_id,
        registration_id,
        user_id,
        game,
        game_uid,
        player_role
      ) VALUES (
        p_tournament_id,
        v_registration_id,
        NULL,
        v_game,
        TRIM(v_item),
        'Substitute'
      );
    END LOOP;
  END IF;

  -- 11. Build SANITIZED JSON object (PII REMOVED: email, whatsappNumber, captainDob, playerAge)
  -- and update public.tournaments.teams_list and registered_teams
  v_new_team_json := jsonb_build_object(
    'id', v_ref_id,
    'refId', v_ref_id,
    'name', p_team_name,
    'captain', p_captain_name,
    'freeFireUid', TRIM(p_captain_uid),
    'preferredSeed', p_preferred_seed,
    'hasSubstitutes', p_has_substitutes,
    'substitutes', COALESCE(to_jsonb(p_substitute_uids), '[]'::jsonb),
    'enableSmsAlerts', p_enable_sms_alerts,
    'mode', p_mode,
    'teammates', COALESCE(to_jsonb(p_teammate_uids), '[]'::jsonb),
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

  -- 12. Return success response object
  RETURN jsonb_build_object(
    'success', true,
    'refId', v_ref_id,
    'registration_id', v_registration_id,
    'message', 'Tournament registration successful.',
    'teamRecord', v_new_team_json
  );
END;
$$;

-- Ensure execution privileges remain intact for authenticated and service_role
REVOKE EXECUTE ON FUNCTION public.register_tournament_team FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_tournament_team TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_tournament_team TO service_role;
