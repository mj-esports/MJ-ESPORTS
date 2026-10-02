// src/services/matchCheckinService.js
// Production Match Check-In, Slot Assignment & Incident Service for MJ ESPORTS

import { supabase, isSupabaseConfigured } from '../lib/supabase.js'

/**
 * Checks in a registered player or squad captain for a tournament match.
 * Authoritatively validates check-in window and Free Fire UID consistency.
 *
 * @param {Object} params
 * @param {string} params.tournamentId Target tournament ID
 * @param {string} params.checkinUid In-game Free Fire UID submitted at check-in
 * @returns {Promise<Object>} Check-in result payload
 */
export async function checkInParticipant({ tournamentId, checkinUid }) {
  if (!isSupabaseConfigured) {
    return {
      success: true,
      checkin_id: 'mock-chk-1',
      status: 'CHECKED_IN',
      uid_match_status: 'UID_MATCH',
      lobby_slot: 1,
      message: 'Mock check-in successful. Assigned to Slot 1.',
    }
  }

  try {
    const { data, error } = await supabase.rpc('check_in_tournament_participant', {
      p_tournament_id: String(tournamentId),
      p_checkin_uid: String(checkinUid).trim(),
    })

    if (error) {
      console.warn('[checkInParticipant RPC error]:', error.message)
      return { success: false, error_code: error.code || 'RPC_ERROR', message: error.message }
    }

    const payload = Array.isArray(data) ? data[0] : data
    return payload || { success: false, error_code: 'EMPTY_RESPONSE', message: 'No response from check-in service.' }
  } catch (err) {
    console.error('[checkInParticipant exception]:', err)
    return { success: false, error_code: 'EXCEPTION', message: err.message || 'Check-in request failed.' }
  }
}

/**
 * Fetches the caller's active check-in record for a given tournament.
 *
 * @param {string} tournamentId
 * @param {string} [userIdOverride]
 * @returns {Promise<Object|null>} Check-in row or null
 */
export async function getParticipantCheckin(tournamentId, userIdOverride = null) {
  if (!isSupabaseConfigured || !tournamentId) return null

  try {
    let targetUserId = userIdOverride
    if (!targetUserId) {
      const { data: sessionData } = await supabase.auth.getSession()
      targetUserId = sessionData?.session?.user?.id
    }
    if (!targetUserId) return null

    const { data, error } = await supabase
      .from('match_checkins')
      .select('id, tournament_id, registration_id, user_id, team_name, captain_name, checkin_uid, registered_uid, status, uid_match_status, lobby_slot, checked_in_at, verified_at, admin_notes')
      .eq('tournament_id', String(tournamentId))
      .eq('user_id', targetUserId)
      .maybeSingle()

    if (error) {
      console.warn('[getParticipantCheckin notice]:', error.message)
      return null
    }

    return data
  } catch (err) {
    console.warn('[getParticipantCheckin exception]:', err)
    return null
  }
}

/**
 * Fetches all active check-ins and lobby slot assignments for a tournament.
 *
 * @param {string} tournamentId
 * @returns {Promise<Array>} Array of check-in records sorted by lobby slot
 */
export async function getTournamentCheckins(tournamentId) {
  if (!isSupabaseConfigured || !tournamentId) return []

  try {
    const { data, error } = await supabase
      .from('match_checkins')
      .select('id, tournament_id, registration_id, team_name, captain_name, checkin_uid, registered_uid, status, uid_match_status, lobby_slot, checked_in_at, verified_at, admin_notes')
      .eq('tournament_id', String(tournamentId))
      .order('lobby_slot', { ascending: true, nullsFirst: false })

    if (error) {
      console.warn('[getTournamentCheckins notice]:', error.message)
      return []
    }

    return data || []
  } catch (err) {
    console.warn('[getTournamentCheckins exception]:', err)
    return []
  }
}

/**
 * Authoritatively calculates match readiness from the server/database.
 *
 * @param {string} tournamentId
 * @returns {Promise<Object>} Server readiness report
 */
