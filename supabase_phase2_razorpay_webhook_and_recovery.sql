-- ============================================================================
-- MJ ESPORTS — Phase 2: Razorpay Webhook & Payment Reliability Migration
-- Target Engine: Supabase PostgreSQL 15+
-- Description:
--   1. Creates public.razorpay_webhook_events table for tracking incoming
--      webhook events with strict database-level unique constraint on event_id.
--   2. Adds metadata column to public.tournament_payments for storing
--      pending registration payloads for headless recovery.
--   3. Creates public.recover_tournament_registration_from_payment RPC
--      allowing service_role (Edge Functions) to atomically recover and
--      complete tournament registrations if a user drops off after payment capture.
--   4. Configures least-privilege RLS: webhook table and recovery RPC are
--      completely hidden from public/anon/authenticated and restricted to service_role.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. CREATE PUBLIC.RAZORPAY_WEBHOOK_EVENTS TABLE
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.razorpay_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  entity_id TEXT,
  entity_type TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'PROCESSED' CHECK (status IN ('PROCESSED', 'IGNORED', 'FAILED')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rzp_webhook_events_event_id ON public.razorpay_webhook_events(event_id);
CREATE INDEX IF NOT EXISTS idx_rzp_webhook_events_entity_id ON public.razorpay_webhook_events(entity_id);
CREATE INDEX IF NOT EXISTS idx_rzp_webhook_events_event_type ON public.razorpay_webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_rzp_webhook_events_created_at ON public.razorpay_webhook_events(created_at DESC);

-- Enable RLS
ALTER TABLE public.razorpay_webhook_events ENABLE ROW LEVEL SECURITY;

-- Revoke all direct permissions from untrusted roles
REVOKE ALL ON public.razorpay_webhook_events FROM PUBLIC;
REVOKE ALL ON public.razorpay_webhook_events FROM anon;
REVOKE ALL ON public.razorpay_webhook_events FROM authenticated;

-- Grant execution privileges strictly to service_role
GRANT ALL ON public.razorpay_webhook_events TO service_role;


-- ----------------------------------------------------------------------------
-- 2. EXTEND PUBLIC.TOURNAMENT_PAYMENTS WITH METADATA COLUMN
-- ----------------------------------------------------------------------------

ALTER TABLE public.tournament_payments 
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;


-- ----------------------------------------------------------------------------
-- 3. CREATE HEADLESS REGISTRATION RECOVERY RPC
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
  v_norm_substitutes TEXT[] := '{}'::TEXT[];
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
BEGIN
  -- 1. Security check: Only service_role or admin can invoke recovery
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

  -- 7. Check Slot Capacity
  IF COALESCE(v_tournament.registered_teams, 0) >= COALESCE(v_tournament.max_teams, 32) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'TOURNAMENT_FULL',
      'message', 'All registration slots for this tournament are full.'
    );
  END IF;

  -- 8. Extract & Validate Registration Fields
  v_team_name := TRIM(COALESCE(v_reg_data->>'teamName', 'Team ' || SUBSTRING(v_payment.user_id::TEXT FROM 1 FOR 6)));
  v_captain_name := TRIM(COALESCE(v_reg_data->>'captainName', 'Captain'));
  v_email := TRIM(COALESCE(v_reg_data->>'email', ''));
  v_norm_phone := TRIM(COALESCE(v_reg_data->>'whatsappNumber', ''));
  v_norm_captain_uid := TRIM(COALESCE(v_reg_data->>'captainUid', ''));
  v_active_mode := COALESCE(NULLIF(TRIM(v_reg_data->>'mode'), ''), v_tournament.mode, 'Squad');
  v_ref_id := COALESCE(NULLIF(TRIM(v_reg_data->>'refId'), ''), 'MJ-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6)));
  v_game := COALESCE(v_tournament.game, 'Free Fire MAX');

  IF v_norm_captain_uid = '' OR NOT (v_norm_captain_uid ~ '^[0-9]{10}$') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_GAME_UID',
      'message', 'Valid 10-digit Captain Game Character UID is required.'
    );
  END IF;
  v_all_norm_uids := v_all_norm_uids || v_norm_captain_uid;

  -- Teammates array
  IF v_reg_data->'teammates' IS NOT NULL AND jsonb_array_length(v_reg_data->'teammates') > 0 THEN
    FOR v_idx IN 0..(jsonb_array_length(v_reg_data->'teammates') - 1) LOOP
      v_item := TRIM(COALESCE(v_reg_data->'teammates'->>v_idx, ''));
      IF v_item != '' THEN
        IF NOT (v_item ~ '^[0-9]{10}$') THEN
          RETURN jsonb_build_object(
            'success', false,
            'error_code', 'INVALID_GAME_UID',
            'message', 'Teammate Game UID must be exactly 10 numeric digits.'
          );
        END IF;
        v_norm_teammates := v_norm_teammates || v_item;
        v_all_norm_uids := v_all_norm_uids || v_item;
      END IF;
    END LOOP;
  END IF;

  -- Substitutes array
  IF v_reg_data->'substitutes' IS NOT NULL AND jsonb_array_length(v_reg_data->'substitutes') > 0 THEN
    FOR v_idx IN 0..(jsonb_array_length(v_reg_data->'substitutes') - 1) LOOP
      v_item := TRIM(COALESCE(v_reg_data->'substitutes'->>v_idx, ''));
      IF v_item != '' THEN
        IF NOT (v_item ~ '^[0-9]{10}$') THEN
          RETURN jsonb_build_object(
            'success', false,
            'error_code', 'INVALID_GAME_UID',
            'message', 'Substitute Game UID must be exactly 10 numeric digits.'
          );
        END IF;
        v_norm_substitutes := v_norm_substitutes || v_item;
        v_all_norm_uids := v_all_norm_uids || v_item;
      END IF;
    END LOOP;
  END IF;

  -- 9. Check intra-roster duplicate UIDs
  IF (SELECT COUNT(*) FROM unnest(v_all_norm_uids)) != (SELECT COUNT(DISTINCT x) FROM unnest(v_all_norm_uids) x) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_ROSTER',
      'message', 'Duplicate Game UIDs detected within the submitted roster.'
    );
  END IF;

  -- 10. Check if user is already registered for this tournament
  IF EXISTS (
    SELECT 1 FROM public.tournament_players
    WHERE tournament_id = v_payment.tournament_id
      AND user_id = v_payment.user_id
  ) OR EXISTS (
    SELECT 1 FROM public.tournament_registrations
    WHERE tournament_id = v_payment.tournament_id
      AND user_id = v_payment.user_id
  ) THEN
    -- If already registered, return friendly success
    RETURN jsonb_build_object(
      'success', true,
      'already_registered', true,
      'message', 'User is already registered for this tournament.'
    );
  END IF;

  -- 11. Check tournament-wide UID collisions
  SELECT normalized_game_uid INTO v_conflict_uid
  FROM public.tournament_players
  WHERE tournament_id = v_payment.tournament_id
    AND normalized_game_uid = ANY(v_all_norm_uids)
  LIMIT 1;

  IF v_conflict_uid IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'UID_ALREADY_REGISTERED',
      'conflicting_uid', v_conflict_uid,
      'message', 'Game UID ' || v_conflict_uid || ' is already registered in this tournament.'
    );
  END IF;

  -- 12. Build Sanitized teams_list JSON
  v_new_team_json := jsonb_build_object(
    'teamName', v_team_name,
    'captainName', v_captain_name,
    'captainUid', v_norm_captain_uid,
    'members', v_norm_teammates,
    'substitutes', v_norm_substitutes,
    'registeredAt', NOW(),
    'source', 'webhook_recovery'
  );

  -- 13. Insert into tournament_registrations
  INSERT INTO public.tournament_registrations (
    tournament_id,
    user_id,
    team_name,
    captain_name,
    email,
    whatsapp_number,
    captain_uid,
    teammates,
    substitutes,
    ref_id,
    mode,
    status
  ) VALUES (
    v_payment.tournament_id,
    v_payment.user_id,
    v_team_name,
    v_captain_name,
    v_email,
    v_norm_phone,
    v_norm_captain_uid,
    v_norm_teammates,
    v_norm_substitutes,
    v_ref_id,
    v_active_mode,
    'confirmed'
  ) RETURNING id INTO v_registration_id;

  -- 14. Insert Captain into tournament_players
  INSERT INTO public.tournament_players (
    tournament_id,
    registration_id,
    user_id,
    game,
    game_uid,
    player_role
  ) VALUES (
    v_payment.tournament_id,
    v_registration_id,
    v_payment.user_id,
    v_game,
    v_norm_captain_uid,
    'Captain'
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
        player_role
      ) VALUES (
        v_payment.tournament_id,
        v_registration_id,
        NULL,
        v_game,
        v_norm_teammates[v_idx],
        'Member'
      );
    END LOOP;
  END IF;

  -- 16. Insert Substitutes into tournament_players
  IF array_length(v_norm_substitutes, 1) > 0 THEN
    FOR v_idx IN 1..array_length(v_norm_substitutes, 1) LOOP
      INSERT INTO public.tournament_players (
        tournament_id,
        registration_id,
        user_id,
        game,
        game_uid,
        player_role
      ) VALUES (
        v_payment.tournament_id,
        v_registration_id,
        NULL,
        v_game,
        v_norm_substitutes[v_idx],
        'Substitute'
      );
    END LOOP;
  END IF;

  -- 17. Atomically Consume Payment Record
  UPDATE public.tournament_payments
  SET
    status = 'CONSUMED',
    registration_id = v_registration_id,
    consumed_at = NOW(),
    updated_at = NOW()
  WHERE id = v_payment.id;

  -- 18. Increment tournament registered_teams
  UPDATE public.tournaments
  SET
    registered_teams = COALESCE(registered_teams, 0) + 1,
    teams_list = COALESCE(teams_list, '[]'::JSONB) || v_new_team_json,
    updated_at = NOW()
  WHERE id = v_payment.tournament_id;

  RETURN jsonb_build_object(
    'success', true,
    'recovered', true,
    'registration_id', v_registration_id,
    'ref_id', v_ref_id,
    'payment_status', 'CONSUMED',
    'message', 'Tournament registration recovered and completed successfully.'
  );
END;
$$;

-- Revoke execute from public/anon/authenticated
REVOKE EXECUTE ON FUNCTION public.recover_tournament_registration_from_payment(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.recover_tournament_registration_from_payment(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.recover_tournament_registration_from_payment(UUID) FROM authenticated;

-- Grant execution strictly to service_role
GRANT EXECUTE ON FUNCTION public.recover_tournament_registration_from_payment(UUID) TO service_role;
