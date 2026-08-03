import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase.js'
import { useAuth } from './AuthContext'

const TournamentContext = createContext(null)

function dedupeTournaments(list) {
  if (!Array.isArray(list)) return []
  const seen = new Set()
  return list.filter((t) => {
    if (!t || !t.id) return false
    if (seen.has(t.id)) return false
    seen.add(t.id)
    return true
  })
}

function mapTournamentFromDb(row) {
  if (!row) return null
  const fmt = row.match_format || row.matchFormat || row.format || 'Squad Battle Royale'
  const mode = String(row.mode || (fmt.toLowerCase().includes('solo') ? 'solo' : fmt.toLowerCase().includes('duo') ? 'duo' : 'squad')).toLowerCase()
  const teamSize = Number(row.team_size ?? row.teamSize ?? (mode === 'solo' ? 1 : mode === 'duo' ? 2 : 4))

  return {
    id: row.id,
    title: row.title,
    game: row.game,
    mode: mode,
    teamSize: teamSize,
    team_size: teamSize,
    format: fmt,
    match_format: fmt,
    matchFormat: fmt,
    prizePool: row.prize_pool || row.prizePool || '₹0',
    entryFee: row.entry_fee || row.entryFee || 'Free',
    maxTeams: Number(row.max_teams ?? row.maxTeams ?? 32),
    registeredTeams: Number(row.registered_teams ?? row.registeredTeams ?? 0),
    startDate: row.start_date || row.startDate || '',
    startTime: row.start_time || row.startTime || '',
    status: row.status || 'Registration Open',
    organizer: row.organizer || 'MJ ESPORTS Official',
    description: row.description || '',
    rules: Array.isArray(row.rules) ? row.rules : [],
    teamsList: Array.isArray(row.teams_list) ? row.teams_list : (Array.isArray(row.teamsList) ? row.teamsList : []),
    roomId: row.room_id || row.roomId || '',
    roomPassword: row.room_password || row.roomPassword || '',
    roomStatus: row.room_status || row.roomStatus || 'Draft',
    roomLastUpdated: row.room_last_updated || row.roomLastUpdated || null,
    roomPublishedBy: row.room_published_by || row.roomPublishedBy || null,
    createdAt: row.created_at || row.createdAt,
    updatedAt: row.updated_at || row.updatedAt,
  }
}

function mapTournamentToDb(t) {
  const fmt = t.match_format || t.matchFormat || t.format || 'Squad Battle Royale'

  return {
    id: String(t.id),
    title: String(t.title || '').trim(),
    game: String(t.game || 'Free Fire').trim(),
    format: String(fmt).trim(),
    prize_pool: String(t.prizePool || t.prize_pool || '₹0').trim(),
    entry_fee: String(t.entryFee || t.entry_fee || 'Free').trim(),
    max_teams: Number(t.maxTeams ?? t.max_teams ?? 32),
    registered_teams: Number(t.registeredTeams ?? t.registered_teams ?? 0),
    start_date: String(t.startDate || t.start_date || '').trim(),
    start_time: String(t.startTime || t.start_time || '').trim(),
    status: String(t.status || 'Registration Open').trim(),
    organizer: String(t.organizer || 'MJ ESPORTS Official').trim(),
    description: String(t.description || '').trim(),
    rules: Array.isArray(t.rules) ? t.rules : [],
    teams_list: Array.isArray(t.teamsList) ? t.teamsList : (Array.isArray(t.teams_list) ? t.teams_list : []),
  }
}

