import assert from 'node:assert/strict'
import fs from 'node:fs'
import { SUPPORTED_GAMES } from './src/data/mockData.js'
import { getDefaultGameCapacity } from './src/utils/tournamentUtils.js'
import { getTournamentImage, FREE_FIRE_BANNER } from './src/utils/tournamentImageUtils.js'

console.log('============================================================')
console.log('🧪 RUNNING PHASE 2: FREE FIRE-ONLY TOURNAMENT ENGINE TESTS')
console.log('============================================================\n')

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`  ✅ [PASS] ${name}`)
    passed++
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}: ${err.message}`)
    failed++
  }
}

// ------------------------------------------------------------
// 1. SUPPORTED_GAMES CONFIGURATION
// ------------------------------------------------------------
console.log('--- 1. Supported Games Configuration ---')

test('1.1: SUPPORTED_GAMES array contains Free Fire MAX', () => {
  assert.ok(SUPPORTED_GAMES.includes('Free Fire MAX'))
})

test('1.2: SUPPORTED_GAMES array does NOT contain BGMI or PUBG', () => {
  assert.ok(!SUPPORTED_GAMES.includes('BGMI'))
  assert.ok(!SUPPORTED_GAMES.includes('bgmi'))
  assert.ok(!SUPPORTED_GAMES.includes('PUBG'))
  assert.equal(SUPPORTED_GAMES.length, 1)
})

// ------------------------------------------------------------
// 2. ROOM CAPACITY & TOURNAMENT ENGINE RULES
// ------------------------------------------------------------
console.log('\n--- 2. Room Capacity & Engine Invariants ---')

test('2.1: Free Fire Squad mode defaults to 12 teams (48 players, 50 room capacity)', () => {
  const cap = getDefaultGameCapacity('Free Fire MAX', 'squad')
  assert.equal(cap.roomCap, 50)
  assert.equal(cap.maxTeams, 12)
  assert.equal(cap.teamSize, 4)
  assert.equal(cap.maxPlayers, 48)
  assert.equal(cap.teamUnit, 'Squads')
})

test('2.2: Free Fire Duo mode defaults to 25 teams (50 players, 50 room capacity)', () => {
  const cap = getDefaultGameCapacity('Free Fire MAX', 'duo')
  assert.equal(cap.roomCap, 50)
  assert.equal(cap.maxTeams, 25)
  assert.equal(cap.teamSize, 2)
  assert.equal(cap.maxPlayers, 50)
  assert.equal(cap.teamUnit, 'Duos')
})

test('2.3: Free Fire Solo mode defaults to 50 players (50 room capacity)', () => {
  const cap = getDefaultGameCapacity('Free Fire MAX', 'solo')
  assert.equal(cap.roomCap, 50)
  assert.equal(cap.maxTeams, 50)
  assert.equal(cap.teamSize, 1)
  assert.equal(cap.maxPlayers, 50)
  assert.equal(cap.teamUnit, 'Players')
})

test('2.4: Arbitrary or legacy BGMI game string still clamps strictly to 50 room capacity (no 100 room cap)', () => {
  const cap = getDefaultGameCapacity('BGMI', 'squad')
  assert.equal(cap.roomCap, 50)
  assert.equal(cap.maxTeams, 12)
  assert.equal(cap.maxPlayers, 48)
})

// ------------------------------------------------------------
// 3. TOURNAMENT BANNER & ASSET FALLBACKS
// ------------------------------------------------------------
console.log('\n--- 3. Banner & Image Assets ---')

test('3.1: getTournamentImage returns FREE_FIRE_BANNER for any tournament', () => {
  const img1 = getTournamentImage({ game: 'Free Fire MAX' })
  const img2 = getTournamentImage({ game: 'Unknown' })
  const img3 = getTournamentImage(null)
  assert.equal(img1, FREE_FIRE_BANNER)
  assert.equal(img2, FREE_FIRE_BANNER)
  assert.equal(img3, FREE_FIRE_BANNER)
})

test('3.2: getTournamentImage does not return BGMI image even if legacy tournament has BGMI title', () => {
  const img = getTournamentImage({ game: 'BGMI Pro Invitational' })
  assert.equal(img, FREE_FIRE_BANNER)
})

// ------------------------------------------------------------
// 4. TOURNAMENT CREATION & EDIT FORMS (TournamentCenterView.jsx)
// ------------------------------------------------------------
console.log('\n--- 4. Tournament Center View Audit ---')

test('4.1: TournamentCenterView.jsx does NOT contain any BGMI map names', () => {
  const content = fs.readFileSync('src/components/admin/TournamentCenterView.jsx', 'utf8')
  const bgmiMaps = ['Erangel', 'Miramar', 'Sanhok', 'Vikendi', 'Livik', 'Nusa']
  for (const map of bgmiMaps) {
    assert.ok(!content.includes(map), `TournamentCenterView.jsx should not contain map ${map}`)
  }
})

test('4.2: TournamentCenterView.jsx contains all standard Free Fire maps', () => {
  const content = fs.readFileSync('src/components/admin/TournamentCenterView.jsx', 'utf8')
  const ffMaps = ['Bermuda', 'Purgatory', 'Kalahari', 'Alpine', 'NexTERRA']
  for (const map of ffMaps) {
    assert.ok(content.includes(map), `TournamentCenterView.jsx should contain Free Fire map ${map}`)
  }
})

test('4.3: TournamentCenterView.jsx sets Free Fire MAX as the fixed game platform', () => {
  const content = fs.readFileSync('src/components/admin/TournamentCenterView.jsx', 'utf8')
  assert.ok(content.includes('Free Fire MAX Preset'))
  assert.ok(content.includes('Game Platform'))
  assert.ok(!content.includes('bgmiMap'))
  assert.ok(!content.includes('bgmiPerspective'))
  assert.ok(!content.includes('bgmiRedZone'))
})

// ------------------------------------------------------------
// 5. TOURNAMENT LISTING & SEARCH (TournamentsPage.jsx)
// ------------------------------------------------------------
console.log('\n--- 5. Public Tournaments Page Audit ---')

test('5.1: TournamentsPage.jsx has zero BGMI filter logic', () => {
  const content = fs.readFileSync('src/pages/TournamentsPage.jsx', 'utf8')
  assert.ok(!content.toLowerCase().includes('bgmi'), 'TournamentsPage.jsx should have zero bgmi mentions')
})

test('5.2: TournamentsPage.jsx preserves search, status filter, and pagination', () => {
  const content = fs.readFileSync('src/pages/TournamentsPage.jsx', 'utf8')
  assert.ok(content.includes('debouncedSearchQuery'))
  assert.ok(content.includes('selectedStatus'))
  assert.ok(content.includes('statusChips'))
})

// ------------------------------------------------------------
// 6. ADMIN TOURNAMENT VIEW (AllTournamentsView.jsx)
// ------------------------------------------------------------
console.log('\n--- 6. Admin AllTournamentsView Audit ---')

test('6.1: AllTournamentsView.jsx does NOT offer BGMI filter option', () => {
  const content = fs.readFileSync('src/components/admin/tournaments/AllTournamentsView.jsx', 'utf8')
  assert.ok(!content.includes('value="BGMI"'))
  assert.ok(!content.includes('BGMI Mobile'))
})

test('6.2: AllTournamentsView.jsx displays Free Fire MAX platform indicator', () => {
  const content = fs.readFileSync('src/components/admin/tournaments/AllTournamentsView.jsx', 'utf8')
  assert.ok(content.includes('Free Fire MAX'))
})

// ------------------------------------------------------------
// 7. REVIEW SUMMARY STEP (ReviewSummaryStep.jsx)
// ------------------------------------------------------------
console.log('\n--- 7. Review Summary Step Audit ---')

test('7.1: ReviewSummaryStep.jsx does NOT contain BGMI properties or maps', () => {
  const content = fs.readFileSync('src/components/admin/ReviewSummaryStep.jsx', 'utf8')
  assert.ok(!content.includes('bgmiMap'))
  assert.ok(!content.includes('bgmiPerspective'))
  assert.ok(!content.includes('bgmiRedZone'))
  assert.ok(content.includes('form.ffMap'))
  assert.ok(content.includes('form.ffGunAttributes'))
  assert.ok(content.includes('form.ffCharacterSkills'))
})

// ------------------------------------------------------------
// SUMMARY
// ------------------------------------------------------------
console.log('\n============================================================')
console.log(`📊 TEST RESULTS: ${passed} PASSED | ${failed} FAILED`)
console.log('============================================================\n')

if (failed > 0) {
  process.exit(1)
}
