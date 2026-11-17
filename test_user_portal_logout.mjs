import fs from 'fs'
import path from 'path'
import assert from 'assert'

console.log('====================================================')
console.log('MJ ESPORTS — User Portal Logout Feature Verification')
console.log('====================================================\n')

let passedTests = 0
let failedTests = 0

function runTest(name, fn) {
  try {
    fn()
    console.log(`[PASS] ${name}`)
    passedTests++
  } catch (err) {
    console.error(`[FAIL] ${name}`)
    console.error(`       Error: ${err.message}`)
    failedTests++
  }
}

const navbarPath = path.resolve('src/components/common/Navbar.jsx')
const settingsPagePath = path.resolve('src/pages/SettingsPage.jsx')
const authContextPath = path.resolve('src/contexts/AuthContext.jsx')
const authServicePath = path.resolve('src/services/authService.js')
const protectedRoutePath = path.resolve('src/routes/ProtectedRoute.jsx')
const adminRoutePath = path.resolve('src/routes/AdminRoute.jsx')
const appRoutesPath = path.resolve('src/routes/AppRoutes.jsx')

const navbarContent = fs.readFileSync(navbarPath, 'utf8')
const settingsContent = fs.readFileSync(settingsPagePath, 'utf8')
const authContextContent = fs.readFileSync(authContextPath, 'utf8')
const authServiceContent = fs.readFileSync(authServicePath, 'utf8')
const protectedRouteContent = fs.readFileSync(protectedRoutePath, 'utf8')
const adminRouteContent = fs.readFileSync(adminRoutePath, 'utf8')
const appRoutesContent = fs.readFileSync(appRoutesPath, 'utf8')

// Test 1: Desktop Navbar Profile Dropdown Logout UI
runTest('Navbar desktop dropdown renders "Log Out" with LogOut icon and sharp styling', () => {
  assert(navbarContent.includes('LogOut'), 'Navbar must import LogOut icon')
  assert(navbarContent.includes("isSigningOut ? 'Logging Out...' : 'Log Out'"), 'Desktop dropdown must render "Log Out" with "Logging Out..." loading state')
  assert(navbarContent.includes('aria-label="Log Out of MJ ESPORTS"'), 'Desktop dropdown logout button must include accessible aria-label')
  assert(navbarContent.includes('rounded-none'), 'Desktop dropdown logout button must maintain rounded-none sharp styling')
  assert(navbarContent.includes('hover:bg-[#18181B]'), 'Desktop dropdown must adhere to brand charcoal palette')
  assert(!navbarContent.includes("text-[#FF0000] hover:bg-[#FF0000]/10"), 'Desktop dropdown must not use harsh red #FF0000')
})

// Test 2: Mobile Navigation Drawer Logout UI
runTest('Navbar mobile drawer renders "Log Out" with LogOut icon and brand design system', () => {
  // Mobile drawer footer section
  const mobileFooterRegex = /\{isAuthenticated && \(\s*<div className="pt-2 border-t border-\[#27272A\]">[\s\S]*?Log Out[\s\S]*?<\/button>\s*<\/div>\s*\)\}/
  assert(mobileFooterRegex.test(navbarContent), 'Mobile drawer footer must conditionally render Log Out for authenticated users')
  assert(navbarContent.includes('bg-[#111215] hover:bg-[#18181B] hover:text-[#FFB900]'), 'Mobile drawer button must follow MJ ESPORTS brand palette (charcoal & restrained amber)')
  assert(navbarContent.includes('min-h-[44px]'), 'Mobile drawer logout button must have at least 44px touch target')
})

// Test 3: Settings Page Logout UI & State
// Test 3: Dedicated Mobile Header Logout Button
runTest('Navbar mobile header exposes dedicated Logout button beside hamburger for authenticated users', () => {
  assert(navbarContent.includes('id="mobile-header-logout-btn"'), 'Must have dedicated mobile header logout button with id="mobile-header-logout-btn"')
  assert(navbarContent.includes('flex md:hidden items-center gap-2'), 'Must align controls horizontally on the right side of header')
  assert(navbarContent.includes('setShowLogoutConfirm(true)'), 'Mobile header button must open confirmation dialog')
  assert(navbarContent.includes('min-h-[44px] min-w-[44px]'), 'Mobile header button must match 44px touch target dimensions')
  assert(navbarContent.includes('bg-[#111215] border border-[#27272A] text-[#FFB900]'), 'Mobile header button must follow brand design system')
  assert(navbarContent.includes('max-w-[calc(100%-108px)]'), 'Header logo container must prevent overflow on narrow viewports (320px, 360px, etc.)')
})

// Test 4: Logout Confirmation Dialog
runTest('Logout confirmation dialog prompts "Are you sure you want to log out?" with Cancel and Log Out actions', () => {
  assert(navbarContent.includes('Are you sure you want to log out?'), 'Confirmation dialog must ask exact prompt text')
  assert(navbarContent.includes('setShowLogoutConfirm(false)'), 'Cancel button must dismiss confirmation dialog')
  assert(navbarContent.includes("handleSignOut('/login')"), 'Log Out confirmation action must redirect to /login')
  assert(navbarContent.includes('Confirm Logout'), 'Dialog must have clear title')
  assert(navbarContent.includes('disabled={isSigningOut}'), 'Dialog buttons must be disabled while logout is processing')
})

