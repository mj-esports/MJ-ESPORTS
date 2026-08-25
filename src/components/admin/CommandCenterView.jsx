import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Shield,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  CreditCard,
  Trophy,
  Users,
  RefreshCw,
  Zap,
  PlusCircle,
  Swords,
  ChevronRight,
  AlertCircle,
  Gamepad2
} from 'lucide-react'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import AdminStatusBadge from './AdminStatusBadge'

export default function CommandCenterView({ tournaments = [], setActiveTab }) {
  const { user } = useAuth()

  const [metrics, setMetrics] = useState({
    totalUsers: 0,
    totalTournaments: 0,
    activeTournaments: 0,
    openRegistrations: 0,
    completedTournaments: 0,
    totalRegistrations: 0,
    pendingPaymentsCount: 0,
    verifiedPaymentsCount: 0,
    pendingWithdrawalsCount: 0,
    totalPrizePool: 0,
    totalRevenue: 0,
  })

  const [recentRegistrations, setRecentRegistrations] = useState([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(null)

  const fetchCommandCenterData = useCallback(async () => {
    setLoading(true)
    setFetchError(null)

    try {
      if (isSupabaseConfigured) {
        const [
          { count: usersCount, error: usersErr },
          { data: dbTournaments, error: tournsErr },
          { data: dbRegistrations, error: regsErr },
          { data: dbWithdrawals, error: withErr },
        ] = await Promise.all([
          supabase.from('user_roles').select('*', { count: 'exact', head: true }),
          supabase
            .from('tournaments')
            .select('id, title, game, format, prize_pool, entry_fee, max_teams, registered_teams, start_date, start_time, status, room_status, created_at')
            .order('created_at', { ascending: false }),
          supabase
            .from('tournament_registrations')
            .select('*')
            .order('created_at', { ascending: false }),
          supabase
            .from('wallet_transactions')
            .select('id, type, amount, status, created_at')
            .eq('type', 'Withdrawal')
            .eq('status', 'Pending'),
        ])

        if (usersErr) console.warn('[CommandCenter Users Notice]:', usersErr.message)
        if (tournsErr) console.warn('[CommandCenter Tournaments Notice]:', tournsErr.message)
        if (regsErr) console.warn('[CommandCenter Registrations Notice]:', regsErr.message)
        if (withErr) console.warn('[CommandCenter Withdrawals Notice]:', withErr.message)

        const loadedTournaments = dbTournaments || []
        const loadedRegistrations = dbRegistrations || []
        const loadedWithdrawals = dbWithdrawals || []

        const totalUserCount = usersCount !== null ? usersCount : 0
        const activeTournamentList = loadedTournaments.length > 0 ? loadedTournaments : tournaments

        const activeTourn = activeTournamentList.filter(
          (t) => t.status === 'Registration Open' || t.status === 'Live Now' || t.status === 'Bracket Locked' || t.status === 'LIVE' || t.status === 'OPEN'
        ).length

        const openRegs = activeTournamentList.filter(
          (t) => t.status === 'Registration Open' || t.status === 'OPEN'
        ).length

        const completedTourn = activeTournamentList.filter(
          (t) => t.status === 'Completed' || t.status === 'COMPLETED'
        ).length

        const totalRegs = loadedRegistrations.length > 0
          ? loadedRegistrations.length
          : activeTournamentList.reduce((acc, t) => acc + (t.registered_teams || t.registeredTeams || 0), 0)

        const pendingPay = loadedRegistrations.filter(
          (r) => r.status === 'Pending' || r.payment_status === 'Pending' || r.payment_status === 'PENDING'
        ).length

        const verifiedPay = loadedRegistrations.filter(
          (r) => r.status === 'Approved' || r.payment_status === 'SUCCESS' || r.payment_status === 'Paid'
        ).length

        let sumPrizePool = 0
        activeTournamentList.forEach((t) => {
          const raw = String(t.prize_pool || t.prizePool || '0').replace(/[^0-9]/g, '')
          const num = parseInt(raw, 10)
          if (!isNaN(num)) sumPrizePool += num
        })

        const revenue = loadedRegistrations.reduce((acc, r) => {
          if (r.status === 'Approved' || r.payment_status === 'SUCCESS' || r.payment_status === 'Paid') {
            const feeStr = r.entry_fee || '0'
            const num = parseInt(feeStr.replace(/[^0-9]/g, ''), 10)
            return acc + (isNaN(num) ? 0 : num)
          }
          return acc
        }, 0)

        setMetrics({
          totalUsers: Math.max(totalUserCount, 1),
          totalTournaments: activeTournamentList.length,
          activeTournaments: activeTourn,
          openRegistrations: openRegs,
          completedTournaments: completedTourn,
          totalRegistrations: totalRegs,
          pendingPaymentsCount: pendingPay,
          verifiedPaymentsCount: verifiedPay,
          pendingWithdrawalsCount: loadedWithdrawals.length,
          totalPrizePool: sumPrizePool,
          totalRevenue: revenue,
        })

        setRecentRegistrations(loadedRegistrations.slice(0, 5))
      } else {
        const totalTourn = tournaments.length
        const activeTourn = tournaments.filter((t) => t.status === 'Registration Open' || t.status === 'Live Now').length
        const openRegs = tournaments.filter((t) => t.status === 'Registration Open').length
        const completedTourn = tournaments.filter((t) => t.status === 'Completed').length
        const totalRegs = tournaments.reduce((acc, t) => acc + (t.registeredTeams || 0), 0)

        let sumPrizePool = 0
        tournaments.forEach((t) => {
          const raw = String(t.prize_pool || t.prizePool || '0').replace(/[^0-9]/g, '')
          const num = parseInt(raw, 10)
          if (!isNaN(num)) sumPrizePool += num
        })

        setMetrics({
          totalUsers: 1,
          totalTournaments: totalTourn,
          activeTournaments: activeTourn,
          openRegistrations: openRegs,
          completedTournaments: completedTourn,
          totalRegistrations: totalRegs,
          pendingPaymentsCount: 0,
          verifiedPaymentsCount: totalRegs,
          pendingWithdrawalsCount: 0,
          totalPrizePool: sumPrizePool,
          totalRevenue: 0,
        })
      }
    } catch (err) {
      console.error('[CommandCenter Data Exception]:', err)
      setFetchError('Failed to synchronize live operational status.')
    } finally {
      setLoading(false)
    }
  }, [tournaments])

  useEffect(() => {
    fetchCommandCenterData()
  }, [fetchCommandCenterData])

  // Derive Attention Required items based on real operational states
  const attentionItems = useMemo(() => {
    const items = []

    if (metrics.pendingPaymentsCount > 0) {
      items.push({
        id: 'pending-payments',
        title: 'Payment Verification Queue',
        count: metrics.pendingPaymentsCount,
        severity: 'HIGH',
        description: `${metrics.pendingPaymentsCount} payment receipt(s) awaiting verification`,
        actionLabel: 'Review Payments',
        tabTarget: 'finance',
        icon: CreditCard,
        color: 'text-[#fed83a]',
      })
    }

    if (metrics.pendingWithdrawalsCount > 0) {
      items.push({
        id: 'pending-withdrawals',
        title: 'Pending Withdrawals',
        count: metrics.pendingWithdrawalsCount,
        severity: 'HIGH',
        description: `${metrics.pendingWithdrawalsCount} player withdrawal request(s) in queue`,
        actionLabel: 'Audit Payouts',
        tabTarget: 'finance',
        icon: AlertTriangle,
        color: 'text-[#ff5e07]',
      })
    }

    if (metrics.activeTournaments > 0) {
      items.push({
        id: 'active-matches',
        title: 'Live Tournament Operations',
        count: metrics.activeTournaments,
        severity: 'INFO',
        description: `${metrics.activeTournaments} tournament arena(s) in active lifecycle`,
        actionLabel: 'Match Control',
        tabTarget: 'matches',
        icon: Swords,
        color: 'text-[#00f2ff]',
      })
    }

    return items
  }, [metrics])

  return (
    <div className="space-y-6 sm:space-y-8 antialiased pb-12 text-xs">

      {/* 1. DASHBOARD HEADER */}
      <div className="bg-[#141416] border border-[#27272a] rounded p-5 sm:p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-headline font-bold text-[#00f2ff] uppercase tracking-wider mb-1.5">
            <Shield className="w-4 h-4" />
            <span>Admin Command Center</span>
          </div>
          <h1 className="font-headline text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Operations Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-[#849495] font-body mt-1 max-w-2xl">
            Monitor tournaments, players, matches, registrations, and financial activity.
          </p>
        </div>

        {/* Identity & Status Indicators */}
        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
          <div className="px-3 py-1.5 bg-[#1c1b1c] border border-[#27272a] rounded flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse"></span>
            <span className="text-[10px] font-headline font-bold text-[#10b981] uppercase tracking-wider">
              OPERATIONAL
            </span>
          </div>

          <button
            onClick={fetchCommandCenterData}
            disabled={loading}
            className="p-2 bg-[#1c1b1c] hover:bg-[#201f20] border border-[#27272a] hover:border-[#00f2ff]/40 text-[#849495] hover:text-[#00f2ff] rounded transition-all cursor-pointer disabled:opacity-50 min-h-[36px] min-w-[36px] flex items-center justify-center"
            title="Refresh Operational State"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {fetchError && (
        <div className="p-4 bg-red-950/30 border border-red-900/40 rounded flex items-center gap-3 text-red-400 text-xs font-body">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{fetchError}</span>
        </div>
      )}

      {/* 2. KPI SECTION (6 CARDS) */}
      <section className="space-y-3">
        <h2 className="text-xs font-headline font-bold uppercase tracking-wider text-[#849495] flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-[#00f2ff]" />
          <span>Platform Key Metrics</span>
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          
          {/* Active Tournaments */}
          <div className="bg-[#141416] border border-[#27272a] rounded p-4 flex flex-col justify-between">
            <span className="text-[10px] text-[#849495] uppercase font-label-bold tracking-wider">Active Tournaments</span>
            <div className="space-y-0.5 mt-2">
              <span className="text-xl sm:text-2xl font-bold font-headline text-[#00f2ff] block">
                {metrics.activeTournaments}
              </span>
              <span className="text-[9px] text-[#849495] uppercase block">Running / Live</span>
            </div>
          </div>

          {/* Open Registrations */}
          <div className="bg-[#141416] border border-[#27272a] rounded p-4 flex flex-col justify-between">
            <span className="text-[10px] text-[#849495] uppercase font-label-bold tracking-wider">Open Registrations</span>
            <div className="space-y-0.5 mt-2">
              <span className="text-xl sm:text-2xl font-bold font-headline text-white block">
                {metrics.openRegistrations}
              </span>
              <span className="text-[9px] text-[#849495] uppercase block">Accepting Teams</span>
            </div>
          </div>

          {/* Registered Players */}
          <div className="bg-[#141416] border border-[#27272a] rounded p-4 flex flex-col justify-between">
            <span className="text-[10px] text-[#849495] uppercase font-label-bold tracking-wider">Registered Players</span>
            <div className="space-y-0.5 mt-2">
              <span className="text-xl sm:text-2xl font-bold font-headline text-white block">
                {metrics.totalRegistrations}
              </span>
              <span className="text-[9px] text-[#849495] uppercase block">Teams & Rosters</span>
            </div>
          </div>

          {/* Total Prize Pool */}
          <div className="bg-[#141416] border border-[#27272a] rounded p-4 flex flex-col justify-between">
            <span className="text-[10px] text-[#849495] uppercase font-label-bold tracking-wider">Total Prize Pool</span>
            <div className="space-y-0.5 mt-2">
              <span className="text-xl sm:text-2xl font-bold font-headline text-[#fed83a] block">
                ₹{metrics.totalPrizePool.toLocaleString('en-IN')}
              </span>
              <span className="text-[9px] text-[#849495] uppercase block">Tournament Pools</span>
            </div>
          </div>

          {/* Pending Withdrawals */}
          <div className="bg-[#141416] border border-[#27272a] rounded p-4 flex flex-col justify-between">
            <span className="text-[10px] text-[#849495] uppercase font-label-bold tracking-wider">Pending Withdrawals</span>
            <div className="space-y-0.5 mt-2">
              <span className={`text-xl sm:text-2xl font-bold font-headline block ${metrics.pendingWithdrawalsCount > 0 ? 'text-[#ff5e07]' : 'text-white'}`}>
                {metrics.pendingWithdrawalsCount}
              </span>
              <span className="text-[9px] text-[#849495] uppercase block">Payout Requests</span>
            </div>
          </div>

          {/* Today's Revenue */}
          <div className="bg-[#141416] border border-[#27272a] rounded p-4 flex flex-col justify-between">
            <span className="text-[10px] text-[#849495] uppercase font-label-bold tracking-wider">Today's Revenue</span>
            <div className="space-y-0.5 mt-2">
              <span className="text-xl sm:text-2xl font-bold font-headline text-[#10b981] block">
                ₹{metrics.totalRevenue.toLocaleString('en-IN')}
              </span>
              <span className="text-[9px] text-[#849495] uppercase block">Verified Entries</span>
            </div>
          </div>

        </div>
      </section>

      {/* 3. QUICK ACTIONS GRID */}
      <section className="space-y-3">
        <h2 className="text-xs font-headline font-bold uppercase tracking-wider text-[#849495] flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-[#00f2ff]" />
          <span>Quick Operations</span>
        </h2>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <button
            onClick={() => setActiveTab('tournaments')}
            className="p-4 bg-[#141416] hover:bg-[#1c1b1c] border border-[#27272a] hover:border-[#00f2ff]/40 rounded text-left transition-all group cursor-pointer"
          >
            <div className="w-8 h-8 rounded bg-[#00f2ff]/10 border border-[#00f2ff]/30 flex items-center justify-center text-[#00f2ff] mb-3 group-hover:scale-105 transition-transform">
              <PlusCircle className="w-4 h-4" />
            </div>
            <p className="font-headline font-bold text-xs sm:text-sm text-white group-hover:text-[#00f2ff] transition-colors">
              Create Tournament
            </p>
            <p className="text-[10px] text-[#849495] font-body mt-0.5">
              Draft & launch new arena
            </p>
          </button>

          <button
            onClick={() => setActiveTab('matches')}
            className="p-4 bg-[#141416] hover:bg-[#1c1b1c] border border-[#27272a] hover:border-[#00f2ff]/40 rounded text-left transition-all group cursor-pointer"
          >
            <div className="w-8 h-8 rounded bg-[#00f2ff]/10 border border-[#00f2ff]/30 flex items-center justify-center text-[#00f2ff] mb-3 group-hover:scale-105 transition-transform">
              <Swords className="w-4 h-4" />
            </div>
            <p className="font-headline font-bold text-xs sm:text-sm text-white uppercase group-hover:text-[#00f2ff] transition-colors">
              Match Control
            </p>
            <p className="text-[10px] text-[#849495] font-body mt-0.5">
              Live room credentials & scores
            </p>
          </button>

          <button
            onClick={() => setActiveTab('finance')}
            className="p-4 bg-[#141416] hover:bg-[#1c1b1c] border border-[#27272a] hover:border-[#00f2ff]/40 rounded text-left transition-all group cursor-pointer"
          >
            <div className="w-8 h-8 rounded bg-[#fed83a]/10 border border-[#fed83a]/30 flex items-center justify-center text-[#fed83a] mb-3 group-hover:scale-105 transition-transform">
              <CreditCard className="w-4 h-4" />
            </div>
            <p className="font-headline font-bold text-xs sm:text-sm text-white uppercase group-hover:text-[#fed83a] transition-colors">
              Review Payments
            </p>
            <p className="text-[10px] text-[#849495] font-body mt-0.5">
              Verify pending entry receipts
            </p>
          </button>

          <button
            onClick={() => setActiveTab('finance')}
            className="p-4 bg-[#141416] hover:bg-[#1c1b1c] border border-[#27272a] hover:border-[#00f2ff]/40 rounded text-left transition-all group cursor-pointer"
          >
            <div className="w-8 h-8 rounded bg-[#ff5e07]/10 border border-[#ff5e07]/30 flex items-center justify-center text-[#ff5e07] mb-3 group-hover:scale-105 transition-transform">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <p className="font-headline font-bold text-xs sm:text-sm text-white uppercase group-hover:text-[#ff5e07] transition-colors">
              Review Withdrawals
            </p>
            <p className="text-[10px] text-[#849495] font-body mt-0.5">
              Process bank payout ledger
            </p>
          </button>
        </div>
      </section>

      {/* 4. ATTENTION REQUIRED & LIVE OPERATIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Attention Required Queue */}
        <div className="lg:col-span-1 bg-[#141416] border border-[#27272a] rounded p-5 space-y-4 flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between border-b border-[#27272a] pb-3 mb-3">
              <h3 className="font-headline text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#ff5e07]" />
                <span>Attention Required</span>
              </h3>
              <span className="text-[10px] font-label-bold text-[#849495] uppercase">
                {attentionItems.length} Actions
              </span>
            </div>

            {attentionItems.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-[#10b981] mx-auto" />
                <p className="text-xs font-bold text-white uppercase font-headline">No Actions Required</p>
                <p className="text-[11px] text-[#849495] font-body">All match submissions and payout requests are clear.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {attentionItems.map((item) => {
                  const Icon = item.icon
                  return (
                    <div
                      key={item.id}
                      className="p-3 bg-[#1c1b1c] border border-[#27272a] rounded space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className={`w-4 h-4 ${item.color}`} />
                          <span className="font-headline font-bold text-xs text-white uppercase">{item.title}</span>
                        </div>
                        <span className="px-2 py-0.5 bg-[#ff5e07]/15 text-[#ff5e07] border border-[#ff5e07]/30 text-[9px] font-headline font-bold rounded uppercase">
                          {item.count} Pending
                        </span>
                      </div>
                      <p className="text-xs text-[#849495] font-body">{item.description}</p>
                      <button
                        onClick={() => setActiveTab(item.tabTarget)}
                        className="w-full mt-1 py-1.5 bg-[#141416] hover:bg-[#00f2ff] text-white hover:text-[#00363a] border border-[#27272a] hover:border-[#00f2ff] rounded text-xs font-headline font-bold uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <span>{item.actionLabel}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Live Operations & Match Control Preview */}
        <div className="lg:col-span-2 bg-[#141416] border border-[#27272a] rounded p-5 space-y-4 flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between border-b border-[#27272a] pb-3 mb-3">
              <h3 className="font-headline text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#00f2ff]" />
                <span>Live Operations</span>
              </h3>
              <button
                onClick={() => setActiveTab('tournaments')}
                className="text-xs font-headline font-bold text-[#00f2ff] hover:underline flex items-center gap-1 uppercase"
              >
                <span>Manage Tournaments</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

          {tournaments.length === 0 ? (
            <div className="py-8 text-center text-[#849495] font-body">
              No tournaments available in live operations.
            </div>
          ) : (
            <div className="space-y-2.5">
              {tournaments.slice(0, 4).map((t) => {
                const filled = t.registered_teams || t.registeredTeams || 0
                const capacity = t.max_teams || t.maxTeams || 48
                return (
                  <div
                    key={t.id}
                    className="p-3 bg-[#1c1b1c] border border-[#27272a] rounded flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-headline font-bold text-xs text-white uppercase truncate max-w-[200px] sm:max-w-[280px]" title={t.title}>
                          {t.title}
                        </span>
                        <AdminStatusBadge status={t.status || 'OPEN'} size="xs" />
                      </div>
                      <span className="text-xs text-[#849495] font-body block mt-0.5">
                        {t.game || 'FREE FIRE MAX'} &bull; {t.format || 'SQUAD'} &bull; {filled}/{capacity} Teams
                      </span>
                    </div>

                    <button
                      onClick={() => setActiveTab('matches')}
                      className="px-3 py-1.5 bg-[#141416] hover:bg-[#00f2ff] text-white hover:text-[#00363a] border border-[#27272a] hover:border-[#00f2ff] rounded text-xs font-headline font-bold uppercase transition-all flex items-center justify-center gap-1 cursor-pointer shrink-0"
                    >
                      <span>Control</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
          </div>
        </div>

      </div>

      {/* 5. TOURNAMENT SNAPSHOT TABLE */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-headline text-base sm:text-lg font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
            <Trophy className="w-4 h-4 text-[#fed83a]" />
            <span>Tournament Snapshot</span>
          </h2>
          <button
            onClick={() => setActiveTab('tournaments')}
            className="text-xs font-headline font-bold text-[#00f2ff] hover:underline flex items-center gap-1 uppercase"
          >
            <span>View All</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="bg-[#141416] border border-[#27272a] rounded overflow-hidden shadow-xl">
          {tournaments.length === 0 ? (
            <div className="py-8 text-center text-[#849495] font-body">
              No tournament snapshot data recorded.
            </div>
          ) : (
            <>
              {/* Desktop Snapshot Table */}
              <div className="overflow-x-auto w-full hidden sm:block">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#27272a] bg-[#1c1b1c] text-[#849495] text-[10px] font-headline uppercase font-bold tracking-wider">
                      <th className="py-3 px-4">Tournament</th>
                      <th className="py-3 px-4">Game / Format</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Teams</th>
                      <th className="py-3 px-4">Prize Pool</th>
                      <th className="py-3 px-4 text-right pr-4">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#27272a]">
                    {tournaments.slice(0, 6).map((t) => {
                      const filled = t.registered_teams || t.registeredTeams || 0
                      const capacity = t.max_teams || t.maxTeams || 48
                      return (
                        <tr key={t.id} className="hover:bg-[#1c1b1c] transition-colors">
                          <td className="py-3 px-4 min-w-0 max-w-[200px]">
                            <span className="font-bold text-white block truncate font-headline" title={t.title}>
                              {t.title}
                            </span>
                            <span className="text-[10px] text-[#849495] block font-mono">
                              ID: {String(t.id).substring(0, 8)}...
                            </span>
                          </td>
                          <td className="py-3 px-4 text-white font-headline">
                            <span>{t.game || 'FREE FIRE MAX'}</span>
                            <span className="text-[10px] text-[#849495] block">{t.format || 'SQUAD'}</span>
                          </td>
                          <td className="py-3 px-4">
                            <AdminStatusBadge status={t.status || 'OPEN'} size="xs" />
                          </td>
                          <td className="py-3 px-4 font-headline text-white">
                            {filled}/{capacity}
                          </td>
                          <td className="py-3 px-4 font-headline font-bold text-[#fed83a]">
                            {t.prize_pool || t.prizePool || '₹25,000'}
                          </td>
                          <td className="py-3 px-4 text-right pr-4">
                            <button
                              onClick={() => setActiveTab('tournaments')}
                              className="px-2.5 py-1 bg-[#1c1b1c] hover:bg-[#00f2ff] text-[#b9cacb] hover:text-[#00363a] border border-[#27272a] hover:border-[#00f2ff] rounded text-[10px] font-headline font-bold uppercase transition-all cursor-pointer"
                            >
                              Manage
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Snapshot Cards (< 640px) */}
              <div className="sm:hidden divide-y divide-[#27272a]">
                {tournaments.slice(0, 5).map((t) => {
                  const filled = t.registered_teams || t.registeredTeams || 0
                  const capacity = t.max_teams || t.maxTeams || 48
                  return (
                    <div key={t.id} className="p-4 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-white font-headline text-xs truncate max-w-[200px]">
                          {t.title}
                        </span>
                        <AdminStatusBadge status={t.status || 'OPEN'} size="xs" />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-[#849495] font-body">
                        <span>{t.game || 'FREE FIRE MAX'} &bull; {t.format || 'SQUAD'}</span>
                        <span className="font-headline font-bold text-[#fed83a]">{t.prize_pool || t.prizePool || '₹25,000'}</span>
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] text-[#849495]">Teams: {filled}/{capacity}</span>
                        <button
                          onClick={() => setActiveTab('tournaments')}
                          className="px-2.5 py-1 bg-[#1c1b1c] hover:bg-[#00f2ff] text-[#b9cacb] hover:text-[#00363a] border border-[#27272a] rounded text-[10px] font-headline font-bold uppercase transition-all"
                        >
                          Manage
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </section>

      {/* 6. RECENT ACTIVITY STREAM */}
      <section className="space-y-3">
        <h2 className="text-xs font-headline font-bold uppercase tracking-wider text-[#849495] flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-[#00f2ff]" />
          <span>Recent Platform Activity</span>
        </h2>

        <div className="bg-[#141416] border border-[#27272a] rounded p-4">
          {recentRegistrations.length === 0 ? (
            <div className="py-6 text-center text-[#849495] font-body">
              No recent tournament registrations or ledger activity recorded.
            </div>
          ) : (
            <div className="divide-y divide-[#27272a]">
              {recentRegistrations.map((r) => (
                <div key={r.id} className="py-2.5 flex items-center justify-between text-xs font-body first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <span className="font-bold text-white truncate max-w-[200px] block font-headline">
                      {r.team_name || r.captain_name || 'Tournament Registration'}
                    </span>
                    <span className="text-[10px] text-[#849495] block font-mono">
                      {r.created_at ? new Date(r.created_at).toLocaleString() : 'Recent activity'}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/30 rounded text-[9px] font-headline font-bold uppercase">
                    {r.status || 'Received'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

    </div>
  )
}
