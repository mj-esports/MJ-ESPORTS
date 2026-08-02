import { Link } from 'react-router-dom'
import { Trophy, ArrowLeft, Home, FileQuestion } from 'lucide-react'

export default function NotFoundPage() {
  return (
    <div className="min-h-[75vh] flex items-center justify-center p-6 bg-[#0b0e11] text-center">
      <div className="max-w-md w-full bg-[#151a21] border border-[#3a494b] rounded-2xl p-8 space-y-6 shadow-2xl relative overflow-hidden">
        
        <div className="w-16 h-16 rounded-full bg-[#fe6b00]/10 border border-[#fe6b00]/30 flex items-center justify-center mx-auto text-[#fe6b00] animate-pulse">
          <FileQuestion className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="px-3 py-1 rounded text-[10px] font-mono font-extrabold uppercase tracking-widest bg-[#07090c] text-[#00f2ff] border border-[#3a494b]">
            ERROR 404 &bull; PAGE NOT FOUND
          </span>
          <h1 className="font-display-lg text-2xl sm:text-3xl font-extrabold text-white uppercase tracking-tight">
            ZONE OUT OF BOUNDS
          </h1>
          <p className="text-xs text-[#8e9dae] leading-relaxed">
            The page or arena URL you requested does not exist or has been relocated to another battle zone.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 text-xs font-bold uppercase tracking-wider">
          <Link
            to="/"
            className="w-full sm:w-auto px-5 py-3 bg-[#00f2ff] text-[#00363a] rounded-lg font-extrabold flex items-center justify-center gap-2 hover:bg-[#33f5ff] transition-all shadow-[0_0_15px_rgba(0,242,255,0.4)]"
          >
            <Home className="w-4 h-4" />
            <span>Return to Arena</span>
          </Link>

          <Link
            to="/tournaments"
            className="w-full sm:w-auto px-5 py-3 bg-[#07090c] border border-[#3a494b] text-white hover:text-[#00f2ff] rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            <Trophy className="w-4 h-4 text-[#fe6b00]" />
            <span>View Tournaments</span>
          </Link>
        </div>

      </div>
    </div>
  )
}
