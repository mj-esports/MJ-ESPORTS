import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTournaments } from '../contexts/TournamentContext'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { fetchWalletLedger, fetchAllUserPrizeCredits } from '../services/walletService'
import {
  ArrowLeft,
  Activity,
  Trophy,
  Flame,
  Crosshair,
  ShieldCheck,
  Wallet,
  CheckCircle2,
  Gamepad2,
  Award,
  TrendingUp,
  BarChart3,
  Calendar
} from 'lucide-react'

export default function StatisticsPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const { tournaments, isUserRegistered, loading: tournamentsLoading } = useTournaments()

  // 1. Authoritative Verification Status (public.profiles.verification_status)
  const [isVerified, setIsVerified] = useState(false)

  useEffect(() => {
    if (!user?.id) {
      setIsVerified(false)
      return
    }

    let isMounted = true

    async function checkAuthoritativeVerification() {
      if (!isSupabaseConfigured) {
        const metaStatus = user?.user_metadata?.verification_status
        const profStatus = profile?.verification_status
        if (isMounted) {
          setIsVerified(metaStatus === 'Verified' || profStatus === 'Verified')
        }
        return
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('verification_status')
          .eq('id', user.id)
          .maybeSingle()

        if (isMounted) {
          if (!error && data?.verification_status === 'Verified') {
            setIsVerified(true)
          } else if (profile?.verification_status === 'Verified') {
            setIsVerified(true)
          } else {
            setIsVerified(false)
          }
        }
      } catch (err) {
        console.warn('[StatisticsPage verification check warn]:', err)
        if (isMounted) {
          setIsVerified(profile?.verification_status === 'Verified')
        }
      }
    }

    checkAuthoritativeVerification()

    return () => {
      isMounted = false
    }
  }, [user?.id, profile?.verification_status])

  // 2. Player Identity Details (Free Fire MAX only)
  const meta = user?.user_metadata || {}
  const displayName = meta.username || profile?.username || meta.full_name || user?.email?.split('@')[0] || 'Player'
  const freeFireUid = meta.freeFireUid || meta.game_uid || profile?.game_uid || ''
  const isPro = Boolean(meta.is_pro || profile?.is_pro)
  const avatarUrl =
    meta.avatar_url ||
    meta.avatarUrl ||
    profile?.avatar_url ||
    'https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&w=400&q=80'

  // 3. Authoritative Completed Tournaments & Telemetry Calculations
  // userRegistrations = tournament registrations the player participated in
  const userRegistrations = useMemo(() => {
    if (!Array.isArray(tournaments) || !user) return []
    return tournaments.filter((t) =>
      isUserRegistered(t.id, user.email || user.id || meta.username)
    )
  }, [tournaments, isUserRegistered, user, meta.username])

  // Completed tournaments with confirmed results where player participated
  const completedTournaments = useMemo(() => {
    return userRegistrations.filter((t) => t.status === 'Completed')
  }, [userRegistrations])

  const completedTournamentsCount = completedTournaments.length

  // Helper to resolve player's team record from tournament result
  const getPlayerTeam = (tournament) => {
    const teams = Array.isArray(tournament.teams_list)
      ? tournament.teams_list
      : Array.isArray(tournament.teamsList)
      ? tournament.teamsList
      : []
    return teams.find(
      (team) =>
        (user?.id && team.userId && String(team.userId) === String(user.id)) ||
        (user?.email && team.captain?.toLowerCase() === user.email.toLowerCase()) ||
        (user?.email && team.email?.toLowerCase() === user.email.toLowerCase()) ||
        (freeFireUid && team.freeFireUid && String(team.freeFireUid) === String(freeFireUid))
    )
  }

  // WINS: Confirmed 1st-place finishes in completed tournaments
  const winsCount = useMemo(() => {
    return completedTournaments.filter((t) => {
      const myTeam = getPlayerTeam(t)
      return myTeam && (myTeam.rank === 1 || myTeam.position === 1)
    }).length
  }, [completedTournaments, user, freeFireUid])

  // TOTAL KILLS: Confirmed player/team eliminations in completed tournament results
  const totalKills = useMemo(() => {
    return completedTournaments.reduce((acc, t) => {
      const myTeam = getPlayerTeam(t)
      return acc + Number(myTeam?.kills || myTeam?.finishes || 0)
    }, 0)
  }, [completedTournaments, user, freeFireUid])

  // WIN RATE: Calculated percentage of completed tournaments won (wins / completedTournamentsCount)
  const winRate = useMemo(() => {
    if (completedTournamentsCount === 0) return '—'
    return `${Math.round((winsCount / completedTournamentsCount) * 100)}%`
  }, [completedTournamentsCount, winsCount])

  // KILLS PER TOURNAMENT: Total confirmed kills / completed tournaments
  const kdRatio = useMemo(() => {
    if (completedTournamentsCount === 0) return '—'
    return (totalKills / completedTournamentsCount).toFixed(2)
  }, [completedTournamentsCount, totalKills])

  // AVERAGE KILLS: Average kills per completed tournament
  const avgKills = useMemo(() => {
    if (completedTournamentsCount === 0) return '—'
    return (totalKills / completedTournamentsCount).toFixed(1)
  }, [completedTournamentsCount, totalKills])

  // 4. Authoritative Tournament Prize Earnings Metric
  // Authoritative accounting source: public.wallet_ledger where transaction_type = 'PRIZE_CREDIT' AND direction = 'CREDIT'
  // Strictly traverses ALL confirmed PRIZE_CREDIT ledger entries with pagination to guarantee completeness without arbitrary limits.
  const [authoritativeEarnings, setAuthoritativeEarnings] = useState(null)
  const [highestConfirmedPrize, setHighestConfirmedPrize] = useState(null)
  const [hasEarningsData, setHasEarningsData] = useState(false)
  const [isEarningsLoading, setIsEarningsLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) {
      setAuthoritativeEarnings(null)
      setHighestConfirmedPrize(null)
      setHasEarningsData(false)
      setIsEarningsLoading(false)
      return
    }

    let isMounted = true

    async function loadAuthoritativeEarnings() {
      setIsEarningsLoading(true)
      try {
        let totalPrize = 0
        let maxPrize = 0

        // Fetch ALL confirmed wallet ledger PRIZE_CREDIT entries (paginated batch traversal, no arbitrary cap)
        const prizeCredits = await fetchAllUserPrizeCredits(user.id)

        if (Array.isArray(prizeCredits) && prizeCredits.length > 0) {
          prizeCredits
            .filter(
              (t) =>
                t.transaction_type === 'PRIZE_CREDIT' &&
                t.direction === 'CREDIT'
            )
            .forEach((t) => {
              const amt = Math.abs(Number(t.amount || 0))
              totalPrize += amt
              if (amt > maxPrize) maxPrize = amt
            })
        }

        if (isMounted) {
          if (totalPrize > 0) {
            setAuthoritativeEarnings(totalPrize)
            setHighestConfirmedPrize(maxPrize > 0 ? maxPrize : null)
            setHasEarningsData(true)
          } else {
            // No confirmed prize credits in authoritative ledger
            setAuthoritativeEarnings(null)
            setHighestConfirmedPrize(null)
            setHasEarningsData(false)
          }
        }
      } catch (err) {
        console.warn('[StatisticsPage loadEarnings exception]:', err)
        if (isMounted) {
          setAuthoritativeEarnings(null)
          setHighestConfirmedPrize(null)
          setHasEarningsData(false)
        }
      } finally {
        if (isMounted) {
          setIsEarningsLoading(false)
        }
      }
    }

    loadAuthoritativeEarnings()

    return () => {
      isMounted = false
    }
  }, [user?.id])

  // 5. Placement Distribution & Podium Finishes Calculations
  const { placementDistribution, podiumFinishes, bestPlacement, highestTournamentKills } = useMemo(() => {
    let first = 0
    let second = 0
    let third = 0
    let fourthFifth = 0
    let sixthPlus = 0
    let minRank = Infinity
    let maxKills = 0

    completedTournaments.forEach((t) => {
      const myTeam = getPlayerTeam(t)
      if (myTeam) {
        const teams = Array.isArray(t.teams_list) ? t.teams_list : (Array.isArray(t.teamsList) ? t.teamsList : [])
        const rank = Number(myTeam.rank || myTeam.position || (teams.indexOf(myTeam) + 1) || 0)
        const kills = Number(myTeam.kills || myTeam.finishes || 0)

        if (rank > 0 && rank < minRank) minRank = rank
        if (kills > maxKills) maxKills = kills

        if (rank === 1) first++
        else if (rank === 2) second++
        else if (rank === 3) third++
        else if (rank === 4 || rank === 5) fourthFifth++
        else if (rank >= 6) sixthPlus++
      }
    })

    const podium = first + second + third

    return {
      placementDistribution: {
        first,
        second,
        third,
        fourthFifth,
        sixthPlus,
      },
      podiumFinishes: podium,
      bestPlacement: minRank !== Infinity ? `#${minRank}` : '—',
      highestTournamentKills: maxKills > 0 ? maxKills : (completedTournamentsCount > 0 ? 0 : '—'),
    }
  }, [completedTournaments, user, freeFireUid, completedTournamentsCount])

  // 6. Recent Completed Tournaments Performance List
  const recentCompletedTournaments = useMemo(() => {
    return completedTournaments.slice(0, 5).map((t) => {
      const myTeam = getPlayerTeam(t)
      const teams = Array.isArray(t.teams_list) ? t.teams_list : (Array.isArray(t.teamsList) ? t.teamsList : [])
      const rank = myTeam ? (myTeam.rank || myTeam.position || (teams.indexOf(myTeam) + 1) || '—') : '—'
      const kills = myTeam ? Number(myTeam.kills || myTeam.finishes || 0) : 0
      const date = t.start_date || t.created_at ? new Date(t.start_date || t.created_at).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      }) : 'Recent'

      return {
        id: t.id,
        title: t.title || 'Free Fire MAX Tournament',
        format: t.format || 'Squad',
        rank: typeof rank === 'number' ? `#${rank}` : rank,
        isWinner: rank === 1,
        kills,
        date,
      }
    })
  }, [completedTournaments, user, freeFireUid])

  // 7. Loading Skeleton State
  if ((authLoading || tournamentsLoading) && !user) {
    return (
      <div className="bg-[#07080b] text-white font-body min-h-screen pb-20 antialiased font-mono">
        <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-6 animate-pulse">
          <div className="h-6 w-36 bg-[#0d0e15] rounded border border-[#1f2230]"></div>
          <div className="h-28 bg-[#0d0e15] rounded-2xl border border-[#1f2230]"></div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-24 bg-[#0d0e15] rounded-xl border border-[#1f2230]"></div>
            ))}
          </div>
          <div className="h-48 bg-[#0d0e15] rounded-2xl border border-[#1f2230]"></div>
        </main>
      </div>
    )
  }

  return (
    <div className="bg-[#07080b] text-white font-body min-h-screen pb-20 antialiased selection:bg-[#00f2ff]/30 selection:text-white">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 space-y-5 sm:space-y-6">

        {/* ================================================== */}
        {/* 1. TOP HEADER & BACK NAVIGATION                    */}
        {/* ================================================== */}
        <div className="flex items-center justify-between gap-3">
          <Link
            to="/profile"
            aria-label="Return to Profile"
            className="inline-flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-[#8e95a5] hover:text-[#00f2ff] transition-colors p-1 -ml-1 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span>Return to Profile</span>
          </Link>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#00f2ff]/10 border border-[#00f2ff]/30 text-[#00f2ff] text-[10px] font-mono font-bold uppercase tracking-widest">
            <Gamepad2 className="w-3 h-3 text-[#00f2ff]" />
            <span>FREE FIRE MAX</span>
          </span>
        </div>

        {/* ================================================== */}
        {/* 2. PLAYER IDENTITY CONSOLE HEADER                  */}
        {/* ================================================== */}
        <section
          aria-label="Player Performance Console"
          className="relative rounded-2xl bg-gradient-to-b from-[#0e1017] to-[#0a0b10] border border-[#1f2230] p-4 sm:p-5 shadow-[0_4px_30px_rgba(0,0,0,0.6)] overflow-hidden"
        >
          <div
            className="absolute inset-0 pointer-events-none opacity-20"
            style={{
              backgroundImage: 'radial-gradient(#00f2ff 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          ></div>
          <div className="absolute top-0 right-0 w-64 h-32 bg-[#00f2ff]/5 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 text-center sm:text-left">
              <div className="relative flex-shrink-0">
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover ring-2 ring-[#00f2ff]/30 ring-offset-2 ring-offset-[#0d0e15]"
                />
                {isPro && (
                  <div className="absolute -bottom-1 -right-1 bg-[#00f2ff] text-black text-[8px] font-black font-headline px-1.5 py-0.5 rounded uppercase tracking-wider border border-[#0a0b10]">
                    PRO
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 justify-center sm:justify-start flex-wrap">
                  <h1 className="text-lg sm:text-xl font-headline font-black text-white uppercase tracking-tight">
                    {displayName}
                  </h1>
                  {isVerified && (
                    <span
                      id="stats-verified-badge"
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#00ff9d]/10 border border-[#00ff9d]/30 text-[#00ff9d] text-[9px] font-mono font-bold uppercase tracking-widest"
                    >
                      <CheckCircle2 className="w-2.5 h-2.5 text-[#00ff9d]" />
                      <span>VERIFIED</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-center sm:justify-start gap-2 text-xs font-mono text-[#8e95a5]">
                  <span className="text-[#00f2ff] font-bold text-[10px] uppercase">FF MAX UID:</span>
                  <span className="text-white font-semibold">{freeFireUid || 'Not Linked'}</span>
                </div>
              </div>
            </div>

            <div className="text-center sm:text-right border-t sm:border-t-0 border-[#1f2230] pt-2 sm:pt-0 w-full sm:w-auto">
              <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#717a8e]">
                Console Telemetry
              </div>
              <div className="text-xs font-mono font-semibold text-[#00f2ff] mt-0.5">
                Official Competitive Feed
              </div>
            </div>
          </div>
        </section>

        {/* ================================================== */}
        {/* 3. PERFORMANCE OVERVIEW (6 TELEMETRY CARDS)        */}
        {/* ================================================== */}
        <section aria-label="Performance Overview" className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[11px] font-mono font-bold uppercase tracking-widest text-[#717a8e] flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-[#00f2ff]" />
              <span>Performance Overview</span>
            </h2>
            <span className="text-[10px] font-mono text-[#525866] uppercase tracking-wider">
              {completedTournamentsCount} Completed {completedTournamentsCount === 1 ? 'Tournament' : 'Tournaments'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {/* 1. Completed Tournaments (Accurately describes completed tournament participations) */}
            <div className="bg-gradient-to-b from-[#0e1017] to-[#0a0b10] border border-[#1f2230] rounded-xl p-3 sm:p-3.5 flex flex-col justify-between hover:border-[#00f2ff]/40 transition-all group">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#8e95a5]">
                Completed Tournaments
              </span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-xl sm:text-2xl font-mono font-black text-white group-hover:text-[#00f2ff] transition-colors">
                  {completedTournamentsCount}
                </span>
                <Trophy className="w-3.5 h-3.5 text-[#ff5e07]/60 group-hover:text-[#ff5e07] transition-colors" />
              </div>
            </div>

            {/* 2. Wins (First-place finishes in completed tournaments) */}
            <div className="bg-gradient-to-b from-[#0e1017] to-[#0a0b10] border border-[#1f2230] rounded-xl p-3 sm:p-3.5 flex flex-col justify-between hover:border-[#ff5e07]/40 transition-all group">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#8e95a5]">
                Wins
              </span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-xl sm:text-2xl font-mono font-black text-white group-hover:text-[#ff5e07] transition-colors">
                  {winsCount}
                </span>
                <Flame className="w-3.5 h-3.5 text-[#ff5e07]/60 group-hover:text-[#ff5e07] transition-colors" />
              </div>
            </div>

            {/* 3. Total Kills (Confirmed eliminations in completed tournament results) */}
            <div className="bg-gradient-to-b from-[#0e1017] to-[#0a0b10] border border-[#1f2230] rounded-xl p-3 sm:p-3.5 flex flex-col justify-between hover:border-[#00f2ff]/40 transition-all group">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#8e95a5]">
                Total Kills
              </span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-xl sm:text-2xl font-mono font-black text-white group-hover:text-[#00f2ff] transition-colors">
                  {totalKills}
                </span>
                <Crosshair className="w-3.5 h-3.5 text-[#00f2ff]/60 group-hover:text-[#00f2ff] transition-colors" />
              </div>
            </div>

            {/* 4. Win Rate (Calculated percentage of completed tournaments won) */}
            <div className="bg-gradient-to-b from-[#0e1017] to-[#0a0b10] border border-[#1f2230] rounded-xl p-3 sm:p-3.5 flex flex-col justify-between hover:border-[#00ff9d]/40 transition-all group">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#8e95a5]">
                Win Rate
              </span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-xl sm:text-2xl font-mono font-black text-white group-hover:text-[#00ff9d] transition-colors">
                  {winRate}
                </span>
                <ShieldCheck className="w-3.5 h-3.5 text-[#00ff9d]/60 group-hover:text-[#00ff9d] transition-colors" />
              </div>
            </div>

            {/* 5. Kills / Tourney (Confirmed eliminations per completed tournament) */}
            <div className="bg-gradient-to-b from-[#0e1017] to-[#0a0b10] border border-[#1f2230] rounded-xl p-3 sm:p-3.5 flex flex-col justify-between hover:border-[#00f2ff]/40 transition-all group">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#8e95a5]">
                Kills / Tourney
              </span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-xl sm:text-2xl font-mono font-black text-white group-hover:text-[#00f2ff] transition-colors">
                  {kdRatio}
                </span>
                <Activity className="w-3.5 h-3.5 text-[#00f2ff]/60 group-hover:text-[#00f2ff] transition-colors" />
              </div>
            </div>

            {/* 6. Earnings (Authoritative prize credits from wallet_ledger — single source of truth) */}
            <div className="bg-gradient-to-b from-[#0e1017] to-[#0a0b10] border border-[#1f2230] rounded-xl p-3 sm:p-3.5 flex flex-col justify-between hover:border-[#00ff9d]/40 transition-all group">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#8e95a5]">
                Earnings
              </span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-xl sm:text-2xl font-mono font-black text-white group-hover:text-[#00ff9d] transition-colors">
                  {isEarningsLoading ? '...' : hasEarningsData ? `₹${Math.floor(authoritativeEarnings)}` : '—'}
                </span>
                <Wallet className="w-3.5 h-3.5 text-[#00ff9d]/60 group-hover:text-[#00ff9d] transition-colors" />
              </div>
            </div>
          </div>
        </section>

        {/* ================================================== */}
        {/* 4. PERFORMANCE BREAKDOWN & BEST PERFORMANCE        */}
        {/* ================================================== */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">

          {/* Left: Placement Distribution */}
          <section
            aria-label="Placement Distribution"
            className="md:col-span-7 rounded-2xl bg-gradient-to-b from-[#0e1017] to-[#0a0b10] border border-[#1f2230] p-4 sm:p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#00f2ff]" />
                <span>Placement Distribution</span>
              </h3>
              <span className="text-[10px] font-mono text-[#717a8e] uppercase tracking-wider">
                {podiumFinishes} Podiums
              </span>
            </div>

            {completedTournamentsCount === 0 ? (
              <div className="py-8 text-center border border-dashed border-[#1f2230] rounded-xl p-4 space-y-1.5">
                <BarChart3 className="w-8 h-8 text-[#525866] mx-auto" />
                <p className="text-xs font-mono font-semibold text-white uppercase">
                  No Placements Logged Yet
                </p>
                <p className="text-[11px] text-[#717a8e] font-sans">
                  Complete Free Fire MAX tournaments to record placement telemetry.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 font-mono text-xs">
                {/* 1st Place */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-[#fbbf24] font-bold">1st Place</span>
                    <span className="text-white font-semibold">
                      {placementDistribution.first} ({completedTournamentsCount > 0 ? Math.round((placementDistribution.first / completedTournamentsCount) * 100) : 0}%)
                    </span>
                  </div>
                  <div className="h-2 w-full bg-[#141620] rounded-full overflow-hidden border border-[#222638]">
                    <div
                      className="h-full bg-[#fbbf24] transition-all duration-500"
                      style={{ width: `${completedTournamentsCount > 0 ? (placementDistribution.first / completedTournamentsCount) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>

                {/* 2nd Place */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-300 font-bold">2nd Place</span>
                    <span className="text-white font-semibold">
                      {placementDistribution.second} ({completedTournamentsCount > 0 ? Math.round((placementDistribution.second / completedTournamentsCount) * 100) : 0}%)
                    </span>
                  </div>
                  <div className="h-2 w-full bg-[#141620] rounded-full overflow-hidden border border-[#222638]">
                    <div
                      className="h-full bg-slate-300 transition-all duration-500"
                      style={{ width: `${completedTournamentsCount > 0 ? (placementDistribution.second / completedTournamentsCount) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>

                {/* 3rd Place */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-[#d97706] font-bold">3rd Place</span>
                    <span className="text-white font-semibold">
                      {placementDistribution.third} ({completedTournamentsCount > 0 ? Math.round((placementDistribution.third / completedTournamentsCount) * 100) : 0}%)
                    </span>
                  </div>
                  <div className="h-2 w-full bg-[#141620] rounded-full overflow-hidden border border-[#222638]">
                    <div
                      className="h-full bg-[#d97706] transition-all duration-500"
                      style={{ width: `${completedTournamentsCount > 0 ? (placementDistribution.third / completedTournamentsCount) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>

                {/* 4th - 5th */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-[#00f2ff] font-bold">Top 4–5</span>
                    <span className="text-white font-semibold">
                      {placementDistribution.fourthFifth} ({completedTournamentsCount > 0 ? Math.round((placementDistribution.fourthFifth / completedTournamentsCount) * 100) : 0}%)
                    </span>
                  </div>
                  <div className="h-2 w-full bg-[#141620] rounded-full overflow-hidden border border-[#222638]">
                    <div
                      className="h-full bg-[#00f2ff] transition-all duration-500"
                      style={{ width: `${completedTournamentsCount > 0 ? (placementDistribution.fourthFifth / completedTournamentsCount) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>

                {/* 6th+ */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-[#717a8e] font-bold">6th or Below</span>
                    <span className="text-white font-semibold">
                      {placementDistribution.sixthPlus} ({completedTournamentsCount > 0 ? Math.round((placementDistribution.sixthPlus / completedTournamentsCount) * 100) : 0}%)
                    </span>
                  </div>
                  <div className="h-2 w-full bg-[#141620] rounded-full overflow-hidden border border-[#222638]">
                    <div
                      className="h-full bg-[#717a8e] transition-all duration-500"
                      style={{ width: `${completedTournamentsCount > 0 ? (placementDistribution.sixthPlus / completedTournamentsCount) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Right: Best Verified Performance */}
          <section
            aria-label="Best Verified Performance"
            className="md:col-span-5 rounded-2xl bg-gradient-to-b from-[#0e1017] to-[#0a0b10] border border-[#1f2230] p-4 sm:p-5 flex flex-col justify-between space-y-4"
          >
            <div>
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white flex items-center gap-2 mb-3">
                <Award className="w-4 h-4 text-[#ff5e07]" />
                <span>Best Verified Performance</span>
              </h3>

              <div className="space-y-2.5 font-mono">
                <div className="p-3 bg-[#12141c] border border-[#1f2230] rounded-xl flex items-center justify-between">
                  <span className="text-[11px] text-[#8e95a5] uppercase">Best Placement</span>
                  <span className="text-sm font-black text-[#00f2ff]">{bestPlacement}</span>
                </div>

                <div className="p-3 bg-[#12141c] border border-[#1f2230] rounded-xl flex items-center justify-between">
                  <span className="text-[11px] text-[#8e95a5] uppercase">Highest Tourney Kills</span>
                  <span className="text-sm font-black text-white">{highestTournamentKills}</span>
                </div>

                <div className="p-3 bg-[#12141c] border border-[#1f2230] rounded-xl flex items-center justify-between">
                  <span className="text-[11px] text-[#8e95a5] uppercase">Avg Kills / Tourney</span>
                  <span className="text-sm font-black text-[#00ff9d]">{avgKills}</span>
                </div>

                <div className="p-3 bg-[#12141c] border border-[#1f2230] rounded-xl flex items-center justify-between">
                  <span className="text-[11px] text-[#8e95a5] uppercase">Highest Confirmed Prize</span>
                  <span className="text-sm font-black text-white">
                    {highestConfirmedPrize !== null ? `₹${highestConfirmedPrize}` : '—'}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-[10px] font-mono text-[#717a8e] border-t border-[#1f2230] pt-2">
              Metrics calculated strictly from verified tournament finalizations.
            </div>
          </section>
        </div>

        {/* ================================================== */}
        {/* 5. RECENT PERFORMANCE LIST                         */}
        {/* ================================================== */}
        <section aria-label="Recent Tournament History" className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[11px] font-mono font-bold uppercase tracking-widest text-[#717a8e] flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-[#00ff9d]" />
              <span>Recent Tournament History</span>
            </h2>
            <span className="text-[10px] font-mono text-[#525866] uppercase tracking-wider">
              Last {recentCompletedTournaments.length} Tournaments
            </span>
          </div>

          {recentCompletedTournaments.length === 0 ? (
            <div className="py-12 text-center rounded-2xl bg-[#0d0e15] border border-[#1f2230] p-6 space-y-2">
              <Activity className="w-8 h-8 text-[#525866] mx-auto" />
              <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                No Completed Tournament Records
              </h3>
              <p className="text-[11px] text-[#8e95a5] font-sans max-w-md mx-auto">
                Once tournaments you have registered for are completed and verified by the tournament administrator, your tournament results will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentCompletedTournaments.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-gradient-to-r from-[#0d0e15] to-[#0a0b10] border border-[#1f2230] hover:border-[#00f2ff]/30 transition-all font-mono"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs border ${
                        m.isWinner
                          ? 'bg-[#fbbf24]/10 text-[#fbbf24] border-[#fbbf24]/30'
                          : 'bg-[#141620] text-white border-[#222638]'
                      }`}
                    >
                      {m.rank}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white tracking-wide truncate max-w-[200px] sm:max-w-xs">
                        {m.title}
                      </div>
                      <div className="text-[10px] text-[#717a8e] flex items-center gap-2 mt-0.5">
                        <span>{m.format}</span>
                        <span>•</span>
                        <span className="text-[#00f2ff]">{m.kills} {m.kills === 1 ? 'Kill' : 'Kills'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right text-[11px] text-[#8e95a5]">
                    <div className="flex items-center gap-1 justify-end text-[#717a8e]">
                      <Calendar className="w-3 h-3" />
                      <span>{m.date}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </main>
    </div>
  )
}
