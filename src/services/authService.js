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
  const isOwnerAdmin = email && email.toLowerCase().trim() === 'mjesports.team@gmail.com'
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
  if (user.email && user.email.toLowerCase().trim() === 'mjesports.team@gmail.com') {
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
 * Register a new user with Email and Password without requiring email confirmation
 */
export async function signUp(email, password, metadata = {}) {
  if (!isSupabaseConfigured) {
    return createMockSession(email, metadata)
  }

  try {
    const role = email && email.toLowerCase().trim() === 'mjesports.team@gmail.com' ? 'admin' : metadata.role || 'user'

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

    // If session was generated directly, return data
    if (data?.session) {
      return data
    }

    // If email confirmation is enabled on Supabase, automatically generate active session for immediate sign-in
    return createMockSession(email, { ...metadata, role })
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
 * Immediately signs in without blocking for email confirmation
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
        // Auto sign in user immediately bypassing email confirmation restriction
        console.warn('[Supabase Auth Alert]: Email confirmation requirement bypassed. Instant sign in allowed.')
        const storedUser = getStorageItem('mj_esports_mock_user')
        const metadata = storedUser ? JSON.parse(storedUser).user_metadata : { username: email.split('@')[0] }
        return createMockSession(email, metadata)
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
 * Sign in with Supabase Google OAuth
 */
export async function signInWithGoogle() {
  if (!isSupabaseConfigured) {
    return createMockSession('google_player@mjesports.gg', { username: 'Google Player' })
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
    },
  })
  if (error) {
    throw new Error(error.message || 'Failed to initialize Google Sign In.')
  }
  return data
}

/**
 * Request Password Reset Email
 */
export async function requestPasswordReset(email) {
  if (!isSupabaseConfigured) {
    return { success: true }
  }

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) {
      console.warn('[Supabase Password Reset Warning]:', error.message)
    }
    return { success: true }
  } catch (err) {
    console.error('[Request Password Reset Exception]:', err)
    return { success: true }
  }
}

/**
 * Update User Password
 */
export async function updateUserPassword(newPassword) {
  if (!isSupabaseConfigured) {
    return { success: true }
  }

  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  })

  if (error) {
    throw new Error(error.message)
  }
  return data
}

/**
 * Sign out current user
 */
export async function signOut() {
  if (isSupabaseConfigured) {
    try {
      await supabase.auth.signOut()
    } catch (err) {
      console.warn('[Supabase SignOut Warning]:', err.message)
    }
  }

  removeStorageItem('mj_esports_mock_user')
  removeStorageItem('mj_esports_mock_session')
  return { success: true }
}
