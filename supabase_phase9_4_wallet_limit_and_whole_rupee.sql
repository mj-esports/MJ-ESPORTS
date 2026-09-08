-- ============================================================================
-- MJ ESPORTS — Phase 9.4: Strict ₹200 Wallet Balance Limit & Whole-Rupee Only
-- Target Engine: Supabase PostgreSQL
-- Description:
--   1. Authoritative Wallet Balance Rule:
--      - 0.00 <= public.wallets.balance <= 200.00
--      - ₹200.00 is the absolute maximum wallet balance.
--      - Balance must always be an integer number of whole rupees (balance = TRUNC(balance)).
--   2. Whole-Rupee-Only Rule:
--      - ALL wallet monetary amounts must be whole INR amounts (integers).
--      - Strict rejection of all decimal/paise amounts (no rounding permitted).
--   3. Database-Level Check Constraints:
--      - public.wallets: chk_wallet_max_balance_200 and chk_wallet_whole_rupee.
--      - public.wallet_topups: updated amount check (1.00 to 200.00) and whole-rupee check.
--   4. Row-Locked Atomic Credit Enforcement:
--      - Upgrades public.record_wallet_ledger_entry to enforce whole rupees and ₹200 ceiling.
--      - Upgrades public.settle_wallet_topup to perform atomic pre-settlement wallet ceiling check.
--   5. Full Ledger & Idempotency Integrity:
--      - Rejections cause ZERO balance mutations, ZERO CREDIT ledger entries,
--        and prevent top-ups from transitioning to COMPLETED.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. DATABASE INVARIANTS ON PUBLIC.WALLETS
-- ----------------------------------------------------------------------------

DO $$
BEGIN
  -- 1.1 Maximum balance constraint: 0.00 <= balance <= 200.00
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_wallet_max_balance_200'
  ) THEN
    ALTER TABLE public.wallets
      ADD CONSTRAINT chk_wallet_max_balance_200 CHECK (balance >= 0.00 AND balance <= 200.00);
  END IF;

  -- 1.2 Whole-rupee constraint: balance has 0 paise / decimal fraction
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_wallet_whole_rupee'
  ) THEN
    ALTER TABLE public.wallets
      ADD CONSTRAINT chk_wallet_whole_rupee CHECK (balance = TRUNC(balance));
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 2. DATABASE INVARIANTS ON PUBLIC.WALLET_TOPUPS
-- ----------------------------------------------------------------------------

