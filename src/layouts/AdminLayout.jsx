import { Outlet } from 'react-router-dom'

export default function AdminLayout() {
  return (
    <div className="min-h-screen bg-[#000000] text-[#FFFFFF] flex flex-col font-sans selection:bg-[#FFB900] selection:text-[#000000] overflow-x-hidden w-full">
      <Outlet />
    </div>
  )
}
