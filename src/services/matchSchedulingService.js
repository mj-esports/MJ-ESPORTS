// src/services/matchSchedulingService.js
// Production Multi-Round Match Creation & Scheduling Service for MJ ESPORTS
// Clean frontend abstraction over authoritative N2.2 PostgreSQL SECURITY DEFINER RPCs

import { supabase, isSupabaseConfigured } from '../lib/supabase.js'

/**
 * Fetches all scheduled matches for a tournament, ordered by match_number ASC.
 * Excludes room_password from normal match query for credential security.
 *
 * @param {string} tournamentId - Target tournament ID
 * @returns {Promise<Array>} List of match records
 */
export async function fetchTournamentMatches(tournamentId) {
  if (!isSupabaseConfigured || !tournamentId) return []

  try {
    const { data, error } = await supabase
      .from('matches')
      .select('id, tournament_id, match_number, round_number, round_name, match_type, map_name, scheduled_time, room_release_time, status, room_id, room_published, created_at, updated_at')
      .eq('tournament_id', String(tournamentId))
      .order('match_number', { ascending: true })

    if (error) {
      console.warn('[matchSchedulingService] fetch matches notice:', error.message)
      return []
    }

    return Array.isArray(data) ? data : []
  } catch (err) {
    console.warn('[matchSchedulingService] fetch matches exception:', err)
    return []
  }
}

/**
 * Atomically schedules multiple tournament matches via the authoritative RPC.
 * Validates payload structure while PostgreSQL remains the authoritative validator.
 *
 * @param {string} tournamentId - Target tournament ID
 * @param {Array<object>} matches - Array of match configuration objects
 * @returns {Promise<{ success: boolean, match_count?: number, message?: string, error?: string, error_code?: string }>}
 */
export async function scheduleTournamentMatches(tournamentId, matches) {
  if (!isSupabaseConfigured) {
    return {
      success: true,
      tournament_id: tournamentId,
      match_count: Array.isArray(matches) ? matches.length : 1,
      message: 'Mock schedule created successfully.',
    }
  }

  if (!tournamentId) {
    return {
      success: false,
      error: 'Target tournament ID is required.',
      error_code: 'VALIDATION_ERROR',
    }
  }

  if (!Array.isArray(matches) || matches.length === 0) {
    return {
      success: false,
      error: 'Match schedule must be a non-empty list of rounds.',
      error_code: 'EMPTY_MATCH_SCHEDULE',
    }
  }

  if (matches.length > 12) {
    return {
      success: false,
      error: 'A tournament can have at most 12 scheduled matches.',
      error_code: 'MAX_MATCH_LIMIT_EXCEEDED',
    }
  }

  try {
    const { data, error } = await supabase.rpc('schedule_tournament_matches', {
      p_tournament_id: String(tournamentId),
      p_matches: matches,
    })

    if (error) {
      console.warn('[matchSchedulingService] schedule RPC error:', error.message)
      return {
        success: false,
        error: error.message,
        error_code: error.code || 'RPC_ERROR',
      }
    }

    const payload = Array.isArray(data) ? data[0] : data
    return payload || {
      success: false,
      error: 'No response from match scheduling service.',
      error_code: 'EMPTY_RESPONSE',
    }
  } catch (err) {
    console.error('[matchSchedulingService] schedule exception:', err)
    return {
      success: false,
      error: err.message || 'Match scheduling request failed.',
      error_code: 'EXCEPTION',
    }
  }
}

/**
 * Updates the operational lifecycle state of a specific match round.
 * State machine and terminal constraints are authoritatively enforced by PostgreSQL.
 *
 * @param {string} matchId - Match UUID
 * @param {string} newStatus - Target status ('Scheduled' | 'Check-in Open' | 'Room Ready' | 'Live' | 'Completed' | 'Cancelled')
 * @returns {Promise<{ success: boolean, match_id?: string, status?: string, message?: string, error?: string, error_code?: string }>}
 */
