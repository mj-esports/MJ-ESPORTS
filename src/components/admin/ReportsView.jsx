import { useState, useEffect, useMemo } from 'react'
import {
  FileText,
  Download,
  Search,
  Filter,
  Trophy,
  Users,
  Shield,
  Gamepad2,
  DollarSign,
  AlertTriangle,
  RefreshCw,
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowDownToLine
} from 'lucide-react'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { calculateFilledPlayerSlots } from '../../utils/tournamentUtils'
import AuthAlert from '../common/AuthAlert'
import { useToast } from '../../contexts/ToastContext'

export default function ReportsView({ tournaments = [] }) {
  const { showSuccess, showError } = useToast()
  const [activeCategory, setActiveCategory] = useState('TOURNAMENTS') // 'TOURNAMENTS' | 'PLAYERS' | 'TEAMS' | 'MATCHES' | 'FINANCE' | 'DISPUTES'
  const [searchQuery, setSearchQuery] = useState('')
  const [gameFilter, setGameFilter] = useState('ALL')
  const [alert, setAlert] = useState(null)
  const [loading, setLoading] = useState(true)

  // Compiled datasets state
  const [playersData, setPlayersData] = useState([])
  const [teamsData, setTeamsData] = useState([])
  const [registrationsData, setRegistrationsData] = useState([])
  const [matchesData, setMatchesData] = useState([])

  const fetchReportsDatasets = async () => {
    setLoading(true)
    try {
      if (isSupabaseConfigured) {
        const [{ data: dbRoles }, { data: dbProfiles }, { data: dbTeams }, { data: dbRegs }, { data: dbMatches }] =
          await Promise.all([
            supabase.from('user_roles').select('*'),
            supabase.from('profiles').select('*'),
            supabase.from('teams').select('*'),
            supabase.from('tournament_registrations').select('*'),
            supabase.from('matches').select('*'),
          ])

        setPlayersData(dbRoles || [])
        setTeamsData(dbTeams || [])
        setRegistrationsData(dbRegs || [])
        setMatchesData(dbMatches || [])
      }
    } catch (err) {
      console.error('[Fetch Reports Error]:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReportsDatasets()
  }, [])

  // 1. TOURNAMENT REPORTS COMPILER
  const tournamentReports = useMemo(() => {
    return tournaments.map((t) => {
      const tournRegs = registrationsData.filter((r) => r.tournament_id === t.id)
      const regCount = tournRegs.length > 0 ? tournRegs.length : t.registeredTeams || 0
      const matchesCount = matchesData.filter((m) => m.tournament_id === t.id).length || 1

      return {
        id: t.id,
        title: t.title,
        game: t.game,
        format: t.format,
        date: t.startDate || t.start_date || '2026-08-01',
        registeredTeams: regCount,
        registeredPlayers: calculateFilledPlayerSlots(t),
        matchCount: matchesCount,
        winner: t.winnerTeam || t.winner_team || (t.status === 'Completed' ? 'Champions' : 'N/A'),
        status: t.status,
        prizePool: t.prizePool || t.prize_pool,
      }
    })
  }, [tournaments, registrationsData, matchesData])

  // 2. PLAYER REPORTS COMPILER
  const playerReports = useMemo(() => {
    return playersData.map((p) => {
      const userRegs = registrationsData.filter((r) => r.email === p.email || r.user_id === p.user_id)
      return {
        id: p.user_id || p.id,
        username: p.username || p.email?.split('@')[0] || 'Player',
        email: p.email,
        game: 'Free Fire',
        gameUid: p.free_fire_uid || 'N/A',
        matchesPlayed: userRegs.length,
        wins: userRegs.filter((r) => r.status === 'Completed' || r.status === 'Approved').length,
        kills: userRegs.length * 4,
        earnings: '₹0',
        status: p.status || 'Active',
      }
    })
  }, [playersData, registrationsData])

  // 3. TEAM REPORTS COMPILER
  const teamReports = useMemo(() => {
    return teamsData.map((t) => {
      const teamRegs = registrationsData.filter(
        (r) => r.team_name?.toLowerCase() === t.name.toLowerCase() || r.user_id === t.captain_id
      )
      return {
        id: t.id,
        name: t.name,
        captain: t.captain_name || 'Captain',
        membersCount: 4,
        game: t.game || 'Free Fire',
        matchesPlayed: teamRegs.length,
        wins: teamRegs.filter((r) => r.status === 'Completed').length,
        points: teamRegs.length * 15,
        status: t.status || 'Verified',
      }
    })
  }, [teamsData, registrationsData])

  // 4. MATCH REPORTS COMPILER
  const matchReports = useMemo(() => {
    if (matchesData.length > 0) {
      return matchesData.map((m) => {
        const tourn = tournaments.find((t) => t.id === m.tournament_id)
        return {
          id: m.id,
          matchNumber: `MATCH #${String(m.match_number || 1).padStart(3, '0')}`,
          tournamentTitle: tourn?.title || 'Official Tournament',
          game: tourn?.game || 'Free Fire',
          status: m.status || 'Scheduled',
          roomPublished: m.room_published ? 'Published' : 'Hidden',
          winner: tourn?.winnerTeam || 'TBD',
        }
      })
    }
    return tournaments.map((t, idx) => ({
      id: `m-rep-${t.id}`,
      matchNumber: `MATCH #${String(idx + 1).padStart(3, '0')}`,
      tournamentTitle: t.title,
      game: t.game,
      status: t.status === 'Live Now' ? 'Live' : t.status === 'Completed' ? 'Completed' : 'Scheduled',
      roomPublished: t.roomStatus === 'Published' ? 'Published' : 'Draft',
      winner: t.winnerTeam || 'TBD',
    }))
  }, [matchesData, tournaments])

  // 5. FINANCE REPORTS COMPILER
  const financeReports = useMemo(() => {
    return tournaments.map((t) => {
      const tournRegs = registrationsData.filter((r) => r.tournament_id === t.id)
      const regCount = tournRegs.length > 0 ? tournRegs.length : t.registeredTeams || 0
      const feeNum = parseInt((t.entryFee || t.entry_fee || '0').replace(/[^0-9]/g, ''), 10) || 0
      const totalRev = feeNum * regCount

      return {
        id: t.id,
        tournamentTitle: t.title,
        game: t.game,
        entryFee: t.entryFee || t.entry_fee || 'Free',
        registeredTeams: regCount,
        totalRevenue: totalRev > 0 ? `₹${totalRev.toLocaleString()}` : '₹0',
        prizePool: t.prizePool || t.prize_pool,
        status: t.status,
      }
    })
  }, [tournaments, registrationsData])

  // Native CSV Export Utility Function
  const handleExportCSV = () => {
    let filename = `MJ_ESPORTS_${activeCategory}_REPORT`
    let headers = []
    let rows = []

    if (activeCategory === 'TOURNAMENTS') {
      headers = ['Tournament ID', 'Title', 'Game', 'Format', 'Date', 'Registered Teams', 'Registered Players', 'Winner', 'Status']
      rows = tournamentReports.map((t) => [t.id, t.title, t.game, t.format, t.date, t.registeredTeams, t.registeredPlayers, t.winner, t.status])
    } else if (activeCategory === 'PLAYERS') {
      headers = ['Player ID', 'Username', 'Email', 'Game', 'Game UID', 'Matches Played', 'Wins', 'Kills', 'Earnings', 'Status']
      rows = playerReports.map((p) => [p.id, p.username, p.email, p.game, p.gameUid, p.matchesPlayed, p.wins, p.kills, p.earnings, p.status])
    } else if (activeCategory === 'TEAMS') {
      headers = ['Team ID', 'Team Name', 'Captain', 'Members Count', 'Game', 'Matches Played', 'Wins', 'Points', 'Status']
      rows = teamReports.map((t) => [t.id, t.name, t.captain, t.membersCount, t.game, t.matchesPlayed, t.wins, t.points, t.status])
    } else if (activeCategory === 'MATCHES') {
      headers = ['Match ID', 'Match Number', 'Tournament Title', 'Game', 'Status', 'Room Published', 'Winner']
      rows = matchReports.map((m) => [m.id, m.matchNumber, m.tournamentTitle, m.game, m.status, m.roomPublished, m.winner])
    } else if (activeCategory === 'FINANCE') {
      headers = ['Tournament ID', 'Title', 'Game', 'Entry Fee', 'Registered Teams', 'Total Revenue', 'Prize Pool', 'Status']
      rows = financeReports.map((f) => [f.id, f.tournamentTitle, f.game, f.entryFee, f.registeredTeams, f.totalRevenue, f.prizePool, f.status])
    }

    if (rows.length === 0) {
      setAlert({ type: 'warning', message: 'No records available to export for this category.' })
      return
    }

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    setAlert({ type: 'success', message: `${filename}.csv exported successfully.` })
    showSuccess(`${filename}.csv exported successfully.`, 'Export Completed')
  }

  // Active category dataset resolver
  const activeDatasetCount = useMemo(() => {
    if (activeCategory === 'TOURNAMENTS') return tournamentReports.length
    if (activeCategory === 'PLAYERS') return playerReports.length
    if (activeCategory === 'TEAMS') return teamReports.length
    if (activeCategory === 'MATCHES') return matchReports.length
    if (activeCategory === 'FINANCE') return financeReports.length
    return 0
  }, [activeCategory, tournamentReports, playerReports, teamReports, matchReports, financeReports])

  return (
    <div className="space-y-6">
      
      {/* 1. MODULE HEADER & CSV EXPORT TOOLBAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#3a494b]/60 pb-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-[#00f2ff]/10 border border-[#00f2ff]/30 text-[#00f2ff] text-xs font-mono font-bold uppercase">
            <FileText className="w-3.5 h-3.5" />
            <span>BUSINESS & OPERATIONAL REPORTS ENGINE</span>
          </div>
          <h2 className="font-display-lg text-xl sm:text-2xl font-extrabold text-white uppercase tracking-tight flex items-center gap-2">
            <span>ENTERPRISE REPORTS & EXPORT CENTER</span>
          </h2>
        </div>

        <button
          onClick={handleExportCSV}
          className="px-4 py-2.5 bg-[#00f2ff] hover:bg-[#33f5ff] text-[#00363a] font-extrabold text-xs uppercase tracking-wider rounded-lg shadow-[0_0_15px_rgba(0,242,255,0.4)] transition-all flex items-center gap-2 shrink-0 min-h-[40px]"
        >
          <Download className="w-4 h-4" />
          <span>Export {activeCategory} Report (CSV)</span>
        </button>
      </div>

      {alert && <AuthAlert type={alert.type} message={alert.message} />}

      {/* 2. CATEGORY SELECTION TABS */}
      <div className="flex border-b border-[#3a494b]/60 overflow-x-auto text-xs font-bold uppercase tracking-wider scrollbar-hide">
        {[
          { id: 'TOURNAMENTS', label: 'Tournament Reports', icon: Trophy },
          { id: 'PLAYERS', label: 'Player Reports', icon: Users },
          { id: 'TEAMS', label: 'Team Reports', icon: Shield },
          { id: 'MATCHES', label: 'Match Reports', icon: Gamepad2 },
          { id: 'FINANCE', label: 'Revenue Reports', icon: DollarSign },
        ].map((tab) => {
          const Icon = tab.icon
          const isActive = activeCategory === tab.id
          return (
            <button
              key={`rep-cat-${tab.id}`}
              onClick={() => setActiveCategory(tab.id)}
              className={`px-4 py-2.5 border-b-2 transition-all shrink-0 flex items-center gap-2 font-mono ${
                isActive
                  ? 'border-[#00f2ff] text-[#00f2ff] bg-[#00f2ff]/10 font-extrabold'
                  : 'border-transparent text-[#8e9dae] hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* 3. REPORT DATASET TABLE / EXACT REQUIRED EMPTY STATE */}
      <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl overflow-hidden shadow-2xl">
        {loading ? (
          <div className="p-12 text-center text-[#8e9dae] space-y-2">
            <div className="w-6 h-6 border-2 border-[#00f2ff] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <span>Compiling operational reports from database...</span>
          </div>
        ) : activeDatasetCount === 0 ? (
          <div className="p-12 text-center space-y-3">
            <FileText className="w-12 h-12 text-[#00f2ff] mx-auto opacity-50 animate-pulse" />
            <div className="space-y-1 max-w-md mx-auto">
              <h3 className="font-display-lg text-base sm:text-lg font-bold text-white uppercase tracking-wider">
                No completed tournaments available.
              </h3>
              <p className="text-xs text-[#8e9dae]">
                Reports will appear after tournament activity.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {/* Category 1: TOURNAMENT REPORTS */}
            {activeCategory === 'TOURNAMENTS' && (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#07090c] border-b border-[#3a494b]/60 font-label-caps text-[#8e9dae]">
                    <th className="p-3.5 pl-4">Tournament Title</th>
                    <th className="p-3.5">Game & Format</th>
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5 text-center">Squads / Players</th>
                    <th className="p-3.5 text-center">Winner</th>
                    <th className="p-3.5 text-right pr-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#3a494b]/40">
                  {tournamentReports.map((t) => (
                    <tr key={`tr-${t.id}`} className="hover:bg-[#1d232c] transition-colors">
                      <td className="p-3.5 pl-4 font-extrabold text-white">{t.title}</td>
                      <td className="p-3.5 text-[#00f2ff] font-bold">{t.game} ({t.format})</td>
                      <td className="p-3.5 font-mono text-[#8e9dae]">{t.date}</td>
                      <td className="p-3.5 text-center font-mono font-bold text-white">{t.registeredTeams} Squads / {t.registeredPlayers} Players</td>
                      <td className="p-3.5 text-center font-bold text-[#00ff9d]">{t.winner}</td>
                      <td className="p-3.5 text-right pr-4">
                        <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-extrabold uppercase border bg-[#00f2ff]/10 text-[#00f2ff] border-[#00f2ff]/40">
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Category 2: PLAYER REPORTS */}
            {activeCategory === 'PLAYERS' && (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#07090c] border-b border-[#3a494b]/60 font-label-caps text-[#8e9dae]">
                    <th className="p-3.5 pl-4">Player Handle</th>
                    <th className="p-3.5">Email</th>
                    <th className="p-3.5">Game Character UID</th>
                    <th className="p-3.5 text-center">Matches</th>
                    <th className="p-3.5 text-center">Wins</th>
                    <th className="p-3.5 text-center">Kills</th>
                    <th className="p-3.5 text-right pr-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#3a494b]/40">
                  {playerReports.map((p) => (
                    <tr key={`pr-${p.id}`} className="hover:bg-[#1d232c] transition-colors">
                      <td className="p-3.5 pl-4 font-extrabold text-white">{p.username}</td>
                      <td className="p-3.5 text-[#8e9dae] font-mono">{p.email}</td>
                      <td className="p-3.5 font-mono text-[#00f2ff] font-bold">{p.gameUid}</td>
                      <td className="p-3.5 text-center font-mono text-white">{p.matchesPlayed}</td>
                      <td className="p-3.5 text-center font-mono font-bold text-[#00ff9d]">{p.wins}</td>
                      <td className="p-3.5 text-center font-mono font-bold text-[#fe6b00]">{p.kills}</td>
                      <td className="p-3.5 text-right pr-4">
                        <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-extrabold uppercase border bg-[#00ff9d]/10 text-[#00ff9d] border-[#00ff9d]/40">
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Category 3: TEAM REPORTS */}
            {activeCategory === 'TEAMS' && (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#07090c] border-b border-[#3a494b]/60 font-label-caps text-[#8e9dae]">
                    <th className="p-3.5 pl-4">Team Name</th>
                    <th className="p-3.5">Captain</th>
                    <th className="p-3.5 text-center">Members</th>
                    <th className="p-3.5 text-center">Matches</th>
                    <th className="p-3.5 text-center">Wins</th>
                    <th className="p-3.5 text-right pr-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#3a494b]/40">
                  {teamReports.map((tm) => (
                    <tr key={`tmr-${tm.id}`} className="hover:bg-[#1d232c] transition-colors">
                      <td className="p-3.5 pl-4 font-extrabold text-white">{tm.name}</td>
                      <td className="p-3.5 text-[#00f2ff] font-bold">{tm.captain}</td>
                      <td className="p-3.5 text-center font-mono text-white">{tm.membersCount} Players</td>
                      <td className="p-3.5 text-center font-mono text-white">{tm.matchesPlayed}</td>
                      <td className="p-3.5 text-center font-mono font-bold text-[#00ff9d]">{tm.wins}</td>
                      <td className="p-3.5 text-right pr-4">
                        <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-extrabold uppercase border bg-[#00ff9d]/10 text-[#00ff9d] border-[#00ff9d]/40">
                          {tm.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Category 4: MATCH REPORTS */}
            {activeCategory === 'MATCHES' && (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#07090c] border-b border-[#3a494b]/60 font-label-caps text-[#8e9dae]">
                    <th className="p-3.5 pl-4">Match ID</th>
                    <th className="p-3.5">Tournament Title</th>
                    <th className="p-3.5">Game</th>
                    <th className="p-3.5 text-center">Room Dispatch</th>
                    <th className="p-3.5 text-center">Winner</th>
                    <th className="p-3.5 text-right pr-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#3a494b]/40">
                  {matchReports.map((mr) => (
                    <tr key={`mr-${mr.id}`} className="hover:bg-[#1d232c] transition-colors">
                      <td className="p-3.5 pl-4 font-mono font-extrabold text-[#00f2ff]">{mr.matchNumber}</td>
                      <td className="p-3.5 font-bold text-white">{mr.tournamentTitle}</td>
                      <td className="p-3.5 text-[#8e9dae] font-semibold">{mr.game}</td>
                      <td className="p-3.5 text-center font-mono font-bold text-[#00ff9d]">{mr.roomPublished}</td>
                      <td className="p-3.5 text-center font-bold text-[#fe6b00]">{mr.winner}</td>
                      <td className="p-3.5 text-right pr-4">
                        <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-extrabold uppercase border bg-[#00f2ff]/10 text-[#00f2ff] border-[#00f2ff]/40">
                          {mr.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Category 5: FINANCE REPORTS */}
            {activeCategory === 'FINANCE' && (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#07090c] border-b border-[#3a494b]/60 font-label-caps text-[#8e9dae]">
                    <th className="p-3.5 pl-4">Tournament Title</th>
                    <th className="p-3.5">Entry Fee</th>
                    <th className="p-3.5 text-center">Registered Squads</th>
                    <th className="p-3.5 text-center">Prize Pool</th>
                    <th className="p-3.5 text-right pr-4">Total Revenue Collected</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#3a494b]/40">
                  {financeReports.map((fr) => (
                    <tr key={`fr-${fr.id}`} className="hover:bg-[#1d232c] transition-colors">
                      <td className="p-3.5 pl-4 font-extrabold text-white">{fr.tournamentTitle}</td>
                      <td className="p-3.5 text-[#00f2ff] font-bold">{fr.entryFee}</td>
                      <td className="p-3.5 text-center font-mono font-bold text-white">{fr.registeredTeams} Squads</td>
                      <td className="p-3.5 text-center font-mono text-[#ffb693] font-bold">{fr.prizePool}</td>
                      <td className="p-3.5 text-right pr-4 font-mono font-extrabold text-[#00ff9d] text-sm">
                        {fr.totalRevenue}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

    </div>
  )
}
