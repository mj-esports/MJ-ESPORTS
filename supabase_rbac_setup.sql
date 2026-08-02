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

-- Safe Column Migration for Custom Room Credentials & Winner Declaration
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS room_id TEXT;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS room_password TEXT;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS room_status TEXT DEFAULT 'Draft';
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS room_last_updated TIMESTAMPTZ;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS room_published_by TEXT;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS winner_team TEXT;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS winner_captain TEXT;

-- 1.4 profiles Table (Player Profile Foundation)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  game_uid TEXT,
  game TEXT DEFAULT 'Free Fire',
  wins INTEGER DEFAULT 0 CHECK (wins >= 0),
  matches_played INTEGER DEFAULT 0 CHECK (matches_played >= 0),
  earnings TEXT DEFAULT '₹0',
  statistics JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Safe Column Migration for Player Management System
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'Pending' CHECK (verification_status IN ('Pending', 'Verified', 'Suspended'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 1.5 teams & team_members Tables (Team System Foundation)
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  captain_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  captain_name TEXT NOT NULL,
  team_uid TEXT UNIQUE DEFAULT ('TEAM-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8))),
  game TEXT DEFAULT 'Free Fire',
  tournament_history JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Safe Column Migration for Team Management System
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Verified' CHECK (status IN ('Verified', 'Pending', 'Suspended'));
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS logo_url TEXT;

CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  player_name TEXT NOT NULL,
  game_uid TEXT NOT NULL,
  role TEXT DEFAULT 'Member',
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1.6 matches & match_results Tables (Command Center Engine)
CREATE TABLE IF NOT EXISTS public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id TEXT NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  match_number INTEGER NOT NULL DEFAULT 1,
  match_type TEXT DEFAULT 'Group Stage',
  scheduled_time TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'Scheduled' CHECK (status IN ('Scheduled', 'Check-in Open', 'Room Ready', 'Live', 'Completed', 'Cancelled')),
  room_id TEXT,
  room_password TEXT,
  room_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.match_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  team_name TEXT NOT NULL,
  placement INTEGER NOT NULL DEFAULT 0 CHECK (placement >= 0),
  kills INTEGER NOT NULL DEFAULT 0 CHECK (kills >= 0),
  points INTEGER NOT NULL DEFAULT 0 CHECK (points >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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

CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_teams_captain_id ON public.teams(captain_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON public.team_members(team_id);

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

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_teams_updated_at ON public.teams;
CREATE TRIGGER set_teams_updated_at
  BEFORE UPDATE ON public.teams
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

-- Enable RLS on all tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

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

-- 4.4 RLS Policies for profiles
DROP POLICY IF EXISTS "Public profiles read" ON public.profiles;
CREATE POLICY "Public profiles read" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id OR public.is_admin());

-- 4.5 RLS Policies for teams & team_members
DROP POLICY IF EXISTS "Public teams read" ON public.teams;
CREATE POLICY "Public teams read" ON public.teams FOR SELECT USING (true);

DROP POLICY IF EXISTS "Captains or admins insert teams" ON public.teams;
CREATE POLICY "Captains or admins insert teams" ON public.teams FOR INSERT WITH CHECK (auth.uid() = captain_id OR public.is_admin());

DROP POLICY IF EXISTS "Captains or admins update teams" ON public.teams;
CREATE POLICY "Captains or admins update teams" ON public.teams FOR UPDATE USING (auth.uid() = captain_id OR public.is_admin());

DROP POLICY IF EXISTS "Captains or admins delete teams" ON public.teams;
CREATE POLICY "Captains or admins delete teams" ON public.teams FOR DELETE USING (auth.uid() = captain_id OR public.is_admin());

DROP POLICY IF EXISTS "Public team members read" ON public.team_members;
CREATE POLICY "Public team members read" ON public.team_members FOR SELECT USING (true);

DROP POLICY IF EXISTS "Captains or admins manage members" ON public.team_members;
CREATE POLICY "Captains or admins manage members" ON public.team_members FOR ALL USING (
  public.is_admin() OR EXISTS (SELECT 1 FROM public.teams WHERE id = team_id AND captain_id = auth.uid())
);

-- 4.6 RLS Policies for matches & match_results
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read matches if published or admin" ON public.matches;
CREATE POLICY "Public read matches if published or admin" ON public.matches FOR SELECT USING (room_published = true OR public.is_admin());

DROP POLICY IF EXISTS "Admins manage matches" ON public.matches;
CREATE POLICY "Admins manage matches" ON public.matches FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Public read match_results" ON public.match_results;
CREATE POLICY "Public read match_results" ON public.match_results FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins manage match_results" ON public.match_results;
CREATE POLICY "Admins manage match_results" ON public.match_results FOR ALL USING (public.is_admin());

-- ---------------------------------------------------------
-- 5. INITIAL ADMIN PROMOTION
-- ---------------------------------------------------------
INSERT INTO public.user_roles (user_id, email, role)
SELECT id, email, 'admin'
FROM auth.users
WHERE email = 'mjesports.team@gmail.com'
ON CONFLICT (user_id) 
DO UPDATE SET role = 'admin';
