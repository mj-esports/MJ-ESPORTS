-- ============================================================================
-- MJ ESPORTS — Phase N3.2: Player Team Management / Squad Portal
-- Target Engine: Supabase PostgreSQL
-- Description:
--   1. Additively extends public.teams (tag, description, max_members, is_recruiting).
--   2. Additively extends public.team_members (status, constraints, single active team index).
--   3. Creates public.team_invitations with state machine & duplicate prevention.
--   4. Configures Row Level Security (RLS) policies for all team entities.
--   5. Introduces 10 authoritative SECURITY DEFINER RPCs for all team mutations.
--   6. Enforces atomic N1 notification dispatch on invitation & membership events.
--   7. Strictly isolates payment, matches, and tournament registration systems.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. ADDITIVE SCHEMA EVOLUTION: public.teams
-- ----------------------------------------------------------------------------

-- Add additive columns if not present
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS tag TEXT;
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS max_members INTEGER DEFAULT 6;
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS is_recruiting BOOLEAN DEFAULT TRUE;

-- Add constraints safely using DO blocks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_teams_name_length' AND conrelid = 'public.teams'::regclass
  ) THEN
    ALTER TABLE public.teams ADD CONSTRAINT chk_teams_name_length
      CHECK (LENGTH(TRIM(name)) >= 3 AND LENGTH(TRIM(name)) <= 30);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_teams_tag_format' AND conrelid = 'public.teams'::regclass
  ) THEN
    ALTER TABLE public.teams ADD CONSTRAINT chk_teams_tag_format
      CHECK (tag IS NULL OR (tag ~ '^[A-Z0-9]{2,5}$'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_teams_description_length' AND conrelid = 'public.teams'::regclass
  ) THEN
    ALTER TABLE public.teams ADD CONSTRAINT chk_teams_description_length
      CHECK (description IS NULL OR LENGTH(description) <= 250);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_teams_max_members' AND conrelid = 'public.teams'::regclass
  ) THEN
    ALTER TABLE public.teams ADD CONSTRAINT chk_teams_max_members
      CHECK (max_members >= 4 AND max_members <= 8);
  END IF;
END $$;

-- Case-insensitive unique team name index
CREATE UNIQUE INDEX IF NOT EXISTS idx_teams_name_lower_unique
  ON public.teams (LOWER(TRIM(name)));

-- Lookup indexes for teams
CREATE INDEX IF NOT EXISTS idx_teams_captain_id
  ON public.teams (captain_id);

CREATE INDEX IF NOT EXISTS idx_teams_tag
  ON public.teams (tag);

CREATE INDEX IF NOT EXISTS idx_teams_status
  ON public.teams (status);

-- ----------------------------------------------------------------------------
-- 2. ADDITIVE SCHEMA EVOLUTION: public.team_members
-- ----------------------------------------------------------------------------

-- Add additive columns if not present
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';

