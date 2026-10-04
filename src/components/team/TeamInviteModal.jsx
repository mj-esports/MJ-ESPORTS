import React, { useState, useEffect } from 'react'
import { X, UserPlus, AlertCircle, Loader2, Send, Users, Shield, Info } from 'lucide-react'
import { inviteTeamMember } from '../../services/teamService'

/**
 * Modal dialog for inviting a player to join the squad by Free Fire UID, username, or email.
 */
export default function TeamInviteModal({ isOpen, onClose, teamId, onSuccess }) {
  const [inviteeIdentifier, setInviteeIdentifier] = useState('')
  const [role, setRole] = useState('Member')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorBanner, setErrorBanner] = useState(null)
  const [fieldError, setFieldError] = useState(null)

  useEffect(() => {
    if (isOpen) {
      setInviteeIdentifier('')
      setRole('Member')
      setErrorBanner(null)
      setFieldError(null)
    }
  }, [isOpen])

  // Escape key handler
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isSubmitting, onClose])

  if (!isOpen || !teamId) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorBanner(null)
    setFieldError(null)

    const cleanId = inviteeIdentifier.trim()
    if (!cleanId) {
      setFieldError('Please specify a Free Fire Character UID, username, or email.')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await inviteTeamMember({
        teamId,
        inviteeIdentifier: cleanId,
        role,
      })

      if (res.success) {
        onSuccess(res)
        onClose()
      } else {
        setErrorBanner(res.error || 'Failed to dispatch squad invitation.')
      }
    } catch (err) {
      setErrorBanner(err.message || 'An unexpected error occurred.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="invite-player-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-fadeIn"
    >
      <div
        className="relative w-full max-w-md bg-[#0e1017] border border-[#27272a] rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#00f2ff] to-transparent opacity-80" />

        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-[#1f2230]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#00f2ff]/10 border border-[#00f2ff]/30 flex items-center justify-center text-[#00f2ff]">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 id="invite-player-title" className="text-lg sm:text-xl font-headline font-bold text-white tracking-wide">
                Invite Roster Member
              </h2>
              <p className="text-xs text-[#849495]">Add an active player or substitute to your squad</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close dialog"
            className="w-9 h-9 min-h-[44px] min-w-[44px] rounded-lg bg-[#141416] border border-[#27272a] flex items-center justify-center text-[#849495] hover:text-white hover:border-[#00f2ff]/50 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-5">
          {errorBanner && (
            <div
              role="alert"
              className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/40 text-red-200 text-xs flex items-start gap-2.5 animate-fadeIn"
            >
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1 font-body">{errorBanner}</div>
            </div>
          )}

          {/* Identifier Input */}
          <div className="space-y-1.5">
            <label htmlFor="invitee-id" className="block text-xs font-headline font-bold uppercase tracking-wider text-[#b9cacb]">
              Player Identifier <span className="text-[#00f2ff]">*</span>
            </label>
            <input
              id="invitee-id"
              type="text"
              required
              disabled={isSubmitting}
              value={inviteeIdentifier}
              onChange={(e) => {
                setInviteeIdentifier(e.target.value)
                if (fieldError) setFieldError(null)
              }}
              placeholder="10-digit FF UID, username, or email"
              className={`w-full min-h-[44px] px-3.5 py-2.5 bg-[#141416] rounded-xl border text-sm text-white placeholder-[#849495]/60 focus:outline-none focus:ring-1 focus:ring-[#00f2ff] transition-all ${
                fieldError ? 'border-red-500/70 focus:border-red-500' : 'border-[#27272a] focus:border-[#00f2ff]'
              }`}
            />
            {fieldError ? (
              <p className="text-[11px] text-red-400">{fieldError}</p>
            ) : (
              <p className="text-[11px] text-[#849495]">Search by 10-digit Free Fire UID, platform username, or account email.</p>
            )}
          </div>

          {/* Role Segmented Selection */}
          <div className="space-y-1.5">
            <label className="block text-xs font-headline font-bold uppercase tracking-wider text-[#b9cacb]">
              Assigned Roster Role
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setRole('Member')}
                className={`min-h-[44px] p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                  role === 'Member'
                    ? 'bg-[#00f2ff]/10 border-[#00f2ff] text-white shadow-[0_0_15px_rgba(0,242,255,0.15)]'
                    : 'bg-[#141416] border-[#27272a] text-[#849495] hover:border-[#3a494b] hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-headline font-bold text-xs uppercase tracking-wider">Member</span>
                  <div
                    className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                      role === 'Member' ? 'border-[#00f2ff] bg-[#00f2ff]' : 'border-[#849495]'
                    }`}
                  >
                    {role === 'Member' && <div className="w-1.5 h-1.5 rounded-full bg-[#0e1017]" />}
                  </div>
                </div>
                <span className="text-[11px] mt-1 text-[#849495]">Main starter slot</span>
              </button>

              <button
                type="button"
                onClick={() => setRole('Substitute')}
                className={`min-h-[44px] p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                  role === 'Substitute'
                    ? 'bg-amber-400/10 border-amber-400 text-white shadow-[0_0_15px_rgba(251,191,36,0.15)]'
                    : 'bg-[#141416] border-[#27272a] text-[#849495] hover:border-[#3a494b] hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-headline font-bold text-xs uppercase tracking-wider">Substitute</span>
                  <div
                    className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                      role === 'Substitute' ? 'border-amber-400 bg-amber-400' : 'border-[#849495]'
                    }`}
                  >
                    {role === 'Substitute' && <div className="w-1.5 h-1.5 rounded-full bg-[#0e1017]" />}
                  </div>
                </div>
                <span className="text-[11px] mt-1 text-[#849495]">Reserve squad slot</span>
              </button>
            </div>
          </div>

          {/* Info Notice */}
          <div className="p-3 rounded-xl bg-[#141416] border border-[#27272a] flex items-start gap-2.5 text-xs text-[#849495]">
            <Info className="w-4 h-4 text-[#00f2ff] shrink-0 mt-0.5" />
            <p>
              An atomic Realtime notification will be sent to the player. Invitations remain valid for 7 days unless cancelled.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl border border-[#27272a] bg-[#141416] text-[#e5e2e3] font-headline font-semibold text-xs uppercase tracking-wider hover:bg-[#1f2230] transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-xl bg-[#00f2ff] text-[#00363a] font-headline font-bold text-xs uppercase tracking-wider hover:bg-[#74f5ff] active:scale-[0.99] transition-all shadow-[0_0_20px_rgba(0,242,255,0.25)] flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Dispatching...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Dispatch Invite</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
