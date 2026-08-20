import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Search, Clock, Users, Sparkles, Calendar } from 'lucide-react'
import { useTournaments } from '../contexts/TournamentContext'
import { CardSkeleton } from '../components/common/SkeletonLoader'
import EmptyState from '../components/common/EmptyState'
import { SUPPORTED_GAMES } from '../data/mockData'
import { useDebounce } from '../hooks/useDebounce'
import { getTournamentImage } from '../utils/tournamentImageUtils'
import { formatTournamentPrize } from '../utils/tournamentPrizeUtils'
import {
  calculateFilledPlayerSlots,
  calculateTotalPlayerSlots,
  calculateSlotFillPercentage,
  getTournamentMode,
} from '../utils/tournamentUtils'

export default function TournamentsPage() {
  const { tournaments, loading } = useTournaments()

  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearchQuery = useDebounce(searchQuery, 300)
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
      const queryStr = debouncedSearchQuery.trim().toLowerCase()
      const matchesSearch =
        !queryStr ||
        (t.title || '').toLowerCase().includes(queryStr) ||
        (t.game || '').toLowerCase().includes(queryStr) ||
        (t.format || t.matchFormat || t.mode || '').toLowerCase().includes(queryStr) ||
        (t.status || '').toLowerCase().includes(queryStr)

      // 3. Case-insensitive Game Filter Match
      const matchesGame =
        selectedGame === 'All' ||
        (t.game || '').toLowerCase() === selectedGame.toLowerCase() ||
        (selectedGame.toLowerCase().includes('free fire') && (t.game || '').toLowerCase().includes('free fire'))

      // 4. Case-insensitive & Synonymous Status Filter Match
      let matchesStatus = true
      const s = (t.status || '').toLowerCase()
      if (selectedStatus === 'LIVE NOW') {
        matchesStatus = s.includes('live')
      } else if (selectedStatus === 'UPCOMING') {
        matchesStatus =
          s.includes('registration open') ||
          s.includes('almost full') ||
          s.includes('starts soon') ||
          s.includes('upcoming') ||
          s.includes('open')
      } else if (selectedStatus === 'COMPLETED') {
        matchesStatus = s.includes('completed') || s.includes('finished') || s.includes('ended')
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
  }, [tournaments, searchQuery, selectedGame, selectedStatus, debouncedSearchQuery])

  const visibleTournaments = useMemo(() => {
    return filteredTournaments.slice(0, visibleCount)
  }, [filteredTournaments, visibleCount])

  return (
    <div className="w-full min-h-screen bg-[#121212] text-[#A0A0A0] pb-24 font-body antialiased overflow-x-hidden">
      <main className="max-w-7xl mx-auto pt-6 px-4 sm:px-6 lg:px-8 flex flex-col gap-8">

        {/* 1. STITCH FEATURED TOURNAMENT HERO BANNER */}
        {featuredTournament && !searchQuery && (
          <section className="relative rounded-2xl overflow-hidden border border-[#333333] group shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-[#121212]/80 via-60% to-black/40 z-10"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-[#121212]/80 via-transparent to-transparent z-10"></div>
            <div
              className="h-64 sm:h-80 md:h-[420px] w-full bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
              style={{
                backgroundImage: `url(${getTournamentImage(featuredTournament)})`
              }}
            ></div>

            <div className="absolute bottom-0 left-0 w-full p-6 sm:p-8 md:p-10 z-20 flex flex-col md:flex-row md:items-end justify-between gap-6 md:gap-8">
              <div className="space-y-3 sm:space-y-4 max-w-2xl">
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-extrabold bg-[#00FFFF]/10 text-[#00FFFF] border border-[#00FFFF]/40 uppercase tracking-widest font-label shadow-[0_0_15px_rgba(0,255,255,0.2)]">
                  <Sparkles className="w-3.5 h-3.5" />
                  Featured Event
                </span>
                <h2 className="text-2xl sm:text-4xl md:text-5xl font-black font-headline text-white tracking-tight drop-shadow-md leading-tight">
                  {featuredTournament.title || 'Global Clash Championship'}
                </h2>
                <div className="flex flex-wrap items-center gap-4 text-[#A0A0A0] text-sm font-label pt-1">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-[#00FFFF]" />
                    {featuredTournament.startDate || 'Starts in 2 Days'}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-[#00FFFF]" />
                    {featuredTournament.registeredTeams || 0}/{featuredTournament.maxTeams || 100} {getTournamentMode(featuredTournament).teamUnit}
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-start md:items-end gap-3.5 shrink-0">
                <div className="text-left md:text-right">
                  <div className="text-[#A0A0A0] text-xs uppercase font-semibold font-label tracking-wider mb-0.5">Prize Pool</div>
                  <div className="text-2xl sm:text-3xl md:text-4xl font-black font-headline text-[#00FFFF] drop-shadow-sm">
                    {formatTournamentPrize(featuredTournament)}
                  </div>
                </div>
                <Link
                  to={featuredTournament?.id ? `/tournaments/${featuredTournament.id}` : '/tournaments'}
                  className="bg-[#00FFFF] text-black font-bold px-8 py-3.5 rounded-lg hover:bg-[#00FFFF]/90 transition-all active:scale-95 font-label w-full md:w-auto text-center shadow-[0_0_20px_rgba(0,255,255,0.3)] uppercase tracking-wider text-sm min-h-[44px] flex items-center justify-center"
                >
                  Register Now
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* 2. STITCH FILTERS AND TABS (STICKY BAR) */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 sticky top-0 z-40 bg-[#121212]/95 backdrop-blur-xl py-3.5 sm:py-4 border-b border-[#262626] shadow-xl -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 transition-all duration-300">
          {/* Game Category Chips */}
          <div className="flex gap-2 overflow-x-auto pb-1 lg:pb-0 w-full lg:w-auto no-scrollbar snap-x items-center">
            {gamesList.map((game) => {
              const isActive = selectedGame === game
              return (
                <button
                  key={`game-tab-${game}`}
                  onClick={() => {
                    setSelectedGame(game)
                    setVisibleCount(6)
                  }}
                  className={`snap-start flex-shrink-0 px-4 sm:px-5 py-2 rounded-full font-label text-xs sm:text-sm transition-all duration-200 cursor-pointer active:scale-95 flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-[#00FFFF] text-black font-extrabold shadow-[0_0_15px_rgba(0,255,255,0.35)] scale-105'
                      : 'bg-[#1A1A1A] border border-[#333333] text-[#A0A0A0] font-bold hover:text-white hover:border-[#00FFFF]/50 hover:bg-[#252525]'
                  }`}
                >
                  {game === 'All' ? 'All Games' : game}
                </button>
              )
            })}
          </div>

          {/* Search & Status Tabs */}
          <div className="flex flex-col sm:flex-row items-center gap-3.5 w-full lg:w-auto">
            {/* Search Input */}
            <div className="relative w-full sm:w-64 md:w-72">
              <Search className="w-4 h-4 text-[#A0A0A0] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setVisibleCount(6)
                }}
                placeholder="Search tournaments..."
                className="w-full bg-[#1A1A1A] border border-[#333333] rounded-lg pl-10 pr-4 py-2 text-xs sm:text-sm text-white placeholder-[#777777] focus:border-[#00FFFF] focus:ring-1 focus:ring-[#00FFFF] focus:outline-none transition-all duration-200 h-[40px] shadow-inner font-label"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#A0A0A0] hover:text-white bg-[#262626] px-1.5 py-0.5 rounded font-label"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Status Segmented Tabs */}
            <div className="flex bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-1 w-full sm:w-auto overflow-x-auto gap-1">
              {statusChips.map((st) => {
                const isActive = selectedStatus === st
                return (
                  <button
                    key={`status-chip-${st}`}
                    onClick={() => {
                      setSelectedStatus(st)
                      setVisibleCount(6)
                    }}
                    className={`flex-1 sm:flex-none px-3.5 sm:px-4 py-1.5 rounded-md font-label text-xs transition-all duration-200 cursor-pointer active:scale-95 ${
                      isActive
                        ? 'bg-[#00FFFF] text-black font-extrabold shadow-[0_0_12px_rgba(0,255,255,0.3)] scale-[1.02]'
                        : 'text-[#A0A0A0] font-bold hover:text-white hover:bg-[#262626]'
                    }`}
                  >
                    {st === 'ALL' ? 'All' : st === 'UPCOMING' ? 'Upcoming' : st === 'LIVE NOW' ? 'Live' : 'Completed'}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* 3. STITCH TOURNAMENT CARDS GRID */}
        {loading ? (
          <CardSkeleton count={6} />
        ) : filteredTournaments.length === 0 ? (
          (() => {
            const emptyProps = searchQuery.trim()
              ? {
                  type: 'search',
                  title: 'No Search Results',
                  sentence: `No tournaments matched "${searchQuery}". Try adjusting your keywords or clearing filters.`,
                  ctaText: 'Reset Filters',
                  secondaryCtaText: 'Clear Search',
                  onCtaClick: () => {
                    setSearchQuery('')
                    setSelectedGame('All')
                    setSelectedStatus('ALL')
                    setVisibleCount(6)
                  },
                  onSecondaryCtaClick: () => setSearchQuery('')
                }
              : selectedStatus === 'LIVE NOW'
              ? {
                  type: 'live',
                  title: 'No Live Tournaments',
                  sentence: 'There are no active matches being broadcast live at this moment.',
                  ctaText: 'Reset Filters',
                  secondaryCtaText: 'Browse All Tournaments',
                  onCtaClick: () => {
                    setSelectedGame('All')
                    setSelectedStatus('ALL')
                    setVisibleCount(6)
                  },
                  onSecondaryCtaClick: () => setSelectedStatus('ALL')
                }
              : selectedStatus === 'COMPLETED'
              ? {
                  type: 'completed',
                  title: 'No Completed Matches',
                  sentence: 'No finished tournament match records found under this filter.',
                  ctaText: 'Reset Filters',
                  secondaryCtaText: 'Browse All Tournaments',
                  onCtaClick: () => {
                    setSelectedGame('All')
                    setSelectedStatus('ALL')
                    setVisibleCount(6)
                  },
                  onSecondaryCtaClick: () => setSelectedStatus('ALL')
                }
              : selectedStatus === 'UPCOMING'
              ? {
                  type: 'upcoming',
                  title: 'No Upcoming Events',
                  sentence: 'No upcoming tournaments scheduled under the selected filter.',
                  ctaText: 'Reset Filters',
                  secondaryCtaText: 'Browse All Tournaments',
                  onCtaClick: () => {
                    setSelectedGame('All')
                    setSelectedStatus('ALL')
                    setVisibleCount(6)
                  },
                  onSecondaryCtaClick: () => setSelectedStatus('ALL')
                }
              : {
                  type: 'tournaments',
                  title: 'No Tournaments Found',
                  sentence: 'No tournaments match your current game or category filters.',
                  ctaText: 'Reset Filters',
                  secondaryCtaText: 'Browse All Tournaments',
                  onCtaClick: () => {
                    setSearchQuery('')
                    setSelectedGame('All')
                    setSelectedStatus('ALL')
                    setVisibleCount(6)
                  },
                  onSecondaryCtaClick: () => {
                    setSelectedGame('All')
                    setSelectedStatus('ALL')
                  }
                }
            return <EmptyState {...emptyProps} />
          })()
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-stretch">
              {visibleTournaments.map((t) => {
                const modeInfo = getTournamentMode(t)
                const filledPlayerSlots = calculateFilledPlayerSlots(t)
                const totalPlayerSlots = calculateTotalPlayerSlots(t)
                const fillPercentage = calculateSlotFillPercentage(t)

                const filledTeams = Number(t.registeredTeams || t.registered_teams || 0)
                const totalTeams = Number(t.maxTeams || t.max_teams || 12)
                const isCompleted = t.status === 'Completed' || t.status === 'Closed' || t.status === 'Finished'
                const isFull = filledTeams >= totalTeams || isCompleted
                const entryFee = t.entryFee || t.entry_fee || 'Free'
                const startTime = t.startDate || t.start_date || 'Today, 18:00 IST'
                const formatLabel = t.mode || t.format || t.matchFormat || t.match_format || 'Squad'
                const cardImage = getTournamentImage(t)

                // Determine badge style based on tournament status
                const getStatusBadge = (statusStr) => {
                  const s = (statusStr || '').toLowerCase()
                  if (s.includes('live')) {
                    return (
                      <span className="bg-[#FF0055]/20 text-[#FF0055] border border-[#FF0055]/50 animate-pulse px-2.5 py-1 rounded-md text-xs font-extrabold font-label uppercase tracking-wider shadow-sm">
                        ● Live
                      </span>
                    )
                  }
                  if (s.includes('almost full')) {
                    return (
                      <span className="bg-amber-500/20 text-amber-400 border border-amber-500/40 px-2.5 py-1 rounded-md text-xs font-extrabold font-label uppercase tracking-wider shadow-sm">
                        Almost Full
                      </span>
                    )
                  }
                  if (s.includes('starts soon')) {
                    return (
                      <span className="bg-purple-500/20 text-purple-300 border border-purple-500/40 px-2.5 py-1 rounded-md text-xs font-extrabold font-label uppercase tracking-wider shadow-sm">
                        Starts Soon
                      </span>
                    )
                  }
                  if (s.includes('completed') || s.includes('finished')) {
                    return (
                      <span className="bg-gray-800 text-gray-400 border border-gray-700 px-2.5 py-1 rounded-md text-xs font-extrabold font-label uppercase tracking-wider">
                        Completed
                      </span>
                    )
                  }
                  return (
                    <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2.5 py-1 rounded-md text-xs font-extrabold font-label uppercase tracking-wider shadow-sm">
                      Registration Open
                    </span>
                  )
                }

                return (
                  <article
                    key={`tourn-card-${t.id}`}
                    className={`bg-[#1E1E1E] rounded-xl border border-[#333333] overflow-hidden hover:border-[#00FFFF]/50 hover:shadow-[0_0_20px_rgba(0,255,255,0.15)] transition-all duration-300 group flex flex-col justify-between h-full ${
                      isCompleted ? 'opacity-80' : ''
                    }`}
                  >
                    {/* Cover Image & Game / Format / Status Badges */}
                    <div className="rounded-t-xl overflow-hidden relative">
                      <div
                        className={`h-40 w-full bg-cover bg-center transition-transform duration-500 group-hover:scale-105 ${
                          isCompleted ? 'grayscale group-hover:grayscale-0' : ''
                        }`}
                        style={{ backgroundImage: `url(${cardImage})` }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-t from-[#1E1E1E] via-transparent to-black/50"></div>
                        
                        <div className="absolute top-3 left-3 flex items-center gap-1.5 z-10">
                          <span className="bg-[#121212]/90 backdrop-blur-md px-2.5 py-1 rounded-md text-xs font-extrabold font-label text-white border border-[#333333] shadow-sm">
                            {t.game}
                          </span>
                          <span className="bg-[#00FFFF]/10 backdrop-blur-md px-2 py-1 rounded-md text-[11px] font-extrabold font-label text-[#00FFFF] border border-[#00FFFF]/30 uppercase tracking-wider shadow-sm">
                            {formatLabel}
                          </span>
                        </div>

                        <div className="absolute top-3 right-3 z-10">
                          {getStatusBadge(t.status)}
                        </div>
                      </div>
                    </div>

                    {/* Card Content Body */}
                    <div className="p-5 sm:p-6 flex flex-col flex-grow justify-between">
                      <div>
                        <h3 className="font-headline font-black text-lg sm:text-xl text-white mb-2 group-hover:text-[#00FFFF] transition-colors leading-snug line-clamp-1">
                          {t.title}
                        </h3>
                        <p className="text-xs sm:text-sm text-[#A0A0A0] font-label mb-5 flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-[#00FFFF] shrink-0" />
                          <span>{startTime}</span>
                        </p>
                      </div>

                      <div className="mt-auto space-y-4">
                        {/* Stat Box Grid (2 cols) */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-[#252525] p-3.5 rounded-lg border border-[#333333] flex flex-col justify-center">
                            <div className="text-[11px] text-[#A0A0A0] font-label uppercase tracking-wider mb-0.5">Prize Pool</div>
                            <div className="font-headline font-black text-[#00FFFF] text-lg sm:text-xl leading-tight">{formatTournamentPrize(t)}</div>
                          </div>
                          <div className="bg-[#252525] p-3.5 rounded-lg border border-[#333333] flex flex-col justify-center">
                            <div className="text-[11px] text-[#A0A0A0] font-label uppercase tracking-wider mb-0.5">Entry Fee</div>
                            <div className="font-headline font-extrabold text-white text-base sm:text-lg leading-tight">{entryFee}</div>
                          </div>
                        </div>

                        {/* Slot Capacity Progress Bar */}
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs font-label">
                            <span className="text-[#A0A0A0] font-medium">Registration Progress</span>
                            <span className={isFull ? 'text-[#FF0055] font-extrabold' : 'text-white font-extrabold'}>
                              {isCompleted ? 'Finished' : isFull ? 'Closed (Full)' : `${filledPlayerSlots}/${totalPlayerSlots} Players (${filledTeams}/${totalTeams} ${modeInfo.teamUnit})`}
                            </span>
                          </div>
                          <div className="w-full bg-[#262626] border border-[#333333]/80 rounded-full h-2.5 sm:h-3 overflow-hidden p-0.5">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                isFull
                                  ? 'bg-[#FF0055]'
                                  : 'bg-gradient-to-r from-[#00FFFF] via-[#00FFFF] to-[#00FFFF]/60 shadow-[0_0_8px_rgba(0,255,255,0.4)]'
                              }`}
                              style={{ width: `${fillPercentage}%` }}
                            ></div>
                          </div>
                        </div>

                        {/* CTA Button */}
                        {isCompleted ? (
                          <Link
                            to={t?.id ? `/tournaments/${t.id}` : '/tournaments'}
                            className="w-full py-3 rounded-lg bg-[#252525] text-[#A0A0A0] hover:text-white font-label font-extrabold text-xs transition-colors text-center block uppercase tracking-wider border border-[#333333]"
                          >
                            View Results & Summary
                          </Link>
                        ) : (
                          <Link
                            to={t?.id ? `/tournaments/${t.id}` : '/tournaments'}
                            className="w-full py-3 rounded-lg border border-[#00FFFF] text-[#00FFFF] hover:bg-[#00FFFF] hover:text-black font-label font-extrabold text-sm transition-all duration-200 text-center block uppercase tracking-wider shadow-[0_0_12px_rgba(0,255,255,0.15)] active:scale-98"
                          >
                            View Details
                          </Link>
                        )}
                      </div>
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