DO $$
BEGIN
  -- 2.1 Drop legacy amount check (10.00 <= amount <= 10000.00) if present
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'wallet_topups_amount_check'
  ) THEN
    ALTER TABLE public.wallet_topups DROP CONSTRAINT wallet_topups_amount_check;
  END IF;

  -- 2.2 Add Phase 9.4 top-up amount bounds: 1.00 <= amount <= 200.00
  ALTER TABLE public.wallet_topups
    ADD CONSTRAINT wallet_topups_amount_check CHECK (amount >= 1.00 AND amount <= 200.00);

  -- 2.3 Add Whole-rupee check on top-up amount
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'wallet_topups_whole_rupee'
  ) THEN
    ALTER TABLE public.wallet_topups
      ADD CONSTRAINT wallet_topups_whole_rupee CHECK (amount = TRUNC(amount));
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 3. UPGRADE RPC: public.record_wallet_ledger_entry(...)
-- Authoritative gatekeeper for ALL wallet ledger transitions
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.record_wallet_ledger_entry(
  p_user_id UUID,
  p_transaction_type TEXT,
  p_direction TEXT,
  p_amount NUMERIC,
  p_source_reference_type TEXT DEFAULT NULL,
  p_source_reference_id TEXT DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL,
  p_description TEXT DEFAULT 'Wallet Ledger Entry',
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id UUID;
  v_wallet_id UUID;
  v_current_balance NUMERIC(12, 2);
  v_clean_amount NUMERIC(12, 2);
  v_balance_before NUMERIC(12, 2);
  v_balance_after NUMERIC(12, 2);
  v_direction TEXT;
  v_tx_id UUID;
  v_existing_ledger RECORD;
  v_is_authorized BOOLEAN := FALSE;
BEGIN
  -- 1. Authorization Boundary:
  -- Only service_role or admin callers can invoke ledger transitions directly.
  IF (SELECT current_setting('role', true)) = 'service_role' OR public.is_admin() THEN
    v_is_authorized := TRUE;
  END IF;

  IF NOT v_is_authorized THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'UNAUTHORIZED',
      'message', 'Direct execution of wallet ledger entry is restricted to administrators and system service role.'
    );
  END IF;

  -- 2. Validate input parameters
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_USER',
      'message', 'User ID is required.'
    );
  END IF;

  IF p_transaction_type NOT IN (
    'DEPOSIT',
    'WITHDRAWAL',
    'PRIZE_CREDIT',
    'ENTRY_FEE_DEBIT',
    'REFUND',
    'BONUS_CREDIT',
    'ADJUSTMENT'
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_TRANSACTION_TYPE',
      'message', 'Invalid transaction type specified.'
    );
  END IF;

  v_direction := UPPER(TRIM(p_direction));
  IF v_direction NOT IN ('CREDIT', 'DEBIT') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_DIRECTION',
      'message', 'Transaction direction must be either CREDIT or DEBIT.'
    );
  END IF;

  IF p_amount IS NULL OR p_amount <= 0.00 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_AMOUNT',
      'message', 'Transaction amount must be strictly greater than 0.'
    );
  END IF;

  -- 2.1 PHASE 9.4 WHOLE-RUPEE ENFORCEMENT
  -- Reject any decimal/paise value immediately without rounding.
  IF p_amount != TRUNC(p_amount) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'DECIMAL_AMOUNT_REJECTED',
      'amount', p_amount,
      'message', 'Decimal/paise amounts are not permitted. Wallet amounts must be whole INR rupees only.'
    );
  END IF;

  -- 2.2 PHASE 9.4 TRANSACTION BOUNDS
  IF p_amount < 1.00 OR p_amount > 200.00 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_AMOUNT',
      'amount', p_amount,
      'message', 'Transaction amount must be between ₹1 and ₹200.'
    );
  END IF;

  v_clean_amount := TRUNC(p_amount::NUMERIC);

  -- 3. Idempotency Check: Prevent duplicate balance modification
  IF p_idempotency_key IS NOT NULL AND TRIM(p_idempotency_key) != '' THEN
    SELECT id, balance_before, balance_after, amount, direction, transaction_type, created_at
    INTO v_existing_ledger
    FROM public.wallet_ledger
    WHERE idempotency_key = TRIM(p_idempotency_key);

    IF FOUND THEN
      RETURN jsonb_build_object(
        'success', true,
        'idempotent_replay', true,
        'transaction_id', v_existing_ledger.id,
        'balance_before', v_existing_ledger.balance_before,
        'balance_after', v_existing_ledger.balance_after,
        'amount', v_existing_ledger.amount,
        'direction', v_existing_ledger.direction,
        'message', 'Operation already processed (idempotent replay).'
      );
    END IF;
  END IF;

  -- 4. Lock Wallet Row FOR UPDATE to guarantee atomic consistency & prevent race conditions
  SELECT id, balance INTO v_wallet_id, v_current_balance
  FROM public.wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  -- If wallet does not exist, create it with 0.00 balance
  IF NOT FOUND THEN
    INSERT INTO public.wallets (user_id, balance, currency, created_at, updated_at)
    VALUES (p_user_id, 0.00, 'INR', NOW(), NOW())
    ON CONFLICT (user_id) DO NOTHING;

    SELECT id, balance INTO v_wallet_id, v_current_balance
    FROM public.wallets
    WHERE user_id = p_user_id
    FOR UPDATE;
  END IF;

  v_balance_before := v_current_balance;

  -- 5. Calculate new balance & check invariants
  IF v_direction = 'CREDIT' THEN
    -- PHASE 9.4 MAXIMUM ₹200 WALLET BALANCE CEILING ENFORCEMENT
    IF (v_balance_before + v_clean_amount) > 200.00 THEN
      RETURN jsonb_build_object(
        'success', false,
        'error_code', 'WALLET_LIMIT_EXCEEDED',
        'current_balance', v_balance_before,
        'requested_credit', v_clean_amount,
        'maximum_allowed_credit', GREATEST(0.00, 200.00 - v_balance_before),
        'message', 'Transaction rejected: wallet balance cannot exceed ₹200.00.'
      );
    END IF;

    v_balance_after := v_balance_before + v_clean_amount;
  ELSE -- DEBIT
    IF v_balance_before < v_clean_amount THEN
      RETURN jsonb_build_object(
        'success', false,
        'error_code', 'INSUFFICIENT_FUNDS',
        'current_balance', v_balance_before,
        'required_amount', v_clean_amount,
        'message', 'Insufficient wallet balance to complete this debit.'
      );
    END IF;
    v_balance_after := v_balance_before - v_clean_amount;
  END IF;

  -- 6. Atomically update wallet balance
  UPDATE public.wallets
  SET
    balance = v_balance_after,
    updated_at = NOW()
  WHERE id = v_wallet_id;

  -- 7. Insert immutable ledger entry (with concurrent unique violation guard)
  BEGIN
    INSERT INTO public.wallet_ledger (
      wallet_id,
      user_id,
      transaction_type,
      direction,
      amount,
      balance_before,
      balance_after,
      source_reference_type,
      source_reference_id,
      idempotency_key,
      description,
      metadata,
      created_at
    ) VALUES (
      v_wallet_id,
      p_user_id,
      p_transaction_type,
      v_direction,
      v_clean_amount,
      v_balance_before,
      v_balance_after,
      p_source_reference_type,
      p_source_reference_id,
      CASE WHEN p_idempotency_key IS NOT NULL AND TRIM(p_idempotency_key) != '' THEN TRIM(p_idempotency_key) ELSE NULL END,
      COALESCE(TRIM(p_description), 'Wallet Ledger Entry'),
      COALESCE(p_metadata, '{}'::jsonb),
      NOW()
    ) RETURNING id INTO v_tx_id;
  EXCEPTION
    WHEN unique_violation THEN
      IF p_idempotency_key IS NOT NULL AND TRIM(p_idempotency_key) != '' THEN
        SELECT id, balance_before, balance_after, amount, direction, transaction_type, created_at
        INTO v_existing_ledger
        FROM public.wallet_ledger
        WHERE idempotency_key = TRIM(p_idempotency_key);

        IF FOUND THEN
          RETURN jsonb_build_object(
            'success', true,
            'idempotent_replay', true,
            'transaction_id', v_existing_ledger.id,
            'balance_before', v_existing_ledger.balance_before,
            'balance_after', v_existing_ledger.balance_after,
            'amount', v_existing_ledger.amount,
            'direction', v_existing_ledger.direction,
            'message', 'Operation already processed (idempotent replay).'
          );
        END IF;
      END IF;
      RAISE;
  END;

  -- 8. Return atomic transaction confirmation
  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_tx_id,
    'balance_before', v_balance_before,
    'balance_after', v_balance_after,
    'amount', v_clean_amount,
    'direction', v_direction,
    'message', 'Wallet ledger entry recorded successfully.'
  );
