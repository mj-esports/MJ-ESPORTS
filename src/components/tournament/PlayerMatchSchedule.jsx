import React, { useState, useEffect, useCallback } from 'react'
import {
  Calendar,
  Clock,
  MapPin,
  Swords,
  CheckCircle2,
  Radio,
  AlertTriangle,
  RefreshCw,
  XCircle,
} from 'lucide-react'
import { fetchTournamentMatches } from '../../services/matchSchedulingService'

/**
 * Approved player-facing match lifecycle states.
 */
const APPROVED_STATUSES = [
  'Scheduled',
  'Check-in Open',
  'Room Ready',
  'Live',
  'Completed',
  'Cancelled',
]

/**
 * Formats an ISO datetime string into human-readable compact date & time.
 * e.g., '10 Oct • 6:00 PM'
 */
function formatMatchDateTime(isoString) {
  if (!isoString) return 'TBD'
  try {
    const d = new Date(isoString)
    if (isNaN(d.getTime())) return 'TBD'
    const dateStr = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    const timeStr = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })
    return `${dateStr} • ${timeStr}`
  } catch {
    return 'TBD'
  }
}

/**
 * Formats date portion only (e.g. '10 Oct').
 */
function formatMatchDate(isoString) {
  if (!isoString) return 'TBD'
  try {
    const d = new Date(isoString)
    if (isNaN(d.getTime())) return 'TBD'
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  } catch {
    return 'TBD'
  }
}

/**
 * Formats time portion only (e.g. '6:00 PM').
 */
function formatMatchTime(isoString) {
  if (!isoString) return 'TBD'
  try {
    const d = new Date(isoString)
    if (isNaN(d.getTime())) return 'TBD'
    return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })
  } catch {
    return 'TBD'
  }
}

/**
 * Returns accessible styling and badge configuration for approved match lifecycle statuses.
 */
function getStatusConfig(status) {
  const normStatus = APPROVED_STATUSES.includes(status) ? status : 'Scheduled'

  switch (normStatus) {
    case 'Live':
      return {
        label: 'Live',
        badgeClass: 'bg-emerald-950/60 text-emerald-400 border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.2)] animate-pulse',
        cardBorder: 'border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]',
        indicator: <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block mr-1.5" />,
        ariaText: 'Status: Live',
      }
    case 'Room Ready':
      return {
        label: 'Room Ready',
        badgeClass: 'bg-cyan-950/60 text-[#00f2ff] border-cyan-500/50 shadow-[0_0_10px_rgba(0,242,255,0.2)]',
        cardBorder: 'border-cyan-500/40',
        indicator: <Radio className="w-3 h-3 text-[#00f2ff] inline-block mr-1" />,
        ariaText: 'Status: Room Ready',
      }
    case 'Check-in Open':
      return {
        label: 'Check-in Open',
        badgeClass: 'bg-amber-950/60 text-[#fed83a] border-amber-500/50',
        cardBorder: 'border-amber-500/40',
        indicator: <span className="w-2 h-2 rounded-full bg-[#fed83a] inline-block mr-1.5" />,
        ariaText: 'Status: Check-in Open',
      }
    case 'Completed':
      return {
        label: 'Completed',
        badgeClass: 'bg-[#1c1b1c] text-[#849495] border-[#27272a]',
        cardBorder: 'border-[#27272a] opacity-80',
        indicator: <CheckCircle2 className="w-3 h-3 text-slate-400 inline-block mr-1" />,
        ariaText: 'Status: Completed',
      }
    case 'Cancelled':
      return {
        label: 'Cancelled',
        badgeClass: 'bg-red-950/60 text-red-400 border-red-500/40',
        cardBorder: 'border-red-900/30 opacity-70',
        indicator: <XCircle className="w-3 h-3 text-red-400 inline-block mr-1" />,
        ariaText: 'Status: Cancelled',
      }
    case 'Scheduled':
    default:
      return {
        label: 'Scheduled',
        badgeClass: 'bg-[#1c1b1c] text-[#849495] border-[#27272a]',
        cardBorder: 'border-[#27272a] hover:border-[#00f2ff]/40 transition-colors',
        indicator: <span className="w-2 h-2 rounded-full bg-[#849495] inline-block mr-1.5" />,
        ariaText: 'Status: Scheduled',
      }
  }
}

