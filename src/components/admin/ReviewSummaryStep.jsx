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

export default function ReviewSummaryStep({ form }) {
  const rulesList = form.rulesText
    ? form.rulesText.split('\n').filter(Boolean)
    : ['No emulators allowed.', 'Screen recording mandatory.']

  return (
    <div className="space-y-6 text-white font-mono text-xs">
      
      {/* HEADER BANNER NOTICE */}
      <div className="p-4 bg-[#00f2ff]/10 border border-[#00f2ff]/30 rounded-2xl flex items-center justify-between shadow-[0_0_20px_rgba(0,242,255,0.08)]">
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-[#00f2ff] animate-pulse" />
          <div>
            <h3 className="font-headline text-sm font-black uppercase text-white tracking-wider">
              Step 4: Final Configuration Review & Pre-Launch Audit
            </h3>
            <p className="text-[11px] text-[#8e9dae] mt-0.5">
              Review all tournament parameters below before clicking <strong>Publish</strong> or <strong>Save Draft</strong>.
            </p>
          </div>
        </div>
        <span className="px-3 py-1 rounded-full text-[10px] font-extrabold bg-[#00ff9d]/10 text-[#00ff9d] border border-[#00ff9d]/40 uppercase tracking-widest hidden sm:inline-block">
          Audit Verified
        </span>
      </div>

      {/* SECTION 1: TITLE & VISUAL BANNER CARD */}
      <div className="bg-[#07090c] border border-[#3a494b]/60 rounded-2xl overflow-hidden shadow-2xl">
        
        {/* Banner Image Preview Header */}
        <div className="relative h-40 sm:h-48 bg-[#151a21] overflow-hidden flex items-center justify-center border-b border-[#3a494b]/60">
          {form.bannerUrl ? (
            <img
              src={form.bannerUrl}
              alt="Tournament Banner Preview"
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.style.display = 'none'
              }}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-r from-[#07090c] via-[#151a21] to-[#07090c] flex flex-col items-center justify-center p-6 text-center space-y-2">
              <Gamepad2 className="w-10 h-10 text-[#00f2ff]/40" />
              <span className="text-xs font-bold text-[#8e9dae] uppercase tracking-wider">
                Default Cyberpunk Visual Banner Active
              </span>
            </div>
          )}

          {/* Floating Badges */}
          <div className="absolute top-4 left-4 flex flex-wrap gap-2 z-10">
            <span className="px-3 py-1 rounded-full text-[10px] font-extrabold bg-black/80 text-[#00f2ff] border border-[#00f2ff]/50 uppercase backdrop-blur-md">
              {form.game}
            </span>
            <span className="px-3 py-1 rounded-full text-[10px] font-extrabold bg-black/80 text-[#00ff9d] border border-[#00ff9d]/50 uppercase backdrop-blur-md">
              {form.mode.toUpperCase()} MODE
            </span>
          </div>

          <div className="absolute bottom-4 right-4 z-10">
            <span className="px-3 py-1 rounded-full text-[10px] font-extrabold bg-black/80 text-[#fe6b00] border border-[#fe6b00]/50 uppercase backdrop-blur-md">
              Status: {form.status || 'Registration Open'}
            </span>
          </div>
        </div>

        {/* Title & Details Body */}
        <div className="p-5 space-y-2">
          <span className="text-[10px] font-bold text-[#8e9dae] uppercase tracking-widest block">
            Official Tournament Title
          </span>
          <h2 className="font-display-lg text-xl sm:text-2xl font-black text-white uppercase italic tracking-tight">
            {form.title || 'Untitled Cyberpunk Tournament'}
          </h2>
          <p className="text-xs text-[#8e9dae] leading-relaxed pt-1">
            {form.description || 'Official high-stakes esports tournament hosted on MJ ESPORTS.'}
          </p>
        </div>
      </div>

      {/* SECTION 2: BENTO SUMMARY GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* BENTO CARD 1: GAME & TACTICAL PARAMETERS */}
        <div className="p-5 bg-[#07090c] border border-[#3a494b]/60 rounded-2xl space-y-3.5 shadow-xl">
          <div className="flex items-center justify-between border-b border-[#3a494b]/50 pb-2.5">
            <span className="font-headline text-xs font-black uppercase text-[#00f2ff] flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#00f2ff]" />
              <span>Game & Tactical Presets</span>
            </span>
            <span className="text-[10px] text-[#8e9dae] font-bold uppercase">{form.game}</span>
          </div>

          <div className="space-y-2.5 text-xs font-mono">
            <div className="flex justify-between py-1 border-b border-[#3a494b]/40">
              <span className="text-[#8e9dae]">Match Map:</span>
              <strong className="text-white font-bold">{form.game === 'Free Fire' ? form.ffMap : form.bgmiMap}</strong>
            </div>

            {form.game === 'Free Fire' ? (
              <>
                <div className="flex justify-between py-1 border-b border-[#3a494b]/40">
                  <span className="text-[#8e9dae]">Gun Attributes:</span>
                  <strong className="text-[#00ff9d]">{form.ffGunAttributes}</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-[#3a494b]/40">
                  <span className="text-[#8e9dae]">Character Skills:</span>
                  <strong className="text-[#00f2ff]">{form.ffCharacterSkills}</strong>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between py-1 border-b border-[#3a494b]/40">
                  <span className="text-[#8e9dae]">Camera Perspective:</span>
                  <strong className="text-[#00ff9d]">{form.bgmiPerspective}</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-[#3a494b]/40">
                  <span className="text-[#8e9dae]">Red Zone:</span>
                  <strong className="text-[#fe6b00]">{form.bgmiRedZone}</strong>
                </div>
              </>
            )}

            <div className="flex justify-between py-1">
              <span className="text-[#8e9dae]">Required Players / Squad:</span>
              <strong className="text-[#00f2ff]">
                {form.mode === 'solo' ? '1 Player (Solo)' : form.mode === 'duo' ? '2 Players (Duo)' : '4 Players (Squad)'}
              </strong>
            </div>
          </div>
        </div>

        {/* BENTO CARD 2: SCHEDULE & TIMELINE SUMMARY */}
        <div className="p-5 bg-[#07090c] border border-[#3a494b]/60 rounded-2xl space-y-3.5 shadow-xl">
          <div className="flex items-center justify-between border-b border-[#3a494b]/50 pb-2.5">
            <span className="font-headline text-xs font-black uppercase text-[#fe6b00] flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#fe6b00]" />
              <span>Schedule & Match Kickoff</span>
            </span>
            <span className="text-[10px] text-[#8e9dae] font-bold uppercase">IST Timing</span>
          </div>

          <div className="space-y-2.5 text-xs font-mono">
            <div className="flex justify-between py-1 border-b border-[#3a494b]/40">
              <span className="text-[#8e9dae]">Start Date:</span>
              <strong className="text-white font-bold">{form.startDate || 'Not Set'}</strong>
            </div>

            <div className="flex justify-between py-1 border-b border-[#3a494b]/40">
              <span className="text-[#8e9dae]">Start Time:</span>
              <strong className="text-[#fe6b00] font-bold">{form.startTime || '06:00 PM IST'}</strong>
            </div>

            <div className="flex justify-between py-1 border-b border-[#3a494b]/40">
              <span className="text-[#8e9dae]">Check-in Window:</span>
              <strong className="text-[#00f2ff]">45 Mins Prior</strong>
            </div>

            <div className="flex justify-between py-1">
              <span className="text-[#8e9dae]">Room Pass Release:</span>
              <strong className="text-[#a855f7]">15 Mins Prior</strong>
            </div>
          </div>
        </div>

        {/* BENTO CARD 3: FINANCIALS & SLOT CAPACITY */}
        <div className="p-5 bg-[#07090c] border border-[#3a494b]/60 rounded-2xl space-y-3.5 shadow-xl">
          <div className="flex items-center justify-between border-b border-[#3a494b]/50 pb-2.5">
            <span className="font-headline text-xs font-black uppercase text-[#00ff9d] flex items-center gap-2">
              <Trophy className="w-4 h-4 text-[#ffd700]" />
              <span>Financials & Slot Capacity</span>
            </span>
            <span className="text-[10px] text-[#8e9dae] font-bold uppercase">Validated</span>
          </div>

          <div className="space-y-2.5 text-xs font-mono">
            <div className="flex justify-between py-1 border-b border-[#3a494b]/40">
              <span className="text-[#8e9dae]">Total Prize Pool:</span>
              <strong className="text-[#ffd700] font-extrabold text-sm">{form.prizePool}</strong>
            </div>

            <div className="flex justify-between py-1 border-b border-[#3a494b]/40">
              <span className="text-[#8e9dae]">Entry Fee:</span>
              <strong className="text-[#00f2ff] font-bold">{form.entryFee}</strong>
            </div>

            <div className="flex justify-between py-1">
              <span className="text-[#8e9dae]">Max Squad Slots:</span>
              <strong className="text-white font-bold">{form.maxTeams} Slots</strong>
            </div>
          </div>
        </div>

        {/* BENTO CARD 4: RULEBOOK SUMMARY */}
        <div className="p-5 bg-[#07090c] border border-[#3a494b]/60 rounded-2xl space-y-3.5 shadow-xl">
          <div className="flex items-center justify-between border-b border-[#3a494b]/50 pb-2.5">
            <span className="font-headline text-xs font-black uppercase text-[#a855f7] flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#a855f7]" />
              <span>Configured Rules ({rulesList.length})</span>
            </span>
            <span className="text-[10px] text-[#8e9dae] font-bold uppercase">Enforced</span>
          </div>

          <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
            {rulesList.map((ruleText, idx) => (
              <div key={`rev-rule-${idx}`} className="flex items-start gap-2 text-[11px] text-[#8e9dae]">
                <span className="font-bold text-[#00f2ff] shrink-0">{idx + 1}.</span>
                <span className="text-white leading-tight">{ruleText}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* CONFIRMATION LAUNCH SUMMARY BOX */}
      <div className="p-4 bg-[#07090c] border border-[#00ff9d]/40 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-6 h-6 text-[#00ff9d] shrink-0 shadow-[0_0_10px_#00ff9d]" />
          <div>
            <h4 className="font-headline text-xs font-black text-white uppercase tracking-wider">
              Ready for Execution
            </h4>
            <p className="text-[11px] text-[#8e9dae]">
              Click <strong>Publish</strong> to open squad registration or <strong>Save Draft</strong> to store in local memory.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-[10px] text-[#00ff9d] font-bold uppercase bg-[#00ff9d]/10 px-3 py-1.5 rounded-lg border border-[#00ff9d]/30 shrink-0">
          <span>0 Errors &bull; Local State Sync</span>
        </div>
      </div>

    </div>
  )
}
