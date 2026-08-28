import { Link } from 'react-router-dom'
import { Swords, ShieldCheck, Headphones, ChevronRight } from 'lucide-react'

/**
 * MJ ESPORTS — Official Esports Platform Footer
 * 
 * Aggressive, tactical, clean 4-column gaming footer with electric cyan primary accents,
 * secondary orange game accents, esports-grade social controls, and support links.
 */
export default function Footer() {
  return (
    <footer className="bg-[#080c14] border-t border-[#1e2630] pt-10 pb-28 md:pb-10 text-[#8e9dae] relative select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* 4-COLUMN MAIN DESKTOP GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-10 pb-8">
          
          {/* COLUMN 1 — MJ ESPORTS (BRAND INFO: 4 COLS) */}
          <div className="space-y-4 sm:col-span-2 lg:col-span-4 pr-0 lg:pr-4">
            
            {/* Brand Logo & Name */}
            <Link to="/" className="inline-flex items-center gap-3 group">
              <div className="w-8 h-8 rounded bg-[#00f2ff] p-[1px] shadow-[0_0_14px_rgba(0,242,255,0.4)] transition-transform duration-300 group-hover:scale-105">
                <div className="w-full h-full bg-[#0a0f18] rounded-[3px] flex items-center justify-center">
                  <Swords className="w-4 h-4 text-[#00f2ff]" />
                </div>
              </div>
              <span className="font-display-lg text-lg font-extrabold tracking-wider text-white uppercase">
                MJ <span className="text-[#00f2ff]">ESPORTS</span>
              </span>
            </Link>

            {/* Subtitle Badge */}
            <div>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-mono font-bold tracking-wider bg-[#00f2ff]/10 text-[#00f2ff] border border-[#00f2ff]/30">
                Free Fire & BGMI Arena
              </span>
            </div>

            {/* Short Platform Description */}
            <p className="text-xs text-[#8e9dae] leading-relaxed max-w-sm font-sans">
              India's premier competitive arena for Free Fire MAX and BGMI squads. Compete in daily custom tournaments, track live leaderboards, and claim instant cash rewards.
            </p>

            {/* Esports Tactical Social Buttons */}
            <div className="flex items-center gap-3 pt-1">
              {/* Instagram Tactical Control */}
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="MJ ESPORTS Instagram"
                className="w-[42px] h-[42px] rounded-[8px] bg-[#0e131b] border border-[#292d31] shadow-sm hover:border-[#00f2ff]/80 hover:shadow-[0_0_15px_rgba(0,242,255,0.35)] transition-all duration-200 transform active:scale-95 hover:-translate-y-[3px] flex items-center justify-center group outline-none"
              >
                <svg
                  className="w-[21px] h-[21px] transition-transform duration-200 group-hover:scale-105"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    <linearGradient id="ig-brand-gradient" x1="2" y1="22" x2="22" y2="2" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#fdf497" />
                      <stop offset="25%" stopColor="#f58529" />
                      <stop offset="50%" stopColor="#dd2a7b" />
                      <stop offset="75%" stopColor="#8134af" />
                      <stop offset="100%" stopColor="#515bd4" />
                    </linearGradient>
                  </defs>
                  <rect x="2" y="2" width="20" height="20" rx="5.5" stroke="url(#ig-brand-gradient)" strokeWidth="2" fill="none" />
                  <circle cx="12" cy="12" r="4.2" stroke="url(#ig-brand-gradient)" strokeWidth="2" fill="none" />
                  <circle cx="17.2" cy="6.8" r="1.2" fill="url(#ig-brand-gradient)" />
                </svg>
              </a>

              {/* WhatsApp Tactical Control */}
              <a
                href="https://whatsapp.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="MJ ESPORTS WhatsApp Community"
                className="w-[42px] h-[42px] rounded-[8px] bg-[#0e131b] border border-[#292d31] shadow-sm hover:border-[#25D366] hover:shadow-[0_0_15px_rgba(37,211,102,0.35)] transition-all duration-200 transform active:scale-95 hover:-translate-y-[3px] flex items-center justify-center group outline-none"
              >
                <svg
                  className="w-[21px] h-[21px] transition-all duration-200 group-hover:scale-105"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M18.403 5.638A8.919 8.919 0 0 0 12.053 3c-4.948 0-8.976 4.027-8.978 8.977 0 1.582.413 3.126 1.198 4.488L3 21.162l4.827-1.266a8.956 8.956 0 0 0 4.222 1.06h.004c4.947 0 8.975-4.027 8.977-8.977a8.927 8.927 0 0 0-2.627-6.341zM12.057 19.444h-.003a7.447 7.447 0 0 1-3.795-1.041l-.272-.162-2.824.74.754-2.752-.177-.282a7.443 7.443 0 0 1-1.144-3.971c.002-4.114 3.35-7.462 7.467-7.462a7.433 7.433 0 0 1 5.28 2.188 7.437 7.437 0 0 1 2.186 5.284c-.002 4.114-3.35 7.463-7.467 7.463zm4.095-5.594c-.225-.113-1.327-.655-1.533-.73-.205-.075-.354-.112-.504.113-.149.224-.579.73-.71.879-.13.15-.261.168-.486.056-.225-.113-.948-.349-1.806-1.113-.667-.595-1.118-1.33-1.248-1.554-.13-.225-.014-.346.099-.458.101-.1.224-.262.336-.393.112-.131.15-.224.224-.374.075-.15.038-.28-.019-.393-.056-.112-.505-1.217-.692-1.666-.182-.438-.367-.379-.504-.386l-.43-.008c-.149 0-.392.056-.598.28-.205.225-.784.767-.784 1.872s.803 2.171.915 2.32c.112.15 1.58 2.412 3.828 3.382.535.231.952.369 1.277.473.537.171 1.025.147 1.411.089.431-.065 1.327-.543 1.514-1.067.187-.524.187-.973.131-1.067-.056-.094-.206-.15-.431-.262z"
                    fill="#25D366"
                  />
                </svg>
              </a>
            </div>

          </div>

          {/* COLUMN 2 — PLATFORM (3 COLS) */}
          <div className="space-y-3 sm:col-span-1 lg:col-span-3">
            <h3 className="font-display-lg text-xs text-white uppercase font-extrabold tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-sm bg-[#00f2ff] shrink-0" />
              <span>PLATFORM</span>
            </h3>
            <ul className="space-y-2.5 text-xs font-medium">
              <li>
                <Link
                  to="/tournaments"
                  className="text-[#8e9dae] hover:text-[#00f2ff] transition-all flex items-center gap-2.5 group"
                >
                  <span className="w-4 h-4 flex items-center justify-center shrink-0">
                    <ChevronRight className="w-3.5 h-3.5 text-[#3a494b] group-hover:text-[#00f2ff] transition-colors" />
                  </span>
                  <span>Browse Tournaments</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/leaderboard"
                  className="text-[#8e9dae] hover:text-[#00f2ff] transition-all flex items-center gap-2.5 group"
                >
                  <span className="w-4 h-4 flex items-center justify-center shrink-0">
                    <ChevronRight className="w-3.5 h-3.5 text-[#3a494b] group-hover:text-[#00f2ff] transition-colors" />
                  </span>
                  <span>Global Leaderboard</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/about"
                  className="text-[#8e9dae] hover:text-[#00f2ff] transition-all flex items-center gap-2.5 group"
                >
                  <span className="w-4 h-4 flex items-center justify-center shrink-0">
                    <ChevronRight className="w-3.5 h-3.5 text-[#3a494b] group-hover:text-[#00f2ff] transition-colors" />
                  </span>
                  <span>About Platform</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* COLUMN 3 — SUPPORTED GAMES (3 COLS) */}
          <div className="space-y-3 sm:col-span-1 lg:col-span-3">
            <h3 className="font-display-lg text-xs text-white uppercase font-extrabold tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-sm bg-[#ff6b00] shrink-0" />
              <span>SUPPORTED GAMES</span>
            </h3>
            <ul className="space-y-2.5 text-xs">
              <li className="flex items-center gap-2.5">
                <span className="w-4 h-4 flex items-center justify-center shrink-0">
                  <span className="w-2 h-2 rounded-full bg-[#ff6b00] shadow-[0_0_8px_rgba(255,107,0,0.7)]" />
                </span>
                <span className="font-bold text-[#e1e2e7]">Free Fire MAX</span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="w-4 h-4 flex items-center justify-center shrink-0">
                  <span className="w-2 h-2 rounded-full bg-[#00f2ff] shadow-[0_0_8px_rgba(0,242,255,0.7)]" />
                </span>
                <span className="font-bold text-[#e1e2e7]">BGMI</span>
              </li>
            </ul>
          </div>

          {/* COLUMN 4 — SUPPORT (2 COLS) */}
          <div className="space-y-3 sm:col-span-1 lg:col-span-2">
            <h3 className="font-display-lg text-xs text-white uppercase font-extrabold tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-sm bg-[#00f2ff] shrink-0" />
              <span>SUPPORT</span>
            </h3>
            <div className="space-y-2.5 text-xs">
              <Link
                to="/about"
                className="flex items-center gap-2.5 text-[#e1e2e7] hover:text-[#00f2ff] font-medium transition-colors group"
              >
                <span className="w-4 h-4 flex items-center justify-center shrink-0">
                  <Headphones className="w-4 h-4 text-[#00f2ff] transition-transform group-hover:scale-110" />
                </span>
                <span>Contact Support</span>
              </Link>
              <div className="flex items-center gap-2.5 text-[#8e9dae]">
                <span className="w-4 h-4 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4 text-[#10b981]" />
                </span>
                <span>Fair Play Guaranteed</span>
              </div>
            </div>
          </div>

        </div>

        {/* BOTTOM DIVIDER & COPYRIGHT BAR */}
        <div className="pt-6 border-t border-[#1e2630] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#717f90]">
          <p className="font-mono text-xs text-center sm:text-left">
            &copy; {new Date().getFullYear()} MJ ESPORTS. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-[11px] font-medium">
            <Link
              to="/about"
              className="text-[#717f90] hover:text-[#00f2ff] transition-colors"
            >
              Privacy Policy
            </Link>
            <span className="text-[#2e3846]">&#8226;</span>
            <Link
              to="/about"
              className="text-[#717f90] hover:text-[#00f2ff] transition-colors"
            >
              Terms of Service
            </Link>
          </div>
        </div>

      </div>
    </footer>
  )
}