-- Add constraints safely using DO blocks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_team_members_role' AND conrelid = 'public.team_members'::regclass
  ) THEN
    ALTER TABLE public.team_members ADD CONSTRAINT chk_team_members_role
      CHECK (role IN ('Captain', 'Member', 'Substitute'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_team_members_status' AND conrelid = 'public.team_members'::regclass
  ) THEN
    ALTER TABLE public.team_members ADD CONSTRAINT chk_team_members_status
      CHECK (status IN ('Active', 'Suspended'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_team_members_game_uid' AND conrelid = 'public.team_members'::regclass
  ) THEN
    ALTER TABLE public.team_members ADD CONSTRAINT chk_team_members_game_uid
      CHECK (game_uid ~ '^[0-9]{10}$');
  END IF;
END $$;

-- Unique constraints per team (preventing duplicates within the same squad)
CREATE UNIQUE INDEX IF NOT EXISTS idx_team_members_team_user_unique
  ON public.team_members (team_id, user_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_team_members_team_game_uid_unique
  ON public.team_members (team_id, game_uid);

-- Single active team policy: A user can belong to only ONE Active team at any given time
CREATE UNIQUE INDEX IF NOT EXISTS idx_team_members_single_active_user
  ON public.team_members (user_id)
  WHERE status = 'Active';

-- Lookup indexes for team_members
CREATE INDEX IF NOT EXISTS idx_team_members_user_id
  ON public.team_members (user_id);

CREATE INDEX IF NOT EXISTS idx_team_members_team_status
  ON public.team_members (team_id, status);

-- ----------------------------------------------------------------------------
-- 3. NEW ENTITY: public.team_invitations
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  inviter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invitee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'Member' CHECK (role IN ('Member', 'Substitute')),
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Accepted', 'Rejected', 'Cancelled', 'Expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  CONSTRAINT chk_team_invitations_not_self CHECK (inviter_id <> invitee_id)
);

-- Prevent duplicate pending invitations for the same user to the same squad
CREATE UNIQUE INDEX IF NOT EXISTS idx_team_invitations_unique_pending
  ON public.team_invitations (team_id, invitee_id)
  WHERE status = 'Pending';

-- Lookup indexes for invitations
CREATE INDEX IF NOT EXISTS idx_team_invitations_invitee_status
  ON public.team_invitations (invitee_id, status);

CREATE INDEX IF NOT EXISTS idx_team_invitations_team_status
  ON public.team_invitations (team_id, status);

CREATE INDEX IF NOT EXISTS idx_team_invitations_inviter_id
  ON public.team_invitations (inviter_id);

-- ----------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------------------------------

-- Enable RLS on all 3 tables
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

-- 4.1 RLS: public.teams
DROP POLICY IF EXISTS "Public teams read" ON public.teams;
CREATE POLICY "Public teams read"
  ON public.teams FOR SELECT
  USING (true);

-- Revoke direct unprivileged mutations; all mutations route through SECURITY DEFINER RPCs.
DROP POLICY IF EXISTS "Captains or admins insert teams" ON public.teams;
DROP POLICY IF EXISTS "Captains or admins update teams" ON public.teams;
DROP POLICY IF EXISTS "Captains or admins delete teams" ON public.teams;
DROP POLICY IF EXISTS "Admins manage teams directly" ON public.teams;

CREATE POLICY "Admins manage teams directly"
  ON public.teams FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 4.2 RLS: public.team_members
DROP POLICY IF EXISTS "Public team members read" ON public.team_members;
CREATE POLICY "Public team members read"
  ON public.team_members FOR SELECT
  USING (true);

-- Revoke direct unprivileged mutations
DROP POLICY IF EXISTS "Captains or admins manage members" ON public.team_members;
DROP POLICY IF EXISTS "Admins manage members directly" ON public.team_members;

CREATE POLICY "Admins manage members directly"
  ON public.team_members FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 4.3 RLS: public.team_invitations
DROP POLICY IF EXISTS "Authorized users read invitations" ON public.team_invitations;
CREATE POLICY "Authorized users read invitations"
  ON public.team_invitations FOR SELECT
  TO authenticated
  USING (
    invitee_id = auth.uid()
    OR inviter_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.teams
      WHERE id = team_id AND captain_id = auth.uid()
    )
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Admins manage invitations directly" ON public.team_invitations;
CREATE POLICY "Admins manage invitations directly"
  ON public.team_invitations FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- ----------------------------------------------------------------------------
-- 5. SERVER-AUTHORITATIVE RPC #1: create_player_team
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_player_team(
  p_name TEXT,
  p_tag TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_game_uid TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_captain_name TEXT;
  v_game_uid TEXT;
  v_clean_name TEXT;
  v_clean_tag TEXT;
  v_clean_desc TEXT;
  v_team_id UUID;
  v_team RECORD;
BEGIN
  -- 1. Authenticated user required
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'UNAUTHENTICATED',
      'message', 'You must be logged in to create a team.'
    );
  END IF;

  -- 2. Verify caller does not already belong to an active team
  IF EXISTS (
    SELECT 1 FROM public.team_members
    WHERE user_id = v_user_id AND status = 'Active'
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'ALREADY_IN_TEAM',
      'message', 'You are already an active member or captain of a team.'
    );
  END IF;

  -- 3. Sanitize and validate team name
  v_clean_name := TRIM(COALESCE(p_name, ''));
  IF LENGTH(v_clean_name) < 3 OR LENGTH(v_clean_name) > 30 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_TEAM_NAME',
      'message', 'Team name must be between 3 and 30 characters.'
    );
  END IF;

  -- 4. Check case-insensitive uniqueness of team name
  IF EXISTS (
    SELECT 1 FROM public.teams
    WHERE LOWER(TRIM(name)) = LOWER(v_clean_name)
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'TEAM_NAME_TAKEN',
      'message', 'A team with this name already exists. Please choose a different name.'
    );
  END IF;

  -- 5. Sanitize and validate squad tag (if provided)
  IF p_tag IS NOT NULL AND TRIM(p_tag) <> '' THEN
    v_clean_tag := UPPER(TRIM(p_tag));
    IF NOT (v_clean_tag ~ '^[A-Z0-9]{2,5}$') THEN
      RETURN jsonb_build_object(
        'success', false,
        'error_code', 'INVALID_TEAM_TAG',
        'message', 'Team tag must be 2 to 5 uppercase alphanumeric characters.'
      );
    END IF;
  ELSE
    v_clean_tag := NULL;
  END IF;

  -- 6. Sanitize and validate description (if provided)
  IF p_description IS NOT NULL AND TRIM(p_description) <> '' THEN
    v_clean_desc := TRIM(p_description);
    IF LENGTH(v_clean_desc) > 250 THEN
      RETURN jsonb_build_object(
        'success', false,
        'error_code', 'INVALID_DESCRIPTION',
        'message', 'Team description cannot exceed 250 characters.'
      );
    END IF;
  ELSE
    v_clean_desc := NULL;
  END IF;

  -- 7. Validate Free Fire UID (strictly 10 digits)
  IF p_game_uid IS NOT NULL AND TRIM(p_game_uid) <> '' THEN
    v_game_uid := TRIM(p_game_uid);
  ELSE
    SELECT game_uid INTO v_game_uid FROM public.profiles WHERE id = v_user_id;
  END IF;

  IF v_game_uid IS NULL OR NOT (v_game_uid ~ '^[0-9]{10}$') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_GAME_UID',
      'message', 'A valid 10-digit Free Fire MAX Character UID is required to create a team.'
    );
  END IF;

  -- 8. Fetch authoritative captain display name from profiles or auth
  SELECT username INTO v_captain_name FROM public.profiles WHERE id = v_user_id;
  IF v_captain_name IS NULL OR TRIM(v_captain_name) = '' THEN
    v_captain_name := 'Captain';
  END IF;

  -- 9. Insert into public.teams atomically
  INSERT INTO public.teams (
    name,
    tag,
    description,
    captain_id,
    captain_name,
    game,
    status,
    max_members,
    is_recruiting,
    created_at,
    updated_at
  ) VALUES (
    v_clean_name,
    v_clean_tag,
    v_clean_desc,
    v_user_id,
    v_captain_name,
    'Free Fire',
    'Verified',
    6,
    TRUE,
    NOW(),
    NOW()
  ) RETURNING id INTO v_team_id;

  -- 10. Insert Captain row into public.team_members
  INSERT INTO public.team_members (
    team_id,
    user_id,
    player_name,
    game_uid,
    role,
    status,
    joined_at
  ) VALUES (
    v_team_id,
    v_user_id,
    v_captain_name,
    v_game_uid,
    'Captain',
    'Active',
    NOW()
  );

  SELECT * INTO v_team FROM public.teams WHERE id = v_team_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Squad successfully created.',
    'team', row_to_json(v_team)
  );
