-- ============================================================================
-- MJ ESPORTS — Phase 5.1-D: Team / Squad Payout Identity Binding Fix Migration
-- Target Engine: Supabase PostgreSQL
-- Description: Complete security & data-model remediation for tournament payout queue:
--              1. Owner RBAC: Adds 'owner' role & creates public.is_owner()
--              2. Exclusive Owner Approval Gate: Restricts approve_payout() to public.is_owner()
--              3. Team/Squad Roster Binding: Binds winner to specific registration_id via tournament_players
--              4. Solo Format Enforcement: Strict submitter match for Solo tournaments
--              5. Game UID Cross-Validation: Blocks mismatched user_id / game_uid from rival teams
--              6. Mandatory Winner Requirement: Rejects NULL winner user & game UIDs
--              7. Leading-Rank Extraction: Normalizes "#1 / 48", "1/48", "1 of 48" -> 1
--              8. Cumulative Payout Liability Protection: Prevents sum(payouts) > prize_pool
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. OWNER RBAC FOUNDATION
-- ----------------------------------------------------------------------------

-- 1.1 Update user_roles role check constraint to include 'owner'
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_role_check CHECK (role IN ('owner', 'admin', 'user'));

-- 1.2 Helper function to verify if current session belongs to an owner
DROP FUNCTION IF EXISTS public.is_owner();

CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'owner'
  );
END;
$$;


-- ----------------------------------------------------------------------------
-- 2. SECURE STATE MACHINE & IDENTITY-BOUND RPCs
-- ----------------------------------------------------------------------------

-- 2.1 CREATE PAYOUT QUEUE ENTRY FROM VERIFIED RESULT (PHASE 5.1-D HARDENED)
DROP FUNCTION IF EXISTS public.create_payout_queue_from_verified_result(TEXT, UUID, UUID, TEXT, TEXT, INTEGER, NUMERIC, TEXT);

