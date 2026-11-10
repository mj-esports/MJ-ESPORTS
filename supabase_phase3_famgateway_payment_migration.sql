-- ============================================================================
-- MJ ESPORTS — Phase 3 & 5: FamGateway Payment Integration & Security Hardening
-- Target Engine: Supabase PostgreSQL 15+
--
-- Migration Sequence / Prerequisite Chain:
--   1. supabase_phase8_1_tournament_payments_and_registration_guard.sql
--   2. supabase_phase9_5a_tournament_cancellation_and_wallet_refund.sql
--   3. supabase_phase3_famgateway_payment_migration.sql (THIS SCRIPT - Self-Contained)
--
-- Description:
--   1. Upgrades public.tournament_payments with provider-neutral columns:
--      provider, provider_order_id, provider_payment_id, gateway_order_reference.
--   2. Backfills historical Razorpay records with 100% data fidelity.
--   3. Safely relaxes NOT NULL on razorpay_order_id for future FamGateway rows.
--   4. Creates public.famgateway_webhook_events for webhook idempotency and audit logs.
--   5. Updates public.tournament_refunds constraint to support 'FAMGATEWAY'.
--   6. Relaxes registration_id NOT NULL and adds payment_id to tournament_refunds.
--   7. Upgrades public.register_tournament_team to record provider_payment_id (UTR).
--   8. Upgrades public.cancel_tournament_and_refund to support FamGateway payments.
--   9. Implements public.refund_unregistered_verified_payment for capacity saturation auto-refunds.
--  10. Implements public.recover_tournament_registration_from_payment with capacity saturation auto-refund.
--  11. Enforces strict Row Level Security (RLS) on all tables and functions.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. UPGRADE PUBLIC.TOURNAMENT_PAYMENTS
-- ----------------------------------------------------------------------------

ALTER TABLE public.tournament_payments
  ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'RAZORPAY',
  ADD COLUMN IF NOT EXISTS provider_order_id TEXT,
  ADD COLUMN IF NOT EXISTS provider_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS gateway_order_reference TEXT;

-- Backfill existing historical records safely
UPDATE public.tournament_payments
SET
  provider = 'RAZORPAY',
  provider_order_id = COALESCE(provider_order_id, razorpay_order_id),
  provider_payment_id = COALESCE(provider_payment_id, razorpay_payment_id)
WHERE provider_order_id IS NULL;

-- Safely relax razorpay_order_id NOT NULL for future FamGateway orders
ALTER TABLE public.tournament_payments
  ALTER COLUMN razorpay_order_id DROP NOT NULL;

-- Indices for rapid gateway-neutral lookups
CREATE INDEX IF NOT EXISTS idx_tournament_payments_provider_order
  ON public.tournament_payments(provider, provider_order_id);

CREATE INDEX IF NOT EXISTS idx_tournament_payments_provider_payment
  ON public.tournament_payments(provider, provider_payment_id)
  WHERE provider_payment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tournament_payments_gateway_ref
  ON public.tournament_payments(gateway_order_reference)
  WHERE gateway_order_reference IS NOT NULL;


-- ----------------------------------------------------------------------------
-- 2. CREATE PUBLIC.FAMGATEWAY_WEBHOOK_EVENTS TABLE
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.famgateway_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'payment.success',
  utr TEXT,
  amount NUMERIC(12, 2),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'PROCESSED' CHECK (status IN ('PROCESSED', 'IGNORED', 'FAILED')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_famgateway_webhook_order UNIQUE (order_id)
);

CREATE INDEX IF NOT EXISTS idx_fg_webhook_events_order_id ON public.famgateway_webhook_events(order_id);
CREATE INDEX IF NOT EXISTS idx_fg_webhook_events_utr ON public.famgateway_webhook_events(utr);
CREATE INDEX IF NOT EXISTS idx_fg_webhook_events_created_at ON public.famgateway_webhook_events(created_at DESC);

-- Enable RLS & restrict to service_role
ALTER TABLE public.famgateway_webhook_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.famgateway_webhook_events FROM PUBLIC;
REVOKE ALL ON public.famgateway_webhook_events FROM anon;
REVOKE ALL ON public.famgateway_webhook_events FROM authenticated;
GRANT ALL ON public.famgateway_webhook_events TO service_role;


-- ----------------------------------------------------------------------------
-- 3. UPGRADE PUBLIC.TOURNAMENT_REFUNDS CONSTRAINT & SCHEMA FOR UNLINKED REFUNDS
-- ----------------------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tournament_refunds_payment_method_check'
  ) THEN
    ALTER TABLE public.tournament_refunds DROP CONSTRAINT tournament_refunds_payment_method_check;
  END IF;

  ALTER TABLE public.tournament_refunds
    ADD CONSTRAINT tournament_refunds_payment_method_check
    CHECK (payment_method IN ('WALLET', 'RAZORPAY', 'FAMGATEWAY', 'GATEWAY'));
END $$;

-- Allow refunds for verified payments before a registration record exists (e.g. capacity saturation)
ALTER TABLE public.tournament_refunds
  ALTER COLUMN registration_id DROP NOT NULL;

ALTER TABLE public.tournament_refunds
  ADD COLUMN IF NOT EXISTS payment_id UUID REFERENCES public.tournament_payments(id);

-- Replace single-purpose registration uniqueness with dual conditional uniqueness
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_tournament_refund_registration'
  ) THEN
    ALTER TABLE public.tournament_refunds DROP CONSTRAINT uq_tournament_refund_registration;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_tournament_refund_reg
  ON public.tournament_refunds(tournament_id, registration_id)
  WHERE registration_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_tournament_refund_payment
  ON public.tournament_refunds(payment_id)
  WHERE payment_id IS NOT NULL;


