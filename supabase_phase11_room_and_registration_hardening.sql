-- ============================================================================
-- MJ ESPORTS — Phase 11: Room Credentials & 10-Digit Player Registration Hardening
-- Target Engine: Supabase PostgreSQL
-- Description:
--   1. Enforces strict numeric constraints on Room ID (numbers only) & Room Password (numbers only).
--   2. Enforces strict 10-digit numeric constraints on Player Game UIDs & WhatsApp Numbers.
--   3. Updates public.register_tournament_team RPC with server-side regex validation.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ADD CHECK CONSTRAINTS TO TOURNAMENTS TABLE (NUMERIC ROOM CREDENTIALS)
-- ----------------------------------------------------------------------------

DO $$
BEGIN
  -- Validate room_id contains only numeric digits 0-9 (when set)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_tournaments_room_id_numeric'
  ) THEN
    ALTER TABLE public.tournaments
      ADD CONSTRAINT chk_tournaments_room_id_numeric
      CHECK (room_id IS NULL OR room_id = '' OR room_id ~ '^[0-9]+$');
  END IF;

  -- Validate room_password contains only numeric digits 0-9 (when set)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_tournaments_room_password_numeric'
  ) THEN
    ALTER TABLE public.tournaments
      ADD CONSTRAINT chk_tournaments_room_password_numeric
      CHECK (room_password IS NULL OR room_password = '' OR room_password ~ '^[0-9]+$');
  END IF;
END $$;


-- ----------------------------------------------------------------------------
-- 2. ADD CHECK CONSTRAINTS TO REGISTRATIONS & PLAYERS TABLES (10-DIGIT UIDS & PHONE)
-- ----------------------------------------------------------------------------

DO $$
BEGIN
  -- Validate tournament_players game_uid is exactly 10 digits
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_tournament_players_game_uid_10_digits'
  ) THEN
    ALTER TABLE public.tournament_players
      ADD CONSTRAINT chk_tournament_players_game_uid_10_digits
      CHECK (game_uid IS NULL OR game_uid ~ '^[0-9]{10}$');
  END IF;

  -- Validate tournament_registrations captain_uid is exactly 10 digits
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_tournament_registrations_captain_uid_10_digits'
  ) THEN
    ALTER TABLE public.tournament_registrations
      ADD CONSTRAINT chk_tournament_registrations_captain_uid_10_digits
      CHECK (captain_uid IS NULL OR captain_uid ~ '^[0-9]{10}$');
  END IF;

  -- Validate tournament_registrations whatsapp_number is exactly 10 digits
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_tournament_registrations_phone_10_digits'
  ) THEN
    ALTER TABLE public.tournament_registrations
      ADD CONSTRAINT chk_tournament_registrations_phone_10_digits
      CHECK (whatsapp_number IS NULL OR whatsapp_number ~ '^[0-9]{10}$');
  END IF;
END $$;


