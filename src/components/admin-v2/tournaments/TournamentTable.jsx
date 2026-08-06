import React from 'react'

export default function TournamentTable({ tournaments = [] }) {
  return (
    <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 overflow-hidden shadow-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/90 text-slate-400 font-semibold border-b border-slate-800/80 uppercase text-[10px] tracking-wider">
            <tr>
              <th className="px-5 py-4">Title</th>
              <th className="px-4 py-4">Game</th>
              <th className="px-4 py-4">Format</th>
              <th className="px-4 py-4">Match Format</th>
              <th className="px-4 py-4">Prize Pool</th>
              <th className="px-4 py-4">Entry Fee</th>
              <th className="px-4 py-4">Max Teams</th>
              <th className="px-4 py-4">Registered Teams</th>
              <th className="px-4 py-4">Start Date</th>
              <th className="px-4 py-4">Start Time</th>
              <th className="px-5 py-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-300">
            {tournaments.map((t) => (
              <tr key={t.id || t.title} className="hover:bg-slate-950/40 transition-colors">
                {/* Title */}
                <td className="px-5 py-4 font-bold text-white text-sm">
                  {t.title || 'Untitled Tournament'}
                </td>

                {/* Game */}
                <td className="px-4 py-4 font-mono font-semibold text-cyan-400">
                  {t.game || 'Free Fire'}
                </td>

                {/* Format */}
                <td className="px-4 py-4 font-mono font-medium text-slate-200">
                  {t.format || 'SQUAD (4P)'}
                </td>

                {/* Match Format */}
                <td className="px-4 py-4 font-mono font-medium text-slate-300">
                  {t.match_format || t.format || 'SQUAD (4P)'}
                </td>

                {/* Prize Pool */}
                <td className="px-4 py-4 font-mono font-extrabold text-emerald-400">
                  {t.prize_pool || t.prizePool || '₹0'}
                </td>

                {/* Entry Fee */}
                <td className="px-4 py-4 font-semibold text-slate-300">
                  {t.entry_fee || t.entryFee || 'Free'}
                </td>

                {/* Max Teams */}
                <td className="px-4 py-4 font-mono font-semibold text-slate-200">
                  {t.max_teams ?? t.maxTeams ?? 32}
                </td>

                {/* Registered Teams */}
                <td className="px-4 py-4 font-mono font-semibold text-cyan-300">
                  {t.registered_teams ?? t.registeredTeams ?? 0}
                </td>

                {/* Start Date */}
                <td className="px-4 py-4 font-mono text-slate-300">
                  {t.start_date || t.startDate || 'N/A'}
                </td>

                {/* Start Time */}
                <td className="px-4 py-4 font-mono text-slate-400">
                  {t.start_time || t.startTime || 'N/A'}
                </td>

                {/* Status */}
                <td className="px-5 py-4">
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                      t.status === 'Registration Open'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : t.status === 'Live Now' || t.status === 'Live'
                        ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    {t.status || 'Draft'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
