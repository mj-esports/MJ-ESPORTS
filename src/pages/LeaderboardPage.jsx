import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react'
import { Trophy, Shield, User, RefreshCw, AlertCircle, Gamepad2, TrendingUp, Sparkles } from 'lucide-react'
import { supabase, isSupabaseConfigured } from '../lib/supabase.js'
import { TableSkeleton } from '../components/common/SkeletonLoader.jsx'
import EmptyState from '../components/common/EmptyState.jsx'

const PublicTeamProfileModal = lazy(() => import('../components/team/PublicTeamProfileModal.jsx'))

export default function LeaderboardPage() {
  const [tournamentsList, setTournamentsList] = useState([])
  const [selectedGameFilter, setSelectedGameFilter] = useState('ALL GAMES')
  const [selectedTeamModal, setSelectedTeamModal] = useState(null)
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

        if (err) {
          console.warn('[Leaderboard Supabase Fetch Notice]:', err.message)
          setTournamentsList([])
        } else {
          setTournamentsList(data || [])
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

  // Aggregate Top 50 Players / Teams Rankings
  const top50Rankings = useMemo(() => {
    const statsMap = {}

    filteredTournaments.forEach((t) => {
      const gameTitle = t.game || 'Free Fire'
      const teams = Array.isArray(t.teams_list) ? t.teams_list : (Array.isArray(t.teamsList) ? t.teamsList : [])

      teams.forEach((team) => {
        const name = team.captain || team.player || team.name || team.team || 'Player'
        const squad = team.name || team.team || 'Squad'
        const kills = Number(team.kills || team.finishes || 0)
        const points = Number(team.points || team.score || 0)
        const isWinner = team.rank === 1 || team.position === 1

        if (!statsMap[name]) {
          statsMap[name] = {
            player: name,
            team: squad,
            game: gameTitle,
            matches: 0,
            wins: 0,
            points: 0,
            kills: 0,
            avatar: team.avatar || null,
          }
        }
        statsMap[name].matches += 1
        if (isWinner) statsMap[name].wins += 1
        statsMap[name].points += points
        statsMap[name].kills += kills
      })
    })

    return Object.values(statsMap)
      .sort((a, b) => b.points - a.points || b.wins - a.wins || b.kills - a.kills)
      .slice(0, 50)
      .map((item, index) => {
        const winRatio = item.matches > 0 ? (item.wins / item.matches) * 100 : 0
        const kd = (item.kills / (item.matches || 1)).toFixed(1)
        return {
          ...item,
          rank: index + 1,
          kd,
          winRate: `${Math.round(winRatio)}%`,
        }
      })
  }, [filteredTournaments])

  // Top 3 Podium Winners
  const rank1 = top50Rankings[0] || null
  const rank2 = top50Rankings[1] || null
  const rank3 = top50Rankings[2] || null

  // Derive Season Telemetry Stats
  const seasonStats = useMemo(() => {
    let totalPrize = 0
    let totalMatches = 0
    tournamentsList.forEach((t) => {
      const val = parseInt((t.prize_pool || t.prizePool || '0').replace(/[^0-9]/g, ''), 10)
      if (!isNaN(val)) totalPrize += val
      totalMatches += (t.teams_list?.length || 1)
    })

    const avgKd = top50Rankings.length > 0
      ? (top50Rankings.reduce((acc, p) => acc + Number(p.kd), 0) / top50Rankings.length).toFixed(2)
      : '1.85'

    return {
      avgKd,
      totalPrize: totalPrize > 0 ? `₹${totalPrize.toLocaleString()}` : '₹50,000+',
      totalMatches: totalMatches || 24,
      totalPlayers: top50Rankings.length || 50,
    }
  }, [tournamentsList, top50Rankings])

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 space-y-3.5 isolate relative">

      {/* 1. COMPACT 1-LINE HEADER */}
      <div className="flex items-center justify-between border-b border-[#3a494b]/40 pb-2">
        <h1 className="font-display-lg text-lg font-extrabold text-white uppercase tracking-tight flex items-center gap-2">
          <Trophy className="w-4 h-4 text-[#00f2ff]" />
          <span>LEADERBOARD</span>
        </h1>
        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-extrabold bg-[#00f2ff]/10 text-[#00f2ff] border border-[#00f2ff]/30 uppercase">
          SEASON 2026
        </span>
      </div>

      {/* 1. TOP 3 PODIUM (Visible Immediately) */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4 items-end pt-1">
        {/* 2nd Place */}
        <div className="bg-[#151a21] border border-[#00f2ff]/30 rounded-xl p-2.5 text-center space-y-1 flex flex-col items-center justify-between min-h-[120px]">
          <span className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase bg-[#00f2ff]/10 text-[#00f2ff] border border-[#00f2ff]/30">
            2ND PLACE
          </span>
          <div className="w-8 h-8 rounded-full bg-[#07090c] border border-[#00f2ff] flex items-center justify-center font-extrabold text-white text-xs overflow-hidden">
            {rank2?.avatar ? <img src={rank2.avatar} alt={rank2.player} className="w-full h-full object-cover" decoding="async" loading="lazy" /> : '2'}
          </div>
          <div>
            <h4 className="font-extrabold text-white text-xs truncate max-w-[85px] sm:max-w-none">{rank2 ? rank2.player : 'Contender'}</h4>
            <span className="font-mono text-[10px] text-[#00f2ff] font-bold">{rank2 ? `${rank2.points} PTS` : '0 PTS'}</span>
          </div>
        </div>

        {/* 1st Place (Grand Champion) */}
        <div className="bg-[#151a21] border-2 border-[#fe6b00] rounded-xl p-3 text-center space-y-1.5 flex flex-col items-center justify-between min-h-[145px] shadow-[0_0_15px_rgba(254,107,0,0.2)] relative -translate-y-1">
          <span className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase bg-[#fe6b00] text-slate-950 shadow-sm">
            CHAMPION 🥇
          </span>
          <div className="w-10 h-10 rounded-full bg-[#07090c] border-2 border-[#fe6b00] flex items-center justify-center font-extrabold text-[#fe6b00] text-sm overflow-hidden shadow-md">
            {rank1?.avatar ? <img src={rank1.avatar} alt={rank1.player} className="w-full h-full object-cover" decoding="async" loading="lazy" /> : <Trophy className="w-4 h-4 text-[#fe6b00]" />}
          </div>
          <div>
            <h4 className="font-extrabold text-white text-xs sm:text-sm truncate max-w-[95px] sm:max-w-none">{rank1 ? rank1.player : 'Grand Champion'}</h4>
            <span className="font-mono text-xs text-[#ffb693] font-extrabold">{rank1 ? `${rank1.points} PTS` : '0 PTS'}</span>
          </div>
        </div>

        {/* 3rd Place */}
        <div className="bg-[#151a21] border border-[#ffe173]/30 rounded-xl p-2.5 text-center space-y-1 flex flex-col items-center justify-between min-h-[120px]">
          <span className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase bg-[#ffe173]/10 text-[#ffe173] border border-[#ffe173]/30">
            3RD PLACE
          </span>
          <div className="w-8 h-8 rounded-full bg-[#07090c] border border-[#ffe173] flex items-center justify-center font-extrabold text-white text-xs overflow-hidden">
            {rank3?.avatar ? <img src={rank3.avatar} alt={rank3.player} className="w-full h-full object-cover" decoding="async" loading="lazy" /> : '3'}
          </div>
          <div>
            <h4 className="font-extrabold text-white text-xs truncate max-w-[85px] sm:max-w-none">{rank3 ? rank3.player : 'Contender'}</h4>
            <span className="font-mono text-[10px] text-[#ffe173] font-bold">{rank3 ? `${rank3.points} PTS` : '0 PTS'}</span>
          </div>
        </div>
      </div>

      {/* 2. TOP 50 PLAYERS RANKING TABLE (Immediately Below Podium Above Fold) */}
      <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl overflow-hidden shadow-xl cv-auto">
        <div className="p-3 bg-[#07090c] border-b border-[#3a494b]/60 flex items-center justify-between">
          <h3 className="font-display-lg text-xs sm:text-sm font-extrabold uppercase text-[#00f2ff] tracking-wider flex items-center gap-2">
            <Trophy className="w-4 h-4 text-[#00f2ff]" />
            <span>TOP 50 PLAYERS RANKINGS</span>
          </h3>
          {/* Compact Game Filter Dropdown inline */}
          <select
            value={selectedGameFilter}
            onChange={(e) => setSelectedGameFilter(e.target.value)}
            className="bg-[#151a21] border border-[#3a494b] text-[#00f2ff] font-mono text-[11px] py-1 px-2.5 rounded-lg focus:outline-none focus:border-[#00f2ff] font-bold uppercase"
          >
            <option value="ALL GAMES">ALL GAMES</option>
            <option value="FREE FIRE">FREE FIRE</option>
            <option value="BGMI">BGMI</option>
          </select>
        </div>

        {loading ? (
          <div className="p-4">
            <TableSkeleton rows={8} />
          </div>
        ) : top50Rankings.length === 0 ? (
          <EmptyState type="leaderboard" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#07090c] border-b border-[#3a494b]/60 font-mono text-[10px] sm:text-xs text-[#00f2ff] uppercase">
                  <th className="px-3 sm:px-4 py-2.5">#</th>
                  <th className="px-3 sm:px-4 py-2.5">Player / Squad</th>
                  <th className="px-3 sm:px-4 py-2.5">Game</th>
                  <th className="px-3 sm:px-4 py-2.5 text-center">Points</th>
                  <th className="px-3 sm:px-4 py-2.5 text-center">Matches</th>
                  <th className="px-3 sm:px-4 py-2.5 text-center">K/D</th>
                  <th className="px-3 sm:px-4 py-2.5 text-right pr-4">Win Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#3a494b]/40 font-mono text-xs">
                {top50Rankings.map((p) => (
                  <tr
                    key={`top50-rank-${p.rank}`}
                    onClick={() => setSelectedTeamModal(p)}
                    className="hover:bg-[#1d232c] transition-colors cursor-pointer"
                  >
                    <td className="px-3 sm:px-4 py-3">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded text-[11px] font-extrabold ${
                        p.rank === 1 ? 'bg-[#fe6b00] text-slate-950' : p.rank === 2 ? 'bg-[#00f2ff] text-[#00363a]' : p.rank === 3 ? 'bg-[#ffe173] text-slate-950' : 'bg-[#07090c] text-[#8e9dae]'
                      }`}>
                        {p.rank}
                      </span>
                    </td>
                    <td className="px-3 sm:px-4 py-3 font-sans font-bold text-white">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[#07090c] border border-[#00f2ff]/30 overflow-hidden flex items-center justify-center shrink-0">
                          {p.avatar ? <img src={p.avatar} alt={p.player} className="w-full h-full object-cover" /> : <User className="w-3 h-3 text-[#00f2ff]" />}
                        </div>
                        <div>
                          <span className="text-white hover:text-[#00f2ff] block">{p.player}</span>
                          <span className="text-[9px] text-[#8e9dae] font-normal block">{p.team}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 sm:px-4 py-3 font-sans text-[#00f2ff] font-semibold text-[11px]">{p.game}</td>
                    <td className="px-3 sm:px-4 py-3 text-center font-extrabold text-white">{p.points}</td>
                    <td className="px-3 sm:px-4 py-3 text-center text-[#e1e2e7]">{p.matches}</td>
                    <td className="px-3 sm:px-4 py-3 text-center text-[#00f2ff] font-bold">{p.kd}</td>
                    <td className="px-3 sm:px-4 py-3 text-right pr-4 text-[#00ff9d] font-bold">{p.winRate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