END;
$$;


-- ----------------------------------------------------------------------------
-- 6. SERVER-AUTHORITATIVE RPC #2: update_player_team
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_player_team(
  p_team_id UUID,
  p_name TEXT,
  p_tag TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_is_recruiting BOOLEAN DEFAULT TRUE,
  p_logo_url TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_team RECORD;
  v_clean_name TEXT;
  v_clean_tag TEXT;
  v_clean_desc TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'UNAUTHENTICATED',
      'message', 'Authentication required.'
    );
  END IF;

  -- Lock team row FOR UPDATE
  SELECT * INTO v_team FROM public.teams WHERE id = p_team_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'TEAM_NOT_FOUND',
      'message', 'Team not found.'
    );
  END IF;

  -- Verify caller is Captain or Admin
  IF v_team.captain_id <> v_user_id AND NOT public.is_admin() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'FORBIDDEN',
      'message', 'Only the team captain or an administrator can update squad profile.'
    );
  END IF;

  -- Validate team name
  v_clean_name := TRIM(COALESCE(p_name, ''));
  IF LENGTH(v_clean_name) < 3 OR LENGTH(v_clean_name) > 30 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_TEAM_NAME',
      'message', 'Team name must be between 3 and 30 characters.'
    );
  END IF;

  -- Check case-insensitive uniqueness if name changed
  IF LOWER(v_clean_name) <> LOWER(v_team.name) THEN
    IF EXISTS (
      SELECT 1 FROM public.teams
      WHERE LOWER(TRIM(name)) = LOWER(v_clean_name) AND id <> p_team_id
    ) THEN
      RETURN jsonb_build_object(
        'success', false,
        'error_code', 'TEAM_NAME_TAKEN',
        'message', 'A team with this name already exists.'
      );
    END IF;
  END IF;

  -- Sanitize tag
  IF p_tag IS NOT NULL AND TRIM(p_tag) <> '' THEN
    v_clean_tag := UPPER(TRIM(p_tag));
    IF NOT (v_clean_tag ~ '^[A-Z0-9]{2,5}$') THEN
      RETURN jsonb_build_object(
        'success', false,
        'error_code', 'INVALID_TEAM_TAG',
        'message', 'Team tag must be 2 to 5 uppercase alphanumeric characters.'
      );
    END IF;
  ELSE
    v_clean_tag := NULL;
  END IF;

  -- Sanitize description
  IF p_description IS NOT NULL AND TRIM(p_description) <> '' THEN
    v_clean_desc := TRIM(p_description);
    IF LENGTH(v_clean_desc) > 250 THEN
      RETURN jsonb_build_object(
        'success', false,
        'error_code', 'INVALID_DESCRIPTION',
        'message', 'Team description cannot exceed 250 characters.'
      );
    END IF;
  ELSE
    v_clean_desc := NULL;
  END IF;

  -- Update team record (security fields: status, captain_id, max_members remain untouched)
  UPDATE public.teams
  SET
    name = v_clean_name,
    tag = v_clean_tag,
    description = v_clean_desc,
    is_recruiting = COALESCE(p_is_recruiting, TRUE),
    logo_url = COALESCE(p_logo_url, logo_url),
    updated_at = NOW()
  WHERE id = p_team_id;

  SELECT * INTO v_team FROM public.teams WHERE id = p_team_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Squad profile successfully updated.',
    'team', row_to_json(v_team)
  );
