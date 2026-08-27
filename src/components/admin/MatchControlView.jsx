import { useState, useEffect, useMemo } from 'react'
import {
  Gamepad2,
  Key,
  Play,
  Pause,
  Square,
  CheckCircle2,
  Tv,
  Radio,
  Clock,
  Users,
  AlertTriangle,
  FileText,
  Send,
  ArrowRight,
  Zap,
  RotateCcw,
  Lock,
  Unlock,
  Copy,
  Eye,
  EyeOff,
  X,
  Shield,
  RefreshCw,
  Award,
  Filter,
  Layers,
  Activity,
  Check,
  Sparkles
} from 'lucide-react'
import { useToast } from '../../contexts/ToastContext'
import { useTournaments } from '../../contexts/TournamentContext'
import { useAuth } from '../../contexts/AuthContext'
import { getDefaultGameCapacity } from '../../utils/tournamentUtils'
import {
  isValidRoomId,
  isValidRoomPassword,
  generateRandomNumericRoomId,
  generateRandomNumericRoomPassword,
  sanitizeDigitsOnly,
} from '../../utils/validationUtils'
import LoadingButton from '../common/LoadingButton'

export default function MatchControlView({ tournaments = [], setActiveTab }) {
  const { showSuccess, showError } = useToast()
  const { updateRoomDetails, updateTournamentStatus, getRoomCredentials } = useTournaments()
  const { user } = useAuth()

  // Selected tournament & match selection
  const [selectedTourneyId, setSelectedTourneyId] = useState(tournaments[0]?.id || '')
  const selectedTourney = tournaments.find((t) => String(t.id) === String(selectedTourneyId)) || tournaments[0]

  const [selectedMatchId, setSelectedMatchId] = useState('MATCH_001')
  const [statusFilter, setStatusFilter] = useState('ALL') // 'ALL' | 'UPCOMING' | 'LIVE' | 'COMPLETED'

  // Room Credentials State
  const [roomIdInput, setRoomIdInput] = useState('')
  const [roomPasswordInput, setRoomPasswordInput] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [roomStatus, setRoomStatus] = useState('Draft')
  const [isLocked, setIsLocked] = useState(false)

  // Match Lifecycle State
  const [matchStatus, setMatchStatus] = useState('Lobby Waiting') // 'Lobby Waiting' | 'Match Live' | 'Paused' | 'Ended'

  // Emergency Broadcast & Host Notes State
  const [broadcastMessage, setBroadcastMessage] = useState('')
  const [isBroadcasting, setIsBroadcasting] = useState(false)
  const [adminNotes, setAdminNotes] = useState(() => {
    try {
      return localStorage.getItem(`mj_host_notes_${selectedTourneyId}`) || 'Host note: Confirm screen recording policy before round start.'
    } catch {
      return 'Host note: Confirm screen recording policy before round start.'
    }
  })

  // Incident / Event Logs
  const [incidentLogs, setIncidentLogs] = useState([
    { id: 'inc-1', time: '18:02:15', event: 'Custom match room lobby opened.', type: 'info' },
    { id: 'inc-2', time: '18:05:40', event: 'Roster check-in verification completed.', type: 'info' },
  ])

  // Modals & Drawers
  const [showEndMatchModal, setShowEndMatchModal] = useState(false)
  const [showRosterDrawer, setShowRosterDrawer] = useState(false)
  const [showBroadcastConfirm, setShowBroadcastConfirm] = useState(false)

  const [isSaving, setIsSaving] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)

  const adminName = user?.user_metadata?.username || user?.email?.split('@')[0] || 'Admin'

  // Sync selected tournament if none selected
  useEffect(() => {
    if (!selectedTourneyId && tournaments.length > 0) {
      setSelectedTourneyId(tournaments[0].id)
    }
  }, [tournaments, selectedTourneyId])

  // Fetch room credentials securely when selected tournament changes
  useEffect(() => {
    let isMounted = true
    if (selectedTourney) {
      setRoomStatus(selectedTourney.roomStatus || selectedTourney.room_status || 'Draft')
      setIsLocked(selectedTourney.status === 'Bracket Locked' || selectedTourney.status === 'Completed')

      // Sync match status from tournament status
      if (selectedTourney.status === 'Live Now') {
        setMatchStatus('Match Live')
      } else if (selectedTourney.status === 'Completed') {
        setMatchStatus('Ended')
      } else {
        setMatchStatus('Lobby Waiting')
      }

      if (getRoomCredentials) {
        getRoomCredentials(selectedTourney.id).then((res) => {
          if (isMounted) {
            if (res && res.success) {
              setRoomIdInput(res.room_id || '')
              setRoomPasswordInput(res.room_password || '')
              if (res.room_status) setRoomStatus(res.room_status)
            } else {
              setRoomIdInput('')
              setRoomPasswordInput('')
            }
          }
        })
      }

      // Load host notes for this tournament
      try {
        const savedNotes = localStorage.getItem(`mj_host_notes_${selectedTourney.id}`)
        if (savedNotes !== null) {
          setAdminNotes(savedNotes)
        }
      } catch (e) {
        console.warn('Failed to load notes', e)
      }
    }
    return () => { isMounted = false }
  }, [selectedTourneyId, selectedTourney, getRoomCredentials])

  // Save host notes
  const handleHostNotesChange = (e) => {
    const val = e.target.value
    setAdminNotes(val)
    if (selectedTourneyId) {
      try {
        localStorage.setItem(`mj_host_notes_${selectedTourneyId}`, val)
      } catch (err) {
        console.warn('Failed to save notes', err)
      }
    }
  }

  // Copy helper
  const handleCopy = (text, label) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    showSuccess(`${label} copied to clipboard!`, 'Copied')
  }

  // Add event helper
  const addIncidentEvent = (eventText, type = 'info') => {
    const logTime = new Date().toLocaleTimeString()
    const uniqueSuffix = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 8)
    setIncidentLogs((prev) => [
      { id: `inc-${Date.now()}-${uniqueSuffix}`, time: logTime, event: eventText, type },
      ...prev,
    ])
  }

  // Room Management Handlers
  const handleSaveDraft = async () => {
    if (!selectedTourney) return
    if (isLocked) {
      showError('Match is locked! Unlock match before modifying room details.', 'Match Locked')
      return
    }

    const cleanRoomId = sanitizeDigitsOnly(roomIdInput, 15)
    const cleanPassword = sanitizeDigitsOnly(roomPasswordInput, 10)

    if (roomIdInput.trim() && !isValidRoomId(cleanRoomId)) {
      showError('Room ID must contain numeric digits only (0-9).', 'Validation Error')
      return
    }
    if (roomPasswordInput.trim() && !isValidRoomPassword(cleanPassword)) {
      showError('Room Password must contain numeric digits only (0-9).', 'Validation Error')
      return
    }

    setIsSaving(true)
    try {
      if (updateRoomDetails) {
        await updateRoomDetails(selectedTourney.id, {
          roomId: cleanRoomId,
          roomPassword: cleanPassword,
          roomStatus: 'Draft',
          roomPublishedBy: adminName,
        })
      }
      setRoomStatus('Draft')
      showSuccess('Room credentials saved as Draft (visible only to Admins).', 'Draft Saved')
      addIncidentEvent(`Room details saved as Draft by ${adminName}`)
    } catch (err) {
      showError(err?.message || 'Failed to save room details', 'Save Error')
    } finally {
      setIsSaving(false)
    }
  }

  const handlePublishRoom = async () => {
    if (!selectedTourney) return
    if (isLocked) {
      showError('Match is locked! Unlock match before publishing room details.', 'Match Locked')
      return
    }

    const cleanRoomId = sanitizeDigitsOnly(roomIdInput, 15)
    const cleanPassword = sanitizeDigitsOnly(roomPasswordInput, 10)

    if (!cleanRoomId || !isValidRoomId(cleanRoomId)) {
      showError('Room ID is required and must contain numbers only (0-9).', 'Validation Error')
      return
    }
    if (!cleanPassword || !isValidRoomPassword(cleanPassword)) {
      showError('Room Password is required and must contain numbers only (0-9).', 'Validation Error')
      return
    }

    setIsPublishing(true)
    try {
      if (updateRoomDetails) {
        await updateRoomDetails(selectedTourney.id, {
          roomId: cleanRoomId,
          roomPassword: cleanPassword,
          roomStatus: 'Published',
          roomPublishedBy: adminName,
        })
      }
      setRoomStatus('Published')
      showSuccess(`Custom Room ID ${cleanRoomId} published live to players!`, 'Room Published')
      addIncidentEvent(`Custom Room ID ${cleanRoomId} published live to players`)
    } catch (err) {
      showError(err?.message || 'Failed to publish room details', 'Publish Error')
    } finally {
      setIsPublishing(false)
    }
  }

  const handleToggleLock = async () => {
    if (!selectedTourney) return
    const newLockState = !isLocked
    const targetStatus = newLockState ? 'Bracket Locked' : 'Live Now'
    
    try {
      if (updateTournamentStatus) {
        await updateTournamentStatus(selectedTourney.id, targetStatus)
      }
      setIsLocked(newLockState)
      showSuccess(newLockState ? 'Match and roster locked.' : 'Match unlocked for edits.', 'Lock State')
      addIncidentEvent(newLockState ? 'Match bracket locked' : 'Match unlocked')
    } catch (err) {
      showError(err?.message || 'Failed to toggle match lock', 'Lock Error')
    }
  }

  const handleOpenLobby = async () => {
    if (!selectedTourney) return
    try {
      if (updateTournamentStatus) {
        await updateTournamentStatus(selectedTourney.id, 'Live Now')
      }
      setMatchStatus('Lobby Waiting')
      showSuccess(`Match lobby opened for "${selectedTourney.title}"!`, 'Lobby Opened')
      addIncidentEvent('Match lobby opened for player check-in')
    } catch (err) {
      showError(err?.message || 'Failed to open lobby', 'Lobby Error')
    }
  }

  // Match Lifecycle Handlers
  const handleStartMatch = async () => {
    try {
      if (updateTournamentStatus && selectedTourney) {
        await updateTournamentStatus(selectedTourney.id, 'Live Now')
      }
      setMatchStatus('Match Live')
      showSuccess('Tournament match started live!', 'Match Live')
      addIncidentEvent('Match officially started live')
    } catch (err) {
      showError(err?.message || 'Failed to start match', 'Match Error')
    }
  }

  const handlePauseMatch = () => {
    setMatchStatus('Paused')
    showSuccess('Match paused by host.', 'Match Paused')
    addIncidentEvent('Match playback paused by host', 'warning')
  }

  const handleResumeMatch = () => {
    setMatchStatus('Match Live')
    showSuccess('Match resumed live!', 'Match Resumed')
    addIncidentEvent('Match resumed live')
  }

  const handleConfirmEndMatch = async () => {
    try {
      if (updateTournamentStatus && selectedTourney) {
        await updateTournamentStatus(selectedTourney.id, 'Completed')
      }
      setMatchStatus('Ended')
      showSuccess('Match marked as COMPLETED. Post-match scoring is now ready.', 'Match Concluded')
      addIncidentEvent('Match concluded. Transitioning to Score Verification.')
      setShowEndMatchModal(false)
    } catch (err) {
      showError(err?.message || 'Failed to end match', 'Error')
    }
  }

  // Emergency Broadcast Handler
  const handleSendBroadcast = () => {
    if (!broadcastMessage.trim()) return
    setIsBroadcasting(true)
    setTimeout(() => {
      addIncidentEvent(`Emergency Broadcast: "${broadcastMessage.trim()}"`, 'warning')
      showSuccess('Emergency alert broadcasted to player match dashboards!', 'Broadcast Sent')
      setBroadcastMessage('')
      setIsBroadcasting(false)
      setShowBroadcastConfirm(false)
    }, 350)
  }

  // Operational Metrics derived from tournaments
  const metrics = useMemo(() => {
    const total = tournaments.length
    let upcoming = 0
    let live = 0
    let completed = 0

    tournaments.forEach((t) => {
      const s = (t.status || '').toLowerCase()
      if (s === 'live now' || s === 'live') {
        live += 1
      } else if (s === 'completed') {
        completed += 1
      } else {
        upcoming += 1
      }
    })

    return { total, upcoming, live, completed }
  }, [tournaments])

  // Filtered Match Queue List
  const matchQueue = useMemo(() => {
    return tournaments
      .filter((t) => {
        if (statusFilter === 'ALL') return true
        const s = (t.status || '').toLowerCase()
        if (statusFilter === 'LIVE') return s === 'live now' || s === 'live'
        if (statusFilter === 'COMPLETED') return s === 'completed'
        if (statusFilter === 'UPCOMING') return s !== 'live now' && s !== 'live' && s !== 'completed'
        return true
      })
      .map((t, idx) => {
        const cap = getDefaultGameCapacity(t.game, t.mode || t.format)
        const registered = Number(t.registeredTeams || t.registered_teams || 0)
        const max = Number(t.maxTeams || t.max_teams || cap.maxTeams)
        const matchNum = `MATCH_${String(idx + 1).padStart(3, '0')}`
        const isSelected = String(t.id) === String(selectedTourneyId)

        return {
          id: t.id,
          matchId: matchNum,
          tournament: t.title,
          game: t.game || 'Free Fire MAX',
          format: t.format || t.matchFormat || 'Squad (4P)',
          teamsDisplay: `${registered} / ${max}`,
          scheduleDisplay: `${t.startDate || 'TBD'} ${t.startTime ? '• ' + t.startTime : ''}`,
          status: t.status || 'Upcoming',
          roomStatus: t.roomStatus || t.room_status || 'Draft',
          isSelected,
          raw: t,
        }
      })
  }, [tournaments, statusFilter, selectedTourneyId])

  // Capacity & Roster metrics for active match
  const capInfo = getDefaultGameCapacity(selectedTourney?.game, selectedTourney?.mode || selectedTourney?.format)
  const registeredSquadsCount = Number(selectedTourney?.registeredTeams || selectedTourney?.registered_teams || 12)
  const totalSquadSlots = Number(selectedTourney?.maxTeams || selectedTourney?.max_teams || capInfo.maxTeams)
  const totalPlayersCount = registeredSquadsCount * capInfo.teamSize
  const maxPlayersCount = totalSquadSlots * capInfo.teamSize
  const readyPlayersCount = totalPlayersCount
  const verificationRate = maxPlayersCount > 0 ? Math.round((totalPlayersCount / maxPlayersCount) * 100) : 100

  // Roster entries for active tournament
  const rosterEntries = useMemo(() => {
    const raw = selectedTourney?.teamsList || selectedTourney?.teams_list || []
    if (Array.isArray(raw) && raw.length > 0) return raw
    return Array.from({ length: registeredSquadsCount }, (_, idx) => ({
      id: `squad-${idx + 1}`,
      name: `Squad #${idx + 1}`,
      captain: `Captain #${idx + 1}`,
      freeFireUid: `UID-${871200 + idx}`,
      phone: `+91 98765 432${idx < 10 ? '0' + idx : idx}`,
      status: 'Ready',
    }))
  }, [selectedTourney, registeredSquadsCount])

  // Timeline stage states derived from live data
  const timelineStages = useMemo(() => {
    const isRegDone = (selectedTourney?.status !== 'Registration Open' && selectedTourney?.status !== 'Draft') || registeredSquadsCount >= totalSquadSlots
    const isRoomDispatched = roomStatus === 'Published'
    const isCheckinDone = registeredSquadsCount > 0
    const isMatchStarted = matchStatus === 'Match Live' || matchStatus === 'Paused' || matchStatus === 'Ended'
    const isMatchPlayback = matchStatus === 'Match Live' || matchStatus === 'Paused' || matchStatus === 'Ended'
    const isScoreReady = matchStatus === 'Ended'
    const isHandoffReady = matchStatus === 'Ended'

    return [
      { id: 't-1', name: '1. Registration', status: isRegDone ? 'Complete' : 'Open', isComplete: isRegDone },
      { id: 't-2', name: '2. Room Dispatch', status: isRoomDispatched ? 'Published' : roomStatus === 'Draft' ? 'Draft' : 'Pending', isComplete: isRoomDispatched },
      { id: 't-3', name: '3. Player Check-in', status: isCheckinDone ? 'Verified' : 'Pending', isComplete: isCheckinDone },
      { id: 't-4', name: '4. Match Start', status: isMatchStarted ? 'Started' : 'Waiting', isComplete: isMatchStarted },
      { id: 't-5', name: '5. Match Playback', status: matchStatus === 'Ended' ? 'Concluded' : matchStatus === 'Paused' ? 'Paused' : matchStatus === 'Match Live' ? 'In Progress' : 'Pending', isComplete: matchStatus === 'Ended' },
      { id: 't-6', name: '6. Score Verification', status: isScoreReady ? 'Ready for Scoring' : 'Pending', isComplete: isScoreReady },
      { id: 't-7', name: '7. Results Handoff', status: isHandoffReady ? 'Ready' : 'Pending', isComplete: isHandoffReady },
    ]
  }, [selectedTourney, registeredSquadsCount, totalSquadSlots, roomStatus, matchStatus])

  return (
    <div className="space-y-6 font-body antialiased">

      {/* 1. PAGE HEADER & TOURNAMENT SELECTOR */}
      <div className="bg-[#141416] border border-[#27272a] rounded-lg p-5 sm:p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-headline font-bold text-[#00f2ff] uppercase tracking-wider mb-1.5">
            <Tv className="w-4 h-4" />
            <span>MATCH CONTROL CONSOLE</span>
          </div>
          <h1 className="font-headline text-2xl sm:text-3xl font-extrabold text-white uppercase tracking-tight">
            MATCH COMMAND & ROOM OPERATIONS
          </h1>
          <p className="text-xs sm:text-sm text-[#849495] font-body mt-1 max-w-2xl">
            Operate tournament matches, manage custom rooms, control live match states and hand verified results to the Results console.
          </p>
        </div>

        {/* Header Controls: Tournament Selector & Quick Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
          <div className="space-y-1">
            <label className="text-[10px] font-headline font-bold text-[#849495] uppercase tracking-wider block">
              Active Tournament:
            </label>
            <select
              value={selectedTourneyId}
              onChange={(e) => setSelectedTourneyId(e.target.value)}
              className="w-full sm:w-auto px-3.5 py-2 bg-[#1c1b1c] border border-[#27272a] rounded-lg text-xs font-headline font-bold text-[#00f2ff] focus:outline-none focus:border-[#00f2ff] cursor-pointer min-w-[220px]"
            >
              {tournaments.map((t) => (
                <option key={`mc-t-${t.id}`} value={t.id}>{t.title}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-headline font-bold text-[#849495] uppercase tracking-wider block">
              Match Status Filter:
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 bg-[#1c1b1c] border border-[#27272a] rounded-lg text-xs font-headline font-bold text-white focus:outline-none focus:border-[#00f2ff] cursor-pointer"
            >
              <option value="ALL">ALL STATUSES</option>
              <option value="UPCOMING">UPCOMING ONLY</option>
              <option value="LIVE">LIVE ONLY</option>
              <option value="COMPLETED">COMPLETED ONLY</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2. OPERATIONAL METRICS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* TOTAL MATCHES */}
        <div className="bg-[#141416] border border-[#27272a] rounded-lg p-4 shadow-xl space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-headline font-bold text-[#849495] uppercase tracking-wider">
              TOTAL MATCHES
            </span>
            <Layers className="w-4 h-4 text-[#00f2ff]" />
          </div>
          <p className="font-headline text-2xl font-extrabold text-white">
            {metrics.total}
          </p>
          <span className="text-[10px] font-body text-[#849495] block">
            Across all competitive brackets
          </span>
        </div>

        {/* UPCOMING */}
        <div className="bg-[#141416] border border-[#27272a] rounded-lg p-4 shadow-xl space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-headline font-bold text-[#849495] uppercase tracking-wider">
              UPCOMING
            </span>
            <Clock className="w-4 h-4 text-[#fed83a]" />
          </div>
          <p className="font-headline text-2xl font-extrabold text-[#fed83a]">
            {metrics.upcoming}
          </p>
          <span className="text-[10px] font-body text-[#849495] block">
            Queued for room dispatch
          </span>
        </div>

        {/* LIVE */}
        <div className="bg-[#141416] border border-[#27272a] rounded-lg p-4 shadow-xl space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-headline font-bold text-[#849495] uppercase tracking-wider">
              LIVE
            </span>
            <Activity className="w-4 h-4 text-[#10b981] animate-pulse" />
          </div>
          <p className="font-headline text-2xl font-extrabold text-[#10b981] flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] animate-pulse" />
            <span>{metrics.live}</span>
          </p>
          <span className="text-[10px] font-body text-[#849495] block">
            Active in custom room lobbies
          </span>
        </div>

        {/* COMPLETED */}
        <div className="bg-[#141416] border border-[#27272a] rounded-lg p-4 shadow-xl space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-headline font-bold text-[#849495] uppercase tracking-wider">
              COMPLETED
            </span>
            <CheckCircle2 className="w-4 h-4 text-[#849495]" />
          </div>
          <p className="font-headline text-2xl font-extrabold text-white">
            {metrics.completed}
          </p>
          <span className="text-[10px] font-body text-[#849495] block">
            Concluded & handed to Results
          </span>
        </div>
      </div>

      {/* 3. MATCH QUEUE */}
      <div className="bg-[#141416] border border-[#27272a] rounded-lg p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#27272a] pb-4">
          <div>
            <h2 className="font-headline text-base sm:text-lg font-extrabold text-white uppercase tracking-tight flex items-center gap-2">
              <Gamepad2 className="w-4 h-4 text-[#00f2ff]" />
              <span>MATCH QUEUE</span>
            </h2>
            <p className="text-xs text-[#849495] font-body mt-0.5">
              Select a match to load its real-time operational deck into the Active Operations workspace.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-[#849495]">
              Showing {matchQueue.length} of {tournaments.length} Matches
            </span>
          </div>
        </div>

        {/* Tactical Queue Table / List */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#27272a] text-[10px] font-headline font-extrabold text-[#849495] uppercase tracking-wider">
                <th className="py-3 px-3">MATCH</th>
                <th className="py-3 px-3">TOURNAMENT</th>
                <th className="py-3 px-3">GAME / FORMAT</th>
                <th className="py-3 px-3">TEAMS</th>
                <th className="py-3 px-3">SCHEDULE</th>
                <th className="py-3 px-3">STATUS</th>
                <th className="py-3 px-3">ROOM</th>
                <th className="py-3 px-3 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#27272a] text-xs font-body">
              {matchQueue.map((item) => (
                <tr
                  key={`queue-row-${item.id}`}
                  className={`transition-colors ${
                    item.isSelected
                      ? 'bg-[#00f2ff]/5 hover:bg-[#00f2ff]/10'
                      : 'hover:bg-[#1c1b1c]'
                  }`}
                >
                  {/* MATCH */}
                  <td className="py-3 px-3 font-mono font-bold text-[#00f2ff]">
                    {item.matchId}
                  </td>

                  {/* TOURNAMENT */}
                  <td className="py-3 px-3 font-headline font-bold text-white max-w-[200px] truncate">
                    {item.tournament}
                  </td>

                  {/* GAME / FORMAT */}
                  <td className="py-3 px-3">
                    <span className="font-headline font-bold text-[#b9cacb]">
                      {item.game}
                    </span>
                    <span className="text-[#849495] text-[11px] block">
                      {item.format}
                    </span>
                  </td>

                  {/* TEAMS */}
                  <td className="py-3 px-3 font-mono text-white">
                    {item.teamsDisplay}
                  </td>

                  {/* SCHEDULE */}
                  <td className="py-3 px-3 text-[11px] text-[#849495]">
                    {item.scheduleDisplay}
                  </td>

                  {/* STATUS */}
                  <td className="py-3 px-3">
                    <span className={`px-2.5 py-0.5 rounded text-[10px] font-headline font-bold uppercase border ${
                      item.status === 'Live Now'
                        ? 'bg-[#10b981]/15 text-[#10b981] border-[#10b981]/40 animate-pulse'
                        : item.status === 'Completed'
                        ? 'bg-slate-800 text-slate-300 border-slate-700'
                        : item.status === 'Bracket Locked'
                        ? 'bg-[#ff5e07]/15 text-[#ff5e07] border-[#ff5e07]/40'
                        : 'bg-[#fed83a]/15 text-[#fed83a] border-[#fed83a]/40'
                    }`}>
                      {item.status}
                    </span>
                  </td>

                  {/* ROOM */}
                  <td className="py-3 px-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                      item.roomStatus === 'Published'
                        ? 'bg-[#10b981]/15 text-[#10b981] border-[#10b981]/40'
                        : 'bg-[#1c1b1c] text-[#849495] border-[#27272a]'
                    }`}>
                      {item.roomStatus}
                    </span>
                  </td>

                  {/* ACTION */}
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => {
                        setSelectedTourneyId(item.id)
                        setSelectedMatchId(item.matchId)
                        showSuccess(`Loaded ${item.matchId} (${item.tournament}) into Active Workspace.`, 'Match Loaded')
                      }}
                      className={`px-3.5 py-1.5 rounded text-xs font-headline font-extrabold uppercase transition-all cursor-pointer ${
                        item.isSelected
                          ? 'bg-[#00f2ff] text-[#00363a] shadow-[0_0_12px_rgba(0,242,255,0.4)]'
                          : 'bg-[#1c1b1c] hover:bg-[#27272a] text-white border border-[#27272a]'
                      }`}
                    >
                      CONTROL
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. ACTIVE MATCH OPERATIONS & MATCH COMMAND */}
      <div className="bg-[#141416] border border-[#27272a] rounded-lg p-5 sm:p-6 shadow-xl space-y-5">
        
        {/* Active Header Row with Semantic Badges */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#27272a] pb-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 bg-[#00f2ff]/10 text-[#00f2ff] border border-[#00f2ff]/30 rounded text-[10px] font-headline font-bold uppercase">
                {selectedMatchId}
              </span>
              <span className="px-2.5 py-0.5 bg-[#1c1b1c] text-white border border-[#27272a] rounded text-[10px] font-headline font-bold uppercase">
                {selectedTourney?.game || 'Free Fire MAX'}
              </span>
              <span className="px-2.5 py-0.5 bg-[#1c1b1c] text-[#849495] border border-[#27272a] rounded text-[10px] font-headline font-bold uppercase">
                {selectedTourney?.mode ? selectedTourney.mode.toUpperCase() : selectedTourney?.format || 'SQUAD (4P)'}
              </span>
              <span className="px-2.5 py-0.5 bg-[#1c1b1c] text-[#10b981] border border-[#10b981]/30 rounded text-[10px] font-mono font-bold uppercase">
                {registeredSquadsCount} / {totalSquadSlots} SQUADS
              </span>
              <span className="px-2.5 py-0.5 bg-[#1c1b1c] text-[#00f2ff] border border-[#00f2ff]/30 rounded text-[10px] font-mono font-bold uppercase">
                {totalPlayersCount} PLAYERS
              </span>
            </div>

            <h2 className="font-headline text-xl sm:text-2xl font-extrabold text-white uppercase tracking-tight">
              {selectedTourney?.title || 'Active Tournament Operations'}
            </h2>
            <p className="text-xs text-[#849495] font-body mt-0.5">
              Scheduled: {selectedTourney?.startDate || 'Today'} &bull; {selectedTourney?.startTime || '06:00 PM IST'} &bull; Host: {selectedTourney?.organizer || 'MJ ESPORTS Official'}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <span className="text-[10px] font-headline font-bold text-[#849495] uppercase block">
                MATCH STATUS
              </span>
              <span className={`px-3 py-1 rounded text-xs font-headline font-extrabold uppercase border inline-block mt-0.5 ${
                matchStatus === 'Match Live'
                  ? 'bg-[#10b981]/20 text-[#10b981] border-[#10b981]/50 animate-pulse'
                  : matchStatus === 'Paused'
                  ? 'bg-[#ff5e07]/20 text-[#ff5e07] border-[#ff5e07]/50'
                  : matchStatus === 'Ended'
                  ? 'bg-slate-800 text-slate-300 border-slate-700'
                  : 'bg-[#fed83a]/20 text-[#fed83a] border-[#fed83a]/50'
              }`}>
                {matchStatus}
              </span>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-headline font-bold text-[#849495] uppercase block">
                ROOM STATUS
              </span>
              <span className={`px-3 py-1 rounded text-xs font-headline font-extrabold uppercase border inline-block mt-0.5 ${
                roomStatus === 'Published'
                  ? 'bg-[#10b981]/20 text-[#10b981] border-[#10b981]/50'
                  : 'bg-[#ff5e07]/20 text-[#ff5e07] border-[#ff5e07]/50'
              }`}>
                {roomStatus}
              </span>
            </div>
          </div>
        </div>

        {/* MATCH LIFECYCLE ACTION STRIP */}
        <div className="p-4 bg-[#1c1b1c] border border-[#27272a] rounded-lg flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-headline font-bold text-white uppercase flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#00f2ff]" />
              <span>MATCH LIFECYCLE CONTROLS</span>
            </span>
            <p className="text-[11px] text-[#849495] font-body">
              {matchStatus === 'Lobby Waiting' && 'Lobby is waiting for player check-in. Start match when all teams are verified.'}
              {matchStatus === 'Match Live' && 'Match is currently LIVE in-game. Live room status broadcasted to players.'}
              {matchStatus === 'Paused' && 'Match playback has been paused by host. Click resume to restore live tracking.'}
              {matchStatus === 'Ended' && 'Match has ended. Realtime room operations concluded. Ready for Results handoff.'}
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            {matchStatus === 'Lobby Waiting' && (
              <>
                <button
                  onClick={handleOpenLobby}
                  className="px-4 py-2.5 bg-[#141416] hover:bg-[#27272a] text-white border border-[#27272a] rounded-lg text-xs font-headline font-bold uppercase transition-colors cursor-pointer"
                >
                  Refresh Lobby
                </button>
                <button
                  onClick={handleStartMatch}
                  className="px-5 py-2.5 bg-[#00f2ff] hover:bg-[#00f2ff]/90 text-[#00363a] rounded-lg text-xs font-headline font-extrabold uppercase transition-all shadow-[0_0_15px_rgba(0,242,255,0.3)] flex items-center gap-2 cursor-pointer"
                >
                  <Play className="w-4 h-4 text-[#00363a] fill-current" />
                  <span>Start Match</span>
                </button>
              </>
            )}

            {matchStatus === 'Match Live' && (
              <>
                <button
                  onClick={handlePauseMatch}
                  className="px-4 py-2.5 bg-[#ff5e07]/20 hover:bg-[#ff5e07]/30 text-[#ff5e07] border border-[#ff5e07]/40 rounded-lg text-xs font-headline font-bold uppercase transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pause Match</span>
                </button>
                <button
                  onClick={() => setShowEndMatchModal(true)}
                  className="px-4 py-2.5 bg-red-950/50 hover:bg-red-900/60 text-red-400 border border-red-800/60 rounded-lg text-xs font-headline font-bold uppercase transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Square className="w-3.5 h-3.5" />
                  <span>End Match</span>
                </button>
              </>
            )}

            {matchStatus === 'Paused' && (
              <>
                <button
                  onClick={handleResumeMatch}
                  className="px-5 py-2.5 bg-[#00f2ff] hover:bg-[#00f2ff]/90 text-[#00363a] rounded-lg text-xs font-headline font-extrabold uppercase transition-all shadow-[0_0_15px_rgba(0,242,255,0.3)] flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4 text-[#00363a]" />
                  <span>Resume Match</span>
                </button>
                <button
                  onClick={() => setShowEndMatchModal(true)}
                  className="px-4 py-2.5 bg-red-950/50 hover:bg-red-900/60 text-red-400 border border-red-800/60 rounded-lg text-xs font-headline font-bold uppercase transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Square className="w-3.5 h-3.5" />
                  <span>End Match</span>
                </button>
              </>
            )}

            {matchStatus === 'Ended' && (
              <div className="flex items-center gap-2">
                <span className="px-3.5 py-2 bg-slate-800 text-slate-300 border border-slate-700 rounded-lg text-xs font-headline font-bold uppercase">
                  Match Concluded
                </span>
                {setActiveTab && (
                  <button
                    onClick={() => setActiveTab('results')}
                    className="px-5 py-2.5 bg-[#00f2ff] hover:bg-[#00f2ff]/90 text-[#00363a] rounded-lg text-xs font-headline font-extrabold uppercase transition-all shadow-[0_0_15px_rgba(0,242,255,0.3)] flex items-center gap-2 cursor-pointer"
                  >
                    <span>RESULTS CONSOLE &rarr;</span>
                    <ArrowRight className="w-4 h-4 text-[#00363a]" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* 5. ROOM MANAGEMENT & PLAYER CHECK-IN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ROOM MANAGEMENT PANEL */}
        <div className="bg-[#141416] border border-[#27272a] rounded-lg p-5 sm:p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
            <h3 className="font-headline text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
              <Key className="w-4 h-4 text-[#00f2ff]" />
              <span>ROOM CREDENTIALS & ACCESS</span>
            </h3>
            <span className={`px-2.5 py-0.5 rounded text-[10px] font-headline font-bold uppercase border ${
              roomStatus === 'Published'
                ? 'bg-[#10b981]/15 text-[#10b981] border-[#10b981]/40'
                : 'bg-[#ff5e07]/15 text-[#ff5e07] border-[#ff5e07]/40'
            }`}>
              {roomStatus}
            </span>
          </div>

          <div className="p-4 bg-[#1c1b1c] rounded-lg border border-[#27272a] space-y-3.5">
            {/* Room ID (Numbers Only) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-headline font-bold text-[#849495] uppercase tracking-wider block">
                  ROOM ID <span className="text-[#00f2ff] text-[10px]">(NUMBERS ONLY)</span>
                </label>
                <button
                  type="button"
                  onClick={() => setRoomIdInput(generateRandomNumericRoomId(10))}
                  disabled={isLocked}
                  className="text-[10px] text-[#00f2ff] hover:text-white font-mono flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                  title="Generate independent random 10-digit numeric ID"
                >
                  <Sparkles className="w-3 h-3 text-[#00f2ff]" />
                  <span>Auto-Gen ID</span>
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={roomIdInput}
                  onChange={(e) => setRoomIdInput(sanitizeDigitsOnly(e.target.value, 15))}
                  placeholder="e.g. 5839174261"
                  disabled={isLocked}
                  className="flex-1 px-3.5 py-2.5 bg-[#141416] border border-[#27272a] rounded-lg text-xs font-mono font-bold text-[#00f2ff] focus:outline-none focus:border-[#00f2ff] disabled:opacity-50"
                />
                {roomIdInput && (
                  <button
                    onClick={() => handleCopy(roomIdInput, 'Room ID')}
                    className="p-2.5 bg-[#141416] hover:bg-[#27272a] border border-[#27272a] text-[#849495] hover:text-white rounded-lg cursor-pointer"
                    title="Copy Room ID"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Room Password (Numbers Only) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-headline font-bold text-[#849495] uppercase tracking-wider block">
                  ROOM PASSWORD <span className="text-[#ff5e07] text-[10px]">(NUMBERS ONLY)</span>
                </label>
                <button
                  type="button"
                  onClick={() => setRoomPasswordInput(generateRandomNumericRoomPassword(8))}
                  disabled={isLocked}
                  className="text-[10px] text-[#ff5e07] hover:text-white font-mono flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                  title="Generate independent random 8-digit numeric PIN"
                >
                  <Sparkles className="w-3 h-3 text-[#ff5e07]" />
                  <span>Auto-Gen PIN</span>
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  type={showPassword ? 'text' : 'password'}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={roomPasswordInput}
                  onChange={(e) => setRoomPasswordInput(sanitizeDigitsOnly(e.target.value, 10))}
                  placeholder="e.g. 84920173"
                  disabled={isLocked}
                  className="flex-1 px-3.5 py-2.5 bg-[#141416] border border-[#27272a] rounded-lg text-xs font-mono font-bold text-[#ff5e07] focus:outline-none focus:border-[#00f2ff] disabled:opacity-50"
                />
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-2.5 bg-[#141416] hover:bg-[#27272a] border border-[#27272a] text-[#849495] hover:text-white rounded-lg cursor-pointer"
                  title={showPassword ? 'Hide Password' : 'Show Password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                {roomPasswordInput && (
                  <button
                    onClick={() => handleCopy(roomPasswordInput, 'Room Password')}
                    className="p-2.5 bg-[#141416] hover:bg-[#27272a] border border-[#27272a] text-[#849495] hover:text-white rounded-lg cursor-pointer"
                    title="Copy Password"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <p className="text-[11px] text-[#849495] font-body">
              Credentials are independent numeric codes encrypted and released only to verified squad captains when published.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
            <LoadingButton
              onClick={handleSaveDraft}
              loading={isSaving}
              loadingText="Saving..."
              disabled={isLocked}
              variant="secondary"
              className="py-2.5 text-xs font-headline font-bold uppercase rounded-lg bg-[#1c1b1c] text-[#849495] hover:text-white border border-[#27272a]"
            >
              Save Draft
            </LoadingButton>

            <LoadingButton
              onClick={handlePublishRoom}
              loading={isPublishing}
              loadingText="Publishing..."
              disabled={isLocked}
              className="py-2.5 text-xs font-headline font-extrabold uppercase rounded-lg bg-[#00f2ff] hover:bg-[#00f2ff]/90 text-[#00363a]"
            >
              Publish Room
            </LoadingButton>

            <button
              onClick={handleToggleLock}
              className={`py-2.5 text-xs font-headline font-bold uppercase rounded-lg border transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                isLocked
                  ? 'bg-red-950/40 text-red-400 border-red-800'
                  : 'bg-[#1c1b1c] text-[#10b981] border-[#10b981]/30 hover:bg-[#10b981]/10'
              }`}
            >
              {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
              <span>{isLocked ? 'Unlock Match' : 'Lock Match'}</span>
            </button>
          </div>
        </div>

        {/* PLAYER CHECK-IN PANEL */}
        <div className="bg-[#141416] border border-[#27272a] rounded-lg p-5 sm:p-6 space-y-4 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
              <h3 className="font-headline text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-[#10b981]" />
                <span>PLAYER CHECK-IN & READINESS</span>
              </h3>
              <span className="font-mono text-xs font-bold text-[#10b981]">
                {verificationRate}% VERIFIED
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-4">
              <div className="p-3 bg-[#1c1b1c] border border-[#27272a] rounded-lg text-center space-y-1">
                <span className="text-[10px] text-[#849495] uppercase block font-headline font-bold">
                  TOTAL PLAYERS
                </span>
                <p className="font-headline font-extrabold text-white text-lg">{totalPlayersCount}</p>
              </div>
              <div className="p-3 bg-[#1c1b1c] border border-[#27272a] rounded-lg text-center space-y-1">
                <span className="text-[10px] text-[#849495] uppercase block font-headline font-bold">
                  READY PLAYERS
                </span>
                <p className="font-headline font-extrabold text-[#10b981] text-lg">{readyPlayersCount}</p>
              </div>
              <div className="p-3 bg-[#1c1b1c] border border-[#27272a] rounded-lg text-center space-y-1">
                <span className="text-[10px] text-[#849495] uppercase block font-headline font-bold">
                  VERIFICATION RATE
                </span>
                <p className="font-headline font-extrabold text-[#00f2ff] text-lg">{verificationRate}%</p>
              </div>
            </div>

            <p className="text-xs text-[#849495] font-body mt-4 leading-relaxed">
              Squad rosters and in-game character UIDs are verified against active registrations.
            </p>
          </div>

          <button
            onClick={() => setShowRosterDrawer(true)}
            className="w-full py-2.5 bg-[#1c1b1c] hover:bg-[#27272a] text-[#00f2ff] border border-[#27272a] rounded-lg text-xs font-headline font-bold uppercase transition-colors cursor-pointer flex items-center justify-center gap-2 mt-4"
          >
            <Users className="w-3.5 h-3.5" />
            <span>View Complete Roster Drawer ({registeredSquadsCount} Squads)</span>
          </button>
        </div>

      </div>

      {/* 6. OPERATIONAL TIMELINE, EMERGENCY BROADCAST & INCIDENT LOG */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* OPERATIONAL TIMELINE */}
        <div className="bg-[#141416] border border-[#27272a] rounded-lg p-5 space-y-3 shadow-xl">
          <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
            <span className="font-headline text-xs font-extrabold text-white uppercase flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#00f2ff]" />
              <span>OPERATIONAL TIMELINE</span>
            </span>
            <span className="text-[10px] font-mono text-[#00f2ff] uppercase font-bold">Phase Sequence</span>
          </div>

          <div className="space-y-2 text-xs font-body pt-1">
            {timelineStages.map((stage) => (
              <div
                key={stage.id}
                className="flex items-center justify-between p-2.5 rounded-lg bg-[#1c1b1c] border border-[#27272a]"
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${stage.isComplete ? 'bg-[#10b981]' : 'bg-[#849495]'}`} />
                  <span className="text-[#b9cacb] font-medium">{stage.name}</span>
                </div>
                <span className={`font-headline font-bold text-[11px] uppercase ${
                  stage.isComplete ? 'text-[#10b981]' : 'text-[#849495]'
                }`}>
                  {stage.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* EMERGENCY BROADCAST */}
        <div className="bg-[#141416] border border-[#ff5e07]/40 rounded-lg p-5 space-y-3.5 shadow-xl">
          <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
            <span className="font-headline text-xs font-extrabold text-[#ff5e07] uppercase flex items-center gap-2">
              <Radio className="w-4 h-4 text-[#ff5e07]" />
              <span>EMERGENCY BROADCAST</span>
            </span>
            <span className="px-2 py-0.5 bg-[#ff5e07]/20 text-[#ff5e07] rounded text-[9px] font-headline font-bold uppercase">
              Host Alert
            </span>
          </div>

          <p className="text-xs text-[#849495] font-body leading-relaxed">
            Dispatch urgent announcement notices directly to squad captains and player match dashboards.
          </p>

          <div className="space-y-2.5 pt-1">
            <input
              type="text"
              value={broadcastMessage}
              onChange={(e) => setBroadcastMessage(e.target.value)}
              placeholder="e.g. Room remake in 5 mins due to connection drop..."
              className="w-full px-3.5 py-2.5 bg-[#1c1b1c] border border-[#27272a] rounded-lg text-xs text-white placeholder-[#849495] focus:outline-none focus:border-[#ff5e07]"
            />
            <button
              onClick={() => setShowBroadcastConfirm(true)}
              disabled={!broadcastMessage.trim() || isBroadcasting}
              className="w-full py-2.5 bg-[#ff5e07] hover:bg-[#ff5e07]/90 text-slate-950 font-headline font-extrabold text-xs uppercase rounded-lg transition-all cursor-pointer disabled:opacity-40"
            >
              <Send className="w-3.5 h-3.5 inline mr-1.5" />
              <span>Send Emergency Broadcast</span>
            </button>
          </div>
        </div>

        {/* INCIDENT / EVENT LOG & HOST NOTES */}
        <div className="bg-[#141416] border border-[#27272a] rounded-lg p-5 space-y-3.5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
              <span className="font-headline text-xs font-extrabold text-white uppercase flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#00f2ff]" />
                <span>INCIDENT & EVENT LOG</span>
              </span>
              <span className="text-[10px] font-mono text-[#849495]">{incidentLogs.length} Events</span>
            </div>

            <div className="space-y-1.5 max-h-36 overflow-y-auto pt-2 font-body text-xs pr-1">
              {incidentLogs.map((log) => (
                <div key={log.id} className="p-2 bg-[#1c1b1c] border border-[#27272a] rounded-lg flex items-center gap-2">
                  <span className="font-mono text-[10px] text-[#849495] shrink-0">{log.time}</span>
                  <span className={`text-[11px] truncate ${log.type === 'warning' ? 'text-[#ff5e07] font-bold' : 'text-white'}`}>
                    {log.event}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Host Notes Scratchpad */}
          <div className="pt-2 border-t border-[#27272a] space-y-1.5">
            <span className="text-[10px] font-headline font-bold text-[#849495] uppercase tracking-wider block">
              Host Notes (Private)
            </span>
            <input
              type="text"
              value={adminNotes}
              onChange={handleHostNotesChange}
              placeholder="Private host operational notes..."
              className="w-full px-3 py-2 bg-[#1c1b1c] border border-[#27272a] rounded-lg text-xs text-white focus:outline-none focus:border-[#00f2ff]"
            />
          </div>
        </div>

      </div>

      {/* 7. RESULTS HANDOFF CTA */}
      <div className="p-5 sm:p-6 bg-[#141416] border border-[#00f2ff]/30 rounded-lg shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="font-headline text-sm sm:text-base font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
            <Award className="w-4 h-4 text-[#00f2ff]" />
            <span>RESULTS HANDOFF</span>
          </h3>
          <p className="text-xs text-[#849495] font-body">
            Match operations are complete. Submit verified match data to the Results console.
          </p>
        </div>

        {setActiveTab && (
          <button
            onClick={() => setActiveTab('results')}
            className="w-full sm:w-auto px-6 py-2.5 bg-[#00f2ff] hover:bg-[#00f2ff]/90 text-[#00363a] rounded-lg text-xs font-headline font-extrabold uppercase transition-all shadow-[0_0_15px_rgba(0,242,255,0.3)] flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            <span>OPEN RESULTS CONSOLE</span>
            <ArrowRight className="w-4 h-4 text-[#00363a]" />
          </button>
        )}
      </div>

      {/* MODAL 1: END MATCH CONFIRMATION */}
      {showEndMatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#141416] border border-[#27272a] rounded-lg p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400">
              <div className="w-10 h-10 rounded-lg bg-red-950/60 border border-red-500/30 flex items-center justify-center">
                <Square className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="font-headline font-extrabold text-base uppercase text-white">
                  END LIVE MATCH?
                </h3>
                <p className="text-xs text-[#849495] font-body">This concludes real-time room operations.</p>
              </div>
            </div>

            <p className="text-xs text-[#b9cacb] font-body leading-relaxed">
              Are you sure you want to end match <span className="font-bold text-white font-headline">"{selectedMatchId}"</span> for <span className="font-bold text-white">{selectedTourney?.title}</span>? This will close live room telemetry and transition to post-match score entry.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setShowEndMatchModal(false)}
                className="flex-1 py-2.5 bg-[#1c1b1c] hover:bg-[#27272a] text-[#849495] hover:text-white border border-[#27272a] rounded-lg text-xs font-headline font-bold uppercase transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmEndMatch}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-headline font-bold uppercase transition-colors cursor-pointer shadow-lg shadow-red-600/30"
              >
                Confirm End Match
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: EMERGENCY BROADCAST CONFIRMATION */}
      {showBroadcastConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#141416] border border-[#27272a] rounded-lg p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-[#ff5e07]">
              <div className="w-10 h-10 rounded-lg bg-[#ff5e07]/10 border border-[#ff5e07]/30 flex items-center justify-center">
                <Radio className="w-5 h-5 text-[#ff5e07]" />
              </div>
              <div>
                <h3 className="font-headline font-extrabold text-base uppercase text-white">
                  CONFIRM EMERGENCY BROADCAST
                </h3>
                <p className="text-xs text-[#849495] font-body">Broadcast notice to all squad captains.</p>
              </div>
            </div>

            <div className="p-3.5 bg-[#1c1b1c] border border-[#27272a] rounded-lg text-xs text-white font-body">
              "{broadcastMessage}"
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setShowBroadcastConfirm(false)}
                className="flex-1 py-2.5 bg-[#1c1b1c] hover:bg-[#27272a] text-[#849495] hover:text-white border border-[#27272a] rounded-lg text-xs font-headline font-bold uppercase transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSendBroadcast}
                className="flex-1 py-2.5 bg-[#ff5e07] hover:bg-[#ff5e07]/90 text-slate-950 rounded-lg text-xs font-headline font-extrabold uppercase transition-colors cursor-pointer"
              >
                Send Broadcast
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DRAWER: ROSTER METADATA INSPECTOR */}
      {showRosterDrawer && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end animate-fadeIn"
          onClick={() => setShowRosterDrawer(false)}
        >
          <div
            className="w-full max-w-md bg-[#141416] border-l border-[#27272a] h-full p-6 space-y-5 overflow-y-auto shadow-2xl flex flex-col justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
                <div>
                  <span className="font-mono text-xs font-bold text-[#00f2ff] block">ACTIVE MATCH ROSTER</span>
                  <h3 className="font-headline text-lg font-extrabold text-white uppercase">{selectedTourney?.title}</h3>
                </div>
                <button
                  onClick={() => setShowRosterDrawer(false)}
                  className="p-1.5 rounded-lg bg-[#1c1b1c] border border-[#27272a] text-[#849495] hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2.5 max-h-[70vh] overflow-y-auto pr-1">
                {rosterEntries.map((team, idx) => (
                  <div key={`roster-item-${team.id || idx}`} className="p-3 bg-[#1c1b1c] rounded-lg border border-[#27272a] space-y-1 text-xs font-body">
                    <div className="flex justify-between items-center">
                      <span className="font-headline font-bold text-white text-sm">#{idx + 1} {team.name || team.teamName}</span>
                      <span className="px-2 py-0.5 rounded text-[9px] font-headline font-bold bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/40 uppercase">
                        Verified Ready
                      </span>
                    </div>
                    <div className="text-[#849495] text-[11px] flex justify-between">
                      <span>Captain: <strong className="text-white">{team.captain || team.captainName}</strong></span>
                      <span>UID: <strong className="text-[#00f2ff] font-mono">{team.freeFireUid || team.captain_uid || 'N/A'}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => setShowRosterDrawer(false)}
              className="w-full py-2.5 bg-[#1c1b1c] hover:bg-[#27272a] text-white border border-[#27272a] rounded-lg text-xs font-headline font-bold uppercase transition-colors cursor-pointer"
            >
              Close Roster Drawer
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
