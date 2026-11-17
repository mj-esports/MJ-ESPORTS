import { useState, useMemo, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  User,
  Shield,
  Lock,
  Bell,
  Eye,
  EyeOff,
  Sliders,
  Link2,
  AlertTriangle,
  CheckCircle2,
  X,
  Smartphone,
  Globe,
  Clock,
  Download,
  Trash2,
  LogOut,
  Key,
  ShieldCheck,
  Sparkles,
  Save,
  ArrowLeft,
  ExternalLink,
  Zap,
  Info
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

export default function SettingsPage() {
  const { user, profile, updateUserPassword, signOut } = useAuth()
  const { showSuccess, showError, showWarning, showInfo } = useToast()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState('general')

  // 1. Authoritative Verification Status (public.profiles.verification_status)
  const [isVerified, setIsVerified] = useState(false)

  useEffect(() => {
    if (!user?.id) {
      setIsVerified(false)
      return
    }

    let isMounted = true

    async function checkVerification() {
      if (!isSupabaseConfigured) {
        const metaStatus = user?.user_metadata?.verification_status
        const profStatus = profile?.verification_status
        if (isMounted) {
          setIsVerified(metaStatus === 'Verified' || profStatus === 'Verified')
        }
        return
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('verification_status')
          .eq('id', user.id)
          .maybeSingle()

        if (isMounted) {
          if (!error && data?.verification_status === 'Verified') {
            setIsVerified(true)
          } else {
            setIsVerified(false)
          }
        }
      } catch (err) {
        if (isMounted) setIsVerified(false)
      }
    }

    checkVerification()

    return () => {
      isMounted = false
    }
  }, [user?.id, profile?.verification_status, user?.user_metadata?.verification_status])

  // 2. Authoritative Player Identity Details
  const meta = user?.user_metadata || {}
  const displayName = meta.username || meta.full_name || profile?.username || user?.email?.split('@')[0] || 'Player'
  const emailAddress = user?.email || '—'
  const phoneNumber = meta.phone || meta.whatsappNumber || profile?.phone || ''
  const freeFireUid = meta.free_fire_uid || meta.freeFireUid || meta.game_uid || profile?.game_uid || ''
  const isPro = Boolean(meta.is_pro || meta.isPro || profile?.is_pro)
  const avatarUrl = meta.avatar_url || meta.avatarUrl || profile?.avatar_url || 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&w=400&q=80'

  // Detect real Google OAuth link status
  const isGoogleLinked = useMemo(() => {
    if (!user) return false
    const providers = user?.app_metadata?.providers || []
    if (Array.isArray(providers) && providers.includes('google')) return true
    const identities = user?.identities || []
    if (Array.isArray(identities) && identities.some((id) => id.provider === 'google')) return true
    return false
  }, [user])

  // 3. Security Form States
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  // Password Strength Calculation
  const passwordStrength = useMemo(() => {
    if (!newPassword) return { width: '0%', label: '', color: 'bg-transparent' }
    let score = 0
    if (newPassword.length >= 6) score += 1
    if (newPassword.length >= 10) score += 1
    if (/[A-Z]/.test(newPassword)) score += 1
    if (/[0-9]/.test(newPassword)) score += 1
    if (/[^A-Za-z0-9]/.test(newPassword)) score += 1

    if (score <= 2) return { width: '33%', label: 'Weak', color: 'bg-[#EF4444]' }
    if (score <= 4) return { width: '66%', label: 'Medium', color: 'bg-[#FF8C00]' }
    return { width: '100%', label: 'Strong', color: 'bg-[#10B981]' }
  }, [newPassword])

  // Real Password Change Handler via Supabase Auth
  const handlePasswordChange = async (e) => {
    e.preventDefault()
    if (newPassword.length < 6) {
      showError('New password must be at least 6 characters long.', 'Security Error')
      return
    }
    if (newPassword !== confirmPassword) {
      showError('New password and confirmation do not match.', 'Security Error')
      return
    }

    setIsChangingPassword(true)
    try {
      if (updateUserPassword) {
        await updateUserPassword(newPassword)
      } else if (isSupabaseConfigured) {
        const { error } = await supabase.auth.updateUser({ password: newPassword })
        if (error) throw error
      }

      showSuccess('Password updated successfully.', 'Security Updated')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      showError(err.message || 'Failed to update password.', 'Security Error')
    } finally {
      setIsChangingPassword(false)
    }
  }

  // Real Sign Out Handler
  const [isSigningOut, setIsSigningOut] = useState(false)
  const handleSignOutCurrentDevice = async () => {
    setIsSigningOut(true)
    try {
      const res = await signOut({ scope: 'local' })
      if (res && res.serverRevoked === false) {
        showWarning('Logged out locally. Server-side session revocation could not be confirmed.', 'Offline Logout')
      } else {
        showSuccess('Logged out successfully.', 'Session Closed')
      }
      navigate('/')
    } catch (err) {
      showError(err.message || 'Failed to log out.', 'Error')
    } finally {
      setIsSigningOut(false)
    }
  }

  return (
    <div className="bg-[#000000] text-[#A1A1AA] font-body min-h-screen pb-28 sm:pb-32 antialiased text-xs overflow-x-hidden">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 space-y-6 sm:space-y-8 font-mono">

        {/* ================================================== */}
        {/* 1. HEADER & BACK LINK                              */}
        {/* ================================================== */}
        <section aria-label="Settings Header" className="space-y-3">
          <div className="flex items-center justify-between">
            <Link
              to="/profile"
              className="inline-flex items-center gap-1.5 text-xs text-[#A1A1AA] hover:text-[#FFB900] transition-colors group cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
              <span>Return to Profile</span>
            </Link>

            <span className="px-2.5 py-1 rounded-none bg-[#18181B] border border-[#27272A] text-[10px] font-bold text-[#FF8C00] tracking-wider uppercase">
              FREE FIRE INDIA ONLY
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-[#27272A] pb-4">
            <div className="space-y-1">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight uppercase">
                PLAYER DOSSIER
              </h1>
              <p className="text-xs text-[#A1A1AA] font-sans">
                ACCOUNT & PREFERENCES
              </p>
            </div>
          </div>
        </section>

        {/* ================================================== */}
        {/* 2. COMPACT IDENTITY STRIP                          */}
        {/* ================================================== */}
        <section
          aria-label="Player Identity Strip"
          className="p-4 sm:p-5 rounded-none bg-[#111215] border border-[#27272A] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="relative shrink-0">
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-12 h-12 rounded-none object-cover border border-[#27272A]"
              />
              {isVerified && (
                <div
                  title="Authoritative Verified Player"
                  className="absolute -bottom-1 -right-1 p-0.5 bg-[#000000] rounded-none"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#10B981] fill-[#000000]" />
                </div>
              )}
            </div>

            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-bold text-white truncate max-w-xs">
                  {displayName}
                </h2>

                {isVerified && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-none text-[9px] font-bold uppercase bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30">
                    <ShieldCheck className="w-2.5 h-2.5" />
                    <span>VERIFIED</span>
                  </span>
                )}

                {isPro && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-none text-[9px] font-bold uppercase bg-[#FF8C00]/15 text-[#FF8C00] border border-[#FF8C00]/30">
                    <Zap className="w-2.5 h-2.5" />
                    <span>PRO</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-[10px] text-[#A1A1AA] font-mono">
                <span>FF MAX UID: {freeFireUid || 'Not registered'}</span>
                <span>&bull;</span>
                <span className="truncate max-w-[150px]">{emailAddress}</span>
              </div>
            </div>
          </div>

          <Link
            to="/profile/edit"
            className="self-start sm:self-auto px-4 py-2 rounded-none bg-[#18181B] hover:bg-[#27272A] text-white hover:text-[#FFB900] border border-[#27272A] hover:border-[#FFB900]/40 font-bold uppercase tracking-wider text-xs transition-all flex items-center gap-2 cursor-pointer shrink-0"
          >
            <span>Edit Profile</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </section>

        {/* ================================================== */}
        {/* 3. SETTINGS MAIN WORKSPACE                         */}
        {/* ================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* Navigation Tabs Bar */}
          <nav aria-label="Settings Tabs" className="lg:col-span-4 space-y-1 font-mono text-xs">
            {[
              { id: 'general', label: 'GENERAL INFO', icon: User },
              { id: 'security', label: 'SECURITY & AUTH', icon: Lock },
              { id: 'notifications', label: 'NOTIFICATIONS', icon: Bell },
              { id: 'privacy', label: 'PRIVACY', icon: Shield },
              { id: 'preferences', label: 'APP PREFERENCES', icon: Sliders },
              { id: 'linked', label: 'LINKED ACCOUNTS', icon: Link2 },
              { id: 'danger', label: 'DANGER ZONE', icon: AlertTriangle, danger: true },
            ].map((tab) => {
              const Icon = tab.icon
              const isSelected = activeTab === tab.id

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-none transition-all text-left font-bold cursor-pointer border ${isSelected
                    ? tab.danger
                      ? 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/40 shadow-none'
                      : 'bg-[#FFB900] text-black border-[#FFB900] shadow-none font-black'
                    : 'bg-[#111215] text-[#A1A1AA] hover:text-white hover:bg-[#18181B] border-[#27272A]'
                    }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{tab.label}</span>
                  </div>
                  {isSelected && <span className="w-1.5 h-1.5 rounded-none bg-current"></span>}
                </button>
              )
            })}
          </nav>

          {/* Settings Content Area */}
          <div className="lg:col-span-8 bg-[#111215] rounded-none p-5 sm:p-7 border border-[#27272A] shadow-none space-y-6">

            {/* TAB 1: GENERAL INFO */}
            {activeTab === 'general' && (
              <div className="space-y-6">
                <div className="border-b border-[#27272A] pb-4">
                  <h2 className="text-sm sm:text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <User className="w-4 h-4 text-[#FFB900]" />
                    <span>GENERAL INFO</span>
                  </h2>
                  <p className="text-xs text-[#A1A1AA] font-sans mt-0.5">
                    Core identity, Free Fire India game ID, and contact data.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <span className="text-[10px] text-[#A1A1AA] uppercase font-bold block">
                      DISPLAY NAME
                    </span>
                    <div className="p-3 bg-[#18181B] border border-[#27272A] rounded-none text-xs text-white font-mono flex items-center justify-between">
                      <span>{displayName}</span>
                      <span className="text-[10px] text-[#A1A1AA] font-sans">Synced from Profile</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] text-[#A1A1AA] uppercase font-bold block">
                      EMAIL ADDRESS (READ ONLY)
                    </span>
                    <div className="p-3 bg-[#18181B] border border-[#27272A] rounded-none text-xs text-[#A1A1AA] font-mono flex items-center justify-between">
                      <span>{emailAddress}</span>
                      <span className="text-[9.5px] px-1.5 py-0.5 rounded-none bg-[#000000] border border-[#27272A] text-[#A1A1AA] uppercase font-bold">
                        Read Only
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] text-[#A1A1AA] uppercase font-bold block">
                      PHONE NUMBER
                    </span>
                    <div className="p-3 bg-[#18181B] border border-[#27272A] rounded-none text-xs text-white font-mono flex items-center justify-between">
                      <span>{phoneNumber ? `+91 ${phoneNumber}` : 'Not linked'}</span>
                      <span className="text-[10px] text-[#A1A1AA] font-sans">WhatsApp Contact</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] text-[#A1A1AA] uppercase font-bold block">
                      FREE FIRE INDIA UID
                    </span>
                    <div className="p-3 bg-[#18181B] border border-[#27272A] rounded-none text-xs text-white font-mono flex items-center justify-between">
                      <span className="font-bold text-[#FFB900]">{freeFireUid || 'Not registered'}</span>
                      <span className="text-[9.5px] px-2 py-0.5 rounded-none bg-[#FF8C00]/10 text-[#FF8C00] border border-[#FF8C00]/30 font-bold uppercase">
                        FF INDIA ONLY
                      </span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Link
                      to="/profile/edit"
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#FFB900] hover:bg-[#FFC933] text-black font-black rounded-none text-xs uppercase tracking-wider transition-all shadow-none cursor-pointer"
                    >
                      <span>Edit in Profile Center</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: SECURITY & AUTH */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                <div className="border-b border-[#27272A] pb-4">
                  <h2 className="text-sm sm:text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Lock className="w-4 h-4 text-[#FFB900]" />
                    <span>SECURITY & AUTH</span>
                  </h2>
                  <p className="text-xs text-[#A1A1AA] font-sans mt-0.5">
                    Password credentials and session protection.
                  </p>
                </div>

                {/* Change Password Form */}
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    CHANGE PASSWORD
                  </h3>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-[#A1A1AA] uppercase font-bold block">
                      New Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Minimum 6 characters"
                        required
                        className="w-full bg-[#18181B] border border-[#27272A] rounded-none pl-3.5 pr-10 py-2.5 text-xs text-white focus:border-[#FFB900] focus:outline-none font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A1A1AA] hover:text-[#FFB900] cursor-pointer"
                      >
                        {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {newPassword && (
                      <div className="space-y-1 pt-1">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-[#A1A1AA]">Strength:</span>
                          <span className={`font-bold ${passwordStrength.label === 'Strong' ? 'text-[#10B981]' : passwordStrength.label === 'Medium' ? 'text-[#FF8C00]' : 'text-[#EF4444]'}`}>
                            {passwordStrength.label}
                          </span>
                        </div>
                        <div className="w-full bg-[#18181B] h-1.5 rounded-none overflow-hidden border border-[#27272A]">
                          <div className={`h-full transition-all duration-300 ${passwordStrength.color}`} style={{ width: passwordStrength.width }}></div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-[#A1A1AA] uppercase font-bold block">
                      Confirm New Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter new password"
                        required
                        className="w-full bg-[#18181B] border border-[#27272A] rounded-none pl-3.5 pr-10 py-2.5 text-xs text-white focus:border-[#FFB900] focus:outline-none font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A1A1AA] hover:text-[#FFB900] cursor-pointer"
                      >
                        {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isChangingPassword}
                    className="px-5 py-2.5 bg-[#FFB900] hover:bg-[#FFC933] text-black font-black rounded-none text-xs uppercase tracking-wider transition-all shadow-none cursor-pointer disabled:opacity-50"
                  >
                    {isChangingPassword ? 'Updating...' : 'Update Password'}
                  </button>
                </form>

                {/* Two-Factor Auth (Truthful Coming Soon) */}
                <div className="pt-6 border-t border-[#27272A] space-y-4">
                  <div className="p-4 bg-[#18181B] rounded-none border border-[#27272A] flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white uppercase">TWO-FACTOR AUTH (2FA)</span>
                        <span className="px-1.5 py-0.5 rounded-none text-[9px] font-bold uppercase bg-[#FF8C00]/15 text-[#FF8C00] border border-[#FF8C00]/30">
                          COMING SOON
                        </span>
                      </div>
                      <p className="text-[11px] text-[#A1A1AA] font-sans">
                        TOTP mobile authenticator verification is scheduled for an upcoming security release.
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled
                      className="px-3 py-1.5 rounded-none bg-[#000000] text-[#71717A] border border-[#27272A] text-xs font-bold uppercase cursor-not-allowed opacity-60"
                    >
                      Disabled
                    </button>
                  </div>

                  {/* Active Sessions & Sign Out */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white uppercase tracking-wider">
                        ACTIVE SESSIONS
                      </span>
                      <span className="text-[10px] text-[#10B981] font-mono font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-none bg-[#10B981] animate-pulse"></span>
                        <span>Current Session Active</span>
                      </span>
                    </div>

                    <div className="p-4 bg-[#18181B] rounded-none border border-[#27272A] flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Smartphone className="w-5 h-5 text-[#FFB900] shrink-0" />
                        <div>
                          <span className="text-xs font-bold text-white block">This Device</span>
                          <span className="text-[10px] text-[#A1A1AA] font-mono block">
                            Authenticated via Supabase Session
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleSignOutCurrentDevice}
                        disabled={isSigningOut}
                        className="px-3 py-1.5 bg-[#18181B] hover:bg-[#27272A] text-[#A1A1AA] hover:text-[#FFB900] border border-[#27272A] hover:border-[#FFB900]/40 rounded-none text-xs font-bold uppercase transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed group"
                        aria-label="Log Out of current device"
                      >
                        <LogOut className="w-3.5 h-3.5 text-[#FF8C00] group-hover:text-[#FFB900] transition-colors shrink-0" />
                        <span>{isSigningOut ? 'Logging Out...' : 'Log Out'}</span>
                      </button>
                    </div>

                    <div className="p-3 bg-[#18181B]/60 rounded-none border border-[#27272A] flex items-center justify-between text-[11px]">
                      <span className="text-[#A1A1AA] font-sans">Remote multi-session revocation (Logout All Devices)</span>
                      <span className="px-2 py-0.5 rounded-none text-[9.5px] font-bold uppercase bg-[#27272A] text-[#A1A1AA]">
                        COMING SOON
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: NOTIFICATIONS */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <div className="border-b border-[#27272A] pb-4">
                  <h2 className="text-sm sm:text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Bell className="w-4 h-4 text-[#FFB900]" />
                    <span>NOTIFICATION PREFERENCES</span>
                  </h2>
                  <p className="text-xs text-[#A1A1AA] font-sans mt-0.5">
                    Live match reminders, slot alerts, and competitive telemetry.
                  </p>
                </div>

                <div className="p-3.5 rounded-none border border-[#FFB900]/20 bg-[#FFB900]/5 text-xs text-[#A1A1AA] font-sans flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-[#FFB900] shrink-0 mt-0.5" />
                  <span>
                    Real-time match alerts and tournament announcements are currently published in the in-app notification center. Granular push and email preference toggles are coming soon.
                  </span>
                </div>

                <div className="space-y-3 font-mono">
                  {[
                    { title: 'Tournament Registration & Slot Alerts', desc: 'Instant alerts when tournament slots open for registration.' },
                    { title: 'Room ID & Password Match Reminders', desc: 'Direct custom room credential alerts 15 minutes before start.' },
                    { title: 'Prize & Payout Notifications', desc: 'Wallet credit confirmations for confirmed tournament winnings.' },
                    { title: 'Marketing & Email Updates', desc: 'Weekly competitive digests and leaderboards via email.' },
                    { title: 'Browser Push Notifications', desc: 'Desktop and browser web push notifications.' },
                  ].map((item) => (
                    <div
                      key={item.title}
                      className="p-4 bg-[#18181B] rounded-none border border-[#27272A] flex items-center justify-between gap-4"
                    >
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-white block">{item.title}</span>
                        <span className="text-[10px] text-[#A1A1AA] font-sans block">{item.desc}</span>
                      </div>

                      <span className="px-2 py-0.5 rounded-none text-[9.5px] font-bold uppercase bg-[#000000] text-[#A1A1AA] border border-[#27272A] shrink-0">
                        COMING SOON
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 4: PRIVACY */}
            {activeTab === 'privacy' && (
              <div className="space-y-6">
                <div className="border-b border-[#27272A] pb-4">
                  <h2 className="text-sm sm:text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[#FFB900]" />
                    <span>PRIVACY & VISIBILITY</span>
                  </h2>
                  <p className="text-xs text-[#A1A1AA] font-sans mt-0.5">
                    Esports profile accessibility and public telemetry controls.
                  </p>
                </div>

                <div className="space-y-4 font-mono">
                  <div className="p-4 bg-[#18181B] rounded-none border border-[#27272A] flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white uppercase">Profile Visibility</span>
                        <span className="px-1.5 py-0.5 rounded-none text-[9px] font-bold uppercase bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30">
                          PUBLIC (ACTIVE)
                        </span>
                      </div>
                      <p className="text-[10px] text-[#A1A1AA] font-sans">
                        Tournament leaderboards, match placements, and verified IGN are publicly visible to competitors.
                      </p>
                    </div>

                    <span className="px-2 py-0.5 rounded-none text-[9.5px] font-bold uppercase bg-[#000000] text-[#A1A1AA] border border-[#27272A] shrink-0">
                      COMING SOON
                    </span>
                  </div>

                  <div className="p-4 bg-[#18181B] rounded-none border border-[#27272A] flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white uppercase">Match Telemetry & Stats</span>
                        <span className="px-1.5 py-0.5 rounded-none text-[9px] font-bold uppercase bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30">
                          PUBLIC (ACTIVE)
                        </span>
                      </div>
                      <p className="text-[10px] text-[#A1A1AA] font-sans">
                        Win rates and confirmed kill records are publicly auditable for competitive integrity.
                      </p>
                    </div>

                    <span className="px-2 py-0.5 rounded-none text-[9.5px] font-bold uppercase bg-[#000000] text-[#A1A1AA] border border-[#27272A] shrink-0">
                      COMING SOON
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: APP PREFERENCES */}
            {activeTab === 'preferences' && (
              <div className="space-y-6">
                <div className="border-b border-[#27272A] pb-4">
                  <h2 className="text-sm sm:text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-[#FFB900]" />
                    <span>APP PREFERENCES</span>
                  </h2>
                  <p className="text-xs text-[#A1A1AA] font-sans mt-0.5">
                    Platform language and game ecosystem settings.
                  </p>
                </div>

                <div className="space-y-4 font-mono">
                  {/* Language */}
                  <div className="p-4 bg-[#18181B] rounded-none border border-[#27272A] flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-white uppercase block">Platform Language</span>
                      <span className="text-[10px] text-[#A1A1AA] font-sans block">
                        English (US) is the primary supported platform language.
                      </span>
                    </div>

                    <span className="px-2.5 py-1 rounded-none bg-[#FFB900]/10 text-[#FFB900] border border-[#FFB900]/30 text-xs font-bold uppercase">
                      English (US)
                    </span>
                  </div>

                  {/* Dedicated Game */}
                  <div className="p-4 bg-[#18181B] rounded-none border border-[#27272A] flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-white uppercase block">Dedicated Platform Game</span>
                      <span className="text-[10px] text-[#A1A1AA] font-sans block">
                        MJ ESPORTS is exclusively optimized for Free Fire India.
                      </span>
                    </div>

                    <span className="px-2.5 py-1 rounded-none bg-[#FF8C00]/10 text-[#FF8C00] border border-[#FF8C00]/30 text-xs font-bold uppercase">
                      FREE FIRE INDIA
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 6: LINKED ACCOUNTS */}
            {activeTab === 'linked' && (
              <div className="space-y-6">
                <div className="border-b border-[#27272A] pb-4">
                  <h2 className="text-sm sm:text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Link2 className="w-4 h-4 text-[#FFB900]" />
                    <span>LINKED ACCOUNTS</span>
                  </h2>
                  <p className="text-xs text-[#A1A1AA] font-sans mt-0.5">
                    Connected authentication identities and social platforms.
                  </p>
                </div>

                <div className="space-y-3 font-mono">
                  {/* Google */}
                  <div className="p-4 bg-[#18181B] rounded-none border border-[#27272A] flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-white block">Google</span>
                      <span className="text-[10px] text-[#A1A1AA] font-sans block">
                        Single Sign-On authentication via Google OAuth.
                      </span>
                    </div>

                    {isGoogleLinked ? (
                      <span className="px-2.5 py-1 rounded-none bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/30 text-xs font-bold uppercase">
                        CONNECTED
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-none bg-[#000000] text-[#A1A1AA] border border-[#27272A] text-xs font-bold uppercase">
                        NOT CONNECTED
                      </span>
                    )}
                  </div>

                  {/* Discord */}
                  <div className="p-4 bg-[#18181B] rounded-none border border-[#27272A] flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-white block">Discord</span>
                      <span className="text-[10px] text-[#A1A1AA] font-sans block">
                        Tournament room voice channels and role verification.
                      </span>
                    </div>

                    <span className="px-2 py-0.5 rounded-none text-[9.5px] font-bold uppercase bg-[#000000] text-[#A1A1AA] border border-[#27272A] shrink-0">
                      COMING SOON
                    </span>
                  </div>

                  {/* YouTube */}
                  <div className="p-4 bg-[#18181B] rounded-none border border-[#27272A] flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-white block">YouTube</span>
                      <span className="text-[10px] text-[#A1A1AA] font-sans block">
                        Creator channel highlights and broadcast links.
                      </span>
                    </div>

                    <span className="px-2 py-0.5 rounded-none text-[9.5px] font-bold uppercase bg-[#000000] text-[#A1A1AA] border border-[#27272A] shrink-0">
                      COMING SOON
                    </span>
                  </div>

                  {/* X / Twitter */}
                  <div className="p-4 bg-[#18181B] rounded-none border border-[#27272A] flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-white block">X (Twitter)</span>
                      <span className="text-[10px] text-[#A1A1AA] font-sans block">
                        Competitive announcements and social mentions.
                      </span>
                    </div>

                    <span className="px-2 py-0.5 rounded-none text-[9.5px] font-bold uppercase bg-[#000000] text-[#A1A1AA] border border-[#27272A] shrink-0">
                      COMING SOON
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 7: DANGER ZONE */}
            {activeTab === 'danger' && (
              <div className="space-y-6">
                <div className="border-b border-[#EF4444]/20 pb-4">
                  <h2 className="text-sm sm:text-base font-bold text-[#EF4444] uppercase tracking-wider flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-[#EF4444]" />
                    <span>DANGER ZONE</span>
                  </h2>
                  <p className="text-xs text-[#A1A1AA] font-sans mt-0.5">
                    Irreversible account procedures and data compliance archives.
                  </p>
                </div>

                <div className="space-y-4 font-mono">
                  {/* Export My Data */}
                  <div className="p-4 bg-[#18181B] rounded-none border border-[#27272A] flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-white uppercase block">Export My Data</span>
                      <span className="text-[10px] text-[#A1A1AA] font-sans block">
                        Automated GDPR/compliance data archives are scheduled for a future update. Contact support for immediate data exports.
                      </span>
                    </div>

                    <span className="px-2 py-0.5 rounded-none text-[9.5px] font-bold uppercase bg-[#000000] text-[#A1A1AA] border border-[#27272A] shrink-0">
                      COMING SOON
                    </span>
                  </div>

                  {/* Delete Account */}
                  <div className="p-4 bg-red-950/20 rounded-none border border-red-900/40 flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-[#EF4444] uppercase block">Delete Account</span>
                      <span className="text-[10px] text-[#A1A1AA] font-sans block">
                        Account termination requires identity and wallet balance review. Please contact support.
                      </span>
                    </div>

                    <a
                      href="mailto:mjesports.team@gmail.com?subject=Account%20Deletion%20Request"
                      className="px-3 py-1.5 bg-[#EF4444]/20 hover:bg-[#EF4444]/30 text-[#EF4444] border border-[#EF4444]/40 rounded-none text-xs font-bold uppercase transition-all cursor-pointer shrink-0"
                    >
                      Contact Support
                    </a>
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>

      </main>
    </div>
  )
}
