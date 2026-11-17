import React from 'react'
import { Zap } from 'lucide-react'

export default function QuickActionGrid({ actions = [] }) {
  return (
    <div className="bg-[#18181B]/60 backdrop-blur-md border border-[#27272A] rounded-none p-5 space-y-4 shadow-xl">
      <h3 className="font-headline text-sm font-bold text-[#FFB900] uppercase tracking-wider flex items-center gap-2">
        <Zap className="w-4 h-4 text-[#FFB900] animate-pulse" />
        <span>Admin Command Center Quick Actions</span>
      </h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {actions.map((act, index) => {
          const Icon = act.icon
          return (
            <button
              key={index}
              onClick={act.onClick}
              className={`flex items-center justify-between p-4 bg-[#000000] border border-[#27272A] rounded-none transition-all text-left group cursor-pointer ${act.hoverColorClass || 'hover:border-[#FFB900]/60'}`}
            >
              <div className="space-y-1">
                <span className="block text-xs font-bold text-white uppercase font-headline">{act.title}</span>
                <span className="block text-[10px] text-[#A1A1AA] font-mono">{act.description}</span>
              </div>
              {Icon && <Icon className={`w-5 h-5 group-hover:translate-x-1 transition-transform ${act.colorClass || 'text-[#FFB900]'}`} />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
