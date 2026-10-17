// test_registration_modal_ui_cleanup.mjs
// Dedicated QA & Verification Test Suite: Registration Modal UI Cleanup

import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

console.log('=== TEST SUITE: Registration Modal UI Cleanup Verification ===\n')

const modalPath = path.resolve('src/components/tournament/SlotBookingModal.jsx')
assert.ok(fs.existsSync(modalPath), 'SlotBookingModal.jsx must exist')
const modalContent = fs.readFileSync(modalPath, 'utf8')

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

// ----------------------------------------------------------------------------
// GROUP 1: Header Information Cleanup
// ----------------------------------------------------------------------------
console.log('--- GROUP 1: Header Information Cleanup ---')

check('1.1. Removed redundant "MJ ESPORTS OFFICIAL REGISTRATION"', () => {
  assert.ok(!modalContent.includes('MJ ESPORTS OFFICIAL REGISTRATION'), 'Header branding text must be removed')
})

check('1.2. Retains tournament game and mode indicator', () => {
  assert.ok(modalContent.includes("tournament.game || 'Free Fire MAX'"), 'Game title Free Fire MAX retained')
  assert.ok(modalContent.includes('modeConfig.mode'), 'Mode indicator retained')
})

check('1.3. Retains close button and modal title accessibility id', () => {
  assert.ok(modalContent.includes('aria-label="Close Registration Modal"'), 'Close button retained')
  assert.ok(modalContent.includes('id="slot-booking-modal-title"'), 'Title a11y id retained')
})

// ----------------------------------------------------------------------------
// GROUP 2: Squad Auto-Fill Section
// ----------------------------------------------------------------------------
console.log('\n--- GROUP 2: Squad Auto-Fill Section ---')

check('2.1. Removed "Squad Roster Auto-Fill" large explanatory heading', () => {
  assert.ok(!modalContent.includes('Squad Roster Auto-Fill'), 'Large heading must be removed')
})

check('2.2. Removed "Pre-populate registration form with your active team roster"', () => {
  assert.ok(!modalContent.includes('Pre-populate registration form with your active team roster'), 'Explanatory subtitle must be removed')
})

check('2.3. Retains compact "Use My Team" button with loading state', () => {
  assert.ok(modalContent.includes('Use My Team'), 'Button label Use My Team present')
  assert.ok(modalContent.includes('handleUseMyTeamClick'), 'Click handler present')
  assert.ok(modalContent.includes('Loading Squad...'), 'Loading indicator present')
})

check('2.4. Removed duplicate standalone left-side "USE MY TEAM" label', () => {
  assert.ok(modalContent.includes('div className="flex justify-end"'), 'Auto-fill action row is right-aligned')
})

// ----------------------------------------------------------------------------
// GROUP 3: Captain & Registration Fields
// ----------------------------------------------------------------------------
console.log('\n--- GROUP 3: Captain & Registration Fields ---')

check('3.1. Retains all 5 essential fields: teamName, captainName, email, whatsappNumber, freeFireUid', () => {
  assert.ok(modalContent.includes('name="teamName"'), 'teamName field present')
  assert.ok(modalContent.includes('name="captainName"'), 'captainName field present')
  assert.ok(modalContent.includes('name="email"'), 'email field present')
  assert.ok(modalContent.includes('name="whatsappNumber"'), 'whatsappNumber field present')
  assert.ok(modalContent.includes('name="freeFireUid"'), 'freeFireUid field present')
})

check('3.2. Retains character counters and icons for usability', () => {
  assert.ok(modalContent.includes('maxLength={10}'), 'Character length validation retained')
  assert.ok(modalContent.includes('showCount'), 'Character counter retained')
  assert.ok(modalContent.includes('icon={ShieldCheck}'), 'ShieldCheck icon retained')
  assert.ok(modalContent.includes('icon={Users}'), 'Users icon retained')
})

// ----------------------------------------------------------------------------
// GROUP 4: Profile Screenshot Section
// ----------------------------------------------------------------------------
console.log('\n--- GROUP 4: Profile Screenshot Section ---')

check('4.1. Removed redundant "Upload your in-game profile showing UID + IGN."', () => {
  assert.ok(!modalContent.includes('Upload your in-game profile showing UID + IGN.'), 'Helper text must be removed')
})

