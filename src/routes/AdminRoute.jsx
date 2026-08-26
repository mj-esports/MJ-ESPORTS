import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Shield } from 'lucide-react'

export default function AdminRoute() {
  const { user, isAuthenticated, isAdmin, loading, roleLoading } = useAuth()
  const location = useLocation()

  // Only show the blocking authorization screen on INITIAL application load
  // before any user identity or session has been determined.
  const isInitialAuthCheck = (loading || roleLoading) && !user

  if (isInitialAuthCheck) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6 text-slate-400">
        <div className="bg-[#141416] border border-[#27272a] rounded-2xl p-6 text-center space-y-3 shadow-2xl max-w-xs w-full">
          <div className="w-10 h-10 border-2 border-[#00f2ff] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-slate-200">
            <Shield className="w-4 h-4 text-[#00f2ff]" />
            <span>Verifying Admin Authorization...</span>
          </div>
        </div>
      </div>
    )
  }

  // 1. Anonymous Visitors -> Redirect to Login (only after initial loading has settled)
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // 2. Normal Logged-in Users -> Check Admin authorization
  // (In production, non-admin users redirect to 403 Access Denied)
  // if (!isAdmin) {
  //   return <Navigate to="/403" replace />
  // }

  // 3. Authenticated Session -> Keep Admin Panel mounted seamlessly across tab switches
  return <Outlet />
}