CREATE OR REPLACE FUNCTION public.create_payout_queue_from_verified_result(
  p_tournament_id TEXT,
  p_source_result_id UUID,
  p_winner_user_id UUID DEFAULT NULL,
  p_winner_game_uid TEXT DEFAULT NULL,
  p_winner_game_ign TEXT DEFAULT NULL,
  p_rank INT DEFAULT 1,
  p_payout_amount NUMERIC DEFAULT 0,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_tourn RECORD;
  v_scorecard RECORD;
  v_prize_pool_num NUMERIC(12, 2);
  v_existing_liability NUMERIC(12, 2);
  v_placement_match TEXT[];
  v_scorecard_placement INT;
  v_generated_idempotency TEXT;
  v_new_payout_id UUID;
  v_is_solo_format BOOLEAN := FALSE;
  v_is_registered_member BOOLEAN := FALSE;
  v_submitter_reg_id UUID;
  v_player_reg_id UUID;
BEGIN
  -- 1. Authorization check: Admin, Owner, or Service Role
  IF NOT (public.is_admin() OR public.is_owner() OR (SELECT current_setting('role', true)) = 'service_role') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'UNAUTHORIZED',
      'message', 'Only administrators or owners can create payout queue proposals.'
    );
  END IF;

  -- 2. MANDATORY SOURCE RESULT REQUIREMENT
  IF p_source_result_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'SOURCE_RESULT_REQUIRED',
      'message', 'A valid source match result ID is required to create a payout proposal.'
    );
  END IF;

  -- 3. MANDATORY WINNER IDENTIFIER REQUIREMENT
  IF p_winner_user_id IS NULL AND (p_winner_game_uid IS NULL OR TRIM(p_winner_game_uid) = '') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'WINNER_IDENTITY_REQUIRED',
      'message', 'A valid winner user ID or Game Character UID is required to assign payout liability.'
    );
  END IF;

  -- 4. Validate input tournament ID
  IF p_tournament_id IS NULL OR TRIM(p_tournament_id) = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_TOURNAMENT',
      'message', 'Tournament ID is required.'
    );
  END IF;

  -- 5. Lock target tournament FOR UPDATE & Verify existence
  SELECT * INTO v_tourn FROM public.tournaments WHERE id = p_tournament_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'TOURNAMENT_NOT_FOUND',
      'message', 'Tournament not found.'
    );
  END IF;

  -- Parse total tournament prize pool
  v_prize_pool_num := COALESCE(
    NULLIF(regexp_replace(COALESCE(v_tourn.prize_pool, '0'), '[^0-9.]', '', 'g'), '')::numeric,
    0.00
  );

  IF v_prize_pool_num <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'PRIZE_CONFIGURATION_UNAVAILABLE',
      'message', 'Tournament prize pool is not configured or unavailable.'
    );
  END IF;

  -- 6. Validate input payout amount
  IF p_payout_amount IS NULL OR p_payout_amount <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_PAYOUT_AMOUNT',
      'message', 'Payout amount must be greater than zero.'
    );
  END IF;

  -- 7. CUMULATIVE PAYOUT LIABILITY PROTECTION
  SELECT COALESCE(SUM(payout_amount), 0.00) INTO v_existing_liability
  FROM public.payout_queue
  WHERE tournament_id = p_tournament_id
    AND status IN ('PENDING_REVIEW', 'AWAITING_OWNER_APPROVAL', 'APPROVED', 'READY_FOR_EXECUTION', 'PROCESSING', 'COMPLETED');

  IF (v_existing_liability + p_payout_amount) > v_prize_pool_num THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'CUMULATIVE_PRIZE_POOL_EXCEEDED',
      'message', 'Requested payout (₹' || p_payout_amount || ') plus existing active liabilities (₹' || v_existing_liability || ') exceeds total tournament prize pool (₹' || v_prize_pool_num || ').'
    );
  END IF;

  -- 8. Fetch & Verify Source Result (match_scorecards)
  SELECT * INTO v_scorecard FROM public.match_scorecards WHERE id = p_source_result_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'SCORECARD_NOT_FOUND',
      'message', 'Match scorecard not found.'
    );
  END IF;

  -- Enforce strictly VERIFIED or PUBLISHED states
  IF v_scorecard.verification_status NOT IN ('VERIFIED', 'PUBLISHED') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'RESULT_NOT_VERIFIED',
      'message', 'Payout can only be created from a VERIFIED or PUBLISHED match scorecard (Current status: ' || v_scorecard.verification_status || ').'
    );
  END IF;

  -- 9. TOURNAMENT RESULT MATCHING ENFORCEMENT
  IF v_scorecard.tournament_id IS DISTINCT FROM p_tournament_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'TOURNAMENT_RESULT_MISMATCH',
      'message', 'Scorecard tournament ID (' || v_scorecard.tournament_id || ') does not match specified target tournament ID (' || p_tournament_id || ').'
    );
  END IF;

  -- 10. FORMAT-AWARE TEAM & ROSTER IDENTITY BINDING
  v_is_solo_format := (LOWER(COALESCE(v_tourn.format, '')) LIKE '%solo%' OR COALESCE(v_tourn.format, '') = '1v1');

  IF v_is_solo_format THEN
    -- SOLO FORMAT RULE: Winner MUST be the exact user who submitted the scorecard
    IF p_winner_user_id IS NOT NULL AND v_scorecard.submitted_by_user_id IS NOT NULL AND p_winner_user_id = v_scorecard.submitted_by_user_id THEN
      v_is_registered_member := TRUE;
    ELSE
      v_is_registered_member := FALSE;
    END IF;
  ELSE
    -- TEAM/SQUAD FORMAT RULE: Winner MUST belong to the exact registration of the scorecard submitter
    IF v_scorecard.submitted_by_user_id IS NOT NULL THEN
      -- Step A: Find the submitter's specific registration_id
      SELECT registration_id INTO v_submitter_reg_id
      FROM public.tournament_players
      WHERE tournament_id = p_tournament_id AND user_id = v_scorecard.submitted_by_user_id
      LIMIT 1;

      IF v_submitter_reg_id IS NULL THEN
        SELECT id INTO v_submitter_reg_id
        FROM public.tournament_registrations
        WHERE tournament_id = p_tournament_id AND user_id = v_scorecard.submitted_by_user_id
        LIMIT 1;
      END IF;

      IF v_submitter_reg_id IS NOT NULL THEN
        -- Step B: Verify winner user_id or game_uid belongs to THAT SPECIFIC registration_id
        IF p_winner_user_id IS NOT NULL THEN
          SELECT registration_id INTO v_player_reg_id
          FROM public.tournament_players
          WHERE tournament_id = p_tournament_id AND user_id = p_winner_user_id
          LIMIT 1;

          IF v_player_reg_id IS NULL THEN
            SELECT id INTO v_player_reg_id
            FROM public.tournament_registrations
            WHERE tournament_id = p_tournament_id AND user_id = p_winner_user_id
            LIMIT 1;
          END IF;

          IF v_player_reg_id = v_submitter_reg_id THEN
            v_is_registered_member := TRUE;
          END IF;
        END IF;

        -- Step C: Verify Game UID against the exact registration if supplied
        IF p_winner_game_uid IS NOT NULL AND TRIM(p_winner_game_uid) != '' THEN
          SELECT EXISTS (
            SELECT 1 FROM public.tournament_players
            WHERE registration_id = v_submitter_reg_id
              AND UPPER(TRIM(game_uid)) = UPPER(TRIM(p_winner_game_uid))
          ) OR EXISTS (
            SELECT 1 FROM public.tournament_registrations
            WHERE id = v_submitter_reg_id
              AND UPPER(TRIM(free_fire_uid)) = UPPER(TRIM(p_winner_game_uid))
          ) INTO v_is_registered_member;
        END IF;
      END IF;
    END IF;
  END IF;

  IF NOT v_is_registered_member THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'WINNER_IDENTITY_UNVERIFIED',
      'message', 'Winner identity does not belong to the verified scorecard submitter or winning squad roster.'
    );
  END IF;

  -- 11. LEADING-RANK PLACEMENT PARSING FIX
  v_placement_match := regexp_match(
    COALESCE(v_scorecard.final_placement, v_scorecard.ocr_placement, ''),
    '^\s*#?\s*(\d+)'
  );

  IF v_placement_match IS NULL OR v_placement_match[1] IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'RESULT_PLACEMENT_UNAVAILABLE',
      'message', 'Verified result does not contain a valid placement rank.'
    );
  END IF;

  v_scorecard_placement := v_placement_match[1]::integer;

  IF p_rank IS NOT NULL AND p_rank != v_scorecard_placement THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'RANK_RESULT_MISMATCH',
      'message', 'Requested rank (#' || p_rank || ') does not match verified scorecard placement (#' || v_scorecard_placement || ').'
    );
  END IF;

  -- 12. IDEMPOTENCY HARDENING (Business Identity Key)
  v_generated_idempotency := 'pay_q_' || p_tournament_id || '_res_' || p_source_result_id::text || '_rank' || p_rank || '_' || COALESCE(p_winner_user_id::text, COALESCE(p_winner_game_uid, 'winner'));

  IF EXISTS (
    SELECT 1 FROM public.payout_queue 
    WHERE idempotency_key = v_generated_idempotency 
       OR (p_idempotency_key IS NOT NULL AND idempotency_key = p_idempotency_key)
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'DUPLICATE_IDEMPOTENCY_KEY',
      'message', 'A payout queue proposal for this tournament result and winner already exists.'
    );
  END IF;

  -- 13. Insert Payout Queue entry in PENDING_REVIEW status
  INSERT INTO public.payout_queue (
    tournament_id,
    source_result_id,
    winner_user_id,
    winner_game_uid,
    winner_game_ign,
    rank,
    payout_amount,
    currency,
    status,
    idempotency_key
  ) VALUES (
    p_tournament_id,
    p_source_result_id,
    p_winner_user_id,
    p_winner_game_uid,
    COALESCE(p_winner_game_ign, 'Winner Player'),
    p_rank,
    p_payout_amount,
    'INR',
    'PENDING_REVIEW',
    v_generated_idempotency
  ) RETURNING id INTO v_new_payout_id;

  RETURN jsonb_build_object(
    'success', true,
    'payout_id', v_new_payout_id,
    'status', 'PENDING_REVIEW',
    'idempotency_key', v_generated_idempotency,
    'message', 'Payout queue proposal created successfully.'
  );
