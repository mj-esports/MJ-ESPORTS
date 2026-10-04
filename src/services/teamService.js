// src/services/teamService.js
// Production Player Team Management & Squad Portal Service for MJ ESPORTS
// Clean frontend abstraction over authoritative N3.2 PostgreSQL SECURITY DEFINER RPCs

import { supabase, isSupabaseConfigured } from '../lib/supabase.js'

/**
 * Normalizes an RPC response payload into a standardized contract:
 * Success: { success: true, ...data }
 * Failure: { success: false, error: string, error_code: string }
 *
 * @param {any} data - Raw RPC response
 * @param {any} error - Supabase error object
 * @param {string} fallbackMsg - Default error message if none provided
 * @returns {object} Normalized response object
 */
function normalizeRpcResult(data, error, fallbackMsg = 'Request failed.') {
  if (error) {
    return {
      success: false,
      error: error.message || fallbackMsg,
      error_code: error.code || 'RPC_ERROR',
    }
  }

  const payload = Array.isArray(data) ? data[0] : data
  if (!payload || typeof payload !== 'object') {
    return {
      success: false,
      error: 'Empty or invalid response from squad management service.',
      error_code: 'EMPTY_RESPONSE',
    }
  }

  if (payload.success === false) {
    return {
      success: false,
      error: payload.message || payload.error || fallbackMsg,
      error_code: payload.error_code || 'RPC_BUSINESS_ERROR',
    }
  }

  return {
    success: true,
    data: payload,
    ...payload,
  }
}

/**
 * 1. Fetches all squad portal data for the current authenticated player in a single round-trip.
 * Retrieves active team, 6 member slots, pending incoming invites, and pending outgoing invites (if captain).
 *
 * @returns {Promise<{ success: boolean, has_team: boolean, team: object|null, members: Array, outgoing_invitations: Array, incoming_invitations: Array, is_captain: boolean, error?: string, error_code?: string }>}
 */
export async function getMyTeamPortalData() {
  if (!isSupabaseConfigured) {
    const mockPortal = {
      has_team: false,
      team: null,
      members: [],
      outgoing_invitations: [],
      incoming_invitations: [],
      is_captain: false,
    }
    return {
      success: true,
      data: mockPortal,
      ...mockPortal,
    }
  }

  try {
    const { data, error } = await supabase.rpc('get_my_team_portal_data')
    return normalizeRpcResult(data, error, 'Failed to fetch squad portal data.')
  } catch (err) {
    console.error('[teamService] getMyTeamPortalData exception:', err)
    return {
      success: false,
      has_team: false,
      team: null,
      members: [],
      outgoing_invitations: [],
      incoming_invitations: [],
      is_captain: false,
      error: err.message || 'Failed to load team portal data.',
      error_code: 'EXCEPTION',
    }
  }
}

/**
 * 2. Creates a new permanent Free Fire squad with the caller as Captain.
 *
 * @param {object} params
 * @param {string} params.name - Squad display name (3-30 chars)
 * @param {string} [params.tag] - Squad tag (2-5 uppercase chars)
 * @param {string} [params.description] - Squad motto/bio (<=250 chars)
 * @param {string} [params.gameUid] - 10-digit Free Fire MAX Character UID
 * @returns {Promise<{ success: boolean, team?: object, message?: string, error?: string, error_code?: string }>}
 */
export async function createPlayerTeam(params = {}) {
  const { name, tag, description, gameUid } = params

  const cleanName = (name || '').trim()
  if (!cleanName || cleanName.length < 3 || cleanName.length > 30) {
    return {
      success: false,
      error: 'Squad name must be between 3 and 30 characters.',
      error_code: 'VALIDATION_ERROR',
    }
  }

  if (tag && !/^[A-Za-z0-9]{2,5}$/.test(tag.trim())) {
    return {
      success: false,
      error: 'Squad tag must be 2 to 5 alphanumeric characters.',
      error_code: 'VALIDATION_ERROR',
    }
  }

  if (description && description.trim().length > 250) {
    return {
      success: false,
      error: 'Squad description cannot exceed 250 characters.',
      error_code: 'VALIDATION_ERROR',
    }
  }

  if (gameUid && !/^[0-9]{10}$/.test(gameUid.trim())) {
    return {
      success: false,
      error: 'Free Fire MAX Character UID must be exactly 10 numeric digits.',
      error_code: 'VALIDATION_ERROR',
    }
  }

  if (!isSupabaseConfigured) {
    return {
      success: true,
      message: 'Mock squad created successfully.',
      team: { id: 'mock-team-id', name: cleanName, tag: tag || null, status: 'Verified' },
    }
  }

  try {
    const { data, error } = await supabase.rpc('create_player_team', {
      p_name: cleanName,
      p_tag: tag ? tag.trim().toUpperCase() : null,
      p_description: description ? description.trim() : null,
      p_game_uid: gameUid ? gameUid.trim() : null,
    })

    return normalizeRpcResult(data, error, 'Failed to create squad.')
  } catch (err) {
    console.error('[teamService] createPlayerTeam exception:', err)
    return {
      success: false,
      error: err.message || 'Squad creation request failed.',
      error_code: 'EXCEPTION',
    }
  }
}

