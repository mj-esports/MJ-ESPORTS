-- ============================================================================
-- MJ ESPORTS — Phase 6.4: is_admin() Helper Function Security Hardening
-- Target Engine: Supabase PostgreSQL
-- Description: Records the security hardening applied to public.is_admin().
--              Revokes EXECUTE permission from PUBLIC and anon roles to restrict
--              anonymous invocation of the role check function.
-- ============================================================================

-- RATIONALE & PRIVILEGE ARCHITECTURE:
-- 1. public.is_admin() is a SECURITY DEFINER helper function used across Row Level
--    Security (RLS) policies and RPC functions to determine admin privileges.
-- 2. Anonymous/public callers (unauthenticated visitors) do not require direct EXECUTE
--    access to this function.
-- 3. 'authenticated' users retain EXECUTE permission as application RLS policies
--    and client session validation queries depend on it.
-- 4. 'postgres' and 'service_role' retain full administrative execution privileges.
-- 5. This migration contains ONLY privilege restrictions; function body and RLS
--    policies remain completely untouched.

-- Revoke execution privileges from unauthenticated / public roles
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;

-- Ensure authenticated role retains execute permission for RLS and RPC checks
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO service_role;
