-- ============================================================================
-- MJ ESPORTS — Phase 8.1: Direct Tournament Payment Foundation Migration
-- Target Engine: Supabase PostgreSQL
-- Description:
--   1. Creates public.tournament_payments table for Razorpay entry fee transactions.
--   2. Enforces RLS: Normal users can only SELECT their own payments; mutations restricted to service_role / RPCs.
--   3. Updates public.register_tournament_team SECURITY DEFINER RPC to:
--      - Authoritatively determine entry fee from public.tournaments.entry_fee
--      - Require a VERIFIED payment record for paid tournaments
--      - Reject missing, failed, unverified, mismatched, or reused payments
--      - Atomically link and transition payment status to CONSUMED upon registration
--      - Allow free tournaments to register seamlessly without payment
-- ============================================================================

-- 1. CREATE PUBLIC.TOURNAMENT_PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS public.tournament_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id TEXT NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  registration_id UUID REFERENCES public.tournament_registrations(id) ON DELETE SET NULL,
  razorpay_order_id TEXT NOT NULL,
  razorpay_payment_id TEXT UNIQUE,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'VERIFIED', 'CONSUMED', 'FAILED', 'REFUNDED')),
  idempotency_key TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified_at TIMESTAMPTZ,
  consumed_at TIMESTAMPTZ
);

