import { Outlet } from 'react-router-dom'

export default function AdminLayout() {
  return (
    <div className="min-h-screen bg-[#07090c] text-[#e1e2e7] flex flex-col font-sans selection:bg-[#00f2ff] selection:text-slate-950 overflow-x-hidden w-full">
      <Outlet />
    </div>
  )
}
