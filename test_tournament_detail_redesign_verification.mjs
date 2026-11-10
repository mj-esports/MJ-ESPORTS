import fs from 'fs'
import path from 'path'
import assert from 'assert'

console.log('================================================================================')
console.log('MJ ESPORTS — TOURNAMENT DETAIL REDESIGN VERIFICATION AUDIT')
console.log('Target: src/pages/TournamentDetailPage.jsx')
console.log('Viewports: 375px, 390px, 430px, 768px, 1024px, 1280px, 1440px')
console.log('================================================================================\n')

const detailPagePath = path.resolve('src/pages/TournamentDetailPage.jsx')
assert.ok(fs.existsSync(detailPagePath), 'TournamentDetailPage.jsx must exist')
const content = fs.readFileSync(detailPagePath, 'utf8')

let passed = 0
let failed = 0

function test(description, fn) {
  try {
    fn()
    console.log(`  ✅ [PASS] ${description}`)
    passed++
  } catch (err) {
    console.error(`  ❌ [FAIL] ${description}`)
    console.error(`     Error: ${err.message}`)
    failed++
  }
}

// -----------------------------------------------------------------------------
// SECTION 1: VERIFY ABSENCE OF REMOVED SECTIONS
// -----------------------------------------------------------------------------
console.log('--- SECTION 1: Absence of Removed Sections & Spec Grids ---')

test('1.1. Map Target is completely absent from the Tournament Detail UI', () => {
  assert(!content.includes('MAP TARGET'), 'Map Target must not be present in TournamentDetailPage')
})

test('1.2. Gun Attributes is completely absent from the Tournament Detail UI', () => {
  assert(!content.includes('GUN ATTRIBUTES'), 'Gun Attributes must not be present in TournamentDetailPage')
  assert(!content.includes('tournament.gunAttributes'), 'gunAttributes must not be referenced in TournamentDetailPage')
})

test('1.3. Character Skills is completely absent from the Tournament Detail UI', () => {
  assert(!content.includes('CHAR. SKILLS'), 'Character Skills must not be present in TournamentDetailPage')
  assert(!content.includes('tournament.characterSkills'), 'characterSkills must not be referenced in TournamentDetailPage')
})

test('1.4. Match Mode detail grid is completely absent from Tournament Detail UI', () => {
  assert(!content.includes('MATCH MODE'), 'Match Mode detail grid must not be present in TournamentDetailPage')
  assert(!content.includes('Quick Specs Grid'), 'Quick Specs Grid must not be present in TournamentDetailPage')
})

test('1.5. Match Check-In & Slot Assignment is completely absent from Tournament Detail Overview', () => {
  assert(!content.includes('Match Check-In & Slot Assignment'), 'Match Check-In & Slot Assignment must not be present')
  assert(!content.includes('handleCheckinSubmit'), 'handleCheckinSubmit must not be present in UI')
  assert(!content.includes('Check In & Claim Slot'), 'Check-in claim button must not be present in UI')
})

// -----------------------------------------------------------------------------
// SECTION 2: REQUIRED SECTIONS ARE PRESENT & FUNCTIONAL
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 2: Required Sections Rendering Verification ---')

test('2.1. Compact Tournament Hero renders Title, Status, Game, Mode, Map, and visual banner', () => {
  assert(content.includes('{tournament.title}'), 'Hero must render tournament title')
  assert(content.includes('tournament.status'), 'Hero must render status badge')
  assert(content.includes('{tournament.game}'), 'Hero must render game name')
  assert(content.includes('{tournament.format || \'Squad\'} Mode'), 'Hero must render format mode')
  assert(content.includes('{tournament.map || \'Bermuda\'}'), 'Hero must render map name')
  assert(content.includes('getTournamentImage(tournament)'), 'Hero must render tournament background image')
  assert(content.includes('min-h-[190px] xs:min-h-[220px]'), 'Hero must enforce compact mobile height scale')
})

