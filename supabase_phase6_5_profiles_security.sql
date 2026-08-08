-- ============================================================================
-- MJ ESPORTS — Phase 6.5: Production Profiles Security Migration (Final Hardened)
-- Target Engine: Supabase PostgreSQL
-- Description: 1. Enables & hardens Row Level Security (RLS) on public.profiles.
--              2. Restricts SELECT on public.profiles to own row (auth.uid() = id)
--                 or admins (public.is_admin() = true).
--              3. Restricts UPDATE on public.profiles with USING and WITH CHECK to prevent
--                 updating row identity to another user's UUID.
--              4. Revokes all direct base-table privileges on public.profiles from anon/PUBLIC.
--              5. Creates public.public_profiles view exposing ONLY non-sensitive
--                 player fields (id, username, avatar_url, game, wins, matches_played, verification_status).
--              6. Configures view execution context (security_invoker = false) so
--                 authenticated users can query all usernames for uniqueness validation.
--              7. Restricts view SELECT privileges strictly to authenticated & service_role
--                 (Revokes SELECT from anon and PUBLIC).
-- ============================================================================

-- 1. Enable RLS on public.profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing overly-permissive or outdated RLS policies
DROP POLICY IF EXISTS "Public profiles read" ON public.profiles;
DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users read own profile or admin reads all" ON public.profiles;
DROP POLICY IF EXISTS "Admins delete profiles" ON public.profiles;

-- 3. Create hardened RLS policies on public.profiles

-- 3.1 SELECT Policy: Users read ONLY their own profile; Admins read all profiles
CREATE POLICY "Users read own profile or admin reads all"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.is_admin());

-- 3.2 INSERT / UPSERT Policy: Users insert ONLY their own row; Admins insert any row
CREATE POLICY "Users insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id OR public.is_admin());

-- 3.3 UPDATE Policy: Users update ONLY their own row; Admins update any row
--     Enforces USING and WITH CHECK to prevent changing row identity to another user's UUID
CREATE POLICY "Users update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());

-- 3.4 DELETE Policy: Admins only
CREATE POLICY "Admins delete profiles"
  ON public.profiles FOR DELETE
  USING (public.is_admin());

-- 4. Revoke all direct privileges on public.profiles from unauthenticated roles
REVOKE ALL ON public.profiles FROM PUBLIC, anon;

-- 5. Grant explicit table-level privileges on public.profiles to authenticated & service_role
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- 6. Create public.public_profiles view for non-sensitive public display & username uniqueness checks
--    Exposes ONLY: id, username, avatar_url, game, wins, matches_played, verification_status
--    Excludes: email, game_uid, earnings, statistics, created_at, updated_at
--    Explicitly set security_invoker = false so the view queries all rows for username uniqueness validation
CREATE OR REPLACE VIEW public.public_profiles
WITH (security_invoker = false) AS
SELECT 
  id,
  username,
  avatar_url,
  game,
  wins,
  matches_played,
  verification_status
FROM public.profiles;

-- 7. Revoke view access from unauthenticated roles; Grant SELECT ONLY to authenticated and service_role
REVOKE SELECT ON public.public_profiles FROM PUBLIC, anon;
GRANT SELECT ON public.public_profiles TO authenticated;
GRANT SELECT ON public.public_profiles TO service_role;

-- ============================================================================
-- VERIFICATION QUERIES (RUN IN SUPABASE SQL EDITOR TO AUDIT MIGRATION)
-- ============================================================================
-- A. Verify RLS status on public.profiles:
--    SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'profiles';
--
-- B. Verify RLS policies on public.profiles:
--    SELECT tablename, policyname, permissive, roles, cmd, qual, with_check 
--    FROM pg_policies WHERE tablename = 'profiles';
--
-- C. Verify profiles privileges for anon/public/authenticated:
--    SELECT grantee, privilege_type 
--    FROM information_schema.role_table_grants 
--    WHERE table_name = 'profiles';
--
-- D. Verify columns exposed by public.public_profiles view:
--    SELECT column_name, data_type 
--    FROM information_schema.columns 
--    WHERE table_schema = 'public' AND table_name = 'public_profiles';
--
-- E. Verify privileges on public.public_profiles view:
--    SELECT grantee, privilege_type 
--    FROM information_schema.role_table_grants 
--    WHERE table_name = 'public_profiles';
--
-- F. Verify public.public_profiles view definition:
--    SELECT view_definition 
--    FROM information_schema.views 
--    WHERE table_schema = 'public' AND table_name = 'public_profiles';
--
-- G. Verify public.public_profiles view owner:
--    SELECT table_owner 
--    FROM information_schema.tables 
--    WHERE table_schema = 'public' AND table_name = 'public_profiles';
--
-- H. Verify current PostgreSQL server version:
--    SELECT version();
-- ============================================================================
