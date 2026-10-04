// test_match_schedule_modal.mjs
// MJ ESPORTS — Phase N2.4: Match Schedule Modal Test Suite
// Validates modal architecture, dynamic match list, bounds, validation, security, and service integration.

import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

console.log('================================================================================')
console.log('MJ ESPORTS — PHASE N2.4: MATCH SCHEDULE MODAL TEST SUITE')
console.log('================================================================================\n')

const modalFilePath = path.resolve('src/components/admin/tournaments/MatchScheduleModal.jsx')
assert.ok(fs.existsSync(modalFilePath), 'MatchScheduleModal.jsx must exist')
const modalContent = fs.readFileSync(modalFilePath, 'utf8')

// Dynamically extract and instantiate pure helpers directly from MatchScheduleModal.jsx
const startIndex = modalContent.indexOf('export const SUPPORTED_MAPS')
const endIndex = modalContent.indexOf('// MAIN COMPONENT: MatchScheduleModal')
const helpersCode = modalContent
  .slice(startIndex, endIndex)
  .replace(/export\s+/g, '')

const {
  SUPPORTED_MAPS,
  SUPPORTED_MATCH_TYPES,
  MIN_MATCHES,
  MAX_MATCHES,
  MIN_SPACING_MINUTES,
  splitISODateTime,
  combineDateAndTime,
  calculateNextMatchDefaults,
  validateMatchSchedule,
} = new Function(`
  ${helpersCode}
  return {
    SUPPORTED_MAPS,
    SUPPORTED_MATCH_TYPES,
    MIN_MATCHES,
    MAX_MATCHES,
    MIN_SPACING_MINUTES,
    splitISODateTime,
    combineDateAndTime,
    calculateNextMatchDefaults,
    validateMatchSchedule
  };
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

// ============================================================================
// GROUP 1: FILE EXISTENCE & EXPORT SIGNATURES
// ============================================================================
console.log('--- GROUP 1: Component & Helper Exports ---')

runTest('1.1. Modal component default export exists', () => {
  assert.ok(
    /export\s+default\s+function\s+MatchScheduleModal/.test(modalContent),
    'MatchScheduleModal must be exported as default function'
  )
})

runTest('1.2. Exports validation and configuration constants', () => {
  assert.equal(MIN_MATCHES, 1, 'MIN_MATCHES must be 1')
  assert.equal(MAX_MATCHES, 12, 'MAX_MATCHES must be 12')
  assert.equal(MIN_SPACING_MINUTES, 15, 'MIN_SPACING_MINUTES must be 15')
})

// ============================================================================
// GROUP 2: DOMAIN CONSTANTS ALIGNMENT (N2.2 Schema Compliance)
// ============================================================================
console.log('\n--- GROUP 2: Domain Values Alignment with N2.2 ---')

runTest('2.1. Supported maps match PostgreSQL CHECK constraints', () => {
  const expectedMaps = ['Bermuda', 'Purgatory', 'Kalahari', 'Alpine', 'NeXTerra', 'Random', 'Custom']
  const actualMaps = SUPPORTED_MAPS.map((m) => m.id)
  assert.deepEqual(actualMaps.sort(), expectedMaps.sort(), 'Maps must match N2.2 supported list')
})

runTest('2.2. Supported match types match PostgreSQL valid options', () => {
  const expectedTypes = [
    'Battle Royale',
    'Clash Squad',
    'Custom',
    'Group Stage',
    'Semifinals',
    'Grand Finals',
  ]
  const actualTypes = SUPPORTED_MATCH_TYPES.map((t) => t.id)
  assert.deepEqual(actualTypes.sort(), expectedTypes.sort(), 'Match types must match N2.2 supported list')
})

// ============================================================================
// GROUP 3: DATE & TIME HELPERS
// ============================================================================
console.log('\n--- GROUP 3: Date & Time Calculation Helpers ---')

runTest('3.1. splitISODateTime parses valid ISO timestamp correctly', () => {
  const sample = '2026-10-10T18:30:00.000Z'
  const res = splitISODateTime(sample)
  assert.ok(res.date, 'Date must be present')
  assert.ok(res.time, 'Time must be present')
})

runTest('3.2. splitISODateTime gracefully handles null/empty/invalid input', () => {
  assert.deepEqual(splitISODateTime(null), { date: '', time: '' })
  assert.deepEqual(splitISODateTime(''), { date: '', time: '' })
  assert.deepEqual(splitISODateTime('invalid-string'), { date: '', time: '' })
})

runTest('3.3. combineDateAndTime creates valid ISO string', () => {
  const combined = combineDateAndTime('2026-10-10', '18:00')
  assert.ok(combined, 'Combined ISO string must not be null')
  const dateObj = new Date(combined)
  assert.equal(isNaN(dateObj.getTime()), false, 'Result must be a valid date')
})

runTest('3.4. combineDateAndTime returns null on missing or invalid inputs', () => {
  assert.equal(combineDateAndTime('', '18:00'), null)
  assert.equal(combineDateAndTime('2026-10-10', ''), null)
  assert.equal(combineDateAndTime('invalid', 'time'), null)
})

// ============================================================================
// GROUP 4: DYNAMIC MATCH CREATION & DEFAULTS
// ============================================================================
console.log('\n--- GROUP 4: Dynamic Match Defaults & Contiguity ---')

runTest('4.1. calculateNextMatchDefaults generates initial Match 1 correctly', () => {
  const match1 = calculateNextMatchDefaults([], { startDate: '2026-10-10', startTime: '18:00' })
  assert.equal(match1.match_number, 1)
  assert.equal(match1.round_number, 1)
  assert.equal(match1.round_name, 'Round 1')
  assert.equal(match1.match_type, 'Battle Royale')
  assert.equal(match1.map_name, 'Bermuda')
  assert.equal(match1.scheduled_date, '2026-10-10')
  assert.equal(match1.scheduled_time_val, '18:00')
  assert.ok(match1.scheduled_time, 'scheduled_time must be set')
  assert.ok(match1.room_release_time, 'room_release_time must be set')
})

runTest('4.2. calculateNextMatchDefaults staggers subsequent matches with >= 15 min default', () => {
  const match1 = calculateNextMatchDefaults([], { startDate: '2026-10-10', startTime: '18:00' })
  const match2 = calculateNextMatchDefaults([match1], {})
  assert.equal(match2.match_number, 2)
  assert.equal(match2.round_number, 2)
  assert.equal(match2.round_name, 'Round 2')

  const t1 = new Date(match1.scheduled_time).getTime()
  const t2 = new Date(match2.scheduled_time).getTime()
  const diffMinutes = (t2 - t1) / (60 * 1000)
  assert.ok(diffMinutes >= 15, `Interval ${diffMinutes} min must be at least 15 minutes`)
  assert.equal(diffMinutes, 45, 'Default staggered spacing should be 45 minutes')
})

runTest('4.3. calculateNextMatchDefaults defaults room release time to 15 mins prior', () => {
  const match1 = calculateNextMatchDefaults([], { startDate: '2026-10-10', startTime: '18:00' })
  const schedTime = new Date(match1.scheduled_time).getTime()
  const roomTime = new Date(match1.room_release_time).getTime()
  const diffMinutes = (schedTime - roomTime) / (60 * 1000)
  assert.equal(diffMinutes, 15, 'Room release time must default to 15 mins before scheduled time')
})

// ============================================================================
// GROUP 5: SCHEDULE VALIDATION & BUSINESS RULES
// ============================================================================
console.log('\n--- GROUP 5: Schedule Validation & Business Rules ---')

runTest('5.1. Validates valid multi-match schedule successfully', () => {
  const m1 = calculateNextMatchDefaults([], { startDate: '2026-10-10', startTime: '18:00' })
  const m2 = calculateNextMatchDefaults([m1], {})
  const m3 = calculateNextMatchDefaults([m1, m2], {})

  const res = validateMatchSchedule([m1, m2, m3])
  assert.equal(res.isValid, true, 'Clean 3-match schedule must be valid')
  assert.equal(res.errors.length, 0)
})

runTest('5.2. Enforces minimum 1 match requirement', () => {
  const res = validateMatchSchedule([])
  assert.equal(res.isValid, false)
  assert.ok(res.errors.some((e) => e.message.includes('At least 1 match must be scheduled')))
})

runTest('5.3. Enforces maximum 12 matches limit', () => {
  let list = []
  for (let i = 0; i < 13; i++) {
    list.push(calculateNextMatchDefaults(list, { startDate: '2026-10-10', startTime: '18:00' }))
  }
  const res = validateMatchSchedule(list)
  assert.equal(res.isValid, false)
  assert.ok(res.errors.some((e) => e.message.includes('at most 12 scheduled matches')))
})

runTest('5.4. Validates empty round name is rejected', () => {
  const m1 = calculateNextMatchDefaults([], { startDate: '2026-10-10', startTime: '18:00' })
  m1.round_name = '   '
  const res = validateMatchSchedule([m1])
  assert.equal(res.isValid, false)
  assert.ok(res.errors.some((e) => e.field === 'round_name'))
})

runTest('5.5. Validates invalid map selection is rejected', () => {
  const m1 = calculateNextMatchDefaults([], { startDate: '2026-10-10', startTime: '18:00' })
  m1.map_name = 'Atlantis'
  const res = validateMatchSchedule([m1])
  assert.equal(res.isValid, false)
  assert.ok(res.errors.some((e) => e.field === 'map_name'))
})

runTest('5.6. Validates invalid match type selection is rejected', () => {
  const m1 = calculateNextMatchDefaults([], { startDate: '2026-10-10', startTime: '18:00' })
  m1.match_type = 'Deathmatch 1v1'
  const res = validateMatchSchedule([m1])
  assert.equal(res.isValid, false)
  assert.ok(res.errors.some((e) => e.field === 'match_type'))
})

runTest('5.7. Enforces scheduled time required', () => {
  const m1 = calculateNextMatchDefaults([], { startDate: '2026-10-10', startTime: '18:00' })
  m1.scheduled_date = ''
  const res = validateMatchSchedule([m1])
  assert.equal(res.isValid, false)
  assert.ok(res.errors.some((e) => e.field === 'scheduled_time'))
})

runTest('5.8. Enforces chronology: Match 2 cannot start before Match 1', () => {
  const m1 = calculateNextMatchDefaults([], { startDate: '2026-10-10', startTime: '18:00' })
  const m2 = calculateNextMatchDefaults([m1], {})
  m2.scheduled_date = '2026-10-10'
  m2.scheduled_time_val = '17:00' // 1 hour earlier than m1

  const res = validateMatchSchedule([m1, m2])
  assert.equal(res.isValid, false)
  assert.ok(res.errors.some((e) => e.message.includes('cannot occur before Match 1')))
})

runTest('5.9. Enforces minimum 15-minute spacing between consecutive matches', () => {
  const m1 = calculateNextMatchDefaults([], { startDate: '2026-10-10', startTime: '18:00' })
  const m2 = calculateNextMatchDefaults([m1], {})
  m2.scheduled_date = '2026-10-10'
  m2.scheduled_time_val = '18:10' // only 10 minutes later

  const res = validateMatchSchedule([m1, m2])
  assert.equal(res.isValid, false)
  assert.ok(res.errors.some((e) => e.message.includes('must start at least 15 minutes after Match 1')))
})

runTest('5.10. Enforces room release time <= scheduled time', () => {
  const m1 = calculateNextMatchDefaults([], { startDate: '2026-10-10', startTime: '18:00' })
  m1.room_release_date = '2026-10-10'
  m1.room_release_time_val = '18:15' // 15 mins after match start

  const res = validateMatchSchedule([m1])
  assert.equal(res.isValid, false)
  assert.ok(
    res.errors.some((e) => e.message.includes('Room release time cannot be after the scheduled match time'))
  )
})

// ============================================================================
// GROUP 6: SERVICE LAYER INTEGRATION & SECURITY
// ============================================================================
console.log('\n--- GROUP 6: Service Integration & Security Invariants ---')

runTest('6.1. Uses fetchTournamentMatches for reading existing matches', () => {
  assert.ok(
    /import\s*\{[^}]*fetchTournamentMatches[^}]*\}\s*from\s*['"][^'"]*matchSchedulingService['"]/.test(
      modalContent
    ),
    'Must import fetchTournamentMatches from matchSchedulingService'
  )
  assert.ok(modalContent.includes('fetchTournamentMatches(tournamentId)'))
})

runTest('6.2. Uses scheduleTournamentMatches for persistence', () => {
  assert.ok(
    /import\s*\{[^}]*scheduleTournamentMatches[^}]*\}\s*from\s*['"][^'"]*matchSchedulingService['"]/.test(
      modalContent
    ),
    'Must import scheduleTournamentMatches from matchSchedulingService'
  )
  assert.ok(modalContent.includes('scheduleTournamentMatches(tournamentId, payload)'))
})

runTest('6.3. Uses deleteTournamentMatch for persisted match removal', () => {
  assert.ok(
    /import\s*\{[^}]*deleteTournamentMatch[^}]*\}\s*from\s*['"][^'"]*matchSchedulingService['"]/.test(
      modalContent
    ),
    'Must import deleteTournamentMatch from matchSchedulingService'
  )
  assert.ok(modalContent.includes('deleteTournamentMatch('))
})

runTest('6.4. NO direct public.matches or Supabase client mutations in modal component', () => {
  assert.ok(!modalContent.includes("from('matches')"), 'No direct Supabase queries to matches table')
  assert.ok(!modalContent.includes("supabase.from"), 'No supabase.from calls')
  assert.ok(!modalContent.includes("supabase.rpc"), 'No direct supabase.rpc calls in UI modal')
})

runTest('6.5. room_password is never exposed or rendered in MatchScheduleModal', () => {
  assert.ok(!modalContent.includes('room_password'), 'room_password must not be present')
  assert.ok(!modalContent.includes('roomPassword'), 'roomPassword must not be present')
})

runTest('6.6. Zero payment code or references present in MatchScheduleModal', () => {
  const forbiddenPaymentTerms = ['razorpay', 'wallet', 'payout', 'SlotBookingModal', 'deposit']
  for (const term of forbiddenPaymentTerms) {
    assert.ok(
      !modalContent.toLowerCase().includes(term),
      `MatchScheduleModal must not contain payment term: ${term}`
    )
  }
})

// ============================================================================
// GROUP 7: UI ARCHITECTURE, RESPONSIVENESS & ACCESSIBILITY
// ============================================================================
console.log('\n--- GROUP 7: UI Architecture, Responsive Styles & Accessibility ---')

runTest('7.1. Dialog role and aria-modal attributes are present', () => {
  assert.ok(modalContent.includes('role="dialog"'))
  assert.ok(modalContent.includes('aria-modal="true"'))
  assert.ok(modalContent.includes('aria-labelledby="modal-schedule-title"'))
})

runTest('7.2. All form controls have associated accessible labels or aria-labels', () => {
  assert.ok(modalContent.includes('htmlFor={`round-name-${idx}`}') || modalContent.includes('id={`round-name-${idx}`}'))
  assert.ok(modalContent.includes('htmlFor={`match-type-${idx}`}') || modalContent.includes('id={`match-type-${idx}`}'))
  assert.ok(modalContent.includes('htmlFor={`map-name-${idx}`}') || modalContent.includes('id={`map-name-${idx}`}'))
  assert.ok(modalContent.includes('aria-label={`Match ${idx + 1} Scheduled Date`}'))
  assert.ok(modalContent.includes('aria-label={`Match ${idx + 1} Scheduled Time`}'))
})

runTest('7.3. Interactive touch targets satisfy min-h-[44px]', () => {
  assert.ok(modalContent.includes('min-h-[44px]'), 'Must include min-h-[44px] touch target class')
})

runTest('7.4. Docked footer actions present with Cancel and Save Schedule buttons', () => {
  assert.ok(modalContent.includes('Save Schedule'))
  assert.ok(modalContent.includes('Cancel'))
})

runTest('7.5. Submission state and double-submit prevention implemented', () => {
  assert.ok(modalContent.includes('Saving Schedule...'))
  assert.ok(modalContent.includes('disabled={isSaving'))
  assert.ok(modalContent.includes('if (isSaving) return'))
})

runTest('7.6. Responsive layout classes present for mobile, tablet, and desktop', () => {
  assert.ok(modalContent.includes('grid-cols-1'))
  assert.ok(modalContent.includes('sm:grid-cols-2'))
  assert.ok(modalContent.includes('lg:grid-cols-3'))
  assert.ok(modalContent.includes('overflow-y-auto'))
})

// ============================================================================
// SUMMARY
// ============================================================================
console.log('\n================================================================================')
console.log(`TEST RESULTS: ${passedTests} Passed, ${failedTests} Failed`)
console.log('================================================================================')

if (failedTests > 0) {
  process.exit(1)
}
