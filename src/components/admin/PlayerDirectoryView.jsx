import { useState } from 'react'
import { Users, Search, ShieldAlert, Ban, CheckCircle2, User, Gamepad2, Award } from 'lucide-react'
import AuthAlert from '../common/AuthAlert'

export default function PlayerDirectoryView() {
  const [search, setSearch] = useState('')
  const [alert, setAlert] = useState(null)

  const [players, setPlayers] = useState([
    { id: 1, name: 'Phoenix_99', email: 'phoenix@example.com', uid: '518920412', status: 'Active', warnings: 0, tourneysPlayed: 14, wins: 4 },
    { id: 2, name: 'TotalGaming_Fan', email: 'tgfan@example.com', uid: '519284012', status: 'Active', warnings: 1, tourneysPlayed: 8, wins: 2 },
    { id: 3, name: 'ShadowHacker_X', email: 'shadow@example.com', uid: '992810412', status: 'Suspended', warnings: 3, tourneysPlayed: 3, wins: 0 },
  ])

  const handleAction = (pId, newStatus) => {
    setPlayers((prev) => prev.map((p) => (p.id === pId ? { ...p, status: newStatus } : p)))
    setAlert({ type: 'success', message: `Player status updated to ${newStatus}.` })
  }

  const filtered = players.filter(
    (p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.uid.includes(search)
  )

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-extrabold text-white uppercase tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-400" />
            <span>PLAYER DIRECTORY & BAN CONTROL</span>
          </h2>
          <p className="text-xs text-slate-400">
            Audit player profiles, check game UIDs, monitor warnings, and issue suspensions or bans.
          </p>
        </div>

        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search handle or UID..."
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none"
          />
        </div>
      </div>

      {alert && <AuthAlert type={alert.type} message={alert.message} />}

      {/* Players Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {filtered.map((p) => (
          <div key={`p-card-${p.id}`} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-purple-400 font-bold text-sm">
                  {p.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-sm">{p.name}</h3>
                  <p className="text-[10px] text-slate-400">UID: {p.uid}</p>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${
                p.status === 'Active' ? 'bg-emerald-950 text-emerald-400 border-emerald-800' : 'bg-red-950 text-red-400 border-red-800'
              }`}>
                {p.status}
              </span>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <span className="text-slate-500 text-[9px] font-bold block uppercase">Played</span>
                <span className="font-bold text-white">{p.tourneysPlayed}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[9px] font-bold block uppercase">Wins</span>
                <span className="font-bold text-cyan-400">{p.wins}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[9px] font-bold block uppercase">Warnings</span>
                <span className="font-bold text-amber-400">{p.warnings}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-800 text-xs">
              <button
                onClick={() => handleAction(p.id, p.status === 'Active' ? 'Suspended' : 'Active')}
                className="flex-1 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold min-h-[38px]"
              >
                {p.status === 'Active' ? 'Suspend' : 'Unsuspend'}
              </button>
              <button
                onClick={() => handleAction(p.id, 'Banned')}
                className="py-2 px-3 bg-red-950 hover:bg-red-900 border border-red-800 text-red-400 rounded-xl font-bold min-h-[38px]"
              >
                Ban Account
              </button>
            </div>
          </div>
        ))}
      </div>

    </div>
  )
}
