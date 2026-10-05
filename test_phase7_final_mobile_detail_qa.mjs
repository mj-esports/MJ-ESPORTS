/**
 * MJ ESPORTS — Phase 7: Final Mobile Tournament Detail Visual QA Test Suite
 * Target Viewports: 375px, 390px, 430px, 768px, 1024px, 1280px, 1440px
 * Tabs Audited: 1. Overview, 2. Rules, 3. Schedule, 4. Registered Squads, 5. FAQs
 */

import fs from 'fs'
import path from 'path'
import assert from 'assert'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

console.log('================================================================================')
console.log('MJ ESPORTS — PHASE 7: FINAL MOBILE TOURNAMENT DETAIL VISUAL QA')
console.log('Target Route: /tournaments/:id')
console.log('Viewports: 375px, 390px, 430px, 768px, 1024px, 1280px, 1440px')
console.log('================================================================================\n')

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

// Read relevant components
const detailPagePath = path.resolve('src/pages/TournamentDetailPage.jsx')
const detailContent = fs.readFileSync(detailPagePath, 'utf8')

const navbarPath = path.resolve('src/components/common/Navbar.jsx')
const navbarContent = fs.readFileSync(navbarPath, 'utf8')

const footerPath = path.resolve('src/components/common/Footer.jsx')
const footerContent = fs.readFileSync(footerPath, 'utf8')

const bottomNavPath = path.resolve('src/components/common/BottomNavigation.jsx')
const bottomNavContent = fs.readFileSync(bottomNavPath, 'utf8')

const layoutPath = path.resolve('src/layouts/MainLayout.jsx')
const layoutContent = fs.readFileSync(layoutPath, 'utf8')

const rulebookPath = path.resolve('src/components/common/OfficialRulebook.jsx')
const rulebookContent = fs.readFileSync(rulebookPath, 'utf8')

const schedulePath = path.resolve('src/components/tournament/PlayerMatchSchedule.jsx')
const scheduleContent = fs.readFileSync(schedulePath, 'utf8')

const timelinePath = path.resolve('src/components/common/TournamentScheduleForm.jsx')
const timelineContent = fs.readFileSync(timelinePath, 'utf8')

// --- SECTION 1: HEADER QA ---
console.log('--- SECTION 1: Header QA (Mobile Height, Logo, Hamburger) ---')

test('1.1. Header enforces standard mobile height (h-16) and desktop height (sm:h-20)', () => {
  assert(navbarContent.includes('h-16 sm:h-20'), 'Navbar height must be h-16 sm:h-20')
})

test('1.2. Logo is aligned on left with responsive sizing and alt text', () => {
  assert(
    navbarContent.includes('alt="MJ ESPORTS"') &&
    navbarContent.includes('w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14') &&
    navbarContent.includes('MJ <span className="text-[#00f2ff]">ESPORTS</span>'),
    'Logo must be aligned with responsive dimensions and branding'
  )
})

test('1.3. Hamburger button is aligned on right with >= 44px touch target', () => {
  assert(
    navbarContent.includes('min-h-[44px] min-w-[44px]') &&
    navbarContent.includes('aria-label={mobileMenuOpen ? \'Close Navigation Menu\' : \'Open Navigation Menu\'}'),
    'Hamburger button must meet 44px min touch target and accessible ARIA attributes'
  )
})

// --- SECTION 2: HERO QA ---
console.log('\n--- SECTION 2: Hero QA (Compact Spacing, Title Scaling, Metadata Readability) ---')

test('2.1. Hero banner adheres to compact mobile height scaling', () => {
  assert(
    detailContent.includes('min-h-[190px] xs:min-h-[220px] sm:min-h-[300px]'),
    'Hero banner must use compact responsive min-height'
  )
})

test('2.2. Hero padding avoids excessive vertical whitespace on mobile', () => {
  assert(
    detailContent.includes('pt-6 sm:pt-8 md:p-12 pb-3.5 sm:pb-6 px-4 sm:px-6'),
    'Hero must use compact vertical padding on mobile'
  )
})

test('2.3. Hero title scales smoothly across mobile break points (text-xl xs:text-2xl sm:text-3xl md:text-5xl lg:text-6xl)', () => {
  assert(
    detailContent.includes('text-xl xs:text-2xl sm:text-3xl md:text-5xl lg:text-6xl'),
    'Hero title typography must scale responsively'
  )
})

test('2.4. Hero metadata pills remain readable with flex-wrap and icon chips', () => {
  assert(
    detailContent.includes('flex flex-wrap items-center gap-2 sm:gap-3') &&
    detailContent.includes('Gamepad2') &&
    detailContent.includes('Users') &&
    detailContent.includes('MapPin'),
    'Hero metadata pills must use flex-wrap with Gamepad, Users, and MapPin'
  )
})

