import { useState, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  Trophy,
  Search,
  Filter,
  Calendar,
  Clock,
  Users,
  Edit3,
  Copy,
  Trash2,
  Lock,
  Unlock,
  ChevronRight,
  Plus,
  Gamepad2,
  MoreVertical,
  AlertTriangle,
  X,
  Eye,
  CheckCircle2
} from 'lucide-react'
import AdminStatusBadge from '../AdminStatusBadge'
import {
  getTournamentMode,
  calculateFilledPlayerSlots,
  calculateTotalPlayerSlots,
  calculateSlotFillPercentage
} from '../../../utils/tournamentUtils'
import {
  TOURNAMENT_LIFECYCLE_STAGES,
  getNextLifecycleStage,
  normalizeLifecycleStatus
} from '../../../constants/tournamentLifecycle'
import { formatTournamentPrize } from '../../../utils/tournamentPrizeUtils'

export default function AllTournamentsView({
  tournaments = [],
  onSelectTournament,
  onOpenCreateWizard,
  onEditTournament,
  onDuplicateTournament,
  onDeleteTournament,
  onAdvanceStage,
  actionId,
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [gameFilter, setGameFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [dateFilter, setDateFilter] = useState('')
  const [activeMenu, setActiveMenu] = useState(null)
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState(null)

  // Close portaled menu on outside scroll or window resize
  useEffect(() => {
    if (!activeMenu) return

    const handleScrollOrResize = () => {
      setActiveMenu(null)
    }

    window.addEventListener('scroll', handleScrollOrResize, true)
    window.addEventListener('resize', handleScrollOrResize)
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true)
      window.removeEventListener('resize', handleScrollOrResize)
    }
  }, [activeMenu])

  const handleToggleMenu = (e, tournament) => {
    e.stopPropagation()
    if (activeMenu?.id === tournament.id) {
      setActiveMenu(null)
      return
    }

    const rect = e.currentTarget.getBoundingClientRect()
    const menuWidth = 176 // w-44 = 176px
    const menuHeight = 210 // max height of 5 items

    let left = rect.right - menuWidth
    if (left < 10) left = 10
    if (left + menuWidth > window.innerWidth - 10) {
      left = window.innerWidth - menuWidth - 10
    }

    const spaceBelow = window.innerHeight - rect.bottom
    const openUpwards = spaceBelow < menuHeight && rect.top > menuHeight
    const top = openUpwards ? rect.top - 4 : rect.bottom + 4

    setActiveMenu({
      id: tournament.id,
      tournament,
      left,
      top,
      openUpwards,
    })
  }

  const filteredTournaments = useMemo(() => {
    return tournaments.filter((t) => {
      const matchesSearch =
        !searchQuery.trim() ||
        t.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.game?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(t.id).toLowerCase().includes(searchQuery.toLowerCase())

      const matchesGame =
        gameFilter === 'ALL' || (t.game || '').toLowerCase().includes(gameFilter.toLowerCase())

      const matchesStatus =
        statusFilter === 'ALL' ||
        normalizeLifecycleStatus(t.status) === statusFilter ||
        String(t.status || '').toUpperCase() === statusFilter.toUpperCase()

      const matchesDate =
        !dateFilter ||
        (t.start_date && t.start_date.includes(dateFilter)) ||
        (t.startDate && t.startDate.includes(dateFilter))

      return matchesSearch && matchesGame && matchesStatus && matchesDate
    })
  }, [tournaments, searchQuery, gameFilter, statusFilter, dateFilter])

  const handleDeleteClick = (t) => {
    setActiveMenu(null)
    setDeleteConfirmTarget(t)
  }

  const confirmDelete = () => {
    if (deleteConfirmTarget && onDeleteTournament) {
      onDeleteTournament(deleteConfirmTarget)
    }
    setDeleteConfirmTarget(null)
  }

  return (
    <div className="space-y-4 font-body antialiased">
      
      {/* 1. COMPACT FILTER TOOLBAR */}
      <div className="bg-[#141416] border border-[#27272a] rounded p-3 sm:p-4 shadow-xl flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-[#849495] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tournament title or ID..."
            className="w-full bg-[#1c1b1c] border border-[#27272a] rounded pl-9 pr-3 py-2 text-xs text-white placeholder-[#849495] focus:border-[#00f2ff] focus:outline-none transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#849495] hover:text-white p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Dropdown Filters */}
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
          {/* Game Filter */}
          <div className="flex items-center gap-1.5 bg-[#1c1b1c] border border-[#27272a] rounded px-3 py-1.5 text-xs text-white">
            <Gamepad2 className="w-3.5 h-3.5 text-[#00f2ff] shrink-0" />
            <select
              value={gameFilter}
              onChange={(e) => setGameFilter(e.target.value)}
              className="bg-transparent text-xs text-white font-headline font-bold focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-[#141416]">All Games</option>
              <option value="Free Fire" className="bg-[#141416]">Free Fire MAX</option>
              <option value="BGMI" className="bg-[#141416]">BGMI Mobile</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-[#1c1b1c] border border-[#27272a] rounded px-3 py-1.5 text-xs text-white">
            <Filter className="w-3.5 h-3.5 text-[#00f2ff] shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-xs text-white font-headline font-bold focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-[#141416]">All Status</option>
              <option value="Registration Open" className="bg-[#141416]">Registration Open</option>
              <option value="Live Now" className="bg-[#141416]">Live Now</option>
              <option value="Upcoming" className="bg-[#141416]">Upcoming</option>
              <option value="Full" className="bg-[#141416]">Full</option>
              <option value="Completed" className="bg-[#141416]">Completed</option>
              <option value="Cancelled" className="bg-[#141416]">Cancelled</option>
              <option value="Draft" className="bg-[#141416]">Draft</option>
            </select>
          </div>

          {/* Date Filter */}
          <div className="flex items-center gap-1.5 bg-[#1c1b1c] border border-[#27272a] rounded px-3 py-1.5 text-xs text-white">
            <Calendar className="w-3.5 h-3.5 text-[#00f2ff] shrink-0" />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-transparent text-xs text-white focus:outline-none cursor-pointer"
            />
            {dateFilter && (
              <button
                onClick={() => setDateFilter('')}
                className="text-[#849495] hover:text-white p-0.5"
                title="Clear date filter"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. TOURNAMENTS OPERATIONS TABLE (DESKTOP >= 768px) */}
      <div className="bg-[#141416] border border-[#27272a] rounded overflow-hidden shadow-xl">
        {filteredTournaments.length === 0 ? (
          <div className="p-12 text-center space-y-3 font-body">
            <Trophy className="w-10 h-10 text-[#849495] mx-auto opacity-40" />
            <p className="text-sm font-bold text-white uppercase font-headline">
              {tournaments.length === 0 ? 'No Tournaments Found' : 'No Matching Results'}
            </p>
            <p className="text-xs text-[#849495] max-w-md mx-auto">
              {tournaments.length === 0
                ? 'No arena tournaments exist in database. Click + Create Tournament to launch the first arena.'
                : 'No tournament arenas match the search and filter criteria. Try clearing the filters.'}
            </p>
            {tournaments.length === 0 && (
              <button
                onClick={onOpenCreateWizard}
                className="mt-2 px-4 py-2 bg-[#00f2ff] hover:bg-[#74f5ff] text-[#00363a] font-headline font-bold rounded text-xs tracking-wider transition-all duration-200 border border-[#00f2ff] shadow-[0_0_12px_rgba(0,242,255,0.25)] inline-flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create First Tournament</span>
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto w-full">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#27272a] bg-[#1c1b1c] text-[#849495] text-[10px] font-headline uppercase font-bold tracking-wider">
                    <th className="py-3.5 px-4">Tournament</th>
                    <th className="py-3.5 px-4">Game / Format</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 min-w-[160px]">Registration</th>
                    <th className="py-3.5 px-4">Prize Pool / Fee</th>
                    <th className="py-3.5 px-4">Start</th>
                    <th className="py-3.5 px-4 text-right pr-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#27272a]">
                  {filteredTournaments.map((t) => {
                    const modeInfo = getTournamentMode(t)
                    const filledPlayers = calculateFilledPlayerSlots(t)
                    const totalPlayers = calculateTotalPlayerSlots(t)
                    const regTeams = Number(t.registeredTeams ?? t.registered_teams ?? 0)
                    const maxTeams = Number(t.maxTeams ?? t.max_teams ?? 12)
                    const fillPct = calculateSlotFillPercentage(t)
                    const prizeDisplay = formatTournamentPrize(t)
                    const feeDisplay = t.entryFee || t.entry_fee || 'Free'
                    const nextStage = getNextLifecycleStage(t.status)
                    const isMenuOpen = openMenuId === t.id

                    return (
                      <tr
                        key={t.id}
                        className="hover:bg-[#1c1b1c]/80 transition-colors group"
                      >
                        {/* Tournament Info */}
                        <td className="py-3.5 px-4 min-w-[200px] max-w-[280px]">
                          <span
                            onClick={() => onSelectTournament(t.id)}
                            className="font-headline font-bold text-white block truncate hover:text-[#00f2ff] cursor-pointer transition-colors"
                            title={t.title}
                          >
                            {t.title}
                          </span>
                          <span className="text-[10px] text-[#849495] font-mono block mt-0.5">
                            ID: {String(t.id).substring(0, 8)}...
                          </span>
                        </td>

                        {/* Game / Format */}
                        <td className="py-3.5 px-4">
                          <span className="font-headline font-bold text-white block">
                            {t.game || 'Free Fire MAX'}
                          </span>
                          <span className="text-xs text-[#849495] font-body block uppercase">
                            {t.format || t.match_format || `${modeInfo.label} (${modeInfo.size}P)`}
                          </span>
                        </td>

                        {/* Status Badge */}
                        <td className="py-3.5 px-4">
                          <AdminStatusBadge status={t.status || 'OPEN'} size="xs" />
                        </td>

                        {/* Registration Progress Bar */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[10px] font-body">
                              <span className="text-white font-headline font-bold">
                                {regTeams} / {maxTeams} {modeInfo.teamUnit}
                              </span>
                              <span className="text-[#849495] text-[9px]">
                                {fillPct}% ({filledPlayers}/{totalPlayers}P)
                              </span>
                            </div>
                            <div className="w-full h-2 bg-[#27272a] rounded-full overflow-hidden border border-[#3f3f46]/60">
                              <div
                                className={`h-full transition-all duration-300 ${
                                  fillPct >= 100
                                    ? 'bg-[#ff5e07]'
                                    : fillPct >= 75
                                    ? 'bg-[#fed83a]'
                                    : 'bg-[#00f2ff]'
                                }`}
                                style={{ width: `${Math.min(fillPct, 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Prize Pool & Fee */}
                        <td className="py-3.5 px-4">
                          <span className="font-headline font-bold text-[#fed83a] block">
                            {prizeDisplay}
                          </span>
                          <span className="text-[10px] text-[#849495] font-body block">
                            Fee: <span className="text-[#10b981] font-bold">{feeDisplay}</span>
                          </span>
                        </td>

                        {/* Start Schedule */}
                        <td className="py-3.5 px-4 text-[#849495] text-[11px] font-body">
                          <span className="text-white block font-headline font-bold">
                            {t.startDate || t.start_date || 'TBD'}
                          </span>
                          <span className="text-[10px] text-[#849495] block">
                            {t.startTime || t.start_time || '06:00 PM IST'}
                          </span>
                        </td>

                        {/* Actions (Manage + Overflow Menu) */}
                        <td className="py-3.5 px-4 text-right pr-4">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => onSelectTournament(t.id)}
                              className="px-3 py-1.5 bg-[#00f2ff] hover:bg-[#74f5ff] text-[#00363a] font-headline font-bold rounded text-xs uppercase tracking-wider transition-all duration-200 border border-[#00f2ff] shadow-sm cursor-pointer flex items-center gap-1"
                            >
                              <span>Manage</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>

                            {/* Dropdown Menu Trigger */}
                            <button
                              onClick={(e) => handleToggleMenu(e, t)}
                              className={`p-1.5 ${
                                activeMenu?.id === t.id
                                  ? 'bg-[#27272a] text-white border-[#00f2ff]'
                                  : 'bg-[#1c1b1c] hover:bg-[#27272a] text-[#849495] hover:text-white border-[#27272a]'
                              } border rounded transition-colors cursor-pointer`}
                              title="More Actions"
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Cards (< 768px) */}
            <div className="md:hidden divide-y divide-[#27272a]">
              {filteredTournaments.map((t) => {
                const modeInfo = getTournamentMode(t)
                const regTeams = Number(t.registeredTeams ?? t.registered_teams ?? 0)
                const maxTeams = Number(t.maxTeams ?? t.max_teams ?? 12)
                const fillPct = calculateSlotFillPercentage(t)
                const prizeDisplay = formatTournamentPrize(t)
                const feeDisplay = t.entryFee || t.entry_fee || 'Free'

                return (
                  <div key={`m-tourn-${t.id}`} className="p-4 space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span
                          onClick={() => onSelectTournament(t.id)}
                          className="font-headline font-bold text-sm text-white block truncate"
                        >
                          {t.title}
                        </span>
                        <span className="text-xs text-[#849495] font-body">
                          {t.game || 'Free Fire MAX'} &bull; {t.format || modeInfo.label}
                        </span>
                      </div>
                      <AdminStatusBadge status={t.status || 'OPEN'} size="xs" />
                    </div>

                    {/* Registration Progress */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-body text-[#849495]">
                        <span className="text-white font-bold">{regTeams} / {maxTeams} {modeInfo.teamUnit}</span>
                        <span>{fillPct}%</span>
                      </div>
                      <div className="w-full h-2 bg-[#27272a] rounded-full overflow-hidden border border-[#3f3f46]/60">
                        <div
                          className={`h-full transition-all duration-300 ${
                            fillPct >= 100
                              ? 'bg-[#ff5e07]'
                              : fillPct >= 75
                              ? 'bg-[#fed83a]'
                              : 'bg-[#00f2ff]'
                          }`}
                          style={{ width: `${Math.min(fillPct, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Financials & Schedule */}
                    <div className="flex items-center justify-between text-[11px] font-body pt-1">
                      <div>
                        <span className="text-[9px] text-[#849495] block uppercase">Prize Pool</span>
                        <span className="font-headline font-bold text-[#fed83a]">{prizeDisplay}</span>
                      </div>
                      <div className="text-center">
                        <span className="text-[9px] text-[#849495] block uppercase">Entry Fee</span>
                        <span className="font-headline font-bold text-[#10b981]">{feeDisplay}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] text-[#849495] block uppercase">Start Date</span>
                        <span className="font-headline font-bold text-white">{t.startDate || t.start_date || 'TBD'}</span>
                      </div>
                    </div>

                    {/* Primary Manage Action */}
                    <div className="flex items-center gap-2 pt-2 border-t border-[#27272a]">
                      <button
                        onClick={() => onSelectTournament(t.id)}
                        className="flex-1 py-2 bg-[#00f2ff] hover:bg-[#74f5ff] text-[#00363a] font-headline font-bold rounded text-xs uppercase tracking-wider transition-all duration-200 border border-[#00f2ff] shadow-sm flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <span>Manage</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onEditTournament(t)}
                        className="p-2 bg-[#1c1b1c] hover:bg-[#27272a] text-[#849495] hover:text-white border border-[#27272a] rounded cursor-pointer"
                        title="Edit Tournament"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* 3. CONFIRMATION MODAL FOR DELETION */}
      {deleteConfirmTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#141416] border border-[#27272a] rounded p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400">
              <div className="w-9 h-9 rounded bg-red-950/60 border border-red-500/30 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="font-headline font-extrabold text-sm uppercase text-white">
                  Confirm Tournament Deletion
                </h3>
                <p className="text-xs text-[#849495] font-body">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-[#b9cacb] font-body">
              Are you sure you want to permanently delete tournament{' '}
              <span className="font-bold text-white font-headline">"{deleteConfirmTarget.title}"</span>? All associated match sessions and registration linkages will be removed.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmTarget(null)}
                className="flex-1 py-2 bg-[#1c1b1c] hover:bg-[#27272a] text-[#849495] hover:text-white border border-[#27272a] rounded text-xs font-headline font-bold uppercase transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white rounded text-xs font-headline font-bold uppercase transition-colors cursor-pointer shadow-lg shadow-red-600/30"
              >
                Delete Tournament
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. PORTALED ACTION DROPDOWN MENU (Escapes table overflow/scroll clipping completely) */}
      {activeMenu && typeof document !== 'undefined' && createPortal(
        <>
          {/* Invisible Backdrop to capture clicks outside */}
          <div
            className="fixed inset-0 z-[9998]"
            onClick={() => setActiveMenu(null)}
          />

          {/* Floating Dropdown Menu positioned fixed relative to trigger button */}
          <div
            style={{
              position: 'fixed',
              top: activeMenu.openUpwards ? undefined : `${activeMenu.top}px`,
              bottom: activeMenu.openUpwards ? `${window.innerHeight - activeMenu.top}px` : undefined,
              left: `${activeMenu.left}px`,
            }}
            className="z-[9999] w-44 bg-[#141416] border border-[#27272a] rounded shadow-2xl py-1 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                const tournId = activeMenu.tournament.id
                setActiveMenu(null)
                onSelectTournament(tournId)
              }}
              className="w-full px-3 py-1.5 text-xs text-[#b9cacb] hover:text-white hover:bg-[#1c1b1c] flex items-center gap-2 text-left cursor-pointer transition-colors"
            >
              <Eye className="w-3.5 h-3.5 text-[#00f2ff]" />
              <span>View Operations</span>
            </button>

            <button
              onClick={() => {
                const t = activeMenu.tournament
                setActiveMenu(null)
                onEditTournament(t)
              }}
              className="w-full px-3 py-1.5 text-xs text-[#b9cacb] hover:text-white hover:bg-[#1c1b1c] flex items-center gap-2 text-left cursor-pointer transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5 text-[#00f2ff]" />
              <span>Edit Tournament</span>
            </button>

            <button
              onClick={() => {
                const t = activeMenu.tournament
                setActiveMenu(null)
                onDuplicateTournament(t)
              }}
              className="w-full px-3 py-1.5 text-xs text-[#b9cacb] hover:text-white hover:bg-[#1c1b1c] flex items-center gap-2 text-left cursor-pointer transition-colors"
            >
              <Copy className="w-3.5 h-3.5 text-[#fed83a]" />
              <span>Duplicate Arena</span>
            </button>

            {getNextLifecycleStage(activeMenu.tournament.status) && (
              <button
                onClick={() => {
                  const t = activeMenu.tournament
                  setActiveMenu(null)
                  onAdvanceStage(t)
                }}
                className="w-full px-3 py-1.5 text-xs text-[#10b981] hover:text-white hover:bg-[#1c1b1c] flex items-center gap-2 text-left cursor-pointer font-bold transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Advance → {getNextLifecycleStage(activeMenu.tournament.status)}</span>
              </button>
            )}

            <div className="border-t border-[#27272a] my-1" />

            <button
              onClick={() => {
                const t = activeMenu.tournament
                setActiveMenu(null)
                handleDeleteClick(t)
              }}
              className="w-full px-3 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/40 flex items-center gap-2 text-left cursor-pointer transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Tournament</span>
            </button>
          </div>
        </>,
        document.body
      )}

    </div>
  )
}