END;
$$;


-- ----------------------------------------------------------------------------
-- 7. SERVER-AUTHORITATIVE RPC #3: invite_team_member
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.invite_team_member(
  p_team_id UUID,
  p_invitee_identifier TEXT,
  p_role TEXT DEFAULT 'Member'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_team RECORD;
  v_invitee RECORD;
  v_invitee_game_uid TEXT;
  v_member_count INT;
  v_clean_role TEXT;
  v_clean_identifier TEXT;
  v_invitation_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'UNAUTHENTICATED',
      'message', 'Authentication required.'
    );
  END IF;

  -- Validate role
  v_clean_role := COALESCE(p_role, 'Member');
  IF v_clean_role NOT IN ('Member', 'Substitute') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_ROLE',
      'message', 'Role must be either Member or Substitute.'
    );
  END IF;

  -- Lock team row FOR UPDATE
  SELECT * INTO v_team FROM public.teams WHERE id = p_team_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'TEAM_NOT_FOUND',
      'message', 'Team not found.'
    );
  END IF;

  -- Authorization check
  IF v_team.captain_id <> v_user_id AND NOT public.is_admin() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'FORBIDDEN',
      'message', 'Only the squad captain or an administrator can send invitations.'
    );
  END IF;

  -- Check team status
  IF v_team.status = 'Suspended' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'TEAM_SUSPENDED',
      'message', 'Suspended squads cannot invite new members.'
    );
  END IF;

  -- Check current team capacity
  SELECT COUNT(*) INTO v_member_count
  FROM public.team_members
  WHERE team_id = p_team_id AND status = 'Active';

  IF v_member_count >= COALESCE(v_team.max_members, 6) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'TEAM_CAPACITY_FULL',
      'message', 'This squad has reached its maximum roster capacity (6 players).'
    );
  END IF;

  -- Resolve invitee by Free Fire UID, username, or email
  v_clean_identifier := TRIM(COALESCE(p_invitee_identifier, ''));
  IF v_clean_identifier = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_IDENTIFIER',
      'message', 'Please specify a player UID, username, or email.'
    );
  END IF;

  -- Search profiles table first
  SELECT * INTO v_invitee
  FROM public.profiles
  WHERE
    game_uid = v_clean_identifier
    OR LOWER(username) = LOWER(v_clean_identifier)
    OR LOWER(email) = LOWER(v_clean_identifier)
  LIMIT 1;

  -- Fallback to auth.users if not found in profiles
  IF v_invitee IS NULL THEN
    SELECT u.id, u.email, COALESCE(p.username, split_part(u.email, '@', 1)) as username, p.game_uid
    INTO v_invitee
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.id = u.id
    WHERE LOWER(u.email) = LOWER(v_clean_identifier)
    LIMIT 1;
  END IF;

  IF v_invitee IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVITEE_NOT_FOUND',
      'message', 'Player with the specified UID, username, or email could not be found.'
    );
  END IF;

  -- Prevent self-invitation
  IF v_invitee.id = v_user_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'SELF_INVITATION_PROHIBITED',
      'message', 'You cannot invite yourself to your own squad.'
    );
  END IF;

  -- Check if invitee is already an active member of ANY team
  IF EXISTS (
    SELECT 1 FROM public.team_members
    WHERE user_id = v_invitee.id AND status = 'Active'
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVITEE_ALREADY_IN_TEAM',
      'message', 'This player is already an active member of a squad.'
    );
  END IF;

  -- Check for existing Pending invitation for this (team_id, invitee_id)
  IF EXISTS (
    SELECT 1 FROM public.team_invitations
    WHERE team_id = p_team_id AND invitee_id = v_invitee.id AND status = 'Pending' AND expires_at > NOW()
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'DUPLICATE_PENDING_INVITATION',
      'message', 'A pending invitation has already been dispatched to this player.'
    );
  END IF;

  -- Expire any stale pending invitation
  UPDATE public.team_invitations
  SET status = 'Expired', responded_at = NOW()
  WHERE team_id = p_team_id AND invitee_id = v_invitee.id AND status = 'Pending' AND expires_at <= NOW();

  -- Insert new invitation
  INSERT INTO public.team_invitations (
    team_id,
    inviter_id,
    invitee_id,
    role,
    status,
    created_at,
    expires_at
  ) VALUES (
    p_team_id,
    v_user_id,
    v_invitee.id,
    v_clean_role,
    'Pending',
    NOW(),
    NOW() + INTERVAL '7 days'
  ) RETURNING id INTO v_invitation_id;

  -- Dispatch N1 Realtime Notification to invitee atomically
  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    type,
    link,
    is_read,
    created_at
  ) VALUES (
    v_invitee.id,
    'Squad Invitation',
    'Captain ' || v_team.captain_name || ' invited you to join squad "' || v_team.name || '".',
    'info',
    '/profile/team',
    FALSE,
    NOW()
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Invitation sent successfully.',
    'invitation_id', v_invitation_id,
    'invitee_name', v_invitee.username
  );
