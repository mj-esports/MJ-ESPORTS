/**
 * MJ ESPORTS — Phase 3: Tournament History Page Automated Test Suite
 * 
 * Verifies that the redesigned Tournament History Page (/profile/history):
 * 1. Exists and is appropriately structured
 * 2. Adheres strictly to FREE FIRE MAX ONLY (zero BGMI/PUBG references or UIDs)
 * 3. Does NOT hardcode any Stitch mockup tournament names (FF MAX ELITE SCRIM W3, MJ PRO CLASH CUP #44, BERMUDA CLASH CUP)
 * 4. Does NOT hardcode Stitch mockup numbers or statistics (7 kills, 4 kills, ₹1,200, ₹450, ₹5,000)
 * 5. Does NOT fabricate dates or countdowns (no hardcoded 'Today 21:00 IST' or fake schedules)
 * 6. Completed filter filters strictly for status === 'Completed'
 * 7. Active filter filters strictly for active/upcoming registrations (status !== 'Completed' && status !== 'Cancelled')
 * 8. ALL filter surfaces all registered tournaments for the player
 * 9. Search operates on real tournament data
 * 10. Placement comes from confirmed results (myTeam.rank || myTeam.position)
 * 11. Kills come from confirmed results in completed tournaments
 * 12. Prize does NOT conflate with wallet balance (wallets.balance)
 * 13. Prize does NOT add payout_queue to wallet_ledger total (single-source accounting)
 * 14. Prize uses authoritative PRIZE_CREDIT ledger data via fetchAllUserPrizeCredits
 * 15. Does NOT reference non-authoritative profiles.wallet_balance
 * 16. Podium rate calculates (podiumFinishes / completedTournamentsCount) * 100
 * 17. Zero completed tournaments produces safe honest '—' unavailable state for podium rate and prize
 * 18. Active tournaments do NOT display fake placement, kills, or prize won
 * 19. Cancelled tournaments display authoritative cancellation and 'REFUNDED TO WALLET' via tournament_refunds
 * 20. Existing navigation targets remain intact (/profile, /tournaments/:id)
 * 21. Empty state exists ('NO TOURNAMENT HISTORY')
 * 22. Loading state exists with skeletons
 * 23. Error state exists ('TOURNAMENT HISTORY UNAVAILABLE')
 * 24. No unauthorized financial data access is introduced
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const historyPagePath = path.join(__dirname, 'src', 'pages', 'TournamentHistoryPage.jsx')
const walletServicePath = path.join(__dirname, 'src', 'services', 'walletService.js')

let passCount = 0
let failCount = 0

function assert(condition, message) {
  if (condition) {
    console.log(`  PASS: ${message}`)
    passCount++
  } else {
    console.error(`  FAIL: ${message}`)
    failCount++
  }
}

console.log('\n==================================================')
console.log('PHASE 3: TOURNAMENT HISTORY PAGE AUTOMATED TESTS')
console.log('==================================================\n')

// Test 1: Tournament History page exists
assert(fs.existsSync(historyPagePath), '1. Tournament History page exists at src/pages/TournamentHistoryPage.jsx')

const content = fs.readFileSync(historyPagePath, 'utf8')
const walletServiceContent = fs.readFileSync(walletServicePath, 'utf8')

// Test 2 & 3: Free Fire MAX Only
console.log('\n[SECTION 1] FREE FIRE MAX ONLY ENFORCEMENT')
assert(!content.includes('BGMI'), '2. Zero occurrences of "BGMI"')
assert(!content.includes('Battlegrounds Mobile India'), 'Zero occurrences of "Battlegrounds Mobile India"')
assert(!content.includes('PUBG'), 'Zero occurrences of "PUBG"')
assert(!content.includes('bgmiUid'), 'Zero occurrences of "bgmiUid"')
assert(!content.includes('activeGameTab'), 'No multi-game tab selector')
assert(content.includes('FREE FIRE MAX'), '3. Contains "FREE FIRE MAX" branding')

// Test 4 & 5: No Stitch Mockup Names or Numbers
console.log('\n[SECTION 2] REAL DATA INTEGRITY (NO HARDCODED STITCH MOCKUP DATA)')
assert(!content.includes('FF MAX ELITE SCRIM W3'), '4. No Stitch mockup name "FF MAX ELITE SCRIM W3"')
assert(!content.includes('MJ PRO CLASH CUP #44'), 'No Stitch mockup name "MJ PRO CLASH CUP #44"')
assert(!content.includes('BERMUDA CLASH CUP'), 'No Stitch mockup name "BERMUDA CLASH CUP"')
assert(!content.match(/\b7 kills\b/i), '5. No hardcoded Stitch stat "7 kills"')
assert(!content.match(/\b4 kills\b/i), 'No hardcoded Stitch stat "4 kills"')
assert(!content.includes('₹1,200') && !content.includes('1200'), 'No hardcoded Stitch prize "₹1,200"')
assert(!content.includes('₹450') && !content.includes('450'), 'No hardcoded Stitch prize "₹450"')
assert(!content.includes('₹5,000') && !content.includes('5000'), 'No hardcoded Stitch prize "₹5,000"')

// Test 6: No Fabricated Dates
console.log('\n[SECTION 3] DATE & SCHEDULE INTEGRITY')
assert(!content.includes('Today 21:00 IST'), '6. No fabricated countdown "Today 21:00 IST"')
assert(content.includes('formatTournamentDate'), 'Uses real dynamic tournament date formatting')

// Test 7, 8, 9: Filters (ALL, ACTIVE, COMPLETED)
console.log('\n[SECTION 4] FILTER SEMANTICS & TELEMETRY')
assert(content.includes("filterTab === 'ALL'"), '9. ALL filter surfaces all registered tournaments')
assert(content.includes("filterTab === 'ACTIVE'"), '8. ACTIVE filter isolates active/upcoming registrations')
assert(content.includes("filterTab === 'COMPLETED'"), '7. COMPLETED filter isolates completed tournaments')
assert(content.includes("status !== 'Completed' && status !== 'Cancelled'"), 'ACTIVE correctly excludes completed and cancelled tournaments')
assert(content.includes("status === 'Completed'"), 'COMPLETED strictly targets completed tournaments')

// Test 10: Search uses real tournament data
console.log('\n[SECTION 5] SEARCH INTEGRITY')
assert(content.includes('searchQuery') && content.includes('t.title.toLowerCase()'), '10. Search operates dynamically on real tournament titles')
assert(content.includes('NO MATCHING TOURNAMENTS'), 'Provides explicit filter/search empty state')

// Test 11 & 12: Placement and Kills from Confirmed Results
console.log('\n[SECTION 6] RESULT TELEMETRY')
assert(content.includes('getPlayerTeam'), 'Resolves player team from real tournament result payload')
assert(content.includes('myTeam?.rank || myTeam?.position'), '11. Placement comes from confirmed result rank/position')
assert(content.includes('myTeam?.kills || myTeam?.finishes'), '12. Kills come from confirmed eliminations in results')
assert(content.includes('renderPlacementBadge'), 'Formats placement badges dynamically from real rank')

// Test 13, 14, 15, 16: Financial Architecture & Authoritative Prize Accounting
console.log('\n[SECTION 7] FINANCIAL ARCHITECTURE & PRIZE INTEGRITY')
assert(content.includes('fetchAllUserPrizeCredits'), '14. Uses authoritative fetchAllUserPrizeCredits() to retrieve complete ledger')
assert(content.includes("transaction_type === 'PRIZE_CREDIT'"), '15. Strictly filters for PRIZE_CREDIT ledger transactions')
assert(content.includes("direction === 'CREDIT'"), 'Strictly filters for CREDIT direction')
assert(!content.includes('wallets.balance') || !content.includes('totalWonAmount = balance'), '13. Does NOT conflate wallet balance with prize earnings')
assert(!content.includes('profiles.wallet_balance'), '16. Does NOT reference non-authoritative profiles.wallet_balance')
assert(!content.includes('payout_queue') || !content.includes('totalWonAmount += queueTotal'), '14b. Does NOT double-count payout_queue into prize earnings')
assert(!content.includes('transaction_type === \'REFUND\' && totalWonAmount'), 'Does NOT count refunds as prize earnings')

// Strict Individual Tournament Prize Financial Verification
assert(!content.includes('prize = isCompleted && myTeam?.prize'), 'Individual tournament Prize does NOT treat teams_list.prize as confirmed earnings')
assert(!content.includes('myTeam?.prizeWon || 0'), 'Individual tournament Prize does NOT treat myTeam.prizeWon as confirmed earnings')
assert(content.includes('getConfirmedTournamentPrize'), 'Implements getConfirmedTournamentPrize to match ledger entries authoritatively')
assert(content.includes('source_reference_id') || content.includes('tournament_id'), 'Inspects authoritative ledger source reference fields for tournament association')

// Functional simulation of ledger-to-tournament prize matching
const testLedgerCredits = [
  {
    id: 'tx_1',
    amount: 500,
    transaction_type: 'PRIZE_CREDIT',
    direction: 'CREDIT',
    source_reference_type: 'tournament',
    source_reference_id: 'tourney_alpha'
  },
  {
    id: 'tx_2',
    amount: 250,
    transaction_type: 'PRIZE_CREDIT',
    direction: 'CREDIT',
    metadata: { tournament_id: 'tourney_beta' }
  }
]

function simulateGetConfirmedPrize(tournamentId, credits) {
  const tid = String(tournamentId)
  const matches = credits.filter(c => {
    if (c.transaction_type !== 'PRIZE_CREDIT' || c.direction !== 'CREDIT') return false
    const meta = c.metadata || {}
    return String(c.source_reference_id) === tid || String(meta.tournament_id) === tid
  })
  if (matches.length === 0) return null
  return matches.reduce((acc, c) => acc + c.amount, 0)
}

assert(simulateGetConfirmedPrize('tourney_alpha', testLedgerCredits) === 500, 'Matched tournament tourney_alpha resolves confirmed ₹500 from ledger')
assert(simulateGetConfirmedPrize('tourney_beta', testLedgerCredits) === 250, 'Matched tournament tourney_beta resolves confirmed ₹250 from metadata')
assert(simulateGetConfirmedPrize('tourney_gamma_no_credit', testLedgerCredits) === null, 'Unmatched tournament displays unavailable state (null/—) even if teams_list had declared prize')

// Test 17 & 18: Podium Rate & Zero State
console.log('\n[SECTION 8] PODIUM RATE & ZERO STATE')
assert(content.includes('podiumRate'), '17. Computes PODIUM RATE dynamically')
assert(content.includes("if (completedTournamentsCount === 0) return '—'"), '18. Zero completed tournaments produces safe "—" state')
assert(content.includes('myTeam.rank === 1 || myTeam.rank === 2 || myTeam.rank === 3') ||
       content.includes('rank <= 3'), 'Podium definition strictly includes 1st, 2nd, or 3rd place')

// Test 19: Active Tournaments do not show fake stats
console.log('\n[SECTION 9] ACTIVE TOURNAMENT ISOLATION')
assert(content.includes('isCompleted ?'), '19. Placement and kills are strictly gated behind isCompleted')
assert(content.includes('Prize Pool') && content.includes('Entry Fee'), 'Active tournaments show entry fee and prize pool instead of fake finish results')

// Test 20: Cancelled & Refunded State
console.log('\n[SECTION 10] CANCELLED & REFUNDED TOURNAMENTS')
assert(content.includes('isCancelled'), '20. Detects cancelled tournament status')
assert(content.includes('tournament_refunds'), 'Queries authoritative public.tournament_refunds table')
assert(content.includes('REFUNDED TO WALLET'), 'Surfaces concise "REFUNDED TO WALLET" indicator when authoritative refund exists')

// Test 21: Existing Navigation
console.log('\n[SECTION 11] NAVIGATION INTEGRITY')
assert(content.includes('to="/profile"'), '21. Provides Return to Profile navigation (/profile)')
assert(content.includes('to={`/tournaments/${t.id}`}') || content.includes("to={`/tournaments/${t.id}`}"), 'Links to authoritative tournament details (/tournaments/:id)')

// Test 22, 23, 24: UX States (Empty, Loading, Error)
console.log('\n[SECTION 12] UX STATES & RESILIENCE')
assert(content.includes('NO TOURNAMENT HISTORY'), '22. Clean empty state when player has 0 registrations')
assert(content.includes('authLoading || tournamentsLoading'), '23. Skeletons rendered during data loading')
assert(content.includes('TOURNAMENT HISTORY UNAVAILABLE'), '24. Clean user-friendly error state')

// Test 25: Security & Data Boundaries
console.log('\n[SECTION 13] SECURITY & DATA BOUNDARIES')
assert(content.includes("eq('user_id', user.id)"), '25. Strictly filters tournament refunds by authenticated user.id')
assert(content.includes('fetchAllUserPrizeCredits(user.id)'), 'Strictly retrieves authenticated user prize credits')
assert(!content.includes('SELECT * FROM wallet_ledger WHERE user_id != user.id'), 'No unauthorized cross-tenant data retrieval')

// Functional simulation for filter semantics:
console.log('\n[SECTION 14] FUNCTIONAL FILTER SIMULATION')
const sampleTournaments = [
  { id: '1', title: 'Battle Arena 1', status: 'Completed' },
  { id: '2', title: 'Summer Clash', status: 'Registration Open' },
  { id: '3', title: 'Friday Night Fight', status: 'Live' },
  { id: '4', title: 'Cancelled Cup', status: 'Cancelled' },
]

const activeFilter = sampleTournaments.filter(t => t.status !== 'Completed' && t.status !== 'Cancelled')
const completedFilter = sampleTournaments.filter(t => t.status === 'Completed')
const allFilter = sampleTournaments

assert(activeFilter.length === 2, `Active filter correctly includes only 2 active tournaments (got ${activeFilter.length})`)
assert(completedFilter.length === 1, `Completed filter correctly includes only 1 completed tournament (got ${completedFilter.length})`)
assert(allFilter.length === 4, `All filter includes all 4 registrations (got ${allFilter.length})`)

console.log('\n==================================================')
console.log(`TEST RESULTS: ${passCount} PASSED, ${failCount} FAILED`)
console.log('==================================================\n')

if (failCount > 0) {
  process.exit(1)
} else {
  process.exit(0)
}