/**
 * PlayerMatchSchedule
 *
 * Player-facing multi-match schedule component for MJ ESPORTS.
 * Consumes authoritative fetchTournamentMatches service.
 * Never exposes admin controls or room credentials.
 *
 * @param {object} props
 * @param {string} props.tournamentId - Tournament UUID or slug
 * @param {object} [props.tournament] - Parent tournament metadata
 */
export default function PlayerMatchSchedule({ tournamentId, tournament, initialMatches }) {
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadMatches = useCallback(async () => {
    if (Array.isArray(initialMatches)) {
      if (initialMatches.length === 0) {
        setMatches([])
        setLoading(false)
        return
      }
      const sanitized = initialMatches.map((m) => ({
        id: String(m.id || ''),
        match_number: Number(m.match_number) || 1,
        round_number: Number(m.round_number) || 1,
        round_name: String(m.round_name || `Round ${m.round_number || m.match_number || 1}`),
        match_type: String(m.match_type || 'Battle Royale'),
        map_name: String(m.map_name || 'Bermuda'),
        scheduled_time: m.scheduled_time || null,
        room_release_time: m.room_release_time || null,
        status: APPROVED_STATUSES.includes(m.status) ? m.status : 'Scheduled',
        room_published: Boolean(m.room_published),
      }))
      sanitized.sort((a, b) => a.match_number - b.match_number)
      setMatches(sanitized)
      setLoading(false)
      return
    }

    if (!tournamentId) {
      setMatches([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const data = await fetchTournamentMatches(tournamentId)

      // Strictly sanitize UI model — never store or expose credentials
      const sanitized = (Array.isArray(data) ? data : []).map((m) => ({
        id: String(m.id || ''),
        match_number: Number(m.match_number) || 1,
        round_number: Number(m.round_number) || 1,
        round_name: String(m.round_name || `Round ${m.round_number || m.match_number || 1}`),
        match_type: String(m.match_type || 'Battle Royale'),
        map_name: String(m.map_name || 'Bermuda'),
        scheduled_time: m.scheduled_time || null,
        room_release_time: m.room_release_time || null,
        status: APPROVED_STATUSES.includes(m.status) ? m.status : 'Scheduled',
        room_published: Boolean(m.room_published),
      }))

      // Matches are already ordered by match_number ASC by the authoritative service;
      // enforce contiguous sorted view client-side as defense in depth.
      sanitized.sort((a, b) => a.match_number - b.match_number)

      setMatches(sanitized)
    } catch (err) {
      // Do not expose raw internal error/SQL details to players
      setError('Unable to load match schedule. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [tournamentId, initialMatches])

  useEffect(() => {
    loadMatches()
  }, [loadMatches])

  // Identify next upcoming match index among non-completed, non-cancelled matches
  const nextUpcomingIndex = matches.findIndex(
    (m) => m.status === 'Scheduled' || m.status === 'Check-in Open' || m.status === 'Room Ready'
  )

  return (
    <section
      aria-label="Tournament Match Schedule"
      className="space-y-3.5 sm:space-y-4"
      data-testid="player-match-schedule"
    >
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 border-b border-[#27272a] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#00f2ff]/10 border border-[#00f2ff]/30 flex items-center justify-center text-[#00f2ff] shrink-0">
            <Swords className="w-4 h-4 text-[#00f2ff]" aria-hidden="true" />
          </div>
          <div>
            <h3 className="font-headline text-sm sm:text-base font-bold text-white uppercase tracking-wider">
              Match Schedule
            </h3>
            <span className="font-mono text-[10px] sm:text-[11px] text-[#849495] block">
              Official Competitive Fixtures
            </span>
          </div>
          {!loading && matches.length > 0 && (
            <span
              className="text-[10px] sm:text-[11px] font-mono font-bold px-2.5 py-0.5 rounded bg-[#1c1b1c] text-[#00f2ff] border border-[#00f2ff]/30 uppercase tracking-wider shrink-0"
              aria-label={`${matches.length} scheduled rounds`}
            >
              {matches.length} {matches.length === 1 ? 'Round' : 'Rounds'}
            </span>
          )}
        </div>

        {/* Player-safe reload action */}
        <button
          onClick={loadMatches}
          disabled={loading}
          aria-label="Refresh match schedule"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-[#849495] hover:text-[#00f2ff] bg-[#1c1b1c] hover:bg-[#201f20] border border-[#27272a] hover:border-[#00f2ff]/40 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed min-h-[36px]"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Loading Skeleton State */}
      {loading && (
        <div
          role="status"
          aria-busy="true"
          aria-label="Loading scheduled matches"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4"
          data-testid="schedule-loading-state"
        >
          {[1, 2, 3].map((idx) => (
            <div
              key={`schedule-skeleton-${idx}`}
              className="p-4 sm:p-5 bg-[#141416] border border-[#27272a] rounded-xl space-y-3 animate-pulse"
            >
              <div className="flex justify-between items-center">
                <div className="h-4 w-20 bg-[#1c1b1c] rounded" />
                <div className="h-5 w-24 bg-[#1c1b1c] rounded-full" />
              </div>
              <div className="h-5 w-36 bg-[#1c1b1c] rounded" />
              <div className="space-y-2 pt-2 border-t border-[#27272a]">
                <div className="h-3 w-32 bg-[#1c1b1c] rounded" />
                <div className="h-3 w-28 bg-[#1c1b1c] rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error Fallback State */}
      {!loading && error && (
        <div
          role="alert"
          className="p-5 sm:p-6 bg-red-950/20 border border-red-500/30 rounded-xl text-center space-y-3"
          data-testid="schedule-error-state"
        >
          <AlertTriangle className="w-8 h-8 text-red-400 mx-auto" aria-hidden="true" />
          <div className="space-y-1">
            <p className="text-sm font-headline font-bold text-red-200 uppercase tracking-wide">
              {error}
            </p>
            <p className="text-xs text-[#849495]">
              Please check your connection and refresh the match timeline.
            </p>
          </div>
          <button
            onClick={loadMatches}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1c1b1c] hover:bg-[#201f20] border border-[#27272a] hover:border-[#00f2ff]/40 text-white text-xs font-headline font-bold uppercase tracking-wider transition-colors cursor-pointer min-h-[38px] focus:outline-none focus:ring-2 focus:ring-[#00f2ff]"
          >
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && matches.length === 0 && (
        <div
          className="p-6 sm:p-8 text-center bg-[#141416] border border-[#27272a] rounded-xl space-y-3 shadow-md"
          data-testid="schedule-empty-state"
        >
          <div className="w-12 h-12 rounded-xl bg-[#1c1b1c] border border-[#27272a] flex items-center justify-center mx-auto text-[#849495]">
            <Calendar className="w-6 h-6 opacity-60" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-headline font-bold text-[#f5f5f5] uppercase tracking-wide">
              No matches scheduled yet.
            </p>
            <p className="text-xs text-[#849495] max-w-sm mx-auto leading-relaxed">
              Match rounds and tactical maps will appear here once finalized by tournament organizers.
            </p>
          </div>
          <div className="pt-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1c1b1c] border border-[#27272a] text-[10px] sm:text-[11px] font-mono text-[#00f2ff]">
              Awaiting Organizer Roster Lock
            </span>
          </div>
        </div>
      )}

      {/* Scheduled Matches Grid */}
      {!loading && !error && matches.length > 0 && (
        <ol
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 list-none p-0 m-0"
          data-testid="schedule-matches-list"
        >
          {matches.map((match, idx) => {
            const statusConfig = getStatusConfig(match.status)
            const isLive = match.status === 'Live'
            const isNextUp = idx === nextUpcomingIndex && !isLive

            return (
              <li
                key={match.id || `match-${match.match_number}`}
                data-testid={`player-match-card-${match.match_number}`}
                aria-label={`Match ${match.match_number}: ${match.round_name}, ${statusConfig.ariaText}`}
                className={`p-3.5 sm:p-4 bg-[#141416] rounded-xl border relative flex flex-col justify-between transition-all hover:border-[#00f2ff]/40 shadow-sm ${statusConfig.cardBorder} ${
                  isLive
                    ? 'ring-1 ring-emerald-500/40'
                    : isNextUp
                    ? 'ring-1 ring-cyan-500/30'
                    : ''
                }`}
              >
                {/* Top Row: Match Number & Status Badge */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <span className="font-headline font-black text-xs sm:text-sm uppercase tracking-wider text-white">
                        MATCH {match.match_number}
                      </span>
                      {isLive && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[9px] font-headline font-extrabold uppercase tracking-wider border border-emerald-500/40">
                          LIVE
                        </span>
                      )}
                      {isNextUp && (
                        <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-[#00f2ff] text-[9px] font-headline font-extrabold uppercase tracking-wider border border-cyan-500/40">
                          NEXT UP
                        </span>
                      )}
                    </div>

                    {/* Status Badge */}
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-headline font-bold uppercase tracking-wide border ${statusConfig.badgeClass}`}
                    >
                      {statusConfig.indicator}
                      <span>{statusConfig.label}</span>
                    </span>
                  </div>

                  {/* Round Name */}
                  <h4 className="font-headline font-bold text-sm sm:text-base text-white tracking-wide mb-2.5 truncate">
                    {match.round_name}
                  </h4>
                </div>

                {/* Match Metadata Bento */}
                <div className="p-2.5 sm:p-3 bg-[#1c1b1c] rounded-lg border border-[#27272a] space-y-2">
                  {/* Map & Match Type */}
                  <div className="flex items-center justify-between text-xs text-[#849495] font-body">
                    <span className="flex items-center gap-1.5 text-white font-medium truncate">
                      <MapPin className="w-3.5 h-3.5 text-[#00f2ff] shrink-0" aria-hidden="true" />
                      <span className="truncate">{match.map_name}</span>
                    </span>
                    <span className="flex items-center gap-1.5 text-[#ff5e07] font-medium shrink-0">
                      <Swords className="w-3.5 h-3.5 text-[#ff5e07] shrink-0" aria-hidden="true" />
                      <span>{match.match_type}</span>
                    </span>
                  </div>

                  {/* Scheduled Date & Time */}
                  <div className="flex items-center justify-between text-xs pt-1.5 border-t border-[#27272a]">
                    <span className="text-[10px] uppercase font-headline font-semibold text-[#849495] tracking-wider">
                      SCHEDULE
                    </span>
                    <span className="font-mono text-xs font-semibold text-[#f5f5f5] flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#00f2ff] shrink-0" aria-hidden="true" />
                      <span>{formatMatchDateTime(match.scheduled_time)}</span>
                    </span>
                  </div>

                  {/* Room Release Window if available */}
                  {match.room_release_time && (
                    <div className="flex items-center justify-between text-[11px] font-mono pt-1 text-[#849495]">
                      <span>ROOM UNLOCK:</span>
                      <span className="text-[#00dbe7] font-semibold">{formatMatchTime(match.room_release_time)}</span>
                    </div>
                  )}

                  {/* Explicit separate date/time representation for clear accessibility */}
                  <div className="sr-only">
                    <span>Date: {formatMatchDate(match.scheduled_time)}</span>
                    <span>Time: {formatMatchTime(match.scheduled_time)}</span>
                  </div>
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
