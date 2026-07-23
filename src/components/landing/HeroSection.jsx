import { Link } from 'react-router-dom'
import { Trophy, Flame, ArrowRight, Shield, Zap } from 'lucide-react'

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-12 pb-16 lg:pt-20 lg:pb-28 bg-slate-950 border-b border-slate-900">
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto space-y-6">
          
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-950 border border-purple-800 text-purple-300 text-xs font-semibold shadow-lg">
            <Flame className="w-3.5 h-3.5 text-orange-400" />
            <span>Season 2026 Tournaments Now Live</span>
          </div>

          {/* Headline */}
          <h1 className="text-3xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white uppercase leading-tight">
            ELEVATE YOUR GAME.{' '}
            <span className="text-purple-400">
              DOMINATE THE ARENA.
            </span>
          </h1>

          {/* Short Description */}
          <p className="text-slate-400 text-xs sm:text-lg max-w-2xl mx-auto leading-relaxed">
            MJ ESPORTS is the premier competitive tournament hub for pro players and grassroots teams. Join battle royales, knockout brackets, and claim instant cash rewards.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              to="/tournaments"
              className="w-full sm:w-auto px-8 py-4 text-xs sm:text-sm font-bold text-slate-950 bg-gradient-to-r from-purple-400 via-indigo-300 to-cyan-300 rounded-xl hover:brightness-110 shadow-xl flex items-center justify-center gap-2 min-h-[44px]"
            >
              <Trophy className="w-4 h-4 text-slate-950" />
              <span>Join Tournament</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            
            <Link
              to="/tournaments"
              className="w-full sm:w-auto px-8 py-4 text-xs sm:text-sm font-semibold text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition-colors flex items-center justify-center gap-2 min-h-[44px]"
            >
              <span>Explore Tournaments</span>
            </Link>
          </div>

          {/* Micro Feature Ticker */}
          <div className="pt-8 flex flex-wrap justify-center items-center gap-6 text-xs text-slate-400 font-medium">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span>Instant Slot Booking</span>
            </div>
            <div className="w-1.5 h-1.5 rounded-full bg-slate-800 hidden sm:block"></div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>Verified Anti-Cheat</span>
            </div>
            <div className="w-1.5 h-1.5 rounded-full bg-slate-800 hidden sm:block"></div>
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-purple-400" />
              <span>Guaranteed Prize Pool</span>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