/**
 * 3. Updates squad profile details (Captain or Admin only).
 *
 * @param {object} params
 * @param {string} params.teamId - Target squad UUID
 * @param {string} params.name - Updated squad name
 * @param {string} [params.tag] - Updated squad tag
 * @param {string} [params.description] - Updated bio
 * @param {boolean} [params.isRecruiting=true] - Recruitment status
 * @param {string} [params.logoUrl] - Squad emblem storage URL
 * @returns {Promise<{ success: boolean, team?: object, message?: string, error?: string, error_code?: string }>}
 */
export async function updatePlayerTeam(params = {}) {
  const { teamId, name, tag, description, isRecruiting, logoUrl } = params

  if (!teamId) {
    return {
      success: false,
      error: 'Target squad ID is required.',
      error_code: 'VALIDATION_ERROR',
    }
  }

  const cleanName = (name || '').trim()
  if (!cleanName || cleanName.length < 3 || cleanName.length > 30) {
    return {
      success: false,
      error: 'Squad name must be between 3 and 30 characters.',
      error_code: 'VALIDATION_ERROR',
    }
  }

  if (tag && !/^[A-Za-z0-9]{2,5}$/.test(tag.trim())) {
    return {
      success: false,
      error: 'Squad tag must be 2 to 5 alphanumeric characters.',
      error_code: 'VALIDATION_ERROR',
    }
  }

  if (description && description.trim().length > 250) {
    return {
      success: false,
      error: 'Squad description cannot exceed 250 characters.',
      error_code: 'VALIDATION_ERROR',
    }
  }

  if (!isSupabaseConfigured) {
    return {
      success: true,
      message: 'Mock squad profile updated.',
      team: { id: teamId, name: cleanName, tag: tag || null },
    }
  }

  try {
    const { data, error } = await supabase.rpc('update_player_team', {
      p_team_id: String(teamId),
      p_name: cleanName,
      p_tag: tag ? tag.trim().toUpperCase() : null,
      p_description: description ? description.trim() : null,
      p_is_recruiting: isRecruiting !== false,
      p_logo_url: logoUrl || null,
    })

    return normalizeRpcResult(data, error, 'Failed to update squad profile.')
  } catch (err) {
    console.error('[teamService] updatePlayerTeam exception:', err)
    return {
      success: false,
      error: err.message || 'Squad update request failed.',
      error_code: 'EXCEPTION',
    }
  }
}

/**
 * 4. Dispatches an invitation to a player by Free Fire UID, username, or email.
 *
 * @param {object} params
 * @param {string} params.teamId - Squad UUID
 * @param {string} params.inviteeIdentifier - Free Fire UID, username, or email
 * @param {string} [params.role='Member'] - 'Member' or 'Substitute'
 * @returns {Promise<{ success: boolean, invitation_id?: string, invitee_name?: string, message?: string, error?: string, error_code?: string }>}
 */
