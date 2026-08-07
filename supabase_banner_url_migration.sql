-- =========================================================
-- MJ ESPORTS Tournament Banner URL Migration Script
-- =========================================================

-- 1. Add banner_url column to public.tournaments table if missing
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS banner_url TEXT;

-- 2. Populate banner_url from existing banner_image column where applicable
UPDATE public.tournaments
SET banner_url = banner_image
WHERE banner_url IS NULL AND banner_image IS NOT NULL;

-- 3. Populate banner_image from banner_url where applicable
UPDATE public.tournaments
SET banner_image = banner_url
WHERE banner_image IS NULL AND banner_url IS NOT NULL;
