import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Swords, Search, Bell, User, LogOut, Shield, Menu } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'

export default function AdminHeader({
  pageTitle = 'DASHBOARD',
  onSearch,
  onOpenMobileSidebar,
}) {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const { showSuccess, showError } = useToast()
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const adminName = user?.user_metadata?.username || user?.email?.split('@')[0] || 'Admin'
  const adminAvatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.avatarUrl || ''

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
    <header className="sticky top-0 z-50 bg-[#0f1318] border-b border-[#3a494b]/60 h-16 px-4 sm:px-6 flex items-center justify-between shadow-[0_4px_20px_rgba(0,0,0,0.6)]">

      {/* Left: Mobile Toggle, Brand Logo & Current Page Title */}
      <div className="flex items-center gap-3 sm:gap-5">
        {/* Mobile Sidebar Hamburger Trigger */}
        {onOpenMobileSidebar && (
          <button
            onClick={onOpenMobileSidebar}
            className="lg:hidden p-2 rounded-lg bg-[#151a21] border border-[#3a494b]/60 text-[#8e9dae] hover:text-[#00f2ff] focus:outline-none"
            aria-label="Open Admin Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {/* Brand Logo */}
        <Link to="/admin" className="flex items-center gap-2.5 group shrink-0">
          <div className="w-9 h-9 rounded-lg bg-[#00f2ff] p-[1px] shadow-[0_0_12px_rgba(0,242,255,0.4)] group-hover:scale-105 transition-transform">
            <div className="w-full h-full bg-[#07090c] rounded-[7px] flex items-center justify-center">
              <Swords className="w-4.5 h-4.5 text-[#00f2ff]" />
            </div>
          </div>
          <div className="hidden md:block">
            <span className="font-display-lg text-base font-extrabold tracking-wider text-white">
              MJ <span className="text-[#00f2ff]">ESPORTS</span>
            </span>
            <span className="block text-[9px] uppercase font-bold tracking-widest text-[#fe6b00] -mt-1">
              ADMIN CONTROL
            </span>
          </div>
        </Link>

        <div className="h-6 w-[1px] bg-[#3a494b]/60 hidden md:block"></div>

        {/* Current Page Title */}
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-[#00f2ff] hidden xs:block" />
          <h1 className="font-display-lg text-[11px] xs:text-xs sm:text-sm font-extrabold text-white uppercase tracking-wider truncate max-w-[100px] xs:max-w-[140px] sm:max-w-[220px]">
            {pageTitle}
          </h1>
        </div>
      </div>

      {/* Center/Middle: Optional Admin Search Bar */}
      <div className="hidden lg:flex items-center flex-1 max-w-xs mx-6">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-[#8e9dae] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search tournaments, teams..."
            className="w-full pl-9 pr-3 py-1.5 bg-[#07090c] border border-[#3a494b]/60 rounded-lg text-xs text-[#e1e2e7] placeholder-[#8e9dae] focus:outline-none focus:border-[#00f2ff] focus:shadow-[0_0_10px_rgba(0,242,255,0.2)] transition-all"
          />
        </div>
      </div>

      {/* Right: Notifications, Admin Profile & Logout */}
      <div className="flex items-center gap-2.5 shrink-0">

        {/* Live Ops Badge */}
        <span className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#00ff9d]/10 border border-[#00ff9d]/40 text-[#00ff9d] text-[10px] font-mono font-bold uppercase">
          <span className="w-2 h-2 rounded-full bg-[#00ff9d] animate-pulse"></span>
          <span>LIVE OPS CONNECTED</span>
        </span>

        {/* Notifications Icon Button with Badge */}
        <button
          className="relative p-2 rounded-lg bg-[#151a21] border border-[#3a494b]/60 text-[#8e9dae] hover:text-[#00f2ff] hover:border-[#00f2ff]/40 transition-colors"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#fe6b00] animate-pulse"></span>
        </button>

        {/* Admin Profile Dropdown Pill */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#151a21] border border-[#3a494b]/60 hover:border-[#00f2ff] text-xs font-bold transition-colors"
          >
            <div className="w-5 h-5 rounded-full bg-[#00f2ff]/20 border border-[#00f2ff] overflow-hidden flex items-center justify-center shrink-0">
              {adminAvatarUrl ? (
                <img src={adminAvatarUrl} alt={adminName} className="w-full h-full object-cover" />
              ) : (
                <User className="w-3 h-3 text-[#00f2ff]" />
              )}
            </div>
            <span className="text-[#e1e2e7] truncate max-w-[80px] sm:max-w-[120px]">{adminName}</span>
            <span className="px-1.5 py-0.5 text-[9px] font-extrabold bg-[#fe6b00] text-slate-950 rounded uppercase shadow-sm">
              ADMIN
            </span>
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-52 bg-[#151a21] border border-[#3a494b] rounded-xl shadow-2xl py-2 z-50 animate-fadeIn text-xs space-y-1">
              <div className="px-3 py-2 border-b border-[#3a494b]/60">
                <p className="font-bold text-white truncate">{adminName}</p>
                <p className="text-[10px] text-[#8e9dae] uppercase font-mono">System Administrator</p>
              </div>
              <Link
                to="/"
                onClick={() => setShowProfileMenu(false)}
                className="flex items-center gap-2 px-3 py-2 text-[#b9cacb] hover:bg-[#1d232c] hover:text-[#00f2ff] uppercase font-bold text-[11px]"
              >
                <span>View Public Site</span>
              </Link>
              <button
                onClick={() => {
                  setShowProfileMenu(false)
                  handleLogout()
                }}
                className="w-full text-left flex items-center gap-2 px-3 py-2 text-[#ff3366] hover:bg-red-950/40 font-bold uppercase text-[11px]"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>

        {/* Direct Logout Button */}
        <button
          onClick={handleLogout}
          className="p-2 rounded-lg bg-[#151a21] border border-[#3a494b]/60 text-[#8e9dae] hover:text-[#ff3366] hover:border-[#ff3366]/40 transition-colors hidden sm:flex items-center justify-center"
          title="Logout"
        >
          <LogOut className="w-4 h-4" />
        </button>

      </div>

    </header>
  )
}
