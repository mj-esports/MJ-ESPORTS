import { useState, useEffect, useMemo, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTournaments } from '../contexts/TournamentContext'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { fetchAllUserPrizeCredits } from '../services/walletService'
import {
  ArrowLeft,
  Trophy,
  Search,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  Gamepad2,
  Calendar,
  Award,
  Medal,
  Flame,
  Wallet,
  AlertCircle,
  RefreshCw,
  ChevronRight,
  Ban,
  Radio
} from 'lucide-react'

export default function TournamentHistoryPage() {
  const navigate = useNavigate()
  const { user, profile, loading: authLoading } = useAuth()
  const { tournaments, isUserRegistered, loading: tournamentsLoading } = useTournaments()

  // Tab & Search Filters: 'ALL' | 'ACTIVE' | 'COMPLETED'
  const [filterTab, setFilterTab] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [copiedUid, setCopiedUid] = useState(false)

  // 1. Authoritative Verification Status (public.profiles.verification_status)
  const [isVerified, setIsVerified] = useState(false)

  useEffect(() => {
    if (!user?.id) {
      setIsVerified(false)
      return
    }

    let isMounted = true

    async function checkVerification() {
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
        console.warn('[TournamentHistory verification check warn]:', err)
        if (isMounted) {
          setIsVerified(profile?.verification_status === 'Verified')
        }
      }
    }

    checkVerification()

    return () => {
      isMounted = false
    }
  }, [user?.id, profile?.verification_status])

  // 2. User Identity Details (Strictly Free Fire MAX only)
  const meta = user?.user_metadata || {}
  const displayName = meta.username || profile?.username || meta.full_name || user?.email?.split('@')[0] || 'Player'
  const freeFireUid = meta.freeFireUid || meta.game_uid || profile?.game_uid || ''
  const avatarUrl =
    meta.avatar_url ||
    meta.avatarUrl ||
    profile?.avatar_url ||
    `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.id || 'player'}&backgroundColor=0d0e15`

  const handleCopyUid = () => {
    if (!freeFireUid) return
    navigator.clipboard.writeText(freeFireUid)
    setCopiedUid(true)
    setTimeout(() => setCopiedUid(false), 2000)
  }

  // 3. User Registered Tournaments
  const userRegistrations = useMemo(() => {
    if (!Array.isArray(tournaments) || !user) return []
    return tournaments.filter((t) =>
      isUserRegistered(t.id, user.email || user.id || meta.username)
    )
  }, [tournaments, isUserRegistered, user, meta.username])

  // Completed tournaments with confirmed results
  const completedTournaments = useMemo(() => {
    return userRegistrations.filter((t) => t.status === 'Completed')
  }, [userRegistrations])

  const completedTournamentsCount = completedTournaments.length

  // Helper to resolve player's team record from tournament result
  const getPlayerTeam = useCallback((tournament) => {
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
  }, [user, freeFireUid])

  // 4. Authoritative Completed Refund Registry (for Cancelled Tournaments)
  const [completedRefundTournamentIds, setCompletedRefundTournamentIds] = useState(new Set())

  useEffect(() => {
    if (!user?.id || !isSupabaseConfigured) return

    let isMounted = true

    async function loadRefunds() {
      try {
        const { data, error } = await supabase
          .from('tournament_refunds')
          .select('tournament_id, status')
          .eq('user_id', user.id)
          .eq('status', 'COMPLETED')

        if (isMounted && !error && Array.isArray(data)) {
          setCompletedRefundTournamentIds(new Set(data.map((r) => String(r.tournament_id))))
        }
      } catch (err) {
        console.warn('[TournamentHistory loadRefunds warning]:', err)
      }
    }

    loadRefunds()

    return () => {
      isMounted = false
    }
  }, [user?.id])

  // 5. Summary Telemetry Metric Calculations
  // a) TOTAL WON: Strictly public.wallet_ledger PRIZE_CREDIT + CREDIT via fetchAllUserPrizeCredits
  const [totalWonAmount, setTotalWonAmount] = useState(null)
  const [prizeCreditsList, setPrizeCreditsList] = useState([])
  const [isEarningsLoading, setIsEarningsLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) {
      setTotalWonAmount(null)
      setPrizeCreditsList([])
      setIsEarningsLoading(false)
      return
    }

    let isMounted = true

    async function loadAuthoritativeEarnings() {
      setIsEarningsLoading(true)
      try {
        let totalPrize = 0
        const prizeCredits = await fetchAllUserPrizeCredits(user.id)

        const validCredits = Array.isArray(prizeCredits)
          ? prizeCredits.filter(
              (t) =>
                t.transaction_type === 'PRIZE_CREDIT' &&
                t.direction === 'CREDIT'
            )
          : []

        validCredits.forEach((t) => {
          totalPrize += Math.abs(Number(t.amount || 0))
        })

        if (isMounted) {
          setTotalWonAmount(totalPrize > 0 ? totalPrize : null)
          setPrizeCreditsList(validCredits)
        }
      } catch (err) {
        console.warn('[TournamentHistory loadEarnings exception]:', err)
        if (isMounted) {
          setTotalWonAmount(null)
          setPrizeCreditsList([])
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

  // Helper to reliably match confirmed PRIZE_CREDIT entries from wallet_ledger to an individual tournament.
  // Never uses teams_list.prize or myTeam.prize as confirmed earnings.
  const getConfirmedTournamentPrize = useCallback((tournamentId) => {
    if (!tournamentId || !Array.isArray(prizeCreditsList) || prizeCreditsList.length === 0) {
      return null
    }
    const tid = String(tournamentId)

    // Inspect authoritative wallet_ledger metadata and source reference fields
    const matchingCredits = prizeCreditsList.filter((entry) => {
      if (entry.transaction_type !== 'PRIZE_CREDIT' || entry.direction !== 'CREDIT') {
        return false
      }
      const meta = entry.metadata || {}
      const matchesSourceRef =
        (entry.source_reference_type === 'tournament' || entry.source_reference_type === 'TOURNAMENT') &&
        String(entry.source_reference_id) === tid
      const matchesDirectRef = String(entry.source_reference_id) === tid
      const matchesMetaId = String(meta.tournament_id || meta.tournamentId || '') === tid

      return matchesSourceRef || matchesDirectRef || matchesMetaId
    })

    if (matchingCredits.length === 0) {
      // No reliable tournament-to-ledger association exists -> return null (displays '—')
      return null
    }

    const sum = matchingCredits.reduce((acc, c) => acc + Math.abs(Number(c.amount || 0)), 0)
    return sum > 0 ? sum : null
  }, [prizeCreditsList])

  // b) PODIUM RATE: confirmed podium finishes / completed tournaments * 100
  const podiumRate = useMemo(() => {
    if (completedTournamentsCount === 0) return '—'
    const podiumFinishes = completedTournaments.filter((t) => {
      const myTeam = getPlayerTeam(t)
      return myTeam && (myTeam.rank === 1 || myTeam.rank === 2 || myTeam.rank === 3 ||
                         myTeam.position === 1 || myTeam.position === 2 || myTeam.position === 3)
    }).length
    return `${Math.round((podiumFinishes / completedTournamentsCount) * 100)}%`
  }, [completedTournaments, completedTournamentsCount, getPlayerTeam])

  // c) TOTAL KILLS: confirmed eliminations in completed tournaments results only
  const totalKills = useMemo(() => {
    return completedTournaments.reduce((acc, t) => {
      const myTeam = getPlayerTeam(t)
      return acc + Number(myTeam?.kills || myTeam?.finishes || 0)
    }, 0)
  }, [completedTournaments, getPlayerTeam])

  // 6. Filter & Search Logic
  const filteredTournaments = useMemo(() => {
    return userRegistrations.filter((t) => {
      const matchesSearch =
        !searchQuery.trim() ||
        (t.title && t.title.toLowerCase().includes(searchQuery.toLowerCase().trim()))

      if (!matchesSearch) return false

      const status = t.status || ''

      if (filterTab === 'ACTIVE') {
        // Active / upcoming / in-progress registrations
        return status !== 'Completed' && status !== 'Cancelled'
      }

      if (filterTab === 'COMPLETED') {
        // Completed tournaments with confirmed results
        return status === 'Completed'
      }

      // 'ALL' tab includes all user registrations (Active, Completed, Cancelled)
      return true
    })
  }, [userRegistrations, filterTab, searchQuery])

  // Helper for date formatting
  const formatTournamentDate = (t) => {
    const rawDate = t.start_date || t.startDate || t.match_date || t.created_at
    if (!rawDate) return '—'
    try {
      const d = new Date(rawDate)
      if (isNaN(d.getTime())) return String(rawDate)
      const formattedDate = d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
      const time = t.start_time || t.startTime || t.match_time
      return time ? `${formattedDate} • ${time}` : formattedDate
    } catch {
      return String(rawDate)
    }
  }

  // Helper to render placement badge for completed tournaments
  const renderPlacementBadge = (rank) => {
    const numRank = Number(rank)
    if (!numRank || numRank <= 0) {
      return (
        <span className="text-[11px] font-mono font-bold text-[#A1A1AA] bg-[#18181B] px-2 py-0.5 rounded-none border border-[#27272A]">
          UNRANKED
        </span>
      )
    }

    if (numRank === 1) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-none text-[11px] font-mono font-black uppercase bg-[#FFB900]/15 text-[#FFB900] border border-[#FFB900]/40 shadow-none">
          <Trophy className="w-3.5 h-3.5 text-[#FFB900]" />
          <span>#1 CHAMPION</span>
        </span>
      )
    }

    if (numRank === 2) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-none text-[11px] font-mono font-black uppercase bg-white/10 text-white border border-white/30">
          <Medal className="w-3.5 h-3.5 text-zinc-300" />
          <span>#2 RUNNER-UP</span>
        </span>
      )
    }

    if (numRank === 3) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-none text-[11px] font-mono font-black uppercase bg-[#FF8C00]/15 text-[#FF8C00] border border-[#FF8C00]/40">
          <Award className="w-3.5 h-3.5 text-[#FF8C00]" />
          <span>#3 PODIUM</span>
        </span>
      )
    }

    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-none text-[11px] font-mono font-bold uppercase bg-[#18181B] text-[#A1A1AA] border border-[#27272A]">
        #{numRank} FINISH
      </span>
    )
  }

  // Helper to render status badge for non-completed tournaments
  const renderStatusBadge = (t) => {
    const status = t.status || ''

    if (status === 'Cancelled') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-none text-[10px] font-mono font-extrabold uppercase bg-red-500/10 text-red-500 border border-red-500/30">
          <Ban className="w-3 h-3" />
          <span>CANCELLED</span>
        </span>
      )
    }

    if (status === 'Live' || status === 'Live Now' || status === 'In Progress' || status === 'Underway') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-none text-[10px] font-mono font-extrabold uppercase bg-[#FF8C00]/15 text-[#FF8C00] border border-[#FF8C00]/40 animate-pulse">
          <Radio className="w-3 h-3 text-[#FF8C00]" />
          <span>LIVE NOW</span>
        </span>
      )
    }

    if (status === 'Registration Open') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-none text-[10px] font-mono font-extrabold uppercase bg-[#FFB900]/10 text-[#FFB900] border border-[#FFB900]/30">
          <CheckCircle2 className="w-3 h-3" />
          <span>REGISTERED</span>
        </span>
      )
    }

    if (status === 'Results Pending') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-none text-[10px] font-mono font-extrabold uppercase bg-[#FFB900]/10 text-[#FFB900] border border-[#FFB900]/30">
          <RefreshCw className="w-3 h-3 animate-spin" />
          <span>RESULTS PENDING</span>
        </span>
      )
    }

    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-none text-[10px] font-mono font-bold uppercase bg-[#18181B] text-[#A1A1AA] border border-[#27272A]">
        {status || 'UPCOMING'}
      </span>
    )
  }

  // Loading State Skeleton
  if (authLoading || tournamentsLoading) {
    return (
      <div className="bg-[#000000] text-white min-h-screen pb-20 antialiased font-mono">
        <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
          <div className="h-6 w-36 bg-[#18181B] rounded-none animate-pulse" />
          <div className="h-28 bg-[#111215] border border-[#27272A] rounded-none animate-pulse" />
          <div className="grid grid-cols-3 gap-3">
            <div className="h-20 bg-[#111215] border border-[#27272A] rounded-none animate-pulse" />
            <div className="h-20 bg-[#111215] border border-[#27272A] rounded-none animate-pulse" />
            <div className="h-20 bg-[#111215] border border-[#27272A] rounded-none animate-pulse" />
          </div>
          <div className="space-y-3">
            <div className="h-24 bg-[#111215] border border-[#27272A] rounded-none animate-pulse" />
            <div className="h-24 bg-[#111215] border border-[#27272A] rounded-none animate-pulse" />
            <div className="h-24 bg-[#111215] border border-[#27272A] rounded-none animate-pulse" />
          </div>
        </main>
      </div>
    )
  }

  // Error State fallback if tournaments data failed to load
  if (!Array.isArray(tournaments)) {
    return (
      <div className="bg-[#000000] text-white min-h-screen pb-20 antialiased font-mono flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center p-8 bg-[#111215] border border-red-500/30 rounded-none space-y-4">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-white">
            TOURNAMENT HISTORY UNAVAILABLE
          </h2>
          <p className="text-xs text-[#A1A1AA] font-sans">
            Please try again later.
          </p>
          <Link
            to="/profile"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-none bg-[#18181B] border border-[#27272A] text-xs font-bold text-[#FFB900] hover:bg-[#27272A] transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Profile</span>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#000000] text-white min-h-screen pb-24 antialiased font-mono selection:bg-[#FFB900]/20 selection:text-[#FFB900]">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-6">

        {/* ================================================== */}
        {/* 1. TOP NAVIGATION & BREADCRUMB                     */}
        {/* ================================================== */}
        <div className="flex items-center justify-between">
          <Link
            to="/profile"
            className="inline-flex items-center gap-2 text-xs font-bold text-[#A1A1AA] hover:text-[#FFB900] uppercase tracking-wider transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
            <span>Return to Profile</span>
          </Link>

          <span className="px-2 py-0.5 rounded-none text-[10px] font-extrabold uppercase tracking-widest bg-[#18181B] text-[#FF8C00] border border-[#27272A]">
            FREE FIRE MAX
          </span>
        </div>

        {/* ================================================== */}
        {/* 2. PLAYER IDENTITY & PAGE TITLE HEADER             */}
        {/* ================================================== */}
        <header
          aria-label="Tournament History Header"
          className="p-5 rounded-none bg-[#111215] border border-[#27272A] relative overflow-hidden shadow-none"
        >
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="relative w-12 h-12 rounded-none bg-[#18181B] border border-[#27272A] flex items-center justify-center overflow-hidden shrink-0">
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="font-sans font-black text-lg sm:text-xl text-white tracking-wide uppercase">
                    TOURNAMENT HISTORY
                  </h1>
                  {isVerified && (
                    <span
                      title="Authoritatively Verified Player"
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-none text-[10px] font-bold bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/30"
                    >
                      <ShieldCheck className="w-3 h-3 text-[#10B981]" />
                      <span>VERIFIED</span>
                    </span>
                  )}
                </div>

                <p className="text-[11px] font-mono uppercase tracking-widest text-[#A1A1AA]">
                  COMPETITIVE PARTICIPATION & RESULTS
                </p>
              </div>
            </div>

            {/* Free Fire MAX Identity Pill */}
            <div className="flex items-center gap-2 bg-[#18181B] border border-[#27272A] rounded-none px-3 py-2 text-xs shrink-0">
              <div className="w-2 h-2 rounded-none bg-[#FFB900]" />
              <div className="flex flex-col">
                <span className="text-[9px] text-[#A1A1AA] uppercase font-bold tracking-wider">
                  FF MAX UID
                </span>
                <span className="text-white font-bold font-mono tracking-wider">
                  {freeFireUid || 'Not Linked'}
                </span>
              </div>
              {freeFireUid && (
                <button
                  type="button"
                  onClick={handleCopyUid}
                  title="Copy Free Fire MAX UID"
                  className="ml-1 p-1 hover:text-[#FFB900] text-[#A1A1AA] transition-colors cursor-pointer"
                  aria-label="Copy UID"
                >
                  {copiedUid ? <Check className="w-3.5 h-3.5 text-[#10B981]" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
          </div>
        </header>

        {/* ================================================== */}
        {/* 3. SUMMARY TELEMETRY BAR (3 COMPACT METRICS)       */}
        {/* ================================================== */}
        <section
          aria-label="Competitive Summary Telemetry"
          className="grid grid-cols-3 gap-2.5 sm:gap-4"
        >
          {/* TOTAL WON */}
          <div className="p-3 sm:p-4 rounded-none bg-[#111215] border border-[#27272A] relative overflow-hidden group hover:border-[#FFB900]/40 transition-all shadow-none">
            <div className="flex items-center justify-between text-[#A1A1AA] text-[10px] sm:text-[11px] uppercase font-bold tracking-wider mb-1">
              <span>TOTAL WON</span>
              <Wallet className="w-3.5 h-3.5 text-[#FFB900]" />
            </div>
            <div className="font-sans font-black text-base sm:text-xl text-[#FFB900] tracking-tight">
              {isEarningsLoading ? (
                <span className="inline-block w-12 h-5 bg-[#18181B] rounded-none animate-pulse" />
              ) : totalWonAmount !== null ? (
                `₹${totalWonAmount.toLocaleString('en-IN')}`
              ) : (
                '—'
              )}
            </div>
            <div className="text-[9px] sm:text-[10px] text-[#A1A1AA] font-mono mt-0.5 truncate">
              Authoritative Prizes
            </div>
          </div>

          {/* PODIUM RATE */}
          <div className="p-3 sm:p-4 rounded-none bg-[#111215] border border-[#27272A] relative overflow-hidden group hover:border-[#FF8C00]/40 transition-all shadow-none">
            <div className="flex items-center justify-between text-[#A1A1AA] text-[10px] sm:text-[11px] uppercase font-bold tracking-wider mb-1">
              <span>PODIUM RATE</span>
              <Trophy className="w-3.5 h-3.5 text-[#FF8C00]" />
            </div>
            <div className="font-sans font-black text-base sm:text-xl text-[#FF8C00] tracking-tight">
              {podiumRate}
            </div>
            <div className="text-[9px] sm:text-[10px] text-[#A1A1AA] font-mono mt-0.5 truncate">
              Top 3 Finishes
            </div>
          </div>

          {/* TOTAL KILLS */}
          <div className="p-3 sm:p-4 rounded-none bg-[#111215] border border-[#27272A] relative overflow-hidden group hover:border-[#10B981]/40 transition-all shadow-none">
            <div className="flex items-center justify-between text-[#A1A1AA] text-[10px] sm:text-[11px] uppercase font-bold tracking-wider mb-1">
              <span>TOTAL KILLS</span>
              <Flame className="w-3.5 h-3.5 text-[#10B981]" />
            </div>
            <div className="font-sans font-black text-base sm:text-xl text-[#10B981] tracking-tight">
              {totalKills}
            </div>
            <div className="text-[9px] sm:text-[10px] text-[#A1A1AA] font-mono mt-0.5 truncate">
              Confirmed Eliminations
            </div>
          </div>
        </section>

        {/* ================================================== */}
        {/* 4. FILTERS & SEARCH CONTROLS                       */}
        {/* ================================================== */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Tabs: ALL | ACTIVE | COMPLETED */}
          <div
            role="tablist"
            aria-label="Tournament Filter Tabs"
            className="flex items-center bg-[#111215] p-1 rounded-none border border-[#27272A] text-xs font-bold"
          >
            <button
              role="tab"
              aria-selected={filterTab === 'ALL'}
              onClick={() => setFilterTab('ALL')}
              className={`px-3.5 py-1.5 rounded-none transition-all cursor-pointer uppercase tracking-wider ${
                filterTab === 'ALL'
                  ? 'bg-[#FFB900] text-black font-extrabold shadow-none'
                  : 'text-[#A1A1AA] hover:text-white'
              }`}
            >
              All ({userRegistrations.length})
            </button>
            <button
              role="tab"
              aria-selected={filterTab === 'ACTIVE'}
              onClick={() => setFilterTab('ACTIVE')}
              className={`px-3.5 py-1.5 rounded-none transition-all cursor-pointer uppercase tracking-wider ${
                filterTab === 'ACTIVE'
                  ? 'bg-[#FFB900] text-black font-extrabold shadow-none'
                  : 'text-[#A1A1AA] hover:text-white'
              }`}
            >
              Active
            </button>
            <button
              role="tab"
              aria-selected={filterTab === 'COMPLETED'}
              onClick={() => setFilterTab('COMPLETED')}
              className={`px-3.5 py-1.5 rounded-none transition-all cursor-pointer uppercase tracking-wider ${
                filterTab === 'COMPLETED'
                  ? 'bg-[#FFB900] text-black font-extrabold shadow-none'
                  : 'text-[#A1A1AA] hover:text-white'
              }`}
            >
              Completed ({completedTournamentsCount})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 max-w-sm">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tournaments..."
              aria-label="Search tournament name"
              className="w-full bg-[#111215] border border-[#27272A] rounded-none pl-9 pr-4 py-2 text-xs text-white placeholder-[#71717A] focus:border-[#FFB900] focus:outline-none h-[38px] transition-colors"
            />
            <Search className="w-4 h-4 text-[#71717A] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* ================================================== */}
        {/* 5. TOURNAMENT HISTORY LIST                         */}
        {/* ================================================== */}
        {userRegistrations.length === 0 ? (
          /* Empty State: Player has zero registered tournaments */
          <div
            aria-label="No Tournament History"
            className="py-16 text-center border border-[#27272A] bg-[#111215] rounded-none p-6 space-y-3 font-mono"
          >
            <Trophy className="w-10 h-10 text-[#71717A] mx-auto" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              NO TOURNAMENT HISTORY
            </h2>
            <p className="text-xs text-[#A1A1AA] font-sans max-w-sm mx-auto">
              Join a Free Fire MAX tournament to build your competitive record.
            </p>
            <div className="pt-2">
              <Link
                to="/tournaments"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-none bg-[#FFB900] text-black text-xs font-black uppercase tracking-wider hover:bg-[#FFC933] transition-all"
              >
                <span>Browse Tournaments</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ) : filteredTournaments.length === 0 ? (
          /* Empty State: Filter or search produced no matches */
          <div
            aria-label="No Matching Tournaments"
            className="py-16 text-center border border-[#27272A] bg-[#111215] rounded-none p-6 space-y-3 font-mono"
          >
            <Search className="w-10 h-10 text-[#71717A] mx-auto" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              NO MATCHING TOURNAMENTS
            </h2>
            <p className="text-xs text-[#A1A1AA] font-sans">
              Try another filter or search term.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setFilterTab('ALL')
                  setSearchQuery('')
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-none bg-[#18181B] border border-[#27272A] text-xs font-bold text-[#FFB900] hover:bg-[#27272A] transition-all cursor-pointer"
              >
                <span>Clear Filters</span>
              </button>
            </div>
          </div>
        ) : (
          <section
            aria-label="Tournament Records List"
            className="space-y-3"
          >
            {filteredTournaments.map((t) => {
              const isCompleted = t.status === 'Completed'
              const isCancelled = t.status === 'Cancelled'
              const myTeam = getPlayerTeam(t)
              const hasRefund = isCancelled && completedRefundTournamentIds.has(String(t.id))

              // Confirmed metrics for completed tournament results
              const rank = isCompleted ? (myTeam?.rank || myTeam?.position || null) : null
              const kills = isCompleted ? Number(myTeam?.kills || myTeam?.finishes || 0) : null
              // Authoritative individual tournament prize: strictly from matched wallet_ledger PRIZE_CREDIT, NEVER from teams_list.prize
              const confirmedPrize = isCompleted ? getConfirmedTournamentPrize(t.id) : null

              return (
                <article
                  key={t.id}
                  className="p-4 sm:p-4.5 rounded-none bg-[#111215] border border-[#27272A] hover:border-[#FFB900]/40 transition-all shadow-none space-y-3 font-mono"
                >
                  {/* Top Row: Tournament Title, Game, Format & Status/Placement */}
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="space-y-1 max-w-[70%] sm:max-w-[75%]">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-sm sm:text-base font-bold text-white tracking-wide truncate">
                          {t.title}
                        </h2>
                        <span className="px-1.5 py-0.5 rounded-none text-[9px] font-bold bg-[#FF8C00]/10 text-[#FF8C00] border border-[#FF8C00]/20 uppercase">
                          FREE FIRE MAX
                        </span>
                        {t.format && (
                          <span className="px-1.5 py-0.5 rounded-none text-[9px] font-bold bg-[#18181B] text-[#A1A1AA] border border-[#27272A] uppercase">
                            {t.format}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-[10px] text-[#A1A1AA] flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-[#71717A]" />
                          <span>{formatTournamentDate(t)}</span>
                        </span>
                        {myTeam?.teamName && (
                          <span className="flex items-center gap-1 text-[#A1A1AA]">
                            <Gamepad2 className="w-3 h-3 text-[#71717A]" />
                            <span className="truncate max-w-[150px]">{myTeam.teamName}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Status or Placement Header Pill */}
                    <div className="flex items-center gap-2 shrink-0">
                      {isCompleted ? (
                        renderPlacementBadge(rank)
                      ) : (
                        renderStatusBadge(t)
                      )}
                    </div>
                  </div>

                  {/* Middle Row: Telemetry Data Grid (Hierarchy: RESULT -> PERFORMANCE -> PRIZE) */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    {isCompleted ? (
                      <>
                        {/* PLACEMENT */}
                        <div className="p-2.5 rounded-none bg-[#18181B] border border-[#27272A]">
                          <span className="text-[9px] uppercase tracking-wider text-[#A1A1AA] block">
                            Placement
                          </span>
                          <span className="text-xs font-black text-white">
                            {rank ? `#${rank}` : '—'}
                          </span>
                        </div>

                        {/* KILLS */}
                        <div className="p-2.5 rounded-none bg-[#18181B] border border-[#27272A]">
                          <span className="text-[9px] uppercase tracking-wider text-[#A1A1AA] block">
                            Kills
                          </span>
                          <span className="text-xs font-black text-[#10B981]">
                            {kills !== null ? `${kills} Kills` : '—'}
                          </span>
                        </div>

                        {/* PRIZE WON */}
                        <div className="p-2.5 rounded-none bg-[#18181B] border border-[#27272A]">
                          <span className="text-[9px] uppercase tracking-wider text-[#A1A1AA] block">
                            Prize Won
                          </span>
                          <span className="text-xs font-black text-[#FFB900]">
                            {confirmedPrize !== null ? `₹${confirmedPrize.toLocaleString('en-IN')}` : '—'}
                          </span>
                        </div>

                        {/* STATUS */}
                        <div className="p-2.5 rounded-none bg-[#18181B] border border-[#27272A]">
                          <span className="text-[9px] uppercase tracking-wider text-[#A1A1AA] block">
                            State
                          </span>
                          <span className="text-xs font-bold text-[#10B981]">
                            Official Result
                          </span>
                        </div>
                      </>
                    ) : isCancelled ? (
                      <>
                        {/* CANCELLED STATE METRICS */}
                        <div className="p-2.5 rounded-none bg-[#18181B] border border-[#27272A] col-span-2">
                          <span className="text-[9px] uppercase tracking-wider text-[#A1A1AA] block">
                            Tournament Status
                          </span>
                          <span className="text-xs font-bold text-red-500">
                            Cancelled by Organizer
                          </span>
                        </div>

                        <div className="p-2.5 rounded-none bg-[#18181B] border border-[#27272A] col-span-2 flex items-center justify-between">
                          <div>
                            <span className="text-[9px] uppercase tracking-wider text-[#A1A1AA] block">
                              Refund Status
                            </span>
                            <span className="text-xs font-bold text-white">
                              {hasRefund ? (
                                <span className="text-[#10B981] inline-flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>REFUNDED TO WALLET</span>
                                </span>
                              ) : (
                                <span className="text-[#A1A1AA]">No refund required</span>
                              )}
                            </span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* ACTIVE / UPCOMING TOURNAMENT METRICS (NO fake placement/kills/prize) */}
                        <div className="p-2.5 rounded-none bg-[#18181B] border border-[#27272A]">
                          <span className="text-[9px] uppercase tracking-wider text-[#A1A1AA] block">
                            Prize Pool
                          </span>
                          <span className="text-xs font-bold text-[#FFB900]">
                            {t.prize_pool || t.prizePool || '—'}
                          </span>
                        </div>

                        <div className="p-2.5 rounded-none bg-[#18181B] border border-[#27272A]">
                          <span className="text-[9px] uppercase tracking-wider text-[#A1A1AA] block">
                            Entry Fee
                          </span>
                          <span className="text-xs font-bold text-white">
                            {t.entry_fee || t.entryFee || 'Free'}
                          </span>
                        </div>

                        <div className="p-2.5 rounded-none bg-[#18181B] border border-[#27272A] col-span-2 flex items-center justify-between">
                          <div>
                            <span className="text-[9px] uppercase tracking-wider text-[#A1A1AA] block">
                              Registration State
                            </span>
                            <span className="text-xs font-bold text-[#10B981] flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Slot Confirmed</span>
                            </span>
                          </div>
                          {t.room_status === 'Published' && (
                            <span className="px-2 py-0.5 rounded-none text-[9.5px] font-bold bg-[#FFB900]/10 text-[#FFB900] border border-[#FFB900]/30">
                              Room Ready
                            </span>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Bottom Row: Action / Detail Navigation */}
                  <div className="flex items-center justify-between pt-1 border-t border-[#27272A]/60 text-xs">
                    <span className="text-[10px] text-[#A1A1AA]">
                      ID: <span className="font-mono text-[#A1A1AA]">{String(t.id).substring(0, 8)}</span>
                    </span>

                    <Link
                      to={`/tournaments/${t.id}`}
                      className="inline-flex items-center gap-1 text-[#FFB900] hover:text-[#FFC933] font-bold uppercase tracking-wider transition-colors"
                    >
                      <span>View Tournament</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </article>
              )
            })}
          </section>
        )}

      </main>
    </div>
  )
}