END;
$$;


-- 2.2 REQUEST PAYOUT APPROVAL
DROP FUNCTION IF EXISTS public.request_payout_approval(UUID);

CREATE OR REPLACE FUNCTION public.request_payout_approval(
  p_payout_queue_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_payout RECORD;
  v_approval_req_id UUID;
BEGIN
  -- 1. Auth check: Admin or Owner
  v_user_id := auth.uid();
  IF NOT (public.is_admin() OR public.is_owner()) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'UNAUTHORIZED',
      'message', 'Only administrators or owners can request owner approval.'
    );
  END IF;

  -- 2. Lock payout queue row FOR UPDATE
  SELECT * INTO v_payout
  FROM public.payout_queue
  WHERE id = p_payout_queue_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'PAYOUT_NOT_FOUND',
      'message', 'Payout queue entry not found.'
    );
  END IF;

  IF v_payout.status != 'PENDING_REVIEW' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_STATE_TRANSITION',
      'message', 'Payout is not in PENDING_REVIEW state (Current status: ' || v_payout.status || ').'
    );
  END IF;

  -- 3. Create payout approval request record with DB-derived auth.uid()
  INSERT INTO public.payout_approval_requests (
    payout_queue_id,
    requested_by,
    status
  ) VALUES (
    p_payout_queue_id,
    v_user_id,
    'PENDING'
  ) RETURNING id INTO v_approval_req_id;

  -- 4. Update payout queue status to AWAITING_OWNER_APPROVAL
  UPDATE public.payout_queue
  SET 
    status = 'AWAITING_OWNER_APPROVAL',
    approval_request_id = v_approval_req_id,
    updated_at = NOW()
  WHERE id = p_payout_queue_id;

  RETURN jsonb_build_object(
    'success', true,
    'payout_id', p_payout_queue_id,
    'approval_request_id', v_approval_req_id,
    'status', 'AWAITING_OWNER_APPROVAL',
    'message', 'Owner approval requested successfully. Payout amount is now immutable.'
  );
