// test_player_team_portal.mjs
// Verification of Player Team Management Portal (N3.4)
// Structure, Service Integration, Zero Direct Mutations, Security, Responsive, Error & Payment Isolation

import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

console.log('================================================================================')
console.log('MJ ESPORTS — PHASE N3.4: PLAYER TEAM PORTAL TEST SUITE')
console.log('================================================================================\n')

const pageFilePath = path.resolve('src/pages/PlayerTeamPortalPage.jsx')
assert.ok(fs.existsSync(pageFilePath), 'PlayerTeamPortalPage.jsx must exist')
const pageContent = fs.readFileSync(pageFilePath, 'utf8')

const overviewCardPath = path.resolve('src/components/team/TeamOverviewCard.jsx')
assert.ok(fs.existsSync(overviewCardPath), 'TeamOverviewCard.jsx must exist')
const overviewContent = fs.readFileSync(overviewCardPath, 'utf8')

const rosterListPath = path.resolve('src/components/team/TeamRosterList.jsx')
assert.ok(fs.existsSync(rosterListPath), 'TeamRosterList.jsx must exist')
const rosterContent = fs.readFileSync(rosterListPath, 'utf8')

const invitationsTrayPath = path.resolve('src/components/team/TeamInvitationsTray.jsx')
assert.ok(fs.existsSync(invitationsTrayPath), 'TeamInvitationsTray.jsx must exist')
const trayContent = fs.readFileSync(invitationsTrayPath, 'utf8')

const createModalPath = path.resolve('src/components/team/CreateTeamModal.jsx')
assert.ok(fs.existsSync(createModalPath), 'CreateTeamModal.jsx must exist')
const createModalContent = fs.readFileSync(createModalPath, 'utf8')

const settingsModalPath = path.resolve('src/components/team/TeamSettingsModal.jsx')
assert.ok(fs.existsSync(settingsModalPath), 'TeamSettingsModal.jsx must exist')
const settingsModalContent = fs.readFileSync(settingsModalPath, 'utf8')

const inviteModalPath = path.resolve('src/components/team/TeamInviteModal.jsx')
assert.ok(fs.existsSync(inviteModalPath), 'TeamInviteModal.jsx must exist')
const inviteModalContent = fs.readFileSync(inviteModalPath, 'utf8')

// Combine all N3.4 UI code for holistic security & mutation scans
const allPortalUIContent = [
  pageContent,
  overviewContent,
  rosterContent,
  trayContent,
  createModalContent,
  settingsModalContent,
  inviteModalContent,
].join('\n')

let passedTests = 0
let failedTests = 0

