import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { User, Mail, Lock, UserPlus, Swords, ArrowRight } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import FormInput from '../components/common/FormInput'
import AuthAlert from '../components/common/AuthAlert'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { signUp } = useAuth()

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

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required'
    } else if (formData.username.trim().length < 3) {
      newErrors.username = 'Username must be at least 3 characters'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Enter a valid email address'
    }

    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
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
      await signUp(formData.email, formData.password, {
        username: formData.username,
      })
      setAlert({
        type: 'success',
        message: 'Account created successfully! Check your email or sign in to continue.',
      })
      setTimeout(() => {
        navigate('/login')
      }, 2000)
    } catch (err) {
      console.error('Registration Error:', err)
      setAlert({
        type: 'error',
        message: err.message || 'Failed to create account. Please try again.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-400 to-purple-600 p-[1px] mx-auto shadow-lg shadow-cyan-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[15px] flex items-center justify-center">
              <Swords className="w-6 h-6 text-cyan-400" />
            </div>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight uppercase">
            CREATE PLAYER ACCOUNT
          </h1>
          <p className="text-xs text-slate-400">
            Join thousands of competitive gamers and enter pro esports tournaments.
          </p>
        </div>

        {/* Card Form */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl">
          {alert && <AuthAlert type={alert.type} message={alert.message} />}

          <form onSubmit={handleSubmit} className="space-y-4">
            <FormInput
              label="Username / In-Game Handle"
              id="username"
              name="username"
              type="text"
              value={formData.username}
              onChange={handleChange}
              placeholder="e.g. Phoenix_99"
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
              placeholder="user@example.com"
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
              placeholder="At least 6 characters"
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
              placeholder="Re-enter password"
              required
              error={errors.confirmPassword}
              icon={Lock}
            />

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-4 text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 via-indigo-300 to-purple-400 rounded-xl hover:brightness-110 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 mt-2 min-h-[44px]"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Create Account</span>
                </>
              )}
            </button>
          </form>

          <div className="pt-4 border-t border-slate-800 text-center text-xs text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-cyan-400 hover:text-cyan-300 transition-colors inline-flex items-center gap-1">
              <span>Login</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

      </div>
    </div>
  )
}
