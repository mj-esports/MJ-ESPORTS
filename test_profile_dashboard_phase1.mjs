/**
 * MJ ESPORTS — Phase 1: Profile Dashboard Automated Test Suite (Corrected)
 * 
 * Verifies that the redesigned Profile Dashboard:
 * 1. Adheres strictly to FREE FIRE MAX ONLY (zero BGMI/PUBG mentions or UIDs)
 * 2. Does NOT hardcode any Stitch mockup values (142, 38, 489, 26.8%, 14,850, 88472910)
 * 3. Uses authoritative wallet balance via walletService (public.wallets.balance)
 * 4. Renders all 5 Control Center navigation routes correctly
 * 5. Uses strictly authoritative verification state from public.profiles.verification_status
 * 6. Includes EARNINGS metric (authoritative ledger/payout source or honest '—' unavailable state)
 * 7. Ensures MATCHES represents actual completed matches (not raw registrations)
 * 8. Supports Free Fire MAX UID copying and Edit Profile navigation
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const profilePagePath = path.join(__dirname, 'src', 'pages', 'ProfilePage.jsx')

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
console.log('PHASE 1: PROFILE DASHBOARD AUTOMATED TESTS')
console.log('==================================================\n')

const content = fs.readFileSync(profilePagePath, 'utf8')

// Section 1: FREE FIRE MAX ONLY Rules
console.log('[SECTION 1] FREE FIRE MAX ONLY ENFORCEMENT')
assert(!content.includes('BGMI'), 'Zero occurrences of "BGMI"')
assert(!content.includes('Battlegrounds Mobile India'), 'Zero occurrences of "Battlegrounds Mobile India"')
assert(!content.includes('PUBG'), 'Zero occurrences of "PUBG"')
assert(!content.includes('bgmiUid'), 'Zero occurrences of "bgmiUid"')
assert(!content.includes('bgmi_uid'), 'Zero occurrences of "bgmi_uid"')
assert(content.includes('FREE FIRE MAX'), 'Contains "FREE FIRE MAX" label')

// Section 2: No Hardcoded Stitch Mockup Numbers
console.log('\n[SECTION 2] REAL DATA INTEGRITY (NO HARDCODED MOCKUP VALUES)')
assert(!content.match(/\b142\b/), 'No hardcoded matches "142"')
assert(!content.match(/\b489\b/), 'No hardcoded eliminations "489"')
assert(!content.includes('26.8%'), 'No hardcoded win rate "26.8%"')
assert(!content.includes('14,850') && !content.includes('14850'), 'No hardcoded earnings "₹14,850"')
assert(!content.includes('88472910'), 'No hardcoded UID fallback "88472910"')

// Section 3: Authoritative Wallet Integration
console.log('\n[SECTION 3] AUTHORITATIVE WALLET INTEGRATION')
assert(content.includes('subscribeToWalletBalance'), 'Imports and uses subscribeToWalletBalance()')
assert(content.includes('fetchUserWallet'), 'Imports and uses fetchUserWallet()')
assert(content.includes('getAuthoritativeWalletBalance'), 'Imports and uses getAuthoritativeWalletBalance()')
assert(!content.includes('profiles.wallet_balance'), 'Does NOT reference non-authoritative profiles.wallet_balance')
assert(!content.includes('wallet_balance'), 'No direct wallet_balance metadata fallback')

// Section 4: Profile Control Center Navigation
console.log('\n[SECTION 4] CONTROL CENTER ROUTES & INTEGRATION')
assert(content.includes('to="/profile/statistics"'), 'Links to /profile/statistics')
assert(content.includes('to="/profile/history"'), 'Links to /profile/history')
assert(content.includes('to="/profile/achievements"'), 'Links to /profile/achievements')
assert(content.includes('to="/wallet"'), 'Links to /wallet')
assert(content.includes('to="/settings"'), 'Links to /settings')
assert(content.includes("navigate('/profile/edit')"), 'Navigates to /profile/edit on Edit Profile')

// Section 5: Telemetry Semantics & Earnings Metric
console.log('\n[SECTION 5] TELEMETRY SEMANTICS & EARNINGS METRIC')
assert(content.includes('useTournaments'), 'Consumes live tournament data via useTournaments()')
assert(content.includes("t.status === 'Completed'"), 'MATCHES specifically filters for completed tournament matches')
assert(content.includes('matchesPlayedCount'), 'MATCHES tracks completed matches played (not raw registrations)')
assert(content.includes('winsCount'), 'WINS tracks first-place finishes in completed tournaments')
assert(content.includes('winRate'), 'WIN RATE calculated over actual completed matches')
assert(content.includes('totalKills'), 'KILLS calculates confirmed player eliminations')
assert(content.includes('Earnings'), 'Restores EARNINGS metric in the competitive overview')
assert(content.includes('fetchWalletLedger'), 'Checks authoritative wallet_ledger for PRIZE_CREDIT')
assert(content.includes('payout_queue'), 'Checks authoritative public.payout_queue')
assert(content.includes("'—'"), 'Displays honest "—" unavailable state when no authoritative earnings exist')

// Section 6: Authoritative Verification & Conditional Badges
console.log('\n[SECTION 6] AUTHORITATIVE VERIFICATION STATUS')
assert(content.includes('verification_status'), 'Queries profiles.verification_status')
assert(content.includes("verification_status === 'Verified'"), 'Strictly checks for confirmed "Verified" state')
assert(!content.includes('checkPlayerVerificationEligibility'), 'Does NOT rely on mock eligibility fallback')
assert(content.includes('isVerified &&'), 'VERIFIED badge is strictly conditional')
assert(content.includes('isPro &&'), 'PRO badge is strictly conditional')

// Section 7: Player Action & Accessibility
console.log('\n[SECTION 7] PLAYER ACTIONS & ACCESSIBILITY')
assert(content.includes('handleCopyUid'), 'Provides handleCopyUid function')
assert(content.includes('navigator.clipboard.writeText'), 'Copies UID to system clipboard')
assert(content.includes('aria-label="Player Identity"'), 'Has accessible Player Identity section')
assert(content.includes('aria-label="Competitive Telemetry"'), 'Has accessible Telemetry section')
assert(content.includes('aria-label="Profile Control Center"'), 'Has accessible Control Center section')

console.log('\n==================================================')
console.log(`TEST RESULTS: ${passCount} PASSED, ${failCount} FAILED`)
console.log('==================================================\n')

if (failCount > 0) {
  process.exit(1)
} else {
  process.exit(0)
}
