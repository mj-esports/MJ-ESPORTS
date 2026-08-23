import { useState, useEffect, useMemo } from 'react'
import {
  Award,
  Trophy,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Download,
  Eye,
  Save,
  ShieldCheck,
  Flag,
  CreditCard,
  DollarSign,
  Crown,
  Flame,
  Zap,
  Users,
  Clock,
  Filter,
  Search,
  X,
  ChevronRight,
  Sparkles,
  Lock,
  Unlock,
  AlertCircle,
  ArrowRight,
  RotateCcw,
  Check,
  Layers,
  Activity
} from 'lucide-react'
import { useToast } from '../../../contexts/ToastContext'
import { useAuth } from '../../../contexts/AuthContext'
import { formatTournamentPrize } from '../../../utils/tournamentPrizeUtils'
import LoadingButton from '../../common/LoadingButton'

// Standard Esports Placement Points Table (FF / BGMI standard)
const STANDARD_PLACEMENT_PTS = {
  1: 12, // Booyah / 1st Place
  2: 9,  // 2nd Place
  3: 8,  // 3rd Place
  4: 7,  // 4th Place
  5: 6,  // 5th Place
  6: 5,  // 6th Place
  7: 4,  // 7th Place
  8: 3,  // 8th Place
  9: 2,  // 9th Place
  10: 1, // 10th Place
}

