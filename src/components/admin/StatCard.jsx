import React from 'react'

export default function StatCard({ title, value, subtext, icon: Icon, colorClass = 'text-[#00f2ff]', hoverColorClass = 'hover:border-[#00f2ff]/50', bgIconClass = 'bg-[#00f2ff]/10', borderIconClass = 'border-[#00f2ff]/30', loading }) {
  return (
    <div className={`bg-[#18181b]/60 backdrop-blur-md border border-[#27272a] rounded-2xl p-5 space-y-3 transition-all shadow-xl relative overflow-hidden group ${hoverColorClass}`}>
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs font-bold text-[#a1a1aa] uppercase tracking-wider">{title}</span>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center border group-hover:scale-110 transition-transform ${bgIconClass} ${borderIconClass} ${colorClass}`}>
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
