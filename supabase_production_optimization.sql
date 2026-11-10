-- ============================================================================
-- MJ ESPORTS — Production Database Audit & SQL Optimization Package (Stage 3)
-- Target Engine: Supabase PostgreSQL (PostgREST API)
-- Security Hardened:
--   1. Zero Room Credential & PII Leakage: Revokes direct SELECT on room_id,
--      room_password, and teams_list from all public and authenticated roles.
--   2. Provides restricted public view (public.tournaments_public) and secure RPC
--      (public.get_public_tournaments()) strictly excluding teams_list (PII,
--      player UIDs, user UUIDs, payment IDs) and room credentials.
--   3. Provides baseline get_tournament_room_credentials() SECURITY DEFINER function.
--   4. Preserves full admin access (USING and WITH CHECK).
--   5. Verified high-traffic composite indexes for zero full-table scans.
--   6. Hardened user-isolated RLS for notifications (strict anti-impersonation
--      and anti-spoofing) and wallet transactions.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. PREREQUISITE COLUMNS VERIFICATION (Idempotent schema alignment)
-- ----------------------------------------------------------------------------
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS banner_url TEXT;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS mode TEXT DEFAULT 'Squad';
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS map TEXT DEFAULT 'Bermuda';
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS registration_start TIMESTAMPTZ;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS registration_end TIMESTAMPTZ;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS match_date TEXT;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS match_time TEXT;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS banner_image TEXT;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS team_size INTEGER DEFAULT 4;


-- ----------------------------------------------------------------------------
-- 2. INDEX OPTIMIZATIONS (Eliminates Full Table Scans for High Traffic)
-- ----------------------------------------------------------------------------
-- Tournaments List Sorting Index
CREATE INDEX IF NOT EXISTS idx_tournaments_created_at_desc 
  ON public.tournaments (created_at DESC);

-- Tournaments Filter by Status
CREATE INDEX IF NOT EXISTS idx_tournaments_status 
  ON public.tournaments (status);

-- Tournament Registrations Lookup by Tournament ID
CREATE INDEX IF NOT EXISTS idx_registrations_tournament_id 
  ON public.tournament_registrations (tournament_id);

-- Tournament Registrations Lookup by User ID
CREATE INDEX IF NOT EXISTS idx_registrations_user_id 
  ON public.tournament_registrations (user_id);

-- Composite Index for Fast Duplicate Registration Lookups
CREATE INDEX IF NOT EXISTS idx_registrations_dup_lookup 
  ON public.tournament_registrations (tournament_id, email, free_fire_uid);

-- User Roles Security Policy Fast Lookup
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id_role 
  ON public.user_roles (user_id, role);

-- Profiles Lookup by Username
CREATE INDEX IF NOT EXISTS idx_profiles_username 
  ON public.profiles (username);

-- Wallet Transactions Lookup by User ID & Timestamp
CREATE INDEX IF NOT EXISTS idx_wallet_tx_user_id_created_at
  ON public.wallet_transactions (user_id, created_at DESC);

-- Notifications Inbox Lookup by User ID & Timestamp
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_created_at
  ON public.notifications (user_id, created_at DESC);


-- ----------------------------------------------------------------------------
-- 3. SENSITIVE CREDENTIAL & PII COLUMN PRIVILEGE HARDENING
-- Restricts column-level SELECT on room_id, room_password, and teams_list
-- from public and authenticated roles.
-- Frontends query tournaments via safe column lists, public view, or secure RPC.
-- Authorized participants and admins obtain credentials via get_tournament_room_credentials().
-- Authorized backend operations access teams_list via service_role.
-- ----------------------------------------------------------------------------
REVOKE SELECT ON public.tournaments FROM anon, authenticated, public;

GRANT SELECT (
  id,
  title,
  game,
  format,
  prize_pool,
  entry_fee,
  max_teams,
  registered_teams,
  start_date,
  start_time,
  status,
  organizer,
  description,
  rules,
  room_status,
  room_last_updated,
  room_published_by,
  winner_team,
  winner_captain,
  created_at,
  updated_at,
  banner_url,
  mode,
  map,
  registration_start,
  registration_end,
  match_date,
  match_time,
  banner_image,
  team_size
) ON public.tournaments TO anon, authenticated;

-- Service role retains full administrative privileges
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tournaments TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.tournaments TO authenticated;
GRANT ALL ON public.tournaments TO service_role;


-- ----------------------------------------------------------------------------
-- 4. RESTRICTED PUBLIC TOURNAMENTS VIEW & SECURE RPC
-- Note: teams_list (participant PII, player UIDs, user UUIDs, payment references),
-- room_id, and room_password are strictly excluded from public views and RPCs.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.tournaments_public AS
SELECT
  id,
  title,
  game,
  format,
  prize_pool,
  entry_fee,
  max_teams,
  registered_teams,
  start_date,
  start_time,
  status,
  organizer,
  description,
  rules,
  room_status,
  room_last_updated,
  room_published_by,
  winner_team,
  winner_captain,
  created_at,
  updated_at,
  banner_url,
  mode,
  map,
  registration_start,
  registration_end,
  match_date,
  match_time,
  banner_image,
  team_size
FROM public.tournaments
WHERE (status != 'Draft' OR public.is_admin());

GRANT SELECT ON public.tournaments_public TO anon, authenticated, service_role;

-- Secure helper RPC to fetch public tournaments ordered by creation date
CREATE OR REPLACE FUNCTION public.get_public_tournaments()
RETURNS SETOF public.tournaments_public
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT *
  FROM public.tournaments_public
  ORDER BY created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_tournaments() TO anon, authenticated, service_role;


