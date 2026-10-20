import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { User, Mail, Lock, UserPlus, ArrowRight, Check } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import FormInput from '../components/common/FormInput'
import AuthAlert from '../components/common/AuthAlert'
import LoadingButton from '../components/common/LoadingButton'
import { isValidEmail, sanitizeString, isStrongPassword, evaluatePasswordStrength } from '../utils/validationUtils'
import TurnstileWidget from '../components/common/TurnstileWidget'
import { isTurnstileEnabled, verifyTurnstileToken } from '../services/turnstileService'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { signUp, signIn } = useAuth()
  const { showSuccess, showError } = useToast()

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [alert, setAlert] = useState(null)
  const [turnstileToken, setTurnstileToken] = useState(null)
  const [turnstileKey, setTurnstileKey] = useState(0)

  const pwdStrength = evaluatePasswordStrength(formData.password)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }))
    }
  }

  const validate = () => {
    const newErrors = {}
    const cleanUsername = (formData.username || '').trim()
    const cleanEmail = (formData.email || '').trim()

    if (!cleanUsername) {
      newErrors.username = 'Username is required.'
    } else if (cleanUsername.length > 50) {
      newErrors.username = 'Username cannot exceed 50 characters.'
    }

    if (!cleanEmail) {
      newErrors.email = 'Email address is required'
    } else if (!isValidEmail(cleanEmail)) {
      newErrors.email = 'Please enter a valid email address'
    }

    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long.'
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password'
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setAlert(null)

    if (!validate() || isSubmitting) return

    const cleanUsername = sanitizeString(formData.username)
    const cleanEmail = (formData.email || '').trim()

    // Turnstile bot protection check
    if (isTurnstileEnabled()) {
      if (!turnstileToken) {
        setAlert({
          type: 'error',
          message: 'Please complete the security check (Cloudflare Turnstile) before creating an account.',
        })
        return
      }

      setIsSubmitting(true)
      const verifyRes = await verifyTurnstileToken(turnstileToken, { action: 'register' })
      if (!verifyRes?.success) {
        setIsSubmitting(false)
        setTurnstileToken(null)
        setTurnstileKey((k) => k + 1)
        const errorMsg = verifyRes?.message || 'Security verification failed. Please try again.'
        setAlert({ type: 'error', message: errorMsg })
        showError(errorMsg, 'Security Check Failed')
        return
      }
    } else {
      setIsSubmitting(true)
    }

    try {
      // 1. Sign up user (creates Auth user, user_roles, and profiles automatically)
      const signUpResult = await signUp(cleanEmail, formData.password, {
        username: cleanUsername,
      })

      // 2. Ensure user is logged in (auto sign-in if session was not returned by signUp)
      if (!signUpResult?.session) {
        try {
          await signIn(cleanEmail, formData.password)
        } catch (signInErr) {
          console.warn('Auto sign-in fallback:', signInErr.message)
        }
      }

      showSuccess('Account created successfully! Welcome to the Arena.', 'Registration Complete')
      setAlert({
        type: 'success',
        message: 'Account created successfully! Signing you in...',
      })

      setTimeout(() => {
        navigate('/', { replace: true })
      }, 600)
    } catch (err) {
      console.error('Registration Error:', err)
      if (isTurnstileEnabled()) {
        setTurnstileToken(null)
        setTurnstileKey((k) => k + 1)
      }
      showError(err, 'Registration Failed')
      setAlert({
        type: 'error',
        message: err.message || 'Failed to create account. Please check your information and try again.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="w-full flex justify-center items-center min-w-0">
      {/* Centered Auth Card with subtle HUD Corner Accents */}
      <div className="w-full max-w-md md:max-w-4xl bg-[#111318] border border-[#2A2A30] rounded-none overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.85)] flex flex-col md:flex-row relative min-w-0">
        
        {/* Subtle Tech Corner Brackets */}
        <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#00f2ff]/60 pointer-events-none z-20" />
        <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#00f2ff]/60 pointer-events-none z-20" />
        <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#00f2ff]/60 pointer-events-none z-20" />
        <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#00f2ff]/60 pointer-events-none z-20" />

        {/* Left Column: Brand Visual (Desktop >= md) */}
        <div className="hidden md:flex md:w-[46%] relative overflow-hidden bg-[#0a0b0e] items-center justify-center p-8 border-r border-[#2A2A30]">
          {/* Background Ambient Glow & Lighting Effects */}
          <div className="absolute inset-0 z-0">
            <div
              className="w-full h-full bg-cover bg-center opacity-30 scale-105 transition-transform duration-1000"
              style={{
                backgroundImage: `url('https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80')`,
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0a0b0e]/90 via-[#0a0b0e]/70 to-[#111318]" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0b0e] via-transparent to-[#0a0b0e]/80" />
          </div>

          <div className="relative z-10 text-center space-y-6 max-w-sm">
            <img
              src="/mj-esports-logo.png"
              alt="MJ ESPORTS"
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-none object-contain mx-auto shadow-[0_0_20px_rgba(255,185,0,0.3)]"
            />

            <div className="space-y-2">
              <h1 className="font-headline text-3xl font-extrabold tracking-tight text-white uppercase italic">
                JOIN THE <span className="text-[#FFB900]">ARENA</span>
              </h1>
              <p className="text-xs text-[#A3A3A3] leading-relaxed font-body">
                Enter competitive Free Fire MAX tournaments, build your pro squad roster, and win real cash rewards.
              </p>
            </div>

            <div className="pt-4 flex items-center justify-center gap-6 border-t border-[#2A2A30]">
              <div className="flex flex-col items-center">
                <span className="font-headline text-base font-extrabold text-[#10b981]">100%</span>
                <span className="font-label-bold text-[9px] text-[#A3A3A3] uppercase tracking-widest">VERIFIED PAYOUTS</span>
              </div>
              <div className="w-px h-8 bg-[#2A2A30]"></div>
              <div className="flex flex-col items-center">
                <span className="font-headline text-base font-extrabold text-[#FFB900]">24/7</span>
                <span className="font-label-bold text-[9px] text-[#A3A3A3] uppercase tracking-widest">LIVE DISPUTE OPS</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Registration Form */}
        <div className="w-full md:w-[54%] p-5 sm:p-8 lg:p-10 flex flex-col justify-between bg-[#111318] min-w-0">
          <div className="space-y-5 sm:space-y-6">
            
            <div className="space-y-1">
              <h2 className="font-headline text-xl sm:text-2xl font-extrabold text-white uppercase tracking-tight">
                CREATE ACCOUNT
              </h2>
              <p className="text-xs text-[#A3A3A3] font-body">
                Join thousands of competitive gamers in the MJ Arena.
              </p>
            </div>

            {alert && <AuthAlert type={alert.type} message={alert.message} />}

            <form onSubmit={handleSubmit} noValidate className="space-y-3.5">
              <FormInput
                label="Player Handle / Username"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="CyberKnight99"
                required
                error={errors.username}
                icon={User}
              />

              <FormInput
                label="Email Address"
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="name@example.com"
                required
                error={errors.email}
                icon={Mail}
              />

              <div className="space-y-1.5">
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

                {/* Live Password Strength Indicator & Helpful Guidance Recommendations */}
                {formData.password && (
                  <div className="p-3 bg-[#1B1B1F] border border-[#2A2A30] rounded-none space-y-2.5 transition-all text-xs">
                    {/* Strength Level Bar Header */}
                    <div className="flex items-center justify-between">
                      <span className="text-[#A3A3A3] font-label-bold text-[10px] uppercase tracking-wider">Password Strength</span>
                      <span className={`px-2 py-0.5 rounded-none text-[10px] font-bold border flex items-center gap-1 font-headline ${pwdStrength.badgeColor}`}>
                        <span>{pwdStrength.emoji}</span>
                        <span>{pwdStrength.level}</span>
                      </span>
                    </div>

                    {/* 4-Segment Progress Bar */}
                    <div className="grid grid-cols-4 gap-1.5 h-1.5 w-full">
                      {[1, 2, 3, 4].map((seg) => (
                        <div
                          key={seg}
                          className="h-full rounded-none transition-all duration-300"
                          style={{
                            backgroundColor:
                              seg <= pwdStrength.segmentCount
                                ? pwdStrength.color
                                : '#2A2A30',
                          }}
                        />
                      ))}
                    </div>

                    {/* Recommendations Guidelines */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 text-[11px]">
                      <div className={`flex items-center gap-1.5 transition-colors ${pwdStrength.recommendations.length8 ? 'text-[#10b981] font-semibold' : 'text-[#A3A3A3]'}`}>
                        <Check className={`w-3.5 h-3.5 shrink-0 ${pwdStrength.recommendations.length8 ? 'text-[#10b981]' : 'text-gray-600'}`} />
                        <span>8+ characters</span>
                      </div>
                      <div className={`flex items-center gap-1.5 transition-colors ${pwdStrength.recommendations.hasNumber ? 'text-[#10b981] font-semibold' : 'text-[#A3A3A3]'}`}>
                        <Check className={`w-3.5 h-3.5 shrink-0 ${pwdStrength.recommendations.hasNumber ? 'text-[#10b981]' : 'text-gray-600'}`} />
                        <span>Numbers</span>
                      </div>
                      <div className={`flex items-center gap-1.5 transition-colors ${pwdStrength.recommendations.hasSymbol ? 'text-[#10b981] font-semibold' : 'text-[#A3A3A3]'}`}>
                        <Check className={`w-3.5 h-3.5 shrink-0 ${pwdStrength.recommendations.hasSymbol ? 'text-[#10b981]' : 'text-gray-600'}`} />
                        <span>Symbols</span>
                      </div>
                      <div className={`flex items-center gap-1.5 transition-colors ${pwdStrength.recommendations.hasUppercase ? 'text-[#10b981] font-semibold' : 'text-[#A3A3A3]'}`}>
                        <Check className={`w-3.5 h-3.5 shrink-0 ${pwdStrength.recommendations.hasUppercase ? 'text-[#10b981]' : 'text-gray-600'}`} />
                        <span>Uppercase</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <FormInput
                label="Confirm Password"
                id="confirmPassword"
                name="confirmPassword"
                isPassword
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="••••••••"
                required
                error={errors.confirmPassword}
                icon={Lock}
              />

              {/* Turnstile Bot Protection */}
              {isTurnstileEnabled() && (
                <TurnstileWidget
                  key={turnstileKey}
                  action="register"
                  onVerify={(tok) => setTurnstileToken(tok)}
                  onExpire={() => setTurnstileToken(null)}
                  onError={() => setTurnstileToken(null)}
                />
              )}

              <LoadingButton
                type="submit"
                loading={isSubmitting}
                loadingText="Creating Account..."
                icon={UserPlus}
                size="lg"
                className="w-full text-xs sm:text-sm py-3.5 mt-2 bg-[#FFB900] hover:bg-[#FFA500] text-[#000000] font-headline font-bold uppercase tracking-wider rounded-none shadow-[0_0_15px_rgba(255,185,0,0.35)] hover:shadow-[0_0_24px_rgba(255,185,0,0.5)] transition-all cursor-pointer"
              >
                Create Account
              </LoadingButton>
            </form>

          </div>

          {/* Footer Link */}
          <div className="pt-6 mt-4 border-t border-[#2A2A30] text-center text-xs text-[#A3A3A3]">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-bold text-[#FFB900] hover:underline transition-colors inline-flex items-center gap-1 uppercase tracking-wider ml-1"
            >
              <span>Sign In</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

        </div>

      </div>

    </div>
  )
}