-- ----------------------------------------------------------------------------
-- 3. UPDATE REGISTER_TOURNAMENT_TEAM RPC WITH STRICT 10-DIGIT VALIDATION
-- ----------------------------------------------------------------------------

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
  v_norm_phone TEXT;
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

  -- 2. Lock target tournament row
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

  -- 4. Validate Captain UID (Strictly 10 digits 0-9)
  IF p_captain_uid IS NULL OR TRIM(p_captain_uid) = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_ROSTER',
      'message', 'Captain Game Character UID is required.'
    );
  END IF;

  v_norm_captain_uid := TRIM(p_captain_uid);
  IF NOT (v_norm_captain_uid ~ '^[0-9]{10}$') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_GAME_UID',
      'message', 'Game Character UID must be exactly 10 numeric digits (0-9).'
    );
  END IF;
  v_all_norm_uids := v_all_norm_uids || v_norm_captain_uid;

  -- 5. Validate Contact Phone Number (Strictly 10 digits 0-9)
  v_norm_phone := TRIM(COALESCE(p_whatsapp_number, ''));
  IF v_norm_phone != '' AND NOT (v_norm_phone ~ '^[0-9]{10}$') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_PHONE_NUMBER',
      'message', 'WhatsApp contact number must be exactly 10 numeric digits (0-9).'
    );
  END IF;

  -- 6. Normalize and validate teammates array (Strictly 10 digits each)
  IF p_teammate_uids IS NOT NULL AND array_length(p_teammate_uids, 1) > 0 THEN
    FOREACH v_item IN ARRAY p_teammate_uids LOOP
      IF v_item IS NOT NULL AND TRIM(v_item) != '' THEN
        IF NOT (TRIM(v_item) ~ '^[0-9]{10}$') THEN
          RETURN jsonb_build_object(
            'success', false,
            'error_code', 'INVALID_GAME_UID',
            'message', 'Teammate Game UID must be exactly 10 numeric digits (0-9).'
          );
        END IF;
        v_norm_teammates := v_norm_teammates || TRIM(v_item);
        v_all_norm_uids := v_all_norm_uids || TRIM(v_item);
      END IF;
    END LOOP;
  END IF;

  -- 7. Normalize and validate substitutes array if enabled (Strictly 10 digits each)
  IF p_has_substitutes AND p_substitute_uids IS NOT NULL AND array_length(p_substitute_uids, 1) > 0 THEN
    FOREACH v_item IN ARRAY p_substitute_uids LOOP
      IF v_item IS NOT NULL AND TRIM(v_item) != '' THEN
        IF NOT (TRIM(v_item) ~ '^[0-9]{10}$') THEN
          RETURN jsonb_build_object(
            'success', false,
            'error_code', 'INVALID_GAME_UID',
            'message', 'Substitute Game UID must be exactly 10 numeric digits (0-9).'
          );
        END IF;
        v_norm_substitutes := v_norm_substitutes || TRIM(v_item);
        v_all_norm_uids := v_all_norm_uids || TRIM(v_item);
      END IF;
    END LOOP;
  END IF;

  -- 8. Check intra-roster duplicate UIDs
  IF (SELECT COUNT(*) FROM unnest(v_all_norm_uids)) != (SELECT COUNT(DISTINCT x) FROM unnest(v_all_norm_uids) x) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_ROSTER',
      'message', 'Duplicate Game UIDs detected within the submitted roster.'
    );
  END IF;

  -- 9. Check if authenticated user already registered
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

  -- 10. Check global duplicate Game UID collision
  SELECT game_uid INTO v_conflict_uid
  FROM public.tournament_players
  WHERE tournament_id = p_tournament_id
    AND game_uid = ANY(v_all_norm_uids)
  LIMIT 1;

  IF v_conflict_uid IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'DUPLICATE_GAME_UID',
      'message', 'Game UID ' || v_conflict_uid || ' is already registered in this tournament.'
    );
  END IF;

  -- 11. Generate unique reference ID
  v_ref_id := COALESCE(p_ref_id, 'REG-MJ-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8)));
  v_game := COALESCE(v_tournament.game, 'Free Fire');

  -- 12. Insert into tournament_registrations
  INSERT INTO public.tournament_registrations (
    tournament_id,
    user_id,
    team_name,
    captain_name,
    email,
    whatsapp_number,
    captain_uid,
    teammate_uids,
    substitute_uids,
    captain_dob,
    player_age,
    preferred_seed,
    has_substitutes,
    enable_sms_alerts,
    mode,
    ref_id,
    status
  ) VALUES (
    p_tournament_id,
    v_user_id,
    p_team_name,
    p_captain_name,
    p_email,
    v_norm_phone,
    v_norm_captain_uid,
    v_norm_teammates,
    v_norm_substitutes,
    CASE WHEN p_captain_dob IS NOT NULL AND p_captain_dob != '' THEN p_captain_dob::DATE ELSE NULL END,
    p_player_age,
    p_preferred_seed,
    p_has_substitutes,
    p_enable_sms_alerts,
    p_mode,
    v_ref_id,
    'Approved'
  ) RETURNING id INTO v_registration_id;

  -- 13. Insert Captain into tournament_players
  INSERT INTO public.tournament_players (
    tournament_id,
    registration_id,
    user_id,
    team_name,
    player_name,
    game_uid,
    game,
    role
  ) VALUES (
    p_tournament_id,
    v_registration_id,
    v_user_id,
    p_team_name,
    p_captain_name,
    v_norm_captain_uid,
    v_game,
    'Captain'
  );

  -- 14. Insert Teammates into tournament_players
  IF array_length(v_norm_teammates, 1) > 0 THEN
    FOR v_idx IN 1..array_length(v_norm_teammates, 1) LOOP
      INSERT INTO public.tournament_players (
        tournament_id,
        registration_id,
        user_id,
        team_name,
        player_name,
        game_uid,
        game,
        role
      ) VALUES (
        p_tournament_id,
        v_registration_id,
        NULL,
        p_team_name,
        COALESCE(p_teammate_igns[v_idx], 'Teammate ' || v_idx),
        v_norm_teammates[v_idx],
        v_game,
        'Member'
      );
    END LOOP;
  END IF;

  -- 15. Insert Substitutes into tournament_players
  IF p_has_substitutes AND array_length(v_norm_substitutes, 1) > 0 THEN
    FOR v_idx IN 1..array_length(v_norm_substitutes, 1) LOOP
      INSERT INTO public.tournament_players (
        tournament_id,
        registration_id,
        user_id,
        team_name,
        player_name,
        game_uid,
        game,
        role
      ) VALUES (
        p_tournament_id,
        v_registration_id,
        NULL,
        p_team_name,
        COALESCE(p_substitute_igns[v_idx], 'Substitute ' || v_idx),
        v_norm_substitutes[v_idx],
        v_game,
        'Substitute'
      );
    END LOOP;
  END IF;

  -- 16. Build public teams_list entry (sanitized PII)
  v_new_team_json := jsonb_build_object(
    'id', v_ref_id,
    'refId', v_ref_id,
    'userId', v_user_id,
    'name', p_team_name,
    'captain', p_captain_name,
    'freeFireUid', v_norm_captain_uid,
    'teammates', to_jsonb(v_norm_teammates),
    'substitutes', to_jsonb(v_norm_substitutes),
    'status', 'Approved',
    'score', 0,
    'kills', 0,
    'mode', p_mode,
    'preferredSeed', p_preferred_seed,
    'registeredAt', NOW()
  );

  -- 17. Atomic increment registered_teams and append to teams_list
  UPDATE public.tournaments
  SET registered_teams = COALESCE(registered_teams, 0) + 1,
      teams_list = COALESCE(teams_list, '[]'::JSONB) || jsonb_build_array(v_new_team_json)
  WHERE id = p_tournament_id;

  -- 18. Return success response
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Registration completed successfully!',
    'refId', v_ref_id,
    'teamRecord', v_new_team_json
  );
END;
$$;

-- Grant execute permissions to authenticated and service_role
GRANT EXECUTE ON FUNCTION public.register_tournament_team TO authenticated, service_role;
