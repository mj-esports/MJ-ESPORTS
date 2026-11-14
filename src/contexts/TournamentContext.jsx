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
import { notifyWalletBalanceUpdated, fetchUserWallet } from '../services/walletService'
import { cancelTournamentWithRefund } from '../services/tournamentPaymentService'

export {
  mapTournamentFromDb,
  mapTournamentToDb,
  mapPartialTournamentToDb,
  VALID_TOURNAMENT_STATUSES,
}

const TournamentContext = createContext(null)

// Lightweight summary columns for tournament listings and cards (omits heavy description, rules, and teams_list)
const TOURNAMENT_SUMMARY_COLUMNS =
  'id, title, game, format, prize_pool, entry_fee, max_teams, registered_teams, start_date, start_time, status, organizer, room_status, room_last_updated, room_published_by, winner_team, winner_captain, created_at, updated_at'

const CACHE_TTL_MS = 60 * 1000 // 60-second in-memory freshness window

export function TournamentProvider({ children }) {
  const { user, isAdmin } = useAuth()
  const [tournaments, setTournaments] = useState(INITIAL_TOURNAMENTS)
  const [loading, setLoading] = useState(true)
  const [userRegisteredIds, setUserRegisteredIds] = useState(new Set())
  const activeSubmissionsRef = useRef(new Set())

  // In-memory cache & request deduplication references
  const cacheRef = useRef({
    list: null,
    listTimestamp: 0,
    details: new Map(), // tournamentId -> { data, timestamp }
    userRegistrations: new Map(), // `${tournamentId}_${userId}` -> { data, timestamp }
  })
  const inFlightListPromiseRef = useRef(null)
  const inFlightDetailPromisesRef = useRef(new Map())

  // Initial & On-Demand Lightweight Listing Fetch with Deduplication and In-Memory Caching
  const fetchTournaments = useCallback(async (options = {}) => {
    const force = typeof options === 'boolean' ? options : Boolean(options?.force)
    const retries = typeof options?.retries === 'number' ? options.retries : 3

    if (!isSupabaseConfigured) {
      setTournaments(INITIAL_TOURNAMENTS)
      setLoading(false)
      return INITIAL_TOURNAMENTS
    }

    // 1. Fast Path: In-memory cache hit if not expired and not forced
    const now = Date.now()
    if (!force && cacheRef.current.list && now - cacheRef.current.listTimestamp < CACHE_TTL_MS) {
      setTournaments(cacheRef.current.list)
      setLoading(false)
      return cacheRef.current.list
    }

    // 2. In-flight request deduplication: reuse active promise
    if (inFlightListPromiseRef.current) {
      return inFlightListPromiseRef.current
    }

    const fetchPromise = (async () => {
      let attempt = 0
      while (attempt <= retries) {
        try {
          const { data, error } = await supabase
            .from('tournaments')
            .select(TOURNAMENT_SUMMARY_COLUMNS)
            .order('created_at', { ascending: false })

          if (error) {
            console.error(`[fetchTournaments] Attempt ${attempt + 1} error:`, error)
            if (attempt < retries) {
              await new Promise((res) => setTimeout(res, 1000 * (attempt + 1)))
              attempt++
              continue
            } else {
              setTournaments((prev) => (prev.length > 0 ? prev : INITIAL_TOURNAMENTS))
              return INITIAL_TOURNAMENTS
            }
          } else if (data && data.length > 0) {
            const mappedList = data.map(mapTournamentFromDb)
            // Seamlessly preserve any already-cached full details (description, rules, teamsList)
            const mergedList = mappedList.map((item) => {
              const cachedDetail = cacheRef.current.details.get(String(item.id))
              if (cachedDetail?.data) {
                return { ...item, ...cachedDetail.data }
              }
              return item
            })

            cacheRef.current.list = mergedList
            cacheRef.current.listTimestamp = Date.now()
            setTournaments(mergedList)
            return mergedList
          } else {
            cacheRef.current.list = INITIAL_TOURNAMENTS
            cacheRef.current.listTimestamp = Date.now()
            setTournaments(INITIAL_TOURNAMENTS)
            return INITIAL_TOURNAMENTS
          }
        } catch (err) {
          console.error(`[fetchTournaments] Attempt ${attempt + 1} exception:`, err)
          if (attempt < retries) {
            await new Promise((res) => setTimeout(res, 1000 * (attempt + 1)))
            attempt++
            continue
          } else {
            setTournaments((prev) => (prev.length > 0 ? prev : INITIAL_TOURNAMENTS))
            return INITIAL_TOURNAMENTS
          }
        } finally {
          setLoading(false)
        }
        attempt++
      }
    })().finally(() => {
      inFlightListPromiseRef.current = null
    })

    inFlightListPromiseRef.current = fetchPromise
    return fetchPromise
  }, [])

  // On-Demand Full Tournament Detail Query (Fetches description, rules, teams_list for selected ID)
  const fetchTournamentById = useCallback(
    async (tournamentId, options = {}) => {
      const force = typeof options === 'boolean' ? options : Boolean(options?.force)
      if (!tournamentId) return null

      const idStr = String(tournamentId)
      const now = Date.now()

      // 1. In-memory detail cache hit check
      const cachedEntry = cacheRef.current.details.get(idStr)
      const existingInState = tournaments.find((t) => String(t.id) === idStr)

      const isFullyLoaded =
        existingInState &&
        existingInState.description !== undefined &&
        existingInState.rules !== undefined &&
        Array.isArray(existingInState.rules) &&
        existingInState.rules.length > 0

      if (!force && cachedEntry?.data && now - cachedEntry.timestamp < CACHE_TTL_MS) {
        return cachedEntry.data
      }

      if (!force && isFullyLoaded) {
        cacheRef.current.details.set(idStr, { data: existingInState, timestamp: now })
        return existingInState
      }

      if (!isSupabaseConfigured) {
        return existingInState || null
      }

      // 2. In-flight detail request deduplication per tournament id
      if (inFlightDetailPromisesRef.current.has(idStr)) {
        return inFlightDetailPromisesRef.current.get(idStr)
      }

      const detailPromise = (async () => {
        try {
          const { data, error } = await supabase
            .from('tournaments')
            .select('*')
            .eq('id', idStr)
            .maybeSingle()

          if (error) {
            console.warn(`[fetchTournamentById] Error fetching tournament ${idStr}:`, error.message)
            return existingInState || null
          }

          if (data) {
            const mapped = mapTournamentFromDb(data)
            cacheRef.current.details.set(idStr, { data: mapped, timestamp: Date.now() })

            // Update in-memory state and listing cache
            setTournaments((prev) => {
              const idx = prev.findIndex((t) => String(t.id) === idStr)
              if (idx >= 0) {
                const updated = [...prev]
                updated[idx] = { ...updated[idx], ...mapped }
                return updated
              }
              return [mapped, ...prev]
            })

            return mapped
          }

          return existingInState || null
        } catch (err) {
          console.warn(`[fetchTournamentById] Exception fetching tournament ${idStr}:`, err)
          return existingInState || null
        } finally {
          inFlightDetailPromisesRef.current.delete(idStr)
        }
      })()

      inFlightDetailPromisesRef.current.set(idStr, detailPromise)
      return detailPromise
    },
    [tournaments]
  )

  // Real-time synchronization: Target specific row changes without refetching the entire table
  useEffect(() => {
    fetchTournaments()

    if (isSupabaseConfigured) {
      const channel = supabase
        .channel('realtime_tournaments_changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'tournaments' },
          (payload) => {
            const { eventType, new: newRow, old: oldRow } = payload

            if (eventType === 'UPDATE' && newRow?.id) {
              const mapped = mapTournamentFromDb(newRow)
              const idStr = String(newRow.id)

              // 1. Update detail cache if cached
              const cached = cacheRef.current.details.get(idStr)
              if (cached?.data) {
                cacheRef.current.details.set(idStr, {
                  data: { ...cached.data, ...mapped },
                  timestamp: Date.now(),
                })
              }

              // 2. Synchronize listing cache directly to prevent stale overwrite on subsequent navigation
              if (cacheRef.current.list && Array.isArray(cacheRef.current.list)) {
                cacheRef.current.list = cacheRef.current.list.map((t) =>
                  String(t.id) === idStr ? { ...t, ...mapped } : t
                )
              }

              // 3. Update React state directly (0 ms latency, zero full table queries)
              setTournaments((prev) =>
                prev.map((t) => (String(t.id) === idStr ? { ...t, ...mapped } : t))
              )
            } else if (eventType === 'INSERT' && newRow?.id) {
              const mapped = mapTournamentFromDb(newRow)
              cacheRef.current.list = null // Invalidate list cache so next view gets fresh order
              setTournaments((prev) => [mapped, ...prev.filter((t) => String(t.id) !== String(newRow.id))])
            } else if (eventType === 'DELETE' && oldRow?.id) {
              const idStr = String(oldRow.id)
              cacheRef.current.details.delete(idStr)
              cacheRef.current.list = null
              setTournaments((prev) => prev.filter((t) => String(t.id) !== idStr))
            } else {
              // Safety fallback: if event payload is missing or unhandled, trigger lightweight refresh
              fetchTournaments({ force: true })
            }
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [fetchTournaments])

  // Dedicated lightweight user registration check: O(1) in-memory registration verification & isolation
  useEffect(() => {
    // Clear user registration cache and reset IDs when user changes or logs out
    cacheRef.current.userRegistrations.clear()

    if (!isSupabaseConfigured || !user?.id) {
      setUserRegisteredIds(new Set())
      return
    }

    let isMounted = true
    supabase
      .from('tournament_registrations')
      .select('tournament_id')
      .eq('user_id', user.id)
      .then(({ data, error }) => {
        if (!isMounted) return
        if (error) {
          console.warn('[User Registrations Fetch Notice]:', error.message)
          return
        }
        if (data && Array.isArray(data)) {
          const idSet = new Set(data.map((r) => String(r.tournament_id)))
          setUserRegisteredIds(idSet)
        }
      })
      .catch((err) => console.warn('[User Registrations Fetch Exception]:', err))

    return () => {
      isMounted = false
    }
  }, [user?.id])

  const getTournamentById = (id) => {
    return tournaments.find((t) => String(t.id) === String(id))
  }

  const isUserRegistered = useCallback(
    (tournamentId, identifierOrUser) => {
      if (!tournamentId) return false
      const idStr = String(tournamentId)

      // Fast-path: O(1) check against active user's registered tournaments set
      if (userRegisteredIds.has(idStr)) {
        return true
      }

      // Secondary check against tournament teamsList if available in memory
      const target = tournaments.find((t) => String(t.id) === idStr)
      if (!target) return false

      const userId =
        typeof identifierOrUser === 'object'
          ? identifierOrUser?.id
          : typeof identifierOrUser === 'string' && identifierOrUser.length === 36
          ? identifierOrUser
          : null
      const userEmail =
        typeof identifierOrUser === 'object'
          ? identifierOrUser?.email
          : typeof identifierOrUser === 'string' && identifierOrUser.includes('@')
          ? identifierOrUser
          : null
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
    },
    [tournaments, userRegisteredIds]
  )

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
          p_payment_id: teamInfo.paymentId || null,
          p_razorpay_payment_id: teamInfo.razorpayPaymentId || null,
          p_teammate_igns: teamInfo.teammateIgns || [],
          p_substitute_igns: teamInfo.substituteIgns || [],
        }

        // Authoritative Path: Call Atomic Supabase PostgreSQL RPC
        const { data, error } = await supabase.rpc('register_tournament_team', rpcPayload)

        if (error) {
          console.error('[RPC register_tournament_team error]:', error)
          throw new Error(error.message || 'Database error processing tournament registration.')
        }

        if (data && data.success === false) {
          console.warn('[Registration Notice]: RPC returned unsuccessful response ->', data.error_code, data.message)
          // Map structured RPC error codes to clear, user-friendly UI messages
          switch (data.error_code) {
            case 'PAYMENT_REQUIRED':
              throw new Error(data.message || 'Payment is required to register for this tournament.')
            case 'INVALID_PAYMENT':
              throw new Error(data.message || 'Payment verification failed. Please try again.')
            case 'PAYMENT_ALREADY_USED':
              throw new Error('This payment has already been used for another tournament registration.')
            case 'PAYMENT_AMOUNT_MISMATCH':
              throw new Error(data.message || 'Payment amount does not match the tournament entry fee.')
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

        // Invalidate in-memory caches and register locally
        cacheRef.current.list = null
        cacheRef.current.details.delete(String(tournamentId))
        cacheRef.current.userRegistrations.clear()
        setUserRegisteredIds((prev) => new Set([...prev, String(tournamentId)]))

        await fetchTournaments({ force: true })
        return data.teamRecord || { ...teamInfo, id: refId, refId, status: regStatus }
      }

      throw new Error('Supabase client is not configured.')
    } finally {
      activeSubmissionsRef.current.delete(lockKey)
    }
  }

  const registerTeamWithWallet = async (tournamentId, teamInfo, idempotencyKey) => {
    const lockKey = `wallet_reg_${tournamentId}_${idempotencyKey || teamInfo?.freeFireUid || ''}`
    if (activeSubmissionsRef.current.has(lockKey)) {
      throw new Error('Registration is currently processing. Please wait.')
    }
    activeSubmissionsRef.current.add(lockKey)

    try {
      if (!isSupabaseConfigured) {
        throw new Error('Supabase client is not configured.')
      }

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

      const refId = teamInfo.refId || `REG-MJ-${Date.now().toString(36).toUpperCase()}`

      const rpcPayload = {
        p_tournament_id: String(tournamentId),
        p_team_name: String(teamInfo.name || '').trim(),
        p_captain_name: String(teamInfo.captain || '').trim(),
        p_email: String(teamInfo.email || '').trim(),
        p_whatsapp_number: cleanPhone,
        p_captain_uid: cleanCaptainUid,
        p_idempotency_key: idempotencyKey,
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

      const { data, error } = await supabase.rpc('register_tournament_team_with_wallet', rpcPayload)

      if (error) {
        console.error('[RPC register_tournament_team_with_wallet error]:', error)
        throw new Error(error.message || 'Database error processing wallet tournament registration.')
      }

      if (data && data.success === false) {
        console.warn('[Registration Notice]: RPC returned unsuccessful response ->', data.error_code, data.message)
        switch (data.error_code) {
          case 'INSUFFICIENT_FUNDS':
            throw new Error(data.message || 'Insufficient wallet balance for this tournament entry fee.')
          case 'NOT_A_PAID_TOURNAMENT':
            throw new Error(data.message || 'This tournament is free. Use standard free registration.')
          case 'INVALID_IDEMPOTENCY_KEY':
            throw new Error(data.message || 'Invalid registration attempt key. Please retry.')
          case 'IDEMPOTENCY_KEY_COLLISION':
            throw new Error(data.message || 'Registration transaction collision detected.')
          case 'IDEMPOTENCY_KEY_REUSED':
            throw new Error(data.message || 'This idempotency key has already been used for a different tournament transaction.')
          case 'DUPLICATE_GAME_UID':
            throw new Error(data.message || 'One of the Game UIDs is already registered in this tournament.')
          case 'DUPLICATE_UID_IN_ROSTER':
            throw new Error(data.message || 'Duplicate Game UID detected within your roster.')
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
            throw new Error(data.message || 'Wallet registration failed.')
        }
      }

      if (data?.balance_after !== undefined) {
        notifyWalletBalanceUpdated(Number(data.balance_after))
      }
      // Invalidate in-memory caches and register locally
      cacheRef.current.list = null
      cacheRef.current.details.delete(String(tournamentId))
      cacheRef.current.userRegistrations.clear()
      setUserRegisteredIds((prev) => new Set([...prev, String(tournamentId)]))

      await fetchTournaments({ force: true })
      return data
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

  const cancelTournament = async (tournamentId, reason = 'Tournament Cancelled by Organizer') => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured.')
    }

    const res = await cancelTournamentWithRefund(tournamentId, reason)

    // Refresh authoritative user wallet if active user received a refund
    try {
      await fetchUserWallet()
    } catch (err) {
      console.warn('[TournamentContext] User wallet refresh notice:', err)
    }

    // Refresh tournaments state
    await fetchTournaments()
    return res
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

    const roomStatus = roomData.roomStatus || 'Published'
    const roomReleaseTime = roomData.roomReleaseTime ?? roomData.room_release_time ?? null

    if (!isSupabaseConfigured) {
      // Mock / Dev fallback when Supabase is not configured
      const updated = {
        roomId: cleanRoomId,
        roomPassword: cleanPassword,
        roomStatus,
        roomReleaseTime,
        room_release_time: roomReleaseTime,
        roomLastUpdated: new Date().toISOString(),
        roomPublishedBy: roomData.roomPublishedBy || 'Admin',
      }
      setTournaments((prev) =>
        prev.map((t) => (String(t.id) === String(tournamentId) ? { ...t, ...updated } : t))
      )
      return { success: true, message: 'Room credentials updated (dev mode).' }
    }

    const rpcPayload = {
      p_tournament_id: String(tournamentId),
      p_room_id: cleanRoomId || null,
      p_room_password: cleanPassword || null,
      p_room_status: roomStatus,
      p_room_release_time: roomReleaseTime,
    }

    const { data, error } = await supabase.rpc('set_tournament_room_credentials', rpcPayload)

    if (error) {
      console.error('[set_tournament_room_credentials RPC Error]:', error)
      const errorMsg = error.message || 'Failed to update room credentials via server RPC.'
      throw new Error(errorMsg)
    }

    const payload = Array.isArray(data) ? data[0] : data
    if (payload && payload.success === false) {
      const err = new Error(payload.message || 'Room credential update was rejected by server.')
      err.code = payload.error_code || 'RPC_REJECTED'
      throw err
    }

    // Update in-memory tournaments state for immediate UI reactivity
    setTournaments((prev) =>
      prev.map((t) => {
        if (String(t.id) !== String(tournamentId)) return t
        return {
          ...t,
          roomId: cleanRoomId,
          roomPassword: cleanPassword,
          roomStatus,
          roomReleaseTime,
          room_release_time: roomReleaseTime,
          roomLastUpdated: new Date().toISOString(),
          roomPublishedBy: roomData.roomPublishedBy || t.roomPublishedBy || 'Admin',
        }
      })
    )

    return payload || { success: true, message: 'Room credentials updated successfully.' }
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
          error_code: payload.error_code || 'DENIED',
          releaseTime: payload.release_time || null,
          release_time: payload.release_time || null,
          serverTime: payload.server_time || null,
          message: payload.message || 'Access to room credentials was denied.',
        }
      }

      // Map snake_case database response keys to camelCase & preserve snake_case aliases for full compatibility
      const roomId = payload.roomId ?? payload.room_id ?? ''
      const roomPassword = payload.roomPassword ?? payload.room_password ?? ''
      const roomStatus = payload.roomStatus ?? payload.room_status ?? 'Draft'
      const roomReleaseTime = payload.roomReleaseTime ?? payload.room_release_time ?? payload.release_time ?? null
      const roomLastUpdated = payload.roomLastUpdated ?? payload.room_last_updated ?? null
      const roomPublishedBy = payload.roomPublishedBy ?? payload.room_published_by ?? null
      const isAdminOverride = Boolean(payload.is_admin_override || payload.isAdminOverride)

      return {
        success: true,
        roomId,
        roomPassword,
        roomStatus,
        roomReleaseTime,
        roomLastUpdated,
        roomPublishedBy,
        isAdminOverride,
        room_id: roomId,
        room_password: roomPassword,
        room_status: roomStatus,
        room_release_time: roomReleaseTime,
        room_last_updated: roomLastUpdated,
        room_published_by: roomPublishedBy,
        is_admin_override: isAdminOverride,
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

      const cacheKey = `${tournamentId}_${targetUserId}`
      const cached = cacheRef.current.userRegistrations.get(cacheKey)
      const now = Date.now()
      if (cached && now - cached.timestamp < 30000) {
        return cached.data
      }

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

      if (data) {
        cacheRef.current.userRegistrations.set(cacheKey, { data, timestamp: now })
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
    fetchTournamentById,
    isUserRegistered,
    getUserRegistration,
    createTournament,
    updateTournament,
    editTournament: updateTournament,
    deleteTournament,
    updateTournamentStatus,
    advanceTournamentLifecycle,
    registerTeam,
    registerTeamWithWallet,
    withdrawTeam,
    cancelTournament,
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
