import { useState, useEffect } from 'react'
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
  RefreshCw
} from 'lucide-react'
import TournamentLifecycleTracker from './TournamentLifecycleTracker'
import RegistrationQueueView from '../RegistrationQueueView'
import { useTournaments } from '../../../contexts/TournamentContext'
import { useToast } from '../../../contexts/ToastContext'

export default function TournamentOperationsWorkspace({ tournament, onBackToRoster, updateRegistrationStatus }) {
  const { showSuccess, showError } = useToast()
  const { updateRoomDetails, updateTournamentStatus, getRoomCredentials, advanceTournamentLifecycle } = useTournaments()

  const [activeTab, setActiveTab] = useState('OVERVIEW') // 'OVERVIEW' | 'QUEUE' | 'ROOM' | 'MATCH' | 'RESULTS' | 'HISTORY'

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
      <div className="p-8 bg-[#151a21] border border-[#3a494b]/60 rounded-xl text-center font-mono space-y-3">
        <Trophy className="w-8 h-8 text-[#8e9dae] mx-auto" />
        <p className="text-xs text-[#8e9dae]">No tournament selected for operations workspace.</p>
        <button
          onClick={onBackToRoster}
          className="px-4 py-2 bg-[#07090c] hover:bg-[#1d232c] border border-[#3a494b] text-[#00f2ff] rounded text-xs font-bold uppercase"
        >
          Back to Roster
        </button>
      </div>
    )
  }

  const handleSaveRoomDetails = async () => {
    if (!roomId.trim() || !roomPassword.trim()) {
      showError('Please provide both Room ID and Password before saving.', 'Room Credentials')
      return
    }
    setIsSavingRoom(true)
    try {
      const res = await updateRoomDetails(tournament.id, {
        roomId: roomId.trim(),
        roomPassword: roomPassword.trim(),
        roomStatus: 'Published',
      })
      if (res && res.success === false) {
        showError(res.error || 'Failed to save room details.', 'Room Error')
      } else {
        setRoomStatus('Published')
        showSuccess('Room ID & Password successfully updated and published.', 'Room Published')
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
      showSuccess(`Match state set to "${newStatus}"`, 'Match Control')
    } catch {
      showError('Failed to update match state.', 'Match Control Exception')
    } finally {
      setIsUpdatingMatch(false)
    }
  }

  return (
    <div className="space-y-6">

      {/* Header & Back Button */}
      <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#3a494b]/60 pb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToRoster}
              className="p-2 bg-[#07090c] hover:bg-[#1d232c] border border-[#3a494b] text-[#00f2ff] rounded-lg transition-colors"
              title="Return to All Tournaments"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-headline text-lg sm:text-xl font-black text-white uppercase tracking-tight">
                  {tournament.title}
                </h1>
                <span className="px-2.5 py-0.5 bg-[#00f2ff]/10 text-[#00f2ff] border border-[#00f2ff]/30 text-[10px] font-mono font-bold rounded uppercase">
                  {tournament.game}
                </span>
              </div>
              <p className="text-xs text-[#8e9dae] font-mono mt-0.5">
                Format: {tournament.format || 'SQUAD'} • Prize: {tournament.prizePool || tournament.prize_pool || '₹0'} • Fee: {tournament.entryFee || tournament.entry_fee || 'Free'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="text-[#8e9dae]">Registered:</span>
            <span className="font-bold text-[#00ff9d]">
              {tournament.registeredTeams ?? tournament.registered_teams ?? 0} / {tournament.maxTeams ?? tournament.max_teams ?? 32} Teams
            </span>
          </div>
        </div>

        {/* 7-Stage Visual Lifecycle Tracker */}
        <TournamentLifecycleTracker currentStatus={tournament.status} />

        {/* Workspace Sub-Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto text-xs font-mono font-bold border-b border-[#3a494b]/60 pb-2">
          {[
            { id: 'OVERVIEW', label: 'OVERVIEW' },
            { id: 'QUEUE', label: 'REGISTRATION QUEUE' },
            { id: 'ROOM', label: 'ROOM MANAGEMENT' },
            { id: 'MATCH', label: 'MATCH OPERATIONS' },
            { id: 'RESULTS', label: 'RESULTS PIPELINE' },
            { id: 'HISTORY', label: 'HISTORY' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2 rounded-lg transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-[#00f2ff] text-black font-extrabold shadow-[0_0_12px_rgba(0,242,255,0.3)]'
                  : 'bg-[#07090c] text-[#8e9dae] hover:text-white border border-[#3a494b]/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* SUB-TAB 1: OVERVIEW */}
      {activeTab === 'OVERVIEW' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 font-mono">
          <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-5 space-y-3 shadow-xl">
            <h3 className="font-headline text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-[#3a494b]/60 pb-2">
              <Trophy className="w-4 h-4 text-[#00f2ff]" />
              <span>METADATA & SPECIFICATIONS</span>
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between p-2.5 bg-[#07090c] rounded border border-[#3a494b]">
                <span className="text-[#8e9dae]">Game Arena:</span>
                <span className="font-bold text-white">{tournament.game}</span>
              </div>
              <div className="flex justify-between p-2.5 bg-[#07090c] rounded border border-[#3a494b]">
                <span className="text-[#8e9dae]">Match Format:</span>
                <span className="font-bold text-white">{tournament.format || 'SQUAD'}</span>
              </div>
              <div className="flex justify-between p-2.5 bg-[#07090c] rounded border border-[#3a494b]">
                <span className="text-[#8e9dae]">Schedule Date:</span>
                <span className="font-bold text-white">{tournament.startDate || 'TBD'}</span>
              </div>
              <div className="flex justify-between p-2.5 bg-[#07090c] rounded border border-[#3a494b]">
                <span className="text-[#8e9dae]">Schedule Time:</span>
                <span className="font-bold text-white">{tournament.startTime || 'TBD'}</span>
              </div>
            </div>
          </div>

          <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-5 space-y-3 shadow-xl">
            <h3 className="font-headline text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-[#3a494b]/60 pb-2">
              <CreditCard className="w-4 h-4 text-[#00ff9d]" />
              <span>ENTRY & PRIZE POOL</span>
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between p-2.5 bg-[#07090c] rounded border border-[#3a494b]">
                <span className="text-[#8e9dae]">Prize Pool:</span>
                <span className="font-bold text-[#00ff9d]">{tournament.prizePool || tournament.prize_pool || '₹0'}</span>
              </div>
              <div className="flex justify-between p-2.5 bg-[#07090c] rounded border border-[#3a494b]">
                <span className="text-[#8e9dae]">Entry Fee:</span>
                <span className="font-bold text-[#00f2ff]">{tournament.entryFee || tournament.entry_fee || 'Free'}</span>
              </div>
              <div className="flex justify-between p-2.5 bg-[#07090c] rounded border border-[#3a494b]">
                <span className="text-[#8e9dae]">Slot Capacity:</span>
                <span className="font-bold text-white">{tournament.maxTeams || 32} Max Teams</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: REGISTRATION QUEUE */}
      {activeTab === 'QUEUE' && (
        <RegistrationQueueView
          tournaments={[tournament]}
          updateRegistrationStatus={updateRegistrationStatus}
        />
      )}

      {/* SUB-TAB 3: ROOM MANAGEMENT */}
      {activeTab === 'ROOM' && (
        <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-5 space-y-4 shadow-xl max-w-xl font-mono">
          <div className="flex items-center justify-between border-b border-[#3a494b]/60 pb-3">
            <h3 className="font-headline text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
              <Key className="w-4 h-4 text-[#00f2ff]" />
              <span>CUSTOM ROOM CREDENTIALS</span>
            </h3>
            <span className="px-2 py-0.5 bg-[#00f2ff]/10 text-[#00f2ff] border border-[#00f2ff]/30 text-[9px] font-bold rounded uppercase">
              STATUS: {roomStatus}
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-[10px] text-[#8e9dae] uppercase mb-1">ROOM ID</label>
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="Enter Custom Room ID..."
                className="w-full bg-[#07090c] border border-[#3a494b] rounded-lg px-3 py-2 text-white focus:border-[#00f2ff] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] text-[#8e9dae] uppercase mb-1">ROOM PASSWORD</label>
              <input
                type="text"
                value={roomPassword}
                onChange={(e) => setRoomPassword(e.target.value)}
                placeholder="Enter Room Password..."
                className="w-full bg-[#07090c] border border-[#3a494b] rounded-lg px-3 py-2 text-white focus:border-[#00f2ff] focus:outline-none"
              />
            </div>

            <button
              onClick={handleSaveRoomDetails}
              disabled={isSavingRoom}
              className="w-full py-2.5 bg-[#00f2ff] hover:bg-[#00f2ff]/90 text-black font-extrabold rounded-lg text-xs uppercase tracking-wider transition-all"
            >
              {isSavingRoom ? 'PUBLISHING...' : 'SAVE & PUBLISH ROOM CREDENTIALS'}
            </button>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: MATCH CONTROLS */}
      {activeTab === 'MATCH' && (
        <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-5 space-y-4 shadow-xl max-w-xl font-mono">
          <div className="flex items-center justify-between border-b border-[#3a494b]/60 pb-3">
            <h3 className="font-headline text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
              <Radio className="w-4 h-4 text-[#fe6b00]" />
              <span>STATE-AWARE MATCH CONTROLS</span>
            </h3>
            <span className="px-2 py-0.5 bg-[#fe6b00]/10 text-[#fe6b00] border border-[#fe6b00]/30 text-[9px] font-bold rounded uppercase">
              STATE: {matchStatus}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <button
              onClick={() => handleUpdateMatchState('LIVE', 'Live Now')}
              disabled={isUpdatingMatch || matchStatus === 'LIVE'}
              className="p-3 bg-[#00ff9d]/10 hover:bg-[#00ff9d]/20 border border-[#00ff9d]/40 text-[#00ff9d] rounded-lg font-bold uppercase transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Play className="w-4 h-4" />
              <span>START MATCH</span>
            </button>

            <button
              onClick={() => handleUpdateMatchState('PAUSED', 'Live Now')}
              disabled={isUpdatingMatch || matchStatus === 'PAUSED'}
              className="p-3 bg-[#fe6b00]/10 hover:bg-[#fe6b00]/20 border border-[#fe6b00]/40 text-[#fe6b00] rounded-lg font-bold uppercase transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Pause className="w-4 h-4" />
              <span>PAUSE MATCH</span>
            </button>

            <button
              onClick={() => handleUpdateMatchState('LOBBY', 'Registration Open')}
              disabled={isUpdatingMatch || matchStatus === 'LOBBY'}
              className="p-3 bg-[#00f2ff]/10 hover:bg-[#00f2ff]/20 border border-[#00f2ff]/40 text-[#00f2ff] rounded-lg font-bold uppercase transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <RotateCcw className="w-4 h-4" />
              <span>RESUME LOBBY</span>
            </button>

            <button
              onClick={() => handleUpdateMatchState('ENDED', 'Completed')}
              disabled={isUpdatingMatch || matchStatus === 'ENDED'}
              className="p-3 bg-red-950/60 hover:bg-red-900/60 border border-red-500/40 text-red-400 rounded-lg font-bold uppercase transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Square className="w-4 h-4" />
              <span>END MATCH</span>
            </button>
          </div>
        </div>
      )}

      {/* SUB-TAB 5: RESULTS PIPELINE */}
      {activeTab === 'RESULTS' && (
        <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-5 space-y-4 shadow-xl font-mono">
          <div className="flex items-center justify-between border-b border-[#3a494b]/60 pb-3">
            <h3 className="font-headline text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#00ff9d]" />
              <span>RESULT VERIFICATION PIPELINE</span>
            </h3>
            <span className="text-[10px] text-[#8e9dae] uppercase">PIPELINE PLACEHOLDER</span>
          </div>

          <div className="p-4 bg-[#07090c] border border-[#3a494b] rounded-lg space-y-2 text-xs">
            <span className="text-[#00f2ff] font-bold block">Future OCR & Screenshot Verification Workflow</span>
            <p className="text-[#8e9dae]">
              Result submissions and OCR scorecard extraction pipeline will integrate cleanly in Phase 3.
            </p>
          </div>
        </div>
      )}

      {/* SUB-TAB 6: HISTORY */}
      {activeTab === 'HISTORY' && (
        <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-5 space-y-4 shadow-xl font-mono">
          <div className="flex items-center justify-between border-b border-[#3a494b]/60 pb-3">
            <h3 className="font-headline text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#00f2ff]" />
              <span>TOURNAMENT MATCH HISTORY</span>
            </h3>
            <span className="text-[10px] text-[#8e9dae] uppercase">ARCHIVE STREAM</span>
          </div>

          <div className="p-4 bg-[#07090c] border border-[#3a494b] rounded-lg text-xs text-[#8e9dae]">
            Status: {tournament.status} • Scheduled Date: {tournament.startDate || 'TBD'}
          </div>
        </div>
      )}

    </div>
  )
}
