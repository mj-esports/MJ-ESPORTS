import { AuthProvider } from './contexts/AuthContext'
import { TournamentProvider } from './contexts/TournamentContext'
import { ToastProvider } from './contexts/ToastContext'
import ErrorBoundary from './components/common/ErrorBoundary'
import AppRoutes from './routes/AppRoutes'
import InstagramBrowserPrompt from './components/common/InstagramBrowserPrompt'

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <TournamentProvider>
            <div className="w-full min-h-screen flex flex-col flex-grow">
              <AppRoutes />
              <InstagramBrowserPrompt />
            </div>
          </TournamentProvider>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  )
}

export default App
