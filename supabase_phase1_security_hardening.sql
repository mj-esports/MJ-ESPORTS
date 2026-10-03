-- ============================================================================
-- MJ ESPORTS — Phase 1: Security Hardening Migration
-- Target Engine: Supabase PostgreSQL 15+
-- Description:
--   1. Drops legacy 17-parameter register_tournament_team overload to eliminate
--      unauthorized free entry bypass on paid tournaments.
--   2. Authoritatively defines 19-parameter register_tournament_team RPC with:
--      - Atomic SELECT ... FOR UPDATE capacity lock
--      - Server-side 10-digit UID and phone validation
--      - Mandatory VERIFIED payment consumption for paid tournaments
--      - Intra-roster and tournament-wide duplicate UID protection
--   3. Hardens storage.objects policies on 'avatars' bucket to enforce strict
--      user ownership (or admin) on UPDATE and DELETE.
--   4. Hardens public.notifications RLS to prevent cross-user notification spoofing.
--   5. Enforces zero direct write on financial tables (wallets, wallet_ledger,
--      wallet_transactions, tournament_payments).
--   6. Revokes direct DELETE privileges on tournament_registrations and
--      tournament_players from authenticated users (admin-only / RPC cancellation).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. SCHEMA ALIGNMENT FOR APPROVAL TYPE & WAITLIST QUEUE (SEC-04)
-- ----------------------------------------------------------------------------
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS approval_type TEXT DEFAULT 'Automatic';
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS registration_approval TEXT DEFAULT 'Automatic';
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS waitlist_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS allow_waitlist BOOLEAN DEFAULT FALSE;

ALTER TABLE public.tournament_registrations DROP CONSTRAINT IF EXISTS tournament_registrations_status_check;
ALTER TABLE public.tournament_registrations ADD CONSTRAINT tournament_registrations_status_check
  CHECK (status IN ('Pending', 'Approved', 'Confirmed', 'Rejected', 'Completed', 'Waitlist'));

-- ----------------------------------------------------------------------------
-- 1. DROP INSECURE & LEGACY OVERLOADS OF register_tournament_team
-- ----------------------------------------------------------------------------

-- 1.1 Drop 15-parameter legacy overload (without IGNs and without payment)
DROP FUNCTION IF EXISTS public.register_tournament_team(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT[], TEXT, INT, INT, BOOLEAN, BOOLEAN, TEXT, TEXT
);

-- 1.2 Drop 17-parameter overload (with IGN arrays, but WITHOUT payment verification)
DROP FUNCTION IF EXISTS public.register_tournament_team(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT[], TEXT, INT, INT, BOOLEAN, BOOLEAN, TEXT, TEXT, TEXT[], TEXT[]
);

-- 1.3 Drop 17-parameter candidate overload (with payment, without IGN arrays)
DROP FUNCTION IF EXISTS public.register_tournament_team(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT[], TEXT, INT, INT, BOOLEAN, BOOLEAN, TEXT, TEXT, UUID, TEXT
);

-- 1.4 Ensure clean state for 19-parameter authoritative signature
DROP FUNCTION IF EXISTS public.register_tournament_team(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT[], TEXT, INT, INT, BOOLEAN, BOOLEAN, TEXT, TEXT, UUID, TEXT, TEXT[], TEXT[]
);


