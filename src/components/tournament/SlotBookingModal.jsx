import { useState, useEffect } from 'react'
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
  Calendar,
  Hash,
  Sparkles,
  Smartphone,
  ShieldAlert
} from 'lucide-react'
import { useTournaments } from '../../contexts/TournamentContext'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import FormInput from '../common/FormInput'
import AuthAlert from '../common/AuthAlert'
import LoadingButton from '../common/LoadingButton'
import ToggleSwitch from '../common/ToggleSwitch'
import {
  isValidEmail,
  isValidGameUid,
  isValidPhoneNumber,
  isValidTeamName,
  sanitizeString,
} from '../../utils/validationUtils'

// Helper function to resolve tournament format mode
export function getTournamentMode(tournament) {
  if (!tournament) {
    return { mode: 'Squad', requiredPlayers: 4, formatTitle: 'Squad Battle Royale' }
  }

  const rawFormat = (
    tournament.match_format ||
    tournament.matchFormat ||
    tournament.format ||
    ''
  ).trim()

  const lowerFmt = rawFormat.toLowerCase()
  const teamSize = Number(tournament.team_size ?? tournament.teamSize ?? 0)

  if (teamSize === 1 || lowerFmt.includes('solo')) {
    return {
      mode: 'Solo',
      requiredPlayers: 1,
      formatTitle: rawFormat || 'Solo Battle Royale',
    }
  }

  if (teamSize === 2 || lowerFmt.includes('duo')) {
    return {
      mode: 'Duo',
      requiredPlayers: 2,
      formatTitle: rawFormat || 'Duo Battle Royale',
    }
  }

  return {
    mode: 'Squad',
    requiredPlayers: 4,
    formatTitle: rawFormat || 'Squad Battle Royale',
  }
}

