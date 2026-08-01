import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Trophy, Search, Filter, Gamepad2, Calendar, Users, Flame, ChevronRight } from 'lucide-react'
import { useTournaments } from '../contexts/TournamentContext'
import { CardSkeleton } from '../components/common/SkeletonLoader'
import { SUPPORTED_GAMES } from '../data/mockData'

export default function TournamentsPage() {
  const { tournaments, loading } = useTournaments()

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedGame, setSelectedGame] = useState('All')
  const [selectedStatus, setSelectedStatus] = useState('All')

  const gamesList = ['All', ...SUPPORTED_GAMES]
  const statusList = ['All', 'Live Now', 'Registration Open', 'Bracket Locked']

  // Memoized & deduplicated tournaments list
  const uniqueFilteredTournaments = useMemo(() => {
    const filtered = tournaments.filter((t) => {
      const matchesSearch =
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.game.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesGame = selectedGame === 'All' || t.game === selectedGame
      const matchesStatus = selectedStatus === 'All' || t.status === selectedStatus
      return matchesSearch && matchesGame && matchesStatus
    })

    return Array.from(new Map(filtered.map((item) => [item.id, item])).values())
  }, [tournaments, searchQuery, selectedGame, selectedStatus])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 sm:space-y-10">
      
      {/* Header Banner */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#00f2ff]/10 border border-[#00f2ff]/30 text-[#00f2ff] text-xs font-bold uppercase tracking-widest">
          <Trophy className="w-3.5 h-3.5" />
          <span>Esports Competitions Hub</span>
        </div>
        <h1 className="font-display-lg text-3xl sm:text-5xl font-extrabold text-white tracking-tight uppercase">
          TOURNAMENT DIRECTORY
        </h1>
        <p className="text-[#8e9dae] text-xs sm:text-sm max-w-xl leading-relaxed">
          Browse upcoming tournaments, register your squad, compete in live matches, and win real prize pools.
        </p>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-4 sm:p-6 space-y-4 shadow-2xl">
        <div className="flex flex-col md:flex-row items-center gap-4">
          
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-[#8e9dae] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={tournaments.length === 0}
              placeholder={tournaments.length === 0 ? "Search disabled (no tournaments live)..." : "Search by tournament name or game..."}
              className="w-full pl-10 pr-4 py-3 bg-[#07090c] border border-[#3a494b] rounded-lg text-sm text-[#e1e2e7] placeholder-[#8e9dae] focus:outline-none focus:border-[#00f2ff] focus:shadow-[0_0_12px_rgba(0,242,255,0.25)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* Game Filter Buttons */}
          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
            <Filter className="w-4 h-4 text-[#00f2ff] shrink-0 hidden md:block" />
            {gamesList.map((game) => (
              <button
                key={`game-filter-${game}`}
                onClick={() => setSelectedGame(game)}
                className={`px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all shrink-0 min-h-[40px] flex items-center ${
                  selectedGame === game
                    ? 'bg-[#00f2ff] text-[#00363a] font-extrabold shadow-[0_0_12px_rgba(0,242,255,0.4)]'
                    : 'bg-[#07090c] text-[#8e9dae] border border-[#3a494b] hover:text-[#00f2ff] hover:border-[#00f2ff]/40'
                }`}
              >
                {game}
              </button>
            ))}
          </div>

        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-2 pt-3 border-t border-[#3a494b]/60 overflow-x-auto text-xs scrollbar-hide">
          <span className="font-label-caps text-[10px] text-[#8e9dae] uppercase tracking-widest shrink-0 mr-1">
            Status Filter:
          </span>
          {statusList.map((status) => (
            <button
              key={`status-filter-${status}`}
              onClick={() => setSelectedStatus(status)}
              className={`px-3 py-1.5 rounded-md font-bold uppercase tracking-wider transition-colors shrink-0 ${
                selectedStatus === status
                  ? 'bg-[#00f2ff]/10 text-[#00f2ff] border border-[#00f2ff]/40'
                  : 'text-[#8e9dae] hover:text-white bg-[#07090c] border border-[#3a494b]'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Tournament Cards Grid */}
      {loading ? (
        <CardSkeleton count={6} />
      ) : uniqueFilteredTournaments.length === 0 ? (
        <div className="p-12 text-center bg-[#151a21] border border-[#3a494b] rounded-xl space-y-3 shadow-xl">
          <Trophy className="w-10 h-10 text-[#00f2ff] mx-auto opacity-75 animate-pulse" />
          <h3 className="text-base font-bold text-white uppercase tracking-wider">No tournaments are live yet</h3>
          <p className="text-xs text-[#8e9dae] max-w-md mx-auto">
            Our first tournament is launching soon. Check back shortly for new competitive registrations.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {uniqueFilteredTournaments.map((t) => {
            const filled = t.registeredTeams || 0
            const total = t.maxTeams || 100
            const pct = Math.round((filled / total) * 100)

            return (
              <div
                key={`tournament-card-${t.id}`}
                className="bg-[#151a21] border border-[#3a494b]/60 hover:border-[#00f2ff] rounded-xl overflow-hidden flex flex-col justify-between shadow-xl transition-all duration-300 hover:shadow-[0_0_20px_rgba(0,242,255,0.15)] group"
              >
                {/* Card Header */}
                <div className="p-5 sm:p-6 bg-[#07090c] border-b border-[#3a494b]/60 space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                    <span className="px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-[#00f2ff]/10 text-[#00f2ff] border border-[#00f2ff]/30 flex items-center gap-1.5 shrink-0">
                      <Gamepad2 className="w-3.5 h-3.5" />
                      {t.game}
                    </span>
                    <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider border shrink-0 ${
                      t.status === 'Live Now'
                        ? 'bg-[#fe6b00]/10 text-[#fe6b00] border-[#fe6b00]/40 animate-pulse'
                        : t.status === 'Registration Open'
                        ? 'bg-[#00ff9d]/10 text-[#00ff9d] border-[#00ff9d]/40'
                        : 'bg-[#8e9dae]/10 text-[#8e9dae] border-[#8e9dae]/40'
                    }`}>
                      {t.status}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-display-lg text-lg sm:text-xl font-bold text-white group-hover:text-[#00f2ff] transition-colors uppercase">
                      {t.title}
                    </h3>
                    <p className="text-xs text-[#8e9dae] mt-1 font-semibold">{t.format}</p>
                  </div>
                </div>

                {/* Card Details */}
                <div className="p-5 sm:p-6 space-y-4 flex-1 flex flex-col justify-between">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-[#07090c] p-3 rounded border border-[#3a494b]/60">
                      <span className="font-label-caps text-[10px] text-[#8e9dae] uppercase block">Prize Pool</span>
                      <span className="font-mono text-sm font-extrabold text-[#ffb693]">{t.prizePool}</span>
                    </div>
                    <div className="bg-[#07090c] p-3 rounded border border-[#3a494b]/60">
                      <span className="font-label-caps text-[10px] text-[#8e9dae] uppercase block">Slots</span>
                      <span className="font-mono text-sm font-bold text-[#e1e2e7]">
                        {filled} / {total}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-mono text-[#8e9dae]">
                      <span>CAPACITY</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#07090c] rounded-full overflow-hidden border border-[#3a494b]/40">
                      <div
                        className="bg-gradient-to-r from-[#00dbe7] to-[#00f2ff] h-full"
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="pt-3 flex items-center justify-between text-xs text-[#8e9dae] border-t border-[#3a494b]/60 gap-2">
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Calendar className="w-3.5 h-3.5 text-[#00f2ff]" />
                      <span>Starts {t.startDate}</span>
                    </div>
                    <Link
                      to={`/tournaments/${t.id}`}
                      className="px-4 py-2.5 rounded bg-[#00f2ff] text-[#00363a] font-extrabold hover:bg-[#74f5ff] transition-all text-xs shrink-0 flex items-center justify-center gap-1 uppercase tracking-wider"
                    >
                      <span>VIEW DETAILS</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

    </div>
  )
}
