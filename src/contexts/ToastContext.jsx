import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import Toast from '../components/common/Toast'
import { sanitizeError } from '../utils/errorHandler'

const ToastContext = createContext(undefined)

export function ToastProvider({ children }) {
  const [activeToast, setActiveToast] = useState(null)
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true)

  const activeToastRef = useRef(null)
  useEffect(() => {
    activeToastRef.current = activeToast
  }, [activeToast])

  const removeToast = useCallback((id) => {
    setActiveToast((prev) => (prev && prev.id === id ? null : prev))
  }, [])

  const addToast = useCallback((toast) => {
    // Prevent duplicate toasts from repeated clicks
    if (activeToastRef.current && activeToastRef.current.message === toast.message) {
      return activeToastRef.current.id
    }

    const id = 'toast-' + Math.random().toString(36).substr(2, 9)
    const newToast = { ...toast, id }

    if (activeToastRef.current) {
      // Dismiss the previous toast first
      setActiveToast(null)
      // Show the new toast after a minor delay
      setTimeout(() => {
        setActiveToast(newToast)
      }, 150)
    } else {
      setActiveToast(newToast)
    }

    return id
  }, [])

  const showSuccess = useCallback((message, title = 'Success') => {
    // Standardize all success messages
    let standardizedMessage = message
    const lower = message.toLowerCase()

    if (lower.includes('profile changes saved') || lower.includes('profile updated') || lower.includes('profile information saved') || lower.includes('avatar saved') || lower.includes('avatar updated') || lower.includes('profile picture updated')) {
      standardizedMessage = 'Profile Updated Successfully'
    } else if (lower.includes('copied') || lower.includes('uid')) {
      standardizedMessage = 'UID Copied'
    } else if (lower.includes('settings saved') || lower.includes('settings updated')) {
      standardizedMessage = 'Settings Saved'
    } else if (lower.includes('password changed') || lower.includes('security updated')) {
      standardizedMessage = 'Password Changed'
    } else if (lower.includes('registered') || lower.includes('registration confirmed') || lower.includes('slot reserved')) {
      standardizedMessage = 'Tournament Registered'
    } else if (lower.includes('payment submitted') || lower.includes('withdrawal request') || lower.includes('payment verification')) {
      standardizedMessage = 'Payment Submitted'
    } else if (lower.includes('wallet updated') || lower.includes('added to wallet')) {
      standardizedMessage = 'Wallet Updated'
    }

    return addToast({
      type: 'success',
      title,
      message: standardizedMessage,
      autoCloseMs: 2500, // Success duration: 2-3 seconds
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
      autoCloseMs: 5000, // Error duration: 5 seconds
    })
  }, [addToast])

  const showWarning = useCallback((message, title = 'Attention') => {
    return addToast({
      type: 'warning',
      title,
      message,
      autoCloseMs: 4000,
    })
  }, [addToast])

  const showInfo = useCallback((message, title = 'Notice') => {
    return addToast({
      type: 'info',
      title,
      message,
      autoCloseMs: 3000,
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
        autoCloseMs: 0,
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
        toasts: activeToast ? [activeToast] : [],
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
      
      {/* Self-contained CSS animations style injection */}
      <style>{`
        @keyframes toast-in-desktop {
          from {
            transform: translateY(-24px) scale(0.95);
            opacity: 0;
          }
          to {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }
        @keyframes toast-in-mobile {
          from {
            transform: translateY(24px) scale(0.95);
            opacity: 0;
          }
          to {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }
        .animate-toast-desktop {
          animation: toast-in-desktop 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-toast-mobile {
          animation: toast-in-mobile 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
      
      {/* Toast Floating Container (Desktop: top-right, Mobile: bottom-center) */}
      <div className="fixed z-50 max-w-sm w-[calc(100%-2rem)] sm:w-full pointer-events-none transition-all duration-300 bottom-6 left-1/2 -translate-x-1/2 sm:bottom-auto sm:left-auto sm:translate-x-0 sm:top-6 sm:right-6">
        {activeToast && (
          <div className="pointer-events-auto">
            <Toast
              {...activeToast}
              onClose={() => removeToast(activeToast.id)}
            />
          </div>
        )}
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
