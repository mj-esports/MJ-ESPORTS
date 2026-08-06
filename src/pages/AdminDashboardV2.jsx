import React, { useState } from 'react'
import Sidebar from '../components/admin-v2/Sidebar'
import TopHeader from '../components/admin-v2/TopHeader'
import DashboardHome from '../components/admin-v2/DashboardHome'
import TournamentMenu from '../components/admin-v2/TournamentMenu'
import UsersMenu from '../components/admin-v2/UsersMenu'
import WalletMenu from '../components/admin-v2/WalletMenu'
import SettingsMenu from '../components/admin-v2/SettingsMenu'

export default function AdminDashboardV2() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardHome />
      case 'tournaments':
        return <TournamentMenu />
      case 'users':
        return <UsersMenu />
      case 'wallet':
        return <WalletMenu />
      case 'settings':
        return <SettingsMenu />
      default:
        return <DashboardHome />
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
      />

      {/* Main Container */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        {/* Top Header */}
        <TopHeader activeTab={activeTab} setIsOpen={setSidebarOpen} />

        {/* Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {renderActiveView()}
        </main>
      </div>
    </div>
  )
}
