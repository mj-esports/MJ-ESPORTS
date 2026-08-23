import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase.js'
import { useAuth } from './AuthContext'
import { INITIAL_TOURNAMENTS } from '../data/mockData'
import { generateUUID } from '../utils/uuid'
import {
  normalizeLifecycleStatus,
  getNextLifecycleStage,
  isValidLifecycleTransition
} from '../constants/tournamentLifecycle'
import { parseTournamentDeadline } from '../utils/validationUtils'

const TournamentContext = createContext(null)

/**
 * Normalizes a database row from public.tournaments back into a frontend tournament object.
 */
export function mapTournamentFromDb(row) {
  if (!row) return null

  let rulesArray = []
  if (Array.isArray(row.rules)) {
    rulesArray = row.rules
  } else if (typeof row.rules === 'string' && row.rules.trim()) {
    rulesArray = row.rules.split('\n').map((r) => r.trim()).filter(Boolean)
  }

  const formatStr = row.format || row.match_format || 'SQUAD (4P)'
  const statusStr = normalizeLifecycleStatus(row.status)

  return {
    id: String(row.id),
    title: row.title || '',
    game: row.game || 'Free Fire',
    format: formatStr,
    match_format: row.match_format || formatStr,
    matchFormat: row.match_format || formatStr,
    prizePool: row.prize_pool || '₹0',
    prize_pool: row.prize_pool || '₹0',
    entryFee: row.entry_fee || 'Free',
    entry_fee: row.entry_fee || 'Free',
    maxTeams: Number(row.max_teams ?? 12),
    max_teams: Number(row.max_teams ?? 12),
    registeredTeams: Number(row.registered_teams ?? 0),
    registered_teams: Number(row.registered_teams ?? 0),
    startDate: row.start_date || '',
    start_date: row.start_date || '',
    startTime: row.start_time || '',
    start_time: row.start_time || '',
    status: statusStr,
    published: statusStr !== 'Draft',
    organizer: row.organizer || 'MJ ESPORTS Official',
    description: row.description || '',
    rules: rulesArray,
    teamsList: Array.isArray(row.teams_list) ? row.teams_list : [],
    teams_list: Array.isArray(row.teams_list) ? row.teams_list : [],
    roomId: '',
    room_id: '',
    roomPassword: '',
    room_password: '',
    roomStatus: row.room_status || 'Draft',
    room_status: row.room_status || 'Draft',
    roomLastUpdated: row.room_last_updated || null,
    room_last_updated: row.room_last_updated || null,
    roomPublishedBy: row.room_published_by || '',
    room_published_by: row.room_published_by || '',
    winnerTeam: row.winner_team || '',
    winner_team: row.winner_team || '',
    winnerCaptain: row.winner_captain || '',
    winner_captain: row.winner_captain || '',
    createdAt: row.created_at || null,
    created_at: row.created_at || null,
    updatedAt: row.updated_at || null,
    updated_at: row.updated_at || null,
  }
}

/**
 * Normalizes frontend tournament data into the allowed public.tournaments database columns.
 */
