import { Link } from 'react-router-dom'
import { Swords, MessageSquare, Mail, ShieldCheck, Video, Tv, Globe, Share2 } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-slate-950 border-t border-slate-900 pt-16 pb-8 text-slate-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-slate-900">
          
          {/* Brand Info */}
          <div className="space-y-4 md:col-span-1">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-cyan-400 p-[1px]">
                <div className="w-full h-full bg-slate-950 rounded-[11px] flex items-center justify-center">
                  <Swords className="w-4 h-4 text-purple-400" />
                </div>
              </div>
              <span className="text-lg font-extrabold tracking-wider text-white">
                MJ ESPORTS
              </span>
            </Link>
            <p className="text-xs text-slate-400 leading-relaxed">
              The ultimate competitive arena for gamers, teams, and tournament organizers. Compete, rank up, and claim real prize pools.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <a href="https://discord.com" target="_blank" rel="noreferrer" title="Discord" className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-purple-400 hover:border-purple-500/50 transition-colors">
                <MessageSquare className="w-4 h-4" />
              </a>
              <a href="https://twitter.com" target="_blank" rel="noreferrer" title="Twitter" className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-cyan-400 hover:border-cyan-500/50 transition-colors">
                <Globe className="w-4 h-4" />
              </a>
              <a href="https://youtube.com" target="_blank" rel="noreferrer" title="YouTube" className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-red-400 hover:border-red-500/50 transition-colors">
                <Video className="w-4 h-4" />
              </a>
              <a href="https://twitch.tv" target="_blank" rel="noreferrer" title="Twitch" className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-purple-400 hover:border-purple-500/50 transition-colors">
                <Tv className="w-4 h-4" />
              </a>
              <a href="https://instagram.com" target="_blank" rel="noreferrer" title="Instagram" className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-pink-400 hover:border-pink-500/50 transition-colors">
                <Share2 className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">Platform</h4>
            <ul className="space-y-2 text-xs">
              <li><Link to="/tournaments" className="hover:text-purple-400 transition-colors">Browse Tournaments</Link></li>
              <li><Link to="/leaderboard" className="hover:text-purple-400 transition-colors">Global Leaderboard</Link></li>
              <li><Link to="/about" className="hover:text-purple-400 transition-colors">About Platform</Link></li>
              <li><Link to="/register" className="hover:text-purple-400 transition-colors">Create Account</Link></li>
            </ul>
          </div>

          {/* Official V1 Supported Games */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">Official V1 Supported Games</h4>
            <ul className="space-y-2 text-xs">
              <li className="hover:text-cyan-400 transition-colors cursor-pointer flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                <span>Free Fire</span>
              </li>
              <li className="hover:text-cyan-400 transition-colors cursor-pointer flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                <span>BGMI</span>
              </li>
            </ul>
          </div>

          {/* Support & Legal */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">Support & Contact</h4>
            <div className="space-y-2 text-xs">
              <p className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <a href="mailto:support.mjesports@gmail.com" className="hover:text-purple-300 transition-colors">
                  support.mjesports@gmail.com
                </a>
              </p>
              <p className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Fair Play Guaranteed</span>
              </p>
            </div>
          </div>
        </div>

        {/* Copyright Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>&copy; {new Date().getFullYear()} MJ ESPORTS. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span className="hover:text-slate-400 cursor-pointer">Privacy Policy</span>
            <span className="hover:text-slate-400 cursor-pointer">Terms of Service</span>
            <span className="hover:text-slate-400 cursor-pointer">Rules & Guidelines</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
