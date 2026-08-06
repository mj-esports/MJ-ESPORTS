import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

const TournamentContextV2 = createContext(null)

export function TournamentProviderV2({ children }) {
  const [tournaments, setTournaments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchTournaments = useCallback(async () => {
    setLoading(true)
    setError(null)

    if (!isSupabaseConfigured) {
      setLoading(false)
      setError('Supabase is not configured in the environment.')
      return
    }

    try {
      const { data, error: err } = await supabase
        .from('tournaments')
        .select('*')
        .order('created_at', { ascending: false })

      if (err) {
        console.error('TournamentV2 Fetch Error:', err)
        setError(err.message || 'Failed to fetch tournaments from Supabase.')
      } else {
        setTournaments(data || [])
      }
    } catch (catchedErr) {
      console.error('TournamentV2 Exception:', catchedErr)
      setError(catchedErr?.message || 'An unexpected error occurred while fetching tournaments.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTournaments()
  }, [fetchTournaments])

  const value = {
    tournaments,
    loading,
    error,
    refetchTournaments: fetchTournaments
  }

  return (
    <TournamentContextV2.Provider value={value}>
      {children}
    </TournamentContextV2.Provider>
  )
}

export function useTournamentsV2() {
  const context = useContext(TournamentContextV2)
  if (!context) {
    throw new Error('useTournamentsV2 must be used within a TournamentProviderV2')
  }
  return context
}
