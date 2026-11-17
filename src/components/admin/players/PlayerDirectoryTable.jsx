import { useState, useMemo } from 'react'
import {
  Users,
  Search,
  Filter,
  Gamepad2,
  CheckCircle2,
  AlertTriangle,
  Ban,
  Clock,
  Eye,
  Shield,
  Mail,
  User,
  ChevronRight,
  Sparkles
} from 'lucide-react'

export default function PlayerDirectoryTable({ users = [], onSelectPlayer, onUpdateVerificationStatus }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [gameFilter, setGameFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = searchQuery.toLowerCase()
      const matchesSearch =
        (u.username || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.gameUid || '').toLowerCase().includes(q) ||
        (u.gameIgn || u.username || '').toLowerCase().includes(q)

      const matchesGame =
        gameFilter === 'ALL' || (u.game || '').toUpperCase().replace(/\s+/g, '').includes(gameFilter)

      const matchesStatus =
        statusFilter === 'ALL' || (u.verificationStatus || '').toUpperCase() === statusFilter

      return matchesSearch && matchesGame && matchesStatus
    })
  }, [users, searchQuery, gameFilter, statusFilter])

  return (
    <div className="space-y-4 font-mono">

      {/* Search & Filter Controls */}
      <div className="bg-[#111215] border border-[#27272A]/60 rounded-none p-4 shadow-xl flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-[#A1A1AA] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Username, Email, Game UID..."
            className="w-full bg-[#000000] border border-[#27272A] rounded-none pl-9 pr-3 py-2 text-xs text-white placeholder-[#A1A1AA] focus:border-[#FFB900] focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
          <div className="flex items-center gap-1 bg-[#000000] border border-[#27272A] rounded-none px-3 py-1.5 text-xs text-white">
            <Gamepad2 className="w-3.5 h-3.5 text-[#FFB900]" />
            <select
              value={gameFilter}
              onChange={(e) => setGameFilter(e.target.value)}
              className="bg-transparent text-xs text-white focus:outline-none"
            >
              <option value="ALL" className="bg-[#111215]">All Games</option>
              <option value="FREEFIRE" className="bg-[#111215]">Free Fire India</option>
              <option value="BGMI" className="bg-[#111215]">BGMI Mobile</option>
            </select>
          </div>

          <div className="flex items-center gap-1 bg-[#000000] border border-[#27272A] rounded-none px-3 py-1.5 text-xs text-white">
            <Filter className="w-3.5 h-3.5 text-[#FFB900]" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-xs text-white focus:outline-none"
            >
              <option value="ALL" className="bg-[#111215]">All Statuses</option>
              <option value="VERIFIED" className="bg-[#111215]">VERIFIED</option>
              <option value="PENDING" className="bg-[#111215]">PENDING</option>
              <option value="UNVERIFIED" className="bg-[#111215]">UNVERIFIED</option>
              <option value="REJECTED" className="bg-[#111215]">REJECTED</option>
              <option value="SUSPENDED" className="bg-[#111215]">SUSPENDED</option>
            </select>
          </div>
        </div>
      </div>

      {/* Directory Table */}
      <div className="bg-[#111215] border border-[#27272A]/60 rounded-none overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#000000] border-b border-[#27272A]/60 text-[#A1A1AA] uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-3">MJ ACCOUNT</th>
                <th className="p-3">GAME IDENTITY</th>
                <th className="p-3">GAME UID</th>
                <th className="p-3">STATUS</th>
                <th className="p-3">MATCHES</th>
                <th className="p-3 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#27272A]/40">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-[#A1A1AA]">
                    No player accounts found matching filter parameters.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const status = (u.verificationStatus || 'Pending').toUpperCase()
                  const statusColor =
                    status === 'VERIFIED'
                      ? 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30'
                      : status === 'PENDING'
                        ? 'bg-[#FF8C00]/10 text-[#FF8C00] border-[#FF8C00]/30'
                        : status === 'SUSPENDED' || status === 'REJECTED'
                          ? 'bg-red-950 text-red-400 border-red-500/40'
                          : 'bg-slate-800 text-slate-400 border-slate-700'

                  return (
                    <tr key={u.id} className="hover:bg-[#000000]/50 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-none bg-[#000000] border border-[#27272A] flex items-center justify-center text-[#FFB900] font-bold">
                            {(u.username || 'P')[0].toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-white block leading-tight">{u.username}</span>
                            <span className="text-[10px] text-[#A1A1AA] block">{u.email}</span>
                          </div>
                        </div>
                      </td>

                      <td className="p-3">
                        <span className="text-white font-bold block">{u.gameIgn || u.username}</span>
                        <span className="text-[10px] text-[#FFB900] block">{u.game || 'Free Fire India'}</span>
                      </td>

                      <td className="p-3 font-mono font-bold text-[#10B981]">
                        {u.gameUid || 'N/A'}
                      </td>

                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-none text-[9px] font-bold border ${statusColor}`}>
                          {status}
                        </span>
                      </td>

                      <td className="p-3 text-[#A1A1AA]">
                        {u.matchesPlayed || 0} Played
                      </td>

                      <td className="p-3 text-right">
                        <button
                          onClick={() => onSelectPlayer(u)}
                          className="px-2.5 py-1 bg-[#000000] hover:bg-[#FFB900] text-[#FFB900] hover:text-black border border-[#FFB900]/30 rounded-none text-[10px] font-bold uppercase transition-all"
                        >
                          INSPECT
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
