import { useState, useEffect } from 'react'
import {
  BarChart3,
  Save,
  Eye,
  CheckCircle2,
  Trophy,
  X,
  Crown,
  Flame,
  Award,
  Zap,
  RefreshCw,
  Sparkles
} from 'lucide-react'
import AuthAlert from '../common/AuthAlert'
import LoadingButton from '../common/LoadingButton'
import { useToast } from '../../contexts/ToastContext'

// Standard Esports Placement Points Table (FF / BGMI standard)
const STANDARD_PLACEMENT_PTS = {
  1: 12, // Booyah / Chicken Dinner
  2: 9,
  3: 8,
  4: 7,
  5: 6,
  6: 5,
  7: 4,
  8: 3,
  9: 2,
  10: 1,
}

export default function LeaderboardsView({ tournaments = [], updateTournamentScores, updateTournamentStatus, editTournament }) {
  const { showSuccess, showError } = useToast()
  const [selectedId, setSelectedId] = useState(tournaments[0]?.id || '')
  const selectedTournament = tournaments.find((t) => String(t.id) === String(selectedId)) || tournaments[0]

  const [teams, setTeams] = useState([])
  const [matchRound, setMatchRound] = useState('Overall')
  const [showPreview, setShowPreview] = useState(false)
  const [showWinnerModal, setShowWinnerModal] = useState(false)
  const [alert, setAlert] = useState(null)
  const [isSaving, setIsSaving] = useState(false)

  // Initialize team scores when selected tournament changes
  useEffect(() => {
    if (selectedTournament) {
      const rawTeams = selectedTournament.teamsList || []
      const preparedTeams = rawTeams.map((t, idx) => {
        const kills = Number(t.kills || 0)
        const placementPts = Number(t.placementPoints ?? (STANDARD_PLACEMENT_PTS[idx + 1] || 0))
        const totalPts = Number(t.points ?? (kills + placementPts))

        return {
          id: t.id || t.email || `team-${idx}`,
          name: t.name || t.teamName || `Squad #${idx + 1}`,
          captain: t.captain || t.captainName || 'Player 1',
          kills: kills,
          placementPoints: placementPts,
          points: totalPts,
        }
      })

      // Sort by points desc initially
      setTeams(preparedTeams.sort((a, b) => b.points - a.points))
    }
  }, [selectedTournament])

  const handleSelectTournament = (id) => {
    setSelectedId(id)
  }

  // Handle Score Input & Automatic Calculation
  const handleScoreChange = (idx, field, val) => {
    const num = Math.max(0, parseInt(val, 10) || 0)

    setTeams((prev) => {
      const updated = [...prev]
      const currentTeam = { ...updated[idx], [field]: num }

      // Automatic Calculation: Total Points = Kills + Placement Points
      const kills = field === 'kills' ? num : currentTeam.kills || 0
      const placementPts = field === 'placementPoints' ? num : currentTeam.placementPoints || 0
      currentTeam.points = kills + placementPts

      updated[idx] = currentTeam

      // Re-sort automatically by points
      return [...updated].sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points
        return b.kills - a.kills
      })
    })
  }

  const handleSavePoints = async () => {
    if (!selectedTournament || isSaving) return
    setIsSaving(true)
    setAlert(null)

    try {
      if (updateTournamentScores) {
        await updateTournamentScores(selectedTournament.id, teams)
      }
      setAlert({
        type: 'success',
        message: `Points table & standings published live for "${selectedTournament.title}"!`,
      })
      showSuccess(`Standings published live for ${selectedTournament.title}!`, 'Leaderboard Updated')
    } catch (err) {
      setAlert({
        type: 'error',
        message: err.message || 'Failed to publish points table updates.',
      })
      showError(err, 'Publication Error')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeclareWinner = async () => {
    if (teams.length === 0 || !selectedTournament) return
    const champion = teams[0]

    try {
      if (editTournament) {
        await editTournament(selectedTournament.id, {
          status: 'Completed',
          winnerTeam: champion.name,
          winnerCaptain: champion.captain,
          teamsList: teams,
        })
      } else if (updateTournamentStatus) {
        await updateTournamentStatus(selectedTournament.id, 'Completed')
      }
      setShowWinnerModal(true)
      setAlert({
        type: 'success',
        message: `Official Tournament Winner declared: ${champion.name} (Captain: ${champion.captain})! Status updated to Completed.`,
      })
      showSuccess(`Official Winner ${champion.name} declared for ${selectedTournament.title}!`, 'Winner Declared')
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Failed to declare official winner.' })
    }
  }

  return (
    <div className="space-y-6">
      
      {/* Header & Tournament Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#3a494b]/60 pb-4">
        <div className="space-y-1">
          <h2 className="font-display-lg text-xl sm:text-2xl font-extrabold text-white uppercase tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-[#fe6b00]" />
            <span>POINTS TABLE & STANDINGS EDITOR</span>
          </h2>
          <p className="text-xs text-[#8e9dae]">
            Input match kills, placement points, and automatically publish live leaderboard standings.
          </p>
        </div>

        {/* Tournament Picker */}
        <select
          value={selectedId}
          onChange={(e) => handleSelectTournament(e.target.value)}
          className="py-2.5 px-4 bg-[#07090c] border border-[#3a494b] rounded text-xs font-bold text-[#00f2ff] focus:outline-none"
        >
          {tournaments.map((t) => (
            <option key={`lb-select-${t.id}`} value={t.id}>{t.title} ({t.game})</option>
          ))}
        </select>
      </div>

      {alert && <AuthAlert type={alert.type} message={alert.message} />}

      {/* MATCH ROUND CONTROLS & PUBLISH ACTIONS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-4 shadow-xl">
        <div className="flex items-center gap-2">
          <span className="font-label-caps text-xs text-[#8e9dae] uppercase font-bold">Round Filter:</span>
          <div className="flex gap-1.5 font-mono text-xs font-bold">
            {['Overall', 'Match 1', 'Match 2', 'Match 3'].map((r) => (
              <button
                key={`round-${r}`}
                onClick={() => setMatchRound(r)}
                className={`px-3 py-1.5 rounded transition-all ${
                  matchRound === r
                    ? 'bg-[#00f2ff] text-[#00363a] font-extrabold shadow-[0_0_10px_rgba(0,242,255,0.3)]'
                    : 'bg-[#07090c] text-[#8e9dae] border border-[#3a494b] hover:text-white'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="px-3.5 py-2.5 bg-[#07090c] hover:bg-[#1d232c] border border-[#3a494b] text-xs font-bold text-[#e1e2e7] hover:text-[#00f2ff] rounded transition-colors flex items-center gap-1.5 uppercase min-h-[40px]"
          >
            <Eye className="w-4 h-4 text-[#00f2ff]" />
            <span>{showPreview ? 'Hide Preview' : 'Public Live Preview'}</span>
          </button>

          <button
            onClick={handleDeclareWinner}
            className="px-3.5 py-2.5 bg-[#fe6b00]/10 hover:bg-[#fe6b00]/20 border border-[#fe6b00]/40 text-[#fe6b00] font-bold text-xs rounded transition-colors flex items-center gap-1.5 uppercase min-h-[40px]"
          >
            <Crown className="w-4 h-4" />
            <span>Declare Winner</span>
          </button>

          <LoadingButton
            onClick={handleSavePoints}
            loading={isSaving}
            loadingText="Publishing..."
            icon={Save}
            className="text-xs py-2.5 min-h-[40px]"
          >
            Publish Standings
          </LoadingButton>
        </div>
      </div>

      {/* EDITABLE POINTS TABLE */}
      <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl overflow-hidden shadow-xl">
        <div className="p-4 bg-[#07090c] border-b border-[#3a494b]/60 flex items-center justify-between">
          <h3 className="font-display-lg text-sm font-bold text-white uppercase flex items-center gap-2">
            <Trophy className="w-4 h-4 text-[#00f2ff]" />
            <span>{selectedTournament?.title} &mdash; Standings Editor</span>
          </h3>
          <span className="font-mono text-xs text-[#00ff9d] font-bold">Automatic Formula: Total = Kills + Placement Pts</span>
        </div>

        {teams.length === 0 ? (
          <div className="p-12 text-center text-[#8e9dae] text-xs space-y-2">
            <BarChart3 className="w-8 h-8 text-[#8e9dae] mx-auto" />
            <p className="font-bold text-white">No Registered Teams</p>
            <p>Approve squad registrations to populate team entries in the points table.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#07090c] border-b border-[#3a494b]/60 font-label-caps text-[#8e9dae]">
                  <th className="p-3.5 pl-4 text-center w-12">Rank</th>
                  <th className="p-3.5">Squad Team Name</th>
                  <th className="p-3.5">Captain</th>
                  <th className="p-3.5 text-center w-28">Kills (1 Pts)</th>
                  <th className="p-3.5 text-center w-36">Placement Pts</th>
                  <th className="p-3.5 text-right pr-6 w-32">Total Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#3a494b]/40">
                {teams.map((t, idx) => {
                  const rank = idx + 1
                  const isTop1 = rank === 1
                  const isTop2 = rank === 2
                  const isTop3 = rank === 3

                  return (
                    <tr
                      key={`edit-row-${t.id}`}
                      className={`hover:bg-[#1d232c] transition-colors ${
                        isTop1 ? 'bg-[#fe6b00]/5' : isTop2 ? 'bg-[#00f2ff]/5' : isTop3 ? 'bg-[#ffb800]/5' : ''
                      }`}
                    >
                      {/* Rank */}
                      <td className="p-3.5 pl-4 text-center font-mono font-extrabold text-sm">
                        {isTop1 ? (
                          <span className="text-[#fe6b00] flex items-center justify-center gap-1">
                            <Crown className="w-4 h-4 fill-[#fe6b00]" />
                            #1
                          </span>
                        ) : isTop2 ? (
                          <span className="text-[#00f2ff]">#2</span>
                        ) : isTop3 ? (
                          <span className="text-[#ffb800]">#3</span>
                        ) : (
                          <span className="text-[#8e9dae]">#{rank}</span>
                        )}
                      </td>

                      {/* Team Name */}
                      <td className="p-3.5 font-extrabold text-white">
                        {t.name}
                      </td>

                      {/* Captain */}
                      <td className="p-3.5 text-[#8e9dae]">
                        {t.captain}
                      </td>

                      {/* Editable Kills */}
                      <td className="p-3.5 text-center">
                        <input
                          type="number"
                          min="0"
                          value={t.kills}
                          onChange={(e) => handleScoreChange(idx, 'kills', e.target.value)}
                          className="w-16 py-1.5 px-2 bg-[#07090c] border border-[#3a494b] rounded text-center font-mono text-xs font-bold text-white focus:outline-none focus:border-[#00f2ff]"
                        />
                      </td>

                      {/* Editable Placement Points */}
                      <td className="p-3.5 text-center">
                        <input
                          type="number"
                          min="0"
                          value={t.placementPoints}
                          onChange={(e) => handleScoreChange(idx, 'placementPoints', e.target.value)}
                          className="w-20 py-1.5 px-2 bg-[#07090c] border border-[#3a494b] rounded text-center font-mono text-xs font-bold text-[#00f2ff] focus:outline-none focus:border-[#00f2ff]"
                        />
                      </td>

                      {/* Total Points */}
                      <td className="p-3.5 text-right pr-6 font-mono font-extrabold text-sm text-[#00ff9d]">
                        {t.points} Pts
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  )
}
