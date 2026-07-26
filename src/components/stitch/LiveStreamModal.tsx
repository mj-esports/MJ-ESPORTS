import React from 'react'
import { X, Play, Radio, Flame, Trophy, ShieldCheck, Users, ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'

interface LiveStreamModalProps {
  isOpen: boolean
  onClose: () => void
  tournamentTitle?: string
  game?: string
  prizePool?: string
}

export const LiveStreamModal: React.FC<LiveStreamModalProps> = ({
  isOpen,
  onClose,
  tournamentTitle = 'Elite Pro Invitational 2026',
  game = 'Free Fire Battle Royale',
  prizePool = '₹5,00,000',
}) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#111417] border border-[#00f2ff]/40 rounded-2xl w-full max-w-4xl overflow-hidden shadow-[0_0_30px_rgba(0,242,255,0.25)] flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="bg-[#1d2023] px-6 py-4 border-b border-[#3a494b] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="bg-[#fe6b00] text-slate-950 px-2.5 py-1 font-extrabold text-[10px] rounded uppercase tracking-wider flex items-center gap-1.5 animate-pulse">
              <Radio className="w-3 h-3 text-slate-950" />
              LIVE BROADCAST
            </span>
            <h3 className="font-display-lg text-lg font-bold text-[#00f2ff] uppercase tracking-wide truncate max-w-md">
              {tournamentTitle}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#b9cacb] hover:text-white hover:bg-[#323538] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stream Player Screen Mockup */}
        <div className="relative aspect-video bg-[#0b0e11] flex items-center justify-center border-b border-[#3a494b]/60 overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-40 blur-sm scale-105"
            style={{
              backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuBacNVSdtrcu8WbC9AHQ1ShOiqK-AyN1E6oxhKIW8nk74SBLnFylDBp8P-tP3W7vUNp8nEyIkUWk3h81XRD4CP-L6SyzOlUjwcOopRMQuf86hmDExpyOThoCyBFVk02mD3kgtJWI7v5UId7EXl9fuac5La4UyppuFWzw8mL845-TU4UrgFyqKqvuHAguHlU5Cq6bMSPQFl8Nq0jcLBrKsIN4pjk8PzJaRLFig3oagy_-7gz_5VyKmErHVos4moSWZnphWyaWc8ynw')`,
            }}
          ></div>

          {/* Central Overlay */}
          <div className="relative z-10 flex flex-col items-center justify-center p-6 text-center space-y-4 max-w-lg">
            <div className="w-16 h-16 rounded-full bg-[#00f2ff]/20 border-2 border-[#00f2ff] flex items-center justify-center shadow-[0_0_20px_rgba(0,242,255,0.4)] animate-pulse">
              <Play className="w-8 h-8 text-[#00f2ff] ml-1" />
            </div>

            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-widest text-[#fe6b00]">
                Official Stream Feed &bull; 1080p 60FPS
              </p>
              <h4 className="text-xl font-extrabold text-white uppercase">{game}</h4>
              <p className="text-xs text-[#b9cacb]">
                Featuring Top Squads competing live for total prize pool of{' '}
                <span className="text-[#00f2ff] font-bold">{prizePool}</span>
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Link
                to="/live"
                onClick={onClose}
                className="px-5 py-2.5 bg-[#00f2ff] text-[#00363a] font-extrabold text-xs rounded uppercase tracking-wider flex items-center gap-2 hover:bg-[#74f5ff] transition-all"
              >
                <span>OPEN FULL ARENA CENTER</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Modal Footer / Stats */}
        <div className="p-5 bg-[#161b22] flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6 text-xs">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-[#fe6b00]" />
              <div>
                <span className="text-[10px] font-bold text-[#849495] uppercase block">PRIZE POOL</span>
                <span className="font-mono font-bold text-[#ffb693]">{prizePool}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 border-l border-[#3a494b] pl-6">
              <ShieldCheck className="w-4 h-4 text-[#00f2ff]" />
              <div>
                <span className="text-[10px] font-bold text-[#849495] uppercase block">STATUS</span>
                <span className="font-bold text-[#00f2ff]">Match Day 3 - Final Round</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#272a2e] text-[#e1e2e7] font-bold text-xs rounded hover:bg-[#323538] transition-colors uppercase"
          >
            Close Stream
          </button>
        </div>

      </div>
    </div>
  )
}
