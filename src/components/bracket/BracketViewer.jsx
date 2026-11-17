import { Swords, Trophy, Crown } from 'lucide-react'

export default function BracketViewer({ bracket }) {
  if (!bracket) {
    return (
      <div className="p-8 text-center bg-[#111215] border border-[#27272A] rounded-none text-[#A1A1AA] text-xs">
        No knockout bracket data configured for this tournament format yet.
      </div>
    )
  }

  const { quarterFinals = [], semiFinals = [], finals = [] } = bracket

  return (
    <div className="bg-[#111215] border border-[#27272A] rounded-none p-6 overflow-x-auto shadow-xl">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#FFB900] mb-6">
        <Swords className="w-4 h-4 text-[#FFB900]" />
        <span>Knockout Elimination Bracket Tree</span>
      </div>

      <div className="flex items-center justify-between min-w-[700px] gap-8">
        
        {/* Quarter Finals */}
        <div className="space-y-4 flex-1">
          <h4 className="text-[11px] font-bold text-[#A1A1AA] uppercase tracking-widest text-center pb-2 border-b border-[#27272A]">
            Quarter-Finals
          </h4>
          {quarterFinals.map((m) => (
            <div key={m.id} className="bg-[#18181B] border border-[#27272A] rounded-none p-3 space-y-2 text-xs">
              <div className={`flex items-center justify-between px-2 py-1 rounded-none ${m.winner === m.team1 ? 'bg-[#FFB900]/15 text-[#FFB900] font-bold border border-[#FFB900]/40' : 'text-[#A1A1AA]'}`}>
                <span>{m.team1}</span>
                <span>{m.score1}</span>
              </div>
              <div className={`flex items-center justify-between px-2 py-1 rounded-none ${m.winner === m.team2 ? 'bg-[#FFB900]/15 text-[#FFB900] font-bold border border-[#FFB900]/40' : 'text-[#A1A1AA]'}`}>
                <span>{m.team2}</span>
                <span>{m.score2}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Semi Finals */}
        <div className="space-y-8 flex-1">
          <h4 className="text-[11px] font-bold text-[#A1A1AA] uppercase tracking-widest text-center pb-2 border-b border-[#27272A]">
            Semi-Finals
          </h4>
          {semiFinals.map((m) => (
            <div key={m.id} className="bg-[#18181B] border border-[#27272A] rounded-none p-3 space-y-2 text-xs">
              <div className={`flex items-center justify-between px-2 py-1 rounded-none ${m.winner === m.team1 ? 'bg-[#FFB900]/15 text-[#FFB900] font-bold border border-[#FFB900]/40' : 'text-[#A1A1AA]'}`}>
                <span>{m.team1}</span>
                <span>{m.score1}</span>
              </div>
              <div className={`flex items-center justify-between px-2 py-1 rounded-none ${m.winner === m.team2 ? 'bg-[#FFB900]/15 text-[#FFB900] font-bold border border-[#FFB900]/40' : 'text-[#A1A1AA]'}`}>
                <span>{m.team2}</span>
                <span>{m.score2}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Grand Finals */}
        <div className="space-y-12 flex-1">
          <h4 className="text-[11px] font-bold text-[#FFB900] uppercase tracking-widest text-center pb-2 border-b border-[#FFB900]/30 flex items-center justify-center gap-1">
            <Crown className="w-3.5 h-3.5 text-[#FFB900]" />
            <span>Grand Finals</span>
          </h4>
          {finals.map((m) => (
            <div key={m.id} className="bg-[#18181B] border border-[#FFB900]/40 rounded-none p-4 space-y-2 text-xs shadow-md">
              <div className={`flex items-center justify-between px-2.5 py-1.5 rounded-none ${m.winner === m.team1 ? 'bg-[#FFB900] text-black font-extrabold' : 'text-[#A1A1AA]'}`}>
                <span>{m.team1}</span>
                <span>{m.score1}</span>
              </div>
              <div className={`flex items-center justify-between px-2.5 py-1.5 rounded-none ${m.winner === m.team2 ? 'bg-[#FFB900] text-black font-extrabold' : 'text-[#A1A1AA]'}`}>
                <span>{m.team2}</span>
                <span>{m.score2}</span>
              </div>
              {m.winner && (
                <div className="pt-2 text-center text-[11px] font-bold text-[#FFB900] uppercase tracking-widest flex items-center justify-center gap-1">
                  <Trophy className="w-3 h-3 text-[#FFB900]" />
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
