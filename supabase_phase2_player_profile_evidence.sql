-- ============================================================================
-- MJ ESPORTS — Phase 2: Player Identity Profile Evidence Foundation
-- Target Engine: Supabase PostgreSQL
-- Description:
-- 1. Creates public.player_identity_evidence table to store private profile screenshot proofs.
-- 2. Creates public.player_evidence_audit_logs table to record immutable review history.
-- 3. Configures private Supabase storage bucket 'profile-proofs'.
-- 4. Establishes Row Level Security (RLS) policies for secure isolation.
-- 5. Implements public.review_player_identity_evidence SECURITY DEFINER RPC.
-- ============================================================================

-- 1. CREATE PLAYER IDENTITY EVIDENCE TABLE
CREATE TABLE IF NOT EXISTS public.player_identity_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game TEXT NOT NULL DEFAULT 'Free Fire',
  game_uid TEXT NOT NULL,
  canonical_ign TEXT NOT NULL,
  normalized_ign TEXT,
  tournament_id TEXT REFERENCES public.tournaments(id) ON DELETE SET NULL,
  tournament_player_id UUID REFERENCES public.tournament_players(id) ON DELETE SET NULL,
  evidence_type TEXT NOT NULL DEFAULT 'FREE_FIRE_PROFILE_SCREENSHOT' CHECK (
    evidence_type IN ('FREE_FIRE_PROFILE_SCREENSHOT', 'BGMI_PROFILE_SCREENSHOT', 'ID_CARD_PROOF')
  ),
  storage_path TEXT NOT NULL,
  original_filename TEXT,
  mime_type TEXT,
  file_size INTEGER,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (
    status IN ('PENDING', 'VERIFIED', 'REJECTED', 'REQUIRES_REUPLOAD')
  ),
  rejection_reason TEXT,
  verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. CREATE EVIDENCE AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.player_evidence_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id UUID NOT NULL REFERENCES public.player_identity_evidence(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status TEXT NOT NULL CHECK (new_status IN ('PENDING', 'VERIFIED', 'REJECTED', 'REQUIRES_REUPLOAD')),
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_player_evidence_user ON public.player_identity_evidence(user_id);
CREATE INDEX IF NOT EXISTS idx_player_evidence_status ON public.player_identity_evidence(status);
CREATE INDEX IF NOT EXISTS idx_player_evidence_game_uid ON public.player_identity_evidence(game_uid);
CREATE INDEX IF NOT EXISTS idx_player_evidence_tourney ON public.player_identity_evidence(tournament_id);
CREATE INDEX IF NOT EXISTS idx_player_evidence_audit ON public.player_evidence_audit_logs(evidence_id);

-- 4. CONFIGURE PRIVATE STORAGE BUCKET 'profile-proofs'
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-proofs',
  'profile-proofs',
  false, -- Private bucket: access only via signed URLs
  10485760, -- 10MB limit
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

-- 5. STORAGE RLS POLICIES FOR 'profile-proofs'
DROP POLICY IF EXISTS "Users upload own profile proof evidence" ON storage.objects;
CREATE POLICY "Users upload own profile proof evidence"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'profile-proofs' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_admin())
  );

DROP POLICY IF EXISTS "Users and admins read profile proof evidence" ON storage.objects;
CREATE POLICY "Users and admins read profile proof evidence"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'profile-proofs' AND (auth.uid() = owner OR auth.uid()::text = (storage.foldername(name))[1] OR public.is_admin())
  );

DROP POLICY IF EXISTS "Admins have full storage management on profile proofs" ON storage.objects;
CREATE POLICY "Admins have full storage management on profile proofs"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'profile-proofs' AND public.is_admin())
  WITH CHECK (bucket_id = 'profile-proofs' AND public.is_admin());

-- 6. TABLE ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.player_identity_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_evidence_audit_logs ENABLE ROW LEVEL SECURITY;

-- 6.1 SELECT Policy: Users view own evidence; Admins view all
DROP POLICY IF EXISTS "Users read own evidence or admin reads all" ON public.player_identity_evidence;
CREATE POLICY "Users read own evidence or admin reads all"
  ON public.player_identity_evidence FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

