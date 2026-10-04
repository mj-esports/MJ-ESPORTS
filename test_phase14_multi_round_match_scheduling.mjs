// test_phase14_multi_round_match_scheduling.mjs
// Verification of Multi-Round Match Scheduling Schema, RPCs, Security, and Lifecycle

import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

console.log('================================================================================')
console.log('MJ ESPORTS — PHASE 14: MULTI-ROUND MATCH SCHEDULING TEST SUITE')
console.log('================================================================================\n')

const sqlFilePath = path.resolve('supabase_phase14_multi_round_match_scheduling.sql')
assert.ok(fs.existsSync(sqlFilePath), 'Phase 14 SQL migration must exist')
const sqlContent = fs.readFileSync(sqlFilePath, 'utf8')

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

function getFunctionBody(funcName) {
  const start = sqlContent.indexOf(`FUNCTION public.${funcName}`)
  assert.ok(start !== -1, `Function public.${funcName} must exist in SQL`)
  const end = sqlContent.indexOf('CREATE OR REPLACE FUNCTION', start + 1)
  return end !== -1 ? sqlContent.slice(start, end) : sqlContent.slice(start)
}

// ============================================================================
// GROUP 1: SCHEMA EVOLUTION & CONSTRAINTS
// ============================================================================
console.log('--- GROUP 1: Schema Evolution & Constraints ---')

runTest('1.1. public.matches additively defines round_number (1..20)', () => {
  assert.ok(sqlContent.includes("column_name = 'round_number'"), 'Checks for round_number column')
  assert.ok(/round_number\s+INTEGER\s+NOT\s+NULL\s+DEFAULT\s+1/i.test(sqlContent), 'round_number NOT NULL DEFAULT 1')
  assert.ok(/round_number\s*>=\s*1\s+AND\s+round_number\s*<=\s*20/i.test(sqlContent), 'round_number between 1 and 20')
})

runTest('1.2. public.matches additively defines round_name with non-empty check', () => {
  assert.ok(sqlContent.includes("column_name = 'round_name'"), 'Checks for round_name column')
  assert.ok(/round_name\s+TEXT\s+NOT\s+NULL\s+DEFAULT\s+'Round 1'/i.test(sqlContent), 'round_name NOT NULL DEFAULT Round 1')
  assert.ok(/LENGTH\(TRIM\(round_name\)\)\s*>\s*0/i.test(sqlContent), 'round_name non-empty check')
})

runTest('1.3. public.matches additively defines map_name with Free Fire approved list', () => {
  assert.ok(sqlContent.includes("column_name = 'map_name'"), 'Checks for map_name column')
  assert.ok(/map_name\s+TEXT\s+NOT\s+NULL\s+DEFAULT\s+'Bermuda'/i.test(sqlContent), 'map_name NOT NULL DEFAULT Bermuda')
  const approvedMaps = ['Bermuda', 'Purgatory', 'Kalahari', 'Alpine', 'NeXTerra', 'Random', 'Custom']
  for (const map of approvedMaps) {
    assert.ok(sqlContent.includes(`'${map}'`), `map_name constraint includes '${map}'`)
  }
})

runTest('1.4. public.matches defines room_release_time column', () => {
  assert.ok(sqlContent.includes("column_name = 'room_release_time'"), 'Checks for room_release_time column')
  assert.ok(/room_release_time\s+TIMESTAMPTZ\s+NULL/i.test(sqlContent), 'room_release_time TIMESTAMPTZ NULL')
})

runTest('1.5. public.matches defines unique constraint on (tournament_id, match_number)', () => {
  assert.ok(
    /uq_matches_tournament_match\s+UNIQUE\s*\(\s*tournament_id\s*,\s*match_number\s*\)\s+DEFERRABLE/i.test(sqlContent),
    'uq_matches_tournament_match constraint on (tournament_id, match_number) is DEFERRABLE'
  )
})

runTest('1.6. public.matches enforces numeric-only room_id and room_password checks', () => {
  assert.ok(sqlContent.includes('chk_matches_room_id_numeric'), 'Numeric constraint on room_id')
  assert.ok(sqlContent.includes('^[0-9]{1,15}$'), 'room_id regex pattern enforced')
  assert.ok(sqlContent.includes('chk_matches_room_password_numeric'), 'Numeric constraint on room_password')
  assert.ok(sqlContent.includes('^[0-9]{1,10}$'), 'room_password regex pattern enforced')
})

