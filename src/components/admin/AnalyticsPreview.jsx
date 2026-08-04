import React from 'react'
import { Activity, Gamepad2, Users } from 'lucide-react'

export default function AnalyticsPreview({ totalUsers = 0, totalRegistrations = 0 }) {
  return (
    <div className="bg-[#18181b]/60 backdrop-blur-md border border-[#27272a] rounded-2xl p-5 space-y-4 shadow-xl">
      <div className="flex items-center gap-2 border-b border-[#27272a] pb-3">
        <Activity className="w-4 h-4 text-[#00f2ff]" />
        <h3 className="font-headline text-sm font-bold text-white uppercase tracking-wider">
          Telemetry & Traffic
        </h3>
      </div>
      
      <div className="space-y-4 font-mono text-xs">
        {/* Registration Rate Indicator */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[#a1a1aa] text-[10.5px]">
            <span>Lobby Fill Rate</span>
            <span className="text-[#00ff9d] font-bold">87% Capacity</span>
          </div>
          <div className="w-full h-2 bg-[#09090b] rounded-full overflow-hidden border border-[#27272a]">
            <div className="h-full bg-gradient-to-r from-[#00f2ff] to-[#00ff9d] rounded-full" style={{ width: '87%' }}></div>
          </div>
        </div>

        {/* Player Activity Rate Indicator */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[#a1a1aa] text-[10.5px]">
            <span>Weekly Active Users (WAU)</span>
            <span className="text-[#00f2ff] font-bold">92% Engagement</span>
          </div>
          <div className="w-full h-2 bg-[#09090b] rounded-full overflow-hidden border border-[#27272a]">
            <div className="h-full bg-gradient-to-r from-[#00f2ff] to-[#fe6b00] rounded-full" style={{ width: '92%' }}></div>
          </div>
        </div>
        
        {/* Short Summary Grid */}
        <div className="grid grid-cols-2 gap-2 text-center pt-2">
          <div className="p-2 bg-[#09090b] border border-[#27272a] rounded-xl">
            <span className="text-[9px] text-[#a1a1aa] uppercase font-bold block">Avg Winnings</span>
            <span className="text-white font-bold text-xs">₹4,500</span>
          </div>
          <div className="p-2 bg-[#09090b] border border-[#27272a] rounded-xl">
            <span className="text-[9px] text-[#a1a1aa] uppercase font-bold block">Peak Concurrency</span>
            <span className="text-white font-bold text-xs">280 Players</span>
          </div>
        </div>
      </div>
    </div>
  )
}
