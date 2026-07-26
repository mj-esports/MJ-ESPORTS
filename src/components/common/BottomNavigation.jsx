import { NavLink } from 'react-router-dom'
import { Home, Trophy, BarChart3, User, LogIn, Shield } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

export default function BottomNavigation() {
  const { isAuthenticated, isAdmin } = useAuth()

  const tabs = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Tournaments', path: '/tournaments', icon: Trophy },
    { name: 'Leaderboard', path: '/leaderboard', icon: BarChart3 },
    ...(isAdmin
      ? [{ name: 'Admin', path: '/admin', icon: Shield }]
      : []),
    isAuthenticated
      ? { name: 'Profile', path: '/profile', icon: User }
      : { name: 'Login', path: '/login', icon: LogIn },
  ]

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-[#07090c]/95 backdrop-blur-xl border-t border-[#3a494b]/60 shadow-[0_-8px_30px_rgba(0,0,0,0.9)] pb-[env(safe-area-inset-bottom,0px)]"
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
                    ? 'text-[#00f2ff] font-extrabold'
                    : 'text-[#8e9dae] font-medium hover:text-[#e1e2e7]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute top-0 w-8 h-1 bg-gradient-to-r from-[#00dbe7] via-[#00f2ff] to-[#fe6b00] rounded-b-full shadow-[0_0_12px_rgba(0,242,255,0.8)]" />
                  )}
                  <Icon
                    className={`w-5 h-5 transition-transform duration-200 ${
                      isActive ? 'scale-110 text-[#00f2ff]' : 'text-[#8e9dae]'
                    }`}
                  />
                  <span className="text-[10px] tracking-tight mt-1 font-semibold uppercase">{tab.name}</span>
                </>
              )}
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
