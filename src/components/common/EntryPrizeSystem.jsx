import React, { useState, useEffect } from 'react'
import {
  Trophy,
  IndianRupee,
  Users,
  Swords,
  Target,
  Award,
  CreditCard,
  CheckCircle2,
  ToggleLeft,
  ToggleRight,
  ShieldCheck,
  Zap,
  Sparkles,
  Gamepad2
} from 'lucide-react'
import { getDefaultGameCapacity } from '../../utils/tournamentUtils'

// Section 3: Prize Types (Radio Cards)
const PRIZE_TYPES = [
  { id: 'placement', label: 'Placement Only', icon: Trophy, desc: 'Leaderboard rank placement rewards' },
  { id: 'placement_kill', label: 'Placement + Per Kill', icon: Swords, desc: 'Rank position & kill bounties' },
  { id: 'per_kill', label: 'Per Kill Only', icon: Target, desc: 'Flat reward per confirmed kill' },
  { id: 'winner_takes_all', label: 'Winner Takes All', icon: Award, desc: 'Single prize for #1 Champion' },
]

export default function EntryPrizeSystem({
  entryFee = 0,
  maxTeams = 32,
  game = 'Free Fire MAX',
  mode = 'squad',
  registrationApproval = 'Automatic',
  allowWaitlist = false,
  maxWaitlistSize = 10,
  paymentEnabled = false,
  paymentGateway = 'Razorpay',
  prizeType = 'placement',
  perKillReward = 30,
  prizes = { firstPrize: 1000, secondPrize: 500, thirdPrize: 250, fourthPrize: 0, fifthPrize: 0, mvpBonus: 0, winnerPrize: 1500 },
  onChange,
  errors = {},
  readOnly = false
}) {
  const parseNum = (val, fallback = 0) => {
    if (typeof val === 'number') return isNaN(val) ? fallback : val
    if (!val) return fallback
    const cleaned = String(val).replace(/[^0-9.]/g, '')
    const parsed = parseFloat(cleaned)
    return isNaN(parsed) ? fallback : parsed
  }

  const defaultCap = getDefaultGameCapacity(game, mode)

  const [localPaymentEnabled, setLocalPaymentEnabled] = useState(paymentEnabled)
  const [localEntryFee, setLocalEntryFee] = useState(() => (paymentEnabled ? parseNum(entryFee, 50) : 0))
  const [localSlots, setLocalSlots] = useState(() => parseNum(maxTeams, defaultCap.maxTeams))
  const [localApproval, setLocalApproval] = useState(registrationApproval || 'Automatic')
  const [localAllowWaitlist, setLocalAllowWaitlist] = useState(allowWaitlist)
  const [localMaxWaitlist, setLocalMaxWaitlist] = useState(() => parseNum(maxWaitlistSize, 10))

  useEffect(() => {
    if (maxTeams !== undefined) {
      setLocalSlots(parseNum(maxTeams, defaultCap.maxTeams))
    }
  }, [maxTeams, defaultCap.maxTeams])

  const [localPrizeType, setLocalPrizeType] = useState(prizeType || 'placement')
  const [localPerKill, setLocalPerKill] = useState(() => parseNum(perKillReward, 30))
  const [localPrizes, setLocalPrizes] = useState({
    firstPrize: parseNum(prizes?.firstPrize, 1000),
    secondPrize: parseNum(prizes?.secondPrize, 500),
    thirdPrize: parseNum(prizes?.thirdPrize, 250),
    fourthPrize: parseNum(prizes?.fourthPrize, 0),
    fifthPrize: parseNum(prizes?.fifthPrize, 0),
    mvpBonus: parseNum(prizes?.mvpBonus, 0),
    winnerPrize: parseNum(prizes?.winnerPrize, 1500),
  })

  // Synchronize state back to parent form
  useEffect(() => {
    if (onChange && !readOnly) {
      const effectiveEntryFee = localPaymentEnabled ? localEntryFee : 0
      onChange({
        paymentEnabled: localPaymentEnabled,
        entryFee: localPaymentEnabled && effectiveEntryFee > 0 ? `₹${effectiveEntryFee}` : 'Free',
        entryFeeNum: effectiveEntryFee,
        maxTeams: localSlots,
        registrationApproval: localApproval,
        allowWaitlist: localAllowWaitlist,
        maxWaitlistSize: localMaxWaitlist,
        paymentGateway: localPaymentEnabled ? 'Razorpay' : 'None',
        prizeType: localPrizeType,
        perKillReward: localPerKill,
        prizes: localPrizes,
      })
    }
  }, [localPaymentEnabled, localEntryFee, localSlots, localApproval, localAllowWaitlist, localMaxWaitlist, localPrizeType, localPerKill, localPrizes])

  // Calculate Live Estimated Total Prize Pool
  const calculateTotalPrize = () => {
    if (localPrizeType === 'winner_takes_all') {
      return localPrizes.winnerPrize
    }
    const totalEstPlayers = localSlots * defaultCap.teamSize
    if (localPrizeType === 'per_kill') {
      return totalEstPlayers * localPerKill
    }
    const placementSum = (localPrizes.firstPrize || 0) + (localPrizes.secondPrize || 0) + (localPrizes.thirdPrize || 0) + (localPrizes.fourthPrize || 0) + (localPrizes.fifthPrize || 0) + (localPrizes.mvpBonus || 0)
    if (localPrizeType === 'placement_kill') {
      return placementSum + (totalEstPlayers * localPerKill)
    }
    return placementSum
  }

  const estimatedTotalPrize = calculateTotalPrize()

  if (readOnly) {
    return (
      <div className="bg-[#07090c] border border-[#3a494b]/60 rounded-2xl p-6 space-y-4 text-white font-mono text-xs shadow-xl">
        <div className="flex items-center justify-between border-b border-[#3a494b]/50 pb-3">
          <div className="flex items-center gap-2 text-[#00f2ff]">
            <Trophy className="w-5 h-5 text-[#ffd700]" />
            <h3 className="font-headline text-sm font-black uppercase text-white tracking-wider">
              Registration, Payment & Prize Overview
            </h3>
          </div>
          <span className="px-3 py-1 rounded-full text-[10px] font-black bg-[#00f2ff]/10 text-[#00f2ff] border border-[#00f2ff]/30 uppercase">
            {localPaymentEnabled ? 'Paid Entry' : 'Free Entry'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-[#151a21] border border-[#3a494b]/60 rounded-xl space-y-1">
            <span className="text-[10px] text-[#8e9dae] uppercase font-bold block">Entry Fee</span>
            <span className="text-[#00f2ff] font-bold text-sm block">
              {!localPaymentEnabled || localEntryFee === 0 ? 'Free' : `₹${localEntryFee}`}
            </span>
          </div>

          <div className="p-3 bg-[#151a21] border border-[#3a494b]/60 rounded-xl space-y-1">
            <span className="text-[10px] text-[#8e9dae] uppercase font-bold block">Capacity</span>
            <span className="text-white font-bold text-sm block">
              {localSlots} {defaultCap.teamUnit}
            </span>
            <span className="text-[9px] text-[#00ff9d] block">
              {localSlots * defaultCap.teamSize} Players ({defaultCap.roomCap} Cap)
            </span>
          </div>

          <div className="p-3 bg-[#151a21] border border-[#3a494b]/60 rounded-xl space-y-1">
            <span className="text-[10px] text-[#8e9dae] uppercase font-bold block">Prize Type</span>
            <span className="text-[#fe6b00] font-bold text-xs block uppercase">
              {localPrizeType.replace('_', ' ')}
            </span>
          </div>

          <div className="p-3 bg-[#151a21] border border-[#3a494b]/60 rounded-xl space-y-1">
            <span className="text-[10px] text-[#8e9dae] uppercase font-bold block">Est. Total Prize</span>
            <span className="text-[#00ff9d] font-extrabold text-sm block">₹{estimatedTotalPrize.toLocaleString()}</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 text-white font-mono text-xs">
      {/* SECTION 1: REGISTRATION & SLOTS */}
      <div className="p-5 bg-[#07090c] border border-[#00f2ff]/30 rounded-2xl space-y-4 shadow-inner">
        <div className="flex items-center justify-between border-b border-[#3a494b]/60 pb-2.5">
          <span className="text-xs font-bold text-[#00f2ff] uppercase flex items-center gap-2 font-headline">
            <Users className="w-4 h-4 text-[#00f2ff]" />
            <span>Section 1: Registration, Slots & Approvals</span>
          </span>
          <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-[#00f2ff]/10 text-[#00f2ff] border border-[#00f2ff]/30 uppercase font-mono">
            {defaultCap.roomCap} Max Room
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Entry Fee Input */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[#8e9dae] uppercase block">
              Entry Fee (INR) *
            </label>
            <input
              type="text"
              disabled={!localPaymentEnabled}
              value={localPaymentEnabled ? (localEntryFee === 0 ? '' : localEntryFee) : 'Free Entry'}
              onChange={(e) => setLocalEntryFee(parseNum(e.target.value, 0))}
              className={`w-full bg-[#151a21] border rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-none ${
                !localPaymentEnabled
                  ? 'opacity-60 cursor-not-allowed border-[#3a494b]'
                  : errors.entryFee ? 'border-red-500 bg-red-500/10' : 'border-[#3a494b] focus:border-[#00f2ff]'
              }`}
              placeholder={localPaymentEnabled ? 'e.g. 50' : 'Free Entry (0)'}
            />
            {errors.entryFee && <p className="text-red-400 text-[10px] font-bold mt-1">{errors.entryFee}</p>}
          </div>

          {/* Total Team Slots */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-[#8e9dae] uppercase block">
                Total {defaultCap.teamUnit} Slots *
              </label>
              <span className="text-[10px] font-mono text-[#00f2ff]">
                Preset: {defaultCap.maxTeams} {defaultCap.teamUnit}
              </span>
            </div>
            <input
              type="number"
              min="1"
              max="500"
              value={localSlots}
              onChange={(e) => setLocalSlots(Math.max(1, parseNum(e.target.value, defaultCap.maxTeams)))}
              className={`w-full bg-[#151a21] border rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-none ${
                errors.maxTeams ? 'border-red-500 bg-red-500/10' : 'border-[#3a494b] focus:border-[#00ff9d]'
              }`}
            />
            {/* Live Capacity Info Banner */}
            <div className="p-2.5 bg-[#151a21] border border-[#3a494b]/60 rounded-lg flex items-center justify-between text-[10px] font-mono">
              <span className="text-[#8e9dae] flex items-center gap-1">
                <Users className="w-3 h-3 text-[#00f2ff]" />
                <span>{localSlots} Complete {defaultCap.teamUnit}</span>
              </span>
              <span className="text-[#00ff9d] font-bold">
                {localSlots * defaultCap.teamSize} Active Players / {defaultCap.roomCap} Room Capacity
              </span>
            </div>
            {errors.maxTeams && <p className="text-red-400 text-[10px] font-bold mt-1">{errors.maxTeams}</p>}
          </div>

          {/* Registration Approval Options */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[#8e9dae] uppercase block">
              Registration Approval *
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setLocalApproval('Automatic')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold uppercase transition-all cursor-pointer ${
                  localApproval === 'Automatic'
                    ? 'bg-[#00f2ff]/20 text-[#00f2ff] border-[#00f2ff]'
                    : 'bg-[#151a21] text-[#8e9dae] border-[#3a494b]'
                }`}
              >
                Automatic
              </button>
              <button
                type="button"
                onClick={() => setLocalApproval('Manual')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold uppercase transition-all cursor-pointer ${
                  localApproval === 'Manual'
                    ? 'bg-[#00f2ff]/20 text-[#00f2ff] border-[#00f2ff]'
                    : 'bg-[#151a21] text-[#8e9dae] border-[#3a494b]'
                }`}
              >
                Manual
              </button>
            </div>
          </div>

          {/* Allow Waitlist Toggle */}
          <div className="space-y-1.5 sm:col-span-2 lg:col-span-3 flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-[#151a21] border border-[#3a494b]/60 rounded-xl gap-3">
            <div>
              <span className="text-xs font-bold text-white uppercase tracking-wide block">Allow Waitlist</span>
              <span className="text-[10px] text-[#8e9dae] block">Automatically queue teams when total slots are full.</span>
            </div>
            <button
              type="button"
              onClick={() => setLocalAllowWaitlist(!localAllowWaitlist)}
              className={`px-4 py-2 rounded-xl border text-xs font-extrabold uppercase transition-all cursor-pointer flex items-center gap-2 ${
                localAllowWaitlist
                  ? 'bg-[#00ff9d]/20 text-[#00ff9d] border-[#00ff9d]'
                  : 'bg-[#07090c] text-[#8e9dae] border-[#3a494b]'
              }`}
            >
              {localAllowWaitlist ? <ToggleRight className="w-4 h-4 text-[#00ff9d]" /> : <ToggleLeft className="w-4 h-4 text-[#8e9dae]" />}
              <span>{localAllowWaitlist ? 'Waitlist Enabled' : 'Waitlist Disabled'}</span>
            </button>
          </div>

          {/* Maximum Waitlist Size (Visible only when Waitlist is enabled) */}
          {localAllowWaitlist && (
            <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
              <label className="text-[11px] font-bold text-[#00ff9d] uppercase block">
                Maximum Waitlist Size *
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={localMaxWaitlist}
                onChange={(e) => setLocalMaxWaitlist(Math.max(1, parseNum(e.target.value, 10)))}
                className="w-full bg-[#151a21] border border-[#00ff9d]/40 rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-none focus:border-[#00ff9d]"
                placeholder="e.g. 10"
              />
            </div>
          )}

        </div>
      </div>

      {/* SECTION 2: PAYMENT SETTINGS */}
      <div className="bg-[#0b0e14] p-5 rounded-2xl border border-[#00f2ff]/30 shadow-[0_0_20px_rgba(0,242,255,0.05)] space-y-4">
        <div className="flex items-center justify-between border-b border-[#3a494b]/50 pb-3">
          <div className="flex items-center gap-2 text-[#00f2ff]">
            <CreditCard className="w-4.5 h-4.5" />
            <h3 className="font-headline text-xs font-black uppercase tracking-wider text-white">
              Section 2: Payment Settings
            </h3>
          </div>
          <span className="text-[10px] text-[#8e9dae] font-semibold uppercase">Gateway & Status</span>
        </div>

        {/* Large Toggle: Payment Enabled */}
        <div className="p-4 bg-[#151a21] border border-[#3a494b]/60 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-white uppercase tracking-wide block">Payment Status</span>
            <span className="text-[10px] text-[#8e9dae] block">
              {localPaymentEnabled ? 'Tournament requires paid entry fee' : 'Tournament is FREE ENTRY'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              const nextState = !localPaymentEnabled
              setLocalPaymentEnabled(nextState)
              if (!nextState) setLocalEntryFee(0)
            }}
            className={`px-5 py-2.5 rounded-xl border text-xs font-extrabold uppercase transition-all cursor-pointer flex items-center gap-2 min-h-[44px] ${
              localPaymentEnabled
                ? 'bg-[#00f2ff]/20 text-[#00f2ff] border-[#00f2ff] shadow-[0_0_12px_rgba(0,242,255,0.3)]'
                : 'bg-[#07090c] text-[#8e9dae] border-[#3a494b]'
            }`}
          >
            {localPaymentEnabled ? <ToggleRight className="w-5 h-5 text-[#00f2ff]" /> : <ToggleLeft className="w-5 h-5 text-[#8e9dae]" />}
            <span>{localPaymentEnabled ? 'PAYMENT ON' : 'PAYMENT OFF (FREE ENTRY)'}</span>
          </button>
        </div>

        {/* Payment Gateway Options (Visible when Payment Enabled is ON) */}
        {localPaymentEnabled && (
          <div className="p-4 bg-[#07090c] border border-[#00f2ff]/30 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-[#00f2ff] uppercase block">
                Payment Gateway
              </label>
              <span className="text-[10px] text-[#8e9dae]">Razorpay Active</span>
            </div>
            <div className="p-3 bg-[#151a21] border border-[#00f2ff]/40 rounded-xl flex items-center justify-between text-xs text-white">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#00f2ff]" />
                <span className="font-bold">Razorpay UPI & Cards</span>
              </div>
              <span className="text-[10px] text-[#00ff9d] font-bold uppercase">Supported</span>
            </div>
            <p className="text-[10px] text-[#8e9dae] italic pt-1">
              More gateways can be added in future. Payment is optional for testing or free scrims.
            </p>
          </div>
        )}
      </div>

      {/* SECTION 3: PRIZE TYPE (RADIO CARDS) */}
      <div className="bg-[#0b0e14] p-5 rounded-2xl border border-[#00f2ff]/30 shadow-[0_0_20px_rgba(0,242,255,0.05)] space-y-4">
        <div className="flex items-center justify-between border-b border-[#3a494b]/50 pb-3">
          <div className="flex items-center gap-2 text-[#00f2ff]">
            <Trophy className="w-4.5 h-4.5 text-[#ffd700]" />
            <h3 className="font-headline text-xs font-black uppercase tracking-wider text-white">
              Section 3: Select Prize Type *
            </h3>
          </div>
          <span className="text-[10px] text-[#00ff9d] font-bold uppercase">Single Selection</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {PRIZE_TYPES.map((pt) => {
            const Icon = pt.icon
            const isSelected = localPrizeType === pt.id

            return (
              <button
                key={`prize-type-${pt.id}`}
                type="button"
                onClick={() => setLocalPrizeType(pt.id)}
                className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-3.5 ${
                  isSelected
                    ? 'bg-[#00f2ff]/10 border-[#00f2ff] shadow-[0_0_15px_rgba(0,242,255,0.2)]'
                    : 'bg-[#151a21] border-[#3a494b] hover:border-[#00f2ff]/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <Icon className={`w-5 h-5 ${isSelected ? 'text-[#00f2ff]' : 'text-[#8e9dae]'}`} />
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    isSelected ? 'border-[#00f2ff] bg-[#00f2ff]' : 'border-[#3a494b]'
                  }`}>
                    {isSelected && <div className="w-2 h-2 rounded-full bg-black" />}
                  </div>
                </div>

                <div>
                  <div className={`font-bold text-xs ${isSelected ? 'text-white' : 'text-[#8e9dae]'}`}>
                    {pt.label}
                  </div>
                  <div className="text-[10px] text-[#8e9dae]/80 leading-tight mt-1">
                    {pt.desc}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* SECTION 4: PRIZE CONFIGURATION */}
      <div className="bg-[#0b0e14] p-5 rounded-2xl border border-[#00f2ff]/30 shadow-[0_0_20px_rgba(0,242,255,0.05)] space-y-4">
        <div className="flex items-center justify-between border-b border-[#3a494b]/50 pb-3">
          <div className="flex items-center gap-2 text-[#00f2ff]">
            <Trophy className="w-4 h-4" />
            <h3 className="font-headline text-xs font-black uppercase tracking-wider text-white">
              Section 4: Prize Configuration ({localPrizeType.replace('_', ' ').toUpperCase()})
            </h3>
          </div>
          <span className="text-[10px] text-[#fe6b00] font-bold uppercase">Dynamic Inputs</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          
          {/* Winner Takes All UI */}
          {localPrizeType === 'winner_takes_all' && (
            <div className="space-y-1.5 col-span-1 sm:col-span-2 lg:col-span-3">
              <label className="text-[11px] font-bold text-[#ffd700] uppercase block">
                Winner Prize (₹) *
              </label>
              <input
                type="number"
                min="1"
                value={localPrizes.winnerPrize}
                onChange={(e) => setLocalPrizes((p) => ({ ...p, winnerPrize: parseNum(e.target.value, 0) }))}
                className="w-full bg-[#151a21] border border-[#3a494b] focus:border-[#ffd700] rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-none"
              />
            </div>
          )}

          {/* Per Kill Only UI */}
          {localPrizeType === 'per_kill' && (
            <div className="space-y-1.5 col-span-1 sm:col-span-2 lg:col-span-3">
              <label className="text-[11px] font-bold text-[#fe6b00] uppercase block">
                Per Kill Reward (₹) *
              </label>
              <input
                type="number"
                min="1"
                value={localPerKill}
                onChange={(e) => setLocalPerKill(parseNum(e.target.value, 0))}
                className="w-full bg-[#151a21] border border-[#3a494b] focus:border-[#fe6b00] rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-none"
              />
            </div>
          )}

          {/* Placement Only & Placement + Per Kill UI */}
          {(localPrizeType === 'placement' || localPrizeType === 'placement_kill') && (
            <>
              {localPrizeType === 'placement_kill' && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[#fe6b00] uppercase block">
                    Per Kill Reward (₹) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={localPerKill}
                    onChange={(e) => setLocalPerKill(parseNum(e.target.value, 0))}
                    className="w-full bg-[#151a21] border border-[#3a494b] focus:border-[#fe6b00] rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-none"
                  />
                </div>
              )}

              {/* 1st Prize */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[#ffd700] uppercase block">
                  1st Prize (₹) *
                </label>
                <input
                  type="number"
                  min="1"
                  value={localPrizes.firstPrize}
                  onChange={(e) => setLocalPrizes((p) => ({ ...p, firstPrize: parseNum(e.target.value, 0) }))}
                  className="w-full bg-[#151a21] border border-[#3a494b] focus:border-[#ffd700] rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-none"
                />
              </div>

              {/* 2nd Prize */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[#c0c0c0] uppercase block">
                  2nd Prize (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={localPrizes.secondPrize}
                  onChange={(e) => setLocalPrizes((p) => ({ ...p, secondPrize: parseNum(e.target.value, 0) }))}
                  className="w-full bg-[#151a21] border border-[#3a494b] focus:border-[#c0c0c0] rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-none"
                />
              </div>

              {/* 3rd Prize */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[#cd7f32] uppercase block">
                  3rd Prize (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={localPrizes.thirdPrize}
                  onChange={(e) => setLocalPrizes((p) => ({ ...p, thirdPrize: parseNum(e.target.value, 0) }))}
                  className="w-full bg-[#151a21] border border-[#3a494b] focus:border-[#cd7f32] rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-none"
                />
              </div>

              {/* 4th Prize (Optional) */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[#8e9dae] uppercase block">
                  4th Prize (Optional ₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={localPrizes.fourthPrize}
                  onChange={(e) => setLocalPrizes((p) => ({ ...p, fourthPrize: parseNum(e.target.value, 0) }))}
                  className="w-full bg-[#151a21] border border-[#3a494b] focus:border-[#00f2ff] rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-none"
                />
              </div>

              {/* 5th Prize (Optional) */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[#8e9dae] uppercase block">
                  5th Prize (Optional ₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={localPrizes.fifthPrize}
                  onChange={(e) => setLocalPrizes((p) => ({ ...p, fifthPrize: parseNum(e.target.value, 0) }))}
                  className="w-full bg-[#151a21] border border-[#3a494b] focus:border-[#00f2ff] rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-none"
                />
              </div>

              {/* MVP Bonus (Optional - placement + per kill) */}
              {localPrizeType === 'placement_kill' && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[#00ff9d] uppercase block">
                    MVP Bonus (Optional ₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={localPrizes.mvpBonus}
                    onChange={(e) => setLocalPrizes((p) => ({ ...p, mvpBonus: parseNum(e.target.value, 0) }))}
                    className="w-full bg-[#151a21] border border-[#3a494b] focus:border-[#00ff9d] rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-none"
                  />
                </div>
              )}
            </>
          )}

        </div>
      </div>

      {/* SECTION 5: LIVE SUMMARY */}
      <div className="bg-[#0b0e14] p-5 rounded-2xl border border-[#00f2ff]/30 shadow-[0_0_20px_rgba(0,242,255,0.05)] space-y-3">
        <div className="flex items-center justify-between border-b border-[#3a494b]/50 pb-2.5">
          <span className="font-headline text-xs font-black uppercase text-[#00f2ff] flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#00f2ff]" />
            <span>Section 5: Live Tournament Summary</span>
          </span>
          <span className="text-[10px] text-[#00ff9d] font-bold uppercase">Auto-Calculating</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs font-mono">
          <div><span className="text-[#8e9dae] block">Game:</span> <strong className="text-white">{game}</strong></div>
          <div><span className="text-[#8e9dae] block">Mode:</span> <strong className="text-white">{mode.toUpperCase()}</strong></div>
          <div><span className="text-[#8e9dae] block">Entry Fee:</span> <strong className="text-[#00f2ff]">{!localPaymentEnabled || localEntryFee === 0 ? 'Free' : `₹${localEntryFee}`}</strong></div>
          <div><span className="text-[#8e9dae] block">Total Slots:</span> <strong className="text-white">{localSlots} Slots</strong></div>
          <div><span className="text-[#8e9dae] block">Payment Status:</span> <strong className={localPaymentEnabled ? 'text-[#00f2ff]' : 'text-[#8e9dae]'}>{localPaymentEnabled ? 'Enabled (Razorpay)' : 'Disabled (Free Entry)'}</strong></div>
          <div><span className="text-[#8e9dae] block">Prize Type:</span> <strong className="text-[#fe6b00] uppercase">{localPrizeType.replace('_', ' ')}</strong></div>
          
          <div className="col-span-2 sm:col-span-3 lg:col-span-2">
            <span className="text-[#8e9dae] block">Prize Distribution:</span>
            <strong className="text-[#ffd700]">
              {localPrizeType === 'winner_takes_all'
                ? `1st: ₹${localPrizes.winnerPrize}`
                : localPrizeType === 'per_kill'
                ? `₹${localPerKill} / Kill`
                : `1st: ₹${localPrizes.firstPrize} • 2nd: ₹${localPrizes.secondPrize} • 3rd: ₹${localPrizes.thirdPrize}`}
            </strong>
          </div>

          <div className="col-span-2 sm:col-span-3 lg:col-span-4 p-3 bg-[#151a21] border border-[#00ff9d]/30 rounded-xl flex items-center justify-between mt-1">
            <span className="text-xs text-[#8e9dae] uppercase font-bold">Estimated Total Prize Pool</span>
            <span className="text-base font-black text-[#00ff9d]">₹{estimatedTotalPrize.toLocaleString()}</span>
          </div>
        </div>
      </div>

    </div>
  )
}
