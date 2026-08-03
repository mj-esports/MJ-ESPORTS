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
    <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-3.5 sm:p-4 space-y-2.5 shadow-md">
      <div className="flex items-center justify-between border-b border-[#3a494b]/60 pb-2">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-[#00f2ff]" />
          <h3 className="font-display-lg text-xs sm:text-sm font-extrabold text-white uppercase tracking-wider">
            ANNOUNCEMENTS
          </h3>
        </div>
        <Link
          to="/tournaments"
          className="text-[11px] font-bold text-[#00f2ff] hover:underline flex items-center gap-1 uppercase"
        >
          <span>View All ({tournaments.length}) &rarr;</span>
        </Link>
      </div>

      {!latestAnnouncement ? (
        <div className="p-3 bg-[#07090c] border border-[#3a494b]/40 rounded-lg flex items-center justify-center gap-2 text-center text-[11px] text-[#8e9dae] font-mono">
          <CheckCircle2 className="w-3.5 h-3.5 text-[#00ff9d]" />
          <span>No official arena announcements published at this time.</span>
        </div>
      ) : (
        <Link
          to={`/tournaments/${latestAnnouncement.tournamentId}`}
          className="p-2.5 bg-[#07090c] border border-[#3a494b]/40 rounded-lg flex items-center justify-between gap-2 hover:border-[#00f2ff] transition-all group block"
        >
          <div className="flex items-center gap-2">
            {latestAnnouncement.urgent ? (
              <Flame className="w-3.5 h-3.5 text-[#fe6b00] shrink-0" />
            ) : (
              <ShieldAlert className="w-3.5 h-3.5 text-[#00f2ff] shrink-0" />
            )}
            <div className="overflow-hidden">
              <span className="text-[9px] font-mono font-extrabold text-[#00f2ff] uppercase tracking-wider mr-2">
                [{latestAnnouncement.tag}]
              </span>
              <span className="text-xs font-bold text-white group-hover:text-[#00f2ff] transition-colors truncate">
                {latestAnnouncement.title}
              </span>
            </div>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-[#8e9dae] group-hover:text-[#00f2ff] transition-colors shrink-0" />
        </Link>
      )}
    </div>
  )
}
