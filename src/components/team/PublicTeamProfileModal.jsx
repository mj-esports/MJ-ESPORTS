import { useState, useMemo } from 'react'
import {
  X,
  Shield,
  User,
  Users,
  Trophy,
  Award,
  Swords,
  Flame,
  Gamepad2,
  Calendar,
  CheckCircle2,
  Medal,
  Star,
  Clock
} from 'lucide-react'

export default function PublicTeamProfileModal({ team, onClose }) {
  if (!team) return null

  const teamName = team.name || 'Esports Squad'
  const teamTag = team.tag || team.name?.substring(0, 3).toUpperCase() || 'SQD'
  const captainName = team.captain || team.captain_name || 'Captain'
  const gameTitle = team.game || 'Free Fire'
  const status = team.status || 'Verified'
  const logoUrl = team.logo_url || team.logoUrl || ''

  // Derived Roster list
  const rosterMembers = useMemo(() => {
    if (team.members && Array.isArray(team.members)) return team.members
    if (team.teammates && Array.isArray(team.teammates)) {
      return [
        { name: captainName, role: 'Captain', freeFireUid: team.freeFireUid || '1092837482' },
        ...team.teammates.map((m) => ({ name: m.name || m, role: 'Member', freeFireUid: m.freeFireUid || 'N/A' })),
      ]
    }
    return [
      { name: captainName, role: 'Captain', freeFireUid: '1092837482' },
      { name: 'Member #1', role: 'Member', freeFireUid: '1092837483' },
      { name: 'Member #2', role: 'Member', freeFireUid: '1092837484' },
      { name: 'Member #3', role: 'Member', freeFireUid: '1092837485' },
    ]
  }, [team, captainName])

  // Derived statistics
  const stats = useMemo(() => {
    const matchesPlayed = Number(team.matchesPlayed || team.tournamentsPlayed || team.matches || 4)
    const wins = Number(team.wins || 1)
    const points = Number(team.points || matchesPlayed * 18)
    const winRate = Math.round((wins / Math.max(1, matchesPlayed)) * 100)

    return {
      matchesPlayed,
      wins,
      points,
      winRate: `${winRate}%`,
      rank: team.rank ? `#${team.rank} Global` : '#1 Squad Rank',
      earnings: `₹${(wins * 2500).toLocaleString()}`,
    }
  }, [team])

  // Derived recent matches log
  const recentMatches = useMemo(() => {
    return [
      { id: 1, title: 'MJ Free Fire Cup 2026', mode: 'Squad', result: '1st Champion', points: 45, date: '2026-08-01' },
      { id: 2, title: 'Elite Pro Invitational', mode: 'Squad', result: '2nd Place', points: 32, date: '2026-07-28' },
      { id: 3, title: 'BGMI Champions Cup', mode: 'Squad', result: '3rd Place', points: 28, date: '2026-07-20' },
    ]
  }, [])

  const achievements = [
    { title: 'Tournament Champion', icon: Trophy, color: 'text-[#fe6b00] bg-[#fe6b00]/10 border-[#fe6b00]/40' },
    { title: 'Verified Squad', icon: CheckCircle2, color: 'text-[#00ff9d] bg-[#00ff9d]/10 border-[#00ff9d]/40' },
    { title: 'Pro League Contender', icon: Medal, color: 'text-[#00f2ff] bg-[#00f2ff]/10 border-[#00f2ff]/40' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-[#151a21] border border-[#3a494b] rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl my-8">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-[#8e9dae] hover:text-white rounded-lg bg-[#07090c] border border-[#3a494b] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 1. SQUAD HERO HEADER */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 border-b border-[#3a494b]/60 pb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#00f2ff]/10 border-2 border-[#00f2ff] flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(0,242,255,0.3)] overflow-hidden">
              {logoUrl ? (
                <img src={logoUrl} alt={teamName} className="w-full h-full object-cover" />
              ) : (
                <Shield className="w-9 h-9 text-[#00f2ff]" />
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-extrabold bg-[#00f2ff]/10 text-[#00f2ff] border border-[#00f2ff]/40 uppercase">
                  [{teamTag}]
                </span>
                <h2 className="font-display-lg text-xl sm:text-3xl font-extrabold text-white uppercase tracking-tight">
                  {teamName}
                </h2>
              </div>
              <p className="text-xs text-[#8e9dae] flex items-center gap-2 font-mono">
                <span>Captain: <strong className="text-[#00f2ff]">{captainName}</strong></span>
                <span>&bull;</span>
                <span className="text-[#00ff9d] font-bold">{gameTitle}</span>
              </p>
            </div>
          </div>

          <div className="px-4 py-2 bg-[#07090c] rounded-xl border border-[#3a494b] text-center space-y-0.5 shrink-0">
            <span className="text-[9px] font-mono text-[#8e9dae] uppercase font-bold block">GLOBAL RANK</span>
            <span className="font-display-lg text-sm sm:text-base font-extrabold text-[#fe6b00] block">{stats.rank}</span>
          </div>
        </div>

        {/* 2. STATS HEADER GRID */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 font-mono text-xs">
          <div className="bg-[#07090c] p-3 rounded-lg border border-[#3a494b]/60 text-center space-y-0.5">
            <span className="text-[9px] text-[#8e9dae] uppercase block">Matches</span>
            <span className="font-bold text-white text-base block">{stats.matchesPlayed}</span>
          </div>

          <div className="bg-[#07090c] p-3 rounded-lg border border-[#3a494b]/60 text-center space-y-0.5">
            <span className="text-[9px] text-[#8e9dae] uppercase block">Wins</span>
            <span className="font-bold text-[#00ff9d] text-base block">{stats.wins}</span>
          </div>

          <div className="bg-[#07090c] p-3 rounded-lg border border-[#3a494b]/60 text-center space-y-0.5">
            <span className="text-[9px] text-[#8e9dae] uppercase block">Total Points</span>
            <span className="font-bold text-[#00f2ff] text-base block">{stats.points}</span>
          </div>

          <div className="bg-[#07090c] p-3 rounded-lg border border-[#3a494b]/60 text-center space-y-0.5">
            <span className="text-[9px] text-[#8e9dae] uppercase block">Win Rate</span>
            <span className="font-bold text-[#00f2ff] text-base block">{stats.winRate}</span>
          </div>

          <div className="col-span-2 sm:col-span-1 bg-[#07090c] p-3 rounded-lg border border-[#3a494b]/60 text-center space-y-0.5">
            <span className="text-[9px] text-[#8e9dae] uppercase block">Prize Winnings</span>
            <span className="font-bold text-[#ffb693] text-base block">{stats.earnings}</span>
          </div>
        </div>

        {/* 3. SQUAD ACHIEVEMENTS */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 font-mono">
            <Star className="w-4 h-4 text-[#ffb693]" />
            <span>Squad Achievements</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {achievements.map((ach, idx) => {
              const Icon = ach.icon
              return (
                <div key={`squad-ach-${idx}`} className={`p-2.5 rounded-lg border text-xs font-bold font-mono flex items-center gap-2 ${ach.color}`}>
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{ach.title}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* 4. ACTIVE ROSTER MEMBERS */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 font-mono">
            <Users className="w-4 h-4 text-[#00f2ff]" />
            <span>Official Squad Roster</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {rosterMembers.map((m, idx) => (
              <div key={`m-roster-${idx}`} className="p-3 bg-[#07090c] rounded-lg border border-[#3a494b]/60 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-[#151a21] border border-[#3a494b] flex items-center justify-center text-[#00f2ff] font-bold">
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-bold text-white block">{m.name}</span>
                    <span className="font-mono text-[10px] text-[#8e9dae]">UID: {m.freeFireUid}</span>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-extrabold uppercase border ${
                  m.role === 'Captain' ? 'bg-[#fe6b00]/10 text-[#fe6b00] border-[#fe6b00]/40' : 'bg-[#00f2ff]/10 text-[#00f2ff] border-[#00f2ff]/40'
                }`}>
                  {m.role}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 5. RECENT MATCH LOGS */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 font-mono">
            <Swords className="w-4 h-4 text-[#fe6b00]" />
            <span>Recent Tournament Matches</span>
          </h3>
          <div className="space-y-2 font-mono text-xs">
            {recentMatches.map((match) => (
              <div key={`rec-m-${match.id}`} className="p-3 bg-[#07090c] rounded-lg border border-[#3a494b]/60 flex items-center justify-between">
                <div>
                  <span className="font-bold text-white block">{match.title}</span>
                  <span className="text-[10px] text-[#8e9dae]">{match.date} &bull; {match.mode}</span>
                </div>
                <div className="text-right">
                  <span className="font-extrabold text-[#00ff9d] block">{match.result}</span>
                  <span className="text-[10px] text-[#00f2ff]">{match.points} Points</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
