-- ============================================================================
-- MJ ESPORTS — Phase 6.16: Secure Public Leaderboard Avatar Access
-- Target Engine: Supabase PostgreSQL
-- Description:
--   1. Creates public.get_public_profile_avatars(user_ids UUID[]) SECURITY DEFINER RPC.
--   2. Exposes ONLY (id UUID, avatar_url TEXT) for the requested user IDs.
--   3. Strictly prevents exposure of sensitive profile fields (email, phone,
--      wallet balance, payout details, PII, role, etc.).
--   4. Grants EXECUTE to 'anon', 'authenticated', and 'service_role' for public
--      leaderboard display without weakening or altering existing profiles RLS.
--   5. Hardened with explicit SET search_path = pg_catalog, public to guard
--      against search_path hijacking attacks.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_public_profile_avatars(
  user_ids UUID[]
)
RETURNS TABLE (
  id UUID,
  avatar_url TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public
STABLE
AS $$
  SELECT 
    p.id,
    p.avatar_url
  FROM public.profiles p
  WHERE p.id = ANY(user_ids)
    AND p.avatar_url IS NOT NULL
    AND TRIM(p.avatar_url) != '';
$$;

-- Revoke default public execution privileges
REVOKE ALL ON FUNCTION public.get_public_profile_avatars(UUID[]) FROM PUBLIC;

-- Grant EXECUTE privileges strictly to roles requiring leaderboard avatar resolution
GRANT EXECUTE ON FUNCTION public.get_public_profile_avatars(UUID[]) TO anon, authenticated, service_role;
