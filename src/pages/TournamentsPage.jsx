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
  getTournamentStatusState,
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

  const featuredStatusState = useMemo(() => {
    return featuredTournament ? getTournamentStatusState(featuredTournament) : null
  }, [featuredTournament])

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
        (selectedGame.toLowerCase().includes('free fire') && (t.game || '').toLowerCase().includes('free fire')) ||
        (selectedGame.toLowerCase().includes('bgmi') && (t.game || '').toLowerCase().includes('bgmi'))

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

  // Helper to render dynamic status badge with UI-1 tokens
  const renderStatusBadge = (stateObj) => {
    switch (stateObj.state) {
      case 'LIVE':
        return (
          <span className="bg-[#ff5e07]/20 backdrop-blur-md text-[#ff5e07] border border-[#ff5e07]/40 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs font-bold font-headline uppercase tracking-wider shadow-sm flex items-center gap-1.5 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ff5e07]" />
            LIVE
          </span>
        )
      case 'ALMOST_FULL':
        return (
          <span className="bg-[#fed83a]/15 backdrop-blur-md text-[#fed83a] border border-[#fed83a]/40 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs font-bold font-headline uppercase tracking-wider shadow-sm">
            ALMOST FULL
          </span>
        )
      case 'FULL':
        return (
          <span className="bg-[#ef4444]/15 backdrop-blur-md text-[#ef4444] border border-[#ef4444]/40 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs font-bold font-headline uppercase tracking-wider shadow-sm">
            FULL
          </span>
        )
      case 'CLOSED':
        return (
          <span className="bg-[#201f20]/90 backdrop-blur-md text-[#849495] border border-[#27272a] px-2 sm:px-2.5 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs font-bold font-headline uppercase tracking-wider">
            CLOSED
          </span>
        )
      case 'UPCOMING':
        return (
          <span className="bg-[#fed83a]/15 backdrop-blur-md text-[#fed83a] border border-[#fed83a]/40 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs font-bold font-headline uppercase tracking-wider shadow-sm">
            UPCOMING
          </span>
        )
      case 'COMPLETED':
        return (
          <span className="bg-[#141416]/90 backdrop-blur-md text-[#849495] border border-[#27272a] px-2 sm:px-2.5 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs font-bold font-headline uppercase tracking-wider">
            COMPLETED
          </span>
        )
      case 'OPEN':
      default:
        return (
          <span className="bg-[#10b981]/15 backdrop-blur-md text-[#10b981] border border-[#10b981]/40 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs font-bold font-headline uppercase tracking-wider shadow-sm flex items-center gap-1">
            OPEN
          </span>
        )
    }
  }

  return (
    <div className="w-full min-h-screen bg-[#131314] text-[#b9cacb] pb-28 sm:pb-32 font-body antialiased overflow-x-hidden">
      <main className="max-w-7xl mx-auto pt-6 px-4 sm:px-6 lg:px-8 flex flex-col gap-8">

        {/* 1. STITCH FEATURED TOURNAMENT HERO BANNER */}
        {featuredTournament && !searchQuery && (
          <section className="relative rounded overflow-hidden border border-[#27272a] group shadow-2xl bg-[#141416]">
            <div className="absolute inset-0 bg-gradient-to-t from-[#131314] via-[#131314]/80 via-60% to-black/40 z-10"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-[#131314]/80 via-transparent to-transparent z-10"></div>
            <div
              className="h-[240px] xs:h-[260px] sm:h-80 md:h-[420px] w-full bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
              style={{
                backgroundImage: `url(${getTournamentImage(featuredTournament)})`
              }}
            ></div>

            <div className="absolute bottom-0 left-0 w-full p-4 sm:p-8 md:p-10 z-20 flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6 md:gap-8">
              <div className="space-y-2 sm:space-y-4 max-w-2xl">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded text-[11px] sm:text-xs font-bold bg-[#00f2ff]/10 text-[#00f2ff] border border-[#00f2ff]/30 uppercase tracking-wider font-label-bold shadow-[0_0_15px_rgba(0,242,255,0.2)]">
                  <Sparkles className="w-3.5 h-3.5" />
                  Featured Arena Event
                </span>
                <h2 className="text-xl xs:text-2xl sm:text-4xl md:text-5xl font-extrabold font-headline text-white tracking-tight drop-shadow-md leading-tight line-clamp-1 sm:line-clamp-none">
                  {featuredTournament.title || 'Global Clash Championship'}
                </h2>
                <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-[#b9cacb] text-xs sm:text-sm font-label pt-0.5">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#00f2ff]" />
                    {featuredTournament.startDate || 'Upcoming Schedule'}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#00f2ff]" />
                    {featuredTournament.registeredTeams || 0}/{featuredTournament.maxTeams || 100} {getTournamentMode(featuredTournament).teamUnit}
                  </span>
                </div>
              </div>

              <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-start gap-3 shrink-0 w-full md:w-auto">
                <div className="text-left md:text-right">
                  <div className="text-[#849495] text-[10px] sm:text-xs uppercase font-bold font-label-bold tracking-wider mb-0.5">Prize Pool</div>
                  <div className="text-xl sm:text-3xl md:text-4xl font-extrabold font-headline text-[#ff5e07] drop-shadow-sm leading-tight">
                    {formatTournamentPrize(featuredTournament)}
                  </div>
                </div>
                <Link
                  to={featuredTournament?.id ? `/tournaments/${featuredTournament.id}` : '/tournaments'}
                  className="bg-[#00f2ff] text-[#00363a] font-bold px-6 sm:px-8 py-2.5 sm:py-3.5 rounded hover:bg-[#74f5ff] transition-all font-headline text-center shadow-[0_0_20px_rgba(0,242,255,0.35)] uppercase tracking-wider text-xs sm:text-sm min-h-[42px] sm:min-h-[44px] flex items-center justify-center cursor-pointer active:scale-95 shrink-0"
                >
                  {featuredStatusState?.isFull || featuredStatusState?.isClosed || featuredStatusState?.isCompleted ? 'View Details' : 'Register Now'}
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* 2. STITCH FILTERS AND TABS (STICKY BAR) */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 sticky top-0 z-40 bg-[#131314]/95 backdrop-blur-xl py-3.5 sm:py-4 border-b border-[#27272a] shadow-xl -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 transition-all duration-200">
          {/* Game Category Tabs (Horizontally scrollable with no clipping) */}
          <div className="w-full lg:w-auto overflow-x-auto hide-scrollbar pb-1 lg:pb-0">
            <div className="flex items-center gap-2 min-w-max">
              {gamesList.map((game) => {
                const isActive = selectedGame === game
                return (
                  <button
                    key={`game-tab-${game}`}
                    onClick={() => {
                      setSelectedGame(game)
                      setVisibleCount(6)
                    }}
                    className={`flex-shrink-0 px-4 sm:px-5 py-2.5 rounded font-headline text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer flex items-center gap-1.5 min-h-[44px] select-none ${
                      isActive
                        ? 'bg-[#00f2ff] text-[#00363a] font-bold shadow-[0_0_15px_rgba(0,242,255,0.35)]'
                        : 'bg-[#141416] border border-[#27272a] text-[#b9cacb] font-bold hover:text-white hover:border-[#00f2ff] hover:bg-[#201f20]'
                    }`}
                  >
                    {game === 'All' ? 'ALL GAMES' : game.toUpperCase()}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Search & Status Tabs */}
          <div className="flex flex-col sm:flex-row items-center gap-3.5 w-full lg:w-auto">
            {/* Search Input */}
            <div className="relative w-full sm:w-64 md:w-72">
              <Search className="w-4 h-4 text-[#849495] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setVisibleCount(6)
                }}
                placeholder="Search tournaments..."
                className="w-full bg-[#141416] border border-[#27272a] rounded pl-10 pr-4 py-2 text-xs sm:text-sm text-[#e5e2e3] placeholder-[#849495] focus:border-[#00f2ff] focus:ring-1 focus:ring-[#00f2ff]/30 focus:outline-none transition-all duration-200 h-[44px] font-body"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#849495] hover:text-white bg-[#201f20] px-2 py-1 rounded font-headline uppercase"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Status Segmented Tabs (Horizontally scrollable with no clipped 'COMPLETED') */}
            <div className="w-full sm:w-auto overflow-x-auto hide-scrollbar">
              <div className="flex items-center bg-[#141416] border border-[#27272a] rounded p-1 min-w-max gap-1">
                {statusChips.map((st) => {
                  const isActive = selectedStatus === st
                  return (
                    <button
                      key={`status-chip-${st}`}
                      onClick={() => {
                        setSelectedStatus(st)
                        setVisibleCount(6)
                      }}
                      className={`px-3.5 sm:px-4 py-2 rounded font-headline text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer min-h-[40px] flex items-center justify-center shrink-0 select-none ${
                        isActive
                          ? 'bg-[#00f2ff] text-[#00363a] font-bold shadow-[0_0_12px_rgba(0,242,255,0.3)]'
                          : 'text-[#b9cacb] font-bold hover:text-white hover:bg-[#201f20]'
                      }`}
                    >
                      {st === 'ALL' ? 'ALL' : st === 'UPCOMING' ? 'UPCOMING' : st === 'LIVE NOW' ? 'LIVE' : 'COMPLETED'}
                    </button>
                  )
                })}
              </div>
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
                const statusState = getTournamentStatusState(t)
                const isFull = statusState.isFull
                const isCompleted = statusState.isCompleted
                const entryFee = t.entryFee || t.entry_fee || 'Free'
                const startTime = t.startDate || t.start_date || 'Today, 18:00 IST'
                const formatLabel = t.mode || t.format || t.matchFormat || t.match_format || 'Squad'
                const cardImage = getTournamentImage(t)

                // Registration progress text
                const progressText = isCompleted
                  ? 'Finished'
                  : modeInfo.mode === 'Solo'
                  ? `${filledPlayerSlots}/${totalPlayerSlots} Players`
                  : `${filledPlayerSlots}/${totalPlayerSlots} Players (${filledTeams}/${totalTeams} ${modeInfo.teamUnit})`

                return (
                  <article
                    key={`tourn-card-${t.id}`}
                    className={`bg-[#141416] rounded border border-[#27272a] overflow-hidden hover:border-[#00f2ff] hover:shadow-[0_0_20px_rgba(0,242,255,0.15)] transition-all duration-200 group flex flex-col justify-between h-full ${
                      isCompleted ? 'opacity-85' : ''
                    }`}
                  >
                    {/* Cover Image & Game / Format / Dynamic Status Badges */}
                    <div className="rounded-t overflow-hidden relative">
                      <div
                        className={`h-40 sm:h-48 w-full bg-cover bg-center transition-transform duration-300 group-hover:scale-105 ${
                          isCompleted ? 'grayscale group-hover:grayscale-0' : ''
                        }`}
                        style={{ backgroundImage: `url(${cardImage})` }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-t from-[#141416] via-transparent to-black/60"></div>
                        
                        {/* Top Badges Bar: Left (Game & Mode) and Right (Status) with safe bounds */}
                        <div className="absolute top-2.5 inset-x-2.5 sm:top-3 sm:inset-x-3 flex items-start justify-between gap-2 z-10 pointer-events-none">
                          {/* Left Badges: Game + Mode */}
                          <div className="flex flex-wrap items-center gap-1.5 max-w-[65%] min-w-0">
                            <span className="bg-[#131314]/90 backdrop-blur-md px-2.5 py-0.5 rounded text-[11px] sm:text-xs font-bold font-headline text-white border border-[#27272a] shadow-sm">
                              {t.game}
                            </span>
                            <span className="bg-[#00f2ff]/10 backdrop-blur-md px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-bold font-headline text-[#00f2ff] border border-[#00f2ff]/30 uppercase tracking-wider shadow-sm shrink-0">
                              {formatLabel}
                            </span>
                          </div>

                          {/* Right Badge: Dynamic Registration Status (Never collides) */}
                          <div className="flex items-center justify-end shrink-0">
                            {renderStatusBadge(statusState)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card Content Body (25-30% more compact on mobile, desktop unchanged) */}
                    <div className="p-4 sm:p-6 flex flex-col flex-grow justify-between">
                      <div>
                        {/* Image -> Title (18-24px total) */}
                        <h3 className="font-headline font-bold text-base xs:text-lg sm:text-xl text-white mb-1.5 sm:mb-2 group-hover:text-[#00f2ff] transition-colors leading-snug line-clamp-1">
                          {t.title}
                        </h3>
                        {/* Title -> Date (12-16px) */}
                        <p className="text-xs text-[#b9cacb] font-body mb-3.5 sm:mb-5 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#00f2ff] shrink-0" />
                          <span>{startTime}</span>
                        </p>
                      </div>

                      {/* Date -> Prize/Entry boxes (18-22px) */}
                      <div className="mt-auto space-y-3 sm:space-y-4">
                        {/* Stat Box Grid (2 cols, 105-120px height on mobile) */}
                        <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                          <div className="bg-[#1c1b1c] p-2.5 sm:p-3.5 rounded border border-[#27272a] flex flex-col justify-center min-h-[72px] sm:min-h-[84px]">
                            <div className="text-[10px] text-[#849495] font-label-bold uppercase tracking-wider mb-0.5">Prize Pool</div>
                            <div className="font-headline font-bold text-[#ff5e07] text-base xs:text-lg sm:text-xl leading-tight">{formatTournamentPrize(t)}</div>
                          </div>
                          <div className="bg-[#1c1b1c] p-2.5 sm:p-3.5 rounded border border-[#27272a] flex flex-col justify-center min-h-[72px] sm:min-h-[84px]">
                            <div className="text-[10px] text-[#849495] font-label-bold uppercase tracking-wider mb-0.5">Entry Fee</div>
                            <div className="font-headline font-bold text-white text-sm xs:text-base sm:text-lg leading-tight">{entryFee}</div>
                          </div>
                        </div>

                        {/* Prize/Entry boxes -> Registration Progress (18-22px) */}
                        <div className="space-y-1.5 sm:space-y-2">
                          <div className="flex justify-between text-xs font-label">
                            <span className="text-[#849495] text-[10.5px] sm:text-[11px] font-medium font-label-bold">Registration Progress</span>
                            <span className={isFull ? 'text-red-400 font-bold text-[10.5px] sm:text-[11px]' : 'text-[#00f2ff] font-bold text-[10.5px] sm:text-[11px]'}>
                              {progressText}
                            </span>
                          </div>
                          <div className="w-full bg-[#0e0e0f] border border-[#27272a] rounded-full h-1.5 sm:h-2.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                isFull
                                  ? 'bg-red-500'
                                  : isCompleted
                                  ? 'bg-[#3a393a]'
                                  : 'bg-gradient-to-r from-[#ff5e07] to-[#00f2ff]'
                              }`}
                              style={{ width: `${isFull ? 100 : fillPercentage}%` }}
                            ></div>
                          </div>
                        </div>

                        {/* Progress -> View Details CTA Button (18-22px, centered text) */}
                        {isCompleted ? (
                          <Link
                            to={t?.id ? `/tournaments/${t.id}` : '/tournaments'}
                            className="w-full py-2.5 sm:py-3 rounded bg-[#1c1b1c] text-[#b9cacb] hover:text-white font-headline font-bold text-xs transition-colors text-center block uppercase tracking-wider border border-[#27272a] hover:border-[#849495] min-h-[44px] flex items-center justify-center cursor-pointer"
                          >
                            View Results & Summary
                          </Link>
                        ) : isFull ? (
                          <Link
                            to={t?.id ? `/tournaments/${t.id}` : '/tournaments'}
                            className="w-full py-2.5 sm:py-3 rounded bg-[#1c1b1c] text-[#e5e2e3] hover:text-[#00f2ff] font-headline font-bold text-xs transition-all duration-200 text-center block uppercase tracking-wider border border-[#27272a] hover:border-[#00f2ff] min-h-[44px] flex items-center justify-center cursor-pointer"
                          >
                            View Details
                          </Link>
                        ) : (
                          <Link
                            to={t?.id ? `/tournaments/${t.id}` : '/tournaments'}
                            className="w-full py-2.5 sm:py-3 rounded bg-[#1c1b1c] hover:bg-[#00f2ff] text-white hover:text-[#00363a] font-headline font-bold text-xs transition-all duration-200 text-center block uppercase tracking-wider border border-[#27272a] hover:border-[#00f2ff] hover:shadow-[0_0_15px_rgba(0,242,255,0.25)] min-h-[44px] flex items-center justify-center cursor-pointer active:scale-95"
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
                  className="px-8 py-3 rounded bg-[#141416] hover:bg-[#201f20] border border-[#27272a] hover:border-[#00f2ff] text-xs font-headline font-bold text-[#00f2ff] uppercase tracking-wider transition-all min-h-[44px] shadow-lg cursor-pointer"
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



