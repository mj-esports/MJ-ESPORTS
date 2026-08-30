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
const ProfilePage = lazy(() => import('../pages/ProfilePage'))
const EditProfilePage = lazy(() => import('../pages/EditProfilePage'))
const StatisticsPage = lazy(() => import('../pages/StatisticsPage'))
const TournamentHistoryPage = lazy(() => import('../pages/TournamentHistoryPage'))
const AchievementsPage = lazy(() => import('../pages/AchievementsPage'))
const WalletPage = lazy(() => import('../pages/WalletPage'))
const SettingsPage = lazy(() => import('../pages/SettingsPage'))
const AdminDashboardPage = lazy(() => import('../pages/AdminDashboardPage'))
const AdminFinancePage = lazy(() => import('../pages/AdminFinancePage'))
const NotFoundPage = lazy(() => import('../pages/NotFoundPage'))
const ServerErrorPage = lazy(() => import('../pages/ServerErrorPage'))

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
          <Route path="privacy" element={<AboutPage defaultTab="privacy" />} />
          <Route path="terms" element={<AboutPage defaultTab="terms" />} />
          <Route path="403" element={<AccessDeniedPage />} />
          <Route path="500" element={<ServerErrorPage />} />
          
          {/* Protected Player Routes */}
          <Route element={<ProtectedRoute redirectTo="/login" />}>
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="profile/edit" element={<EditProfilePage />} />
            <Route path="profile/statistics" element={<StatisticsPage />} />
            <Route path="profile/history" element={<TournamentHistoryPage />} />
            <Route path="profile/achievements" element={<AchievementsPage />} />
            <Route path="wallet" element={<WalletPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          {/* 404 Wildcard Fallback Route */}
          <Route path="*" element={<NotFoundPage />} />
        </Route>

        {/* Tier 3: Enterprise Admin Control Center Layout (Admin Sidebar + Admin Header ONLY) */}
        <Route element={<AdminRoute />}>
          <Route element={<AdminLayout />}>
            <Route path="admin" element={<AdminDashboardPage />} />
            <Route path="admin/results" element={<AdminDashboardPage defaultTab="results" />} />
            <Route path="admin/match-control" element={<AdminDashboardPage defaultTab="matches" />} />
            <Route path="admin/leaderboards" element={<AdminDashboardPage defaultTab="results" />} />
            <Route path="admin/leaderboard" element={<AdminDashboardPage defaultTab="results" />} />
            <Route path="admin/finance" element={<AdminFinancePage />} />
            <Route path="admin/:tab" element={<AdminDashboardPage />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  )
}
