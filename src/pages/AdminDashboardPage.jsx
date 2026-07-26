import { useState } from 'react'
import { Shield } from 'lucide-react'
import { useTournaments } from '../contexts/TournamentContext'
import AdminHeader from '../components/admin/AdminHeader'
import AdminSidebar, { NAV_ITEMS } from '../components/admin/AdminSidebar'
import DashboardOverview from '../components/admin/DashboardOverview'
import FinanceDashboardView from '../components/admin/FinanceDashboardView'
import LiveOperationsView from '../components/admin/LiveOperationsView'
import TournamentCenterView from '../components/admin/TournamentCenterView'
import RegistrationQueueView from '../components/admin/RegistrationQueueView'
import PaymentVerificationView from '../components/admin/PaymentVerificationView'
import MatchControlView from '../components/admin/MatchControlView'
import LeaderboardsView from '../components/admin/LeaderboardsView'
import PlayerDirectoryView from '../components/admin/PlayerDirectoryView'
import ReportsView from '../components/admin/ReportsView'
import NotificationsView from '../components/admin/NotificationsView'
import AnalyticsView from '../components/admin/AnalyticsView'
import SettingsView from '../components/admin/SettingsView'

export default function AdminDashboardPage() {
  const {
    tournaments,
    createTournament,
    editTournament,
    deleteTournament,
    updateTournamentStatus,
    updateRegistrationStatus,
    updateTournamentScores,
  } = useTournaments()

  const [activeTab, setActiveTab] = useState('dashboard')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [adminSearch, setAdminSearch] = useState('')

  const activeNavItem = NAV_ITEMS.find((item) => item.id === activeTab) || NAV_ITEMS[0]

  return (
    <div className="min-h-screen bg-[#07090c] text-[#e1e2e7] flex flex-col">
      
      {/* Compact Admin Header (Logo, Dynamic Page Title, Search, Notifications, Admin Profile, Logout) */}
      <AdminHeader
        pageTitle={activeNavItem.label}
        onSearch={(query) => setAdminSearch(query)}
        onOpenMobileSidebar={() => setMobileOpen(true)}
      />

      <div className="flex flex-1">
        {/* Primary Left Sidebar Navigation */}
        <AdminSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
        />

        {/* Main Admin Operations Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
          
          {/* Active Tab Sub-Header Banner */}
          <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-4 flex items-center justify-between shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#00f2ff]/10 border border-[#00f2ff]/30 flex items-center justify-center text-[#00f2ff]">
                <activeNavItem.icon className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-display-lg text-base sm:text-lg font-extrabold text-white uppercase tracking-wider">
                  {activeNavItem.label} Operations
                </h2>
                <p className="text-[11px] text-[#8e9dae]">Manage live esports tournaments, rosters, and match schedules</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded bg-[#00ff9d]/10 border border-[#00ff9d]/40 text-[#00ff9d] text-xs font-mono font-bold">
                <span className="w-2 h-2 rounded-full bg-[#00ff9d] animate-pulse"></span>
                <span>SYSTEM ONLINE</span>
              </span>
            </div>
          </div>

          {/* Tab Content Views */}
          <div className="space-y-6">
            {activeTab === 'dashboard' && (
              <DashboardOverview tournaments={tournaments} setActiveTab={setActiveTab} />
            )}

            {activeTab === 'finance' && (
              <FinanceDashboardView tournaments={tournaments} />
            )}

            {activeTab === 'live-ops' && (
              <LiveOperationsView tournaments={tournaments} setActiveTab={setActiveTab} />
            )}

            {activeTab === 'tournaments' && (
              <TournamentCenterView
                tournaments={tournaments}
                createTournament={createTournament}
                editTournament={editTournament}
                deleteTournament={deleteTournament}
                updateTournamentStatus={updateTournamentStatus}
              />
            )}

            {activeTab === 'registrations' && (
              <RegistrationQueueView
                tournaments={tournaments}
                updateRegistrationStatus={updateRegistrationStatus}
              />
            )}

            {activeTab === 'payments' && (
              <PaymentVerificationView
                tournaments={tournaments}
                updateRegistrationStatus={updateRegistrationStatus}
              />
            )}

            {activeTab === 'matches' && (
              <MatchControlView
                tournaments={tournaments}
                updateTournamentScores={updateTournamentScores}
              />
            )}

            {activeTab === 'leaderboards' && (
              <LeaderboardsView tournaments={tournaments} />
            )}

            {activeTab === 'players' && (
              <PlayerDirectoryView tournaments={tournaments} />
            )}

            {activeTab === 'reports' && <ReportsView />}

            {activeTab === 'notifications' && <NotificationsView />}

            {activeTab === 'analytics' && <AnalyticsView tournaments={tournaments} />}

            {activeTab === 'settings' && <SettingsView />}
          </div>

        </main>
      </div>

    </div>
  )
}
