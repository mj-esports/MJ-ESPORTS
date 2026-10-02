import React from 'react'
import {
  Trophy,
  Gamepad2,
  Users,
  User,
  Users2,
  CheckCircle2,
  ShieldCheck,
  Globe,
  Radio,
  BarChart3,
  Info,
  Lock,
  Edit3,
  AlertCircle
} from 'lucide-react'
import { getDefaultGameCapacity } from '../../../../../utils/tournamentUtils'

export default function Step1GeneralInfo({
  form = {},
  formErrors = {},
  onChange,
  isEditing = false,
}) {
  const currentMode = form.mode || 'squad'
  const capInfo = getDefaultGameCapacity(form.game || 'Free Fire MAX', currentMode)
  const currentTeams = Number(form.maxTeams || capInfo.maxTeams)
  const currentPlayers = currentTeams * capInfo.teamSize
  const roomCap = capInfo.roomCap || 50
  const occupancyPercent = Math.min(100, Math.round((currentPlayers / roomCap) * 100))
  const spectatorSlots = Math.max(0, roomCap - currentPlayers)

  const handleTitleChange = (e) => {
    const val = e.target.value
    onChange({ title: val })
  }

  const handleModeSelect = (newMode) => {
    const nextCap = getDefaultGameCapacity(form.game || 'Free Fire MAX', newMode)
    onChange({
      mode: newMode,
      maxTeams: isEditing ? (form.maxTeams || nextCap.maxTeams) : nextCap.maxTeams,
    })
  }

  const modes = [
    {
      id: 'solo',
      label: 'SOLO',
      badge: '1P',
      desc: 'Individual survival battle royale protocol.',
      stats: 'Max 48 Combatants',
      icon: User,
    },
    {
      id: 'duo',
      label: 'DUO',
      badge: '2P',
      desc: 'Two-player tactical synchronized tandem.',
      stats: '24 Teams • 48 Players',
      icon: Users,
    },
    {
      id: 'squad',
      label: 'SQUAD',
      badge: '4P',
      desc: 'Standard 4-player competitive team format.',
      stats: '12 Squads • 48 Players Total',
      icon: Users2,
    },
  ]

  return (
    <div className="space-y-6 sm:space-y-8 select-none">
      {/* 1. SECTION INTRODUCTION */}
      <div className="border-b border-[#27272a] pb-4 sm:pb-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full bg-[#00f2ff]" />
          <h1 className="font-headline text-xl sm:text-2xl md:text-3xl font-bold text-white tracking-tight">
            01. GENERAL
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-[#849495] font-body">
          Set up the tournament identity, title, competitive platform, and roster squad format.
        </p>
      </div>

      {/* 2. MAIN 2-COLUMN RESPONSIVE GRID (8 / 4) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Left Column (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* CARD 1: TOURNAMENT IDENTITY */}
          <div className="bg-[#141416] rounded-xl border border-[#27272a] p-5 sm:p-6 space-y-5 shadow-lg">
            <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
              <div className="flex items-center gap-2 text-[#00f2ff]">
                <Trophy className="w-4 h-4" />
                <h2 className="font-headline text-xs font-bold tracking-widest uppercase text-white">
                  Tournament Identity
                </h2>
              </div>
              <span className="text-[10px] font-mono text-[#00f2ff] px-2 py-0.5 rounded bg-[#00f2ff]/10 border border-[#00f2ff]/20 uppercase">
                MANDATORY STEP
              </span>
            </div>

            {/* Tournament Title Input */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <label
                  htmlFor="tournament-title"
                  className="font-headline font-bold tracking-wider text-[#e5e1e4] uppercase flex items-center gap-1"
                >
                  <span>Tournament Name</span>
                  <span className="text-[#00f2ff]">*</span>
                </label>
                <span className="font-mono text-[11px] text-[#849495]">
                  {(form.title || '').length} / 70 characters
                </span>
              </div>

              <div className="relative">
                <input
                  id="tournament-title"
                  type="text"
                  value={form.title || ''}
                  onChange={handleTitleChange}
                  maxLength={70}
                  placeholder="e.g. Free Fire MAX Scrim Series: Bermuda Blitz #24"
                  className={`w-full h-11 bg-[#1b1b1d] border rounded-lg px-4 pr-10 text-white font-body text-sm placeholder:text-[#849495]/60 focus:outline-none transition-colors ${
                    formErrors.title
                      ? 'border-[#ef4444] focus:border-[#ef4444]'
                      : 'border-[#27272a] focus:border-[#00f2ff]'
                  }`}
                />
                <div className="absolute right-3.5 top-3.5 text-[#849495] pointer-events-none">
                  <Edit3 className="w-4 h-4 shrink-0" />
                </div>
              </div>

              {formErrors.title ? (
                <p className="text-xs text-[#ef4444] flex items-center gap-1 font-body">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{formErrors.title}</span>
                </p>
              ) : (
                <p className="text-xs text-[#849495] font-body leading-relaxed">
                  This title will be broadcasted on leaderboards, lobby invites, and player receipts.
                </p>
              )}
            </div>

            {/* Game Platform (Free Fire MAX) */}
            <div className="space-y-2 pt-2">
              <label className="block font-headline text-xs font-bold tracking-wider text-[#e5e1e4] uppercase">
                Competitive Game & Platform
              </label>

              <div className="p-3.5 sm:p-4 rounded-lg bg-[#1b1b1d] border border-[#27272a] flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-lg bg-[#201f21] border border-[#27272a] flex items-center justify-center text-[#00f2ff] font-headline font-black text-sm shrink-0">
                    FF
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-headline font-bold text-white text-sm tracking-wide">
                        FREE FIRE MAX
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#00f2ff]/10 text-[#00f2ff] border border-[#00f2ff]/30">
                        OFFICIAL
                      </span>
                    </div>
                    <span className="text-xs text-[#849495] flex items-center gap-1.5 mt-0.5 truncate">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#10b981] shrink-0" />
                      <span className="truncate">Garena Verified Arbiter Protocol Integrated</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-[#131315] border border-[#27272a] text-[#849495] text-xs font-mono shrink-0">
                  <Lock className="w-3 h-3" />
                  <span className="hidden sm:inline">LOCKED TO CLIENT</span>
                </div>
              </div>
            </div>
          </div>

          {/* CARD 2: MATCH MODE SELECTOR */}
          <div className="bg-[#141416] rounded-xl border border-[#27272a] p-5 sm:p-6 space-y-4 shadow-lg">
            <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
              <div className="flex items-center gap-2 text-[#00f2ff]">
                <Gamepad2 className="w-4 h-4" />
                <h2 className="font-headline text-xs font-bold tracking-widest uppercase text-white">
                  Match Mode
                </h2>
              </div>
              <span className="text-[10px] font-mono text-[#849495]">LOBBY ROSTER MATRIX</span>
            </div>

            <p className="text-xs sm:text-sm text-[#849495] font-body">
              Select the roster composition per entry slot. Dynamic player limits calculate automatically.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
              {modes.map((m) => {
                const isSelected = currentMode === m.id
                const IconComponent = m.icon

                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleModeSelect(m.id)}
                    className={`relative text-left p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between min-h-[165px] ${
                      isSelected
                        ? 'bg-[#201f21] border-2 border-[#00f2ff] shadow-lg shadow-[#00f2ff]/5'
                        : 'bg-[#1b1b1d] border-[#27272a] hover:border-[#3a494b] opacity-80 hover:opacity-100'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2.5">
                        <span
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'bg-[#00f2ff]/20 text-[#00f2ff] border border-[#00f2ff]'
                              : 'bg-[#141416] text-[#849495] border border-[#27272a]'
                          }`}
                        >
                          <IconComponent className="w-4 h-4 shrink-0" />
                        </span>

                        {isSelected ? (
                          <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-[#00f2ff] px-2 py-0.5 rounded bg-[#00f2ff]/10 border border-[#00f2ff]/30 shrink-0">
                            <CheckCircle2 className="w-3 h-3 shrink-0" />
                            <span>SELECTED</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono text-[#849495] px-2 py-0.5 rounded bg-[#141416] border border-[#27272a] shrink-0">
                            {m.badge}
                          </span>
                        )}
                      </div>

                      <h3
                        className={`font-headline text-base font-bold tracking-wider uppercase transition-colors ${
                          isSelected ? 'text-[#00f2ff]' : 'text-white'
                        }`}
                      >
                        {m.label}
                      </h3>
                      <p className="text-xs text-[#849495] font-body mt-1 leading-snug">
                        {m.desc}
                      </p>
                    </div>

                    <div
                      className={`mt-4 pt-3 border-t text-[11px] font-mono flex items-center justify-between ${
                        isSelected ? 'border-[#00f2ff]/20 text-[#00f2ff]' : 'border-[#27272a] text-[#849495]'
                      }`}
                    >
                      <span>{m.stats}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* CARD 3: REGION & SERVER SCOPE */}
          <div className="bg-[#141416] rounded-xl border border-[#27272a] p-5 sm:p-6 space-y-4 shadow-lg">
            <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
              <div className="flex items-center gap-2 text-[#00f2ff]">
                <Globe className="w-4 h-4 shrink-0" />
                <h2 className="font-headline text-xs font-bold tracking-widest uppercase text-white">
                  Region & Server Scope
                </h2>
              </div>
              <span className="text-[10px] font-mono text-[#849495]">SERVER NODE</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block font-headline text-xs font-bold tracking-wider text-[#849495] uppercase">
                  Server Region
                </label>
                <div className="w-full h-11 bg-[#1b1b1d] border border-[#27272a] rounded-lg px-3.5 flex items-center justify-between text-white text-xs font-mono">
                  <span className="flex items-center gap-2 truncate">
                    <span className="w-2 h-2 rounded-full bg-[#10b981] shrink-0" />
                    <span className="truncate">South Asia / India (IN-DELHI)</span>
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#141416] text-[#10b981] border border-[#10b981]/30 shrink-0">
                    LOW LATENCY
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block font-headline text-xs font-bold tracking-wider text-[#849495] uppercase">
                  Format Classification
                </label>
                <div className="w-full h-11 bg-[#1b1b1d] border border-[#27272a] rounded-lg px-3.5 flex items-center justify-between text-white text-xs font-mono">
                  <span className="flex items-center gap-2 truncate">
                    <Trophy className="w-3.5 h-3.5 text-[#f1cc2d] shrink-0" />
                    <span className="truncate">Invitational & Open Scrims</span>
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#141416] text-[#849495] border border-[#27272a] shrink-0">
                    TIER-1
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: CAPACITY MATRIX (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-[#141416] rounded-xl border border-[#27272a] p-5 sm:p-6 lg:sticky lg:top-4 space-y-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
              <div className="flex items-center gap-2 text-[#00f2ff]">
                <BarChart3 className="w-4 h-4" />
                <h2 className="font-headline text-xs font-bold tracking-widest uppercase text-white">
                  Capacity Matrix
                </h2>
              </div>
              <span className="px-2 py-0.5 rounded bg-[#1b1b1d] text-[10px] font-mono font-bold text-[#10b981] border border-[#10b981]/30">
                CALCULATED
              </span>
            </div>

            {/* Capacity Meter */}
            <div className="space-y-2">
              <div className="flex justify-between items-baseline">
                <span className="font-headline text-xs font-bold text-[#849495] uppercase tracking-wider">
                  Lobby Saturation
                </span>
                <span className="font-headline text-xl font-bold text-[#00f2ff] tracking-tight">
                  {currentPlayers} <span className="text-xs font-normal text-[#849495]">/ {roomCap} Players</span>
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2.5 rounded-full bg-[#1b1b1d] overflow-hidden p-0.5 border border-[#27272a]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#00dbe7] to-[#00f2ff] transition-all duration-300 shadow-[0_0_10px_rgba(0,242,255,0.3)]"
                  style={{ width: `${occupancyPercent}%` }}
                />
              </div>

              <div className="flex justify-between text-[11px] font-mono text-[#849495] pt-0.5">
                <span className="text-[#00f2ff]">{occupancyPercent}% Allocated</span>
                <span>{spectatorSlots} Spectator Slots Reserved</span>
              </div>
            </div>

            {/* Metrics Breakdown Table */}
            <div className="divide-y divide-[#27272a] border border-[#27272a] rounded-lg overflow-hidden bg-[#1b1b1d]">
              <div className="flex items-center justify-between px-3.5 py-2.5 text-xs font-body">
                <span className="text-[#849495]">Active Match Mode</span>
                <span className="font-headline font-bold text-[#00f2ff] uppercase">
                  {currentMode === 'solo' ? 'SOLO (1P)' : currentMode === 'duo' ? 'DUO (2P)' : 'SQUAD (4P)'}
                </span>
              </div>
              <div className="flex items-center justify-between px-3.5 py-2.5 text-xs font-body">
                <span className="text-[#849495]">Total Team Slots</span>
                <span className="font-headline font-bold text-white">
                  {currentTeams} {capInfo.teamUnit}
                </span>
              </div>
              <div className="flex items-center justify-between px-3.5 py-2.5 text-xs font-body">
                <span className="text-[#849495]">Combatants per Slot</span>
                <span className="font-headline font-bold text-white">
                  {capInfo.teamSize} Players
                </span>
              </div>
              <div className="flex items-center justify-between px-3.5 py-2.5 text-xs font-body bg-[#201f21]">
                <span className="text-[#e5e1e4] font-medium">Max Active Players</span>
                <span className="font-headline font-extrabold text-[#00f2ff] text-sm">
                  {currentPlayers} Players
                </span>
              </div>
              <div className="flex items-center justify-between px-3.5 py-2.5 text-xs font-body">
                <span className="text-[#849495]">Lobby Max Room Cap</span>
                <span className="font-mono text-white font-bold">{roomCap} Slots</span>
              </div>
            </div>

            {/* System Diagnostics Checklist */}
            <div className="p-3.5 rounded-lg bg-[#1b1b1d] border border-[#27272a] space-y-2">
              <span className="font-headline text-[10px] font-bold text-[#849495] uppercase tracking-widest block">
                System Diagnostics
              </span>
              <div className="flex items-center gap-2 text-xs text-white">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#10b981] shrink-0" />
                <span>Garena Custom Room Card: Available</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-white">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#10b981] shrink-0" />
                <span>Dedicated Observer Slots: {spectatorSlots} Assigned</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-white">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#10b981] shrink-0" />
                <span>Anti-Cheat Telemetry: High Sensitivity</span>
              </div>
            </div>

            {/* Help Tip */}
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-[#201f21] border border-[#27272a] text-[#849495]">
              <Info className="w-4 h-4 text-[#00f2ff] shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed">
                Step 1 locks the maximum squad count for round-robin bracket generations. Limits cannot be reduced once match operations begin.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
