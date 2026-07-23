import { Trophy, Award, Flame, Shield, DollarSign, Crown } from 'lucide-react'
import { GLOBAL_LEADERBOARD, MVP_PLAYERS } from '../data/mockData'

export default function LeaderboardPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 sm:space-y-12">
      
      {/* Header */}
      <div className="space-y-3 text-center max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-400 text-xs font-bold">
          <Award className="w-3.5 h-3.5" />
          <span>Global Hall of Fame</span>
        </div>
        <h1 className="text-2xl sm:text-5xl font-extrabold text-white tracking-tight uppercase">
          LEADERBOARD & MVP RANKINGS
        </h1>
        <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
          Track top performing esports organizations, seasonal point leaders, and MVP player statistics across all official titles.
        </p>
      </div>

      {/* Global Team Rankings Container */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-8 space-y-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <h2 className="text-lg sm:text-xl font-extrabold text-white uppercase tracking-tight flex items-center gap-2">
            <Trophy className="w-5 h-5 text-purple-400" />
            <span>Top Organizations & Teams</span>
          </h2>
          <span className="text-xs font-bold text-slate-400">Season 2026</span>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                <th className="p-4 pl-6">Rank</th>
                <th className="p-4">Team Name</th>
                <th className="p-4">Primary Game</th>
                <th className="p-4 text-center">Matches Won</th>
                <th className="p-4 text-center">Win Rate</th>
                <th className="p-4 text-center">Total Points</th>
                <th className="p-4 text-right pr-6">Prize Earnings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {GLOBAL_LEADERBOARD.map((team) => (
                <tr key={`rank-desktop-${team.rank}`} className="hover:bg-slate-800/40 transition-colors">
                  <td className="p-4 pl-6 font-extrabold">
                    <span
                      className={`inline-flex items-center justify-center w-7 h-7 rounded-xl text-xs font-extrabold ${
                        team.rank === 1
                          ? 'bg-amber-400 text-slate-950 shadow-md'
                          : team.rank === 2
                          ? 'bg-slate-300 text-slate-950'
                          : team.rank === 3
                          ? 'bg-amber-700 text-white'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      #{team.rank}
                    </span>
                  </td>
                  <td className="p-4 font-bold text-white flex items-center gap-2">
                    <Shield className="w-4 h-4 text-purple-400" />
                    <span>{team.team}</span>
                  </td>
                  <td className="p-4 text-cyan-400 font-semibold">{team.game}</td>
                  <td className="p-4 text-center text-slate-200 font-bold">{team.wins}</td>
                  <td className="p-4 text-center text-purple-300 font-bold">{team.winRate}</td>
                  <td className="p-4 text-center font-extrabold text-white">{team.points} pts</td>
                  <td className="p-4 text-right pr-6 font-extrabold text-emerald-400 text-sm">
                    {team.prizeWon}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card Stack View (< 768px) */}
        <div className="block md:hidden space-y-4">
          {GLOBAL_LEADERBOARD.map((team) => (
            <div
              key={`rank-mobile-${team.rank}`}
              className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-lg"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`inline-flex items-center justify-center w-7 h-7 rounded-xl text-xs font-extrabold ${
                      team.rank === 1
                        ? 'bg-amber-400 text-slate-950 shadow-md'
                        : team.rank === 2
                        ? 'bg-slate-300 text-slate-950'
                        : team.rank === 3
                        ? 'bg-amber-700 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    #{team.rank}
                  </span>
                  <h3 className="font-extrabold text-white text-sm flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-purple-400 shrink-0" />
                    <span>{team.team}</span>
                  </h3>
                </div>

                <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide bg-slate-900 text-cyan-300 border border-cyan-500/30">
                  {team.game}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-800">
                <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-500 text-[10px] uppercase font-bold block">Points</span>
                  <span className="text-white font-extrabold text-xs">{team.points} pts</span>
                </div>
                <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-500 text-[10px] uppercase font-bold block">Prize Won</span>
                  <span className="text-emerald-400 font-extrabold text-xs">{team.prizeWon}</span>
                </div>
                <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-500 text-[10px] uppercase font-bold block">Matches Won</span>
                  <span className="text-slate-200 font-bold text-xs">{team.wins}</span>
                </div>
                <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-500 text-[10px] uppercase font-bold block">Win Rate</span>
                  <span className="text-purple-300 font-bold text-xs">{team.winRate}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MVP Player Spotlight */}
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Crown className="w-5 h-5 text-amber-400" />
          <h2 className="text-xl font-extrabold text-white uppercase tracking-tight">
            MVP PLAYERS OF THE MONTH
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {MVP_PLAYERS.map((player) => (
            <div
              key={`mvp-player-${player.rank}`}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4 shadow-lg"
            >
              <div className="flex items-center justify-between">
                <span className="w-8 h-8 rounded-xl bg-amber-950 border border-amber-800 text-amber-300 font-extrabold text-xs flex items-center justify-center">
                  #{player.rank}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-950 px-2.5 py-1 rounded-md text-cyan-300 border border-cyan-500/30">
                  {player.game}
                </span>
              </div>

              <div>
                <h3 className="text-lg font-bold text-white">{player.name}</h3>
                <p className="text-xs text-purple-400 font-semibold">{player.team}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-xs">
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-500 text-[10px] uppercase font-bold block">K/D Ratio</span>
                  <span className="text-emerald-400 font-extrabold">{player.kd}</span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-500 text-[10px] uppercase font-bold block">MVP Titles</span>
                  <span className="text-amber-400 font-extrabold">{player.mvpTitles}x</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
