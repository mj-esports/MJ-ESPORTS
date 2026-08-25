import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Swords, User, LogOut, Shield, Menu, Search, Bell } from 'lucide-react'
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

  const adminName = user?.user_metadata?.username || user?.email?.split('@')[0] || 'Administrator'
  const adminEmail = user?.email || 'admin@mjesports.gg'
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
    <header className="sticky top-0 z-40 bg-[#141416]/95 backdrop-blur-xl border-b border-[#27272a] h-16 px-4 sm:px-6 flex items-center justify-between shadow-md">

      {/* Left: Mobile Toggle, Brand Logo & Command Center Title */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Mobile Hamburger Drawer Trigger */}
        {onOpenMobileSidebar && (
          <button
            onClick={onOpenMobileSidebar}
            className="lg:hidden p-2 rounded bg-[#1c1b1c] border border-[#27272a] text-[#849495] hover:text-[#00f2ff] hover:border-[#00f2ff]/40 focus:outline-none transition-all cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
            aria-label="Open Admin Navigation Drawer"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {/* Brand Logo */}
        <Link to="/admin" className="flex items-center gap-2.5 group shrink-0">
          <div className="w-8 h-8 rounded bg-[#00f2ff] p-[1px] shadow-[0_0_12px_rgba(0,242,255,0.35)] group-hover:scale-105 transition-transform flex items-center justify-center">
            <div className="w-full h-full bg-[#141416] rounded flex items-center justify-center">
              <Swords className="w-4 h-4 text-[#00f2ff]" />
            </div>
          </div>
          <div className="hidden sm:block">
            <span className="font-headline font-extrabold text-sm tracking-wider text-white uppercase block leading-none">
              MJ <span className="text-[#00f2ff]">ESPORTS</span>
            </span>
            <span className="text-[9px] uppercase font-label-bold text-[#849495] tracking-wider block mt-0.5">
              ADMIN CONSOLE
            </span>
          </div>
        </Link>

        <div className="h-5 w-[1px] bg-[#27272a] hidden sm:block"></div>

        {/* Security Indicator */}
        <div className="hidden xs:flex items-center gap-1.5 text-[#00f2ff] select-none" title="Admin Control Console Active">
          <Shield className="w-4 h-4 text-[#00f2ff] shrink-0" />
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
        <span className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#10b981]/10 border border-[#10b981]/30 text-[#10b981] text-[10px] font-headline font-bold uppercase tracking-wider select-none">
          <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse"></span>
          <span>ONLINE</span>
        </span>

        {/* Admin Profile Dropdown Pill */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded bg-[#1c1b1c] border border-[#27272a] hover:border-[#00f2ff]/40 text-xs font-bold transition-all cursor-pointer min-h-[36px]"
          >
            <div className="w-5 h-5 rounded-full bg-[#00f2ff]/20 border border-[#00f2ff] overflow-hidden flex items-center justify-center shrink-0">
              {adminAvatarUrl ? (
                <img src={adminAvatarUrl} alt={adminName} className="w-full h-full object-cover" />
              ) : (
                <User className="w-3 h-3 text-[#00f2ff]" />
              )}
            </div>
            <span className="text-white font-headline text-xs truncate max-w-[70px] sm:max-w-[110px] hidden xs:inline">{adminName}</span>
            <span className="px-1.5 py-0.5 text-[8px] font-headline font-extrabold bg-[#00f2ff]/15 text-[#00f2ff] border border-[#00f2ff]/30 rounded uppercase tracking-wider shrink-0">
              ADMIN
            </span>
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-[#141416] border border-[#27272a] rounded shadow-2xl py-2 z-50 animate-fadeIn text-xs space-y-1">
              <div className="px-4 py-2 border-b border-[#27272a]">
                <p className="font-bold text-white truncate font-headline">{adminName}</p>
                <p className="text-xs text-[#849495] truncate font-body">{adminEmail}</p>
              </div>
              <Link
                to="/"
                onClick={() => setShowProfileMenu(false)}
                className="flex items-center gap-2 px-4 py-2 text-[#b9cacb] hover:bg-[#1c1b1c] hover:text-white font-headline font-bold text-xs transition-colors"
              >
                <span>View Player Arena</span>
              </Link>
              <button
                onClick={() => {
                  setShowProfileMenu(false)
                  handleLogout()
                }}
                className="w-full text-left flex items-center gap-2 px-4 py-2 text-red-400 hover:bg-red-950/20 font-headline font-bold uppercase text-[11px] transition-colors cursor-pointer"
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
          className="p-2 rounded bg-[#1c1b1c] border border-[#27272a] text-[#849495] hover:text-red-400 hover:border-red-900/40 transition-colors hidden sm:flex items-center justify-center cursor-pointer min-h-[36px] min-w-[36px]"
          title="Logout Session"
        >
          <LogOut className="w-4 h-4" />
        </button>

      </div>

    </header>
  )
}
