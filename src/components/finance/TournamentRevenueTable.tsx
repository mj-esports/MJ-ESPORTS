import React from 'react'
import { Trophy, ArrowUpRight } from 'lucide-react'
import { TournamentRevenueRecord } from '../../utils/financeCalculations'

interface TournamentRevenueTableProps {
  tournaments: TournamentRevenueRecord[]
}

export const TournamentRevenueTable: React.FC<TournamentRevenueTableProps> = ({ tournaments }) => {
  return (
    <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-5 sm:p-6 space-y-5 shadow-2xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#3a494b]/60 pb-4">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-[#fe6b00]" />
          <h2 className="font-display-lg text-lg font-extrabold text-white uppercase tracking-wider">
            TOURNAMENT REVENUE BREAKDOWN
          </h2>
        </div>
        <span className="text-xs font-mono font-bold text-[#00f2ff] bg-[#00f2ff]/10 px-3 py-1 rounded border border-[#00f2ff]/30">
          {tournaments.length} Active Competitions
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-[#07090c] border-b border-[#3a494b]/60 font-mono text-[#8e9dae] uppercase tracking-wider">
              <th className="p-3 pl-4">Tournament</th>
              <th className="p-3">Game</th>
              <th className="p-3 text-center">Entry Fee</th>
              <th className="p-3 text-center">Slots</th>
              <th className="p-3 text-center">Fill %</th>
              <th className="p-3 text-center">Paid Regs</th>
              <th className="p-3 text-right">Collected</th>
              <th className="p-3 text-right">Prize Pool</th>
              <th className="p-3 text-right">Est. Profit</th>
              <th className="p-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#3a494b]/40 font-mono">
            {tournaments.map((t) => (
              <tr key={`t-rev-${t.id}`} className="hover:bg-[#1d232c] transition-colors">
                <td className="p-3 pl-4 font-sans font-bold text-white max-w-[180px] truncate">
                  {t.title}
                </td>
                <td className="p-3 font-sans font-semibold text-[#00f2ff]">{t.game}</td>
                <td className="p-3 text-center font-bold text-white">₹{t.entryFee}</td>
                <td className="p-3 text-center text-[#8e9dae]">
                  {t.registeredPlayers} / {t.maxSlots}
                </td>
                <td className="p-3 text-center font-bold text-[#00f2ff]">{t.fillPercentage}%</td>
                <td className="p-3 text-center text-[#00ff9d] font-bold">{t.successfulPayments}</td>
                <td className="p-3 text-right font-extrabold text-[#00f2ff]">
                  ₹{t.collectedAmount.toLocaleString()}
                </td>
                <td className="p-3 text-right text-[#ffb693] font-bold">
                  ₹{t.prizePool.toLocaleString()}
                </td>
                <td
                  className={`p-3 text-right font-extrabold text-sm ${
                    t.estimatedProfit >= 0 ? 'text-[#00ff9d]' : 'text-[#ff3366]'
                  }`}
                >
                  ₹{t.estimatedProfit.toLocaleString()}
                </td>
                <td className="p-3 text-center">
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-[#07090c] border border-[#3a494b] text-[#e1e2e7]">
                    {t.status}
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