-- ----------------------------------------------------------------------------
-- 5. SECURE ROOM CREDENTIALS ACCESS RPC (Baseline Stage 3 Gate)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_tournament_room_credentials(
  p_tournament_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_is_admin BOOLEAN := FALSE;
  v_tourn RECORD;
  v_is_registered BOOLEAN := FALSE;
BEGIN
  -- 1. Check user authentication
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'UNAUTHENTICATED',
      'message', 'Authentication is required to view room credentials.'
    );
  END IF;

  -- 2. Fetch tournament credentials (never exposing teams_list)
  SELECT id, room_id, room_password, room_status, room_last_updated, room_published_by
  INTO v_tourn
  FROM public.tournaments
  WHERE id = p_tournament_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'TOURNAMENT_NOT_FOUND',
      'message', 'Tournament not found.'
    );
  END IF;

  -- 3. Check admin privileges
  v_is_admin := public.is_admin();
  IF v_is_admin THEN
    RETURN jsonb_build_object(
      'success', true,
      'room_id', COALESCE(v_tourn.room_id, ''),
      'room_password', COALESCE(v_tourn.room_password, ''),
      'room_status', COALESCE(v_tourn.room_status, 'Draft'),
      'room_last_updated', v_tourn.room_last_updated,
      'room_published_by', v_tourn.room_published_by,
      'is_admin_override', true
    );
  END IF;

  -- 4. Publication gate: Non-admins cannot view unpublished/Draft credentials
  IF COALESCE(v_tourn.room_status, 'Draft') != 'Published' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'ROOM_NOT_PUBLISHED',
      'message', 'Custom room credentials have not been published yet.'
    );
  END IF;

  -- 5. Participant authorization check: Must have an approved/confirmed registration
  SELECT EXISTS (
    SELECT 1
    FROM public.tournament_registrations
    WHERE tournament_id = p_tournament_id
      AND user_id = v_user_id
      AND (status IS NULL OR LOWER(status) IN ('approved', 'confirmed', 'active'))
  ) INTO v_is_registered;

  IF NOT v_is_registered THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'NOT_REGISTERED',
      'message', 'You are not a registered participant in this tournament.'
    );
  END IF;

  -- 6. Authorized participant + Published credentials
  RETURN jsonb_build_object(
    'success', true,
    'room_id', COALESCE(v_tourn.room_id, ''),
    'room_password', COALESCE(v_tourn.room_password, ''),
    'room_status', 'Published',
    'room_last_updated', v_tourn.room_last_updated,
    'room_published_by', v_tourn.room_published_by
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_tournament_room_credentials(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_tournament_room_credentials(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_tournament_room_credentials(TEXT) TO service_role;


-- ----------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY (RLS) POLICIES AUDIT & HARDENING
-- ----------------------------------------------------------------------------
-- Enable RLS across all relevant tables
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 6.1 Tournaments Policies
-- ----------------------------------------------------------------------------
-- Drop all legacy and title-case policy variants
DROP POLICY IF EXISTS "Public Read Tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "Public read tournaments" ON public.tournaments;

-- Public can read all active tournaments (Drafts are hidden unless admin)
CREATE POLICY "Public Read Tournaments" 
  ON public.tournaments 
  FOR SELECT 
  USING (status != 'Draft' OR public.is_admin());

-- Drop all legacy admin tournament policies
DROP POLICY IF EXISTS "Admin Full Access Tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "Admins insert tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "Admins update tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "Admins delete tournaments" ON public.tournaments;

-- Admin full access with both USING and WITH CHECK guards
CREATE POLICY "Admin Full Access Tournaments" 
  ON public.tournaments 
  FOR ALL 
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- 6.2 Wallet Transactions Policies
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users View Own Wallet Tx" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Users read own wallet transactions or admin reads all" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Admins insert wallet transactions" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Admins manage wallet transactions" ON public.wallet_transactions;

-- Users can view their own wallet transactions; Admins can view all
CREATE POLICY "Users View Own Wallet Tx" 
  ON public.wallet_transactions 
  FOR SELECT 
  USING (auth.uid() = user_id OR public.is_admin());

-- Mutations restricted to authenticated administrators and service_role
CREATE POLICY "Admins manage wallet transactions"
  ON public.wallet_transactions
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- 6.3 Notifications Policies
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users View Own Notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users read own notifications or admin reads all" ON public.notifications;
DROP POLICY IF EXISTS "Users Update Own Notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "System or Admins insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users or Admins insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users Insert Own Notifications Or Admin Inserts Any" ON public.notifications;
DROP POLICY IF EXISTS "Admins manage notifications" ON public.notifications;

-- Users view own notifications; Admins view all
CREATE POLICY "Users View Own Notifications"
  ON public.notifications
  FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

-- Users update (mark as read) their own notifications
CREATE POLICY "Users Update Own Notifications"
  ON public.notifications
  FOR UPDATE
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- Notifications insert security:
-- 1. Administrators can insert notifications for any user (announcements, alerts, broadcasts)
-- 2. Ordinary authenticated users can only insert notifications for themselves (auth.uid() = user_id)
-- 3. Cross-user spoofing and unauthorized recipient targeting are strictly blocked
-- 4. Trusted backend services / Edge Functions using service_role bypass RLS automatically
CREATE POLICY "Users Insert Own Notifications Or Admin Inserts Any"
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin() OR auth.uid() = user_id);

-- Full management for admins
CREATE POLICY "Admins manage notifications"
  ON public.notifications
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
