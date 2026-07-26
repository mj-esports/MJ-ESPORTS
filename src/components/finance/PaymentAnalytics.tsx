import React from 'react'
import { PieChart, BarChart2, Percent, DollarSign } from 'lucide-react'
import { TransactionRecord, TournamentRevenueRecord } from '../../utils/financeCalculations'

interface PaymentAnalyticsProps {
  transactions: TransactionRecord[]
  tournaments: TournamentRevenueRecord[]
}

export const PaymentAnalytics: React.FC<PaymentAnalyticsProps> = ({ transactions, tournaments }) => {
  const totalTx = transactions.length
  const successTx = transactions.filter((t) => t.paymentStatus === 'SUCCESS').length
  const successRate = totalTx > 0 ? Math.round((successTx / totalTx) * 100) : 100

  // Game-wise Revenue
  let ffRev = 0
  let bgmiRev = 0
  transactions.forEach((tx) => {
    if (tx.paymentStatus === 'SUCCESS') {
      if (tx.game.includes('Free Fire')) ffRev += tx.amount
      else bgmiRev += tx.amount
    }
  })
  const totalRev = ffRev + bgmiRev
  const ffPct = totalRev > 0 ? Math.round((ffRev / totalRev) * 100) : 50
  const bgmiPct = totalRev > 0 ? Math.round((bgmiRev / totalRev) * 100) : 50

  // Avg Revenue Per Tournament
  const avgRevPerTournament = tournaments.length > 0 ? Math.round(totalRev / tournaments.length) : 0

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Game-wise Revenue */}
      <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-5 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-[#3a494b]/60 pb-3">
          <h3 className="font-display-lg text-sm font-extrabold text-white uppercase flex items-center gap-2">
            <PieChart className="w-4 h-4 text-[#00f2ff]" />
            <span>Game-wise Revenue Share</span>
          </h3>
        </div>

        <div className="space-y-4 pt-1">
          <div>
            <div className="flex justify-between items-center text-xs font-bold mb-1">
              <span className="text-[#00f2ff]">Free Fire MAX</span>
              <span className="font-mono text-[#00f2ff]">₹{ffRev.toLocaleString()} ({ffPct}%)</span>
            </div>
            <div className="w-full h-2 bg-[#07090c] rounded-full overflow-hidden border border-[#3a494b]/40">
              <div className="h-full bg-[#00f2ff]" style={{ width: `${ffPct}%` }} />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center text-xs font-bold mb-1">
              <span className="text-[#fe6b00]">BGMI Mobile</span>
              <span className="font-mono text-[#ffb693]">₹{bgmiRev.toLocaleString()} ({bgmiPct}%)</span>
            </div>
            <div className="w-full h-2 bg-[#07090c] rounded-full overflow-hidden border border-[#3a494b]/40">
              <div className="h-full bg-[#fe6b00]" style={{ width: `${bgmiPct}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Payment Success Rate */}
      <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-5 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-[#3a494b]/60 pb-3">
          <h3 className="font-display-lg text-sm font-extrabold text-white uppercase flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-[#00ff9d]" />
            <span>Payment Success Rate</span>
          </h3>
        </div>

        <div className="space-y-3 pt-1">
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-3xl font-extrabold text-[#00ff9d]">{successRate}%</span>
            <span className="text-xs text-[#8e9dae] font-mono">{successTx} / {totalTx} Verified</span>
          </div>
          <div className="w-full h-3 bg-[#07090c] rounded-full overflow-hidden border border-[#3a494b]/40">
            <div className="h-full bg-[#00ff9d]" style={{ width: `${successRate}%` }} />
          </div>
          <p className="text-[11px] text-[#8e9dae]">Razorpay automated webhook validation</p>
        </div>
      </div>

      {/* Average Revenue Per Tournament */}
      <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-5 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-[#3a494b]/60 pb-3">
          <h3 className="font-display-lg text-sm font-extrabold text-white uppercase flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-[#ffe173]" />
            <span>Avg Revenue / Tournament</span>
          </h3>
        </div>

        <div className="space-y-2 pt-1 font-mono">
          <div className="text-3xl font-extrabold text-[#ffe173]">
            ₹{avgRevPerTournament.toLocaleString()}
          </div>
          <p className="text-[11px] text-[#8e9dae] font-sans">
            Average collected revenue across all official competition lobbies
          </p>
        </div>
      </div>

    </div>
  )
}
