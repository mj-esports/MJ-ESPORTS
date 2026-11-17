import { Link } from 'react-router-dom'
import { ShieldAlert, Home, User } from 'lucide-react'

export default function AccessDeniedPage() {
  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-[#111215] border border-[#27272A] rounded-none p-8 text-center space-y-6 shadow-2xl relative overflow-hidden">
        
        {/* Icon & Status */}
        <div className="w-20 h-20 rounded-none bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto text-red-500">
          <ShieldAlert className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <span className="px-3 py-1 rounded-none text-[10px] font-extrabold uppercase tracking-widest bg-red-950/40 text-red-400 border border-red-900/50">
            ERROR 403 &bull; RESTRICTED AREA
          </span>
          <h1 className="font-display-lg text-3xl font-extrabold text-white tracking-tight uppercase">
            ACCESS DENIED
          </h1>
          <p className="text-[#A1A1AA] text-xs leading-relaxed max-w-sm mx-auto">
            You do not have permission to access this page. Administrative privileges are required for Host Control operations.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/"
            className="w-full sm:w-auto px-5 py-3 rounded-none bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] text-white font-bold text-xs flex items-center justify-center gap-2 min-h-[44px] flex-1 uppercase tracking-wider"
          >
            <Home className="w-4 h-4 text-[#FFB900]" />
            <span>Go Home</span>
          </Link>

          <Link
            to="/dashboard"
            className="btn-stitch-primary w-full sm:w-auto justify-center min-h-[44px] flex-1"
          >
            <User className="w-4 h-4" />
            <span>Return to Dashboard</span>
          </Link>
        </div>

      </div>
    </div>
  )
}
