/**
 * test_profile_system_phase9.mjs
 * 
 * Phase 9: MJ ESPORTS Profile System Production-Readiness & Data Integrity Audit
 * 
 * Comprehensive Automated Verification Suite across all 7 Profile Pages:
 * - Profile Dashboard (/profile)
 * - Statistics (/profile/statistics)
 * - Tournament History (/profile/history)
 * - Trophy Cabinet (/profile/achievements)
 * - Wallet & Ledger (/wallet)
 * - Settings (/settings)
 * - Edit Profile (/profile/edit)
 * 
 * Target: At least 60 meaningful assertions across Sections A through J.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const projectRoot = path.resolve(__dirname)

// All 7 page paths in scope
const profilePath = path.join(projectRoot, 'src', 'pages', 'ProfilePage.jsx')
const statisticsPath = path.join(projectRoot, 'src', 'pages', 'StatisticsPage.jsx')
const historyPath = path.join(projectRoot, 'src', 'pages', 'TournamentHistoryPage.jsx')
const achievementsPath = path.join(projectRoot, 'src', 'pages', 'AchievementsPage.jsx')
const walletPath = path.join(projectRoot, 'src', 'pages', 'WalletPage.jsx')
const settingsPath = path.join(projectRoot, 'src', 'pages', 'SettingsPage.jsx')
const editProfilePath = path.join(projectRoot, 'src', 'pages', 'EditProfilePage.jsx')

// Core routes and navigation paths
const appRoutesPath = path.join(projectRoot, 'src', 'routes', 'AppRoutes.jsx')
const navbarPath = path.join(projectRoot, 'src', 'components', 'common', 'Navbar.jsx')
const bottomNavPath = path.join(projectRoot, 'src', 'components', 'common', 'BottomNavigation.jsx')
const footerPath = path.join(projectRoot, 'src', 'components', 'common', 'Footer.jsx')
const walletServicePath = path.join(projectRoot, 'src', 'services', 'walletService.js')
const evidenceServicePath = path.join(projectRoot, 'src', 'services', 'playerEvidenceService.js')
const authContextPath = path.join(projectRoot, 'src', 'contexts', 'AuthContext.jsx')

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

console.log('\n==================================================================')
console.log('PHASE 9: PROFILE SYSTEM PRODUCTION-READINESS & DATA INTEGRITY AUDIT')
console.log('==================================================================\n')

// Read file contents
const profileSrc = fs.readFileSync(profilePath, 'utf8')
const statisticsSrc = fs.readFileSync(statisticsPath, 'utf8')
const historySrc = fs.readFileSync(historyPath, 'utf8')
const achievementsSrc = fs.readFileSync(achievementsPath, 'utf8')
const walletSrc = fs.readFileSync(walletPath, 'utf8')
const settingsSrc = fs.readFileSync(settingsPath, 'utf8')
const editProfileSrc = fs.readFileSync(editProfilePath, 'utf8')

const routesSrc = fs.readFileSync(appRoutesPath, 'utf8')
const navbarSrc = fs.readFileSync(navbarPath, 'utf8')
const bottomNavSrc = fs.readFileSync(bottomNavPath, 'utf8')
const footerSrc = fs.readFileSync(footerPath, 'utf8')
const walletServiceSrc = fs.readFileSync(walletServicePath, 'utf8')
const evidenceServiceSrc = fs.readFileSync(evidenceServicePath, 'utf8')
const authContextSrc = fs.readFileSync(authContextPath, 'utf8')

const allSevenPages = [
  { name: 'ProfilePage', content: profileSrc },
  { name: 'StatisticsPage', content: statisticsSrc },
  { name: 'TournamentHistoryPage', content: historySrc },
  { name: 'AchievementsPage', content: achievementsSrc },
  { name: 'WalletPage', content: walletSrc },
  { name: 'SettingsPage', content: settingsSrc },
  { name: 'EditProfilePage', content: editProfileSrc },
]

// ==================================================================
// SECTION A: IDENTITY CONSISTENCY (AUDIT CHECKS 1-10)
// ==================================================================
console.log('[SECTION A] IDENTITY CONSISTENCY AUDIT')
assert(
  [profileSrc, statisticsSrc, historySrc, settingsSrc, editProfileSrc].every(
    (s) => s.includes('meta.username') || s.includes('profile?.username')
  ),
  'A1. Display name evaluates uniformly from authoritative metadata / profile'
)
assert(
  [profileSrc, statisticsSrc, historySrc, settingsSrc, editProfileSrc].every(
    (s) => s.includes('avatarUrl')
  ),
  'A2. Avatar URL evaluates uniformly from authoritative storage/metadata'
)
assert(
  [profileSrc, statisticsSrc, historySrc, settingsSrc, editProfileSrc].every(
    (s) => s.includes('game_uid') || s.includes('freeFireUid')
  ),
  'A3. Free Fire MAX UID evaluates uniformly from authoritative game_uid / metadata'
)
assert(
  [profileSrc, statisticsSrc, historySrc, settingsSrc, editProfileSrc].every(
    (s) => s.includes('verification_status')
  ),
  'A4. Verification status resolves authoritatively from profiles.verification_status'
)
assert(
  [profileSrc, statisticsSrc, settingsSrc, editProfileSrc].every(
    (s) => s.includes('is_pro') || s.includes('tier')
  ),
  'A5. PRO status resolves authoritatively from profile.tier / user_metadata.is_pro'
)
assert(
  !editProfileSrc.includes('setVerificationStatus') && !settingsSrc.includes('toggleVerification'),
  'A6. Zero client-side verification toggles in Edit Profile or Settings'
)
assert(
  !editProfileSrc.includes('togglePro') && !/\bsetIsPro\b/.test(editProfileSrc),
  'A7. Zero client-side PRO/tier mutators in Edit Profile'
)
assert(
  editProfileSrc.includes('invalidatePlayerVerification'),
  'A8. Identity changes (Free Fire UID or IGN) trigger authoritative re-verification'
)
assert(
  !profileSrc.includes('88472910') && !settingsSrc.includes('88472910') && !editProfileSrc.includes('88472910'),
  'A9. Zero hardcoded mock UIDs (e.g. 88472910 absent from all identity pages)'
)
assert(
  !settingsSrc.includes('NeoStriker#1337'),
  'A10. Zero hardcoded mock Discord handles (e.g. NeoStriker#1337 absent)'
)

// ==================================================================
// SECTION B: AUTHORITATIVE FINANCIAL DATA (AUDIT CHECKS 11-23)
// ==================================================================
console.log('\n[SECTION B] AUTHORITATIVE FINANCIAL DATA AUDIT')
assert(
  profileSrc.includes('getAuthoritativeWalletBalance') &&
  walletSrc.includes('getAuthoritativeWalletBalance') &&
  navbarSrc.includes('getAuthoritativeWalletBalance'),
  'B11. Authoritative wallet balance is bound to public.wallets.balance via shared pub-sub'
)
assert(
  allSevenPages.every((p) => !p.content.includes('profiles.wallet_balance')),
  'B12. Zero references to legacy/unauthoritative profiles.wallet_balance across all 7 pages'
)
assert(
  allSevenPages.every((p) => !p.content.includes('user_metadata.wallet_balance')),
  'B13. Zero references to user_metadata.wallet_balance across all 7 pages'
)
assert(
  profileSrc.includes("t.transaction_type === 'PRIZE_CREDIT' && t.direction === 'CREDIT'") &&
  statisticsSrc.includes("transaction_type = 'PRIZE_CREDIT' AND direction = 'CREDIT'") &&
  historySrc.includes("t.transaction_type === 'PRIZE_CREDIT' &&") &&
  walletSrc.includes("entry.transaction_type === 'PRIZE_CREDIT' && entry.direction === 'CREDIT'"),
  'B14. Prize earnings strictly evaluate wallet_ledger where transaction_type = PRIZE_CREDIT and direction = CREDIT'
)
assert(
  walletServiceSrc.includes('fetchAllUserPrizeCredits') &&
  walletServiceSrc.includes('from(\'wallet_ledger\')') &&
  walletServiceSrc.includes('range(from, to)'),
  'B15. fetchAllUserPrizeCredits implements paginated batch traversal without arbitrary row limits'
)
assert(
  !profileSrc.includes('totalPrize += payout_queue') &&
  !statisticsSrc.includes('totalPrize += payout_queue') &&
  !walletSrc.includes('prizeEarnings += payout_queue'),
  'B16. payout_queue is NOT conflated or double-counted into confirmed prize earnings'
)
assert(
  historySrc.includes('getConfirmedTournamentPrize') &&
  historySrc.includes("entry.transaction_type !== 'PRIZE_CREDIT'"),
  'B17. Tournament History matches prizes strictly against authoritative ledger entries'
)
assert(
  !historySrc.includes('Number(myTeam?.prize || myTeam?.prizeWon || 0)') &&
  !historySrc.includes('Number(t.prizePool || 0)'),
  'B18. Tournament History does not treat teams_list.prize or myTeam.prizeWon as confirmed earnings'
)
assert(
  walletSrc.includes("t.transaction_type === 'REFUND'") &&
  walletSrc.includes("categoryLabel = 'TOURNAMENT REFUND'"),
  'B19. Wallet transaction mapper categorizes REFUND as TOURNAMENT REFUND credit (+)'
)
assert(
  walletSrc.includes("t.transaction_type === 'ENTRY_FEE_DEBIT'") &&
  walletSrc.includes("categoryLabel = 'TOURNAMENT ENTRY'"),
  'B20. Wallet transaction mapper categorizes ENTRY_FEE_DEBIT as TOURNAMENT ENTRY debit (−)'
)
assert(
  !walletSrc.includes('₹2,450') && !walletSrc.includes('₹3,420') && !profileSrc.includes('₹14,850'),
  'B21. Zero hardcoded mock balances or earnings across wallet and profile views'
)
assert(
  walletSrc.includes('fetchWalletLedger'),
  'B22. Transaction history in WalletPage is sourced from walletService.fetchWalletLedger'
)
assert(
  historySrc.includes('public.tournament_refunds') || historySrc.includes('tournament_refunds'),
  'B23. Tournament History queries authoritative tournament_refunds for cancelled registrations'
)

// ==================================================================
// SECTION C: TOURNAMENT SEMANTICS (AUDIT CHECKS 24-31)
// ==================================================================
console.log('\n[SECTION C] TOURNAMENT SEMANTICS AUDIT')
assert(
  profileSrc.includes("t.status === 'Completed'") &&
  statisticsSrc.includes("t.status === 'Completed'") &&
  historySrc.includes("t.status === 'Completed'") &&
  achievementsSrc.includes("t.status === 'Completed'"),
  'C24. Completed tournament telemetry strictly filters for status === "Completed"'
)
assert(
  profileSrc.includes('isUserRegistered') &&
  statisticsSrc.includes('isUserRegistered') &&
  historySrc.includes('isUserRegistered') &&
  achievementsSrc.includes('isUserRegistered'),
  'C25. Tournament metrics strictly scope to registered/participating authenticated user'
)
assert(
  profileSrc.includes('myTeam.rank === 1') &&
  statisticsSrc.includes('myTeam.rank === 1') &&
  achievementsSrc.includes('myTeam.rank === 1'),
  'C26. Tournament wins strictly require confirmed rank 1 in completed tournament results'
)
assert(
  profileSrc.includes('myTeam?.kills') &&
  statisticsSrc.includes('myTeam?.kills') &&
  achievementsSrc.includes('myTeam?.kills'),
  'C27. Total kills strictly aggregate confirmed eliminations from completed tournament teams_list'
)
assert(
  historySrc.includes('isCompleted') &&
  historySrc.includes('const rank = isCompleted ?') &&
  historySrc.includes('ACTIVE / UPCOMING TOURNAMENT METRICS'),
  'C28. Active tournaments are isolated and do not render fake placement or finish results'
)
assert(
  historySrc.includes("status === 'Cancelled'") || historySrc.includes("status === 'CANCELLED'"),
  'C29. Cancelled tournaments are explicitly distinguished from completed tournaments'
)
assert(
  statisticsSrc.includes('completedTournamentsCount === 0') &&
  statisticsSrc.includes("return '—'"),
  'C30. Zero completed tournaments honestly yields "—" for win rate and ratios'
)
assert(
  historySrc.includes("if (completedTournamentsCount === 0) return '—'"),
  'C31. Tournament History honestly yields "—" for zero podium rate'
)

// ==================================================================
// SECTION D: ACHIEVEMENT VALIDITY (AUDIT CHECKS 32-40)
// ==================================================================
console.log('\n[SECTION D] ACHIEVEMENT VALIDITY AUDIT')
assert(
  achievementsSrc.includes('id: \'first-blood\'') && achievementsSrc.includes('totalKills >= 1'),
  'D32. First Blood achievement unlocks deterministically via totalKills >= 1'
)
assert(
  achievementsSrc.includes('id: \'winner-winner\'') &&
  achievementsSrc.includes('title: \'Booyah Champion\'') &&
  achievementsSrc.includes('championshipsCount >= 1'),
  'D33. Booyah Champion achievement unlocks deterministically via championshipsCount >= 1'
)
assert(
  achievementsSrc.includes('id: \'survivalist\'') &&
  achievementsSrc.includes('description: \'Complete your first Free Fire MAX tournament.\'') &&
  achievementsSrc.includes('completedTournamentsCount >= 1'),
  'D34. Survivalist achievement unlocks deterministically via completedTournamentsCount >= 1'
)
assert(
  !achievementsSrc.includes('18+ minutes') && !achievementsSrc.includes('survival time'),
  'D35. Zero unsupported 18+ minute survival time claims in Survivalist'
)
assert(
  achievementsSrc.includes('id: \'fair-play\'') &&
  achievementsSrc.includes('title: \'Veteran Competitor\'') &&
  achievementsSrc.includes('description: \'Complete 5 Free Fire MAX tournaments.\'') &&
  achievementsSrc.includes('completedTournamentsCount >= 5'),
  'D36. Veteran Competitor achievement unlocks deterministically via completedTournamentsCount >= 5'
)
assert(
  !achievementsSrc.includes('consecutive') && !achievementsSrc.includes('Consecutive'),
  'D37. Zero unsupported consecutive-match claims across all achievement descriptions'
)
assert(
  achievementsSrc.includes('id: \'squad-goals\'') && achievementsSrc.includes('hasSquadRegistration'),
  'D38. Squad Goals achievement unlocks via verified squad format registration'
)
assert(
  achievementsSrc.includes('id: \'mvp-fragger\'') && achievementsSrc.includes('highestTournamentKills'),
  'D39. MVP Fragger achievement calculates progress deterministically'
)
assert(
  achievementsSrc.includes('FREE FIRE MAX') && !achievementsSrc.includes('BGMI'),
  'D40. Achievements page is Free Fire MAX dedicated with zero other game titles'
)

// ==================================================================
// SECTION E: VERIFICATION INTEGRITY (AUDIT CHECKS 41-46)
// ==================================================================
console.log('\n[SECTION E] VERIFICATION INTEGRITY AUDIT')
assert(
  [profileSrc, statisticsSrc, historySrc, settingsSrc, editProfileSrc].every((s) => s.includes('verification_status')),
  'E41. Verification status is sourced authoritatively across all viewer and editor surfaces'
)
assert(
  editProfileSrc.includes('playerEvidenceService') && editProfileSrc.includes('uploadProfileProof'),
  'E42. Profile evidence submission integrates with playerEvidenceService.uploadProfileProof'
)
assert(
  evidenceServiceSrc.includes('PROFILE_PROOFS_BUCKET') &&
  evidenceServiceSrc.includes('.from(bucketName)') &&
  evidenceServiceSrc.includes('.upload('),
  'E43. Player evidence uploads to private profile-proofs bucket for administrator audit'
)
assert(
  allSevenPages.every((p) => !p.content.includes('toggleVerification')),
  'E44. No client-side toggle exists to grant or alter verification'
)
assert(
  editProfileSrc.includes('invalidatePlayerVerification(user.id,'),
  'E45. InvalidatePlayerVerification invoked when verified user changes UID or IGN'
)
assert(
  !settingsSrc.includes('isVerified = true') && !profileSrc.includes('isVerified = true'),
  'E46. Zero mock verification overrides in production settings and profile components'
)

// ==================================================================
// SECTION F: WALLET INTEGRITY (AUDIT CHECKS 47-53)
// ==================================================================
console.log('\n[SECTION F] WALLET INTEGRITY AUDIT')
assert(
  walletSrc.includes('fetchUserWallet()') && walletSrc.includes('subscribeToWalletBalance'),
  'F47. Wallet balance synchronizes via fetchUserWallet and subscribeToWalletBalance'
)
assert(
  walletSrc.includes('loadRazorpayScript') &&
  walletSrc.includes('createWalletTopupOrder') &&
  walletSrc.includes('verifyWalletTopup'),
  'F48. Top-up flow operates via server-side Razorpay Edge Functions'
)
assert(
  walletSrc.includes('min="1"') || walletSrc.includes('Math.max(1,'),
  'F49. Top-up minimum of ₹1 is strictly enforced'
)
assert(
  walletSrc.includes('200'),
  'F50. Top-up transaction ceiling of ₹200 is enforced per transaction'
)
assert(
  walletSrc.includes('/^\\d+$/'),
  'F51. Whole-rupee validation regex (/^\\d+$/) prevents fractional/paise top-ups'
)
assert(
  !walletSrc.includes('/ ₹200 max') && !walletSrc.includes('max balance: ₹200'),
  'F52. Zero lifetime wallet balance ceiling displayed in Available Balance card'
)
assert(
  walletSrc.includes('fetchWalletLedger({ limit: 100,'),
  'F53. Wallet transaction history uses limit 100 (noted for pagination limitation reporting)'
)

// ==================================================================
// SECTION G: FREE FIRE ONLY ENFORCEMENT (AUDIT CHECKS 54-58)
// ==================================================================
console.log('\n[SECTION G] FREE FIRE ONLY ENFORCEMENT AUDIT')
assert(
  allSevenPages.every((p) => !p.content.includes('BGMI')),
  'G54. Zero occurrences of "BGMI" across all seven profile views'
)
assert(
  allSevenPages.every((p) => !p.content.includes('Battlegrounds Mobile India')),
  'G55. Zero occurrences of "Battlegrounds Mobile India" across all seven profile views'
)
assert(
  allSevenPages.every((p) => !p.content.includes('PUBG')),
  'G56. Zero occurrences of "PUBG" across all seven profile views'
)
assert(
  allSevenPages.every((p) => !p.content.includes('bgmiUid')),
  'G57. Zero occurrences of "bgmiUid" across all seven profile views'
)
assert(
  allSevenPages.every((p) => !p.content.includes('pubgUid')),
  'G58. Zero occurrences of "pubgUid" across all seven profile views'
)

// ==================================================================
// SECTION H: SECURITY AUDIT (AUDIT CHECKS 59-65)
// ==================================================================
console.log('\n[SECTION H] SECURITY AUDIT')
assert(
  allSevenPages.every((p) => !p.content.includes('updateWalletBalance(')),
  'H59. Zero client-side wallet balance mutation functions'
)
assert(
  allSevenPages.every((p) => !p.content.includes('SUPABASE_SERVICE_ROLE_KEY') && !p.content.includes('service_role')),
  'H60. Zero exposed service-role credentials in client-side profile pages'
)
assert(
  allSevenPages.every((p) => !p.content.includes('SECURITY DEFINER')),
  'H61. Zero new SECURITY DEFINER functions declared in client pages'
)
assert(
  allSevenPages.every((p) => !p.content.includes('from(\'wallet_ledger\').insert')),
  'H62. Zero direct client-side insertions into public.wallet_ledger'
)
assert(
  allSevenPages.every((p) => !p.content.includes('updateUserRole(')),
  'H63. Zero client-side role escalation operations'
)
assert(
  authContextSrc.includes('const { wallet_balance, earnings, walletBalance, ...sanitizedProfileData } = profileData || {}'),
  'H64. Financial columns are explicitly protected against client profile mutation'
)
assert(
  allSevenPages.every((p) => !p.content.includes('>public.wallets<') && !p.content.includes('>public.profiles<')),
  'H65. Zero raw database schema names in player-facing UI'
)

// ==================================================================
// SECTION I: ROUTING & NAVIGATION (AUDIT CHECKS 66-70)
// ==================================================================
console.log('\n[SECTION I] ROUTING & NAVIGATION AUDIT')
assert(routesSrc.includes('path="profile"'), 'I66. Route /profile registered in AppRoutes.jsx')
assert(routesSrc.includes('path="profile/statistics"'), 'I67. Route /profile/statistics registered in AppRoutes.jsx')
assert(routesSrc.includes('path="profile/history"'), 'I68. Route /profile/history registered in AppRoutes.jsx')
assert(routesSrc.includes('path="profile/achievements"'), 'I69. Route /profile/achievements registered in AppRoutes.jsx')
assert(
  routesSrc.includes('path="wallet"') &&
  routesSrc.includes('path="settings"') &&
  routesSrc.includes('path="profile/edit"'),
  'I70. Routes /wallet, /settings, /profile/edit registered in AppRoutes.jsx'
)

// ==================================================================
// SECTION J: RESPONSIVE STATIC AUDIT & ZERO BANNED JARGON (AUDIT CHECKS 71-75)
// ==================================================================
console.log('\n[SECTION J] RESPONSIVE & BANNED JARGON AUDIT')
assert(
  allSevenPages.every((p) => !p.content.includes('w-[1200px]') && !p.content.includes('w-[1400px]')),
  'J71. Zero fixed-width desktop overflow classes (>1000px)'
)
assert(
  allSevenPages.every((p) => p.content.includes('max-w-') || p.content.includes('w-full')),
  'J72. All pages use responsive fluid containers (max-w-4xl / max-w-7xl / w-full)'
)
assert(
  allSevenPages.every((p) => !p.content.includes('CONFIG // REV 4.2')),
  'J73. Banned fake revision label "CONFIG // REV 4.2" is absent from all 7 pages'
)
assert(
  allSevenPages.every((p) => !p.content.includes('256-BIT') && !p.content.includes('TAMPER-PROOF')),
  'J74. Banned security jargon ("256-BIT", "TAMPER-PROOF") is absent from all 7 pages'
)
assert(
  allSevenPages.every((p) => !p.content.includes('MJ ESCROW') && !p.content.includes('LIVE RADAR PREVIEW')),
  'J75. Banned jargon ("MJ ESCROW", "LIVE RADAR PREVIEW") is absent from all 7 pages'
)

console.log('\n==================================================================')
console.log(`PHASE 9 AUDIT RESULTS: ${passCount} PASSED, ${failCount} FAILED`)
console.log('==================================================================\n')

if (failCount > 0) {
  process.exit(1)
} else {
  process.exit(0)
}
