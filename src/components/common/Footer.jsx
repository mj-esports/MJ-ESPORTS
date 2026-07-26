import { Link } from 'react-router-dom'
import { Swords, MessageSquare, Mail, ShieldCheck, Video, Tv, Globe, Share2 } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-[#07090c] border-t border-[#3a494b]/60 pt-16 pb-8 text-[#b9cacb] lg:pl-64">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-[#3a494b]/40">
          
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
            <div className="flex items-center gap-3 pt-2">
              <a href="https://discord.com" target="_blank" rel="noreferrer" title="Discord" className="w-8 h-8 rounded bg-[#151a21] border border-[#3a494b] flex items-center justify-center text-[#8e9dae] hover:text-[#00f2ff] hover:border-[#00f2ff]/50 transition-colors">
                <MessageSquare className="w-4 h-4" />
              </a>
              <a href="https://twitter.com" target="_blank" rel="noreferrer" title="Twitter" className="w-8 h-8 rounded bg-[#151a21] border border-[#3a494b] flex items-center justify-center text-[#8e9dae] hover:text-[#00f2ff] hover:border-[#00f2ff]/50 transition-colors">
                <Globe className="w-4 h-4" />
              </a>
              <a href="https://youtube.com" target="_blank" rel="noreferrer" title="YouTube" className="w-8 h-8 rounded bg-[#151a21] border border-[#3a494b] flex items-center justify-center text-[#8e9dae] hover:text-[#fe6b00] hover:border-[#fe6b00]/50 transition-colors">
                <Video className="w-4 h-4" />
              </a>
              <a href="https://twitch.tv" target="_blank" rel="noreferrer" title="Twitch" className="w-8 h-8 rounded bg-[#151a21] border border-[#3a494b] flex items-center justify-center text-[#8e9dae] hover:text-[#00f2ff] hover:border-[#00f2ff]/50 transition-colors">
                <Tv className="w-4 h-4" />
              </a>
              <a href="https://instagram.com" target="_blank" rel="noreferrer" title="Instagram" className="w-8 h-8 rounded bg-[#151a21] border border-[#3a494b] flex items-center justify-center text-[#8e9dae] hover:text-[#fe6b00] hover:border-[#fe6b00]/50 transition-colors">
                <Share2 className="w-4 h-4" />
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
