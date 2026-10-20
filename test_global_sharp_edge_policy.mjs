// test_global_sharp_edge_policy.mjs
// Automated verification for MJ ESPORTS Global Sharp-Edge UI Refactor
// Asserts that every UI element across the application enforces 0px border-radius consistently
// while preserving third-party widgets, official icon/logo shapes, and esports visual identity.

import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

console.log('================================================================================')
console.log('MJ ESPORTS — GLOBAL SHARP-EDGE UI REFACTOR AUDIT')
console.log('Policy: Universal 0px border-radius across all components, tokens, and viewports')
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
// 1. CSS & Token System Invariants
// -----------------------------------------------------------------------------
runAudit('1. src/index.css defines all Tailwind v4 radius tokens as 0px under @theme', () => {
  const content = fs.readFileSync(path.resolve('src/index.css'), 'utf8')
  assert.ok(content.includes('--radius: 0px;'), '--radius must be 0px')
  assert.ok(content.includes('--radius-xs: 0px;'), '--radius-xs must be 0px')
  assert.ok(content.includes('--radius-sm: 0px;'), '--radius-sm must be 0px')
  assert.ok(content.includes('--radius-md: 0px;'), '--radius-md must be 0px')
  assert.ok(content.includes('--radius-lg: 0px;'), '--radius-lg must be 0px')
  assert.ok(content.includes('--radius-xl: 0px;'), '--radius-xl must be 0px')
  assert.ok(content.includes('--radius-2xl: 0px;'), '--radius-2xl must be 0px')
  assert.ok(content.includes('--radius-3xl: 0px;'), '--radius-3xl must be 0px')
  assert.ok(content.includes('--radius-4xl: 0px;'), '--radius-4xl must be 0px')
  assert.ok(content.includes('--radius-full: 0px;'), '--radius-full must be 0px')
})

runAudit('2. src/index.css enforces targeted control resets without blunt third-party-breaking overrides', () => {
  const content = fs.readFileSync(path.resolve('src/index.css'), 'utf8').replace(/\r\n/g, '\n')
  assert.ok(
    content.includes('button,\ninput,\nselect,\ntextarea,'),
    'index.css must enforce 0px border-radius on UI controls'
  )
  assert.ok(
    !content.includes('*, \n*::before,\n*::after {\n  border-radius: 0px !important;'),
    'index.css must not use blunt universal override that breaks third-party iframes/icons'
  )
  assert.ok(
    content.includes('::-webkit-scrollbar-thumb'),
    'index.css custom scrollbar thumb rule must exist'
  )
})

runAudit('3. src/styles/designSystem.css defines all design tokens as 0px radius and resets surface classes', () => {
  const content = fs.readFileSync(path.resolve('src/styles/designSystem.css'), 'utf8')
  assert.ok(content.includes('--radius-xs: 0px;'), '--radius-xs must be 0px')
  assert.ok(content.includes('--radius-sm: 0px;'), '--radius-sm must be 0px')
  assert.ok(content.includes('--radius-md: 0px;'), '--radius-md must be 0px')
  assert.ok(content.includes('--radius-lg: 0px;'), '--radius-lg must be 0px')
  assert.ok(content.includes('--radius-xl: 0px;'), '--radius-xl must be 0px')
  assert.ok(content.includes('--radius-2xl: 0px;'), '--radius-2xl must be 0px')
  assert.ok(content.includes('--radius-full: 0px;'), '--radius-full must be 0px')
  assert.ok(
    content.includes('.surface-card,'),
    'designSystem.css must have targeted surface reset'
  )
})

runAudit('4. src/styles/index.css links to src/index.css so main app bundle receives sharp policy', () => {
  const content = fs.readFileSync(path.resolve('src/styles/index.css'), 'utf8')
  assert.ok(
    content.includes('@import "../index.css";'),
    'styles/index.css must import index.css'
  )
})

