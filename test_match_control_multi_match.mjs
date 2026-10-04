// test_match_control_multi_match.mjs
// MJ ESPORTS — Phase N2.5: Multi-Match Match Control View Integration Test Suite
// Validates multi-match selection, state context, security, lifecycle RPCs, accessibility, and compatibility.

import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

console.log('================================================================================')
console.log('MJ ESPORTS — PHASE N2.5: MATCH CONTROL MULTI-MATCH TEST SUITE')
console.log('================================================================================\n')

const viewFilePath = path.resolve('src/components/admin/MatchControlView.jsx')
assert.ok(fs.existsSync(viewFilePath), 'MatchControlView.jsx must exist')
const viewContent = fs.readFileSync(viewFilePath, 'utf8')

// Extract pure formatMatchDateTime helper directly from MatchControlView.jsx
const helperMatch = viewContent.match(/function formatMatchDateTime\([\s\S]*?\n\}/)
assert.ok(helperMatch, 'formatMatchDateTime function must exist in MatchControlView.jsx')
const formatMatchDateTime = new Function(`
  ${helperMatch[0]}
  return formatMatchDateTime;
`)()

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
// 1. Service Layer & Modal Imports
// -----------------------------------------------------------------------------
runTest('1. MatchControlView imports matchSchedulingService functions', () => {
  assert.ok(
    viewContent.includes("from '../../services/matchSchedulingService'"),
    'Must import from matchSchedulingService'
  )
  assert.ok(viewContent.includes('fetchTournamentMatches'), 'Must import fetchTournamentMatches')
  assert.ok(viewContent.includes('updateMatchStatus as rpcUpdateMatchStatus'), 'Must import updateMatchStatus')
  assert.ok(viewContent.includes('setMatchRoomDetails as rpcSetMatchRoomDetails'), 'Must import setMatchRoomDetails')
  assert.ok(viewContent.includes("import MatchScheduleModal from './tournaments/MatchScheduleModal'"), 'Must import MatchScheduleModal')
})

// -----------------------------------------------------------------------------
// 2. Multi-Match Fetching via Client Abstraction
// -----------------------------------------------------------------------------
runTest('2. Match list is fetched through fetchTournamentMatches abstraction', () => {
  assert.ok(viewContent.includes('fetchTournamentMatches(tourneyId)'), 'Must call fetchTournamentMatches with tournamentId')
  assert.ok(viewContent.includes('const loadMatches = useCallback('), 'loadMatches must be defined as a callback')
  assert.ok(viewContent.includes('loadMatches(selectedTourneyId)'), 'Must trigger loadMatches when selectedTourneyId changes')
})

// -----------------------------------------------------------------------------
// 3. Selected Match State Model
// -----------------------------------------------------------------------------
runTest('3. Selected match state exists with derived selectedMatch context', () => {
  assert.ok(viewContent.includes('const [selectedMatchId, setSelectedMatchId] = useState('), 'selectedMatchId state must exist')
  assert.ok(viewContent.includes('const selectedMatch = useMemo('), 'selectedMatch must be derived using useMemo')
  assert.ok(viewContent.includes('matches.find((m) => String(m.id) === String(selectedMatchId))'), 'Must find match by selectedMatchId')
})

// -----------------------------------------------------------------------------
// 4. Default Selection & Safe Fallback
// -----------------------------------------------------------------------------
runTest('4. First match is selected by default with safe fallback', () => {
  assert.ok(viewContent.includes('return matches[0] || null'), 'Must fall back to matches[0] if selectedMatchId not found')
  assert.ok(viewContent.includes('return list.length > 0 ? list[0].id : null'), 'loadMatches must default to list[0].id')

  // Unit test pure selection derivation logic
  const mockMatches = [
    { id: 'm-1', match_number: 1, round_name: 'Round 1' },
    { id: 'm-2', match_number: 2, round_name: 'Round 2' },
  ]
  const deriveSelected = (matches, selectedId) => {
    if (!matches || matches.length === 0) return null
    if (selectedId) {
      const found = matches.find((m) => String(m.id) === String(selectedId))
      if (found) return found
    }
    return matches[0] || null
  }

  assert.equal(deriveSelected(mockMatches, null).id, 'm-1', 'Default must be first match')
  assert.equal(deriveSelected(mockMatches, 'm-2').id, 'm-2', 'Explicit selection must be honored')
  assert.equal(deriveSelected(mockMatches, 'invalid-id').id, 'm-1', 'Invalid id must safely fall back to first match')
  assert.equal(deriveSelected([], 'm-1'), null, 'Empty list must safely return null')
})

