import { useState, useEffect, useMemo } from 'react'
import {
  Shield,
  Search,
  Filter,
  Gamepad2,
  Users,
  Trophy,
  CheckCircle2,
  Ban,
  Trash2,
  Eye,
  X,
  RefreshCw,
  Crown,
  Check,
  Building2,
  Calendar,
  DollarSign,
  AlertTriangle
} from 'lucide-react'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import AuthAlert from '../common/AuthAlert'
import { useToast } from '../../contexts/ToastContext'

export default function TeamsView({ tournaments = [] }) {
  const { showSuccess, showError } = useToast()
  const [searchQuery, setSearchQuery] = useState('')
  const [gameFilter, setGameFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [alert, setAlert] = useState(null)
  const [selectedTeam, setSelectedTeam] = useState(null)
  const [dbTeams, setDbTeams] = useState([])
  const [teamMembersMap, setTeamMembersMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [updatingTeamId, setUpdatingTeamId] = useState(null)

  const fetchTeamsAndRosters = async () => {
    setLoading(true)
    try {
      if (isSupabaseConfigured) {
        // Fetch Teams, Members & Tournament Registrations concurrently via Promise.all
        const [{ data: teamsData }, { data: membersData }, { data: regsData }] = await Promise.all([
          supabase.from('teams').select('*').order('created_at', { ascending: false }),
          supabase.from('team_members').select('*'),
          supabase.from('tournament_registrations').select('*'),
        ])

        const loadedTeams = teamsData || []
        const loadedMembers = membersData || []
        const loadedRegs = regsData || []

        // Group members by team_id
        const membersByTeam = {}
        loadedMembers.forEach((m) => {
          if (!membersByTeam[m.team_id]) membersByTeam[m.team_id] = []
          membersByTeam[m.team_id].push(m)
        })
        setTeamMembersMap(membersByTeam)

        // Process dynamic teams combining DB teams and tournament registered teams
        const dynamicTeamsMap = {}

        // 1. Process DB teams
        loadedTeams.forEach((t) => {
          const members = membersByTeam[t.id] || []
          const teamRegs = loadedRegs.filter(
            (r) => r.team_name?.toLowerCase() === t.name.toLowerCase() || r.user_id === t.captain_id
          )

          dynamicTeamsMap[t.id] = {
            id: t.id,
            name: t.name,
            tag: t.team_uid || t.name.substring(0, 4).toUpperCase(),
            captain: t.captain_name || 'Captain',
            captainId: t.captain_id,
            captainUid: members.find((m) => m.role === 'Captain')?.game_uid || 'N/A',
            game: t.game || 'Free Fire',
            status: t.status || 'Verified',
            logoUrl: t.logo_url,
            createdAt: t.created_at ? new Date(t.created_at).toLocaleDateString() : 'Recent',
            members: members.length > 0 ? members : (t.captain_name ? [
              { id: `mem-${t.id}-1`, player_name: t.captain_name, game_uid: 'N/A', role: 'Captain' }
            ] : []),
            matchesPlayed: teamRegs.length,
            wins: teamRegs.filter((r) => r.status === 'Completed' || r.status === 'Approved').length,
            earnings: '₹0',
            tournamentHistory: teamRegs,
          }
        })

        // 2. Process tournament registered teams if not in DB
        tournaments.forEach((tourn) => {
          const teamsList = Array.isArray(tourn.teams_list)
            ? tourn.teams_list
            : Array.isArray(tourn.teamsList)
            ? tourn.teamsList
            : []

          teamsList.forEach((item, idx) => {
            const teamName = item.name || item.teamName || item.team || `Squad #${idx + 1}`
            const teamKey = `reg-${teamName.toLowerCase().replace(/\s+/g, '-')}`

            if (!dynamicTeamsMap[teamKey] && !Object.values(dynamicTeamsMap).some((t) => t.name.toLowerCase() === teamName.toLowerCase())) {
              const teammates = Array.isArray(item.teammates) ? item.teammates : []
              const captainName = item.captain || item.captainName || 'Captain'
              const captainUid = item.freeFireUid || item.gameUid || 'N/A'

              const squadMembers = [
                { id: `mem-c-${idx}`, player_name: captainName, game_uid: captainUid, role: 'Captain' },
                ...teammates.map((tm, tIdx) => ({
                  id: `mem-t-${idx}-${tIdx}`,
                  player_name: typeof tm === 'string' ? tm : tm.name || `Teammate #${tIdx + 1}`,
                  game_uid: typeof tm === 'object' ? tm.gameUid || tm.uid || 'N/A' : 'N/A',
                  role: 'Member',
                })),
              ]

              dynamicTeamsMap[teamKey] = {
                id: teamKey,
                name: teamName,
                tag: teamName.substring(0, 4).toUpperCase(),
                captain: captainName,
                captainUid: captainUid,
                game: tourn.game || 'Free Fire',
                status: 'Verified',
                createdAt: 'Recent',
                members: squadMembers,
                matchesPlayed: 1,
                wins: item.rank === 1 ? 1 : 0,
                earnings: '₹0',
                tournamentHistory: [{ tournament_title: tourn.title, registered_at: tourn.startDate || 'Recent', status: 'Approved' }],
              }
            }
          })
        })

        setDbTeams(Object.values(dynamicTeamsMap))
      } else {
        setDbTeams([])
      }
    } catch (err) {
      console.error('[Fetch Teams Error]:', err)
      setDbTeams([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTeamsAndRosters()
  }, [tournaments])

  // Dynamic KPI Header calculations
  const kpis = useMemo(() => {
    const totalTeams = dbTeams.length
    const activeTeams = dbTeams.filter((t) => t.status !== 'Suspended').length
    const verifiedTeams = dbTeams.filter((t) => t.status === 'Verified').length
    const totalPlayersInTeams = dbTeams.reduce((acc, t) => acc + (t.members?.length || 4), 0)

    return { totalTeams, activeTeams, verifiedTeams, totalPlayersInTeams }
  }, [dbTeams])

  // Multi-filter engine
  const filteredTeams = useMemo(() => {
    return dbTeams.filter((team) => {
      const matchesSearch =
        team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        team.captain.toLowerCase().includes(searchQuery.toLowerCase()) ||
        team.tag.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesGame = gameFilter === 'ALL' || team.game.toUpperCase().replace(/\s+/g, '') === gameFilter
      const matchesStatus = statusFilter === 'ALL' || team.status.toUpperCase() === statusFilter

      return matchesSearch && matchesGame && matchesStatus
    })
  }, [dbTeams, searchQuery, gameFilter, statusFilter])

  // Admin Actions: Verify Team, Suspend Team, Remove Team
  const handleUpdateTeamStatus = async (teamId, newStatus) => {
    if (updatingTeamId) return
    setUpdatingTeamId(teamId)

    try {
      if (isSupabaseConfigured && !teamId.startsWith('reg-')) {
        await supabase
          .from('teams')
          .update({ status: newStatus })
          .eq('id', teamId)
      }

      setDbTeams((prev) =>
        prev.map((t) => (t.id === teamId ? { ...t, status: newStatus } : t))
      )

      if (selectedTeam && selectedTeam.id === teamId) {
        setSelectedTeam((prev) => ({ ...prev, status: newStatus }))
      }

      setAlert({ type: 'success', message: `Team status updated to "${newStatus}".` })
      showSuccess(`Team status updated to "${newStatus}".`, 'Team Status')
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Failed to update team status.' })
      showError(err, 'Team Status Failed')
    } finally {
      setUpdatingTeamId(null)
    }
  }

  const handleRemoveTeam = async (teamId) => {
    if (updatingTeamId) return
    if (!window.confirm('Are you sure you want to remove this team from the directory?')) return

    setUpdatingTeamId(teamId)
    try {
      if (isSupabaseConfigured && !teamId.startsWith('reg-')) {
        await supabase.from('teams').delete().eq('id', teamId)
      }

      setDbTeams((prev) => prev.filter((t) => t.id !== teamId))
      if (selectedTeam && selectedTeam.id === teamId) setSelectedTeam(null)

      setAlert({ type: 'success', message: 'Team successfully removed.' })
      showSuccess('Team removed from directory.', 'Team Removed')
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Failed to remove team.' })
      showError(err, 'Remove Failed')
    } finally {
      setUpdatingTeamId(null)
    }
  }

  return (
    <div className="space-y-6 antialiased">
      
      {/* 1. MODULE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00f2ff]/10 border border-[#00f2ff]/30 text-[#00f2ff] text-[10px] font-mono font-bold uppercase tracking-wider mb-1">
            <Shield className="w-3.5 h-3.5" />
            <span>SQUAD ROSTER CONTROL</span>
          </div>
          <h2 className="font-headline text-xl sm:text-2xl font-black text-white uppercase tracking-tight">
            TEAMS & SQUAD DIRECTORY
          </h2>
        </div>

        <button
          onClick={fetchTeamsAndRosters}
          className="px-4 py-2 bg-[#18181b] hover:bg-[#27272a] border border-[#27272a] hover:border-[#00f2ff] rounded-xl text-xs font-mono font-bold text-white transition-all flex items-center gap-2 uppercase shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-[#00f2ff] ${loading ? 'animate-spin' : ''}`} />
          <span>Sync Roster Directory</span>
        </button>
      </div>

      {alert && <AuthAlert type={alert.type} message={alert.message} />}

      {/* 2. STATS KPI HEADER */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
        <div className="bg-[#18181b]/60 backdrop-blur-md border border-[#27272a] rounded-2xl p-4 space-y-2 shadow-xl">
          <span className="text-[#a1a1aa] uppercase font-bold text-[10px] block">Total Squads</span>
          <span className="font-headline text-2xl font-black text-[#00f2ff] block">{kpis.totalTeams}</span>
          <span className="text-[10px] text-[#a1a1aa] block">REGISTERED SQUADS</span>
        </div>

        <div className="bg-[#18181b]/60 backdrop-blur-md border border-[#27272a] rounded-2xl p-4 space-y-2 shadow-xl">
          <span className="text-[#a1a1aa] uppercase font-bold text-[10px] block">Active Squads</span>
          <span className="font-headline text-2xl font-black text-white block">{kpis.activeTeams}</span>
          <span className="text-[10px] text-[#a1a1aa] block">ELIGIBLE SQUADS</span>
        </div>

        <div className="bg-[#18181b]/60 backdrop-blur-md border border-[#27272a] rounded-2xl p-4 space-y-2 shadow-xl">
          <span className="text-[#a1a1aa] uppercase font-bold text-[10px] block">Verified Squads</span>
          <span className="font-headline text-2xl font-black text-[#00ff9d] block">{kpis.verifiedTeams}</span>
          <span className="text-[10px] text-[#00ff9d] block">VERIFIED SQUADS</span>
        </div>

        <div className="bg-[#18181b]/60 backdrop-blur-md border border-[#27272a] rounded-2xl p-4 space-y-2 shadow-xl">
          <span className="text-[#a1a1aa] uppercase font-bold text-[10px] block">Total Team Players</span>
          <span className="font-headline text-2xl font-black text-[#fe6b00] block">{kpis.totalPlayersInTeams}</span>
          <span className="text-[10px] text-[#fe6b00] block">ROSTERED PLAYERS</span>
        </div>
      </div>

      {/* 3. SEARCH & MULTI-FILTER BAR */}
      <div className="flex flex-col lg:flex-row gap-3 bg-[#18181b]/60 backdrop-blur-md border border-[#27272a] rounded-2xl p-4 shadow-xl">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#a1a1aa] absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search teams by squad name, tag, or captain name..."
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

      {/* 4. TEAM CARDS GRID */}
      {loading ? (
        <div className="bg-[#18181b]/60 backdrop-blur-md border border-[#27272a] rounded-2xl p-12 text-center text-[#a1a1aa] font-mono text-xs space-y-3 shadow-xl">
          <div className="w-7 h-7 border-2 border-[#00f2ff] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <span>Loading team rosters and competitive records...</span>
        </div>
      ) : filteredTeams.length === 0 ? (
        <div className="bg-[#18181b]/60 backdrop-blur-md border border-[#27272a] rounded-2xl p-12 text-center space-y-3 shadow-xl">
          <Shield className="w-12 h-12 text-[#00f2ff] mx-auto opacity-40 animate-pulse" />
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="font-headline text-base sm:text-lg font-bold text-white uppercase tracking-wider">
              No registered teams found.
            </h3>
            <p className="text-xs text-[#a1a1aa]">
              Teams will appear here after tournament registrations or squad profile setup.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTeams.map((team) => (
            <div
              key={team.id}
              className="bg-[#18181b]/60 backdrop-blur-md border border-[#27272a] hover:border-[#00f2ff]/40 rounded-2xl p-5 space-y-4 shadow-xl transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#09090b] border border-[#00f2ff]/40 flex items-center justify-center font-headline text-sm font-black text-[#00f2ff] font-mono">
                      [{team.tag}]
                    </div>
                    <div>
                      <h3 className="font-headline text-base font-extrabold text-white uppercase">{team.name}</h3>
                      <span className="text-[11px] text-[#a1a1aa] font-mono font-semibold flex items-center gap-1">
                        <Gamepad2 className="w-3.5 h-3.5 text-[#00f2ff]" />
                        {team.game}
                      </span>
                    </div>
                  </div>

                  <span className={`px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase border ${
                    team.status === 'Verified'
                      ? 'bg-[#00ff9d]/10 text-[#00ff9d] border-[#00ff9d]/40'
                      : team.status === 'Suspended'
                      ? 'bg-[#ff3366]/10 text-[#ff3366] border-[#ff3366]/40'
                      : 'bg-[#fe6b00]/10 text-[#fe6b00] border-[#fe6b00]/40'
                  }`}>
                    {team.status}
                  </span>
                </div>

                {/* Team Captain & Matches */}
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-2.5 bg-[#09090b] rounded-xl border border-[#27272a]">
                    <span className="text-[10px] text-[#a1a1aa] block uppercase">Squad Captain</span>
                    <span className="font-bold text-white block truncate flex items-center gap-1 font-sans">
                      <Crown className="w-3.5 h-3.5 text-[#fe6b00]" />
                      {team.captain}
                    </span>
                  </div>
                  <div className="p-2.5 bg-[#09090b] rounded-xl border border-[#27272a]">
                    <span className="text-[10px] text-[#a1a1aa] block uppercase">Matches / Wins</span>
                    <span className="font-bold text-[#00f2ff] block">
                      {team.matchesPlayed} Matches &bull; {team.wins} Wins
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2 border-t border-white/5 font-mono text-xs">
                <button
                  onClick={() => setSelectedTeam(team)}
                  className="flex-1 py-2 bg-[#09090b] hover:bg-[#27272a] text-[#00f2ff] border border-[#27272a] hover:border-[#00f2ff] rounded-xl font-bold uppercase transition-colors flex items-center justify-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Roster Ranks</span>
                </button>

                <button
                  onClick={() => handleUpdateTeamStatus(team.id, team.status === 'Verified' ? 'Pending' : 'Verified')}
                  className="p-2 rounded-xl bg-[#00ff9d]/10 hover:bg-[#00ff9d]/20 text-[#00ff9d] border border-[#00ff9d]/40 transition-colors"
                  title="Toggle Verification Status"
                >
                  <Check className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}


      {/* 5. TEAM PROFILE & ROSTER MODAL VIEW */}
      {selectedTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#151a21] border border-[#3a494b] rounded-xl max-w-2xl w-full p-6 space-y-6 shadow-2xl relative">
            <button
              onClick={() => setSelectedTeam(null)}
              className="absolute top-5 right-5 p-2 rounded bg-[#07090c] border border-[#3a494b] text-[#8e9dae] hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Basic Team Info */}
            <div className="flex items-center gap-4 border-b border-[#3a494b]/60 pb-4">
              <div className="w-16 h-16 rounded-xl bg-[#07090c] border border-[#00f2ff] flex items-center justify-center text-xl font-extrabold text-[#00f2ff]">
                [{selectedTeam.tag}]
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-display-lg text-lg font-extrabold text-white uppercase">{selectedTeam.name}</h3>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-extrabold uppercase border ${
                    selectedTeam.status === 'Verified'
                      ? 'bg-[#00ff9d]/10 text-[#00ff9d] border-[#00ff9d]/40'
                      : selectedTeam.status === 'Suspended'
                      ? 'bg-red-950 text-[#ff3366] border-red-800'
                      : 'bg-[#ffb800]/10 text-[#ffb800] border-[#ffb800]/40'
                  }`}>
                    {selectedTeam.status}
                  </span>
                </div>
                <p className="text-xs text-[#8e9dae]">Game: <strong className="text-[#00f2ff]">{selectedTeam.game}</strong></p>
                <span className="text-[10px] text-[#8e9dae] font-mono block">Registered: {selectedTeam.createdAt}</span>
              </div>
            </div>

            {/* Roster Members Table */}
            <div className="space-y-3">
              <h4 className="font-display-lg text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#00f2ff]" />
                <span>Active Squad Roster ({selectedTeam.members?.length || 0})</span>
              </h4>

              <div className="bg-[#07090c] border border-[#3a494b]/60 rounded-lg overflow-hidden text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#3a494b]/60 text-[#8e9dae] font-label-caps">
                      <th className="p-2.5 pl-3">Player Name</th>
                      <th className="p-2.5">Game UID</th>
                      <th className="p-2.5 text-right pr-3">Role</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#3a494b]/40">
                    {selectedTeam.members?.map((m, idx) => (
                      <tr key={`mem-row-${idx}`} className="hover:bg-[#1d232c]">
                        <td className="p-2.5 pl-3 font-bold text-white flex items-center gap-2">
                          {m.role === 'Captain' && <Crown className="w-3.5 h-3.5 text-[#ffb800]" />}
                          <span>{m.player_name}</span>
                        </td>
                        <td className="p-2.5 font-mono text-[#00f2ff] font-bold">{m.game_uid}</td>
                        <td className="p-2.5 text-right pr-3">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-extrabold uppercase border ${
                            m.role === 'Captain' ? 'bg-[#ffb800]/10 text-[#ffb800] border-[#ffb800]/40' : 'bg-[#151a21] text-[#8e9dae] border-[#3a494b]'
                          }`}>
                            {m.role || 'Member'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Performance Statistics */}
            <div className="grid grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-3 bg-[#07090c] rounded border border-[#3a494b]/40 text-center space-y-0.5">
                <span className="text-[9px] text-[#8e9dae] uppercase font-bold block">Matches</span>
                <span className="font-extrabold text-white text-base">{selectedTeam.matchesPlayed}</span>
              </div>
              <div className="p-3 bg-[#07090c] rounded border border-[#3a494b]/40 text-center space-y-0.5">
                <span className="text-[9px] text-[#8e9dae] uppercase font-bold block">Wins</span>
                <span className="font-extrabold text-[#00ff9d] text-base">{selectedTeam.wins}</span>
              </div>
              <div className="p-3 bg-[#07090c] rounded border border-[#3a494b]/40 text-center space-y-0.5">
                <span className="text-[9px] text-[#8e9dae] uppercase font-bold block">Entries</span>
                <span className="font-extrabold text-[#00f2ff] text-base">{selectedTeam.tournamentHistory?.length || 0}</span>
              </div>
              <div className="p-3 bg-[#07090c] rounded border border-[#3a494b]/40 text-center space-y-0.5">
                <span className="text-[9px] text-[#8e9dae] uppercase font-bold block">Earnings</span>
                <span className="font-extrabold text-[#fe6b00] text-base">{selectedTeam.earnings}</span>
              </div>
            </div>

            {/* Tournament History */}
            <div className="space-y-2">
              <h4 className="font-display-lg text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-[#fe6b00]" />
                <span>Tournament History</span>
              </h4>
              <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
                {selectedTeam.tournamentHistory && selectedTeam.tournamentHistory.length > 0 ? (
                  selectedTeam.tournamentHistory.map((h, idx) => (
                    <div key={`thist-${idx}`} className="p-2.5 bg-[#07090c] rounded border border-[#3a494b]/60 text-xs flex justify-between items-center">
                      <span className="font-bold text-white">{h.tournament_title || h.tournamentTitle || 'Official Cup'}</span>
                      <span className="font-mono text-[#00ff9d]">{h.status || 'Approved'}</span>
                    </div>
                  ))
                ) : (
                  <div className="p-3 text-center bg-[#07090c] rounded border border-[#3a494b]/60 text-xs text-[#8e9dae]">
                    No tournament entries recorded yet.
                  </div>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-[#3a494b]/60 flex justify-end">
              <button
                onClick={() => setSelectedTeam(null)}
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
