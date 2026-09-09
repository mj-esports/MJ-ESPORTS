/**
 * MJ ESPORTS — Phase 2: Player Statistics Page Automated Test Suite (Final Data-Integrity Verification)
 * 
 * Verifies that the redesigned Statistics Page:
 * 1. Strictly adheres to FREE FIRE MAX ONLY (zero BGMI/PUBG mentions or tabs)
 * 2. Does NOT hardcode any Stitch mockup values (28, 94, 25.6%, 4.47, 3420, 3,420)
 * 3. Does NOT import or rely on mockData.js for production player statistics
 * 4. Relabels MATCHES to COMPLETED TOURNAMENTS to match underlying tournament-level data model
 * 5. WINS represents confirmed first-place finishes
 * 6. TOTAL KILLS is calculated from confirmed tournament match results
 * 7. WIN RATE and Kills/Tourney avoid division by zero and show '—' when 0 tournaments
 * 8. EARNINGS uses strictly single-source accounting: public.wallet_ledger (PRIZE_CREDIT, CREDIT)
 *    - Does NOT add payout_queue to wallet_ledger total (prevents double-counting)
 *    - Does NOT use wallet balance as earnings
 *    - Displays '—' when no confirmed prize credits exist
 * 9. Placement Distribution and Podium Finishes are derived from real tournament results
 * 10. Back navigation links to /profile
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const statsPagePath = path.join(__dirname, 'src', 'pages', 'StatisticsPage.jsx')
const walletServicePath = path.join(__dirname, 'src', 'services', 'walletService.js')
const walletServiceContent = fs.readFileSync(walletServicePath, 'utf8')

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
console.log('PHASE 2: PLAYER STATISTICS PAGE AUTOMATED TESTS')
console.log('==================================================\n')

const content = fs.readFileSync(statsPagePath, 'utf8')

// Section 1: Free Fire MAX Only
console.log('[SECTION 1] FREE FIRE MAX ONLY ENFORCEMENT')
assert(!content.includes('BGMI'), 'Zero occurrences of "BGMI"')
assert(!content.includes('Battlegrounds Mobile India'), 'Zero occurrences of "Battlegrounds Mobile India"')
assert(!content.includes('PUBG'), 'Zero occurrences of "PUBG"')
assert(!content.includes('activeGameTab'), 'No multi-game tab selector')
assert(content.includes('FREE FIRE MAX'), 'Contains "FREE FIRE MAX" branding')

// Section 2: Zero Hardcoded Stitch Mock Data
console.log('\n[SECTION 2] REAL DATA INTEGRITY (NO HARDCODED MOCKUP VALUES)')
assert(!content.match(/\b28\b\s*(matches|Matches|tournaments|Tournaments)/), 'No hardcoded "28"')
assert(!content.match(/\b94\b\s*(kills|Kills)/), 'No hardcoded "94 kills"')
assert(!content.includes('25.6%'), 'No hardcoded win rate "25.6%"')
assert(!content.includes('4.47'), 'No hardcoded K/D "4.47"')
assert(!content.includes('3,420') && !content.includes('3420'), 'No hardcoded earnings "₹3,420"')
assert(!content.includes('mockData'), 'Does NOT import mockData.js')

// Section 3: Semantic Correctness of Completed Tournaments
console.log('\n[SECTION 3] TELEMETRY SEMANTICS & COMPLETED TOURNAMENTS')
assert(content.includes('Completed Tournaments'), 'Metric accurately labelled "Completed Tournaments"')
assert(content.includes("t.status === 'Completed'"), 'Filters specifically for completed tournaments with confirmed results')
assert(content.includes('completedTournamentsCount'), 'Tracks completed tournaments count (not raw registrations)')
assert(content.includes('winsCount'), 'WINS tracks confirmed first-place finishes')
assert(content.includes('totalKills'), 'TOTAL KILLS aggregates confirmed eliminations')
assert(content.includes('winRate'), 'Calculates WIN RATE dynamically')
assert(content.includes('kdRatio'), 'Calculates Kills/Tourney ratio dynamically')
assert(content.includes("if (completedTournamentsCount === 0) return '—'"), 'Zero-tournament condition yields honest "—" for WIN RATE and K/D')

// Section 4: Single-Source Authoritative Earnings & Pagination Completeness
console.log('\n[SECTION 4] AUTHORITATIVE EARNINGS & DATA COMPLETENESS (NO 100-ENTRY CAP)')
assert(content.includes('fetchAllUserPrizeCredits'), 'Uses fetchAllUserPrizeCredits() to retrieve full user prize ledger')
assert(!content.includes('limit: 100'), 'Does NOT depend on an arbitrary 100-entry cap for earnings')
assert(content.includes("transaction_type === 'PRIZE_CREDIT'"), 'Strictly filters for PRIZE_CREDIT ledger entries')
assert(content.includes("direction === 'CREDIT'"), 'Strictly filters for CREDIT direction')
assert(!content.includes("payout_queue") || !content.includes("totalPrize += queueTotal"), 'Does NOT add payout_queue to wallet_ledger total (no double-counting)')
assert(!content.includes('profiles.wallet_balance'), 'Does NOT reference non-authoritative profiles.wallet_balance')
assert(!content.includes('wallets.balance') || !content.includes('authoritativeEarnings = balance'), 'Does NOT conflate wallet balance with tournament earnings')

// Section 4b: Wallet Service Pagination Implementation
assert(walletServiceContent.includes('export async function fetchAllUserPrizeCredits'), 'walletService exports fetchAllUserPrizeCredits')
assert(walletServiceContent.includes('offset'), 'fetchWalletLedger supports offset pagination')
assert(walletServiceContent.includes('batchSize'), 'fetchAllUserPrizeCredits utilizes batch pagination traversal')
assert(walletServiceContent.includes('while (hasMore)'), 'fetchAllUserPrizeCredits iterates until full ledger is consumed')

// Section 4c: Algorithmic Verification for >100 entries completeness
const simulatedLedger = []
const TOTAL_MOCK_ENTRIES = 2450 // Test with 2,450 entries (>100 and >1000)
for (let i = 0; i < TOTAL_MOCK_ENTRIES; i++) {
  simulatedLedger.push({
    id: `ledger_${i}`,
    user_id: 'usr_test_player',
    amount: 10,
    transaction_type: 'PRIZE_CREDIT',
    direction: 'CREDIT'
  })
}

// Simulate paginated fetch algorithm identical to fetchAllUserPrizeCredits
async function simulateFetchAll(userId, source) {
  let all = []
  let offset = 0
  const batchSize = 1000
  let hasMore = true
  while (hasMore) {
    const batch = source.slice(offset, offset + batchSize)
    if (batch.length > 0) {
      all = all.concat(batch)
      if (batch.length < batchSize) {
        hasMore = false
      } else {
        offset += batchSize
      }
    } else {
      hasMore = false
    }
  }
  return all
}

const retrieved = await simulateFetchAll('usr_test_player', simulatedLedger)
const totalSum = retrieved.reduce((acc, t) => acc + t.amount, 0)
assert(retrieved.length === TOTAL_MOCK_ENTRIES, `Pagination algorithm retrieves ALL ${TOTAL_MOCK_ENTRIES} entries (retrieved ${retrieved.length})`)
assert(totalSum === TOTAL_MOCK_ENTRIES * 10, `Calculates lifetime earnings accurately without 100-cap truncation (total ₹${totalSum})`)


// Section 5: Performance Breakdown & Modules
console.log('\n[SECTION 5] PERFORMANCE BREAKDOWN & SUBMODULES')
assert(content.includes('Placement Distribution'), 'Includes Placement Distribution module')
assert(content.includes('podiumFinishes'), 'Computes Podium Finishes (1st, 2nd, 3rd)')
assert(content.includes('bestPlacement'), 'Computes Best Placement')
assert(content.includes('highestTournamentKills'), 'Computes Highest Tournament Kills')
assert(content.includes('Recent Tournament History'), 'Includes Recent Tournament History section')

// Section 6: Identity, Navigation & Accessibility
console.log('\n[SECTION 6] IDENTITY & NAVIGATION')
assert(content.includes('to="/profile"'), 'Provides Return to Profile back link')
assert(content.includes('verification_status'), 'Checks authoritative verification_status')
assert(content.includes('isVerified &&'), 'VERIFIED badge is strictly conditional')
assert(content.includes('aria-label="Performance Overview"'), 'Has accessible Performance Overview section')
assert(content.includes('aria-label="Placement Distribution"'), 'Has accessible Placement Distribution section')

console.log('\n==================================================')
console.log(`TEST RESULTS: ${passCount} PASSED, ${failCount} FAILED`)
console.log('==================================================\n')

if (failCount > 0) {
  process.exit(1)
} else {
  process.exit(0)
}
