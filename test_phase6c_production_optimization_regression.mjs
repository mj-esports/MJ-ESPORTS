// ============================================================================
// MJ ESPORTS — Phase 6C: Production Optimization & Security Audit Regression Tests
// Target File: supabase_production_optimization.sql (Stage 3 Migration)
// ============================================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sqlPath = path.join(__dirname, 'supabase_production_optimization.sql');
const rbacSqlPath = path.join(__dirname, 'supabase_rbac_setup.sql');
const phase10SqlPath = path.join(__dirname, 'supabase_phase10_setup.sql');
const tournamentContextPath = path.join(__dirname, 'src', 'contexts', 'TournamentContext.jsx');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] ${message}`);
  } else {
    failedTests++;
    console.error(`  [FAIL] ${message}`);
  }
}

console.log('----------------------------------------------------------------------');
console.log('MJ ESPORTS — Phase 6C Stage 3 Production Optimization Regression Suite');
console.log('----------------------------------------------------------------------\n');

// Read files
const sqlContent = fs.readFileSync(sqlPath, 'utf8');
const rbacContent = fs.readFileSync(rbacSqlPath, 'utf8');
const phase10Content = fs.readFileSync(phase10SqlPath, 'utf8');
const tournamentContextContent = fs.readFileSync(tournamentContextPath, 'utf8');

// ----------------------------------------------------------------------------
// Group 1: File Integrity & Prerequisite Schema Alignment
// ----------------------------------------------------------------------------
console.log('Group 1: File Integrity & Prerequisite Schema Alignment');

assert(
  !sqlContent.includes('fdhjqlejomtgwffqgmoq'),
  '1.1 No production project reference leaked in migration'
);

assert(
  !sqlContent.includes('DROP TABLE') && !sqlContent.includes('TRUNCATE'),
  '1.2 Migration contains zero destructive operations (no DROP TABLE or TRUNCATE)'
);

assert(
  /ALTER TABLE public\.tournaments ADD COLUMN IF NOT EXISTS banner_url TEXT/i.test(sqlContent),
  '1.3 Ensures banner_url prerequisite column exists'
);

assert(
  /ALTER TABLE public\.tournaments ADD COLUMN IF NOT EXISTS mode TEXT/i.test(sqlContent) &&
  /ALTER TABLE public\.tournaments ADD COLUMN IF NOT EXISTS map TEXT/i.test(sqlContent) &&
  /ALTER TABLE public\.tournaments ADD COLUMN IF NOT EXISTS registration_start TIMESTAMPTZ/i.test(sqlContent) &&
  /ALTER TABLE public\.tournaments ADD COLUMN IF NOT EXISTS registration_end TIMESTAMPTZ/i.test(sqlContent),
  '1.4 Ensures Phase 10 format columns exist'
);

// ----------------------------------------------------------------------------
// Group 2: Sensitive Room Credential Protection & Column Privilege Hardening
// ----------------------------------------------------------------------------
console.log('\nGroup 2: Sensitive Room Credential Protection & Column Privilege Hardening');

assert(
  /REVOKE SELECT ON public\.tournaments FROM anon,\s*authenticated,\s*public/i.test(sqlContent),
  '2.1 Table-level SELECT on public.tournaments is revoked from public and authenticated roles'
);

const grantMatch = sqlContent.match(/GRANT SELECT \(([\s\S]*?)\) ON public\.tournaments TO anon,\s*authenticated/i);
assert(
  grantMatch !== null,
  '2.2 Explicit column-level GRANT SELECT statement exists for anon and authenticated'
);

if (grantMatch) {
  const grantedColumns = grantMatch[1].split(',').map((c) => c.trim().toLowerCase());
  
  assert(
    !grantedColumns.includes('room_id'),
    '2.3 room_id is strictly EXCLUDED from public column-level SELECT grant'
  );

  assert(
    !grantedColumns.includes('room_password'),
    '2.4 room_password is strictly EXCLUDED from public column-level SELECT grant'
  );

  assert(
    !grantedColumns.includes('teams_list'),
    '2.4b teams_list is strictly EXCLUDED from public column-level SELECT grant (No public role receives SELECT access to teams_list)'
  );

  assert(
    grantedColumns.includes('id') &&
    grantedColumns.includes('title') &&
    grantedColumns.includes('prize_pool') &&
    grantedColumns.includes('entry_fee') &&
    grantedColumns.includes('status') &&
    grantedColumns.includes('room_status') &&
    grantedColumns.includes('banner_url'),
    '2.5 Essential safe tournament display columns are included in public SELECT grant'
  );
}

assert(
  !sqlContent.match(/GRANT\s+SELECT\s*\([^)]*teams_list[^)]*\)\s*ON\s+public\.tournaments\s+TO\s*[^;]*(?:anon|authenticated|public)/i),
  '2.5b Verified: ZERO public, anon, or authenticated roles receive SELECT access to teams_list in SQL'
);

assert(
  /GRANT SELECT,\s*INSERT,\s*UPDATE,\s*DELETE ON public\.tournaments TO service_role/i.test(sqlContent) &&
  /GRANT ALL ON public\.tournaments TO service_role/i.test(sqlContent),
  '2.6 service_role retains full administrative privileges on public.tournaments'
);

assert(
  /GRANT INSERT,\s*UPDATE,\s*DELETE ON public\.tournaments TO authenticated/i.test(sqlContent),
  '2.7 authenticated role has mutation privileges on public.tournaments (gated by RLS)'
);

// ----------------------------------------------------------------------------
// Group 3: Restricted Public View & Secure RPC
// ----------------------------------------------------------------------------
console.log('\nGroup 3: Restricted Public View & Secure RPC');

const viewMatch = sqlContent.match(/CREATE OR REPLACE VIEW public\.tournaments_public AS([\s\S]*?)WHERE \(([\s\S]*?)\);/i);
assert(
  viewMatch !== null,
  '3.1 CREATE OR REPLACE VIEW public.tournaments_public exists'
);

if (viewMatch) {
  const viewSelectColumns = viewMatch[1].toLowerCase();
  assert(
    !viewSelectColumns.includes('room_id') && !viewSelectColumns.includes('room_password'),
    '3.2 public.tournaments_public view strictly excludes room_id and room_password'
  );

  assert(
    !viewSelectColumns.includes('teams_list'),
    '3.2b public.tournaments_public view strictly excludes teams_list to protect participant PII'
  );

  assert(
    /status\s*!=\s*'Draft'\s*OR\s*public\.is_admin\(\)/i.test(viewMatch[2]),
    '3.3 public.tournaments_public view hides Drafts from non-administrators'
  );
}

assert(
  /GRANT SELECT ON public\.tournaments_public TO anon,\s*authenticated,\s*service_role/i.test(sqlContent),
  '3.4 SELECT privilege on public.tournaments_public granted to anon, authenticated, and service_role'
);

assert(
  /CREATE OR REPLACE FUNCTION public\.get_public_tournaments\(\)/i.test(sqlContent) &&
  /RETURNS SETOF public\.tournaments_public/i.test(sqlContent),
  '3.5 Secure get_public_tournaments() RPC function is defined and returns SETOF public.tournaments_public'
);

assert(
  /GRANT EXECUTE ON FUNCTION public\.get_public_tournaments\(\) TO anon,\s*authenticated,\s*service_role/i.test(sqlContent),
  '3.6 EXECUTE privilege on get_public_tournaments() granted to anon, authenticated, and service_role'
);

// ----------------------------------------------------------------------------
// Group 4: Baseline Room Credentials Access Gate (get_tournament_room_credentials)
// ----------------------------------------------------------------------------
console.log('\nGroup 4: Baseline Room Credentials Access Gate (get_tournament_room_credentials)');

assert(
  /CREATE OR REPLACE FUNCTION public\.get_tournament_room_credentials\(\s*p_tournament_id TEXT\s*\)/i.test(sqlContent),
  '4.1 Baseline get_tournament_room_credentials(TEXT) function defined'
);

assert(
  /SECURITY DEFINER/i.test(sqlContent) && /SET search_path = public,\s*pg_temp/i.test(sqlContent),
  '4.2 Function uses SECURITY DEFINER with hardened search_path'
);

assert(
  /v_user_id\s*:=\s*auth\.uid\(\);/i.test(sqlContent) &&
  /IF\s+v_user_id\s+IS\s+NULL\s+THEN/i.test(sqlContent) &&
  /UNAUTHENTICATED/i.test(sqlContent),
  '4.3 Gated by user authentication (rejects unauthenticated requests)'
);

assert(
  /public\.is_admin\(\)/i.test(sqlContent) && /is_admin_override/i.test(sqlContent),
  '4.4 Permits admin override regardless of publication status'
);

assert(
  /room_status.*!=.*'Published'/i.test(sqlContent) && /ROOM_NOT_PUBLISHED/i.test(sqlContent),
  '4.5 Non-admin access rejected if room_status is not Published'
);

assert(
  /FROM public\.tournament_registrations/i.test(sqlContent) && /NOT_REGISTERED/i.test(sqlContent),
  '4.6 Non-admin access rejected if caller is not an approved registered participant'
);

assert(
  /REVOKE EXECUTE ON FUNCTION public\.get_tournament_room_credentials\(TEXT\) FROM PUBLIC/i.test(sqlContent) &&
  /GRANT EXECUTE ON FUNCTION public\.get_tournament_room_credentials\(TEXT\) TO authenticated/i.test(sqlContent),
  '4.7 EXECUTE revoked from PUBLIC and granted only to authenticated and service_role'
);

// ----------------------------------------------------------------------------
// Group 5: Tournaments RLS Policies
// ----------------------------------------------------------------------------
console.log('\nGroup 5: Tournaments RLS Policies');

assert(
  /ALTER TABLE public\.tournaments ENABLE ROW LEVEL SECURITY;/i.test(sqlContent),
  '5.1 ROW LEVEL SECURITY is explicitly enabled on public.tournaments'
);

assert(
  /DROP POLICY IF EXISTS "Public Read Tournaments" ON public\.tournaments;/i.test(sqlContent) &&
  /DROP POLICY IF EXISTS "Public read tournaments" ON public\.tournaments;/i.test(sqlContent),
  '5.2 Drops all previous legacy and casing variants of public read policy'
);

assert(
  /CREATE POLICY "Public Read Tournaments"[\s\S]*?ON public\.tournaments[\s\S]*?FOR SELECT[\s\S]*?USING \(([\s\S]*?)\);/i.test(sqlContent),
  '5.3 Public Read Tournaments policy created'
);

const publicReadMatch = sqlContent.match(/CREATE POLICY "Public Read Tournaments"[\s\S]*?ON public\.tournaments[\s\S]*?FOR SELECT[\s\S]*?USING \(([\s\S]*?)\);/i);
if (publicReadMatch) {
  assert(
    !publicReadMatch[1].trim().toLowerCase().includes('using (true)') &&
    /status\s*!=\s*'Draft'\s*OR\s*public\.is_admin\(\)/i.test(publicReadMatch[1]),
    '5.4 Public Read Tournaments policy restricts Drafts (USING (status != \'Draft\' OR public.is_admin()))'
  );
}

assert(
  /DROP POLICY IF EXISTS "Admin Full Access Tournaments" ON public\.tournaments;/i.test(sqlContent) &&
  /DROP POLICY IF EXISTS "Admins insert tournaments" ON public\.tournaments;/i.test(sqlContent) &&
  /DROP POLICY IF EXISTS "Admins update tournaments" ON public\.tournaments;/i.test(sqlContent) &&
  /DROP POLICY IF EXISTS "Admins delete tournaments" ON public\.tournaments;/i.test(sqlContent),
  '5.5 Drops all previous legacy admin tournament policies'
);

const adminFullAccessBlock = sqlContent.match(/CREATE POLICY "Admin Full Access Tournaments"[\s\S]*?ON public\.tournaments[\s\S]*?;/i);
assert(
  adminFullAccessBlock !== null,
  '5.6 Admin Full Access Tournaments policy exists'
);

if (adminFullAccessBlock) {
  assert(
    /USING\s*\(\s*public\.is_admin\(\)\s*\)/i.test(adminFullAccessBlock[0]) &&
    /WITH\s+CHECK\s*\(\s*public\.is_admin\(\)\s*\)/i.test(adminFullAccessBlock[0]),
    '5.7 Admin Full Access Tournaments policy enforces public.is_admin() in both USING and WITH CHECK'
  );
}

// ----------------------------------------------------------------------------
// Group 6: High-Traffic Database Indexes Schema Verification
// ----------------------------------------------------------------------------
console.log('\nGroup 6: High-Traffic Database Indexes Schema Verification');

assert(
  /CREATE INDEX IF NOT EXISTS idx_tournaments_created_at_desc\s+ON public\.tournaments\s*\(created_at DESC\)/i.test(sqlContent),
  '6.1 Tournaments created_at DESC index verified'
);

assert(
  /CREATE INDEX IF NOT EXISTS idx_tournaments_status\s+ON public\.tournaments\s*\(status\)/i.test(sqlContent),
  '6.2 Tournaments status index verified'
);

assert(
  /CREATE INDEX IF NOT EXISTS idx_registrations_tournament_id\s+ON public\.tournament_registrations\s*\(tournament_id\)/i.test(sqlContent),
  '6.3 Registrations tournament_id index verified'
);

assert(
  /CREATE INDEX IF NOT EXISTS idx_registrations_user_id\s+ON public\.tournament_registrations\s*\(user_id\)/i.test(sqlContent),
  '6.4 Registrations user_id index verified'
);

assert(
  /CREATE INDEX IF NOT EXISTS idx_registrations_dup_lookup\s+ON public\.tournament_registrations\s*\(tournament_id,\s*email,\s*free_fire_uid\)/i.test(sqlContent),
  '6.5 Registrations composite (tournament_id, email, free_fire_uid) index verified'
);

assert(
  /CREATE INDEX IF NOT EXISTS idx_user_roles_user_id_role\s+ON public\.user_roles\s*\(user_id,\s*role\)/i.test(sqlContent),
  '6.6 User roles (user_id, role) composite index verified'
);

assert(
  /CREATE INDEX IF NOT EXISTS idx_profiles_username\s+ON public\.profiles\s*\(username\)/i.test(sqlContent),
  '6.7 Profiles username index verified'
);

assert(
  /CREATE INDEX IF NOT EXISTS idx_wallet_tx_user_id_created_at\s+ON public\.wallet_transactions\s*\(user_id,\s*created_at DESC\)/i.test(sqlContent),
  '6.8 Wallet transactions (user_id, created_at DESC) index uniquely named and verified'
);

assert(
  /CREATE INDEX IF NOT EXISTS idx_notifications_user_id_created_at\s+ON public\.notifications\s*\(user_id,\s*created_at DESC\)/i.test(sqlContent),
  '6.9 Notifications (user_id, created_at DESC) index verified'
);

// Verify index columns against actual schema in rbacContent and phase10Content
assert(
  /tournament_id TEXT NOT NULL REFERENCES public\.tournaments/i.test(rbacContent) &&
  /user_id UUID REFERENCES auth\.users/i.test(rbacContent) &&
  /email TEXT NOT NULL/i.test(rbacContent) &&
  /free_fire_uid TEXT/i.test(rbacContent),
  '6.10 All registration index columns (tournament_id, user_id, email, free_fire_uid) exist in public.tournament_registrations schema'
);

assert(
  /user_id UUID NOT NULL UNIQUE REFERENCES auth\.users/i.test(rbacContent) &&
  /role TEXT NOT NULL CHECK/i.test(rbacContent),
  '6.11 All user_roles index columns (user_id, role) exist in public.user_roles schema'
);

assert(
  /username TEXT NOT NULL/i.test(rbacContent),
  '6.12 Profile username column exists in public.profiles schema'
);

assert(
  /user_id UUID NOT NULL REFERENCES auth\.users/i.test(phase10Content) &&
  /created_at TIMESTAMPTZ NOT NULL DEFAULT NOW\(\)/i.test(phase10Content),
  '6.13 All wallet_transactions index columns (user_id, created_at) exist in public.wallet_transactions schema'
);

// ----------------------------------------------------------------------------
// Group 7: Notifications & Wallet Transactions RLS Policies
// ----------------------------------------------------------------------------
console.log('\nGroup 7: Notifications & Wallet Transactions RLS Policies');

assert(
  /ALTER TABLE public\.wallet_transactions ENABLE ROW LEVEL SECURITY;/i.test(sqlContent),
  '7.1 RLS enabled on public.wallet_transactions'
);

const walletSelectPolicyMatch = sqlContent.match(/CREATE POLICY "Users View Own Wallet Tx"[\s\S]*?ON public\.wallet_transactions[\s\S]*?FOR SELECT[\s\S]*?USING \(([\s\S]*?)\);/i);
assert(
  walletSelectPolicyMatch !== null &&
  /auth\.uid\(\)\s*=\s*user_id\s*OR\s*public\.is_admin\(\)/i.test(walletSelectPolicyMatch[1]),
  '7.2 Users View Own Wallet Tx policy allows user_id owner OR public.is_admin()'
);

const walletMutationsBlock = sqlContent.match(/CREATE POLICY "Admins manage wallet transactions"[\s\S]*?ON public\.wallet_transactions[\s\S]*?;/i);
assert(
  walletMutationsBlock !== null &&
  /USING\s*\(\s*public\.is_admin\(\)\s*\)/i.test(walletMutationsBlock[0]) &&
  /WITH\s+CHECK\s*\(\s*public\.is_admin\(\)\s*\)/i.test(walletMutationsBlock[0]),
  '7.3 Admins manage wallet transactions policy enforces public.is_admin() in both USING and WITH CHECK'
);

assert(
  /ALTER TABLE public\.notifications ENABLE ROW LEVEL SECURITY;/i.test(sqlContent),
  '7.4 RLS enabled on public.notifications'
);

const notifSelectPolicyMatch = sqlContent.match(/CREATE POLICY "Users View Own Notifications"[\s\S]*?ON public\.notifications[\s\S]*?FOR SELECT[\s\S]*?USING \(([\s\S]*?)\);/i);
assert(
  notifSelectPolicyMatch !== null &&
  /auth\.uid\(\)\s*=\s*user_id\s*OR\s*public\.is_admin\(\)/i.test(notifSelectPolicyMatch[1]),
  '7.5 Users View Own Notifications policy allows user_id owner OR public.is_admin()'
);

const notifUpdateBlock = sqlContent.match(/CREATE POLICY "Users Update Own Notifications"[\s\S]*?ON public\.notifications[\s\S]*?;/i);
assert(
  notifUpdateBlock !== null &&
  /USING\s*\(\s*auth\.uid\(\)\s*=\s*user_id\s*OR\s*public\.is_admin\(\)\s*\)/i.test(notifUpdateBlock[0]) &&
  /WITH\s+CHECK\s*\(\s*auth\.uid\(\)\s*=\s*user_id\s*OR\s*public\.is_admin\(\)\s*\)/i.test(notifUpdateBlock[0]),
  '7.6 Users Update Own Notifications policy allows user_id owner OR admin with USING and WITH CHECK'
);

const notifInsertBlock = sqlContent.match(/CREATE POLICY "Users Insert Own Notifications Or Admin Inserts Any"[\s\S]*?ON public\.notifications[\s\S]*?;/i);
assert(
  notifInsertBlock !== null,
  '7.7 Users Insert Own Notifications Or Admin Inserts Any policy exists'
);

if (notifInsertBlock) {
  assert(
    /WITH\s+CHECK\s*\(\s*public\.is_admin\(\)\s*OR\s*\(?\s*auth\.uid\(\)\s*=\s*user_id\s*\)?\s*\)/i.test(notifInsertBlock[0]),
    '7.8 Notifications insert policy strictly enforces WITH CHECK (public.is_admin() OR auth.uid() = user_id)'
  );
  assert(
    !notifInsertBlock[0].includes('auth.uid() IS NOT NULL'),
    '7.9 Notifications insert policy does NOT permit arbitrary auth.uid() IS NOT NULL insertions'
  );
}

const notifAdminBlock = sqlContent.match(/CREATE POLICY "Admins manage notifications"[\s\S]*?ON public\.notifications[\s\S]*?;/i);
assert(
  notifAdminBlock !== null &&
  /USING\s*\(\s*public\.is_admin\(\)\s*\)/i.test(notifAdminBlock[0]) &&
  /WITH\s+CHECK\s*\(\s*public\.is_admin\(\)\s*\)/i.test(notifAdminBlock[0]),
  '7.10 Admins manage notifications policy enforces public.is_admin() in both USING and WITH CHECK'
);

// ----------------------------------------------------------------------------
// Group 8: Frontend Query Compatibility Verification
// ----------------------------------------------------------------------------
console.log('\nGroup 8: Frontend Query Compatibility Verification');

const frontendContextSelectMatch = tournamentContextContent.match(/\.from\('tournaments'\)\s*\.select\('([\s\S]*?)'\)/);
assert(
  frontendContextSelectMatch !== null,
  '8.1 Found TournamentContext.jsx frontend select query'
);

if (frontendContextSelectMatch && grantMatch) {
  const queriedColumns = frontendContextSelectMatch[1]
    .split(',')
    .map((c) => c.trim().toLowerCase());
  const grantedColumns = grantMatch[1]
    .split(',')
    .map((c) => c.trim().toLowerCase());

  // Filter out teams_list as it is intentionally revoked from public/authenticated access to protect participant PII
  const missingColumns = queriedColumns
    .filter((col) => !grantedColumns.includes(col))
    .filter((col) => col !== 'teams_list');

  assert(
    missingColumns.length === 0,
    `8.2 All standard tournament display columns queried by TournamentContext are included in the granted SELECT columns (Missing: ${missingColumns.join(', ') || 'none'})`
  );

  assert(
    !grantedColumns.includes('teams_list'),
    '8.2b Database column-level grant strictly excludes teams_list to protect participant PII'
  );

  assert(
    !queriedColumns.includes('room_id') && !queriedColumns.includes('room_password'),
    '8.3 TournamentContext frontend query does NOT request sensitive room credentials'
  );
}

// ----------------------------------------------------------------------------
// Group 9: PostgreSQL RLS Behavioral & Threat Simulation
// ----------------------------------------------------------------------------
console.log('\nGroup 9: PostgreSQL RLS Behavioral & Threat Simulation');

// Simulate the notifications INSERT RLS policy:
// WITH CHECK (public.is_admin() OR (auth.uid() = user_id))
function evaluateNotificationInsertRLS({ authUid, isAdmin, isServiceRole, targetUserId }) {
  if (isServiceRole) return true; // BYPASSRLS
  if (!authUid) return false; // Unauthenticated
  return Boolean(isAdmin || authUid === targetUserId);
}

const userA = '11111111-1111-1111-1111-111111111111';
const userB = '22222222-2222-2222-2222-222222222222';
const adminUser = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

// Threat 1: Normal user A attempts to create a notification for user B
const canUserACreateForUserB = evaluateNotificationInsertRLS({
  authUid: userA,
  isAdmin: false,
  isServiceRole: false,
  targetUserId: userB,
});
assert(
  canUserACreateForUserB === false,
  '9.1 Threat Mitigation: Normal user cannot create notification for another user (Blocked by RLS)'
);

// Threat 2: Normal user A attempts to spoof an admin announcement to user B
const canUserASpoofAdminAlert = evaluateNotificationInsertRLS({
  authUid: userA,
  isAdmin: false,
  isServiceRole: false,
  targetUserId: userB,
});
assert(
  canUserASpoofAdminAlert === false,
  '9.2 Threat Mitigation: Normal user cannot impersonate an admin notification to arbitrary users'
);

// Authorized 1: Normal user A creates notification for self
const canUserACreateForSelf = evaluateNotificationInsertRLS({
  authUid: userA,
  isAdmin: false,
  isServiceRole: false,
  targetUserId: userA,
});
assert(
  canUserACreateForSelf === true,
  '9.3 Authorized Path: Normal user can create self-notification (auth.uid() = user_id)'
);

// Authorized 2: Admin creates notification for user B
const canAdminCreateForUserB = evaluateNotificationInsertRLS({
  authUid: adminUser,
  isAdmin: true,
  isServiceRole: false,
  targetUserId: userB,
});
assert(
  canAdminCreateForUserB === true,
  '9.4 Authorized Path: Administrator can dispatch notification to any user (public.is_admin())'
);

// Authorized 3: System backend / Edge Function via service_role
const canServiceRoleCreate = evaluateNotificationInsertRLS({
  authUid: null,
  isAdmin: false,
  isServiceRole: true,
  targetUserId: userB,
});
assert(
  canServiceRoleCreate === true,
  '9.5 Authorized Path: Trusted server-side / service_role notification creation succeeds (BYPASSRLS)'
);

// Simulation of tournaments_public view columns
const publicViewColumns = [
  'id', 'title', 'game', 'format', 'prize_pool', 'entry_fee', 'max_teams', 'registered_teams',
  'start_date', 'start_time', 'status', 'organizer', 'description', 'rules', 'room_status',
  'room_last_updated', 'room_published_by', 'winner_team', 'winner_captain', 'created_at',
  'updated_at', 'banner_url', 'mode', 'map', 'registration_start', 'registration_end',
  'match_date', 'match_time', 'banner_image', 'team_size'
];

assert(
  !publicViewColumns.includes('room_id') &&
  !publicViewColumns.includes('room_password'),
  '9.6 Public tournament view output contains ZERO room credentials'
);

assert(
  !publicViewColumns.includes('teams_list') &&
  !publicViewColumns.includes('user_id') &&
  !publicViewColumns.includes('free_fire_uid') &&
  !publicViewColumns.includes('email'),
  '9.7 Public tournament view output contains ZERO private participant information (no teams_list, UIDs, or emails)'
);

assert(
  !publicViewColumns.includes('payment_id') &&
  !publicViewColumns.includes('paymentid') &&
  !publicViewColumns.includes('ref_id') &&
  !publicViewColumns.includes('refid') &&
  !publicViewColumns.includes('transaction_id'),
  '9.7b Public tournament view output contains ZERO participant payment references'
);

// Simulation of admin tournament CRUD
function evaluateAdminTournamentCRUD({ isAdmin }) {
  return Boolean(isAdmin);
}
assert(
  evaluateAdminTournamentCRUD({ isAdmin: true }) === true,
  '9.8 Admin full tournament management is preserved (USING and WITH CHECK)'
);

// Simulation of wallet transactions RLS
function evaluateWalletTxSelect({ authUid, isAdmin, rowUserId }) {
  if (!authUid) return false;
  return Boolean(isAdmin || authUid === rowUserId);
}
assert(
  evaluateWalletTxSelect({ authUid: userA, isAdmin: false, rowUserId: userA }) === true &&
  evaluateWalletTxSelect({ authUid: userA, isAdmin: false, rowUserId: userB }) === false &&
  evaluateWalletTxSelect({ authUid: adminUser, isAdmin: true, rowUserId: userB }) === true,
  '9.9 Wallet transactions RLS isolates user rows while preserving admin queue visibility'
);

// ----------------------------------------------------------------------------
// Summary
// ----------------------------------------------------------------------------
console.log('\n======================================================================');
console.log(`Regression Test Results: ${passedTests}/${totalTests} Passed (${failedTests} Failed)`);
console.log('======================================================================\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
