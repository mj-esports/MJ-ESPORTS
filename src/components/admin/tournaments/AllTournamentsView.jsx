import { useState, useMemo } from 'react'
import {
  Trophy,
  Search,
  Filter,
  Calendar,
  Clock,
  Users,
  Edit3,
  Copy,
  Trash2,
  Lock,
  ChevronRight,
  Plus,
  Gamepad2,
  RefreshCw
} from 'lucide-react'
import { getTournamentImage } from '../../../utils/tournamentImageUtils'
import {
  getTournamentMode,
  calculateFilledPlayerSlots,
  calculateTotalPlayerSlots,
  calculateSlotFillPercentage
} from '../../../utils/tournamentUtils'
import {
  TOURNAMENT_LIFECYCLE_STAGES,
  getNextLifecycleStage,
  normalizeLifecycleStatus
} from '../../../constants/tournamentLifecycle'

export default function AllTournamentsView({
  tournaments = [],
  onSelectTournament,
  onOpenCreateWizard,
  onEditTournament,
  onDuplicateTournament,
  onDeleteTournament,
  onAdvanceStage,
  actionId,
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [gameFilter, setGameFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')

  const filteredTournaments = useMemo(() => {
    return tournaments.filter((t) => {
      const matchesSearch =
        t.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.game?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.organizer?.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesGame =
        gameFilter === 'ALL' || (t.game || '').includes(gameFilter)

      const matchesStatus =
        statusFilter === 'ALL' ||
        normalizeLifecycleStatus(t.status) === statusFilter

      return matchesSearch && matchesGame && matchesStatus
    })
  }, [tournaments, searchQuery, gameFilter, statusFilter])

  return (
    <div className="space-y-6">

      {/* Header Actions & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-4 shadow-xl">
        <div>
          <h2 className="font-headline text-lg font-extrabold text-white uppercase tracking-tight flex items-center gap-2">
            <Trophy className="w-5 h-5 text-[#00f2ff]" />
            <span>ALL TOURNAMENT ARENAS</span>
          </h2>
          <p className="text-xs text-[#8e9dae] font-mono mt-0.5">
            Active Roster • {filteredTournaments.length} Arena(s) Found
          </p>
        </div>

        <button
          onClick={onOpenCreateWizard}
          className="px-4 py-2.5 bg-[#fe6b00] hover:bg-[#fe6b00]/90 text-black font-extrabold rounded-lg text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-[0_0_12px_rgba(254,107,0,0.3)] shrink-0"
        >
          <Plus className="w-4 h-4 text-black stroke-[3]" />
          <span>CREATE NEW TOURNAMENT</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-4 shadow-xl flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-[#8e9dae] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tournament title..."
            className="w-full bg-[#07090c] border border-[#3a494b] rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-[#8e9dae] focus:border-[#00f2ff] focus:outline-none font-mono"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
          <div className="flex items-center gap-1 bg-[#07090c] border border-[#3a494b] rounded-lg px-3 py-1.5 text-xs text-white">
            <Gamepad2 className="w-3.5 h-3.5 text-[#00f2ff]" />
            <select
              value={gameFilter}
              onChange={(e) => setGameFilter(e.target.value)}
              className="bg-transparent text-xs text-white font-mono focus:outline-none"
            >
              <option value="ALL" className="bg-[#151a21]">All Games</option>
              <option value="Free Fire" className="bg-[#151a21]">Free Fire MAX</option>
              <option value="BGMI" className="bg-[#151a21]">BGMI Mobile</option>
            </select>
          </div>

          <div className="flex items-center gap-1 bg-[#07090c] border border-[#3a494b] rounded-lg px-3 py-1.5 text-xs text-white">
            <Filter className="w-3.5 h-3.5 text-[#00f2ff]" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-xs text-white font-mono focus:outline-none"
            >
              <option value="ALL" className="bg-[#151a21]">All Lifecycle Stages</option>
              {TOURNAMENT_LIFECYCLE_STAGES.map((s) => (
                <option key={s} value={s} className="bg-[#151a21]">
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tournament Cards List */}
      {filteredTournaments.length === 0 ? (
        <div className="p-8 bg-[#151a21] border border-[#3a494b]/60 rounded-xl text-center space-y-2 font-mono">
          <Trophy className="w-8 h-8 text-[#8e9dae] mx-auto opacity-50" />
          <p className="text-xs text-[#8e9dae]">No tournaments match your current filter parameters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTournaments.map((t) => {
            const canonicalStatus = normalizeLifecycleStatus(t.status)
            const modeInfo = getTournamentMode(t)
            const filledPlayers = calculateFilledPlayerSlots(t)
            const totalPlayers = calculateTotalPlayerSlots(t)
            const regTeams = Number(t.registeredTeams ?? t.registered_teams ?? 0)
            const maxTeams = Number(t.maxTeams ?? t.max_teams ?? 12)
            const fillPct = calculateSlotFillPercentage(t)
            const imageSrc = getTournamentImage(t)
            const nextStage = getNextLifecycleStage(t.status)

            return (
              <div
                key={t.id}
                className="bg-[#151a21] border border-[#3a494b]/60 hover:border-[#00f2ff]/50 rounded-xl overflow-hidden shadow-xl transition-all flex flex-col justify-between group"
              >
                {/* Banner & Badge Overlay */}
                <div className="relative h-32 bg-slate-950 overflow-hidden">
                  <img
                    src={imageSrc}
                    alt={t.title}
                    className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#151a21] via-transparent to-transparent" />
                  
                  <span className="absolute top-3 left-3 px-2.5 py-0.5 bg-[#07090c]/80 backdrop-blur border border-[#00f2ff]/40 text-[#00f2ff] text-[9px] font-mono font-extrabold rounded uppercase">
                    {canonicalStatus}
                  </span>

                  <span className="absolute top-3 right-3 px-2.5 py-0.5 bg-[#fe6b00]/80 backdrop-blur text-black font-headline font-extrabold text-[10px] rounded uppercase">
                    {t.prizePool || t.prize_pool || '₹0'}
                  </span>
                </div>

                {/* Content Details */}
                <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-2">
                    <h3 className="font-headline text-sm font-bold text-white uppercase tracking-wide group-hover:text-[#00f2ff] transition-colors line-clamp-1">
                      {t.title}
                    </h3>

                    <div className="flex items-center gap-3 text-[11px] text-[#8e9dae] font-mono">
                      <span>{t.game}</span>
                      <span>•</span>
                      <span>{t.format || t.match_format || 'SQUAD'}</span>
                      <span>•</span>
                      <span className="text-[#00ff9d]">{t.entryFee || t.entry_fee || 'Free'}</span>
                    </div>

                    {/* Capacity Fill Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-mono text-[#8e9dae]">
                        <span>{filledPlayers} / {totalPlayers} Players ({regTeams} / {maxTeams} {modeInfo.teamUnit})</span>
                        <span className="font-bold text-[#00f2ff]">{fillPct}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-[#07090c] rounded-full overflow-hidden border border-[#3a494b]/60">
                        <div
                          className="h-full bg-gradient-to-r from-[#00f2ff] to-[#00ff9d] transition-all"
                          style={{ width: `${fillPct}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-2 border-t border-[#3a494b]/60 space-y-2">
                    <button
                      onClick={() => onSelectTournament(t.id)}
                      className="w-full py-2 bg-[#07090c] hover:bg-[#00f2ff] text-[#00f2ff] hover:text-black border border-[#00f2ff]/40 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5"
                    >
                      <span>MANAGE OPERATIONS</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>

                    <div className="grid grid-cols-4 gap-1.5 text-xs">
                      {nextStage && (
                        <button
                          onClick={() => onAdvanceStage(t)}
                          disabled={actionId === t.id}
                          className="col-span-2 px-2 py-1.5 bg-[#00ff9d]/10 hover:bg-[#00ff9d]/20 text-[#00ff9d] border border-[#00ff9d]/30 rounded text-[10px] font-mono font-bold uppercase transition-colors truncate"
                          title={`Advance stage to ${nextStage}`}
                        >
                          {actionId === t.id ? 'Advancing...' : `→ ${nextStage}`}
                        </button>
                      )}

                      <button
                        onClick={() => onEditTournament(t)}
                        className="px-2 py-1.5 bg-[#07090c] hover:bg-[#1d232c] text-[#e1e2e7] border border-[#3a494b] rounded text-[10px] font-mono font-bold uppercase transition-colors flex items-center justify-center gap-1"
                        title="Edit Tournament"
                      >
                        <Edit3 className="w-3 h-3 text-[#00f2ff]" />
                      </button>

                      <button
                        onClick={() => onDuplicateTournament(t)}
                        className="px-2 py-1.5 bg-[#07090c] hover:bg-[#1d232c] text-[#e1e2e7] border border-[#3a494b] rounded text-[10px] font-mono font-bold uppercase transition-colors flex items-center justify-center gap-1"
                        title="Duplicate Draft"
                      >
                        <Copy className="w-3 h-3 text-[#fe6b00]" />
                      </button>

                      <button
                        onClick={() => onDeleteTournament(t)}
                        className="px-2 py-1.5 bg-[#07090c] hover:bg-red-950 text-red-400 border border-[#3a494b] rounded text-[10px] font-mono font-bold uppercase transition-colors flex items-center justify-center gap-1"
                        title="Delete Tournament"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

    </div>
  )
}
