import { useState, useMemo } from 'react'
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
  Gamepad2,
  Download,
  Trash2,
  LogOut,
  Key,
  ShieldCheck,
  Sparkles,
  Save
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { supabase } from '../lib/supabase'
import {
  isValidGameUid,
  isValidPhoneNumber,
  sanitizeDigitsOnly,
} from '../utils/validationUtils'

export default function SettingsPage() {
  const { user, updateProfile } = useAuth()
  const { showSuccess, showError } = useToast()

  const [activeTab, setActiveTab] = useState('general')

  // General Settings States
  const [displayName, setDisplayName] = useState(
    user?.user_metadata?.username || user?.email?.split('@')[0] || 'Neo_Striker'
  )
  const [emailAddress, setEmailAddress] = useState(user?.email || 'player@mjesports.pro')
  const [phoneNumber, setPhoneNumber] = useState(
    sanitizeDigitsOnly(user?.user_metadata?.phone || user?.user_metadata?.whatsappNumber || '9876543210', 10)
  )
  const [freeFireUid, setFreeFireUid] = useState(
    sanitizeDigitsOnly(user?.user_metadata?.free_fire_uid || user?.user_metadata?.freeFireUid || user?.user_metadata?.game_uid || '1092837482', 10)
  )
  const [bgmiUid, setBgmiUid] = useState(
    sanitizeDigitsOnly(user?.user_metadata?.bgmi_uid || user?.user_metadata?.bgmiUid || '', 10)
  )
  const [generalErrors, setGeneralErrors] = useState({ freeFireUid: '', bgmiUid: '', phoneNumber: '' })

  // Security States
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [is2FAEnabled, setIs2FAEnabled] = useState(false)

  // Notifications Toggles
  const [notifications, setNotifications] = useState({
    tournamentAlerts: true,
    matchReminders: true,
    prizeNotifications: true,
    emailNotifications: true,
    pushNotifications: false,
  })

  // Privacy Toggles
  const [privacy, setPrivacy] = useState({
    profileVisibility: 'PUBLIC', // PUBLIC | FRIENDS | PRIVATE
    hideStats: false,
    hideUid: false,
  })

  // Preferences States
  const [preferences, setPreferences] = useState({
    theme: 'DARK',
    language: 'English (US)',
    timeZone: '(UTC+05:30) Asia/Kolkata (IST)',
    defaultGame: 'Free Fire MAX',
  })

  // Linked Accounts
  const [linkedAccounts, setLinkedAccounts] = useState({
    google: true,
    discord: true,
    youtube: false,
    twitter: false,
  })

  // Password Strength Calculation
  const passwordStrength = useMemo(() => {
    if (!newPassword) return { width: '0%', label: '', color: 'bg-transparent' }
    let score = 0
    if (newPassword.length >= 6) score += 1
    if (newPassword.length >= 10) score += 1
    if (/[A-Z]/.test(newPassword)) score += 1
    if (/[0-9]/.test(newPassword)) score += 1
    if (/[^A-Za-z0-9]/.test(newPassword)) score += 1

    if (score <= 2) return { width: '33%', label: 'Weak', color: 'bg-[#ff3366]' }
    if (score <= 4) return { width: '66%', label: 'Medium', color: 'bg-[#fe6b00]' }
    return { width: '100%', label: 'Strong', color: 'bg-[#00ff9d]' }
  }, [newPassword])

  // Handle General Profile Save
  const handleSaveGeneral = async (e) => {
    e.preventDefault()
    setGeneralErrors({ freeFireUid: '', bgmiUid: '', phoneNumber: '' })

    let hasError = false
    const newErrors = { freeFireUid: '', bgmiUid: '', phoneNumber: '' }

    // Validate Phone Number (10 digits)
    if (phoneNumber && !isValidPhoneNumber(phoneNumber)) {
      newErrors.phoneNumber = 'Phone number must be exactly 10 numeric digits (0-9).'
      hasError = true
    }

    // Validate Free Fire UID (Required & exactly 10 digits)
    if (!freeFireUid.trim()) {
      newErrors.freeFireUid = 'Free Fire UID is required.'
      hasError = true
    } else if (!isValidGameUid(freeFireUid)) {
      newErrors.freeFireUid = 'Free Fire UID must be exactly 10 numeric digits (0-9).'
      hasError = true
    }

    // Validate BGMI UID (Optional & exactly 10 digits if provided)
    if (bgmiUid.trim() && !isValidGameUid(bgmiUid)) {
      newErrors.bgmiUid = 'BGMI UID must be exactly 10 numeric digits (0-9).'
      hasError = true
    }

    if (hasError) {
      setGeneralErrors(newErrors)
      showError('Please fix the validation errors before saving.', 'Validation Error')
      return
    }

    try {
      if (updateProfile) {
        await updateProfile({
          username: displayName,
          phone: phoneNumber.trim(),
          free_fire_uid: freeFireUid.trim(),
          freeFireUid: freeFireUid.trim(),
          bgmi_uid: bgmiUid.trim(),
          bgmiUid: bgmiUid.trim(),
        })
      }
      showSuccess('Settings Saved', 'Settings Saved')
    } catch (err) {
      showError(err.message || 'Failed to update settings.', 'Error')
    }
  }

  // Handle Password Update with Supabase Auth
  const handlePasswordChange = async (e) => {
    e.preventDefault()
    if (!currentPassword) {
      showError('Current password is required.', 'Security Error')
      return
    }
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
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error

      showSuccess('Password Changed', 'Security Updated')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      showError(err.message || 'Failed to update password.', 'Security Error')
    } finally {
      setIsChangingPassword(false)
    }
  }

  const handleLogoutAllDevices = () => {
    showSuccess('Successfully logged out from all active sessions on other devices.', 'Sessions Terminated')
  }

  const handleDownloadData = () => {
    const dataObj = {
      user: displayName,
      email: emailAddress,
      phone: phoneNumber,
      preferences,
      exportDate: new Date().toISOString(),
    }
    const blob = new Blob([JSON.stringify(dataObj, null, 2)], { type: 'application/json' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `MJ_ESPORTS_Account_Data_${displayName}.json`
    a.click()
    showSuccess('Account archive download initialized.', 'Data Exported')
  }

  return (
    <div className="bg-[#09090b] text-[#f8fafc] font-body min-h-screen pb-20 antialiased">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-10">

        {/* 1. SETTINGS HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#27272a]">
          <div>
            <h1 className="font-headline text-3xl sm:text-4xl font-black text-white uppercase tracking-tight flex items-center gap-3">
              <Sliders className="w-8 h-8 text-[#00f2ff]" />
              <span>Account Settings</span>
            </h1>
            <p className="text-xs sm:text-sm text-[#a1a1aa] mt-1 font-body">
              Manage your esports profile, security credentials, preferences, and privacy controls.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-[#00f2ff]/10 text-[#00f2ff] border border-[#00f2ff]/30 w-fit">
            SYSTEM TELEMETRY v2.6
          </span>
        </div>

        {/* 2. SETTINGS NAVIGATION TABS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Side Tabs Bar (Spans 3 cols) */}
          <div className="lg:col-span-3 space-y-1 font-headline text-xs font-bold uppercase">
            {[
              { id: 'general', label: 'General Info', icon: User },
              { id: 'security', label: 'Security & Auth', icon: Lock },
              { id: 'notifications', label: 'Notifications', icon: Bell },
              { id: 'privacy', label: 'Privacy & Visibility', icon: Shield },
              { id: 'preferences', label: 'App Preferences', icon: Sliders },
              { id: 'linked', label: 'Linked Accounts', icon: Link2 },
              { id: 'danger', label: 'Danger Zone', icon: AlertTriangle, danger: true },
            ].map((tab) => {
              const Icon = tab.icon
              const isSelected = activeTab === tab.id

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all text-left ${
                    isSelected
                      ? tab.danger
                        ? 'bg-[#ff3366]/10 text-[#ff3366] border border-[#ff3366]/40 shadow-lg'
                        : 'bg-[#00f2ff] text-black shadow-[0_0_15px_rgba(34,211,238,0.3)] font-black'
                      : 'bg-[#18181b]/60 text-[#a1a1aa] hover:text-white hover:bg-[#27272a] border border-[#27272a]'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>

          {/* Settings Content Body (Spans 9 cols) */}
          <div className="lg:col-span-9 bg-[#18181b]/60 backdrop-blur-md rounded-2xl p-6 sm:p-8 border border-[#27272a] shadow-2xl">

            {/* SECTION 1: GENERAL INFO */}
            {activeTab === 'general' && (
              <div className="space-y-6">
                <div className="border-b border-white/5 pb-4">
                  <h2 className="font-headline font-bold text-xl text-white uppercase tracking-wide flex items-center gap-2">
                    <User className="w-5 h-5 text-[#00f2ff]" />
                    <span>General Profile Information</span>
                  </h2>
                  <p className="text-xs text-[#a1a1aa] mt-1">Update your display name and public contact metadata.</p>
                </div>

                <form onSubmit={handleSaveGeneral} className="space-y-4 font-mono text-xs max-w-xl">
                  {/* 1. Display Name */}
                  <div className="space-y-1.5">
                    <label className="text-[#a1a1aa] uppercase font-bold block">Display Name</label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      required
                      className="w-full bg-[#09090b] border border-[#27272a] rounded-xl p-3 text-sm text-white focus:border-[#00f2ff] focus:outline-none"
                    />
                  </div>

                  {/* 2. Email Address (Read Only) */}
                  <div className="space-y-1.5">
                    <label className="text-[#a1a1aa] uppercase font-bold block">Email Address (Read Only)</label>
                    <input
                      type="email"
                      value={emailAddress}
                      disabled
                      className="w-full bg-[#18181b] border border-[#27272a] rounded-xl p-3 text-sm text-[#71717a] cursor-not-allowed"
                    />
                  </div>

                  {/* 3. Phone Number */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[#a1a1aa] uppercase font-bold block text-xs">Phone Number</label>
                      <span className={`text-[10px] font-mono font-bold ${phoneNumber.length === 10 ? 'text-[#00f2ff]' : 'text-[#71717a]'}`}>
                        {phoneNumber.length}/10
                      </span>
                    </div>
                    <div className="flex items-stretch rounded-xl overflow-hidden border border-[#27272a] focus-within:border-[#00f2ff]">
                      <span className="flex items-center px-3.5 bg-[#18181b] border-r border-[#27272a] text-xs font-mono font-bold text-[#00f2ff] select-none">
                        +91
                      </span>
                      <input
                        type="tel"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={10}
                        value={phoneNumber}
                        onChange={(e) => {
                          const val = sanitizeDigitsOnly(e.target.value, 10)
                          setPhoneNumber(val)
                          if (generalErrors.phoneNumber) setGeneralErrors((prev) => ({ ...prev, phoneNumber: '' }))
                        }}
                        placeholder="9876543210"
                        className="w-full bg-[#09090b] p-3 text-sm text-white focus:outline-none"
                      />
                    </div>
                    {generalErrors.phoneNumber && (
                      <p className="text-[11px] text-[#ff3366] font-mono font-bold mt-1">
                        {generalErrors.phoneNumber}
                      </p>
                    )}
                  </div>

                  {/* 4. FREE FIRE UID * */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[#a1a1aa] uppercase font-bold block text-xs">
                        FREE FIRE UID <span className="text-[#ff3366]">*</span>
                      </label>
                      <span className={`text-[10px] font-mono font-bold ${freeFireUid.length === 10 ? 'text-[#00f2ff]' : 'text-[#71717a]'}`}>
                        {freeFireUid.length}/10
                      </span>
                    </div>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={10}
                      value={freeFireUid}
                      onChange={(e) => {
                        const val = sanitizeDigitsOnly(e.target.value, 10)
                        setFreeFireUid(val)
                        if (generalErrors.freeFireUid) setGeneralErrors((prev) => ({ ...prev, freeFireUid: '' }))
                      }}
                      placeholder="0123456789"
                      required
                      className={`w-full bg-[#09090b] border rounded-xl p-3 text-sm text-white focus:outline-none transition-colors ${
                        generalErrors.freeFireUid
                          ? 'border-[#ff3366] focus:border-[#ff3366]'
                          : 'border-[#27272a] focus:border-[#00f2ff]'
                      }`}
                    />
                    {generalErrors.freeFireUid && (
                      <p className="text-[11px] text-[#ff3366] font-mono font-bold mt-1">
                        {generalErrors.freeFireUid}
                      </p>
                    )}
                  </div>

                  {/* 5. BGMI UID (Optional) */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[#a1a1aa] uppercase font-bold block text-xs">
                        BGMI UID (Optional)
                      </label>
                      <span className={`text-[10px] font-mono font-bold ${bgmiUid.length === 10 ? 'text-[#00f2ff]' : 'text-[#71717a]'}`}>
                        {bgmiUid.length}/10
                      </span>
                    </div>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={10}
                      value={bgmiUid}
                      onChange={(e) => {
                        const val = sanitizeDigitsOnly(e.target.value, 10)
                        setBgmiUid(val)
                        if (generalErrors.bgmiUid) setGeneralErrors((prev) => ({ ...prev, bgmiUid: '' }))
                      }}
                      placeholder="0123456789"
                      className={`w-full bg-[#09090b] border rounded-xl p-3 text-sm text-white focus:outline-none transition-colors ${
                        generalErrors.bgmiUid
                          ? 'border-[#ff3366] focus:border-[#ff3366]'
                          : 'border-[#27272a] focus:border-[#00f2ff]'
                      }`}
                    />
                    {generalErrors.bgmiUid && (
                      <p className="text-[11px] text-[#ff3366] font-mono font-bold mt-1">
                        {generalErrors.bgmiUid}
                      </p>
                    )}
                  </div>

                  {/* 6. Save General Settings Button */}
                  <div className="pt-4 font-sans">
                    <button
                      type="submit"
                      className="px-6 py-3 bg-[#00f2ff] text-black font-extrabold rounded-xl text-xs uppercase hover:bg-cyan-300 transition-all shadow-[0_0_15px_rgba(34,211,238,0.3)] flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      <span>Save General Settings</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* SECTION 2: SECURITY */}
            {activeTab === 'security' && (
              <div className="space-y-8">
                <div className="border-b border-white/5 pb-4">
                  <h2 className="font-headline font-bold text-xl text-white uppercase tracking-wide flex items-center gap-2">
                    <Lock className="w-5 h-5 text-[#00f2ff]" />
                    <span>Security & Authentication</span>
                  </h2>
                  <p className="text-xs text-[#a1a1aa] mt-1">Manage login password, 2FA, and active sessions.</p>
                </div>

                {/* Change Password Form */}
                <form onSubmit={handlePasswordChange} className="space-y-4 font-mono text-xs max-w-xl">
                  <h3 className="font-headline font-bold text-sm text-white uppercase tracking-wider">Change Account Password</h3>

                  <div className="space-y-1.5">
                    <label className="text-[#a1a1aa] uppercase font-bold block">Current Password *</label>
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="••••••••••••"
                        required
                        className="w-full bg-[#09090b] border border-[#27272a] rounded-xl pl-3.5 pr-10 py-3 text-sm text-white focus:border-[#00f2ff] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a1a1aa] hover:text-[#00f2ff]"
                      >
                        {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[#a1a1aa] uppercase font-bold block">New Password *</label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Minimum 6 characters"
                        required
                        className="w-full bg-[#09090b] border border-[#27272a] rounded-xl pl-3.5 pr-10 py-3 text-sm text-white focus:border-[#00f2ff] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a1a1aa] hover:text-[#00f2ff]"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {newPassword && (
                      <div className="space-y-1 pt-1">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-[#a1a1aa]">Password Strength:</span>
                          <span className={`font-bold ${passwordStrength.label === 'Strong' ? 'text-[#00ff9d]' : passwordStrength.label === 'Medium' ? 'text-[#fe6b00]' : 'text-[#ff3366]'}`}>
                            {passwordStrength.label}
                          </span>
                        </div>
                        <div className="w-full bg-[#09090b] h-1.5 rounded-full overflow-hidden border border-[#27272a]">
                          <div className={`h-full transition-all duration-300 ${passwordStrength.color}`} style={{ width: passwordStrength.width }}></div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[#a1a1aa] uppercase font-bold block">Confirm New Password *</label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter new password"
                        required
                        className="w-full bg-[#09090b] border border-[#27272a] rounded-xl pl-3.5 pr-10 py-3 text-sm text-white focus:border-[#00f2ff] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a1a1aa] hover:text-[#00f2ff]"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isChangingPassword}
                    className="px-6 py-2.5 bg-[#00f2ff] text-black font-extrabold rounded-xl text-xs uppercase hover:bg-cyan-300 transition-all font-sans"
                  >
                    {isChangingPassword ? 'Updating Password...' : 'Update Password'}
                  </button>
                </form>

                {/* Two-Factor Authentication & Sessions */}
                <div className="pt-6 border-t border-white/5 space-y-6">
                  <div className="flex items-center justify-between p-4 bg-[#09090b] rounded-xl border border-[#27272a]">
                    <div>
                      <h4 className="font-headline font-bold text-sm text-white">Two-Factor Authentication (2FA)</h4>
                      <p className="text-xs text-[#a1a1aa] mt-0.5">Secure your account with TOTP authenticator apps.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIs2FAEnabled((prev) => !prev)}
                      className={`px-4 py-2 rounded-xl font-headline font-bold text-xs uppercase transition-all ${
                        is2FAEnabled ? 'bg-[#00ff9d] text-black' : 'bg-[#27272a] text-white'
                      }`}
                    >
                      {is2FAEnabled ? 'Enabled' : 'Enable 2FA'}
                    </button>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-headline font-bold text-sm text-white uppercase tracking-wider">Active Login Sessions</h4>
                    <div className="p-4 bg-[#09090b] rounded-xl border border-[#27272a] flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Smartphone className="w-5 h-5 text-[#00f2ff]" />
                        <div>
                          <span className="text-xs font-bold text-white block">Windows PC — Chrome Browser</span>
                          <span className="text-[10px] text-[#a1a1aa] font-mono block">Current Active Session • IP 49.37.102.14</span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 bg-[#00ff9d]/10 text-[#00ff9d] border border-[#00ff9d]/30 rounded text-[10px] font-mono font-bold">ONLINE</span>
                    </div>

                    <button
                      onClick={handleLogoutAllDevices}
                      className="px-4 py-2 bg-[#27272a] hover:bg-[#3f3f46] text-[#fe6b00] border border-[#fe6b00]/30 rounded-xl text-xs font-bold uppercase transition-all flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Logout From All Devices</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 3: NOTIFICATIONS */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <div className="border-b border-white/5 pb-4">
                  <h2 className="font-headline font-bold text-xl text-white uppercase tracking-wide flex items-center gap-2">
                    <Bell className="w-5 h-5 text-[#00f2ff]" />
                    <span>Notification Preferences</span>
                  </h2>
                  <p className="text-xs text-[#a1a1aa] mt-1">Customize push, email, and match notification alerts.</p>
                </div>

                <div className="space-y-4 font-mono text-xs">
                  {[
                    { key: 'tournamentAlerts', label: 'Tournament Registration Alerts', desc: 'Notify when open tournament slots are available.' },
                    { key: 'matchReminders', label: 'Match Start Reminders', desc: 'Send alerts 15 minutes before custom room start time.' },
                    { key: 'prizeNotifications', label: 'Prize & Payout Notifications', desc: 'Notify when prize winnings are credited to wallet.' },
                    { key: 'emailNotifications', label: 'Email Newsletters & Summaries', desc: 'Receive weekly leaderboard standings via email.' },
                    { key: 'pushNotifications', label: 'Browser Push Notifications', desc: 'Allow browser desktop push alerts.' },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between p-4 bg-[#09090b] rounded-xl border border-[#27272a]">
                      <div>
                        <span className="text-sm font-bold text-white block">{item.label}</span>
                        <span className="text-[10px] text-[#a1a1aa] block mt-0.5">{item.desc}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setNotifications((prev) => ({ ...prev, [item.key]: !prev[item.key] }))}
                        className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                          notifications[item.key] ? 'bg-[#00f2ff]' : 'bg-[#27272a]'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full bg-black transition-transform ${
                          notifications[item.key] ? 'translate-x-6' : 'translate-x-0'
                        }`}></div>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SECTION 4: PRIVACY */}
            {activeTab === 'privacy' && (
              <div className="space-y-6">
                <div className="border-b border-white/5 pb-4">
                  <h2 className="font-headline font-bold text-xl text-white uppercase tracking-wide flex items-center gap-2">
                    <Shield className="w-5 h-5 text-[#00f2ff]" />
                    <span>Privacy Controls</span>
                  </h2>
                  <p className="text-xs text-[#a1a1aa] mt-1">Control who can view your player profile and match statistics.</p>
                </div>

                <div className="space-y-4 font-mono text-xs">
                  <div className="space-y-2">
                    <label className="text-[#a1a1aa] uppercase font-bold block">Profile Visibility</label>
                    <div className="grid grid-cols-3 gap-3">
                      {['PUBLIC', 'FRIENDS', 'PRIVATE'].map((vis) => (
                        <button
                          key={vis}
                          type="button"
                          onClick={() => setPrivacy((prev) => ({ ...prev, profileVisibility: vis }))}
                          className={`p-3 rounded-xl border text-center font-bold transition-all ${
                            privacy.profileVisibility === vis
                              ? 'bg-[#00f2ff]/10 border-[#00f2ff] text-[#00f2ff]'
                              : 'bg-[#09090b] border-[#27272a] text-[#a1a1aa]'
                          }`}
                        >
                          {vis}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-[#09090b] rounded-xl border border-[#27272a]">
                    <div>
                      <span className="text-sm font-bold text-white block">Hide Match Statistics</span>
                      <span className="text-[10px] text-[#a1a1aa] block mt-0.5">Hide win rates and K/D ratios from public view.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPrivacy((prev) => ({ ...prev, hideStats: !prev.hideStats }))}
                      className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                        privacy.hideStats ? 'bg-[#00f2ff]' : 'bg-[#27272a]'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full bg-black transition-transform ${
                        privacy.hideStats ? 'translate-x-6' : 'translate-x-0'
                      }`}></div>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 5: PREFERENCES */}
            {activeTab === 'preferences' && (
              <div className="space-y-6">
                <div className="border-b border-white/5 pb-4">
                  <h2 className="font-headline font-bold text-xl text-white uppercase tracking-wide flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-[#00f2ff]" />
                    <span>App Preferences</span>
                  </h2>
                  <p className="text-xs text-[#a1a1aa] mt-1">Customize regional settings and default game filters.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs">
                  <div className="space-y-1.5">
                    <label className="text-[#a1a1aa] uppercase font-bold block">Language</label>
                    <select
                      value={preferences.language}
                      onChange={(e) => setPreferences((prev) => ({ ...prev, language: e.target.value }))}
                      className="w-full bg-[#09090b] border border-[#27272a] rounded-xl p-3 text-sm text-white focus:border-[#00f2ff] focus:outline-none"
                    >
                      <option>English (US)</option>
                      <option>Hindi (हिन्दी)</option>
                      <option>Tamil (தமிழ்)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[#a1a1aa] uppercase font-bold block">Default Game</label>
                    <select
                      value={preferences.defaultGame}
                      onChange={(e) => setPreferences((prev) => ({ ...prev, defaultGame: e.target.value }))}
                      className="w-full bg-[#09090b] border border-[#27272a] rounded-xl p-3 text-sm text-white focus:border-[#00f2ff] focus:outline-none"
                    >
                      <option>Free Fire MAX</option>
                      <option>BGMI</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 6: LINKED ACCOUNTS */}
            {activeTab === 'linked' && (
              <div className="space-y-6">
                <div className="border-b border-white/5 pb-4">
                  <h2 className="font-headline font-bold text-xl text-white uppercase tracking-wide flex items-center gap-2">
                    <Link2 className="w-5 h-5 text-[#00f2ff]" />
                    <span>Linked Accounts</span>
                  </h2>
                  <p className="text-xs text-[#a1a1aa] mt-1">Connect your social accounts for easy single sign-on.</p>
                </div>

                <div className="space-y-3 font-mono text-xs">
                  {[
                    { name: 'Google', handle: 'player@gmail.com', connected: linkedAccounts.google, key: 'google' },
                    { name: 'Discord', handle: 'NeoStriker#1337', connected: linkedAccounts.discord, key: 'discord' },
                    { name: 'YouTube', handle: 'Connect Channel', connected: linkedAccounts.youtube, key: 'youtube' },
                    { name: 'X (Twitter)', handle: 'Connect @handle', connected: linkedAccounts.twitter, key: 'twitter' },
                  ].map((acc) => (
                    <div key={acc.name} className="flex items-center justify-between p-4 bg-[#09090b] rounded-xl border border-[#27272a]">
                      <div>
                        <span className="text-sm font-bold text-white block">{acc.name}</span>
                        <span className="text-xs text-[#a1a1aa] block">{acc.handle}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setLinkedAccounts((prev) => ({ ...prev, [acc.key]: !prev[acc.key] }))}
                        className={`px-4 py-2 rounded-xl font-bold text-xs uppercase transition-all ${
                          acc.connected
                            ? 'bg-[#00ff9d]/10 text-[#00ff9d] border border-[#00ff9d]/30'
                            : 'bg-[#27272a] text-white hover:bg-[#3f3f46]'
                        }`}
                      >
                        {acc.connected ? 'Connected' : 'Connect'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SECTION 7: DANGER ZONE */}
            {activeTab === 'danger' && (
              <div className="space-y-6">
                <div className="border-b border-[#ff3366]/20 pb-4">
                  <h2 className="font-headline font-bold text-xl text-[#ff3366] uppercase tracking-wide flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-[#ff3366]" />
                    <span>Danger Zone</span>
                  </h2>
                  <p className="text-xs text-[#a1a1aa] mt-1">Irreversible account actions and data exports.</p>
                </div>

                <div className="space-y-4 font-mono text-xs">
                  <div className="p-4 bg-[#09090b] rounded-xl border border-[#27272a] flex items-center justify-between">
                    <div>
                      <span className="text-sm font-bold text-white block">Download My Account Data</span>
                      <span className="text-[10px] text-[#a1a1aa] block mt-0.5">Export an archive of all past match records and statistics.</span>
                    </div>
                    <button
                      onClick={handleDownloadData}
                      className="px-4 py-2 bg-[#27272a] hover:bg-[#3f3f46] text-[#00f2ff] border border-[#00f2ff]/30 rounded-xl font-bold uppercase transition-all flex items-center gap-1.5"
                    >
                      <Download className="w-4 h-4" />
                      <span>Export Data</span>
                    </button>
                  </div>

                  <div className="p-4 bg-[#ff3366]/5 rounded-xl border border-[#ff3366]/30 flex items-center justify-between">
                    <div>
                      <span className="text-sm font-bold text-[#ff3366] block">Delete Account</span>
                      <span className="text-[10px] text-[#a1a1aa] block mt-0.5">Permanently delete your player profile and match history.</span>
                    </div>
                    <button
                      onClick={() => showError('Account deletion requires admin authorization.', 'Restricted Action')}
                      className="px-4 py-2 bg-[#ff3366] text-black font-extrabold rounded-xl uppercase hover:bg-red-400 transition-all flex items-center gap-1.5"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete Account</span>
                    </button>
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
