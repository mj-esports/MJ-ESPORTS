import React from 'react'
import { Trophy, Users } from 'lucide-react'
import { formatTournamentPrize } from '../../../utils/tournamentPrizeUtils'
import {
  getTournamentMode,
  calculateFilledPlayerSlots,
  calculateTotalPlayerSlots,
  calculateSlotFillPercentage
} from '../../../utils/tournamentUtils'

export default function TournamentCard({ tournament }) {
  const {
    title,
    game,
    format,
    match_format,
    prize_pool,
    prizePool,
    entry_fee,
    entryFee,
    max_teams,
    maxTeams,
    registered_teams,
    registeredTeams,
    start_date,
    startDate,
    start_time,
    startTime,
    status
  } = tournament

  const modeInfo = getTournamentMode(tournament)
  const filledPlayers = calculateFilledPlayerSlots(tournament)
  const totalPlayers = calculateTotalPlayerSlots(tournament)
  const maxVal = max_teams ?? maxTeams ?? 12
  const regVal = registered_teams ?? registeredTeams ?? 0
  const progressPercent = calculateSlotFillPercentage(tournament)

  return (
    <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-5 flex flex-col justify-between hover:border-slate-700 transition-all duration-200 group relative overflow-hidden">
      {/* Header Info */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Trophy className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 font-mono">
              {game || 'Free Fire'}
            </span>
            <h3 className="font-bold text-white text-sm line-clamp-1 group-hover:text-cyan-300 transition-colors">
              {title || 'Untitled Tournament'}
            </h3>
          </div>
        </div>

        <span
          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
            status === 'Registration Open'
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : status === 'Live Now' || status === 'Live'
              ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
              : 'bg-slate-800 text-slate-400 border-slate-700'
          }`}
        >
          {status || 'Draft'}
        </span>
      </div>

      {/* Field Details */}
      <div className="grid grid-cols-2 gap-2 my-3 text-xs bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
        <div>
          <span className="text-[10px] text-slate-400 uppercase font-semibold">Format</span>
          <p className="font-mono font-bold text-slate-200 mt-0.5">{format || 'SQUAD (4P)'}</p>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 uppercase font-semibold">Match Format</span>
          <p className="font-mono font-medium text-slate-300 mt-0.5">{match_format || format || 'SQUAD (4P)'}</p>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 uppercase font-semibold">Prize Pool</span>
          <p className="font-mono font-extrabold text-emerald-400 mt-0.5">{formatTournamentPrize(tournament)}</p>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 uppercase font-semibold">Entry Fee</span>
          <p className="font-semibold text-slate-200 mt-0.5">{entry_fee || entryFee || 'Free'}</p>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 uppercase font-semibold">Start Date</span>
          <p className="font-mono text-slate-300 mt-0.5">{start_date || startDate || 'N/A'}</p>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 uppercase font-semibold">Start Time</span>
          <p className="font-mono text-slate-400 mt-0.5">{start_time || startTime || 'N/A'}</p>
        </div>
      </div>

      {/* Registration Progress */}
      <div className="space-y-1.5 mt-1">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-slate-400 flex items-center gap-1">
            <Users className="w-3 h-3" /> {modeInfo.teamUnit} / Players
          </span>
          <span className="font-mono font-bold text-white text-[10px]">
            {filledPlayers} / {totalPlayers} Players ({regVal} / {maxVal} {modeInfo.teamUnit})
          </span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </div>
  )
}
