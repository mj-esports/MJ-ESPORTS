import React from 'react'
import { Zap } from 'lucide-react'

export default function QuickActionGrid({ actions = [] }) {
  return (
    <div className="bg-[#18181b]/60 backdrop-blur-md border border-[#27272a] rounded-2xl p-5 space-y-4 shadow-xl">
      <h3 className="font-headline text-sm font-bold text-[#00f2ff] uppercase tracking-wider flex items-center gap-2">
        <Zap className="w-4 h-4 text-[#ffb800] animate-pulse" />
        <span>Admin Command Center Quick Actions</span>
      </h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {actions.map((act, index) => {
          const Icon = act.icon
          return (
            <button
              key={index}
              onClick={act.onClick}
              className={`flex items-center justify-between p-4 bg-[#09090b] border border-[#27272a] rounded-xl transition-all text-left group cursor-pointer ${act.hoverColorClass || 'hover:border-[#00f2ff]/60'}`}
            >
              <div className="space-y-1">
                <span className="block text-xs font-bold text-white uppercase font-headline">{act.title}</span>
                <span className="block text-[10px] text-[#a1a1aa] font-mono">{act.description}</span>
              </div>
              {Icon && <Icon className={`w-5 h-5 group-hover:translate-x-1 transition-transform ${act.colorClass || 'text-[#00f2ff]'}`} />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
