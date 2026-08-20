-- ============================================================================
-- MJ ESPORTS — Phase 5.1: Tournament Payout Queue & Owner Approval Infrastructure Migration
-- Target Engine: Supabase PostgreSQL
-- Description: Creates public.payout_queue & public.payout_approval_requests tables,
--              unique idempotency key index, RLS policies, and SECURITY DEFINER RPCs:
--              - create_payout_queue_from_verified_result
--              - request_payout_approval
--              - approve_payout (advances state to READY_FOR_EXECUTION only)
--              - reject_payout
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. PAYOUT QUEUE TABLE SETUP
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payout_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id TEXT NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  source_result_id UUID REFERENCES public.match_scorecards(id) ON DELETE SET NULL,
  winner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  winner_game_uid TEXT,
  winner_game_ign TEXT NOT NULL,
  rank INTEGER NOT NULL DEFAULT 1 CHECK (rank > 0),
  payout_amount NUMERIC(12, 2) NOT NULL CHECK (payout_amount > 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'PENDING_REVIEW' CHECK (
    status IN (
      'PENDING_REVIEW',
      'AWAITING_OWNER_APPROVAL',
      'APPROVED',
      'READY_FOR_EXECUTION',
      'PROCESSING',
      'COMPLETED',
      'FAILED',
      'CANCELLED'
    )
  ),
  idempotency_key TEXT NOT NULL UNIQUE,
  approval_request_id UUID,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for payout queue
CREATE INDEX IF NOT EXISTS idx_payout_queue_tournament ON public.payout_queue(tournament_id);
CREATE INDEX IF NOT EXISTS idx_payout_queue_status ON public.payout_queue(status);
CREATE INDEX IF NOT EXISTS idx_payout_queue_winner ON public.payout_queue(winner_user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_payout_queue_idempotency ON public.payout_queue(idempotency_key);


-- ----------------------------------------------------------------------------
-- 2. PAYOUT APPROVAL REQUESTS TABLE SETUP
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payout_approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_queue_id UUID NOT NULL REFERENCES public.payout_queue(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (
    status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for payout approval requests
CREATE INDEX IF NOT EXISTS idx_payout_approval_queue_id ON public.payout_approval_requests(payout_queue_id);
CREATE INDEX IF NOT EXISTS idx_payout_approval_status ON public.payout_approval_requests(status);


-- Add foreign key constraint for approval_request_id in payout_queue safely
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_payout_queue_approval_request'
  ) THEN
    ALTER TABLE public.payout_queue
      ADD CONSTRAINT fk_payout_queue_approval_request
      FOREIGN KEY (approval_request_id)
      REFERENCES public.payout_approval_requests(id)
      ON DELETE SET NULL;
  END IF;
END $$;


-- ----------------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY (RLS) & PRIVILEGES
-- ----------------------------------------------------------------------------
ALTER TABLE public.payout_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_approval_requests ENABLE ROW LEVEL SECURITY;

-- SELECT Policies: Admins view all, players view their own payout queue items
DROP POLICY IF EXISTS "Admins read all payout queue or winner reads own" ON public.payout_queue;
CREATE POLICY "Admins read all payout queue or winner reads own"
  ON public.payout_queue FOR SELECT
  USING (public.is_admin() OR auth.uid() = winner_user_id);

DROP POLICY IF EXISTS "Admins read all payout approval requests" ON public.payout_approval_requests;
CREATE POLICY "Admins read all payout approval requests"
  ON public.payout_approval_requests FOR SELECT
  USING (public.is_admin());

-- Revoke direct write access (INSERT, UPDATE, DELETE) from anon, authenticated, public
REVOKE INSERT, UPDATE, DELETE ON public.payout_queue FROM anon, authenticated, public;
REVOKE INSERT, UPDATE, DELETE ON public.payout_approval_requests FROM anon, authenticated, public;


-- ----------------------------------------------------------------------------
-- 4. SECURE STATE MACHINE RPCs
-- ----------------------------------------------------------------------------

-- 4.1 CREATE PAYOUT QUEUE ENTRY FROM VERIFIED RESULT
DROP FUNCTION IF EXISTS public.create_payout_queue_from_verified_result(TEXT, UUID, UUID, TEXT, TEXT, INTEGER, NUMERIC, TEXT);

CREATE OR REPLACE FUNCTION public.create_payout_queue_from_verified_result(
  p_tournament_id TEXT,
  p_source_result_id UUID,
  p_winner_user_id UUID,
  p_winner_game_uid TEXT,
  p_winner_game_ign TEXT,
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
  v_generated_idempotency TEXT;
  v_new_payout_id UUID;
BEGIN
  -- 1. Authorization check: Admin or Service Role
  IF NOT (public.is_admin() OR (SELECT current_setting('role', true)) = 'service_role') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'UNAUTHORIZED',
      'message', 'Only administrators can create payout queue proposals.'
    );
  END IF;

  -- 2. Validate input parameters
  IF p_tournament_id IS NULL OR TRIM(p_tournament_id) = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_TOURNAMENT',
      'message', 'Tournament ID is required.'
    );
  END IF;

  IF p_payout_amount IS NULL OR p_payout_amount <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_AMOUNT',
      'message', 'Payout amount must be greater than zero.'
    );
  END IF;

  -- 3. Verify tournament existence
  SELECT * INTO v_tourn FROM public.tournaments WHERE id = p_tournament_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'TOURNAMENT_NOT_FOUND',
      'message', 'Tournament not found.'
    );
  END IF;

  -- 4. Result Verification Guard (if source_result_id provided)
  IF p_source_result_id IS NOT NULL THEN
    SELECT * INTO v_scorecard FROM public.match_scorecards WHERE id = p_source_result_id;
    IF FOUND AND v_scorecard.verification_status NOT IN ('VERIFIED', 'PUBLISHED') THEN
      RETURN jsonb_build_object(
        'success', false,
        'error_code', 'RESULT_NOT_VERIFIED',
        'message', 'Payout can only be created from a VERIFIED or PUBLISHED match scorecard.'
      );
    END IF;
  END IF;

  -- 5. Construct & Verify Idempotency Key
  v_generated_idempotency := COALESCE(
    p_idempotency_key,
    'pay_q_' || p_tournament_id || '_rank' || p_rank || '_' || COALESCE(p_winner_game_uid, COALESCE(p_winner_user_id::text, MD5(p_winner_game_ign)))
  );

  IF EXISTS (
    SELECT 1 FROM public.payout_queue WHERE idempotency_key = v_generated_idempotency
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'DUPLICATE_IDEMPOTENCY_KEY',
      'message', 'A payout queue entry with this idempotency key already exists.'
    );
  END IF;

  -- 6. Insert new Payout Queue item in PENDING_REVIEW status
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
    COALESCE(p_rank, 1),
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


