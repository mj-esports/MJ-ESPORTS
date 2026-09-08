-- ============================================================================
-- MJ ESPORTS — Phase 9.2: Wallet Add Money (Top-Up) Migration
-- Target Engine: Supabase PostgreSQL
-- Description:
--   1. Creates public.wallet_topups table for Razorpay deposit tracking.
--      - Anti-cascade ON DELETE RESTRICT foreign keys.
--      - Composite FK (wallet_id, user_id) references public.wallets(id, user_id).
--      - Unique client idempotency key per user: UNIQUE (user_id, client_idempotency_key).
--      - Strict amount boundary: 10.00 <= amount <= 10000.00 INR.
--      - Unique Razorpay order and payment IDs.
--   2. Enforces Row-Level Security (RLS):
--      - Authenticated users can SELECT only their own topups.
--      - Direct client INSERT/UPDATE/DELETE revoked from anon, authenticated, PUBLIC.
--      - Service role holds full operational privileges.
--   3. Creates atomic settlement RPC: public.settle_wallet_topup(...)
--      - SECURITY DEFINER with safe explicit search_path.
--      - Restricted strictly to service_role (revoked from PUBLIC, anon, authenticated).
--      - Locks wallet_topups row FOR UPDATE.
--      - Prevents duplicate credit and enforces strict state machine.
--      - Atomically updates wallets.balance and inserts into public.wallet_ledger.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. CREATE PUBLIC.WALLET_TOPUPS TABLE
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.wallet_topups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  wallet_id UUID NOT NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 10.00 AND amount <= 10000.00),
  currency TEXT NOT NULL DEFAULT 'INR' CHECK (currency = 'INR'),
  client_idempotency_key TEXT NOT NULL,
  razorpay_order_id TEXT NOT NULL UNIQUE,
  razorpay_payment_id TEXT UNIQUE DEFAULT NULL,
  razorpay_signature TEXT DEFAULT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ DEFAULT NULL,

  -- Foreign Key: Prevent cascade deletion of financial audit records
  CONSTRAINT fk_wallet_topups_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE RESTRICT,
  -- Composite Integrity: Guarantees wallet_id strictly belongs to user_id
  CONSTRAINT fk_wallet_topups_wallet_user FOREIGN KEY (wallet_id, user_id) REFERENCES public.wallets(id, user_id) ON DELETE RESTRICT,
  -- Request Idempotency: Exactly one top-up order attempt per client key per user
  CONSTRAINT uq_wallet_topups_user_client_key UNIQUE (user_id, client_idempotency_key),
  -- Unique Payment ID: A Razorpay payment can never be associated with two top-ups
  CONSTRAINT uq_wallet_topups_payment_id UNIQUE (razorpay_payment_id)
);

