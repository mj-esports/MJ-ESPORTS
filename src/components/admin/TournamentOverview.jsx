import React from 'react'
import { Trophy, Gamepad2 } from 'lucide-react'
import { getCapacityLabel } from '../../utils/tournamentUtils'

export default function TournamentOverview({ tournaments = [], loading, onManageClick }) {
  const getStatusStyle = (status) => {
    switch (status) {
      case 'Registration Open':
        return 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/40'
      case 'Live Now':
      case 'Live':
        return 'bg-[#FF8C00]/10 text-[#FF8C00] border-[#FF8C00]/40 animate-pulse'
      default:
        return 'bg-[#18181B] text-[#A1A1AA] border-[#27272A]'
    }
  }

  return (
    <div className="bg-[#18181B]/60 backdrop-blur-md border border-[#27272A] rounded-none p-5 space-y-4 shadow-xl">
      <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-[#FFB900]" />
          <h3 className="font-headline text-sm font-bold text-white uppercase tracking-wider">
            Arena Tournament Roster
          </h3>
        </div>
        {onManageClick && (
          <button
            onClick={onManageClick}
            className="text-[10px] font-mono font-bold text-[#FFB900] hover:underline flex items-center gap-1 uppercase tracking-wider cursor-pointer"
          >
            <span>Manage Arena &rarr;</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-8 text-center text-[#A1A1AA] text-xs space-y-2">
          <div className="w-6 h-6 border-2 border-[#FFB900] border-t-transparent rounded-none animate-spin mx-auto"></div>
          <span className="font-mono">Loading tournaments...</span>
        </div>
      ) : tournaments.length === 0 ? (
        <div className="py-8 text-center bg-[#000000] border border-[#27272A] rounded-none space-y-2 p-4">
          <Gamepad2 className="w-8 h-8 text-[#A1A1AA] mx-auto" />
          <p className="text-xs font-bold text-white uppercase">No Created Matches</p>
          <p className="text-[10px] text-[#A1A1AA] font-mono">Create an esports tournament to populate active lobby stream.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tournaments.map((t) => (
            <div
              key={`dash-tourn-${t.id}`}
              className="p-3.5 bg-[#000000] border border-[#27272A] hover:border-[#FFB900]/40 rounded-none text-xs flex items-center justify-between gap-3 shadow-md transition-all font-mono"
            >
              <div className="space-y-1 overflow-hidden">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-headline font-black text-white text-sm truncate">{t.title}</h4>
                  <span className="px-1.5 py-0.5 rounded-none text-[9px] font-bold bg-[#FFB900]/10 text-[#FFB900] border border-[#FFB900]/30 uppercase">
                    {t.game}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-[#A1A1AA]">
                  <span>Prize: <strong className="text-[#FF8C00]">{t.prizePool}</strong></span>
                  <span>Capacity: <strong className="text-[#FFB900]">{getCapacityLabel(t)}</strong></span>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded-none text-[9px] font-bold uppercase border shrink-0 ${getStatusStyle(t.status)}`}>
                {t.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