END;
$$;


-- ----------------------------------------------------------------------------
-- 8. SERVER-AUTHORITATIVE RPC #4: respond_team_invitation
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.respond_team_invitation(
  p_invitation_id UUID,
  p_action TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_action TEXT;
  v_invite RECORD;
  v_team RECORD;
  v_member_count INT;
  v_player_name TEXT;
  v_game_uid TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'UNAUTHENTICATED',
      'message', 'Authentication required.'
    );
  END IF;

  v_action := UPPER(TRIM(COALESCE(p_action, '')));
  IF v_action NOT IN ('ACCEPT', 'REJECT') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_ACTION',
      'message', 'Action must be ACCEPT or REJECT.'
    );
  END IF;

  -- Lock invitation row FOR UPDATE
  SELECT * INTO v_invite
  FROM public.team_invitations
  WHERE id = p_invitation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVITATION_NOT_FOUND',
      'message', 'Invitation record not found.'
    );
  END IF;

  -- Authorization check: Caller must be the invitee or admin
  IF v_invite.invitee_id <> v_user_id AND NOT public.is_admin() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'FORBIDDEN',
      'message', 'You can only respond to invitations sent directly to you.'
    );
  END IF;

  -- Verify status is strictly Pending
  IF v_invite.status <> 'Pending' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVITATION_NOT_PENDING',
      'message', 'This invitation is no longer pending (current status: ' || v_invite.status || ').'
    );
  END IF;

  -- Check if expired
  IF v_invite.expires_at <= NOW() THEN
    UPDATE public.team_invitations
    SET status = 'Expired', responded_at = NOW()
    WHERE id = p_invitation_id;

    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVITATION_EXPIRED',
      'message', 'This invitation has expired.'
    );
  END IF;

  -- Fetch team record for notifications & capacity
  SELECT * INTO v_team FROM public.teams WHERE id = v_invite.team_id;

  -- Resolve player name
  SELECT username, game_uid INTO v_player_name, v_game_uid FROM public.profiles WHERE id = v_user_id;
  IF v_player_name IS NULL OR TRIM(v_player_name) = '' THEN
    v_player_name := 'Player';
  END IF;

  -- Case A: REJECT
  IF v_action = 'REJECT' THEN
    UPDATE public.team_invitations
    SET status = 'Rejected', responded_at = NOW()
    WHERE id = p_invitation_id;

    -- Dispatch notification to captain
    IF v_team.captain_id IS NOT NULL THEN
      INSERT INTO public.notifications (
        user_id, title, message, type, link, is_read, created_at
      ) VALUES (
        v_team.captain_id,
        'Invitation Declined',
        v_player_name || ' declined your invitation to join "' || v_team.name || '".',
        'warning',
        '/profile/team',
        FALSE,
        NOW()
      );
    END IF;

    RETURN jsonb_build_object(
      'success', true,
      'action', 'REJECTED',
      'message', 'Invitation declined.'
    );
  END IF;

  -- Case B: ACCEPT
  -- Lock team row FOR UPDATE to serialize roster capacity check
  SELECT * INTO v_team FROM public.teams WHERE id = v_invite.team_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'TEAM_NOT_FOUND',
      'message', 'Target team no longer exists.'
    );
  END IF;

  IF v_team.status = 'Suspended' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'TEAM_SUSPENDED',
      'message', 'This squad is currently suspended and cannot accept new members.'
    );
  END IF;

  -- Capacity Check
  SELECT COUNT(*) INTO v_member_count
  FROM public.team_members
  WHERE team_id = v_invite.team_id AND status = 'Active';

  IF v_member_count >= COALESCE(v_team.max_members, 6) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'TEAM_CAPACITY_FULL',
      'message', 'This squad has reached its maximum roster capacity (6 players).'
    );
  END IF;

  -- Check if player is already in an active team
  IF EXISTS (
    SELECT 1 FROM public.team_members
    WHERE user_id = v_user_id AND status = 'Active'
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'ALREADY_IN_TEAM',
      'message', 'You are already an active member of another squad. Please leave that squad before accepting.'
    );
  END IF;

  -- Verify player has a valid 10-digit Game UID
  IF v_game_uid IS NULL OR NOT (v_game_uid ~ '^[0-9]{10}$') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_GAME_UID',
      'message', 'A valid 10-digit Free Fire MAX Character UID linked to your profile is required to join a squad.'
    );
  END IF;

  -- Insert into public.team_members
  INSERT INTO public.team_members (
    team_id,
    user_id,
    player_name,
    game_uid,
    role,
    status,
    joined_at
  ) VALUES (
    v_invite.team_id,
    v_user_id,
    v_player_name,
    v_game_uid,
    v_invite.role,
    'Active',
    NOW()
  );

  -- Mark invitation Accepted
  UPDATE public.team_invitations
  SET status = 'Accepted', responded_at = NOW()
  WHERE id = p_invitation_id;

  -- Atomically cancel any other pending invitations for this user
  UPDATE public.team_invitations
  SET status = 'Cancelled', responded_at = NOW()
  WHERE invitee_id = v_user_id AND id <> p_invitation_id AND status = 'Pending';

  -- Dispatch notification to captain
  IF v_team.captain_id IS NOT NULL THEN
    INSERT INTO public.notifications (
      user_id, title, message, type, link, is_read, created_at
    ) VALUES (
      v_team.captain_id,
      'Invitation Accepted',
      v_player_name || ' accepted your invitation and joined "' || v_team.name || '".',
      'success',
      '/profile/team',
      FALSE,
      NOW()
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'action', 'ACCEPTED',
    'message', 'You have successfully joined "' || v_team.name || '".'
  );
