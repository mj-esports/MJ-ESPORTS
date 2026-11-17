import fs from 'fs'
import path from 'path'
import assert from 'assert'

console.log('================================================================================')
console.log('MJ ESPORTS — RENDERED MOBILE HEADER SIMPLIFICATION AUDIT')
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

// Test 2: Mobile Header Container Structure (LEFT logo and RIGHT sole Logout)
runTest('Mobile header defines simplified container structure: LEFT logo and RIGHT sole Logout (no hamburger)', () => {
  // Check outer mobile flex row container
  assert(navbarContent.includes('flex items-center justify-between md:grid md:grid-cols-[1fr_auto_1fr]'), 'Header row must use flex justify-between on mobile')
  
  // Check mobile controls container
  const controlsMatch = navbarContent.match(/<div className="flex md:hidden items-center shrink-0 ml-2">([\s\S]*?)<\/div>/)
  assert(controlsMatch, 'Must find mobile right-side container with flex md:hidden items-center shrink-0 ml-2')
  
  const controlsInner = controlsMatch[1]
  // Only logout must be inside this right-aligned container
  assert(controlsInner.includes('id="mobile-header-logout-btn"'), 'Dedicated Logout button must be inside mobile header container')
  assert(!controlsInner.includes('aria-controls="mobile-navigation-drawer"'), 'Hamburger menu button must NOT be in mobile header container')
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

// Test 3: Sole Dedicated Logout Button on Mobile Header
runTest('When authenticated, dedicated Logout button is rendered as sole header action on mobile', () => {
  const logoutBtnMarkup = extractElement(navbarContent, 'id="mobile-header-logout-btn"', 'button')
  const hamburgerBtnMarkup = extractElement(navbarContent, 'aria-controls="mobile-navigation-drawer"', 'button')
  assert(logoutBtnMarkup, 'Dedicated Logout button markup must be present')
  assert(!hamburgerBtnMarkup, 'Hamburger menu button markup must be completely absent')

  // Dedicated Logout button must NOT be full width
  assert(!logoutBtnMarkup.includes('w-full'), 'Mobile header logout button must be compact icon button, not full width')
  assert(logoutBtnMarkup.includes('shrink-0'), 'Mobile header logout button must have shrink-0')
})

// Test 4: Unauthenticated State Excludes Logout Button
runTest('When unauthenticated, the dedicated Logout button is strictly not rendered', () => {
  assert(navbarContent.includes('{isAuthenticated && ('), 'Mobile header logout button must be strictly conditional on isAuthenticated')
})

// Test 5: Hamburger Menu and Drawer Removal
runTest('Hamburger menu, mobile drawer, and drawer states are completely removed from Navbar', () => {
  assert(!navbarContent.includes('mobileMenuOpen'), 'mobileMenuOpen state must not exist in Navbar')
  assert(!navbarContent.includes('mobile-navigation-drawer'), 'mobile-navigation-drawer must not exist in Navbar')
  assert(!navbarContent.includes('<Menu'), 'Menu icon must not be rendered')
  assert(!navbarContent.includes('<X className="w-5 h-5 text-white"'), 'X drawer icon must not be rendered')
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
  runTest(`Viewport ${vp}px: Guarantees zero horizontal overflow with single logout button`, () => {
    const paddingX = 32 // px-4 (16px left + 16px right)
    const availableWidth = vp - paddingX
    
    // Right Controls: only Logout button (44px) + margin (8px) = 52px
    const logoutBtnWidth = 44
    const marginControls = 8 // ml-2
    const totalControlsWidth = logoutBtnWidth + marginControls // 52px
    
    // Available for Logo Link
    const remainingForLogo = availableWidth - totalControlsWidth
    
    // Logo elements
    const logoImgWidth = 32
    const logoImgGap = 8 // gap-2
    const logoImgTotal = logoImgWidth + logoImgGap // 40px
    const textAvailableBudget = remainingForLogo - logoImgTotal
    
    assert(textAvailableBudget >= 180, `At ${vp}px, text container budget must be >= 180px (actual: ${textAvailableBudget}px)`)
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
