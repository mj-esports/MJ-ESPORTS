import React, { useState, useEffect } from 'react'
import {
  Trophy,
  IndianRupee,
  Users,
  Swords,
  Target,
  Award,
  CreditCard,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react'

// Section 2: 4 Prize Types (Radio Cards)
const PRIZE_TYPES = [
  { id: 'placement_kill', label: 'Placement + Per Kill', icon: Swords, desc: 'Rank position & kill bounties' },
  { id: 'placement', label: 'Placement Only', icon: Trophy, desc: 'Leaderboard rank placement rewards' },
  { id: 'per_kill', label: 'Per Kill Only', icon: Target, desc: 'Flat reward per confirmed kill' },
  { id: 'winner_takes_all', label: 'Winner Takes All', icon: Award, desc: 'Single prize for #1 Champion' },
]

export default function EntryPrizeSystem({
  entryFee = 50,
  maxTeams = 32,
  game = 'Free Fire',
  mode = 'squad',
  prizeType = 'placement_kill',
  perKillReward = 30,
  prizes = { firstPrize: 800, secondPrize: 400, thirdPrize: 200, fourthPrize: 0, mvpBonus: 0, winnerPrize: 1500 },
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

  const [localEntryFee, setLocalEntryFee] = useState(() => parseNum(entryFee, 50))
  const [localSlots, setLocalSlots] = useState(() => parseNum(maxTeams, 32))
  const [localPrizeType, setLocalPrizeType] = useState(prizeType || 'placement_kill')
  const [localPerKill, setLocalPerKill] = useState(() => parseNum(perKillReward, 30))
  const [localPrizes, setLocalPrizes] = useState({
    firstPrize: parseNum(prizes?.firstPrize, 800),
    secondPrize: parseNum(prizes?.secondPrize, 400),
    thirdPrize: parseNum(prizes?.thirdPrize, 200),
    fourthPrize: parseNum(prizes?.fourthPrize, 0),
    mvpBonus: parseNum(prizes?.mvpBonus, 0),
    winnerPrize: parseNum(prizes?.winnerPrize, 1500),
  })

  // Synchronize state back to parent (No profit or revenue calculations)
  useEffect(() => {
    if (onChange && !readOnly) {
      onChange({
        entryFee: localEntryFee === 0 ? 'Free' : `₹${localEntryFee}`,
        entryFeeNum: localEntryFee,
        maxTeams: localSlots,
        paymentGateway: 'Razorpay',
        prizeType: localPrizeType,
        perKillReward: localPerKill,
        prizes: localPrizes,
      })
    }
  }, [localEntryFee, localSlots, localPrizeType, localPerKill, localPrizes])

  if (readOnly) {
    return (
      <div className="bg-[#07090c] border border-[#3a494b]/60 rounded-2xl p-6 space-y-4 text-white font-mono text-xs shadow-xl">
        <div className="flex items-center justify-between border-b border-[#3a494b]/50 pb-3">
          <div className="flex items-center gap-2 text-[#00f2ff]">
            <Trophy className="w-5 h-5 text-[#ffd700]" />
            <h3 className="font-headline text-sm font-black uppercase text-white tracking-wider">
              Financials & Prize Pool Overview
            </h3>
          </div>
          <span className="px-3 py-1 rounded-full text-[10px] font-black bg-[#00f2ff]/10 text-[#00f2ff] border border-[#00f2ff]/30 uppercase">
            Razorpay UPI
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-[#151a21] border border-[#3a494b]/60 rounded-xl space-y-1">
            <span className="text-[10px] text-[#8e9dae] uppercase font-bold block">Entry Fee</span>
            <span className="text-[#00f2ff] font-bold text-sm block">
              {localEntryFee === 0 ? 'Free' : `₹${localEntryFee}`}
            </span>
          </div>

          <div className="p-3 bg-[#151a21] border border-[#3a494b]/60 rounded-xl space-y-1">
            <span className="text-[10px] text-[#8e9dae] uppercase font-bold block">Squad Slots</span>
            <span className="text-white font-bold text-sm block">{localSlots} Slots</span>
          </div>

          <div className="p-3 bg-[#151a21] border border-[#3a494b]/60 rounded-xl space-y-1">
            <span className="text-[10px] text-[#8e9dae] uppercase font-bold block">Prize Type</span>
            <span className="text-[#fe6b00] font-bold text-xs block uppercase">
              {localPrizeType.replace('_', ' ')}
            </span>
          </div>

          <div className="p-3 bg-[#151a21] border border-[#3a494b]/60 rounded-xl space-y-1">
            <span className="text-[10px] text-[#8e9dae] uppercase font-bold block">Gateway</span>
            <span className="text-[#00ff9d] font-bold text-xs block">Razorpay</span>
          </div>
        </div>

        {/* Dynamic Display of Configured Prizes */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
          {localPrizeType === 'winner_takes_all' ? (
            <div className="p-3 bg-[#151a21] border border-[#ffd700]/40 rounded-xl col-span-2 sm:col-span-3">
              <span className="text-[10px] text-[#ffd700] uppercase font-bold block">1st Winner Champion</span>
              <span className="text-white font-extrabold text-base">₹{localPrizes.winnerPrize}</span>
            </div>
          ) : localPrizeType === 'per_kill' ? (
            <div className="p-3 bg-[#151a21] border border-[#fe6b00]/40 rounded-xl col-span-2 sm:col-span-3">
              <span className="text-[10px] text-[#fe6b00] uppercase font-bold block">Per Kill Reward</span>
              <span className="text-white font-extrabold text-base">₹{localPerKill} / Kill</span>
            </div>
          ) : (
            <>
              <div className="p-3 bg-[#151a21] border border-[#ffd700]/40 rounded-xl">
                <span className="text-[10px] text-[#ffd700] uppercase font-bold block">1st Prize</span>
                <span className="text-white font-extrabold text-base">₹{localPrizes.firstPrize}</span>
              </div>
              <div className="p-3 bg-[#151a21] border border-[#c0c0c0]/40 rounded-xl">
                <span className="text-[10px] text-[#c0c0c0] uppercase font-bold block">2nd Prize</span>
                <span className="text-white font-bold text-sm">₹{localPrizes.secondPrize}</span>
              </div>
              <div className="p-3 bg-[#151a21] border border-[#cd7f32]/40 rounded-xl">
                <span className="text-[10px] text-[#cd7f32] uppercase font-bold block">3rd Prize</span>
                <span className="text-white font-bold text-sm">₹{localPrizes.thirdPrize}</span>
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 text-white font-mono text-xs">
      
      {/* SECTION 1: TOURNAMENT ENTRY */}
      <div className="bg-[#0b0e14] p-5 rounded-2xl border border-[#00f2ff]/30 shadow-[0_0_20px_rgba(0,242,255,0.05)] space-y-4">
        <div className="flex items-center justify-between border-b border-[#3a494b]/50 pb-3">
          <div className="flex items-center gap-2 text-[#00f2ff]">
            <IndianRupee className="w-4 h-4" />
            <h3 className="font-headline text-xs font-black uppercase tracking-wider text-white">
              Section 1: Tournament Entry Parameters
            </h3>
          </div>
          <span className="text-[10px] text-[#8e9dae] font-semibold uppercase">5 Parameters</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          
          {/* Entry Fee */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[#8e9dae] uppercase block">
              Entry Fee (₹) *
            </label>
            <input
              type="number"
              min="0"
              value={localEntryFee}
              onChange={(e) => setLocalEntryFee(Math.max(0, parseNum(e.target.value, 0)))}
              className={`w-full bg-[#151a21] border rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-none ${
                errors.entryFee ? 'border-red-500 bg-red-500/10' : 'border-[#3a494b] focus:border-[#00f2ff]'
              }`}
            />
            {errors.entryFee && <p className="text-red-400 text-[10px] font-bold mt-1">{errors.entryFee}</p>}
          </div>

          {/* Total Slots */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[#8e9dae] uppercase block">
              Total Squad Slots *
            </label>
            <input
              type="number"
              min="1"
              max="200"
              value={localSlots}
              onChange={(e) => setLocalSlots(Math.max(1, parseNum(e.target.value, 32)))}
              className={`w-full bg-[#151a21] border rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-none ${
                errors.maxTeams ? 'border-red-500 bg-red-500/10' : 'border-[#3a494b] focus:border-[#00ff9d]'
              }`}
            />
            {errors.maxTeams && <p className="text-red-400 text-[10px] font-bold mt-1">{errors.maxTeams}</p>}
          </div>

          {/* Game (Read-only) */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[#8e9dae] uppercase block">Game Title</label>
            <input
              type="text"
              readOnly
              value={game}
              className="w-full bg-[#151a21]/60 border border-[#3a494b]/60 rounded-xl px-3.5 py-2.5 text-[#8e9dae] text-xs font-semibold"
            />
          </div>

          {/* Match Mode (Read-only) */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[#8e9dae] uppercase block">Match Mode</label>
            <input
              type="text"
              readOnly
              value={mode.toUpperCase()}
              className="w-full bg-[#151a21]/60 border border-[#3a494b]/60 rounded-xl px-3.5 py-2.5 text-[#8e9dae] text-xs font-semibold"
            />
          </div>

          {/* Fixed Payment Gateway: Razorpay */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[#00ff9d] uppercase block">Payment Gateway</label>
            <div className="w-full bg-[#151a21] border border-[#00ff9d]/50 rounded-xl px-3.5 py-2.5 text-[#00ff9d] text-xs font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#00ff9d]" />
              <span>Razorpay (Fixed)</span>
            </div>
          </div>

        </div>

        {/* Gateway Notice Box */}
        <div className="p-3 bg-[#151a21] border border-[#3a494b]/60 rounded-xl flex items-center gap-2 text-xs text-[#8e9dae]">
          <CreditCard className="w-4 h-4 text-[#00f2ff] shrink-0" />
          <span>Players pay securely using UPI via Razorpay. Gateway configuration is fixed for all matches.</span>
        </div>
      </div>

      {/* SECTION 2: PRIZE TYPE (RADIO CARDS) */}
      <div className="bg-[#0b0e14] p-5 rounded-2xl border border-[#00f2ff]/30 shadow-[0_0_20px_rgba(0,242,255,0.05)] space-y-4">
        <div className="flex items-center justify-between border-b border-[#3a494b]/50 pb-3">
          <div className="flex items-center gap-2 text-[#00f2ff]">
            <Trophy className="w-4 h-4" />
            <h3 className="font-headline text-xs font-black uppercase tracking-wider text-white">
              Section 2: Select Prize Type *
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

      {/* SECTION 3: DYNAMIC PRIZE CONFIGURATION */}
      <div className="bg-[#0b0e14] p-5 rounded-2xl border border-[#00f2ff]/30 shadow-[0_0_20px_rgba(0,242,255,0.05)] space-y-4">
        <div className="flex items-center justify-between border-b border-[#3a494b]/50 pb-3">
          <div className="flex items-center gap-2 text-[#00f2ff]">
            <Trophy className="w-4 h-4" />
            <h3 className="font-headline text-xs font-black uppercase tracking-wider text-white">
              Section 3: Prize Configuration ({localPrizeType.replace('_', ' ').toUpperCase()})
            </h3>
          </div>
          <span className="text-[10px] text-[#fe6b00] font-bold uppercase">Manual Admin Control</span>
        </div>

        {/* Dynamic Fields based on active Prize Type */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          
          {/* Winner Takes All UI */}
          {localPrizeType === 'winner_takes_all' && (
            <div className="space-y-1.5 col-span-1 sm:col-span-2 lg:col-span-3">
              <label className="text-[11px] font-bold text-[#ffd700] uppercase block">
                1st Winner Champion Prize (₹) *
              </label>
              <input
                type="number"
                min="1"
                value={localPrizes.winnerPrize}
                onChange={(e) => setLocalPrizes((p) => ({ ...p, winnerPrize: parseNum(e.target.value, 0) }))}
                className={`w-full bg-[#151a21] border rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-none ${
                  errors.winnerPrize ? 'border-red-500 bg-red-500/10' : 'border-[#3a494b] focus:border-[#ffd700]'
                }`}
              />
              {errors.winnerPrize && <p className="text-red-400 text-[10px] font-bold mt-1">{errors.winnerPrize}</p>}
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
                className={`w-full bg-[#151a21] border rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-none ${
                  errors.perKillReward ? 'border-red-500 bg-red-500/10' : 'border-[#3a494b] focus:border-[#fe6b00]'
                }`}
              />
              {errors.perKillReward && <p className="text-red-400 text-[10px] font-bold mt-1">{errors.perKillReward}</p>}
            </div>
          )}

          {/* Placement Only & Placement + Per Kill UI */}
          {(localPrizeType === 'placement' || localPrizeType === 'placement_kill') && (
            <>
              {/* Per Kill Reward if Placement + Per Kill */}
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
                    className={`w-full bg-[#151a21] border rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-none ${
                      errors.perKillReward ? 'border-red-500 bg-red-500/10' : 'border-[#3a494b] focus:border-[#fe6b00]'
                    }`}
                  />
                  {errors.perKillReward && <p className="text-red-400 text-[10px] font-bold mt-1">{errors.perKillReward}</p>}
                </div>
              )}

              {/* 1st Prize */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[#ffd700] uppercase block">
                  1st Prize Champion (₹) *
                </label>
                <input
                  type="number"
                  min="1"
                  value={localPrizes.firstPrize}
                  onChange={(e) => setLocalPrizes((p) => ({ ...p, firstPrize: parseNum(e.target.value, 0) }))}
                  className={`w-full bg-[#151a21] border rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-none ${
                    errors.firstPrize ? 'border-red-500 bg-red-500/10' : 'border-[#3a494b] focus:border-[#ffd700]'
                  }`}
                />
                {errors.firstPrize && <p className="text-red-400 text-[10px] font-bold mt-1">{errors.firstPrize}</p>}
              </div>

              {/* 2nd Prize */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[#c0c0c0] uppercase block">
                  2nd Runner-up (₹) *
                </label>
                <input
                  type="number"
                  min="0"
                  value={localPrizes.secondPrize}
                  onChange={(e) => setLocalPrizes((p) => ({ ...p, secondPrize: parseNum(e.target.value, 0) }))}
                  className={`w-full bg-[#151a21] border rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-none ${
                    errors.secondPrize ? 'border-red-500 bg-red-500/10' : 'border-[#3a494b] focus:border-[#c0c0c0]'
                  }`}
                />
                {errors.secondPrize && <p className="text-red-400 text-[10px] font-bold mt-1">{errors.secondPrize}</p>}
              </div>

              {/* 3rd Prize */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[#cd7f32] uppercase block">
                  3rd Place (₹) *
                </label>
                <input
                  type="number"
                  min="0"
                  value={localPrizes.thirdPrize}
                  onChange={(e) => setLocalPrizes((p) => ({ ...p, thirdPrize: parseNum(e.target.value, 0) }))}
                  className={`w-full bg-[#151a21] border rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-none ${
                    errors.thirdPrize ? 'border-red-500 bg-red-500/10' : 'border-[#3a494b] focus:border-[#cd7f32]'
                  }`}
                />
                {errors.thirdPrize && <p className="text-red-400 text-[10px] font-bold mt-1">{errors.thirdPrize}</p>}
              </div>

              {/* 4th Prize (Optional) */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[#8e9dae] uppercase block">
                  4th Place (Optional ₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={localPrizes.fourthPrize}
                  onChange={(e) => setLocalPrizes((p) => ({ ...p, fourthPrize: parseNum(e.target.value, 0) }))}
                  className="w-full bg-[#151a21] border border-[#3a494b] focus:border-[#00f2ff] rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-none"
                />
              </div>

              {/* MVP Bonus (Optional) */}
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
            </>
          )}

        </div>
      </div>

      {/* SECTION 4: TOURNAMENT SUMMARY (EXACT MANUALLY ENTERED VALUES) */}
      <div className="bg-[#0b0e14] p-5 rounded-2xl border border-[#00f2ff]/30 space-y-3">
        <div className="flex items-center justify-between border-b border-[#3a494b]/50 pb-2.5">
          <span className="font-headline text-xs font-black uppercase text-[#00f2ff] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#00f2ff]" />
            <span>Section 4: Configured Tournament Summary</span>
          </span>
          <span className="text-[10px] text-[#8e9dae] font-bold uppercase">Manual Admin Control</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs font-mono">
          <div><span className="text-[#8e9dae] block">Game Title:</span> <strong className="text-white">{game}</strong></div>
          <div><span className="text-[#8e9dae] block">Match Mode:</span> <strong className="text-white">{mode.toUpperCase()}</strong></div>
          <div><span className="text-[#8e9dae] block">Entry Fee:</span> <strong className="text-[#00f2ff]">₹{localEntryFee}</strong></div>
          <div><span className="text-[#8e9dae] block">Total Slots:</span> <strong className="text-white">{localSlots} Slots</strong></div>
          <div><span className="text-[#8e9dae] block">Prize Type:</span> <strong className="text-[#fe6b00] uppercase">{localPrizeType.replace('_', ' ')}</strong></div>
          <div><span className="text-[#8e9dae] block">Payment Gateway:</span> <strong className="text-[#00ff9d]">Razorpay (UPI)</strong></div>
          
          {/* Dynamic Display of Configured Prizes */}
          {localPrizeType === 'winner_takes_all' ? (
            <div className="col-span-2"><span className="text-[#8e9dae] block">Winner Prize:</span> <strong className="text-[#ffd700]">₹{localPrizes.winnerPrize}</strong></div>
          ) : localPrizeType === 'per_kill' ? (
            <div className="col-span-2"><span className="text-[#8e9dae] block">Per Kill Bounty:</span> <strong className="text-[#fe6b00]">₹{localPerKill} / Kill</strong></div>
          ) : (
            <div className="col-span-2">
              <span className="text-[#8e9dae] block">Placement Payouts:</span>
              <strong className="text-[#ffd700]">1st: ₹{localPrizes.firstPrize} &bull; 2nd: ₹{localPrizes.secondPrize} &bull; 3rd: ₹{localPrizes.thirdPrize}</strong>
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
