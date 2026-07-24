import { useState } from 'react'
import { Link } from 'react-router-dom'
import { GameTabs } from '../components/stitch/GameTabs'
import { HeroBanner } from '../components/stitch/HeroBanner'
import { TournamentCard } from '../components/stitch/TournamentCard'
import { ScheduleWidget } from '../components/stitch/ScheduleWidget'
import { LeaderboardWidget } from '../components/stitch/LeaderboardWidget'
import { useTournaments } from '../contexts/TournamentContext'
import { ArrowRight, Trophy, Sparkles, Flame } from 'lucide-react'

export default function Home() {
  const { tournaments } = useTournaments()
  const [selectedGame, setSelectedGame] = useState('ALL')

  const filteredTournaments = selectedGame === 'ALL'
    ? tournaments
    : tournaments.filter((t) => t.game?.toLowerCase().includes(selectedGame.toLowerCase()))

  return (
    <div className="w-full min-h-screen bg-[#0b0e11] text-[#e1e2e7] pt-6 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Game Filter Selection Bar */}
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#3a494b]/40 pb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#00f2ff] animate-pulse" />
          <h2 className="text-xs sm:text-sm font-bold uppercase tracking-widest text-[#b9cacb]">
            Arena Tournament Hub
          </h2>
        </div>
        <GameTabs selectedGame={selectedGame} onSelectGame={setSelectedGame} />
      </div>

      {/* Hero Showcase Section */}
      <HeroBanner />

      {/* Main 12-Column Esports Grid Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* Left Column (8 Cols): Tournament Cards Grid */}
        <div className="xl:col-span-8 space-y-6">
          <div className="flex justify-between items-end border-b border-[#3a494b]/40 pb-3">
            <div className="flex items-center gap-2">
              <Trophy className="w-6 h-6 text-[#fe6b00]" />
              <h2 className="font-display-lg text-xl sm:text-3xl font-extrabold text-[#00f2ff] uppercase tracking-tight">
                ACTIVE TOURNAMENTS
              </h2>
            </div>
            <Link
              to="/tournaments"
              className="text-xs font-bold text-[#00f2ff] hover:text-[#74f5ff] flex items-center gap-1 uppercase tracking-wider transition-colors"
            >
              <span>VIEW ALL</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {filteredTournaments.length === 0 ? (
            <div className="p-12 text-center bg-[#161b22]/80 border border-[#3a494b] rounded-xl space-y-3 shadow-xl">
              <Flame className="w-10 h-10 text-[#fe6b00] mx-auto opacity-70" />
              <h3 className="text-base font-bold text-[#e1e2e7]">No Tournaments Available</h3>
              <p className="text-xs text-[#849495]">No active matches found for the selected game category.</p>
              <Link
                to="/tournaments"
                className="inline-block mt-2 px-5 py-2.5 bg-[#00f2ff] text-[#00363a] text-xs font-extrabold rounded uppercase tracking-wider hover:brightness-110"
              >
                Browse All Competitions
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredTournaments.map((t) => (
                <TournamentCard key={`stitch-home-card-${t.id}`} tournament={t} />
              ))}
            </div>
          )}
        </div>

        {/* Right Column (4 Cols): Widgets (Schedule & Leaderboard) */}
        <div className="xl:col-span-4 flex flex-col gap-6">
          <ScheduleWidget />
          <LeaderboardWidget />
        </div>

      </div>
    </div>
  )
}
