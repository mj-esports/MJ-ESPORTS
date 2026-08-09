-- ============================================================================
-- MJ ESPORTS — Phase 6.5: Production Profiles Security Migration (Final Hardened)
-- Target Engine: Supabase PostgreSQL
-- Description: 1. Enables & hardens Row Level Security (RLS) on public.profiles.
--              2. Restricts SELECT on public.profiles to own row (auth.uid() = id)
--                 or admins (public.is_admin() = true).
--              3. Restricts UPDATE on public.profiles with USING and WITH CHECK to prevent
--                 updating row identity to another user's UUID.
--              4. Revokes all direct base-table privileges on public.profiles from anon/PUBLIC.
--              5. Drops obsolete public.public_profiles view to eliminate SECURITY DEFINER view.
--              6. Creates public.check_username_available SECURITY DEFINER RPC that returns
--                 ONLY boolean availability without exposing any profile data.
--              7. Restricts RPC EXECUTE privileges strictly to authenticated & service_role
--                 (Revokes EXECUTE from anon and PUBLIC).
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

-- 6. Drop obsolete public_profiles view (eliminating SECURITY DEFINER view finding)
DROP VIEW IF EXISTS public.public_profiles;

-- 7. Create narrowly scoped SECURITY DEFINER RPC for username availability checks
--    Returns ONLY boolean (TRUE = available, FALSE = taken/invalid)
--    Never returns profile rows, emails, UIDs, earnings, or user identity details
CREATE OR REPLACE FUNCTION public.check_username_available(
  p_username text,
  p_exclude_user_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_clean_username text;
  v_exists boolean;
BEGIN
  -- Handle NULL / empty / whitespace input safely
  IF p_username IS NULL THEN
    RETURN FALSE;
  END IF;

  v_clean_username := TRIM(p_username);

  IF v_clean_username = '' THEN
    RETURN FALSE;
  END IF;

  -- Check if another profile already uses this username (case-insensitive trim match)
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE LOWER(TRIM(username)) = LOWER(v_clean_username)
      AND (p_exclude_user_id IS NULL OR id <> p_exclude_user_id)
  ) INTO v_exists;

  -- Returns TRUE if available (does NOT exist), FALSE if taken
  RETURN NOT v_exists;
END;
$$;

-- 8. Revoke RPC access from unauthenticated roles; Grant EXECUTE ONLY to authenticated and service_role
REVOKE EXECUTE ON FUNCTION public.check_username_available(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_username_available(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_username_available(text, uuid) TO service_role;

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
-- D. Confirm public.public_profiles does NOT exist:
--    SELECT table_name, table_type
--    FROM information_schema.tables
--    WHERE table_schema = 'public' AND table_name = 'public_profiles';
--
-- E. Confirm check_username_available function exists:
--    SELECT routine_name, routine_type, security_type
--    FROM information_schema.routines
--    WHERE routine_schema = 'public' AND routine_name = 'check_username_available';
--
-- F. Confirm RPC EXECUTE privileges:
--    SELECT grantee, privilege_type
--    FROM information_schema.routine_privileges
--    WHERE routine_schema = 'public' AND routine_name = 'check_username_available';
--
-- G. Confirm RPC function definition/security properties:
--    SELECT p.proname, p.prosecdef, pg_get_functiondef(p.oid)
--    FROM pg_proc p
--    JOIN pg_namespace n ON p.pronamespace = n.oid
--    WHERE n.nspname = 'public' AND p.proname = 'check_username_available';
--
-- H. Check whether a username UNIQUE constraint/index exists:
--    SELECT indexname, indexdef
--    FROM pg_indexes
--    WHERE schemaname = 'public' AND tablename = 'profiles' AND indexdef LIKE '%username%';
-- ============================================================================