-- ----------------------------------------------------------------------------
-- 2. CREATE AUTHORITATIVE 19-PARAMETER register_tournament_team RPC
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
  v_game TEXT;
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
  v_required_teammates INT;
  v_actual_teammates INT;
  v_raw_fee TEXT;
  v_raw_digits TEXT;
  v_entry_fee NUMERIC(12, 2) := 0.00;
  v_payment public.tournament_payments%ROWTYPE;
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

  -- 2. Lock target tournament row to prevent concurrent capacity race conditions
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

  -- 3. Validate tournament registration status & slot capacity
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
      -- Capacity full but waitlist is enabled -> assign Waitlist status
      v_reg_status := 'Waitlist';
    END IF;
  ELSE
    -- Capacity available -> determine status based on tournament approval_type
    IF UPPER(v_approval_type) = 'MANUAL' THEN
      v_reg_status := 'Pending';
    ELSE
      v_reg_status := 'Approved';
    END IF;
  END IF;

  -- 4. Authoritatively compute required entry fee
  v_raw_fee := TRIM(COALESCE(v_tournament.entry_fee, 'Free'));
  v_raw_digits := regexp_replace(v_raw_fee, '[^0-9.]', '', 'g');

  IF LOWER(v_raw_fee) = 'free' OR v_raw_digits = '' THEN
    v_entry_fee := 0.00;
  ELSE
    v_entry_fee := COALESCE(v_raw_digits::NUMERIC(12, 2), 0.00);
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
  END IF;

  -- 6. Validate Captain UID (Strictly 10 digits 0-9)
  IF p_captain_uid IS NULL OR TRIM(p_captain_uid) = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_ROSTER',
      'message', 'Captain Game Character UID is required.'
    );
  END IF;

  v_norm_captain_uid := TRIM(p_captain_uid);
  IF NOT (v_norm_captain_uid ~ '^[0-9]{10}$') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_GAME_UID',
      'message', 'Game Character UID must be exactly 10 numeric digits (0-9).'
    );
  END IF;
  v_all_norm_uids := v_all_norm_uids || v_norm_captain_uid;

  -- 7. Validate Contact Phone Number (Strictly 10 digits 0-9)
  v_norm_phone := TRIM(COALESCE(p_whatsapp_number, ''));
  IF v_norm_phone != '' AND NOT (v_norm_phone ~ '^[0-9]{10}$') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_PHONE_NUMBER',
      'message', 'WhatsApp contact number must be exactly 10 numeric digits (0-9).'
    );
  END IF;

  -- 8. Normalize and validate teammates array (Strictly 10 digits each)
  IF p_teammate_uids IS NOT NULL AND array_length(p_teammate_uids, 1) > 0 THEN
    FOREACH v_item IN ARRAY p_teammate_uids LOOP
      IF v_item IS NOT NULL AND TRIM(v_item) != '' THEN
        IF NOT (TRIM(v_item) ~ '^[0-9]{10}$') THEN
          RETURN jsonb_build_object(
            'success', false,
            'error_code', 'INVALID_GAME_UID',
            'message', 'Teammate Game UID must be exactly 10 numeric digits (0-9).'
          );
        END IF;
        v_norm_teammates := v_norm_teammates || TRIM(v_item);
        v_all_norm_uids := v_all_norm_uids || TRIM(v_item);
      END IF;
    END LOOP;
  END IF;

  -- 9. Normalize and validate substitutes array if enabled (Strictly 10 digits each)
  IF p_has_substitutes AND p_substitute_uids IS NOT NULL AND array_length(p_substitute_uids, 1) > 0 THEN
    FOREACH v_item IN ARRAY p_substitute_uids LOOP
      IF v_item IS NOT NULL AND TRIM(v_item) != '' THEN
        IF NOT (TRIM(v_item) ~ '^[0-9]{10}$') THEN
          RETURN jsonb_build_object(
            'success', false,
            'error_code', 'INVALID_GAME_UID',
            'message', 'Substitute Game UID must be exactly 10 numeric digits (0-9).'
          );
        END IF;
        v_norm_substitutes := v_norm_substitutes || TRIM(v_item);
        v_all_norm_uids := v_all_norm_uids || TRIM(v_item);
      END IF;
    END LOOP;
  END IF;

  -- 10. Check intra-roster duplicate UIDs
  IF (SELECT COUNT(*) FROM unnest(v_all_norm_uids)) != (SELECT COUNT(DISTINCT x) FROM unnest(v_all_norm_uids) x) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_ROSTER',
      'message', 'Duplicate Game UIDs detected within the submitted roster.'
    );
  END IF;

  -- 11. Check if authenticated user already registered for this tournament
  IF EXISTS (
    SELECT 1 FROM public.tournament_players
    WHERE tournament_id = p_tournament_id
      AND user_id = v_user_id
  ) OR EXISTS (
    SELECT 1 FROM public.tournament_registrations
    WHERE tournament_id = p_tournament_id
      AND user_id = v_user_id
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'USER_ALREADY_REGISTERED',
      'message', 'You have already registered a team for this tournament.'
    );
  END IF;

  -- 12. Check tournament-wide UID collisions
  SELECT normalized_game_uid INTO v_conflict_uid
  FROM public.tournament_players
  WHERE tournament_id = p_tournament_id
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

  -- 13. Validate mode-specific roster sizes
  v_active_mode := COALESCE(NULLIF(TRIM(p_mode), ''), v_tournament.mode, 'Squad');
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
      'error_code', 'INVALID_ROSTER_SIZE',
      'message', 'Roster size mismatch. ' || v_active_mode || ' mode requires exactly ' || v_required_teammates || ' teammate(s).'
    );
  END IF;

  -- 14. Determine Reference ID and Game
  v_ref_id := COALESCE(p_ref_id, 'MJ-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6)));
  v_game := COALESCE(v_tournament.game, 'Free Fire MAX');

  -- 15. Build Sanitized teams_list JSON (Omit Sensitive PII)
  v_new_team_json := jsonb_build_object(
    'teamName', TRIM(p_team_name),
    'captainName', TRIM(p_captain_name),
    'captainUid', v_norm_captain_uid,
    'members', v_norm_teammates,
    'substitutes', v_norm_substitutes,
    'registeredAt', NOW()
  );

  -- 16. Insert into tournament_registrations
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
    p_tournament_id,
    v_user_id,
    TRIM(p_team_name),
    TRIM(p_captain_name),
    TRIM(p_email),
    v_norm_phone,
    v_norm_captain_uid,
    v_norm_teammates,
    v_norm_substitutes,
    v_ref_id,
    v_active_mode,
    v_reg_status
  ) RETURNING id INTO v_registration_id;

  -- 17. Insert Captain into tournament_players
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

  -- 18. Insert Teammates into tournament_players
  IF v_actual_teammates > 0 THEN
    FOR v_idx IN 1..v_actual_teammates LOOP
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
        v_norm_teammates[v_idx],
        'Member'
      );
    END LOOP;
  END IF;

  -- 19. Insert Substitutes into tournament_players
  IF p_has_substitutes AND array_length(v_norm_substitutes, 1) > 0 THEN
    FOR v_idx IN 1..array_length(v_norm_substitutes, 1) LOOP
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
        v_norm_substitutes[v_idx],
        'Substitute'
      );
    END LOOP;
  END IF;

  -- 20. If Paid Tournament, Consume and Link Payment Record Atomically
  IF v_entry_fee > 0.00 AND v_payment.id IS NOT NULL THEN
    UPDATE public.tournament_payments
    SET
      status = 'CONSUMED',
      registration_id = v_registration_id,
      consumed_at = NOW(),
      updated_at = NOW()
    WHERE id = v_payment.id;
  END IF;

  -- 21. Increment tournament registered_teams and append sanitized teams_list
  IF v_reg_status = 'Waitlist' THEN
    UPDATE public.tournaments
    SET
      teams_list = COALESCE(teams_list, '[]'::JSONB) || v_new_team_json,
      updated_at = NOW()
    WHERE id = p_tournament_id;
  ELSE
    UPDATE public.tournaments
    SET
      registered_teams = COALESCE(registered_teams, 0) + 1,
      teams_list = COALESCE(teams_list, '[]'::JSONB) || v_new_team_json,
      updated_at = NOW()
    WHERE id = p_tournament_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'registration_id', v_registration_id,
    'ref_id', v_ref_id,
    'status', v_reg_status,
    'registration_status', v_reg_status,
    'payment_status', CASE WHEN v_entry_fee > 0.00 THEN 'CONSUMED' ELSE 'FREE' END,
    'message', CASE
      WHEN v_reg_status = 'Waitlist' THEN 'Tournament is full. You have been added to the waitlist queue.'
      WHEN v_reg_status = 'Pending' THEN 'Registration submitted successfully. Pending admin review.'
      ELSE 'Registration completed successfully.'
    END
  );