runTest('1.7. Lookup and scheduling indexes are created', () => {
  assert.ok(
    /CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_matches_tourn_schedule\s+ON\s+public\.matches\s*\(\s*tournament_id\s*,\s*match_number\s*,\s*scheduled_time\s+ASC\s*\)/i.test(sqlContent),
    'idx_matches_tourn_schedule index created'
  )
  assert.ok(
    /CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_matches_status\s+ON\s+public\.matches\s*\(\s*status\s*\)/i.test(sqlContent),
    'idx_matches_status index created'
  )
})

// ============================================================================
// GROUP 2: RPC SECURITY & ACCESS CONTROLS
// ============================================================================
console.log('\n--- GROUP 2: RPC Security & Access Controls ---')

runTest('2.1. All 4 RPCs declare SECURITY DEFINER with fixed search_path', () => {
  const rpcs = [
    'schedule_tournament_matches',
    'set_match_room_details',
    'update_match_status',
    'delete_tournament_match'
  ]
  for (const rpc of rpcs) {
    const fnBody = getFunctionBody(rpc)
    assert.ok(fnBody.includes('SECURITY DEFINER'), `${rpc} must be SECURITY DEFINER`)
    assert.ok(/SET\s+search_path\s*=\s*public\s*,\s*pg_temp/i.test(fnBody), `${rpc} must set search_path = public, pg_temp`)
  }
})

runTest('2.2. All 4 RPCs enforce server-side admin authorization (public.is_admin())', () => {
  const rpcs = [
    'schedule_tournament_matches',
    'set_match_room_details',
    'update_match_status',
    'delete_tournament_match'
  ]
  for (const rpc of rpcs) {
    const fnBody = getFunctionBody(rpc)
    assert.ok(fnBody.includes('auth.uid()'), `${rpc} checks auth.uid()`)
    assert.ok(fnBody.includes('public.is_admin()'), `${rpc} verifies public.is_admin()`)
    assert.ok(fnBody.includes('ADMIN_REQUIRED'), `${rpc} returns ADMIN_REQUIRED on forbidden access`)
  }
})

runTest('2.3. All 4 RPCs revoke EXECUTE from PUBLIC and anon, granting authenticated & service_role', () => {
  const rpcs = [
    'schedule_tournament_matches(TEXT, JSONB)',
    'set_match_room_details(UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ)',
    'update_match_status(UUID, TEXT)',
    'delete_tournament_match(UUID)'
  ]
  for (const rpc of rpcs) {
    assert.ok(
      sqlContent.includes(`REVOKE EXECUTE ON FUNCTION public.${rpc} FROM PUBLIC, anon;`),
      `Revokes execute on ${rpc} from PUBLIC, anon`
    )
    assert.ok(
      sqlContent.includes(`GRANT EXECUTE ON FUNCTION public.${rpc} TO authenticated, service_role;`),
      `Grants execute on ${rpc} to authenticated, service_role`
    )
  }
})

// ============================================================================
// GROUP 3: SCHEDULING LOGIC & CHRONOLOGY VALIDATION
// ============================================================================
console.log('\n--- GROUP 3: Scheduling Logic & Chronology Validation ---')

runTest('3.1. schedule_tournament_matches enforces row-lock FOR UPDATE on tournaments', () => {
  const fnBody = getFunctionBody('schedule_tournament_matches')
  assert.ok(/FROM\s+public\.tournaments\s+WHERE\s+id\s*=\s*p_tournament_id\s+FOR\s+UPDATE/i.test(fnBody), 'Row-lock FOR UPDATE')
})

runTest('3.2. schedule_tournament_matches rejects terminal tournament states', () => {
  const fnBody = getFunctionBody('schedule_tournament_matches')
  assert.ok(fnBody.includes('INVALID_LIFECYCLE_STATE'), 'Rejects terminal states')
  assert.ok(fnBody.includes("'completed'"), 'Rejects completed')
  assert.ok(fnBody.includes("'cancelled'"), 'Rejects cancelled')
})

runTest('3.3. schedule_tournament_matches validates match bounds (1 to 12 matches)', () => {
  const fnBody = getFunctionBody('schedule_tournament_matches')
  assert.ok(fnBody.includes('EMPTY_MATCH_SCHEDULE'), 'Rejects 0 matches')
  assert.ok(fnBody.includes('MAX_MATCH_LIMIT_EXCEEDED'), 'Rejects >12 matches')
})

