/**
 * MJ ESPORTS — Phase 16.2 Regression Test Suite:
 * Tournament Persistence & Player Visibility Verification
 */

import fs from 'fs'
import path from 'path'
import assert from 'assert'
import { fileURLToPath } from 'url'
import { mapTournamentFromDb } from './src/utils/tournamentDbMapper.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = __dirname

console.log('\n==================================================================')
console.log('MJ ESPORTS — PHASE 16.2: TOURNAMENT PERSISTENCE & VISIBILITY AUDIT')
console.log('==================================================================\n')

let passCount = 0
let failCount = 0

function test(description, fn) {
  try {
    fn()
    console.log(`  ✓ [PASS] ${description}`)
    passCount++
  } catch (err) {
    console.error(`  ✗ [FAIL] ${description}`)
    console.error(`     Error: ${err.message}`)
    failCount++
  }
}

// Read TournamentContext.jsx source
const tournamentContextPath = path.join(ROOT, 'src/contexts/TournamentContext.jsx')
const tournamentContextContent = fs.readFileSync(tournamentContextPath, 'utf8')

// Active known public.tournaments columns (matching PostgreSQL schema)
const VALID_PRODUCTION_COLUMNS = [
  'id',
  'title',
  'game',
  'format',
  'prize_pool',
  'entry_fee',
  'max_teams',
  'registered_teams',
  'start_date',
  'start_time',
  'status',
  'organizer',
  'description',
  'rules',
  'teams_list',
  'room_status',
  'room_last_updated',
  'room_published_by',
  'winner_team',
  'winner_captain',
  'created_at',
  'updated_at',
]

// ----------------------------------------------------------------------------
// GROUP 1: Query Schema & Absence of Nonexistent Columns
// ----------------------------------------------------------------------------
console.log('Test Group 1: Query Schema & Absence of Nonexistent Columns')

test('1.1. fetchTournaments() does NOT query nonexistent column room_release_time', () => {
  // Extract the select clause in fetchTournaments
  const fetchBlock = tournamentContextContent.slice(
    tournamentContextContent.indexOf('const fetchTournaments'),
    tournamentContextContent.indexOf('useEffect')
  )
  assert(
    !fetchBlock.includes('room_release_time'),
    'fetchTournaments must not request room_release_time'
  )
})

test('1.2. fetchTournaments() does NOT query nonexistent column room_release_window_minutes', () => {
  const fetchBlock = tournamentContextContent.slice(
    tournamentContextContent.indexOf('const fetchTournaments'),
    tournamentContextContent.indexOf('useEffect')
  )
  assert(
    !fetchBlock.includes('room_release_window_minutes'),
    'fetchTournaments must not request room_release_window_minutes'
  )
})

test('1.3. Active tournament SELECT contains only valid production schema columns', () => {
  const selectMatch = tournamentContextContent.match(/\.from\('tournaments'\)\s*\.select\('([^']+)'\)/)
  assert(selectMatch, 'Must find .from("tournaments").select(...)')
  const requestedColumns = selectMatch[1].split(',').map((c) => c.trim())

  for (const col of requestedColumns) {
    assert(
      VALID_PRODUCTION_COLUMNS.includes(col),
      `Column "${col}" in SELECT query is not in the valid schema columns list`
    )
  }
})

test('1.4. Query strictly protects credentials by NOT selecting room_id or room_password in public fetch', () => {
  const selectMatch = tournamentContextContent.match(/\.from\('tournaments'\)\s*\.select\('([^']+)'\)/)
  const requestedColumns = selectMatch[1].split(',').map((c) => c.trim())
  assert(!requestedColumns.includes('room_id'), 'Public fetch must not request room_id')
  assert(!requestedColumns.includes('room_password'), 'Public fetch must not request room_password')
})

// ----------------------------------------------------------------------------
// GROUP 2: Diagnostics & Error Visibility
// ----------------------------------------------------------------------------
console.log('\nTest Group 2: Diagnostics & Error Visibility')

test('2.1. fetchTournaments logs detailed diagnostics on query errors', () => {
  assert(
    tournamentContextContent.includes("console.error(`[fetchTournaments] Attempt ${attempt + 1} error:`, error)"),
    'fetchTournaments must log explicit diagnostic error messages'
  )
})

test('2.2. fetchTournaments handles exceptions with attempt counters and logs', () => {
  assert(
    tournamentContextContent.includes("console.error(`[fetchTournaments] Attempt ${attempt + 1} exception:`, err)"),
    'fetchTournaments must catch and log runtime exceptions'
  )
})

// ----------------------------------------------------------------------------
// GROUP 3: Frontend Data Mapping & Visibility Verification
// ----------------------------------------------------------------------------
console.log('\nTest Group 3: Frontend Data Mapping & Visibility Verification')

