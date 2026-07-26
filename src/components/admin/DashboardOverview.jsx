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
        // 1. Fetch Users Count from user_roles
        const { count: usersCount, error: usersErr } = await supabase
          .from('user_roles')
          .select('*', { count: 'exact', head: true })

        // 2. Fetch Tournaments List
        const { data: dbTournaments, error: tournErr } = await supabase
          .from('tournaments')
          .select('*')
          .order('created_at', { ascending: false })

        // 3. Fetch Tournament Registrations List
        const { data: dbRegistrations, error: regErr } = await supabase
          .from('tournament_registrations')
          .select('*')
          .order('registered_at', { ascending: false })

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

        // Total Revenue calculation (entry_fee sum or estimate)
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
  }, [tournaments])

  return (
    <div className="space-y-6">
      
      {/* Control Header & Refresh Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl">
        <div>
          <h2 className="text-base font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
            <span>Executive Operations Control</span>
          </h2>
          <p className="text-xs text-slate-400">Real-time tournament stats & persistence dashboard</p>
        </div>
        <button
          onClick={fetchDashboardData}
          disabled={loading}
          className="px-3.5 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-bold text-slate-300 hover:text-cyan-400 transition-all flex items-center justify-center gap-2 disabled:opacity-50 min-h-[38px]"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'Refreshing...' : 'Refresh Metrics'}</span>
        </button>
      </div>

      {fetchError && (
        <div className="p-4 bg-red-950/60 border border-red-800 rounded-xl flex items-center gap-3 text-red-300 text-xs">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{fetchError}</span>
        </div>
      )}

      {/* 7 DASHBOARD STAT CARDS GRID */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        
        {/* Total Users */}
        <div className="bg-slate-900/90 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-4 space-y-2 transition-all shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Total Users</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-emerald-400">
            {loading ? '...' : metrics.totalUsers}
          </div>
        </div>

        {/* Total Tournaments */}
        <div className="bg-slate-900/90 border border-slate-800 hover:border-purple-500/50 rounded-2xl p-4 space-y-2 transition-all shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Total Tournaments</span>
            <Trophy className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-white">
            {loading ? '...' : metrics.totalTournaments}
          </div>
        </div>

        {/* Active Tournaments */}
        <div className="bg-slate-900/90 border border-slate-800 hover:border-orange-500/50 rounded-2xl p-4 space-y-2 transition-all shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Active Tournaments</span>
            <Flame className="w-4 h-4 text-orange-400" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-orange-400">
            {loading ? '...' : metrics.activeTournaments}
          </div>
        </div>

        {/* Completed Tournaments */}
        <div className="bg-slate-900/90 border border-slate-800 hover:border-cyan-500/50 rounded-2xl p-4 space-y-2 transition-all shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Completed</span>
            <CheckCircle2 className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-cyan-400">
            {loading ? '...' : metrics.completedTournaments}
          </div>
        </div>

        {/* Total Registrations */}
        <div className="bg-slate-900/90 border border-slate-800 hover:border-amber-500/50 rounded-2xl p-4 space-y-2 transition-all shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Registrations</span>
            <ClipboardList className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-amber-400">
            {loading ? '...' : metrics.totalRegistrations}
          </div>
        </div>

        {/* Pending Payments */}
        <div className="bg-slate-900/90 border border-slate-800 hover:border-yellow-500/50 rounded-2xl p-4 space-y-2 transition-all shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Pending Pay</span>
            <Clock className="w-4 h-4 text-yellow-400" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-yellow-400">
            {loading ? '...' : metrics.pendingPayments}
          </div>
        </div>

        {/* Total Revenue */}
        <div className="bg-slate-900/90 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-4 space-y-2 transition-all shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Total Revenue</span>
            <IndianRupee className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-emerald-400">
            {loading ? '...' : `₹${metrics.totalRevenue.toLocaleString()}`}
          </div>
        </div>

      </div>

      {/* QUICK OPERATIONS ACTION BAR */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-3 shadow-xl">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <PlusCircle className="w-4 h-4 text-purple-400" />
          <span>Quick Operational Controls</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <button
            onClick={() => setActiveTab('tournaments')}
            className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-left hover:border-purple-500/50 transition-colors space-y-1"
          >
            <span className="font-bold text-white block">+ Create Tournament</span>
            <span className="text-[10px] text-slate-400 block">Launch new competition</span>
          </button>

          <button
            onClick={() => setActiveTab('registrations')}
            className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-left hover:border-purple-500/50 transition-colors space-y-1"
          >
            <span className="font-bold text-white block">Review Registrations</span>
            <span className="text-[10px] text-slate-400 block">Approve/Reject squad slots</span>
          </button>

          <button
            onClick={() => setActiveTab('matches')}
            className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-left hover:border-purple-500/50 transition-colors space-y-1"
          >
            <span className="font-bold text-white block">Match Control Lobbies</span>
            <span className="text-[10px] text-slate-400 block">Publish Custom Room IDs</span>
          </button>

          <button
            onClick={() => setActiveTab('leaderboards')}
            className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-left hover:border-purple-500/50 transition-colors space-y-1"
          >
            <span className="font-bold text-white block">Publish Points Table</span>
            <span className="text-[10px] text-slate-400 block">Update live standings</span>
          </button>
        </div>
      </div>

      {/* BELOW CARDS: RECENT REGISTRATIONS & RECENT TOURNAMENTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* RECENT REGISTRATIONS */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Recent Registrations
              </h3>
            </div>
            <button
              onClick={() => setActiveTab('registrations')}
              className="text-[11px] font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1"
            >
              <span>Queue &rarr;</span>
            </button>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-500 text-xs space-y-2">
              <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <span>Fetching latest registrations...</span>
            </div>
          ) : recentRegistrations.length === 0 ? (
            <div className="p-8 text-center bg-slate-950 border border-slate-800 rounded-xl space-y-2">
              <ShieldCheck className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-xs font-bold text-slate-400">No Registrations Yet</p>
              <p className="text-[11px] text-slate-500">Newly registered squad slots will appear here in real-time.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentRegistrations.map((reg) => (
                <div
                  key={`dash-reg-${reg.id}`}
                  className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-xs flex items-center justify-between gap-3 shadow-md"
                >
                  <div className="space-y-1 overflow-hidden">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-white text-sm truncate">{reg.teamName}</span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase border ${
                        reg.status === 'Confirmed' || reg.status === 'Approved'
                          ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                          : reg.status === 'Pending'
                          ? 'bg-amber-950 text-amber-400 border-amber-800'
                          : 'bg-red-950 text-red-400 border-red-800'
                      }`}>
                        {reg.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Captain: <strong className="text-slate-200">{reg.captainName}</strong> &bull; UID:{' '}
                      <span className="font-mono text-cyan-400">{reg.freeFireUid}</span>
                    </p>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-500 whitespace-nowrap shrink-0">
                    {reg.registeredAt}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RECENT TOURNAMENTS */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-purple-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Recent Tournaments
              </h3>
            </div>
            <button
              onClick={() => setActiveTab('tournaments')}
              className="text-[11px] font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1"
            >
              <span>Manage &rarr;</span>
            </button>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-500 text-xs space-y-2">
              <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <span>Loading tournament directory...</span>
            </div>
          ) : recentTournaments.length === 0 ? (
            <div className="p-8 text-center bg-slate-950 border border-slate-800 rounded-xl space-y-2">
              <Gamepad2 className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-xs font-bold text-slate-400">No Tournaments Created</p>
              <p className="text-[11px] text-slate-500">Create your first esports competition to populate live stats.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentTournaments.map((t) => (
                <div
                  key={`dash-tourn-${t.id}`}
                  className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-xs flex items-center justify-between gap-3 shadow-md"
                >
                  <div className="space-y-1 overflow-hidden">
                    <div className="flex items-center gap-2">
                      <h4 className="font-extrabold text-white text-sm truncate">{t.title}</h4>
                      <span className="px-2 py-0.5 rounded text-[9px] font-extrabold bg-purple-950 text-purple-300 border border-purple-800/50 uppercase">
                        {t.game}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-slate-400">
                      <span>Prize: <strong className="text-emerald-400">{t.prizePool}</strong></span>
                      <span>Slots: <strong className="text-cyan-300">{t.registeredTeams}/{t.maxTeams}</strong></span>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded text-[10px] font-extrabold uppercase border shrink-0 ${
                    t.status === 'Registration Open'
                      ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                      : t.status === 'Live Now'
                      ? 'bg-red-950 text-red-400 border-red-800 animate-pulse'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
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
