import React from 'react'
import { MatchScheduleItem } from '../../types/esports'
import { Clock, Bell, Radio } from 'lucide-react'

interface ScheduleWidgetProps {
  schedules?: MatchScheduleItem[]
}

const DEFAULT_SCHEDULES: MatchScheduleItem[] = [
  { id: 'm-1', time: '20:30', team1: 'Total Gaming', team2: 'Orangutan', team1Short: 'TG', team2Short: 'OG' },
  { id: 'm-2', time: '21:15', team1: 'GodLike', team2: 'Team Soul', team1Short: 'GL', team2Short: 'SOUL' },
  { id: 'm-3', time: '22:00', team1: 'EVOS Phoenix', team2: 'Magic Squad', team1Short: 'EVOS', team2Short: 'MS', isLive: true },
]

export const ScheduleWidget: React.FC<ScheduleWidgetProps> = ({ schedules = DEFAULT_SCHEDULES }) => {
  return (
    <div className="glass-panel border border-[#3a494b] rounded-lg overflow-hidden shadow-lg">
      <div className="bg-[#272a2e] px-4 py-3 border-b border-[#3a494b] flex items-center justify-between">
        <h3 className="font-display-lg text-[#00f2ff] font-extrabold text-sm uppercase tracking-wider flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#fe6b00]" />
          MATCH SCHEDULE
        </h3>
        <span className="text-[10px] font-mono text-[#b9cacb] uppercase font-bold">TODAY</span>
      </div>

      <div className="p-3 space-y-2">
        {schedules.map((item) => (
          <div
            key={`sched-${item.id}`}
            className={`flex items-center justify-between p-2.5 rounded transition-all duration-200 ${
              item.isLive
                ? 'bg-[#00f2ff]/10 border-l-4 border-[#00f2ff] text-white'
                : 'hover:bg-[#323538]/60 text-[#b9cacb]'
            }`}
          >
            <div className="flex items-center gap-2 font-mono text-xs font-bold shrink-0">
              <span className={item.isLive ? 'text-[#00f2ff]' : 'text-[#b9cacb]'}>{item.time}</span>
              {item.isLive && (
                <span className="w-2 h-2 rounded-full bg-[#00f2ff] animate-ping" />
              )}
            </div>

            <div className="flex items-center gap-2 flex-1 px-4 justify-center">
              <div className="w-7 h-7 bg-[#00f2ff]/20 border border-[#00f2ff]/40 rounded flex items-center justify-center font-bold text-[10px] text-[#00f2ff]">
                {item.team1Short}
              </div>
              <span className="text-[10px] font-bold text-[#b9cacb]">VS</span>
              <div className="w-7 h-7 bg-[#fe6b00]/20 border border-[#fe6b00]/40 rounded flex items-center justify-center font-bold text-[10px] text-[#ffb693]">
                {item.team2Short}
              </div>
            </div>

            <div className="shrink-0">
              {item.isLive ? (
                <span className="text-[10px] font-bold text-[#00f2ff] px-2 py-0.5 bg-[#00f2ff]/20 border border-[#00f2ff]/40 rounded flex items-center gap-1">
                  <Radio className="w-3 h-3 text-[#00f2ff] animate-pulse" />
                  LIVE
                </span>
              ) : (
                <button
                  className="text-[#b9cacb] hover:text-[#00f2ff] transition-colors p-1"
                  title="Set Reminder"
                >
                  <Bell className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
