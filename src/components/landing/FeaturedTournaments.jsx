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
    <section className="py-12 sm:py-16 bg-[#000000] border-y border-[#27272A] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 sm:mb-12 gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-[#FFB900] mb-2">
              <Trophy className="w-4 h-4 text-[#FF8C00]" />
              <span>Free Fire India Esports Competitions</span>
            </div>
            <h2 className="font-display-lg text-2xl sm:text-4xl font-extrabold text-white tracking-tight uppercase">
              FEATURED <span className="text-[#FFB900]">TOURNAMENTS</span>
            </h2>
          </div>

          {/* Explore Link */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Link
              to="/tournaments"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-extrabold text-white bg-[#18181B] border border-[#27272A] rounded-none hover:border-[#FFB900] hover:text-[#FFB900] transition-all uppercase tracking-wider"
            >
              <span>Explore All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Empty State when no tournaments exist in Supabase */}
        {filtered.length === 0 ? (
          <div className="bg-[#111215] border border-[#27272A] rounded-none p-12 text-center space-y-4 max-w-lg mx-auto shadow-xl">
            <Trophy className="w-12 h-12 text-[#A1A1AA] mx-auto opacity-50" />
            <div className="space-y-1">
              <h3 className="font-display-lg text-lg font-bold text-white uppercase">No tournaments available.</h3>
              <p className="text-xs text-[#A1A1AA]">Check back soon for upcoming Free Fire India daily custom tournaments.</p>
            </div>
          </div>
        ) : (
          /* Tournament Cards Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((t) => (
              <div
                key={`featured-card-${t.id}`}
                className="bg-[#111215] border border-[#27272A] rounded-none overflow-hidden flex flex-col justify-between hover:border-[#FFB900] transition-all duration-300 group shadow-sm"
              >
                {/* Card Banner */}
                <div className="p-5 sm:p-6 bg-[#18181B] border-b border-[#27272A] space-y-3 relative">
                  <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                    <span className="px-2.5 py-1 rounded-none text-[11px] font-extrabold uppercase tracking-wider border flex items-center gap-1.5 shrink-0 bg-[#FF8C00]/10 text-[#FF8C00] border-[#FF8C00]/40">
                      <Gamepad2 className="w-3.5 h-3.5" />
                      {t.game || 'Free Fire India'}
                    </span>

                    <span className={`px-2.5 py-1 rounded-none text-[10px] font-extrabold uppercase tracking-wider border shrink-0 flex items-center gap-1 ${t.status === 'Live Now'
                      ? 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/40 animate-pulse'
                      : t.status === 'Registration Open'
                        ? 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/40'
                        : 'bg-[#18181B] text-[#A1A1AA] border-[#27272A]'
                      }`}>
                      {t.status === 'Live Now' && <Flame className="w-3 h-3 text-[#EF4444]" />}
                      {t.status}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-display-lg text-lg sm:text-xl font-extrabold text-white group-hover:text-[#FFB900] transition-colors">
                      {t.title}
                    </h3>
                    <p className="text-xs text-[#A1A1AA] mt-1 font-semibold flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-[#FFB900]" />
                      {t.format}
                    </p>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-5 sm:p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-[#18181B] p-2.5 rounded-none border border-[#27272A]">
                      <span className="font-label-caps text-[10px] text-[#A1A1AA] uppercase block">Prize Pool</span>
                      <span className="font-mono text-sm font-extrabold text-[#FFB900]">{formatTournamentPrize(t)}</span>
                    </div>
                    <div className="bg-[#18181B] p-2.5 rounded-none border border-[#27272A]">
                      <span className="font-label-caps text-[10px] text-[#A1A1AA] uppercase block">Entry Fee</span>
                      <span className="font-mono text-sm font-extrabold text-white">{t.entryFee}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <div className="flex items-center gap-1.5 text-[#A1A1AA]">
                      <Calendar className="w-3.5 h-3.5 text-[#FFB900]" />
                      <span className="font-mono text-[11px] font-semibold">{t.startDate}</span>
                    </div>
                    <span className="font-mono text-xs font-bold text-[#FFB900]">
                      {calculateFilledPlayerSlots(t)}/{calculateTotalPlayerSlots(t)} Slots
                    </span>
                  </div>

                  <Link
                    to={`/tournaments/${t.id}`}
                    className="w-full bg-[#FFB900] hover:bg-[#FFC933] text-black font-extrabold text-xs uppercase tracking-wider min-h-[44px] flex items-center justify-center gap-1.5 transition-colors rounded-none"
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
