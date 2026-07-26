import React, { useState } from 'react'
import { TrendingUp, BarChart2 } from 'lucide-react'
import { RevenueGroupedData } from '../../utils/financeCalculations'

interface RevenueChartProps {
  groupedData: RevenueGroupedData
}

export const RevenueChart: React.FC<RevenueChartProps> = ({ groupedData }) => {
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('daily')

  const chartData = groupedData[period] || []
  const maxAmount = Math.max(...chartData.map((d: any) => d.amount), 1)

  return (
    <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-5 space-y-4 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#3a494b]/60 pb-3">
        <h3 className="font-display-lg text-sm font-extrabold text-white uppercase flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-[#00f2ff]" />
          <span>REVENUE TREND ANALYTICS</span>
        </h3>

        {/* Period Selector Tabs */}
        <div className="flex items-center gap-1 bg-[#07090c] p-1 rounded border border-[#3a494b]/60 text-xs font-mono font-bold">
          {(['daily', 'weekly', 'monthly', 'yearly'] as const).map((p) => (
            <button
              key={`chart-period-${p}`}
              onClick={() => setPeriod(p)}
              className={`px-2.5 py-1 rounded uppercase transition-colors ${
                period === p
                  ? 'bg-[#00f2ff] text-[#00363a] font-extrabold'
                  : 'text-[#8e9dae] hover:text-white'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {chartData.length === 0 ? (
        <div className="py-12 text-center text-[#8e9dae] text-xs font-mono">
          No verified revenue entries for the selected period.
        </div>
      ) : (
        <div className="space-y-3 pt-2">
          <div className="h-44 flex items-end justify-between gap-2 pt-4 px-2 border-b border-[#3a494b]/40">
            {chartData.slice(-10).map((item: any, idx: number) => {
              const label = item.date || item.week || item.month || item.year
              const heightPct = Math.max(12, Math.round((item.amount / maxAmount) * 100))

              return (
                <div key={`bar-${idx}`} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group relative">
                  {/* Tooltip on hover */}
                  <div className="absolute -top-7 opacity-0 group-hover:opacity-100 transition-opacity bg-[#07090c] border border-[#00f2ff] px-2 py-0.5 rounded text-[10px] font-mono text-[#00f2ff] font-bold whitespace-nowrap z-20 pointer-events-none">
                    ₹{item.amount.toLocaleString()}
                  </div>

                  <div
                    className="w-full max-w-[36px] bg-gradient-to-t from-[#00f2ff]/30 via-[#00f2ff] to-[#74f5ff] rounded-t transition-all duration-500 group-hover:brightness-125 shadow-[0_0_12px_rgba(0,242,255,0.3)]"
                    style={{ height: `${heightPct}%` }}
                  />
                  <span className="text-[9px] font-mono text-[#8e9dae] truncate max-w-full uppercase">{label}</span>
                </div>
              )
            })}
          </div>

          <div className="flex justify-between items-center text-[10px] font-mono text-[#8e9dae]">
            <span>Showing verified successful payments</span>
            <span className="text-[#00f2ff] font-bold">Peak: ₹{maxAmount.toLocaleString()}</span>
          </div>
        </div>
      )}
    </div>
  )
}
