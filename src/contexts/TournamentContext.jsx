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
    maxTeams: Number(row.max_teams ?? 32),
    max_teams: Number(row.max_teams ?? 32),
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
    max_teams: Number(t.max_teams ?? t.maxTeams ?? 32),
    registered_teams: Number(t.registered_teams ?? t.registeredTeams ?? 0),
    start_date: String(t.start_date || t.startDate || '').trim(),
    start_time: String(t.start_time || t.startTime || '').trim(),
    status: String(t.status || 'Registration Open').trim(),
    organizer: String(t.organizer || 'MJ ESPORTS Official').trim(),
    description: String(t.description || '').trim(),
    rules: rulesArray,
    teams_list: teamsListVal,
  }

  if (t.created_at || t.createdAt) {
    payload.created_at = t.created_at || t.createdAt
  }
  if (t.updated_at || t.updatedAt) {
    payload.updated_at = t.updated_at || t.updatedAt
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
          .select('id, title, game, format, prize_pool, entry_fee, max_teams, registered_teams, start_date, start_time, status, organizer, description, rules, teams_list, created_at, updated_at')
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

  const isUserRegistered = (tournamentId, identifier) => {
    if (!tournamentId || !identifier) return false
    const target = tournaments.find((t) => String(t.id) === String(tournamentId))
    if (!target) return false

    return (
      target.teamsList?.some(
        (item) =>
          (item.email && identifier && item.email.toLowerCase() === identifier.toLowerCase()) ||
          (item.userId && identifier && item.userId === identifier) ||
          (item.captain && identifier && item.captain.toLowerCase() === identifier.toLowerCase())
      ) || false
    )
  }

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

      const { data, error } = await supabase
        .from('tournaments')
        .insert([payload])
        .select()

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

      const insertedRow = data && data[0] ? data[0] : payload
      const newTournament = mapTournamentFromDb(insertedRow)
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

    const existing = tournaments.find((t) => String(t.id) === String(id))
    const merged = existing ? { ...existing, ...updatedFields, id } : { ...updatedFields, id }
    const payload = mapTournamentToDb(merged)
    console.log('Complete tournament payload immediately before update():', payload)

    const { data, error } = await supabase
      .from('tournaments')
      .update(payload)
      .eq('id', id)
      .select()

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

    const updatedRow = data && data[0] ? data[0] : payload
    const updatedTournament = mapTournamentFromDb(updatedRow)
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
        const startDate = new Date(target.startDate)
        if (!isNaN(startDate.getTime()) && startDate < new Date()) {
          throw new Error('The registration deadline for this tournament has passed.')
        }
      }

      if ((target.registeredTeams || 0) >= (target.maxTeams || 32)) {
        throw new Error('Tournament slots are full!')
      }

      const isDuplicate = target.teamsList?.some(
        (item) =>
          (item.email && teamInfo.email && item.email.toLowerCase() === teamInfo.email.toLowerCase()) ||
          (item.freeFireUid && teamInfo.freeFireUid && item.freeFireUid === teamInfo.freeFireUid) ||
          (item.userId && teamInfo.userId && item.userId === teamInfo.userId) ||
          (teamInfo.teammates && item.teammates?.some((tUid) => teamInfo.teammates.includes(tUid)))
      )

      if (isDuplicate) {
        throw new Error('You, your squad, or one of your teammate Game UIDs has already registered for this tournament!')
      }

      const regStatus = teamInfo.status || 'Approved'
      const refId = teamInfo.refId || `REG-MJ-${Date.now().toString(36).toUpperCase()}`

      if (isSupabaseConfigured) {
        const { data: existingRegs } = await supabase
          .from('tournament_registrations')
          .select('id')
          .eq('tournament_id', tournamentId)
          .or(`email.eq.${teamInfo.email},free_fire_uid.eq.${teamInfo.freeFireUid}${teamInfo.userId ? `,user_id.eq.${teamInfo.userId}` : ''}`)

        if (existingRegs && existingRegs.length > 0) {
          throw new Error('You or your team has already registered for this tournament!')
        }

        await supabase.from('tournament_registrations').insert([
          {
            tournament_id: tournamentId,
            team_name: teamInfo.name,
            captain_name: teamInfo.captain,
            free_fire_uid: teamInfo.freeFireUid,
            whatsapp_number: teamInfo.whatsappNumber,
            email: teamInfo.email,
            user_id: teamInfo.userId || null,
            status: regStatus,
            registered_at: new Date().toISOString(),
          },
        ])
      }

      const updatedTeamRecord = {
        ...teamInfo,
        id: refId,
        refId,
        status: regStatus,
        teammates: teamInfo.teammates || [],
        rank: (target.teamsList?.length || 0) + 1,
        registeredAt: new Date().toISOString(),
      }

      const newTeamsList = [...(target.teamsList || []), updatedTeamRecord]
      const newRegisteredCount = (target.registeredTeams || 0) + 1

      await updateTournament(tournamentId, {
        registeredTeams: newRegisteredCount,
        teamsList: newTeamsList,
      })

      return updatedTeamRecord
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

  const updateRoomDetails = async () => {
    return Promise.resolve()
  }

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
