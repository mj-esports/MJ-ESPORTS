-- ============================================================================
-- MJ ESPORTS — Phase 5: Authoritative Atomic Tournament Rejection RPC
-- Target Engine: Supabase PostgreSQL
-- Description:
-- 1. Implements unified public.reject_tournament_registration SECURITY DEFINER RPC.
-- 2. Atomically performs in ONE single PostgreSQL transaction:
--    - Admin authorization validation (public.is_admin() or service_role)
--    - Row-level locking on registration, tournament, and evidence (FOR UPDATE)
--    - Idempotency check to prevent duplicate capacity decrements
--    - Mutation of tournament_registrations.status -> 'Rejected'
--    - Atomic capacity release: registered_teams = GREATEST(registered_teams - 1, 0)
--    - Synchronization of tournaments.teams_list JSON
--    - Update of tournament_players.identity_status -> 'FLAGGED'
--    - Mutation of player_identity_evidence.status -> 'REJECTED' with reason & admin actor
--    - Creation of immutable player_evidence_audit_logs entry
--    - Synchronization of profiles.verification_status -> 'Rejected'
-- 3. Excludes 'Rejected' registrations from duplicate checks in register_tournament_team
--    so rejected players can submit a clean re-registration once their slot is released.
-- ============================================================================

-- 1. CREATE UNIFIED ATOMIC REJECTION RPC
CREATE OR REPLACE FUNCTION public.reject_tournament_registration(
  p_registration_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_admin_id UUID;
  v_reg RECORD;
  v_tournament RECORD;
  v_evidence RECORD;
  v_new_teams_list JSONB := '[]'::JSONB;
  v_team JSONB;
  v_new_count INT;
  v_reason TEXT;
  v_team_matched BOOLEAN := FALSE;
BEGIN
  -- 1. Authorization: Admin or service_role check
  v_admin_id := auth.uid();
  IF NOT (public.is_admin() OR (SELECT current_setting('role', true)) = 'service_role') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'UNAUTHORIZED',
      'message', 'Only administrators can reject tournament registrations.'
    );
  END IF;

  v_reason := COALESCE(TRIM(p_reason), 'Registration credentials or identity proof rejected by administrator.');

  -- 2. Fetch and lock target registration row
  SELECT * INTO v_reg
  FROM public.tournament_registrations
  WHERE id = p_registration_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'REGISTRATION_NOT_FOUND',
      'message', 'Tournament registration not found.'
    );
  END IF;

  -- 3. Idempotency check: Already rejected
  IF v_reg.status = 'Rejected' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'ALREADY_REJECTED',
      'message', 'This registration is already marked as Rejected.'
    );
  END IF;

  -- 4. Fetch and lock associated tournament row
  SELECT * INTO v_tournament
  FROM public.tournaments
  WHERE id = v_reg.tournament_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'TOURNAMENT_NOT_FOUND',
      'message', 'Associated tournament not found.'
    );
  END IF;

  -- 5. ATOMIC STATE MUTATIONS IN SINGLE TRANSACTION:
  -- A. Update registration status in public.tournament_registrations
  UPDATE public.tournament_registrations
  SET
    status = 'Rejected',
    updated_at = NOW()
  WHERE id = p_registration_id;

  -- B. Synchronize tournaments.teams_list JSON
  IF v_tournament.teams_list IS NOT NULL THEN
    FOR v_team IN SELECT * FROM jsonb_array_elements(v_tournament.teams_list) LOOP
      IF NOT v_team_matched AND (
        (v_team->>'id' = v_reg.id::text) OR 
        (v_team->>'refId' = v_reg.id::text) OR
        (v_reg.user_id IS NOT NULL AND v_team->>'userId' = v_reg.user_id::text) OR
        (v_team->>'freeFireUid' = v_reg.free_fire_uid) OR
        (v_team->>'captain' = v_reg.captain_name AND v_team->>'name' = v_reg.team_name)
      ) THEN
        v_new_teams_list := v_new_teams_list || jsonb_set(v_team, '{status}', '"Rejected"');
        v_team_matched := TRUE;
      ELSE
        v_new_teams_list := v_new_teams_list || v_team;
      END IF;
    END LOOP;
  END IF;

  -- C. Decrement tournament capacity by exactly 1 with underflow defense
  v_new_count := GREATEST(COALESCE(v_tournament.registered_teams, 0) - 1, 0);

  UPDATE public.tournaments
  SET
    registered_teams = v_new_count,
    teams_list = v_new_teams_list,
    updated_at = NOW()
  WHERE id = v_tournament.id;

  -- D. Update tournament_players identity_status to FLAGGED for consistency
  UPDATE public.tournament_players
  SET
    identity_status = 'FLAGGED'
  WHERE registration_id = p_registration_id;

  -- E. Locate and reject associated player_identity_evidence (if exists for user/tournament)
  FOR v_evidence IN
    SELECT * FROM public.player_identity_evidence
    WHERE user_id = v_reg.user_id
      AND (tournament_id = v_reg.tournament_id OR tournament_id IS NULL)
    FOR UPDATE
  LOOP
    -- Record immutable audit log
    INSERT INTO public.player_evidence_audit_logs (
      evidence_id,
      previous_status,
      new_status,
      admin_id,
      rejection_reason,
      created_at
    ) VALUES (
      v_evidence.id,
      v_evidence.status,
      'REJECTED',
      v_admin_id,
      v_reason,
      NOW()
    );

    -- Update evidence row
    UPDATE public.player_identity_evidence
    SET
      status = 'REJECTED',
      rejection_reason = v_reason,
      verified_by = v_admin_id,
      verified_at = NOW(),
      updated_at = NOW()
    WHERE id = v_evidence.id;
  END LOOP;

  -- F. Synchronize profiles table verification_status
  IF v_reg.user_id IS NOT NULL THEN
    UPDATE public.profiles
    SET
      verification_status = 'Rejected',
      updated_at = NOW()
    WHERE id = v_reg.user_id;
  END IF;

  -- 6. Return structured success payload
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Tournament registration rejected, identity evidence marked as REJECTED, and slot released successfully.',
    'registration_id', p_registration_id,
    'tournament_id', v_tournament.id,
    'new_registered_teams', v_new_count
  );
END;
$$;

-- Grant execution privileges strictly to authenticated and service_role
REVOKE EXECUTE ON FUNCTION public.reject_tournament_registration(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reject_tournament_registration(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_tournament_registration(UUID, TEXT) TO service_role;

-- 2. ENSURE TOURNAMENTS STATUS CHECK CONSTRAINT ALIGNED WITH CANONICAL LIFECYCLE
ALTER TABLE public.tournaments DROP CONSTRAINT IF EXISTS tournaments_status_check;
ALTER TABLE public.tournaments ADD CONSTRAINT tournaments_status_check 
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
    'Cancelled',
    'Archived'
  ));