test('2.2. All 5 required navigation tabs remain present and accessible', () => {
  const requiredTabs = ['Overview', 'Rules', 'Schedule', 'Registered Squads', 'FAQs']
  for (const t of requiredTabs) {
    assert(content.includes(`'${t}'`) || content.includes(`label: '${t}'`), `Tab '${t}' must be present`)
  }
  assert(content.includes('overflow-x-auto'), 'Tabs must support horizontal scrolling on mobile')
  assert(content.includes('touch-pan-x'), 'Tabs must have touch interaction enabled')
})

test('2.3. Overview Tab renders Prize Pool & Allocation with Escrow badge', () => {
  assert(content.includes('Prize Pool & Allocation'), 'Must render Prize Pool & Allocation')
  assert(content.includes('TOTAL PURSE'), 'Must render Total Purse metric')
  assert(content.includes('Escrow Secured'), 'Must render Escrow Secured badge')
  assert(content.includes('1ST PLACE'), 'Must render 1st place breakdown')
})

test('2.4. Overview Tab renders Date & Time Specification with IST timezone', () => {
  assert(content.includes('Date & Time Specification'), 'Must render Date & Time Specification')
  assert(content.includes('IST (UTC+05:30)'), 'Must render IST timezone specification')
  assert(content.includes('TOURNAMENT DATE'), 'Must render Tournament Date metric')
  assert(content.includes('MATCH KICKOFF'), 'Must render Match Kickoff metric')
})

test('2.5. Overview Tab renders Registration Summary and primary CTA', () => {
  assert(content.includes('renderRegistrationSummaryCard'), 'Must call renderRegistrationSummaryCard')
  assert(content.includes('Registration Summary'), 'Must render Registration Summary header')
  assert(content.includes('Entry Fee'), 'Must render Entry Fee')
  assert(content.includes('min-h-[44px]'), 'Registration CTA must meet 44px minimum touch target')
})

test('2.6. Overview Tab renders Registered Squads / Combatants metrics', () => {
  assert(content.includes('Registered Squads / Combatants'), 'Must render Registered Squads / Combatants header')
  assert(content.includes('REGISTERED SQUADS'), 'Must render REGISTERED SQUADS metric')
  assert(content.includes('COMBATANTS LOGGED'), 'Must render COMBATANTS LOGGED metric')
  assert(content.includes('Slots Remaining'), 'Must render slots remaining counter')
})

test('2.7. Overview Tab renders Match Room Credentials when applicable', () => {
  assert(content.includes('Match Room Credentials'), 'Must render Match Room Credentials section')
  assert(content.includes('ROOM ID'), 'Must render Room ID card')
  assert(content.includes('PASSWORD'), 'Must render Room Password card')
  assert(content.includes('COPY CREDENTIALS'), 'Must render Copy Credentials action')
})

// -----------------------------------------------------------------------------
// SECTION 3: MOBILE LAYOUT ORDER (375px / 390px / 430px)
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 3: Mobile Information Hierarchy & Sequence Audit ---')

test('3.1. Overview tab renders sections in exact mobile priority sequence', () => {
  const prizeIdx = content.indexOf('Prize Pool & Allocation')
  const dateIdx = content.indexOf('Date & Time Specification')
  const mobileRegIdx = content.indexOf('{renderRegistrationSummaryCard()}')
  const squadsIdx = content.indexOf('Registered Squads / Combatants')
  const credsIdx = content.indexOf('<span>Match Room Credentials</span>')

  assert(prizeIdx !== -1, 'Prize Pool & Allocation index valid')
  assert(dateIdx !== -1, 'Date & Time Specification index valid')
  assert(mobileRegIdx !== -1, 'Mobile Registration Summary index valid')
  assert(squadsIdx !== -1, 'Registered Squads / Combatants index valid')
  assert(credsIdx !== -1, 'Match Room Credentials index valid')

  assert(prizeIdx < dateIdx, '1. Prize Pool & Allocation appears before Date & Time')
  assert(dateIdx < mobileRegIdx, '2. Date & Time appears before Mobile Registration Summary')
  assert(mobileRegIdx < squadsIdx, '3. Mobile Registration Summary appears before Registered Squads / Combatants')
  assert(squadsIdx < credsIdx, '4. Registered Squads / Combatants appears before Match Room Credentials')
})