// Test 5: Settings Page Logout UI & State
runTest('SettingsPage renders "Log Out" with loading state and brand design', () => {
  assert(settingsContent.includes('const [isSigningOut, setIsSigningOut] = useState(false)'), 'SettingsPage must track isSigningOut state')
  assert(settingsContent.includes("isSigningOut ? 'Logging Out...' : 'Log Out'"), 'SettingsPage must show "Log Out" and "Logging Out..." state')
  assert(settingsContent.includes('handleSignOutCurrentDevice'), 'SettingsPage must invoke handleSignOutCurrentDevice')
  assert(settingsContent.includes('rounded-none'), 'SettingsPage logout button must have rounded-none styling')
  assert(!settingsContent.includes('hover:bg-red-950/40 text-red-400 border border-red-900/40'), 'SettingsPage must not use red styling for logout button')
})

// Test 4: Real Supabase SignOut Integration
// Test 6: Real Supabase SignOut Integration
runTest('AuthService & AuthContext invoke real Supabase auth.signOut()', () => {
  assert(authServiceContent.includes('supabase.auth.signOut('), 'authService must call real Supabase auth.signOut()')
  assert(authServiceContent.includes('serverRevoked = true'), 'authService must confirm server-side revocation on success')
  assert(authServiceContent.includes('serverRevoked = false'), 'authService must not falsely confirm server revocation on error')
  assert(authServiceContent.includes("removeStorageItem('mj_esports_mock_user')"), 'authService must remove mock user storage')
  assert(authServiceContent.includes("removeStorageItem('mj_esports_mock_session')"), 'authService must remove mock session storage')
  assert(authContextContent.includes('await apiSignOut(options)'), 'AuthContext must await apiSignOut(options)')
  assert(authContextContent.includes("event === 'SIGNED_OUT'"), 'AuthContext must listen for Supabase SIGNED_OUT event')
})

// Test 5: Client-Side State and Cache Clearance
// Test 7: Client-Side State and Cache Clearance
runTest('Navbar handleSignOut clears all user-specific state and cached data', () => {
  assert(navbarContent.includes('setNotifications([])'), 'handleSignOut must clear notifications array')
  assert(navbarContent.includes('setProfileAvatar(null)'), 'handleSignOut must reset profile avatar')
  assert(navbarContent.includes('setProfileUsername(null)'), 'handleSignOut must reset profile username')
  assert(navbarContent.includes('setNavWalletBalance(null)'), 'handleSignOut must reset wallet balance')
  assert(navbarContent.includes("navigate('/')"), 'handleSignOut must redirect to public homepage')
  assert(navbarContent.includes('setShowLogoutConfirm(false)'), 'handleSignOut must reset confirmation dialog')
  assert(navbarContent.includes('navigate(destination)'), 'handleSignOut must redirect upon session termination')
  assert(navbarContent.includes("showSuccess('Logged out successfully.', 'Session Closed')"), 'handleSignOut must show success toast')
})

// Test 6: Route Protection Verification
// Test 8: Route Protection Verification
runTest('ProtectedRoute blocks all unauthenticated portal routes', () => {
  assert(protectedRouteContent.includes('if (!user)'), 'ProtectedRoute must check if user is null')
  assert(protectedRouteContent.includes('<Navigate to={redirectTo}'), 'ProtectedRoute must redirect unauthenticated visitors to login')

  // Verify all protected routes in AppRoutes
  const protectedRoutes = [
    'dashboard',
    'profile',
    'profile/team',
    'profile/edit',
    'profile/statistics',
    'profile/history',
    'profile/achievements',
    'wallet',
    'settings',
  ]
  for (const route of protectedRoutes) {
    assert(appRoutesContent.includes(`path="${route}"`), `AppRoutes must protect ${route}`)
  }
})

// Test 7: Admin Isolation and Independent Guarding
// Test 9: Admin Isolation and Independent Guarding
runTest('Admin routes remain strictly guarded and isolated from user logout', () => {
  assert(adminRouteContent.includes('if (!isAuthenticated || !user)'), 'AdminRoute must reject anonymous users')
  assert(adminRouteContent.includes('if (!isAdmin)'), 'AdminRoute must reject non-admin users with 403')
  assert(appRoutesContent.includes('<Route element={<AdminRoute />}>'), 'Admin routes must be protected by AdminRoute')
})

console.log('\n----------------------------------------------------')
console.log(`Test Results: ${passedTests} passed, ${failedTests} failed`)
console.log('----------------------------------------------------')

if (failedTests > 0) {
  process.exit(1)
} else {
  console.log('ALL LOGOUT FEATURE TESTS PASSED SUCCESSFULLY!')
}
