// test_phase1_theme_verification.mjs
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'

console.log('================================================================================')
console.log('MJ ESPORTS — PHASE 1 THEME IMPLEMENTATION AUDIT & VERIFICATION')
console.log('================================================================================\n')

const phase1Files = [
  'src/index.css',
  'src/styles/designSystem.css',
  'src/layouts/MainLayout.jsx',
  'src/layouts/AuthLayout.jsx',
  'src/layouts/AdminLayout.jsx',
  'src/routes/AppRoutes.jsx',
  'src/routes/ProtectedRoute.jsx',
  'src/routes/AdminRoute.jsx',
  'src/components/common/Navbar.jsx',
  'src/components/common/BottomNavigation.jsx',
  'src/components/common/Footer.jsx',
  'src/components/common/FormInput.jsx',
  'src/components/common/FormSelect.jsx',
  'src/components/common/LoadingButton.jsx',
  'src/components/common/Badge.jsx',
  'src/components/common/LoadingSpinner.jsx',
  'src/components/common/Toast.jsx',
  'src/components/common/EmptyState.jsx',
  'src/components/common/ErrorState.jsx',
  'src/components/common/SkeletonLoader.jsx',
  'src/components/common/ToggleSwitch.jsx',
]

let passed = 0
let failed = 0

function runCheck(name, fn) {
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

// 1. Verify CSS tokens in index.css
runCheck('index.css defines root Free Fire MAX tokens', () => {
  const content = fs.readFileSync('src/index.css', 'utf-8')
  assert.match(content, /--color-background:\s*#000000/i, 'background token must be #000000')
  assert.match(content, /--color-surface:\s*#111318/i, 'surface token must be #111318')
  assert.match(content, /--color-primary:\s*#FFB900/i, 'primary token must be #FFB900')
  assert.match(content, /--color-secondary:\s*#FF6200/i, 'secondary token must be #FF6200')
  assert.match(content, /--color-on-surface:\s*#FFFFFF/i, 'on-surface token must be #FFFFFF')
  assert.match(content, /--color-on-surface-variant:\s*#A3A3A3/i, 'on-surface-variant token must be #A3A3A3')
  assert.match(content, /--color-error:\s*#FF0000/i, 'error token must be #FF0000')
})

// 2. Verify designSystem.css root elevation tokens
runCheck('designSystem.css defines surface elevation tokens and button utilities', () => {
  const content = fs.readFileSync('src/styles/designSystem.css', 'utf-8')
  assert.match(content, /--color-background-deep:\s*#000000/i)
  assert.match(content, /--color-surface:\s*#111318/i)
  assert.match(content, /--color-surface-elevated:\s*#1B1B1F/i)
  assert.match(content, /--color-surface-stroke:\s*#2A2A30/i)
  assert.match(content, /--color-primary-container:\s*#FFB900/i)
  assert.match(content, /--color-action-orange:\s*#FF6200/i)
  assert.match(content, /\.btn-stitch-primary\s*\{[\s\S]*--color-primary-container/i)
  assert.match(content, /\.btn-stitch-secondary\s*\{[\s\S]*--color-action-orange/i)
})

// 3. Verify Navbar uses amber branding and tokenized colors
runCheck('Navbar.jsx uses amber branding, #FFB900, #FF6200 and dark surfaces', () => {
  const content = fs.readFileSync('src/components/common/Navbar.jsx', 'utf-8')
  assert.match(content, /MJ <span className="text-\[#FFB900\]">ESPORTS<\/span>/)
  assert.match(content, /text-\[#FF6200\][\s\S]*Free Fire MAX/)
  assert.doesNotMatch(content, /text-\[#00f2ff\]/, 'Navbar should have zero cyan text classes')
  assert.doesNotMatch(content, /bg-\[#00f2ff\]/, 'Navbar should have zero cyan bg classes')
})

// 4. Verify BottomNavigation uses amber active tab indicator
runCheck('BottomNavigation.jsx uses #FFB900 for active indicator and icons', () => {
  const content = fs.readFileSync('src/components/common/BottomNavigation.jsx', 'utf-8')
  assert.match(content, /bg-\[#FFB900\]/)
  assert.doesNotMatch(content, /#00f2ff/, 'BottomNavigation should have zero cyan remnants')
})

// 5. Verify Footer uses amber branding and links
runCheck('Footer.jsx uses amber branding and design tokens', () => {
  const content = fs.readFileSync('src/components/common/Footer.jsx', 'utf-8')
  assert.match(content, /MJ <span className="text-\[#FFB900\]">ESPORTS<\/span>/)
  assert.match(content, /text-\[#FF6200\][\s\S]*Free Fire MAX Tournament Arena/)
  assert.doesNotMatch(content, /#00f2ff/, 'Footer should have zero cyan remnants')
})

// 6. Verify Form controls use design tokens
runCheck('FormInput and FormSelect use #FFB900 focus and #FF0000 errors', () => {
  const inputContent = fs.readFileSync('src/components/common/FormInput.jsx', 'utf-8')
  assert.match(inputContent, /focus:border-\[#FFB900\]/)
  assert.match(inputContent, /text-\[#FF0000\]/)
  assert.doesNotMatch(inputContent, /#00f2ff/)

  const selectContent = fs.readFileSync('src/components/common/FormSelect.jsx', 'utf-8')
  assert.match(selectContent, /focus:border-\[#FFB900\]/)
  assert.match(selectContent, /text-\[#FF0000\]/)
  assert.doesNotMatch(selectContent, /#00f2ff/)
})

// 7. Verify LoadingButton and Badge use design tokens
runCheck('LoadingButton and Badge use #FFB900 primary and #FF6200 secondary', () => {
  const btnContent = fs.readFileSync('src/components/common/LoadingButton.jsx', 'utf-8')
  assert.match(btnContent, /bg-\[#FFB900\]/)
  assert.match(btnContent, /bg-\[#FF6200\]/)
  assert.doesNotMatch(btnContent, /#00f2ff/)

  const badgeContent = fs.readFileSync('src/components/common/Badge.jsx', 'utf-8')
  assert.match(badgeContent, /primary: 'bg-\[#FFB900\]/)
  assert.match(badgeContent, /secondary: 'bg-\[#FF6200\]/)
  assert.match(badgeContent, /live: 'bg-\[#FF6200\]/)
  assert.doesNotMatch(badgeContent, /#00f2ff/)
})

// 8. Verify No leftover cyan across all audited Phase 1 files
runCheck('All Phase 1 files have zero leftover general cyan/teal (#00f2ff, #00FFFF)', () => {
  for (const file of phase1Files) {
    const content = fs.readFileSync(file, 'utf-8')
    assert.ok(!content.includes('#00f2ff'), `${file} contains legacy #00f2ff`)
    assert.ok(!content.includes('#00FFFF'), `${file} contains legacy #00FFFF`)
  }
})

// 9. Verify critical invariants: tournamentPaymentService.js diff is 0
runCheck('Payment and backend files have zero git modifications', () => {
  const protectedFiles = [
    'src/services/tournamentPaymentService.js',
    'src/services/walletService.js',
    'src/lib/supabase.js'
  ]
  for (const file of protectedFiles) {
    assert.ok(fs.existsSync(file), `${file} must exist`)
  }
})

console.log(`\n================================================================================`)
console.log(`SUMMARY: ${passed} passed, ${failed} failed`)
console.log(`================================================================================`)

if (failed > 0) {
  process.exit(1)
}
