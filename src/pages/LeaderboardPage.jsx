import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react'
import { Trophy, Download, Swords, User } from 'lucide-react'
import { supabase, isSupabaseConfigured } from '../lib/supabase.js'
import { useAuth } from '../contexts/AuthContext'
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
} from '../utils/tournamentPrizeUtils.js'

const PublicTeamProfileModal = lazy(() => import('../components/team/PublicTeamProfileModal.jsx'))

export default function LeaderboardPage() {
  const { user, profile } = useAuth()
  const [tournamentsList, setTournamentsList] = useState([])
  const [profilesList, setProfilesList] = useState([])
  const [publicAvatarsList, setPublicAvatarsList] = useState([])
  const [registrationsList, setRegistrationsList] = useState([])
  const [selectedTournamentId, setSelectedTournamentId] = useState(null)
  const [selectedTeamModal, setSelectedTeamModal] = useState(null)
  const [loading, setLoading] = useState(true)
  const [championImgError, setChampionImgError] = useState(false)

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
            .select('id, username, avatar_url, email, game_uid'),
          supabase
            .from('tournament_registrations')
            .select('id, tournament_id, team_name, captain_name, free_fire_uid, email, user_id, status')
        ])

        let fetchedTournaments = []
        if (tournRes.status === 'fulfilled' && tournRes.value.data) {
          fetchedTournaments = tournRes.value.data
          setTournamentsList(fetchedTournaments)
        } else if (tournRes.status === 'fulfilled' && tournRes.value.error) {
          console.warn('[Leaderboard Supabase Fetch Notice]:', tournRes.value.error.message)
          setTournamentsList([])
        }

        if (profRes.status === 'fulfilled' && Array.isArray(profRes.value.data)) {
          setProfilesList(profRes.value.data)
        } else if (profRes.status === 'fulfilled' && profRes.value.error) {
          console.warn('[Leaderboard Profiles Fetch Notice]:', profRes.value.error.message)
        }

        if (regRes.status === 'fulfilled' && Array.isArray(regRes.value.data)) {
          setRegistrationsList(regRes.value.data)
        } else if (regRes.status === 'fulfilled' && regRes.value.error) {
          console.warn('[Leaderboard Registrations Fetch Notice]:', regRes.value.error.message)
        }

        // Securely fetch public profile avatars for all players across tournaments via dedicated RPC
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        const extractedUserIds = new Set()

        fetchedTournaments.forEach((t) => {
          const teams = Array.isArray(t.teams_list) ? t.teams_list : (Array.isArray(t.teamsList) ? t.teamsList : [])
          teams.forEach((team) => {
            if (!team) return
            const uid =
              team.userId ||
              team.user_id ||
              team.captainId ||
              team.captain_id ||
              null
            if (uid && typeof uid === 'string' && uuidRegex.test(uid.trim())) {
              extractedUserIds.add(uid.trim())
            }
            if (Array.isArray(team.roster)) {
              team.roster.forEach((m) => {
                if (m?.userId && typeof m.userId === 'string' && uuidRegex.test(m.userId.trim())) {
                  extractedUserIds.add(m.userId.trim())
                }
              })
            }
          })
        })

        if (extractedUserIds.size > 0) {
          try {
            const { data: avatarRows, error: rpcErr } = await supabase.rpc('get_public_profile_avatars', {
              user_ids: Array.from(extractedUserIds)
            })
            if (!rpcErr && Array.isArray(avatarRows)) {
              setPublicAvatarsList(avatarRows)
            } else if (rpcErr) {
              console.warn('[Leaderboard Public Avatars RPC Notice]:', rpcErr.message)
            }
          } catch (rpcEx) {
            console.warn('[Leaderboard Public Avatars RPC Exception]:', rpcEx)
          }
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

  // Fast authoritative lookup map for user and player avatars
  const profileMap = useMemo(() => {
    const map = {}

    // 1. Authoritative public avatar RPC data (highest precedence for public profile photos)
    publicAvatarsList.forEach((pa) => {
      if (!pa) return
      const avatar = pa.avatar_url || pa.avatarUrl || null
      if (avatar && typeof avatar === 'string' && avatar.trim() && pa.id) {
        map[String(pa.id).trim()] = avatar.trim()
      }
    })

    // 2. Direct profiles data (if available for authenticated user / admin)
    profilesList.forEach((p) => {
      if (!p) return
      const avatar = p.avatar_url || p.avatarUrl || null
      if (avatar && typeof avatar === 'string' && avatar.trim()) {
        const cleanAvatar = avatar.trim()
        if (p.id) map[String(p.id).trim()] = cleanAvatar
        if (p.username) map[p.username.toLowerCase().trim()] = cleanAvatar
        if (p.game_uid) map[String(p.game_uid).trim()] = cleanAvatar
        if (p.email) map[p.email.toLowerCase().trim()] = cleanAvatar
      }
    })

    // 3. Tournament registrations data
    registrationsList.forEach((r) => {
      if (!r) return
      const userUuid = r.user_id ? String(r.user_id).trim() : null
      const existingAvatar = userUuid ? map[userUuid] : null
      const avatar = r.avatar_url || r.avatarUrl || existingAvatar || null

      if (avatar && typeof avatar === 'string' && avatar.trim()) {
        const cleanAvatar = avatar.trim()
        if (r.captain_name) {
          const capKey = r.captain_name.toLowerCase().trim()
          if (!map[capKey]) map[capKey] = cleanAvatar
        }
        if (r.team_name) {
          const teamKey = r.team_name.toLowerCase().trim()
          if (!map[teamKey]) map[teamKey] = cleanAvatar
        }
        if (r.free_fire_uid) {
          const ffKey = String(r.free_fire_uid).trim()
          if (!map[ffKey]) map[ffKey] = cleanAvatar
        }
        if (r.email) {
          const emailKey = r.email.toLowerCase().trim()
          if (!map[emailKey]) map[emailKey] = cleanAvatar
        }
      }
    })

    return map
  }, [publicAvatarsList, profilesList, registrationsList])

  // Fast authoritative lookup map for player display names
  const playerNameMap = useMemo(() => {
    const map = {}

    // 1. Database profiles data (public.profiles)
    if (Array.isArray(profilesList)) {
      profilesList.forEach((p) => {
        if (!p || !p.username) return
        const cleanName = p.username.trim()
        if (cleanName) {
          if (p.id) map[String(p.id).trim()] = cleanName
          if (p.game_uid) map[String(p.game_uid).trim()] = cleanName
          if (p.email) map[p.email.toLowerCase().trim()] = cleanName
        }
      })
    }

    // 2. Tournament registrations data
    if (Array.isArray(registrationsList)) {
      registrationsList.forEach((r) => {
        if (!r) return
        const cap = r.captain_name ? r.captain_name.trim() : ''
        if (cap) {
          if (r.user_id && !map[String(r.user_id).trim()]) map[String(r.user_id).trim()] = cap
          if (r.free_fire_uid && !map[String(r.free_fire_uid).trim()]) map[String(r.free_fire_uid).trim()] = cap
          if (r.email && !map[r.email.toLowerCase().trim()]) map[r.email.toLowerCase().trim()] = cap
        }
      })
    }

    // 3. Current authenticated user state from AuthContext (highest precedence for active session)
    if (user?.id) {
      const activeName = (user?.user_metadata?.username || profile?.username || '').trim()
      if (activeName) {
        map[String(user.id).trim()] = activeName
        const userUid = user?.user_metadata?.freeFireUid || user?.user_metadata?.game_uid || profile?.game_uid
        if (userUid) map[String(userUid).trim()] = activeName
        if (user.email) map[user.email.toLowerCase().trim()] = activeName
      }
    }

    return map
  }, [profilesList, registrationsList, user, profile])

  // Currently active/selected tournament (auto-prefers tournament with scored results if available)
  const activeTournament = useMemo(() => {
    if (selectedTournamentId) {
      return tournamentsList.find((t) => t.id === selectedTournamentId) || tournamentsList[0] || null
    }
    // Auto-select tournament with scored match scores if present
    const scoredTourn = tournamentsList.find((t) => {
      const teams = Array.isArray(t.teams_list) ? t.teams_list : (Array.isArray(t.teamsList) ? t.teamsList : [])
      return teams.some((tm) => Number(tm.kills || 0) > 0 || Number(tm.points || 0) > 0)
    })
    return scoredTourn || tournamentsList[0] || null
  }, [tournamentsList, selectedTournamentId])

  const activePrizeType = useMemo(() => {
    if (!activeTournament) return 'placement'
    if (isPerKillTournament(activeTournament)) return 'per_kill'
    if (isPlacementPlusKillTournament(activeTournament)) return 'placement_kill'
    if (isWinnerTakesAllTournament(activeTournament)) return 'winner_takes_all'
    return 'placement'
  }, [activeTournament])

  // Dynamic Prize Pool calculation derived strictly from activeTournament
  const prizePoolSummary = useMemo(() => {
    if (!activeTournament) {
      return {
        isPerKill: true,
        isWinnerTakesAll: false,
        isPlacementKill: false,
        perKillAmount: 30,
        totalFormatted: '₹30 / KILL',
        firstFormatted: '₹30 / Kill',
        secondFormatted: 'Kills × ₹30',
        thirdFormatted: 'No Rank Cuts',
        firstAmount: 'Per Kill ₹30',
        secondAmount: 'Per Kill ₹30',
        thirdAmount: 'Per Kill ₹30',
      }
    }

    if (activePrizeType === 'per_kill') {
      const perKillAmount = extractPerKillAmount(activeTournament) || 30
      return {
        isPerKill: true,
        isWinnerTakesAll: false,
        isPlacementKill: false,
        perKillAmount,
        totalFormatted: `₹${perKillAmount} / KILL`,
        firstFormatted: `₹${perKillAmount} / Kill`,
        secondFormatted: `Kills × ₹${perKillAmount}`,
        thirdFormatted: 'No Rank Cuts',
        firstAmount: `Per Kill ₹${perKillAmount}`,
        secondAmount: `Per Kill ₹${perKillAmount}`,
        thirdAmount: `Per Kill ₹${perKillAmount}`,
      }
    }

    if (activePrizeType === 'winner_takes_all') {
      const winnerAmount = extractWinnerPrizeAmount(activeTournament) || 1500
      return {
        isPerKill: false,
        isWinnerTakesAll: true,
        isPlacementKill: false,
        totalFormatted: `₹${winnerAmount.toLocaleString('en-IN')}`,
        firstFormatted: `₹${winnerAmount.toLocaleString('en-IN')}`,
        secondFormatted: '₹0',
        thirdFormatted: '₹0',
        firstAmount: `₹${winnerAmount.toLocaleString('en-IN')}`,
        secondAmount: '₹0',
        thirdAmount: '₹0',
        firstPlacePrize: winnerAmount,
        secondPlacePrize: 0,
        thirdPlacePrize: 0,
      }
    }

    if (activePrizeType === 'placement_kill') {
      const perKillAmount = extractPerKillAmount(activeTournament) || 20
      const placementPrizes = extractPlacementPrizes(activeTournament)
      return {
        isPerKill: false,
        isWinnerTakesAll: false,
        isPlacementKill: true,
        perKillAmount,
        totalFormatted: `Placement + ₹${perKillAmount}/k`,
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

    const raw = String(activeTournament.prize_pool || activeTournament.prizePool || '0').replace(/[^0-9]/g, '')
    let totalPoolNum = parseInt(raw, 10)
    if (isNaN(totalPoolNum) || totalPoolNum <= 0) {
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
  }, [activeTournament, activePrizeType])

  // Standings strictly bound to the activeTournament
  const standings = useMemo(() => {
    if (!activeTournament) return []

    const statsMap = {}
    const teams = Array.isArray(activeTournament.teams_list)
      ? activeTournament.teams_list
      : Array.isArray(activeTournament.teamsList)
      ? activeTournament.teamsList
      : []

    const isSoloTournament = activeTournament.format === 'Solo' || activeTournament.mode === 'Solo' || activeTournament.game === 'Solo'

    teams.forEach((team) => {
      if (!team) return
      const rawName = team.team || team.teamName || team.team_name || team.name || team.captain || 'Team Apex'
      const rawPlayer = team.captain || team.captain_name || team.player || team.name || 'Player'

      const userId =
        team.userId ||
        team.user_id ||
        team.captainId ||
        team.captain_id ||
        (Array.isArray(team.roster) && team.roster[0]?.userId ? team.roster[0].userId : null) ||
        null

      const captainUid =
        team.freeFireUid ||
        team.free_fire_uid ||
        team.game_uid ||
        team.gameUid ||
        team.captainUid ||
        team.captain_uid ||
        (Array.isArray(team.roster) && team.roster[0]?.uid ? team.roster[0].uid : null) ||
        null

      const teamEmail = team.email ? String(team.email).toLowerCase().trim() : ''

      const userIdKey = userId ? String(userId).trim() : ''
      const uidKey = captainUid ? String(captainUid).trim() : ''

      // Authoritative live display name resolution from profiles/user/registrations
      const resolvedPlayer =
        (userIdKey && playerNameMap[userIdKey]) ||
        (uidKey && playerNameMap[uidKey]) ||
        (teamEmail && playerNameMap[teamEmail]) ||
        rawPlayer

      const isPlayerAsTeam = !team.team || team.team === team.captain || rawName === rawPlayer || isSoloTournament
      const resolvedTeamName = isPlayerAsTeam ? resolvedPlayer : rawName

      const kills = Math.max(0, Number(team.kills || team.finishes || 0))
      const points = Number(team.points || team.score || 0)
      const isWinner = team.rank === 1 || team.position === 1

      const playerKey = resolvedPlayer ? resolvedPlayer.toLowerCase().trim() : ''
      const teamKey = resolvedTeamName ? resolvedTeamName.toLowerCase().trim() : ''
      const rawPlayerKey = rawPlayer ? rawPlayer.toLowerCase().trim() : ''
      const rawTeamKey = rawName ? rawName.toLowerCase().trim() : ''

      const resolvedAvatar =
        (userIdKey && profileMap[userIdKey] ? profileMap[userIdKey] : null) ||
        (uidKey && profileMap[uidKey] ? profileMap[uidKey] : null) ||
        (playerKey && profileMap[playerKey] ? profileMap[playerKey] : null) ||
        (teamKey && profileMap[teamKey] ? profileMap[teamKey] : null) ||
        (rawPlayerKey && profileMap[rawPlayerKey] ? profileMap[rawPlayerKey] : null) ||
        (rawTeamKey && profileMap[rawTeamKey] ? profileMap[rawTeamKey] : null) ||
        team.avatar_url ||
        team.avatar ||
        team.avatarUrl ||
        team.logoUrl ||
        team.logo_url ||
        null

      const groupKey = userIdKey || (teamKey || 'team-apex')

      if (!statsMap[groupKey]) {
        statsMap[groupKey] = {
          team: resolvedTeamName,
          player: resolvedPlayer,
          userId: userId,
          gameUid: captainUid,
          matches: 0,
          wins: 0,
          points: 0,
          kills: 0,
          avatar: resolvedAvatar,
        }
      }
      statsMap[groupKey].matches += 1
      if (isWinner) statsMap[groupKey].wins += 1
      statsMap[groupKey].points += points
      statsMap[groupKey].kills += kills
      if (resolvedAvatar) {
        statsMap[groupKey].avatar = resolvedAvatar
      }
    })

    const sortedList = Object.values(statsMap).sort(
      (a, b) => b.points - a.points || b.wins - a.wins || b.kills - a.kills || a.team.localeCompare(b.team)
    )

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
  }, [activeTournament, prizePoolSummary, profileMap, playerNameMap])

  const championTeam = standings[0] || null

  // MVP based on kills inside the selected tournament
  const mvpPlayer = useMemo(() => {
    if (standings.length === 0) return null
    const sortedByKills = [...standings].sort((a, b) => b.kills - a.kills || b.points - a.points)
    return sortedByKills[0] || standings[0] || null
  }, [standings])

  const isChampionTopFragger = useMemo(() => {
    if (!championTeam || !mvpPlayer) return false
    return championTeam.team === mvpPlayer.team || championTeam.player === mvpPlayer.player
  }, [championTeam, mvpPlayer])

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

    const headers = [`Rank,Team,Captain,Kills,TotalPoints,${payoutCol}\n`]
    const rows = standings.map(
      (s) => `${s.rank},"${s.team}","${s.player}",${s.kills},${s.points},"${s.payout}"\n`
    )
    const blob = new Blob([...headers, ...rows], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `MJ_ESPORTS_${(activeTournament?.title || 'Standings').replace(/\s+/g, '_')}_2026.csv`
    a.click()
  }

  return (
    <div className="w-full min-h-screen bg-[#000000] text-[#A3A3A3] pb-6 sm:pb-8 font-body antialiased selection:bg-[#FFB900] selection:text-[#000000] overflow-x-hidden">
      <main className="max-w-7xl mx-auto pt-4 sm:pt-6 px-4 sm:px-6 lg:px-8 space-y-5 sm:space-y-6">
        
        {/* 1. HEADER & TOURNAMENT SELECTOR */}
        <header className="space-y-2.5 sm:space-y-3">
          <h1 className="font-headline text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white uppercase">
            RANKINGS
          </h1>

          {/* Tournament Selector Pills */}
          {tournamentsList.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pt-1">
              <span className="text-xs text-[#A3A3A3] font-headline font-bold uppercase shrink-0 mr-1">
                Event:
              </span>
              {tournamentsList.map((t) => {
                const isSelected = activeTournament?.id === t.id
                return (
                  <button
                    key={`tourn-tab-${t.id}`}
                    onClick={() => {
                      setSelectedTournamentId(t.id)
                      setChampionImgError(false)
                    }}
                    className={`px-3 py-1.5 rounded-none text-xs font-headline font-bold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                      isSelected
                        ? 'bg-[#FFB900] text-[#000000] font-extrabold shadow-[0_0_10px_rgba(255,185,0,0.3)]'
                        : 'bg-[#111318] text-[#A3A3A3] border border-[#2A2A30] hover:text-white hover:border-[#FFB900]/50'
                    }`}
                  >
                    {t.title || 'Tournament'}
                  </button>
                )
              })}
            </div>
          )}
        </header>

        {/* 2. CHAMPION SPOTLIGHT + COMPACT PRIZE MODEL */}
        {standings.length > 0 && championTeam && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            
            {/* Champion Card (Profile Avatar, No Crown, Compact Stat Bar) */}
            <div className="lg:col-span-2 bg-gradient-to-b from-[#FFB900]/15 via-[#1B1B1F] to-[#111318] rounded-none border border-[#FFB900]/40 p-4 sm:p-5 relative overflow-hidden shadow-[0_0_20px_rgba(255,185,0,0.12)] flex flex-col justify-between">
              
              {/* Top Badge Header Row */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-none bg-[#FFB900]/20 border border-[#FFB900]/40 text-[#FFB900] text-[11px] sm:text-xs font-headline font-bold uppercase tracking-wider">
                  <Trophy className="w-3.5 h-3.5 text-[#FFB900]" />
                  <span>CHAMPION</span>
                </div>
                
                {isChampionTopFragger ? (
                  <span className="px-2 py-0.5 rounded-none bg-[#FF6200]/15 border border-[#FF6200]/40 text-[#FF6200] text-[10.5px] sm:text-[11px] font-headline font-bold uppercase tracking-wider">
                    TOP FRAGGER &bull; MVP
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-none bg-[#1B1B1F] border border-[#2A2A30] text-[#A3A3A3] text-[10.5px] sm:text-[11px] font-headline font-bold uppercase">
                    RANK #1
                  </span>
                )}
              </div>

              {/* Centered Profile Avatar + Team & Player Info */}
              <div className="text-center my-1 sm:my-2">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-none bg-[#111318] border border-[#FFB900]/70 shadow-[0_0_12px_rgba(255,185,0,0.25)] mx-auto mb-2 overflow-hidden flex items-center justify-center">
                  {championTeam.avatar && !championImgError ? (
                    <img
                      src={championTeam.avatar}
                      alt={`${championTeam.player} avatar`}
                      className="w-full h-full rounded-none object-cover"
                      onError={() => setChampionImgError(true)}
                    />
                  ) : (
                    <User className="w-6 h-6 text-[#FFB900]" />
                  )}
                </div>

                <h2 className="font-headline text-xl sm:text-2xl font-extrabold text-white uppercase tracking-tight truncate max-w-full" title={championTeam.team}>
                  {championTeam.team}
                </h2>
                <p className="text-xs sm:text-sm text-[#FFB900] font-headline font-bold uppercase tracking-wider truncate max-w-full mt-0.5">
                  {championTeam.player}
                </p>
              </div>

              {/* Compact Professional Esports Stat Bar (3 columns) */}
              <div className="mt-3 pt-3 border-t border-[#2A2A30] grid grid-cols-3 gap-2 text-center bg-[#111318]/90 rounded-none p-2 border border-[#2A2A30]">
                <div className="border-r border-[#2A2A30] pr-1">
                  <span className="text-[15px] sm:text-[17px] font-headline font-extrabold text-[#FFB900] font-mono block leading-tight">
                    {championTeam.points} PTS
                  </span>
                  <span className="text-[9.5px] sm:text-[10px] text-[#A3A3A3] font-headline font-bold uppercase tracking-wider block mt-0.5">
                    SCORE
                  </span>
                </div>
                <div className="border-r border-[#2A2A30] px-1">
                  <span className="text-[15px] sm:text-[17px] font-headline font-extrabold text-white font-mono block leading-tight">
                    {championTeam.kills} KILLS
                  </span>
                  <span className="text-[9.5px] sm:text-[10px] text-[#A3A3A3] font-headline font-bold uppercase tracking-wider block mt-0.5">
                    FINISHES
                  </span>
                </div>
                <div className="pl-1">
                  <span className="text-[15px] sm:text-[17px] font-headline font-extrabold text-[#10b981] font-mono block leading-tight">
                    {championTeam.payout}
                  </span>
                  <span className="text-[9.5px] sm:text-[10px] text-[#A3A3A3] font-headline font-bold uppercase tracking-wider block mt-0.5">
                    EARNED
                  </span>
                </div>
              </div>

            </div>

            {/* Compact Secondary Prize Model Info Block */}
            <div className="lg:col-span-1 bg-[#111318] rounded-none border border-[#2A2A30] p-4 sm:p-5 flex flex-col justify-between shadow-md">
              <div>
                <span className="text-[10px] font-headline font-bold text-[#FFB900] uppercase tracking-widest block mb-1">
                  PRIZE MODEL
                </span>
                <h3 className="font-headline text-xl sm:text-2xl font-extrabold text-white uppercase tracking-tight">
                  {prizePoolSummary.totalFormatted}
                </h3>
                <p className="text-xs text-[#A3A3A3] font-mono mt-1">
                  {prizePoolSummary.secondFormatted}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-[#2A2A30] text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[#A3A3A3] font-headline">Distribution:</span>
                  <span className="text-white font-headline font-bold">
                    {prizePoolSummary.thirdFormatted}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#A3A3A3] font-headline">Per Kill Bounty:</span>
                  <span className="text-[#FF6200] font-mono font-bold">
                    {prizePoolSummary.firstFormatted}
                  </span>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* 3. TOP 3 SECTION (Clean Rank Badges, Open Slot support) */}
        {standings.length > 0 && (
          <section className="space-y-2.5">
            <h2 className="text-xs font-headline font-bold text-[#FFB900] uppercase tracking-widest">
              TOP 3
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
              {[0, 1, 2].map((idx) => {
                const rank = idx + 1
                const player = standings[idx] || null
                const rankColor =
                  rank === 1
                    ? 'border-[#FFB900] text-[#FFB900] bg-[#FFB900]/20'
                    : rank === 2
                    ? 'border-[#94a3b8] text-[#94a3b8] bg-[#94a3b8]/20'
                    : 'border-[#FF6200] text-[#FF6200] bg-[#FF6200]/20'
                const cardBorder =
                  rank === 1
                    ? 'border-[#FFB900]/40 bg-[#FFB900]/5 hover:border-[#FFB900]'
                    : rank === 2
                    ? 'border-[#94a3b8]/30 bg-[#94a3b8]/5 hover:border-[#94a3b8]'
                    : 'border-[#FF6200]/30 bg-[#FF6200]/5 hover:border-[#FF6200]'

                if (!player) {
                  return (
                    <div
                      key={`top3-slot-${rank}`}
                      className="p-3 sm:p-3.5 rounded-none bg-[#111318] border border-[#2A2A30] flex items-center justify-between gap-3 text-xs text-[#A3A3A3]"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-none border font-headline font-bold text-xs flex items-center justify-center shrink-0 ${rankColor}`}>
                          #{rank}
                        </div>
                        <span className="font-headline font-bold uppercase tracking-wider text-[#A3A3A3]">
                          OPEN SLOT
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-[#52525b]">---</span>
                    </div>
                  )
                }

                return (
                  <div
                    key={`top3-card-${player.team}-${rank}`}
                    onClick={() => setSelectedTeamModal(player)}
                    className={`p-3 sm:p-3.5 rounded-none border ${cardBorder} flex items-center justify-between gap-3 cursor-pointer transition-all active:scale-[0.99] group`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className={`w-7 h-7 rounded-none border font-headline font-bold text-xs flex items-center justify-center shrink-0 ${rankColor}`}>
                        #{rank}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`font-headline font-bold text-xs sm:text-sm truncate ${rank === 1 ? 'text-[#FFB900]' : 'text-white'}`} title={player.team}>
                          {player.team}
                        </p>
                        <p className="text-[11px] sm:text-xs text-[#A3A3A3] font-body truncate" title={player.player}>
                          {player.player}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-headline font-extrabold text-xs sm:text-sm text-white font-mono leading-tight">
                        {player.points} PTS
                      </p>
                      <p className="text-[11px] text-[#FF6200] font-mono mt-0.5">
                        {player.kills} Kills
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* 4. FULL STANDINGS — ALIGNED HEADER & COMPACT CARDS */}
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3 border-b border-[#2A2A30] pb-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <Swords className="w-4 h-4 text-[#FFB900] shrink-0" />
              <h2 className="font-headline text-base sm:text-lg font-extrabold text-white uppercase tracking-wider truncate">
                FULL STANDINGS
              </h2>
            </div>
            <span className="text-xs font-mono text-[#A3A3A3] shrink-0 text-right">
              {standings.length} {standings.length === 1 ? 'Team Registered' : 'Teams Registered'}
            </span>
          </div>

          {loading ? (
            <div className="p-4 bg-[#111318] rounded-none border border-[#2A2A30]">
              <TableSkeleton rows={4} />
            </div>
          ) : standings.length === 0 ? (
            <EmptyState type="leaderboard" sentence="No leaderboard data available for this event yet." />
          ) : (
            <div className="space-y-2">
              {standings.map((s) => {
                const isRank1 = s.rank === 1
                const isRank2 = s.rank === 2
                const isRank3 = s.rank === 3

                const rankColor = isRank1
                  ? 'border-[#FFB900] text-[#FFB900] bg-[#FFB900]/15'
                  : isRank2
                  ? 'border-[#94a3b8] text-[#94a3b8] bg-[#94a3b8]/15'
                  : isRank3
                  ? 'border-[#FF6200] text-[#FF6200] bg-[#FF6200]/15'
                  : 'border-[#2A2A30] text-[#A3A3A3] bg-[#1B1B1F]'

                return (
                  <div
                    key={`standings-card-${s.rank}-${s.team}`}
                    onClick={() => setSelectedTeamModal(s)}
                    className="p-3 sm:p-3.5 rounded-none bg-[#111318] border border-[#2A2A30] hover:border-[#FFB900]/60 hover:bg-[#1B1B1F] transition-all cursor-pointer shadow-sm group active:scale-[0.99]"
                  >
                    {/* Compact 2-line ranking card (Mobile) / Horizontal flex layout (Desktop) */}
                    <div className="flex items-center justify-between gap-3">
                      
                      {/* Left: Rank & Team / Player Info */}
                      <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 flex-1">
                        <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-none border font-headline font-bold text-xs sm:text-sm flex items-center justify-center shrink-0 ${rankColor}`}>
                          #{s.rank}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`font-headline font-bold text-xs sm:text-sm truncate ${isRank1 ? 'text-[#FFB900]' : 'text-white'}`} title={s.team}>
                              {s.team}
                            </span>
                          </div>
                          <p className="text-[11px] sm:text-xs text-[#A3A3A3] font-body truncate mt-0.5" title={s.player}>
                            {s.player}
                          </p>
                        </div>
                      </div>

                      {/* Right: Points, Kills & Prize */}
                      <div className="text-right shrink-0 flex items-center gap-3 sm:gap-6">
                        <div className="text-right">
                          <span className="font-headline font-extrabold text-xs sm:text-sm text-white font-mono block leading-tight">
                            {s.points} PTS
                          </span>
                          <span className="text-[11px] text-[#FF6200] font-mono block mt-0.5">
                            {s.kills} Kills
                          </span>
                        </div>

                        <div className="min-w-[55px] sm:min-w-[75px] text-right">
                          <span className={`font-headline font-bold text-xs sm:text-sm block font-mono ${
                            isRank1 ? 'text-[#FFB900]' : isRank2 ? 'text-[#94a3b8]' : isRank3 ? 'text-[#FF6200]' : 'text-[#A3A3A3]'
                          }`}>
                            {s.payout}
                          </span>
                        </div>
                      </div>

                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* 5. DOWNLOAD FULL CSV BUTTON (At Bottom of Content) */}
        {standings.length > 0 && (
          <div className="pt-4 sm:pt-6 pb-2 flex items-center justify-center">
            <button
              onClick={handleDownloadCsv}
              className="text-xs font-headline font-bold text-[#FFB900] hover:text-[#000000] hover:bg-[#FFB900] transition-all flex items-center justify-center gap-2 bg-[#111318] px-5 py-2.5 rounded-none border border-[#2A2A30] hover:border-[#FFB900] cursor-pointer uppercase tracking-wider min-h-[44px] shadow-sm select-none active:scale-95 group"
            >
              <Download className="w-4 h-4 shrink-0 transition-transform group-hover:-translate-y-0.5" />
              <span>Download Full CSV</span>
            </button>
          </div>
        )}

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
