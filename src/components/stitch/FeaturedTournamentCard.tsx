import React from 'react'
import { Flame, Trophy, MapPin, Users, Ticket, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'

interface FeaturedTournamentCardProps {
  tournament?: any
  onJoin?: (tournament: any) => void
}

export const FeaturedTournamentCard: React.FC<FeaturedTournamentCardProps> = ({
  tournament,
  onJoin,
}) => {
  const title = tournament?.title || 'No active tournament available'
  const game = tournament?.game || 'Free Fire'
  const prizePool = tournament?.prizePool || '₹0'
  const entryFee = tournament?.entryFee || 'Free'
  const filledSlots = Number(tournament?.registeredTeams ?? tournament?.registered_teams ?? 0)
  const totalSlots = Number(tournament?.maxTeams ?? tournament?.max_teams ?? 32)
  const fillPercent = totalSlots > 0 ? Math.round((filledSlots / totalSlots) * 100) : 0
  const mapName = tournament?.game?.toLowerCase().includes('free fire') ? 'Bermuda' : 'Erangel'

  return (
    <div className="bg-[#161b22]/90 backdrop-blur-md border border-[#3a494b] p-5 sm:p-6 rounded-xl relative flex flex-col group hover:border-[#00f2ff] hover:shadow-[0_0_15px_rgba(0,242,255,0.2)] transition-all duration-300 md:col-span-2">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        
        {/* Left Side Info */}
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <span className="bg-[#fe6b00]/10 text-[#fe6b00] border border-[#fe6b00]/40 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest rounded flex items-center gap-1">
              <Flame className="w-3 h-3" />
              FEATURED MATCH
            </span>
            <span className="bg-[#00f2ff]/10 text-[#00f2ff] border border-[#00f2ff]/40 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest rounded">
              {game}
            </span>
          </div>

          <div>
            <h3 className="font-display-lg text-xl sm:text-2xl text-[#00f2ff] font-extrabold uppercase tracking-tight group-hover:text-white transition-colors">
              {title}
            </h3>
            <p className="text-xs font-medium text-[#b9cacb] flex items-center gap-2 mt-1">
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-[#00dbe7]" />
                Squad Mode
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#fe6b00]" />
                Map: {mapName}
              </span>
            </p>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-3 pt-2 max-w-md">
            <div className="bg-[#0b0e11] p-2.5 rounded border border-[#3a494b]/60">
              <p className="text-[10px] font-bold tracking-widest text-[#849495] uppercase flex items-center gap-1">
                <Trophy className="w-3 h-3 text-[#fe6b00]" />
                PRIZE POOL
              </p>
              <p className="font-mono text-base sm:text-lg font-extrabold text-[#ffb693]">{prizePool}</p>
            </div>
            
            <div className="bg-[#0b0e11] p-2.5 rounded border border-[#3a494b]/60">
              <p className="text-[10px] font-bold tracking-widest text-[#849495] uppercase flex items-center gap-1">
                <Ticket className="w-3 h-3 text-[#00f2ff]" />
                ENTRY FEE
              </p>
              <p className="font-mono text-base sm:text-lg font-extrabold text-[#00f2ff]">{entryFee}</p>
            </div>

            <div className="bg-[#0b0e11] p-2.5 rounded border border-[#3a494b]/60">
              <p className="text-[10px] font-bold tracking-widest text-[#849495] uppercase">SLOTS</p>
              <p className="font-mono text-base sm:text-lg font-extrabold text-[#e1e2e7]">{filledSlots}/{totalSlots}</p>
            </div>
          </div>
        </div>

        {/* Right Side Slots & CTA */}
        <div className="flex flex-col gap-3 md:w-56 pt-2 md:pt-0 border-t md:border-t-0 border-[#3a494b]/60">
          <div className="flex justify-between items-center text-[10px] font-bold tracking-widest text-[#b9cacb]">
            <span>FILL STATUS</span>
            <span className="text-[#00f2ff]">{fillPercent}%</span>
          </div>
          
          <div className="w-full h-2 bg-[#111417] rounded-full overflow-hidden border border-[#3a494b]/40">
            <div
              className="bg-gradient-to-r from-[#00dbe7] via-[#00f2ff] to-[#fe6b00] h-full transition-all duration-500"
              style={{ width: `${fillPercent}%` }}
            ></div>
          </div>

          {tournament ? (
            <Link
              to={`/tournaments/${tournament.id}`}
              className="w-full bg-[#00f2ff] text-[#00363a] font-extrabold py-3 rounded text-xs tracking-wider flex items-center justify-center gap-1.5 hover:bg-[#74f5ff] active:scale-[0.98] transition-all uppercase shadow-[0_0_12px_rgba(0,242,255,0.3)] mt-1 min-h-[44px]"
            >
              <span>View Tournament</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          ) : (
            <Link
              to="/tournaments"
              className="w-full bg-[#151a21] text-[#8e9dae] font-bold py-3 rounded text-xs tracking-wider flex items-center justify-center gap-1.5 border border-[#3a494b] hover:text-[#00f2ff] transition-all uppercase mt-1 min-h-[44px]"
            >
              <span>Browse All Matches</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          )}
        </div>

      </div>
    </div>
  )
}
