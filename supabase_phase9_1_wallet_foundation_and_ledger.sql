-- ============================================================================
-- MJ ESPORTS — Phase 9.1: Secure Wallet Foundation & Immutable Ledger Migration
-- Target Engine: Supabase PostgreSQL
-- Description:
--   1. Creates public.wallets table (1 row per authenticated user, non-negative balance).
--      - Single source of truth for user wallet balance.
--      - ON DELETE RESTRICT prevents silent financial destruction on user deletion.
--      - Compound unique constraint (id, user_id) enforces cross-user ledger consistency.
--   2. Creates public.wallet_ledger table (immutable double-entry style audit log).
--      - Referenced via composite FK (wallet_id, user_id) to guarantee User A's wallet
--        can NEVER be associated with User B's user_id.
--      - ON DELETE RESTRICT preserves complete permanent financial history.
--   3. Implements strict database-level immutability triggers on wallet_ledger.
--   4. Configures least-privilege Row-Level Security (RLS) & revokes direct client writes.
--   5. Creates SECURITY DEFINER RPCs:
--      - public.get_or_create_wallet()
--      - public.record_wallet_ledger_entry(...)
--   6. Enforces explicit typed function execution privileges (PUBLIC/anon revoked).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. WALLETS TABLE SETUP (Sole Authoritative Balance Source of Truth)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE RESTRICT,
  balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  currency TEXT NOT NULL DEFAULT 'INR',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_wallet_non_negative_balance CHECK (balance >= 0.00),
  CONSTRAINT uq_wallets_id_user_id UNIQUE (id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON public.wallets(user_id);

-- Ensure compound unique constraint exists if table was pre-created
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_wallets_id_user_id'
  ) THEN
    ALTER TABLE public.wallets ADD CONSTRAINT uq_wallets_id_user_id UNIQUE (id, user_id);
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 2. IMMUTABLE WALLET LEDGER TABLE SETUP (Permanent Audit Trail)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.wallet_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL,
  user_id UUID NOT NULL,
  transaction_type TEXT NOT NULL CHECK (
    transaction_type IN (
      'DEPOSIT',
      'WITHDRAWAL',
      'PRIZE_CREDIT',
      'ENTRY_FEE_DEBIT',
      'REFUND',
      'BONUS_CREDIT',
      'ADJUSTMENT'
    )
  ),
  direction TEXT NOT NULL CHECK (direction IN ('CREDIT', 'DEBIT')),
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0.00),
  balance_before NUMERIC(12, 2) NOT NULL CHECK (balance_before >= 0.00),
  balance_after NUMERIC(12, 2) NOT NULL CHECK (balance_after >= 0.00),
  source_reference_type TEXT DEFAULT NULL,
  source_reference_id TEXT DEFAULT NULL,
  idempotency_key TEXT UNIQUE DEFAULT NULL,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Foreign Key Strategy: ON DELETE RESTRICT prevents silent erasure of financial audit records
  CONSTRAINT fk_wallet_ledger_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE RESTRICT,
  -- Strongest practical integrity: Composite FK guarantees wallet_id strictly matches user_id
  CONSTRAINT fk_wallet_ledger_wallet_user FOREIGN KEY (wallet_id, user_id) REFERENCES public.wallets(id, user_id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_wallet_ledger_user_id ON public.wallet_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_ledger_wallet_id ON public.wallet_ledger(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_ledger_created_at ON public.wallet_ledger(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_ledger_idempotency ON public.wallet_ledger(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- Safe migration upgrade: adjust existing constraints if pre-existing
DO $$
BEGIN
  -- Upgrade user FK to ON DELETE RESTRICT
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'wallet_ledger_user_id_fkey'
  ) THEN
    ALTER TABLE public.wallet_ledger DROP CONSTRAINT wallet_ledger_user_id_fkey;
  END IF;

  -- Upgrade wallet FK to Composite FK (wallet_id, user_id)
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'wallet_ledger_wallet_id_fkey'
  ) THEN
    ALTER TABLE public.wallet_ledger DROP CONSTRAINT wallet_ledger_wallet_id_fkey;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_wallet_ledger_user'
  ) THEN
    ALTER TABLE public.wallet_ledger
      ADD CONSTRAINT fk_wallet_ledger_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_wallet_ledger_wallet_user'
  ) THEN
    ALTER TABLE public.wallet_ledger
      ADD CONSTRAINT fk_wallet_ledger_wallet_user FOREIGN KEY (wallet_id, user_id) REFERENCES public.wallets(id, user_id) ON DELETE RESTRICT;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 3. STRICT LEDGER IMMUTABILITY TRIGGER
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.prevent_wallet_ledger_modification()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Wallet ledger entries are immutable and cannot be updated or deleted.';
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_wallet_ledger_modification ON public.wallet_ledger;
CREATE TRIGGER trg_prevent_wallet_ledger_modification
  BEFORE UPDATE OR DELETE ON public.wallet_ledger
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_wallet_ledger_modification();

