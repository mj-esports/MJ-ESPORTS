import { Link } from 'react-router-dom'
import { Trophy, Users, Calendar, ArrowRight, Gamepad2, Flame } from 'lucide-react'
import { useTournaments } from '../../contexts/TournamentContext'

export default function FeaturedTournaments() {
  const { tournaments } = useTournaments()

  // Top 3 featured tournaments
  const featured = tournaments.slice(0, 3)

  return (
    <section className="py-12 sm:py-16 bg-slate-950 border-y border-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 sm:mb-12 gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-400 mb-2">
              <Trophy className="w-4 h-4" />
              <span>Competitions</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              FEATURED TOURNAMENTS
            </h2>
          </div>
          <Link
            to="/tournaments"
            className="text-xs font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1 group transition-colors self-start sm:self-auto"
          >
            <span>View All Tournaments</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Tournament Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {featured.map((t) => (
            <div
              key={`featured-card-${t.id}`}
              className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col justify-between shadow-xl"
            >
              {/* Card Banner */}
              <div className="p-5 sm:p-6 bg-slate-950/80 border-b border-slate-800 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                  <span className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wide bg-slate-900 text-cyan-300 border border-cyan-500/30 flex items-center gap-1.5 shrink-0">
                    <Gamepad2 className="w-3.5 h-3.5" />
                    {t.game}
                  </span>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border shrink-0 ${
                    t.status === 'Live Now'
                      ? 'bg-red-950 text-red-400 border-red-800'
                      : t.status === 'Registration Open'
                      ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                      : 'bg-purple-950 text-purple-400 border-purple-800'
                  }`}>
                    {t.status}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-white">
                    {t.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 font-semibold">{t.format}</p>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 sm:p-6 space-y-4 flex-1 flex flex-col justify-between">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-500 text-[10px] uppercase font-bold block">Prize Pool</span>
                    <span className="text-emerald-400 font-extrabold text-sm">{t.prizePool}</span>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-500 text-[10px] uppercase font-bold block">Slots</span>
                    <span className="text-slate-200 font-bold text-sm">
                      {t.registeredTeams} / {t.maxTeams} Teams
                    </span>
                  </div>
                </div>

                <div className="pt-3 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80 gap-2">
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Calendar className="w-3.5 h-3.5 text-purple-400" />
                    <span>Starts {t.startDate}</span>
                  </div>
                  <Link
                    to={`/tournaments/${t.id}`}
                    className="px-4 py-2.5 rounded-xl bg-purple-600/20 text-purple-300 font-semibold border border-purple-500/30 hover:bg-purple-600 hover:text-white transition-colors text-xs shrink-0 flex items-center justify-center min-h-[38px]"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}