END;
$$;


-- 2.3 APPROVE PAYOUT (EXCLUSIVE OWNER ROLE REQUIRED)
DROP FUNCTION IF EXISTS public.approve_payout(UUID, UUID);

CREATE OR REPLACE FUNCTION public.approve_payout(
  p_payout_queue_id UUID,
  p_approval_request_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_payout RECORD;
  v_updated_rows INT;
BEGIN
  -- 1. EXCLUSIVE OWNER AUTHORIZATION CHECK
  v_user_id := auth.uid();
  IF NOT (public.is_owner() OR (SELECT current_setting('role', true)) = 'service_role') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'UNAUTHORIZED_OWNER_REQUIRED',
      'message', 'Only platform owners can execute final payout approval.'
    );
  END IF;

  -- 2. Lock payout queue row FOR UPDATE
  SELECT * INTO v_payout
  FROM public.payout_queue
  WHERE id = p_payout_queue_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'PAYOUT_NOT_FOUND',
      'message', 'Payout queue entry not found.'
    );
  END IF;

  IF v_payout.status != 'AWAITING_OWNER_APPROVAL' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_STATE_TRANSITION',
      'message', 'Payout must be in AWAITING_OWNER_APPROVAL state to be approved (Current status: ' || v_payout.status || ').'
    );
  END IF;

  -- 3. Atomic State Update: Advance to APPROVED & READY_FOR_EXECUTION
  -- Note: Does NOT move money. Does NOT call wallet deposit/credit RPCs.
  UPDATE public.payout_queue
  SET 
    status = 'READY_FOR_EXECUTION',
    approved_by = v_user_id,
    approved_at = NOW(),
    updated_at = NOW()
  WHERE id = p_payout_queue_id
    AND status = 'AWAITING_OWNER_APPROVAL';

  GET DIAGNOSTICS v_updated_rows = ROW_COUNT;
  IF v_updated_rows = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'CONCURRENCY_ERROR',
      'message', 'Concurrent modification detected. Approval aborted.'
    );
  END IF;

  -- 4. Update associated approval request record with DB-derived auth.uid() & NOW()
  IF p_approval_request_id IS NOT NULL OR v_payout.approval_request_id IS NOT NULL THEN
    UPDATE public.payout_approval_requests
    SET 
      status = 'APPROVED',
      approved_by = v_user_id,
      approved_at = NOW(),
      updated_at = NOW()
    WHERE id = COALESCE(p_approval_request_id, v_payout.approval_request_id);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'payout_id', p_payout_queue_id,
    'status', 'READY_FOR_EXECUTION',
    'approved_by', v_user_id,
    'approved_at', NOW(),
    'message', 'Payout approved by owner successfully. Status set to READY_FOR_EXECUTION (No money moved).'
  );