END;
$$;

-- Revoke default public execution privileges
REVOKE EXECUTE ON FUNCTION public.register_tournament_team(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT[], TEXT, INT, INT, BOOLEAN, BOOLEAN, TEXT, TEXT, UUID, TEXT, TEXT[], TEXT[]
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.register_tournament_team(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT[], TEXT, INT, INT, BOOLEAN, BOOLEAN, TEXT, TEXT, UUID, TEXT, TEXT[], TEXT[]
) TO authenticated, service_role;


-- ----------------------------------------------------------------------------
-- 3. STORAGE SECURITY HARDENING ('avatars' BUCKET)
-- ----------------------------------------------------------------------------

-- Enable Row Level Security on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop loose unowned update/delete policies
DROP POLICY IF EXISTS "Authenticated Users Update Avatar" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Users Delete Avatar" ON storage.objects;

-- Re-create strictly requiring object ownership or admin privileges
CREATE POLICY "Authenticated Users Update Avatar"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (
      auth.uid() = owner
      OR auth.uid()::text = (storage.foldername(name))[1]
      OR public.is_admin()
    )
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (
      auth.uid() = owner
      OR auth.uid()::text = (storage.foldername(name))[1]
      OR public.is_admin()
    )
  );

CREATE POLICY "Authenticated Users Delete Avatar"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (
      auth.uid() = owner
      OR auth.uid()::text = (storage.foldername(name))[1]
      OR public.is_admin()
    )
  );


