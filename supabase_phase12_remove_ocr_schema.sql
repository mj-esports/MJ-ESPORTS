-- ============================================================================
-- MJ ESPORTS — Phase 12: Remove Obsolete OCR Columns & RPC Parameters
-- Target Engine: Supabase PostgreSQL
-- Description:
--   1. Safely drops obsolete OCR columns from public.match_scorecards:
--      - ocr_raw_text
--      - ocr_candidate_kills
--      - ocr_candidate_placement
--      - ocr_confidence
--   2. Drops legacy 10-parameter overload of public.submit_match_scorecard RPC.
--   3. Recreates public.submit_match_scorecard with clean 6-parameter signature
--      strictly preserving all validation, authorization, lifecycle, and audit logic.
--   4. Preserves all scoring, points calculation, finalization, and payout functions.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. DROP OBSOLETE OCR COLUMNS FROM MATCH SCORECARDS TABLE
-- ----------------------------------------------------------------------------
ALTER TABLE public.match_scorecards
  DROP COLUMN IF EXISTS ocr_raw_text,
  DROP COLUMN IF EXISTS ocr_candidate_kills,
  DROP COLUMN IF EXISTS ocr_candidate_placement,
  DROP COLUMN IF EXISTS ocr_confidence;

-- ----------------------------------------------------------------------------
-- 2. DROP OBSOLETE 10-PARAMETER RPC OVERLOAD
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.submit_match_scorecard(
  UUID, INT, INT, INT, TEXT, TEXT, TEXT, INT, INT, NUMERIC
);

-- ----------------------------------------------------------------------------
-- 3. RECREATE CLEAN AUTHORITATIVE SUBMIT MATCH SCORECARD RPC (6 PARAMETERS)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_match_scorecard(
  p_tournament_id UUID,
  p_lobby_slot INT,
  p_reported_kills INT,
  p_reported_placement INT DEFAULT NULL,
  p_screenshot_url TEXT DEFAULT NULL,
  p_storage_path TEXT DEFAULT NULL
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
      'PENDING'
    ) RETURNING id INTO v_new_id;
  END IF;

  -- 6. Audit logging
  INSERT INTO public.match_operations_audit_log (
    tournament_id,
    performed_by,
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
-- 4. PERMISSIONS & SCHEMA CACHE RELOAD
-- ----------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.submit_match_scorecard(UUID, INT, INT, INT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_match_scorecard(UUID, INT, INT, INT, TEXT, TEXT) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
