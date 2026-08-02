import { useState, useEffect } from 'react'
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
  ChevronDown,
  Shield,
  DollarSign,
  Award,
  X
} from 'lucide-react'

export const NAV_GROUPS = [
  {
    type: 'item',
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    badge: null,
  },
  {
    type: 'group',
    id: 'tournaments_ops',
    label: 'Tournament Operations',
    icon: Trophy,
    items: [
      { id: 'tournaments', label: 'Tournament Center', icon: Trophy, badge: null },
      { id: 'registrations', label: 'Registration Queue', icon: ClipboardList, badge: '5 PENDING', badgeColor: 'bg-[#00f2ff]/10 text-[#00f2ff] border-[#00f2ff]/40' },
      { id: 'payments', label: 'Payment Verification', icon: CreditCard, badge: 'VERIFY', badgeColor: 'bg-[#00ff9d]/10 text-[#00ff9d] border-[#00ff9d]/40' },
      { id: 'matches', label: 'Match Control', icon: Gamepad2, badge: 'LIVE OPS', badgeColor: 'bg-[#fe6b00]/10 text-[#fe6b00] border-[#fe6b00]/40' },
    ],
  },
  {
    type: 'group',
    id: 'community_ops',
    label: 'Community',
    icon: Users,
    items: [
      { id: 'players', label: 'Players', icon: Users, badge: null },
      { id: 'teams', label: 'Teams', icon: Shield, badge: 'NEW', badgeColor: 'bg-[#00f2ff]/10 text-[#00f2ff] border-[#00f2ff]/40' },
      { id: 'leaderboards', label: 'Leaderboards', icon: BarChart3, badge: null },
    ],
  },
  {
    type: 'group',
    id: 'business_ops',
    label: 'Business',
    icon: DollarSign,
    items: [
      { id: 'finance', label: 'Finance & Revenue', icon: DollarSign, badge: 'REVENUE', badgeColor: 'bg-[#00f2ff]/10 text-[#00f2ff] border-[#00f2ff]/40' },
      { id: 'sponsorships', label: 'Sponsorships', icon: Award, badge: 'FUTURE', badgeColor: 'bg-[#fe6b00]/10 text-[#fe6b00] border-[#fe6b00]/40' },
      { id: 'reports', label: 'Reports', icon: AlertTriangle, badge: '1 NEW', badgeColor: 'bg-[#fe6b00]/10 text-[#fe6b00] border-[#fe6b00]/40' },
    ],
  },
  {
    type: 'item',
    id: 'analytics',
    label: 'Analytics',
    icon: TrendingUp,
    badge: null,
  },
  {
    type: 'item',
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    badge: null,
  },
]

// Flat export of all navigation items for backward compatibility
export const NAV_ITEMS = NAV_GROUPS.flatMap((g) => (g.type === 'group' ? g.items : [g]))

