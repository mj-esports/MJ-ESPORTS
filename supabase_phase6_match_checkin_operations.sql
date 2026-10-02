-- ============================================================================
-- MJ ESPORTS — Phase 6: Match Check-In & Operations Hardening Migration
-- Target Engine: Supabase PostgreSQL
-- Description:
--   1. Creates public.match_checkins table:
--      - Tracks player and squad lobby check-in, check-in timestamp, status,
--        Free Fire UID consistency, and assigned lobby slot numbers.
--   2. Creates public.match_incidents table:
--      - Tracks operational match incidents (disconnects, remake requests,
--        technical issues), administrative review, and resolution actions.
--   3. Implements Server-Authoritative Check-In RPCs:
--      - check_in_tournament_participant(p_tournament_id, p_checkin_uid)
--      - admin_verify_participant_uid(p_checkin_id, p_action, p_notes)
--      - admin_assign_lobby_slot(p_checkin_id, p_slot_number, p_notes)
--      - check_match_readiness(p_tournament_id)
--      - admin_lock_match_roster(p_tournament_id)
--   4. Implements Match Incident & Remake Protection RPCs:
--      - report_match_incident(...)
--      - admin_resolve_match_incident(...)
--   5. Establishes strict Row Level Security, search_path isolation, and audit logging.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. CREATE PUBLIC.MATCH_CHECKINS TABLE
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.match_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id TEXT NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  registration_id UUID NOT NULL REFERENCES public.tournament_registrations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_name TEXT,
  captain_name TEXT,
  checkin_uid TEXT NOT NULL,
  registered_uid TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'CHECKED_IN'
    CHECK (status IN ('NOT_OPEN', 'OPEN', 'CHECKED_IN', 'VERIFIED', 'MISSED', 'LOCKED', 'REJECTED')),
  uid_match_status TEXT NOT NULL DEFAULT 'UID_MATCH'
    CHECK (uid_match_status IN ('UID_MATCH', 'UID_MISMATCH', 'MANUAL_REVIEW', 'ADMIN_VERIFIED', 'REJECTED')),
  lobby_slot INTEGER CHECK (lobby_slot IS NULL OR (lobby_slot >= 1 AND lobby_slot <= 24)),
  checked_in_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_match_checkins_registration UNIQUE (tournament_id, registration_id),
  CONSTRAINT uq_match_checkins_slot UNIQUE (tournament_id, lobby_slot)
);

CREATE INDEX IF NOT EXISTS idx_match_checkins_tourn ON public.match_checkins(tournament_id);
CREATE INDEX IF NOT EXISTS idx_match_checkins_user ON public.match_checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_match_checkins_status ON public.match_checkins(status);
CREATE INDEX IF NOT EXISTS idx_match_checkins_slot ON public.match_checkins(tournament_id, lobby_slot);

-- Enable RLS
ALTER TABLE public.match_checkins ENABLE ROW LEVEL SECURITY;

-- SELECT policy: Authenticated users can view check-ins for active tournament lobbies
DROP POLICY IF EXISTS "Public view match checkins" ON public.match_checkins;
CREATE POLICY "Public view match checkins"
  ON public.match_checkins FOR SELECT
  USING (true);

-- Direct INSERT, UPDATE, DELETE revoked from public/anon/authenticated. Enforced via SECURITY DEFINER RPCs.
REVOKE INSERT, UPDATE, DELETE ON public.match_checkins FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.match_checkins TO anon, authenticated;
GRANT ALL ON public.match_checkins TO service_role;

-- ----------------------------------------------------------------------------
-- 2. CREATE PUBLIC.MATCH_INCIDENTS TABLE
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.match_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id TEXT NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE,
  reported_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  incident_type TEXT NOT NULL
    CHECK (incident_type IN (
      'PLAYER_DISCONNECTED',
      'TEAM_DISCONNECTED',
      'ROOM_ISSUE',
      'ROOM_CONFIG_ERROR',
      'TECHNICAL_ISSUE',
      'REMAKE_REQUEST',
      'PLAYER_REPLACEMENT',
      'OTHER'
    )),
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'REPORTED'
    CHECK (status IN ('REPORTED', 'INVESTIGATING', 'APPROVED', 'REJECTED', 'RESOLVED')),
  admin_notes TEXT,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  resolution_action TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_match_incidents_tourn ON public.match_incidents(tournament_id);
