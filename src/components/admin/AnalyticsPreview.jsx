import React from 'react'
import { Activity } from 'lucide-react'

export default function AnalyticsPreview() {
  return (
    <div className="bg-[#18181b]/60 backdrop-blur-md border border-[#27272a] rounded-2xl p-5 space-y-4 shadow-xl">
      <div className="flex items-center gap-2 border-b border-[#27272a] pb-3">
        <Activity className="w-4 h-4 text-[#00f2ff]" />
        <h3 className="font-headline text-sm font-bold text-white uppercase tracking-wider">
          Telemetry & Traffic
        </h3>
      </div>
      <div className="py-6 text-center text-[#a1a1aa] font-mono text-xs">
        No analytics data available.
      </div>
    </div>
  )
}
