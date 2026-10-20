import { Outlet, Link } from 'react-router-dom'


export default function AuthLayout() {
  return (
    <div className="min-h-screen min-h-dvh bg-[#000000] text-[#ffffff] flex flex-col justify-between font-sans selection:bg-[#ffb900] selection:text-[#000000] overflow-x-hidden w-full">
      
      {/* Top Auth Header Bar (Standardized with Public Navbar) */}
      <header className="sticky top-0 z-50 bg-[#000000]/95 backdrop-blur-md border-b border-[#1B1B1F] shadow-[0_8px_24px_rgba(0,0,0,0.6)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex items-center justify-between h-16 sm:h-20">
          <Link to="/" className="flex items-center gap-2 sm:gap-3 group shrink min-w-0" aria-label="MJ ESPORTS Home">
            <img
              src="/mj-esports-logo.png"
              alt="MJ ESPORTS"
              className="w-8 h-8 xs:w-9 xs:h-9 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-none object-contain shrink-0 group-hover:scale-105 transition-transform duration-200 shadow-sm"
            />
            <div className="min-w-0 flex flex-col justify-center">
              <span className="font-headline text-xs xs:text-sm sm:text-xl font-extrabold tracking-wider text-white truncate block uppercase leading-tight">
                MJ <span className="text-[#FFB900]">ESPORTS</span>
              </span>
              <span className="text-[9.5px] xs:text-[11px] sm:text-xs font-bold tracking-wider text-[#FF6200] font-headline truncate block uppercase leading-tight mt-0.5">
                Free Fire MAX Arena
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3 shrink-0">
            <a
              href="mailto:support.mjesports@gmail.com?subject=MJ%20ESPORTS%20Support%20Request"
              aria-label="Contact MJ ESPORTS Support via Email"
              className="font-headline text-xs font-bold text-[#A3A3A3] hover:text-[#FFB900] transition-colors uppercase tracking-wider px-3 py-1.5 rounded-none bg-[#111318] border border-[#2A2A30] hover:border-[#FFB900]/50"
            >
              SUPPORT
            </a>
          </div>
        </div>
      </header>

      {/* Main Authentication Arena Content */}
      <main className="flex-1 flex flex-col items-center justify-center w-full min-w-0 overflow-x-hidden px-4 py-6 sm:py-10">
        <Outlet />
      </main>

      {/* Standardized Auth Footer */}
      <footer className="w-full py-5 sm:py-6 bg-[#000000] border-t border-[#1B1B1F]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-[#A3A3A3]">
          <span className="font-mono text-[12px] sm:text-[13px] text-center sm:text-left">
            &copy; {new Date().getFullYear()} MJ ESPORTS. All rights reserved.
          </span>
          <div className="flex items-center justify-center gap-4 text-[13px] sm:text-[14px] font-medium font-headline">
            <Link to="/privacy" className="text-[#A3A3A3] hover:text-[#FFB900] transition-colors whitespace-nowrap">
              Privacy Policy
            </Link>
            <span className="text-[#3f3f46]">&bull;</span>
            <Link to="/terms" className="text-[#A3A3A3] hover:text-[#FFB900] transition-colors whitespace-nowrap">
              Terms of Service
            </Link>
          </div>
        </div>
      </footer>

    </div>
  )
}
