import {
  LayoutDashboard,
  Zap,
  Trophy,
  ClipboardList,
  Gamepad2,
  BarChart3,
  Users,
  AlertTriangle,
  Bell,
  TrendingUp,
  Settings,
  ChevronRight,
  Shield,
  Menu,
  X
} from 'lucide-react'

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: null },
  { id: 'live-ops', label: 'Live Operations', icon: Zap, badge: '2 LIVE', badgeColor: 'bg-red-950 text-red-400 border-red-800' },
  { id: 'tournaments', label: 'Tournament Center', icon: Trophy, badge: null },
  { id: 'registrations', label: 'Registration Queue', icon: ClipboardList, badge: '5 PENDING', badgeColor: 'bg-purple-950 text-purple-300 border-purple-800' },
  { id: 'matches', label: 'Match Control', icon: Gamepad2, badge: null },
  { id: 'leaderboards', label: 'Leaderboards', icon: BarChart3, badge: null },
  { id: 'players', label: 'Players', icon: Users, badge: null },
  { id: 'reports', label: 'Reports', icon: AlertTriangle, badge: '1 NEW', badgeColor: 'bg-amber-950 text-amber-400 border-amber-800' },
  { id: 'notifications', label: 'Notifications', icon: Bell, badge: null },
  { id: 'analytics', label: 'Analytics', icon: TrendingUp, badge: null },
  { id: 'settings', label: 'Settings', icon: Settings, badge: null },
]

export default function AdminSidebar({ activeTab, setActiveTab, mobileOpen, setMobileOpen }) {
  return (
    <>
      {/* Desktop Sidebar (Fixed Left Panel >= 1024px) */}
      <aside className="hidden lg:flex flex-col w-64 bg-slate-900 border-r border-slate-800 shrink-0 min-h-[calc(100vh-80px)] p-4 space-y-6">
        {/* Header Title */}
        <div className="px-3 py-2 bg-slate-950 rounded-2xl border border-slate-800 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-purple-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-purple-950">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-extrabold text-white uppercase tracking-wider">Ops Center</h2>
            <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              System Online
            </span>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id
            return (
              <button
                key={`sidebar-item-${item.id}`}
                onClick={() => setActiveTab(item.id)}
                className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between min-h-[40px] ${
                  isActive
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-950/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge ? (
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold border ${item.badgeColor || 'bg-slate-800 text-slate-300 border-slate-700'}`}>
                    {item.badge}
                  </span>
                ) : (
                  isActive && <ChevronRight className="w-3.5 h-3.5 text-purple-200" />
                )}
              </button>
            )
          })}
        </nav>
      </aside>

      {/* Mobile Drawer (Overlay <= 1024px) */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex">
          <div className="w-72 bg-slate-900 border-r border-slate-800 p-4 space-y-6 flex flex-col h-full overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <Shield className="w-5 h-5 text-purple-400" />
                <span className="font-extrabold text-white text-sm uppercase tracking-wider">Tournament Ops</span>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon
                const isActive = activeTab === item.id
                return (
                  <button
                    key={`mobile-sidebar-${item.id}`}
                    onClick={() => {
                      setActiveTab(item.id)
                      setMobileOpen(false)
                    }}
                    className={`w-full px-4 py-3 rounded-xl text-xs font-bold transition-colors flex items-center justify-between min-h-[44px] ${
                      isActive
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                        : 'text-slate-300 hover:bg-slate-950'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold border ${item.badgeColor}`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                )
              })}
            </nav>
          </div>
        </div>
      )}
    </>
  )
}