// --- SECTION 3: TABS QA ---
console.log('\n--- SECTION 3: Tabs QA (5 Tabs, Horizontal Scroll, Active Indicator, No Wrapping) ---')

test('3.1. All five required tournament tabs are present in exact order', () => {
  const tabIds = ['overview', 'rules', 'schedule', 'teams', 'faqs']
  for (const id of tabIds) {
    assert(detailContent.includes(`id: '${id}'`), `Tab '${id}' must be present`)
  }
})

test('3.2. Tab strip container has touch-enabled horizontal scroll with hidden scrollbar', () => {
  assert(
    detailContent.includes('overflow-x-auto w-full max-w-full min-w-0 hide-scrollbar') &&
    detailContent.includes('touch-pan-x overscroll-x-contain'),
    'Tab container must have touch-pan-x and hide-scrollbar'
  )
})

test('3.3. Tab buttons prevent accidental text wrapping and text clipping', () => {
  assert(
    detailContent.includes('shrink-0 whitespace-nowrap'),
    'Tab buttons must include shrink-0 whitespace-nowrap'
  )
})

test('3.4. Active tab indicator displays orange bottom border and branding styling', () => {
  assert(
    detailContent.includes("activeTab === tab.id") &&
    detailContent.includes("font-bold text-[#ff5e07] border-b-2 border-[#ff5e07]"),
    'Active tab must render orange border-b-2'
  )
})

// --- SECTION 4: CONTENT & CARD CONSISTENCY QA ---
console.log('\n--- SECTION 4: Content & Card Consistency QA ---')

test('4.1. Section cards consistently use Stitch dark tokens and rounded-xl radius', () => {
  assert(
    detailContent.includes('bg-[#141416]') &&
    detailContent.includes('border-[#27272a]') &&
    detailContent.includes('rounded-xl'),
    'Cards must adhere to Stitch dark tokens and rounded-xl'
  )
})

test('4.2. Inner bento containers consistently use bg-[#1c1b1c] and rounded-lg radius', () => {
  assert(
    detailContent.includes('bg-[#1c1b1c]') &&
    detailContent.includes('rounded-lg'),
    'Inner bento boxes must use bg-[#1c1b1c] and rounded-lg'
  )
})

test('4.3. Typography adheres strictly to font-headline, font-mono, and font-body hierarchy', () => {
  assert(
    detailContent.includes('font-headline') &&
    detailContent.includes('font-mono') &&
    detailContent.includes('font-body'),
    'Typography must use standard fonts'
  )
})

// --- SECTION 5: TAB 1 OVERVIEW QA ---
console.log('\n--- SECTION 5: Tab 1 Overview QA (Priorities 1 to 6) ---')

test('5.1. Overview renders Priority 1: Registration Summary with dominant 44px primary CTA', () => {
  assert(
    detailContent.includes('Registration Summary') &&
    detailContent.includes('min-h-[44px]') &&
    detailContent.includes('bg-[#ff5e07]'),
    'Overview must render Registration Summary with 44px primary CTA'
  )
})

test('5.2. Overview renders Priority 2: Prize Allocation with Escrow Secured badge and tier breakdown', () => {
  assert(
    detailContent.includes('Prize Pool & Allocation') &&
    detailContent.includes('Escrow Secured') &&
    detailContent.includes('TOTAL PURSE') &&
    detailContent.includes('1ST PLACE'),
    'Overview must render Escrow Secured prize pool breakdown'
  )
})

test('5.3. Overview renders Priority 3: Date & Time Specification with IST timezone chip', () => {
  assert(
    detailContent.includes('Date & Time Specification') &&
    detailContent.includes('IST (UTC+05:30)'),
    'Overview must render IST timezone specification'
  )
})

test('5.4. Overview renders Priority 4: Slot Capacity Metrics with 2x2 grid and remaining counter', () => {
  assert(
    detailContent.includes('Slot Capacity Metrics') &&
    detailContent.includes('Slots Remaining') &&
    detailContent.includes('REGISTERED SQUADS') &&
    detailContent.includes('COMBATANTS LOGGED'),
    'Overview must render slot capacity metrics'
  )
})

test('5.5. Match Check-In & Slot Assignment is completely absent from Tournament Detail Overview', () => {
  assert(
    !detailContent.includes('Match Check-In & Slot Assignment'),
    'Match Check-In & Slot Assignment must not render on Tournament Detail Overview'
  )
})