export function mapTournamentToDb(t) {
  if (!t) return {}

  const formatVal = String(t.format || t.match_format || t.matchFormat || 'SQUAD (4P)').trim()

  let rulesArray = []
  if (Array.isArray(t.rules)) {
    rulesArray = t.rules.map((r) => String(r).trim()).filter(Boolean)
  } else if (typeof t.rules === 'string' && t.rules.trim()) {
    rulesArray = t.rules.split('\n').map((r) => r.trim()).filter(Boolean)
  }

  const idVal = t.id && !String(t.id).startsWith('t-') ? String(t.id) : generateUUID()
  const teamsListVal = Array.isArray(t.teams_list) ? t.teams_list : Array.isArray(t.teamsList) ? t.teamsList : []

  const payload = {
    id: idVal,
    title: String(t.title || '').trim(),
    game: String(t.game || 'Free Fire').trim(),
    format: formatVal,
    prize_pool: String(t.prize_pool || t.prizePool || '₹0').trim(),
    entry_fee: String(t.entry_fee || t.entryFee || 'Free').trim(),
    max_teams: Number(t.max_teams ?? t.maxTeams ?? 12),
    registered_teams: Number(t.registered_teams ?? t.registeredTeams ?? 0),
    start_date: String(t.start_date || t.startDate || '').trim(),
    start_time: String(t.start_time || t.startTime || '').trim(),
    status: String(t.status || 'Registration Open').trim(),
    organizer: String(t.organizer || 'MJ ESPORTS Official').trim(),
    description: String(t.description || '').trim(),
    rules: rulesArray,
    teams_list: teamsListVal,
  }

  if (t.roomId !== undefined || t.room_id !== undefined) {
    payload.room_id = t.roomId ?? t.room_id ?? null
  }
  if (t.roomPassword !== undefined || t.room_password !== undefined) {
    payload.room_password = t.roomPassword ?? t.room_password ?? null
  }
  if (t.roomStatus !== undefined || t.room_status !== undefined) {
    payload.room_status = t.roomStatus ?? t.room_status ?? 'Draft'
  }
  if (t.roomLastUpdated !== undefined || t.room_last_updated !== undefined) {
    payload.room_last_updated = t.roomLastUpdated ?? t.room_last_updated ?? null
  }
  if (t.roomPublishedBy !== undefined || t.room_published_by !== undefined) {
    payload.room_published_by = t.roomPublishedBy ?? t.roomPublishedBy ?? null
  }
  if (t.winnerTeam !== undefined || t.winner_team !== undefined) {
    payload.winner_team = t.winnerTeam ?? t.winner_team ?? null
  }
  if (t.winnerCaptain !== undefined || t.winner_captain !== undefined) {
    payload.winner_captain = t.winnerCaptain ?? t.winner_captain ?? null
  }

  if (t.created_at || t.createdAt) {
    payload.created_at = t.created_at || t.createdAt
  }
  if (t.updated_at || t.updatedAt) {
    payload.updated_at = t.updated_at || t.updatedAt
  }

  return payload
}

/**
 * Maps only the provided partial frontend fields to allowed database columns for targeted UPDATE queries.
 */
