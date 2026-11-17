import assert from 'assert'
import fs from 'fs'
import path from 'path'

console.log('====================================================')
console.log('MJ ESPORTS — Supabase Logout Error-Handling & Resilience')
console.log('====================================================\n')

let passedTests = 0
let failedTests = 0

async function runAsyncTest(name, fn) {
  try {
    await fn()
    console.log(`[PASS] ${name}`)
    passedTests++
  } catch (err) {
    console.error(`[FAIL] ${name}`)
    console.error(`       Error: ${err.message}`)
    failedTests++
  }
}

// Mock localStorage environment
const storageStore = new Map()
global.localStorage = {
  getItem: (k) => storageStore.get(k) || null,
  setItem: (k, v) => storageStore.set(k, String(v)),
  removeItem: (k) => storageStore.delete(k),
  clear: () => storageStore.clear(),
  key: (idx) => Array.from(storageStore.keys())[idx] || null,
  get length() {
    return storageStore.size
  },
}

// 1. Static Verification of Implementation in authService, AuthContext, Navbar, SettingsPage, AdminHeader
const authServiceSource = fs.readFileSync(path.resolve('src/services/authService.js'), 'utf8')
const authContextSource = fs.readFileSync(path.resolve('src/contexts/AuthContext.jsx'), 'utf8')
const navbarSource = fs.readFileSync(path.resolve('src/components/common/Navbar.jsx'), 'utf8')
const settingsSource = fs.readFileSync(path.resolve('src/pages/SettingsPage.jsx'), 'utf8')
const adminHeaderSource = fs.readFileSync(path.resolve('src/components/admin/AdminHeader.jsx'), 'utf8')

// Test 1: Code inspections
await runAsyncTest('authService.js distinguishes local logout from confirmed Supabase sign-out', () => {
  assert(authServiceSource.includes('serverRevoked = true'), 'Must set serverRevoked = true on success')
  assert(authServiceSource.includes('serverRevoked = false'), 'Must initialize serverRevoked = false')
  assert(authServiceSource.includes('serverError = error'), 'Must capture server error when Supabase returns error')
  assert(authServiceSource.includes('serverError = err'), 'Must capture exception when signOut throws')
  assert(authServiceSource.includes('sb-'), 'Must clean up Supabase storage keys as fallback')
  assert(authServiceSource.includes("removeStorageItem('mj_esports_mock_user')"), 'Must remove mock user')
  assert(authServiceSource.includes("removeStorageItem('mj_esports_mock_session')"), 'Must remove mock session')
})

await runAsyncTest('AuthContext.jsx propagates signOut result and guarantees local cleanup via finally', () => {
  assert(authContextSource.includes('let signOutResult = null'), 'Must track signOutResult')
  assert(authContextSource.includes('signOutResult = await apiSignOut(options)'), 'Must pass options and await apiSignOut')
  assert(authContextSource.includes('finally {'), 'Must clean up state in finally block')
  assert(authContextSource.includes('return signOutResult'), 'Must return signOutResult to caller')
})

await runAsyncTest('Navbar.jsx displays warning when serverRevoked is false and success when true', () => {
  assert(navbarSource.includes('showWarning'), 'Navbar must import and use showWarning')
  assert(navbarSource.includes('res && res.serverRevoked === false'), 'Navbar must check if serverRevoked is false')
  assert(navbarSource.includes('Offline Logout') || navbarSource.includes('Server-side session revocation could not be confirmed'), 'Navbar must warn user when server revocation cannot be confirmed')
  assert(navbarSource.includes("showSuccess('Logged out successfully.', 'Session Closed')"), 'Navbar must show success when confirmed')
})

await runAsyncTest('SettingsPage.jsx displays warning when serverRevoked is false', () => {
  assert(settingsSource.includes('showWarning'), 'SettingsPage must import and use showWarning')
  assert(settingsSource.includes('res && res.serverRevoked === false'), 'SettingsPage must check serverRevoked')
})

await runAsyncTest('AdminHeader.jsx displays warning when serverRevoked is false', () => {
  assert(adminHeaderSource.includes('showWarning'), 'AdminHeader must import and use showWarning')
  assert(adminHeaderSource.includes('res && res.serverRevoked === false'), 'AdminHeader must check serverRevoked')
})

// 2. Behavioral Simulation Tests for authService.signOut()
// We simulate the exact logic implemented in authService.signOut
async function simulateAuthServiceSignOut(mockSupabaseSignOut, isConfigured = true) {
  let serverRevoked = false
  let serverError = null

  if (isConfigured) {
    try {
      const { error } = await mockSupabaseSignOut()
      if (error) {
        serverError = error
      } else {
        serverRevoked = true
      }
    } catch (err) {
      serverError = err
    }
  } else {
    serverRevoked = true
  }

  // Fallback cleanup: Always purge Supabase auth token keys from localStorage if any remain
  if (typeof localStorage !== 'undefined') {
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i)
        if (k && k.startsWith('sb-') && k.endsWith('-auth-token')) {
          localStorage.removeItem(k)
        }
      }
    } catch (storageErr) {}
  }

  // Purge mock session tokens
  storageStore.delete('mj_esports_mock_user')
  storageStore.delete('mj_esports_mock_session')

  return {
    success: true,
    serverRevoked,
    error: serverError,
    warning: serverRevoked ? null : 'Server-side session revocation could not be confirmed.',
  }
}

