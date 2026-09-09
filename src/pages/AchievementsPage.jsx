import { useState, useEffect, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTournaments } from '../contexts/TournamentContext'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import {
  Trophy,
  ArrowLeft,
  Award,
  ShieldCheck,
  Zap,
  Target,
  Lock,
  Unlock,
  Crosshair,
  Timer,
  CheckCircle2,
  Copy,
  Check,
  AlertCircle,
  Sparkles,
  ChevronRight
} from 'lucide-react'

export default function AchievementsPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const { tournaments, isUserRegistered, loading: tournamentsLoading } = useTournaments()

  const [filterTab, setFilterTab] = useState('ALL') // 'ALL' | 'UNLOCKED' | 'LOCKED'
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
        console.warn('[AchievementsPage verification check warn]:', err)
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

  // 2. Player Identity (Strictly Free Fire MAX only)
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

  // 3. User Registered & Completed Tournaments
  const userRegistrations = useMemo(() => {
    if (!Array.isArray(tournaments) || !user) return []
    return tournaments.filter((t) =>
      isUserRegistered(t.id, user.email || user.id || meta.username)
    )
  }, [tournaments, isUserRegistered, user, meta.username])

  const completedTournaments = useMemo(() => {
    return userRegistrations.filter((t) => t.status === 'Completed')
  }, [userRegistrations])

  const completedTournamentsCount = completedTournaments.length

  // Helper to resolve player's team in tournament results
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

  // Authoritative Telemetry Calculations
  const championshipsCount = useMemo(() => {
    return completedTournaments.filter((t) => {
      const myTeam = getPlayerTeam(t)
      return myTeam && (myTeam.rank === 1 || myTeam.position === 1)
    }).length
  }, [completedTournaments, getPlayerTeam])

  const podiumFinishesCount = useMemo(() => {
    return completedTournaments.filter((t) => {
      const myTeam = getPlayerTeam(t)
      return myTeam && (myTeam.rank === 1 || myTeam.rank === 2 || myTeam.rank === 3 ||
                         myTeam.position === 1 || myTeam.position === 2 || myTeam.position === 3)
    }).length
  }, [completedTournaments, getPlayerTeam])

  const totalKills = useMemo(() => {
    return completedTournaments.reduce((acc, t) => {
      const myTeam = getPlayerTeam(t)
      return acc + Number(myTeam?.kills || myTeam?.finishes || 0)
    }, 0)
  }, [completedTournaments, getPlayerTeam])

  const highestTournamentKills = useMemo(() => {
    return completedTournaments.reduce((max, t) => {
      const myTeam = getPlayerTeam(t)
      const kills = Number(myTeam?.kills || myTeam?.finishes || 0)
      return kills > max ? kills : max
    }, 0)
  }, [completedTournaments, getPlayerTeam])

  const hasSquadRegistration = useMemo(() => {
    return userRegistrations.some((t) => {
      const fmt = (t.format || t.mode || '').toLowerCase()
      return fmt.includes('squad') || t.teamSize === 4
    })
  }, [userRegistrations])

  // 4. Derived Achievements Calculation (6 defined achievements evaluated from authoritative tournament & result data)
  const achievements = useMemo(() => {
    return [
      {
        id: 'first-blood',
        title: 'First Blood',
        description: 'Confirm your first registered match kill in a tournament lobby.',
        icon: Crosshair,
        color: 'text-[#fe6b00] border-[#fe6b00]/30 bg-[#fe6b00]/10',
        unlocked: totalKills >= 1,
        progressCurrent: Math.min(totalKills, 1),
        progressTarget: 1,
        progressText: `${Math.min(totalKills, 1)} / 1`,
        points: 100
      },
      {
        id: 'winner-winner',
        title: 'Booyah Champion',
        description: 'Win a Free Fire MAX tournament.',
        icon: Trophy,
        color: 'text-[#fbbf24] border-[#fbbf24]/30 bg-[#fbbf24]/10',
        unlocked: championshipsCount >= 1,
        progressCurrent: Math.min(championshipsCount, 1),
        progressTarget: 1,
        progressText: `${Math.min(championshipsCount, 1)} / 1`,
        points: 500
      },
      {
        id: 'survivalist',
        title: 'Survivalist',
        description: 'Complete your first Free Fire MAX tournament.',
        icon: Timer,
        color: 'text-[#00ff9d] border-[#00ff9d]/30 bg-[#00ff9d]/10',
        unlocked: completedTournamentsCount >= 1,
        progressCurrent: Math.min(completedTournamentsCount, 1),
        progressTarget: 1,
        progressText: `${Math.min(completedTournamentsCount, 1)} / 1`,
        points: 250
      },
      {
        id: 'fair-play',
        title: 'Veteran Competitor',
        description: 'Complete 5 Free Fire MAX tournaments.',
        icon: ShieldCheck,
        color: 'text-[#00f2ff] border-[#00f2ff]/30 bg-[#00f2ff]/10',
        unlocked: completedTournamentsCount >= 5,
        progressCurrent: Math.min(completedTournamentsCount, 5),
        progressTarget: 5,
        progressText: `${Math.min(completedTournamentsCount, 5)} / 5`,
        points: 150
      },
      {
        id: 'squad-goals',
        title: 'Squad Goals',
        description: 'Register and play a match with a full roster of 4 teammates.',
        icon: Zap,
        color: 'text-[#a855f7] border-[#a855f7]/30 bg-[#a855f7]/10',
        unlocked: hasSquadRegistration,
        progressCurrent: hasSquadRegistration ? 1 : 0,
        progressTarget: 1,
        progressText: hasSquadRegistration ? '1 / 1' : '0 / 1',
        points: 200
      },
      {
        id: 'mvp-fragger',
        title: 'MVP Fragger',
        description: 'Achieve the highest total kills in a single tournament event.',
        icon: Target,
        color: 'text-[#ec4899] border-[#ec4899]/30 bg-[#ec4899]/10',
        unlocked: highestTournamentKills >= 10,
        progressCurrent: Math.min(highestTournamentKills, 10),
        progressTarget: 10,
        progressText: `${Math.min(highestTournamentKills, 10)} / 10`,
        points: 400
      }
    ]
  }, [totalKills, championshipsCount, completedTournamentsCount, hasSquadRegistration, highestTournamentKills])

  // Count & Percentage Metrics
  const totalDefined = achievements.length
  const unlockedCount = useMemo(() => achievements.filter((a) => a.unlocked).length, [achievements])
  const lockedCount = totalDefined - unlockedCount
  const completionPercent = useMemo(() => {
    if (totalDefined === 0) return 0
    return Math.round((unlockedCount / totalDefined) * 100)
  }, [unlockedCount, totalDefined])

  // Latest / Featured Unlocked Crown
  const latestUnlockedCrown = useMemo(() => {
    const unlocked = achievements.filter((a) => a.unlocked)
    if (unlocked.length === 0) return null
    // Pick highest point trophy as featured crown
    return [...unlocked].sort((a, b) => b.points - a.points)[0]
  }, [achievements])

  // Filtered List
  const filteredAchievements = useMemo(() => {
    return achievements.filter((a) => {
      if (filterTab === 'UNLOCKED') return a.unlocked
      if (filterTab === 'LOCKED') return !a.unlocked
      return true
    })
  }, [achievements, filterTab])

  // Loading State Skeleton
  if (authLoading || tournamentsLoading) {
    return (
      <div className="bg-[#050508] text-white min-h-screen pb-24 antialiased font-mono">
        <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
          <div className="h-6 w-36 bg-[#12141c] rounded animate-pulse" />
          <div className="h-28 bg-[#0d0e15] border border-[#1f2230] rounded-2xl animate-pulse" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="h-20 bg-[#0d0e15] border border-[#1f2230] rounded-xl animate-pulse" />
            <div className="h-20 bg-[#0d0e15] border border-[#1f2230] rounded-xl animate-pulse" />
            <div className="h-20 bg-[#0d0e15] border border-[#1f2230] rounded-xl animate-pulse" />
            <div className="h-20 bg-[#0d0e15] border border-[#1f2230] rounded-xl animate-pulse" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="h-36 bg-[#0d0e15] border border-[#1f2230] rounded-xl animate-pulse" />
            <div className="h-36 bg-[#0d0e15] border border-[#1f2230] rounded-xl animate-pulse" />
          </div>
        </main>
      </div>
    )
  }

  // Error State fallback if tournaments data failed to load
  if (!Array.isArray(tournaments)) {
    return (
      <div className="bg-[#050508] text-white min-h-screen pb-24 antialiased font-mono flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center p-8 bg-[#0d0e15] border border-[#ff4655]/30 rounded-2xl space-y-4">
          <AlertCircle className="w-10 h-10 text-[#ff4655] mx-auto" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-white">
            ACHIEVEMENTS TEMPORARILY UNAVAILABLE
          </h2>
          <p className="text-xs text-[#8e95a5] font-sans">
            Please try again later.
          </p>
          <Link
            to="/profile"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#141620] border border-[#222638] text-xs font-bold text-[#00f2ff] hover:bg-[#1a1d29] transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Profile</span>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#050508] text-white min-h-screen pb-24 antialiased font-mono selection:bg-[#00f2ff]/20 selection:text-[#00f2ff]">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-6">

        {/* ================================================== */}
        {/* 1. TOP NAVIGATION & BREADCRUMB                     */}
        {/* ================================================== */}
        <div className="flex items-center justify-between">
          <Link
            to="/profile"
            className="inline-flex items-center gap-2 text-xs font-bold text-[#8e95a5] hover:text-[#00f2ff] uppercase tracking-wider transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
            <span>Return to Profile</span>
          </Link>

          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-widest bg-[#00f2ff]/10 text-[#00f2ff] border border-[#00f2ff]/20">
            FREE FIRE MAX
          </span>
        </div>

        {/* ================================================== */}
        {/* 2. PLAYER IDENTITY & PAGE TITLE HEADER             */}
        {/* ================================================== */}
        <header
          aria-label="Trophy Cabinet Header"
          className="p-5 rounded-2xl bg-gradient-to-b from-[#0e1017] to-[#08090d] border border-[#1f2230] relative overflow-hidden shadow-[0_0_25px_rgba(0,0,0,0.4)]"
        >
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="relative w-12 h-12 rounded-xl bg-[#141620] border border-[#222638] flex items-center justify-center overflow-hidden shrink-0">
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="font-sans font-black text-lg sm:text-xl text-white tracking-wide uppercase">
                    TROPHY CABINET
                  </h1>
                  {isVerified && (
                    <span
                      title="Authoritatively Verified Player"
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#00f2ff]/10 text-[#00f2ff] border border-[#00f2ff]/30"
                    >
                      <ShieldCheck className="w-3 h-3 text-[#00f2ff]" />
                      <span>VERIFIED</span>
                    </span>
                  )}
                </div>

                <p className="text-[11px] font-mono uppercase tracking-widest text-[#717a8e]">
                  ACHIEVEMENTS & COMPETITIVE MILESTONES
                </p>
              </div>
            </div>

            {/* Free Fire MAX Identity Pill */}
            <div className="flex items-center gap-2 bg-[#12141c] border border-[#1f2230] rounded-xl px-3 py-2 text-xs shrink-0">
              <div className="w-2 h-2 rounded-full bg-[#00f2ff] shadow-[0_0_8px_#00f2ff]" />
              <div className="flex flex-col">
                <span className="text-[9px] text-[#717a8e] uppercase font-bold tracking-wider">
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
                  className="ml-1 p-1 hover:text-[#00f2ff] text-[#717a8e] transition-colors cursor-pointer"
                  aria-label="Copy UID"
                >
                  {copiedUid ? <Check className="w-3.5 h-3.5 text-[#00ff9d]" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
          </div>
        </header>

        {/* ================================================== */}
        {/* 3. SUMMARY TELEMETRY BAR (4 COMPACT METRICS)       */}
        {/* ================================================== */}
        <section
          aria-label="Trophy Cabinet Telemetry"
          className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5"
        >
          {/* UNLOCKED TROPHIES */}
          <div className="p-3 sm:p-4 rounded-xl bg-[#0d0e15] border border-[#1f2230] relative overflow-hidden group hover:border-[#fbbf24]/30 transition-all">
            <div className="flex items-center justify-between text-[#8e95a5] text-[10px] sm:text-[11px] uppercase font-bold tracking-wider mb-1">
              <span>UNLOCKED TROPHIES</span>
              <Award className="w-3.5 h-3.5 text-[#fbbf24]" />
            </div>
            <div className="font-sans font-black text-base sm:text-xl text-[#fbbf24] tracking-tight">
              {unlockedCount} <span className="text-xs text-[#717a8e] font-mono">/ {totalDefined}</span>
            </div>
            <div className="text-[9px] text-[#717a8e] font-mono mt-0.5 truncate">
              Earned Badges
            </div>
          </div>

          {/* COMPLETION % */}
          <div className="p-3 sm:p-4 rounded-xl bg-[#0d0e15] border border-[#1f2230] relative overflow-hidden group hover:border-[#00f2ff]/30 transition-all">
            <div className="flex items-center justify-between text-[#8e95a5] text-[10px] sm:text-[11px] uppercase font-bold tracking-wider mb-1">
              <span>COMPLETION</span>
              <Sparkles className="w-3.5 h-3.5 text-[#00f2ff]" />
            </div>
            <div className="font-sans font-black text-base sm:text-xl text-[#00f2ff] tracking-tight">
              {completionPercent}%
            </div>
            <div className="text-[9px] text-[#717a8e] font-mono mt-0.5 truncate">
              Overall Progress
            </div>
          </div>

          {/* CHAMPIONSHIPS */}
          <div className="p-3 sm:p-4 rounded-xl bg-[#0d0e15] border border-[#1f2230] relative overflow-hidden group hover:border-[#fbbf24]/30 transition-all">
            <div className="flex items-center justify-between text-[#8e95a5] text-[10px] sm:text-[11px] uppercase font-bold tracking-wider mb-1">
              <span>CHAMPIONSHIPS</span>
              <Trophy className="w-3.5 h-3.5 text-[#fbbf24]" />
            </div>
            <div className="font-sans font-black text-base sm:text-xl text-white tracking-tight">
              {championshipsCount}
            </div>
            <div className="text-[9px] text-[#717a8e] font-mono mt-0.5 truncate">
              1st Place Finishes
            </div>
          </div>

          {/* PODIUM FINISHES */}
          <div className="p-3 sm:p-4 rounded-xl bg-[#0d0e15] border border-[#1f2230] relative overflow-hidden group hover:border-[#ff8c00]/30 transition-all">
            <div className="flex items-center justify-between text-[#8e95a5] text-[10px] sm:text-[11px] uppercase font-bold tracking-wider mb-1">
              <span>PODIUM FINISHES</span>
              <Trophy className="w-3.5 h-3.5 text-[#ff8c00]" />
            </div>
            <div className="font-sans font-black text-base sm:text-xl text-[#ff8c00] tracking-tight">
              {podiumFinishesCount}
            </div>
            <div className="text-[9px] text-[#717a8e] font-mono mt-0.5 truncate">
              Top 3 Tournament Ranks
            </div>
          </div>
        </section>

        {/* ================================================== */}
        {/* 4. FEATURED CROWN ("LATEST CROWN EARNED")           */}
        {/* ================================================== */}
        <section aria-label="Latest Crown Earned" className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[11px] font-mono font-bold uppercase tracking-widest text-[#717a8e] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#fbbf24]" />
              <span>LATEST CROWN EARNED</span>
            </h2>
          </div>

          {latestUnlockedCrown ? (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-[#141620] via-[#0d0e15] to-[#0a0b10] border border-[#fbbf24]/30 shadow-[0_0_20px_rgba(251,191,36,0.08)] flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-[#fbbf24]/10 border border-[#fbbf24]/40 flex items-center justify-center text-[#fbbf24] shrink-0 shadow-[0_0_12px_rgba(251,191,36,0.15)]">
                  <latestUnlockedCrown.icon className="w-6 h-6" />
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-white uppercase tracking-wide">
                      {latestUnlockedCrown.title}
                    </h3>
                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[9px] font-bold bg-[#fbbf24]/15 text-[#fbbf24] border border-[#fbbf24]/30 uppercase">
                      <Unlock className="w-2.5 h-2.5" />
                      <span>Unlocked</span>
                    </span>
                  </div>
                  <p className="text-[11px] text-[#8e95a5] font-sans max-w-md">
                    {latestUnlockedCrown.description}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg text-xs font-black font-mono bg-[#fbbf24]/10 text-[#fbbf24] border border-[#fbbf24]/30">
                  +{latestUnlockedCrown.points} XP
                </span>
              </div>
            </div>
          ) : (
            <div className="p-5 text-center rounded-2xl bg-[#0d0e15] border border-[#1f2230] space-y-1.5">
              <Award className="w-8 h-8 text-[#525866] mx-auto" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                NO CROWNS EARNED YET
              </h3>
              <p className="text-[11px] text-[#8e95a5] font-sans max-w-sm mx-auto">
                Complete Free Fire MAX tournament milestones to earn your first competitive badge.
              </p>
            </div>
          )}
        </section>

        {/* ================================================== */}
        {/* 5. FILTER TABS (ALL | UNLOCKED | LOCKED)           */}
        {/* ================================================== */}
        <div className="flex items-center justify-start bg-[#0d0e15] p-1 rounded-xl border border-[#1f2230] text-xs font-bold w-fit">
          <button
            role="tab"
            aria-selected={filterTab === 'ALL'}
            onClick={() => setFilterTab('ALL')}
            className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer uppercase tracking-wider ${
              filterTab === 'ALL'
                ? 'bg-[#00f2ff] text-black font-extrabold shadow-[0_0_12px_rgba(0,242,255,0.3)]'
                : 'text-[#8e95a5] hover:text-white'
            }`}
          >
            All ({totalDefined})
          </button>
          <button
            role="tab"
            aria-selected={filterTab === 'UNLOCKED'}
            onClick={() => setFilterTab('UNLOCKED')}
            className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer uppercase tracking-wider ${
              filterTab === 'UNLOCKED'
                ? 'bg-[#00f2ff] text-black font-extrabold shadow-[0_0_12px_rgba(0,242,255,0.3)]'
                : 'text-[#8e95a5] hover:text-white'
            }`}
          >
            Unlocked ({unlockedCount})
          </button>
          <button
            role="tab"
            aria-selected={filterTab === 'LOCKED'}
            onClick={() => setFilterTab('LOCKED')}
            className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer uppercase tracking-wider ${
              filterTab === 'LOCKED'
                ? 'bg-[#00f2ff] text-black font-extrabold shadow-[0_0_12px_rgba(0,242,255,0.3)]'
                : 'text-[#8e95a5] hover:text-white'
            }`}
          >
            Locked ({lockedCount})
          </button>
        </div>

        {/* ================================================== */}
        {/* 6. ACHIEVEMENTS GRID                               */}
        {/* ================================================== */}
        {filteredAchievements.length === 0 ? (
          <div
            aria-label="Empty Achievements Filter"
            className="py-16 text-center border border-[#1f2230] bg-[#0d0e15] rounded-2xl p-6 space-y-3 font-mono"
          >
            <Award className="w-10 h-10 text-[#525866] mx-auto" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              {filterTab === 'UNLOCKED'
                ? 'NO UNLOCKED ACHIEVEMENTS'
                : filterTab === 'LOCKED'
                ? 'NO LOCKED ACHIEVEMENTS'
                : 'NO TROPHIES YET'}
            </h2>
            <p className="text-xs text-[#8e95a5] font-sans max-w-sm mx-auto">
              {filterTab === 'UNLOCKED'
                ? 'Participate in Free Fire MAX tournaments to unlock competitive badges.'
                : 'All available competitive milestones have been completed!'}
            </p>
            {filterTab !== 'ALL' && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setFilterTab('ALL')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141620] border border-[#222638] text-xs font-bold text-[#00f2ff] hover:bg-[#1a1d29] transition-all cursor-pointer"
                >
                  <span>View All Badges</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <section
            aria-label="Achievements List"
            className="grid grid-cols-1 sm:grid-cols-2 gap-3.5"
          >
            {filteredAchievements.map((badge) => {
              const Icon = badge.icon
              const isUnlocked = badge.unlocked

              return (
                <article
                  key={badge.id}
                  className={`p-4 rounded-2xl border transition-all relative overflow-hidden flex flex-col justify-between min-h-[160px] font-mono ${
                    isUnlocked
                      ? 'bg-[#0d0e15] border-[#1f2230] hover:border-[#00f2ff]/40 shadow-[0_4px_20px_rgba(0,0,0,0.25)]'
                      : 'bg-[#0a0b10] border-[#181a24] opacity-70'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Top Row: Icon & Status Badge */}
                    <div className="flex justify-between items-start">
                      <div
                        className={`w-10 h-10 rounded-xl border flex items-center justify-center ${
                          isUnlocked
                            ? badge.color
                            : 'text-[#525866] border-[#222638] bg-[#141620]'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>

                      <div className="flex items-center gap-1.5">
                        {isUnlocked ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9.5px] font-bold uppercase bg-[#00ff9d]/15 text-[#00ff9d] border border-[#00ff9d]/30">
                            <Unlock className="w-2.5 h-2.5" />
                            <span>UNLOCKED</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9.5px] font-bold uppercase bg-[#141620] text-[#717a8e] border border-[#222638]">
                            <Lock className="w-2.5 h-2.5" />
                            <span>LOCKED</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Middle: Title & Description */}
                    <div className="space-y-1">
                      <h3 className={`text-xs sm:text-sm font-bold uppercase tracking-wide ${isUnlocked ? 'text-white' : 'text-[#8e95a5]'}`}>
                        {badge.title}
                      </h3>
                      <p className="text-[11px] text-[#717a8e] leading-relaxed font-sans">
                        {badge.description}
                      </p>
                    </div>
                  </div>

                  {/* Bottom: Progress & Points */}
                  <div className="pt-3 border-t border-[#1f2230]/60 flex items-center justify-between text-[10px] mt-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[#8e95a5]">
                        {badge.progressText}
                      </span>
                    </div>

                    <span
                      className={`font-black px-2 py-0.5 rounded font-mono ${
                        isUnlocked
                          ? 'bg-[#fbbf24]/10 text-[#fbbf24] border border-[#fbbf24]/30'
                          : 'bg-[#141620] text-[#717a8e] border border-[#222638]'
                      }`}
                    >
                      +{badge.points} XP
                    </span>
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