export default function MatchResultsWorkspaceView({
  tournaments = [],
  updateTournamentScores,
  updateTournamentStatus,
  editTournament,
  setActiveTab,
}) {
  const { showSuccess, showError } = useToast()
  const { user } = useAuth()

  // Selected tournament state
  const [selectedTourneyId, setSelectedTourneyId] = useState(tournaments[0]?.id || '')
  const selectedTournament = tournaments.find((t) => String(t.id) === String(selectedTourneyId)) || tournaments[0]

  // Filter & Search
  const [statusFilter, setStatusFilter] = useState('ALL') // 'ALL' | 'PENDING' | 'REVIEW' | 'FINALIZED'
  const [searchQuery, setSearchQuery] = useState('')
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState('SCORE_ENTRY') // 'SCORE_ENTRY' | 'PROVISIONAL_STANDINGS' | 'VERIFICATION'

  // Teams & Scores State
  const [teams, setTeams] = useState([])
  const [isSaving, setIsSaving] = useState(false)
  const [isFinalizing, setIsFinalizing] = useState(false)
  const [isUnlockedForCorrection, setIsUnlockedForCorrection] = useState(false)

  // Modals & Inspection States
  const [showFinalizeModal, setShowFinalizeModal] = useState(false)
  const [flagTargetTeam, setFlagTargetTeam] = useState(null)
  const [flagReason, setFlagReason] = useState('')
  const [viewEvidenceTeam, setViewEvidenceTeam] = useState(null)

  // Local incident / audit log for corrections
  const [auditLogs, setAuditLogs] = useState([
    { id: 'aud-1', time: '18:30:00', event: 'Match concluded in Match Control. Result workspace initialized.', type: 'info' },
  ])

  const adminName = user?.user_metadata?.username || user?.email?.split('@')[0] || 'Admin'

  // Sync selected tournament if none selected
  useEffect(() => {
    if (!selectedTourneyId && tournaments.length > 0) {
      setSelectedTourneyId(tournaments[0].id)
    }
  }, [tournaments, selectedTourneyId])

  // Initialize Team Scores from selected tournament
  useEffect(() => {
    if (selectedTournament) {
      setIsUnlockedForCorrection(false)
      const rawTeams = selectedTournament.teamsList || selectedTournament.teams_list || []
      
      let initialList = rawTeams
      if (!Array.isArray(initialList) || initialList.length === 0) {
        const slotsCount = Number(selectedTournament.registeredTeams || selectedTournament.registered_teams || selectedTournament.maxTeams || 12)
        initialList = Array.from({ length: Math.min(slotsCount, 12) }, (_, idx) => ({
          id: `team-slot-${idx + 1}`,
          name: `Squad #${idx + 1}`,
          captain: `Captain #${idx + 1}`,
          freeFireUid: `UID-${7891200 + idx}`,
          kills: 0,
          placementPoints: STANDARD_PLACEMENT_PTS[idx + 1] || 0,
          bonus: 0,
          points: STANDARD_PLACEMENT_PTS[idx + 1] || 0,
          status: 'PENDING', // 'PENDING' | 'VERIFIED' | 'FLAGGED'
          flagReason: '',
        }))
      }

      const mapped = initialList.map((t, idx) => {
        const kills = Number(t.kills || 0)
        const placementPts = Number(t.placementPoints ?? (STANDARD_PLACEMENT_PTS[idx + 1] || 0))
        const bonus = Number(t.bonus || 0)
        const totalPts = Number(t.points ?? (kills + placementPts + bonus))

        return {
          id: t.id || `team-${idx}`,
          name: t.name || t.teamName || `Squad #${idx + 1}`,
          captain: t.captain || t.captainName || 'Captain',
          freeFireUid: t.freeFireUid || t.captain_uid || 'N/A',
          kills: kills,
          placementPoints: placementPts,
          bonus: bonus,
          points: totalPts,
          status: t.verificationStatus || t.status || 'PENDING',
          flagReason: t.flagReason || '',
          screenshotUrl: t.screenshotUrl || null,
        }
      })

      // Sort by points desc, then kills desc
      setTeams(
        mapped.sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points
          return b.kills - a.kills
        })
      )
    }
  }, [selectedTournament])

  // Automatic Calculation Handler: Total Points = Placement Points + Kills + Bonus
  const handleScoreChange = (teamId, field, value) => {
    const num = Math.max(0, parseInt(value, 10) || 0)

    setTeams((prev) => {
      const updated = prev.map((item) => {
        if (item.id !== teamId) return item

        const updatedTeam = { ...item, [field]: num }
        const kills = field === 'kills' ? num : Number(updatedTeam.kills || 0)
        const placementPts = field === 'placementPoints' ? num : Number(updatedTeam.placementPoints || 0)
        const bonus = field === 'bonus' ? num : Number(updatedTeam.bonus || 0)
        
        // Exact formula: Total Points = Placement Points + Kills + Bonus Points
        updatedTeam.points = kills + placementPts + bonus
        return updatedTeam
      })

      // Re-sort in real time: points desc, then kills desc
      return updated.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points
        return b.kills - a.kills
      })
    })
  }

  // Save Draft Score Changes
  const handleSaveDraft = async () => {
    if (!selectedTournament || isSaving) return
    setIsSaving(true)
    try {
      if (updateTournamentScores) {
        await updateTournamentScores(selectedTournament.id, teams)
      }
      showSuccess(`Draft match scores saved for "${selectedTournament.title}".`, 'Scores Saved')
      addAuditEvent(`Draft scores updated by ${adminName}`)
    } catch (err) {
      showError(err?.message || 'Failed to save scores', 'Save Error')
    } finally {
      setIsSaving(false)
    }
  }

  // Verification Handlers
  const handleVerifyTeam = (teamId) => {
    setTeams((prev) =>
      prev.map((t) => (t.id === teamId ? { ...t, status: 'VERIFIED', flagReason: '' } : t))
    )
    showSuccess('Team result marked as VERIFIED.', 'Verified')
    addAuditEvent(`Team ${teamId} result marked VERIFIED by ${adminName}`)
  }

  const handleMarkAllVerified = () => {
    setTeams((prev) =>
      prev.map((t) => ({ ...t, status: 'VERIFIED', flagReason: '' }))
    )
    showSuccess('All participating squad results marked as VERIFIED.', 'Batch Verification')
    addAuditEvent(`All team scores marked VERIFIED by ${adminName}`)
  }

  const handleOpenFlagModal = (team) => {
    setFlagTargetTeam(team)
    setFlagReason(team.flagReason || '')
  }

  const handleConfirmFlag = () => {
    if (!flagTargetTeam) return
    if (!flagReason.trim()) {
      showError('Please provide a reason for flagging this result.', 'Flagging Notice')
      return
    }

    setTeams((prev) =>
      prev.map((t) =>
        t.id === flagTargetTeam.id
          ? { ...t, status: 'FLAGGED', flagReason: flagReason.trim() }
          : t
      )
    )
    showSuccess(`Result for ${flagTargetTeam.name} flagged with reason: "${flagReason.trim()}".`, 'Result Flagged')
    addAuditEvent(`Team ${flagTargetTeam.name} FLAGGED by ${adminName}: "${flagReason.trim()}"`, 'warning')
    setFlagTargetTeam(null)
    setFlagReason('')
  }

  // Finalize Results Handler
  const handleFinalizeResults = async () => {
    if (!selectedTournament || isFinalizing) return
    setIsFinalizing(true)
    try {
      const winner = teams[0]
      if (updateTournamentScores) {
        await updateTournamentScores(selectedTournament.id, teams)
      }
      if (editTournament) {
        await editTournament(selectedTournament.id, {
          status: 'Completed',
          winnerTeam: winner?.name || 'Grand Champions',
          winnerCaptain: winner?.captain || 'Champion Captain',
          winner_team: winner?.name || 'Grand Champions',
          winner_captain: winner?.captain || 'Champion Captain',
        })
      } else if (updateTournamentStatus) {
        await updateTournamentStatus(selectedTournament.id, 'Completed')
      }

      showSuccess(`Match results officially FINALIZED for ${selectedTournament.title}!`, 'Results Finalized')
      addAuditEvent(`Tournament results FINALIZED & PUBLISHED by ${adminName}`, 'success')
      setShowFinalizeModal(false)
      setActiveWorkspaceTab('PROVISIONAL_STANDINGS')
    } catch (err) {
      showError(err?.message || 'Failed to finalize results', 'Finalization Error')
    } finally {
      setIsFinalizing(false)
    }
  }

  // Add audit log helper
  const addAuditEvent = (eventText, type = 'info') => {
    const logTime = new Date().toLocaleTimeString()
    setAuditLogs((prev) => [
      { id: `aud-${Date.now()}`, time: logTime, event: eventText, type },
      ...prev,
    ])
  }

  // CSV Export Functionality
  const exportCSV = () => {
    if (teams.length === 0) return
    const headers = ['Rank', 'Team Name', 'Captain', 'In-Game UID', 'Placement Points', 'Kills', 'Bonus Points', 'Total Points', 'Status']
    const rows = teams.map((t, idx) => [
      idx + 1,
      `"${t.name}"`,
      `"${t.captain}"`,
      t.freeFireUid,
      t.placementPoints,
      t.kills,
      t.bonus,
      t.points,
      t.status,
    ])
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `standings_${selectedTournament?.title || 'tournament'}_${Date.now()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Summary Metrics calculations across tournaments
  const isSelectedFinalized = selectedTournament?.status === 'Completed' || selectedTournament?.status === 'Prize Distributed'

  const totalVerifiedCount = teams.filter((t) => t.status === 'VERIFIED').length
  const totalPendingCount = teams.filter((t) => t.status === 'PENDING').length
  const totalFlaggedCount = teams.filter((t) => t.status === 'FLAGGED').length
  const isAllVerified = teams.length > 0 && totalPendingCount === 0 && totalFlaggedCount === 0

  // Verification Checklist Conditions
  const checkMatchCompleted = selectedTournament?.status === 'Completed' || selectedTournament?.status === 'Prize Distributed' || selectedTournament?.status === 'Live Now'
  const checkTeamsIdentified = teams.length > 0
  const checkPlacementEntered = teams.every((t) => t.placementPoints !== undefined && t.placementPoints !== null)
  const checkKillsEntered = teams.every((t) => t.kills !== undefined && t.kills !== null)
  const checkScoringCalculated = teams.every((t) => t.points === (Number(t.placementPoints) + Number(t.kills) + Number(t.bonus)))
  const checkNoDuplicateTeams = new Set(teams.map((t) => t.name.toLowerCase().trim())).size === teams.length
  const checkStandingsSorted = teams.every((t, i) => i === 0 || teams[i - 1].points >= t.points)

  const verificationChecklist = [
    { id: 'c1', label: 'Match completed or concluded in Match Control', passed: checkMatchCompleted },
    { id: 'c2', label: 'All participating teams identified in roster', passed: checkTeamsIdentified },
    { id: 'c3', label: 'Placement points assigned to all teams', passed: checkPlacementEntered },
    { id: 'c4', label: 'Kill counts recorded for all teams', passed: checkKillsEntered },
    { id: 'c5', label: 'Scoring formula validated (Placement + Kills + Bonus)', passed: checkScoringCalculated },
    { id: 'c6', label: 'No duplicate team or roster records detected', passed: checkNoDuplicateTeams },
    { id: 'c7', label: 'Provisional standings calculation verified', passed: checkStandingsSorted },
  ]

  const allChecklistPassed = verificationChecklist.every((c) => c.passed) && totalFlaggedCount === 0

  // Overall Operational Metrics derived from actual tournaments
  const overviewMetrics = useMemo(() => {
    let pendingReview = 0
    let inReview = 0
    let finalized = 0
    let disputed = 0

    tournaments.forEach((t) => {
      const s = (t.status || '').toLowerCase()
      const tList = t.teamsList || t.teams_list || []
      const hasFlags = Array.isArray(tList) && tList.some((team) => team.status === 'FLAGGED')

      if (hasFlags) {
        disputed += 1
      }
      if (s === 'completed' || s === 'prize distributed') {
        finalized += 1
      } else if (s === 'live now') {
        inReview += 1
      } else {
        pendingReview += 1
      }
    })

    return { pendingReview, inReview, finalized, disputed }
  }, [tournaments])

  // Filtered Results Queue
  const resultsQueue = useMemo(() => {
    return tournaments
      .filter((t) => {
        if (statusFilter === 'ALL') return true
        const s = (t.status || '').toLowerCase()
        const tList = t.teamsList || t.teams_list || []
        const hasFlags = Array.isArray(tList) && tList.some((team) => team.status === 'FLAGGED')

        if (statusFilter === 'FINALIZED') return s === 'completed' || s === 'prize distributed'
        if (statusFilter === 'REVIEW') return hasFlags || s === 'live now'
        if (statusFilter === 'PENDING') return s !== 'completed' && s !== 'prize distributed'
        return true
      })
      .map((t, idx) => {
        const s = (t.status || '').toLowerCase()
        const tList = t.teamsList || t.teams_list || []
        const hasFlags = Array.isArray(tList) && tList.some((team) => team.status === 'FLAGGED')

        let resultStatus = 'PENDING REVIEW'
        if (s === 'completed' || s === 'prize distributed') {
          resultStatus = 'FINALIZED'
        } else if (hasFlags) {
          resultStatus = 'DISPUTED'
        } else if (s === 'live now' || tList.length > 0) {
          resultStatus = 'IN REVIEW'
        }

        const isSelected = String(t.id) === String(selectedTourneyId)

        return {
          id: t.id,
          matchId: `MATCH_${String(idx + 1).padStart(3, '0')}`,
          tournament: t.title,
          game: t.game || 'Free Fire MAX',
          format: t.format || t.matchFormat || 'Squad (4P)',
          teamsCount: t.registeredTeams || t.registered_teams || 12,
          matchTime: `${t.startDate || 'Today'} ${t.startTime ? '• ' + t.startTime : ''}`,
          resultStatus,
          isSelected,
          raw: t,
        }
      })
  }, [tournaments, statusFilter, selectedTourneyId])

  // Finalized Results History List
  const finalizedHistory = useMemo(() => {
    return tournaments
      .filter((t) => t.status === 'Completed' || t.status === 'Prize Distributed')
      .map((t, idx) => ({
        id: t.id,
        matchId: `MATCH_${String(idx + 1).padStart(3, '0')}`,
        tournament: t.title,
        finalizedAt: t.updatedAt || t.updated_at ? new Date(t.updatedAt || t.updated_at).toLocaleDateString() : 'Recent',
        finalizedBy: 'Authorized Admin',
        status: 'FINALIZED',
      }))
  }, [tournaments])

  // Filtered scoring table
  const filteredTeams = useMemo(() => {
    return teams.filter((t) => {
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase()
      return (
        t.name.toLowerCase().includes(q) ||
        t.captain.toLowerCase().includes(q) ||
        t.freeFireUid.toLowerCase().includes(q)
      )
    })
  }, [teams, searchQuery])

  return (
    <div className="space-y-6 font-body antialiased">

      {/* 1. PAGE HEADER */}
      <div className="bg-[#141416] border border-[#27272a] rounded-lg p-5 sm:p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-headline font-bold text-[#00f2ff] uppercase tracking-wider mb-1.5">
            <Award className="w-4 h-4" />
            <span>RESULTS CONSOLE</span>
          </div>
          <h1 className="font-headline text-2xl sm:text-3xl font-extrabold text-white uppercase tracking-tight">
            RESULTS & STANDINGS
          </h1>
          <p className="text-xs sm:text-sm text-[#849495] font-body mt-1 max-w-2xl">
            Verify completed matches, calculate standings, finalize tournament results and prepare verified winners for payout.
          </p>
        </div>

        {/* Header Controls: Tournament Selector & Status Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
          <div className="space-y-1">
            <label className="text-[10px] font-headline font-bold text-[#849495] uppercase tracking-wider block">
              Active Tournament:
            </label>
            <select
              value={selectedTourneyId}
              onChange={(e) => setSelectedTourneyId(e.target.value)}
              className="w-full sm:w-auto px-3.5 py-2 bg-[#1c1b1c] border border-[#27272a] rounded-lg text-xs font-headline font-bold text-[#00f2ff] focus:outline-none focus:border-[#00f2ff] cursor-pointer min-w-[220px]"
            >
              {tournaments.map((t) => (
                <option key={`res-t-${t.id}`} value={t.id}>{t.title}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-headline font-bold text-[#849495] uppercase tracking-wider block">
              Result Status Filter:
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 bg-[#1c1b1c] border border-[#27272a] rounded-lg text-xs font-headline font-bold text-white focus:outline-none focus:border-[#00f2ff] cursor-pointer"
            >
              <option value="ALL">ALL STATUSES</option>
              <option value="PENDING">PENDING ONLY</option>
              <option value="REVIEW">IN REVIEW</option>
              <option value="FINALIZED">FINALIZED ONLY</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2. RESULTS OVERVIEW (OPERATIONAL METRICS) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* PENDING REVIEW */}
        <div className="bg-[#141416] border border-[#27272a] rounded-lg p-4 shadow-xl space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-headline font-bold text-[#849495] uppercase tracking-wider">
              PENDING REVIEW
            </span>
            <Clock className="w-4 h-4 text-[#fed83a]" />
          </div>
          <p className="font-headline text-2xl font-extrabold text-[#fed83a]">
            {overviewMetrics.pendingReview}
          </p>
          <span className="text-[10px] font-body text-[#849495] block">
            Awaiting score entry & audit
          </span>
        </div>

        {/* IN REVIEW */}
        <div className="bg-[#141416] border border-[#27272a] rounded-lg p-4 shadow-xl space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-headline font-bold text-[#849495] uppercase tracking-wider">
              IN REVIEW
            </span>
            <Activity className="w-4 h-4 text-[#00f2ff]" />
          </div>
          <p className="font-headline text-2xl font-extrabold text-[#00f2ff]">
            {overviewMetrics.inReview}
          </p>
          <span className="text-[10px] font-body text-[#849495] block">
            Actively verifying scoring
          </span>
        </div>

        {/* FINALIZED */}
        <div className="bg-[#141416] border border-[#27272a] rounded-lg p-4 shadow-xl space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-headline font-bold text-[#849495] uppercase tracking-wider">
              FINALIZED
            </span>
            <CheckCircle2 className="w-4 h-4 text-[#10b981]" />
          </div>
          <p className="font-headline text-2xl font-extrabold text-[#10b981]">
            {overviewMetrics.finalized}
          </p>
          <span className="text-[10px] font-body text-[#849495] block">
            Published authoritative results
          </span>
        </div>

        {/* DISPUTED */}
        <div className="bg-[#141416] border border-[#27272a] rounded-lg p-4 shadow-xl space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-headline font-bold text-[#849495] uppercase tracking-wider">
              DISPUTED
            </span>
            <AlertTriangle className="w-4 h-4 text-[#ff5e07]" />
          </div>
          <p className="font-headline text-2xl font-extrabold text-[#ff5e07]">
            {overviewMetrics.disputed}
          </p>
          <span className="text-[10px] font-body text-[#849495] block">
            Flagged for review
          </span>
        </div>
      </div>

      {/* 3. RESULTS QUEUE */}
      <div className="bg-[#141416] border border-[#27272a] rounded-lg p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#27272a] pb-4">
          <div>
            <h2 className="font-headline text-base sm:text-lg font-extrabold text-white uppercase tracking-tight flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#00f2ff]" />
              <span>RESULTS QUEUE</span>
            </h2>
            <p className="text-xs text-[#849495] font-body mt-0.5">
              Select a match to load its scorecard into the Result Verification Workspace.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-[#849495]">
              Showing {resultsQueue.length} Matches
            </span>
          </div>
        </div>

        {/* Results Queue Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#27272a] text-[10px] font-headline font-extrabold text-[#849495] uppercase tracking-wider">
                <th className="py-3 px-3">MATCH</th>
                <th className="py-3 px-3">TOURNAMENT</th>
                <th className="py-3 px-3">GAME / FORMAT</th>
                <th className="py-3 px-3">TEAMS</th>
                <th className="py-3 px-3">MATCH TIME</th>
                <th className="py-3 px-3">RESULT STATUS</th>
                <th className="py-3 px-3 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#27272a] text-xs font-body">
              {resultsQueue.map((item) => (
                <tr
                  key={`res-q-row-${item.id}`}
                  className={`transition-colors ${
                    item.isSelected
                      ? 'bg-[#00f2ff]/5 hover:bg-[#00f2ff]/10'
                      : 'hover:bg-[#1c1b1c]'
                  }`}
                >
                  <td className="py-3 px-3 font-mono font-bold text-[#00f2ff]">
                    {item.matchId}
                  </td>
                  <td className="py-3 px-3 font-headline font-bold text-white max-w-[200px] truncate">
                    {item.tournament}
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-headline font-bold text-[#b9cacb] block">
                      {item.game}
                    </span>
                    <span className="text-[#849495] text-[11px]">
                      {item.format}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono text-white">
                    {item.teamsCount} Teams
                  </td>
                  <td className="py-3 px-3 text-[11px] text-[#849495]">
                    {item.matchTime}
                  </td>
                  <td className="py-3 px-3">
                    <span className={`px-2.5 py-0.5 rounded text-[10px] font-headline font-bold uppercase border ${
                      item.resultStatus === 'FINALIZED'
                        ? 'bg-[#10b981]/15 text-[#10b981] border-[#10b981]/40'
                        : item.resultStatus === 'DISPUTED'
                        ? 'bg-[#ff5e07]/15 text-[#ff5e07] border-[#ff5e07]/40'
                        : item.resultStatus === 'IN REVIEW'
                        ? 'bg-[#00f2ff]/15 text-[#00f2ff] border-[#00f2ff]/40'
                        : 'bg-[#fed83a]/15 text-[#fed83a] border-[#fed83a]/40'
                    }`}>
                      {item.resultStatus}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => {
                        setSelectedTourneyId(item.id)
                        showSuccess(`Loaded ${item.tournament} into Verification Workspace.`, 'Result Loaded')
                      }}
                      className={`px-3.5 py-1.5 rounded text-xs font-headline font-extrabold uppercase transition-all cursor-pointer ${
                        item.isSelected
                          ? 'bg-[#00f2ff] text-[#00363a] shadow-[0_0_12px_rgba(0,242,255,0.4)]'
                          : 'bg-[#1c1b1c] hover:bg-[#27272a] text-white border border-[#27272a]'
                      }`}
                    >
                      {item.resultStatus === 'FINALIZED' ? 'VIEW' : 'REVIEW'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. RESULT WORKSPACE (ACTIVE MATCH HEADER) */}
      <div className="bg-[#141416] border border-[#27272a] rounded-lg p-5 sm:p-6 shadow-xl space-y-5">
        
        {/* Workspace Top Row */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#27272a] pb-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 bg-[#00f2ff]/10 text-[#00f2ff] border border-[#00f2ff]/30 rounded text-[10px] font-headline font-bold uppercase">
                MATCH_001
              </span>
              <span className="px-2.5 py-0.5 bg-[#1c1b1c] text-white border border-[#27272a] rounded text-[10px] font-headline font-bold uppercase">
                {selectedTournament?.game || 'Free Fire MAX'}
              </span>
              <span className="px-2.5 py-0.5 bg-[#1c1b1c] text-[#849495] border border-[#27272a] rounded text-[10px] font-headline font-bold uppercase">
                {selectedTournament?.mode ? selectedTournament.mode.toUpperCase() : selectedTournament?.format || 'SQUAD (4P)'}
              </span>
              <span className="px-2.5 py-0.5 bg-[#1c1b1c] text-[#10b981] border border-[#10b981]/30 rounded text-[10px] font-mono font-bold uppercase">
                {teams.length} TEAMS IN SCORESHEET
              </span>
            </div>

            <h2 className="font-headline text-xl sm:text-2xl font-extrabold text-white uppercase tracking-tight">
              {selectedTournament?.title || 'Selected Tournament Result Workspace'}
            </h2>
            <p className="text-xs text-[#849495] font-body mt-0.5">
              Match Status: <strong className="text-white">{selectedTournament?.status || 'Completed'}</strong> &bull; Schedule: {selectedTournament?.startDate || 'Today'} {selectedTournament?.startTime}
            </p>
          </div>

          {/* Handoff from Match Control Banner */}
          <div className="p-3 bg-[#00f2ff]/5 border border-[#00f2ff]/20 rounded-lg flex items-center gap-3 shrink-0">
            <CheckCircle2 className="w-5 h-5 text-[#00f2ff] shrink-0" />
            <div>
              <span className="font-headline text-xs font-bold text-white uppercase tracking-wider block">
                HANDED OFF FROM MATCH CONTROL
              </span>
              <span className="text-[11px] text-[#849495] font-body block">
                Live custom room closed &bull; Scoring workspace active
              </span>
            </div>
          </div>
        </div>

        {/* Workspace Tab Switcher: Score Entry, Provisional Standings, Verification */}
        <div className="flex items-center gap-2 border-b border-[#27272a] pb-3">
          <button
            onClick={() => setActiveWorkspaceTab('SCORE_ENTRY')}
            className={`px-4 py-2 rounded-lg text-xs font-headline font-bold uppercase transition-all cursor-pointer ${
              activeWorkspaceTab === 'SCORE_ENTRY'
                ? 'bg-[#00f2ff] text-[#00363a] shadow-[0_0_12px_rgba(0,242,255,0.3)]'
                : 'bg-[#1c1b1c] text-[#849495] hover:text-white border border-[#27272a]'
            }`}
          >
            1. SCORE ENTRY & VERIFICATION
          </button>

          <button
            onClick={() => setActiveWorkspaceTab('PROVISIONAL_STANDINGS')}
            className={`px-4 py-2 rounded-lg text-xs font-headline font-bold uppercase transition-all cursor-pointer ${
              activeWorkspaceTab === 'PROVISIONAL_STANDINGS'
                ? 'bg-[#00f2ff] text-[#00363a] shadow-[0_0_12px_rgba(0,242,255,0.3)]'
                : 'bg-[#1c1b1c] text-[#849495] hover:text-white border border-[#27272a]'
            }`}
          >
            2. PROVISIONAL STANDINGS PREVIEW
          </button>
        </div>

        {/* TAB CONTENT: 1. SCORE ENTRY & VERIFICATION */}
        {activeWorkspaceTab === 'SCORE_ENTRY' && (
          <div className="space-y-6">
            
            {/* Search & Actions Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-[#849495] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter team name or captain UID..."
                  className="w-full pl-9 pr-3.5 py-2 bg-[#1c1b1c] border border-[#27272a] rounded-lg text-xs text-white placeholder-[#849495] focus:outline-none focus:border-[#00f2ff]"
                />
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                <button
                  onClick={handleMarkAllVerified}
                  disabled={isSelectedFinalized && !isUnlockedForCorrection}
                  className="px-3.5 py-2 bg-[#1c1b1c] hover:bg-[#27272a] text-[#10b981] border border-[#10b981]/30 rounded-lg text-xs font-headline font-bold uppercase transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Verify All Teams</span>
                </button>

                <LoadingButton
                  onClick={handleSaveDraft}
                  loading={isSaving}
                  loadingText="Saving..."
                  disabled={isSelectedFinalized && !isUnlockedForCorrection}
                  variant="secondary"
                  className="px-4 py-2 bg-[#1c1b1c] text-white hover:bg-[#27272a] border border-[#27272a] rounded-lg text-xs font-headline font-bold uppercase"
                >
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  <span>Save Draft Scores</span>
                </LoadingButton>
              </div>
            </div>

            {/* Main Scoring Table */}
            <div className="overflow-x-auto border border-[#27272a] rounded-lg">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#1c1b1c] text-[10px] font-headline font-extrabold text-[#849495] uppercase tracking-wider border-b border-[#27272a]">
                    <th className="py-3 px-3 w-12 text-center">RANK</th>
                    <th className="py-3 px-3">TEAM & CAPTAIN</th>
                    <th className="py-3 px-3">PLAYERS / UID</th>
                    <th className="py-3 px-3 w-28">PLACEMENT</th>
                    <th className="py-3 px-3 w-24">KILLS</th>
                    <th className="py-3 px-3 w-24">BONUS</th>
                    <th className="py-3 px-3 w-28 text-center">TOTAL POINTS</th>
                    <th className="py-3 px-3 w-28">STATUS</th>
                    <th className="py-3 px-3 text-right">VERIFY / FLAG</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#27272a] text-xs font-body bg-[#141416]">
                  {filteredTeams.map((team, idx) => {
                    const isTopThree = idx < 3
                    const isFinalized = isSelectedFinalized && !isUnlockedForCorrection

                    return (
                      <tr
                        key={`team-score-row-${team.id}`}
                        className={`transition-colors ${
                          team.status === 'FLAGGED'
                            ? 'bg-red-950/20 hover:bg-red-950/30'
                            : team.status === 'VERIFIED'
                            ? 'bg-[#10b981]/5 hover:bg-[#10b981]/10'
                            : 'hover:bg-[#1c1b1c]'
                        }`}
                      >
                        {/* RANK */}
                        <td className="py-3 px-3 text-center">
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-headline font-extrabold text-xs ${
                            idx === 0
                              ? 'bg-[#ffd700]/20 text-[#ffd700] border border-[#ffd700]/50'
                              : idx === 1
                              ? 'bg-[#c0c0c0]/20 text-[#c0c0c0] border border-[#c0c0c0]/50'
                              : idx === 2
                              ? 'bg-[#cd7f32]/20 text-[#cd7f32] border border-[#cd7f32]/50'
                              : 'text-[#849495]'
                          }`}>
                            {idx + 1}
                          </span>
                        </td>

                        {/* TEAM */}
                        <td className="py-3 px-3">
                          <span className="font-headline font-bold text-white text-sm block">
                            {team.name}
                          </span>
                          <span className="text-[11px] text-[#849495]">
                            Captain: {team.captain}
                          </span>
                        </td>

                        {/* PLAYERS / UID */}
                        <td className="py-3 px-3 font-mono text-[11px] text-[#00f2ff]">
                          {team.freeFireUid}
                        </td>

                        {/* PLACEMENT */}
                        <td className="py-3 px-3">
                          <input
                            type="number"
                            min="0"
                            value={team.placementPoints}
                            onChange={(e) => handleScoreChange(team.id, 'placementPoints', e.target.value)}
                            disabled={isFinalized}
                            className="w-20 px-2.5 py-1.5 bg-[#1c1b1c] border border-[#27272a] rounded text-xs font-mono font-bold text-white text-center focus:outline-none focus:border-[#00f2ff] disabled:opacity-50"
                          />
                        </td>

                        {/* KILLS */}
                        <td className="py-3 px-3">
                          <input
                            type="number"
                            min="0"
                            value={team.kills}
                            onChange={(e) => handleScoreChange(team.id, 'kills', e.target.value)}
                            disabled={isFinalized}
                            className="w-16 px-2 py-1.5 bg-[#1c1b1c] border border-[#27272a] rounded text-xs font-mono font-bold text-[#ff5e07] text-center focus:outline-none focus:border-[#ff5e07] disabled:opacity-50"
                          />
                        </td>

                        {/* BONUS */}
                        <td className="py-3 px-3">
                          <input
                            type="number"
                            min="0"
                            value={team.bonus}
                            onChange={(e) => handleScoreChange(team.id, 'bonus', e.target.value)}
                            disabled={isFinalized}
                            className="w-16 px-2 py-1.5 bg-[#1c1b1c] border border-[#27272a] rounded text-xs font-mono font-bold text-[#fed83a] text-center focus:outline-none focus:border-[#fed83a] disabled:opacity-50"
                          />
                        </td>

                        {/* TOTAL POINTS */}
                        <td className="py-3 px-3 text-center">
                          <span className="font-headline font-extrabold text-base text-[#00f2ff]">
                            {team.points}
                          </span>
                        </td>

                        {/* STATUS */}
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-headline font-bold uppercase border ${
                            team.status === 'VERIFIED'
                              ? 'bg-[#10b981]/15 text-[#10b981] border-[#10b981]/40'
                              : team.status === 'FLAGGED'
                              ? 'bg-red-950/40 text-red-400 border-red-800'
                              : 'bg-[#fed83a]/15 text-[#fed83a] border-[#fed83a]/40'
                          }`}>
                            {team.status}
                          </span>
                          {team.flagReason && (
                            <span className="text-[10px] text-red-400 block mt-0.5 truncate max-w-[120px]">
                              {team.flagReason}
                            </span>
                          )}
                        </td>

                        {/* ACTIONS */}
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleVerifyTeam(team.id)}
                              disabled={isFinalized}
                              className="p-1.5 rounded bg-[#1c1b1c] hover:bg-[#10b981]/20 text-[#10b981] border border-[#27272a] hover:border-[#10b981]/40 cursor-pointer disabled:opacity-40"
                              title="Mark Verified"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleOpenFlagModal(team)}
                              disabled={isFinalized}
                              className="p-1.5 rounded bg-[#1c1b1c] hover:bg-red-950/40 text-red-400 border border-[#27272a] hover:border-red-800 cursor-pointer disabled:opacity-40"
                              title="Flag Result"
                            >
                              <Flag className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* SCORING RULES & VERIFICATION CHECKLIST DUAL CARDS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* CARD A: SCORING RULES */}
              <div className="bg-[#1c1b1c] border border-[#27272a] rounded-lg p-5 space-y-3.5 shadow-xl">
                <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
                  <h3 className="font-headline text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                    <Zap className="w-4 h-4 text-[#00f2ff]" />
                    <span>CONFIGURED SCORING RULES</span>
                  </h3>
                  <span className="text-[10px] font-mono text-[#00f2ff] uppercase font-bold">Standard Match Matrix</span>
                </div>

                <div className="space-y-2 text-xs font-body">
                  <div className="flex justify-between p-2 rounded bg-[#141416] border border-[#27272a]">
                    <span className="text-[#849495]">Placement Points Scale</span>
                    <span className="text-white font-mono font-bold">1st: 12 &bull; 2nd: 9 &bull; 3rd: 8 &bull; 4th: 7 &bull; 5th: 6</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-[#141416] border border-[#27272a]">
                    <span className="text-[#849495]">Kill Points Rate</span>
                    <span className="text-[#ff5e07] font-mono font-bold">1 Pt per verified elimination</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-[#141416] border border-[#27272a]">
                    <span className="text-[#849495]">Bonus Points</span>
                    <span className="text-[#fed83a] font-mono font-bold">Objective / Special Host Bonus</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-[#141416] border border-[#27272a]">
                    <span className="text-[#849495]">Calculation Formula</span>
                    <span className="text-[#00f2ff] font-headline font-bold uppercase">Total = Placement + Kills + Bonus</span>
                  </div>
                </div>
              </div>

              {/* CARD B: SCORE VERIFICATION CHECKLIST */}
              <div className="bg-[#1c1b1c] border border-[#27272a] rounded-lg p-5 space-y-3.5 shadow-xl">
                <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
                  <h3 className="font-headline text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#10b981]" />
                    <span>SCORE VERIFICATION CHECKLIST</span>
                  </h3>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-headline font-bold uppercase border ${
                    allChecklistPassed
                      ? 'bg-[#10b981]/15 text-[#10b981] border-[#10b981]/40'
                      : 'bg-[#ff5e07]/15 text-[#ff5e07] border-[#ff5e07]/40'
                  }`}>
                    {allChecklistPassed ? 'READY FOR FINALIZATION' : 'VERIFICATION REQUIRED'}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs font-body">
                  {verificationChecklist.map((c) => (
                    <div key={c.id} className="flex items-center gap-2.5 py-1">
                      {c.passed ? (
                        <CheckCircle2 className="w-4 h-4 text-[#10b981] shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-[#ff5e07] shrink-0" />
                      )}
                      <span className={c.passed ? 'text-[#b9cacb]' : 'text-[#ff5e07] font-medium'}>
                        {c.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* TAB CONTENT: 2. PROVISIONAL STANDINGS PREVIEW */}
        {activeWorkspaceTab === 'PROVISIONAL_STANDINGS' && (
          <div className="space-y-6">
            
            {/* Grand Champions Podium Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              
              {/* 2nd Place Silver */}
              {teams[1] && (
                <div className="p-4 bg-[#1c1b1c] border border-[#c0c0c0]/30 rounded-lg text-center space-y-2 shadow-xl">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#c0c0c0]/20 text-[#c0c0c0] font-headline font-extrabold text-sm border border-[#c0c0c0]/40">
                    2
                  </span>
                  <h4 className="font-headline font-extrabold text-white text-base truncate">{teams[1].name}</h4>
                  <p className="text-xs text-[#849495]">Captain: {teams[1].captain}</p>
                  <p className="font-headline text-lg font-extrabold text-[#c0c0c0]">{teams[1].points} PTS</p>
                  <span className="text-[10px] text-[#849495] block">{teams[1].kills} Kills &bull; {teams[1].placementPoints} Placement</span>
                </div>
              )}

              {/* 1st Place Gold Champion */}
              {teams[0] && (
                <div className="p-5 bg-[#1c1b1c] border-2 border-[#ffd700]/50 rounded-lg text-center space-y-2.5 shadow-2xl relative order-first sm:order-none">
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[#ffd700]/20 text-[#ffd700] font-headline font-extrabold text-base border border-[#ffd700]/60 shadow-[0_0_15px_rgba(255,215,0,0.3)]">
                    <Crown className="w-5 h-5" />
                  </div>
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-headline font-extrabold bg-[#ffd700]/15 text-[#ffd700] border border-[#ffd700]/40 uppercase block mx-auto w-max">
                    GRAND CHAMPION
                  </span>
                  <h3 className="font-headline font-extrabold text-white text-lg truncate">{teams[0].name}</h3>
                  <p className="text-xs text-[#849495]">Captain: {teams[0].captain}</p>
                  <p className="font-headline text-2xl font-extrabold text-[#ffd700]">{teams[0].points} PTS</p>
                  <span className="text-[11px] text-[#849495] block">{teams[0].kills} Kills &bull; {teams[0].placementPoints} Placement</span>
                </div>
              )}

              {/* 3rd Place Bronze */}
              {teams[2] && (
                <div className="p-4 bg-[#1c1b1c] border border-[#cd7f32]/30 rounded-lg text-center space-y-2 shadow-xl">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#cd7f32]/20 text-[#cd7f32] font-headline font-extrabold text-sm border border-[#cd7f32]/40">
                    3
                  </span>
                  <h4 className="font-headline font-extrabold text-white text-base truncate">{teams[2].name}</h4>
                  <p className="text-xs text-[#849495]">Captain: {teams[2].captain}</p>
                  <p className="font-headline text-lg font-extrabold text-[#cd7f32]">{teams[2].points} PTS</p>
                  <span className="text-[10px] text-[#849495] block">{teams[2].kills} Kills &bull; {teams[2].placementPoints} Placement</span>
                </div>
              )}

            </div>

            {/* Standings Table Header & Download Action */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#27272a] pb-3">
              <div>
                <h3 className="font-headline text-base font-extrabold text-white uppercase tracking-tight flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-[#ffd700]" />
                  <span>PROVISIONAL STANDINGS</span>
                </h3>
                <p className="text-xs text-[#849495] font-body mt-0.5">
                  Provisional rankings &bull; Results become authoritative once finalized below.
                </p>
              </div>

              <button
                onClick={exportCSV}
                className="px-4 py-2 bg-[#1c1b1c] hover:bg-[#27272a] text-[#00f2ff] border border-[#27272a] rounded-lg text-xs font-headline font-bold uppercase transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <Download className="w-3.5 h-3.5" />
                <span>DOWNLOAD CSV</span>
              </button>
            </div>

            {/* Provisional Standings Table */}
            <div className="overflow-x-auto border border-[#27272a] rounded-lg">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#1c1b1c] text-[10px] font-headline font-extrabold text-[#849495] uppercase tracking-wider border-b border-[#27272a]">
                    <th className="py-3 px-3 w-14 text-center">RANK</th>
                    <th className="py-3 px-3">TEAM</th>
                    <th className="py-3 px-3 text-center">MATCHES</th>
                    <th className="py-3 px-3 text-center">PLACEMENT POINTS</th>
                    <th className="py-3 px-3 text-center">KILL POINTS</th>
                    <th className="py-3 px-3 text-center">BONUS</th>
                    <th className="py-3 px-3 text-center font-bold text-white">TOTAL</th>
                    <th className="py-3 px-3 text-right">TREND</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#27272a] text-xs font-body bg-[#141416]">
                  {teams.map((team, idx) => (
                    <tr key={`standings-row-${team.id}`} className="hover:bg-[#1c1b1c] transition-colors">
                      <td className="py-3 px-3 text-center font-headline font-bold text-white">
                        #{idx + 1}
                      </td>
                      <td className="py-3 px-3 font-headline font-bold text-white">
                        {team.name}
                        <span className="text-[11px] font-body text-[#849495] block">
                          Captain: {team.captain}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-white">
                        1
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-white">
                        {team.placementPoints}
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-[#ff5e07]">
                        {team.kills}
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-[#fed83a]">
                        {team.bonus}
                      </td>
                      <td className="py-3 px-3 text-center font-headline font-extrabold text-base text-[#00f2ff]">
                        {team.points}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-headline font-bold uppercase border ${
                          idx === 0
                            ? 'bg-[#ffd700]/15 text-[#ffd700] border-[#ffd700]/40'
                            : idx < 3
                            ? 'bg-[#00f2ff]/15 text-[#00f2ff] border-[#00f2ff]/40'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}>
                          {idx === 0 ? 'CHAMPION' : idx < 3 ? 'PODIUM' : 'RANKED'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        )}

      </div>

      {/* 5. FINALIZE RESULT & CORRECTION CONTROLS */}
      <div className="bg-[#141416] border border-[#27272a] rounded-lg p-5 sm:p-6 shadow-xl space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#27272a] pb-4">
          <div>
            <h3 className="font-headline text-base sm:text-lg font-extrabold text-white uppercase tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#10b981]" />
              <span>FINALIZE & PUBLISH RESULTS</span>
            </h3>
            <p className="text-xs text-[#849495] font-body mt-0.5">
              Confirming finalization locks standings and authorizes downstream Finance prize disbursements.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isSelectedFinalized && (
              <button
                onClick={() => setIsUnlockedForCorrection(!isUnlockedForCorrection)}
                className="px-4 py-2.5 bg-[#1c1b1c] hover:bg-[#27272a] text-[#ff5e07] border border-[#ff5e07]/40 rounded-lg text-xs font-headline font-bold uppercase transition-colors cursor-pointer flex items-center gap-1.5"
              >
                {isUnlockedForCorrection ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                <span>{isUnlockedForCorrection ? 'Lock Scores' : 'Unlock for Correction'}</span>
              </button>
            )}

            <button
              onClick={() => setShowFinalizeModal(true)}
              disabled={!allChecklistPassed || (isSelectedFinalized && !isUnlockedForCorrection)}
              className="px-6 py-2.5 bg-[#10b981] hover:bg-[#10b981]/90 text-slate-950 font-headline font-extrabold text-xs uppercase rounded-lg transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-slate-950" />
              <span>FINALIZE & PUBLISH</span>
            </button>
          </div>
        </div>

        {/* Finalization Status Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 bg-[#1c1b1c] border border-[#27272a] rounded-lg space-y-1">
            <span className="text-[10px] font-headline font-bold text-[#849495] uppercase">Result Status</span>
            <p className="font-headline font-extrabold text-sm uppercase text-white">
              {isSelectedFinalized ? 'FINALIZED' : isAllVerified ? 'VERIFIED' : 'IN REVIEW'}
            </p>
          </div>

          <div className="p-3.5 bg-[#1c1b1c] border border-[#27272a] rounded-lg space-y-1">
            <span className="text-[10px] font-headline font-bold text-[#849495] uppercase">Standings Status</span>
            <p className="font-headline font-extrabold text-sm uppercase text-[#10b981]">
              {allChecklistPassed ? 'READY FOR FINALIZATION' : 'CALCULATION PENDING'}
            </p>
          </div>

          <div className="p-3.5 bg-[#1c1b1c] border border-[#27272a] rounded-lg space-y-1">
            <span className="text-[10px] font-headline font-bold text-[#849495] uppercase">Payout Handoff</span>
            <p className="font-headline font-extrabold text-sm uppercase text-[#00f2ff]">
              {isSelectedFinalized ? 'READY FOR FINANCE' : 'PENDING FINALIZATION'}
            </p>
          </div>
        </div>
      </div>

      {/* 6. RESULT HISTORY TABLE */}
      <div className="bg-[#141416] border border-[#27272a] rounded-lg p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
          <div>
            <h3 className="font-headline text-base font-extrabold text-white uppercase tracking-tight flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#00f2ff]" />
              <span>RESULT HISTORY</span>
            </h3>
            <p className="text-xs text-[#849495] font-body mt-0.5">
              Historical log of authoritative finalized tournament outcomes.
            </p>
          </div>
          <span className="text-xs font-mono text-[#849495]">
            {finalizedHistory.length} Finalized Records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#27272a] text-[10px] font-headline font-extrabold text-[#849495] uppercase tracking-wider">
                <th className="py-3 px-3">MATCH</th>
                <th className="py-3 px-3">TOURNAMENT</th>
                <th className="py-3 px-3">FINALIZED AT</th>
                <th className="py-3 px-3">FINALIZED BY</th>
                <th className="py-3 px-3">STATUS</th>
                <th className="py-3 px-3 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#27272a] text-xs font-body">
              {finalizedHistory.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-xs text-[#849495] italic font-body">
                    No finalized results yet. Finalize an active tournament match to record history.
                  </td>
                </tr>
              ) : (
                finalizedHistory.map((item) => (
                  <tr key={`hist-${item.id}`} className="hover:bg-[#1c1b1c] transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-[#00f2ff]">{item.matchId}</td>
                    <td className="py-3 px-3 font-headline font-bold text-white">{item.tournament}</td>
                    <td className="py-3 px-3 text-[#849495]">{item.finalizedAt}</td>
                    <td className="py-3 px-3 text-[#b9cacb] font-mono">{item.finalizedBy}</td>
                    <td className="py-3 px-3">
                      <span className="px-2.5 py-0.5 rounded text-[10px] font-headline font-bold bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/40 uppercase">
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => setSelectedTourneyId(item.id)}
                        className="px-3 py-1 bg-[#1c1b1c] hover:bg-[#27272a] text-white border border-[#27272a] rounded text-xs font-headline font-bold uppercase transition-colors cursor-pointer"
                      >
                        VIEW
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 7. FINANCE HANDOFF */}
      <div className="p-5 sm:p-6 bg-[#141416] border border-[#10b981]/30 rounded-lg shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-[#10b981]" />
            <h3 className="font-headline text-sm sm:text-base font-extrabold text-white uppercase tracking-wider">
              FINANCE HANDOFF
            </h3>
            <span className={`px-2 py-0.5 rounded text-[10px] font-headline font-bold uppercase border ${
              isSelectedFinalized
                ? 'bg-[#10b981]/15 text-[#10b981] border-[#10b981]/40'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}>
              {isSelectedFinalized ? 'READY FOR FINANCE' : 'PENDING FINALIZATION'}
            </span>
          </div>
          <p className="text-xs text-[#849495] font-body">
            Finalized results are ready for downstream prize and payout processing in the Finance section.
          </p>
        </div>

        {setActiveTab && (
          <button
            onClick={() => setActiveTab('finance')}
            className="w-full sm:w-auto px-6 py-2.5 bg-[#10b981] hover:bg-[#10b981]/90 text-slate-950 rounded-lg text-xs font-headline font-extrabold uppercase transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            <span>OPEN FINANCE &rarr;</span>
            <ArrowRight className="w-4 h-4 text-slate-950" />
          </button>
        )}
      </div>

      {/* MODAL 1: FINALIZE RESULT CONFIRMATION */}
      {showFinalizeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#141416] border border-[#27272a] rounded-lg p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-[#10b981]">
              <div className="w-10 h-10 rounded-lg bg-[#10b981]/10 border border-[#10b981]/30 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-[#10b981]" />
              </div>
              <div>
                <h3 className="font-headline font-extrabold text-base uppercase text-white">
                  FINALIZE RESULT?
                </h3>
                <p className="text-xs text-[#849495] font-body">Authoritative tournament result publishing.</p>
              </div>
            </div>

            <p className="text-xs text-[#b9cacb] font-body leading-relaxed">
              Once finalized, this result becomes the authoritative tournament result for <span className="font-bold text-white">{selectedTournament?.title}</span>. Standings will be locked and handed off to Finance for prize processing. Further adjustments require an authorized correction workflow.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setShowFinalizeModal(false)}
                className="flex-1 py-2.5 bg-[#1c1b1c] hover:bg-[#27272a] text-[#849495] hover:text-white border border-[#27272a] rounded-lg text-xs font-headline font-bold uppercase transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleFinalizeResults}
                disabled={isFinalizing}
                className="flex-1 py-2.5 bg-[#10b981] hover:bg-[#10b981]/90 text-slate-950 rounded-lg text-xs font-headline font-extrabold uppercase transition-colors cursor-pointer shadow-lg shadow-[#10b981]/30"
              >
                {isFinalizing ? 'Finalizing...' : 'Confirm Finalization'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: FLAG RESULT REASON */}
      {flagTargetTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#141416] border border-[#27272a] rounded-lg p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-[#ff5e07]">
              <div className="w-10 h-10 rounded-lg bg-[#ff5e07]/10 border border-[#ff5e07]/30 flex items-center justify-center">
                <Flag className="w-5 h-5 text-[#ff5e07]" />
              </div>
              <div>
                <h3 className="font-headline font-extrabold text-base uppercase text-white">
                  FLAG TEAM RESULT
                </h3>
                <p className="text-xs text-[#849495] font-body">{flagTargetTeam.name}</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-headline font-bold text-[#849495] uppercase tracking-wider block">
                Flagging Reason / Dispute Description:
              </label>
              <textarea
                value={flagReason}
                onChange={(e) => setFlagReason(e.target.value)}
                placeholder="e.g. Screenshot discrepancy, unauthorized player character UID, or disputed kill count..."
                rows={3}
                className="w-full px-3 py-2 bg-[#1c1b1c] border border-[#27272a] rounded-lg text-xs text-white placeholder-[#849495] focus:outline-none focus:border-[#ff5e07] resize-none"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setFlagTargetTeam(null)}
                className="flex-1 py-2.5 bg-[#1c1b1c] hover:bg-[#27272a] text-[#849495] hover:text-white border border-[#27272a] rounded-lg text-xs font-headline font-bold uppercase transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmFlag}
                className="flex-1 py-2.5 bg-[#ff5e07] hover:bg-[#ff5e07]/90 text-slate-950 rounded-lg text-xs font-headline font-extrabold uppercase transition-colors cursor-pointer"
              >
                Confirm Flag
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
