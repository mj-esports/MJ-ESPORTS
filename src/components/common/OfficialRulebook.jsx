import React, { useState } from 'react'
import { ShieldAlert, BookOpen, ExternalLink, X, CheckCircle2, Shield } from 'lucide-react'

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

const STANDARD_RULE_METADATA = {
  'No emulators allowed.': {
    title: 'No Emulators Allowed',
    tag: 'ZERO TOLERANCE',
    tagType: 'critical',
    desc: 'Touchscreen mobile devices only (Android & iOS). No emulators allowed; any emulator usage (Bluestacks, LDPlayer, Nox) triggers immediate automated detection and hardware ban.',
  },
  'Screen recording is mandatory.': {
    title: 'Screen Recording is Mandatory',
    tag: 'POV REQUIRED',
    tagType: 'cyan',
    desc: 'Screen recording is mandatory for at least one player per squad (preferably IGL), capturing continuous POV device recording from pre-lobby spawn island until match conclusion.',
  },
  'No hacks or third-party tools.': {
    title: 'No Hacks or Third-Party Tools',
    tag: 'HARDWARE BAN',
    tagType: 'critical',
    desc: 'No hacks or third-party tools permitted. Script injection, game file modifications, crosshair overlays, auto-aim/recoil scripts, or speed mods result in lifetime platform blacklisting and prize forfeiture.',
  },
  'No teaming.': {
    title: 'No Teaming or Collision',
    tag: 'DISQUALIFICATION',
    tagType: 'critical',
    desc: 'No teaming allowed. Cross-squad communication, passive pacts, or feed-killing between opposing teams will lead to instant disqualification of both squads.',
  },
  'Toxic behaviour results in immediate disqualification.': {
    title: 'Code of Conduct & Sportsmanship',
    tag: 'DISQUALIFICATION',
    tagType: 'critical',
    desc: 'Toxic behaviour results in immediate disqualification. Hate speech, abusive language, stream sniping, or hostile unsportsmanlike conduct in match lobbies will not be tolerated.',
  },
  'Join the room before the scheduled start time.': {
    title: 'Punctuality & Lobby Check-in',
    tag: 'TIMELINE CRITICAL',
    tagType: 'secondary',
    desc: 'Join the room before the scheduled start time. Captains and confirmed players must enter their assigned slot punctually. Unclaimed slots roll over to waitlisted squads at cutoff.',
  },
  'Room ID & Password must not be shared.': {
    title: 'Credential Confidentiality',
    tag: 'SECURITY PROTOCOL',
    tagType: 'cyan',
    desc: 'Room ID & Password must not be shared outside confirmed squad rosters. Leaking custom room credentials to unauthorized participants results in immediate forfeit and team sanction.',
  },
  'Internet issues are the player\'s responsibility.': {
    title: 'Connectivity & Hardware Liability',
    tag: 'PLAYER LIABILITY',
    tagType: 'slate',
    desc: 'Internet issues are the player\'s responsibility. Personal latency spikes, carrier disconnects, or device crashes will not cause match remakes or schedule delays.',
  },
  'Tournament admin decisions are final.': {
    title: 'Arbiter Authority & Match Disputes',
    tag: 'FINAL ARBITRATION',
    tagType: 'cyan',
    desc: 'Tournament admin decisions are final in all competitive rulings. Official dispute tickets must be logged within 15 minutes of match conclusion with POV video proof.',
  },
  'Cheating may result in permanent account suspension.': {
    title: 'Anti-Cheat Enforcement & Penalties',
    tag: 'PERMANENT BAN',
    tagType: 'critical',
    desc: 'Cheating may result in permanent account suspension across the MJ ESPORTS competitive circuit, complete forfeiture of prize disbursements, and profile blacklisting.',
  },
}

function getRuleMeta(ruleText) {
  if (!ruleText || typeof ruleText !== 'string') return null
  const clean = ruleText.trim()
  if (STANDARD_RULE_METADATA[clean]) return STANDARD_RULE_METADATA[clean]
  const cleanWithoutDot = clean.endsWith('.') ? clean.slice(0, -1) : clean + '.'
  if (STANDARD_RULE_METADATA[cleanWithoutDot]) return STANDARD_RULE_METADATA[cleanWithoutDot]
  return null
}

