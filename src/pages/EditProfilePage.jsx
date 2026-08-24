import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { uploadAvatarFile } from '../services/avatarService'
import {
  uploadProfileProof,
  getPlayerProof,
  invalidatePlayerVerification
} from '../services/playerEvidenceService'
import {
  User,
  ArrowLeft,
  Camera,
  Save,
  Link2,
  MessageSquare,
  Gamepad2,
  ShieldCheck,
  Upload,
  FileImage,
  CheckCircle2,
  Clock,
  AlertCircle,
  Check,
  X
} from 'lucide-react'
import FormInput from '../components/common/FormInput'
import AuthAlert from '../components/common/AuthAlert'
import LoadingButton from '../components/common/LoadingButton'
import AvatarUploadModal from '../components/common/AvatarUploadModal'
import { isValidGameUid, sanitizeString, sanitizeDigitsOnly } from '../utils/validationUtils'

export default function EditProfilePage() {
  const { user, updateProfile } = useAuth()
  const { showSuccess, showError, showInfo } = useToast()
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

  // Profile Proof Evidence State
  const [proofEvidence, setProofEvidence] = useState(null)
  const [proofPreviewUrl, setProofPreviewUrl] = useState('')
  const [stagedFile, setStagedFile] = useState(null)
  const [isProofUploading, setIsProofUploading] = useState(false)
  const [proofError, setProofError] = useState(null)

  // Initial verified values tracker for invalidation detection
  const [initialVerifiedUid, setInitialVerifiedUid] = useState('')
  const [initialVerifiedIgn, setInitialVerifiedIgn] = useState('')

  // Load existing player proof evidence on mount
  useEffect(() => {
    async function loadEvidence() {
      if (user?.id) {
        try {
          const ev = await getPlayerProof(user.id)
          if (ev) {
            setProofEvidence(ev)
            if (ev.status === 'VERIFIED') {
              setInitialVerifiedUid(ev.game_uid || '')
              setInitialVerifiedIgn(ev.canonical_ign || '')
            }
            if (ev.signedUrl) {
              setProofPreviewUrl(ev.signedUrl)
            }
          }
        } catch (err) {
          console.warn('[Edit Profile] Load evidence notice:', err)
        }
      }
    }
    loadEvidence()
  }, [user?.id])

  const handleProofFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setProofError(null)

    // Validate image format & size
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
    if (!allowed.includes(file.type)) {
      setProofError('Invalid file type. Please upload a PNG, JPG, or WEBP screenshot.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setProofError('File size exceeds 10 MB limit.')
      return
    }

    setStagedFile(file)

    const reader = new FileReader()
    reader.onload = (event) => {
      setProofPreviewUrl(event.target?.result || '')
    }
    reader.readAsDataURL(file)
  }

  // Handle player evidence upload & submission
  const handleSubmitProof = async () => {
    if (!stagedFile && !proofPreviewUrl) {
      setProofError('Please choose a profile screenshot first.')
      return
    }

    const finalUid = String(formData.freeFireUid || '').trim()
    const finalIgn = String(formData.username || '').trim()

    if (!finalUid) {
      setProofError('Free Fire Character UID is required before submitting proof.')
      return
    }
    if (!isValidGameUid(finalUid)) {
      setProofError('Free Fire Character UID must be exactly 10 numeric digits (0-9).')
      return
    }
    if (!finalIgn) {
      setProofError('Player Display Name / IGN is required before submitting proof.')
      return
    }

    setIsProofUploading(true)
    setProofError(null)

    try {
      const res = await uploadProfileProof(stagedFile, {
        userId: user?.id,
        gameUid: finalUid,
        gameIgn: finalIgn,
        fallbackDataUrl: proofPreviewUrl,
      })

      if (res.success) {
        setProofEvidence(res.evidence || { status: 'PENDING', game_uid: finalUid, canonical_ign: finalIgn })
        setStagedFile(null)
        showSuccess('Profile screenshot proof uploaded successfully! Awaiting admin verification.', 'Submitted for Audit')
      } else {
        setProofError(res.error || 'Failed to submit proof. Please try again.')
      }
    } catch (err) {
      console.error('[Submit Proof Error]:', err)
      setProofError(err.message || 'Submission error.')
    } finally {
      setIsProofUploading(false)
    }
  }

  const handleCancelStagedFile = () => {
    setStagedFile(null)
    if (proofEvidence?.signedUrl) {
      setProofPreviewUrl(proofEvidence.signedUrl)
    } else {
      setProofPreviewUrl('')
    }
    setProofError(null)
  }

  const [errors, setErrors] = useState({})
  const [isSaving, setIsSaving] = useState(false)
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false)
  const [isAvatarUploading, setIsAvatarUploading] = useState(false)
  const [alert, setAlert] = useState(null)

  const handleChange = (e) => {
    const { name, value } = e.target
    const finalValue = (name === 'freeFireUid' || name === 'bgmiUid')
      ? sanitizeDigitsOnly(value, 10)
      : value

    setFormData((prev) => ({ ...prev, [name]: finalValue }))
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
      errs.freeFireUid = 'Free Fire UID must be exactly 10 numeric digits (0-9).'
    }

    if (cleanBgmiUid && !isValidGameUid(cleanBgmiUid)) {
      errs.bgmiUid = 'BGMI UID must be exactly 10 numeric digits (0-9).'
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
        // Check username uniqueness via public_profiles view
        const { data: existingProfiles, error: checkError } = await supabase
          .from('public_profiles')
          .select('id, username')
          .ilike('username', cleanUsername.replace(/[%_\\]/g, '\\$&'))
          .neq('id', user.id)

        if (checkError) {
          console.warn('[Username Check Warning]:', checkError)
        }

        if (existingProfiles && existingProfiles.length > 0) {
          setErrors((prev) => ({
            ...prev,
            username: 'This username is already taken by another player.',
          }))
          setIsSaving(false)
          return
        }

        // Update auth metadata
        const { error: authError } = await supabase.auth.updateUser({
          data: {
            username: cleanUsername,
            freeFireUid: cleanFreeFireUid,
            bgmiUid: cleanBgmiUid,
            instagram: cleanInstagram,
            whatsappChannel: cleanWhatsapp,
            bio: cleanBio,
            avatar_url: avatarUrl,
          },
        })

        if (authError) throw authError

        // Invalidate verification if critical identity data changed
        if (
          proofEvidence &&
          proofEvidence.status === 'VERIFIED' &&
          initialVerifiedUid &&
          (cleanFreeFireUid !== initialVerifiedUid || cleanUsername !== initialVerifiedIgn)
        ) {
          await invalidatePlayerVerification(user.id, 'Player modified verified Game UID or Display Name')
          setProofEvidence((prev) => prev ? { ...prev, status: 'REQUIRES_REUPLOAD', rejection_reason: 'Identity modified. Please re-upload screenshot proof.' } : null)
          showInfo('Game UID / IGN modified. Re-verification required.', 'Identity Reset')
        }

        // Update profiles table
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            username: cleanUsername,
            game_uid: cleanFreeFireUid, // Free Fire UID defaults to game_uid
            instagram_handle: cleanInstagram,
            bio: cleanBio,
            avatar_url: avatarUrl,
            updated_at: new Date().toISOString(),
          })

        if (profileError) {
          console.warn('[Profiles Table Update Notice]:', profileError.message)
        }
      }

      updateProfile({
        username: cleanUsername,
        freeFireUid: cleanFreeFireUid,
        bgmiUid: cleanBgmiUid,
        instagram: cleanInstagram,
        whatsappChannel: cleanWhatsapp,
        bio: cleanBio,
        avatar_url: avatarUrl,
      })

      setAlert({ type: 'success', message: 'Profile updated successfully!' })
      showSuccess('Profile changes saved successfully.', 'Profile Updated')
    } catch (err) {
      console.error('Failed to update profile:', err)
      const msg = err?.message || 'Failed to update profile. Please try again.'
      setAlert({ type: 'error', message: msg })
      showError(msg, 'Save Error')
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
            Customize player name, upload avatar, connect social handles, and verify Free Fire player identity.
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
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={10}
                showCount
                value={formData.freeFireUid}
                onChange={handleChange}
                error={errors.freeFireUid}
                placeholder="0123456789"
                icon={Gamepad2}
              />
              
              <FormInput
                label="BGMI UID"
                name="bgmiUid"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={10}
                showCount
                value={formData.bgmiUid}
                onChange={handleChange}
                error={errors.bgmiUid}
                placeholder="0123456789"
                icon={Gamepad2}
              />
            </div>

            {/* FREE FIRE IN-GAME PROFILE EVIDENCE PROOF */}
            <div className="p-4 bg-[#09090b] border border-[#27272a] rounded-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#27272a] pb-2.5">
                <div>
                  <span className="font-headline text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#00f2ff]" />
                    <span>Free Fire Profile Identity Evidence</span>
                  </span>
                  <p className="text-[11px] text-[#849495] mt-0.5">
                    Upload your in-game profile screenshot for administrative verification.
                  </p>
                </div>

                {/* Evidence Verification Status Badge */}
                {proofEvidence && (
                  <div className="shrink-0">
                    {proofEvidence.status === 'VERIFIED' && (
                      <span className="px-2.5 py-1 rounded text-[10px] font-bold bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/30 uppercase flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Verified by Admin
                      </span>
                    )}
                    {proofEvidence.status === 'PENDING' && (
                      <span className="px-2.5 py-1 rounded text-[10px] font-bold bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/30 uppercase flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Pending Verification
                      </span>
                    )}
                    {(proofEvidence.status === 'REJECTED' || proofEvidence.status === 'REQUIRES_REUPLOAD') && (
                      <span className="px-2.5 py-1 rounded text-[10px] font-bold bg-[#ff4655]/10 text-[#ff4655] border border-[#ff4655]/30 uppercase flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {proofEvidence.status === 'REQUIRES_REUPLOAD' ? 'Re-upload Required' : 'Proof Rejected'}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Rejection Notice if applicable */}
              {proofEvidence && (proofEvidence.status === 'REJECTED' || proofEvidence.status === 'REQUIRES_REUPLOAD') && proofEvidence.rejection_reason && (
                <div className="p-3 bg-[#ff4655]/10 border border-[#ff4655]/30 rounded-lg text-xs text-[#ff4655] space-y-1">
                  <span className="font-bold block uppercase text-[10px]">Admin Feedback / Reason:</span>
                  <p>{proofEvidence.rejection_reason}</p>
                </div>
              )}

              {/* Screenshot Preview & Upload Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                <div className="sm:col-span-4 aspect-video bg-[#141416] border border-[#27272a] rounded-lg overflow-hidden flex items-center justify-center relative">
                  {proofPreviewUrl ? (
                    <img
                      src={proofPreviewUrl}
                      alt="Free Fire Profile Proof"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center p-3 space-y-1 text-[#849495]">
                      <FileImage className="w-6 h-6 mx-auto opacity-60" />
                      <span className="text-[10px] block">No screenshot uploaded yet</span>
                    </div>
                  )}
                </div>

                <div className="sm:col-span-8 space-y-3">
                  <label className="text-[11px] font-bold text-[#849495] uppercase block">
                    {proofEvidence ? 'Replace / Re-upload Profile Proof' : 'Upload Profile Screenshot Proof'}
                  </label>
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="px-3.5 py-2 bg-[#141416] border border-[#27272a] hover:border-[#00f2ff] text-white hover:text-[#00f2ff] rounded-lg text-xs font-bold uppercase transition-all cursor-pointer flex items-center gap-2">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{stagedFile ? 'Change Screenshot' : 'Choose Screenshot'}</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        onChange={handleProofFileChange}
                        disabled={isProofUploading}
                        className="hidden"
                      />
                    </label>

                    {stagedFile && (
                      <button
                        type="button"
                        onClick={handleSubmitProof}
                        disabled={isProofUploading}
                        className="px-4 py-2 bg-[#00f2ff] hover:bg-cyan-300 text-black font-bold uppercase rounded-lg text-xs transition-all shadow-[0_0_12px_rgba(0,242,255,0.3)] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{isProofUploading ? 'Uploading Proof...' : 'Upload & Submit Proof'}</span>
                      </button>
                    )}

                    {stagedFile && (
                      <button
                        type="button"
                        onClick={handleCancelStagedFile}
                        disabled={isProofUploading}
                        className="px-3 py-2 bg-[#18181b] border border-[#27272a] hover:border-red-500 hover:text-red-500 rounded-lg text-xs font-bold uppercase transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Cancel</span>
                      </button>
                    )}

                    <span className="text-[10px] text-[#849495]">PNG, JPG, WEBP (Max 10 MB)</span>
                  </div>
                  {proofError && (
                    <p className="text-[11px] text-[#ff4655] font-medium" role="alert">{proofError}</p>
                  )}
                </div>
              </div>
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
