import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Swords, Menu, X, User, LogOut, Shield, Info, Mail, ShieldCheck, FileText, Settings, Wallet } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const location = useLocation()
  const { user, isAuthenticated, isAdmin, role, signOut } = useAuth()

  // Primary navigation links (Home, Tournaments, Leaderboard, Admin if admin)
  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Tournaments', path: '/tournaments' },
    { name: 'Leaderboard', path: '/leaderboard' },
    ...(isAdmin ? [{ name: 'Admin', path: '/admin' }] : []),
  ]

  const isActive = (path) => location.pathname === path

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (err) {
      console.error('Sign Out Error:', err)
    }
  }

  const userDisplayName = user?.user_metadata?.username || user?.email?.split('@')[0] || 'Player'

  return (
    <nav className="sticky top-0 z-50 bg-[#0f1318]/90 backdrop-blur-xl border-b border-[#3a494b]/60 shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-lg bg-[#00f2ff] p-[1px] shadow-[0_0_15px_rgba(0,242,255,0.4)] group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-[#07090c] rounded-[7px] flex items-center justify-center">
                <Swords className="w-5 h-5 text-[#00f2ff]" />
              </div>
            </div>
            <div>
              <span className="font-display-lg text-xl font-extrabold tracking-wider text-white">
                MJ <span className="text-[#00f2ff]">ESPORTS</span>
              </span>
              <span className="flex items-center gap-1 text-[9px] uppercase font-bold tracking-widest text-[#fe6b00] -mt-1">
                <span>Free Fire & BGMI Arena</span>
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-1 bg-[#151a21] p-1.5 rounded-full border border-[#3a494b]/60 shadow-inner">
            {navLinks.map((link) => (
              <Link
                key={`nav-desktop-${link.name}`}
                to={link.path}
                className={`px-5 py-2 text-xs font-bold uppercase tracking-wider rounded-full transition-all duration-200 ${
                  isActive(link.path)
                    ? 'bg-[#00f2ff] text-[#00363a] font-extrabold shadow-[0_0_12px_rgba(0,242,255,0.5)]'
                    : 'text-[#b9cacb] hover:text-[#00f2ff] hover:bg-[#1d232c]'
                }`}
              >
                {link.name}
              </Link>
            ))}
          </div>

          {/* Desktop Auth Action Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                {/* Wallet Balance Display Pill */}
                <div className="bg-[#151a21] flex items-center px-3 py-1.5 gap-2 rounded border border-[#3a494b] text-xs font-mono font-bold text-[#fe6b00]">
                  <Wallet className="w-3.5 h-3.5 text-[#fe6b00]" />
                  <span>₹250.00</span>
                </div>

                {isAdmin && (
                  <Link
                    to="/admin"
                    className="px-3.5 py-1.5 rounded bg-[#fe6b00]/10 border border-[#fe6b00]/40 text-[#fe6b00] hover:bg-[#fe6b00]/20 text-xs font-extrabold flex items-center gap-1.5 transition-colors uppercase tracking-wider shadow-sm"
                  >
                    <Shield className="w-3.5 h-3.5 text-[#fe6b00]" />
                    <span>Admin Panel</span>
                  </Link>
                )}
                <Link
                  to="/profile"
                  className="px-3.5 py-1.5 rounded bg-[#151a21] border border-[#3a494b] hover:border-[#00f2ff] flex items-center gap-2 transition-colors shadow-sm"
                >
                  <User className="w-3.5 h-3.5 text-[#00f2ff]" />
                  <span className="text-xs font-bold text-[#e1e2e7]">{userDisplayName}</span>
                  {isAdmin && (
                    <span className="px-2 py-0.5 text-[9px] font-extrabold bg-[#fe6b00] text-slate-950 rounded uppercase shadow-sm">
                      ADMIN
                    </span>
                  )}
                </Link>
                <button
                  onClick={handleSignOut}
                  className="px-3 py-1.5 rounded bg-[#151a21] border border-[#3a494b] text-xs font-bold text-[#8e9dae] hover:text-[#ff3366] hover:border-[#ff3366]/40 transition-colors flex items-center gap-1.5 uppercase"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 text-xs font-bold text-[#b9cacb] hover:text-[#00f2ff] uppercase tracking-wider transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="btn-cyber-secondary"
                >
                  Register Now
                </Link>
              </>
            )}
          </div>

          {/* Mobile Side Drawer Hamburger Button */}
          <div className="md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2.5 rounded-lg bg-[#151a21] border border-[#3a494b] text-[#e1e2e7] hover:text-[#00f2ff] focus:outline-none min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Toggle Side Drawer Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6 text-[#00f2ff]" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Side Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#07090c] border-b border-[#3a494b] px-4 pt-3 pb-6 space-y-4 shadow-2xl">
          
          {/* User Status Card inside Drawer */}
          {isAuthenticated ? (
            <div className="p-3.5 rounded-xl bg-[#151a21] border border-[#3a494b] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-[#fe6b00]/20 border border-[#fe6b00] flex items-center justify-center">
                  <User className="w-4 h-4 text-[#fe6b00]" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">{userDisplayName}</span>
                  <span className="text-[10px] text-[#8e9dae]">{user?.email}</span>
                </div>
              </div>
              <span className="text-[10px] font-extrabold uppercase text-[#00f2ff] bg-[#00f2ff]/10 border border-[#00f2ff]/40 px-2 py-0.5 rounded">
                {isAdmin ? 'ADMIN' : 'PLAYER'}
              </span>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-[#151a21] border border-[#3a494b] flex items-center justify-between gap-3">
              <span className="text-xs font-bold text-[#e1e2e7]">Join MJ ESPORTS</span>
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-1.5 text-xs font-bold text-[#e1e2e7] bg-[#07090c] rounded border border-[#3a494b] uppercase"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-extrabold text-[#00363a] bg-[#00f2ff] rounded uppercase shadow-sm"
                >
                  Register
                </Link>
              </div>
            </div>
          )}

          {/* Primary Mobile Navigation Links */}
          <div className="flex flex-col space-y-1 text-xs">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#8e9dae] px-3 pt-1">
              Primary Menu
            </span>
            {navLinks.map((link) => (
              <Link
                key={`nav-mobile-${link.name}`}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`px-4 py-3 font-bold rounded-lg flex items-center justify-between min-h-[44px] uppercase tracking-wider ${
                  isActive(link.path)
                    ? 'bg-[#00f2ff]/10 text-[#00f2ff] border border-[#00f2ff]/40'
                    : 'text-[#b9cacb] hover:bg-[#151a21]'
                }`}
              >
                <span>{link.name}</span>
                {link.name === 'Admin' && (
                  <span className="text-[9px] font-extrabold bg-[#fe6b00] text-slate-950 px-2 py-0.5 rounded uppercase">
                    ADMIN
                  </span>
                )}
              </Link>
            ))}
          </div>

          {/* Secondary Options Drawer List */}
          <div className="flex flex-col space-y-1 text-xs pt-2 border-t border-[#3a494b]">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#8e9dae] px-3 pt-1">
              Platform Links
            </span>

            <Link
              to="/about"
              onClick={() => setMobileMenuOpen(false)}
              className="px-4 py-3 font-semibold text-[#b9cacb] hover:bg-[#151a21] rounded-lg flex items-center gap-2.5 min-h-[44px]"
            >
              <Info className="w-4 h-4 text-[#00f2ff]" />
              <span>About Platform</span>
            </Link>

            <a
              href="mailto:support.mjesports@gmail.com"
              onClick={() => setMobileMenuOpen(false)}
              className="px-4 py-3 font-semibold text-[#b9cacb] hover:bg-[#151a21] rounded-lg flex items-center gap-2.5 min-h-[44px]"
            >
              <Mail className="w-4 h-4 text-[#00f2ff]" />
              <span>Support & Contact</span>
            </a>

            <Link
              to="/tournaments"
              onClick={() => setMobileMenuOpen(false)}
              className="px-4 py-3 font-semibold text-[#b9cacb] hover:bg-[#151a21] rounded-lg flex items-center gap-2.5 min-h-[44px]"
            >
              <ShieldCheck className="w-4 h-4 text-[#00ff9d]" />
              <span>Rules & Guidelines</span>
            </Link>

            {isAuthenticated && (
              <Link
                to="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-3 font-semibold text-[#b9cacb] hover:bg-[#151a21] rounded-lg flex items-center gap-2.5 min-h-[44px]"
              >
                <Settings className="w-4 h-4 text-[#8e9dae]" />
                <span>Account Settings</span>
              </Link>
            )}
          </div>

          {/* Logout Action inside Drawer */}
          {isAuthenticated && (
            <div className="pt-2 border-t border-[#3a494b]">
              <button
                onClick={() => {
                  handleSignOut()
                  setMobileMenuOpen(false)
                }}
                className="w-full py-3 text-xs font-bold text-[#ff3366] bg-[#151a21] hover:bg-red-950/40 rounded-lg border border-[#3a494b] flex items-center justify-center gap-2 min-h-[44px] uppercase"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          )}

        </div>
      )}
    </nav>
  )
}
