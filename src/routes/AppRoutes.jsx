import { Routes, Route } from 'react-router-dom'
import MainLayout from '../layouts/MainLayout'
import ProtectedRoute from './ProtectedRoute'
import AdminRoute from './AdminRoute'
import Home from '../pages/Home'
import TournamentsPage from '../pages/TournamentsPage'
import TournamentDetailPage from '../pages/TournamentDetailPage'
import LiveCenterPage from '../pages/LiveCenterPage'
import LeaderboardPage from '../pages/LeaderboardPage'
import AboutPage from '../pages/AboutPage'
import LoginPage from '../pages/LoginPage'
import RegisterPage from '../pages/RegisterPage'
import ResetPasswordPage from '../pages/ResetPasswordPage'
import DashboardPage from '../pages/DashboardPage'
import AdminDashboardPage from '../pages/AdminDashboardPage'
import AccessDeniedPage from '../pages/AccessDeniedPage'

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Home />} />
        <Route path="tournaments" element={<TournamentsPage />} />
        <Route path="tournaments/:id" element={<TournamentDetailPage />} />
        <Route path="live" element={<LiveCenterPage />} />
        <Route path="leaderboard" element={<LeaderboardPage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="reset-password" element={<ResetPasswordPage />} />
        <Route path="403" element={<AccessDeniedPage />} />
        
        {/* Protected Player Routes */}
        <Route element={<ProtectedRoute redirectTo="/login" />}>
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="profile" element={<DashboardPage />} />
        </Route>

        {/* Enterprise Protected Admin Routes */}
        <Route element={<AdminRoute />}>
          <Route path="admin" element={<AdminDashboardPage />} />
        </Route>
      </Route>
    </Routes>
  )
}
