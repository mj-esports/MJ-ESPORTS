import React from 'react'
import { Clock, Shield, Gamepad2, CreditCard } from 'lucide-react'

export default function ActivityFeed({ activities = [] }) {
  const defaultActivities = [
    {
      id: 1,
      type: 'security',
      title: 'Admin Session Promoted',
      description: 'Superadmin privileges verified from public.user_roles.',
      time: '10m ago',
      icon: Shield,
      color: 'text-[#ef4444]',
      bgColor: 'bg-[#ef4444]/10',
      borderColor: 'border-[#ef4444]/30',
    },
    {
      id: 2,
      type: 'match',
      title: 'Lobby Live Started',
      description: 'Weekly Showdown #45 status updated to Live Now.',
      time: '45m ago',
      icon: Gamepad2,
      color: 'text-[#fe6b00]',
      bgColor: 'bg-[#fe6b00]/10',
      borderColor: 'border-[#fe6b00]/30',
    },
    {
      id: 3,
      type: 'payment',
      title: 'UPI Transaction Approved',
      description: 'TXN-998214 verified and accredited to Team SouL.',
      time: '2h ago',
      icon: CreditCard,
      color: 'text-[#00ff9d]',
      bgColor: 'bg-[#00ff9d]/10',
      borderColor: 'border-[#00ff9d]/30',
    },
  ]

  const list = activities.length > 0 ? activities : defaultActivities

  return (
    <div className="bg-[#18181b]/60 backdrop-blur-md border border-[#27272a] rounded-2xl p-5 space-y-4 shadow-xl">
      <div className="flex items-center gap-2 border-b border-[#27272a] pb-3">
        <Clock className="w-4 h-4 text-[#00f2ff]" />
        <h3 className="font-headline text-sm font-bold text-white uppercase tracking-wider">
          System Live Stream
        </h3>
      </div>
      
      <div className="relative pl-6 space-y-5 border-l border-[#27272a]/60 ml-3 font-mono">
        {list.map((act) => {
          const Icon = act.icon || Clock
          return (
            <div key={act.id} className="relative group">
              {/* Colored Indicator Dot */}
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
    </div>
  )
}
