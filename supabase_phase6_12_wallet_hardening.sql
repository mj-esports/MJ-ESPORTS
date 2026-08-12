-- ============================================================================
-- MJ ESPORTS — Phase 6.12: Wallet Security Hardening Migration
-- Target Engine: Supabase PostgreSQL
-- Description: 1. Safely creates prerequisite wallet_balance column & wallet_transactions table.
--              2. Enforces trigger-level and privilege-level protection on profiles (wallet_balance & earnings).
--              3. Creates SECURITY DEFINER RPCs for secure wallet operations:
--                 - process_wallet_deposit (Admin / Service Role only)
--                 - request_wallet_withdrawal
--                 - admin_process_prize_credit (Safe TEXT earnings formatting)
--                 - admin_review_withdrawal
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. PREREQUISITE SCHEMA SETUP
-- ----------------------------------------------------------------------------

-- 1.1 Add wallet_balance to public.profiles safely if missing
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS wallet_balance NUMERIC(12, 2) DEFAULT 0.00;

-- 1.2 Create public.wallet_transactions table safely if missing
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (
    type IN (
      'Entry Fee Debit',
      'Prize Credit',
      'Refund',
      'Bonus Credit',
      'Deposit',
      'Withdrawal'
    )
  ),
  amount NUMERIC(12, 2) NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Completed'
    CHECK (
      status IN (
        'Pending',
        'Completed',
        'Failed',
        'Cancelled'
      )
    ),
  tournament_id TEXT
    REFERENCES public.tournaments(id)
    ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1.3 Create index for user transaction lookups
CREATE INDEX IF NOT EXISTS idx_wallet_tx_user_id
  ON public.wallet_transactions(user_id);

-- 1.4 Enable Row Level Security (RLS)
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;


-- ----------------------------------------------------------------------------
-- 2. HARDEN WALLET_TRANSACTIONS RLS POLICIES & PRIVILEGES
-- ----------------------------------------------------------------------------

-- 2.1 SELECT Policy: Users read own transactions or Admin reads all
DROP POLICY IF EXISTS "Users read own wallet transactions or admin reads all" ON public.wallet_transactions;
CREATE POLICY "Users read own wallet transactions or admin reads all"
  ON public.wallet_transactions FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

-- 2.2 INSERT Policy: Admins insert wallet transactions
DROP POLICY IF EXISTS "Admins insert wallet transactions" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Users insert wallet transactions" ON public.wallet_transactions;

CREATE POLICY "Admins insert wallet transactions"
  ON public.wallet_transactions FOR INSERT
  WITH CHECK (public.is_admin());

-- 2.3 Revoke direct write privileges from anon, authenticated, public
REVOKE INSERT, UPDATE, DELETE ON public.wallet_transactions FROM anon, authenticated, public;


-- ----------------------------------------------------------------------------
-- 3. HARDEN FINANCIAL PROFILE COLUMNS (wallet_balance & earnings)
-- ----------------------------------------------------------------------------

-- Create trigger function to block non-admin direct client updates to financial columns
CREATE OR REPLACE FUNCTION public.protect_profile_financial_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- If executed by service_role or admin user, allow financial column updates
  IF (SELECT current_setting('role', true)) = 'service_role' OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  -- For normal authenticated users, enforce that financial columns remain unchanged
  IF NEW.wallet_balance IS DISTINCT FROM OLD.wallet_balance THEN
    NEW.wallet_balance := OLD.wallet_balance;
  END IF;

  IF NEW.earnings IS DISTINCT FROM OLD.earnings THEN
    NEW.earnings := OLD.earnings;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_financial_columns ON public.profiles;
CREATE TRIGGER trg_protect_profile_financial_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_financial_columns();


-- ----------------------------------------------------------------------------
-- 4. SECURE WALLET RPCs
-- ----------------------------------------------------------------------------

