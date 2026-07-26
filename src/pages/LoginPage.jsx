import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Mail, Lock, LogIn, Swords, ArrowRight, KeyRound } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import FormInput from '../components/common/FormInput'
import AuthAlert from '../components/common/AuthAlert'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { signIn, requestPasswordReset } = useAuth()

  const from = location.state?.from?.pathname || '/'

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [alert, setAlert] = useState(null)
  
  // Forgot Password Modal State
  const [showForgotModal, setShowForgotModal] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotSubmitting, setForgotSubmitting] = useState(false)
  const [forgotSent, setForgotSent] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }))
    }
  }

  const validate = () => {
    const newErrors = {}
    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Enter a valid email address'
    }

    if (!formData.password) {
      newErrors.password = 'Password is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setAlert(null)

    if (!validate()) return

    setIsSubmitting(true)
    try {
      await signIn(formData.email, formData.password)
      setAlert({ type: 'success', message: 'Sign in successful! Redirecting...' })
      setTimeout(() => {
        navigate(from, { replace: true })
      }, 1000)
    } catch (err) {
      console.error('Login Error:', err)
      setAlert({
        type: 'error',
        message: err.message || 'Failed to sign in. Please check your credentials.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault()
    if (!forgotEmail || !/\S+@\S+\.\S+/.test(forgotEmail)) return

    setForgotSubmitting(true)
    try {
      await requestPasswordReset(forgotEmail)
      setForgotSent(true)
    } catch (err) {
      console.error('Forgot Password Error:', err)
      setForgotSent(true) // Privacy Preservation: Never reveal errors or non-existence
    } finally {
      setForgotSubmitting(false)
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-lg bg-[#00f2ff] p-[1px] mx-auto shadow-[0_0_15px_rgba(0,242,255,0.4)]">
            <div className="w-full h-full bg-[#07090c] rounded-[7px] flex items-center justify-center">
              <Swords className="w-6 h-6 text-[#00f2ff]" />
            </div>
          </div>
          <h1 className="font-display-lg text-2xl font-extrabold text-white tracking-tight uppercase">
            ACCOUNT LOGIN
          </h1>
          <p className="text-xs text-[#8e9dae]">
            Sign in to access your esports profile, squad rosters, and competitions.
          </p>
        </div>

        {/* Card Form */}
        <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-6 sm:p-8 space-y-6 shadow-2xl">
          {alert && <AuthAlert type={alert.type} message={alert.message} />}

          <form onSubmit={handleSubmit} className="space-y-4">
            <FormInput
              label="Email Address"
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="user@example.com"
              required
              error={errors.email}
              icon={Mail}
            />

            <div className="space-y-1">
              <FormInput
                label="Password"
                id="password"
                name="password"
                isPassword
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                required
                error={errors.password}
                icon={Lock}
              />
              <div className="text-right pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setForgotEmail(formData.email)
                    setShowForgotModal(true)
                  }}
                  className="text-xs font-bold text-[#00f2ff] hover:underline transition-colors uppercase tracking-wider"
                >
                  Forgot Password?
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-cyber-primary w-full justify-center py-3.5 mt-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-[#00363a] border-t-transparent rounded-full animate-spin"></div>
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>

          <div className="pt-4 border-t border-[#3a494b]/60 text-center text-xs text-[#8e9dae]">
            Don't have an account?{' '}
            <Link to="/register" className="font-bold text-[#00f2ff] hover:underline transition-colors inline-flex items-center gap-1 uppercase tracking-wider">
              <span>Register Now</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#151a21] border border-[#3a494b] rounded-xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-display-lg text-lg font-bold text-white uppercase flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-[#00f2ff]" />
              <span>Reset Password</span>
            </h3>
            {forgotSent ? (
              <div className="space-y-4">
                <AuthAlert
                  type="success"
                  message="If an account exists for that email address, password reset instructions have been sent."
                />
                <button
                  onClick={() => {
                    setShowForgotModal(false)
                    setForgotSent(false)
                  }}
                  className="w-full py-2.5 text-xs font-bold bg-[#07090c] text-[#e1e2e7] border border-[#3a494b] rounded hover:bg-[#1d232c] min-h-[44px] uppercase"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                <p className="text-xs text-[#8e9dae] leading-relaxed">
                  Enter your registered email address to receive password reset instructions.
                </p>
                <FormInput
                  label="Email Address"
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="user@example.com"
                  required
                  icon={Mail}
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="flex-1 py-2.5 text-xs font-bold bg-[#07090c] text-[#8e9dae] border border-[#3a494b] rounded hover:bg-[#1d232c] transition-colors min-h-[44px] uppercase"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={forgotSubmitting}
                    className="btn-cyber-primary flex-1 justify-center py-2.5 min-h-[44px]"
                  >
                    {forgotSubmitting ? 'Sending...' : 'Send Link'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
