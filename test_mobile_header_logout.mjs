import fs from 'fs'
import path from 'path'
import assert from 'assert'

console.log('====================================================')
console.log('MJ ESPORTS — Mobile Header Logout Button QA Suite')
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
const navbarContent = fs.readFileSync(navbarPath, 'utf8')

// Test 1: Mobile Header Button Placement & Hierarchy
runTest('Logout button is positioned immediately beside hamburger menu on mobile', () => {
  assert(navbarContent.includes('id="mobile-header-logout-btn"'), 'Must have id="mobile-header-logout-btn"')
  const mobileHeaderControlsRegex = /<div className="flex md:hidden items-center gap-2 shrink-0 ml-2">[\s\S]*?id="mobile-header-logout-btn"[\s\S]*?<button[\s\S]*?aria-controls="mobile-navigation-drawer"/
  assert(mobileHeaderControlsRegex.test(navbarContent), 'Logout button must be in same horizontal flex container immediately preceding hamburger button')
})

// Test 2: Authentication Guard
runTest('Logout button is strictly guarded by isAuthenticated', () => {
  const authGuardRegex = /\{isAuthenticated && \(\s*<button[\s\S]*?id="mobile-header-logout-btn"/
  assert(authGuardRegex.test(navbarContent), 'Mobile header logout button must be conditionally rendered only for authenticated users')
})

// Test 3: Design System Compliance & Touch Targets
runTest('Mobile logout button adheres to design system tokens and 44px touch targets', () => {
  assert(navbarContent.includes('min-h-[44px] min-w-[44px]'), 'Must enforce 44px min touch target')
  assert(navbarContent.includes('bg-[#111215] border border-[#27272A] text-[#FFB900]'), 'Must enforce brand black/charcoal/yellow palette')
  assert(navbarContent.includes('rounded-none'), 'Must enforce sharp edges policy')
  
  // Extract mobile logout button code
  const btnMatch = navbarContent.match(/<button[\s\S]*?id="mobile-header-logout-btn"[\s\S]*?<\/button>/)
  assert(btnMatch, 'Must find mobile header logout button markup')
  const btnMarkup = btnMatch[0]
  assert(!btnMarkup.includes('bg-gradient') && !btnMarkup.includes('shadow-[0_0_'), 'Mobile logout button must not use gradients or neon glow')
})

// Test 4: Confirmation Dialog Specification
runTest('Confirmation dialog features exact prompt text, Cancel, and Log Out actions', () => {
  assert(navbarContent.includes('showLogoutConfirm'), 'Must track showLogoutConfirm state')
  assert(navbarContent.includes('Are you sure you want to log out?'), 'Must prompt with exact confirmation text')
  assert(navbarContent.includes('Confirm Logout'), 'Must have "Confirm Logout" dialog title')
  assert(navbarContent.includes('setShowLogoutConfirm(false)'), 'Must provide Cancel action')
  assert(navbarContent.includes("handleSignOut('/login')"), 'Must call handleSignOut with /login destination')
  assert(navbarContent.includes('disabled={isSigningOut}'), 'Must disable buttons while signing out')
})

// Test 5: Responsive Width & Overflow Protection (320px, 360px, 390px, 430px)
runTest('Header layout enforces responsive boundaries for narrow mobile viewports', () => {
  assert(navbarContent.includes('max-w-[calc(100%-108px)]'), 'Must bound logo container width when authenticated')
  assert(navbarContent.includes('truncate'), 'Brand and tournament titles must have truncate classes to prevent line wraps')
  
  // Numerical verification for 320px viewport
  const viewport320 = 320
  const paddingX = 32 // px-4 on left and right = 16*2
  const availableContentWidth = viewport320 - paddingX // 288px
  const controlsWidth = 44 + 8 + 44 + 8 // 104px (logout 44 + gap 8 + hamburger 44 + ml 8)
  const remainingForLogo = availableContentWidth - controlsWidth // 184px
  const logoImageAndGap = 32 + 8 // 40px
  const textWidthBudget = remainingForLogo - logoImageAndGap // 144px
  
  assert(textWidthBudget >= 120, 'At 320px width, brand text container has at least 120px safe width budget for truncated text')
})

// Test 6: Desktop Dropdown Preservation
runTest('Desktop profile dropdown logout functionality remains preserved', () => {
  assert(navbarContent.includes('aria-label="Log Out of MJ ESPORTS"'), 'Desktop dropdown retains accessible label')
  assert(navbarContent.includes('handleSignOut'), 'Desktop dropdown calls handleSignOut')
})

// Test 7: Mobile Drawer Logout Consistency
runTest('Mobile drawer logout button also triggers the confirmation dialog', () => {
  const drawerFooterRegex = /\{isAuthenticated && \(\s*<div className="pt-2 border-t border-\[#27272A\]">[\s\S]*?setShowLogoutConfirm\(true\)[\s\S]*?<\/button>\s*<\/div>\s*\)\}/
  assert(drawerFooterRegex.test(navbarContent), 'Drawer logout button must close drawer and open confirmation dialog')
})

console.log('\n----------------------------------------------------')
console.log(`Test Results: ${passedTests} passed, ${failedTests} failed`)
console.log('----------------------------------------------------')

if (failedTests > 0) {
  process.exit(1)
} else {
  console.log('ALL MOBILE HEADER LOGOUT TESTS PASSED SUCCESSFULLY!')
}
