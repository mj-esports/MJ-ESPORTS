import { useState, useEffect } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import { useTournaments } from '../contexts/TournamentContext'
import AdminHeader from '../components/admin/AdminHeader'
import AdminSidebar, { NAV_ITEMS } from '../components/admin/AdminSidebar'
import CommandCenterView from '../components/admin/CommandCenterView'
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
import MatchResultsWorkspaceView from '../components/admin/results/MatchResultsWorkspaceView'
import OcrScoreboardConsoleView from '../components/admin/ocr/OcrScoreboardConsoleView'

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
      if (normalizedParam === 'overview' || normalizedParam === 'command-center') return 'dashboard'
      if (normalizedParam === 'match-control') return 'matches'
      if (normalizedParam === 'leaderboards' || normalizedParam === 'leaderboard') return 'results'
      if (normalizedParam === 'ocr' || normalizedParam === 'scoreboard' || normalizedParam === 'ocr-scoreboard') return 'ocr'
      if (normalizedParam === 'payments') return 'finance'
      if (normalizedParam === 'analytics') return 'reports'
      const found = NAV_ITEMS.find((item) => item.id === normalizedParam)
      if (found) return found.id
    }
    const searchParams = new URLSearchParams(location.search)
    const tabQuery = searchParams.get('tab')
    if (tabQuery) {
      const normalizedQuery = tabQuery.toLowerCase()
      if (normalizedQuery === 'overview' || normalizedQuery === 'command-center') return 'dashboard'
      if (normalizedQuery === 'match-control') return 'matches'
      if (normalizedQuery === 'leaderboards' || normalizedQuery === 'leaderboard') return 'results'
      if (normalizedQuery === 'ocr' || normalizedQuery === 'scoreboard' || normalizedQuery === 'ocr-scoreboard') return 'ocr'
      if (normalizedQuery === 'payments') return 'finance'
      if (normalizedQuery === 'analytics') return 'reports'
      const found = NAV_ITEMS.find((item) => item.id === normalizedQuery)
      if (found) return found.id
    }
    return 'dashboard'
  }

  const [activeTab, setActiveTab] = useState(resolveTab)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [adminSearch, setAdminSearch] = useState('')

  // Sub-tab states for advanced options inside pages
  const [tournamentsSubTab, setTournamentsSubTab] = useState('center') // 'center' | 'queue'
  const [playersSubTab, setPlayersSubTab] = useState('directory') // 'directory' | 'teams'
  const [paymentsSubTab, setPaymentsSubTab] = useState('finance') // 'finance' | 'verification'
  const [reportsSubTab, setReportsSubTab] = useState('reports') // 'reports' | 'telemetry'

  useEffect(() => {
    const target = resolveTab()
    if (target !== activeTab) {
      setActiveTab(target)
    }
  }, [params.tab, location.search, defaultTab])

  const activeNavItem = NAV_ITEMS.find((item) => item.id === activeTab) || NAV_ITEMS[0]

  return (
    <div className="min-h-screen bg-[#131314] text-[#b9cacb] font-body selection:bg-[#00f2ff]/30 selection:text-[#00f2ff] flex flex-col antialiased">
      
      {/* Stitch UI-2A Admin Top Header */}
      <AdminHeader
        pageTitle={activeNavItem.label}
        onSearch={(query) => setAdminSearch(query)}
        onOpenMobileSidebar={() => setMobileOpen(true)}
      />

      <div className="flex flex-1">
        {/* Stitch UI-2A Left Sidebar & Mobile Drawer */}
        <AdminSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
        />

        {/* Main Admin Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
          
          {/* Sub-Tab Header for Generic Pages */}
          {activeTab !== 'dashboard' && activeTab !== 'tournaments' && activeTab !== 'matches' && activeTab !== 'results' && activeTab !== 'ocr' && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#141416] border border-[#27272a] rounded p-4 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-[#00f2ff]/10 border border-[#00f2ff]/30 flex items-center justify-center text-[#00f2ff]">
                  <activeNavItem.icon className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-headline text-sm sm:text-base font-extrabold text-white uppercase tracking-wider">
                    {activeNavItem.label} Console
                  </h2>
                  <p className="text-[11px] text-[#849495] font-body">Operational controls & real-time management</p>
                </div>
              </div>

              {/* Sub-Tab Navigation for Specific Tabs */}
              {activeTab === 'players' && (
                <div className="flex items-center bg-[#1c1b1c] p-1 rounded border border-[#27272a] text-xs font-headline font-bold">
                  <button
                    onClick={() => setPlayersSubTab('directory')}
                    className={`px-3 py-1.5 rounded transition-all cursor-pointer ${
                      playersSubTab === 'directory'
                        ? 'bg-[#00f2ff] text-[#00363a] font-extrabold'
                        : 'text-[#849495] hover:text-white'
                    }`}
                  >
                    Directory
                  </button>
                  <button
                    onClick={() => setPlayersSubTab('teams')}
                    className={`px-3 py-1.5 rounded transition-all cursor-pointer ${
                      playersSubTab === 'teams'
                        ? 'bg-[#00f2ff] text-[#00363a] font-extrabold'
                        : 'text-[#849495] hover:text-white'
                    }`}
                  >
                    Teams
                  </button>
                </div>
              )}

              {activeTab === 'finance' && (
                <div className="flex items-center bg-[#1c1b1c] p-1 rounded border border-[#27272a] text-xs font-headline font-bold">
                  <button
                    onClick={() => setPaymentsSubTab('finance')}
                    className={`px-3 py-1.5 rounded transition-all cursor-pointer ${
                      paymentsSubTab === 'finance'
                        ? 'bg-[#00f2ff] text-[#00363a] font-extrabold'
                        : 'text-[#849495] hover:text-white'
                    }`}
                  >
                    Finance Dashboard
                  </button>
                  <button
                    onClick={() => setPaymentsSubTab('verification')}
                    className={`px-3 py-1.5 rounded transition-all cursor-pointer ${
                      paymentsSubTab === 'verification'
                        ? 'bg-[#00f2ff] text-[#00363a] font-extrabold'
                        : 'text-[#849495] hover:text-white'
                    }`}
                  >
                    Payment Verification
                  </button>
                </div>
              )}

              {activeTab === 'reports' && (
                <div className="flex items-center bg-[#1c1b1c] p-1 rounded border border-[#27272a] text-xs font-headline font-bold">
                  <button
                    onClick={() => setReportsSubTab('reports')}
                    className={`px-3 py-1.5 rounded transition-all cursor-pointer ${
                      reportsSubTab === 'reports'
                        ? 'bg-[#00f2ff] text-[#00363a] font-extrabold'
                        : 'text-[#849495] hover:text-white'
                    }`}
                  >
                    Reports
                  </button>
                  <button
                    onClick={() => setReportsSubTab('telemetry')}
                    className={`px-3 py-1.5 rounded transition-all cursor-pointer ${
                      reportsSubTab === 'telemetry'
                        ? 'bg-[#00f2ff] text-[#00363a] font-extrabold'
                        : 'text-[#849495] hover:text-white'
                    }`}
                  >
                    Telemetry
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Main View Container */}
          <div className="space-y-6">
            {/* Overview / Command Center (Stitch UI-2A) */}
            {(activeTab === 'dashboard' || activeTab === 'overview' || activeTab === 'command-center') && (
              <CommandCenterView tournaments={tournaments} setActiveTab={setActiveTab} />
            )}

            {/* Tournaments Management */}
            {activeTab === 'tournaments' && (
              <TournamentCenterView
                tournaments={tournaments}
                createTournament={createTournament}
                editTournament={editTournament}
                deleteTournament={deleteTournament}
                updateTournamentStatus={updateTournamentStatus}
              />
            )}

            {/* Match Control */}
            {activeTab === 'matches' && (
              <MatchControlView
                tournaments={tournaments}
                setActiveTab={setActiveTab}
              />
            )}

            {/* Match Results & Standings (Authoritative Results Workspace) */}
            {activeTab === 'results' && (
              <MatchResultsWorkspaceView
                tournaments={tournaments}
                updateTournamentScores={updateTournamentScores}
                updateTournamentStatus={updateTournamentStatus}
                editTournament={editTournament}
                setActiveTab={setActiveTab}
              />
            )}

            {/* OCR / Scoreboard Console (Dedicated Staging & Identity Verification Layer) */}
            {activeTab === 'ocr' && (
              <OcrScoreboardConsoleView
                tournaments={tournaments}
                setActiveTab={setActiveTab}
              />
            )}

            {/* Players & Teams */}
            {activeTab === 'players' && (
              <>
                {playersSubTab === 'directory' && <PlayerDirectoryView tournaments={tournaments} />}
                {playersSubTab === 'teams' && <TeamsView tournaments={tournaments} />}
              </>
            )}

            {/* Finance Management */}
            {activeTab === 'finance' && (
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

            {/* Reports & Telemetry */}
            {activeTab === 'reports' && (
              <>
                {reportsSubTab === 'reports' && <ReportsView tournaments={tournaments} />}
                {reportsSubTab === 'telemetry' && <AnalyticsView tournaments={tournaments} />}
              </>
            )}

            {/* System Settings */}
            {activeTab === 'settings' && <SettingsView />}
          </div>

        </main>
      </div>

    </div>
  )
}

