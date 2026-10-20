import { NavLink } from 'react-router-dom'
import { Home, Trophy, BarChart3, User, LogIn, Shield } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

export default function BottomNavigation() {
  const { isAuthenticated, isAdmin } = useAuth()

  const tabs = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Tournaments', path: '/tournaments', icon: Trophy },
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
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-[#000000]/95 backdrop-blur-lg border-t border-[#1B1B1F] shadow-[0_-8px_30px_rgba(0,0,0,0.8)] pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1 select-none"
      aria-label="Mobile Bottom Navigation"
    >
      <div className="flex items-center justify-around h-[64px] w-full max-w-lg mx-auto px-1">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <NavLink
              key={`bottom-nav-${tab.name}`}
              to={tab.path}
              end={tab.path === '/'}
              aria-label={tab.name}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center flex-1 min-w-0 h-full relative transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB900] px-0.5 min-h-[44px] ${
                  isActive
                    ? 'text-[#FFB900]'
                    : 'text-[#A3A3A3] hover:text-[#FFFFFF]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {/* Top Active Bar Amber Indicator */}
                  {isActive && (
                    <span className="absolute top-0 w-8 h-[3px] bg-[#FFB900] rounded-none shadow-[0_0_12px_rgba(255,185,0,0.9)]" />
                  )}
                  
                  {/* Icon Container */}
                  <div className={`p-1 rounded-none transition-all duration-200 flex items-center justify-center ${
                    isActive ? 'bg-[#FFB900]/10' : ''
                  }`}>
                    <Icon
                      className={`w-4.5 h-4.5 transition-transform duration-200 ${
                        isActive ? 'scale-110 text-[#FFB900]' : 'text-[#A3A3A3]'
                      }`}
                    />
                  </div>

                  {/* Label */}
                  <span className={`text-[9px] tracking-tight font-headline font-bold uppercase text-center truncate w-full block leading-none mt-0.5 ${
                    isActive ? 'text-[#FFB900]' : 'text-[#A3A3A3]'
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