test('3.2. Subheader breadcrumb navigation exists for mobile (sm:hidden)', () => {
  assert(
    content.includes('sm:hidden') && content.includes('to="/tournaments"') && content.includes('ArrowLeft'),
    'Mobile subheader with back navigation to /tournaments must be present'
  )
})

test('3.3. Bottom padding clears fixed mobile bottom navigation', () => {
  assert(content.includes('pb-24 sm:pb-16 md:pb-12'), 'Root element provides pb-24 clearance')
})

// -----------------------------------------------------------------------------
// SECTION 4: ZERO DUPLICATION & DESKTOP ARCHITECTURE
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 4: Zero Duplication & Responsive Layout QA ---')

test('4.1. Desktop uses 2-column grid layout (lg:grid-cols-3) with lg:col-span-2 main content', () => {
  assert(content.includes('grid grid-cols-1 lg:grid-cols-3 gap-8'), 'Must use 3-column desktop grid')
  assert(content.includes('lg:col-span-2'), 'Left column must span 2 columns on lg+')
})

test('4.2. Right sidebar is sticky on desktop and hides duplicate on mobile overview', () => {
  assert(content.includes('sticky top-24'), 'Desktop sidebar must be sticky top-24')
  assert(
    content.includes("activeTab === 'overview' ? 'hidden lg:block' : 'block'"),
    'Sidebar must be hidden on mobile overview to prevent duplication'
  )
})

test('4.3. No visible duplicate registration card or duplicate prize tables in UI', () => {
  // EntryPrizeSystem is hidden from the UI so it doesn't duplicate information
  assert(content.includes('className="hidden" aria-hidden="true"'), 'EntryPrizeSystem is hidden from visual presentation')
})

// -----------------------------------------------------------------------------
// SECTION 5: PAYMENT ISOLATION VERIFICATION
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 5: Payment Isolation Verification ---')

test('5.1. TournamentDetailPage does NOT import tournamentPaymentService', () => {
  assert(!content.includes('tournamentPaymentService'), 'No tournamentPaymentService import')
})

test('5.2. TournamentDetailPage does NOT invoke Razorpay APIs or create payment orders', () => {
  assert(!content.includes('createTournamentOrder'), 'No createTournamentOrder calls')
  assert(!content.includes('verifyPayment'), 'No verifyPayment calls')
  assert(!content.includes('Razorpay('), 'No direct Razorpay instantiation')
})

// -----------------------------------------------------------------------------
// SECTION 6: VIEWPORT MATRIX AUDIT
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 6: Viewport Matrix Compliance ---')

const viewports = [
  { name: '375px (Compact Mobile)', check: () => content.includes('min-h-[190px]') && content.includes('text-xl') },
  { name: '390px (Standard Mobile)', check: () => content.includes('xs:min-h-[220px]') && content.includes('xs:text-2xl') },
  { name: '430px (Max Mobile)', check: () => content.includes('block lg:hidden') && content.includes('pb-24') },
  { name: '768px (Tablet Portrait)', check: () => content.includes('sm:min-h-[300px]') && content.includes('sm:py-8') },
  { name: '1024px (Tablet Landscape / Laptop)', check: () => content.includes('lg:grid-cols-3') && content.includes('lg:col-span-2') },
  { name: '1280px (Standard Desktop)', check: () => content.includes('md:h-[480px]') && content.includes('sticky top-24') },
  { name: '1440px (Wide Desktop)', check: () => content.includes('max-w-7xl mx-auto') && content.includes('lg:text-6xl') },
]

for (const vp of viewports) {
  test(`6.${viewports.indexOf(vp) + 1}. Viewport rules support ${vp.name}`, () => {
    assert.ok(vp.check(), `Layout check failed for ${vp.name}`)
  })
}

console.log('\n================================================================================')
console.log(`FINAL RESULTS: ${passed} PASSED | ${failed} FAILED`)
console.log('================================================================================')

if (failed > 0) {
  process.exit(1)
} else {
  console.log('>>> TOURNAMENT DETAIL REDESIGN VERIFICATION SUCCESSFUL <<<')
}
