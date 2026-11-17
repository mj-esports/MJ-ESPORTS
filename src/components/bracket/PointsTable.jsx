import { Trophy, Flame, Shield } from 'lucide-react'

export default function PointsTable({ teams = [] }) {
  if (!teams || teams.length === 0) {
    return (
      <div className="p-8 text-center bg-[#111215] border border-[#27272A] rounded-none text-[#A1A1AA] text-xs">
        No team rankings registered yet for this tournament.
      </div>
    )
  }

  // Sort teams by points descending
  const sortedTeams = [...teams].sort((a, b) => (b.points || 0) - (a.points || 0))

  return (
    <div className="bg-[#111215] border border-[#27272A] rounded-none overflow-hidden shadow-xl">
      <div className="p-4 bg-[#18181B] border-b border-[#27272A] flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#FFB900]">
          <Trophy className="w-4 h-4 text-[#FFB900]" />
          <span>Tournament Overall Standings</span>
        </div>
        <span className="text-[11px] font-semibold text-[#A1A1AA]">
          {sortedTeams.length} Squads Competing
        </span>
      </div>

      {/* Desktop Table View (>= 768px) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-[#18181B] border-b border-[#27272A] text-[#A1A1AA] font-bold uppercase tracking-wider">
              <th className="p-3.5 pl-6">Rank</th>
              <th className="p-3.5">Team Name</th>
              <th className="p-3.5">Captain</th>
              <th className="p-3.5 text-center">Kills</th>
              <th className="p-3.5 text-right pr-6">Total Points</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#27272A]">
            {sortedTeams.map((team, idx) => {
              const rank = idx + 1
              const isTop3 = rank <= 3
              return (
                <tr
                  key={`points-desktop-${idx}`}
                  className={`hover:bg-[#18181B]/60 transition-colors ${
                    isTop3 ? 'bg-[#FFB900]/5 font-semibold' : ''
                  }`}
                >
                  <td className="p-3.5 pl-6 font-extrabold">
                    <span
                      className={`inline-flex items-center justify-center w-6 h-6 rounded-none text-xs ${
                        rank === 1
                          ? 'bg-[#FFB900] text-black font-extrabold'
                          : rank === 2
                          ? 'bg-[#FFFFFF] text-black font-bold'
                          : rank === 3
                          ? 'bg-[#FF8C00] text-black font-bold'
                          : 'bg-[#18181B] text-[#A1A1AA] border border-[#27272A]'
                      }`}
                    >
                      {rank}
                    </span>
                  </td>
                  <td className="p-3.5 font-bold text-white flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-[#FFB900]" />
                    <span>{team.name}</span>
                  </td>
                  <td className="p-3.5 text-[#A1A1AA]">{team.captain || 'N/A'}</td>
                  <td className="p-3.5 text-center text-[#FF8C00] font-bold">
                    <span className="inline-flex items-center gap-1">
                      <Flame className="w-3 h-3 text-[#FF8C00]" />
                      {team.kills || 0}
                    </span>
                  </td>
                  <td className="p-3.5 text-right pr-6 font-extrabold text-[#10B981] text-sm">
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
              className={`p-3.5 rounded-none border flex items-center justify-between text-xs shadow-md ${
                isTop3
                  ? 'bg-[#18181B] border-[#FFB900]/40'
                  : 'bg-[#18181B] border-[#27272A]'
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`inline-flex items-center justify-center w-6 h-6 rounded-none text-xs font-extrabold shrink-0 ${
                    rank === 1
                      ? 'bg-[#FFB900] text-black'
                      : rank === 2
                      ? 'bg-[#FFFFFF] text-black'
                      : rank === 3
                      ? 'bg-[#FF8C00] text-black'
                      : 'bg-[#111215] text-[#A1A1AA] border border-[#27272A]'
                  }`}
                >
                  #{rank}
                </span>

                <div className="space-y-0.5">
                  <h4 className="font-extrabold text-white text-xs flex items-center gap-1">
                    <Shield className="w-3 h-3 text-[#FFB900] shrink-0" />
                    <span>{team.name}</span>
                  </h4>
                  <p className="text-[11px] text-[#A1A1AA]">Captain: {team.captain || 'N/A'}</p>
                </div>
              </div>

              <div className="text-right space-y-0.5">
                <span className="font-extrabold text-[#10B981] text-xs block">
                  {team.points || 0} pts
                </span>
                <span className="text-[10px] text-[#FF8C00] font-semibold flex items-center justify-end gap-0.5">
                  <Flame className="w-2.5 h-2.5 text-[#FF8C00]" />
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
