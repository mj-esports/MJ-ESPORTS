// test_phase16_production_operations.mjs
// MJ ESPORTS — Phase 16: Production Launch & Operations Hardening Test Suite
// Validates duplicate-submission guards, logging cleanliness, failure handling, auth resilience, and realtime lifecycle.

import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

console.log('================================================================================')
console.log('MJ ESPORTS — PHASE 16: PRODUCTION LAUNCH & OPERATIONS HARDENING TEST SUITE')
console.log('================================================================================\n')

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

// -----------------------------------------------------------------------------
// 1. Admin Match Operations Duplicate-Submission Protection
// -----------------------------------------------------------------------------
console.log('--- GROUP 1: Match Control Duplicate-Submission & Lifecycle Guards ---')

const matchControlPath = path.resolve('src/components/admin/MatchControlView.jsx')
assert.ok(fs.existsSync(matchControlPath), 'MatchControlView.jsx must exist')
const matchControlContent = fs.readFileSync(matchControlPath, 'utf8')

runTest('1.1. MatchControlView declares isStatusUpdating state', () => {
  assert.ok(
    matchControlContent.includes('const [isStatusUpdating, setIsStatusUpdating] = useState(false)'),
    'Must declare isStatusUpdating boolean state'
  )
})

runTest('1.2. handleOpenLobby guards against concurrent submissions and cleans up in finally', () => {
  assert.ok(
    matchControlContent.includes('if (!selectedTourney || isStatusUpdating) return'),
    'handleOpenLobby must guard against isStatusUpdating'
  )
  assert.ok(
    matchControlContent.includes('setIsStatusUpdating(true)'),
    'Must set isStatusUpdating to true'
  )
  assert.ok(
    matchControlContent.includes('setIsStatusUpdating(false)'),
    'Must reset isStatusUpdating to false in finally block'
  )
})

runTest('1.3. handleStartMatch guards against concurrent execution', () => {
  assert.ok(
    matchControlContent.includes('const handleStartMatch = async () => {\n    if (isStatusUpdating) return'),
    'handleStartMatch must check isStatusUpdating'
  )
})

runTest('1.4. handleResumeMatch guards against concurrent execution', () => {
  assert.ok(
    matchControlContent.includes('const handleResumeMatch = async () => {\n    if (isStatusUpdating) return'),
    'handleResumeMatch must check isStatusUpdating'
  )
})

runTest('1.5. handleConfirmEndMatch guards against concurrent execution', () => {
  assert.ok(
    matchControlContent.includes('const handleConfirmEndMatch = async () => {\n    if (isStatusUpdating) return'),
    'handleConfirmEndMatch must check isStatusUpdating'
  )
})

runTest('1.6. Match lifecycle action buttons bind disabled={isStatusUpdating}', () => {
  assert.ok(
    matchControlContent.includes('onClick={handleStartMatch}\n                  disabled={isStatusUpdating}'),
    'Start Match button must be disabled when isStatusUpdating is true'
  )
  assert.ok(
    matchControlContent.includes('onClick={handleOpenLobby}\n                  disabled={isStatusUpdating}'),
    'Refresh Lobby button must be disabled when isStatusUpdating is true'
  )
  assert.ok(
    matchControlContent.includes('onClick={handlePauseMatch}\n                  disabled={isStatusUpdating}'),
    'Pause Match button must be disabled when isStatusUpdating is true'
  )
  assert.ok(
    matchControlContent.includes('onClick={handleResumeMatch}\n                  disabled={isStatusUpdating}'),
    'Resume Match button must be disabled when isStatusUpdating is true'
  )
  assert.ok(
    matchControlContent.includes('onClick={handleConfirmEndMatch}\n                disabled={isStatusUpdating}'),
    'Confirm End Match button must be disabled when isStatusUpdating is true'
  )
})

// -----------------------------------------------------------------------------
// 2. Production Observability & Logging Cleanliness
// -----------------------------------------------------------------------------
console.log('\n--- GROUP 2: Observability & Sensitive Log Sanitization ---')

