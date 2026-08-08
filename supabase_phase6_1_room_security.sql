-- ============================================================================
-- MJ ESPORTS — Phase 6.1: Production Room Credential Security Migration
-- Target Engine: Supabase PostgreSQL
-- Description: 1. Creates public.get_tournament_room_credentials SECURITY DEFINER function.
--              2. Enforces authentication, admin override, registration check,
--                 and room_status = 'Published' verification.
--              3. Restricts direct column access on public.tournaments.room_id
--                 and public.tournaments.room_password from public SELECT queries.
-- ============================================================================

-- 1. Create SECURITY DEFINER function to retrieve room credentials securely
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
  -- 1. Obtain session user ID
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'UNAUTHENTICATED',
      'message', 'Authentication is required to view room credentials.'
    );
  END IF;

  -- 2. Fetch target tournament room fields
  SELECT id, room_id, room_password, room_status, room_last_updated, room_published_by, teams_list
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

  -- 3. Check admin role
  v_is_admin := public.is_admin();

  -- If Admin, allow retrieval at any stage (Draft, Published, Hidden, etc.)
  IF v_is_admin THEN
    RETURN jsonb_build_object(
      'success', true,
      'room_id', COALESCE(v_tourn.room_id, ''),
      'room_password', COALESCE(v_tourn.room_password, ''),
      'room_status', COALESCE(v_tourn.room_status, 'Draft'),
      'room_last_updated', v_tourn.room_last_updated,
      'room_published_by', v_tourn.room_published_by
    );
  END IF;

  -- 4. For normal participants: Must be Published
  IF COALESCE(v_tourn.room_status, 'Draft') != 'Published' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'ROOM_NOT_PUBLISHED',
      'message', 'Custom room credentials have not been published yet.'
    );
  END IF;

  -- 5. Verify participant registration for p_tournament_id using strictly auth.uid() against public.tournament_registrations
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

  -- 6. Authorized participant + Published -> Return credentials
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

-- Grant execute permissions to authenticated and service_role
REVOKE EXECUTE ON FUNCTION public.get_tournament_room_credentials FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_tournament_room_credentials TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_tournament_room_credentials TO service_role;

-- 2. Restrict column-level SELECT on sensitive room credential columns for normal queries
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
  teams_list,
  room_status,
  room_last_updated,
  room_published_by,
  winner_team,
  winner_captain,
  created_at,
  updated_at,
  mode,
  map,
  registration_start,
  registration_end,
  match_date,
  match_time,
  banner_image,
  team_size
) ON public.tournaments TO anon, authenticated;

GRANT SELECT ON public.tournaments TO service_role;

-- 3. Grant INSERT, UPDATE, DELETE privileges on public.tournaments to authenticated role
-- Row modifications remain strictly enforced by RLS policies ("Admins insert tournaments", "Admins update tournaments", "Admins delete tournaments")
GRANT INSERT, UPDATE, DELETE ON public.tournaments TO authenticated;
GRANT ALL ON public.tournaments TO service_role;