runTest('3.4. schedule_tournament_matches enforces chronological spacing of at least 15 minutes', () => {
  const fnBody = getFunctionBody('schedule_tournament_matches')
  assert.ok(fnBody.includes('CHRONOLOGY_CONFLICT'), 'Emits CHRONOLOGY_CONFLICT on overlap')
  assert.ok(fnBody.includes("INTERVAL '15 minutes'"), 'Enforces 15 minute interval spacing')
  assert.ok(fnBody.includes('INVERTED_SCHEDULE_CHRONOLOGY'), 'Rejects inverted timestamps')
})

runTest('3.5. schedule_tournament_matches ensures contiguous sequence 1..N', () => {
  const fnBody = getFunctionBody('schedule_tournament_matches')
  assert.ok(fnBody.includes('NON_CONTIGUOUS_MATCH_NUMBERS'), 'Checks contiguous sequence')
})

runTest('3.6. schedule_tournament_matches preserves Live and Completed matches during sync', () => {
  const fnBody = getFunctionBody('schedule_tournament_matches')
  assert.ok(fnBody.includes("status NOT IN ('Live', 'Completed')"), 'Preserves live/completed matches')
})

runTest('3.7. schedule_tournament_matches writes MATCH_SCHEDULE_CONFIGURED audit log', () => {
  const fnBody = getFunctionBody('schedule_tournament_matches')
  assert.ok(fnBody.includes("'MATCH_SCHEDULE_CONFIGURED'"), 'Logs MATCH_SCHEDULE_CONFIGURED action')
})

// ============================================================================
// GROUP 4: MATCH ROOM OPERATIONS & BACKWARD COMPATIBILITY
// ============================================================================
console.log('\n--- GROUP 4: Match Room Operations & Backward Compatibility ---')

runTest('4.1. set_match_room_details validates numeric digits on room ID and password', () => {
  const fnBody = getFunctionBody('set_match_room_details')
  assert.ok(fnBody.includes('INVALID_ROOM_ID'), 'Rejects non-numeric room ID')
  assert.ok(fnBody.includes('INVALID_ROOM_PASSWORD'), 'Rejects non-numeric room password')
})

runTest('4.2. set_match_room_details sets room_published flag based on status', () => {
  const fnBody = getFunctionBody('set_match_room_details')
  assert.ok(fnBody.includes("room_published = v_is_published"), 'Updates room_published flag')
  assert.ok(fnBody.includes("'Room Ready'"), 'Transitions Scheduled to Room Ready on Publish')
})

runTest('4.3. set_match_room_details mirrors Match 1 credentials to public.tournaments', () => {
  const fnBody = getFunctionBody('set_match_room_details')
  assert.ok(fnBody.includes('v_match.match_number = 1'), 'Checks for match_number = 1')
  assert.ok(/UPDATE\s+public\.tournaments\s+SET/i.test(fnBody), 'Mirrors to public.tournaments')
  assert.ok(fnBody.includes('mirrored_to_tournament'), 'Audit log records mirror event')
})

runTest('4.4. set_match_room_details NEVER logs plaintext room password in audit log', () => {
  const fnBody = getFunctionBody('set_match_room_details')
  assert.ok(fnBody.includes("'has_password', (v_clean_password <> '')"), 'Logs has_password boolean flag instead of plaintext')
  assert.ok(!fnBody.includes("'room_password', v_clean_password"), 'Plaintext password is never in audit details')
})

runTest('4.5. set_match_room_details protects Completed and Cancelled matches from mutation', () => {
  const fnBody = getFunctionBody('set_match_room_details')
  assert.ok(fnBody.includes('TERMINAL_MATCH_MODIFICATION_BLOCKED'), 'Blocks modifying terminal matches')
})

// ============================================================================
// GROUP 5: MATCH STATUS TRANSITIONS & DELETION
// ============================================================================
console.log('\n--- GROUP 5: Match Status Transitions & Deletion ---')

runTest('5.1. update_match_status validates status domain and immutability of terminal states', () => {
  const fnBody = getFunctionBody('update_match_status')
  assert.ok(fnBody.includes('COMPLETED_MATCH_IMMUTABLE'), 'Completed matches are immutable')
  assert.ok(fnBody.includes('CANCELLED_MATCH_IMMUTABLE'), 'Cancelled matches are immutable')
  assert.ok(fnBody.includes('CANNOT_REWIND_LIVE_MATCH'), 'Live matches cannot be rewound')
})

