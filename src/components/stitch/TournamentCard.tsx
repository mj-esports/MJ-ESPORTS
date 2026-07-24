import React from 'react'
import { Link } from 'react-router-dom'
import { TournamentItem } from '../../types/esports'
import { Trophy, Flame, Gamepad2, ArrowRight } from 'lucide-react'

interface TournamentCardProps {
  tournament: TournamentItem
}

export const TournamentCard: React.FC<TournamentCardProps> = ({ tournament }) => {
  const isUrgent = tournament.status === 'URGENT' || tournament.registeredTeams >= tournament.maxTeams * 0.85
  const isLive = tournament.status === 'Live Now'
  const isFreeFire = tournament.game?.toLowerCase().includes('free fire')

  const fillPercent = tournament.fillPercentage ?? Math.min(100, Math.round((tournament.registeredTeams / (tournament.maxTeams || 1)) * 100))

  return (
    <div className={`glass-panel border border-[#3a494b] p-5 rounded-lg relative flex flex-col justify-between group hover:neon-border-primary transition-all duration-300 shadow-lg ${
      isUrgent ? 'hover:neon-border-secondary' : ''
    }`}>
      {/* Top Header */}
      <div className="flex justify-between items-start mb-4 gap-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 border ${
              isFreeFire
                ? 'bg-orange-950/80 text-orange-400 border-orange-500/40'
                : 'bg-cyan-950/80 text-cyan-400 border-cyan-500/40'
            }`}>
              <Gamepad2 className="w-3 h-3" />
              {tournament.game}
            </span>
          </div>
          <h3 className="font-extrabold text-lg text-[#00f2ff] group-hover:text-white transition-colors line-clamp-1">
            {tournament.title}
          </h3>
          <p className="text-xs font-medium text-[#b9cacb] mt-0.5">
            {tournament.format}
          </p>
        </div>

        <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border rounded shrink-0 ${
          isLive
            ? 'bg-red-950/90 text-red-400 border-red-800 animate-pulse'
            : isUrgent
            ? 'bg-[#fe6b00]/20 text-[#fe6b00] border-[#fe6b00]'
            : 'bg-[#00f2ff]/10 text-[#00f2ff] border-[#00f2ff]'
        }`}>
          {tournament.status}
        </span>
      </div>

      {/* Prize & Entry Stat Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-[#191c1f] p-3 rounded border border-slate-800">
          <p className="text-[10px] font-bold text-[#b9cacb] uppercase tracking-wider">PRIZE POOL</p>
          <p className="font-mono text-base font-extrabold text-[#fe6b00] tracking-tight mt-0.5">{tournament.prizePool}</p>
        </div>
        <div className="bg-[#191c1f] p-3 rounded border border-slate-800">
          <p className="text-[10px] font-bold text-[#b9cacb] uppercase tracking-wider">ENTRY FEE</p>
          <p className="font-mono text-base font-extrabold text-[#00f2ff] tracking-tight mt-0.5">{tournament.entryFee}</p>
        </div>
      </div>

      {/* Slot Filling Bar */}
      <div className="mt-auto pt-2">
        <div className="flex justify-between items-center mb-1 text-[11px] font-mono font-bold text-[#b9cacb]">
          <span>SLOTS: {tournament.registeredTeams}/{tournament.maxTeams}</span>
          <span>{fillPercent}%</span>
        </div>
        
        <div className="w-full h-1.5 bg-[#323538] rounded-full overflow-hidden mb-4">
          <div
            className={`h-full transition-all duration-500 ${
              fillPercent > 80 ? 'bg-[#fe6b00]' : 'bg-[#00f2ff]'
            }`}
            style={{ width: `${fillPercent}%` }}
          ></div>
        </div>

        {/* Join Button */}
        <Link
          to={`/tournaments/${tournament.id}`}
          className="w-full bg-[#00f2ff] text-[#00363a] font-extrabold py-2.5 rounded text-xs tracking-wider flex items-center justify-center gap-2 hover:bg-[#74f5ff] active:scale-[0.98] transition-all uppercase shadow-[0_0_10px_rgba(0,242,255,0.3)]"
        >
          <span>JOIN MATCH</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  )
}