runAudit('5. src/App.css contains zero non-zero border-radius values', () => {
  const content = fs.readFileSync(path.resolve('src/App.css'), 'utf8')
  const nonZeroRadiusRegex = /border-radius:\s*([1-9]\d*px|[0-9.]+r?em)/i
  assert.ok(
    !nonZeroRadiusRegex.test(content),
    'App.css must not contain non-zero border-radius declarations'
  )
})

// -----------------------------------------------------------------------------
// 2. Shared Common Components
// -----------------------------------------------------------------------------
runAudit('6. LoadingButton.jsx size styles use rounded-none', () => {
  const content = fs.readFileSync(path.resolve('src/components/common/LoadingButton.jsx'), 'utf8')
  assert.ok(content.includes("sm: 'px-3 py-1.5 text-xs min-h-[36px] rounded-none font-headline'"))
  assert.ok(content.includes("md: 'px-4 py-2.5 text-xs min-h-[44px] rounded-none font-headline'"))
  assert.ok(content.includes("lg: 'px-6 py-3.5 text-sm min-h-[48px] rounded-none font-headline'"))
})

runAudit('7. FormInput.jsx and FormSelect.jsx use rounded-none for inputs and wrappers', () => {
  const inputContent = fs.readFileSync(path.resolve('src/components/common/FormInput.jsx'), 'utf8')
  const selectContent = fs.readFileSync(path.resolve('src/components/common/FormSelect.jsx'), 'utf8')
  assert.ok(inputContent.includes('rounded-none shadow-sm flex items-stretch'))
  assert.ok(inputContent.includes('rounded-none bg-[#111318] border'))
  assert.ok(selectContent.includes('relative rounded-none shadow-sm'))
  assert.ok(selectContent.includes('rounded-none text-sm text-[#FFFFFF] focus:outline-none'))
})

runAudit('8. Badge.jsx, Toast.jsx, and ToggleSwitch.jsx use rounded-none', () => {
  const badgeContent = fs.readFileSync(path.resolve('src/components/common/Badge.jsx'), 'utf8')
  const toastContent = fs.readFileSync(path.resolve('src/components/common/Toast.jsx'), 'utf8')
  const toggleContent = fs.readFileSync(path.resolve('src/components/common/ToggleSwitch.jsx'), 'utf8')
  assert.ok(badgeContent.includes('rounded-none font-label-bold'))
  assert.ok(toastContent.includes('rounded-none flex items-start gap-3'))
  assert.ok(toggleContent.includes('rounded-none border transition-all'))
})

runAudit('9. SkeletonLoader.jsx uses rounded-none across all skeleton blocks', () => {
  const content = fs.readFileSync(path.resolve('src/components/common/SkeletonLoader.jsx'), 'utf8')
  assert.ok(!content.includes('rounded-md'), 'SkeletonLoader must not contain rounded-md')
  assert.ok(!content.includes('rounded-full'), 'SkeletonLoader must not contain rounded-full')
  assert.ok(content.includes('rounded-none'), 'SkeletonLoader uses rounded-none')
})

runAudit('10. BottomNavigation.jsx uses sharp active indicator bar and sharp icon container', () => {
  const content = fs.readFileSync(path.resolve('src/components/common/BottomNavigation.jsx'), 'utf8')
  assert.ok(!content.includes('rounded-b-full'), 'BottomNavigation must not have rounded-b-full')
  assert.ok(!content.includes('rounded-full'), 'BottomNavigation must not have rounded-full')
  assert.ok(content.includes('rounded-none'), 'BottomNavigation uses rounded-none')
})

runAudit('11. EmptyState.jsx and ErrorState.jsx use rounded-none cards and buttons', () => {
  const emptyContent = fs.readFileSync(path.resolve('src/components/common/EmptyState.jsx'), 'utf8')
  const errorContent = fs.readFileSync(path.resolve('src/components/common/ErrorState.jsx'), 'utf8')
  assert.ok(emptyContent.includes('rounded-none p-8 sm:p-12'))
  assert.ok(errorContent.includes('rounded-none p-3.5 text-center'))
})

