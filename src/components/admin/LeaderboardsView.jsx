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

export default function LeaderboardsView({ tournaments = [], updateTournamentScores, updateTournamentStatus }) {
  const [selectedId, setSelectedId] = useState(tournaments[0]?.id || '')
  const selectedTournament = tournaments.find((t) => String(t.id) === String(selectedId)) || tournaments[0]

  const [teams, setTeams] = useState([])
  const [matchRound, setMatchRound] = useState('Overall')
  const [showPreview, setShowPreview] = useState(false)
  const [showWinnerModal, setShowWinnerModal] = useState(false)
  const [alert, setAlert] = useState(null)

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

      // Sort by total points descending
      sortAndSetTeams(preparedTeams)
    }
  }, [selectedId, tournaments])

  const handleSelectTournament = (id) => {
    setSelectedId(id)
  }

  // Sort teams by total points (kills + placementPoints) and assign rank
  const sortAndSetTeams = (teamArray) => {
    const sorted = [...teamArray].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points
      return b.kills - a.kills // Tie breaker: Kill count
    })
    setTeams(sorted)
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

  // Quick Preset Placement Rank Assignment
  const handleAssignPlacementRank = (idx, rankPos) => {
    const pts = STANDARD_PLACEMENT_PTS[rankPos] || 0
    handleScoreChange(idx, 'placementPoints', pts)
  }

  // Publish Leaderboard Live
  const handlePublish = async () => {
    if (!selectedTournament) return

    try {
      if (updateTournamentScores) {
        await updateTournamentScores(selectedTournament.id, teams)
      }
      setShowPreview(false)
      setAlert({
        type: 'success',
        message: `Match results published! Leaderboard for "${selectedTournament.title}" updated live across the platform.`,
      })
    } catch (err) {
      setAlert({ type: 'error', message: 'Failed to publish scores to database.' })
    }
  }

  // Declare Winners & Complete Tournament
  const handleDeclareWinners = async () => {
    if (!selectedTournament || teams.length === 0) return

    try {
      // 1. Publish final scores
      if (updateTournamentScores) {
        await updateTournamentScores(selectedTournament.id, teams)
      }

      // 2. Mark tournament status as Completed
      if (updateTournamentStatus) {
        await updateTournamentStatus(selectedTournament.id, 'Completed')
      }

      setShowWinnerModal(false)
      setAlert({
        type: 'success',
        message: `🏆 WINNERS DECLARED! "${teams[0]?.name}" crowned Champion for "${selectedTournament.title}". Tournament status set to Completed.`,
      })
    } catch (err) {
      setAlert({ type: 'error', message: 'Failed to declare tournament winners.' })
    }
  }

  return (
    <div className="space-y-6">
      
      {/* Header & Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-extrabold text-white uppercase tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-purple-400" />
            <span>RESULTS & LEADERBOARD MANAGEMENT</span>
          </h2>
          <p className="text-xs text-slate-400">
            Enter match kill & placement points, calculate standings automatically, and declare official champions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedId}
            onChange={(e) => handleSelectTournament(e.target.value)}
            className="py-2.5 px-4 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-cyan-300 focus:outline-none focus:border-purple-500 max-w-xs min-h-[44px]"
          >
            {tournaments.map((t) => (
              <option key={`lb-opt-${t.id}`} value={t.id}>{t.title}</option>
            ))}
          </select>
        </div>
      </div>

      {alert && <AuthAlert type={alert.type} message={alert.message} />}

      {/* MATCH ROUND CONTROL BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400 uppercase">Match Round:</span>
          <div className="flex gap-2 text-xs font-bold">
            {['Overall', 'Match 1', 'Match 2', 'Match 3', 'Finals'].map((m) => (
              <button
                key={`m-round-${m}`}
                onClick={() => setMatchRound(m)}
                className={`px-3 py-1.5 rounded-lg border transition-colors ${
                  matchRound === m
                    ? 'bg-purple-600 text-white border-purple-500'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowWinnerModal(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 text-slate-950 font-extrabold text-xs rounded-xl hover:brightness-110 shadow-lg flex items-center justify-center gap-2 min-h-[40px]"
          >
            <Crown className="w-4 h-4" />
            <span>Declare Winners</span>
          </button>
        </div>
      </div>

      {/* MATCH RESULTS ENTRY TABLE */}
      {teams.length === 0 ? (
        <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-3xl space-y-3 text-slate-500 text-xs shadow-xl">
          <Trophy className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-white uppercase">No Teams Registered</h3>
          <p className="text-xs text-slate-400">Register squad teams for this tournament to calculate match standings.</p>
        </div>
      ) : (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-6 shadow-xl">
          
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              <span>Live Match Results Matrix ({matchRound})</span>
            </h3>
            <span className="text-[10px] font-semibold text-slate-400">Auto-Sorted by Total Points</span>
          </div>

          <div className="space-y-3">
            {teams.map((team, idx) => {
              const rankPos = idx + 1
              return (
                <div
                  key={`lb-edit-${team.id || idx}`}
                  className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs shadow-md hover:border-slate-700 transition-colors"
                >
                  {/* Rank Badge & Team Info */}
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-extrabold text-xs shrink-0 ${
                      rankPos === 1
                        ? 'bg-amber-400 text-slate-950 shadow-[0_0_12px_rgba(251,191,36,0.6)]'
                        : rankPos === 2
                        ? 'bg-slate-300 text-slate-950'
                        : rankPos === 3
                        ? 'bg-amber-700 text-white'
                        : 'bg-slate-900 text-slate-400 border border-slate-800'
                    }`}>
                      #{rankPos}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-white text-sm">{team.name}</span>
                        {rankPos === 1 && (
                          <span className="px-2 py-0.5 rounded text-[9px] font-extrabold bg-amber-950 text-amber-300 border border-amber-800 uppercase flex items-center gap-1">
                            <Crown className="w-3 h-3 text-amber-400" />
                            <span>BOOYAH</span>
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400">Captain: {team.captain}</p>
                    </div>
                  </div>

                  {/* Points Inputs: Kills + Placement = Total */}
                  <div className="flex items-center gap-4 self-end sm:self-auto">
                    
                    {/* Kill Points */}
                    <div className="text-center space-y-1">
                      <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">Kills (+1 pt)</span>
                      <input
                        type="number"
                        min="0"
                        value={team.kills || 0}
                        onChange={(e) => handleScoreChange(idx, 'kills', e.target.value)}
                        className="w-16 py-1.5 px-2 bg-slate-900 border border-slate-800 rounded-lg text-center font-extrabold text-cyan-400 focus:outline-none focus:border-cyan-400"
                      />
                    </div>

                    <span className="text-slate-600 font-bold text-sm pt-4">+</span>

                    {/* Placement Points */}
                    <div className="text-center space-y-1">
                      <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">Placement Pts</span>
                      <input
                        type="number"
                        min="0"
                        value={team.placementPoints || 0}
                        onChange={(e) => handleScoreChange(idx, 'placementPoints', e.target.value)}
                        className="w-20 py-1.5 px-2 bg-slate-900 border border-slate-800 rounded-lg text-center font-extrabold text-purple-300 focus:outline-none focus:border-purple-400"
                      />
                    </div>

                    <span className="text-slate-600 font-bold text-sm pt-4">=</span>

                    {/* Total Points (Calculated Automatically) */}
                    <div className="text-center space-y-1 min-w-[70px]">
                      <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">Total Pts</span>
                      <div className="py-1.5 px-3 bg-emerald-950 border border-emerald-800/80 rounded-lg text-center font-extrabold text-emerald-400 text-sm shadow-inner">
                        {team.points || 0}
                      </div>
                    </div>

                  </div>
                </div>
              )
            })}
          </div>

          {/* Action Buttons: Preview & Publish */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-3 border-t border-slate-800">
            <button
              onClick={() => setShowPreview(true)}
              className="w-full sm:flex-1 py-3.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-cyan-300 font-bold text-xs rounded-xl flex items-center justify-center gap-2 min-h-[44px] transition-colors"
            >
              <Eye className="w-4 h-4 text-cyan-400" />
              <span>Preview Standings</span>
            </button>
            <button
              onClick={handlePublish}
              className="w-full sm:flex-1 py-3.5 bg-gradient-to-r from-purple-400 via-indigo-300 to-cyan-300 text-slate-950 font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 min-h-[44px] hover:brightness-110 shadow-lg transition-all"
            >
              <Save className="w-4 h-4" />
              <span>Publish Standings Live</span>
            </button>
          </div>

        </div>
      )}

      {/* STANDINGS PREVIEW MODAL */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowPreview(false)}
              className="absolute top-5 right-5 p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-1">
              <span className="text-[11px] font-bold text-purple-400 uppercase tracking-widest block">LIVE PLAYER PREVIEW</span>
              <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                <span>{selectedTournament?.title}</span>
              </h3>
            </div>

            <div className="space-y-2 text-xs">
              {teams.map((t, i) => (
                <div
                  key={`prev-${i}`}
                  className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-amber-400">#{i + 1}</span>
                    <span className="font-bold text-white">{t.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400">{t.kills || 0} kills</span>
                    <span className="text-purple-300">{t.placementPoints || 0} place pts</span>
                    <span className="text-emerald-400 font-extrabold bg-emerald-950 px-2.5 py-0.5 rounded border border-emerald-800">
                      {t.points || 0} pts
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={handlePublish}
              className="w-full py-3.5 bg-gradient-to-r from-purple-400 via-indigo-300 to-cyan-300 text-slate-950 font-extrabold text-xs rounded-xl min-h-[44px] shadow-lg"
            >
              Confirm & Publish Live
            </button>
          </div>
        </div>
      )}

      {/* DECLARE WINNERS MODAL */}
      {showWinnerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl relative">
            <button
              onClick={() => setShowWinnerModal(false)}
              className="absolute top-5 right-5 p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/40 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(251,191,36,0.3)]">
                <Crown className="w-7 h-7 text-amber-400" />
              </div>
              <h3 className="text-xl font-extrabold text-white uppercase tracking-tight">Declare Tournament Winners</h3>
              <p className="text-xs text-slate-400">
                This will finalize standings and set tournament status to <strong className="text-emerald-400">Completed</strong>.
              </p>
            </div>

            {teams.length > 0 && (
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3 text-xs">
                
                {/* 1st Champion */}
                <div className="p-3 bg-amber-950/40 border border-amber-500/40 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Crown className="w-4 h-4 text-amber-400" />
                    <span className="font-extrabold text-amber-300">1st Place Champion:</span>
                  </div>
                  <strong className="text-white font-bold text-sm">{teams[0]?.name} ({teams[0]?.points || 0} pts)</strong>
                </div>

                {/* 2nd Runner Up */}
                {teams[1] && (
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between">
                    <span className="font-extrabold text-slate-300">2nd Place Runner Up:</span>
                    <strong className="text-white font-bold">{teams[1]?.name} ({teams[1]?.points || 0} pts)</strong>
                  </div>
                )}

                {/* 3rd Place */}
                {teams[2] && (
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between">
                    <span className="font-extrabold text-amber-700">3rd Place:</span>
                    <strong className="text-white font-bold">{teams[2]?.name} ({teams[2]?.points || 0} pts)</strong>
                  </div>
                )}

              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowWinnerModal(false)}
                className="flex-1 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl min-h-[44px]"
              >
                Cancel
              </button>
              <button
                onClick={handleDeclareWinners}
                className="flex-1 py-3.5 bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-extrabold text-xs rounded-xl hover:brightness-110 shadow-lg min-h-[44px]"
              >
                Confirm & Declare Winners
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}
