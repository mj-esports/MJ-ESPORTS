-- ============================================================================
-- MJ ESPORTS — Phase 7.1 Hardened: Atomic Finalization & Authoritative Payout Guards
-- Target Engine: Supabase PostgreSQL
-- Description:
--   1. Ensures public.tournament_registrations status CHECK allows 'Completed'.
--   2. Implements hardened public.finalize_tournament_results RPC:
--      - Step 1: Admin / Service-Role authorization check.
--      - Step 2: Row-level lock (FOR UPDATE) for concurrency race safety.
--      - Step 3: Strict lifecycle gating: ONLY 'Live', 'Live Now', 'Results Pending' allowed.
--      - Step 4: Strict prize model detection and fail-closed validation.
--      - Step 5: Safe numeric per-kill rate parsing (regex verified before casting).
--      - Step 6: Safe numeric placement & prize tier parsing (fails closed on malformed values).
--      - Step 7: Safe numeric team kills aggregation (fails closed on non-numeric text).
--      - Step 8: Authoritative effective prize ceiling calculation (0 kills = ₹0 ceiling).
--      - Step 9: Preflight payout proposals validation & rank uniqueness (fails closed).
--      - Step 10: Cumulative active liability tracking against effective ceiling.
--      - Step 11: Idempotency protection with amount-tampering detection.
--      - Step 12: TEXT-based source_result_id parsing with safe UUID casting (NULL for non-UUIDs).
--      - Step 13: Full sanitization of teams_list removing internal admin audit data.
--      - Step 14: Atomic update of tournaments, registrations, and payout_queue.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ALIGN TOURNAMENT REGISTRATIONS STATUS CHECK CONSTRAINT
-- ----------------------------------------------------------------------------
ALTER TABLE public.tournament_registrations DROP CONSTRAINT IF EXISTS tournament_registrations_status_check;
ALTER TABLE public.tournament_registrations ADD CONSTRAINT tournament_registrations_status_check 
  CHECK (status IN ('Pending', 'Approved', 'Confirmed', 'Rejected', 'Completed'));

