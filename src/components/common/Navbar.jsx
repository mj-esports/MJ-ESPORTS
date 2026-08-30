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
  const [avatarError, setAvatarError] = useState(false)
  
  const location = useLocation()
  const navigate = useNavigate()
  const { user, profile, isAuthenticated, isAdmin, signOut } = useAuth()
  const { showSuccess, showError } = useToast()

  const dropdownRef = useRef(null)
  const notifRef = useRef(null)
  const [profileAvatar, setProfileAvatar] = useState(null)

  // Fetch live profile avatar from profiles table
  useEffect(() => {
    if (isAuthenticated && user?.id && isSupabaseConfigured) {
      supabase
        .from('profiles')
        .select('avatar_url, username')
        .eq('id', user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.avatar_url) {
            setProfileAvatar(data.avatar_url)
          }
        })
        .catch((err) => console.warn('[Navbar profile fetch warn]:', err))
    } else {
      setProfileAvatar(null)
    }
  }, [isAuthenticated, user?.id])

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
    setIsSigningOut(true)
    try {
      await signOut()
      setUserDropdownOpen(false)
      showSuccess('Disconnected safely from mainframe.', 'Signed Out')
      navigate('/')
    } catch (err) {
      showError(err.message || 'Logout sequence failed.')
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

  const userDisplayName = profile?.username || user?.user_metadata?.username || user?.email?.split('@')[0] || 'Player'
  const userWalletBalance = user?.user_metadata?.wallet_balance ?? 0.0
  const userAvatarUrl = profile?.avatar_url || profileAvatar || user?.user_metadata?.avatar_url || user?.user_metadata?.avatarUrl || ''
  const userInitial = (userDisplayName || 'M').charAt(0).toUpperCase()
  const unreadNotificationsCount = notifications.filter((n) => !n.is_read).length

  return (
    <nav className="sticky top-0 z-50 bg-[#131314]/95 backdrop-blur-md border-b border-[#27272a] shadow-[0_8px_24px_rgba(0,0,0,0.6)]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-[#00f2ff] focus:text-[#00363a] focus:font-headline focus:font-bold focus:rounded shadow-lg text-xs"
      >
        Skip to main content
      </a>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Logo (LEFT) */}
          <Link to="/" className="flex items-center gap-2 xs:gap-3 group shrink min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded bg-[#00f2ff] p-[1px] shadow-[0_0_15px_rgba(0,242,255,0.4)] group-hover:scale-105 transition-transform duration-200 shrink-0">
              <div className="w-full h-full bg-[#131314] rounded-[3px] flex items-center justify-center">
                <Swords className="w-4 h-4 sm:w-5 sm:h-5 text-[#00f2ff]" />
              </div>
            </div>
            <div className="min-w-0">
              <span className="font-headline text-sm xs:text-base sm:text-xl font-extrabold tracking-wider text-white truncate block uppercase">
                MJ <span className="text-[#00f2ff]">ESPORTS</span>
              </span>
              <span className="flex items-center gap-1 text-[10.5px] xs:text-xs font-bold tracking-wider text-[#ff5e07] font-headline truncate">
                <span>Free Fire & BGMI Arena</span>
              </span>
            </div>
          </Link>

          {/* Navigation Links (CENTER) */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={`nav-desktop-${link.name}`}
                to={link.path}
                className={`py-2 text-xs font-headline font-bold uppercase tracking-wider transition-all duration-200 relative ${
                  isActive(link.path)
                    ? 'text-[#00f2ff] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-[#00f2ff] after:shadow-[0_0_8px_rgba(0,242,255,0.8)]'
                    : 'text-[#b9cacb] hover:text-[#00f2ff]'
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
                  className={`flex items-center px-3.5 py-1.5 gap-2 rounded border text-xs font-mono font-bold transition-all duration-200 shadow-sm ${
                    isActive('/wallet')
                      ? 'bg-[#10b981]/10 border-[#10b981]/40 text-[#10b981] shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                      : 'bg-[#141416] border-[#27272a] text-[#ff5e07] hover:border-[#ff5e07]'
                  }`}
                  title="Esports Wallet Balance"
                >
                  <Wallet className="w-3.5 h-3.5 text-[#ff5e07]" />
                  <span>₹{Number(userWalletBalance).toFixed(2)}</span>
                </Link>

                {/* Real-time Notification Bell */}
                <div className="relative" ref={notifRef}>
                  <button
                    onClick={() => setNotificationsOpen(!notificationsOpen)}
                    className={`p-2 rounded border text-xs transition-all duration-200 shadow-sm cursor-pointer ${
                      notificationsOpen
                        ? 'bg-[#00f2ff]/20 border-[#00f2ff] text-[#00f2ff]'
                        : 'bg-[#141416] border-[#27272a] text-[#b9cacb] hover:text-[#00f2ff] hover:border-[#00f2ff]/50'
                    }`}
                    title="Alert Feed"
                  >
                    <Bell className="w-4 h-4" />
                    {unreadNotificationsCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[15px] h-3.5 rounded-full bg-[#ef4444] text-[8.5px] font-black text-white flex items-center justify-center px-1 animate-pulse border border-[#131314]">
                        {unreadNotificationsCount}
                      </span>
                    )}
                  </button>

                  {/* Notification Dropdown Feed */}
                  {notificationsOpen && (
                    <div className="absolute right-0 mt-2.5 w-80 rounded bg-[#141416] border border-[#27272a] shadow-2xl p-4 space-y-3 z-50 text-xs font-mono backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="flex items-center justify-between border-b border-[#27272a] pb-2">
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
                          <div className="py-8 text-center text-[#b9cacb] font-sans">
                            No notifications on log.
                          </div>
                        ) : (
                          notifications.slice(0, 5).map((n) => (
                            <div
                              key={`notif-card-${n.id}`}
                              className={`p-2.5 rounded border text-[11px] leading-relaxed transition-all ${
                                n.is_read
                                  ? 'bg-[#1c1b1c]/40 border-[#27272a]/60 text-[#b9cacb]'
                                  : 'bg-[#00f2ff]/5 border-[#00f2ff]/30 text-white'
                              }`}
                            >
                              <div className="flex justify-between items-start font-bold">
                                <span className="truncate">{n.title}</span>
                                {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-[#00f2ff] shrink-0 mt-1"></span>}
                              </div>
                              <p className="text-[10px] text-[#b9cacb] mt-0.5 font-sans">{n.message}</p>
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
                    className={`flex items-center gap-2 px-3 py-1.5 rounded border transition-all duration-200 shadow-sm cursor-pointer ${
                      userDropdownOpen
                        ? 'bg-[#00f2ff]/10 border-[#00f2ff]/60'
                        : 'bg-[#141416] border-[#27272a] hover:border-[#00f2ff]/50'
                    }`}
                  >
                    <div className="w-5.5 h-5.5 rounded-full bg-[#00f2ff]/20 border border-[#00f2ff]/35 overflow-hidden flex items-center justify-center shrink-0">
                      {userAvatarUrl && !avatarError ? (
                        <img
                          src={userAvatarUrl}
                          alt={`${userDisplayName} profile photo`}
                          className="w-full h-full object-cover rounded-full"
                          onError={() => setAvatarError(true)}
                        />
                      ) : (
                        <span className="text-[11px] font-headline font-bold text-[#00f2ff] uppercase leading-none select-none" aria-hidden="true">
                          {userInitial}
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-bold text-[#e5e2e3] uppercase font-label-bold">{userDisplayName}</span>
                    <ChevronDown className={`w-3.5 h-3.5 text-[#b9cacb] transition-transform duration-200 ${userDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown Menu overlay */}
                  {userDropdownOpen && (
                    <div className="absolute right-0 mt-2.5 w-48 rounded bg-[#141416] border border-[#27272a] shadow-2xl p-2 z-50 text-xs font-label-bold backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200">
                      
                      <Link
                        to="/profile"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded text-[#b9cacb] hover:text-[#00f2ff] hover:bg-[#201f20] transition-colors uppercase tracking-wider"
                      >
                        <User className="w-4 h-4 text-[#00f2ff]" />
                        <span>My Profile</span>
                      </Link>

                      <Link
                        to="/wallet"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded text-[#b9cacb] hover:text-[#10b981] hover:bg-[#201f20] transition-colors uppercase tracking-wider"
                      >
                        <Wallet className="w-4 h-4 text-[#10b981]" />
                        <span>Wallet Ledger</span>
                      </Link>

                      <Link
                        to="/settings"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded text-[#b9cacb] hover:text-white hover:bg-[#201f20] transition-colors uppercase tracking-wider"
                      >
                        <Settings className="w-4 h-4 text-[#849495]" />
                        <span>Settings</span>
                      </Link>

                      {/* TEMPORARY TESTING ACCESS — RESTORE ADMIN-ONLY GUARD BEFORE PRODUCTION */}
                      {(isAdmin || isAuthenticated) && (
                        <Link
                          to="/admin"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded text-[#ff5e07] hover:text-[#ff8533] hover:bg-[#ff5e07]/10 border border-[#ff5e07]/20 my-1 transition-colors uppercase tracking-wider"
                        >
                          <Shield className="w-4 h-4 text-[#ff5e07]" />
                          <span>Admin Console</span>
                        </Link>
                      )}

                      <div className="border-t border-[#27272a] my-1"></div>

                      <button
                        onClick={handleSignOut}
                        disabled={isSigningOut}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded text-[#ef4444] hover:bg-[#ef4444]/10 transition-colors uppercase tracking-wider font-bold cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>{isSigningOut ? 'Disconnecting...' : 'Sign Out'}</span>
                      </button>

                    </div>
                  )}
                </div>

              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to="/login"
                  className="px-4 py-2 text-xs font-headline font-bold uppercase tracking-wider text-[#b9cacb] hover:text-white hover:bg-[#141416] rounded border border-transparent hover:border-[#27272a] transition-all"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 text-xs font-headline font-bold uppercase tracking-wider bg-[#00f2ff] hover:bg-[#74f5ff] text-[#00363a] rounded transition-all shadow-[0_0_12px_rgba(0,242,255,0.35)] active:scale-95"
                >
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Trigger */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded bg-[#141416] border border-[#27272a] text-[#b9cacb] hover:text-[#00f2ff] focus:outline-none transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Toggle Mobile Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 top-16 sm:top-20 z-40 bg-[#131314]/98 backdrop-blur-xl flex flex-col justify-between p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] space-y-6 md:hidden overflow-y-auto animate-in fade-in slide-in-from-right duration-200 border-t border-[#27272a]">
          
          <div className="space-y-6 overflow-y-auto">
            {/* User Wallet Overview Card */}
            {isAuthenticated ? (
              <div className="p-4 rounded bg-[#141416] border border-[#27272a] flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#00f2ff]/20 border border-[#00f2ff]/40 overflow-hidden flex items-center justify-center shrink-0">
                    {userAvatarUrl && !avatarError ? (
                      <img
                        src={userAvatarUrl}
                        alt={`${userDisplayName} profile photo`}
                        className="w-full h-full object-cover rounded-full"
                        onError={() => setAvatarError(true)}
                      />
                    ) : (
                      <span className="text-sm font-headline font-bold text-[#00f2ff] uppercase leading-none select-none" aria-hidden="true">
                        {userInitial}
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="text-sm font-bold text-white block truncate max-w-[150px] font-headline">{userDisplayName}</span>
                    <span className="text-[10px] text-[#10b981] font-mono font-bold block uppercase mt-0.5">
                      Wallet Balance: ₹{Number(userWalletBalance).toFixed(2)}
                    </span>
                  </div>
                </div>
                {isAdmin && (
                  <span className="text-[9px] font-extrabold bg-[#ff5e07] text-slate-950 px-2 py-0.5 rounded uppercase font-headline">
                    ADMIN
                  </span>
                )}
              </div>
            ) : (
              <div className="flex gap-3">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 py-3 border border-[#27272a] hover:border-[#00f2ff]/40 text-[#e5e2e3] rounded text-center text-xs font-headline font-bold uppercase"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 py-3 bg-[#00f2ff] hover:bg-[#74f5ff] text-[#00363a] rounded text-center text-xs font-headline font-bold uppercase shadow-[0_0_12px_rgba(0,242,255,0.35)]"
                >
                  Register
                </Link>
              </div>
            )}

            {/* Menu List */}
            <div className="flex flex-col space-y-1.5 text-xs font-headline">
              <span className="text-[9px] font-black uppercase tracking-widest text-[#849495] px-2 mb-1">
                Lobby Index
              </span>
              
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className={`px-4 py-3 rounded flex items-center justify-between min-h-[44px] uppercase tracking-wider ${
                  isActive('/')
                    ? 'bg-[#00f2ff]/10 text-[#00f2ff] border border-[#00f2ff]/40 font-bold'
                    : 'text-[#b9cacb] hover:bg-[#141416]'
                }`}
              >
                Home Arena
              </Link>

              <Link
                to="/tournaments"
                onClick={() => setMobileMenuOpen(false)}
                className={`px-4 py-3 rounded flex items-center justify-between min-h-[44px] uppercase tracking-wider ${
                  isActive('/tournaments')
                    ? 'bg-[#00f2ff]/10 text-[#00f2ff] border border-[#00f2ff]/40 font-bold'
                    : 'text-[#b9cacb] hover:bg-[#141416]'
                }`}
              >
                Tournaments
              </Link>

              <Link
                to="/leaderboard"
                onClick={() => setMobileMenuOpen(false)}
                className={`px-4 py-3 rounded flex items-center justify-between min-h-[44px] uppercase tracking-wider ${
                  isActive('/leaderboard')
                    ? 'bg-[#00f2ff]/10 text-[#00f2ff] border border-[#00f2ff]/40 font-bold'
                    : 'text-[#b9cacb] hover:bg-[#141416]'
                }`}
              >
                Leaderboard
              </Link>

              {isAuthenticated && (
                <>
                  <div className="border-t border-[#27272a] my-2"></div>
                  
                  <Link
                    to="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-4 py-3 rounded flex items-center gap-2.5 text-[#b9cacb] hover:bg-[#141416] min-h-[44px] uppercase tracking-wider"
                  >
                    <User className="w-4.5 h-4.5 text-[#00f2ff]" />
                    <span>My Profile</span>
                  </Link>

                  <Link
                    to="/wallet"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-4 py-3 rounded flex items-center gap-2.5 text-[#b9cacb] hover:bg-[#141416] min-h-[44px] uppercase tracking-wider"
                  >
                    <Wallet className="w-4.5 h-4.5 text-[#10b981]" />
                    <span>Wallet Ledger</span>
                  </Link>

                  <Link
                    to="/settings"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-4 py-3 rounded flex items-center gap-2.5 text-[#b9cacb] hover:bg-[#141416] min-h-[44px] uppercase tracking-wider"
                  >
                    <Settings className="w-4.5 h-4.5 text-[#849495]" />
                    <span>Settings</span>
                  </Link>

                  {/* TEMPORARY TESTING ACCESS — RESTORE ADMIN-ONLY GUARD BEFORE PRODUCTION */}
                  {(isAdmin || isAuthenticated) && (
                    <Link
                      to="/admin"
                      onClick={() => setMobileMenuOpen(false)}
                      className="px-4 py-3 rounded flex items-center gap-2.5 text-[#ff5e07] bg-[#ff5e07]/10 border border-[#ff5e07]/25 min-h-[44px] uppercase tracking-wider font-bold"
                    >
                      <Shield className="w-4.5 h-4.5 text-[#ff5e07]" />
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
              className="w-full py-3.5 text-xs font-bold text-red-500 bg-[#141416] hover:bg-red-950/20 rounded border border-[#27272a] flex items-center justify-center gap-2 min-h-[44px] uppercase font-headline cursor-pointer transition-colors"
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