END;
$$;

-- Privileges for record_wallet_ledger_entry
REVOKE EXECUTE ON FUNCTION public.record_wallet_ledger_entry(
  UUID, TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT, TEXT, JSONB
) FROM PUBLIC;

REVOKE EXECUTE ON FUNCTION public.record_wallet_ledger_entry(
  UUID, TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT, TEXT, JSONB
) FROM anon;

GRANT EXECUTE ON FUNCTION public.record_wallet_ledger_entry(
  UUID, TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT, TEXT, JSONB
) TO authenticated;

GRANT EXECUTE ON FUNCTION public.record_wallet_ledger_entry(
  UUID, TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT, TEXT, JSONB
) TO service_role;

-- ----------------------------------------------------------------------------
-- 4. UPGRADE RPC: public.settle_wallet_topup(...)
-- Atomic Razorpay settlement with row-level wallet lock & ₹200 ceiling check
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
  v_wallet RECORD;
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

  -- 4. Lock the wallet_topups row FOR UPDATE
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

  -- 7. PHASE 9.4 PRE-SETTLEMENT ATOMIC INVARIANT CHECKS
  -- Lock user's wallet row FOR UPDATE
  SELECT id, balance INTO v_wallet
  FROM public.wallets
  WHERE id = v_topup.wallet_id AND user_id = v_topup.user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'WALLET_NOT_FOUND',
      'message', 'Associated wallet record not found.'
    );
  END IF;

  -- Whole-rupee validation on top-up amount
  IF v_topup.amount != TRUNC(v_topup.amount) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'DECIMAL_AMOUNT_REJECTED',
      'amount', v_topup.amount,
      'message', 'Top-up amount must be a whole rupee amount. Decimal values rejected.'
    );
  END IF;

  -- ₹200 Maximum balance ceiling validation
  IF (v_wallet.balance + v_topup.amount) > 200.00 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'WALLET_LIMIT_EXCEEDED',
      'current_balance', v_wallet.balance,
      'topup_amount', v_topup.amount,
      'maximum_allowed_credit', GREATEST(0.00, 200.00 - v_wallet.balance),
      'message', 'Settlement rejected: resulting wallet balance would exceed ₹200.00.'
    );
  END IF;

  -- 8. Execute Atomic Wallet Credit & Immutable Ledger Insertion
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

  -- 9. Mark top-up record as COMPLETED
  UPDATE public.wallet_topups
  SET
    status = 'COMPLETED',
    razorpay_payment_id = v_clean_payment_id,
    razorpay_signature = v_clean_signature,
    completed_at = NOW(),
    updated_at = NOW()
  WHERE id = v_topup.id;

  -- 10. Return atomic settlement confirmation
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

-- Privileges for settle_wallet_topup
REVOKE EXECUTE ON FUNCTION public.settle_wallet_topup(UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.settle_wallet_topup(UUID, TEXT, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.settle_wallet_topup(UUID, TEXT, TEXT) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.settle_wallet_topup(UUID, TEXT, TEXT) TO service_role;