export function mapPartialTournamentToDb(fields) {
  if (!fields || typeof fields !== 'object') return {}

  const payload = {}

  if (fields.title !== undefined) payload.title = String(fields.title || '').trim()
  if (fields.game !== undefined) payload.game = String(fields.game || 'Free Fire').trim()

  if (fields.format !== undefined || fields.match_format !== undefined || fields.matchFormat !== undefined) {
    payload.format = String(fields.format || fields.match_format || fields.matchFormat || 'SQUAD (4P)').trim()
  }

  if (fields.prizePool !== undefined || fields.prize_pool !== undefined) {
    payload.prize_pool = String(fields.prize_pool || fields.prizePool || '₹0').trim()
  }

  if (fields.entryFee !== undefined || fields.entry_fee !== undefined) {
    payload.entry_fee = String(fields.entry_fee || fields.entryFee || 'Free').trim()
  }

  if (fields.maxTeams !== undefined || fields.max_teams !== undefined) {
    payload.max_teams = Number(fields.max_teams ?? fields.maxTeams ?? 12)
  }

  if (fields.registeredTeams !== undefined || fields.registered_teams !== undefined) {
    payload.registered_teams = Number(fields.registered_teams ?? fields.registeredTeams ?? 0)
  }

  if (fields.startDate !== undefined || fields.start_date !== undefined) {
    payload.start_date = String(fields.start_date || fields.startDate || '').trim()
  }

  if (fields.startTime !== undefined || fields.start_time !== undefined) {
    payload.start_time = String(fields.start_time || fields.startTime || '').trim()
  }

  if (fields.status !== undefined) {
    let s = String(fields.status || '').trim()
    if (s === 'Live') s = 'Live Now'
    payload.status = s
  }

  if (fields.organizer !== undefined) payload.organizer = String(fields.organizer || 'MJ ESPORTS Official').trim()
  if (fields.description !== undefined) payload.description = String(fields.description || '').trim()

  if (fields.rules !== undefined) {
    if (Array.isArray(fields.rules)) {
      payload.rules = fields.rules.map((r) => String(r).trim()).filter(Boolean)
    } else if (typeof fields.rules === 'string' && fields.rules.trim()) {
      payload.rules = fields.rules.split('\n').map((r) => r.trim()).filter(Boolean)
    } else {
      payload.rules = []
    }
  }

  if (fields.teamsList !== undefined || fields.teams_list !== undefined) {
    payload.teams_list = Array.isArray(fields.teams_list)
      ? fields.teams_list
      : Array.isArray(fields.teamsList)
      ? fields.teamsList
      : []
  }

  if (fields.roomId !== undefined || fields.room_id !== undefined) {
    payload.room_id = fields.roomId ?? fields.room_id ?? null
  }

  if (fields.roomPassword !== undefined || fields.room_password !== undefined) {
    payload.room_password = fields.roomPassword ?? fields.room_password ?? null
  }

  if (fields.roomStatus !== undefined || fields.room_status !== undefined) {
    payload.room_status = fields.roomStatus ?? fields.room_status ?? 'Draft'
  }

  if (fields.roomLastUpdated !== undefined || fields.room_last_updated !== undefined) {
    payload.room_last_updated = fields.roomLastUpdated ?? fields.room_last_updated ?? null
  }

  if (fields.roomPublishedBy !== undefined || fields.room_published_by !== undefined) {
    payload.room_published_by = fields.roomPublishedBy ?? fields.room_published_by ?? null
  }

  if (fields.winnerTeam !== undefined || fields.winner_team !== undefined) {
    payload.winner_team = fields.winnerTeam ?? fields.winner_team ?? null
  }

  if (fields.winnerCaptain !== undefined || fields.winner_captain !== undefined) {
    payload.winner_captain = fields.winnerCaptain ?? fields.winner_captain ?? null
  }

  if (fields.updatedAt !== undefined || fields.updated_at !== undefined) {
    payload.updated_at = fields.updated_at ?? fields.updatedAt ?? new Date().toISOString()
  }

  return payload
}

