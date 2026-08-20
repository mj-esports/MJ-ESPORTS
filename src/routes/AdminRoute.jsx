import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Shield } from 'lucide-react'

export default function AdminRoute() {
  const { user, isAuthenticated, isAdmin, loading, roleLoading } = useAuth()
  const location = useLocation()

  // Prevent rendering admin pages until auth and role validation are 100% finished
  if (loading || roleLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6 text-slate-400">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-3 shadow-2xl max-w-xs w-full">
          <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-slate-200">
            <Shield className="w-4 h-4 text-purple-400" />
            <span>Verifying Admin Authorization...</span>
          </div>
        </div>
      </div>
    )
  }

  // 1. Anonymous Visitors -> Redirect to Login
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // 2. Normal Logged-in Users -> Redirect to 403 Access Denied Page
  // TEMPORARY TESTING ACCESS — RESTORE ADMIN-ONLY GUARD BEFORE PRODUCTION
  // if (!isAdmin) {
  //   return <Navigate to="/403" replace />
  // }

  // 3. Authenticated Users (Testing Mode) / Admin Users -> Allow Access
  return <Outlet />
}