function runTest(name, fn) {
  try {
    fn()
    console.log(`  ✅ [PASS] ${name}`)
    passedTests++
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}`)
    console.error(`     Error: ${err.message}`)
    failedTests++
  }
}

// ============================================================================
// GROUP 1: PAGE STRUCTURE & CORE COMPONENTS
// ============================================================================
console.log('--- GROUP 1: Page Structure & Subcomponents ---')

runTest('1.1. PlayerTeamPortalPage default export exists', () => {
  assert.ok(
    /export\s+default\s+function\s+PlayerTeamPortalPage/.test(pageContent),
    'PlayerTeamPortalPage is default export'
  )
})

runTest('1.2. Page integrates TeamOverviewCard, TeamRosterList, TeamInvitationsTray', () => {
  assert.ok(pageContent.includes('<TeamOverviewCard'), 'Renders TeamOverviewCard')
  assert.ok(pageContent.includes('<TeamRosterList'), 'Renders TeamRosterList')
  assert.ok(pageContent.includes('<TeamInvitationsTray'), 'Renders TeamInvitationsTray')
})

runTest('1.3. Page integrates CreateTeamModal, TeamSettingsModal, and TeamInviteModal', () => {
  assert.ok(pageContent.includes('<CreateTeamModal'), 'Integrates CreateTeamModal')
  assert.ok(pageContent.includes('<TeamSettingsModal'), 'Integrates TeamSettingsModal')
  assert.ok(pageContent.includes('<TeamInviteModal'), 'Integrates TeamInviteModal')
})

runTest('1.4. Page renders breadcrumb with profile return link and refresh button', () => {
  assert.ok(pageContent.includes('to="/profile"'), 'Links back to /profile')
  assert.ok(pageContent.includes('loadPortalData'), 'Refresh trigger exists')
})

// ============================================================================
// GROUP 2: SERVICE LAYER INTEGRATION
// ============================================================================
console.log('\n--- GROUP 2: teamService.js Integration ---')

runTest('2.1. Page imports required APIs exclusively from teamService.js', () => {
  assert.ok(
    /from\s+['"]\.\.\/services\/teamService['"]/.test(pageContent),
    'Imports from ../services/teamService'
  )
  assert.ok(pageContent.includes('getMyTeamPortalData'), 'Imports getMyTeamPortalData')
  assert.ok(pageContent.includes('respondTeamInvitation'), 'Imports respondTeamInvitation')
  assert.ok(pageContent.includes('cancelTeamInvitation'), 'Imports cancelTeamInvitation')
  assert.ok(pageContent.includes('removeTeamMember'), 'Imports removeTeamMember')
  assert.ok(pageContent.includes('leavePlayerTeam'), 'Imports leavePlayerTeam')
  assert.ok(pageContent.includes('transferTeamOwnership'), 'Imports transferTeamOwnership')
  assert.ok(pageContent.includes('setTeamMemberRole'), 'Imports setTeamMemberRole')
})

runTest('2.2. Modals import their mutation APIs from teamService.js', () => {
  assert.ok(
    /from\s+['"]\.\.\/\.\.\/services\/teamService['"]/.test(createModalContent),
    'CreateTeamModal imports from teamService'
  )
  assert.ok(createModalContent.includes('createPlayerTeam'), 'CreateTeamModal uses createPlayerTeam')

  assert.ok(
    /from\s+['"]\.\.\/\.\.\/services\/teamService['"]/.test(settingsModalContent),
    'TeamSettingsModal imports from teamService'
  )
  assert.ok(settingsModalContent.includes('updatePlayerTeam'), 'TeamSettingsModal uses updatePlayerTeam')

  assert.ok(
    /from\s+['"]\.\.\/\.\.\/services\/teamService['"]/.test(inviteModalContent),
    'TeamInviteModal imports from teamService'
  )
  assert.ok(inviteModalContent.includes('inviteTeamMember'), 'TeamInviteModal uses inviteTeamMember')
})

// ============================================================================
// GROUP 3: ZERO DIRECT CLIENT TABLE MUTATIONS
// ============================================================================
console.log('\n--- GROUP 3: Zero Direct Client Mutations ---')

runTest('3.1. Zero direct mutations on public.teams in portal components', () => {
  assert.ok(
    !/\.from\(\s*['"]teams['"]\s*\)\s*\.(insert|update|delete|upsert)/.test(allPortalUIContent),
    'Zero direct mutations on public.teams'
  )
})

runTest('3.2. Zero direct mutations on public.team_members in portal components', () => {
  assert.ok(
    !/\.from\(\s*['"]team_members['"]\s*\)\s*\.(insert|update|delete|upsert)/.test(allPortalUIContent),
    'Zero direct mutations on public.team_members'
  )
})

runTest('3.3. Zero direct mutations on public.team_invitations in portal components', () => {
  assert.ok(
    !/\.from\(\s*['"]team_invitations['"]\s*\)\s*\.(insert|update|delete|upsert)/.test(allPortalUIContent),
    'Zero direct mutations on public.team_invitations'
  )
})

runTest('3.4. Complete absence of any table .insert/.update/.delete in portal UI', () => {
  assert.ok(!/\.from\([^)]+\)\.insert/.test(allPortalUIContent), 'No .insert() in portal UI')
  assert.ok(!/\.from\([^)]+\)\.update/.test(allPortalUIContent), 'No .update() in portal UI')
  assert.ok(!/\.from\([^)]+\)\.delete/.test(allPortalUIContent), 'No .delete() in portal UI')
  assert.ok(!/\.from\([^)]+\)\.upsert/.test(allPortalUIContent), 'No .upsert() in portal UI')
})

// ============================================================================
// GROUP 4: SQUAD CREATION (CreateTeamModal)
// ============================================================================
console.log('\n--- GROUP 4: CreateTeamModal Specification & Validation ---')

runTest('4.1. CreateTeamModal validates team name length (3-30 chars)', () => {
  assert.ok(createModalContent.includes('maxLength={30}'), 'Enforces max 30 length')
  assert.ok(createModalContent.includes('cleanName.length < 3'), 'Enforces min 3 length')
})

runTest('4.2. CreateTeamModal validates tag format (2-5 alphanumeric) and UID (10 digits)', () => {
  assert.ok(createModalContent.includes('^[A-Za-z0-9]{2,5}$'), 'Validates 2-5 tag regex')
  assert.ok(createModalContent.includes('^[0-9]{10}$'), 'Validates 10-digit Free Fire UID')
})

runTest('4.3. CreateTeamModal does NOT send client identity, captain_id, or status', () => {
  assert.ok(!createModalContent.includes('captain_id:'), 'Never sends captain_id')
  assert.ok(!createModalContent.includes('user_id:'), 'Never sends user_id')
  assert.ok(!createModalContent.includes('status:'), 'Never sends status')
  assert.ok(!createModalContent.includes('max_members:'), 'Never sends max_members')
})

runTest('4.4. CreateTeamModal closes and invokes onSuccess upon creation', () => {
  assert.ok(createModalContent.includes('onSuccess(res)'), 'Calls onSuccess')
  assert.ok(createModalContent.includes('onClose()'), 'Closes modal on success')
})

// ============================================================================
// GROUP 5: INVITATIONS TRAY & ACTIONS
// ============================================================================
console.log('\n--- GROUP 5: Invitations Tray & Handling ---')

runTest('5.1. TeamInvitationsTray supports ACCEPT and REJECT for incoming invites', () => {
  assert.ok(trayContent.includes("onRespond(invite.id, 'ACCEPT')"), 'Accepts invite')
  assert.ok(trayContent.includes("onRespond(invite.id, 'REJECT')"), 'Rejects invite')
})

runTest('5.2. TeamInvitationsTray supports CANCEL for outgoing invites by captain', () => {
  assert.ok(trayContent.includes('onCancel(invite.id)'), 'Cancels outgoing invite')
})

runTest('5.3. TeamInvitationsTray displays expiration countdown and role badge', () => {
  assert.ok(trayContent.includes('formatExpires'), 'Calculates expiration')
  assert.ok(trayContent.includes('invite.role'), 'Displays role')
})

runTest('5.4. TeamInvitationsTray provides individual loading states during actions', () => {
  assert.ok(trayContent.includes('actionLoadingId === invite.id'), 'Tracks active loading invite')
  assert.ok(trayContent.includes('Loader2'), 'Renders spinner')
})

// ============================================================================
// GROUP 6: MEMBERSHIP ACTIONS & DESTRUCTIVE CONFIRMATIONS
// ============================================================================
console.log('\n--- GROUP 6: Membership Actions & Confirmation Guards ---')

runTest('6.1. TeamRosterList groups members into Captain, Members, and Substitutes', () => {
  assert.ok(rosterContent.includes("m.role === 'Captain'"), 'Finds captain')
  assert.ok(rosterContent.includes("m.role === 'Member'"), 'Finds regular members')
  assert.ok(rosterContent.includes("m.role === 'Substitute'"), 'Finds substitutes')
})

runTest('6.2. TeamRosterList exposes role change, transfer captaincy, and remove member', () => {
  assert.ok(rosterContent.includes('onRoleChange(member.user_id'), 'Triggers role change')
  assert.ok(rosterContent.includes('onRequestTransfer(member)'), 'Triggers transfer request')
  assert.ok(rosterContent.includes('onRequestRemove(member)'), 'Triggers remove request')
})

runTest('6.3. Page requires explicit confirmation dialog before executing destructive actions', () => {
  assert.ok(pageContent.includes('confirmModal'), 'Defines confirmModal state')
  assert.ok(pageContent.includes('Remove Squad Member'), 'Requires confirm for remove')
  assert.ok(pageContent.includes('Leave Squad'), 'Requires confirm for leave')
  assert.ok(pageContent.includes('Transfer Squad Captaincy'), 'Requires confirm for transfer')
  assert.ok(pageContent.includes('confirmModal.onConfirm'), 'Executes only upon explicit confirm')
})

runTest('6.4. Captain cannot be removed through remove member UI', () => {
  // Captain card in roster does not render remove button
  const captainSectionStart = rosterContent.indexOf('{/* 1. CAPTAIN */}')
  const captainSectionEnd = rosterContent.indexOf('{/* 2. REGULAR MEMBERS')
  const captainSnippet = rosterContent.slice(captainSectionStart, captainSectionEnd)
  assert.ok(!captainSnippet.includes('onRequestRemove'), 'Captain has no remove button')
})

// ============================================================================
// GROUP 7: SECURITY SCAN & SENSITIVE ATTRIBUTES
// ============================================================================
console.log('\n--- GROUP 7: Security Scan & Invariants ---')

runTest('7.1. Zero service_role strings in portal code', () => {
  assert.ok(!allPortalUIContent.includes('service_role'), 'Zero service_role')
  assert.ok(!allPortalUIContent.includes('SUPABASE_SERVICE_ROLE_KEY'), 'Zero service role key')
})

runTest('7.2. Zero dangerouslySetInnerHTML in portal code', () => {
  assert.ok(!allPortalUIContent.includes('dangerouslySetInnerHTML'), 'Zero dangerouslySetInnerHTML')
})

runTest('7.3. Zero hardcoded secrets or API tokens', () => {
  assert.ok(!allPortalUIContent.includes('sk_live'), 'No secret keys')
  assert.ok(!allPortalUIContent.includes('rzp_live'), 'No live payment tokens')
})

runTest('7.4. Zero client-side notification creations from portal UI', () => {
  assert.ok(!allPortalUIContent.includes('createNotification'), 'Zero duplicate client notifications')
  assert.ok(!allPortalUIContent.includes(".from('notifications')"), 'Zero direct notification insertions')
})

// ============================================================================
// GROUP 8: RESPONSIVE ARCHITECTURE & ACCESSIBILITY
// ============================================================================
console.log('\n--- GROUP 8: Responsive Architecture & Accessibility ---')

runTest('8.1. Dialogs implement role="dialog" and aria-modal="true"', () => {
  assert.ok(createModalContent.includes('role="dialog"'), 'CreateTeamModal has role="dialog"')
  assert.ok(createModalContent.includes('aria-modal="true"'), 'CreateTeamModal has aria-modal')
  assert.ok(settingsModalContent.includes('role="dialog"'), 'TeamSettingsModal has role="dialog"')
  assert.ok(settingsModalContent.includes('aria-modal="true"'), 'TeamSettingsModal has aria-modal')
  assert.ok(inviteModalContent.includes('role="dialog"'), 'TeamInviteModal has role="dialog"')
  assert.ok(inviteModalContent.includes('aria-modal="true"'), 'TeamInviteModal has aria-modal')
})

runTest('8.2. Modals listen to Escape key for accessible dismissal', () => {
  assert.ok(createModalContent.includes("e.key === 'Escape'"), 'CreateTeamModal listens for Escape')
  assert.ok(settingsModalContent.includes("e.key === 'Escape'"), 'TeamSettingsModal listens for Escape')
  assert.ok(inviteModalContent.includes("e.key === 'Escape'"), 'TeamInviteModal listens for Escape')
})

runTest('8.3. Buttons enforce min-h-[44px] touch target standards for mobile usability', () => {
  assert.ok(pageContent.includes('min-h-[44px]'), 'Page buttons conform to min-h-[44px]')
  assert.ok(createModalContent.includes('min-h-[44px]'), 'Create modal conforms to min-h-[44px]')
  assert.ok(settingsModalContent.includes('min-h-[44px]'), 'Settings modal conforms to min-h-[44px]')
  assert.ok(inviteModalContent.includes('min-h-[44px]'), 'Invite modal conforms to min-h-[44px]')
})

runTest('8.4. Responsive grid classes exist for multi-breakpoint adaptation', () => {
  assert.ok(pageContent.includes('sm:'), 'Includes sm: breakpoint')
  assert.ok(pageContent.includes('md:'), 'Includes md: breakpoint')
  assert.ok(overviewContent.includes('md:flex-row'), 'Overview adapts to desktop flex-row')
})

// ============================================================================
// GROUP 9: STATE HANDLING, EMPTY STATES & REFRESH
// ============================================================================
console.log('\n--- GROUP 9: State Handling & Data Lifecycle ---')

runTest('9.1. Loading skeleton displayed initially to avoid premature no-team flash', () => {
  assert.ok(pageContent.includes('if (isLoading)'), 'Guards on isLoading')
  assert.ok(pageContent.includes('animate-pulse'), 'Renders skeleton animation')
})

runTest('9.2. Clear empty state rendered when has_team is false', () => {
  assert.ok(pageContent.includes('!portalData.has_team'), 'Checks !has_team')
  assert.ok(pageContent.includes('You Are Not Part of a Squad Yet'), 'Empathetic empty state title')
  assert.ok(pageContent.includes('Create Free Fire Squad'), 'Create squad CTA button')
})

runTest('9.3. Incoming invitations rendered even when player has no active squad', () => {
  const emptySection = pageContent.slice(
    pageContent.indexOf('!portalData.has_team'),
    pageContent.indexOf('3B. ACTIVE SQUAD PORTAL DASHBOARD')
  )
  assert.ok(emptySection.includes('<TeamInvitationsTray'), 'Incoming invitations rendered in empty state')
})

runTest('9.4. Canonical server state refreshed after every successful mutation', () => {
  assert.ok(pageContent.includes('handleTeamCreated = (res) => {'), 'Handler exists')
  assert.ok(pageContent.includes('handleTeamUpdated = (res) => {'), 'Handler exists')
  assert.ok(pageContent.includes('handleInviteDispatched = (res) => {'), 'Handler exists')
  assert.ok(pageContent.includes('await loadPortalData()'), 'Refetches server state on mutation')
})

runTest('9.5. Resilient error state with Retry capability on initial data-load failure', () => {
  assert.ok(pageContent.includes('loadError &&'), 'Displays load error banner')
  assert.ok(pageContent.includes('Retry'), 'Provides retry button')
})

// ============================================================================
// GROUP 10: PAYMENT ISOLATION
// ============================================================================
console.log('\n--- GROUP 10: Payment Isolation ---')

runTest('10.1. Zero references to Razorpay across all portal files', () => {
  assert.ok(!/razorpay/i.test(allPortalUIContent), 'No Razorpay references')
})

runTest('10.2. Zero references to wallet or payment processing services', () => {
  assert.ok(!/wallet/i.test(allPortalUIContent), 'No wallet references')
  assert.ok(!allPortalUIContent.includes('tournamentPaymentService'), 'No tournamentPaymentService')
})

runTest('10.3. Zero touch or references to SlotBookingModal in portal files', () => {
  assert.ok(!allPortalUIContent.includes('SlotBookingModal'), 'Zero SlotBookingModal references')
})

// ============================================================================
// FINAL SUMMARY
// ============================================================================
console.log('\n================================================================================')
console.log(`N3.4 TEST RESULTS: ${passedTests} PASSED | ${failedTests} FAILED`)
console.log('================================================================================\n')

if (failedTests > 0) {
  process.exit(1)
} else {
  process.exit(0)
}
