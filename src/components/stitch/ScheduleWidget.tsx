import React, { useState, useEffect } from 'react'
import { Clock, Calendar, Radio, AlertCircle, RefreshCw } from 'lucide-react'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'

export interface MatchScheduleItem {
  id: string
  time: string
  title: string
  game: string
  status: 'Upcoming' | 'Live' | 'Completed'
}

export const ScheduleWidget: React.FC = () => {
  const [schedules, setSchedules] = useState<MatchScheduleItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSchedule = async () => {
    setLoading(true)
    setError(null)
    try {
      if (isSupabaseConfigured) {
        // Query tournaments from Supabase
        const { data, error: dbErr } = await supabase
          .from('tournaments')
          .select('id, title, game, status, start_date, created_at')
          .order('created_at', { ascending: false })

        if (dbErr) throw dbErr

        if (data && data.length > 0) {
          const todayStr = new Date().toISOString().split('T')[0]
          
          // Filter today's matches or active live/upcoming tournaments
          const todayMatches = data.filter((t) => {
            const isToday = t.start_date && t.start_date.includes(todayStr)
            const isLiveOrUpcoming = t.status === 'Live Now' || t.status === 'Registration Open' || t.status === 'Upcoming'
            return isToday || isLiveOrUpcoming
          })

          const mapped: MatchScheduleItem[] = (todayMatches.length > 0 ? todayMatches : data.slice(0, 4)).map((t) => {
            let statusVal: 'Upcoming' | 'Live' | 'Completed' = 'Upcoming'
            if (t.status === 'Live Now') statusVal = 'Live'
            else if (t.status === 'Completed') statusVal = 'Completed'

            const timeStr = t.start_date
              ? t.start_date.includes('T')
                ? t.start_date.split('T')[1].slice(0, 5)
                : '18:00'
              : '19:30'

            return {
              id: t.id,
              time: timeStr,
              title: t.title || 'Official Tournament',
              game: (t.game || 'Free Fire MAX').includes('Free Fire') ? 'Free Fire MAX' : 'BGMI Mobile',
              status: statusVal,
            }
          })

          setSchedules(mapped)
        } else {
          setSchedules([])
        }
      } else {
        setSchedules([])
      }
    } catch (err: any) {
      console.error('[Schedule Fetch Error]:', err)
      setError('Failed to load schedule')
      setSchedules([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSchedule()

    if (isSupabaseConfigured) {
      const channel = supabase
        .channel('schedule_widget_realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tournaments' }, () => {
          fetchSchedule()
        })
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [])

  return (
    <div className="glass-panel border border-[#3a494b] rounded-lg overflow-hidden shadow-lg">
      <div className="bg-[#272a2e] px-4 py-3 border-b border-[#3a494b] flex items-center justify-between">
        <h3 className="font-display-lg text-[#00f2ff] font-extrabold text-sm uppercase tracking-wider flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#fe6b00]" />
          MATCH SCHEDULE
        </h3>
        <span className="text-[10px] font-mono text-[#b9cacb] uppercase font-bold">TODAY</span>
      </div>

      <div className="p-3">
        {loading ? (
          /* Loading Skeletons */
          <div className="space-y-2 py-1">
            {[1, 2, 3].map((i) => (
              <div key={`skel-sched-${i}`} className="h-12 bg-[#111417] border border-[#3a494b]/40 rounded animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="p-4 text-center text-xs text-[#ff3366] flex flex-col items-center gap-2">
            <AlertCircle className="w-5 h-5 text-[#ff3366]" />
            <span>{error}</span>
            <button
              onClick={fetchSchedule}
              className="px-3 py-1 bg-[#111417] border border-[#3a494b] text-white rounded text-[10px] font-bold uppercase hover:text-[#00f2ff]"
            >
              <RefreshCw className="w-3 h-3 inline mr-1" /> Retry
            </button>
          </div>
        ) : schedules.length === 0 ? (
          /* Elegant Empty State as required */
          <div className="py-8 px-4 text-center space-y-3 bg-[#111417]/60 rounded border border-[#3a494b]/40 my-1">
            <div className="w-10 h-10 rounded-full bg-[#07090c] border border-[#3a494b] flex items-center justify-center mx-auto text-[#00f2ff]">
              <Calendar className="w-5 h-5 text-[#849495]" />
            </div>
            <div className="space-y-1">
              <h4 className="font-display-lg text-xs font-extrabold text-white uppercase">
                No Matches Scheduled Today
              </h4>
              <p className="text-[11px] text-[#849495] leading-relaxed max-w-xs mx-auto">
                Today's tournament schedule will appear here once matches are published by the admin.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {schedules.map((item) => (
              <div
                key={`sched-${item.id}`}
                className={`flex items-center justify-between p-2.5 rounded border transition-all duration-200 ${
                  item.status === 'Live'
                    ? 'bg-[#00f2ff]/10 border-[#00f2ff]/60 text-white'
                    : 'bg-[#111417] border-[#3a494b]/40 hover:border-[#00f2ff]/40 text-[#b9cacb]'
                }`}
              >
                <div className="flex items-center gap-2 font-mono text-xs font-bold shrink-0">
                  <span className={item.status === 'Live' ? 'text-[#00f2ff]' : 'text-[#b9cacb]'}>
                    {item.time}
                  </span>
                  {item.status === 'Live' && (
                    <span className="w-2 h-2 rounded-full bg-[#00f2ff] animate-ping" />
                  )}
                </div>

                <div className="flex-1 px-3 min-w-0">
                  <h4 className="text-xs font-bold text-white truncate">{item.title}</h4>
                  <span className="text-[10px] text-[#00f2ff] font-semibold block">{item.game}</span>
                </div>

                <div className="shrink-0">
                  {item.status === 'Live' ? (
                    <span className="text-[10px] font-bold text-[#00f2ff] px-2 py-0.5 bg-[#00f2ff]/20 border border-[#00f2ff]/40 rounded flex items-center gap-1">
                      <Radio className="w-3 h-3 text-[#00f2ff] animate-pulse" />
                      LIVE
                    </span>
                  ) : item.status === 'Completed' ? (
                    <span className="text-[10px] font-bold text-[#849495] px-2 py-0.5 bg-[#07090c] border border-[#3a494b] rounded">
                      COMPLETED
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-[#fe6b00] px-2 py-0.5 bg-[#fe6b00]/10 border border-[#fe6b00]/30 rounded">
                      UPCOMING
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
