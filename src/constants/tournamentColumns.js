/**
 * Canonical column sets for Supabase tournament queries.
 * Enforces strict security by omitting sensitive room credentials (room_id, room_password)
 * from all public SELECT queries.
 */

// Lightweight summary columns for tournament listings and cards (omits heavy description, rules, and teams_list)
export const TOURNAMENT_SUMMARY_COLUMNS =
  'id, title, game, format, prize_pool, entry_fee, max_teams, registered_teams, start_date, start_time, status, organizer, room_status, room_last_updated, room_published_by, winner_team, winner_captain, created_at, updated_at'

// Comprehensive detail columns for tournament detail views (includes description, rules, and teams_list; strictly excludes sensitive room_id and room_password)
export const TOURNAMENT_DETAIL_COLUMNS =
  'id, title, game, format, prize_pool, entry_fee, max_teams, registered_teams, start_date, start_time, status, organizer, description, rules, teams_list, room_status, room_last_updated, room_published_by, winner_team, winner_captain, created_at, updated_at'

