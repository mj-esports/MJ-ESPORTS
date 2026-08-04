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
              className={`w-full px-4 py-3 rounded-xl text-xs font-headline font-bold uppercase tracking-wider transition-all flex items-center justify-between min-h-[44px] ${
                isActive
                  ? 'bg-[#00f2ff] text-black font-black shadow-[0_0_15px_rgba(34,211,238,0.35)]'
                  : 'text-[#a1a1aa] hover:text-white hover:bg-[#27272a]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-black' : 'text-[#a1a1aa]'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge ? (
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold border ${item.badgeColor || 'bg-[#09090b] text-[#fe6b00] border-[#fe6b00]/40'}`}>
                  {item.badge}
                </span>
              ) : (
                isActive && <ChevronRight className="w-3.5 h-3.5 text-black" />
              )}
            </button>
          )
        })}
      </nav>
    )
  }

  return (
    <>
      {/* Desktop Sidebar (Fixed Left Panel w-60 >= 1024px) */}
      <aside className="hidden lg:flex flex-col w-60 bg-[#18181b]/80 backdrop-blur-xl border-r border-[#27272a] shrink-0 min-h-[calc(100vh-64px)] p-4 space-y-5">
        {/* Compact Ops Header */}
        <div className="px-3.5 py-2.5 bg-[#09090b] rounded-xl border border-[#27272a] flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#00f2ff]/10 border border-[#00f2ff]/40 flex items-center justify-center text-[#00f2ff] font-bold shrink-0 shadow-[0_0_12px_rgba(0,242,255,0.25)]">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-headline text-xs font-black text-white uppercase tracking-wider">Control Center</h2>
            <span className="font-mono text-[9px] font-bold text-[#00ff9d] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00ff9d] animate-pulse"></span>
              ALL SYSTEMS GO
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
            className="w-64 bg-[#18181b] border-r border-[#27272a] p-4 space-y-4 flex flex-col h-full overflow-y-auto shadow-2xl"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#27272a]">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#00f2ff]" />
                <span className="font-headline font-black text-white text-xs uppercase tracking-wider">Admin Ops</span>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-1.5 rounded-xl bg-[#09090b] border border-[#27272a] text-[#a1a1aa] hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center"
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
