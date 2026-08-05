import React, { useState, useMemo } from 'react'
import {
  Trophy,
  DollarSign,
  Percent,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  PieChart,
  RefreshCw,
  Award,
  Crown,
  Zap,
  Info
} from 'lucide-react'

// Formatting helper for INR currency
const formatCurrency = (val) => {
  const num = Number(val) || 0
  return `₹${num.toLocaleString('en-IN')}`
}

// Preset Distribution Templates
const PRESET_TEMPLATES = [
  {
    name: 'Top 3 Classic (50/30/20)',
    tiers: [
      { id: 't1', rank: '1st Place (Champions)', percentage: 50, color: '#ffd700' },
      { id: 't2', rank: '2nd Place (Runners Up)', percentage: 30, color: '#c0c0c0' },
      { id: 't3', rank: '3rd Place (2nd Runners)', percentage: 20, color: '#cd7f32' },
    ]
  },
  {
    name: 'Pro Top 5 + MVP (45/25/15/8/5/2)',
    tiers: [
      { id: 't1', rank: '1st Place (Champions)', percentage: 45, color: '#ffd700' },
      { id: 't2', rank: '2nd Place (Runners Up)', percentage: 25, color: '#c0c0c0' },
      { id: 't3', rank: '3rd Place (2nd Runners)', percentage: 15, color: '#cd7f32' },
      { id: 't4', rank: '4th Place', percentage: 8, color: '#00f2ff' },
      { id: 't5', rank: '5th Place', percentage: 5, color: '#a855f7' },
      { id: 't6', rank: 'Tournament MVP', percentage: 2, color: '#fe6b00' },
    ]
  },
  {
    name: 'Winner Takes Most + Top Fragger (70/20/10)',
    tiers: [
      { id: 't1', rank: '1st Place (Champions)', percentage: 70, color: '#ffd700' },
      { id: 't2', rank: '2nd Place', percentage: 20, color: '#c0c0c0' },
      { id: 't3', rank: 'Top Fragger / Most Kills', percentage: 10, color: '#ff4655' },
    ]
  }
]