-- 4.2 REQUEST OWNER APPROVAL FOR PAYOUT QUEUE ENTRY
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
  -- 1. Auth check
  v_user_id := auth.uid();
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'UNAUTHORIZED',
      'message', 'Only administrators can request owner approval.'
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

  -- 3. Create payout approval request record
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
    'message', 'Owner approval requested successfully.'
  );
END;
$$;


-- 4.3 APPROVE PAYOUT QUEUE ENTRY (Advances to READY_FOR_EXECUTION ONLY)
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
  -- 1. Auth check
  v_user_id := auth.uid();
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'UNAUTHORIZED',
      'message', 'Only authorized administrators/owners can approve payouts.'
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

  -- 4. Update associated approval request record if present
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
    'message', 'Payout approved successfully. Payout status set to READY_FOR_EXECUTION (Real-money execution disabled).'
  );
END;
$$;


-- 4.4 REJECT PAYOUT QUEUE ENTRY
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
  -- 1. Auth check
  v_user_id := auth.uid();
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'UNAUTHORIZED',
      'message', 'Only authorized administrators/owners can reject payouts.'
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

  -- 3. Update payout queue status to CANCELLED with failure reason
  UPDATE public.payout_queue
  SET 
    status = 'CANCELLED',
    failure_reason = p_rejection_reason,
    updated_at = NOW()
  WHERE id = p_payout_queue_id;

  -- 4. Update approval request record if present
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
-- 5. RPC PERMISSION GRANTS
-- ----------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.create_payout_queue_from_verified_result FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.request_payout_approval FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.approve_payout FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reject_payout FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.create_payout_queue_from_verified_result TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.request_payout_approval TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.approve_payout TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reject_payout TO authenticated, service_role;