END;
$$;


-- ----------------------------------------------------------------------------
-- 9. SERVER-AUTHORITATIVE RPC #5: cancel_team_invitation
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cancel_team_invitation(
  p_invitation_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_invite RECORD;
  v_team RECORD;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'UNAUTHENTICATED',
      'message', 'Authentication required.'
    );
  END IF;

  SELECT * INTO v_invite
  FROM public.team_invitations
  WHERE id = p_invitation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVITATION_NOT_FOUND',
      'message', 'Invitation not found.'
    );
  END IF;

  SELECT * INTO v_team FROM public.teams WHERE id = v_invite.team_id;

  -- Only Captain, Inviter, or Admin can cancel
  IF v_user_id <> v_team.captain_id AND v_user_id <> v_invite.inviter_id AND NOT public.is_admin() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'FORBIDDEN',
      'message', 'Only the squad captain or an administrator can cancel invitations.'
    );
  END IF;

  IF v_invite.status <> 'Pending' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVITATION_NOT_PENDING',
      'message', 'Only pending invitations can be cancelled.'
    );
  END IF;

  UPDATE public.team_invitations
  SET status = 'Cancelled', responded_at = NOW()
  WHERE id = p_invitation_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Invitation has been cancelled.'
  );
END;
$$;


-- ----------------------------------------------------------------------------
-- 10. SERVER-AUTHORITATIVE RPC #6: remove_team_member
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.remove_team_member(
  p_team_id UUID,
  p_target_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_team RECORD;
  v_target RECORD;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'UNAUTHENTICATED',
      'message', 'Authentication required.'
    );
  END IF;

  -- Lock team row FOR UPDATE
  SELECT * INTO v_team FROM public.teams WHERE id = p_team_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'TEAM_NOT_FOUND',
      'message', 'Team not found.'
    );
  END IF;

  -- Authorization check: Captain or Admin
  IF v_team.captain_id <> v_user_id AND NOT public.is_admin() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'FORBIDDEN',
      'message', 'Only the squad captain or an administrator can remove members.'
    );
  END IF;

  -- Prevent captain from removing themselves
  IF p_target_user_id = v_team.captain_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'CANNOT_REMOVE_CAPTAIN',
      'message', 'The team captain cannot be removed. Transfer ownership or disband the team instead.'
    );
  END IF;

  -- Lock and verify target member row
  SELECT * INTO v_target
  FROM public.team_members
  WHERE team_id = p_team_id AND user_id = p_target_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'MEMBER_NOT_FOUND',
      'message', 'Specified player is not a member of this squad.'
    );
  END IF;

  -- Delete member row
  DELETE FROM public.team_members WHERE id = v_target.id;

  -- Dispatch notification to removed player
  INSERT INTO public.notifications (
    user_id, title, message, type, link, is_read, created_at
  ) VALUES (
    p_target_user_id,
    'Squad Roster Update',
    'You have been removed from squad "' || v_team.name || '".',
    'warning',
    '/profile/team',
    FALSE,
    NOW()
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Player has been removed from the squad.'
  );
END;
$$;