-- 2. CREATE INDEXES FOR FAST LOOKUPS
CREATE INDEX IF NOT EXISTS idx_tournament_payments_tournament_id ON public.tournament_payments(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_payments_user_id ON public.tournament_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_tournament_payments_order_id ON public.tournament_payments(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_tournament_payments_payment_id ON public.tournament_payments(razorpay_payment_id);
CREATE INDEX IF NOT EXISTS idx_tournament_payments_status ON public.tournament_payments(status);
CREATE INDEX IF NOT EXISTS idx_tournament_payments_registration_id ON public.tournament_payments(registration_id);

-- 3. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.tournament_payments ENABLE ROW LEVEL SECURITY;

-- 4. RLS POLICIES FOR TOURNAMENT_PAYMENTS
DROP POLICY IF EXISTS "Users read own payments or admins read all" ON public.tournament_payments;
CREATE POLICY "Users read own payments or admins read all"
  ON public.tournament_payments
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR (SELECT public.is_admin())
  );

-- Direct client modifications are strictly prohibited.
-- Mutations occur only via service_role (Edge Functions) and SECURITY DEFINER RPCs.
REVOKE INSERT, UPDATE, DELETE ON public.tournament_payments FROM anon, authenticated, public;
GRANT SELECT ON public.tournament_payments TO authenticated;
GRANT ALL ON public.tournament_payments TO service_role;

-- 5. DROP PREVIOUS OVERLOADS OF register_tournament_team
DROP FUNCTION IF EXISTS public.register_tournament_team(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT[], TEXT, INT, INT, BOOLEAN, BOOLEAN, TEXT, TEXT
);
DROP FUNCTION IF EXISTS public.register_tournament_team(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT[], TEXT, INT, INT, BOOLEAN, BOOLEAN, TEXT, TEXT, UUID, TEXT
);

-- 6. CREATE UPDATED REGISTER_TOURNAMENT_TEAM RPC WITH PAYMENT ATOMICITY
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
  p_razorpay_payment_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_tournament RECORD;
  v_payment RECORD;
  v_raw_fee TEXT;
  v_raw_digits TEXT;
  v_entry_fee NUMERIC(12, 2) := 0.00;
  v_game TEXT;
  v_norm_captain_uid TEXT;
  v_norm_teammates TEXT[] := '{}'::TEXT[];
  v_norm_substitutes TEXT[] := '{}'::TEXT[];
  v_all_norm_uids TEXT[] := '{}'::TEXT[];
  v_conflict_uid TEXT;
  v_ref_id TEXT;
  v_registration_id UUID;
  v_new_team_json JSONB;
  v_item TEXT;
  v_active_mode TEXT;
  v_required_teammates INT;
  v_actual_teammates INT;
  v_reg_payment_status TEXT;
  v_reg_payment_id TEXT;
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

  -- 3. Validate tournament status & slot capacity
  IF v_tournament.status != 'Registration Open' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'REGISTRATION_CLOSED',
      'message', 'Registration for this tournament is currently closed.'
    );
  END IF;

  IF COALESCE(v_tournament.registered_teams, 0) >= COALESCE(v_tournament.max_teams, 32) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'TOURNAMENT_FULL',
      'message', 'All registration slots for this tournament are full.'
    );
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
    -- A paid tournament requires payment identification
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
      (p_razorpay_payment_id IS NOT NULL AND razorpay_payment_id = TRIM(p_razorpay_payment_id))
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
    v_reg_payment_id := v_payment.razorpay_payment_id;
  ELSE
    v_reg_payment_status := 'Free';
    v_reg_payment_id := NULL;
  END IF;

  -- 6. Normalize and validate Captain Game UID
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

  -- 7. Determine active mode and enforce roster size
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

  -- Sanitize teammate UIDs
  IF p_teammate_uids IS NOT NULL THEN
    FOREACH v_item IN ARRAY p_teammate_uids LOOP
      IF v_item IS NOT NULL AND TRIM(v_item) != '' THEN
        v_norm_teammates := array_append(v_norm_teammates, TRIM(v_item));
      END IF;
    END LOOP;
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

  -- Sanitize substitute UIDs
  IF p_has_substitutes AND p_substitute_uids IS NOT NULL THEN
    FOREACH v_item IN ARRAY p_substitute_uids LOOP
      IF v_item IS NOT NULL AND TRIM(v_item) != '' THEN
        v_norm_substitutes := array_append(v_norm_substitutes, TRIM(v_item));
      END IF;
    END LOOP;
  END IF;

  -- Validate teammate format & roster internal uniqueness
  v_all_norm_uids := array_append(v_all_norm_uids, v_norm_captain_uid);

  IF v_actual_teammates > 0 THEN
    FOREACH v_item IN ARRAY v_norm_teammates LOOP
      IF NOT (v_item ~ '^[0-9]{10}$') THEN
        RETURN jsonb_build_object(
          'success', false,
          'error_code', 'INVALID_GAME_UID',
          'message', 'Teammate Game UID ' || v_item || ' must be exactly 10 numeric digits.'
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
    FOREACH v_item IN ARRAY v_norm_substitutes LOOP
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

  -- 8. Duplicate user check: Only 1 active registration per user account
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

  -- 9. Check tournament-wide UID collision against active registrations
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

  -- Check existing free_fire_uid in tournament_registrations table
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

  -- 10. Insert into public.tournament_registrations
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
    'Approved',
    v_reg_payment_status,
    v_reg_payment_id,
    v_reg_payment_id,
    NOW()
  ) RETURNING id INTO v_registration_id;

  -- 11. Atomically consume payment record if paid
  IF v_entry_fee > 0.00 AND v_payment.id IS NOT NULL THEN
    UPDATE public.tournament_payments
    SET
      registration_id = v_registration_id,
      status = 'CONSUMED',
      consumed_at = NOW(),
      updated_at = NOW()
    WHERE id = v_payment.id;
  END IF;

  -- 12. Insert player records into public.tournament_players
  -- Captain
  INSERT INTO public.tournament_players (
    tournament_id,
    registration_id,
    user_id,
    game,
    game_uid,
    player_role
  ) VALUES (
    p_tournament_id,
    v_registration_id,
    v_user_id,
    v_game,
    v_norm_captain_uid,
    'Captain'
  );

  -- Teammates
  IF v_actual_teammates > 0 THEN
    FOREACH v_item IN ARRAY v_norm_teammates LOOP
      INSERT INTO public.tournament_players (
        tournament_id,
        registration_id,
        user_id,
        game,
        game_uid,
        player_role
      ) VALUES (
        p_tournament_id,
        v_registration_id,
        NULL,
        v_game,
        TRIM(v_item),
        'Member'
      );
    END LOOP;
  END IF;

  -- Substitutes
  IF p_has_substitutes AND array_length(v_norm_substitutes, 1) > 0 THEN
    FOREACH v_item IN ARRAY v_norm_substitutes LOOP
      INSERT INTO public.tournament_players (
        tournament_id,
        registration_id,
        user_id,
        game,
        game_uid,
        player_role
      ) VALUES (
        p_tournament_id,
        v_registration_id,
        NULL,
        v_game,
        TRIM(v_item),
        'Substitute'
      );
    END LOOP;
  END IF;

  -- 13. Build SANITIZED JSON object for teams_list
  v_new_team_json := jsonb_build_object(
    'id', v_ref_id,
    'refId', v_ref_id,
    'name', p_team_name,
    'captain', p_captain_name,
    'freeFireUid', v_norm_captain_uid,
    'preferredSeed', p_preferred_seed,
    'hasSubstitutes', p_has_substitutes,
    'substitutes', COALESCE(to_jsonb(p_substitute_uids), '[]'::jsonb),
    'enableSmsAlerts', p_enable_sms_alerts,
    'mode', p_mode,
    'teammates', COALESCE(to_jsonb(p_teammate_uids), '[]'::jsonb),
    'userId', v_user_id,
    'status', 'Approved',
    'paymentStatus', v_reg_payment_status,
    'paymentId', v_reg_payment_id,
    'rank', jsonb_array_length(COALESCE(v_tournament.teams_list, '[]'::jsonb)) + 1,
    'registeredAt', NOW()
  );

  UPDATE public.tournaments
  SET 
    registered_teams = registered_teams + 1,
    teams_list = COALESCE(teams_list, '[]'::jsonb) || v_new_team_json,
    updated_at = NOW()
  WHERE id = p_tournament_id;

  -- 14. Return success response
  RETURN jsonb_build_object(
    'success', true,
    'refId', v_ref_id,
    'registration_id', v_registration_id,
    'payment_status', v_reg_payment_status,
    'payment_id', v_reg_payment_id,
    'message', 'Tournament registration successful.',
    'teamRecord', v_new_team_json
  );
END;
$$;

-- Ensure execution privileges
REVOKE EXECUTE ON FUNCTION public.register_tournament_team FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_tournament_team TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_tournament_team TO service_role;
