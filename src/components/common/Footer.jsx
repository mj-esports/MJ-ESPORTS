import { Link, useLocation } from 'react-router-dom'
import { Swords, Mail, ShieldCheck } from 'lucide-react'

export default function Footer() {
  const location = useLocation()
  const isHomePage = location.pathname === '/'

  // Footer exists ONLY on the Home page ('/')
  if (!isHomePage) {
    return null
  }

  return (
    <footer className="bg-[#0e0e0f] border-t border-[#27272a] pt-7 sm:pt-9 pb-24 md:pb-8 text-[#b9cacb]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Main Grid: Compact & Balanced 24px–32px Visual Hierarchy */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 lg:gap-10 pb-7 border-b border-[#27272a]">
          
          {/* Brand Info */}
          <div className="space-y-3 lg:col-span-1">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded bg-[#00f2ff] p-[1px] shadow-[0_0_12px_rgba(0,242,255,0.4)]">
                <div className="w-full h-full bg-[#131314] rounded-[3px] flex items-center justify-center">
                  <Swords className="w-4 h-4 text-[#00f2ff]" />
                </div>
              </div>
              <span className="font-headline text-base sm:text-lg font-bold tracking-wider text-white">
                MJ <span className="text-[#00f2ff]">ESPORTS</span>
              </span>
            </Link>

            <p className="text-xs text-[#b9cacb]/80 leading-relaxed">
              The ultimate AAA competitive arena for gamers, teams, and tournament organizers. Compete, rank up, and claim real prize pools.
            </p>

            {/* AAA Esports Official Brand Social Buttons */}
            <div className="flex items-center gap-4 pt-2">
              {/* Official Instagram AAA Dark Glass Button */}
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="MJ ESPORTS Instagram"
                className="w-12 h-12 sm:w-[50px] sm:h-[50px] rounded-[14px] bg-[#161B22]/95 backdrop-blur-md border border-[#272d35] shadow-md hover:border-[#dd2a7b]/60 hover:shadow-[0_0_20px_rgba(221,42,123,0.45)] focus-visible:border-[#dd2a7b]/60 focus-visible:shadow-[0_0_20px_rgba(221,42,123,0.45)] transition-all duration-300 transform active:scale-95 hover:-translate-y-0.5 flex items-center justify-center shrink-0 group touch-manipulation outline-none"
              >
                <svg className="w-6 h-6 transition-transform duration-300 group-hover:scale-110" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
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

              {/* Official WhatsApp Community AAA Dark Glass Button */}
              <a
                href="https://whatsapp.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="MJ ESPORTS WhatsApp Community"
                className="w-12 h-12 sm:w-[50px] sm:h-[50px] rounded-[14px] bg-[#161B22]/95 backdrop-blur-md border border-[#272d35] shadow-md hover:border-[#25D366]/60 hover:shadow-[0_0_20px_rgba(37,211,102,0.45)] focus-visible:border-[#25D366]/60 focus-visible:shadow-[0_0_20px_rgba(37,211,102,0.45)] transition-all duration-300 transform active:scale-95 hover:-translate-y-0.5 flex items-center justify-center shrink-0 group touch-manipulation outline-none"
              >
                <svg className="w-6 h-6 fill-[#25D366] transition-transform duration-300 group-hover:scale-110" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.461c-1.852 0-3.67-.498-5.266-1.442l-.377-.225-3.916 1.027 1.045-3.817-.247-.392a9.78 9.78 0 01-1.503-5.228c0-5.405 4.398-9.802 9.805-9.802 2.617 0 5.078 1.022 6.929 2.873 1.85 1.852 2.87 4.311 2.868 6.929 0 5.407-4.398 9.805-9.805 9.805m0-18.005a11.94 11.94 0 00-8.455 3.504 11.94 11.94 0 00-3.502 8.455c0 2.102.547 4.155 1.587 5.968l-1.687 6.163 6.305-1.654a11.905 11.905 0 005.752 1.481h.005c6.586 0 11.946-5.36 11.948-11.946 0-3.19-1.243-6.189-3.502-8.449A11.905 11.905 0 0012.051 3.837" />
                </svg>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="font-label-md text-xs text-[#e1e2e7] uppercase font-bold tracking-wider mb-2">Platform</h4>
            <ul className="space-y-2 text-xs font-body">
              <li><Link to="/tournaments" className="hover:text-[#00f2ff] transition-colors">Browse Tournaments</Link></li>
              <li><Link to="/leaderboard" className="hover:text-[#00f2ff] transition-colors">Global Leaderboard</Link></li>
              <li><Link to="/about" className="hover:text-[#00f2ff] transition-colors">About Platform</Link></li>
            </ul>
          </div>

          {/* Official Supported Games */}
          <div className="space-y-3">
            <h4 className="font-label-md text-xs text-[#e1e2e7] uppercase font-bold tracking-wider mb-2">Supported Games</h4>
            <ul className="space-y-2 text-xs font-body">
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#fe6b00]"></span>
                <span className="font-bold">Free Fire MAX</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#00f2ff]"></span>
                <span className="font-bold">BGMI</span>
              </li>
            </ul>
          </div>

          {/* Support & Contact */}
          <div className="space-y-3">
            <h4 className="font-label-md text-xs text-[#e1e2e7] uppercase font-bold tracking-wider mb-2">Support</h4>
            <div className="space-y-2 text-xs font-body">
              <p className="flex items-center gap-2 min-w-0">
                <Mail className="w-3.5 h-3.5 text-[#00f2ff] shrink-0" />
                <a href="mailto:support.mjesports@gmail.com" className="hover:text-[#00f2ff] transition-colors truncate text-[11px] xs:text-xs">
                  support.mjesports@gmail.com
                </a>
              </p>
              <p className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-[#10b981] shrink-0" />
                <span className="text-[#10b981] font-bold">Fair Play Guaranteed</span>
              </p>
            </div>
          </div>
        </div>

        {/* Copyright Bar */}
        <div className="pt-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#849495]">
          <p>&copy; {new Date().getFullYear()} MJ ESPORTS. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span className="hover:text-[#00f2ff] cursor-pointer transition-colors">Privacy Policy</span>
            <span className="hover:text-[#00f2ff] cursor-pointer transition-colors">Terms of Service</span>
          </div>
        </div>
      </div>
    </footer>
  )
}


