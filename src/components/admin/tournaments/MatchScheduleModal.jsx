import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  X,
  Swords,
  MapPin,
  AlertCircle,
  CheckCircle2,
  Radio,
  Timer,
  Info,
  ChevronDown,
  Layers,
  Sparkles,
  Loader2,
} from 'lucide-react'
import {
  fetchTournamentMatches,
  scheduleTournamentMatches,
  deleteTournamentMatch,
} from '../../../services/matchSchedulingService'
import { useToast } from '../../../contexts/ToastContext'

// ============================================================================
// CONSTANTS (Strictly aligned with PostgreSQL N2.2 validation rules)
// ============================================================================

export const SUPPORTED_MAPS = [
  { id: 'Bermuda', label: 'Bermuda' },
  { id: 'Purgatory', label: 'Purgatory' },
  { id: 'Kalahari', label: 'Kalahari' },
  { id: 'Alpine', label: 'Alpine' },
  { id: 'NeXTerra', label: 'NeXTerra' },
  { id: 'Random', label: 'Random' },
  { id: 'Custom', label: 'Custom' },
]

export const SUPPORTED_MATCH_TYPES = [
  { id: 'Battle Royale', label: 'Battle Royale' },
  { id: 'Clash Squad', label: 'Clash Squad' },
  { id: 'Custom', label: 'Custom' },
  { id: 'Group Stage', label: 'Group Stage' },
  { id: 'Semifinals', label: 'Semifinals' },
  { id: 'Grand Finals', label: 'Grand Finals' },
]

export const MIN_MATCHES = 1
export const MAX_MATCHES = 12
export const MIN_SPACING_MINUTES = 15

// ============================================================================
// DATE & TIME HELPERS
// ============================================================================

/**
 * Splits an ISO string or Date into local date ('YYYY-MM-DD') and time ('HH:MM').
 *
 * @param {string|Date} isoStr - Date representation
 * @returns {{ date: string, time: string }}
 */
export function splitISODateTime(isoStr) {
  if (!isoStr) return { date: '', time: '' }
  try {
    const d = new Date(isoStr)
    if (isNaN(d.getTime())) return { date: '', time: '' }
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')
    return {
      date: `${year}-${month}-${day}`,
      time: `${hours}:${minutes}`,
    }
  } catch {
    return { date: '', time: '' }
  }
}

/**
 * Combines local date ('YYYY-MM-DD') and time ('HH:MM') into an ISO UTC string.
 *
 * @param {string} dateStr - 'YYYY-MM-DD'
 * @param {string} timeStr - 'HH:MM'
 * @returns {string|null} ISO 8601 string or null if invalid
 */
export function combineDateAndTime(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null
  try {
    const combined = new Date(`${dateStr}T${timeStr}`)
    if (isNaN(combined.getTime())) return null
    return combined.toISOString()
  } catch {
    return null
  }
}

/**
 * Generates sensible default parameters for the next match in sequence.
 *
 * @param {Array<object>} existingMatches - Current list of match models
 * @param {object} tournamentContext - Tournament metadata (startDate, startTime, etc.)
 * @returns {object} Initial match state object
 */