// -----------------------------------------------------------------------------
// 3. Pages & Layouts (Sign In, Create Account, Ranks, Shared Navbar & Footer)
// -----------------------------------------------------------------------------
runAudit('12. LoginPage.jsx uses sharp cards, inputs, buttons, and modal', () => {
  const content = fs.readFileSync(path.resolve('src/pages/LoginPage.jsx'), 'utf8')
  assert.ok(content.includes('rounded-none overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.85)]'))
  assert.ok(content.includes('rounded-none shadow-[0_0_15px_rgba(255,185,0,0.35)]'))
})

runAudit('13. RegisterPage.jsx uses sharp cards, password strength bar, and buttons', () => {
  const content = fs.readFileSync(path.resolve('src/pages/RegisterPage.jsx'), 'utf8')
  assert.ok(content.includes('rounded-none overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.85)]'))
  assert.ok(content.includes('rounded-none space-y-2.5 transition-all text-xs'))
})

runAudit('14. LeaderboardPage.jsx uses sharp event tabs, champion card, top 3, and standings', () => {
  const content = fs.readFileSync(path.resolve('src/pages/LeaderboardPage.jsx'), 'utf8')
  assert.ok(content.includes('px-3 py-1.5 rounded-none text-xs font-headline font-bold'))
  assert.ok(content.includes('lg:col-span-2 bg-gradient-to-b from-[#FFB900]/15 via-[#1B1B1F] to-[#111318] rounded-none border'))
  assert.ok(content.includes('lg:col-span-1 bg-[#111318] rounded-none border border-[#2A2A30]'))
  assert.ok(content.includes('p-3 sm:p-3.5 rounded-none bg-[#111318] border border-[#2A2A30] hover:border-[#FFB900]/60'))
})

runAudit('15. Navbar.jsx, AuthLayout.jsx, and Footer.jsx use sharp logos, social buttons, and links', () => {
  const navContent = fs.readFileSync(path.resolve('src/components/common/Navbar.jsx'), 'utf8')
  const authContent = fs.readFileSync(path.resolve('src/layouts/AuthLayout.jsx'), 'utf8')
  const footerContent = fs.readFileSync(path.resolve('src/components/common/Footer.jsx'), 'utf8')
  assert.ok(navContent.includes('rounded-none object-contain shrink-0'))
  assert.ok(authContent.includes('rounded-none object-contain shrink-0'))
  assert.ok(footerContent.includes('rounded-none object-contain shrink-0'))
})

// -----------------------------------------------------------------------------
// 4. Extended Application Sweep (Home, Tournaments, Details, Admin, Wallet)
// -----------------------------------------------------------------------------
runAudit('16. Home.jsx, TournamentsPage.jsx, and TournamentDetailPage.jsx contain zero non-none rounded classes', () => {
  const checkFiles = [
    'src/pages/Home.jsx',
    'src/pages/TournamentsPage.jsx',
    'src/pages/TournamentDetailPage.jsx'
  ]
  for (const f of checkFiles) {
    const content = fs.readFileSync(path.resolve(f), 'utf8')
    const lines = content.split('\n')
    lines.forEach((line, idx) => {
      const trimmed = line.trim()
      if (trimmed.startsWith('*') || trimmed.startsWith('//') || trimmed.startsWith('/*')) return
      const matches = line.match(/(?<![-a-zA-Z0-9_])rounded(?:-[a-zA-Z0-9_-]+|-(?:\[[^\]]+\]))?/g) || []
      const nonNone = matches.filter(m => m !== 'rounded-none')
      assert.equal(nonNone.length, 0, `File ${f} Line ${idx + 1} has non-none rounded class: ${nonNone.join(', ')}`)
    })
  }
})

