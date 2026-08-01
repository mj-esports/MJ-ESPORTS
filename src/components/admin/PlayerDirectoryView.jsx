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
import { useToast } from '../../contexts/ToastContext'
import { TableSkeleton } from '../common/SkeletonLoader'

export default function PlayerDirectoryView() {
  const { showSuccess, showError } = useToast()
  const [search, setSearch] = useState('')
  const [alert, setAlert] = useState(null)
  const [selectedUser, setSelectedUser] = useState(null)
  const [users, setUsers] = useState([])
  const [allRegistrations, setAllRegistrations] = useState([])
  const [loading, setLoading] = useState(true)
  const [updatingUserId, setUpdatingUserId] = useState(null)

  const fetchUsersAndHistory = async () => {
    setLoading(true)
    try {
      if (isSupabaseConfigured) {
        // Fetch User Roles & Registrations concurrently via Promise.all
        const [{ data: dbRoles }, { data: dbRegs }] = await Promise.all([
          supabase.from('user_roles').select('*'),
          supabase.from('tournament_registrations').select('*').order('registered_at', { ascending: false }),
        ])

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
          fallbackDefaultUsers()
        }
      } else {
        fallbackDefaultUsers()
      }
    } catch (err) {
      console.error('[Fetch Players Error]:', err)
      fallbackDefaultUsers()
    } finally {
      setLoading(false)
    }
  }

  const fallbackDefaultUsers = () => {
    const defaultUsers = [
      {
        id: 'u-1',
        userId: 'uid-1',
        name: 'CyberKnight99',
        email: 'user@example.com',
        uid: '518920412',
        role: 'user',
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
        name: 'Apex_Pro',
        email: 'apex@example.com',
        uid: '519284012',
        role: 'user',
        status: 'Active',
        createdAt: '2026-02-14',
        registrationHistory: [
          { id: 'reg-103', tournament_title: 'Free Fire India Championship', team_name: 'Apex Squad', format: 'Duo', status: 'Approved', registered_at: '2026-07-22' }
        ]
      },
      {
        id: 'u-3',
        userId: 'uid-3',
        name: 'ToxicGamer_X',
        email: 'toxic@example.com',
        uid: '992104912',
        role: 'user',
        status: 'Banned',
        createdAt: '2026-03-01',
        registrationHistory: []
      }
    ]
    setUsers(defaultUsers)
  }

  useEffect(() => {
    fetchUsersAndHistory()
  }, [])

  const handleToggleStatus = async (targetId, currentStatus) => {
    if (updatingUserId) return
    setUpdatingUserId(targetId)
    const nextStatus = currentStatus === 'Banned' ? 'Active' : 'Banned'
    try {
      if (isSupabaseConfigured) {
        await supabase
          .from('user_roles')
          .update({ status: nextStatus })
          .eq('user_id', targetId)
      }

      setUsers((prev) =>
        prev.map((u) => (u.id === targetId || u.userId === targetId ? { ...u, status: nextStatus } : u))
      )
      setAlert({ type: 'success', message: `Player status updated to "${nextStatus}".` })
      showSuccess(`Player status updated to "${nextStatus}".`, 'Account Updated')
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Failed to update user status.' })
      showError(err, 'Status Change Failed')
    } finally {
      setUpdatingUserId(null)
    }
  }

  const handleToggleRole = async (targetId, currentRole) => {
    if (updatingUserId) return
    setUpdatingUserId(targetId)
    const nextRole = currentRole === 'admin' ? 'user' : 'admin'
    try {
      if (isSupabaseConfigured) {
        await supabase
          .from('user_roles')
          .update({ role: nextRole })
          .eq('user_id', targetId)
      }

      setUsers((prev) =>
        prev.map((u) => (u.id === targetId || u.userId === targetId ? { ...u, role: nextRole } : u))
      )
      setAlert({ type: 'success', message: `User role updated to "${nextRole.toUpperCase()}".` })
      showSuccess(`User role updated to "${nextRole.toUpperCase()}".`, 'Role Updated')
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Failed to update user role.' })
      showError(err, 'Role Change Failed')
    } finally {
      setUpdatingUserId(null)
    }
  }

  const filteredUsers = users.filter((u) => {
    return (
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.uid?.toLowerCase().includes(search.toLowerCase())
    )
  })

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#3a494b]/60 pb-4">
        <div className="space-y-1">
          <h2 className="font-display-lg text-xl sm:text-2xl font-extrabold text-white uppercase tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-[#00f2ff]" />
            <span>PLAYER & USER DIRECTORY</span>
          </h2>
          <p className="text-xs text-[#8e9dae]">
            Manage competitive player profiles, verify in-game UIDs, inspect tournament participation, and toggle account access.
          </p>
        </div>

        <button
          onClick={fetchUsersAndHistory}
          className="px-3.5 py-2.5 bg-[#07090c] hover:bg-[#1d232c] border border-[#3a494b] rounded text-xs font-bold text-[#e1e2e7] hover:text-[#00f2ff] transition-all flex items-center gap-1.5 uppercase min-h-[44px]"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-[#00f2ff] ${loading ? 'animate-spin' : ''}`} />
          <span>Sync Directory</span>
        </button>
      </div>

      {alert && <AuthAlert type={alert.type} message={alert.message} />}

      {/* SEARCH BAR */}
      <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-4 shadow-xl">
        <div className="relative">
          <Search className="w-4 h-4 text-[#8e9dae] absolute left-3 top-3.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search handle, email, or Free Fire character UID..."
            className="w-full pl-9 pr-3 py-2.5 bg-[#07090c] border border-[#3a494b] rounded text-xs text-white placeholder-[#8e9dae] focus:outline-none focus:border-[#00f2ff]"
          />
        </div>
      </div>

      {/* PLAYERS DIRECTORY TABLE (DESKTOP) */}
      <div className="hidden lg:block bg-[#151a21] border border-[#3a494b]/60 rounded-xl overflow-hidden shadow-xl">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-[#07090c] border-b border-[#3a494b]/60 font-label-caps text-[#8e9dae]">
              <th className="p-3.5 pl-4">Player Handle</th>
              <th className="p-3.5">Email</th>
              <th className="p-3.5">Game Character UID</th>
              <th className="p-3.5 text-center">Role</th>
              <th className="p-3.5 text-center">Status</th>
              <th className="p-3.5 text-right pr-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#3a494b]/40">
            {loading ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-[#8e9dae]">
                  <div className="w-6 h-6 border-2 border-[#00f2ff] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <span>Loading directory...</span>
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-[#8e9dae]">
                  No player profiles match your search criteria.
                </td>
              </tr>
            ) : (
              filteredUsers.map((u) => (
                <tr key={`u-row-${u.id}`} className="hover:bg-[#1d232c] transition-colors">
                  <td className="p-3.5 pl-4 font-extrabold text-white">{u.name}</td>
                  <td className="p-3.5 text-[#8e9dae] font-mono">{u.email}</td>
                  <td className="p-3.5 font-mono text-[#00f2ff] font-bold">{u.uid}</td>
                  <td className="p-3.5 text-center">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase border ${
                      u.role === 'admin' ? 'bg-[#fe6b00]/10 text-[#fe6b00] border-[#fe6b00]/40' : 'bg-[#07090c] text-[#8e9dae] border-[#3a494b]'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="p-3.5 text-center">
                    <span className={`px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase border ${
                      u.status === 'Banned' ? 'bg-red-950 text-[#ff3366] border-red-800' : 'bg-[#00ff9d]/10 text-[#00ff9d] border-[#00ff9d]/40'
                    }`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="p-3.5 text-right pr-4">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setSelectedUser(u)}
                        className="p-1.5 rounded bg-[#07090c] hover:bg-[#1d232c] text-[#00f2ff] border border-[#3a494b]"
                        title="View History"
                      >
                        <History className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleToggleRole(u.userId || u.id, u.role)}
                        disabled={updatingUserId === (u.userId || u.id)}
                        className="p-1.5 rounded bg-[#07090c] hover:bg-[#1d232c] text-[#fe6b00] border border-[#3a494b] disabled:opacity-40"
                        title="Toggle Admin Privilege"
                      >
                        {updatingUserId === (u.userId || u.id) ? (
                          <div className="w-3.5 h-3.5 border-2 border-[#fe6b00] border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <ShieldCheck className="w-3.5 h-3.5" />
                        )}
                      </button>

                      <button
                        onClick={() => handleToggleStatus(u.userId || u.id, u.status)}
                        disabled={updatingUserId === (u.userId || u.id)}
                        className={`p-1.5 rounded border disabled:opacity-40 ${
                          u.status === 'Banned'
                            ? 'bg-[#00ff9d]/10 hover:bg-[#00ff9d]/20 text-[#00ff9d] border-[#00ff9d]/40'
                            : 'bg-red-950/50 hover:bg-red-900/60 text-[#ff3366] border-red-800'
                        }`}
                        title={u.status === 'Banned' ? 'Unban Player' : 'Ban Player'}
                      >
                        {updatingUserId === (u.userId || u.id) ? (
                          <div className="w-3.5 h-3.5 border-2 border-[#ff3366] border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <Ban className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* USER PARTICIPATION HISTORY MODAL DIALOG */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#151a21] border border-[#3a494b] rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setSelectedUser(null)}
              className="absolute top-5 right-5 p-2 rounded bg-[#07090c] border border-[#3a494b] text-[#8e9dae] hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-1">
              <span className="font-mono text-xs text-[#00f2ff] block">UID: {selectedUser.uid}</span>
              <h3 className="font-display-lg text-lg font-bold text-white uppercase">{selectedUser.name}</h3>
              <p className="text-xs text-[#8e9dae]">{selectedUser.email}</p>
            </div>

            <div className="space-y-3 pt-2">
              <h4 className="font-display-lg text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <History className="w-4 h-4 text-[#00f2ff]" />
                <span>Tournament Participation History ({selectedUser.registrationHistory?.length || 0})</span>
              </h4>

              <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                {selectedUser.registrationHistory && selectedUser.registrationHistory.length > 0 ? (
                  selectedUser.registrationHistory.map((h, idx) => (
                    <div key={`hist-${idx}`} className="p-3 bg-[#07090c] rounded border border-[#3a494b]/60 text-xs space-y-1">
                      <div className="flex justify-between font-bold text-white">
                        <span>{h.tournament_title || h.tournamentTitle}</span>
                        <span className="text-[#00ff9d]">{h.status}</span>
                      </div>
                      <div className="flex justify-between text-[11px] text-[#8e9dae]">
                        <span>Team: <strong className="text-[#e1e2e7]">{h.team_name || h.teamName}</strong> ({h.format || 'Squad'})</span>
                        <span className="font-mono">{h.registered_at || h.registeredAt}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center bg-[#07090c] rounded border border-[#3a494b]/60 text-xs text-[#8e9dae]">
                    No recorded tournament entries for this account.
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => setSelectedUser(null)}
              className="btn-cyber-primary w-full justify-center py-2.5 min-h-[40px]"
            >
              Close History
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