-- ----------------------------------------------------------------------------
-- 4. HARDEN NOTIFICATIONS TABLE RLS (PREVENT SPOOFING)
-- ----------------------------------------------------------------------------

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "System or Admins insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users or Admins insert notifications" ON public.notifications;

-- Enforce that a user can only create notifications for their own account, or be an admin
CREATE POLICY "Users or Admins insert notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    OR public.is_admin()
  );


-- ----------------------------------------------------------------------------
-- 5. HARDEN FINANCIAL TABLES ZERO-WRITE PRIVILEGES
-- ----------------------------------------------------------------------------

-- Revoke direct write privileges from anon and authenticated
REVOKE INSERT, UPDATE, DELETE ON public.wallets FROM anon, authenticated, public;
REVOKE INSERT, UPDATE, DELETE ON public.wallet_ledger FROM anon, authenticated, public;
REVOKE INSERT, UPDATE, DELETE ON public.wallet_transactions FROM anon, authenticated, public;
REVOKE INSERT, UPDATE, DELETE ON public.tournament_payments FROM anon, authenticated, public;
REVOKE INSERT, UPDATE, DELETE ON public.wallet_withdrawals FROM anon, authenticated, public;

-- Drop overly permissive insert policy on wallet_transactions if created
DROP POLICY IF EXISTS "Admins insert wallet transactions" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Users insert wallet transactions" ON public.wallet_transactions;

CREATE POLICY "Admins insert wallet transactions"
  ON public.wallet_transactions FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());


-- ----------------------------------------------------------------------------
-- 6. REVOKE DIRECT CLIENT DELETIONS (REGISTRATIONS & PLAYERS)
-- ----------------------------------------------------------------------------

-- Revoke direct DELETE privileges on registrations and player rosters
REVOKE DELETE ON public.tournament_registrations FROM anon, authenticated, public;
REVOKE DELETE ON public.tournament_players FROM anon, authenticated, public;

-- Replace user DELETE policies with Admin-only
DROP POLICY IF EXISTS "Admins or owners delete registrations" ON public.tournament_registrations;
CREATE POLICY "Admins only delete registrations"
  ON public.tournament_registrations FOR DELETE
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Users or admins delete player records" ON public.tournament_players;
CREATE POLICY "Admins only delete player records"
  ON public.tournament_players FOR DELETE
  TO authenticated
  USING (public.is_admin());