function formatRuleItem(rule, idx) {
  if (typeof rule === 'string') {
    const meta = getRuleMeta(rule)
    if (meta) {
      return {
        id: idx + 1,
        title: meta.title,
        rawText: rule,
        tag: meta.tag,
        tagType: meta.tagType,
        description: meta.desc,
      }
    }
    return {
      id: idx + 1,
      title: rule,
      rawText: rule,
      tag: idx === 0 ? 'ZERO TOLERANCE' : idx === 1 ? 'POV REQUIRED' : 'ENFORCED',
      tagType: idx === 0 ? 'critical' : 'cyan',
      description: rule,
    }
  }

  if (typeof rule === 'object' && rule !== null) {
    return {
      id: idx + 1,
      title: rule.title || rule.name || `Rule ${idx + 1}`,
      rawText: rule.description || rule.text || rule.title || '',
      tag: rule.tag || rule.badge || 'ENFORCED',
      tagType: rule.tagType || 'cyan',
      description: rule.description || rule.text || '',
    }
  }

  const str = String(rule || '')
  return {
    id: idx + 1,
    title: str,
    rawText: str,
    tag: 'ENFORCED',
    tagType: 'cyan',
    description: str,
  }
}

function getTagBadgeClass(tagType) {
  switch (tagType) {
    case 'critical':
      return 'bg-red-500/10 border-red-500/30 text-red-400'
    case 'secondary':
    case 'orange':
    case 'amber':
      return 'bg-[#ff5e07]/10 border-[#ff5e07]/30 text-[#ff5e07]'
    case 'slate':
      return 'bg-slate-800/80 border-slate-700 text-slate-300'
    case 'emerald':
    case 'green':
      return 'bg-[#10b981]/10 border-[#10b981]/30 text-[#10b981]'
    case 'cyan':
    default:
      return 'bg-[#00f2ff]/10 border-[#00f2ff]/30 text-[#00f2ff]'
  }
}

