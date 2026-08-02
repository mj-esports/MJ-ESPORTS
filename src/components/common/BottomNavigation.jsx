import { NavLink } from 'react-router-dom'
import { Home, Trophy, BarChart3, User, LogIn, Shield } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

export default function BottomNavigation() {
  const { isAuthenticated, isAdmin } = useAuth()

  const tabs = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Tourneys', path: '/tournaments', icon: Trophy },
    { name: 'Ranks', path: '/leaderboard', icon: BarChart3 },
    ...(isAdmin
      ? [{ name: 'Admin', path: '/admin', icon: Shield }]
      : []),
    isAuthenticated
      ? { name: 'Profile', path: '/profile', icon: User }
      : { name: 'Login', path: '/login', icon: LogIn },
  ]

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-[#07090c]/95 backdrop-blur-xl border-t border-[#3a494b]/60 shadow-[0_-8px_30px_rgba(0,0,0,0.9)] pb-[env(safe-area-inset-bottom,0px)] select-none"
      aria-label="Mobile Bottom Navigation"
    >
      <div className="flex items-center justify-around h-[60px] w-full max-w-lg mx-auto px-1">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <NavLink
              key={`bottom-nav-${tab.name}`}
              to={tab.path}
              end={tab.path === '/'}
              aria-label={tab.name}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center flex-1 min-w-0 h-full relative transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00f2ff] px-0.5 ${
                  isActive
                    ? 'text-[#00f2ff]'
                    : 'text-[#8e9dae] hover:text-[#e1e2e7]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {/* Top Active Bar Glow */}
                  {isActive && (
                    <span className="absolute top-0 w-8 h-[2.5px] bg-[#00f2ff] rounded-b-full shadow-[0_0_10px_rgba(0,242,255,0.9)]" />
                  )}
                  
                  {/* Icon Container */}
                  <div className={`p-1 rounded-full transition-all duration-200 flex items-center justify-center ${
                    isActive ? 'bg-[#00f2ff]/10' : ''
                  }`}>
                    <Icon
                      className={`w-5 h-5 transition-transform duration-200 ${
                        isActive ? 'scale-110 text-[#00f2ff]' : 'text-[#8e9dae]'
                      }`}
                    />
                  </div>

                  {/* Shortened Label */}
                  <span className={`text-[10px] sm:text-[11px] tracking-tight font-extrabold uppercase text-center truncate w-full block leading-none mt-0.5 ${
                    isActive ? 'text-[#00f2ff]' : 'text-[#8e9dae]'
                  }`}>
                    {tab.name}
                  </span>
                </>
              )}
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
