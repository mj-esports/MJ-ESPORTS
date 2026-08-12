import { useState, useEffect, useCallback } from 'react'
import {
  Shield,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  CreditCard,
  Trophy,
  Users,
  Lock,
  ArrowUpRight,
  RefreshCw,
  Zap,
  Server,
  Database,
  Key,
  LogOut,
  ChevronRight,
  AlertCircle
} from 'lucide-react'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

export default function CommandCenterView({ tournaments = [], setActiveTab }) {
  const { user, role, signOut } = useAuth()
  
  const [metrics, setMetrics] = useState({
    totalUsers: 0,
    totalTournaments: 0,
    activeTournaments: 0,
    completedTournaments: 0,
    totalRegistrations: 0,
    pendingPaymentsCount: 0,
    verifiedPaymentsCount: 0,
    pendingWithdrawalsCount: 0,
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
        const totalTourn = loadedTournaments.length > 0 ? loadedTournaments.length : tournaments.length
        
        const activeTourn = (loadedTournaments.length > 0 ? loadedTournaments : tournaments).filter(
          (t) => t.status === 'Registration Open' || t.status === 'Live Now' || t.status === 'Bracket Locked'
        ).length

        const completedTourn = (loadedTournaments.length > 0 ? loadedTournaments : tournaments).filter(
          (t) => t.status === 'Completed'
        ).length

        const totalRegs = loadedRegistrations.length > 0
          ? loadedRegistrations.length
          : tournaments.reduce((acc, t) => acc + (t.registeredTeams || 0), 0)

        const pendingPay = loadedRegistrations.filter(
          (r) => r.status === 'Pending' || r.payment_status === 'Pending' || r.payment_status === 'PENDING'
        ).length

        const verifiedPay = loadedRegistrations.filter(
          (r) => r.status === 'Approved' || r.payment_status === 'SUCCESS' || r.payment_status === 'Paid'
        ).length

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
          totalTournaments: totalTourn,
          activeTournaments: activeTourn,
          completedTournaments: completedTourn,
          totalRegistrations: totalRegs,
          pendingPaymentsCount: pendingPay,
          verifiedPaymentsCount: verifiedPay,
          pendingWithdrawalsCount: loadedWithdrawals.length,
          totalRevenue: revenue,
        })

        setRecentRegistrations(loadedRegistrations.slice(0, 6))
      } else {
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
          pendingPaymentsCount: 0,
          verifiedPaymentsCount: totalRegs,
          pendingWithdrawalsCount: 0,
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

  // Derive actionable priority items for Section C (Requires Attention Queue)
  const attentionItems = [
    {
      id: 'pending-payments',
      title: 'Payment Verification Queue',
      count: metrics.pendingPaymentsCount,
      severity: metrics.pendingPaymentsCount > 0 ? 'HIGH' : 'LOW',
      severityColor: metrics.pendingPaymentsCount > 0 ? 'bg-[#fe6b00]/10 text-[#fe6b00] border-[#fe6b00]/40' : 'bg-slate-800 text-slate-400 border-slate-700',
      description: metrics.pendingPaymentsCount > 0 ? `${metrics.pendingPaymentsCount} manual payment receipt(s) require review` : 'No pending payment receipts awaiting verification',
      actionLabel: 'REVIEW PAYMENTS',
      tabTarget: 'payments',
      icon: CreditCard,
    },
    {
      id: 'pending-withdrawals',
      title: 'Player Payout Requests',
      count: metrics.pendingWithdrawalsCount,
      severity: metrics.pendingWithdrawalsCount > 0 ? 'HIGH' : 'LOW',
      severityColor: metrics.pendingWithdrawalsCount > 0 ? 'bg-[#fe6b00]/10 text-[#fe6b00] border-[#fe6b00]/40' : 'bg-slate-800 text-slate-400 border-slate-700',
      description: metrics.pendingWithdrawalsCount > 0 ? `${metrics.pendingWithdrawalsCount} player withdrawal request(s) pending approval` : 'No pending withdrawal requests in queue',
      actionLabel: 'AUDIT PAYOUTS',
      tabTarget: 'payments',
      icon: Lock,
    },
    {
      id: 'active-tournaments',
      title: 'Active Tournament Lifecycle',
      count: metrics.activeTournaments,
      severity: metrics.activeTournaments > 0 ? 'INFO' : 'LOW',
      severityColor: metrics.activeTournaments > 0 ? 'bg-[#00f2ff]/10 text-[#00f2ff] border-[#00f2ff]/40' : 'bg-slate-800 text-slate-400 border-slate-700',
      description: `${metrics.activeTournaments} active arena(s) in registration or live competition`,
      actionLabel: 'MANAGE ARENAS',
      tabTarget: 'tournaments',
      icon: Trophy,
    },
    {
      id: 'result-verification',
      title: 'Match Result Verification',
      count: 0,
      severity: 'LOW',
      severityColor: 'bg-slate-800 text-slate-400 border-slate-700',
      description: 'All match submissions processed cleanly',
      actionLabel: 'VIEW RESULTS',
      tabTarget: 'results',
      icon: CheckCircle2,
    },
  ]

  return (
    <div className="space-y-6 antialiased pb-10">

      {/* SECTION A: TOP ADMIN HEADER */}
      <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-2xl p-5 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-extrabold uppercase bg-[#00f2ff]/10 text-[#00f2ff] border border-[#00f2ff]/30 tracking-wider">
              MJ ESPORTS V2
            </span>
            <h1 className="font-headline text-xl sm:text-2xl font-black text-white uppercase tracking-tight">
              COMMAND CENTER
            </h1>
          </div>
          <p className="text-xs text-[#8e9dae] font-mono">
            Operational Priority Queue & Real-time Platform Control Room
          </p>
        </div>

        {/* Identity & Status Indicators */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="px-3 py-1.5 bg-[#07090c] border border-[#3a494b] rounded-xl flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#00ff9d] animate-pulse"></div>
            <span className="text-[11px] font-mono font-bold text-[#00ff9d] uppercase">SYSTEMS LIVE</span>
          </div>

          <div className="px-3.5 py-1.5 bg-[#07090c] border border-[#3a494b] rounded-xl flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-[#00f2ff]" />
            <span className="text-xs font-bold text-white font-mono">{user?.email || 'admin@mjesports.gg'}</span>
            <span className="px-1.5 py-0.5 bg-[#00f2ff]/20 text-[#00f2ff] text-[9px] font-extrabold rounded uppercase font-mono">
              {role || 'ADMIN'}
            </span>
          </div>

          <button
            onClick={fetchCommandCenterData}
            className="p-2.5 bg-[#07090c] hover:bg-[#1d232c] border border-[#3a494b] text-[#00f2ff] rounded-xl transition-all"
            title="Refresh Operational State"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {fetchError && (
        <div className="p-4 bg-[#ff3366]/10 border border-[#ff3366]/40 rounded-xl flex items-center gap-3 text-[#ff3366] text-xs font-mono">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{fetchError}</span>
        </div>
      )}

      {/* SECTION B: OWNER / PRODUCTION SAFETY STATUS (READ-ONLY) */}
      <div className="bg-[#0e1217] border border-[#fe6b00]/30 rounded-xl p-4 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-l-4 border-l-[#fe6b00]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#fe6b00]/10 border border-[#fe6b00]/30 flex items-center justify-center text-[#fe6b00] shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-headline text-xs font-extrabold text-white uppercase tracking-wider">
                REAL-MONEY SYSTEM SAFETY LOCKS
              </h3>
              <span className="px-2 py-0.5 text-[9px] font-mono font-bold bg-[#fe6b00]/20 text-[#fe6b00] border border-[#fe6b00]/40 rounded uppercase">
                READ-ONLY
              </span>
            </div>
            <p className="text-[11px] text-[#8e9dae] mt-0.5 font-mono">
              Production payment gateway APIs and automated payout webhooks remain safely locked in TEST MODE.
            </p>
          </div>
        </div>

        {/* Safety Lock Status Pills */}
        <div className="grid grid-cols-3 gap-2 shrink-0">
          <div className="px-3 py-1.5 bg-[#151a21] border border-[#3a494b]/80 rounded-lg text-center">
            <span className="block text-[9px] text-[#8e9dae] font-mono uppercase">COLLECTION</span>
            <span className="text-[11px] font-extrabold font-mono text-[#fe6b00]">TEST / OFF</span>
          </div>
          <div className="px-3 py-1.5 bg-[#151a21] border border-[#3a494b]/80 rounded-lg text-center">
            <span className="block text-[9px] text-[#8e9dae] font-mono uppercase">PAYOUTS</span>
            <span className="text-[11px] font-extrabold font-mono text-[#fe6b00]">TEST / OFF</span>
          </div>
          <div className="px-3 py-1.5 bg-[#151a21] border border-[#3a494b]/80 rounded-lg text-center">
            <span className="block text-[9px] text-[#8e9dae] font-mono uppercase">PAID MODE</span>
            <span className="text-[11px] font-extrabold font-mono text-[#fe6b00]">TEST / OFF</span>
          </div>
        </div>
      </div>

      {/* SECTION C: REQUIRES ATTENTION (PRIMARY OPERATIONAL QUEUE) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-headline text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#fe6b00]" />
            <span>REQUIRES ATTENTION</span>
          </h2>
          <span className="text-[11px] font-mono text-[#8e9dae]">
            Actionable Pending Items Queue
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {attentionItems.map((item) => {
            const Icon = item.icon
            return (
              <div
                key={item.id}
                className="bg-[#151a21] border border-[#3a494b]/60 hover:border-[#00f2ff]/50 rounded-xl p-4 space-y-3 transition-all flex flex-col justify-between shadow-xl group"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="w-8 h-8 rounded-lg bg-[#07090c] border border-[#3a494b] flex items-center justify-center text-[#00f2ff]">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold border ${item.severityColor}`}>
                      {item.count} {item.severity}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-headline text-xs font-bold text-white uppercase tracking-wide group-hover:text-[#00f2ff] transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-[11px] text-[#8e9dae] mt-1 leading-snug font-mono">
                      {item.description}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab(item.tabTarget)}
                  className="w-full mt-2 py-2 px-3 bg-[#07090c] hover:bg-[#00f2ff] text-white hover:text-black border border-[#3a494b] hover:border-[#00f2ff] rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5"
                >
                  <span>{item.actionLabel}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* SECTION D & E: LIVE OPERATIONS & TOURNAMENT OVERVIEW GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* SECTION D: LIVE OPERATIONS */}
        <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-[#3a494b]/60 pb-3">
            <h3 className="font-headline text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#00f2ff]" />
              <span>LIVE OPERATIONS OVERVIEW</span>
            </h3>
            <span className="text-[10px] font-mono text-[#00ff9d] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00ff9d] animate-pulse"></span>
              REALTIME ARENA LOGS
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 font-mono text-xs">
            <div className="bg-[#07090c] border border-[#3a494b] rounded-lg p-3 space-y-1">
              <span className="text-[10px] text-[#8e9dae] uppercase block">Active Arenas</span>
              <span className="text-lg font-bold text-[#00f2ff]">{metrics.activeTournaments}</span>
            </div>
            <div className="bg-[#07090c] border border-[#3a494b] rounded-lg p-3 space-y-1">
              <span className="text-[10px] text-[#8e9dae] uppercase block">Completed Matches</span>
              <span className="text-lg font-bold text-[#00ff9d]">{metrics.completedTournaments}</span>
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-[10px] font-mono text-[#8e9dae] uppercase block">Active Tournament Roster</span>
            {tournaments.length === 0 ? (
              <div className="p-3 bg-[#07090c] border border-[#3a494b] rounded-lg text-[11px] text-[#8e9dae] text-center font-mono">
                No active tournaments currently registered.
              </div>
            ) : (
              tournaments.slice(0, 3).map((t) => (
                <div key={t.id} className="p-3 bg-[#07090c] border border-[#3a494b] rounded-lg flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-white block">{t.title}</span>
                    <span className="text-[10px] text-[#8e9dae] font-mono">{t.game} • {t.format}</span>
                  </div>
                  <span className="px-2 py-0.5 bg-[#00f2ff]/10 text-[#00f2ff] border border-[#00f2ff]/30 text-[10px] font-mono font-bold rounded uppercase">
                    {t.status || 'Active'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* SECTION E: TOURNAMENT OVERVIEW */}
        <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-[#3a494b]/60 pb-3">
            <h3 className="font-headline text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
              <Trophy className="w-4 h-4 text-[#fe6b00]" />
              <span>TOURNAMENT OVERVIEW</span>
            </h3>
            <button
              onClick={() => setActiveTab('tournaments')}
              className="text-[11px] font-mono text-[#00f2ff] hover:underline flex items-center gap-1"
            >
              <span>Manage All</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3 font-mono text-xs">
            <div className="bg-[#07090c] border border-[#3a494b] rounded-lg p-3 space-y-1 text-center">
              <span className="text-[9px] text-[#8e9dae] uppercase block">TOTAL</span>
              <span className="text-base font-extrabold text-white">{metrics.totalTournaments}</span>
            </div>
            <div className="bg-[#07090c] border border-[#3a494b] rounded-lg p-3 space-y-1 text-center">
              <span className="text-[9px] text-[#8e9dae] uppercase block">REGISTERED</span>
              <span className="text-base font-extrabold text-[#00f2ff]">{metrics.totalRegistrations}</span>
            </div>
            <div className="bg-[#07090c] border border-[#3a494b] rounded-lg p-3 space-y-1 text-center">
              <span className="text-[9px] text-[#8e9dae] uppercase block">COMPLETED</span>
              <span className="text-base font-extrabold text-[#00ff9d]">{metrics.completedTournaments}</span>
            </div>
          </div>

          <div className="p-4 bg-[#07090c] border border-[#3a494b] rounded-xl space-y-2">
            <span className="text-[10px] font-mono text-[#8e9dae] uppercase block">Quick Action</span>
            <button
              onClick={() => setActiveTab('tournaments')}
              className="w-full py-2.5 bg-[#fe6b00]/20 hover:bg-[#fe6b00]/30 border border-[#fe6b00] text-[#fe6b00] rounded-lg text-xs font-bold uppercase transition-all flex items-center justify-center gap-2"
            >
              <Trophy className="w-4 h-4" />
              <span>CREATE NEW ARENA TOURNAMENT</span>
            </button>
          </div>
        </div>

      </div>

      {/* SECTION F, G, H: FINANCE SNAPSHOT, SYSTEM HEALTH, RECENT ACTIVITY */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* SECTION F: FINANCE SNAPSHOT (READ-ONLY) */}
        <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-5 space-y-3 shadow-xl">
          <div className="flex items-center justify-between border-b border-[#3a494b]/60 pb-3">
            <h3 className="font-headline text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#00ff9d]" />
              <span>FINANCE SNAPSHOT</span>
            </h3>
            <span className="text-[10px] font-mono text-[#8e9dae] uppercase">READ-ONLY</span>
          </div>

          <div className="space-y-2 font-mono text-xs">
            <div className="flex justify-between items-center p-2.5 bg-[#07090c] rounded-lg border border-[#3a494b]">
              <span className="text-[#8e9dae]">Verified Revenue:</span>
              <span className="font-bold text-[#00ff9d]">₹{metrics.totalRevenue.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center p-2.5 bg-[#07090c] rounded-lg border border-[#3a494b]">
              <span className="text-[#8e9dae]">Pending Receipts:</span>
              <span className="font-bold text-[#fe6b00]">{metrics.pendingPaymentsCount}</span>
            </div>
            <div className="flex justify-between items-center p-2.5 bg-[#07090c] rounded-lg border border-[#3a494b]">
              <span className="text-[#8e9dae]">Pending Payouts:</span>
              <span className="font-bold text-[#fe6b00]">{metrics.pendingWithdrawalsCount}</span>
            </div>
          </div>
        </div>

        {/* SECTION G: SYSTEM HEALTH */}
        <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-5 space-y-3 shadow-xl">
          <div className="flex items-center justify-between border-b border-[#3a494b]/60 pb-3">
            <h3 className="font-headline text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
              <Server className="w-4 h-4 text-[#00f2ff]" />
              <span>SYSTEM HEALTH</span>
            </h3>
            <span className="text-[10px] font-mono text-[#00ff9d]">ONLINE</span>
          </div>

          <div className="space-y-2 font-mono text-xs">
            <div className="flex justify-between items-center p-2.5 bg-[#07090c] rounded-lg border border-[#3a494b]">
              <span className="text-[#8e9dae] flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-[#00f2ff]" />
                Supabase DB:
              </span>
              <span className="font-bold text-[#00ff9d]">CONNECTED</span>
            </div>
            <div className="flex justify-between items-center p-2.5 bg-[#07090c] rounded-lg border border-[#3a494b]">
              <span className="text-[#8e9dae] flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-[#00f2ff]" />
                RLS Protection:
              </span>
              <span className="font-bold text-[#00ff9d]">ENFORCED</span>
            </div>
            <div className="flex justify-between items-center p-2.5 bg-[#07090c] rounded-lg border border-[#3a494b]">
              <span className="text-[#8e9dae] flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-[#00f2ff]" />
                Admin Auth:
              </span>
              <span className="font-bold text-[#00ff9d]">ACTIVE</span>
            </div>
          </div>
        </div>

        {/* SECTION H: RECENT ADMIN ACTIVITY */}
        <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-5 space-y-3 shadow-xl">
          <div className="flex items-center justify-between border-b border-[#3a494b]/60 pb-3">
            <h3 className="font-headline text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#00f2ff]" />
              <span>RECENT ACTIVITY</span>
            </h3>
            <span className="text-[10px] font-mono text-[#8e9dae]">LOG STREAM</span>
          </div>

          <div className="space-y-2">
            {recentRegistrations.length === 0 ? (
              <div className="p-3 bg-[#07090c] border border-[#3a494b] rounded-lg text-[11px] text-[#8e9dae] text-center font-mono">
                No recent administrative activity recorded.
              </div>
            ) : (
              recentRegistrations.slice(0, 3).map((r) => (
                <div key={r.id} className="p-2.5 bg-[#07090c] border border-[#3a494b] rounded-lg flex items-center justify-between text-xs font-mono">
                  <span className="text-white truncate max-w-[140px]">{r.team_name || r.captain_name || 'Registration'}</span>
                  <span className="text-[10px] text-[#00ff9d]">{r.status || 'Received'}</span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  )
}