-- ----------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY (RLS) POLICIES & PRIVILEGE ENFORCEMENT
-- ----------------------------------------------------------------------------

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_ledger ENABLE ROW LEVEL SECURITY;

-- 4.1 Wallets RLS Policies
DROP POLICY IF EXISTS "Users can view own wallet or admin reads all" ON public.wallets;
CREATE POLICY "Users can view own wallet or admin reads all"
  ON public.wallets FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

-- 4.2 Wallet Ledger RLS Policies
DROP POLICY IF EXISTS "Users can view own wallet ledger or admin reads all" ON public.wallet_ledger;
CREATE POLICY "Users can view own wallet ledger or admin reads all"
  ON public.wallet_ledger FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

-- 4.3 Revoke direct client write privileges on financial tables
REVOKE INSERT, UPDATE, DELETE ON public.wallets FROM anon, authenticated, PUBLIC;
REVOKE INSERT, UPDATE, DELETE ON public.wallet_ledger FROM anon, authenticated, PUBLIC;

-- 4.4 Grant explicit read privileges
GRANT SELECT ON public.wallets TO authenticated, service_role;
GRANT SELECT ON public.wallet_ledger TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 5. RPC: GET OR CREATE USER WALLET
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_or_create_wallet()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_wallet RECORD;
BEGIN
  -- Derive user ID strictly from authenticated caller context
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'UNAUTHENTICATED',
      'message', 'You must be logged in to access your wallet.'
    );
  END IF;

  -- Attempt to retrieve existing wallet
  SELECT id, user_id, balance, currency, created_at, updated_at
  INTO v_wallet
  FROM public.wallets
  WHERE user_id = v_user_id;

  -- Create wallet atomically if it does not yet exist
  IF NOT FOUND THEN
    INSERT INTO public.wallets (user_id, balance, currency, created_at, updated_at)
    VALUES (v_user_id, 0.00, 'INR', NOW(), NOW())
    ON CONFLICT (user_id) DO NOTHING;

    SELECT id, user_id, balance, currency, created_at, updated_at
    INTO v_wallet
    FROM public.wallets
    WHERE user_id = v_user_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'wallet', jsonb_build_object(
      'id', v_wallet.id,
      'user_id', v_wallet.user_id,
      'balance', v_wallet.balance,
      'currency', v_wallet.currency,
      'created_at', v_wallet.created_at,
      'updated_at', v_wallet.updated_at
    )
  );
END;
$$;

-- Privileges for get_or_create_wallet
REVOKE EXECUTE ON FUNCTION public.get_or_create_wallet() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_or_create_wallet() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_or_create_wallet() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_wallet() TO service_role;

-- ----------------------------------------------------------------------------
-- 6. RPC: RECORD WALLET LEDGER ENTRY (Atomic, Row-Locked Financial Transition)
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
  -- Direct client execution is strictly forbidden.
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
  v_clean_amount := ROUND(p_amount::NUMERIC, 2);
  IF v_clean_amount <= 0.00 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_AMOUNT',
      'message', 'Transaction amount after rounding must be strictly greater than 0.00.'
    );
  END IF;

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

  -- 5. Calculate new balance & check sufficiency
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

  -- 7. Insert immutable ledger entry (with concurrent race condition guard)
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
    'wallet_id', v_wallet_id,
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

