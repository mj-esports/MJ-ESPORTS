-- =========================================================
-- MJ ESPORTS Phase 10 Supabase Database Migration & RLS Script
-- =========================================================

-- 1. Extend tournaments table with all Module 1 & Module 4 columns
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS mode TEXT DEFAULT 'Squad';
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS map TEXT DEFAULT 'Bermuda';
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS registration_start TIMESTAMPTZ;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS registration_end TIMESTAMPTZ;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS match_date TEXT;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS match_time TEXT;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS banner_image TEXT;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS team_size INTEGER DEFAULT 4;

-- Update tournament status constraint if needed
ALTER TABLE public.tournaments DROP CONSTRAINT IF EXISTS tournaments_status_check;
ALTER TABLE public.tournaments ADD CONSTRAINT tournaments_status_check 
  CHECK (status IN ('Draft', 'Registration Open', 'Registration Closed', 'Live', 'Live Now', 'Completed', 'Cancelled', 'Bracket Locked'));

-- 2. Create wallet_transactions Table (Module 8)
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('Entry Fee Debit', 'Prize Credit', 'Refund', 'Bonus Credit', 'Deposit', 'Withdrawal')),
  amount NUMERIC(12, 2) NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Completed' CHECK (status IN ('Pending', 'Completed', 'Failed', 'Cancelled')),
  tournament_id TEXT REFERENCES public.tournaments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Create notifications Table (Module 9)
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error', 'payment', 'room', 'prize')),
  is_read BOOLEAN NOT NULL DEFAULT false,
  link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Create leaderboards Table (Module 7)
CREATE TABLE IF NOT EXISTS public.leaderboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id TEXT NOT NULL,
  entity_type TEXT NOT NULL DEFAULT 'player' CHECK (entity_type IN ('player', 'team')),
  name TEXT NOT NULL,
  game TEXT NOT NULL DEFAULT 'Free Fire',
  rank INTEGER NOT NULL DEFAULT 0,
  points INTEGER NOT NULL DEFAULT 0,
  kills INTEGER NOT NULL DEFAULT 0,
  wins INTEGER NOT NULL DEFAULT 0,
  matches_played INTEGER NOT NULL DEFAULT 0,
  season TEXT NOT NULL DEFAULT 'Season 4',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. INDEXES FOR FAST PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_wallet_tx_user_id ON public.wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_leaderboards_rank ON public.leaderboards(rank);
CREATE INDEX IF NOT EXISTS idx_leaderboards_game ON public.leaderboards(game);

-- 6. ROW LEVEL SECURITY (RLS) & POLICIES
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboards ENABLE ROW LEVEL SECURITY;

-- Wallet Transactions Policies
DROP POLICY IF EXISTS "Users read own wallet transactions or admin reads all" ON public.wallet_transactions;
CREATE POLICY "Users read own wallet transactions or admin reads all" 
  ON public.wallet_transactions FOR SELECT 
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Admins insert wallet transactions" ON public.wallet_transactions;
CREATE POLICY "Admins insert wallet transactions" 
  ON public.wallet_transactions FOR INSERT 
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- Notifications Policies
DROP POLICY IF EXISTS "Users read own notifications or admin reads all" ON public.notifications;
CREATE POLICY "Users read own notifications or admin reads all" 
  ON public.notifications FOR SELECT 
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
CREATE POLICY "Users update own notifications" 
  ON public.notifications FOR UPDATE 
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "System or Admins insert notifications" ON public.notifications;
CREATE POLICY "System or Admins insert notifications" 
  ON public.notifications FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- Leaderboards Policies
DROP POLICY IF EXISTS "Public read leaderboards" ON public.leaderboards;
CREATE POLICY "Public read leaderboards" 
  ON public.leaderboards FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Admins manage leaderboards" ON public.leaderboards;
CREATE POLICY "Admins manage leaderboards" 
  ON public.leaderboards FOR ALL 
  USING (public.is_admin());
