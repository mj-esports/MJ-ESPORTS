import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react'
import { Trophy, Download, Sparkles, User } from 'lucide-react'
import { supabase, isSupabaseConfigured } from '../lib/supabase.js'
import { TableSkeleton } from '../components/common/SkeletonLoader.jsx'
import EmptyState from '../components/common/EmptyState.jsx'

const PublicTeamProfileModal = lazy(() => import('../components/team/PublicTeamProfileModal.jsx'))

export default function LeaderboardPage() {
  const [tournamentsList, setTournamentsList] = useState([])
  const [selectedTeamModal, setSelectedTeamModal] = useState(null)
  const [loading, setLoading] = useState(true)

  // Fetch live tournaments data from Supabase
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      if (isSupabaseConfigured) {
        const { data, error: err } = await supabase
          .from('tournaments')
          .select('id, title, game, format, prize_pool, status, teams_list, created_at')
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

  // Aggregate Final Standings & Top Teams/Players
  const standings = useMemo(() => {
    const statsMap = {}

    tournamentsList.forEach((t) => {
      const teams = Array.isArray(t.teams_list) ? t.teams_list : (Array.isArray(t.teamsList) ? t.teamsList : [])

      teams.forEach((team) => {
        const name = team.team || team.name || team.captain || 'Team Apex'
        const player = team.captain || team.player || team.name || 'Viper_XYZ'
        const kills = Number(team.kills || team.finishes || 0)
        const points = Number(team.points || team.score || 0)
        const isWinner = team.rank === 1 || team.position === 1

        if (!statsMap[name]) {
          statsMap[name] = {
            team: name,
            player: player,
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

    const sortedList = Object.values(statsMap)
      .sort((a, b) => b.points - a.points || b.wins - a.wins || b.kills - a.kills)

    return sortedList.slice(0, 50).map((item, index) => {
      const payout = index === 0 ? '₹10,000' : index === 1 ? '₹7,500' : index === 2 ? '₹4,000' : '-'
      return {
        ...item,
        rank: index + 1,
        payout,
      }
    })
  }, [tournamentsList])

  const championTeam = standings[0] || null
  const mvpPlayer = standings[1] || null

  const handleDownloadCsv = () => {
    if (standings.length === 0) return
    const headers = ['Rank,Team,Kills,TotalPoints,Payout\n']
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
    <div className="bg-[#09090b] text-[#f8fafc] font-body min-h-screen flex flex-col antialiased">
      <main className="flex-grow pt-8 pb-16 px-4 md:px-8 max-w-7xl mx-auto w-full">
        
        {/* 1. HEADER */}
        <header className="mb-10 text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#fbbf24]/10 border border-[#fbbf24]/20 text-[#fbbf24] font-label text-sm font-semibold mb-4">
            <Trophy className="w-4 h-4 text-[#fbbf24]" />
            <span>Tournament Concluded</span>
          </div>
          <h1 className="font-headline text-4xl md:text-6xl font-black tracking-tighter mb-2 uppercase text-transparent bg-clip-text bg-gradient-to-r from-slate-100 to-zinc-400">
            Summer Championship '26
          </h1>
          <p className="text-[#a1a1aa] text-base md:text-lg max-w-2xl font-body">
            The dust has settled. Witness the champions, the MVPs, and the final standings of the season's most grueling competition.
          </p>
        </header>

        {/* 2. BENTO GRID TOP SECTION */}
        {standings.length > 0 && championTeam && (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-12">
            
            {/* Winner Podium */}
            <div className="col-span-1 md:col-span-2 lg:col-span-2 bg-[#18181b]/60 backdrop-blur-md rounded-xl border border-[#fbbf24]/30 p-6 md:p-8 flex flex-col justify-between relative overflow-hidden shadow-[0_0_40px_-10px_rgba(251,191,36,0.3)] group">
              <div className="relative z-10">
                <h2 className="font-label text-[#fbbf24] font-bold uppercase tracking-widest text-sm mb-1">
                  Grand Champions
                </h2>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-full bg-[#18181b] flex items-center justify-center border-2 border-[#fbbf24] p-1 shadow-lg">
                    {championTeam.avatar ? (
                      <img src={championTeam.avatar} alt={championTeam.team} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <Trophy className="w-8 h-8 text-[#fbbf24]" />
                    )}
                  </div>
                  <h3 className="font-headline text-3xl md:text-4xl font-black tracking-tight text-white uppercase">
                    {championTeam.team}
                  </h3>
                </div>
              </div>

              <div className="relative z-10 flex flex-wrap gap-6 items-end justify-between mt-6 pt-4 border-t border-white/5">
                <div>
                  <p className="text-[#a1a1aa] font-label text-xs uppercase mb-1">Prize Money Won</p>
                  <p className="font-headline text-3xl md:text-4xl font-bold text-[#fbbf24]">{championTeam.payout}</p>
                </div>
                <div className="bg-[#09090b]/60 backdrop-blur px-4 py-2.5 rounded-lg border border-white/5 flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-[#22d3ee]" />
                  <div>
                    <p className="text-xs text-[#a1a1aa] font-label">Team MVP</p>
                    <p className="font-bold text-sm text-white">{championTeam.player}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Match MVP Badge */}
            {mvpPlayer && (
              <div className="col-span-1 bg-[#18181b]/60 backdrop-blur-md rounded-xl p-6 flex flex-col items-center text-center relative overflow-hidden shadow-[0_0_30px_-10px_rgba(34,211,238,0.2)] border border-[#27272a]">
                <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-transparent via-[#22d3ee] to-transparent"></div>
                <h2 className="font-label text-[#22d3ee] font-bold uppercase tracking-widest text-xs mb-6 w-full text-left">
                  Tournament MVP
                </h2>
                <div className="relative mb-4">
                  <div className="w-20 h-20 rounded-full border-2 border-[#22d3ee] p-1 relative z-10 bg-[#09090b] flex items-center justify-center">
                    {mvpPlayer.avatar ? (
                      <img src={mvpPlayer.avatar} alt={mvpPlayer.player} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <User className="w-10 h-10 text-[#22d3ee]" />
                    )}
                  </div>
                  <div className="absolute inset-0 bg-[#22d3ee] blur-xl opacity-20 rounded-full"></div>
                </div>
                <h3 className="font-headline text-2xl font-bold mb-1 text-white">{mvpPlayer.player}</h3>
                <p className="text-[#a1a1aa] text-xs font-mono mb-6">{mvpPlayer.team}</p>
                <div className="w-full grid grid-cols-2 gap-2 mt-auto">
                  <div className="bg-[#18181b] rounded-lg p-3 border border-white/5">
                    <p className="text-[10px] text-[#a1a1aa] font-label uppercase mb-1">Total Kills</p>
                    <p className="font-headline text-xl font-bold text-white">{mvpPlayer.kills}</p>
                  </div>
                  <div className="bg-[#18181b] rounded-lg p-3 border border-white/5">
                    <p className="text-[10px] text-[#a1a1aa] font-label uppercase mb-1">Total Matches</p>
                    <p className="font-headline text-xl font-bold text-[#22d3ee]">{mvpPlayer.matches}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Prize Distribution Summary */}
            <div className="col-span-1 md:col-span-3 lg:col-span-1 bg-[#18181b]/60 backdrop-blur-md rounded-xl p-6 flex flex-col border border-[#27272a]">
              <h2 className="font-label text-[#a1a1aa] font-bold uppercase tracking-widest text-xs mb-4 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-[#fbbf24]" />
                <span>Prize Pool</span>
              </h2>
              <div className="mb-6">
                <p className="text-xs text-[#a1a1aa] font-label mb-1">Total Pool</p>
                <p className="font-headline text-3xl font-bold text-white">₹25,000</p>
              </div>
              <div className="space-y-3.5 mt-auto">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#fbbf24]"></div>
                    <span className="text-xs font-semibold text-white">1st Place</span>
                  </div>
                  <span className="text-xs text-[#fbbf24] font-bold">₹10,000</span>
                </div>
                <div className="w-full bg-[#18181b] h-1.5 rounded-full overflow-hidden">
                  <div className="bg-[#fbbf24] h-full w-[40%] rounded-full"></div>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-slate-300"></div>
                    <span className="text-xs text-[#a1a1aa]">2nd Place</span>
                  </div>
                  <span className="text-xs text-white">₹7,500</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-700"></div>
                    <span className="text-xs text-[#a1a1aa]">3rd Place</span>
                  </div>
                  <span className="text-xs text-white">₹4,000</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#22d3ee]"></div>
                    <span className="text-xs text-[#a1a1aa]">MVPs & Bonus</span>
                  </div>
                  <span className="text-xs text-[#22d3ee] font-bold">₹3,500</span>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* 3. FINAL STANDINGS LEADERBOARD TABLE */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <h2 className="font-headline text-2xl font-bold tracking-tight text-white uppercase">Final Standings</h2>
            {standings.length > 0 && (
              <button
                onClick={handleDownloadCsv}
                className="text-xs font-label text-[#22d3ee] hover:text-white transition-colors flex items-center gap-1.5 bg-[#18181b] px-4 py-2 rounded-lg border border-[#27272a]"
              >
                <span>Download Full CSV</span>
                <Download className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="bg-[#18181b]/60 backdrop-blur-md rounded-xl border border-[#27272a] overflow-hidden shadow-2xl">
            {loading ? (
              <div className="p-4">
                <TableSkeleton rows={6} />
              </div>
            ) : standings.length === 0 ? (
              <EmptyState type="leaderboard" sentence="No leaderboard data available yet." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 bg-[#18181b]/80 font-mono text-xs uppercase text-[#a1a1aa]">
                      <th className="py-4 px-6 text-center w-16">Rank</th>
                      <th className="py-4 px-6">Team / Squad</th>
                      <th className="py-4 px-6 text-right">Kills</th>
                      <th className="py-4 px-6 text-right">Total Pts</th>
                      <th className="py-4 px-6 text-right pr-6">Payout</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono text-xs">
                    {standings.map((s) => {
                      const isRank1 = s.rank === 1
                      const isRank2 = s.rank === 2
                      const isRank3 = s.rank === 3

                      return (
                        <tr
                          key={`standings-row-${s.rank}`}
                          onClick={() => setSelectedTeamModal(s)}
                          className={`group hover:bg-white/5 transition-colors cursor-pointer ${
                            isRank1 ? 'bg-[#fbbf24]/5' : ''
                          }`}
                        >
                          <td className="py-4 px-6 text-center">
                            <div
                              className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold ${
                                isRank1
                                  ? 'bg-[#fbbf24] text-black shadow-md'
                                  : isRank2
                                  ? 'bg-slate-300 text-black'
                                  : isRank3
                                  ? 'bg-amber-700 text-white'
                                  : 'text-[#a1a1aa]'
                              }`}
                            >
                              {s.rank}
                            </div>
                          </td>

                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-[#18181b] border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                                {s.avatar ? (
                                  <img src={s.avatar} alt={s.team} className="w-full h-full object-cover" />
                                ) : (
                                  <User className="w-4 h-4 text-[#22d3ee]" />
                                )}
                              </div>
                              <div>
                                <span className={`font-bold font-headline block ${
                                  isRank1 ? 'text-[#fbbf24]' : 'text-white'
                                }`}>
                                  {s.team}
                                </span>
                                <span className="text-[10px] text-[#a1a1aa] font-normal block">{s.player}</span>
                              </div>
                            </div>
                          </td>

                          <td className="py-4 px-6 text-right font-display text-[#a1a1aa]">{s.kills}</td>
                          <td className="py-4 px-6 text-right font-display font-bold text-white">{s.points}</td>
                          <td className={`py-4 px-6 text-right pr-6 font-display font-bold ${
                            isRank1 ? 'text-[#fbbf24]' : isRank2 ? 'text-slate-300' : isRank3 ? 'text-amber-500' : 'text-[#a1a1aa]'
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
