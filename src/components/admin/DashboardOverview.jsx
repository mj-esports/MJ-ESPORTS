import { useState, useEffect } from 'react'
import {
  Users,
  Trophy,
  Flame,
  CheckCircle2,
  ClipboardList,
  Clock,
  IndianRupee,
  PlusCircle,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
  Gamepad2
} from 'lucide-react'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { MetricsSkeleton } from '../common/SkeletonLoader'
import { useToast } from '../../contexts/ToastContext'

export default function DashboardOverview({ tournaments = [], setActiveTab }) {
  const [metrics, setMetrics] = useState({
    totalUsers: 0,
    totalTournaments: 0,
    activeTournaments: 0,
    completedTournaments: 0,
    totalRegistrations: 0,
    pendingPayments: 0,
    totalRevenue: 0,
  })

  const [recentRegistrations, setRecentRegistrations] = useState([])
  const [recentTournaments, setRecentTournaments] = useState([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(null)

  const fetchDashboardData = async () => {
    setLoading(true)
    setFetchError(null)

    try {
      if (isSupabaseConfigured) {
        // Concurrent Promise.all fetching for 3 admin dataset queries
        const [
          { count: usersCount, error: usersErr },
          { data: dbTournaments, error: tournsErr },
          { data: dbRegistrations, error: regsErr },
        ] = await Promise.all([
          supabase.from('user_roles').select('*', { count: 'exact', head: true }),
          supabase.from('tournaments').select('*').order('created_at', { ascending: false }),
          supabase.from('tournament_registrations').select('*').order('created_at', { ascending: false }),
        ])

        if (tournsErr) console.warn('[Dashboard Fetch Tournaments Warning]:', tournsErr.message || tournsErr)
        if (regsErr) console.warn('[Dashboard Fetch Registrations Warning]:', regsErr.message || regsErr)

        const loadedTournaments = dbTournaments || []
        const loadedRegistrations = dbRegistrations || []
        const totalUserCount = usersCount !== null ? usersCount : 0

        // Calculate metrics
        const totalTourn = loadedTournaments.length > 0 ? loadedTournaments.length : tournaments.length
        const activeTourn = (loadedTournaments.length > 0 ? loadedTournaments : tournaments).filter(
          (t) => t.status === 'Registration Open' || t.status === 'Live Now'
        ).length
        const completedTourn = (loadedTournaments.length > 0 ? loadedTournaments : tournaments).filter(
          (t) => t.status === 'Completed'
        ).length
        const totalRegs = loadedRegistrations.length > 0
          ? loadedRegistrations.length
          : tournaments.reduce((acc, t) => acc + (t.registeredTeams || 0), 0)
        
        const pendingPay = loadedRegistrations.filter(
          (r) => r.status === 'Pending' || r.payment_status === 'Pending'
        ).length

        // Total Revenue calculation
        const revenue = loadedRegistrations.reduce((acc, r) => {
          const feeStr = r.entry_fee || '0'
          const num = parseInt(feeStr.replace(/[^0-9]/g, ''), 10)
          return acc + (isNaN(num) ? 0 : num)
        }, 0)

        setMetrics({
          totalUsers: Math.max(totalUserCount, 1),
          totalTournaments: totalTourn,
          activeTournaments: activeTourn,
          completedTournaments: completedTourn,
          totalRegistrations: totalRegs,
          pendingPayments: pendingPay,
          totalRevenue: revenue,
        })

        // Map recent registrations
        setRecentRegistrations(
          loadedRegistrations.slice(0, 5).map((r) => ({
            id: r.id,
            teamName: r.team_name,
            captainName: r.captain_name,
            freeFireUid: r.free_fire_uid,
            email: r.email,
            status: r.status || 'Approved',
            tournamentId: r.tournament_id,
            registeredAt: r.registered_at ? new Date(r.registered_at).toLocaleDateString() : 'Recent',
          }))
        )

        // Map recent tournaments
        setRecentTournaments(
          loadedTournaments.slice(0, 5).map((t) => ({
            id: t.id,
            title: t.title,
            game: t.game,
            format: t.format,
            prizePool: t.prize_pool,
            entryFee: t.entry_fee || 'Free',
            registeredTeams: t.registered_teams || 0,
            maxTeams: t.max_teams || 32,
            status: t.status || 'Registration Open',
            createdAt: t.created_at ? new Date(t.created_at).toLocaleDateString() : 'Recent',
          }))
        )
      } else {
        // Fallback to local context state
        const totalTourn = tournaments.length
        const activeTourn = tournaments.filter((t) => t.status === 'Registration Open' || t.status === 'Live Now').length
        const completedTourn = tournaments.filter((t) => t.status === 'Completed').length
        const totalRegs = tournaments.reduce((acc, t) => acc + (t.registeredTeams || 0), 0)

        setMetrics({
          totalUsers: 1,
          totalTournaments: totalTourn,
          activeTournaments: activeTourn,
          completedTournaments: completedTourn,
          totalRegistrations: totalRegs,
          pendingPayments: 0,
          totalRevenue: 0,
        })

        setRecentTournaments(
          tournaments.slice(0, 5).map((t) => ({
            id: t.id,
            title: t.title,
            game: t.game,
            format: t.format,
            prizePool: t.prizePool || t.prize_pool,
            registeredTeams: t.registeredTeams || 0,
            maxTeams: t.maxTeams || 32,
            status: t.status,
            createdAt: 'Today',
          }))
        )

        // Gather teams from context
        const allTeams = tournaments.flatMap((t) => (t.teamsList || []).map((tm) => ({ ...tm, tournamentTitle: t.title })))
        setRecentRegistrations(
          allTeams.slice(0, 5).map((r) => ({
            id: r.id || r.refId || 'reg-' + Math.random(),
            teamName: r.name || r.teamName,
            captainName: r.captain || r.captainName,
            freeFireUid: r.freeFireUid,
            status: r.status || 'Approved',
            registeredAt: 'Today',
          }))
        )
      }
    } catch (err) {
      console.error('[Dashboard Fetch Error]:', err)
      setFetchError('Failed to synchronize live metrics from Supabase.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [tournaments.length])

  return (
    <div className="space-y-4">
      
      {fetchError && (
        <div className="p-3 bg-red-950/60 border border-[#ff3366] rounded-xl flex items-center gap-3 text-[#ff3366] text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{fetchError}</span>
        </div>
      )}

      {/* COMPACT 4-CARD STATS GRID */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 isolate relative min-w-0 w-full">
        
        {/* Total Users */}
        <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-3 sm:p-3.5 space-y-1 transition-all shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1">
            <span className="font-label-caps text-[10px] font-extrabold text-[#8e9dae] uppercase tracking-wider truncate">Total Users</span>
            <Users className="w-3.5 h-3.5 text-[#00ff9d] shrink-0" />
          </div>
          <div className="font-mono text-base sm:text-xl font-extrabold text-[#00ff9d] truncate">
            {loading ? '...' : metrics.totalUsers}
          </div>
        </div>

        {/* Total Tournaments */}
        <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-3 sm:p-3.5 space-y-1 transition-all shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1">
            <span className="font-label-caps text-[10px] font-extrabold text-[#8e9dae] uppercase tracking-wider truncate">Tournaments</span>
            <Trophy className="w-3.5 h-3.5 text-[#00f2ff] shrink-0" />
          </div>
          <div className="font-mono text-base sm:text-xl font-extrabold text-white truncate">
            {loading ? '...' : metrics.totalTournaments}
          </div>
        </div>

        {/* Total Registrations */}
        <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-3 sm:p-3.5 space-y-1 transition-all shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1">
            <span className="font-label-caps text-[10px] font-extrabold text-[#8e9dae] uppercase tracking-wider truncate">Registrations</span>
            <ClipboardList className="w-3.5 h-3.5 text-[#ffb800] shrink-0" />
          </div>
          <div className="font-mono text-base sm:text-xl font-extrabold text-[#ffb800] truncate">
            {loading ? '...' : metrics.totalRegistrations}
          </div>
        </div>

        {/* Total Revenue */}
        <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-3 sm:p-3.5 space-y-1 transition-all shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1">
            <span className="font-label-caps text-[10px] font-extrabold text-[#8e9dae] uppercase tracking-wider truncate">Revenue</span>
            <IndianRupee className="w-3.5 h-3.5 text-[#00ff9d] shrink-0" />
          </div>
          <div className="font-mono text-base sm:text-xl font-extrabold text-[#00ff9d] truncate">
            {loading ? '...' : `₹${metrics.totalRevenue.toLocaleString()}`}
          </div>
        </div>

      </div>

      {/* 4 ESSENTIAL QUICK ACTION CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
        <button
          onClick={() => setActiveTab('tournaments')}
          className="p-3 bg-[#151a21] border border-[#3a494b]/60 rounded-xl text-left hover:border-[#00f2ff] transition-colors space-y-0.5 min-w-0 w-full min-h-[44px] flex flex-col justify-center"
        >
          <span className="font-bold text-white block uppercase text-[11px] truncate">+ Create Tournament</span>
          <span className="text-[9px] text-[#8e9dae] block truncate">Launch competition</span>
        </button>

        <button
          onClick={() => setActiveTab('registrations')}
          className="p-3 bg-[#151a21] border border-[#3a494b]/60 rounded-xl text-left hover:border-[#00f2ff] transition-colors space-y-0.5 min-w-0 w-full min-h-[44px] flex flex-col justify-center"
        >
          <span className="font-bold text-white block uppercase text-[11px] truncate">Review Registrations</span>
          <span className="text-[9px] text-[#8e9dae] block truncate">Approve squad slots</span>
        </button>

        <button
          onClick={() => setActiveTab('tournaments')}
          className="p-3 bg-[#151a21] border border-[#3a494b]/60 rounded-xl text-left hover:border-[#00f2ff] transition-colors space-y-0.5 min-w-0 w-full min-h-[44px] flex flex-col justify-center"
        >
          <span className="font-bold text-white block uppercase text-[11px] truncate">Match Control</span>
          <span className="text-[9px] text-[#8e9dae] block truncate">Manage custom rooms</span>
        </button>

        <button
          onClick={() => setActiveTab('tournaments')}
          className="p-3 bg-[#151a21] border border-[#3a494b]/60 rounded-xl text-left hover:border-[#00f2ff] transition-colors space-y-0.5 min-w-0 w-full min-h-[44px] flex flex-col justify-center"
        >
          <span className="font-bold text-white block uppercase text-[11px] truncate">Publish Leaderboard</span>
          <span className="text-[9px] text-[#8e9dae] block truncate">Update standings</span>
        </button>
      </div>

      {/* BELOW CARDS: RECENT REGISTRATIONS & RECENT TOURNAMENTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* RECENT REGISTRATIONS */}
        <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-[#3a494b]/60 pb-3">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-[#ffb800]" />
              <h3 className="font-display-lg text-xs font-bold text-white uppercase tracking-wider">
                Recent Registrations
              </h3>
            </div>
            <button
              onClick={() => setActiveTab('registrations')}
              className="text-[11px] font-bold text-[#00f2ff] hover:underline flex items-center gap-1 uppercase tracking-wider"
            >
              <span>Queue &rarr;</span>
            </button>
          </div>

          {loading ? (
            <div className="p-8 text-center text-[#8e9dae] text-xs space-y-2">
              <div className="w-6 h-6 border-2 border-[#00f2ff] border-t-transparent rounded-full animate-spin mx-auto"></div>
              <span>Fetching latest registrations...</span>
            </div>
          ) : recentRegistrations.length === 0 ? (
            <div className="p-8 text-center bg-[#07090c] border border-[#3a494b] rounded-lg space-y-2">
              <ShieldCheck className="w-8 h-8 text-[#8e9dae] mx-auto" />
              <p className="text-xs font-bold text-[#e1e2e7]">No Registrations Yet</p>
              <p className="text-[11px] text-[#8e9dae]">Newly registered squad slots will appear here in real-time.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentRegistrations.map((reg) => (
                <div
                  key={`dash-reg-${reg.id}`}
                  className="p-3.5 bg-[#07090c] border border-[#3a494b]/60 rounded-lg text-xs flex items-center justify-between gap-3 shadow-md"
                >
                  <div className="space-y-1 overflow-hidden">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-white text-sm truncate">{reg.teamName}</span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase border ${
                        reg.status === 'Confirmed' || reg.status === 'Approved'
                          ? 'bg-[#00ff9d]/10 text-[#00ff9d] border-[#00ff9d]/40'
                          : reg.status === 'Pending'
                          ? 'bg-[#ffb800]/10 text-[#ffb800] border-[#ffb800]/40'
                          : 'bg-red-950 text-[#ff3366] border-red-800'
                      }`}>
                        {reg.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#8e9dae]">
                      Captain: <strong className="text-white">{reg.captainName}</strong> &bull; UID:{' '}
                      <span className="font-mono text-[#00f2ff]">{reg.freeFireUid}</span>
                    </p>
                  </div>
                  <span className="font-mono text-[10px] font-semibold text-[#8e9dae] whitespace-nowrap shrink-0">
                    {reg.registeredAt}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RECENT TOURNAMENTS */}
        <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-[#3a494b]/60 pb-3">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-[#00f2ff]" />
              <h3 className="font-display-lg text-xs font-bold text-white uppercase tracking-wider">
                Recent Tournaments
              </h3>
            </div>
            <button
              onClick={() => setActiveTab('tournaments')}
              className="text-[11px] font-bold text-[#00f2ff] hover:underline flex items-center gap-1 uppercase tracking-wider"
            >
              <span>Manage &rarr;</span>
            </button>
          </div>

          {loading ? (
            <div className="p-8 text-center text-[#8e9dae] text-xs space-y-2">
              <div className="w-6 h-6 border-2 border-[#00f2ff] border-t-transparent rounded-full animate-spin mx-auto"></div>
              <span>Loading tournament directory...</span>
            </div>
          ) : recentTournaments.length === 0 ? (
            <div className="p-8 text-center bg-[#07090c] border border-[#3a494b] rounded-lg space-y-2">
              <Gamepad2 className="w-8 h-8 text-[#8e9dae] mx-auto" />
              <p className="text-xs font-bold text-[#e1e2e7]">No Tournaments Created</p>
              <p className="text-[11px] text-[#8e9dae]">Create your first esports competition to populate live stats.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentTournaments.map((t) => (
                <div
                  key={`dash-tourn-${t.id}`}
                  className="p-3.5 bg-[#07090c] border border-[#3a494b]/60 rounded-lg text-xs flex items-center justify-between gap-3 shadow-md"
                >
                  <div className="space-y-1 overflow-hidden">
                    <div className="flex items-center gap-2">
                      <h4 className="font-extrabold text-white text-sm truncate">{t.title}</h4>
                      <span className="px-2 py-0.5 rounded text-[9px] font-extrabold bg-[#00f2ff]/10 text-[#00f2ff] border border-[#00f2ff]/40 uppercase">
                        {t.game}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-[#8e9dae]">
                      <span>Prize: <strong className="font-mono text-[#ffb693]">{t.prizePool}</strong></span>
                      <span>Slots: <strong className="font-mono text-[#00f2ff]">{t.registeredTeams}/{t.maxTeams}</strong></span>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded text-[10px] font-extrabold uppercase border shrink-0 ${
                    t.status === 'Registration Open'
                      ? 'bg-[#00ff9d]/10 text-[#00ff9d] border-[#00ff9d]/40'
                      : t.status === 'Live Now'
                      ? 'bg-[#fe6b00]/10 text-[#fe6b00] border-[#fe6b00]/40 animate-pulse'
                      : 'bg-[#07090c] text-[#8e9dae] border-[#3a494b]'
                  }`}>
                    {t.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  )
}
