import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { GameTabs } from '../components/stitch/GameTabs'
import { HeroBanner } from '../components/stitch/HeroBanner'
import { TournamentCard } from '../components/stitch/TournamentCard'
import { FeaturedTournamentCard } from '../components/stitch/FeaturedTournamentCard'
import { ScheduleWidget } from '../components/stitch/ScheduleWidget'
import { LeaderboardWidget } from '../components/stitch/LeaderboardWidget'
import { LiveStreamModal } from '../components/stitch/LiveStreamModal'
import { StatsSection } from '../components/home/StatsSection'
import { AnnouncementsSection } from '../components/home/AnnouncementsSection'
import { useTournaments } from '../contexts/TournamentContext'
import { ArrowRight, Trophy, Sparkles, Flame, Zap, Shield, HelpCircle } from 'lucide-react'

export default function Home() {
  const { tournaments, loading } = useTournaments()
  const [selectedGame, setSelectedGame] = useState('ALL')
  const [isStreamModalOpen, setIsStreamModalOpen] = useState(false)

  // Filter Tournaments by Game Tab Selection
  const filteredTournaments = useMemo(() => {
    if (selectedGame === 'ALL') return tournaments
    return tournaments.filter((t) => (t.game || '').toLowerCase().includes(selectedGame.toLowerCase()))
  }, [tournaments, selectedGame])

  const featuredMatch = filteredTournaments[0]
  const regularMatches = filteredTournaments.slice(1)

  // Derive Dynamic Platform Statistics
  const dynamicStats = useMemo(() => {
    let totalPrize = 0
    let totalRegisteredSlots = 0
    let liveCount = 0
    let completedCount = 0

    tournaments.forEach((t) => {
      const prize = parseInt((t.prizePool || t.prize_pool || '0').replace(/[^0-9]/g, ''), 10) || 0
      totalPrize += prize

      const registered = Number(t.registeredTeams ?? t.registered_teams ?? 0)
      totalRegisteredSlots += registered

      if (t.status === 'Live Now') {
        liveCount += 1
      } else if (t.status === 'Completed') {
        completedCount += 1
      }
    })

    return {
      activePlayers: totalRegisteredSlots,
      totalPrizePool: `₹${totalPrize.toLocaleString()}`,
      matchesCompleted: completedCount,
      liveTournaments: liveCount,
    }
  }, [tournaments])

  return (
    <div className="w-full min-h-screen bg-[#0b0e11] text-[#e1e2e7] pt-6 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      
      {/* 1. Header & Game Category Filter Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#3a494b]/40 pb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#00f2ff] animate-pulse" />
          <h2 className="text-xs sm:text-sm font-bold uppercase tracking-widest text-[#b9cacb]">
            Arena Tournament Hub
          </h2>
        </div>
        <GameTabs selectedGame={selectedGame} onSelectGame={setSelectedGame} />
      </div>

      {/* 2. Hero Showcase Section */}
      <HeroBanner
        title={featuredMatch?.title || 'MJ ESPORTS ARENA TOURNAMENTS'}
        prizePool={featuredMatch?.prizePool || '₹0'}
        timer="LIVE NOW"
        onWatchLive={() => setIsStreamModalOpen(true)}
      />

      {/* 3. Executive Platform Statistics Section */}
      <StatsSection stats={dynamicStats} />

      {/* 4. Official Announcements Ticker */}
      <AnnouncementsSection />

      {/* 5. Main 12-Column Esports Grid Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* Left Column (8 Cols): Tournament Cards Grid */}
        <div className="xl:col-span-8 space-y-6">
          <div className="flex justify-between items-end border-b border-[#3a494b]/40 pb-3">
            <div className="flex items-center gap-2">
              <Trophy className="w-6 h-6 text-[#fe6b00]" />
              <h2 className="font-display-lg text-xl sm:text-3xl font-extrabold text-[#00f2ff] uppercase tracking-tight">
                ACTIVE TOURNAMENTS
              </h2>
            </div>
            <Link
              to="/tournaments"
              className="text-xs font-bold text-[#00f2ff] hover:text-[#74f5ff] flex items-center gap-1 uppercase tracking-wider transition-colors"
            >
              <span>VIEW ALL</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Loading Skeletons State */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {[1, 2, 3, 4].map((i) => (
                <div key={`home-skel-${i}`} className="h-64 bg-[#151a21] border border-[#3a494b]/40 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filteredTournaments.length === 0 ? (
            /* Required Empty State */
            <div className="p-12 text-center bg-[#151a21] border border-[#3a494b]/60 rounded-xl space-y-3 shadow-xl">
              <Flame className="w-10 h-10 text-[#fe6b00] mx-auto opacity-70" />
              <h3 className="text-base font-bold text-[#e1e2e7] uppercase">No Tournaments Available</h3>
              <p className="text-xs text-[#8e9dae] max-w-md mx-auto">
                No active matches found for the selected game category. Check back soon for upcoming tournaments!
              </p>
              <Link
                to="/tournaments"
                className="inline-block mt-2 px-5 py-2.5 bg-[#00f2ff] text-[#00363a] text-xs font-extrabold rounded uppercase tracking-wider hover:brightness-110 shadow-[0_0_12px_rgba(0,242,255,0.4)]"
              >
                Browse All Competitions
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Wide Featured Tournament Card */}
              {featuredMatch && <FeaturedTournamentCard tournament={featuredMatch} />}

              {/* Standard Tournament Cards */}
              {regularMatches.map((t) => (
                <TournamentCard key={`stitch-home-card-${t.id}`} tournament={t} />
              ))}
            </div>
          )}
        </div>

        {/* Right Column (4 Cols): Widgets (Schedule & Leaderboard) */}
        <div className="xl:col-span-4 flex flex-col gap-6">
          <ScheduleWidget />
          <LeaderboardWidget />
        </div>

      </div>

      {/* Live Stream Modal */}
      {isStreamModalOpen && (
        <LiveStreamModal onClose={() => setIsStreamModalOpen(false)} />
      )}

    </div>
  )
}
