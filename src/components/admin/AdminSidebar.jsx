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
  X,
  Swords,
  BarChart3,
  Flame,
  Award
} from 'lucide-react'

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
  { id: 'tournaments', label: 'Tournaments', icon: Trophy },
  { id: 'matches', label: 'Match Control', icon: Swords },
  { id: 'results', label: 'Results', icon: Award },
  { id: 'players', label: 'Players', icon: Users },
  { id: 'finance', label: 'Finance', icon: CreditCard },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
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

  const isItemActive = (itemId) => {
    if (activeTab === itemId) return true
    if (itemId === 'dashboard' && (activeTab === 'overview' || activeTab === 'command-center')) return true
    if (itemId === 'finance' && activeTab === 'payments') return true
    if (itemId === 'reports' && activeTab === 'analytics') return true
    if (itemId === 'matches' && activeTab === 'match-control') return true
    return false
  }

  const handleNavClick = (itemId) => {
    setActiveTab(itemId)
    if (setMobileOpen) {
      setMobileOpen(false)
    }
  }

  const renderNavList = () => {
    return (
      <nav className="flex-1 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const active = isItemActive(item.id)

          return (
            <button
              key={`nav-item-${item.id}`}
              onClick={() => handleNavClick(item.id)}
              className={`w-full px-3.5 py-2.5 rounded font-headline font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-between min-h-[40px] cursor-pointer select-none ${
                active
                  ? 'bg-[#00f2ff] text-[#00363a] font-extrabold shadow-[0_0_15px_rgba(0,242,255,0.3)]'
                  : 'text-[#849495] hover:text-white hover:bg-[#1c1b1c]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-[#00363a]' : 'text-[#849495]'}`} />
                <span>{item.label}</span>
              </div>
              {active && <ChevronRight className="w-3.5 h-3.5 text-[#00363a] shrink-0" />}
            </button>
          )
        })}
      </nav>
    )
  }

  return (
    <>
      {/* Desktop Sidebar (Fixed Left Panel >= 1024px) */}
      <aside className="hidden lg:flex flex-col w-60 bg-[#141416] border-r border-[#27272a] shrink-0 min-h-[calc(100vh-64px)] p-4 space-y-5">
        {/* Ops Status Header */}
        <div className="px-3.5 py-2.5 bg-[#1c1b1c] rounded border border-[#27272a] flex items-center gap-3">
          <div className="w-7 h-7 rounded bg-[#00f2ff]/10 border border-[#00f2ff]/30 flex items-center justify-center text-[#00f2ff] font-bold shrink-0">
            <Shield className="w-3.5 h-3.5" />
          </div>
          <div>
            <h2 className="font-headline text-xs font-bold text-white uppercase tracking-wider">Ops Console</h2>
            <span className="font-headline text-[9px] font-bold text-[#10b981] flex items-center gap-1 uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse"></span>
              ALL SYSTEMS GO
            </span>
          </div>
        </div>

        {/* 7 Core Nav Items */}
        {renderNavList()}
      </aside>

      {/* Mobile Drawer Overlay (< 1024px) */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="lg:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-64 bg-[#141416] border-r border-[#27272a] p-4 space-y-4 flex flex-col h-full overflow-y-auto shadow-2xl"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#27272a]">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#00f2ff]" />
                <span className="font-headline font-extrabold text-white text-xs uppercase tracking-wider">
                  Admin Console
                </span>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-1.5 rounded bg-[#1c1b1c] border border-[#27272a] text-[#849495] hover:text-white min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
                aria-label="Close Admin Navigation"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {renderNavList()}
          </div>
        </div>
      )}
    </>
  )
}