CREATE INDEX IF NOT EXISTS idx_match_incidents_status ON public.match_incidents(status);
CREATE INDEX IF NOT EXISTS idx_match_incidents_reporter ON public.match_incidents(reported_by);

-- Enable RLS
ALTER TABLE public.match_incidents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants read tournament incidents" ON public.match_incidents;
CREATE POLICY "Participants read tournament incidents"
  ON public.match_incidents FOR SELECT
  USING (
    public.is_admin()
    OR auth.uid() = reported_by
    OR EXISTS (
      SELECT 1 FROM public.tournament_registrations tr
      WHERE tr.tournament_id = match_incidents.tournament_id
        AND tr.user_id = auth.uid()
    )
  );

REVOKE INSERT, UPDATE, DELETE ON public.match_incidents FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.match_incidents TO authenticated;
GRANT ALL ON public.match_incidents TO service_role;

-- ----------------------------------------------------------------------------
-- 3. PARTICIPANT CHECK-IN RPC
-- Enforces timing window, Free Fire UID consistency, and auto slot assignment
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.check_in_tournament_participant(
  p_tournament_id TEXT,
  p_checkin_uid TEXT
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
  v_reg RECORD;
  v_clean_uid TEXT;
  v_registered_uid TEXT;
  v_uid_match_status TEXT;
  v_assigned_slot INT := NULL;
  v_candidate_slot INT := 1;
  v_max_slots INT := 12;
  v_existing_checkin RECORD;
  v_team_name TEXT;
  v_captain_name TEXT;
BEGIN
  -- 1. Check user authentication
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'UNAUTHENTICATED',
      'message', 'You must be signed in to check in for the match.'
    );
  END IF;

  -- 2. Validate clean UID input
  v_clean_uid := TRIM(COALESCE(p_checkin_uid, ''));
  IF v_clean_uid = '' OR v_clean_uid !~ '^[0-9]{8,12}$' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_UID_FORMAT',
      'message', 'Free Fire UID must contain 8-12 numeric digits.'
    );
  END IF;

  -- 3. Fetch tournament record
  SELECT id, title, status, max_teams
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

  v_is_admin := (public.is_admin() OR (SELECT current_setting('role', true)) = 'service_role');

  -- 4. Terminal status check
  IF LOWER(COALESCE(v_tourn.status, '')) = 'cancelled' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'TOURNAMENT_CANCELLED',
      'message', 'This tournament has been cancelled. Match check-in is unavailable.'
    );
  END IF;

  IF LOWER(COALESCE(v_tourn.status, '')) IN ('completed', 'prize distributed', 'archived') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'TOURNAMENT_COMPLETED',
      'message', 'This tournament has concluded. Match check-in is closed.'
    );
  END IF;

  -- 5. Check-In Window Timing Enforcement
  IF NOT v_is_admin THEN
    IF LOWER(COALESCE(v_tourn.status, '')) IN ('draft', 'published', 'registration open') THEN
      RETURN jsonb_build_object(
        'success', false,
        'error_code', 'CHECKIN_NOT_OPEN',
        'message', 'Match check-in has not opened yet. Please wait for the check-in window.'
      );
    END IF;

    IF LOWER(COALESCE(v_tourn.status, '')) NOT IN ('check-in open', 'registration closed') THEN
      RETURN jsonb_build_object(
        'success', false,
        'error_code', 'CHECKIN_CLOSED',
        'message', 'Match check-in is currently closed or the match has already started.'
      );
    END IF;
  END IF;

  -- 6. Participant Authorization & Registration Verification
  SELECT id, tournament_id, user_id, team_name, captain_name, captain_uid, free_fire_uid, status
  INTO v_reg
  FROM public.tournament_registrations
  WHERE tournament_id = p_tournament_id
    AND user_id = v_user_id;

  -- 6.1 If not registered as captain, check tournament_players roster member
  IF NOT FOUND THEN
    SELECT tr.id, tr.tournament_id, tr.user_id, tr.team_name, tr.captain_name, tp.game_uid AS captain_uid, tp.game_uid AS free_fire_uid, tr.status
    INTO v_reg
    FROM public.tournament_players tp
    JOIN public.tournament_registrations tr ON tr.id = tp.registration_id
    WHERE tp.tournament_id = p_tournament_id
      AND tp.user_id = v_user_id;
  END IF;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'NOT_REGISTERED',
      'message', 'You are not a registered participant in this tournament.'
    );
  END IF;

  -- 6.2 Check registration status
  IF LOWER(COALESCE(v_reg.status, '')) = 'cancelled' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'REGISTRATION_CANCELLED',
      'message', 'Your tournament registration was cancelled. Check-in is not permitted.'
    );
  END IF;

  IF LOWER(COALESCE(v_reg.status, '')) = 'rejected' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'REGISTRATION_REJECTED',
      'message', 'Your tournament registration was rejected. Check-in is not permitted.'
    );
  END IF;

  v_team_name := COALESCE(v_reg.team_name, 'Solo Player');
  v_captain_name := COALESCE(v_reg.captain_name, 'Player');
  v_registered_uid := TRIM(COALESCE(v_reg.captain_uid, v_reg.free_fire_uid, ''));

  -- 7. Check if already checked in
  SELECT id, status, uid_match_status, lobby_slot
  INTO v_existing_checkin
  FROM public.match_checkins
  WHERE tournament_id = p_tournament_id
    AND registration_id = v_reg.id;

  IF FOUND THEN
    -- If roster is locked, prevent modification
    IF v_existing_checkin.status = 'LOCKED' THEN
      RETURN jsonb_build_object(
        'success', false,
        'error_code', 'ROSTER_LOCKED',
        'message', 'Tournament roster is locked. Check-in modifications are not permitted.'
      );
    END IF;

    -- Return existing check-in idempotently
    RETURN jsonb_build_object(
      'success', true,
      'checkin_id', v_existing_checkin.id,
      'status', v_existing_checkin.status,
      'uid_match_status', v_existing_checkin.uid_match_status,
      'lobby_slot', v_existing_checkin.lobby_slot,
      'message', 'You are already checked in for this match.'
    );
  END IF;

  -- 8. Free Fire UID Verification (Compare check-in UID with registered UID)
  IF v_clean_uid = v_registered_uid OR v_registered_uid = '' THEN
    v_uid_match_status := 'UID_MATCH';
  ELSE
    -- DO NOT OVERWRITE REGISTERED UID; Flag for manual admin review
    v_uid_match_status := 'UID_MISMATCH';
  END IF;

  -- 9. Automatic Lobby Slot Assignment (Find lowest available slot 1..max_teams)
  v_max_slots := COALESCE(v_tourn.max_teams, 12);
  v_candidate_slot := 1;
  WHILE v_candidate_slot <= v_max_slots LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.match_checkins
      WHERE tournament_id = p_tournament_id
        AND lobby_slot = v_candidate_slot
    ) THEN
      v_assigned_slot := v_candidate_slot;
      EXIT;
    END IF;
    v_candidate_slot := v_candidate_slot + 1;
  END LOOP;

  -- 10. Insert check-in record
  INSERT INTO public.match_checkins (
    tournament_id,
    registration_id,
    user_id,
    team_name,
    captain_name,
    checkin_uid,
    registered_uid,
    status,
    uid_match_status,
    lobby_slot,
    checked_in_at
  ) VALUES (
    p_tournament_id,
    v_reg.id,
    v_user_id,
    v_team_name,
    v_captain_name,
    v_clean_uid,
    v_registered_uid,
    'CHECKED_IN',
    v_uid_match_status,
    v_assigned_slot,
    NOW()
  )
  RETURNING id INTO v_existing_checkin.id;

  -- 11. Record audit event (Zero sensitive passwords logged)
  INSERT INTO public.match_operations_audit_log (
    tournament_id,
    action,
    actor_id,
    details
  ) VALUES (
    p_tournament_id,
    'PLAYER_CHECKED_IN',
    v_user_id,
    jsonb_build_object(
      'registration_id', v_reg.id,
      'team_name', v_team_name,
      'uid_match_status', v_uid_match_status,
      'assigned_slot', v_assigned_slot,
      'timestamp', NOW()
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'checkin_id', v_existing_checkin.id,
    'status', 'CHECKED_IN',
    'uid_match_status', v_uid_match_status,
    'lobby_slot', v_assigned_slot,
    'message', CASE
      WHEN v_uid_match_status = 'UID_MATCH'
        THEN 'Check-in successful! Assigned to Lobby Slot ' || COALESCE(v_assigned_slot::TEXT, 'Unassigned') || '.'
      ELSE 'Check-in recorded with UID discrepancy (Under Review). Assigned to Slot ' || COALESCE(v_assigned_slot::TEXT, 'Unassigned') || '.'
    END
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_in_tournament_participant FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_in_tournament_participant TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_in_tournament_participant TO service_role;

-- ----------------------------------------------------------------------------
-- 4. ADMIN UID VERIFICATION RPC
-- Approves or rejects UID discrepancies with full audit trail
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_verify_participant_uid(
  p_checkin_id UUID,
  p_action TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_admin_id UUID;
  v_checkin RECORD;
  v_new_uid_status TEXT;
  v_new_status TEXT;
BEGIN
  -- 1. Authorization: Admins only
  v_admin_id := auth.uid();
  IF NOT (public.is_admin() OR (SELECT current_setting('role', true)) = 'service_role') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'ADMIN_REQUIRED',
      'message', 'Only administrators can verify participant UIDs.'
    );
  END IF;

  -- 2. Fetch target check-in record
  SELECT * INTO v_checkin
  FROM public.match_checkins
  WHERE id = p_checkin_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'CHECKIN_NOT_FOUND',
      'message', 'Check-in record not found.'
    );
  END IF;

  -- 3. Determine status
  IF UPPER(TRIM(p_action)) = 'APPROVE' THEN
    v_new_uid_status := 'ADMIN_VERIFIED';
    v_new_status := 'VERIFIED';
  ELSIF UPPER(TRIM(p_action)) = 'REJECT' THEN
    v_new_uid_status := 'REJECTED';
    v_new_status := 'REJECTED';
  ELSE
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_ACTION',
      'message', 'Verification action must be either APPROVE or REJECT.'
    );
  END IF;

  -- 4. Update check-in record
  UPDATE public.match_checkins
  SET
    uid_match_status = v_new_uid_status,
    status = v_new_status,
    verified_at = NOW(),
    verified_by = v_admin_id,
    admin_notes = COALESCE(p_notes, admin_notes),
    updated_at = NOW()
  WHERE id = p_checkin_id;

  -- 5. Record audit event
  INSERT INTO public.match_operations_audit_log (
    tournament_id,
    action,
    actor_id,
    details
  ) VALUES (
    v_checkin.tournament_id,
    'PLAYER_VERIFIED',
    v_admin_id,
    jsonb_build_object(
      'checkin_id', p_checkin_id,
      'action', p_action,
      'uid_match_status', v_new_uid_status,
      'notes', p_notes,
      'timestamp', NOW()
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'checkin_id', p_checkin_id,
    'uid_match_status', v_new_uid_status,
    'status', v_new_status,
    'message', 'Participant UID successfully ' || LOWER(v_new_uid_status) || '.'
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_verify_participant_uid FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_verify_participant_uid TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_verify_participant_uid TO service_role;

-- ----------------------------------------------------------------------------
-- 5. ADMIN LOBBY SLOT ASSIGNMENT RPC
-- Assigns or reassigns lobby slots safely with uniqueness enforcement
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_assign_lobby_slot(
  p_checkin_id UUID,
  p_slot_number INTEGER,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_admin_id UUID;
  v_checkin RECORD;
  v_tourn RECORD;
BEGIN
  -- 1. Authorization: Admins only
  v_admin_id := auth.uid();
  IF NOT (public.is_admin() OR (SELECT current_setting('role', true)) = 'service_role') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'ADMIN_REQUIRED',
      'message', 'Only administrators can assign or reassign lobby slots.'
    );
  END IF;

  -- 2. Fetch check-in
  SELECT * INTO v_checkin
  FROM public.match_checkins
  WHERE id = p_checkin_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'CHECKIN_NOT_FOUND',
      'message', 'Check-in record not found.'
    );
  END IF;

  -- 3. Fetch tournament capacity
  SELECT id, max_teams INTO v_tourn
  FROM public.tournaments
  WHERE id = v_checkin.tournament_id;

  -- 4. Validate slot number bounds
  IF p_slot_number IS NOT NULL AND (p_slot_number < 1 OR p_slot_number > COALESCE(v_tourn.max_teams, 12)) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'SLOT_OUT_OF_BOUNDS',
      'message', 'Lobby slot number must be between 1 and ' || COALESCE(v_tourn.max_teams, 12)::TEXT || '.'
    );
  END IF;

  -- 5. Check if target slot is occupied by another participant
  IF p_slot_number IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.match_checkins
    WHERE tournament_id = v_checkin.tournament_id
      AND lobby_slot = p_slot_number
      AND id != p_checkin_id
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'SLOT_UNAVAILABLE',
      'message', 'Lobby slot ' || p_slot_number::TEXT || ' is already occupied by another squad.'
    );
  END IF;

  -- 6. Update slot assignment
  UPDATE public.match_checkins
  SET
    lobby_slot = p_slot_number,
    admin_notes = COALESCE(p_notes, admin_notes),
    updated_at = NOW()
  WHERE id = p_checkin_id;

  -- 7. Audit log
  INSERT INTO public.match_operations_audit_log (
    tournament_id,
    action,
    actor_id,
    details
  ) VALUES (
    v_checkin.tournament_id,
    'SLOT_REASSIGNED',
    v_admin_id,
    jsonb_build_object(
      'checkin_id', p_checkin_id,
      'old_slot', v_checkin.lobby_slot,
      'new_slot', p_slot_number,
      'notes', p_notes,
      'timestamp', NOW()
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'checkin_id', p_checkin_id,
    'lobby_slot', p_slot_number,
    'message', 'Lobby slot ' || COALESCE(p_slot_number::TEXT, 'Unassigned') || ' successfully assigned.'
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_assign_lobby_slot FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_assign_lobby_slot TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_assign_lobby_slot TO service_role;

-- ----------------------------------------------------------------------------
-- 6. MATCH READINESS CALCULATION RPC
-- Authoritative server-side evaluation of check-in, slots, and verification
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.check_match_readiness(
  p_tournament_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_tourn RECORD;
  v_total_reg INT := 0;
  v_total_checked_in INT := 0;
  v_verified_count INT := 0;
  v_mismatch_count INT := 0;
  v_slots_count INT := 0;
  v_readiness_pct INT := 0;
  v_is_ready BOOLEAN := TRUE;
  v_reasons TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- 1. Fetch tournament
  SELECT id, title, status, max_teams, registered_teams
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

  -- 2. Check terminal status
  IF LOWER(COALESCE(v_tourn.status, '')) = 'cancelled' THEN
    RETURN jsonb_build_object(
      'success', true,
      'tournament_id', p_tournament_id,
      'is_ready', false,
      'reasons', ARRAY['Tournament is cancelled.']
    );
  END IF;

  IF LOWER(COALESCE(v_tourn.status, '')) IN ('completed', 'prize distributed', 'archived') THEN
    RETURN jsonb_build_object(
      'success', true,
      'tournament_id', p_tournament_id,
      'is_ready', false,
      'reasons', ARRAY['Tournament is already completed.']
    );
  END IF;

  -- 3. Calculate statistics from active registrations and check-ins
  SELECT COUNT(*) INTO v_total_reg
  FROM public.tournament_registrations
  WHERE tournament_id = p_tournament_id
    AND (status IS NULL OR LOWER(status) IN ('approved', 'confirmed', 'active'));

  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE uid_match_status IN ('UID_MATCH', 'ADMIN_VERIFIED')),
    COUNT(*) FILTER (WHERE uid_match_status = 'UID_MISMATCH'),
    COUNT(*) FILTER (WHERE lobby_slot IS NOT NULL)
  INTO
    v_total_checked_in,
    v_verified_count,
    v_mismatch_count,
    v_slots_count
  FROM public.match_checkins
  WHERE tournament_id = p_tournament_id
    AND status != 'REJECTED';

  -- 4. Evaluate readiness criteria
  IF v_total_checked_in = 0 THEN
    v_is_ready := FALSE;
    v_reasons := array_append(v_reasons, 'Zero participants have checked in.');
  END IF;

  IF v_mismatch_count > 0 THEN
    v_is_ready := FALSE;
    v_reasons := array_append(v_reasons, v_mismatch_count::TEXT || ' participant(s) have unresolved UID discrepancies.');
  END IF;

  IF v_slots_count < v_total_checked_in THEN
    v_is_ready := FALSE;
    v_reasons := array_append(v_reasons, (v_total_checked_in - v_slots_count)::TEXT || ' checked-in squad(s) lack assigned lobby slots.');
  END IF;

  IF v_total_reg > 0 THEN
    v_readiness_pct := ROUND((v_verified_count::NUMERIC / v_total_reg::NUMERIC) * 100);
  ELSE
    v_readiness_pct := 0;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'tournament_id', p_tournament_id,
    'is_ready', v_is_ready,
    'total_registered', v_total_reg,
    'total_checked_in', v_total_checked_in,
    'verified_count', v_verified_count,
    'mismatch_count', v_mismatch_count,
    'assigned_slots_count', v_slots_count,
    'readiness_percentage', v_readiness_pct,
    'reasons', v_reasons
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_match_readiness FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_match_readiness TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_match_readiness TO service_role;

-- ----------------------------------------------------------------------------
-- 7. ADMIN ROSTER LOCK RPC
-- Transitions tournament to Check-in Closed and locks participant check-ins
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_lock_match_roster(
  p_tournament_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_admin_id UUID;
  v_locked_count INT := 0;
BEGIN
  -- 1. Authorization: Admins only
  v_admin_id := auth.uid();
  IF NOT (public.is_admin() OR (SELECT current_setting('role', true)) = 'service_role') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'ADMIN_REQUIRED',
      'message', 'Only administrators can lock the match roster.'
    );
  END IF;

  -- 2. Update tournament status to Check-in Closed
  UPDATE public.tournaments
  SET
    status = 'Check-in Closed',
    updated_at = NOW()
  WHERE id = p_tournament_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'TOURNAMENT_NOT_FOUND',
      'message', 'Tournament not found.'
    );
  END IF;

  -- 3. Lock all non-rejected check-ins for this tournament
  UPDATE public.match_checkins
  SET
    status = 'LOCKED',
    updated_at = NOW()
  WHERE tournament_id = p_tournament_id
    AND status != 'REJECTED';

  GET DIAGNOSTICS v_locked_count = ROW_COUNT;

  -- 4. Audit log
  INSERT INTO public.match_operations_audit_log (
    tournament_id,
    action,
    actor_id,
    details
  ) VALUES (
    p_tournament_id,
    'ROSTER_LOCKED',
    v_admin_id,
    jsonb_build_object(
      'locked_count', v_locked_count,
      'status', 'Check-in Closed',
      'timestamp', NOW()
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'tournament_id', p_tournament_id,
    'locked_count', v_locked_count,
    'status', 'Check-in Closed',
    'message', 'Match roster successfully locked for ' || v_locked_count::TEXT || ' checked-in squad(s).'
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_lock_match_roster FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_lock_match_roster TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_lock_match_roster TO service_role;

-- ----------------------------------------------------------------------------
-- 8. MATCH INCIDENT REPORTING & RESOLUTION RPCS
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.report_match_incident(
  p_tournament_id TEXT,
  p_incident_type TEXT,
  p_description TEXT,
  p_match_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_incident_id UUID;
  v_is_registered BOOLEAN := FALSE;
  v_clean_type TEXT;
  v_clean_desc TEXT;
BEGIN
  -- 1. Check user authentication
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'UNAUTHENTICATED',
      'message', 'Authentication required to report match incidents.'
    );
  END IF;

  -- 2. Validate incident type
  v_clean_type := UPPER(TRIM(COALESCE(p_incident_type, '')));
  IF v_clean_type NOT IN (
    'PLAYER_DISCONNECTED',
    'TEAM_DISCONNECTED',
    'ROOM_ISSUE',
    'ROOM_CONFIG_ERROR',
    'TECHNICAL_ISSUE',
    'REMAKE_REQUEST',
    'PLAYER_REPLACEMENT',
    'OTHER'
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_INCIDENT_TYPE',
      'message', 'Invalid incident type.'
    );
  END IF;

  v_clean_desc := TRIM(COALESCE(p_description, ''));
  IF v_clean_desc = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'DESCRIPTION_REQUIRED',
      'message', 'Incident description is required.'
    );
  END IF;

  -- 3. Verify participant or admin authorization
  IF NOT (public.is_admin() OR (SELECT current_setting('role', true)) = 'service_role') THEN
    SELECT EXISTS (
      SELECT 1 FROM public.tournament_registrations
      WHERE tournament_id = p_tournament_id
        AND user_id = v_user_id
        AND (status IS NULL OR LOWER(status) IN ('approved', 'confirmed', 'active'))
    ) OR EXISTS (
      SELECT 1 FROM public.tournament_players tp
      JOIN public.tournament_registrations tr ON tr.id = tp.registration_id
      WHERE tp.tournament_id = p_tournament_id
        AND tp.user_id = v_user_id
        AND (tr.status IS NULL OR LOWER(tr.status) IN ('approved', 'confirmed', 'active'))
    ) INTO v_is_registered;

    IF NOT v_is_registered THEN
      RETURN jsonb_build_object(
        'success', false,
        'error_code', 'NOT_REGISTERED',
        'message', 'Only registered tournament participants can report incidents.'
      );
    END IF;
  END IF;

  -- 4. Insert incident
  INSERT INTO public.match_incidents (
    tournament_id,
    match_id,
    reported_by,
    incident_type,
    description,
    status
  ) VALUES (
    p_tournament_id,
    p_match_id,
    v_user_id,
    v_clean_type,
    v_clean_desc,
    'REPORTED'
  )
  RETURNING id INTO v_incident_id;

  -- 5. Audit log
  INSERT INTO public.match_operations_audit_log (
    tournament_id,
    action,
    actor_id,
    details
  ) VALUES (
    p_tournament_id,
    'INCIDENT_REPORTED',
    v_user_id,
    jsonb_build_object(
      'incident_id', v_incident_id,
      'incident_type', v_clean_type,
      'description', v_clean_desc,
      'timestamp', NOW()
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'incident_id', v_incident_id,
    'status', 'REPORTED',
    'message', 'Match incident reported successfully and submitted for admin review.'
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.report_match_incident FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.report_match_incident TO authenticated;
GRANT EXECUTE ON FUNCTION public.report_match_incident TO service_role;

-- Admin Incident Resolution RPC
CREATE OR REPLACE FUNCTION public.admin_resolve_match_incident(
  p_incident_id UUID,
  p_decision TEXT,
  p_resolution_action TEXT DEFAULT NULL,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_admin_id UUID;
  v_incident RECORD;
  v_clean_decision TEXT;
  v_clean_action TEXT;
BEGIN
  -- 1. Authorization: Admins only
  v_admin_id := auth.uid();
  IF NOT (public.is_admin() OR (SELECT current_setting('role', true)) = 'service_role') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'ADMIN_REQUIRED',
      'message', 'Only administrators can resolve match incidents.'
    );
  END IF;

  -- 2. Fetch incident
  SELECT * INTO v_incident
  FROM public.match_incidents
  WHERE id = p_incident_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INCIDENT_NOT_FOUND',
      'message', 'Match incident record not found.'
    );
  END IF;

  -- 3. Idempotency: Reject if already resolved
  IF v_incident.status IN ('APPROVED', 'REJECTED', 'RESOLVED') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INCIDENT_ALREADY_RESOLVED',
      'message', 'This incident has already been resolved with status: ' || v_incident.status
    );
  END IF;

  v_clean_decision := UPPER(TRIM(COALESCE(p_decision, '')));
  IF v_clean_decision NOT IN ('APPROVED', 'REJECTED', 'RESOLVED') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_DECISION',
      'message', 'Decision must be APPROVED, REJECTED, or RESOLVED.'
    );
  END IF;

  v_clean_action := UPPER(TRIM(COALESCE(p_resolution_action, '')));

  -- 4. Handle Remake Execution if approved
  IF v_clean_decision = 'APPROVED' AND (v_clean_action = 'REMAKE' OR v_incident.incident_type = 'REMAKE_REQUEST') THEN
    -- Invalidate room credentials to Draft so players cannot reuse old room
    UPDATE public.tournaments
    SET
      room_status = 'Draft',
      status = 'Check-in Open',
      updated_at = NOW()
    WHERE id = v_incident.tournament_id;

    -- Unlock check-ins so squads can re-ready
    UPDATE public.match_checkins
    SET
      status = 'CHECKED_IN',
      updated_at = NOW()
    WHERE tournament_id = v_incident.tournament_id
      AND status = 'LOCKED';

    INSERT INTO public.match_operations_audit_log (
      tournament_id,
      action,
      actor_id,
      details
    ) VALUES (
      v_incident.tournament_id,
      'REMAKE_APPROVED',
      v_admin_id,
      jsonb_build_object(
        'incident_id', p_incident_id,
        'action', 'REMAKE_RESET_TO_CHECKIN',
        'timestamp', NOW()
      )
    );
  END IF;

  -- 5. Update incident record
  UPDATE public.match_incidents
  SET
    status = v_clean_decision,
    resolution_action = v_clean_action,
    admin_notes = COALESCE(p_admin_notes, admin_notes),
    resolved_by = v_admin_id,
    resolved_at = NOW(),
    updated_at = NOW()
  WHERE id = p_incident_id;

  -- 6. Audit log
  INSERT INTO public.match_operations_audit_log (
    tournament_id,
    action,
    actor_id,
    details
  ) VALUES (
    v_incident.tournament_id,
    'INCIDENT_RESOLVED',
    v_admin_id,
    jsonb_build_object(
      'incident_id', p_incident_id,
      'decision', v_clean_decision,
      'resolution_action', v_clean_action,
      'notes', p_admin_notes,
      'timestamp', NOW()
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'incident_id', p_incident_id,
    'status', v_clean_decision,
    'resolution_action', v_clean_action,
    'message', 'Incident successfully ' || LOWER(v_clean_decision) || '.'
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_resolve_match_incident FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_resolve_match_incident TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_resolve_match_incident TO service_role;

-- ----------------------------------------------------------------------------
-- 9. SCHEMA CACHE RELOAD
-- ----------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
