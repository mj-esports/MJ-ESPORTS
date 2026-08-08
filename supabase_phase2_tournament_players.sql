-- ============================================================================
-- MJ ESPORTS — Phase 2: Tournament Player Identity & Duplicate Protection
-- Target Engine: Supabase PostgreSQL
-- Description: Creates normalized public.tournament_players table, UID 
--              normalization generated column, partial unique indexes for
--              user_id and game_uid, performance indexes, and RLS policies.
-- ============================================================================

-- 1. CREATE NORMALIZED TOURNAMENT PLAYERS TABLE
CREATE TABLE IF NOT EXISTS public.tournament_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id TEXT NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  registration_id UUID NOT NULL REFERENCES public.tournament_registrations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  game TEXT NOT NULL CHECK (game IN ('Free Fire', 'Free Fire MAX', 'BGMI')),
  game_uid TEXT NOT NULL,
  normalized_game_uid TEXT GENERATED ALWAYS AS (UPPER(TRIM(game_uid))) STORED,
  player_role TEXT NOT NULL CHECK (player_role IN ('Captain', 'Member', 'Substitute')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. UNIQUE CONSTRAINTS & INDEXES FOR DUPLICATE PROTECTION

-- 2.1 Game UID Duplicate Protection per Tournament (Blocks same Game UID across teams/roles in same tournament)
CREATE UNIQUE INDEX IF NOT EXISTS uq_tournament_players_game_uid
  ON public.tournament_players (tournament_id, normalized_game_uid);

-- 2.2 Authenticated User Duplicate Protection per Tournament (Blocks same authenticated user in same tournament, allows NULL for guests)
CREATE UNIQUE INDEX IF NOT EXISTS uq_tournament_players_user_id
  ON public.tournament_players (tournament_id, user_id)
  WHERE user_id IS NOT NULL;

-- 2.3 Partial Unique Index on tournament_registrations for user_id per tournament
CREATE UNIQUE INDEX IF NOT EXISTS uq_tournament_registrations_user_id
  ON public.tournament_registrations (tournament_id, user_id)
  WHERE user_id IS NOT NULL;

-- 3. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_tournament_players_registration_id
  ON public.tournament_players (registration_id);

CREATE INDEX IF NOT EXISTS idx_tournament_players_user_id
  ON public.tournament_players (user_id);

CREATE INDEX IF NOT EXISTS idx_tournament_players_normalized_uid
  ON public.tournament_players (normalized_game_uid);

-- 4. ROW LEVEL SECURITY (RLS) ENABLEMENT & POLICIES
ALTER TABLE public.tournament_players ENABLE ROW LEVEL SECURITY;

-- 4.1 Users read own player records or admins read all
DROP POLICY IF EXISTS "Users read own player records or admins read all" ON public.tournament_players;
CREATE POLICY "Users read own player records or admins read all"
  ON public.tournament_players FOR SELECT
  USING (
    (user_id IS NOT NULL AND auth.uid() = user_id)
    OR public.is_admin()
  );

-- 4.2 Authenticated users or RPC inserts player records
DROP POLICY IF EXISTS "Authenticated users insert player records" ON public.tournament_players;
CREATE POLICY "Authenticated users insert player records"
  ON public.tournament_players FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL OR public.is_admin()
  );

-- 4.3 Admins update player records
DROP POLICY IF EXISTS "Admins update player records" ON public.tournament_players;
CREATE POLICY "Admins update player records"
  ON public.tournament_players FOR UPDATE
  USING (public.is_admin());

-- 4.4 Users delete own player records or admins delete all
DROP POLICY IF EXISTS "Users or admins delete player records" ON public.tournament_players;
CREATE POLICY "Users or admins delete player records"
  ON public.tournament_players FOR DELETE
  USING (
    (user_id IS NOT NULL AND auth.uid() = user_id)
    OR public.is_admin()
  );
