import { supabase, isSupabaseConfigured } from '../lib/supabase.js'

function getStorageItem(key) {
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem(key)
  }
  return null
}

function setStorageItem(key, value) {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(key, value)
  }
}

function removeStorageItem(key) {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(key)
  }
}

function createMockSession(email, metadata = {}) {
  const isOwnerAdmin = email === 'mjesports.team@gmail.com'
  const assignedRole = isOwnerAdmin ? 'admin' : metadata.role || 'user'

  const mockUser = {
    id: 'mock-user-' + Date.now(),
    email,
    user_metadata: {
      ...metadata,
      role: assignedRole,
    },
    created_at: new Date().toISOString(),
  }
  const mockSession = {
    access_token: 'mock-token-' + Date.now(),
    user: mockUser,
  }
  setStorageItem('mj_esports_mock_user', JSON.stringify(mockUser))
  setStorageItem('mj_esports_mock_session', JSON.stringify(mockSession))
  return { user: mockUser, session: mockSession, role: assignedRole }
}

/**
 * Fetch role for user strictly from Supabase user_roles table or user_metadata
 * @param {object} user
 */
export async function getUserRole(user) {
  if (!user) return null

  // Owner admin account fallback check
  if (user.email === 'mjesports.team@gmail.com') {
    return 'admin'
  }

  const userId = user.id

  // 1. Query Supabase user_roles table if configured
  if (isSupabaseConfigured && userId && !userId.startsWith('mock-')) {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle()

      if (!error && data?.role) {
        return data.role
      }
    } catch (err) {
      console.warn('[getUserRole Supabase Warning]:', err.message)
    }
  }

  // 2. Return role from authenticated user metadata or fallback 'user'
  return user.user_metadata?.role || 'user'
}

/**
 * Register a new user with Email and Password
 */
export async function signUp(email, password, metadata = {}) {
  if (!isSupabaseConfigured) {
    return createMockSession(email, metadata)
  }

  try {
    const role = email === 'mjesports.team@gmail.com' ? 'admin' : metadata.role || 'user'

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          ...metadata,
          role,
        },
      },
    })
    if (error) {
      if (error.message.includes('already registered')) {
        throw new Error('An account with this email address already exists.')
      }
      throw new Error(error.message)
    }

    // Insert into user_roles table if session created
    if (data.user) {
      try {
        await supabase.from('user_roles').upsert([
          {
            user_id: data.user.id,
            email: data.user.email,
            role,
          },
        ])
      } catch (roleErr) {
        console.warn('[Supabase user_roles Insert Warning]:', roleErr.message)
      }
    }

    return data
  } catch (err) {
    if (err.message === 'Failed to fetch' || err.name === 'AuthRetryableFetchError') {
      console.warn('[Supabase Fetch Alert]: Falling back to local preview session.')
      return createMockSession(email, metadata)
    }
    throw err
  }
}

/**
 * Sign in an existing user with Email and Password
 */
export async function signIn(email, password) {
  if (!isSupabaseConfigured) {
    const storedUser = getStorageItem('mj_esports_mock_user')
    const metadata = storedUser ? JSON.parse(storedUser).user_metadata : { username: email.split('@')[0] }
    return createMockSession(email, metadata)
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        throw new Error('Invalid email address or password.')
      } else if (error.message.includes('Email not confirmed')) {
        throw new Error('Please confirm your email address before signing in.')
      }
      throw new Error(error.message)
    }
    return data
  } catch (err) {
    if (err.message === 'Failed to fetch' || err.name === 'AuthRetryableFetchError') {
      console.warn('[Supabase Fetch Alert]: Falling back to local preview session.')
      const storedUser = getStorageItem('mj_esports_mock_user')
      const metadata = storedUser ? JSON.parse(storedUser).user_metadata : { username: email.split('@')[0] }
      return createMockSession(email, metadata)
    }
    throw err
  }
}

/**
 * Request Password Reset Email (Production Privacy Enforced)
 * Does NOT reveal whether the email exists in the database.
 */
export async function requestPasswordReset(email) {
  const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : undefined

  if (!isSupabaseConfigured) {
    return { success: true }
  }

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    })

    if (error) {
      console.warn('[Supabase Reset Request Warning]:', error.message)
    }

    // Always return success to enforce privacy and prevent email enumeration
    return { success: true }
  } catch (err) {
    console.warn('[Supabase Reset Fetch Error]:', err.message)
    return { success: true }
  }
}

/**
 * Update Password after clicking reset link
 */
export async function updateUserPassword(newPassword) {
  if (!newPassword || newPassword.length < 6) {
    throw new Error('Password must be at least 6 characters long.')
  }

  if (!isSupabaseConfigured) {
    return { success: true }
  }

  try {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (error) {
      if (error.message.includes('Password should be at least')) {
        throw new Error('Password must be at least 6 characters long.')
      } else if (error.message.includes('same as your current password')) {
        throw new Error('New password must be different from your current password.')
      } else if (error.message.includes('token') || error.message.includes('expired') || error.message.includes('session')) {
        throw new Error('Password reset link is invalid or has expired. Please request a new link.')
      }
      throw new Error(error.message || 'Failed to update password.')
    }

    return data
  } catch (err) {
    throw err
  }
}

/**
 * Sign out current user
 */
export async function signOut() {
  removeStorageItem('mj_esports_mock_session')
  removeStorageItem('mj_esports_mock_user')
  removeStorageItem('mj_esports_user_role')
  if (!isSupabaseConfigured) return

  try {
    const { error } = await supabase.auth.signOut()
    if (error) console.warn('[Supabase SignOut Warning]:', error.message)
  } catch (err) {
    console.warn('[Supabase SignOut Fetch Warning]:', err.message)
  }
}

/**
 * Get current user
 */
export async function getCurrentUser() {
  if (!isSupabaseConfigured) {
    const storedSession = getStorageItem('mj_esports_mock_session')
    if (storedSession) {
      try {
        const parsed = JSON.parse(storedSession)
        return parsed?.user ?? null
      } catch (e) {
        return null
      }
    }
    return null
  }
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) throw error
    return user
  } catch (err) {
    const storedSession = getStorageItem('mj_esports_mock_session')
    if (storedSession) {
      try {
        const parsed = JSON.parse(storedSession)
        return parsed?.user ?? null
      } catch (e) {
        return null
      }
    }
    return null
  }
}

export function onAuthStateChange(callback) {
  if (!isSupabaseConfigured) {
    return { unsubscribe: () => {} }
  }
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session)
  })
  return subscription
}
