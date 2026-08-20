-- ============================================================================
-- MJ ESPORTS — Phase 6.13: is_admin() Owner & Admin RBAC Integration
-- Target Engine: Supabase PostgreSQL
-- Description: Updates public.is_admin() helper function to include 'owner'
--              in administrative role checks so that Owner accounts can perform
--              standard administrative tournament, match, and profile operations
--              while keeping financial payout execution strictly governed by
--              public.is_owner().
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin', 'super_admin')
  );
END;
$$;

-- Revoke execution privileges from unauthenticated / public roles
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;

-- Ensure authenticated and service_role retain execute permission
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO service_role;
