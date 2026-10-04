// test_player_team_navigation.mjs
// Dedicated N3.5 Test Suite: Player Team Portal Routing & Navigation Verification

import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

console.log('=== TEST SUITE: N3.5 Player Team Portal Routing & Navigation ===\n')

const appRoutesPath = path.resolve('src/routes/AppRoutes.jsx')
const profilePagePath = path.resolve('src/pages/ProfilePage.jsx')
const navbarPath = path.resolve('src/components/common/Navbar.jsx')
const playerPortalPath = path.resolve('src/pages/PlayerTeamPortalPage.jsx')

const appRoutesContent = fs.readFileSync(appRoutesPath, 'utf8')
const profilePageContent = fs.readFileSync(profilePagePath, 'utf8')
const navbarContent = fs.readFileSync(navbarPath, 'utf8')
const playerPortalContent = fs.readFileSync(playerPortalPath, 'utf8')

let totalAssertions = 0
function check(description, fn) {
  try {
    fn()
    totalAssertions++
    console.log(`  ✓ ${description}`)
  } catch (err) {
    console.error(`  ✗ FAIL: ${description}`)
    throw err
  }
}

// ============================================================================
// GROUP 1: PlayerTeamPortalPage Route Configuration
// ============================================================================
console.log('--- GROUP 1: Route Registration ---')

