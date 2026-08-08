-- ============================================================================
-- MJ ESPORTS — Phase 3: Atomic Tournament Registration RPC
-- Target Engine: Supabase PostgreSQL
-- Description: Creates public.register_tournament_team SECURITY DEFINER function.
--              Enforces atomic transaction, row-level locking, UID normalization,
--              duplicate UID & user_id checks, tournament_players inserts,
--              tournament_registrations insert, and teams_list JSONB updates.
-- ============================================================================

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

  -- 4. Normalize and validate input Game UIDs
  IF p_captain_uid IS NULL OR TRIM(p_captain_uid) = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_ROSTER',
      'message', 'Captain Game Character UID is required.'
    );
  END IF;

  v_norm_captain_uid := UPPER(TRIM(p_captain_uid));
  v_all_norm_uids := v_all_norm_uids || v_norm_captain_uid;

  -- Normalize teammates array
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

  -- Check intra-roster duplicate UIDs (Within the submitted roster itself)
  IF (SELECT COUNT(*) FROM unnest(v_all_norm_uids)) != (SELECT COUNT(DISTINCT x) FROM unnest(v_all_norm_uids) x) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_ROSTER',
      'message', 'Duplicate Game UIDs detected within the submitted roster.'
    );
  END IF;

  -- 5. Check if authenticated user already has a registration in this tournament
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

  -- 6. Check existing tournament_players for Game UID collision in the same tournament
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

  -- 7. Prepare reference ID and insert into public.tournament_registrations
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

  -- 8. Insert individual player records into public.tournament_players
  -- 8.1 Captain Player Record
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

  -- 8.2 Teammate Player Records
  IF array_length(p_teammate_uids, 1) > 0 THEN
    FOREACH v_item IN ARRAY p_teammate_uids LOOP
      IF v_item IS NOT NULL AND TRIM(v_item) != '' THEN
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
      END IF;
    END LOOP;
  END IF;

  -- 8.3 Substitute Player Records
  IF p_has_substitutes AND array_length(p_substitute_uids, 1) > 0 THEN
    FOREACH v_item IN ARRAY p_substitute_uids LOOP
      IF v_item IS NOT NULL AND TRIM(v_item) != '' THEN
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
      END IF;
    END LOOP;
  END IF;

  -- 9. Build JSON object and update public.tournaments.teams_list and registered_teams
  v_new_team_json := jsonb_build_object(
    'id', v_ref_id,
    'refId', v_ref_id,
    'name', p_team_name,
    'captain', p_captain_name,
    'email', p_email,
    'freeFireUid', TRIM(p_captain_uid),
    'whatsappNumber', p_whatsapp_number,
    'captainDob', p_captain_dob,
    'playerAge', p_player_age,
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

  -- 10. Return success response object
  RETURN jsonb_build_object(
    'success', true,
    'refId', v_ref_id,
    'registration_id', v_registration_id,
    'message', 'Tournament registration successful.',
    'teamRecord', v_new_team_json
  );
END;
$$;

-- Grant permissions for executing the registration RPC
REVOKE EXECUTE ON FUNCTION public.register_tournament_team FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_tournament_team TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_tournament_team TO service_role;
