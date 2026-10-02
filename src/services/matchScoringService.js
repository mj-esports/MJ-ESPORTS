// src/services/matchScoringService.js
// Production Match Scoring, Scorecard Evidence & Result Finalization Service for MJ ESPORTS

import { supabase, isSupabaseConfigured } from '../lib/supabase.js'

/**
 * Submits or updates match scorecard evidence for a given tournament and lobby slot.
 *
 * @param {Object} params
 * @param {string} params.tournamentId Target tournament UUID
 * @param {number} params.lobbySlot Designated custom room lobby slot (1..max_teams)
 * @param {number} params.reportedKills Verified kill count
 * @param {number} [params.reportedPlacement] Reported finish placement rank
 * @param {string} [params.screenshotUrl] Public or signed proof URL
 * @param {string} [params.storagePath] Private storage path in profile-proofs
 * @returns {Promise<Object>}
 */
export async function submitMatchScorecard({
  tournamentId,
  lobbySlot,
  reportedKills,
  reportedPlacement = null,
  screenshotUrl = null,
  storagePath = null,
}) {
  if (!isSupabaseConfigured) {
    return {
      success: true,
      scorecard_id: 'mock-sc-1',
      lobby_slot: lobbySlot,
      message: 'Mock scorecard evidence recorded successfully.',
    }
  }

  try {
    const { data, error } = await supabase.rpc('submit_match_scorecard', {
      p_tournament_id: String(tournamentId),
      p_lobby_slot: parseInt(lobbySlot, 10),
      p_reported_kills: parseInt(reportedKills, 10) || 0,
      p_reported_placement: reportedPlacement ? parseInt(reportedPlacement, 10) : null,
      p_screenshot_url: screenshotUrl,
      p_storage_path: storagePath,
    })

    if (error) {
      console.warn('[submitMatchScorecard RPC error]:', error.message)
      return { success: false, error_code: error.code || 'RPC_ERROR', message: error.message }
    }

    const payload = Array.isArray(data) ? data[0] : data
    return payload || { success: false, error_code: 'EMPTY_RESPONSE', message: 'No response from scorecard service.' }
  } catch (err) {
    console.error('[submitMatchScorecard exception]:', err)
    return { success: false, error_code: 'EXCEPTION', message: err.message || 'Scorecard submission failed.' }
  }
}

/**
 * Fetches all submitted scorecards for a tournament.
 *
 * @param {string} tournamentId
 * @returns {Promise<Array>}
 */
export async function fetchTournamentScorecards(tournamentId) {
  if (!isSupabaseConfigured || !tournamentId) return []

  try {
    const { data, error } = await supabase
      .from('match_scorecards')
      .select('id, tournament_id, match_id, submitted_by, lobby_slot, registration_id, reported_kills, reported_placement, screenshot_url, storage_path, verification_status, admin_notes, verified_by, verified_at, created_at, updated_at')
      .eq('tournament_id', String(tournamentId))
      .order('lobby_slot', { ascending: true })

    if (error) {
      console.warn('[fetchTournamentScorecards notice]:', error.message)
      return []
    }

    return data || []
  } catch (err) {
    console.warn('[fetchTournamentScorecards exception]:', err)
    return []
  }
}

/**
 * Fetches authoritative normalized match slot results for a tournament.
 *
 * @param {string} tournamentId
 * @returns {Promise<Array>}
 */
export async function fetchTournamentSlotResults(tournamentId) {
  if (!isSupabaseConfigured || !tournamentId) return []

  try {
    const { data, error } = await supabase
      .from('match_slot_results')
      .select('id, tournament_id, match_id, lobby_slot, registration_id, team_name, captain_name, kills, placement, placement_points, kill_points, bonus_points, total_points, prize_winnings, created_at, updated_at')
      .eq('tournament_id', String(tournamentId))
      .order('placement', { ascending: true })

    if (error) {
      console.warn('[fetchTournamentSlotResults notice]:', error.message)
      return []
    }

    return data || []
  } catch (err) {
    console.warn('[fetchTournamentSlotResults exception]:', err)
    return []
  }
}

/**
 * Authoritatively calculates points, standings, and finalizes results in the database.
 * Enforces server-authoritative calculations, kill sanity, placement uniqueness, and prize ceiling.
 *
 * @param {Object} params
 * @param {string} params.tournamentId Target tournament UUID
 * @param {Array<Object>} params.teamScores Array of { lobby_slot, kills, placement, bonus, admin_notes }
 * @param {Object} [params.customPlacementMatrix] Optional custom placement points mapping
 * @returns {Promise<Object>}
 */
export async function calculateAndFinalizeScores({
  tournamentId,
  teamScores,
  customPlacementMatrix = null,
}) {
  if (!isSupabaseConfigured) {
    return {
      success: true,
      tournament_id: tournamentId,
      status: 'Completed',
      winner_team: teamScores[0]?.team_name || 'Champions',
      total_kills: teamScores.reduce((acc, t) => acc + Number(t.kills || 0), 0),
      total_payout_liability: 500,
      teams_count: teamScores.length,
      message: 'Mock match scores calculated and finalized successfully.',
    }
  }

  try {
    const { data, error } = await supabase.rpc('calculate_and_finalize_scores', {
      p_tournament_id: String(tournamentId),
      p_team_scores: teamScores,
      p_custom_placement_matrix: customPlacementMatrix,
    })

    if (error) {
      console.warn('[calculateAndFinalizeScores RPC error]:', error.message)
      return { success: false, error_code: error.code || 'RPC_ERROR', message: error.message }
    }

    const payload = Array.isArray(data) ? data[0] : data
    return payload || { success: false, error_code: 'EMPTY_RESPONSE', message: 'No response from scoring service.' }
  } catch (err) {
    console.error('[calculateAndFinalizeScores exception]:', err)
    return { success: false, error_code: 'EXCEPTION', message: err.message || 'Finalization request failed.' }
  }
}


/**
 * Subscribes to realtime updates for a tournament's match scorecards.
 *
 * @param {string} tournamentId
 * @param {Function} onUpdate Callback on change event
 * @returns {Function} Unsubscribe cleanup function
 */
export function subscribeToScorecardUpdates(tournamentId, onUpdate) {
  if (!isSupabaseConfigured || !tournamentId) return () => {}

  const channel = supabase
    .channel(`match_scorecards_${tournamentId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'match_scorecards',
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
 * Subscribes to realtime updates for a tournament's authoritative match slot results.
 *
 * @param {string} tournamentId
 * @param {Function} onUpdate Callback on change event
 * @returns {Function} Unsubscribe cleanup function
 */
export function subscribeToSlotResultsUpdates(tournamentId, onUpdate) {
  if (!isSupabaseConfigured || !tournamentId) return () => {}

  const channel = supabase
    .channel(`match_slot_results_${tournamentId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'match_slot_results',
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
