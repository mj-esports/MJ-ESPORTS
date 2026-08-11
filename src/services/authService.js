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

  // 1. Primary owner admin check
  if (user.email && user.email.toLowerCase().trim() === 'mjesports.team@gmail.com') {
    return 'admin'
  }

  const userId = user.id
  const isUuid = typeof userId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)

  // 2. Query Supabase user_roles table if configured and userId is a valid UUID
  if (isSupabaseConfigured) {
    try {
      const userEmail = user.email ? user.email.toLowerCase().trim() : ''
      let query = null

      if (isUuid) {
        query = supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .maybeSingle()
      } else if (userEmail) {
        query = supabase
          .from('user_roles')
          .select('role')
          .eq('email', userEmail)
          .maybeSingle()
      }

      if (query) {
        const { data, error } = await query
        if (!error && data?.role) {
          return data.role
        }
      }
    } catch (err) {
      console.warn('[getUserRole Supabase Warning]:', err.message)
    }
  }

  // 3. Return role from authenticated user metadata or fallback 'user'
  return 'user'
}

/**
 * Register a new user with Email and Password
 */
export async function signUp(email, password, metadata = {}) {
  if (!isSupabaseConfigured) {
    return createMockSession(email, metadata)
  }

  const role = metadata.role || 'user'

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
    console.error('[Supabase Auth signUp Error]:', {
      code: error.code,
      message: error.message,
      status: error.status,
      name: error.name,
      error,
    })
    if (error.message && (error.message.includes('already registered') || error.message.includes('User already registered'))) {
      const err = new Error('An account with this email address already exists.')
      err.code = error.code || 'user_already_exists'
      err.status = error.status
      err.name = error.name
      throw err
    }
    const err = new Error(error.message)
    err.code = error.code
    err.status = error.status
    err.name = error.name
    throw err
  }

  // Insert into user_roles and profiles tables automatically if user created
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

    try {
      const username = metadata.username || data.user.user_metadata?.username || data.user.email?.split('@')[0] || 'Player'
      await supabase.from('profiles').upsert([
        {
          id: data.user.id,
          username,
          email: data.user.email,
        },
      ])
    } catch (profileErr) {
      console.warn('[Supabase profiles Insert Warning]:', profileErr.message)
    }
  }

  return data
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

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    console.error('[Supabase Auth signIn Error]:', {
      code: error.code,
      message: error.message,
      status: error.status,
      name: error.name,
      error,
    })

    const isInvalidCredentials =
      error.code === 'invalid_credentials' ||
      (error.message && error.message.toLowerCase().includes('invalid login credentials'))

    if (isInvalidCredentials) {
      const err = new Error('Invalid email or password.')
      err.code = error.code || 'invalid_credentials'
      err.status = error.status
      err.name = error.name
      throw err
    }

    const err = new Error(error.message)
    err.code = error.code
    err.status = error.status
    err.name = error.name
    throw err
  }
  return data
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
