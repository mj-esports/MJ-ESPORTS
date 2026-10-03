// test_phase3_sec03_room_credentials_audit.mjs
// Verification suite for SEC-03: Route Room Credential Updates Through the Audited RPC

import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert'

const ROOT = process.cwd()
let passCount = 0
let failCount = 0

function test(name, fn) {
  try {
    fn()
    console.log(`  ✅ [PASS] ${name}`)
    passCount++
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}`)
    console.error(`     Error: ${err.message}`)
    failCount++
  }
}

console.log('='.repeat(80))
console.log('MJ ESPORTS — PHASE 3: SEC-03 ROOM CREDENTIALS AUDITED RPC SUITE')
console.log('='.repeat(80))

const tournamentContextPath = path.join(ROOT, 'src', 'contexts', 'TournamentContext.jsx')
const phase5SqlPath = path.join(ROOT, 'supabase_phase5_tournament_operations_security.sql')

assert(fs.existsSync(tournamentContextPath), 'TournamentContext.jsx must exist')
assert(fs.existsSync(phase5SqlPath), 'supabase_phase5_tournament_operations_security.sql must exist')

const tournamentContextContent = fs.readFileSync(tournamentContextPath, 'utf8')
const phase5Sql = fs.readFileSync(phase5SqlPath, 'utf8')

// Extract the updateRoomDetails function body for precise analysis
const startIdx = tournamentContextContent.indexOf('const updateRoomDetails')
const endIdx = tournamentContextContent.indexOf('const getRoomCredentials')
assert(startIdx !== -1 && endIdx !== -1 && startIdx < endIdx, 'Could not locate updateRoomDetails definition')
const updateRoomDetailsBody = tournamentContextContent.slice(startIdx, endIdx)

// ----------------------------------------------------------------------------
// GROUP 1: Client-Side Routing Through RPC
// ----------------------------------------------------------------------------
console.log('\n--- GROUP 1: Client-Side Routing Through Audited RPC ---')

test('1. updateRoomDetails exists and is exported in TournamentContext', () => {
  assert(tournamentContextContent.includes('const updateRoomDetails = async'), 'Must define updateRoomDetails')
  assert(tournamentContextContent.includes('updateRoomDetails,'), 'Must export updateRoomDetails in context value')
})

test('2. updateRoomDetails invokes set_tournament_room_credentials RPC', () => {
  assert(
    updateRoomDetailsBody.includes("supabase.rpc('set_tournament_room_credentials'"),
    'updateRoomDetails must call supabase.rpc with set_tournament_room_credentials'
  )
  assert(updateRoomDetailsBody.includes('p_tournament_id'), 'Payload must include p_tournament_id')
  assert(updateRoomDetailsBody.includes('p_room_id'), 'Payload must include p_room_id')
  assert(updateRoomDetailsBody.includes('p_room_password'), 'Payload must include p_room_password')
  assert(updateRoomDetailsBody.includes('p_room_status'), 'Payload must include p_room_status')
  assert(updateRoomDetailsBody.includes('p_room_release_time'), 'Payload must include p_room_release_time')
})

test('3. updateRoomDetails no longer directly calls updateTournament for room credentials', () => {
  assert(
    !updateRoomDetailsBody.includes('updateTournament('),
    'updateRoomDetails must NOT call updateTournament for room credential mutations'
  )
  assert(
    !updateRoomDetailsBody.includes(".from('tournaments').update("),
    'updateRoomDetails must NOT perform direct database updates on tournaments'
  )
})

// ----------------------------------------------------------------------------
// GROUP 2: Server-Side RPC Definition & Security Definer
// ----------------------------------------------------------------------------
console.log('\n--- GROUP 2: Server-Side RPC Security & Definitive Contract ---')

test('4. set_tournament_room_credentials exists in Phase 5 migration SQL', () => {
  assert(
    phase5Sql.includes('CREATE OR REPLACE FUNCTION public.set_tournament_room_credentials'),
    'Phase 5 SQL must declare set_tournament_room_credentials function'
  )
})

test('5. RPC remains SECURITY DEFINER with fixed search_path', () => {
  assert(phase5Sql.includes('SECURITY DEFINER'), 'RPC must be declared SECURITY DEFINER')
  assert(
    phase5Sql.includes('SET search_path = public, pg_temp') ||
    phase5Sql.includes('SET search_path = public'),
    'RPC must secure search_path against hijacking'
  )
})

test('6. RPC has authoritative server-side authorization checks', () => {
  assert(
    phase5Sql.includes('public.is_admin()'),
    'RPC must enforce admin check using public.is_admin()'
  )
  assert(
    phase5Sql.includes("'service_role'"),
    'RPC must allow service_role authorization'
  )
  assert(
    phase5Sql.includes("'UNAUTHORIZED'"),
    'RPC must return UNAUTHORIZED for non-admin callers'
  )
})

test('7. RPC writes match_operations_audit_log without plaintext password', () => {
  assert(
    phase5Sql.includes("INSERT INTO public.match_operations_audit_log"),
    'RPC must record audit log in public.match_operations_audit_log'
  )
  assert(
    phase5Sql.includes("'ROOM_CREDENTIALS_SET'"),
    'RPC must log ROOM_CREDENTIALS_SET action'
  )
  assert(
    phase5Sql.includes("'room_id_set'"),
    'RPC must log room_id_set boolean flag'
  )
  assert(
    !phase5Sql.includes("'room_password', v_clean_password") &&
    !phase5Sql.includes("'room_password', p_room_password"),
    'RPC must NEVER log plaintext password to audit log'
  )
})

// ----------------------------------------------------------------------------
// GROUP 3: Validation, Scope & Credential Isolation
// ----------------------------------------------------------------------------
console.log('\n--- GROUP 3: Data Validation & Credential Safety ---')

test('8. Room ID/password numeric validation is enforced client and server side', () => {
  // Client pre-flight validation
  assert(updateRoomDetailsBody.includes('isValidRoomId'), 'Client must validate room ID')
  assert(updateRoomDetailsBody.includes('isValidRoomPassword'), 'Client must validate room password')
  assert(updateRoomDetailsBody.includes('sanitizeDigitsOnly'), 'Client must sanitize digits')

  // Server-side regex validation
  assert(phase5Sql.includes("v_clean_room_id !~ '^[0-9]+$'"), 'Server RPC must enforce numeric room ID')
  assert(phase5Sql.includes("v_clean_password !~ '^[0-9]+$'"), 'Server RPC must enforce numeric room password')
})

test('9. No service-role secret is introduced into frontend code', () => {
  const scanDirs = ['src', 'public']
  for (const dir of scanDirs) {
    const fullDir = path.join(ROOT, dir)
    if (!fs.existsSync(fullDir)) continue

    function scan(d) {
      const entries = fs.readdirSync(d, { withFileTypes: true })
      for (const ent of entries) {
        const fullPath = path.join(d, ent.name)
        if (ent.isDirectory()) {
          scan(fullPath)
        } else if (/\.(js|jsx|ts|tsx|json|html)$/.test(ent.name)) {
          const content = fs.readFileSync(fullPath, 'utf8')
          assert(
            !content.includes('SUPABASE_SERVICE_ROLE_KEY'),
            `Found SUPABASE_SERVICE_ROLE_KEY in frontend file: ${fullPath}`
          )
        }
      }
    }
    scan(fullDir)
  }
})

test('10. Payment/Razorpay files remain completely untouched', () => {
  const paymentFiles = [
    'src/services/tournamentPaymentService.js',
    'supabase/functions/create-razorpay-order/index.ts',
    'supabase/functions/verify-razorpay-payment/index.ts',
    'supabase/functions/create-wallet-topup-order/index.ts',
    'supabase/functions/verify-wallet-topup/index.ts',
  ]

  for (const relPath of paymentFiles) {
    const fullPath = path.join(ROOT, relPath)
    assert(fs.existsSync(fullPath), `${relPath} must exist`)
    const content = fs.readFileSync(fullPath, 'utf8')
    assert(!content.includes('set_tournament_room_credentials'), `${relPath} must not be modified by room credentials work`)
  }
})

console.log('='.repeat(80))
console.log(`SEC-03 TEST RESULTS: ${passCount} PASSED | ${failCount} FAILED`)
console.log('='.repeat(80))

if (failCount > 0) {
  process.exit(1)
}
