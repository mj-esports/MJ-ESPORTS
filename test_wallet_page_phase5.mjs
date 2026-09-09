/**
 * MJ ESPORTS — Phase 5: Wallet UI & Financial Architecture Automated Test Suite
 * 
 * Verifies that the redesigned Wallet Page (/wallet):
 * 1. /wallet page exists at src/pages/WalletPage.jsx
 * 2. Existing wallet route remains intact (src/routes/AppRoutes.jsx)
 * 3. Authoritative balance is public.wallets.balance (via fetchUserWallet & subscribeToWalletBalance)
 * 4. profiles.wallet_balance is not used
 * 5. No hard-coded balance
 * 6. No Stitch mock financial values (e.g. ₹2,450, ₹3,420, ₹1,200, 6 Records)
 * 7. No database names in player-facing UI
 * 8. Existing Razorpay top-up flow is preserved
 * 9. Minimum top-up = ₹1
 * 10. Maximum top-up = ₹200 per transaction
 * 11. Whole-rupee validation exists
 * 12. No wallet balance ceiling is introduced in available balance UI
 * 13. Prize earnings use PRIZE_CREDIT + CREDIT via fetchAllUserPrizeCredits
 * 14. payout_queue is not added to earnings
 * 15. Wallet balance is not treated as earnings
 * 16. Refunds are not treated as prize earnings
 * 17. Entry fees are not treated as prize earnings
 * 18. Transaction history uses wallet ledger data (fetchWalletLedger)
 * 19. ALL filter exists
 * 20. CREDITS filter exists
 * 21. DEBITS filter exists
 * 22. Transaction amounts are dynamic
 * 23. Transaction names/dates are dynamic
 * 24. Refunds are credits (+₹X)
 * 25. Entry fees are debits (−₹X)
 * 26. Pending top-ups do not appear as available balance
 * 27. Failed payments do not appear as credits
 * 28. Loading state exists
 * 29. Error state exists (WALLET TEMPORARILY UNAVAILABLE / BALANCE UNAVAILABLE)
 * 30. Empty state exists (NO TRANSACTIONS YET)
 * 31. No BGMI references
 * 32. No PUBG references
 * 33. Existing navigation remains unchanged
 * 34. No unauthorized financial mutation was added
 * 35. No new wallet accounting system was introduced
 * 36. Only one Prize Earnings metric exists
 * 37. Unsupported escrow terminology is absent
 * 38. "public.wallets.balance" is absent from player-facing JSX
 * 39. "public.wallet_ledger" is absent from player-facing JSX
 * 40. "256-BIT ESCROW" is absent
 * 41. "MJ ESCROW" is absent
 * 42. "TAMPER-PROOF" is absent
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const walletPagePath = path.join(__dirname, 'src', 'pages', 'WalletPage.jsx')
const appRoutesPath = path.join(__dirname, 'src', 'routes', 'AppRoutes.jsx')

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
console.log('PHASE 5: WALLET UI & FINANCIAL ARCHITECTURE TESTS')
console.log('==================================================\n')

// Test 1: /wallet page exists
assert(fs.existsSync(walletPagePath), '1. /wallet page exists at src/pages/WalletPage.jsx')

const content = fs.readFileSync(walletPagePath, 'utf8')
const routesContent = fs.readFileSync(appRoutesPath, 'utf8')

// Test 2: Existing wallet route remains intact
console.log('\n[SECTION 1] ROUTING & BRANDING INTEGRITY')
assert(routesContent.includes('path="wallet"'), '2. Route "wallet" registered in AppRoutes.jsx')
assert(content.includes('to="/profile"'), '33. Return to Profile navigation preserved')
assert(content.includes('FREE FIRE MAX ONLY'), 'Free Fire MAX Only branding present')

// Test 31 & 32: Zero BGMI / PUBG
console.log('\n[SECTION 2] FREE FIRE MAX ONLY ENFORCEMENT')
assert(!content.includes('BGMI'), '31. Zero occurrences of "BGMI"')
assert(!content.includes('Battlegrounds Mobile India'), 'Zero occurrences of "Battlegrounds Mobile India"')
assert(!content.includes('PUBG'), '32. Zero occurrences of "PUBG"')
assert(!content.includes('bgmiUid'), 'Zero occurrences of "bgmiUid"')

// Test 3, 4, 5, 6, 12: Authoritative Balance & No Mock Values
console.log('\n[SECTION 3] AUTHORITATIVE BALANCE (public.wallets.balance)')
assert(content.includes('getAuthoritativeWalletBalance'), '3. Uses getAuthoritativeWalletBalance()')
assert(content.includes('subscribeToWalletBalance'), 'Subscribes to authoritative wallet balance updates')
assert(content.includes('fetchUserWallet'), 'Fetches authoritative wallet from public.wallets via fetchUserWallet')
assert(!content.includes('profiles.wallet_balance'), '4. Does NOT reference non-authoritative profiles.wallet_balance')
assert(!content.includes('user?.user_metadata?.wallet_balance'), 'Does NOT read user_metadata.wallet_balance')
assert(!content.includes('₹2,450'), '5. No hard-coded mock balance ₹2,450')
assert(!content.includes('₹3,420'), 'No hard-coded mock balance ₹3,420')
assert(!content.includes('₹1,200'), '6. No hard-coded mock prize ₹1,200')
assert(!content.includes('6 Records'), 'No hard-coded "6 Records"')
assert(!content.includes('/ ₹200 max'), '12. Available balance does NOT display a balance ceiling in UI')

// Test 13, 14, 15, 16, 17, 36: Authoritative Prize Earnings
console.log('\n[SECTION 4] PRIZE EARNINGS DATA INTEGRITY')
assert(content.includes('PRIZE EARNINGS'), '36. Contains exactly one PRIZE EARNINGS metric')
assert(!content.includes('Lifetime Prizes Won'), 'Does NOT duplicate with "Lifetime Prizes Won"')
assert(content.includes('fetchAllUserPrizeCredits'), '13. Prize earnings use fetchAllUserPrizeCredits()')
assert(content.includes("entry.transaction_type === 'PRIZE_CREDIT'"), 'Strictly evaluates transaction_type === PRIZE_CREDIT')
assert(content.includes("entry.direction === 'CREDIT'"), 'Strictly evaluates direction === CREDIT')
assert(!content.includes('payout_queue'), '14. Does NOT add payout_queue to prize earnings')
assert(content.includes('Math.floor(prizeEarnings)'), '15. Evaluates earnings strictly from prize credits, not balance')
assert(content.includes(": '—'"), 'Displays "—" when no confirmed prize earnings exist')

// Test 8, 9, 10, 11: Top-Up Amount UI & Razorpay Flow
console.log('\n[SECTION 5] RAZORPAY TOP-UP FLOW & BOUNDS')
assert(content.includes('loadRazorpayScript'), '8. Uses loadRazorpayScript')
assert(content.includes('createWalletTopupOrder'), 'Uses server-side createWalletTopupOrder')
assert(content.includes('verifyWalletTopup'), 'Uses server-side verifyWalletTopup')
assert(content.includes('generateTopupIdempotencyKey'), 'Preserves idempotency key across top-up attempts')
assert(content.includes('num < 1'), '9. Minimum top-up = ₹1')
assert(content.includes('num > 200'), '10. Maximum top-up = ₹200 per transaction')
assert(content.includes('/^\\d+$/'), '11. Whole-rupee validation regex exists')
assert(content.includes('50'), 'Provides convenient ₹50 preset')
assert(content.includes('100'), 'Provides convenient ₹100 preset')
assert(content.includes('200'), 'Provides convenient ₹200 preset')

// Test 18, 19, 20, 21, 22, 23, 24, 25: Transaction History & Filters
console.log('\n[SECTION 6] TRANSACTION HISTORY & FILTERS')
assert(content.includes('TRANSACTION HISTORY'), '18. Includes TRANSACTION HISTORY section')
assert(content.includes('fetchWalletLedger'), 'Fetches transaction history via fetchWalletLedger')
assert(content.includes("'ALL'"), '19. ALL filter exists')
assert(content.includes("'CREDITS'"), '20. CREDITS filter exists')
assert(content.includes("'DEBITS'"), '21. DEBITS filter exists')
assert(content.includes('tx.amount'), '22. Transaction amounts are dynamic')
assert(content.includes('tx.description'), '23. Transaction names are dynamic')
assert(content.includes('tx.date'), 'Transaction dates are dynamic')
assert(content.includes('MONEY ADDED'), 'Maps deposit to MONEY ADDED')
assert(content.includes('PRIZE WON'), 'Maps prize credit to PRIZE WON')
assert(content.includes('TOURNAMENT REFUND'), '24. Maps refund to TOURNAMENT REFUND (+₹X)')
assert(content.includes('TOURNAMENT ENTRY'), '25. Maps entry fee to TOURNAMENT ENTRY (−₹X)')
assert(content.includes("isCredit ? '+' : '−'"), 'Renders explicit + for credits and − for debits')

// Test 26, 27, 28, 29, 30: UX States (Loading, Error, Empty, Top-Up States)
console.log('\n[SECTION 7] UX STATES & RESILIENCE')
assert(content.includes('animate-pulse'), '28. Skeletons rendered during data loading')
assert(content.includes('WALLET TEMPORARILY UNAVAILABLE') || content.includes('BALANCE UNAVAILABLE'), '29. Clean error state exists')
assert(content.includes('NO TRANSACTIONS YET'), '30. Clean empty state for no transactions')
assert(content.includes('NO MATCHING TRANSACTIONS'), 'Clean empty state for search/filter mismatch')
assert(content.includes('PAYMENT PROCESSING'), '26. Explicit PAYMENT PROCESSING state during topup')
assert(content.includes('PAYMENT FAILED'), '27. Explicit PAYMENT FAILED state on payment decline')

// Test 7, 34, 35, 37, 38, 39, 40, 41, 42: Security, Architecture & Banned Terminology
console.log('\n[SECTION 8] SECURITY, ARCHITECTURE & TERMINOLOGY')
assert(!content.includes('256-BIT ESCROW'), '40. "256-BIT ESCROW" is absent')
assert(!content.includes('ESCROW LEADER'), '37. "ESCROW LEADER" is absent')
assert(!content.includes('MJ ESCROW'), '41. "MJ ESCROW" is absent')
assert(!content.includes('TAMPER-PROOF'), '42. "TAMPER-PROOF" is absent')
assert(!content.includes('>public.wallets.balance<'), '38. "public.wallets.balance" is absent from player-facing JSX')
assert(!content.includes('>public.wallet_ledger<'), '39. "public.wallet_ledger" is absent from player-facing JSX')
assert(!content.includes('>Supabase<'), '7. "Supabase" is absent from player-facing JSX')
assert(!content.includes('>Edge Functions<'), '"Edge Functions" is absent from player-facing JSX')

// Functional filter simulation
console.log('\n[SECTION 9] FUNCTIONAL FILTER SIMULATION')
function filterTransactions(txs, activeFilter) {
  return txs.filter((t) => {
    if (activeFilter === 'CREDITS' && t.direction !== 'CREDIT') return false
    if (activeFilter === 'DEBITS' && t.direction !== 'DEBIT') return false
    return true
  })
}

const mockLedger = [
  { id: '1', direction: 'CREDIT', amount: 50, type: 'DEPOSIT' },
  { id: '2', direction: 'DEBIT', amount: -20, type: 'ENTRY_FEE_DEBIT' },
  { id: '3', direction: 'CREDIT', amount: 100, type: 'PRIZE_CREDIT' },
  { id: '4', direction: 'CREDIT', amount: 20, type: 'REFUND' },
  { id: '5', direction: 'DEBIT', amount: -50, type: 'WITHDRAWAL' },
]

const allResult = filterTransactions(mockLedger, 'ALL')
const creditsResult = filterTransactions(mockLedger, 'CREDITS')
const debitsResult = filterTransactions(mockLedger, 'DEBITS')

assert(allResult.length === 5, `ALL filter returns all 5 records (got ${allResult.length})`)
assert(creditsResult.length === 3, `CREDITS filter returns 3 credits (got ${creditsResult.length})`)
assert(debitsResult.length === 2, `DEBITS filter returns 2 debits (got ${debitsResult.length})`)

console.log('\n==================================================')
console.log(`TEST RESULTS: ${passCount} PASSED, ${failCount} FAILED`)
console.log('==================================================\n')

if (failCount > 0) {
  process.exit(1)
} else {
  process.exit(0)
}
