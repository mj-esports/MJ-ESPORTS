import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Shield,
  Users,
  Plus,
  Crown,
  AlertCircle,
  Loader2,
  RefreshCw,
  Sparkles,
  ArrowLeft,
  ChevronRight,
  LogOut,
  Mail,
  X,
  CheckCircle2,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import {
  getMyTeamPortalData,
  createPlayerTeam,
  updatePlayerTeam,
  inviteTeamMember,
  respondTeamInvitation,
  cancelTeamInvitation,
  removeTeamMember,
  leavePlayerTeam,
  transferTeamOwnership,
  setTeamMemberRole,
} from '../services/teamService'

import TeamOverviewCard from '../components/team/TeamOverviewCard'
import TeamRosterList from '../components/team/TeamRosterList'
import TeamInvitationsTray from '../components/team/TeamInvitationsTray'
import CreateTeamModal from '../components/team/CreateTeamModal'
import TeamSettingsModal from '../components/team/TeamSettingsModal'
import TeamInviteModal from '../components/team/TeamInviteModal'

/**
 * Player Team Management / Squad Portal Page (/profile/team).
 * Primary player dashboard for permanent Free Fire MAX squad management.
 * Consumes strictly teamService.js (authoritative N3.2 SECURITY DEFINER RPCs).
 */