export function calculateNextMatchDefaults(existingMatches = [], tournamentContext = {}) {
  const nextMatchNum = existingMatches.length + 1
  const prevMatch = existingMatches.length > 0 ? existingMatches[existingMatches.length - 1] : null

  let schedDate = ''
  let schedTime = ''

  if (prevMatch && prevMatch.scheduled_time) {
    const prevDate = new Date(prevMatch.scheduled_time)
    if (!isNaN(prevDate.getTime())) {
      // Default to 45 minutes after the previous match
      const nextDate = new Date(prevDate.getTime() + 45 * 60 * 1000)
      const parts = splitISODateTime(nextDate)
      schedDate = parts.date
      schedTime = parts.time
    }
  }

  // Fallback to tournament start date/time or next upcoming hour
  if (!schedDate || !schedTime) {
    if (tournamentContext.startDate && tournamentContext.startTime) {
      // If startTime has AM/PM or standard time format
      const match = String(tournamentContext.startTime).match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i)
      if (match) {
        let hours = parseInt(match[1], 10)
        const mins = match[2]
        const ampm = match[3]?.toUpperCase()
        if (ampm === 'PM' && hours < 12) hours += 12
        if (ampm === 'AM' && hours === 12) hours = 0
        schedDate = tournamentContext.startDate
        schedTime = `${String(hours).padStart(2, '0')}:${mins}`
      } else {
        schedDate = tournamentContext.startDate
        schedTime = '18:00'
      }
    } else {
      const now = new Date()
      now.setHours(now.getHours() + 1, 0, 0, 0)
      const parts = splitISODateTime(now)
      schedDate = parts.date
      schedTime = parts.time
    }
  }

  const scheduledIso = combineDateAndTime(schedDate, schedTime)

  // Default room release time: 15 minutes before match scheduled time
  let roomDate = schedDate
  let roomTime = ''
  if (scheduledIso) {
    const schedObj = new Date(scheduledIso)
    const releaseObj = new Date(schedObj.getTime() - 15 * 60 * 1000)
    const releaseParts = splitISODateTime(releaseObj)
    roomDate = releaseParts.date
    roomTime = releaseParts.time
  }

  const roomReleaseIso = combineDateAndTime(roomDate, roomTime)

  return {
    id: null,
    match_number: nextMatchNum,
    round_number: nextMatchNum,
    round_name: `Round ${nextMatchNum}`,
    match_type: prevMatch?.match_type || 'Battle Royale',
    map_name: prevMatch?.map_name || 'Bermuda',
    scheduled_date: schedDate,
    scheduled_time_val: schedTime,
    scheduled_time: scheduledIso,
    room_release_date: roomDate,
    room_release_time_val: roomTime,
    room_release_time: roomReleaseIso,
    status: 'Draft',
    isPersisted: false,
  }
}

// ============================================================================
// CHRONOLOGY & INTEGRITY VALIDATOR
// ============================================================================

/**
 * Validates the full match schedule against business and database rules.
 *
 * @param {Array<object>} matches - Array of match state objects
 * @returns {{ isValid: boolean, errors: Array<{ matchIndex?: number, field?: string, message: string }> }}
 */
export function validateMatchSchedule(matches = []) {
  const errors = []

  if (!Array.isArray(matches) || matches.length < MIN_MATCHES) {
    errors.push({
      message: `At least ${MIN_MATCHES} match must be scheduled.`,
    })
    return { isValid: false, errors }
  }

  if (matches.length > MAX_MATCHES) {
    errors.push({
      message: `A tournament can have at most ${MAX_MATCHES} scheduled matches. (Current: ${matches.length})`,
    })
  }

  let prevMatchTime = null

  matches.forEach((m, idx) => {
    const matchNum = idx + 1

    // 1. Round name
    if (!m.round_name || !m.round_name.trim()) {
      errors.push({
        matchIndex: idx,
        field: 'round_name',
        message: `Match ${matchNum}: Round name is required.`,
      })
    }

    // 2. Map name
    const validMap = SUPPORTED_MAPS.some((item) => item.id === m.map_name)
    if (!validMap) {
      errors.push({
        matchIndex: idx,
        field: 'map_name',
        message: `Match ${matchNum}: Invalid map selection "${m.map_name}".`,
      })
    }

    // 3. Match type
    const validType = SUPPORTED_MATCH_TYPES.some((item) => item.id === m.match_type)
    if (!validType) {
      errors.push({
        matchIndex: idx,
        field: 'match_type',
        message: `Match ${matchNum}: Invalid match type selection "${m.match_type}".`,
      })
    }

    // 4. Scheduled time presence & validity
    if (!m.scheduled_date || !m.scheduled_time_val) {
      errors.push({
        matchIndex: idx,
        field: 'scheduled_time',
        message: `Match ${matchNum}: Scheduled date and time are required.`,
      })
    } else {
      const schedTimestamp = new Date(`${m.scheduled_date}T${m.scheduled_time_val}`).getTime()
      if (isNaN(schedTimestamp)) {
        errors.push({
          matchIndex: idx,
          field: 'scheduled_time',
          message: `Match ${matchNum}: Invalid scheduled timestamp format.`,
        })
      } else {
        // 5. Room release time check (must be <= scheduled_time)
        if (m.room_release_date && m.room_release_time_val) {
          const roomTimestamp = new Date(`${m.room_release_date}T${m.room_release_time_val}`).getTime()
          if (!isNaN(roomTimestamp) && roomTimestamp > schedTimestamp) {
            errors.push({
              matchIndex: idx,
              field: 'room_release_time',
              message: `Match ${matchNum}: Room release time cannot be after the scheduled match time.`,
            })
          }
        }

        // 6. Chronology & 15-minute spacing vs previous match
        if (prevMatchTime !== null) {
          if (schedTimestamp < prevMatchTime) {
            errors.push({
              matchIndex: idx,
              field: 'scheduled_time',
              message: `Match ${matchNum} cannot occur before Match ${idx}.`,
            })
          } else {
            const diffMinutes = (schedTimestamp - prevMatchTime) / (60 * 1000)
            if (diffMinutes < MIN_SPACING_MINUTES) {
              errors.push({
                matchIndex: idx,
                field: 'scheduled_time',
                message: `Match ${matchNum} must start at least ${MIN_SPACING_MINUTES} minutes after Match ${idx}.`,
              })
            }
          }
        }

        prevMatchTime = schedTimestamp
      }
    }
  })

  return {
    isValid: errors.length === 0,
    errors,
  }
}