export default function SlotBookingModal({ tournament, onClose }) {
  const { registerTeam } = useTournaments()
  const { user } = useAuth()
  const { showSuccess, showError } = useToast()

  // Calculate max date of birth for 13 years old check (2026 - 13 = 2013)
  const maxDobDate = '2013-12-31'

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
    captainDob: '2004-06-15',
    playerAge: 20,
    preferredSeed: 1,
    availabilityDate: tournament?.startDate || '2026-08-06',
    hasSubstitutes: false,
    substituteCount: 1,
    substituteUids: [''],
    enableSmsAlerts: true,
    antiCheatAgreement: true,
    acceptRules: false,
    teammates: ['', '', ''],
  })

  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError] = useState(null)
  const [registrationSummary, setRegistrationSummary] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    const newValue = type === 'checkbox' ? checked : value
    setFormData((prev) => ({
      ...prev,
      [name]: newValue,
    }))
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: null }))
    }
  }

  const handleTeammateChange = (index, value) => {
    const updated = [...formData.teammates]
    updated[index] = value
    setFormData((prev) => ({ ...prev, teammates: updated }))
    const fieldKey = `teammate_${index}`
    if (fieldErrors[fieldKey]) {
      setFieldErrors((prev) => ({ ...prev, [fieldKey]: null }))
    }
    if (fieldErrors.teammates) {
      setFieldErrors((prev) => ({ ...prev, teammates: null }))
    }
  }

  const handleSubstituteUidChange = (index, value) => {
    const updated = [...formData.substituteUids]
    updated[index] = value
    setFormData((prev) => ({ ...prev, substituteUids: updated }))
    const fieldKey = `sub_uid_${index}`
    if (fieldErrors[fieldKey]) {
      setFieldErrors((prev) => ({ ...prev, [fieldKey]: null }))
    }
  }

  const validateForm = () => {
    const newFieldErrors = {}

    if (tournament.status !== 'Registration Open') {
      return 'Registration for this tournament is currently closed.'
    }

    if ((tournament.registeredTeams || 0) >= (tournament.maxTeams || 32)) {
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

    // Game UID Validation
    if (!cleanCaptainUid) {
      newFieldErrors.freeFireUid = 'Game Character UID is required'
    } else if (!isValidGameUid(cleanCaptainUid)) {
      newFieldErrors.freeFireUid = 'Game UID must be 8-12 alphanumeric characters'
    }

    // Contact Number Validation
    if (!cleanPhone) {
      newFieldErrors.whatsappNumber = 'WhatsApp Contact Number is required'
    } else if (!isValidPhoneNumber(cleanPhone)) {
      newFieldErrors.whatsappNumber = 'Please enter a valid 10-digit WhatsApp number'
    }

    // Native Date Picker DOB Validation (Age 13+)
    if (!formData.captainDob) {
      newFieldErrors.captainDob = 'Date of Birth is required'
    } else {
      const dobYear = new Date(formData.captainDob).getFullYear()
      const currentYear = new Date().getFullYear()
      if (currentYear - dobYear < 13) {
        newFieldErrors.captainDob = 'Players must be at least 13 years old to participate'
      }
    }

    // Number Input: Player Age Validation
    const ageNum = Number(formData.playerAge)
    if (isNaN(ageNum) || ageNum < 13 || ageNum > 99) {
      newFieldErrors.playerAge = 'Age must be a valid number between 13 and 99'
    }

    // Number Input: Preferred Seed Validation
    const seedNum = Number(formData.preferredSeed)
    if (isNaN(seedNum) || seedNum < 1 || seedNum > (tournament.maxTeams || 32)) {
      newFieldErrors.preferredSeed = `Seed must be between 1 and ${tournament.maxTeams || 32}`
    }

    // Dynamic Teammate UIDs Validation
    const requiredTeammatesCount = mode === 'Duo' ? 1 : mode === 'Squad' ? 3 : 0
    for (let i = 0; i < requiredTeammatesCount; i++) {
      const uid = sanitizeString(formData.teammates[i])
      const fieldKey = `teammate_${i}`
      if (!uid) {
        newFieldErrors[fieldKey] = `Game UID for Teammate ${i + 1} is required for ${mode} mode`
      } else if (!isValidGameUid(uid)) {
        newFieldErrors[fieldKey] = `Teammate ${i + 1} Game UID must be 8-12 alphanumeric characters`
      } else if (uid === cleanCaptainUid) {
        newFieldErrors[fieldKey] = `Teammate ${i + 1} Game UID cannot be identical to Captain's UID`
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

    // Substitute Players Validation (if toggle is active)
    if (formData.hasSubstitutes) {
      const subCount = Number(formData.substituteCount)
      if (isNaN(subCount) || subCount < 1 || subCount > 2) {
        newFieldErrors.substituteCount = 'Substitute count must be 1 or 2'
      }
      for (let s = 0; s < subCount; s++) {
        const subUid = sanitizeString(formData.substituteUids[s])
        const subKey = `sub_uid_${s}`
        if (subUid && !isValidGameUid(subUid)) {
          newFieldErrors[subKey] = `Substitute ${s + 1} UID must be 8-12 characters`
        }
      }
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

    const refId = `REG-MJ-${Date.now().toString(36).toUpperCase()}`

    try {
      // Local or Context registration (No Supabase mandatory)
      let registeredRecord = null
      if (registerTeam) {
        registeredRecord = await registerTeam(tournament.id, {
          refId,
          name: sanitizeString(formData.teamName),
          captain: sanitizeString(formData.captainName),
          email: sanitizeString(formData.email),
          freeFireUid: sanitizeString(formData.freeFireUid),
          whatsappNumber: sanitizeString(formData.whatsappNumber),
          captainDob: formData.captainDob,
          playerAge: formData.playerAge,
          preferredSeed: formData.preferredSeed,
          hasSubstitutes: formData.hasSubstitutes,
          enableSmsAlerts: formData.enableSmsAlerts,
          mode,
          teammates: activeTeammates,
          userId: user?.id || `guest-${Date.now()}`,
          status: 'Approved',
        })
      }

      showSuccess('Tournament Registered', 'Registration Confirmed')

      setRegistrationSummary({
        refId,
        teamName: sanitizeString(formData.teamName),
        captain: sanitizeString(formData.captainName),
        mode,
        freeFireUid: sanitizeString(formData.freeFireUid),
        teammates: activeTeammates,
        captainDob: formData.captainDob,
        playerAge: formData.playerAge,
        preferredSeed: formData.preferredSeed,
        status: 'Approved',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        registeredRecord,
      })
    } catch (err) {
      console.warn('[Registration Fallback]:', err)
      // Local fallback in case context/network encounters issue
      setRegistrationSummary({
        refId,
        teamName: sanitizeString(formData.teamName),
        captain: sanitizeString(formData.captainName),
        mode,
        freeFireUid: sanitizeString(formData.freeFireUid),
        teammates: activeTeammates,
        status: 'Approved (Local)',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      })
      showSuccess('Registration Confirmed (Local State)', 'Entry Confirmed')
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

  const remainingSlots = Math.max(0, (tournament.maxTeams || 32) - (tournament.registeredTeams || 0))

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
        className="bg-[#151a21] border border-[#3a494b] rounded-2xl max-w-2xl w-full p-4 sm:p-7 space-y-5 shadow-[0_0_50px_rgba(0,242,255,0.15)] relative max-h-[92vh] overflow-y-auto"
      >

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-[#07090c] border border-[#3a494b] text-[#8e9dae] hover:text-[#00f2ff] hover:border-[#00f2ff]/50 transition-all cursor-pointer"
          aria-label="Close Registration Modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header & Branding */}
        <div className="space-y-1.5 border-b border-[#3a494b]/50 pb-4">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#00f2ff]" />
            <span className="font-label-caps text-[11px] font-extrabold text-[#00f2ff] uppercase tracking-widest block">
              MJ ESPORTS OFFICIAL REGISTRATION
            </span>
          </div>
          <h2 id="slot-booking-modal-title" className="font-display-lg text-xl sm:text-2xl font-extrabold text-white uppercase tracking-tight italic">
            {tournament.title}
          </h2>
          <div className="flex items-center gap-3 text-xs text-[#8e9dae] pt-0.5">
            <span>Game: <strong className="text-white">{tournament.game || 'Esports'}</strong></span>
            <span className="text-[#3a494b]">•</span>
            <span>
              Slots Remaining:{' '}
              <span className="font-mono text-[#00ff9d] font-bold">
                {remainingSlots}
              </span>{' '}
              / {tournament.maxTeams || 32}
            </span>
          </div>
        </div>

        {error && <AuthAlert type="error" message={error} />}

        {/* SUCCESS CONFIRMATION DIALOG */}
        {registrationSummary ? (
          <div className="space-y-6 pt-2">
            <div className="p-5 bg-[#07090c] border border-[#00ff9d]/40 rounded-2xl space-y-4 text-center">
              <div className="w-12 h-12 rounded-full bg-[#00ff9d]/20 border border-[#00ff9d] flex items-center justify-center mx-auto text-[#00ff9d] shadow-[0_0_15px_rgba(0,255,157,0.3)]">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-display-lg text-lg font-bold text-white uppercase tracking-wide">Slot Registration Confirmed!</h3>
                <p className="text-xs text-[#8e9dae] mt-0.5">Your entry has been validated and recorded into local state.</p>
              </div>

              {/* Reference Ticket Card */}
              <div className="p-4 bg-[#151a21] rounded-xl border border-[#3a494b]/60 text-left space-y-2.5 text-xs font-mono">
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

                {registrationSummary.captainDob && (
                  <div className="flex justify-between py-1 border-b border-[#3a494b]/60">
                    <span className="text-[#8e9dae]">DOB & Age</span>
                    <span className="text-white">{registrationSummary.captainDob} (Age {registrationSummary.playerAge})</span>
                  </div>
                )}

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
              className="btn-cyber-primary w-full justify-center py-3.5 min-h-[44px] cursor-pointer"
            >
              Done & Return
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-5">

            {/* Read-Only Competition Format Card */}
            <div className="p-4 bg-[#07090c] border border-[#00f2ff]/30 rounded-xl space-y-2 shadow-inner">
              <div className="flex items-center justify-between">
                <span className="font-label-caps text-[10px] font-extrabold text-[#8e9dae] uppercase tracking-widest flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-[#00f2ff]" />
                  <span>COMPETITION FORMAT</span>
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#00f2ff]/15 text-[#00f2ff] border border-[#00f2ff]/40 uppercase tracking-widest">
                  {modeConfig.mode} MODE
                </span>
              </div>
              <div className="flex items-center gap-3 pt-0.5">
                <div className="w-9 h-9 rounded-lg bg-[#00f2ff]/10 border border-[#00f2ff]/30 flex items-center justify-center text-[#00f2ff] shrink-0">
                  <Users className="w-5 h-5 text-[#00f2ff]" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-white uppercase tracking-tight">
                    {modeConfig.formatTitle}
                  </h4>
                  <p className="text-xs text-[#00ff9d] font-bold">
                    {modeConfig.requiredPlayers} {modeConfig.requiredPlayers === 1 ? 'Player Required' : 'Players Required per Squad'}
                  </p>
                </div>
              </div>
            </div>

            {/* RESPONSIVE LAYOUT GRID: SECTION 1 - PRIMARY CREDENTIALS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                value={formData.whatsappNumber}
                onChange={handleChange}
                placeholder="9876543210"
                required
                error={fieldErrors.whatsappNumber}
                icon={Phone}
              />

              <FormInput
                label={mode === 'Solo' ? 'Game Character UID' : 'Captain Game Character UID'}
                name="freeFireUid"
                value={formData.freeFireUid}
                onChange={handleChange}
                placeholder="e.g. 518920412"
                required
                error={fieldErrors.freeFireUid}
                icon={ShieldCheck}
              />

              {/* NATIVE DATE PICKER: CAPTAIN DATE OF BIRTH */}
              <div className="space-y-1">
                <label className="flex items-center justify-between font-label-caps text-[11px] font-bold text-[#8e9dae] uppercase">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#00f2ff]" />
                    Date of Birth (DOB)
                  </span>
                  <span className="text-[#ff4655]">*</span>
                </label>
                <input
                  type="date"
                  name="captainDob"
                  max={maxDobDate}
                  value={formData.captainDob}
                  onChange={handleChange}
                  className={`w-full p-3 bg-[#07090c] border rounded-lg text-white text-xs focus:outline-none focus:border-[#00f2ff] ${
                    fieldErrors.captainDob ? 'border-[#ff4655]' : 'border-[#3a494b]'
                  }`}
                />
                {fieldErrors.captainDob && (
                  <p className="text-[11px] text-[#ff4655] font-medium" role="alert">
                    {fieldErrors.captainDob}
                  </p>
                )}
              </div>
            </div>

            {/* RESPONSIVE LAYOUT GRID: SECTION 2 - NUMBER INPUTS */}
            <div className="p-4 bg-[#07090c] border border-[#3a494b]/60 rounded-xl space-y-3">
              <span className="font-label-caps text-xs font-bold text-[#00f2ff] uppercase tracking-wider block border-b border-[#3a494b]/40 pb-2">
                Squad Metrics & Number Inputs
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* NUMBER INPUT 1: PLAYER AGE */}
                <div className="space-y-1">
                  <label className="flex items-center justify-between font-label-caps text-[11px] font-bold text-[#8e9dae] uppercase">
                    <span className="flex items-center gap-1.5">
                      <Hash className="w-3.5 h-3.5 text-[#00ff9d]" />
                      Player Age (Years)
                    </span>
                    <span className="text-[#00ff9d] text-[10px]">Min 13+</span>
                  </label>
                  <div className="flex items-center">
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, playerAge: Math.max(13, Number(prev.playerAge) - 1) }))}
                      className="px-3.5 py-2.5 bg-[#151a21] border border-[#3a494b] rounded-l-lg text-white font-bold hover:bg-[#00f2ff]/20 hover:text-[#00f2ff] transition-all cursor-pointer"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      name="playerAge"
                      min={13}
                      max={99}
                      value={formData.playerAge}
                      onChange={handleChange}
                      className="w-full text-center p-2.5 bg-[#07090c] border-y border-[#3a494b] text-white text-xs font-bold font-mono focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, playerAge: Math.min(99, Number(prev.playerAge) + 1) }))}
                      className="px-3.5 py-2.5 bg-[#151a21] border border-[#3a494b] rounded-r-lg text-white font-bold hover:bg-[#00f2ff]/20 hover:text-[#00f2ff] transition-all cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                  {fieldErrors.playerAge && (
                    <p className="text-[11px] text-[#ff4655] font-medium" role="alert">
                      {fieldErrors.playerAge}
                    </p>
                  )}
                </div>

                {/* NUMBER INPUT 2: PREFERRED SEED SLOT */}
                <div className="space-y-1">
                  <label className="flex items-center justify-between font-label-caps text-[11px] font-bold text-[#8e9dae] uppercase">
                    <span className="flex items-center gap-1.5">
                      <Hash className="w-3.5 h-3.5 text-[#a855f7]" />
                      Preferred Slot Position
                    </span>
                    <span className="text-[#a855f7] text-[10px]">1 - {tournament.maxTeams || 32}</span>
                  </label>
                  <input
                    type="number"
                    name="preferredSeed"
                    min={1}
                    max={tournament.maxTeams || 32}
                    value={formData.preferredSeed}
                    onChange={handleChange}
                    className="w-full p-2.5 bg-[#07090c] border border-[#3a494b] rounded-lg text-white text-xs font-bold font-mono focus:outline-none focus:border-[#a855f7]"
                  />
                  {fieldErrors.preferredSeed && (
                    <p className="text-[11px] text-[#ff4655] font-medium" role="alert">
                      {fieldErrors.preferredSeed}
                    </p>
                  )}
                </div>

              </div>
            </div>

            {/* DYNAMIC TEAMMATE UID FIELDS BASED ON TOURNAMENT FORMAT MODE */}
            {mode === 'Duo' && (
              <div className="p-4 bg-[#07090c] rounded-xl border border-[#3a494b]/60 space-y-3">
                <span className="font-label-caps text-xs font-bold text-[#00f2ff] uppercase tracking-wider block">
                  Duo Teammate Details (1 Required Teammate)
                </span>
                <FormInput
                  label="Teammate 1 Game UID"
                  name="teammate-0"
                  value={formData.teammates[0]}
                  onChange={(e) => handleTeammateChange(0, e.target.value)}
                  placeholder="e.g. 518920413"
                  required
                  error={fieldErrors.teammate_0}
                  icon={ShieldCheck}
                />
              </div>
            )}

            {mode === 'Squad' && (
              <div className="p-4 bg-[#07090c] rounded-xl border border-[#3a494b]/60 space-y-3">
                <span className="font-label-caps text-xs font-bold text-[#00f2ff] uppercase tracking-wider block">
                  Squad Teammates Details (3 Required Teammates)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <FormInput
                    label="Teammate 1 UID"
                    name="teammate-0"
                    value={formData.teammates[0]}
                    onChange={(e) => handleTeammateChange(0, e.target.value)}
                    placeholder="e.g. 518920413"
                    required
                    error={fieldErrors.teammate_0}
                    icon={ShieldCheck}
                  />
                  <FormInput
                    label="Teammate 2 UID"
                    name="teammate-1"
                    value={formData.teammates[1]}
                    onChange={(e) => handleTeammateChange(1, e.target.value)}
                    placeholder="e.g. 518920414"
                    required
                    error={fieldErrors.teammate_1}
                    icon={ShieldCheck}
                  />
                  <FormInput
                    label="Teammate 3 UID"
                    name="teammate-2"
                    value={formData.teammates[2]}
                    onChange={(e) => handleTeammateChange(2, e.target.value)}
                    placeholder="e.g. 518920415"
                    required
                    error={fieldErrors.teammate_2}
                    icon={ShieldCheck}
                  />
                </div>
              </div>
            )}

            {/* SECTION 3: TOGGLE SWITCHES */}
            <div className="p-4 bg-[#07090c] border border-[#3a494b]/60 rounded-xl space-y-3">
              <span className="font-label-caps text-xs font-bold text-[#00f2ff] uppercase tracking-wider block border-b border-[#3a494b]/40 pb-2">
                Registration Options & Cyberpunk Toggle Switches
              </span>

              <div className="space-y-3">
                
                {/* TOGGLE SWITCH 1: SUBSTITUTE PLAYERS */}
                <ToggleSwitch
                  id="hasSubstitutes"
                  name="hasSubstitutes"
                  checked={formData.hasSubstitutes}
                  onChange={handleChange}
                  label="Include Reserve Substitute Players"
                  description="Register up to 2 backup roster players for emergency match replacements."
                  color="cyan"
                />

                {/* CONDITIONAL SUBSTITUTE NUMBER INPUT & UIDS */}
                {formData.hasSubstitutes && (
                  <div className="p-3 bg-[#151a21] border border-[#00f2ff]/30 rounded-xl space-y-3 animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white uppercase">Substitute Roster Count</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-[#8e9dae]">Select:</span>
                        <button
                          type="button"
                          onClick={() => setFormData((prev) => ({ ...prev, substituteCount: 1 }))}
                          className={`px-3 py-1 rounded text-xs font-bold border transition-all cursor-pointer ${
                            formData.substituteCount === 1
                              ? 'bg-[#00f2ff] text-black border-[#00f2ff]'
                              : 'bg-[#07090c] text-[#8e9dae] border-[#3a494b]'
                          }`}
                        >
                          1 Sub
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData((prev) => ({ ...prev, substituteCount: 2 }))}
                          className={`px-3 py-1 rounded text-xs font-bold border transition-all cursor-pointer ${
                            formData.substituteCount === 2
                              ? 'bg-[#00f2ff] text-black border-[#00f2ff]'
                              : 'bg-[#07090c] text-[#8e9dae] border-[#3a494b]'
                          }`}
                        >
                          2 Subs
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {Array.from({ length: formData.substituteCount }).map((_, idx) => (
                        <FormInput
                          key={`sub-uid-field-${idx}`}
                          label={`Substitute ${idx + 1} Game UID`}
                          name={`sub_uid_${idx}`}
                          value={formData.substituteUids[idx] || ''}
                          onChange={(e) => handleSubstituteUidChange(idx, e.target.value)}
                          placeholder="e.g. 518920499"
                          error={fieldErrors[`sub_uid_${idx}`]}
                          icon={ShieldCheck}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* TOGGLE SWITCH 2: ROOM CREDENTIALS SMS ALERT */}
                <ToggleSwitch
                  id="enableSmsAlerts"
                  name="enableSmsAlerts"
                  checked={formData.enableSmsAlerts}
                  onChange={handleChange}
                  label="Receive Room Password SMS & WhatsApp Alert"
                  description="Instant SMS notification sent 15 minutes before match kickoff."
                  color="green"
                />

                {/* TOGGLE SWITCH 3: ANTI-CHEAT SCREEN RECORDING */}
                <ToggleSwitch
                  id="antiCheatAgreement"
                  name="antiCheatAgreement"
                  checked={formData.antiCheatAgreement}
                  onChange={handleChange}
                  label="Mandatory Anti-Cheat & Screen Record Agreement"
                  description="Squad agrees to record device screen during official match rounds."
                  required={true}
                  error={fieldErrors.antiCheatAgreement}
                  color="orange"
                />

                {/* TOGGLE SWITCH 4: ACCEPT RULEBOOK & GUIDELINES */}
                <ToggleSwitch
                  id="acceptRules"
                  name="acceptRules"
                  checked={formData.acceptRules}
                  onChange={handleChange}
                  label="Accept Tournament Rulebook & Code of Conduct"
                  description="Required to confirm team eligibility and agree to zero-tolerance toxicity rules."
                  required={true}
                  error={fieldErrors.acceptRules}
                  color="cyan"
                />

              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 py-3.5 text-xs font-bold bg-[#07090c] text-[#8e9dae] border border-[#3a494b] rounded-xl hover:bg-[#1d232c] transition-colors min-h-[44px] disabled:opacity-50 uppercase cursor-pointer"
              >
                Cancel
              </button>
              <LoadingButton
                type="submit"
                loading={isSubmitting}
                loadingText="Registering..."
                className="flex-1 py-3.5"
              >
                Confirm Registration
              </LoadingButton>
            </div>
          </form>
        )}

      </div>
    </div>
  )
}
