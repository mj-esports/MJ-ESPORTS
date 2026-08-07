-- =================================================================
-- MJ ESPORTS - Tournament Lifecycle Database Migration Script
-- Enforces canonical 12-stage lifecycle on public.tournaments
-- =================================================================

-- 1. Ensure status column exists and default to 'Draft'
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Draft';

-- 2. Migrate legacy status strings to canonical lifecycle stages
UPDATE public.tournaments
SET status = 'Registration Open'
WHERE LOWER(status) LIKE '%open%' AND LOWER(status) NOT LIKE '%check-in%';

UPDATE public.tournaments
SET status = 'Live'
WHERE LOWER(status) LIKE '%live%';

UPDATE public.tournaments
SET status = 'Completed'
WHERE LOWER(status) LIKE '%completed%' OR LOWER(status) LIKE '%finished%' OR LOWER(status) LIKE '%ended%';

UPDATE public.tournaments
SET status = 'Draft'
WHERE status IS NULL OR TRIM(status) = '';

-- 3. Add Check Constraint for 12 Canonical Stages
ALTER TABLE public.tournaments
  DROP CONSTRAINT IF EXISTS check_tournament_lifecycle_status;

ALTER TABLE public.tournaments
  ADD CONSTRAINT check_tournament_lifecycle_status
  CHECK (status IN (
    'Draft',
    'Published',
    'Registration Open',
    'Registration Closed',
    'Check-in Open',
    'Check-in Closed',
    'Room Released',
    'Live',
    'Results Pending',
    'Completed',
    'Prize Distributed',
    'Archived'
  ));