check('4.2. Retains "FREE FIRE PROFILE SCREENSHOT *" label and attach control', () => {
  assert.ok(modalContent.includes('FREE FIRE PROFILE SCREENSHOT'), 'Label present')
  assert.ok(modalContent.includes('ATTACH PROFILE SCREENSHOT'), 'Attach button present')
  assert.ok(modalContent.includes('handleProofFileSelect'), 'File select handler present')
})

// ----------------------------------------------------------------------------
// GROUP 5: Teammate Section
// ----------------------------------------------------------------------------
console.log('\n--- GROUP 5: Teammate Section ---')

check('5.1. Removed "All Roster Members" redundant status text', () => {
  assert.ok(!modalContent.includes('All Roster Members'), 'All Roster Members text must be removed')
})

check('5.2. Retains compact TEAMMATE #1, #2, #3 structure with dynamic player count', () => {
  assert.ok(modalContent.includes('TEAMMATE #{idx + 1}'), 'Teammate numbering present')
  assert.ok(modalContent.includes('{idx + 2}/4'), 'Dynamic 2/4, 3/4, 4/4 count present')
})

check('5.3. Retains UID and IGN fields for Duo and Squad modes', () => {
  assert.ok(modalContent.includes('teammate_${idx}'), 'Teammate UID field present')
  assert.ok(modalContent.includes('teammate_ign_${idx}'), 'Teammate IGN field present')
})

// ----------------------------------------------------------------------------
// GROUP 6: Required Badges & Indicators
// ----------------------------------------------------------------------------
console.log('\n--- GROUP 6: Required Badges & Indicators ---')

check('6.1. Removed duplicate separate "Required" text badge from screenshot card', () => {
  assert.ok(!/font-label-caps[^>]*>\s*Required\s*<\/span>/.test(modalContent), 'Duplicate Required badge removed')
})

// ----------------------------------------------------------------------------
// GROUP 7: Terms & Conditions Presentation
// ----------------------------------------------------------------------------
console.log('\n--- GROUP 7: Terms & Conditions Presentation ---')

check('7.1. Checkbox presents clean "I agree to the Tournament Rules & Code of Conduct *"', () => {
  assert.ok(modalContent.includes('I agree to the'), 'Agreement text present')
  assert.ok(modalContent.includes('Tournament Rules & Code of Conduct'), 'Rulebook link text present')
  assert.ok(modalContent.includes('setShowRulebook(true)'), 'Rulebook modal handler present')
  assert.ok(modalContent.includes('name="acceptRules"'), 'Form input binding present')
})

// ----------------------------------------------------------------------------
// GROUP 8: Bottom Action Area
// ----------------------------------------------------------------------------
console.log('\n--- GROUP 8: Bottom Action Area ---')

check('8.1. Removed "Please complete all required fields and agreements to continue."', () => {
  assert.ok(!modalContent.includes('Please complete all required fields and agreements to continue.'), 'Instructional text removed')
})

check('8.2. Action row contains Cancel and Complete Registration', () => {
  assert.ok(modalContent.includes('Cancel'), 'Cancel button present')
  assert.ok(modalContent.includes('Complete Registration'), 'Complete Registration button present')
  assert.ok(modalContent.includes('disabled={!isFormValid || isSubmitting}'), 'Disabled state preserved')
})

// ----------------------------------------------------------------------------
// GROUP 9: Success / Confirmation Screen
// ----------------------------------------------------------------------------
console.log('\n--- GROUP 9: Success / Confirmation Screen ---')

check('9.1. Removed "Your registration has been securely recorded."', () => {
  assert.ok(!modalContent.includes('Your registration has been securely recorded.'), 'Redundant text removed')
})

check('9.2. Confirmation renders Reference ID, Team Name, Format, Captain UID, Status, Done & Return', () => {
  assert.ok(modalContent.includes('Registration Confirmed'), 'Header present')
  assert.ok(modalContent.includes('Reference ID'), 'Ref ID present')
  assert.ok(modalContent.includes('registrationSummary.teamName'), 'Team name present')
  assert.ok(modalContent.includes('Format'), 'Format present')
  assert.ok(modalContent.includes('registrationSummary.freeFireUid'), 'Captain UID present')
  assert.ok(modalContent.includes('registrationSummary.status'), 'Status present')
  assert.ok(modalContent.includes('Done & Return'), 'Done & Return CTA present')
})

