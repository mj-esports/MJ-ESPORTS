import React, { useState, useEffect } from 'react'
import { Trophy, Award, AlertCircle, RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'

export interface LeaderboardSquadItem {
  rank: number
  team: string
  points: number
  kills: number
}

export const LeaderboardWidget: React.FC = () => {
  const [squads, setSquads] = useState<LeaderboardSquadItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLeaderboard = async () => {
    setLoading(true)
    setError(null)
    try {
      if (isSupabaseConfigured) {
        const { data, error: dbErr } = await supabase
          .from('tournaments')
          .select('teams_list, teamsList')

        if (dbErr) throw dbErr

        const squadMap: Record<string, { team: string; points: number; kills: number }> = {}

        if (data && data.length > 0) {
          data.forEach((t) => {
            const teams = Array.isArray(t.teams_list) ? t.teams_list : (Array.isArray(t.teamsList) ? t.teamsList : [])
            teams.forEach((team: any) => {
              const name = team.name || team.team || 'Squad'
              const points = Number(team.points || team.score || 0)
              const kills = Number(team.kills || team.finishes || 0)

              if (!squadMap[name]) {
                squadMap[name] = { team: name, points: 0, kills: 0 }
              }
              squadMap[name].points += points
              squadMap[name].kills += kills
            })
          })
        }

        const sorted = Object.values(squadMap)
          .sort((a, b) => b.points - a.points || b.kills - a.kills)
          .slice(0, 5)
          .map((item, index) => ({
            rank: index + 1,
            team: item.team,
            points: item.points,
            kills: item.kills,
          }))

        setSquads(sorted)
      } else {
        setSquads([])
      }
    } catch (err: any) {
      console.error('[Leaderboard Widget Fetch Error]:', err)
      setError('Failed to load leaderboard')
      setSquads([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLeaderboard()

    if (isSupabaseConfigured) {
      const channel = supabase
        .channel('leaderboard_widget_realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tournaments' }, () => {
          fetchLeaderboard()
        })
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [])

  return (
    <div className="glass-panel border border-[#3a494b] rounded-lg overflow-hidden shadow-lg">
      <div className="bg-[#272a2e] px-4 py-3 border-b border-[#3a494b] flex items-center justify-between">
        <h3 className="font-display-lg text-[#00f2ff] font-extrabold text-sm uppercase tracking-wider flex items-center gap-2">
          <Trophy className="w-4 h-4 text-[#fe6b00]" />
          TODAY'S TOP SQUADS
        </h3>
        <Link to="/leaderboard" className="text-[10px] font-bold text-[#00f2ff] hover:underline uppercase">
          VIEW ALL
        </Link>
      </div>

      <div className="p-3">
        {loading ? (
          /* Loading Skeletons */
          <div className="space-y-2 py-1">
            {[1, 2, 3, 4].map((i) => (
              <div key={`skel-lb-${i}`} className="h-9 bg-[#111417] border border-[#3a494b]/40 rounded animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="p-4 text-center text-xs text-[#ff3366] flex flex-col items-center gap-2">
            <AlertCircle className="w-5 h-5 text-[#ff3366]" />
            <span>{error}</span>
            <button
              onClick={fetchLeaderboard}
              className="px-3 py-1 bg-[#111417] border border-[#3a494b] text-white rounded text-[10px] font-bold uppercase hover:text-[#00f2ff]"
            >
              <RefreshCw className="w-3 h-3 inline mr-1" /> Retry
            </button>
          </div>
        ) : squads.length === 0 ? (
          /* Required Empty State */
          <div className="py-8 px-4 text-center space-y-3 bg-[#111417]/60 rounded border border-[#3a494b]/40 my-1">
            <div className="w-10 h-10 rounded-full bg-[#07090c] border border-[#3a494b] flex items-center justify-center mx-auto text-[#fe6b00]">
              <Trophy className="w-5 h-5 text-[#fe6b00]" />
            </div>
            <div className="space-y-1">
              <h4 className="font-display-lg text-xs font-extrabold text-white uppercase">
                No Leaderboard Available
              </h4>
              <p className="text-[11px] text-[#849495] leading-relaxed max-w-xs mx-auto">
                Leaderboard will automatically appear after tournament results are published.
              </p>
            </div>
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-[10px] font-bold text-[#b9cacb] border-b border-[#3a494b]/50 uppercase tracking-wider">
                <th className="py-2 px-1">RANK</th>
                <th className="py-2 px-1">SQUAD</th>
                <th className="py-2 px-1 text-center">POINTS</th>
                <th className="py-2 px-1 text-right">KILLS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#3a494b]/30">
              {squads.map((item) => (
                <tr key={`squad-row-${item.rank}`} className="hover:bg-[#323538]/60 transition-colors">
                  <td className="py-2.5 px-1 font-mono font-bold">
                    <span
                      className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] ${
                        item.rank === 1
                          ? 'bg-[#fe6b00] text-slate-950 font-extrabold'
                          : item.rank === 2
                          ? 'bg-[#00f2ff] text-[#00363a] font-extrabold'
                          : item.rank === 3
                          ? 'bg-[#ffe173] text-[#221b00] font-extrabold'
                          : 'text-[#b9cacb]'
                      }`}
                    >
                      #{item.rank}
                    </span>
                  </td>
                  <td className="py-2.5 px-1 font-bold text-[#e1e2e7] flex items-center gap-1.5">
                    {item.rank === 1 && <Award className="w-3.5 h-3.5 text-[#fe6b00] shrink-0" />}
                    <span className="truncate max-w-[120px]">{item.team}</span>
                  </td>
                  <td className="py-2.5 px-1 text-center font-mono font-extrabold text-white">
                    {item.points}
                  </td>
                  <td className="py-2.5 px-1 text-right font-mono font-extrabold text-[#00f2ff]">
                    {item.kills}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
