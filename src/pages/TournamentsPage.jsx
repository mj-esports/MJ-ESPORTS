import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Trophy, Search, Filter, Gamepad2, Calendar, Users, Flame } from 'lucide-react'
import { useTournaments } from '../contexts/TournamentContext'
import { SUPPORTED_GAMES } from '../data/mockData'

export default function TournamentsPage() {
  const { tournaments } = useTournaments()

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
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-950/80 border border-purple-800/50 text-purple-300 text-xs font-semibold">
          <Trophy className="w-3.5 h-3.5" />
          <span>Esports Competitions Hub</span>
        </div>
        <h1 className="text-2xl sm:text-5xl font-extrabold text-white tracking-tight uppercase">
          TOURNAMENT DIRECTORY
        </h1>
        <p className="text-slate-400 text-xs sm:text-sm max-w-xl leading-relaxed">
          Browse upcoming tournaments, register your squad, compete in live matches, and win real prize pools.
        </p>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-4 shadow-xl">
        <div className="flex flex-col md:flex-row items-center gap-4">
          
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by tournament name or game..."
              className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Game Filter */}
          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 no-scrollbar">
            <Filter className="w-4 h-4 text-purple-400 shrink-0 hidden md:block" />
            {gamesList.map((game) => (
              <button
                key={`game-filter-${game}`}
                onClick={() => setSelectedGame(game)}
                className={`px-3.5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors shrink-0 min-h-[40px] flex items-center ${
                  selectedGame === game
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                    : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
                }`}
              >
                {game}
              </button>
            ))}
          </div>

        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-2 pt-3 border-t border-slate-800/80 overflow-x-auto text-xs no-scrollbar">
          <span className="text-slate-500 font-semibold text-[11px] uppercase tracking-wider shrink-0 mr-1">
            Status Filter:
          </span>
          {statusList.map((status) => (
            <button
              key={`status-filter-${status}`}
              onClick={() => setSelectedStatus(status)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors shrink-0 ${
                selectedStatus === status
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                  : 'text-slate-400 hover:text-white bg-slate-950 border border-slate-800'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Tournament Cards Grid */}
      {uniqueFilteredTournaments.length === 0 ? (
        <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
          <Trophy className="w-8 h-8 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-300">No Tournaments Found</h3>
          <p className="text-xs text-slate-500">Try broadening your search query or reset your category filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {uniqueFilteredTournaments.map((t) => (
            <div
              key={`tournament-card-${t.id}`}
              className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col justify-between shadow-xl"
            >
              {/* Card Banner */}
              <div className="p-5 sm:p-6 bg-slate-950/80 border-b border-slate-800 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                  <span className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wide bg-slate-900 text-cyan-300 border border-cyan-500/30 flex items-center gap-1.5 shrink-0">
                    <Gamepad2 className="w-3.5 h-3.5" />
                    {t.game}
                  </span>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border shrink-0 ${
                    t.status === 'Live Now'
                      ? 'bg-red-950 text-red-400 border-red-800'
                      : t.status === 'Registration Open'
                      ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                      : 'bg-purple-950 text-purple-400 border-purple-800'
                  }`}>
                    {t.status}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-white">
                    {t.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 font-semibold">{t.format}</p>
                </div>
              </div>

              {/* Card Details */}
              <div className="p-5 sm:p-6 space-y-4 flex-1 flex flex-col justify-between">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-500 text-[10px] uppercase font-bold block">Prize Pool</span>
                    <span className="text-emerald-400 font-extrabold text-sm">{t.prizePool}</span>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-500 text-[10px] uppercase font-bold block">Slots</span>
                    <span className="text-slate-200 font-bold text-sm">
                      {t.registeredTeams} / {t.maxTeams} Teams
                    </span>
                  </div>
                </div>

                <div className="pt-3 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80 gap-2">
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Calendar className="w-3.5 h-3.5 text-purple-400" />
                    <span>Starts {t.startDate}</span>
                  </div>
                  <Link
                    to={`/tournaments/${t.id}`}
                    className="px-4 py-2.5 rounded-xl bg-purple-600 text-white font-bold hover:bg-purple-500 transition-colors text-xs shrink-0 flex items-center justify-center min-h-[38px]"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  )
}
