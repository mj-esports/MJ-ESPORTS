import { useState, useEffect, useCallback } from 'react'
import {
  LayoutDashboard,
  Trophy,
  Swords,
  Award,
  Users,
  CreditCard,
  BarChart3,
  Settings,
  ChevronRight,
  Shield,
  X,
} from 'lucide-react'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'

export const NAV_GROUPS = [
  {
    id: 'operations',
    title: 'OPERATIONS',
    items: [
      { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
      { id: 'tournaments', label: 'Tournaments', icon: Trophy },
      { id: 'matches', label: 'Match Control', icon: Swords, badgeKey: 'matches' },
      { id: 'results', label: 'Results', icon: Award, badgeKey: 'results' },
    ],
  },
  {
    id: 'management',
    title: 'MANAGEMENT',
    items: [
      { id: 'players', label: 'Players', icon: Users },
      { id: 'finance', label: 'Finance', icon: CreditCard, badgeKey: 'finance' },
    ],
  },
  {
    id: 'insights',
    title: 'INSIGHTS',
    items: [
      { id: 'reports', label: 'Reports', icon: BarChart3 },
    ],
  },
  {
    id: 'system',
    title: 'SYSTEM',
    items: [
      { id: 'settings', label: 'Settings', icon: Settings },
    ],
  },
]

export const NAV_ITEMS = NAV_GROUPS.flatMap((group) => group.items)

export default function AdminSidebar({
  activeTab,
  setActiveTab,
  mobileOpen,
  setMobileOpen,
  tournaments = [],
}) {
  const [pendingCounts, setPendingCounts] = useState({
    matches: 0,
    results: 0,
    finance: 0,
  })

  // Synchronize actual application pending counts
  const fetchPendingCounts = useCallback(async () => {
    try {
      let liveMatches = 0
      let pendingResults = 0
      let pendingFinance = 0

      // 1. Initial calculation from in-memory tournaments
      if (Array.isArray(tournaments) && tournaments.length > 0) {
        tournaments.forEach((t) => {
          const status = String(t.status || '').trim().toUpperCase()
          if (status === 'LIVE' || status === 'LIVE NOW') {
            liveMatches += 1
          }
          if (
            status === 'RESULTS PENDING' ||
            status === 'RESULTS_PENDING' ||
            status === 'PENDING RESULTS'
          ) {
            pendingResults += 1
          }
        })
      }

      // 2. Authoritative live query from Supabase
      if (isSupabaseConfigured) {
        const [
          { count: pendingRegsCount },
          { count: pendingWithCount },
          { data: liveDbTourns },
        ] = await Promise.all([
          supabase
            .from('tournament_registrations')
            .select('*', { count: 'exact', head: true })
            .or('status.eq.Pending,payment_status.eq.Pending,payment_status.eq.PENDING'),
          supabase
            .from('wallet_transactions')
            .select('*', { count: 'exact', head: true })
            .eq('type', 'Withdrawal')
            .eq('status', 'Pending'),
          supabase
            .from('tournaments')
            .select('id, status'),
        ])

        if (liveDbTourns && liveDbTourns.length > 0) {
          liveMatches = liveDbTourns.filter((t) => {
            const s = String(t.status || '').trim().toUpperCase()
            return s === 'LIVE' || s === 'LIVE NOW'
          }).length

          pendingResults = liveDbTourns.filter((t) => {
            const s = String(t.status || '').trim().toUpperCase()
            return s === 'RESULTS PENDING' || s === 'RESULTS_PENDING' || s === 'PENDING RESULTS'
          }).length
        }

        pendingFinance = (pendingRegsCount || 0) + (pendingWithCount || 0)
      }

      setPendingCounts({
        matches: liveMatches,
        results: pendingResults,
        finance: pendingFinance,
      })
    } catch (err) {
      console.warn('[AdminSidebar pendingCounts Notice]:', err?.message || err)
    }
  }, [tournaments])

  useEffect(() => {
    fetchPendingCounts()
  }, [fetchPendingCounts])

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
      <nav className="flex-1 space-y-4 overflow-y-auto pr-1">
        {NAV_GROUPS.map((group) => (
          <div key={`nav-group-${group.id}`} className="space-y-1">
            <div className="px-3 pt-1 pb-1 text-[10px] font-headline font-extrabold uppercase tracking-widest text-[#849495]/70 select-none">
              {group.title}
            </div>

            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon
                const active = isItemActive(item.id)
                const badgeCount = item.badgeKey ? pendingCounts[item.badgeKey] || 0 : 0

                return (
                  <button
                    key={`nav-item-${item.id}`}
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full px-3 py-2 rounded font-headline font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-between min-h-[38px] sm:min-h-[40px] cursor-pointer select-none group ${
                      active
                        ? 'bg-[#00f2ff] text-[#00363a] font-extrabold shadow-[0_0_15px_rgba(0,242,255,0.25)]'
                        : 'text-[#849495] hover:text-white hover:bg-[#1c1b1c]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-colors ${
                          active ? 'text-[#00363a]' : 'text-[#849495] group-hover:text-white'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {badgeCount > 0 && (
                        <span
                          className={`px-1.5 py-0.5 rounded-full text-[9px] font-headline font-extrabold leading-none ${
                            active
                              ? 'bg-[#00363a] text-[#00f2ff]'
                              : 'bg-[#ff5e07]/20 text-[#ff5e07] border border-[#ff5e07]/40'
                          }`}
                        >
                          {badgeCount}
                        </span>
                      )}
                      {active && <ChevronRight className="w-3.5 h-3.5 text-[#00363a] shrink-0" />}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </nav>
    )
  }

  return (
    <>
      {/* Desktop Sidebar (Fixed Left Panel >= 1024px) */}
      <aside className="hidden lg:flex flex-col w-60 bg-[#141416] border-r border-[#27272a] shrink-0 min-h-[calc(100vh-64px)] p-4 space-y-4">
        {/* Ops Status Header */}
        <div className="px-3 py-2.5 bg-[#1c1b1c] rounded border border-[#27272a] flex items-center gap-2.5 shrink-0">
          <div className="w-7 h-7 rounded bg-[#00f2ff]/10 border border-[#00f2ff]/30 flex items-center justify-center text-[#00f2ff] font-bold shrink-0">
            <Shield className="w-3.5 h-3.5" />
          </div>
          <div>
            <h2 className="font-headline text-xs font-bold text-white uppercase tracking-wider leading-none">Ops Console</h2>
            <span className="font-headline text-[9px] font-bold text-[#10b981] flex items-center gap-1 uppercase mt-1 leading-none">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse"></span>
              ALL SYSTEMS GO
            </span>
          </div>
        </div>

        {/* 4 Grouped Nav Sections */}
        {renderNavList()}

        {/* Global Telemetry Status (Compact Bottom Area) */}
        <div className="pt-3 border-t border-[#27272a] mt-auto shrink-0">
          <div className="px-3 py-2 bg-[#1c1b1c] rounded border border-[#27272a] flex items-center justify-between text-xs font-body select-none">
            <span className="text-[#849495] text-xs">Telemetry Stream:</span>
            <span className="font-headline font-bold text-[#10b981] text-[10px] uppercase flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse"></span>
              ONLINE
            </span>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer Overlay (< 1024px) */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="lg:hidden fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-64 max-w-[80vw] bg-[#141416] border-r border-[#27272a] p-4 space-y-3 flex flex-col h-full overflow-y-auto shadow-2xl"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#27272a] shrink-0">
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

            {/* Global Telemetry Status for Mobile Drawer */}
            <div className="pt-3 border-t border-[#27272a] mt-auto shrink-0">
              <div className="px-3 py-2 bg-[#1c1b1c] rounded border border-[#27272a] flex items-center justify-between text-xs font-body select-none">
                <span className="text-[#849495] text-xs">Telemetry Stream:</span>
                <span className="font-headline font-bold text-[#10b981] text-[10px] uppercase flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse"></span>
                  ONLINE
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