const adminRoutePath = path.resolve('src/routes/AdminRoute.jsx')
const adminRouteContent = fs.readFileSync(adminRoutePath, 'utf8')

runTest('2.1. AdminRoute contains zero console.log and does NOT leak user email', () => {
  assert.ok(!adminRouteContent.includes('console.log'), 'AdminRoute must not contain console.log')
  assert.ok(!adminRouteContent.includes('[ADMIN ROUTE EVALUATION]'), 'Must not log admin evaluation')
  assert.ok(!adminRouteContent.includes('userEmail: user?.email'), 'Must not log user email to console')
})

const adminDashboardPath = path.resolve('src/pages/AdminDashboardPage.jsx')
const adminDashboardContent = fs.readFileSync(adminDashboardPath, 'utf8')

runTest('2.2. AdminDashboardPage contains zero mount debug logging', () => {
  assert.ok(!adminDashboardContent.includes('[ADMIN DASHBOARD MOUNTED]'), 'Must not log admin dashboard mounted')
})

const tournamentsPagePath = path.resolve('src/pages/TournamentsPage.jsx')
const tournamentsPageContent = fs.readFileSync(tournamentsPagePath, 'utf8')

runTest('2.3. TournamentsPage contains zero visibility audit dumps', () => {
  assert.ok(
    !tournamentsPageContent.includes('[Player Tournaments Page - Visibility Audit Log]'),
    'Must not dump tournaments array to console on every render/filter'
  )
})

const tournamentContextPath = path.resolve('src/contexts/TournamentContext.jsx')
const tournamentContextContent = fs.readFileSync(tournamentContextPath, 'utf8')

runTest('2.4. TournamentContext contains zero raw diagnostic payload logging', () => {
  assert.ok(!tournamentContextContent.includes('Complete tournament payload immediately before insert()'), 'Must not log insert payload')
  assert.ok(!tournamentContextContent.includes('Partial tournament payload immediately before update()'), 'Must not log update payload')
  assert.ok(!tournamentContextContent.includes('[RPC Diagnostic]'), 'Must not log [RPC Diagnostic] in production')
})

const supabaseClientPath = path.resolve('src/lib/supabase.js')
const supabaseClientContent = fs.readFileSync(supabaseClientPath, 'utf8')

runTest('2.5. supabase.js does not log connection credentials or key format in console', () => {
  assert.ok(!supabaseClientContent.includes('[Supabase Client Initialized]'), 'Must not log client initialization info')
  assert.ok(supabaseClientContent.includes('[Supabase Startup Configuration Error]'), 'Must retain startup configuration error')
})

// -----------------------------------------------------------------------------
// 3. Notification Realtime Lifecycle & Graceful Degradation
// -----------------------------------------------------------------------------
console.log('\n--- GROUP 3: Realtime Notification Resilience ---')

const notifServicePath = path.resolve('src/services/notificationService.js')
const notifServiceContent = fs.readFileSync(notifServicePath, 'utf8')

runTest('3.1. notificationService prevents duplicate channel subscriptions for the same user', () => {
  assert.ok(notifServiceContent.includes('activeNotificationChannels.has(channelKey)'), 'Must check active channels')
  assert.ok(notifServiceContent.includes('supabase.removeChannel(existing)'), 'Must remove duplicate channel if re-subscribing')
})

runTest('3.2. subscribeToUserNotifications returns a safe cleanup function', () => {
  assert.ok(notifServiceContent.includes('supabase.removeChannel(channel)'), 'Unsubscribe must remove channel from supabase client')
  assert.ok(notifServiceContent.includes('activeNotificationChannels.delete(channelKey)'), 'Unsubscribe must delete key from map')
})

// -----------------------------------------------------------------------------
// 4. Team Service Failure-Safety & Error Normalization
// -----------------------------------------------------------------------------
console.log('\n--- GROUP 4: Team Service RPC Failure Normalization ---')

