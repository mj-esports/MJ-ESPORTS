import { useState, useEffect } from 'react'
import {
  Users,
  Search,
  ShieldAlert,
  Ban,
  CheckCircle2,
  User,
  Gamepad2,
  Award,
  X,
  Mail,
  History,
  ShieldCheck,
  RefreshCw,
  Clock,
  ClipboardList
} from 'lucide-react'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import AuthAlert from '../common/AuthAlert'

export default function PlayerDirectoryView() {
  const [search, setSearch] = useState('')
  const [alert, setAlert] = useState(null)
  const [selectedUser, setSelectedUser] = useState(null)
  const [users, setUsers] = useState([])
  const [allRegistrations, setAllRegistrations] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchUsersAndHistory = async () => {
    setLoading(true)
    try {
      if (isSupabaseConfigured) {
        // Fetch User Roles / Profiles from Supabase
        const { data: dbRoles, error: rolesErr } = await supabase
          .from('user_roles')
          .select('*')

        // Fetch Registrations from Supabase
        const { data: dbRegs, error: regsErr } = await supabase
          .from('tournament_registrations')
          .select('*')
          .order('registered_at', { ascending: false })

        const loadedRegs = dbRegs || []
        setAllRegistrations(loadedRegs)

        if (dbRoles && dbRoles.length > 0) {
          const mappedUsers = dbRoles.map((r) => {
            const userRegs = loadedRegs.filter((reg) => reg.email === r.email || reg.user_id === r.user_id)
            return {
              id: r.id || r.user_id,
              userId: r.user_id,
              email: r.email || 'user@example.com',
              name: r.username || r.email?.split('@')[0] || 'Player Account',
              role: r.role || 'user',
              status: r.status || 'Active',
              uid: r.free_fire_uid || '518920412',
              createdAt: r.created_at ? new Date(r.created_at).toLocaleDateString() : 'Recent',
              registrationHistory: userRegs,
            }
          })
          setUsers(mappedUsers)
        } else {
          fallbackMockUsers(loadedRegs)
        }
      } else {
        fallbackMockUsers([])
      }
    } catch (err) {
      console.error('[User Management Error]:', err)
      fallbackMockUsers([])
    } finally {
      setLoading(false)
    }
  }

  const fallbackMockUsers = (regs = []) => {
    const defaultUsers = [
      {
        id: 'u-1',
        userId: 'uid-1',
        name: 'Phoenix_99',
        email: 'mjesports.team@gmail.com',
        uid: '518920412',
        role: 'admin',
        status: 'Active',
        createdAt: '2026-01-10',
        registrationHistory: [
          { id: 'reg-101', tournament_title: 'Free Fire Grand Championship', team_name: 'Alpha Phoenix', format: 'Squad', status: 'Approved', registered_at: '2026-07-20' },
          { id: 'reg-102', tournament_title: 'BGMI Champions Cup', team_name: 'Phoenix Solo', format: 'Solo', status: 'Approved', registered_at: '2026-07-15' },
        ]
      },
      {
        id: 'u-2',
        userId: 'uid-2',
        name: 'TotalGaming_Fan',
        email: 'tgfan@example.com',
        uid: '519284012',
        role: 'user',
        status: 'Active',
        createdAt: '2026-03-12',
        registrationHistory: [
          { id: 'reg-201', tournament_title: 'Free Fire Duo Clash', team_name: 'TG Duo Warriors', format: 'Duo', status: 'Approved', registered_at: '2026-07-18' }
        ]
      },
      {
        id: 'u-3',
        userId: 'uid-3',
        name: 'ShadowHacker_X',
        email: 'shadow@example.com',
        uid: '992810412',
        role: 'user',
        status: 'Banned',
        createdAt: '2026-05-01',
        registrationHistory: [
          { id: 'reg-301', tournament_title: 'Free Fire India Cup', team_name: 'Shadow Cheaters', format: 'Squad', status: 'Rejected', registered_at: '2026-07-10' }
        ]
      }
    ]
    setUsers(defaultUsers)
  }

  useEffect(() => {
    fetchUsersAndHistory()
  }, [])

  // Filter users by search
  const filteredUsers = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      String(u.uid).includes(search) ||
      String(u.id).toLowerCase().includes(search.toLowerCase())
  )

  // Ban User
  const handleBanUser = async (u) => {
    try {
      if (isSupabaseConfigured) {
        await supabase
          .from('user_roles')
          .update({ status: 'Banned' })
          .eq('email', u.email)
      }
      setUsers((prev) => prev.map((usr) => (usr.id === u.id ? { ...usr, status: 'Banned' } : usr)))
      if (selectedUser?.id === u.id) {
        setSelectedUser((prev) => ({ ...prev, status: 'Banned' }))
      }
      setAlert({ type: 'success', message: `User account "${u.name}" (${u.email}) has been BANNED.` })
    } catch (err) {
      setAlert({ type: 'error', message: 'Failed to ban user account.' })
    }
  }

  // Unban User
  const handleUnbanUser = async (u) => {
    try {
      if (isSupabaseConfigured) {
        await supabase
          .from('user_roles')
          .update({ status: 'Active' })
          .eq('email', u.email)
      }
      setUsers((prev) => prev.map((usr) => (usr.id === u.id ? { ...usr, status: 'Active' } : usr)))
      if (selectedUser?.id === u.id) {
        setSelectedUser((prev) => ({ ...prev, status: 'Active' }))
      }
      setAlert({ type: 'success', message: `User account "${u.name}" (${u.email}) has been UNBANNED (Activated).` })
    } catch (err) {
      setAlert({ type: 'error', message: 'Failed to activate user account.' })
    }
  }

  return (
    <div className="space-y-6">
      
      {/* Header Controls & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-extrabold text-white uppercase tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-400" />
            <span>USER MANAGEMENT & AUDIT CONTROL</span>
          </h2>
          <p className="text-xs text-slate-400">
            Search registered users, inspect registration history, monitor roles, and execute account bans/unbans.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchUsersAndHistory}
            disabled={loading}
            className="px-3.5 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-cyan-400 rounded-xl text-xs font-bold transition-all flex items-center gap-2 min-h-[44px]"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <div className="relative max-w-xs w-full">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search username, email, or UID..."
              className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>
      </div>

      {alert && <AuthAlert type={alert.type} message={alert.message} />}

      {/* USER CARDS GRID */}
      {loading ? (
        <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-3xl space-y-3 shadow-xl">
          <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <span className="text-xs text-slate-400 font-bold block">Loading user directory...</span>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-3xl space-y-3 shadow-xl text-slate-500 text-xs">
          <Users className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-white uppercase">No Users Found</h3>
          <p className="text-xs text-slate-400">No user accounts match your search parameters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUsers.map((u) => (
            <div
              key={`usr-card-${u.id}`}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl flex flex-col justify-between hover:border-slate-700 transition-all"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-emerald-400 font-extrabold text-sm shadow-inner">
                      {u.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-white text-sm">{u.name}</h3>
                      <p className="text-[11px] text-slate-400 truncate max-w-[150px]">{u.email}</p>
                    </div>
                  </div>

                  <span className={`px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase border ${
                    u.status === 'Banned'
                      ? 'bg-red-950 text-red-400 border-red-800'
                      : 'bg-emerald-950 text-emerald-400 border-emerald-800'
                  }`}>
                    {u.status}
                  </span>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1 text-xs">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-400">Game UID:</span>
                    <span className="font-mono font-bold text-cyan-400">{u.uid}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-400">Role:</span>
                    <span className="font-bold text-purple-300 uppercase">{u.role}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-400">Registrations:</span>
                    <span className="font-bold text-amber-400">{u.registrationHistory?.length || 0} Entries</span>
                  </div>
                </div>
              </div>

              {/* ACTION BUTTONS: Ban, Unban, Profile & History */}
              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-800 text-xs">
                {u.status === 'Banned' ? (
                  <button
                    onClick={() => handleUnbanUser(u)}
                    className="py-2.5 bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 rounded-xl font-bold flex items-center justify-center gap-1.5 min-h-[38px]"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Unban User</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleBanUser(u)}
                    className="py-2.5 bg-slate-950 hover:bg-red-950 border border-slate-800 hover:border-red-800 text-red-400 rounded-xl font-bold flex items-center justify-center gap-1.5 min-h-[38px]"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>Ban User</span>
                  </button>
                )}

                <button
                  onClick={() => setSelectedUser(u)}
                  className="py-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-cyan-300 rounded-xl font-bold flex items-center justify-center gap-1.5 min-h-[38px]"
                >
                  <History className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Profile & History</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* USER PROFILE & REGISTRATION HISTORY MODAL DIALOG */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            
            <button
              onClick={() => setSelectedUser(null)}
              className="absolute top-5 right-5 p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-emerald-400 font-extrabold text-xl shadow-inner">
                {selectedUser.name?.charAt(0).toUpperCase()}
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-extrabold text-white">{selectedUser.name}</h3>
                  <span className={`px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase border ${
                    selectedUser.status === 'Banned'
                      ? 'bg-red-950 text-red-400 border-red-800'
                      : 'bg-emerald-950 text-emerald-400 border-emerald-800'
                  }`}>
                    {selectedUser.status}
                  </span>
                </div>
                <p className="text-xs text-slate-400">{selectedUser.email}</p>
              </div>
            </div>

            {/* Account Information Card */}
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2 text-xs">
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Account Metadata</h4>
              <div className="grid grid-cols-2 gap-3 text-slate-300">
                <p><span className="text-slate-500">Game UID:</span> <strong className="font-mono text-cyan-400">{selectedUser.uid}</strong></p>
                <p><span className="text-slate-500">System Role:</span> <strong className="text-purple-300 uppercase">{selectedUser.role}</strong></p>
                <p><span className="text-slate-500">Created Date:</span> <strong className="text-slate-200">{selectedUser.createdAt}</strong></p>
                <p><span className="text-slate-500">Status:</span> <strong className="text-slate-200">{selectedUser.status}</strong></p>
              </div>
            </div>

            {/* Registration History Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-amber-400" />
                  <span>Tournament Registration History ({selectedUser.registrationHistory?.length || 0})</span>
                </h4>
              </div>

              {!selectedUser.registrationHistory || selectedUser.registrationHistory.length === 0 ? (
                <div className="p-6 text-center bg-slate-950 border border-slate-800 rounded-2xl text-slate-500 text-xs">
                  No tournament registrations recorded for this account.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                  {selectedUser.registrationHistory.map((reg, idx) => (
                    <div
                      key={`user-hist-${reg.id || idx}`}
                      className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs flex items-center justify-between gap-3"
                    >
                      <div className="space-y-0.5 overflow-hidden">
                        <span className="font-extrabold text-white block truncate">{reg.tournament_title || reg.tournamentTitle || 'Tournament Showdown'}</span>
                        <p className="text-[11px] text-slate-400">
                          Team: <strong className="text-slate-200">{reg.team_name || reg.teamName}</strong> &bull; Format: <span className="text-purple-300">{reg.format || 'Squad'}</span>
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase border block ${
                          reg.status === 'Approved'
                            ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                            : 'bg-yellow-950 text-yellow-400 border-yellow-800'
                        }`}>
                          {reg.status}
                        </span>
                        <span className="text-[9px] text-slate-500 block mt-1">{reg.registered_at ? new Date(reg.registered_at).toLocaleDateString() : 'Recent'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex gap-3 pt-2">
              {selectedUser.status === 'Banned' ? (
                <button
                  onClick={() => handleUnbanUser(selectedUser)}
                  className="flex-1 py-3 bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 font-bold text-xs rounded-xl min-h-[44px]"
                >
                  Unban Account
                </button>
              ) : (
                <button
                  onClick={() => handleBanUser(selectedUser)}
                  className="flex-1 py-3 bg-red-950 hover:bg-red-900 border border-red-800 text-red-400 font-bold text-xs rounded-xl min-h-[44px]"
                >
                  Ban Account
                </button>
              )}

              <button
                onClick={() => setSelectedUser(null)}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl min-h-[44px]"
              >
                Close Window
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}
