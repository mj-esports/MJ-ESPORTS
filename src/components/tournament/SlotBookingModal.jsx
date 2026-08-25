import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  X,
  Users,
  Mail,
  User,
  ShieldCheck,
  Phone,
  CheckCircle2,
  Copy,
  Shield,
  Trophy,
  Sparkles,
  Smartphone,
  Upload,
  FileImage
} from 'lucide-react'
import { useTournaments } from '../../contexts/TournamentContext'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { isSupabaseConfigured } from '../../lib/supabase'
import { uploadProfileProof } from '../../services/playerEvidenceService'
import FormInput from '../common/FormInput'
import AuthAlert from '../common/AuthAlert'
import LoadingButton from '../common/LoadingButton'
import ToggleSwitch from '../common/ToggleSwitch'
import {
  toCanonicalIgn,
  normalizeIgn,
  isValidIgn,
} from '../../utils/playerIdentityUtils'
import {
  isValidEmail,
  isValidGameUid,
  isValidPhoneNumber,
  isValidTeamName,
  sanitizeString,
  sanitizeDigitsOnly,
} from '../../utils/validationUtils'
import {
  getTournamentMode,
  calculateRemainingPlayerSlots,
  calculateTotalPlayerSlots,
} from '../../utils/tournamentUtils'

export { getTournamentMode }

