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
  return {
    id: row.id,
    title: row.title,
    game: row.game,
    format: row.format,
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
    createdAt: row.created_at || row.createdAt,
    updatedAt: row.updated_at || row.updatedAt,
  }
}

function mapTournamentToDb(t) {
  return {
    id: t.id,
    title: t.title,
    game: t.game,
    format: t.format,
    prize_pool: t.prizePool || t.prize_pool || '₹0',
    entry_fee: t.entryFee || t.entry_fee || 'Free',
    max_teams: Number(t.maxTeams ?? t.max_teams ?? 32),
    registered_teams: Number(t.registeredTeams ?? t.registered_teams ?? 0),
    start_date: t.startDate || t.start_date || '',
    start_time: t.startTime || t.start_time || '',
    status: t.status || 'Registration Open',
    organizer: t.organizer || 'MJ ESPORTS Official',
    description: t.description || '',
    rules: Array.isArray(t.rules) ? t.rules : [],
    teams_list: Array.isArray(t.teamsList) ? t.teamsList : (Array.isArray(t.teams_list) ? t.teams_list : []),
  }
}

export function TournamentProvider({ children }) {
  const { isAdmin } = useAuth()
  const [tournaments, setTournaments] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchTournaments = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.warn('[Supabase Fetch Tournaments Warning]:', error.message)
      } else if (data) {
        setTournaments(dedupeTournaments(data.map(mapTournamentFromDb)))
      }
    } catch (err) {
      console.warn('[Supabase Fetch Tournaments Error]:', err.message)
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
      const dbRow = mapTournamentToDb(created)
      const { error } = await supabase.from('tournaments').insert([dbRow])
      if (error) {
        console.error('[Supabase Create Tournament Error]:', error)
        throw new Error(error.message || 'Failed to create tournament in database.')
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
        console.error('[Supabase Edit Tournament Error]:', error)
        throw new Error(error.message || 'Failed to update tournament in database.')
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
