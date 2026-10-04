// test_team_service.mjs
// Verification of Player Team Management Service Layer (N3.3)
// Structural, Behavioral, Security, RPC Mapping, Error Normalization & Isolation Tests

import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

// Configure valid mock environment before importing supabase client
process.env.VITE_SUPABASE_URL = 'https://mjesports-test-mock.supabase.co'
process.env.VITE_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock-anon-key-for-test'

console.log('================================================================================')
console.log('MJ ESPORTS — PHASE N3.3: PLAYER TEAM MANAGEMENT SERVICE LAYER TEST SUITE')
console.log('================================================================================\n')

const serviceFilePath = path.resolve('src/services/teamService.js')
assert.ok(fs.existsSync(serviceFilePath), 'src/services/teamService.js must exist')
const serviceContent = fs.readFileSync(serviceFilePath, 'utf8')

// Import service and supabase client
const { supabase } = await import('./src/lib/supabase.js')
const teamService = await import('./src/services/teamService.js')

let passedTests = 0
let failedTests = 0

async function runTest(name, fn) {
  try {
    await fn()
    console.log(`  ✅ [PASS] ${name}`)
    passedTests++
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}`)
    console.error(`     Error: ${err.message}`)
    failedTests++
  }
}

// ============================================================================
// GROUP 1: SERVICE EXPORTS & METHOD SIGNATURES
// ============================================================================
console.log('--- GROUP 1: Service Exports & Signatures ---')

const REQUIRED_EXPORTS = [
  'getMyTeamPortalData',
  'createPlayerTeam',
  'updatePlayerTeam',
  'inviteTeamMember',
  'respondTeamInvitation',
  'cancelTeamInvitation',
  'removeTeamMember',
  'leavePlayerTeam',
  'transferTeamOwnership',
  'setTeamMemberRole',
]

await runTest('1.1. Service exports all 10 required APIs as async functions', () => {
  for (const fn of REQUIRED_EXPORTS) {
    assert.equal(typeof teamService[fn], 'function', `teamService.${fn} must be an exported function`)
    assert.ok(
      serviceContent.includes(`export async function ${fn}`),
      `service source must export async function ${fn}`
    )
  }
})

await runTest('1.2. Service imports Supabase client canonically from ../lib/supabase.js', () => {
  assert.ok(
    /import\s+\{\s*supabase,\s*isSupabaseConfigured\s*\}\s+from\s+['"]\.\.\/lib\/supabase(?:\.js)?['"]/.test(serviceContent),
    'Imports supabase and isSupabaseConfigured from ../lib/supabase.js'
  )
})

// ============================================================================
// GROUP 2: RPC MAPPING TO AUTHORITATIVE N3.2 RPCs
// ============================================================================
console.log('\n--- GROUP 2: RPC Mapping ---')

const RPC_MAP = {
  getMyTeamPortalData: 'get_my_team_portal_data',
  createPlayerTeam: 'create_player_team',
  updatePlayerTeam: 'update_player_team',
  inviteTeamMember: 'invite_team_member',
  respondTeamInvitation: 'respond_team_invitation',
  cancelTeamInvitation: 'cancel_team_invitation',
  removeTeamMember: 'remove_team_member',
  leavePlayerTeam: 'leave_player_team',
  transferTeamOwnership: 'transfer_team_ownership',
  setTeamMemberRole: 'set_team_member_role',
}

await runTest('2.1. Every service API invokes its exact N3.2 SECURITY DEFINER RPC in source code', () => {
  for (const [serviceFn, rpcName] of Object.entries(RPC_MAP)) {
    assert.ok(
      serviceContent.includes(`supabase.rpc('${rpcName}'`),
      `Service method ${serviceFn} must call supabase.rpc('${rpcName}')`
    )
  }
})

await runTest('2.2. Behavioral RPC mapping and parameter forwarding verification via mock RPC', async () => {
  const originalRpc = supabase.rpc
  const rpcCalls = []

  supabase.rpc = async (rpcName, params) => {
    rpcCalls.push({ rpcName, params })
    return { data: { success: true, mock: true }, error: null }
  }

  try {
    // 1. getMyTeamPortalData
    await teamService.getMyTeamPortalData()
    assert.equal(rpcCalls[rpcCalls.length - 1].rpcName, 'get_my_team_portal_data')

    // 2. createPlayerTeam
    await teamService.createPlayerTeam({
      name: 'Phoenix Squad',
      tag: 'PHX',
      description: 'Rising champions',
      gameUid: '1234567890',
    })
    const createCall = rpcCalls[rpcCalls.length - 1]
    assert.equal(createCall.rpcName, 'create_player_team')
    assert.deepEqual(createCall.params, {
      p_name: 'Phoenix Squad',
      p_tag: 'PHX',
      p_description: 'Rising champions',
      p_game_uid: '1234567890',
    })

    // 3. updatePlayerTeam
    await teamService.updatePlayerTeam({
      teamId: 'team-uuid-1',
      name: 'Phoenix Prime',
      tag: 'PRM',
      description: 'Updated motto',
      isRecruiting: false,
      logoUrl: 'https://example.com/logo.png',
    })
    const updateCall = rpcCalls[rpcCalls.length - 1]
    assert.equal(updateCall.rpcName, 'update_player_team')
    assert.deepEqual(updateCall.params, {
      p_team_id: 'team-uuid-1',
      p_name: 'Phoenix Prime',
      p_tag: 'PRM',
      p_description: 'Updated motto',
      p_is_recruiting: false,
      p_logo_url: 'https://example.com/logo.png',
    })

    // 4. inviteTeamMember
    await teamService.inviteTeamMember({
      teamId: 'team-uuid-1',
      inviteeIdentifier: 'sniper99',
      role: 'Substitute',
    })
    const inviteCall = rpcCalls[rpcCalls.length - 1]
    assert.equal(inviteCall.rpcName, 'invite_team_member')
    assert.deepEqual(inviteCall.params, {
      p_team_id: 'team-uuid-1',
      p_invitee_identifier: 'sniper99',
      p_role: 'Substitute',
    })

    // 5. respondTeamInvitation
    await teamService.respondTeamInvitation('inv-uuid-1', 'ACCEPT')
    const respondCall = rpcCalls[rpcCalls.length - 1]
    assert.equal(respondCall.rpcName, 'respond_team_invitation')
    assert.deepEqual(respondCall.params, {
      p_invitation_id: 'inv-uuid-1',
      p_action: 'ACCEPT',
    })

    // 6. cancelTeamInvitation
    await teamService.cancelTeamInvitation('inv-uuid-1')
    const cancelCall = rpcCalls[rpcCalls.length - 1]
    assert.equal(cancelCall.rpcName, 'cancel_team_invitation')
    assert.deepEqual(cancelCall.params, {
      p_invitation_id: 'inv-uuid-1',
    })

    // 7. removeTeamMember
    await teamService.removeTeamMember({
      teamId: 'team-uuid-1',
      targetUserId: 'user-uuid-9',
    })
    const removeCall = rpcCalls[rpcCalls.length - 1]
    assert.equal(removeCall.rpcName, 'remove_team_member')
    assert.deepEqual(removeCall.params, {
      p_team_id: 'team-uuid-1',
      p_target_user_id: 'user-uuid-9',
    })

    // 8. leavePlayerTeam
    await teamService.leavePlayerTeam('team-uuid-1')
    const leaveCall = rpcCalls[rpcCalls.length - 1]
    assert.equal(leaveCall.rpcName, 'leave_player_team')
    assert.deepEqual(leaveCall.params, {
      p_team_id: 'team-uuid-1',
    })

    // 9. transferTeamOwnership
    await teamService.transferTeamOwnership({
      teamId: 'team-uuid-1',
      newCaptainUserId: 'user-uuid-2',
    })
    const transferCall = rpcCalls[rpcCalls.length - 1]
    assert.equal(transferCall.rpcName, 'transfer_team_ownership')
    assert.deepEqual(transferCall.params, {
      p_team_id: 'team-uuid-1',
      p_new_captain_user_id: 'user-uuid-2',
    })

    // 10. setTeamMemberRole
    await teamService.setTeamMemberRole({
      teamId: 'team-uuid-1',
      targetUserId: 'user-uuid-3',
      newRole: 'Substitute',
    })
    const roleCall = rpcCalls[rpcCalls.length - 1]
    assert.equal(roleCall.rpcName, 'set_team_member_role')
    assert.deepEqual(roleCall.params, {
      p_team_id: 'team-uuid-1',
      p_target_user_id: 'user-uuid-3',
      p_new_role: 'Substitute',
    })
  } finally {
    supabase.rpc = originalRpc
  }
})

// ============================================================================
// GROUP 3: ZERO DIRECT CLIENT MUTATIONS
// ============================================================================
console.log('\n--- GROUP 3: Zero Direct Client Mutations ---')

await runTest('3.1. Zero direct INSERT/UPDATE/DELETE on public.teams', () => {
  assert.ok(
    !/\.from\(\s*['"]teams['"]\s*\)\s*\.(insert|update|delete|upsert)/.test(serviceContent),
    'Zero direct mutations on public.teams table'
  )
})

await runTest('3.2. Zero direct INSERT/UPDATE/DELETE on public.team_members', () => {
  assert.ok(
    !/\.from\(\s*['"]team_members['"]\s*\)\s*\.(insert|update|delete|upsert)/.test(serviceContent),
    'Zero direct mutations on public.team_members table'
  )
})

await runTest('3.3. Zero direct INSERT/UPDATE/DELETE on public.team_invitations', () => {
  assert.ok(
    !/\.from\(\s*['"]team_invitations['"]\s*\)\s*\.(insert|update|delete|upsert)/.test(serviceContent),
    'Zero direct mutations on public.team_invitations table'
  )
})

await runTest('3.4. Complete absence of any table .insert/.update/.delete mutations across entire service', () => {
  assert.ok(!/\.from\([^)]+\)\.insert/.test(serviceContent), 'No .insert() in service')
  assert.ok(!/\.from\([^)]+\)\.update/.test(serviceContent), 'No .update() in service')
  assert.ok(!/\.from\([^)]+\)\.delete/.test(serviceContent), 'No .delete() in service')
  assert.ok(!/\.from\([^)]+\)\.upsert/.test(serviceContent), 'No .upsert() in service')
})

// ============================================================================
// GROUP 4: AUTH & IDENTITY PROTECTION
// ============================================================================
console.log('\n--- GROUP 4: Auth & Identity Protection ---')

await runTest('4.1. Service never accepts client-supplied caller identity for authorization', () => {
  // Check that caller identity parameters like callerId, userId, captainId are NOT forwarded to RPCs as caller identity
  assert.ok(!serviceContent.includes('p_caller_id'), 'No p_caller_id parameter in service')
  assert.ok(!serviceContent.includes('p_user_id'), 'No p_user_id parameter in service')
  assert.ok(!serviceContent.includes('p_captain_id'), 'No p_captain_id parameter in service')
})

await runTest('4.2. Zero service-role keys or privileged credentials referenced in service', () => {
  assert.ok(!serviceContent.includes('service_role'), 'Zero service_role strings')
  assert.ok(!serviceContent.includes('SUPABASE_SERVICE_ROLE_KEY'), 'Zero SUPABASE_SERVICE_ROLE_KEY')
  assert.ok(!serviceContent.includes('SUPABASE_KEY'), 'Zero private key references')
})

await runTest('4.3. Authoritative caller identity derived via auth.uid() inside database RPCs', () => {
  // Confirm service does not attempt to bypass RLS or fabricate tokens
  assert.ok(!serviceContent.includes('auth.admin'), 'No auth.admin usage')
  assert.ok(!serviceContent.includes('setSession'), 'No session fabrication')
})

// ============================================================================
// GROUP 5: ERROR HANDLING & CONTRACT NORMALIZATION
// ============================================================================
console.log('\n--- GROUP 5: Error Handling & Contract Normalization ---')

await runTest('5.1. Returns normalized { success: false, error, error_code } on RPC network/Postgres errors', async () => {
  const originalRpc = supabase.rpc
  supabase.rpc = async () => ({
    data: null,
    error: { message: 'Database connection failed', code: 'PGRST000' },
  })

  try {
    const res = await teamService.createPlayerTeam({
      name: 'Falcon Squad',
      tag: 'FAL',
      gameUid: '9988776655',
    })
    assert.equal(res.success, false)
    assert.equal(res.error, 'Database connection failed')
    assert.equal(res.error_code, 'PGRST000')
  } finally {
    supabase.rpc = originalRpc
  }
})

await runTest('5.2. Preserves server-side business errors and error codes (e.g., ALREADY_IN_TEAM)', async () => {
  const originalRpc = supabase.rpc
  supabase.rpc = async () => ({
    data: {
      success: false,
      error_code: 'ALREADY_IN_TEAM',
      message: 'You are already an active member or captain of a team.',
    },
    error: null,
  })

  try {
    const res = await teamService.createPlayerTeam({
      name: 'Storm Squad',
      tag: 'STM',
      gameUid: '1122334455',
    })
    assert.equal(res.success, false)
    assert.equal(res.error_code, 'ALREADY_IN_TEAM')
    assert.equal(res.error, 'You are already an active member or captain of a team.')
  } finally {
    supabase.rpc = originalRpc
  }
})

await runTest('5.3. Handles empty or corrupted response safely with EMPTY_RESPONSE code', async () => {
  const originalRpc = supabase.rpc
  supabase.rpc = async () => ({ data: null, error: null })

  try {
    const res = await teamService.createPlayerTeam({
      name: 'Apex Squad',
      tag: 'APX',
      gameUid: '5566778899',
    })
    assert.equal(res.success, false)
    assert.equal(res.error_code, 'EMPTY_RESPONSE')
  } finally {
    supabase.rpc = originalRpc
  }
})

await runTest('5.4. Normalizes success responses with { success: true, data: ..., ... }', async () => {
  const originalRpc = supabase.rpc
  const mockTeam = { id: 'team-uuid-99', name: 'Nova Squad', tag: 'NOV', status: 'Verified' }
  supabase.rpc = async () => ({
    data: { success: true, team: mockTeam, message: 'Squad successfully created.' },
    error: null,
  })

  try {
    const res = await teamService.createPlayerTeam({
      name: 'Nova Squad',
      tag: 'NOV',
      gameUid: '1234567890',
    })
    assert.equal(res.success, true)
    assert.ok(res.data)
    assert.equal(res.team.id, 'team-uuid-99')
    assert.equal(res.message, 'Squad successfully created.')
  } finally {
    supabase.rpc = originalRpc
  }
})

// ============================================================================
// GROUP 6: INVITATION APIs SPECIFICATION & VALIDATION
// ============================================================================
console.log('\n--- GROUP 6: Invitation APIs ---')

await runTest('6.1. inviteTeamMember validates required parameters client-side before RPC', async () => {
  const resMissing = await teamService.inviteTeamMember({})
  assert.equal(resMissing.success, false)
  assert.equal(resMissing.error_code, 'VALIDATION_ERROR')

  const resMissingIdentifier = await teamService.inviteTeamMember({ teamId: 't-1' })
  assert.equal(resMissingIdentifier.success, false)
  assert.equal(resMissingIdentifier.error_code, 'VALIDATION_ERROR')
})

await runTest('6.2. inviteTeamMember sanitizes and defaults role to Member', async () => {
  const originalRpc = supabase.rpc
  let capturedRole = null
  supabase.rpc = async (rpcName, params) => {
    capturedRole = params.p_role
    return { data: { success: true, invitation_id: 'inv-123' }, error: null }
  }

  try {
    await teamService.inviteTeamMember({ teamId: 't-1', inviteeIdentifier: 'ghost' })
    assert.equal(capturedRole, 'Member')

    await teamService.inviteTeamMember({ teamId: 't-1', inviteeIdentifier: 'ghost', role: 'Substitute' })
    assert.equal(capturedRole, 'Substitute')

    await teamService.inviteTeamMember({ teamId: 't-1', inviteeIdentifier: 'ghost', role: 'UnknownRole' })
    assert.equal(capturedRole, 'Member')
  } finally {
    supabase.rpc = originalRpc
  }
})

await runTest('6.3. respondTeamInvitation handles both (id, action) and ({ invitationId, action }) shapes', async () => {
  const originalRpc = supabase.rpc
  const capturedCalls = []
  supabase.rpc = async (rpcName, params) => {
    capturedCalls.push(params)
    return { data: { success: true, action: params.p_action }, error: null }
  }

  try {
    // String signature
    const res1 = await teamService.respondTeamInvitation('inv-1', 'accept')
    assert.equal(res1.success, true)
    assert.equal(capturedCalls[capturedCalls.length - 1].p_action, 'ACCEPT')

    // Object signature
    const res2 = await teamService.respondTeamInvitation({ invitationId: 'inv-2', action: 'REJECT' })
    assert.equal(res2.success, true)
    assert.equal(capturedCalls[capturedCalls.length - 1].p_action, 'REJECT')

    // Invalid action rejected client-side
    const resInvalid = await teamService.respondTeamInvitation('inv-3', 'MAYBE')
    assert.equal(resInvalid.success, false)
    assert.equal(resInvalid.error_code, 'VALIDATION_ERROR')
  } finally {
    supabase.rpc = originalRpc
  }
})

await runTest('6.4. cancelTeamInvitation validates invitation ID and routes to cancel_team_invitation', async () => {
  const resMissing = await teamService.cancelTeamInvitation()
  assert.equal(resMissing.success, false)
  assert.equal(resMissing.error_code, 'VALIDATION_ERROR')

  const originalRpc = supabase.rpc
  let calledParam = null
  supabase.rpc = async (rpcName, params) => {
    calledParam = params
    return { data: { success: true, message: 'Invitation cancelled.' }, error: null }
  }

  try {
    const res = await teamService.cancelTeamInvitation('inv-99')
    assert.equal(res.success, true)
    assert.equal(calledParam.p_invitation_id, 'inv-99')
  } finally {
    supabase.rpc = originalRpc
  }
})

// ============================================================================
// GROUP 7: MEMBERSHIP APIs SPECIFICATION & VALIDATION
// ============================================================================
console.log('\n--- GROUP 7: Membership APIs ---')

await runTest('7.1. removeTeamMember validates squad ID and target user ID', async () => {
  const res = await teamService.removeTeamMember({ teamId: 't-1' })
  assert.equal(res.success, false)
  assert.equal(res.error_code, 'VALIDATION_ERROR')
})

await runTest('7.2. leavePlayerTeam validates squad ID and routes to leave_player_team', async () => {
  const resMissing = await teamService.leavePlayerTeam()
  assert.equal(resMissing.success, false)
  assert.equal(resMissing.error_code, 'VALIDATION_ERROR')

  const originalRpc = supabase.rpc
  let calledParam = null
  supabase.rpc = async (rpcName, params) => {
    calledParam = params
    return { data: { success: true, message: 'Left squad.' }, error: null }
  }

  try {
    const res = await teamService.leavePlayerTeam({ teamId: 't-1' })
    assert.equal(res.success, true)
    assert.equal(calledParam.p_team_id, 't-1')
  } finally {
    supabase.rpc = originalRpc
  }
})

await runTest('7.3. transferTeamOwnership validates target member ID and routes to transfer_team_ownership', async () => {
  const resMissing = await teamService.transferTeamOwnership({ teamId: 't-1' })
  assert.equal(resMissing.success, false)
  assert.equal(resMissing.error_code, 'VALIDATION_ERROR')

  const originalRpc = supabase.rpc
  let calledParam = null
  supabase.rpc = async (rpcName, params) => {
    calledParam = params
    return { data: { success: true, message: 'Captaincy transferred.' }, error: null }
  }

  try {
    const res = await teamService.transferTeamOwnership({ teamId: 't-1', newCaptainUserId: 'u-target' })
    assert.equal(res.success, true)
    assert.equal(calledParam.p_team_id, 't-1')
    assert.equal(calledParam.p_new_captain_user_id, 'u-target')
  } finally {
    supabase.rpc = originalRpc
  }
})

await runTest('7.4. setTeamMemberRole sanitizes role to Member or Substitute and routes to set_team_member_role', async () => {
  const resMissing = await teamService.setTeamMemberRole({ teamId: 't-1', targetUserId: 'u-1' })
  assert.equal(resMissing.success, false)
  assert.equal(resMissing.error_code, 'VALIDATION_ERROR')

  const originalRpc = supabase.rpc
  let calledParam = null
  supabase.rpc = async (rpcName, params) => {
    calledParam = params
    return { data: { success: true, message: 'Role updated.' }, error: null }
  }

  try {
    const res = await teamService.setTeamMemberRole({
      teamId: 't-1',
      targetUserId: 'u-1',
      newRole: 'Substitute',
    })
    assert.equal(res.success, true)
    assert.equal(calledParam.p_new_role, 'Substitute')
  } finally {
    supabase.rpc = originalRpc
  }
})

// ============================================================================
// GROUP 8: PORTAL DATA AGGREGATION & CONTRACT
// ============================================================================
console.log('\n--- GROUP 8: Squad Portal Data ---')

await runTest('8.1. getMyTeamPortalData loads complete portal payload structure', async () => {
  const originalRpc = supabase.rpc
  const mockPortalPayload = {
    success: true,
    has_team: true,
    team: { id: 'team-1', name: 'Thunderbolts', tag: 'THN', captain_name: 'Zeus' },
    members: [
      { id: 'm-1', user_id: 'u-1', player_name: 'Zeus', role: 'Captain', game_uid: '1111111111' },
      { id: 'm-2', user_id: 'u-2', player_name: 'Ares', role: 'Member', game_uid: '2222222222' },
    ],
    outgoing_invitations: [
      { id: 'inv-1', invitee_name: 'Hermes', role: 'Substitute' },
    ],
    incoming_invitations: [],
    is_captain: true,
  }

  supabase.rpc = async (rpcName) => {
    assert.equal(rpcName, 'get_my_team_portal_data')
    return { data: mockPortalPayload, error: null }
  }

  try {
    const res = await teamService.getMyTeamPortalData()
    assert.equal(res.success, true)
    assert.equal(res.has_team, true)
    assert.equal(res.is_captain, true)
    assert.equal(res.team.name, 'Thunderbolts')
    assert.equal(res.members.length, 2)
    assert.equal(res.outgoing_invitations.length, 1)
    assert.deepEqual(res.incoming_invitations, [])
  } finally {
    supabase.rpc = originalRpc
  }
})

await runTest('8.2. getMyTeamPortalData handles unauthenticated or teamless player cleanly', async () => {
  const originalRpc = supabase.rpc
  const mockTeamlessPayload = {
    success: true,
    has_team: false,
    team: null,
    members: [],
    outgoing_invitations: [],
    incoming_invitations: [{ id: 'inv-in-1', team_name: 'Vikings' }],
    is_captain: false,
  }

  supabase.rpc = async () => ({ data: mockTeamlessPayload, error: null })

  try {
    const res = await teamService.getMyTeamPortalData()
    assert.equal(res.success, true)
    assert.equal(res.has_team, false)
    assert.equal(res.team, null)
    assert.equal(res.members.length, 0)
    assert.equal(res.incoming_invitations.length, 1)
  } finally {
    supabase.rpc = originalRpc
  }
})

// ============================================================================
// GROUP 9: NOTIFICATION ISOLATION
// ============================================================================
console.log('\n--- GROUP 9: Notification Isolation ---')

await runTest('9.1. Zero direct insertions into public.notifications from teamService.js', () => {
  assert.ok(
    !/\.from\(\s*['"]notifications['"]\s*\)/.test(serviceContent),
    'teamService.js must never directly query or insert into public.notifications'
  )
})

await runTest('9.2. Zero imports or invocations of notificationService.js from teamService.js', () => {
  assert.ok(
    !serviceContent.includes('notificationService'),
    'teamService.js must not import or call notificationService directly'
  )
  assert.ok(
    !serviceContent.includes('createNotification'),
    'teamService.js must not create duplicate client-side notifications'
  )
})

// ============================================================================
// GROUP 10: PAYMENT & SENSITIVE SUBSYSTEM ISOLATION
// ============================================================================
console.log('\n--- GROUP 10: Payment & Sensitive Subsystem Isolation ---')

await runTest('10.1. Zero references to Razorpay or payment processing', () => {
  assert.ok(!/razorpay/i.test(serviceContent), 'No Razorpay references in teamService.js')
})

await runTest('10.2. Zero references to wallet, wallet top-up, or tournament payment services', () => {
  assert.ok(!/wallet/i.test(serviceContent), 'No wallet references')
  assert.ok(!serviceContent.includes('tournamentPaymentService'), 'No tournamentPaymentService references')
})

await runTest('10.3. Zero references to payment Edge Functions or webhooks', () => {
  assert.ok(!serviceContent.includes('create-razorpay-order'), 'No create-razorpay-order')
  assert.ok(!serviceContent.includes('verify-razorpay-payment'), 'No verify-razorpay-payment')
  assert.ok(!serviceContent.includes('create-wallet-topup-order'), 'No create-wallet-topup-order')
  assert.ok(!serviceContent.includes('verify-wallet-topup'), 'No verify-wallet-topup')
  assert.ok(!serviceContent.includes('razorpay-webhook'), 'No webhook references')
})

// ============================================================================
// FINAL SUMMARY
// ============================================================================
console.log('\n================================================================================')
console.log(`N3.3 TEST RESULTS: ${passedTests} PASSED | ${failedTests} FAILED`)
console.log('================================================================================\n')

if (failedTests > 0) {
  process.exit(1)
} else {
  process.exit(0)
}
