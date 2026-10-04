import React from 'react'
import {
  Shield,
  Crown,
  Users,
  UserPlus,
  Settings,
  LogOut,
  Sparkles,
  CheckCircle2,
  Radio,
  Clock,
} from 'lucide-react'

/**
 * Hero summary card displaying squad identity, captaincy, capacity, recruitment state, and core CTAs.
 */
export default function TeamOverviewCard({
  team,
  membersCount = 1,
  isCaptain = false,
  onOpenSettings,
  onOpenInvite,
  onLeaveTeam,
}) {
  if (!team) return null

  const maxMembers = team.max_members || 6
  const isFull = membersCount >= maxMembers
  const isRecruiting = team.is_recruiting !== false
  const logoUrl = team.logo_url || null
  const tag = team.tag || team.name?.substring(0, 3).toUpperCase() || 'SQD'

  return (
    <section
      aria-label="Squad Overview"
      className="relative rounded-2xl bg-gradient-to-b from-[#0e1017] to-[#0a0b10] border border-[#1f2230] p-4 sm:p-6 shadow-[0_4px_30px_rgba(0,0,0,0.6)] overflow-hidden"
    >
      {/* Background Cyber Grid Accent */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: 'radial-gradient(#00f2ff 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />
      <div className="absolute top-0 right-0 w-72 h-36 bg-[#00f2ff]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5 sm:gap-6">
        {/* Left: Squad Identity & Badges */}
        <div className="flex items-start sm:items-center gap-4 sm:gap-5">
          {/* Logo / Emblem */}
          <div className="relative shrink-0">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={`${team.name} emblem`}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-[#00f2ff]/40 shadow-[0_0_20px_rgba(0,242,255,0.2)] bg-[#141416]"
                onError={(e) => {
                  e.target.style.display = 'none'
                  e.target.nextSibling.style.display = 'flex'
                }}
              />
            ) : null}
            <div
              style={{ display: logoUrl ? 'none' : 'flex' }}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-[#00f2ff]/20 via-[#0e1017] to-[#141416] border-2 border-[#00f2ff]/40 shadow-[0_0_20px_rgba(0,242,255,0.2)] items-center justify-center text-[#00f2ff] font-headline font-black text-xl sm:text-2xl tracking-wider uppercase"
            >
              {tag.slice(0, 3)}
            </div>
            {/* Online/Verified Node */}
            <div
              className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#0e1017] border-2 border-[#00f2ff] flex items-center justify-center text-[#00f2ff]"
              title="Verified Free Fire MAX Squad"
            >
              <Shield className="w-2.5 h-2.5" />
            </div>
          </div>

          {/* Details */}
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-headline font-black text-white tracking-wide truncate">
                {team.name}
              </h1>
              <span className="px-2 py-0.5 rounded-md bg-[#00f2ff]/10 border border-[#00f2ff]/30 text-[#00f2ff] font-mono text-xs sm:text-sm font-bold uppercase tracking-wider">
                [{tag}]
              </span>
            </div>

            {team.description ? (
              <p className="text-xs sm:text-sm text-[#b9cacb] line-clamp-2 max-w-xl font-body">
                {team.description}
              </p>
            ) : (
              <p className="text-xs text-[#849495] italic">No squad motto configured yet.</p>
            )}

            {/* Badges Row */}
            <div className="flex items-center gap-2.5 sm:gap-3.5 flex-wrap pt-1 text-xs">
              {/* Captain */}
              <div className="flex items-center gap-1.5 text-[#e5e2e3]">
                <Crown className="w-3.5 h-3.5 text-[#fed83a]" />
                <span className="text-[#849495]">Captain:</span>
                <span className="font-headline font-semibold text-white">{team.captain_name || 'Captain'}</span>
              </div>

              {/* Roster Capacity */}
              <div className="flex items-center gap-1.5 text-[#e5e2e3]">
                <Users className="w-3.5 h-3.5 text-[#00f2ff]" />
                <span className="text-[#849495]">Roster:</span>
                <span className="font-mono font-bold text-white">
                  {membersCount} / {maxMembers}
                </span>
              </div>

              {/* Recruitment Status */}
              <div>
                {isRecruiting && !isFull ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/30 text-[11px] font-headline font-bold uppercase tracking-wider">
                    <Radio className="w-2.5 h-2.5 animate-pulse text-[#10b981]" />
                    <span>Recruiting Open</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-800/60 text-[#849495] border border-zinc-700/50 text-[11px] font-headline font-bold uppercase tracking-wider">
                    <span>{isFull ? 'Roster Full' : 'Recruiting Closed'}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap pt-2 md:pt-0">
          {isCaptain ? (
            <>
              <button
                type="button"
                onClick={onOpenSettings}
                className="flex-1 sm:flex-none min-h-[44px] px-4 py-2 rounded-xl bg-[#141416] border border-[#27272a] text-[#e5e2e3] hover:text-white hover:border-[#00f2ff]/40 text-xs font-headline font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
              >
                <Settings className="w-4 h-4 text-[#00f2ff]" />
                <span>Squad Settings</span>
              </button>

              <button
                type="button"
                onClick={onOpenInvite}
                disabled={isFull}
                title={isFull ? 'Squad roster has reached maximum capacity (6/6)' : 'Invite player'}
                className="flex-1 sm:flex-none min-h-[44px] px-5 py-2 rounded-xl bg-[#00f2ff] text-[#00363a] hover:bg-[#74f5ff] text-xs font-headline font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(0,242,255,0.25)] active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none"
              >
                <UserPlus className="w-4 h-4" />
                <span>Invite Player</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onLeaveTeam}
              className="w-full sm:w-auto min-h-[44px] px-4 py-2 rounded-xl bg-red-950/20 border border-red-500/30 text-red-300 hover:bg-red-950/40 hover:text-white text-xs font-headline font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
            >
              <LogOut className="w-4 h-4 text-red-400" />
              <span>Leave Squad</span>
            </button>
          )}
        </div>
      </div>
    </section>
  )
}
