import { useState, useEffect, useRef } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { TournamentProvider } from './contexts/TournamentContext'
import { ToastProvider } from './contexts/ToastContext'
import ErrorBoundary from './components/common/ErrorBoundary'
import Loader from './components/common/Loader'
import AppRoutes from './routes/AppRoutes'

function AppContent() {
  const { loading: authLoading } = useAuth()
  const [initialLoading, setInitialLoading] = useState(true)
  const [isFadingOut, setIsFadingOut] = useState(false)
  const isReady = !authLoading

  const handleLoaderComplete = () => {
    setIsFadingOut(true)
    setTimeout(() => {
      setInitialLoading(false)
    }, 450)
  }

  return (
    <>
      {initialLoading && (
        <div
          className={`fixed inset-0 z-[99999] flex items-center justify-center bg-[#03060a] transition-opacity duration-450 ease-out ${
            isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
          aria-live="polite"
          aria-busy={!isFadingOut}
        >
          <Loader isReady={isReady} onComplete={handleLoaderComplete} />
        </div>
      )}
      <div
        className={`w-full min-h-screen flex flex-col flex-grow transition-opacity duration-450 ease-in ${
          initialLoading && !isFadingOut ? 'opacity-0 invisible' : 'opacity-100 visible'
        }`}
      >
        <AppRoutes />
      </div>
    </>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <TournamentProvider>
            <AppContent />
          </TournamentProvider>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  )
}

export default App
