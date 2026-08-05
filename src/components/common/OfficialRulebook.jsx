import React, { useState } from 'react'
import { ShieldAlert, BookOpen, ExternalLink, X, CheckCircle2 } from 'lucide-react'

export const OFFICIAL_MJ_RULES = [
  'No emulators allowed.',
  'Screen recording is mandatory.',
  'No hacks or third-party tools.',
  'No teaming.',
  'Toxic behaviour results in immediate disqualification.',
  'Join the room before the scheduled start time.',
  'Room ID & Password must not be shared.',
  'Internet issues are the player\'s responsibility.',
  'Tournament admin decisions are final.',
  'Cheating may result in permanent account suspension.',
]

export default function OfficialRulebook({ rules = OFFICIAL_MJ_RULES }) {
  const [showModal, setShowModal] = useState(false)
  const displayRules = Array.isArray(rules) && rules.length > 0 ? rules : OFFICIAL_MJ_RULES

  return (
    <div className="bg-[#0b0e14] p-5 rounded-2xl border border-[#00f2ff]/30 shadow-[0_0_20px_rgba(0,242,255,0.05)] space-y-4 text-white font-mono text-xs">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#3a494b]/50 pb-3">
        <div className="flex items-center gap-2 text-[#00f2ff]">
          <ShieldAlert className="w-4.5 h-4.5" />
          <h3 className="font-headline text-xs font-black uppercase tracking-wider text-white">
            Official Tournament Rulebook (V1 Read-Only)
          </h3>
        </div>
        <span className="px-2.5 py-1 rounded bg-[#00f2ff]/10 text-[#00f2ff] border border-[#00f2ff]/30 text-[10px] font-bold uppercase tracking-wider">
          Standard Policy
        </span>
      </div>

      {/* Card Preview of Rules */}
      <div className="space-y-2">
        <p className="text-[11px] text-[#8e9dae] leading-relaxed">
          All registered participants must adhere strictly to the official MJ ESPORTS tournament rules & fair play policy.
        </p>

        <div className="space-y-2 pt-1">
          {displayRules.slice(0, 4).map((ruleText, idx) => (
            <div
              key={`card-rule-${idx}`}
              className="flex items-center gap-3 p-2.5 bg-[#151a21] border border-[#3a494b]/60 rounded-xl"
            >
              <span className="w-5 h-5 rounded-lg bg-[#07090c] border border-[#3a494b]/60 flex items-center justify-center font-mono font-bold text-[10px] text-[#00f2ff] shrink-0">
                {idx + 1}
              </span>
              <span className="text-xs text-white font-medium leading-tight">
                {ruleText}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Button to open full rulebook modal */}
      <div className="pt-2 border-t border-[#3a494b]/40 flex items-center justify-between">
        <span className="text-[10px] text-[#8e9dae] font-semibold uppercase">
          {displayRules.length} Official Guidelines Enforced
        </span>

        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-[#151a21] hover:bg-[#00f2ff]/20 border border-[#3a494b] hover:border-[#00f2ff]/50 text-[#00f2ff] hover:text-white font-extrabold text-xs uppercase rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-md"
        >
          <BookOpen className="w-4 h-4 text-[#00f2ff]" />
          <span>View Full Rulebook</span>
        </button>
      </div>

      {/* READ-ONLY FULL RULEBOOK MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#151a21] border border-[#00f2ff]/40 rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-[0_0_50px_rgba(0,242,255,0.2)] relative max-h-[88vh] overflow-y-auto">
            
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="absolute top-5 right-5 p-2 rounded-xl bg-[#07090c] border border-[#3a494b] text-[#8e9dae] hover:text-[#00f2ff] cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Modal Title */}
            <div className="space-y-1 border-b border-[#3a494b]/50 pb-3">
              <div className="flex items-center gap-2 text-[#00f2ff]">
                <ShieldAlert className="w-5 h-5 text-[#00f2ff]" />
                <h3 className="font-headline text-base font-black text-white uppercase tracking-wider">
                  Official MJ ESPORTS Tournament Rulebook
                </h3>
              </div>
              <p className="text-xs text-[#8e9dae]">
                Read-only official match rules enforced for all players and teams.
              </p>
            </div>

            {/* Numbered 10 Rules List */}
            <div className="space-y-2.5">
              {displayRules.map((ruleText, idx) => (
                <div
                  key={`modal-rule-${idx}`}
                  className="flex items-start gap-3 p-3 bg-[#07090c] border border-[#3a494b]/60 rounded-xl"
                >
                  <span className="w-6 h-6 rounded-lg bg-[#151a21] border border-[#00f2ff]/40 flex items-center justify-center font-mono font-black text-xs text-[#00f2ff] shrink-0 mt-0.5 shadow-[0_0_10px_rgba(0,242,255,0.1)]">
                    {idx + 1}
                  </span>
                  <span className="text-xs text-white font-medium leading-relaxed pt-0.5">
                    {ruleText}
                  </span>
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-[#3a494b]/50 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-[#00ff9d] text-[11px] font-bold uppercase">
                <CheckCircle2 className="w-4 h-4 text-[#00ff9d]" />
                <span>Fair Play Enforcement Active</span>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-[#00f2ff] hover:bg-[#00d0dd] text-black font-extrabold text-xs uppercase rounded-xl transition-all cursor-pointer"
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