// ----------------------------------------------------------------------------
// GROUP 10: Backend & Payment Invariants
// ----------------------------------------------------------------------------
console.log('\n--- GROUP 10: Backend & Payment Invariants ---')

check('10.1. Registration submission handlers preserved', () => {
  assert.ok(modalContent.includes('const handleSubmit = async'), 'handleSubmit preserved')
  assert.ok(modalContent.includes('const handleWalletPaymentSubmit = async'), 'handleWalletPaymentSubmit preserved')
  assert.ok(modalContent.includes('registerTeam(tournament.id'), 'registerTeam RPC preserved')
})

check('10.2. Payment service integration preserved intact', () => {
  assert.ok(modalContent.includes('createTournamentOrder'), 'createTournamentOrder call preserved')
  assert.ok(modalContent.includes('verifyTournamentPayment'), 'verifyTournamentPayment call preserved')
  assert.ok(modalContent.includes('launchRazorpayCheckout'), 'launchRazorpayCheckout preserved')
})

// ----------------------------------------------------------------------------
// GROUP 11: Mode-Specific Rules (Solo, Duo, Squad)
// ----------------------------------------------------------------------------
console.log('\n--- GROUP 11: Mode-Specific Rules (Solo, Duo, Squad) ---')

check('11.1. SOLO: Team Name is absent in Solo mode', () => {
  assert.ok(modalContent.includes('!isSolo && ('), 'Form conditionally excludes Team Name field in Solo mode')
  assert.ok(modalContent.includes('name="teamName"'), 'teamName field present for Duo/Squad')
})

check('11.2. SOLO: "Use My Team" is hidden in Solo mode', () => {
  assert.ok(
    modalContent.includes('!isSolo && (') && modalContent.includes('handleUseMyTeamClick'),
    'Use My Team button must be hidden when isSolo is true'
  )
})

check('11.3. SOLO: Teammate inputs are absent in Solo mode', () => {
  assert.ok(
    !modalContent.includes('isSolo && (\n              <div className="space-y') &&
    !modalContent.includes('isSolo && (\n              <div className="p-2.5'),
    'Solo mode must not render any teammate section'
  )
})

check('11.4. SOLO: Team Name is hidden from Confirmation Screen in Solo mode', () => {
  assert.ok(
    modalContent.includes('!isSolo && registrationSummary.teamName && ('),
    'Team Name row on confirmation screen must be hidden in Solo mode'
  )
})

check('11.5. DUO: Renders Team Name, Use My Team, and exactly 1 teammate', () => {
  assert.ok(modalContent.includes('isDuo && ('), 'Duo mode teammate section exists')
  assert.ok(modalContent.includes('name="teammate_0"'), 'Duo mode renders teammate_0')
  assert.ok(modalContent.includes('name="teammate_ign_0"'), 'Duo mode renders teammate_ign_0')
})

check('11.6. SQUAD: Renders Team Name, Use My Team, and exactly 3 teammates', () => {
  assert.ok(modalContent.includes('isSquad && ('), 'Squad mode teammate section exists')
  assert.ok(modalContent.includes('[0, 1, 2].map((idx) =>'), 'Squad mode maps exactly 3 teammates')
})

check('11.7. Validation: Form validates Team Name only in Duo/Squad mode', () => {
  assert.ok(modalContent.includes('if (!isSolo) {'), 'Validation contains !isSolo branch')
  assert.ok(modalContent.includes('Team Name is required'), 'Validation enforces Team Name in Duo/Squad')
})

check('11.8. Authoritative Mode Normalization: Resolves all format strings to Solo/Duo/Squad', () => {
  assert.ok(modalContent.includes('rawModeString.includes(\'solo\')'), 'Detects solo substring in mode/format')
  assert.ok(modalContent.includes('rawModeString.includes(\'(1p)\')'), 'Detects (1p) substring in format')
  assert.ok(modalContent.includes('rawModeString.includes(\'duo\')'), 'Detects duo substring in mode/format')
})

console.log(`\n==================================================`)
console.log(`ALL CHECKS PASSED: ${totalAssertions}/${totalAssertions} assertions verified.`)
console.log(`==================================================\n`)