export async function checkMatchReadiness(tournamentId) {
  if (!isSupabaseConfigured || !tournamentId) {
    return {
      success: true,
      is_ready: true,
      readiness_percentage: 100,
      total_registered: 12,
      total_checked_in: 12,
      verified_count: 12,
      mismatch_count: 0,
      assigned_slots_count: 12,
      reasons: [],
    }
  }

  try {
    const { data, error } = await supabase.rpc('check_match_readiness', {
      p_tournament_id: String(tournamentId),
    })

    if (error) {
      console.warn('[checkMatchReadiness RPC error]:', error.message)
      return { success: false, is_ready: false, message: error.message }
    }

    const payload = Array.isArray(data) ? data[0] : data
    return payload || { success: false, is_ready: false, message: 'Empty response' }
  } catch (err) {
    console.warn('[checkMatchReadiness exception]:', err)
    return { success: false, is_ready: false, message: err.message }
  }
}

/**
 * Admin action: Verifies or rejects a player's Free Fire UID discrepancy.
 *
 * @param {Object} params
 * @param {string} params.checkinId Check-in record UUID
 * @param {'APPROVE'|'REJECT'} params.action Verification decision
 * @param {string} [params.notes] Administrative rationale
 * @returns {Promise<Object>}
 */
export async function adminVerifyParticipantUid({ checkinId, action, notes = null }) {
  if (!isSupabaseConfigured) return { success: true, message: 'Mock UID verified.' }

  try {
    const { data, error } = await supabase.rpc('admin_verify_participant_uid', {
      p_checkin_id: String(checkinId),
      p_action: String(action).toUpperCase(),
      p_notes: notes ? String(notes).trim() : null,
    })

    if (error) {
      return { success: false, error_code: error.code || 'RPC_ERROR', message: error.message }
    }

    return Array.isArray(data) ? data[0] : data
  } catch (err) {
    return { success: false, error_code: 'EXCEPTION', message: err.message }
  }
}

/**
 * Admin action: Assigns or reassigns a lobby slot number (1..max_teams).
 *
 * @param {Object} params
 * @param {string} params.checkinId Check-in record UUID
 * @param {number} params.slotNumber Target lobby slot number
 * @param {string} [params.notes] Administrative rationale
 * @returns {Promise<Object>}
 */
export async function adminAssignLobbySlot({ checkinId, slotNumber, notes = null }) {
  if (!isSupabaseConfigured) return { success: true, lobby_slot: slotNumber, message: 'Mock slot assigned.' }

  try {
    const { data, error } = await supabase.rpc('admin_assign_lobby_slot', {
      p_checkin_id: String(checkinId),
      p_slot_number: parseInt(slotNumber, 10),
      p_notes: notes ? String(notes).trim() : null,
    })

    if (error) {
      return { success: false, error_code: error.code || 'RPC_ERROR', message: error.message }
    }

    return Array.isArray(data) ? data[0] : data
  } catch (err) {
    return { success: false, error_code: 'EXCEPTION', message: err.message }
  }
}

/**
 * Admin action: Locks the match roster and closes check-in window.
 *
 * @param {string} tournamentId
 * @returns {Promise<Object>}
 */
export async function adminLockMatchRoster(tournamentId) {
  if (!isSupabaseConfigured) return { success: true, message: 'Mock roster locked.' }

  try {
    const { data, error } = await supabase.rpc('admin_lock_match_roster', {
      p_tournament_id: String(tournamentId),
    })

    if (error) {
      return { success: false, error_code: error.code || 'RPC_ERROR', message: error.message }
    }

    return Array.isArray(data) ? data[0] : data
  } catch (err) {
    return { success: false, error_code: 'EXCEPTION', message: err.message }
  }
}

/**
 * Reports a live match operational incident (disconnect, room issue, remake request).
 *
 * @param {Object} params
 * @param {string} params.tournamentId Target tournament ID
 * @param {string} params.incidentType Incident category
 * @param {string} params.description Detailed explanation
 * @param {string} [params.matchId] Optional match UUID
 * @returns {Promise<Object>}
 */
