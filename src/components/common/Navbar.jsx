import { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Swords,
  Menu,
  X,
  User,
  LogOut,
  Shield,
  Settings,
  Wallet,
  Bell,
  ChevronDown,
  Info,
  Mail,
  ShieldCheck,
  Check
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { fetchUserNotifications, markNotificationAsRead } from '../../services/notificationService'

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [userDropdownOpen, setUserDropdownOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  
  const location = useLocation()
  const navigate = useNavigate()
  const { user, isAuthenticated, isAdmin, signOut } = useAuth()
  const { showSuccess, showError } = useToast()

  const dropdownRef = useRef(null)
  const notifRef = useRef(null)

  // Fetch notifications
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      fetchUserNotifications(user.id)
        .then((data) => setNotifications(data || []))
        .catch((err) => console.warn('[Navbar notifications fetch warn]:', err))
    }
  }, [isAuthenticated, user?.id, location.pathname])

  // Click outside listener for dropdowns
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setUserDropdownOpen(false)
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotificationsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileMenuOpen])

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Tournaments', path: '/tournaments' },
    { name: 'Leaderboard', path: '/leaderboard' },
  ]

  const isActive = (path) => location.pathname === path

  const handleSignOut = async () => {
    if (isSigningOut) return
    setIsSigningOut(true)
    setUserDropdownOpen(false)
    try {
      await signOut()
      showSuccess('Signed out successfully.', 'Session Closed')
      navigate('/login')
    } catch (err) {
      console.error('Sign Out Error:', err)
      showError(err, 'Sign Out Error')
    } finally {
      setIsSigningOut(false)
    }
  }

  const handleMarkAllRead = async () => {
    const unread = notifications.filter((n) => !n.is_read)
    if (unread.length === 0) return

    try {
      await Promise.all(unread.map((n) => markNotificationAsRead(n.id)))
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
      showSuccess('All notifications marked as read.', 'Cleared')
    } catch (err) {
      console.warn('[Navbar mark read warn]:', err)
    }
  }

  const userDisplayName = user?.user_metadata?.username || user?.email?.split('@')[0] || 'Player'
  const userWalletBalance = user?.user_metadata?.wallet_balance ?? 0.0
  const userAvatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.avatarUrl || ''
  const unreadNotificationsCount = notifications.filter((n) => !n.is_read).length

  return (
    <nav className="sticky top-0 z-50 bg-[#111417]/85 backdrop-blur-md border-b border-[#3a494b]/60 shadow-[0_8px_24px_rgba(0,0,0,0.5)]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-[#00f2ff] focus:text-[#00363a] focus:font-headline focus:font-bold focus:rounded-md shadow-lg uppercase text-xs"
      >
        Skip to main content
      </a>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Logo (LEFT) */}
          <Link to="/" className="flex items-center gap-3.5 group shrink-0">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-[#00f2ff] p-[1px] shadow-[0_0_15px_rgba(0,242,255,0.4)] group-hover:scale-105 transition-transform duration-300 shrink-0">
              <div className="w-full h-full bg-[#0b0e11] rounded-[10px] flex items-center justify-center">
                <Swords className="w-4.5 h-4.5 sm:w-5.5 sm:h-5.5 text-[#00f2ff]" />
              </div>
            </div>
            <div className="min-w-0">
              <span className="font-headline text-base sm:text-2xl font-black tracking-wider text-white truncate block uppercase">
                MJ <span className="text-[#00f2ff]">ESPORTS</span>
              </span>
              <span className="flex items-center gap-1 text-[8px] sm:text-[10px] uppercase font-bold tracking-widest text-[#fe6b00] -mt-0.5 sm:-mt-1 font-headline truncate">
                <span>Free Fire & BGMI Arena</span>
              </span>
            </div>
          </Link>

          {/* Pill Navigation Links (CENTER) */}
          <div className="hidden md:flex items-center gap-1 bg-[#16191d] p-1.5 rounded-full border border-[#272d35] shadow-inner">
            {navLinks.map((link) => (
              <Link
                key={`nav-desktop-${link.name}`}
                to={link.path}
                className={`px-6 py-2.5 text-xs font-headline font-bold uppercase tracking-wider rounded-full transition-all duration-300 ${
                  isActive(link.path)
                    ? 'bg-[#00f2ff] text-[#0b0e11] font-black shadow-[0_0_15px_rgba(0,242,255,0.4)]'
                    : 'text-[#8e9dae] hover:text-[#00f2ff] hover:bg-[#20252b]'
                }`}
              >
                {link.name}
              </Link>
            ))}
          </div>

          {/* Action Bar (RIGHT) */}
          <div className="hidden md:flex items-center gap-4">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                
                {/* Compact Wallet Card */}
                <Link
                  to="/wallet"
                  className={`flex items-center px-4 py-2 gap-2.5 rounded-xl border text-xs font-mono font-bold transition-all duration-300 shadow-sm ${
                    isActive('/wallet')
                      ? 'bg-[#00ff9d]/10 border-[#00ff9d]/40 text-[#00ff9d] shadow-[0_0_12px_rgba(0,255,157,0.25)]'
                      : 'bg-[#16191d] border-[#272d35] text-[#fe6b00] hover:border-[#fe6b00]'
                  }`}
                  title="Esports Wallet Balance"
                >
                  <Wallet className="w-4 h-4 text-[#fe6b00]" />
                  <span>₹{Number(userWalletBalance).toFixed(2)}</span>
                </Link>

                {/* Real-time Notification Bell */}
                <div className="relative" ref={notifRef}>
                  <button
                    onClick={() => setNotificationsOpen(!notificationsOpen)}
                    className={`p-2.5 rounded-xl border text-xs transition-all duration-300 shadow-sm cursor-pointer ${
                      notificationsOpen
                        ? 'bg-[#00f2ff]/20 border-[#00f2ff] text-[#00f2ff]'
                        : 'bg-[#16191d] border-[#272d35] text-[#8e9dae] hover:text-[#00f2ff] hover:border-[#00f2ff]/50'
                    }`}
                    title="Alert Feed"
                  >
                    <Bell className="w-4.5 h-4.5" />
                    {unreadNotificationsCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full bg-[#ef4444] text-[9px] font-black text-white flex items-center justify-center px-1 animate-pulse border border-[#111417]">
                        {unreadNotificationsCount}
                      </span>
                    )}
                  </button>

                  {/* Glassmorphism Notification Dropdown Feed */}
                  {notificationsOpen && (
                    <div className="absolute right-0 mt-2.5 w-80 rounded-2xl bg-[#0e1115]/95 border border-[#272d35] shadow-2xl p-4 space-y-3 z-50 text-xs font-mono backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="flex items-center justify-between border-b border-[#272d35] pb-2">
                        <span className="font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                          <Bell className="w-3.5 h-3.5 text-[#00f2ff]" /> Alerts ({unreadNotificationsCount})
                        </span>
                        {unreadNotificationsCount > 0 && (
                          <button
                            onClick={handleMarkAllRead}
                            className="text-[9px] text-[#00f2ff] hover:underline uppercase font-bold cursor-pointer"
                          >
                            Mark Read
                          </button>
                        )}
                      </div>
                      
                      <div className="max-h-60 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                        {notifications.length === 0 ? (
                          <div className="py-8 text-center text-[#8e9dae] font-sans">
                            No notifications on log.
                          </div>
                        ) : (
                          notifications.slice(0, 5).map((n) => (
                            <div
                              key={`notif-card-${n.id}`}
                              className={`p-2.5 rounded-lg border text-[11px] leading-relaxed transition-all ${
                                n.is_read
                                  ? 'bg-[#16191d]/30 border-[#272d35]/40 text-[#8e9dae]'
                                  : 'bg-[#00f2ff]/5 border-[#00f2ff]/30 text-white'
                              }`}
                            >
                              <div className="flex justify-between items-start font-bold">
                                <span className="truncate">{n.title}</span>
                                {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-[#00f2ff] shrink-0 mt-1"></span>}
                              </div>
                              <p className="text-[10px] text-[#8e9dae] mt-0.5 font-sans">{n.message}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Player Unified Dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all duration-300 shadow-sm cursor-pointer ${
                      userDropdownOpen
                        ? 'bg-[#00f2ff]/10 border-[#00f2ff]/60'
                        : 'bg-[#16191d] border-[#272d35] hover:border-[#00f2ff]/40'
                    }`}
                  >
                    <div className="w-6 h-6 rounded-lg bg-[#00f2ff]/20 border border-[#00f2ff]/35 overflow-hidden flex items-center justify-center shrink-0">
                      {userAvatarUrl ? (
                        <img src={userAvatarUrl} alt={userDisplayName} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-3.5 h-3.5 text-[#00f2ff]" />
                      )}
                    </div>
                    <span className="text-xs font-bold text-[#e1e2e7]">{userDisplayName}</span>
                    <ChevronDown className={`w-3.5 h-3.5 text-[#8e9dae] transition-transform duration-200 ${userDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown Menu overlay */}
                  {userDropdownOpen && (
                    <div className="absolute right-0 mt-2.5 w-48 rounded-2xl bg-[#0e1115]/95 border border-[#272d35] shadow-2xl p-2.5 z-50 text-xs font-mono backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200">
                      
                      <Link
                        to="/profile"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-[#8e9dae] hover:text-[#00f2ff] hover:bg-[#16191d] transition-colors uppercase tracking-wider"
                      >
                        <User className="w-4 h-4 text-[#00f2ff]" />
                        <span>My Profile</span>
                      </Link>

                      <Link
                        to="/wallet"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-[#8e9dae] hover:text-[#00ff9d] hover:bg-[#16191d] transition-colors uppercase tracking-wider"
                      >
                        <Wallet className="w-4 h-4 text-[#00ff9d]" />
                        <span>Wallet Ledger</span>
                      </Link>

                      <Link
                        to="/settings"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-[#8e9dae] hover:text-slate-200 hover:bg-[#16191d] transition-colors uppercase tracking-wider"
                      >
                        <Settings className="w-4 h-4 text-slate-400" />
                        <span>Settings</span>
                      </Link>

                      {isAdmin && (
                        <Link
                          to="/admin"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-[#fe6b00] hover:text-[#fe8227] hover:bg-[#fe6b00]/10 border border-[#fe6b00]/20 rounded-lg my-1 transition-colors uppercase tracking-wider"
                        >
                          <Shield className="w-4 h-4 text-[#fe6b00]" />
                          <span>Admin Console</span>
                        </Link>
                      )}

                      <div className="border-t border-[#272d35]/60 my-1"></div>

                      <button
                        onClick={handleSignOut}
                        disabled={isSigningOut}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-red-500 hover:text-red-400 hover:bg-[#16191d] transition-colors uppercase tracking-wider text-left cursor-pointer"
                      >
                        <LogOut className="w-4 h-4 text-red-500" />
                        <span>{isSigningOut ? 'Leaving...' : 'Logout'}</span>
                      </button>

                    </div>
                  )}
                </div>

              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-4 py-2.5 text-xs font-headline font-bold text-[#8e9dae] hover:text-[#00f2ff] uppercase tracking-wider transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="px-5 py-2.5 text-xs font-headline font-black text-black bg-[#00f2ff] hover:bg-cyan-300 rounded-xl uppercase tracking-wider transition-all duration-300 shadow-[0_0_15px_rgba(0,242,255,0.3)]"
                >
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Drawer Hamburger Trigger (MOBILE/TABLET) */}
          <div className="md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation-drawer"
              className="p-2.5 rounded-xl bg-[#16191d] border border-[#272d35] text-[#e1e2e7] hover:text-[#00f2ff] focus:outline-none min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
              aria-label="Toggle Side Drawer Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5 text-[#00f2ff]" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>
      </div>

      {/* Slide Navigation Drawer Overlay (MOBILE) */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 top-[64px] z-40 bg-[#07090c]/95 backdrop-blur-lg flex flex-col justify-between p-5 space-y-6 md:hidden animate-in fade-in slide-in-from-right duration-200">
          
          <div className="space-y-6 overflow-y-auto">
            {/* User Wallet Overview Card */}
            {isAuthenticated ? (
              <div className="p-4 rounded-2xl bg-[#16191d] border border-[#272d35] flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#00f2ff]/20 border border-[#00f2ff]/45 overflow-hidden flex items-center justify-center shrink-0">
                    {userAvatarUrl ? (
                      <img src={userAvatarUrl} alt={userDisplayName} className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-5 h-5 text-[#00f2ff]" />
                    )}
                  </div>
                  <div>
                    <span className="text-sm font-bold text-white block truncate max-w-[150px]">{userDisplayName}</span>
                    <span className="text-[10px] text-[#00ff9d] font-mono font-bold block uppercase mt-0.5">
                      Wallet Balance: ₹{Number(userWalletBalance).toFixed(2)}
                    </span>
                  </div>
                </div>
                {isAdmin && (
                  <span className="text-[9px] font-extrabold bg-[#fe6b00] text-slate-950 px-2 py-0.5 rounded uppercase">
                    ADMIN
                  </span>
                )}
              </div>
            ) : (
              <div className="flex gap-3">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 py-3 border border-[#272d35] hover:border-[#00f2ff]/40 text-[#e1e2e7] rounded-xl text-center text-xs font-bold uppercase"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 py-3 bg-[#00f2ff] hover:bg-cyan-300 text-black rounded-xl text-center text-xs font-bold uppercase"
                >
                  Register
                </Link>
              </div>
            )}

            {/* Menu List */}
            <div className="flex flex-col space-y-1.5 text-xs font-mono">
              <span className="text-[9px] font-black uppercase tracking-widest text-[#8e9dae] px-2 mb-1">
                Lobby Index
              </span>
              
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className={`px-4 py-3 rounded-xl flex items-center justify-between min-h-[44px] uppercase tracking-wider ${
                  isActive('/')
                    ? 'bg-[#00f2ff]/10 text-[#00f2ff] border border-[#00f2ff]/40 font-bold'
                    : 'text-[#b9cacb] hover:bg-[#16191d]'
                }`}
              >
                Home Arena
              </Link>

              <Link
                to="/tournaments"
                onClick={() => setMobileMenuOpen(false)}
                className={`px-4 py-3 rounded-xl flex items-center justify-between min-h-[44px] uppercase tracking-wider ${
                  isActive('/tournaments')
                    ? 'bg-[#00f2ff]/10 text-[#00f2ff] border border-[#00f2ff]/40 font-bold'
                    : 'text-[#b9cacb] hover:bg-[#16191d]'
                }`}
              >
                Tournaments
              </Link>

              <Link
                to="/leaderboard"
                onClick={() => setMobileMenuOpen(false)}
                className={`px-4 py-3 rounded-xl flex items-center justify-between min-h-[44px] uppercase tracking-wider ${
                  isActive('/leaderboard')
                    ? 'bg-[#00f2ff]/10 text-[#00f2ff] border border-[#00f2ff]/40 font-bold'
                    : 'text-[#b9cacb] hover:bg-[#16191d]'
                }`}
              >
                Leaderboard
              </Link>

              {isAuthenticated && (
                <>
                  <div className="border-t border-[#272d35]/60 my-2"></div>
                  
                  <Link
                    to="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-4 py-3 rounded-xl flex items-center gap-2.5 text-[#b9cacb] hover:bg-[#16191d] min-h-[44px] uppercase tracking-wider"
                  >
                    <User className="w-4.5 h-4.5 text-[#00f2ff]" />
                    <span>My Profile</span>
                  </Link>

                  <Link
                    to="/wallet"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-4 py-3 rounded-xl flex items-center gap-2.5 text-[#b9cacb] hover:bg-[#16191d] min-h-[44px] uppercase tracking-wider"
                  >
                    <Wallet className="w-4.5 h-4.5 text-[#00ff9d]" />
                    <span>Wallet Ledger</span>
                  </Link>

                  <Link
                    to="/settings"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-4 py-3 rounded-xl flex items-center gap-2.5 text-[#b9cacb] hover:bg-[#16191d] min-h-[44px] uppercase tracking-wider"
                  >
                    <Settings className="w-4.5 h-4.5 text-slate-400" />
                    <span>Settings</span>
                  </Link>

                  {isAdmin && (
                    <Link
                      to="/admin"
                      onClick={() => setMobileMenuOpen(false)}
                      className="px-4 py-3 rounded-xl flex items-center gap-2.5 text-[#fe6b00] bg-[#fe6b00]/10 border border-[#fe6b00]/25 min-h-[44px] uppercase tracking-wider font-bold"
                    >
                      <Shield className="w-4.5 h-4.5 text-[#fe6b00]" />
                      <span>Admin Console</span>
                    </Link>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Drawer footer / logout */}
          {isAuthenticated && (
            <button
              onClick={() => {
                handleSignOut()
                setMobileMenuOpen(false)
              }}
              className="w-full py-3.5 text-xs font-bold text-red-500 bg-[#16191d] hover:bg-red-950/20 rounded-xl border border-[#272d35] flex items-center justify-center gap-2 min-h-[44px] uppercase font-mono"
            >
              <LogOut className="w-4 h-4 text-red-500" />
              <span>Sign Out Session</span>
            </button>
          )}

        </div>
      )}
    </nav>
  )
}