export async function inviteTeamMember(params = {}) {
  const { teamId, inviteeIdentifier, role = 'Member' } = params

  if (!teamId || !inviteeIdentifier) {
    return {
      success: false,
      error: 'Squad ID and player identifier (UID, username, or email) are required.',
      error_code: 'VALIDATION_ERROR',
    }
  }

  const cleanRole = role === 'Substitute' ? 'Substitute' : 'Member'

  if (!isSupabaseConfigured) {
    return {
      success: true,
      invitation_id: 'mock-invite-id',
      invitee_name: inviteeIdentifier,
      message: `Invitation sent to ${inviteeIdentifier}.`,
    }
  }

  try {
    const { data, error } = await supabase.rpc('invite_team_member', {
      p_team_id: String(teamId),
      p_invitee_identifier: String(inviteeIdentifier).trim(),
      p_role: cleanRole,
    })

    return normalizeRpcResult(data, error, 'Failed to send squad invitation.')
  } catch (err) {
    console.error('[teamService] inviteTeamMember exception:', err)
    return {
      success: false,
      error: err.message || 'Squad invite request failed.',
      error_code: 'EXCEPTION',
    }
  }
}

/**
 * 5. Responds to a pending squad invitation ('ACCEPT' or 'REJECT').
 *
 * @param {object|string} paramsOrId - Invitation parameters object or invitation UUID string
 * @param {string} [actionParam] - 'ACCEPT' or 'REJECT' (if first param is string ID)
 * @returns {Promise<{ success: boolean, action?: string, message?: string, error?: string, error_code?: string }>}
 */
export async function respondTeamInvitation(paramsOrId, actionParam) {
  let invitationId
  let action

  if (typeof paramsOrId === 'object' && paramsOrId !== null) {
    invitationId = paramsOrId.invitationId || paramsOrId.id
    action = paramsOrId.action
  } else {
    invitationId = paramsOrId
    action = actionParam
  }

  const cleanAction = String(action || '').toUpperCase().trim()
  if (!invitationId || !['ACCEPT', 'REJECT'].includes(cleanAction)) {
    return {
      success: false,
      error: 'Valid invitation ID and action (ACCEPT or REJECT) are required.',
      error_code: 'VALIDATION_ERROR',
    }
  }

  if (!isSupabaseConfigured) {
    return {
      success: true,
      action: cleanAction,
      message: `Mock invitation ${cleanAction.toLowerCase()}ed.`,
    }
  }

  try {
    const { data, error } = await supabase.rpc('respond_team_invitation', {
      p_invitation_id: String(invitationId),
      p_action: cleanAction,
    })

    return normalizeRpcResult(data, error, `Failed to ${cleanAction.toLowerCase()} invitation.`)
  } catch (err) {
    console.error('[teamService] respondTeamInvitation exception:', err)
    return {
      success: false,
      error: err.message || 'Invitation response request failed.',
      error_code: 'EXCEPTION',
    }
  }
}

/**
 * 6. Cancels a pending outgoing invitation (Captain or Admin only).
 *
 * @param {object|string} paramsOrId - { invitationId } or invitation UUID string
 * @returns {Promise<{ success: boolean, message?: string, error?: string, error_code?: string }>}
 */
export async function cancelTeamInvitation(paramsOrId) {
  const invitationId =
    typeof paramsOrId === 'object' && paramsOrId !== null
      ? paramsOrId.invitationId || paramsOrId.id
      : paramsOrId

  if (!invitationId) {
    return {
      success: false,
      error: 'Invitation ID is required.',
      error_code: 'VALIDATION_ERROR',
    }
  }

  if (!isSupabaseConfigured) {
    return {
      success: true,
      message: 'Mock invitation cancelled.',
    }
  }

  try {
    const { data, error } = await supabase.rpc('cancel_team_invitation', {
      p_invitation_id: String(invitationId),
    })

    return normalizeRpcResult(data, error, 'Failed to cancel invitation.')
  } catch (err) {
    console.error('[teamService] cancelTeamInvitation exception:', err)
    return {
      success: false,
      error: err.message || 'Cancel invitation request failed.',
      error_code: 'EXCEPTION',
    }
  }
}

/**
 * 7. Removes a member from the squad (Captain or Admin only).
 *
 * @param {object} params
 * @param {string} params.teamId - Squad UUID
 * @param {string} params.targetUserId - UUID of the player to remove
 * @returns {Promise<{ success: boolean, message?: string, error?: string, error_code?: string }>}
 */
