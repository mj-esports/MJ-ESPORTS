import { useState } from 'react'
import { Zap, Tv, Key, CheckCircle2, Play, AlertTriangle, ArrowRight, Gamepad2, Shield } from 'lucide-react'
import AuthAlert from '../common/AuthAlert'

export default function LiveOperationsView({ tournaments, setActiveTab }) {
  const liveTournaments = tournaments.filter((t) => t.status === 'Live Now' || t.status === 'Registration Open')

  const [roomStates, setRoomStates] = useState({
    't-1': { roomId: '8492019', roomPass: '7741', published: true },
    't-2': { roomId: '5192041', roomPass: '9921', published: false },
  })

  const [alert, setAlert] = useState(null)

  const handleGenerateRoom = (tId) => {
    const newRoomId = Math.floor(1000000 + Math.random() * 9000000).toString()
    const newPass = Math.floor(1000 + Math.random() * 9000).toString()
    setRoomStates((prev) => ({
      ...prev,
      [tId]: { roomId: newRoomId, roomPass: newPass, published: false },
    }))
    setAlert({ type: 'success', message: `Generated new custom room credentials: ID ${newRoomId} / Pass ${newPass}` })
  }

  const handlePublishRoom = (tId) => {
    setRoomStates((prev) => ({
      ...prev,
      [tId]: { ...(prev[tId] || {}), published: true },
    }))
    setAlert({ type: 'success', message: `Custom Room credentials published live to registered teams for tournament ${tId}!` })
  }

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-950 border border-red-800 text-red-400 text-xs font-bold">
            <Zap className="w-3.5 h-3.5" />
            <span>LIVE TOURNAMENT OPERATIONS</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white uppercase tracking-tight">
            ACTIVE MATCH COMMAND CENTER
          </h2>
        </div>
      </div>

      {alert && <AuthAlert type={alert.type} message={alert.message} />}

      {/* Live Tournaments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {liveTournaments.map((t) => {
          const room = roomStates[t.id] || { roomId: 'Pending', roomPass: '----', published: false }
          return (
            <div key={`live-card-${t.id}`} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xl">
              
              {/* Header Badge & Title */}
              <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase bg-slate-950 text-cyan-300 border border-cyan-500/30">
                      {t.game}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border ${
                      t.status === 'Live Now'
                        ? 'bg-red-950 text-red-400 border-red-800'
                        : 'bg-emerald-950 text-emerald-400 border-emerald-800'
                    }`}>
                      {t.status}
                    </span>
                  </div>
                  <h3 className="font-extrabold text-white text-base sm:text-lg">{t.title}</h3>
                </div>
                
                <span className="text-[10px] font-bold text-slate-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                  Round 1 of 3
                </span>
              </div>

              {/* Tournament Details List */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-500 text-[10px] font-bold block uppercase">Registered Players</span>
                  <span className="text-white font-extrabold text-xs">{t.registeredTeams * 4} Players ({t.registeredTeams} Squads)</span>
                </div>

                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-500 text-[10px] font-bold block uppercase">Start Time</span>
                  <span className="text-purple-300 font-extrabold text-xs">{t.startDate} ({t.startTime || '06:00 PM IST'})</span>
                </div>

                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-500 text-[10px] font-bold block uppercase">Room Status</span>
                  <span className={`text-xs font-bold ${room.published ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {room.published ? `Published (ID: ${room.roomId})` : room.roomId !== 'Pending' ? `Generated (Pass: ${room.roomPass})` : 'Pending Generation'}
                  </span>
                </div>

                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-500 text-[10px] font-bold block uppercase">Results Status</span>
                  <span className="text-cyan-300 font-bold text-xs">In Progress</span>
                </div>
              </div>

              {/* Room Actions */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-300 font-semibold">
                  <span>Custom Match Lobby:</span>
                  <span className="font-extrabold text-white">ID: {room.roomId} | PASS: {room.roomPass}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => handleGenerateRoom(t.id)}
                    className="py-2 px-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-purple-300 rounded-lg font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Key className="w-3.5 h-3.5" />
                    <span>Generate Room</span>
                  </button>
                  <button
                    onClick={() => handlePublishRoom(t.id)}
                    disabled={room.published}
                    className="py-2 px-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold text-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    <Tv className="w-3.5 h-3.5" />
                    <span>{room.published ? 'Room Published' : 'Publish Room'}</span>
                  </button>
                </div>
              </div>

              {/* Quick Actions Footer */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                <button
                  onClick={() => setActiveTab('matches')}
                  className="flex-1 py-2.5 rounded-xl bg-purple-950 text-purple-300 border border-purple-800 font-bold text-xs hover:bg-purple-900 transition-colors min-h-[40px]"
                >
                  Match Control
                </button>
                <button
                  onClick={() => setActiveTab('leaderboards')}
                  className="flex-1 py-2.5 rounded-xl bg-slate-950 text-cyan-300 border border-slate-800 font-bold text-xs hover:bg-slate-800 transition-colors min-h-[40px]"
                >
                  Publish Results
                </button>
              </div>

            </div>
          )
        })}
      </div>

    </div>
  )
}
