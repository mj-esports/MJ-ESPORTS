import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Trophy, Calendar, ArrowRight, Gamepad2, Flame, ShieldAlert, Sparkles } from 'lucide-react'
import { useTournaments } from '../../contexts/TournamentContext'
import { INITIAL_TOURNAMENTS } from '../../data/mockData'

export default function FeaturedTournaments() {
  const { tournaments } = useTournaments()
  const [selectedGame, setSelectedGame] = useState('ALL')

  // Fallback to INITIAL_TOURNAMENTS if context is empty
  const activeList = tournaments && tournaments.length > 0 ? tournaments : INITIAL_TOURNAMENTS

  const filtered = selectedGame === 'ALL'
    ? activeList.slice(0, 6)
    : activeList.filter(t => t.game?.toLowerCase().includes(selectedGame.toLowerCase())).slice(0, 6)

  return (
    <section className="py-12 sm:py-16 bg-[#080c14] border-y border-cyan-500/20 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 sm:mb-12 gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-cyan-400 mb-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Free Fire & BGMI Esports Competitions</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              FEATURED <span className="text-cyan-400">TOURNAMENTS</span>
            </h2>
          </div>

          {/* Game Filter Tabs */}
          <div className="flex items-center gap-2 bg-slate-900/90 p-1.5 rounded-xl border border-cyan-500/20 self-start sm:self-auto">
            {['ALL', 'Free Fire', 'BGMI'].map(game => (
              <button
                key={`game-tab-${game}`}
                onClick={() => setSelectedGame(game)}
                className={`px-3.5 py-1.5 text-xs font-extrabold rounded-lg transition-all ${
                  selectedGame === game
                    ? 'bg-cyan-400 text-slate-950 shadow-[0_0_12px_rgba(0,240,255,0.5)]'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
                }`}
              >
                {game}
              </button>
            ))}
          </div>
        </div>

        {/* Tournament Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((t) => {
            const isFreeFire = t.game?.toLowerCase().includes('free fire')
            return (
              <div
                key={`featured-card-${t.id}`}
                className={`bg-slate-900/90 border ${
                  t.status === 'Live Now'
                    ? 'border-orange-500/60 shadow-[0_0_20px_rgba(255,107,0,0.25)]'
                    : 'border-cyan-500/30 shadow-[0_0_15px_rgba(0,240,255,0.1)]'
                } rounded-2xl overflow-hidden flex flex-col justify-between hover:border-cyan-400 transition-all duration-300 group`}
              >
                {/* Card Banner */}
                <div className="p-5 sm:p-6 bg-slate-950/80 border-b border-slate-800 space-y-3 relative">
                  <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                    <span className={`px-2.5 py-1 rounded-md text-[11px] font-extrabold uppercase tracking-wider border flex items-center gap-1.5 shrink-0 ${
                      isFreeFire
                        ? 'bg-orange-950/80 text-orange-400 border-orange-500/40'
                        : 'bg-cyan-950/80 text-cyan-400 border-cyan-500/40'
                    }`}>
                      <Gamepad2 className="w-3.5 h-3.5" />
                      {t.game}
                    </span>
                    
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border shrink-0 flex items-center gap-1 ${
                      t.status === 'Live Now'
                        ? 'bg-red-950/90 text-red-400 border-red-800 shadow-[0_0_10px_rgba(239,68,68,0.4)] animate-pulse'
                        : t.status === 'Registration Open'
                        ? 'bg-emerald-950/90 text-emerald-400 border-emerald-800'
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}>
                      {t.status === 'Live Now' && <Flame className="w-3 h-3 text-red-400" />}
                      {t.status}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg sm:text-xl font-extrabold text-white group-hover:text-cyan-400 transition-colors">
                      {t.title}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 font-semibold flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      {t.format}
                    </p>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-5 sm:p-6 space-y-4 flex-1 flex flex-col justify-between">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-[#080c14] p-3 rounded-xl border border-amber-500/30">
                      <span className="text-slate-400 text-[10px] uppercase font-extrabold block tracking-wider">Prize Pool</span>
                      <span className="text-amber-400 font-extrabold text-base tracking-tight">{t.prizePool}</span>
                    </div>
                    <div className="bg-[#080c14] p-3 rounded-xl border border-cyan-500/30">
                      <span className="text-slate-400 text-[10px] uppercase font-extrabold block tracking-wider">Slots</span>
                      <span className="text-cyan-400 font-extrabold text-sm">
                        {t.registeredTeams} / {t.maxTeams} Teams
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800 gap-2">
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="font-semibold text-slate-300">Starts {t.startDate}</span>
                    </div>
                    <Link
                      to={`/tournaments/${t.id}`}
                      className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-extrabold shadow-[0_0_10px_rgba(255,107,0,0.3)] hover:brightness-110 transition-all text-xs shrink-0 flex items-center justify-center min-h-[38px] uppercase tracking-wider"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* View All Tournaments CTA Footer */}
        <div className="mt-10 text-center">
          <Link
            to="/tournaments"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 border border-cyan-500/40 text-cyan-400 hover:text-white hover:bg-slate-800 text-xs font-extrabold shadow-[0_0_15px_rgba(0,240,255,0.2)] transition-all uppercase tracking-wider"
          >
            <span>Explore All Free Fire & BGMI Competitions</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

      </div>
    </section>
  )
}
