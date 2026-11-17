import React, { useMemo } from 'react'
import { Bell, Flame, ShieldAlert, ArrowRight, CheckCircle2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTournaments } from '../../contexts/TournamentContext'

export const AnnouncementsSection = () => {
  const { tournaments } = useTournaments()

  const latestAnnouncement = useMemo(() => {
    if (!tournaments || tournaments.length === 0) return null

    const t = tournaments[0]
    return {
      id: `ann-${t.id}`,
      tag: t.status === 'Registration Open' ? 'REGISTRATION OPEN' : t.status === 'Live Now' ? 'LIVE NOW' : 'SEASON UPDATE',
      title: `${t.title} — ${t.game || 'Free Fire'} Tournament`,
      date: t.startDate ? `STARTS ${t.startDate}` : 'ACTIVE',
      urgent: t.status === 'Live Now' || t.status === 'Registration Open',
      tournamentId: t.id,
      totalCount: tournaments.length,
    }
  }, [tournaments])

  return (
    <div className="bg-[#111215] border border-[#27272A] rounded-none p-3.5 sm:p-4 space-y-2.5 shadow-md">
      <div className="flex items-center justify-between border-b border-[#27272A] pb-2">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-[#FFB900]" />
          <h3 className="font-display-lg text-xs sm:text-sm font-extrabold text-white uppercase tracking-wider">
            ANNOUNCEMENTS
          </h3>
        </div>
        <Link
          to="/tournaments"
          className="text-[11px] font-bold text-[#FFB900] hover:underline flex items-center gap-1 uppercase"
        >
          <span>View All ({tournaments.length}) &rarr;</span>
        </Link>
      </div>

      {!latestAnnouncement ? (
        <div className="p-3 bg-[#18181B] border border-[#27272A] rounded-none flex items-center justify-center gap-2 text-center text-[11px] text-[#A1A1AA] font-mono">
          <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
          <span>No official arena announcements published at this time.</span>
        </div>
      ) : (
        <Link
          to={`/tournaments/${latestAnnouncement.tournamentId}`}
          className="p-2.5 bg-[#18181B] border border-[#27272A] rounded-none flex items-center justify-between gap-2 hover:border-[#FFB900] transition-all group block"
        >
          <div className="flex items-center gap-2">
            {latestAnnouncement.urgent ? (
              <Flame className="w-3.5 h-3.5 text-[#FF8C00] shrink-0" />
            ) : (
              <ShieldAlert className="w-3.5 h-3.5 text-[#FFB900] shrink-0" />
            )}
            <div className="overflow-hidden">
              <span className="text-[9px] font-mono font-extrabold text-[#FFB900] uppercase tracking-wider mr-2">
                [{latestAnnouncement.tag}]
              </span>
              <span className="text-xs font-bold text-white group-hover:text-[#FFB900] transition-colors truncate">
                {latestAnnouncement.title}
              </span>
            </div>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-[#A1A1AA] group-hover:text-[#FFB900] transition-colors shrink-0" />
        </Link>
      )}
    </div>
  )
}
