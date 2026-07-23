import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function ProtectedRoute({ redirectTo = '/login' }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6 text-slate-400">
        <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-2xl px-6 py-4 shadow-xl">
          <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-bold text-slate-300">Authenticating Credentials...</span>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />
  }

  return <Outlet />
}
