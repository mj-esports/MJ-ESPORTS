import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase.js'
import {
  signUp as apiSignUp,
  signIn as apiSignIn,
  signInWithGoogle as apiSignInWithGoogle,
  signOut as apiSignOut,
  getUserRole,
  requestPasswordReset as apiRequestPasswordReset,
  updateUserPassword as apiUpdateUserPassword,
} from '../services/authService.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)
  const [roleLoading, setRoleLoading] = useState(true)

  // Use refs to track current user and role inside async callbacks without stale closures or re-subscription triggers
  const userRef = useRef(null)
  userRef.current = user

  const roleRef = useRef(null)
  roleRef.current = role

  // Synchronizes user and role state smoothly with stable reference
  const syncUserAndRole = useCallback(async (currentUser, currentSession, options = {}) => {
    const { isExplicit = false } = options

    const previousUserId = userRef.current?.id
    const currentUserId = currentUser?.id
    const isUserIdentityChange = currentUserId !== previousUserId
    const needsRoleFetch = !roleRef.current || isUserIdentityChange || isExplicit

    // 1. Update session & user state
    setSession(currentSession ?? null)
    setUser(currentUser ?? null)
    userRef.current = currentUser ?? null

    if (currentUser) {
      // Only lock roleLoading during explicit identity changes or initial load
      if (needsRoleFetch) {
        setRoleLoading(true)
      }

      try {
        const resolvedRole = await getUserRole(currentUser)
        setRole(resolvedRole)
        roleRef.current = resolvedRole

        // Automatically ensure user profile exists in public.profiles table (e.g. for Google Sign-In & new users)
        if (isSupabaseConfigured) {
          const userEmail = currentUser.email || ''
          const username =
            currentUser.user_metadata?.username ||
            currentUser.user_metadata?.full_name ||
            currentUser.user_metadata?.name ||
            (userEmail ? userEmail.split('@')[0] : 'Player')

          try {
            await supabase.from('profiles').upsert(
              [
                {
                  id: currentUser.id,
                  username,
                  email: userEmail,
                },
              ],
              { onConflict: 'id' }
            )
          } catch (pErr) {
            console.warn('[Sync Profile Upsert Notice]:', pErr.message)
          }
        }
      } catch (err) {
        console.error('[Role Resolution Error]:', err)
        setRole('user')
        roleRef.current = 'user'
      }
    } else {
      setRole(null)
      roleRef.current = null
    }

    setRoleLoading(false)
    setLoading(false)
  }, []) // Stable callback reference with empty dependency array

  // Global Auth lifecycle listener — runs ONCE on mount
  useEffect(() => {
    let isSubscribed = true

    if (!isSupabaseConfigured) {
      if (typeof localStorage !== 'undefined') {
        const storedSession = localStorage.getItem('mj_esports_mock_session')
        if (storedSession) {
          try {
            const parsed = JSON.parse(storedSession)
            if (isSubscribed) {
              syncUserAndRole(parsed?.user ?? null, parsed, { isExplicit: true })
              return
            }
          } catch (e) {
            console.error('[Mock Session Load Error]:', e)
          }
        }
      }
      if (isSubscribed) {
        setRole(null)
        setRoleLoading(false)
        setLoading(false)
      }
      return
    }

    // 1. Initial Session Fetch on Application Mount
    supabase.auth
      .getSession()
      .then(({ data: { session: initialSession } }) => {
        if (isSubscribed) {
          syncUserAndRole(initialSession?.user ?? null, initialSession, { isExplicit: true })
        }
      })
      .catch((err) => {
        console.error('[Supabase getSession Error]:', err)
        if (isSubscribed) {
          setRole(null)
          setRoleLoading(false)
          setLoading(false)
        }
      })

    // 2. Auth State Transition Listener (Login, Logout, Silent Token Refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, currentSession) => {
      if (!isSubscribed) return

      const previousUserId = userRef.current?.id
      const currentUserId = currentSession?.user?.id
      const isUserChange = currentUserId !== previousUserId

      // Token refresh or window focus events for the same user update session silently without locking roleLoading
      const isExplicitUserChange = isUserChange || event === 'SIGNED_IN' || event === 'SIGNED_OUT'
      syncUserAndRole(currentSession?.user ?? null, currentSession, { isExplicit: isExplicitUserChange })
    })

    return () => {
      isSubscribed = false
      subscription?.unsubscribe()
    }
  }, [syncUserAndRole]) // Stable effect dependency that never tears down on role/user state changes

  const signUp = async (email, password, metadata) => {
    setRoleLoading(true)
    const data = await apiSignUp(email, password, metadata)
    const activeUser = data?.user ?? null
    const activeSession = data?.session ?? null

    await syncUserAndRole(activeUser, activeSession, { isExplicit: true })
    return data
  }

  const signIn = async (email, password) => {
    setRoleLoading(true)
    const data = await apiSignIn(email, password)
    const activeUser = data?.user ?? null
    const activeSession = data?.session ?? null

    await syncUserAndRole(activeUser, activeSession, { isExplicit: true })
    return data
  }

  const signInWithGoogle = async () => {
    return await apiSignInWithGoogle()
  }

  const requestPasswordReset = async (email) => {
    return await apiRequestPasswordReset(email)
  }

  const updateUserPassword = async (newPassword) => {
    return await apiUpdateUserPassword(newPassword)
  }

  const updateProfile = async (profileData) => {
    // Explicitly strip financial columns from client profile updates
    const { wallet_balance, earnings, walletBalance, ...sanitizedProfileData } = profileData || {}

    if (isSupabaseConfigured) {
      const { data: authData, error: authErr } = await supabase.auth.updateUser({
        data: sanitizedProfileData
      })
      if (authErr) throw authErr

      if (authData?.user) {
        setUser(authData.user)
        userRef.current = authData.user
      }
      return authData
    } else {
      const updatedMetadata = {
        ...(user?.user_metadata || {}),
        ...sanitizedProfileData,
      }
      const updatedUser = {
        ...(user || {}),
        user_metadata: updatedMetadata,
      }
      const updatedSession = {
        ...(session || {}),
        user: updatedUser,
      }
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('mj_esports_mock_user', JSON.stringify(updatedUser))
        localStorage.setItem('mj_esports_mock_session', JSON.stringify(updatedSession))
      }
      setUser(updatedUser)
      userRef.current = updatedUser
      setSession(updatedSession)
      return { user: updatedUser, session: updatedSession }
    }
  }

  const signOut = async () => {
    setRoleLoading(true)
    await apiSignOut()
    setUser(null)
    userRef.current = null
    setSession(null)
    setRole(null)
    roleRef.current = null
    setRoleLoading(false)
    setLoading(false)
  }

  const value = {
    user,
    session,
    role,
    isAdmin: role === 'admin',
    loading: loading || roleLoading,
    roleLoading,
    isAuthenticated: !!user,
    signUp,
    signIn,
    signInWithGoogle,
    requestPasswordReset,
    updateUserPassword,
    updateProfile,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
