import { Suspense, lazy as reactLazy } from 'react'
import { Routes, Route } from 'react-router-dom'
import MainLayout from '../layouts/MainLayout'
import AdminLayout from '../layouts/AdminLayout'
import AuthLayout from '../layouts/AuthLayout'
import ProtectedRoute from './ProtectedRoute'
import AdminRoute from './AdminRoute'

// Core Public Entrypoint (Eagerly Loaded for Immediate First Paint)
import Home from '../pages/Home'

/**
 * Resilient dynamic import wrapper for production SPA deployment stability.
 * When a new release invalidates older chunk hashes, this intercepts chunk 404s,
 * triggers a single clean reload to fetch the new asset manifest, and avoids infinite reload loops.
 */
function lazy(componentImport) {
  return reactLazy(async () => {
    const hasForceRefreshed =
      typeof window !== 'undefined' &&
      window.sessionStorage.getItem('mj_chunk_force_reload') === 'true'

    try {
      const component = await componentImport()
      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem('mj_chunk_force_reload')
      }
      return component
    } catch (error) {
      const errorMsg = (error?.message || String(error)).toLowerCase()
      const isChunkLoadFailed =
        errorMsg.includes('failed to fetch dynamically imported module') ||
        errorMsg.includes('loading chunk') ||
        errorMsg.includes('error loading dynamically imported module') ||
        errorMsg.includes('importing a module script failed')

      if (isChunkLoadFailed && !hasForceRefreshed && typeof window !== 'undefined') {
        console.warn('[AppRoutes] New deployment detected (chunk hash mismatch). Auto-reloading client...')
        window.sessionStorage.setItem('mj_chunk_force_reload', 'true')
        window.location.reload()
        return new Promise(() => {}) // Block render while browser reloads
      }

      throw error
    }
  })
}

// Lazy-Loaded Feature Pages with Post-Deployment Chunk Resiliency
const TournamentsPage = lazy(() => import('../pages/TournamentsPage'))
const TournamentDetailPage = lazy(() => import('../pages/TournamentDetailPage'))
const LoginPage = lazy(() => import('../pages/LoginPage'))
const RegisterPage = lazy(() => import('../pages/RegisterPage'))
const AccessDeniedPage = lazy(() => import('../pages/AccessDeniedPage'))
const LeaderboardPage = lazy(() => import('../pages/LeaderboardPage'))
const AboutPage = lazy(() => import('../pages/AboutPage'))
const ResetPasswordPage = lazy(() => import('../pages/ResetPasswordPage'))
const DashboardPage = lazy(() => import('../pages/DashboardPage'))
const ProfilePage = lazy(() => import('../pages/ProfilePage'))
const PlayerTeamPortalPage = lazy(() => import('../pages/PlayerTeamPortalPage'))
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

import PageFallback from '../components/common/PageFallback'

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
            <Route path="profile/team" element={<PlayerTeamPortalPage />} />
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
