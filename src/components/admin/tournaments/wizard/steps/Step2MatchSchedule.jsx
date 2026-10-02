import React, { useState } from 'react'
import {
  Gamepad2,
  Calendar,
  Clock,
  MapPin,
  Flame,
  Crosshair,
  Zap,
  Shield,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  DoorOpen,
  Lock,
  Timer,
  Key,
  Play,
  Info,
  ChevronDown,
  AlertCircle,
  FileText,
  X
} from 'lucide-react'
import { checkScheduleChronology } from '../../../../common/TournamentScheduleForm'
import { OFFICIAL_MJ_RULES } from '../../../../common/OfficialRulebook'

export default function Step2MatchSchedule({
  form = {},
  formErrors = {},
  onChange,
}) {
  const [showFullRulebook, setShowFullRulebook] = useState(false)

  // Map choices
  const maps = [
    { id: 'Bermuda', label: 'Bermuda Remastered' },
    { id: 'Purgatory', label: 'Purgatory' },
    { id: 'Kalahari', label: 'Kalahari Desert' },
    { id: 'Alpine', label: 'Alpine Zone' },
    { id: 'NexTERRA', label: 'NeXTerra High-Tech' },
    { id: 'Random', label: 'Random Map Rotation' },
  ]

  // Match Type choices
  const matchTypes = [
    { id: 'Battle Royale', label: 'Battle Royale - Classic (BR)' },
    { id: 'Clash Squad', label: 'Clash Squad (7 Rounds)' },
    { id: 'Custom', label: 'Rush Hour (Speed Lobby)' },
  ]

  const currentMap = form.ffMap || form.map || 'Bermuda'
  const currentMatchType = form.matchType || 'Battle Royale'
  const gunAttributes = (form.ffGunAttributes || form.gunAttributes || 'Disabled').toLowerCase()
  const isGunEnabled = gunAttributes === 'enabled'
  const characterSkills = (form.ffCharacterSkills || form.characterSkills || 'Disabled').toLowerCase()
  const isSkillsEnabled = characterSkills === 'enabled'

  // Chronology validation check
  const chronoErrors = checkScheduleChronology({
    startDate: form.startDate,
    registrationStart: form.registrationStart,
    registrationEnd: form.registrationEnd,
    checkInStart: form.checkInStart,
    checkInEnd: form.checkInEnd || form.checkInTime,
    roomPublishTime: form.roomPublishTime,
    startTime: form.startTime,
  })

  const mergedErrors = { ...chronoErrors, ...formErrors }

  const handleFieldChange = (field, value) => {
    const updates = { [field]: value }
    if (field === 'checkInEnd') {
      updates.checkInTime = value
    }
    onChange(updates)
  }

  const handleGunToggle = (enable) => {
    const val = enable ? 'Enabled' : 'Disabled'
    onChange({ ffGunAttributes: val, gunAttributes: val })
  }

  const handleSkillsToggle = (enable) => {
    const val = enable ? 'Enabled' : 'Disabled'
    onChange({ ffCharacterSkills: val, characterSkills: val })
  }

  return (
    <div className="space-y-6 sm:space-y-8 select-none">
      {/* 1. SECTION HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-[#27272a] pb-4 sm:pb-5 gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-[#00f2ff]" />
            <h1 className="font-headline text-xl sm:text-2xl md:text-3xl font-bold text-white tracking-tight">
              02. MATCH & SCHEDULE
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#849495] font-body">
            Configure operational lobby specs, tactical drop maps, timeline checkpoints, and tournament rules.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="px-2.5 py-1 rounded text-[10px] font-mono font-bold bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/30 uppercase">
            CALIBRATED FOR COMPETITIVE
          </span>
        </div>
      </div>

      {/* 2. MATCH CONFIGURATION CARD */}
      <section className="bg-[#141416] rounded-xl border border-[#27272a] p-5 sm:p-6 space-y-6 shadow-lg">
        <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
          <div className="flex items-center gap-2 text-[#00f2ff]">
            <Gamepad2 className="w-4 h-4" />
            <h2 className="font-headline text-xs font-bold tracking-widest uppercase text-white">
              1. Match Configuration
            </h2>
            <span className="text-[#849495] text-xs font-body hidden sm:inline">
              | Free Fire MAX Tactical Lobby Specs
            </span>
          </div>
          <span className="text-[10px] font-mono text-[#00f2ff] px-2 py-0.5 rounded bg-[#00f2ff]/10 border border-[#00f2ff]/30 uppercase">
            OFFICIAL SCENE PRESET
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {/* MAP */}
          <div className="space-y-1.5 flex flex-col justify-between">
            <label className="block font-headline text-xs font-bold tracking-wider text-[#849495] uppercase">
              Selected Map
            </label>
            <div className="relative">
              <select
                value={currentMap}
                onChange={(e) => handleFieldChange('ffMap', e.target.value)}
                className="w-full h-11 min-h-[44px] bg-[#1b1b1d] border border-[#27272a] focus:border-[#00f2ff] text-white rounded-lg px-3.5 py-2.5 text-xs font-body appearance-none pr-9 focus:outline-none transition-colors cursor-pointer"
              >
                {maps.map((m) => (
                  <option key={m.id} value={m.id} className="bg-[#141416] text-white">
                    {m.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-[#00f2ff] absolute right-3 top-3.5 pointer-events-none shrink-0" />
            </div>
            <p className="text-[11px] text-[#849495] flex items-center gap-1 font-body">
              <MapPin className="w-3 h-3 text-[#00f2ff] shrink-0" />
              <span>Standard 50-player combat grid</span>
            </p>
          </div>

          {/* MATCH FORMAT */}
          <div className="space-y-1.5 flex flex-col justify-between">
            <label className="block font-headline text-xs font-bold tracking-wider text-[#849495] uppercase">
              Match Format
            </label>
            <div className="relative">
              <select
                value={currentMatchType}
                onChange={(e) => handleFieldChange('matchType', e.target.value)}
                className="w-full h-11 min-h-[44px] bg-[#1b1b1d] border border-[#27272a] focus:border-[#00f2ff] text-white rounded-lg px-3.5 py-2.5 text-xs font-body appearance-none pr-9 focus:outline-none transition-colors cursor-pointer"
              >
                {matchTypes.map((mt) => (
                  <option key={mt.id} value={mt.id} className="bg-[#141416] text-white">
                    {mt.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-[#849495] absolute right-3 top-3.5 pointer-events-none shrink-0" />
            </div>
            <p className="text-[11px] text-[#849495] flex items-center gap-1 font-body">
              <Flame className="w-3 h-3 text-[#10b981] shrink-0" />
              <span>Full battle royale tournament lobby</span>
            </p>
          </div>

          {/* GUN ATTRIBUTES */}
          <div className="space-y-1.5 flex flex-col justify-between">
            <label className="block font-headline text-xs font-bold tracking-wider text-[#849495] uppercase">
              Gun Attributes (Skin Stats)
            </label>
            <div className="h-11 min-h-[44px] grid grid-cols-2 gap-1.5 p-1 bg-[#1b1b1d] border border-[#27272a] rounded-lg">
              <button
                type="button"
                onClick={() => handleGunToggle(true)}
                className={`h-full py-0 px-2 text-xs font-headline font-bold rounded transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  isGunEnabled
                    ? 'bg-[#00f2ff]/15 border border-[#00f2ff] text-[#00f2ff] shadow-sm'
                    : 'text-[#849495] hover:text-white bg-transparent border border-transparent'
                }`}
              >
                {isGunEnabled && <span className="w-1.5 h-1.5 rounded-full bg-[#00f2ff] shrink-0" />}
                <span>ENABLED</span>
              </button>
              <button
                type="button"
                onClick={() => handleGunToggle(false)}
                className={`h-full py-0 px-2 text-xs font-headline font-bold rounded transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  !isGunEnabled
                    ? 'bg-[#00f2ff]/15 border border-[#00f2ff] text-[#00f2ff] shadow-sm'
                    : 'text-[#849495] hover:text-white bg-transparent border border-transparent'
                }`}
              >
                {!isGunEnabled && <span className="w-1.5 h-1.5 rounded-full bg-[#00f2ff] shrink-0" />}
                <span>DISABLED</span>
              </button>
            </div>
            <p className="text-[11px] text-[#10b981] flex items-center gap-1 font-body">
              <ShieldCheck className="w-3 h-3 shrink-0" />
              <span>Competitive Scrim Standard</span>
            </p>
          </div>

          {/* CHARACTER SKILLS */}
          <div className="space-y-1.5 flex flex-col justify-between">
            <label className="block font-headline text-xs font-bold tracking-wider text-[#849495] uppercase">
              Character Skills
            </label>
            <div className="h-11 min-h-[44px] grid grid-cols-2 gap-1.5 p-1 bg-[#1b1b1d] border border-[#27272a] rounded-lg">
              <button
                type="button"
                onClick={() => handleSkillsToggle(false)}
                className={`h-full py-0 px-2 text-xs font-headline font-bold rounded transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  !isSkillsEnabled
                    ? 'bg-[#00f2ff]/15 border border-[#00f2ff] text-[#00f2ff] shadow-sm'
                    : 'text-[#849495] hover:text-white bg-transparent border border-transparent'
                }`}
              >
                {!isSkillsEnabled && <span className="w-1.5 h-1.5 rounded-full bg-[#00f2ff] shrink-0" />}
                <span>NO SKILLS</span>
              </button>
              <button
                type="button"
                onClick={() => handleSkillsToggle(true)}
                className={`h-full py-0 px-2 text-xs font-headline font-bold rounded transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  isSkillsEnabled
                    ? 'bg-[#00f2ff]/15 border border-[#00f2ff] text-[#00f2ff] shadow-sm'
                    : 'text-[#849495] hover:text-white bg-transparent border border-transparent'
                }`}
              >
                {isSkillsEnabled && <span className="w-1.5 h-1.5 rounded-full bg-[#00f2ff] shrink-0" />}
                <span>ACTIVE</span>
              </button>
            </div>
            <p className="text-[11px] text-[#00f2ff] flex items-center gap-1 font-body">
              <Zap className="w-3 h-3 shrink-0" />
              <span>Official Arbiter Spec</span>
            </p>
          </div>
        </div>

        {/* Quick Sub-Settings Grid */}
        <div className="pt-4 border-t border-[#27272a] grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#1b1b1d] border border-[#27272a]">
            <span className="text-[#849495]">Revival Mechanism</span>
            <span className="font-bold text-[#00f2ff]">OFF</span>
          </div>
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#1b1b1d] border border-[#27272a]">
            <span className="text-[#849495]">Fall Damage</span>
            <span className="font-bold text-white">ENABLED</span>
          </div>
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#1b1b1d] border border-[#27272a]">
            <span className="text-[#849495]">Airdrop Supplies</span>
            <span className="font-bold text-white">STANDARD</span>
          </div>
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#1b1b1d] border border-[#27272a]">
            <span className="text-[#849495]">Anti-Cheat</span>
            <span className="font-bold text-[#10b981] flex items-center gap-1">
              <Shield className="w-3 h-3" /> ACTIVE
            </span>
          </div>
        </div>
      </section>

      {/* 3. TOURNAMENT TIMELINE & DISPATCH */}
      <section className="bg-[#141416] rounded-xl border border-[#27272a] p-5 sm:p-6 space-y-6 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#27272a] gap-2">
          <div className="flex items-center gap-2 text-[#00f2ff]">
            <Clock className="w-4 h-4" />
            <h2 className="font-headline text-xs font-bold tracking-widest uppercase text-white">
              2. Tournament Timeline & Dispatch
            </h2>
            <span className="text-[#849495] text-xs font-body hidden sm:inline">
              | Automated Room Protocol
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#849495]">
            <Clock className="w-3.5 h-3.5 text-[#00f2ff]" />
            <span>Time Zone: <strong className="text-white">Asia/Kolkata (IST +5:30)</strong></span>
          </div>
        </div>

        {/* 3 Chronological Connected Stage Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 relative items-stretch">
          {/* STAGE 01: REGISTRATION PHASE */}
          <div className="bg-[#1b1b1d] border border-[#27272a] hover:border-[#3a494b] p-4 sm:p-5 rounded-xl transition-all flex flex-col justify-between h-full space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded bg-[#201f21] text-[#00f2ff] font-mono text-[10px] font-bold border border-[#00f2ff]/20">
                  STAGE 01
                </span>
                <span className="text-[10px] font-mono text-[#849495]">PUBLIC ACCESS</span>
              </div>

              <h3 className="font-headline text-sm font-bold text-white uppercase tracking-wider">
                Registration Phase
              </h3>

              <div className="space-y-3 pt-1">
                {/* Registration Opens */}
                <div className="space-y-1">
                  <label className="text-[10px] font-headline font-bold text-[#849495] uppercase block flex items-center gap-1.5">
                    <DoorOpen className="w-3.5 h-3.5 text-[#00f2ff] shrink-0" />
                    <span>Registration Opens</span>
                  </label>
                  <input
                    type="text"
                    value={form.registrationStart || 'Immediate'}
                    onChange={(e) => handleFieldChange('registrationStart', e.target.value)}
                    placeholder="e.g. Immediate or 10:00 AM IST"
                    className="w-full h-10 sm:h-11 bg-[#141416] border border-[#27272a] focus:border-[#00f2ff] rounded-lg px-3 text-xs text-white font-mono focus:outline-none transition-colors"
                  />
                </div>

                {/* Registration Closes */}
                <div className="space-y-1">
                  <label className="text-[10px] font-headline font-bold text-[#849495] uppercase block flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-[#ef4444] shrink-0" />
                    <span>Registration Closes</span>
                  </label>
                  <input
                    type="text"
                    value={form.registrationEnd || '1 Hour Prior to Kickoff'}
                    onChange={(e) => handleFieldChange('registrationEnd', e.target.value)}
                    placeholder="e.g. 05:00 PM IST"
                    className="w-full h-10 sm:h-11 bg-[#141416] border border-[#27272a] focus:border-[#00f2ff] rounded-lg px-3 text-xs text-white font-mono focus:outline-none transition-colors"
                  />
                  {mergedErrors.registrationEnd && (
                    <p className="text-[10px] text-[#ef4444] font-body flex items-center gap-1 mt-0.5">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{mergedErrors.registrationEnd}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="p-2.5 bg-[#201f21] rounded-lg border border-[#27272a] text-[#849495] text-xs font-body flex items-center gap-2 mt-auto">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#10b981] shrink-0" />
              <span>Capacity limit: {form.maxTeams || 12} registered squads</span>
            </div>
          </div>

          {/* STAGE 02: CAPTAIN CHECK-IN */}
          <div className="bg-[#1b1b1d] border border-[#27272a] hover:border-[#3a494b] p-4 sm:p-5 rounded-xl transition-all flex flex-col justify-between h-full space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded bg-[#201f21] text-[#f1cc2d] font-mono text-[10px] font-bold border border-[#f1cc2d]/20">
                  STAGE 02
                </span>
                <span className="text-[10px] font-mono text-[#f1cc2d]">MANDATORY VERIFICATION</span>
              </div>

              <h3 className="font-headline text-sm font-bold text-white uppercase tracking-wider">
                Captain Check-In
              </h3>

              <div className="space-y-3 pt-1">
                {/* Check-In Opens */}
                <div className="space-y-1">
                  <label className="text-[10px] font-headline font-bold text-[#849495] uppercase block flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#f1cc2d] shrink-0" />
                    <span>Check-In Opens</span>
                  </label>
                  <input
                    type="text"
                    value={form.checkInStart || '05:00 PM IST'}
                    onChange={(e) => handleFieldChange('checkInStart', e.target.value)}
                    placeholder="e.g. 05:00 PM IST"
                    className="w-full h-10 sm:h-11 bg-[#141416] border border-[#27272a] focus:border-[#00f2ff] rounded-lg px-3 text-xs text-white font-mono focus:outline-none transition-colors"
                  />
                  {mergedErrors.checkInStart && (
                    <p className="text-[10px] text-[#ef4444] font-body flex items-center gap-1 mt-0.5">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{mergedErrors.checkInStart}</span>
                    </p>
                  )}
                </div>

                {/* Check-In Closes (Strict) */}
                <div className="space-y-1">
                  <label className="text-[10px] font-headline font-bold text-[#849495] uppercase block flex items-center gap-1.5">
                    <Timer className="w-3.5 h-3.5 text-[#ef4444] shrink-0" />
                    <span>Check-In Closes (Strict)</span>
                  </label>
                  <input
                    type="text"
                    value={form.checkInEnd || form.checkInTime || '05:30 PM IST'}
                    onChange={(e) => handleFieldChange('checkInEnd', e.target.value)}
                    placeholder="e.g. 05:30 PM IST"
                    className="w-full h-10 sm:h-11 bg-[#141416] border border-[#27272a] focus:border-[#00f2ff] rounded-lg px-3 text-xs text-white font-mono focus:outline-none transition-colors"
                  />
                  {mergedErrors.checkInEnd && (
                    <p className="text-[10px] text-[#ef4444] font-body flex items-center gap-1 mt-0.5">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{mergedErrors.checkInEnd}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="p-2.5 bg-[#201f21] rounded-lg border border-[#27272a] text-[#849495] text-xs font-body flex items-center gap-2 mt-auto">
              <ShieldAlert className="w-3.5 h-3.5 text-[#f1cc2d] shrink-0" />
              <span>Unverified squads get auto-disqualified</span>
            </div>
          </div>

          {/* STAGE 03: MATCH PROTOCOL */}
          <div className="bg-[#1b1b1d] border border-[#27272a] hover:border-[#3a494b] p-4 sm:p-5 rounded-xl transition-all flex flex-col justify-between h-full space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded bg-[#201f21] text-[#00f2ff] font-mono text-[10px] font-bold border border-[#00f2ff]/20">
                  STAGE 03
                </span>
                <span className="text-[10px] font-mono text-[#00f2ff]">COMBAT ENGAGEMENT</span>
              </div>

              <h3 className="font-headline text-sm font-bold text-white uppercase tracking-wider">
                Match Deployment
              </h3>

              <div className="space-y-3 pt-1">
                {/* Room Credentials Published */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-headline font-bold text-[#849495] uppercase flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-[#00f2ff] shrink-0" />
                      <span>Room Published</span>
                    </label>
                    <span className="text-[10px] text-[#00f2ff] font-mono">(15m prior)</span>
                  </div>
                  <input
                    type="text"
                    value={form.roomPublishTime || '05:45 PM IST'}
                    onChange={(e) => handleFieldChange('roomPublishTime', e.target.value)}
                    placeholder="e.g. 05:45 PM IST"
                    className="w-full h-10 sm:h-11 bg-[#141416] border border-[#27272a] focus:border-[#00f2ff] rounded-lg px-3 text-xs text-white font-mono focus:outline-none transition-colors"
                  />
                  {mergedErrors.roomPublishTime && (
                    <p className="text-[10px] text-[#ef4444] font-body flex items-center gap-1 mt-0.5">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{mergedErrors.roomPublishTime}</span>
                    </p>
                  )}
                </div>

                {/* Official Match Start */}
                <div className="space-y-1">
                  <label className="text-[10px] font-headline font-bold text-[#849495] uppercase block flex items-center gap-1.5">
                    <Play className="w-3.5 h-3.5 text-[#10b981] shrink-0" />
                    <span>Official Match Start</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={form.startDate || ''}
                      onChange={(e) => handleFieldChange('startDate', e.target.value)}
                      className="w-full h-10 sm:h-11 bg-[#141416] border border-[#27272a] focus:border-[#00f2ff] rounded-lg px-3 text-xs text-white font-mono focus:outline-none transition-colors"
                    />
                    <input
                      type="text"
                      value={form.startTime || '06:00 PM IST'}
                      onChange={(e) => handleFieldChange('startTime', e.target.value)}
                      placeholder="e.g. 06:00 PM IST"
                      className="w-full h-10 sm:h-11 bg-[#141416] border border-[#27272a] focus:border-[#00f2ff] rounded-lg px-3 text-xs text-white font-mono focus:outline-none transition-colors"
                    />
                  </div>
                  {(mergedErrors.startDate || mergedErrors.startTime) && (
                    <p className="text-[10px] text-[#ef4444] font-body flex items-center gap-1 mt-0.5">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{mergedErrors.startDate || mergedErrors.startTime}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="p-2.5 bg-[#201f21] rounded-lg border border-[#27272a] text-[#849495] text-xs font-body flex items-center gap-2 mt-auto">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#00f2ff] shrink-0" />
              <span>SMS & App push dispatch to verified captains</span>
            </div>
          </div>
        </div>

        {/* Sync Notice Banner */}
        <div className="flex items-start gap-3 p-3.5 rounded-lg bg-[#1b1b1d] border border-[#27272a] text-xs font-body text-[#849495]">
          <Info className="w-4 h-4 text-[#00f2ff] shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-white font-semibold">Synchronization Notice:</strong> All timeline events are synchronized to Indian Standard Time (IST). Room credentials dispatch automatically to team captains via verified SMS gateway 15 minutes before match start.
          </p>
        </div>
      </section>

      {/* 4. OFFICIAL TOURNAMENT RULEBOOK */}
      <section className="bg-[#141416] rounded-xl border border-[#27272a] p-5 sm:p-6 space-y-5 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#27272a] gap-2">
          <div className="flex items-center gap-2 text-[#00f2ff]">
            <ShieldAlert className="w-4 h-4" />
            <div>
              <h2 className="font-headline text-xs font-bold tracking-widest uppercase text-white">
                3. Official Tournament Rulebook
              </h2>
              <p className="text-[#849495] text-xs font-body">
                Standard Garena Free Fire MAX Competitive Arbiter Protocol
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded bg-[#1b1b1d] border border-[#27272a] text-[10px] font-mono text-[#849495] self-start sm:self-auto">
            RULESET REV: 2024.4.1
          </span>
        </div>

        {/* 4 Rule Highlight Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <div className="flex items-start gap-3.5 p-3.5 rounded-lg bg-[#1b1b1d] border border-[#27272a] hover:border-[#3a494b] transition-colors">
            <div className="w-7 h-7 rounded bg-[#201f21] text-[#10b981] border border-[#27272a] flex items-center justify-center shrink-0 mt-0.5">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <p className="font-headline text-xs font-bold text-white uppercase">
                1. Hardware Specification
              </p>
              <p className="text-xs text-[#849495] font-body leading-relaxed">
                No emulators allowed under any circumstances. Mobile smartphone players only (certified Android & iOS devices).
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 p-3.5 rounded-lg bg-[#1b1b1d] border border-[#27272a] hover:border-[#3a494b] transition-colors">
            <div className="w-7 h-7 rounded bg-[#201f21] text-[#10b981] border border-[#27272a] flex items-center justify-center shrink-0 mt-0.5">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <p className="font-headline text-xs font-bold text-white uppercase">
                2. POV Screen Recording
              </p>
              <p className="text-xs text-[#849495] font-body leading-relaxed">
                Screen recording is mandatory for all active squad players from initial drop until elimination or Booyah.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 p-3.5 rounded-lg bg-[#1b1b1d] border border-[#27272a] hover:border-[#3a494b] transition-colors">
            <div className="w-7 h-7 rounded bg-[#201f21] text-[#ef4444] border border-[#27272a] flex items-center justify-center shrink-0 mt-0.5">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <p className="font-headline text-xs font-bold text-white uppercase">
                3. Anti-Cheat & Third-Party Tools
              </p>
              <p className="text-xs text-[#849495] font-body leading-relaxed">
                Zero tolerance for scripts, aimbots, or third-party game modifiers. Hardware Anti-Cheat is actively monitored.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 p-3.5 rounded-lg bg-[#1b1b1d] border border-[#27272a] hover:border-[#3a494b] transition-colors">
            <div className="w-7 h-7 rounded bg-[#201f21] text-[#ef4444] border border-[#27272a] flex items-center justify-center shrink-0 mt-0.5">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <p className="font-headline text-xs font-bold text-white uppercase">
                4. Fair Play & Anti-Teaming
              </p>
              <p className="text-xs text-[#849495] font-body leading-relaxed">
                No teaming, intentional feeding, or point manipulation between opposing squads. Collision results in immediate ban.
              </p>
            </div>
          </div>
        </div>

        {/* Rulebook Footer Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between pt-3 border-t border-[#27272a] gap-3">
          <div className="flex items-center gap-2 text-[#849495] text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-[#00f2ff]" />
            <span className="font-bold text-white font-headline uppercase">
              10 OFFICIAL GUIDELINES ENFORCED BY ARBITER
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowFullRulebook(true)}
            className="px-4 py-2 rounded-lg bg-[#1b1b1d] hover:bg-[#201f21] border border-[#27272a] hover:border-[#00f2ff]/40 text-[#00f2ff] text-xs font-headline font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            <span>VIEW FULL RULEBOOK</span>
          </button>
        </div>
      </section>

      {/* FULL RULEBOOK MODAL POPUP */}
      {showFullRulebook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#141416] border border-[#27272a] rounded-xl max-w-2xl w-full p-6 space-y-4 shadow-2xl relative max-h-[85vh] overflow-y-auto font-body">
            <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
              <div className="flex items-center gap-2 text-[#00f2ff]">
                <ShieldCheck className="w-5 h-5 text-[#00f2ff]" />
                <h3 className="font-headline text-sm font-bold uppercase tracking-wider text-white">
                  Official MJ ESPORTS Rulebook (10 Rules)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowFullRulebook(false)}
                className="w-7 h-7 rounded bg-[#1b1b1d] hover:bg-[#201f21] border border-[#27272a] text-[#849495] hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5">
              {OFFICIAL_MJ_RULES.map((rule, idx) => (
                <div
                  key={`rule-${idx}`}
                  className="flex items-start gap-3 p-3 bg-[#1b1b1d] border border-[#27272a] rounded-lg text-xs"
                >
                  <span className="w-5 h-5 rounded bg-[#201f21] border border-[#27272a] text-[#00f2ff] font-mono font-bold flex items-center justify-center shrink-0 text-[10px]">
                    {idx + 1}
                  </span>
                  <span className="text-white font-medium leading-relaxed">{rule}</span>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-[#27272a] flex justify-end">
              <button
                type="button"
                onClick={() => setShowFullRulebook(false)}
                className="px-4 py-2 rounded-lg bg-[#00f2ff] text-[#00363a] font-headline font-bold text-xs uppercase cursor-pointer"
              >
                Close Rulebook
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
