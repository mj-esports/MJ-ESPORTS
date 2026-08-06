-- High-Traffic Database Indexes Migration for MJ ESPORTS
-- Run this script in the Supabase SQL Editor to optimize query performance and eliminate full table scans.

-- 1. Index for Tournaments ordered by creation date (used by Tournament list views)
CREATE INDEX IF NOT EXISTS idx_tournaments_created_at 
  ON public.tournaments (created_at DESC);

-- 2. Index for Tournaments filtered by status ('Registration Open', 'Live Now', etc.)
CREATE INDEX IF NOT EXISTS idx_tournaments_status 
  ON public.tournaments (status);

-- 3. Index for Tournament Registrations lookup by tournament_id (used by SlotBookingModal & admin panels)
CREATE INDEX IF NOT EXISTS idx_registrations_tournament_id 
  ON public.tournament_registrations (tournament_id);

-- 4. Index for Tournament Registrations lookup by user_id
CREATE INDEX IF NOT EXISTS idx_registrations_user_id 
  ON public.tournament_registrations (user_id);

-- 5. Index for Tournament Registrations lookup by email (used for duplicate checks)
CREATE INDEX IF NOT EXISTS idx_registrations_email 
  ON public.tournament_registrations (email);

-- 6. Index for User Roles lookup by user_id (used by AuthContext & AdminRoute)
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id 
  ON public.user_roles (user_id);

-- 7. Composite Index for duplicate registration lookup (tournament_id + email)
CREATE INDEX IF NOT EXISTS idx_registrations_dup_check 
  ON public.tournament_registrations (tournament_id, email);
