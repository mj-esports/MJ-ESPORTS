import { useState, useMemo, lazy, Suspense } from 'react'
import { Link } from 'react-router-dom'
import { useTournaments } from '../contexts/TournamentContext'
import { AnnouncementsSection } from '../components/home/AnnouncementsSection'
import { StatsSection } from '../components/home/StatsSection'
import EmptyState from '../components/common/EmptyState'
import { Trophy, Flame, Calendar, Gamepad2, ArrowRight, Radio, ShieldCheck, Sparkles, CheckCircle2 } from 'lucide-react'

const LiveStreamModal = lazy(() => import('../components/stitch/LiveStreamModal'))

export default function Home() {
  const { tournaments, loading } = useTournaments()
  const [isStreamModalOpen, setIsStreamModalOpen] = useState(false)

  // 1. Derive Live Match (Is there a live tournament?)
  const liveMatch = useMemo(() => {
    return tournaments.find((t) => t.status === 'Live Now') || null
  }, [tournaments])

  // 2. Derive Upcoming / Open Registration Match (Can I register?)
  const upcomingMatches = useMemo(() => {
    return tournaments.filter((t) => t.status === 'Registration Open').slice(0, 2)
  }, [tournaments])

  // 3. Derive Platform Statistics
  const dynamicStats = useMemo(() => {
    let totalPrize = 0
    let totalRegisteredSlots = 0
    let liveCount = 0
    let completedCount = 0

    tournaments.forEach((t) => {
      const prize = parseInt((t.prizePool || t.prize_pool || '0').replace(/[^0-9]/g, ''), 10) || 0
      totalPrize += prize
      totalRegisteredSlots += Number(t.registeredTeams ?? t.registered_teams ?? 0)

      if (t.status === 'Live Now') liveCount += 1
      else if (t.status === 'Completed') completedCount += 1
    })

    return {
      activePlayers: totalRegisteredSlots,
      totalPrizePool: `₹${totalPrize.toLocaleString()}`,
      matchesCompleted: completedCount,
      liveTournaments: liveCount,
    }
  }, [tournaments])

  return (
    <div className="w-full min-h-screen bg-[#0b0e11] text-[#e1e2e7] pt-3 sm:pt-4 pb-12 px-3.5 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-3.5 sm:space-y-4 isolate relative">

      {/* 1. HERO SECTION (25% Height Compression) */}
      <section className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-3.5 sm:p-5 space-y-2.5 shadow-md text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-4 isolate relative overflow-hidden">
        <div className="space-y-1 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#00f2ff]/10 border border-[#00f2ff]/30 text-[#00f2ff] text-[10px] font-bold uppercase tracking-widest">
            <Sparkles className="w-3 h-3" />
            <span>MJ ESPORTS ARENA</span>
          </div>
          <h1 className="font-display-lg text-lg sm:text-2xl font-extrabold text-white uppercase tracking-tight">
            COMPETE IN FREE FIRE & BGMI
          </h1>
          <p className="text-[11px] sm:text-xs text-[#8e9dae] leading-snug">
            Register your squad slot and compete for verified prize pools.
          </p>
        </div>

        {/* 1 Primary CTA */}
        <Link
          to="/tournaments"
          className="btn-cyber-primary text-xs px-4 py-2 w-full sm:w-auto shrink-0 min-h-[44px] flex items-center justify-center gap-1.5"
        >
          <span>Browse Competitions</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </section>

      {/* 2. ANNOUNCEMENTS SECTION (Question: Any announcements?) */}
      <section className="isolate relative">
        <AnnouncementsSection />
      </section>

      {/* 3. LIVE TOURNAMENT SECTION (Question: Is there a live tournament?) */}
      <section className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-4 sm:p-5 space-y-3 shadow-xl isolate relative overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#3a494b]/60 pb-3">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-[#00f2ff] animate-pulse" />
            <h2 className="font-display-lg text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
              LIVE TOURNAMENT STATUS
            </h2>
          </div>
          <span className="px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase bg-[#00f2ff]/10 text-[#00f2ff] border border-[#00f2ff]/40">
            {liveMatch ? 'MATCH IN PROGRESS' : 'ARENA STANDBY'}
          </span>
        </div>

        {liveMatch ? (
          <div className="p-3.5 bg-[#07090c] rounded-lg border border-[#00f2ff]/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-[9px] font-bold uppercase bg-[#fe6b00]/10 text-[#fe6b00] border border-[#fe6b00]/40 rounded">
                  {liveMatch.game}
                </span>
                <span className="font-mono text-[10px] text-[#ffb693] font-bold">Prize: {liveMatch.prizePool}</span>
              </div>
              <h3 className="font-extrabold text-white text-sm uppercase">{liveMatch.title}</h3>
            </div>

            {/* 1 CTA for Live Tournament Section */}
            <button
              onClick={() => setIsStreamModalOpen(true)}
              className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-[#00f2ff] text-[#00363a] font-extrabold text-xs hover:bg-[#74f5ff] transition-all flex items-center justify-center gap-1.5 uppercase min-h-[44px] shrink-0 shadow-md"
            >
              <Radio className="w-4 h-4" />
              <span>Watch Live Stream</span>
            </button>
          </div>
        ) : (
          <EmptyState type="matches" sentence="No live matches currently in progress." ctaText="Browse Schedule" ctaLink="/tournaments" />
        )}
      </section>

      {/* 4. UPCOMING TOURNAMENT SECTION (Question: Can I register?) */}
      <section className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-4 sm:p-5 space-y-4 shadow-xl isolate relative overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#3a494b]/60 pb-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-[#fe6b00]" />
            <h2 className="font-display-lg text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
              OPEN REGISTRATIONS
            </h2>
          </div>
          <Link
            to="/tournaments"
            className="text-[11px] font-bold text-[#00f2ff] hover:underline flex items-center gap-1 uppercase"
          >
            <span>View All &rarr;</span>
          </Link>
        </div>

        {upcomingMatches.length === 0 ? (
          <EmptyState type="tournaments" sentence="No tournaments are currently open for registration." ctaText="Browse Open Tournaments" ctaLink="/tournaments" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {upcomingMatches.map((t) => {
              const filled = t.registeredTeams || 0
              const total = t.maxTeams || 32
              return (
                <div
                  key={`home-open-match-${t.id}`}
                  className="p-3.5 bg-[#07090c] rounded-lg border border-[#3a494b]/60 space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="px-2 py-0.5 rounded font-extrabold bg-[#00f2ff]/10 text-[#00f2ff] border border-[#00f2ff]/30 uppercase">
                        {t.game}
                      </span>
                      <span className="text-[#00ff9d] font-bold uppercase">Registration Open</span>
                    </div>
                    <h3 className="font-extrabold text-white text-sm truncate uppercase">{t.title}</h3>
                    <div className="flex items-center justify-between text-[11px] text-[#8e9dae]">
                      <span>Prize: <strong className="text-[#ffb693] font-mono">{t.prizePool}</strong></span>
                      <span>Slots: <strong className="text-white font-mono">{filled}/{total}</strong></span>
                    </div>
                  </div>

                  {/* 1 CTA for Upcoming Tournament Section */}
                  <Link
                    to={`/tournaments/${t.id}`}
                    className="w-full py-2.5 rounded-lg bg-[#00f2ff] text-[#00363a] font-extrabold text-xs hover:bg-[#74f5ff] transition-all flex items-center justify-center gap-1.5 uppercase min-h-[44px] tracking-wider"
                  >
                    <span>Register Squad Slot</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* 5. STATISTICS SECTION (Question: Current statistics?) */}
      <section className="isolate relative space-y-2">
        <div className="flex items-center gap-2 px-1">
          <ShieldCheck className="w-4 h-4 text-[#00ff9d]" />
          <h2 className="font-display-lg text-xs font-bold text-white uppercase tracking-wider">
            ARENA TELEMETRY & STATS
          </h2>
        </div>
        <StatsSection stats={dynamicStats} />
      </section>

      {/* Live Stream Modal */}
      {isStreamModalOpen && (
        <Suspense fallback={null}>
          <LiveStreamModal onClose={() => setIsStreamModalOpen(false)} />
        </Suspense>
      )}

    </div>
  )
}
