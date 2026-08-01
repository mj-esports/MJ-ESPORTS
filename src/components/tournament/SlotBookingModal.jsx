import { useState } from 'react'
import { X, Users, Mail, User, ShieldCheck, Phone, CheckCircle2, Copy } from 'lucide-react'
import { useTournaments } from '../../contexts/TournamentContext'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import FormInput from '../common/FormInput'
import AuthAlert from '../common/AuthAlert'
import LoadingButton from '../common/LoadingButton'
import {
  isValidEmail,
  isValidGameUid,
  isValidPhoneNumber,
  isValidTeamName,
  sanitizeString,
} from '../../utils/validationUtils'

export default function SlotBookingModal({ tournament, onClose }) {
  const { registerTeam } = useTournaments()
  const { user } = useAuth()
  const { showSuccess, showError } = useToast()

  // Determine initial mode based on tournament format string
  const initialMode = tournament?.format?.toLowerCase().includes('solo')
    ? 'Solo'
    : tournament?.format?.toLowerCase().includes('duo')
    ? 'Duo'
    : 'Squad'

  const [mode, setMode] = useState(initialMode)
  const [formData, setFormData] = useState({
    teamName: '',
    captainName: user?.user_metadata?.username || '',
    email: user?.email || '',
    freeFireUid: user?.user_metadata?.freeFireUid || '',
    whatsappNumber: '',
    teammates: ['', '', ''], // Up to 3 teammates for Squad
    acceptRules: false,
  })

  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError] = useState(null)
  const [registrationSummary, setRegistrationSummary] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
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
  }

  const validateForm = () => {
    const newFieldErrors = {}

    if (!user) {
      return 'You must be signed in to register for tournaments.'
    }

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

    if (!cleanTeamName) {
      newFieldErrors.teamName = 'Team Name (or IGN) is required'
    } else if (!isValidTeamName(cleanTeamName)) {
      newFieldErrors.teamName = 'Team Name must be between 3 and 30 characters'
    }

    if (!cleanCaptainName) {
      newFieldErrors.captainName = 'Captain Name is required'
    }

    if (!cleanEmail) {
      newFieldErrors.email = 'Captain Email is required'
    } else if (!isValidEmail(cleanEmail)) {
      newFieldErrors.email = 'Please enter a valid email address'
    }

    if (!cleanCaptainUid) {
      newFieldErrors.freeFireUid = 'Captain Game Character UID is required'
    } else if (!isValidGameUid(cleanCaptainUid)) {
      newFieldErrors.freeFireUid = 'Captain UID must be 8-12 alphanumeric characters'
    }

    if (!cleanPhone) {
      newFieldErrors.whatsappNumber = 'WhatsApp Contact Number is required'
    } else if (!isValidPhoneNumber(cleanPhone)) {
      newFieldErrors.whatsappNumber = 'Please enter a valid 10-digit WhatsApp number'
    }

    // Teammate validations based on mode
    const requiredTeammatesCount = mode === 'Duo' ? 1 : mode === 'Squad' ? 3 : 0
    for (let i = 0; i < requiredTeammatesCount; i++) {
      const uid = sanitizeString(formData.teammates[i])
      const fieldKey = `teammate_${i}`
      if (!uid) {
        newFieldErrors[fieldKey] = `Game UID for Teammate ${i + 1} is required`
      } else if (!isValidGameUid(uid)) {
        newFieldErrors[fieldKey] = `Teammate ${i + 1} Game UID must be 8-12 alphanumeric characters`
      } else if (uid === cleanCaptainUid) {
        newFieldErrors[fieldKey] = `Teammate ${i + 1} Game UID cannot be identical to Captain's UID`
      }
    }

    // Check duplicate teammate UIDs among themselves
    const activeTeammateUids = formData.teammates
      .slice(0, requiredTeammatesCount)
      .map((t) => sanitizeString(t))
      .filter(Boolean)

    const uniqueUids = new Set(activeTeammateUids)
    if (uniqueUids.size !== activeTeammateUids.length) {
      newFieldErrors.teammates = 'All Teammate Game UIDs must be unique'
    }

    if (!formData.acceptRules) {
      newFieldErrors.acceptRules = 'You must accept the tournament rules and fair play guidelines'
    }

    setFieldErrors(newFieldErrors)
    if (Object.keys(newFieldErrors).length > 0) {
      return 'Please correct highlighted errors in the form.'
    }

    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      showError(validationError, 'Registration Input Error')
      return
    }

    setIsSubmitting(true)
    const requiredTeammatesCount = mode === 'Duo' ? 1 : mode === 'Squad' ? 3 : 0
    const activeTeammates = formData.teammates
      .slice(0, requiredTeammatesCount)
      .map((t) => sanitizeString(t))

    // Generate unique registration reference ID
    const refId = `REG-MJ-${Date.now().toString(36).toUpperCase()}`

    try {
      const registeredRecord = await registerTeam(tournament.id, {
        refId,
        name: sanitizeString(formData.teamName),
        captain: sanitizeString(formData.captainName),
        email: sanitizeString(formData.email),
        freeFireUid: sanitizeString(formData.freeFireUid),
        whatsappNumber: sanitizeString(formData.whatsappNumber),
        mode,
        teammates: activeTeammates,
        userId: user?.id || null,
        status: 'Approved',
      })

      showSuccess(`Slot reserved successfully for ${formData.teamName}!`, 'Registration Confirmed')

      setRegistrationSummary({
        refId,
        teamName: sanitizeString(formData.teamName),
        captain: sanitizeString(formData.captainName),
        mode,
        freeFireUid: sanitizeString(formData.freeFireUid),
        teammates: activeTeammates,
        status: 'Approved',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        registeredRecord,
      })
    } catch (err) {
      const msg = err.message || 'Unable to register for the tournament. Please try again.'
      setError(msg)
      showError(err, 'Registration Error')
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="slot-booking-modal-title"
    >
      <div className="bg-[#151a21] border border-[#3a494b] rounded-xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded bg-[#07090c] border border-[#3a494b] text-[#8e9dae] hover:text-white transition-colors"
          aria-label="Close Registration Modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="space-y-1">
          <span className="font-label-caps text-[11px] font-bold text-[#00f2ff] uppercase tracking-widest block">
            SLOT REGISTRATION
          </span>
          <h2 id="slot-booking-modal-title" className="font-display-lg text-xl font-extrabold text-white uppercase tracking-tight">
            {tournament.title}
          </h2>
          <p className="text-xs text-[#8e9dae]">
            Slots Remaining: <span className="font-mono text-[#00ff9d] font-bold">{Math.max(0, (tournament.maxTeams || 32) - (tournament.registeredTeams || 0))}</span> / {tournament.maxTeams || 32}
          </p>
        </div>

        {error && <AuthAlert type="error" message={error} />}

        {/* SUCCESS CONFIRMATION DIALOG */}
        {registrationSummary ? (
          <div className="space-y-6 pt-2">
            <div className="p-5 bg-[#07090c] border border-[#00ff9d]/40 rounded-xl space-y-4 text-center">
              <div className="w-12 h-12 rounded-full bg-[#00ff9d]/20 border border-[#00ff9d] flex items-center justify-center mx-auto text-[#00ff9d] shadow-lg">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-display-lg text-lg font-bold text-white uppercase tracking-wide">Slot Registration Confirmed!</h3>
                <p className="text-xs text-[#8e9dae] mt-0.5">Your team has been successfully entered into the tournament.</p>
              </div>

              {/* Reference Ticket Card */}
              <div className="p-4 bg-[#151a21] rounded border border-[#3a494b]/60 text-left space-y-2.5 text-xs">
                <div className="flex items-center justify-between border-b border-[#3a494b]/60 pb-2">
                  <span className="text-[#8e9dae] font-semibold">Reference ID</span>
                  <div className="flex items-center gap-1.5 font-mono text-[#00f2ff] font-bold">
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
                  <span className="text-[#8e9dae]">Team Name</span>
                  <span className="font-extrabold text-white">{registrationSummary.teamName}</span>
                </div>

                <div className="flex justify-between py-1 border-b border-[#3a494b]/60">
                  <span className="text-[#8e9dae]">Format Mode</span>
                  <span className="font-bold text-[#00f2ff]">{registrationSummary.mode} Mode</span>
                </div>

                <div className="flex justify-between py-1 border-b border-[#3a494b]/60">
                  <span className="text-[#8e9dae]">Captain UID</span>
                  <span className="font-mono font-bold text-[#00f2ff]">{registrationSummary.freeFireUid}</span>
                </div>

                {registrationSummary.teammates.length > 0 && (
                  <div className="py-1 border-b border-[#3a494b]/60 space-y-1">
                    <span className="text-[#8e9dae] block">Teammate UIDs</span>
                    <div className="flex flex-wrap gap-1.5">
                      {registrationSummary.teammates.map((uid, idx) => (
                        <span key={`summary-t-${idx}`} className="px-2 py-0.5 rounded bg-[#07090c] text-[#e1e2e7] font-mono text-[10px] border border-[#3a494b]/60">
                          P{idx + 2}: {uid}
                        </span>
                      ))}
                    </div>
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
              className="btn-cyber-primary w-full justify-center py-3.5 min-h-[44px]"
            >
              Done & Return
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            
            {/* Solo / Duo / Squad Mode Selection */}
            <div className="space-y-1.5">
              <label className="font-label-caps text-xs text-[#e1e2e7] uppercase tracking-wider block">
                Select Competition Format Mode
              </label>
              <div className="grid grid-cols-3 gap-2">
                {['Solo', 'Duo', 'Squad'].map((m) => (
                  <button
                    key={`mode-select-${m}`}
                    type="button"
                    onClick={() => setMode(m)}
                    className={`py-2.5 px-3 rounded text-xs font-bold uppercase transition-all border min-h-[40px] flex items-center justify-center gap-1.5 ${
                      mode === m
                        ? 'bg-[#00f2ff] text-[#00363a] border-[#00f2ff] font-extrabold shadow-[0_0_12px_rgba(0,242,255,0.4)]'
                        : 'bg-[#07090c] text-[#8e9dae] border-[#3a494b] hover:text-white'
                    }`}
                  >
                    <span>{m}</span>
                    {m === 'Solo' && <span className="text-[10px] opacity-75">(1P)</span>}
                    {m === 'Duo' && <span className="text-[10px] opacity-75">(2P)</span>}
                    {m === 'Squad' && <span className="text-[10px] opacity-75">(4P)</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Primary Form Inputs */}
            <FormInput
              label="Team Name (or IGN for Solo)"
              name="teamName"
              value={formData.teamName}
              onChange={handleChange}
              placeholder={mode === 'Solo' ? 'e.g. Phoenix_99' : 'e.g. Phoenix Squad / Alpha Team'}
              required
              error={fieldErrors.teamName}
              icon={Users}
            />

            <FormInput
              label="Captain Name"
              name="captainName"
              value={formData.captainName}
              onChange={handleChange}
              placeholder="e.g. Rahul Sharma"
              required
              error={fieldErrors.captainName}
              icon={User}
            />

            <FormInput
              label="Captain Email (Prefilled)"
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
              label="Captain Game Character UID"
              name="freeFireUid"
              value={formData.freeFireUid}
              onChange={handleChange}
              placeholder="e.g. 518920412"
              required
              error={fieldErrors.freeFireUid}
              icon={ShieldCheck}
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

            {/* DYNAMIC TEAMMATE UID FIELDS BASED ON MODE */}
            {mode === 'Duo' && (
              <div className="p-3.5 bg-[#07090c] rounded border border-[#3a494b]/60 space-y-3">
                <span className="font-label-caps text-xs font-bold text-[#00f2ff] uppercase tracking-wider block">
                  Duo Teammate Details
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
              <div className="p-3.5 bg-[#07090c] rounded border border-[#3a494b]/60 space-y-3">
                <span className="font-label-caps text-xs font-bold text-[#00f2ff] uppercase tracking-wider block">
                  Squad Teammates Details (3 Players)
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
                <FormInput
                  label="Teammate 2 Game UID"
                  name="teammate-1"
                  value={formData.teammates[1]}
                  onChange={(e) => handleTeammateChange(1, e.target.value)}
                  placeholder="e.g. 518920414"
                  required
                  error={fieldErrors.teammate_1}
                  icon={ShieldCheck}
                />
                <FormInput
                  label="Teammate 3 Game UID"
                  name="teammate-2"
                  value={formData.teammates[2]}
                  onChange={(e) => handleTeammateChange(2, e.target.value)}
                  placeholder="e.g. 518920415"
                  required
                  error={fieldErrors.teammate_2}
                  icon={ShieldCheck}
                />
              </div>
            )}

            {fieldErrors.teammates && (
              <p className="text-xs text-[#ff3366] font-medium" role="alert">
                {fieldErrors.teammates}
              </p>
            )}

            {/* Accept Rules Checkbox */}
            <div className="pt-2 space-y-1">
              <div className="flex items-start gap-3 text-xs text-[#e1e2e7]">
                <input
                  type="checkbox"
                  id="acceptRules"
                  name="acceptRules"
                  checked={formData.acceptRules}
                  onChange={handleChange}
                  className="mt-0.5 w-4 h-4 rounded bg-[#07090c] border-[#3a494b] text-[#00f2ff] focus:ring-[#00f2ff] cursor-pointer"
                />
                <label htmlFor="acceptRules" className="cursor-pointer select-none leading-relaxed">
                  I agree to the tournament rules, fair play guidelines, and device verification requirements.
                </label>
              </div>
              {fieldErrors.acceptRules && (
                <p className="text-xs text-[#ff3366] font-medium pl-7" role="alert">
                  {fieldErrors.acceptRules}
                </p>
              )}
            </div>

            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 py-3.5 text-xs font-bold bg-[#07090c] text-[#8e9dae] border border-[#3a494b] rounded hover:bg-[#1d232c] transition-colors min-h-[44px] disabled:opacity-50 uppercase"
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
