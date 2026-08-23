import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { User, Mail, Lock, UserPlus, ArrowRight, ShieldCheck, Check } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import FormInput from '../components/common/FormInput'
import AuthAlert from '../components/common/AuthAlert'
import LoadingButton from '../components/common/LoadingButton'
import { isValidEmail, sanitizeString, isStrongPassword, evaluatePasswordStrength } from '../utils/validationUtils'

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

    setIsSubmitting(true)
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
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-[#131314]">
      {/* Centered Auth Card */}
      <div className="w-full max-w-4xl bg-[#141416] border border-[#27272a] rounded overflow-hidden shadow-2xl flex flex-col md:flex-row relative">
        
        {/* Left Column: Brand Visual (Desktop >= md) */}
        <div className="hidden md:flex md:w-1/2 relative overflow-hidden bg-[#0e0e0f] items-center justify-center p-8 border-r border-[#27272a]">
          {/* Background Ambient Glow & Lighting Effects */}
          <div className="absolute inset-0 z-0">
            <div
              className="w-full h-full bg-cover bg-center opacity-30 scale-105 transition-transform duration-1000"
              style={{
                backgroundImage: `url('https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80')`,
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0e0e0f]/90 via-[#0e0e0f]/70 to-[#141416]" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e0f] via-transparent to-[#0e0e0f]/80" />
          </div>

          <div className="relative z-10 text-center space-y-6 max-w-sm">
            <div className="w-16 h-16 rounded bg-[#00f2ff]/10 border border-[#00f2ff]/40 flex items-center justify-center mx-auto text-[#00f2ff] shadow-[0_0_20px_rgba(0,242,255,0.3)]">
              <ShieldCheck className="w-8 h-8 text-[#00f2ff]" />
            </div>

            <div className="space-y-2">
              <h1 className="font-headline text-3xl font-extrabold tracking-tight text-white uppercase italic">
                JOIN THE <span className="text-[#00f2ff]">ARENA</span>
              </h1>
              <p className="text-xs text-[#b9cacb] leading-relaxed font-body">
                Enter competitive Free Fire & BGMI tournaments, build your pro squad roster, and win real cash rewards.
              </p>
            </div>

            <div className="pt-4 flex items-center justify-center gap-6 border-t border-[#27272a]">
              <div className="flex flex-col items-center">
                <span className="font-headline text-base font-extrabold text-[#10b981]">100%</span>
                <span className="font-label-bold text-[9px] text-[#849495] uppercase tracking-widest">VERIFIED PAYOUTS</span>
              </div>
              <div className="w-px h-8 bg-[#27272a]"></div>
              <div className="flex flex-col items-center">
                <span className="font-headline text-base font-extrabold text-[#00f2ff]">24/7</span>
                <span className="font-label-bold text-[9px] text-[#849495] uppercase tracking-widest">LIVE DISPUTE OPS</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Registration Form */}
        <div className="w-full md:w-1/2 p-6 sm:p-10 flex flex-col justify-between bg-[#141416]">
          <div className="space-y-6">
            
            <div className="space-y-1">
              <h2 className="font-headline text-xl sm:text-2xl font-extrabold text-white uppercase tracking-tight">
                CREATE ACCOUNT
              </h2>
              <p className="text-xs text-[#849495] font-body">
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
                  <div className="p-3 bg-[#1c1b1c] border border-[#27272a] rounded space-y-2.5 transition-all text-xs">
                    {/* Strength Level Bar Header */}
                    <div className="flex items-center justify-between">
                      <span className="text-[#849495] font-label-bold text-[10px] uppercase tracking-wider">Password Strength</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border flex items-center gap-1 font-headline ${pwdStrength.badgeColor}`}>
                        <span>{pwdStrength.emoji}</span>
                        <span>{pwdStrength.level}</span>
                      </span>
                    </div>

                    {/* 4-Segment Progress Bar */}
                    <div className="grid grid-cols-4 gap-1.5 h-1.5 w-full">
                      {[1, 2, 3, 4].map((seg) => (
                        <div
                          key={seg}
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            backgroundColor:
                              seg <= pwdStrength.segmentCount
                                ? pwdStrength.color
                                : '#27272a',
                          }}
                        />
                      ))}
                    </div>

                    {/* Recommendations Guidelines */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 text-[11px]">
                      <div className={`flex items-center gap-1.5 transition-colors ${pwdStrength.recommendations.length8 ? 'text-[#10b981] font-semibold' : 'text-[#849495]'}`}>
                        <Check className={`w-3.5 h-3.5 shrink-0 ${pwdStrength.recommendations.length8 ? 'text-[#10b981]' : 'text-gray-600'}`} />
                        <span>8+ characters</span>
                      </div>
                      <div className={`flex items-center gap-1.5 transition-colors ${pwdStrength.recommendations.hasNumber ? 'text-[#10b981] font-semibold' : 'text-[#849495]'}`}>
                        <Check className={`w-3.5 h-3.5 shrink-0 ${pwdStrength.recommendations.hasNumber ? 'text-[#10b981]' : 'text-gray-600'}`} />
                        <span>Numbers</span>
                      </div>
                      <div className={`flex items-center gap-1.5 transition-colors ${pwdStrength.recommendations.hasSymbol ? 'text-[#10b981] font-semibold' : 'text-[#849495]'}`}>
                        <Check className={`w-3.5 h-3.5 shrink-0 ${pwdStrength.recommendations.hasSymbol ? 'text-[#10b981]' : 'text-gray-600'}`} />
                        <span>Symbols</span>
                      </div>
                      <div className={`flex items-center gap-1.5 transition-colors ${pwdStrength.recommendations.hasUppercase ? 'text-[#10b981] font-semibold' : 'text-[#849495]'}`}>
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

              <LoadingButton
                type="submit"
                loading={isSubmitting}
                loadingText="Creating Account..."
                icon={UserPlus}
                className="w-full text-sm py-3.5 mt-2"
              >
                Create Account
              </LoadingButton>
            </form>

          </div>

          {/* Footer Link */}
          <div className="pt-6 border-t border-[#3a494b]/60 text-center text-xs text-[#8e9dae]">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-bold text-[#00f2ff] hover:underline transition-colors inline-flex items-center gap-1 uppercase tracking-wider"
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
