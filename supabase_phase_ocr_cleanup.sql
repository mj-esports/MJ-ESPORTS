-- ============================================================================
-- MJ ESPORTS — Phase: Complete OCR Removal & Architecture Cleanup
-- Safe, idempotent removal of all OCR-specific database objects.
-- ============================================================================

-- 1. SAFELY DROP OCR-ONLY TABLES (CASCADE drops child foreign keys & triggers)
DROP TABLE IF EXISTS public.ocr_raw_observations CASCADE;
DROP TABLE IF EXISTS public.ocr_job_extractions CASCADE;
DROP TABLE IF EXISTS public.ocr_jobs CASCADE;
DROP TABLE IF EXISTS public.match_scorecards CASCADE;

-- 2. SAFELY DROP OCR STORAGE POLICIES & BUCKETS
DROP POLICY IF EXISTS "Admins upload scoreboard proofs" ON storage.objects;
DROP POLICY IF EXISTS "Admins read scoreboard proofs" ON storage.objects;
DROP POLICY IF EXISTS "Admins manage all scoreboard proofs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload match scorecards" ON storage.objects;
DROP POLICY IF EXISTS "Users can read own scorecard screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Admins have full storage access to match scorecards" ON storage.objects;

DELETE FROM storage.buckets WHERE id IN ('scoreboard-proofs', 'match-scorecards');

-- 3. REMOVE OCR EXTENSION COLUMNS FROM player_identity_evidence
ALTER TABLE public.player_identity_evidence
  DROP COLUMN IF EXISTS extracted_ign,
  DROP COLUMN IF EXISTS extracted_uid,
  DROP COLUMN IF EXISTS ign_ocr_confidence,
  DROP COLUMN IF EXISTS uid_ocr_confidence,
  DROP COLUMN IF EXISTS player_confirmed,
  DROP COLUMN IF EXISTS player_confirmed_at,
  DROP COLUMN IF EXISTS extraction_status;

-- 4. SAFELY DROP OBSOLETE OCR-SPECIFIC INDEXES
DROP INDEX IF EXISTS public.idx_player_evidence_player_confirmed;
DROP INDEX IF EXISTS public.idx_player_evidence_extraction_status;
DROP INDEX IF EXISTS public.idx_ocr_jobs_tourney_match;
DROP INDEX IF EXISTS public.idx_ocr_jobs_sha256;
DROP INDEX IF EXISTS public.idx_ocr_jobs_status;
DROP INDEX IF EXISTS public.idx_ocr_jobs_created;
DROP INDEX IF EXISTS public.idx_ocr_extractions_job;
DROP INDEX IF EXISTS public.idx_ocr_extractions_status;
DROP INDEX IF EXISTS public.idx_ocr_raw_obs_job;
DROP INDEX IF EXISTS public.idx_match_scorecards_tournament;
DROP INDEX IF EXISTS public.idx_match_scorecards_user;
DROP INDEX IF EXISTS public.idx_match_scorecards_verification;
DROP INDEX IF EXISTS public.idx_match_scorecards_hash;

-- 5. NOTIFY POSTGREST TO RELOAD SCHEMA CACHE
NOTIFY pgrst, 'reload schema';
