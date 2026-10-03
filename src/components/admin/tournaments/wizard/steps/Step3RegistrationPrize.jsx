import React from 'react'
import {
  Trophy,
  IndianRupee,
  Users,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Award,
  Swords,
  Target,
  Sparkles,
  Info,
  AlertCircle,
  Coins
} from 'lucide-react'
import { getDefaultGameCapacity } from '../../../../../utils/tournamentUtils'

export default function Step3RegistrationPrize({
  form = {},
  formErrors = {},
  onChange,
}) {
  const capInfo = getDefaultGameCapacity(form.game || 'Free Fire MAX', form.mode || 'squad')
  const currentTeams = Number(form.maxTeams || capInfo.maxTeams)
  const currentPlayers = currentTeams * capInfo.teamSize
  const roomCap = capInfo.roomCap || 50
  const occupancyPercent = Math.min(100, Math.round((currentPlayers / roomCap) * 100))

  const entryFeeNum = typeof form.entryFeeNum === 'number'
    ? form.entryFeeNum
    : (parseFloat(String(form.entryFee || 0).replace(/[^0-9.]/g, '')) || 0)

  const prizeType = form.prizeType || 'placement'
  const prizes = form.prizes || {
    firstPrize: 1000,
    secondPrize: 500,
    thirdPrize: 250,
    fourthPrize: 0,
    fifthPrize: 0,
    mvpBonus: 0,
    winnerPrize: 1500,
  }
  const perKillReward = Number(form.perKillReward !== undefined ? form.perKillReward : 30)

  const approvalMode = form.registrationApproval || 'Automatic'
  const allowWaitlist = Boolean(form.allowWaitlist)

  // Prize calculation logic
  const calculateTotalPrize = () => {
    if (prizeType === 'winner_takes_all') {
      return Number(prizes.winnerPrize || 0)
    }
    const totalEstPlayers = currentPlayers
    if (prizeType === 'per_kill') {
      return totalEstPlayers * perKillReward
    }
    const placementSum =
      Number(prizes.firstPrize || 0) +
      Number(prizes.secondPrize || 0) +
      Number(prizes.thirdPrize || 0) +
      Number(prizes.fourthPrize || 0) +
      Number(prizes.fifthPrize || 0) +
      Number(prizes.mvpBonus || 0)
    if (prizeType === 'placement_kill') {
      return placementSum + (totalEstPlayers * perKillReward)
    }
    return placementSum
  }

  const estimatedTotalPrize = calculateTotalPrize()

  const handleEntryFeeChange = (e) => {
    const val = e.target.value
    const cleaned = val.replace(/[^0-9.]/g, '')
    const num = parseFloat(cleaned) || 0
    onChange({
      entryFeeNum: num,
      entryFee: num > 0 ? `₹${num}` : 'Free',
    })
  }

  const handleSlotsChange = (e) => {
    const val = parseInt(e.target.value, 10)
    onChange({ maxTeams: isNaN(val) ? 0 : val })
  }

  const handleApprovalChange = (mode) => {
    onChange({ registrationApproval: mode })
  }

  const handleWaitlistChange = (enabled) => {
    onChange({ allowWaitlist: enabled })
  }

  const handlePrizeTypeChange = (type) => {
    onChange({ prizeType: type })
  }

  const handlePrizeFieldChange = (key, value) => {
    const num = parseFloat(value.replace(/[^0-9.]/g, '')) || 0
    onChange({
      prizes: {
        ...prizes,
        [key]: num,
      },
    })
  }

  const handlePerKillChange = (e) => {
    const val = parseFloat(e.target.value.replace(/[^0-9.]/g, '')) || 0
    onChange({ perKillReward: val })
  }

  const prizeTypesList = [
    {
      id: 'placement',
      label: 'PLACEMENT ONLY',
      desc: 'Awards based purely on final leaderboard standing',
    },
    {
      id: 'placement_kill',
      label: 'PLACEMENT + KILL',
      desc: 'Combined payout for final rank and confirmed frags',
    },
    {
      id: 'per_kill',
      label: 'PER KILL ONLY',
      desc: 'Bounty earned strictly per verified elimination',
    },
    {
      id: 'winner_takes_all',
      label: 'WINNER TAKES ALL',
      desc: '100% of the prize allocated solely to Booyah #1',
    },
  ]

  return (
    <div className="space-y-6 sm:space-y-8 select-none">
      {/* 1. SECTION HEADER */}
      <div className="border-b border-[#27272a] pb-4 sm:pb-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full bg-[#00f2ff]" />
          <h1 className="font-headline text-xl sm:text-2xl md:text-3xl font-bold text-white tracking-tight">
            03. REGISTRATION & PRIZES
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-[#849495] font-body">
          Configure participation slots, deferred payment status, prize structure, and review live tournament specs.
        </p>
      </div>

      {/* 2. 2-COLUMN BALANCED WORKSPACE GRID (7 COLS / 5 COLS) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Left Column (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* SECTION 1: REGISTRATION & CAPACITY */}
          <div className="bg-[#141416] rounded-xl border border-[#27272a] p-5 sm:p-6 space-y-5 shadow-lg">
            <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
              <div className="flex items-center gap-2 text-[#00f2ff]">
                <Users className="w-4 h-4" />
                <h2 className="font-headline text-xs font-bold tracking-widest uppercase text-white">
                  1. Registration & Capacity
                </h2>
              </div>
              <span className="text-[10px] font-mono text-[#10b981] px-2 py-0.5 rounded bg-[#10b981]/10 border border-[#10b981]/30 uppercase">
                LOBBY SPECS
              </span>
            </div>

            {/* Entry Fee & Team Slots Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Entry Fee Field */}
              <div className="space-y-1.5">
                <label className="block font-headline text-xs font-bold tracking-wider text-[#849495] uppercase">
                  Entry Fee per Slot
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#849495] font-bold">
                    ₹
                  </div>
                  <input
                    type="text"
                    value={entryFeeNum || ''}
                    onChange={handleEntryFeeChange}
                    placeholder="0.00"
                    className="w-full h-11 bg-[#1b1b1d] border border-[#27272a] focus:border-[#00f2ff] rounded-lg pl-8 pr-16 sm:pr-20 text-white font-mono text-xs focus:outline-none transition-colors"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-[10px] sm:text-xs font-mono text-[#849495] uppercase">
                    / {form.mode || 'squad'}
                  </div>
                </div>
                {formErrors.entryFee && (
                  <p className="text-[10px] text-[#ef4444] font-body flex items-center gap-1 mt-0.5">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{formErrors.entryFee}</span>
                  </p>
                )}
                <p className="text-[11px] text-[#849495] font-body flex items-center gap-1">
                  <Info className="w-3 h-3 text-[#00f2ff] shrink-0" />
                  <span>Free entry allowed by entering 0.</span>
                </p>
              </div>

              {/* Total Team Slots Field */}
              <div className="space-y-1.5">
                <label className="block font-headline text-xs font-bold tracking-wider text-[#849495] uppercase">
                  Total Team / Squad Slots
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={form.maxTeams || currentTeams}
                  onChange={handleSlotsChange}
                  className="w-full h-11 bg-[#1b1b1d] border border-[#27272a] focus:border-[#00f2ff] rounded-lg px-3.5 text-white font-mono text-xs focus:outline-none transition-colors"
                />
                {formErrors.maxTeams && (
                  <p className="text-[10px] text-[#ef4444] font-body flex items-center gap-1 mt-0.5">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{formErrors.maxTeams}</span>
                  </p>
                )}
                <p className="text-[11px] text-[#849495] font-body">
                  Configured capacity for matchmaking bracket.
                </p>
              </div>
            </div>

            {/* Capacity Matrix Allocation Strip */}
            <div className="p-3.5 rounded-lg bg-[#1b1b1d] border border-[#27272a] space-y-2.5">
              <span className="font-headline text-[10px] font-bold text-[#849495] uppercase tracking-wider block">
                Capacity Matrix Allocation
              </span>
              <div className="flex flex-wrap items-center gap-2.5 text-xs font-mono">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#141416] border border-[#27272a] text-white">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#00f2ff] shrink-0" />
                  <span className="font-bold">{currentTeams} SQUADS</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#141416] border border-[#27272a] text-white">
                  <Users className="w-3.5 h-3.5 text-[#00f2ff] shrink-0" />
                  <span className="font-bold">{currentPlayers} / {roomCap} PLAYERS</span>
                </div>
                <div className="text-[10px] text-[#849495] px-2.5 py-1.5 bg-[#201f21] rounded border border-[#27272a]">
                  2 OBSERVER SLOTS RESERVED (ADMIN / CASTER)
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-[#201f21] h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-[#00f2ff] h-full transition-all duration-300"
                  style={{ width: `${occupancyPercent}%` }}
                />
              </div>
            </div>

            {/* Approval & Waitlist Toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Registration Approval */}
              <div className="space-y-1.5">
                <label className="block font-headline text-xs font-bold tracking-wider text-[#849495] uppercase">
                  Registration Approval
                </label>
                <div className="grid grid-cols-2 p-1 bg-[#1b1b1d] border border-[#27272a] rounded-lg">
                  <button
                    type="button"
                    onClick={() => handleApprovalChange('Automatic')}
                    className={`min-h-[46px] py-1.5 px-2 text-xs font-headline font-bold rounded transition-all cursor-pointer flex flex-col items-center justify-center ${
                      approvalMode === 'Automatic'
                        ? 'bg-[#00f2ff]/15 border border-[#00f2ff] text-[#00f2ff] shadow-sm'
                        : 'text-[#849495] hover:text-white bg-transparent border border-transparent'
                    }`}
                  >
                    <span>AUTOMATIC</span>
                    <span className="text-[10px] font-mono font-normal opacity-80">Instant Slot</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApprovalChange('Manual')}
                    className={`min-h-[46px] py-1.5 px-2 text-xs font-headline font-bold rounded transition-all cursor-pointer flex flex-col items-center justify-center ${
                      approvalMode === 'Manual'
                        ? 'bg-[#00f2ff]/15 border border-[#00f2ff] text-[#00f2ff] shadow-sm'
                        : 'text-[#849495] hover:text-white bg-transparent border border-transparent'
                    }`}
                  >
                    <span>MANUAL</span>
                    <span className="text-[10px] font-mono font-normal opacity-80">Admin Review</span>
                  </button>
                </div>
              </div>

              {/* Waitlist Queue */}
              <div className="space-y-1.5">
                <label className="block font-headline text-xs font-bold tracking-wider text-[#849495] uppercase">
                  Waitlist Queue
                </label>
                <div className="grid grid-cols-2 p-1 bg-[#1b1b1d] border border-[#27272a] rounded-lg">
                  <button
                    type="button"
                    onClick={() => handleWaitlistChange(true)}
                    className={`min-h-[46px] py-1.5 px-2 text-xs font-headline font-bold rounded transition-all cursor-pointer flex flex-col items-center justify-center ${
                      allowWaitlist
                        ? 'bg-[#00f2ff]/15 border border-[#00f2ff] text-[#00f2ff] shadow-sm'
                        : 'text-[#849495] hover:text-white bg-transparent border border-transparent'
                    }`}
                  >
                    <span>ENABLED</span>
                    <span className="text-[10px] font-mono font-normal opacity-80">Auto-fill no-show</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleWaitlistChange(false)}
                    className={`min-h-[46px] py-1.5 px-2 text-xs font-headline font-bold rounded transition-all cursor-pointer flex flex-col items-center justify-center ${
                      !allowWaitlist
                        ? 'bg-[#00f2ff]/15 border border-[#00f2ff] text-[#00f2ff] shadow-sm'
                        : 'text-[#849495] hover:text-white bg-transparent border border-transparent'
                    }`}
                  >
                    <span>DISABLED</span>
                    <span className="text-[10px] font-mono font-normal opacity-80">Strict cutoff</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: PAYMENT (DEFERRED STATUS - MANDATORY REQUIREMENT) */}
          <div className="bg-[#1b1b1d] rounded-xl border border-dashed border-[#3a494b] p-5 sm:p-6 space-y-4 opacity-90 relative overflow-hidden select-none cursor-not-allowed">
            <div className="flex items-start justify-between gap-3">
              <div className="flex gap-3.5">
                <div className="w-10 h-10 rounded-lg bg-[#141416] border border-[#27272a] flex items-center justify-center text-[#849495] shrink-0">
                  <Lock className="w-5 h-5 text-[#849495] shrink-0" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-headline text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
                      PAYMENT COLLECTION • CURRENTLY UNAVAILABLE
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#201f21] text-[#849495] border border-[#27272a] uppercase">
                      DEFERRED STATUS
                    </span>
                  </div>
                  <p className="text-xs text-[#849495] font-body">
                    Online payment integration will be enabled in a future update.
                  </p>
                  <p className="text-xs text-[#849495]/80 font-body leading-relaxed pt-1">
                    Tournament entry fee collection is operating in manual/escrow simulation mode. No active payment gateway charges apply during this phase.
                  </p>
                </div>
              </div>
            </div>

            {/* Clear non-selectable notice strip */}
            <div className="mt-2 pt-3 border-t border-[#27272a] flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-[#849495] gap-2">
              <span className="flex items-center gap-1.5 font-body">
                <ShieldCheck className="w-3.5 h-3.5 text-[#10b981] shrink-0" />
                <span>Simulation mode active: Team slots reserve automatically without transaction hold.</span>
              </span>
              <span className="font-mono text-[10px] text-[#849495] px-2 py-0.5 rounded bg-[#141416] border border-[#27272a] uppercase shrink-0">
                GATEWAY: OFFLINE
              </span>
            </div>
          </div>

          {/* SECTION 3: PRIZE TYPE SELECTION */}
          <div className="bg-[#141416] rounded-xl border border-[#27272a] p-5 sm:p-6 space-y-4 shadow-lg">
            <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
              <div className="flex items-center gap-2 text-[#00f2ff]">
                <Award className="w-4 h-4" />
                <h2 className="font-headline text-xs font-bold tracking-widest uppercase text-white">
                  3. Prize Type
                </h2>
              </div>
              <span className="text-[10px] font-mono text-[#00f2ff]">4 POOL CONFIGURATIONS</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {prizeTypesList.map((pt) => {
                const isSelected = prizeType === pt.id
                return (
                  <div
                    key={pt.id}
                    onClick={() => handlePrizeTypeChange(pt.id)}
                    className={`p-3.5 rounded-lg border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#201f21] border-2 border-[#00f2ff] shadow-sm'
                        : 'bg-[#1b1b1d] border-[#27272a] hover:border-[#3a494b]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-headline text-xs font-bold uppercase tracking-wider ${
                            isSelected ? 'text-[#00f2ff]' : 'text-white'
                          }`}
                        >
                          {pt.label}
                        </span>
                        {isSelected && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#00f2ff] text-[#00363a]">
                            SELECTED
                          </span>
                        )}
                      </div>
                      <div
                        className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-[#00f2ff] text-[#00363a]' : 'border border-[#27272a]'
                        }`}
                      >
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5] shrink-0" />}
                      </div>
                    </div>
                    <p className="text-xs text-[#849495] font-body leading-snug">
                      {pt.desc}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* SECTION 4: PRIZE CONFIGURATION & BREAKDOWN */}
          <div className="bg-[#141416] rounded-xl border border-[#27272a] p-5 sm:p-6 space-y-5 shadow-lg">
            <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
              <div className="flex items-center gap-2 text-[#f1cc2d]">
                <Coins className="w-4 h-4 shrink-0" />
                <h2 className="font-headline text-xs font-bold tracking-widest uppercase text-white">
                  4. Prize Configuration & Breakdown
                </h2>
              </div>
              <div className="text-right">
                <span className="font-headline text-[10px] text-[#849495] uppercase block">
                  TOTAL PRIZE POOL
                </span>
                <span className="font-headline text-base sm:text-lg font-bold text-[#f1cc2d]">
                  ₹{estimatedTotalPrize.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Inputs based on Prize Type */}
            {prizeType === 'winner_takes_all' ? (
              <div className="space-y-1.5">
                <label className="block font-headline text-xs font-bold text-[#f1cc2d] uppercase">
                  Winner Takes All Prize (Booyah #1)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#849495] font-bold">
                    ₹
                  </div>
                  <input
                    type="text"
                    value={prizes.winnerPrize || ''}
                    onChange={(e) => handlePrizeFieldChange('winnerPrize', e.target.value)}
                    placeholder="1500"
                    className="w-full h-11 bg-[#1b1b1d] border border-[#27272a] focus:border-[#00f2ff] rounded-lg pl-8 pr-4 text-white font-mono text-xs focus:outline-none transition-colors"
                  />
                </div>
                {formErrors.winnerPrize && (
                  <p className="text-[10px] text-[#ef4444] font-body flex items-center gap-1 mt-0.5">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{formErrors.winnerPrize}</span>
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {(prizeType === 'placement' || prizeType === 'placement_kill') && (
                  <div className="space-y-3">
                    <span className="font-headline text-xs font-bold text-[#e5e1e4] uppercase tracking-wider block">
                      Placement Rank Rewards
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-headline font-bold text-[#f1cc2d] uppercase block">
                          1st Prize (Booyah) *
                        </label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-[#849495] text-xs">
                            ₹
                          </span>
                          <input
                            type="text"
                            value={prizes.firstPrize || ''}
                            onChange={(e) => handlePrizeFieldChange('firstPrize', e.target.value)}
                            placeholder="1000"
                            className="w-full h-10 bg-[#1b1b1d] border border-[#27272a] focus:border-[#00f2ff] rounded-lg pl-6 pr-2.5 text-white font-mono text-xs focus:outline-none transition-colors"
                          />
                        </div>
                        {formErrors.firstPrize && (
                          <p className="text-[10px] text-[#ef4444] font-body flex items-center gap-1 mt-0.5">
                            <AlertCircle className="w-3 h-3 shrink-0" />
                            <span>{formErrors.firstPrize}</span>
                          </p>
                        )}
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-headline font-bold text-[#849495] uppercase block">
                          2nd Prize
                        </label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-[#849495] text-xs">
                            ₹
                          </span>
                          <input
                            type="text"
                            value={prizes.secondPrize || ''}
                            onChange={(e) => handlePrizeFieldChange('secondPrize', e.target.value)}
                            placeholder="500"
                            className="w-full h-10 bg-[#1b1b1d] border border-[#27272a] focus:border-[#00f2ff] rounded-lg pl-6 pr-2.5 text-white font-mono text-xs focus:outline-none transition-colors"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-headline font-bold text-[#849495] uppercase block">
                          3rd Prize
                        </label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-[#849495] text-xs">
                            ₹
                          </span>
                          <input
                            type="text"
                            value={prizes.thirdPrize || ''}
                            onChange={(e) => handlePrizeFieldChange('thirdPrize', e.target.value)}
                            placeholder="250"
                            className="w-full h-10 bg-[#1b1b1d] border border-[#27272a] focus:border-[#00f2ff] rounded-lg pl-6 pr-2.5 text-white font-mono text-xs focus:outline-none transition-colors"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-headline font-bold text-[#849495] uppercase block">
                          4th Prize
                        </label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-[#849495] text-xs">
                            ₹
                          </span>
                          <input
                            type="text"
                            value={prizes.fourthPrize || ''}
                            onChange={(e) => handlePrizeFieldChange('fourthPrize', e.target.value)}
                            placeholder="0"
                            className="w-full h-10 bg-[#1b1b1d] border border-[#27272a] focus:border-[#00f2ff] rounded-lg pl-6 pr-2.5 text-white font-mono text-xs focus:outline-none transition-colors"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-headline font-bold text-[#849495] uppercase block">
                          5th Prize
                        </label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-[#849495] text-xs">
                            ₹
                          </span>
                          <input
                            type="text"
                            value={prizes.fifthPrize || ''}
                            onChange={(e) => handlePrizeFieldChange('fifthPrize', e.target.value)}
                            placeholder="0"
                            className="w-full h-10 bg-[#1b1b1d] border border-[#27272a] focus:border-[#00f2ff] rounded-lg pl-6 pr-2.5 text-white font-mono text-xs focus:outline-none transition-colors"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-headline font-bold text-[#00f2ff] uppercase block">
                          MVP Bonus
                        </label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-[#849495] text-xs">
                            ₹
                          </span>
                          <input
                            type="text"
                            value={prizes.mvpBonus || ''}
                            onChange={(e) => handlePrizeFieldChange('mvpBonus', e.target.value)}
                            placeholder="0"
                            className="w-full h-10 bg-[#1b1b1d] border border-[#27272a] focus:border-[#00f2ff] rounded-lg pl-6 pr-2.5 text-white font-mono text-xs focus:outline-none transition-colors"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {(prizeType === 'per_kill' || prizeType === 'placement_kill') && (
                  <div className="p-3.5 rounded-lg bg-[#1b1b1d] border border-[#27272a] space-y-2">
                    <label className="block font-headline text-xs font-bold text-[#00f2ff] uppercase">
                      Kill Bounty Reward (Per Verified Frag) *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#849495] font-bold">
                        ₹
                      </div>
                      <input
                        type="text"
                        value={perKillReward || ''}
                        onChange={handlePerKillChange}
                        placeholder="30"
                        className="w-full h-11 bg-[#141416] border border-[#27272a] focus:border-[#00f2ff] rounded-lg pl-8 pr-16 sm:pr-24 text-white font-mono text-xs focus:outline-none transition-colors"
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-[10px] font-mono text-[#849495] uppercase">
                        <span className="hidden sm:inline">/ verified kill</span>
                        <span className="sm:hidden">/ kill</span>
                      </div>
                    </div>
                    {formErrors.perKillReward && (
                      <p className="text-[10px] text-[#ef4444] font-body flex items-center gap-1 mt-0.5">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>{formErrors.perKillReward}</span>
                      </p>
                    )}
                    <span className="text-[11px] text-[#849495] font-body block">
                      Estimated kill pool liability: ₹{(currentPlayers * perKillReward).toLocaleString()} based on {currentPlayers} players.
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: LIVE TOURNAMENT SPECIFICATION (5 cols) */}
        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-4">
          <div className="rounded-xl border border-[#27272a] bg-[#141416] overflow-hidden shadow-2xl">
            {/* Header & Game Banner */}
            <div className="relative bg-[#1b1b1d] p-5 border-b border-[#27272a] overflow-hidden">
              <div className="absolute right-0 -top-8 w-32 h-32 bg-[#00f2ff]/10 rounded-full blur-2xl pointer-events-none" />

              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] animate-pulse" />
                  <span className="font-headline text-[10px] font-bold text-[#00f2ff] uppercase tracking-wider">
                    LIVE TOURNAMENT SPECIFICATION
                  </span>
                </div>
                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-[#00f2ff]/15 text-[#00f2ff] border border-[#00f2ff]/30 uppercase">
                  READY TO PUBLISH
                </span>
              </div>

              <h3 className="font-headline text-base sm:text-lg font-bold text-white leading-tight uppercase truncate">
                {form.title || 'Untitled Tournament'}
              </h3>

              <div className="flex items-center gap-2 mt-2">
                <span className="px-2 py-0.5 rounded bg-[#141416] border border-[#27272a] text-[10px] font-headline font-bold text-white uppercase">
                  Free Fire MAX
                </span>
                <span className="text-[10px] text-[#849495] font-mono">
                  GARENA VERIFIED LOBBY
                </span>
              </div>
            </div>

            {/* Structured Specifications Matrix */}
            <div className="p-4 sm:p-5 space-y-4">
              {/* Match Meta Grid */}
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="p-3 rounded-lg bg-[#1b1b1d] border border-[#27272a]">
                  <span className="font-headline text-[10px] font-bold text-[#849495] uppercase block mb-1">
                    MODE & FORMAT
                  </span>
                  <span className="font-headline font-bold text-white block uppercase">
                    {form.mode === 'solo' ? 'Solo (1P)' : form.mode === 'duo' ? 'Duo (2P)' : 'Squad (4P)'}
                  </span>
                  <span className="text-[11px] text-[#849495] block mt-0.5">
                    {currentTeams} Competing Teams
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-[#1b1b1d] border border-[#27272a]">
                  <span className="font-headline text-[10px] font-bold text-[#849495] uppercase block mb-1">
                    SCHEDULE / TIMELINE
                  </span>
                  <span className="font-headline font-bold text-white block">
                    {form.startDate || 'Date Unset'}
                  </span>
                  <span className="text-[11px] text-[#849495] block mt-0.5">
                    {form.startTime || '06:00 PM IST'}
                  </span>
                </div>
              </div>

              {/* Map & Rules Strip */}
              <div className="p-3 rounded-lg bg-[#1b1b1d] border border-[#27272a]">
                <span className="font-headline text-[10px] font-bold text-[#849495] uppercase block mb-1.5">
                  MAP & CUSTOM RULES
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <span className="px-2 py-0.5 bg-[#141416] rounded text-[10px] font-mono text-white border border-[#27272a]">
                    {form.ffMap || 'Bermuda'}
                  </span>
                  <span className="px-2 py-0.5 bg-[#141416] rounded text-[10px] font-mono text-white border border-[#27272a]">
                    {form.matchType || 'Battle Royale'}
                  </span>
                  <span className="px-2 py-0.5 bg-[#141416] rounded text-[10px] font-mono text-[#00f2ff] border border-[#27272a]">
                    Guns: {form.ffGunAttributes || form.gunAttributes || 'Disabled'}
                  </span>
                  <span className="px-2 py-0.5 bg-[#141416] rounded text-[10px] font-mono text-[#00f2ff] border border-[#27272a]">
                    Skills: {form.ffCharacterSkills || form.characterSkills || 'Disabled'}
                  </span>
                </div>
              </div>

              {/* Financial & Prize Matrix */}
              <div className="p-4 rounded-lg bg-[#1b1b1d] border border-[#27272a] space-y-2.5 text-xs font-body">
                <div className="flex justify-between items-center">
                  <span className="text-[#849495]">Slot Entry Fee:</span>
                  <span className="font-mono font-bold text-white">
                    {entryFeeNum > 0 ? `₹${entryFeeNum}` : 'Free'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#849495]">Total Player Capacity:</span>
                  <span className="font-mono font-semibold text-white">
                    {currentTeams} Teams ({currentPlayers} Combatants)
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#849495]">Approval Mode:</span>
                  <span className="font-mono font-semibold text-[#00f2ff]">
                    {approvalMode}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#849495]">Payment Gateway:</span>
                  <span className="font-mono text-[10px] text-[#849495] bg-[#141416] px-2 py-0.5 rounded border border-[#27272a]">
                    DEFERRED / ESCROW SIMULATION
                  </span>
                </div>

                <div className="pt-2.5 border-t border-[#27272a] flex justify-between items-center">
                  <div>
                    <span className="font-headline text-[10px] font-bold text-[#849495] uppercase block">
                      TOTAL PRIZE POOL
                    </span>
                    <span className="text-[10px] text-[#849495] font-mono capitalize">
                      {prizeType.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-headline text-lg font-bold text-[#f1cc2d]">
                      ₹{estimatedTotalPrize.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Admin Notice Banner */}
              <div className="p-3 rounded-lg border border-[#27272a] bg-[#1b1b1d] flex items-start gap-2 text-xs font-body text-[#849495]">
                <Info className="w-4 h-4 text-[#00f2ff] shrink-0 mt-0.5" />
                <p className="leading-relaxed text-[11px]">
                  Publishing locks rule presets. Room ID & Password will automatically be provisioned to registered squad captains 15 minutes before scheduled match start.
                </p>
              </div>
            </div>

            {/* Card Footer Status */}
            <div className="bg-[#0e0e10] px-4 py-2.5 border-t border-[#27272a] flex items-center justify-between text-[11px] font-mono text-[#849495]">
              <span>TOURNAMENT ENGINE: v2.1 OPS</span>
              <span className="flex items-center gap-1 text-[#10b981]">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Integrity Engine Ready</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
