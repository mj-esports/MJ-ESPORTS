/**
 * Production Readiness Phase 9.4 - Error Handler Utility
 * Never exposes raw internal errors, stack traces, or raw PostgreSQL constraint strings.
 * Maps all error types into clean, user-friendly messages with retry guidance.
 */

export function sanitizeError(error) {
  // Check browser online status
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return {
      title: 'Connection Lost',
      message: 'You appear to be offline. Please check your network connection and try again.',
      isNetworkError: true,
      isTimeout: false,
      isOffline: true,
      canRetry: true,
    }
  }

  if (!error) {
    return {
      title: 'Unexpected Error',
      message: 'An unexpected issue occurred. Please try again.',
      isNetworkError: false,
      isTimeout: false,
      isOffline: false,
      canRetry: true,
    }
  }

  const rawMsg = (typeof error === 'string' ? error : error.message || error.details || error.error_description || '').toString()
  const errorName = (error.name || '').toString()

  // 1. Timeout Errors
  if (errorName === 'AbortError' || rawMsg.toLowerCase().includes('timeout') || rawMsg.toLowerCase().includes('timed out')) {
    return {
      title: 'Request Timed Out',
      message: 'The server took too long to respond. Please verify your connection and try again.',
      isNetworkError: false,
      isTimeout: true,
      isOffline: false,
      canRetry: true,
    }
  }

  // 2. Network Errors
  if (
    rawMsg.toLowerCase().includes('failed to fetch') ||
    rawMsg.toLowerCase().includes('networkerror') ||
    rawMsg.toLowerCase().includes('net::err') ||
    rawMsg.toLowerCase().includes('connection refused')
  ) {
    return {
      title: 'Network Error',
      message: 'Unable to reach the server. Please check your internet connection and retry.',
      isNetworkError: true,
      isTimeout: false,
      isOffline: false,
      canRetry: true,
    }
  }

  // 3. Supabase / Database Duplicate Constraints
  if (rawMsg.includes('duplicate key') || rawMsg.includes('already exists') || rawMsg.includes('23505')) {
    return {
      title: 'Duplicate Entry',
      message: 'This registration or account already exists. Please verify your information.',
      isNetworkError: false,
      isTimeout: false,
      isOffline: false,
      canRetry: false,
    }
  }

  // 4. Supabase Status Check Constraint
  if (rawMsg.includes('violates check constraint') || rawMsg.includes('23514')) {
    return {
      title: 'Validation Error',
      message: 'The submitted data format is invalid. Please check your entries and retry.',
      isNetworkError: false,
      isTimeout: false,
      isOffline: false,
      canRetry: true,
    }
  }

  // 5. Auth / Session Errors
  if (rawMsg.toLowerCase().includes('jwt') || rawMsg.toLowerCase().includes('unauthorized') || rawMsg.toLowerCase().includes('invalid login credentials')) {
    return {
      title: 'Authentication Error',
      message: 'Invalid email or password. Please double check your credentials and try again.',
      isNetworkError: false,
      isTimeout: false,
      isOffline: false,
      canRetry: false,
    }
  }

  // 6. Default Fallback - Always preserve actual error message for DB/RLS/Validation errors
  return {
    title: 'Database / Request Error',
    message: rawMsg || 'An unexpected error occurred while processing your request. Please try again.',
    isNetworkError: false,
    isTimeout: false,
    isOffline: false,
    canRetry: true,
  }
}
