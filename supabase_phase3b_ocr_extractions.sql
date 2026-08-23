-- ============================================================================
-- MJ ESPORTS — Phase 3B: OCR Scoreboard Extraction Engine
-- Target Engine: Supabase PostgreSQL
-- Description:
-- 1. Creates public.ocr_job_extractions table for structured candidate rows.
-- 2. Creates public.ocr_raw_observations table for multi-pass raw OCR text tokens.
-- 3. Sets up RLS policies restricted to authorized administrators.
-- 4. Preserves full raw Unicode strings without destructive ASCII conversion.
-- ============================================================================

-- 1. CREATE OCR JOB EXTRACTIONS TABLE (Staging Candidate Rows)
CREATE TABLE IF NOT EXISTS public.ocr_job_extractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ocr_job_id UUID NOT NULL REFERENCES public.ocr_jobs(id) ON DELETE CASCADE,
  row_index INTEGER NOT NULL,
  rank INTEGER,
  raw_ign TEXT NOT NULL,
  raw_kills INTEGER,
  raw_damage INTEGER,
  normalized_comparison_key TEXT,
  rank_confidence NUMERIC(5, 2),
  name_confidence NUMERIC(5, 2),
  kill_confidence NUMERIC(5, 2),
  overall_confidence NUMERIC(5, 2),
  bounding_box JSONB,
  multi_pass_observations JSONB,
  extraction_status TEXT NOT NULL DEFAULT 'EXTRACTED' CHECK (
    extraction_status IN ('EXTRACTED', 'PARTIAL', 'LOW_CONFIDENCE', 'UNREADABLE', 'PARSER_ERROR')
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. CREATE OCR RAW OBSERVATIONS TABLE (Multi-Pass Audit Trail)
CREATE TABLE IF NOT EXISTS public.ocr_raw_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ocr_job_id UUID NOT NULL REFERENCES public.ocr_jobs(id) ON DELETE CASCADE,
  pass_number INTEGER NOT NULL,
  preprocessing_variant TEXT NOT NULL,
  engine_name TEXT NOT NULL,
  raw_text TEXT NOT NULL,
  raw_tokens JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_ocr_extractions_job 
  ON public.ocr_job_extractions(ocr_job_id);

CREATE INDEX IF NOT EXISTS idx_ocr_extractions_status 
  ON public.ocr_job_extractions(extraction_status);

CREATE INDEX IF NOT EXISTS idx_ocr_raw_obs_job 
  ON public.ocr_raw_observations(ocr_job_id);

-- 4. TABLE ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.ocr_job_extractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ocr_raw_observations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins have full access to ocr_job_extractions" ON public.ocr_job_extractions;
CREATE POLICY "Admins have full access to ocr_job_extractions"
  ON public.ocr_job_extractions FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins have full access to ocr_raw_observations" ON public.ocr_raw_observations;
CREATE POLICY "Admins have full access to ocr_raw_observations"
  ON public.ocr_raw_observations FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 5. PERMISSION GRANTS
GRANT ALL ON TABLE public.ocr_job_extractions TO authenticated, service_role;
GRANT SELECT ON TABLE public.ocr_job_extractions TO anon;

GRANT ALL ON TABLE public.ocr_raw_observations TO authenticated, service_role;
GRANT SELECT ON TABLE public.ocr_raw_observations TO anon;

-- 6. RELOAD SCHEMA CACHE
NOTIFY pgrst, 'reload schema';
