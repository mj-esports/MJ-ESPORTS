import React from 'react'
import { Trophy, Gamepad2 } from 'lucide-react'

export default function TournamentOverview({ tournaments = [], loading, onManageClick }) {
  const getStatusStyle = (status) => {
    switch (status) {
      case 'Registration Open':
        return 'bg-[#00ff9d]/10 text-[#00ff9d] border-[#00ff9d]/40'
      case 'Live Now':
      case 'Live':
        return 'bg-[#fe6b00]/10 text-[#fe6b00] border-[#fe6b00]/40 animate-pulse'
      default:
        return 'bg-[#18181b] text-[#a1a1aa] border-[#27272a]'
    }
  }

  return (
    <div className="bg-[#18181b]/60 backdrop-blur-md border border-[#27272a] rounded-2xl p-5 space-y-4 shadow-xl">
      <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-[#00f2ff]" />
          <h3 className="font-headline text-sm font-bold text-white uppercase tracking-wider">
            Arena Tournament Roster
          </h3>
        </div>
        {onManageClick && (
          <button
            onClick={onManageClick}
            className="text-[10px] font-mono font-bold text-[#00f2ff] hover:underline flex items-center gap-1 uppercase tracking-wider cursor-pointer"
          >
            <span>Manage Arena &rarr;</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-8 text-center text-[#a1a1aa] text-xs space-y-2">
          <div className="w-6 h-6 border-2 border-[#00f2ff] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <span className="font-mono">Loading tournaments...</span>
        </div>
      ) : tournaments.length === 0 ? (
        <div className="py-8 text-center bg-[#09090b] border border-[#27272a] rounded-xl space-y-2 p-4">
          <Gamepad2 className="w-8 h-8 text-[#a1a1aa] mx-auto" />
          <p className="text-xs font-bold text-white uppercase">No Created Matches</p>
          <p className="text-[10px] text-[#a1a1aa] font-mono">Create an esports tournament to populate active lobby stream.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tournaments.map((t) => (
            <div
              key={`dash-tourn-${t.id}`}
              className="p-3.5 bg-[#09090b] border border-[#27272a] hover:border-[#00f2ff]/40 rounded-xl text-xs flex items-center justify-between gap-3 shadow-md transition-all font-mono"
            >
              <div className="space-y-1 overflow-hidden">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-headline font-black text-white text-sm truncate">{t.title}</h4>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#00f2ff]/10 text-[#00f2ff] border border-[#00f2ff]/30 uppercase">
                    {t.game}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-[#a1a1aa]">
                  <span>Prize: <strong className="text-[#fe6b00]">{t.prizePool}</strong></span>
                  <span>Capacity: <strong className="text-[#00f2ff]">{t.registeredTeams}/{t.maxTeams}</strong></span>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border shrink-0 ${getStatusStyle(t.status)}`}>
                {t.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
