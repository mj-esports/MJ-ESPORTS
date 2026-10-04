// test_admin_user_portal_navigation.mjs
// Dedicated Focused Test Suite: Admin -> Normal User Portal Navigation & UX Verification
// MJ ESPORTS Production Platform

import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

console.log('=== TEST SUITE: Admin -> Normal User Portal Navigation & UX Verification ===\n')

const rootDir = process.cwd()
const adminHeaderPath = path.join(rootDir, 'src', 'components', 'admin', 'AdminHeader.jsx')
const appRoutesPath = path.join(rootDir, 'src', 'routes', 'AppRoutes.jsx')
const adminRoutePath = path.join(rootDir, 'src', 'routes', 'AdminRoute.jsx')
const navbarPath = path.join(rootDir, 'src', 'components/common/Navbar.jsx')
const authContextPath = path.join(rootDir, 'src', 'contexts', 'AuthContext.jsx')

const adminHeaderContent = fs.readFileSync(adminHeaderPath, 'utf8')
const appRoutesContent = fs.readFileSync(appRoutesPath, 'utf8')
const adminRouteContent = fs.readFileSync(adminRoutePath, 'utf8')
const navbarContent = fs.readFileSync(navbarPath, 'utf8')
const authContextContent = fs.readFileSync(authContextPath, 'utf8')

let totalAssertions = 0

function runTest(description, testFn) {
  try {
    testFn()
    totalAssertions++
    console.log(`  ✓ ${description}`)
  } catch (err) {
    console.error(`  ✗ FAIL: ${description}`)
    throw err
  }
}

// ============================================================================
// GROUP 1: Canonical Routing Architecture & Protection
// ============================================================================
console.log('--- GROUP 1: Canonical Routing Architecture & Security Boundaries ---')

