import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Wallet, Swords, User, LogOut } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

export const StitchHeader: React.FC = () => {
  const location = useLocation()
  const { user, isAuthenticated, signOut } = useAuth()

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Tournaments', path: '/tournaments' },
    { name: 'Live Center', path: '/live' },
    { name: 'Leaderboard', path: '/leaderboard' },
  ]

  const isActive = (path: string) => location.pathname === path

  const userDisplayName = user?.user_metadata?.username || user?.email?.split('@')[0] || 'Elite Player'

  return (
    <header className="fixed top-0 w-full z-50 bg-[#111417]/90 backdrop-blur-xl border-b border-[#3a494b] shadow-[0_0_15px_rgba(0,219,231,0.15)] flex justify-between items-center h-16 px-4 md:px-8 transition-all duration-200">
      {/* Brand Logo */}
      <div className="flex items-center gap-6">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded bg-[#00dbe7] p-[1px] shadow-[0_0_12px_rgba(0,219,231,0.4)]">
            <div className="w-full h-full bg-[#0b0e11] rounded flex items-center justify-center">
              <Swords className="w-5 h-5 text-[#00dbe7]" />
            </div>
          </div>
          <span className="font-display-lg text-xl md:text-2xl font-extrabold italic uppercase tracking-tighter text-[#00dbe7]">
            MJ_<span className="text-[#fe6b00]">ARENA</span>
          </span>
        </Link>

        {/* Desktop Primary Nav Links */}
        <nav className="hidden md:flex items-center gap-6 font-bold text-xs uppercase tracking-wider">
          {navLinks.map((link) => (
            <Link
              key={`stitch-nav-${link.name}`}
              to={link.path}
              className={`transition-colors border-b-2 py-1 ${
                isActive(link.path)
                  ? 'text-[#00f2ff] border-[#00f2ff]'
                  : 'text-[#b9cacb] border-transparent hover:text-[#00f2ff]'
              }`}
            >
              {link.name}
            </Link>
          ))}
        </nav>
      </div>

      {/* Right User Bar / Wallet / Auth */}
      <div className="flex items-center gap-3">
        {/* Wallet Display */}
        <div className="bg-[#1d2023] flex items-center px-3 py-1.5 gap-2 rounded border border-[#3a494b]">
          <Wallet className="w-4 h-4 text-[#fe6b00]" />
          <span className="font-mono text-xs font-bold text-[#ffb693]">₹2,500.00</span>
        </div>

        {isAuthenticated ? (
          <div className="flex items-center gap-2">
            <Link
              to="/profile"
              className="flex items-center gap-2 bg-[#1d2023] hover:bg-[#272a2e] px-2.5 py-1 rounded border border-[#3a494b] transition-colors"
            >
              <div className="w-7 h-7 bg-[#00f2ff]/20 rounded border border-[#00f2ff] flex items-center justify-center">
                <User className="w-3.5 h-3.5 text-[#00f2ff]" />
              </div>
              <span className="hidden sm:inline text-xs font-bold text-[#e1e2e7]">{userDisplayName}</span>
            </Link>
            <button
              onClick={() => signOut()}
              className="p-1.5 rounded bg-[#1d2023] border border-[#3a494b] text-[#b9cacb] hover:text-red-400 transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="text-xs font-bold text-[#b9cacb] hover:text-[#00f2ff] px-2 py-1 transition-colors"
            >
              Login
            </Link>
            <Link
              to="/register"
              className="bg-[#fe6b00] text-slate-950 px-3.5 py-1.5 rounded text-xs font-extrabold uppercase tracking-wider hover:brightness-110 shadow-[0_0_10px_rgba(254,107,0,0.4)] transition-all"
            >
              Register
            </Link>
          </div>
        )}
      </div>
    </header>
  )
}
