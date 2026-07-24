import { NavLink } from 'react-router-dom'
import { Home, Trophy, Radio, BarChart3, User, LogIn } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

export default function BottomNavigation() {
  const { isAuthenticated } = useAuth()

  const tabs = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Tournaments', path: '/tournaments', icon: Trophy },
    { name: 'Live Center', path: '/live', icon: Radio },
    { name: 'Leaderboard', path: '/leaderboard', icon: BarChart3 },
    isAuthenticated
      ? { name: 'Profile', path: '/profile', icon: User }
      : { name: 'Login', path: '/login', icon: LogIn },
  ]

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-[#090d16]/95 backdrop-blur-xl border-t border-cyan-500/20 shadow-[0_-8px_30px_rgba(0,0,0,0.8)] pb-[env(safe-area-inset-bottom,0px)]"
      aria-label="Mobile Bottom Navigation"
    >
      <div className="flex items-center justify-around h-16 max-w-md mx-auto px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <NavLink
              key={`bottom-nav-${tab.name}`}
              to={tab.path}
              end={tab.path === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center py-1 flex-1 min-h-[44px] relative transition-all duration-200 ${
                  isActive
                    ? 'text-cyan-400 font-extrabold'
                    : 'text-slate-400 font-medium hover:text-slate-200'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute top-0 w-8 h-1 bg-gradient-to-r from-cyan-400 via-amber-400 to-orange-500 rounded-b-full shadow-[0_0_12px_rgba(0,240,255,0.8)]" />
                  )}
                  <Icon
                    className={`w-5 h-5 transition-transform duration-200 ${
                      isActive ? 'scale-110 text-cyan-400' : 'text-slate-400'
                    }`}
                  />
                  <span className="text-[10px] tracking-tight mt-1 font-semibold">{tab.name}</span>
                </>
              )}
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
