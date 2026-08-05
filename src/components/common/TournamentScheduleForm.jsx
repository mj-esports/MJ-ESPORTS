import React from 'react'
import { Calendar, Clock, Lock, Radio, Play, CheckCircle2 } from 'lucide-react'

export default function TournamentScheduleForm({
  startDate = '',
  startTime = '06:00 PM IST',
  registrationStart = 'Immediate',
  registrationEnd = '1 Hour Prior to Kickoff',
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
        checkInTime: field === 'checkInTime' ? value : checkInTime,
        roomPublishTime: field === 'roomPublishTime' ? value : roomPublishTime,
      })
    }
  }

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
            <span className="text-[10px] text-[#8e9dae] uppercase font-bold block">Match Kickoff Time</span>
            <span className="text-[#fe6b00] font-bold block">{startTime || '06:00 PM IST'}</span>
          </div>

          <div className="p-3 bg-[#151a21] border border-[#3a494b]/60 rounded-xl space-y-1">
            <span className="text-[10px] text-[#8e9dae] uppercase font-bold block">Registration Opens</span>
            <span className="text-[#00ff9d] font-bold block">{registrationStart || 'Open Now'}</span>
          </div>

          <div className="p-3 bg-[#151a21] border border-[#3a494b]/60 rounded-xl space-y-1">
            <span className="text-[10px] text-[#8e9dae] uppercase font-bold block">Registration Closes</span>
            <span className="text-[#ff4655] font-bold block">{registrationEnd || '1 Hour Prior'}</span>
          </div>

          <div className="p-3 bg-[#151a21] border border-[#3a494b]/60 rounded-xl space-y-1">
            <span className="text-[10px] text-[#8e9dae] uppercase font-bold block">Check-in Time</span>
            <span className="text-[#00f2ff] font-bold block">{checkInTime || '45m Prior'}</span>
          </div>

          <div className="p-3 bg-[#151a21] border border-[#3a494b]/60 rounded-xl space-y-1">
            <span className="text-[10px] text-[#8e9dae] uppercase font-bold block">Room Publish Time</span>
            <span className="text-[#a855f7] font-bold block">{roomPublishTime || '15m Prior'}</span>
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
            Tournament Schedule Configuration (V1)
          </h3>
        </div>
        <span className="text-[10px] text-[#8e9dae] font-semibold uppercase">6 Core Fields</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        
        {/* Field 1: Tournament Date */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-[#8e9dae] uppercase tracking-wide block flex items-center justify-between">
            <span>1. Tournament Date *</span>
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => handleChange('startDate', e.target.value)}
            className={`w-full bg-[#151a21] border rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-none cursor-pointer ${
              errors.startDate ? 'border-red-500 bg-red-500/10' : 'border-[#3a494b] focus:border-[#00f2ff]'
            }`}
          />
          {errors.startDate && (
            <p className="text-red-400 text-[10px] font-bold mt-1">{errors.startDate}</p>
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
            placeholder="e.g. Immediate / 2026-08-01"
            className={`w-full bg-[#151a21] border rounded-xl px-3.5 py-2.5 text-white text-xs placeholder-[#8e9dae] focus:outline-none ${
              errors.registrationStart ? 'border-red-500 bg-red-500/10' : 'border-[#3a494b] focus:border-[#00ff9d]'
            }`}
          />
          {errors.registrationStart && (
            <p className="text-red-400 text-[10px] font-bold mt-1">{errors.registrationStart}</p>
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
            placeholder="e.g. 05:00 PM IST"
            className={`w-full bg-[#151a21] border rounded-xl px-3.5 py-2.5 text-white text-xs placeholder-[#8e9dae] focus:outline-none ${
              errors.registrationEnd ? 'border-red-500 bg-red-500/10' : 'border-[#3a494b] focus:border-[#ff4655]'
            }`}
          />
          {errors.registrationEnd && (
            <p className="text-red-400 text-[10px] font-bold mt-1">{errors.registrationEnd}</p>
          )}
        </div>

        {/* Field 4: Check-in Time */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-[#8e9dae] uppercase tracking-wide block">
            4. Check-in Time *
          </label>
          <input
            type="text"
            value={checkInTime}
            onChange={(e) => handleChange('checkInTime', e.target.value)}
            placeholder="e.g. 05:15 PM IST"
            className={`w-full bg-[#151a21] border rounded-xl px-3.5 py-2.5 text-white text-xs placeholder-[#8e9dae] focus:outline-none ${
              errors.checkInTime ? 'border-red-500 bg-red-500/10' : 'border-[#3a494b] focus:border-[#00f2ff]'
            }`}
          />
          {errors.checkInTime && (
            <p className="text-red-400 text-[10px] font-bold mt-1">{errors.checkInTime}</p>
          )}
        </div>

        {/* Field 5: Match Start Time */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-[#8e9dae] uppercase tracking-wide block">
            5. Match Start Time *
          </label>
          <input
            type="text"
            value={startTime}
            onChange={(e) => handleChange('startTime', e.target.value)}
            placeholder="e.g. 06:00 PM IST"
            className={`w-full bg-[#151a21] border rounded-xl px-3.5 py-2.5 text-white text-xs placeholder-[#8e9dae] focus:outline-none ${
              errors.startTime ? 'border-red-500 bg-red-500/10' : 'border-[#3a494b] focus:border-[#fe6b00]'
            }`}
          />
          {errors.startTime && (
            <p className="text-red-400 text-[10px] font-bold mt-1">{errors.startTime}</p>
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
              errors.roomPublishTime ? 'border-red-500 bg-red-500/10' : 'border-[#3a494b] focus:border-[#a855f7]'
            }`}
          />
          {errors.roomPublishTime && (
            <p className="text-red-400 text-[10px] font-bold mt-1">{errors.roomPublishTime}</p>
          )}
        </div>

      </div>
    </div>
  )
}