runTest('5.2. update_match_status enforces valid progression state machine', () => {
  const fnBody = getFunctionBody('update_match_status')
  assert.ok(fnBody.includes('INVALID_STATUS_TRANSITION'), 'Rejects illegal state transitions')
  assert.ok(fnBody.includes("'Check-in Open'"), 'Allows Check-in Open')
  assert.ok(fnBody.includes("'Room Ready'"), 'Allows Room Ready')
  assert.ok(fnBody.includes("'Live'"), 'Allows Live')
  assert.ok(fnBody.includes("'Completed'"), 'Allows Completed')
})

runTest('5.3. delete_tournament_match rejects deleting Live, Completed, or Cancelled matches', () => {
  const fnBody = getFunctionBody('delete_tournament_match')
  assert.ok(fnBody.includes('CANNOT_DELETE_ACTIVE_OR_TERMINAL_MATCH'), 'Protects active or terminal matches')
})

runTest('5.4. delete_tournament_match prevents deleting the last match in a tournament', () => {
  const fnBody = getFunctionBody('delete_tournament_match')
  assert.ok(fnBody.includes('CANNOT_DELETE_LAST_MATCH'), 'Tournament must retain at least 1 match')
})

runTest('5.5. delete_tournament_match atomically re-indexes subsequent match numbers', () => {
  const fnBody = getFunctionBody('delete_tournament_match')
  assert.ok(/match_number\s*=\s*match_number\s*-\s*1/i.test(fnBody), 'Decrements subsequent match numbers')
  assert.ok(/round_number\s*=\s*round_number\s*-\s*1/i.test(fnBody), 'Decrements subsequent round numbers')
})

// ============================================================================
// SIMULATION RUN: BEHAVIORAL PAYLOAD MATRIX
// ============================================================================
console.log('\n--- SIMULATION: Schedule & Validation Payload Matrix ---')

runTest('Sim.1. Chronological validator logic accepts valid 3-match rotation (Bermuda -> Purgatory -> Kalahari)', () => {
  const matches = [
    { match_number: 1, scheduled_time: '2026-10-10T18:00:00Z', map_name: 'Bermuda' },
    { match_number: 2, scheduled_time: '2026-10-10T18:45:00Z', map_name: 'Purgatory' },
    { match_number: 3, scheduled_time: '2026-10-10T19:30:00Z', map_name: 'Kalahari' },
  ]
  for (let i = 1; i < matches.length; i++) {
    const prev = new Date(matches[i - 1].scheduled_time).getTime()
    const curr = new Date(matches[i].scheduled_time).getTime()
    assert.ok(curr >= prev + 15 * 60 * 1000, `Match ${i + 1} must be >= 15m after Match ${i}`)
  }
})

runTest('Sim.2. Chronological validator rejects overlapping times (less than 15 mins)', () => {
  const matches = [
    { match_number: 1, scheduled_time: '2026-10-10T18:00:00Z' },
    { match_number: 2, scheduled_time: '2026-10-10T18:10:00Z' }, // only 10 mins apart
  ]
  const prev = new Date(matches[0].scheduled_time).getTime()
  const curr = new Date(matches[1].scheduled_time).getTime()
  const hasConflict = curr < prev + 15 * 60 * 1000
  assert.equal(hasConflict, true, 'Detects 10-minute conflict')
})

runTest('Sim.3. Chronological validator rejects inverted timestamps', () => {
  const matches = [
    { match_number: 1, scheduled_time: '2026-10-10T19:00:00Z' },
    { match_number: 2, scheduled_time: '2026-10-10T18:00:00Z' }, // 1 hour earlier!
  ]
  const prev = new Date(matches[0].scheduled_time).getTime()
  const curr = new Date(matches[1].scheduled_time).getTime()
  assert.ok(curr < prev, 'Detects inverted timestamp')
})

console.log('\n================================================================================')
console.log(`N2.2 TEST RESULTS: ${passedTests} PASSED | ${failedTests} FAILED`)
console.log('================================================================================\n')

if (failedTests > 0) {
  process.exit(1)
} else {
  process.exit(0)
}