export function TournamentProvider({ children }) {
  const { isAdmin } = useAuth()
  const [tournaments, setTournaments] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchTournaments = useCallback(async (params = {}) => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }

    const { game, status, search } = params
    const cleanGame = game && game !== 'All Games' && game !== 'ALL' ? game : undefined
    const cleanStatus = status && status !== 'All Statuses' && status !== 'ALL' ? status : undefined
    const cleanSearch = search || undefined

    try {
      const tableName = 'tournaments'
      const query = 'SELECT * FROM tournaments ORDER BY created_at DESC'
      const payload = params

      const { data, error, status, statusText } = await supabase
        .from('tournaments')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.log("TABLE:", tableName)
        console.log("QUERY:", query)
        console.log("PAYLOAD:", payload)
        console.log("ERROR:", JSON.stringify(error, null, 2))
        console.log("error.message:", error?.message)
        console.log("error.details:", error?.details)
        console.log("error.hint:", error?.hint)
        console.log("error.code:", error?.code)
        console.log("status:", status || error?.status)
        console.log("statusText:", statusText || error?.statusText)
      } else if (data) {
        setTournaments(dedupeTournaments(data.map(mapTournamentFromDb)))
      }
    } catch (err) {
      console.log("TABLE:", 'tournaments')
      console.log("QUERY:", 'SELECT * FROM tournaments')
      console.log("PAYLOAD:", params)
      console.log("ERROR:", JSON.stringify(err, null, 2))
      console.log("error.message:", err?.message)
      console.log("error.details:", err?.details)
      console.log("error.hint:", err?.hint)
      console.log("error.code:", err?.code)
      console.log("status:", err?.status)
      console.log("statusText:", err?.statusText)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTournaments()
  }, [fetchTournaments])

  const verifyAdminAuth = () => {
    if (!isAdmin) {
      throw new Error('Unauthorized Operation: Administrative privileges are required.')
    }
  }

  const getTournamentById = (id) => {
    return tournaments.find((t) => t.id === id)
  }

  const isUserRegistered = (tournamentId, identifier) => {
    if (!tournamentId || !identifier) return false
    const target = tournaments.find((t) => t.id === tournamentId)
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

  const createTournament = async (newTournament) => {
    verifyAdminAuth()
    const createdId = newTournament.id || ('t-' + Date.now())
    const created = {
      ...newTournament,
      id: createdId,
      registeredTeams: Number(newTournament.registeredTeams || 0),
      maxTeams: Number(newTournament.maxTeams || 32),
      status: newTournament.status || 'Registration Open',
      teamsList: newTournament.teamsList || [],
      rules: newTournament.rules || [],
    }

    if (isSupabaseConfigured) {
      // 1. Verify authenticated Supabase user session
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !user) {
        console.error('[Create Tournament Auth Error]: User is not authenticated.', authError)
        throw new Error('Authentication Error: Active Supabase user session required to create tournaments.')
      }

      // 2. Check admin privilege in public.user_roles (with UUID safety check)
      const isValidUuid = (str) =>
        typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str)

      let roleData = null
      let roleError = null

      if (isValidUuid(user.id)) {
        const res = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle()
        roleData = res.data
        roleError = res.error
      }

      const isOwner = user.email && user.email.toLowerCase().trim() === 'mjesports.team@gmail.com'
      const adminCheckResult = isOwner || (!roleError && roleData?.role === 'admin')
      const tableName = 'tournaments'
      const query = 'INSERT INTO tournaments VALUES (...)'
      const payload = dbRow

      console.log("TABLE:", tableName)
      console.log("QUERY:", query)
      console.log("PAYLOAD:", payload)

      try {
        const res = await supabase
          .from('tournaments')
          .insert([dbRow])
          .select('*')

        const error = res.error
        const status = res.status
        const statusText = res.statusText

        if (error) {
          console.log("TABLE:", tableName)
          console.log("QUERY:", query)
          console.log("PAYLOAD:", payload)
          console.log("ERROR:", JSON.stringify(error, null, 2))
          console.log("error.message:", error?.message)
          console.log("error.details:", error?.details)
          console.log("error.hint:", error?.hint)
          console.log("error.code:", error?.code)
          console.log("status:", status || error?.status)
          console.log("statusText:", statusText || error?.statusText)
          return
        }
      } catch (catchedErr) {
        console.log("TABLE:", tableName)
        console.log("QUERY:", query)
        console.log("PAYLOAD:", payload)
        console.log("ERROR:", JSON.stringify(catchedErr, null, 2))
        console.log("error.message:", catchedErr?.message)
        console.log("error.details:", catchedErr?.details)
        console.log("error.hint:", catchedErr?.hint)
        console.log("error.code:", catchedErr?.code)
        console.log("status:", catchedErr?.status)
        console.log("statusText:", catchedErr?.statusText)
        return
      }
    }

    setTournaments((prev) => dedupeTournaments([created, ...prev]))
    return created
  }

  const editTournament = async (tournamentId, updatedFields) => {
    verifyAdminAuth()
    let updatedTournament = null

    setTournaments((prev) =>
      prev.map((t) => {
        if (t.id === tournamentId) {
          updatedTournament = { ...t, ...updatedFields }
          return updatedTournament
        }
        return t
      })
    )

    if (isSupabaseConfigured && updatedTournament) {
      const dbRow = mapTournamentToDb(updatedTournament)
      const { error } = await supabase.from('tournaments').update(dbRow).eq('id', tournamentId)
      if (error) {
        console.warn('[Supabase Edit Tournament Retry Check]:', error.message)
        const fallbackRow = { ...dbRow }
        delete fallbackRow.mode
        delete fallbackRow.team_size
        delete fallbackRow.match_format
        const { error: retryErr } = await supabase.from('tournaments').update(fallbackRow).eq('id', tournamentId)
        if (retryErr) {
          console.error('[Supabase Edit Tournament Error]:', retryErr)
          throw new Error(retryErr.message || 'Failed to update tournament in database.')
        }
      }
    }
  }

  const deleteTournament = async (tournamentId) => {
    verifyAdminAuth()
    setTournaments((prev) => prev.filter((t) => t.id !== tournamentId))

    if (isSupabaseConfigured) {
      const { error } = await supabase.from('tournaments').delete().eq('id', tournamentId)
      if (error) {
        console.error('[Supabase Delete Tournament Error]:', error)
        throw new Error(error.message || 'Failed to delete tournament from database.')
      }
    }
  }

  const updateTournamentStatus = async (tournamentId, newStatus) => {
    verifyAdminAuth()
    setTournaments((prev) =>
      prev.map((t) => {
        if (t.id === tournamentId) {
          return { ...t, status: newStatus }
        }
        return t
      })
    )

    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('tournaments')
        .update({ status: newStatus })
        .eq('id', tournamentId)
      if (error) {
        console.error('[Supabase Update Status Error]:', error)
        throw new Error(error.message || 'Failed to update tournament status in database.')
      }
    }
  }

  const registerTeam = async (tournamentId, teamInfo) => {
    const target = tournaments.find((t) => t.id === tournamentId)
    if (!target) {
      throw new Error('Tournament not found!')
    }

    // 1. Pre-registration status validation
    if (target.status !== 'Registration Open') {
      throw new Error('Registration for this tournament is currently closed.')
    }

    // 2. Pre-registration deadline validation
    if (target.startDate) {
      const startDate = new Date(target.startDate)
      if (!isNaN(startDate.getTime()) && startDate < new Date()) {
        throw new Error('The registration deadline for this tournament has passed.')
      }
    }

    // 3. Available slots validation
    if ((target.registeredTeams || 0) >= (target.maxTeams || 32)) {
      throw new Error('Tournament slots are full!')
    }

    // 4. Client-side duplicate check
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

    // 5. Insert into public.tournament_registrations (Primary Source of Truth)
    if (isSupabaseConfigured) {
      const { data: existingRegs } = await supabase
        .from('tournament_registrations')
        .select('id')
        .eq('tournament_id', tournamentId)
        .or(`email.eq.${teamInfo.email},free_fire_uid.eq.${teamInfo.freeFireUid}${teamInfo.userId ? `,user_id.eq.${teamInfo.userId}` : ''}`)

      if (existingRegs && existingRegs.length > 0) {
        throw new Error('You or your team has already registered for this tournament!')
      }

      const { error: regError } = await supabase.from('tournament_registrations').insert([
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

      if (regError) {
        console.error('[Supabase Registration Insert Error]:', regError)
        throw new Error(regError.message || 'Failed to register team in database.')
      }
    }

    const updatedTeamRecord = {
      ...teamInfo,
      id: refId,
      refId,
      status: regStatus,
      mode: teamInfo.mode || 'Squad',
      teammates: teamInfo.teammates || [],
      rank: (target.teamsList?.length || 0) + 1,
      registeredAt: new Date().toISOString(),
    }

    const newTeamsList = [...(target.teamsList || []), updatedTeamRecord]
    const newRegisteredCount = target.registeredTeams + 1

    // 6. Increment registered_teams count on public.tournaments table
    if (isSupabaseConfigured) {
      await supabase
        .from('tournaments')
        .update({
          registered_teams: newRegisteredCount,
          teams_list: newTeamsList,
        })
        .eq('id', tournamentId)
    }

    setTournaments((prev) =>
      prev.map((t) => {
        if (t.id === tournamentId) {
          return {
            ...t,
            registeredTeams: newRegisteredCount,
            teamsList: newTeamsList,
          }
        }
        return t
      })
    )

    return updatedTeamRecord
  }

  const withdrawTeam = async (tournamentId, identifier) => {
    const target = tournaments.find((t) => t.id === tournamentId)
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

    const newRegisteredCount = Math.max(0, target.registeredTeams - 1)

    if (isSupabaseConfigured) {
      await supabase
        .from('tournaments')
        .update({
          registered_teams: newRegisteredCount,
          teams_list: filteredTeams,
        })
        .eq('id', tournamentId)
    }

    setTournaments((prev) =>
      prev.map((t) => {
        if (t.id === tournamentId) {
          return {
            ...t,
            registeredTeams: newRegisteredCount,
            teamsList: filteredTeams,
          }
        }
        return t
      })
    )
  }

  const updateRegistrationStatus = async (tournamentId, registrationIdentifier, newStatus) => {
    verifyAdminAuth()
    const target = tournaments.find((t) => t.id === tournamentId)
    if (!target) return

    const updatedTeams = (target.teamsList || []).map((team) => {
      if (team.email === registrationIdentifier || team.id === registrationIdentifier || team.name === registrationIdentifier) {
        return { ...team, status: newStatus }
      }
      return team
    })

    const isRejection = newStatus === 'Rejected'
    const newRegisteredCount = isRejection ? Math.max(0, target.registeredTeams - 1) : target.registeredTeams

    if (isSupabaseConfigured) {
      await supabase
        .from('tournaments')
        .update({
          registered_teams: newRegisteredCount,
          teams_list: updatedTeams,
        })
        .eq('id', tournamentId)
    }

    setTournaments((prev) =>
      prev.map((t) => {
        if (t.id === tournamentId) {
          return {
            ...t,
            registeredTeams: newRegisteredCount,
            teamsList: updatedTeams,
          }
        }
        return t
      })
    )
  }

  const updateTournamentScores = async (tournamentId, updatedTeams) => {
    verifyAdminAuth()
    setTournaments((prev) =>
      prev.map((t) => {
        if (t.id === tournamentId) {
          return { ...t, teamsList: updatedTeams }
        }
        return t
      })
    )

    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('tournaments')
        .update({ teams_list: updatedTeams })
        .eq('id', tournamentId)
      if (error) {
        console.error('[Supabase Score Update Error]:', error)
        throw new Error(error.message || 'Failed to update tournament scores in database.')
      }
    }
  }

  const updateRoomDetails = async (tournamentId, { roomId, roomPassword, roomStatus, roomPublishedBy }) => {
    verifyAdminAuth()
    const nowIso = new Date().toISOString()
    const updatedPayload = {
      roomId,
      roomPassword,
      roomStatus: roomStatus || 'Draft',
      roomLastUpdated: nowIso,
      roomPublishedBy: roomPublishedBy || 'Admin',
    }

    setTournaments((prev) =>
      prev.map((t) => {
        if (t.id === tournamentId) {
          return { ...t, ...updatedPayload }
        }
        return t
      })
    )

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('tournaments')
          .update({
            room_id: roomId,
            room_password: roomPassword,
            room_status: roomStatus || 'Draft',
            room_last_updated: nowIso,
            room_published_by: roomPublishedBy || 'Admin',
          })
          .eq('id', tournamentId)
        if (error) {
          console.warn('[Supabase Room Details Update Warning]:', error.message)
        }
      } catch (err) {
        console.warn('[Supabase Room Details Update Catch Notice]:', err)
      }
    }
  }

  const value = {
    tournaments,
    loading,
    fetchTournaments,
    getTournamentById,
    isUserRegistered,
    createTournament,
    editTournament,
    deleteTournament,
    updateTournamentStatus,
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
