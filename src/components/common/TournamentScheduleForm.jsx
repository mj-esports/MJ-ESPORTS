import React from 'react'
import { Calendar, Clock, AlertCircle } from 'lucide-react'

/**
 * Chronological order enforcement for Tournament Schedule:
 * Registration Opens -> Registration Closes -> Check-in Opens -> Check-in Closes -> Room Publish Time -> Match Start Time
 */
export function checkScheduleChronology({
  startDate = '',
  registrationStart = '',
  registrationEnd = '',
  checkInStart = '',
  checkInEnd = '',
  roomPublishTime = '',
  startTime = ''
}) {
  const errors = {}

  // Helper parser for time strings or timestamps
  const parseTime = (timeStr) => {
    if (!timeStr) return null
    if (timeStr.includes(':')) {
      const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i)
      if (match) {
        let hours = parseInt(match[1], 10)
        const minutes = parseInt(match[2], 10)
        const ampm = match[3]?.toUpperCase()
        if (ampm === 'PM' && hours < 12) hours += 12
        if (ampm === 'AM' && hours === 12) hours = 0
        return hours * 60 + minutes
      }
    }
    return null
  }

  const regStartMin = parseTime(registrationStart)
  const regEndMin = parseTime(registrationEnd)
  const checkInStartMin = parseTime(checkInStart)
  const checkInEndMin = parseTime(checkInEnd)
  const roomMin = parseTime(roomPublishTime)
  const startMin = parseTime(startTime)

  if (regStartMin !== null && regEndMin !== null && regEndMin <= regStartMin) {
    errors.registrationEnd = 'Registration Closes must be after Registration Opens.'
  }

  if (regEndMin !== null && checkInStartMin !== null && checkInStartMin < regEndMin) {
    errors.checkInStart = 'Check-in Opens must be after Registration Closes.'
  }

  if (checkInStartMin !== null && checkInEndMin !== null && checkInEndMin <= checkInStartMin) {
    errors.checkInEnd = 'Check-in Closes must be after Check-in Opens.'
  }

  if (checkInEndMin !== null && roomMin !== null && roomMin < checkInEndMin) {
    errors.roomPublishTime = 'Room Publish Time must be after Check-in Closes.'
  }

  if (roomMin !== null && startMin !== null && startMin <= roomMin) {
    errors.startTime = 'Match Start Time must be after Room Publish Time.'
  }

  return errors
}

