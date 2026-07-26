import React from 'react'
import { NavLink } from 'react-router-dom'
import { Home, Flame, Gamepad2, Trophy, HelpCircle, Settings, LogOut, User, Shield } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

export const StitchSidebar: React.FC = () => {
  const { user, isAuthenticated, isAdmin, signOut } = useAuth()
  const userDisplayName = user?.user_metadata?.username || user?.email?.split('@')[0] || 'Elite Player'

  const links = [
    { label: 'Home', path: '/', icon: Home },
    { label: 'Free Fire', path: '/tournaments?game=freefire', icon: Flame },
    { label: 'BGMI', path: '/tournaments?game=bgmi', icon: Gamepad2 },
    { label: 'Leaderboard', path: '/leaderboard', icon: Trophy },
    ...(isAdmin ? [{ label: 'Admin', path: '/admin', icon: Shield }] : []),
    { label: 'Support', path: '/about', icon: HelpCircle },
  ]

  return (
    <aside className="h-full w-64 fixed left-0 top-0 hidden lg:flex flex-col bg-[#151a21] py-6 px-3 gap-4 border-r border-[#3a494b]/60 mt-20 z-40">
      {/* Profile Header */}
      <div className="mb-2 px-2">
        <h3 className="font-label-caps text-[10px] text-[#8e9dae] mb-2">PLAYER STATUS</h3>
        <div className="flex items-center gap-3 bg-[#07090c] p-3 rounded-lg border border-[#3a494b]/60">
          <div className="w-9 h-9 rounded-full bg-[#fe6b00]/20 border border-[#fe6b00] flex items-center justify-center shrink-0">
            <User className="w-4 h-4 text-[#fe6b00]" />
          </div>
          <div className="overflow-hidden">
            <p className="font-bold text-xs text-[#00f2ff] truncate">{userDisplayName}</p>
            <p className="font-mono text-[10px] font-bold text-[#8e9dae]">Rank: Diamond IV</p>
          </div>
        </div>
      </div>

      {/* Main Nav */}
      <nav className="space-y-1">
        {links.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={`side-${item.label}`}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                  isActive
                    ? 'bg-[#00f2ff] text-[#00363a] border-l-4 border-[#00363a] font-extrabold shadow-[0_0_12px_rgba(0,242,255,0.4)]'
                    : 'text-[#b9cacb] hover:bg-[#1d232c] hover:text-[#00f2ff]'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </NavLink>
          )
        })}
      </nav>

      {/* Bottom Nav Actions */}
      <div className="mt-auto space-y-1 pt-4 border-t border-[#3a494b]/60">
        {isAuthenticated && (
          <NavLink
            to="/profile"
            className="flex items-center gap-3 px-3 py-2.5 text-xs font-bold text-[#b9cacb] hover:bg-[#1d232c] hover:text-white rounded-lg uppercase transition-colors"
          >
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </NavLink>
        )}
        {isAuthenticated && (
          <button
            onClick={() => signOut()}
            className="w-full text-left flex items-center gap-3 px-3 py-2.5 text-xs font-bold text-[#8e9dae] hover:bg-red-950/40 hover:text-[#ff3366] rounded-lg uppercase transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        )}
      </div>
    </aside>
  )
}
