import React from 'react'
import { DollarSign, CheckCircle2, Clock, XCircle, RotateCcw, Users, Trophy, Percent } from 'lucide-react'
import { FinanceSummaryMetrics } from '../../utils/financeCalculations'

interface FinanceSummaryCardsProps {
  metrics: FinanceSummaryMetrics
}

export const FinanceSummaryCards: React.FC<FinanceSummaryCardsProps> = ({ metrics }) => {
  return (
    <div className="space-y-4">
      {/* Primary Revenue Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-5 space-y-2 shadow-xl border-l-4 border-l-[#00f2ff]">
          <span className="font-mono text-[10px] text-[#8e9dae] uppercase tracking-widest block">TOTAL REVENUE</span>
          <div className="font-mono text-2xl font-extrabold text-[#00f2ff]">
            ₹{metrics.totalRevenue.toLocaleString()}
          </div>
          <span className="text-[11px] text-[#00ff9d] font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Verified Razorpay Payments
          </span>
        </div>

        {/* Today's Revenue */}
        <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-5 space-y-2 shadow-xl border-l-4 border-l-[#fe6b00]">
          <span className="font-mono text-[10px] text-[#8e9dae] uppercase tracking-widest block">TODAY'S REVENUE</span>
          <div className="font-mono text-2xl font-extrabold text-[#ffb693]">
            ₹{metrics.todayRevenue.toLocaleString()}
          </div>
          <span className="text-[11px] text-[#8e9dae]">24-Hour Volume</span>
        </div>

        {/* Weekly Revenue */}
        <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-5 space-y-2 shadow-xl border-l-4 border-l-[#00f2ff]">
          <span className="font-mono text-[10px] text-[#8e9dae] uppercase tracking-widest block">WEEKLY REVENUE</span>
          <div className="font-mono text-2xl font-extrabold text-[#00f2ff]">
            ₹{metrics.weeklyRevenue.toLocaleString()}
          </div>
          <span className="text-[11px] text-[#8e9dae]">Last 7 Days</span>
        </div>

        {/* Monthly Revenue */}
        <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-5 space-y-2 shadow-xl border-l-4 border-l-[#ffe173]">
          <span className="font-mono text-[10px] text-[#8e9dae] uppercase tracking-widest block">MONTHLY REVENUE</span>
          <div className="font-mono text-2xl font-extrabold text-[#ffe173]">
            ₹{metrics.monthlyRevenue.toLocaleString()}
          </div>
          <span className="text-[11px] text-[#8e9dae]">Last 30 Days</span>
        </div>
      </div>

      {/* Payment Status Counts & Volume Summary Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 font-mono text-xs">
        <div className="bg-[#151a21] p-3 rounded-lg border border-[#3a494b]/60 text-center">
          <span className="text-[10px] text-[#8e9dae] block">SUCCESS</span>
          <span className="font-extrabold text-[#00ff9d] text-base">{metrics.successfulCount}</span>
        </div>

        <div className="bg-[#151a21] p-3 rounded-lg border border-[#3a494b]/60 text-center">
          <span className="text-[10px] text-[#8e9dae] block">PENDING</span>
          <span className="font-extrabold text-[#00f2ff] text-base">{metrics.pendingCount}</span>
        </div>

        <div className="bg-[#151a21] p-3 rounded-lg border border-[#3a494b]/60 text-center">
          <span className="text-[10px] text-[#8e9dae] block">FAILED</span>
          <span className="font-extrabold text-[#ff3366] text-base">{metrics.failedCount}</span>
        </div>

        <div className="bg-[#151a21] p-3 rounded-lg border border-[#3a494b]/60 text-center">
          <span className="text-[10px] text-[#8e9dae] block">REFUNDED</span>
          <span className="font-extrabold text-[#fe6b00] text-base">{metrics.refundedCount}</span>
        </div>

        <div className="bg-[#151a21] p-3 rounded-lg border border-[#3a494b]/60 text-center">
          <span className="text-[10px] text-[#8e9dae] block">REGISTRATIONS</span>
          <span className="font-extrabold text-white text-base">{metrics.totalRegistrations}</span>
        </div>

        <div className="bg-[#151a21] p-3 rounded-lg border border-[#3a494b]/60 text-center col-span-2 sm:col-span-1">
          <span className="text-[10px] text-[#8e9dae] block">AVG ENTRY FEE</span>
          <span className="font-extrabold text-[#00f2ff] text-base">₹{metrics.avgEntryFee}</span>
        </div>
      </div>
    </div>
  )
}
