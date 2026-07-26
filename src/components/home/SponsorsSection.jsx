import React from 'react'
import { ShieldCheck } from 'lucide-react'

export const SponsorsSection = () => {
  const sponsors = [
    { name: 'RAZORPAY', type: 'OFFICIAL PAYMENT PARTNER' },
    { name: 'SUPABASE', type: 'CLOUD DATABASE PROVIDER' },
    { name: 'GOOGLE STITCH', type: 'DESIGN SYSTEM INFRASTRUCTURE' },
    { name: 'FREE FIRE MAX', type: 'OFFICIAL GAME TITLE' },
    { name: 'BGMI MOBILE', type: 'OFFICIAL GAME TITLE' },
  ]

  return (
    <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-5 space-y-4 shadow-xl text-center">
      <div className="flex items-center justify-center gap-2 border-b border-[#3a494b]/40 pb-3">
        <ShieldCheck className="w-4 h-4 text-[#00ff9d]" />
        <span className="font-mono text-xs font-bold text-[#8e9dae] uppercase tracking-widest">
          OFFICIAL ARENA SPONSORS & INFRASTRUCTURE PARTNERS
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 pt-1">
        {sponsors.map((s, idx) => (
          <div
            key={`sponsor-${idx}`}
            className="p-3 bg-[#07090c] border border-[#3a494b]/40 rounded-lg flex flex-col items-center justify-center gap-1 hover:border-[#00f2ff] transition-all group"
          >
            <span className="font-display-lg text-xs sm:text-sm font-extrabold text-white group-hover:text-[#00f2ff] tracking-wider transition-colors">
              {s.name}
            </span>
            <span className="text-[8px] font-mono text-[#8e9dae] uppercase tracking-tight">
              {s.type}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
