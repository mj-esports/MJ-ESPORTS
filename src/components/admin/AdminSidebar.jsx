import { useEffect } from 'react'
import {
  LayoutDashboard,
  Trophy,
  CreditCard,
  TrendingUp,
  Users,
  Settings,
  ChevronRight,
  Shield,
  X
} from 'lucide-react'

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: null },
  { id: 'tournaments', label: 'Tournaments', icon: Trophy, badge: null },
  { id: 'players', label: 'Players', icon: Users, badge: null },
  {
    id: 'payments',
    label: 'Payments',
    icon: CreditCard,
    badge: '5 PENDING',
    badgeColor: 'bg-[#fe6b00]/10 text-[#fe6b00] border-[#fe6b00]/40',
  },
  { id: 'analytics', label: 'Analytics', icon: TrendingUp, badge: null },
  { id: 'settings', label: 'Settings', icon: Settings, badge: null },
]

export default function AdminSidebar({ activeTab, setActiveTab, mobileOpen, setMobileOpen }) {
  // Lock body scroll when mobile sidebar drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  const renderNavContent = (isMobile = false) => {
    return (
      <nav className="flex-1 space-y-1.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive =
            activeTab === item.id ||
            (activeTab === 'finance' && item.id === 'analytics') ||
            (activeTab === 'matches' && item.id === 'tournaments') ||
            (activeTab === 'teams' && item.id === 'players')
          return (
            <button
              key={`nav-item-${item.id}${isMobile ? '-m' : ''}`}
              onClick={() => {
                setActiveTab(item.id)
                if (isMobile && setMobileOpen) setMobileOpen(false)
              }}
              className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-between min-h-[44px] ${
                isActive
                  ? 'bg-[#00f2ff] text-[#00363a] font-extrabold shadow-[0_0_12px_rgba(0,242,255,0.35)]'
                  : 'text-[#b9cacb] hover:text-[#00f2ff] hover:bg-[#1d232c]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#00363a]' : 'text-[#8e9dae]'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge ? (
                <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-extrabold border ${item.badgeColor || 'bg-[#07090c] text-[#fe6b00] border-[#fe6b00]/40'}`}>
                  {item.badge}
                </span>
              ) : (
                isActive && <ChevronRight className="w-3.5 h-3.5 text-[#00363a]" />
              )}
            </button>
          )
        })}
      </nav>
    )
  }

  return (
    <>
      {/* Desktop Sidebar (Fixed Left Panel w-56 >= 1024px) */}
      <aside className="hidden lg:flex flex-col w-56 bg-[#151a21] border-r border-[#3a494b]/60 shrink-0 min-h-[calc(100vh-64px)] p-3.5 space-y-4">
        {/* Compact Ops Header */}
        <div className="px-3 py-2 bg-[#07090c] rounded-xl border border-[#3a494b]/60 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#00f2ff] flex items-center justify-center text-[#00363a] font-bold shrink-0 shadow-[0_0_10px_rgba(0,242,255,0.4)]">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-display-lg text-xs font-extrabold text-white uppercase tracking-wider">Ops Center</h2>
            <span className="font-mono text-[9px] font-semibold text-[#00ff9d] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00ff9d]"></span>
              Online
            </span>
          </div>
        </div>

        {/* 6 Flat Nav Items */}
        {renderNavContent(false)}
      </aside>

      {/* Mobile Drawer (Overlay w-64 <= 1024px) */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="lg:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-64 bg-[#151a21] border-r border-[#3a494b] p-4 space-y-4 flex flex-col h-full overflow-y-auto shadow-2xl"
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#3a494b]/60">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#00f2ff]" />
                <span className="font-display-lg font-extrabold text-white text-xs uppercase tracking-wider">Admin Ops</span>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-1.5 rounded-lg bg-[#07090c] border border-[#3a494b] text-[#8e9dae] hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Close Mobile Sidebar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {renderNavContent(true)}
          </div>
        </div>
      )}
    </>
  )
}
