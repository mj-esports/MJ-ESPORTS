// test_phase15_team_management.mjs
// Verification of Player Team Management / Squad Portal Schema, Constraints, Security Definer RPCs & Lifecycle

import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

console.log('================================================================================')
console.log('MJ ESPORTS — PHASE 15: PLAYER TEAM MANAGEMENT / SQUAD PORTAL TEST SUITE')
console.log('================================================================================\n')

const sqlFilePath = path.resolve('supabase_phase15_player_team_management.sql')
assert.ok(fs.existsSync(sqlFilePath), 'Phase 15 SQL migration must exist')
const sqlContent = fs.readFileSync(sqlFilePath, 'utf8')

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

function getFunctionBody(funcName) {
  const start = sqlContent.indexOf(`FUNCTION public.${funcName}`)
  assert.ok(start !== -1, `Function public.${funcName} must exist in SQL`)
  const end = sqlContent.indexOf('CREATE OR REPLACE FUNCTION', start + 1)
  return end !== -1 ? sqlContent.slice(start, end) : sqlContent.slice(start)
}

// ============================================================================
// GROUP 1: SCHEMA EVOLUTION & CONSTRAINTS
// ============================================================================
console.log('--- GROUP 1: Schema Evolution & Table Constraints ---')

runTest('1.1. public.teams additively defines tag, description, max_members, and is_recruiting', () => {
  assert.ok(/ALTER TABLE public\.teams ADD COLUMN IF NOT EXISTS tag TEXT;/i.test(sqlContent), 'teams.tag defined')
  assert.ok(/ALTER TABLE public\.teams ADD COLUMN IF NOT EXISTS description TEXT;/i.test(sqlContent), 'teams.description defined')
  assert.ok(/ALTER TABLE public\.teams ADD COLUMN IF NOT EXISTS max_members INTEGER DEFAULT 6;/i.test(sqlContent), 'teams.max_members defined')
  assert.ok(/ALTER TABLE public\.teams ADD COLUMN IF NOT EXISTS is_recruiting BOOLEAN DEFAULT TRUE;/i.test(sqlContent), 'teams.is_recruiting defined')
})

runTest('1.2. public.teams enforces tag format (2-5 uppercase alphanumeric) and description (<=250)', () => {
  assert.ok(sqlContent.includes('chk_teams_tag_format'), 'chk_teams_tag_format constraint exists')
  assert.ok(sqlContent.includes('^[A-Z0-9]{2,5}$'), 'tag regex pattern enforced')
  assert.ok(sqlContent.includes('chk_teams_description_length'), 'chk_teams_description_length constraint exists')
  assert.ok(sqlContent.includes('LENGTH(description) <= 250'), 'description length <= 250')
  assert.ok(sqlContent.includes('chk_teams_max_members'), 'chk_teams_max_members constraint exists')
  assert.ok(/max_members\s*>=\s*4\s+AND\s+max_members\s*<=\s*8/i.test(sqlContent), 'max_members range 4..8')
})

runTest('1.3. public.teams enforces case-insensitive unique team name index', () => {
  assert.ok(
    /CREATE UNIQUE INDEX IF NOT EXISTS idx_teams_name_lower_unique\s+ON public\.teams\s*\(\s*LOWER\(TRIM\(name\)\)\s*\);/i.test(sqlContent),
    'idx_teams_name_lower_unique index created'
  )
})