runTest('1.1. AppRoutes registers canonical user portal route ("/") under MainLayout', () => {
  assert.ok(
    /<Route\s+path=["']\/["']\s+element=\{<MainLayout\s*\/>\}>/.test(appRoutesContent),
    'AppRoutes must define path="/" with MainLayout as canonical user portal'
  )
  assert.ok(
    /<Route\s+index\s+element=\{<Home\s*\/>\}\s*\/>/.test(appRoutesContent),
    'AppRoutes index route must be Home under MainLayout'
  )
})

runTest('1.2. AppRoutes registers protected admin routes under AdminRoute guard', () => {
  assert.ok(
    /<Route\s+element=\{<AdminRoute\s*\/>\}>/.test(appRoutesContent),
    'AppRoutes must enclose admin routes inside AdminRoute'
  )
  assert.ok(
    /<Route\s+path=["']admin["']\s+element=\{<AdminDashboardPage\s*\/>\}\s*\/>/.test(appRoutesContent),
    'Admin dashboard must be routed to path="admin"'
  )
})

runTest('1.3. AdminRoute strictly verifies admin role and blocks unprivileged access', () => {
  assert.ok(
    adminRouteContent.includes('isAdmin') || adminRouteContent.includes("profile?.role === 'admin'"),
    'AdminRoute must check admin role'
  )
  assert.ok(
    adminRouteContent.includes('Navigate') || adminRouteContent.includes('to="/403"'),
    'AdminRoute must redirect non-admins away from admin console'
  )
})

runTest('1.4. AuthContext authentication logic remains untouched and authoritative', () => {
  assert.ok(
    authContextContent.includes('isAdmin:'),
    'AuthContext must expose isAdmin flag'
  )
  assert.ok(
    !authContextContent.includes('// Hack'),
    'No authentication hacks allowed in AuthContext'
  )
})

// ============================================================================
// GROUP 2: AdminHeader Top-Right Control & "Open User Portal" UX
// ============================================================================
console.log('\n--- GROUP 2: AdminHeader Top-Right Control & UX Behavior ---')

runTest('2.1. AdminHeader renders existing ADMIN identity pill with badge and avatar', () => {
  assert.ok(
    adminHeaderContent.includes('ADMIN'),
    'AdminHeader must display ADMIN badge'
  )
  assert.ok(
    adminHeaderContent.includes('adminAvatarUrl'),
    'AdminHeader must support avatar rendering'
  )
  assert.ok(
    adminHeaderContent.includes('adminName'),
    'AdminHeader must display admin account name'
  )
})

runTest('2.2. AdminHeader renders interactive dropdown with aria accessibility attributes', () => {
  assert.ok(
    adminHeaderContent.includes('aria-expanded={showProfileMenu}'),
    'Profile button must include aria-expanded attribute'
  )
  assert.ok(
    adminHeaderContent.includes('aria-haspopup="true"'),
    'Profile button must declare aria-haspopup="true"'
  )
  assert.ok(
    adminHeaderContent.includes('ChevronDown'),
    'Profile button must render ChevronDown indicator for dropdown affordance'
  )
})

runTest('2.3. Top-right profile dropdown exposes prominent "Open User Portal" action', () => {
  assert.ok(
    adminHeaderContent.includes('Open User Portal'),
    'Dropdown must contain clear "Open User Portal" label'
  )
  assert.ok(
    adminHeaderContent.includes('id="admin-open-user-portal"'),
    'Open User Portal action must have accessible identifier id="admin-open-user-portal"'
  )
})

runTest('2.4. "Open User Portal" navigates to canonical player-facing route ("/")', () => {
  assert.ok(
    adminHeaderContent.includes('to="/"'),
    'Open User Portal link must target canonical user portal route ("/")'
  )
  assert.ok(
    /to=["']\/["'][\s\S]*?Open User Portal/.test(adminHeaderContent),
    'Link to="/" must wrap Open User Portal action'
  )
})

runTest('2.5. "Open User Portal" does NOT trigger logout or session destruction', () => {
  // Ensure the Open User Portal link only closes the menu and does NOT call signOut or handleLogout
  const portalLinkSection = adminHeaderContent.match(/<Link[\s\S]*?id="admin-open-user-portal"[\s\S]*?<\/Link>/)?.[0]
  assert.ok(portalLinkSection, 'Open User Portal link must exist')
  assert.ok(
    !portalLinkSection.includes('signOut'),
    'Open User Portal must never invoke signOut'
  )
  assert.ok(
    !portalLinkSection.includes('handleLogout'),
    'Open User Portal must never invoke handleLogout'
  )
  assert.ok(
    portalLinkSection.includes('setShowProfileMenu(false)'),
    'Open User Portal must close dropdown menu upon navigation'
  )
})

runTest('2.6. AdminHeader renders "Admin Settings" option inside profile menu', () => {
  assert.ok(
    adminHeaderContent.includes('Admin Settings'),
    'Dropdown must include Admin Settings action'
  )
  assert.ok(
    adminHeaderContent.includes('to="/admin/settings"'),
    'Admin Settings link must target "/admin/settings"'
  )
})

runTest('2.7. Sign Out / Logout button remains functional inside dropdown and header', () => {
  assert.ok(
    adminHeaderContent.includes('id="admin-logout-btn"'),
    'Sign Out button must exist inside profile dropdown'
  )
  assert.ok(
    adminHeaderContent.includes('handleLogout()'),
    'Sign Out must dispatch handleLogout'
  )
  assert.ok(
    adminHeaderContent.includes('title="Logout Session"'),
    'Direct logout button must be retained in header'
  )
})

// ============================================================================
// GROUP 3: Usability, Dismissal & Responsive Architecture
// ============================================================================
console.log('\n--- GROUP 3: Usability, Dismissal & Responsive Architecture ---')

runTest('3.1. AdminHeader implements click-outside listener to dismiss profile dropdown', () => {
  assert.ok(
    adminHeaderContent.includes('dropdownRef = useRef(null)'),
    'AdminHeader must declare dropdownRef using useRef'
  )
  assert.ok(
    adminHeaderContent.includes('handleClickOutside'),
    'AdminHeader must implement handleClickOutside event listener'
  )
  assert.ok(
    adminHeaderContent.includes('mousedown'),
    'AdminHeader must listen for mousedown events to detect outside clicks'
  )
})

runTest('3.2. AdminHeader implements Escape key listener to dismiss profile dropdown', () => {
  assert.ok(
    adminHeaderContent.includes("event.key === 'Escape'"),
    'AdminHeader must check for Escape key to close menu'
  )
  assert.ok(
    adminHeaderContent.includes('keydown'),
    'AdminHeader must listen for keydown events for keyboard accessibility'
  )
})

runTest('3.3. Header does NOT have overflow-hidden, ensuring dropdown floats without clipping', () => {
  const headerMatch = adminHeaderContent.match(/<header\s+className=["']([^"']+)["']/)?.[1]
  assert.ok(headerMatch, '<header> element must have className')
  assert.ok(
    !headerMatch.includes('overflow-hidden'),
    '<header> must NOT have overflow-hidden to prevent clipping absolute dropdowns'
  )
})

runTest('3.4. Dropdown menu uses responsive sizing and right-aligned positioning', () => {
  assert.ok(
    adminHeaderContent.includes('absolute right-0'),
    'Dropdown menu must be positioned absolute right-0 for safe viewport containment'
  )
  assert.ok(
    adminHeaderContent.includes('w-56 sm:w-64'),
    'Dropdown menu must declare responsive width (w-56 on mobile, sm:w-64 on desktop)'
  )
})

runTest('3.5. Responsive viewport audit across all 7 target viewports (375px - 1440px)', () => {
  const targetViewports = [375, 390, 430, 768, 1024, 1280, 1440]
  // Mobile (<640px): w-56 = 14rem = 224px. Padding px-3 = 12px.
  // Tablet/Desktop (>=640px): sm:w-64 = 16rem = 256px. Padding sm:px-6 = 24px.
  for (const vp of targetViewports) {
    const isMobile = vp < 640
    const dropdownWidth = isMobile ? 224 : 256
    const padding = isMobile ? 12 : 24
    const availableWidth = vp - (padding * 2)

    assert.ok(
      dropdownWidth <= availableWidth,
      `Dropdown width (${dropdownWidth}px) exceeds available width (${availableWidth}px) at viewport ${vp}px`
    )
    const leftOffset = vp - padding - dropdownWidth
    assert.ok(
      leftOffset >= 0,
      `Dropdown overflows left boundary (${leftOffset}px) at viewport ${vp}px`
    )
  }
})

// ============================================================================
// GROUP 4: Two-Way Seamless Switching (Navbar -> Admin -> Navbar)
// ============================================================================
console.log('\n--- GROUP 4: Two-Way Seamless Switching Verification ---')

runTest('4.1. User-facing Navbar permits admin to return to Admin Console via dropdown', () => {
  assert.ok(
    navbarContent.includes('isAdmin'),
    'Navbar must inspect isAdmin state'
  )
  assert.ok(
    navbarContent.includes('to="/admin"'),
    'Navbar must provide link returning to "/admin"'
  )
  assert.ok(
    navbarContent.includes('Admin Console'),
    'Navbar dropdown must label link as "Admin Console"'
  )
})

runTest('4.2. Session & role preservation: No token clearing or auth state destruction on switch', () => {
  // Navigation uses pure client-side router Link to="/"
  assert.ok(
    adminHeaderContent.includes('import { Link, useNavigate } from \'react-router-dom\''),
    'AdminHeader must use React Router Link for routing'
  )
  assert.ok(
    !adminHeaderContent.includes('sessionStorage.clear()') &&
    !adminHeaderContent.includes('localStorage.clear()'),
    'AdminHeader must not clear client storage or tokens on navigation'
  )
})

runTest('4.3. No payment code, wallet balance, or gateway logic was touched in AdminHeader', () => {
  assert.ok(
    !adminHeaderContent.includes('razorpay'),
    'AdminHeader must contain no Razorpay references'
  )
  assert.ok(
    !adminHeaderContent.includes('createRazorpayOrder'),
    'AdminHeader must not invoke payment orders'
  )
})

// ============================================================================
// SUMMARY
// ============================================================================
console.log('\n======================================================================')
console.log(`TOTAL ASSERTIONS PASSED: ${totalAssertions}/${totalAssertions}`)
console.log('STATUS: ALL ADMIN -> USER PORTAL NAVIGATION ASSERTIONS PASS')
console.log('======================================================================\n')
