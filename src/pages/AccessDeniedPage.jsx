import { Link } from 'react-router-dom'
import { ShieldAlert, Home, User } from 'lucide-react'

export default function AccessDeniedPage() {
  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-8 text-center space-y-6 shadow-2xl relative overflow-hidden">
        
        {/* Icon & Status */}
        <div className="w-20 h-20 rounded-full bg-[#ff3366]/10 border border-[#ff3366]/40 flex items-center justify-center mx-auto text-[#ff3366] shadow-[0_0_20px_rgba(255,51,102,0.3)]">
          <ShieldAlert className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <span className="px-3 py-1 rounded text-[10px] font-extrabold uppercase tracking-widest bg-red-950 text-[#ff3366] border border-red-800">
            ERROR 403 &bull; RESTRICTED AREA
          </span>
          <h1 className="font-display-lg text-3xl font-extrabold text-white tracking-tight uppercase">
            ACCESS DENIED
          </h1>
          <p className="text-[#8e9dae] text-xs leading-relaxed max-w-sm mx-auto">
            You do not have permission to access this page. Administrative privileges are required for Host Control operations.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/"
            className="w-full sm:w-auto px-5 py-3 rounded bg-[#07090c] hover:bg-[#1d232c] border border-[#3a494b] text-[#e1e2e7] font-bold text-xs flex items-center justify-center gap-2 min-h-[44px] flex-1 uppercase tracking-wider"
          >
            <Home className="w-4 h-4 text-[#00f2ff]" />
            <span>Go Home</span>
          </Link>

          <Link
            to="/dashboard"
            className="btn-cyber-primary w-full sm:w-auto justify-center min-h-[44px] flex-1"
          >
            <User className="w-4 h-4" />
            <span>Return to Dashboard</span>
          </Link>
        </div>

      </div>
    </div>
  )
}
