import React from 'react'
import { Activity, Shield } from 'lucide-react'

export default function DashboardHeader({ title = 'Command Console', subtitle = 'Real-time match operations & telemetry stream' }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#18181b]/60 backdrop-blur-md border border-[#27272a] rounded-2xl p-4 shadow-xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#00f2ff]/10 border border-[#00f2ff]/30 flex items-center justify-center text-[#00f2ff]">
          <Shield className="w-5 h-5" />
        </div>
        <div>
          <h2 className="font-headline text-base font-black text-white uppercase tracking-wider">
            {title}
          </h2>
          <p className="text-xs text-[#a1a1aa] font-mono">{subtitle}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#00ff9d]/10 border border-[#00ff9d]/30 text-[#00ff9d] text-[10px] font-mono font-bold uppercase tracking-wider self-start sm:self-auto">
        <span className="w-2 h-2 rounded-full bg-[#00ff9d] animate-pulse"></span>
        <span>TELEMETRY ONLINE</span>
      </div>
    </div>
  )
}
