import { useState, useEffect } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import { useTournaments } from '../contexts/TournamentContext'
import AdminHeader from '../components/admin/AdminHeader'
import AdminSidebar, { NAV_ITEMS } from '../components/admin/AdminSidebar'
import CommandCenterView from '../components/admin/CommandCenterView'
import DashboardOverview from '../components/admin/DashboardOverview'
import FinanceDashboardView from '../components/admin/FinanceDashboardView'
import TournamentCenterView from '../components/admin/TournamentCenterView'
import RegistrationQueueView from '../components/admin/RegistrationQueueView'
import PaymentVerificationView from '../components/admin/PaymentVerificationView'
import MatchControlView from '../components/admin/MatchControlView'
import PlayerDirectoryView from '../components/admin/PlayerDirectoryView'
import TeamsView from '../components/admin/TeamsView'
import ReportsView from '../components/admin/ReportsView'
import AnalyticsView from '../components/admin/AnalyticsView'
import SettingsView from '../components/admin/SettingsView'
import AdminNotificationsView from '../components/admin/AdminNotificationsView'
import AdminAuditLogsView from '../components/admin/AdminAuditLogsView'
import ResultVerificationView from '../components/admin/ResultVerificationView'

export default function AdminDashboardPage({ defaultTab }) {
  const {
    tournaments,
    createTournament,
    editTournament,
    deleteTournament,
    updateTournamentStatus,
    updateRegistrationStatus,
    updateTournamentScores,
  } = useTournaments()

  const params = useParams()
  const location = useLocation()

  const resolveTab = () => {
    if (defaultTab) return defaultTab
    if (params.tab) {
      const normalizedParam = params.tab.toLowerCase()
      if (normalizedParam === 'finance') {
        setPaymentsSubTab('finance')
        return 'payments'
      }
      if (normalizedParam === 'reports') return 'analytics'
      if (normalizedParam === 'matches' || normalizedParam === 'registrations') return 'tournaments'
      if (normalizedParam === 'teams') return 'players'
      const found = NAV_ITEMS.find((item) => item.id === normalizedParam)
      if (found) return found.id
    }
    const searchParams = new URLSearchParams(location.search)
    const tabQuery = searchParams.get('tab')
    if (tabQuery) {
      const normalizedQuery = tabQuery.toLowerCase()
      if (normalizedQuery === 'finance') {
        setPaymentsSubTab('finance')
        return 'payments'
      }
      if (normalizedQuery === 'reports') return 'analytics'
      if (normalizedQuery === 'matches' || normalizedQuery === 'registrations') return 'tournaments'
      if (normalizedQuery === 'teams') return 'players'
      const found = NAV_ITEMS.find((item) => item.id === normalizedQuery)
      if (found) return found.id
    }
    return 'dashboard'
  }

  const [activeTab, setActiveTab] = useState(resolveTab)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [adminSearch, setAdminSearch] = useState('')

  // Sub-tab states for advanced options inside pages
  const [tournamentsSubTab, setTournamentsSubTab] = useState('center') // 'center' | 'matches' | 'queue'
  const [playersSubTab, setPlayersSubTab] = useState('directory') // 'directory' | 'teams'
  const [paymentsSubTab, setPaymentsSubTab] = useState('finance') // 'finance' | 'verification'
  const [analyticsSubTab, setAnalyticsSubTab] = useState('telemetry') // 'telemetry' | 'finance' | 'reports'

  useEffect(() => {
    const target = resolveTab()
    if (target !== activeTab) {
      setActiveTab(target)
    }
  }, [params.tab, location.search, defaultTab])

  const activeNavItem = NAV_ITEMS.find((item) => item.id === activeTab) || NAV_ITEMS[0]

  return (
    <div className="min-h-screen min-h-dvh bg-[#09090b] text-[#f8fafc] font-body selection:bg-[#00f2ff] selection:text-black flex flex-col antialiased">
      
      {/* Compact Admin Header */}
      <AdminHeader
        pageTitle={activeNavItem.label}
        onSearch={(query) => setAdminSearch(query)}
        onOpenMobileSidebar={() => setMobileOpen(true)}
      />

      <div className="flex flex-1">
        {/* Unified Sidebar */}
        <AdminSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
        />

        {/* Main Admin Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
          
          {/* Compact Active Tab Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#18181b]/60 backdrop-blur-md border border-[#27272a] rounded-2xl p-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#00f2ff]/10 border border-[#00f2ff]/30 flex items-center justify-center text-[#00f2ff]">
                <activeNavItem.icon className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-headline text-sm sm:text-base font-black text-white uppercase tracking-wider">
                  {activeNavItem.label} Console
                </h2>
                <p className="text-[11px] text-[#a1a1aa] font-mono">Real-time match operations & telemetry stream</p>
              </div>
            </div>

            {/* Sub-Tab Navigation for Advanced Options */}
            {activeTab === 'tournaments' && (
              <div className="flex items-center bg-[#09090b] p-1 rounded-xl border border-[#27272a] text-xs font-mono font-bold">
                <button
                  onClick={() => setTournamentsSubTab('center')}
                  className={`px-3 py-1.5 rounded-md transition-all ${
                    tournamentsSubTab === 'center' ? 'bg-[#00f2ff] text-[#00363a] font-extrabold' : 'text-[#8e9dae] hover:text-white'
                  }`}
                >
                  Tournament Center
                </button>
                <button
                  onClick={() => setTournamentsSubTab('matches')}
                  className={`px-3 py-1.5 rounded-md transition-all ${
                    tournamentsSubTab === 'matches' ? 'bg-[#00f2ff] text-[#00363a] font-extrabold' : 'text-[#8e9dae] hover:text-white'
                  }`}
                >
                  Match Control
                </button>
                <button
                  onClick={() => setTournamentsSubTab('queue')}
                  className={`px-3 py-1.5 rounded-md transition-all ${
                    tournamentsSubTab === 'queue' ? 'bg-[#00f2ff] text-[#00363a] font-extrabold' : 'text-[#8e9dae] hover:text-white'
                  }`}
                >
                  Queue
                </button>
              </div>
            )}

            {activeTab === 'players' && (
              <div className="flex items-center bg-[#07090c] p-1 rounded-lg border border-[#3a494b]/60 text-xs font-mono font-bold">
                <button
                  onClick={() => setPlayersSubTab('directory')}
                  className={`px-3 py-1.5 rounded-md transition-all ${
                    playersSubTab === 'directory' ? 'bg-[#00f2ff] text-[#00363a] font-extrabold' : 'text-[#8e9dae] hover:text-white'
                  }`}
                >
                  Player Directory
                </button>
                <button
                  onClick={() => setPlayersSubTab('teams')}
                  className={`px-3 py-1.5 rounded-md transition-all ${
                    playersSubTab === 'teams' ? 'bg-[#00f2ff] text-[#00363a] font-extrabold' : 'text-[#8e9dae] hover:text-white'
                  }`}
                >
                  Teams Roster
                </button>
              </div>
            )}

            {(activeTab === 'payments' || activeTab === 'finance') && (
              <div className="flex items-center bg-[#07090c] p-1 rounded-lg border border-[#3a494b]/60 text-xs font-mono font-bold">
                <button
                  onClick={() => setPaymentsSubTab('finance')}
                  className={`px-3 py-1.5 rounded-md transition-all ${
                    paymentsSubTab === 'finance' ? 'bg-[#00f2ff] text-[#00363a] font-extrabold' : 'text-[#8e9dae] hover:text-white'
                  }`}
                >
                  Finance Dashboard
                </button>
                <button
                  onClick={() => setPaymentsSubTab('verification')}
                  className={`px-3 py-1.5 rounded-md transition-all ${
                    paymentsSubTab === 'verification' ? 'bg-[#00f2ff] text-[#00363a] font-extrabold' : 'text-[#8e9dae] hover:text-white'
                  }`}
                >
                  Payment Verification
                </button>
              </div>
            )}

            {activeTab === 'analytics' && (
              <div className="flex items-center bg-[#07090c] p-1 rounded-lg border border-[#3a494b]/60 text-xs font-mono font-bold">
                <button
                  onClick={() => setAnalyticsSubTab('telemetry')}
                  className={`px-3 py-1.5 rounded-md transition-all ${
                    analyticsSubTab === 'telemetry' ? 'bg-[#00f2ff] text-[#00363a] font-extrabold' : 'text-[#8e9dae] hover:text-white'
                  }`}
                >
                  Telemetry
                </button>
                <button
                  onClick={() => setAnalyticsSubTab('finance')}
                  className={`px-3 py-1.5 rounded-md transition-all ${
                    analyticsSubTab === 'finance' ? 'bg-[#00f2ff] text-[#00363a] font-extrabold' : 'text-[#8e9dae] hover:text-white'
                  }`}
                >
                  Finance
                </button>
                <button
                  onClick={() => setAnalyticsSubTab('reports')}
                  className={`px-3 py-1.5 rounded-md transition-all ${
                    analyticsSubTab === 'reports' ? 'bg-[#00f2ff] text-[#00363a] font-extrabold' : 'text-[#8e9dae] hover:text-white'
                  }`}
                >
                  Reports
                </button>
              </div>
            )}
          </div>

          {/* Main View Pages */}
          <div className="space-y-6">
            {(activeTab === 'dashboard' || activeTab === 'command-center') && (
              <CommandCenterView tournaments={tournaments} setActiveTab={setActiveTab} />
            )}

            {activeTab === 'tournaments' && (
              <>
                {tournamentsSubTab === 'center' && (
                  <TournamentCenterView
                    tournaments={tournaments}
                    createTournament={createTournament}
                    editTournament={editTournament}
                    deleteTournament={deleteTournament}
                    updateTournamentStatus={updateTournamentStatus}
                  />
                )}
                {tournamentsSubTab === 'matches' && (
                  <MatchControlView
                    tournaments={tournaments}
                    updateTournamentScores={updateTournamentScores}
                    setActiveTab={setActiveTab}
                  />
                )}
                {tournamentsSubTab === 'queue' && (
                  <RegistrationQueueView
                    tournaments={tournaments}
                    updateRegistrationStatus={updateRegistrationStatus}
                  />
                )}
              </>
            )}

            {activeTab === 'players' && (
              <>
                {playersSubTab === 'directory' && <PlayerDirectoryView tournaments={tournaments} />}
                {playersSubTab === 'teams' && <TeamsView tournaments={tournaments} />}
              </>
            )}

            {(activeTab === 'payments' || activeTab === 'finance') && (
              <>
                {paymentsSubTab === 'finance' && <FinanceDashboardView tournaments={tournaments} />}
                {paymentsSubTab === 'verification' && (
                  <PaymentVerificationView
                    tournaments={tournaments}
                    updateRegistrationStatus={updateRegistrationStatus}
                  />
                )}
              </>
            )}

            {activeTab === 'results' && (
              <ResultVerificationView tournaments={tournaments} />
            )}

            {activeTab === 'analytics' && (
              <>
                {analyticsSubTab === 'telemetry' && <AnalyticsView tournaments={tournaments} />}
                {analyticsSubTab === 'finance' && <FinanceDashboardView tournaments={tournaments} />}
                {analyticsSubTab === 'reports' && <ReportsView tournaments={tournaments} />}
              </>
            )}

            {activeTab === 'notifications' && <AdminNotificationsView />}

            {activeTab === 'audit' && <AdminAuditLogsView />}

            {activeTab === 'settings' && <SettingsView />}
          </div>

        </main>
      </div>

    </div>
  )
}