export async function updateMatchStatus(matchId, newStatus) {
  if (!isSupabaseConfigured) {
    return {
      success: true,
      match_id: matchId,
      status: newStatus,
      message: `Mock match status updated to ${newStatus}.`,
    }
  }

  if (!matchId || !newStatus) {
    return {
      success: false,
      error: 'Match ID and new status are required.',
      error_code: 'VALIDATION_ERROR',
    }
  }

  try {
    const { data, error } = await supabase.rpc('update_match_status', {
      p_match_id: String(matchId),
      p_new_status: String(newStatus).trim(),
    })

    if (error) {
      console.warn('[matchSchedulingService] update status RPC error:', error.message)
      return {
        success: false,
        error: error.message,
        error_code: error.code || 'RPC_ERROR',
      }
    }

    const payload = Array.isArray(data) ? data[0] : data
    return payload || {
      success: false,
      error: 'No response from status update service.',
      error_code: 'EMPTY_RESPONSE',
    }
  } catch (err) {
    console.error('[matchSchedulingService] update status exception:', err)
    return {
      success: false,
      error: err.message || 'Match status update failed.',
      error_code: 'EXCEPTION',
    }
  }
}

/**
 * Sets room credentials and publication status for an individual match.
 * Enforces numeric validation, masks passwords in audit logs, and mirrors Match 1 credentials to tournament.
 *
 * @param {string} matchId - Match UUID
 * @param {object} params
 * @param {string} [params.roomId] - Room ID digits (0-9)
 * @param {string} [params.roomPassword] - Room password digits (0-9)
 * @param {string} [params.roomStatus='Published'] - 'Published' | 'Draft'
 * @param {string|null} [params.roomReleaseTime=null] - ISO timestamp for release window
 * @returns {Promise<{ success: boolean, match_id?: string, room_id?: string, room_status?: string, message?: string, error?: string, error_code?: string }>}
 */
export async function setMatchRoomDetails(matchId, params = {}) {
  if (!isSupabaseConfigured) {
    return {
      success: true,
      match_id: matchId,
      room_id: params.roomId || '123456',
      room_status: params.roomStatus || 'Published',
      message: 'Mock match room details updated.',
    }
  }

  if (!matchId) {
    return {
      success: false,
      error: 'Match ID is required.',
      error_code: 'VALIDATION_ERROR',
    }
  }

  const cleanRoomId = params.roomId !== undefined ? String(params.roomId).trim() : null
  const cleanPassword = params.roomPassword !== undefined ? String(params.roomPassword).trim() : null
  const roomStatus = params.roomStatus || 'Published'
  const releaseTime = params.roomReleaseTime || null

  try {
    const { data, error } = await supabase.rpc('set_match_room_details', {
      p_match_id: String(matchId),
      p_room_id: cleanRoomId,
      p_room_password: cleanPassword,
      p_room_status: roomStatus,
      p_room_release_time: releaseTime,
    })

    if (error) {
      console.warn('[matchSchedulingService] set room details RPC error:', error.message)
      return {
        success: false,
        error: error.message,
        error_code: error.code || 'RPC_ERROR',
      }
    }

    const payload = Array.isArray(data) ? data[0] : data
    return payload || {
      success: false,
      error: 'No response from match room service.',
      error_code: 'EMPTY_RESPONSE',
    }
  } catch (err) {
    console.error('[matchSchedulingService] set room details exception:', err)
    return {
      success: false,
      error: err.message || 'Failed to update match room credentials.',
      error_code: 'EXCEPTION',
    }
  }
}

/**
 * Deletes an unstarted match from the tournament schedule.
 * Triggers server-side reindexing of subsequent match numbers to maintain contiguous sequences.
 *
 * @param {string} matchId - Match UUID
 * @returns {Promise<{ success: boolean, deleted_match_id?: string, deleted_match_number?: number, message?: string, error?: string, error_code?: string }>}
 */
export async function deleteTournamentMatch(matchId) {
  if (!isSupabaseConfigured) {
    return {
      success: true,
      deleted_match_id: matchId,
      message: 'Mock match deleted successfully.',
    }
  }

  if (!matchId) {
    return {
      success: false,
      error: 'Match ID is required.',
      error_code: 'VALIDATION_ERROR',
    }
  }

  try {
    const { data, error } = await supabase.rpc('delete_tournament_match', {
      p_match_id: String(matchId),
    })

    if (error) {
      console.warn('[matchSchedulingService] delete match RPC error:', error.message)
      return {
        success: false,
        error: error.message,
        error_code: error.code || 'RPC_ERROR',
      }
    }

    const payload = Array.isArray(data) ? data[0] : data
    return payload || {
      success: false,
      error: 'No response from match deletion service.',
      error_code: 'EMPTY_RESPONSE',
    }
  } catch (err) {
    console.error('[matchSchedulingService] delete match exception:', err)
    return {
      success: false,
      error: err.message || 'Match deletion request failed.',
      error_code: 'EXCEPTION',
    }
  }
}
