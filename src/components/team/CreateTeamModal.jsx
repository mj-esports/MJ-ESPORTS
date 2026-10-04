import React, { useState, useEffect } from 'react'
import { X, Shield, AlertCircle, Loader2, Sparkles, Gamepad2, Info } from 'lucide-react'
import { createPlayerTeam } from '../../services/teamService'

/**
 * Modal dialog for creating a permanent Free Fire MAX player squad.
 * Caller is authoritatively designated as Captain by the backend RPC.
 */
export default function CreateTeamModal({ isOpen, onClose, onSuccess, defaultGameUid = '' }) {
  const [name, setName] = useState('')
  const [tag, setTag] = useState('')
  const [description, setDescription] = useState('')
  const [gameUid, setGameUid] = useState(defaultGameUid || '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorBanner, setErrorBanner] = useState(null)
  const [validationErrors, setValidationErrors] = useState({})

  useEffect(() => {
    if (isOpen) {
      setErrorBanner(null)
      setValidationErrors({})
      if (defaultGameUid && !gameUid) {
        setGameUid(defaultGameUid)
      }
    }
  }, [isOpen, defaultGameUid])

  // Keyboard Escape handler
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isSubmitting, onClose])

  if (!isOpen) return null

  const validateForm = () => {
    const errors = {}
    const cleanName = name.trim()
    if (!cleanName) {
      errors.name = 'Squad name is required.'
    } else if (cleanName.length < 3 || cleanName.length > 30) {
      errors.name = 'Squad name must be between 3 and 30 characters.'
    }

    if (tag.trim()) {
      if (!/^[A-Za-z0-9]{2,5}$/.test(tag.trim())) {
        errors.tag = 'Squad tag must be 2 to 5 alphanumeric characters.'
      }
    }

    if (description.trim() && description.trim().length > 250) {
      errors.description = 'Description cannot exceed 250 characters.'
    }

    const cleanUid = gameUid.trim()
    if (!cleanUid) {
      errors.gameUid = 'Free Fire MAX Character UID is required.'
    } else if (!/^[0-9]{10}$/.test(cleanUid)) {
      errors.gameUid = 'Free Fire MAX UID must be exactly 10 digits.'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorBanner(null)

    if (!validateForm()) return

    setIsSubmitting(true)
    try {
      const res = await createPlayerTeam({
        name: name.trim(),
        tag: tag.trim() ? tag.trim().toUpperCase() : null,
        description: description.trim() || null,
        gameUid: gameUid.trim(),
      })

      if (res.success) {
        onSuccess(res)
        onClose()
      } else {
        setErrorBanner(res.error || 'Failed to create squad. Please try again.')
      }
    } catch (err) {
      setErrorBanner(err.message || 'An unexpected error occurred while creating squad.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-team-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-fadeIn"
    >
      <div
        className="relative w-full max-w-lg bg-[#0e1017] border border-[#27272a] rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle Ambient Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#00f2ff] to-transparent opacity-80" />

        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-[#1f2230]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#00f2ff]/10 border border-[#00f2ff]/30 flex items-center justify-center text-[#00f2ff]">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 id="create-team-title" className="text-lg sm:text-xl font-headline font-bold text-white tracking-wide">
                Form Free Fire Squad
              </h2>
              <p className="text-xs text-[#849495]">Create your permanent esports squad roster</p>
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

          {/* Squad Name */}
          <div className="space-y-1.5">
            <label htmlFor="team-name" className="block text-xs font-headline font-bold uppercase tracking-wider text-[#b9cacb]">
              Squad Name <span className="text-[#00f2ff]">*</span>
            </label>
            <input
              id="team-name"
              type="text"
              required
              maxLength={30}
              disabled={isSubmitting}
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                if (validationErrors.name) setValidationErrors((prev) => ({ ...prev, name: null }))
              }}
              placeholder="e.g. Phoenix Rising"
              className={`w-full min-h-[44px] px-3.5 py-2.5 bg-[#141416] rounded-xl border text-sm text-white placeholder-[#849495]/60 focus:outline-none focus:ring-1 focus:ring-[#00f2ff] transition-all ${
                validationErrors.name ? 'border-red-500/70 focus:border-red-500' : 'border-[#27272a] focus:border-[#00f2ff]'
              }`}
            />
            {validationErrors.name ? (
              <p className="text-[11px] text-red-400">{validationErrors.name}</p>
            ) : (
              <p className="text-[11px] text-[#849495]">3–30 characters, case-insensitive unique</p>
            )}
          </div>

          {/* Squad Tag & Free Fire UID Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Squad Tag */}
            <div className="space-y-1.5">
              <label htmlFor="team-tag" className="block text-xs font-headline font-bold uppercase tracking-wider text-[#b9cacb]">
                Squad Tag
              </label>
              <input
                id="team-tag"
                type="text"
                maxLength={5}
                disabled={isSubmitting}
                value={tag}
                onChange={(e) => {
                  setTag(e.target.value.toUpperCase())
                  if (validationErrors.tag) setValidationErrors((prev) => ({ ...prev, tag: null }))
                }}
                placeholder="e.g. PHX"
                className={`w-full min-h-[44px] px-3.5 py-2.5 bg-[#141416] rounded-xl border text-sm text-white uppercase font-mono placeholder-[#849495]/60 focus:outline-none focus:ring-1 focus:ring-[#00f2ff] transition-all ${
                  validationErrors.tag ? 'border-red-500/70 focus:border-red-500' : 'border-[#27272a] focus:border-[#00f2ff]'
                }`}
              />
              {validationErrors.tag ? (
                <p className="text-[11px] text-red-400">{validationErrors.tag}</p>
              ) : (
                <p className="text-[11px] text-[#849495]">2–5 alphanumeric chars</p>
              )}
            </div>

            {/* Free Fire MAX UID */}
            <div className="space-y-1.5">
              <label htmlFor="game-uid" className="block text-xs font-headline font-bold uppercase tracking-wider text-[#b9cacb]">
                Captain FF UID <span className="text-[#00f2ff]">*</span>
              </label>
              <input
                id="game-uid"
                type="text"
                inputMode="numeric"
                maxLength={10}
                required
                disabled={isSubmitting}
                value={gameUid}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/\D/g, '').slice(0, 10)
                  setGameUid(cleaned)
                  if (validationErrors.gameUid) setValidationErrors((prev) => ({ ...prev, gameUid: null }))
                }}
                placeholder="10-digit Character UID"
                className={`w-full min-h-[44px] px-3.5 py-2.5 bg-[#141416] rounded-xl border text-sm text-white font-mono placeholder-[#849495]/60 focus:outline-none focus:ring-1 focus:ring-[#00f2ff] transition-all ${
                  validationErrors.gameUid ? 'border-red-500/70 focus:border-red-500' : 'border-[#27272a] focus:border-[#00f2ff]'
                }`}
              />
              {validationErrors.gameUid ? (
                <p className="text-[11px] text-red-400">{validationErrors.gameUid}</p>
              ) : (
                <p className="text-[11px] text-[#849495]">Exact 10 numeric digits</p>
              )}
            </div>
          </div>

          {/* Squad Description / Motto */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="team-desc" className="block text-xs font-headline font-bold uppercase tracking-wider text-[#b9cacb]">
                Squad Motto / Bio
              </label>
              <span className="text-[10px] text-[#849495]">{description.length}/250</span>
            </div>
            <textarea
              id="team-desc"
              rows={3}
              maxLength={250}
              disabled={isSubmitting}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value)
                if (validationErrors.description) setValidationErrors((prev) => ({ ...prev, description: null }))
              }}
              placeholder="Tell players about your squad, competitive goals, or recruitment criteria..."
              className="w-full px-3.5 py-2.5 bg-[#141416] rounded-xl border border-[#27272a] text-sm text-white placeholder-[#849495]/60 focus:outline-none focus:border-[#00f2ff] focus:ring-1 focus:ring-[#00f2ff] transition-all resize-none"
            />
            {validationErrors.description && (
              <p className="text-[11px] text-red-400">{validationErrors.description}</p>
            )}
          </div>

          {/* Info Notice */}
          <div className="p-3 rounded-xl bg-[#141416] border border-[#27272a] flex items-start gap-2.5 text-xs text-[#849495]">
            <Info className="w-4 h-4 text-[#00f2ff] shrink-0 mt-0.5" />
            <p>
              You will automatically become the squad <strong className="text-white">Captain</strong>. Roster capacity is set to 6 players (4 starters + 2 substitutes).
            </p>
          </div>

          {/* Modal Actions */}
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
                  <span>Creating Squad...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Establish Squad</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
