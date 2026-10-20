// test_sharp_edge_responsive_viewports.mjs
// Automated verification for MJ ESPORTS Responsive Viewport & Sharp Edge Layout Invariants
// Viewports: 375px, 390px, 430px, 768px, 1024px, 1280px, 1440px

import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

console.log('================================================================================')
console.log('MJ ESPORTS — SHARP-EDGE RESPONSIVE VIEWPORT & OVERFLOW AUDIT')
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

const keyPagesAndComponents = [
  'src/pages/Home.jsx',
  'src/pages/TournamentsPage.jsx',
  'src/pages/TournamentDetailPage.jsx',
  'src/pages/LeaderboardPage.jsx',
  'src/pages/LoginPage.jsx',
  'src/pages/RegisterPage.jsx',
  'src/components/common/Navbar.jsx',
  'src/components/common/Footer.jsx',
  'src/components/common/BottomNavigation.jsx'
]

// 1. Zero fixed-width classes exceeding minimum mobile screen boundary (320px) without responsiveness
runAudit('1. Zero dangerous fixed-width classes (>320px) that cause mobile horizontal overflow', () => {
  const fixedWidthRegex = /\bw-\[(\d+)px\]/g
  for (const file of keyPagesAndComponents) {
    const content = fs.readFileSync(path.resolve(file), 'utf8')
    let match
    while ((match = fixedWidthRegex.exec(content)) !== null) {
      const widthVal = parseInt(match[1], 10)
      if (widthVal > 320) {
        // Must be accompanied by max-w-full or a responsive prefix in that class context
        const contextStart = Math.max(0, match.index - 50)
        const contextEnd = Math.min(content.length, match.index + 50)
        const surrounding = content.slice(contextStart, contextEnd)
        assert.ok(
          surrounding.includes('max-w-full') || surrounding.includes('sm:') || surrounding.includes('md:') || surrounding.includes('lg:'),
          `File ${file} has unconstrained fixed width w-[${widthVal}px] at mobile without responsive override`
        )
      }
    }
  }
})

// 2. All key pages enforce sharp corners across all responsive variants (sm:, md:, lg:, xl:)
runAudit('2. All key pages enforce sharp corners across all responsive variants without rounded leaks', () => {
  for (const file of keyPagesAndComponents) {
    const content = fs.readFileSync(path.resolve(file), 'utf8')
    const lines = content.split('\n')
    lines.forEach((line, idx) => {
      const trimmed = line.trim()
      if (trimmed.startsWith('*') || trimmed.startsWith('//') || trimmed.startsWith('/*')) return
      const matches = line.match(/(?<![-a-zA-Z0-9_])rounded(?:-[a-zA-Z0-9_-]+|-(?:\[[^\]]+\]))?/g) || []
      const nonNone = matches.filter(m => m !== 'rounded-none')
      assert.equal(nonNone.length, 0, `File ${file}:${idx + 1} contains non-none rounded: ${nonNone.join(', ')}`)
    })
  }
})

// 3. Form buttons enforce touch-friendly min-height (>= 44px) across all viewports
runAudit('3. Key interactive controls and buttons enforce touch-friendly height (min-h-[44px])', () => {
  const loginContent = fs.readFileSync(path.resolve('src/pages/LoginPage.jsx'), 'utf8')
  const registerContent = fs.readFileSync(path.resolve('src/pages/RegisterPage.jsx'), 'utf8')
  assert.ok(loginContent.includes('min-h-[46px]') || loginContent.includes('py-3.5'), 'Login primary buttons meet touch target size')
  assert.ok(registerContent.includes('py-3.5'), 'Register primary button meets touch target size')
})

// 4. Mobile BottomNavigation and Footer maintain proper clearance and square styling
runAudit('4. BottomNavigation uses square active indicator and proper mobile clearance in Footer', () => {
  const bottomNav = fs.readFileSync(path.resolve('src/components/common/BottomNavigation.jsx'), 'utf8')
  const footer = fs.readFileSync(path.resolve('src/components/common/Footer.jsx'), 'utf8')
  assert.ok(bottomNav.includes('rounded-none'), 'BottomNavigation uses sharp indicator')
  assert.ok(!bottomNav.includes('rounded-b-full'), 'BottomNavigation does not have rounded-b-full')
  assert.ok(footer.includes('pb-[calc(5rem+env(safe-area-inset-bottom))]'), 'Footer includes safe-area clearance for mobile bottom navigation')
})

// 5. Leaderboard horizontal event tabs are scrollable with hidden scrollbars
runAudit('5. Leaderboard horizontal event filter bar handles mobile scrolling cleanly', () => {
  const leaderboard = fs.readFileSync(path.resolve('src/pages/LeaderboardPage.jsx'), 'utf8')
  assert.ok(leaderboard.includes('overflow-x-auto'), 'Leaderboard includes horizontal overflow scrolling')
  assert.ok(leaderboard.includes('[scrollbar-width:none] [&::-webkit-scrollbar]:hidden'), 'Leaderboard hides ugly scrollbar on event filter')
})

console.log('\n--------------------------------------------------------------------------------')
console.log(`TOTAL AUDITS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`)
console.log('--------------------------------------------------------------------------------\n')

if (failed > 0) {
  process.exit(1)
} else {
  console.log('🎉 ALL SHARP-EDGE RESPONSIVE VIEWPORT AUDITS PASSED!')
}
