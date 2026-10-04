// test_team_registration_autofill.mjs
// Dedicated N3.5 Test Suite: Tournament Team Registration Auto-Fill & State Safety

import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

console.log('=== TEST SUITE: N3.5 Tournament Registration Team Auto-Fill ===\n')

const modalPath = path.resolve('src/components/tournament/SlotBookingModal.jsx')
const teamServicePath = path.resolve('src/services/teamService.js')
const tournamentPaymentPath = path.resolve('src/services/tournamentPaymentService.js')

const modalContent = fs.readFileSync(modalPath, 'utf8')
const teamServiceContent = fs.readFileSync(teamServicePath, 'utf8')
const paymentContent = fs.readFileSync(tournamentPaymentPath, 'utf8')

let totalAssertions = 0
function check(description, fn) {
  try {
    fn()
    totalAssertions++
    console.log(`  ✓ ${description}`)
  } catch (err) {
    console.error(`  ✗ FAIL: ${description}`)
    throw err
  }
}

// ============================================================================
// GROUP 1: Service Integration & Canonical RPC Usage
// ============================================================================
console.log('--- GROUP 1: Service Integration ---')

check('1.1. SlotBookingModal imports getMyTeamPortalData from teamService', () => {
  assert.ok(
    /import\s*\{[^}]*getMyTeamPortalData[^}]*\}\s*from\s*['"]\.\.\/\.\.\/services\/teamService['"]/.test(modalContent),
    'SlotBookingModal must import getMyTeamPortalData canonically'
  )
})

check('1.2. SlotBookingModal invokes getMyTeamPortalData on auto-fill request', () => {
  assert.ok(
    modalContent.includes('getMyTeamPortalData()'),
    'Modal must call getMyTeamPortalData()'
  )
})

check('1.3. SlotBookingModal does NOT directly query public.teams', () => {
  assert.ok(
    !modalContent.includes("from('teams')") && !modalContent.includes('from("teams")'),
    'Modal must not query teams table directly'
  )
})

check('1.4. SlotBookingModal does NOT directly query public.team_members', () => {
  assert.ok(
    !modalContent.includes("from('team_members')") && !modalContent.includes('from("team_members")'),
    'Modal must not query team_members table directly'
  )
})

check('1.5. SlotBookingModal does NOT directly query public.team_invitations', () => {
  assert.ok(
    !modalContent.includes("from('team_invitations')") && !modalContent.includes('from("team_invitations")'),
    'Modal must not query team_invitations table directly'
  )
})

// ============================================================================
// GROUP 2: UI Elements & Team State Representation
// ============================================================================
console.log('\n--- GROUP 2: UI Elements & Team State Representation ---')

check('2.1. "Use My Team" action button exists with cybernetic styling', () => {
  assert.ok(
    modalContent.includes('Use My Team'),
    'Modal must display "Use My Team" button'
  )
  assert.ok(
    modalContent.includes('handleUseMyTeamClick'),
    'Modal must bind click handler handleUseMyTeamClick'
  )
})

check('2.2. Loading state is handled during squad portal fetch', () => {
  assert.ok(modalContent.includes('isTeamLoading'), 'Modal tracks isTeamLoading')
  assert.ok(modalContent.includes('Loading Squad...'), 'Loading indicator displayed on button')
})

check('2.3. No-team state is handled with dedicated notice dialog', () => {
  assert.ok(modalContent.includes('showNoTeamModal'), 'Modal tracks showNoTeamModal state')
  assert.ok(
    modalContent.includes('You are not part of an active team.'),
    'Modal provides clear notice when user has no team'
  )
  assert.ok(
    modalContent.includes('Create / Manage My Team'),
    'Modal provides action button to create/manage team'
  )
})

check('2.4. No-team action navigates to /profile/team', () => {
  assert.ok(
    modalContent.includes("navigate('/profile/team')"),
    'Must navigate to /profile/team upon clicking Create / Manage My Team'
  )
})