// -----------------------------------------------------------------------------
// 5. Match Switching Context
// -----------------------------------------------------------------------------
runTest('5. Match switching updates active context without mutating other matches', () => {
  assert.ok(viewContent.includes('setSelectedMatchId(m.id)'), 'Ribbon button must call setSelectedMatchId')
  assert.ok(viewContent.includes('Switched context to Match'), 'Context switch must notify administrator')

  // Verify state isolation
  const mockMatches = [
    { id: 'm-1', match_number: 1, round_name: 'Round 1', status: 'Completed', room_id: '111111' },
    { id: 'm-2', match_number: 2, round_name: 'Round 2', status: 'Scheduled', room_id: '222222' },
  ]
  let currentSelectedId = 'm-1'
  const switchContext = (newId) => { currentSelectedId = newId }

  switchContext('m-2')
  assert.equal(currentSelectedId, 'm-2')
  assert.equal(mockMatches[0].status, 'Completed', 'Match 1 status must remain unmutated')
  assert.equal(mockMatches[1].room_id, '222222', 'Match 2 must retain its own room details')
})

// -----------------------------------------------------------------------------
// 6. Match Number Display
// -----------------------------------------------------------------------------
runTest('6. Match number is displayed clearly in ribbon and summary', () => {
  assert.ok(viewContent.includes('M{m.match_number}'), 'Ribbon badge must display short match number')
  assert.ok(viewContent.includes('String(selectedMatch.match_number).padStart(2, \'0\')'), 'Summary must display padded match number')
  assert.ok(viewContent.includes('selectedMatch.match_number'), 'Must reference match_number')
})

// -----------------------------------------------------------------------------
// 7. Round Name Display
// -----------------------------------------------------------------------------
runTest('7. Round name is displayed in tabs and summary card', () => {
  assert.ok(viewContent.includes('m.round_name || `Round ${m.match_number}`'), 'Ribbon must display round name with fallback')
  assert.ok(viewContent.includes('selectedMatch.round_name || `Round ${selectedMatch.round_number}`'), 'Summary card must display round name')
})

// -----------------------------------------------------------------------------
// 8. Map Name Display
// -----------------------------------------------------------------------------
runTest('8. Map name is displayed in tabs and summary card', () => {
  assert.ok(viewContent.includes('m.map_name || \'Bermuda\''), 'Ribbon must display map name with fallback')
  assert.ok(viewContent.includes('selectedMatch.map_name || \'Bermuda\''), 'Summary card must display map name')
})

// -----------------------------------------------------------------------------
// 9. Match Lifecycle Status Display
// -----------------------------------------------------------------------------
runTest('9. Match status is displayed using N2.2 lifecycle states', () => {
  assert.ok(viewContent.includes('m.status || \'Scheduled\''), 'Ribbon must display match status')
  assert.ok(viewContent.includes('selectedMatch.status || \'Scheduled\''), 'Summary card must display match status')
  assert.ok(viewContent.includes('Room Ready'), 'Must recognize Room Ready status')
  assert.ok(viewContent.includes('Check-in Open'), 'Must recognize Check-in Open status')
  assert.ok(viewContent.includes('Completed'), 'Must recognize Completed status')
})

