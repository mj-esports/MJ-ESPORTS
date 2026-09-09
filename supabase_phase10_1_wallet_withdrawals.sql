-- ============================================================================
-- MJ ESPORTS — Phase 10.1: Secure Wallet Withdrawal Foundation
-- Target Engine: Supabase PostgreSQL
-- Description:
--   1. Authoritative Business Model:
--      - Manual Withdrawal Flow: Player Request -> PENDING -> Admin Review -> APPROVED or REJECTED
--      - If APPROVED: Admin executes payment externally -> Admin records UTR/payment reference -> PAID.
--      - If REJECTED: Reserved funds are returned atomically to player's authoritative wallet.
--   2. Atomic Reservation / Debit:
--      - When withdrawal is created (PENDING), funds are debited ATOMICALLY from public.wallets.balance.
--      - Creates single immutable public.wallet_ledger entry (transaction_type = 'WITHDRAWAL', direction = 'DEBIT').
--      - Row-level locking (SELECT ... FOR UPDATE) prevents race conditions and overdrafts.
--   3. Strict Status Machine:
--      - Initial status: PENDING.
--      - Allowed transitions: PENDING -> APPROVED, PENDING -> REJECTED, APPROVED -> PAID.
--      - Forbidden transitions: REJECTED -> PAID, REJECTED -> APPROVED, PAID -> any, APPROVED -> REJECTED.
--      - Approval and Paid transitions NEVER debit the wallet a second time.
--   4. Rejection & Funds Release:
--      - Rejection atomically credits public.wallets.balance and inserts a CREDIT ledger entry
--        (transaction_type = 'WITHDRAWAL_REVERSED', direction = 'CREDIT').
--      - Original debit ledger entry remains 100% immutable.
--   5. Idempotency & Security:
--      - Mandatory unique idempotency_key prevents duplicate requests, debits, or ledger entries.
--      - Cross-user key isolation prevents cross-tenant data exposure.
--      - SECURITY DEFINER RPCs with search_path = public, pg_temp.
--      - Execution of admin RPCs restricted strictly to public.is_admin() and service_role.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. UPDATE WALLET LEDGER TRANSACTION TYPE CONSTRAINT
-- Add 'WITHDRAWAL_REVERSED' to supported transaction types
-- ----------------------------------------------------------------------------

DO $$
BEGIN
  -- Drop existing transaction_type check constraint if present
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'wallet_ledger_transaction_type_check'
  ) THEN
    ALTER TABLE public.wallet_ledger DROP CONSTRAINT wallet_ledger_transaction_type_check;
  END IF;

  -- Re-add constraint with WITHDRAWAL_REVERSED included
  ALTER TABLE public.wallet_ledger
    ADD CONSTRAINT wallet_ledger_transaction_type_check CHECK (
      transaction_type IN (
        'DEPOSIT',
        'WITHDRAWAL',
        'WITHDRAWAL_REVERSED',
        'PRIZE_CREDIT',
        'ENTRY_FEE_DEBIT',
        'REFUND',
        'BONUS_CREDIT',
        'ADJUSTMENT'
      )
    );
END $$;

-- ----------------------------------------------------------------------------
-- 2. CREATE PUBLIC.WALLET_WITHDRAWALS TABLE
-- Dedicated authoritative storage for player withdrawal requests and lifecycle state
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.wallet_withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  amount NUMERIC(12, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'PAID')),
  payout_method TEXT NOT NULL DEFAULT 'UPI' CHECK (payout_method IN ('UPI', 'BANK_TRANSFER')),
  payout_details JSONB NOT NULL DEFAULT '{}'::jsonb,
  payment_reference TEXT DEFAULT NULL,
  admin_notes TEXT DEFAULT NULL,
  rejection_reason TEXT DEFAULT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  wallet_ledger_id UUID REFERENCES public.wallet_ledger(id) ON DELETE RESTRICT,
  reversal_ledger_id UUID REFERENCES public.wallet_ledger(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ DEFAULT NULL,
  approved_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
  paid_at TIMESTAMPTZ DEFAULT NULL,
  paid_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
  rejected_at TIMESTAMPTZ DEFAULT NULL,
  rejected_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT,

  -- Constraints
  CONSTRAINT chk_wallet_withdrawals_amount CHECK (amount >= 1.00 AND amount = TRUNC(amount) AND amount <= 500000.00),
  CONSTRAINT chk_wallet_withdrawals_paid_ref CHECK (
    (status = 'PAID' AND payment_reference IS NOT NULL AND TRIM(payment_reference) != '')
    OR (status != 'PAID')
  ),
  CONSTRAINT chk_wallet_withdrawals_rejected_reason CHECK (
    (status = 'REJECTED' AND (
      (rejection_reason IS NOT NULL AND TRIM(rejection_reason) != '') OR
      (admin_notes IS NOT NULL AND TRIM(admin_notes) != '')
    ))
    OR (status != 'REJECTED')
  )
);

