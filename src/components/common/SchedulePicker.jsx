import React, { useState, useMemo, useEffect } from 'react'
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  CheckCircle2,
  Sparkles,
  Radio,
  Lock,
  Zap,
  Play,
  Trophy,
  ChevronRight,
  Info,
  Layers,
  ArrowRight
} from 'lucide-react'

// Helper to format ISO date to readable string
const formatReadableDate = (dateStr) => {
  if (!dateStr) return 'No Date Selected'
  try {
    const [year, month, day] = dateStr.split('-').map(Number)
    if (!year || !month || !day) return dateStr
    const d = new Date(year, month - 1, day)
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  } catch (e) {
    return dateStr
  }
}

// Helper to convert HH:MM to 12-hour format with AM/PM
const format12HourTime = (timeStr) => {
  if (!timeStr) return '06:00 PM IST'
  if (timeStr.includes('AM') || timeStr.includes('PM')) return timeStr
  try {
    const [h, m] = timeStr.split(':').map(Number)
    if (isNaN(h) || isNaN(m)) return timeStr
    const period = h >= 12 ? 'PM' : 'AM'
    const displayH = h % 12 === 0 ? 12 : h % 12
    const displayM = m < 10 ? `0${m}` : m
    return `${displayH < 10 ? '0' + displayH : displayH}:${displayM} ${period} IST`
  } catch (e) {
    return timeStr
  }
}

// Helper to convert 12-hour format or HH:MM to 24h HH:MM for input[type="time"]
const convertTo24HourTime = (timeStr) => {
  if (!timeStr) return '18:00'
  if (timeStr.includes(':') && !timeStr.includes('AM') && !timeStr.includes('PM')) {
    const parts = timeStr.split(':')
    const h = parts[0].padStart(2, '0')
    const m = parts[1].slice(0, 2).padStart(2, '0')
    return `${h}:${m}`
  }
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i)
  if (!match) return '18:00'
  let hours = parseInt(match[1], 10)
  const minutes = match[2]
  const period = match[3] ? match[3].toUpperCase() : null

  if (period === 'PM' && hours < 12) hours += 12
  if (period === 'AM' && hours === 12) hours = 0

  return `${hours < 10 ? '0' + hours : hours}:${minutes}`
}

// Helper to calculate time offset string
const calculateTimeWithOffset = (baseTime24, offsetMinutes) => {
  const [h, m] = baseTime24.split(':').map(Number)
  const date = new Date()
  date.setHours(h, m, 0, 0)
  date.setMinutes(date.getMinutes() + offsetMinutes)
  
  const resH = date.getHours()
  const resM = date.getMinutes()
  const period = resH >= 12 ? 'PM' : 'AM'
  const displayH = resH % 12 === 0 ? 12 : resH % 12
  const displayM = resM < 10 ? `0${resM}` : resM
  return `${displayH < 10 ? '0' + displayH : displayH}:${displayM} ${period} IST`
}

