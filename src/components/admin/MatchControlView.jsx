import { useState } from 'react'
import { Gamepad2, Key, Play, Pause, Square, CheckCircle2, Tv, Upload, Shield } from 'lucide-react'
import AuthAlert from '../common/AuthAlert'

export default function MatchControlView({ tournaments }) {
  const [selectedTourneyId, setSelectedTourneyId] = useState(tournaments[0]?.id || '')
  const [matchStatus, setMatchStatus] = useState('Lobby Waiting') // 'Lobby Waiting' | 'Match Live' | 'Paused' | 'Ended'
  const [roomData, setRoomData] = useState({ id: '8492019', pass: '7741', published: false })
  const [alert, setAlert] = useState(null)

  const handleGenerate = () => {
    const id = Math.floor(1000000 + Math.random() * 9000000).toString()
    const pass = Math.floor(1000 + Math.random() * 9000).toString()
    setRoomData({ id, pass, published: false })
    setAlert({ type: 'success', message: `Generated Custom Match Room ID ${id} / Pass ${pass}` })
  }

  const handlePublish = () => {
    setRoomData((prev) => ({ ...prev, published: true }))
    setAlert({ type: 'success', message: `Custom Room ID ${roomData.id} published live to all qualified squad captains!` })
  }

  const handleAction = (status, msg) => {
    setMatchStatus(status)
    setAlert({ type: 'success', message: msg })
  }

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#3a494b]/60 pb-4">
        <div className="space-y-1">
          <h2 className="font-display-lg text-xl sm:text-2xl font-extrabold text-white uppercase tracking-tight flex items-center gap-2">
            <Gamepad2 className="w-6 h-6 text-[#00f2ff]" />
            <span>MATCH CONTROL & ROOM GENERATOR</span>
          </h2>
          <p className="text-xs text-[#8e9dae]">
            Generate custom room IDs, broadcast credentials, and control live match playback (Start, Pause, End).
          </p>
        </div>

        {/* Select Active Match */}
        <select
          value={selectedTourneyId}
          onChange={(e) => setSelectedTourneyId(e.target.value)}
          className="py-2.5 px-4 bg-[#07090c] border border-[#3a494b] rounded text-xs font-bold text-[#00f2ff] focus:outline-none"
        >
          {tournaments.map((t) => (
            <option key={`mc-opt-${t.id}`} value={t.id}>{t.title} ({t.game})</option>
          ))}
        </select>
      </div>

      {alert && <AuthAlert type={alert.type} message={alert.message} />}

      {/* Main Grid: Control Console & Room Box */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Custom Room Generator */}
        <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-5 space-y-4 shadow-xl">
          <h3 className="font-display-lg text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Key className="w-4 h-4 text-[#00f2ff]" />
            <span>Custom Room Credentials</span>
          </h3>

          <div className="p-4 bg-[#07090c] rounded border border-[#3a494b]/60 space-y-3 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-[#8e9dae] font-semibold">Room ID:</span>
              <span className="font-mono text-lg font-extrabold text-[#00f2ff]">{roomData.id}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#8e9dae] font-semibold">Password:</span>
              <span className="font-mono text-lg font-extrabold text-[#fe6b00]">{roomData.pass}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#8e9dae] font-semibold">Broadcast Status:</span>
              <span className={`font-bold ${roomData.published ? 'text-[#00ff9d]' : 'text-[#ffb800]'}`}>
                {roomData.published ? 'Published Live' : 'Private Draft'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleGenerate}
              className="py-3 bg-[#07090c] hover:bg-[#1d232c] border border-[#3a494b] text-[#e1e2e7] font-bold text-xs rounded uppercase min-h-[44px]"
            >
              Generate New ID
            </button>
            <button
              onClick={handlePublish}
              disabled={roomData.published}
              className="btn-cyber-primary text-xs py-3 min-h-[44px] disabled:opacity-50"
            >
              Publish Room ID
            </button>
          </div>
        </div>

        {/* Live Match Playback Control */}
        <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-5 space-y-4 shadow-xl">
          <h3 className="font-display-lg text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Tv className="w-4 h-4 text-[#fe6b00]" />
            <span>Match State Control</span>
          </h3>

          <div className="p-4 bg-[#07090c] rounded border border-[#3a494b]/60 space-y-2 text-xs">
            <span className="text-[#8e9dae] font-semibold block">Current State</span>
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${
                matchStatus === 'Match Live' ? 'bg-[#00ff9d] animate-pulse' : matchStatus === 'Paused' ? 'bg-[#ffb800]' : 'bg-[#fe6b00]'
              }`} />
              <span className="font-display-lg text-base font-extrabold text-white uppercase">{matchStatus}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleAction('Match Live', 'Match started live!')}
              className="py-2.5 bg-[#00ff9d]/10 hover:bg-[#00ff9d]/20 border border-[#00ff9d]/40 text-[#00ff9d] font-bold text-xs rounded flex items-center justify-center gap-1 uppercase min-h-[44px]"
            >
              <Play className="w-4 h-4" />
              <span>Start</span>
            </button>

            <button
              onClick={() => handleAction('Paused', 'Match paused by host.')}
              className="py-2.5 bg-[#ffb800]/10 hover:bg-[#ffb800]/20 border border-[#ffb800]/40 text-[#ffb800] font-bold text-xs rounded flex items-center justify-center gap-1 uppercase min-h-[44px]"
            >
              <Pause className="w-4 h-4" />
              <span>Pause</span>
            </button>

            <button
              onClick={() => handleAction('Ended', 'Match completed.')}
              className="py-2.5 bg-red-950/40 hover:bg-red-900/60 border border-red-800 text-[#ff3366] font-bold text-xs rounded flex items-center justify-center gap-1 uppercase min-h-[44px]"
            >
              <Square className="w-4 h-4" />
              <span>End Match</span>
            </button>
          </div>
        </div>

      </div>

    </div>
  )
}
