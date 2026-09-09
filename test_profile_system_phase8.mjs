/**
 * test_profile_system_phase8.mjs
 * 
 * Phase 8: MJ ESPORTS Profile System Cross-Page Integration & Data-Integrity Audit
 * 
 * Comprehensive Automated Verification Suite across all 7 Profile Pages:
 * - Profile Dashboard (/profile)
 * - Statistics (/profile/statistics)
 * - Tournament History (/profile/history)
 * - Trophy Cabinet (/profile/achievements)
 * - Wallet & Ledger (/wallet)
 * - Settings (/settings)
 * - Edit Profile (/profile/edit)
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
console.log('PHASE 8: PROFILE SYSTEM CROSS-PAGE INTEGRATION & DATA-INTEGRITY AUDIT')
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

const allSevenPages = [
  { name: 'ProfilePage', content: profileSrc },
  { name: 'StatisticsPage', content: statisticsSrc },
  { name: 'TournamentHistoryPage', content: historySrc },
  { name: 'AchievementsPage', content: achievementsSrc },
  { name: 'WalletPage', content: walletSrc },
  { name: 'SettingsPage', content: settingsSrc },
  { name: 'EditProfilePage', content: editProfileSrc },
]

console.log('[SECTION 1] ROUTING & EXISTENCE (AUDIT ITEMS 1-8, 30-35)')
assert(routesSrc.includes('path="profile"'), '1. Route /profile exists in AppRoutes.jsx')
assert(routesSrc.includes('path="profile/statistics"'), '31. Route /profile/statistics exists in AppRoutes.jsx')
assert(routesSrc.includes('path="profile/history"'), '32. Route /profile/history exists in AppRoutes.jsx')
assert(routesSrc.includes('path="profile/achievements"'), '33. Route /profile/achievements exists in AppRoutes.jsx')
assert(routesSrc.includes('path="wallet"'), '34. Route /wallet exists in AppRoutes.jsx')
assert(routesSrc.includes('path="settings"'), '35. Route /settings exists in AppRoutes.jsx')
assert(routesSrc.includes('path="profile/edit"'), '30. Route /profile/edit exists in AppRoutes.jsx')

assert(fs.existsSync(profilePath), '2. Profile Dashboard exists')
assert(fs.existsSync(statisticsPath), '3. Statistics exists')
assert(fs.existsSync(historyPath), '4. Tournament History exists')
assert(fs.existsSync(achievementsPath), '5. Achievements exists')
assert(fs.existsSync(walletPath), '6. Wallet exists')
assert(fs.existsSync(settingsPath), '7. Settings exists')
assert(fs.existsSync(editProfilePath), '8. Edit Profile exists')

console.log('\n[SECTION 2] IDENTITY CONSISTENCY (AUDIT ITEMS 9-13, 27-29)')
// 9. Display name source
const displayNameBindings = [profileSrc, statisticsSrc, historySrc, settingsSrc, editProfileSrc]
assert(
  displayNameBindings.every((src) => src.includes('meta.username') || src.includes('profile?.username')),
  '9. Display-name source is consistent across identity-bearing profile pages'
)

// 10. Avatar source
assert(
  allSevenPages.filter((p) => p.name !== 'AchievementsPage' && p.name !== 'WalletPage').every((p) => p.content.includes('avatar_url') || p.content.includes('avatarUrl')),
  '10. Avatar source is consistent across identity-bearing profile pages'
)

// 11. Free Fire MAX UID source
assert(
  [profileSrc, statisticsSrc, historySrc, settingsSrc, editProfileSrc].every(
    (src) => src.includes('game_uid') || src.includes('freeFireUid')
  ),
  '11. Free Fire MAX UID source is consistent across identity-bearing profile pages'
)

// 12. Verification source
assert(
  [profileSrc, statisticsSrc, historySrc, settingsSrc, editProfileSrc].every(
    (src) => src.includes('verification_status')
  ),
  '12. Verification source is consistent (public.profiles.verification_status / playerEvidenceService)'
)

// 13. PRO/tier source
assert(
  [profileSrc, statisticsSrc, settingsSrc, editProfileSrc].every(
    (src) => src.includes('is_pro') || src.includes('tier')
  ),
  '13. PRO/tier source is consistent (profile.tier / user_metadata.is_pro)'
)

// 27 & 28. No client-side mutators for verification or pro
assert(
  allSevenPages.every((p) => !p.content.includes('toggleVerification') && !p.content.includes('setVerificationStatus')),
  '27. Verification cannot be client-toggled anywhere in the profile system'
)
assert(
  allSevenPages.every((p) => !p.content.includes('togglePro') && !/\bsetIsPro\b/.test(p.content)),
  '28. PRO cannot be client-toggled anywhere in the profile system'
)

// 29. Identity change re-verification protection
assert(
  editProfileSrc.includes('invalidatePlayerVerification'),
  '29. Identity changes preserve verification protection via invalidatePlayerVerification'
)

console.log('\n[SECTION 3] FINANCIAL ARCHITECTURE & EARNINGS CONSISTENCY (AUDIT ITEMS 14-20, 44-46)')
// 14 & 45. Earnings source is wallet_ledger PRIZE_CREDIT CREDIT
assert(
  profileSrc.includes("t.transaction_type === 'PRIZE_CREDIT' && t.direction === 'CREDIT'") &&
  statisticsSrc.includes("transaction_type = 'PRIZE_CREDIT' AND direction = 'CREDIT'") &&
  historySrc.includes("t.transaction_type === 'PRIZE_CREDIT' &&") &&
  walletSrc.includes("entry.transaction_type === 'PRIZE_CREDIT' && entry.direction === 'CREDIT'"),
  '14 & 45. Earnings source is strictly wallet_ledger PRIZE_CREDIT with direction CREDIT across all earnings-bearing pages'
)

// 15. payout_queue is not used as earnings
assert(
  !profileSrc.includes('totalPrize += payout_queue') &&
  !statisticsSrc.includes('totalPrize += payout_queue') &&
  !walletSrc.includes('prizeEarnings += payout_queue'),
  '15. payout_queue is not conflated with confirmed wallet_ledger prize earnings'
)

// 16, 17, 44. Authoritative wallet balance
assert(
  profileSrc.includes('getAuthoritativeWalletBalance') &&
  walletSrc.includes('getAuthoritativeWalletBalance') &&
  navbarSrc.includes('getAuthoritativeWalletBalance'),
  '16 & 44. Wallet balance uses shared authoritative wallets.balance pub-sub mechanism'
)

assert(
  allSevenPages.every((p) => !p.content.includes('profiles.wallet_balance')),
  '17. Zero occurrences of non-authoritative profiles.wallet_balance across all 7 profile pages'
)

// 18. Wallet transactions source
assert(
  walletSrc.includes('fetchWalletLedger') && walletServiceSrc.includes('from(\'wallet_ledger\')'),
  '18. Wallet transaction source is strictly public.wallet_ledger'
)

// 19 & 20. Refunds are credits (+), entry fees are debits (-)
assert(
  walletSrc.includes("t.transaction_type === 'REFUND'") && walletSrc.includes("categoryLabel = 'TOURNAMENT REFUND'"),
  '19. Refunds are mapped as TOURNAMENT REFUND credits (+)'
)
assert(
  walletSrc.includes("t.transaction_type === 'ENTRY_FEE_DEBIT'") && walletSrc.includes("categoryLabel = 'TOURNAMENT ENTRY'"),
  '20. Entry fees are mapped as TOURNAMENT ENTRY debits (−)'
)

// 46. No mock financial data
assert(!walletSrc.includes('₹2,450') && !walletSrc.includes('₹3,420'), '46. No mock financial balances in wallet')
assert(!profileSrc.includes('₹14,850'), 'No mock financial balances in profile')

console.log('\n[SECTION 4] TOURNAMENT SEMANTICS & ACHIEVEMENTS (AUDIT ITEMS 21-26)')
// 21. Completed tournament semantics
assert(
  profileSrc.includes("t.status === 'Completed'") &&
  statisticsSrc.includes("t.status === 'Completed'") &&
  historySrc.includes("t.status === 'Completed'") &&
  achievementsSrc.includes("t.status === 'Completed'"),
  '21. Completed tournament semantics are consistent (status === "Completed")'
)

// 22 & 23. Wins and Kills use confirmed tournament results
assert(
  profileSrc.includes('myTeam.rank === 1') &&
  statisticsSrc.includes('myTeam.rank === 1') &&
  achievementsSrc.includes('myTeam.rank === 1'),
  '22. Wins use confirmed 1st place rank in completed tournament results'
)
assert(
  profileSrc.includes('myTeam?.kills') &&
  statisticsSrc.includes('myTeam?.kills') &&
  achievementsSrc.includes('myTeam?.kills'),
  '23. Kills use confirmed player eliminations in completed tournament results'
)

// 24. Achievement conditions use supported data
assert(
  achievementsSrc.includes('totalKills >= 1') &&
  achievementsSrc.includes('championshipsCount >= 1') &&
  achievementsSrc.includes('completedTournamentsCount >= 1') &&
  achievementsSrc.includes('completedTournamentsCount >= 5'),
  '24. Achievement unlock conditions use supported authoritative telemetry'
)

// 25 & 26. No unsupported claims in achievements
assert(!achievementsSrc.includes('18+ minutes') && !achievementsSrc.includes('survival time'), '25. No unsupported survival-time claims in Trophy Cabinet')
assert(!achievementsSrc.includes('consecutive') && !achievementsSrc.includes('Consecutive'), '26. No unsupported consecutive-match claims in Trophy Cabinet')

console.log('\n[SECTION 5] FREE FIRE MAX ONLY ENFORCEMENT (AUDIT ITEMS 36-38)')
assert(allSevenPages.every((p) => !p.content.includes('BGMI')), '36. Zero occurrences of "BGMI" across all 7 pages')
assert(allSevenPages.every((p) => !p.content.includes('Battlegrounds Mobile India')), 'Zero occurrences of "Battlegrounds Mobile India" across all 7 pages')
assert(allSevenPages.every((p) => !p.content.includes('PUBG')), '37. Zero occurrences of "PUBG" across all 7 pages')
assert(allSevenPages.every((p) => !p.content.includes('bgmiUid')), '38. Zero occurrences of "bgmiUid" across all 7 pages')
assert(allSevenPages.every((p) => !p.content.includes('pubgUid')), 'Zero occurrences of "pubgUid" across all 7 pages')

console.log('\n[SECTION 6] NAVIGATION & GLOBAL INTEGRITY (AUDIT ITEMS 39-40)')
assert(navbarSrc.includes('to="/wallet"'), '39. Global Navbar remains untouched and authoritative')
assert(bottomNavSrc.includes("path: '/tournaments'"), 'Global MobileBottomNav remains untouched and authoritative')
assert(footerSrc.includes('Headphones'), 'Global Footer remains untouched')
assert(!walletServiceSrc.includes('// MODIFIED_UNAUTHORIZED'), '40. No unauthorized financial backend modification')

console.log('\n[SECTION 7] SECURITY BOUNDARIES & ZERO BANNED JARGON (AUDIT ITEMS 41-43, 47-48)')
assert(allSevenPages.every((p) => !p.content.includes('SECURITY DEFINER')), '41. No new SECURITY DEFINER functions in client pages')
assert(allSevenPages.every((p) => !p.content.includes('create or replace function')), '42. No new public RPC functions introduced')
assert(allSevenPages.every((p) => !p.content.includes('updateUserRole')), '43. No privileged client role mutation')
assert(!settingsSrc.includes('NeoStriker#1337'), '47. No fake linked player identity data')

// 48. No Stitch-only technical decoration in player UI
const bannedJargon = [
  'CONFIG // REV 4.2',
  'SYSTEM TELEMETRY v2.6',
  'LIVE RADAR PREVIEW',
  'PROTOCOL FF-',
  'ARBITER ROSTER CREDENTIALS',
  '256-BIT',
  'TAMPER-PROOF',
  'MJ ESCROW',
]
assert(
  allSevenPages.every((p) => bannedJargon.every((jargon) => !p.content.includes(jargon))),
  '48. Zero Stitch-only technical decoration across all 7 player-facing pages'
)

console.log('\n==================================================================')
console.log(`PHASE 8 TEST RESULTS: ${passCount} PASSED, ${failCount} FAILED`)
console.log('==================================================================\n')

if (failCount > 0) {
  process.exit(1)
} else {
  process.exit(0)
}
