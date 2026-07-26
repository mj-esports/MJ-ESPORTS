import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Mail, Lock, LogIn, ShieldCheck, KeyRound, ArrowRight, RefreshCw } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import FormInput from '../components/common/FormInput'
import AuthAlert from '../components/common/AuthAlert'
import { supabase, isSupabaseConfigured } from '../lib/supabase.js'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { signIn, signInWithGoogle, requestPasswordReset } = useAuth()

  const from = location.state?.from?.pathname || '/'

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false)
  const [alert, setAlert] = useState(null)
  
  // Real dynamic statistics from Supabase
  const [stats, setStats] = useState({
    activePlayers: 0,
    totalPrizePool: '₹0',
  })
  const [loadingStats, setLoadingStats] = useState(true)

  // Forgot Password Modal State
  const [showForgotModal, setShowForgotModal] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotSubmitting, setForgotSubmitting] = useState(false)
  const [forgotSent, setForgotSent] = useState(false)

  // Fetch live stats from Supabase
  useEffect(() => {
    async function fetchLiveStats() {
      setLoadingStats(true)
      try {
        if (isSupabaseConfigured) {
          // 1. Fetch exact user count from user_roles
          const { count: usersCount } = await supabase
            .from('user_roles')
            .select('*', { count: 'exact', head: true })

          // 2. Fetch tournaments to sum up prize pool
          const { data: tournamentsData } = await supabase
            .from('tournaments')
            .select('prize_pool')

          let prizeSum = 0
          if (tournamentsData && tournamentsData.length > 0) {
            tournamentsData.forEach((t) => {
              const str = t.prize_pool || '0'
              const num = parseInt(str.replace(/[^0-9]/g, ''), 10)
              if (!isNaN(num)) prizeSum += num
            })
          }

          setStats({
            activePlayers: usersCount ?? 0,
            totalPrizePool: prizeSum > 0 ? `₹${prizeSum.toLocaleString()}` : '₹0',
          })
        } else {
          setStats({
            activePlayers: 0,
            totalPrizePool: '₹0',
          })
        }
      } catch (err) {
        console.warn('[Fetch Auth Stats Warning]:', err)
        setStats({
          activePlayers: 0,
          totalPrizePool: '₹0',
        })
      } finally {
        setLoadingStats(false)
      }
    }

    fetchLiveStats()
  }, [])

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
      setAlert({ type: 'success', message: 'Signed in successfully! Redirecting...' })
      setTimeout(() => {
        navigate(from, { replace: true })
      }, 600)
    } catch (err) {
      console.error('Login Error:', err)
      setAlert({
        type: 'error',
        message: err.message || 'Failed to sign in. Please check your email and password.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setAlert(null)
    setIsGoogleSubmitting(true)
    try {
      await signInWithGoogle()
    } catch (err) {
      console.error('Google Sign-In Error:', err)
      setAlert({
        type: 'error',
        message: err.message || 'Failed to sign in with Google.',
      })
      setIsGoogleSubmitting(false)
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
      setForgotSent(true)
    } finally {
      setForgotSubmitting(false)
    }
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-8 px-4 sm:px-6 w-full">
      
      {/* 2-Column Split Authentication Arena Container */}
      <div className="w-full max-w-5xl bg-[#151a21] border border-[#3a494b]/60 rounded-xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[620px]">
        
        {/* Left Column: Brand Visual (Desktop >= md) */}
        <div className="hidden md:flex md:w-1/2 relative overflow-hidden bg-[#07090c] items-center justify-center p-8 border-r border-[#3a494b]/60">
          {/* Background Ambient Glow & Lighting Effects */}
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

          {/* Left Column Content */}
          <div className="relative z-10 text-center space-y-6 max-w-sm">
            <div className="w-16 h-16 rounded-full bg-[#00f2ff]/20 border border-[#00f2ff] flex items-center justify-center mx-auto text-[#00f2ff] shadow-[0_0_20px_rgba(0,242,255,0.4)]">
              <ShieldCheck className="w-8 h-8 text-[#00f2ff]" />
            </div>

            <div className="space-y-2">
              <h1 className="font-display-lg text-3xl font-extrabold tracking-tight text-white uppercase italic">
                MJ <span className="text-[#00f2ff]">ESPORTS</span>
              </h1>
              <p className="text-xs text-[#8e9dae] leading-relaxed">
                The premier destination for competitive gaming, high-stakes tournaments, and digital dominance.
              </p>
            </div>

            {/* Live Dynamic Statistics Pill (Fetched from Supabase) */}
            <div className="pt-4 flex items-center justify-center gap-6 border-t border-[#3a494b]/60">
              <div className="flex flex-col items-center">
                <span className="font-mono text-base font-extrabold text-[#00ff9d]">
                  {loadingStats ? '...' : stats.activePlayers}
                </span>
                <span className="font-label-caps text-[9px] text-[#8e9dae] uppercase tracking-widest">Active Players</span>
              </div>
              <div className="w-px h-8 bg-[#3a494b]/60"></div>
              <div className="flex flex-col items-center">
                <span className="font-mono text-base font-extrabold text-[#00f2ff]">
                  {loadingStats ? '...' : stats.totalPrizePool}
                </span>
                <span className="font-label-caps text-[9px] text-[#8e9dae] uppercase tracking-widest">Total Prize Pool</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Clear Professional Auth Form */}
        <div className="w-full md:w-1/2 p-6 sm:p-10 flex flex-col justify-between bg-[#151a21]">
          <div className="space-y-6">
            
            {/* Form Header */}
            <div className="space-y-1">
              <h2 className="font-display-lg text-xl sm:text-2xl font-extrabold text-white uppercase tracking-tight">
                WELCOME BACK
              </h2>
              <p className="text-xs text-[#8e9dae]">
                Sign in to access your MJ ESPORTS account.
              </p>
            </div>

            {alert && <AuthAlert type={alert.type} message={alert.message} />}

            {/* Email + Password Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
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

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="font-label-caps text-[11px] font-bold text-[#8e9dae] uppercase tracking-wider block">
                    Password <span className="text-[#00f2ff]">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(formData.email)
                      setShowForgotModal(true)
                    }}
                    className="font-label-caps text-[10px] font-bold text-[#00f2ff] hover:underline uppercase tracking-wider"
                  >
                    Forgot Password?
                  </button>
                </div>
                <FormInput
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
              </div>

              {/* Primary Sign In Button */}
              <button
                type="submit"
                disabled={isSubmitting || isGoogleSubmitting}
                className="w-full bg-[#00f2ff] hover:bg-[#74f5ff] active:bg-[#00dbe7] text-[#00363a] font-display-lg font-extrabold text-sm uppercase italic tracking-wider py-3.5 rounded transition-all shadow-[0_0_20px_rgba(0,242,255,0.4)] hover:shadow-[0_0_25px_rgba(0,242,255,0.6)] flex items-center justify-center gap-2 min-h-[46px] disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 text-[#00363a] animate-spin" />
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

            {/* Separator */}
            <div className="flex items-center gap-3 pt-2">
              <div className="h-px flex-1 bg-[#3a494b]/60"></div>
              <span className="font-label-caps text-[10px] font-extrabold text-[#8e9dae] uppercase tracking-widest">
                OR
              </span>
              <div className="h-px flex-1 bg-[#3a494b]/60"></div>
            </div>

            {/* Large Continue with Google Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isSubmitting || isGoogleSubmitting}
              className="w-full bg-[#07090c] hover:bg-[#1d232c] border border-[#3a494b] hover:border-[#00f2ff] text-white font-bold py-3.5 px-4 rounded text-xs tracking-wider flex items-center justify-center gap-3 transition-colors uppercase min-h-[46px] disabled:opacity-50"
            >
              {isGoogleSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 text-[#00f2ff] animate-spin" />
                  <span>Connecting to Google...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </>
              )}
            </button>

          </div>

          {/* Footer Link */}
          <div className="pt-6 border-t border-[#3a494b]/60 text-center text-xs text-[#8e9dae]">
            Don't have an account?{' '}
            <Link
              to="/register"
              className="font-bold text-[#00f2ff] hover:underline transition-colors inline-flex items-center gap-1 uppercase tracking-wider"
            >
              <span>Create Account</span>
              <ArrowRight className="w-3.5 h-3.5" />
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
                  placeholder="name@example.com"
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
