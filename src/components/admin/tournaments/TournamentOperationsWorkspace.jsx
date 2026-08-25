import { useState, useEffect, useMemo } from 'react'
import {
  Trophy,
  ArrowLeft,
  Calendar,
  Clock,
  Users,
  CreditCard,
  Key,
  Play,
  Pause,
  Square,
  RotateCcw,
  CheckCircle2,
  Lock,
  Unlock,
  Radio,
  FileText,
  Shield,
  Send,
  AlertTriangle,
  RefreshCw,
  Edit3,
  Swords,
  ChevronRight,
  Sparkles,
  Award,
  CircleDollarSign,
  Activity
} from 'lucide-react'
import AdminStatusBadge from '../AdminStatusBadge'
import RegistrationQueueView from '../RegistrationQueueView'
import { useTournaments } from '../../../contexts/TournamentContext'
import { useToast } from '../../../contexts/ToastContext'
import {
  getTournamentMode,
  calculateFilledPlayerSlots,
  calculateTotalPlayerSlots,
  calculateSlotFillPercentage
} from '../../../utils/tournamentUtils'
import { formatTournamentPrize } from '../../../utils/tournamentPrizeUtils'
import {
  isValidRoomId,
  isValidRoomPassword,
  generateRandomNumericRoomId,
  generateRandomNumericRoomPassword,
  sanitizeDigitsOnly,
} from '../../../utils/validationUtils'

