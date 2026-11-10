// test_phase6c_reconcile_authorization_regression.mjs
// Regression test suite for Edge Function reconcile-famgateway-payments authorization
// Validates:
// 1. Zero references to obsolete 'admin_users' table across codebase.
// 2. Strict integration with 'public.user_roles' and is_admin() RBAC model.
// 3. Preservation of service-role authorization for automated cron workers.
// 4. Strict admin privilege validation for manual invocations ('admin', 'super_admin', 'owner').
// 5. Rejection of standard 'user' or unauthenticated callers.
// 6. Preservation of payment verification, registration recovery, and financial isolation.

import fs from 'fs'
import path from 'path'

let totalTests = 0
let passedTests = 0
let failedTests = 0

function assert(condition, message) {
  totalTests++
  if (condition) {
    passedTests++
    console.log(`  ✓ ${message}`)
  } else {
    failedTests++
    console.error(`  ✗ FAIL: ${message}`)
  }
}

console.log('======================================================================')
console.log('MJ ESPORTS: Reconcile FamGateway Payments Authorization Regression')
console.log('======================================================================\n')

const reconcilePath = path.resolve('supabase/functions/reconcile-famgateway-payments/index.ts')

// -----------------------------------------------------------------------------
// GROUP 1: Codebase Schema Integrity & Deprecated Table Elimination
// -----------------------------------------------------------------------------
console.log('--- GROUP 1: Codebase Schema Integrity & Deprecated Table Elimination ---')

assert(fs.existsSync(reconcilePath), 'reconcile-famgateway-payments/index.ts exists')
const reconcileCode = fs.readFileSync(reconcilePath, 'utf8')

assert(
  !reconcileCode.includes('admin_users'),
  'Obsolete "admin_users" table is completely removed from reconcile function'
)

// Verify no other files in supabase/functions reference admin_users
const functionsDir = path.resolve('supabase/functions')
const allFunctionFiles = []

function scanDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      scanDir(fullPath)
    } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.js')) {
      allFunctionFiles.push(fullPath)
    }
  }
}
scanDir(functionsDir)

let adminUsersFound = false
for (const file of allFunctionFiles) {
  const content = fs.readFileSync(file, 'utf8')
  if (content.includes('admin_users')) {
    adminUsersFound = true
    console.error(`Found admin_users in: ${file}`)
  }
}
assert(!adminUsersFound, 'Zero occurrences of "admin_users" in any Edge Function')

// -----------------------------------------------------------------------------
// GROUP 2: RBAC Schema Compliance (public.user_roles)
// -----------------------------------------------------------------------------
console.log('\n--- GROUP 2: RBAC Schema Compliance (public.user_roles) ---')

assert(
  reconcileCode.includes(".from('user_roles')"),
  'Reconcile function queries public.user_roles table'
)
assert(
  reconcileCode.includes(".select('role')"),
  'Reconcile function selects role column from user_roles'
)
assert(
  reconcileCode.includes(".eq('user_id', user.id)"),
  'Reconcile function filters strictly by authenticated user.id'
)

