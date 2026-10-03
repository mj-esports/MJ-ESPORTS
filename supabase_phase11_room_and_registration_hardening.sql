
-- ============================================================================
-- MJ ESPORTS — Phase 11: Room Credentials & 10-Digit Player Registration Hardening
-- Target Engine: Supabase PostgreSQL
-- Description:
--   1. Enforces strict numeric constraints on Room ID (numbers only) & Room Password (numbers only).
--   2. Enforces strict 10-digit numeric constraints on Player Game UIDs & WhatsApp Numbers.
--   3. Note: register_tournament_team RPC is authoritatively maintained with 19 parameters
--      and payment verification in supabase_phase8_1_tournament_payments_and_registration_guard.sql.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ADD CHECK CONSTRAINTS TO TOURNAMENTS TABLE (NUMERIC ROOM CREDENTIALS)
-- ----------------------------------------------------------------------------

DO $$
BEGIN
  -- Validate room_id contains only numeric digits 0-9 (when set)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_tournaments_room_id_numeric'
  ) THEN
    ALTER TABLE public.tournaments
      ADD CONSTRAINT chk_tournaments_room_id_numeric
      CHECK (room_id IS NULL OR room_id = '' OR room_id ~ '^[0-9]+$');
  END IF;

  -- Validate room_password contains only numeric digits 0-9 (when set)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_tournaments_room_password_numeric'
  ) THEN
    ALTER TABLE public.tournaments
      ADD CONSTRAINT chk_tournaments_room_password_numeric
      CHECK (room_password IS NULL OR room_password = '' OR room_password ~ '^[0-9]+$');
  END IF;
END $$;


-- ----------------------------------------------------------------------------
-- 2. ADD CHECK CONSTRAINTS TO REGISTRATIONS & PLAYERS TABLES (10-DIGIT UIDS & PHONE)
-- ----------------------------------------------------------------------------

DO $$
BEGIN
  -- Validate tournament_players game_uid is exactly 10 digits
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_tournament_players_game_uid_10_digits'
  ) THEN
    ALTER TABLE public.tournament_players
      ADD CONSTRAINT chk_tournament_players_game_uid_10_digits
      CHECK (game_uid IS NULL OR game_uid ~ '^[0-9]{10}$');
  END IF;

  -- Validate tournament_registrations captain_uid is exactly 10 digits
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_tournament_registrations_captain_uid_10_digits'
  ) THEN
    ALTER TABLE public.tournament_registrations
      ADD CONSTRAINT chk_tournament_registrations_captain_uid_10_digits
      CHECK (captain_uid IS NULL OR captain_uid ~ '^[0-9]{10}$');
  END IF;

  -- Validate tournament_registrations whatsapp_number is exactly 10 digits
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_tournament_registrations_phone_10_digits'
  ) THEN
    ALTER TABLE public.tournament_registrations
      ADD CONSTRAINT chk_tournament_registrations_phone_10_digits
      CHECK (whatsapp_number IS NULL OR whatsapp_number ~ '^[0-9]{10}$');
  END IF;
END $$;
