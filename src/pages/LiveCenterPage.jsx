import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Radio, Tv, Flame, Trophy, Shield, Play, ArrowRight, Calendar, Gamepad2 } from 'lucide-react'
import { useTournaments } from '../contexts/TournamentContext'
import { SUPPORTED_GAMES } from '../data/mockData'

export default function LiveCenterPage() {
  const { tournaments } = useTournaments()

  // Filter live tournaments: Status is 'Live Now' and game is V1 supported
  const liveTournaments = tournaments.filter((t) => {
    const isLive = t.status === 'Live Now'
    const isV1SupportedGame = SUPPORTED_GAMES.some(
      (g) => g.toLowerCase() === (t.game || '').toLowerCase()
    )
    return isLive && isV1SupportedGame
  })

  const [selectedMatch, setSelectedMatch] = useState(liveTournaments[0] || null)

  useEffect(() => {
    if (liveTournaments.length > 0) {
      if (!selectedMatch || !liveTournaments.some((t) => t.id === selectedMatch.id)) {
        setSelectedMatch(liveTournaments[0])
      }
    } else {
      setSelectedMatch(null)
    }
  }, [tournaments])

  // Derive leading team from selected tournament's teamsList
  const sortedTeams = selectedMatch?.teamsList
    ? [...selectedMatch.teamsList].sort((a, b) => (b.points || 0) - (a.points || 0) || (b.kills || 0) - (a.kills || 0))
    : []
  const leadTeam = sortedTeams[0] || null

  const mapName = selectedMatch?.game?.toUpperCase().includes('FREE FIRE') ? 'Bermuda / Kalahari' : 'Erangel'

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-950 border border-red-800 text-red-400 text-xs font-bold">
            <Radio className="w-3.5 h-3.5 text-red-400" />
            <span>LIVE MATCH BROADCASTS</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white uppercase tracking-tight">
            LIVE ARENA CENTER
          </h1>
        </div>

        {/* Live Stream Switcher Buttons */}
        {liveTournaments.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {liveTournaments.map((m) => (
              <button
                key={`live-btn-${m.id}`}
                onClick={() => setSelectedMatch(m)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-colors shrink-0 flex items-center gap-2 ${
                  selectedMatch?.id === m.id
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                    : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                }`}
              >
                <Tv className="w-3.5 h-3.5" />
                <span>{m.game}: {m.title}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {liveTournaments.length === 0 || !selectedMatch ? (
        /* Empty State when no live events exist */
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 sm:p-12 text-center space-y-6 max-w-2xl mx-auto shadow-2xl my-8">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-slate-950 border border-slate-800 flex items-center justify-center mx-auto text-purple-400">
            <Tv className="w-8 h-8 sm:w-10 sm:h-10 text-slate-600" />
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-slate-950 text-slate-400 border border-slate-800">
              OFFLINE / NO LIVE STREAM
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white">No Live Matches Currently Streaming</h2>
            <p className="text-slate-400 text-xs leading-relaxed max-w-md mx-auto">
              There are currently no active live tournament broadcasts for Free Fire or BGMI. Check back during scheduled match times or explore upcoming tournaments!
            </p>
          </div>

          <div className="pt-2">
            <Link
              to="/tournaments"
              className="inline-flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-purple-400 via-indigo-300 to-cyan-300 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg shadow-purple-500/20 hover:brightness-110 transition-all min-h-[44px]"
            >
              <span>Explore Upcoming Tournaments</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      ) : (
        /* Live Broadcast View */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Player & Match Overview */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Responsive Stream Player Container */}
            <div className="bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative aspect-video flex items-center justify-center">
              <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-6 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-purple-950 border border-purple-800 flex items-center justify-center">
                  <Play className="w-8 h-8 text-purple-400 ml-1" />
                </div>
                <div className="space-y-1">
                  <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-red-600 text-white shadow-md">
                    LIVE STREAMING NOW
                  </span>
                  <h3 className="text-lg sm:text-2xl font-extrabold text-white uppercase tracking-tight">
                    {selectedMatch.title}
                  </h3>
                  <p className="text-xs text-slate-400 font-semibold">
                    Game: <span className="text-cyan-400">{selectedMatch.game}</span> &bull; Map: <span className="text-cyan-400">{mapName}</span> &bull; {selectedMatch.format}
                  </p>
                </div>
              </div>
            </div>

            {/* Match Score Banner */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Current Rank #1 Team</span>
                <h4 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <Shield className="w-4 h-4 text-purple-400" />
                  {leadTeam ? leadTeam.name : 'Match In Progress'}
                </h4>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <div className="px-3.5 py-2 bg-slate-950 rounded-xl border border-slate-800 font-bold text-cyan-400">
                  Kills: {leadTeam ? leadTeam.kills || 0 : 0}
                </div>
                <div className="px-3.5 py-2 bg-emerald-950 text-emerald-300 rounded-xl border border-emerald-800 font-bold">
                  Points: {leadTeam ? leadTeam.points || 0 : 0} pts
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Dynamic Elimination / Standings Feed */}
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Flame className="w-4 h-4 text-orange-400" />
                  <span>Match Leaderboard Feed</span>
                </h3>
                <span className="text-[10px] font-semibold text-emerald-400">Live Sync</span>
              </div>

              <div className="space-y-3">
                {sortedTeams.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500">
                    No team elimination data published for this match yet.
                  </div>
                ) : (
                  sortedTeams.map((team, idx) => (
                    <div key={`live-feed-${idx}`} className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-purple-400">#{idx + 1}</span>
                          <span className="font-bold text-white">{team.name}</span>
                        </div>
                        <p className="text-[11px] text-slate-400">Captain: {team.captain}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-extrabold text-emerald-400 block">{team.points || 0} pts</span>
                        <span className="text-[10px] text-slate-500 font-semibold">{team.kills || 0} Kills</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  )
}
