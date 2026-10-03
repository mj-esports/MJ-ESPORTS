-- ============================================================================
-- MJ ESPORTS — Phase N1: Player Notification Hub Security & Realtime Migration
-- Target Engine: Supabase PostgreSQL
-- Description:
--   1. Ensures public.notifications is published to supabase_realtime.
--   2. Introduces authoritative SECURITY DEFINER RPCs for mark-read operations:
--      - mark_notification_as_read(p_notification_id UUID)
--      - mark_notifications_read(p_user_id UUID)
--   3. Hardens UPDATE RLS policy on public.notifications with WITH CHECK.
--   4. Grants execute permissions strictly to authenticated and service_role.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. REALTIME PUBLICATION REGISTRATION (IDEMPOTENT)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 2. HARDEN RLS UPDATE POLICY WITH STRICT USER OWNERSHIP WITH CHECK
-- ----------------------------------------------------------------------------
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;

CREATE POLICY "Users update own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id OR public.is_admin()
  )
  WITH CHECK (
    auth.uid() = user_id OR public.is_admin()
  );

-- ----------------------------------------------------------------------------
-- 3. SECURITY DEFINER RPC: MARK SINGLE NOTIFICATION AS READ
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mark_notification_as_read(p_notification_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_updated INT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Authentication required to mark notification read.';
  END IF;

  UPDATE public.notifications
  SET is_read = true
  WHERE id = p_notification_id
    AND (user_id = v_user_id OR public.is_admin());

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;

-- ----------------------------------------------------------------------------
-- 4. SECURITY DEFINER RPC: BATCH MARK ALL NOTIFICATIONS AS READ
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mark_notifications_read(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_auth_id UUID;
  v_updated INT;
BEGIN
  v_auth_id := auth.uid();
  IF v_auth_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Authentication required to mark notifications read.';
  END IF;

  -- Ensure caller can only mark their own notifications as read (unless admin)
  IF v_auth_id <> p_user_id AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'FORBIDDEN: Cannot mark notifications for another user.';
  END IF;

  UPDATE public.notifications
  SET is_read = true
  WHERE user_id = p_user_id
    AND is_read = false;

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'count', v_updated
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- 5. REVOKE PUBLIC EXECUTION AND GRANT TO AUTHENTICATED ROLES
-- ----------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.mark_notification_as_read(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_notification_as_read(UUID) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.mark_notifications_read(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_notifications_read(UUID) TO authenticated, service_role;

COMMIT;
