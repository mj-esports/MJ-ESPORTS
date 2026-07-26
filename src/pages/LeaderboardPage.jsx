import { useState, useEffect, useCallback, useMemo } from 'react'
import { Trophy, Award, Shield, User, RefreshCw, AlertCircle, Sparkles, Gamepad2, CheckCircle2, TrendingUp, Filter } from 'lucide-react'
import { supabase, isSupabaseConfigured } from '../lib/supabase.js'

export default function LeaderboardPage() {
  const [tournamentsList, setTournamentsList] = useState([])
  const [selectedGameFilter, setSelectedGameFilter] = useState('ALL GAMES')
  const [selectedSeasonFilter, setSelectedSeasonFilter] = useState('SEASON 2026')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Fetch live tournaments data from Supabase
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      if (isSupabaseConfigured) {
        const { data, error: err } = await supabase
          .from('tournaments')
          .select('*')
          .order('created_at', { ascending: false })

        if (err) throw err
        setTournamentsList(data || [])
      } else {
        setTournamentsList([])
      }
    } catch (err) {
      console.error('[Leaderboard Fetch Error]:', err)
      setError('Failed to fetch latest rankings. Please check network connection.')
    } finally {
      setLoading(false)
    }
  }, [])

  // Auto update realtime listener
  useEffect(() => {
    fetchData()

    if (isSupabaseConfigured) {
      const channel = supabase
        .channel('stitch_leaderboard_realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'tournaments' },
          () => fetchData()
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'tournament_registrations' },
          () => fetchData()
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [fetchData])

  // Filter tournaments by selected game filter
  const filteredTournaments = useMemo(() => {
    if (selectedGameFilter === 'ALL GAMES') return tournamentsList
    return tournamentsList.filter((t) =>
      (t.game || '').toLowerCase().includes(selectedGameFilter.toLowerCase().replace(/\s+/g, ''))
    )
  }, [tournamentsList, selectedGameFilter])

  // Aggregate Team Rankings
  const teamRankings = useMemo(() => {
    const teamStats = {}

    filteredTournaments.forEach((t) => {
      const gameTitle = t.game || 'Free Fire'
      const teams = Array.isArray(t.teams_list) ? t.teams_list : (Array.isArray(t.teamsList) ? t.teamsList : [])

      teams.forEach((team) => {
        const teamName = team.name || team.team || 'Squad'
        const teamKills = Number(team.kills || team.finishes || 0)
        const teamPoints = Number(team.points || team.score || 0)
        const isWinner = team.rank === 1 || team.position === 1

        if (!teamStats[teamName]) {
          teamStats[teamName] = {
            team: teamName,
            game: gameTitle,
            matches: 0,
            wins: 0,
            points: 0,
            kills: 0,
            avatar: team.avatar || null,
          }
        }
        teamStats[teamName].matches += 1
        if (isWinner) teamStats[teamName].wins += 1
        teamStats[teamName].points += teamPoints
        teamStats[teamName].kills += teamKills
      })
    })

    return Object.values(teamStats)
      .sort((a, b) => b.points - a.points || b.wins - a.wins || b.kills - a.kills)
      .map((item, index) => {
        const winRatio = item.matches > 0 ? (item.wins / item.matches) * 100 : 0
        return {
          ...item,
          rank: index + 1,
          winRate: `${Math.round(winRatio)}%`,
          prizeWon: item.wins > 0 ? `₹${(item.wins * 5000).toLocaleString()}` : '₹0',
        }
      })
  }, [filteredTournaments])

  // Aggregate Season MVP Players
  const mvpPlayers = useMemo(() => {
    const playerMap = {}

    filteredTournaments.forEach((t) => {
      const gameTitle = t.game || 'Free Fire'
      const teams = Array.isArray(t.teams_list) ? t.teams_list : (Array.isArray(t.teamsList) ? t.teamsList : [])

      teams.forEach((team) => {
        const playerName = team.captain || team.player || team.name || 'Player'
        const teamName = team.name || team.team || 'Squad'
        const kills = Number(team.kills || team.finishes || 0)

        if (playerName) {
          if (!playerMap[playerName]) {
            playerMap[playerName] = {
              player: playerName,
              team: teamName,
              game: gameTitle,
              kills: 0,
              matches: 0,
              role: kills > 10 ? 'SLAYER' : kills > 5 ? 'SNIPER' : 'IGL',
            }
          }
          playerMap[playerName].matches += 1
          playerMap[playerName].kills += kills > 0 ? kills : 1
        }
      })
    })

    return Object.values(playerMap)
      .sort((a, b) => b.kills - a.kills || a.matches - b.matches)
      .slice(0, 4)
      .map((p, index) => {
        const kd = (p.kills / (p.matches || 1)).toFixed(1)
        const winPct = Math.round((p.kills / (p.kills + 5)) * 100)
        return {
          ...p,
          rank: index + 1,
          kd,
          winPct: `${winPct}%`,
          hsPct: `${Math.min(92, 40 + p.kills * 2)}%`,
        }
      })
  }, [filteredTournaments])

  // Hall of Fame Top 3 (1st, 2nd, 3rd)
  const rank1 = teamRankings[0] || null
  const rank2 = teamRankings[1] || null
  const rank3 = teamRankings[2] || null

  // Total Prize Pool Sum
  const totalPrizePoolSum = useMemo(() => {
    let sum = 0
    tournamentsList.forEach((t) => {
      const val = parseInt((t.prize_pool || '0').replace(/[^0-9]/g, ''), 10)
      if (!isNaN(val)) sum += val
    })
    return sum > 0 ? `₹${sum.toLocaleString()}` : '₹0'
  }, [tournamentsList])

  const totalMatchesCount = useMemo(() => {
    return tournamentsList.reduce((acc, t) => acc + (t.teams_list?.length || 0), 0)
  }, [tournamentsList])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-12">
      
      {/* 1. HALL OF FAME: Hero Section with Podium */}
      <section className="relative">
        <header className="relative z-10 text-center mb-10 space-y-2">
          <h1 className="font-display-lg text-3xl sm:text-5xl md:text-6xl font-extrabold uppercase tracking-[0.15em] text-[#00f2ff] leading-none drop-shadow-[0_0_25px_rgba(0,242,255,0.4)]">
            HALL OF FAME
          </h1>
          <p className="font-mono text-xs sm:text-sm text-[#fe6b00] font-bold tracking-[0.3em] uppercase">
            SEASON 2026 &bull; THE ASCENSION
          </p>
        </header>

        {error && (
          <div className="mb-6 p-4 bg-red-950/60 border border-[#ff3366] rounded-xl flex items-center justify-between gap-3 text-[#ff3366] text-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={fetchData}
              className="px-3 py-1.5 bg-[#07090c] border border-[#3a494b] text-white rounded hover:text-[#00f2ff] flex items-center gap-1 font-bold uppercase"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* Podium Area */}
        <div className="relative z-10 flex flex-col md:flex-row justify-center items-end gap-6 md:gap-8 min-h-[380px] pt-4">
          
          {/* Rank 2 Podium Card (Left) */}
          <div className="w-full md:w-1/3 flex flex-col items-center order-2 md:order-1">
            <div className="w-20 h-20 sm:w-24 sm:h-24 overflow-hidden border-2 border-[#00f2ff]/50 mb-4 bg-[#151a21] rotate-45 shadow-[0_0_25px_rgba(0,242,255,0.3)] flex items-center justify-center shrink-0">
              <div className="-rotate-45 w-full h-full flex items-center justify-center bg-[#07090c]">
                {rank2?.avatar ? (
                  <img src={rank2.avatar} alt={rank2.team} className="w-full h-full object-cover" />
                ) : (
                  <Shield className="w-8 h-8 text-[#00f2ff]" />
                )}
              </div>
            </div>

            <div className="w-full h-32 sm:h-36 bg-[#151a21]/90 backdrop-blur-md border border-[#00f2ff]/30 rounded-t-xl flex flex-col items-center justify-center p-4 text-center">
              <span className="text-[10px] font-mono font-extrabold text-[#00f2ff] bg-[#00f2ff]/10 px-2.5 py-0.5 rounded border border-[#00f2ff]/30 uppercase tracking-widest mb-1">
                2ND PLACE
              </span>
              <h3 className="font-display-lg text-lg sm:text-xl font-bold text-white uppercase tracking-tight truncate max-w-full">
                {rank2 ? rank2.team : 'Contender'}
              </h3>
              <p className="font-mono text-xs font-bold text-[#b9cacb] mt-1">
                {rank2 ? `${rank2.points} PTS` : '0 PTS'}
              </p>
            </div>
            <div className="w-full h-3 bg-[#00f2ff]/20 blur-sm rounded-b-xl"></div>
          </div>

          {/* Rank 1: Grand Champion Podium Card (Center, Elevated) */}
          <div className="w-full md:w-1/3 flex flex-col items-center transform md:-translate-y-8 order-1 md:order-2">
            <div className="flex items-center justify-center gap-1.5 mb-2 text-[#fe6b00] animate-bounce">
              <Trophy className="w-8 h-8 text-[#fe6b00]" />
              <span className="font-display-lg text-xs font-extrabold uppercase tracking-widest text-[#fe6b00]">CHAMPION</span>
            </div>

            <div className="w-28 h-28 sm:w-32 sm:h-32 overflow-hidden border-2 border-[#fe6b00] mb-4 bg-[#151a21] rotate-45 shadow-[0_0_35px_rgba(254,107,0,0.4)] flex items-center justify-center shrink-0">
              <div className="-rotate-45 w-full h-full flex items-center justify-center bg-[#07090c]">
                {rank1?.avatar ? (
                  <img src={rank1.avatar} alt={rank1.team} className="w-full h-full object-cover" />
                ) : (
                  <Trophy className="w-10 h-10 text-[#fe6b00]" />
                )}
              </div>
            </div>

            <div className="w-full h-44 sm:h-48 bg-[#151a21]/95 backdrop-blur-md border-2 border-[#fe6b00] rounded-t-xl flex flex-col items-center justify-center p-5 text-center shadow-[0_0_40px_rgba(254,107,0,0.2)]">
              <span className="text-xs font-mono font-extrabold text-slate-950 bg-[#fe6b00] px-3 py-1 rounded uppercase tracking-widest mb-1 shadow-md">
                GRAND CHAMPION
              </span>
              <h3 className="font-display-lg text-xl sm:text-2xl font-extrabold text-white uppercase tracking-tight truncate max-w-full">
                {rank1 ? rank1.team : 'Grand Champion'}
              </h3>
              <p className="font-mono text-sm font-extrabold text-[#ffb693] mt-1">
                {rank1 ? `${rank1.points} PTS` : '0 PTS'}
              </p>
            </div>
            <div className="w-full h-5 bg-[#fe6b00]/30 blur-md rounded-b-xl"></div>
          </div>

          {/* Rank 3 Podium Card (Right) */}
          <div className="w-full md:w-1/3 flex flex-col items-center order-3 md:order-3">
            <div className="w-20 h-20 sm:w-24 sm:h-24 overflow-hidden border-2 border-[#ffe173]/50 mb-4 bg-[#151a21] rotate-45 shadow-[0_0_20px_rgba(255,225,115,0.2)] flex items-center justify-center shrink-0">
              <div className="-rotate-45 w-full h-full flex items-center justify-center bg-[#07090c]">
                {rank3?.avatar ? (
                  <img src={rank3.avatar} alt={rank3.team} className="w-full h-full object-cover" />
                ) : (
                  <Shield className="w-8 h-8 text-[#ffe173]" />
                )}
              </div>
            </div>

            <div className="w-full h-28 sm:h-32 bg-[#151a21]/90 backdrop-blur-md border border-[#3a494b] rounded-t-xl flex flex-col items-center justify-center p-4 text-center">
              <span className="text-[10px] font-mono font-extrabold text-[#ffe173] bg-[#ffe173]/10 px-2.5 py-0.5 rounded border border-[#ffe173]/30 uppercase tracking-widest mb-1">
                3RD PLACE
              </span>
              <h3 className="font-display-lg text-base sm:text-lg font-bold text-white uppercase tracking-tight truncate max-w-full">
                {rank3 ? rank3.team : 'Contender'}
              </h3>
              <p className="font-mono text-xs font-bold text-[#b9cacb] mt-1">
                {rank3 ? `${rank3.points} PTS` : '0 PTS'}
              </p>
            </div>
            <div className="w-full h-3 bg-[#ffe173]/10 blur-sm rounded-b-xl"></div>
          </div>

        </div>
      </section>

      {/* 2. STATS WIDGETS */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#151a21] border-l-4 border-[#00f2ff] border border-[#3a494b]/60 rounded-r-xl p-5 space-y-1 shadow-xl">
          <span className="font-mono text-[10px] text-[#8e9dae] uppercase tracking-widest block">Global Avg K/D</span>
          <div className="font-display-lg text-2xl sm:text-3xl font-extrabold text-[#00f2ff] tracking-tight flex items-center justify-between">
            <span>{mvpPlayers.length > 0 ? (mvpPlayers.reduce((a, b) => a + Number(b.kd), 0) / mvpPlayers.length).toFixed(2) : '1.84'}</span>
            <span className="text-xs font-mono text-[#00ff9d] bg-[#00ff9d]/10 px-2 py-0.5 rounded border border-[#00ff9d]/30 font-bold">+12%</span>
          </div>
        </div>

        <div className="bg-[#151a21] border-l-4 border-[#fe6b00] border border-[#3a494b]/60 rounded-r-xl p-5 space-y-1 shadow-xl">
          <span className="font-mono text-[10px] text-[#8e9dae] uppercase tracking-widest block">Total Prize Pool</span>
          <div className="font-display-lg text-2xl sm:text-3xl font-extrabold text-[#ffb693] tracking-tight">
            {totalPrizePoolSum}
          </div>
        </div>

        <div className="bg-[#151a21] border-l-4 border-[#00f2ff] border border-[#3a494b]/60 rounded-r-xl p-5 space-y-1 shadow-xl">
          <span className="font-mono text-[10px] text-[#8e9dae] uppercase tracking-widest block">Total Matches Recorded</span>
          <div className="font-display-lg text-2xl sm:text-3xl font-extrabold text-[#00f2ff] tracking-tight">
            {totalMatchesCount}
          </div>
        </div>
      </section>

      {/* 3. SEASON MVP'S */}
      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-[#3a494b]/60 pb-3">
          <h2 className="font-display-lg text-xl sm:text-2xl font-extrabold text-[#00f2ff] uppercase tracking-wider flex items-center gap-2">
            <Award className="w-6 h-6 text-[#00f2ff]" />
            <span>SEASON MVP'S</span>
          </h2>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={`skel-mvp-stitch-${i}`} className="h-56 bg-[#151a21] border border-[#3a494b]/40 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : mvpPlayers.length === 0 ? (
          <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-8 text-center text-[#8e9dae] space-y-2">
            <User className="w-10 h-10 text-[#8e9dae] mx-auto opacity-40" />
            <h3 className="font-display-lg text-base font-bold text-white uppercase">
              No MVP rankings available yet.
            </h3>
            <p className="text-xs text-[#8e9dae]">
              Participate in tournaments to appear on the leaderboard.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {mvpPlayers.map((mvp) => (
              <div
                key={`mvp-card-${mvp.player}`}
                className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl overflow-hidden group hover:border-[#00f2ff] hover:shadow-[0_0_20px_rgba(0,242,255,0.25)] transition-all duration-300 flex flex-col justify-between"
              >
                <div className="h-28 bg-[#07090c] relative overflow-hidden">
                  <div className="w-full h-full bg-cover bg-center opacity-40 group-hover:opacity-60 transition-opacity bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#00f2ff]/30 via-transparent to-transparent" />
                  <div className="absolute bottom-2 left-2 bg-[#00f2ff] text-[#00363a] font-mono text-[10px] px-2.5 py-0.5 font-extrabold tracking-widest rounded uppercase">
                    {mvp.role}
                  </div>
                  <span className="absolute top-2 right-2 font-mono text-[10px] font-bold text-[#fe6b00] bg-[#07090c]/80 border border-[#fe6b00]/40 px-2 py-0.5 rounded">
                    Rank #{mvp.rank}
                  </span>
                </div>

                <div className="p-5 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-display-lg text-lg font-extrabold text-white">{mvp.player}</h4>
                      <p className="text-xs text-[#8e9dae] font-semibold">{mvp.team}</p>
                    </div>
                    <CheckCircle2 className="w-4 h-4 text-[#00f2ff] shrink-0 mt-1" />
                  </div>

                  <div className="grid grid-cols-3 gap-1 text-center border-y border-[#3a494b]/60 py-3 font-mono">
                    <div>
                      <span className="text-[9px] text-[#8e9dae] font-bold uppercase block">K/D</span>
                      <span className="text-sm font-extrabold text-[#00f2ff]">{mvp.kd}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-[#8e9dae] font-bold uppercase block">Kills</span>
                      <span className="text-sm font-extrabold text-white">{mvp.kills}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-[#8e9dae] font-bold uppercase block">Win %</span>
                      <span className="text-sm font-extrabold text-[#00ff9d]">{mvp.winPct}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 4. GLOBAL RANKING TABLE */}
      <section className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h3 className="font-display-lg text-xl sm:text-2xl font-extrabold uppercase text-[#00f2ff] tracking-wider flex items-center gap-2">
            <Trophy className="w-6 h-6 text-[#00f2ff]" />
            <span>GLOBAL RANKING</span>
          </h3>

          {/* Interactive Game & Season Filter Selectors */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <select
              value={selectedGameFilter}
              onChange={(e) => setSelectedGameFilter(e.target.value)}
              className="bg-[#151a21] border border-[#3a494b] text-[#e1e2e7] font-mono text-xs py-2 px-3 rounded focus:outline-none focus:border-[#00f2ff] font-bold uppercase"
            >
              <option value="ALL GAMES">ALL GAMES</option>
              <option value="FREE FIRE">FREE FIRE</option>
              <option value="BGMI">BGMI</option>
            </select>

            <select
              value={selectedSeasonFilter}
              onChange={(e) => setSelectedSeasonFilter(e.target.value)}
              className="bg-[#151a21] border border-[#3a494b] text-[#e1e2e7] font-mono text-xs py-2 px-3 rounded focus:outline-none focus:border-[#00f2ff] font-bold uppercase"
            >
              <option value="SEASON 2026">SEASON 2026</option>
              <option value="ALL TIME">ALL TIME</option>
            </select>
          </div>
        </div>

        <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl overflow-hidden shadow-2xl">
          {loading ? (
            <div className="space-y-3 p-6">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={`skel-row-${i}`} className="h-12 bg-[#07090c] border border-[#3a494b]/40 rounded animate-pulse" />
              ))}
            </div>
          ) : teamRankings.length === 0 ? (
            <div className="p-12 text-center text-[#8e9dae] space-y-3">
              <Trophy className="w-12 h-12 text-[#8e9dae] mx-auto opacity-40" />
              <div className="space-y-1">
                <h3 className="font-display-lg text-base sm:text-lg font-bold text-white uppercase">
                  No leaderboard available yet.
                </h3>
                <p className="text-xs text-[#8e9dae]">
                  Participate in tournaments to appear on the leaderboard.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#07090c] border-b border-[#3a494b]/60 font-mono text-xs text-[#00f2ff] uppercase tracking-wider">
                      <th className="px-6 py-4">#</th>
                      <th className="px-6 py-4">Player / Team</th>
                      <th className="px-6 py-4">Game</th>
                      <th className="px-6 py-4 text-center">Points</th>
                      <th className="px-6 py-4 text-center">Matches</th>
                      <th className="px-6 py-4 text-center">Wins</th>
                      <th className="px-6 py-4 text-center">Win Rate</th>
                      <th className="px-6 py-4 text-right pr-6">Trend</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#3a494b]/40 font-mono text-xs">
                    {teamRankings.map((team) => (
                      <tr key={`stitch-rank-${team.rank}`} className="hover:bg-[#1d232c] transition-colors">
                        <td className="px-6 py-4">
                          <div
                            className={`w-7 h-7 flex items-center justify-center font-extrabold rounded text-xs ${
                              team.rank === 1
                                ? 'bg-[#fe6b00] text-slate-950 shadow-[0_0_12px_rgba(254,107,0,0.5)]'
                                : team.rank === 2
                                ? 'bg-[#00f2ff] text-[#00363a] shadow-[0_0_12px_rgba(0,242,255,0.4)]'
                                : team.rank === 3
                                ? 'bg-[#ffe173] text-[#221b00]'
                                : 'bg-[#07090c] text-[#8e9dae] border border-[#3a494b]'
                            }`}
                          >
                            {team.rank}
                          </div>
                        </td>
                        <td className="px-6 py-4 font-sans font-bold text-white">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full overflow-hidden border border-[#00f2ff]/30 bg-[#07090c] flex items-center justify-center shrink-0">
                              {team.avatar ? (
                                <img src={team.avatar} alt={team.team} className="w-full h-full object-cover" />
                              ) : (
                                <Shield className="w-4 h-4 text-[#00f2ff]" />
                              )}
                            </div>
                            <span className="text-white hover:text-[#00f2ff] transition-colors">{team.team}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-sans font-semibold text-[#00f2ff]">
                          <span className="inline-flex items-center gap-1">
                            <Gamepad2 className="w-3.5 h-3.5" />
                            {team.game}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center font-extrabold text-white">{team.points}</td>
                        <td className="px-6 py-4 text-center text-[#e1e2e7] font-bold">{team.matches}</td>
                        <td className="px-6 py-4 text-center text-[#00ff9d] font-bold">{team.wins}</td>
                        <td className="px-6 py-4 text-center text-[#00f2ff] font-bold">{team.winRate}</td>
                        <td className="px-6 py-4 text-right pr-6">
                          <TrendingUp className="w-4 h-4 text-[#00f2ff] ml-auto" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile View */}
              <div className="block md:hidden space-y-4 p-4">
                {teamRankings.map((team) => (
                  <div
                    key={`stitch-mobile-rank-${team.rank}`}
                    className="bg-[#07090c] border border-[#3a494b]/60 rounded-xl p-4 space-y-3 shadow-lg"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-7 h-7 flex items-center justify-center font-mono font-extrabold rounded text-xs ${
                            team.rank === 1
                              ? 'bg-[#fe6b00] text-slate-950'
                              : team.rank === 2
                              ? 'bg-[#00f2ff] text-[#00363a]'
                              : team.rank === 3
                              ? 'bg-[#ffe173] text-[#221b00]'
                              : 'bg-[#151a21] text-[#8e9dae] border border-[#3a494b]'
                          }`}
                        >
                          #{team.rank}
                        </div>
                        <div>
                          <h4 className="font-bold text-white text-sm">{team.team}</h4>
                          <span className="text-[10px] font-semibold text-[#00f2ff]">{team.game}</span>
                        </div>
                      </div>
                      <span className="font-mono text-sm font-extrabold text-white">{team.points} pts</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-[11px] pt-2 border-t border-[#3a494b]/40 font-mono">
                      <div className="bg-[#151a21] p-1.5 rounded border border-[#3a494b]/40">
                        <span className="text-[9px] text-[#8e9dae] block">MATCHES</span>
                        <span className="font-bold text-white">{team.matches}</span>
                      </div>
                      <div className="bg-[#151a21] p-1.5 rounded border border-[#3a494b]/40">
                        <span className="text-[9px] text-[#8e9dae] block">WINS</span>
                        <span className="font-bold text-[#00ff9d]">{team.wins}</span>
                      </div>
                      <div className="bg-[#151a21] p-1.5 rounded border border-[#3a494b]/40">
                        <span className="text-[9px] text-[#8e9dae] block">WIN RATE</span>
                        <span className="font-bold text-[#00f2ff]">{team.winRate}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

    </div>
  )
}
