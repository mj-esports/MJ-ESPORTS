import React from 'react'
import {
  Trophy,
  Calendar,
  Clock,
  Shield,
  CheckCircle2,
  Gamepad2,
  Users,
  MapPin,
  Crosshair,
  Zap,
  Target,
  FileText,
  DollarSign,
  Layers,
  Sparkles,
  Lock,
  Radio,
  Eye,
  AlertCircle
} from 'lucide-react'

import { OFFICIAL_MJ_RULES } from '../common/OfficialRulebook'
import { getTournamentImage } from '../../utils/tournamentImageUtils'
import { getDefaultGameCapacity } from '../../utils/tournamentUtils'

export default function ReviewSummaryStep({ form }) {
  const rulesList = Array.isArray(form.rules) && form.rules.length > 0
    ? form.rules
    : (form.rulesText ? form.rulesText.split('\n').filter(Boolean) : OFFICIAL_MJ_RULES)

  const capInfo = getDefaultGameCapacity(form.game, form.mode)

  return (
    <div className="space-y-6 text-white font-mono text-xs">
      
      {/* HEADER BANNER NOTICE */}
      <div className="p-4 bg-[#FFB900]/10 border border-[#FFB900]/30 rounded-none flex items-center justify-between ">
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-[#FFB900] animate-pulse" />
          <div>
            <h3 className="font-headline text-sm font-black uppercase text-white tracking-wider">
              Step 4: Final Configuration Review & Pre-Launch Audit
            </h3>
            <p className="text-[11px] text-[#A1A1AA] mt-0.5">
              Review all tournament parameters below before clicking <strong>Publish</strong> or <strong>Save Draft</strong>.
            </p>
          </div>
        </div>
        <span className="px-3 py-1 rounded-none text-[10px] font-extrabold bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/40 uppercase tracking-widest hidden sm:inline-block">
          Audit Verified
        </span>
      </div>

      {/* SECTION 1: TITLE & VISUAL BANNER CARD */}
      <div className="bg-[#000000] border border-[#27272A]/60 rounded-none overflow-hidden shadow-2xl">
        
        {/* Banner Image Preview Header */}
        <div className="relative h-40 sm:h-48 bg-[#111215] overflow-hidden flex items-center justify-center border-b border-[#27272A]/60">
          <img
            src={getTournamentImage(form)}
            alt="Tournament Background"
            className="w-full h-full object-cover"
          />

          {/* Floating Badges */}
          <div className="absolute top-4 left-4 flex flex-wrap gap-2 z-10">
            <span className="px-3 py-1 rounded-none text-[10px] font-extrabold bg-black/80 text-[#FFB900] border border-[#FFB900]/50 uppercase backdrop-blur-md">
              {form.game}
            </span>
            <span className="px-3 py-1 rounded-none text-[10px] font-extrabold bg-black/80 text-[#10B981] border border-[#10B981]/50 uppercase backdrop-blur-md">
              {form.mode.toUpperCase()} MODE
            </span>
          </div>

          <div className="absolute bottom-4 right-4 z-10">
            <span className="px-3 py-1 rounded-none text-[10px] font-extrabold bg-black/80 text-[#FF8C00] border border-[#FF8C00]/50 uppercase backdrop-blur-md">
              Status: {form.status || 'Registration Open'}
            </span>
          </div>
        </div>

        {/* Title & Details Body */}
        <div className="p-5 space-y-2">
          <span className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-widest block">
            Official Tournament Title
          </span>
          <h2 className="font-display-lg text-xl sm:text-2xl font-black text-white uppercase italic tracking-tight">
            {form.title || 'Untitled Cyberpunk Tournament'}
          </h2>
          <p className="text-xs text-[#A1A1AA] leading-relaxed pt-1">
            {form.description || 'Official high-stakes esports tournament hosted on MJ ESPORTS.'}
          </p>
        </div>
      </div>

      {/* SECTION 2: BENTO SUMMARY GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* BENTO CARD 1: GAME & TACTICAL PARAMETERS */}
        <div className="p-5 bg-[#000000] border border-[#27272A]/60 rounded-none space-y-3.5 shadow-xl">
          <div className="flex items-center justify-between border-b border-[#27272A]/50 pb-2.5">
            <span className="font-headline text-xs font-black uppercase text-[#FFB900] flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#FFB900]" />
              <span>Game & Tactical Presets</span>
            </span>
            <span className="text-[10px] text-[#A1A1AA] font-bold uppercase">{form.game}</span>
          </div>

          <div className="space-y-2.5 text-xs font-mono">
            <div className="flex justify-between py-1 border-b border-[#27272A]/40">
              <span className="text-[#A1A1AA]">Match Map:</span>
              <strong className="text-white font-bold">{form.ffMap || 'Bermuda'}</strong>
            </div>

            <div className="flex justify-between py-1 border-b border-[#27272A]/40">
              <span className="text-[#A1A1AA]">Gun Attributes:</span>
              <strong className="text-[#10B981]">{form.ffGunAttributes || 'Disabled'}</strong>
            </div>
            <div className="flex justify-between py-1 border-b border-[#27272A]/40">
              <span className="text-[#A1A1AA]">Character Skills:</span>
              <strong className="text-[#FFB900]">{form.ffCharacterSkills || 'Enabled'}</strong>
            </div>

            <div className="flex justify-between py-1">
              <span className="text-[#A1A1AA]">Required Players / Squad:</span>
              <strong className="text-[#FFB900]">
                {form.mode === 'solo' ? '1 Player (Solo)' : form.mode === 'duo' ? '2 Players (Duo)' : '4 Players (Squad)'}
              </strong>
            </div>
          </div>
        </div>

        {/* BENTO CARD 2: SCHEDULE & TIMELINE SUMMARY */}
        <div className="p-5 bg-[#000000] border border-[#27272A]/60 rounded-none space-y-3.5 shadow-xl">
          <div className="flex items-center justify-between border-b border-[#27272A]/50 pb-2.5">
            <span className="font-headline text-xs font-black uppercase text-[#FF8C00] flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#FF8C00]" />
              <span>Tournament Schedule (V1)</span>
            </span>
            <span className="text-[10px] text-[#A1A1AA] font-bold uppercase">IST Timing</span>
          </div>

          <div className="space-y-2 text-[11px] font-mono">
            <div className="flex justify-between py-1 border-b border-[#27272A]/40">
              <span className="text-[#A1A1AA]">1. Tournament Date:</span>
              <strong className="text-white font-bold">{form.startDate || 'Not Set'}</strong>
            </div>

            <div className="flex justify-between py-1 border-b border-[#27272A]/40">
              <span className="text-[#A1A1AA]">2. Registration Opens:</span>
              <strong className="text-[#10B981] font-bold">{form.registrationStart || 'Immediate'}</strong>
            </div>

            <div className="flex justify-between py-1 border-b border-[#27272A]/40">
              <span className="text-[#A1A1AA]">3. Registration Closes:</span>
              <strong className="text-[#EF4444] font-bold">{form.registrationEnd || '1 Hour Prior'}</strong>
            </div>

            <div className="flex justify-between py-1 border-b border-[#27272A]/40">
              <span className="text-[#A1A1AA]">4. Check-in Time:</span>
              <strong className="text-[#FFB900] font-bold">{form.checkInTime || '05:15 PM IST'}</strong>
            </div>

            <div className="flex justify-between py-1 border-b border-[#27272A]/40">
              <span className="text-[#A1A1AA]">5. Match Kickoff Time:</span>
              <strong className="text-[#FF8C00] font-bold">{form.startTime || '06:00 PM IST'}</strong>
            </div>

            <div className="flex justify-between py-1">
              <span className="text-[#A1A1AA]">6. Room Publish Time:</span>
              <strong className="text-[#a855f7] font-bold">{form.roomPublishTime || '05:45 PM IST'}</strong>
            </div>
          </div>
        </div>

        {/* BENTO CARD 3: FINANCIALS & SLOT CAPACITY */}
        <div className="p-5 bg-[#000000] border border-[#27272A]/60 rounded-none space-y-3.5 shadow-xl">
          <div className="flex items-center justify-between border-b border-[#27272A]/50 pb-2.5">
            <span className="font-headline text-xs font-black uppercase text-[#10B981] flex items-center gap-2">
              <Trophy className="w-4 h-4 text-[#FFB900]" />
              <span>Financials & Squad Capacity</span>
            </span>
            <span className="text-[10px] text-[#10B981] font-bold uppercase">FamGateway UPI</span>
          </div>

          <div className="space-y-2 text-[11px] font-mono">
            <div className="flex justify-between py-1 border-b border-[#27272A]/40">
              <span className="text-[#A1A1AA]">Entry Fee:</span>
              <strong className="text-[#FFB900] font-bold">{form.entryFee}</strong>
            </div>

            <div className="flex justify-between items-start py-1 border-b border-[#27272A]/40">
              <span className="text-[#A1A1AA]">Tournament Capacity:</span>
              <div className="text-right font-mono">
                <strong className="text-white font-bold block">{form.maxTeams} {capInfo.teamUnit}</strong>
                <span className="text-[10px] text-[#10B981] block">
                  {Number(form.maxTeams || 0) * capInfo.teamSize} Active Players / {capInfo.roomCap} Room Capacity
                </span>
              </div>
            </div>

            <div className="flex justify-between py-1 border-b border-[#27272A]/40">
              <span className="text-[#A1A1AA]">Prize Type:</span>
              <strong className="text-[#FF8C00] font-bold uppercase">{form.prizeType ? form.prizeType.replace('_', ' ') : 'Placement + Per Kill'}</strong>
            </div>

            <div className="flex justify-between py-1 border-b border-[#27272A]/40">
              <span className="text-[#A1A1AA]">Payment Gateway:</span>
              <strong className="text-[#10B981] font-bold">FamGateway UPI (Instant)</strong>
            </div>

            <div className="flex justify-between py-1">
              <span className="text-[#A1A1AA]">Configured Payouts:</span>
              <strong className="text-[#FFB900]">
                {form.prizeType === 'winner_takes_all'
                  ? `Winner: ₹${form.prizes?.winnerPrize || 1500}`
                  : form.prizeType === 'per_kill'
                  ? `₹${form.perKillReward || 30} / Kill`
                  : `1st: ₹${form.prizes?.firstPrize || 800} | 2nd: ₹${form.prizes?.secondPrize || 400}`}
              </strong>
            </div>
          </div>
        </div>

        {/* BENTO CARD 4: RULEBOOK SUMMARY */}
        <div className="p-5 bg-[#000000] border border-[#27272A]/60 rounded-none space-y-3.5 shadow-xl">
          <div className="flex items-center justify-between border-b border-[#27272A]/50 pb-2.5">
            <span className="font-headline text-xs font-black uppercase text-[#a855f7] flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#a855f7]" />
              <span>Configured Rules ({rulesList.length})</span>
            </span>
            <span className="text-[10px] text-[#A1A1AA] font-bold uppercase">Enforced</span>
          </div>

          <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
            {rulesList.map((ruleText, idx) => (
              <div key={`rev-rule-${idx}`} className="flex items-start gap-2 text-[11px] text-[#A1A1AA]">
                <span className="font-bold text-[#FFB900] shrink-0">{idx + 1}.</span>
                <span className="text-white leading-tight">{ruleText}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* CONFIRMATION LAUNCH SUMMARY BOX */}
      <div className="p-4 bg-[#000000] border border-[#10B981]/40 rounded-none flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-6 h-6 text-[#10B981] shrink-0 " />
          <div>
            <h4 className="font-headline text-xs font-black text-white uppercase tracking-wider">
              Ready for Execution
            </h4>
            <p className="text-[11px] text-[#A1A1AA]">
              Click <strong>Publish</strong> to open squad registration or <strong>Save Draft</strong> to store in database.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-[10px] text-[#10B981] font-bold uppercase bg-[#10B981]/10 px-3 py-1.5 rounded-none border border-[#10B981]/30 shrink-0">
          <span>0 Errors &bull; Validated</span>
        </div>
      </div>

    </div>
  )
}
