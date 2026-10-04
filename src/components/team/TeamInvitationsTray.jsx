import React from 'react'
import {
  Mail,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  Users,
  Shield,
  Loader2,
  Trash2,
  X,
  AlertCircle,
  Inbox,
} from 'lucide-react'

/**
 * Invitations tray presenting incoming invitations (available to all players)
 * and outgoing invitations (managed by squad Captain).
 */
export default function TeamInvitationsTray({
  incomingInvitations = [],
  outgoingInvitations = [],
  isCaptain = false,
  hasTeam = false,
  onRespond,
  onCancel,
  actionLoadingId = null,
}) {
  const hasIncoming = incomingInvitations.length > 0
  const hasOutgoing = isCaptain && outgoingInvitations.length > 0

  if (!hasIncoming && !hasOutgoing && hasTeam) {
    return null
  }

  // Format expiration helper
  const formatExpires = (dateStr) => {
    if (!dateStr) return '7 days'
    try {
      const exp = new Date(dateStr)
      const now = new Date()
      const diffMs = exp.getTime() - now.getTime()
      if (diffMs <= 0) return 'Expired'
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
      if (diffHours < 24) return `${diffHours}h left`
      const diffDays = Math.ceil(diffHours / 24)
      return `${diffDays}d left`
    } catch {
      return '7 days'
    }
  }

  return (
    <div className="space-y-6">
      {/* ==================================================================== */}
      {/* 1. INCOMING SQUAD INVITATIONS                                        */}
      {/* ==================================================================== */}
      <section aria-labelledby="incoming-invites-heading" className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#00f2ff]/10 border border-[#00f2ff]/30 flex items-center justify-center text-[#00f2ff]">
              <Inbox className="w-4 h-4" />
            </div>
            <div>
              <h2 id="incoming-invites-heading" className="text-base sm:text-lg font-headline font-bold text-white tracking-wide">
                Incoming Invitations
              </h2>
              <p className="text-xs text-[#849495]">Squads seeking your participation</p>
            </div>
          </div>

          {hasIncoming && (
            <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-[#00f2ff]/10 text-[#00f2ff] border border-[#00f2ff]/30">
              {incomingInvitations.length} Pending
            </span>
          )}
        </div>

        {hasIncoming ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {incomingInvitations.map((invite) => {
              const isOperating = actionLoadingId === invite.id
              const expiresFormatted = formatExpires(invite.expires_at)

              return (
                <div
                  key={invite.id}
                  className="p-4 rounded-xl bg-[#141416] border border-[#27272a] hover:border-[#00f2ff]/40 shadow-sm flex flex-col justify-between gap-3 transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-headline font-bold text-white text-base truncate">
                          {invite.team_name}
                        </span>
                        {invite.team_tag && (
                          <span className="px-1.5 py-0.5 rounded bg-[#00f2ff]/10 text-[#00f2ff] font-mono text-[11px] font-bold">
                            [{invite.team_tag}]
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#849495]">
                        Invited by <strong className="text-white">{invite.inviter_name || 'Captain'}</strong>
                      </p>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-headline font-bold uppercase shrink-0 ${
                        invite.role === 'Substitute'
                          ? 'bg-amber-400/10 text-amber-300 border border-amber-400/30'
                          : 'bg-[#00f2ff]/10 text-[#00f2ff] border border-[#00f2ff]/30'
                      }`}
                    >
                      {invite.role || 'Member'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#1f2230] text-xs">
                    <span className="text-[#849495] flex items-center gap-1 font-mono text-[11px]">
                      <Clock className="w-3 h-3 text-[#fed83a]" />
                      Expires: {expiresFormatted}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={isOperating}
                        onClick={() => onRespond(invite.id, 'REJECT')}
                        className="min-h-[44px] px-3.5 py-1.5 rounded-xl border border-red-500/30 bg-red-950/20 text-red-300 hover:text-white hover:bg-red-950/40 text-xs font-headline font-semibold transition-colors disabled:opacity-50"
                      >
                        Decline
                      </button>

                      <button
                        type="button"
                        disabled={isOperating}
                        onClick={() => onRespond(invite.id, 'ACCEPT')}
                        className="min-h-[44px] px-4 py-1.5 rounded-xl bg-[#00f2ff] text-[#00363a] hover:bg-[#74f5ff] text-xs font-headline font-bold uppercase transition-all shadow-[0_0_12px_rgba(0,242,255,0.2)] flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {isOperating ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        <span>Accept</span>
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="p-6 rounded-xl border border-dashed border-[#27272a] bg-[#141416]/40 text-center space-y-1">
            <Mail className="w-6 h-6 text-[#849495] mx-auto opacity-40" />
            <p className="text-xs text-[#849495]">No pending squad invitations at this time.</p>
          </div>
        )}
      </section>

      {/* ==================================================================== */}
      {/* 2. OUTGOING INVITATIONS (Captain View)                                */}
      {/* ==================================================================== */}
      {isCaptain && (
        <section aria-labelledby="outgoing-invites-heading" className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#00f2ff]/10 border border-[#00f2ff]/30 flex items-center justify-center text-[#00f2ff]">
                <Send className="w-4 h-4" />
              </div>
              <div>
                <h2 id="outgoing-invites-heading" className="text-base sm:text-lg font-headline font-bold text-white tracking-wide">
                  Outgoing Invitations
                </h2>
                <p className="text-xs text-[#849495]">Dispatched squad roster invitations</p>
              </div>
            </div>

            {outgoingInvitations.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-[#141416] text-[#b9cacb] border border-[#27272a]">
                {outgoingInvitations.length} Active
              </span>
            )}
          </div>

          {outgoingInvitations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {outgoingInvitations.map((invite) => {
                const isOperating = actionLoadingId === invite.id
                const expiresFormatted = formatExpires(invite.expires_at)

                return (
                  <div
                    key={invite.id}
                    className="p-3.5 sm:p-4 rounded-xl bg-[#141416] border border-[#27272a] flex items-center justify-between gap-3 transition-all"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-headline font-bold text-white text-sm truncate">
                          {invite.invitee_name || 'Player'}
                        </span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] font-headline uppercase ${
                            invite.role === 'Substitute'
                              ? 'bg-amber-400/10 text-amber-300'
                              : 'bg-[#00f2ff]/10 text-[#00f2ff]'
                          }`}
                        >
                          {invite.role || 'Member'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[#849495]">
                        <span className="font-mono text-[11px] text-[#849495]">UID: {invite.invitee_uid || 'N/A'}</span>
                        <span>•</span>
                        <span className="font-mono text-[11px] text-[#fed83a]">{expiresFormatted}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isOperating}
                      onClick={() => onCancel(invite.id)}
                      className="min-h-[44px] px-3.5 py-1.5 rounded-xl border border-red-500/30 bg-red-950/20 text-red-300 hover:text-white hover:bg-red-950/40 text-xs font-headline font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 shrink-0"
                    >
                      {isOperating ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <X className="w-3.5 h-3.5" />
                      )}
                      <span>Cancel</span>
                    </button>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="p-4 rounded-xl border border-dashed border-[#27272a] bg-[#141416]/40 text-center">
              <p className="text-xs text-[#849495]">No pending outgoing invitations.</p>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
