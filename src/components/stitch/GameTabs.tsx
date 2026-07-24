import React from 'react'
import { GameType } from '../../types/esports'
import { Flame, Gamepad2, Grid } from 'lucide-react'

interface GameTabsProps {
  selectedGame: GameType
  onSelectGame: (game: GameType) => void
}

export const GameTabs: React.FC<GameTabsProps> = ({ selectedGame, onSelectGame }) => {
  const tabs: { id: GameType; label: string; icon: React.ReactNode }[] = [
    { id: 'ALL', label: 'All Matches', icon: <Grid className="w-4 h-4" /> },
    { id: 'Free Fire', label: 'Free Fire Max', icon: <Flame className="w-4 h-4 text-orange-400" /> },
    { id: 'BGMI', label: 'BGMI Mobile', icon: <Gamepad2 className="w-4 h-4 text-cyan-400" /> },
  ]

  return (
    <div className="flex items-center gap-3 mb-6 overflow-x-auto pb-2 scrollbar-none">
      {tabs.map((tab) => {
        const isActive = selectedGame === tab.id
        return (
          <button
            key={`stitch-tab-${tab.id}`}
            onClick={() => onSelectGame(tab.id)}
            className={`px-6 py-2.5 rounded font-extrabold uppercase text-xs tracking-wider flex items-center gap-2 border transition-all duration-200 active:scale-95 whitespace-nowrap cursor-pointer ${
              isActive
                ? 'bg-[#00f2ff] text-[#00363a] border-[#00f2ff] shadow-[0_0_15px_rgba(0,242,255,0.4)]'
                : 'bg-[#1d2023] text-[#b9cacb] border-[#3a494b] hover:border-[#00dbe7] hover:text-white'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        )
      })}
    </div>
  )
}