export default function PrizePoolBreakdown({
  initialTotalPool = 100000,
  onUpdate,
  readOnly = false
}) {
  const [totalPool, setTotalPool] = useState(() => {
    if (typeof initialTotalPool === 'string') {
      return parseInt(initialTotalPool.replace(/[^0-9]/g, ''), 10) || 100000
    }
    return Number(initialTotalPool) || 100000
  })

  const [tiers, setTiers] = useState(PRESET_TEMPLATES[0].tiers)
  const [activeTemplate, setActiveTemplate] = useState(0)

  // Calculations
  const calculatedData = useMemo(() => {
    const poolNum = Math.max(0, Number(totalPool) || 0)
    
    let totalPercentage = 0
    let totalAllocatedAmount = 0

    const enrichedTiers = tiers.map((tier) => {
      const pct = Number(tier.percentage) || 0
      totalPercentage += pct
      const amount = Math.round((pct / 100) * poolNum)
      totalAllocatedAmount += amount

      return {
        ...tier,
        amount
      }
    })

    const remainingBalance = poolNum - totalAllocatedAmount
    const remainingPercentage = Number((100 - totalPercentage).toFixed(2))

    return {
      poolNum,
      enrichedTiers,
      totalPercentage: Number(totalPercentage.toFixed(2)),
      totalAllocatedAmount,
      remainingBalance,
      remainingPercentage,
      isValid: Math.abs(totalPercentage - 100) < 0.01 && remainingBalance === 0
    }
  }, [totalPool, tiers])

  // Handle Total Pool Input Change
  const handleTotalPoolChange = (e) => {
    const val = parseInt(e.target.value.replace(/[^0-9]/g, ''), 10) || 0
    setTotalPool(val)
    if (onUpdate) {
      onUpdate({ totalPool: val, tiers: calculatedData.enrichedTiers, isValid: calculatedData.isValid })
    }
  }

  // Handle Percentage Change for a Tier
  const handleTierPctChange = (id, newPct) => {
    const pct = Math.max(0, Math.min(100, Number(newPct) || 0))
    setTiers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, percentage: pct } : t))
    )
  }

  // Handle Amount Change for a Tier (auto-calculates percentage)
  const handleTierAmountChange = (id, newAmount) => {
    const amt = Math.max(0, Number(newAmount) || 0)
    const pool = calculatedData.poolNum || 1
    const pct = Number(((amt / pool) * 100).toFixed(2))
    setTiers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, percentage: pct } : t))
    )
  }

  // Apply Preset Template
  const handleApplyTemplate = (idx) => {
    setActiveTemplate(idx)
    setTiers(PRESET_TEMPLATES[idx].tiers)
  }

  // Auto-Balance Remaining Percentage
  const handleAutoBalance = () => {
    if (tiers.length === 0) return
    const currentSumWithoutFirst = tiers.slice(1).reduce((sum, t) => sum + (Number(t.percentage) || 0), 0)
    const neededFirst = Math.max(0, Number((100 - currentSumWithoutFirst).toFixed(2)))
    
    setTiers((prev) =>
      prev.map((t, idx) => (idx === 0 ? { ...t, percentage: neededFirst } : t))
    )
  }

  // Add Custom Tier
  const handleAddTier = () => {
    const newId = `tier-${Date.now()}`
    const colors = ['#00f2ff', '#00ff9d', '#a855f7', '#fe6b00', '#ff4655']
    const color = colors[tiers.length % colors.length]
    setTiers((prev) => [
      ...prev,
      { id: newId, rank: `Custom Rank ${prev.length + 1}`, percentage: 5, color }
    ])
  }

  // Remove Tier
  const handleRemoveTier = (id) => {
    setTiers((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <div className="space-y-6 text-white font-mono text-xs">
      
      {/* SECTION 1: TOTAL PRIZE POOL INPUT & QUICK PRESETS */}
      <div className="bg-[#0b0e14] p-5 rounded-2xl border border-[#fe6b00]/40 shadow-[0_0_20px_rgba(254,107,0,0.08)] space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#3a494b]/50 pb-3">
          <div className="flex items-center gap-2 text-[#fe6b00]">
            <Trophy className="w-5 h-5" />
            <h3 className="font-headline text-sm font-black uppercase tracking-wider text-white">
              Prize Pool & Financial Distribution Engine
            </h3>
          </div>
          <span className="text-[10px] text-[#8e9dae] font-semibold uppercase">
            Auto-Calculation Enabled
          </span>
        </div>

        {!readOnly && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Total Prize Pool Numeric Input */}
            <div className="space-y-2">
              <label className="flex items-center justify-between text-[11px] font-bold text-[#8e9dae] uppercase tracking-wide">
                <span>Total Prize Pool Amount</span>
                <span className="text-[#fe6b00] font-mono font-extrabold text-sm">
                  {formatCurrency(totalPool)}
                </span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white font-bold text-sm">
                  ₹
                </span>
                <input
                  type="number"
                  min={0}
                  step={5000}
                  value={totalPool}
                  onChange={handleTotalPoolChange}
                  className="w-full bg-[#151a21] border border-[#3a494b] rounded-xl pl-8 pr-4 py-3 text-white font-mono font-bold text-sm focus:outline-none focus:border-[#fe6b00] focus:ring-1 focus:ring-[#fe6b00] transition-all"
                  placeholder="100000"
                />
              </div>

              {/* Quick Presets */}
              <div className="flex items-center gap-1.5 pt-1 overflow-x-auto hide-scrollbar">
                <span className="text-[9px] text-[#8e9dae] font-bold uppercase mr-1">Preset:</span>
                {[10000, 25000, 50000, 100000, 250000].map((preset) => (
                  <button
                    key={`pool-preset-${preset}`}
                    type="button"
                    onClick={() => setTotalPool(preset)}
                    className="px-2.5 py-1 rounded bg-[#151a21] hover:bg-[#fe6b00]/20 text-[#8e9dae] hover:text-[#fe6b00] border border-[#3a494b] hover:border-[#fe6b00]/40 text-[10px] font-bold transition-all cursor-pointer"
                  >
                    ₹{preset >= 100000 ? `${preset / 100000}L` : `${preset / 1000}K`}
                  </button>
                ))}
              </div>
            </div>

            {/* Template Presets Selector */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-[#8e9dae] uppercase tracking-wide block">
                Distribution Strategy Preset
              </label>
              <div className="space-y-2">
                {PRESET_TEMPLATES.map((tmpl, idx) => (
                  <button
                    key={`tmpl-${idx}`}
                    type="button"
                    onClick={() => handleApplyTemplate(idx)}
                    className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between text-xs transition-all cursor-pointer ${
                      activeTemplate === idx
                        ? 'bg-[#151a21] border-[#00f2ff] text-white shadow-[0_0_12px_rgba(0,242,255,0.15)]'
                        : 'bg-[#07090c] border-[#3a494b]/60 text-[#8e9dae] hover:border-[#3a494b]'
                    }`}
                  >
                    <span className="font-semibold">{tmpl.name}</span>
                    <span className="text-[10px] text-[#00f2ff] font-mono font-bold">Apply</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 2: PERCENTAGE CHECK & REMAINING BALANCE SUMMARY */}
      <div className="bg-[#07090c] border border-[#3a494b]/60 rounded-2xl p-5 space-y-4 shadow-xl">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          {/* Percentage Check Progress Indicator */}
          <div className="space-y-1 flex-1">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-[#8e9dae] uppercase flex items-center gap-1.5">
                <Percent className="w-3.5 h-3.5 text-[#00f2ff]" />
                Percentage Allocation Check
              </span>
              <span
                className={`font-mono font-extrabold text-xs px-2.5 py-0.5 rounded border uppercase ${
                  calculatedData.totalPercentage === 100
                    ? 'bg-[#00ff9d]/10 text-[#00ff9d] border-[#00ff9d]/40'
                    : calculatedData.totalPercentage > 100
                    ? 'bg-[#ff4655]/10 text-[#ff4655] border-[#ff4655]/40 animate-pulse'
                    : 'bg-[#00f2ff]/10 text-[#00f2ff] border-[#00f2ff]/40'
                }`}
              >
                {calculatedData.totalPercentage}% Allocated
              </span>
            </div>

            {/* Percentage Progress Bar */}
            <div className="w-full h-3 bg-[#151a21] rounded-full overflow-hidden border border-[#3a494b]/60 flex">
              {calculatedData.enrichedTiers.map((t) => (
                <div
                  key={`bar-${t.id}`}
                  style={{
                    width: `${Math.min(100, t.percentage)}%`,
                    backgroundColor: t.color
                  }}
                  className="h-full transition-all duration-300 relative group"
                  title={`${t.rank}: ${t.percentage}%`}
                />
              ))}
            </div>
          </div>

          {/* Auto-Balance Button if invalid */}
          {!readOnly && calculatedData.totalPercentage !== 100 && (
            <button
              type="button"
              onClick={handleAutoBalance}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#00f2ff]/10 hover:bg-[#00f2ff]/20 border border-[#00f2ff]/40 text-[#00f2ff] text-xs font-bold uppercase transition-all cursor-pointer self-start sm:self-auto shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Auto-Balance 100%</span>
            </button>
          )}
        </div>

        {/* METRICS CARDS: ALLOCATED VS REMAINING */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          
          <div className="p-3 bg-[#151a21] border border-[#3a494b]/60 rounded-xl space-y-1">
            <span className="text-[10px] text-[#8e9dae] uppercase font-bold block">Total Pool</span>
            <span className="font-mono text-base font-extrabold text-white">
              {formatCurrency(calculatedData.poolNum)}
            </span>
          </div>

          <div className="p-3 bg-[#151a21] border border-[#3a494b]/60 rounded-xl space-y-1">
            <span className="text-[10px] text-[#8e9dae] uppercase font-bold block">Allocated Total</span>
            <span className="font-mono text-base font-extrabold text-[#00ff9d]">
              {formatCurrency(calculatedData.totalAllocatedAmount)}
            </span>
          </div>

          {/* Remaining Balance Card */}
          <div
            className={`p-3 rounded-xl border space-y-1 ${
              calculatedData.remainingBalance === 0
                ? 'bg-[#00ff9d]/5 border-[#00ff9d]/30 text-[#00ff9d]'
                : calculatedData.remainingBalance < 0
                ? 'bg-[#ff4655]/10 border-[#ff4655]/40 text-[#ff4655]'
                : 'bg-[#00f2ff]/5 border-[#00f2ff]/30 text-[#00f2ff]'
            }`}
          >
            <span className="text-[10px] uppercase font-bold block">Remaining Unallocated Balance</span>
            <span className="font-mono text-base font-extrabold block">
              {formatCurrency(calculatedData.remainingBalance)}
            </span>
          </div>
        </div>

        {/* Validation Warning Alert */}
        {!calculatedData.isValid && (
          <div className="p-3 bg-[#ff4655]/10 border border-[#ff4655]/40 rounded-xl flex items-center gap-2.5 text-xs text-[#ff4655]">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              {calculatedData.totalPercentage > 100
                ? `Validation Alert: Prize pool over-allocated by ${(calculatedData.totalPercentage - 100).toFixed(1)}% (${formatCurrency(Math.abs(calculatedData.remainingBalance))}).`
                : `Validation Alert: ${calculatedData.remainingPercentage}% unallocated (${formatCurrency(calculatedData.remainingBalance)} remaining).`}
            </span>
          </div>
        )}
      </div>

      {/* SECTION 3: RESPONSIVE TIERS TABLE & EDITABLE INPUTS */}
      <div className="bg-[#07090c] border border-[#3a494b]/60 rounded-2xl p-5 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#3a494b]/50 pb-3">
          <h4 className="font-headline text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
            <Award className="w-4 h-4 text-[#ffd700]" />
            <span>Rank Placement & Prize Allocation Matrix</span>
          </h4>
          
          {!readOnly && (
            <button
              type="button"
              onClick={handleAddTier}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00f2ff]/10 hover:bg-[#00f2ff]/20 border border-[#00f2ff]/40 text-[#00f2ff] text-[10px] font-bold uppercase transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Custom Tier</span>
            </button>
          )}
        </div>

        {/* RESPONSIVE GRID OF PLACEMENT CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {calculatedData.enrichedTiers.map((tier) => (
            <div
              key={tier.id}
              className="p-4 bg-[#151a21] border border-[#3a494b]/60 rounded-xl space-y-3 relative hover:border-[#00f2ff]/40 transition-all"
            >
              {/* Card Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: tier.color }}
                  />
                  <input
                    type="text"
                    disabled={readOnly}
                    value={tier.rank}
                    onChange={(e) => {
                      const val = e.target.value
                      setTiers((prev) =>
                        prev.map((t) => (t.id === tier.id ? { ...t, rank: val } : t))
                      )
                    }}
                    className="bg-transparent text-white font-bold text-xs focus:outline-none focus:border-b border-[#00f2ff] w-full"
                  />
                </div>

                {!readOnly && tiers.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveTier(tier.id)}
                    className="text-[#8e9dae] hover:text-[#ff4655] transition-colors p-1"
                    title="Remove Tier"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Amount Display & Inputs */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                
                {/* Percentage Input */}
                <div className="space-y-1">
                  <span className="text-[10px] text-[#8e9dae] font-bold uppercase">Share %</span>
                  <div className="relative">
                    <input
                      type="number"
                      disabled={readOnly}
                      min={0}
                      max={100}
                      step={0.5}
                      value={tier.percentage}
                      onChange={(e) => handleTierPctChange(tier.id, e.target.value)}
                      className="w-full bg-[#07090c] border border-[#3a494b] rounded-lg px-2.5 py-2 text-white font-mono font-bold text-xs focus:outline-none focus:border-[#00f2ff]"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8e9dae] text-xs">
                      %
                    </span>
                  </div>
                </div>

                {/* Amount Input */}
                <div className="space-y-1">
                  <span className="text-[10px] text-[#8e9dae] font-bold uppercase">Amount (₹)</span>
                  <div className="relative">
                    <input
                      type="number"
                      disabled={readOnly}
                      min={0}
                      step={500}
                      value={tier.amount}
                      onChange={(e) => handleTierAmountChange(tier.id, e.target.value)}
                      className="w-full bg-[#07090c] border border-[#3a494b] rounded-lg px-2.5 py-2 text-[#00ff9d] font-mono font-bold text-xs focus:outline-none focus:border-[#00ff9d]"
                    />
                  </div>
                </div>

              </div>

              {/* Formatted Amount Tag */}
              <div className="pt-2 border-t border-[#3a494b]/40 flex justify-between items-center text-[10px]">
                <span className="text-[#8e9dae]">Calculated Cash:</span>
                <span className="font-mono font-extrabold text-[#00ff9d] text-xs">
                  {formatCurrency(tier.amount)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