const teamServicePath = path.resolve('src/services/teamService.js')
const teamServiceContent = fs.readFileSync(teamServicePath, 'utf8')

runTest('4.1. teamService normalizes Supabase error payloads fail-closed', () => {
  assert.ok(teamServiceContent.includes('function normalizeRpcResult(data, error, fallbackMsg'), 'Must have normalizeRpcResult')
  assert.ok(teamServiceContent.includes("error_code: error.code || 'RPC_ERROR'"), 'Must return error_code on RPC error')
  assert.ok(teamServiceContent.includes("error_code: 'EMPTY_RESPONSE'"), 'Must catch empty response')
})

runTest('4.2. All teamService mutations execute exclusively via RPC', () => {
  const rpcCalls = [
    'get_my_team_portal_data',
    'create_player_team',
    'update_player_team',
    'invite_team_member',
    'respond_team_invitation',
    'cancel_team_invitation',
    'remove_team_member',
    'leave_player_team',
    'transfer_team_ownership',
    'set_team_member_role',
  ]
  for (const rpcName of rpcCalls) {
    assert.ok(teamServiceContent.includes(rpcName), `teamService must call ${rpcName}`)
  }
})

// -----------------------------------------------------------------------------
// 5. Auth / Session Resilience
// -----------------------------------------------------------------------------
console.log('\n--- GROUP 5: Auth & Session Resilience ---')

const authContextPath = path.resolve('src/contexts/AuthContext.jsx')
const authContextContent = fs.readFileSync(authContextPath, 'utf8')

runTest('5.1. AuthContext purges user, role, and profile state on SIGNED_OUT', () => {
  assert.ok(authContextContent.includes("event === 'SIGNED_OUT'"), 'Must handle SIGNED_OUT event')
  assert.ok(authContextContent.includes('syncUserAndRole(null, null, { isExplicit: true })'), 'Must explicitly reset state on sign out')
})

runTest('5.2. AuthContext handles getSession error gracefully without infinite loading', () => {
  assert.ok(authContextContent.includes('.catch((err) => {'), 'Must catch getSession error')
  assert.ok(authContextContent.includes('setLoading(false)'), 'Must clear loading on auth error')
  assert.ok(authContextContent.includes('setRoleLoading(false)'), 'Must clear roleLoading on auth error')
})

// -----------------------------------------------------------------------------
// 6. Security Invariant Regression
// -----------------------------------------------------------------------------
console.log('\n--- GROUP 6: Security Invariant Regression ---')

runTest('6.1. Zero service_role keys in client source code', () => {
  const files = [
    matchControlContent,
    adminRouteContent,
    adminDashboardContent,
    tournamentsPageContent,
    tournamentContextContent,
    supabaseClientContent,
    notifServiceContent,
    teamServiceContent,
    authContextContent,
  ]
  for (const content of files) {
    assert.ok(!content.includes('service_role'), 'Client files must never contain service_role')
    assert.ok(!content.includes('SUPABASE_SERVICE_ROLE_KEY'), 'Client files must never contain SUPABASE_SERVICE_ROLE_KEY')
  }
})

runTest('6.2. Zero dangerouslySetInnerHTML in modified production files', () => {
  assert.ok(!matchControlContent.includes('dangerouslySetInnerHTML'), 'MatchControlView must not use dangerouslySetInnerHTML')
  assert.ok(!adminRouteContent.includes('dangerouslySetInnerHTML'), 'AdminRoute must not use dangerouslySetInnerHTML')
})

// -----------------------------------------------------------------------------
// Summary
// -----------------------------------------------------------------------------
console.log('\n================================================================================')
console.log(`PHASE 16 TEST RESULTS: ${passedTests} PASSED | ${failedTests} FAILED`)
console.log('================================================================================')

if (failedTests > 0) {
  process.exit(1)
} else {
  process.exit(0)
}