-- 4.1 PROCESS WALLET DEPOSIT RPC (Admin / Service Role Boundary)
CREATE OR REPLACE FUNCTION public.process_wallet_deposit(
  p_amount NUMERIC,
  p_payment_method TEXT DEFAULT 'UPI',
  p_gateway_order_id TEXT DEFAULT NULL,
  p_gateway_payment_id TEXT DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_new_balance NUMERIC(12, 2);
  v_tx_id UUID;
  v_idempotency_ref TEXT;
  v_is_authorized BOOLEAN := FALSE;
BEGIN
  -- 1. Derive user identity from authenticated session
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'UNAUTHENTICATED',
      'message', 'You must be logged in to deposit funds.'
    );
  END IF;

  -- 2. Authorization Boundary:
  --    - ADMIN (public.is_admin()) -> ALLOWED for controlled manual wallet top-up
  --    - SERVICE_ROLE ((SELECT current_setting('role', true)) = 'service_role') -> ALLOWED for future verified gateway execution
  --    - NORMAL AUTHENTICATED USER -> REJECTED (Gateway not connected)
  IF (SELECT current_setting('role', true)) = 'service_role' OR public.is_admin() THEN
    v_is_authorized := TRUE;
  END IF;

  IF NOT v_is_authorized THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'PAYMENT_GATEWAY_NOT_CONNECTED',
      'message', 'Online deposits require payment gateway integration or admin top-up.'
    );
  END IF;

  -- 3. Validate amount
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_AMOUNT',
      'message', 'Deposit amount must be greater than zero.'
    );
  END IF;

  v_idempotency_ref := COALESCE(p_idempotency_key, p_gateway_payment_id);

  -- 4. Idempotency Check (if key provided)
  IF v_idempotency_ref IS NOT NULL AND v_idempotency_ref != '' THEN
    IF EXISTS (
      SELECT 1 FROM public.wallet_transactions
      WHERE user_id = v_user_id AND description LIKE '%' || v_idempotency_ref || '%'
    ) THEN
      RETURN jsonb_build_object(
        'success', false,
        'error_code', 'DUPLICATE_TRANSACTION',
        'message', 'This transaction has already been processed.'
      );
    END IF;
  END IF;

  -- 5. Lock target profile row for update
  PERFORM 1 FROM public.profiles WHERE id = v_user_id FOR UPDATE;

  -- 6. Atomically insert transaction record
  INSERT INTO public.wallet_transactions (
    user_id,
    type,
    amount,
    description,
    status
  ) VALUES (
    v_user_id,
    'Deposit',
    p_amount,
    'Add Money via ' || COALESCE(p_payment_method, 'UPI') || CASE WHEN v_idempotency_ref IS NOT NULL THEN ' (' || v_idempotency_ref || ')' ELSE '' END,
    'Completed'
  ) RETURNING id INTO v_tx_id;

  -- 7. Atomically update wallet balance
  UPDATE public.profiles
  SET 
    wallet_balance = COALESCE(wallet_balance, 0.00) + p_amount,
    updated_at = NOW()
  WHERE id = v_user_id
  RETURNING wallet_balance INTO v_new_balance;

  -- 8. Return success object
  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_tx_id,
    'wallet_balance', v_new_balance,
    'message', 'Deposit successful.'
  );
END;
$$;


-- 4.2 REQUEST WALLET WITHDRAWAL RPC
CREATE OR REPLACE FUNCTION public.request_wallet_withdrawal(
  p_amount NUMERIC,
  p_payout_details TEXT,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_current_balance NUMERIC(12, 2);
  v_new_balance NUMERIC(12, 2);
  v_tx_id UUID;
BEGIN
  -- 1. Derive user identity
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'UNAUTHENTICATED',
      'message', 'You must be logged in to request a withdrawal.'
    );
  END IF;

  -- 2. Validate input amount
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_AMOUNT',
      'message', 'Withdrawal amount must be greater than zero.'
    );
  END IF;

  -- 3. Lock profile row FOR UPDATE and check current balance
  SELECT COALESCE(wallet_balance, 0.00) INTO v_current_balance
  FROM public.profiles
  WHERE id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'PROFILE_NOT_FOUND',
      'message', 'User profile not found.'
    );
  END IF;

  IF v_current_balance < p_amount THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INSUFFICIENT_FUNDS',
      'message', 'Insufficient wallet balance for this withdrawal.'
    );
  END IF;

  -- 4. Atomically insert pending transaction record
  INSERT INTO public.wallet_transactions (
    user_id,
    type,
    amount,
    description,
    status
  ) VALUES (
    v_user_id,
    'Withdrawal',
    p_amount,
    COALESCE(p_payout_details, 'Bank Payout Request'),
    'Pending'
  ) RETURNING id INTO v_tx_id;

  -- 5. Atomically deduct wallet balance (hold funds during withdrawal)
  UPDATE public.profiles
  SET 
    wallet_balance = wallet_balance - p_amount,
    updated_at = NOW()
  WHERE id = v_user_id
  RETURNING wallet_balance INTO v_new_balance;

  -- 6. Return response
  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_tx_id,
    'wallet_balance', v_new_balance,
    'message', 'Withdrawal request submitted successfully.'
  );
END;
$$;


