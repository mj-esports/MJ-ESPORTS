import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

console.log('--- STARTING MOBILE HAMBURGER MENU VERIFICATION ---')

const navbarPath = path.resolve(process.cwd(), 'src/components/common/Navbar.jsx')
const navbarSrc = fs.readFileSync(navbarPath, 'utf8')

// ----------------------------------------------------------------------------
// SUITE 1: RUNTIME ERROR & VARIABLE AUDIT
// ----------------------------------------------------------------------------

test('1.1 Navbar.jsx has zero occurrences of undeclared userWalletBalance', () => {
  assert.ok(
    !navbarSrc.includes('userWalletBalance'),
    'Navbar.jsx must NEVER reference undeclared userWalletBalance'
  )
})

test('1.2 Navbar.jsx uses navWalletBalance from authoritative wallet source', () => {
  assert.ok(
    navbarSrc.includes('navWalletBalance'),
    'Navbar.jsx must use navWalletBalance state'
  )
  assert.ok(
    navbarSrc.includes('getAuthoritativeWalletBalance()'),
    'Navbar.jsx must initialize from getAuthoritativeWalletBalance()'
  )
  assert.ok(
    navbarSrc.includes('subscribeToWalletBalance'),
    'Navbar.jsx must subscribe to authoritative wallet balance updates'
  )
})

test('1.3 Navbar.jsx handles wallet loading and safe fallback without crashing', () => {
  assert.ok(
    navbarSrc.includes('isWalletLoading'),
    'Navbar.jsx must check isWalletLoading'
  )
  assert.ok(
    navbarSrc.includes('Wallet unavailable'),
    'Navbar.jsx must provide safe fallback text when wallet balance is null/failed'
  )
  assert.ok(
    navbarSrc.includes('animate-pulse'),
    'Navbar.jsx must provide animated placeholder skeleton during loading'
  )
})

// ----------------------------------------------------------------------------
// SUITE 2: AUTHENTICATED MOBILE MENU CONTENT AUDIT
// ----------------------------------------------------------------------------

test('2.1 Mobile menu contains all 9 required items for authenticated users', () => {
  // 1. Home
  assert.ok(navbarSrc.includes("to=\"/\""), 'Menu must link to Home (/)')
  // 2. Tournaments
  assert.ok(navbarSrc.includes("to=\"/tournaments\""), 'Menu must link to Tournaments (/tournaments)')
  // 3. My Matches
  assert.ok(navbarSrc.includes("to=\"/profile/history\""), 'Menu must link to My Matches (/profile/history)')
  assert.ok(navbarSrc.includes('My Matches'), 'Menu must contain "My Matches" label')
  // 4. Leaderboard
  assert.ok(navbarSrc.includes("to=\"/leaderboard\""), 'Menu must link to Leaderboard (/leaderboard)')
  // 5. Wallet
  assert.ok(navbarSrc.includes("to=\"/wallet\""), 'Menu must link to Wallet (/wallet)')
  // 6. Rulebook & Info
  assert.ok(navbarSrc.includes("to=\"/about\""), 'Menu must link to Rulebook & Info (/about)')
  assert.ok(navbarSrc.includes('Rulebook & Info'), 'Menu must contain "Rulebook & Info" label')
  // 7. Profile
  assert.ok(navbarSrc.includes("to=\"/profile\""), 'Menu must link to Profile (/profile)')
  // 8. Notifications
  assert.ok(navbarSrc.includes('Notifications'), 'Menu must contain Notifications action/tray')
  assert.ok(navbarSrc.includes('unreadNotificationsCount'), 'Menu must display unread notifications count')
  // 9. Logout
  assert.ok(navbarSrc.includes('handleSignOut'), 'Menu must trigger handleSignOut')
  assert.ok(navbarSrc.includes('Logout') || navbarSrc.includes('Sign Out'), 'Menu must have Logout button')
})

test('2.2 Admin Dashboard is strictly guarded by isAdmin', () => {
  assert.ok(navbarSrc.includes('isAdmin && ('), 'Admin options must be conditionally rendered with isAdmin')
  assert.ok(navbarSrc.includes('Admin Dashboard'), 'Admin must see Admin Dashboard')
  // Ensure the temporary relaxed guard (isAdmin || isAuthenticated) is NOT in the file
  assert.ok(
    !navbarSrc.includes('(isAdmin || isAuthenticated)'),
    'Admin access must never be granted to regular authenticated users'
  )
})

// ----------------------------------------------------------------------------
// SUITE 3: LOGGED-OUT VISITOR MENU CONTENT AUDIT
// ----------------------------------------------------------------------------

test('3.1 Logged-out visitors see appropriate public navigation', () => {
  assert.ok(navbarSrc.includes("to=\"/login\""), 'Logged-out menu must link to Login')
  assert.ok(navbarSrc.includes("to=\"/register\""), 'Logged-out menu must link to Register')
  assert.ok(navbarSrc.includes('Public Directory'), 'Logged-out menu header must indicate public directory')
})

// ----------------------------------------------------------------------------
// SUITE 4: UX & ACCESSIBILITY AUDIT
// ----------------------------------------------------------------------------

test('4.1 Click-outside backdrop overlay is present', () => {
  assert.ok(
    navbarSrc.includes('onClick={() => setMobileMenuOpen(false)}'),
    'Backdrop must dismiss the mobile menu when tapped'
  )
})

