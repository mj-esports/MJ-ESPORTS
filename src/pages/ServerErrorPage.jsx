import { Link } from 'react-router-dom'
import { ServerCrash, Home, RefreshCw } from 'lucide-react'

export default function ServerErrorPage() {
  const handleReload = () => {
    window.location.reload()
  }

  return (
    <div className="min-h-[75vh] flex items-center justify-center p-6 bg-[#0b0e11] text-center">
      <div className="max-w-md w-full bg-[#151a21] border border-red-900/60 rounded-2xl p-8 space-y-6 shadow-2xl relative overflow-hidden">
        
        <div className="w-16 h-16 rounded-full bg-red-950/60 border border-red-800 flex items-center justify-center mx-auto text-red-500 animate-pulse">
          <ServerCrash className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="px-3 py-1 rounded text-[10px] font-mono font-extrabold uppercase tracking-widest bg-[#07090c] text-red-400 border border-red-900/60">
            ERROR 500 &bull; SERVER EXCEPTION
          </span>
          <h1 className="font-display-lg text-2xl sm:text-3xl font-extrabold text-white uppercase tracking-tight">
            SYSTEM DISRUPTION
          </h1>
          <p className="text-xs text-[#8e9dae] leading-relaxed">
            Our match telemetry server encountered an unexpected disruption. The issue has been logged for engineering review.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 text-xs font-bold uppercase tracking-wider">
          <button
            onClick={handleReload}
            className="w-full sm:w-auto px-5 py-3 bg-[#fe6b00] text-slate-950 rounded-lg font-extrabold flex items-center justify-center gap-2 hover:bg-[#ff8533] transition-all shadow-[0_0_15px_rgba(254,107,0,0.4)]"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reload System</span>
          </button>

          <Link
            to="/"
            className="w-full sm:w-auto px-5 py-3 bg-[#07090c] border border-[#3a494b] text-white hover:text-[#00f2ff] rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            <Home className="w-4 h-4 text-[#00f2ff]" />
            <span>Return Arena</span>
          </Link>
        </div>

      </div>
    </div>
  )
}
