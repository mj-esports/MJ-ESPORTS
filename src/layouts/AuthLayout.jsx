import { Outlet, Link } from 'react-router-dom'
import { Swords } from 'lucide-react'

export default function AuthLayout() {
  return (
    <div className="min-h-screen min-h-dvh bg-[#07090c] text-[#e1e2e7] flex flex-col justify-between font-sans selection:bg-[#00f2ff] selection:text-slate-950 overflow-x-hidden w-full">
      
      {/* Top Auth Header Bar (Standalone Minimal Navigation) */}
      <header className="sticky top-0 z-50 bg-[#0f1318]/80 backdrop-blur-xl border-b border-[#3a494b]/60 h-16 px-4 sm:px-8 flex justify-between items-center shadow-lg">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-[#00f2ff] p-[1px] shadow-[0_0_12px_rgba(0,242,255,0.4)] group-hover:scale-105 transition-transform">
            <div className="w-full h-full bg-[#07090c] rounded-[7px] flex items-center justify-center">
              <Swords className="w-4 h-4 text-[#00f2ff]" />
            </div>
          </div>
          <span className="font-display-lg text-base sm:text-lg font-extrabold tracking-wider text-white uppercase italic">
            MJ <span className="text-[#00f2ff]">ESPORTS</span>
          </span>
        </Link>

        <div className="flex items-center gap-4">
          <Link
            to="/about"
            className="font-label-caps text-xs font-bold text-[#8e9dae] hover:text-[#00f2ff] transition-colors uppercase tracking-wider"
          >
            SUPPORT
          </Link>
        </div>
      </header>

      {/* Main Authentication Arena Content */}
      <main className="flex-1 flex items-center justify-center w-full overflow-x-hidden">
        <Outlet />
      </main>

      {/* Matching Stitch Auth Footer */}
      <footer className="w-full py-6 bg-[#0b0e11] border-t border-[#3a494b]/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-[#8e9dae]">
          <span className="font-body-sm font-semibold tracking-wider">
            &copy; 2026 MJ ESPORTS. FOR THE ELITE.
          </span>
          <div className="flex gap-6 font-semibold">
            <Link to="/about" className="hover:text-[#00f2ff] transition-colors">Terms</Link>
            <Link to="/about" className="hover:text-[#00f2ff] transition-colors">Privacy</Link>
            <Link to="/about" className="hover:text-[#00f2ff] transition-colors">Support</Link>
          </div>
        </div>
      </footer>

    </div>
  )
}