-- ----------------------------------------------------------------------------
-- 2. HARDENED ATOMIC TOURNAMENT FINALIZATION RPC
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.finalize_tournament_results(
  p_tournament_id TEXT,
  p_teams_list JSONB,
  p_winner_team TEXT,
  p_winner_captain TEXT,
  p_payout_proposals JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_tourn RECORD;
  v_tourn_json JSONB;
  v_prize_type TEXT := '';
  v_raw_pool TEXT := '';
  v_is_per_kill_only BOOLEAN := FALSE;
  v_is_hybrid BOOLEAN := FALSE;
  v_is_winner_takes_all BOOLEAN := FALSE;
  v_is_placement_only BOOLEAN := FALSE;
  
  v_per_kill_rate NUMERIC := 0;
  v_parsed_placement_pool NUMERIC := 0;
  v_effective_prize_ceiling NUMERIC := 0;
  v_total_kills_submitted NUMERIC := 0;
  
  v_prize_1st NUMERIC := 0;
  v_prize_2nd NUMERIC := 0;
  v_prize_3rd NUMERIC := 0;
  
  v_existing_active_liability NUMERIC := 0;
  v_new_proposed_liability NUMERIC := 0;
  v_total_proposed_amount NUMERIC := 0;
  
  v_seen_ranks INT[] := ARRAY[]::INT[];
  v_proposal RECORD;
  v_proposal_amount NUMERIC := 0;
  v_generated_idempotency TEXT;
  v_matched_team JSONB;
  v_matched_kills NUMERIC := 0;
  v_team_max_winnings NUMERIC := 0;
  v_placement_component NUMERIC := 0;
  v_existing_payout_for_key NUMERIC;
  
  v_sanitized_teams JSONB := '[]'::jsonb;
  v_team_elem JSONB;
  v_clean_team JSONB;
  v_payout_count INT := 0;
  v_match_text TEXT;
  v_raw_text TEXT;
  v_clean_text TEXT;
BEGIN
  -- --------------------------------------------------------------------------
  -- STEP 1: AUTHORIZATION CHECK (Admin or Service Role)
  -- --------------------------------------------------------------------------
  v_user_id := auth.uid();
  IF NOT (public.is_admin() OR (SELECT current_setting('role', true)) = 'service_role') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'UNAUTHORIZED',
      'message', 'Only authorized administrators can finalize tournament results.'
    );
  END IF;

  -- --------------------------------------------------------------------------
  -- STEP 2: INPUT VALIDATION
  -- --------------------------------------------------------------------------
  IF p_tournament_id IS NULL OR TRIM(p_tournament_id) = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_TOURNAMENT',
      'message', 'Tournament ID is required.'
    );
  END IF;

  -- --------------------------------------------------------------------------
  -- STEP 3: ROW-LEVEL LOCK FOR UPDATE (Prevents concurrent finalization race)
  -- --------------------------------------------------------------------------
  SELECT * INTO v_tourn 
  FROM public.tournaments 
  WHERE id = p_tournament_id 
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'TOURNAMENT_NOT_FOUND',
      'message', 'Tournament not found.'
    );
  END IF;

  -- --------------------------------------------------------------------------
  -- STEP 4: STRICT LIFECYCLE GUARD (Terminal states blocked)
  -- --------------------------------------------------------------------------
  IF v_tourn.status NOT IN ('Live', 'Live Now', 'Results Pending') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_LIFECYCLE_STATE',
      'message', 'Tournament cannot be finalized from current status: ' || v_tourn.status
    );
  END IF;

  v_tourn_json := to_jsonb(v_tourn);
  v_prize_type := LOWER(TRIM(COALESCE(v_tourn_json->>'prize_type', v_tourn_json->>'prizeType', '')));
  v_raw_pool := LOWER(TRIM(COALESCE(v_tourn.prize_pool, '')));

  -- --------------------------------------------------------------------------
  -- STEP 5: PRIZE STRUCTURE & MODEL DETECTION
  -- --------------------------------------------------------------------------
  IF v_prize_type = 'winner_takes_all' OR v_raw_pool LIKE '%winner takes all%' THEN
    v_is_winner_takes_all := TRUE;
  ELSIF v_prize_type IN ('placement_kill', 'placement_plus_kill') 
     OR (v_raw_pool LIKE '%+%' AND (v_raw_pool ~* 'per\s*kill' OR v_raw_pool ~* '/\s*kill')) THEN
    v_is_hybrid := TRUE;
  ELSIF v_prize_type = 'per_kill' 
     OR (v_raw_pool ~* 'per\s*kill' OR v_raw_pool ~* '/\s*kill') THEN
    v_is_per_kill_only := TRUE;
  ELSE
    v_is_placement_only := TRUE;
  END IF;

  -- --------------------------------------------------------------------------
  -- STEP 6: SAFE PER-KILL RATE PARSING & FAIL-CLOSED VALIDATION
  -- --------------------------------------------------------------------------
  IF v_is_per_kill_only OR v_is_hybrid THEN
    -- Check structured per_kill_reward if valid numeric text
    v_raw_text := v_tourn_json->>'per_kill_reward';
    IF v_raw_text IS NOT NULL AND TRIM(v_raw_text) ~ '^[0-9]+(\.[0-9]+)?$' THEN
      v_per_kill_rate := TRIM(v_raw_text)::NUMERIC;
    END IF;

    -- If not yet parsed from structured property, extract via regex from prize_pool string
    IF v_per_kill_rate <= 0 THEN
      v_match_text := (regexp_match(v_tourn.prize_pool, '(?:per\s*kill|\/\s*kill)\D*([0-9,]+)', 'i'))[1];
      IF v_match_text IS NULL THEN
        v_match_text := (regexp_match(v_tourn.prize_pool, '(?:₹|rs\.?)\s*([0-9,]+)\s*(?:\/|\s*per)\s*kill', 'i'))[1];
      END IF;
      IF v_match_text IS NULL THEN
        v_match_text := (regexp_match(v_tourn.prize_pool, '([0-9,]+)\s*(?:\/|\s*per)\s*kill', 'i'))[1];
      END IF;

      IF v_match_text IS NOT NULL AND REPLACE(v_match_text, ',', '') ~ '^[0-9]+(\.[0-9]+)?$' THEN
        v_per_kill_rate := REPLACE(v_match_text, ',', '')::NUMERIC;
      END IF;
    END IF;

    -- FAIL CLOSED: Per-kill rate must be positive and explicitly parseable
    IF v_per_kill_rate IS NULL OR v_per_kill_rate <= 0 THEN
      RETURN jsonb_build_object(
        'success', false,
        'error_code', 'INVALID_PRIZE_CONFIGURATION',
        'message', 'Failed to parse a valid per-kill reward rate from tournament prize configuration: ' || COALESCE(v_tourn.prize_pool, 'NULL')
      );
    END IF;
  END IF;

  -- --------------------------------------------------------------------------
  -- STEP 7: SAFE PLACEMENT / WINNER-TAKES-ALL PRIZE POOL PARSING
  -- --------------------------------------------------------------------------
  IF v_is_placement_only OR v_is_hybrid OR v_is_winner_takes_all THEN
    v_match_text := (regexp_match(SPLIT_PART(v_tourn.prize_pool, '+', 1), '(?:₹|rs\.?)\s*([0-9,]+)', 'i'))[1];
    IF v_match_text IS NULL THEN
      v_match_text := (regexp_match(SPLIT_PART(v_tourn.prize_pool, '+', 1), '([0-9,]+)'))[1];
    END IF;
    IF v_match_text IS NOT NULL AND REPLACE(v_match_text, ',', '') ~ '^[0-9]+(\.[0-9]+)?$' THEN
      v_parsed_placement_pool := REPLACE(v_match_text, ',', '')::NUMERIC;
    END IF;

    -- If placement pool is not positive and positive payouts are proposed, FAIL CLOSED
    IF v_parsed_placement_pool <= 0 AND p_payout_proposals IS NOT NULL AND jsonb_array_length(p_payout_proposals) > 0 AND NOT v_is_per_kill_only THEN
      RETURN jsonb_build_object(
        'success', false,
        'error_code', 'INVALID_PRIZE_CONFIGURATION',
        'message', 'Failed to parse legitimate prize pool from tournament configuration: ' || COALESCE(v_tourn.prize_pool, 'NULL')
      );
    END IF;

    -- Safely load and validate explicit prize tiers if present in configuration
    IF v_tourn_json->'prizes' IS NOT NULL THEN
      -- Validate firstPrize / first_prize
      v_raw_text := COALESCE(v_tourn_json->'prizes'->>'firstPrize', v_tourn_json->'prizes'->>'first_prize');
      IF v_raw_text IS NOT NULL AND TRIM(v_raw_text) != '' THEN
        v_clean_text := REGEXP_REPLACE(v_raw_text, '[^0-9.]', '', 'g');
        IF v_clean_text ~ '^[0-9]+(\.[0-9]+)?$' THEN
          v_prize_1st := v_clean_text::NUMERIC;
        ELSE
          RETURN jsonb_build_object(
            'success', false,
            'error_code', 'INVALID_PRIZE_CONFIGURATION',
            'message', 'Configured firstPrize contains invalid non-numeric value: ' || v_raw_text
          );
        END IF;
      END IF;

      -- Validate secondPrize / second_prize
      v_raw_text := COALESCE(v_tourn_json->'prizes'->>'secondPrize', v_tourn_json->'prizes'->>'second_prize');
      IF v_raw_text IS NOT NULL AND TRIM(v_raw_text) != '' THEN
        v_clean_text := REGEXP_REPLACE(v_raw_text, '[^0-9.]', '', 'g');
        IF v_clean_text ~ '^[0-9]+(\.[0-9]+)?$' THEN
          v_prize_2nd := v_clean_text::NUMERIC;
        ELSE
          RETURN jsonb_build_object(
            'success', false,
            'error_code', 'INVALID_PRIZE_CONFIGURATION',
            'message', 'Configured secondPrize contains invalid non-numeric value: ' || v_raw_text
          );
        END IF;
      END IF;

      -- Validate thirdPrize / third_prize
      v_raw_text := COALESCE(v_tourn_json->'prizes'->>'thirdPrize', v_tourn_json->'prizes'->>'third_prize');
      IF v_raw_text IS NOT NULL AND TRIM(v_raw_text) != '' THEN
        v_clean_text := REGEXP_REPLACE(v_raw_text, '[^0-9.]', '', 'g');
        IF v_clean_text ~ '^[0-9]+(\.[0-9]+)?$' THEN
          v_prize_3rd := v_clean_text::NUMERIC;
        ELSE
          RETURN jsonb_build_object(
            'success', false,
            'error_code', 'INVALID_PRIZE_CONFIGURATION',
            'message', 'Configured thirdPrize contains invalid non-numeric value: ' || v_raw_text
          );
        END IF;
      END IF;
    END IF;

    -- Fallback to standard 60/25/15 placement distribution if explicit tiers are not defined
    IF v_prize_1st = 0 AND v_prize_2nd = 0 AND v_parsed_placement_pool > 0 THEN
      v_prize_1st := ROUND(v_parsed_placement_pool * 0.60);
      v_prize_2nd := ROUND(v_parsed_placement_pool * 0.25);
      v_prize_3rd := GREATEST(0, v_parsed_placement_pool - v_prize_1st - v_prize_2nd);
    END IF;
  END IF;

  -- --------------------------------------------------------------------------
  -- STEP 8: SAFE AGGREGATION OF SUBMITTED KILLS ACROSS TEAMS (FAILS CLOSED)
  -- --------------------------------------------------------------------------
  IF p_teams_list IS NOT NULL AND jsonb_typeof(p_teams_list) = 'array' THEN
    FOR v_team_elem IN SELECT * FROM jsonb_array_elements(p_teams_list) LOOP
      v_raw_text := COALESCE(v_team_elem->>'kills', v_team_elem->>'finishes');
      IF v_raw_text IS NOT NULL AND TRIM(v_raw_text) != '' THEN
        IF TRIM(v_raw_text) ~ '^[0-9]+$' THEN
          v_total_kills_submitted := v_total_kills_submitted + TRIM(v_raw_text)::NUMERIC;
        ELSE
          RETURN jsonb_build_object(
            'success', false,
            'error_code', 'INVALID_RESULT_DATA',
            'message', 'Team ' || COALESCE(v_team_elem->>'name', 'Unknown') || ' (rank ' || COALESCE(v_team_elem->>'rank', '0') || ') has invalid non-numeric kills value: ' || v_raw_text
          );
        END IF;
      END IF;
    END LOOP;
  END IF;

  -- --------------------------------------------------------------------------
  -- STEP 9: EFFECTIVE PRIZE CEILING CALCULATION
  -- --------------------------------------------------------------------------
  IF v_is_per_kill_only THEN
    v_effective_prize_ceiling := v_total_kills_submitted * v_per_kill_rate;
  ELSIF v_is_hybrid THEN
    v_effective_prize_ceiling := v_parsed_placement_pool + (v_total_kills_submitted * v_per_kill_rate);
  ELSE
    v_effective_prize_ceiling := v_parsed_placement_pool;
  END IF;

  -- --------------------------------------------------------------------------
  -- STEP 10: PREFLIGHT PAYOUT PROPOSALS VALIDATION & INTEGRITY GUARDS
  -- --------------------------------------------------------------------------
  IF p_payout_proposals IS NOT NULL AND jsonb_typeof(p_payout_proposals) = 'array' THEN
    FOR v_proposal IN SELECT * FROM jsonb_to_recordset(p_payout_proposals) AS x(
      winner_user_id UUID,
      winner_game_uid TEXT,
      winner_game_ign TEXT,
      rank INT,
      payout_amount TEXT,
      idempotency_key TEXT,
      source_result_id TEXT
    ) LOOP
      -- A. Validate numeric payout amount strictly (fails closed on malformed text or non-positive value)
      IF v_proposal.payout_amount IS NULL OR TRIM(v_proposal.payout_amount) !~ '^[0-9]+(\.[0-9]+)?$' THEN
        RETURN jsonb_build_object(
          'success', false,
          'error_code', 'INVALID_PAYOUT_AMOUNT',
          'message', 'Payout proposal for rank ' || COALESCE(v_proposal.rank, 0) || ' has an invalid or non-numeric amount.'
        );
      END IF;

      v_proposal_amount := TRIM(v_proposal.payout_amount)::NUMERIC;
      IF v_proposal_amount <= 0 THEN
        RETURN jsonb_build_object(
          'success', false,
          'error_code', 'INVALID_PAYOUT_AMOUNT',
          'message', 'Payout proposal for rank ' || COALESCE(v_proposal.rank, 0) || ' must be greater than zero.'
        );
      END IF;

      -- B. Invariant 1: Exactly one proposal per competitive rank (reject duplicate ranks BEFORE mutations)
      IF v_proposal.rank = ANY(v_seen_ranks) THEN
        RETURN jsonb_build_object(
          'success', false,
          'error_code', 'DUPLICATE_TEAM_PROPOSAL',
          'message', 'Multiple payout proposals detected for rank ' || v_proposal.rank || '. Exactly one proposal per competitive rank is permitted.'
        );
      END IF;
      v_seen_ranks := array_append(v_seen_ranks, v_proposal.rank);

      v_total_proposed_amount := v_total_proposed_amount + v_proposal_amount;

      -- C. Match proposal strictly by rank in p_teams_list
      SELECT elem INTO v_matched_team
      FROM jsonb_array_elements(p_teams_list) AS elem
      WHERE (elem->>'rank')::INT = v_proposal.rank
      LIMIT 1;

      IF v_matched_team IS NULL THEN
        RETURN jsonb_build_object(
          'success', false,
          'error_code', 'INVALID_PAYOUT_DISTRIBUTION',
          'message', 'Cannot verify payout proposal: team for rank ' || v_proposal.rank || ' not found in teams list.'
        );
      END IF;

      -- D. Team identity is verified strictly through rank and the matched teams_list entry.
      -- source_result_id is optional scorecard provenance and is not compared to teams_list.id.
      v_raw_text := COALESCE(v_matched_team->>'kills', v_matched_team->>'finishes');
      IF v_raw_text IS NOT NULL AND TRIM(v_raw_text) != '' THEN
        IF TRIM(v_raw_text) ~ '^[0-9]+$' THEN
          v_matched_kills := TRIM(v_raw_text)::NUMERIC;
        ELSE
          RETURN jsonb_build_object(
            'success', false,
            'error_code', 'INVALID_RESULT_DATA',
            'message', 'Matched team for rank ' || v_proposal.rank || ' has invalid non-numeric kills value: ' || v_raw_text
          );
        END IF;
      ELSE
        v_matched_kills := 0;
      END IF;

      -- E. Calculate maximum legitimate winnings for this individual team
      IF v_is_winner_takes_all THEN
        IF v_proposal.rank = 1 THEN
          v_team_max_winnings := v_effective_prize_ceiling;
        ELSE
          v_team_max_winnings := 0;
        END IF;
      ELSIF v_is_per_kill_only THEN
        v_team_max_winnings := v_matched_kills * v_per_kill_rate;
      ELSIF v_is_hybrid THEN
        IF v_proposal.rank = 1 THEN v_placement_component := v_prize_1st;
        ELSIF v_proposal.rank = 2 THEN v_placement_component := v_prize_2nd;
        ELSIF v_proposal.rank = 3 THEN v_placement_component := v_prize_3rd;
        ELSE v_placement_component := 0;
        END IF;
        v_team_max_winnings := v_placement_component + (v_matched_kills * v_per_kill_rate);
      ELSE -- Placement Only
        IF v_proposal.rank = 1 THEN v_team_max_winnings := v_prize_1st;
        ELSIF v_proposal.rank = 2 THEN v_team_max_winnings := v_prize_2nd;
        ELSIF v_proposal.rank = 3 THEN v_team_max_winnings := v_prize_3rd;
        ELSE v_team_max_winnings := 0;
        END IF;
      END IF;

      -- F. Invariant 2: Proposal cannot exceed legitimate winnings
      IF v_proposal_amount > v_team_max_winnings THEN
        RETURN jsonb_build_object(
          'success', false,
          'error_code', 'INVALID_PAYOUT_DISTRIBUTION',
          'message', 'Proposed payout of ₹' || v_proposal_amount || ' for rank ' || v_proposal.rank || 
                     ' exceeds authorized team earnings of ₹' || v_team_max_winnings || '.'
        );
      END IF;

      -- G. Construct idempotency key and detect amount tampering on retries
      v_generated_idempotency := COALESCE(
        v_proposal.idempotency_key,
        'pay_q_' || p_tournament_id || '_rank' || COALESCE(v_proposal.rank, 1) || '_' || 
        COALESCE(v_proposal.winner_game_uid, COALESCE(v_proposal.winner_user_id::text, MD5(COALESCE(v_proposal.winner_game_ign, 'winner'))))
      );

      SELECT payout_amount INTO v_existing_payout_for_key
      FROM public.payout_queue
      WHERE idempotency_key = v_generated_idempotency;

      IF FOUND THEN
        IF v_existing_payout_for_key != v_proposal_amount THEN
          RETURN jsonb_build_object(
            'success', false,
            'error_code', 'IDEMPOTENCY_AMOUNT_MISMATCH',
            'message', 'Idempotency key ' || v_generated_idempotency || ' already exists with different payout amount (₹' || v_existing_payout_for_key || ').'
          );
        END IF;
      ELSE
        v_new_proposed_liability := v_new_proposed_liability + v_proposal_amount;
      END IF;
    END LOOP;
  END IF;

  -- --------------------------------------------------------------------------
  -- STEP 11: CUMULATIVE ACTIVE PRIZE POOL CEILING GUARD
  -- --------------------------------------------------------------------------
  SELECT COALESCE(SUM(payout_amount), 0) INTO v_existing_active_liability
  FROM public.payout_queue
  WHERE tournament_id = p_tournament_id
    AND status IN (
      'PENDING_REVIEW',
      'AWAITING_OWNER_APPROVAL',
      'APPROVED',
      'READY_FOR_EXECUTION',
      'PROCESSING',
      'COMPLETED'
    );

  IF (v_existing_active_liability + v_new_proposed_liability) > v_effective_prize_ceiling THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'EXCEEDS_PRIZE_POOL',
      'message', 'Total payout liability (₹' || (v_existing_active_liability + v_new_proposed_liability) || 
                 ') exceeds legitimate prize pool ceiling of ₹' || v_effective_prize_ceiling || 
                 ' (Existing active: ₹' || v_existing_active_liability || ', New proposed: ₹' || v_new_proposed_liability || ').'
    );
  END IF;

  -- --------------------------------------------------------------------------
  -- STEP 12: SANITIZE TEAMS LIST FOR PUBLIC STORAGE
  -- --------------------------------------------------------------------------
  IF p_teams_list IS NOT NULL AND jsonb_typeof(p_teams_list) = 'array' THEN
    FOR v_team_elem IN SELECT * FROM jsonb_array_elements(p_teams_list) LOOP
      v_clean_team := v_team_elem - 'flagReason' - 'internalNotes' - 'adminAudit' - 'disputeNotes' - 'auditLogs';
      v_sanitized_teams := v_sanitized_teams || v_clean_team;
    END LOOP;
  ELSE
    v_sanitized_teams := COALESCE(v_tourn.teams_list, '[]'::jsonb);
  END IF;

  -- --------------------------------------------------------------------------
  -- STEP 13: ATOMIC DATABASE MUTATIONS
  -- --------------------------------------------------------------------------
  -- A. Update Tournament Status and Scores
  UPDATE public.tournaments
  SET 
    teams_list = v_sanitized_teams,
    status = 'Completed',
    winner_team = COALESCE(p_winner_team, v_tourn.winner_team, 'Grand Champions'),
    winner_captain = COALESCE(p_winner_captain, v_tourn.winner_captain, 'Champion Captain'),
    updated_at = NOW()
  WHERE id = p_tournament_id;

  -- B. Update Registrations to Completed
  UPDATE public.tournament_registrations
  SET 
    status = 'Completed',
    updated_at = NOW()
  WHERE tournament_id = p_tournament_id
    AND status != 'Rejected';

  -- C. Enqueue Verified Payout Proposals with Safe UUID Handling
  IF p_payout_proposals IS NOT NULL AND jsonb_typeof(p_payout_proposals) = 'array' THEN
    FOR v_proposal IN SELECT * FROM jsonb_to_recordset(p_payout_proposals) AS x(
      winner_user_id UUID,
      winner_game_uid TEXT,
      winner_game_ign TEXT,
      rank INT,
      payout_amount TEXT,
      idempotency_key TEXT,
      source_result_id TEXT
    ) LOOP
      IF v_proposal.payout_amount IS NOT NULL AND TRIM(v_proposal.payout_amount) ~ '^[0-9]+(\.[0-9]+)?$' THEN
        v_proposal_amount := TRIM(v_proposal.payout_amount)::NUMERIC;
        IF v_proposal_amount > 0 THEN
          v_generated_idempotency := COALESCE(
            v_proposal.idempotency_key,
            'pay_q_' || p_tournament_id || '_rank' || COALESCE(v_proposal.rank, 1) || '_' || 
            COALESCE(v_proposal.winner_game_uid, COALESCE(v_proposal.winner_user_id::text, MD5(COALESCE(v_proposal.winner_game_ign, 'winner'))))
          );

          INSERT INTO public.payout_queue (
            tournament_id,
            source_result_id,
            winner_user_id,
            winner_game_uid,
            winner_game_ign,
            rank,
            payout_amount,
            currency,
            status,
            idempotency_key
          ) VALUES (
            p_tournament_id,
            CASE 
              WHEN v_proposal.source_result_id IS NOT NULL 
               AND TRIM(v_proposal.source_result_id) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
               AND EXISTS (SELECT 1 FROM public.match_scorecards WHERE id = TRIM(v_proposal.source_result_id)::UUID)
              THEN TRIM(v_proposal.source_result_id)::UUID 
              ELSE NULL 
            END,
            v_proposal.winner_user_id,
            v_proposal.winner_game_uid,
            COALESCE(v_proposal.winner_game_ign, 'Grand Champion'),
            COALESCE(v_proposal.rank, 1),
            v_proposal_amount,
            'INR',
            'PENDING_REVIEW',
            v_generated_idempotency
          )
          ON CONFLICT (idempotency_key) DO NOTHING;

          IF FOUND THEN
            v_payout_count := v_payout_count + 1;
          END IF;
        END IF;
      END IF;
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'tournament_id', p_tournament_id,
    'status', 'Completed',
    'payouts_queued_count', v_payout_count,
    'total_payout_amount', v_total_proposed_amount,
    'effective_prize_ceiling', v_effective_prize_ceiling,
    'message', 'Tournament results successfully finalized. Registrations marked Completed and ' || v_payout_count || ' payout proposals queued.'
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- 3. PERMISSIONS & RPC SECURITY GRANTS
-- ----------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.finalize_tournament_results(TEXT, JSONB, TEXT, TEXT, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.finalize_tournament_results(TEXT, JSONB, TEXT, TEXT, JSONB) TO authenticated, service_role;
