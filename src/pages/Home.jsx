import { useState } from 'react'
import { Link } from 'react-router-dom'
import { GameTabs } from '../components/stitch/GameTabs'
import { HeroBanner } from '../components/stitch/HeroBanner'
import { TournamentCard } from '../components/stitch/TournamentCard'
import { ScheduleWidget } from '../components/stitch/ScheduleWidget'
import { LeaderboardWidget } from '../components/stitch/LeaderboardWidget'
import { useTournaments } from '../contexts/TournamentContext'
import { INITIAL_TOURNAMENTS } from '../data/mockData'
import { ArrowRight, Trophy } from 'lucide-react'

export default function Home() {
  const { tournaments } = useTournaments()
  const [selectedGame, setSelectedGame] = useState('ALL')

  // Fallback to mock data if tournaments list is empty
  const allTournaments = tournaments && tournaments.length > 0 ? tournaments : INITIAL_TOURNAMENTS

  const filteredTournaments = selectedGame === 'ALL'
    ? allTournaments
    : allTournaments.filter((t) => t.game?.toLowerCase().includes(selectedGame.toLowerCase()))

  return (
    <div className="w-full min-h-screen bg-[#0b0e11] text-[#e1e2e7] lg:pl-64 pt-20 pb-24 px-4 sm:px-8">
      {/* Game Selection Tabs */}
      <GameTabs selectedGame={selectedGame} onSelectGame={setSelectedGame} />

      {/* Hero Showcase Section */}
      <HeroBanner />

      {/* 12-Column Grid Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* Left Column (8 Cols): Tournament Cards Grid */}
        <div className="xl:col-span-8">
          <div className="flex justify-between items-end mb-4">
            <h2 className="font-display-lg text-2xl sm:text-3xl font-extrabold text-[#00f2ff] uppercase tracking-tight flex items-center gap-2">
              <Trophy className="w-6 h-6 text-[#fe6b00]" />
              ACTIVE TOURNAMENTS
            </h2>
            <Link
              to="/tournaments"
              className="text-xs font-bold text-[#00f2ff] hover:underline flex items-center gap-1 uppercase tracking-wider"
            >
              <span>VIEW ALL</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTournaments.map((t) => (
              <TournamentCard key={`t-card-${t.id}`} tournament={t} />
            ))}
          </div>
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