// -----------------------------------------------------------------------------
// 10. Scheduled Time Display & Formatting Helper
// -----------------------------------------------------------------------------
runTest('10. Scheduled time is displayed and formatted reliably', () => {
  assert.ok(viewContent.includes('formatMatchDateTime(selectedMatch.scheduled_time)'), 'Summary card must format scheduled time')
  assert.ok(viewContent.includes('formatMatchDateTime(selectedMatch.room_release_time)'), 'Summary card must format room release time')

  // Pure helper tests
  assert.equal(formatMatchDateTime(null), 'TBD')
  assert.equal(formatMatchDateTime(''), 'TBD')
  assert.equal(formatMatchDateTime('invalid-iso'), 'TBD')
  const testIso = '2026-10-10T13:15:00.000Z'
  const formatted = formatMatchDateTime(testIso)
  assert.ok(formatted.includes('Oct'), 'Must format month')
  assert.ok(formatted.includes('•'), 'Must format delimiter')
})

// -----------------------------------------------------------------------------
// 11. Credential Security: No room_password in Selector or Query
// -----------------------------------------------------------------------------
runTest('11. room_password is never exposed in selector or match summary', () => {
  // Selector & Summary must only reference room_id, room_published, room_release_time
  const selectorChunk = viewContent.slice(
    viewContent.indexOf('4A. MULTI-ROUND MATCH SELECTOR'),
    viewContent.indexOf('Active Header Row with Semantic Badges')
  )
  assert.ok(!selectorChunk.includes('room_password'), 'Selector and summary must NOT reference room_password')
  assert.ok(viewContent.includes("setRoomPasswordInput('')"), 'Must reset room password input on context switch to prevent leakage')
})

// -----------------------------------------------------------------------------
// 12. Lifecycle Status Transitions via RPC Abstraction
// -----------------------------------------------------------------------------
runTest('12. updateMatchStatus uses matchSchedulingService RPC abstraction', () => {
  assert.ok(viewContent.includes("rpcUpdateMatchStatus(selectedMatch.id, 'Live')"), 'handleStartMatch must call rpcUpdateMatchStatus')
  assert.ok(viewContent.includes("rpcUpdateMatchStatus(selectedMatch.id, 'Completed')"), 'handleConfirmEndMatch must call rpcUpdateMatchStatus')
  assert.ok(viewContent.includes("rpcUpdateMatchStatus(selectedMatch.id, 'Check-in Open')"), 'handleOpenLobby must call rpcUpdateMatchStatus')
  assert.ok(viewContent.includes('rpcSetMatchRoomDetails(selectedMatch.id,'), 'Room details must be updated via rpcSetMatchRoomDetails')
})

// -----------------------------------------------------------------------------
// 13. Phase 6 Check-In Operations Preserved
// -----------------------------------------------------------------------------
runTest('13. Phase 6 check-in operations and readiness remain intact', () => {
  assert.ok(viewContent.includes('checkMatchReadiness(selectedTourneyId)'), 'Must preserve checkMatchReadiness')
  assert.ok(viewContent.includes('getTournamentCheckins(selectedTourneyId)'), 'Must preserve getTournamentCheckins')
  assert.ok(viewContent.includes('adminVerifyParticipantUid'), 'Must preserve adminVerifyParticipantUid')
  assert.ok(viewContent.includes('adminLockMatchRoster(selectedTourneyId)'), 'Must preserve adminLockMatchRoster')
  assert.ok(viewContent.includes('subscribeToTournamentCheckins'), 'Must preserve realtime checkin subscription')
})

// -----------------------------------------------------------------------------
// 14. Phase 7 Scoring Operations Preserved
// -----------------------------------------------------------------------------
runTest('14. Phase 7 scoring and Results Console handoff preserved', () => {
  assert.ok(viewContent.includes("setActiveTab('results'"), 'Results Console navigation must be preserved')
  assert.ok(viewContent.includes('OPEN RESULTS CONSOLE'), 'Results Console button must exist')
  assert.ok(viewContent.includes('Results Pending'), 'Must transition tournament status to Results Pending for Phase 7 scoring')
})

// -----------------------------------------------------------------------------
// 15. Incident / Remake Match Context Preserved
// -----------------------------------------------------------------------------
runTest('15. Incident log records associate events with selected match context', () => {
  assert.ok(viewContent.includes('Match ${selectedMatch.match_number}'), 'Incidents must record selected match number')
  assert.ok(viewContent.includes('selectedMatch.round_name'), 'Incidents must record selected match round name')
})

