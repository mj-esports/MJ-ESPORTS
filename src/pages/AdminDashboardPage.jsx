import { useState } from 'react'
import { Menu, Shield, Activity, Bell } from 'lucide-react'
import { useTournaments } from '../contexts/TournamentContext'
import AdminSidebar, { NAV_ITEMS } from '../components/admin/AdminSidebar'
import DashboardOverview from '../components/admin/DashboardOverview'
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

  const activeNavItem = NAV_ITEMS.find((item) => item.id === activeTab) || NAV_ITEMS[0]

  return (
    <div className="min-h-screen bg-[#07090c] text-[#e1e2e7] flex flex-col lg:flex-row">
      
      {/* Sidebar (Desktop Fixed Left + Mobile Drawer) */}
      <AdminSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      {/* Main Operations Control Area */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
        
        {/* Top View Indicator Bar */}
        <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-4 flex items-center justify-between shadow-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-lg bg-[#07090c] border border-[#3a494b] text-[#8e9dae] hover:text-white"
              aria-label="Open Sidebar Menu"
            >
              <Menu className="w-5 h-5 text-[#00f2ff]" />
            </button>
            <div className="flex items-center gap-2">
              <activeNavItem.icon className="w-5 h-5 text-[#00f2ff]" />
              <h1 className="font-display-lg text-base sm:text-lg font-extrabold text-white uppercase tracking-wider">
                {activeNavItem.label}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded bg-[#00ff9d]/10 border border-[#00ff9d]/40 text-[#00ff9d] text-xs font-mono font-bold">
              <span className="w-2 h-2 rounded-full bg-[#00ff9d] animate-pulse"></span>
              <span>LIVE OPS CONNECTED</span>
            </span>
          </div>
        </div>

        {/* Tab Content Router */}
        <div className="space-y-6">
          {activeTab === 'dashboard' && (
            <DashboardOverview tournaments={tournaments} setActiveTab={setActiveTab} />
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
            <PaymentVerificationView tournaments={tournaments} />
          )}

          {activeTab === 'matches' && (
            <MatchControlView tournaments={tournaments} />
          )}

          {activeTab === 'leaderboards' && (
            <LeaderboardsView
              tournaments={tournaments}
              updateTournamentScores={updateTournamentScores}
            />
          )}

          {activeTab === 'players' && <PlayerDirectoryView />}

          {activeTab === 'reports' && <ReportsView />}

          {activeTab === 'notifications' && <NotificationsView />}

          {activeTab === 'analytics' && <AnalyticsView />}

          {activeTab === 'settings' && <SettingsView />}
        </div>

      </main>

    </div>
  )
}
