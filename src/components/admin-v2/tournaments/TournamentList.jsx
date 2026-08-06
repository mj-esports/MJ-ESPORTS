import React, { useState } from 'react'
import TournamentToolbar from './TournamentToolbar'
import TournamentTable from './TournamentTable'
import TournamentCard from './TournamentCard'
import EmptyState from './EmptyState'
import LoadingState from './LoadingState'

const mockTournamentsUI = [
  {
    id: 't-101',
    title: 'Free Fire Grand Championship Season 4',
    game: 'Free Fire',
    format: 'SQUAD (4P)',
    match_format: 'SQUAD (4P)',
    prize_pool: '₹1,50,000',
    entry_fee: '₹100',
    registered_teams: 28,
    max_teams: 32,
    start_date: '2026-08-10',
    start_time: '06:00 PM IST',
    status: 'Registration Open'
  },
  {
    id: 't-102',
    title: 'Battlegrounds Pro Invitational 2026',
    game: 'BGMI',
    format: 'SQUAD (4P)',
    match_format: 'SQUAD (4P)',
    prize_pool: '₹2,00,000',
    entry_fee: '₹250',
    registered_teams: 32,
    max_teams: 32,
    start_date: '2026-08-08',
    start_time: '04:00 PM IST',
    status: 'Live Now'
  },
  {
    id: 't-103',
    title: 'Solo Showdown Deathmatch',
    game: 'Free Fire',
    format: 'SOLO (1P)',
    match_format: 'SOLO (1P)',
    prize_pool: '₹25,000',
    entry_fee: 'Free',
    registered_teams: 42,
    max_teams: 48,
    start_date: '2026-08-15',
    start_time: '08:00 PM IST',
    status: 'Draft'
  }
]

export default function TournamentList({ tournaments = mockTournamentsUI, loading = false, error = null }) {
  const [viewMode, setViewMode] = useState('table')

  return (
    <div className="space-y-6">
      <TournamentToolbar viewMode={viewMode} setViewMode={setViewMode} />

      {loading ? (
        <LoadingState count={3} viewMode={viewMode} />
      ) : error ? (
        <EmptyState title="Error Loading Data" description={error} />
      ) : tournaments.length === 0 ? (
        <EmptyState />
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tournaments.map((t) => (
            <TournamentCard key={t.id || t.title} tournament={t} />
          ))}
        </div>
      ) : (
        <TournamentTable tournaments={tournaments} />
      )}
    </div>
  )
}