-- 6.2 INSERT Policy: Users insert own evidence in PENDING status only
DROP POLICY IF EXISTS "Users insert own evidence in pending status" ON public.player_identity_evidence;
CREATE POLICY "Users insert own evidence in pending status"
  ON public.player_identity_evidence FOR INSERT
  WITH CHECK (
    (auth.uid() = user_id AND status = 'PENDING')
    OR public.is_admin()
  );

-- 6.3 UPDATE Policy: Admins only can update evidence rows
DROP POLICY IF EXISTS "Admins update evidence records" ON public.player_identity_evidence;
CREATE POLICY "Admins update evidence records"
  ON public.player_identity_evidence FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 6.4 DELETE Policy: Admins only can delete evidence rows
DROP POLICY IF EXISTS "Admins delete evidence records" ON public.player_identity_evidence;
CREATE POLICY "Admins delete evidence records"
  ON public.player_identity_evidence FOR DELETE
  USING (public.is_admin());

-- 6.5 AUDIT LOGS SELECT Policy: Admins only
DROP POLICY IF EXISTS "Admins read evidence audit logs" ON public.player_evidence_audit_logs;
CREATE POLICY "Admins read evidence audit logs"
  ON public.player_evidence_audit_logs FOR SELECT
  USING (public.is_admin());

-- 7. SECURE ADMIN REVIEW RPC (SECURITY DEFINER)
DROP FUNCTION IF EXISTS public.review_player_identity_evidence(UUID, TEXT, TEXT);

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
  v_admin_id UUID;
  v_evidence RECORD;
  v_new_status TEXT;
BEGIN
  -- 1. Authorization check: Must be admin or service role
  v_admin_id := auth.uid();
  IF NOT (public.is_admin() OR (SELECT current_setting('role', true)) = 'service_role') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'UNAUTHORIZED',
      'message', 'Only administrators can review player identity evidence.'
    );
  END IF;

  -- 2. Validate input status
  v_new_status := UPPER(TRIM(p_status));
  IF v_new_status NOT IN ('VERIFIED', 'REJECTED', 'REQUIRES_REUPLOAD') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_STATUS',
      'message', 'Invalid status. Expected VERIFIED, REJECTED, or REQUIRES_REUPLOAD.'
    );
  END IF;

  -- 3. Fetch target evidence row
  SELECT * INTO v_evidence
  FROM public.player_identity_evidence
  WHERE id = p_evidence_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'EVIDENCE_NOT_FOUND',
      'message', 'Evidence record not found.'
    );
  END IF;

  -- 4. Record audit log entry before mutating state
  INSERT INTO public.player_evidence_audit_logs (
    evidence_id,
    previous_status,
    new_status,
    admin_id,
    rejection_reason,
    created_at
  ) VALUES (
    p_evidence_id,
    v_evidence.status,
    v_new_status,
    v_admin_id,
    p_rejection_reason,
    NOW()
  );

  -- 5. Update evidence record
  UPDATE public.player_identity_evidence
  SET
    status = v_new_status,
    rejection_reason = CASE WHEN v_new_status IN ('REJECTED', 'REQUIRES_REUPLOAD') THEN p_rejection_reason ELSE NULL END,
    verified_by = v_admin_id,
    verified_at = NOW(),
    updated_at = NOW()
  WHERE id = p_evidence_id;

  -- 6. Synchronize profiles verification status if verified
  IF v_new_status = 'VERIFIED' THEN
    UPDATE public.profiles
    SET
      verification_status = 'Verified',
      game_uid = v_evidence.game_uid,
      updated_at = NOW()
    WHERE id = v_evidence.user_id;
  ELSIF v_new_status IN ('REJECTED', 'REQUIRES_REUPLOAD') THEN
    UPDATE public.profiles
    SET
      verification_status = 'Rejected',
      updated_at = NOW()
    WHERE id = v_evidence.user_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'evidence_id', p_evidence_id,
    'status', v_new_status,
    'message', 'Player evidence reviewed successfully.'
  );
END;
$$;

-- Grant execution privileges strictly to authenticated and service_role
REVOKE EXECUTE ON FUNCTION public.review_player_identity_evidence FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_player_identity_evidence TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_player_identity_evidence TO service_role;
