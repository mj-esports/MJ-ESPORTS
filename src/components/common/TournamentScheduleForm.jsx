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
      <div className="bg-[#07090c] border border-[#3a494b]/60 rounded-2xl p-5 space-y-4 shadow-xl text-white font-mono text-xs">
        <div className="flex items-center gap-2 border-b border-[#3a494b]/50 pb-3 text-[#00f2ff]">
          <Calendar className="w-4 h-4" />
          <h4 className="font-headline text-xs font-black uppercase tracking-wider text-white">
            Tournament Schedule Overview
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="p-3 bg-[#151a21] border border-[#3a494b]/60 rounded-xl space-y-1">
            <span className="text-[10px] text-[#8e9dae] uppercase font-bold block">Tournament Date</span>
            <span className="text-white font-bold block">{startDate || 'TBD'}</span>
          </div>

          <div className="p-3 bg-[#151a21] border border-[#3a494b]/60 rounded-xl space-y-1">
            <span className="text-[10px] text-[#8e9dae] uppercase font-bold block">Registration Opens</span>
            <span className="text-[#00ff9d] font-bold block">{registrationStart || 'Immediate'}</span>
          </div>

          <div className="p-3 bg-[#151a21] border border-[#3a494b]/60 rounded-xl space-y-1">
            <span className="text-[10px] text-[#8e9dae] uppercase font-bold block">Registration Closes</span>
            <span className="text-[#ff4655] font-bold block">{registrationEnd || '1 Hour Prior'}</span>
          </div>

          <div className="p-3 bg-[#151a21] border border-[#3a494b]/60 rounded-xl space-y-1">
            <span className="text-[10px] text-[#8e9dae] uppercase font-bold block">Check-in Opens</span>
            <span className="text-[#00f2ff] font-bold block">{checkInStart || '05:00 PM IST'}</span>
          </div>

          <div className="p-3 bg-[#151a21] border border-[#3a494b]/60 rounded-xl space-y-1">
            <span className="text-[10px] text-[#8e9dae] uppercase font-bold block">Check-in Closes</span>
            <span className="text-[#a855f7] font-bold block">{checkInEnd || checkInTime || '05:30 PM IST'}</span>
          </div>

          <div className="p-3 bg-[#151a21] border border-[#3a494b]/60 rounded-xl space-y-1">
            <span className="text-[10px] text-[#8e9dae] uppercase font-bold block">Room Publish Time</span>
            <span className="text-[#ffb693] font-bold block">{roomPublishTime || '05:45 PM IST'}</span>
          </div>

          <div className="p-3 bg-[#151a21] border border-[#3a494b]/60 rounded-xl space-y-1 sm:col-span-2 lg:col-span-3">
            <span className="text-[10px] text-[#8e9dae] uppercase font-bold block">Match Start Time</span>
            <span className="text-[#fe6b00] font-bold block">{startTime || '06:00 PM IST'}</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#0b0e14] p-5 rounded-2xl border border-[#00f2ff]/30 shadow-[0_0_20px_rgba(0,242,255,0.05)] space-y-4 text-white font-mono text-xs">
      <div className="flex items-center justify-between border-b border-[#3a494b]/50 pb-3">
        <div className="flex items-center gap-2 text-[#00f2ff]">
          <Calendar className="w-4 h-4" />
          <h3 className="font-headline text-xs font-black uppercase tracking-wider text-white">
            Tournament Schedule Configuration
          </h3>
        </div>
        <span className="text-[10px] text-[#8e9dae] font-semibold uppercase">Auto-Validated Chronology</span>
      </div>

      {Object.keys(chronoErrors).length > 0 && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Chronological Error: Ensure schedule follows Registration Opens → Registration Closes → Check-in Opens → Check-in Closes → Room Publish → Match Start.</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        
        {/* Field 1: Tournament Date */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-[#8e9dae] uppercase tracking-wide block">
            1. Tournament Date *
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => handleChange('startDate', e.target.value)}
            className={`w-full bg-[#151a21] border rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-none cursor-pointer ${
              mergedErrors.startDate ? 'border-red-500 bg-red-500/10' : 'border-[#3a494b] focus:border-[#00f2ff]'
            }`}
          />
          {mergedErrors.startDate && (
            <p className="text-red-400 text-[10px] font-bold mt-1">{mergedErrors.startDate}</p>
          )}
        </div>

        {/* Field 2: Registration Opens */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-[#8e9dae] uppercase tracking-wide block">
            2. Registration Opens *
          </label>
          <input
            type="text"
            value={registrationStart}
            onChange={(e) => handleChange('registrationStart', e.target.value)}
            placeholder="e.g. Immediate / 04:00 PM IST"
            className={`w-full bg-[#151a21] border rounded-xl px-3.5 py-2.5 text-white text-xs placeholder-[#8e9dae] focus:outline-none ${
              mergedErrors.registrationStart ? 'border-red-500 bg-red-500/10' : 'border-[#3a494b] focus:border-[#00ff9d]'
            }`}
          />
          {mergedErrors.registrationStart && (
            <p className="text-red-400 text-[10px] font-bold mt-1">{mergedErrors.registrationStart}</p>
          )}
        </div>

        {/* Field 3: Registration Closes */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-[#8e9dae] uppercase tracking-wide block">
            3. Registration Closes *
          </label>
          <input
            type="text"
            value={registrationEnd}
            onChange={(e) => handleChange('registrationEnd', e.target.value)}
            placeholder="e.g. 04:45 PM IST"
            className={`w-full bg-[#151a21] border rounded-xl px-3.5 py-2.5 text-white text-xs placeholder-[#8e9dae] focus:outline-none ${
              mergedErrors.registrationEnd ? 'border-red-500 bg-red-500/10' : 'border-[#3a494b] focus:border-[#ff4655]'
            }`}
          />
          {mergedErrors.registrationEnd && (
            <p className="text-red-400 text-[10px] font-bold mt-1">{mergedErrors.registrationEnd}</p>
          )}
        </div>

        {/* Field 4: Check-in Opens */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-[#8e9dae] uppercase tracking-wide block">
            4. Check-in Opens *
          </label>
          <input
            type="text"
            value={checkInStart}
            onChange={(e) => handleChange('checkInStart', e.target.value)}
            placeholder="e.g. 05:00 PM IST"
            className={`w-full bg-[#151a21] border rounded-xl px-3.5 py-2.5 text-white text-xs placeholder-[#8e9dae] focus:outline-none ${
              mergedErrors.checkInStart ? 'border-red-500 bg-red-500/10' : 'border-[#3a494b] focus:border-[#00f2ff]'
            }`}
          />
          {mergedErrors.checkInStart && (
            <p className="text-red-400 text-[10px] font-bold mt-1">{mergedErrors.checkInStart}</p>
          )}
        </div>

        {/* Field 5: Check-in Closes */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-[#8e9dae] uppercase tracking-wide block">
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
            className={`w-full bg-[#151a21] border rounded-xl px-3.5 py-2.5 text-white text-xs placeholder-[#8e9dae] focus:outline-none ${
              mergedErrors.checkInEnd ? 'border-red-500 bg-red-500/10' : 'border-[#3a494b] focus:border-[#a855f7]'
            }`}
          />
          {mergedErrors.checkInEnd && (
            <p className="text-red-400 text-[10px] font-bold mt-1">{mergedErrors.checkInEnd}</p>
          )}
        </div>

        {/* Field 6: Room Publish Time */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-[#8e9dae] uppercase tracking-wide block">
            6. Room Publish Time *
          </label>
          <input
            type="text"
            value={roomPublishTime}
            onChange={(e) => handleChange('roomPublishTime', e.target.value)}
            placeholder="e.g. 05:45 PM IST"
            className={`w-full bg-[#151a21] border rounded-xl px-3.5 py-2.5 text-white text-xs placeholder-[#8e9dae] focus:outline-none ${
              mergedErrors.roomPublishTime ? 'border-red-500 bg-red-500/10' : 'border-[#3a494b] focus:border-[#ffb693]'
            }`}
          />
          {mergedErrors.roomPublishTime && (
            <p className="text-red-400 text-[10px] font-bold mt-1">{mergedErrors.roomPublishTime}</p>
          )}
        </div>

        {/* Field 7: Match Start Time */}
        <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
          <label className="text-[11px] font-bold text-[#8e9dae] uppercase tracking-wide block">
            7. Match Start Time *
          </label>
          <input
            type="text"
            value={startTime}
            onChange={(e) => handleChange('startTime', e.target.value)}
            placeholder="e.g. 06:00 PM IST"
            className={`w-full bg-[#151a21] border rounded-xl px-3.5 py-2.5 text-white text-xs placeholder-[#8e9dae] focus:outline-none ${
              mergedErrors.startTime ? 'border-red-500 bg-red-500/10' : 'border-[#3a494b] focus:border-[#fe6b00]'
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