-- ----------------------------------------------------------------------------
-- 4. UPGRADE REGISTER_TOURNAMENT_TEAM RPC (GATEWAY-NEUTRAL PAYMENT ID)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.register_tournament_team(
  p_tournament_id TEXT,
  p_team_name TEXT,
  p_captain_name TEXT,
  p_email TEXT,
  p_whatsapp_number TEXT,
  p_captain_uid TEXT,
  p_teammate_uids TEXT[] DEFAULT '{}'::TEXT[],
  p_substitute_uids TEXT[] DEFAULT '{}'::TEXT[],
  p_captain_dob TEXT DEFAULT NULL,
  p_player_age INT DEFAULT NULL,
  p_preferred_seed INT DEFAULT 1,
  p_has_substitutes BOOLEAN DEFAULT FALSE,
  p_enable_sms_alerts BOOLEAN DEFAULT TRUE,
  p_mode TEXT DEFAULT 'Squad',
  p_ref_id TEXT DEFAULT NULL,
  p_payment_id UUID DEFAULT NULL,
  p_razorpay_payment_id TEXT DEFAULT NULL,
  p_teammate_igns TEXT[] DEFAULT '{}'::TEXT[],
  p_substitute_igns TEXT[] DEFAULT '{}'::TEXT[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_tournament RECORD;
  v_payment public.tournament_payments%ROWTYPE;
  v_raw_fee TEXT;
  v_raw_digits TEXT;
  v_entry_fee NUMERIC(12, 2) := 0.00;
  v_game TEXT;
  v_norm_captain_uid TEXT;
  v_clean_captain_ign TEXT;
  v_norm_captain_ign TEXT;
  v_norm_teammates TEXT[] := '{}'::TEXT[];
  v_clean_teammate_igns TEXT[] := '{}'::TEXT[];
  v_norm_substitutes TEXT[] := '{}'::TEXT[];
  v_clean_substitute_igns TEXT[] := '{}'::TEXT[];
  v_all_norm_uids TEXT[] := '{}'::TEXT[];
  v_conflict_uid TEXT;
  v_ref_id TEXT;
  v_registration_id UUID;
  v_new_team_json JSONB;
  v_roster_json JSONB := '[]'::JSONB;
  v_item TEXT;
  v_ign_item TEXT;
  v_idx INT;
  v_active_mode TEXT;
  v_required_teammates INT;
  v_actual_teammates INT;
  v_reg_payment_status TEXT;
  v_reg_payment_id TEXT;
  v_approval_type TEXT := 'Automatic';
  v_waitlist_enabled BOOLEAN := FALSE;
  v_is_full BOOLEAN := FALSE;
  v_reg_status TEXT := 'Approved';
BEGIN
  -- 1. Derive authenticated user_id from session context
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'UNAUTHENTICATED',
      'message', 'You must be logged in to register for a tournament.'
    );
  END IF;

  -- 2. Lock the target tournament row to prevent concurrent capacity race-conditions
  SELECT * INTO v_tournament
  FROM public.tournaments
  WHERE id = p_tournament_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'TOURNAMENT_NOT_FOUND',
      'message', 'The requested tournament does not exist.'
    );
  END IF;

  -- 3. Authoritative evaluation of approval type, waitlist queue, and slot capacity
  IF v_tournament.status != 'Registration Open' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'REGISTRATION_CLOSED',
      'message', 'Registration for this tournament is currently closed.'
    );
  END IF;

  v_approval_type := COALESCE(
    NULLIF(TRIM(to_jsonb(v_tournament)->>'approval_type'), ''),
    NULLIF(TRIM(to_jsonb(v_tournament)->>'registration_approval'), ''),
    'Automatic'
  );

  v_waitlist_enabled := COALESCE(
    (to_jsonb(v_tournament)->>'waitlist_enabled')::BOOLEAN,
    (to_jsonb(v_tournament)->>'allow_waitlist')::BOOLEAN,
    FALSE
  );

  v_is_full := COALESCE(v_tournament.registered_teams, 0) >= COALESCE(v_tournament.max_teams, 32);

  IF v_is_full THEN
    IF NOT v_waitlist_enabled THEN
      RETURN jsonb_build_object(
        'success', false,
        'error_code', 'TOURNAMENT_FULL',
        'message', 'All registration slots for this tournament are full.'
      );
    ELSE
      v_reg_status := 'Waitlist';
    END IF;
  ELSE
    IF UPPER(v_approval_type) = 'MANUAL' THEN
      v_reg_status := 'Pending';
    ELSE
      v_reg_status := 'Approved';
    END IF;
  END IF;

  -- 4. Authoritative Entry Fee Evaluation
  v_raw_fee := TRIM(COALESCE(v_tournament.entry_fee, 'Free'));
  IF UPPER(v_raw_fee) = 'FREE' OR v_raw_fee = '' THEN
    v_entry_fee := 0.00;
  ELSE
    v_raw_digits := REGEXP_REPLACE(v_raw_fee, '[^0-9.]', '', 'g');
    IF v_raw_digits = '' OR v_raw_digits = '.' THEN
      v_entry_fee := 0.00;
    ELSE
      BEGIN
        v_entry_fee := v_raw_digits::NUMERIC(12, 2);
      EXCEPTION WHEN OTHERS THEN
        v_entry_fee := 0.00;
      END;
    END IF;
  END IF;

  -- 5. Paid Tournament Payment Verification Gate
  IF v_entry_fee > 0.00 THEN
    IF p_payment_id IS NULL AND (p_razorpay_payment_id IS NULL OR TRIM(p_razorpay_payment_id) = '') THEN
      RETURN jsonb_build_object(
        'success', false,
        'error_code', 'PAYMENT_REQUIRED',
        'message', 'This tournament requires an entry fee of ₹' || v_entry_fee || '. Verified payment is required to register.'
      );
    END IF;

    -- Lock the payment record FOR UPDATE to guarantee atomic consumption
    SELECT * INTO v_payment
    FROM public.tournament_payments
    WHERE (
      (p_payment_id IS NOT NULL AND id = p_payment_id)
      OR
      (p_razorpay_payment_id IS NOT NULL AND (
        razorpay_payment_id = TRIM(p_razorpay_payment_id)
        OR provider_payment_id = TRIM(p_razorpay_payment_id)
        OR provider_order_id = TRIM(p_razorpay_payment_id)
      ))
    )
    FOR UPDATE;

    IF NOT FOUND THEN
      RETURN jsonb_build_object(
        'success', false,
        'error_code', 'INVALID_PAYMENT',
        'message', 'No valid payment record was found matching this transaction.'
      );
    END IF;

    -- Verify payment belongs to caller
    IF v_payment.user_id != v_user_id THEN
      RETURN jsonb_build_object(
        'success', false,
        'error_code', 'INVALID_PAYMENT',
        'message', 'Payment record does not belong to the authenticated user.'
      );
    END IF;

    -- Verify payment belongs to target tournament
    IF v_payment.tournament_id != p_tournament_id THEN
      RETURN jsonb_build_object(
        'success', false,
        'error_code', 'INVALID_PAYMENT',
        'message', 'Payment was issued for a different tournament.'
      );
    END IF;

    -- Verify payment has not already been consumed
    IF v_payment.status = 'CONSUMED' OR v_payment.registration_id IS NOT NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'error_code', 'PAYMENT_ALREADY_USED',
        'message', 'This payment has already been used for a tournament registration.'
      );
    END IF;

    -- Verify payment status is strictly VERIFIED
    IF v_payment.status != 'VERIFIED' THEN
      RETURN jsonb_build_object(
        'success', false,
        'error_code', 'INVALID_PAYMENT',
        'message', 'Payment has not been verified. Current status: ' || v_payment.status
      );
    END IF;

    -- Verify payment amount is sufficient for tournament entry fee
    IF v_payment.amount < v_entry_fee THEN
      RETURN jsonb_build_object(
        'success', false,
        'error_code', 'PAYMENT_AMOUNT_MISMATCH',
        'message', 'Payment amount (₹' || v_payment.amount || ') is less than the required entry fee (₹' || v_entry_fee || ').'
      );
    END IF;

    v_reg_payment_status := 'Paid';
    v_reg_payment_id := COALESCE(
      v_payment.provider_payment_id,
      v_payment.razorpay_payment_id,
      v_payment.provider_order_id,
      v_payment.id::TEXT
    );
  ELSE
    v_reg_payment_status := 'Free';
    v_reg_payment_id := NULL;
  END IF;

  -- 6. Normalize and validate Captain Game UID and IGN
  IF p_captain_uid IS NULL OR TRIM(p_captain_uid) = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_CAPTAIN_UID',
      'message', 'Captain Game UID is required.'
    );
  END IF;

  v_norm_captain_uid := TRIM(p_captain_uid);
  IF NOT (v_norm_captain_uid ~ '^[0-9]{10}$') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_GAME_UID',
      'message', 'Captain Game Character UID must be exactly 10 numeric digits.'
    );
  END IF;

  v_clean_captain_ign := TRIM(COALESCE(p_captain_name, ''));
  v_norm_captain_ign := LOWER(v_clean_captain_ign);
  v_all_norm_uids := array_append(v_all_norm_uids, v_norm_captain_uid);

  -- 7. Normalize teammate arrays
  IF p_teammate_uids IS NOT NULL AND array_length(p_teammate_uids, 1) > 0 THEN
    FOR v_idx IN 1..array_length(p_teammate_uids, 1) LOOP
      v_item := p_teammate_uids[v_idx];
      IF v_item IS NOT NULL AND TRIM(v_item) != '' THEN
        v_norm_teammates := array_append(v_norm_teammates, TRIM(v_item));
        IF p_teammate_igns IS NOT NULL AND array_length(p_teammate_igns, 1) >= v_idx THEN
          v_ign_item := COALESCE(TRIM(p_teammate_igns[v_idx]), '');
        ELSE
          v_ign_item := '';
        END IF;
        v_clean_teammate_igns := array_append(v_clean_teammate_igns, v_ign_item);
      END IF;
    END LOOP;
  END IF;

  -- 8. Normalize substitutes array
  IF p_has_substitutes AND p_substitute_uids IS NOT NULL AND array_length(p_substitute_uids, 1) > 0 THEN
    FOR v_idx IN 1..array_length(p_substitute_uids, 1) LOOP
      v_item := p_substitute_uids[v_idx];
      IF v_item IS NOT NULL AND TRIM(v_item) != '' THEN
        v_norm_substitutes := array_append(v_norm_substitutes, TRIM(v_item));
        IF p_substitute_igns IS NOT NULL AND array_length(p_substitute_igns, 1) >= v_idx THEN
          v_ign_item := COALESCE(TRIM(p_substitute_igns[v_idx]), '');
        ELSE
          v_ign_item := '';
        END IF;
        v_clean_substitute_igns := array_append(v_clean_substitute_igns, v_ign_item);
      END IF;
    END LOOP;
  END IF;

  -- 9. Authoritative Exact Active Roster Size Enforcement
  v_active_mode := COALESCE(NULLIF(TRIM(p_mode), ''), 'Squad');
  IF v_active_mode NOT IN ('Solo', 'Duo', 'Squad') THEN
    v_active_mode := 'Squad';
  END IF;

  IF v_active_mode = 'Solo' THEN
    v_required_teammates := 0;
  ELSIF v_active_mode = 'Duo' THEN
    v_required_teammates := 1;
  ELSE
    v_required_teammates := 3;
  END IF;

  v_actual_teammates := COALESCE(array_length(v_norm_teammates, 1), 0);

  IF v_actual_teammates != v_required_teammates THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_ROSTER',
      'message', v_active_mode || ' mode requires exactly ' || 
        CASE 
          WHEN v_active_mode = 'Solo' THEN '0 active teammates (1 captain total).'
          WHEN v_active_mode = 'Duo' THEN '1 active teammate (2 players total).'
          ELSE '3 active teammates (4 players total).'
        END || ' Found ' || v_actual_teammates || ' teammates.'
    );
  END IF;

  -- 10. Validate teammate format & roster internal uniqueness
  IF v_actual_teammates > 0 THEN
    FOR v_idx IN 1..v_actual_teammates LOOP
      v_item := v_norm_teammates[v_idx];
      IF NOT (v_item ~ '^[0-9]{10}$') THEN
        RETURN jsonb_build_object(
          'success', false,
          'error_code', 'INVALID_GAME_UID',
          'message', 'Teammate Game UID ' || v_item || ' must be exactly 10 numeric digits.'
        );
      END IF;

      IF v_clean_teammate_igns[v_idx] IS NULL OR v_clean_teammate_igns[v_idx] = '' THEN
        RETURN jsonb_build_object(
          'success', false,
          'error_code', 'INVALID_ROSTER',
          'message', 'In-Game Name (IGN) is required for Teammate ' || v_idx || '.'
        );
      END IF;

      IF v_item = ANY(v_all_norm_uids) THEN
        RETURN jsonb_build_object(
          'success', false,
          'error_code', 'DUPLICATE_UID_IN_ROSTER',
          'message', 'Game UID ' || v_item || ' is duplicated within the submitted roster.'
        );
      END IF;
      v_all_norm_uids := array_append(v_all_norm_uids, v_item);
    END LOOP;
  END IF;

  IF p_has_substitutes AND array_length(v_norm_substitutes, 1) > 0 THEN
    FOR v_idx IN 1..array_length(v_norm_substitutes, 1) LOOP
      v_item := v_norm_substitutes[v_idx];
      IF NOT (v_item ~ '^[0-9]{10}$') THEN
        RETURN jsonb_build_object(
          'success', false,
          'error_code', 'INVALID_GAME_UID',
          'message', 'Substitute Game UID ' || v_item || ' must be exactly 10 numeric digits.'
        );
      END IF;

      IF v_item = ANY(v_all_norm_uids) THEN
        RETURN jsonb_build_object(
          'success', false,
          'error_code', 'DUPLICATE_UID_IN_ROSTER',
          'message', 'Substitute UID ' || v_item || ' is already used in the active roster.'
        );
      END IF;
      v_all_norm_uids := array_append(v_all_norm_uids, v_item);
    END LOOP;
  END IF;

  -- 11. Duplicate user check: Only 1 active registration per user account
  IF EXISTS (
    SELECT 1 FROM public.tournament_registrations
    WHERE tournament_id = p_tournament_id
      AND user_id = v_user_id
      AND status != 'Rejected'
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'DUPLICATE_USER_ACCOUNT',
      'message', 'You have already registered for this tournament.'
    );
  END IF;

  -- 12. Check tournament-wide UID collisions
  SELECT tp.game_uid INTO v_conflict_uid
  FROM public.tournament_players tp
  JOIN public.tournament_registrations tr ON tr.id = tp.registration_id
  WHERE tp.tournament_id = p_tournament_id
    AND tr.status != 'Rejected'
    AND UPPER(TRIM(tp.game_uid)) = ANY(v_all_norm_uids)
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'DUPLICATE_GAME_UID',
      'message', 'Game UID ' || v_conflict_uid || ' is already registered in this tournament.'
    );
  END IF;

  SELECT free_fire_uid INTO v_conflict_uid
  FROM public.tournament_registrations
  WHERE tournament_id = p_tournament_id
    AND status != 'Rejected'
    AND UPPER(TRIM(free_fire_uid)) = ANY(v_all_norm_uids)
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'DUPLICATE_GAME_UID',
      'message', 'Game UID ' || v_conflict_uid || ' is already registered in this tournament.'
    );
  END IF;

  -- 13. Insert into public.tournament_registrations
  v_ref_id := COALESCE(p_ref_id, 'REG-MJ-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8)));
  v_game := COALESCE(v_tournament.game, 'Free Fire');

  INSERT INTO public.tournament_registrations (
    tournament_id,
    team_name,
    captain_name,
    free_fire_uid,
    whatsapp_number,
    email,
    user_id,
    status,
    payment_status,
    payment_id,
    transaction_id,
    registered_at
  ) VALUES (
    p_tournament_id,
    p_team_name,
    p_captain_name,
    v_norm_captain_uid,
    p_whatsapp_number,
    p_email,
    v_user_id,
    v_reg_status,
    v_reg_payment_status,
    v_reg_payment_id,
    v_reg_payment_id,
    NOW()
  ) RETURNING id INTO v_registration_id;

  -- 14. Atomically consume payment record if paid
  IF v_entry_fee > 0.00 THEN
    IF v_payment.id IS NOT NULL THEN
      UPDATE public.tournament_payments
      SET
        registration_id = v_registration_id,
        status = 'CONSUMED',
        consumed_at = NOW(),
        updated_at = NOW()
      WHERE id = v_payment.id;
    END IF;
  END IF;

  -- 15. Insert player records into public.tournament_players
  -- Captain
  INSERT INTO public.tournament_players (
    tournament_id,
    registration_id,
    user_id,
    game,
    game_uid,
    canonical_ign,
    normalized_ign,
    player_role,
    identity_status
  ) VALUES (
    p_tournament_id,
    v_registration_id,
    v_user_id,
    v_game,
    v_norm_captain_uid,
    v_clean_captain_ign,
    v_norm_captain_ign,
    'Captain',
    'REGISTERED'
  );

  v_roster_json := v_roster_json || jsonb_build_object(
    'role', 'Captain',
    'uid', v_norm_captain_uid,
    'canonicalIgn', v_clean_captain_ign,
    'normalizedIgn', v_norm_captain_ign,
    'userId', v_user_id
  );

  -- Teammates
  IF v_actual_teammates > 0 THEN
    FOR v_idx IN 1..v_actual_teammates LOOP
      INSERT INTO public.tournament_players (
        tournament_id,
        registration_id,
        user_id,
        game,
        game_uid,
        canonical_ign,
        normalized_ign,
        player_role,
        identity_status
      ) VALUES (
        p_tournament_id,
        v_registration_id,
        NULL,
        v_game,
        v_norm_teammates[v_idx],
        v_clean_teammate_igns[v_idx],
        LOWER(TRIM(v_clean_teammate_igns[v_idx])),
        'Member',
        'REGISTERED'
      );

      v_roster_json := v_roster_json || jsonb_build_object(
        'role', 'Member',
        'uid', v_norm_teammates[v_idx],
        'canonicalIgn', v_clean_teammate_igns[v_idx],
        'normalizedIgn', LOWER(TRIM(v_clean_teammate_igns[v_idx])),
        'userId', NULL
      );
    END LOOP;
  END IF;

  -- Substitutes
  IF p_has_substitutes AND array_length(v_norm_substitutes, 1) > 0 THEN
    FOR v_idx IN 1..array_length(v_norm_substitutes, 1) LOOP
      INSERT INTO public.tournament_players (
        tournament_id,
        registration_id,
        user_id,
        game,
        game_uid,
        canonical_ign,
        normalized_ign,
        player_role,
        identity_status
      ) VALUES (
        p_tournament_id,
        v_registration_id,
        NULL,
        v_game,
        v_norm_substitutes[v_idx],
        COALESCE(v_clean_substitute_igns[v_idx], ''),
        LOWER(TRIM(COALESCE(v_clean_substitute_igns[v_idx], ''))),
        'Substitute',
        'REGISTERED'
      );

      v_roster_json := v_roster_json || jsonb_build_object(
        'role', 'Substitute',
        'uid', v_norm_substitutes[v_idx],
        'canonicalIgn', COALESCE(v_clean_substitute_igns[v_idx], ''),
        'normalizedIgn', LOWER(TRIM(COALESCE(v_clean_substitute_igns[v_idx], ''))),
        'userId', NULL
      );
    END LOOP;
  END IF;

  -- 16. Build teams_list JSON and update tournament
  v_new_team_json := jsonb_build_object(
    'id', v_ref_id,
    'refId', v_ref_id,
    'name', p_team_name,
    'captain', p_captain_name,
    'freeFireUid', v_norm_captain_uid,
    'preferredSeed', p_preferred_seed,
    'hasSubstitutes', p_has_substitutes,
    'substitutes', COALESCE(to_jsonb(p_substitute_uids), '[]'::jsonb),
    'substituteIgns', COALESCE(to_jsonb(v_clean_substitute_igns), '[]'::jsonb),
    'enableSmsAlerts', p_enable_sms_alerts,
    'mode', p_mode,
    'teammates', COALESCE(to_jsonb(p_teammate_uids), '[]'::jsonb),
    'teammateIgns', COALESCE(to_jsonb(v_clean_teammate_igns), '[]'::jsonb),
    'roster', v_roster_json,
    'userId', v_user_id,
    'status', v_reg_status,
    'paymentStatus', v_reg_payment_status,
    'paymentId', v_reg_payment_id,
    'rank', jsonb_array_length(COALESCE(v_tournament.teams_list, '[]'::jsonb)) + 1,
    'registeredAt', NOW()
  );

  IF v_reg_status = 'Waitlist' THEN
    UPDATE public.tournaments
    SET
      teams_list = COALESCE(teams_list, '[]'::jsonb) || v_new_team_json,
      updated_at = NOW()
    WHERE id = p_tournament_id;
  ELSE
    UPDATE public.tournaments
    SET
      registered_teams = registered_teams + 1,
      teams_list = COALESCE(teams_list, '[]'::jsonb) || v_new_team_json,
      updated_at = NOW()
    WHERE id = p_tournament_id;
  END IF;

  -- 17. Return success response
  RETURN jsonb_build_object(
    'success', true,
    'refId', v_ref_id,
    'registration_id', v_registration_id,
    'status', v_reg_status,
    'registration_status', v_reg_status,
    'payment_status', v_reg_payment_status,
    'payment_id', v_reg_payment_id,
    'message', CASE
      WHEN v_reg_status = 'Waitlist' THEN 'Tournament is full. You have been added to the waitlist queue.'
      WHEN v_reg_status = 'Pending' THEN 'Registration submitted successfully. Pending admin review.'
      ELSE 'Tournament registration successful.'
    END,
    'teamRecord', v_new_team_json
  );
END;
$$;

-- Grant execution privileges explicitly
REVOKE EXECUTE ON FUNCTION public.register_tournament_team(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT[], TEXT, INT, INT, BOOLEAN, BOOLEAN, TEXT, TEXT, UUID, TEXT, TEXT[], TEXT[]
) FROM PUBLIC;

REVOKE EXECUTE ON FUNCTION public.register_tournament_team(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT[], TEXT, INT, INT, BOOLEAN, BOOLEAN, TEXT, TEXT, UUID, TEXT, TEXT[], TEXT[]
) FROM anon;

GRANT EXECUTE ON FUNCTION public.register_tournament_team(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT[], TEXT, INT, INT, BOOLEAN, BOOLEAN, TEXT, TEXT, UUID, TEXT, TEXT[], TEXT[]
) TO authenticated;

GRANT EXECUTE ON FUNCTION public.register_tournament_team(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT[], TEXT, INT, INT, BOOLEAN, BOOLEAN, TEXT, TEXT, UUID, TEXT, TEXT[], TEXT[]
) TO service_role;


-- ----------------------------------------------------------------------------
-- 5. UPGRADE CANCEL_TOURNAMENT_AND_REFUND RPC
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
  -- 1. Security Check
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

  -- 2. Concurrency Serialization
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

  IF v_tournament.status IN ('Completed', 'Results Pending') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'CANNOT_CANCEL_COMPLETED_TOURNAMENT',
      'current_status', v_tournament.status,
      'message', 'Cannot cancel a tournament that has already completed or has results pending.'
    );
  END IF;

  -- 4. Parse fallback entry fee
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

  -- 5. Discover and Process All Eligible Paid Registrations
  FOR v_reg IN
    SELECT
      tr.id AS registration_id,
      tr.user_id,
      tr.team_name,
      tr.payment_status,
      tr.payment_id,
      tr.status AS registration_status,
      tp.id AS gateway_payment_db_id,
      tp.provider,
      tp.provider_order_id,
      tp.provider_payment_id,
      tp.razorpay_payment_id,
      tp.amount AS gateway_amount,
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
      AND COALESCE(tr.payment_status, '') != 'Free'
      AND COALESCE(tr.payment_id, '') != 'FREE_ENTRY'
      AND NOT EXISTS (
        SELECT 1 FROM public.tournament_refunds ref
        WHERE ref.tournament_id = TRIM(p_tournament_id)
          AND ref.registration_id = tr.id
          AND ref.status = 'COMPLETED'
      )
      AND (
        tp.id IS NOT NULL
        OR wl.id IS NOT NULL
        OR (tr.payment_status = 'Paid' AND tr.payment_id IS NOT NULL AND tr.user_id IS NOT NULL)
      )
    ORDER BY tr.created_at ASC
  LOOP
    IF v_reg.wallet_ledger_db_id IS NOT NULL AND v_reg.wallet_amount > 0 THEN
      v_payment_method := 'WALLET';
      v_refund_amount := TRUNC(v_reg.wallet_amount);
      v_orig_pay_id := v_reg.wallet_ledger_db_id::TEXT;
    ELSIF v_reg.gateway_payment_db_id IS NOT NULL AND v_reg.gateway_amount > 0 THEN
      v_payment_method := COALESCE(v_reg.provider, 'GATEWAY');
      v_refund_amount := TRUNC(v_reg.gateway_amount);
      v_orig_pay_id := COALESCE(v_reg.provider_payment_id, v_reg.razorpay_payment_id, v_reg.provider_order_id, v_reg.gateway_payment_db_id::TEXT);
    ELSE
      v_refund_amount := v_parsed_fee;
      v_payment_method := CASE WHEN v_reg.payment_id ~ '^[0-9a-f-]{36}$' THEN 'WALLET' ELSE 'GATEWAY' END;
      v_orig_pay_id := COALESCE(v_reg.payment_id, 'LEGACY_PAID');
    END IF;

    IF v_refund_amount <= 0.00 OR v_reg.user_id IS NULL THEN
      v_skipped_count := v_skipped_count + 1;
      CONTINUE;
    END IF;

    -- Lock player wallet FOR UPDATE
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

    UPDATE public.wallets
    SET
      balance = v_balance_after,
      updated_at = NOW()
    WHERE id = v_wallet_id;

    -- Insert wallet ledger entry
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

    -- Insert audit row into tournament_refunds
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

    UPDATE public.tournament_registrations
    SET
      status = 'Cancelled',
      payment_status = 'Refunded',
      updated_at = NOW()
    WHERE id = v_reg.registration_id;

    v_refunded_count := v_refunded_count + 1;
    v_total_refunded := v_total_refunded + v_refund_amount;
  END LOOP;

  UPDATE public.tournaments
  SET
    status = 'Cancelled',
    updated_at = NOW()
  WHERE id = TRIM(p_tournament_id);

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