export default function PlayerTeamPortalPage() {
  const { user, profile } = useAuth()
  const { showSuccess, showError } = useToast()

  // Primary Portal State
  const [portalData, setPortalData] = useState({
    has_team: false,
    team: null,
    members: [],
    outgoing_invitations: [],
    incoming_invitations: [],
    is_captain: false,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [actionLoadingId, setActionLoadingId] = useState(null)
  const [globalError, setGlobalError] = useState(null)

  // Modals State
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isInviteOpen, setIsInviteOpen] = useState(false)

  // Generic Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    isDanger: false,
    onConfirm: null,
  })

  // Load canonical portal data from server
  const loadPortalData = useCallback(async () => {
    setLoadError(null)
    try {
      const res = await getMyTeamPortalData()
      if (res.success) {
        setPortalData({
          has_team: Boolean(res.has_team),
          team: res.team || null,
          members: Array.isArray(res.members) ? res.members : [],
          outgoing_invitations: Array.isArray(res.outgoing_invitations) ? res.outgoing_invitations : [],
          incoming_invitations: Array.isArray(res.incoming_invitations) ? res.incoming_invitations : [],
          is_captain: Boolean(res.is_captain),
        })
      } else {
        setLoadError(res.error || 'Unable to load squad portal data. Please try again.')
      }
    } catch (err) {
      console.error('[PlayerTeamPortalPage] loadPortalData exception:', err)
      setLoadError('Failed to load squad portal. Please check your connection and retry.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPortalData()
  }, [loadPortalData])

  // ==========================================================================
  // MUTATION HANDLERS (All strictly route through teamService.js)
  // ==========================================================================

  // 1. Team Created
  const handleTeamCreated = (res) => {
    showSuccess('Free Fire squad created successfully!')
    loadPortalData()
  }

  // 2. Team Settings Updated
  const handleTeamUpdated = (res) => {
    showSuccess('Squad settings updated successfully!')
    loadPortalData()
  }

  // 3. Member Invited
  const handleInviteDispatched = (res) => {
    showSuccess('Squad invitation dispatched successfully!')
    loadPortalData()
  }

  // 4. Respond to Incoming Invitation (ACCEPT / REJECT)
  const handleRespondInvitation = async (invitationId, action) => {
    setActionLoadingId(invitationId)
    setGlobalError(null)
    try {
      const res = await respondTeamInvitation(invitationId, action)
      if (res.success) {
        showSuccess(
          action === 'ACCEPT' ? 'Joined squad successfully!' : 'Squad invitation declined.'
        )
        await loadPortalData()
      } else {
        showError(res.error || 'Failed to respond to invitation.')
        setGlobalError(res.error)
      }
    } catch (err) {
      showError(err.message || 'Error processing invitation.')
    } finally {
      setActionLoadingId(null)
    }
  }

  // 5. Cancel Outgoing Invitation
  const handleCancelInvitation = async (invitationId) => {
    setActionLoadingId(invitationId)
    setGlobalError(null)
    try {
      const res = await cancelTeamInvitation(invitationId)
      if (res.success) {
        showSuccess('Invitation cancelled.')
        await loadPortalData()
      } else {
        showError(res.error || 'Failed to cancel invitation.')
        setGlobalError(res.error)
      }
    } catch (err) {
      showError(err.message || 'Error cancelling invitation.')
    } finally {
      setActionLoadingId(null)
    }
  }

  // 6. Change Member Role (Member <-> Substitute)
  const handleRoleChange = async (targetUserId, newRole) => {
    if (!portalData.team?.id) return
    setActionLoadingId(targetUserId)
    setGlobalError(null)
    try {
      const res = await setTeamMemberRole({
        teamId: portalData.team.id,
        targetUserId,
        newRole,
      })
      if (res.success) {
        showSuccess(`Roster role updated to ${newRole}.`)
        await loadPortalData()
      } else {
        showError(res.error || 'Failed to update member role.')
        setGlobalError(res.error)
      }
    } catch (err) {
      showError(err.message || 'Error updating member role.')
    } finally {
      setActionLoadingId(null)
    }
  }

  // 7. Request Remove Member (with confirmation modal)
  const handleRequestRemoveMember = (member) => {
    setConfirmModal({
      isOpen: true,
      title: 'Remove Squad Member',
      message: `Are you sure you want to remove "${member.player_name}" from "${portalData.team?.name}"? They will lose tournament eligibility under this roster.`,
      confirmText: 'Remove Member',
      isDanger: true,
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }))
        setActionLoadingId(member.user_id)
        setGlobalError(null)
        try {
          const res = await removeTeamMember({
            teamId: portalData.team.id,
            targetUserId: member.user_id,
          })
          if (res.success) {
            showSuccess(`Removed "${member.player_name}" from squad.`)
            await loadPortalData()
          } else {
            showError(res.error || 'Failed to remove member.')
            setGlobalError(res.error)
          }
        } catch (err) {
          showError(err.message || 'Error removing member.')
        } finally {
          setActionLoadingId(null)
        }
      },
    })
  }

  // 8. Request Leave Team (with confirmation modal)
  const handleRequestLeaveTeam = () => {
    if (!portalData.team?.id) return
    setConfirmModal({
      isOpen: true,
      title: 'Leave Squad',
      message: `Are you sure you want to leave "${portalData.team.name}"? You will be removed from the active roster.`,
      confirmText: 'Leave Squad',
      isDanger: true,
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }))
        setActionLoadingId('leave')
        setGlobalError(null)
        try {
          const res = await leavePlayerTeam(portalData.team.id)
          if (res.success) {
            showSuccess(`You have left "${portalData.team.name}".`)
            await loadPortalData()
          } else {
            showError(res.error || 'Failed to leave squad.')
            setGlobalError(res.error)
          }
        } catch (err) {
          showError(err.message || 'Error leaving squad.')
        } finally {
          setActionLoadingId(null)
        }
      },
    })
  }

  // 9. Request Transfer Ownership (with confirmation modal)
  const handleRequestTransferOwnership = (member) => {
    if (!portalData.team?.id) return
    setConfirmModal({
      isOpen: true,
      title: 'Transfer Squad Captaincy',
      message: `Are you sure you want to transfer Captaincy of "${portalData.team.name}" to "${member.player_name}"? You will step down to Member. This action cannot be undone by yourself.`,
      confirmText: 'Transfer Captaincy',
      isDanger: false,
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }))
        setActionLoadingId(member.user_id)
        setGlobalError(null)
        try {
          const res = await transferTeamOwnership({
            teamId: portalData.team.id,
            newCaptainUserId: member.user_id,
          })
          if (res.success) {
            showSuccess(`Captaincy transferred to ${member.player_name}.`)
            await loadPortalData()
          } else {
            showError(res.error || 'Failed to transfer captaincy.')
            setGlobalError(res.error)
          }
        } catch (err) {
          showError(err.message || 'Error transferring captaincy.')
        } finally {
          setActionLoadingId(null)
        }
      },
    })
  }

  // ==========================================================================
  // RENDER: LOADING SKELETON
  // ==========================================================================
  if (isLoading) {
    return (
      <div className="bg-[#07080b] text-white font-body min-h-screen pb-20 antialiased selection:bg-[#00f2ff]/30 selection:text-white">
        <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 space-y-6 animate-pulse">
          {/* Breadcrumb Skeleton */}
          <div className="h-6 w-48 bg-[#141416] rounded-md" />

          {/* Hero Overview Skeleton */}
          <div className="h-44 sm:h-48 bg-[#0e1017] rounded-2xl border border-[#1f2230]" />

          {/* Roster Skeleton */}
          <div className="space-y-3">
            <div className="h-6 w-36 bg-[#141416] rounded-md" />
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 bg-[#141416] rounded-xl border border-[#1f2230]" />
            ))}
          </div>
        </main>
      </div>
    )
  }

  const defaultUid = profile?.game_uid || user?.user_metadata?.game_uid || ''

  return (
    <div className="bg-[#07080b] text-white font-body min-h-screen pb-20 antialiased selection:bg-[#00f2ff]/30 selection:text-white">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 space-y-6 sm:space-y-7">
        {/* ==================================================================== */}
        {/* 1. BREADCRUMBS & SECTION TITLE                                       */}
        {/* ==================================================================== */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[#849495]">
            <Link to="/profile" className="hover:text-white transition-colors flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Profile</span>
            </Link>
            <ChevronRight className="w-3 h-3 text-[#3a494b]" />
            <span className="text-[#00f2ff] font-headline font-semibold">Squad Management</span>
          </nav>

          <button
            type="button"
            onClick={loadPortalData}
            aria-label="Refresh squad data"
            className="min-h-[38px] px-3 py-1.5 rounded-lg bg-[#141416] border border-[#27272a] text-[#849495] hover:text-white hover:border-[#00f2ff]/40 text-xs font-headline font-semibold flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#00f2ff]" />
            <span className="hidden sm:inline">Refresh Data</span>
          </button>
        </div>

        {/* ==================================================================== */}
        {/* 2. ERROR BANNERS                                                     */}
        {/* ==================================================================== */}
        {loadError && (
          <div
            role="alert"
            className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 text-red-200 text-xs flex items-start justify-between gap-3 animate-fadeIn"
          >
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold text-white block">Connection Notice</strong>
                <span>{loadError}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={loadPortalData}
              className="px-3 py-1 bg-red-900/60 hover:bg-red-800 text-white rounded-lg text-xs font-headline font-bold uppercase transition-colors shrink-0"
            >
              Retry
            </button>
          </div>
        )}

        {globalError && (
          <div
            role="alert"
            className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/40 text-red-200 text-xs flex items-center justify-between gap-3 animate-fadeIn"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{globalError}</span>
            </div>
            <button
              type="button"
              onClick={() => setGlobalError(null)}
              aria-label="Dismiss error"
              className="text-red-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ==================================================================== */}
        {/* 3. CONDITIONAL STATE: NO ACTIVE SQUAD VS ACTIVE SQUAD                */}
        {/* ==================================================================== */}
        {!portalData.has_team ? (
          /* ------------------------------------------------------------------ */
          /* 3A. EMPTY STATE: NO SQUAD                                          */
          /* ------------------------------------------------------------------ */
          <div className="space-y-8">
            <section
              aria-label="No Squad State"
              className="relative rounded-2xl bg-gradient-to-b from-[#0e1017] to-[#0a0b10] border border-[#1f2230] p-6 sm:p-10 text-center space-y-5 shadow-[0_4px_30px_rgba(0,0,0,0.6)] overflow-hidden"
            >
              <div
                className="absolute inset-0 pointer-events-none opacity-20"
                style={{
                  backgroundImage: 'radial-gradient(#00f2ff 1px, transparent 1px)',
                  backgroundSize: '24px 24px',
                }}
              />
              <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-64 h-32 bg-[#00f2ff]/10 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 max-w-md mx-auto space-y-4">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-[#00f2ff]/20 to-[#141416] border-2 border-[#00f2ff]/40 shadow-[0_0_25px_rgba(0,242,255,0.2)] flex items-center justify-center mx-auto text-[#00f2ff]">
                  <Shield className="w-8 h-8 sm:w-10 sm:h-10" />
                </div>

                <div className="space-y-1.5">
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-headline font-bold text-white tracking-wide">
                    You Are Not Part of a Squad Yet
                  </h1>
                  <p className="text-xs sm:text-sm text-[#849495] font-body leading-relaxed">
                    Form a permanent Free Fire MAX squad to compete in tournaments, recruit teammates, and climb the competitive leaderboards together.
                  </p>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(true)}
                    className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-xl bg-[#00f2ff] text-[#00363a] hover:bg-[#74f5ff] text-xs font-headline font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(0,242,255,0.3)] active:scale-[0.99]"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Free Fire Squad</span>
                  </button>
                </div>
              </div>
            </section>

            {/* Incoming invitations tray (players without teams can still have invites) */}
            <TeamInvitationsTray
              incomingInvitations={portalData.incoming_invitations}
              outgoingInvitations={[]}
              isCaptain={false}
              hasTeam={false}
              onRespond={handleRespondInvitation}
              onCancel={handleCancelInvitation}
              actionLoadingId={actionLoadingId}
            />
          </div>
        ) : (
          /* ------------------------------------------------------------------ */
          /* 3B. ACTIVE SQUAD PORTAL DASHBOARD                                  */
          /* ------------------------------------------------------------------ */
          <div className="space-y-6 sm:space-y-8">
            {/* 1. Squad Hero Overview */}
            <TeamOverviewCard
              team={portalData.team}
              membersCount={portalData.members.length}
              isCaptain={portalData.is_captain}
              onOpenSettings={() => setIsSettingsOpen(true)}
              onOpenInvite={() => setIsInviteOpen(true)}
              onLeaveTeam={handleRequestLeaveTeam}
            />

            {/* 2. Squad Roster */}
            <TeamRosterList
              members={portalData.members}
              isCaptain={portalData.is_captain}
              currentUserId={user?.id}
              onRoleChange={handleRoleChange}
              onRequestRemove={handleRequestRemoveMember}
              onRequestTransfer={handleRequestTransferOwnership}
              actionLoadingId={actionLoadingId}
            />

            {/* 3. Invitations Tray */}
            <TeamInvitationsTray
              incomingInvitations={portalData.incoming_invitations}
              outgoingInvitations={portalData.outgoing_invitations}
              isCaptain={portalData.is_captain}
              hasTeam={true}
              onRespond={handleRespondInvitation}
              onCancel={handleCancelInvitation}
              actionLoadingId={actionLoadingId}
            />
          </div>
        )}

        {/* ==================================================================== */}
        {/* MODALS                                                               */}
        {/* ==================================================================== */}

        {/* Create Squad Modal */}
        <CreateTeamModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onSuccess={handleTeamCreated}
          defaultGameUid={defaultUid}
        />

        {/* Squad Settings Modal */}
        <TeamSettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          team={portalData.team}
          onSuccess={handleTeamUpdated}
        />

        {/* Invite Player Modal */}
        <TeamInviteModal
          isOpen={isInviteOpen}
          onClose={() => setIsInviteOpen(false)}
          teamId={portalData.team?.id}
          onSuccess={handleInviteDispatched}
        />

        {/* Destructive / Action Confirmation Dialog */}
        {confirmModal.isOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-modal-title"
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
          >
            <div
              className="relative w-full max-w-md bg-[#0e1017] border border-[#27272a] rounded-2xl p-5 sm:p-6 shadow-[0_10px_40px_rgba(0,0,0,0.8)] space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    confirmModal.isDanger
                      ? 'bg-red-500/10 border border-red-500/30 text-red-400'
                      : 'bg-amber-400/10 border border-amber-400/30 text-amber-400'
                  }`}
                >
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h3 id="confirm-modal-title" className="font-headline font-bold text-white text-base">
                    {confirmModal.title}
                  </h3>
                  <p className="text-xs text-[#849495] font-body leading-relaxed">{confirmModal.message}</p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-[#141416] border border-[#27272a] text-[#b9cacb] hover:text-white text-xs font-headline font-semibold uppercase"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmModal.onConfirm}
                  className={`min-h-[44px] px-5 py-2 rounded-xl text-xs font-headline font-bold uppercase transition-all shadow-sm ${
                    confirmModal.isDanger
                      ? 'bg-red-600 hover:bg-red-500 text-white'
                      : 'bg-[#00f2ff] hover:bg-[#74f5ff] text-[#00363a]'
                  }`}
                >
                  {confirmModal.confirmText}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