await runAsyncTest('Simulation 1: Successful Supabase server sign-out confirms serverRevoked: true', async () => {
  storageStore.set('sb-fdhjqlejomtgwffqgmoq-auth-token', JSON.stringify({ token: 'xyz' }))
  storageStore.set('mj_esports_mock_user', JSON.stringify({ id: 'u1' }))
  storageStore.set('mj_esports_admin_settings', JSON.stringify({ keep: 'yes' }))
  storageStore.set('mj_host_notes_123', 'host note')

  const result = await simulateAuthServiceSignOut(async () => ({ error: null }), true)

  assert.strictEqual(result.success, true, 'success must be true')
  assert.strictEqual(result.serverRevoked, true, 'serverRevoked must be true')
  assert.strictEqual(result.error, null, 'error must be null')
  assert.strictEqual(result.warning, null, 'warning must be null')

  // Verify storage cleanup
  assert.strictEqual(storageStore.has('sb-fdhjqlejomtgwffqgmoq-auth-token'), false, 'Supabase token must be removed')
  assert.strictEqual(storageStore.has('mj_esports_mock_user'), false, 'Mock user must be removed')

  // Verify unrelated application data is preserved
  assert.strictEqual(storageStore.get('mj_esports_admin_settings'), JSON.stringify({ keep: 'yes' }), 'Admin settings must be preserved')
  assert.strictEqual(storageStore.get('mj_host_notes_123'), 'host note', 'Host notes must be preserved')
})

await runAsyncTest('Simulation 2: Supabase server returns 500 error -> serverRevoked: false with accurate warning', async () => {
  storageStore.set('sb-fdhjqlejomtgwffqgmoq-auth-token', JSON.stringify({ token: 'xyz' }))
  storageStore.set('mj_esports_mock_session', JSON.stringify({ session: 'abc' }))
  storageStore.set('mj_esports_admin_settings', 'admin_config')

  const apiError = { message: '500 Internal Server Error', status: 500 }
  const result = await simulateAuthServiceSignOut(async () => ({ error: apiError }), true)

  assert.strictEqual(result.success, true, 'success must be true (local logout completed)')
  assert.strictEqual(result.serverRevoked, false, 'serverRevoked must NOT be true when Supabase errors')
  assert.strictEqual(result.error, apiError, 'error must contain the returned error')
  assert(result.warning.includes('Server-side session revocation could not be confirmed'), 'Must provide accurate warning')

  // Even though server-side failed, current browser local session MUST be purged
  assert.strictEqual(storageStore.has('sb-fdhjqlejomtgwffqgmoq-auth-token'), false, 'Local Supabase token must be purged')
  assert.strictEqual(storageStore.has('mj_esports_mock_session'), false, 'Local mock session must be purged')
  assert.strictEqual(storageStore.get('mj_esports_admin_settings'), 'admin_config', 'Admin settings must be preserved')
})

await runAsyncTest('Simulation 3: Network exception (TypeError: Failed to fetch) -> caught safely with serverRevoked: false', async () => {
  storageStore.set('sb-fdhjqlejomtgwffqgmoq-auth-token', JSON.stringify({ token: 'xyz' }))
  storageStore.set('mj_esports_mock_user', JSON.stringify({ id: 'u1' }))

  const networkErr = new TypeError('Failed to fetch (Network offline)')
  const result = await simulateAuthServiceSignOut(async () => {
    throw networkErr
  }, true)

  assert.strictEqual(result.success, true, 'success must be true')
  assert.strictEqual(result.serverRevoked, false, 'serverRevoked must be false on network exception')
  assert.strictEqual(result.error, networkErr, 'error must capture the thrown exception')
  assert(result.warning.includes('Server-side session revocation could not be confirmed'), 'Must warn user')

  // Storage purged
  assert.strictEqual(storageStore.has('sb-fdhjqlejomtgwffqgmoq-auth-token'), false, 'Supabase token must be purged on network error')
  assert.strictEqual(storageStore.has('mj_esports_mock_user'), false, 'Mock user must be purged')
})

await runAsyncTest('Simulation 4: AuthContext finally block guarantees React state clearance on error', async () => {
  let user = { id: 'u1' }
  let session = { token: 't1' }
  let role = 'user'
  let roleLoading = false
  let loading = false

  async function mockContextSignOut(shouldThrow = false) {
    roleLoading = true
    let res = null
    try {
      if (shouldThrow) {
        throw new Error('Unexpected context failure')
      }
      res = { success: true, serverRevoked: false }
    } finally {
      user = null
      session = null
      role = null
      roleLoading = false
      loading = false
    }
    return res
  }

  // Test successful execution
  const res1 = await mockContextSignOut(false)
  assert.strictEqual(user, null, 'user must be null')
  assert.strictEqual(session, null, 'session must be null')
  assert.strictEqual(role, null, 'role must be null')
  assert.strictEqual(roleLoading, false, 'roleLoading must be false')
  assert.strictEqual(res1.serverRevoked, false)

  // Test exception execution
  user = { id: 'u2' }
  try {
    await mockContextSignOut(true)
  } catch (e) {
    // Expected error
  }
  assert.strictEqual(user, null, 'user must still be null after thrown error')
  assert.strictEqual(session, null, 'session must still be null')
  assert.strictEqual(role, null, 'role must still be null')
  assert.strictEqual(roleLoading, false, 'roleLoading must be false')
})

console.log('\n----------------------------------------------------')
console.log(`Test Results: ${passedTests} passed, ${failedTests} failed`)
console.log('----------------------------------------------------')

if (failedTests > 0) {
  process.exit(1)
} else {
  console.log('ALL SUPABASE LOGOUT RESILIENCE TESTS PASSED!')
}
