import { Link } from 'react-router-dom'
import { Trophy, Home, FileQuestion } from 'lucide-react'

export default function NotFoundPage() {
  return (
    <div className="min-h-[75vh] flex items-center justify-center p-6 bg-[#000000] text-center">
      <div className="max-w-md w-full bg-[#111215] border border-[#27272A] rounded-none p-8 space-y-6 shadow-2xl relative overflow-hidden">
        
        <div className="w-16 h-16 rounded-none bg-[#FF8C00]/10 border border-[#FF8C00]/30 flex items-center justify-center mx-auto text-[#FF8C00] animate-pulse">
          <FileQuestion className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="px-3 py-1 rounded-none text-[10px] font-mono font-extrabold uppercase tracking-widest bg-[#18181B] text-[#FFB900] border border-[#27272A]">
            ERROR 404 &bull; PAGE NOT FOUND
          </span>
          <h1 className="font-display-lg text-2xl sm:text-3xl font-extrabold text-white uppercase tracking-tight">
            ZONE OUT OF BOUNDS
          </h1>
          <p className="text-xs text-[#A1A1AA] leading-relaxed">
            The page or arena URL you requested does not exist or has been relocated to another battle zone.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 text-xs font-bold uppercase tracking-wider">
          <Link
            to="/"
            className="w-full sm:w-auto px-5 py-3 bg-[#FFB900] text-[#000000] rounded-none font-extrabold flex items-center justify-center gap-2 hover:bg-[#FFC933] transition-all"
          >
            <Home className="w-4 h-4" />
            <span>Return to Arena</span>
          </Link>

          <Link
            to="/tournaments"
            className="w-full sm:w-auto px-5 py-3 bg-[#18181B] border border-[#27272A] text-white hover:text-[#FFB900] hover:border-[#FFB900] rounded-none flex items-center justify-center gap-2 transition-colors"
          >
            <Trophy className="w-4 h-4 text-[#FF8C00]" />
            <span>View Tournaments</span>
          </Link>
        </div>

      </div>
    </div>
  )
}
