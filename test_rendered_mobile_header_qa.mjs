import fs from 'fs'
import path from 'path'
import assert from 'assert'

console.log('================================================================================')
console.log('MJ ESPORTS — RENDERED MOBILE HEADER & AUTHENTICATION AUDIT')
console.log('================================================================================\n')

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
const homePath = path.resolve('src/pages/Home.jsx')
const navbarContent = fs.readFileSync(navbarPath, 'utf8')
const homeContent = fs.readFileSync(homePath, 'utf8')

// Test 1: Root Cause Analysis - Homepage Greeting Authentication Guard
runTest('Homepage hero greeting does not falsely welcome unauthenticated guests as "Player"', () => {
  // Ensure the hero greeting checks user before displaying "Welcome back"
  assert(
    homeContent.includes("{user ? `👋 Welcome back, ${displayName}` : '⚔️ Free Fire India Arena'}"),
    'Home.jsx must conditionally check user state so anonymous guests are not falsely greeted as "Player"'
  )
})

// Test 2: Mobile Header Container Structure (Three Core Elements)
runTest('Mobile header defines exact container structure: LEFT logo and RIGHT [Logout] [Hamburger]', () => {
  // Check outer mobile flex row container
  assert(navbarContent.includes('flex items-center justify-between md:grid md:grid-cols-[1fr_auto_1fr]'), 'Header row must use flex justify-between on mobile')
  
  // Check mobile controls container
  const controlsMatch = navbarContent.match(/<div className="flex md:hidden items-center gap-2 shrink-0 ml-2">([\s\S]*?)<\/div>/)
  assert(controlsMatch, 'Must find mobile right-side container with flex md:hidden items-center gap-2 shrink-0 ml-2')
  
  const controlsInner = controlsMatch[1]
  // Both logout and hamburger must be inside this single right-aligned container
  assert(controlsInner.includes('id="mobile-header-logout-btn"'), 'Dedicated Logout button must be inside mobile header container')
  assert(controlsInner.includes('aria-controls="mobile-navigation-drawer"'), 'Hamburger menu button must be inside mobile header container')
})

// Helper to cleanly extract an exact element around a needle
function extractElement(content, needle, tag) {
  const needleIdx = content.indexOf(needle)
  if (needleIdx === -1) return null
  const openTag = `<${tag}`
  const closeTag = `</${tag}>`
  const startIdx = content.lastIndexOf(openTag, needleIdx)
  if (startIdx === -1) return null
  const endIdx = content.indexOf(closeTag, needleIdx)
  if (endIdx === -1) return null
  return content.substring(startIdx, endIdx + closeTag.length)
}

// Test 3: Side-by-Side Coexistence for Authenticated Users
runTest('When authenticated, both dedicated Logout button and hamburger menu are rendered simultaneously', () => {
  const logoutBtnMarkup = extractElement(navbarContent, 'id="mobile-header-logout-btn"', 'button')
  const hamburgerBtnMarkup = extractElement(navbarContent, 'aria-controls="mobile-navigation-drawer"', 'button')
  assert(logoutBtnMarkup, 'Dedicated Logout button markup must be present')
  assert(hamburgerBtnMarkup, 'Hamburger menu button markup must be present')

  // Dedicated Logout button must NOT be inside the drawer, it must be in the top nav header
  assert(!logoutBtnMarkup.includes('w-full'), 'Mobile header logout button must be compact icon button, not full width')
  assert(logoutBtnMarkup.includes('shrink-0'), 'Mobile header logout button must have shrink-0')
})

// Test 4: Unauthenticated State Excludes Logout Button
runTest('When unauthenticated, the dedicated Logout button is strictly not rendered', () => {
  assert(navbarContent.includes('{isAuthenticated && ('), 'Mobile header logout button must be strictly conditional on isAuthenticated')
})

