import React from 'react'

export default function StatCard({ title, value, subtext, icon: Icon, colorClass = 'text-[#FFB900]', hoverColorClass = 'hover:border-[#FFB900]/50', bgIconClass = 'bg-[#FFB900]/10', borderIconClass = 'border-[#FFB900]/30', loading }) {
  return (
    <div className={`bg-[#18181B]/60 backdrop-blur-md border border-[#27272A] rounded-none p-5 space-y-3 transition-all shadow-xl relative overflow-hidden group ${hoverColorClass}`}>
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs font-bold text-[#A1A1AA] uppercase tracking-wider">{title}</span>
        <div className={`w-9 h-9 rounded-none flex items-center justify-center border group-hover:scale-110 transition-transform ${bgIconClass} ${borderIconClass} ${colorClass}`}>
          {Icon && <Icon className="w-4 h-4" />}
        </div>
      </div>
      <div>
        <div className="font-mono text-2xl sm:text-3xl font-black text-white tracking-tight">
          {loading ? '...' : value}
        </div>
        {subtext && (
          <span className={`text-[10px] font-mono font-bold mt-1 block uppercase ${colorClass}`}>
            {subtext}
          </span>
        )}
      </div>
    </div>
  )
}
