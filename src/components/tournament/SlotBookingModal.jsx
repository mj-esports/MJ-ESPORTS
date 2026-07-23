import { useState } from 'react'
import { X, Users, Mail, User, ShieldCheck, Phone, CheckSquare, Square } from 'lucide-react'
import { useTournaments } from '../../contexts/TournamentContext'
import { useAuth } from '../../contexts/AuthContext'
import FormInput from '../common/FormInput'
import AuthAlert from '../common/AuthAlert'

export default function SlotBookingModal({ tournament, onClose }) {
  const { registerTeam } = useTournaments()
  const { user } = useAuth()

  const [formData, setFormData] = useState({
    teamName: '',
    captainName: user?.user_metadata?.username || '',
    email: user?.email || '',
    freeFireUid: '',
    whatsappNumber: '',
    acceptRules: false,
  })
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (
      !formData.teamName.trim() ||
      !formData.captainName.trim() ||
      !formData.email.trim() ||
      !formData.freeFireUid.trim() ||
      !formData.whatsappNumber.trim()
    ) {
      setError('Please fill in all required fields.')
      return
    }

    if (!formData.acceptRules) {
      setError('You must accept the tournament rules to complete registration.')
      return
    }

    setIsSubmitting(true)
    try {
      await registerTeam(tournament.id, {
        name: formData.teamName,
        captain: formData.captainName,
        email: formData.email,
        freeFireUid: formData.freeFireUid,
        whatsappNumber: formData.whatsappNumber,
        userId: user?.id || null,
        kills: 0,
        points: 0,
      })

      setSuccess(true)
      setTimeout(() => {
        onClose()
      }, 1500)
    } catch (err) {
      setError(err.message || 'Registration failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white transition-colors"
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
            Slots remaining: <span className="text-emerald-400 font-bold">{tournament.maxTeams - tournament.registeredTeams}</span> / {tournament.maxTeams}
          </p>
        </div>

        {error && <AuthAlert type="error" message={error} />}
        {success && <AuthAlert type="success" message="Tournament slot booked successfully! Redirecting..." />}

        {!success && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormInput
              label="Team Name (or IGN)"
              name="teamName"
              value={formData.teamName}
              onChange={handleChange}
              placeholder="e.g. Total Gaming / Phoenix_99"
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
              label="Email Address (Prefilled)"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="user@example.com"
              required
              icon={Mail}
            />

            <FormInput
              label="Free Fire Character UID"
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
                className="flex-1 py-3.5 text-xs font-semibold bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 transition-colors min-h-[44px]"
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
