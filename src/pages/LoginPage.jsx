import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Mail, Lock, LogIn, ShieldCheck, KeyRound, ArrowRight, Zap, Shield, Trophy } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import FormInput from '../components/common/FormInput'
import AuthAlert from '../components/common/AuthAlert'
import LoadingButton from '../components/common/LoadingButton'
import { supabase, isSupabaseConfigured } from '../lib/supabase.js'
import { isValidEmail, sanitizeString } from '../utils/validationUtils'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { signIn, signInWithGoogle, requestPasswordReset } = useAuth()
  const { showSuccess, showError } = useToast()

  const from = location.state?.from?.pathname || '/'

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false)
  const [alert, setAlert] = useState(null)
  
  // Dynamic statistics from Supabase
  const [stats, setStats] = useState({
    activePlayers: 0,
    totalPrizePool: '₹0',
    hasRealData: false,
  })
  const [loadingStats, setLoadingStats] = useState(true)

  // Forgot Password Modal State
  const [showForgotModal, setShowForgotModal] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotEmailError, setForgotEmailError] = useState(null)
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

          const hasValidStats = (usersCount && usersCount > 0) || prizeSum > 100

          setStats({
            activePlayers: usersCount ?? 0,
            totalPrizePool: prizeSum > 0 ? `₹${prizeSum.toLocaleString()}` : '₹0',
            hasRealData: Boolean(hasValidStats),
          })
        } else {
          setStats({
            activePlayers: 0,
            totalPrizePool: '₹0',
            hasRealData: false,
          })
        }
      } catch (err) {
        console.warn('[Fetch Auth Stats Warning]:', err)
        setStats({
          activePlayers: 0,
          totalPrizePool: '₹0',
          hasRealData: false,
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
    const cleanEmail = (formData.email || '').trim()

    if (!cleanEmail) {
      newErrors.email = 'Email address is required'
    } else if (!isValidEmail(cleanEmail)) {
      newErrors.email = 'Please enter a valid email address (e.g. user@example.com)'
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

    if (!validate() || isSubmitting) return

    const cleanEmail = (formData.email || '').trim()

    setIsSubmitting(true)
    try {
      await signIn(cleanEmail, formData.password)
      showSuccess('Signed in successfully! Accessing your arena dashboard...', 'Welcome Back')
      setAlert({ type: 'success', message: 'Signed in successfully! Redirecting...' })
      setTimeout(() => {
        navigate(from, { replace: true })
      }, 600)
    } catch (err) {
      console.error('Login Error:', err)
      const errorMsg = err.message || 'Invalid email or password. Please check your credentials and try again.'
      setAlert({ type: 'error', message: errorMsg })
      showError(err, 'Authentication Failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGoogleSignIn = async () => {
    if (isGoogleSubmitting || isSubmitting) return
    setAlert(null)
    setIsGoogleSubmitting(true)
    try {
      await signInWithGoogle()
      if (!isSupabaseConfigured) {
        showSuccess('Signed in with Google (Dev Mode)! Accessing dashboard...', 'Google Sign-In')
        setTimeout(() => {
          navigate(from, { replace: true })
          setIsGoogleSubmitting(false)
        }, 500)
      }
    } catch (err) {
      console.error('Google Sign-In Error:', err)
      setAlert({
        type: 'error',
        message: err.message || 'Unable to connect to Google Sign-In. Please check Google Provider settings in Supabase.',
      })
      showError(err, 'Google Sign-In Failed')
      setIsGoogleSubmitting(false)
    }
  }

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault()
    setForgotEmailError(null)
    const cleanEmail = sanitizeString(forgotEmail)
    if (!cleanEmail) {
      setForgotEmailError('Email address is required')
    } else if (!isValidEmail(cleanEmail)) {
      setForgotEmailError('Please enter a valid email address')
    } else {
      setForgotSubmitting(true)
      try {
        await requestPasswordReset(cleanEmail)
        setForgotSent(true)
        showSuccess('Password reset link has been dispatched to your email.', 'Instructions Sent')
      } catch (err) {
        console.error('Forgot Password Error:', err)
        setForgotSent(true)
      } finally {
        setForgotSubmitting(false)
      }
    }
  }

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-4 sm:p-6 lg:p-10 bg-[#07090c] selection:bg-[#00f2ff] selection:text-slate-950">
      {/* Centered Auth Card with subtle HUD Corner Accents */}
      <div className="w-full max-w-4xl lg:max-w-[940px] bg-[#141416] border border-[#27272a] rounded-lg overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.85)] flex flex-col md:flex-row relative">
        
        {/* Subtle Tech Corner Brackets */}
        <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#00f2ff]/60 pointer-events-none z-20" />
        <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#00f2ff]/60 pointer-events-none z-20" />
        <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#00f2ff]/60 pointer-events-none z-20" />
        <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#00f2ff]/60 pointer-events-none z-20" />

        {/* Left Column: Brand Visual (Desktop >= md) */}
        <div className="hidden md:flex md:w-[46%] relative overflow-hidden bg-[#070a0f] flex-col justify-between p-8 lg:p-10 border-r border-[#27272a]">
          {/* Background Ambient Glow & Lighting Effects */}
          <div className="absolute inset-0 z-0 pointer-events-none">
            <div
              className="w-full h-full bg-cover bg-center opacity-25 scale-105"
              style={{
                backgroundImage: `url('https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80')`,
              }}
            />
            {/* Darker, higher-contrast gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#06090e]/95 via-[#0a0f18]/85 to-[#141416]" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#070a0f] via-transparent to-[#070a0f]/90" />
            <div className="absolute top-1/4 left-1/4 w-48 h-48 bg-[#00f2ff]/10 rounded-full blur-3xl pointer-events-none" />
          </div>

          {/* Left Column Top: Shield Badge & Branding */}
          <div className="relative z-10 space-y-6">
            <div className="w-14 h-14 rounded bg-[#00f2ff]/10 border border-[#00f2ff]/35 flex items-center justify-center text-[#00f2ff] shadow-[0_0_20px_rgba(0,242,255,0.25)]">
              <ShieldCheck className="w-7 h-7 text-[#00f2ff]" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold text-[#00f2ff] tracking-widest uppercase bg-[#00f2ff]/10 px-2 py-0.5 rounded border border-[#00f2ff]/20">
                  COMPETITIVE ARENA
                </span>
              </div>
              <h1 className="font-headline text-3xl font-extrabold tracking-tight text-white uppercase italic">
                MJ <span className="text-[#00f2ff]">ESPORTS</span>
              </h1>
              <p className="text-xs text-[#b9cacb] leading-relaxed font-body">
                India's premier high-stakes tournament platform for Free Fire and BGMI squads. Compete, dominate, and claim verified cash payouts.
              </p>
            </div>
          </div>

          {/* Left Column Bottom: Real Stats OR High-Value Feature Statements */}
          <div className="relative z-10 pt-8 border-t border-[#27272a]/80">
            {stats.hasRealData ? (
              /* Display Live Dynamic Stats when non-zero real data exists */
              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col">
                  <span className="font-headline text-lg font-extrabold text-[#10b981]">
                    {loadingStats ? '...' : stats.activePlayers.toLocaleString()}
                  </span>
                  <span className="font-mono text-[9px] text-[#849495] uppercase tracking-wider">Registered Players</span>
                </div>
                <div className="w-px h-8 bg-[#27272a]"></div>
                <div className="flex flex-col">
                  <span className="font-headline text-lg font-extrabold text-[#00f2ff]">
                    {loadingStats ? '...' : stats.totalPrizePool}
                  </span>
                  <span className="font-mono text-[9px] text-[#849495] uppercase tracking-wider">Tournaments Pool</span>
                </div>
              </div>
            ) : (
              /* Verified Feature Highlights (No fake/zero numbers) */
              <div className="space-y-2.5">
                <div className="flex items-center gap-2.5 text-xs text-[#e5e2e3]">
                  <Zap className="w-3.5 h-3.5 text-[#00f2ff] shrink-0" />
                  <span className="font-body text-[11px]">Instant Custom Room ID & PIN Dispatch</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-[#e5e2e3]">
                  <Trophy className="w-3.5 h-3.5 text-[#fed83a] shrink-0" />
                  <span className="font-body text-[11px]">Daily Solo, Duo & Squad Tournaments</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-[#e5e2e3]">
                  <Shield className="w-3.5 h-3.5 text-[#10b981] shrink-0" />
                  <span className="font-body text-[11px]">100% Direct UPI & Wallet Payouts</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Refined Gaming Auth Form */}
        <div className="w-full md:w-[54%] p-6 sm:p-9 lg:p-10 flex flex-col justify-between bg-[#141416]">
          <div className="space-y-6">
            
            {/* Header & Protocol Indicator */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] font-mono font-bold text-[#849495] uppercase tracking-widest pb-1 border-b border-[#27272a]/50">
                <span>PLAYER ACCESS</span>
                <span className="flex items-center gap-1 text-[#00f2ff]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00f2ff] animate-pulse" />
                  <span>SECURE GATEWAY</span>
                </span>
              </div>
              <h2 className="font-headline text-xl sm:text-2xl font-black text-white uppercase tracking-tight pt-2">
                WELCOME BACK
              </h2>
              <p className="text-xs text-[#849495] font-body">
                Sign in to manage tournament slots, room credentials, and prize winnings.
              </p>
            </div>

            {alert && <AuthAlert type={alert.type} message={alert.message} />}

            {/* Email + Password Form */}
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
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
                autoComplete="email"
              />

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="font-label-bold text-[11px] font-bold text-[#b9cacb] uppercase tracking-wider block">
                    Password <span className="text-[#00f2ff]">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(formData.email)
                      setShowForgotModal(true)
                    }}
                    className="font-label-bold text-[10px] font-bold text-[#00f2ff] hover:underline uppercase tracking-wider cursor-pointer"
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
                  autoComplete="current-password"
                />
              </div>

              {/* Primary Sign In Button (Cyan Gaming Glow) */}
              <LoadingButton
                type="submit"
                loading={isSubmitting}
                disabled={isGoogleSubmitting}
                loadingText="Signing In..."
                icon={LogIn}
                className="w-full text-xs sm:text-sm py-3.5 mt-2 bg-[#00f2ff] hover:bg-[#38e1eb] text-[#00363a] font-headline font-black uppercase tracking-wider rounded shadow-[0_0_15px_rgba(0,242,255,0.35)] hover:shadow-[0_0_24px_rgba(0,242,255,0.55)] transition-all cursor-pointer"
              >
                Sign In
              </LoadingButton>
            </form>

            {/* Technical HUD Separator */}
            <div className="flex items-center gap-3 pt-1">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#27272a] to-[#27272a]"></div>
              <span className="font-mono text-[10px] font-extrabold text-[#849495] uppercase tracking-widest px-1">
                OR
              </span>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent via-[#27272a] to-[#27272a]"></div>
            </div>

            {/* Horizontal Dark Gaming Google Sign-In Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isGoogleSubmitting || isSubmitting}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 min-h-[46px] bg-[#1c1b1c] hover:bg-[#232326] active:bg-[#18181b] border border-[#27272a] hover:border-[#00f2ff]/60 text-[#e5e2e3] hover:text-white rounded font-body text-xs sm:text-sm font-medium tracking-normal shadow-sm hover:shadow-[0_0_16px_rgba(0,242,255,0.2)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00f2ff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#141416] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGoogleSubmitting ? (
                <div className="flex items-center gap-2.5">
                  <div className="w-4 h-4 border-2 border-[#00f2ff] border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs sm:text-sm">Connecting to Google...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2.5">
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
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
                  <span className="text-xs sm:text-sm font-medium text-[#e5e2e3]">Continue with Google</span>
                </div>
              )}
            </button>

          </div>

          {/* Footer Link */}
          <div className="pt-6 mt-4 border-t border-[#27272a] text-center text-xs text-[#849495]">
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
          <div className="bg-[#141416] border border-[#27272a] rounded-lg max-w-sm w-full p-6 space-y-4 shadow-2xl relative">
            <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t-2 border-l-2 border-[#00f2ff]/70" />
            <div className="absolute top-0 right-0 w-2.5 h-2.5 border-t-2 border-r-2 border-[#00f2ff]/70" />
            
            <h3 className="font-headline text-base font-bold text-white uppercase flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-[#00f2ff]" />
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
                  className="w-full py-2.5 text-xs font-bold bg-[#1c1b1c] hover:bg-[#27272a] text-[#e5e2e3] border border-[#27272a] rounded min-h-[44px] uppercase cursor-pointer"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPasswordSubmit} noValidate className="space-y-4">
                <p className="text-xs text-[#849495] leading-relaxed">
                  Enter your registered email address to receive password reset instructions.
                </p>
                <FormInput
                  label="Email Address"
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => {
                    setForgotEmail(e.target.value)
                    if (forgotEmailError) setForgotEmailError(null)
                  }}
                  placeholder="name@example.com"
                  required
                  error={forgotEmailError}
                  icon={Mail}
                />
                <div className="flex gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="flex-1 py-2.5 text-xs font-bold bg-[#1c1b1c] text-[#849495] hover:text-white border border-[#27272a] rounded hover:bg-[#27272a] transition-colors min-h-[44px] uppercase cursor-pointer"
                  >
                    Cancel
                  </button>
                  <LoadingButton
                    type="submit"
                    loading={forgotSubmitting}
                    loadingText="Sending..."
                    className="flex-1 py-2.5 min-h-[44px]"
                  >
                    Send Link
                  </LoadingButton>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  )
}
