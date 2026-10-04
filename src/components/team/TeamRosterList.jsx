import React, { useState } from 'react'
import {
  Crown,
  Users,
  Shield,
  Trash2,
  ArrowRightLeft,
  UserCheck,
  Copy,
  Check,
  ChevronDown,
  UserMinus,
  Sparkles,
  Gamepad2,
  Clock,
} from 'lucide-react'

/**
 * Roster display grouping active squad players into Captain, Starters (Members), and Substitutes.
 * Provides management controls to the active Captain with confirmation guards.
 */
export default function TeamRosterList({
  members = [],
  isCaptain = false,
  currentUserId = null,
  onRoleChange,
  onRequestRemove,
  onRequestTransfer,
  actionLoadingId = null,
}) {
  const [copiedUid, setCopiedUid] = useState(null)

  const handleCopyUid = (uid) => {
    if (!uid) return
    navigator.clipboard.writeText(uid)
    setCopiedUid(uid)
    setTimeout(() => setCopiedUid(null), 2000)
  }

  // Partition members
  const captain = members.find((m) => m.role === 'Captain')
  const regularMembers = members.filter((m) => m.role === 'Member')
  const substitutes = members.filter((m) => m.role === 'Substitute')

  const totalFilled = members.length
  const emptySlotsCount = Math.max(0, 6 - totalFilled)

  return (
    <section aria-labelledby="roster-heading" className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#00f2ff]/10 border border-[#00f2ff]/30 flex items-center justify-center text-[#00f2ff]">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h2 id="roster-heading" className="text-base sm:text-lg font-headline font-bold text-white tracking-wide">
              Active Squad Roster
            </h2>
            <p className="text-xs text-[#849495]">6-Player competitive line-up</p>
          </div>
        </div>

        <span className="text-xs font-mono font-bold text-[#00f2ff] bg-[#00f2ff]/10 border border-[#00f2ff]/20 px-2.5 py-1 rounded-lg">
          {totalFilled} / 6 SLOTS
        </span>
      </div>

      {/* Roster Cards Grid */}
      <div className="space-y-3">
        {/* 1. CAPTAIN */}
        {captain && (
          <div className="p-3.5 sm:p-4 rounded-xl bg-gradient-to-r from-[#141416] via-[#121318] to-[#141416] border border-[#fed83a]/40 shadow-[0_2px_15px_rgba(254,216,58,0.06)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 transition-all">
            <div className="flex items-center gap-3 min-w-0">
              {/* Avatar */}
              <div className="relative shrink-0">
                {captain.avatar_url ? (
                  <img
                    src={captain.avatar_url}
                    alt={captain.player_name}
                    className="w-11 h-11 rounded-xl object-cover border border-[#fed83a]/50"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 font-headline font-bold text-sm">
                    {captain.player_name?.slice(0, 2).toUpperCase() || 'CP'}
                  </div>
                )}
                <div
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#fed83a] text-[#3b2f00] flex items-center justify-center shadow-sm"
                  title="Team Captain"
                >
                  <Crown className="w-2.5 h-2.5" />
                </div>
              </div>

              {/* Player Details */}
              <div className="min-w-0 space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-headline font-bold text-white text-sm truncate">
                    {captain.player_name}
                  </span>
                  {currentUserId === captain.user_id && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#00f2ff]/10 text-[#00f2ff] border border-[#00f2ff]/30 font-headline font-bold uppercase">
                      YOU
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-400/15 text-amber-300 border border-amber-400/30 font-headline font-bold uppercase flex items-center gap-1">
                    <Crown className="w-2.5 h-2.5" />
                    <span>Captain</span>
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-[#849495]">
                  <span className="font-mono text-[#b9cacb] flex items-center gap-1">
                    <Gamepad2 className="w-3 h-3 text-[#00f2ff]" />
                    {captain.game_uid || 'UID Pending'}
                  </span>
                  {captain.game_uid && (
                    <button
                      type="button"
                      onClick={() => handleCopyUid(captain.game_uid)}
                      aria-label="Copy Free Fire Character UID"
                      className="p-1 hover:text-white transition-colors"
                    >
                      {copiedUid === captain.game_uid ? (
                        <Check className="w-3 h-3 text-[#10b981]" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-[#849495] shrink-0 self-end sm:self-center">
              <span className="text-[11px] font-mono text-[#849495]">Squad Owner</span>
            </div>
          </div>
        )}

        {/* 2. REGULAR MEMBERS (STARTERS) */}
        {regularMembers.map((member) => {
          const isCaller = currentUserId === member.user_id
          const isOperating = actionLoadingId === member.user_id

          return (
            <div
              key={member.id || member.user_id}
              className="p-3.5 sm:p-4 rounded-xl bg-[#141416] border border-[#27272a] hover:border-[#3a494b] flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 transition-all"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-[#00f2ff]/10 border border-[#00f2ff]/20 flex items-center justify-center text-[#00f2ff] font-headline font-bold text-sm shrink-0">
                  {member.avatar_url ? (
                    <img
                      src={member.avatar_url}
                      alt={member.player_name}
                      className="w-11 h-11 rounded-xl object-cover"
                    />
                  ) : (
                    member.player_name?.slice(0, 2).toUpperCase() || 'MB'
                  )}
                </div>

                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-headline font-bold text-white text-sm truncate">
                      {member.player_name}
                    </span>
                    {isCaller && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#00f2ff]/10 text-[#00f2ff] border border-[#00f2ff]/30 font-headline font-bold uppercase">
                        YOU
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#00f2ff]/10 text-[#00f2ff] border border-[#00f2ff]/30 font-headline font-bold uppercase">
                      Member
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-[#849495]">
                    <span className="font-mono text-[#b9cacb] flex items-center gap-1">
                      <Gamepad2 className="w-3 h-3 text-[#00f2ff]" />
                      {member.game_uid || 'UID Pending'}
                    </span>
                    {member.game_uid && (
                      <button
                        type="button"
                        onClick={() => handleCopyUid(member.game_uid)}
                        aria-label="Copy Free Fire Character UID"
                        className="p-1 hover:text-white transition-colors"
                      >
                        {copiedUid === member.game_uid ? (
                          <Check className="w-3 h-3 text-[#10b981]" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Management Controls */}
              {isCaptain && !isCaller && (
                <div className="flex items-center gap-1.5 flex-wrap self-end sm:self-center">
                  {/* Switch to Substitute */}
                  <button
                    type="button"
                    disabled={isOperating}
                    onClick={() => onRoleChange(member.user_id, 'Substitute')}
                    className="min-h-[38px] px-2.5 py-1.5 rounded-lg bg-[#0e1017] border border-[#27272a] text-[#b9cacb] hover:text-white hover:border-[#00f2ff]/40 text-xs font-headline font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                    title="Change role to Substitute"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5 text-[#00f2ff]" />
                    <span className="hidden md:inline">To Sub</span>
                  </button>

                  {/* Transfer Captaincy */}
                  <button
                    type="button"
                    disabled={isOperating}
                    onClick={() => onRequestTransfer(member)}
                    className="min-h-[38px] px-2.5 py-1.5 rounded-lg bg-[#0e1017] border border-[#27272a] text-[#b9cacb] hover:text-[#fed83a] hover:border-amber-400/40 text-xs font-headline font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                    title="Make Captain"
                  >
                    <Crown className="w-3.5 h-3.5 text-[#fed83a]" />
                    <span className="hidden md:inline">Transfer</span>
                  </button>

                  {/* Remove Player */}
                  <button
                    type="button"
                    disabled={isOperating}
                    onClick={() => onRequestRemove(member)}
                    className="min-h-[38px] px-2.5 py-1.5 rounded-lg bg-red-950/20 border border-red-500/30 text-red-300 hover:text-white hover:bg-red-950/40 text-xs font-headline font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                    title="Remove member from squad"
                  >
                    <UserMinus className="w-3.5 h-3.5 text-red-400" />
                    <span className="hidden md:inline">Remove</span>
                  </button>
                </div>
              )}
            </div>
          )
        })}

        {/* 3. SUBSTITUTES */}
        {substitutes.map((member) => {
          const isCaller = currentUserId === member.user_id
          const isOperating = actionLoadingId === member.user_id

          return (
            <div
              key={member.id || member.user_id}
              className="p-3.5 sm:p-4 rounded-xl bg-[#141416]/90 border border-dashed border-[#27272a] hover:border-[#3a494b] flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 transition-all"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-300 font-headline font-bold text-sm shrink-0">
                  {member.avatar_url ? (
                    <img
                      src={member.avatar_url}
                      alt={member.player_name}
                      className="w-11 h-11 rounded-xl object-cover"
                    />
                  ) : (
                    member.player_name?.slice(0, 2).toUpperCase() || 'SB'
                  )}
                </div>

                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-headline font-bold text-white text-sm truncate">
                      {member.player_name}
                    </span>
                    {isCaller && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#00f2ff]/10 text-[#00f2ff] border border-[#00f2ff]/30 font-headline font-bold uppercase">
                        YOU
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-400/15 text-amber-300 border border-amber-400/30 font-headline font-bold uppercase">
                      Substitute
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-[#849495]">
                    <span className="font-mono text-[#b9cacb] flex items-center gap-1">
                      <Gamepad2 className="w-3 h-3 text-[#00f2ff]" />
                      {member.game_uid || 'UID Pending'}
                    </span>
                    {member.game_uid && (
                      <button
                        type="button"
                        onClick={() => handleCopyUid(member.game_uid)}
                        aria-label="Copy Free Fire Character UID"
                        className="p-1 hover:text-white transition-colors"
                      >
                        {copiedUid === member.game_uid ? (
                          <Check className="w-3 h-3 text-[#10b981]" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Management Controls */}
              {isCaptain && !isCaller && (
                <div className="flex items-center gap-1.5 flex-wrap self-end sm:self-center">
                  {/* Switch to Member */}
                  <button
                    type="button"
                    disabled={isOperating}
                    onClick={() => onRoleChange(member.user_id, 'Member')}
                    className="min-h-[38px] px-2.5 py-1.5 rounded-lg bg-[#0e1017] border border-[#27272a] text-[#b9cacb] hover:text-white hover:border-[#00f2ff]/40 text-xs font-headline font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                    title="Promote to Active Member"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5 text-[#00f2ff]" />
                    <span className="hidden md:inline">To Member</span>
                  </button>

                  {/* Transfer Captaincy */}
                  <button
                    type="button"
                    disabled={isOperating}
                    onClick={() => onRequestTransfer(member)}
                    className="min-h-[38px] px-2.5 py-1.5 rounded-lg bg-[#0e1017] border border-[#27272a] text-[#b9cacb] hover:text-[#fed83a] hover:border-amber-400/40 text-xs font-headline font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                    title="Make Captain"
                  >
                    <Crown className="w-3.5 h-3.5 text-[#fed83a]" />
                    <span className="hidden md:inline">Transfer</span>
                  </button>

                  {/* Remove Player */}
                  <button
                    type="button"
                    disabled={isOperating}
                    onClick={() => onRequestRemove(member)}
                    className="min-h-[38px] px-2.5 py-1.5 rounded-lg bg-red-950/20 border border-red-500/30 text-red-300 hover:text-white hover:bg-red-950/40 text-xs font-headline font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                    title="Remove member from squad"
                  >
                    <UserMinus className="w-3.5 h-3.5 text-red-400" />
                    <span className="hidden md:inline">Remove</span>
                  </button>
                </div>
              )}
            </div>
          )
        })}

        {/* 4. EMPTY SLOTS VISUALIZER */}
        {[...Array(emptySlotsCount)].map((_, idx) => (
          <div
            key={`empty-slot-${idx}`}
            className="p-3.5 rounded-xl border border-dashed border-[#27272a]/60 bg-[#0e1017]/40 flex items-center justify-between text-xs text-[#849495]"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg border border-dashed border-[#27272a] flex items-center justify-center text-[#3a494b]">
                <Users className="w-4 h-4" />
              </div>
              <span className="font-headline font-semibold text-[#849495]/80">
                Empty Roster Slot #{totalFilled + idx + 1}
              </span>
            </div>
            <span className="text-[11px] text-[#849495]/60 font-mono">Available</span>
          </div>
        ))}
      </div>
    </section>
  )
}