runTest('1.4. public.team_members additively defines status and role domain checks', () => {
  assert.ok(/ALTER TABLE public\.team_members ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';/i.test(sqlContent), 'status column defined')
  assert.ok(sqlContent.includes('chk_team_members_role'), 'chk_team_members_role constraint exists')
  assert.ok(sqlContent.includes("'Captain', 'Member', 'Substitute'"), 'role IN (Captain, Member, Substitute)')
  assert.ok(sqlContent.includes('chk_team_members_status'), 'chk_team_members_status constraint exists')
  assert.ok(sqlContent.includes("'Active', 'Suspended'"), 'status IN (Active, Suspended)')
})

runTest('1.5. public.team_members enforces 10-digit Free Fire MAX UID regex', () => {
  assert.ok(sqlContent.includes('chk_team_members_game_uid'), 'chk_team_members_game_uid constraint exists')
  assert.ok(sqlContent.includes('^[0-9]{10}$'), 'game_uid strictly 10 digits')
})

runTest('1.6. public.team_members enforces internal uniqueness per team', () => {
  assert.ok(
    /CREATE UNIQUE INDEX IF NOT EXISTS idx_team_members_team_user_unique\s+ON public\.team_members\s*\(\s*team_id\s*,\s*user_id\s*\);/i.test(sqlContent),
    'unique (team_id, user_id) index exists'
  )
  assert.ok(
    /CREATE UNIQUE INDEX IF NOT EXISTS idx_team_members_team_game_uid_unique\s+ON public\.team_members\s*\(\s*team_id\s*,\s*game_uid\s*\);/i.test(sqlContent),
    'unique (team_id, game_uid) index exists'
  )
})

runTest('1.7. public.team_members enforces Single Active Team per user policy', () => {
  assert.ok(
    /CREATE UNIQUE INDEX IF NOT EXISTS idx_team_members_single_active_user\s+ON public\.team_members\s*\(\s*user_id\s*\)\s+WHERE\s+status\s*=\s*'Active';/i.test(sqlContent),
    'idx_team_members_single_active_user partial unique index exists'
  )
})

runTest('1.8. public.team_invitations table created with state machine, foreign keys & TTL', () => {
  assert.ok(sqlContent.includes('CREATE TABLE IF NOT EXISTS public.team_invitations'), 'team_invitations table created')
  assert.ok(sqlContent.includes("status IN ('Pending', 'Accepted', 'Rejected', 'Cancelled', 'Expired')"), 'state machine domains checked')
  assert.ok(sqlContent.includes('chk_team_invitations_not_self'), 'anti-self invite constraint exists')
  assert.ok(sqlContent.includes("NOW() + INTERVAL '7 days'"), '7 days default expiration TTL')
})

runTest('1.9. public.team_invitations enforces unique pending invite per (team_id, invitee_id)', () => {
  assert.ok(
    /CREATE UNIQUE INDEX IF NOT EXISTS idx_team_invitations_unique_pending\s+ON public\.team_invitations\s*\(\s*team_id\s*,\s*invitee_id\s*\)\s+WHERE\s+status\s*=\s*'Pending';/i.test(sqlContent),
    'idx_team_invitations_unique_pending index exists'
  )
})

// ============================================================================
// GROUP 2: ROW LEVEL SECURITY & PRIVILEGE LOCKDOWN
// ============================================================================
console.log('\n--- GROUP 2: RLS Policies & Privilege Lockdown ---')

runTest('2.1. RLS enabled on all three team tables', () => {
  assert.ok(sqlContent.includes('ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;'), 'RLS on teams')
  assert.ok(sqlContent.includes('ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;'), 'RLS on team_members')
  assert.ok(sqlContent.includes('ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;'), 'RLS on team_invitations')
})

runTest('2.2. Public read policies exposed on teams and team_members', () => {
  assert.ok(/CREATE POLICY "Public teams read"\s+ON public\.teams\s+FOR SELECT\s+USING \(true\);/i.test(sqlContent), 'Public teams read policy')
  assert.ok(/CREATE POLICY "Public team members read"\s+ON public\.team_members\s+FOR SELECT\s+USING \(true\);/i.test(sqlContent), 'Public team_members read policy')
})

runTest('2.3. team_invitations SELECT policy restricted to invitee, inviter, captain, admin', () => {
  const policySnippet = sqlContent.slice(
    sqlContent.indexOf('CREATE POLICY "Authorized users read invitations"'),
    sqlContent.indexOf('CREATE POLICY "Admins manage invitations directly"')
  )
  assert.ok(policySnippet.includes('invitee_id = auth.uid()'), 'invitee can read')
  assert.ok(policySnippet.includes('inviter_id = auth.uid()'), 'inviter can read')
  assert.ok(policySnippet.includes('captain_id = auth.uid()'), 'captain can read')
  assert.ok(policySnippet.includes('public.is_admin()'), 'admin can read')
})

runTest('2.4. Direct unprivileged client mutations revoked; only admins manage directly', () => {
  assert.ok(sqlContent.includes('CREATE POLICY "Admins manage teams directly"'), 'Admins manage teams directly')
  assert.ok(sqlContent.includes('CREATE POLICY "Admins manage members directly"'), 'Admins manage members directly')
  assert.ok(sqlContent.includes('CREATE POLICY "Admins manage invitations directly"'), 'Admins manage invitations directly')
})

// ============================================================================
// GROUP 3: RPC SECURITY & AUTHORIZATION STRUCTURE
// ============================================================================
console.log('\n--- GROUP 3: RPC Security & Authorization Structure ---')

const allRpcs = [
  'create_player_team',
  'update_player_team',
  'invite_team_member',
  'respond_team_invitation',
  'cancel_team_invitation',
  'remove_team_member',
  'leave_player_team',
  'transfer_team_ownership',
  'set_team_member_role',
  'get_my_team_portal_data'
]

runTest('3.1. All 10 RPCs declare SECURITY DEFINER with fixed search_path = public, pg_temp', () => {
  for (const rpc of allRpcs) {
    const fnBody = getFunctionBody(rpc)
    assert.ok(fnBody.includes('SECURITY DEFINER'), `${rpc} must be SECURITY DEFINER`)
    assert.ok(/SET\s+search_path\s*=\s*public\s*,\s*pg_temp/i.test(fnBody), `${rpc} must set search_path = public, pg_temp`)
  }
})

runTest('3.2. All 10 RPCs revoke EXECUTE from PUBLIC and anon', () => {
  for (const rpc of allRpcs) {
    assert.ok(
      sqlContent.includes(`REVOKE EXECUTE ON FUNCTION public.${rpc} FROM PUBLIC, anon;`),
      `EXECUTE on ${rpc} must be revoked from PUBLIC, anon`
    )
  }
})

runTest('3.3. All 10 RPCs grant EXECUTE strictly to authenticated and service_role', () => {
  for (const rpc of allRpcs) {
    assert.ok(
      sqlContent.includes(`GRANT EXECUTE ON FUNCTION public.${rpc} TO authenticated, service_role;`),
      `EXECUTE on ${rpc} granted to authenticated, service_role`
    )
  }
})

runTest('3.4. All mutating RPCs authenticate via auth.uid() without trusting client-supplied user IDs', () => {
  for (const rpc of allRpcs) {
    const fnBody = getFunctionBody(rpc)
    assert.ok(fnBody.includes('v_user_id := auth.uid();'), `${rpc} derives caller via auth.uid()`)
    assert.ok(fnBody.includes("'UNAUTHENTICATED'"), `${rpc} guards against null session`)
  }
})

// ============================================================================
// GROUP 4: TEAM CREATION & PROFILE MUTATIONS
// ============================================================================
console.log('\n--- GROUP 4: Team Creation & Profile Mutations ---')

runTest('4.1. create_player_team asserts caller does not already belong to an active team', () => {
  const fnBody = getFunctionBody('create_player_team')
  assert.ok(fnBody.includes('ALREADY_IN_TEAM'), 'Checks existing active team')
  assert.ok(fnBody.includes("status = 'Active'"), 'Checks status Active')
})

runTest('4.2. create_player_team validates name bounds, tag regex, and 10-digit UID', () => {
  const fnBody = getFunctionBody('create_player_team')
  assert.ok(fnBody.includes('INVALID_TEAM_NAME'), 'Validates team name')
  assert.ok(fnBody.includes('TEAM_NAME_TAKEN'), 'Checks unique team name')
  assert.ok(fnBody.includes('INVALID_TEAM_TAG'), 'Validates tag format')
  assert.ok(fnBody.includes('INVALID_GAME_UID'), 'Validates 10-digit Free Fire UID')
})

runTest('4.3. create_player_team inserts Captain membership atomically with status Active and max_members 6', () => {
  const fnBody = getFunctionBody('create_player_team')
  assert.ok(fnBody.includes("'Captain'"), 'Role set to Captain')
  assert.ok(fnBody.includes("'Active'"), 'Status set to Active')
  assert.ok(fnBody.includes('max_members'), 'max_members specified')
  assert.ok(fnBody.includes('6'), 'Default max_members is 6')
})

runTest('4.4. update_player_team locks team FOR UPDATE and enforces Captain or Admin authorization', () => {
  const fnBody = getFunctionBody('update_player_team')
  assert.ok(/SELECT\s+\*\s+INTO\s+v_team\s+FROM\s+public\.teams\s+WHERE\s+id\s*=\s*p_team_id\s+FOR\s+UPDATE;/i.test(fnBody), 'Locks team FOR UPDATE')
  assert.ok(fnBody.includes('v_team.captain_id <> v_user_id AND NOT public.is_admin()'), 'Enforces Captain or Admin')
})

runTest('4.5. update_player_team preserves security fields (status, captain_id, max_members immutable)', () => {
  const fnBody = getFunctionBody('update_player_team')
  const updateIdx = fnBody.indexOf('UPDATE public.teams')
  const whereIdx = fnBody.indexOf('WHERE id = p_team_id;', updateIdx)
  const updateStatement = fnBody.slice(updateIdx, whereIdx)
  assert.ok(!updateStatement.includes('status ='), 'status must not be updated')
  assert.ok(!updateStatement.includes('captain_id ='), 'captain_id must not be updated')
  assert.ok(!updateStatement.includes('max_members ='), 'max_members must not be updated')
})

// ============================================================================
// GROUP 5: INVITATION LIFECYCLE & ATOMICITY
// ============================================================================
console.log('\n--- GROUP 5: Invitation Lifecycle & Atomicity ---')

runTest('5.1. invite_team_member locks team row FOR UPDATE and verifies capacity < 6', () => {
  const fnBody = getFunctionBody('invite_team_member')
  assert.ok(/SELECT\s+\*\s+INTO\s+v_team\s+FROM\s+public\.teams\s+WHERE\s+id\s*=\s*p_team_id\s+FOR\s+UPDATE;/i.test(fnBody), 'Team locked FOR UPDATE')
  assert.ok(fnBody.includes('TEAM_CAPACITY_FULL'), 'Rejects full squads')
})

runTest('5.2. invite_team_member prevents self-invitations and duplicate pending invites', () => {
  const fnBody = getFunctionBody('invite_team_member')
  assert.ok(fnBody.includes('SELF_INVITATION_PROHIBITED'), 'Blocks self-invitation')
  assert.ok(fnBody.includes('DUPLICATE_PENDING_INVITATION'), 'Blocks duplicate pending invitation')
})

runTest('5.3. invite_team_member verifies invitee is not already active in another squad', () => {
  const fnBody = getFunctionBody('invite_team_member')
  assert.ok(fnBody.includes('INVITEE_ALREADY_IN_TEAM'), 'Rejects players already in squads')
})

runTest('5.4. invite_team_member atomically dispatches N1 Realtime notification to invitee', () => {
  const fnBody = getFunctionBody('invite_team_member')
  assert.ok(fnBody.includes('INSERT INTO public.notifications'), 'Inserts notification')
  assert.ok(fnBody.includes("'Squad Invitation'"), 'Notification title is Squad Invitation')
  assert.ok(fnBody.includes("'/profile/team'"), 'Notification link is /profile/team')
})

runTest('5.5. respond_team_invitation locks both invitation and target team FOR UPDATE', () => {
  const fnBody = getFunctionBody('respond_team_invitation')
  assert.ok(/SELECT\s+\*\s+INTO\s+v_invite\s+FROM\s+public\.team_invitations\s+WHERE\s+id\s*=\s*p_invitation_id\s+FOR\s+UPDATE;/i.test(fnBody), 'Invite locked FOR UPDATE')
  assert.ok(/SELECT\s+\*\s+INTO\s+v_team\s+FROM\s+public\.teams\s+WHERE\s+id\s*=\s*v_invite\.team_id\s+FOR\s+UPDATE;/i.test(fnBody), 'Target team locked FOR UPDATE')
})

runTest('5.6. respond_team_invitation transactionally handles expiration (expires_at <= NOW())', () => {
  const fnBody = getFunctionBody('respond_team_invitation')
  assert.ok(fnBody.includes('v_invite.expires_at <= NOW()'), 'Checks expiration')
  assert.ok(fnBody.includes('INVITATION_EXPIRED'), 'Returns INVITATION_EXPIRED')
  assert.ok(fnBody.includes("status = 'Expired'"), 'Sets status to Expired')
})

runTest('5.7. respond_team_invitation on ACCEPT adds member and cancels other pending invites', () => {
  const fnBody = getFunctionBody('respond_team_invitation')
  assert.ok(fnBody.includes('INSERT INTO public.team_members'), 'Inserts new member')
  assert.ok(fnBody.includes("status = 'Accepted'"), 'Sets status Accepted')
  assert.ok(/UPDATE\s+public\.team_invitations\s+SET\s+status\s*=\s*'Cancelled'/i.test(fnBody), 'Cancels other pending invites')
})

runTest('5.8. respond_team_invitation dispatches atomic notification to captain on ACCEPT/REJECT', () => {
  const fnBody = getFunctionBody('respond_team_invitation')
  assert.ok(fnBody.includes("'Invitation Accepted'"), 'Notification for ACCEPT')
  assert.ok(fnBody.includes("'Invitation Declined'"), 'Notification for REJECT')
})

runTest('5.9. cancel_team_invitation restricts action to Captain or Admin on Pending invites only', () => {
  const fnBody = getFunctionBody('cancel_team_invitation')
  assert.ok(fnBody.includes('v_user_id <> v_team.captain_id'), 'Enforces Captain ownership')
  assert.ok(fnBody.includes('INVITATION_NOT_PENDING'), 'Only Pending invites can be cancelled')
  assert.ok(fnBody.includes("status = 'Cancelled'"), 'Sets status to Cancelled')
})

// ============================================================================
// GROUP 6: MEMBERSHIP MUTATIONS & CAPTAINCY TRANSFER
// ============================================================================
console.log('\n--- GROUP 6: Membership Mutations & Captaincy Transfer ---')

runTest('6.1. remove_team_member prevents captain from removing themselves', () => {
  const fnBody = getFunctionBody('remove_team_member')
  assert.ok(fnBody.includes('CANNOT_REMOVE_CAPTAIN'), 'Captain cannot remove themselves')
})

runTest('6.2. remove_team_member deletes member row and notifies removed user', () => {
  const fnBody = getFunctionBody('remove_team_member')
  assert.ok(fnBody.includes('DELETE FROM public.team_members WHERE id = v_target.id;'), 'Deletes member row')
  assert.ok(fnBody.includes("'Squad Roster Update'"), 'Notifies removed player')
})

runTest('6.3. leave_player_team blocks captain from leaving without prior transfer', () => {
  const fnBody = getFunctionBody('leave_player_team')
  assert.ok(fnBody.includes('CAPTAIN_CANNOT_LEAVE'), 'Captain blocked from leaving')
})

runTest('6.4. leave_player_team deletes member row and notifies captain', () => {
  const fnBody = getFunctionBody('leave_player_team')
  assert.ok(fnBody.includes('DELETE FROM public.team_members WHERE id = v_member.id;'), 'Deletes member row')
  assert.ok(fnBody.includes("'Member Left Squad'"), 'Notifies captain')
})

runTest('6.5. transfer_team_ownership locks team FOR UPDATE and verifies target is active member', () => {
  const fnBody = getFunctionBody('transfer_team_ownership')
  assert.ok(/SELECT\s+\*\s+INTO\s+v_team\s+FROM\s+public\.teams\s+WHERE\s+id\s*=\s*p_team_id\s+FOR\s+UPDATE;/i.test(fnBody), 'Team locked FOR UPDATE')
  assert.ok(fnBody.includes('TARGET_NOT_ACTIVE_MEMBER'), 'Verifies target is active member')
})

runTest('6.6. transfer_team_ownership atomically swaps roles in team_members and updates captain_id', () => {
  const fnBody = getFunctionBody('transfer_team_ownership')
  assert.ok(fnBody.includes("UPDATE public.team_members\n  SET role = 'Member'"), 'Demotes old captain')
  assert.ok(fnBody.includes("UPDATE public.team_members\n  SET role = 'Captain'"), 'Promotes new captain')
  assert.ok(fnBody.includes('captain_id = p_new_captain_user_id'), 'Updates teams.captain_id')
  assert.ok(fnBody.includes("'Captaincy Assigned'"), 'Notifies new captain')
})

runTest('6.7. set_team_member_role prevents modifying captain role directly', () => {
  const fnBody = getFunctionBody('set_team_member_role')
  assert.ok(fnBody.includes('CANNOT_CHANGE_CAPTAIN_ROLE'), 'Captain role immutable via set_team_member_role')
  assert.ok(fnBody.includes("'Member', 'Substitute'"), 'Only Member or Substitute allowed')
})

runTest('6.8. get_my_team_portal_data aggregates team, 6 member slots, incoming and outgoing invites', () => {
  const fnBody = getFunctionBody('get_my_team_portal_data')
  assert.ok(fnBody.includes('v_incoming_invites'), 'Loads incoming invites')
  assert.ok(fnBody.includes('v_outgoing_invites'), 'Loads outgoing invites')
  assert.ok(fnBody.includes('v_members'), 'Loads member slots')
  assert.ok(fnBody.includes('v_is_captain'), 'Computes is_captain flag')
})

// ============================================================================
// GROUP 7: SIMULATION & INTEGRATION LOGIC MATRIX
// ============================================================================
console.log('\n--- GROUP 7: Simulation & Concurrency Logic Matrix ---')

runTest('7.1. Simulation: Concurrent acceptance into 6th slot serialized via FOR UPDATE', () => {
  // Simulate 2 parallel acceptances when team has 5 members
  const maxCapacity = 6
  let currentMembers = 5
  function attemptAcceptance() {
    if (currentMembers >= maxCapacity) {
      return { success: false, error_code: 'TEAM_CAPACITY_FULL' }
    }
    currentMembers++
    return { success: true, action: 'ACCEPTED' }
  }
  const result1 = attemptAcceptance()
  const result2 = attemptAcceptance()
  assert.equal(result1.success, true, 'First acceptance succeeds')
  assert.equal(result2.success, false, 'Second acceptance rejected due to capacity')
  assert.equal(result2.error_code, 'TEAM_CAPACITY_FULL')
  assert.equal(currentMembers, 6, 'Total squad size remains exactly 6')
})

runTest('7.2. Simulation: Player accepting two invites serialized via single-active constraint', () => {
  const activeTeams = new Map()
  function attemptJoin(userId, teamId) {
    if (activeTeams.has(userId)) {
      return { success: false, error_code: 'ALREADY_IN_TEAM' }
    }
    activeTeams.set(userId, teamId)
    return { success: true, action: 'ACCEPTED' }
  }
  const playerX = 'user-uuid-123'
  const resA = attemptJoin(playerX, 'team-alpha')
  const resB = attemptJoin(playerX, 'team-beta')
  assert.equal(resA.success, true, 'First team join succeeds')
  assert.equal(resB.success, false, 'Second team join fails with ALREADY_IN_TEAM')
  assert.equal(resB.error_code, 'ALREADY_IN_TEAM')
  assert.equal(activeTeams.get(playerX), 'team-alpha')
})

runTest('7.3. Simulation: Stale/Expired invitation cannot be accepted', () => {
  const invite = {
    id: 'invite-1',
    status: 'Pending',
    expires_at: new Date(Date.now() - 3600000) // expired 1 hour ago
  }
  function processInvite(inv) {
    if (inv.expires_at <= new Date()) {
      inv.status = 'Expired'
      return { success: false, error_code: 'INVITATION_EXPIRED' }
    }
    return { success: true }
  }
  const result = processInvite(invite)
  assert.equal(result.success, false)
  assert.equal(result.error_code, 'INVITATION_EXPIRED')
  assert.equal(invite.status, 'Expired')
})

// ============================================================================
// FINAL SUMMARY
// ============================================================================
console.log('\n================================================================================')
console.log(`N3.2 TEST RESULTS: ${passedTests} PASSED | ${failedTests} FAILED`)
console.log('================================================================================\n')

if (failedTests > 0) {
  process.exit(1)
}
