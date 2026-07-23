import { useState } from 'react'
import { BarChart3, Save, Eye, CheckCircle2, Trophy, X } from 'lucide-react'
import AuthAlert from '../common/AuthAlert'

export default function LeaderboardsView({ tournaments, updateTournamentScores }) {
  const [selectedId, setSelectedId] = useState(tournaments[0]?.id || '')
  const selectedTournament = tournaments.find((t) => t.id === selectedId)
  
  const [teams, setTeams] = useState(selectedTournament?.teamsList || [])
  const [showPreview, setShowPreview] = useState(false)
  const [alert, setAlert] = useState(null)

  const handleSelect = (id) => {
    setSelectedId(id)
    const found = tournaments.find((t) => t.id === id)
    setTeams(found?.teamsList || [])
  }

  const handleScoreChange = (idx, field, val) => {
    const num = parseInt(val, 10) || 0
    setTeams((prev) => {
      const copy = [...prev]
      copy[idx] = { ...copy[idx], [field]: num }
      return copy
    })
  }

  const handlePublish = () => {
    if (!selectedId) return
    updateTournamentScores(selectedId, teams)
    setShowPreview(false)
    setAlert({ type: 'success', message: 'Leaderboards and points table published live to player view!' })
  }

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-extrabold text-white uppercase tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-purple-400" />
            <span>LEADERBOARDS & POINTS PUBLISHER</span>
          </h2>
          <p className="text-xs text-slate-400">
            Select a tournament, input squad kill counts and placement points, preview, and publish standings.
          </p>
        </div>

        <select
          value={selectedId}
          onChange={(e) => handleSelect(e.target.value)}
          className="py-2.5 px-4 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-cyan-300"
        >
          {tournaments.map((t) => (
            <option key={`lb-opt-${t.id}`} value={t.id}>{t.title}</option>
          ))}
        </select>
      </div>

      {alert && <AuthAlert type={alert.type} message={alert.message} />}

      {teams.length === 0 ? (
        <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-3xl text-slate-500 text-xs">
          No registered squads available to edit scores for this tournament.
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-6 shadow-xl">
          <div className="space-y-3">
            {teams.map((team, idx) => (
              <div key={`lb-edit-${idx}`} className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between gap-3 text-xs">
                <span className="font-extrabold text-white text-sm">{team.name}</span>
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <span className="text-[9px] text-slate-500 font-bold block uppercase">Kills</span>
                    <input
                      type="number"
                      value={team.kills || 0}
                      onChange={(e) => handleScoreChange(idx, 'kills', e.target.value)}
                      className="w-16 py-1 px-2 bg-slate-900 border border-slate-800 rounded-lg text-center font-bold text-cyan-400"
                    />
                  </div>
                  <div className="text-center">
                    <span className="text-[9px] text-slate-500 font-bold block uppercase">Points</span>
                    <input
                      type="number"
                      value={team.points || 0}
                      onChange={(e) => handleScoreChange(idx, 'points', e.target.value)}
                      className="w-16 py-1 px-2 bg-slate-900 border border-slate-800 rounded-lg text-center font-bold text-emerald-400"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 pt-2 border-t border-slate-800">
            <button
              onClick={() => setShowPreview(true)}
              className="flex-1 py-3.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-cyan-300 font-bold text-xs rounded-xl flex items-center justify-center gap-2 min-h-[44px]"
            >
              <Eye className="w-4 h-4" />
              <span>Preview Standings</span>
            </button>
            <button
              onClick={handlePublish}
              className="flex-1 py-3.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 min-h-[44px]"
            >
              <Save className="w-4 h-4" />
              <span>Publish Standings Live</span>
            </button>
          </div>
        </div>
      )}

      {/* Standings Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-6 shadow-2xl relative">
            <button onClick={() => setShowPreview(false)} className="absolute top-5 right-5 p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              <span>Standings Preview: {selectedTournament?.title}</span>
            </h3>

            <div className="space-y-2 text-xs">
              {teams.map((t, i) => (
                <div key={i} className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex justify-between">
                  <span className="font-bold text-white">#{i + 1} {t.name}</span>
                  <span className="text-emerald-400 font-extrabold">{t.points || 0} pts ({t.kills || 0} kills)</span>
                </div>
              ))}
            </div>

            <button onClick={handlePublish} className="w-full py-3.5 bg-purple-600 text-white font-bold text-xs rounded-xl min-h-[44px]">
              Confirm & Publish Live
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