END;
$$;


-- 2.4 REJECT PAYOUT
DROP FUNCTION IF EXISTS public.reject_payout(UUID, TEXT);

CREATE OR REPLACE FUNCTION public.reject_payout(
  p_payout_queue_id UUID,
  p_rejection_reason TEXT DEFAULT 'Rejected by platform owner during review.'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_payout RECORD;
BEGIN
  -- 1. Auth check: Owner or Admin
  v_user_id := auth.uid();
  IF NOT (public.is_owner() OR public.is_admin()) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'UNAUTHORIZED',
      'message', 'Only administrators or owners can reject payout proposals.'
    );
  END IF;

  -- 2. Lock payout queue row FOR UPDATE
  SELECT * INTO v_payout
  FROM public.payout_queue
  WHERE id = p_payout_queue_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'PAYOUT_NOT_FOUND',
      'message', 'Payout queue entry not found.'
    );
  END IF;

  IF v_payout.status IN ('COMPLETED', 'CANCELLED') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'ALREADY_FINALIZED',
      'message', 'Finalized payouts cannot be rejected.'
    );
  END IF;

  -- 3. Update payout queue status to CANCELLED
  UPDATE public.payout_queue
  SET 
    status = 'CANCELLED',
    failure_reason = p_rejection_reason,
    updated_at = NOW()
  WHERE id = p_payout_queue_id;

  -- 4. Update approval request record with DB-derived auth.uid() & NOW()
  IF v_payout.approval_request_id IS NOT NULL THEN
    UPDATE public.payout_approval_requests
    SET 
      status = 'REJECTED',
      rejected_by = v_user_id,
      rejected_at = NOW(),
      rejection_reason = p_rejection_reason,
      updated_at = NOW()
    WHERE id = v_payout.approval_request_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'payout_id', p_payout_queue_id,
    'status', 'CANCELLED',
    'message', 'Payout proposal rejected and cancelled successfully.'
  );
END;
$$;


-- ----------------------------------------------------------------------------
-- 3. PERMISSION GRANTS
-- ----------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.is_owner FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_payout_queue_from_verified_result FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.request_payout_approval FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.approve_payout FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reject_payout FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.is_owner TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_payout_queue_from_verified_result TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.request_payout_approval TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.approve_payout TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reject_payout TO authenticated, service_role;