export function TournamentProvider({ children }) {
  const { isAdmin } = useAuth()
  const [tournaments, setTournaments] = useState(INITIAL_TOURNAMENTS)
  const [loading, setLoading] = useState(true)

  // In-flight request lock to prevent duplicate concurrent submissions
  const activeSubmissionsRef = useRef(new Set())

  const fetchTournaments = useCallback(async (retries = 2) => {
    if (!isSupabaseConfigured) {
      setTournaments(INITIAL_TOURNAMENTS)
      setLoading(false)
      return
    }

    let attempt = 0
    while (attempt <= retries) {
      try {
        const { data, error } = await supabase
          .from('tournaments')
          .select('id, title, game, format, prize_pool, entry_fee, max_teams, registered_teams, start_date, start_time, status, organizer, description, rules, teams_list, room_status, room_last_updated, room_published_by, winner_team, winner_captain, created_at, updated_at')
          .order('created_at', { ascending: false })

        if (error) {
          console.error(`[fetchTournaments] Attempt ${attempt + 1} error:`, error)
          if (attempt < retries) {
            await new Promise((res) => setTimeout(res, 1000 * (attempt + 1)))
            attempt++
            continue
          } else {
            setTournaments(INITIAL_TOURNAMENTS)
          }
        } else if (data && data.length > 0) {
          setTournaments(data.map(mapTournamentFromDb))
          break
        } else {
          setTournaments(INITIAL_TOURNAMENTS)
          break
        }
      } catch (err) {
        console.error(`[fetchTournaments] Attempt ${attempt + 1} exception:`, err)
        if (attempt < retries) {
          await new Promise((res) => setTimeout(res, 1000 * (attempt + 1)))
          attempt++
          continue
        } else {
          setTournaments(INITIAL_TOURNAMENTS)
        }
      } finally {
        setLoading(false)
      }
      attempt++
    }
  }, [])

  useEffect(() => {
    fetchTournaments()

    if (isSupabaseConfigured) {
      const channel = supabase
        .channel('realtime_tournaments_changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'tournaments' },
          () => {
            fetchTournaments()
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [fetchTournaments])

  const getTournamentById = (id) => {
    return tournaments.find((t) => String(t.id) === String(id))
  }

  const isUserRegistered = useCallback((tournamentId, identifierOrUser) => {
    if (!tournamentId || !identifierOrUser) return false
    const target = tournaments.find((t) => String(t.id) === String(tournamentId))
    if (!target) return false

    const userId = typeof identifierOrUser === 'object' ? identifierOrUser?.id : (typeof identifierOrUser === 'string' && identifierOrUser.length === 36 ? identifierOrUser : null)
    const userEmail = typeof identifierOrUser === 'object' ? identifierOrUser?.email : (typeof identifierOrUser === 'string' && identifierOrUser.includes('@') ? identifierOrUser : null)
    const rawStr = typeof identifierOrUser === 'string' ? identifierOrUser.toLowerCase().trim() : ''

    const teams = target.teamsList || target.teams_list || []
    return teams.some((item) => {
      if (!item) return false
      if (userId && item.userId && String(item.userId) === String(userId)) return true
      if (userEmail && item.email && String(item.email).toLowerCase() === userEmail.toLowerCase()) return true
      if (rawStr && item.userId && String(item.userId).toLowerCase() === rawStr) return true
      if (rawStr && item.email && String(item.email).toLowerCase() === rawStr) return true
      if (rawStr && item.captain && String(item.captain).toLowerCase() === rawStr) return true
      return false
    })
  }, [tournaments])

  const createTournament = async (tournamentData) => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase client is not configured.')
    }

    const lockKey = `create_${tournamentData.title || ''}_${tournamentData.startDate || ''}`
    if (activeSubmissionsRef.current.has(lockKey)) {
      throw new Error('A tournament creation request is already in progress. Please wait.')
    }
    activeSubmissionsRef.current.add(lockKey)

    try {
      const payload = mapTournamentToDb(tournamentData)
      console.log('Complete tournament payload immediately before insert():', payload)

      const { error } = await supabase
        .from('tournaments')
        .insert([payload])

      if (error) {
        console.error("Supabase Error:", {
          code: error?.code,
          message: error?.message,
          details: error?.details,
          hint: error?.hint,
          status: error?.status
        })
        throw error
      }

      const newTournament = mapTournamentFromDb(payload)
      setTournaments((prev) => [newTournament, ...prev.filter((t) => String(t.id) !== String(newTournament.id))])
      return newTournament
    } finally {
      activeSubmissionsRef.current.delete(lockKey)
    }
  }
  const updateTournament = async (id, updatedFields) => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase client is not configured.')
    }

    const payload = mapPartialTournamentToDb(updatedFields)
    console.log('Partial tournament payload immediately before update():', payload)

    const { error } = await supabase
      .from('tournaments')
      .update(payload)
      .eq('id', id)

    if (error) {
      console.error("Supabase Error:", {
        code: error?.code,
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        status: error?.status
      })
      throw error
    }

    const existing = tournaments.find((t) => String(t.id) === String(id))
    const merged = existing ? { ...existing, ...updatedFields, id } : { ...updatedFields, id }
    const updatedTournament = mapTournamentFromDb(merged)
    setTournaments((prev) => prev.map((t) => (String(t.id) === String(id) ? updatedTournament : t)))
    return updatedTournament
  }

  const deleteTournament = async (id) => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase client is not configured.')
    }

    const { error } = await supabase
      .from('tournaments')
      .delete()
      .eq('id', id)

    if (error) {
      console.error("Supabase Error:", {
        code: error?.code,
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        status: error?.status
      })
      throw error
    }

    setTournaments((prev) => prev.filter((t) => String(t.id) !== String(id)))
  }

  const updateTournamentStatus = async (tournamentId, newStatus) => {
    return updateTournament(tournamentId, { status: newStatus })
  }

  const registerTeam = async (tournamentId, teamInfo) => {
    const lockKey = `reg_${tournamentId}_${teamInfo.email || teamInfo.freeFireUid || teamInfo.userId || ''}`
    if (activeSubmissionsRef.current.has(lockKey)) {
      throw new Error('Registration is currently processing. Please wait.')
    }
    activeSubmissionsRef.current.add(lockKey)

    try {
      const target = tournaments.find((t) => String(t.id) === String(tournamentId))
      if (!target) {
        throw new Error('Tournament not found!')
      }

      if (target.status !== 'Registration Open') {
        throw new Error('Registration for this tournament is currently closed.')
      }

      if (target.startDate) {
        const deadlineDate = parseTournamentDeadline(target.startDate, target.startTime || target.start_time)
        if (deadlineDate && deadlineDate < new Date()) {
          throw new Error('The registration deadline for this tournament has passed.')
        }
      }

      if ((target.registeredTeams || 0) >= (target.maxTeams || target.max_teams || 12)) {
        throw new Error('Tournament slots are full!')
      }

      const regStatus = teamInfo.status || 'Approved'
      const refId = teamInfo.refId || `REG-MJ-${Date.now().toString(36).toUpperCase()}`

      if (isSupabaseConfigured) {
        // 1. Check authenticated session
        const { data: sessionData } = await supabase.auth.getSession()
        const hasSession = Boolean(sessionData?.session?.user)
        const sessionUserId = sessionData?.session?.user?.id || null

        const rpcPayload = {
          p_tournament_id: String(tournamentId),
          p_team_name: teamInfo.name,
          p_captain_name: teamInfo.captain,
          p_email: teamInfo.email,
          p_whatsapp_number: teamInfo.whatsappNumber,
          p_captain_uid: teamInfo.freeFireUid,
          p_teammate_uids: teamInfo.teammates || [],
          p_substitute_uids: teamInfo.substitutes || [],
          p_captain_dob: teamInfo.captainDob || null,
          p_player_age: teamInfo.playerAge ? Number(teamInfo.playerAge) : null,
          p_preferred_seed: teamInfo.preferredSeed ? Number(teamInfo.preferredSeed) : 1,
          p_has_substitutes: Boolean(teamInfo.hasSubstitutes),
          p_enable_sms_alerts: Boolean(teamInfo.enableSmsAlerts !== false),
          p_mode: teamInfo.mode || 'Squad',
          p_ref_id: refId,
          p_teammate_igns: teamInfo.teammateIgns || [],
          p_substitute_igns: teamInfo.substituteIgns || [],
        }

        console.log('[RPC Diagnostic]: Session Status ->', {
          hasSession,
          sessionUserId,
          isSupabaseConfigured,
        })

        console.log('[RPC Diagnostic]: Invoking register_tournament_team with payload ->', {
          p_tournament_id: rpcPayload.p_tournament_id,
          p_team_name: rpcPayload.p_team_name,
          p_captain_name: rpcPayload.p_captain_name,
          p_captain_uid: rpcPayload.p_captain_uid,
          p_teammate_uids: rpcPayload.p_teammate_uids,
          p_teammate_igns: rpcPayload.p_teammate_igns,
          p_substitute_uids: rpcPayload.p_substitute_uids,
          p_substitute_igns: rpcPayload.p_substitute_igns,
          p_mode: rpcPayload.p_mode,
          p_ref_id: rpcPayload.p_ref_id,
        })

        // Authoritative Path: Call Atomic Supabase PostgreSQL RPC
        const { data, error } = await supabase.rpc('register_tournament_team', rpcPayload)

        console.log('[RPC Diagnostic]: Response ->', {
          data,
          error: error ? {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
            status: error.status,
          } : null,
        })

        if (error) {
          console.error('[RPC register_tournament_team error]:', error)
          throw new Error(error.message || 'Database error processing tournament registration.')
        }

        if (data && data.success === false) {
          console.warn('[RPC Diagnostic]: RPC returned unsuccessful response ->', data.error_code, data.message)
          // Map structured RPC error codes to clear, user-friendly UI messages
          switch (data.error_code) {
            case 'DUPLICATE_GAME_UID':
              throw new Error(data.message || 'One of the Game UIDs is already registered in this tournament.')
            case 'DUPLICATE_USER_ACCOUNT':
              throw new Error('You have already registered for this tournament.')
            case 'TOURNAMENT_FULL':
              throw new Error('All registration slots for this tournament are full.')
            case 'REGISTRATION_CLOSED':
              throw new Error('Registration for this tournament is currently closed.')
            case 'UNAUTHENTICATED':
              throw new Error('You must be logged in to register for a tournament.')
            case 'INVALID_ROSTER':
              throw new Error(data.message || 'Please check your player roster and try again.')
            default:
              throw new Error(data.message || 'Registration failed.')
          }
        }

        console.log('[RPC Diagnostic]: RPC Registration Success! Synchronizing tournaments state...')
        await fetchTournaments()
        return data.teamRecord || { ...teamInfo, id: refId, refId, status: regStatus }
      }

      throw new Error('Supabase client is not configured.')
    } finally {
      activeSubmissionsRef.current.delete(lockKey)
    }
  }

  const withdrawTeam = async (tournamentId, identifier) => {
    const target = tournaments.find((t) => String(t.id) === String(tournamentId))
    if (!target) throw new Error('Tournament not found!')

    if (target.status === 'Registration Closed' || target.status === 'Bracket Locked' || target.status === 'Completed') {
      throw new Error('Cannot withdraw registration after tournament registration is closed!')
    }

    if (isSupabaseConfigured) {
      await supabase
        .from('tournament_registrations')
        .delete()
        .match({ tournament_id: tournamentId, email: identifier })
    }

    const filteredTeams = (target.teamsList || []).filter(
      (item) =>
        item.email?.toLowerCase() !== identifier?.toLowerCase() &&
        item.userId !== identifier &&
        item.captain !== identifier
    )

    const newRegisteredCount = Math.max(0, (target.registeredTeams || 0) - 1)

    await updateTournament(tournamentId, {
      registeredTeams: newRegisteredCount,
      teamsList: filteredTeams,
    })
  }

  const updateRegistrationStatus = async (tournamentId, registrationIdentifier, newStatus) => {
    const target = tournaments.find((t) => String(t.id) === String(tournamentId))
    if (!target) return

    const updatedTeams = (target.teamsList || []).map((team) => {
      if (team.email === registrationIdentifier || team.id === registrationIdentifier || team.name === registrationIdentifier) {
        return { ...team, status: newStatus }
      }
      return team
    })

    const isRejection = newStatus === 'Rejected'
    const newRegisteredCount = isRejection ? Math.max(0, (target.registeredTeams || 0) - 1) : target.registeredTeams

    await updateTournament(tournamentId, {
      registeredTeams: newRegisteredCount,
      teamsList: updatedTeams,
    })
  }

  const updateTournamentScores = async (tournamentId, updatedTeams) => {
    return updateTournament(tournamentId, { teamsList: updatedTeams })
  }

  const updateRoomDetails = async (tournamentId, roomData) => {
    if (!roomData) return
    return updateTournament(tournamentId, {
      roomId: roomData.roomId,
      roomPassword: roomData.roomPassword,
      roomStatus: roomData.roomStatus,
      roomLastUpdated: new Date().toISOString(),
      roomPublishedBy: roomData.roomPublishedBy,
    })
  }

  const getRoomCredentials = useCallback(async (tournamentId) => {
    if (!isSupabaseConfigured || !tournamentId) return { success: false, error_code: 'NOT_CONFIGURED', message: 'Supabase client is not configured.' }
    try {
      const { data, error } = await supabase.rpc('get_tournament_room_credentials', {
        p_tournament_id: String(tournamentId),
      })
      if (error) {
        console.warn('[getRoomCredentials RPC Notice]:', error.message)
        return { success: false, error_code: error.code || 'RPC_ERROR', message: error.message }
      }

      // Safely handle both JSONB Object and JSONB Array returned by Supabase RPC
      const payload = Array.isArray(data) ? data[0] : data

      if (!payload) {
        return { success: false, error_code: 'EMPTY_RESPONSE', message: 'No credential record returned from server.' }
      }

      if (payload.success === false) {
        return {
          success: false,
          errorCode: payload.error_code || 'DENIED',
          message: payload.message || 'Access to room credentials was denied.',
        }
      }

      // Map snake_case database response keys to camelCase & preserve snake_case aliases for full compatibility
      const roomId = payload.roomId ?? payload.room_id ?? ''
      const roomPassword = payload.roomPassword ?? payload.room_password ?? ''
      const roomStatus = payload.roomStatus ?? payload.room_status ?? 'Draft'
      const roomLastUpdated = payload.roomLastUpdated ?? payload.room_last_updated ?? null
      const roomPublishedBy = payload.roomPublishedBy ?? payload.room_published_by ?? null

      return {
        success: true,
        roomId,
        roomPassword,
        roomStatus,
        roomLastUpdated,
        roomPublishedBy,
        room_id: roomId,
        room_password: roomPassword,
        room_status: roomStatus,
        room_last_updated: roomLastUpdated,
        room_published_by: roomPublishedBy,
      }
    } catch (err) {
      console.warn('[getRoomCredentials exception]:', err)
      return { success: false, error_code: 'EXCEPTION', message: err.message || 'An error occurred while retrieving room credentials.' }
    }
  }, [])

  const getUserRegistration = useCallback(async (tournamentId, userIdOverride = null) => {
    if (!isSupabaseConfigured || !tournamentId) return null
    try {
      let targetUserId = userIdOverride
      if (!targetUserId) {
        const { data: sessionData } = await supabase.auth.getSession()
        targetUserId = sessionData?.session?.user?.id
      }
      if (!targetUserId) return null

      const { data, error } = await supabase
        .from('tournament_registrations')
        .select('id, tournament_id, team_name, captain_name, free_fire_uid, status, registered_at, user_id')
        .eq('tournament_id', String(tournamentId))
        .eq('user_id', targetUserId)
        .maybeSingle()

      if (error) {
        console.warn('[getUserRegistration Notice]:', error.message)
        return null
      }
      return data
    } catch (err) {
      console.warn('[getUserRegistration Exception]:', err)
      return null
    }
  }, [])

  const advanceTournamentLifecycle = async (tournamentId) => {
    const target = tournaments.find((t) => String(t.id) === String(tournamentId))
    if (!target) return { success: false, error: 'Tournament not found.' }

    const nextStage = getNextLifecycleStage(target.status)
    if (!nextStage) return { success: false, error: 'Tournament is already at final stage.' }

    if (!isValidLifecycleTransition(target.status, nextStage)) {
      return { success: false, error: `Invalid transition from ${target.status} to ${nextStage}.` }
    }

    return updateTournament(tournamentId, { status: nextStage })
  }

  const value = {
    tournaments,
    loading,
    fetchTournaments,
    getTournamentById,
    isUserRegistered,
    getUserRegistration,
    createTournament,
    updateTournament,
    editTournament: updateTournament,
    deleteTournament,
    updateTournamentStatus,
    advanceTournamentLifecycle,
    registerTeam,
    withdrawTeam,
    updateRegistrationStatus,
    updateTournamentScores,
    updateRoomDetails,
    getRoomCredentials,
  }

  return <TournamentContext.Provider value={value}>{children}</TournamentContext.Provider>
}

export function useTournaments() {
  const context = useContext(TournamentContext)
  if (!context) {
    throw new Error('useTournaments must be used within a TournamentProvider')
  }
  return context
}
