import { AuthProvider } from './contexts/AuthContext'
import { TournamentProvider } from './contexts/TournamentContext'
import AppRoutes from './routes/AppRoutes'

function App() {
  return (
    <AuthProvider>
      <TournamentProvider>
        <AppRoutes />
      </TournamentProvider>
    </AuthProvider>
  )
}

export default App