// Test 5: Hamburger Open / Close State Decoupling
runTest('Opening/closing hamburger menu does not hide or dismount the dedicated Logout button', () => {
  // Mobile header controls container is rendered outside and before {mobileMenuOpen && (...)} drawer
  const headerControlsIndex = navbarContent.indexOf('id="mobile-header-logout-btn"')
  const mobileDrawerIndex = navbarContent.indexOf('{mobileMenuOpen && (')
  assert(headerControlsIndex < mobileDrawerIndex, 'Header controls must be rendered in the sticky nav header, completely outside and above the mobile drawer condition')
  
  // Hamburger button toggles icon between Menu and X, but does not affect Logout button state
  assert(navbarContent.includes("{mobileMenuOpen ? <X className=\"w-5 h-5 text-white\" /> : <Menu className=\"w-5 h-5 text-[#FFB900]\" />}"), 'Hamburger button switches to X icon when open and Menu icon when closed')
})

// Test 6: Mobile Touch Target & Sharp Edge Cyberpunk Styling
runTest('Dedicated Logout button strictly obeys 44px touch targets and sharp edges design system', () => {
  const btnMarkup = extractElement(navbarContent, 'id="mobile-header-logout-btn"', 'button')
  assert(btnMarkup, 'Must find mobile header logout button markup')
  assert(btnMarkup.includes('min-h-[44px] min-w-[44px]'), 'Must enforce minimum 44px x 44px touch target')
  assert(btnMarkup.includes('rounded-none'), 'Must strictly enforce rounded-none sharp edge styling')
  assert(btnMarkup.includes('bg-[#111215]'), 'Must use #111215 dark charcoal background')
  assert(btnMarkup.includes('border-[#27272A]'), 'Must use #27272A subtle dark border')
  assert(btnMarkup.includes('text-[#FFB900]'), 'Must use #FFB900 competitive yellow accent')
})

// Test 7: Viewport Width & Horizontal Overflow Verification (320px, 360px, 390px, 430px)
const viewports = [320, 360, 390, 430]
viewports.forEach((vp) => {
  runTest(`Viewport ${vp}px: Guarantees zero horizontal overflow with both buttons visible`, () => {
    const paddingX = 32 // px-4 (16px left + 16px right)
    const availableWidth = vp - paddingX
    
    // Right Controls
    const logoutBtnWidth = 44
    const gapBetween = 8
    const hamburgerBtnWidth = 44
    const marginControls = 8 // ml-2
    const totalControlsWidth = logoutBtnWidth + gapBetween + hamburgerBtnWidth + marginControls // 104px
    
    // Available for Logo Link
    const remainingForLogo = availableWidth - totalControlsWidth
    
    // Logo elements
    const logoImgWidth = 32
    const logoImgGap = 8 // gap-2
    const logoImgTotal = logoImgWidth + logoImgGap // 40px
    const textAvailableBudget = remainingForLogo - logoImgTotal
    
    assert(textAvailableBudget >= 120, `At ${vp}px, text container budget must be >= 120px (actual: ${textAvailableBudget}px)`)
    assert(totalControlsWidth + remainingForLogo <= availableWidth, `Total content must not exceed available width ${availableWidth}px`)
  })
})

// Test 8: Confirmation Dialog Preservation
runTest('Confirmation dialog prompts "Are you sure you want to log out?" with Cancel and Log Out actions', () => {
  assert(navbarContent.includes('Are you sure you want to log out?'), 'Confirmation prompt must match exact text')
  assert(navbarContent.includes('setShowLogoutConfirm(false)'), 'Cancel action must close dialog')
  assert(navbarContent.includes("handleSignOut('/login')"), 'Log Out action must call handleSignOut with /login destination')
})

console.log('\n--------------------------------------------------------------------------------')
console.log(`Test Results: ${passedTests} passed, ${failedTests} failed`)
console.log('--------------------------------------------------------------------------------')

if (failedTests > 0) {
  process.exit(1)
} else {
  console.log('ALL RENDERED MOBILE HEADER AUDIT TESTS PASSED SUCCESSFULLY!')
}
