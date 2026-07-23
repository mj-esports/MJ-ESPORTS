import { useState } from 'react'
import { Menu, Shield, Activity, Bell } from 'lucide-react'
import { useTournaments } from '../contexts/TournamentContext'
import AdminSidebar, { NAV_ITEMS } from '../components/admin/AdminSidebar'
import DashboardOverview from '../components/admin/DashboardOverview'
import LiveOperationsView from '../components/admin/LiveOperationsView'
import TournamentCenterView from '../components/admin/TournamentCenterView'
import RegistrationQueueView from '../components/admin/RegistrationQueueView'
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col lg:flex-row">
      
      {/* Sidebar (Desktop Fixed Left + Mobile Drawer) */}
      <AdminSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      {/* Main Operations Control Area */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
        
        {/* Top Control Bar with Mobile Drawer Trigger */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white"
              aria-label="Open Sidebar Menu"
            >
              <Menu className="w-5 h-5 text-purple-400" />
            </button>
            <div className="flex items-center gap-2">
              <activeNavItem.icon className="w-5 h-5 text-purple-400" />
              <h1 className="text-base sm:text-lg font-extrabold text-white uppercase tracking-wider">
                {activeNavItem.label}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-400 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
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
