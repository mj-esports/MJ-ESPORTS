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
      color: 'text-[#FFB900]',
      borderColor: 'border-l-[#FFB900]',
    },
    {
      label: 'PRIZE DISTRIBUTED',
      value: defaultStats.totalPrizePool,
      icon: Trophy,
      color: 'text-[#FF8C00]',
      borderColor: 'border-l-[#FF8C00]',
    },
    {
      label: 'MATCHES PLAYED',
      value: defaultStats.matchesCompleted.toLocaleString(),
      icon: Gamepad2,
      color: 'text-white',
      borderColor: 'border-l-[#27272A]',
    },
    {
      label: 'LIVE TOURNAMENTS',
      value: defaultStats.liveTournaments.toString(),
      icon: Zap,
      color: 'text-[#FFB900]',
      borderColor: 'border-l-[#FFB900]',
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 py-1">
      {statItems.map((item, idx) => {
        const Icon = item.icon
        return (
          <div
            key={`stat-card-${idx}`}
            className={`bg-[#111215] border border-[#27272A] rounded-none p-3 sm:p-3.5 space-y-1 shadow-md border-l-4 ${item.borderColor} flex flex-col justify-center min-h-[76px] sm:min-h-[84px]`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[9px] sm:text-[10px] text-[#A1A1AA] uppercase tracking-wider font-bold truncate">
                {item.label}
              </span>
              <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${item.color} shrink-0`} />
            </div>
            <div className={`font-mono text-base sm:text-lg font-extrabold ${item.color} truncate`}>
              {item.value}
            </div>
          </div>
        )
      })}
    </div>
  )
}
