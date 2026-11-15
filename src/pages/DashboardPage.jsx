import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTournaments } from '../contexts/TournamentContext'
import {
  User,
  Mail,
  ShieldCheck,
  Phone,
  Trophy,
  Edit3,
  Trash2,
  Calendar,
  Gamepad2,
  ArrowRight,
  Save,
  CheckCircle2,
  Camera,
  Upload,
  Share2,
  Download,
  TrendingUp,
  Flame,
  DollarSign,
  Radio,
  Clock
} from 'lucide-react'
import { useToast } from '../contexts/ToastContext'
import FormInput from '../components/common/FormInput'
import AuthAlert from '../components/common/AuthAlert'
import AvatarUploadModal from '../components/common/AvatarUploadModal'
import LoadingButton from '../components/common/LoadingButton'
import { isValidGameUid, isValidPhoneNumber, sanitizeString, sanitizeDigitsOnly } from '../utils/validationUtils'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { uploadAvatarFile } from '../services/avatarService'

export default function DashboardPage() {
  const { user } = useAuth()
  const { tournaments, withdrawTeam } = useTournaments()
  const { showSuccess, showError } = useToast()

  const [profileData, setProfileData] = useState({
    username: user?.user_metadata?.username || user?.email?.split('@')[0] || 'Esports Player',
    freeFireUid: user?.user_metadata?.freeFireUid || '',
    whatsappNumber: user?.user_metadata?.whatsappNumber || '',
  })
  const [profileErrors, setProfileErrors] = useState({})

  const [avatarUrl, setAvatarUrl] = useState(
    user?.user_metadata?.avatar_url || user?.user_metadata?.avatarUrl || ''
  )

  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [withdrawingId, setWithdrawingId] = useState(null)
  const [alert, setAlert] = useState(null)
  const [withdrawAlert, setWithdrawAlert] = useState(null)

  // Avatar Upload Modal State
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false)
  const [isAvatarUploading, setIsAvatarUploading] = useState(false)

  const handleProfileChange = (e) => {
    const { name, value } = e.target
    const finalValue = (name === 'freeFireUid' || name === 'whatsappNumber')
      ? sanitizeDigitsOnly(value, 10)
      : value

    setProfileData((prev) => ({ ...prev, [name]: finalValue }))
    if (profileErrors[name]) {
      setProfileErrors((prev) => ({ ...prev, [name]: null }))
    }
  }

  const validateProfile = () => {
    const newErrors = {}
    const cleanUsername = (profileData.username || '').trim()
    const cleanUid = sanitizeString(profileData.freeFireUid)
    const cleanPhone = sanitizeString(profileData.whatsappNumber)

    if (!cleanUsername) {
      newErrors.username = 'Username is required.'
    } else if (cleanUsername.length > 50) {
      newErrors.username = 'Username cannot exceed 50 characters.'
    }

    if (cleanUid && !isValidGameUid(cleanUid)) {
      newErrors.freeFireUid = 'Game UID must be exactly 10 numeric digits (0-9)'
    }

    if (cleanPhone && !isValidPhoneNumber(cleanPhone)) {
      newErrors.whatsappNumber = 'Please enter a valid 10-digit phone number'
    }

    setProfileErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setAlert(null)

    if (!validateProfile() || isSaving) return

    setIsSaving(true)

    const cleanUsername = (profileData.username || '').trim()
    const cleanUid = sanitizeString(profileData.freeFireUid)
    const cleanPhone = sanitizeString(profileData.whatsappNumber)

    try {
      if (isSupabaseConfigured && user) {
        const { data: existingUsernames, error: checkError } = await supabase
          .from('public_profiles')
          .select('id, username')
          .ilike('username', cleanUsername.replace(/[%_\\]/g, '\\$&'))
          .neq('id', user.id)

        if (checkError) {
          console.warn('[Username Uniqueness Check Warning]:', checkError)
        }

        if (existingUsernames && existingUsernames.length > 0) {
          setProfileErrors((prev) => ({
            ...prev,
            username: 'Username is already taken by another player.',
          }))
          setAlert({
            type: 'error',
            message: 'Username is already taken by another player.',
          })
          setIsSaving(false)
          return
        }

        await supabase.auth.updateUser({
          data: {
            username: cleanUsername,
            freeFireUid: cleanUid,
            whatsappNumber: cleanPhone,
            avatar_url: avatarUrl,
          },
        })

        try {
          await supabase.from('profiles').upsert(
            {
              id: user.id,
              username: cleanUsername,
              game_uid: cleanUid,
              avatar_url: avatarUrl,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'id' }
          )
        } catch (dbEx) {
          console.warn('[Dashboard Profile DB Exception]:', dbEx)
        }
      }

      setAlert({ type: 'success', message: 'Profile updated successfully!' })
      showSuccess('Profile Updated Successfully', 'Profile Updated')
      setIsEditing(false)
    } catch (err) {
      console.error('[Profile Update Error]:', err)
      setAlert({ type: 'error', message: err.message || 'Failed to update profile' })
      showError(err, 'Profile Update Error')
    } finally {
      setIsSaving(false)
    }
  }

  const handleAvatarSave = async (croppedFile, croppedDataUrl) => {
    setIsAvatarUploading(true)
    setAlert(null)

    let finalUrl = croppedDataUrl

    try {
      if (isSupabaseConfigured && user) {
        const result = await uploadAvatarFile(croppedFile, user.id, croppedDataUrl)
        finalUrl = result.publicUrl
      }

      setAvatarUrl(finalUrl)
      setAlert({ type: 'success', message: 'Profile picture updated successfully!' })
      showSuccess('Profile Updated Successfully', 'Avatar Updated')
      setIsAvatarModalOpen(false)
    } catch (err) {
      const rawErrorMessage = err?.message || String(err)
      setAlert({ type: 'error', message: rawErrorMessage })
      showError(rawErrorMessage, 'Avatar Upload Error')
    } finally {
      setIsAvatarUploading(false)
    }
  }

  // Filter My Registered Tournaments
  const userIdentifier = user?.email?.toLowerCase() || ''
  const userId = user?.id || ''

  const myTournaments = useMemo(() => {
    return tournaments.filter((t) => {
      return t.teamsList?.some(
        (team) =>
          (team.email && userIdentifier && team.email.toLowerCase() === userIdentifier) ||
          (team.userId && userId && team.userId === userId) ||
          (team.captain && team.captain.toLowerCase() === profileData.username.toLowerCase())
      )
    })
  }, [tournaments, userIdentifier, userId, profileData.username])

  const handleWithdraw = async (tournamentId, tournamentTitle) => {
    if (withdrawingId) return
    if (!window.confirm(`Are you sure you want to withdraw your registration from "${tournamentTitle}"?`)) {
      return
    }

    setWithdrawAlert(null)
    setWithdrawingId(tournamentId)
    try {
      await withdrawTeam(tournamentId, user?.email || profileData.username)
      setWithdrawAlert({ type: 'success', message: `Successfully withdrew registration from ${tournamentTitle}.` })
      showSuccess(`Withdrew registration from ${tournamentTitle}.`, 'Registration Withdrawn')
    } catch (err) {
      setWithdrawAlert({ type: 'error', message: err.message || 'Withdrawal failed.' })
      showError(err, 'Withdrawal Error')
    } finally {
      setWithdrawingId(null)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 bg-[#000000] text-[#FFFFFF] font-body antialiased min-h-screen">
      
      {/* 1. STITCH DASHBOARD HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-[#27272A]/60">
        <div>
          <h1 className="font-headline text-3xl font-bold text-white tracking-tight">Overview Dashboard</h1>
          <p className="text-[#A1A1AA] text-sm mt-1">Season 14 Performance & Statistics</p>
        </div>
        <div className="flex gap-3">
          <button
            className="px-4 py-2 bg-[#18181B] hover:bg-[#27272A] rounded-none text-sm font-medium flex items-center gap-2 transition-colors border border-[#27272A]"
          >
            <Share2 className="w-4 h-4 text-[#A1A1AA]" />
            <span>Share Stats</span>
          </button>
          <button
            className="px-4 py-2 bg-[#FFB900]/10 text-[#FFB900] border border-[#FFB900]/30 hover:bg-[#FFB900]/20 rounded-none text-sm font-bold flex items-center gap-2 transition-colors"
          >
            <Download className="w-4 h-4 text-[#FFB900]" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {alert && <AuthAlert type={alert.type} message={alert.message} />}

      {/* 2. STITCH PERFORMANCE BENTO GRID & NEXT MATCH WIDGET */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Performance Metrics (Top Row, 8 cols) */}
        <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
          {/* Win Rate */}
          <div className="bg-[#18181B] rounded-none p-5 border border-[#27272A] relative overflow-hidden group shadow-lg">
            <div className="flex items-center gap-3 mb-4 text-[#A1A1AA]">
              <TrendingUp className="w-5 h-5 text-[#FFB900]" />
              <span className="text-sm font-label font-medium uppercase tracking-wider">Win Rate</span>
            </div>
            <div className="flex items-end gap-2">
              <span className="font-headline text-4xl font-bold text-white">68.4%</span>
              <span className="text-[#10B981] text-sm font-medium flex items-center mb-1">
                +2.1%
              </span>
            </div>
            <div className="w-full bg-[#27272A] h-1.5 rounded-none mt-4 overflow-hidden">
              <div className="bg-[#FFB900] h-full rounded-none" style={{ width: '68.4%' }}></div>
            </div>
          </div>

          {/* K/D Ratio */}
          <div className="bg-[#18181B] rounded-none p-5 border border-[#27272A] relative overflow-hidden group shadow-lg">
            <div className="flex items-center gap-3 mb-4 text-[#A1A1AA]">
              <Flame className="w-5 h-5 text-[#FF8C00]" />
              <span className="text-sm font-label font-medium uppercase tracking-wider">K/D Ratio</span>
            </div>
            <div className="flex items-end gap-2">
              <span className="font-headline text-4xl font-bold text-white">3.24</span>
              <span className="text-[#10B981] text-sm font-medium flex items-center mb-1">
                +0.15
              </span>
            </div>
            <p className="text-xs text-[#A1A1AA] mt-4 font-mono">1,492 KILLS / 460 DEATHS</p>
          </div>

          {/* Total Earnings */}
          <div className="bg-[#18181B] rounded-none p-5 border border-[#27272A] relative overflow-hidden group shadow-lg">
            <div className="flex items-center gap-3 mb-4 text-[#A1A1AA]">
              <DollarSign className="w-5 h-5 text-[#10B981]" />
              <span className="text-sm font-label font-medium uppercase tracking-wider">Earnings</span>
            </div>
            <div className="flex items-end gap-2">
              <span className="font-headline text-4xl font-bold text-white">₹1.2L+</span>
            </div>
            <p className="text-xs text-[#A1A1AA] mt-4 font-mono">Top 5% in Region</p>
          </div>
        </div>

        {/* Upcoming Match Widget (4 cols) */}
        <div className="md:col-span-4 bg-[#111215] rounded-none p-6 border border-[#27272A] relative overflow-hidden shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-[#FF8C00]">
              <Radio className="w-4 h-4 text-[#FF8C00] animate-pulse" />
              <span className="text-sm font-bold uppercase tracking-wider font-headline">Next Match</span>
            </div>
            <span className="px-2 py-1 bg-[#27272A] rounded-none text-xs font-mono text-[#A1A1AA] border border-[#27272A]">BO3</span>
          </div>

          <div className="flex justify-between items-center my-4">
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-none bg-[#FFB900]/20 flex items-center justify-center border-2 border-[#FFB900]/50 ">
                <span className="font-bold text-[#FFB900]">MJ</span>
              </div>
              <span className="text-xs font-bold text-white">{profileData.username}</span>
            </div>
            <div className="text-center px-4">
              <span className="text-[#A1A1AA] font-bold text-lg">VS</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-none bg-[#27272A] flex items-center justify-center border-2 border-[#18181B]">
                <span className="font-bold text-[#FF8C00]">TX</span>
              </div>
              <span className="text-xs font-bold text-white">Team X</span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-[#27272A] text-center">
            <p className="text-[10px] text-[#A1A1AA] mb-2 font-label uppercase tracking-widest">MATCH STARTS IN</p>
            <div className="flex justify-center gap-3 font-mono text-xl font-bold text-white">
              <div className="flex flex-col"><span className="text-[#FF8C00]">02</span><span className="text-[9px] text-[#A1A1AA]">HRS</span></div>
              <span className="text-[#A1A1AA]/50">:</span>
              <div className="flex flex-col"><span>45</span><span className="text-[9px] text-[#A1A1AA]">MIN</span></div>
              <span className="text-[#A1A1AA]/50">:</span>
              <div className="flex flex-col"><span>12</span><span className="text-[9px] text-[#A1A1AA]">SEC</span></div>
            </div>
          </div>
        </div>

      </div>

      {/* 3. PLAYER PROFILE DETAILS & AVATAR CARD */}
      <div className="bg-[#111215] border border-[#27272A] rounded-none p-5 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl">
        <div className="flex flex-col xs:flex-row items-start xs:items-center gap-4 sm:gap-5 w-full md:w-auto">
          <div
            onClick={() => setIsAvatarModalOpen(true)}
            className="relative w-14 h-14 sm:w-20 sm:h-20 rounded-none bg-[#FFB900]/20 border-2 border-[#FFB900] flex items-center justify-center shrink-0  cursor-pointer group overflow-hidden"
            title="Click to change profile picture"
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={profileData.username}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
              />
            ) : (
              <User className="w-7 h-7 sm:w-10 sm:h-10 text-[#FFB900]" />
            )}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white">
              <Camera className="w-4 h-4 sm:w-5 sm:h-5 text-[#FFB900]" />
              <span className="text-[8px] sm:text-[9px] font-extrabold uppercase tracking-widest mt-0.5">Edit</span>
            </div>
          </div>

          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-headline text-lg sm:text-2xl font-extrabold text-white uppercase truncate">{profileData.username}</h2>
              <span className="px-2.5 py-0.5 rounded-none text-[10px] font-extrabold bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/40 uppercase tracking-widest shrink-0">
                VERIFIED PRO
              </span>
            </div>
            <p className="text-xs text-[#A1A1AA] flex items-center gap-1.5 mt-1 font-mono">
              <Mail className="w-3.5 h-3.5 text-[#FFB900] shrink-0" />
              <span>{user?.email || 'player@example.com'}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-col xs:flex-row items-center gap-2.5 sm:gap-3 w-full md:w-auto">
          <button
            onClick={() => setIsAvatarModalOpen(true)}
            className="w-full xs:w-auto flex-1 md:flex-initial px-4 py-2.5 bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] text-xs font-bold text-[#FFFFFF] hover:text-[#FFB900] rounded-none transition-colors flex items-center justify-center gap-2 uppercase tracking-wider min-h-[44px]"
          >
            <Upload className="w-4 h-4 text-[#FFB900]" />
            <span>Upload Photo</span>
          </button>

          <button
            onClick={() => setIsEditing(!isEditing)}
            className="w-full xs:w-auto flex-1 md:flex-initial px-4 py-2.5 bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] text-xs font-bold text-[#FFB900] rounded-none transition-colors flex items-center justify-center gap-2 uppercase tracking-wider min-h-[44px]"
          >
            <Edit3 className="w-4 h-4" />
            <span>{isEditing ? 'Cancel Editing' : 'Edit Profile'}</span>
          </button>
        </div>
      </div>

      <AvatarUploadModal
        isOpen={isAvatarModalOpen}
        onClose={() => setIsAvatarModalOpen(false)}
        onSave={handleAvatarSave}
        isUploading={isAvatarUploading}
      />

      {/* Inline Profile Editing Form */}
      {isEditing && (
        <div className="bg-[#111215] border border-[#27272A] rounded-none p-5 sm:p-8 space-y-6 shadow-2xl">
          <h3 className="font-headline text-lg font-bold text-white flex items-center gap-2 uppercase">
            <Edit3 className="w-5 h-5 text-[#FFB900]" />
            <span>Update Player Information</span>
          </h3>

          <form onSubmit={handleSaveProfile} noValidate className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormInput
              label="Player Handle / Username"
              name="username"
              value={profileData.username}
              onChange={handleProfileChange}
              required
              error={profileErrors.username}
              icon={User}
            />

            <FormInput
              label="Free Fire UID"
              name="freeFireUid"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={10}
              showCount
              value={profileData.freeFireUid}
              onChange={handleProfileChange}
              placeholder="0123456789"
              error={profileErrors.freeFireUid}
              icon={ShieldCheck}
            />

            <FormInput
              label="WhatsApp Number"
              name="whatsappNumber"
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={10}
              showCount
              prefix="+91"
              value={profileData.whatsappNumber}
              onChange={handleProfileChange}
              placeholder="9876543210"
              error={profileErrors.whatsappNumber}
              icon={Phone}
            />

            <div className="sm:col-span-3 text-right">
              <LoadingButton
                type="submit"
                loading={isSaving}
                loadingText="Saving..."
                icon={Save}
                className="ml-auto shadow-lg"
              >
                Save Profile Changes
              </LoadingButton>
            </div>
          </form>
        </div>
      )}

      {/* 4. MY REGISTERED TOURNAMENTS SECTION */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#27272A] pb-4">
          <div className="space-y-1">
            <h2 className="font-headline text-xl sm:text-2xl font-extrabold text-white uppercase tracking-tight flex items-center gap-2.5">
              <Trophy className="w-6 h-6 text-[#FF8C00]" />
              <span>MY REGISTERED TOURNAMENTS</span>
            </h2>
            <p className="text-xs text-[#A1A1AA]">
              Manage your active tournament slot bookings, view match details, and manage registrations.
            </p>
          </div>

          <span className="px-3 py-1 rounded-none bg-[#FFB900]/10 text-[#FFB900] border border-[#FFB900]/30 text-xs font-mono font-bold w-fit">
            {myTournaments.length} Active Bookings
          </span>
        </div>

        {withdrawAlert && <AuthAlert type={withdrawAlert.type} message={withdrawAlert.message} />}

        {myTournaments.length === 0 ? (
          <div className="bg-[#111215] border border-[#27272A] rounded-none p-8 sm:p-12 text-center space-y-4 max-w-xl mx-auto shadow-xl">
            <div className="w-16 h-16 rounded-none bg-[#18181B] border border-[#27272A] flex items-center justify-center mx-auto text-[#FFB900]">
              <Trophy className="w-8 h-8 text-[#A1A1AA]" />
            </div>
            <div className="space-y-2">
              <h3 className="font-headline text-lg sm:text-xl font-bold text-white uppercase tracking-wider">No active tournament bookings found.</h3>
              <p className="text-[#A1A1AA] text-xs leading-relaxed max-w-md mx-auto">
                Explore open esports competitions and reserve your squad slot today!
              </p>
            </div>
            <Link
              to="/tournaments"
              className="px-6 py-3 rounded-none bg-[#FFB900] text-[#000000] font-headline font-bold text-xs hover:bg-[#FFC933] transition-all inline-flex items-center gap-2 uppercase tracking-wider shadow-lg"
            >
              <span>Browse Open Tournaments</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {myTournaments.map((t) => {
              const canWithdraw = t.status === 'Registration Open'
              return (
                <div
                  key={`my-tourney-${t.id}`}
                  className="bg-[#111215] border border-[#27272A] rounded-none p-5 sm:p-6 space-y-6 shadow-xl flex flex-col justify-between hover:border-[#FFB900] transition-all"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-1 rounded-none text-[10px] font-bold uppercase tracking-wide bg-[#FFB900]/10 text-[#FFB900] border border-[#FFB900]/30 font-headline">
                        {t.game}
                      </span>
                      
                      <span className="px-2.5 py-1 rounded-none text-[10px] font-bold uppercase tracking-wider bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/40 flex items-center gap-1 font-mono">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Registration Confirmed</span>
                      </span>
                    </div>

                    <h3 className="font-headline text-lg sm:text-xl font-bold text-white uppercase">{t.title}</h3>
                    <p className="text-xs text-[#A1A1AA]">{t.format} &bull; Organized by {t.organizer || 'MJ ESPORTS'}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs bg-[#18181B] p-3 rounded-none border border-[#27272A]">
                    <div>
                      <span className="text-[#A1A1AA] text-[10px] uppercase block font-label">Start Date</span>
                      <span className="text-white font-bold flex items-center gap-1 mt-0.5 font-mono">
                        <Calendar className="w-3.5 h-3.5 text-[#FFB900]" />
                        {t.startDate}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#A1A1AA] text-[10px] uppercase block font-label">Prize Pool</span>
                      <span className="font-mono text-[#FF8C00] font-extrabold">{t.prizePool}</span>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between gap-3 border-t border-[#27272A]">
                    <Link
                      to={t?.id ? `/tournaments/${t.id}` : '/tournaments'}
                      className="px-4 py-2.5 rounded-none bg-[#FFB900] text-[#000000] font-headline font-bold text-xs hover:bg-[#FFC933] transition-all flex items-center gap-1.5 uppercase tracking-wider min-h-[38px]"
                    >
                      <span>View Details</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>

                    {canWithdraw ? (
                      <button
                        onClick={() => handleWithdraw(t.id, t.title)}
                        className="px-3.5 py-2.5 rounded-none bg-[#18181B] hover:bg-red-950/40 border border-[#27272A] hover:border-[#EF4444] text-xs font-bold text-[#A1A1AA] hover:text-[#EF4444] transition-colors flex items-center gap-1.5 uppercase min-h-[38px]"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-[#EF4444]" />
                        <span>Withdraw</span>
                      </button>
                    ) : (
                      <span className="text-[10px] text-[#A1A1AA] uppercase tracking-wider font-mono">
                        Withdraw Closed
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

    </div>
  )
}
