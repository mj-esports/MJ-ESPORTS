import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase.js'
import { useAuth } from './AuthContext'
import { INITIAL_TOURNAMENTS } from '../data/mockData'
import {
  mapTournamentFromDb,
  mapTournamentToDb,
  mapPartialTournamentToDb,
  VALID_TOURNAMENT_STATUSES,
} from '../utils/tournamentDbMapper.js'
import {
  parseTournamentDeadline,
  isValidGameUid,
  isValidPhoneNumber,
  isValidRoomId,
  isValidRoomPassword,
  sanitizeDigitsOnly,
} from '../utils/validationUtils'

export {
  mapTournamentFromDb,
  mapTournamentToDb,
  mapPartialTournamentToDb,
  VALID_TOURNAMENT_STATUSES,
}

const TournamentContext = createContext(null)


export function TournamentProvider({ children }) {
  const { isAdmin } = useAuth()
  const [tournaments, setTournaments] = useState(INITIAL_TOURNAMENTS)
  const [loading, setLoading] = useState(true)
  const [userRegistrations, setUserRegistrations] = useState([])
  const activeSubmissionsRef = useRef(new Set())

  // Initial Fetch & Real-time Sync with Exponential Backoff
  const fetchTournaments = useCallback(async (retries = 3) => {
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

    const lockKey = `create_${tournamentData.title || ''}_${tournamentData.startDate || tournamentData.start_date || ''}`
    if (activeSubmissionsRef.current.has(lockKey)) {
      throw new Error('A tournament creation request is already in progress. Please wait.')
    }
    activeSubmissionsRef.current.add(lockKey)

    try {
      const payload = mapTournamentToDb(tournamentData)
      console.log('Complete tournament payload immediately before insert():', payload)

      const result = await supabase
        .from('tournaments')
        .insert([payload])

      if (result.error) {
        console.error("Supabase Tournament Insert Error:", {
          status: result.status || result.error?.status || result.error?.statusCode,
          code: result.error?.code,
          message: result.error?.message,
          details: result.error?.details,
          hint: result.error?.hint,
          payload,
        })
        const errorMessage = result.error.message || result.error.details || 'Failed to insert tournament into database.'
        throw new Error(`Database Error (${result.error.code || result.status || '400'}): ${errorMessage}`)
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

    const result = await supabase
      .from('tournaments')
      .update(payload)
      .eq('id', id)

    if (result.error) {
      console.error("Supabase Tournament Update Error:", {
        status: result.status || result.error?.status,
        code: result.error?.code,
        message: result.error?.message,
        details: result.error?.details,
        hint: result.error?.hint,
        payload,
      })
      const errorMessage = result.error.message || result.error.details || 'Failed to update tournament in database.'
      throw new Error(`Database Error (${result.error.code || result.status || '400'}): ${errorMessage}`)
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

    const result = await supabase
      .from('tournaments')
      .delete()
      .eq('id', id)

    if (result.error) {
      console.error("Supabase Tournament Delete Error:", {
        status: result.status || result.error?.status,
        code: result.error?.code,
        message: result.error?.message,
        details: result.error?.details,
        hint: result.error?.hint,
        tournamentId: id,
      })
      const errorMessage = result.error.message || result.error.details || 'Failed to delete tournament from database.'
      throw new Error(`Database Error (${result.error.code || result.status || '400'}): ${errorMessage}`)
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

      // Pre-flight client validation for 10-digit UIDs and 10-digit Phone
      const cleanCaptainUid = sanitizeDigitsOnly(teamInfo.freeFireUid, 10)
      const cleanPhone = sanitizeDigitsOnly(teamInfo.whatsappNumber, 10)

      if (!isValidGameUid(cleanCaptainUid)) {
        throw new Error('Captain Game Character UID must be exactly 10 numeric digits (0-9).')
      }
      if (!isValidPhoneNumber(cleanPhone)) {
        throw new Error('Captain WhatsApp number must be exactly 10 numeric digits (0-9).')
      }

      const cleanTeammateUids = (teamInfo.teammates || []).map((uid) => sanitizeDigitsOnly(uid, 10))
      for (let i = 0; i < cleanTeammateUids.length; i++) {
        const tUid = cleanTeammateUids[i]
        if (tUid && !isValidGameUid(tUid)) {
          throw new Error(`Teammate ${i + 1} UID must be exactly 10 numeric digits (0-9).`)
        }
      }

      const cleanSubstituteUids = (teamInfo.substitutes || []).map((uid) => sanitizeDigitsOnly(uid, 10))
      for (let s = 0; s < cleanSubstituteUids.length; s++) {
        const subUid = cleanSubstituteUids[s]
        if (subUid && !isValidGameUid(subUid)) {
          throw new Error(`Substitute ${s + 1} UID must be exactly 10 numeric digits (0-9).`)
        }
      }

      const targetTournament = tournaments.find((t) => String(t.id) === String(tournamentId))
      const entryFeeStr = String(targetTournament?.entryFee || targetTournament?.entry_fee || 'Free').trim()
      const isFree =
        entryFeeStr.toLowerCase() === 'free' ||
        entryFeeStr === '₹0' ||
        entryFeeStr === '0' ||
        !parseFloat(entryFeeStr.replace(/[^0-9.]/g, ''))

      const regStatus = isFree ? 'Approved' : (teamInfo.status || 'Pending')
      const paymentStatus = isFree ? 'Free' : (teamInfo.paymentStatus || 'Pending')
      const refId = teamInfo.refId || `REG-MJ-${Date.now().toString(36).toUpperCase()}`

      if (isSupabaseConfigured) {
        // 1. Check authenticated session
        const { data: sessionData } = await supabase.auth.getSession()
        const hasSession = Boolean(sessionData?.session?.user)
        const sessionUserId = sessionData?.session?.user?.id || null

        const rpcPayload = {
          p_tournament_id: String(tournamentId),
          p_team_name: String(teamInfo.name || '').trim(),
          p_captain_name: String(teamInfo.captain || '').trim(),
          p_email: String(teamInfo.email || '').trim(),
          p_whatsapp_number: cleanPhone,
          p_captain_uid: cleanCaptainUid,
          p_teammate_uids: cleanTeammateUids,
          p_substitute_uids: cleanSubstituteUids,
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
            case 'IDENTITY_NOT_VERIFIED':
              throw new Error(data.message || 'Free Fire Player Identity Verification is required to register. Please verify your profile first.')
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

    const cleanRoomId = roomData.roomId ? sanitizeDigitsOnly(roomData.roomId, 15) : ''
    const cleanPassword = roomData.roomPassword ? sanitizeDigitsOnly(roomData.roomPassword, 10) : ''

    if (roomData.roomId && !isValidRoomId(cleanRoomId)) {
      throw new Error('Room ID must contain numbers only (0-9).')
    }
    if (roomData.roomPassword && !isValidRoomPassword(cleanPassword)) {
      throw new Error('Room Password must contain numbers only (0-9).')
    }

    return updateTournament(tournamentId, {
      roomId: cleanRoomId,
      roomPassword: cleanPassword,
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
