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
  Star,
  Calendar
} from 'lucide-react'

import { getTournamentImage } from '../utils/tournamentImageUtils'
import { formatTournamentPrize } from '../utils/tournamentPrizeUtils'
import {
  calculateFilledPlayerSlots,
  calculateTotalPlayerSlots,
  calculateSlotFillPercentage,
  getTournamentMode,
} from '../utils/tournamentUtils'

export default function Home() {
  const { tournaments, loading } = useTournaments()
  const { user } = useAuth()

  const displayName = user?.user_metadata?.username || user?.email?.split('@')[0] || 'Player'

  // Upcoming Tournaments List
  const upcomingTournaments = useMemo(() => {
    return tournaments.filter((t) => t.status !== 'Completed').slice(0, 2)
  }, [tournaments])

  // Telemetry Calculations from real database records
  const activeCount = useMemo(() => {
    return tournaments.filter((t) => t.status === 'Live Now' || t.status === 'Live').length
  }, [tournaments])

  const openCount = useMemo(() => {
    return tournaments.filter((t) => t.status === 'Registration Open').length
  }, [tournaments])

  const totalPrizePool = useMemo(() => {
    const total = tournaments.reduce((acc, t) => {
      const num = parseFloat(String(t.prizePool || t.prize_pool || '0').replace(/[^0-9.]/g, '')) || 0
      return acc + num
    }, 0)
    return total > 0 ? `₹${total.toLocaleString()}` : '₹0'
  }, [tournaments])

  const totalRegisteredPlayers = useMemo(() => {
    return tournaments.reduce((acc, t) => {
      return acc + calculateFilledPlayerSlots(t)
    }, 0)
  }, [tournaments])

  // Aggregate Top Players Standings from tournaments (real completed matches)
  const topPlayers = useMemo(() => {
    const statsMap = {}

    tournaments.forEach((t) => {
      const teams = Array.isArray(t.teams_list) ? t.teams_list : (Array.isArray(t.teamsList) ? t.teamsList : [])

      teams.forEach((team) => {
        const name = team.team || team.name || team.captain || ''
        const player = team.captain || team.player || team.name || ''
        if (!name || !player) return

        const kills = Number(team.kills || team.finishes || 0)
        const points = Number(team.points || team.score || 0)
        const isWinner = team.rank === 1 || team.position === 1

        if (!statsMap[name]) {
          statsMap[name] = {
            team: name,
            player: player,
            points: 0,
            kills: 0,
            wins: 0,
            avatar: team.avatar || null,
          }
        }
        if (isWinner) statsMap[name].wins += 1
        statsMap[name].points += points
        statsMap[name].kills += kills
      })
    })

    return Object.values(statsMap)
      .sort((a, b) => b.points - a.points || b.kills - a.kills)
      .slice(0, 3)
  }, [tournaments])

  return (
    <div className="flex-grow flex flex-col w-full bg-[#131314] text-white font-body antialiased selection:bg-[#00f2ff]/30 selection:text-[#00f2ff]">
      
      {/* 1. HERO SECTION */}
      <section className="relative w-full min-h-[380px] md:min-h-[460px] flex items-center justify-center overflow-hidden py-10 md:py-16">
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
          <div className="absolute inset-0 bg-gradient-to-t from-[#131314] via-[#131314]/70 to-transparent transform-gpu"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#131314] via-transparent to-[#131314] hidden md:block transform-gpu"></div>
        </div>

        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto flex flex-col items-center">
          {/* Hero Greeting */}
          <span className="px-3.5 py-1 rounded bg-[#141416] border border-[#00f2ff]/30 text-[#00f2ff] text-xs sm:text-sm font-label-bold tracking-wide mb-4 inline-flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,242,255,0.2)]">
            👋 Welcome back, {displayName}
          </span>

          {/* Hero Title */}
          <h1 className="font-headline font-extrabold text-4xl sm:text-6xl tracking-tight text-white mb-4 drop-shadow-2xl leading-tight max-w-full break-words">
            Ready for Battle?
          </h1>

          {/* Hero Description */}
          <p className="font-body text-[#b9cacb] text-sm sm:text-base max-w-2xl mx-auto mb-8 font-normal leading-relaxed line-clamp-2 sm:line-clamp-none">
            Every Match Counts. Every Kill Matters. Compete in India's premier Free Fire MAX & BGMI esports tournament arena.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto items-center justify-center">
            <Link
              to="/tournaments"
              className="w-full sm:w-auto h-12 sm:h-[50px] px-6 sm:px-8 bg-[#00f2ff] text-[#00363a] font-headline font-bold text-sm sm:text-base rounded hover:bg-[#74f5ff] transition-all duration-200 shadow-[0_0_20px_rgba(0,242,255,0.35)] flex items-center justify-center gap-2 uppercase tracking-wider border border-[#00f2ff]"
            >
              <span>Browse Tournaments</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/leaderboard"
              className="w-full sm:w-auto h-12 sm:h-[50px] px-6 sm:px-8 bg-[#18181b] hover:bg-[#222227] text-white hover:text-[#00f2ff] font-headline font-bold text-sm sm:text-base rounded transition-all duration-200 border border-[#3f3f46] hover:border-[#00f2ff] flex items-center justify-center gap-2 uppercase tracking-wider shadow-sm"
            >
              <span>Leaderboard</span>
              <Trophy className="w-4 h-4 text-[#ff5e07]" />
            </Link>
          </div>
        </div>
      </section>

      {/* 2. MAIN CONTAINER GRID */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full mt-6 md:-mt-12 relative z-20 pb-20 space-y-10 sm:space-y-12">

        {/* Quick Actions */}
        <section className="grid grid-cols-4 gap-2 sm:gap-4 md:gap-6">
          <Link to="/tournaments" className="flex flex-col items-center gap-2 sm:gap-3 group">
            <div className="w-13 h-13 xs:w-16 xs:h-16 md:w-20 md:h-20 rounded bg-[#141416] border border-[#27272a] flex items-center justify-center group-hover:bg-[#00f2ff]/10 group-hover:border-[#00f2ff] transition-all duration-200 shadow-md">
              <Swords className="w-6 h-6 xs:w-8 xs:h-8 md:w-9 md:h-9 text-[#00f2ff] group-hover:scale-105 transition-transform" />
            </div>
            <span className="font-label-bold text-xs font-bold text-[#b9cacb] group-hover:text-[#00f2ff] transition-colors text-center leading-tight uppercase">
              Join<br />Tourneys
            </span>
          </Link>

          <Link to="/profile/history" className="flex flex-col items-center gap-2 sm:gap-3 group">
            <div className="w-13 h-13 xs:w-16 xs:h-16 md:w-20 md:h-20 rounded bg-[#141416] border border-[#27272a] flex items-center justify-center group-hover:bg-[#ff5e07]/10 group-hover:border-[#ff5e07] transition-all duration-200 shadow-md">
              <Gamepad2 className="w-6 h-6 xs:w-8 xs:h-8 md:w-9 md:h-9 text-[#ff5e07] group-hover:scale-105 transition-transform" />
            </div>
            <span className="font-label-bold text-xs font-bold text-[#b9cacb] group-hover:text-[#ff5e07] transition-colors text-center leading-tight uppercase">
              My<br />Matches
            </span>
          </Link>

          <Link to="/wallet" className="flex flex-col items-center gap-2 sm:gap-3 group">
            <div className="w-13 h-13 xs:w-16 xs:h-16 md:w-20 md:h-20 rounded bg-[#141416] border border-[#27272a] flex items-center justify-center group-hover:bg-[#10b981]/10 group-hover:border-[#10b981] transition-all duration-200 shadow-md">
              <Wallet className="w-6 h-6 xs:w-8 xs:h-8 md:w-9 md:h-9 text-[#10b981] group-hover:scale-105 transition-transform" />
            </div>
            <span className="font-label-bold text-xs font-bold text-[#b9cacb] group-hover:text-[#10b981] transition-colors text-center leading-tight uppercase">
              Wallet
            </span>
          </Link>

          <Link to="/leaderboard" className="flex flex-col items-center gap-2 sm:gap-3 group">
            <div className="w-13 h-13 xs:w-16 xs:h-16 md:w-20 md:h-20 rounded bg-[#141416] border border-[#27272a] flex items-center justify-center group-hover:bg-[#fed83a]/10 group-hover:border-[#fed83a] transition-all duration-200 shadow-md">
              <Trophy className="w-6 h-6 xs:w-8 xs:h-8 md:w-9 md:h-9 text-[#fed83a] group-hover:scale-105 transition-transform" />
            </div>
            <span className="font-label-bold text-xs font-bold text-[#b9cacb] group-hover:text-[#fed83a] transition-colors text-center leading-tight uppercase">
              Leaderboard
            </span>
          </Link>
        </section>

        {loading ? (
          <div className="py-8">
            <SkeletonLoader type="card" count={2} />
          </div>
        ) : tournaments.length === 0 ? (
          <div className="py-16 text-center border border-[#27272a] bg-[#141416] rounded p-6 space-y-3 shadow-lg">
            <Trophy className="w-12 h-12 text-[#849495] mx-auto animate-pulse" />
            <h3 className="font-headline font-bold text-xl text-white uppercase">No Active Tournaments Found</h3>
            <p className="text-xs text-[#b9cacb] max-w-md mx-auto">
              Check back soon for newly published tournaments, or visit our rulebook to prepare for upcoming operations.
            </p>
          </div>
        ) : (
          <>
            {/* Split Screen Container: Upcoming Tournaments & Leaderboard Widget */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 items-start">
              
              {/* Upcoming Tournaments */}
              <section className="lg:col-span-2">
                <div className="flex items-center justify-between mb-4 sm:mb-6 gap-2">
                  <h2 className="font-headline font-extrabold text-xl sm:text-2xl uppercase tracking-wider text-white flex items-center gap-2 sm:gap-3 min-w-0">
                    <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-[#00f2ff] shrink-0" />
                    <span className="leading-tight break-words">Upcoming Tournaments</span>
                  </h2>
                  <Link to="/tournaments" className="text-xs sm:text-sm font-label-bold text-[#00f2ff] hover:text-[#74f5ff] transition-colors flex items-center gap-1 uppercase whitespace-nowrap shrink-0 ml-1">
                    <span>View All</span>
                    <ArrowRight className="w-4 h-4 shrink-0" />
                  </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {upcomingTournaments.length === 0 ? (
                    <div className="col-span-2 py-8 text-center text-xs text-[#b9cacb] font-sans">
                      No active tournaments.
                    </div>
                  ) : (
                    upcomingTournaments.map((t, idx) => (
                      <div key={`upcoming-tourney-${t.id || t._id || idx}`} className="bg-[#141416] rounded border border-[#27272a] overflow-hidden hover:border-[#00f2ff] transition-colors group flex flex-col">
                        <div className="h-32 relative overflow-hidden bg-[#0e0e0f]">
                          <img
                            className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-300"
                            alt="Tournament Banner Logo"
                            loading="lazy"
                            width="400"
                            height="200"
                            src={getTournamentImage(t)}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-[#141416] to-transparent"></div>
                          <div className="absolute bottom-3 left-4 flex gap-2">
                            <span className="px-2 py-0.5 bg-[#00f2ff]/10 text-[#00f2ff] border border-[#00f2ff]/20 text-[10px] font-label-bold uppercase rounded">{t.mode || 'Squad'}</span>
                            <span className="px-2 py-0.5 bg-[#ff5e07]/10 text-[#ff5e07] border border-[#ff5e07]/20 text-[10px] font-label-bold uppercase rounded">{t.map || 'Erangel'}</span>
                          </div>
                        </div>

                        <div className="p-4 flex flex-col flex-grow">
                          <h3 className="font-headline font-extrabold text-lg text-white mb-1 tracking-wide truncate">{t.title}</h3>
                          <p className="text-xs text-[#b9cacb] mb-3.5 font-medium">{t.game}</p>

                          <div className="grid grid-cols-2 gap-2 p-2.5 rounded bg-[#1c1b1c] border border-[#27272a] mb-3.5">
                            <div className="flex flex-col">
                              <span className="text-xs text-[#849495] uppercase font-label-bold">Entry Fee</span>
                              <span className="font-bold text-white text-sm font-headline">{t.entryFee || t.entry_fee || 'Free'}</span>
                            </div>
                            <div className="flex flex-col items-end">
                              <span className="text-xs text-[#849495] uppercase font-label-bold">Prize Pool</span>
                              <span className="font-bold text-[#ff5e07] text-sm font-headline">{formatTournamentPrize(t)}</span>
                            </div>
                          </div>

                          <div className="flex justify-between items-center text-xs text-[#b9cacb] mb-3 font-medium">
                            <span className="truncate">Starts: {t.startDate} &bull; {t.startTime}</span>
                          </div>

                          <div className="mb-5 mt-auto">
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-[#849495] text-xs font-label-bold">Registration</span>
                              <span className="text-[#00f2ff] font-bold text-xs">{calculateFilledPlayerSlots(t)}/{calculateTotalPlayerSlots(t)} Slots</span>
                            </div>
                            <div className="w-full h-1.5 bg-[#27272a] border border-[#3f3f46]/40 rounded-full overflow-hidden">
                              <div className="h-full bg-[#00f2ff]" style={{ width: `${calculateSlotFillPercentage(t)}%` }}></div>
                            </div>
                          </div>

                          <div className="pt-1">
                            <Link
                              to={`/tournaments/${t.id}`}
                              className="w-full py-2.5 bg-[#00f2ff] hover:bg-[#74f5ff] text-[#00363a] font-headline font-bold text-xs uppercase tracking-wider rounded transition-all duration-200 border border-[#00f2ff] shadow-[0_0_15px_rgba(0,242,255,0.25)] text-center min-h-[44px] flex items-center justify-center"
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

              {/* Leaderboard Widget */}
              <section className="lg:col-span-1 flex flex-col">
                <div className="flex items-center justify-between mb-4 sm:mb-6 gap-2">
                  <h2 className="font-headline font-extrabold text-xl sm:text-2xl uppercase tracking-wider text-white flex items-center gap-2 sm:gap-3 min-w-0">
                    <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-[#ff5e07] shrink-0" />
                    <span className="truncate">Leaderboard</span>
                  </h2>
                  <Link to="/leaderboard" className="text-xs sm:text-sm font-label-bold text-[#00f2ff] hover:text-[#74f5ff] transition-colors flex items-center gap-1 uppercase whitespace-nowrap shrink-0">
                    <span>View All</span>
                    <ArrowRight className="w-4 h-4 shrink-0" />
                  </Link>
                </div>

                <div className="bg-[#141416] rounded border border-[#27272a] p-3.5 space-y-2 flex-1 flex flex-col justify-center min-h-[140px] lg:min-h-[360px]">
                  {topPlayers.length === 0 ? (
                    <div className="py-6 flex flex-col items-center justify-center text-center space-y-2 my-auto">
                      <Trophy className="w-7 h-7 text-[#27272a] shrink-0" />
                      <p className="text-xs font-bold text-white uppercase tracking-wider">Leaderboard Standings</p>
                      <p className="text-xs text-[#849495] max-w-[200px] leading-relaxed">
                        No rankings available yet. Match scores will appear here.
                      </p>
                    </div>
                  ) : (
                    topPlayers.map((p, idx) => {
                      const color = idx === 0 ? '#fed83a' : idx === 1 ? '#b9cacb' : '#ffb59a'
                      return (
                        <div key={`top-player-${p.player}-${idx}`} className="flex items-center gap-3 p-3 rounded bg-[#1c1b1c] border border-[#27272a] hover:border-[#00f2ff]/40 transition-colors">
                          <div
                            className="w-8 h-8 rounded border overflow-hidden relative bg-[#201f20] flex items-center justify-center font-headline font-bold text-xs shrink-0"
                            style={{ borderColor: color, color }}
                          >
                            {idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-headline font-bold text-sm text-white truncate">{p.player}</h4>
                            <p className="text-xs text-[#b9cacb] uppercase truncate">{p.kills} Kills &bull; {p.team}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-headline font-bold text-sm text-white font-mono">{p.points}</span>
                            <p className="text-[10px] text-[#849495] uppercase font-label-bold">PTS</p>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </section>

            </div>

            {/* Platform Stats */}
            <section className="grid grid-cols-2 md:grid-cols-4 gap-3 xs:gap-4 sm:gap-6 bg-[#141416] rounded p-4 xs:p-5 sm:p-8 border border-[#27272a] shadow-xl relative overflow-hidden">
              <div className="flex flex-col items-center justify-center text-center p-2 sm:p-3 relative z-10">
                <span className="text-4xl sm:text-6xl font-headline font-black text-[#00f2ff] leading-none tracking-tight">
                  {activeCount}
                </span>
                <span className="text-xs text-[#b9cacb] uppercase font-label-bold tracking-widest mt-2 leading-tight">
                  Active Tournaments
                </span>
              </div>

              <div className="flex flex-col items-center justify-center text-center p-2 sm:p-3 relative z-10">
                <span className="text-4xl sm:text-6xl font-headline font-black text-white leading-none tracking-tight">
                  {openCount}
                </span>
                <span className="text-xs text-[#b9cacb] uppercase font-label-bold tracking-widest mt-2 leading-tight">
                  Open Registrations
                </span>
              </div>

              <div className="flex flex-col items-center justify-center text-center p-2 sm:p-3 relative z-10">
                <span className="text-4xl sm:text-6xl font-headline font-black text-[#ff5e07] leading-none tracking-tight">
                  {totalPrizePool}
                </span>
                <span className="text-xs text-[#b9cacb] uppercase font-label-bold tracking-widest mt-2 leading-tight">
                  Total Prize Pool
                </span>
              </div>

              <div className="flex flex-col items-center justify-center text-center p-2 sm:p-3 relative z-10">
                <span className="text-4xl sm:text-6xl font-headline font-black text-white leading-none tracking-tight">
                  {totalRegisteredPlayers.toLocaleString()}
                </span>
                <span className="text-xs text-[#b9cacb] uppercase font-label-bold tracking-widest mt-2 leading-tight">
                  Registered Players
                </span>
              </div>
            </section>

            {/* Featured Tournament Section */}
            {upcomingTournaments.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                  <h2 className="font-headline font-black text-xl sm:text-2xl uppercase tracking-wider text-white flex items-center gap-3">
                    <Star className="w-5 h-5 sm:w-6 sm:h-6 text-[#00f2ff]" />
                    <span>Featured Tournament</span>
                  </h2>
                </div>

                <div className="rounded p-1 relative overflow-hidden group bg-[#141416] border border-[#27272a] hover:border-[#00f2ff] transition-colors">
                  <div className="bg-[#141416] rounded p-5 sm:p-6 relative z-10 flex flex-col md:flex-row items-center gap-6 sm:gap-8">
                    <div className="w-full md:w-1/3 aspect-video rounded overflow-hidden relative shadow-lg bg-[#0e0e0f] shrink-0">
                      <img
                        className="w-full h-full object-cover"
                        alt="Gameplay screenshot"
                        loading="lazy"
                        width="400"
                        height="225"
                        src={upcomingTournaments[0].imageUrl || "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80"}
                      />
                      <div className="absolute top-2 left-2 px-2.5 py-1 bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/30 font-label-bold text-[10px] font-bold rounded uppercase tracking-wider flex items-center gap-1.5 backdrop-blur-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse"></span>
                        <span>REGISTRATION OPEN</span>
                      </div>
                    </div>

                    <div className="flex-1 flex flex-col w-full space-y-4">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <h3 className="font-headline font-bold text-xl sm:text-2xl text-white mb-1">
                            {upcomingTournaments[0].title}
                          </h3>
                          <p className="text-[#b9cacb] text-sm flex items-center gap-2 font-medium">
                            <Gamepad2 className="w-4 h-4 text-[#00f2ff]" /> {upcomingTournaments[0].game}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs text-[#849495] uppercase font-label-bold tracking-wider mb-1">Prize Pool</p>
                          <p className="font-headline font-black text-[#ff5e07] text-2xl sm:text-3xl drop-shadow-[0_0_12px_rgba(255,94,7,0.35)]">{upcomingTournaments[0].prizePool || upcomingTournaments[0].prize_pool}</p>
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-sm pt-3 border-t border-[#27272a] gap-4">
                        <div className="flex flex-col">
                          <span className="text-xs text-[#849495] uppercase font-label-bold tracking-wider mb-1">Entry Fee</span>
                          <span className="font-headline font-bold text-[#00f2ff] text-lg sm:text-xl">{upcomingTournaments[0].entryFee || upcomingTournaments[0].entry_fee || 'Free'}</span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-xs text-[#849495] uppercase font-label-bold tracking-wider mb-1">Match Schedule</span>
                          <span className="font-headline font-bold text-white text-sm sm:text-base">{upcomingTournaments[0].startDate} &bull; {upcomingTournaments[0].startTime}</span>
                        </div>
                      </div>

                      <div className="bg-[#201f20] rounded p-4 border border-[#27272a]">
                        <p className="text-xs text-[#849495] uppercase font-label-bold tracking-wider mb-2">Slots Filled</p>
                        <div className="flex items-center gap-3.5">
                          <p className="font-headline font-bold text-lg sm:text-xl text-white tracking-wider shrink-0">
                            {calculateFilledPlayerSlots(upcomingTournaments[0])}/{calculateTotalPlayerSlots(upcomingTournaments[0])} Slots
                          </p>
                          <div className="flex-1 h-2.5 sm:h-3 bg-[#27272a] rounded-full overflow-hidden border border-[#3f3f46]/50">
                            <div
                              className="h-full bg-gradient-to-r from-[#ff5e07] to-[#00f2ff] rounded-full transition-all duration-300"
                              style={{ width: `${calculateSlotFillPercentage(upcomingTournaments[0])}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-4 pt-1">
                        <Link
                          to={`/tournaments/${upcomingTournaments[0].id}`}
                          className="flex-1 py-3.5 bg-[#00f2ff] hover:bg-[#74f5ff] text-[#00363a] font-headline font-bold uppercase tracking-wider rounded transition-all flex items-center justify-center gap-2 text-center min-h-[48px] shadow-[0_0_15px_rgba(0,242,255,0.35)] text-sm sm:text-base"
                        >
                          Register Now
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}
          </>
        )}

      </div>
    </div>
  )
}

