import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { uploadAvatarFile } from '../services/avatarService'
import {
  uploadProfileProof,
  getPlayerProof,
  invalidatePlayerVerification,
  extractFreeFireProfileFromScreenshot
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
  X,
  Lock,
  Phone,
  Sparkles,
  Shield,
  FileText,
  Scan,
  RefreshCw
} from 'lucide-react'
import FormInput from '../components/common/FormInput'
import AuthAlert from '../components/common/AuthAlert'
import LoadingButton from '../components/common/LoadingButton'
import AvatarUploadModal from '../components/common/AvatarUploadModal'
import { isValidGameUid, isValidPhoneNumber, sanitizeString, sanitizeDigitsOnly } from '../utils/validationUtils'
import { compareProfileUid, compareProfileIgn, resolveAuthoritativeProfileIgn } from '../utils/playerIdentityUtils'

export default function EditProfilePage() {
  const { user, profile, updateProfile } = useAuth()
  const { showSuccess, showError, showInfo } = useToast()
  const navigate = useNavigate()

  // Load existing profile meta
  const meta = user?.user_metadata || {}

  // Initial State derived authoritatively
  const initialFormState = useMemo(() => ({
    username: meta.username || profile?.username || user?.email?.split('@')[0] || '',
    freeFireUid: meta.freeFireUid || meta.free_fire_uid || meta.game_uid || profile?.game_uid || profile?.freeFireUid || '',
    phone: meta.phone || meta.whatsappNumber || profile?.phone || '',
    instagram: meta.instagram || profile?.instagram_handle || '',
    whatsappChannel: meta.whatsappChannel || meta.whatsapp_channel || '',
    bio: meta.bio || profile?.bio || '',
  }), [meta, profile, user?.email])

  const [formData, setFormData] = useState(initialFormState)

  const [avatarUrl, setAvatarUrl] = useState(
    meta.avatar_url ||
    meta.avatarUrl ||
    profile?.avatar_url ||
    ''
  )
  const [initialAvatarUrl, setInitialAvatarUrl] = useState(
    meta.avatar_url ||
    meta.avatarUrl ||
    profile?.avatar_url ||
    ''
  )

  // Sync if profile/user metadata updates after mount
  useEffect(() => {
    setFormData(initialFormState)
    const currentAvatar = meta.avatar_url || meta.avatarUrl || profile?.avatar_url || ''
    setAvatarUrl(currentAvatar)
    setInitialAvatarUrl(currentAvatar)
  }, [initialFormState, meta.avatar_url, meta.avatarUrl, profile?.avatar_url])

  // Profile Proof Evidence State
  const [proofEvidence, setProofEvidence] = useState(null)
  const [proofPreviewUrl, setProofPreviewUrl] = useState('')
  const [stagedFile, setStagedFile] = useState(null)
  const [isProofUploading, setIsProofUploading] = useState(false)
  const [proofError, setProofError] = useState(null)

  // OCR Extraction State (Phase 1B)
  const [isOcrScanning, setIsOcrScanning] = useState(false)
  const [ocrResult, setOcrResult] = useState(null) // { exactIgn, canonicalIgn, uid, isLegible, confidenceNotes }
  const [ocrError, setOcrError] = useState(null)
  const [ocrConfirmed, setOcrConfirmed] = useState(false)

  // Initial verified values tracker for invalidation detection
  const [initialVerifiedUid, setInitialVerifiedUid] = useState('')
  const [initialVerifiedIgn, setInitialVerifiedIgn] = useState('')

  // Load existing player proof evidence on mount
  useEffect(() => {
    let isSubscribed = true
    async function loadEvidence() {
      if (user?.id) {
        try {
          const ev = await getPlayerProof(user.id)
          if (ev && isSubscribed) {
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
    return () => {
      isSubscribed = false
    }
  }, [user?.id])

  // Compute Unsaved Changes (Dirty State)
  const isDirty = useMemo(() => {
    const isFieldsDirty = (
      formData.username !== initialFormState.username ||
      formData.freeFireUid !== initialFormState.freeFireUid ||
      formData.phone !== initialFormState.phone ||
      formData.instagram !== initialFormState.instagram ||
      formData.whatsappChannel !== initialFormState.whatsappChannel ||
      formData.bio !== initialFormState.bio
    )
    const isAvatarDirty = avatarUrl !== initialAvatarUrl
    return isFieldsDirty || isAvatarDirty
  }, [formData, initialFormState, avatarUrl, initialAvatarUrl])

  // Authoritative Verification Status Resolution
  const verificationStatus = useMemo(() => {
    if (proofEvidence?.status === 'VERIFIED' || profile?.verification_status === 'Verified') {
      return 'Verified'
    }
    if (proofEvidence?.status === 'PENDING' || profile?.verification_status === 'Pending') {
      return 'Pending'
    }
    if (proofEvidence?.status === 'REQUIRES_REUPLOAD') {
      return 'Requires Re-upload'
    }
    if (proofEvidence?.status === 'REJECTED' || profile?.verification_status === 'Rejected') {
      return 'Rejected'
    }
    return 'Unverified'
  }, [proofEvidence, profile?.verification_status])

  // Authoritative PRO Status Resolution
  const isPro = useMemo(() => {
    return profile?.tier === 'PRO' || profile?.tier === 'pro' || user?.user_metadata?.is_pro === true
  }, [profile?.tier, user?.user_metadata?.is_pro])

  // Phase 2: Profile vs OCR Identity Consistency Evaluation
  const currentProfileUid = String(formData.freeFireUid || meta.freeFireUid || profile?.game_uid || '').trim()

  // Authoritative Free Fire IGN resolution:
  // Prioritizes stored canonical IGN from player_identity_evidence (proofEvidence.canonical_ign)
  // or verified status, preventing false mismatches when MJ ESPORTS username differs from game IGN.
  const currentProfileIgn = useMemo(() => {
    return resolveAuthoritativeProfileIgn({
      evidenceIgn: proofEvidence?.canonical_ign,
      verifiedIgn: initialVerifiedIgn,
      metaIgn: meta.canonical_ign || meta.freeFireIgn || meta.gameIgn,
      profileIgn: profile?.canonical_ign,
      formUsername: formData.username || meta.username || profile?.username,
      ocrIgn: ocrResult?.exactIgn,
    })
  }, [
    proofEvidence?.canonical_ign,
    initialVerifiedIgn,
    meta.canonical_ign,
    meta.freeFireIgn,
    meta.gameIgn,
    meta.username,
    profile?.canonical_ign,
    profile?.username,
    formData.username,
    ocrResult?.exactIgn,
  ])

  const uidComparison = useMemo(() => {
    if (!ocrResult?.uid) return 'UNKNOWN'
    return compareProfileUid(currentProfileUid, ocrResult.uid)
  }, [currentProfileUid, ocrResult?.uid])

  const ignComparison = useMemo(() => {
    if (!ocrResult?.exactIgn) return { exactMatch: false, normalizedMatch: false, status: 'UNKNOWN' }
    return compareProfileIgn(currentProfileIgn, ocrResult.exactIgn)
  }, [currentProfileIgn, ocrResult?.exactIgn])

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
    // Reset OCR state when a new file is chosen
    setOcrResult(null)
    setOcrError(null)
    setOcrConfirmed(false)

    const reader = new FileReader()
    reader.onload = (event) => {
      setProofPreviewUrl(event.target?.result || '')
    }
    reader.readAsDataURL(file)
  }

  // Handle OCR scanning of selected screenshot (Phase 1B)
  const handleScanProfileOcr = async () => {
    if (!stagedFile && !proofPreviewUrl) {
      setOcrError('Please select a profile screenshot before scanning.')
      return
    }

    setIsOcrScanning(true)
    setOcrError(null)
    setOcrConfirmed(false)

    try {
      const res = await extractFreeFireProfileFromScreenshot(stagedFile, proofPreviewUrl)

      if (res.success && res.data) {
        setOcrResult(res.data)
        setOcrError(null)
        showSuccess('Profile details extracted from screenshot!', 'OCR Scan Complete')
      } else {
        setOcrResult(null)
        setOcrError(res.error || "We couldn't reliably read your Free Fire profile. Please upload a clearer screenshot.")
      }
    } catch (err) {
      console.error('[OCR Scan Error]:', err)
      setOcrResult(null)
      setOcrError(err.message || 'Failed to scan screenshot.')
    } finally {
      setIsOcrScanning(false)
    }
  }

  // Handle user confirmation of detected OCR result (Phase 1B - frontend state only)
  const handleConfirmOcrResult = () => {
    if (!ocrResult) return

    setOcrConfirmed(true)
    showInfo('Extracted profile details confirmed. You can submit your proof for admin verification.', 'Confirmed by Player')
  }

  // Handle retry / rescan of OCR
  const handleRetryOcr = () => {
    setOcrResult(null)
    setOcrError(null)
    setOcrConfirmed(false)
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
        setOcrResult(null)
        setOcrError(null)
        setOcrConfirmed(false)
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
    setOcrResult(null)
    setOcrError(null)
    setOcrConfirmed(false)
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
    const finalValue = (name === 'freeFireUid' || name === 'phone')
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
      const errMsg = err?.message || 'Failed to upload avatar photo.'
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
    const cleanPhone = sanitizeString(formData.phone)
    const cleanInstagram = formData.instagram.trim()
    const cleanWhatsapp = formData.whatsappChannel.trim()
    const cleanBio = formData.bio.trim()

    if (!cleanUsername) {
      errs.username = 'Player display name is required.'
    } else if (cleanUsername.length > 50) {
      errs.username = 'Player display name cannot exceed 50 characters.'
    }

    if (cleanFreeFireUid && !isValidGameUid(cleanFreeFireUid)) {
      errs.freeFireUid = 'Free Fire UID must be exactly 10 numeric digits (0-9).'
    }

    if (cleanPhone && !isValidPhoneNumber(cleanPhone)) {
      errs.phone = 'Phone number must be exactly 10 numeric digits (0-9).'
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
            phone: cleanPhone,
            whatsappNumber: cleanPhone,
            instagram: cleanInstagram,
            whatsappChannel: cleanWhatsapp,
            bio: cleanBio,
            avatar_url: avatarUrl,
          },
        })

        if (authError) throw authError

        // Invalidate verification if critical identity data changed on a verified account
        if (
          proofEvidence &&
          proofEvidence.status === 'VERIFIED' &&
          initialVerifiedUid &&
          (cleanFreeFireUid !== initialVerifiedUid || cleanUsername !== initialVerifiedIgn)
        ) {
          await invalidatePlayerVerification(user.id, 'Player modified verified Game UID or Display Name')
          setProofEvidence((prev) => prev ? { ...prev, status: 'REQUIRES_REUPLOAD', rejection_reason: 'Identity modified. Please re-upload screenshot proof.' } : null)
          showInfo('Game UID / Display Name modified. Re-verification required.', 'Identity Reset')
        }

        // Update profiles table
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            username: cleanUsername,
            game_uid: cleanFreeFireUid,
            phone: cleanPhone,
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
        phone: cleanPhone,
        whatsappNumber: cleanPhone,
        instagram: cleanInstagram,
        whatsappChannel: cleanWhatsapp,
        bio: cleanBio,
        avatar_url: avatarUrl,
      })

      setInitialAvatarUrl(avatarUrl)
      setAlert({ type: 'success', message: 'Profile updated successfully!' })
      showSuccess('Profile changes saved successfully.', 'Profile Updated')
    } catch (err) {
      console.error('Failed to update profile:', err)
      const msg = 'COULD NOT SAVE CHANGES. Please check your network and try again.'
      setAlert({ type: 'error', message: msg })
      showError(msg, 'Profile Update Failed')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDiscardChanges = () => {
    setFormData(initialFormState)
    setAvatarUrl(initialAvatarUrl)
    setErrors({})
    setAlert(null)
  }

  return (
    <div className="bg-[#050505] text-[#f5f5f5] min-h-screen pb-24 antialiased selection:bg-[#00f2ff]/30 selection:text-[#00f2ff]">
      
      {/* Top Background Atmospheric Glow */}
      <div className="relative w-full overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[220px] bg-gradient-to-b from-[#00f2ff]/10 via-transparent to-transparent blur-3xl" />
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 relative z-10 space-y-6">
        
        {/* Breadcrumb Navigation */}
        <div className="flex items-center justify-between">
          <Link
            to="/profile"
            className="inline-flex items-center gap-2 text-xs font-mono font-bold text-[#849495] hover:text-[#00f2ff] uppercase tracking-wider transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
            <span>RETURN TO PROFILE</span>
          </Link>

          <span className="text-[10px] font-mono font-extrabold uppercase px-2.5 py-1 bg-[#121214] border border-[#27272a] text-[#00f2ff] rounded tracking-wider">
            FREE FIRE MAX ONLY
          </span>
        </div>

        {/* Page Header */}
        <div className="border-b border-[#27272a] pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-[#00f2ff] shadow-[0_0_8px_rgba(0,242,255,0.8)]" />
              <span className="font-mono text-[11px] font-extrabold text-[#00f2ff] uppercase tracking-widest">
                PLAYER IDENTITY
              </span>
            </div>
            <h1 className="font-headline text-xl sm:text-2xl font-black text-white uppercase tracking-wider">
              EDIT PROFILE
            </h1>
            <p className="text-xs font-sans text-[#849495] mt-0.5">
              Manage competitive handle, Free Fire MAX player credentials, and verified evidence.
            </p>
          </div>

          {/* Unsaved Changes Indicator */}
          {isDirty && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#00f2ff]/10 border border-[#00f2ff]/40 rounded-lg text-[11px] font-mono font-bold text-[#00f2ff] animate-pulse">
              <Sparkles className="w-3.5 h-3.5" />
              <span>UNSAVED CHANGES</span>
            </div>
          )}
        </div>

        {alert && <AuthAlert type={alert.type} message={alert.message} />}

        {/* Desktop 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* LEFT COLUMN: Identity Preview Card */}
          <aside className="lg:col-span-4 space-y-4">
            <div className="bg-[#0b0c0e] border border-[#1f2128] rounded-xl p-5 relative overflow-hidden shadow-xl">
              {/* Subtle accent line */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#00f2ff]/40 to-transparent" />

              <div className="flex flex-col items-center text-center space-y-3">
                
                {/* Avatar with Upload Action */}
                <div className="relative group">
                  <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-[#27272a] group-hover:border-[#00f2ff] transition-all bg-[#141416] flex items-center justify-center shadow-lg">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="Player Avatar"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl font-bold font-mono text-[#00f2ff] bg-[#141416]">
                        {(formData.username || 'P')[0]?.toUpperCase()}
                      </div>
                    )}
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => setIsAvatarModalOpen(true)}
                    className="absolute inset-0 rounded-2xl bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white gap-1 cursor-pointer"
                    title="Change Avatar Photo"
                  >
                    <Camera className="w-5 h-5 text-[#00f2ff]" />
                    <span className="text-[9px] font-mono font-bold uppercase tracking-wider">CHANGE</span>
                  </button>
                </div>

                {/* Name & Tier */}
                <div className="space-y-1 w-full">
                  <h2 className="font-headline text-base font-extrabold text-white uppercase tracking-wide truncate">
                    {formData.username || 'UNNAMED PLAYER'}
                  </h2>
                  
                  {/* Badges Container */}
                  <div className="flex items-center justify-center gap-1.5 flex-wrap">
                    {/* Verification Status Badge (Read-Only) */}
                    {verificationStatus === 'Verified' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/40 uppercase flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        VERIFIED
                      </span>
                    )}
                    {verificationStatus === 'Pending' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#f59e0b]/15 text-[#f59e0b] border border-[#f59e0b]/40 uppercase flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        PENDING
                      </span>
                    )}
                    {verificationStatus === 'Requires Re-upload' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#ff4655]/15 text-[#ff4655] border border-[#ff4655]/40 uppercase flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        RE-UPLOAD
                      </span>
                    )}
                    {verificationStatus === 'Unverified' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#27272a] text-[#849495] border border-[#3f3f46] uppercase">
                        UNVERIFIED
                      </span>
                    )}

                    {/* PRO Badge (Read-Only) */}
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                      isPro
                        ? 'bg-[#ff7700]/15 text-[#ff7700] border border-[#ff7700]/40'
                        : 'bg-[#18181b] text-[#71717a] border border-[#27272a]'
                    }`}>
                      {isPro ? 'PRO TIER' : 'STANDARD'}
                    </span>
                  </div>
                </div>

                {/* Identity Quick Data Strip */}
                <div className="w-full pt-3 border-t border-[#1f2128] space-y-2 text-left text-xs font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-[#71717a] uppercase">FF MAX UID</span>
                    <span className="text-[#00f2ff] font-bold tracking-wider">
                      {formData.freeFireUid || 'NOT SET'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-[#71717a] uppercase">EMAIL</span>
                    <span className="text-[#b9cacb] truncate max-w-[140px] text-[11px]">
                      {user?.email || 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Avatar Action Trigger */}
                <button
                  type="button"
                  onClick={() => setIsAvatarModalOpen(true)}
                  className="w-full py-2 bg-[#141416] hover:bg-[#1a1a1d] border border-[#27272a] hover:border-[#00f2ff]/60 text-[#00f2ff] rounded-lg text-[11px] font-mono font-bold uppercase transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>UPLOAD AVATAR</span>
                </button>

              </div>
            </div>

            {/* Profile Guidelines Box */}
            <div className="p-4 bg-[#0b0c0e] border border-[#1f2128] rounded-xl text-xs space-y-2 text-[#849495]">
              <div className="flex items-center gap-1.5 text-white font-mono font-bold text-[11px] uppercase">
                <Shield className="w-3.5 h-3.5 text-[#00f2ff]" />
                <span>COMPLIANCE RULES</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-[11px] font-sans">
                <li>Free Fire MAX UID must match your in-game profile.</li>
                <li>Display name edits must be unique across players.</li>
                <li>Modifying verified UID triggers administrative re-audit.</li>
                <li>Avatars must adhere to community guidelines.</li>
              </ul>
            </div>
          </aside>

          {/* RIGHT COLUMN: Edit Form */}
          <div className="lg:col-span-8 space-y-6">
            <form onSubmit={handleSaveProfile} noValidate className="space-y-6">
              
              {/* SECTION: GENERAL IDENTITY */}
              <div className="bg-[#0b0c0e] border border-[#1f2128] rounded-xl p-5 space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-[#1f2128] pb-3">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-[#00f2ff]" />
                    <span className="font-mono text-xs font-bold text-white uppercase tracking-wider">
                      GENERAL IDENTITY
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-[#71717a] uppercase">STEP 1 OF 3</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Display Name */}
                  <FormInput
                    label="DISPLAY NAME"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    error={errors.username}
                    required
                    maxLength={50}
                    showCount
                    placeholder="Enter IGN / Player Name"
                    icon={User}
                  />

                  {/* Primary Auth Email (Read-Only) */}
                  <div className="space-y-1.5 text-left">
                    <div className="flex items-center justify-between">
                      <label className="block font-label-md text-[11px] font-bold text-[#b9cacb] uppercase tracking-wider">
                        PRIMARY AUTH EMAIL
                      </label>
                      <span className="text-[9px] font-mono font-bold text-[#71717a] uppercase flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" />
                        READ ONLY
                      </span>
                    </div>
                    <div className="relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#71717a]">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type="email"
                        value={user?.email || ''}
                        disabled
                        readOnly
                        aria-readonly="true"
                        className="w-full bg-[#121316] border border-[#27272a] rounded-lg py-2.5 pl-10 pr-3 text-xs font-mono text-[#849495] cursor-not-allowed select-none"
                      />
                    </div>
                    <p className="text-[10px] text-[#71717a] font-sans">
                      Linked to authentication provider. Managed under Security & Auth.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Free Fire MAX UID */}
                  <FormInput
                    label="FREE FIRE MAX UID"
                    name="freeFireUid"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={10}
                    showCount
                    value={formData.freeFireUid}
                    onChange={handleChange}
                    error={errors.freeFireUid}
                    placeholder="10-digit Character UID"
                    icon={Gamepad2}
                  />

                  {/* Phone Number */}
                  <div className="space-y-1.5 text-left">
                    <FormInput
                      label="PHONE NUMBER"
                      name="phone"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={10}
                      showCount
                      prefix="+91"
                      value={formData.phone}
                      onChange={handleChange}
                      error={errors.phone}
                      placeholder="10-digit Mobile Number"
                      icon={Phone}
                    />
                    <p className="text-[10px] text-[#71717a] font-sans">
                      Used for match room alerts. Does not confer verified identity badge.
                    </p>
                  </div>
                </div>
              </div>

              {/* SECTION: IN-GAME PROFILE EVIDENCE PROOF */}
              <div className="bg-[#0b0c0e] border border-[#1f2128] rounded-xl p-5 space-y-4 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1f2128] pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-[#00f2ff]" />
                      <span className="font-mono text-xs font-bold text-white uppercase tracking-wider">
                        FREE FIRE IN-GAME PROFILE EVIDENCE
                      </span>
                    </div>
                    <p className="text-[11px] text-[#849495] mt-0.5 font-sans">
                      Upload your in-game profile screenshot for authoritative administrator verification.
                    </p>
                  </div>

                  {/* Verification Badge */}
                  <div className="shrink-0">
                    {verificationStatus === 'Verified' && (
                      <span className="px-2.5 py-1 rounded text-[10px] font-mono font-bold bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/40 uppercase flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Verified by Admin
                      </span>
                    )}
                    {verificationStatus === 'Pending' && (
                      <span className="px-2.5 py-1 rounded text-[10px] font-mono font-bold bg-[#f59e0b]/15 text-[#f59e0b] border border-[#f59e0b]/40 uppercase flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Pending Verification
                      </span>
                    )}
                    {verificationStatus === 'Requires Re-upload' && (
                      <span className="px-2.5 py-1 rounded text-[10px] font-mono font-bold bg-[#ff4655]/15 text-[#ff4655] border border-[#ff4655]/40 uppercase flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Re-upload Required
                      </span>
                    )}
                    {verificationStatus === 'Rejected' && (
                      <span className="px-2.5 py-1 rounded text-[10px] font-mono font-bold bg-[#ff4655]/15 text-[#ff4655] border border-[#ff4655]/40 uppercase flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Proof Rejected
                      </span>
                    )}
                  </div>
                </div>

                {/* Rejection / Feedback Alert */}
                {proofEvidence && (proofEvidence.status === 'REJECTED' || proofEvidence.status === 'REQUIRES_REUPLOAD') && proofEvidence.rejection_reason && (
                  <div className="p-3 bg-[#ff4655]/10 border border-[#ff4655]/30 rounded-lg text-xs text-[#ff4655] space-y-1">
                    <span className="font-mono font-bold block uppercase text-[10px]">ADMIN AUDIT FEEDBACK:</span>
                    <p className="font-sans">{proofEvidence.rejection_reason}</p>
                  </div>
                )}

                {/* Screenshot Preview & Upload Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                  <div className="sm:col-span-5 aspect-video bg-[#141416] border border-[#27272a] rounded-lg overflow-hidden flex items-center justify-center relative">
                    {proofPreviewUrl ? (
                      <img
                        src={proofPreviewUrl}
                        alt="Free Fire Profile Proof"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center p-3 space-y-1 text-[#849495]">
                        <FileImage className="w-6 h-6 mx-auto opacity-60" />
                        <span className="text-[10px] font-mono block">No screenshot uploaded</span>
                      </div>
                    )}
                  </div>

                  <div className="sm:col-span-7 space-y-3">
                    <label className="text-[11px] font-mono font-bold text-[#849495] uppercase block">
                      {proofEvidence ? 'REPLACE / RE-UPLOAD SCREENSHOT' : 'UPLOAD IN-GAME SCREENSHOT'}
                    </label>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <label className="px-3 py-2 bg-[#141416] border border-[#27272a] hover:border-[#00f2ff] text-white hover:text-[#00f2ff] rounded-lg text-xs font-mono font-bold uppercase transition-all cursor-pointer flex items-center gap-2">
                        <Upload className="w-3.5 h-3.5" />
                        <span>{stagedFile ? 'CHANGE SCREENSHOT' : 'SELECT SCREENSHOT'}</span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/jpg,image/webp"
                          onChange={handleProofFileChange}
                          disabled={isProofUploading || isOcrScanning}
                          className="hidden"
                        />
                      </label>

                      {/* OCR Action: SCAN PROFILE (Phase 1B) */}
                      {stagedFile && !ocrResult && (
                        <button
                          type="button"
                          onClick={handleScanProfileOcr}
                          disabled={isOcrScanning || isProofUploading}
                          className="px-3 py-2 bg-[#18181b] border border-[#00f2ff]/40 hover:border-[#00f2ff] text-[#00f2ff] rounded-lg text-xs font-mono font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-[0_0_10px_rgba(0,242,255,0.15)]"
                        >
                          <Scan className={`w-3.5 h-3.5 ${isOcrScanning ? 'animate-spin' : ''}`} />
                          <span>{isOcrScanning ? 'SCANNING PROFILE...' : 'SCAN PROFILE'}</span>
                        </button>
                      )}

                      {stagedFile && (
                        <button
                          type="button"
                          onClick={handleSubmitProof}
                          disabled={isProofUploading || isOcrScanning}
                          className="px-3.5 py-2 bg-[#00f2ff] hover:bg-cyan-300 text-black font-mono font-bold uppercase rounded-lg text-xs transition-all shadow-[0_0_12px_rgba(0,242,255,0.3)] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{isProofUploading ? 'UPLOADING...' : 'SUBMIT PROOF'}</span>
                        </button>
                      )}

                      {stagedFile && (
                        <button
                          type="button"
                          onClick={handleCancelStagedFile}
                          disabled={isProofUploading || isOcrScanning}
                          className="px-2.5 py-2 bg-[#18181b] border border-[#27272a] hover:border-[#ff4655] hover:text-[#ff4655] rounded-lg text-xs font-mono font-bold uppercase transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>CANCEL</span>
                        </button>
                      )}
                    </div>

                    {/* OCR Error / Uncertain Notice */}
                    {ocrError && (
                      <div className="p-2.5 bg-[#ff4655]/10 border border-[#ff4655]/30 rounded-lg text-xs text-[#ff4655] space-y-1.5" role="alert">
                        <div className="flex items-center gap-1.5 font-mono font-bold uppercase text-[10px]">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>OCR SCAN RESULT</span>
                        </div>
                        <p className="font-sans text-[11px]">{ocrError}</p>
                        <button
                          type="button"
                          onClick={handleScanProfileOcr}
                          disabled={isOcrScanning}
                          className="px-2 py-1 bg-[#18181b] border border-[#ff4655]/40 hover:border-[#ff4655] text-white rounded text-[10px] font-mono uppercase flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>RETRY SCAN</span>
                        </button>
                      </div>
                    )}

                    {/* OCR Success Panel (Phase 1B - Detected from screenshot) */}
                    {ocrResult && (
                      <div className="p-3 bg-[#121214] border border-[#00f2ff]/30 rounded-lg space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] font-bold text-[#00f2ff] uppercase tracking-wider flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-[#00f2ff]" />
                            DETECTED FROM SCREENSHOT
                          </span>
                          {ocrConfirmed ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/40 uppercase flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              CONFIRMED BY YOU
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono text-[#849495] bg-[#18181b] border border-[#27272a] uppercase">
                              PENDING CONFIRMATION
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          <div className="p-2 bg-[#18181b] border border-[#27272a] rounded space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-[10px] text-[#71717a] block uppercase">DETECTED IGN</span>
                              {ignComparison.status === 'MATCH' && (
                                <span className="text-[9px] font-mono font-bold text-[#10b981] bg-[#10b981]/10 px-1.5 py-0.5 rounded border border-[#10b981]/30">
                                  MATCHES PROFILE
                                </span>
                              )}
                              {ignComparison.status === 'NORMALIZED_MATCH_ONLY' && (
                                <span className="text-[9px] font-mono text-[#f59e0b] bg-[#f59e0b]/10 px-1.5 py-0.5 rounded border border-[#f59e0b]/30">
                                  STYLE DIFFERS
                                </span>
                              )}
                              {ignComparison.status === 'MISMATCH' && (
                                <span className="text-[9px] font-mono text-[#ff4655] bg-[#ff4655]/10 px-1.5 py-0.5 rounded border border-[#ff4655]/30">
                                  IGN MISMATCH
                                </span>
                              )}
                            </div>
                            <span className="font-sans font-bold text-white text-sm break-all select-all block">
                              {ocrResult.exactIgn}
                            </span>
                          </div>
                          <div className="p-2 bg-[#18181b] border border-[#27272a] rounded space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-[10px] text-[#71717a] block uppercase">FREE FIRE UID</span>
                              {uidComparison === 'MATCH' && (
                                <span className="text-[9px] font-mono font-bold text-[#10b981] bg-[#10b981]/10 px-1.5 py-0.5 rounded border border-[#10b981]/30">
                                  MATCHES PROFILE
                                </span>
                              )}
                              {uidComparison === 'MISMATCH' && (
                                <span className="text-[9px] font-mono text-[#ff4655] bg-[#ff4655]/10 px-1.5 py-0.5 rounded border border-[#ff4655]/30">
                                  UID MISMATCH
                                </span>
                              )}
                            </div>
                            <span className="font-mono font-bold text-[#00f2ff] text-sm tracking-wide select-all block">
                              {ocrResult.uid}
                            </span>
                          </div>
                        </div>

                        {/* Consistency Warning for Mismatches */}
                        {uidComparison === 'MISMATCH' && (
                          <div className="p-2 bg-[#ff4655]/10 border border-[#ff4655]/30 rounded text-[11px] text-[#ff4655] font-sans flex items-start gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span>
                              <strong>UID Mismatch:</strong> Detected UID ({ocrResult.uid}) does not match your current profile UID ({currentProfileUid}). Your profile UID will not be modified automatically.
                            </span>
                          </div>
                        )}
                        {ignComparison.status === 'MISMATCH' && (
                          <div className="p-2 bg-[#f59e0b]/10 border border-[#f59e0b]/30 rounded text-[11px] text-[#f59e0b] font-sans flex items-start gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span>
                              <strong>IGN Mismatch:</strong> Detected IGN does not match your profile Free Fire identity.
                            </span>
                          </div>
                        )}

                        <div className="flex items-center gap-2 pt-1">
                          {!ocrConfirmed ? (
                            <button
                              type="button"
                              onClick={handleConfirmOcrResult}
                              className="px-3 py-1.5 bg-[#10b981] hover:bg-emerald-400 text-black rounded text-xs font-mono font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>CONFIRM</span>
                            </button>
                          ) : null}

                          <button
                            type="button"
                            onClick={handleRetryOcr}
                            className="px-2.5 py-1.5 bg-[#18181b] border border-[#27272a] hover:border-[#00f2ff] text-[#849495] hover:text-white rounded text-xs font-mono uppercase transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>RESCAN</span>
                          </button>
                        </div>
                      </div>
                    )}

                    <p className="text-[10px] text-[#71717a] font-sans">
                      Accepted formats: PNG, JPG, WEBP (Max 10 MB). Screenshot must clearly display player IGN and 10-digit UID.
                    </p>
                    {proofError && (
                      <p className="text-[11px] text-[#ff4655] font-medium" role="alert">{proofError}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* SECTION: SOCIALS & BIO */}
              <div className="bg-[#0b0c0e] border border-[#1f2128] rounded-xl p-5 space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-[#1f2128] pb-3">
                  <div className="flex items-center gap-2">
                    <Link2 className="w-4 h-4 text-[#00f2ff]" />
                    <span className="font-mono text-xs font-bold text-white uppercase tracking-wider">
                      SOCIALS & PLAYER BIO
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-[#71717a] uppercase">STEP 3 OF 3</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormInput
                    label="INSTAGRAM HANDLE"
                    name="instagram"
                    value={formData.instagram}
                    onChange={handleChange}
                    error={errors.instagram}
                    placeholder="@player_name"
                    icon={Link2}
                  />

                  <FormInput
                    label="WHATSAPP CHANNEL LINK"
                    name="whatsappChannel"
                    value={formData.whatsappChannel}
                    onChange={handleChange}
                    error={errors.whatsappChannel}
                    placeholder="https://whatsapp.com/channel/..."
                    icon={MessageSquare}
                  />
                </div>

                <div className="space-y-1.5 text-left">
                  <div className="flex items-center justify-between">
                    <label className="block font-label-md text-[11px] font-bold text-[#b9cacb] uppercase tracking-wider">
                      PLAYER BIO
                    </label>
                    <span className="text-[10px] font-mono font-bold text-[#849495]">
                      {formData.bio.length}/200
                    </span>
                  </div>
                  <textarea
                    name="bio"
                    value={formData.bio}
                    onChange={handleChange}
                    rows={3}
                    maxLength={200}
                    placeholder="Competitive roles, favorite guns, or team accolades..."
                    className="w-full bg-[#121316] border border-[#27272a] rounded-lg p-3 text-xs font-sans text-white placeholder-[#71717a] focus:border-[#00f2ff] focus:outline-none transition-colors"
                  ></textarea>
                  {errors.bio && (
                    <p className="text-[11px] text-[#ff4655]" role="alert">{errors.bio}</p>
                  )}
                </div>
              </div>

              {/* STICKY SAVE / CANCEL BAR */}
              <div className="sticky bottom-4 z-30 p-4 bg-[#0b0c0e]/95 backdrop-blur-md border border-[#1f2128] rounded-xl shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-mono">
                  {isDirty ? (
                    <span className="text-[#00f2ff] font-bold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      UNSAVED MODIFICATIONS DETECTED
                    </span>
                  ) : (
                    <span className="text-[#71717a] font-medium flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-[#10b981]" />
                      PROFILE IS UP TO DATE
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  {isDirty && (
                    <button
                      type="button"
                      onClick={handleDiscardChanges}
                      disabled={isSaving}
                      className="px-4 py-2.5 bg-[#141416] border border-[#27272a] hover:border-[#ff4655] hover:text-[#ff4655] text-xs font-mono font-bold uppercase rounded-lg transition-all cursor-pointer disabled:opacity-50"
                    >
                      DISCARD
                    </button>
                  )}

                  <Link
                    to="/profile"
                    className="px-4 py-2.5 bg-[#141416] border border-[#27272a] hover:border-[#849495] text-xs font-mono font-bold uppercase rounded-lg text-[#849495] hover:text-white transition-all text-center flex-1 sm:flex-none"
                  >
                    CANCEL
                  </Link>

                  <LoadingButton
                    type="submit"
                    loading={isSaving}
                    disabled={!isDirty || isSaving}
                    className="flex-1 sm:flex-none px-6 py-2.5 bg-[#00f2ff] hover:bg-cyan-300 text-black font-mono font-extrabold uppercase rounded-lg text-xs transition-all shadow-[0_0_15px_rgba(0,242,255,0.3)] flex items-center justify-center gap-2 min-h-[40px] disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>SAVE CHANGES</span>
                  </LoadingButton>
                </div>
              </div>

            </form>
          </div>

        </div>

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
