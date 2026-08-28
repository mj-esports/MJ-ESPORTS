import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react'
import { Trophy, Download, Sparkles, User, Flame, Target, Swords, Award } from 'lucide-react'
import { supabase, isSupabaseConfigured } from '../lib/supabase.js'
import { TableSkeleton } from '../components/common/SkeletonLoader.jsx'
import EmptyState from '../components/common/EmptyState.jsx'
import {
  isPerKillTournament,
  isPlacementPlusKillTournament,
  isWinnerTakesAllTournament,
  extractPerKillAmount,
  extractWinnerPrizeAmount,
  extractPlacementPrizes,
  calculateTournamentTeamPayout,
  formatPayoutAmount,
} from '../utils/tournamentPrizeUtils.js'

const PublicTeamProfileModal = lazy(() => import('../components/team/PublicTeamProfileModal.jsx'))

export default function LeaderboardPage() {
  const [tournamentsList, setTournamentsList] = useState([])
  const [profilesList, setProfilesList] = useState([])
  const [registrationsList, setRegistrationsList] = useState([])
  const [selectedTeamModal, setSelectedTeamModal] = useState(null)
  const [loading, setLoading] = useState(true)
  const [championImgError, setChampionImgError] = useState(false)
  const [mvpImgError, setMvpImgError] = useState(false)
  const [tableImgErrors, setTableImgErrors] = useState({})

  // Fetch live tournaments, profiles, and registrations data from Supabase
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      if (isSupabaseConfigured) {
        const [tournRes, profRes, regRes] = await Promise.allSettled([
          supabase
            .from('tournaments')
            .select('id, title, game, format, prize_pool, status, teams_list, created_at')
            .order('created_at', { ascending: false }),
          supabase
            .from('profiles')
            .select('id, username, in_game_name, avatar_url, email, game_uid'),
          supabase
            .from('tournament_registrations')
            .select('team_name, captain_name, captain_uid, player_ign, user_email, avatar_url')
        ])

        if (tournRes.status === 'fulfilled' && tournRes.value.data) {
          setTournamentsList(tournRes.value.data)
        } else if (tournRes.status === 'fulfilled' && tournRes.value.error) {
          console.warn('[Leaderboard Supabase Fetch Notice]:', tournRes.value.error.message)
          setTournamentsList([])
        }

        if (profRes.status === 'fulfilled' && Array.isArray(profRes.value.data)) {
          setProfilesList(profRes.value.data)
        }

        if (regRes.status === 'fulfilled' && Array.isArray(regRes.value.data)) {
          setRegistrationsList(regRes.value.data)
        }
      } else {
        setTournamentsList([])
      }
    } catch (err) {
      console.warn('[Leaderboard Fetch Notice]:', err)
      setTournamentsList([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()

    if (isSupabaseConfigured) {
      const channel = supabase
        .channel('stitch_leaderboard_realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tournaments' }, () => fetchData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchData())
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [fetchData])

  // Fast lookup map for user and player avatars
  const profileMap = useMemo(() => {
    const map = {}

    // 1. Populate from tournament registrations
    registrationsList.forEach((r) => {
      const avatar = r.avatar_url || r.avatarUrl || null
      if (avatar && typeof avatar === 'string' && avatar.trim()) {
        const cleanAvatar = avatar.trim()
        if (r.captain_name) map[r.captain_name.toLowerCase().trim()] = cleanAvatar
        if (r.player_ign) map[r.player_ign.toLowerCase().trim()] = cleanAvatar
        if (r.team_name) map[r.team_name.toLowerCase().trim()] = cleanAvatar
        if (r.captain_uid) map[String(r.captain_uid).trim()] = cleanAvatar
        if (r.user_email) map[r.user_email.toLowerCase().trim()] = cleanAvatar
      }
    })

    // 2. Populate from user profiles (primary source)
    profilesList.forEach((p) => {
      const avatar = p.avatar_url || p.avatarUrl || null
      if (avatar && typeof avatar === 'string' && avatar.trim()) {
        const cleanAvatar = avatar.trim()
        if (p.username) map[p.username.toLowerCase().trim()] = cleanAvatar
        if (p.in_game_name) map[p.in_game_name.toLowerCase().trim()] = cleanAvatar
        if (p.email) map[p.email.toLowerCase().trim()] = cleanAvatar
        if (p.game_uid) map[String(p.game_uid).trim()] = cleanAvatar
      }
    })

    return map
  }, [profilesList, registrationsList])

  const activeTournament = tournamentsList[0] || null

  const activePrizeType = useMemo(() => {
    if (!activeTournament) return 'placement'
    if (isPerKillTournament(activeTournament)) return 'per_kill'
    if (isPlacementPlusKillTournament(activeTournament)) return 'placement_kill'
    if (isWinnerTakesAllTournament(activeTournament)) return 'winner_takes_all'
    return 'placement'
  }, [activeTournament])

  // Dynamic Prize Pool calculation derived from actual tournaments data
  const prizePoolSummary = useMemo(() => {
    let totalPoolNum = 0
    const hasPerKill = tournamentsList.some((t) => isPerKillTournament(t))
    const isAllPerKill = tournamentsList.length > 0 && tournamentsList.every((t) => isPerKillTournament(t))
    const isAllWinnerTakesAll = tournamentsList.length > 0 && tournamentsList.every((t) => isWinnerTakesAllTournament(t))
    const isAllPlacementKill = tournamentsList.length > 0 && tournamentsList.every((t) => isPlacementPlusKillTournament(t))

    if (isAllPerKill || activePrizeType === 'per_kill') {
      const perKillAmount = extractPerKillAmount(activeTournament || tournamentsList[0]) || 20
      return {
        isPerKill: true,
        isWinnerTakesAll: false,
        isPlacementKill: false,
        perKillAmount,
        totalFormatted: `Per Kill ₹${perKillAmount.toLocaleString('en-IN')}`,
        firstFormatted: `₹${perKillAmount} / Kill`,
        secondFormatted: `Kills × ₹${perKillAmount}`,
        thirdFormatted: `No Rank Cuts`,
        firstAmount: `Per Kill ₹${perKillAmount}`,
        secondAmount: `Per Kill ₹${perKillAmount}`,
        thirdAmount: `Per Kill ₹${perKillAmount}`,
      }
    }

    if (isAllWinnerTakesAll || activePrizeType === 'winner_takes_all') {
      const winnerAmount = extractWinnerPrizeAmount(activeTournament || tournamentsList[0]) || 1500
      return {
        isPerKill: false,
        isWinnerTakesAll: true,
        isPlacementKill: false,
        totalFormatted: `₹${winnerAmount.toLocaleString('en-IN')}`,
        firstFormatted: `₹${winnerAmount.toLocaleString('en-IN')}`,
        secondFormatted: `₹0`,
        thirdFormatted: `₹0`,
        firstAmount: `₹${winnerAmount.toLocaleString('en-IN')}`,
        secondAmount: '₹0',
        thirdAmount: '₹0',
        firstPlacePrize: winnerAmount,
        secondPlacePrize: 0,
        thirdPlacePrize: 0,
      }
    }

    if (isAllPlacementKill || activePrizeType === 'placement_kill') {
      const perKillAmount = extractPerKillAmount(activeTournament || tournamentsList[0]) || 20
      const placementPrizes = extractPlacementPrizes(activeTournament || tournamentsList[0])
      const totalPlacement = (placementPrizes.first || 0) + (placementPrizes.second || 0) + (placementPrizes.third || 0)
      return {
        isPerKill: false,
        isWinnerTakesAll: false,
        isPlacementKill: true,
        perKillAmount,
        totalFormatted: `Placement + ₹${perKillAmount} / Kill`,
        firstFormatted: `₹${placementPrizes.first || 0} + ₹${perKillAmount}/k`,
        secondFormatted: `₹${placementPrizes.second || 0} + ₹${perKillAmount}/k`,
        thirdFormatted: `₹${placementPrizes.third || 0} + ₹${perKillAmount}/k`,
        firstAmount: `₹${placementPrizes.first || 0}`,
        secondAmount: `₹${placementPrizes.second || 0}`,
        thirdAmount: `₹${placementPrizes.third || 0}`,
        firstPlacePrize: placementPrizes.first,
        secondPlacePrize: placementPrizes.second,
        thirdPlacePrize: placementPrizes.third,
      }
    }

    tournamentsList.forEach((t) => {
      if (!isPerKillTournament(t) && !isWinnerTakesAllTournament(t)) {
        const raw = String(t.prize_pool || t.prizePool || '0').replace(/[^0-9]/g, '')
        const num = parseInt(raw, 10)
        if (!isNaN(num) && num > 0) {
          totalPoolNum += num
        }
      }
    })

    // Fallback baseline if no prize pool amount set in tournaments list
    if (totalPoolNum === 0 && !hasPerKill) {
      totalPoolNum = 25000
    }

    const firstPlacePrize = Math.round(totalPoolNum * 0.6)
    const secondPlacePrize = Math.round(totalPoolNum * 0.25)
    const thirdPlacePrize = Math.max(0, totalPoolNum - firstPlacePrize - secondPlacePrize)

    return {
      isPerKill: false,
      isWinnerTakesAll: false,
      isPlacementKill: false,
      totalFormatted: `₹${totalPoolNum.toLocaleString('en-IN')}`,
      firstFormatted: `60% (₹${firstPlacePrize.toLocaleString('en-IN')})`,
      secondFormatted: `25% (₹${secondPlacePrize.toLocaleString('en-IN')})`,
      thirdFormatted: `15% (₹${thirdPlacePrize.toLocaleString('en-IN')})`,
      firstAmount: `₹${firstPlacePrize.toLocaleString('en-IN')}`,
      secondAmount: `₹${secondPlacePrize.toLocaleString('en-IN')}`,
      thirdAmount: `₹${thirdPlacePrize.toLocaleString('en-IN')}`,
      firstPlacePrize,
      secondPlacePrize,
      thirdPlacePrize,
    }
  }, [tournamentsList, activeTournament, activePrizeType])

  // Aggregate Final Standings & Top Teams/Players with resolved real avatar images
  const standings = useMemo(() => {
    const statsMap = {}

    tournamentsList.forEach((t) => {
      const teams = Array.isArray(t.teams_list) ? t.teams_list : (Array.isArray(t.teamsList) ? t.teamsList : [])

      teams.forEach((team) => {
        if (!team) return
        const name = team.team || team.teamName || team.team_name || team.name || team.captain || 'Team Apex'
        const player = team.captain || team.captain_name || team.player || team.name || 'Player'
        const captainUid = team.captain_uid || team.captainUid || team.freeFireUid || team.game_uid || team.gameUid || null
        const kills = Math.max(0, Number(team.kills || team.finishes || 0))
        const points = Number(team.points || team.score || 0)
        const isWinner = team.rank === 1 || team.position === 1

        const playerKey = player.toLowerCase().trim()
        const teamKey = name.toLowerCase().trim()
        const uidKey = captainUid ? String(captainUid).trim() : ''

        const resolvedAvatar =
          team.avatar_url ||
          team.avatar ||
          team.avatarUrl ||
          profileMap[playerKey] ||
          profileMap[teamKey] ||
          (uidKey ? profileMap[uidKey] : null) ||
          team.logoUrl ||
          team.logo_url ||
          null

        if (!statsMap[name]) {
          statsMap[name] = {
            team: name,
            player: player,
            matches: 0,
            wins: 0,
            points: 0,
            kills: 0,
            avatar: resolvedAvatar,
          }
        }
        statsMap[name].matches += 1
        if (isWinner) statsMap[name].wins += 1
        statsMap[name].points += points
        statsMap[name].kills += kills
        if (resolvedAvatar) {
          statsMap[name].avatar = resolvedAvatar
        }
      })
    })

    const sortedList = Object.values(statsMap)
      .sort((a, b) => b.points - a.points || b.wins - a.wins || b.kills - a.kills || a.team.localeCompare(b.team))

    return sortedList.slice(0, 50).map((item, index) => {
      const rank = index + 1
      const payoutResult = calculateTournamentTeamPayout(item, rank, activeTournament, prizePoolSummary)

      return {
        ...item,
        rank,
        payout: payoutResult.formatted,
        payoutAmount: payoutResult.amount,
        placementAmount: payoutResult.placementAmount || 0,
        killPayout: payoutResult.killPayout || 0,
      }
    })
  }, [tournamentsList, activeTournament, prizePoolSummary, profileMap])

  const championTeam = standings[0] || null

  // Dynamic Tournament MVP based on maximum individual kills / impact
  const mvpPlayer = useMemo(() => {
    if (standings.length === 0) return null
    const sortedByKills = [...standings].sort((a, b) => b.kills - a.kills || b.points - a.points)
    return sortedByKills[0] || standings[0] || null
  }, [standings])

  // Context-aware Top Podium Card Configuration
  const leaderCardConfig = useMemo(() => {
    if (!championTeam) return null
    const perKillAmount = prizePoolSummary.perKillAmount || 30

    if (activePrizeType === 'per_kill') {
      return {
        cardBorder: 'border-[#00f2ff]/40 shadow-[0_0_40px_-10px_rgba(0,242,255,0.25)]',
        badgeText: 'Top Fragger',
        badgeIcon: Target,
        badgeColor: 'text-[#00f2ff]',
        avatarBorder: 'border-[#00f2ff]',
        avatarIconColor: 'text-[#00f2ff]',
        titleColor: 'text-white',
        metricLabel: 'Total Earned',
        metricValueColor: 'text-[#00f2ff]',
        calculationText: `${championTeam.kills} KILLS × ₹${perKillAmount} = ${championTeam.payout}`,
        highlightBadge: `${championTeam.kills} Kills Confirmed`,
      }
    }

    if (activePrizeType === 'winner_takes_all') {
      return {
        cardBorder: 'border-[#fed83a]/50 shadow-[0_0_40px_-10px_rgba(254,216,58,0.3)]',
        badgeText: 'Sole Champion',
        badgeIcon: Award,
        badgeColor: 'text-[#fed83a]',
        avatarBorder: 'border-[#fed83a]',
        avatarIconColor: 'text-[#fed83a]',
        titleColor: 'text-[#fed83a]',
        metricLabel: 'Winner Prize',
        metricValueColor: 'text-[#fed83a]',
        calculationText: '100% Winner-Takes-All Purse',
        highlightBadge: '1st Place Winner',
      }
    }

    if (activePrizeType === 'placement_kill') {
      const placementStr = formatPayoutAmount(championTeam.placementAmount)
      const killStr = formatPayoutAmount(championTeam.killPayout)
      return {
        cardBorder: 'border-[#fed83a]/40 shadow-[0_0_40px_-10px_rgba(254,216,58,0.25)]',
        badgeText: 'Tournament Champions',
        badgeIcon: Swords,
        badgeColor: 'text-[#fed83a]',
        avatarBorder: 'border-[#fed83a]',
        avatarIconColor: 'text-[#fed83a]',
        titleColor: 'text-white',
        metricLabel: 'Total Earned',
        metricValueColor: 'text-[#fed83a]',
        calculationText: `Placement ${placementStr} + ${championTeam.kills} Kills (${killStr})`,
        highlightBadge: `Rank #1 • ${championTeam.kills} Kills`,
      }
    }

    // Default: Placement Only
    return {
      cardBorder: 'border-[#fed83a]/40 shadow-[0_0_40px_-10px_rgba(254,216,58,0.25)]',
      badgeText: 'Grand Champions',
      badgeIcon: Trophy,
      badgeColor: 'text-[#fed83a]',
      avatarBorder: 'border-[#fed83a]',
      avatarIconColor: 'text-[#fed83a]',
      titleColor: 'text-white',
      metricLabel: 'Prize Money Won',
      metricValueColor: 'text-[#fed83a]',
      calculationText: '1st Place Placement Prize',
      highlightBadge: 'Rank #1 Champion',
    }
  }, [championTeam, activePrizeType, prizePoolSummary])

  const handleDownloadCsv = () => {
    if (standings.length === 0) return
    const payoutCol =
      activePrizeType === 'per_kill'
        ? 'Earned'
        : activePrizeType === 'placement_kill'
        ? 'TotalPayout'
        : activePrizeType === 'winner_takes_all'
        ? 'Prize'
        : 'Payout'

    const headers = [`Rank,Team,Kills,TotalPoints,${payoutCol}\n`]
    const rows = standings.map(
      (s) => `${s.rank},"${s.team}",${s.kills},${s.points},"${s.payout}"\n`
    )
    const blob = new Blob([...headers, ...rows], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `MJ_ESPORTS_Final_Standings_2026.csv`
    a.click()
  }

  return (
    <div className="w-full min-h-screen bg-[#131314] text-[#b9cacb] pb-28 sm:pb-32 font-body antialiased selection:bg-[#00f2ff]/30 selection:text-[#00f2ff] overflow-x-hidden">
      <main className="max-w-7xl mx-auto pt-6 sm:pt-8 px-4 sm:px-6 lg:px-8">
        
        {/* 1. HEADER SECTION (Compact Mobile Padding) */}
        <header className="mb-6 sm:mb-8 md:mb-10">
          <div className="flex items-center gap-2 text-xs font-label-bold text-[#00f2ff] uppercase tracking-wider mb-2">
            <span>Arena Statistics</span>
            <span>&bull;</span>
            <span>Tournament Leaderboard</span>
          </div>
          <h1 className="font-headline text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-2 sm:mb-3">
            Leaderboard Standings
          </h1>
          <p className="text-[#b9cacb] text-sm sm:text-base md:text-lg max-w-2xl font-body">
            Witness the champions, the MVPs, and the final standings of India's most competitive esports tournaments.
          </p>
        </header>

        {/* 2. BENTO GRID TOP SECTION */}
        {standings.length > 0 && championTeam && leaderCardConfig && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8 sm:mb-12">
            
            {/* 1. Champion / Top Fragger Podium Card */}
            <div className={`col-span-1 md:col-span-2 lg:col-span-2 bg-[#141416] rounded border ${leaderCardConfig.cardBorder} p-5 sm:p-6 flex flex-col justify-between relative overflow-hidden group`}>
              <div className="relative z-10">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <h2 className={`font-label-bold ${leaderCardConfig.badgeColor} font-bold uppercase tracking-wider text-xs flex items-center gap-1.5`}>
                    <leaderCardConfig.badgeIcon className="w-3.5 h-3.5" />
                    <span>{leaderCardConfig.badgeText}</span>
                  </h2>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[#1c1b1c] border border-[#27272a] text-[#849495]">
                    {leaderCardConfig.highlightBadge}
                  </span>
                </div>

                <div className="flex items-center gap-3.5 sm:gap-4 mb-3 sm:mb-4">
                  <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded bg-[#131314] flex items-center justify-center border-2 ${leaderCardConfig.avatarBorder} p-1 shadow-lg shrink-0 overflow-hidden`}>
                    {championTeam.avatar && !championImgError ? (
                      <img
                        src={championTeam.avatar}
                        alt={`${championTeam.player || championTeam.team} profile photo`}
                        className="w-full h-full rounded object-cover"
                        onError={() => setChampionImgError(true)}
                      />
                    ) : (
                      <leaderCardConfig.badgeIcon className={`w-7 h-7 ${leaderCardConfig.avatarIconColor}`} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className={`font-headline text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight ${leaderCardConfig.titleColor} uppercase truncate`} title={championTeam.team}>
                      {championTeam.team}
                    </h3>
                    <p className="text-xs text-[#849495] font-body truncate">Captain: {championTeam.player}</p>
                  </div>
                </div>
              </div>

              <div className="relative z-10 flex flex-wrap gap-3 sm:gap-4 items-end justify-between mt-2 pt-3 border-t border-[#27272a]">
                <div>
                  <p className="text-[#849495] font-label-bold text-xs uppercase mb-0.5">{leaderCardConfig.metricLabel}</p>
                  <p className={`font-headline text-2xl sm:text-3xl font-bold ${leaderCardConfig.metricValueColor}`}>{championTeam.payout}</p>
                  <p className="text-xs font-mono text-[#849495] mt-0.5 font-bold">
                    {leaderCardConfig.calculationText}
                  </p>
                </div>
                <div className="bg-[#1c1b1c] px-3 py-1.5 rounded border border-[#27272a] flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#00f2ff] shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-[#849495] font-label-bold uppercase">Team MVP</p>
                    <p className="font-bold text-xs sm:text-sm text-white font-headline truncate max-w-[130px] sm:max-w-none">{championTeam.player}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Tournament MVP Card */}
            {mvpPlayer && (
              <div className="col-span-1 bg-[#141416] rounded p-5 sm:p-6 flex flex-col items-center text-center relative overflow-hidden shadow-[0_0_30px_-10px_rgba(0,242,255,0.15)] border border-[#27272a]">
                <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-transparent via-[#00f2ff] to-transparent"></div>
                <h2 className="font-label-bold text-[#00f2ff] font-bold uppercase tracking-wider text-xs mb-3 w-full text-left flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5" />
                  <span>Tournament MVP</span>
                </h2>
                <div className="relative mb-2.5">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded border-2 border-[#00f2ff] p-1 relative z-10 bg-[#131314] flex items-center justify-center overflow-hidden">
                    {mvpPlayer.avatar && !mvpImgError ? (
                      <img
                        src={mvpPlayer.avatar}
                        alt={`${mvpPlayer.player} profile photo`}
                        className="w-full h-full rounded object-cover"
                        onError={() => setMvpImgError(true)}
                      />
                    ) : (
                      <User className="w-7 h-7 sm:w-8 sm:h-8 text-[#00f2ff]" />
                    )}
                  </div>
                  <div className="absolute inset-0 bg-[#00f2ff] blur-xl opacity-20 rounded-full"></div>
                </div>
                <h3 className="font-headline text-lg sm:text-xl font-bold mb-0.5 text-white truncate max-w-full" title={mvpPlayer.player}>
                  {mvpPlayer.player}
                </h3>
                <p className="text-[#849495] text-xs font-body mb-3 truncate max-w-full">{mvpPlayer.team}</p>
                <div className="w-full grid grid-cols-2 gap-2 mt-auto">
                  <div className="bg-[#1c1b1c] rounded p-2 sm:p-2.5 border border-[#27272a]">
                    <p className="text-xs text-[#849495] font-label-bold uppercase mb-0.5">Total Kills</p>
                    <p className="font-headline text-base sm:text-lg font-bold text-white">{mvpPlayer.kills}</p>
                  </div>
                  <div className="bg-[#1c1b1c] rounded p-2 sm:p-2.5 border border-[#27272a]">
                    <p className="text-xs text-[#849495] font-label-bold uppercase mb-0.5">Matches</p>
                    <p className="font-headline text-base sm:text-lg font-bold text-[#00f2ff]">{mvpPlayer.matches}</p>
                  </div>
                </div>
              </div>
            )}

            {/* 3. Dynamic Prize Pool / Structure Summary */}
            <div className="col-span-1 md:col-span-2 lg:col-span-1 bg-[#141416] rounded p-5 sm:p-6 flex flex-col border border-[#27272a]">
              <h2 className="font-label-bold text-[#849495] font-bold uppercase tracking-wider text-xs mb-3 flex items-center gap-1.5">
                {activePrizeType === 'per_kill' ? (
                  <>
                    <Target className="w-3.5 h-3.5 text-[#00f2ff]" />
                    <span className="text-[#00f2ff]">Prize Model</span>
                  </>
                ) : activePrizeType === 'placement_kill' ? (
                  <>
                    <Swords className="w-3.5 h-3.5 text-[#fed83a]" />
                    <span className="text-[#fed83a]">Prize Structure</span>
                  </>
                ) : activePrizeType === 'winner_takes_all' ? (
                  <>
                    <Award className="w-3.5 h-3.5 text-[#fed83a]" />
                    <span className="text-[#fed83a]">Prize Model</span>
                  </>
                ) : (
                  <>
                    <Trophy className="w-3.5 h-3.5 text-[#fed83a]" />
                    <span>Prize Pool</span>
                  </>
                )}
              </h2>

              <div className="mb-3 sm:mb-4">
                <p className="text-xs text-[#849495] font-label-bold mb-0.5">
                  {activePrizeType === 'per_kill' ? 'Reward System' : activePrizeType === 'winner_takes_all' ? 'Purse' : 'Total Pool'}
                </p>
                <p className="font-headline text-2xl sm:text-3xl font-bold text-white">{prizePoolSummary.totalFormatted}</p>
              </div>

              <div className="space-y-2 sm:space-y-2.5 mt-auto">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#fed83a] shrink-0"></div>
                    <span className="text-[#b9cacb] font-headline font-bold">
                      {activePrizeType === 'per_kill' ? 'Reward / Kill' : activePrizeType === 'winner_takes_all' ? '1st Place / Winner' : '1st Place'}
                    </span>
                  </div>
                  <span className="font-headline font-bold text-[#fed83a]">{prizePoolSummary.firstFormatted}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#b9cacb] shrink-0"></div>
                    <span className="text-[#b9cacb] font-headline font-bold">
                      {activePrizeType === 'per_kill' ? 'Calculation' : '2nd Place'}
                    </span>
                  </div>
                  <span className="font-headline font-bold text-[#b9cacb]">{prizePoolSummary.secondFormatted}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#ff5e07] shrink-0"></div>
                    <span className="text-[#b9cacb] font-headline font-bold">
                      {activePrizeType === 'per_kill' ? 'Distribution' : '3rd Place'}
                    </span>
                  </div>
                  <span className="font-headline font-bold text-[#ff5e07]">{prizePoolSummary.thirdFormatted}</span>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* 3. FINAL STANDINGS LEADERBOARD TABLE */}
        <section className="space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
            <h2 className="font-headline text-xl sm:text-2xl font-extrabold tracking-tight text-white uppercase">
              Final Standings
            </h2>
            {standings.length > 0 && (
              <button
                onClick={handleDownloadCsv}
                className="text-xs font-headline font-bold text-[#00f2ff] hover:text-[#131314] hover:bg-[#00f2ff] transition-all flex items-center gap-2 bg-[#141416] px-4 py-2.5 rounded border border-[#27272a] hover:border-[#00f2ff] cursor-pointer uppercase tracking-wider min-h-[40px] shadow-sm select-none"
              >
                <span>Download Full CSV</span>
                <Download className="w-4 h-4 shrink-0" />
              </button>
            )}
          </div>

          <div className="bg-[#141416] rounded border border-[#27272a] overflow-hidden shadow-2xl">
            {loading ? (
              <div className="p-4">
                <TableSkeleton rows={6} />
              </div>
            ) : standings.length === 0 ? (
              <EmptyState type="leaderboard" sentence="No leaderboard data available yet." />
            ) : (
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left border-collapse table-fixed sm:table-auto">
                  <thead>
                    <tr className="border-b border-[#27272a] bg-[#1c1b1c] font-headline font-bold text-xs uppercase text-[#849495] tracking-wider">
                      <th className="py-3.5 sm:py-4 px-3 sm:px-6 text-center w-12 sm:w-16">Rank</th>
                      <th className="py-3.5 sm:py-4 px-3 sm:px-6">Team / Squad</th>
                      <th className="py-3.5 sm:py-4 px-3 sm:px-6 text-right w-16 sm:w-24">Kills</th>
                      <th className="py-3.5 sm:py-4 px-3 sm:px-6 text-right w-16 sm:w-24 hidden xs:table-cell">Total Pts</th>
                      <th className="py-3.5 sm:py-4 px-3 sm:px-6 text-right pr-3 sm:pr-6 w-24 sm:w-32 hidden sm:table-cell">
                        {activePrizeType === 'per_kill' ? 'Earned' : activePrizeType === 'placement_kill' ? 'Total Payout' : activePrizeType === 'winner_takes_all' ? 'Prize' : 'Payout'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#27272a] text-xs">
                    {standings.map((s) => {
                      const isRank1 = s.rank === 1
                      const isRank2 = s.rank === 2
                      const isRank3 = s.rank === 3

                      return (
                        <tr
                          key={`standings-row-${s.rank}`}
                          onClick={() => setSelectedTeamModal(s)}
                          className={`group hover:bg-[#201f20] transition-colors cursor-pointer ${
                            isRank1 ? 'bg-[#fed83a]/5' : ''
                          }`}
                        >
                          {/* Rank Badge */}
                          <td className="py-3 sm:py-4 px-2 sm:px-6 text-center">
                            <div
                              className={`inline-flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded font-headline font-bold text-xs sm:text-sm ${
                                isRank1
                                  ? 'bg-[#fed83a] text-[#131314] shadow-md'
                                  : isRank2
                                  ? 'bg-[#b9cacb] text-[#131314]'
                                  : isRank3
                                  ? 'bg-[#ff5e07] text-[#131314]'
                                  : 'text-[#849495] bg-[#1c1b1c] border border-[#27272a]'
                              }`}
                            >
                              {s.rank}
                            </div>
                          </td>

                          {/* Team & Player Info (Safely bounds width) */}
                          <td className="py-3 sm:py-4 px-3 sm:px-6 min-w-0 max-w-[180px] sm:max-w-none">
                            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded bg-[#131314] border border-[#27272a] overflow-hidden flex items-center justify-center shrink-0">
                                {s.avatar && !tableImgErrors[s.rank] ? (
                                  <img
                                    src={s.avatar}
                                    alt={`${s.player || s.team} profile photo`}
                                    className="w-full h-full object-cover"
                                    onError={() => setTableImgErrors((prev) => ({ ...prev, [s.rank]: true }))}
                                  />
                                ) : (
                                  <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#00f2ff]" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <span className={`font-bold font-headline block truncate text-xs sm:text-sm ${
                                  isRank1 ? 'text-[#fed83a]' : 'text-white'
                                }`} title={s.team}>
                                  {s.team}
                                </span>
                                <span className="text-xs text-[#849495] font-body block truncate" title={s.player}>
                                  {s.player}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Kills */}
                          <td className="py-3 sm:py-4 px-3 sm:px-6 text-right font-headline font-bold text-[#00f2ff] text-xs sm:text-sm whitespace-nowrap">
                            {s.kills}
                          </td>

                          {/* Total Points (Hidden on extra-small mobile) */}
                          <td className="py-3 sm:py-4 px-3 sm:px-6 text-right font-headline font-bold text-white text-xs sm:text-sm whitespace-nowrap hidden xs:table-cell">
                            {s.points}
                          </td>

                          {/* Payout (Hidden on mobile, visible on tablet/desktop) */}
                          <td className={`py-3 sm:py-4 px-3 sm:px-6 text-right pr-3 sm:pr-6 font-headline font-bold text-xs sm:text-sm whitespace-nowrap hidden sm:table-cell ${
                            isRank1 ? 'text-[#fed83a]' : isRank2 ? 'text-[#b9cacb]' : isRank3 ? 'text-[#ff5e07]' : 'text-[#849495]'
                          }`}>
                            {s.payout}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

      </main>

      {selectedTeamModal && (
        <Suspense fallback={null}>
          <PublicTeamProfileModal
            team={selectedTeamModal}
            onClose={() => setSelectedTeamModal(null)}
          />
        </Suspense>
      )}
    </div>
  )
}

