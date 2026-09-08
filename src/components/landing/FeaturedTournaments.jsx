import { Link } from 'react-router-dom'
import { Trophy, Calendar, ArrowRight, Gamepad2, Flame, Sparkles } from 'lucide-react'
import { useTournaments } from '../../contexts/TournamentContext'
import { formatTournamentPrize } from '../../utils/tournamentPrizeUtils'
import {
  calculateFilledPlayerSlots,
  calculateTotalPlayerSlots,
  getTournamentMode,
} from '../../utils/tournamentUtils'

export default function FeaturedTournaments() {
  const { tournaments } = useTournaments()

  const activeList = Array.isArray(tournaments) ? tournaments : []
  const filtered = activeList.slice(0, 6)

  return (
    <section className="py-12 sm:py-16 bg-[#080c14] border-y border-[#3a494b]/60 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 sm:mb-12 gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-[#00f2ff] mb-2">
              <Trophy className="w-4 h-4 text-[#fe6b00]" />
              <span>Free Fire MAX Esports Competitions</span>
            </div>
            <h2 className="font-display-lg text-2xl sm:text-4xl font-extrabold text-white tracking-tight uppercase">
              FEATURED <span className="text-[#00f2ff]">TOURNAMENTS</span>
            </h2>
          </div>

          {/* Explore Link */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Link
              to="/tournaments"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-extrabold text-[#00f2ff] bg-[#151a21] border border-[#3a494b]/60 rounded-xl hover:border-[#00f2ff] hover:bg-[#1d232c] transition-all uppercase tracking-wider"
            >
              <span>Explore All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Empty State when no tournaments exist in Supabase */}
        {filtered.length === 0 ? (
          <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-12 text-center space-y-4 max-w-lg mx-auto shadow-xl">
            <Trophy className="w-12 h-12 text-[#8e9dae] mx-auto opacity-50" />
            <div className="space-y-1">
              <h3 className="font-display-lg text-lg font-bold text-white uppercase">No tournaments available.</h3>
              <p className="text-xs text-[#8e9dae]">Check back soon for upcoming Free Fire MAX daily custom tournaments.</p>
            </div>
          </div>
        ) : (
          /* Tournament Cards Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((t) => (
              <div
                  key={`featured-card-${t.id}`}
                  className={`bg-[#151a21] border ${
                    t.status === 'Live Now'
                      ? 'border-[#fe6b00]/60 shadow-[0_0_20px_rgba(255,107,0,0.25)]'
                      : 'border-[#3a494b]/60 shadow-[0_0_15px_rgba(0,242,255,0.1)]'
                  } rounded-xl overflow-hidden flex flex-col justify-between hover:border-[#00f2ff] transition-all duration-300 group`}
                >
                  {/* Card Banner */}
                  <div className="p-5 sm:p-6 bg-[#07090c] border-b border-[#3a494b]/60 space-y-3 relative">
                    <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                      <span className="px-2.5 py-1 rounded text-[11px] font-extrabold uppercase tracking-wider border flex items-center gap-1.5 shrink-0 bg-[#fe6b00]/10 text-[#fe6b00] border-[#fe6b00]/40">
                        <Gamepad2 className="w-3.5 h-3.5" />
                        {t.game || 'Free Fire MAX'}
                      </span>
                      
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border shrink-0 flex items-center gap-1 ${
                        t.status === 'Live Now'
                          ? 'bg-[#ff3366]/10 text-[#ff3366] border-[#ff3366]/40 animate-pulse'
                          : t.status === 'Registration Open'
                          ? 'bg-[#00ff9d]/10 text-[#00ff9d] border-[#00ff9d]/40'
                          : 'bg-[#07090c] text-[#8e9dae] border-[#3a494b]'
                      }`}>
                        {t.status === 'Live Now' && <Flame className="w-3 h-3 text-[#ff3366]" />}
                        {t.status}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-display-lg text-lg sm:text-xl font-extrabold text-white group-hover:text-[#00f2ff] transition-colors">
                        {t.title}
                      </h3>
                      <p className="text-xs text-[#8e9dae] mt-1 font-semibold flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-[#ffb800]" />
                        {t.format}
                      </p>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-5 sm:p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="bg-[#07090c] p-2.5 rounded border border-[#3a494b]/60">
                        <span className="font-label-caps text-[10px] text-[#8e9dae] uppercase block">Prize Pool</span>
                        <span className="font-mono text-sm font-extrabold text-[#fe6b00]">{formatTournamentPrize(t)}</span>
                      </div>
                      <div className="bg-[#07090c] p-2.5 rounded border border-[#3a494b]/60">
                        <span className="font-label-caps text-[10px] text-[#8e9dae] uppercase block">Entry Fee</span>
                        <span className="font-mono text-sm font-extrabold text-[#00ff9d]">{t.entryFee}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <div className="flex items-center gap-1.5 text-[#8e9dae]">
                        <Calendar className="w-3.5 h-3.5 text-[#00f2ff]" />
                        <span className="font-mono text-[11px] font-semibold">{t.startDate}</span>
                      </div>
                      <span className="font-mono text-xs font-bold text-[#00f2ff]">
                        {calculateFilledPlayerSlots(t)}/{calculateTotalPlayerSlots(t)} Slots
                      </span>
                    </div>

                    <Link
                      to={`/tournaments/${t.id}`}
                      className="btn-cyber-primary w-full justify-center text-xs py-2.5 min-h-[44px]"
                    >
                      <span>View Match Details</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
            ))}
          </div>
        )}

      </div>
    </section>
  )
}
