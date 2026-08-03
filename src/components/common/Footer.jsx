import { Link, useLocation } from 'react-router-dom'
import { Swords, Mail, ShieldCheck } from 'lucide-react'

export default function Footer() {
  const location = useLocation()
  const isHomePage = location.pathname === '/'

  // Footer exists ONLY on the Home page ('/')
  if (!isHomePage) {
    return null
  }

  // Full Footer (Home Page Only - 30% Shorter)
  return (
    <footer className="bg-[#0b0e11] border-t border-[#3a494b]/60 pt-6 sm:pt-8 pb-20 md:pb-8 text-[#b9cacb]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 pb-6 sm:pb-8 border-b border-[#3a494b]/40">
          
          {/* Brand Info */}
          <div className="space-y-4 md:col-span-1">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-md bg-[#00f2ff] p-[1px] shadow-[0_0_12px_rgba(0,242,255,0.4)]">
                <div className="w-full h-full bg-[#0b0e11] rounded-[7px] flex items-center justify-center">
                  <Swords className="w-4 h-4 text-[#00f2ff]" />
                </div>
              </div>
              <span className="font-headline text-lg font-bold tracking-wider text-white">
                MJ <span className="text-[#00f2ff]">ESPORTS</span>
              </span>
            </Link>
            <p className="text-xs text-[#b9cacb]/80 leading-relaxed">
              The ultimate AAA competitive arena for gamers, teams, and tournament organizers. Compete, rank up, and claim real prize pools.
            </p>

            {/* Official Brand Social Media Icons */}
            <div className="flex items-center gap-3 pt-2">
              <a
                href="#"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="MJ ESPORTS Discord"
                className="w-9 h-9 rounded-md bg-[#1d2023] border border-[#3a494b]/60 flex items-center justify-center text-[#5865F2] hover:scale-105 transition-transform"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.093.252-.19.373-.287a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.287a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                </svg>
              </a>
              <a
                href="#"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="MJ ESPORTS YouTube"
                className="w-9 h-9 rounded-md bg-[#1d2023] border border-[#3a494b]/60 flex items-center justify-center text-[#FF0000] hover:scale-105 transition-transform"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="font-label-md text-xs text-[#e1e2e7]">Platform</h4>
            <ul className="space-y-2 text-xs font-body">
              <li><Link to="/tournaments" className="hover:text-[#00f2ff] transition-colors">Browse Tournaments</Link></li>
              <li><Link to="/leaderboard" className="hover:text-[#00f2ff] transition-colors">Global Leaderboard</Link></li>
              <li><Link to="/about" className="hover:text-[#00f2ff] transition-colors">About Platform</Link></li>
            </ul>
          </div>

          {/* Official Supported Games */}
          <div className="space-y-3">
            <h4 className="font-label-md text-xs text-[#e1e2e7]">Supported Games</h4>
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
            <h4 className="font-label-md text-xs text-[#e1e2e7]">Support</h4>
            <div className="space-y-2 text-xs font-body">
              <p className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-[#00f2ff] shrink-0" />
                <a href="mailto:support.mjesports@gmail.com" className="hover:text-[#00f2ff] transition-colors">
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
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#849495]">
          <p>&copy; {new Date().getFullYear()} MJ ESPORTS. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span className="hover:text-[#00f2ff] cursor-pointer">Privacy Policy</span>
            <span className="hover:text-[#00f2ff] cursor-pointer">Terms of Service</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
