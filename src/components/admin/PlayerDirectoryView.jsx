import { useState, useEffect, useMemo } from 'react'
import {
  Users,
  Search,
  ShieldCheck,
  ShieldAlert,
  Ban,
  CheckCircle2,
  User,
  Gamepad2,
  Award,
  X,
  Mail,
  History,
  RefreshCw,
  Clock,
  Filter,
  Eye,
  Trophy,
  Check,
  Sparkles,
  AlertTriangle
} from 'lucide-react'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import AuthAlert from '../common/AuthAlert'
import { useToast } from '../../contexts/ToastContext'

export default function PlayerDirectoryView() {
  const { showSuccess, showError } = useToast()
  const [search, setSearch] = useState('')
  const [gameFilter, setGameFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
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
        // Fetch User Roles, Profiles & Registrations concurrently via Promise.all
        const [{ data: dbRoles }, { data: dbProfiles }, { data: dbRegs }] = await Promise.all([
          supabase.from('user_roles').select('*'),
          supabase.from('profiles').select('*'),
          supabase.from('tournament_registrations').select('*').order('created_at', { ascending: false }),
        ])

        const loadedRegs = dbRegs || []
        const profilesMap = {}
        if (dbProfiles) {
          dbProfiles.forEach((p) => {
            profilesMap[p.id] = p
          })
        }
        setAllRegistrations(loadedRegs)

        if (dbRoles && dbRoles.length > 0) {
          const mappedUsers = dbRoles.map((r) => {
            const profile = profilesMap[r.user_id] || {}
            const userRegs = loadedRegs.filter((reg) => reg.email === r.email || reg.user_id === r.user_id)
            const gameUid = profile.game_uid || r.free_fire_uid || (userRegs[0]?.free_fire_uid) || 'N/A'
            const verificationStatus = profile.verification_status || r.status || (userRegs.length > 0 ? 'Verified' : 'Pending')

            return {
              id: r.id || r.user_id,
              userId: r.user_id,
              email: r.email || 'user@example.com',
              username: r.username || profile.username || r.email?.split('@')[0] || 'Esports Player',
              role: r.role || 'user',
              verificationStatus: verificationStatus,
              game: profile.game || userRegs[0]?.game || 'Free Fire',
              gameUid: gameUid,
              matchesPlayed: profile.matches_played || userRegs.length,
              wins: profile.wins || userRegs.filter((reg) => reg.status === 'Completed' || reg.status === 'Approved').length,
              kills: profile.statistics?.kills || userRegs.length * 4,
              earnings: profile.earnings || '₹0',
              createdAt: r.created_at ? new Date(r.created_at).toLocaleDateString() : 'Recent',
              registrationHistory: userRegs,
              sourceType: 'Registered Account',
            }
          })

          // Deduplicate and merge unlinked / guest tournament participants into master directory
          const existingUserKeys = new Set()
          mappedUsers.forEach((u) => {
            if (u.userId) existingUserKeys.add(String(u.userId))
            if (u.email) existingUserKeys.add(u.email.toLowerCase())
            if (u.gameUid && u.gameUid !== 'N/A') existingUserKeys.add(u.gameUid.toUpperCase())
          })

          const unlinkedPlayers = []
          loadedRegs.forEach((reg) => {
            const regEmail = (reg.email || '').toLowerCase()
            const regUid = (reg.free_fire_uid || reg.captain_uid || '').toUpperCase()
            const regUserId = reg.user_id ? String(reg.user_id) : null

            const isAlreadyIncluded =
              (regUserId && existingUserKeys.has(regUserId)) ||
              (regEmail && existingUserKeys.has(regEmail)) ||
              (regUid && existingUserKeys.has(regUid))

            if (!isAlreadyIncluded) {
              if (regUserId) existingUserKeys.add(regUserId)
              if (regEmail) existingUserKeys.add(regEmail)
              if (regUid) existingUserKeys.add(regUid)

              unlinkedPlayers.push({
                id: reg.id || `reg_${reg.created_at}`,
                userId: reg.user_id || null,
                email: reg.email || 'guest@mjesports.gg',
                username: reg.captain_name || reg.team_name || (reg.email ? reg.email.split('@')[0] : 'Guest Player'),
                role: 'user',
                verificationStatus: 'Verified',
                game: reg.game || 'Free Fire MAX',
                gameUid: reg.free_fire_uid || 'N/A',
                matchesPlayed: 1,
                wins: reg.status === 'Approved' || reg.status === 'Completed' ? 1 : 0,
                kills: 4,
                earnings: '₹0',
                createdAt: reg.created_at ? new Date(reg.created_at).toLocaleDateString() : 'Recent',
                registrationHistory: [reg],
                sourceType: reg.user_id ? 'Registered Account' : 'Tournament Participant',
              })
            }
          })

          setUsers([...mappedUsers, ...unlinkedPlayers])
        } else {
          setUsers([])
        }
      } else {
        setUsers([])
      }
    } catch (err) {
      console.error('[Fetch Players Error]:', err)
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsersAndHistory()
  }, [])

  // Dynamic KPI Header calculations using COUNT
  const kpis = useMemo(() => {
    const totalPlayers = users.length
    const verifiedPlayers = users.filter((u) => u.verificationStatus === 'Verified').length
    const activePlayers = users.filter((u) => u.verificationStatus !== 'Suspended').length
    const totalMatchesPlayed = users.reduce((acc, u) => acc + (u.matchesPlayed || 0), 0)

    return { totalPlayers, verifiedPlayers, activePlayers, totalMatchesPlayed }
  }, [users])

  // Multi-filter & search engine
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.username.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        u.gameUid.toLowerCase().includes(search.toLowerCase())

      const matchesGame = gameFilter === 'ALL' || u.game.toUpperCase().replace(/\s+/g, '') === gameFilter
      const matchesStatus = statusFilter === 'ALL' || u.verificationStatus.toUpperCase() === statusFilter

      return matchesSearch && matchesGame && matchesStatus
    })
  }, [users, search, gameFilter, statusFilter])

  // Admin Verification Actions: Verify, Reject, Suspend
  const handleUpdateVerificationStatus = async (targetUserId, newStatus) => {
    if (updatingUserId) return
    setUpdatingUserId(targetUserId)

    try {
      if (isSupabaseConfigured) {
        // Update user_roles table
        await supabase
          .from('user_roles')
          .update({ status: newStatus })
          .eq('user_id', targetUserId)

        // Upsert profiles table status
        await supabase
          .from('profiles')
          .upsert({ id: targetUserId, verification_status: newStatus }, { onConflict: 'id' })
      }

      setUsers((prev) =>
        prev.map((u) => (u.userId === targetUserId || u.id === targetUserId ? { ...u, verificationStatus: newStatus } : u))
      )

      if (selectedUser && (selectedUser.userId === targetUserId || selectedUser.id === targetUserId)) {
        setSelectedUser((prev) => ({ ...prev, verificationStatus: newStatus }))
      }

      setAlert({ type: 'success', message: `Player verification status updated to "${newStatus}".` })
      showSuccess(`Player status updated to "${newStatus}".`, 'Verification Updated')
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Failed to update player status.' })
      showError(err, 'Status Update Failed')
    } finally {
      setUpdatingUserId(null)
    }
  }

  return (
    <div className="space-y-6 antialiased">
      
      {/* 1. MODULE HEADER & SYNC */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00f2ff]/10 border border-[#00f2ff]/30 text-[#00f2ff] text-[10px] font-mono font-bold uppercase tracking-wider mb-1">
            <Users className="w-3.5 h-3.5" />
            <span>PLAYER DIRECTORY SYSTEM</span>
          </div>
          <h2 className="font-headline text-xl sm:text-2xl font-black text-white uppercase tracking-tight">
            COMPETITOR VERIFICATION & DIRECTORY CONTROL
          </h2>
        </div>

        <button
          onClick={fetchUsersAndHistory}
          className="px-4 py-2 bg-[#18181b] hover:bg-[#27272a] border border-[#27272a] hover:border-[#00f2ff] rounded-xl text-xs font-mono font-bold text-white transition-all flex items-center gap-2 uppercase shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-[#00f2ff] ${loading ? 'animate-spin' : ''}`} />
          <span>Sync Database</span>
        </button>
      </div>

      {alert && <AuthAlert type={alert.type} message={alert.message} />}

      {/* 2. STATS KPI HEADER */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
        <div className="bg-[#18181b]/60 backdrop-blur-md border border-[#27272a] rounded-2xl p-4 space-y-2 shadow-xl">
          <span className="text-[#a1a1aa] uppercase font-bold text-[10px] block">Total Players</span>
          <span className="font-headline text-2xl font-black text-[#00f2ff] block">{kpis.totalPlayers}</span>
          <span className="text-[10px] text-[#a1a1aa] block">REGISTERED USERS</span>
        </div>

        <div className="bg-[#18181b]/60 backdrop-blur-md border border-[#27272a] rounded-2xl p-4 space-y-2 shadow-xl">
          <span className="text-[#a1a1aa] uppercase font-bold text-[10px] block">Verified Competitors</span>
          <span className="font-headline text-2xl font-black text-[#00ff9d] block">{kpis.verifiedPlayers}</span>
          <span className="text-[10px] text-[#00ff9d] block">UID VERIFIED</span>
        </div>

        <div className="bg-[#18181b]/60 backdrop-blur-md border border-[#27272a] rounded-2xl p-4 space-y-2 shadow-xl">
          <span className="text-[#a1a1aa] uppercase font-bold text-[10px] block">Active Roster</span>
          <span className="font-headline text-2xl font-black text-white block">{kpis.activePlayers}</span>
          <span className="text-[10px] text-[#a1a1aa] block">ELIGIBLE PLAYERS</span>
        </div>

        <div className="bg-[#18181b]/60 backdrop-blur-md border border-[#27272a] rounded-2xl p-4 space-y-2 shadow-xl">
          <span className="text-[#a1a1aa] uppercase font-bold text-[10px] block">Total Matches Played</span>
          <span className="font-headline text-2xl font-black text-[#fe6b00] block">{kpis.totalMatchesPlayed}</span>
          <span className="text-[10px] text-[#fe6b00] block">MATCH PARTICIPATIONS</span>
        </div>
      </div>

      {/* 3. SEARCH & MULTI-FILTER BAR */}
      <div className="flex flex-col lg:flex-row gap-3 bg-[#18181b]/60 backdrop-blur-md border border-[#27272a] rounded-2xl p-4 shadow-xl">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#a1a1aa] absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search players by username, email, or game character UID..."
            className="w-full pl-10 pr-4 py-2.5 bg-[#09090b] border border-[#27272a] rounded-xl text-xs text-white placeholder-[#71717a] focus:outline-none focus:border-[#00f2ff] font-mono transition-colors"
          />
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Game Filter */}
          <div className="flex items-center gap-2">
            <Gamepad2 className="w-4 h-4 text-[#a1a1aa]" />
            <select
              value={gameFilter}
              onChange={(e) => setGameFilter(e.target.value)}
              className="bg-[#09090b] border border-[#27272a] text-white text-xs font-mono font-bold rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#00f2ff]"
            >
              <option value="ALL">ALL GAMES</option>
              <option value="FREEFIRE">FREE FIRE</option>
              <option value="BGMI">BGMI</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#a1a1aa]" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#09090b] border border-[#27272a] text-white text-xs font-mono font-bold rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#00f2ff]"
            >
              <option value="ALL">ALL STATUS</option>
              <option value="VERIFIED">VERIFIED</option>
              <option value="PENDING">PENDING</option>
              <option value="SUSPENDED">SUSPENDED</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. PLAYER DIRECTORY TABLE */}
      <div className="bg-[#18181b]/60 backdrop-blur-md border border-[#27272a] rounded-2xl overflow-hidden shadow-2xl">
        {loading ? (
          <div className="p-12 text-center text-[#a1a1aa] font-mono text-xs space-y-3">
            <div className="w-7 h-7 border-2 border-[#00f2ff] border-t-transparent rounded-full animate-spin mx-auto"></div>
            <span>Synchronizing competitor records from database...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-[#a1a1aa] space-y-3">
            <Users className="w-12 h-12 text-[#00f2ff] mx-auto opacity-40 animate-pulse" />
            <div className="space-y-1">
              <h3 className="font-headline text-base font-bold text-white uppercase tracking-wider">
                No players registered yet.
              </h3>
              <p className="text-xs text-[#a1a1aa]">
                Competitor profiles will appear here as users sign up and link their game handles.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="bg-[#09090b] border-b border-[#27272a] text-[#a1a1aa] uppercase font-bold text-[10px] tracking-wider">
                  <th className="p-4 pl-6">Player Username</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Game UID</th>
                  <th className="p-4 text-center">Matches</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right pr-6">Admin Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#27272a]">
                {filteredUsers.map((u) => (
                  <tr key={`p-row-${u.id}`} className="hover:bg-[#27272a]/50 transition-colors">
                    <td className="p-4 pl-6 font-bold text-white">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#00f2ff]/10 border border-[#00f2ff]/30 flex items-center justify-center font-bold text-[#00f2ff] shrink-0 font-sans">
                          {u.username.substring(0, 1).toUpperCase()}
                        </div>
                        <span className="font-sans font-extrabold text-sm text-white">{u.username}</span>
                      </div>
                    </td>
                    <td className="p-4 text-[#a1a1aa]">{u.email}</td>
                    <td className="p-4 text-[#00f2ff] font-bold">{u.gameUid}</td>
                    <td className="p-4 text-center font-bold text-white">{u.matchesPlayed}</td>
                    <td className="p-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${
                        u.verificationStatus === 'Verified'
                          ? 'bg-[#00ff9d]/10 text-[#00ff9d] border-[#00ff9d]/40'
                          : u.verificationStatus === 'Suspended'
                          ? 'bg-[#ff3366]/10 text-[#ff3366] border-[#ff3366]/40'
                          : 'bg-[#fe6b00]/10 text-[#fe6b00] border-[#fe6b00]/40'
                      }`}>
                        {u.verificationStatus}
                      </span>
                    </td>
                    <td className="p-4 text-right pr-6">
                      <div className="flex items-center justify-end gap-2">
                        {/* View Profile */}
                        <button
                          onClick={() => setSelectedUser(u)}
                          className="p-2 rounded-xl bg-[#09090b] hover:bg-[#27272a] text-[#00f2ff] border border-[#27272a] hover:border-[#00f2ff] transition-colors"
                          title="Inspect Player Profile"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Verify Button */}
                        <button
                          onClick={() => handleUpdateVerificationStatus(u.userId || u.id, 'Verified')}
                          disabled={updatingUserId === (u.userId || u.id) || u.verificationStatus === 'Verified'}
                          className="p-2 rounded-xl bg-[#00ff9d]/10 hover:bg-[#00ff9d]/20 text-[#00ff9d] border border-[#00ff9d]/40 disabled:opacity-30 transition-colors"
                          title="Verify Competitor"
                        >
                          <Check className="w-4 h-4" />
                        </button>

                        {/* Suspend Button */}
                        <button
                          onClick={() => handleUpdateVerificationStatus(u.userId || u.id, 'Suspended')}
                          disabled={updatingUserId === (u.userId || u.id) || u.verificationStatus === 'Suspended'}
                          className="p-2 rounded-xl bg-[#ff3366]/10 hover:bg-[#ff3366]/20 text-[#ff3366] border border-[#ff3366]/40 disabled:opacity-30 transition-colors"
                          title="Suspend Account"
                        >
                          <Ban className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. PLAYER PROFILE DRAWER / MODAL VIEW */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#151a21] border border-[#3a494b] rounded-xl max-w-2xl w-full p-6 space-y-6 shadow-2xl relative">
            <button
              onClick={() => setSelectedUser(null)}
              className="absolute top-5 right-5 p-2 rounded bg-[#07090c] border border-[#3a494b] text-[#8e9dae] hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Profile Header */}
            <div className="flex items-center gap-4 border-b border-[#3a494b]/60 pb-4">
              <div className="w-16 h-16 rounded-full bg-[#00f2ff]/10 border border-[#00f2ff] flex items-center justify-center text-xl font-extrabold text-[#00f2ff]">
                {selectedUser.username.substring(0, 1).toUpperCase()}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-display-lg text-lg font-extrabold text-white uppercase">{selectedUser.username}</h3>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-extrabold uppercase border ${
                    selectedUser.verificationStatus === 'Verified'
                      ? 'bg-[#00ff9d]/10 text-[#00ff9d] border-[#00ff9d]/40'
                      : selectedUser.verificationStatus === 'Suspended'
                      ? 'bg-red-950 text-[#ff3366] border-red-800'
                      : 'bg-[#ffb800]/10 text-[#ffb800] border-[#ffb800]/40'
                  }`}>
                    {selectedUser.verificationStatus}
                  </span>
                </div>
                <p className="text-xs text-[#8e9dae] font-mono">{selectedUser.email}</p>
                <span className="text-[10px] text-[#00f2ff] font-mono">Game UID: {selectedUser.gameUid}</span>
              </div>
            </div>

            {/* Performance Statistics */}
            <div className="grid grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-3 bg-[#07090c] rounded border border-[#3a494b]/40 text-center space-y-0.5">
                <span className="text-[9px] text-[#8e9dae] uppercase font-bold block">Matches</span>
                <span className="font-extrabold text-white text-base">{selectedUser.matchesPlayed}</span>
              </div>
              <div className="p-3 bg-[#07090c] rounded border border-[#3a494b]/40 text-center space-y-0.5">
                <span className="text-[9px] text-[#8e9dae] uppercase font-bold block">Wins</span>
                <span className="font-extrabold text-[#00ff9d] text-base">{selectedUser.wins}</span>
              </div>
              <div className="p-3 bg-[#07090c] rounded border border-[#3a494b]/40 text-center space-y-0.5">
                <span className="text-[9px] text-[#8e9dae] uppercase font-bold block">Kills</span>
                <span className="font-extrabold text-[#00f2ff] text-base">{selectedUser.kills}</span>
              </div>
              <div className="p-3 bg-[#07090c] rounded border border-[#3a494b]/40 text-center space-y-0.5">
                <span className="text-[9px] text-[#8e9dae] uppercase font-bold block">Earnings</span>
                <span className="font-extrabold text-[#fe6b00] text-base">{selectedUser.earnings}</span>
              </div>
            </div>

            {/* Tournament Participation History */}
            <div className="space-y-3 pt-2">
              <h4 className="font-display-lg text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <History className="w-4 h-4 text-[#00f2ff]" />
                <span>Tournament Participation History ({selectedUser.registrationHistory?.length || 0})</span>
              </h4>

              <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
                {selectedUser.registrationHistory && selectedUser.registrationHistory.length > 0 ? (
                  selectedUser.registrationHistory.map((h, idx) => (
                    <div key={`hist-row-${idx}`} className="p-3 bg-[#07090c] rounded border border-[#3a494b]/60 text-xs space-y-1">
                      <div className="flex justify-between font-bold text-white">
                        <span>{h.tournament_title || h.tournamentTitle || 'Official Cup'}</span>
                        <span className="text-[#00ff9d]">{h.status || 'Approved'}</span>
                      </div>
                      <div className="flex justify-between text-[11px] text-[#8e9dae]">
                        <span>Squad: <strong className="text-[#e1e2e7]">{h.team_name || h.teamName}</strong> ({h.format || 'Squad'})</span>
                        <span className="font-mono">{h.registered_at ? new Date(h.registered_at).toLocaleDateString() : 'Recent'}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center bg-[#07090c] rounded border border-[#3a494b]/60 text-xs text-[#8e9dae]">
                    No recorded tournament entries for this player account.
                  </div>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-[#3a494b]/60 flex justify-end">
              <button
                onClick={() => setSelectedUser(null)}
                className="px-5 py-2 bg-[#00f2ff] hover:bg-[#33f5ff] text-[#00363a] font-extrabold text-xs uppercase tracking-wider rounded-lg shadow-[0_0_12px_rgba(0,242,255,0.4)]"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
