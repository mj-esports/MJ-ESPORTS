import React, { useState } from 'react'
import { Users, Search, Shield, CheckCircle2, XCircle, MoreVertical, Wallet } from 'lucide-react'

const mockUsers = [
  {
    id: 'usr_001',
    name: 'Manjunath (Admin)',
    email: 'manjunath@mjesports.gg',
    role: 'Super Admin',
    walletBalance: '₹12,450',
    status: 'Active',
    joinedDate: '2026-01-10'
  },
  {
    id: 'usr_002',
    name: 'AlphaSniper_99',
    email: 'alpha@gmail.com',
    role: 'Captain',
    walletBalance: '₹450',
    status: 'Active',
    joinedDate: '2026-02-14'
  },
  {
    id: 'usr_003',
    name: 'GhostRider_FF',
    email: 'ghost@gmail.com',
    role: 'Player',
    walletBalance: '₹0',
    status: 'Suspended',
    joinedDate: '2026-03-01'
  }
]

export default function UsersMenu() {
  const [searchTerm, setSearchTerm] = useState('')

  const filtered = mockUsers.filter(
    (u) =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-wide flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-400" />
            User Management V2
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Manage player profiles, assign roles, inspect wallet balances, and monitor access statuses.
          </p>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by player name or email..."
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50"
          />
        </div>
      </div>

      <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800/80 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-6 py-3.5">User</th>
                <th className="px-4 py-3.5">Role</th>
                <th className="px-4 py-3.5">Wallet Balance</th>
                <th className="px-4 py-3.5">Joined Date</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filtered.map((u) => (
                <tr key={u.id} className="hover:bg-slate-950/40 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-white text-sm">{u.name}</div>
                    <div className="text-[11px] text-slate-400 font-mono">{u.email}</div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-4 font-mono font-bold text-emerald-400">{u.walletBalance}</td>
                  <td className="px-4 py-4 font-mono text-slate-400">{u.joinedDate}</td>
                  <td className="px-4 py-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                        u.status === 'Active'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}
                    >
                      {u.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
