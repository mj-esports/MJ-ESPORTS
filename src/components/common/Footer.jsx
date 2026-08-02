import { Link } from 'react-router-dom'
import { Swords, MessageSquare, Mail, ShieldCheck, Video, Tv, Globe, Share2 } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-[#07090c] border-t border-[#3a494b]/60 pt-12 sm:pt-16 pb-24 md:pb-8 text-[#b9cacb]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 pb-10 sm:pb-12 border-b border-[#3a494b]/40">
          
          {/* Brand Info */}
          <div className="space-y-4 md:col-span-1">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#00f2ff] p-[1px] shadow-[0_0_12px_rgba(0,242,255,0.4)]">
                <div className="w-full h-full bg-[#07090c] rounded-[7px] flex items-center justify-center">
                  <Swords className="w-4 h-4 text-[#00f2ff]" />
                </div>
              </div>
              <span className="font-display-lg text-lg font-extrabold tracking-wider text-white">
                MJ <span className="text-[#00f2ff]">ESPORTS</span>
              </span>
            </Link>
            <p className="text-xs text-[#8e9dae] leading-relaxed">
              The ultimate AAA competitive arena for gamers, teams, and tournament organizers. Compete, rank up, and claim real prize pools.
            </p>
            {/* Official Brand Social Media Icons */}
            <div className="flex items-center gap-3 pt-2">
              {/* 🎮 1. Discord */}
              {/* TODO: Replace with official MJ ESPORTS Discord Server URL */}
              <a
                href="#"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="MJ ESPORTS Discord"
                title="MJ ESPORTS Discord"
                className="w-9 h-9 rounded-lg bg-[#151a21] border border-[#3a494b]/60 flex items-center justify-center text-[#5865F2] hover:scale-110 hover:border-[#5865F2]/80 hover:shadow-[0_0_15px_rgba(88,101,242,0.6)] transition-all duration-200 cursor-pointer"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.093.252-.19.373-.287a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.287a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                </svg>
              </a>

              {/* 📸 2. Instagram */}
              {/* TODO: Replace with official MJ ESPORTS Instagram Profile URL */}
              <a
                href="#"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="MJ ESPORTS Instagram"
                title="MJ ESPORTS Instagram"
                className="w-9 h-9 rounded-lg bg-[#151a21] border border-[#3a494b]/60 flex items-center justify-center hover:scale-110 hover:border-[#DD2A7B]/80 hover:shadow-[0_0_15px_rgba(221,42,123,0.6)] transition-all duration-200 cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <defs>
                    <linearGradient id="ig-brand-grad" x1="0%" y1="100%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#F58529" />
                      <stop offset="25%" stopColor="#FEDA77" />
                      <stop offset="50%" stopColor="#DD2A7B" />
                      <stop offset="75%" stopColor="#8134AF" />
                      <stop offset="100%" stopColor="#515BD4" />
                    </linearGradient>
                  </defs>
                  <path fill="url(#ig-brand-grad)" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>

              {/* ▶️ 3. YouTube */}
              {/* TODO: Replace with official MJ ESPORTS YouTube Channel URL */}
              <a
                href="#"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="MJ ESPORTS YouTube"
                title="MJ ESPORTS YouTube"
                className="w-9 h-9 rounded-lg bg-[#151a21] border border-[#3a494b]/60 flex items-center justify-center text-[#FF0000] hover:scale-110 hover:border-[#FF0000]/80 hover:shadow-[0_0_15px_rgba(255,0,0,0.6)] transition-all duration-200 cursor-pointer"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
              </a>

              {/* ✈️ 4. Telegram */}
              {/* TODO: Replace with official MJ ESPORTS Telegram Channel URL */}
              <a
                href="#"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="MJ ESPORTS Telegram"
                title="MJ ESPORTS Telegram"
                className="w-9 h-9 rounded-lg bg-[#151a21] border border-[#3a494b]/60 flex items-center justify-center text-[#229ED9] hover:scale-110 hover:border-[#229ED9]/80 hover:shadow-[0_0_15px_rgba(34,158,217,0.6)] transition-all duration-200 cursor-pointer"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.831-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                </svg>
              </a>

              {/* 𝕏 5. X (Twitter) */}
              {/* TODO: Replace with official MJ ESPORTS X Profile URL */}
              <a
                href="#"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="MJ ESPORTS X (Twitter)"
                title="MJ ESPORTS X (Twitter)"
                className="w-9 h-9 rounded-lg bg-[#151a21] border border-[#3a494b]/60 flex items-center justify-center text-white hover:scale-110 hover:border-white/80 hover:shadow-[0_0_15px_rgba(255,255,255,0.6)] transition-all duration-200 cursor-pointer"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="font-label-caps text-xs text-[#e1e2e7]">Platform</h4>
            <ul className="space-y-2 text-xs">
              <li><Link to="/tournaments" className="hover:text-[#00f2ff] transition-colors">Browse Tournaments</Link></li>
              <li><Link to="/leaderboard" className="hover:text-[#00f2ff] transition-colors">Global Leaderboard</Link></li>
              <li><Link to="/about" className="hover:text-[#00f2ff] transition-colors">About Platform</Link></li>
              <li><Link to="/register" className="hover:text-[#00f2ff] transition-colors">Create Account</Link></li>
            </ul>
          </div>

          {/* Official V1 Supported Games */}
          <div className="space-y-3">
            <h4 className="font-label-caps text-xs text-[#e1e2e7]">Official V1 Supported Games</h4>
            <ul className="space-y-2 text-xs">
              <li className="hover:text-[#00f2ff] transition-colors cursor-pointer flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#fe6b00]"></span>
                <span className="font-bold">Free Fire</span>
              </li>
              <li className="hover:text-[#00f2ff] transition-colors cursor-pointer flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#00f2ff]"></span>
                <span className="font-bold">BGMI</span>
              </li>
            </ul>
          </div>

          {/* Support & Legal */}
          <div className="space-y-3">
            <h4 className="font-label-caps text-xs text-[#e1e2e7]">Support & Contact</h4>
            <div className="space-y-2 text-xs">
              <p className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-[#00f2ff] shrink-0" />
                <a href="mailto:support.mjesports@gmail.com" className="hover:text-[#00f2ff] transition-colors">
                  support.mjesports@gmail.com
                </a>
              </p>
              <p className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-[#00ff9d] shrink-0" />
                <span className="text-[#00ff9d] font-bold">Fair Play Guaranteed</span>
              </p>
            </div>
          </div>
        </div>

        {/* Copyright Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#8e9dae]">
          <p>&copy; {new Date().getFullYear()} MJ ESPORTS. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span className="hover:text-[#00f2ff] cursor-pointer">Privacy Policy</span>
            <span className="hover:text-[#00f2ff] cursor-pointer">Terms of Service</span>
            <span className="hover:text-[#00f2ff] cursor-pointer">Rules & Guidelines</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