runAudit('17. Player portal & wallet pages (WalletPage, PlayerTeamPortalPage, DashboardPage) enforce rounded-none', () => {
  const portalFiles = [
    'src/pages/WalletPage.jsx',
    'src/pages/PlayerTeamPortalPage.jsx',
    'src/pages/DashboardPage.jsx',
    'src/pages/ProfilePage.jsx',
    'src/pages/AchievementsPage.jsx'
  ]
  for (const f of portalFiles) {
    const content = fs.readFileSync(path.resolve(f), 'utf8')
    const lines = content.split('\n')
    lines.forEach((line, idx) => {
      const trimmed = line.trim()
      if (trimmed.startsWith('*') || trimmed.startsWith('//') || trimmed.startsWith('/*')) return
      const matches = line.match(/(?<![-a-zA-Z0-9_])rounded(?:-[a-zA-Z0-9_-]+|-(?:\[[^\]]+\]))?/g) || []
      const nonNone = matches.filter(m => m !== 'rounded-none')
      assert.equal(nonNone.length, 0, `File ${f} Line ${idx + 1} has non-none rounded class: ${nonNone.join(', ')}`)
    })
  }
})

runAudit('18. Admin views & modals (AdminDashboardPage, MatchControl, SlotBookingModal) enforce rounded-none', () => {
  const adminFiles = [
    'src/pages/AdminDashboardPage.jsx',
    'src/components/admin/MatchControlView.jsx',
    'src/components/admin/FinanceDashboardView.jsx',
    'src/components/tournament/SlotBookingModal.jsx',
    'src/components/tournament/PlayerMatchSchedule.jsx'
  ]
  for (const f of adminFiles) {
    const content = fs.readFileSync(path.resolve(f), 'utf8')
    const lines = content.split('\n')
    lines.forEach((line, idx) => {
      const trimmed = line.trim()
      if (trimmed.startsWith('*') || trimmed.startsWith('//') || trimmed.startsWith('/*')) return
      const matches = line.match(/(?<![-a-zA-Z0-9_])rounded(?:-[a-zA-Z0-9_-]+|-(?:\[[^\]]+\]))?/g) || []
      const nonNone = matches.filter(m => m !== 'rounded-none')
      assert.equal(nonNone.length, 0, `File ${f} Line ${idx + 1} has non-none rounded class: ${nonNone.join(', ')}`)
    })
  }
})

runAudit('19. Official brand icon and logo geometries are preserved intact', () => {
  const footerContent = fs.readFileSync(path.resolve('src/components/common/Footer.jsx'), 'utf8')
  const settingsContent = fs.readFileSync(path.resolve('src/components/admin/SettingsView.jsx'), 'utf8')
  assert.ok(footerContent.includes('rx="5.5"'), 'Footer.jsx Instagram rect retains official logo geometry')
  assert.ok(settingsContent.includes('rx="5" ry="5"'), 'SettingsView.jsx InstagramIcon retains official logo geometry')
})

runAudit('20. Entire src codebase contains ZERO non-none rounded classes (code-level zero-radius audit)', () => {
  function walk(dir) {
    let results = []
    const list = fs.readdirSync(dir)
    for (const file of list) {
      const full = path.join(dir, file)
      const stat = fs.statSync(full)
      if (stat && stat.isDirectory()) {
        results = results.concat(walk(full))
      } else if (file.endsWith('.jsx') || file.endsWith('.js') || file.endsWith('.css') || file.endsWith('.html')) {
        results.push(full)
      }
    }
    return results
  }

  const allFiles = walk('src')
  let totalBad = 0
  const badItems = []

  for (const f of allFiles) {
    const content = fs.readFileSync(f, 'utf8')
    const lines = content.split('\n')
    lines.forEach((line, idx) => {
      const trimmed = line.trim()
      if (trimmed.startsWith('*') || trimmed.startsWith('//') || trimmed.startsWith('/*')) return
      const matches = line.match(/(?<![-a-zA-Z0-9_])rounded(?:-[a-zA-Z0-9_-]+|-(?:\[[^\]]+\]))?/g) || []
      const nonNone = matches.filter(m => m !== 'rounded-none')
      if (nonNone.length > 0) {
        totalBad += nonNone.length
        badItems.push(`${f}:${idx + 1} -> ${nonNone.join(', ')}`)
      }
    })
  }

  assert.equal(
    totalBad,
    0,
    `Found ${totalBad} remaining non-none rounded classes:\n${badItems.slice(0, 10).join('\n')}`
  )
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
  console.log('🎉 ALL GLOBAL SHARP-EDGE UI AUDITS PASSED!')
}
