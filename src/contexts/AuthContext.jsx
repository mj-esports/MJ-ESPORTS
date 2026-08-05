import { createContext, useContext, useEffect, useState, useCallback } from 'react'
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

  // Resolve user role with complete loading lock
  const syncUserAndRole = useCallback(async (currentUser, currentSession) => {
    setRoleLoading(true)
    setSession(currentSession ?? null)
    setUser(currentUser ?? null)

    if (currentUser) {
      try {
        const resolvedRole = await getUserRole(currentUser)
        console.log('[AUTH DEBUG] Current User Email:', currentUser.email)
        console.log('[AUTH DEBUG] Current User ID:', currentUser.id)
        console.log('[AUTH DEBUG] Role from database/service:', resolvedRole)
        console.log('[AUTH DEBUG] user_roles query result / resolved role:', resolvedRole)
        console.log('[AUTH DEBUG] isAdmin value:', resolvedRole === 'admin')
        setRole(resolvedRole)
      } catch (err) {
        console.error('[Role Resolution Error]:', err)
        setRole('user')
      }
    } else {
      setRole(null)
    }
    setRoleLoading(false)
    setLoading(false)
  }, [])

  useEffect(() => {
    let isSubscribed = true

    if (!isSupabaseConfigured) {
      if (typeof localStorage !== 'undefined') {
        const storedSession = localStorage.getItem('mj_esports_mock_session')
        if (storedSession) {
          try {
            const parsed = JSON.parse(storedSession)
            if (isSubscribed) {
              syncUserAndRole(parsed?.user ?? null, parsed)
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

    // Fetch initial session on mount
    supabase.auth
      .getSession()
      .then(({ data: { session: initialSession } }) => {
        if (isSubscribed) {
          syncUserAndRole(initialSession?.user ?? null, initialSession)
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

    // Listen for auth state transitions (login, logout, token refresh, password recovery)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (isSubscribed) {
        syncUserAndRole(currentSession?.user ?? null, currentSession)
      }
    })

    return () => {
      isSubscribed = false
      subscription?.unsubscribe()
    }
  }, [syncUserAndRole])

  const signUp = async (email, password, metadata) => {
    setRoleLoading(true)
    const data = await apiSignUp(email, password, metadata)
    const activeUser = data?.user ?? null
    const activeSession = data?.session ?? null

    await syncUserAndRole(activeUser, activeSession)
    return data
  }

  const signIn = async (email, password) => {
    setRoleLoading(true)
    const data = await apiSignIn(email, password)
    const activeUser = data?.user ?? null
    const activeSession = data?.session ?? null

    await syncUserAndRole(activeUser, activeSession)
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
    if (isSupabaseConfigured) {
      const { data: authData, error: authErr } = await supabase.auth.updateUser({
        data: profileData
      })
      if (authErr) throw authErr

      if (authData?.user) {
        setUser(authData.user)
      }
      return authData
    } else {
      const updatedMetadata = {
        ...(user?.user_metadata || {}),
        ...profileData,
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
      setSession(updatedSession)
      return { user: updatedUser, session: updatedSession }
    }
  }

  const signOut = async () => {
    setRoleLoading(true)
    await apiSignOut()
    setUser(null)
    setSession(null)
    setRole(null)
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