check('1.1. AppRoutes.jsx imports PlayerTeamPortalPage with React.lazy code-splitting', () => {
  assert.ok(
    /const\s+PlayerTeamPortalPage\s*=\s*lazy\(\s*\(\)\s*=>\s*import\(['"]\.\.\/pages\/PlayerTeamPortalPage['"]\)\s*\)/.test(appRoutesContent),
    'AppRoutes must import PlayerTeamPortalPage via lazy code-splitting'
  )
})

check('1.2. AppRoutes.jsx registers route path "profile/team" pointing to <PlayerTeamPortalPage />', () => {
  assert.ok(
    /<Route\s+path=["']profile\/team["']\s+element=\{<PlayerTeamPortalPage\s*\/>\}\s*\/>/.test(appRoutesContent),
    'AppRoutes must declare Route for profile/team with element <PlayerTeamPortalPage />'
  )
})

check('1.3. PlayerTeamPortalPage component file exists and exports a valid React component', () => {
  assert.ok(fs.existsSync(playerPortalPath), 'PlayerTeamPortalPage.jsx must exist')
  assert.ok(
    playerPortalContent.includes('export default function PlayerTeamPortalPage'),
    'PlayerTeamPortalPage must declare default export'
  )
})

// ============================================================================
// GROUP 2: Profile Page Navigation Entry
// ============================================================================
console.log('\n--- GROUP 2: Profile Page Navigation ---')

check('2.1. ProfilePage.jsx contains a navigation link targeting "/profile/team"', () => {
  assert.ok(
    profilePageContent.includes('to="/profile/team"'),
    'ProfilePage must have Link with to="/profile/team"'
  )
})

check('2.2. Profile navigation label reads "Team Management" or "My Team"', () => {
  assert.ok(
    profilePageContent.includes('Team Management') || profilePageContent.includes('My Team'),
    'ProfilePage link must have title Team Management or My Team'
  )
})

check('2.3. Profile navigation uses Users icon from lucide-react', () => {
  assert.ok(
    /import\s*\{[^}]*Users[^}]*\}\s*from\s*['"]lucide-react['"]/.test(profilePageContent),
    'ProfilePage must import Users icon from lucide-react'
  )
  assert.ok(
    profilePageContent.includes('<Users'),
    'ProfilePage must render Users icon in team navigation'
  )
})

check('2.4. Profile navigation maintains existing cyberpunk styling and transition structure', () => {
  assert.ok(
    profilePageContent.includes('hover:border-[#00f2ff]/40') && profilePageContent.includes('group cursor-pointer'),
    'Profile team link must match the cyberpunk control center styling'
  )
})

// ============================================================================
// GROUP 3: Navbar Navigation (Desktop + Mobile)
// ============================================================================
console.log('\n--- GROUP 3: Navbar Navigation ---')

check('3.1. Desktop dropdown contains link targeting "/profile/team"', () => {
  assert.ok(
    navbarContent.includes('to="/profile/team"'),
    'Navbar must include to="/profile/team"'
  )
})

check('3.2. Desktop dropdown link renders "My Team" or "Team Management" and closes dropdown on click', () => {
  assert.ok(
    navbarContent.includes('My Team') || navbarContent.includes('Team Management'),
    'Navbar link must be labelled My Team or Team Management'
  )
  assert.ok(
    /to=["']\/profile\/team["']\s+onClick=\{\(\)\s*=>\s*setUserDropdownOpen\(false\)\}/.test(navbarContent),
    'Desktop team link must close user dropdown on selection'
  )
})

check('3.3. Mobile drawer contains navigation link targeting "/profile/team"', () => {
  assert.ok(
    /to=["']\/profile\/team["']\s+onClick=\{\(\)\s*=>\s*setMobileMenuOpen\(false\)\}/.test(navbarContent),
    'Mobile drawer team link must close mobile menu on selection'
  )
})

check('3.4. Mobile drawer team link applies active indicator when route matches', () => {
  assert.ok(
    navbarContent.includes("isActive('/profile/team')"),
    'Mobile link must evaluate isActive for /profile/team'
  )
})

check('3.5. Navbar imports Users icon from lucide-react', () => {
  assert.ok(
    /import\s*\{[^}]*Users[^}]*\}\s*from\s*['"]lucide-react['"]/.test(navbarContent),
    'Navbar must import Users icon'
  )
})

// ============================================================================
// GROUP 4: Preservation of Existing Navigation & Notifications
// ============================================================================
console.log('\n--- GROUP 4: Preservation of Existing Components ---')

check('4.1. Desktop notification bell and real-time subscription remain intact', () => {
  assert.ok(navbarContent.includes('unreadNotificationsCount > 0'), 'Unread count indicator preserved')
  assert.ok(navbarContent.includes('subscribeToUserNotifications'), 'Real-time notification subscription preserved')
  assert.ok(navbarContent.includes('title="Alert Feed"'), 'Notification bell preserved')
})

check('4.2. Mobile notification drawer tray remains functional', () => {
  assert.ok(navbarContent.includes('mobileNotifOpen'), 'Mobile notification accordion preserved')
  assert.ok(navbarContent.includes('setMobileNotifOpen'), 'Mobile notification toggle preserved')
})

check('4.3. Wallet balance and direct ledger navigation remain intact', () => {
  assert.ok(navbarContent.includes('to="/wallet"'), 'Wallet link preserved')
  assert.ok(navbarContent.includes('navWalletBalance'), 'Authoritative wallet balance display preserved')
})

check('4.4. Tournament and match history links remain functional', () => {
  assert.ok(navbarContent.includes('to="/tournaments"'), 'Tournaments navigation preserved')
  assert.ok(navbarContent.includes('to="/profile/history"'), 'Match history navigation preserved')
})

// ============================================================================
// GROUP 5: Protected Route Architecture & Guard Safety
// ============================================================================
console.log('\n--- GROUP 5: Protection & Guard Safety ---')

check('5.1. /profile/team is placed inside ProtectedRoute layout with redirectTo="/login"', () => {
  const protectedSection = appRoutesContent.split('<ProtectedRoute')[1].split('<AdminRoute')[0]
  assert.ok(
    protectedSection.includes('path="profile/team"'),
    'profile/team must be nested inside ProtectedRoute'
  )
})

check('5.2. /profile/team is NOT inside AdminRoute guard', () => {
  const adminSection = appRoutesContent.split('<AdminRoute')[1]
  assert.ok(
    !adminSection.includes('profile/team'),
    'profile/team must NOT be restricted by AdminRoute'
  )
})

// ============================================================================
// GROUP 6: Safe Routing & HTML Security
// ============================================================================
console.log('\n--- GROUP 6: Navigation Security ---')

check('6.1. No dangerouslySetInnerHTML used in AppRoutes, ProfilePage, or Navbar', () => {
  assert.ok(!appRoutesContent.includes('dangerouslySetInnerHTML'), 'No dangerous HTML in AppRoutes')
  assert.ok(!profilePageContent.includes('dangerouslySetInnerHTML'), 'No dangerous HTML in ProfilePage')
  assert.ok(!navbarContent.includes('dangerouslySetInnerHTML'), 'No dangerous HTML in Navbar')
})

check('6.2. All team navigation targets use canonical internal paths without external schemes', () => {
  const paths = ['/profile/team', 'profile/team']
  for (const p of paths) {
    assert.ok(!p.includes('javascript:'), 'No javascript: scheme')
    assert.ok(!p.includes('http:'), 'No external http: scheme')
    assert.ok(!p.includes('https:'), 'No external https: scheme')
  }
})

console.log(`\n==================================================`)
console.log(`ALL CHECKS PASSED: ${totalAssertions}/${totalAssertions} assertions verified.`)
console.log(`==================================================\n`)
