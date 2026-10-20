import { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Menu,
  X,
  User,
  LogOut,
  Shield,
  Settings,
  Users,
  Wallet,
  Bell,
  ChevronDown,
  BookOpen,
  Home,
  Trophy,
  Gamepad2,
  BarChart3,
  LogIn,
  UserPlus,
  Key,
  AlertTriangle,
  Info,
  CheckCircle2,
  AlertCircle,
  CreditCard
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import {
  fetchUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  subscribeToUserNotifications,
} from '../../services/notificationService'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import {
  fetchUserWallet,
  subscribeToWalletBalance,
  getAuthoritativeWalletBalance,
} from '../../services/walletService'

function formatRelativeTime(dateInput) {
  if (!dateInput) return ''
  const date = new Date(dateInput)
  const now = new Date()
  const diffMs = now - date
  if (diffMs < 0 || isNaN(diffMs)) return 'Just now'
  const diffSec = Math.floor(diffMs / 1000)
  if (diffSec < 60) return 'Just now'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function getNotificationIcon(type) {
  switch (type) {
    case 'room':
      return <Key className="w-3.5 h-3.5 text-[#FFB900] shrink-0" />
    case 'prize':
      return <Trophy className="w-3.5 h-3.5 text-[#FFB900] shrink-0" />
    case 'warning':
      return <AlertTriangle className="w-3.5 h-3.5 text-[#FF6200] shrink-0" />
    case 'success':
      return <CheckCircle2 className="w-3.5 h-3.5 text-[#10b981] shrink-0" />
    case 'error':
      return <AlertCircle className="w-3.5 h-3.5 text-[#FF0000] shrink-0" />
    case 'payment':
      return <CreditCard className="w-3.5 h-3.5 text-[#10b981] shrink-0" />
    case 'info':
    default:
      return <Info className="w-3.5 h-3.5 text-[#FFB900] shrink-0" />
  }
}

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mobileNotifOpen, setMobileNotifOpen] = useState(false)
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

  // Phase 9.4: Authoritative public.wallets.balance Synchronization
  const [navWalletBalance, setNavWalletBalance] = useState(getAuthoritativeWalletBalance())
  const [isWalletLoading, setIsWalletLoading] = useState(getAuthoritativeWalletBalance() === null)

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      setNavWalletBalance(null)
      setIsWalletLoading(false)
      return
    }

    let isMounted = true

    // 1. Subscribe to shared authoritative balance changes
    const unsubscribe = subscribeToWalletBalance((updatedBalance) => {
      if (isMounted) {
        setNavWalletBalance(updatedBalance)
        setIsWalletLoading(false)
      }
    })

    // 2. Fetch fresh authoritative balance on mount and route change
    fetchUserWallet()
      .then((res) => {
        if (isMounted && res?.success && res.wallet) {
          const bal = Number(res.wallet.balance || 0)
          setNavWalletBalance(bal)
        }
      })
      .catch((err) => {
        console.warn('[Navbar fetchUserWallet warn]:', err)
      })
      .finally(() => {
        if (isMounted) {
          setIsWalletLoading(false)
        }
      })

    return () => {
      isMounted = false
      unsubscribe()
    }
  }, [isAuthenticated, user?.id, location.pathname])

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

  // Real-time Notification Subscription & Initial Bounded Fetch
  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      setNotifications([])
      return
    }

    let isMounted = true

    // 1. Initial fetch bounded to recent 30 items
    fetchUserNotifications(user.id, { limit: 30 })
      .then((data) => {
        if (isMounted) {
          setNotifications(data || [])
        }
      })
      .catch((err) => console.warn('[Navbar notifications fetch warn]:', err))

    // 2. Realtime listener for new incoming notifications
    const unsubscribe = subscribeToUserNotifications(user.id, (newNotif) => {
      if (isMounted && newNotif) {
        setNotifications((prev) => {
          if (prev.some((n) => n.id === newNotif.id)) return prev
          return [newNotif, ...prev]
        })
      }
    })

    return () => {
      isMounted = false
      unsubscribe()
    }
  }, [isAuthenticated, user?.id])

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

  // Close mobile drawer and dropdowns on Escape key press
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false)
        setUserDropdownOpen(false)
        setNotificationsOpen(false)
        setMobileNotifOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Auto-close mobile menu and dropdowns on route navigation
  useEffect(() => {
    setMobileMenuOpen(false)
    setUserDropdownOpen(false)
    setNotificationsOpen(false)
    setMobileNotifOpen(false)
  }, [location.pathname])

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

  const handleNotificationClick = async (notif) => {
    if (!notif) return

    // 1. Mark as read optimistically if unread
    if (!notif.is_read) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
      )
      markNotificationAsRead(notif.id).catch((err) =>
        console.warn('[Navbar mark read error]:', err)
      )
    }

    // 2. Close dropdowns/tray
    setNotificationsOpen(false)
    setMobileNotifOpen(false)
    setMobileMenuOpen(false)

    // 3. Navigate if link is provided and safe
    if (notif.link && typeof notif.link === 'string') {
      const isInternal =
        notif.link.startsWith('/') ||
        (typeof window !== 'undefined' && notif.link.startsWith(window.location.origin))

      if (isInternal) {
        const targetPath = notif.link.startsWith(window.location.origin)
          ? notif.link.slice(window.location.origin.length)
          : notif.link
        navigate(targetPath)
      }
    }
  }

  const handleMarkAllRead = async () => {
    if (!user?.id) return
    const unread = notifications.filter((n) => !n.is_read)
    if (unread.length === 0) return

    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))

    try {
      const res = await markAllNotificationsAsRead(user.id)
      if (res?.success) {
        showSuccess('All notifications marked as read.', 'Cleared')
      }
    } catch (err) {
      console.warn('[Navbar mark all read error]:', err)
    }
  }

  const userDisplayName = profile?.username || user?.user_metadata?.username || user?.email?.split('@')[0] || 'Player'
  const userAvatarUrl = profile?.avatar_url || profileAvatar || user?.user_metadata?.avatar_url || user?.user_metadata?.avatarUrl || ''
  const userInitial = (userDisplayName || 'M').charAt(0).toUpperCase()
  const unreadNotificationsCount = notifications.filter((n) => !n.is_read).length

  return (
    <nav className="sticky top-0 z-50 bg-[#000000]/95 backdrop-blur-md border-b border-[#1B1B1F] shadow-[0_8px_24px_rgba(0,0,0,0.6)]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-[#FFB900] focus:text-[#000000] focus:font-headline focus:font-bold focus:rounded-none shadow-lg text-xs"
      >
        Skip to main content
      </a>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Logo (LEFT) */}
          <Link to="/" className="flex items-center gap-2 sm:gap-3 group shrink min-w-0 flex-1 max-w-[calc(100%-52px)]" aria-label="MJ ESPORTS Home">
            <img
              src="/mj-esports-logo.png"
              alt="MJ ESPORTS"
              className="w-8 h-8 xs:w-9 xs:h-9 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-none object-contain shrink-0 group-hover:scale-105 transition-transform duration-200 shadow-sm"
            />
            <div className="min-w-0 flex flex-col justify-center">
              <span className="font-headline text-xs xs:text-sm sm:text-xl font-extrabold tracking-wider text-white truncate block uppercase leading-tight">
                MJ <span className="text-[#FFB900]">ESPORTS</span>
              </span>
              <span className="text-[9.5px] xs:text-[11px] sm:text-xs font-bold tracking-wider text-[#FF6200] font-headline truncate block uppercase leading-tight mt-0.5">
                Free Fire MAX Arena
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
                    ? 'text-[#FFB900] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-[#FFB900] after:shadow-[0_0_8px_rgba(255,185,0,0.8)]'
                    : 'text-[#A3A3A3] hover:text-[#FFB900]'
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
                  className={`flex items-center px-3.5 py-1.5 gap-2 rounded-none border text-xs font-mono font-bold transition-all duration-200 shadow-sm ${
                    isActive('/wallet')
                      ? 'bg-[#10b981]/10 border-[#10b981]/40 text-[#10b981] shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                      : 'bg-[#111318] border-[#2A2A30] text-[#FF6200] hover:border-[#FF6200]'
                  }`}
                  title="Esports Authoritative Wallet Balance"
                >
                  <Wallet className="w-3.5 h-3.5 text-[#FF6200]" />
                  {isWalletLoading || navWalletBalance === null ? (
                    <span className="inline-block w-8 h-3.5 bg-[#2A2A30] animate-pulse rounded-none my-0.5"></span>
                  ) : (
                    <span>₹{Math.floor(navWalletBalance)}</span>
                  )}
                </Link>

                {/* Real-time Notification Bell */}
                <div className="relative" ref={notifRef}>
                  <button
                    onClick={() => setNotificationsOpen(!notificationsOpen)}
                    className={`p-2 rounded-none border text-xs transition-all duration-200 shadow-sm cursor-pointer ${
                      notificationsOpen
                        ? 'bg-[#FFB900]/20 border-[#FFB900] text-[#FFB900]'
                        : 'bg-[#111318] border-[#2A2A30] text-[#A3A3A3] hover:text-[#FFB900] hover:border-[#FFB900]/50'
                    }`}
                    title="Alert Feed"
                  >
                    <Bell className="w-4 h-4" />
                    {unreadNotificationsCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[15px] h-3.5 rounded-none bg-[#FF0000] text-[8.5px] font-black text-white flex items-center justify-center px-1 animate-pulse border border-[#000000]">
                        {unreadNotificationsCount}
                      </span>
                    )}
                  </button>

                  {/* Notification Dropdown Feed */}
                  {notificationsOpen && (
                    <div className="absolute right-0 mt-2.5 w-80 rounded-none bg-[#111318] border border-[#2A2A30] shadow-2xl p-4 space-y-3 z-50 text-xs font-mono backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="flex items-center justify-between border-b border-[#2A2A30] pb-2">
                        <span className="font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                          <Bell className="w-3.5 h-3.5 text-[#FFB900]" /> Alerts ({unreadNotificationsCount})
                        </span>
                        {unreadNotificationsCount > 0 && (
                          <button
                            onClick={handleMarkAllRead}
                            className="text-[9px] text-[#FFB900] hover:underline uppercase font-bold cursor-pointer"
                          >
                            Mark Read
                          </button>
                        )}
                      </div>
                      
                      <div className="max-h-72 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                        {notifications.length === 0 ? (
                          <div className="py-8 text-center text-[#A3A3A3] font-sans">
                            No notifications on log.
                          </div>
                        ) : (
                          notifications.slice(0, 8).map((n) => (
                            <button
                              key={`notif-card-${n.id}`}
                              type="button"
                              onClick={() => handleNotificationClick(n)}
                              className={`w-full text-left p-2.5 rounded-none border text-[11px] leading-relaxed transition-all cursor-pointer ${
                                n.is_read
                                  ? 'bg-[#1B1B1F]/40 border-[#2A2A30]/60 text-[#A3A3A3] hover:bg-[#1B1B1F]'
                                  : 'bg-[#FFB900]/5 border-[#FFB900]/30 text-white hover:bg-[#FFB900]/10 shadow-[0_0_8px_rgba(255,185,0,0.1)]'
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                <div className="mt-0.5">
                                  {getNotificationIcon(n.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex justify-between items-start font-bold gap-2">
                                    <span className="truncate">{n.title}</span>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <span className="text-[9px] text-[#A3A3A3] font-normal">
                                        {formatRelativeTime(n.created_at)}
                                      </span>
                                      {!n.is_read && (
                                        <span className="w-1.5 h-1.5 rounded-none bg-[#FFB900] shrink-0"></span>
                                      )}
                                    </div>
                                  </div>
                                  <p className="text-[10px] text-[#A3A3A3] mt-0.5 font-sans line-clamp-2">{n.message}</p>
                                </div>
                              </div>
                            </button>
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
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-none border transition-all duration-200 shadow-sm cursor-pointer ${
                      userDropdownOpen
                        ? 'bg-[#FFB900]/10 border-[#FFB900]/60'
                        : 'bg-[#111318] border-[#2A2A30] hover:border-[#FFB900]/50'
                    }`}
                  >
                    <div className="w-5.5 h-5.5 rounded-none bg-[#FFB900]/20 border border-[#FFB900]/35 overflow-hidden flex items-center justify-center shrink-0">
                      {userAvatarUrl && !avatarError ? (
                        <img
                          src={userAvatarUrl}
                          alt={`${userDisplayName} profile photo`}
                          className="w-full h-full object-cover rounded-none"
                          onError={() => setAvatarError(true)}
                        />
                      ) : (
                        <span className="text-[11px] font-headline font-bold text-[#FFB900] uppercase leading-none select-none" aria-hidden="true">
                          {userInitial}
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-bold text-[#FFFFFF] uppercase font-label-bold">{userDisplayName}</span>
                    <ChevronDown className={`w-3.5 h-3.5 text-[#A3A3A3] transition-transform duration-200 ${userDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown Menu overlay */}
                  {userDropdownOpen && (
                    <div className="absolute right-0 mt-2.5 w-48 rounded-none bg-[#111318] border border-[#2A2A30] shadow-2xl p-2 z-50 text-xs font-label-bold backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200">
                      
                      <Link
                        to="/profile"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-none text-[#A3A3A3] hover:text-[#FFB900] hover:bg-[#1B1B1F] transition-colors uppercase tracking-wider"
                      >
                        <User className="w-4 h-4 text-[#FFB900]" />
                        <span>My Profile</span>
                      </Link>

                      <Link
                        to="/profile/team"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-none text-[#A3A3A3] hover:text-[#FFB900] hover:bg-[#1B1B1F] transition-colors uppercase tracking-wider"
                      >
                        <Users className="w-4 h-4 text-[#FFB900]" />
                        <span>My Team</span>
                      </Link>

                      <Link
                        to="/wallet"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-none text-[#A3A3A3] hover:text-[#10b981] hover:bg-[#1B1B1F] transition-colors uppercase tracking-wider"
                      >
                        <Wallet className="w-4 h-4 text-[#10b981]" />
                        <span>Wallet Ledger</span>
                      </Link>

                      <Link
                        to="/settings"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-none text-[#A3A3A3] hover:text-white hover:bg-[#1B1B1F] transition-colors uppercase tracking-wider"
                      >
                        <Settings className="w-4 h-4 text-[#A3A3A3]" />
                        <span>Settings</span>
                      </Link>

                      {/* Strict Admin-Only Guard */}
                      {isAdmin && (
                        <Link
                          to="/admin"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-none text-[#FF6200] hover:text-[#FFA500] hover:bg-[#FF6200]/10 border border-[#FF6200]/20 my-1 transition-colors uppercase tracking-wider"
                        >
                          <Shield className="w-4 h-4 text-[#FF6200]" />
                          <span>Admin Console</span>
                        </Link>
                      )}

                      <div className="border-t border-[#2A2A30] my-1"></div>

                      <button
                        onClick={handleSignOut}
                        disabled={isSigningOut}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-none text-[#FF0000] hover:bg-[#FF0000]/10 transition-colors uppercase tracking-wider font-bold cursor-pointer"
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
                  className="px-4 py-2 text-xs font-headline font-bold uppercase tracking-wider text-[#A3A3A3] hover:text-white hover:bg-[#111318] rounded-none border border-transparent hover:border-[#2A2A30] transition-all"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 text-xs font-headline font-bold uppercase tracking-wider bg-[#FFB900] hover:bg-[#FFA500] text-[#000000] rounded-none transition-all shadow-[0_0_12px_rgba(255,185,0,0.35)] active:scale-95"
                >
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Trigger */}
          <div className="flex md:hidden items-center shrink-0 ml-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-none bg-[#111318] border border-[#2A2A30] text-[#FFB900] hover:text-white hover:border-[#FFB900] focus:outline-none focus:ring-2 focus:ring-[#FFB900] transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0 active:scale-95 shadow-md"
              aria-label={mobileMenuOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation-drawer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5 text-white" /> : <Menu className="w-5 h-5 text-[#FFB900]" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop overlay - clicking outside closes drawer */}
          <div
            className="fixed inset-0 top-16 sm:top-20 z-40 bg-black/75 backdrop-blur-sm md:hidden animate-in fade-in duration-200"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <div
            id="mobile-navigation-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile Navigation Menu"
            className="fixed inset-y-0 right-0 top-16 sm:top-20 z-50 w-full max-w-sm bg-[#111318]/98 backdrop-blur-xl flex flex-col justify-between p-4 sm:p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] space-y-4 md:hidden overflow-y-auto animate-in slide-in-from-right duration-200 border-l border-[#2A2A30] shadow-2xl"
          >
            <div className="space-y-4 overflow-y-auto pr-0.5">
              {/* Authenticated User Overview Card */}
              {isAuthenticated ? (
                <div className="p-3.5 rounded-none bg-[#1B1B1F] border border-[#2A2A30] flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-none bg-[#FFB900]/20 border border-[#FFB900]/40 overflow-hidden flex items-center justify-center shrink-0">
                      {userAvatarUrl && !avatarError ? (
                        <img
                          src={userAvatarUrl}
                          alt={`${userDisplayName} profile photo`}
                          className="w-full h-full object-cover rounded-none"
                          onError={() => setAvatarError(true)}
                        />
                      ) : (
                        <span className="text-sm font-headline font-bold text-[#FFB900] uppercase leading-none select-none" aria-hidden="true">
                          {userInitial}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <span className="text-sm font-bold text-white block truncate font-headline">{userDisplayName}</span>
                      <div className="text-[10.5px] font-mono font-bold block uppercase mt-0.5">
                        {isWalletLoading ? (
                          <span className="inline-flex items-center gap-1.5 text-[#A3A3A3]">
                            <span>Wallet:</span>
                            <span className="inline-block w-8 h-3.5 bg-[#2A2A30] animate-pulse rounded-none my-0.5"></span>
                          </span>
                        ) : navWalletBalance === null ? (
                          <span className="text-[#A3A3A3]">Wallet unavailable</span>
                        ) : (
                          <span className="text-[#10b981]">Wallet Balance: ₹{Math.floor(navWalletBalance)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {isAdmin && (
                    <span className="text-[9px] font-extrabold bg-[#FF6200] text-slate-950 px-2 py-0.5 rounded-none uppercase font-headline shrink-0">
                      ADMIN
                    </span>
                  )}
                </div>
              ) : (
                /* Logged-Out Visitor Action Buttons */
                <div className="flex gap-2.5">
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex-1 py-2.5 px-3 border border-[#2A2A30] hover:border-[#FFB900]/40 text-[#FFFFFF] rounded-none text-center text-xs font-headline font-bold uppercase min-h-[44px] flex items-center justify-center gap-2 transition-colors"
                  >
                    <LogIn className="w-4 h-4 text-[#FFB900]" />
                    <span>Login</span>
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex-1 py-2.5 px-3 bg-[#FFB900] hover:bg-[#FFA500] text-[#000000] rounded-none text-center text-xs font-headline font-bold uppercase shadow-[0_0_12px_rgba(255,185,0,0.35)] min-h-[44px] flex items-center justify-center gap-2 transition-all active:scale-95"
                  >
                    <UserPlus className="w-4 h-4 text-[#000000]" />
                    <span>Register</span>
                  </Link>
                </div>
              )}

              {/* Navigation Links */}
              <div className="flex flex-col space-y-1 text-xs font-headline">
                <span className="text-[9px] font-black uppercase tracking-widest text-[#A3A3A3] px-2 mb-1">
                  {isAuthenticated ? 'Arena Navigation' : 'Public Directory'}
                </span>

                {/* 1. Home */}
                <Link
                  to="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-3.5 py-2.5 rounded-none flex items-center gap-3 min-h-[44px] uppercase tracking-wider transition-colors ${
                    isActive('/')
                      ? 'bg-[#FFB900]/10 text-[#FFB900] border border-[#FFB900]/40 font-bold'
                      : 'text-[#A3A3A3] hover:bg-[#1B1B1F] hover:text-white'
                  }`}
                >
                  <Home className="w-4.5 h-4.5 text-[#FFB900]" />
                  <span>Home</span>
                </Link>

                {/* 2. Tournaments */}
                <Link
                  to="/tournaments"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-3.5 py-2.5 rounded-none flex items-center gap-3 min-h-[44px] uppercase tracking-wider transition-colors ${
                    isActive('/tournaments')
                      ? 'bg-[#FFB900]/10 text-[#FFB900] border border-[#FFB900]/40 font-bold'
                      : 'text-[#A3A3A3] hover:bg-[#1B1B1F] hover:text-white'
                  }`}
                >
                  <Trophy className="w-4.5 h-4.5 text-[#FF6200]" />
                  <span>Tournaments</span>
                </Link>

                {/* 3. My Matches (Authenticated Only) */}
                {isAuthenticated && (
                  <Link
                    to="/profile/history"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`px-3.5 py-2.5 rounded-none flex items-center gap-3 min-h-[44px] uppercase tracking-wider transition-colors ${
                      isActive('/profile/history')
                        ? 'bg-[#FFB900]/10 text-[#FFB900] border border-[#FFB900]/40 font-bold'
                        : 'text-[#A3A3A3] hover:bg-[#1B1B1F] hover:text-white'
                    }`}
                  >
                    <Gamepad2 className="w-4.5 h-4.5 text-[#FFB900]" />
                    <span>My Matches</span>
                  </Link>
                )}

                {/* 4. Leaderboard */}
                <Link
                  to="/leaderboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-3.5 py-2.5 rounded-none flex items-center gap-3 min-h-[44px] uppercase tracking-wider transition-colors ${
                    isActive('/leaderboard')
                      ? 'bg-[#FFB900]/10 text-[#FFB900] border border-[#FFB900]/40 font-bold'
                      : 'text-[#A3A3A3] hover:bg-[#1B1B1F] hover:text-white'
                  }`}
                >
                  <BarChart3 className="w-4.5 h-4.5 text-[#FFB900]" />
                  <span>Leaderboard</span>
                </Link>

                {/* 5. Wallet (Authenticated Only) */}
                {isAuthenticated && (
                  <Link
                    to="/wallet"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`px-3.5 py-2.5 rounded-none flex items-center justify-between min-h-[44px] uppercase tracking-wider transition-colors ${
                      isActive('/wallet')
                        ? 'bg-[#FFB900]/10 text-[#FFB900] border border-[#FFB900]/40 font-bold'
                        : 'text-[#A3A3A3] hover:bg-[#1B1B1F] hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Wallet className={`w-4.5 h-4.5 ${isActive('/wallet') ? 'text-[#FFB900]' : 'text-[#10b981]'}`} />
                      <span>Wallet</span>
                    </div>
                    {isWalletLoading || navWalletBalance === null ? (
                      <span className="inline-block w-8 h-3.5 bg-[#2A2A30] animate-pulse rounded-none my-0.5"></span>
                    ) : (
                      <span className="text-xs font-mono font-bold text-[#FFB900] bg-[#FFB900]/10 px-2 py-0.5 rounded-none border border-[#FFB900]/20">
                        ₹{Math.floor(navWalletBalance)}
                      </span>
                    )}
                  </Link>
                )}

                {/* 6. Rulebook & Info */}
                <Link
                  to="/about"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-3.5 py-2.5 rounded-none flex items-center gap-3 min-h-[44px] uppercase tracking-wider transition-colors ${
                    isActive('/about')
                      ? 'bg-[#FFB900]/10 text-[#FFB900] border border-[#FFB900]/40 font-bold'
                      : 'text-[#A3A3A3] hover:bg-[#1B1B1F] hover:text-white'
                  }`}
                >
                  <BookOpen className="w-4.5 h-4.5 text-[#FFB900]" />
                  <span>Rulebook & Info</span>
                </Link>

                {/* Authenticated Actions */}
                {isAuthenticated && (
                  <>
                    <div className="border-t border-[#2A2A30] my-1.5"></div>

                    {/* 7. Profile */}
                    <Link
                      to="/profile"
                      onClick={() => setMobileMenuOpen(false)}
                      className={`px-3.5 py-2.5 rounded-none flex items-center gap-3 min-h-[44px] uppercase tracking-wider transition-colors ${
                        isActive('/profile')
                          ? 'bg-[#FFB900]/10 text-[#FFB900] border border-[#FFB900]/40 font-bold'
                          : 'text-[#A3A3A3] hover:bg-[#1B1B1F] hover:text-white'
                      }`}
                    >
                      <User className="w-4.5 h-4.5 text-[#FFB900]" />
                      <span>Profile</span>
                    </Link>

                    {/* My Team */}
                    <Link
                      to="/profile/team"
                      onClick={() => setMobileMenuOpen(false)}
                      className={`px-3.5 py-2.5 rounded-none flex items-center gap-3 min-h-[44px] uppercase tracking-wider transition-colors ${
                        isActive('/profile/team')
                          ? 'bg-[#FFB900]/10 text-[#FFB900] border border-[#FFB900]/40 font-bold'
                          : 'text-[#A3A3A3] hover:bg-[#1B1B1F] hover:text-white'
                      }`}
                    >
                      <Users className="w-4.5 h-4.5 text-[#FFB900]" />
                      <span>My Team</span>
                    </Link>

                    {/* 8. Notifications Tray */}
                    <div className="rounded-none border border-[#2A2A30] bg-[#1B1B1F] overflow-hidden my-1">
                      <button
                        type="button"
                        onClick={() => setMobileNotifOpen(!mobileNotifOpen)}
                        className="w-full px-3.5 py-2.5 flex items-center justify-between min-h-[44px] text-xs font-headline uppercase tracking-wider text-[#A3A3A3] hover:text-white transition-colors cursor-pointer"
                        aria-expanded={mobileNotifOpen}
                      >
                        <div className="flex items-center gap-3">
                          <Bell className="w-4.5 h-4.5 text-[#FFB900]" />
                          <span>Notifications</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {unreadNotificationsCount > 0 ? (
                            <span className="min-w-[18px] h-4.5 rounded-none bg-[#FF0000] text-[9px] font-black text-white flex items-center justify-center px-1.5 animate-pulse">
                              {unreadNotificationsCount}
                            </span>
                          ) : (
                            <span className="text-[10px] text-[#A3A3A3] font-mono lowercase">0 unread</span>
                          )}
                          <ChevronDown className={`w-3.5 h-3.5 text-[#A3A3A3] transition-transform duration-200 ${mobileNotifOpen ? 'rotate-180' : ''}`} />
                        </div>
                      </button>

                      {mobileNotifOpen && (
                        <div className="border-t border-[#2A2A30] p-3 space-y-2.5 bg-[#111318]">
                          <div className="flex items-center justify-between pb-1 border-b border-[#2A2A30]/60">
                            <span className="text-[10px] font-mono text-[#A3A3A3] uppercase font-bold">
                              Alerts ({unreadNotificationsCount} unread)
                            </span>
                            {unreadNotificationsCount > 0 && (
                              <button
                                type="button"
                                onClick={handleMarkAllRead}
                                className="text-[9px] text-[#FFB900] hover:underline uppercase font-bold cursor-pointer font-mono"
                              >
                                Mark Read
                              </button>
                            )}
                          </div>

                          <div className="max-h-56 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                            {notifications.length === 0 ? (
                              <div className="py-3 text-center text-[#A3A3A3] text-[11px] font-sans">
                                No notifications on log.
                              </div>
                            ) : (
                              notifications.slice(0, 8).map((n) => (
                                <button
                                  key={`mobile-notif-${n.id}`}
                                  type="button"
                                  onClick={() => handleNotificationClick(n)}
                                  className={`w-full text-left p-2 rounded-none border text-[11px] leading-relaxed transition-all cursor-pointer ${
                                    n.is_read
                                      ? 'bg-[#1B1B1F]/40 border-[#2A2A30]/60 text-[#A3A3A3] hover:bg-[#1B1B1F]'
                                      : 'bg-[#FFB900]/5 border-[#FFB900]/30 text-white hover:bg-[#FFB900]/10'
                                  }`}
                                >
                                  <div className="flex items-start gap-2">
                                    <div className="mt-0.5">
                                      {getNotificationIcon(n.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex justify-between items-start font-bold gap-2">
                                        <span className="truncate">{n.title}</span>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                          <span className="text-[9px] text-[#A3A3A3] font-normal">
                                            {formatRelativeTime(n.created_at)}
                                          </span>
                                          {!n.is_read && (
                                            <span className="w-1.5 h-1.5 rounded-none bg-[#FFB900] shrink-0"></span>
                                          )}
                                        </div>
                                      </div>
                                      <p className="text-[10px] text-[#A3A3A3] mt-0.5 font-sans line-clamp-2">{n.message}</p>
                                    </div>
                                  </div>
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Admin Dashboard (Admin Only) */}
                    {isAdmin && (
                      <Link
                        to="/admin"
                        onClick={() => setMobileMenuOpen(false)}
                        className="px-3.5 py-2.5 rounded-none flex items-center justify-between text-[#FF6200] bg-[#FF6200]/10 border border-[#FF6200]/25 min-h-[44px] uppercase tracking-wider font-bold transition-colors hover:bg-[#FF6200]/20"
                      >
                        <div className="flex items-center gap-3">
                          <Shield className="w-4.5 h-4.5 text-[#FF6200]" />
                          <span>Admin Dashboard</span>
                        </div>
                        <span className="text-[9px] font-extrabold bg-[#FF6200] text-slate-950 px-1.5 py-0.5 rounded-none">
                          ACCESS
                        </span>
                      </Link>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Drawer Footer: Logout (Authenticated Only) */}
            {isAuthenticated && (
              <div className="pt-2 border-t border-[#2A2A30]">
                <button
                  type="button"
                  onClick={() => {
                    handleSignOut()
                    setMobileMenuOpen(false)
                  }}
                  disabled={isSigningOut}
                  className="w-full py-3 text-xs font-bold text-[#FF0000] bg-[#111318] hover:bg-[#FF0000]/10 rounded-none border border-[#2A2A30] hover:border-[#FF0000]/40 flex items-center justify-center gap-2 min-h-[44px] uppercase font-headline cursor-pointer transition-colors"
                >
                  <LogOut className="w-4 h-4 text-[#FF0000]" />
                  <span>{isSigningOut ? 'Disconnecting...' : 'Logout'}</span>
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </nav>
  )
}
