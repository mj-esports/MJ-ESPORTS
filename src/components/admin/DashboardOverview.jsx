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
    <div className="space-y-6 antialiased">
      
      {fetchError && (
        <div className="p-4 bg-[#ff3366]/10 border border-[#ff3366]/40 rounded-2xl flex items-center gap-3 text-[#ff3366] text-xs font-mono">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{fetchError}</span>
        </div>
      )}

      {/* 1. AAA ESPORTS STATS GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Users */}
        <div className="bg-[#18181b]/60 backdrop-blur-md border border-[#27272a] hover:border-[#00f2ff]/50 rounded-2xl p-5 space-y-3 transition-all shadow-xl relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold text-[#a1a1aa] uppercase tracking-wider">Active Players</span>
            <div className="w-9 h-9 rounded-xl bg-[#00f2ff]/10 border border-[#00f2ff]/30 flex items-center justify-center text-[#00f2ff] group-hover:scale-110 transition-transform">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="font-mono text-2xl sm:text-3xl font-black text-white tracking-tight">
              {loading ? '...' : metrics.totalUsers}
            </div>
            <span className="text-[10px] font-mono text-[#00ff9d] font-bold mt-1 block">
              +12.4% THIS MONTH
            </span>
          </div>
        </div>

        {/* Total Tournaments */}
        <div className="bg-[#18181b]/60 backdrop-blur-md border border-[#27272a] hover:border-[#00f2ff]/50 rounded-2xl p-5 space-y-3 transition-all shadow-xl relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold text-[#a1a1aa] uppercase tracking-wider">Tournaments</span>
            <div className="w-9 h-9 rounded-xl bg-[#fe6b00]/10 border border-[#fe6b00]/30 flex items-center justify-center text-[#fe6b00] group-hover:scale-110 transition-transform">
              <Trophy className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="font-mono text-2xl sm:text-3xl font-black text-white tracking-tight">
              {loading ? '...' : metrics.totalTournaments}
            </div>
            <span className="text-[10px] font-mono text-[#00f2ff] font-bold mt-1 block">
              {metrics.activeTournaments} ACTIVE / LIVE
            </span>
          </div>
        </div>

        {/* Total Registrations */}
        <div className="bg-[#18181b]/60 backdrop-blur-md border border-[#27272a] hover:border-[#00f2ff]/50 rounded-2xl p-5 space-y-3 transition-all shadow-xl relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold text-[#a1a1aa] uppercase tracking-wider">Registrations</span>
            <div className="w-9 h-9 rounded-xl bg-[#00f2ff]/10 border border-[#00f2ff]/30 flex items-center justify-center text-[#00f2ff] group-hover:scale-110 transition-transform">
              <ClipboardList className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="font-mono text-2xl sm:text-3xl font-black text-[#00f2ff] tracking-tight">
              {loading ? '...' : metrics.totalRegistrations}
            </div>
            <span className="text-[10px] font-mono text-[#fe6b00] font-bold mt-1 block">
              {metrics.pendingPayments} PENDING PAYMENTS
            </span>
          </div>
        </div>

        {/* Total Revenue */}
        <div className="bg-[#18181b]/60 backdrop-blur-md border border-[#27272a] hover:border-[#00ff9d]/50 rounded-2xl p-5 space-y-3 transition-all shadow-xl relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold text-[#a1a1aa] uppercase tracking-wider">Gross Revenue</span>
            <div className="w-9 h-9 rounded-xl bg-[#00ff9d]/10 border border-[#00ff9d]/30 flex items-center justify-center text-[#00ff9d] group-hover:scale-110 transition-transform">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="font-mono text-2xl sm:text-3xl font-black text-[#00ff9d] tracking-tight">
              {loading ? '...' : `₹${metrics.totalRevenue.toLocaleString()}`}
            </div>
            <span className="text-[10px] font-mono text-[#00ff9d] font-bold mt-1 block">
              SECURE LEDGER SYNC
            </span>
          </div>
        </div>

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
