import { Link } from 'react-router-dom'
import { ShieldAlert, Home, User, ArrowRight } from 'lucide-react'

export default function AccessDeniedPage() {
  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-6 shadow-2xl relative overflow-hidden">
        
        {/* Icon & Status */}
        <div className="w-20 h-20 rounded-3xl bg-red-950/80 border border-red-800 flex items-center justify-center mx-auto text-red-400 shadow-xl shadow-red-950/50">
          <ShieldAlert className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-red-950 text-red-400 border border-red-800">
            ERROR 403 &bull; RESTRICTED AREA
          </span>
          <h1 className="text-3xl font-extrabold text-white tracking-tight uppercase">
            ACCESS DENIED
          </h1>
          <p className="text-slate-400 text-xs leading-relaxed max-w-sm mx-auto">
            You do not have permission to access this page. Administrative privileges are required for Host Control operations.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/"
            className="w-full sm:w-auto px-5 py-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 min-h-[44px] flex-1"
          >
            <Home className="w-4 h-4 text-purple-400" />
            <span>Go Home</span>
          </Link>

          <Link
            to="/dashboard"
            className="w-full sm:w-auto px-5 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20 min-h-[44px] flex-1"
          >
            <User className="w-4 h-4" />
            <span>Return to Dashboard</span>
          </Link>
        </div>

      </div>
    </div>
  )
}
