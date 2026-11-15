import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { useTournaments } from '../contexts/TournamentContext'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import {
  fetchUserWallet,
  fetchWalletLedger,
  fetchAllUserPrizeCredits,
  subscribeToWalletBalance,
  getAuthoritativeWalletBalance,
} from '../services/walletService'
import {
  Copy,
  Check,
  Edit3,
  Activity,
  Trophy,
  Award,
  Wallet,
  Settings,
  CheckCircle2,
  ChevronRight,
  Flame,
  Crosshair,
  ShieldCheck,
  Gamepad2,
  Users
} from 'lucide-react'

export default function ProfilePage() {
  const { user, profile, loading: authLoading } = useAuth()
  const { showSuccess, showError } = useToast()
  const { tournaments, isUserRegistered } = useTournaments()
  const navigate = useNavigate()

  // 1. Authoritative Wallet Balance Subscription (public.wallets.balance)
  const [walletBalance, setWalletBalance] = useState(getAuthoritativeWalletBalance())
  const [isWalletLoading, setIsWalletLoading] = useState(getAuthoritativeWalletBalance() === null)

  useEffect(() => {
    if (!user?.id) {
      setWalletBalance(null)
      setIsWalletLoading(false)
      return
    }

    let isMounted = true

    // Subscribe to shared authoritative balance changes
    const unsubscribe = subscribeToWalletBalance((updatedBalance) => {
      if (isMounted) {
        setWalletBalance(updatedBalance)
        setIsWalletLoading(false)
      }
    })

    // Fetch authoritative wallet balance on mount
    fetchUserWallet()
      .then((res) => {
        if (isMounted && res?.success && res.wallet) {
          setWalletBalance(Number(res.wallet.balance || 0))
        }
      })
      .catch((err) => {
        console.warn('[ProfilePage fetchUserWallet warn]:', err)
      })
      .finally(() => {
        if (isMounted) {
          setIsWalletLoading(false)
        }
      })

    return () => {
      isMounted = false
      unsubscribe()
    }
  }, [user?.id])

  // 2. Authoritative Verification Status (public.profiles.verification_status)
  // Strictly requires confirmed 'Verified' account state — never mocked or assumed from eligibility
  const [isVerified, setIsVerified] = useState(false)

  useEffect(() => {
    if (!user?.id) {
      setIsVerified(false)
      return
    }

    let isMounted = true

    async function checkAuthoritativeVerification() {
      if (!isSupabaseConfigured) {
        // In local/mock mode: strictly check user metadata or profile state, never assume verified
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
        console.warn('[ProfilePage verification check warn]:', err)
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

  // 3. User Identity Details (Strictly Free Fire MAX only)
  const meta = user?.user_metadata || {}
  const displayName = meta.username || profile?.username || meta.full_name || user?.email?.split('@')[0] || 'Player'
  const freeFireUid = meta.freeFireUid || meta.game_uid || profile?.game_uid || ''
  const isPro = Boolean(meta.is_pro || profile?.is_pro)
  const bio = meta.bio || ''
  const instagram = meta.instagram || ''
  const whatsappChannel = meta.whatsappChannel || meta.whatsapp_channel || ''

  const avatarUrl =
    meta.avatar_url ||
    meta.avatarUrl ||
    profile?.avatar_url ||
    'https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&w=400&q=80'

  // 4. Tournament Registrations & Matches Meaning Audit
  // userRegistrations = tournament entries / registrations
  const userRegistrations = useMemo(() => {
    if (!Array.isArray(tournaments) || !user) return []
    return tournaments.filter((t) =>
      isUserRegistered(t.id, user.email || user.id || meta.username)
    )
  }, [tournaments, isUserRegistered, user, meta.username])

  // Actual completed matches played (only tournaments with status 'Completed')
  const completedMatches = useMemo(() => {
    return userRegistrations.filter((t) => t.status === 'Completed')
  }, [userRegistrations])

  const matchesPlayedCount = completedMatches.length

  // First-place finishes in completed tournaments
  const winsCount = useMemo(() => {
    return completedMatches.filter((reg) => {
      const teams = Array.isArray(reg.teams_list)
        ? reg.teams_list
        : Array.isArray(reg.teamsList)
        ? reg.teamsList
        : []
      const myTeam = teams.find(
        (team) =>
          (user?.id && team.userId && String(team.userId) === String(user.id)) ||
          team.captain?.toLowerCase() === user?.email?.toLowerCase() ||
          team.email?.toLowerCase() === user?.email?.toLowerCase()
      )
      return myTeam && (myTeam.rank === 1 || myTeam.position === 1)
    }).length
  }, [completedMatches, user])

  // Win Rate calculated strictly over actual completed matches
  const winRate = useMemo(() => {
    if (matchesPlayedCount === 0) return '—'
    return `${Math.round((winsCount / matchesPlayedCount) * 100)}%`
  }, [matchesPlayedCount, winsCount])

  // Confirmed eliminations / kills recorded in completed tournament results
  const totalKills = useMemo(() => {
    return completedMatches.reduce((acc, reg) => {
      const teams = Array.isArray(reg.teams_list)
        ? reg.teams_list
        : Array.isArray(reg.teamsList)
        ? reg.teamsList
        : []
      const myTeam = teams.find(
        (team) =>
          (user?.id && team.userId && String(team.userId) === String(user.id)) ||
          team.captain?.toLowerCase() === user?.email?.toLowerCase() ||
          team.email?.toLowerCase() === user?.email?.toLowerCase()
      )
      return acc + Number(myTeam?.kills || myTeam?.finishes || 0)
    }, 0)
  }, [completedMatches, user])

  // K/D Ratio retained for Statistics Control Center summary
  const kdRatio = useMemo(() => {
    if (matchesPlayedCount === 0) return '0.00'
    return (totalKills / matchesPlayedCount).toFixed(2)
  }, [matchesPlayedCount, totalKills])

  // 5. Authoritative Tournament Earnings Metric
  // Authoritative sources: public.wallet_ledger PRIZE_CREDIT and public.payout_queue
  // If no authoritative earnings exist in the database, honestly display "—"
  const [authoritativeEarnings, setAuthoritativeEarnings] = useState(null)
  const [hasEarningsData, setHasEarningsData] = useState(false)

  useEffect(() => {
    if (!user?.id) {
      setAuthoritativeEarnings(null)
      setHasEarningsData(false)
      return
    }

    let isMounted = true

    async function loadAuthoritativeEarnings() {
      try {
        let totalPrize = 0

        // Strictly query authoritative public.wallet_ledger for ALL confirmed PRIZE_CREDIT entries (paginated batch traversal, no arbitrary cap)
        const prizeCredits = await fetchAllUserPrizeCredits(user.id)
        const confirmedPrizes = (prizeCredits || []).filter(
          (t) => t.transaction_type === 'PRIZE_CREDIT' && t.direction === 'CREDIT'
        )

        if (confirmedPrizes.length > 0) {
          totalPrize = confirmedPrizes.reduce((acc, t) => acc + Math.abs(Number(t.amount || 0)), 0)
        }

        if (isMounted) {
          if (totalPrize > 0) {
            setAuthoritativeEarnings(totalPrize)
            setHasEarningsData(true)
          } else {
            setAuthoritativeEarnings(null)
            setHasEarningsData(false)
          }
        }
      } catch (err) {
        console.warn('[ProfilePage loadAuthoritativeEarnings exception]:', err)
        if (isMounted) {
          setAuthoritativeEarnings(null)
          setHasEarningsData(false)
        }
      }
    }

    loadAuthoritativeEarnings()

    return () => {
      isMounted = false
    }
  }, [user?.id])

  // 6. UID Copy Action
  const [copied, setCopied] = useState(false)
  const handleCopyUid = () => {
    if (!freeFireUid) {
      showError('No Free Fire UID linked yet. Click Edit Profile to link your UID.')
      return
    }
    navigator.clipboard.writeText(freeFireUid)
    setCopied(true)
    showSuccess('Free Fire MAX UID copied to clipboard!')
    setTimeout(() => setCopied(false), 2000)
  }

  // 7. Loading Skeleton
  if (authLoading && !user) {
    return (
      <div className="bg-[#000000] text-white font-body min-h-screen pb-20 antialiased">
        <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 space-y-6 animate-pulse">
          <div className="h-44 bg-[#111215] rounded-none border border-[#27272A]"></div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-[#111215] rounded-none border border-[#27272A]"></div>
            ))}
          </div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-[#111215] rounded-none border border-[#27272A]"></div>
            ))}
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="bg-[#000000] text-white font-body min-h-screen pb-20 antialiased selection:bg-[#FFB900]/30 selection:text-white">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 space-y-5 sm:space-y-6">

        {/* ================================================== */}
        {/* 1. PLAYER HERO / IDENTITY SECTION                  */}
        {/* ================================================== */}
        <section
          aria-label="Player Identity"
          className="relative rounded-none bg-[#111215] border border-[#27272A] p-5 sm:p-6  overflow-hidden"
        >
          {/* Subtle Cyber Grid & Ambient Highlights */}
          <div
            className="absolute inset-0 pointer-events-none opacity-20"
            style={{
              backgroundImage: 'radial-gradient(#FFB900 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          ></div>
          <div className="absolute top-0 right-0 w-64 h-32 bg-[#FFB900]/5 rounded-none blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-64 h-32 bg-[#FF8C00]/5 rounded-none blur-3xl pointer-events-none"></div>

          {/* Top Bar: Game Scope Badge + Edit Profile Action */}
          <div className="relative z-10 flex items-center justify-between gap-3 mb-4 pb-3 border-b border-[#27272A]/70">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-none bg-[#FFB900]/10 border border-[#FFB900]/30 text-[#FFB900] text-[10px] font-mono font-bold uppercase tracking-widest">
                <Gamepad2 className="w-3 h-3 text-[#FFB900]" />
                <span>FREE FIRE MAX</span>
              </span>
              {isVerified && (
                <span
                  id="profile-verified-badge"
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-none bg-[#10B981]/10 border border-[#10B981]/30 text-[#10B981] text-[10px] font-mono font-bold uppercase tracking-widest"
                >
                  <CheckCircle2 className="w-3 h-3 text-[#10B981]" />
                  <span>VERIFIED</span>
                </span>
              )}
            </div>

            <button
              onClick={() => navigate('/profile/edit')}
              aria-label="Edit Profile"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-none bg-[#18181B] hover:bg-[#FFB900]/10 border border-[#27272A] hover:border-[#FFB900]/50 text-[#A1A1AA] hover:text-[#FFB900] text-xs font-mono font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Profile</span>
            </button>
          </div>

          {/* Hero Content: Avatar + Player Info */}
          <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5 text-center sm:text-left">
            {/* Avatar with Status Ring & Conditional PRO Badge */}
            <div className="relative flex-shrink-0">
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-none object-cover ring-2 ring-[#FFB900]/30 ring-offset-2 ring-offset-[#111215] "
              />
              {isPro && (
                <div
                  id="profile-pro-badge"
                  className="absolute -bottom-1 -right-1 bg-[#FFB900] text-black text-[9px] font-black font-headline px-1.5 py-0.5 rounded-none  uppercase tracking-wider border border-[#000000]"
                >
                  PRO
                </div>
              )}
            </div>

            {/* Identity Text & UID */}
            <div className="space-y-1.5 flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-headline font-black text-white uppercase tracking-tight truncate">
                {displayName}
              </h1>

              {/* Free Fire MAX UID Pill */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-0.5">
                <div className="inline-flex items-center gap-2 bg-[#18181B] border border-[#27272A] rounded-none px-2.5 py-1 text-xs font-mono">
                  <span className="text-[#FFB900] font-bold text-[11px] uppercase tracking-wider">
                    UID:
                  </span>
                  <span className="text-white font-semibold tracking-wider select-all">
                    {freeFireUid || 'Not Linked'}
                  </span>
                  {freeFireUid && (
                    <button
                      onClick={handleCopyUid}
                      aria-label="Copy Free Fire MAX UID"
                      title="Copy Free Fire MAX UID"
                      className="text-[#A1A1AA] hover:text-[#FFB900] transition-colors p-0.5 cursor-pointer ml-1"
                    >
                      {copied ? (
                        <Check className="w-3.5 h-3.5 text-[#10B981]" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                </div>

                {/* Social Handles if set */}
                {instagram && (
                  <a
                    href={`https://instagram.com/${instagram.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#18181B] hover:bg-[#18181B] border border-[#27272A] hover:border-[#FF8C00]/40 text-[#A1A1AA] hover:text-[#FF8C00] rounded-none text-[11px] font-mono transition-all"
                  >
                    <span>@{instagram.replace('@', '')}</span>
                  </a>
                )}
                {whatsappChannel && (
                  <a
                    href={whatsappChannel}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#18181B] hover:bg-[#18181B] border border-[#27272A] hover:border-[#10B981]/40 text-[#A1A1AA] hover:text-[#10B981] rounded-none text-[11px] font-mono transition-all"
                  >
                    <span>WhatsApp</span>
                  </a>
                )}
              </div>

              {/* Bio (if available) */}
              {bio && (
                <p className="text-[#A1A1AA] text-xs font-sans italic line-clamp-2 max-w-xl pt-1">
                  "{bio}"
                </p>
              )}
            </div>
          </div>
        </section>

        {/* ================================================== */}
        {/* 2. PLAYER OVERVIEW / TELEMETRY STRIP               */}
        {/* ================================================== */}
        <section aria-label="Competitive Telemetry" className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[11px] font-mono font-bold uppercase tracking-widest text-[#A1A1AA] flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-[#FFB900]" />
              <span>Competitive Telemetry</span>
            </h2>
            <span className="text-[10px] font-mono text-[#71717A] uppercase tracking-wider">
              Free Fire MAX Live
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-3">
            {/* 1. Matches (Actual completed matches played) */}
            <div className="bg-[#111215] border border-[#27272A] rounded-none p-3 sm:p-3.5 flex flex-col justify-between hover:border-[#FFB900]/40 transition-all group">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#A1A1AA]">
                Matches
              </span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-xl sm:text-2xl font-mono font-black text-white group-hover:text-[#FFB900] transition-colors">
                  {matchesPlayedCount}
                </span>
                <Trophy className="w-4 h-4 text-[#FF8C00]/60 group-hover:text-[#FF8C00] transition-colors" />
              </div>
            </div>

            {/* 2. Wins (First-place finishes in completed matches) */}
            <div className="bg-[#111215] border border-[#27272A] rounded-none p-3 sm:p-3.5 flex flex-col justify-between hover:border-[#FF8C00]/40 transition-all group">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#A1A1AA]">
                Wins
              </span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-xl sm:text-2xl font-mono font-black text-white group-hover:text-[#FF8C00] transition-colors">
                  {winsCount}
                </span>
                <Flame className="w-4 h-4 text-[#FF8C00]/60 group-hover:text-[#FF8C00] transition-colors" />
              </div>
            </div>

            {/* 3. Eliminations / Kills (Aggregate kills recorded in match results) */}
            <div className="bg-[#111215] border border-[#27272A] rounded-none p-3 sm:p-3.5 flex flex-col justify-between hover:border-[#FFB900]/40 transition-all group">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#A1A1AA]">
                Kills
              </span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-xl sm:text-2xl font-mono font-black text-white group-hover:text-[#FFB900] transition-colors">
                  {totalKills}
                </span>
                <Crosshair className="w-4 h-4 text-[#FFB900]/60 group-hover:text-[#FFB900] transition-colors" />
              </div>
            </div>

            {/* 4. Win Rate (Calculated percentage of completed matches won) */}
            <div className="bg-[#111215] border border-[#27272A] rounded-none p-3 sm:p-3.5 flex flex-col justify-between hover:border-[#10B981]/40 transition-all group">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#A1A1AA]">
                Win Rate
              </span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-xl sm:text-2xl font-mono font-black text-white group-hover:text-[#10B981] transition-colors">
                  {winRate}
                </span>
                <ShieldCheck className="w-4 h-4 text-[#10B981]/60 group-hover:text-[#10B981] transition-colors" />
              </div>
            </div>

            {/* 5. Earnings (Authoritative tournament prize earnings or honest '—' unavailable state) */}
            <div className="bg-[#111215] border border-[#27272A] rounded-none p-3 sm:p-3.5 flex flex-col justify-between hover:border-[#10B981]/40 transition-all group col-span-2 sm:col-span-1">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#A1A1AA]">
                Earnings
              </span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-xl sm:text-2xl font-mono font-black text-white group-hover:text-[#10B981] transition-colors">
                  {hasEarningsData ? `₹${Math.floor(authoritativeEarnings)}` : '—'}
                </span>
                <Wallet className="w-4 h-4 text-[#10B981]/60 group-hover:text-[#10B981] transition-colors" />
              </div>
            </div>
          </div>
        </section>

        {/* ================================================== */}
        {/* 3. PROFILE CONTROL CENTER                          */}
        {/* ================================================== */}
        <section aria-label="Profile Control Center" className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[11px] font-mono font-bold uppercase tracking-widest text-[#A1A1AA]">
              Profile Control Center
            </h2>
            <span className="text-[10px] font-mono text-[#71717A] uppercase tracking-wider">
              Navigation
            </span>
          </div>

          <div className="space-y-2">
            {/* 1. STATISTICS */}
            <Link
              to="/profile/statistics"
              className="flex items-center justify-between p-3.5 sm:p-4 rounded-none bg-[#111215] border border-[#27272A] hover:border-[#FFB900]/40 hover:from-[#18181B] hover:to-[#111215] transition-all duration-200 group cursor-pointer"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-none bg-[#FFB900]/10 border border-[#FFB900]/20 flex items-center justify-center text-[#FFB900] group-hover:scale-105 group-hover: transition-all">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-white group-hover:text-[#FFB900] transition-colors">
                    Statistics
                  </h3>
                  <p className="text-[11px] text-[#A1A1AA] font-sans">
                    Performance & telemetry
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-none bg-[#18181B] border border-[#27272A] text-[10px] font-mono text-[#A1A1AA]">
                  {kdRatio} K/D
                </span>
                <ChevronRight className="w-4 h-4 text-[#71717A] group-hover:text-[#FFB900] group-hover:translate-x-0.5 transition-all" />
              </div>
            </Link>

            {/* TEAM MANAGEMENT */}
            <Link
              to="/profile/team"
              className="flex items-center justify-between p-3.5 sm:p-4 rounded-none bg-[#111215] border border-[#27272A] hover:border-[#FFB900]/40 hover:from-[#18181B] hover:to-[#111215] transition-all duration-200 group cursor-pointer"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-none bg-[#FFB900]/10 border border-[#FFB900]/20 flex items-center justify-center text-[#FFB900] group-hover:scale-105 group-hover: transition-all">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-white group-hover:text-[#FFB900] transition-colors">
                    Team Management
                  </h3>
                  <p className="text-[11px] text-[#A1A1AA] font-sans">
                    Squad roster & invitations
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-none bg-[#18181B] border border-[#27272A] text-[10px] font-mono text-[#A1A1AA]">
                  Squad
                </span>
                <ChevronRight className="w-4 h-4 text-[#71717A] group-hover:text-[#FFB900] group-hover:translate-x-0.5 transition-all" />
              </div>
            </Link>

            {/* 2. MATCHES */}
            <Link
              to="/profile/history"
              className="flex items-center justify-between p-3.5 sm:p-4 rounded-none bg-[#111215] border border-[#27272A] hover:border-[#FF8C00]/40 hover:from-[#18181B] hover:to-[#111215] transition-all duration-200 group cursor-pointer"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-none bg-[#FF8C00]/10 border border-[#FF8C00]/20 flex items-center justify-center text-[#FF8C00] group-hover:scale-105 group-hover: transition-all">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-white group-hover:text-[#FF8C00] transition-colors">
                    Matches
                  </h3>
                  <p className="text-[11px] text-[#A1A1AA] font-sans">
                    Tournament history
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-none bg-[#18181B] border border-[#27272A] text-[10px] font-mono text-[#A1A1AA]">
                  {userRegistrations.length} {userRegistrations.length === 1 ? 'Tournament' : 'Tournaments'}
                </span>
                <ChevronRight className="w-4 h-4 text-[#71717A] group-hover:text-[#FF8C00] group-hover:translate-x-0.5 transition-all" />
              </div>
            </Link>

            {/* 3. TROPHIES */}
            <Link
              to="/profile/achievements"
              className="flex items-center justify-between p-3.5 sm:p-4 rounded-none bg-[#111215] border border-[#27272A] hover:border-[#FFB900]/40 hover:from-[#18181B] hover:to-[#111215] transition-all duration-200 group cursor-pointer"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-none bg-[#FFB900]/10 border border-[#FFB900]/20 flex items-center justify-center text-[#FFB900] group-hover:scale-105 group-hover: transition-all">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-white group-hover:text-[#FFB900] transition-colors">
                    Trophies
                  </h3>
                  <p className="text-[11px] text-[#A1A1AA] font-sans">
                    Achievements & badges
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-none bg-[#18181B] border border-[#27272A] text-[10px] font-mono text-[#A1A1AA]">
                  Cabinet
                </span>
                <ChevronRight className="w-4 h-4 text-[#71717A] group-hover:text-[#FFB900] group-hover:translate-x-0.5 transition-all" />
              </div>
            </Link>

            {/* 4. WALLET */}
            <Link
              to="/wallet"
              className="flex items-center justify-between p-3.5 sm:p-4 rounded-none bg-[#111215] border border-[#27272A] hover:border-[#10B981]/40 hover:from-[#18181B] hover:to-[#111215] transition-all duration-200 group cursor-pointer"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-none bg-[#10B981]/10 border border-[#10B981]/20 flex items-center justify-center text-[#10B981] group-hover:scale-105 group-hover: transition-all">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-white group-hover:text-[#10B981] transition-colors">
                    Wallet
                  </h3>
                  <p className="text-[11px] text-[#A1A1AA] font-sans">
                    Available balance
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="px-2.5 py-0.5 rounded-none bg-[#10B981]/10 border border-[#10B981]/30 text-[11px] font-mono font-bold text-[#10B981]">
                  {isWalletLoading
                    ? 'Loading...'
                    : walletBalance !== null
                    ? `₹${Math.floor(walletBalance)}`
                    : 'Unavailable'}
                </span>
                <ChevronRight className="w-4 h-4 text-[#71717A] group-hover:text-[#10B981] group-hover:translate-x-0.5 transition-all" />
              </div>
            </Link>

            {/* 5. SETTINGS */}
            <Link
              to="/settings"
              className="flex items-center justify-between p-3.5 sm:p-4 rounded-none bg-[#111215] border border-[#27272A] hover:border-slate-400/40 hover:from-[#18181B] hover:to-[#111215] transition-all duration-200 group cursor-pointer"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-none bg-slate-400/10 border border-slate-400/20 flex items-center justify-center text-slate-400 group-hover:scale-105 group-hover: transition-all">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-white group-hover:text-slate-300 transition-colors">
                    Settings
                  </h3>
                  <p className="text-[11px] text-[#A1A1AA] font-sans">
                    Account & preferences
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-none bg-[#18181B] border border-[#27272A] text-[10px] font-mono text-[#A1A1AA]">
                  Configure
                </span>
                <ChevronRight className="w-4 h-4 text-[#71717A] group-hover:text-slate-300 group-hover:translate-x-0.5 transition-all" />
              </div>
            </Link>
          </div>
        </section>

      </main>
    </div>
  )
}