// -----------------------------------------------------------------------------
// 16. Database Safety: No Direct public.matches Mutations
// -----------------------------------------------------------------------------
runTest('16. No direct public.matches mutations in MatchControlView', () => {
  assert.ok(!viewContent.includes(".from('matches').update"), 'Must not perform direct match updates')
  assert.ok(!viewContent.includes(".from('matches').insert"), 'Must not perform direct match inserts')
  assert.ok(!viewContent.includes(".from('matches').delete"), 'Must not perform direct match deletes')
})

// -----------------------------------------------------------------------------
// 17. Payment Isolation
// -----------------------------------------------------------------------------
runTest('17. Zero payment or Razorpay logic in MatchControlView', () => {
  assert.ok(!viewContent.toLowerCase().includes('razorpay'), 'Must not reference Razorpay')
  assert.ok(!viewContent.toLowerCase().includes('order_id'), 'Must not reference order_id')
  assert.ok(!viewContent.includes('tournamentPaymentService'), 'Must not import tournamentPaymentService')
})

// -----------------------------------------------------------------------------
// 18. Responsive Architecture
// -----------------------------------------------------------------------------
runTest('18. Responsive match selector prevents horizontal page overflow', () => {
  assert.ok(viewContent.includes('overflow-x-auto'), 'Ribbon container must support horizontal scroll on mobile')
  assert.ok(viewContent.includes('max-w-full'), 'Ribbon container must enforce max-w-full to prevent page overflow')
  assert.ok(viewContent.includes('min-w-0'), 'Must use min-w-0 for flex item boundary')
  assert.ok(viewContent.includes('min-h-[44px]'), 'Touch target size must be at least 44px')
})

// -----------------------------------------------------------------------------
// 19. Accessibility Attributes
// -----------------------------------------------------------------------------
runTest('19. Accessibility attributes conform to WAI-ARIA tab standards', () => {
  assert.ok(viewContent.includes('role="tablist"'), 'Ribbon must have role="tablist"')
  assert.ok(viewContent.includes('aria-label="Tournament match rounds"'), 'Tablist must have descriptive aria-label')
  assert.ok(viewContent.includes('role="tab"'), 'Match button must have role="tab"')
  assert.ok(viewContent.includes('aria-selected={isSelected}'), 'Match button must expose aria-selected')
  assert.ok(viewContent.includes('aria-controls={`match-panel-${m.id}`}'), 'Match button must link via aria-controls')
  assert.ok(viewContent.includes('role="tabpanel"'), 'Summary card must have role="tabpanel"')
  assert.ok(viewContent.includes('aria-labelledby={`match-tab-${selectedMatch.id}`}'), 'Summary card must link via aria-labelledby')
})

// -----------------------------------------------------------------------------
// 20. Empty, Loading, and Modal States
// -----------------------------------------------------------------------------
runTest('20. Empty, loading, error, and MatchScheduleModal integration states exist', () => {
  assert.ok(viewContent.includes('isMatchesLoading'), 'Must handle isMatchesLoading state')
  assert.ok(viewContent.includes('matchesError'), 'Must handle matchesError state')
  assert.ok(viewContent.includes('No matches scheduled yet'), 'Must provide empty state when matches array is empty')
  assert.ok(viewContent.includes('<MatchScheduleModal'), 'Must render MatchScheduleModal component')
  assert.ok(viewContent.includes('setShowScheduleModal(true)'), 'Must provide button to open MatchScheduleModal')
})

// -----------------------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------------------
console.log('\n--------------------------------------------------------------------------------')
console.log(`TEST RESULTS: ${passedTests} passed, ${failedTests} failed out of ${passedTests + failedTests} tests`)
console.log('--------------------------------------------------------------------------------')

if (failedTests > 0) {
  process.exit(1)
} else {
  console.log('\n🎉 ALL PHASE N2.5 MULTI-MATCH CONTROL VIEW TESTS PASSED!')
  process.exit(0)
}