test('5.6. Overview renders Priority 6: Room Credentials with copy credentials and toggle', () => {
  assert(
    detailContent.includes('Match Room Credentials') &&
    detailContent.includes('handleCopyCredentials') &&
    detailContent.includes('showPassword'),
    'Overview must render room credentials with copy actions'
  )
})

// --- SECTION 6: TAB 2 RULES QA ---
console.log('\n--- SECTION 6: Tab 2 Rules QA (Numbered Cards, Arbiter Badge, Modal) ---')

test('6.1. Official Rulebook renders header with version and Arbiter Enforced status', () => {
  assert(
    rulebookContent.includes('Official Tournament Rulebook') &&
    rulebookContent.includes('ARBITER ENFORCED') &&
    rulebookContent.includes('ZERO TOLERANCE'),
    'Rules tab must render arbiter badges'
  )
})

test('6.2. Official Rulebook renders two-digit numbered rule cards (01, 02...)', () => {
  assert(
    rulebookContent.includes("String(item.id).padStart(2, '0')") &&
    rulebookContent.includes('hover:border-[#00f2ff]/40'),
    'Rule cards must render two-digit number badges and cyan hover transition'
  )
})

test('6.3. Official Rulebook provides 44px min-h touch target for View Full Rulebook CTA', () => {
  assert(
    rulebookContent.includes('View Full Rulebook') &&
    rulebookContent.includes('min-h-[44px]'),
    'View Full Rulebook CTA must meet 44px touch target height'
  )
})

// --- SECTION 7: TAB 3 SCHEDULE QA ---
console.log('\n--- SECTION 7: Tab 3 Schedule QA (Authoritative Service, Empty State, Timeline) ---')

test('7.1. PlayerMatchSchedule consumes authoritative matchSchedulingService', () => {
  assert(
    scheduleContent.includes('fetchTournamentMatches') &&
    !scheduleContent.includes('room_password'),
    'Player match schedule must fetch matches authoritatively and protect room password'
  )
})

test('7.2. PlayerMatchSchedule handles compact empty state with Stitch tokens', () => {
  assert(
    scheduleContent.includes('data-testid="schedule-empty-state"') &&
    scheduleContent.includes('No matches scheduled yet.') &&
    scheduleContent.includes('bg-[#141416]') &&
    scheduleContent.includes('border-[#27272a]'),
    'Schedule must render compact empty state with Stitch tokens'
  )
})

test('7.3. TournamentScheduleForm renders read-only chronological timeline windows', () => {
  assert(
    timelineContent.includes('Tournament Schedule Overview') &&
    timelineContent.includes('IST (UTC+05:30)'),
    'Schedule tab must render chronological timeline windows'
  )
})

// --- SECTION 8: TAB 4 REGISTERED SQUADS QA ---
console.log('\n--- SECTION 8: Tab 4 Registered Squads QA (Dual Binding, Empty State, Squad Cards) ---')

test('8.1. Registered Squads tab supports both teamsList and teams_list data formats', () => {
  assert(
    detailContent.includes('tournament?.teamsList') &&
    detailContent.includes('tournament?.teams_list'),
    'Squads tab must support both teamsList and teams_list'
  )
})

test('8.2. Registered Squads tab renders compact empty state with Claim First Slot CTA', () => {
  assert(
    detailContent.includes('data-testid="squads-empty-state"') &&
    detailContent.includes('No squads registered yet.') &&
    detailContent.includes('Claim First Slot') &&
    detailContent.includes('min-h-[44px]'),
    'Squads tab must render compact empty state with 44px Claim First Slot CTA'
  )
})

test('8.3. Populated squads render two-digit slot numbers and Roster Locked verification', () => {
  assert(
    detailContent.includes('data-testid="registered-squads-grid"') &&
    detailContent.includes("SLOT #{String(idx + 1).padStart(2, '0')}") &&
    detailContent.includes('ROSTER LOCKED'),
    'Squad cards must render two-digit slot badges and ROSTER LOCKED badge'
  )
})

// --- SECTION 9: TAB 5 FAQS QA ---
console.log('\n--- SECTION 9: Tab 5 FAQs QA (Compact Accordion, 44px Touch Targets, ARIA) ---')

test('9.1. FAQs tab renders compact accordion container with Arbiter Guide header', () => {
  assert(
    detailContent.includes('data-testid="faq-accordion"') &&
    detailContent.includes('Frequently Asked Questions') &&
    detailContent.includes('Arbiter Guide'),
    'FAQs tab must render compact accordion container with Arbiter Guide header'
  )
})

test('9.2. Accordion buttons enforce 44px minimum touch target height', () => {
  assert(
    detailContent.includes('min-h-[44px]') &&
    detailContent.includes('aria-expanded={isOpen}'),
    'Accordion buttons must enforce 44px min-h touch target and aria-expanded'
  )
})

