import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Radio, Tv, Flame, Shield, Play, ArrowRight } from 'lucide-react'
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

  const [selectedMatch, setSelectedMatch] = useState(() => liveTournaments[0] || null)

  useEffect(() => {
    if (liveTournaments.length > 0) {
      setSelectedMatch((prev) => {
        if (!prev || !liveTournaments.some((t) => t.id === prev.id)) {
          return liveTournaments[0]
        }
        return prev
      })
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#3a494b]/60">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#fe6b00]/10 border border-[#fe6b00]/40 text-[#fe6b00] text-xs font-bold uppercase tracking-wider animate-pulse">
            <Radio className="w-3.5 h-3.5 text-[#fe6b00]" />
            <span>LIVE MATCH BROADCASTS</span>
          </div>
          <h1 className="font-display-lg text-2xl sm:text-4xl font-extrabold text-white uppercase tracking-tight">
            LIVE ARENA CENTER
          </h1>
        </div>

        {/* Live Stream Switcher Buttons */}
        {liveTournaments.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            {liveTournaments.map((m) => (
              <button
                key={`live-btn-${m.id}`}
                onClick={() => setSelectedMatch(m)}
                className={`px-4 py-2.5 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-2 uppercase tracking-wider ${
                  selectedMatch?.id === m.id
                    ? 'bg-[#00f2ff] text-[#00363a] font-extrabold shadow-[0_0_12px_rgba(0,242,255,0.4)]'
                    : 'bg-[#151a21] text-[#8e9dae] border border-[#3a494b] hover:text-white'
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
        <div className="bg-[#151a21] border border-[#3a494b] rounded-xl p-8 sm:p-12 text-center space-y-6 max-w-2xl mx-auto shadow-2xl my-8">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#07090c] border border-[#3a494b] flex items-center justify-center mx-auto text-[#00f2ff]">
            <Tv className="w-8 h-8 sm:w-10 sm:h-10 text-[#8e9dae]" />
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 rounded text-[10px] font-bold uppercase tracking-widest bg-[#07090c] text-[#8e9dae] border border-[#3a494b]">
              OFFLINE / NO LIVE STREAM
            </span>
            <h2 className="font-display-lg text-xl sm:text-2xl font-extrabold text-white uppercase">No Live Matches Currently Streaming</h2>
            <p className="text-[#8e9dae] text-xs leading-relaxed max-w-md mx-auto">
              There are currently no active live tournament broadcasts for Free Fire or BGMI. Check back during scheduled match times or explore upcoming tournaments!
            </p>
          </div>

          <div className="pt-2">
            <Link
              to="/tournaments"
              className="btn-cyber-primary"
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
            <div className="bg-[#07090c] border border-[#3a494b]/60 rounded-xl overflow-hidden shadow-2xl relative aspect-video flex items-center justify-center">
              <div className="absolute inset-0 bg-[#07090c] flex flex-col items-center justify-center p-6 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-[#00f2ff]/20 border-2 border-[#00f2ff] flex items-center justify-center shadow-[0_0_20px_rgba(0,242,255,0.4)] animate-pulse">
                  <Play className="w-8 h-8 text-[#00f2ff] ml-1" />
                </div>
                <div className="space-y-1">
                  <span className="px-3 py-1 rounded text-[10px] font-bold uppercase tracking-widest bg-[#fe6b00] text-slate-950 shadow-md">
                    LIVE STREAMING NOW
                  </span>
                  <h3 className="font-display-lg text-lg sm:text-2xl font-extrabold text-white uppercase tracking-tight">
                    {selectedMatch.title}
                  </h3>
                  <p className="text-xs text-[#8e9dae] font-semibold">
                    Game: <span className="text-[#00f2ff] font-bold">{selectedMatch.game}</span> &bull; Map: <span className="text-[#00f2ff] font-bold">{mapName}</span> &bull; {selectedMatch.format}
                  </p>
                </div>
              </div>
            </div>

            {/* Match Score Banner */}
            <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="font-label-caps text-[10px] uppercase text-[#8e9dae] block">Current Rank #1 Team</span>
                <h4 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#00f2ff]" />
                  {leadTeam ? leadTeam.name : 'Match In Progress'}
                </h4>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <div className="px-3.5 py-2 bg-[#07090c] rounded border border-[#3a494b]/60 font-mono font-bold text-[#00f2ff]">
                  Kills: {leadTeam ? leadTeam.kills || 0 : 0}
                </div>
                <div className="px-3.5 py-2 bg-[#00ff9d]/10 text-[#00ff9d] rounded border border-[#00ff9d]/40 font-mono font-bold">
                  Points: {leadTeam ? leadTeam.points || 0 : 0} pts
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Dynamic Elimination / Standings Feed */}
          <div className="space-y-6">
            <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-5 sm:p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-[#3a494b]/60 pb-3">
                <h3 className="font-label-caps text-xs font-bold text-white uppercase flex items-center gap-2">
                  <Flame className="w-4 h-4 text-[#fe6b00]" />
                  <span>Match Leaderboard Feed</span>
                </h3>
                <span className="font-mono text-[10px] font-semibold text-[#00ff9d]">Live Sync</span>
              </div>

              <div className="space-y-3">
                {sortedTeams.length === 0 ? (
                  <div className="p-4 text-center text-xs text-[#8e9dae]">
                    No team elimination data published for this match yet.
                  </div>
                ) : (
                  sortedTeams.map((team, idx) => (
                    <div key={`live-feed-${idx}`} className="p-3 bg-[#07090c] border border-[#3a494b]/60 rounded-lg text-xs flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-extrabold text-[#00f2ff]">#{idx + 1}</span>
                          <span className="font-bold text-white">{team.name}</span>
                        </div>
                        <p className="text-[11px] text-[#8e9dae]">Captain: {team.captain}</p>
                      </div>
                      <div className="text-right">
                        <span className="font-mono text-xs font-extrabold text-[#00ff9d] block">{team.points || 0} pts</span>
                        <span className="font-mono text-[10px] text-[#8e9dae]">{team.kills || 0} Kills</span>
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