export default function TournamentScheduleForm({
  startDate = '',
  startTime = '06:00 PM IST',
  registrationStart = 'Immediate',
  registrationEnd = '1 Hour Prior to Kickoff',
  checkInStart = '05:00 PM IST',
  checkInEnd = '05:30 PM IST',
  checkInTime = '05:15 PM IST',
  roomPublishTime = '05:45 PM IST',
  errors = {},
  onChange,
  readOnly = false
}) {
  const handleChange = (field, value) => {
    if (onChange) {
      onChange({
        startDate: field === 'startDate' ? value : startDate,
        startTime: field === 'startTime' ? value : startTime,
        registrationStart: field === 'registrationStart' ? value : registrationStart,
        registrationEnd: field === 'registrationEnd' ? value : registrationEnd,
        checkInStart: field === 'checkInStart' ? value : checkInStart,
        checkInEnd: field === 'checkInEnd' ? value : (field === 'checkInTime' ? value : checkInEnd),
        checkInTime: field === 'checkInTime' ? value : checkInTime,
        roomPublishTime: field === 'roomPublishTime' ? value : roomPublishTime,
      })
    }
  }

  const chronoErrors = checkScheduleChronology({
    startDate,
    registrationStart,
    registrationEnd,
    checkInStart,
    checkInEnd: checkInEnd || checkInTime,
    roomPublishTime,
    startTime
  })

  const mergedErrors = { ...chronoErrors, ...errors }

  if (readOnly) {
    return (
      <div className="bg-[#141416] border border-[#27272a] rounded-xl p-4 sm:p-5 space-y-3.5 sm:space-y-4 shadow-md text-white font-mono text-xs">
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#27272a] pb-3">
          <div className="flex items-center gap-2 text-[#00f2ff]">
            <Calendar className="w-4 h-4 text-[#00f2ff]" />
            <h4 className="font-headline text-xs sm:text-sm font-bold uppercase tracking-wider text-white">
              Tournament Schedule Overview
            </h4>
          </div>
          <span className="px-2 py-0.5 rounded bg-[#00f2ff]/10 text-[#00f2ff] border border-[#00f2ff]/30 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">
            IST (UTC+05:30)
          </span>
        </div>

        {/* Mini Chronology Sequence Ribbon */}
        <div className="bg-[#1c1b1c] p-2.5 rounded-lg border border-[#27272a] flex items-center justify-between text-[10px] sm:text-[11px] font-mono text-[#849495] overflow-x-auto gap-2">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
            <span>Reg: <strong className="text-white">{registrationStart || 'Immediate'}</strong></span>
          </div>
          <span className="text-[#27272a] shrink-0">→</span>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00f2ff]" />
            <span>Check-in: <strong className="text-white">{checkInStart || '05:00 PM'}</strong></span>
          </div>
          <span className="text-[#27272a] shrink-0">→</span>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00dbe7]" />
            <span>Room Unlock: <strong className="text-white">{roomPublishTime || '05:45 PM'}</strong></span>
          </div>
          <span className="text-[#27272a] shrink-0">→</span>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ff5e07]" />
            <span>Kickoff: <strong className="text-[#ff5e07]">{startTime || '06:00 PM'}</strong></span>
          </div>
        </div>

        {/* Grid of Chronological Window Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
          <div className="p-3 bg-[#1c1b1c] border border-[#27272a] rounded-lg space-y-1 hover:border-[#00f2ff]/30 transition-colors">
            <span className="text-[10px] text-[#849495] uppercase font-bold tracking-wider block">Tournament Date</span>
            <span className="text-white text-xs sm:text-sm font-bold block">{startDate || 'TBD'}</span>
          </div>

          <div className="p-3 bg-[#1c1b1c] border border-[#27272a] rounded-lg space-y-1 hover:border-[#00f2ff]/30 transition-colors">
            <span className="text-[10px] text-[#849495] uppercase font-bold tracking-wider block">Registration Opens</span>
            <span className="text-[#10b981] text-xs sm:text-sm font-bold block">{registrationStart || 'Immediate'}</span>
          </div>

          <div className="p-3 bg-[#1c1b1c] border border-[#27272a] rounded-lg space-y-1 hover:border-[#00f2ff]/30 transition-colors">
            <span className="text-[10px] text-[#849495] uppercase font-bold tracking-wider block">Registration Closes</span>
            <span className="text-[#ff5e07] text-xs sm:text-sm font-bold block">{registrationEnd || '1 Hour Prior'}</span>
          </div>

          <div className="p-3 bg-[#1c1b1c] border border-[#27272a] rounded-lg space-y-1 hover:border-[#00f2ff]/30 transition-colors">
            <span className="text-[10px] text-[#849495] uppercase font-bold tracking-wider block">Check-in Opens</span>
            <span className="text-[#00f2ff] text-xs sm:text-sm font-bold block">{checkInStart || '05:00 PM IST'}</span>
          </div>

          <div className="p-3 bg-[#1c1b1c] border border-[#27272a] rounded-lg space-y-1 hover:border-[#00f2ff]/30 transition-colors">
            <span className="text-[10px] text-[#849495] uppercase font-bold tracking-wider block">Check-in Closes</span>
            <span className="text-[#fed83a] text-xs sm:text-sm font-bold block">{checkInEnd || checkInTime || '05:30 PM IST'}</span>
          </div>

          <div className="p-3 bg-[#1c1b1c] border border-[#27272a] rounded-lg space-y-1 hover:border-[#00f2ff]/30 transition-colors">
            <span className="text-[10px] text-[#849495] uppercase font-bold tracking-wider block">Room Publish Time</span>
            <span className="text-[#00dbe7] text-xs sm:text-sm font-bold block">{roomPublishTime || '05:45 PM IST'}</span>
          </div>

          <div className="p-3.5 bg-[#1c1b1c] border border-[#27272a] rounded-lg sm:col-span-2 lg:col-span-3 flex flex-wrap items-center justify-between gap-3 hover:border-[#00f2ff]/30 transition-colors">
            <div>
              <span className="text-[10px] text-[#849495] uppercase font-bold tracking-wider block">Match Start Time (Kickoff)</span>
              <span className="text-[#ff5e07] text-sm sm:text-base font-black tracking-wide block">{startTime || '06:00 PM IST'}</span>
            </div>
            <span className="px-2.5 py-1 rounded bg-[#ff5e07]/10 text-[#ff5e07] border border-[#ff5e07]/30 text-[10px] font-bold uppercase tracking-wider font-mono">
              Mandatory Punctuality
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#141416] p-4 sm:p-5 rounded-xl border border-[#27272a] shadow-md space-y-4 text-white font-mono text-xs">
      <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
        <div className="flex items-center gap-2 text-[#00f2ff]">
          <Calendar className="w-4 h-4 text-[#00f2ff]" />
          <h3 className="font-headline text-xs sm:text-sm font-bold uppercase tracking-wider text-white">
            Tournament Schedule Configuration
          </h3>
        </div>
        <span className="text-[10px] text-[#849495] font-semibold uppercase">Auto-Validated Chronology</span>
      </div>

      {Object.keys(chronoErrors).length > 0 && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Chronological Error: Ensure schedule follows Registration Opens → Registration Closes → Check-in Opens → Check-in Closes → Room Publish → Match Start.</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        
        {/* Field 1: Tournament Date */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-[#849495] uppercase tracking-wide block">
            1. Tournament Date *
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => handleChange('startDate', e.target.value)}
            className={`w-full bg-[#1c1b1c] border rounded-lg px-3.5 py-2 text-white text-xs focus:outline-none cursor-pointer ${
              mergedErrors.startDate ? 'border-red-500 bg-red-500/10' : 'border-[#27272a] focus:border-[#00f2ff]'
            }`}
          />
          {mergedErrors.startDate && (
            <p className="text-red-400 text-[10px] font-bold mt-1">{mergedErrors.startDate}</p>
          )}
        </div>

        {/* Field 2: Registration Opens */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-[#849495] uppercase tracking-wide block">
            2. Registration Opens *
          </label>
          <input
            type="text"
            value={registrationStart}
            onChange={(e) => handleChange('registrationStart', e.target.value)}
            placeholder="e.g. Immediate / 04:00 PM IST"
            className={`w-full bg-[#1c1b1c] border rounded-lg px-3.5 py-2 text-white text-xs placeholder-[#849495] focus:outline-none ${
              mergedErrors.registrationStart ? 'border-red-500 bg-red-500/10' : 'border-[#27272a] focus:border-[#10b981]'
            }`}
          />
          {mergedErrors.registrationStart && (
            <p className="text-red-400 text-[10px] font-bold mt-1">{mergedErrors.registrationStart}</p>
          )}
        </div>

        {/* Field 3: Registration Closes */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-[#849495] uppercase tracking-wide block">
            3. Registration Closes *
          </label>
          <input
            type="text"
            value={registrationEnd}
            onChange={(e) => handleChange('registrationEnd', e.target.value)}
            placeholder="e.g. 04:45 PM IST"
            className={`w-full bg-[#1c1b1c] border rounded-lg px-3.5 py-2 text-white text-xs placeholder-[#849495] focus:outline-none ${
              mergedErrors.registrationEnd ? 'border-red-500 bg-red-500/10' : 'border-[#27272a] focus:border-[#ff5e07]'
            }`}
          />
          {mergedErrors.registrationEnd && (
            <p className="text-red-400 text-[10px] font-bold mt-1">{mergedErrors.registrationEnd}</p>
          )}
        </div>

        {/* Field 4: Check-in Opens */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-[#849495] uppercase tracking-wide block">
            4. Check-in Opens *
          </label>
          <input
            type="text"
            value={checkInStart}
            onChange={(e) => handleChange('checkInStart', e.target.value)}
            placeholder="e.g. 05:00 PM IST"
            className={`w-full bg-[#1c1b1c] border rounded-lg px-3.5 py-2 text-white text-xs placeholder-[#849495] focus:outline-none ${
              mergedErrors.checkInStart ? 'border-red-500 bg-red-500/10' : 'border-[#27272a] focus:border-[#00f2ff]'
            }`}
          />
          {mergedErrors.checkInStart && (
            <p className="text-red-400 text-[10px] font-bold mt-1">{mergedErrors.checkInStart}</p>
          )}
        </div>

        {/* Field 5: Check-in Closes */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-[#849495] uppercase tracking-wide block">
            5. Check-in Closes *
          </label>
          <input
            type="text"
            value={checkInEnd || checkInTime}
            onChange={(e) => {
              handleChange('checkInEnd', e.target.value)
              handleChange('checkInTime', e.target.value)
            }}
            placeholder="e.g. 05:30 PM IST"
            className={`w-full bg-[#1c1b1c] border rounded-lg px-3.5 py-2 text-white text-xs placeholder-[#849495] focus:outline-none ${
              mergedErrors.checkInEnd ? 'border-red-500 bg-red-500/10' : 'border-[#27272a] focus:border-[#fed83a]'
            }`}
          />
          {mergedErrors.checkInEnd && (
            <p className="text-red-400 text-[10px] font-bold mt-1">{mergedErrors.checkInEnd}</p>
          )}
        </div>

        {/* Field 6: Room Publish Time */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-[#849495] uppercase tracking-wide block">
            6. Room Publish Time *
          </label>
          <input
            type="text"
            value={roomPublishTime}
            onChange={(e) => handleChange('roomPublishTime', e.target.value)}
            placeholder="e.g. 05:45 PM IST"
            className={`w-full bg-[#1c1b1c] border rounded-lg px-3.5 py-2 text-white text-xs placeholder-[#849495] focus:outline-none ${
              mergedErrors.roomPublishTime ? 'border-red-500 bg-red-500/10' : 'border-[#27272a] focus:border-[#00dbe7]'
            }`}
          />
          {mergedErrors.roomPublishTime && (
            <p className="text-red-400 text-[10px] font-bold mt-1">{mergedErrors.roomPublishTime}</p>
          )}
        </div>

        {/* Field 7: Match Start Time */}
        <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
          <label className="text-[11px] font-bold text-[#849495] uppercase tracking-wide block">
            7. Match Start Time *
          </label>
          <input
            type="text"
            value={startTime}
            onChange={(e) => handleChange('startTime', e.target.value)}
            placeholder="e.g. 06:00 PM IST"
            className={`w-full bg-[#1c1b1c] border rounded-lg px-3.5 py-2 text-white text-xs placeholder-[#849495] focus:outline-none ${
              mergedErrors.startTime ? 'border-red-500 bg-red-500/10' : 'border-[#27272a] focus:border-[#ff5e07]'
            }`}
          />
          {mergedErrors.startTime && (
            <p className="text-red-400 text-[10px] font-bold mt-1">{mergedErrors.startTime}</p>
          )}
        </div>

      </div>
    </div>
  )
}