-- 4.3 ADMIN PROCESS PRIZE CREDIT RPC (With Safe TEXT Earnings Handling)
CREATE OR REPLACE FUNCTION public.admin_process_prize_credit(
  p_target_user_id UUID,
  p_tournament_id TEXT,
  p_amount NUMERIC,
  p_description TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_target_profile RECORD;
  v_new_balance NUMERIC(12, 2);
  v_prev_earnings_num NUMERIC(12, 2);
  v_new_earnings_num NUMERIC(12, 2);
  v_new_earnings_str TEXT;
  v_tx_id UUID;
BEGIN
  -- 1. Verify admin role
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'UNAUTHORIZED',
      'message', 'Only platform administrators can allocate prize credits.'
    );
  END IF;

  -- 2. Validate amount & target user
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_AMOUNT',
      'message', 'Prize credit amount must be greater than zero.'
    );
  END IF;

  SELECT * INTO v_target_profile
  FROM public.profiles
  WHERE id = p_target_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'USER_NOT_FOUND',
      'message', 'Target player profile not found.'
    );
  END IF;

  -- 3. Safely parse previous TEXT earnings string (e.g. '₹12,500' -> 12500)
  v_prev_earnings_num := COALESCE(
    NULLIF(
      regexp_replace(
        COALESCE(v_target_profile.earnings, '₹0'),
        '[^0-9.]',
        '',
        'g'
      ),
      ''
    )::numeric,
    0.00
  );

  v_new_earnings_num := v_prev_earnings_num + p_amount;
  v_new_earnings_str := '₹' || trim(to_char(v_new_earnings_num, 'FM999,999,999,990'));

  -- 4. Atomically insert Prize Credit transaction
  INSERT INTO public.wallet_transactions (
    user_id,
    type,
    amount,
    description,
    tournament_id,
    status
  ) VALUES (
    p_target_user_id,
    'Prize Credit',
    p_amount,
    COALESCE(p_description, 'Tournament Prize Allocation'),
    p_tournament_id,
    'Completed'
  ) RETURNING id INTO v_tx_id;

  -- 5. Increment target user wallet balance and update TEXT earnings
  UPDATE public.profiles
  SET 
    wallet_balance = COALESCE(wallet_balance, 0.00) + p_amount,
    earnings = v_new_earnings_str,
    updated_at = NOW()
  WHERE id = p_target_user_id
  RETURNING wallet_balance INTO v_new_balance;

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_tx_id,
    'wallet_balance', v_new_balance,
    'earnings', v_new_earnings_str,
    'message', 'Prize credit allocated successfully.'
  );
END;
$$;


-- 4.4 ADMIN REVIEW WITHDRAWAL RPC
CREATE OR REPLACE FUNCTION public.admin_review_withdrawal(
  p_transaction_id UUID,
  p_action TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_tx RECORD;
  v_upper_action TEXT;
BEGIN
  -- 1. Verify admin privilege
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'UNAUTHORIZED',
      'message', 'Only administrators can process payout reviews.'
    );
  END IF;

  v_upper_action := UPPER(TRIM(p_action));
  IF v_upper_action NOT IN ('APPROVE', 'REJECT') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_ACTION',
      'message', 'Action must be APPROVE or REJECT.'
    );
  END IF;

  -- 2. Lock target transaction row
  SELECT * INTO v_tx
  FROM public.wallet_transactions
  WHERE id = p_transaction_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'TRANSACTION_NOT_FOUND',
      'message', 'Withdrawal transaction record not found.'
    );
  END IF;

  IF v_tx.type != 'Withdrawal' OR v_tx.status != 'Pending' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'ALREADY_FINALIZED',
      'message', 'This withdrawal transaction is not pending.'
    );
  END IF;

  -- 3. Execute APPROVE or REJECT
  IF v_upper_action = 'APPROVE' THEN
    UPDATE public.wallet_transactions
    SET status = 'Completed'
    WHERE id = p_transaction_id;

    RETURN jsonb_build_object(
      'success', true,
      'status', 'Completed',
      'message', 'Withdrawal approved successfully.'
    );
  ELSIF v_upper_action = 'REJECT' THEN
    UPDATE public.wallet_transactions
    SET status = 'Cancelled'
    WHERE id = p_transaction_id;

    -- Refund debited amount back to user's wallet_balance
    UPDATE public.profiles
    SET 
      wallet_balance = COALESCE(wallet_balance, 0.00) + v_tx.amount,
      updated_at = NOW()
    WHERE id = v_tx.user_id;

    RETURN jsonb_build_object(
      'success', true,
      'status', 'Cancelled',
      'message', 'Withdrawal rejected and funds refunded to user wallet.'
    );
  END IF;
END;
$$;


-- ----------------------------------------------------------------------------
-- 5. RPC PERMISSION GRANTS
-- ----------------------------------------------------------------------------

REVOKE EXECUTE ON FUNCTION public.process_wallet_deposit FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.request_wallet_withdrawal FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_process_prize_credit FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_review_withdrawal FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.process_wallet_deposit TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.request_wallet_withdrawal TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_process_prize_credit TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_review_withdrawal TO authenticated, service_role;