export default function SlotBookingModal({ tournament, onClose, onRegistered }) {
  const { registerTeam } = useTournaments()
  const { user } = useAuth()
  const { showSuccess, showError } = useToast()

  // Profile Proof Attachment State
  const [proofFile, setProofFile] = useState(null)
  const [proofPreview, setProofPreview] = useState('')

  // Lock body scrolling when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  const modeConfig = getTournamentMode(tournament)
  const mode = modeConfig.mode

  const [formData, setFormData] = useState({
    teamName: '',
    captainName: user?.user_metadata?.username || '',
    email: user?.email || 'player@esports.gg',
    freeFireUid: user?.user_metadata?.freeFireUid || '',
    whatsappNumber: '',
    availabilityDate: tournament?.startDate || '2026-08-06',
    antiCheatAgreement: true,
    acceptRules: false,
    teammates: ['', '', ''],
    teammateIgns: ['', '', ''],
  })

  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError] = useState(null)
  const [registrationSummary, setRegistrationSummary] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [copied, setCopied] = useState(false)

  const isFormValid = useMemo(() => {
    if (!formData.acceptRules || !formData.antiCheatAgreement) return false
    if (!proofFile && !proofPreview) return false

    const cleanTeamName = sanitizeString(formData.teamName)
    const cleanCaptainName = sanitizeString(formData.captainName)
    const cleanEmail = sanitizeString(formData.email)
    const cleanCaptainUid = sanitizeString(formData.freeFireUid)
    const cleanPhone = sanitizeString(formData.whatsappNumber)

    if (!cleanTeamName || !isValidTeamName(cleanTeamName)) return false
    if (!cleanCaptainName) return false
    if (!cleanEmail || !isValidEmail(cleanEmail)) return false
    if (!cleanCaptainUid || !isValidGameUid(cleanCaptainUid)) return false
    if (!cleanPhone || !isValidPhoneNumber(cleanPhone)) return false

    const requiredTeammatesCount = mode === 'Duo' ? 1 : mode === 'Squad' ? 3 : 0
    for (let i = 0; i < requiredTeammatesCount; i++) {
      const uid = sanitizeString(formData.teammates[i])
      const ign = sanitizeString(formData.teammateIgns[i])
      if (!uid || !isValidGameUid(uid) || uid === cleanCaptainUid) return false
      if (!ign || !isValidIgn(ign)) return false
    }

    if (requiredTeammatesCount > 1) {
      const activeTeammateUids = formData.teammates.slice(0, requiredTeammatesCount).map((t) => sanitizeString(t)).filter(Boolean)
      if (new Set(activeTeammateUids).size !== activeTeammateUids.length) return false
    }

    return true
  }, [formData, proofFile, proofPreview, mode])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    let newValue = type === 'checkbox' ? checked : value

    if (name === 'freeFireUid' || name === 'whatsappNumber') {
      newValue = sanitizeDigitsOnly(value, 10)
    }

    setFormData((prev) => ({
      ...prev,
      [name]: newValue,
    }))
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: null }))
    }
  }

  const handleTeammateChange = (index, field, value) => {
    if (field === 'uid') {
      const sanitized = sanitizeDigitsOnly(value, 10)
      const updatedUids = [...formData.teammates]
      updatedUids[index] = sanitized
      setFormData((prev) => ({ ...prev, teammates: updatedUids }))
      const fieldKey = `teammate_${index}`
      if (fieldErrors[fieldKey]) {
        setFieldErrors((prev) => ({ ...prev, [fieldKey]: null }))
      }
    } else if (field === 'ign') {
      const updatedIgns = [...formData.teammateIgns]
      updatedIgns[index] = value
      setFormData((prev) => ({ ...prev, teammateIgns: updatedIgns }))
      const fieldKey = `teammate_ign_${index}`
      if (fieldErrors[fieldKey]) {
        setFieldErrors((prev) => ({ ...prev, [fieldKey]: null }))
      }
    }
    if (fieldErrors.teammates) {
      setFieldErrors((prev) => ({ ...prev, teammates: null }))
    }
  }

  const handleProofFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
    if (!allowed.includes(file.type)) {
      showError('Please upload a PNG, JPG, or WEBP screenshot.', 'Invalid File Type')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      showError('Screenshot file size exceeds 10 MB limit.', 'File Too Large')
      return
    }

    setProofFile(file)
    if (fieldErrors.proofFile) {
      setFieldErrors((prev) => ({ ...prev, proofFile: null }))
    }
    const reader = new FileReader()
    reader.onload = (event) => {
      setProofPreview(event.target?.result || '')
    }
    reader.readAsDataURL(file)
  }

  const validateForm = () => {
    const newFieldErrors = {}

    if (tournament.status !== 'Registration Open') {
      return 'Registration for this tournament is currently closed.'
    }

    if ((tournament.registeredTeams || 0) >= (tournament.maxTeams || tournament.max_teams || 12)) {
      return 'All registration slots for this tournament are full.'
    }

    const cleanTeamName = sanitizeString(formData.teamName)
    const cleanCaptainName = sanitizeString(formData.captainName)
    const cleanEmail = sanitizeString(formData.email)
    const cleanCaptainUid = sanitizeString(formData.freeFireUid)
    const cleanPhone = sanitizeString(formData.whatsappNumber)

    // Team / Player IGN Validation
    if (!cleanTeamName) {
      newFieldErrors.teamName = mode === 'Solo' ? 'Player IGN / Display Name is required' : 'Team Name is required'
    } else if (!isValidTeamName(cleanTeamName)) {
      newFieldErrors.teamName = 'Name must be between 3 and 30 characters'
    }

    // Captain Name Validation
    if (!cleanCaptainName) {
      newFieldErrors.captainName = mode === 'Solo' ? 'Player Full Name is required' : 'Captain Name is required'
    }

    // Email Validation
    if (!cleanEmail) {
      newFieldErrors.email = 'Email address is required'
    } else if (!isValidEmail(cleanEmail)) {
      newFieldErrors.email = 'Please enter a valid email address'
    }

    // Game UID Validation (Strictly 10 digits)
    if (!cleanCaptainUid) {
      newFieldErrors.freeFireUid = 'Game Character UID is required'
    } else if (!isValidGameUid(cleanCaptainUid)) {
      newFieldErrors.freeFireUid = 'Game UID must be exactly 10 numeric digits (0-9)'
    }

    // Contact Number Validation (Strictly 10 digits)
    if (!cleanPhone) {
      newFieldErrors.whatsappNumber = 'WhatsApp Contact Number is required'
    } else if (!isValidPhoneNumber(cleanPhone)) {
      newFieldErrors.whatsappNumber = 'WhatsApp number must be exactly 10 numeric digits (0-9)'
    }

    // Dynamic Teammate UIDs & IGNs Validation
    const requiredTeammatesCount = mode === 'Duo' ? 1 : mode === 'Squad' ? 3 : 0
    for (let i = 0; i < requiredTeammatesCount; i++) {
      const uid = sanitizeString(formData.teammates[i])
      const ign = sanitizeString(formData.teammateIgns[i])
      const uidFieldKey = `teammate_${i}`
      const ignFieldKey = `teammate_ign_${i}`

      // Validate Teammate UID (Strictly 10 digits)
      if (!uid) {
        newFieldErrors[uidFieldKey] = `Game UID for Teammate ${i + 1} is required for ${mode} mode`
      } else if (!isValidGameUid(uid)) {
        newFieldErrors[uidFieldKey] = `Teammate ${i + 1} Game UID must be exactly 10 digits (0-9)`
      } else if (uid === cleanCaptainUid) {
        newFieldErrors[uidFieldKey] = `Teammate ${i + 1} Game UID cannot be identical to Captain's UID`
      }

      // Validate Teammate In-Game Name (IGN)
      if (!ign) {
        newFieldErrors[ignFieldKey] = `In-Game Name (IGN) for Teammate ${i + 1} is required`
      } else if (!isValidIgn(ign)) {
        newFieldErrors[ignFieldKey] = `Teammate ${i + 1} IGN must be 1-30 characters`
      }
    }

    if (requiredTeammatesCount > 1) {
      const activeTeammateUids = formData.teammates
        .slice(0, requiredTeammatesCount)
        .map((t) => sanitizeString(t))
        .filter(Boolean)

      const uniqueUids = new Set(activeTeammateUids)
      if (uniqueUids.size !== activeTeammateUids.length) {
        newFieldErrors.teammates = 'All Teammate Game UIDs must be unique'
      }
    }

    // Mandatory Profile Screenshot Validation
    if (!proofFile && !proofPreview) {
      newFieldErrors.proofFile = 'Free Fire profile screenshot is required for identity verification'
    }

    // Toggle Switch Rules & Fair Play Validation
    if (!formData.acceptRules) {
      newFieldErrors.acceptRules = 'You must enable rulebook acceptance switch to confirm registration'
    }

    if (!formData.antiCheatAgreement) {
      newFieldErrors.antiCheatAgreement = 'You must enable anti-cheat agreement switch'
    }

    setFieldErrors(newFieldErrors)
    if (Object.keys(newFieldErrors).length > 0) {
      return 'Please correct highlighted errors in the form before submitting.'
    }

    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      showError(validationError, 'Validation Error')
      return
    }

    setIsSubmitting(true)
    const requiredTeammatesCount = mode === 'Duo' ? 1 : mode === 'Squad' ? 3 : 0
    const activeTeammates = formData.teammates
      .slice(0, requiredTeammatesCount)
      .map((t) => sanitizeString(t))
    const activeTeammateIgns = formData.teammateIgns
      .slice(0, requiredTeammatesCount)
      .map((t) => toCanonicalIgn(t))

    const refId = `REG-MJ-${Date.now().toString(36).toUpperCase()}`

    try {
      // If proof screenshot is attached, record profile evidence in background
      if (proofFile && user?.id) {
        uploadProfileProof(proofFile, {
          userId: user.id,
          gameUid: sanitizeString(formData.freeFireUid),
          gameIgn: toCanonicalIgn(formData.captainName),
          tournamentId: tournament.id,
          fallbackDataUrl: proofPreview,
        }).catch((proofErr) => {
          console.warn('[Profile Proof Upload Notice]:', proofErr)
        })
      }

      // Local or Context registration (No Supabase mandatory)
      let registeredRecord = null
      if (registerTeam) {
        registeredRecord = await registerTeam(tournament.id, {
          refId,
          name: sanitizeString(formData.teamName),
          captain: toCanonicalIgn(formData.captainName),
          email: sanitizeString(formData.email),
          freeFireUid: sanitizeString(formData.freeFireUid),
          whatsappNumber: sanitizeString(formData.whatsappNumber),
          mode,
          teammates: activeTeammates,
          teammateIgns: activeTeammateIgns,
          userId: user?.id || `guest-${Date.now()}`,
          status: 'Pending',
          paymentStatus: 'Pending',
        })
      }

      showSuccess('Tournament Registered', 'Registration Confirmed')

      if (onRegistered) {
        onRegistered(registeredRecord)
      }

      setRegistrationSummary({
        refId,
        teamName: sanitizeString(formData.teamName),
        captain: toCanonicalIgn(formData.captainName),
        mode,
        freeFireUid: sanitizeString(formData.freeFireUid),
        teammates: activeTeammates,
        teammateIgns: activeTeammateIgns,
        status: 'Approved',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        registeredRecord,
      })
    } catch (err) {
      console.error('[Registration Submission Error]:', err)
      const errorMsg = err?.message || 'Registration failed. Please check your inputs and try again.'
      setError(errorMsg)
      showError(errorMsg, 'Registration Failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCopyRef = () => {
    if (registrationSummary?.refId) {
      navigator.clipboard.writeText(registrationSummary.refId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const remainingPlayerSlots = calculateRemainingPlayerSlots(tournament)
  const totalPlayerSlots = calculateTotalPlayerSlots(tournament)
  const regTeams = Number(tournament.registeredTeams || tournament.registered_teams || 0)
  const maxTeams = Number(tournament.maxTeams || tournament.max_teams || 12)
  const remainingTeams = Math.max(0, maxTeams - regTeams)

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="slot-booking-modal-title"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#151a21] border border-[#3a494b] rounded-2xl max-w-2xl w-full p-4 sm:p-5 space-y-3.5 shadow-[0_0_50px_rgba(0,242,255,0.15)] relative max-h-[90vh] overflow-y-auto"
      >

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl bg-[#07090c] border border-[#3a494b] text-[#8e9dae] hover:text-[#00f2ff] hover:border-[#00f2ff]/50 transition-all cursor-pointer"
          aria-label="Close Registration Modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header & Branding */}
        <div className="space-y-1 border-b border-[#3a494b]/50 pb-3">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#00f2ff]" />
            <span className="font-label-caps text-[11px] font-extrabold text-[#00f2ff] uppercase tracking-widest block">
              MJ ESPORTS OFFICIAL REGISTRATION
            </span>
          </div>
          <h2 id="slot-booking-modal-title" className="font-display-lg text-lg sm:text-xl font-extrabold text-white uppercase tracking-tight italic">
            {tournament.title}
          </h2>
          <div className="flex items-center gap-3 text-[11px] text-[#8e9dae] pt-0.5">
            <span>Game: <strong className="text-white">{tournament.game || 'Esports'}</strong></span>
            <span className="text-[#3a494b]">•</span>
            <span>
              Slots Remaining:{' '}
              <span className="font-mono text-[#00ff9d] font-bold">
                {remainingPlayerSlots}
              </span>{' '}
              / {totalPlayerSlots} Players
              {modeConfig.mode !== 'Solo' && (
                <span className="text-[11px] text-[#8e9dae] ml-1 font-mono">
                  ({remainingTeams} {modeConfig.teamUnit} left)
                </span>
              )}
            </span>
          </div>
        </div>

        {error && <AuthAlert type="error" message={error} />}

        {/* SUCCESS CONFIRMATION DIALOG */}
        {registrationSummary ? (
          <div className="space-y-4 pt-1">
            <div className="p-4 bg-[#07090c] border border-[#00ff9d]/40 rounded-2xl space-y-3 text-center">
              <div className="w-10 h-10 rounded-full bg-[#00ff9d]/20 border border-[#00ff9d] flex items-center justify-center mx-auto text-[#00ff9d] shadow-[0_0_15px_rgba(0,255,157,0.3)]">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display-lg text-base font-bold text-white uppercase tracking-wide">Slot Registration Confirmed!</h3>
                <p className="text-xs text-[#8e9dae] mt-0.5">Your registration has been securely recorded.</p>
              </div>

              {/* Reference Ticket Card */}
              <div className="p-3.5 bg-[#151a21] rounded-xl border border-[#3a494b]/60 text-left space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between border-b border-[#3a494b]/60 pb-2">
                  <span className="text-[#8e9dae] font-semibold">Reference ID</span>
                  <div className="flex items-center gap-1.5 text-[#00f2ff] font-bold">
                    <span>{registrationSummary.refId}</span>
                    <button
                      onClick={handleCopyRef}
                      className="p-1 rounded hover:bg-[#1d232c] text-[#8e9dae] hover:text-white transition-colors"
                      title="Copy Reference ID"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    {copied && <span className="text-[10px] text-[#00ff9d] font-sans font-bold">Copied!</span>}
                  </div>
                </div>

                <div className="flex justify-between py-1 border-b border-[#3a494b]/60">
                  <span className="text-[#8e9dae]">{mode === 'Solo' ? 'Player IGN' : 'Team Name'}</span>
                  <span className="font-extrabold text-white">{registrationSummary.teamName}</span>
                </div>

                <div className="flex justify-between py-1 border-b border-[#3a494b]/60">
                  <span className="text-[#8e9dae]">Format Mode</span>
                  <span className="font-bold text-[#00f2ff]">{modeConfig.formatTitle} ({registrationSummary.mode})</span>
                </div>

                <div className="flex justify-between py-1 border-b border-[#3a494b]/60">
                  <span className="text-[#8e9dae]">{mode === 'Solo' ? 'Player UID' : 'Captain UID'}</span>
                  <span className="font-bold text-[#00f2ff]">{registrationSummary.freeFireUid}</span>
                </div>

                <div className="flex justify-between pt-1">
                  <span className="text-[#8e9dae]">Status</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-[#00ff9d]/10 text-[#00ff9d] border border-[#00ff9d]/40 uppercase">
                    {registrationSummary.status}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="btn-cyber-primary w-full justify-center py-3 min-h-[44px] cursor-pointer"
            >
              Done & Return
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-3.5">

            {/* Read-Only Competition Format Card */}
            <div className="p-3 bg-[#07090c] border border-[#00f2ff]/30 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#00f2ff]/10 border border-[#00f2ff]/30 flex items-center justify-center text-[#00f2ff] shrink-0">
                  <Users className="w-4 h-4 text-[#00f2ff]" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wide">
                    {modeConfig.mode} ({modeConfig.formatTitle})
                  </h4>
                  <p className="text-[11px] text-[#00ff9d] font-semibold">
                    {modeConfig.requiredPlayers} {modeConfig.requiredPlayers === 1 ? 'Player Required' : 'Players Required per Squad'}
                  </p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-[#00f2ff]/15 text-[#00f2ff] border border-[#00f2ff]/40 uppercase tracking-wider font-label-caps">
                COMPETITION FORMAT
              </span>
            </div>

            {/* RESPONSIVE LAYOUT GRID: SECTION 1 - PRIMARY CREDENTIALS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormInput
                label={mode === 'Solo' ? 'Player IGN / Display Name' : 'Team Name'}
                name="teamName"
                value={formData.teamName}
                onChange={handleChange}
                placeholder={mode === 'Solo' ? 'e.g. Phoenix_99' : 'e.g. Phoenix Squad'}
                required
                error={fieldErrors.teamName}
                icon={Users}
              />

              <FormInput
                label={mode === 'Solo' ? 'Player Full Name' : 'Captain Full Name'}
                name="captainName"
                value={formData.captainName}
                onChange={handleChange}
                placeholder="e.g. Rahul Sharma"
                required
                error={fieldErrors.captainName}
                icon={User}
              />

              <FormInput
                label="Email Address"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="user@example.com"
                required
                error={fieldErrors.email}
                icon={Mail}
              />

              <FormInput
                label="WhatsApp Contact Number"
                name="whatsappNumber"
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={10}
                showCount
                prefix="+91"
                value={formData.whatsappNumber}
                onChange={handleChange}
                placeholder="9876543210"
                required
                error={fieldErrors.whatsappNumber}
                icon={Phone}
              />

              <div className="sm:col-span-2">
                <FormInput
                  label={mode === 'Solo' ? 'Game Character UID' : 'Captain Game Character UID'}
                  name="freeFireUid"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={10}
                  showCount
                  value={formData.freeFireUid}
                  onChange={handleChange}
                  placeholder="0123456789"
                  required
                  error={fieldErrors.freeFireUid}
                  icon={ShieldCheck}
                />
              </div>

              {/* FREE FIRE PROFILE SCREENSHOT — REQUIRED COMPACT CARD */}
              <div className={`sm:col-span-2 p-3 bg-[#07090c] border rounded-xl space-y-2 ${
                fieldErrors.proofFile ? 'border-[#ff4655]' : proofFile || proofPreview ? 'border-[#10b981]/40 bg-[#10b981]/5' : 'border-[#3a494b]/60'
              }`}>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 font-label-caps text-[11px] font-bold text-[#8e9dae] uppercase">
                    <FileImage className="w-3.5 h-3.5 text-[#00f2ff]" />
                    <span>FREE FIRE PROFILE SCREENSHOT</span>
                    <span className="text-[#ff4655]">*</span>
                  </label>
                  <span className="text-[#00f2ff] text-[10px] font-bold uppercase font-label-caps">
                    Required
                  </span>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <label className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center gap-2 border ${
                    proofFile || proofPreview
                      ? 'bg-[#10b981]/15 text-[#10b981] border-[#10b981]/40 hover:bg-[#10b981]/25'
                      : 'bg-[#151a21] hover:bg-[#1d232c] text-[#00f2ff] border-[#3a494b] hover:border-[#00f2ff]/50'
                  }`}>
                    {proofFile || proofPreview ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#10b981]" />
                        <span>✓ PROFILE SCREENSHOT ATTACHED</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5" />
                        <span>ATTACH PROFILE SCREENSHOT</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      onChange={handleProofFileSelect}
                      className="hidden"
                    />
                  </label>

                  {proofFile && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-white font-mono text-[11px] max-w-[180px] truncate">{proofFile.name}</span>
                      <button
                        type="button"
                        onClick={() => { setProofFile(null); setProofPreview(''); }}
                        className="text-[11px] text-red-400 hover:text-red-300 font-bold uppercase cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>

                {fieldErrors.proofFile && (
                  <p className="text-[11px] text-[#ff4655] font-medium" role="alert">
                    {fieldErrors.proofFile}
                  </p>
                )}

                <p className="text-[10px] text-[#8e9dae] font-sans">
                  Upload your in-game profile showing UID + IGN.
                </p>
              </div>
            </div>

            {/* DYNAMIC TEAMMATE UID & IGN FIELDS BASED ON TOURNAMENT FORMAT MODE */}
            {mode === 'Duo' && (
              <div className="p-3 bg-[#07090c] rounded-xl border border-[#3a494b]/60 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-label-caps text-xs font-bold text-[#00f2ff] uppercase tracking-wider block">
                    Duo Teammate Details (1 Required Teammate)
                  </span>
                  <span className="text-[10px] text-[#8e9dae] font-mono">UID + Canonical IGN</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FormInput
                    label="Teammate 1 Game UID"
                    name="teammate_0"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={10}
                    showCount
                    value={formData.teammates[0]}
                    onChange={(e) => handleTeammateChange(0, 'uid', e.target.value)}
                    placeholder="0123456789"
                    required
                    error={fieldErrors.teammate_0}
                    icon={ShieldCheck}
                  />
                  <FormInput
                    label="Teammate 1 In-Game Name (IGN)"
                    name="teammate_ign_0"
                    value={formData.teammateIgns[0]}
                    onChange={(e) => handleTeammateChange(0, 'ign', e.target.value)}
                    placeholder="e.g. 亗 Ꭲ ɪ ᴛ ᴀ ɴ 亗"
                    required
                    error={fieldErrors.teammate_ign_0}
                    icon={User}
                  />
                </div>
              </div>
            )}

            {mode === 'Squad' && (
              <div className="p-3 bg-[#07090c] rounded-xl border border-[#3a494b]/60 space-y-2.5">
                <div className="flex items-center justify-between border-b border-[#3a494b]/40 pb-1.5">
                  <span className="font-label-caps text-xs font-bold text-[#00f2ff] uppercase tracking-wider block">
                    Squad Teammates Details (3 Required Teammates)
                  </span>
                  <span className="text-[10px] text-[#8e9dae] font-mono">All Roster Members</span>
                </div>
                <div className="space-y-2.5">
                  {[0, 1, 2].map((idx) => (
                    <div key={`squad-member-input-${idx}`} className="p-2.5 bg-[#151a21]/60 rounded-lg border border-[#3a494b]/40 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-[#00f2ff]/80 uppercase tracking-wide">
                          Teammate #{idx + 1}
                        </span>
                        <span className="text-[10px] text-[#8e9dae]">Active Player {idx + 2}/4</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <FormInput
                          label={`Teammate ${idx + 1} Game UID`}
                          name={`teammate_${idx}`}
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={10}
                          showCount
                          value={formData.teammates[idx]}
                          onChange={(e) => handleTeammateChange(idx, 'uid', e.target.value)}
                          placeholder="0123456789"
                          required
                          error={fieldErrors[`teammate_${idx}`]}
                          icon={ShieldCheck}
                        />
                        <FormInput
                          label={`Teammate ${idx + 1} In-Game Name (IGN)`}
                          name={`teammate_ign_${idx}`}
                          value={formData.teammateIgns[idx]}
                          onChange={(e) => handleTeammateChange(idx, 'ign', e.target.value)}
                          placeholder={idx === 0 ? "e.g. KA¹⁷ Mjᶠᶠ" : idx === 1 ? "e.g. ꧁༺NINJA༻꧂" : "e.g. V² | ᴀ ᴋ ᴀ ʏ"}
                          required
                          error={fieldErrors[`teammate_ign_${idx}`]}
                          icon={User}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SECTION 3: TOGGLE SWITCHES */}
            <div className="p-3 bg-[#07090c] border border-[#3a494b]/60 rounded-xl space-y-2.5">
              <span className="font-label-caps text-[11px] font-bold text-[#00f2ff] uppercase tracking-wider block border-b border-[#3a494b]/40 pb-1.5">
                OPTIONS & AGREEMENTS
              </span>

              <div className="space-y-2">
                {/* TOGGLE SWITCH 1: ANTI-CHEAT SCREEN RECORDING */}
                <ToggleSwitch
                  id="antiCheatAgreement"
                  name="antiCheatAgreement"
                  checked={formData.antiCheatAgreement}
                  onChange={handleChange}
                  label="Mandatory Anti-Cheat & Screen Record Agreement"
                  required={true}
                  error={fieldErrors.antiCheatAgreement}
                  color="orange"
                />

                {/* TOGGLE SWITCH 2: ACCEPT RULEBOOK & GUIDELINES */}
                <ToggleSwitch
                  id="acceptRules"
                  name="acceptRules"
                  checked={formData.acceptRules}
                  onChange={handleChange}
                  label="Accept Tournament Rulebook & Code of Conduct"
                  required={true}
                  error={fieldErrors.acceptRules}
                  color="cyan"
                />
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="pt-1 space-y-1.5">
              {!isFormValid && (
                <p className="text-[11px] text-[#8e9dae] text-center font-sans">
                  Please complete all required fields and agreements to continue.
                </p>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="flex-1 py-3 text-xs font-bold bg-[#07090c] text-[#8e9dae] border border-[#3a494b] rounded-xl hover:bg-[#1d232c] transition-colors min-h-[44px] disabled:opacity-50 uppercase cursor-pointer"
                >
                  Cancel
                </button>
                <LoadingButton
                  type="submit"
                  loading={isSubmitting}
                  loadingText="Registering..."
                  disabled={!isFormValid || isSubmitting}
                  className="flex-1 py-3"
                >
                  {isFormValid ? 'Confirm Registration' : 'Complete Required Items'}
                </LoadingButton>
              </div>
            </div>
          </form>
        )}

      </div>
    </div>
  )
}
