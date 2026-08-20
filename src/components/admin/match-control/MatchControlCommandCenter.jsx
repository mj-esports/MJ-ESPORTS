import { useMemo } from 'react'
import {
  Gamepad2,
  Trophy,
  Clock,
  Radio,
  CheckCircle2,
  Key,
  Edit3,
  Play,
  Eye,
  EyeOff,
  Shield,
  Layers,
  Sparkles,
  ArrowRight
} from 'lucide-react'
import { getTournamentMode } from '../../../utils/tournamentUtils'

export default function MatchControlCommandCenter({
  tournaments = [],
  selectedTourney,
  activeRoomId = '',
  onOpenMatch,
  onToggleLock,
  onNavigateSubTab,
}) {
  // Derive match metrics dynamically from tournaments data
  const stats = useMemo(() => {
    const total = tournaments.length
    const upcoming = tournaments.filter(
      (t) => t.status === 'Registration Open' || t.status === 'Scheduled' || t.status === 'Check-in'
    ).length
    const live = tournaments.filter(
      (t) => t.status === 'Live Now' || t.status === 'Bracket Locked' || t.status === 'Live'
    ).length
    const completed = tournaments.filter((t) => t.status === 'Completed').length

    return { total, upcoming, live, completed }
  }, [tournaments])

  const roomPublished = selectedTourney?.roomStatus === 'Published' || selectedTourney?.room_published

  return (
    <div className="space-y-6">
      
      {/* 1. MATCH STATISTICS KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
        
        {/* Total Matches */}
        <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-4 space-y-1 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[#8e9dae] uppercase font-bold text-[10px]">Total Matches</span>
            <Layers className="w-4 h-4 text-[#8e9dae]" />
          </div>
          <span className="font-display-lg text-2xl font-extrabold text-white block">{stats.total}</span>
          <span className="text-[10px] text-[#8e9dae] block">Total Tournament Operations</span>
        </div>

        {/* Upcoming Matches */}
        <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-4 space-y-1 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[#8e9dae] uppercase font-bold text-[10px]">Upcoming Matches</span>
            <Clock className="w-4 h-4 text-[#00f2ff]" />
          </div>
          <span className="font-display-lg text-2xl font-extrabold text-[#00f2ff] block">{stats.upcoming}</span>
          <span className="text-[10px] text-[#00f2ff]/80 block">Registration / Scheduled Phase</span>
        </div>

        {/* Live Matches */}
        <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-4 space-y-1 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[#8e9dae] uppercase font-bold text-[10px]">Live Matches</span>
            <Radio className="w-4 h-4 text-[#fe6b00] animate-pulse" />
          </div>
          <span className="font-display-lg text-2xl font-extrabold text-[#fe6b00] block">{stats.live}</span>
          <span className="text-[10px] text-[#fe6b00]/80 block">Active Lobbies & In-Game Ops</span>
        </div>

        {/* Completed Matches */}
        <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-4 space-y-1 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[#8e9dae] uppercase font-bold text-[10px]">Completed Matches</span>
            <CheckCircle2 className="w-4 h-4 text-[#00ff9d]" />
          </div>
          <span className="font-display-lg text-2xl font-extrabold text-[#00ff9d] block">{stats.completed}</span>
          <span className="text-[10px] text-[#00ff9d]/80 block">Verified Scores & Results</span>
        </div>

      </div>

      {/* 2. LIVE OPERATIONS PANEL */}
      {selectedTourney ? (
        <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-5 sm:p-6 space-y-5 shadow-2xl relative overflow-hidden">
          {/* Top Banner Tag */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#3a494b]/60 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#00f2ff]/10 border border-[#00f2ff]/40 flex items-center justify-center font-mono text-xs font-extrabold text-[#00f2ff] shrink-0">
                #001
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold text-[#8e9dae] uppercase block">ACTIVE MATCH OPERATIONAL CONTROL</span>
                <h3 className="font-display-lg text-lg font-extrabold text-white uppercase tracking-tight">
                  {selectedTourney.title}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Match Status Badge */}
              <span className={`px-2.5 py-1 rounded text-xs font-mono font-extrabold uppercase border ${
                selectedTourney.status === 'Live Now' || selectedTourney.status === 'Live'
                  ? 'bg-[#fe6b00]/10 text-[#fe6b00] border-[#fe6b00]/40 animate-pulse'
                  : selectedTourney.status === 'Completed'
                  ? 'bg-[#00ff9d]/10 text-[#00ff9d] border-[#00ff9d]/40'
                  : 'bg-[#00f2ff]/10 text-[#00f2ff] border-[#00f2ff]/40'
              }`}>
                ● Status: {selectedTourney.status}
              </span>

              {/* Room Dispatch State Badge */}
              <span className={`px-2.5 py-1 rounded text-xs font-mono font-extrabold uppercase border flex items-center gap-1 ${
                roomPublished
                  ? 'bg-[#00ff9d]/10 text-[#00ff9d] border-[#00ff9d]/40'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/40'
              }`}>
                {roomPublished ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                <span>Room: {roomPublished ? 'Published' : 'Hidden / Draft'}</span>
              </span>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-3 bg-[#07090c] rounded-lg border border-[#3a494b]/40 space-y-1">
              <span className="text-[10px] text-[#8e9dae] font-bold uppercase block">Game & Format</span>
              <span className="font-extrabold text-white block">{selectedTourney.game} ({selectedTourney.format})</span>
              <span className="text-[#00f2ff] font-mono text-[10px]">Map / Mode Verified</span>
            </div>

            <div className="p-3 bg-[#07090c] rounded-lg border border-[#3a494b]/40 space-y-1">
              <span className="text-[10px] text-[#8e9dae] font-bold uppercase block">Participating Teams</span>
              <span className="font-extrabold text-[#00ff9d] block">
                {selectedTourney.registeredTeams ?? selectedTourney.registered_teams ?? 0} / {selectedTourney.maxTeams ?? selectedTourney.max_teams ?? 12} {getTournamentMode(selectedTourney).teamUnit}
              </span>
              <span className="text-[#8e9dae] font-mono text-[10px]">Rosters Checked & Ready</span>
            </div>

            <div className="p-3 bg-[#07090c] rounded-lg border border-[#3a494b]/40 space-y-1">
              <span className="text-[10px] text-[#8e9dae] font-bold uppercase block">Room ID & Password</span>
              <span className="font-mono text-white font-extrabold block">
                {activeRoomId || selectedTourney?.roomId || selectedTourney?.room_id || 'Not Assigned'}
              </span>
              <span className="text-[10px] text-[#fe6b00] font-mono">
                {roomPublished ? 'Live on Player Dashboard' : 'Hidden from Competitors'}
              </span>
            </div>
          </div>

          {/* Admin Command Action Toolbar */}
          <div className="pt-2 border-t border-[#3a494b]/60 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenMatch}
                className="px-4 py-2 bg-[#fe6b00] hover:bg-[#ff8533] text-slate-950 font-extrabold text-xs uppercase tracking-wider rounded-lg shadow-[0_0_12px_rgba(254,107,0,0.4)] transition-all flex items-center gap-1.5 min-h-[38px]"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Open Match Lobby</span>
              </button>

              <button
                onClick={() => onNavigateSubTab('ROOM_MANAGEMENT')}
                className="px-4 py-2 bg-[#07090c] hover:bg-[#1d232c] border border-[#00f2ff]/50 text-[#00f2ff] font-extrabold text-xs uppercase tracking-wider rounded-lg transition-all flex items-center gap-1.5 min-h-[38px]"
              >
                <Key className="w-4 h-4" />
                <span>Manage Room Credentials</span>
              </button>
            </div>

            <button
              onClick={() => onNavigateSubTab('RESULTS')}
              className="px-4 py-2 bg-[#00f2ff] hover:bg-[#33f5ff] text-[#00363a] font-extrabold text-xs uppercase tracking-wider rounded-lg shadow-[0_0_12px_rgba(0,242,255,0.4)] transition-all flex items-center gap-1.5 min-h-[38px]"
            >
              <Edit3 className="w-4 h-4" />
              <span>Update Match Results</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-12 text-center space-y-3 shadow-xl">
          <Gamepad2 className="w-12 h-12 text-[#00f2ff] mx-auto opacity-50 animate-pulse" />
          <h3 className="font-display-lg text-base font-bold text-white uppercase tracking-wider">
            No Active Match Operations Selected
          </h3>
          <p className="text-xs text-[#8e9dae] max-w-md mx-auto">
            Select a tournament from the dropdown above or create a new match lobby to initialize real-time match command controls.
          </p>
        </div>
      )}

    </div>
  )
}
