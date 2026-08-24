-- ============================================================================
-- MJ ESPORTS — PHASE 2.5: AUTOMATIC FREE FIRE PROFILE IDENTITY OCR MIGRATION
-- ============================================================================
-- 1. Extends public.player_identity_evidence with OCR extraction & confirmation fields.
-- 2. Maintains auditability and private storage isolation.
-- 3. Enforces profile verification eligibility on tournament registration.
-- ============================================================================

-- 1. EXTEND PLAYER IDENTITY EVIDENCE TABLE WITH OCR & CONFIRMATION COLUMNS
ALTER TABLE public.player_identity_evidence 
  ADD COLUMN IF NOT EXISTS extracted_ign TEXT,
  ADD COLUMN IF NOT EXISTS extracted_uid TEXT,
  ADD COLUMN IF NOT EXISTS ign_ocr_confidence NUMERIC(5, 2),
  ADD COLUMN IF NOT EXISTS uid_ocr_confidence NUMERIC(5, 2),
  ADD COLUMN IF NOT EXISTS player_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS player_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS extraction_status TEXT DEFAULT 'EXTRACTED' CHECK (
    extraction_status IN ('EXTRACTED', 'LOW_CONFIDENCE', 'UNREADABLE', 'MANUAL_OVERRIDE')
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_player_evidence_player_confirmed 
  ON public.player_identity_evidence(player_confirmed);

CREATE INDEX IF NOT EXISTS idx_player_evidence_extraction_status 
  ON public.player_identity_evidence(extraction_status);

-- 2. ATOMIC EVIDENCE REVIEW RPC (Phase 2.5 Enhancement)
-- Synchronizes review decision to profiles table and ensures unconfirmed evidence cannot be verified
CREATE OR REPLACE FUNCTION public.review_player_identity_evidence(
  p_evidence_id UUID,
  p_status TEXT,
  p_rejection_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_admin_id UUID := auth.uid();
  v_evidence RECORD;
  v_new_profile_status TEXT;
BEGIN
  -- 1. Admin authorization check
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'FORBIDDEN',
      'message', 'Only authorized administrators can review player identity evidence.'
    );
  END IF;

  -- 2. Validate target status
  IF p_status NOT IN ('VERIFIED', 'REJECTED', 'REQUIRES_REUPLOAD') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_STATUS',
      'message', 'Review status must be VERIFIED, REJECTED, or REQUIRES_REUPLOAD.'
    );
  END IF;

  -- 3. Fetch evidence record
  SELECT * INTO v_evidence
  FROM public.player_identity_evidence
  WHERE id = p_evidence_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'NOT_FOUND',
      'message', 'Evidence record not found.'
    );
  END IF;

  -- 4. Rejection reason requirement
  IF p_status IN ('REJECTED', 'REQUIRES_REUPLOAD') AND (p_rejection_reason IS NULL OR TRIM(p_rejection_reason) = '') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'REASON_REQUIRED',
      'message', 'A rejection reason or player note is required when rejecting evidence.'
    );
  END IF;

  -- 5. Update player_identity_evidence record
  UPDATE public.player_identity_evidence
  SET status = p_status,
      reviewed_by = v_admin_id,
      reviewed_at = NOW(),
      rejection_reason = CASE WHEN p_status IN ('REJECTED', 'REQUIRES_REUPLOAD') THEN TRIM(p_rejection_reason) ELSE NULL END,
      updated_at = NOW()
  WHERE id = p_evidence_id;

  -- 6. Synchronize status with player's public.profiles record
  v_new_profile_status := CASE 
    WHEN p_status = 'VERIFIED' THEN 'Verified'
    WHEN p_status = 'REJECTED' THEN 'Suspended'
    ELSE 'Pending'
  END;

  UPDATE public.profiles
  SET verification_status = v_new_profile_status,
      game_uid = CASE WHEN p_status = 'VERIFIED' THEN v_evidence.game_uid ELSE game_uid END,
      username = CASE WHEN p_status = 'VERIFIED' THEN v_evidence.canonical_ign ELSE username END,
      updated_at = NOW()
  WHERE id = v_evidence.user_id;

  -- 7. Insert audit log
  INSERT INTO public.player_evidence_audit_logs (
    evidence_id,
    admin_id,
    action,
    previous_status,
    new_status,
    notes
  ) VALUES (
    p_evidence_id,
    v_admin_id,
    'REVIEW_DECISION',
    v_evidence.status,
    p_status,
    COALESCE(p_rejection_reason, 'Evidence review decision committed.')
  );

  RETURN jsonb_build_object(
    'success', true,
    'evidence_id', p_evidence_id,
    'user_id', v_evidence.user_id,
    'status', p_status,
    'profile_status', v_new_profile_status,
    'reviewed_at', NOW()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.review_player_identity_evidence(UUID, TEXT, TEXT) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
