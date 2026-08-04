import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTournaments } from '../contexts/TournamentContext'
import { useToast } from '../contexts/ToastContext'
import { supabase } from '../lib/supabase'
import {
  User,
  Copy,
  Trophy,
  Swords,
  Flame,
  Target,
  Edit3,
  ChevronDown,
  CheckCircle2,
  Medal,
  Award,
  ShieldCheck,
  ArrowRight,
  X,
  Lock,
  Eye,
  EyeOff,
  Gamepad2,
  History,
  Activity,
  Bell,
  Link as LinkIcon,
  Shield
} from 'lucide-react'

export default function ProfilePage() {
  const { user, updateProfile } = useAuth()
  const { tournaments, isUserRegistered } = useTournaments()
  const { showSuccess, showError } = useToast()

  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [usernameInput, setUsernameInput] = useState('')
  const [uidInput, setUidInput] = useState('')
  const [avatarInput, setAvatarInput] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const [activeGameTab, setActiveGameTab] = useState('BGMI')

  // Security & Password Change States
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [passwordStatusMsg, setPasswordStatusMsg] = useState({ type: '', text: '' })

  // Notification Preferences States
  const [notifications, setNotifications] = useState({
    matchAlerts: true,
    resultUpdates: true,
    promotionalOffers: false,
  })

  const displayName = user?.user_metadata?.username || user?.email?.split('@')[0] || 'Neo_Striker'
  const freeFireUid = user?.user_metadata?.freeFireUid || user?.user_metadata?.game_uid || '88472910'
  const avatarUrl =
    user?.user_metadata?.avatar_url ||
    user?.user_metadata?.avatarUrl ||
    'https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&w=400&q=80'

  // Dynamic Password Strength Meter Calculation
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

  const handlePasswordChangeSubmit = async (e) => {
    e.preventDefault()
    setPasswordStatusMsg({ type: '', text: '' })

    if (!currentPassword) {
      setPasswordStatusMsg({ type: 'error', text: 'Current password is required.' })
      return
    }

    if (newPassword.length < 6) {
      setPasswordStatusMsg({ type: 'error', text: 'New password must be at least 6 characters long.' })
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordStatusMsg({ type: 'error', text: 'New password and confirm password do not match.' })
      return
    }

    setIsChangingPassword(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })

      if (error) {
        throw error
      }

      showSuccess('Password updated successfully.', 'Security Updated')
      setPasswordStatusMsg({ type: 'success', text: 'Password updated successfully.' })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      const errMsg = err.message || 'Failed to update password. Please check your credentials.'
      showError(errMsg, 'Security Error')
      setPasswordStatusMsg({ type: 'error', text: errMsg })
    } finally {
      setIsChangingPassword(false)
    }
  }

  // Current active / registered tournaments
  const userRegistrations = useMemo(() => {
    return tournaments.filter((t) =>
      isUserRegistered(t.id, user?.email || user?.id || user?.user_metadata?.username)
    )
  }, [tournaments, isUserRegistered, user])

  const currentTournament = userRegistrations[0] || null

  const handleCopyUid = () => {
    if (!freeFireUid) return
    navigator.clipboard.writeText(freeFireUid)
    showSuccess(`Game UID ${freeFireUid} copied!`, 'Copied')
  }

  const openEditModal = () => {
    setUsernameInput(displayName)
    setUidInput(freeFireUid)
    setAvatarInput(avatarUrl)
    setIsEditModalOpen(true)
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      if (updateProfile) {
        await updateProfile({
          username: usernameInput,
          freeFireUid: uidInput,
          avatar_url: avatarInput,
        })
      }
      showSuccess('Profile updated successfully!', 'Saved')
      setIsEditModalOpen(false)
    } catch (err) {
      showError(err.message || 'Failed to update profile', 'Update Error')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="bg-[#050505] text-white font-body min-h-screen pb-20 antialiased">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-12">

        {/* 1. STITCH HERO PROFILE SECTION */}
        <div className="relative w-full rounded-2xl overflow-hidden border border-[#00f2ff]/20 shadow-[0_0_20px_rgba(0,242,255,0.1)] bg-[#0A0A0A]">
          {/* Cover Background Image */}
          <div
            className="h-64 sm:h-80 w-full bg-cover bg-center opacity-60"
            style={{
              backgroundImage: `url('https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1600&q=80')`,
            }}
          ></div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/80 to-transparent"></div>

          {/* Avatar & Primary Info Floating Overlay */}
          <div className="p-6 sm:p-8 flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10 -mt-24 sm:-mt-28">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 text-center sm:text-left">
              <div className="relative">
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="w-28 h-28 sm:w-36 sm:h-36 rounded-xl border-4 border-[#0A0A0A] object-cover shadow-[0_0_25px_rgba(0,242,255,0.4)]"
                />
                <div className="absolute -bottom-2 -right-2 bg-[#00f2ff] text-black text-xs font-black px-2.5 py-1 rounded-md transform rotate-3 border border-[#0A0A0A] font-headline">
                  PRO
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 justify-center sm:justify-start flex-wrap">
                  <h1 className="text-2xl sm:text-4xl font-headline font-black text-white tracking-tight uppercase">
                    {displayName}
                  </h1>
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-black bg-[#00ff9d]/10 text-[#00ff9d] border border-[#00ff9d]/40 uppercase tracking-widest flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> VERIFIED
                  </span>
                </div>

                <div className="flex items-center gap-2 justify-center sm:justify-start font-mono text-xs text-[#00f2ff]">
                  <span>ID: <strong className="text-white">{freeFireUid}</strong></span>
                  <button onClick={handleCopyUid} title="Copy UID" className="p-1 hover:text-white transition-colors">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <button
                onClick={openEditModal}
                className="w-full md:w-auto px-6 py-2.5 bg-[#00f2ff]/10 hover:bg-[#00f2ff]/20 text-[#00f2ff] border border-[#00f2ff]/30 rounded-lg text-sm font-bold shadow-[0_0_10px_rgba(0,242,255,0.1)] transition-all flex items-center justify-center gap-2 uppercase tracking-wider min-h-[44px]"
              >
                <Edit3 className="w-4 h-4" />
                <span>Edit Profile</span>
              </button>
            </div>
          </div>
        </div>

        {/* 2. STITCH BENTO GRID LAYOUT */}
        <div className="grid grid-cols-12 gap-6">

          {/* Left Column (Current Tier Rank & Global Stats) */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            
            {/* Current Rank Card */}
            <div className="bg-[#141414] rounded-2xl p-6 border border-[#00f2ff]/20 relative overflow-hidden group shadow-xl">
              <h3 className="font-headline font-bold text-xs text-[#A0A0A0] uppercase tracking-wider mb-4">Current Tier</h3>
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 rounded-xl bg-[#00f2ff]/10 border border-[#00f2ff]/40 flex items-center justify-center text-[#00f2ff] shadow-[0_0_15px_rgba(0,242,255,0.2)]">
                  <Trophy className="w-8 h-8 text-[#00f2ff]" />
                </div>
                <div>
                  <div className="text-xl font-black font-headline text-[#00f2ff]">GRANDMASTER I</div>
                  <div className="text-xs text-[#A0A0A0] mt-1">Top 0.5% Global</div>
                </div>
              </div>
              <div className="mt-6">
                <div className="flex justify-between text-xs text-[#A0A0A0] mb-2 font-mono">
                  <span>Season Progress</span>
                  <span className="text-[#00f2ff] font-bold">8,450 / 10,000 RP</span>
                </div>
                <div className="h-2 w-full bg-[#242424] rounded-full overflow-hidden">
                  <div className="h-full bg-[#00f2ff] w-[84.5%] shadow-[0_0_10px_rgba(0,242,255,0.5)]"></div>
                </div>
              </div>
            </div>

            {/* Global Performance Stats */}
            <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#242424] shadow-xl">
              <h3 className="font-headline font-bold text-base mb-6 flex items-center gap-2 text-white">
                <Activity className="w-5 h-5 text-[#00f2ff]" />
                <span>Performance</span>
              </h3>
              <div className="grid grid-cols-2 gap-4 font-mono">
                <div className="bg-[#141414] p-4 rounded-xl border border-[#242424]">
                  <div className="text-[#A0A0A0] text-xs mb-1">Win Rate</div>
                  <div className="text-2xl font-black text-white">68.4%</div>
                </div>
                <div className="bg-[#141414] p-4 rounded-xl border border-[#242424]">
                  <div className="text-[#A0A0A0] text-xs mb-1">K/D Ratio</div>
                  <div className="text-2xl font-black text-[#00ff9d]">4.2</div>
                </div>
                <div className="bg-[#141414] p-4 rounded-xl border border-[#242424]">
                  <div className="text-[#A0A0A0] text-xs mb-1">Matches</div>
                  <div className="text-xl font-bold text-white">1,248</div>
                </div>
                <div className="bg-[#141414] p-4 rounded-xl border border-[#242424]">
                  <div className="text-[#A0A0A0] text-xs mb-1">MVP</div>
                  <div className="text-xl font-bold text-[#fe6b00]">342</div>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column (Games, Trophy Cabinet, Activity Feed) */}
          <div className="col-span-12 lg:col-span-8 space-y-6">

            {/* Game Tabs (BGMI vs Free Fire) */}
            <div className="bg-[#141414] rounded-2xl p-1.5 border border-[#00f2ff]/20 flex gap-2">
              <button
                onClick={() => setActiveGameTab('BGMI')}
                className={`flex-1 py-3 px-6 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                  activeGameTab === 'BGMI'
                    ? 'bg-[#1A1A1A] border border-[#00f2ff]/40 text-[#00f2ff] shadow-[0_0_15px_rgba(0,242,255,0.15)]'
                    : 'text-[#A0A0A0] hover:text-white'
                }`}
              >
                <Gamepad2 className="w-4 h-4" />
                <span>BGMI</span>
              </button>

              <button
                onClick={() => setActiveGameTab('FREE FIRE')}
                className={`flex-1 py-3 px-6 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                  activeGameTab === 'FREE FIRE'
                    ? 'bg-[#1A1A1A] border border-[#fe6b00]/40 text-[#fe6b00] shadow-[0_0_15px_rgba(254,107,0,0.15)]'
                    : 'text-[#A0A0A0] hover:text-white'
                }`}
              >
                <Flame className="w-4 h-4" />
                <span>Free Fire MAX</span>
              </button>
            </div>

            {/* Active Game Details Box */}
            <div className="bg-[#141414] rounded-2xl p-6 border border-[#fe6b00]/30 relative overflow-hidden shadow-xl">
              <div className="flex justify-between items-start mb-6 relative z-10">
                <div>
                  <h3 className="text-xl font-headline font-black text-[#fe6b00]">
                    {activeGameTab === 'BGMI' ? 'BATTLEGROUNDS MOBILE INDIA' : 'FREE FIRE MAX PRO LEAGUE'}
                  </h3>
                  <p className="text-[#A0A0A0] text-xs mt-1">Assaulter / IGL</p>
                </div>
                <div className="text-right font-mono">
                  <div className="text-2xl font-black text-white">Top 500</div>
                  <div className="text-[#fe6b00] text-xs font-bold uppercase tracking-widest">Conqueror Tier</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 relative z-10 font-mono">
                <div className="bg-[#1A1A1A] p-3.5 rounded-xl border border-[#242424]">
                  <div className="text-[10px] text-[#A0A0A0] uppercase mb-1">Headshot %</div>
                  <div className="text-xl font-bold text-white">42.8%</div>
                </div>
                <div className="bg-[#1A1A1A] p-3.5 rounded-xl border border-[#242424]">
                  <div className="text-[10px] text-[#A0A0A0] uppercase mb-1">Avg Survival</div>
                  <div className="text-xl font-bold text-white">18m 42s</div>
                </div>
                <div className="bg-[#1A1A1A] p-3.5 rounded-xl border border-[#242424]">
                  <div className="text-[10px] text-[#A0A0A0] uppercase mb-1">Max Kills</div>
                  <div className="text-xl font-bold text-[#00f2ff]">24</div>
                </div>
              </div>
            </div>

            {/* Trophy Cabinet / Achievements */}
            <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#242424] shadow-xl space-y-4">
              <div className="flex justify-between items-center border-b border-[#242424] pb-3">
                <h3 className="font-headline font-bold text-base flex items-center gap-2 text-white">
                  <Award className="w-5 h-5 text-[#fbbf24]" />
                  <span>Trophy Cabinet & Badges</span>
                </h3>
                <span className="text-xs text-[#00f2ff] font-mono font-bold">4 Unlocked</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-[#141414] rounded-xl p-4 flex flex-col items-center text-center border border-[#fbbf24]/30 hover:border-[#fbbf24] transition-colors">
                  <Trophy className="w-10 h-10 text-[#fbbf24] mb-2" />
                  <div className="text-xs font-bold text-white">Regional Champ</div>
                  <div className="text-[10px] text-[#fbbf24] mt-1 font-mono">Gold Trophy</div>
                </div>

                <div className="bg-[#141414] rounded-xl p-4 flex flex-col items-center text-center border border-slate-400/30 hover:border-slate-300 transition-colors">
                  <ShieldCheck className="w-10 h-10 text-slate-300 mb-2" />
                  <div className="text-xs font-bold text-white">Sniper Elite</div>
                  <div className="text-[10px] text-slate-300 mt-1 font-mono">Silver Medal</div>
                </div>

                <div className="bg-[#141414] rounded-xl p-4 flex flex-col items-center text-center border border-[#fe6b00]/30 hover:border-[#fe6b00] transition-colors">
                  <Flame className="w-10 h-10 text-[#fe6b00] mb-2" />
                  <div className="text-xs font-bold text-white">Survivalist</div>
                  <div className="text-[10px] text-[#fe6b00] mt-1 font-mono">Apex Fragger</div>
                </div>

                <div className="bg-[#141414] rounded-xl p-4 flex flex-col items-center text-center border border-[#00f2ff]/30 hover:border-[#00f2ff] transition-colors">
                  <Medal className="w-10 h-10 text-[#00f2ff] mb-2" />
                  <div className="text-xs font-bold text-white">Fair Play</div>
                  <div className="text-[10px] text-[#00f2ff] mt-1 font-mono">Certified</div>
                </div>
              </div>
            </div>

          </div>

          {/* 3. STITCH ACCOUNT SECURITY & CHANGE PASSWORD SECTION */}
          <div className="col-span-12 bg-[#1A1A1A] border border-[#242424] rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#242424] pb-4">
              <div>
                <h3 className="font-headline font-bold text-lg text-white flex items-center gap-2 uppercase tracking-wide">
                  <Lock className="w-5 h-5 text-[#00f2ff]" />
                  <span>Account Security & Password</span>
                </h3>
                <p className="text-xs text-[#A0A0A0] mt-1">Manage password credentials and authentication protection.</p>
              </div>
              <span className="px-3 py-1 rounded text-xs font-mono font-bold bg-[#00ff9d]/10 text-[#00ff9d] border border-[#00ff9d]/40 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" /> SECURED
              </span>
            </div>

            {passwordStatusMsg.text && (
              <div className={`p-4 rounded-xl border text-xs font-mono flex items-center justify-between gap-2 ${
                passwordStatusMsg.type === 'success'
                  ? 'bg-[#00ff9d]/10 border-[#00ff9d]/40 text-[#00ff9d]'
                  : 'bg-[#ff3366]/10 border-[#ff3366]/40 text-[#ff3366]'
              }`}>
                <span>{passwordStatusMsg.text}</span>
                <button onClick={() => setPasswordStatusMsg({ type: '', text: '' })}>
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <form onSubmit={handlePasswordChangeSubmit} className="space-y-4 font-mono text-xs max-w-xl">
              <div className="space-y-1.5">
                <label className="text-[#A0A0A0] uppercase font-bold block">Current Password *</label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="w-full bg-[#141414] border border-[#242424] rounded-lg pl-3.5 pr-10 py-2.5 text-xs text-white placeholder-[#A0A0A0] focus:border-[#00f2ff] focus:outline-none transition-colors h-[42px]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A0A0A0] hover:text-[#00f2ff] p-1"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[#A0A0A0] uppercase font-bold block">New Password *</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    required
                    className="w-full bg-[#141414] border border-[#242424] rounded-lg pl-3.5 pr-10 py-2.5 text-xs text-white placeholder-[#A0A0A0] focus:border-[#00f2ff] focus:outline-none transition-colors h-[42px]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A0A0A0] hover:text-[#00f2ff] p-1"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {newPassword && (
                  <div className="space-y-1 pt-1">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-[#A0A0A0]">Password Strength:</span>
                      <span className={`font-bold ${
                        passwordStrength.label === 'Strong' ? 'text-[#00ff9d]' : passwordStrength.label === 'Medium' ? 'text-[#fe6b00]' : 'text-[#ff3366]'
                      }`}>
                        {passwordStrength.label}
                      </span>
                    </div>
                    <div className="w-full bg-[#141414] h-1.5 rounded-full overflow-hidden border border-[#242424]">
                      <div className={`h-full transition-all duration-300 ${passwordStrength.color}`} style={{ width: passwordStrength.width }}></div>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-[#A0A0A0] uppercase font-bold block">Confirm New Password *</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    required
                    className="w-full bg-[#141414] border border-[#242424] rounded-lg pl-3.5 pr-10 py-2.5 text-xs text-white placeholder-[#A0A0A0] focus:border-[#00f2ff] focus:outline-none transition-colors h-[42px]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A0A0A0] hover:text-[#00f2ff] p-1"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="px-6 py-2.5 bg-[#00f2ff] text-black font-bold uppercase rounded-lg text-xs hover:bg-cyan-300 transition-all shadow-[0_0_15px_rgba(0,242,255,0.3)] min-h-[44px]"
                >
                  {isChangingPassword ? 'Updating Password...' : 'Save Password Changes'}
                </button>
              </div>
            </form>
          </div>

        </div>

      </main>

      {/* EDIT PROFILE MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#141414] border border-[#00f2ff]/40 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-[#242424] pb-3">
              <h3 className="font-headline text-base font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-[#00f2ff]" />
                <span>EDIT PLAYER PROFILE</span>
              </h3>
              <button onClick={() => setIsEditModalOpen(false)} className="p-1 text-[#A0A0A0] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs font-mono">
              <div className="space-y-1">
                <label className="text-[#A0A0A0] uppercase font-bold block">Display Player Name</label>
                <input
                  type="text"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  className="w-full bg-[#1A1A1A] border border-[#242424] rounded-lg p-2.5 text-xs text-white focus:border-[#00f2ff] focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[#A0A0A0] uppercase font-bold block">Free Fire / Game UID</label>
                <input
                  type="text"
                  value={uidInput}
                  onChange={(e) => setUidInput(e.target.value)}
                  className="w-full bg-[#1A1A1A] border border-[#242424] rounded-lg p-2.5 text-xs text-white focus:border-[#00f2ff] focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[#A0A0A0] uppercase font-bold block">Avatar Photo URL</label>
                <input
                  type="url"
                  value={avatarInput}
                  onChange={(e) => setAvatarInput(e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                  className="w-full bg-[#1A1A1A] border border-[#242424] rounded-lg p-2.5 text-xs text-white focus:border-[#00f2ff] focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3 font-sans">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 bg-[#1A1A1A] border border-[#242424] text-[#A0A0A0] hover:text-white rounded-lg uppercase font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-[#00f2ff] text-black font-bold uppercase rounded-lg text-xs hover:bg-cyan-300 transition-all"
                >
                  {isSaving ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
