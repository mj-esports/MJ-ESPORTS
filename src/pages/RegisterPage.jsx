import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { User, Mail, Lock, UserPlus, Swords, ArrowRight, ShieldCheck, RefreshCw } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import FormInput from '../components/common/FormInput'
import AuthAlert from '../components/common/AuthAlert'
import LoadingButton from '../components/common/LoadingButton'
import { isValidEmail, sanitizeString, isStrongPassword, isValidUsername } from '../utils/validationUtils'

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
    const cleanEmail = sanitizeString(formData.email)

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
    } else if (!isStrongPassword(formData.password)) {
      newErrors.password = 'Password must be at least 6 characters with at least 1 letter and 1 number'
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
    const cleanEmail = sanitizeString(formData.email)

    setIsSubmitting(true)
    try {
      // 1. Sign up user
      await signUp(cleanEmail, formData.password, {
        username: cleanUsername,
      })

      // 2. Immediately sign in without requiring email confirmation
      try {
        await signIn(cleanEmail, formData.password)
      } catch (signInErr) {
        console.warn('Auto sign-in fallback:', signInErr.message)
      }

      showSuccess('Account created successfully! Logging you in...', 'Registration Complete')
      setAlert({
        type: 'success',
        message: 'Account created successfully! Signing you in...',
      })

      setTimeout(() => {
        navigate('/', { replace: true })
      }, 800)
    } catch (err) {
      console.error('Registration Error:', err)
      showError(err, 'Registration Failed')
      setAlert({
        type: 'error',
        message: err.message || 'Failed to create account. Please check your information and try again.',
      })
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-8 px-4 sm:px-6">
      
      {/* 2-Column Split Authentication Arena Container */}
      <div className="w-full max-w-5xl bg-[#151a21] border border-[#3a494b]/60 rounded-xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-0 md:min-h-[640px]">
        
        {/* Left Column: Brand Visual (Desktop >= md) */}
        <div className="hidden md:flex md:w-1/2 relative overflow-hidden bg-[#07090c] items-center justify-center p-8 border-r border-[#3a494b]/60">
          <div className="absolute inset-0 z-0">
            <div
              className="w-full h-full bg-cover bg-center opacity-30 scale-105 transition-transform duration-1000"
              style={{
                backgroundImage: `url('https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80')`,
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#07090c]/90 via-[#07090c]/70 to-[#151a21]" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#07090c] via-transparent to-[#07090c]/80" />
          </div>

          <div className="relative z-10 text-center space-y-6 max-w-sm">
            <div className="w-16 h-16 rounded-full bg-[#00f2ff]/20 border border-[#00f2ff] flex items-center justify-center mx-auto text-[#00f2ff] shadow-[0_0_20px_rgba(0,242,255,0.4)]">
              <ShieldCheck className="w-8 h-8 text-[#00f2ff]" />
            </div>

            <div className="space-y-2">
              <h1 className="font-display-lg text-3xl font-extrabold tracking-tight text-white uppercase italic">
                JOIN THE <span className="text-[#00f2ff]">ARENA</span>
              </h1>
              <p className="text-xs text-[#8e9dae] leading-relaxed">
                Enter competitive Free Fire & BGMI tournaments, build your pro squad roster, and win real cash rewards.
              </p>
            </div>

            <div className="pt-4 flex items-center justify-center gap-6 border-t border-[#3a494b]/60">
              <div className="flex flex-col items-center">
                <span className="font-mono text-base font-extrabold text-[#00ff9d]">100%</span>
                <span className="font-label-caps text-[9px] text-[#8e9dae] uppercase tracking-widest">VERIFIED PAYOUTS</span>
              </div>
              <div className="w-px h-8 bg-[#3a494b]/60"></div>
              <div className="flex flex-col items-center">
                <span className="font-mono text-base font-extrabold text-[#00f2ff]">24/7</span>
                <span className="font-label-caps text-[9px] text-[#8e9dae] uppercase tracking-widest">LIVE DISPUTE OPS</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Registration Form */}
        <div className="w-full md:w-1/2 p-6 sm:p-10 flex flex-col justify-between bg-[#151a21]">
          <div className="space-y-6">
            
            <div className="space-y-1">
              <h2 className="font-display-lg text-xl sm:text-2xl font-extrabold text-white uppercase tracking-tight">
                CREATE ACCOUNT
              </h2>
              <p className="text-xs text-[#8e9dae]">
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
