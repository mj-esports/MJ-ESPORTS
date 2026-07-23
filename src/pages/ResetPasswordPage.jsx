import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { KeyRound, Lock, CheckCircle2, Swords, ArrowRight } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import FormInput from '../components/common/FormInput'
import AuthAlert from '../components/common/AuthAlert'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const { updateUserPassword, isAuthenticated } = useAuth()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [alert, setAlert] = useState(null)
  const [isSuccess, setIsSuccess] = useState(false)

  const validate = () => {
    const newErrors = {}

    if (!password) {
      newErrors.password = 'New password is required'
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters long'
    }

    if (password !== confirmPassword) {
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
      await updateUserPassword(password)
      setIsSuccess(true)
      setAlert({
        type: 'success',
        message: 'Your password has been successfully reset! You can now sign in with your new password.',
      })
    } catch (err) {
      console.error('Password Update Error:', err)
      setAlert({
        type: 'error',
        message: err.message || 'Failed to reset password. The link may be invalid or expired.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-cyan-400 p-[1px] mx-auto shadow-lg shadow-purple-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[15px] flex items-center justify-center">
              <KeyRound className="w-6 h-6 text-purple-400" />
            </div>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight uppercase">
            SET NEW PASSWORD
          </h1>
          <p className="text-xs text-slate-400">
            Choose a strong, secure password for your MJ ESPORTS account.
          </p>
        </div>

        {/* Card Form */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl">
          {alert && <AuthAlert type={alert.type} message={alert.message} />}

          {isSuccess ? (
            <div className="space-y-4 pt-2">
              <Link
                to="/login"
                className="w-full py-3.5 px-4 text-xs font-bold text-slate-950 bg-gradient-to-r from-purple-400 via-indigo-300 to-cyan-300 rounded-xl hover:brightness-110 shadow-lg transition-all flex items-center justify-center gap-2 min-h-[44px]"
              >
                <span>Proceed to Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <FormInput
                label="New Password"
                id="password"
                name="password"
                isPassword
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (errors.password) setErrors((prev) => ({ ...prev, password: null }))
                }}
                placeholder="At least 6 characters"
                required
                error={errors.password}
                icon={Lock}
              />

              <FormInput
                label="Confirm New Password"
                id="confirmPassword"
                name="confirmPassword"
                isPassword
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value)
                  if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: null }))
                }}
                placeholder="Re-enter new password"
                required
                error={errors.confirmPassword}
                icon={Lock}
              />

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 text-xs font-bold text-slate-950 bg-gradient-to-r from-purple-400 via-indigo-300 to-cyan-300 rounded-xl hover:brightness-110 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 mt-2 min-h-[44px]"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Update Password</span>
                  </>
                )}
              </button>
            </form>
          )}

          <div className="pt-4 border-t border-slate-800 text-center text-xs text-slate-400">
            Remembered your password?{' '}
            <Link to="/login" className="font-bold text-purple-400 hover:text-purple-300 transition-colors inline-flex items-center gap-1">
              <span>Back to Login</span>
            </Link>
          </div>
        </div>

      </div>
    </div>
  )
}
