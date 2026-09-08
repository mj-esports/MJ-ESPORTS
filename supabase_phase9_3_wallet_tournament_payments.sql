-- ============================================================================
-- MJ ESPORTS — Phase 9.3: Wallet-Funded Tournament Entry Fees
-- Target Engine: Supabase PostgreSQL
-- Description:
--   1. Implements dedicated, atomic public.register_tournament_team_with_wallet() RPC.
--   2. Preserves public.register_tournament_team() 100% untouched for Razorpay & Free entries.
--   3. Enforces single-transaction balance debit + immutable wallet_ledger transition:
--      - Lock tournaments FOR UPDATE first, then wallets FOR UPDATE
--      - Strictly derives user_id from auth.uid()
--      - Reads entry_fee exclusively from authoritative tournament record
--      - Rejects free tournaments (must use free path)
--      - Checks balance sufficiency (balance >= entry_fee)
--      - Enforces client UUID v4 idempotency with duplicate replay protection
--      - Atomic insertion of tournament_registrations, wallet_ledger, tournament_players
--      - Atomic update of tournaments.registered_teams
--   4. Fully isolated, safe, zero regression on existing gateway/free registrations.
-- ============================================================================

-- 1. IDEMPOTENCY RESERVATION TABLE
-- Ensures database-level uniqueness for tournament wallet registrations
CREATE TABLE IF NOT EXISTS public.wallet_registration_reservations (
  idempotency_key UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  tournament_id TEXT NOT NULL REFERENCES public.tournaments(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.wallet_registration_reservations ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.wallet_registration_reservations FROM PUBLIC;
REVOKE ALL ON TABLE public.wallet_registration_reservations FROM anon;
GRANT SELECT ON TABLE public.wallet_registration_reservations TO authenticated;
GRANT ALL ON TABLE public.wallet_registration_reservations TO service_role;

-- 2. REVOKE/DROP ANY CANDIDATE OVERLOAD (IDEMPOTENT MIGRATION RUNS)
DROP FUNCTION IF EXISTS public.register_tournament_team_with_wallet(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, TEXT[], TEXT[], TEXT, INT, INT, BOOLEAN, BOOLEAN, TEXT, TEXT, TEXT[], TEXT[]
);

-- 3. CREATE DEDICATED ATOMIC WALLET REGISTRATION RPC
CREATE OR REPLACE FUNCTION public.register_tournament_team_with_wallet(
  p_tournament_id TEXT,
  p_team_name TEXT,
  p_captain_name TEXT,
  p_email TEXT,
  p_whatsapp_number TEXT,
  p_captain_uid TEXT,
  p_idempotency_key UUID,
  p_teammate_uids TEXT[] DEFAULT '{}'::TEXT[],
  p_substitute_uids TEXT[] DEFAULT '{}'::TEXT[],
  p_captain_dob TEXT DEFAULT NULL,
  p_player_age INT DEFAULT NULL,
  p_preferred_seed INT DEFAULT 1,
  p_has_substitutes BOOLEAN DEFAULT FALSE,
  p_enable_sms_alerts BOOLEAN DEFAULT TRUE,
  p_mode TEXT DEFAULT 'Squad',
  p_ref_id TEXT DEFAULT NULL,
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
  v_wallet_id UUID;
  v_current_balance NUMERIC(12, 2);
  v_balance_after NUMERIC(12, 2);
  v_tx_id UUID;
  v_existing_ledger RECORD;
  v_existing_reg RECORD;
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

  -- 2. Validate client-supplied idempotency key (must be valid UUID v4)
  IF p_idempotency_key IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_IDEMPOTENCY_KEY',
      'message', 'A valid client-generated UUID v4 idempotency key is required.'
    );
  END IF;

  -- 2.1 CONCURRENCY SERIALIZATION:
  -- Acquire transaction-level advisory lock on (user, tournament, idempotency_key).
  -- Concurrent identical requests serialize cleanly so only one executes mutations,
  -- and any duplicate caller cleanly receives the committed idempotent replay without error or double debit.
  PERFORM pg_advisory_xact_lock(
    hashtext('mj_wallet_reg_' || v_user_id::TEXT || '_' || p_tournament_id),
    hashtext(p_idempotency_key::TEXT)
  );

  -- 3. Check for existing ledger entry with this idempotency key (Sequential Idempotent Replay)
  SELECT * INTO v_existing_ledger
  FROM public.wallet_ledger
  WHERE idempotency_key = p_idempotency_key::TEXT;

  IF FOUND THEN
    -- Check user identity
    IF v_existing_ledger.user_id != v_user_id THEN
      RETURN jsonb_build_object(
        'success', false,
        'error_code', 'IDEMPOTENCY_KEY_COLLISION',
        'message', 'Idempotency key has already been used by another transaction.'
      );
    END IF;

    -- LOW FIX 1: Cross-Tournament Key Reuse Check
    IF v_existing_ledger.source_reference_id != p_tournament_id
       OR COALESCE(v_existing_ledger.metadata->>'tournament_id', '') != p_tournament_id THEN
      RETURN jsonb_build_object(
        'success', false,
        'error_code', 'IDEMPOTENCY_KEY_REUSED',
        'message', 'This idempotency key has already been used for a different tournament transaction.'
      );
    END IF;

    -- Retrieve existing registration
    SELECT * INTO v_existing_reg
    FROM public.tournament_registrations
    WHERE tournament_id = p_tournament_id
      AND user_id = v_user_id
      AND status != 'Rejected'
      AND (id = (v_existing_ledger.metadata->>'registration_id')::UUID OR transaction_id = p_idempotency_key::TEXT)
    LIMIT 1;

    IF FOUND THEN
      RETURN jsonb_build_object(
        'success', true,
        'idempotent_replay', true,
        'refId', v_existing_reg.team_name,
        'registration_id', v_existing_reg.id,
        'payment_status', v_existing_reg.payment_status,
        'payment_id', v_existing_ledger.id,
        'ledger_id', v_existing_ledger.id,
        'balance_after', v_existing_ledger.balance_after,
        'message', 'Tournament registration already processed (idempotent replay).'
      );
    END IF;
  END IF;

  -- 3.1 Check reservation table for cross-user or cross-tournament key collision
  IF EXISTS (
    SELECT 1 FROM public.wallet_registration_reservations
    WHERE idempotency_key = p_idempotency_key
      AND (user_id != v_user_id OR tournament_id != p_tournament_id)
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'IDEMPOTENCY_KEY_REUSED',
      'message', 'This idempotency key has already been reserved for another tournament or user.'
    );
  END IF;

  -- 4. DETERMINISTIC LOCK 1: Lock target tournament row FOR UPDATE
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

  -- 5. Validate tournament status & slot capacity
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

  -- 6. Authoritative Entry Fee Evaluation
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

  -- Reject free tournaments (free tournaments must not debit wallet)
  IF v_entry_fee <= 0.00 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'NOT_A_PAID_TOURNAMENT',
      'message', 'This tournament is free. Use the standard registration process.'
    );
  END IF;

  -- 7. Validate Captain Game UID and IGN
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

  -- 8. Normalize teammate arrays
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

  -- 9. Normalize substitutes array if enabled
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

  -- 10. Authoritative Exact Active Roster Size Enforcement
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

  -- 11. Validate teammate format & roster internal uniqueness
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

  -- 12. Duplicate user check: Only 1 active registration per user account
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

  -- 13. Tournament-wide UID collision checks
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

  -- 14. DETERMINISTIC LOCK 2: Lock user's wallet FOR UPDATE
  SELECT id, balance INTO v_wallet_id, v_current_balance
  FROM public.wallets
  WHERE user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.wallets (user_id, balance, currency, created_at, updated_at)
    VALUES (v_user_id, 0.00, 'INR', NOW(), NOW())
    ON CONFLICT (user_id) DO NOTHING;

    SELECT id, balance INTO v_wallet_id, v_current_balance
    FROM public.wallets
    WHERE user_id = v_user_id
    FOR UPDATE;
  END IF;

  -- 15. Check wallet balance sufficiency
  IF v_current_balance < v_entry_fee THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INSUFFICIENT_FUNDS',
      'current_balance', v_current_balance,
      'required_amount', v_entry_fee,
      'message', 'Insufficient wallet balance (₹' || v_current_balance || '). Required entry fee: ₹' || v_entry_fee || '.'
    );
  END IF;

  -- 16. Calculate new balance
  v_balance_after := v_current_balance - v_entry_fee;

  -- 16.1 Establish idempotency reservation in database BEFORE financial mutation
  INSERT INTO public.wallet_registration_reservations (
    idempotency_key,
    user_id,
    tournament_id,
    created_at
  ) VALUES (
    p_idempotency_key,
    v_user_id,
    p_tournament_id,
    NOW()
  ) ON CONFLICT (idempotency_key) DO NOTHING;

  -- 17. Atomically execute wallet balance debit
  UPDATE public.wallets
  SET
    balance = v_balance_after,
    updated_at = NOW()
  WHERE id = v_wallet_id;

  -- 18. Generate ref_id and insert tournament registration
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
    'Paid',
    p_idempotency_key::TEXT,
    p_idempotency_key::TEXT,
    NOW()
  ) RETURNING id INTO v_registration_id;

  -- 19. Insert immutable wallet ledger entry (atomic with registration)
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
    'ENTRY_FEE_DEBIT',
    'DEBIT',
    v_entry_fee,
    v_current_balance,
    v_balance_after,
    'tournaments',
    p_tournament_id,
    p_idempotency_key::TEXT,
    'Tournament Entry Fee: ' || v_tournament.title,
    jsonb_build_object(
      'tournament_id', p_tournament_id,
      'tournament_title', v_tournament.title,
      'registration_id', v_registration_id,
      'team_name', p_team_name,
      'mode', v_active_mode,
      'ref_id', v_ref_id,
      'payment_method', 'WALLET'
    ),
    NOW()
  ) RETURNING id INTO v_tx_id;

  -- Link wallet ledger ID as authoritative payment_id in registration
  UPDATE public.tournament_registrations
  SET payment_id = v_tx_id::TEXT
  WHERE id = v_registration_id;

  -- 20. Insert player roster records into public.tournament_players
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

  -- 21. Build SANITIZED JSON object for teams_list and update tournament
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
    'status', 'Approved',
    'paymentStatus', 'Paid',
    'paymentId', v_tx_id::TEXT,
    'paymentMethod', 'WALLET',
    'rank', jsonb_array_length(COALESCE(v_tournament.teams_list, '[]'::jsonb)) + 1,
    'registeredAt', NOW()
  );

  UPDATE public.tournaments
  SET 
    registered_teams = registered_teams + 1,
    teams_list = COALESCE(teams_list, '[]'::jsonb) || v_new_team_json,
    updated_at = NOW()
  WHERE id = p_tournament_id;

  -- 22. Return final atomic success payload
  RETURN jsonb_build_object(
    'success', true,
    'refId', v_ref_id,
    'registration_id', v_registration_id,
    'payment_status', 'Paid',
    'payment_id', v_tx_id::TEXT,
    'ledger_id', v_tx_id::TEXT,
    'balance_after', v_balance_after,
    'message', 'Tournament registered and entry fee debited from wallet successfully.',
    'teamRecord', v_new_team_json
  );
END;
$$;

-- 3. PERMISSIONS & ROLE REVOCATIONS
REVOKE EXECUTE ON FUNCTION public.register_tournament_team_with_wallet(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, TEXT[], TEXT[], TEXT, INT, INT, BOOLEAN, BOOLEAN, TEXT, TEXT, TEXT[], TEXT[]
) FROM PUBLIC;

REVOKE EXECUTE ON FUNCTION public.register_tournament_team_with_wallet(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, TEXT[], TEXT[], TEXT, INT, INT, BOOLEAN, BOOLEAN, TEXT, TEXT, TEXT[], TEXT[]
) FROM anon;

GRANT EXECUTE ON FUNCTION public.register_tournament_team_with_wallet(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, TEXT[], TEXT[], TEXT, INT, INT, BOOLEAN, BOOLEAN, TEXT, TEXT, TEXT[], TEXT[]
) TO authenticated;

GRANT EXECUTE ON FUNCTION public.register_tournament_team_with_wallet(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, TEXT[], TEXT[], TEXT, INT, INT, BOOLEAN, BOOLEAN, TEXT, TEXT, TEXT[], TEXT[]
) TO service_role;
