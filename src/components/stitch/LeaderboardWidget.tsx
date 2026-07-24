import React from 'react'
import { LeaderboardPlayerItem } from '../../types/esports'
import { Trophy, Award } from 'lucide-react'
import { Link } from 'react-router-dom'

interface LeaderboardWidgetProps {
  players?: LeaderboardPlayerItem[]
}

const DEFAULT_PLAYERS: LeaderboardPlayerItem[] = [
  { rank: '01', player: 'Total Gaming', kills: 42, earned: '₹3,20,000', game: 'Free Fire' },
  { rank: '02', player: 'GodLike Esports', kills: 38, earned: '₹2,10,000', game: 'BGMI' },
  { rank: '03', player: 'EVOS Phoenix', kills: 35, earned: '₹1,45,000', game: 'Free Fire' },
  { rank: '04', player: 'Orangutan Elite', kills: 29, earned: '₹95,000', game: 'Free Fire' },
]

export const LeaderboardWidget: React.FC<LeaderboardWidgetProps> = ({ players = DEFAULT_PLAYERS }) => {
  return (
    <div className="glass-panel border border-[#3a494b] rounded-lg overflow-hidden shadow-lg">
      <div className="bg-[#272a2e] px-4 py-3 border-b border-[#3a494b] flex items-center justify-between">
        <h3 className="font-display-lg text-[#00f2ff] font-extrabold text-sm uppercase tracking-wider flex items-center gap-2">
          <Trophy className="w-4 h-4 text-[#fe6b00]" />
          TODAY'S TOP SQUADS
        </h3>
        <Link to="/leaderboard" className="text-[10px] font-bold text-[#00f2ff] hover:underline uppercase">
          VIEW ALL
        </Link>
      </div>

      <div className="p-3">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="text-[10px] font-bold text-[#b9cacb] border-b border-[#3a494b]/50 uppercase tracking-wider">
              <th className="py-2 px-1">RANK</th>
              <th className="py-2 px-1">SQUAD</th>
              <th className="py-2 px-1 text-right">KILLS</th>
              <th className="py-2 px-1 text-right">EARNED</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#3a494b]/30">
            {players.map((item, idx) => (
              <tr key={`lb-${idx}`} className="hover:bg-[#323538]/60 transition-colors">
                <td className="py-2.5 px-1 font-mono font-bold">
                  <span className={idx === 0 ? 'text-[#fe6b00]' : idx === 1 ? 'text-[#00f2ff]' : 'text-[#b9cacb]'}>
                    {item.rank}
                  </span>
                </td>
                <td className="py-2.5 px-1 font-bold text-[#e1e2e7] flex items-center gap-1.5">
                  {idx === 0 && <Award className="w-3.5 h-3.5 text-[#fe6b00] shrink-0" />}
                  <span className="truncate max-w-[110px]">{item.player}</span>
                </td>
                <td className="py-2.5 px-1 text-right font-mono font-semibold text-[#b9cacb]">{item.kills}</td>
                <td className="py-2.5 px-1 text-right font-mono font-extrabold text-[#ffb693]">{item.earned}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
