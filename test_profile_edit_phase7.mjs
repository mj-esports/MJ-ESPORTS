/**
 * test_profile_edit_phase7.mjs
 * 
 * Comprehensive Automated Verification Suite for Phase 7:
 * Edit Profile Implementation (/profile/edit)
 * Real-Capability Audit + Approved UI + Free Fire MAX Only
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const editProfilePagePath = path.join(__dirname, 'src', 'pages', 'EditProfilePage.jsx')
const appRoutesPath = path.join(__dirname, 'src', 'routes', 'AppRoutes.jsx')
const navbarPath = path.join(__dirname, 'src', 'components', 'common', 'Navbar.jsx')
const bottomNavPath = path.join(__dirname, 'src', 'components', 'common', 'BottomNavigation.jsx')
const avatarServicePath = path.join(__dirname, 'src', 'services', 'avatarService.js')
const evidenceServicePath = path.join(__dirname, 'src', 'services', 'playerEvidenceService.js')

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
console.log('PHASE 7: EDIT PROFILE AUTOMATED TESTS')
console.log('==================================================\n')

// 1. Page and routes check
assert(fs.existsSync(editProfilePagePath), '2. Edit Profile page exists at src/pages/EditProfilePage.jsx')

const content = fs.readFileSync(editProfilePagePath, 'utf8')
const routesContent = fs.readFileSync(appRoutesPath, 'utf8')
const navbarContent = fs.readFileSync(navbarPath, 'utf8')
const bottomNavContent = fs.readFileSync(bottomNavPath, 'utf8')
const avatarServiceContent = fs.readFileSync(avatarServicePath, 'utf8')
const evidenceServiceContent = fs.readFileSync(evidenceServicePath, 'utf8')

console.log('\n[SECTION 1] ROUTING & BRANDING INTEGRITY')
assert(routesContent.includes('path="profile/edit"'), '1. Route "profile/edit" registered in AppRoutes.jsx')
assert(routesContent.includes('element={<EditProfilePage />}'), '2. Route links directly to EditProfilePage')
assert(content.includes('to="/profile"'), 'Provides Return to Profile navigation')
assert(content.includes('FREE FIRE MAX ONLY'), 'Contains "FREE FIRE MAX ONLY" branding')

console.log('\n[SECTION 2] FREE FIRE MAX ONLY ENFORCEMENT')
assert(!content.includes('BGMI'), '19. Zero occurrences of "BGMI"')
assert(!content.includes('Battlegrounds Mobile India'), 'Zero occurrences of "Battlegrounds Mobile India"')
assert(!content.includes('PUBG'), '20. Zero occurrences of "PUBG"')
assert(!content.includes('bgmiUid'), 'Zero occurrences of "bgmiUid"')
assert(!content.includes('pubgUid'), 'Zero occurrences of "pubgUid"')
assert(!content.includes('<select') || !content.includes('gameSelector'), '21. No multi-game selector dropdown')

console.log('\n[SECTION 3] IDENTITY PREVIEW & DATA BINDINGS')
assert(content.includes('meta.username') || content.includes('profile?.username'), '3. Display name uses real profile/auth data')
assert(content.includes('maxLength={50}'), '4. Display name enforces maximum length validation (50 chars)')
assert(content.includes('user?.email'), '5. Email uses authenticated user data')
assert(content.includes('readOnly') && content.includes('READ ONLY'), '6. Email is strictly read-only')
assert(content.includes('phone') && (content.includes('meta.phone') || content.includes('profile?.phone')), '7. Phone uses existing data')
assert(content.includes('Does not confer') || content.includes('does not confer'), '8. Phone is not falsely marked verified')
assert(content.includes('freeFireUid'), '9. Free Fire MAX UID is present')
assert(content.includes('isValidGameUid'), '10. UID uses existing game UID validation')
assert(content.includes('invalidatePlayerVerification'), '11. Modifying UID on verified account triggers verification reset')

console.log('\n[SECTION 4] AVATAR ARCHITECTURE & STATES')
assert(content.includes('uploadAvatarFile'), '12. Avatar uses existing uploadAvatarFile service')
assert(!content.includes('createBucket'), '13. No new storage bucket created')
assert(content.includes('isAvatarUploading') || content.includes('setIsAvatarUploading'), '14. Avatar upload loading state exists')
assert(content.includes('AvatarUploadModal'), 'Avatar utilizes existing AvatarUploadModal')
assert(!content.includes('handleDeleteAvatar') && !content.includes('REMOVE AVATAR'), '15. Avatar removal is not falsely advertised')

console.log('\n[SECTION 5] VERIFICATION & PRO STATUS')
assert(content.includes('verificationStatus'), '16. Verification status computed and displayed')
assert(!content.includes('setVerificationStatus') && !content.includes('toggleVerification'), 'Verification status has no client toggle/mutator')
assert(content.includes('isPro'), '17. PRO status computed from authoritative tier')
assert(!/\bsetIsPro\b/.test(content) && !content.includes('togglePro'), 'PRO status has no client toggle/mutator')

console.log('\n[SECTION 6] FORM ACTIONS & UNSAVED CHANGES')
assert(content.includes('SAVE CHANGES'), '23. Save Changes action exists')
assert(content.includes('CANCEL') && content.includes('to="/profile"'), '24. Cancel action exists and navigates to /profile')
assert(content.includes('isDirty') && content.includes('UNSAVED CHANGES'), '25. Unsaved state detected and displayed')
assert(content.includes('isSaving'), '26. Saving state handled via LoadingButton')
assert(content.includes('Profile updated successfully'), '27. Success notification state exists')
assert(content.includes('setErrors'), '28. Validation failure state exists')
assert(content.includes('COULD NOT SAVE CHANGES'), '29. Server failure handling exists with friendly message')
assert(content.includes('DISCARD'), 'Discard unsaved modifications button exists')

console.log('\n[SECTION 7] TERMINOLOGY & PRIVACY INTEGRITY')
assert(!content.includes('CONFIG // REV 4.2'), 'No fake revision labels ("CONFIG // REV 4.2" absent)')
assert(!content.includes('LIVE RADAR PREVIEW'), 'No fake "LIVE RADAR PREVIEW" label')
assert(!content.includes('PROTOCOL FF-'), 'No fake "PROTOCOL FF-" label')
assert(!content.includes('ARBITER ROSTER CREDENTIALS'), 'No fake "ARBITER ROSTER CREDENTIALS" label')
assert(!content.includes('256-BIT'), '32. "256-BIT" is absent')
assert(!content.includes('TAMPER-PROOF'), '"TAMPER-PROOF" is absent')
assert(!content.includes('MJ ESCROW'), '"MJ ESCROW" is absent')
assert(!content.includes('>public.wallets<'), '30. "public.wallets" is absent from player-facing JSX')
assert(!content.includes('>public.profiles<'), '"public.profiles" is absent from player-facing JSX')
assert(!content.includes('>Supabase<') && !content.includes('Supabase Storage Bucket'), '31. Supabase internal terminology absent from UI')

console.log('\n[SECTION 8] FINANCIAL SEPARATION & PRESERVATION')
assert(!content.includes('wallet_balance'), '18. Zero references to wallet_balance')
assert(!content.includes('wallet_ledger'), 'Zero references to wallet_ledger')
assert(!content.includes('payout_queue'), 'Zero references to payout_queue')
assert(!content.includes('deposit'), 'Zero references to deposit')
assert(!content.includes('withdrawal'), 'Zero references to withdrawal')

console.log('\n[SECTION 9] ARCHITECTURE & NAVIGATION PRESERVATION')
assert(navbarContent.includes('to="/wallet"'), '33. Existing Navbar is unchanged')
assert(bottomNavContent.includes("path: '/tournaments'"), '34. Existing mobile navigation is unchanged')
assert(evidenceServiceContent.includes('uploadProfileProof'), '35. Existing verification logic is unchanged')
assert(avatarServiceContent.includes('uploadAvatarFile'), '36. Existing avatar storage architecture is unchanged')
assert(!content.includes('rpc(') || content.includes('invalidatePlayerVerification'), '37. No unauthorized RPC calls')
assert(!content.includes('SECURITY DEFINER'), '38. No new SECURITY DEFINER RPC')
assert(!content.includes('updateUserRole') && !content.includes('role:'), '39. No client-side privilege escalation')
assert(!content.includes('fetchWalletLedger'), '40. No wallet logic modification')

console.log('\n==================================================')
console.log(`TEST RESULTS: ${passCount} PASSED, ${failCount} FAILED`)
console.log('==================================================\n')

if (failCount > 0) {
  process.exit(1)
} else {
  process.exit(0)
}
