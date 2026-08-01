import {
  LayoutDashboard,
  Zap,
  Trophy,
  ClipboardList,
  CreditCard,
  Gamepad2,
  BarChart3,
  Users,
  AlertTriangle,
  TrendingUp,
  Settings,
  ChevronRight,
  Shield,
  DollarSign,
  X
} from 'lucide-react'

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: null },
  { id: 'finance', label: 'Finance & Revenue', icon: DollarSign, badge: 'REVENUE', badgeColor: 'bg-[#00f2ff]/10 text-[#00f2ff] border-[#00f2ff]/40' },
  { id: 'tournaments', label: 'Tournament Center', icon: Trophy, badge: null },
  { id: 'registrations', label: 'Registration Queue', icon: ClipboardList, badge: '5 PENDING', badgeColor: 'bg-[#00f2ff]/10 text-[#00f2ff] border-[#00f2ff]/40' },
  { id: 'payments', label: 'Payment Verification', icon: CreditCard, badge: 'VERIFY', badgeColor: 'bg-[#00ff9d]/10 text-[#00ff9d] border-[#00ff9d]/40' },
  { id: 'matches', label: 'Match Control', icon: Gamepad2, badge: 'LIVE OPS', badgeColor: 'bg-[#fe6b00]/10 text-[#fe6b00] border-[#fe6b00]/40' },
  { id: 'leaderboards', label: 'Leaderboards', icon: BarChart3, badge: null },
  { id: 'players', label: 'Players', icon: Users, badge: null },
  { id: 'reports', label: 'Reports', icon: AlertTriangle, badge: '1 NEW', badgeColor: 'bg-[#fe6b00]/10 text-[#fe6b00] border-[#fe6b00]/40' },
  { id: 'analytics', label: 'Analytics', icon: TrendingUp, badge: null },
  { id: 'settings', label: 'Settings', icon: Settings, badge: null },
]

export default function AdminSidebar({ activeTab, setActiveTab, mobileOpen, setMobileOpen }) {
  return (
    <>
      {/* Desktop Sidebar (Fixed Left Panel >= 1024px) */}
      <aside className="hidden lg:flex flex-col w-64 bg-[#151a21] border-r border-[#3a494b]/60 shrink-0 min-h-[calc(100vh-64px)] p-4 space-y-6">
        {/* Header Title */}
        <div className="px-3 py-2.5 bg-[#07090c] rounded-lg border border-[#3a494b]/60 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#00f2ff] flex items-center justify-center text-[#00363a] font-bold shrink-0 shadow-[0_0_12px_rgba(0,242,255,0.4)]">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-display-lg text-xs font-extrabold text-white uppercase tracking-wider">Ops Center</h2>
            <span className="font-mono text-[10px] font-semibold text-[#00ff9d] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00ff9d] animate-pulse"></span>
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
                className={`w-full px-3.5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-between min-h-[40px] ${
                  isActive
                    ? 'bg-[#00f2ff] text-[#00363a] font-extrabold shadow-[0_0_12px_rgba(0,242,255,0.4)]'
                    : 'text-[#b9cacb] hover:text-[#00f2ff] hover:bg-[#1d232c]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#00363a]' : 'text-[#8e9dae]'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge ? (
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-extrabold border ${item.badgeColor || 'bg-[#07090c] text-[#8e9dae] border-[#3a494b]'}`}>
                    {item.badge}
                  </span>
                ) : (
                  isActive && <ChevronRight className="w-3.5 h-3.5 text-[#00363a]" />
                )}
              </button>
            )
          })}
        </nav>
      </aside>

      {/* Mobile Drawer (Overlay <= 1024px) */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex">
          <div className="w-72 bg-[#151a21] border-r border-[#3a494b] p-4 space-y-6 flex flex-col h-full overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#3a494b]/60">
              <div className="flex items-center gap-2.5">
                <Shield className="w-5 h-5 text-[#00f2ff]" />
                <span className="font-display-lg font-extrabold text-white text-sm uppercase tracking-wider">Tournament Ops</span>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-2 rounded-lg bg-[#07090c] border border-[#3a494b] text-[#8e9dae] hover:text-white"
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
                    key={`mobile-sidebar-item-${item.id}`}
                    onClick={() => {
                      setActiveTab(item.id)
                      setMobileOpen(false)
                    }}
                    className={`w-full px-3.5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-between min-h-[44px] ${
                      isActive
                        ? 'bg-[#00f2ff] text-[#00363a] font-extrabold'
                        : 'text-[#b9cacb] hover:text-white hover:bg-[#1d232c]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-extrabold border ${item.badgeColor || 'bg-[#07090c] text-[#8e9dae] border-[#3a494b]'}`}>
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
