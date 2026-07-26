import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTournaments } from '../contexts/TournamentContext'
import { User, Mail, ShieldCheck, Phone, Trophy, Edit3, Trash2, Calendar, Gamepad2, ArrowRight, Save, CheckCircle2, Camera, Upload } from 'lucide-react'
import FormInput from '../components/common/FormInput'
import AuthAlert from '../components/common/AuthAlert'
import AvatarUploadModal from '../components/common/AvatarUploadModal'
import { supabase, isSupabaseConfigured } from '../lib/supabase.js'

export default function DashboardPage() {
  const { user } = useAuth()
  const { tournaments, withdrawTeam } = useTournaments()

  const [profileData, setProfileData] = useState({
    username: user?.user_metadata?.username || user?.email?.split('@')[0] || 'Esports Player',
    freeFireUid: user?.user_metadata?.freeFireUid || '',
    whatsappNumber: user?.user_metadata?.whatsappNumber || '',
  })

  const [avatarUrl, setAvatarUrl] = useState(
    user?.user_metadata?.avatar_url || user?.user_metadata?.avatarUrl || ''
  )

  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [alert, setAlert] = useState(null)
  const [withdrawAlert, setWithdrawAlert] = useState(null)

  // Avatar Upload Modal State
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false)
  const [isAvatarUploading, setIsAvatarUploading] = useState(false)

  const handleProfileChange = (e) => {
    const { name, value } = e.target
    setProfileData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setAlert(null)
    setIsSaving(true)

    try {
      if (isSupabaseConfigured && user) {
        await supabase.auth.updateUser({
          data: {
            username: profileData.username,
            freeFireUid: profileData.freeFireUid,
            whatsappNumber: profileData.whatsappNumber,
            avatar_url: avatarUrl,
          },
        })
      }

      // Update mock storage if offline/mock
      const storedMockUser = localStorage.getItem('mj_esports_mock_user')
      if (storedMockUser) {
        try {
          const parsed = JSON.parse(storedMockUser)
          parsed.user_metadata = { ...parsed.user_metadata, ...profileData, avatar_url: avatarUrl }
          localStorage.setItem('mj_esports_mock_user', JSON.stringify(parsed))
        } catch (err) {
          console.error(err)
        }
      }

      setAlert({ type: 'success', message: 'Profile updated successfully!' })
      setIsEditing(false)
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Failed to update profile' })
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
        const fileExt = croppedFile.name.split('.').pop()
        const filePath = `${user.id}/${Date.now()}.${fileExt}`

        // 1. Try uploading to Supabase Storage bucket 'avatars'
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, croppedFile, { upsert: true })

        if (!uploadError) {
          const { data: publicUrlData } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath)

          if (publicUrlData?.publicUrl) {
            finalUrl = publicUrlData.publicUrl
          }
        } else {
          console.warn('[Supabase Storage Avatar Warning]: Bucket upload failed, falling back to base64 payload.', uploadError.message)
        }

        // 2. Persist avatar_url in auth user metadata
        await supabase.auth.updateUser({
          data: { avatar_url: finalUrl },
        })
      }

      // Update local state and mock storage
      setAvatarUrl(finalUrl)
      const storedMockUser = localStorage.getItem('mj_esports_mock_user')
      if (storedMockUser) {
        try {
          const parsed = JSON.parse(storedMockUser)
          parsed.user_metadata = { ...parsed.user_metadata, avatar_url: finalUrl }
          localStorage.setItem('mj_esports_mock_user', JSON.stringify(parsed))
        } catch (e) {
          console.error(e)
        }
      }

      setAlert({ type: 'success', message: 'Profile picture updated successfully!' })
      setIsAvatarModalOpen(false)
    } catch (err) {
      console.error('[Avatar Upload Error]:', err)
      setAlert({ type: 'error', message: err.message || 'Failed to upload profile picture.' })
    } finally {
      setIsAvatarUploading(false)
    }
  }

  // Filter My Registered Tournaments
  const userIdentifier = user?.email?.toLowerCase() || ''
  const userId = user?.id || ''

  const myTournaments = tournaments.filter((t) => {
    return t.teamsList?.some(
      (team) =>
        (team.email && userIdentifier && team.email.toLowerCase() === userIdentifier) ||
        (team.userId && userId && team.userId === userId) ||
        (team.captain && team.captain.toLowerCase() === profileData.username.toLowerCase())
    )
  })

  const handleWithdraw = async (tournamentId, tournamentTitle) => {
    if (!window.confirm(`Are you sure you want to withdraw your registration from "${tournamentTitle}"?`)) {
      return
    }

    setWithdrawAlert(null)
    try {
      await withdrawTeam(tournamentId, user?.email || profileData.username)
      setWithdrawAlert({ type: 'success', message: `Successfully withdrew registration from ${tournamentTitle}.` })
    } catch (err) {
      setWithdrawAlert({ type: 'error', message: err.message || 'Withdrawal failed.' })
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 sm:space-y-10">
      
      {/* Header Banner with Profile Avatar Upload Trigger */}
      <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-5 sm:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-2xl relative overflow-hidden">
        <div className="flex items-center gap-5">
          
          {/* Circular Profile Avatar Image Frame */}
          <div
            onClick={() => setIsAvatarModalOpen(true)}
            className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#00f2ff]/20 border-2 border-[#00f2ff] flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(0,242,255,0.4)] cursor-pointer group overflow-hidden"
            title="Click to change profile picture"
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={profileData.username}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
              />
            ) : (
              <User className="w-8 h-8 sm:w-10 sm:h-10 text-[#00f2ff]" />
            )}

            {/* Hover Camera Overlay Badge */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white">
              <Camera className="w-5 h-5 text-[#00f2ff]" />
              <span className="text-[9px] font-extrabold uppercase tracking-widest mt-0.5">Edit</span>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display-lg text-xl sm:text-3xl font-extrabold text-white uppercase">{profileData.username}</h1>
              <span className="px-2.5 py-0.5 rounded text-[10px] font-extrabold bg-[#00ff9d]/10 text-[#00ff9d] border border-[#00ff9d]/40 uppercase tracking-widest">
                PRO PLAYER DASHBOARD
              </span>
            </div>
            <p className="text-xs text-[#8e9dae] flex items-center gap-1.5 mt-1 font-mono">
              <Mail className="w-3.5 h-3.5 text-[#00f2ff]" />
              <span>{user?.email || 'player@example.com'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={() => setIsAvatarModalOpen(true)}
            className="flex-1 md:flex-initial px-4 py-2.5 bg-[#07090c] hover:bg-[#1d232c] border border-[#3a494b] text-xs font-bold text-[#e1e2e7] hover:text-[#00f2ff] rounded transition-colors flex items-center justify-center gap-2 uppercase tracking-wider min-h-[44px]"
          >
            <Upload className="w-4 h-4 text-[#00f2ff]" />
            <span>Upload Photo</span>
          </button>

          <button
            onClick={() => setIsEditing(!isEditing)}
            className="flex-1 md:flex-initial px-4 py-2.5 bg-[#07090c] hover:bg-[#1d232c] border border-[#3a494b] text-xs font-bold text-[#00f2ff] rounded transition-colors flex items-center justify-center gap-2 uppercase tracking-wider min-h-[44px]"
          >
            <Edit3 className="w-4 h-4" />
            <span>{isEditing ? 'Cancel Editing' : 'Edit Profile'}</span>
          </button>
        </div>
      </div>

      {alert && <AuthAlert type={alert.type} message={alert.message} />}

      {/* Avatar Upload Modal Component */}
      <AvatarUploadModal
        isOpen={isAvatarModalOpen}
        onClose={() => setIsAvatarModalOpen(false)}
        onSave={handleAvatarSave}
        isUploading={isAvatarUploading}
      />

      {/* Inline Profile Editing Form */}
      {isEditing && (
        <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-5 sm:p-8 space-y-6 shadow-2xl">
          <h3 className="font-display-lg text-lg font-bold text-white flex items-center gap-2 uppercase">
            <Edit3 className="w-5 h-5 text-[#00f2ff]" />
            <span>Update Player Information</span>
          </h3>

          <form onSubmit={handleSaveProfile} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormInput
              label="Player Handle / Username"
              name="username"
              value={profileData.username}
              onChange={handleProfileChange}
              required
              icon={User}
            />

            <FormInput
              label="Free Fire UID"
              name="freeFireUid"
              value={profileData.freeFireUid}
              onChange={handleProfileChange}
              placeholder="e.g. 518920412"
              icon={ShieldCheck}
            />

            <FormInput
              label="WhatsApp Number"
              name="whatsappNumber"
              value={profileData.whatsappNumber}
              onChange={handleProfileChange}
              placeholder="e.g. +91 9876543210"
              icon={Phone}
            />

            <div className="sm:col-span-3 text-right">
              <button
                type="submit"
                disabled={isSaving}
                className="btn-cyber-primary ml-auto shadow-lg"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Saving...' : 'Save Profile Changes'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Profile Details Cards */}
      {!isEditing && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-5 space-y-2">
            <span className="font-label-caps text-[10px] text-[#8e9dae] uppercase block">Game Handle</span>
            <div className="text-sm font-bold text-[#00f2ff] flex items-center gap-2">
              <Gamepad2 className="w-4 h-4 text-[#00f2ff]" />
              <span>{profileData.username}</span>
            </div>
          </div>

          <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-5 space-y-2">
            <span className="font-label-caps text-[10px] text-[#8e9dae] uppercase block">Free Fire Character UID</span>
            <div className="font-mono text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#00ff9d]" />
              <span>{profileData.freeFireUid || 'Not configured'}</span>
            </div>
          </div>

          <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-5 space-y-2">
            <span className="font-label-caps text-[10px] text-[#8e9dae] uppercase block">WhatsApp Contact</span>
            <div className="font-mono text-sm font-bold text-[#e1e2e7] flex items-center gap-2">
              <Phone className="w-4 h-4 text-[#00ff9d]" />
              <span>{profileData.whatsappNumber || 'Not configured'}</span>
            </div>
          </div>
        </div>
      )}

      {/* My Registered Tournaments Section */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#3a494b]/60 pb-4">
          <div className="space-y-1">
            <h2 className="font-display-lg text-xl sm:text-2xl font-extrabold text-white uppercase tracking-tight flex items-center gap-2.5">
              <Trophy className="w-6 h-6 text-[#fe6b00]" />
              <span>MY REGISTERED TOURNAMENTS</span>
            </h2>
            <p className="text-xs text-[#8e9dae]">
              Manage your active tournament slot bookings, view upcoming match details, and check your standings.
            </p>
          </div>

          <span className="px-3 py-1 rounded bg-[#00f2ff]/10 text-[#00f2ff] border border-[#00f2ff]/30 text-xs font-mono font-bold w-fit">
            {myTournaments.length} Active Bookings
          </span>
        </div>

        {withdrawAlert && <AuthAlert type={withdrawAlert.type} message={withdrawAlert.message} />}

        {/* Tournament Cards or Friendly Empty State */}
        {myTournaments.length === 0 ? (
          <div className="bg-[#151a21] border border-[#3a494b] rounded-xl p-8 sm:p-12 text-center space-y-4 max-w-xl mx-auto shadow-xl">
            <div className="w-16 h-16 rounded-full bg-[#07090c] border border-[#3a494b] flex items-center justify-center mx-auto text-[#00f2ff]">
              <Trophy className="w-8 h-8 text-[#8e9dae]" />
            </div>
            <div className="space-y-2">
              <h3 className="font-display-lg text-lg sm:text-xl font-bold text-white uppercase">No registrations found.</h3>
              <p className="text-[#8e9dae] text-xs leading-relaxed max-w-md mx-auto">
                You haven't booked a slot in any active Free Fire or BGMI tournaments yet. Explore available competitions and enter your squad today!
              </p>
            </div>
            <Link
              to="/tournaments"
              className="btn-cyber-primary"
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
                  className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-5 sm:p-6 space-y-6 shadow-xl flex flex-col justify-between hover:border-[#00f2ff] transition-all"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wide bg-[#00f2ff]/10 text-[#00f2ff] border border-[#00f2ff]/30">
                        {t.game}
                      </span>
                      
                      <span className="px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-[#00ff9d]/10 text-[#00ff9d] border border-[#00ff9d]/40 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Registration Confirmed</span>
                      </span>
                    </div>

                    <h3 className="font-display-lg text-lg sm:text-xl font-bold text-white uppercase">{t.title}</h3>
                    <p className="text-xs text-[#8e9dae]">{t.format} &bull; Organized by {t.organizer || 'MJ ESPORTS'}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs bg-[#07090c] p-3 rounded border border-[#3a494b]/60">
                    <div>
                      <span className="font-label-caps text-[#8e9dae] text-[10px] uppercase block">Start Date</span>
                      <span className="text-[#e1e2e7] font-bold flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3.5 h-3.5 text-[#00f2ff]" />
                        {t.startDate}
                      </span>
                    </div>
                    <div>
                      <span className="font-label-caps text-[#8e9dae] text-[10px] uppercase block">Prize Pool</span>
                      <span className="font-mono text-[#ffb693] font-extrabold">{t.prizePool}</span>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between gap-3 border-t border-[#3a494b]/60">
                    <Link
                      to={`/tournaments/${t.id}`}
                      className="px-4 py-2.5 rounded bg-[#00f2ff] text-[#00363a] font-extrabold text-xs hover:bg-[#74f5ff] transition-all flex items-center gap-1.5 uppercase tracking-wider min-h-[38px]"
                    >
                      <span>View Details</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>

                    {canWithdraw ? (
                      <button
                        onClick={() => handleWithdraw(t.id, t.title)}
                        className="px-3.5 py-2.5 rounded bg-[#07090c] hover:bg-red-950/40 border border-[#3a494b] hover:border-[#ff3366] text-xs font-bold text-[#8e9dae] hover:text-[#ff3366] transition-colors flex items-center gap-1.5 uppercase min-h-[38px]"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-[#ff3366]" />
                        <span>Withdraw</span>
                      </button>
                    ) : (
                      <span className="font-label-caps text-[10px] text-[#8e9dae] uppercase tracking-wider">
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
