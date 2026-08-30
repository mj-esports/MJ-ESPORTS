import { Link } from 'react-router-dom'
import { Swords, Headphones, ShieldCheck } from 'lucide-react'

/**
 * MJ ESPORTS — Compact Official Esports Platform Footer
 * 
 * Sleek, focused, esports-grade compact footer with cyan primary accents,
 * secondary orange game accents, social controls, rulebook/support links, and mobile safe-area spacing.
 */
export default function Footer() {
  return (
    <footer
      className="bg-[#0e0e0f] border-t border-[#27272a] pt-5 sm:pt-6 pb-24 md:pb-6 text-[#8e9dae] relative select-none"
      aria-label="Platform Footer and Support"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* COMPACT TOP ROW: BRAND, RULEBOOK & SUPPORT, SOCIALS */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3.5 sm:gap-6 pb-3.5 sm:pb-4">
          
          {/* Brand Info (1. Strong Brand, 2. Secondary Game Subtitle) */}
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 text-center sm:text-left">
            <Link to="/" className="inline-flex items-center gap-2.5 group">
              <div className="w-7 h-7 rounded bg-[#00f2ff] p-[1px] shadow-[0_0_12px_rgba(0,242,255,0.35)] transition-transform duration-200 group-hover:scale-105">
                <div className="w-full h-full bg-[#141416] rounded-[3px] flex items-center justify-center">
                  <Swords className="w-3.5 h-3.5 text-[#00f2ff]" />
                </div>
              </div>
              <span className="font-headline text-lg sm:text-xl font-extrabold tracking-wider text-white uppercase leading-none">
                MJ <span className="text-[#00f2ff]">ESPORTS</span>
              </span>
            </Link>
            <span className="hidden sm:inline text-[#3f3f46]">&bull;</span>
            <span className="text-[14px] xs:text-[15px] sm:text-sm font-headline font-bold tracking-wider text-[#ff5e07] uppercase">
              Free Fire MAX & BGMI Arena
            </span>
          </div>

          {/* Quick Nav Links (Rulebook & Info + Support mailto ONLY) */}
          <nav aria-label="Footer Quick Links" className="flex items-center justify-center gap-6 sm:gap-8 text-[14px] sm:text-[15px] font-headline font-bold uppercase tracking-wider text-center">
            <Link to="/about" className="text-[#b9cacb] hover:text-[#00f2ff] transition-colors py-0.5">
              Rulebook & Info
            </Link>
            <a
              href="mailto:support.mjesports@gmail.com?subject=MJ%20ESPORTS%20Support%20Request"
              aria-label="Contact MJ ESPORTS Support via Email"
              className="text-[#b9cacb] hover:text-[#00f2ff] transition-colors flex items-center justify-center gap-1.5 py-0.5 cursor-pointer group/support"
            >
              <Headphones className="w-4 h-4 text-[#00f2ff] group-hover/support:scale-105 transition-transform" />
              <span>Support</span>
            </a>
          </nav>

          {/* Esports Tactical Social Buttons */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Instagram */}
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="MJ ESPORTS Instagram"
              className="w-11 h-11 sm:w-12 sm:h-12 rounded bg-[#141416] border border-[#27272a] hover:border-[#00f2ff]/80 hover:shadow-[0_0_12px_rgba(0,242,255,0.3)] transition-all flex items-center justify-center group active:scale-95"
            >
              <svg
                className="w-5 h-5 transition-transform group-hover:scale-105"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <linearGradient id="ig-gradient-compact" x1="2" y1="22" x2="22" y2="2" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#fdf497" />
                    <stop offset="25%" stopColor="#f58529" />
                    <stop offset="50%" stopColor="#dd2a7b" />
                    <stop offset="75%" stopColor="#8134af" />
                    <stop offset="100%" stopColor="#515bd4" />
                  </linearGradient>
                </defs>
                <rect x="2" y="2" width="20" height="20" rx="5.5" stroke="url(#ig-gradient-compact)" strokeWidth="2" fill="none" />
                <circle cx="12" cy="12" r="4.2" stroke="url(#ig-gradient-compact)" strokeWidth="2" fill="none" />
                <circle cx="17.2" cy="6.8" r="1.2" fill="url(#ig-gradient-compact)" />
              </svg>
            </a>

            {/* WhatsApp */}
            <a
              href="https://whatsapp.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="MJ ESPORTS WhatsApp Community"
              className="w-11 h-11 sm:w-12 sm:h-12 rounded bg-[#141416] border border-[#27272a] hover:border-[#25D366] hover:shadow-[0_0_12px_rgba(37,211,102,0.3)] transition-all flex items-center justify-center group active:scale-95"
            >
              <svg
                className="w-5 h-5 transition-transform group-hover:scale-105"
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

        {/* BOTTOM DIVIDER & COPYRIGHT BAR (Smallest Legal / Terms Text 12-14px) */}
        <div className="pt-2.5 sm:pt-3 border-t border-[#27272a] flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-3 text-xs text-[#849495]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-[#10b981]" />
            <p className="font-mono text-[12px] sm:text-[13px] text-center sm:text-left">
              &copy; {new Date().getFullYear()} MJ ESPORTS. All rights reserved.
            </p>
          </div>
          <div className="flex items-center justify-center gap-4 text-[13px] sm:text-[14px] font-medium font-headline">
            <Link to="/privacy" className="text-[#849495] hover:text-[#00f2ff] transition-colors whitespace-nowrap">
              Privacy Policy
            </Link>
            <span className="text-[#3f3f46]">&bull;</span>
            <Link to="/terms" className="text-[#849495] hover:text-[#00f2ff] transition-colors whitespace-nowrap">
              Terms of Service
            </Link>
          </div>
        </div>

      </div>
    </footer>
  )
}
