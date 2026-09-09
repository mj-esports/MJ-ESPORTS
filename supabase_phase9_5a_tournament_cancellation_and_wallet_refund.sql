-- ============================================================================
-- MJ ESPORTS — Phase 9.5A: Tournament Cancellation & Authoritative Wallet Refund
-- Target Engine: Supabase PostgreSQL
-- Description:
--   1. Authoritative Business Rule:
--      - When a paid tournament is cancelled, players who actually paid the entry fee
--        receive a 100% full refund into their authoritative MJ ESPORTS wallet.
--      - NO Razorpay gateway refunds are issued. Original payments remain historical evidence.
--      - Original tournament_payments records remain CONSUMED (never mislabeled as REFUNDED).
--      - Refund is executed via an immutable wallet_ledger entry (transaction_type = 'REFUND', direction = 'CREDIT').
--      - Authoritative tracking table public.tournament_refunds enforces exact-once refund semantics.
--   2. Wallet Ceiling Removal:
--      - Drops chk_wallet_max_balance_200 (minimum ₹0, whole-rupee only, NO upper limit).
--      - Upgrades record_wallet_ledger_entry to support amounts and balances > ₹200.
--   3. Idempotent & Concurrency-Safe:
--      - Transactional advisory lock on tournament_id.
--      - Row-level lock FOR UPDATE on tournaments and wallets.
--      - Database constraint prevents duplicate refunds for the same registration.
--   4. Strict Security:
--      - SECURITY DEFINER RPC with search_path = public, pg_temp.
--      - Restricted to administrators (public.is_admin()) and service_role.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. REMOVE ₹200 WALLET BALANCE CEILING (RETAIN WHOLE-RUPEE & NON-NEGATIVE)
-- ----------------------------------------------------------------------------

DO $$
BEGIN
  -- Drop balance <= 200 constraint if present
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_wallet_max_balance_200'
  ) THEN
    ALTER TABLE public.wallets DROP CONSTRAINT chk_wallet_max_balance_200;
  END IF;

  -- Ensure non-negative balance constraint is active
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_wallet_non_negative_balance'
  ) THEN
    ALTER TABLE public.wallets
      ADD CONSTRAINT chk_wallet_non_negative_balance CHECK (balance >= 0.00);
  END IF;

  -- Ensure whole-rupee constraint is active
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_wallet_whole_rupee'
  ) THEN
    ALTER TABLE public.wallets
      ADD CONSTRAINT chk_wallet_whole_rupee CHECK (balance = TRUNC(balance));
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 2. CREATE PUBLIC.TOURNAMENT_REFUNDS TABLE
-- Authoritative tracking and idempotency anchor for tournament cancellation refunds
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.tournament_refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id TEXT NOT NULL REFERENCES public.tournaments(id) ON DELETE RESTRICT,
  registration_id UUID NOT NULL REFERENCES public.tournament_registrations(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0 AND amount = TRUNC(amount)),
  currency TEXT NOT NULL DEFAULT 'INR',
  payment_method TEXT NOT NULL CHECK (payment_method IN ('WALLET', 'RAZORPAY')),
  original_payment_reference TEXT NOT NULL,
  wallet_ledger_id UUID REFERENCES public.wallet_ledger(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED')),
  reason TEXT NOT NULL DEFAULT 'Tournament Cancelled by Organizer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_tournament_refund_registration UNIQUE (tournament_id, registration_id)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_tournament_refunds_tournament_id ON public.tournament_refunds(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_refunds_user_id ON public.tournament_refunds(user_id);
CREATE INDEX IF NOT EXISTS idx_tournament_refunds_registration_id ON public.tournament_refunds(registration_id);
CREATE INDEX IF NOT EXISTS idx_tournament_refunds_wallet_ledger_id ON public.tournament_refunds(wallet_ledger_id);

-- Enable RLS
ALTER TABLE public.tournament_refunds ENABLE ROW LEVEL SECURITY;

-- RLS: Users can view their own refunds, admins view all
DROP POLICY IF EXISTS "Users read own tournament refunds or admins read all" ON public.tournament_refunds;
CREATE POLICY "Users read own tournament refunds or admins read all"
  ON public.tournament_refunds
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR (SELECT public.is_admin())
  );

