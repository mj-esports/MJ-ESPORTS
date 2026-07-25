import { useState } from 'react'
import { X, Users, Mail, User, ShieldCheck, Phone, CheckCircle2, Copy } from 'lucide-react'
import { useTournaments } from '../../contexts/TournamentContext'
import { useAuth } from '../../contexts/AuthContext'
import FormInput from '../common/FormInput'
import AuthAlert from '../common/AuthAlert'

export default function SlotBookingModal({ tournament, onClose }) {
  const { registerTeam } = useTournaments()
  const { user } = useAuth()

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
  }

  const handleTeammateChange = (index, value) => {
    const updated = [...formData.teammates]
    updated[index] = value
    setFormData((prev) => ({ ...prev, teammates: updated }))
  }

  const validateForm = () => {
    if (tournament.status !== 'Registration Open') {
      return 'Registration for this tournament is closed.'
    }

    if ((tournament.registeredTeams || 0) >= (tournament.maxTeams || 32)) {
      return 'All registration slots for this tournament are full.'
    }

    if (
      !formData.teamName.trim() ||
      !formData.captainName.trim() ||
      !formData.email.trim() ||
      !formData.freeFireUid.trim() ||
      !formData.whatsappNumber.trim()
    ) {
      return 'Please fill in all required primary fields.'
    }

    // UID format validation (min 5 characters)
    if (formData.freeFireUid.trim().length < 5) {
      return 'Captain Game UID must be at least 5 digits/characters.'
    }

    // Teammate validations based on mode
    const requiredTeammatesCount = mode === 'Duo' ? 1 : mode === 'Squad' ? 3 : 0
    for (let i = 0; i < requiredTeammatesCount; i++) {
      const uid = formData.teammates[i]?.trim()
      if (!uid) {
        return `Please enter Game UID for Teammate ${i + 1}.`
      }
      if (uid.length < 5) {
        return `Teammate ${i + 1} Game UID must be at least 5 characters.`
      }
      if (uid === formData.freeFireUid.trim()) {
        return `Teammate ${i + 1} Game UID cannot be identical to the Captain's UID.`
      }
    }

    // Check duplicate teammate UIDs among themselves
    const activeTeammateUids = formData.teammates.slice(0, requiredTeammatesCount).map((t) => t.trim())
    const uniqueUids = new Set(activeTeammateUids)
    if (uniqueUids.size !== activeTeammateUids.length) {
      return 'Teammate UIDs must all be unique.'
    }

    if (!formData.acceptRules) {
      return 'You must accept the tournament rules and fair play guidelines.'
    }

    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setIsSubmitting(true)
    const requiredTeammatesCount = mode === 'Duo' ? 1 : mode === 'Squad' ? 3 : 0
    const activeTeammates = formData.teammates.slice(0, requiredTeammatesCount).map((t) => t.trim())

    // Generate unique registration reference ID
    const refId = `REG-MJ-${Date.now().toString(36).toUpperCase()}`

    try {
      const registeredRecord = await registerTeam(tournament.id, {
        refId,
        name: formData.teamName.trim(),
        captain: formData.captainName.trim(),
        email: formData.email.trim(),
        freeFireUid: formData.freeFireUid.trim(),
        whatsappNumber: formData.whatsappNumber.trim(),
        mode,
        teammates: activeTeammates,
        userId: user?.id || null,
        status: 'Confirmed',
      })

      setRegistrationSummary({
        refId,
        teamName: formData.teamName.trim(),
        captain: formData.captainName.trim(),
        mode,
        freeFireUid: formData.freeFireUid.trim(),
        teammates: activeTeammates,
        status: 'Confirmed',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        registeredRecord,
      })
    } catch (err) {
      setError(err.message || 'Registration failed. Please check your details and try again.')
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white transition-colors"
          aria-label="Close Registration Modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="space-y-1">
          <span className="text-[11px] font-bold text-purple-400 uppercase tracking-widest block">
            SLOT REGISTRATION
          </span>
          <h2 className="text-xl font-extrabold text-white uppercase tracking-tight">
            {tournament.title}
          </h2>
          <p className="text-xs text-slate-400">
            Slots Remaining: <span className="text-emerald-400 font-bold">{Math.max(0, (tournament.maxTeams || 32) - (tournament.registeredTeams || 0))}</span> / {tournament.maxTeams || 32}
          </p>
        </div>

        {error && <AuthAlert type="error" message={error} />}

        {/* SUCCESS CONFIRMATION DIALOG */}
        {registrationSummary ? (
          <div className="space-y-6 pt-2">
            <div className="p-5 bg-slate-950 border border-emerald-800/60 rounded-2xl space-y-4 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-950 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400 shadow-lg">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white uppercase tracking-wide">Slot Registration Confirmed!</h3>
                <p className="text-xs text-slate-400 mt-0.5">Your team has been successfully entered into the tournament.</p>
              </div>

              {/* Reference Ticket Card */}
              <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 text-left space-y-2.5 text-xs">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400 font-semibold">Reference ID</span>
                  <div className="flex items-center gap-1.5 font-mono text-cyan-300 font-bold">
                    <span>{registrationSummary.refId}</span>
                    <button
                      onClick={handleCopyRef}
                      className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                      title="Copy Reference ID"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    {copied && <span className="text-[10px] text-emerald-400 font-sans font-bold">Copied!</span>}
                  </div>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Team Name</span>
                  <span className="font-extrabold text-white">{registrationSummary.teamName}</span>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Format Mode</span>
                  <span className="font-bold text-purple-300">{registrationSummary.mode} Mode</span>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Captain UID</span>
                  <span className="font-bold text-cyan-400">{registrationSummary.freeFireUid}</span>
                </div>

                {registrationSummary.teammates.length > 0 && (
                  <div className="py-1 border-b border-slate-800 space-y-1">
                    <span className="text-slate-400 block">Teammate UIDs</span>
                    <div className="flex flex-wrap gap-1.5">
                      {registrationSummary.teammates.map((uid, idx) => (
                        <span key={`summary-t-${idx}`} className="px-2 py-0.5 rounded bg-slate-950 text-slate-300 font-mono text-[10px] border border-slate-800">
                          P{idx + 2}: {uid}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-between pt-1">
                  <span className="text-slate-400">Status</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-950 text-emerald-400 border border-emerald-800 uppercase">
                    {registrationSummary.status}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3.5 text-xs font-bold text-slate-950 bg-gradient-to-r from-purple-400 via-indigo-300 to-cyan-300 rounded-xl hover:brightness-110 shadow-lg min-h-[44px]"
            >
              Done & Return
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Solo / Duo / Squad Mode Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Select Competition Format Mode
              </label>
              <div className="grid grid-cols-3 gap-2">
                {['Solo', 'Duo', 'Squad'].map((m) => (
                  <button
                    key={`mode-select-${m}`}
                    type="button"
                    onClick={() => setMode(m)}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all border min-h-[40px] flex items-center justify-center gap-1.5 ${
                      mode === m
                        ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-600/30'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
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
              placeholder={mode === 'Solo' ? 'e.g. Phoenix_99' : 'e.g. Total Gaming / Orangutan'}
              required
              icon={Users}
            />

            <FormInput
              label="Captain Name"
              name="captainName"
              value={formData.captainName}
              onChange={handleChange}
              placeholder="e.g. Ajjubhai"
              required
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
              icon={Mail}
            />

            <FormInput
              label="Captain Game Character UID"
              name="freeFireUid"
              value={formData.freeFireUid}
              onChange={handleChange}
              placeholder="e.g. 518920412"
              required
              icon={ShieldCheck}
            />

            <FormInput
              label="WhatsApp Contact Number"
              name="whatsappNumber"
              type="tel"
              value={formData.whatsappNumber}
              onChange={handleChange}
              placeholder="+91 9876543210"
              required
              icon={Phone}
            />

            {/* DYNAMIC TEAMMATE UID FIELDS BASED ON MODE */}
            {mode === 'Duo' && (
              <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider block">
                  Duo Teammate Details
                </span>
                <FormInput
                  label="Teammate 1 Game UID"
                  name="teammate-0"
                  value={formData.teammates[0]}
                  onChange={(e) => handleTeammateChange(0, e.target.value)}
                  placeholder="e.g. 518920413"
                  required
                  icon={ShieldCheck}
                />
              </div>
            )}

            {mode === 'Squad' && (
              <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider block">
                  Squad Teammates Details (3 Players)
                </span>
                <FormInput
                  label="Teammate 1 Game UID"
                  name="teammate-0"
                  value={formData.teammates[0]}
                  onChange={(e) => handleTeammateChange(0, e.target.value)}
                  placeholder="e.g. 518920413"
                  required
                  icon={ShieldCheck}
                />
                <FormInput
                  label="Teammate 2 Game UID"
                  name="teammate-1"
                  value={formData.teammates[1]}
                  onChange={(e) => handleTeammateChange(1, e.target.value)}
                  placeholder="e.g. 518920414"
                  required
                  icon={ShieldCheck}
                />
                <FormInput
                  label="Teammate 3 Game UID"
                  name="teammate-2"
                  value={formData.teammates[2]}
                  onChange={(e) => handleTeammateChange(2, e.target.value)}
                  placeholder="e.g. 518920415"
                  required
                  icon={ShieldCheck}
                />
              </div>
            )}

            {/* Accept Rules Checkbox */}
            <div className="pt-2 flex items-start gap-3 text-xs text-slate-300">
              <input
                type="checkbox"
                id="acceptRules"
                name="acceptRules"
                checked={formData.acceptRules}
                onChange={handleChange}
                className="mt-0.5 w-4 h-4 rounded bg-slate-950 border-slate-800 text-purple-600 focus:ring-purple-500 cursor-pointer"
              />
              <label htmlFor="acceptRules" className="cursor-pointer select-none leading-relaxed">
                I agree to the tournament rules, fair play guidelines, and device verification requirements.
              </label>
            </div>

            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 py-3.5 text-xs font-semibold bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 transition-colors min-h-[44px] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-3.5 text-xs font-bold text-slate-950 bg-gradient-to-r from-purple-400 via-indigo-300 to-cyan-300 rounded-xl hover:brightness-110 shadow-lg shadow-purple-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2 min-h-[44px]"
              >
                {isSubmitting ? 'Registering...' : 'Confirm Registration'}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  )
}
