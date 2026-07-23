import { Trophy, Flame, Shield } from 'lucide-react'

export default function PointsTable({ teams = [] }) {
  if (!teams || teams.length === 0) {
    return (
      <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-500 text-xs">
        No team rankings registered yet for this tournament.
      </div>
    )
  }

  // Sort teams by points descending
  const sortedTeams = [...teams].sort((a, b) => (b.points || 0) - (a.points || 0))

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-400">
          <Trophy className="w-4 h-4" />
          <span>Tournament Overall Standings</span>
        </div>
        <span className="text-[11px] font-semibold text-slate-400">
          {sortedTeams.length} Squads Competing
        </span>
      </div>

      {/* Desktop Table View (>= 768px) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
              <th className="p-3.5 pl-6">Rank</th>
              <th className="p-3.5">Team Name</th>
              <th className="p-3.5">Captain</th>
              <th className="p-3.5 text-center">Kills</th>
              <th className="p-3.5 text-right pr-6">Total Points</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {sortedTeams.map((team, idx) => {
              const rank = idx + 1
              const isTop3 = rank <= 3
              return (
                <tr
                  key={`points-desktop-${idx}`}
                  className={`hover:bg-slate-800/40 transition-colors ${
                    isTop3 ? 'bg-purple-950/40 font-semibold' : ''
                  }`}
                >
                  <td className="p-3.5 pl-6 font-extrabold">
                    <span
                      className={`inline-flex items-center justify-center w-6 h-6 rounded-lg text-xs ${
                        rank === 1
                          ? 'bg-amber-400 text-slate-950 shadow-md'
                          : rank === 2
                          ? 'bg-slate-300 text-slate-950'
                          : rank === 3
                          ? 'bg-amber-700 text-white'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {rank}
                    </span>
                  </td>
                  <td className="p-3.5 font-bold text-white flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-purple-400" />
                    <span>{team.name}</span>
                  </td>
                  <td className="p-3.5 text-slate-400">{team.captain || 'N/A'}</td>
                  <td className="p-3.5 text-center text-cyan-400 font-bold">
                    <span className="inline-flex items-center gap-1">
                      <Flame className="w-3 h-3 text-orange-400" />
                      {team.kills || 0}
                    </span>
                  </td>
                  <td className="p-3.5 text-right pr-6 font-extrabold text-emerald-400 text-sm">
                    {team.points || 0} pts
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card Stack View (< 768px) */}
      <div className="block md:hidden p-4 space-y-3">
        {sortedTeams.map((team, idx) => {
          const rank = idx + 1
          const isTop3 = rank <= 3
          return (
            <div
              key={`points-mobile-${idx}`}
              className={`p-3.5 rounded-xl border flex items-center justify-between text-xs shadow-md ${
                isTop3
                  ? 'bg-purple-950/40 border-purple-800'
                  : 'bg-slate-950 border-slate-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`inline-flex items-center justify-center w-6 h-6 rounded-lg text-xs font-extrabold shrink-0 ${
                    rank === 1
                      ? 'bg-amber-400 text-slate-950'
                      : rank === 2
                      ? 'bg-slate-300 text-slate-950'
                      : rank === 3
                      ? 'bg-amber-700 text-white'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  #{rank}
                </span>

                <div className="space-y-0.5">
                  <h4 className="font-extrabold text-white text-xs flex items-center gap-1">
                    <Shield className="w-3 h-3 text-purple-400 shrink-0" />
                    <span>{team.name}</span>
                  </h4>
                  <p className="text-[11px] text-slate-400">Captain: {team.captain || 'N/A'}</p>
                </div>
              </div>

              <div className="text-right space-y-0.5">
                <span className="font-extrabold text-emerald-400 text-xs block">
                  {team.points || 0} pts
                </span>
                <span className="text-[10px] text-cyan-400 font-semibold flex items-center justify-end gap-0.5">
                  <Flame className="w-2.5 h-2.5 text-orange-400" />
                  {team.kills || 0} Kills
                </span>
              </div>
            </div>
          )
        })}
      </div>

    </div>
  )
}