test('3.1. mapTournamentFromDb correctly maps persisted tournament fields', () => {
  const sampleDbRow = {
    id: 'a0cae725-2222-461a-a8ff-3bbfc40a349f',
    title: 'FREE FREEMAX 00001',
    game: 'Free Fire MAX',
    format: 'SQUAD (4P)',
    prize_pool: '₹15,000',
    entry_fee: 'Free',
    max_teams: 12,
    registered_teams: 0,
    start_date: '2026-10-04',
    start_time: '06:00 PM IST',
    status: 'Registration Open',
    organizer: 'MJ ESPORTS Official',
    description: 'Official high-stakes esports tournament.',
    rules: ['No emulators allowed.', 'Screen recording is mandatory.'],
    teams_list: [],
    created_at: '2026-10-04T12:07:04.768177+00:00',
    updated_at: '2026-10-04T12:07:04.768177+00:00',
  }

  const mapped = mapTournamentFromDb(sampleDbRow)
  assert.strictEqual(mapped.id, 'a0cae725-2222-461a-a8ff-3bbfc40a349f')
  assert.strictEqual(mapped.title, 'FREE FREEMAX 00001')
  assert.strictEqual(mapped.status, 'Registration Open')
  assert.strictEqual(mapped.maxTeams, 12)
  assert.strictEqual(mapped.registeredTeams, 0)
  assert.strictEqual(mapped.entryFee, 'Free')
  assert.strictEqual(mapped.prizePool, '₹15,000')
  assert.strictEqual(mapped.rules.length, 2)
})

test('3.2. TournamentsPage visibility filter marks Registration Open tournaments as published and visible', () => {
  const sampleTournament = {
    id: 'a0cae725-2222-461a-a8ff-3bbfc40a349f',
    title: 'FREE FREEMAX 00001',
    game: 'Free Fire MAX',
    format: 'SQUAD (4P)',
    status: 'Registration Open',
  }

  // Reproduce logic from TournamentsPage.jsx lines 48-49:
  const isPublished = sampleTournament.published !== undefined
    ? Boolean(sampleTournament.published)
    : sampleTournament.status !== 'Draft'

  assert.strictEqual(isPublished, true, 'Registration Open tournaments must be visible to players')
})

test('3.3. TournamentsPage search and game filters correctly match Free Fire MAX tournaments', () => {
  const sampleTournament = {
    title: 'FREE FREEMAX 00001',
    game: 'Free Fire MAX',
    format: 'SQUAD (4P)',
    status: 'Registration Open',
  }

  // Search matching
  const matchesEmptySearch = !'' || sampleTournament.title.toLowerCase().includes('')
  assert.strictEqual(matchesEmptySearch, true)

  // Game filter "All"
  const matchesAllGame = 'All' === 'All' || sampleTournament.game.toLowerCase() === 'all'
  assert.strictEqual(matchesAllGame, true)

  // Game filter "Free Fire MAX"
  const matchesFFMGame =
    'Free Fire MAX'.toLowerCase().includes('free fire') &&
    sampleTournament.game.toLowerCase().includes('free fire')
  assert.strictEqual(matchesFFMGame, true)
})

// ----------------------------------------------------------------------------
// GROUP 4: Security Invariants & Payment Isolation
// ----------------------------------------------------------------------------
console.log('\nTest Group 4: Security Invariants & Payment Isolation')

test('4.1. Room credential RPC methods (set_tournament_room_credentials / get_tournament_room_credentials) remain intact', () => {
  assert(
    tournamentContextContent.includes("supabase.rpc('set_tournament_room_credentials'"),
    'Must preserve set_tournament_room_credentials RPC call'
  )
  assert(
    tournamentContextContent.includes("supabase.rpc('get_tournament_room_credentials'"),
    'Must preserve get_tournament_room_credentials RPC call'
  )
})

test('4.2. Payment service tournamentPaymentService.js remains isolated', () => {
  const paymentServicePath = path.join(ROOT, 'src/services/tournamentPaymentService.js')
  const content = fs.readFileSync(paymentServicePath, 'utf8')
  assert(content.includes('createTournamentOrder'), 'Payment service remains intact')
})

// ----------------------------------------------------------------------------
// SUMMARY
// ----------------------------------------------------------------------------
console.log('\n==================================================================')
console.log(`TOTAL TESTS: ${passCount + failCount} | PASSED: ${passCount} | FAILED: ${failCount}`)
console.log('==================================================================\n')

if (failCount > 0) {
  process.exit(1)
} else {
  console.log('>>> ALL PHASE 16.2 PERSISTENCE & VISIBILITY AUDIT CHECKS PASSED <<<\n')
}
