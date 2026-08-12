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
import PlayerDirectoryTable from './players/PlayerDirectoryTable'
import IdentityVerificationQueue from './players/IdentityVerificationQueue'
import TournamentEligibilityAuditor from './players/TournamentEligibilityAuditor'
import TeamsView from './TeamsView'

export default function PlayerDirectoryView({ tournaments = [] }) {
  const { showSuccess, showError } = useToast()
  const [activePlayerTab, setActivePlayerTab] = useState('DIRECTORY') // 'DIRECTORY' | 'VERIFICATION_QUEUE' | 'TEAMS_ROSTER' | 'ELIGIBILITY_AUDITOR' | 'PLAYER_HISTORY'
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
    <div className="space-y-6 antialiased font-mono">

      {/* 1. MODULE HEADER & SYNC */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#3a494b]/60 pb-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00f2ff]/10 border border-[#00f2ff]/30 text-[#00f2ff] text-[10px] font-mono font-bold uppercase tracking-wider mb-1">
            <Users className="w-3.5 h-3.5" />
            <span>MJ ESPORTS V2</span>
          </div>
          <h2 className="font-headline text-xl sm:text-2xl font-black text-white uppercase tracking-tight">
            PLAYER IDENTITY & ROSTER OPERATIONS
          </h2>
        </div>

        <button
          onClick={fetchUsersAndHistory}
          className="px-4 py-2.5 bg-[#07090c] hover:bg-[#1d232c] border border-[#3a494b] hover:border-[#00f2ff] text-[#00f2ff] rounded-xl text-xs font-bold transition-all flex items-center gap-2 uppercase shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Sync Database</span>
        </button>
      </div>

      {alert && <AuthAlert type={alert.type} message={alert.message} />}

      {/* 2. PLAYER IA NAVIGATION TABS */}
      <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-3 shadow-xl flex items-center gap-2 overflow-x-auto text-xs font-bold">
        {[
          { id: 'DIRECTORY', label: 'PLAYER DIRECTORY' },
          { id: 'VERIFICATION_QUEUE', label: 'IDENTITY VERIFICATION QUEUE' },
          { id: 'TEAMS_ROSTER', label: 'TEAMS & SQUAD ROSTER' },
          { id: 'ELIGIBILITY_AUDITOR', label: 'TOURNAMENT ELIGIBILITY' },
          { id: 'PLAYER_HISTORY', label: 'PLAYER HISTORY' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActivePlayerTab(tab.id)}
            className={`px-3.5 py-2 rounded-lg transition-all whitespace-nowrap ${
              activePlayerTab === tab.id
                ? 'bg-[#00f2ff] text-black font-extrabold shadow-[0_0_12px_rgba(0,242,255,0.3)]'
                : 'bg-[#07090c] text-[#8e9dae] hover:text-white border border-[#3a494b]/60'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 3. VIEW SWITCHING */}
      {activePlayerTab === 'DIRECTORY' && (
        <PlayerDirectoryTable
          users={users}
          onSelectPlayer={(u) => setSelectedUser(u)}
          onUpdateVerificationStatus={handleUpdateVerificationStatus}
        />
      )}

      {activePlayerTab === 'VERIFICATION_QUEUE' && (
        <IdentityVerificationQueue
          users={users}
          onUpdateStatus={handleUpdateVerificationStatus}
          updatingUserId={updatingUserId}
        />
      )}

      {activePlayerTab === 'TEAMS_ROSTER' && (
        <TeamsView tournaments={tournaments} />
      )}

      {activePlayerTab === 'ELIGIBILITY_AUDITOR' && (
        <TournamentEligibilityAuditor
          users={users}
          tournaments={tournaments}
        />
      )}

      {activePlayerTab === 'PLAYER_HISTORY' && (
        <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-5 space-y-4 shadow-xl font-mono text-xs">
          <h3 className="font-headline text-xs font-bold text-white uppercase border-b border-[#3a494b]/60 pb-2">
            MASTER PLAYER PARTICIPATION HISTORY
          </h3>
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {allRegistrations.length === 0 ? (
              <p className="text-[#8e9dae] text-center p-4">No historical tournament registrations recorded.</p>
            ) : (
              allRegistrations.slice(0, 15).map((reg) => (
                <div key={reg.id} className="p-3 bg-[#07090c] border border-[#3a494b] rounded-lg flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white block">{reg.captain_name || reg.team_name || 'Player'}</span>
                    <span className="text-[10px] text-[#8e9dae]">{reg.tournament_title || 'Tournament'} • UID: {reg.free_fire_uid || 'N/A'}</span>
                  </div>
                  <span className="px-2 py-0.5 bg-[#00ff9d]/10 text-[#00ff9d] border border-[#00ff9d]/30 text-[10px] rounded uppercase font-bold">
                    {reg.status || 'Approved'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 4. PLAYER PROFILE INSPECTOR DIALOG */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#151a21] border border-[#3a494b] rounded-xl max-w-xl w-full p-6 space-y-5 shadow-2xl relative font-mono text-xs">
            <button
              onClick={() => setSelectedUser(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-[#07090c] border border-[#3a494b] text-[#8e9dae] hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 border-b border-[#3a494b]/60 pb-3">
              <div className="w-12 h-12 rounded-xl bg-[#07090c] border border-[#00f2ff] flex items-center justify-center text-lg font-bold text-[#00f2ff]">
                {(selectedUser.username || 'P')[0].toUpperCase()}
              </div>
              <div>
                <h3 className="font-headline text-base font-bold text-white uppercase">{selectedUser.username}</h3>
                <p className="text-xs text-[#8e9dae]">{selectedUser.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-[#07090c] border border-[#3a494b] rounded-lg space-y-1">
                <span className="text-[9px] text-[#8e9dae] uppercase block">VERIFIED GAME UID</span>
                <span className="font-bold text-[#00ff9d] text-sm">{selectedUser.gameUid || 'N/A'}</span>
              </div>
              <div className="p-3 bg-[#07090c] border border-[#3a494b] rounded-lg space-y-1">
                <span className="text-[9px] text-[#8e9dae] uppercase block">VERIFICATION STATUS</span>
                <span className="font-bold text-[#00f2ff] text-sm">{selectedUser.verificationStatus}</span>
              </div>
            </div>

            <button
              onClick={() => setSelectedUser(null)}
              className="w-full py-2.5 bg-[#07090c] hover:bg-[#1d232c] border border-[#3a494b] text-white rounded-lg text-xs font-bold uppercase transition-colors"
            >
              CLOSE INSPECTOR
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
