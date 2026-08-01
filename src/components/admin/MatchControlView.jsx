import { useState, useEffect } from 'react'
import {
  Gamepad2,
  Key,
  Play,
  Pause,
  Square,
  CheckCircle2,
  Tv,
  Upload,
  Shield,
  RefreshCw,
  Copy,
  Save,
  Globe,
  Radio,
  Clock,
  Users,
  AlertTriangle,
  FileText,
  Send,
  ListFilter,
  ArrowRight,
  Zap,
  RotateCcw
} from 'lucide-react'
import AuthAlert from '../common/AuthAlert'
import LoadingButton from '../common/LoadingButton'
import { useToast } from '../../contexts/ToastContext'
import { useTournaments } from '../../contexts/TournamentContext'
import { useAuth } from '../../contexts/AuthContext'

export default function MatchControlView({ tournaments, setActiveTab }) {
  const { showSuccess, showError } = useToast()
  const { updateRoomDetails } = useTournaments()
  const { user } = useAuth()

  const [selectedTourneyId, setSelectedTourneyId] = useState(tournaments[0]?.id || '')
  const selectedTourney = tournaments.find((t) => t.id === selectedTourneyId) || tournaments[0]

  // Section 1: Room Management State
  const [roomIdInput, setRoomIdInput] = useState('')
  const [roomPasswordInput, setRoomPasswordInput] = useState('')
  const [roomStatus, setRoomStatus] = useState('Draft')

  // Section 2: Match Controls State
  const [matchStatus, setMatchStatus] = useState('Lobby Waiting') // 'Lobby Waiting' | 'Match Live' | 'Paused' | 'Ended'

  // Section 3: Command Center States
  const [broadcastMessage, setBroadcastMessage] = useState('')
  const [isBroadcasting, setIsBroadcasting] = useState(false)
  const [adminNotes, setAdminNotes] = useState('Host note: Confirm screen recording policy before round start.')
  const [incidentLogs, setIncidentLogs] = useState([
    { id: 'inc-1', time: '18:02:15', event: 'Custom match room lobby opened.', type: 'info' },
    { id: 'inc-2', time: '18:05:40', event: 'Roster check-in verification in progress.', type: 'info' },
  ])

  const [alert, setAlert] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)

  const adminName = user?.user_metadata?.username || user?.email?.split('@')[0] || 'Admin'

  // Synchronize inputs when selected tournament changes
  useEffect(() => {
    if (selectedTourney) {
      setRoomIdInput(selectedTourney.roomId || '')
      setRoomPasswordInput(selectedTourney.roomPassword || '')
      setRoomStatus(selectedTourney.roomStatus || 'Draft')
      setAlert(null)
    }
  }, [selectedTourneyId, selectedTourney])

  const handleCopy = (text, label) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    showSuccess(`${label} copied to clipboard!`, 'Copied')
  }

  // Section 1 Handlers: Room Details & Publishing
  const handleSaveDraft = async () => {
    if (!selectedTourney) return
    setIsSaving(true)
    setAlert(null)
    try {
      await updateRoomDetails(selectedTourney.id, {
        roomId: roomIdInput.trim(),
        roomPassword: roomPasswordInput.trim(),
        roomStatus: 'Draft',
        roomPublishedBy: adminName,
      })
      setRoomStatus('Draft')
      setAlert({ type: 'success', message: 'Room details saved as Draft (Visible only to Admins).' })
      showSuccess('Room details saved as Draft.', 'Draft Saved')
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Failed to save room details.' })
    } finally {
      setIsSaving(false)
    }
  }

  const handlePublishRoom = async () => {
    if (!selectedTourney) return
    setAlert(null)

    // Validation requirement: Room ID and Password required before publishing
    if (!roomIdInput.trim() || !roomPasswordInput.trim()) {
      setAlert({
        type: 'error',
        message: 'Validation Error: Room ID and Password are required before publishing.',
      })
      return
    }

    setIsPublishing(true)
    try {
      await updateRoomDetails(selectedTourney.id, {
        roomId: roomIdInput.trim(),
        roomPassword: roomPasswordInput.trim(),
        roomStatus: 'Published',
        roomPublishedBy: adminName,
      })
      setRoomStatus('Published')
      setAlert({
        type: 'success',
        message: `Custom Room ID ${roomIdInput.trim()} published live to all qualified squad captains!`,
      })
      showSuccess(`Room credentials published for ${selectedTourney.title}!`, 'Broadcast Live')
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Failed to publish room details.' })
    } finally {
      setIsPublishing(false)
    }
  }

  const handleStatusChange = async (newStatus) => {
    if (!selectedTourney) return
    try {
      await updateRoomDetails(selectedTourney.id, {
        roomId: roomIdInput.trim(),
        roomPassword: roomPasswordInput.trim(),
        roomStatus: newStatus,
        roomPublishedBy: adminName,
      })
      setRoomStatus(newStatus)
      setAlert({ type: 'success', message: `Room status updated to ${newStatus}.` })
      showSuccess(`Room status updated to ${newStatus}`, 'Status Updated')
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Failed to update status.' })
    }
  }

  // Section 2 Handlers: Match State Actions
  const handleMatchAction = (status, msg) => {
    setMatchStatus(status)
    setAlert({ type: 'success', message: msg })
    showSuccess(msg, `Match State: ${status}`)
    const logTime = new Date().toLocaleTimeString()
    setIncidentLogs((prev) => [
      { id: `inc-${Date.now()}`, time: logTime, event: `Match state changed to ${status}.`, type: 'info' },
      ...prev,
    ])
  }

  // Section 3 Handlers: Emergency Broadcast & Incident Notes
  const handleEmergencyBroadcast = () => {
    if (!broadcastMessage.trim()) return
    setIsBroadcasting(true)
    setTimeout(() => {
      const logTime = new Date().toLocaleTimeString()
      setIncidentLogs((prev) => [
        { id: `inc-${Date.now()}`, time: logTime, event: `Broadcast: "${broadcastMessage.trim()}"`, type: 'warning' },
        ...prev,
      ])
      setAlert({ type: 'success', message: `Emergency Broadcast sent: "${broadcastMessage.trim()}"` })
      showSuccess('Broadcast alert sent to active player dashboards!', 'Emergency Broadcast')
      setBroadcastMessage('')
      setIsBroadcasting(false)
    }, 300)
  }

  const registeredSquadsCount = selectedTourney?.registeredTeams || 0
  const totalSlotsCount = selectedTourney?.maxTeams || 32

  return (
    <div className="space-y-8">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#3a494b]/60 pb-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#00f2ff]/10 border border-[#00f2ff]/30 text-[#00f2ff] text-xs font-bold uppercase">
            <Gamepad2 className="w-3.5 h-3.5" />
            <span>ENTERPRISE MATCH CONTROL CENTER</span>
          </div>
          <h2 className="font-display-lg text-xl sm:text-2xl font-extrabold text-white uppercase tracking-tight">
            MATCH COMMAND & ROOM OPERATIONS
          </h2>
        </div>

        {/* Select Active Tournament */}
        <select
          value={selectedTourneyId}
          onChange={(e) => setSelectedTourneyId(e.target.value)}
          className="py-2.5 px-4 bg-[#07090c] border border-[#3a494b] rounded-lg text-xs font-bold text-[#00f2ff] focus:outline-none focus:border-[#00f2ff]"
        >
          {tournaments.map((t) => (
            <option key={`mc-opt-${t.id}`} value={t.id}>{t.title} ({t.game})</option>
          ))}
        </select>
      </div>

      {alert && <AuthAlert type={alert.type} message={alert.message} />}

      {/* SECTION 1: ROOM MANAGEMENT & SECTION 2: MATCH CONTROLS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* SECTION 1: ROOM MANAGEMENT */}
        <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-5 sm:p-6 space-y-4 shadow-2xl">
          <div className="flex items-center justify-between border-b border-[#3a494b]/60 pb-3">
            <h3 className="font-display-lg text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
              <Key className="w-4.5 h-4.5 text-[#00f2ff]" />
              <span>1. Room Management</span>
            </h3>

            <span className={`px-2.5 py-1 rounded text-[10px] font-mono font-extrabold uppercase border ${
              roomStatus === 'Published'
                ? 'bg-[#00ff9d]/10 text-[#00ff9d] border-[#00ff9d]/40'
                : roomStatus === 'Hidden'
                ? 'bg-red-950/40 text-[#ff3366] border-red-800'
                : roomStatus === 'Completed'
                ? 'bg-[#8e9dae]/10 text-[#8e9dae] border-[#8e9dae]/40'
                : 'bg-[#fe6b00]/10 text-[#fe6b00] border-[#fe6b00]/40'
            }`}>
              {roomStatus}
            </span>
          </div>

          <div className="p-4 bg-[#07090c] rounded-lg border border-[#3a494b]/60 space-y-4">
            {/* Room ID Input */}
            <div className="space-y-1.5">
              <label className="font-label-caps text-[10px] text-[#8e9dae] uppercase tracking-wider block font-bold">
                Manual Room ID <span className="text-[#ff3366]">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={roomIdInput}
                  onChange={(e) => setRoomIdInput(e.target.value)}
                  placeholder="Enter Free Fire / BGMI Custom Room ID..."
                  className="flex-1 px-3.5 py-2.5 bg-[#151a21] border border-[#3a494b] rounded-lg text-sm font-mono text-[#00f2ff] font-extrabold focus:outline-none focus:border-[#00f2ff]"
                />
                {roomIdInput && (
                  <button
                    onClick={() => handleCopy(roomIdInput, 'Room ID')}
                    className="px-3.5 py-2 bg-[#1d232c] hover:bg-[#3a494b] text-[#00f2ff] border border-[#3a494b] rounded-lg text-xs font-bold flex items-center gap-1 shrink-0"
                    title="Copy Room ID"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <label className="font-label-caps text-[10px] text-[#8e9dae] uppercase tracking-wider block font-bold">
                Manual Password <span className="text-[#ff3366]">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={roomPasswordInput}
                  onChange={(e) => setRoomPasswordInput(e.target.value)}
                  placeholder="Enter Custom Room Password..."
                  className="flex-1 px-3.5 py-2.5 bg-[#151a21] border border-[#3a494b] rounded-lg text-sm font-mono text-[#fe6b00] font-extrabold focus:outline-none focus:border-[#00f2ff]"
                />
                {roomPasswordInput && (
                  <button
                    onClick={() => handleCopy(roomPasswordInput, 'Password')}
                    className="px-3.5 py-2 bg-[#1d232c] hover:bg-[#3a494b] text-[#fe6b00] border border-[#3a494b] rounded-lg text-xs font-bold flex items-center gap-1 shrink-0"
                    title="Copy Password"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Metadata Footer */}
            {selectedTourney?.roomLastUpdated && (
              <div className="pt-2 border-t border-[#3a494b]/40 flex items-center justify-between text-[10px] font-mono text-[#8e9dae]">
                <span>Last Updated: {new Date(selectedTourney.roomLastUpdated).toLocaleTimeString()}</span>
                <span>By: {selectedTourney.roomPublishedBy || 'Admin'}</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <LoadingButton
              onClick={handleSaveDraft}
              loading={isSaving}
              loadingText="Saving..."
              variant="secondary"
              className="py-3"
            >
              <Save className="w-4 h-4 inline mr-1" />
              <span>Save Draft</span>
            </LoadingButton>

            <LoadingButton
              onClick={handlePublishRoom}
              loading={isPublishing}
              loadingText="Publishing..."
              className="py-3 bg-[#00f2ff] hover:bg-[#33f5ff] text-[#00363a] font-extrabold"
            >
              <Globe className="w-4 h-4 inline mr-1" />
              <span>Publish Room</span>
            </LoadingButton>
          </div>

          {/* Room Status Controls */}
          <div className="pt-2 flex items-center justify-between gap-2 text-xs">
            <span className="font-label-caps text-[10px] text-[#8e9dae] uppercase font-bold">Room Status:</span>
            <div className="flex gap-1.5">
              <button
                onClick={() => handleStatusChange('Draft')}
                className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-colors ${roomStatus === 'Draft' ? 'bg-[#fe6b00] text-slate-950 font-extrabold' : 'bg-[#07090c] text-[#8e9dae] border border-[#3a494b]'}`}
              >
                Draft
              </button>
              <button
                onClick={() => handleStatusChange('Published')}
                className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-colors ${roomStatus === 'Published' ? 'bg-[#00ff9d] text-slate-950 font-extrabold' : 'bg-[#07090c] text-[#8e9dae] border border-[#3a494b]'}`}
              >
                Published
              </button>
              <button
                onClick={() => handleStatusChange('Hidden')}
                className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-colors ${roomStatus === 'Hidden' ? 'bg-red-800 text-white font-extrabold' : 'bg-[#07090c] text-[#8e9dae] border border-[#3a494b]'}`}
              >
                Hidden
              </button>
              <button
                onClick={() => handleStatusChange('Completed')}
                className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-colors ${roomStatus === 'Completed' ? 'bg-[#00f2ff] text-[#00363a] font-extrabold' : 'bg-[#07090c] text-[#8e9dae] border border-[#3a494b]'}`}
              >
                Completed
              </button>
            </div>
          </div>
        </div>

        {/* SECTION 2: MATCH CONTROLS */}
        <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-5 sm:p-6 space-y-4 shadow-2xl">
          <div className="flex items-center justify-between border-b border-[#3a494b]/60 pb-3">
            <h3 className="font-display-lg text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
              <Tv className="w-4.5 h-4.5 text-[#fe6b00]" />
              <span>2. Match Controls</span>
            </h3>

            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${
                matchStatus === 'Match Live' ? 'bg-[#00ff9d] animate-pulse' : matchStatus === 'Paused' ? 'bg-[#ffb800]' : 'bg-[#fe6b00]'
              }`} />
              <span className="font-mono text-xs font-extrabold text-white uppercase">{matchStatus}</span>
            </div>
          </div>

          <div className="p-4 bg-[#07090c] rounded-lg border border-[#3a494b]/60 space-y-3">
            <span className="text-[#8e9dae] text-xs font-semibold block">Live Playback Controls</span>
            <p className="text-[11px] text-[#8e9dae] leading-relaxed">
              Control the active tournament match state. Updating the match state triggers live notifications to all connected broadcast observers and players.
            </p>
          </div>

          {/* Match Action Buttons: Start, Pause, Resume, End */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              onClick={() => handleMatchAction('Match Live', 'Match started live!')}
              className="py-3 bg-[#00ff9d]/10 hover:bg-[#00ff9d]/20 border border-[#00ff9d]/40 text-[#00ff9d] font-extrabold text-xs rounded-lg flex items-center justify-center gap-1.5 uppercase min-h-[44px] transition-colors"
            >
              <Play className="w-4 h-4" />
              <span>Start</span>
            </button>

            <button
              onClick={() => handleMatchAction('Paused', 'Match paused by host.')}
              className="py-3 bg-[#ffb800]/10 hover:bg-[#ffb800]/20 border border-[#ffb800]/40 text-[#ffb800] font-extrabold text-xs rounded-lg flex items-center justify-center gap-1.5 uppercase min-h-[44px] transition-colors"
            >
              <Pause className="w-4 h-4" />
              <span>Pause</span>
            </button>

            <button
              onClick={() => handleMatchAction('Match Live', 'Match resumed!')}
              className="py-3 bg-[#00f2ff]/10 hover:bg-[#00f2ff]/20 border border-[#00f2ff]/40 text-[#00f2ff] font-extrabold text-xs rounded-lg flex items-center justify-center gap-1.5 uppercase min-h-[44px] transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Resume</span>
            </button>

            <button
              onClick={() => handleMatchAction('Ended', 'Match completed.')}
              className="py-3 bg-red-950/40 hover:bg-red-900/60 border border-red-800 text-[#ff3366] font-extrabold text-xs rounded-lg flex items-center justify-center gap-1.5 uppercase min-h-[44px] transition-colors"
            >
              <Square className="w-4 h-4" />
              <span>End</span>
            </button>
          </div>
        </div>

      </div>

      {/* SECTION 3: COMMAND CENTER */}
      <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-5 sm:p-6 space-y-6 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#3a494b]/60 pb-3">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#fe6b00]" />
            <h3 className="font-display-lg text-lg font-extrabold text-white uppercase tracking-wider">
              3. Command Center
            </h3>
          </div>
          <span className="font-mono text-xs text-[#00ff9d] font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#00ff9d] animate-pulse"></span>
            Realtime Operations Console Active
          </span>
        </div>

        {/* Command Center Sub-Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Sub-Widget 1: Live Match Status & Timeline */}
          <div className="bg-[#07090c] border border-[#3a494b]/60 rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-label-caps text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#00f2ff]" />
                Tournament Timeline
              </span>
              <span className="text-[10px] font-mono text-[#00f2ff] font-bold uppercase">Round 1</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded bg-[#151a21] border border-[#3a494b]/40">
                <span className="text-[#8e9dae]">1. Registration</span>
                <span className="text-[#00ff9d] font-bold">Closed</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-[#151a21] border border-[#3a494b]/40">
                <span className="text-[#8e9dae]">2. Room Dispatch</span>
                <span className={`font-bold ${roomStatus === 'Published' ? 'text-[#00ff9d]' : 'text-[#fe6b00]'}`}>
                  {roomStatus}
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-[#151a21] border border-[#3a494b]/40">
                <span className="text-[#8e9dae]">3. Match Playback</span>
                <span className="text-[#00f2ff] font-bold">{matchStatus}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-[#151a21] border border-[#3a494b]/40">
                <span className="text-[#8e9dae]">4. Score Verification</span>
                <span className="text-[#8e9dae] font-bold">Pending</span>
              </div>
            </div>
          </div>

          {/* Sub-Widget 2: Player Check-in Summary */}
          <div className="bg-[#07090c] border border-[#3a494b]/60 rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-label-caps text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#00ff9d]" />
                Player Check-in Summary
              </span>
              <span className="text-[10px] font-mono text-[#00ff9d] font-bold uppercase">
                {registeredSquadsCount} / {totalSlotsCount} Squads
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="p-2.5 rounded bg-[#151a21] border border-[#3a494b]/40">
                  <span className="text-[10px] text-[#8e9dae] block uppercase font-semibold">Total Players</span>
                  <span className="font-mono text-base font-extrabold text-[#00f2ff]">{registeredSquadsCount * 4}</span>
                </div>
                <div className="p-2.5 rounded bg-[#151a21] border border-[#3a494b]/40">
                  <span className="text-[10px] text-[#8e9dae] block uppercase font-semibold">Ready Status</span>
                  <span className="font-mono text-base font-extrabold text-[#00ff9d]">100% Verified</span>
                </div>
              </div>
              <p className="text-[11px] text-[#8e9dae] leading-relaxed">
                All player Game UIDs and WhatsApp contact numbers have been verified in the registration queue.
              </p>
            </div>
          </div>

          {/* Sub-Widget 3: Emergency Broadcast Panel */}
          <div className="bg-[#07090c] border border-[#3a494b]/60 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-label-caps text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Radio className="w-4 h-4 text-[#fe6b00]" />
                Emergency Broadcast Panel
              </span>
              <span className="text-[10px] font-mono text-[#fe6b00] font-bold uppercase">Broadcaster</span>
            </div>

            <div className="space-y-2">
              <input
                type="text"
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                placeholder="Broadcast emergency notice to squad captains..."
                className="w-full px-3 py-2 bg-[#151a21] border border-[#3a494b] rounded text-xs text-[#e1e2e7] placeholder-[#8e9dae] focus:outline-none focus:border-[#fe6b00]"
              />
              <LoadingButton
                onClick={handleEmergencyBroadcast}
                loading={isBroadcasting}
                disabled={!broadcastMessage.trim()}
                loadingText="Sending..."
                className="w-full py-2 bg-[#fe6b00] hover:bg-[#ff8533] text-slate-950 font-extrabold text-xs min-h-[36px]"
              >
                <Send className="w-3.5 h-3.5 inline mr-1" />
                <span>Send Emergency Broadcast</span>
              </LoadingButton>
            </div>
          </div>

        </div>

        {/* Sub-Grid Row 2: Incident Log & Admin Notes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
          
          {/* Incident Log */}
          <div className="bg-[#07090c] border border-[#3a494b]/60 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-label-caps text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-[#fe6b00]" />
                Incident & Event Log
              </span>
              <span className="text-[10px] font-mono text-[#8e9dae]">{incidentLogs.length} Events Logged</span>
            </div>

            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {incidentLogs.map((log) => (
                <div key={log.id} className="p-2 bg-[#151a21] border border-[#3a494b]/40 rounded text-xs flex items-center gap-2">
                  <span className="font-mono text-[10px] text-[#8e9dae] shrink-0">{log.time}</span>
                  <span className={`text-[11px] ${log.type === 'warning' ? 'text-[#fe6b00] font-bold' : 'text-[#e1e2e7]'}`}>
                    {log.event}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Admin Notes Scratchpad */}
          <div className="bg-[#07090c] border border-[#3a494b]/60 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-label-caps text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-[#00f2ff]" />
                Host & Admin Notes
              </span>
              <span className="text-[10px] font-mono text-[#00f2ff]">Private Host Notes</span>
            </div>

            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              rows={3}
              placeholder="Enter private admin scratchpad notes for this match..."
              className="w-full px-3 py-2 bg-[#151a21] border border-[#3a494b] rounded text-xs text-[#e1e2e7] focus:outline-none focus:border-[#00f2ff] resize-none"
            />
          </div>

        </div>
      </div>

      {/* SECTION 4: RESULTS & STANDINGS TRANSITION */}
      <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-5 sm:p-6 space-y-4 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="font-display-lg text-base sm:text-lg font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-[#00ff9d]" />
              <span>4. Match Results & Standings</span>
            </h3>
            <p className="text-xs text-[#8e9dae]">
              Enter final match placement points, kill finishes, and publish updated tournament standings live.
            </p>
          </div>

          {setActiveTab && (
            <button
              onClick={() => setActiveTab('leaderboards')}
              className="px-5 py-2.5 bg-[#00f2ff] hover:bg-[#33f5ff] text-[#00363a] font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-[0_0_15px_rgba(0,242,255,0.4)] transition-all flex items-center gap-2 shrink-0 min-h-[44px]"
            >
              <span>Enter Match Scores & Standings</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

    </div>
  )
}
