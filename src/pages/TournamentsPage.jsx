import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Search, ArrowRight, Clock, Gamepad2, Trophy, Users, ShieldCheck, Sparkles } from 'lucide-react'
import { useTournaments } from '../contexts/TournamentContext'
import { CardSkeleton } from '../components/common/SkeletonLoader'
import EmptyState from '../components/common/EmptyState'
import { SUPPORTED_GAMES } from '../data/mockData'

export default function TournamentsPage() {
  const { tournaments, loading } = useTournaments()

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedGame, setSelectedGame] = useState('All')
  const [selectedStatus, setSelectedStatus] = useState('ALL')
  const [visibleCount, setVisibleCount] = useState(6)

  const gamesList = ['All', ...SUPPORTED_GAMES]
  const statusChips = ['ALL', 'UPCOMING', 'LIVE NOW', 'COMPLETED']

  // Featured Tournament for Hero Banner
  const featuredTournament = useMemo(() => {
    return (
      tournaments.find((t) => t.isFeatured || t.status === 'Registration Open' || t.status === 'Live Now') ||
      tournaments[0] ||
      null
    )
  }, [tournaments])

  // Filter tournaments by search, game tab, & status chip
  const filteredTournaments = useMemo(() => {
    const filtered = tournaments.filter((t) => {
      const matchesSearch =
        (t.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.game || '').toLowerCase().includes(searchQuery.toLowerCase())
      const matchesGame = selectedGame === 'All' || t.game === selectedGame
      
      let matchesStatus = true
      if (selectedStatus === 'LIVE NOW') matchesStatus = t.status === 'Live Now'
      else if (selectedStatus === 'UPCOMING') matchesStatus = t.status === 'Registration Open' || t.status === 'Upcoming'
      else if (selectedStatus === 'COMPLETED') matchesStatus = t.status === 'Completed'

      return matchesSearch && matchesGame && matchesStatus
    })

    return Array.from(new Map(filtered.map((item) => [item.id, item])).values())
  }, [tournaments, searchQuery, selectedGame, selectedStatus])

  const visibleTournaments = useMemo(() => {
    return filteredTournaments.slice(0, visibleCount)
  }, [filteredTournaments, visibleCount])

  return (
    <div className="w-full min-h-screen bg-[#0b1326] text-[#dae2fd] pb-24 font-body antialiased">
      <main className="max-w-7xl mx-auto pt-4 px-4 sm:px-6 lg:px-8 flex flex-col gap-6">

        {/* 1. STITCH PAGE HEADER & SEARCH */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#131b2e] border border-[#3a494b]/60 rounded-xl p-5 sm:p-6 shadow-xl">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white uppercase tracking-tight font-headline">
              TOURNAMENT ARENA
            </h1>
            <p className="text-xs text-[#b9cacb]">
              Browse verified Free Fire MAX & BGMI leagues and reserve your squad slot.
            </p>
          </div>

          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-[#b9cacb] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setVisibleCount(6)
              }}
              placeholder="Search tournament title or game..."
              className="w-full bg-[#0b1326] border border-[#3a494b]/60 rounded-full pl-10 pr-4 py-2 text-xs text-[#dae2fd] placeholder-[#b9cacb] focus:border-[#00f2ff] focus:outline-none transition-all shadow-inner h-[42px]"
            />
          </div>
        </div>

        {/* 2. STITCH FEATURED TOURNAMENT HERO BANNER */}
        {featuredTournament && !searchQuery && (
          <div className="relative rounded-xl overflow-hidden bg-[#131b2e] border border-[#3a494b]/80 shadow-2xl group">
            {/* Background Image with Gradient Overlay */}
            <div className="absolute inset-0 z-0">
              <img
                src={
                  featuredTournament.imageUrl ||
                  'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1600&q=80'
                }
                alt={featuredTournament.title}
                className="w-full h-full object-cover opacity-35 group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#0b1326] via-[#0b1326]/80 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0b1326] via-transparent to-transparent" />
            </div>

            {/* Banner Content */}
            <div className="relative z-10 p-6 sm:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-3 max-w-xl">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-3 py-1 rounded font-headline text-[10px] font-extrabold uppercase tracking-widest bg-[#fe6b00] text-slate-950 flex items-center gap-1 shadow-md">
                    <Sparkles className="w-3 h-3" />
                    FEATURED LEAGUE
                  </span>
                  <span className="px-3 py-1 rounded font-headline text-[10px] font-extrabold uppercase tracking-widest bg-[#00f2ff]/10 text-[#00f2ff] border border-[#00f2ff]/40">
                    {featuredTournament.game}
                  </span>
                </div>

                <h2 className="font-headline text-2xl sm:text-4xl font-extrabold text-white uppercase tracking-tight leading-tight">
                  {featuredTournament.title}
                </h2>

                <p className="text-xs text-[#b9cacb] line-clamp-2">
                  {featuredTournament.description || 'High-stakes esports action with verified payouts and live broadcast coverage.'}
                </p>

                <div className="flex items-center gap-6 pt-2 font-mono text-xs">
                  <div>
                    <span className="text-[10px] text-[#8e9dae] uppercase block font-headline">Prize Pool</span>
                    <span className="text-base font-extrabold text-[#00f2ff]">{featuredTournament.prizePool}</span>
                  </div>
                  <div className="w-px h-8 bg-[#3a494b]/60"></div>
                  <div>
                    <span className="text-[10px] text-[#8e9dae] uppercase block font-headline">Entry Fee</span>
                    <span className="text-base font-extrabold text-white">{featuredTournament.entryFee || 'Free'}</span>
                  </div>
                </div>
              </div>

              <div className="w-full md:w-auto flex flex-col sm:flex-row md:flex-col gap-3">
                <Link
                  to={`/tournaments/${featuredTournament.id}`}
                  className="px-6 py-3.5 rounded-xl bg-[#00f2ff] text-[#00363a] font-headline font-extrabold text-xs hover:bg-[#74f5ff] transition-all flex items-center justify-center gap-2 uppercase tracking-wider shadow-lg min-h-[48px]"
                >
                  <span>Quick Register</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* 3. STITCH FILTER TABS (GAMES & STATUS TAXONOMY) */}
        <div className="flex flex-col gap-3 bg-[#131b2e] border border-[#3a494b]/60 rounded-xl p-4 shadow-lg">
          {/* Game Category Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
            {gamesList.map((game) => (
              <button
                key={`game-tab-${game}`}
                onClick={() => {
                  setSelectedGame(game)
                  setVisibleCount(6)
                }}
                className={`px-4 py-2 rounded-xl text-[12px] font-semibold tracking-wide whitespace-nowrap transition-all shrink-0 min-h-[40px] flex items-center font-headline ${
                  selectedGame === game
                    ? 'bg-[#00f2ff] text-[#00363a] font-bold shadow-md'
                    : 'bg-[#0b1326] text-[#b9cacb] border border-[#3a494b]/60 hover:border-[#00f2ff] hover:text-white'
                }`}
              >
                {game}
              </button>
            ))}
          </div>

          {/* Stitch Taxonomy Status Chips: ALL, UPCOMING, LIVE NOW, COMPLETED */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs pt-1 border-t border-[#3a494b]/40">
            {statusChips.map((st) => (
              <button
                key={`status-chip-${st}`}
                onClick={() => {
                  setSelectedStatus(st)
                  setVisibleCount(6)
                }}
                className={`px-3.5 py-1.5 rounded-xl text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap transition-all shrink-0 min-h-[36px] flex items-center font-headline ${
                  selectedStatus === st
                    ? 'bg-[#fe6b00] text-slate-950 font-extrabold shadow-sm'
                    : 'bg-[#0b1326] text-[#b9cacb] border border-[#3a494b]/40 hover:text-white'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* 4. STITCH TOURNAMENT CARDS GRID */}
        {loading ? (
          <CardSkeleton count={6} />
        ) : filteredTournaments.length === 0 ? (
          <EmptyState
            type="search"
            sentence="No tournaments matched your search filter."
            ctaText="Reset Filters"
            onCtaClick={() => {
              setSearchQuery('')
              setSelectedGame('All')
              setSelectedStatus('ALL')
              setVisibleCount(6)
            }}
          />
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {visibleTournaments.map((t) => {
                const filled = Number(t.registeredTeams || t.registered_teams || 0)
                const total = Number(t.maxTeams || t.max_teams || 32)
                const fillPercentage = Math.min(100, Math.round((filled / total) * 100))
                const slotsLeft = Math.max(0, total - filled)
                const entryFee = t.entryFee || t.entry_fee || 'Free'
                const startTime = t.startDate || t.start_date || 'Today 8:00 PM'

                return (
                  <div
                    key={`tourn-card-${t.id}`}
                    className="bg-[#131b2e] border border-[#3a494b]/60 hover:border-[#00f2ff] rounded-xl p-5 space-y-4 shadow-xl transition-all duration-300 flex flex-col justify-between group"
                  >
                    {/* Card Header: Title & Top-Right Entry Fee Badge */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase bg-[#00f2ff]/10 text-[#00f2ff] border border-[#00f2ff]/30 font-headline">
                          {t.game}
                        </span>
                        
                        {/* Top-Right Entry Fee Badge (Stitch Exact Position) */}
                        <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-[#0b1326] text-white border border-[#3a494b]/60">
                          Fee: {entryFee}
                        </span>
                      </div>

                      <h3 className="font-headline font-extrabold text-white text-lg group-hover:text-[#00f2ff] transition-colors truncate">
                        {t.title}
                      </h3>

                      <div className="flex items-center gap-1.5 text-xs text-[#b9cacb] font-mono">
                        <Clock className="w-3.5 h-3.5 text-[#00f2ff] shrink-0" />
                        <span>{startTime}</span>
                      </div>
                    </div>

                    {/* Slot Fill Capacity Progress Bar */}
                    <div className="space-y-1.5 bg-[#0b1326] p-3 rounded-lg border border-[#3a494b]/40">
                      <div className="flex justify-between items-center text-[11px] font-mono">
                        <span className="text-[#b9cacb]">Squad Slots</span>
                        <span className="font-bold text-[#00f2ff]">{filled}/{total} ({slotsLeft} Left)</span>
                      </div>
                      <div className="w-full bg-[#171f33] h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-[#00f2ff] to-[#fe6b00] h-full rounded-full transition-all duration-300"
                          style={{ width: `${fillPercentage}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Prize Pool Summary */}
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-[#3a494b]/40">
                      <span className="text-[10px] text-[#b9cacb] font-headline uppercase">Prize Pool</span>
                      <strong className="text-[#00f2ff] font-mono font-extrabold text-base">{t.prizePool}</strong>
                    </div>

                    {/* CTA Button (rounded-xl) */}
                    <Link
                      to={`/tournaments/${t.id}`}
                      className="w-full py-3 rounded-xl bg-[#00f2ff] text-[#00363a] font-headline font-extrabold text-xs hover:bg-[#74f5ff] transition-all flex items-center justify-center gap-1.5 uppercase min-h-[44px] tracking-wider shadow-md"
                    >
                      <span>View Tournament & Register</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                )
              })}
            </div>

            {/* 5. STITCH LOAD MORE TOURNAMENTS SECTION */}
            {filteredTournaments.length > visibleCount && (
              <div className="pt-6 text-center">
                <button
                  onClick={() => setVisibleCount((prev) => prev + 6)}
                  className="px-8 py-3.5 rounded-xl bg-[#131b2e] hover:bg-[#1c232b] border border-[#3a494b] hover:border-[#00f2ff] text-xs font-headline font-extrabold text-[#00f2ff] uppercase tracking-wider transition-all min-h-[46px] shadow-lg"
                >
                  Load More Tournaments ({filteredTournaments.length - visibleCount} Remaining)
                </button>
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  )
}


