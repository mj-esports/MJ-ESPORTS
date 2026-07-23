import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Swords, Menu, X, User, LogOut, Shield, Info, Mail, ShieldCheck, FileText, Settings } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const location = useLocation()
  const { user, isAuthenticated, isAdmin, signOut } = useAuth()

  // Desktop primary navigation links
  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Tournaments', path: '/tournaments' },
    { name: 'Live Center', path: '/live' },
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
    <nav className="sticky top-0 z-50 bg-slate-950 border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-purple-600 p-[1px] shadow-lg shadow-purple-950">
              <div className="w-full h-full bg-slate-950 rounded-[11px] flex items-center justify-center">
                <Swords className="w-5 h-5 text-purple-400" />
              </div>
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-wider text-white">
                MJ ESPORTS
              </span>
              <span className="block text-[10px] uppercase font-bold tracking-widest text-purple-400/80 -mt-1">
                Pro Arena
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-1 bg-slate-900/60 p-1.5 rounded-full border border-slate-800/60">
            {navLinks.map((link) => (
              <Link
                key={`nav-desktop-${link.name}`}
                to={link.path}
                className={`px-4 py-2 text-xs font-semibold rounded-full transition-colors ${
                  isActive(link.path)
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
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
                <Link
                  to="/profile"
                  className="px-3.5 py-1.5 rounded-xl bg-purple-950/60 border border-purple-800/50 hover:bg-purple-900/60 flex items-center gap-2 transition-colors"
                >
                  <User className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-xs font-bold text-slate-200">{userDisplayName}</span>
                  {isAdmin && (
                    <span className="px-2 py-0.5 text-[9px] font-extrabold bg-purple-900 text-purple-300 rounded uppercase">
                      ADMIN
                    </span>
                  )}
                </Link>
                <button
                  onClick={handleSignOut}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-400 hover:text-red-400 hover:border-red-500/40 transition-colors flex items-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="px-5 py-2 text-xs font-bold text-slate-950 bg-gradient-to-r from-purple-400 via-indigo-300 to-cyan-300 rounded-lg hover:brightness-110 shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 transition-all"
                >
                  Register
                </Link>
              </>
            )}
          </div>

          {/* Mobile Side Drawer Hamburger Button */}
          <div className="md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white focus:outline-none min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Toggle Side Drawer Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6 text-purple-400" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Side Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-950 border-b border-slate-800 px-4 pt-3 pb-6 space-y-4 shadow-2xl">
          
          {/* User Status Card inside Drawer */}
          {isAuthenticated ? (
            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-950 border border-purple-800 flex items-center justify-center">
                  <User className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">{userDisplayName}</span>
                  <span className="text-[10px] text-slate-400">{user?.email}</span>
                </div>
              </div>
              <span className="text-[10px] font-extrabold uppercase text-purple-300 bg-purple-950 border border-purple-800/50 px-2 py-0.5 rounded">
                {isAdmin ? 'ADMIN' : 'PLAYER'}
              </span>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3">
              <span className="text-xs font-bold text-slate-300">Join MJ ESPORTS</span>
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-950 rounded-lg border border-slate-800"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-bold text-slate-950 bg-gradient-to-r from-purple-400 to-cyan-300 rounded-lg shadow-sm"
                >
                  Register
                </Link>
              </div>
            </div>
          )}

          {/* Secondary Options Drawer List */}
          <div className="flex flex-col space-y-1 text-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-3 pt-1">
              Secondary Options
            </span>

            {/* Host Admin (ONLY rendered for admin users) */}
            {isAdmin && (
              <Link
                to="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-3 font-bold text-amber-300 bg-amber-950/40 rounded-xl border border-amber-800/50 flex items-center justify-between min-h-[44px]"
              >
                <div className="flex items-center gap-2.5">
                  <Shield className="w-4 h-4 text-amber-400" />
                  <span>Host Admin Operations</span>
                </div>
                <span className="text-[9px] font-extrabold bg-amber-400 text-slate-950 px-2 py-0.5 rounded uppercase">
                  ADMIN ONLY
                </span>
              </Link>
            )}

            <Link
              to="/about"
              onClick={() => setMobileMenuOpen(false)}
              className="px-4 py-3 font-semibold text-slate-300 hover:bg-slate-900 rounded-xl flex items-center gap-2.5 min-h-[44px]"
            >
              <Info className="w-4 h-4 text-purple-400" />
              <span>About Platform</span>
            </Link>

            <a
              href="mailto:support.mjesports@gmail.com"
              onClick={() => setMobileMenuOpen(false)}
              className="px-4 py-3 font-semibold text-slate-300 hover:bg-slate-900 rounded-xl flex items-center gap-2.5 min-h-[44px]"
            >
              <Mail className="w-4 h-4 text-cyan-400" />
              <span>Support & Contact</span>
            </a>

            <Link
              to="/tournaments"
              onClick={() => setMobileMenuOpen(false)}
              className="px-4 py-3 font-semibold text-slate-300 hover:bg-slate-900 rounded-xl flex items-center gap-2.5 min-h-[44px]"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Rules & Guidelines</span>
            </Link>

            <a
              href="mailto:support.mjesports@gmail.com?subject=Privacy%20Inquiry"
              onClick={() => setMobileMenuOpen(false)}
              className="px-4 py-3 font-semibold text-slate-300 hover:bg-slate-900 rounded-xl flex items-center gap-2.5 min-h-[44px]"
            >
              <FileText className="w-4 h-4 text-slate-400" />
              <span>Privacy Policy</span>
            </a>

            <a
              href="mailto:support.mjesports@gmail.com?subject=Terms%20Inquiry"
              onClick={() => setMobileMenuOpen(false)}
              className="px-4 py-3 font-semibold text-slate-300 hover:bg-slate-900 rounded-xl flex items-center gap-2.5 min-h-[44px]"
            >
              <FileText className="w-4 h-4 text-slate-400" />
              <span>Terms of Service</span>
            </a>

            {isAuthenticated && (
              <Link
                to="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-3 font-semibold text-slate-300 hover:bg-slate-900 rounded-xl flex items-center gap-2.5 min-h-[44px]"
              >
                <Settings className="w-4 h-4 text-slate-400" />
                <span>Account Settings</span>
              </Link>
            )}
          </div>

          {/* Logout Action inside Drawer */}
          {isAuthenticated && (
            <div className="pt-2 border-t border-slate-800">
              <button
                onClick={() => {
                  handleSignOut()
                  setMobileMenuOpen(false)
                }}
                className="w-full py-3 text-xs font-bold text-red-400 bg-slate-900 hover:bg-red-950/40 rounded-xl border border-slate-800 hover:border-red-800 flex items-center justify-center gap-2 min-h-[44px]"
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
