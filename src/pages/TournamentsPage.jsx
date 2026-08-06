import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Search, Clock, Users, Sparkles, Calendar } from 'lucide-react'
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
      // 1. Visibility Check: Show all published tournaments (published === true or status !== 'Draft')
      const isPublished = t.published !== undefined ? Boolean(t.published) : (t.status !== 'Draft')
      if (!isPublished) return false

      // 2. Case-insensitive Search Match
      const queryStr = searchQuery.trim().toLowerCase()
      const matchesSearch =
        !queryStr ||
        (t.title || '').toLowerCase().includes(queryStr) ||
        (t.game || '').toLowerCase().includes(queryStr) ||
        (t.mode || '').toLowerCase().includes(queryStr)

      // 3. Case-insensitive Game Filter Match
      const matchesGame =
        selectedGame === 'All' ||
        (t.game || '').toLowerCase() === selectedGame.toLowerCase()

      // 4. Case-insensitive & Synonymous Status Filter Match
      let matchesStatus = true
      const s = (t.status || '').toLowerCase()
      if (selectedStatus === 'LIVE NOW') {
        matchesStatus = s === 'live now' || s === 'live'
      } else if (selectedStatus === 'UPCOMING') {
        matchesStatus = s === 'registration open' || s === 'upcoming' || s === 'open'
      } else if (selectedStatus === 'COMPLETED') {
        matchesStatus = s === 'completed' || s === 'finished' || s === 'ended'
      }

      return matchesSearch && matchesGame && matchesStatus
    })

    const deduped = Array.from(new Map(filtered.map((item) => [item.id, item])).values())

    console.log('[Player Tournaments Page - Visibility Audit Log]:', {
      totalTournamentsInState: tournaments.length,
      queryResultCount: deduped.length,
      filters: { searchQuery, selectedGame, selectedStatus },
      visibleTournaments: deduped.map((t) => ({
        tournamentId: t.id,
        status: t.status,
        published: t.published !== undefined ? t.published : (t.status !== 'Draft'),
        title: t.title,
        game: t.game
      }))
    })

    return deduped
  }, [tournaments, searchQuery, selectedGame, selectedStatus])

  const visibleTournaments = useMemo(() => {
    return filteredTournaments.slice(0, visibleCount)
  }, [filteredTournaments, visibleCount])

  return (
    <div className="w-full min-h-screen bg-[#121212] text-[#A0A0A0] pb-24 font-body antialiased">
      <main className="max-w-7xl mx-auto pt-6 px-4 sm:px-6 lg:px-8 flex flex-col gap-8">

        {/* 1. STITCH FEATURED TOURNAMENT HERO BANNER */}
        {featuredTournament && !searchQuery && (
          <section className="relative rounded-2xl overflow-hidden border border-[#333333] group shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-[#121212]/60 to-transparent z-10"></div>
            <div
              className="h-64 md:h-96 w-full bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
              style={{
                backgroundImage: `url(${
                  featuredTournament.imageUrl ||
                  'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1600&q=80'
                })`
              }}
            ></div>

            <div className="absolute bottom-0 left-0 w-full p-6 md:p-8 z-20 flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="space-y-2 max-w-2xl">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#FF0055] text-white uppercase tracking-wider font-label shadow-md">
                  <Sparkles className="w-3.5 h-3.5" />
                  Featured Event
                </span>
                <h2 className="text-3xl md:text-5xl font-black font-headline text-white tracking-tight drop-shadow-lg">
                  {featuredTournament.title || 'Global Clash Championship'}
                </h2>
                <div className="flex items-center gap-4 text-[#A0A0A0] text-sm font-label">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4 text-[#00FFFF]" />
                    Starts in 2 Days
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4 text-[#00FFFF]" />
                    128/256 Teams
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-start md:items-end gap-3">
                <div className="text-left md:text-right">
                  <div className="text-[#A0A0A0] text-xs uppercase font-semibold font-label">Prize Pool</div>
                  <div className="text-2xl md:text-3xl font-black font-headline text-[#00FFFF]">
                    {featuredTournament.prizePool || '$50,000'}
                  </div>
                </div>
                <Link
                  to={`/tournaments/${featuredTournament.id}`}
                  className="bg-[#00FFFF] text-black font-bold px-8 py-3 rounded-lg hover:bg-[#00FFFF]/90 transition-all active:scale-95 font-label w-full md:w-auto text-center shadow-[0_0_15px_rgba(0,255,255,0.3)] uppercase tracking-wider text-sm"
                >
                  Register Now
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* 2. STITCH FILTERS AND TABS (STICKY BAR) */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 sm:gap-4 sticky top-0 z-40 bg-[#121212]/90 backdrop-blur-md py-3 sm:py-4 border-b border-[#333333] -mx-4 px-4 md:mx-0 md:px-0">
          {/* Game Category Chips */}
          <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1 md:pb-0 w-full md:w-auto no-scrollbar snap-x">
            {gamesList.map((game) => (
              <button
                key={`game-tab-${game}`}
                onClick={() => {
                  setSelectedGame(game)
                  setVisibleCount(6)
                }}
                className={`snap-start flex-shrink-0 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full font-label text-xs sm:text-sm font-semibold transition-colors ${
                  selectedGame === game
                    ? 'border border-[#00FFFF] bg-[#00FFFF]/10 text-[#00FFFF]'
                    : 'border border-[#333333] text-[#A0A0A0] hover:text-white hover:border-white'
                }`}
              >
                {game === 'All' ? 'All Games' : game}
              </button>
            ))}
          </div>

          {/* Search & Status Tabs */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-[#A0A0A0] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setVisibleCount(6)
                }}
                placeholder="Search tournaments..."
                className="w-full bg-[#1E1E1E] border border-[#333333] rounded-lg pl-10 pr-4 py-2 text-xs text-white placeholder-[#A0A0A0] focus:border-[#00FFFF] focus:outline-none transition-colors h-[38px]"
              />
            </div>

            {/* Status Segmented Tabs */}
            <div className="flex bg-[#252525] rounded-lg p-1 w-full sm:w-auto overflow-x-auto">
              {statusChips.map((st) => (
                <button
                  key={`status-chip-${st}`}
                  onClick={() => {
                    setSelectedStatus(st)
                    setVisibleCount(6)
                  }}
                  className={`flex-1 sm:flex-none px-2.5 xs:px-3 sm:px-5 py-1.5 rounded-md font-label text-[11px] xs:text-xs font-medium transition-all ${
                    selectedStatus === st
                      ? 'bg-[#444444] text-white font-bold shadow-sm'
                      : 'text-[#A0A0A0] hover:text-white'
                  }`}
                >
                  {st === 'ALL' ? 'All' : st === 'UPCOMING' ? 'Upcoming' : st === 'LIVE NOW' ? 'Live' : 'Completed'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 3. STITCH TOURNAMENT CARDS GRID */}
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
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {visibleTournaments.map((t) => {
                const filled = Number(t.registeredTeams || t.registered_teams || 0)
                const total = Number(t.maxTeams || t.max_teams || 32)
                const fillPercentage = Math.min(100, Math.round((filled / total) * 100))
                const isFull = filled >= total || t.status === 'Completed' || t.status === 'Closed'
                const entryFee = t.entryFee || t.entry_fee || 'Free'
                const startTime = t.startDate || t.start_date || 'Today, 18:00 EST'
                const cardImage =
                  t.imageUrl ||
                  (t.game === 'BGMI'
                    ? 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80'
                    : t.game === 'Free Fire MAX'
                    ? 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=800&q=80'
                    : 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80')

                return (
                  <article
                    key={`tourn-card-${t.id}`}
                    className={`bg-[#1E1E1E] rounded-xl border border-[#333333] overflow-hidden hover:border-[#00FFFF]/50 transition-all duration-300 group flex flex-col ${
                      isFull ? 'opacity-75' : ''
                    }`}
                  >
                    {/* Cover Image & Game Tag */}
                    <div
                      className={`h-32 w-full bg-cover bg-center relative ${
                        isFull ? 'grayscale group-hover:grayscale-0 transition-all' : ''
                      }`}
                      style={{ backgroundImage: `url(${cardImage})` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-[#1E1E1E] to-transparent"></div>
                      <div className="absolute top-3 left-3 bg-[#121212]/80 backdrop-blur-sm px-2 py-1 rounded text-xs font-bold font-label text-white border border-[#333333]">
                        {t.game}
                      </div>
                      {isFull && (
                        <div className="absolute top-3 right-3 bg-[#333333] px-2 py-1 rounded text-xs font-bold font-label text-[#A0A0A0] border border-[#333333]">
                          Full
                        </div>
                      )}
                    </div>

                    {/* Card Content Body */}
                    <div className="p-5 flex flex-col flex-grow">
                      <h3 className="font-headline font-bold text-xl text-white mb-1 group-hover:text-[#00FFFF] transition-colors truncate">
                        {t.title}
                      </h3>
                      <p className="text-sm text-[#A0A0A0] font-label mb-4 flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-[#00FFFF]" />
                        <span>{startTime}</span>
                      </p>

                      {/* Stat Box Grid (2 cols) */}
                      <div className="grid grid-cols-2 gap-4 mb-4 mt-auto">
                        <div className="bg-[#252525] p-3 rounded-lg border border-[#333333]">
                          <div className="text-xs text-[#A0A0A0] font-label mb-1">Prize Pool</div>
                          <div className="font-headline font-bold text-[#00FFFF]">{t.prizePool}</div>
                        </div>
                        <div className="bg-[#252525] p-3 rounded-lg border border-[#333333]">
                          <div className="text-xs text-[#A0A0A0] font-label mb-1">Entry Fee</div>
                          <div className="font-headline font-bold text-white">{entryFee}</div>
                        </div>
                      </div>

                      {/* Slot Capacity Progress Bar */}
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-xs font-label">
                          <span className="text-[#A0A0A0]">Registration</span>
                          <span className={isFull ? 'text-[#FF0055] font-bold' : 'text-white font-bold'}>
                            {isFull ? 'Closed' : `${filled}/${total} Teams`}
                          </span>
                        </div>
                        <div className="w-full bg-[#333333] rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-1.5 rounded-full transition-all duration-300 ${
                              isFull
                                ? 'bg-[#FF0055]'
                                : 'bg-gradient-to-r from-[#00FFFF] to-[#00FFFF]/50'
                            }`}
                            style={{ width: `${fillPercentage}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* CTA Button */}
                      {isFull ? (
                        <button
                          disabled
                          className="w-full py-2.5 rounded-lg bg-[#252525] text-[#A0A0A0] font-label font-bold text-sm cursor-not-allowed text-center"
                        >
                          Registration Closed
                        </button>
                      ) : (
                        <Link
                          to={`/tournaments/${t.id}`}
                          className="w-full py-2.5 rounded-lg border border-[#00FFFF] text-[#00FFFF] hover:bg-[#00FFFF]/10 font-label font-bold text-sm transition-colors text-center block uppercase tracking-wider"
                        >
                          View Details
                        </Link>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>

            {/* Load More Button */}
            {filteredTournaments.length > visibleCount && (
              <div className="pt-6 text-center">
                <button
                  onClick={() => setVisibleCount((prev) => prev + 6)}
                  className="px-8 py-3 rounded-lg bg-[#1E1E1E] hover:bg-[#252525] border border-[#333333] hover:border-[#00FFFF] text-xs font-label font-bold text-[#00FFFF] uppercase tracking-wider transition-all min-h-[44px] shadow-lg"
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


