import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { uploadAvatarFile } from '../services/avatarService'
import {
  User,
  ArrowLeft,
  Camera,
  Save,
  Link2,
  MessageSquare,
  FileText,
  Gamepad2,
  Trash2
} from 'lucide-react'
import FormInput from '../components/common/FormInput'
import AuthAlert from '../components/common/AuthAlert'
import LoadingButton from '../components/common/LoadingButton'
import AvatarUploadModal from '../components/common/AvatarUploadModal'
import { isValidGameUid, sanitizeString } from '../utils/validationUtils'

export default function EditProfilePage() {
  const { user, updateProfile } = useAuth()
  const { showSuccess, showError } = useToast()
  const navigate = useNavigate()

  // Load existing profile meta
  const meta = user?.user_metadata || {}
  
  const [formData, setFormData] = useState({
    username: meta.username || user?.email?.split('@')[0] || 'Neo_Striker',
    freeFireUid: meta.freeFireUid || meta.free_fire_uid || meta.game_uid || '',
    bgmiUid: meta.bgmiUid || meta.bgmi_uid || '',
    instagram: meta.instagram || '',
    whatsappChannel: meta.whatsappChannel || meta.whatsapp_channel || '',
    bio: meta.bio || '',
  })

  const [avatarUrl, setAvatarUrl] = useState(
    meta.avatar_url ||
    meta.avatarUrl ||
    'https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&w=400&q=80'
  )

  const [errors, setErrors] = useState({})
  const [isSaving, setIsSaving] = useState(false)
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false)
  const [isAvatarUploading, setIsAvatarUploading] = useState(false)
  const [alert, setAlert] = useState(null)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }))
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
      setAlert({ type: 'success', message: 'Profile photo updated successfully!' })
      showSuccess('Profile Updated Successfully', 'Avatar Saved')
      setIsAvatarModalOpen(false)
    } catch (err) {
      const errMsg = err?.message || String(err)
      setAlert({ type: 'error', message: errMsg })
      showError(errMsg, 'Upload Failed')
    } finally {
      setIsAvatarUploading(false)
    }
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setAlert(null)
    const errs = {}

    const cleanUsername = formData.username.trim()
    const cleanFreeFireUid = sanitizeString(formData.freeFireUid)
    const cleanBgmiUid = sanitizeString(formData.bgmiUid)
    const cleanInstagram = formData.instagram.trim()
    const cleanWhatsapp = formData.whatsappChannel.trim()
    const cleanBio = formData.bio.trim()

    if (!cleanUsername) {
      errs.username = 'Player display name is required.'
    }

    if (cleanFreeFireUid && !isValidGameUid(cleanFreeFireUid)) {
      errs.freeFireUid = 'Free Fire UID must be between 5 and 15 digits.'
    }

    if (cleanBgmiUid && !isValidGameUid(cleanBgmiUid)) {
      errs.bgmiUid = 'BGMI UID must be between 5 and 15 digits.'
    }

    if (cleanInstagram && !cleanInstagram.startsWith('@')) {
      errs.instagram = 'Instagram handle must start with @'
    }

    if (cleanWhatsapp && !cleanWhatsapp.startsWith('https://')) {
      errs.whatsappChannel = 'WhatsApp Channel must be a valid URL (https://...)'
    }

    if (cleanBio.length > 200) {
      errs.bio = 'Bio description must not exceed 200 characters.'
    }

    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    setIsSaving(true)

    try {
      if (isSupabaseConfigured && user) {
        // Check username uniqueness via RPC
        const { data: isAvailable, error: checkError } = await supabase.rpc(
          'check_username_available',
          {
            p_username: cleanUsername,
            p_exclude_user_id: user.id,
          }
        )

        if (checkError) {
          console.warn('[Username uniqueness warning]:', checkError.message)
        }

        if (isAvailable === false) {
          setErrors((prev) => ({ ...prev, username: 'Player name is already taken.' }))
          setAlert({ type: 'error', message: 'Display Name is taken. Choose another name.' })
          setIsSaving(false)
          return
        }

        // 1. Update auth metadata & context state
        await updateProfile({
          username: cleanUsername,
          freeFireUid: cleanFreeFireUid,
          bgmiUid: cleanBgmiUid,
          instagram: cleanInstagram,
          whatsappChannel: cleanWhatsapp,
          bio: cleanBio,
          avatar_url: avatarUrl,
        })

        // 2. Update profiles table if configured
        if (isSupabaseConfigured) {
          try {
            const { error: dbErr } = await supabase.from('profiles').upsert(
              {
                id: user.id,
                username: cleanUsername,
                game_uid: cleanFreeFireUid, // Free Fire UID defaults to game_uid
                avatar_url: avatarUrl,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'id' }
            )

            if (dbErr) {
              console.warn('[DB Sync Notice]: Upserting profile record failed:', dbErr.message)
            }
          } catch (dbEx) {
            console.warn('[DB Exception]: Profile table sync failed:', dbEx)
          }
        }
      }

      setAlert({ type: 'success', message: 'Player profile updated successfully!' })
      showSuccess('Profile Updated Successfully', 'Saved')
      setTimeout(() => navigate('/profile'), 800)
    } catch (err) {
      console.error('[Save Profile Error]:', err)
      const msg = err?.message || 'Failed to update profile.'
      setAlert({ type: 'error', message: msg })
      showError(msg, 'Update Failed')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="bg-[#050505] text-white font-body min-h-screen pb-20 antialiased font-mono text-xs">
      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        
        {/* Back Link Navigation */}
        <div className="flex items-center gap-2">
          <Link
            to="/profile"
            className="inline-flex items-center gap-1.5 text-[#A0A0A0] hover:text-[#00f2ff] font-bold uppercase transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Profile</span>
          </Link>
        </div>

        {/* Section Header */}
        <div className="border-b border-[#27272a]/60 pb-3">
          <h2 className="font-headline text-lg sm:text-xl font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
            <User className="w-5 h-5 text-[#00f2ff]" />
            <span>Edit Identity Card</span>
          </h2>
          <p className="text-[#A0A0A0] text-[10.5px] mt-1 font-sans">
            Customize player name, upload avatar, connect social handles, and customize game UIDs.
          </p>
        </div>

        {alert && <AuthAlert type={alert.type} message={alert.message} />}

        <form onSubmit={handleSaveProfile} noValidate className="bg-[#0A0A0A] border border-[#27272a]/80 rounded-2xl p-5 sm:p-6 space-y-6 shadow-2xl">
          
          {/* Avatar Profile Photo Upload */}
          <div className="flex flex-col sm:flex-row items-center gap-5 border-b border-[#27272a]/40 pb-5">
            <div className="relative group shrink-0">
              <img
                src={avatarUrl}
                alt="Avatar Preview"
                className="w-20 h-20 rounded-xl object-cover border border-[#27272a] shadow-lg group-hover:opacity-75 transition-opacity"
              />
              <button
                type="button"
                onClick={() => setIsAvatarModalOpen(true)}
                className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl text-white cursor-pointer"
                title="Change Avatar"
              >
                <Camera className="w-5 h-5" />
              </button>
            </div>
            
            <div className="text-center sm:text-left space-y-1.5">
              <span className="text-white font-bold block uppercase text-[11px]">Avatar Photo</span>
              <p className="text-[10px] text-[#A0A0A0] font-sans">
                Supports JPEG, PNG, WEBP. Maximum file size limit: 5 MB.
              </p>
              <button
                type="button"
                onClick={() => setIsAvatarModalOpen(true)}
                className="px-3.5 py-1.5 bg-[#18181b] border border-[#27272a] text-[#00f2ff] hover:text-white hover:border-[#00f2ff] rounded text-[10px] font-bold uppercase transition-all cursor-pointer"
              >
                Upload Photo
              </button>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            
            {/* Display Name */}
            <FormInput
              label="Player Display Name *"
              name="username"
              value={formData.username}
              onChange={handleChange}
              error={errors.username}
              required
            />

            {/* Game UIDs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormInput
                label="Free Fire UID"
                name="freeFireUid"
                value={formData.freeFireUid}
                onChange={handleChange}
                error={errors.freeFireUid}
                placeholder="e.g. 518920412"
                icon={Gamepad2}
              />
              
              <FormInput
                label="BGMI UID"
                name="bgmiUid"
                value={formData.bgmiUid}
                onChange={handleChange}
                error={errors.bgmiUid}
                placeholder="e.g. 5521098234"
                icon={Gamepad2}
              />
            </div>

            {/* Social Links */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormInput
                label="Instagram Handle"
                name="instagram"
                value={formData.instagram}
                onChange={handleChange}
                error={errors.instagram}
                placeholder="e.g. @player_one"
                icon={Link2}
              />
              
              <FormInput
                label="WhatsApp Channel Link"
                name="whatsappChannel"
                value={formData.whatsappChannel}
                onChange={handleChange}
                error={errors.whatsappChannel}
                placeholder="e.g. https://whatsapp.com/channel/..."
                icon={MessageSquare}
              />
            </div>

            {/* Player Bio */}
            <div className="space-y-1.5">
              <label className="text-[#A0A0A0] uppercase font-bold block">Bio Description</label>
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                rows={3}
                maxLength={200}
                placeholder="Tell other fraggers about your gameplay style, favorite guns, or team achievements..."
                className="w-full bg-[#09090b] border border-[#27272a] rounded-xl p-3 text-xs text-white placeholder-[#71717a] focus:border-[#00f2ff] focus:outline-none"
              ></textarea>
              <div className="flex justify-between text-[10px] text-[#A0A0A0] font-sans">
                <span>{errors.bio || ''}</span>
                <span>{formData.bio.length} / 200 Characters</span>
              </div>
            </div>

          </div>

          {/* Submit Actions */}
          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <LoadingButton
              type="submit"
              loading={isSaving}
              className="flex-1 py-3 bg-[#00f2ff] hover:bg-cyan-300 text-black font-bold uppercase rounded-xl text-xs transition-all shadow-[0_0_15px_rgba(0,242,255,0.3)] flex items-center justify-center gap-2 min-h-[44px]"
            >
              <Save className="w-4 h-4" />
              <span>Save Identity Changes</span>
            </LoadingButton>

            <Link
              to="/profile"
              className="px-5 py-3 bg-[#18181b] border border-[#27272a] hover:border-red-500 hover:text-red-500 rounded-xl text-xs font-bold uppercase transition-all flex items-center justify-center min-h-[44px]"
            >
              Cancel Changes
            </Link>
          </div>

        </form>

      </main>

      {/* Avatar Image Selection Modal */}
      <AvatarUploadModal
        isOpen={isAvatarModalOpen}
        onClose={() => setIsAvatarModalOpen(false)}
        onSave={handleAvatarSave}
        isUploading={isAvatarUploading}
      />
    </div>
  )
}