export default function AdminSidebar({ activeTab, setActiveTab, mobileOpen, setMobileOpen }) {
  // Collapsible groups expansion state
  const [openGroups, setOpenGroups] = useState(() => {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('mj_esports_admin_nav_groups')
      if (saved) {
        try {
          return JSON.parse(saved)
        } catch (e) {
          // fallback
        }
      }
    }
    return {
      tournaments_ops: true,
      community_ops: true,
      business_ops: true,
    }
  })

  // Auto-expand group if activeTab belongs to it
  useEffect(() => {
    NAV_GROUPS.forEach((group) => {
      if (group.type === 'group') {
        const containsActive = group.items.some((item) => item.id === activeTab)
        if (containsActive && !openGroups[group.id]) {
          setOpenGroups((prev) => {
            const next = { ...prev, [group.id]: true }
            if (typeof localStorage !== 'undefined') {
              localStorage.setItem('mj_esports_admin_nav_groups', JSON.stringify(next))
            }
            return next
          })
        }
      }
    })
  }, [activeTab])

  const toggleGroup = (groupId) => {
    setOpenGroups((prev) => {
      const next = { ...prev, [groupId]: !prev[groupId] }
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('mj_esports_admin_nav_groups', JSON.stringify(next))
      }
      return next
    })
  }

  const renderNavContent = (isMobile = false) => {
    return (
      <nav className="flex-1 space-y-3 overflow-y-auto">
        {NAV_GROUPS.map((element) => {
          if (element.type === 'item') {
            const Icon = element.icon
            const isActive = activeTab === element.id
            return (
              <button
                key={`nav-single-${element.id}${isMobile ? '-m' : ''}`}
                onClick={() => {
                  setActiveTab(element.id)
                  if (isMobile && setMobileOpen) setMobileOpen(false)
                }}
                className={`w-full px-3.5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-between min-h-[40px] ${
                  isActive
                    ? 'bg-[#00f2ff] text-[#00363a] font-extrabold shadow-[0_0_12px_rgba(0,242,255,0.4)]'
                    : 'text-[#b9cacb] hover:text-[#00f2ff] hover:bg-[#1d232c]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#00363a]' : 'text-[#8e9dae]'}`} />
                  <span>{element.label}</span>
                </div>
                {element.badge ? (
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-extrabold border ${element.badgeColor || 'bg-[#07090c] text-[#8e9dae] border-[#3a494b]'}`}>
                    {element.badge}
                  </span>
                ) : (
                  isActive && <ChevronRight className="w-3.5 h-3.5 text-[#00363a]" />
                )}
              </button>
            )
          }

          // Render Collapsible Group Header & Sub-Items
          const GroupIcon = element.icon
          const isOpen = !!openGroups[element.id]
          const isGroupActive = element.items.some((item) => item.id === activeTab)

          return (
            <div key={`nav-group-${element.id}${isMobile ? '-m' : ''}`} className="space-y-1">
              <button
                onClick={() => toggleGroup(element.id)}
                className={`w-full px-3.5 py-2 rounded-lg text-xs font-extrabold uppercase tracking-wider transition-all flex items-center justify-between text-left ${
                  isGroupActive
                    ? 'text-[#00f2ff] bg-[#00f2ff]/5 border-l-2 border-[#00f2ff]'
                    : 'text-[#8e9dae] hover:text-white hover:bg-[#1d232c]/60'
                }`}
              >
                <div className="flex items-center gap-2">
                  <GroupIcon className={`w-3.5 h-3.5 ${isGroupActive ? 'text-[#00f2ff]' : 'text-[#8e9dae]'}`} />
                  <span>{element.label}</span>
                </div>
                {isOpen ? (
                  <ChevronDown className="w-3.5 h-3.5 text-[#8e9dae]" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-[#8e9dae]" />
                )}
              </button>

              {/* Sub-Items List */}
              {isOpen && (
                <div className="pl-3 space-y-1 border-l border-[#3a494b]/40 ml-3.5 pt-1">
                  {element.items.map((subItem) => {
                    const SubIcon = subItem.icon
                    const isSubActive = activeTab === subItem.id
                    return (
                      <button
                        key={`nav-sub-${subItem.id}${isMobile ? '-m' : ''}`}
                        onClick={() => {
                          setActiveTab(subItem.id)
                          if (isMobile && setMobileOpen) setMobileOpen(false)
                        }}
                        className={`w-full px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-between min-h-[36px] ${
                          isSubActive
                            ? 'bg-[#00f2ff] text-[#00363a] font-extrabold shadow-[0_0_10px_rgba(0,242,255,0.4)]'
                            : 'text-[#b9cacb] hover:text-[#00f2ff] hover:bg-[#1d232c]'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <SubIcon className={`w-3.5 h-3.5 ${isSubActive ? 'text-[#00363a]' : 'text-[#8e9dae]'}`} />
                          <span>{subItem.label}</span>
                        </div>
                        {subItem.badge && (
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-extrabold border ${subItem.badgeColor || 'bg-[#07090c] text-[#8e9dae] border-[#3a494b]'}`}>
                            {subItem.badge}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>
    )
  }

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

        {/* Navigation List with Collapsible Groups */}
        {renderNavContent(false)}
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

            {renderNavContent(true)}
          </div>
        </div>
      )}
    </>
  )
}
