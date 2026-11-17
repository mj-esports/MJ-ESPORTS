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
  game = 'Free Fire India',
  mode = 'squad',
  registrationApproval = 'Automatic',
  allowWaitlist = false,
  maxWaitlistSize = 10,
  paymentEnabled = false,
  paymentGateway = 'FamGateway',
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

  useEffect(() => {
    setLocalPaymentEnabled(Boolean(paymentEnabled))
    if (paymentEnabled) {
      setLocalEntryFee(parseNum(entryFee, 50))
    } else {
      setLocalEntryFee(0)
    }
  }, [paymentEnabled, entryFee])

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
        paymentGateway: localPaymentEnabled ? 'FamGateway' : 'None',
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
      <div className="bg-[#111215] border border-[#27272A] rounded-none p-6 space-y-4 text-white font-mono text-xs shadow-xl">
        <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
          <div className="flex items-center gap-2 text-[#FFB900]">
            <Trophy className="w-5 h-5 text-[#FFB900]" />
            <h3 className="font-headline text-sm font-black uppercase text-white tracking-wider">
              Registration, Payment & Prize Overview
            </h3>
          </div>
          <span className="px-3 py-1 rounded-none text-[10px] font-black bg-[#FFB900]/10 text-[#FFB900] border border-[#FFB900]/30 uppercase">
            {localPaymentEnabled ? 'Paid Entry' : 'Free Entry'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-[#18181B] border border-[#27272A] rounded-none space-y-1">
            <span className="text-[10px] text-[#A1A1AA] uppercase font-bold block">Entry Fee</span>
            <span className="text-[#FFB900] font-bold text-sm block">
              {!localPaymentEnabled || localEntryFee === 0 ? 'Free' : `₹${localEntryFee}`}
            </span>
          </div>

          <div className="p-3 bg-[#18181B] border border-[#27272A] rounded-none space-y-1">
            <span className="text-[10px] text-[#A1A1AA] uppercase font-bold block">Capacity</span>
            <span className="text-white font-bold text-sm block">
              {localSlots} {defaultCap.teamUnit}
            </span>
            <span className="text-[9px] text-[#10B981] block">
              {localSlots * defaultCap.teamSize} Players ({defaultCap.roomCap} Cap)
            </span>
          </div>

          <div className="p-3 bg-[#18181B] border border-[#27272A] rounded-none space-y-1">
            <span className="text-[10px] text-[#A1A1AA] uppercase font-bold block">Prize Type</span>
            <span className="text-[#FF8C00] font-bold text-xs block uppercase">
              {localPrizeType.replace('_', ' ')}
            </span>
          </div>

          <div className="p-3 bg-[#18181B] border border-[#27272A] rounded-none space-y-1">
            <span className="text-[10px] text-[#A1A1AA] uppercase font-bold block">Est. Total Prize</span>
            <span className="text-[#10B981] font-extrabold text-sm block">₹{estimatedTotalPrize.toLocaleString()}</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 text-white font-mono text-xs">
      {/* SECTION 1: REGISTRATION & SLOTS */}
      <div className="p-5 bg-[#111215] border border-[#27272A] rounded-none space-y-4 shadow-inner">
        <div className="flex items-center justify-between border-b border-[#27272A] pb-2.5">
          <span className="text-xs font-bold text-[#FFB900] uppercase flex items-center gap-2 font-headline">
            <Users className="w-4 h-4 text-[#FFB900]" />
            <span>Section 1: Registration, Slots & Approvals</span>
          </span>
          <span className="px-2 py-0.5 rounded-none text-[9px] font-bold bg-[#FFB900]/10 text-[#FFB900] border border-[#FFB900]/30 uppercase font-mono">
            {defaultCap.roomCap} Max Room
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Entry Fee Input */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[#A1A1AA] uppercase block">
              Entry Fee (INR) *
            </label>
            <input
              type="text"
              disabled={!localPaymentEnabled}
              value={localPaymentEnabled ? (localEntryFee === 0 ? '' : localEntryFee) : 'Free Entry'}
              onChange={(e) => setLocalEntryFee(parseNum(e.target.value, 0))}
              className={`w-full bg-[#18181B] border rounded-none px-3.5 py-2.5 text-white text-xs focus:outline-none ${
                !localPaymentEnabled
                  ? 'opacity-60 cursor-not-allowed border-[#27272A]'
                  : errors.entryFee ? 'border-red-500 bg-red-500/10' : 'border-[#27272A] focus:border-[#FFB900]'
              }`}
              placeholder={localPaymentEnabled ? 'e.g. 50' : 'Free Entry (0)'}
            />
            {errors.entryFee && <p className="text-red-400 text-[10px] font-bold mt-1">{errors.entryFee}</p>}
          </div>

          {/* Total Team Slots */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-[#A1A1AA] uppercase block">
                Total {defaultCap.teamUnit} Slots *
              </label>
              <span className="text-[10px] font-mono text-[#FFB900]">
                Preset: {defaultCap.maxTeams} {defaultCap.teamUnit}
              </span>
            </div>
            <input
              type="number"
              min="1"
              max="500"
              value={localSlots}
              onChange={(e) => setLocalSlots(Math.max(1, parseNum(e.target.value, defaultCap.maxTeams)))}
              className={`w-full bg-[#18181B] border rounded-none px-3.5 py-2.5 text-white text-xs focus:outline-none ${
                errors.maxTeams ? 'border-red-500 bg-red-500/10' : 'border-[#27272A] focus:border-[#10B981]'
              }`}
            />
            {/* Live Capacity Info Banner */}
            <div className="p-2.5 bg-[#18181B] border border-[#27272A] rounded-none flex items-center justify-between text-[10px] font-mono">
              <span className="text-[#A1A1AA] flex items-center gap-1">
                <Users className="w-3 h-3 text-[#FFB900]" />
                <span>{localSlots} Complete {defaultCap.teamUnit}</span>
              </span>
              <span className="text-[#10B981] font-bold">
                {localSlots * defaultCap.teamSize} Active Players / {defaultCap.roomCap} Room Capacity
              </span>
            </div>
            {errors.maxTeams && <p className="text-red-400 text-[10px] font-bold mt-1">{errors.maxTeams}</p>}
          </div>

          {/* Registration Approval Options */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[#A1A1AA] uppercase block">
              Registration Approval *
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setLocalApproval('Automatic')}
                className={`py-2.5 px-3 rounded-none border text-xs font-bold uppercase transition-all cursor-pointer ${
                  localApproval === 'Automatic'
                    ? 'bg-[#FFB900] text-black border-[#FFB900]'
                    : 'bg-[#18181B] text-[#A1A1AA] border-[#27272A]'
                }`}
              >
                Automatic
              </button>
              <button
                type="button"
                onClick={() => setLocalApproval('Manual')}
                className={`py-2.5 px-3 rounded-none border text-xs font-bold uppercase transition-all cursor-pointer ${
                  localApproval === 'Manual'
                    ? 'bg-[#FFB900] text-black border-[#FFB900]'
                    : 'bg-[#18181B] text-[#A1A1AA] border-[#27272A]'
                }`}
              >
                Manual
              </button>
            </div>
          </div>

          {/* Allow Waitlist Toggle */}
          <div className="space-y-1.5 sm:col-span-2 lg:col-span-3 flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-[#18181B] border border-[#27272A] rounded-none gap-3">
            <div>
              <span className="text-xs font-bold text-white uppercase tracking-wide block">Allow Waitlist</span>
              <span className="text-[10px] text-[#A1A1AA] block">Automatically queue teams when total slots are full.</span>
            </div>
            <button
              type="button"
              onClick={() => setLocalAllowWaitlist(!localAllowWaitlist)}
              className={`px-4 py-2 rounded-none border text-xs font-extrabold uppercase transition-all cursor-pointer flex items-center gap-2 ${
                localAllowWaitlist
                  ? 'bg-[#10B981]/20 text-[#10B981] border-[#10B981]'
                  : 'bg-[#111215] text-[#A1A1AA] border-[#27272A]'
              }`}
            >
              {localAllowWaitlist ? <ToggleRight className="w-4 h-4 text-[#10B981]" /> : <ToggleLeft className="w-4 h-4 text-[#A1A1AA]" />}
              <span>{localAllowWaitlist ? 'Waitlist Enabled' : 'Waitlist Disabled'}</span>
            </button>
          </div>

          {/* Maximum Waitlist Size (Visible only when Waitlist is enabled) */}
          {localAllowWaitlist && (
            <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
              <label className="text-[11px] font-bold text-[#10B981] uppercase block">
                Maximum Waitlist Size *
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={localMaxWaitlist}
                onChange={(e) => setLocalMaxWaitlist(Math.max(1, parseNum(e.target.value, 10)))}
                className="w-full bg-[#18181B] border border-[#10B981]/40 rounded-none px-3.5 py-2.5 text-white text-xs focus:outline-none focus:border-[#10B981]"
                placeholder="e.g. 10"
              />
            </div>
          )}

        </div>
      </div>

      {/* SECTION 2: PAYMENT SETTINGS */}
      <div className="bg-[#111215] p-5 rounded-none border border-[#27272A] space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
          <div className="flex items-center gap-2 text-[#FFB900]">
            <CreditCard className="w-4.5 h-4.5 text-[#FFB900]" />
            <h3 className="font-headline text-xs font-black uppercase tracking-wider text-white">
              Section 2: Payment Settings
            </h3>
          </div>
          <span className="text-[10px] text-[#A1A1AA] font-semibold uppercase">Gateway & Status</span>
        </div>

        {/* Large Toggle: Payment Enabled */}
        <div className="p-4 bg-[#18181B] border border-[#27272A] rounded-none flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-white uppercase tracking-wide block">Payment Status</span>
            <span className="text-[10px] text-[#A1A1AA] block">
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
            className={`px-5 py-2.5 rounded-none border text-xs font-extrabold uppercase transition-all cursor-pointer flex items-center gap-2 min-h-[44px] ${
              localPaymentEnabled
                ? 'bg-[#FFB900] text-black border-[#FFB900]'
                : 'bg-[#111215] text-[#A1A1AA] border-[#27272A]'
            }`}
          >
            {localPaymentEnabled ? <ToggleRight className="w-5 h-5 text-black" /> : <ToggleLeft className="w-5 h-5 text-[#A1A1AA]" />}
            <span>{localPaymentEnabled ? 'PAYMENT ON' : 'PAYMENT OFF (FREE ENTRY)'}</span>
          </button>
        </div>

        {/* Payment Gateway Options (Visible when Payment Enabled is ON) */}
        {localPaymentEnabled && (
          <div className="p-4 bg-[#111215] border border-[#27272A] rounded-none space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-[#FFB900] uppercase block">
                Payment Gateway
              </label>
              <span className="text-[10px] text-[#A1A1AA]">FamGateway Active</span>
            </div>
            <div className="p-3 bg-[#18181B] border border-[#27272A] rounded-none flex items-center justify-between text-xs text-white">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#FFB900]" />
                <span className="font-bold">FamGateway UPI (Instant)</span>
              </div>
              <span className="text-[10px] text-[#10B981] font-bold uppercase">Supported</span>
            </div>
            <p className="text-[10px] text-[#A1A1AA] italic pt-1">
              More gateways can be added in future. Payment is optional for testing or free scrims.
            </p>
          </div>
        )}
      </div>

      {/* SECTION 3: PRIZE TYPE (RADIO CARDS) */}
      <div className="bg-[#111215] p-5 rounded-none border border-[#27272A] space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
          <div className="flex items-center gap-2 text-[#FFB900]">
            <Trophy className="w-4.5 h-4.5 text-[#FFB900]" />
            <h3 className="font-headline text-xs font-black uppercase tracking-wider text-white">
              Section 3: Select Prize Type *
            </h3>
          </div>
          <span className="text-[10px] text-[#10B981] font-bold uppercase">Single Selection</span>
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
                className={`p-4 rounded-none border text-left transition-all cursor-pointer flex flex-col justify-between space-y-3.5 ${
                  isSelected
                    ? 'bg-[#FFB900]/10 border-[#FFB900]'
                    : 'bg-[#18181B] border-[#27272A] hover:border-[#FFB900]/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <Icon className={`w-5 h-5 ${isSelected ? 'text-[#FFB900]' : 'text-[#A1A1AA]'}`} />
                  <div className={`w-4 h-4 rounded-none border flex items-center justify-center ${
                    isSelected ? 'border-[#FFB900] bg-[#FFB900]' : 'border-[#27272A]'
                  }`}>
                    {isSelected && <div className="w-2 h-2 rounded-none bg-black" />}
                  </div>
                </div>

                <div>
                  <div className={`font-bold text-xs ${isSelected ? 'text-white' : 'text-[#A1A1AA]'}`}>
                    {pt.label}
                  </div>
                  <div className="text-[10px] text-[#A1A1AA]/80 leading-tight mt-1">
                    {pt.desc}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* SECTION 4: PRIZE CONFIGURATION */}
      <div className="bg-[#111215] p-5 rounded-none border border-[#27272A] space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
          <div className="flex items-center gap-2 text-[#FFB900]">
            <Trophy className="w-4 h-4 text-[#FFB900]" />
            <h3 className="font-headline text-xs font-black uppercase tracking-wider text-white">
              Section 4: Prize Configuration ({localPrizeType.replace('_', ' ').toUpperCase()})
            </h3>
          </div>
          <span className="text-[10px] text-[#FF8C00] font-bold uppercase">Dynamic Inputs</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          
          {/* Winner Takes All UI */}
          {localPrizeType === 'winner_takes_all' && (
            <div className="space-y-1.5 col-span-1 sm:col-span-2 lg:col-span-3">
              <label className="text-[11px] font-bold text-[#FFB900] uppercase block">
                Winner Prize (₹) *
              </label>
              <input
                type="number"
                min="1"
                value={localPrizes.winnerPrize}
                onChange={(e) => setLocalPrizes((p) => ({ ...p, winnerPrize: parseNum(e.target.value, 0) }))}
                className="w-full bg-[#18181B] border border-[#27272A] focus:border-[#FFB900] rounded-none px-3.5 py-2.5 text-white text-xs focus:outline-none"
              />
            </div>
          )}

          {/* Per Kill Only UI */}
          {localPrizeType === 'per_kill' && (
            <div className="space-y-1.5 col-span-1 sm:col-span-2 lg:col-span-3">
              <label className="text-[11px] font-bold text-[#FF8C00] uppercase block">
                Per Kill Reward (₹) *
              </label>
              <input
                type="number"
                min="1"
                value={localPerKill}
                onChange={(e) => setLocalPerKill(parseNum(e.target.value, 0))}
                className="w-full bg-[#18181B] border border-[#27272A] focus:border-[#FF8C00] rounded-none px-3.5 py-2.5 text-white text-xs focus:outline-none"
              />
            </div>
          )}

          {/* Placement Only & Placement + Per Kill UI */}
          {(localPrizeType === 'placement' || localPrizeType === 'placement_kill') && (
            <>
              {localPrizeType === 'placement_kill' && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[#FF8C00] uppercase block">
                    Per Kill Reward (₹) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={localPerKill}
                    onChange={(e) => setLocalPerKill(parseNum(e.target.value, 0))}
                    className="w-full bg-[#18181B] border border-[#27272A] focus:border-[#FF8C00] rounded-none px-3.5 py-2.5 text-white text-xs focus:outline-none"
                  />
                </div>
              )}

              {/* 1st Prize */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[#FFB900] uppercase block">
                  1st Prize (₹) *
                </label>
                <input
                  type="number"
                  min="1"
                  value={localPrizes.firstPrize}
                  onChange={(e) => setLocalPrizes((p) => ({ ...p, firstPrize: parseNum(e.target.value, 0) }))}
                  className="w-full bg-[#18181B] border border-[#27272A] focus:border-[#FFB900] rounded-none px-3.5 py-2.5 text-white text-xs focus:outline-none"
                />
              </div>

              {/* 2nd Prize */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[#A1A1AA] uppercase block">
                  2nd Prize (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={localPrizes.secondPrize}
                  onChange={(e) => setLocalPrizes((p) => ({ ...p, secondPrize: parseNum(e.target.value, 0) }))}
                  className="w-full bg-[#18181B] border border-[#27272A] focus:border-[#A1A1AA] rounded-none px-3.5 py-2.5 text-white text-xs focus:outline-none"
                />
              </div>

              {/* 3rd Prize */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[#FF8C00] uppercase block">
                  3rd Prize (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={localPrizes.thirdPrize}
                  onChange={(e) => setLocalPrizes((p) => ({ ...p, thirdPrize: parseNum(e.target.value, 0) }))}
                  className="w-full bg-[#18181B] border border-[#27272A] focus:border-[#FF8C00] rounded-none px-3.5 py-2.5 text-white text-xs focus:outline-none"
                />
              </div>

              {/* 4th Prize (Optional) */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[#A1A1AA] uppercase block">
                  4th Prize (Optional ₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={localPrizes.fourthPrize}
                  onChange={(e) => setLocalPrizes((p) => ({ ...p, fourthPrize: parseNum(e.target.value, 0) }))}
                  className="w-full bg-[#18181B] border border-[#27272A] focus:border-[#FFB900] rounded-none px-3.5 py-2.5 text-white text-xs focus:outline-none"
                />
              </div>

              {/* 5th Prize (Optional) */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[#A1A1AA] uppercase block">
                  5th Prize (Optional ₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={localPrizes.fifthPrize}
                  onChange={(e) => setLocalPrizes((p) => ({ ...p, fifthPrize: parseNum(e.target.value, 0) }))}
                  className="w-full bg-[#18181B] border border-[#27272A] focus:border-[#FFB900] rounded-none px-3.5 py-2.5 text-white text-xs focus:outline-none"
                />
              </div>

              {/* MVP Bonus (Optional - placement + per kill) */}
              {localPrizeType === 'placement_kill' && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[#10B981] uppercase block">
                    MVP Bonus (Optional ₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={localPrizes.mvpBonus}
                    onChange={(e) => setLocalPrizes((p) => ({ ...p, mvpBonus: parseNum(e.target.value, 0) }))}
                    className="w-full bg-[#18181B] border border-[#27272A] focus:border-[#10B981] rounded-none px-3.5 py-2.5 text-white text-xs focus:outline-none"
                  />
                </div>
              )}
            </>
          )}

        </div>
      </div>

      {/* SECTION 5: LIVE SUMMARY */}
      <div className="bg-[#111215] p-5 rounded-none border border-[#27272A] space-y-3 shadow-sm">
        <div className="flex items-center justify-between border-b border-[#27272A] pb-2.5">
          <span className="font-headline text-xs font-black uppercase text-[#FFB900] flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#FFB900]" />
            <span>Section 5: Live Tournament Summary</span>
          </span>
          <span className="text-[10px] text-[#10B981] font-bold uppercase">Auto-Calculating</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs font-mono">
          <div><span className="text-[#A1A1AA] block">Game:</span> <strong className="text-white">{game}</strong></div>
          <div><span className="text-[#A1A1AA] block">Mode:</span> <strong className="text-white">{mode.toUpperCase()}</strong></div>
          <div><span className="text-[#A1A1AA] block">Entry Fee:</span> <strong className="text-[#FFB900]">{!localPaymentEnabled || localEntryFee === 0 ? 'Free' : `₹${localEntryFee}`}</strong></div>
          <div><span className="text-[#A1A1AA] block">Total Slots:</span> <strong className="text-white">{localSlots} Slots</strong></div>
          <div><span className="text-[#A1A1AA] block">Payment Status:</span> <strong className={localPaymentEnabled ? 'text-[#FFB900]' : 'text-[#A1A1AA]'}>{localPaymentEnabled ? 'Enabled (FamGateway)' : 'Disabled (Free Entry)'}</strong></div>
          <div><span className="text-[#A1A1AA] block">Prize Type:</span> <strong className="text-[#FF8C00] uppercase">{localPrizeType.replace('_', ' ')}</strong></div>
          
          <div className="col-span-2 sm:col-span-3 lg:col-span-2">
            <span className="text-[#A1A1AA] block">Prize Distribution:</span>
            <strong className="text-[#FFB900]">
              {localPrizeType === 'winner_takes_all'
                ? `1st: ₹${localPrizes.winnerPrize}`
                : localPrizeType === 'per_kill'
                ? `₹${localPerKill} / Kill`
                : `1st: ₹${localPrizes.firstPrize} • 2nd: ₹${localPrizes.secondPrize} • 3rd: ₹${localPrizes.thirdPrize}`}
            </strong>
          </div>

          <div className="col-span-2 sm:col-span-3 lg:col-span-4 p-3 bg-[#18181B] border border-[#27272A] rounded-none flex items-center justify-between mt-1">
            <span className="text-xs text-[#A1A1AA] uppercase font-bold">Estimated Total Prize Pool</span>
            <span className="text-base font-black text-[#10B981]">₹{estimatedTotalPrize.toLocaleString()}</span>
          </div>
        </div>
      </div>

    </div>
  )
}
