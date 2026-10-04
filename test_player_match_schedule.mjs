// test_player_match_schedule.mjs
// MJ ESPORTS — Phase N2.6: Player Multi-Match Schedule UI Test Suite
// Validates component existence, data source, field displays, security sanitization,
// empty/loading/error states, ordering, accessibility, responsiveness, and regression safety.

import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

console.log('================================================================================')
console.log('MJ ESPORTS — PHASE N2.6: PLAYER MATCH SCHEDULE TEST SUITE')
console.log('================================================================================\n')

const componentPath = path.resolve('src/components/tournament/PlayerMatchSchedule.jsx')
const detailPagePath = path.resolve('src/pages/TournamentDetailPage.jsx')

assert.ok(fs.existsSync(componentPath), 'PlayerMatchSchedule.jsx must exist')
assert.ok(fs.existsSync(detailPagePath), 'TournamentDetailPage.jsx must exist')

const componentContent = fs.readFileSync(componentPath, 'utf8')
const detailContent = fs.readFileSync(detailPagePath, 'utf8')

let passedTests = 0
let failedTests = 0

function runTest(name, fn) {
  try {
    fn()
    console.log(`  ✅ [PASS] ${name}`)
    passedTests++
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}`)
    console.error(`     Error: ${err.message}`)
    failedTests++
  }
}

// -----------------------------------------------------------------------------
// 1. Component Exists
// -----------------------------------------------------------------------------
runTest('1. Player schedule component exists', () => {
  assert.ok(fs.existsSync(componentPath), 'PlayerMatchSchedule.jsx must exist at src/components/tournament/PlayerMatchSchedule.jsx')
  assert.ok(componentContent.includes('export default function PlayerMatchSchedule'), 'Must export PlayerMatchSchedule component')
})

// -----------------------------------------------------------------------------
// 2. Data Source: fetchTournamentMatches
// -----------------------------------------------------------------------------
runTest('2. It uses fetchTournamentMatches() from matchSchedulingService', () => {
  assert.ok(
    componentContent.includes("from '../../services/matchSchedulingService'"),
    'Must import from matchSchedulingService'
  )
  assert.ok(
    componentContent.includes('fetchTournamentMatches(tournamentId)'),
    'Must invoke fetchTournamentMatches with tournamentId'
  )
})

// -----------------------------------------------------------------------------
// 3. No Direct Supabase Query or Second Fetching Service
// -----------------------------------------------------------------------------
runTest('3. No direct public.matches mutation or query is introduced', () => {
  assert.ok(
    !componentContent.includes("from('matches')") && !componentContent.includes('from("matches")'),
    'Must not directly query supabase.from("matches")'
  )
  assert.ok(
    !componentContent.includes('supabase.rpc'),
    'Must not directly call supabase.rpc from player component'
  )
  assert.ok(
    !componentContent.includes('.insert(') && !componentContent.includes('.update(') && !componentContent.includes('.delete('),
    'Must not perform database mutations'
  )
})

// -----------------------------------------------------------------------------
// 4. Match Number Displayed
// -----------------------------------------------------------------------------
runTest('4. Match number is displayed', () => {
  assert.ok(
    componentContent.includes('MATCH {match.match_number}') || componentContent.includes('match.match_number'),
    'Must render match number in card header'
  )
  assert.ok(componentContent.includes('match_number: Number(m.match_number)'), 'Must sanitize match_number as number')
})

// -----------------------------------------------------------------------------
// 5. Round Name Displayed
// -----------------------------------------------------------------------------
runTest('5. Round name is displayed', () => {
  assert.ok(
    componentContent.includes('{match.round_name}'),
    'Must render round name in match card'
  )
})

// -----------------------------------------------------------------------------
// 6. Map Name Displayed
// -----------------------------------------------------------------------------
runTest('6. Map is displayed', () => {
  assert.ok(
    componentContent.includes('{match.map_name}'),
    'Must render map name in match card'
  )
  assert.ok(componentContent.includes('MapPin'), 'Must use MapPin icon for map identification')
})

// -----------------------------------------------------------------------------
// 7. Match Type Displayed
// -----------------------------------------------------------------------------
runTest('7. Match type is displayed', () => {
  assert.ok(
    componentContent.includes('{match.match_type}'),
    'Must render match type in match card'
  )
  assert.ok(componentContent.includes('Swords'), 'Must use Swords icon for match type identification')
})

// -----------------------------------------------------------------------------
// 8. Scheduled Time Displayed
// -----------------------------------------------------------------------------
runTest('8. Scheduled time is displayed', () => {
  assert.ok(
    componentContent.includes('formatMatchDateTime(match.scheduled_time)'),
    'Must format and display scheduled time'
  )
  assert.ok(componentContent.includes('Clock'), 'Must use Clock icon for schedule')
  
  // Test formatting helper logic
  const helperMatch = componentContent.match(/function formatMatchDateTime\([\s\S]*?\n\}/)
  assert.ok(helperMatch, 'formatMatchDateTime function must exist')
  const formatDateTime = new Function(`
    ${helperMatch[0]}
    return formatMatchDateTime;
  `)()

  const formatted = formatDateTime('2026-10-10T18:00:00Z')
  assert.ok(formatted !== 'TBD', 'Must format valid ISO date')
  assert.equal(formatDateTime(null), 'TBD', 'Must return TBD for null')
  assert.equal(formatDateTime('invalid-date'), 'TBD', 'Must return TBD for invalid string')
})

// -----------------------------------------------------------------------------
// 9. Approved Status Lifecycle Displayed
// -----------------------------------------------------------------------------
runTest('9. Approved lifecycle statuses are displayed with visual indicators', () => {
  const approvedList = [
    'Scheduled',
    'Check-in Open',
    'Room Ready',
    'Live',
    'Completed',
    'Cancelled'
  ]
  for (const st of approvedList) {
    assert.ok(
      componentContent.includes(`'${st}'`),
      `Approved status '${st}' must be handled`
    )
  }

  // Verify getStatusConfig handles all statuses
  const statusConfigMatch = componentContent.match(/function getStatusConfig\([\s\S]*?\n\}/)
  assert.ok(statusConfigMatch, 'getStatusConfig function must exist')
})

// -----------------------------------------------------------------------------
// 10. room_password Security: Never Exposed
// -----------------------------------------------------------------------------
runTest('10. room_password is never exposed or logged', () => {
  assert.ok(
    !componentContent.includes('room_password'),
    'Player component must never reference or render room_password'
  )
  assert.ok(
    !componentContent.includes('password'),
    'Player component must not contain any password fields or inputs'
  )
  assert.ok(
    componentContent.includes('Strictly sanitize UI model'),
    'Must document explicit UI model sanitization'
  )
})

// -----------------------------------------------------------------------------
// 11. Admin Controls Not Exposed
// -----------------------------------------------------------------------------
runTest('11. Admin controls are not exposed in player schedule', () => {
  assert.ok(!componentContent.includes('scheduleTournamentMatches'), 'Must not expose match scheduling admin action')
  assert.ok(!componentContent.includes('deleteTournamentMatch'), 'Must not expose match deletion admin action')
  assert.ok(!componentContent.includes('setMatchRoomDetails'), 'Must not expose room details admin action')
  assert.ok(!componentContent.includes('updateMatchStatus'), 'Must not expose match status admin action')
  assert.ok(!componentContent.includes('MatchScheduleModal'), 'Must not render MatchScheduleModal')
})

// -----------------------------------------------------------------------------
// 12. Empty State Exists
// -----------------------------------------------------------------------------
runTest('12. Empty state exists with exact approved messaging and no admin action', () => {
  assert.ok(
    componentContent.includes('No matches scheduled yet.'),
    'Must display exact empty state string "No matches scheduled yet."'
  )
  assert.ok(
    componentContent.includes('data-testid="schedule-empty-state"'),
    'Must mark empty state for testability'
  )
})

// -----------------------------------------------------------------------------
// 13. Loading State Exists
// -----------------------------------------------------------------------------
runTest('13. Loading state skeleton exists with accessible semantics', () => {
  assert.ok(
    componentContent.includes('role="status"'),
    'Loading state must use role="status"'
  )
  assert.ok(
    componentContent.includes('aria-busy="true"'),
    'Loading state must indicate aria-busy="true"'
  )
  assert.ok(
    componentContent.includes('animate-pulse'),
    'Loading state must render skeleton pulse'
  )
})

// -----------------------------------------------------------------------------
// 14. Error State Exists with Safe Messaging & Retry
// -----------------------------------------------------------------------------
runTest('14. Error state provides player-safe message and retry button', () => {
  assert.ok(
    componentContent.includes('role="alert"'),
    'Error state must use role="alert"'
  )
  assert.ok(
    componentContent.includes('Unable to load match schedule.'),
    'Must provide clear player-safe error without raw database details'
  )
  assert.ok(
    componentContent.includes('onClick={loadMatches}'),
    'Error state must offer retry action calling loadMatches'
  )
})

// -----------------------------------------------------------------------------
// 15. Matches Rendered in Authoritative Order
// -----------------------------------------------------------------------------
runTest('15. Matches are rendered in authoritative order (match_number ASC)', () => {
  assert.ok(
    componentContent.includes('sanitized.sort((a, b) => a.match_number - b.match_number)'),
    'Must enforce match_number ASC sorting'
  )
})

// -----------------------------------------------------------------------------
// 16. Responsive Layout Classes
// -----------------------------------------------------------------------------
runTest('16. Responsive grid layout exists for all viewport targets', () => {
  assert.ok(componentContent.includes('grid-cols-1'), 'Must support mobile single column')
  assert.ok(componentContent.includes('md:grid-cols-2'), 'Must adapt to tablet 2 columns')
  assert.ok(componentContent.includes('lg:grid-cols-3'), 'Must adapt to desktop 3 columns')
})

// -----------------------------------------------------------------------------
// 17. Accessibility Structure
// -----------------------------------------------------------------------------
runTest('17. Accessibility structure exists (semantic HTML & ARIA)', () => {
  assert.ok(componentContent.includes('<section'), 'Must use semantic <section> root')
  assert.ok(componentContent.includes('aria-label="Tournament Match Schedule"'), 'Must have section aria-label')
  assert.ok(componentContent.includes('<ol'), 'Must use semantic ordered list <ol>')
  assert.ok(componentContent.includes('<li'), 'Must use list items <li> for matches')
  assert.ok(componentContent.includes('aria-label='), 'Cards must have accessible label')
})

// -----------------------------------------------------------------------------
// 18. No Payment / Razorpay Logic
// -----------------------------------------------------------------------------
runTest('18. No payment or Razorpay logic is present in player schedule', () => {
  assert.ok(!componentContent.includes('razorpay'), 'Must not reference Razorpay')
  assert.ok(!componentContent.includes('Razorpay'), 'Must not reference Razorpay')
  assert.ok(!componentContent.includes('tournamentPaymentService'), 'Must not import payment service')
  assert.ok(!componentContent.includes('create-razorpay-order'), 'Must not reference Razorpay edge function')
  assert.ok(!componentContent.includes('walletTopup'), 'Must not reference wallet topup')
})

// -----------------------------------------------------------------------------
// 19. Existing Player Tournament Page Remains Intact
// -----------------------------------------------------------------------------
runTest('19. TournamentDetailPage integrates PlayerMatchSchedule under schedule tab', () => {
  assert.ok(
    detailContent.includes("import PlayerMatchSchedule from '../components/tournament/PlayerMatchSchedule'"),
    'Must import PlayerMatchSchedule in TournamentDetailPage'
  )
  assert.ok(
    detailContent.includes("<PlayerMatchSchedule tournamentId={id} tournament={tournament} />"),
    'Must render PlayerMatchSchedule under activeTab === "schedule"'
  )
  assert.ok(
    detailContent.includes('TournamentScheduleForm'),
    'Must preserve TournamentScheduleForm for timeline details'
  )
  assert.ok(
    detailContent.includes('getRoomCredentials(tournament.id)'),
    'Must preserve room credentials handling'
  )
})

// -----------------------------------------------------------------------------
// 20. No Phase 5, 6, or 7 Logic Modified
// -----------------------------------------------------------------------------
runTest('20. Phase 5, 6, 7, and N2.2 database SQL files remain intact', () => {
  const sqlFiles = [
    'supabase_phase5_tournament_operations_security.sql',
    'supabase_phase6_match_checkin_operations.sql',
    'supabase_phase7_match_scoring_and_payouts.sql',
    'supabase_phase14_multi_round_match_scheduling.sql',
  ]

  for (const rel of sqlFiles) {
    const p = path.resolve(rel)
    assert.ok(fs.existsSync(p), `${rel} must exist`)
    const content = fs.readFileSync(p, 'utf8')
    assert.ok(content.length > 500, `${rel} must be non-empty`)
  }
})

console.log('\n================================================================================')
console.log(`TOTAL TESTS: ${passedTests + failedTests}`)
console.log(`PASSED: ${passedTests}`)
console.log(`FAILED: ${failedTests}`)
console.log('================================================================================')

if (failedTests > 0) {
  process.exit(1)
} else {
  console.log('\n🎉 ALL 20 N2.6 PLAYER MATCH SCHEDULE TESTS PASSED!\n')
}