-- ----------------------------------------------------------------------------
-- 11. SERVER-AUTHORITATIVE RPC #7: leave_player_team
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.leave_player_team(
  p_team_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_team RECORD;
  v_member RECORD;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'UNAUTHENTICATED',
      'message', 'Authentication required.'
    );
  END IF;

  -- Lock team row FOR UPDATE
  SELECT * INTO v_team FROM public.teams WHERE id = p_team_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'TEAM_NOT_FOUND',
      'message', 'Team not found.'
    );
  END IF;

  -- Prevent captain from leaving without transfer
  IF v_team.captain_id = v_user_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'CAPTAIN_CANNOT_LEAVE',
      'message', 'The team captain cannot leave the squad. Please transfer captaincy to another member first.'
    );
  END IF;

  -- Lock and verify caller's membership
  SELECT * INTO v_member
  FROM public.team_members
  WHERE team_id = p_team_id AND user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'NOT_A_MEMBER',
      'message', 'You are not a member of this squad.'
    );
  END IF;

  -- Delete caller's membership
  DELETE FROM public.team_members WHERE id = v_member.id;

  -- Notify captain
  IF v_team.captain_id IS NOT NULL THEN
    INSERT INTO public.notifications (
      user_id, title, message, type, link, is_read, created_at
    ) VALUES (
      v_team.captain_id,
      'Member Left Squad',
      v_member.player_name || ' has left squad "' || v_team.name || '".',
      'info',
      '/profile/team',
      FALSE,
      NOW()
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'You have successfully left the squad.'
  );
END;
$$;


-- ----------------------------------------------------------------------------
-- 12. SERVER-AUTHORITATIVE RPC #8: transfer_team_ownership
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.transfer_team_ownership(
  p_team_id UUID,
  p_new_captain_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_team RECORD;
  v_new_captain_member RECORD;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'UNAUTHENTICATED',
      'message', 'Authentication required.'
    );
  END IF;

  -- Lock team row FOR UPDATE
  SELECT * INTO v_team FROM public.teams WHERE id = p_team_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'TEAM_NOT_FOUND',
      'message', 'Team not found.'
    );
  END IF;

  -- Authorization check: Current Captain or Admin
  IF v_team.captain_id <> v_user_id AND NOT public.is_admin() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'FORBIDDEN',
      'message', 'Only the current team captain or an administrator can transfer squad captaincy.'
    );
  END IF;

  IF p_new_captain_user_id = v_team.captain_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'ALREADY_CAPTAIN',
      'message', 'The specified player is already the squad captain.'
    );
  END IF;

  -- Verify target player is an active member of this squad
  SELECT * INTO v_new_captain_member
  FROM public.team_members
  WHERE team_id = p_team_id AND user_id = p_new_captain_user_id AND status = 'Active'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'TARGET_NOT_ACTIVE_MEMBER',
      'message', 'New captain must be an active member of this squad.'
    );
  END IF;

  -- Demote old captain to Member
  UPDATE public.team_members
  SET role = 'Member'
  WHERE team_id = p_team_id AND user_id = v_team.captain_id;

  -- Promote new captain in team_members
  UPDATE public.team_members
  SET role = 'Captain'
  WHERE id = v_new_captain_member.id;

  -- Update teams record
  UPDATE public.teams
  SET
    captain_id = p_new_captain_user_id,
    captain_name = v_new_captain_member.player_name,
    updated_at = NOW()
  WHERE id = p_team_id;

  -- Dispatch notification to new captain
  INSERT INTO public.notifications (
    user_id, title, message, type, link, is_read, created_at
  ) VALUES (
    p_new_captain_user_id,
    'Captaincy Assigned',
    'You have been promoted to Captain of squad "' || v_team.name || '".',
    'success',
    '/profile/team',
    FALSE,
    NOW()
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Squad captaincy has been successfully transferred to ' || v_new_captain_member.player_name || '.'
  );
END;
$$;


-- ----------------------------------------------------------------------------
-- 13. SERVER-AUTHORITATIVE RPC #9: set_team_member_role
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_team_member_role(
  p_team_id UUID,
  p_target_user_id UUID,
  p_new_role TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_team RECORD;
  v_member RECORD;
  v_clean_role TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'UNAUTHENTICATED',
      'message', 'Authentication required.'
    );
  END IF;

  v_clean_role := COALESCE(p_new_role, '');
  IF v_clean_role NOT IN ('Member', 'Substitute') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_ROLE',
      'message', 'Role must be either Member or Substitute.'
    );
  END IF;

  SELECT * INTO v_team FROM public.teams WHERE id = p_team_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'TEAM_NOT_FOUND',
      'message', 'Team not found.'
    );
  END IF;

  -- Authorization check: Captain or Admin
  IF v_team.captain_id <> v_user_id AND NOT public.is_admin() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'FORBIDDEN',
      'message', 'Only the squad captain or an administrator can modify member roles.'
    );
  END IF;

  -- Cannot change captain's role through this RPC
  IF p_target_user_id = v_team.captain_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'CANNOT_CHANGE_CAPTAIN_ROLE',
      'message', 'Captain role cannot be changed directly. Use transfer ownership instead.'
    );
  END IF;

  SELECT * INTO v_member
  FROM public.team_members
  WHERE team_id = p_team_id AND user_id = p_target_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'MEMBER_NOT_FOUND',
      'message', 'Member not found.'
    );
  END IF;

  UPDATE public.team_members
  SET role = v_clean_role
  WHERE id = v_member.id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Member role updated to ' || v_clean_role || '.'
  );