// ============================================================================
// MAIN COMPONENT: MatchScheduleModal
// ============================================================================

export default function MatchScheduleModal({
  isOpen = false,
  onClose,
  tournament = null,
  onScheduleSaved,
}) {
  const { showSuccess, showError } = useToast()

  const [matches, setMatches] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [serverError, setServerError] = useState(null)
  const [addMatchWarning, setAddMatchWarning] = useState(null)

  // Tournament context identifiers
  const tournamentId = tournament?.id
  const tournamentTitle = tournament?.title || 'Tournament'

  // Load existing tournament matches or initialize with default
  const loadExistingMatches = useCallback(async () => {
    if (!tournamentId) return
    setIsLoading(true)
    setServerError(null)
    setAddMatchWarning(null)

    try {
      const records = await fetchTournamentMatches(tournamentId)

      if (Array.isArray(records) && records.length > 0) {
        const mapped = records.map((rec, idx) => {
          const sched = splitISODateTime(rec.scheduled_time)
          const room = splitISODateTime(rec.room_release_time)

          return {
            id: rec.id,
            match_number: rec.match_number || idx + 1,
            round_number: rec.round_number || idx + 1,
            round_name: rec.round_name || `Round ${idx + 1}`,
            match_type: rec.match_type || 'Battle Royale',
            map_name: rec.map_name || 'Bermuda',
            scheduled_date: sched.date,
            scheduled_time_val: sched.time,
            scheduled_time: rec.scheduled_time,
            room_release_date: room.date,
            room_release_time_val: room.time,
            room_release_time: rec.room_release_time,
            status: rec.status || 'Scheduled',
            isPersisted: true,
          }
        })
        setMatches(mapped)
      } else {
        // Initialize with default single match
        const initialMatch = calculateNextMatchDefaults([], tournament || {})
        setMatches([initialMatch])
      }
    } catch (err) {
      console.error('[MatchScheduleModal] Error loading matches:', err)
      setServerError('Failed to load existing match schedule from server.')
      const initialMatch = calculateNextMatchDefaults([], tournament || {})
      setMatches([initialMatch])
    } finally {
      setIsLoading(false)
    }
  }, [tournamentId, tournament])

  useEffect(() => {
    if (isOpen) {
      loadExistingMatches()
    } else {
      setMatches([])
      setServerError(null)
      setAddMatchWarning(null)
    }
  }, [isOpen, loadExistingMatches])

  // Real-time schedule validation
  const validation = useMemo(() => {
    return validateMatchSchedule(matches)
  }, [matches])

  // Map of matchIndex -> array of errors for targeted inline feedback
  const errorsByMatch = useMemo(() => {
    const map = {}
    validation.errors.forEach((err) => {
      if (err.matchIndex !== undefined) {
        if (!map[err.matchIndex]) map[err.matchIndex] = []
        map[err.matchIndex].push(err)
      }
    })
    return map
  }, [validation])

  // Field change handler
  const handleFieldChange = (index, field, value) => {
    setServerError(null)
    setAddMatchWarning(null)

    setMatches((prev) => {
      const updated = [...prev]
      const current = { ...updated[index], [field]: value }

      // Update combined ISO timestamps if date/time changes
      if (field === 'scheduled_date' || field === 'scheduled_time_val') {
        const date = field === 'scheduled_date' ? value : current.scheduled_date
        const time = field === 'scheduled_time_val' ? value : current.scheduled_time_val
        current.scheduled_time = combineDateAndTime(date, time)
      }

      if (field === 'room_release_date' || field === 'room_release_time_val') {
        const date = field === 'room_release_date' ? value : current.room_release_date
        const time = field === 'room_release_time_val' ? value : current.room_release_time_val
        current.room_release_time = combineDateAndTime(date, time)
      }

      updated[index] = current
      return updated
    })
  }

  // Add Match Action
  const handleAddMatch = () => {
    setServerError(null)
    if (matches.length >= MAX_MATCHES) {
      setAddMatchWarning(`Maximum of ${MAX_MATCHES} matches allowed per tournament.`)
      return
    }

    setAddMatchWarning(null)
    const newMatch = calculateNextMatchDefaults(matches, tournament || {})
    setMatches((prev) => [...prev, newMatch])
  }

  // Delete Match Action
  const handleDeleteMatch = async (index) => {
    if (matches.length <= MIN_MATCHES) {
      showError(`At least ${MIN_MATCHES} match is required.`, 'Delete Match')
      return
    }

    const targetMatch = matches[index]

    // Rule: Never delete Live, Completed, or Cancelled match
    if (['Live', 'Completed', 'Cancelled'].includes(targetMatch.status)) {
      showError(`Cannot delete a ${targetMatch.status} match.`, 'Action Forbidden')
      return
    }

    // Persisted match: delete via authoritative service
    if (targetMatch.id) {
      setDeletingId(targetMatch.id)
      setServerError(null)
      try {
        const res = await deleteTournamentMatch(targetMatch.id)
        if (!res.success) {
          setServerError(res.error || 'Server rejected match deletion.')
          showError(res.error || 'Failed to delete match.', 'Match Error')
          return
        }
        showSuccess(`Match #${targetMatch.match_number} deleted successfully.`, 'Match Deleted')
      } catch (err) {
        setServerError('Unexpected error deleting match.')
        showError(err?.message || 'Delete operation failed.', 'Match Error')
        return
      } finally {
        setDeletingId(null)
      }
    }

    // Local state re-sequencing
    setMatches((prev) => {
      const remaining = prev.filter((_, i) => i !== index)
      // Renumber contiguous sequence
      return remaining.map((m, idx) => ({
        ...m,
        match_number: idx + 1,
        round_number: m.round_number || idx + 1,
        round_name: m.round_name || `Round ${idx + 1}`,
      }))
    })
  }

  // Save Schedule Action
  const handleSaveSchedule = async () => {
    setServerError(null)
    setAddMatchWarning(null)

    if (!tournamentId) {
      setServerError('Tournament ID is missing.')
      return
    }

    // Client-side pre-validation
    const preCheck = validateMatchSchedule(matches)
    if (!preCheck.isValid) {
      setServerError(preCheck.errors[0]?.message || 'Please fix schedule validation errors before saving.')
      return
    }

    if (isSaving) return
    setIsSaving(true)

    try {
      // Build clean N2.2 payload
      const payload = matches.map((m, idx) => ({
        match_number: idx + 1,
        round_number: Number(m.round_number) || idx + 1,
        round_name: (m.round_name || `Round ${idx + 1}`).trim(),
        match_type: m.match_type || 'Battle Royale',
        map_name: m.map_name || 'Bermuda',
        scheduled_time: m.scheduled_time || combineDateAndTime(m.scheduled_date, m.scheduled_time_val),
        room_release_time:
          m.room_release_time || combineDateAndTime(m.room_release_date, m.room_release_time_val) || null,
      }))

      const res = await scheduleTournamentMatches(tournamentId, payload)

      if (res && res.success) {
        showSuccess(
          res.message || `Successfully configured ${res.match_count || payload.length} matches.`,
          'Schedule Saved'
        )
        if (onScheduleSaved) {
          onScheduleSaved(res, payload)
        }
        onClose()
      } else {
        const errorMsg = res?.error || res?.message || 'Server rejected match schedule configuration.'
        setServerError(errorMsg)
        showError(errorMsg, 'Scheduling Failed')
      }
    } catch (err) {
      console.error('[MatchScheduleModal] Save error:', err)
      const errorMsg = err?.message || 'Unexpected network or database failure.'
      setServerError(errorMsg)
      showError(errorMsg, 'Scheduling Exception')
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-schedule-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md overflow-hidden animate-fadeIn"
    >
      {/* Modal Container */}
      <div className="w-full max-w-4xl h-full sm:h-auto sm:max-h-[92vh] bg-[#131315] border-0 sm:border border-[#27272a] sm:rounded-2xl flex flex-col shadow-2xl overflow-hidden relative font-body text-white">
        
        {/* ==================================================================== */}
        {/* 1. HEADER                                                           */}
        {/* ==================================================================== */}
        <header className="px-4 sm:px-6 py-4 bg-[#141416] border-b border-[#27272a] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-[#00f2ff]/10 border border-[#00f2ff]/30 flex items-center justify-center text-[#00f2ff] shrink-0">
              <Swords className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2
                id="modal-schedule-title"
                className="font-headline text-base sm:text-lg font-bold text-white uppercase tracking-tight truncate flex items-center gap-2"
              >
                <span>Schedule Matches</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#1c1b1c] border border-[#27272a] text-[#849495] font-mono font-normal">
                  Multi-Round
                </span>
              </h2>
              <p className="text-xs text-[#849495] truncate font-body">
                {tournamentTitle} &bull; ID: {String(tournamentId || '').substring(0, 8)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            aria-label="Close match schedule modal"
            className="p-2 text-[#849495] hover:text-white hover:bg-[#1c1b1c] border border-transparent hover:border-[#27272a] rounded-lg transition-colors cursor-pointer disabled:opacity-50 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* ==================================================================== */}
        {/* 2. SUMMARY / MODE BAR                                               */}
        {/* ==================================================================== */}
        <div className="px-4 sm:px-6 py-3 bg-[#18181b] border-b border-[#27272a] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0 text-xs">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 bg-[#141416] px-3 py-1 rounded border border-[#27272a]">
              <Layers className="w-3.5 h-3.5 text-[#00f2ff]" />
              <span className="text-[#849495] font-label-bold uppercase">Matches:</span>
              <span className="font-headline font-bold text-white">
                {matches.length} / {MAX_MATCHES}
              </span>
            </div>

            <div className="flex items-center gap-1.5 bg-[#141416] px-3 py-1 rounded border border-[#27272a]">
              <Clock className="w-3.5 h-3.5 text-[#fed83a]" />
              <span className="text-[#849495]">Min Spacing:</span>
              <span className="font-mono text-white">15 mins</span>
            </div>
          </div>

          <div>
            {validation.isValid ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/30 font-headline font-bold uppercase text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Schedule Valid</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-950/40 text-[#fed83a] border border-amber-500/40 font-headline font-bold uppercase text-[11px]">
                <AlertCircle className="w-3.5 h-3.5 text-[#fed83a]" />
                <span>Issues ({validation.errors.length})</span>
              </span>
            )}
          </div>
        </div>

        {/* Global Error Banners */}
        {serverError && (
          <div
            role="alert"
            className="mx-4 sm:mx-6 mt-4 p-3 rounded-lg bg-red-950/40 border border-red-500/40 text-red-200 text-xs flex items-start gap-2.5 animate-fadeIn"
          >
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <strong className="font-bold text-white block">Scheduling Error</strong>
              <span>{serverError}</span>
            </div>
            <button
              type="button"
              onClick={() => setServerError(null)}
              className="text-red-400 hover:text-white"
              aria-label="Dismiss error"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {addMatchWarning && (
          <div
            role="alert"
            className="mx-4 sm:mx-6 mt-4 p-3 rounded-lg bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs flex items-start gap-2.5 animate-fadeIn"
          >
            <AlertCircle className="w-4 h-4 text-[#fed83a] shrink-0 mt-0.5" />
            <div className="flex-1">{addMatchWarning}</div>
            <button
              type="button"
              onClick={() => setAddMatchWarning(null)}
              className="text-amber-400 hover:text-white"
              aria-label="Dismiss warning"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ==================================================================== */}
        {/* 3. SCROLLABLE MATCH LIST                                            */}
        {/* ==================================================================== */}
        <main className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 pb-32 sm:pb-36 space-y-4">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-[#849495]">
              <Loader2 className="w-8 h-8 text-[#00f2ff] animate-spin" />
              <p className="text-xs font-mono">Loading tournament match schedule...</p>
            </div>
          ) : (
            <>
              {matches.map((match, idx) => {
                const matchErrors = errorsByMatch[idx] || []
                const isSingle = matches.length === 1
                const isTerminal = ['Live', 'Completed', 'Cancelled'].includes(match.status)

                return (
                  <article
                    key={match.id || `local-match-${idx}`}
                    className={`bg-[#141416] border rounded-xl p-4 sm:p-5 transition-all shadow-md relative ${
                      matchErrors.length > 0
                        ? 'border-red-500/50 bg-red-950/5'
                        : 'border-[#27272a] hover:border-[#3f3f46]'
                    }`}
                  >
                    {/* Match Card Header */}
                    <div className="flex items-center justify-between border-b border-[#27272a] pb-3 mb-4">
                      <div className="flex items-center gap-2.5">
                        <span className="font-headline font-extrabold text-sm sm:text-base text-[#00f2ff] tracking-wide">
                          MATCH {String(match.match_number || idx + 1).padStart(2, '0')}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-mono uppercase border ${
                            match.isPersisted
                              ? 'bg-[#1c1b1c] text-[#b9cacb] border-[#27272a]'
                              : 'bg-[#00f2ff]/10 text-[#00f2ff] border-[#00f2ff]/30'
                          }`}
                        >
                          {match.isPersisted ? match.status || 'Scheduled' : 'Unsaved Draft'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-[#849495] font-mono hidden sm:inline">
                          Match {idx + 1} / {matches.length}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleDeleteMatch(idx)}
                          disabled={isSingle || isTerminal || isSaving || deletingId === match.id}
                          aria-label={`Delete Match ${idx + 1}`}
                          title={
                            isSingle
                              ? 'At least 1 match is required'
                              : isTerminal
                              ? `Cannot delete a ${match.status} match`
                              : `Delete Match ${idx + 1}`
                          }
                          className="p-2 text-[#849495] hover:text-red-400 hover:bg-red-950/20 border border-transparent hover:border-red-500/30 rounded-lg transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed min-h-[44px] min-w-[44px] flex items-center justify-center"
                        >
                          {deletingId === match.id ? (
                            <Loader2 className="w-4 h-4 text-red-400 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Match Form Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      
                      {/* 1. Round Name */}
                      <div className="space-y-1.5">
                        <label
                          htmlFor={`round-name-${idx}`}
                          className="block text-[11px] font-headline font-bold text-[#b9cacb] uppercase tracking-wide"
                        >
                          Round Name *
                        </label>
                        <input
                          id={`round-name-${idx}`}
                          type="text"
                          value={match.round_name}
                          onChange={(e) => handleFieldChange(idx, 'round_name', e.target.value)}
                          placeholder="e.g. Round 1 / Grand Finals"
                          disabled={isSaving}
                          className="w-full bg-[#1c1b1c] border border-[#27272a] rounded-lg px-3 py-2.5 text-xs text-white placeholder-[#849495] focus:border-[#00f2ff] focus:outline-none focus:ring-1 focus:ring-[#00f2ff] min-h-[44px] transition-colors"
                        />
                      </div>

                      {/* 2. Match Type Dropdown */}
                      <div className="space-y-1.5">
                        <label
                          htmlFor={`match-type-${idx}`}
                          className="block text-[11px] font-headline font-bold text-[#b9cacb] uppercase tracking-wide"
                        >
                          Match Type *
                        </label>
                        <div className="relative">
                          <select
                            id={`match-type-${idx}`}
                            value={match.match_type}
                            onChange={(e) => handleFieldChange(idx, 'match_type', e.target.value)}
                            disabled={isSaving}
                            className="w-full bg-[#1c1b1c] border border-[#27272a] rounded-lg px-3 py-2.5 text-xs text-white focus:border-[#00f2ff] focus:outline-none focus:ring-1 focus:ring-[#00f2ff] appearance-none pr-8 min-h-[44px] transition-colors cursor-pointer"
                          >
                            {SUPPORTED_MATCH_TYPES.map((type) => (
                              <option key={type.id} value={type.id} className="bg-[#1c1b1c] text-white">
                                {type.label}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="w-4 h-4 text-[#849495] absolute right-3 top-3.5 pointer-events-none" />
                        </div>
                      </div>

                      {/* 3. Map Dropdown */}
                      <div className="space-y-1.5">
                        <label
                          htmlFor={`map-name-${idx}`}
                          className="block text-[11px] font-headline font-bold text-[#b9cacb] uppercase tracking-wide"
                        >
                          Map *
                        </label>
                        <div className="relative">
                          <select
                            id={`map-name-${idx}`}
                            value={match.map_name}
                            onChange={(e) => handleFieldChange(idx, 'map_name', e.target.value)}
                            disabled={isSaving}
                            className="w-full bg-[#1c1b1c] border border-[#27272a] rounded-lg px-3 py-2.5 text-xs text-white focus:border-[#00f2ff] focus:outline-none focus:ring-1 focus:ring-[#00f2ff] appearance-none pr-8 min-h-[44px] transition-colors cursor-pointer"
                          >
                            {SUPPORTED_MAPS.map((map) => (
                              <option key={map.id} value={map.id} className="bg-[#1c1b1c] text-white">
                                {map.label}
                              </option>
                            ))}
                          </select>
                          <MapPin className="w-4 h-4 text-[#849495] absolute right-3 top-3.5 pointer-events-none" />
                        </div>
                      </div>

                      {/* 4. Scheduled Date & Time */}
                      <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          
                          {/* Scheduled Date/Time Pair */}
                          <div className="space-y-1.5 bg-[#18181b] p-3 rounded-lg border border-[#27272a]">
                            <label className="block text-[11px] font-headline font-bold text-[#00f2ff] uppercase tracking-wide">
                              Scheduled Match Time *
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <input
                                  id={`sched-date-${idx}`}
                                  type="date"
                                  value={match.scheduled_date}
                                  onChange={(e) => handleFieldChange(idx, 'scheduled_date', e.target.value)}
                                  aria-label={`Match ${idx + 1} Scheduled Date`}
                                  disabled={isSaving}
                                  className="w-full bg-[#141416] border border-[#27272a] rounded px-2.5 py-2 text-xs text-white focus:border-[#00f2ff] focus:outline-none min-h-[44px] cursor-pointer"
                                />
                              </div>
                              <div>
                                <input
                                  id={`sched-time-${idx}`}
                                  type="time"
                                  value={match.scheduled_time_val}
                                  onChange={(e) => handleFieldChange(idx, 'scheduled_time_val', e.target.value)}
                                  aria-label={`Match ${idx + 1} Scheduled Time`}
                                  disabled={isSaving}
                                  className="w-full bg-[#141416] border border-[#27272a] rounded px-2.5 py-2 text-xs text-white focus:border-[#00f2ff] focus:outline-none min-h-[44px] cursor-pointer"
                                />
                              </div>
                            </div>
                            <span className="text-[10px] text-[#849495] block">
                              Must be at least 15 mins after previous match.
                            </span>
                          </div>

                          {/* Room Release Date/Time Pair */}
                          <div className="space-y-1.5 bg-[#18181b] p-3 rounded-lg border border-[#27272a]">
                            <label className="block text-[11px] font-headline font-bold text-[#fed83a] uppercase tracking-wide">
                              Room Release Time (Optional)
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <input
                                  id={`room-date-${idx}`}
                                  type="date"
                                  value={match.room_release_date}
                                  onChange={(e) => handleFieldChange(idx, 'room_release_date', e.target.value)}
                                  aria-label={`Match ${idx + 1} Room Release Date`}
                                  disabled={isSaving}
                                  className="w-full bg-[#141416] border border-[#27272a] rounded px-2.5 py-2 text-xs text-white focus:border-[#00f2ff] focus:outline-none min-h-[44px] cursor-pointer"
                                />
                              </div>
                              <div>
                                <input
                                  id={`room-time-${idx}`}
                                  type="time"
                                  value={match.room_release_time_val}
                                  onChange={(e) => handleFieldChange(idx, 'room_release_time_val', e.target.value)}
                                  aria-label={`Match ${idx + 1} Room Release Time`}
                                  disabled={isSaving}
                                  className="w-full bg-[#141416] border border-[#27272a] rounded px-2.5 py-2 text-xs text-white focus:border-[#00f2ff] focus:outline-none min-h-[44px] cursor-pointer"
                                />
                              </div>
                            </div>
                            <span className="text-[10px] text-[#849495] block">
                              Defaults to 15 mins before match. Must not be after match start.
                            </span>
                          </div>

                        </div>
                      </div>

                    </div>

                    {/* Inline Match Errors */}
                    {matchErrors.length > 0 && (
                      <div className="mt-3 space-y-1 pt-3 border-t border-red-500/20">
                        {matchErrors.map((err, errIdx) => (
                          <div
                            key={errIdx}
                            className="flex items-center gap-1.5 text-xs text-red-400 font-medium"
                          >
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>{err.message}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </article>
                )
              })}

              {/* Add Match Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleAddMatch}
                  disabled={matches.length >= MAX_MATCHES || isSaving}
                  className="w-full py-3 px-4 bg-[#141416] hover:bg-[#1c1b1c] border border-dashed border-[#00f2ff]/40 hover:border-[#00f2ff] text-[#00f2ff] rounded-xl text-xs font-headline font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px]"
                >
                  <Plus className="w-4 h-4" />
                  <span>
                    Add Match ({matches.length} / {MAX_MATCHES})
                  </span>
                </button>
              </div>
            </>
          )}
        </main>

        {/* ==================================================================== */}
        {/* 4. DOCKED FOOTER ACTIONS                                            */}
        {/* ==================================================================== */}
        <footer className="absolute bottom-0 left-0 right-0 p-4 sm:px-6 bg-[#141416]/95 backdrop-blur-md border-t border-[#27272a] flex items-center justify-between gap-3 z-10">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 sm:px-5 py-2.5 bg-[#1c1b1c] hover:bg-[#27272a] text-[#849495] hover:text-white border border-[#27272a] rounded-lg text-xs font-headline font-bold uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-50 min-h-[44px]"
          >
            Cancel
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSaveSchedule}
              disabled={isSaving || isLoading || !validation.isValid}
              className="px-5 sm:px-7 py-2.5 bg-[#00f2ff] hover:bg-[#74f5ff] text-[#00363a] font-headline font-extrabold rounded-lg text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_12px_rgba(0,242,255,0.25)] min-h-[44px]"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Schedule...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Save Schedule</span>
                </>
              )}
            </button>
          </div>
        </footer>

      </div>
    </div>
  )
}