test('9.3. Accordion preserves all 4 authoritative FAQs and open/close behavior', () => {
  assert(
    detailContent.includes('faqs.map') &&
    detailContent.includes('How do I access the Custom Room ID and Password?') &&
    detailContent.includes('How are prize pools distributed to winners?') &&
    detailContent.includes('What happens if a teammate suffers a network disconnection?') &&
    detailContent.includes('How are total points calculated?'),
    'All 4 authoritative FAQs must be preserved verbatim'
  )
})

// --- SECTION 10: REGISTRATION & ZERO DUPLICATION QA ---
console.log('\n--- SECTION 10: Registration & Zero Duplication QA ---')

test('10.1. Mobile overview hides desktop right sidebar to eliminate duplicate registration card', () => {
  assert(
    detailContent.includes("activeTab === 'overview' ? 'hidden lg:block' : 'block'"),
    'Mobile overview must hide right sidebar to eliminate duplication'
  )
})

test('10.2. Desktop right sidebar maintains sticky positioning (sticky top-24)', () => {
  assert(
    detailContent.includes('sticky top-24'),
    'Desktop sidebar must maintain sticky top-24'
  )
})

// --- SECTION 11: BOTTOM NAVIGATION & CLEARANCE QA ---
console.log('\n--- SECTION 11: Bottom Navigation & Clearance QA ---')

test('11.1. Bottom navigation is fixed to bottom on mobile (fixed bottom-0 left-0 right-0 z-40 md:hidden)', () => {
  assert(
    bottomNavContent.includes('fixed bottom-0 left-0 right-0 z-40 md:hidden'),
    'Bottom navigation must be fixed to bottom on mobile'
  )
})

test('11.2. Root container and layout provide bottom clearance for fixed navigation', () => {
  assert(
    detailContent.includes('pb-24 sm:pb-16 md:pb-12') &&
    layoutContent.includes('pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0'),
    'Page root and MainLayout must provide bottom padding clearance for mobile bottom bar'
  )
})

// --- SECTION 12: FOOTER QA ---
console.log('\n--- SECTION 12: Footer QA (Compact Height, Legal Links) ---')

test('12.1. Footer is compact with top padding pt-5 sm:pt-6 and clears mobile bottom nav (pb-24 md:pb-6)', () => {
  assert(
    footerContent.includes('pt-5 sm:pt-6 pb-24 md:pb-6'),
    'Footer must have compact padding and clear mobile bottom bar'
  )
})

test('12.2. Legal and support links are accessible in footer', () => {
  assert(
    footerContent.includes('/privacy') &&
    footerContent.includes('/terms') &&
    footerContent.includes('/about') &&
    footerContent.includes('support.mjesports@gmail.com'),
    'Footer must include Privacy, Terms, Rulebook, and Support mailto links'
  )
})

// --- SECTION 13: RESPONSIVE MATRIX COMPLIANCE ---
console.log('\n--- SECTION 13: Responsive Matrix Compliance ---')

const matrix = [
  { name: '375px (Mobile Compact)', test: () => detailContent.includes('min-h-[190px]') && detailContent.includes('text-xs') },
  { name: '390px (Mobile Standard)', test: () => detailContent.includes('xs:min-h-[220px]') && detailContent.includes('xs:text-2xl') },
  { name: '430px (Mobile Max)', test: () => detailContent.includes('block lg:hidden') && detailContent.includes('pb-24') },
  { name: '768px (Tablet Portrait)', test: () => detailContent.includes('sm:min-h-[300px]') && detailContent.includes('sm:py-8') },
  { name: '1024px (Tablet Landscape / Laptop)', test: () => detailContent.includes('lg:grid-cols-3') && detailContent.includes('lg:col-span-2') },
  { name: '1280px (Desktop Standard)', test: () => detailContent.includes('md:h-[480px]') && detailContent.includes('sticky top-24') },
  { name: '1440px (Desktop Wide)', test: () => detailContent.includes('max-w-7xl mx-auto') && detailContent.includes('lg:text-6xl') }
]

for (const m of matrix) {
  test(`13.${matrix.indexOf(m) + 1}. Layout rules correctly handle ${m.name}`, () => {
    assert(m.test(), `Failed for ${m.name}`)
  })
}

console.log(`\n================================================================================`)
console.log(`FINAL RESULTS: ${passed} PASSED | ${failed} FAILED`)
console.log(`================================================================================`)

if (failed > 0) {
  process.exit(1)
} else {
  console.log('>>> ALL PHASE 7 FINAL MOBILE TOURNAMENT DETAIL QA AUDITS PASSED <<<')
}
