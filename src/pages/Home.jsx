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
    <div className="flex-grow flex flex-col w-full bg-[#0B0E11] text-white font-body antialiased selection:bg-[#00F2FF]/30 selection:text-[#00F2FF]">
      
      {/* 1. HERO SECTION */}
      <section className="relative w-full min-h-[380px] md:min-h-[460px] flex items-center justify-center overflow-hidden py-10 md:py-16">
        <div className="absolute inset-0 z-0 transform-gpu">
          <img
            className="w-full h-full object-cover opacity-50 transform-gpu"
            alt="Esports tournament arena stage"
            loading="eager"
            fetchPriority="high"
            decoding="async"
            width="2000"
            height="1000"
            src={getTournamentImage(upcomingTournaments[0])}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B0E11] via-[#0B0E11]/60 to-transparent transform-gpu"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#0B0E11] via-transparent to-[#0B0E11] hidden md:block transform-gpu"></div>
        </div>

        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto flex flex-col items-center">
          {/* Hero Greeting */}
          <span className="px-3 sm:px-4 py-1.5 rounded-full bg-[#1C232B]/80 border border-[#00F2FF]/30 text-[#00F2FF] text-[16px] sm:text-[18px] font-medium tracking-wide mb-4 inline-flex items-center justify-center gap-2 md:backdrop-blur-sm max-w-full whitespace-nowrap overflow-hidden text-ellipsis shadow-[0_0_15px_rgba(0,242,255,0.2)]">
            👋 Welcome back, MJ ESPORTS
          </span>

          {/* Hero Title */}
          <h1 className="font-headline font-black text-3xl xs:text-4xl sm:text-5xl md:text-6xl lg:text-7xl tracking-tight text-white mb-4 uppercase drop-shadow-2xl leading-tight max-w-full break-words">
            READY FOR BATTLE?
          </h1>

          {/* Hero Description */}
          <p className="font-body text-[#9CA3AF] text-[15px] sm:text-[17px] max-w-2xl mx-auto mb-6 font-medium leading-relaxed line-clamp-2 sm:line-clamp-none">
            Every Match Counts. Every Kill Matters.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto items-center justify-center">
            <Link
              to="/tournaments"
              className="w-full sm:w-auto px-6 sm:px-8 py-3 bg-[#00F2FF] text-[#0B0E11] font-headline font-bold text-sm sm:text-base rounded-lg hover:bg-[#00C2CC] transition-all duration-300 transform hover:scale-105 hover:shadow-[0_0_20px_rgba(0,242,255,0.4)] flex items-center justify-center gap-2 uppercase tracking-wider min-h-[48px]"
            >
              <span>Browse Tournaments</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              to="/leaderboard"
              className="w-full sm:w-auto px-6 sm:px-8 py-3 bg-[#2A3441] text-white font-headline font-bold text-sm sm:text-base rounded-lg hover:bg-[#1C232B] transition-all duration-300 border border-[#374151] flex items-center justify-center gap-2 uppercase tracking-wider min-h-[48px]"
            >
              <span>Leaderboard</span>
              <Trophy className="w-5 h-5 text-[#FE6B00]" />
            </Link>
          </div>
        </div>
      </section>

      {/* 2. MAIN CONTAINER GRID */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full mt-6 md:-mt-16 relative z-20 pb-20 space-y-10 sm:space-y-12">

        {/* Quick Actions */}
        <section className="grid grid-cols-4 gap-2 sm:gap-4 md:gap-8">
          <Link to="/tournaments" className="flex flex-col items-center gap-2 sm:gap-3 group">
            <div className="w-13 h-13 xs:w-16 xs:h-16 md:w-20 md:h-20 rounded-xl xs:rounded-2xl bg-[#1C232B] border border-[#374151]/50 flex items-center justify-center group-hover:bg-[#00F2FF]/10 group-hover:border-[#00F2FF]/50 transition-all duration-300 shadow-lg">
              <Swords className="w-6 h-6 xs:w-8 xs:h-8 md:w-10 md:h-10 text-[#00F2FF] group-hover:scale-110 transition-transform" />
            </div>
            <span className="font-label text-[10px] xs:text-xs sm:text-sm font-semibold text-[#9CA3AF] group-hover:text-white transition-colors text-center leading-tight">
              Join<br />Tournament
            </span>
          </Link>

          <Link to="/profile/history" className="flex flex-col items-center gap-2 sm:gap-3 group">
            <div className="w-13 h-13 xs:w-16 xs:h-16 md:w-20 md:h-20 rounded-xl xs:rounded-2xl bg-[#1C232B] border border-[#374151]/50 flex items-center justify-center group-hover:bg-[#FE6B00]/10 group-hover:border-[#FE6B00]/50 transition-all duration-300 shadow-lg">
              <Gamepad2 className="w-6 h-6 xs:w-8 xs:h-8 md:w-10 md:h-10 text-[#FE6B00] group-hover:scale-110 transition-transform" />
            </div>
            <span className="font-label text-[10px] xs:text-xs sm:text-sm font-semibold text-[#9CA3AF] group-hover:text-white transition-colors text-center leading-tight">
              My<br />Matches
            </span>
          </Link>

          <Link to="/wallet" className="flex flex-col items-center gap-2 sm:gap-3 group">
            <div className="w-13 h-13 xs:w-16 xs:h-16 md:w-20 md:h-20 rounded-xl xs:rounded-2xl bg-[#1C232B] border border-[#374151]/50 flex items-center justify-center group-hover:bg-[#00F2FF]/10 group-hover:border-[#00F2FF]/50 transition-all duration-300 shadow-lg">
              <Wallet className="w-6 h-6 xs:w-8 xs:h-8 md:w-10 md:h-10 text-[#00F2FF] group-hover:scale-110 transition-transform" />
            </div>
            <span className="font-label text-[10px] xs:text-xs sm:text-sm font-semibold text-[#9CA3AF] group-hover:text-white transition-colors text-center leading-tight">
              Wallet
            </span>
          </Link>

          <Link to="/leaderboard" className="flex flex-col items-center gap-2 sm:gap-3 group">
            <div className="w-13 h-13 xs:w-16 xs:h-16 md:w-20 md:h-20 rounded-xl xs:rounded-2xl bg-[#1C232B] border border-[#374151]/50 flex items-center justify-center group-hover:bg-[#FE6B00]/10 group-hover:border-[#FE6B00]/50 transition-all duration-300 shadow-lg">
              <Trophy className="w-6 h-6 xs:w-8 xs:h-8 md:w-10 md:h-10 text-[#FE6B00] group-hover:scale-110 transition-transform" />
            </div>
            <span className="font-label text-[10px] xs:text-xs sm:text-sm font-semibold text-[#9CA3AF] group-hover:text-white transition-colors text-center leading-tight">
              Leaderboard
            </span>
          </Link>
        </section>

        {loading ? (
          <div className="py-8">
            <SkeletonLoader type="card" count={2} />
          </div>
        ) : tournaments.length === 0 ? (
          <div className="py-16 text-center border border-[#374151]/30 bg-[#1C232B]/60 rounded-2xl p-6 space-y-3 shadow-lg">
            <Trophy className="w-12 h-12 text-[#9CA3AF] mx-auto animate-pulse" />
            <p className="text-xs font-bold text-white uppercase">No active tournaments.</p>
            <p className="text-[10px] text-[#9CA3AF] font-sans">
              Lobby schedules will show here when daily tournaments are announced.
            </p>
          </div>
        ) : (
          <>
            {/* Layout Grid for Upcoming & Leaderboard (Beside each other on desktop) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
              
              {/* Upcoming Tournaments */}
              <section className="lg:col-span-2">
                <div className="flex items-center justify-between mb-4 sm:mb-6 gap-2">
                  <h2 className="font-headline font-black text-sm xs:text-base sm:text-2xl uppercase tracking-normal sm:tracking-wider text-white flex items-center gap-2 sm:gap-3 min-w-0">
                    <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-[#00F2FF] shrink-0" />
                    <span className="leading-tight break-words">Upcoming Tournaments</span>
                  </h2>
                  <Link to="/tournaments" className="text-xs sm:text-sm font-label text-[#00F2FF] hover:text-[#00C2CC] transition-colors flex items-center gap-1 font-semibold uppercase whitespace-nowrap shrink-0 ml-1">
                    <span>View All</span>
                    <ArrowRight className="w-4 h-4 shrink-0" />
                  </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {upcomingTournaments.length === 0 ? (
                    <div className="col-span-2 py-8 text-center text-xs text-[#9CA3AF] font-sans">
                      No active tournaments.
                    </div>
                  ) : (
                    upcomingTournaments.map((t, idx) => (
                      <div key={`upcoming-tourney-${t.id || t._id || idx}`} className="bg-[#1C232B] rounded-lg border border-[#374151]/30 overflow-hidden hover:border-[#00F2FF]/50 transition-colors group flex flex-col">
                        <div className="h-32 relative overflow-hidden bg-[#111417]">
                          <img
                            className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-500"
                            alt="Tournament Banner Logo"
                            loading="lazy"
                            width="400"
                            height="200"
                            src={getTournamentImage(t)}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-[#1C232B] to-transparent"></div>
                          <div className="absolute bottom-3 left-4 flex gap-2">
                            <span className="px-2 py-0.5 bg-[#00F2FF]/20 text-[#00F2FF] border border-[#00F2FF]/30 text-[10px] font-bold uppercase rounded md:backdrop-blur">{t.mode || 'Squad'}</span>
                            <span className="px-2 py-0.5 bg-[#FE6B00]/20 text-[#FE6B00] border border-[#FE6B00]/30 text-[10px] font-bold uppercase rounded md:backdrop-blur">{t.map || 'Erangel'}</span>
                          </div>
                        </div>

                        <div className="p-4 flex flex-col flex-grow">
                          <h3 className="font-headline font-bold text-lg text-white mb-1">{t.title}</h3>
                          <p className="text-xs text-[#9CA3AF] mb-4">{t.game}</p>

                          <div className="grid grid-cols-2 gap-2 mb-4">
                            <div className="flex flex-col">
                              <span className="text-[10px] text-[#9CA3AF] uppercase font-semibold">Entry Fee</span>
                              <span className="font-bold text-white text-sm">{t.entryFee || t.entry_fee || 'Free'}</span>
                            </div>
                            <div className="flex flex-col items-end">
                              <span className="text-[10px] text-[#9CA3AF] uppercase font-semibold">Prize Pool</span>
                              <span className="font-bold text-[#FE6B00] text-sm">{formatTournamentPrize(t)}</span>
                            </div>
                          </div>

                          <div className="flex justify-between items-center text-[10px] text-[#9CA3AF] mb-2 font-medium">
                            <span>Starts: {t.startDate} &bull; {t.startTime}</span>
                          </div>

                          <div className="mb-4 mt-auto">
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-[#9CA3AF]">Registration</span>
                              <span className="text-[#00F2FF] font-bold">{calculateFilledPlayerSlots(t)}/{calculateTotalPlayerSlots(t)} Slots</span>
                            </div>
                            <div className="w-full h-1.5 bg-[#2A3441] rounded-full overflow-hidden">
                              <div className="h-full bg-[#00F2FF]" style={{ width: `${calculateSlotFillPercentage(t)}%` }}></div>
                            </div>
                          </div>

                          <Link
                            to={`/tournaments/${t.id}`}
                            className="w-full py-2.5 bg-[#2A3441] hover:bg-[#00F2FF]/20 text-white hover:text-[#00F2FF] font-headline font-bold text-sm uppercase tracking-wider rounded transition-colors border border-[#374151] hover:border-[#00F2FF]/50 text-center block min-h-[44px] flex items-center justify-center"
                          >
                            Register Now
                          </Link>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>

              {/* Leaderboard Widget */}
              <section className="lg:col-span-1">
                <div className="flex items-center justify-between mb-4 sm:mb-6 gap-2">
                  <h2 className="font-headline font-black text-base xs:text-lg sm:text-2xl uppercase tracking-wider text-white flex items-center gap-2 sm:gap-3 min-w-0">
                    <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-[#FE6B00] shrink-0" />
                    <span className="truncate">Leaderboard</span>
                  </h2>
                  <Link to="/leaderboard" className="text-xs sm:text-sm font-label text-[#00F2FF] hover:text-[#00C2CC] transition-colors flex items-center gap-1 font-semibold uppercase whitespace-nowrap shrink-0">
                    <span>View All</span>
                    <ArrowRight className="w-4 h-4 shrink-0" />
                  </Link>
                </div>

                <div className="bg-[#1C232B] rounded-lg border border-[#374151]/30 p-2 space-y-1">
                  {topPlayers.length === 0 ? (
                    <div className="py-12 text-center text-xs text-[#9CA3AF] font-sans">
                      No rankings available yet.
                    </div>
                  ) : (
                    topPlayers.map((p, idx) => {
                      const color = idx === 0 ? 'yellow-500' : idx === 1 ? 'gray-300' : 'amber-600'
                      const border = idx === 0 ? 'border-yellow-500' : idx === 1 ? 'border-gray-400' : 'border-amber-700'
                      const text = idx === 0 ? 'text-yellow-500' : idx === 1 ? 'text-gray-300' : 'text-amber-600'
                      return (
                        <div key={`top-player-${p.player}-${idx}`} className={`flex items-center gap-4 p-3 rounded-lg bg-gradient-to-r from-${color}/10 to-transparent border-l-2 ${border}`}>
                          <div className={`w-10 h-10 rounded-full border-2 ${border} overflow-hidden relative bg-[#2A3441] flex items-center justify-center font-bold ${text} shrink-0`}>
                            {idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className={`font-headline font-bold text-sm ${text} truncate`}>{p.player}</h4>
                            <p className="text-[10px] text-[#9CA3AF] uppercase truncate">{p.kills} Kills &bull; {p.team}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-headline font-bold text-lg text-white font-mono">{p.points}</span>
                            <p className="text-[10px] text-[#9CA3AF] uppercase font-semibold">PTS</p>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </section>

            </div>

            {/* Platform Stats */}
            <section className="grid grid-cols-2 md:grid-cols-4 gap-3 xs:gap-4 sm:gap-6 bg-[#1C232B]/90 backdrop-blur-md rounded-2xl p-4 xs:p-5 sm:p-8 border border-[#374151]/50 shadow-2xl relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-[#00F2FF]/5 via-transparent to-[#FE6B00]/5 pointer-events-none"></div>

              <div className="flex flex-col items-center justify-center text-center p-2 sm:p-3 relative z-10">
                <span className="text-3xl xs:text-4xl sm:text-5xl lg:text-6xl font-display font-black text-[#00F2FF] leading-none tracking-tight drop-shadow-[0_0_15px_rgba(0,242,255,0.4)]">
                  {activeCount}
                </span>
                <span className="text-[9px] xs:text-[10px] sm:text-xs text-[#9CA3AF] uppercase font-bold tracking-widest mt-2 leading-tight">
                  Active Tournaments
                </span>
              </div>

              <div className="flex flex-col items-center justify-center text-center p-2 sm:p-3 relative z-10">
                <span className="text-3xl xs:text-4xl sm:text-5xl lg:text-6xl font-display font-black text-white leading-none tracking-tight drop-shadow-md">
                  {openCount}
                </span>
                <span className="text-[9px] xs:text-[10px] sm:text-xs text-[#9CA3AF] uppercase font-bold tracking-widest mt-2 leading-tight">
                  Open Registrations
                </span>
              </div>

              <div className="flex flex-col items-center justify-center text-center p-2 sm:p-3 relative z-10">
                <span className="text-3xl xs:text-4xl sm:text-5xl lg:text-6xl font-display font-black text-[#FE6B00] leading-none tracking-tight drop-shadow-[0_0_15px_rgba(254,107,0,0.4)]">
                  {totalPrizePool}
                </span>
                <span className="text-[9px] xs:text-[10px] sm:text-xs text-[#9CA3AF] uppercase font-bold tracking-widest mt-2 leading-tight">
                  Total Prize Pool
                </span>
              </div>

              <div className="flex flex-col items-center justify-center text-center p-2 sm:p-3 relative z-10">
                <span className="text-3xl xs:text-4xl sm:text-5xl lg:text-6xl font-display font-black text-white leading-none tracking-tight drop-shadow-md">
                  {totalRegisteredPlayers.toLocaleString()}
                </span>
                <span className="text-[9px] xs:text-[10px] sm:text-xs text-[#9CA3AF] uppercase font-bold tracking-widest mt-2 leading-tight">
                  Registered Players
                </span>
              </div>
            </section>

            {/* Featured Tournament Section */}
            {upcomingTournaments.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                  <h2 className="font-headline font-black text-lg xs:text-xl sm:text-2xl uppercase tracking-wider text-white flex items-center gap-3">
                    <Star className="w-5 h-5 sm:w-6 sm:h-6 text-[#00F2FF]" />
                    <span>Featured Tournament</span>
                  </h2>
                </div>

                <div className="rounded-2xl p-1 relative overflow-hidden group bg-[#1C232B]/60 md:backdrop-blur-md border border-white/5">
                  <div className="absolute inset-0 bg-gradient-to-r from-[#FE6B00]/20 to-[#00F2FF]/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"></div>

                  <div className="bg-[#1C232B] rounded-xl p-5 sm:p-6 relative z-10 flex flex-col md:flex-row items-center gap-6 sm:gap-8 border border-[#374151]/30">
                    <div className="w-full md:w-1/3 aspect-video rounded-lg overflow-hidden relative shadow-lg bg-[#111417] shrink-0">
                      <img
                        className="w-full h-full object-cover"
                        alt="Gameplay screenshot"
                        loading="lazy"
                        width="400"
                        height="225"
                        src={upcomingTournaments[0].imageUrl || "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80"}
                      />
                      <div className="absolute top-2 left-2 px-3 py-1 bg-emerald-600 text-white font-headline text-xs font-bold rounded uppercase tracking-wider flex items-center gap-1 shadow-md">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                        <span>REGISTRATION OPEN</span>
                      </div>
                    </div>

                    <div className="flex-1 flex flex-col w-full space-y-5">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <h3 className="font-headline font-bold text-xl sm:text-2xl text-white mb-1">
                            {upcomingTournaments[0].title}
                          </h3>
                          <p className="text-[#9CA3AF] text-sm flex items-center gap-2 font-medium">
                            <Gamepad2 className="w-4 h-4 text-[#00F2FF]" /> {upcomingTournaments[0].game}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs text-[#9CA3AF] uppercase font-bold tracking-wider mb-1">Prize Pool</p>
                          <p className="font-headline font-black text-[#FE6B00] text-2xl sm:text-3xl lg:text-4xl drop-shadow-[0_0_12px_rgba(254,107,0,0.4)]">{upcomingTournaments[0].prizePool || upcomingTournaments[0].prize_pool}</p>
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-sm pt-3 border-t border-[#374151]/40 gap-4">
                        <div className="flex flex-col">
                          <span className="text-xs text-[#9CA3AF] uppercase font-bold tracking-wider mb-1">Entry Fee</span>
                          <span className="font-headline font-black text-[#00F2FF] text-lg sm:text-xl">{upcomingTournaments[0].entryFee || upcomingTournaments[0].entry_fee || 'Free'}</span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-xs text-[#9CA3AF] uppercase font-bold tracking-wider mb-1">Registration Closes</span>
                          <span className="font-headline font-bold text-white text-sm sm:text-base">{upcomingTournaments[0].startDate} &bull; {upcomingTournaments[0].startTime}</span>
                        </div>
                      </div>

                      <div className="bg-[#2A3441]/60 rounded-xl p-4 border border-[#374151]/40">
                        <p className="text-xs text-[#9CA3AF] uppercase font-bold tracking-wider mb-2">Slots Filled</p>
                        <div className="flex items-center gap-3.5">
                          <p className="font-display font-black text-lg sm:text-xl text-white tracking-wider shrink-0">
                            {calculateFilledPlayerSlots(upcomingTournaments[0])}/{calculateTotalPlayerSlots(upcomingTournaments[0])} Slots
                          </p>
                          <div className="flex-1 h-3 sm:h-3.5 bg-[#0B0E11] rounded-full overflow-hidden border border-white/10 shadow-inner">
                            <div
                              className="h-full bg-gradient-to-r from-[#FE6B00] via-[#FF8800] to-[#00F2FF] rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(254,107,0,0.5)]"
                              style={{ width: `${calculateSlotFillPercentage(upcomingTournaments[0])}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-4 pt-1">
                        <Link
                          to={`/tournaments/${upcomingTournaments[0].id}`}
                          className="flex-1 py-3 bg-[#00F2FF] hover:bg-[#00C2CC] text-[#0B0E11] font-headline font-bold uppercase tracking-wider rounded-lg transition-all duration-300 flex items-center justify-center gap-2 text-center min-h-[48px] shadow-[0_0_15px_rgba(0,242,255,0.3)]"
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

