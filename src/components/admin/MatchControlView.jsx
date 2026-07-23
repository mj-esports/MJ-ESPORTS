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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-extrabold text-white uppercase tracking-tight flex items-center gap-2">
            <Gamepad2 className="w-6 h-6 text-indigo-400" />
            <span>MATCH CONTROL & ROOM GENERATOR</span>
          </h2>
          <p className="text-xs text-slate-400">
            Generate custom room IDs, broadcast credentials, and control live match playback (Start, Pause, End).
          </p>
        </div>

        {/* Select Active Match */}
        <select
          value={selectedTourneyId}
          onChange={(e) => setSelectedTourneyId(e.target.value)}
          className="py-2.5 px-4 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-purple-300"
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
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Key className="w-4 h-4 text-purple-400" />
            <span>Custom Room Credentials</span>
          </h3>

          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-semibold">Room ID:</span>
              <span className="text-lg font-extrabold text-cyan-300">{roomData.id}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-semibold">Password:</span>
              <span className="text-lg font-extrabold text-purple-400">{roomData.pass}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-semibold">Broadcast Status:</span>
              <span className={`font-bold ${roomData.published ? 'text-emerald-400' : 'text-amber-400'}`}>
                {roomData.published ? 'Published Live' : 'Private Draft'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleGenerate}
              className="py-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-purple-300 font-bold text-xs rounded-xl min-h-[44px]"
            >
              Generate New ID
            </button>
            <button
              onClick={handlePublish}
              disabled={roomData.published}
              className="py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl disabled:opacity-50 min-h-[44px]"
            >
              Publish Room ID
            </button>
          </div>
        </div>

        {/* Live Match Playback State Machine */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Play className="w-4 h-4 text-emerald-400" />
              <span>Match Execution Controls</span>
            </h3>
            <span className={`px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase border ${
              matchStatus === 'Match Live'
                ? 'bg-red-950 text-red-400 border-red-800 animate-pulse'
                : 'bg-slate-950 text-cyan-300 border-slate-800'
            }`}>
              {matchStatus}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => handleAction('Match Live', 'Match started! Live telemetry enabled.')}
              className="py-3 bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 min-h-[44px]"
            >
              <Play className="w-4 h-4" />
              <span>Start Match</span>
            </button>

            <button
              onClick={() => handleAction('Paused', 'Match paused by tournament referee.')}
              className="py-3 bg-yellow-950 hover:bg-yellow-900 border border-yellow-800 text-yellow-300 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 min-h-[44px]"
            >
              <Pause className="w-4 h-4" />
              <span>Pause Match</span>
            </button>

            <button
              onClick={() => handleAction('Match Live', 'Match resumed.')}
              className="py-3 bg-indigo-950 hover:bg-indigo-900 border border-indigo-800 text-indigo-300 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 min-h-[44px]"
            >
              <Play className="w-4 h-4" />
              <span>Resume Match</span>
            </button>

            <button
              onClick={() => handleAction('Ended', 'Match ended. Preparing points telemetry...')}
              className="py-3 bg-red-950 hover:bg-red-900 border border-red-800 text-red-300 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 min-h-[44px]"
            >
              <Square className="w-4 h-4" />
              <span>End Match</span>
            </button>
          </div>

          <div className="pt-2 border-t border-slate-800">
            <button
              onClick={() => setAlert({ type: 'success', message: 'Match result telemetry screenshot uploaded successfully!' })}
              className="w-full py-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-cyan-300 font-bold text-xs rounded-xl flex items-center justify-center gap-2 min-h-[44px]"
            >
              <Upload className="w-4 h-4 text-cyan-400" />
              <span>Upload Result Telemetry Screenshot</span>
            </button>
          </div>
        </div>

      </div>

    </div>
  )
}