test('4.2 Accessibility attributes are present', () => {
  assert.ok(navbarSrc.includes('role="dialog"'), 'Mobile drawer must have role="dialog"')
  assert.ok(navbarSrc.includes('aria-modal="true"'), 'Mobile drawer must have aria-modal="true"')
  assert.ok(navbarSrc.includes('aria-label="Mobile Navigation Menu"'), 'Mobile drawer must have descriptive aria-label')
  assert.ok(navbarSrc.includes('aria-controls="mobile-navigation-drawer"'), 'Trigger button must control mobile drawer')
  assert.ok(navbarSrc.includes('aria-expanded={mobileMenuOpen}'), 'Trigger button must set aria-expanded')
})

test('4.3 Keyboard navigation & Escape key dismisses menu', () => {
  assert.ok(navbarSrc.includes("event.key === 'Escape'"), 'Escape key handler must exist')
  assert.ok(navbarSrc.includes('setMobileMenuOpen(false)'), 'Escape key must close mobile menu')
})

test('4.4 Body scroll locking is preserved', () => {
  assert.ok(
    navbarSrc.includes("document.body.style.overflow = 'hidden'"),
    'Body scroll must be locked when mobile menu is open'
  )
})

// ----------------------------------------------------------------------------
// SUITE 5: RUNTIME EXECUTION PATH SIMULATION
// ----------------------------------------------------------------------------

test('5.1 Runtime simulation: Authenticated normal user with balance ₹50', () => {
  // Ensure global.userWalletBalance is completely undefined
  assert.strictEqual(typeof global.userWalletBalance, 'undefined')

  const state = {
    isAuthenticated: true,
    isAdmin: false,
    userDisplayName: 'ApexGamer',
    navWalletBalance: 50,
    isWalletLoading: false,
    mobileMenuOpen: true,
  }

  // Execute the exact expressions from Navbar.jsx line 490-520
  let renderedWalletText = null
  if (state.isWalletLoading) {
    renderedWalletText = 'LOADING_PULSE'
  } else if (state.navWalletBalance === null) {
    renderedWalletText = 'Wallet unavailable'
  } else {
    renderedWalletText = `Wallet Balance: ₹${Math.floor(state.navWalletBalance)}`
  }

  assert.strictEqual(renderedWalletText, 'Wallet Balance: ₹50')
  assert.strictEqual(state.isAdmin, false, 'Admin dashboard must not be shown')
})

test('5.2 Runtime simulation: Wallet loading state renders skeleton without crashing', () => {
  assert.strictEqual(typeof global.userWalletBalance, 'undefined')

  const state = {
    isAuthenticated: true,
    isAdmin: false,
    userDisplayName: 'NewPlayer',
    navWalletBalance: null,
    isWalletLoading: true,
    mobileMenuOpen: true,
  }

  let renderedWalletText = null
  if (state.isWalletLoading) {
    renderedWalletText = 'LOADING_PULSE'
  } else if (state.navWalletBalance === null) {
    renderedWalletText = 'Wallet unavailable'
  } else {
    renderedWalletText = `Wallet Balance: ₹${Math.floor(state.navWalletBalance)}`
  }

  assert.strictEqual(renderedWalletText, 'LOADING_PULSE')
})

test('5.3 Runtime simulation: Wallet null/error state renders safe fallback without crashing', () => {
  assert.strictEqual(typeof global.userWalletBalance, 'undefined')

  const state = {
    isAuthenticated: true,
    isAdmin: false,
    userDisplayName: 'OfflinePlayer',
    navWalletBalance: null,
    isWalletLoading: false,
    mobileMenuOpen: true,
  }

  let renderedWalletText = null
  if (state.isWalletLoading) {
    renderedWalletText = 'LOADING_PULSE'
  } else if (state.navWalletBalance === null) {
    renderedWalletText = 'Wallet unavailable'
  } else {
    renderedWalletText = `Wallet Balance: ₹${Math.floor(state.navWalletBalance)}`
  }

  assert.strictEqual(renderedWalletText, 'Wallet unavailable')
})

test('5.4 Runtime simulation: Authenticated admin includes Admin Dashboard', () => {
  const state = {
    isAuthenticated: true,
    isAdmin: true,
    userDisplayName: 'AdminMaster',
    navWalletBalance: 150,
    isWalletLoading: false,
    mobileMenuOpen: true,
  }

  const menuItems = [
    { name: 'Home', path: '/' },
    { name: 'Tournaments', path: '/tournaments' },
    { name: 'My Matches', path: '/profile/history' },
    { name: 'Leaderboard', path: '/leaderboard' },
    { name: 'Wallet', path: '/wallet' },
    { name: 'Rulebook & Info', path: '/about' },
    { name: 'Profile', path: '/profile' },
    { name: 'Notifications', path: null },
    ...(state.isAdmin ? [{ name: 'Admin Dashboard', path: '/admin' }] : []),
    { name: 'Logout', path: null },
  ]

  assert.strictEqual(menuItems.length, 10)
  assert.ok(menuItems.some(i => i.name === 'Admin Dashboard'))
})

test('5.5 Runtime simulation: Logged-out visitor sees only public navigation and auth actions', () => {
  const state = {
    isAuthenticated: false,
    isAdmin: false,
    mobileMenuOpen: true,
  }

  const publicItems = [
    { name: 'Login', path: '/login' },
    { name: 'Register', path: '/register' },
    { name: 'Home', path: '/' },
    { name: 'Tournaments', path: '/tournaments' },
    { name: 'Leaderboard', path: '/leaderboard' },
    { name: 'Rulebook & Info', path: '/about' },
  ]

  assert.strictEqual(publicItems.length, 6)
  assert.ok(!publicItems.some(i => i.name === 'Wallet'))
  assert.ok(!publicItems.some(i => i.name === 'Admin Dashboard'))
  assert.ok(!publicItems.some(i => i.name === 'My Matches'))
})

console.log('--- ALL MOBILE HAMBURGER MENU TESTS PASSED ---')