export default function TournamentOperationsWorkspace({
  tournament,
  onBackToRoster,
  onEditTournament,
  updateRegistrationStatus
}) {
  const { showSuccess, showError } = useToast()
  const { updateRoomDetails, updateTournamentStatus, getRoomCredentials } = useTournaments()

  const [activeOpsSection, setActiveOpsSection] = useState('REGISTRATION') // 'REGISTRATION' | 'MATCH_CONTROL' | 'RESULTS' | 'PRIZE_PAYOUT' | 'ACTIVITY'

  // Room state
  const [roomId, setRoomId] = useState('')
  const [roomPassword, setRoomPassword] = useState('')
  const [roomStatus, setRoomStatus] = useState(tournament?.roomStatus || 'Draft')
  const [isSavingRoom, setIsSavingRoom] = useState(false)

  // Match State
  const [matchStatus, setMatchStatus] = useState(
    tournament?.status === 'Live Now' ? 'LIVE' : tournament?.status === 'Completed' ? 'ENDED' : 'LOBBY'
  )
  const [isUpdatingMatch, setIsUpdatingMatch] = useState(false)
  const [isTogglingReg, setIsTogglingReg] = useState(false)

  // Fetch secure room credentials on mount
  useEffect(() => {
    let isMounted = true
    if (tournament?.id && getRoomCredentials) {
      getRoomCredentials(tournament.id).then((res) => {
        if (isMounted && res && res.success) {
          setRoomId(res.room_id || '')
          setRoomPassword(res.room_password || '')
        }
      })
    }
    return () => {
      isMounted = false
    }
  }, [tournament?.id, getRoomCredentials])

  if (!tournament) {
    return (
      <div className="p-8 bg-[#141416] border border-[#27272a] rounded text-center space-y-3 font-body">
        <Trophy className="w-8 h-8 text-[#849495] mx-auto opacity-50" />
        <p className="text-xs text-[#849495]">No tournament selected for operations workspace.</p>
        <button
          onClick={onBackToRoster}
          className="px-4 py-2 bg-[#1c1b1c] hover:bg-[#27272a] border border-[#27272a] text-[#00f2ff] rounded text-xs font-headline font-bold uppercase transition-colors"
        >
          Back to Tournaments
        </button>
      </div>
    )
  }

  const modeInfo = getTournamentMode(tournament)
  const filledPlayers = calculateFilledPlayerSlots(tournament)
  const totalPlayers = calculateTotalPlayerSlots(tournament)
  const regTeams = Number(tournament.registeredTeams ?? tournament.registered_teams ?? 0)
  const maxTeams = Number(tournament.maxTeams ?? tournament.max_teams ?? 12)
  const fillPct = calculateSlotFillPercentage(tournament)
  const prizeDisplay = formatTournamentPrize(tournament)
  const feeDisplay = tournament.entryFee || tournament.entry_fee || 'Free'

  const isRegOpen = tournament.status === 'Registration Open' || tournament.status === 'OPEN'

  const handleToggleRegistration = async () => {
    const nextStatus = isRegOpen ? 'Bracket Locked' : 'Registration Open'
    setIsTogglingReg(true)
    try {
      if (updateTournamentStatus) {
        await updateTournamentStatus(tournament.id, nextStatus)
      }
      showSuccess(`Registration status updated to "${nextStatus}".`, 'Registration Updated')
    } catch (err) {
      showError(err, 'Failed to toggle registration')
    } finally {
      setIsTogglingReg(false)
    }
  }

  const handleSaveRoomDetails = async () => {
    const cleanRoomId = sanitizeDigitsOnly(roomId, 15)
    const cleanPassword = sanitizeDigitsOnly(roomPassword, 10)

    if (!cleanRoomId || !isValidRoomId(cleanRoomId)) {
      showError('Room ID is required and must contain numbers only (0-9).', 'Room Credentials')
      return
    }
    if (!cleanPassword || !isValidRoomPassword(cleanPassword)) {
      showError('Room Password is required and must contain numbers only (0-9).', 'Room Credentials')
      return
    }

    setIsSavingRoom(true)
    try {
      const res = await updateRoomDetails(tournament.id, {
        roomId: cleanRoomId,
        roomPassword: cleanPassword,
        roomStatus: 'Published',
      })
      if (res && res.success === false) {
        showError(res.error || 'Failed to save room details.', 'Room Error')
      } else {
        setRoomStatus('Published')
        showSuccess(`Custom Room ID ${cleanRoomId} successfully updated and published to players.`, 'Room Published')
      }
    } catch {
      showError('Failed to save room credentials.', 'Room Exception')
    } finally {
      setIsSavingRoom(false)
    }
  }

  const handleUpdateMatchState = async (newStatus, stageName) => {
    setIsUpdatingMatch(true)
    try {
      if (updateTournamentStatus && stageName) {
        await updateTournamentStatus(tournament.id, stageName)
      }
      setMatchStatus(newStatus)
      showSuccess(`Match state updated to "${newStatus}"`, 'Match Control')
    } catch {
      showError('Failed to update match state.', 'Match Control Exception')
    } finally {
      setIsUpdatingMatch(false)
    }
  }

  return (
    <div className="space-y-6 font-body antialiased">

      {/* 1. TOP MANAGEMENT HEADER & QUICK ACTION BAR */}
      <div className="bg-[#141416] border border-[#27272a] rounded p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#27272a] pb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToRoster}
              className="p-2 bg-[#1c1b1c] hover:bg-[#27272a] border border-[#27272a] text-[#849495] hover:text-white rounded transition-colors cursor-pointer"
              title="Return to Tournaments"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="font-headline text-lg sm:text-2xl font-extrabold text-white uppercase tracking-tight">
                  {tournament.title}
                </h1>
                <AdminStatusBadge status={tournament.status || 'OPEN'} size="sm" />
              </div>
              <p className="text-xs text-[#849495] font-body mt-0.5">
                {tournament.game || 'Free Fire MAX'} &bull; {tournament.format || modeInfo.label} &bull; ID: {String(tournament.id).substring(0, 8)}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {onEditTournament && (
              <button
                onClick={() => onEditTournament(tournament)}
                className="px-3 py-2 bg-[#1c1b1c] hover:bg-[#27272a] text-white border border-[#27272a] rounded text-xs font-headline font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5 text-[#00f2ff]" />
                <span>Edit</span>
              </button>
            )}

            <button
              onClick={handleToggleRegistration}
              disabled={isTogglingReg}
              className={`px-3 py-2 border rounded text-xs font-headline font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
                isRegOpen
                  ? 'bg-amber-950/40 text-[#fed83a] border-amber-500/40 hover:bg-amber-900/40'
                  : 'bg-[#00f2ff]/10 text-[#00f2ff] border-[#00f2ff]/40 hover:bg-[#00f2ff]/20'
              }`}
            >
              {isRegOpen ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
              <span>{isRegOpen ? 'Close Registration' : 'Open Registration'}</span>
            </button>

            <button
              onClick={() => setActiveOpsSection('MATCH_CONTROL')}
              className="px-3.5 py-2 bg-[#00f2ff] hover:bg-[#00f2ff]/90 text-[#00363a] font-headline font-extrabold rounded text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Swords className="w-3.5 h-3.5" />
              <span>Match Control</span>
            </button>
          </div>
        </div>

        {/* 2. SUMMARY METRICS (5 CARDS) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Registered Teams */}
          <div className="bg-[#1c1b1c] border border-[#27272a] rounded p-3">
            <span className="text-[10px] text-[#849495] font-label-bold uppercase block">Registered</span>
            <div className="space-y-0.5 mt-1">
              <span className="font-headline font-bold text-white text-base sm:text-lg block">
                {regTeams} / {maxTeams} {modeInfo.teamUnit}
              </span>
              <div className="w-full h-1.5 bg-[#27272a] rounded-full overflow-hidden border border-[#3f3f46]/50 mt-1">
                <div className="h-full bg-[#00f2ff]" style={{ width: `${Math.min(fillPct, 100)}%` }} />
              </div>
            </div>
          </div>

          {/* Player Capacity */}
          <div className="bg-[#1c1b1c] border border-[#27272a] rounded p-3">
            <span className="text-[10px] text-[#849495] font-label-bold uppercase block">Players</span>
            <span className="font-headline font-bold text-[#00f2ff] text-base sm:text-lg block mt-1">
              {filledPlayers} / {totalPlayers}
            </span>
          </div>

          {/* Prize Pool */}
          <div className="bg-[#1c1b1c] border border-[#27272a] rounded p-3">
            <span className="text-[10px] text-[#849495] font-label-bold uppercase block">Prize Pool</span>
            <span className="font-headline font-bold text-[#fed83a] text-base sm:text-lg block mt-1">
              {prizeDisplay}
            </span>
          </div>

          {/* Entry Fee */}
          <div className="bg-[#1c1b1c] border border-[#27272a] rounded p-3">
            <span className="text-[10px] text-[#849495] font-label-bold uppercase block">Entry Fee</span>
            <span className="font-headline font-bold text-[#10b981] text-base sm:text-lg block mt-1">
              {feeDisplay}
            </span>
          </div>

          {/* Start Date */}
          <div className="bg-[#1c1b1c] border border-[#27272a] rounded p-3 col-span-2 sm:col-span-1">
            <span className="text-[10px] text-[#849495] font-label-bold uppercase block">Start Date</span>
            <span className="font-headline font-bold text-white text-xs sm:text-sm block mt-1 truncate">
              {tournament.startDate || tournament.start_date || 'TBD'}
            </span>
          </div>
        </div>

        {/* 3. MODULAR OPERATIONS SECTION TABS */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-headline font-bold pt-1">
          {[
            { id: 'REGISTRATION', label: 'REGISTRATION QUEUE', icon: Users },
            { id: 'MATCH_CONTROL', label: 'MATCH CONTROL', icon: Swords },
            { id: 'RESULTS', label: 'RESULTS', icon: Award },
            { id: 'PRIZE_PAYOUT', label: 'PRIZE / PAYOUT', icon: CircleDollarSign },
            { id: 'ACTIVITY', label: 'ACTIVITY LOGS', icon: Activity },
          ].map((tab) => {
            const Icon = tab.icon
            const active = activeOpsSection === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveOpsSection(tab.id)}
                className={`px-3.5 py-2 rounded transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
                  active
                    ? 'bg-[#00f2ff] text-[#00363a] font-extrabold shadow-sm'
                    : 'bg-[#1c1b1c] text-[#849495] hover:text-white border border-[#27272a]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 4. MODULAR SECTION CONTENT */}

      {/* SECTION A: REGISTRATION QUEUE (Filtered to this tournament) */}
      {activeOpsSection === 'REGISTRATION' && (
        <div className="space-y-4">
          <RegistrationQueueView
            tournaments={[tournament]}
            updateRegistrationStatus={updateRegistrationStatus}
          />
        </div>
      )}

      {/* SECTION B: MATCH CONTROL & ROOM MANAGEMENT */}
      {activeOpsSection === 'MATCH_CONTROL' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Room Credentials Card */}
          <div className="bg-[#141416] border border-[#27272a] rounded p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
              <h3 className="font-headline text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                <Key className="w-4 h-4 text-[#00f2ff]" />
                <span>Custom Room Credentials</span>
              </h3>
              <span className="px-2 py-0.5 bg-[#00f2ff]/10 text-[#00f2ff] border border-[#00f2ff]/30 text-[9px] font-headline font-bold rounded uppercase">
                {roomStatus}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[10px] text-[#849495] font-headline font-bold uppercase">
                    Custom Room ID <span className="text-[#00f2ff]">(NUMBERS ONLY)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setRoomId(generateRandomNumericRoomId(10))}
                    className="text-[10px] text-[#00f2ff] hover:text-white font-mono flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3 text-[#00f2ff]" />
                    <span>Auto-Gen ID</span>
                  </button>
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={roomId}
                  onChange={(e) => setRoomId(sanitizeDigitsOnly(e.target.value, 15))}
                  placeholder="e.g. 5839174261"
                  className="w-full bg-[#1c1b1c] border border-[#27272a] rounded px-3 py-2 text-white font-mono focus:border-[#00f2ff] focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[10px] text-[#849495] font-headline font-bold uppercase">
                    Room Password <span className="text-[#ff5e07]">(NUMBERS ONLY)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setRoomPassword(generateRandomNumericRoomPassword(8))}
                    className="text-[10px] text-[#ff5e07] hover:text-white font-mono flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3 text-[#ff5e07]" />
                    <span>Auto-Gen PIN</span>
                  </button>
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={roomPassword}
                  onChange={(e) => setRoomPassword(sanitizeDigitsOnly(e.target.value, 10))}
                  placeholder="e.g. 84920173"
                  className="w-full bg-[#1c1b1c] border border-[#27272a] rounded px-3 py-2 text-white font-mono focus:border-[#00f2ff] focus:outline-none"
                />
              </div>

              <button
                onClick={handleSaveRoomDetails}
                disabled={isSavingRoom}
                className="w-full py-2.5 bg-[#00f2ff] hover:bg-[#00f2ff]/90 text-[#00363a] font-headline font-extrabold rounded text-xs uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
              >
                {isSavingRoom ? 'Publishing...' : 'Save & Publish Room Credentials'}
              </button>
            </div>
          </div>

          {/* Live Match State Controls */}
          <div className="bg-[#141416] border border-[#27272a] rounded p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
              <h3 className="font-headline text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                <Radio className="w-4 h-4 text-[#ff5e07]" />
                <span>Live Match State Controls</span>
              </h3>
              <span className="px-2 py-0.5 bg-[#ff5e07]/10 text-[#ff5e07] border border-[#ff5e07]/30 text-[9px] font-headline font-bold rounded uppercase">
                STATE: {matchStatus}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <button
                onClick={() => handleUpdateMatchState('LIVE', 'Live Now')}
                disabled={isUpdatingMatch || matchStatus === 'LIVE'}
                className="p-3 bg-[#10b981]/10 hover:bg-[#10b981]/20 border border-[#10b981]/40 text-[#10b981] rounded font-headline font-bold uppercase transition-all flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer"
              >
                <Play className="w-4 h-4" />
                <span>Start Match</span>
              </button>

              <button
                onClick={() => handleUpdateMatchState('PAUSED', 'Live Now')}
                disabled={isUpdatingMatch || matchStatus === 'PAUSED'}
                className="p-3 bg-[#ff5e07]/10 hover:bg-[#ff5e07]/20 border border-[#ff5e07]/40 text-[#ff5e07] rounded font-headline font-bold uppercase transition-all flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer"
              >
                <Pause className="w-4 h-4" />
                <span>Pause Match</span>
              </button>

              <button
                onClick={() => handleUpdateMatchState('LOBBY', 'Registration Open')}
                disabled={isUpdatingMatch || matchStatus === 'LOBBY'}
                className="p-3 bg-[#00f2ff]/10 hover:bg-[#00f2ff]/20 border border-[#00f2ff]/40 text-[#00f2ff] rounded font-headline font-bold uppercase transition-all flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Resume Lobby</span>
              </button>

              <button
                onClick={() => handleUpdateMatchState('ENDED', 'Completed')}
                disabled={isUpdatingMatch || matchStatus === 'ENDED'}
                className="p-3 bg-red-950/50 hover:bg-red-900/50 border border-red-500/40 text-red-400 rounded font-headline font-bold uppercase transition-all flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer"
              >
                <Square className="w-4 h-4" />
                <span>End Match</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECTION C: RESULTS PIPELINE */}
      {activeOpsSection === 'RESULTS' && (
        <div className="bg-[#141416] border border-[#27272a] rounded p-6 shadow-xl text-center space-y-3 font-body">
          <Award className="w-10 h-10 text-[#fed83a] mx-auto opacity-70" />
          <h3 className="font-headline text-sm font-extrabold text-white uppercase tracking-wider">
            Match Result Verification Pipeline
          </h3>
          <p className="text-xs text-[#849495] max-w-md mx-auto">
            Match scorecards, kills tally, placement points, and MVP recognition are managed through Match Operations.
          </p>
        </div>
      )}

      {/* SECTION D: PRIZE & PAYOUT */}
      {activeOpsSection === 'PRIZE_PAYOUT' && (
        <div className="bg-[#141416] border border-[#27272a] rounded p-5 space-y-4 shadow-xl">
          <div className="border-b border-[#27272a] pb-3">
            <h3 className="font-headline text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
              <CircleDollarSign className="w-4 h-4 text-[#fed83a]" />
              <span>Prize Distribution & Financial Summary</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-body">
            <div className="p-4 bg-[#1c1b1c] rounded border border-[#27272a] space-y-1">
              <span className="text-[10px] text-[#849495] uppercase font-headline font-bold">Total Pool</span>
              <span className="font-headline font-extrabold text-lg text-[#fed83a] block">{prizeDisplay}</span>
            </div>
            <div className="p-4 bg-[#1c1b1c] rounded border border-[#27272a] space-y-1">
              <span className="text-[10px] text-[#849495] uppercase font-headline font-bold">Entry Fee</span>
              <span className="font-headline font-extrabold text-lg text-[#10b981] block">{feeDisplay}</span>
            </div>
            <div className="p-4 bg-[#1c1b1c] rounded border border-[#27272a] space-y-1">
              <span className="text-[10px] text-[#849495] uppercase font-headline font-bold">Payout Status</span>
              <span className="font-headline font-extrabold text-sm text-white block">
                {tournament.status === 'Completed' ? 'Pending Distribution' : 'Locked Until Completion'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* SECTION E: ACTIVITY AUDIT STREAM */}
      {activeOpsSection === 'ACTIVITY' && (
        <div className="bg-[#141416] border border-[#27272a] rounded p-5 space-y-3 shadow-xl">
          <h3 className="font-headline text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-2 border-b border-[#27272a] pb-3">
            <Activity className="w-4 h-4 text-[#00f2ff]" />
            <span>Tournament Operational Logs</span>
          </h3>
          <div className="p-4 bg-[#1c1b1c] rounded border border-[#27272a] text-xs text-[#849495] font-body space-y-1">
            <p>Created: <span className="text-white">{tournament.created_at ? new Date(tournament.created_at).toLocaleString() : 'Recent'}</span></p>
            <p>Current Lifecycle: <span className="text-[#00f2ff] font-bold">{tournament.status}</span></p>
          </div>
        </div>
      )}

    </div>
  )
}