-- Direct client modifications are strictly prohibited
REVOKE ALL ON TABLE public.tournament_refunds FROM PUBLIC;
REVOKE ALL ON TABLE public.tournament_refunds FROM anon;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.tournament_refunds FROM authenticated;
GRANT SELECT ON TABLE public.tournament_refunds TO authenticated;
GRANT ALL ON TABLE public.tournament_refunds TO service_role;

-- ----------------------------------------------------------------------------
-- 3. UPGRADE RPC: public.record_wallet_ledger_entry(...)
-- Authoritative financial ledger gatekeeper (Whole-rupee, No upper limit)
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

  -- 2.1 WHOLE-RUPEE ENFORCEMENT
  -- Reject any decimal/paise value immediately without rounding.
  IF p_amount != TRUNC(p_amount) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'DECIMAL_AMOUNT_REJECTED',
      'amount', p_amount,
      'message', 'Decimal/paise amounts are not permitted. Wallet amounts must be whole INR rupees only.'
    );
  END IF;

  -- 2.2 TRANSACTION BOUNDS (Minimum ₹1, NO upper ceiling)
  IF p_amount < 1.00 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_AMOUNT',
      'amount', p_amount,
      'message', 'Transaction amount must be at least ₹1.'
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

  -- 4. Lock Wallet Row FOR UPDATE to guarantee atomic consistency
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

  -- 7. Insert immutable ledger entry
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
-- 4. CREATE ATOMIC RPC: public.cancel_tournament_and_refund(...)
-- Atomically cancels tournament, discovers paid registrations, and credits wallets
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.cancel_tournament_and_refund(
  p_tournament_id TEXT,
  p_reason TEXT DEFAULT 'Tournament Cancelled by Organizer'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_tournament RECORD;
  v_reg RECORD;
  v_wallet_id UUID;
  v_current_balance NUMERIC(12, 2);
  v_balance_before NUMERIC(12, 2);
  v_balance_after NUMERIC(12, 2);
  v_refund_amount NUMERIC(12, 2);
  v_payment_method TEXT;
  v_orig_pay_id TEXT;
  v_ledger_id UUID;
  v_refunded_count INT := 0;
  v_skipped_count INT := 0;
  v_total_refunded NUMERIC(12, 2) := 0.00;
  v_clean_reason TEXT;
  v_raw_digits TEXT;
  v_parsed_fee NUMERIC(12, 2);
BEGIN
  -- 1. Security Check: Restrict execution strictly to administrators or service_role
  IF NOT (public.is_admin() OR (SELECT current_setting('role', true)) = 'service_role') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'UNAUTHORIZED',
      'message', 'Only administrators can cancel tournaments and issue refunds.'
    );
  END IF;

  IF p_tournament_id IS NULL OR TRIM(p_tournament_id) = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_TOURNAMENT_ID',
      'message', 'Tournament ID is required.'
    );
  END IF;

  v_clean_reason := COALESCE(NULLIF(TRIM(p_reason), ''), 'Tournament Cancelled by Organizer');

  -- 2. Concurrency Serialization: Acquire transactional advisory lock on tournament_id
  PERFORM pg_advisory_xact_lock(hashtext('cancel_tournament_' || TRIM(p_tournament_id)));

  -- 3. Lock Tournament Row FOR UPDATE
  SELECT id, title, status, entry_fee
  INTO v_tournament
  FROM public.tournaments
  WHERE id = TRIM(p_tournament_id)
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'TOURNAMENT_NOT_FOUND',
      'message', 'Tournament does not exist.'
    );
  END IF;

  -- 4. Terminal Lifecycle Guard
  -- Completed or Results Pending tournaments cannot be cancelled
  IF v_tournament.status IN ('Completed', 'Results Pending') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'CANNOT_CANCEL_COMPLETED_TOURNAMENT',
      'current_status', v_tournament.status,
      'message', 'Cannot cancel a tournament that has already completed or has results pending.'
    );
  END IF;

  -- 5. Parse fallback entry fee from tournament record
  v_raw_digits := REGEXP_REPLACE(COALESCE(v_tournament.entry_fee, '0'), '[^0-9.]', '', 'g');
  IF v_raw_digits = '' OR v_raw_digits = '.' THEN
    v_parsed_fee := 0.00;
  ELSE
    BEGIN
      v_parsed_fee := TRUNC(v_raw_digits::NUMERIC(12, 2));
    EXCEPTION WHEN OTHERS THEN
      v_parsed_fee := 0.00;
    END;
  END IF;

  -- 6. Discover and Process All Eligible Paid Registrations
  -- CORRECTION 1: Eligibility is determined strictly by payment evidence, NOT status = 'Approved'
  -- Unpaid, free, or pending orders that never completed are excluded.
  FOR v_reg IN
    SELECT
      tr.id AS registration_id,
      tr.user_id,
      tr.team_name,
      tr.payment_status,
      tr.payment_id,
      tr.status AS registration_status,
      -- Evidence A: Confirmed Razorpay Payment record
      tp.id AS razorpay_payment_db_id,
      tp.razorpay_payment_id,
      tp.amount AS razorpay_amount,
      -- Evidence B: Confirmed Wallet ENTRY_FEE_DEBIT Ledger Entry
      wl.id AS wallet_ledger_db_id,
      wl.amount AS wallet_amount
    FROM public.tournament_registrations tr
    LEFT JOIN public.tournament_payments tp
      ON tp.registration_id = tr.id
     AND tp.status = 'CONSUMED'
     AND tp.amount > 0
    LEFT JOIN public.wallet_ledger wl
      ON wl.transaction_type = 'ENTRY_FEE_DEBIT'
     AND wl.direction = 'DEBIT'
     AND wl.source_reference_id = TRIM(p_tournament_id)
     AND (
       wl.metadata->>'registration_id' = tr.id::TEXT
       OR wl.id::TEXT = tr.payment_id
       OR wl.idempotency_key = tr.transaction_id
     )
    WHERE tr.tournament_id = TRIM(p_tournament_id)
      -- Exclude free entries
      AND COALESCE(tr.payment_status, '') != 'Free'
      AND COALESCE(tr.payment_id, '') != 'FREE_ENTRY'
      -- Exclude registrations that already received an authoritative refund
      AND NOT EXISTS (
        SELECT 1 FROM public.tournament_refunds ref
        WHERE ref.tournament_id = TRIM(p_tournament_id)
          AND ref.registration_id = tr.id
          AND ref.status = 'COMPLETED'
      )
      -- Payment evidence check
      AND (
        tp.id IS NOT NULL
        OR wl.id IS NOT NULL
        OR (tr.payment_status = 'Paid' AND tr.payment_id IS NOT NULL AND tr.user_id IS NOT NULL)
      )
    ORDER BY tr.created_at ASC
  LOOP
    -- Calculate Authoritative Refund Amount
    IF v_reg.wallet_ledger_db_id IS NOT NULL AND v_reg.wallet_amount > 0 THEN
      v_payment_method := 'WALLET';
      v_refund_amount := TRUNC(v_reg.wallet_amount);
      v_orig_pay_id := v_reg.wallet_ledger_db_id::TEXT;
    ELSIF v_reg.razorpay_payment_db_id IS NOT NULL AND v_reg.razorpay_amount > 0 THEN
      v_payment_method := 'RAZORPAY';
      v_refund_amount := TRUNC(v_reg.razorpay_amount);
      v_orig_pay_id := COALESCE(v_reg.razorpay_payment_id, v_reg.razorpay_payment_db_id::TEXT);
    ELSE
      -- Fallback to published tournament fee
      v_refund_amount := v_parsed_fee;
      v_payment_method := CASE WHEN v_reg.payment_id ~ '^[0-9a-f-]{36}$' THEN 'WALLET' ELSE 'RAZORPAY' END;
      v_orig_pay_id := COALESCE(v_reg.payment_id, 'LEGACY_PAID');
    END IF;

    -- Skip if zero amount or no valid user
    IF v_refund_amount <= 0.00 OR v_reg.user_id IS NULL THEN
      v_skipped_count := v_skipped_count + 1;
      CONTINUE;
    END IF;

    -- 6.1 Lock Player Wallet FOR UPDATE
    SELECT id, balance INTO v_wallet_id, v_current_balance
    FROM public.wallets
    WHERE user_id = v_reg.user_id
    FOR UPDATE;

    IF NOT FOUND THEN
      INSERT INTO public.wallets (user_id, balance, currency, created_at, updated_at)
      VALUES (v_reg.user_id, 0.00, 'INR', NOW(), NOW())
      ON CONFLICT (user_id) DO NOTHING;

      SELECT id, balance INTO v_wallet_id, v_current_balance
      FROM public.wallets
      WHERE user_id = v_reg.user_id
      FOR UPDATE;
    END IF;

    v_balance_before := v_current_balance;
    v_balance_after := v_balance_before + v_refund_amount;

    -- 6.2 Atomically update wallet balance
    UPDATE public.wallets
    SET
      balance = v_balance_after,
      updated_at = NOW()
    WHERE id = v_wallet_id;

    -- 6.3 Insert immutable wallet ledger entry (REFUND CREDIT)
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
      v_reg.user_id,
      'REFUND',
      'CREDIT',
      v_refund_amount,
      v_balance_before,
      v_balance_after,
      'tournaments',
      TRIM(p_tournament_id),
      'REFUND-' || TRIM(p_tournament_id) || '-' || v_reg.registration_id::TEXT,
      'Refund: ' || v_tournament.title || ' (Tournament Cancelled)',
      jsonb_build_object(
        'tournament_id', TRIM(p_tournament_id),
        'tournament_title', v_tournament.title,
        'registration_id', v_reg.registration_id,
        'team_name', v_reg.team_name,
        'original_payment_method', v_payment_method,
        'original_payment_reference', v_orig_pay_id,
        'reason', v_clean_reason
      ),
      NOW()
    ) RETURNING id INTO v_ledger_id;

    -- 6.4 Insert authoritative tournament_refunds audit row
    INSERT INTO public.tournament_refunds (
      tournament_id,
      registration_id,
      user_id,
      amount,
      currency,
      payment_method,
      original_payment_reference,
      wallet_ledger_id,
      status,
      reason,
      created_at,
      completed_at
    ) VALUES (
      TRIM(p_tournament_id),
      v_reg.registration_id,
      v_reg.user_id,
      v_refund_amount,
      'INR',
      v_payment_method,
      v_orig_pay_id,
      v_ledger_id,
      'COMPLETED',
      v_clean_reason,
      NOW(),
      NOW()
    );

    -- 6.5 Update registration row status to Cancelled & payment_status to Refunded
    UPDATE public.tournament_registrations
    SET
      status = 'Cancelled',
      payment_status = 'Refunded',
      updated_at = NOW()
    WHERE id = v_reg.registration_id;

    -- CORRECTION 2: DO NOT update tournament_payments.status to 'REFUNDED'.
    -- Original Razorpay payment record remains historical evidence (status remains 'CONSUMED').

    v_refunded_count := v_refunded_count + 1;
    v_total_refunded := v_total_refunded + v_refund_amount;
  END LOOP;

  -- 7. Update Tournament Status to 'Cancelled'
  UPDATE public.tournaments
  SET
    status = 'Cancelled',
    updated_at = NOW()
  WHERE id = TRIM(p_tournament_id);

  -- 8. Return Comprehensive Structured Operational Report
  RETURN jsonb_build_object(
    'success', true,
    'tournament_id', TRIM(p_tournament_id),
    'tournament_title', v_tournament.title,
    'status', 'Cancelled',
    'refunded_count', v_refunded_count,
    'total_refund_amount', v_total_refunded,
    'skipped_count', v_skipped_count,
    'message', 'Tournament cancelled successfully. ' || v_refunded_count || ' eligible entry fee(s) refunded to player wallet(s).'
  );
END;
$$;

-- Privileges for cancel_tournament_and_refund
REVOKE EXECUTE ON FUNCTION public.cancel_tournament_and_refund(TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cancel_tournament_and_refund(TEXT, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.cancel_tournament_and_refund(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_tournament_and_refund(TEXT, TEXT) TO service_role;