export async function removeTeamMember(params = {}) {
  const { teamId, targetUserId } = params

  if (!teamId || !targetUserId) {
    return {
      success: false,
      error: 'Squad ID and target member user ID are required.',
      error_code: 'VALIDATION_ERROR',
    }
  }

  if (!isSupabaseConfigured) {
    return {
      success: true,
      message: 'Mock member removed from squad.',
    }
  }

  try {
    const { data, error } = await supabase.rpc('remove_team_member', {
      p_team_id: String(teamId),
      p_target_user_id: String(targetUserId),
    })

    return normalizeRpcResult(data, error, 'Failed to remove member.')
  } catch (err) {
    console.error('[teamService] removeTeamMember exception:', err)
    return {
      success: false,
      error: err.message || 'Remove member request failed.',
      error_code: 'EXCEPTION',
    }
  }
}

/**
 * 8. Removes the current player from their active squad (Non-Captains only).
 *
 * @param {object|string} [paramsOrId] - { teamId } or squad UUID string
 * @returns {Promise<{ success: boolean, message?: string, error?: string, error_code?: string }>}
 */
export async function leavePlayerTeam(paramsOrId) {
  const teamId =
    typeof paramsOrId === 'object' && paramsOrId !== null
      ? paramsOrId.teamId || paramsOrId.id
      : paramsOrId

  if (!teamId) {
    return {
      success: false,
      error: 'Squad ID is required.',
      error_code: 'VALIDATION_ERROR',
    }
  }

  if (!isSupabaseConfigured) {
    return {
      success: true,
      message: 'Mock left squad successfully.',
    }
  }

  try {
    const { data, error } = await supabase.rpc('leave_player_team', {
      p_team_id: String(teamId),
    })

    return normalizeRpcResult(data, error, 'Failed to leave squad.')
  } catch (err) {
    console.error('[teamService] leavePlayerTeam exception:', err)
    return {
      success: false,
      error: err.message || 'Leave squad request failed.',
      error_code: 'EXCEPTION',
    }
  }
}

/**
 * 9. Transfers squad ownership and captaincy to an active squad member.
 *
 * @param {object} params
 * @param {string} params.teamId - Squad UUID
 * @param {string} params.newCaptainUserId - UUID of target squad member
 * @returns {Promise<{ success: boolean, message?: string, error?: string, error_code?: string }>}
 */
export async function transferTeamOwnership(params = {}) {
  const { teamId, newCaptainUserId } = params

  if (!teamId || !newCaptainUserId) {
    return {
      success: false,
      error: 'Squad ID and new captain user ID are required.',
      error_code: 'VALIDATION_ERROR',
    }
  }

  if (!isSupabaseConfigured) {
    return {
      success: true,
      message: 'Mock captaincy transferred.',
    }
  }

  try {
    const { data, error } = await supabase.rpc('transfer_team_ownership', {
      p_team_id: String(teamId),
      p_new_captain_user_id: String(newCaptainUserId),
    })

    return normalizeRpcResult(data, error, 'Failed to transfer squad captaincy.')
  } catch (err) {
    console.error('[teamService] transferTeamOwnership exception:', err)
    return {
      success: false,
      error: err.message || 'Transfer captaincy request failed.',
      error_code: 'EXCEPTION',
    }
  }
}

/**
 * 10. Modifies a squad member's role ('Member' or 'Substitute').
 *
 * @param {object} params
 * @param {string} params.teamId - Squad UUID
 * @param {string} params.targetUserId - UUID of member
 * @param {string} params.newRole - 'Member' or 'Substitute'
 * @returns {Promise<{ success: boolean, message?: string, error?: string, error_code?: string }>}
 */
export async function setTeamMemberRole(params = {}) {
  const { teamId, targetUserId, newRole } = params

  if (!teamId || !targetUserId || !newRole) {
    return {
      success: false,
      error: 'Squad ID, target user ID, and new role are required.',
      error_code: 'VALIDATION_ERROR',
    }
  }

  const cleanRole = newRole === 'Substitute' ? 'Substitute' : 'Member'

  if (!isSupabaseConfigured) {
    return {
      success: true,
      message: `Mock role updated to ${cleanRole}.`,
    }
  }

  try {
    const { data, error } = await supabase.rpc('set_team_member_role', {
      p_team_id: String(teamId),
      p_target_user_id: String(targetUserId),
      p_new_role: cleanRole,
    })

    return normalizeRpcResult(data, error, 'Failed to update member role.')
  } catch (err) {
    console.error('[teamService] setTeamMemberRole exception:', err)
    return {
      success: false,
      error: err.message || 'Update member role request failed.',
      error_code: 'EXCEPTION',
    }
  }
}
