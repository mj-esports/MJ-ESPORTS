import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { User, LogOut, Shield, Menu, Search, Home, Settings, ChevronDown } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'

export default function AdminHeader({
  pageTitle = 'ADMIN COMMAND CENTER',
  onSearch,
  onOpenMobileSidebar,
}) {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const { showSuccess, showError } = useToast()
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const dropdownRef = useRef(null)

  const adminName = user?.user_metadata?.username || user?.email?.split('@')[0] || 'Administrator'
  const adminEmail = user?.email || 'admin@mjesports.gg'
  const adminAvatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.avatarUrl || ''

  // Close profile dropdown on outside click or Escape key
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowProfileMenu(false)
      }
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setShowProfileMenu(false)
      }
    }
    if (showProfileMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [showProfileMenu])

  const handleLogout = async () => {
    if (isLoggingOut) return
    setIsLoggingOut(true)
    try {
      await signOut()
      showSuccess('Admin logged out successfully.', 'Session Closed')
      navigate('/login')
    } catch (err) {
      console.error('Logout error:', err)
      showError(err, 'Logout Failed')
    } finally {
      setIsLoggingOut(false)
    }
  }

  const handleSearchChange = (e) => {
    const value = e.target.value
    setSearchQuery(value)
    if (onSearch) {
      onSearch(value)
    }
  }

  return (
    <header className="sticky top-0 z-40 bg-[#141416]/95 backdrop-blur-xl border-b border-[#27272a] h-16 px-3 sm:px-6 flex items-center justify-between shadow-md max-w-full box-border">

      {/* Left: Mobile Toggle, Brand Logo & Command Center Title */}
      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
        {/* Mobile Hamburger Drawer Trigger */}
        {onOpenMobileSidebar && (
          <button
            onClick={onOpenMobileSidebar}
            className="lg:hidden p-2 rounded bg-[#1c1b1c] border border-[#27272a] text-[#849495] hover:text-[#00f2ff] hover:border-[#00f2ff]/40 focus:outline-none transition-all cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center shrink-0"
            aria-label="Open Admin Navigation Drawer"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {/* Brand Logo */}
        <Link to="/admin" className="flex items-center gap-2 group shrink-0" aria-label="MJ ESPORTS Admin Console">
          <img
            src="/mj-esports-logo.png"
            alt="MJ ESPORTS"
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-contain shrink-0 group-hover:scale-105 transition-transform"
          />
          <div className="block min-w-0">
            <span className="font-headline font-extrabold text-xs sm:text-sm tracking-wider text-white uppercase block leading-none truncate">
              MJ <span className="text-[#00f2ff]">ESPORTS</span>
            </span>
            <span className="text-[8px] sm:text-[9px] uppercase font-label-bold text-[#849495] tracking-wider block mt-0.5 leading-none truncate">
              ADMIN CONSOLE
            </span>
          </div>
        </Link>

        <div className="h-5 w-[1px] bg-[#27272a] hidden md:block shrink-0"></div>

        {/* Security Indicator */}
        <div className="hidden sm:flex items-center gap-1.5 text-[#00f2ff] select-none shrink-0" title="Admin Control Console Active">
          <Shield className="w-3.5 h-3.5 text-[#00f2ff] shrink-0" />
        </div>
      </div>

      {/* Right: Search, Status, Notifications & Profile */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">

        {/* Global Admin Search (Hidden on tiny mobile screens) */}
        <div className="relative hidden md:block w-44 lg:w-60">
          <Search className="w-3.5 h-3.5 text-[#849495] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search console..."
            className="w-full bg-[#1c1b1c] border border-[#27272a] rounded pl-8 pr-3 py-1.5 text-xs text-white placeholder-[#849495] focus:border-[#00f2ff] focus:outline-none transition-colors h-[34px] font-body"
          />
        </div>

        {/* Online / Authorized Status Badge */}
        <span className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#10b981]/10 border border-[#10b981]/30 text-[#10b981] text-[10px] font-headline font-bold uppercase tracking-wider select-none shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse"></span>
          <span>ONLINE</span>
        </span>

        {/* Admin Profile Dropdown Pill */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            aria-expanded={showProfileMenu}
            aria-haspopup="true"
            aria-label="Admin account menu"
            className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded bg-[#1c1b1c] border transition-all cursor-pointer min-h-[36px] ${
              showProfileMenu
                ? 'border-[#00f2ff]/60 bg-[#201f20]'
                : 'border-[#27272a] hover:border-[#00f2ff]/40'
            }`}
          >
            <div className="w-5 h-5 rounded-full bg-[#00f2ff]/20 border border-[#00f2ff] overflow-hidden flex items-center justify-center shrink-0">
              {adminAvatarUrl ? (
                <img src={adminAvatarUrl} alt={adminName} className="w-full h-full object-cover" />
              ) : (
                <User className="w-3 h-3 text-[#00f2ff]" />
              )}
            </div>
            <span className="text-white font-headline text-xs truncate max-w-[60px] sm:max-w-[100px] hidden xs:inline">{adminName}</span>
            <span className="px-1.5 py-0.5 text-[8px] font-headline font-extrabold bg-[#00f2ff]/15 text-[#00f2ff] border border-[#00f2ff]/30 rounded uppercase tracking-wider shrink-0">
              ADMIN
            </span>
            <ChevronDown className={`w-3 h-3 text-[#849495] transition-transform duration-200 shrink-0 ${showProfileMenu ? 'rotate-180 text-[#00f2ff]' : ''}`} />
          </button>

          {showProfileMenu && (
            <div
              className="absolute right-0 mt-2 w-56 sm:w-64 bg-[#141416] border border-[#27272a] rounded-lg shadow-2xl py-2 z-50 animate-fadeIn text-xs"
              role="menu"
              aria-orientation="vertical"
              aria-label="Admin profile options"
            >
              {/* Admin identity summary */}
              <div className="px-4 py-2.5 border-b border-[#27272a]">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-bold text-white truncate font-headline text-xs">{adminName}</p>
                  <span className="px-1.5 py-0.5 text-[8px] font-headline font-extrabold bg-[#00f2ff]/15 text-[#00f2ff] border border-[#00f2ff]/30 rounded uppercase tracking-wider shrink-0">
                    ADMIN
                  </span>
                </div>
                <p className="text-[11px] text-[#849495] truncate font-body mt-0.5">{adminEmail}</p>
              </div>

              <div className="p-1 space-y-0.5">
                {/* 1. Open User Portal (Canonical Player-Facing Route) */}
                <Link
                  to="/"
                  onClick={() => setShowProfileMenu(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded text-[#e5e2e3] hover:text-[#00f2ff] hover:bg-[#1c1b1c] font-headline font-bold text-xs transition-colors group cursor-pointer"
                  id="admin-open-user-portal"
                  role="menuitem"
                >
                  <Home className="w-4 h-4 text-[#00f2ff] group-hover:scale-110 transition-transform shrink-0" />
                  <div className="flex flex-col">
                    <span>Open User Portal</span>
                    <span className="text-[10px] text-[#849495] font-normal font-body">Switch to player-facing arena</span>
                  </div>
                </Link>

                {/* 2. Admin Settings */}
                <Link
                  to="/admin/settings"
                  onClick={() => setShowProfileMenu(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded text-[#b9cacb] hover:text-white hover:bg-[#1c1b1c] font-headline font-medium text-xs transition-colors group cursor-pointer"
                  id="admin-settings-link"
                  role="menuitem"
                >
                  <Settings className="w-4 h-4 text-[#849495] group-hover:text-white group-hover:scale-110 transition-transform shrink-0" />
                  <span>Admin Settings</span>
                </Link>
              </div>

              {/* Divider */}
              <div className="border-t border-[#27272a] my-1" />

              {/* 3. Sign Out */}
              <div className="p-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowProfileMenu(false)
                    handleLogout()
                  }}
                  disabled={isLoggingOut}
                  className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-950/20 rounded font-headline font-bold uppercase text-[11px] transition-colors cursor-pointer disabled:opacity-50"
                  id="admin-logout-btn"
                  role="menuitem"
                >
                  <LogOut className="w-3.5 h-3.5 text-red-400 shrink-0" />
                  <span>{isLoggingOut ? 'Signing Out...' : 'Sign Out'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Direct Logout Button */}
        <button
          onClick={handleLogout}
          className="p-2 rounded bg-[#1c1b1c] border border-[#27272a] text-[#849495] hover:text-red-400 hover:border-red-900/40 transition-colors hidden sm:flex items-center justify-center cursor-pointer min-h-[36px] min-w-[36px] shrink-0"
          title="Logout Session"
        >
          <LogOut className="w-4 h-4" />
        </button>

      </div>

    </header>
  )
}
