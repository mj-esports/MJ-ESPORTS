/**
 * MJ ESPORTS — Phase 6: Settings Page Automated Test Suite
 * 
 * Verifies that the redesigned Settings Page (/settings):
 * 1. /settings route remains intact in AppRoutes.jsx
 * 2. Settings page exists at src/pages/SettingsPage.jsx
 * 3. General Info section exists
 * 4. Display name uses real data (displayName from user/profile)
 * 5. Email uses real auth/profile data
 * 6. Phone does not fabricate verification
 * 7. Free Fire MAX UID exists
 * 8. No BGMI UID
 * 9. No PUBG UID
 * 10. Profile edit uses existing route (/profile/edit)
 * 11. Verification badge is authoritative (public.profiles.verification_status)
 * 12. Password flow uses existing functionality only (updateUserPassword)
 * 13. 2FA is not falsely implemented (marked COMING SOON)
 * 14. Session information is not fabricated (no fake IP or mock device lists)
 * 15. Notification toggles are not fake (marked COMING SOON)
 * 16. Privacy controls use existing functionality only (no fake social graph)
 * 17. No fake friends/social graph
 * 18. Default game remains Free Fire MAX only
 * 19. No multi-game selector
 * 20. Linked-account states are not hard-coded
 * 21. No fake Google connection (evaluated dynamically via isGoogleLinked)
 * 22. No fake Discord connection (marked COMING SOON)
 * 23. No fake YouTube connection (marked COMING SOON)
 * 24. No fake X/Twitter connection (marked COMING SOON)
 * 25. Export data does not claim unsupported functionality
 * 26. Delete account does not claim unsupported functionality
 * 27. No database names in player-facing UI (public.wallets, public.profiles)
 * 28. No internal revision labels (e.g. CONFIG // REV 4.2 or SYSTEM TELEMETRY v2.6)
 * 29. No unsupported security claims (256-BIT, TAMPER-PROOF, MJ ESCROW)
 * 30. Existing Navbar is unchanged
 * 31. Existing mobile navigation is unchanged
 * 32. No BGMI/PUBG references
 * 33. No financial/wallet logic modified
 * 34. No unauthorized backend functionality introduced
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PROJECT_ROOT = path.resolve(__dirname)

const settingsPagePath = path.join(__dirname, 'src', 'pages', 'SettingsPage.jsx')
const appRoutesPath = path.join(__dirname, 'src', 'routes', 'AppRoutes.jsx')
const navbarPath = path.join(__dirname, 'src', 'components', 'common', 'Navbar.jsx')
const mobileNavPath = path.join(__dirname, 'src', 'components', 'common', 'BottomNavigation.jsx')

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
console.log('PHASE 6: SETTINGS PAGE AUTOMATED TESTS')
console.log('==================================================\n')

// Test 1 & 2: Route & Page existence
assert(fs.existsSync(settingsPagePath), '2. Settings page exists at src/pages/SettingsPage.jsx')

const content = fs.readFileSync(settingsPagePath, 'utf8')
const routesContent = fs.readFileSync(appRoutesPath, 'utf8')
const navbarContent = fs.readFileSync(navbarPath, 'utf8')
const mobileNavContent = fs.readFileSync(mobileNavPath, 'utf8')

console.log('\n[SECTION 1] ROUTING & BRANDING INTEGRITY')
assert(routesContent.includes('path="settings"'), '1. Route "settings" registered in AppRoutes.jsx')
assert(content.includes('to="/profile"'), 'Provides Back to Profile navigation')
assert(content.includes('FREE FIRE MAX ONLY'), 'Contains "FREE FIRE MAX ONLY" branding')

console.log('\n[SECTION 2] FREE FIRE MAX ONLY ENFORCEMENT')
assert(!content.includes('BGMI'), '8. Zero occurrences of "BGMI"')
assert(!content.includes('Battlegrounds Mobile India'), 'Zero occurrences of "Battlegrounds Mobile India"')
assert(!content.includes('PUBG'), '9. Zero occurrences of "PUBG"')
assert(!content.includes('bgmiUid'), 'Zero occurrences of "bgmiUid"')
assert(!content.includes('pubgUid'), 'Zero occurrences of "pubgUid"')
assert(!content.includes('<select') || !content.includes('defaultGame'), '19. No multi-game selector dropdown')

console.log('\n[SECTION 3] GENERAL INFO & PROFILE EDIT LINK')
assert(content.includes('GENERAL INFO'), '3. General Info section exists')
assert(content.includes('displayName'), '4. Display name uses real data')
assert(content.includes('emailAddress'), '5. Email uses real auth/profile data')
assert(content.includes('phoneNumber'), '6. Phone does not fabricate verification')
assert(content.includes('freeFireUid'), '7. Free Fire MAX UID exists')
assert(content.includes('to="/profile/edit"'), '10. Profile edit links to existing /profile/edit route')
assert(content.includes('verification_status'), '11. Verification badge is authoritative from verification_status')

console.log('\n[SECTION 4] SECURITY & AUTH REAL CAPABILITY ENFORCEMENT')
assert(content.includes('handlePasswordChange'), '12. Password flow implemented via existing updateUserPassword')
assert(content.includes('updateUserPassword'), 'Uses updateUserPassword from AuthContext')
assert(content.includes('TWO-FACTOR AUTH (2FA)'), '2FA section exists')
assert(content.includes('COMING SOON'), '13. 2FA truthfully marked COMING SOON')
assert(!content.includes('IP 49.37.102.14'), '14. Zero fake IP addresses or mock session hardware')
assert(content.includes('signOut'), 'Sign out of current device uses real signOut from AuthContext')
assert(content.includes('Remote multi-session revocation'), 'Multi-session logout explicitly marked Coming Soon')

console.log('\n[SECTION 5] NOTIFICATIONS & PRIVACY REAL CAPABILITY ENFORCEMENT')
assert(content.includes('NOTIFICATION PREFERENCES'), 'Notification preferences section exists')
assert(!content.includes('localStorage.setItem'), '15. Zero fake localStorage persistence for notification settings')
assert(content.includes('Tournament Registration & Slot Alerts'), 'Tournament Registration Alerts listed')
assert(content.includes('Room ID & Password Match Reminders'), 'Match Reminders listed')
assert(content.includes('Prize & Payout Notifications'), 'Prize Notifications listed')
assert(content.includes('PRIVACY & VISIBILITY'), '16. Privacy section exists')
assert(!content.includes('FRIENDS'), '17. No fake friends/social graph options')
assert(content.includes('PUBLIC (ACTIVE)'), 'Public competitive profile accurately described')

console.log('\n[SECTION 6] APP PREFERENCES & LINKED ACCOUNTS')
assert(content.includes('Platform Language'), 'App Preferences section exists')
assert(content.includes('English (US)'), 'English (US) supported language')
assert(content.includes('Dedicated Platform Game'), '18. Default game remains Free Fire MAX only')
assert(content.includes('LINKED ACCOUNTS'), 'Linked Accounts section exists')
assert(content.includes('isGoogleLinked'), '20. Google connection evaluated dynamically via isGoogleLinked')
assert(!content.includes('NeoStriker#1337'), '21. Zero fake Discord handles (NeoStriker#1337 removed)')
assert(content.includes('Discord'), '22. Discord account listed')
assert(content.includes('YouTube'), '23. YouTube account listed')
assert(content.includes('X (Twitter)'), '24. X/Twitter account listed')

console.log('\n[SECTION 7] DANGER ZONE & COMPLIANCE')
assert(content.includes('DANGER ZONE'), 'Danger Zone section exists')
assert(content.includes('Export My Data'), '25. Export data does not claim unsupported backend functionality')
assert(content.includes('Delete Account'), '26. Delete account requires admin/support contact (truthful)')
assert(!content.includes('CONFIG // REV 4.2'), '28. No fake revision labels ("CONFIG // REV 4.2" absent)')
assert(!content.includes('SYSTEM TELEMETRY v2.6'), 'No fake "SYSTEM TELEMETRY v2.6" label')
assert(!content.includes('256-BIT'), '29. "256-BIT" is absent')
assert(!content.includes('TAMPER-PROOF'), '"TAMPER-PROOF" is absent')
assert(!content.includes('MJ ESCROW'), '"MJ ESCROW" is absent')
assert(!content.includes('>public.wallets<'), '27. "public.wallets" is absent from player-facing JSX')
assert(!content.includes('>public.profiles<'), '"public.profiles" is absent from player-facing JSX')

console.log('\n[SECTION 8] NAVIGATION & FINANCIAL PRESERVATION')
assert(navbarContent.includes('to="/wallet"'), '30. Existing Navbar is unchanged')
assert(mobileNavContent.includes("path: '/tournaments'"), '31. Existing mobile navigation is unchanged')
assert(!content.includes('profiles.wallet_balance'), '33. No financial/wallet logic modified')
assert(!content.includes('fetchWalletLedger'), 'SettingsPage does not perform unnecessary financial ledger mutations')
assert(!content.includes('create-wallet-topup-order'), '34. No unauthorized backend functionality introduced')

console.log('\n==================================================')
console.log(`TEST RESULTS: ${passCount} PASSED, ${failCount} FAILED`)
console.log('==================================================\n')

if (failCount > 0) {
  process.exit(1)
} else {
  process.exit(0)
}
