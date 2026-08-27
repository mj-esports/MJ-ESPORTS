-- ============================================================================
-- MJ ESPORTS — Phase 6.15: Security Hardening - Revoke Anon Privileges
-- Target Engine: Supabase PostgreSQL
-- Description: Revokes EXECUTE privilege from 'anon' and 'PUBLIC' roles for:
--              1. public.rls_auto_enable()
--              2. public.protect_profile_financial_columns()
--
-- Security Invariants Preserved:
-- - Functions are NOT removed, altered, or disabled.
-- - Triggers using these functions (e.g. trg_protect_profile_financial_columns) remain enabled and untouched.
-- - Row Level Security (RLS) policies are NOT changed.
-- - Authenticated and service_role permissions remain preserved.
-- - register_tournament_team() permissions remain untouched.
-- ============================================================================

-- 1. Revoke EXECUTE from anon on public.rls_auto_enable()
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC;

-- Ensure authenticated and service_role retain necessary privileges
GRANT EXECUTE ON FUNCTION public.rls_auto_enable() TO authenticated;
GRANT EXECUTE ON FUNCTION public.rls_auto_enable() TO service_role;

-- 2. Revoke EXECUTE from anon on public.protect_profile_financial_columns()
REVOKE EXECUTE ON FUNCTION public.protect_profile_financial_columns() FROM anon;
REVOKE EXECUTE ON FUNCTION public.protect_profile_financial_columns() FROM PUBLIC;

-- Ensure authenticated and service_role retain necessary privileges for profile updates
GRANT EXECUTE ON FUNCTION public.protect_profile_financial_columns() TO authenticated;
GRANT EXECUTE ON FUNCTION public.protect_profile_financial_columns() TO service_role;

-- ----------------------------------------------------------------------------
-- VERIFICATION QUERY (Run to verify permissions and trigger state)
-- ----------------------------------------------------------------------------
-- 1. Function execution permissions check
SELECT 
  p.proname AS function_name,
  pg_catalog.pg_get_function_arguments(p.oid) AS arguments,
  HAS_FUNCTION_PRIVILEGE('anon', p.oid, 'EXECUTE') AS anon_can_execute,
  HAS_FUNCTION_PRIVILEGE('authenticated', p.oid, 'EXECUTE') AS authenticated_can_execute,
  HAS_FUNCTION_PRIVILEGE('service_role', p.oid, 'EXECUTE') AS service_role_can_execute
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('rls_auto_enable', 'protect_profile_financial_columns');

-- 2. Trigger existence & enabled status check on public.profiles
SELECT 
  tgname AS trigger_name,
  relname AS table_name,
  CASE tgenabled 
    WHEN 'O' THEN 'Enabled (Origin & Local)'
    WHEN 'A' THEN 'Always Enabled'
    WHEN 'R' THEN 'Replica Only'
    WHEN 'D' THEN 'Disabled'
    ELSE 'Active'
  END AS trigger_status,
  proname AS trigger_function
FROM pg_trigger tg
JOIN pg_class c ON c.oid = tg.tgrelid
JOIN pg_proc p ON p.oid = tg.tgfoid
WHERE relname = 'profiles' 
  AND tgname = 'trg_protect_profile_financial_columns';
