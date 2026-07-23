-- =========================================================
-- MJ ESPORTS Production Supabase Database Schema & Enterprise RBAC
-- =========================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------
-- 1. TABLES CREATION
-- ---------------------------------------------------------

-- 1.1 user_roles Table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1.2 tournaments Table
CREATE TABLE IF NOT EXISTS public.tournaments (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  game TEXT NOT NULL,
  format TEXT NOT NULL,
  prize_pool TEXT NOT NULL,
  entry_fee TEXT NOT NULL DEFAULT 'Free',
  max_teams INTEGER NOT NULL DEFAULT 32 CHECK (max_teams > 0),
  registered_teams INTEGER NOT NULL DEFAULT 0 CHECK (registered_teams >= 0),
  start_date TEXT NOT NULL,
  start_time TEXT,
  status TEXT NOT NULL DEFAULT 'Registration Open' CHECK (status IN ('Registration Open', 'Live Now', 'Registration Closed', 'Completed', 'Bracket Locked')),
  organizer TEXT DEFAULT 'MJ ESPORTS Official',
  description TEXT,
  rules TEXT[],
  teams_list JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1.3 tournament_registrations Table
CREATE TABLE IF NOT EXISTS public.tournament_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id TEXT NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  team_name TEXT NOT NULL,
  captain_name TEXT NOT NULL,
  free_fire_uid TEXT NOT NULL,
  whatsapp_number TEXT NOT NULL,
  email TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Approved', 'Pending', 'Rejected', 'Cancelled', 'Checked-in')),
  registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------
-- 2. INDEXES FOR PERFORMANCE
-- ---------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

CREATE INDEX IF NOT EXISTS idx_tournaments_status ON public.tournaments(status);
CREATE INDEX IF NOT EXISTS idx_tournaments_game ON public.tournaments(game);

CREATE INDEX IF NOT EXISTS idx_registrations_tournament_id ON public.tournament_registrations(tournament_id);
CREATE INDEX IF NOT EXISTS idx_registrations_user_id ON public.tournament_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_registrations_email ON public.tournament_registrations(email);
CREATE INDEX IF NOT EXISTS idx_registrations_free_fire_uid ON public.tournament_registrations(free_fire_uid);

-- ---------------------------------------------------------
-- 3. FUNCTIONS & TRIGGERS
-- ---------------------------------------------------------

-- Automatic updated_at timestamp trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_user_roles_updated_at ON public.user_roles;
CREATE TRIGGER set_user_roles_updated_at
  BEFORE UPDATE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_tournaments_updated_at ON public.tournaments;
CREATE TRIGGER set_tournaments_updated_at
  BEFORE UPDATE ON public.tournaments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_tournament_registrations_updated_at ON public.tournament_registrations;
CREATE TRIGGER set_tournament_registrations_updated_at
  BEFORE UPDATE ON public.tournament_registrations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Helper function to verify if current session belongs to an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------
-- 4. ROW LEVEL SECURITY (RLS) ENABLEMENT & POLICIES
-- ---------------------------------------------------------

-- Enable RLS on all tables (only after tables are created)
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_registrations ENABLE ROW LEVEL SECURITY;

-- 4.1 RLS Policies for user_roles
DROP POLICY IF EXISTS "Users can read own role" ON public.user_roles;
CREATE POLICY "Users can read own role" 
  ON public.user_roles FOR SELECT 
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Admins can manage user_roles" ON public.user_roles;
CREATE POLICY "Admins can manage user_roles" 
  ON public.user_roles FOR ALL 
  USING (public.is_admin());

-- 4.2 RLS Policies for tournaments
DROP POLICY IF EXISTS "Public read tournaments" ON public.tournaments;
CREATE POLICY "Public read tournaments" 
  ON public.tournaments FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Admins insert tournaments" ON public.tournaments;
CREATE POLICY "Admins insert tournaments" 
  ON public.tournaments FOR INSERT 
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins update tournaments" ON public.tournaments;
CREATE POLICY "Admins update tournaments" 
  ON public.tournaments FOR UPDATE 
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins delete tournaments" ON public.tournaments;
CREATE POLICY "Admins delete tournaments" 
  ON public.tournaments FOR DELETE 
  USING (public.is_admin());

-- 4.3 RLS Policies for tournament_registrations
DROP POLICY IF EXISTS "Users read own registrations or admins read all" ON public.tournament_registrations;
CREATE POLICY "Users read own registrations or admins read all" 
  ON public.tournament_registrations FOR SELECT 
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Authenticated users register" ON public.tournament_registrations;
CREATE POLICY "Authenticated users register" 
  ON public.tournament_registrations FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Admins update registrations" ON public.tournament_registrations;
CREATE POLICY "Admins update registrations" 
  ON public.tournament_registrations FOR UPDATE 
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins or owners delete registrations" ON public.tournament_registrations;
CREATE POLICY "Admins or owners delete registrations" 
  ON public.tournament_registrations FOR DELETE 
  USING (auth.uid() = user_id OR public.is_admin());

-- ---------------------------------------------------------
-- 5. INITIAL ADMIN PROMOTION
-- ---------------------------------------------------------
INSERT INTO public.user_roles (user_id, email, role)
SELECT id, email, 'admin'
FROM auth.users
WHERE email = 'mjesports.team@gmail.com'
ON CONFLICT (user_id) 
DO UPDATE SET role = 'admin';
