import { useState } from 'react'
import { Zap, Tv, Key, CheckCircle2, Play, AlertTriangle, ArrowRight, Gamepad2, Shield } from 'lucide-react'
import AuthAlert from '../common/AuthAlert'
import LoadingButton from '../common/LoadingButton'
import { useToast } from '../../contexts/ToastContext'

export default function LiveOperationsView({ tournaments, setActiveTab }) {
  const { showSuccess } = useToast()
  const liveTournaments = tournaments.filter((t) => t.status === 'Live Now' || t.status === 'Registration Open')

  const [roomStates, setRoomStates] = useState({
    't-1': { roomId: '8492019', roomPass: '7741', published: true },
    't-2': { roomId: '5192041', roomPass: '9921', published: false },
  })

  const [alert, setAlert] = useState(null)
  const [loadingAction, setLoadingAction] = useState(null) // 'gen-id' | 'pub-id'

  const handleGenerateRoom = (tId) => {
    if (loadingAction) return
    setLoadingAction(`gen-${tId}`)
    setTimeout(() => {
      const newRoomId = Math.floor(1000000 + Math.random() * 9000000).toString()
      const newPass = Math.floor(1000 + Math.random() * 9000).toString()
      setRoomStates((prev) => ({
        ...prev,
        [tId]: { roomId: newRoomId, roomPass: newPass, published: false },
      }))
      setAlert({ type: 'success', message: `Generated new custom room credentials: ID ${newRoomId} / Pass ${newPass}` })
      showSuccess(`Generated Room ID ${newRoomId} / Pass ${newPass}`, 'Room Credentials Created')
      setLoadingAction(null)
    }, 300)
  }

  const handlePublishRoom = (tId) => {
    if (loadingAction || roomStates[tId]?.published) return
    setLoadingAction(`pub-${tId}`)
    setTimeout(() => {
      setRoomStates((prev) => ({
        ...prev,
        [tId]: { ...(prev[tId] || {}), published: true },
      }))
      setAlert({ type: 'success', message: `Custom Room credentials published live to registered teams!` })
      showSuccess(`Room credentials published live!`, 'Broadcast Active')
      setLoadingAction(null)
    }, 400)
  }

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#3a494b]/60 pb-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#fe6b00]/10 border border-[#fe6b00]/40 text-[#fe6b00] text-xs font-bold uppercase">
            <Zap className="w-3.5 h-3.5" />
            <span>LIVE TOURNAMENT OPERATIONS</span>
          </div>
          <h2 className="font-display-lg text-xl sm:text-2xl font-extrabold text-white uppercase tracking-tight">
            ACTIVE MATCH COMMAND CENTER
          </h2>
        </div>
      </div>

      {alert && <AuthAlert type={alert.type} message={alert.message} />}

      {/* Live Tournaments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {liveTournaments.map((t) => {
          const room = roomStates[t.id] || { roomId: 'Pending', roomPass: '----', published: false }
          const isGenLoading = loadingAction === `gen-${t.id}`
          const isPubLoading = loadingAction === `pub-${t.id}`

          return (
            <div key={`live-card-${t.id}`} className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-5 sm:p-6 space-y-5 shadow-xl">
              
              {/* Header Badge & Title */}
              <div className="flex items-center justify-between gap-2 border-b border-[#3a494b]/60 pb-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase bg-[#07090c] text-[#00f2ff] border border-[#00f2ff]/30">
                      {t.game}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase border ${
                      t.status === 'Live Now'
                        ? 'bg-[#fe6b00]/10 text-[#fe6b00] border-[#fe6b00]/40 animate-pulse'
                        : 'bg-[#00ff9d]/10 text-[#00ff9d] border-[#00ff9d]/40'
                    }`}>
                      {t.status}
                    </span>
                  </div>
                  <h3 className="font-display-lg font-extrabold text-white text-base sm:text-lg uppercase">{t.title}</h3>
                </div>
                
                <span className="font-mono text-[10px] font-bold text-[#8e9dae] bg-[#07090c] px-2.5 py-1 rounded border border-[#3a494b]/60">
                  Round 1 of 3
                </span>
              </div>

              {/* Tournament Details List */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-[#07090c] p-2.5 rounded border border-[#3a494b]/60">
                  <span className="font-label-caps text-[#8e9dae] text-[10px] font-bold block uppercase">Registered Players</span>
                  <span className="text-white font-extrabold text-xs">{t.registeredTeams * 4} Players ({t.registeredTeams} Squads)</span>
                </div>

                <div className="bg-[#07090c] p-2.5 rounded border border-[#3a494b]/60">
                  <span className="font-label-caps text-[#8e9dae] text-[10px] font-bold block uppercase">Start Time</span>
                  <span className="text-[#00f2ff] font-extrabold text-xs">{t.startDate} ({t.startTime || '06:00 PM IST'})</span>
                </div>

                <div className="bg-[#07090c] p-2.5 rounded border border-[#3a494b]/60">
                  <span className="font-label-caps text-[#8e9dae] text-[10px] font-bold block uppercase">Room Status</span>
                  <span className={`text-xs font-bold ${room.published ? 'text-[#00ff9d]' : 'text-[#ffb800]'}`}>
                    {room.published ? `Published (ID: ${room.roomId})` : room.roomId !== 'Pending' ? `Generated (Pass: ${room.roomPass})` : 'Pending Generation'}
                  </span>
                </div>

                <div className="bg-[#07090c] p-2.5 rounded border border-[#3a494b]/60">
                  <span className="font-label-caps text-[#8e9dae] text-[10px] font-bold block uppercase">Stream Broadcast</span>
                  <span className="text-white font-extrabold text-xs flex items-center gap-1">
                    <Tv className="w-3 h-3 text-[#fe6b00]" />
                    <span>MJ ESPORTS YT Live</span>
                  </span>
                </div>
              </div>

              {/* Room Credential Management */}
              <div className="p-4 bg-[#07090c] rounded border border-[#3a494b]/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-label-caps text-xs text-[#00f2ff] uppercase tracking-wider flex items-center gap-1.5">
                    <Key className="w-4 h-4 text-[#00f2ff]" />
                    <span>Custom Room Credentials</span>
                  </span>

                  <LoadingButton
                    onClick={() => handleGenerateRoom(t.id)}
                    loading={isGenLoading}
                    loadingText="Generating..."
                    variant="secondary"
                    size="sm"
                  >
                    Auto-Generate Room
                  </LoadingButton>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-[#8e9dae] uppercase font-bold block">Room ID</label>
                    <input
                      type="text"
                      value={room.roomId}
                      onChange={(e) => setRoomStates((prev) => ({
                        ...prev,
                        [t.id]: { ...(prev[t.id] || {}), roomId: e.target.value }
                      }))}
                      className="w-full px-3 py-2 bg-[#151a21] border border-[#3a494b] rounded font-mono text-xs text-[#00f2ff] font-bold focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-[#8e9dae] uppercase font-bold block">Room Password</label>
                    <input
                      type="text"
                      value={room.roomPass}
                      onChange={(e) => setRoomStates((prev) => ({
                        ...prev,
                        [t.id]: { ...(prev[t.id] || {}), roomPass: e.target.value }
                      }))}
                      className="w-full px-3 py-2 bg-[#151a21] border border-[#3a494b] rounded font-mono text-xs text-[#00f2ff] font-bold focus:outline-none"
                    />
                  </div>
                </div>

                <LoadingButton
                  onClick={() => handlePublishRoom(t.id)}
                  loading={isPubLoading}
                  disabled={room.published}
                  loadingText="Publishing Credentials..."
                  icon={CheckCircle2}
                  className="w-full py-2.5 min-h-[40px]"
                >
                  {room.published ? 'Credentials Live on Player Dashboard' : 'Publish Credentials to Registered Teams'}
                </LoadingButton>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => setActiveTab('matches')}
                  className="flex-1 py-2.5 rounded bg-[#07090c] hover:bg-[#1d232c] border border-[#3a494b] text-xs font-bold text-[#e1e2e7] hover:text-[#00f2ff] transition-colors flex items-center justify-center gap-1.5 uppercase min-h-[38px]"
                >
                  <Gamepad2 className="w-4 h-4 text-[#00f2ff]" />
                  <span>Match Control</span>
                </button>

                <button
                  onClick={() => setActiveTab('leaderboards')}
                  className="flex-1 py-2.5 rounded bg-[#07090c] hover:bg-[#1d232c] border border-[#3a494b] text-xs font-bold text-[#e1e2e7] hover:text-[#fe6b00] transition-colors flex items-center justify-center gap-1.5 uppercase min-h-[38px]"
                >
                  <span>Scores & Standings</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>
          )
        })}
      </div>

    </div>
  )
}
