import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import MainLayout from '../layouts/MainLayout'
import AdminLayout from '../layouts/AdminLayout'
import AuthLayout from '../layouts/AuthLayout'
import ProtectedRoute from './ProtectedRoute'
import AdminRoute from './AdminRoute'

// Core Pages (Eagerly Loaded)
import Home from '../pages/Home'
import TournamentsPage from '../pages/TournamentsPage'
import LoginPage from '../pages/LoginPage'
import RegisterPage from '../pages/RegisterPage'
import AccessDeniedPage from '../pages/AccessDeniedPage'

// Lazy-Loaded Feature Pages for Performance Code-Splitting
const TournamentDetailPage = lazy(() => import('../pages/TournamentDetailPage'))
const LeaderboardPage = lazy(() => import('../pages/LeaderboardPage'))
const AboutPage = lazy(() => import('../pages/AboutPage'))
const ResetPasswordPage = lazy(() => import('../pages/ResetPasswordPage'))
const DashboardPage = lazy(() => import('../pages/DashboardPage'))
const AdminDashboardPage = lazy(() => import('../pages/AdminDashboardPage'))
const AdminFinancePage = lazy(() => import('../pages/AdminFinancePage'))

function PageFallback() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-8 bg-[#07090c]">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="w-9 h-9 border-2 border-[#00f2ff] border-t-transparent rounded-full animate-spin"></div>
        <span className="font-label-caps text-xs text-[#8e9dae] uppercase tracking-widest">Loading MJ ESPORTS...</span>
      </div>
    </div>
  )
}

export default function AppRoutes() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        {/* Tier 1: Dedicated Standalone Auth Layout (Login, Register, Reset Password) */}
        <Route element={<AuthLayout />}>
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="reset-password" element={<ResetPasswordPage />} />
        </Route>

        {/* Tier 2: Public & Player Facing Layout (Public Navbar ONLY) */}
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Home />} />
          <Route path="tournaments" element={<TournamentsPage />} />
          <Route path="tournaments/:id" element={<TournamentDetailPage />} />
          <Route path="leaderboard" element={<LeaderboardPage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="403" element={<AccessDeniedPage />} />
          
          {/* Protected Player Routes */}
          <Route element={<ProtectedRoute redirectTo="/login" />}>
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="profile" element={<DashboardPage />} />
          </Route>
        </Route>

        {/* Tier 3: Enterprise Admin Control Center Layout (Admin Sidebar + Admin Header ONLY) */}
        <Route element={<AdminRoute />}>
          <Route element={<AdminLayout />}>
            <Route path="admin" element={<AdminDashboardPage />} />
            <Route path="admin/leaderboards" element={<AdminDashboardPage defaultTab="leaderboards" />} />
            <Route path="admin/leaderboard" element={<AdminDashboardPage defaultTab="leaderboards" />} />
            <Route path="admin/finance" element={<AdminFinancePage />} />
            <Route path="admin/:tab" element={<AdminDashboardPage />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  )
}