-- Performance & Audit Indexes
CREATE INDEX IF NOT EXISTS idx_wallet_withdrawals_user_id ON public.wallet_withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_withdrawals_status ON public.wallet_withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_wallet_withdrawals_created_at ON public.wallet_withdrawals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_withdrawals_wallet_ledger_id ON public.wallet_withdrawals(wallet_ledger_id);
CREATE INDEX IF NOT EXISTS idx_wallet_withdrawals_reversal_ledger_id ON public.wallet_withdrawals(reversal_ledger_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_wallet_withdrawals_idempotency ON public.wallet_withdrawals(idempotency_key);

-- ----------------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY (RLS) POLICIES & PERMISSIONS
-- ----------------------------------------------------------------------------

ALTER TABLE public.wallet_withdrawals ENABLE ROW LEVEL SECURITY;

-- 3.1 RLS: Authenticated players read own withdrawals; Admins read all
DROP POLICY IF EXISTS "Users view own withdrawals or admins view all" ON public.wallet_withdrawals;
CREATE POLICY "Users view own withdrawals or admins view all"
  ON public.wallet_withdrawals
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR (SELECT public.is_admin())
  );

-- 3.2 Revoke direct client write privileges (All mutations through secure RPCs)
REVOKE ALL ON TABLE public.wallet_withdrawals FROM PUBLIC;
REVOKE ALL ON TABLE public.wallet_withdrawals FROM anon;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.wallet_withdrawals FROM authenticated;
GRANT SELECT ON TABLE public.wallet_withdrawals TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 4. RPC 1: REQUEST WALLET WITHDRAWAL (Player-Initiated, Atomic Reservation)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.request_wallet_withdrawal(
  p_amount NUMERIC,
  p_payout_details JSONB DEFAULT '{}'::jsonb,
  p_payout_method TEXT DEFAULT 'UPI',
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_clean_amount NUMERIC(12, 2);
  v_clean_method TEXT;
  v_clean_details JSONB;
  v_idempotency_key TEXT;
  v_existing_withdrawal RECORD;
  v_wallet_id UUID;
  v_current_balance NUMERIC(12, 2);
  v_balance_before NUMERIC(12, 2);
  v_balance_after NUMERIC(12, 2);
  v_ledger_id UUID;
  v_withdrawal_id UUID;
BEGIN
  -- 1. Derive user identity from secure session context
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'UNAUTHENTICATED',
      'message', 'You must be logged in to request a withdrawal.'
    );
  END IF;

  -- 2. Validate Amount
  IF p_amount IS NULL OR p_amount <= 0.00 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_AMOUNT',
      'message', 'Withdrawal amount must be strictly greater than 0.'
    );
  END IF;

  -- 2.1 Whole-rupee check
  IF p_amount != TRUNC(p_amount) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'DECIMAL_AMOUNT_REJECTED',
      'amount', p_amount,
      'message', 'Decimal/paise amounts are not permitted. Withdrawals must be whole INR rupees only.'
    );
  END IF;

  v_clean_amount := TRUNC(p_amount::NUMERIC);

  -- 2.2 Bounds check (Minimum ₹1, Technical ceiling ₹500,000)
  IF v_clean_amount < 1.00 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'MINIMUM_AMOUNT_REQUIRED',
      'amount', v_clean_amount,
      'message', 'Minimum withdrawal amount is ₹1.'
    );
  END IF;

  IF v_clean_amount > 500000.00 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'AMOUNT_EXCEEDS_MAXIMUM',
      'amount', v_clean_amount,
      'message', 'Withdrawal amount exceeds safety maximum of ₹500,000.'
    );
  END IF;

  -- 3. Validate Payout Method & Details
  v_clean_method := UPPER(TRIM(COALESCE(p_payout_method, 'UPI')));
  IF v_clean_method NOT IN ('UPI', 'BANK_TRANSFER') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_PAYOUT_METHOD',
      'payout_method', p_payout_method,
      'message', 'Supported payout methods are UPI or BANK_TRANSFER.'
    );
  END IF;

  v_clean_details := COALESCE(p_payout_details, '{}'::jsonb);

  -- 4. Idempotency Handling
  IF p_idempotency_key IS NOT NULL AND TRIM(p_idempotency_key) != '' THEN
    v_idempotency_key := TRIM(p_idempotency_key);
    
    SELECT id, user_id, amount, status, payout_method, payment_reference, created_at
    INTO v_existing_withdrawal
    FROM public.wallet_withdrawals
    WHERE idempotency_key = v_idempotency_key;

    IF FOUND THEN
      -- Cross-user key isolation: reject if the key belongs to another user
      IF v_existing_withdrawal.user_id != v_user_id THEN
        RETURN jsonb_build_object(
          'success', false,
          'error_code', 'IDEMPOTENCY_KEY_REUSED_CROSS_USER',
          'message', 'This idempotency key has already been used by another account.'
        );
      END IF;

      -- Idempotent replay for same user: return existing withdrawal without re-debiting
      RETURN jsonb_build_object(
        'success', true,
        'idempotent_replay', true,
        'withdrawal_id', v_existing_withdrawal.id,
        'status', v_existing_withdrawal.status,
        'amount', v_existing_withdrawal.amount,
        'payout_method', v_existing_withdrawal.payout_method,
        'created_at', v_existing_withdrawal.created_at,
        'message', 'Withdrawal request already submitted (idempotent replay).'
      );
    END IF;
  ELSE
    v_idempotency_key := gen_random_uuid()::TEXT;
  END IF;

  -- 5. Atomic Wallet Row Lock (FOR UPDATE)
  SELECT id, balance INTO v_wallet_id, v_current_balance
  FROM public.wallets
  WHERE user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'WALLET_NOT_FOUND',
      'message', 'User wallet not found.'
    );
  END IF;

  v_balance_before := v_current_balance;

  -- 6. Check Balance Sufficiency
  IF v_balance_before < v_clean_amount THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INSUFFICIENT_FUNDS',
      'current_balance', v_balance_before,
      'requested_amount', v_clean_amount,
      'message', 'Insufficient wallet balance for this withdrawal.'
    );
  END IF;

  v_balance_after := v_balance_before - v_clean_amount;

  -- 7. Pre-generate withdrawal ID for bi-directional reference linking
  v_withdrawal_id := gen_random_uuid();

  -- 8. Debit Wallet Balance
  UPDATE public.wallets
  SET
    balance = v_balance_after,
    updated_at = NOW()
  WHERE id = v_wallet_id;

  -- 9. Insert Immutable Wallet Ledger Entry (DEBIT)
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
    v_user_id,
    'WITHDRAWAL',
    'DEBIT',
    v_clean_amount,
    v_balance_before,
    v_balance_after,
    'wallet_withdrawals',
    v_withdrawal_id::TEXT,
    'withdrawal_debit_' || v_idempotency_key,
    'Wallet Withdrawal Request (' || v_clean_method || ')',
    jsonb_build_object(
      'withdrawal_id', v_withdrawal_id,
      'payout_method', v_clean_method,
      'payout_details', v_clean_details
    ),
    NOW()
  ) RETURNING id INTO v_ledger_id;

  -- 10. Insert Withdrawal Record (status: PENDING)
  INSERT INTO public.wallet_withdrawals (
    id,
    user_id,
    amount,
    currency,
    status,
    payout_method,
    payout_details,
    idempotency_key,
    wallet_ledger_id,
    created_at,
    updated_at
  ) VALUES (
    v_withdrawal_id,
    v_user_id,
    v_clean_amount,
    'INR',
    'PENDING',
    v_clean_method,
    v_clean_details,
    v_idempotency_key,
    v_ledger_id,
    NOW(),
    NOW()
  );

  RETURN jsonb_build_object(
    'success', true,
    'withdrawal_id', v_withdrawal_id,
    'status', 'PENDING',
    'amount', v_clean_amount,
    'balance_before', v_balance_before,
    'balance_after', v_balance_after,
    'ledger_id', v_ledger_id,
    'message', 'Withdrawal request submitted successfully. Amount reserved.'
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- 5. RPC 2: ADMIN APPROVE WITHDRAWAL (Admin-Only, State Transition)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_approve_withdrawal(
  p_withdrawal_id UUID,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id UUID;
  v_withdrawal RECORD;
BEGIN
  -- 1. Authorization: strictly administrators or service_role
  IF NOT (public.is_admin() OR (SELECT current_setting('role', true)) = 'service_role') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'UNAUTHORIZED',
      'message', 'Only administrators can approve withdrawal requests.'
    );
  END IF;

  v_caller_id := auth.uid();

  IF p_withdrawal_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_WITHDRAWAL_ID',
      'message', 'Withdrawal ID is required.'
    );
  END IF;

  -- 2. Lock Withdrawal Row FOR UPDATE
  SELECT id, user_id, amount, status, payout_method, admin_notes, approved_at
  INTO v_withdrawal
  FROM public.wallet_withdrawals
  WHERE id = p_withdrawal_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'WITHDRAWAL_NOT_FOUND',
      'message', 'Withdrawal request does not exist.'
    );
  END IF;

  -- 3. Idempotent check: If already APPROVED, return success without changes
  IF v_withdrawal.status = 'APPROVED' THEN
    RETURN jsonb_build_object(
      'success', true,
      'idempotent_replay', true,
      'withdrawal_id', v_withdrawal.id,
      'status', 'APPROVED',
      'approved_at', v_withdrawal.approved_at,
      'message', 'Withdrawal request is already approved (idempotent replay).'
    );
  END IF;

  -- 4. Enforce Status Machine Invariants
  -- Only PENDING can transition to APPROVED
  IF v_withdrawal.status != 'PENDING' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_STATUS_TRANSITION',
      'current_status', v_withdrawal.status,
      'message', 'Cannot approve withdrawal with status ' || v_withdrawal.status || '. Only PENDING withdrawals can be approved.'
    );
  END IF;

  -- 5. Transition to APPROVED (Zero balance mutation, wallet already reserved)
  UPDATE public.wallet_withdrawals
  SET
    status = 'APPROVED',
    approved_at = NOW(),
    approved_by = v_caller_id,
    admin_notes = COALESCE(NULLIF(TRIM(p_admin_notes), ''), admin_notes),
    updated_at = NOW()
  WHERE id = p_withdrawal_id;

  RETURN jsonb_build_object(
    'success', true,
    'withdrawal_id', p_withdrawal_id,
    'status', 'APPROVED',
    'amount', v_withdrawal.amount,
    'message', 'Withdrawal request approved successfully. Ready for payout.'
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- 6. RPC 3: ADMIN REJECT WITHDRAWAL (Admin-Only, Atomic Refund / Release)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_reject_withdrawal(
  p_withdrawal_id UUID,
  p_rejection_reason TEXT,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id UUID;
  v_withdrawal RECORD;
  v_wallet_id UUID;
  v_current_balance NUMERIC(12, 2);
  v_balance_before NUMERIC(12, 2);
  v_balance_after NUMERIC(12, 2);
  v_reversal_ledger_id UUID;
  v_rejection_key TEXT;
  v_clean_reason TEXT;
BEGIN
  -- 1. Authorization: strictly administrators or service_role
  IF NOT (public.is_admin() OR (SELECT current_setting('role', true)) = 'service_role') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'UNAUTHORIZED',
      'message', 'Only administrators can reject withdrawal requests.'
    );
  END IF;

  v_caller_id := auth.uid();

  IF p_withdrawal_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_WITHDRAWAL_ID',
      'message', 'Withdrawal ID is required.'
    );
  END IF;

  v_clean_reason := TRIM(COALESCE(p_rejection_reason, ''));
  IF v_clean_reason = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'REJECTION_REASON_REQUIRED',
      'message', 'Rejection reason is required.'
    );
  END IF;

  -- 2. Lock Withdrawal Row FOR UPDATE
  SELECT id, user_id, amount, status, rejection_reason, rejected_at, reversal_ledger_id
  INTO v_withdrawal
  FROM public.wallet_withdrawals
  WHERE id = p_withdrawal_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'WITHDRAWAL_NOT_FOUND',
      'message', 'Withdrawal request does not exist.'
    );
  END IF;

  -- 3. Idempotent check: If already REJECTED, return success without double-crediting
  IF v_withdrawal.status = 'REJECTED' THEN
    RETURN jsonb_build_object(
      'success', true,
      'idempotent_replay', true,
      'withdrawal_id', v_withdrawal.id,
      'status', 'REJECTED',
      'rejected_at', v_withdrawal.rejected_at,
      'reversal_ledger_id', v_withdrawal.reversal_ledger_id,
      'message', 'Withdrawal request is already rejected (idempotent replay).'
    );
  END IF;

  -- 4. Enforce Status Machine Invariants
  -- Only PENDING withdrawals can be rejected
  IF v_withdrawal.status != 'PENDING' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_STATUS_TRANSITION',
      'current_status', v_withdrawal.status,
      'message', 'Cannot reject withdrawal with status ' || v_withdrawal.status || '. Only PENDING withdrawals can be rejected.'
    );
  END IF;

  -- 5. Lock User's Wallet FOR UPDATE
  SELECT id, balance INTO v_wallet_id, v_current_balance
  FROM public.wallets
  WHERE user_id = v_withdrawal.user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'WALLET_NOT_FOUND',
      'message', 'Target user wallet not found.'
    );
  END IF;

  v_balance_before := v_current_balance;
  v_balance_after := v_balance_before + v_withdrawal.amount;

  v_rejection_key := COALESCE(NULLIF(TRIM(p_idempotency_key), ''), 'withdrawal_reversal_' || p_withdrawal_id::TEXT);

  -- 6. Credit Returned Amount Back to Wallet
  UPDATE public.wallets
  SET
    balance = v_balance_after,
    updated_at = NOW()
  WHERE id = v_wallet_id;

  -- 7. Insert Reversal Immutable Ledger Entry (CREDIT)
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
    v_withdrawal.user_id,
    'WITHDRAWAL_REVERSED',
    'CREDIT',
    v_withdrawal.amount,
    v_balance_before,
    v_balance_after,
    'wallet_withdrawals',
    p_withdrawal_id::TEXT,
    v_rejection_key,
    'Withdrawal Request Rejected — Funds Returned to Wallet',
    jsonb_build_object(
      'withdrawal_id', p_withdrawal_id,
      'rejection_reason', v_clean_reason,
      'rejected_by', v_caller_id
    ),
    NOW()
  ) RETURNING id INTO v_reversal_ledger_id;

  -- 8. Update Withdrawal Record (status: REJECTED)
  UPDATE public.wallet_withdrawals
  SET
    status = 'REJECTED',
    rejection_reason = v_clean_reason,
    rejected_at = NOW(),
    rejected_by = v_caller_id,
    reversal_ledger_id = v_reversal_ledger_id,
    updated_at = NOW()
  WHERE id = p_withdrawal_id;

  RETURN jsonb_build_object(
    'success', true,
    'withdrawal_id', p_withdrawal_id,
    'status', 'REJECTED',
    'amount_refunded', v_withdrawal.amount,
    'balance_before', v_balance_before,
    'balance_after', v_balance_after,
    'reversal_ledger_id', v_reversal_ledger_id,
    'message', 'Withdrawal rejected and reserved funds returned to user wallet.'
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- 7. RPC 4: ADMIN MARK WITHDRAWAL PAID (Admin-Only, Record UTR & Finalize)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_mark_withdrawal_paid(
  p_withdrawal_id UUID,
  p_payment_reference TEXT,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id UUID;
  v_withdrawal RECORD;
  v_clean_ref TEXT;
BEGIN
  -- 1. Authorization: strictly administrators or service_role
  IF NOT (public.is_admin() OR (SELECT current_setting('role', true)) = 'service_role') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'UNAUTHORIZED',
      'message', 'Only administrators can record payout confirmations.'
    );
  END IF;

  v_caller_id := auth.uid();

  IF p_withdrawal_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_WITHDRAWAL_ID',
      'message', 'Withdrawal ID is required.'
    );
  END IF;

  v_clean_ref := TRIM(COALESCE(p_payment_reference, ''));
  IF v_clean_ref = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'PAYMENT_REFERENCE_REQUIRED',
      'message', 'Payment reference / UTR is required to mark withdrawal as PAID.'
    );
  END IF;

  -- 2. Lock Withdrawal Row FOR UPDATE
  SELECT id, user_id, amount, status, payment_reference, paid_at
  INTO v_withdrawal
  FROM public.wallet_withdrawals
  WHERE id = p_withdrawal_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'WITHDRAWAL_NOT_FOUND',
      'message', 'Withdrawal request does not exist.'
    );
  END IF;

  -- 3. Idempotent check: If already PAID with identical reference, return success
  IF v_withdrawal.status = 'PAID' THEN
    IF v_withdrawal.payment_reference = v_clean_ref THEN
      RETURN jsonb_build_object(
        'success', true,
        'idempotent_replay', true,
        'withdrawal_id', v_withdrawal.id,
        'status', 'PAID',
        'payment_reference', v_withdrawal.payment_reference,
        'paid_at', v_withdrawal.paid_at,
        'message', 'Withdrawal is already marked as PAID (idempotent replay).'
      );
    ELSE
      RETURN jsonb_build_object(
        'success', false,
        'error_code', 'ALREADY_PAID_DIFFERENT_REFERENCE',
        'existing_reference', v_withdrawal.payment_reference,
        'message', 'Withdrawal is already marked as PAID with another reference.'
      );
    END IF;
  END IF;

  -- 4. Enforce Status Machine Invariants
  -- Only APPROVED withdrawals can be marked PAID
  IF v_withdrawal.status != 'APPROVED' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_STATUS_TRANSITION',
      'current_status', v_withdrawal.status,
      'message', 'Cannot mark withdrawal as PAID when status is ' || v_withdrawal.status || '. Withdrawal must be in APPROVED status.'
    );
  END IF;

  -- 5. Mark PAID (Zero balance mutation, wallet was debited at reservation)
  UPDATE public.wallet_withdrawals
  SET
    status = 'PAID',
    payment_reference = v_clean_ref,
    paid_at = NOW(),
    paid_by = v_caller_id,
    admin_notes = COALESCE(NULLIF(TRIM(p_admin_notes), ''), admin_notes),
    updated_at = NOW()
  WHERE id = p_withdrawal_id;

  RETURN jsonb_build_object(
    'success', true,
    'withdrawal_id', p_withdrawal_id,
    'status', 'PAID',
    'amount', v_withdrawal.amount,
    'payment_reference', v_clean_ref,
    'message', 'Withdrawal marked as PAID successfully.'
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- 8. REVOKE & GRANT RPC PRIVILEGES (Least-Privilege Enforcement)
-- ----------------------------------------------------------------------------

-- Revoke from PUBLIC and anon
REVOKE EXECUTE ON FUNCTION public.request_wallet_withdrawal(NUMERIC, JSONB, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_approve_withdrawal(UUID, TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_reject_withdrawal(UUID, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_mark_withdrawal_paid(UUID, TEXT, TEXT) FROM PUBLIC, anon;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.request_wallet_withdrawal(NUMERIC, JSONB, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_approve_withdrawal(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_reject_withdrawal(UUID, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_mark_withdrawal_paid(UUID, TEXT, TEXT) TO authenticated, service_role;