export default function OfficialRulebook({ rules = OFFICIAL_MJ_RULES }) {
  const [showModal, setShowModal] = useState(false)
  const displayRules = Array.isArray(rules) && rules.length > 0 ? rules : OFFICIAL_MJ_RULES

  return (
    <div className="space-y-3 sm:space-y-4 font-mono text-xs w-full max-w-full">
      {/* 1. RULEBOOK HEADER & METADATA BAR */}
      <section className="p-3.5 sm:p-4 bg-[#141416] rounded-xl border border-[#27272a] flex flex-col gap-2.5 relative shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#00f2ff]/10 border border-[#00f2ff]/30 flex items-center justify-center text-[#00f2ff] shrink-0">
              <ShieldAlert className="w-4 h-4 text-[#00f2ff]" />
            </div>
            <div className="min-w-0">
              <h3 className="font-headline text-xs sm:text-sm text-white font-bold tracking-wide uppercase truncate">
                Official Tournament Rulebook
              </h3>
              <span className="font-mono text-[10px] sm:text-[11px] text-[#849495] block truncate">
                DOC-ID: #RULE-FFMAX-2026 // ARBITER ENFORCED
              </span>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded bg-[#00f2ff]/10 text-[#00f2ff] border border-[#00f2ff]/30 text-[9px] sm:text-[10px] font-mono font-bold uppercase tracking-wider shrink-0">
            Standard Policy
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 pt-2 border-t border-[#27272a]/60">
          <span className="px-2 py-0.5 rounded bg-[#1c1b1c] border border-[#27272a] font-mono text-[9px] text-[#00dbe7] uppercase tracking-wider font-semibold">
            VERSION 4.2 // READ-ONLY
          </span>
          <span className="px-2 py-0.5 rounded bg-[#1c1b1c] border border-[#27272a] font-mono text-[9px] text-[#ff5e07] font-semibold uppercase tracking-wider">
            ARBITER ENFORCED
          </span>
          <span className="px-2 py-0.5 rounded bg-[#1c1b1c] border border-[#27272a] font-mono text-[9px] text-[#10b981] font-semibold uppercase tracking-wider flex items-center gap-1">
            <CheckCircle2 className="w-2.5 h-2.5 text-[#10b981]" />
            ZERO TOLERANCE
          </span>
        </div>
      </section>

      {/* 2. INTRO BRIEFING */}
      <section className="px-3.5 py-3 bg-[#0e0e10] rounded-xl border-l-2 border-[#00f2ff] border-y border-r border-[#27272a]">
        <p className="font-body text-xs text-[#b9cacb] leading-relaxed">
          All registered combatants and squad captains must adhere to the standardized Free Fire MAX competitive arbiter protocol. Infractions result in immediate disqualification and competitive suspension.
        </p>
      </section>

      {/* 3. COMPACT NUMBERED RULE CARDS (Preview of Top Rules) */}
      <div className="flex flex-col gap-2.5">
        {displayRules.slice(0, 5).map((rule, idx) => {
          const item = formatRuleItem(rule, idx)
          return (
            <article
              key={`rule-card-${idx}`}
              className="bg-[#141416] rounded-xl border border-[#27272a] p-3 sm:p-3.5 transition-colors hover:border-[#00f2ff]/40 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <span className="px-2 py-1 rounded-lg bg-[#00f2ff]/10 border border-[#00f2ff]/30 text-[#00f2ff] font-mono text-[12px] sm:text-[13px] font-bold tracking-tight shrink-0">
                  {String(item.id).padStart(2, '0')}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                    <h4 className="font-headline text-xs sm:text-sm text-white font-bold leading-tight">
                      {item.title}
                    </h4>
                    <span className={`px-1.5 py-0.5 rounded font-mono text-[9px] font-bold uppercase tracking-wider border ${getTagBadgeClass(item.tagType)}`}>
                      {item.tag}
                    </span>
                  </div>
                  <p className="font-body text-xs text-[#b9cacb] leading-relaxed">
                    {item.description || item.rawText}
                  </p>
                </div>
              </div>
            </article>
          )
        })}
      </div>

      {/* 4. BOTTOM RULEBOOK ACTION & FOOTER ENFORCEMENT CARD */}
      <section className="bg-[#1c1b1c] border border-[#27272a] rounded-xl p-3.5 sm:p-4 flex flex-col gap-3 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-[#10b981]" />
            <span className="font-mono text-[11px] sm:text-xs uppercase text-white tracking-wider font-bold">
              {displayRules.length} Official Guidelines Enforced
            </span>
          </div>
          <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
        </div>

        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="w-full h-11 bg-[#00f2ff] hover:bg-[#00dbe7] text-black font-headline text-xs sm:text-[13px] font-extrabold uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 active:scale-98 transition-all duration-100 shadow-[0_0_15px_rgba(0,242,255,0.25)] cursor-pointer min-h-[44px]"
        >
          <BookOpen className="w-4 h-4 text-black" />
          <span>View Full Rulebook</span>
          <ExternalLink className="w-3.5 h-3.5 text-black/70" />
        </button>

        <div className="p-2.5 bg-[#0e0e10] rounded-lg border border-[#27272a] flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 text-[#849495] shrink-0 mt-0.5" />
          <p className="font-mono text-[11px] text-[#849495] leading-tight">
            Dispute arbitration tickets must be logged within 15 minutes of match conclusion with POV evidence.
          </p>
        </div>
      </section>

      {/* 5. READ-ONLY FULL RULEBOOK MODAL */}
      {showModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="rulebook-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn"
        >
          <div className="bg-[#141416] border border-[#27272a] rounded-2xl max-w-xl w-full p-4 sm:p-6 space-y-4 shadow-[0_0_50px_rgba(0,242,255,0.15)] relative max-h-[88vh] overflow-y-auto">
            
            {/* Modal Close Button */}
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-2 rounded-xl bg-[#1c1b1c] border border-[#27272a] text-[#849495] hover:text-[#00f2ff] hover:border-[#00f2ff]/40 cursor-pointer transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
              title="Close rulebook"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Modal Header */}
            <div className="space-y-1 border-b border-[#27272a] pb-3 pr-10">
              <div className="flex items-center gap-2 text-[#00f2ff]">
                <ShieldAlert className="w-5 h-5 text-[#00f2ff]" />
                <h3 id="rulebook-modal-title" className="font-headline text-sm sm:text-base font-bold text-white uppercase tracking-wider">
                  Official MJ ESPORTS Tournament Rulebook
                </h3>
              </div>
              <p className="text-xs text-[#849495] font-body">
                Read-only official match rules enforced for all players and teams.
              </p>
            </div>

            {/* All Numbered Rules List */}
            <div className="space-y-2.5">
              {displayRules.map((rule, idx) => {
                const item = formatRuleItem(rule, idx)
                return (
                  <div
                    key={`modal-rule-${idx}`}
                    className="flex items-start gap-3 p-3 bg-[#1c1b1c] border border-[#27272a] rounded-xl hover:border-[#00f2ff]/30 transition-colors"
                  >
                    <span className="w-6 h-6 rounded-lg bg-[#201f20] border border-[#00f2ff]/40 flex items-center justify-center font-mono font-black text-xs text-[#00f2ff] shrink-0 mt-0.5 shadow-[0_0_8px_rgba(0,242,255,0.1)]">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                        <h5 className="font-headline text-xs sm:text-sm text-white font-bold leading-tight">
                          {item.title}
                        </h5>
                        <span className={`px-1.5 py-0.5 rounded font-mono text-[9px] font-bold uppercase tracking-wider border ${getTagBadgeClass(item.tagType)}`}>
                          {item.tag}
                        </span>
                      </div>
                      <p className="text-xs text-[#b9cacb] font-body leading-relaxed">
                        {item.description || item.rawText}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-[#27272a] flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-[#10b981] font-mono text-[11px] font-bold uppercase">
                <CheckCircle2 className="w-4 h-4 text-[#10b981]" />
                <span>Fair Play Enforcement Active</span>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-5 py-2.5 bg-[#00f2ff] hover:bg-[#00dbe7] text-black font-headline font-extrabold text-xs uppercase rounded-xl transition-all cursor-pointer min-h-[38px] shadow-sm"
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