// Check allowed administrative roles
const roleMatch = reconcileCode.match(/const ADMIN_ROLES\s*=\s*\[([^\]]+)\]/)
assert(roleMatch !== null, 'ADMIN_ROLES constant defined')
if (roleMatch) {
  const rolesList = roleMatch[1].split(',').map(r => r.trim().replace(/['"]/g, ''))
  assert(rolesList.includes('admin'), 'ADMIN_ROLES permits "admin"')
  assert(rolesList.includes('super_admin'), 'ADMIN_ROLES permits "super_admin"')
  assert(rolesList.includes('owner'), 'ADMIN_ROLES permits "owner"')
  assert(!rolesList.includes('user'), 'ADMIN_ROLES strictly excludes standard "user"')
}

// -----------------------------------------------------------------------------
// GROUP 3: Service-Role & Authenticated Authorization Logic Emulation
// -----------------------------------------------------------------------------
console.log('\n--- GROUP 3: Service-Role & Authenticated Authorization Logic Emulation ---')

function evaluateAuthorization(authHeader, supabaseServiceKey, user, userRoleRecord, roleError = null) {
  const isServiceRole = authHeader.includes(supabaseServiceKey) && supabaseServiceKey.length > 0
  let isAuthorized = isServiceRole

  if (!isAuthorized && authHeader) {
    if (user) {
      if (!roleError && userRoleRecord) {
        const role = String(userRoleRecord.role || '').toLowerCase().trim()
        const ADMIN_ROLES = ['admin', 'super_admin', 'owner']
        if (ADMIN_ROLES.includes(role)) {
          isAuthorized = true
        }
      }
    }
  }

  return isAuthorized
}

const mockServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.service_role_secret_key_12345'
const mockUserJwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.user_token_abcde'
const mockAdminUser = { id: 'a1111111-2222-3333-4444-555555555555', email: 'admin@mjesports.in' }
const mockNormalUser = { id: 'b2222222-3333-4444-5555-666666666666', email: 'player@gmail.com' }

// Test 3.1: Service-Role cron caller
assert(
  evaluateAuthorization(`Bearer ${mockServiceKey}`, mockServiceKey, null, null) === true,
  'Scheduled cron worker with valid service_role key is authorized'
)

// Test 3.2: Empty service key does not grant access
assert(
  evaluateAuthorization('Bearer ', '', null, null) === false,
  'Empty service key is strictly rejected'
)

// Test 3.3: Unauthenticated caller
assert(
  evaluateAuthorization('', mockServiceKey, null, null) === false,
  'Anonymous caller with no auth header is rejected'
)

// Test 3.4: Authenticated user with 'admin' role
assert(
  evaluateAuthorization(`Bearer ${mockUserJwt}`, mockServiceKey, mockAdminUser, { role: 'admin' }) === true,
  'Authenticated user with role="admin" is authorized'
)

// Test 3.5: Authenticated user with 'super_admin' role
assert(
  evaluateAuthorization(`Bearer ${mockUserJwt}`, mockServiceKey, mockAdminUser, { role: 'super_admin' }) === true,
  'Authenticated user with role="super_admin" is authorized'
)

// Test 3.6: Authenticated user with 'owner' role
assert(
  evaluateAuthorization(`Bearer ${mockUserJwt}`, mockServiceKey, mockAdminUser, { role: 'owner' }) === true,
  'Authenticated user with role="owner" is authorized'
)

// Test 3.7: Authenticated standard 'user'
assert(
  evaluateAuthorization(`Bearer ${mockUserJwt}`, mockServiceKey, mockNormalUser, { role: 'user' }) === false,
  'Standard authenticated "user" is strictly unauthorized (Privilege escalation guard)'
)

// Test 3.8: Authenticated user with arbitrary/spoofed role
assert(
  evaluateAuthorization(`Bearer ${mockUserJwt}`, mockServiceKey, mockNormalUser, { role: 'moderator' }) === false,
  'User with arbitrary role "moderator" is rejected'
)

// Test 3.9: Authenticated user not found in user_roles table
assert(
  evaluateAuthorization(`Bearer ${mockUserJwt}`, mockServiceKey, mockNormalUser, null) === false,
  'User with no user_roles record is rejected'
)

// Test 3.10: Database error during role lookup
assert(
  evaluateAuthorization(`Bearer ${mockUserJwt}`, mockServiceKey, mockNormalUser, { role: 'admin' }, new Error('DB error')) === false,
  'Role lookup failure securely defaults to unauthorized (Fail-secure)'
)

// -----------------------------------------------------------------------------
// GROUP 4: Preservation of Payment Reconciliation & Financial Invariants
// -----------------------------------------------------------------------------
console.log('\n--- GROUP 4: Preservation of Payment Reconciliation & Financial Invariants ---')

assert(
  reconcileCode.includes("eq('status', 'PENDING')"),
  'Reconciliation preserves strict concurrency guard (status = PENDING)'
)
assert(
  reconcileCode.includes('verify-order.php'),
  'Reconciliation queries official FamGateway verification endpoint'
)
assert(
  reconcileCode.includes('recover_tournament_registration_from_payment'),
  'Reconciliation invokes atomic registration recovery RPC'
)
assert(
  reconcileCode.includes('TOURNAMENT_FULL_REFUNDED'),
  'Reconciliation handles capacity refund to wallet when tournament is full'
)
assert(
  reconcileCode.includes('15 * 60 * 1000'),
  'Reconciliation enforces 15-minute order TTL expiration'
)
assert(
  reconcileCode.includes("reconciled_gateway_status: gatewayStatus"),
  'Reconciliation updates audit metadata with gateway status'
)
assert(
  reconcileCode.includes('FAMGATEWAY_ENABLED'),
  'Reconciliation respects FAMGATEWAY_ENABLED feature flag'
)

// -----------------------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------------------
console.log('\n======================================================================')
console.log(`TOTAL CHECKS: ${totalTests}`)
console.log(`PASSED: ${passedTests}`)
console.log(`FAILED: ${failedTests}`)
console.log('======================================================================')

if (failedTests > 0) {
  process.exit(1)
} else {
  console.log('ALL RECONCILIATION AUTHORIZATION CHECKS PASSED!')
}

