import React from 'react'
import { Clock } from 'lucide-react'

export default function ActivityFeed({ activities = [] }) {
  return (
    <div className="bg-[#18181b]/60 backdrop-blur-md border border-[#27272a] rounded-2xl p-5 space-y-4 shadow-xl">
      <div className="flex items-center gap-2 border-b border-[#27272a] pb-3">
        <Clock className="w-4 h-4 text-[#00f2ff]" />
        <h3 className="font-headline text-sm font-bold text-white uppercase tracking-wider">
          System Live Stream
        </h3>
      </div>
      
      {activities.length === 0 ? (
        <div className="py-6 text-center text-[#a1a1aa] font-mono text-xs">
          No system activities logged yet.
        </div>
      ) : (
        <div className="relative pl-6 space-y-5 border-l border-[#27272a]/60 ml-3 font-mono">
          {activities.map((act) => {
            const Icon = act.icon || Clock
            return (
              <div key={act.id} className="relative group">
                <div className={`absolute -left-[30px] top-1 w-6 h-6 rounded-full flex items-center justify-center border ${act.bgColor} ${act.borderColor} ${act.color} group-hover:scale-110 transition-transform`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-xs font-bold text-white font-headline uppercase">{act.title}</span>
                    <span className="text-[9px] text-[#a1a1aa]">{act.time}</span>
                  </div>
                  <p className="text-[10.5px] text-[#a1a1aa] leading-relaxed">{act.description}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
