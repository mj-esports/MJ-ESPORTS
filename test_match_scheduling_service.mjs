// test_match_scheduling_service.mjs
// Verification of Match Scheduling Service APIs, Contracts, Security, and Error Handling

import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

console.log('================================================================================')
console.log('MJ ESPORTS — PHASE N2.3: MATCH SCHEDULING SERVICE LAYER TEST SUITE')
console.log('================================================================================\n')

const serviceFilePath = path.resolve('src/services/matchSchedulingService.js')
assert.ok(fs.existsSync(serviceFilePath), 'matchSchedulingService.js must exist')
const serviceContent = fs.readFileSync(serviceFilePath, 'utf8')

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
// GROUP 1: API EXPORTS & METHOD SIGNATURES
// ============================================================================
console.log('--- GROUP 1: API Exports & Method Signatures ---')

runTest('1.1. Service exports all five required functions', () => {
  const requiredFunctions = [
    'fetchTournamentMatches',
    'scheduleTournamentMatches',
    'updateMatchStatus',
    'setMatchRoomDetails',
    'deleteTournamentMatch',
  ]
  for (const fn of requiredFunctions) {
    assert.ok(
      serviceContent.includes(`export async function ${fn}`),
      `Service must export ${fn}`
    )
  }
})

runTest('1.2. Service imports Supabase client from canonical location', () => {
  assert.ok(
    /import\s+\{\s*supabase,\s*isSupabaseConfigured\s*\}\s+from\s+['"]\.\.\/lib\/supabase(?:\.js)?['"]/.test(serviceContent),
    'Imports supabase and isSupabaseConfigured from ../lib/supabase.js'
  )
})

// ============================================================================
// GROUP 2: FETCH MATCHES SPECIFICATION & SECURITY
// ============================================================================
console.log('\n--- GROUP 2: fetchTournamentMatches Query & Security ---')

runTest('2.1. fetchTournamentMatches queries matches table ordered by match_number ASC', () => {
  assert.ok(
    serviceContent.includes(".from('matches')"),
    'Queries matches table'
  )
  assert.ok(
    /order\(\s*['"]match_number['"]\s*,\s*\{\s*ascending:\s*true\s*\}\s*\)/.test(serviceContent),
    'Orders by match_number ascending'
  )
  assert.ok(
    serviceContent.includes(".eq('tournament_id'"),
    'Filters by tournament_id'
  )
})

runTest('2.2. fetchTournamentMatches NEVER requests room_password in select query', () => {
  const selectMatch = serviceContent.match(/\.select\(\s*['"]([^'"]+)['"]\s*\)/)
  assert.ok(selectMatch, 'Found select statement')
  const selectedFields = selectMatch[1].split(',').map((f) => f.trim())
  
  assert.ok(!selectedFields.includes('room_password'), 'room_password must NOT be in the select list')
  assert.ok(selectedFields.includes('id'), 'Includes id')
  assert.ok(selectedFields.includes('tournament_id'), 'Includes tournament_id')
  assert.ok(selectedFields.includes('match_number'), 'Includes match_number')
  assert.ok(selectedFields.includes('round_number'), 'Includes round_number')
  assert.ok(selectedFields.includes('round_name'), 'Includes round_name')
  assert.ok(selectedFields.includes('map_name'), 'Includes map_name')
  assert.ok(selectedFields.includes('scheduled_time'), 'Includes scheduled_time')
  assert.ok(selectedFields.includes('status'), 'Includes status')
  assert.ok(selectedFields.includes('room_id'), 'Includes room_id')
  assert.ok(selectedFields.includes('room_published'), 'Includes room_published')
})

runTest('2.3. fetchTournamentMatches safely handles missing or null tournamentId', () => {
  assert.ok(
    serviceContent.includes('if (!isSupabaseConfigured || !tournamentId) return []'),
    'Returns empty array when tournamentId is falsy'
  )
})

// ============================================================================
// GROUP 3: AUTHORITATIVE RPC ROUTING
// ============================================================================
console.log('\n--- GROUP 3: Authoritative RPC Routing ---')

runTest('3.1. scheduleTournamentMatches routes exclusively through schedule_tournament_matches RPC', () => {
  assert.ok(
    serviceContent.includes("supabase.rpc('schedule_tournament_matches'"),
    'Calls schedule_tournament_matches RPC'
  )
  assert.ok(
    serviceContent.includes('p_tournament_id:'),
    'Passes p_tournament_id parameter'
  )
  assert.ok(
    serviceContent.includes('p_matches:'),
    'Passes p_matches parameter'
  )
})

runTest('3.2. updateMatchStatus routes exclusively through update_match_status RPC', () => {
  assert.ok(
    serviceContent.includes("supabase.rpc('update_match_status'"),
    'Calls update_match_status RPC'
  )
  assert.ok(
    serviceContent.includes('p_match_id:'),
    'Passes p_match_id parameter'
  )
  assert.ok(
    serviceContent.includes('p_new_status:'),
    'Passes p_new_status parameter'
  )
})

runTest('3.3. setMatchRoomDetails routes exclusively through set_match_room_details RPC', () => {
  assert.ok(
    serviceContent.includes("supabase.rpc('set_match_room_details'"),
    'Calls set_match_room_details RPC'
  )
  assert.ok(
    serviceContent.includes('p_match_id:'),
    'Passes p_match_id parameter'
  )
  assert.ok(
    serviceContent.includes('p_room_id:'),
    'Passes p_room_id parameter'
  )
  assert.ok(
    serviceContent.includes('p_room_password:'),
    'Passes p_room_password parameter'
  )
  assert.ok(
    serviceContent.includes('p_room_status:'),
    'Passes p_room_status parameter'
  )
})

runTest('3.4. deleteTournamentMatch routes exclusively through delete_tournament_match RPC', () => {
  assert.ok(
    serviceContent.includes("supabase.rpc('delete_tournament_match'"),
    'Calls delete_tournament_match RPC'
  )
  assert.ok(
    serviceContent.includes('p_match_id:'),
    'Passes p_match_id parameter'
  )
})

// ============================================================================
// GROUP 4: ZERO PRIVILEGED DIRECT MUTATIONS & SECURITY
// ============================================================================
console.log('\n--- GROUP 4: Zero Privileged Direct Mutations & Security ---')

runTest('4.1. Zero direct INSERT operations on public.matches from client service', () => {
  assert.ok(
    !/\.from\(\s*['"]matches['"]\s*\)\s*\.insert/.test(serviceContent),
    'No direct .insert() on matches table'
  )
})

runTest('4.2. Zero direct UPDATE operations on public.matches from client service', () => {
  assert.ok(
    !/\.from\(\s*['"]matches['"]\s*\)\s*\.update/.test(serviceContent),
    'No direct .update() on matches table'
  )
})

runTest('4.3. Zero direct DELETE operations on public.matches from client service', () => {
  assert.ok(
    !/\.from\(\s*['"]matches['"]\s*\)\s*\.delete/.test(serviceContent),
    'No direct .delete() on matches table'
  )
})

runTest('4.4. Zero service_role keys or secrets referenced in service', () => {
  assert.ok(
    !serviceContent.includes('service_role'),
    'No service_role string'
  )
  assert.ok(
    !serviceContent.includes('SUPABASE_SERVICE_ROLE_KEY'),
    'No service role env var'
  )
})

runTest('4.5. Zero plaintext room password logging in console statements', () => {
  assert.ok(
    !serviceContent.includes('console.log(cleanPassword)'),
    'No password logging'
  )
  assert.ok(
    !serviceContent.includes('console.log(params.roomPassword)'),
    'No password logging'
  )
  assert.ok(
    !serviceContent.includes('console.info(params.roomPassword)'),
    'No password logging'
  )
})

// ============================================================================
// GROUP 5: ERROR HANDLING & CONTRACT NORMALIZATION
// ============================================================================
console.log('\n--- GROUP 5: Error Handling & Contract Normalization ---')

runTest('5.1. RPC error handling normalizes error and error_code in all mutation APIs', () => {
  const mutationFunctions = [
    'scheduleTournamentMatches',
    'updateMatchStatus',
    'setMatchRoomDetails',
    'deleteTournamentMatch',
  ]
  for (const fn of mutationFunctions) {
    const fnIdx = serviceContent.indexOf(`export async function ${fn}`)
    const nextFnIdx = serviceContent.indexOf('export async function', fnIdx + 1)
    const fnBody = nextFnIdx !== -1 ? serviceContent.slice(fnIdx, nextFnIdx) : serviceContent.slice(fnIdx)

    assert.ok(fnBody.includes('success: false'), `${fn} returns success: false on failure`)
    assert.ok(fnBody.includes('error:'), `${fn} returns structured error property`)
    assert.ok(fnBody.includes('error_code:'), `${fn} returns structured error_code property`)
  }
})

runTest('5.2. scheduleTournamentMatches performs lightweight client-side bounds checking', () => {
  assert.ok(
    serviceContent.includes('EMPTY_MATCH_SCHEDULE'),
    'Validates empty match list'
  )
  assert.ok(
    serviceContent.includes('MAX_MATCH_LIMIT_EXCEEDED'),
    'Validates match limit cap (>12)'
  )
})

console.log('\n================================================================================')
console.log(`N2.3 TEST RESULTS: ${passedTests} PASSED | ${failedTests} FAILED`)
console.log('================================================================================\n')

if (failedTests > 0) {
  process.exit(1)
} else {
  process.exit(0)
}
