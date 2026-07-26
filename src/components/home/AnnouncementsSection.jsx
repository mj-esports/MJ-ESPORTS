import React from 'react'
import { Bell, Flame, ShieldAlert, ArrowRight } from 'lucide-react'

export const AnnouncementsSection = () => {
  const announcements = [
    {
      id: 'ann-1',
      tag: 'SEASON UPDATE',
      title: 'Free Fire MAX Pro League Season 4 Registrations Open!',
      date: 'TODAY',
      urgent: true,
    },
    {
      id: 'ann-2',
      tag: 'RULES & FAIR PLAY',
      title: 'Updated Anti-Cheat Guidelines and Emulator Ban Directives for BGMI Tournaments',
      date: '2 DAYS AGO',
      urgent: false,
    },
  ]

  return (
    <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-4 sm:p-5 space-y-4 shadow-xl">
      <div className="flex items-center justify-between border-b border-[#3a494b]/60 pb-3">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-[#00f2ff] animate-pulse" />
          <h3 className="font-display-lg text-sm sm:text-base font-extrabold text-white uppercase tracking-wider">
            OFFICIAL ANNOUNCEMENTS
          </h3>
        </div>
        <span className="text-[10px] font-mono font-bold text-[#00ff9d] bg-[#00ff9d]/10 px-2.5 py-0.5 rounded border border-[#00ff9d]/30">
          LIVE TICKER
        </span>
      </div>

      <div className="space-y-3">
        {announcements.map((item) => (
          <div
            key={item.id}
            className="p-3 bg-[#07090c] border border-[#3a494b]/40 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:border-[#00f2ff] transition-all group cursor-pointer"
          >
            <div className="flex items-start sm:items-center gap-2.5">
              {item.urgent ? (
                <Flame className="w-4 h-4 text-[#fe6b00] shrink-0 mt-0.5 sm:mt-0 animate-bounce" />
              ) : (
                <ShieldAlert className="w-4 h-4 text-[#00f2ff] shrink-0 mt-0.5 sm:mt-0" />
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-mono font-extrabold text-[#00f2ff] uppercase tracking-wider">
                    [{item.tag}]
                  </span>
                  <span className="text-[10px] font-mono text-[#8e9dae]">{item.date}</span>
                </div>
                <p className="text-xs font-bold text-white group-hover:text-[#00f2ff] transition-colors line-clamp-1">
                  {item.title}
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-[#8e9dae] group-hover:text-[#00f2ff] transition-colors shrink-0 hidden sm:block" />
          </div>
        ))}
      </div>
    </div>
  )
}