END;
$$;


-- ----------------------------------------------------------------------------
-- 14. SERVER-AUTHORITATIVE RPC #10: get_my_team_portal_data
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_team_portal_data()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_membership RECORD;
  v_team RECORD;
  v_members JSONB := '[]'::JSONB;
  v_outgoing_invites JSONB := '[]'::JSONB;
  v_incoming_invites JSONB := '[]'::JSONB;
  v_is_captain BOOLEAN := FALSE;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'UNAUTHENTICATED',
      'message', 'Authentication required.'
    );
  END IF;

  -- 1. Fetch user's incoming pending invitations (always available whether in team or not)
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', ti.id,
      'team_id', ti.team_id,
      'team_name', t.name,
      'team_tag', t.tag,
      'team_logo_url', t.logo_url,
      'inviter_name', t.captain_name,
      'role', ti.role,
      'created_at', ti.created_at,
      'expires_at', ti.expires_at
    ) ORDER BY ti.created_at DESC
  ), '[]'::jsonb) INTO v_incoming_invites
  FROM public.team_invitations ti
  JOIN public.teams t ON t.id = ti.team_id
  WHERE ti.invitee_id = v_user_id AND ti.status = 'Pending' AND ti.expires_at > NOW();

  -- 2. Check if user belongs to an active team
  SELECT * INTO v_membership
  FROM public.team_members
  WHERE user_id = v_user_id AND status = 'Active'
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', true,
      'has_team', false,
      'team', null,
      'members', '[]'::jsonb,
      'outgoing_invitations', '[]'::jsonb,
      'incoming_invitations', v_incoming_invites,
      'is_captain', false
    );
  END IF;

  -- 3. Load active team record
  SELECT * INTO v_team FROM public.teams WHERE id = v_membership.team_id;
  v_is_captain := (v_team.captain_id = v_user_id);

  -- 4. Load all active squad members
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', tm.id,
      'user_id', tm.user_id,
      'player_name', tm.player_name,
      'game_uid', tm.game_uid,
      'role', tm.role,
      'status', tm.status,
      'joined_at', tm.joined_at,
      'avatar_url', p.avatar_url
    ) ORDER BY
      CASE WHEN tm.role = 'Captain' THEN 1 WHEN tm.role = 'Member' THEN 2 ELSE 3 END,
      tm.joined_at ASC
  ), '[]'::jsonb) INTO v_members
  FROM public.team_members tm
  LEFT JOIN public.profiles p ON p.id = tm.user_id
  WHERE tm.team_id = v_membership.team_id AND tm.status = 'Active';

  -- 5. If captain, load outgoing pending invitations
  IF v_is_captain OR public.is_admin() THEN
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', ti.id,
        'invitee_id', ti.invitee_id,
        'invitee_name', COALESCE(p.username, split_part(u.email, '@', 1)),
        'invitee_uid', COALESCE(p.game_uid, 'N/A'),
        'role', ti.role,
        'created_at', ti.created_at,
        'expires_at', ti.expires_at
      ) ORDER BY ti.created_at DESC
    ), '[]'::jsonb) INTO v_outgoing_invites
    FROM public.team_invitations ti
    LEFT JOIN auth.users u ON u.id = ti.invitee_id
    LEFT JOIN public.profiles p ON p.id = ti.invitee_id
    WHERE ti.team_id = v_membership.team_id AND ti.status = 'Pending' AND ti.expires_at > NOW();
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'has_team', true,
    'team', row_to_json(v_team),
    'members', v_members,
    'outgoing_invitations', v_outgoing_invites,
    'incoming_invitations', v_incoming_invites,
    'is_captain', v_is_captain
  );
END;
$$;


-- ----------------------------------------------------------------------------
-- 15. EXECUTION GRANTS & PRIVILEGES
-- ----------------------------------------------------------------------------

-- Revoke execute from PUBLIC and anon on all 10 RPCs
REVOKE EXECUTE ON FUNCTION public.create_player_team FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.update_player_team FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.invite_team_member FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.respond_team_invitation FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.cancel_team_invitation FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.remove_team_member FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.leave_player_team FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.transfer_team_ownership FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.set_team_member_role FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_my_team_portal_data FROM PUBLIC, anon;

-- Grant execute strictly to authenticated and service_role
GRANT EXECUTE ON FUNCTION public.create_player_team TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_player_team TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.invite_team_member TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.respond_team_invitation TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cancel_team_invitation TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.remove_team_member TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.leave_player_team TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.transfer_team_ownership TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_team_member_role TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_my_team_portal_data TO authenticated, service_role;

COMMIT;
