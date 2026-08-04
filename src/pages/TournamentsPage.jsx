import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Search, ArrowRight, Clock } from 'lucide-react'
import { useTournaments } from '../contexts/TournamentContext'
import { CardSkeleton } from '../components/common/SkeletonLoader'
import EmptyState from '../components/common/EmptyState'
import { SUPPORTED_GAMES } from '../data/mockData'

export default function TournamentsPage() {
  const { tournaments, loading } = useTournaments()

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedGame, setSelectedGame] = useState('All')
  const [selectedStatus, setSelectedStatus] = useState('ALL') // 'ALL' | 'LIVE' | 'UPCOMING' | 'COMPLETED'

  const gamesList = ['All', ...SUPPORTED_GAMES]
  const statusChips = ['ALL', 'LIVE NOW', 'REGISTRATION OPEN', 'COMPLETED']

  // Filter tournaments by search, game tab, & status chip
  const filteredTournaments = useMemo(() => {
    const filtered = tournaments.filter((t) => {
      const matchesSearch =
        (t.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.game || '').toLowerCase().includes(searchQuery.toLowerCase())
      const matchesGame = selectedGame === 'All' || t.game === selectedGame
      
      let matchesStatus = true
      if (selectedStatus === 'LIVE NOW') matchesStatus = t.status === 'Live Now'
      else if (selectedStatus === 'REGISTRATION OPEN') matchesStatus = t.status === 'Registration Open' || t.status === 'Upcoming'
      else if (selectedStatus === 'COMPLETED') matchesStatus = t.status === 'Completed'

      return matchesSearch && matchesGame && matchesStatus
    })

    return Array.from(new Map(filtered.map((item) => [item.id, item])).values())
  }, [tournaments, searchQuery, selectedGame, selectedStatus])

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 sm:py-5 space-y-3.5 isolate relative">

      {/* 1. COMPACT SEARCH BAR & GAME TITLE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <h1 className="font-display-lg text-lg font-extrabold text-white uppercase tracking-tight shrink-0">
          TOURNAMENTS
        </h1>
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-[#8e9dae] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tournament..."
            className="input-cyber w-full pl-9 pr-3 py-1.5 h-9 text-xs text-[#e1e2e7] placeholder-[#8e9dae] focus:border-[#00f2ff]"
          />
        </div>
      </div>

      {/* 2. HORIZONTALLY SCROLLABLE FILTER CHIPS (GAME & STATUS) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
        {gamesList.map((game) => (
          <button
            key={`game-tab-${game}`}
            onClick={() => setSelectedGame(game)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-extrabold uppercase tracking-wider whitespace-nowrap transition-all shrink-0 min-h-[38px] flex items-center ${
              selectedGame === game
                ? 'bg-[#00f2ff] text-[#00363a] font-extrabold shadow-sm'
                : 'bg-[#151a21] text-[#8e9dae] border border-[#3a494b]/60 hover:text-white'
            }`}
          >
            {game}
          </button>
        ))}

        <div className="w-[1px] h-5 bg-[#3a494b]/60 shrink-0 mx-1" />

        {statusChips.map((st) => (
          <button
            key={`status-chip-${st}`}
            onClick={() => setSelectedStatus(st)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-extrabold uppercase tracking-wider whitespace-nowrap transition-all shrink-0 min-h-[38px] flex items-center ${
              selectedStatus === st
                ? 'bg-[#fe6b00] text-slate-950 font-extrabold shadow-sm'
                : 'bg-[#151a21] text-[#8e9dae] border border-[#3a494b]/60 hover:text-white'
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      {/* 3. TOURNAMENT CARDS GRID */}
      {loading ? (
        <CardSkeleton count={6} />
      ) : filteredTournaments.length === 0 ? (
        <EmptyState
          type="search"
          sentence="No tournaments matched your search query."
          ctaText="Clear Search"
          onCtaClick={() => {
            setSearchQuery('')
            setSelectedGame('All')
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTournaments.map((t) => {
            const filled = Number(t.registeredTeams || t.registered_teams || 0)
            const total = Number(t.maxTeams || t.max_teams || 32)
            const slotsLeft = Math.max(0, total - filled)
            const entryFee = t.entryFee || t.entry_fee || 'Free'
            const startTime = t.startDate || t.start_date || 'Today 8:00 PM'

            return (
              <div
                key={`tourn-card-${t.id}`}
                className="bg-[#151a21] border border-[#3a494b]/60 hover:border-[#00f2ff] rounded-xl p-4 space-y-3 shadow-lg transition-all duration-200 flex flex-col justify-between"
              >
                {/* Header: Title & Game Badge */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-[#00f2ff]/10 text-[#00f2ff] border border-[#00f2ff]/30">
                      {t.game}
                    </span>
                    <span className="text-[10px] font-mono text-[#8e9dae] flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#00f2ff]" />
                      <span>{startTime}</span>
                    </span>
                  </div>
                  <h3 className="font-extrabold text-white text-base truncate uppercase">{t.title}</h3>
                </div>

                {/* Metrics Row: Prize, Entry Fee, Slots Left */}
                <div className="grid grid-cols-3 gap-2 bg-[#07090c] p-2.5 rounded-lg border border-[#3a494b]/40 text-[11px] text-center">
                  <div>
                    <span className="text-[9px] text-[#8e9dae] uppercase font-mono block">Prize</span>
                    <strong className="text-[#ffb693] font-mono">{t.prizePool}</strong>
                  </div>
                  <div>
                    <span className="text-[9px] text-[#8e9dae] uppercase font-mono block">Entry</span>
                    <strong className="text-white font-mono">{entryFee}</strong>
                  </div>
                  <div>
                    <span className="text-[9px] text-[#8e9dae] uppercase font-mono block">Slots Left</span>
                    <strong className="text-[#00ff9d] font-mono">{slotsLeft} Slots</strong>
                  </div>
                </div>

                {/* Join Button CTA */}
                <Link
                  to={`/tournaments/${t.id}`}
                  className="w-full py-2.5 rounded-xl bg-[#00f2ff] text-[#00363a] font-extrabold text-xs hover:bg-[#74f5ff] transition-all flex items-center justify-center gap-1.5 uppercase min-h-[44px] tracking-wider shadow-sm"
                >
                  <span>Join Tournament</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )
          })}
        </div>
      )}

    </div>
  )
}
