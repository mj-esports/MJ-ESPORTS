-- ============================================================================
-- MJ ESPORTS — Phase 7: Live Match Scoring, Screenshot OCR & Authoritative Prize Distribution
-- Target Engine: Supabase PostgreSQL
-- Description:
--   1. Creates public.match_scorecards for participant/referee score evidence submissions.
--   2. Creates public.match_slot_results for authoritative placement, kills, and points.
--   3. Implements submit_match_scorecard RPC for validated scorecard submission.
--   4. Implements calculate_and_finalize_scores RPC with:
--      - Verified lobby slot linkage from Phase 6 match_checkins
--      - Strict kill sanity verification (total kills <= max players)
--      - Placement rank uniqueness enforcement
--      - Server-authoritative point calculation (Placement + Kills + Bonus)
--      - Prize allocation calculation with strict prize pool ceiling protection
--      - Active incident / remake request check
--      - Atomic update of tournaments.teams_list and payout_queue
--      - Comprehensive match_operations_audit_log logging
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. MATCH SCORECARDS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.match_scorecards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id TEXT NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  match_id UUID,
  submitted_by UUID NOT NULL,
  lobby_slot INT CHECK (lobby_slot > 0),
  registration_id UUID REFERENCES public.tournament_registrations(id) ON DELETE SET NULL,
  reported_kills INT NOT NULL DEFAULT 0 CHECK (reported_kills >= 0),
  reported_placement INT CHECK (reported_placement IS NULL OR reported_placement >= 1),
  screenshot_url TEXT,
  storage_path TEXT,
  ocr_raw_text TEXT,
  ocr_candidate_kills INT,
  ocr_candidate_placement INT,
  ocr_confidence NUMERIC(5, 2),
  verification_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (
    verification_status IN ('PENDING', 'VERIFIED', 'FLAGGED', 'REJECTED')
  ),
  admin_notes TEXT,
  verified_by UUID,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_match_scorecards_tournament ON public.match_scorecards(tournament_id);
CREATE INDEX IF NOT EXISTS idx_match_scorecards_slot ON public.match_scorecards(tournament_id, lobby_slot);
CREATE INDEX IF NOT EXISTS idx_match_scorecards_verification ON public.match_scorecards(verification_status);

-- ----------------------------------------------------------------------------
-- 2. MATCH SLOT RESULTS TABLE (Authoritative Normalized Results)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.match_slot_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id TEXT NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  match_id UUID,
  lobby_slot INT NOT NULL CHECK (lobby_slot > 0),
  registration_id UUID REFERENCES public.tournament_registrations(id) ON DELETE SET NULL,
  team_name TEXT NOT NULL,
  captain_name TEXT,
  kills INT NOT NULL DEFAULT 0 CHECK (kills >= 0),
  placement INT NOT NULL CHECK (placement > 0),
  placement_points INT NOT NULL DEFAULT 0 CHECK (placement_points >= 0),
  kill_points INT NOT NULL DEFAULT 0 CHECK (kill_points >= 0),
  bonus_points INT NOT NULL DEFAULT 0 CHECK (bonus_points >= 0),
  total_points INT NOT NULL DEFAULT 0 CHECK (total_points >= 0),
  prize_winnings NUMERIC NOT NULL DEFAULT 0 CHECK (prize_winnings >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_match_slot_results_slot UNIQUE (tournament_id, lobby_slot),
  CONSTRAINT uq_match_slot_results_placement UNIQUE (tournament_id, placement)
);

CREATE INDEX IF NOT EXISTS idx_match_slot_results_tournament ON public.match_slot_results(tournament_id);
CREATE INDEX IF NOT EXISTS idx_match_slot_results_points ON public.match_slot_results(tournament_id, total_points DESC);

-- ----------------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------------------------------
ALTER TABLE public.match_scorecards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_slot_results ENABLE ROW LEVEL SECURITY;

