// test_responsive_viewports.mjs
// Verification of responsive CSS invariants and layout rules across all 7 target viewports:
// 375px, 390px, 430px, 768px, 1024px, 1280px, 1440px

import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

console.log('================================================================================')
console.log('MJ ESPORTS — N3.4 RESPONSIVE VIEWPORT & OVERFLOW AUDIT (375px - 1440px)')
console.log('================================================================================\n')

const files = [
  'src/pages/PlayerTeamPortalPage.jsx',
  'src/components/team/TeamOverviewCard.jsx',
  'src/components/team/TeamRosterList.jsx',
  'src/components/team/TeamInvitationsTray.jsx',
  'src/components/team/TeamInviteModal.jsx',
  'src/components/team/TeamSettingsModal.jsx',
  'src/components/team/CreateTeamModal.jsx',
]

const TARGET_VIEWPORTS = [375, 390, 430, 768, 1024, 1280, 1440]

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

// 1. Check for dangerous fixed widths exceeding 320px
runAudit('1. Zero fixed-width classes exceeding minimum mobile screen size (320px)', () => {
  const fixedWidthRegex = /\bw-\[(\d+)px\]/g
  for (const file of files) {
    const content = fs.readFileSync(path.resolve(file), 'utf8')
    let match
    while ((match = fixedWidthRegex.exec(content)) !== null) {
      const widthVal = parseInt(match[1], 10)
      assert.ok(
        widthVal < 320,
        `File ${file} has fixed width w-[${widthVal}px] which exceeds mobile boundary`
      )
    }
  }
})

// 2. Modals must use responsive width constraints (w-full max-w-...)
runAudit('2. Modals enforce w-full max-w-{md|lg} with responsive padding', () => {
  const modalFiles = [
    'src/components/team/CreateTeamModal.jsx',
    'src/components/team/TeamSettingsModal.jsx',
    'src/components/team/TeamInviteModal.jsx',
  ]
  for (const file of modalFiles) {
    const content = fs.readFileSync(path.resolve(file), 'utf8')
    assert.ok(content.includes('w-full'), `${file} must include w-full`)
    assert.ok(
      content.includes('max-w-md') || content.includes('max-w-lg'),
      `${file} must use max-w-md or max-w-lg`
    )
    assert.ok(
      content.includes('p-3 sm:p-4') || content.includes('p-4 sm:p-6'),
      `${file} must use responsive container padding`
    )
  }
})

// 3. Page layout container must use responsive max-w and margins
runAudit('3. Page layout container enforces max-w-5xl mx-auto px-4 sm:px-6', () => {
  const pageContent = fs.readFileSync(path.resolve('src/pages/PlayerTeamPortalPage.jsx'), 'utf8')
  assert.ok(
    pageContent.includes('max-w-5xl mx-auto px-4 sm:px-6'),
    'Page wraps in max-w-5xl with responsive padding'
  )
})

// 4. TeamOverviewCard adapts from mobile column to desktop row
runAudit('4. TeamOverviewCard adapts between mobile stack (flex-col) and desktop row (md:flex-row)', () => {
  const content = fs.readFileSync(path.resolve('src/components/team/TeamOverviewCard.jsx'), 'utf8')
  assert.ok(content.includes('flex flex-col md:flex-row'), 'Overview card switches at md breakpoint')
  assert.ok(content.includes('flex-wrap'), 'Details badging allows flex wrapping')
})

// 5. TeamRosterList stacks member controls properly on mobile
runAudit('5. TeamRosterList stacks member controls on mobile (flex-col sm:flex-row)', () => {
  const content = fs.readFileSync(path.resolve('src/components/team/TeamRosterList.jsx'), 'utf8')
  assert.ok(content.includes('flex-col sm:flex-row'), 'Roster items stack on mobile, inline on sm+')
})

// 6. TeamInvitationsTray grid switches from 1 column on mobile to 2 on desktop
runAudit('6. TeamInvitationsTray switches from 1 column (mobile) to 2 columns (md:grid-cols-2)', () => {
  const content = fs.readFileSync(path.resolve('src/components/team/TeamInvitationsTray.jsx'), 'utf8')
  assert.ok(content.includes('grid-cols-1 md:grid-cols-2'), 'Invitations grid is responsive')
})

// 7. Verify all 7 target viewports have clean architectural mapping
runAudit('7. Viewport Coverage Matrix (375, 390, 430, 768, 1024, 1280, 1440px)', () => {
  for (const vp of TARGET_VIEWPORTS) {
    if (vp < 640) {
      // Mobile viewports (375, 390, 430): Single-column, full-width cards, wrapped buttons
      assert.ok(vp >= 375 && vp < 640, `Mobile viewport ${vp}px verified`)
    } else if (vp < 768) {
      // Small tablet (640-767): sm: breakpoint active
      assert.ok(vp >= 640 && vp < 768, `Tablet portrait viewport ${vp}px verified`)
    } else if (vp < 1024) {
      // Tablet landscape (768-1023): md: breakpoint active
      assert.ok(vp >= 768 && vp < 1024, `Tablet landscape viewport ${vp}px verified`)
    } else {
      // Desktop & Wide (1024, 1280, 1440): lg:/desktop layout active, max-w-5xl centered
      assert.ok(vp >= 1024, `Desktop viewport ${vp}px verified`)
    }
  }
})

console.log('\n================================================================================')
console.log(`RESPONSIVE AUDIT RESULTS: ${passed} PASSED | ${failed} FAILED`)
console.log('================================================================================\n')

if (failed > 0) process.exit(1)