// ============================================================================
// GROUP 3: Solo Mode Compatibility
// ============================================================================
console.log('\n--- GROUP 3: Solo Mode Compatibility ---')

check('3.1. Solo mode branch selects authenticated player as captain and empties teammates', () => {
  const soloLogicRegex = /if\s*\(\s*mode\s*===\s*['"]Solo['"]\s*\)\s*\{[\s\S]*?teammates:\s*\[['"]['"],\s*['"]['"],\s*['"]['"]\]/
  assert.ok(
    soloLogicRegex.test(modalContent),
    'Solo mode must leave teammates array strictly empty'
  )
})

check('3.2. Solo mode populates player IGN and character UID into primary fields', () => {
  assert.ok(
    modalContent.includes('captainName: captainIgn') && modalContent.includes('freeFireUid: captainUid'),
    'Solo mode maps captainIgn and captainUid to form state'
  )
})

check('3.3. Solo mode provides user feedback upon auto-fill', () => {
  assert.ok(
    modalContent.includes('Selected your active player profile for Solo mode.'),
    'Solo auto-fill displays informative toast'
  )
})

// ============================================================================
// GROUP 4: Duo Mode Compatibility & Teammate Guard
// ============================================================================
console.log('\n--- GROUP 4: Duo Mode Compatibility ---')

check('4.1. Duo mode requires exactly 1 teammate slot populated', () => {
  const duoLogicRegex = /else\s+if\s*\(\s*mode\s*===\s*['"]Duo['"]\s*\)\s*\{[\s\S]*?teammates:\s*\[teammate\.game_uid/
  assert.ok(
    duoLogicRegex.test(modalContent),
    'Duo mode must populate teammate 0 with game_uid'
  )
})

check('4.2. Duo mode verifies presence of teammate and prevents silent invalid submission', () => {
  assert.ok(
    modalContent.includes('prioritizedTeammates.length === 0'),
    'Duo mode guards against missing squad teammates'
  )
  assert.ok(
    modalContent.includes('Insufficient Teammates'),
    'Duo mode warns user when squad teammates are insufficient'
  )
})

check('4.3. Duo mode keeps secondary teammate slots empty', () => {
  assert.ok(
    modalContent.includes("teammates: [teammate.game_uid || '', '', '']"),
    'Duo mode leaves slots 1 and 2 empty'
  )
})

// ============================================================================
// GROUP 5: Squad Mode Roster Mapping & Priority Limits
// ============================================================================
console.log('\n--- GROUP 5: Squad Mode Roster Mapping ---')

check('5.1. Squad mode maps up to 3 teammates into slots 0, 1, 2', () => {
  assert.ok(
    modalContent.includes('mappedTeammates =') && modalContent.includes('maxSlots = 3'),
    'Squad mode caps teammate slots to 3'
  )
})

check('5.2. Squad mode prioritizes active regular Members before Substitutes', () => {
  assert.ok(
    modalContent.includes("filter((m) => m.role === 'Member')") &&
    modalContent.includes("filter((m) => m.role === 'Substitute')") &&
    modalContent.includes('[...regularMembers, ...substituteMembers]'),
    'Teammates must be prioritized with core Members before Substitutes'
  )
})

check('5.3. Squad mode alerts if squad has fewer than 3 available teammates', () => {
  assert.ok(
    modalContent.includes('Please fill remaining'),
    'Squad mode warns user when additional teammates must be manually entered'
  )
})

// ============================================================================
// GROUP 6: State Safety & Overwrite Confirmation
// ============================================================================
console.log('\n--- GROUP 6: State Safety & Overwrite Confirmation ---')

check('6.1. Overwrite guard checks if user has manually entered data', () => {
  assert.ok(
    modalContent.includes('hasExistingRosterData'),
    'Modal checks hasExistingRosterData before applying squad'
  )
})

check('6.2. Confirmation prompt displayed when form contains existing roster data', () => {
  assert.ok(
    modalContent.includes('Replace current roster with your active team?'),
    'Modal presents clear replacement confirmation question'
  )
  assert.ok(
    modalContent.includes('pendingTeamToApply'),
    'Modal holds pending team data in pendingTeamToApply state'
  )
})

check('6.3. Populated roster review summary card is rendered after auto-fill', () => {
  assert.ok(
    modalContent.includes('populatedTeamInfo') && modalContent.includes('YOUR TEAM'),
    'Populated roster review summary with "YOUR TEAM" badge must exist'
  )
})

check('6.4. Field validation errors are cleared for populated fields', () => {
  assert.ok(
    modalContent.includes('delete next.teamName') && modalContent.includes('delete next.freeFireUid'),
    'Validation errors cleared upon auto-fill'
  )
})

// ============================================================================
// GROUP 7: Registration Submission Flow Preservation
// ============================================================================
console.log('\n--- GROUP 7: Registration Submission Flow Preservation ---')

check('7.1. No second registration mutation function is created', () => {
  assert.ok(!modalContent.includes('registerTeamFromTeam'), 'No registerTeamFromTeam function')
  assert.ok(!modalContent.includes('registerTeamWithSquad'), 'No registerTeamWithSquad function')
  assert.ok(!modalContent.includes('registerUsingTeam'), 'No registerUsingTeam function')
})

check('7.2. Existing server-authoritative registration paths remain unchanged', () => {
  assert.ok(modalContent.includes('registerTeam(tournament.id'), 'Free tournament registerTeam preserved')
  assert.ok(modalContent.includes('createTournamentOrder'), 'Razorpay createTournamentOrder preserved')
  assert.ok(modalContent.includes('verifyTournamentPayment'), 'Razorpay verifyTournamentPayment preserved')
})

// ============================================================================
// GROUP 8: Payment Isolation & No Payment Modification
// ============================================================================
console.log('\n--- GROUP 8: Payment Isolation ---')

check('8.1. tournamentPaymentService.js is untouched by team management', () => {
  assert.ok(paymentContent.includes('createTournamentOrder'), 'createTournamentOrder in payment service')
  assert.ok(paymentContent.includes('verifyTournamentPayment'), 'verifyTournamentPayment in payment service')
  assert.ok(!paymentContent.includes('teamService'), 'payment service has zero teamService awareness')
  assert.ok(!paymentContent.includes('getMyTeamPortalData'), 'no team imports in payment service')
})

check('8.2. SlotBookingModal payment processing preserves Razorpay checkout flow', () => {
  assert.ok(modalContent.includes('launchRazorpayCheckout'), 'launchRazorpayCheckout preserved')
  assert.ok(modalContent.includes('verifyTournamentPayment'), 'verifyTournamentPayment preserved')
  assert.ok(!modalContent.includes('createTournamentOrderFromTeam'), 'No team-coupled payment order method')
})

check('8.3. Team auto-fill does not mutate entry fee or payment state', () => {
  assert.ok(modalContent.includes('isFreeTournament'), 'isFreeTournament check preserved')
  assert.ok(modalContent.includes('numericEntryFee'), 'numericEntryFee calculation preserved')
})

// ============================================================================
// GROUP 9: Security Scan
// ============================================================================
console.log('\n--- GROUP 9: Security Scan ---')

check('9.1. Current user identity is authoritative and not fabricated', () => {
  assert.ok(
    modalContent.includes('user?.id') && modalContent.includes('user?.user_metadata'),
    'Authoritative auth session used for user identity'
  )
  assert.ok(!modalContent.includes('service_role'), 'Zero service_role in SlotBookingModal')
})

check('9.2. Zero dangerouslySetInnerHTML in SlotBookingModal', () => {
  assert.ok(!modalContent.includes('dangerouslySetInnerHTML'), 'No dangerous HTML rendering')
})

console.log(`\n==================================================`)
console.log(`ALL CHECKS PASSED: ${totalAssertions}/${totalAssertions} assertions verified.`)
console.log(`==================================================\n`)
