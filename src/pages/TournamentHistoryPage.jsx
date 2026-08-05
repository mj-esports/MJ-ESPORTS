import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTournaments } from '../contexts/TournamentContext'
import {
  Trophy,
  ArrowLeft,
  Gamepad2,
  Calendar,
  Clock,
  MapPin,
  Flame,
  Search,
  CheckCircle2,
  Users
} from 'lucide-react'

export default function TournamentHistoryPage() {
  const { user } = useAuth()
  const { tournaments, isUserRegistered } = useTournaments()
  const [filterTab, setFilterTab] = useState('ALL') // 'ALL' | 'ACTIVE' | 'COMPLETED'
  const [searchQuery, setSearchQuery] = useState('')

  const displayName = user?.user_metadata?.username || user?.email?.split('@')[0] || 'Neo_Striker'

  // User registered tournaments list
  const userRegistrations = useMemo(() => {
    return tournaments.filter((t) =>
      isUserRegistered(t.id, user?.email || user?.id || user?.user_metadata?.username)
    )
  }, [tournaments, isUserRegistered, user])

  // Filtered registrations based on tabs & search query
  const filteredRegistrations = useMemo(() => {
    return userRegistrations.filter((t) => {
      const matchSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.game.toLowerCase().includes(searchQuery.toLowerCase())
      
      const status = t.status || ''
      if (filterTab === 'ACTIVE') {
        return matchSearch && (status === 'Registration Open' || status === 'Live Now' || status === 'Live')
      }
      if (filterTab === 'COMPLETED') {
        return matchSearch && (status === 'Completed' || status === 'Cancelled')
      }
      return matchSearch
    })
  }, [userRegistrations, filterTab, searchQuery])

  return (
    <div className="bg-[#050505] text-white font-body min-h-screen pb-20 antialiased font-mono text-xs">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-6">

        {/* Back Navigation */}
        <div className="flex items-center gap-2">
          <Link
            to="/profile"
            className="inline-flex items-center gap-1.5 text-[#A0A0A0] hover:text-[#00f2ff] font-bold uppercase transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Profile</span>
          </Link>
        </div>

        {/* Section Title */}
        <div className="border-b border-[#27272a]/60 pb-3">
          <h2 className="font-headline text-lg sm:text-xl font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
            <Trophy className="w-5 h-5 text-[#fe6b00]" />
            <span>Match & Tournament History</span>
          </h2>
          <p className="text-[#A0A0A0] text-[10.5px] mt-1 font-sans">
            Review registered squad allocations, upcoming tournament schedules, and completed arena results for {displayName}.
          </p>
        </div>

        {/* Search & Filters Controls */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Tab Filters */}
          <div className="flex items-center bg-[#0A0A0A] p-1 rounded-xl border border-[#27272a] text-[11px] font-bold">
            <button
              onClick={() => setFilterTab('ALL')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                filterTab === 'ALL' ? 'bg-[#fe6b00] text-black font-extrabold' : 'text-[#A0A0A0] hover:text-white'
              }`}
            >
              All Matches
            </button>
            <button
              onClick={() => setFilterTab('ACTIVE')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                filterTab === 'ACTIVE' ? 'bg-[#fe6b00] text-black font-extrabold' : 'text-[#A0A0A0] hover:text-white'
              }`}
            >
              Active / Live
            </button>
            <button
              onClick={() => setFilterTab('COMPLETED')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                filterTab === 'COMPLETED' ? 'bg-[#fe6b00] text-black font-extrabold' : 'text-[#A0A0A0] hover:text-white'
              }`}
            >
              Completed
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 max-w-sm">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tournaments..."
              className="w-full bg-[#0A0A0A] border border-[#27272a] rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-[#71717a] focus:border-[#fe6b00] focus:outline-none h-[38px]"
            />
            <Search className="w-4 h-4 text-[#71717a] absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        {/* Tournaments List */}
        {filteredRegistrations.length === 0 ? (
          <div className="py-16 text-center border border-[#27272a]/60 bg-[#0A0A0A] rounded-2xl p-6 space-y-3">
            <Trophy className="w-10 h-10 text-[#A0A0A0] mx-auto" />
            <p className="text-xs font-bold text-white uppercase">No Tournaments Found</p>
            <p className="text-[10px] text-[#A0A0A0] font-sans">
              No matching registrations detected in the active filters.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRegistrations.map((t) => (
              <div
                key={t.id}
                className="bg-[#0A0A0A] border border-[#27272a] hover:border-[#fe6b00]/40 rounded-2xl p-5 shadow-xl transition-all space-y-4"
              >
                {/* Header info */}
                <div className="flex justify-between items-start flex-wrap gap-3 pb-3 border-b border-[#27272a]/40">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-headline font-black text-sm text-white tracking-wide uppercase">
                        {t.title}
                      </h3>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#fe6b00]/10 text-[#fe6b00] border border-[#fe6b00]/30 uppercase">
                        {t.game}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-[#A0A0A0] flex-wrap">
                      <span className="flex items-center gap-1">
                        <Gamepad2 className="w-3.5 h-3.5 text-[#00f2ff]" />
                        {t.mode || 'Squad'}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-[#00f2ff]" />
                        {t.map || 'Bermuda'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded text-[9.5px] font-extrabold uppercase border ${
                      t.status === 'Registration Open'
                        ? 'bg-[#00ff9d]/10 text-[#00ff9d] border-[#00ff9d]/40'
                        : t.status === 'Live Now' || t.status === 'Live'
                        ? 'bg-[#fe6b00]/10 text-[#fe6b00] border-[#fe6b00]/40 animate-pulse'
                        : 'bg-[#18181b] text-[#A0A0A0] border-[#27272a]'
                    }`}>
                      {t.status}
                    </span>
                  </div>
                </div>

                {/* Details grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-[10.5px]">
                  <div className="p-2.5 bg-[#09090b] border border-[#27272a] rounded-xl">
                    <span className="text-[#A0A0A0] block text-[9px] uppercase">Prize Pool</span>
                    <span className="text-white font-bold text-xs">{t.prizePool || t.prize_pool}</span>
                  </div>
                  <div className="p-2.5 bg-[#09090b] border border-[#27272a] rounded-xl">
                    <span className="text-[#A0A0A0] block text-[9px] uppercase">Entry Fee</span>
                    <span className="text-[#00f2ff] font-bold text-xs">{t.entryFee || t.entry_fee || 'Free'}</span>
                  </div>
                  <div className="p-2.5 bg-[#09090b] border border-[#27272a] rounded-xl col-span-2">
                    <span className="text-[#A0A0A0] block text-[9px] uppercase">Schedule Date & Time</span>
                    <span className="text-white font-bold block truncate">
                      {t.match_date || 'Today'} &bull; {t.match_time || '10:00 PM'}
                    </span>
                  </div>
                </div>

                {/* Footer action link */}
                <div className="flex justify-between items-center text-[11px] pt-1">
                  <span className="text-[#00ff9d] font-bold flex items-center gap-1 font-sans">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>LOBBY REGISTERED</span>
                  </span>
                  
                  <Link
                    to={`/tournaments/${t.id}`}
                    className="text-[#00f2ff] hover:underline uppercase font-bold flex items-center gap-0.5"
                  >
                    <span>View Bracket &rarr;</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

      </main>
    </div>
  )
}
