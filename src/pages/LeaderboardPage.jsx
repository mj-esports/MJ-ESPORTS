import { Trophy, Award, Flame, Shield, DollarSign, Crown } from 'lucide-react'
import { GLOBAL_LEADERBOARD, MVP_PLAYERS } from '../data/mockData'

export default function LeaderboardPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 sm:space-y-12">
      
      {/* Header */}
      <div className="space-y-3 text-center max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#00f2ff]/10 border border-[#00f2ff]/30 text-[#00f2ff] text-xs font-bold uppercase tracking-widest">
          <Award className="w-3.5 h-3.5" />
          <span>Global Hall of Fame</span>
        </div>
        <h1 className="font-display-lg text-3xl sm:text-5xl font-extrabold text-white tracking-tight uppercase">
          LEADERBOARD & MVP RANKINGS
        </h1>
        <p className="text-[#8e9dae] text-xs sm:text-sm leading-relaxed">
          Track top performing esports organizations, seasonal point leaders, and MVP player statistics across all official titles.
        </p>
      </div>

      {/* Global Team Rankings Container */}
      <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-5 sm:p-8 space-y-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#3a494b]/60 pb-4">
          <h2 className="font-display-lg text-lg sm:text-xl font-extrabold text-white uppercase tracking-tight flex items-center gap-2">
            <Trophy className="w-5 h-5 text-[#fe6b00]" />
            <span>Top Organizations & Teams</span>
          </h2>
          <span className="font-mono text-xs font-bold text-[#00f2ff] bg-[#00f2ff]/10 px-3 py-1 rounded border border-[#00f2ff]/30">Season 2026</span>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#07090c] border-b border-[#3a494b]/60 font-label-caps text-[#8e9dae]">
                <th className="p-4 pl-6">Rank</th>
                <th className="p-4">Team Name</th>
                <th className="p-4">Primary Game</th>
                <th className="p-4 text-center">Matches Won</th>
                <th className="p-4 text-center">Win Rate</th>
                <th className="p-4 text-center">Total Points</th>
                <th className="p-4 text-right pr-6">Prize Earnings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#3a494b]/40">
              {GLOBAL_LEADERBOARD.map((team) => (
                <tr key={`rank-desktop-${team.rank}`} className="hover:bg-[#1d232c] transition-colors">
                  <td className="p-4 pl-6 font-extrabold">
                    <span
                      className={`inline-flex items-center justify-center w-7 h-7 rounded text-xs font-extrabold font-mono ${
                        team.rank === 1
                          ? 'bg-[#fe6b00] text-slate-950 shadow-[0_0_12px_rgba(254,107,0,0.5)]'
                          : team.rank === 2
                          ? 'bg-[#00f2ff] text-[#00363a] shadow-[0_0_12px_rgba(0,242,255,0.4)]'
                          : team.rank === 3
                          ? 'bg-[#ffe173] text-[#221b00]'
                          : 'bg-[#07090c] text-[#8e9dae] border border-[#3a494b]'
                      }`}
                    >
                      #{team.rank}
                    </span>
                  </td>
                  <td className="p-4 font-bold text-white flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[#00f2ff]" />
                    <span>{team.team}</span>
                  </td>
                  <td className="p-4 text-[#00f2ff] font-semibold">{team.game}</td>
                  <td className="p-4 text-center text-[#e1e2e7] font-bold font-mono">{team.wins}</td>
                  <td className="p-4 text-center text-[#00f2ff] font-bold font-mono">{team.winRate}</td>
                  <td className="p-4 text-center font-mono font-extrabold text-white">{team.points} pts</td>
                  <td className="p-4 text-right pr-6 font-mono font-extrabold text-[#ffb693] text-sm">
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
              className="bg-[#07090c] border border-[#3a494b]/60 rounded-xl p-4 space-y-3 shadow-lg"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`inline-flex items-center justify-center w-7 h-7 rounded text-xs font-extrabold font-mono ${
                      team.rank === 1
                        ? 'bg-[#fe6b00] text-slate-950 shadow-[0_0_12px_rgba(254,107,0,0.5)]'
                        : team.rank === 2
                        ? 'bg-[#00f2ff] text-[#00363a] shadow-[0_0_12px_rgba(0,242,255,0.4)]'
                        : team.rank === 3
                        ? 'bg-[#ffe173] text-[#221b00]'
                        : 'bg-[#151a21] text-[#8e9dae] border border-[#3a494b]'
                    }`}
                  >
                    #{team.rank}
                  </span>
                  <h3 className="font-extrabold text-white text-sm flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-[#00f2ff] shrink-0" />
                    <span>{team.team}</span>
                  </h3>
                </div>

                <span className="px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-[#00f2ff]/10 text-[#00f2ff] border border-[#00f2ff]/30">
                  {team.game}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-[#3a494b]/60">
                <div className="bg-[#151a21] p-2.5 rounded border border-[#3a494b]/60">
                  <span className="font-label-caps text-[#8e9dae] text-[10px] block">Points</span>
                  <span className="font-mono text-white font-extrabold text-xs">{team.points} pts</span>
                </div>
                <div className="bg-[#151a21] p-2.5 rounded border border-[#3a494b]/60">
                  <span className="font-label-caps text-[#8e9dae] text-[10px] block">Prize Won</span>
                  <span className="font-mono text-[#ffb693] font-extrabold text-xs">{team.prizeWon}</span>
                </div>
                <div className="bg-[#151a21] p-2.5 rounded border border-[#3a494b]/60">
                  <span className="font-label-caps text-[#8e9dae] text-[10px] block">Matches Won</span>
                  <span className="font-mono text-[#e1e2e7] font-bold text-xs">{team.wins}</span>
                </div>
                <div className="bg-[#151a21] p-2.5 rounded border border-[#3a494b]/60">
                  <span className="font-label-caps text-[#8e9dae] text-[10px] block">Win Rate</span>
                  <span className="font-mono text-[#00f2ff] font-bold text-xs">{team.winRate}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MVP Player Spotlight */}
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Crown className="w-5 h-5 text-[#fe6b00]" />
          <h2 className="font-display-lg text-xl font-extrabold text-white uppercase tracking-tight">
            MVP PLAYERS OF THE MONTH
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {MVP_PLAYERS.map((player) => (
            <div
              key={`mvp-player-${player.rank}`}
              className="bg-[#151a21] border border-[#3a494b]/60 hover:border-[#00f2ff] rounded-xl p-5 sm:p-6 space-y-4 shadow-lg transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="w-8 h-8 rounded bg-[#fe6b00]/20 border border-[#fe6b00] text-[#fe6b00] font-mono font-extrabold text-xs flex items-center justify-center">
                  #{player.rank}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-[#07090c] px-2.5 py-1 rounded text-[#00f2ff] border border-[#00f2ff]/30">
                  {player.game}
                </span>
              </div>

              <div>
                <h3 className="font-display-lg text-lg font-bold text-white uppercase">{player.name}</h3>
                <p className="text-xs text-[#00f2ff] font-semibold">{player.team}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#3a494b]/60 text-xs">
                <div className="bg-[#07090c] p-2.5 rounded border border-[#3a494b]/60">
                  <span className="font-label-caps text-[#8e9dae] text-[10px] block">K/D Ratio</span>
                  <span className="font-mono text-[#00ff9d] font-extrabold">{player.kd}</span>
                </div>
                <div className="bg-[#07090c] p-2.5 rounded border border-[#3a494b]/60">
                  <span className="font-label-caps text-[#8e9dae] text-[10px] block">MVP Titles</span>
                  <span className="font-mono text-[#fe6b00] font-extrabold">{player.mvpTitles}x</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
