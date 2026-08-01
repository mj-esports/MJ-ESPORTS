import React from 'react'
import { Play, Flame, Trophy, Radio, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'

interface HeroBannerProps {
  title?: string
  prizePool?: string
  timer?: string
  onWatchLive?: () => void
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  title = 'Elite Pro Invitational 2026',
  prizePool = '₹5,00,000',
  timer = '01:24:55',
  onWatchLive,
}) => {
  return (
    <section className="relative h-[360px] sm:h-[400px] w-full mb-8 rounded-xl overflow-hidden border border-[#3a494b] group shadow-[0_0_20px_rgba(0,219,231,0.15)]">
      {/* Dark Ambient Overlay Gradients */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#0b0e11] via-[#0b0e11]/80 to-transparent z-10"></div>
      <div className="absolute inset-0 bg-gradient-to-t from-[#0b0e11] via-transparent to-transparent z-10"></div>

      {/* Hero Action Image Background */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
        style={{
          backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuBacNVSdtrcu8WbC9AHQ1ShOiqK-AyN1E6oxhKIW8nk74SBLnFylDBp8P-tP3W7vUNp8nEyIkUWk3h81XRD4CP-L6SyzOlUjwcOopRMQuf86hmDExpyOThoCyBFVk02mD3kgtJWI7v5UId7EXl9fuac5La4UyppuFWzw8mL845-TU4UrgFyqKqvuHAguHlU5Cq6bMSPQFl8Nq0jcLBrKsIN4pjk8PzJaRLFig3oagy_-7gz_5VyKmErHVos4moSWZnphWyaWc8ynw')`,
        }}
      ></div>

      {/* Content Content Container */}
      <div className="relative z-20 h-full flex flex-col justify-center px-6 sm:px-10 max-w-3xl space-y-4">
        {/* Status Tag */}
        <div className="flex items-center gap-3">
          <span className="bg-[#fe6b00] text-slate-950 px-3 py-1 font-bold text-xs rounded uppercase tracking-wider animate-pulse flex items-center gap-1.5 shadow-[0_0_12px_rgba(254,107,0,0.5)]">
            <Flame className="w-3.5 h-3.5 fill-slate-950" />
            LIVE NOW
          </span>
          <span className="font-mono text-[#fe6b00] text-sm font-extrabold tracking-widest bg-black/60 px-2.5 py-1 rounded border border-orange-500/30">
            {timer}
          </span>
        </div>

        {/* Title */}
        <h1 className="font-display-lg text-2xl xs:text-3xl sm:text-5xl text-[#00f2ff] uppercase tracking-tight font-extrabold drop-shadow-[0_0_15px_rgba(0,242,255,0.4)]">
          {title}
        </h1>

        {/* Prize Pool Display */}
        <div className="flex items-center gap-6 pt-1">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold tracking-widest text-[#b9cacb] uppercase">PRIZE POOL</span>
            <span className="text-2xl sm:text-3xl font-extrabold text-[#ffb693] tracking-tight flex items-center gap-1">
              <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-[#fe6b00]" />
              {prizePool}
            </span>
          </div>

          <div className="hidden sm:flex flex-col border-l border-[#3a494b] pl-6">
            <span className="text-[10px] font-bold tracking-widest text-[#b9cacb] uppercase">TOURNAMENTS MODE</span>
            <span className="text-sm font-bold text-[#e1e2e7] flex items-center gap-1 mt-1">
              <ShieldCheck className="w-4 h-4 text-[#00dbe7]" />
              Free Fire & BGMI Squad Battle Royale
            </span>
          </div>
        </div>

        {/* CTA Watch / Register Buttons */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 pt-2">
          {onWatchLive ? (
            <button
              onClick={onWatchLive}
              className="bg-[#00f2ff] text-[#00363a] font-extrabold px-4 sm:px-6 py-3 rounded text-xs tracking-wider flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shimmer-effect shadow-[0_0_15px_rgba(0,242,255,0.4)] uppercase min-h-[44px]"
            >
              <Radio className="w-4 h-4 text-[#00363a] animate-pulse shrink-0" />
              <span>WATCH STREAM NOW</span>
            </button>
          ) : (
            <Link
              to="/live"
              className="bg-[#00f2ff] text-[#00363a] font-extrabold px-4 sm:px-6 py-3 rounded text-xs tracking-wider flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shimmer-effect shadow-[0_0_15px_rgba(0,242,255,0.4)] uppercase min-h-[44px]"
            >
              <Radio className="w-4 h-4 text-[#00363a] animate-pulse shrink-0" />
              <span>WATCH STREAM NOW</span>
            </Link>
          )}
          <Link
            to="/tournaments"
            className="bg-[#1d2023] text-[#e1e2e7] font-bold px-4 sm:px-6 py-3 rounded text-[#e1e2e7] text-xs tracking-wider border border-[#3a494b] hover:border-[#00dbe7] hover:text-[#00dbe7] transition-all uppercase min-h-[44px] flex items-center"
          >
            JOIN TOURNAMENTS
          </Link>
        </div>
      </div>

      {/* Progress Bar Footer */}
      <div className="absolute bottom-0 left-0 w-full h-1.5 bg-[#1d2023] z-20">
        <div className="h-full bg-gradient-to-r from-[#00dbe7] via-[#00f2ff] to-[#fe6b00]" style={{ width: '70%' }}></div>
      </div>
    </section>
  )
}
