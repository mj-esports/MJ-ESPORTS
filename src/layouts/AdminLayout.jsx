import { Outlet } from 'react-router-dom'
import AdminHeader from '../components/admin/AdminHeader'

export default function AdminLayout() {
  return (
    <div className="min-h-screen bg-[#07090c] text-[#e1e2e7] flex flex-col font-sans selection:bg-[#00f2ff] selection:text-slate-950">
      {/* Compact Admin Header (Logo, Page Title, Notifications, Profile Menu & Logout) */}
      <AdminHeader pageTitle="ADMIN HOST CONTROL CENTER" />

      {/* Main Admin Area */}
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}