REVOKE EXECUTE ON FUNCTION public.cancel_tournament_and_refund(TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cancel_tournament_and_refund(TEXT, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.cancel_tournament_and_refund(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_tournament_and_refund(TEXT, TEXT) TO service_role;


-- ----------------------------------------------------------------------------
-- 6. REFUND_UNREGISTERED_VERIFIED_PAYMENT RPC (CAPACITY SATURATION SAFEGUARD)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.refund_unregistered_verified_payment(
  p_payment_id UUID,
  p_reason TEXT DEFAULT 'Tournament Full Capacity'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id UUID;
  v_payment RECORD;
  v_wallet_id UUID;
  v_current_balance NUMERIC(12, 2);
  v_balance_before NUMERIC(12, 2);
  v_balance_after NUMERIC(12, 2);
  v_ledger_id UUID;
  v_existing_refund RECORD;
  v_clean_reason TEXT;
  v_idempotency_key TEXT;
BEGIN
  v_caller_id := auth.uid();
  v_clean_reason := COALESCE(NULLIF(TRIM(p_reason), ''), 'Tournament Full Capacity');

  IF p_payment_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_PARAMETERS',
      'message', 'Payment ID is required.'
    );
  END IF;

  -- 1. Lock payment record FOR UPDATE
  SELECT * INTO v_payment
  FROM public.tournament_payments
  WHERE id = p_payment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'PAYMENT_NOT_FOUND',
      'message', 'Payment record not found.'
    );
  END IF;

  -- 2. Security Check: caller must be payment owner, service_role, or admin
  IF NOT (
    (v_caller_id IS NOT NULL AND v_caller_id = v_payment.user_id)
    OR (SELECT current_setting('role', true)) = 'service_role'
    OR public.is_admin()
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'UNAUTHORIZED',
      'message', 'You are not authorized to refund this payment.'
    );
  END IF;

  -- 3. Idempotency Check: Already refunded
  IF v_payment.status = 'REFUNDED' THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_refunded', true,
      'payment_id', v_payment.id,
      'amount', v_payment.amount,
      'message', 'Payment has already been refunded to user wallet.'
    );
  END IF;

  -- 4. Check that payment is NOT already consumed for a registration
  IF v_payment.status = 'CONSUMED' OR v_payment.registration_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'PAYMENT_ALREADY_CONSUMED',
      'message', 'This payment has already been consumed for registration ' || COALESCE(v_payment.registration_id::TEXT, '') || '. Use cancel_tournament_and_refund to refund active registrations.'
    );
  END IF;

  -- 5. Strict Verification Check: payment MUST be genuinely VERIFIED
  IF v_payment.status != 'VERIFIED' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'PAYMENT_NOT_VERIFIED',
      'current_status', v_payment.status,
      'message', 'Only verified payments can be refunded to wallet balance.'
    );
  END IF;

  -- 6. Check existing refund in tournament_refunds
  SELECT * INTO v_existing_refund
  FROM public.tournament_refunds
  WHERE payment_id = v_payment.id
     OR original_payment_reference = COALESCE(v_payment.provider_payment_id, v_payment.provider_order_id, v_payment.id::TEXT)
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_refunded', true,
      'payment_id', v_payment.id,
      'amount', v_payment.amount,
      'refund_id', v_existing_refund.id,
      'message', 'Refund audit entry already exists for this transaction.'
    );
  END IF;

  -- 7. Lock or create player wallet FOR UPDATE
  SELECT id, balance INTO v_wallet_id, v_current_balance
  FROM public.wallets
  WHERE user_id = v_payment.user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.wallets (user_id, balance, currency, created_at, updated_at)
    VALUES (v_payment.user_id, 0.00, 'INR', NOW(), NOW())
    ON CONFLICT (user_id) DO NOTHING;

    SELECT id, balance INTO v_wallet_id, v_current_balance
    FROM public.wallets
    WHERE user_id = v_payment.user_id
    FOR UPDATE;
  END IF;

  v_balance_before := v_current_balance;
  v_balance_after := v_balance_before + v_payment.amount;

  -- 8. Atomic balance update
  UPDATE public.wallets
  SET
    balance = v_balance_after,
    updated_at = NOW()
  WHERE id = v_wallet_id;

  -- 9. Insert wallet ledger credit entry
  v_idempotency_key := 'REFUND_CAPACITY_' || v_payment.id::TEXT;

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
    v_payment.user_id,
    'REFUND',
    'CREDIT',
    v_payment.amount,
    v_balance_before,
    v_balance_after,
    'tournament_payments',
    v_payment.id::TEXT,
    v_idempotency_key,
    'Refund: Tournament Capacity Saturation (Order ' || COALESCE(v_payment.provider_order_id, v_payment.id::TEXT) || ')',
    jsonb_build_object(
      'tournament_id', v_payment.tournament_id,
      'payment_id', v_payment.id,
      'provider', v_payment.provider,
      'provider_order_id', v_payment.provider_order_id,
      'provider_payment_id', v_payment.provider_payment_id,
      'reason', v_clean_reason
    ),
    NOW()
  ) RETURNING id INTO v_ledger_id;

  -- 10. Record audit entry in tournament_refunds
  INSERT INTO public.tournament_refunds (
    tournament_id,
    registration_id,
    payment_id,
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
    v_payment.tournament_id,
    NULL,
    v_payment.id,
    v_payment.user_id,
    v_payment.amount,
    COALESCE(v_payment.currency, 'INR'),
    COALESCE(v_payment.provider, 'FAMGATEWAY'),
    COALESCE(v_payment.provider_payment_id, v_payment.provider_order_id, v_payment.id::TEXT),
    v_ledger_id,
    'COMPLETED',
    v_clean_reason,
    NOW(),
    NOW()
  );

  -- 11. Mark payment record as REFUNDED
  UPDATE public.tournament_payments
  SET
    status = 'REFUNDED',
    updated_at = NOW(),
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
      'refunded_at', NOW(),
      'refund_reason', v_clean_reason,
      'wallet_ledger_id', v_ledger_id
    )
  WHERE id = v_payment.id;

  RETURN jsonb_build_object(
    'success', true,
    'refunded', true,
    'payment_id', v_payment.id,
    'amount', v_payment.amount,
    'wallet_ledger_id', v_ledger_id,
    'balance_before', v_balance_before,
    'balance_after', v_balance_after,
    'message', 'Entry fee of ₹' || v_payment.amount || ' was credited back to user wallet due to tournament capacity saturation.'
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.refund_unregistered_verified_payment(UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.refund_unregistered_verified_payment(UUID, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.refund_unregistered_verified_payment(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.refund_unregistered_verified_payment(UUID, TEXT) TO service_role;


-- ----------------------------------------------------------------------------
-- 7. RECOVER_TOURNAMENT_REGISTRATION_FROM_PAYMENT RPC (WITH AUTO-REFUND)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.recover_tournament_registration_from_payment(
  p_payment_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_payment RECORD;
  v_tournament RECORD;
  v_reg_data JSONB;
  v_norm_captain_uid TEXT;
  v_norm_phone TEXT;
  v_norm_teammates TEXT[] := '{}'::TEXT[];
  v_clean_teammate_igns TEXT[] := '{}'::TEXT[];
  v_norm_substitutes TEXT[] := '{}'::TEXT[];
  v_clean_substitute_igns TEXT[] := '{}'::TEXT[];
  v_all_norm_uids TEXT[] := '{}'::TEXT[];
  v_conflict_uid TEXT;
  v_ref_id TEXT;
  v_registration_id UUID;
  v_new_team_json JSONB;
  v_item TEXT;
  v_idx INT;
  v_active_mode TEXT;
  v_team_name TEXT;
  v_captain_name TEXT;
  v_email TEXT;
  v_game TEXT;
  v_refund_res JSONB;
BEGIN
  -- 1. Security check: Only service_role or admin can invoke headless recovery
  IF NOT ((SELECT current_setting('role', true)) = 'service_role' OR public.is_admin()) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'UNAUTHORIZED',
      'message', 'Execution restricted strictly to service_role or administrators.'
    );
  END IF;

  IF p_payment_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_PARAMETERS',
      'message', 'Payment ID is required.'
    );
  END IF;

  -- 2. Lock tournament_payments row FOR UPDATE
  SELECT * INTO v_payment
  FROM public.tournament_payments
  WHERE id = p_payment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'PAYMENT_NOT_FOUND',
      'message', 'Payment record not found.'
    );
  END IF;

  -- 3. Idempotency Check: Already consumed
  IF v_payment.status = 'CONSUMED' AND v_payment.registration_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'idempotent_replay', true,
      'registration_id', v_payment.registration_id,
      'status', 'CONSUMED',
      'message', 'Payment was already used for registration.'
    );
  END IF;

  -- If already refunded, exit cleanly
  IF v_payment.status = 'REFUNDED' THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_refunded', true,
      'payment_id', v_payment.id,
      'status', 'REFUNDED',
      'message', 'Payment was already refunded to user wallet.'
    );
  END IF;

  -- 4. Must be in VERIFIED status
  IF v_payment.status != 'VERIFIED' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'PAYMENT_NOT_VERIFIED',
      'current_status', v_payment.status,
      'message', 'Payment status must be VERIFIED to recover registration.'
    );
  END IF;

  -- 5. Inspect stored registration data
  v_reg_data := COALESCE(v_payment.metadata->'registration_data', '{}'::jsonb);

  -- If no registration data was provided at order creation, payment remains VERIFIED
  IF v_reg_data = '{}'::jsonb OR v_reg_data IS NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'recovered', false,
      'payment_id', v_payment.id,
      'status', 'VERIFIED',
      'message', 'Payment is verified. Awaiting player registration submission.'
    );
  END IF;

  -- 6. Lock target tournament row FOR UPDATE
  SELECT * INTO v_tournament
  FROM public.tournaments
  WHERE id = v_payment.tournament_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'TOURNAMENT_NOT_FOUND',
      'message', 'Associated tournament not found.'
    );
  END IF;

  -- 7. Check Slot Capacity: If full, automatically credit player's wallet!
  IF COALESCE(v_tournament.registered_teams, 0) >= COALESCE(v_tournament.max_teams, 32) THEN
    v_refund_res := public.refund_unregistered_verified_payment(p_payment_id, 'Tournament Full Capacity');
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'TOURNAMENT_FULL_REFUNDED',
      'refund_result', v_refund_res,
      'message', 'All registration slots for this tournament are full. Entry fee has been automatically credited to user wallet.'
    );
  END IF;

  -- 8. Extract & Validate Registration Fields
  v_team_name := TRIM(COALESCE(v_reg_data->>'teamName', 'Team ' || SUBSTRING(v_payment.user_id::TEXT FROM 1 FOR 6)));
  v_captain_name := TRIM(COALESCE(v_reg_data->>'captainName', 'Captain'));
  v_email := TRIM(COALESCE(v_reg_data->>'email', ''));
  v_norm_phone := TRIM(COALESCE(v_reg_data->>'whatsappNumber', ''));
  v_norm_captain_uid := TRIM(COALESCE(v_reg_data->>'freeFireUid', v_reg_data->>'captainUid', ''));
  v_active_mode := COALESCE(NULLIF(TRIM(v_reg_data->>'mode'), ''), v_tournament.mode, 'Squad');
  v_ref_id := COALESCE(NULLIF(TRIM(v_reg_data->>'refId'), ''), 'MJ-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6)));
  v_game := COALESCE(v_tournament.game, 'Free Fire MAX');

  IF v_norm_captain_uid = '' OR NOT (v_norm_captain_uid ~ '^[0-9]{10}$') THEN
    v_refund_res := public.refund_unregistered_verified_payment(p_payment_id, 'Invalid Captain UID');
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_GAME_UID_REFUNDED',
      'refund_result', v_refund_res,
      'message', 'Valid 10-digit Captain Game Character UID is required. Entry fee refunded to wallet.'
    );
  END IF;
  v_all_norm_uids := v_all_norm_uids || v_norm_captain_uid;

  -- Teammates array
  IF v_reg_data->'teammates' IS NOT NULL AND jsonb_array_length(v_reg_data->'teammates') > 0 THEN
    FOR v_idx IN 0..(jsonb_array_length(v_reg_data->'teammates') - 1) LOOP
      v_item := TRIM(COALESCE(v_reg_data->'teammates'->>v_idx, ''));
      IF v_item != '' THEN
        IF NOT (v_item ~ '^[0-9]{10}$') THEN
          v_refund_res := public.refund_unregistered_verified_payment(p_payment_id, 'Invalid Teammate UID');
          RETURN jsonb_build_object(
            'success', false,
            'error_code', 'INVALID_GAME_UID_REFUNDED',
            'refund_result', v_refund_res,
            'message', 'Teammate Game UID must be exactly 10 numeric digits. Entry fee refunded to wallet.'
          );
        END IF;
        v_norm_teammates := v_norm_teammates || v_item;
        v_all_norm_uids := v_all_norm_uids || v_item;
        v_clean_teammate_igns := v_clean_teammate_igns || COALESCE(v_reg_data->'teammateIgns'->>v_idx, 'Player ' || (v_idx + 1));
      END IF;
    END LOOP;
  END IF;

  -- 9. Check intra-roster duplicate UIDs
  IF (SELECT COUNT(*) FROM unnest(v_all_norm_uids)) != (SELECT COUNT(DISTINCT x) FROM unnest(v_all_norm_uids) x) THEN
    v_refund_res := public.refund_unregistered_verified_payment(p_payment_id, 'Duplicate UIDs in Roster');
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_ROSTER_REFUNDED',
      'refund_result', v_refund_res,
      'message', 'Duplicate Game UIDs detected within the submitted roster. Entry fee refunded to wallet.'
    );
  END IF;

  -- 10. Check if user is already registered for this tournament
  IF EXISTS (
    SELECT 1 FROM public.tournament_registrations
    WHERE tournament_id = v_payment.tournament_id
      AND user_id = v_payment.user_id
      AND status != 'Rejected'
  ) THEN
    v_refund_res := public.refund_unregistered_verified_payment(p_payment_id, 'Duplicate User Registration');
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'DUPLICATE_USER_REFUNDED',
      'refund_result', v_refund_res,
      'message', 'User is already registered for this tournament. Duplicate entry fee refunded to wallet.'
    );
  END IF;

  -- 11. Check tournament-wide UID collision
  SELECT tp.game_uid INTO v_conflict_uid
  FROM public.tournament_players tp
  JOIN public.tournament_registrations tr ON tr.id = tp.registration_id
  WHERE tp.tournament_id = v_payment.tournament_id
    AND tr.status != 'Rejected'
    AND UPPER(TRIM(tp.game_uid)) = ANY(v_all_norm_uids)
  LIMIT 1;

  IF FOUND THEN
    v_refund_res := public.refund_unregistered_verified_payment(p_payment_id, 'Game UID Collision (' || v_conflict_uid || ')');
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'UID_ALREADY_REGISTERED_REFUNDED',
      'conflicting_uid', v_conflict_uid,
      'refund_result', v_refund_res,
      'message', 'Game UID ' || v_conflict_uid || ' is already registered in this tournament. Entry fee refunded to wallet.'
    );
  END IF;

  -- 12. Insert into tournament_registrations
  INSERT INTO public.tournament_registrations (
    tournament_id,
    user_id,
    team_name,
    captain_name,
    email,
    whatsapp_number,
    free_fire_uid,
    payment_status,
    payment_id,
    transaction_id,
    status,
    registered_at
  ) VALUES (
    v_payment.tournament_id,
    v_payment.user_id,
    v_team_name,
    v_captain_name,
    v_email,
    v_norm_phone,
    v_norm_captain_uid,
    'Paid',
    COALESCE(v_payment.provider_payment_id, v_payment.provider_order_id, v_payment.id::TEXT),
    COALESCE(v_payment.provider_payment_id, v_payment.provider_order_id, v_payment.id::TEXT),
    'Approved',
    NOW()
  ) RETURNING id INTO v_registration_id;

  -- 13. Atomically consume payment record
  UPDATE public.tournament_payments
  SET
    registration_id = v_registration_id,
    status = 'CONSUMED',
    consumed_at = NOW(),
    updated_at = NOW()
  WHERE id = v_payment.id;

  -- 14. Insert Captain into tournament_players
  INSERT INTO public.tournament_players (
    tournament_id,
    registration_id,
    user_id,
    game,
    game_uid,
    canonical_ign,
    normalized_ign,
    player_role,
    identity_status
  ) VALUES (
    v_payment.tournament_id,
    v_registration_id,
    v_payment.user_id,
    v_game,
    v_norm_captain_uid,
    v_captain_name,
    LOWER(v_captain_name),
    'Captain',
    'REGISTERED'
  );

  -- 15. Insert Teammates into tournament_players
  IF array_length(v_norm_teammates, 1) > 0 THEN
    FOR v_idx IN 1..array_length(v_norm_teammates, 1) LOOP
      INSERT INTO public.tournament_players (
        tournament_id,
        registration_id,
        user_id,
        game,
        game_uid,
        canonical_ign,
        normalized_ign,
        player_role,
        identity_status
      ) VALUES (
        v_payment.tournament_id,
        v_registration_id,
        NULL,
        v_game,
        v_norm_teammates[v_idx],
        v_clean_teammate_igns[v_idx],
        LOWER(TRIM(v_clean_teammate_igns[v_idx])),
        'Member',
        'REGISTERED'
      );
    END LOOP;
  END IF;

  -- 16. Build teams_list JSON and update tournament
  v_new_team_json := jsonb_build_object(
    'id', v_ref_id,
    'refId', v_ref_id,
    'name', v_team_name,
    'captain', v_captain_name,
    'freeFireUid', v_norm_captain_uid,
    'mode', v_active_mode,
    'status', 'Approved',
    'paymentStatus', 'Paid',
    'paymentId', COALESCE(v_payment.provider_payment_id, v_payment.provider_order_id, v_payment.id::TEXT),
    'registeredAt', NOW(),
    'source', 'webhook_recovery'
  );

  UPDATE public.tournaments
  SET
    registered_teams = registered_teams + 1,
    teams_list = COALESCE(teams_list, '[]'::jsonb) || v_new_team_json,
    updated_at = NOW()
  WHERE id = v_payment.tournament_id;

  RETURN jsonb_build_object(
    'success', true,
    'recovered', true,
    'registration_id', v_registration_id,
    'status', 'CONSUMED',
    'teamRecord', v_new_team_json
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.recover_tournament_registration_from_payment(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.recover_tournament_registration_from_payment(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.recover_tournament_registration_from_payment(UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.recover_tournament_registration_from_payment(UUID) TO service_role;


