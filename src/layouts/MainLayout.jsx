import { Outlet, useLocation } from 'react-router-dom'
import Navbar from '../components/common/Navbar'
import Footer from '../components/common/Footer'
import BottomNavigation from '../components/common/BottomNavigation'

export default function MainLayout() {
  const location = useLocation()
  const isProfilePage = location.pathname === '/profile'

  return (
    <div className="min-h-screen min-h-dvh bg-[#000000] text-[#FFFFFF] flex flex-col font-body selection:bg-[#FFB900] selection:text-[#000000] relative overflow-x-hidden w-full">
      {/* Public Navbar ONLY */}
      <Navbar />

      {/* Main Public Page Content */}
      <main id="main-content" tabIndex={-1} className={`flex-1 w-full overflow-x-hidden outline-none ${isProfilePage ? 'pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0' : ''}`}>
        <Outlet />
      </main>

      {/* Public Footer (Hidden on Profile Page) */}
      {!isProfilePage && <Footer />}

      {/* Mobile Bottom Bar Navigation */}
      <BottomNavigation />
    </div>
  )
}
