import { Link } from 'react-router-dom'
import { Trophy, Flame, ArrowRight, Shield, Zap, Gamepad2, Radio } from 'lucide-react'

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-12 pb-16 lg:pt-20 lg:pb-28 bg-[#090d16] border-b border-cyan-500/20">
      
      {/* Background Cyber Lines & Glowing Grids */}
      <div className="absolute inset-0 bg-[radial-gradient(#00f0ff_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-4xl mx-auto space-y-6">
          
          {/* Live Status Pill */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/90 border border-orange-500/40 text-orange-400 text-xs font-bold shadow-[0_0_15px_rgba(255,107,0,0.3)]">
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping"></span>
            <Flame className="w-4 h-4 text-orange-500" />
            <span>FREE FIRE & BGMI SEASON 2026 LIVE NOW</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white uppercase leading-tight">
            ELEVATE YOUR GAME.{' '}
            <span className="bg-gradient-to-r from-cyan-400 via-cyan-300 to-amber-400 bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(0,240,255,0.4)]">
              DOMINATE THE ARENA.
            </span>
          </h1>

          {/* Short Description */}
          <p className="text-slate-300 text-sm sm:text-lg max-w-2xl mx-auto leading-relaxed font-medium">
            MJ ESPORTS is India's premier high-stakes tournament platform for <strong className="text-cyan-400 font-extrabold">Free Fire</strong> and <strong className="text-amber-400 font-extrabold">BGMI</strong> squads. Compete in daily battle royales, Clash Squad knockouts, and claim instant cash rewards.
          </p>

          {/* Featured Game Tags */}
          <div className="flex justify-center items-center gap-3 pt-1">
            <span className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-cyan-500/40 text-cyan-400 text-xs font-extrabold flex items-center gap-2 shadow-[0_0_10px_rgba(0,240,255,0.2)]">
              <Gamepad2 className="w-4 h-4 text-cyan-400" />
              Free Fire Max
            </span>
            <span className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-amber-500/40 text-amber-400 text-xs font-extrabold flex items-center gap-2 shadow-[0_0_10px_rgba(255,107,0,0.2)]">
              <Gamepad2 className="w-4 h-4 text-amber-400" />
              BGMI Mobile
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              to="/tournaments"
              className="w-full sm:w-auto px-8 py-4 text-xs sm:text-sm font-extrabold text-slate-950 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 rounded-xl hover:brightness-110 shadow-[0_0_20px_rgba(255,107,0,0.4)] flex items-center justify-center gap-2 min-h-[44px] uppercase tracking-wider transition-all"
            >
              <Trophy className="w-4 h-4 text-slate-950" />
              <span>Join Free Fire & BGMI Matches</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            
            <Link
              to="/live"
              className="w-full sm:w-auto px-8 py-4 text-xs sm:text-sm font-bold text-cyan-400 bg-slate-900/90 hover:bg-slate-800 border border-cyan-500/40 rounded-xl transition-all shadow-[0_0_15px_rgba(0,240,255,0.2)] flex items-center justify-center gap-2 min-h-[44px]"
            >
              <Radio className="w-4 h-4 text-red-500 animate-pulse" />
              <span>Watch Live Streams</span>
            </Link>
          </div>

          {/* Micro Feature Ticker */}
          <div className="pt-8 flex flex-wrap justify-center items-center gap-6 text-xs text-slate-300 font-semibold">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Instant Slot Booking</span>
            </div>
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-500/40 hidden sm:block"></div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-cyan-400" />
              <span>Anti-Cheat Protected</span>
            </div>
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-500/40 hidden sm:block"></div>
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Guaranteed Prize Pool Payouts</span>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