export default function SchedulePicker({
  startDate = '',
  startTime = '',
  onChange,
  readOnly = false,
  showTimelineOnly = false,
  tournamentTitle = 'Cyberpunk Tournament'
}) {
  // Local State
  const [dateVal, setDateVal] = useState(() => {
    if (startDate) return startDate
    const today = new Date()
    return today.toISOString().split('T')[0]
  })

  const [timeVal, setTimeVal] = useState(() => {
    return convertTo24HourTime(startTime)
  })

  const [checkInOffset, setCheckInOffset] = useState(-45) // 45 mins prior
  const [roomIdOffset, setRoomIdOffset] = useState(-15) // 15 mins prior
  const [matchDuration, setMatchDuration] = useState(45) // 45 mins match
  const [customMilestones, setCustomMilestones] = useState([])
  
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('')
  const [newMilestoneOffset, setNewMilestoneOffset] = useState(30)
  const [showAddMilestone, setShowAddMilestone] = useState(false)
  const [activeStageId, setActiveStageId] = useState(null)

  // Synchronize local state if props change externally
  useEffect(() => {
    if (startDate && startDate !== dateVal) {
      setDateVal(startDate)
    }
  }, [startDate])

  useEffect(() => {
    if (startTime) {
      const converted = convertTo24HourTime(startTime)
      if (converted !== timeVal) {
        setTimeVal(converted)
      }
    }
  }, [startTime])

  // Compute standard dynamic timeline items based on local state
  const timeline = useMemo(() => {
    const formattedStartTime = format12HourTime(timeVal)
    
    const defaultStages = [
      {
        id: 'reg-close',
        title: 'Registration & Check-In Window Opens',
        time: calculateTimeWithOffset(timeVal, checkInOffset),
        offsetMins: checkInOffset,
        type: 'checkin',
        status: 'Upcoming',
        badgeColor: 'border-[#00f2ff]/40 bg-[#00f2ff]/10 text-[#00f2ff]',
        dotColor: 'bg-[#00f2ff] shadow-[0_0_10px_#00f2ff]',
        icon: Lock,
        description: 'Captains must check in squads on the dashboard. Unconfirmed slots will be transferred to reserve teams.'
      },
      {
        id: 'room-release',
        title: 'Room ID & Password Dispatch',
        time: calculateTimeWithOffset(timeVal, roomIdOffset),
        offsetMins: roomIdOffset,
        type: 'room',
        status: 'Automated',
        badgeColor: 'border-[#a855f7]/40 bg-[#a855f7]/10 text-[#a855f7]',
        dotColor: 'bg-[#a855f7] shadow-[0_0_10px_#a855f7]',
        icon: Radio,
        description: 'Encrypted Room Credentials broadcasted directly to verified team captains.'
      },
      {
        id: 'match-start',
        title: 'Match 1 Kickoff & Official Live Stream',
        time: formattedStartTime,
        offsetMins: 0,
        type: 'match',
        status: 'LIVE',
        badgeColor: 'border-[#fe6b00]/40 bg-[#fe6b00]/10 text-[#fe6b00]',
        dotColor: 'bg-[#fe6b00] shadow-[0_0_12px_#fe6b00] animate-pulse',
        icon: Play,
        description: 'Lobby locks. Map deployment begins. Broadcast live on official YouTube & Twitch channels.'
      },
      {
        id: 'round-2',
        title: 'Match 2 / Continuation Round',
        time: calculateTimeWithOffset(timeVal, matchDuration),
        offsetMins: matchDuration,
        type: 'match',
        status: 'Scheduled',
        badgeColor: 'border-[#00ff9d]/40 bg-[#00ff9d]/10 text-[#00ff9d]',
        dotColor: 'bg-[#00ff9d] shadow-[0_0_10px_#00ff9d]',
        icon: Zap,
        description: 'Next map placement begins. Point leaderboard calculated live.'
      },
      {
        id: 'score-verify',
        title: 'Final Score Audit & Winner Ceremony',
        time: calculateTimeWithOffset(timeVal, matchDuration + 45),
        offsetMins: matchDuration + 45,
        type: 'ceremony',
        status: 'Finalizing',
        badgeColor: 'border-[#ffd700]/40 bg-[#ffd700]/10 text-[#ffd700]',
        dotColor: 'bg-[#ffd700] shadow-[0_0_10px_#ffd700]',
        icon: Trophy,
        description: 'Referee validation of elimination screenshots & prize distribution to winner wallet balances.'
      }
    ]

    // Merge custom local state milestones
    const customStages = customMilestones.map((m) => ({
      id: m.id,
      title: m.title,
      time: calculateTimeWithOffset(timeVal, m.offsetMins),
      offsetMins: m.offsetMins,
      type: 'custom',
      status: 'Custom Stage',
      badgeColor: 'border-white/30 bg-white/5 text-white',
      dotColor: 'bg-white shadow-[0_0_8px_#ffffff]',
      icon: Sparkles,
      description: m.description || 'Custom schedule milestone.',
      isCustom: true
    }))

    const combined = [...defaultStages, ...customStages]
    combined.sort((a, b) => a.offsetMins - b.offsetMins)
    return combined
  }, [timeVal, checkInOffset, roomIdOffset, matchDuration, customMilestones])

  // Handle local state updates and notify parent
  const handleDateChange = (e) => {
    const newDate = e.target.value
    setDateVal(newDate)
    if (onChange) {
      onChange({
        startDate: newDate,
        startTime: format12HourTime(timeVal),
        timeline
      })
    }
  }

  const handleTimeChange = (e) => {
    const newTime = e.target.value
    setTimeVal(newTime)
    if (onChange) {
      onChange({
        startDate: dateVal,
        startTime: format12HourTime(newTime),
        timeline
      })
    }
  }

  const handleDatePreset = (daysFromNow) => {
    const d = new Date()
    d.setDate(d.getDate() + daysFromNow)
    const isoDate = d.toISOString().split('T')[0]
    setDateVal(isoDate)
    if (onChange) {
      onChange({
        startDate: isoDate,
        startTime: format12HourTime(timeVal),
        timeline
      })
    }
  }

  const handleTimePreset = (time24) => {
    setTimeVal(time24)
    if (onChange) {
      onChange({
        startDate: dateVal,
        startTime: format12HourTime(time24),
        timeline
      })
    }
  }

  const handleAddMilestone = () => {
    if (!newMilestoneTitle.trim()) return
    const newM = {
      id: `custom-${Date.now()}`,
      title: newMilestoneTitle.trim(),
      offsetMins: Number(newMilestoneOffset) || 30,
      description: `Scheduled +${newMilestoneOffset}m relative to start.`
    }
    setCustomMilestones((prev) => [...prev, newM])
    setNewMilestoneTitle('')
    setShowAddMilestone(false)
  }

  const handleRemoveMilestone = (id) => {
    setCustomMilestones((prev) => prev.filter((m) => m.id !== id))
  }

  return (
    <div className="space-y-6 text-white font-mono text-xs">
      
      {/* SECTION 1: NATIVE DATE & TIME PICKERS (Only shown if not timeline-only) */}
      {!showTimelineOnly && !readOnly && (
        <div className="bg-[#0b0e14] p-5 rounded-2xl border border-[#00f2ff]/30 shadow-[0_0_20px_rgba(0,242,255,0.05)] space-y-5">
          <div className="flex items-center justify-between border-b border-[#3a494b]/50 pb-3">
            <div className="flex items-center gap-2 text-[#00f2ff]">
              <Calendar className="w-4 h-4" />
              <span className="font-bold uppercase tracking-wider text-xs">Schedule Configuration & Native Controls</span>
            </div>
            <span className="text-[10px] text-[#8e9dae] uppercase font-semibold">Local State Sync</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* Native Date Picker Container */}
            <div className="space-y-2">
              <label className="flex items-center justify-between text-[11px] font-bold text-[#8e9dae] uppercase tracking-wide">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#00f2ff]" />
                  Tournament Date
                </span>
                <span className="text-[#00f2ff] text-[10px] normal-case">
                  {formatReadableDate(dateVal)}
                </span>
              </label>

              <div className="relative">
                <input
                  type="date"
                  value={dateVal}
                  onChange={handleDateChange}
                  className="w-full bg-[#151a21] border border-[#3a494b] rounded-xl px-4 py-3 text-white text-xs focus:outline-none focus:border-[#00f2ff] focus:ring-1 focus:ring-[#00f2ff] transition-all cursor-pointer"
                />
              </div>

              {/* Date Presets */}
              <div className="flex items-center gap-1.5 pt-1 overflow-x-auto hide-scrollbar">
                <span className="text-[9px] text-[#8e9dae] font-bold uppercase mr-1">Quick:</span>
                <button
                  type="button"
                  onClick={() => handleDatePreset(0)}
                  className="px-2.5 py-1 rounded bg-[#151a21] hover:bg-[#00f2ff]/20 text-[#8e9dae] hover:text-[#00f2ff] border border-[#3a494b] hover:border-[#00f2ff]/40 text-[10px] font-semibold transition-all"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => handleDatePreset(1)}
                  className="px-2.5 py-1 rounded bg-[#151a21] hover:bg-[#00f2ff]/20 text-[#8e9dae] hover:text-[#00f2ff] border border-[#3a494b] hover:border-[#00f2ff]/40 text-[10px] font-semibold transition-all"
                >
                  Tomorrow
                </button>
                <button
                  type="button"
                  onClick={() => handleDatePreset(3)}
                  className="px-2.5 py-1 rounded bg-[#151a21] hover:bg-[#00f2ff]/20 text-[#8e9dae] hover:text-[#00f2ff] border border-[#3a494b] hover:border-[#00f2ff]/40 text-[10px] font-semibold transition-all"
                >
                  +3 Days
                </button>
                <button
                  type="button"
                  onClick={() => handleDatePreset(7)}
                  className="px-2.5 py-1 rounded bg-[#151a21] hover:bg-[#00f2ff]/20 text-[#8e9dae] hover:text-[#00f2ff] border border-[#3a494b] hover:border-[#00f2ff]/40 text-[10px] font-semibold transition-all"
                >
                  +7 Days
                </button>
              </div>
            </div>

            {/* Native Time Picker Container */}
            <div className="space-y-2">
              <label className="flex items-center justify-between text-[11px] font-bold text-[#8e9dae] uppercase tracking-wide">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#fe6b00]" />
                  Match Start Time
                </span>
                <span className="text-[#fe6b00] text-[10px] normal-case">
                  {format12HourTime(timeVal)}
                </span>
              </label>

              <div className="relative">
                <input
                  type="time"
                  value={timeVal}
                  onChange={handleTimeChange}
                  className="w-full bg-[#151a21] border border-[#3a494b] rounded-xl px-4 py-3 text-white text-xs focus:outline-none focus:border-[#fe6b00] focus:ring-1 focus:ring-[#fe6b00] transition-all cursor-pointer"
                />
              </div>

              {/* Time Slots Presets */}
              <div className="flex items-center gap-1.5 pt-1 overflow-x-auto hide-scrollbar">
                <span className="text-[9px] text-[#8e9dae] font-bold uppercase mr-1">Slots:</span>
                {[
                  { label: '04:00 PM', val: '16:00' },
                  { label: '06:00 PM', val: '18:00' },
                  { label: '08:00 PM', val: '20:00' },
                  { label: '10:00 PM', val: '22:00' }
                ].map((slot) => (
                  <button
                    key={`time-preset-${slot.val}`}
                    type="button"
                    onClick={() => handleTimePreset(slot.val)}
                    className="px-2.5 py-1 rounded bg-[#151a21] hover:bg-[#fe6b00]/20 text-[#8e9dae] hover:text-[#fe6b00] border border-[#3a494b] hover:border-[#fe6b00]/40 text-[10px] font-semibold transition-all"
                  >
                    {slot.label}
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* Local State Operational Offset Controls */}
          <div className="pt-2 border-t border-[#3a494b]/40 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <span className="text-[10px] text-[#8e9dae] block mb-1">Check-in Window:</span>
              <select
                value={checkInOffset}
                onChange={(e) => setCheckInOffset(Number(e.target.value))}
                className="w-full bg-[#151a21] border border-[#3a494b] rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-[#00f2ff] focus:outline-none"
              >
                <option value={-60}>60 Mins Before</option>
                <option value={-45}>45 Mins Before</option>
                <option value={-30}>30 Mins Before</option>
              </select>
            </div>

            <div>
              <span className="text-[10px] text-[#8e9dae] block mb-1">Room ID Release:</span>
              <select
                value={roomIdOffset}
                onChange={(e) => setRoomIdOffset(Number(e.target.value))}
                className="w-full bg-[#151a21] border border-[#3a494b] rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-[#a855f7] focus:outline-none"
              >
                <option value={-20}>20 Mins Before</option>
                <option value={-15}>15 Mins Before</option>
                <option value={-10}>10 Mins Before</option>
              </select>
            </div>

            <div>
              <span className="text-[10px] text-[#8e9dae] block mb-1">Match 1 Estimated Duration:</span>
              <select
                value={matchDuration}
                onChange={(e) => setMatchDuration(Number(e.target.value))}
                className="w-full bg-[#151a21] border border-[#3a494b] rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-[#00ff9d] focus:outline-none"
              >
                <option value={30}>30 Mins</option>
                <option value={45}>45 Mins</option>
                <option value={60}>60 Mins</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: DYNAMIC CYBERPUNK TIMELINE PREVIEW */}
      <div className="bg-[#07090c] border border-[#3a494b]/60 rounded-2xl p-5 md:p-6 space-y-5 shadow-2xl relative overflow-hidden">
        
        {/* Glow backdrop decorative accent */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-radial from-[#00f2ff]/10 via-transparent to-transparent pointer-events-none rounded-full blur-2xl" />

        {/* Header bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#3a494b]/60 pb-4 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#00f2ff] animate-pulse" />
              <h4 className="font-headline text-sm font-black text-white uppercase tracking-wider">
                Live Timeline Preview
              </h4>
            </div>
            <p className="text-[11px] text-[#8e9dae] mt-0.5">
              Target Date: <strong className="text-[#00f2ff]">{formatReadableDate(dateVal)}</strong> &bull; Match Kickoff: <strong className="text-[#fe6b00]">{format12HourTime(timeVal)}</strong>
            </p>
          </div>

          {!readOnly && (
            <button
              type="button"
              onClick={() => setShowAddMilestone(!showAddMilestone)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00f2ff]/10 hover:bg-[#00f2ff]/20 border border-[#00f2ff]/40 text-[#00f2ff] text-[10px] font-bold uppercase tracking-wider transition-all self-start sm:self-auto cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Custom Stage</span>
            </button>
          )}
        </div>

        {/* Add custom stage mini form */}
        {showAddMilestone && !readOnly && (
          <div className="p-4 bg-[#151a21] border border-[#00f2ff]/40 rounded-xl space-y-3 relative z-10 animate-fadeIn">
            <div className="text-xs font-bold text-[#00f2ff] uppercase">Add Milestone Event to Timeline</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                value={newMilestoneTitle}
                onChange={(e) => setNewMilestoneTitle(e.target.value)}
                placeholder="Stage Name (e.g., Stream Pre-Show)"
                className="col-span-2 bg-[#07090c] border border-[#3a494b] rounded-lg px-3 py-2 text-xs text-white focus:border-[#00f2ff] focus:outline-none"
              />
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={newMilestoneOffset}
                  onChange={(e) => setNewMilestoneOffset(e.target.value)}
                  placeholder="Offset (Mins)"
                  className="w-full bg-[#07090c] border border-[#3a494b] rounded-lg px-3 py-2 text-xs text-white focus:border-[#00f2ff] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddMilestone}
                  className="px-4 py-2 bg-[#00f2ff] hover:bg-[#00d0dd] text-black font-bold text-xs rounded-lg uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap"
                >
                  Add
                </button>
              </div>
            </div>
            <span className="text-[10px] text-[#8e9dae] block">
              Enter positive minutes (after start time) or negative minutes (before start time).
            </span>
          </div>
        )}

        {/* TIMELINE LIST */}
        <div className="relative pt-2 pb-2 pl-4 md:pl-6 space-y-6 relative z-10">
          
          {/* Vertical Neon Line */}
          <div className="absolute left-[19px] md:left-[27px] top-4 bottom-6 w-0.5 bg-gradient-to-b from-[#00f2ff] via-[#a855f7] to-[#ffd700] opacity-50" />

          {timeline.map((item, idx) => {
            const IconComp = item.icon
            const isFocused = activeStageId === item.id

            return (
              <div
                key={item.id}
                onClick={() => setActiveStageId(isFocused ? null : item.id)}
                className={`relative flex items-start gap-4 p-3.5 rounded-xl border transition-all cursor-pointer ${
                  isFocused
                    ? 'bg-[#151a21] border-[#00f2ff] shadow-[0_0_15px_rgba(0,242,255,0.15)]'
                    : 'bg-[#0e1218]/90 border-[#3a494b]/50 hover:border-[#3a494b] hover:bg-[#151a21]/60'
                }`}
              >
                {/* Node dot icon */}
                <div className={`relative z-10 w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center text-black font-bold text-xs shrink-0 ${item.dotColor}`}>
                  <IconComp className="w-3.5 h-3.5 text-black" />
                </div>

                {/* Content Details */}
                <div className="flex-1 space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-headline font-bold text-white text-xs md:text-sm">
                        {item.title}
                      </span>
                      {item.isCustom && !readOnly && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRemoveMilestone(item.id)
                          }}
                          className="text-[#ff4655] hover:text-red-400 p-0.5"
                          title="Remove Stage"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[#00f2ff] text-xs px-2 py-0.5 bg-[#00f2ff]/10 rounded border border-[#00f2ff]/30">
                        {item.time}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${item.badgeColor}`}>
                        {item.status}
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-[#8e9dae] leading-relaxed">
                    {item.description}
                  </p>

                  {/* Expanded offset metric */}
                  <div className="flex items-center gap-3 pt-1 text-[10px] text-[#8e9dae]">
                    <span>
                      Relative Timing:{' '}
                      <strong className="text-white font-mono">
                        {item.offsetMins === 0
                          ? 'Exact Match Kickoff'
                          : item.offsetMins < 0
                          ? `${Math.abs(item.offsetMins)}m Prior`
                          : `+${item.offsetMins}m Post Start`}
                      </strong>
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer info bar */}
        <div className="pt-3 border-t border-[#3a494b]/60 flex flex-wrap items-center justify-between text-[10px] text-[#8e9dae] relative z-10">
          <div className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-[#00f2ff]" />
            <span>All times strictly localized to Indian Standard Time (IST / UTC+5:30)</span>
          </div>
          <span className="text-[#00f2ff] font-bold">
            Total Pipeline Duration: ~2h 15m
          </span>
        </div>

      </div>

    </div>
  )
}