export async function reportMatchIncident({ tournamentId, incidentType, description, matchId = null }) {
  if (!isSupabaseConfigured) {
    return { success: true, incident_id: 'mock-inc-1', status: 'REPORTED', message: 'Mock incident reported.' }
  }

  try {
    const { data, error } = await supabase.rpc('report_match_incident', {
      p_tournament_id: String(tournamentId),
      p_incident_type: String(incidentType).toUpperCase(),
      p_description: String(description).trim(),
      p_match_id: matchId || null,
    })

    if (error) {
      return { success: false, error_code: error.code || 'RPC_ERROR', message: error.message }
    }

    return Array.isArray(data) ? data[0] : data
  } catch (err) {
    return { success: false, error_code: 'EXCEPTION', message: err.message }
  }
}

/**
 * Admin action: Resolves a reported match incident with optional remake action.
 *
 * @param {Object} params
 * @param {string} params.incidentId Target incident record UUID
 * @param {'APPROVED'|'REJECTED'|'RESOLVED'} params.decision Admin verdict
 * @param {string} [params.resolutionAction] Optional action (e.g. 'REMAKE')
 * @param {string} [params.adminNotes] Admin review notes
 * @returns {Promise<Object>}
 */
export async function adminResolveMatchIncident({ incidentId, decision, resolutionAction = null, adminNotes = null }) {
  if (!isSupabaseConfigured) {
    return { success: true, status: decision, message: 'Mock incident resolved.' }
  }

  try {
    const { data, error } = await supabase.rpc('admin_resolve_match_incident', {
      p_incident_id: String(incidentId),
      p_decision: String(decision).toUpperCase(),
      p_resolution_action: resolutionAction ? String(resolutionAction).toUpperCase() : null,
      p_admin_notes: adminNotes ? String(adminNotes).trim() : null,
    })

    if (error) {
      return { success: false, error_code: error.code || 'RPC_ERROR', message: error.message }
    }

    return Array.isArray(data) ? data[0] : data
  } catch (err) {
    return { success: false, error_code: 'EXCEPTION', message: err.message }
  }
}

/**
 * Fetches all incidents reported for a tournament.
 *
 * @param {string} tournamentId
 * @returns {Promise<Array>}
 */
export async function getTournamentIncidents(tournamentId) {
  if (!isSupabaseConfigured || !tournamentId) return []

  try {
    const { data, error } = await supabase
      .from('match_incidents')
      .select('id, tournament_id, match_id, reported_by, incident_type, description, status, admin_notes, resolved_by, resolved_at, resolution_action, created_at, updated_at')
      .eq('tournament_id', String(tournamentId))
      .order('created_at', { ascending: false })

    if (error) {
      console.warn('[getTournamentIncidents notice]:', error.message)
      return []
    }

    return data || []
  } catch (err) {
    console.warn('[getTournamentIncidents exception]:', err)
    return []
  }
}

/**
 * Subscribes to realtime updates for a tournament's match check-ins.
 *
 * @param {string} tournamentId
 * @param {Function} onUpdate Callback when a check-in event occurs
 * @returns {Function} Unsubscribe cleanup function
 */
export function subscribeToTournamentCheckins(tournamentId, onUpdate) {
  if (!isSupabaseConfigured || !tournamentId) return () => {}

  const channel = supabase
    .channel(`match_checkins_${tournamentId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'match_checkins',
        filter: `tournament_id=eq.${tournamentId}`,
      },
      (payload) => {
        if (typeof onUpdate === 'function') onUpdate(payload)
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

/**
 * Subscribes to realtime updates for a tournament's match incidents.
 *
 * @param {string} tournamentId
 * @param {Function} onUpdate Callback when an incident event occurs
 * @returns {Function} Unsubscribe cleanup function
 */
export function subscribeToTournamentIncidents(tournamentId, onUpdate) {
  if (!isSupabaseConfigured || !tournamentId) return () => {}

  const channel = supabase
    .channel(`match_incidents_${tournamentId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'match_incidents',
        filter: `tournament_id=eq.${tournamentId}`,
      },
      (payload) => {
        if (typeof onUpdate === 'function') onUpdate(payload)
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}
