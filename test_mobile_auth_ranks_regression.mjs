// test_mobile_auth_ranks_regression.mjs
// Automated verification for MJ ESPORTS Mobile UI Consistency Fix across:
// Ranks (LeaderboardPage), Sign In (LoginPage), Create Account (RegisterPage),
// AuthLayout, MainLayout, and Footer.
// Targets viewports: 375px, 390px, 430px, 768px, 1024px, 1280px, 1440px.

import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

console.log('================================================================================')
console.log('MJ ESPORTS — MOBILE UI CONSISTENCY & VIEWPORT REGRESSION TEST')
console.log('Target viewports: 375px, 390px, 430px, 768px, 1024px, 1280px, 1440px')
console.log('================================================================================\n')

let passed = 0
let failed = 0

function runAudit(name, fn) {
  try {
    fn()
    console.log(`  ✅ [PASS] ${name}`)
    passed++
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}`)
    console.error(`     Error: ${err.message}`)
    failed++
  }
}

// -----------------------------------------------------------------------------
// 1. Footer & Spacing Layout Invariants
// -----------------------------------------------------------------------------
runAudit('1. MainLayout does not apply duplicate bottom padding on pages with Footer', () => {
  const content = fs.readFileSync(path.resolve('src/layouts/MainLayout.jsx'), 'utf8')
  // Root div must not have unconditional pb-[calc(5rem...)]
  const rootDivMatch = content.match(/<div className="([^"]+)"/)
  assert.ok(rootDivMatch, 'Root div found in MainLayout')
  assert.ok(
    !rootDivMatch[1].includes('pb-[calc(5rem'),
    'MainLayout root div must not apply unconditional mobile bottom padding'
  )
  // Main tag should only apply pb on profile page where footer is hidden
  assert.ok(
    content.includes('isProfilePage ?'),
    'MainLayout conditionally applies pb only when footer is hidden'
  )
})

runAudit('2. Footer applies standardized bottom clearance for mobile BottomNavigation', () => {
  const content = fs.readFileSync(path.resolve('src/components/common/Footer.jsx'), 'utf8')
  assert.ok(
    content.includes('pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-6'),
    'Footer applies exact safe-area mobile bottom clearance without excessive dead space'
  )
  assert.ok(content.includes('bg-[#000000]'), 'Footer background matches deep black token')
  assert.ok(content.includes('border-t border-[#1B1B1F]'), 'Footer uses subtle dark border')
  assert.ok(content.includes('MJ <span className="text-[#FFB900]">ESPORTS</span>'), 'Footer branding uses amber token')
  assert.ok(content.includes('text-[#FF6200]'), 'Footer subtitle uses fire-orange token')
  assert.ok(content.includes('to="/privacy"'), 'Footer links to Privacy Policy')
  assert.ok(content.includes('to="/terms"'), 'Footer links to Terms of Service')
})

// -----------------------------------------------------------------------------
// 2. Header & AuthLayout Invariants
// -----------------------------------------------------------------------------
runAudit('3. AuthLayout header standardizes height and branding with Public Navbar', () => {
  const content = fs.readFileSync(path.resolve('src/layouts/AuthLayout.jsx'), 'utf8')
  assert.ok(
    content.includes('h-16 sm:h-20'),
    'AuthLayout header standardizes height to h-16 sm:h-20 matching Navbar'
  )
  assert.ok(
    content.includes('max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'),
    'AuthLayout header uses standard responsive container max-w-7xl'
  )
  assert.ok(
    content.includes('Free Fire MAX Arena'),
    'AuthLayout header includes two-line brand tagline'
  )
  assert.ok(
    content.includes('mailto:support.mjesports@gmail.com'),
    'AuthLayout includes direct Support link'
  )
})

runAudit('4. AuthLayout main and footer containers prevent mobile overflow and dead space', () => {
  const content = fs.readFileSync(path.resolve('src/layouts/AuthLayout.jsx'), 'utf8')
  assert.ok(
    content.includes('flex-1 flex flex-col items-center justify-center w-full min-w-0 overflow-x-hidden px-4 py-6 sm:py-10'),
    'AuthLayout main container is properly constrained, centers cards, and prevents overflow'
  )
  assert.ok(
    content.includes('to="/privacy"') && content.includes('to="/terms"'),
    'AuthLayout footer contains valid legal links'
  )
})

// -----------------------------------------------------------------------------
// 3. LoginPage & RegisterPage Card Consistency
// -----------------------------------------------------------------------------
runAudit('5. LoginPage and RegisterPage cards share identical responsive width and margin rules', () => {
  const loginContent = fs.readFileSync(path.resolve('src/pages/LoginPage.jsx'), 'utf8')
  const registerContent = fs.readFileSync(path.resolve('src/pages/RegisterPage.jsx'), 'utf8')

  const expectedCardClasses = 'w-full max-w-md md:max-w-4xl bg-[#111318] border border-[#2A2A30] rounded-none overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.85)] flex flex-col md:flex-row relative min-w-0'

  assert.ok(loginContent.includes(expectedCardClasses), 'LoginPage card uses standardized responsive classes')
  assert.ok(registerContent.includes(expectedCardClasses), 'RegisterPage card uses identical standardized responsive classes')
})

runAudit('6. LoginPage and RegisterPage forms use min-w-0 and identical padding on right column', () => {
  const loginContent = fs.readFileSync(path.resolve('src/pages/LoginPage.jsx'), 'utf8')
  const registerContent = fs.readFileSync(path.resolve('src/pages/RegisterPage.jsx'), 'utf8')

  const expectedColumn = 'w-full md:w-[54%] p-5 sm:p-8 lg:p-10 flex flex-col justify-between bg-[#111318] min-w-0'

  assert.ok(loginContent.includes(expectedColumn), 'LoginPage right column matches responsive padding and min-w-0')
  assert.ok(registerContent.includes(expectedColumn), 'RegisterPage right column matches responsive padding and min-w-0')
})

runAudit('7. Zero fixed-width overflows (>320px) in Auth and Ranks pages', () => {
  const targetFiles = [
    'src/pages/LoginPage.jsx',
    'src/pages/RegisterPage.jsx',
    'src/pages/LeaderboardPage.jsx',
    'src/layouts/AuthLayout.jsx',
    'src/layouts/MainLayout.jsx',
  ]
  const fixedWidthRegex = /\bw-\[(\d+)px\]/g
  for (const file of targetFiles) {
    const content = fs.readFileSync(path.resolve(file), 'utf8')
    let match
    while ((match = fixedWidthRegex.exec(content)) !== null) {
      const widthVal = parseInt(match[1], 10)
      assert.ok(
        widthVal < 320,
        `File ${file} contains fixed width w-[${widthVal}px] exceeding mobile boundary (320px)`
      )
    }
  }
})

runAudit('8. Form buttons enforce touch-friendly height and amber theme styling', () => {
  const loginContent = fs.readFileSync(path.resolve('src/pages/LoginPage.jsx'), 'utf8')
  const registerContent = fs.readFileSync(path.resolve('src/pages/RegisterPage.jsx'), 'utf8')

  assert.ok(loginContent.includes('bg-[#FFB900]'), 'LoginPage primary submit button uses amber token')
  assert.ok(registerContent.includes('bg-[#FFB900]'), 'RegisterPage primary submit button uses amber token')
  assert.ok(loginContent.includes('size="lg"'), 'LoginPage button uses size lg for touch target')
  assert.ok(registerContent.includes('size="lg"'), 'RegisterPage button uses size lg for touch target')
  assert.ok(loginContent.includes('py-3.5'), 'LoginPage button py-3.5 provides >= 44px touch height')
  assert.ok(registerContent.includes('py-3.5'), 'RegisterPage button py-3.5 provides >= 44px touch height')
})

// -----------------------------------------------------------------------------
// 4. LeaderboardPage (Ranks) Layout & Spacing
// -----------------------------------------------------------------------------
runAudit('9. LeaderboardPage removes excessive vertical padding above Footer', () => {
  const content = fs.readFileSync(path.resolve('src/pages/LeaderboardPage.jsx'), 'utf8')
  // Should not have pb-28 or pb-32
  assert.ok(!content.includes('pb-28'), 'LeaderboardPage must not contain pb-28')
  assert.ok(!content.includes('pb-32'), 'LeaderboardPage must not contain pb-32')
  // Should have compact pb-6 sm:pb-8
  assert.ok(
    content.includes('pb-6 sm:pb-8'),
    'LeaderboardPage uses compact pb-6 sm:pb-8 padding'
  )
})

runAudit('10. LeaderboardPage hides ugly native scrollbar on horizontal event filter', () => {
  const content = fs.readFileSync(path.resolve('src/pages/LeaderboardPage.jsx'), 'utf8')
  assert.ok(
    content.includes('[scrollbar-width:none] [&::-webkit-scrollbar]:hidden'),
    'Tournament filter bar has modern invisible scrollbar utility'
  )
})

runAudit('11. LeaderboardPage cards adhere to Free Fire MAX theme tokens', () => {
  const content = fs.readFileSync(path.resolve('src/pages/LeaderboardPage.jsx'), 'utf8')
  assert.ok(content.includes('bg-[#111318]'), 'Card backgrounds use #111318')
  assert.ok(content.includes('border-[#2A2A30]'), 'Card borders use #2A2A30')
  assert.ok(content.includes('text-[#FFB900]'), 'Rank 1 accents use amber #FFB900')
  assert.ok(content.includes('text-[#FF6200]'), 'Kills and Rank 3 accents use fire orange #FF6200')
  assert.ok(content.includes('min-h-[44px]'), 'Download Full CSV button enforces touch-friendly min-h-[44px]')
})

// -----------------------------------------------------------------------------
// Summary
// -----------------------------------------------------------------------------
console.log('\n--------------------------------------------------------------------------------')
console.log(`TOTAL AUDITS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`)
console.log('--------------------------------------------------------------------------------\n')

if (failed > 0) {
  process.exit(1)
} else {
  console.log('🎉 ALL MOBILE UI CONSISTENCY AUDITS PASSED!')
}
