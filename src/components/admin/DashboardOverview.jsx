import { useState, useEffect } from 'react'
import {
  Users,
  Trophy,
  ClipboardList,
  IndianRupee,
  PlusCircle,
  Bell,
  Activity,
  AlertCircle
} from 'lucide-react'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'

// Import reusable V2 exact named components
import DashboardHeader from './DashboardHeader'
import StatCard from './StatCard'
import QuickActionGrid from './QuickActionGrid'
import TournamentOverview from './TournamentOverview'
import RegistrationQueue from './RegistrationQueue'
import PaymentOverview from './PaymentOverview'
import SystemHealth from './SystemHealth'
import ActivityFeed from './ActivityFeed'
import AnalyticsPreview from './AnalyticsPreview'

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
        const [
          { count: usersCount, error: usersErr },
          { data: dbTournaments, error: tournsErr },
          { data: dbRegistrations, error: regsErr },
        ] = await Promise.all([
          supabase.from('user_roles').select('*', { count: 'exact', head: true }),
          supabase.from('tournaments').select('id, title, game, format, prize_pool, entry_fee, max_teams, registered_teams, start_date, start_time, status, organizer, description, rules, teams_list, room_status, room_last_updated, room_published_by, winner_team, winner_captain, created_at, updated_at').order('created_at', { ascending: false }),
          supabase.from('tournament_registrations').select('*').order('created_at', { ascending: false }),
        ])

        if (tournsErr) console.warn('[Dashboard Fetch Tournaments Warning]:', tournsErr.message || tournsErr)
        if (regsErr) console.warn('[Dashboard Fetch Registrations Warning]:', regsErr.message || regsErr)

        const loadedTournaments = dbTournaments || []
        const loadedRegistrations = dbRegistrations || []
        const totalUserCount = usersCount !== null ? usersCount : 0

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

        setRecentRegistrations(
          loadedRegistrations.slice(0, 5).map((r) => {
            const tourn = tournaments.find((t) => String(t.id) === String(r.tournament_id))
            return {
              id: r.id,
              teamName: r.team_name,
              captainName: r.captain_name,
              freeFireUid: r.free_fire_uid,
              email: r.email,
              status: r.status || 'Approved',
              tournamentTitle: tourn?.title || r.tournament_title || 'Esports Tournament',
              registeredAt: r.registered_at ? new Date(r.registered_at).toLocaleDateString() : 'Recent',
            }
          })
        )

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

        const allTeams = tournaments.flatMap((t) => (t.teamsList || []).map((tm) => ({ ...tm, tournamentTitle: t.title })))
        setRecentRegistrations(
          allTeams.slice(0, 5).map((r) => ({
            id: r.id || r.refId || 'reg-' + Math.random(),
            teamName: r.name || r.teamName,
            captainName: r.captain || r.captainName,
            freeFireUid: r.freeFireUid,
            status: r.status || 'Approved',
            tournamentTitle: r.tournamentTitle || 'Esports Cup',
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

  // Define Quick Actions
  const quickActionsList = [
    {
      title: 'New Tournament',
      description: 'Create FF / BGMI Arena',
      icon: PlusCircle,
      onClick: () => setActiveTab('tournaments'),
      colorClass: 'text-[#00f2ff]',
      hoverColorClass: 'hover:border-[#00f2ff]/60'
    },
    {
      title: 'Verify Payments',
      description: `${metrics.pendingPayments} Pending Receipts`,
      icon: IndianRupee,
      onClick: () => setActiveTab('payments'),
      colorClass: 'text-[#fe6b00]',
      hoverColorClass: 'hover:border-[#fe6b00]/60'
    },
    {
      title: 'Send Broadcast',
      description: 'Dispatch Push Notice',
      icon: Bell,
      onClick: () => setActiveTab('notifications'),
      colorClass: 'text-[#00f2ff]',
      hoverColorClass: 'hover:border-[#00f2ff]/60'
    },
    {
      title: 'System Audit',
      description: 'Inspect Access Logs',
      icon: Activity,
      onClick: () => setActiveTab('audit'),
      colorClass: 'text-[#00ff9d]',
      hoverColorClass: 'hover:border-[#00ff9d]/60'
    }
  ]

  return (
    <div className="space-y-6 antialiased">
      
      {fetchError && (
        <div className="p-4 bg-[#ff3366]/10 border border-[#ff3366]/40 rounded-2xl flex items-center gap-3 text-[#ff3366] text-xs font-mono">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{fetchError}</span>
        </div>
      )}

      {/* Reusable V2 Header */}
      <DashboardHeader title="Control Center Overview" subtitle="Real-time match operations & telemetry stream" />

      {/* Reusable StatCard Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Players"
          value={metrics.totalUsers}
          subtext="+12.4% THIS MONTH"
          icon={Users}
          colorClass="text-[#00f2ff]"
          bgIconClass="bg-[#00f2ff]/10"
          borderIconClass="border-[#00f2ff]/30"
          hoverColorClass="hover:border-[#00f2ff]/50"
          loading={loading}
        />

        <StatCard
          title="Tournaments"
          value={metrics.totalTournaments}
          subtext={`${metrics.activeTournaments} ACTIVE / LIVE`}
          icon={Trophy}
          colorClass="text-[#fe6b00]"
          bgIconClass="bg-[#fe6b00]/10"
          borderIconClass="border-[#fe6b00]/30"
          hoverColorClass="hover:border-[#fe6b00]/50"
          loading={loading}
        />

        <StatCard
          title="Registrations"
          value={metrics.totalRegistrations}
          subtext={`${metrics.pendingPayments} PENDING PAYMENTS`}
          icon={ClipboardList}
          colorClass="text-[#00f2ff]"
          bgIconClass="bg-[#00f2ff]/10"
          borderIconClass="border-[#00f2ff]/30"
          hoverColorClass="hover:border-[#00f2ff]/50"
          loading={loading}
        />

        <StatCard
          title="Gross Revenue"
          value={`₹${metrics.totalRevenue.toLocaleString()}`}
          subtext="SECURE LEDGER SYNC"
          icon={IndianRupee}
          colorClass="text-[#00ff9d]"
          bgIconClass="bg-[#00ff9d]/10"
          borderIconClass="border-[#00ff9d]/30"
          hoverColorClass="hover:border-[#00ff9d]/50"
          loading={loading}
        />
      </div>

      {/* Reusable QuickActionGrid */}
      <QuickActionGrid actions={quickActionsList} />

      {/* Reusable Tournament Roster & Registration Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RegistrationQueue
          registrations={recentRegistrations}
          loading={loading}
          onVerifyClick={() => setActiveTab('payments')}
        />

        <TournamentOverview
          tournaments={recentTournaments}
          loading={loading}
          onManageClick={() => setActiveTab('tournaments')}
        />
      </div>

      {/* Reusable Payment, Health, Feed, & Analytics Preview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <PaymentOverview
          totalRevenue={metrics.totalRevenue}
          pendingPayments={metrics.pendingPayments}
          loading={loading}
        />
        
        <SystemHealth />

        <ActivityFeed />

        <AnalyticsPreview
          totalUsers={metrics.totalUsers}
          totalRegistrations={metrics.totalRegistrations}
        />
      </div>

    </div>
  )
}
