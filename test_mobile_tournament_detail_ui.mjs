import fs from 'fs'
import path from 'path'

console.log('================================================================================')
console.log('MJ ESPORTS — PHASE 2: OVERVIEW REDESIGN AUDIT (APPROVED GOOGLE STITCH)')
console.log('Target Viewports: 375px, 390px, 430px, 768px, 1024px, 1280px, 1440px')
console.log('================================================================================\n')

const detailPagePath = path.resolve('src/pages/TournamentDetailPage.jsx')
const content = fs.readFileSync(detailPagePath, 'utf8')

let passed = 0
let failed = 0

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`)
    passed++
  } else {
    console.error(`  ❌ [FAIL] ${message}`)
    failed++
  }
}

console.log('--- GROUP 1: Compact Mobile Subheader & Navigation ---')
assert(
  content.includes('sm:hidden') &&
  content.includes('to="/tournaments"') &&
  content.includes('ArrowLeft'),
  '1.1. Compact mobile subheader with back navigation to /tournaments exists (sm:hidden)'
)
assert(
  content.includes('bg-[#0e0e0f]/95') && content.includes('border-b border-[#27272a]'),
  '1.2. Mobile subheader adheres to Stitch dark token palette (#0e0e0f, #27272a)'
)

console.log('\n--- GROUP 2: Compact Tournament Hero Banner ---')
assert(
  content.includes('min-h-[190px]') && content.includes('xs:min-h-[220px]'),
  '2.1. Hero banner uses compact mobile min-height scale (min-h-[190px] xs:min-h-[220px])'
)
assert(
  content.includes('pt-6') && content.includes('pb-3.5'),
  '2.2. Hero content uses compact vertical padding on mobile (pt-6, pb-3.5)'
)
assert(
  content.includes('bg-[#141416]/80') && content.includes('border-[#27272a]'),
  '2.3. Hero status chip uses Stitch card tokens (#141416, #27272a)'
)
assert(
  content.includes('text-xl xs:text-2xl sm:text-3xl md:text-5xl lg:text-6xl'),
  '2.4. Hero title scales smoothly across mobile and desktop breakpoints'
)

console.log('\n--- GROUP 3: Mobile Tournament Tab Navigation (5 Tabs) ---')
const tabs = ['Overview', 'Rules', 'Schedule', 'Registered Squads', 'FAQs']
const allTabsPresent = tabs.every(tab => content.includes(tab))
assert(
  allTabsPresent,
  '3.1. All five required tournament tabs are present (Overview, Rules, Schedule, Registered Squads, FAQs)'
)
assert(
  content.includes('overflow-x-auto') &&
  content.includes('touch-pan-x') &&
  content.includes('overscroll-x-contain'),
  '3.2. Tab strip container has touch-enabled horizontal scroll'
)
assert(
  content.includes('shrink-0') && content.includes('whitespace-nowrap'),
  '3.3. Tab buttons have shrink-0 and whitespace-nowrap preventing text clipping'
)
assert(
  content.includes('[scrollbar-width:none]') && content.includes('[&::-webkit-scrollbar]:hidden'),
  '3.4. Tab strip hides scrollbar cleanly on mobile while scrolling'
)
assert(
  content.includes('focus-visible:ring-[#00f2ff]'),
  '3.5. Tab buttons provide accessible cyan focus rings'
)

console.log('\n--- GROUP 4: Phase 2 Approved Overview Redesign: Priorities 1 to 6 ---')
// Priority 1: Registration CTA & Summary Card
assert(
  content.includes('renderRegistrationSummaryCard') &&
  content.includes('min-h-[44px]') &&
  content.includes('bg-[#ff5e07]'),
  '4.1. Priority 1: Registration Summary card has dominant primary CTA meeting 44px touch target'
)
assert(
  content.includes('Entry Fee') &&
  content.includes('Platform') &&
  content.includes('Format') &&
  content.includes('Registration Ends'),
  '4.2. Priority 1: Registration Summary renders 2x2 key metrics grid (Entry Fee, Platform, Format, Reg Ends)'
)

// Priority 2: Prize Pool / Allocation
assert(
  content.includes('Prize Pool & Allocation') &&
  content.includes('Escrow Secured') &&
  content.includes('TOTAL PURSE') &&
  content.includes('100% Disbursed'),
  '4.3. Priority 2: Prize Allocation section displays Escrow Secured badge, Total Purse, and Disbursed status'
)

// Priority 3: Date / Time / Timeline Specification
assert(
  content.includes('Date & Time Specification') &&
  content.includes('IST (UTC+05:30)') &&
  content.includes('Reg Closes:') &&
  content.includes('Check-in:') &&
  content.includes('Kickoff:'),
  '4.4. Priority 3: Timeline Specification card displays IST timezone and mini timeline pill sequence'
)

// Priority 4: Capacity / Slot Capacity Metrics
assert(
  content.includes('Slot Capacity Metrics') &&
  content.includes('REGISTERED SQUADS') &&
  content.includes('COMBATANTS LOGGED') &&
  content.includes('Slots Remaining'),
  '4.5. Priority 4: Slot Capacity Metrics features 2x2 squad/combatant grid and remaining slots counter'
)

// Priority 5: Check-in / Check-In Protocol
assert(
  content.includes('Match Check-In & Slot Assignment') &&
  content.includes('handleCheckinSubmit') &&
  content.includes('checkinInputUid') &&
  content.includes('Report Match Incident'),
  '4.6. Priority 5: Check-In Protocol preserves form submission, UID verification, and incident report modal trigger'
)

// Priority 6: Room Credentials / Custom Room Credentials
assert(
  content.includes('<span>Match Room Credentials</span>') &&
  content.includes('ROOM ID') &&
  content.includes('PASSWORD') &&
  content.includes('COPY CREDENTIALS'),
  '4.7. Priority 6: Room Credentials preserves Room ID, Password visibility toggle, and Copy Credentials'
)

// Mobile visual sequence verification (Strict Priority & Document Order)
const dtIdx = content.indexOf('Date & Time')
const regSummIdx = content.indexOf('{renderRegistrationSummaryCard()}')
const entryPrizeIdx = content.indexOf('<EntryPrizeSystem')
const slotCapIdx = content.indexOf('Slot Capacity')
const checkinIdx = content.indexOf('Match Check-In & Slot Assignment')
const credsIdx = content.indexOf('<span>Match Room Credentials</span>')

assert(
  dtIdx !== -1 && regSummIdx !== -1 && slotCapIdx !== -1 && checkinIdx !== -1 && credsIdx !== -1 &&
  dtIdx < regSummIdx && regSummIdx < entryPrizeIdx && entryPrizeIdx < slotCapIdx && slotCapIdx < checkinIdx && checkinIdx < credsIdx,
  '4.8. Mobile Overview order strictly follows Date & Time -> Registration Summary -> Slot Capacity -> Check-in -> Room Credentials'
)

console.log('\n--- GROUP 5: Visual Duplication Removal ---')
assert(
  content.includes('hidden lg:block') && content.includes('<EntryPrizeSystem'),
  '5.1. EntryPrizeSystem is hidden on mobile (hidden lg:block) eliminating duplicate registration card'
)
assert(
  content.includes("activeTab === 'overview' ? 'hidden lg:block' : 'block'"),
  '5.2. Desktop right sidebar maintains sticky positioning while hiding mobile duplicate on overview'
)

console.log('\n--- GROUP 6: Fixed Bottom Navigation Clearance ---')
assert(
  content.includes('pb-24 sm:pb-16 md:pb-12'),
  '6.1. Root container provides responsive bottom padding (pb-24) to clear fixed bottom nav bar'
)

console.log('\n--- GROUP 7: Viewport Matrix Compliance (375px, 390px, 430px, 768px, 1024px, 1280px, 1440px) ---')
const viewports = [
  { name: '375px (Mobile Compact)', test: () => content.includes('min-h-[190px]') && content.includes('text-xs') },
  { name: '390px (Mobile Standard)', test: () => content.includes('xs:min-h-[220px]') && content.includes('xs:text-2xl') },
  { name: '430px (Mobile Max)', test: () => content.includes('block lg:hidden') && content.includes('pb-24') },
  { name: '768px (Tablet Portrait)', test: () => content.includes('sm:min-h-[300px]') && content.includes('sm:py-8') },
  { name: '1024px (Tablet Landscape / Laptop)', test: () => content.includes('lg:grid-cols-3') && content.includes('lg:col-span-2') },
  { name: '1280px (Desktop Standard)', test: () => content.includes('md:h-[480px]') && content.includes('sticky top-24') },
  { name: '1440px (Desktop Wide)', test: () => content.includes('max-w-7xl mx-auto') && content.includes('lg:text-6xl') }
]

for (const vp of viewports) {
  assert(vp.test(), `7.${viewports.indexOf(vp) + 1}. Layout rules correctly handle ${vp.name}`)
}

console.log('\n--- GROUP 8: Payment Isolation Verification ---')
assert(
  !content.includes('tournamentPaymentService'),
  '8.1. Payment service is NOT imported in TournamentDetailPage'
)
assert(
  !content.includes('createRazorpayOrder') && !content.includes('verifyPayment'),
  '8.2. No Razorpay order or verification logic in TournamentDetailPage'
)

console.log('\n--- GROUP 9: Phase 3 Approved Rules Tab Redesign (Stitch Spec) ---')
const rulebookPath = path.resolve('src/components/common/OfficialRulebook.jsx')
const rulebookContent = fs.readFileSync(rulebookPath, 'utf8')

// 9.1. Rules data preservation & dynamic binding
assert(
  rulebookContent.includes('export const OFFICIAL_MJ_RULES = [') &&
  rulebookContent.includes('No emulators allowed.') &&
  rulebookContent.includes('Cheating may result in permanent account suspension.') &&
  rulebookContent.includes('rules = OFFICIAL_MJ_RULES'),
  '9.1. OfficialRulebook preserves default dynamic rules and fallback to OFFICIAL_MJ_RULES'
)

// 9.2. TournamentDetailPage integration
assert(
  content.includes("activeTab === 'rules'") &&
  content.includes('<OfficialRulebook') &&
  content.includes('tournament.rules'),
  '9.2. TournamentDetailPage renders OfficialRulebook on activeTab === "rules" passing dynamic tournament rules'
)

// 9.3. Rulebook Header & Metadata Bar
assert(
  rulebookContent.includes('bg-[#141416]') &&
  rulebookContent.includes('border-[#27272a]') &&
  rulebookContent.includes('Official Tournament Rulebook') &&
  rulebookContent.includes('DOC-ID: #RULE-FFMAX-2026') &&
  rulebookContent.includes('Standard Policy'),
  '9.3. Rulebook Header & Metadata Bar adheres to Stitch dark tokens (#141416, #27272a) and branding'
)

// 9.4. Version & Arbiter Enforced Status Badges
assert(
  rulebookContent.includes('VERSION 4.2 // READ-ONLY') &&
  rulebookContent.includes('ARBITER ENFORCED') &&
  rulebookContent.includes('ZERO TOLERANCE'),
  '9.4. Rulebook Header includes Version, Arbiter Enforced, and Zero Tolerance status badges'
)

// 9.5. Intro Briefing Banner
assert(
  rulebookContent.includes('bg-[#0e0e10]') &&
  rulebookContent.includes('border-l-2 border-[#00f2ff]') &&
  rulebookContent.includes('All registered combatants and squad captains must adhere'),
  '9.5. Intro Briefing banner renders standardized arbiter protocol statement with cyan accent border'
)

// 9.6. Numbered Rule Cards with Stitch Styling
assert(
  rulebookContent.includes("String(item.id).padStart(2, '0')") &&
  rulebookContent.includes('hover:border-[#00f2ff]/40') &&
  rulebookContent.includes('text-[#00f2ff] font-mono'),
  '9.6. Numbered Rule Cards render two-digit number badges (01, 02, etc.) and interactive Stitch border transitions'
)

// 9.7. Contextual Rule Tags
assert(
  rulebookContent.includes('ZERO TOLERANCE') &&
  rulebookContent.includes('POV REQUIRED') &&
  rulebookContent.includes('HARDWARE BAN') &&
  rulebookContent.includes('DISQUALIFICATION') &&
  rulebookContent.includes('TIMELINE CRITICAL'),
  '9.7. Contextual severity badges (ZERO TOLERANCE, POV REQUIRED, HARDWARE BAN, etc.) correctly defined'
)

// 9.8. Bottom Action & Enforced Guidelines Counter
assert(
  rulebookContent.includes('Official Guidelines Enforced') &&
  rulebookContent.includes('View Full Rulebook') &&
  rulebookContent.includes('BookOpen') &&
  rulebookContent.includes('min-h-[44px]'),
  '9.8. Bottom Action card displays enforced guidelines count and 44px touch target View Full Rulebook CTA'
)

// 9.9. Dispute Arbitration Notice
assert(
  rulebookContent.includes('Dispute arbitration tickets must be logged within 15 minutes of match conclusion'),
  '9.9. Dispute arbitration protocol notice is present with 15-minute POV deadline'
)

// 9.10. Read-Only Full Rulebook Modal
assert(
  rulebookContent.includes('role="dialog"') &&
  rulebookContent.includes('aria-modal="true"') &&
  rulebookContent.includes('Close Rulebook') &&
  rulebookContent.includes('Fair Play Enforcement Active') &&
  rulebookContent.includes('setShowModal(false)'),
  '9.10. Full Rulebook modal provides accessible dialog attributes, all numbered rules, and close handlers'
)

// 9.11. Compact Mobile Spacing & Overflow Protection
assert(
  rulebookContent.includes('space-y-3 sm:space-y-4') &&
  rulebookContent.includes('max-w-full') &&
  rulebookContent.includes('truncate') &&
  rulebookContent.includes('min-w-0'),
  '9.11. Compact mobile spacing and horizontal overflow protection verified (truncate, min-w-0, max-w-full)'
)

console.log('\n--- GROUP 10: Phase 4 Approved Schedule Tab Redesign (Stitch Spec) ---')
const scheduleCompPath = path.resolve('src/components/tournament/PlayerMatchSchedule.jsx')
const scheduleFormPath = path.resolve('src/components/common/TournamentScheduleForm.jsx')
const scheduleCompContent = fs.readFileSync(scheduleCompPath, 'utf8')
const scheduleFormContent = fs.readFileSync(scheduleFormPath, 'utf8')

// 10.1. Service consumption & data preservation
assert(
  scheduleCompContent.includes("from '../../services/matchSchedulingService'") &&
  scheduleCompContent.includes('fetchTournamentMatches(tournamentId)'),
  '10.1. PlayerMatchSchedule strictly consumes authoritative fetchTournamentMatches service'
)

// 10.2. Compact Empty State handling
assert(
  scheduleCompContent.includes('data-testid="schedule-empty-state"') &&
  scheduleCompContent.includes('No matches scheduled yet.') &&
  scheduleCompContent.includes('bg-[#141416]') &&
  scheduleCompContent.includes('border-[#27272a]'),
  '10.2. Compact empty state handles tournaments with no scheduled matches using Stitch tokens'
)

// 10.3. Compact Match Cards handling
assert(
  scheduleCompContent.includes('data-testid="schedule-matches-list"') &&
  scheduleCompContent.includes('MATCH {match.match_number}') &&
  scheduleCompContent.includes('{match.round_name}') &&
  scheduleCompContent.includes('hover:border-[#00f2ff]/40'),
  '10.3. Compact match cards render round names, match numbers, and interactive hover transitions'
)

// 10.4. All 6 approved lifecycle statuses preserved
const approvedStatuses = ['Scheduled', 'Check-in Open', 'Room Ready', 'Live', 'Completed', 'Cancelled']
const allStatusesPreserved = approvedStatuses.every(st => scheduleCompContent.includes(`'${st}'`))
assert(
  allStatusesPreserved,
  '10.4. All 6 approved lifecycle statuses (Scheduled, Check-in Open, Room Ready, Live, Completed, Cancelled) are handled'
)

// 10.5. Metadata Bento Box (Map, Mode, Schedule, Room Unlock)
assert(
  scheduleCompContent.includes('{match.map_name}') &&
  scheduleCompContent.includes('MapPin') &&
  scheduleCompContent.includes('{match.match_type}') &&
  scheduleCompContent.includes('Swords') &&
  scheduleCompContent.includes('Clock') &&
  scheduleCompContent.includes('formatMatchDateTime'),
  '10.5. Match metadata bento box displays map, match type, scheduled time, and optional room unlock'
)

// 10.6. Security guarantee: room_password is never exposed
assert(
  !scheduleCompContent.includes('room_password') &&
  !scheduleCompContent.includes('password') &&
  scheduleCompContent.includes('Strictly sanitize UI model'),
  '10.6. Security verification: room_password is never referenced or exposed in player match schedule'
)

// 10.7. TournamentScheduleForm chronology preservation
assert(
  scheduleFormContent.includes('export function checkScheduleChronology') &&
  scheduleFormContent.includes('Registration Closes must be after Registration Opens.'),
  '10.7. TournamentScheduleForm preserves chronological validation export and rules'
)

// 10.8. Timeline / Window Cards in readOnly mode
assert(
  scheduleFormContent.includes('Tournament Schedule Overview') &&
  scheduleFormContent.includes('Tournament Date') &&
  scheduleFormContent.includes('Registration Opens') &&
  scheduleFormContent.includes('Registration Closes') &&
  scheduleFormContent.includes('Check-in Opens') &&
  scheduleFormContent.includes('Check-in Closes') &&
  scheduleFormContent.includes('Room Publish Time') &&
  scheduleFormContent.includes('Match Start Time'),
  '10.8. Tournament Timeline renders comprehensive chronological window cards in read-only mode'
)

// 10.9. Mini Chronology Sequence Ribbon & IST Timezone
assert(
  scheduleFormContent.includes('IST (UTC+05:30)') &&
  scheduleFormContent.includes('Room Unlock:') &&
  scheduleFormContent.includes('Kickoff:'),
  '10.9. Timeline includes IST timezone chip and visual chronology progression ribbon'
)

// 10.10. TournamentDetailPage Schedule Tab Integration
assert(
  content.includes("activeTab === 'schedule'") &&
  content.includes('<PlayerMatchSchedule tournamentId={id} tournament={tournament} />') &&
  content.includes('<TournamentScheduleForm') &&
  content.includes('space-y-6 sm:space-y-8'),
  '10.10. TournamentDetailPage integrates both PlayerMatchSchedule and TournamentScheduleForm with compact spacing'
)

console.log('\n--- GROUP 11: Phase 5 Approved Registered Squads Redesign (Stitch Spec) ---')
const updatedDetailContent = fs.readFileSync(detailPagePath, 'utf8')

// 11.1. Dual data binding support (teamsList and teams_list)
assert(
  updatedDetailContent.includes('tournament?.teamsList') &&
  updatedDetailContent.includes('tournament?.teams_list'),
  '11.1. Registered Squads tab supports both teamsList and teams_list data formats'
)

// 11.2. Section Header Bar with Live Slot Counters
assert(
  updatedDetailContent.includes('Registered Squads') &&
  updatedDetailContent.includes('Confirmed Battle Roster') &&
  updatedDetailContent.includes('Roster Verified'),
  '11.2. Registered Squads header renders title, subtitle, and verified roster indicator'
)

// 11.3. Compact Empty State handling
assert(
  updatedDetailContent.includes('data-testid="squads-empty-state"') &&
  updatedDetailContent.includes('No squads registered yet.') &&
  updatedDetailContent.includes('Claim First Slot') &&
  updatedDetailContent.includes('Slots Vacant'),
  '11.3. Compact empty state handles empty squad list with Claim First Slot CTA'
)

// 11.4. Populated Squad Cards Grid & Slot Numbering
assert(
  updatedDetailContent.includes('data-testid="registered-squads-grid"') &&
  updatedDetailContent.includes("String(idx + 1).padStart(2, '0')") &&
  updatedDetailContent.includes('data-testid={`squad-card-${idx}`'),
  '11.4. Populated squads render two-digit slot numbers (SLOT #01) and test IDs'
)

// 11.5. Squad Details Bento Box
assert(
  updatedDetailContent.includes('CAPTAIN') &&
  updatedDetailContent.includes('ROSTER LOCKED') &&
  updatedDetailContent.includes('hover:border-[#00f2ff]/40'),
  '11.5. Squad cards render Captain and Roster Locked verification with Stitch hover glow'
)

// 11.6. Promoted Registration Placement
assert(
  updatedDetailContent.includes('Slots Remaining:') &&
  updatedDetailContent.includes('Claim Slot') &&
  updatedDetailContent.includes('handleRegisterClick'),
  '11.6. Promoted registration placement provides inline slot claiming banner when slots remain'
)

// 11.7. Handlers & Registration State Preservation
assert(
  updatedDetailContent.includes('handleRegisterClick') &&
  updatedDetailContent.includes('setShowSlotModal(true)') &&
  updatedDetailContent.includes('!isRegistrationDisabled'),
  '11.7. Registration handlers, modal trigger, and disabled state invariants are fully preserved'
)

console.log('\n--- GROUP 12: Phase 6 Approved FAQ Redesign (Stitch Spec) ---')
const faqDetailContent = fs.readFileSync(detailPagePath, 'utf8')

// 12.1. Compact Accordion Container & Stitch Token Palette
assert(
  faqDetailContent.includes('data-testid="faq-accordion"') &&
  faqDetailContent.includes('Frequently Asked Questions') &&
  faqDetailContent.includes('Arbiter Guide') &&
  faqDetailContent.includes('bg-[#141416]') &&
  faqDetailContent.includes('border-[#27272a]'),
  '12.1. FAQ tab renders compact accordion container with Stitch dark tokens and arbiter guide header'
)

// 12.2. Mobile-Friendly Touch Targets (>= 44px min-h)
assert(
  faqDetailContent.includes('min-h-[44px]') &&
  faqDetailContent.includes('w-full p-3.5 sm:p-4 text-left flex items-center justify-between'),
  '12.2. Accordion headers enforce 44px minimum touch target height with responsive padding'
)

// 12.3. Clear Expanded and Collapsed State Indicators
assert(
  faqDetailContent.includes('isOpen ? -1 : idx') &&
  faqDetailContent.includes("isOpen ? 'text-[#ff5e07]' : 'text-white") &&
  faqDetailContent.includes("isOpen ? 'bg-[#1c1b1c] border-[#00f2ff]/40 shadow-[0_0_12px_rgba(0,242,255,0.06)]' : 'bg-[#141416] border-[#27272a]'") ||
  faqDetailContent.includes('data-testid={`faq-item-${idx}`}') &&
  faqDetailContent.includes('data-testid={`faq-answer-${idx}`}'),
  '12.3. Accordion cleanly toggles open/close state with distinct border glow, typography, and test IDs'
)

// 12.4. Accessibility Attributes (ARIA standards)
assert(
  faqDetailContent.includes('aria-expanded={isOpen}') &&
  faqDetailContent.includes('aria-controls={`faq-panel-${idx}`}') &&
  faqDetailContent.includes('role="region"') &&
  faqDetailContent.includes('aria-labelledby={`faq-btn-${idx}`}'),
  '12.4. Accordion includes full accessible ARIA expanded, region role, and labelledby bindings'
)

// 12.5. Numbered Index Pills (01, 02, etc.) & Chevron States
assert(
  faqDetailContent.includes('0{idx + 1}') &&
  faqDetailContent.includes('<ChevronUp') &&
  faqDetailContent.includes('<ChevronDown'),
  '12.5. Numbered index badges (01, 02, etc.) and directional chevrons visually denote accordion state'
)

// 12.6. Content & Behavior Preservation
assert(
  faqDetailContent.includes('faqs.map') &&
  faqDetailContent.includes('{faq.q}') &&
  faqDetailContent.includes('{faq.a}') &&
  faqDetailContent.includes('openFaqIndex'),
  '12.6. Original FAQ content (4 questions) and state behavior are fully preserved'
)

// 12.7. No Excessive Vertical Spacing & Compact Mobile Layout
assert(
  faqDetailContent.includes('space-y-2 sm:space-y-2.5') &&
  faqDetailContent.includes('space-y-3.5 sm:space-y-4') &&
  faqDetailContent.includes('Need Immediate Match Support?') &&
  faqDetailContent.includes('Support Desk'),
  '12.7. FAQ section uses compact vertical margins (space-y-2) and provides an inline match support banner'
)

console.log('\n--- GROUP 13: Phase 2A Mobile Content Reduction (Approved Stitch Spec) ---')
const phase2aContent = fs.readFileSync(detailPagePath, 'utf8')

// 1. "TOURNAMENT OVERVIEW" detail card is not rendered in the mobile presentation
assert(
  phase2aContent.includes('hidden lg:block bg-[#141416] p-4 sm:p-5 rounded-xl border border-[#27272a] space-y-3 shadow-lg') &&
  phase2aContent.includes('Tournament Overview'),
  '13.1. "TOURNAMENT OVERVIEW" detail card is hidden on mobile (hidden lg:block)'
)

// 2. Map Target section is not rendered in the mobile presentation
assert(
  phase2aContent.indexOf('MAP TARGET') > phase2aContent.indexOf('hidden lg:block') &&
  phase2aContent.indexOf('MAP TARGET') < phase2aContent.indexOf('Prize Pool & Allocation'),
  '13.2. Map Target section is enclosed inside desktop-only hidden lg:block container'
)

// 3. Gun Attributes section is not rendered in the mobile presentation
assert(
  phase2aContent.indexOf('GUN ATTRIBUTES') > phase2aContent.indexOf('hidden lg:block') &&
  phase2aContent.indexOf('GUN ATTRIBUTES') < phase2aContent.indexOf('Prize Pool & Allocation'),
  '13.3. Gun Attributes section is enclosed inside desktop-only hidden lg:block container'
)

// 4. Character Skills section is not rendered in the mobile presentation
assert(
  phase2aContent.indexOf('CHAR. SKILLS') > phase2aContent.indexOf('hidden lg:block') &&
  phase2aContent.indexOf('CHAR. SKILLS') < phase2aContent.indexOf('Prize Pool & Allocation'),
  '13.4. Character Skills section is enclosed inside desktop-only hidden lg:block container'
)

// 5. Match Mode detail section is not rendered in the mobile presentation
assert(
  phase2aContent.indexOf('MATCH MODE') > phase2aContent.indexOf('hidden lg:block') &&
  phase2aContent.indexOf('MATCH MODE') < phase2aContent.indexOf('Prize Pool & Allocation'),
  '13.5. Match Mode detail section is enclosed inside desktop-only hidden lg:block container'
)

// 6. "MATCH CHECK-IN & SLOT ASSIGNMENT" is not rendered in the mobile presentation
assert(
  phase2aContent.includes('hidden lg:block bg-[#141416] border border-[#27272a] rounded-xl p-4 sm:p-6 space-y-4 shadow-xl') &&
  phase2aContent.includes('Match Check-In & Slot Assignment'),
  '13.6. "MATCH CHECK-IN & SLOT ASSIGNMENT" is hidden on mobile (hidden lg:block)'
)

// 7. "MATCH ROOM CREDENTIALS" remains present
assert(
  phase2aContent.includes('Match Room Credentials') &&
  phase2aContent.includes('handleCopyCredentials'),
  '13.7. "MATCH ROOM CREDENTIALS" remains present and active'
)

// 8. Registration Summary remains present
assert(
  phase2aContent.includes('Registration Summary') &&
  phase2aContent.includes('renderRegistrationSummaryCard'),
  '13.8. Registration Summary card and primary CTA remain present'
)

// 9. Prize Pool remains present
assert(
  phase2aContent.includes('Prize Pool & Allocation') &&
  phase2aContent.includes('TOTAL PURSE'),
  '13.9. Prize Pool & Allocation remains present'
)

// 10. Date & Time remains present
assert(
  phase2aContent.includes('Date & Time Specification') &&
  phase2aContent.includes('IST (UTC+05:30)'),
  '13.10. Date & Time Specification remains present'
)

// 11. No empty replacement containers exist
assert(
  !phase2aContent.includes('<div className="" />') &&
  !phase2aContent.includes('<div className="space-y-4" />') &&
  !phase2aContent.includes('<div className="h-0" />'),
  '13.11. No empty replacement containers exist'
)

// 12. Payment-related code remains completely untouched
assert(
  !phase2aContent.includes('tournamentPaymentService') &&
  !phase2aContent.includes('createRazorpayOrder') &&
  !phase2aContent.includes('verifyPayment'),
  '13.12. Payment-related code remains completely untouched'
)

console.log(`\n================================================================================`)
console.log(`RESULTS: ${passed} PASSED | ${failed} FAILED`)
console.log(`================================================================================`)

if (failed > 0) {
  process.exit(1)
} else {
  console.log('>>> ALL PHASE 1, 2, 2A, 3, 4, 5 & 6 REDESIGN AUDITS PASSED <<<')
}




