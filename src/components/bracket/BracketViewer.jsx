import { Swords, Trophy, Crown } from 'lucide-react'

export default function BracketViewer({ bracket }) {
  if (!bracket) {
    return (
      <div className="p-8 text-center bg-slate-900/50 border border-slate-800 rounded-2xl text-slate-500 text-xs">
        No knockout bracket data configured for this tournament format yet.
      </div>
    )
  }

  const { quarterFinals = [], semiFinals = [], finals = [] } = bracket

  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 overflow-x-auto shadow-xl">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-400 mb-6">
        <Swords className="w-4 h-4" />
        <span>Knockout Elimination Bracket Tree</span>
      </div>

      <div className="flex items-center justify-between min-w-[700px] gap-8">
        
        {/* Quarter Finals */}
        <div className="space-y-4 flex-1">
          <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center pb-2 border-b border-slate-800">
            Quarter-Finals
          </h4>
          {quarterFinals.map((m) => (
            <div key={m.id} className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2 text-xs">
              <div className={`flex items-center justify-between px-2 py-1 rounded ${m.winner === m.team1 ? 'bg-purple-950/80 text-purple-300 font-bold border border-purple-800/40' : 'text-slate-400'}`}>
                <span>{m.team1}</span>
                <span>{m.score1}</span>
              </div>
              <div className={`flex items-center justify-between px-2 py-1 rounded ${m.winner === m.team2 ? 'bg-purple-950/80 text-purple-300 font-bold border border-purple-800/40' : 'text-slate-400'}`}>
                <span>{m.team2}</span>
                <span>{m.score2}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Semi Finals */}
        <div className="space-y-8 flex-1">
          <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center pb-2 border-b border-slate-800">
            Semi-Finals
          </h4>
          {semiFinals.map((m) => (
            <div key={m.id} className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2 text-xs">
              <div className={`flex items-center justify-between px-2 py-1 rounded ${m.winner === m.team1 ? 'bg-purple-950/80 text-purple-300 font-bold border border-purple-800/40' : 'text-slate-400'}`}>
                <span>{m.team1}</span>
                <span>{m.score1}</span>
              </div>
              <div className={`flex items-center justify-between px-2 py-1 rounded ${m.winner === m.team2 ? 'bg-purple-950/80 text-purple-300 font-bold border border-purple-800/40' : 'text-slate-400'}`}>
                <span>{m.team2}</span>
                <span>{m.score2}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Grand Finals */}
        <div className="space-y-12 flex-1">
          <h4 className="text-[11px] font-bold text-amber-400 uppercase tracking-widest text-center pb-2 border-b border-amber-500/30 flex items-center justify-center gap-1">
            <Crown className="w-3.5 h-3.5" />
            <span>Grand Finals</span>
          </h4>
          {finals.map((m) => (
            <div key={m.id} className="bg-gradient-to-br from-amber-950/40 to-slate-950 border border-amber-500/40 rounded-xl p-4 space-y-2 text-xs shadow-lg shadow-amber-500/10">
              <div className={`flex items-center justify-between px-2.5 py-1.5 rounded ${m.winner === m.team1 ? 'bg-amber-400 text-slate-950 font-extrabold' : 'text-slate-400'}`}>
                <span>{m.team1}</span>
                <span>{m.score1}</span>
              </div>
              <div className={`flex items-center justify-between px-2.5 py-1.5 rounded ${m.winner === m.team2 ? 'bg-amber-400 text-slate-950 font-extrabold' : 'text-slate-400'}`}>
                <span>{m.team2}</span>
                <span>{m.score2}</span>
              </div>
              {m.winner && (
                <div className="pt-2 text-center text-[11px] font-bold text-amber-300 uppercase tracking-widest flex items-center justify-center gap-1">
                  <Trophy className="w-3 h-3 text-amber-400" />
                  <span>Champion: {m.winner}</span>
                </div>
              )}
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
