import React from 'react'
import { Users, Trophy, Gamepad2, Zap } from 'lucide-react'

export const StatsSection = ({ stats }) => {
  const defaultStats = stats || {
    activePlayers: 0,
    totalPrizePool: '₹0',
    matchesCompleted: 0,
    liveTournaments: 0,
  }

  const statItems = [
    {
      label: 'ACTIVE PLAYERS',
      value: defaultStats.activePlayers.toLocaleString(),
      icon: Users,
      color: 'text-[#00f2ff]',
      borderColor: 'border-l-[#00f2ff]',
    },
    {
      label: 'PRIZE DISTRIBUTED',
      value: defaultStats.totalPrizePool,
      icon: Trophy,
      color: 'text-[#fe6b00]',
      borderColor: 'border-l-[#fe6b00]',
    },
    {
      label: 'MATCHES PLAYED',
      value: defaultStats.matchesCompleted.toLocaleString(),
      icon: Gamepad2,
      color: 'text-[#00ff9d]',
      borderColor: 'border-l-[#00ff9d]',
    },
    {
      label: 'LIVE TOURNAMENTS',
      value: defaultStats.liveTournaments.toString(),
      icon: Zap,
      color: 'text-[#ffe173]',
      borderColor: 'border-l-[#ffe173]',
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 py-4">
      {statItems.map((item, idx) => {
        const Icon = item.icon
        return (
          <div
            key={`stat-card-${idx}`}
            className={`bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-4 sm:p-5 space-y-2 shadow-xl border-l-4 ${item.borderColor} hover:border-[#00f2ff] transition-all hover:scale-[1.02]`}
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] sm:text-xs text-[#8e9dae] uppercase tracking-widest font-bold">
                {item.label}
              </span>
              <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${item.color}`} />
            </div>
            <div className={`font-mono text-xl sm:text-2xl font-extrabold ${item.color}`}>
              {item.value}
            </div>
          </div>
        )
      })}
    </div>
  )
}
