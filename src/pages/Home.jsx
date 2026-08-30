import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTournaments } from '../contexts/TournamentContext'
import { useAuth } from '../contexts/AuthContext'
import SkeletonLoader from '../components/common/SkeletonLoader'
import {
  Swords,
  Gamepad2,
  Wallet,
  Trophy,
  ArrowRight,
  Calendar,
  BookOpen,
  Crown,
  Medal
} from 'lucide-react'

import { getTournamentImage } from '../utils/tournamentImageUtils'
import { formatTournamentPrize, extractPerKillAmount } from '../utils/tournamentPrizeUtils'
import {
  calculateFilledPlayerSlots,
  calculateTotalPlayerSlots,
  calculateSlotFillPercentage,
} from '../utils/tournamentUtils'

export default function Home() {
  const { tournaments, loading } = useTournaments()
  const { user } = useAuth()

  const displayName = user?.user_metadata?.username || user?.email?.split('@')[0] || 'Player'

  // Upcoming Tournaments List (Maximum 2 tournament cards for home preview)
  const upcomingTournaments = useMemo(() => {
    return tournaments.filter((t) => t.status !== 'Completed').slice(0, 2)
  }, [tournaments])

  // Aggregate Top Players Standings from tournaments (real completed matches)
  const topPlayers = useMemo(() => {
    const statsMap = {}

    tournaments.forEach((t) => {
      const teams = Array.isArray(t.teams_list) ? t.teams_list : (Array.isArray(t.teamsList) ? t.teamsList : [])
      const perKillAmount = extractPerKillAmount(t) || 30

      teams.forEach((team) => {
        const name = team.team || team.name || team.captain || ''
        const player = team.captain || team.player || team.name || ''
        const uid = team.uid || team.game_uid || team.gameUid || team.free_fire_uid || team.freeFireUid || team.userId || team.user_id || ''
        if (!name || !player) return

        const kills = Number(team.kills || team.finishes || 0)
        const points = Number(team.points || team.score || 0)
        const isWinner = team.rank === 1 || team.position === 1
        const earned = kills * perKillAmount

        if (!statsMap[name]) {
          statsMap[name] = {
            team: name,
            player: player,
            uid: uid,
            points: 0,
            kills: 0,
            wins: 0,
            earnings: 0,
            avatar: team.avatar || null,
          }
        }
        if (!statsMap[name].uid && uid) {
          statsMap[name].uid = uid
        }
        if (isWinner) statsMap[name].wins += 1
        statsMap[name].points += points
        statsMap[name].kills += kills
        statsMap[name].earnings += earned
      })
    })

    return Object.values(statsMap)
      .sort((a, b) => b.points - a.points || b.kills - a.kills)
      .slice(0, 3)
  }, [tournaments])

  return (
    <div className="flex-grow flex flex-col w-full bg-[#131314] text-white font-body antialiased selection:bg-[#00f2ff]/30 selection:text-[#00f2ff]">
      
      {/* 1. HERO SECTION */}
      <section className="relative w-full min-h-[260px] sm:min-h-[300px] md:min-h-[340px] flex items-center justify-center overflow-hidden py-6 sm:py-8 md:py-10">
        <div className="absolute inset-0 z-0 transform-gpu">
          <img
            className="w-full h-full object-cover opacity-40 transform-gpu"
            alt="Esports tournament arena stage"
            loading="eager"
            fetchPriority="high"
            decoding="async"
            width="2000"
            height="1000"
            src={getTournamentImage(upcomingTournaments[0])}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#131314] via-[#131314]/75 to-transparent transform-gpu"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#131314] via-transparent to-[#131314] hidden md:block transform-gpu"></div>
        </div>

        <div className="relative z-10 text-center px-3 sm:px-4 max-w-3xl mx-auto flex flex-col items-center">
          {/* Hero Greeting */}
          <span className="px-3 py-0.5 sm:px-3.5 sm:py-1 rounded bg-[#141416] border border-[#00f2ff]/30 text-[#00f2ff] text-xs sm:text-sm font-label-bold tracking-wide mb-2 sm:mb-2.5 inline-flex items-center justify-center gap-2 shadow-[0_0_12px_rgba(0,242,255,0.18)]">
            👋 Welcome back, {displayName}
          </span>

          {/* Hero Title (Mobile: 36-40px, Desktop: 48-60px) */}
          <h1 className="font-headline font-extrabold text-[36px] xs:text-[38px] sm:text-5xl md:text-6xl tracking-tight text-white mb-2 sm:mb-2.5 drop-shadow-2xl leading-[1.08] max-w-full break-words">
            Ready for Battle?
          </h1>

          {/* Hero Tagline: Maximum 2 balanced lines on mobile, 15-16px, tighter 1.36 leading, reduced gap to CTA */}
          <p className="font-body text-[#b9cacb] text-[14px] xs:text-[15px] sm:text-[16px] md:text-[17px] max-w-2xl mx-auto mb-3 sm:mb-4 md:mb-5 font-normal leading-[1.36] sm:leading-[1.4] text-center px-1">
            Every Match Counts. Every Kill Matters. Compete in India's premier Free Fire MAX & BGMI esports tournament arena.
          </p>

          {/* Single Prominent Primary Action Button: TOURNAMENTS */}
          <div className="w-full sm:w-auto flex items-center justify-center">
            <Link
              to="/tournaments"
              className="w-full xs:w-auto h-12 sm:h-[50px] min-h-[48px] px-8 sm:px-10 bg-[#00f2ff] text-[#00363a] font-headline font-bold text-[15px] sm:text-[16px] rounded hover:bg-[#74f5ff] transition-all duration-200 shadow-[0_0_18px_rgba(0,242,255,0.3)] flex items-center justify-center gap-2.5 uppercase tracking-wider border border-[#00f2ff] active:scale-95 whitespace-nowrap min-w-[200px] max-w-full"
            >
              <span>Tournaments</span>
              <ArrowRight className="w-4 h-4 shrink-0" />
            </Link>
          </div>
        </div>
      </section>

      {/* 2. MAIN CONTAINER: DASHBOARD CONTENT (16-24px gap after Hero, 28-32px between sections, 32-40px bottom padding) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full mt-4 sm:mt-5 md:mt-6 relative z-20 pb-8 sm:pb-10 space-y-7 sm:space-y-8 md:space-y-9">

        {/* Quick Actions (Rulebook, My Matches, Wallet, Leaderboard) */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-2 xs:gap-2.5 sm:gap-3 md:gap-4" aria-label="Quick Actions">
          {/* 1. Rulebook */}
          <Link
            to="/about"
            className="flex items-center gap-2 sm:gap-2.5 px-2.5 py-2 sm:px-3 sm:py-2.5 md:p-3 rounded bg-[#141416] border border-[#27272a] hover:border-[#00f2ff]/60 hover:bg-[#18181b] transition-all duration-200 shadow-sm group min-h-[48px] h-full active:scale-[0.98]"
          >
            <div className="w-8 h-8 rounded bg-[#1c1b1c] border border-[#27272a] flex items-center justify-center shrink-0 group-hover:border-[#00f2ff]/40 group-hover:bg-[#00f2ff]/10 transition-colors">
              <BookOpen className="w-4 h-4 text-[#00f2ff] transition-transform group-hover:scale-105" />
            </div>
            <span className="flex-1 min-w-0 font-headline font-bold text-[12.5px] xs:text-[13.5px] sm:text-[14.5px] md:text-[15px] text-[#e5e2e3] group-hover:text-[#00f2ff] transition-colors leading-[1.12] uppercase tracking-wide whitespace-nowrap">
              Rulebook
            </span>
          </Link>

          {/* 2. My Matches */}
          <Link
            to="/profile/history"
            className="flex items-center gap-2 sm:gap-2.5 px-2.5 py-2 sm:px-3 sm:py-2.5 md:p-3 rounded bg-[#141416] border border-[#27272a] hover:border-[#ff5e07]/60 hover:bg-[#18181b] transition-all duration-200 shadow-sm group min-h-[48px] h-full active:scale-[0.98]"
          >
            <div className="w-8 h-8 rounded bg-[#1c1b1c] border border-[#27272a] flex items-center justify-center shrink-0 group-hover:border-[#ff5e07]/40 group-hover:bg-[#ff5e07]/10 transition-colors">
              <Gamepad2 className="w-4 h-4 text-[#ff5e07] transition-transform group-hover:scale-105" />
            </div>
            <span className="flex-1 min-w-0 font-headline font-bold text-[12.5px] xs:text-[13.5px] sm:text-[14.5px] md:text-[15px] text-[#e5e2e3] group-hover:text-[#ff5e07] transition-colors leading-[1.12] uppercase tracking-wide">
              My Matches
            </span>
          </Link>

          {/* 3. Wallet */}
          <Link
            to="/wallet"
            className="flex items-center gap-2 sm:gap-2.5 px-2.5 py-2 sm:px-3 sm:py-2.5 md:p-3 rounded bg-[#141416] border border-[#27272a] hover:border-[#10b981]/60 hover:bg-[#18181b] transition-all duration-200 shadow-sm group min-h-[48px] h-full active:scale-[0.98]"
          >
            <div className="w-8 h-8 rounded bg-[#1c1b1c] border border-[#27272a] flex items-center justify-center shrink-0 group-hover:border-[#10b981]/40 group-hover:bg-[#10b981]/10 transition-colors">
              <Wallet className="w-4 h-4 text-[#10b981] transition-transform group-hover:scale-105" />
            </div>
            <span className="flex-1 min-w-0 font-headline font-bold text-[12.5px] xs:text-[13.5px] sm:text-[14.5px] md:text-[15px] text-[#e5e2e3] group-hover:text-[#10b981] transition-colors leading-[1.12] uppercase tracking-wide whitespace-nowrap">
              Wallet
            </span>
          </Link>

          {/* 4. Leaderboard */}
          <Link
            to="/leaderboard"
            className="flex items-center gap-2 sm:gap-2.5 px-2.5 py-2 sm:px-3 sm:py-2.5 md:p-3 rounded bg-[#141416] border border-[#27272a] hover:border-[#fed83a]/60 hover:bg-[#18181b] transition-all duration-200 shadow-sm group min-h-[48px] h-full active:scale-[0.98]"
          >
            <div className="w-8 h-8 rounded bg-[#1c1b1c] border border-[#27272a] flex items-center justify-center shrink-0 group-hover:border-[#fed83a]/40 group-hover:bg-[#fed83a]/10 transition-colors">
              <Trophy className="w-4 h-4 text-[#fed83a] transition-transform group-hover:scale-105" />
            </div>
            <span className="flex-1 min-w-0 font-headline font-bold text-[12.5px] xs:text-[13.5px] sm:text-[14.5px] md:text-[15px] text-[#e5e2e3] group-hover:text-[#fed83a] transition-colors leading-[1.12] uppercase tracking-wide whitespace-nowrap">
              Leaderboard
            </span>
          </Link>
        </section>

        {loading ? (
          <div className="py-6">
            <SkeletonLoader type="card" count={2} />
          </div>
        ) : tournaments.length === 0 ? (
          <div className="py-10 text-center border border-[#27272a] bg-[#141416] rounded p-6 space-y-3 shadow-lg">
            <Trophy className="w-10 h-10 text-[#849495] mx-auto animate-pulse" />
            <h3 className="font-headline font-bold text-lg sm:text-xl text-white uppercase">No Active Tournaments Found</h3>
            <p className="text-xs text-[#b9cacb] max-w-md mx-auto">
              Check back soon for newly published tournaments, or visit our rulebook to prepare for upcoming operations.
            </p>
          </div>
        ) : (
          /* Split Screen Container: Upcoming Tournaments & Compact Top 3 Leaderboard Widget (28-36px gap between sections) */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-7 sm:gap-8 items-start">
            
            {/* Upcoming Tournaments List */}
            <section className="lg:col-span-2 space-y-3 sm:space-y-4 min-w-0">
              <div className="flex items-center justify-between gap-2 min-w-0">
                <h2 className="font-headline font-extrabold text-[22px] xs:text-[24px] sm:text-[26px] md:text-[28px] uppercase tracking-wider text-white flex items-center gap-2 sm:gap-2.5 min-w-0 leading-[1.1]">
                  <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-[#00f2ff] shrink-0" />
                  <span className="leading-[1.1]">Upcoming Tournaments</span>
                </h2>
                <Link to="/tournaments" className="text-xs sm:text-sm font-label-bold text-[#00f2ff] hover:text-[#74f5ff] transition-colors flex items-center gap-1 uppercase whitespace-nowrap shrink-0 ml-2">
                  <span>View All</span>
                  <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                {upcomingTournaments.length === 0 ? (
                  <div className="col-span-2 py-8 text-center text-xs text-[#b9cacb] font-sans bg-[#141416] rounded border border-[#27272a]">
                    No active tournaments right now.
                  </div>
                ) : (
                  upcomingTournaments.map((t, idx) => (
                    <div key={`upcoming-tourney-${t.id || t._id || idx}`} className="bg-[#141416] rounded border border-[#27272a] overflow-hidden hover:border-[#00f2ff]/60 transition-all duration-200 group flex flex-col shadow-md">
                      {/* Compact Tournament Image Banner with Game/Mode Badges */}
                      <div className="h-16 xs:h-20 sm:h-24 relative overflow-hidden bg-[#0e0e0f]">
                        <img
                          className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-300"
                          alt={`${t.title} Tournament Banner`}
                          loading="lazy"
                          width="400"
                          height="200"
                          src={getTournamentImage(t)}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#141416] via-[#141416]/40 to-transparent"></div>
                        <div className="absolute bottom-2 left-2.5 flex items-center gap-1.5">
                          <span className="px-2 py-0.5 bg-[#00f2ff]/15 text-[#00f2ff] border border-[#00f2ff]/30 text-[11px] sm:text-[12px] font-label-bold uppercase rounded tracking-wider">
                            {t.game || 'Free Fire MAX'}
                          </span>
                          {t.mode && (
                            <span className="px-1.5 py-0.5 bg-[#1c1b1c]/90 text-[#b9cacb] border border-[#27272a] text-[11px] font-label-bold uppercase rounded">
                              {t.mode}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Compact Card Content (25-35% reduced padding & spacing) */}
                      <div className="p-3 sm:p-3.5 flex flex-col flex-grow space-y-2 sm:space-y-2.5">
                        {/* Tournament Name (20-22px on mobile) */}
                        <div>
                          <h3 className="font-headline font-extrabold text-[18px] xs:text-[20px] sm:text-[22px] text-white tracking-wide leading-tight line-clamp-1 xs:line-clamp-2" title={t.title}>
                            {t.title}
                          </h3>
                        </div>

                        {/* Entry Fee & Prize Pool (Compact horizontal row) */}
                        <div className="grid grid-cols-2 gap-2 px-2.5 py-1.5 sm:py-2 rounded bg-[#1c1b1c] border border-[#27272a]">
                          <div className="flex flex-col">
                            <span className="text-[11px] sm:text-[12px] text-[#849495] uppercase font-label-bold tracking-wider">Entry Fee</span>
                            <span className="font-bold text-white text-[16px] xs:text-[18px] sm:text-[20px] font-headline leading-tight">
                              {t.entryFee || t.entry_fee || 'Free'}
                            </span>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="text-[11px] sm:text-[12px] text-[#849495] uppercase font-label-bold tracking-wider">Prize Pool</span>
                            <span className="font-bold text-[#ff5e07] text-[16px] xs:text-[18px] sm:text-[20px] font-headline leading-tight">
                              {formatTournamentPrize(t)}
                            </span>
                          </div>
                        </div>

                        {/* Date/Time & Slots (14-15px) */}
                        <div className="flex items-center justify-between text-[13px] xs:text-[14px] sm:text-[14.5px] text-[#b9cacb] font-medium">
                          <span className="truncate">
                            {t.startDate} &bull; {t.startTime}
                          </span>
                          <span className="text-[#00f2ff] font-bold shrink-0 ml-2">
                            {calculateFilledPlayerSlots(t)}/{calculateTotalPlayerSlots(t)} Slots
                          </span>
                        </div>

                        {/* Slot Progress Bar (4-5px height) */}
                        <div className="w-full h-1 sm:h-1.5 bg-[#27272a] border border-[#3f3f46]/40 rounded-full overflow-hidden">
                          <div className="h-full bg-[#00f2ff]" style={{ width: `${calculateSlotFillPercentage(t)}%` }}></div>
                        </div>

                        {/* Primary Card Action: Register Now (~44px height) */}
                        <div className="pt-0.5 mt-auto">
                          <Link
                            to={`/tournaments/${t.id}`}
                            className="w-full h-11 min-h-[44px] bg-[#00f2ff] hover:bg-[#74f5ff] text-[#00363a] font-headline font-bold text-[14px] sm:text-[15px] uppercase tracking-wider rounded transition-all duration-200 border border-[#00f2ff] shadow-[0_0_15px_rgba(0,242,255,0.25)] text-center flex items-center justify-center active:scale-95"
                          >
                            Register Now
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* Premium Esports Top 3 Leaders Podium Widget */}
            <section className="lg:col-span-1 flex flex-col space-y-3 sm:space-y-4 min-w-0">
              <div className="flex items-center justify-between gap-2 min-w-0">
                <div className="min-w-0">
                  <span className="text-[10px] xs:text-[11px] font-headline font-bold text-[#00f2ff] uppercase tracking-widest block leading-none mb-1">
                    TOP 3
                  </span>
                  <h2 className="font-headline font-extrabold text-[17px] xs:text-[19px] sm:text-[21px] md:text-[23px] uppercase tracking-wider text-white flex items-center gap-1.5 min-w-0 leading-tight">
                    <Trophy className="w-4.5 h-4.5 text-[#fed83a] shrink-0" />
                    <span>Tournament Leaders</span>
                  </h2>
                </div>
                <Link to="/leaderboard" className="text-xs sm:text-sm font-label-bold text-[#00f2ff] hover:text-[#74f5ff] transition-colors flex items-center gap-1 uppercase whitespace-nowrap shrink-0 ml-2">
                  <span>View All</span>
                  <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                </Link>
              </div>

              <div className="bg-[#141416] rounded border border-[#27272a] p-2 xs:p-2.5 sm:p-3 pt-5 xs:pt-6 relative overflow-hidden shadow-md">
                {/* Subtle Esports Ambient Glow & Arena Pattern */}
                <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,rgba(0,242,255,0.06),transparent_70%)]"></div>
                <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:14px_14px]"></div>

                {topPlayers.length === 0 ? (
                  <div className="py-7 flex flex-col items-center justify-center text-center space-y-2 relative z-10">
                    <Trophy className="w-7 h-7 text-[#27272a] shrink-0" />
                    <p className="text-xs font-bold text-white uppercase tracking-wider">Leaderboard Standings</p>
                    <p className="text-[12px] text-[#849495] max-w-[220px] leading-relaxed">
                      No match scores recorded yet. Results will appear here after tournament completion.
                    </p>
                  </div>
                ) : (
                  /* 3-Column Podium Layout: #2 on Left, #1 in Center (Tallest & Dominant), #3 on Right */
                  <div className="grid grid-cols-3 gap-1.5 xs:gap-2 sm:gap-2.5 items-end relative z-10">
                    {[
                      {
                        rank: 2,
                        player: topPlayers[1] || null,
                        color: '#94a3b8',
                        borderColor: 'border-[#94a3b8]/40 hover:border-[#94a3b8]/80',
                        bgGradient: 'from-[#94a3b8]/15 via-[#1a1a1c] to-[#141416]',
                        glow: 'shadow-[0_0_10px_rgba(148,163,184,0.12)]',
                        badgeBg: 'bg-[#94a3b8]/20 border-[#94a3b8]',
                        badgeText: 'text-[#94a3b8]',
                        trophyIcon: Medal,
                        trophySize: 'w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#94a3b8]',
                        elevation: 'h-[168px] xs:h-[180px] sm:h-[195px]',
                        rankBadge: '#2',
                      },
                      {
                        rank: 1,
                        player: topPlayers[0] || null,
                        color: '#fed83a',
                        borderColor: 'border-[#fed83a]/70 hover:border-[#fed83a]',
                        bgGradient: 'from-[#fed83a]/25 via-[#1f1d18] to-[#141416]',
                        glow: 'shadow-[0_0_18px_rgba(254,216,58,0.22)] ring-1 ring-[#fed83a]/30',
                        badgeBg: 'bg-[#fed83a]/25 border-[#fed83a]',
                        badgeText: 'text-[#fed83a]',
                        trophyIcon: Crown,
                        trophySize: 'w-4 h-4 sm:w-5 sm:h-5 text-[#fed83a] drop-shadow-[0_0_8px_rgba(254,216,58,0.6)]',
                        elevation: 'h-[192px] xs:h-[206px] sm:h-[222px]',
                        rankBadge: '#1 WINNER',
                        isWinner: true,
                      },
                      {
                        rank: 3,
                        player: topPlayers[2] || null,
                        color: '#ff5e07',
                        borderColor: 'border-[#ff5e07]/40 hover:border-[#ff5e07]/80',
                        bgGradient: 'from-[#ff5e07]/15 via-[#1a1818] to-[#141416]',
                        glow: 'shadow-[0_0_10px_rgba(255,94,7,0.12)]',
                        badgeBg: 'bg-[#ff5e07]/20 border-[#ff5e07]',
                        badgeText: 'text-[#ff5e07]',
                        trophyIcon: Medal,
                        trophySize: 'w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#ff5e07]',
                        elevation: 'h-[156px] xs:h-[168px] sm:h-[182px]',
                        rankBadge: '#3',
                      },
                    ].map((slot) => {
                      const p = slot.player
                      const Icon = slot.trophyIcon

                      return (
                        <div
                          key={`podium-rank-${slot.rank}`}
                          className={`relative flex flex-col justify-between items-center rounded border ${slot.borderColor} bg-gradient-to-b ${slot.bgGradient} ${slot.glow} ${slot.elevation} p-1.5 xs:p-2 text-center transition-all duration-200 hover:scale-[1.02] group`}
                        >
                          {/* Top Rank Badge / Crown Icon floating on top edge */}
                          <div className="flex flex-col items-center -mt-4 xs:-mt-5 shrink-0 z-10">
                            <div className={`w-6 h-6 xs:w-7 xs:h-7 sm:w-8 sm:h-8 rounded-full border ${slot.badgeBg} flex items-center justify-center shadow-md transition-transform duration-200 group-hover:scale-110`}>
                              <Icon className={slot.trophySize} />
                            </div>
                            <span
                              className={`font-headline font-black text-[9px] xs:text-[10px] sm:text-[11px] tracking-wider uppercase mt-0.5 px-1 rounded leading-none ${slot.badgeText}`}
                            >
                              {slot.rankBadge}
                            </span>
                          </div>

                          {/* Middle Player Info */}
                          <div className="w-full flex-1 flex flex-col justify-center items-center min-w-0 px-0.5 py-0.5">
                            {p ? (
                              <>
                                <h4
                                  className={`font-headline font-bold text-[11px] xs:text-[12px] sm:text-[13px] text-white truncate max-w-full leading-tight ${slot.isWinner ? 'text-[#fed83a]' : ''}`}
                                  title={p.player}
                                >
                                  {p.player}
                                </h4>
                                <p className="text-[9px] xs:text-[9.5px] sm:text-[10px] text-[#849495] font-mono truncate max-w-full mt-0.5">
                                  {p.team || (p.uid ? `UID:${p.uid.slice(0, 6)}` : '—')}
                                </p>
                              </>
                            ) : (
                              <div className="text-[10px] xs:text-[11px] text-[#849495] italic">Open Slot</div>
                            )}
                          </div>

                          {/* Bottom Metrics: Kills • PTS + Payout */}
                          <div className="w-full pt-1 border-t border-[#27272a]/60 flex flex-col items-center shrink-0">
                            <span className="text-[9px] xs:text-[9.5px] sm:text-[10px] text-white font-mono font-bold tracking-tight truncate max-w-full">
                              {p ? `${p.kills} KILLS • ${p.points} PTS` : '0 KILLS • 0 PTS'}
                            </span>
                            {slot.isWinner && (
                              <span
                                className="font-headline font-black text-[10px] xs:text-[10.5px] sm:text-[11px] leading-tight mt-0.5"
                                style={{ color: slot.color }}
                              >
                                {p && p.earnings > 0 ? `₹${p.earnings.toLocaleString('en-IN')} EARNED` : `${p ? p.points : 0} PTS`}
                              </span>
                            )}
                            {!slot.isWinner && p && p.earnings > 0 && (
                              <span
                                className="font-headline font-bold text-[9px] xs:text-[9.5px] leading-tight mt-0.5"
                                style={{ color: slot.color }}
                              >
                                ₹{p.earnings.toLocaleString('en-IN')}
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </section>

          </div>
        )}

      </div>
    </div>
  )
}
