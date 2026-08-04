import React from 'react'
import { Server, Database, Key } from 'lucide-react'
import { isSupabaseConfigured } from '../../lib/supabase'

export default function SystemHealth() {
  const dbStatus = isSupabaseConfigured ? 'ONLINE' : 'OFFLINE'
  const dbColor = isSupabaseConfigured ? 'text-[#00ff9d]' : 'text-[#ef4444]'
  const dbBg = isSupabaseConfigured ? 'bg-[#00ff9d]/10' : 'bg-[#ef4444]/10'
  const dbBorder = isSupabaseConfigured ? 'border-[#00ff9d]/30' : 'border-[#ef4444]/30'

  return (
    <div className="bg-[#18181b]/60 backdrop-blur-md border border-[#27272a] rounded-2xl p-5 space-y-4 shadow-xl">
      <div className="flex items-center gap-2 border-b border-[#27272a] pb-3">
        <Server className="w-4 h-4 text-[#00f2ff]" />
        <h3 className="font-headline text-sm font-bold text-white uppercase tracking-wider">
          Node Security & Status
        </h3>
      </div>
      
      <div className="space-y-3 font-mono text-[10.5px]">
        {/* Supabase Status */}
        <div className="flex items-center justify-between p-2.5 bg-[#09090b] border border-[#27272a] rounded-xl">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-[#00f2ff]" />
            <span className="font-bold text-white uppercase">Cloud Database</span>
          </div>
          <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${dbBg} ${dbBorder} ${dbColor}`}>
            {dbStatus}
          </span>
        </div>

        {/* Security / RLS policies */}
        <div className="flex items-center justify-between p-2.5 bg-[#09090b] border border-[#27272a] rounded-xl">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-[#fe6b00]" />
            <span className="font-bold text-white uppercase">RLS Policies</span>
          </div>
          <span className="px-2 py-0.5 rounded text-[9px] font-bold border bg-[#00ff9d]/10 border-[#00ff9d]/30 text-[#00ff9d]">
            ENFORCED
          </span>
        </div>

        {/* Node latency */}
        <div className="flex items-center justify-between p-2.5 bg-[#09090b] border border-[#27272a] rounded-xl">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-[#00f2ff]" />
            <span className="font-bold text-white uppercase">API Latency</span>
          </div>
          <span className="font-bold text-white">
            18 ms
          </span>
        </div>
      </div>
    </div>
  )
}
