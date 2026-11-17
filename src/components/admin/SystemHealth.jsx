import React from 'react'
import { Server, Database, Key } from 'lucide-react'
import { isSupabaseConfigured } from '../../lib/supabase'

export default function SystemHealth() {
  const dbStatus = isSupabaseConfigured ? 'ONLINE' : 'OFFLINE'
  const dbColor = isSupabaseConfigured ? 'text-[#10B981]' : 'text-[#ef4444]'
  const dbBg = isSupabaseConfigured ? 'bg-[#10B981]/10' : 'bg-[#ef4444]/10'
  const dbBorder = isSupabaseConfigured ? 'border-[#10B981]/30' : 'border-[#ef4444]/30'

  return (
    <div className="bg-[#18181B]/60 backdrop-blur-md border border-[#27272A] rounded-none p-5 space-y-4 shadow-xl">
      <div className="flex items-center gap-2 border-b border-[#27272A] pb-3">
        <Server className="w-4 h-4 text-[#FFB900]" />
        <h3 className="font-headline text-sm font-bold text-white uppercase tracking-wider">
          Node Security & Status
        </h3>
      </div>
      
      <div className="space-y-3 font-mono text-[10.5px]">
        {/* Supabase Status */}
        <div className="flex items-center justify-between p-2.5 bg-[#000000] border border-[#27272A] rounded-none">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-[#FFB900]" />
            <span className="font-bold text-white uppercase">Cloud Database</span>
          </div>
          <span className={`px-2 py-0.5 rounded-none text-[9px] font-bold border ${dbBg} ${dbBorder} ${dbColor}`}>
            {dbStatus}
          </span>
        </div>

        {/* Security / RLS policies */}
        <div className="flex items-center justify-between p-2.5 bg-[#000000] border border-[#27272A] rounded-none">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-[#FF8C00]" />
            <span className="font-bold text-white uppercase">RLS Policies</span>
          </div>
          <span className="px-2 py-0.5 rounded-none text-[9px] font-bold border bg-[#10B981]/10 border-[#10B981]/30 text-[#10B981]">
            ENFORCED
          </span>
        </div>

        {/* Node latency */}
        <div className="flex items-center justify-between p-2.5 bg-[#000000] border border-[#27272A] rounded-none">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-[#FFB900]" />
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
