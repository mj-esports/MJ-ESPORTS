import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import Toast from '../components/common/Toast'
import { sanitizeError } from '../utils/errorHandler'

const ToastContext = createContext(undefined)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true)

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback((toast) => {
    const id = 'toast-' + Math.random().toString(36).substr(2, 9)
    const newToast = { ...toast, id }
    setToasts((prev) => [...prev.slice(-4), newToast]) // Keep max 5 toasts visible
    return id
  }, [])

  const showSuccess = useCallback((message, title = 'Success') => {
    return addToast({
      type: 'success',
      title,
      message,
      autoCloseMs: 4000,
    })
  }, [addToast])

  const showError = useCallback((error, title, onRetry) => {
    const sanitized = sanitizeError(error)
    return addToast({
      type: sanitized.isOffline ? 'offline' : sanitized.isNetworkError ? 'network' : 'error',
      title: title || sanitized.title,
      message: sanitized.message,
      onRetry: onRetry || (sanitized.canRetry ? () => window.location.reload() : undefined),
      retryText: 'Retry Request',
      autoCloseMs: 6000,
    })
  }, [addToast])

  const showWarning = useCallback((message, title = 'Attention') => {
    return addToast({
      type: 'warning',
      title,
      message,
      autoCloseMs: 5000,
    })
  }, [addToast])

  const showInfo = useCallback((message, title = 'Notice') => {
    return addToast({
      type: 'info',
      title,
      message,
      autoCloseMs: 4000,
    })
  }, [addToast])

  // Listen to network status changes
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      showSuccess('Connection restored. You are back online!', 'Network Reconnected')
    }

    const handleOffline = () => {
      setIsOnline(false)
      addToast({
        type: 'offline',
        title: 'Network Disconnected',
        message: 'You are operating in offline mode. Live tournament updates will pause until reconnected.',
        autoCloseMs: 0, // Keep until dismissed or online
      })
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [showSuccess, addToast])

  return (
    <ToastContext.Provider
      value={{
        toasts,
        addToast,
        removeToast,
        showSuccess,
        showError,
        showWarning,
        showInfo,
        isOnline,
      }}
    >
      {children}
      
      {/* Toast Floating Container (Fixed Bottom Right) */}
      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex flex-col gap-3 max-w-sm w-[calc(100%-2rem)] sm:w-full pointer-events-none">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <Toast
              {...toast}
              onClose={() => toast.id && removeToast(toast.id)}
            />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
