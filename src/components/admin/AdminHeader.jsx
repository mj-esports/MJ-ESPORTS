import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Swords, Bell, User, LogOut, Shield } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

export default function AdminHeader({ pageTitle = 'ADMIN CONTROL CENTER' }) {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const [showProfileMenu, setShowProfileMenu] = useState(false)

  const adminName = user?.user_metadata?.username || user?.email?.split('@')[0] || 'Admin'

  const handleLogout = async () => {
    try {
      await signOut()
      navigate('/login')
    } catch (err) {
      console.error('Logout error:', err)
    }
  }

  return (
    <header className="sticky top-0 z-50 bg-[#0f1318] border-b border-[#3a494b]/60 h-16 px-4 sm:px-6 flex items-center justify-between shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
      
      {/* Left: Logo & Page Title */}
      <div className="flex items-center gap-4">
        <Link to="/admin" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-[#00f2ff] p-[1px] shadow-[0_0_12px_rgba(0,242,255,0.4)] group-hover:scale-105 transition-transform">
            <div className="w-full h-full bg-[#07090c] rounded-[7px] flex items-center justify-center">
              <Swords className="w-4 h-4 text-[#00f2ff]" />
            </div>
          </div>
          <div className="hidden sm:block">
            <span className="font-display-lg text-base font-extrabold tracking-wider text-white">
              MJ <span className="text-[#00f2ff]">ESPORTS</span>
            </span>
            <span className="block text-[9px] uppercase font-bold tracking-widest text-[#fe6b00] -mt-1">
              ADMIN CONTROL
            </span>
          </div>
        </Link>

        <div className="h-5 w-[1px] bg-[#3a494b]/60 hidden sm:block"></div>

        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-[#00f2ff] hidden xs:block" />
          <h1 className="font-display-lg text-xs sm:text-sm font-extrabold text-[#00f2ff] uppercase tracking-wider">
            {pageTitle}
          </h1>
        </div>
      </div>

      {/* Right: Notifications, Profile & Logout */}
      <div className="flex items-center gap-3">
        {/* Notifications Icon with Badge */}
        <button
          className="relative p-2 rounded-lg bg-[#151a21] border border-[#3a494b]/60 text-[#8e9dae] hover:text-[#00f2ff] transition-colors"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#fe6b00] animate-pulse"></span>
        </button>

        {/* Admin Profile Pill / Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#151a21] border border-[#3a494b]/60 hover:border-[#00f2ff] text-xs font-bold transition-colors"
          >
            <User className="w-3.5 h-3.5 text-[#00f2ff]" />
            <span className="text-[#e1e2e7] truncate max-w-[100px] sm:max-w-[140px]">{adminName}</span>
            <span className="px-1.5 py-0.5 text-[9px] font-extrabold bg-[#fe6b00] text-slate-950 rounded uppercase shadow-sm">
              ADMIN
            </span>
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-[#151a21] border border-[#3a494b] rounded-lg shadow-2xl py-2 z-50 animate-fadeIn text-xs space-y-1">
              <div className="px-3 py-2 border-b border-[#3a494b]/60">
                <p className="font-bold text-white truncate">{adminName}</p>
                <p className="text-[10px] text-[#8e9dae] uppercase font-mono">System Administrator</p>
              </div>
              <Link
                to="/"
                onClick={() => setShowProfileMenu(false)}
                className="flex items-center gap-2 px-3 py-2 text-[#b9cacb] hover:bg-[#1d232c] hover:text-[#00f2ff]"
              >
                <span>View Public Site</span>
              </Link>
              <button
                onClick={() => {
                  setShowProfileMenu(false)
                  handleLogout()
                }}
                className="w-full text-left flex items-center gap-2 px-3 py-2 text-[#ff3366] hover:bg-red-950/40"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>

        {/* Direct Logout Button */}
        <button
          onClick={handleLogout}
          className="p-2 rounded-lg bg-[#151a21] border border-[#3a494b]/60 text-[#8e9dae] hover:text-[#ff3366] hover:border-[#ff3366]/40 transition-colors hidden sm:flex items-center justify-center"
          title="Logout"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

    </header>
  )
}
