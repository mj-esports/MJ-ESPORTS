import { Outlet, useLocation } from 'react-router-dom'
import Navbar from '../components/common/Navbar'
import Footer from '../components/common/Footer'
import BottomNavigation from '../components/common/BottomNavigation'

export default function MainLayout() {
  const location = useLocation()
  const isProfilePage = location.pathname === '/profile'

  return (
    <div className="min-h-screen bg-[#0b0e11] text-[#e1e2e7] flex flex-col font-sans selection:bg-[#00f2ff] selection:text-slate-950 pb-16 md:pb-0 relative overflow-x-hidden w-full">
      {/* Public Navbar ONLY */}
      <Navbar />

      {/* Main Public Page Content */}
      <main id="main-content" tabIndex={-1} className="flex-1 w-full overflow-x-hidden outline-none">
        <Outlet />
      </main>

      {/* Public Footer (Hidden on Profile Page) */}
      {!isProfilePage && <Footer />}

      {/* Mobile Bottom Bar Navigation */}
      <BottomNavigation />
    </div>
  )
}
