-- ============================================================================
-- MJ ESPORTS — Phase 3A: OCR Scoreboard Ingestion & Job Pipeline
-- Target Engine: Supabase PostgreSQL
-- Description:
-- 1. Creates public.ocr_jobs table for scoreboard intake orchestration.
-- 2. Configures private Supabase storage bucket 'scoreboard-proofs'.
-- 3. Sets up SHA-256 and perceptual hash indexes for duplicate detection.
-- 4. Establishes Row Level Security (RLS) policies restricted to admins.
-- ============================================================================

-- 1. CREATE OCR JOBS TABLE
CREATE TABLE IF NOT EXISTS public.ocr_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id TEXT NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  match_id TEXT NOT NULL,
  game_mode TEXT NOT NULL DEFAULT 'Squad' CHECK (
    game_mode IN ('Solo', 'Duo', 'Squad', 'SOLO', 'DUO', 'SQUAD')
  ),
  map_name TEXT NOT NULL DEFAULT 'Bermuda',
  status TEXT NOT NULL DEFAULT 'QUEUED' CHECK (
    status IN ('QUEUED', 'PROCESSING', 'AWAITING_REVIEW', 'COMPLETED', 'FAILED', 'REQUIRES_MANUAL_ENTRY')
  ),
  original_filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_sha256 TEXT NOT NULL,
  file_phash TEXT,
  is_duplicate BOOLEAN NOT NULL DEFAULT FALSE,
  duplicate_of_job_id UUID REFERENCES public.ocr_jobs(id) ON DELETE SET NULL,
  is_perceptual_duplicate BOOLEAN NOT NULL DEFAULT FALSE,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  processing_started_at TIMESTAMPTZ,
  processing_completed_at TIMESTAMPTZ,
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. PERFORMANCE & DUPLICATE DETECTION INDEXES
CREATE INDEX IF NOT EXISTS idx_ocr_jobs_tourney_match 
  ON public.ocr_jobs(tournament_id, match_id);

CREATE INDEX IF NOT EXISTS idx_ocr_jobs_sha256 
  ON public.ocr_jobs(file_sha256);

CREATE INDEX IF NOT EXISTS idx_ocr_jobs_status 
  ON public.ocr_jobs(status);

CREATE INDEX IF NOT EXISTS idx_ocr_jobs_created 
  ON public.ocr_jobs(created_at DESC);

-- 3. CONFIGURE PRIVATE STORAGE BUCKET 'scoreboard-proofs'
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'scoreboard-proofs',
  'scoreboard-proofs',
  false, -- Strict private storage: access exclusively via short-lived signed URLs
  15728640, -- 15MB limit
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = 15728640,
    allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

-- 4. STORAGE RLS POLICIES FOR 'scoreboard-proofs'
DROP POLICY IF EXISTS "Admins upload scoreboard proofs" ON storage.objects;
CREATE POLICY "Admins upload scoreboard proofs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'scoreboard-proofs' AND public.is_admin()
  );

DROP POLICY IF EXISTS "Admins read scoreboard proofs" ON storage.objects;
CREATE POLICY "Admins read scoreboard proofs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'scoreboard-proofs' AND public.is_admin()
  );

DROP POLICY IF EXISTS "Admins manage all scoreboard proofs" ON storage.objects;
CREATE POLICY "Admins manage all scoreboard proofs"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'scoreboard-proofs' AND public.is_admin())
  WITH CHECK (bucket_id = 'scoreboard-proofs' AND public.is_admin());

-- 5. TABLE ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.ocr_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins have full access to ocr_jobs" ON public.ocr_jobs;
CREATE POLICY "Admins have full access to ocr_jobs"
  ON public.ocr_jobs FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 6. PERMISSION GRANTS
GRANT ALL ON TABLE public.ocr_jobs TO authenticated, service_role;
GRANT SELECT ON TABLE public.ocr_jobs TO anon;

-- 7. RELOAD SCHEMA CACHE
NOTIFY pgrst, 'reload schema';