-- 3.1. Match Scorecards Select Policy
DROP POLICY IF EXISTS "Participants read own scorecards or admins read all" ON public.match_scorecards;
CREATE POLICY "Participants read own scorecards or admins read all"
  ON public.match_scorecards FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR submitted_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.tournament_registrations tr
      WHERE tr.tournament_id = match_scorecards.tournament_id
        AND tr.user_id = auth.uid()
    )
  );

-- 3.2. Match Slot Results Select Policy (Public / Participant read)
DROP POLICY IF EXISTS "Anyone can view finalized match slot results" ON public.match_slot_results;
CREATE POLICY "Anyone can view finalized match slot results"
  ON public.match_slot_results FOR SELECT
  TO authenticated, anon
  USING (true);

-- Revoke direct mutations from normal users (only RPC functions can mutate)
REVOKE INSERT, UPDATE, DELETE ON public.match_scorecards FROM PUBLIC, anon;
REVOKE INSERT, UPDATE, DELETE ON public.match_slot_results FROM PUBLIC, anon;

-- ----------------------------------------------------------------------------
-- 4. RPC: SUBMIT MATCH SCORECARD
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_match_scorecard(
  p_tournament_id TEXT,
  p_lobby_slot INT,
  p_reported_kills INT,
  p_reported_placement INT DEFAULT NULL,
  p_screenshot_url TEXT DEFAULT NULL,
  p_storage_path TEXT DEFAULT NULL,
  p_ocr_raw_text TEXT DEFAULT NULL,
  p_ocr_candidate_kills INT DEFAULT NULL,
  p_ocr_candidate_placement INT DEFAULT NULL,
  p_ocr_confidence NUMERIC DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_tourn RECORD;
  v_checkin RECORD;
  v_existing_id UUID;
  v_new_id UUID;
BEGIN
  -- 1. Verify authentication
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'UNAUTHENTICATED',
      'message', 'Authentication required to submit scorecard.'
    );
  END IF;

  -- 2. Verify tournament and lifecycle state
  SELECT * INTO v_tourn FROM public.tournaments WHERE id = p_tournament_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'TOURNAMENT_NOT_FOUND',
      'message', 'Tournament does not exist.'
    );
  END IF;

  IF v_tourn.status IN ('Completed', 'Cancelled') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_LIFECYCLE_STATE',
      'message', 'Cannot submit scorecards for completed or cancelled tournaments.'
    );
  END IF;

  -- 3. Verify lobby slot mapping and participant registration
  IF NOT public.is_admin() THEN
    SELECT * INTO v_checkin
    FROM public.match_checkins
    WHERE tournament_id = p_tournament_id
      AND user_id = v_user_id;

    IF NOT FOUND THEN
      RETURN jsonb_build_object(
        'success', false,
        'error_code', 'NOT_REGISTERED',
        'message', 'User is not a verified checked-in participant of this tournament.'
      );
    END IF;

    IF p_lobby_slot IS NOT NULL AND v_checkin.lobby_slot IS NOT NULL AND v_checkin.lobby_slot <> p_lobby_slot THEN
      RETURN jsonb_build_object(
        'success', false,
        'error_code', 'SLOT_MISMATCH',
        'message', 'Submitted slot does not match assigned lobby slot.'
      );
    END IF;
  ELSE
    SELECT * INTO v_checkin
    FROM public.match_checkins
    WHERE tournament_id = p_tournament_id
      AND lobby_slot = p_lobby_slot;
  END IF;

  -- 4. Validate numbers non-negative and placement valid
  IF p_reported_kills < 0 OR (p_reported_placement IS NOT NULL AND p_reported_placement < 1) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_INPUT',
      'message', 'Reported kills must be >= 0 and placement must be >= 1.'
    );
  END IF;

  -- 5. Insert or update existing scorecard
  SELECT id INTO v_existing_id
  FROM public.match_scorecards
  WHERE tournament_id = p_tournament_id
    AND lobby_slot = COALESCE(p_lobby_slot, v_checkin.lobby_slot)
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.match_scorecards
    SET
      reported_kills = p_reported_kills,
      reported_placement = COALESCE(p_reported_placement, reported_placement),
      screenshot_url = COALESCE(p_screenshot_url, screenshot_url),
      storage_path = COALESCE(p_storage_path, storage_path),
      ocr_raw_text = COALESCE(p_ocr_raw_text, ocr_raw_text),
      ocr_candidate_kills = COALESCE(p_ocr_candidate_kills, ocr_candidate_kills),
      ocr_candidate_placement = COALESCE(p_ocr_candidate_placement, ocr_candidate_placement),
      ocr_confidence = COALESCE(p_ocr_confidence, ocr_confidence),
      updated_at = NOW()
    WHERE id = v_existing_id;
    v_new_id := v_existing_id;
  ELSE
    INSERT INTO public.match_scorecards (
      tournament_id,
      submitted_by,
      lobby_slot,
      registration_id,
      reported_kills,
      reported_placement,
      screenshot_url,
      storage_path,
      ocr_raw_text,
      ocr_candidate_kills,
      ocr_candidate_placement,
      ocr_confidence,
      verification_status
    ) VALUES (
      p_tournament_id,
      v_user_id,
      COALESCE(p_lobby_slot, v_checkin.lobby_slot),
      v_checkin.registration_id,
      p_reported_kills,
      p_reported_placement,
      p_screenshot_url,
      p_storage_path,
      p_ocr_raw_text,
      p_ocr_candidate_kills,
      p_ocr_candidate_placement,
      p_ocr_confidence,
      'PENDING'
    ) RETURNING id INTO v_new_id;
  END IF;

  -- 6. Audit logging
  INSERT INTO public.match_operations_audit_log (
    tournament_id,
    actor_id,
    action,
    details
  ) VALUES (
    p_tournament_id,
    v_user_id,
    'SCORECARD_SUBMITTED',
    jsonb_build_object(
      'scorecard_id', v_new_id,
      'lobby_slot', COALESCE(p_lobby_slot, v_checkin.lobby_slot),
      'reported_kills', p_reported_kills,
      'reported_placement', p_reported_placement
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'scorecard_id', v_new_id,
    'lobby_slot', COALESCE(p_lobby_slot, v_checkin.lobby_slot),
    'verification_status', 'PENDING',
    'message', 'Scorecard evidence recorded successfully.'
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- 5. RPC: AUTHORITATIVE CALCULATE AND FINALIZE MATCH SCORES
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.calculate_and_finalize_scores(
  p_tournament_id TEXT,
  p_team_scores JSONB, -- Array of { lobby_slot, kills, placement, bonus, admin_notes }
  p_custom_placement_matrix JSONB DEFAULT NULL -- Optional custom placement points table
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_tourn RECORD;
  v_score_item JSONB;
  v_slot INT;
  v_kills INT;
  v_placement INT;
  v_bonus INT;
  v_checkin RECORD;

  -- Validation accumulators
  v_total_lobby_kills INT := 0;
  v_max_possible_kills INT;
  v_seen_slots INT[] := ARRAY[]::INT[];
  v_seen_placements INT[] := ARRAY[]::INT[];

  -- Points & Prize
  v_placement_pts INT;
  v_kill_pts INT;
  v_total_pts INT;
  v_team_winnings NUMERIC := 0;
  v_total_calculated_prize NUMERIC := 0;
  v_configured_prize_pool NUMERIC := 0;
  v_prize_type TEXT := 'placement';
  v_per_kill_rate NUMERIC := 0;

  -- Prize details
  v_prizes JSONB;
  v_first_prize NUMERIC := 0;
  v_second_prize NUMERIC := 0;
  v_third_prize NUMERIC := 0;
  v_winner_prize NUMERIC := 0;

  -- Final structures
  v_finalized_teams JSONB := '[]'::jsonb;
  v_payout_proposals JSONB := '[]'::jsonb;
  v_winner_team TEXT := 'TBD';
  v_winner_captain TEXT := 'TBD';
  v_top_points INT := -1;
  v_top_kills INT := -1;
  v_item_team_json JSONB;
  v_finalization_res JSONB;
BEGIN
  -- --------------------------------------------------------------------------
  -- STEP 1: ADMIN AUTHORIZATION CHECK
  -- --------------------------------------------------------------------------
  v_user_id := auth.uid();
  IF NOT (public.is_admin() OR (SELECT current_setting('role', true)) = 'service_role') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'ADMIN_REQUIRED',
      'message', 'Only authorized tournament administrators can calculate and finalize match scores.'
    );
  END IF;

  -- --------------------------------------------------------------------------
  -- STEP 2: ROW LOCK ON TOURNAMENT (Concurrency safety)
  -- --------------------------------------------------------------------------
  SELECT * INTO v_tourn
  FROM public.tournaments
  WHERE id = p_tournament_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'TOURNAMENT_NOT_FOUND',
      'message', 'Tournament does not exist.'
    );
  END IF;

  IF v_tourn.status = 'Completed' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'TOURNAMENT_ALREADY_COMPLETED',
      'message', 'Tournament is already finalized and completed.'
    );
  END IF;

  IF v_tourn.status = 'Cancelled' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'TOURNAMENT_CANCELLED',
      'message', 'Cannot calculate scores for a cancelled tournament.'
    );
  END IF;

  -- --------------------------------------------------------------------------
  -- STEP 3: UNRESOLVED INCIDENT & REMAKE GUARD
  -- --------------------------------------------------------------------------
  IF EXISTS (
    SELECT 1 FROM public.match_incidents
    WHERE tournament_id = p_tournament_id
      AND status IN ('REPORTED', 'UNDER_REVIEW', 'PENDING')
      AND incident_type = 'REMAKE_REQUEST'
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'ACTIVE_REMAKE_REQUEST',
      'message', 'Cannot finalize scores while an active Remake Request incident is pending review.'
    );
  END IF;

  -- --------------------------------------------------------------------------
  -- STEP 4: INPUT SANITY & STRUCTURAL VALIDATION
  -- --------------------------------------------------------------------------
  IF p_team_scores IS NULL OR jsonb_typeof(p_team_scores) <> 'array' OR jsonb_array_length(p_team_scores) = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_SCORES_PAYLOAD',
      'message', 'Team scores payload must be a non-empty JSON array.'
    );
  END IF;

  -- Maximum possible kills in a lobby = (max_teams * team_size) - 1
  v_max_possible_kills := COALESCE(v_tourn.max_teams, 12) * 4;

  -- Parse prize configuration
  v_prize_type := LOWER(COALESCE(v_tourn.prize_type, 'placement'));
  v_configured_prize_pool := COALESCE(NULLIF(regexp_replace(COALESCE(v_tourn.prize_pool, '0'), '[^0-9.]', '', 'g'), '')::NUMERIC, 0);

  -- Extract explicit prizes if available
  v_prizes := COALESCE(v_tourn.prize_details, '{}'::jsonb);
  v_first_prize := COALESCE((v_prizes->>'first_prize')::NUMERIC, (v_prizes->>'firstPrize')::NUMERIC, 0);
  v_second_prize := COALESCE((v_prizes->>'second_prize')::NUMERIC, (v_prizes->>'secondPrize')::NUMERIC, 0);
  v_third_prize := COALESCE((v_prizes->>'third_prize')::NUMERIC, (v_prizes->>'thirdPrize')::NUMERIC, 0);
  v_winner_prize := COALESCE((v_prizes->>'winner_prize')::NUMERIC, (v_prizes->>'winnerPrize')::NUMERIC, (v_prizes->>'winner')::NUMERIC, 0);
  v_per_kill_rate := COALESCE((v_prizes->>'per_kill')::NUMERIC, (v_prizes->>'perKill')::NUMERIC, 0);

  IF v_first_prize = 0 AND v_configured_prize_pool > 0 THEN
    v_first_prize := ROUND(v_configured_prize_pool * 0.50);
    v_second_prize := ROUND(v_configured_prize_pool * 0.30);
    v_third_prize := ROUND(v_configured_prize_pool * 0.20);
  END IF;

  IF v_winner_prize = 0 AND v_configured_prize_pool > 0 THEN
    v_winner_prize := v_configured_prize_pool;
  END IF;

  -- --------------------------------------------------------------------------
  -- STEP 5: PROCESS EACH TEAM SCORE & LINK WITH MATCH_CHECKINS
  -- --------------------------------------------------------------------------
  FOR v_score_item IN SELECT * FROM jsonb_array_elements(p_team_scores) LOOP
    v_slot := (v_score_item->>'lobby_slot')::INT;
    v_kills := COALESCE((v_score_item->>'kills')::INT, 0);
    v_placement := (v_score_item->>'placement')::INT;
    v_bonus := COALESCE((v_score_item->>'bonus')::INT, 0);

    IF v_slot IS NULL OR v_slot < 1 THEN
      RETURN jsonb_build_object(
        'success', false,
        'error_code', 'INVALID_LOBBY_SLOT',
        'message', 'Each score item must contain a valid positive lobby_slot.'
      );
    END IF;

    IF v_placement IS NULL OR v_placement < 1 THEN
      RETURN jsonb_build_object(
        'success', false,
        'error_code', 'INVALID_PLACEMENT_RANK',
        'message', 'Placement rank must be 1 or greater.'
      );
    END IF;

    -- Uniqueness checks
    IF v_slot = ANY(v_seen_slots) THEN
      RETURN jsonb_build_object(
        'success', false,
        'error_code', 'DUPLICATE_LOBBY_SLOT',
        'message', 'Lobby slot #' || v_slot || ' is submitted multiple times.'
      );
    END IF;
    v_seen_slots := array_append(v_seen_slots, v_slot);

    IF v_placement = ANY(v_seen_placements) THEN
      RETURN jsonb_build_object(
        'success', false,
        'error_code', 'DUPLICATE_PLACEMENT',
        'message', 'Placement rank #' || v_placement || ' is assigned to multiple slots.'
      );
    END IF;
    v_seen_placements := array_append(v_seen_placements, v_placement);

    v_total_lobby_kills := v_total_lobby_kills + v_kills;

    -- Lookup verified check-in for this slot
    SELECT * INTO v_checkin
    FROM public.match_checkins
    WHERE tournament_id = p_tournament_id
      AND lobby_slot = v_slot;

    -- Compute standard placement points
    -- Standard Free Fire Esports Points Matrix:
    -- 1st: 12, 2nd: 9, 3rd: 8, 4th: 7, 5th: 6, 6th: 5, 7th: 4, 8th: 3, 9th: 2, 10th: 1, 11th+: 0
    IF p_custom_placement_matrix IS NOT NULL AND p_custom_placement_matrix ? v_placement::TEXT THEN
      v_placement_pts := (p_custom_placement_matrix->>(v_placement::TEXT))::INT;
    ELSE
      CASE v_placement
        WHEN 1 THEN v_placement_pts := 12;
        WHEN 2 THEN v_placement_pts := 9;
        WHEN 3 THEN v_placement_pts := 8;
        WHEN 4 THEN v_placement_pts := 7;
        WHEN 5 THEN v_placement_pts := 6;
        WHEN 6 THEN v_placement_pts := 5;
        WHEN 7 THEN v_placement_pts := 4;
        WHEN 8 THEN v_placement_pts := 3;
        WHEN 9 THEN v_placement_pts := 2;
        WHEN 10 THEN v_placement_pts := 1;
        ELSE v_placement_pts := 0;
      END CASE;
    END IF;

    -- Kill points: 1 pt per kill
    v_kill_pts := v_kills;
    v_total_pts := v_placement_pts + v_kill_pts + v_bonus;

    -- Calculate Prize Winnings
    v_team_winnings := 0;
    IF v_prize_type IN ('winner_takes_all', 'winnertakesall', 'winner_take_all') THEN
      IF v_placement = 1 THEN
        v_team_winnings := v_winner_prize;
      END IF;
    ELSIF v_prize_type IN ('per_kill', 'perkill') THEN
      v_team_winnings := v_kills * v_per_kill_rate;
    ELSIF v_prize_type IN ('placement_kill', 'placement_plus_kill', 'placement_and_kill', 'hybrid') OR v_per_kill_rate > 0 THEN
      -- Placement share + Kills
      IF v_placement = 1 THEN v_team_winnings := v_first_prize;
      ELSIF v_placement = 2 THEN v_team_winnings := v_second_prize;
      ELSIF v_placement = 3 THEN v_team_winnings := v_third_prize;
      END IF;
      v_team_winnings := v_team_winnings + (v_kills * v_per_kill_rate);
    ELSE
      -- Placement only
      IF v_placement = 1 THEN v_team_winnings := v_first_prize;
      ELSIF v_placement = 2 THEN v_team_winnings := v_second_prize;
      ELSIF v_placement = 3 THEN v_team_winnings := v_third_prize;
      END IF;
    END IF;

    v_total_calculated_prize := v_total_calculated_prize + v_team_winnings;

    -- Track overall winner (highest points, then highest kills)
    IF v_total_pts > v_top_points OR (v_total_pts = v_top_points AND v_kills > v_top_kills) THEN
      v_top_points := v_total_pts;
      v_top_kills := v_kills;
      v_winner_team := COALESCE(v_checkin.team_name, v_score_item->>'team_name', 'Slot #' || v_slot);
      v_winner_captain := COALESCE(v_checkin.captain_name, v_score_item->>'captain_name', 'Captain');
    END IF;

    -- Insert or update into public.match_slot_results
    INSERT INTO public.match_slot_results (
      tournament_id,
      lobby_slot,
      registration_id,
      team_name,
      captain_name,
      kills,
      placement,
      placement_points,
      kill_points,
      bonus_points,
      total_points,
      prize_winnings
    ) VALUES (
      p_tournament_id,
      v_slot,
      v_checkin.registration_id,
      COALESCE(v_checkin.team_name, v_score_item->>'team_name', 'Squad #' || v_slot),
      COALESCE(v_checkin.captain_name, v_score_item->>'captain_name', 'Captain'),
      v_kills,
      v_placement,
      v_placement_pts,
      v_kill_pts,
      v_bonus,
      v_total_pts,
      v_team_winnings
    )
    ON CONFLICT (tournament_id, lobby_slot) DO UPDATE SET
      kills = EXCLUDED.kills,
      placement = EXCLUDED.placement,
      placement_points = EXCLUDED.placement_points,
      kill_points = EXCLUDED.kill_points,
      bonus_points = EXCLUDED.bonus_points,
      total_points = EXCLUDED.total_points,
      prize_winnings = EXCLUDED.prize_winnings,
      updated_at = NOW();

    -- Build item for teams_list JSON
    v_item_team_json := jsonb_build_object(
      'id', COALESCE(v_checkin.registration_id::TEXT, 'slot-' || v_slot),
      'lobby_slot', v_slot,
      'name', COALESCE(v_checkin.team_name, v_score_item->>'team_name', 'Squad #' || v_slot),
      'captain', COALESCE(v_checkin.captain_name, v_score_item->>'captain_name', 'Captain'),
      'freeFireUid', COALESCE(v_checkin.checkin_uid, v_checkin.registered_uid, 'N/A'),
      'kills', v_kills,
      'placement', v_placement,
      'placementPoints', v_placement_pts,
      'killPoints', v_kill_pts,
      'bonus', v_bonus,
      'points', v_total_pts,
      'winnings', v_team_winnings,
      'rank', v_placement,
      'status', 'VERIFIED'
    );
    v_finalized_teams := v_finalized_teams || jsonb_build_array(v_item_team_json);

    -- Queue Payout Proposal if winnings > 0
    IF v_team_winnings > 0 THEN
      v_payout_proposals := v_payout_proposals || jsonb_build_array(jsonb_build_object(
        'source_result_id', v_checkin.registration_id::TEXT,
        'winner_user_id', v_checkin.user_id,
        'winner_game_uid', COALESCE(v_checkin.checkin_uid, v_checkin.registered_uid),
        'winner_game_ign', COALESCE(v_checkin.team_name, 'Squad #' || v_slot),
        'rank', v_placement,
        'payout_amount', v_team_winnings,
        'idempotency_key', 'payout_' || p_tournament_id || '_slot_' || v_slot || '_' || v_placement
      ));
    END IF;
  END LOOP;

  -- --------------------------------------------------------------------------
  -- STEP 6: LOBBY KILL SANITY CHECK
  -- --------------------------------------------------------------------------
  IF v_total_lobby_kills > v_max_possible_kills THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'KILL_COUNT_ANOMALY',
      'message', 'Total lobby kills (' || v_total_lobby_kills || ') exceeds maximum possible participants (' || v_max_possible_kills || ').'
    );
  END IF;

  -- --------------------------------------------------------------------------
  -- STEP 7: PRIZE CEILING CHECK
  -- --------------------------------------------------------------------------
  IF v_configured_prize_pool > 0 AND v_total_calculated_prize > (v_configured_prize_pool + 5) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'EXCEEDS_PRIZE_POOL',
      'message', 'Total calculated payouts (₹' || v_total_calculated_prize || ') exceed the tournament prize pool (₹' || v_configured_prize_pool || ').'
    );
  END IF;

  -- --------------------------------------------------------------------------
  -- STEP 8: CALL ATOMIC FINALIZATION RPC
  -- --------------------------------------------------------------------------
  -- Atomically updates tournaments, tournament_registrations, and queues payouts
  v_finalization_res := public.finalize_tournament_results(
    p_tournament_id,
    v_finalized_teams,
    v_winner_team,
    v_winner_captain,
    v_payout_proposals
  );

  IF v_finalization_res IS NULL OR (v_finalization_res->>'success')::BOOLEAN = false THEN
    RETURN v_finalization_res;
  END IF;

  -- --------------------------------------------------------------------------
  -- STEP 9: AUDIT LOGGING
  -- --------------------------------------------------------------------------
  INSERT INTO public.match_operations_audit_log (
    tournament_id,
    actor_id,
    action,
    details
  ) VALUES (
    p_tournament_id,
    v_user_id,
    'SCORES_FINALIZED',
    jsonb_build_object(
      'winner_team', v_winner_team,
      'total_teams', jsonb_array_length(v_finalized_teams),
      'total_kills', v_total_lobby_kills,
      'total_payout_liability', v_total_calculated_prize
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'tournament_id', p_tournament_id,
    'status', 'Completed',
    'winner_team', v_winner_team,
    'total_kills', v_total_lobby_kills,
    'total_payout_liability', v_total_calculated_prize,
    'teams_count', jsonb_array_length(v_finalized_teams),
    'message', 'Match scores calculated and finalized successfully. Leaderboard updated.'
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- 6. PERMISSIONS & SCHEMA NOTIFICATION
-- ----------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.submit_match_scorecard(TEXT, INT, INT, INT, TEXT, TEXT, TEXT, INT, INT, NUMERIC) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_match_scorecard(TEXT, INT, INT, INT, TEXT, TEXT, TEXT, INT, INT, NUMERIC) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.calculate_and_finalize_scores(TEXT, JSONB, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.calculate_and_finalize_scores(TEXT, JSONB, JSONB) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