-- Indices for rapid lookup and high-concurrency queries
CREATE INDEX IF NOT EXISTS idx_wallet_topups_user_id ON public.wallet_topups(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_topups_order_id ON public.wallet_topups(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_wallet_topups_payment_id ON public.wallet_topups(razorpay_payment_id) WHERE razorpay_payment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wallet_topups_status ON public.wallet_topups(status);
CREATE INDEX IF NOT EXISTS idx_wallet_topups_created_at ON public.wallet_topups(created_at DESC);

-- ----------------------------------------------------------------------------
-- 2. ROW LEVEL SECURITY (RLS) & PRIVILEGE ENFORCEMENT
-- ----------------------------------------------------------------------------

ALTER TABLE public.wallet_topups ENABLE ROW LEVEL SECURITY;

-- 2.1 SELECT Policy: Users read own topups or Admin reads all
DROP POLICY IF EXISTS "Users read own topups or admin reads all" ON public.wallet_topups;
CREATE POLICY "Users read own topups or admin reads all"
  ON public.wallet_topups FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

-- 2.2 Revoke direct client writes (Zero direct INSERT/UPDATE/DELETE from client)
REVOKE INSERT, UPDATE, DELETE ON public.wallet_topups FROM anon, authenticated, PUBLIC;

-- 2.3 Grant explicit read privileges to authenticated and full access to service_role
GRANT SELECT ON public.wallet_topups TO authenticated;
GRANT ALL ON public.wallet_topups TO service_role;

-- ----------------------------------------------------------------------------
-- 3. ATOMIC SETTLEMENT RPC: public.settle_wallet_topup(...)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.settle_wallet_topup(
  p_topup_id UUID,
  p_razorpay_payment_id TEXT,
  p_razorpay_signature TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_topup RECORD;
  v_clean_payment_id TEXT;
  v_clean_signature TEXT;
  v_ledger_res JSONB;
BEGIN
  -- 1. Security Boundary: Restrict execution strictly to service_role
  IF (SELECT current_setting('role', true)) != 'service_role' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'UNAUTHORIZED',
      'message', 'settle_wallet_topup can only be executed by service_role.'
    );
  END IF;

  -- 2. Validate input parameters
  IF p_topup_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_PARAMETERS',
      'message', 'Top-up ID is required.'
    );
  END IF;

  v_clean_payment_id := TRIM(p_razorpay_payment_id);
  IF v_clean_payment_id IS NULL OR v_clean_payment_id = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_PAYMENT_ID',
      'message', 'Valid Razorpay payment ID is required.'
    );
  END IF;

  v_clean_signature := TRIM(p_razorpay_signature);
  IF v_clean_signature IS NULL OR v_clean_signature = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_SIGNATURE',
      'message', 'Valid Razorpay signature is required.'
    );
  END IF;

  -- 3. Check Global Payment Uniqueness: Ensure payment_id is not already tied to another top-up
  IF EXISTS (
    SELECT 1 FROM public.wallet_topups 
    WHERE razorpay_payment_id = v_clean_payment_id AND id != p_topup_id
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'PAYMENT_ALREADY_USED',
      'message', 'This Razorpay payment ID has already been credited to another top-up.'
    );
  END IF;

  -- 4. Lock the wallet_topups row FOR UPDATE to prevent concurrent race conditions
  SELECT id, user_id, wallet_id, amount, currency, status, razorpay_order_id, razorpay_payment_id
  INTO v_topup
  FROM public.wallet_topups
  WHERE id = p_topup_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'TOPUP_NOT_FOUND',
      'message', 'Top-up record not found.'
    );
  END IF;

  -- 5. Idempotency Check: If already COMPLETED with same payment_id, return idempotent success
  IF v_topup.status = 'COMPLETED' THEN
    IF v_topup.razorpay_payment_id = v_clean_payment_id THEN
      RETURN jsonb_build_object(
        'success', true,
        'already_settled', true,
        'topup_id', v_topup.id,
        'amount', v_topup.amount,
        'wallet_id', v_topup.wallet_id,
        'message', 'Top-up was already settled successfully (idempotent replay).'
      );
    ELSE
      RETURN jsonb_build_object(
        'success', false,
        'error_code', 'PAYMENT_MISMATCH',
        'message', 'Top-up already completed with a different payment ID.'
      );
    END IF;
  END IF;

  -- 6. Strict State Machine: Only PENDING top-ups can transition to COMPLETED
  IF v_topup.status != 'PENDING' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_TOPUP_STATE',
      'current_status', v_topup.status,
      'message', 'Cannot settle top-up that is not in PENDING state.'
    );
  END IF;

  -- 7. Execute Atomic Wallet Credit & Immutable Ledger Insertion
  -- Notice: Amount, user_id, and wallet_id are read exclusively from the database row
  v_ledger_res := public.record_wallet_ledger_entry(
    v_topup.user_id,
    'DEPOSIT',
    'CREDIT',
    v_topup.amount,
    'WALLET_TOPUP',
    v_topup.id::text,
    v_clean_payment_id, -- Used as ledger idempotency key
    'Instant Wallet Top-up via Razorpay',
    jsonb_build_object(
      'razorpay_order_id', v_topup.razorpay_order_id,
      'razorpay_payment_id', v_clean_payment_id,
      'currency', v_topup.currency
    )
  );

  IF NOT (v_ledger_res->>'success')::boolean THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', COALESCE(v_ledger_res->>'error_code', 'LEDGER_SETTLEMENT_FAILED'),
      'message', COALESCE(v_ledger_res->>'message', 'Failed to credit wallet ledger.')
    );
  END IF;

  -- 8. Mark top-up record as COMPLETED
  UPDATE public.wallet_topups
  SET
    status = 'COMPLETED',
    razorpay_payment_id = v_clean_payment_id,
    razorpay_signature = v_clean_signature,
    completed_at = NOW(),
    updated_at = NOW()
  WHERE id = v_topup.id;

  -- 9. Return atomic settlement confirmation
  RETURN jsonb_build_object(
    'success', true,
    'topup_id', v_topup.id,
    'wallet_id', v_topup.wallet_id,
    'amount', v_topup.amount,
    'balance_after', v_ledger_res->'balance_after',
    'transaction_id', v_ledger_res->'transaction_id',
    'message', 'Wallet top-up settled successfully.'
  );
END;
$$;

-- Privileges: REVOKE completely from PUBLIC, anon, and authenticated; GRANT strictly to service_role
REVOKE EXECUTE ON FUNCTION public.settle_wallet_topup(UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.settle_wallet_topup(UUID, TEXT, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.settle_wallet_topup(UUID, TEXT, TEXT) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.settle_wallet_topup(UUID, TEXT, TEXT) TO service_role;
