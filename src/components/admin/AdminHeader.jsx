import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Swords, User, LogOut, Shield, Menu } from 'lucide-react'
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
    <header className="sticky top-0 z-50 bg-[#0b0e11]/90 backdrop-blur-xl border-b border-[#27272a] h-16 px-4 sm:px-6 flex items-center justify-between shadow-[0_4px_25px_rgba(0,0,0,0.8)]">

      {/* Left: Mobile Toggle, Brand Logo & Current Page Title */}
      <div className="flex items-center gap-3 sm:gap-5">
        {/* Mobile Sidebar Hamburger Trigger */}
        {onOpenMobileSidebar && (
          <button
            onClick={onOpenMobileSidebar}
            className="lg:hidden p-2 rounded-xl bg-[#18181b] border border-[#27272a] text-[#a1a1aa] hover:text-[#00f2ff] hover:border-[#00f2ff] focus:outline-none transition-all"
            aria-label="Open Admin Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {/* Brand Logo */}
        <Link to="/admin" className="flex items-center gap-3 group shrink-0">
          <div className="w-9 h-9 rounded-xl bg-[#00f2ff] p-[1px] shadow-[0_0_15px_rgba(0,242,255,0.4)] group-hover:scale-105 transition-transform">
            <div className="w-full h-full bg-[#09090b] rounded-[11px] flex items-center justify-center">
              <Swords className="w-5 h-5 text-[#00f2ff]" />
            </div>
          </div>
          <div className="hidden md:block">
            <span className="font-headline font-black text-base tracking-wider text-white uppercase italic">
              MJ <span className="text-[#00f2ff]">ESPORTS</span>
            </span>
            <span className="block text-[9px] uppercase font-mono font-bold tracking-widest text-[#fe6b00] -mt-1">
              OPS CENTER v2.6
            </span>
          </div>
        </Link>

        <div className="h-6 w-[1px] bg-[#27272a] hidden md:block"></div>

        {/* Current Page Title */}
        <div className="flex items-center gap-2 min-w-0">
          <Shield className="w-4 h-4 text-[#00f2ff] hidden xs:block shrink-0" />
          <h1 className="font-headline text-xs sm:text-sm font-black text-white uppercase tracking-wider truncate max-w-[80px] xs:max-w-[140px] sm:max-w-[240px]">
            {pageTitle}
          </h1>
        </div>
      </div>

      {/* Right: Telemetry Badge & Admin Profile */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">

        {/* Live Telemetry Connected Pill */}
        <span className="hidden xl:flex items-center gap-2 px-3 py-1 rounded-full bg-[#00ff9d]/10 border border-[#00ff9d]/30 text-[#00ff9d] text-[10px] font-mono font-bold uppercase tracking-wider">
          <span className="w-2 h-2 rounded-full bg-[#00ff9d] animate-pulse"></span>
          <span>TELEMETRY ONLINE</span>
        </span>

        {/* Admin Profile Dropdown Pill */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#18181b] border border-[#27272a] hover:border-[#00f2ff] text-xs font-bold transition-all shadow-sm"
          >
            <div className="w-5.5 h-5.5 rounded-full bg-[#00f2ff]/20 border border-[#00f2ff] overflow-hidden flex items-center justify-center shrink-0">
              {adminAvatarUrl ? (
                <img src={adminAvatarUrl} alt={adminName} className="w-full h-full object-cover" />
              ) : (
                <User className="w-3.5 h-3.5 text-[#00f2ff]" />
              )}
            </div>
            <span className="text-white font-mono truncate max-w-[60px] xs:max-w-[90px] sm:max-w-[120px]">{adminName}</span>
            <span className="px-2 py-0.5 text-[9px] font-headline font-extrabold bg-[#fe6b00] text-black rounded-full uppercase tracking-wider shrink-0">
              SUPERADMIN
            </span>
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-[#18181b]/95 backdrop-blur-xl border border-[#27272a] rounded-2xl shadow-2xl py-2 z-50 animate-fadeIn text-xs space-y-1 font-mono">
              <div className="px-4 py-2.5 border-b border-[#27272a]">
                <p className="font-bold text-white truncate font-sans">{adminName}</p>
                <p className="text-[10px] text-[#00f2ff] uppercase font-mono font-bold mt-0.5">Root Administrator</p>
              </div>
              <Link
                to="/"
                onClick={() => setShowProfileMenu(false)}
                className="flex items-center gap-2 px-4 py-2.5 text-[#a1a1aa] hover:bg-[#27272a] hover:text-white uppercase font-bold text-[11px] transition-colors"
              >
                <span>View Player Arena</span>
              </Link>
              <button
                onClick={() => {
                  setShowProfileMenu(false)
                  handleLogout()
                }}
                className="w-full text-left flex items-center gap-2 px-4 py-2.5 text-[#ff3366] hover:bg-[#ff3366]/10 font-bold uppercase text-[11px] transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout Session</span>
              </button>
            </div>
          )}
        </div>

        {/* Direct Logout Button */}
        <button
          onClick={handleLogout}
          className="p-2 rounded-xl bg-[#18181b] border border-[#27272a] text-[#a1a1aa] hover:text-[#ff3366] hover:border-[#ff3366]/40 transition-colors hidden sm:flex items-center justify-center"
          title="Logout"
        >
          <LogOut className="w-4 h-4" />
        </button>

      </div>

    </header>
  )
}
