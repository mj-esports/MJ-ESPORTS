-- ============================================================================
-- PHASE 4.1 — MJ ESPORTS REAL SCORECARD PERSISTENCE + STORAGE SQL MIGRATION
-- ============================================================================

-- 1. Create public.match_scorecards table
CREATE TABLE IF NOT EXISTS public.match_scorecards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id TEXT NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  match_id UUID REFERENCES public.matches(id) ON DELETE SET NULL,
  submitted_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  submitted_by_email TEXT NOT NULL,
  submitted_by_username TEXT,
  game TEXT NOT NULL DEFAULT 'Free Fire MAX',
  claimed_game_ign TEXT,
  claimed_game_uid TEXT,
  screenshot_path TEXT,
  screenshot_url TEXT,
  screenshot_hash TEXT,
  ocr_raw_text TEXT,
  ocr_game_ign TEXT,
  ocr_kills INTEGER DEFAULT 0,
  ocr_damage INTEGER DEFAULT 0,
  ocr_placement TEXT,
  ocr_confidence INTEGER DEFAULT 0,
  ocr_status TEXT NOT NULL DEFAULT 'PENDING_OCR' CHECK (ocr_status IN ('PENDING_OCR', 'OCR_PROCESSING', 'OCR_COMPLETE', 'OCR_FAILED')),
  verification_status TEXT NOT NULL DEFAULT 'REVIEW_REQUIRED' CHECK (verification_status IN ('SUBMITTED', 'OCR_PROCESSING', 'OCR_COMPLETE', 'REVIEW_REQUIRED', 'VERIFIED', 'REJECTED', 'RESUBMISSION_REQUESTED', 'PUBLISHED')),
  final_game_ign TEXT,
  final_kills INTEGER DEFAULT 0,
  final_damage INTEGER DEFAULT 0,
  final_placement TEXT,
  correction_reason TEXT,
  corrected_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  corrected_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  flag_reason TEXT,
  is_flagged BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Performance & Lookup Indexes
CREATE INDEX IF NOT EXISTS idx_match_scorecards_tournament ON public.match_scorecards(tournament_id);
CREATE INDEX IF NOT EXISTS idx_match_scorecards_user ON public.match_scorecards(submitted_by_user_id);
CREATE INDEX IF NOT EXISTS idx_match_scorecards_verification ON public.match_scorecards(verification_status);
CREATE INDEX IF NOT EXISTS idx_match_scorecards_hash ON public.match_scorecards(screenshot_hash);

-- 3. Enable RLS
ALTER TABLE public.match_scorecards ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- Players can select their own submitted scorecards
CREATE POLICY "Users can view own scorecards"
  ON public.match_scorecards FOR SELECT
  USING (auth.uid() = submitted_by_user_id);

-- Players can insert scorecards for themselves
CREATE POLICY "Users can insert own scorecards"
  ON public.match_scorecards FOR INSERT
  WITH CHECK (auth.uid() = submitted_by_user_id);

-- Administrators can perform all operations (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "Admins have full access to scorecards"
  ON public.match_scorecards FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 5. Storage Bucket Configuration for match-scorecards (Private Bucket)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'match-scorecards',
  'match-scorecards',
  false,
  10485760, -- 10MB Limit
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

-- Storage Policies for match-scorecards bucket
CREATE POLICY "Authenticated users can upload match scorecards"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'match-scorecards');

CREATE POLICY "Users can read own scorecard screenshots"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'match-scorecards' AND (auth.uid() = owner OR public.is_admin()));

CREATE POLICY "Admins have full storage access to match scorecards"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'match-scorecards' AND public.is_admin())
  WITH CHECK (bucket_id = 'match-scorecards' AND public.is_admin());
