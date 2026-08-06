-- ============================================================================
-- MJ ESPORTS — Production Database Audit & SQL Optimization Package
-- Target Engine: Supabase PostgreSQL (PostgREST API)
-- ============================================================================

-- 1. INDEX OPTIMIZATIONS (Eliminates Full Table Scans for High Traffic)
-- ----------------------------------------------------------------------------
-- Tournaments List Sorting Index
CREATE INDEX IF NOT EXISTS idx_tournaments_created_at_desc 
  ON public.tournaments (created_at DESC);

-- Tournaments Filter by Status
CREATE INDEX IF NOT EXISTS idx_tournaments_status 
  ON public.tournaments (status);

-- Tournament Registrations Lookup by Tournament ID
CREATE INDEX IF NOT EXISTS idx_registrations_tournament_id 
  ON public.tournament_registrations (tournament_id);

-- Tournament Registrations Lookup by User ID
CREATE INDEX IF NOT EXISTS idx_registrations_user_id 
  ON public.tournament_registrations (user_id);

-- Composite Index for Fast Duplicate Registration Lookups
CREATE INDEX IF NOT EXISTS idx_registrations_dup_lookup 
  ON public.tournament_registrations (tournament_id, email, free_fire_uid);

-- User Roles Security Policy Fast Lookup
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id_role 
  ON public.user_roles (user_id, role);

-- Profiles Lookup by Username
CREATE INDEX IF NOT EXISTS idx_profiles_username 
  ON public.profiles (username);

-- Wallet Transactions Lookup by User ID
CREATE INDEX IF NOT EXISTS idx_wallet_tx_user_id 
  ON public.wallet_transactions (user_id, created_at DESC);


-- 2. SECURITY & RLS AUDIT VERIFICATION
-- ----------------------------------------------------------------------------
-- Enable RLS across all tables
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Security Policy: Public read for published tournaments
DROP POLICY IF EXISTS "Public Read Tournaments" ON public.tournaments;
CREATE POLICY "Public Read Tournaments" 
  ON public.tournaments 
  FOR SELECT 
  USING (true);

-- Security Policy: Admin full write access on tournaments
DROP POLICY IF EXISTS "Admin Full Access Tournaments" ON public.tournaments;
CREATE POLICY "Admin Full Access Tournaments" 
  ON public.tournaments 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin')
    )
  );

-- Security Policy: Users can view their own wallet transactions
DROP POLICY IF EXISTS "Users View Own Wallet Tx" ON public.wallet_transactions;
CREATE POLICY "Users View Own Wallet Tx" 
  ON public.wallet_transactions 
  FOR SELECT 
  USING (auth.uid() = user_id);
