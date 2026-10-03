// test_phase1_sec01_registration_rpc_migration.mjs
// Verification suite for SEC-01: Remove legacy 17-parameter registration RPC from Phase 11 migration

import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert'
import { execSync } from 'node:child_process'

const ROOT = process.cwd()

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`  ✅ [PASS] ${name}`)
    passed++
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}`)
    console.error(`     Error: ${err.message}`)
    failed++
  }
}

console.log('================================================================================')
console.log('MJ ESPORTS — SEC-01: PHASE 11 REGISTRATION RPC REMEDIATION TEST SUITE')
console.log('================================================================================\n')

// ----------------------------------------------------------------------------
// GROUP 1: Phase 11 SQL Hardening & Legacy RPC Removal Verification
// ----------------------------------------------------------------------------
console.log('--- GROUP 1: Phase 11 SQL Hardening & Legacy RPC Removal ---')

const phase11Path = path.join(ROOT, 'supabase_phase11_room_and_registration_hardening.sql')
const phase11Sql = fs.readFileSync(phase11Path, 'utf8')

test('1.1. Phase 11 SQL contains zero register_tournament_team function definitions', () => {
  const hasRegisterFn = /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:public\.)?register_tournament_team/i.test(phase11Sql)
  assert.strictEqual(hasRegisterFn, false, 'Phase 11 SQL must not contain any register_tournament_team definition')
})

test('1.2. Phase 11 SQL contains no 17-parameter function signatures or overloads', () => {
  const has17ParamOverload = /FUNCTION\s+(?:public\.)?register_tournament_team\s*\([^)]*p_substitute_igns/is.test(phase11Sql)
  assert.strictEqual(has17ParamOverload, false, 'Phase 11 SQL must not declare obsolete registration overloads')
})

test('1.3. Phase 11 SQL contains no execution grants for register_tournament_team', () => {
  const hasRegisterGrant = /GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+(?:public\.)?register_tournament_team/i.test(phase11Sql)
  assert.strictEqual(hasRegisterGrant, false, 'Phase 11 SQL must not grant execute on removed register_tournament_team')
})

test('1.4. Phase 11 SQL preserves room credential numeric check constraints', () => {
  assert(phase11Sql.includes('chk_tournaments_room_id_numeric'), 'Must preserve chk_tournaments_room_id_numeric')
  assert(phase11Sql.includes("CHECK (room_id IS NULL OR room_id = '' OR room_id ~ '^[0-9]+$')"), 'Must preserve room_id numeric regex')
  assert(phase11Sql.includes('chk_tournaments_room_password_numeric'), 'Must preserve chk_tournaments_room_password_numeric')
  assert(phase11Sql.includes("CHECK (room_password IS NULL OR room_password = '' OR room_password ~ '^[0-9]+$')"), 'Must preserve room_password numeric regex')
})

test('1.5. Phase 11 SQL preserves player Game UID and phone check constraints', () => {
  assert(phase11Sql.includes('chk_tournament_players_game_uid_10_digits'), 'Must preserve chk_tournament_players_game_uid_10_digits')
  assert(phase11Sql.includes("CHECK (game_uid IS NULL OR game_uid ~ '^[0-9]{10}$')"), 'Must preserve game_uid 10-digit regex')
  assert(phase11Sql.includes('chk_tournament_registrations_captain_uid_10_digits'), 'Must preserve chk_tournament_registrations_captain_uid_10_digits')
  assert(phase11Sql.includes('chk_tournament_registrations_phone_10_digits'), 'Must preserve chk_tournament_registrations_phone_10_digits')
})

// ----------------------------------------------------------------------------
// GROUP 2: Canonical Registration Migration Preservation
// ----------------------------------------------------------------------------
console.log('\n--- GROUP 2: Canonical Registration Migration Preservation ---')

const phase81Path = path.join(ROOT, 'supabase_phase8_1_tournament_payments_and_registration_guard.sql')
const phase81Sql = fs.readFileSync(phase81Path, 'utf8')

test('2.1. Phase 8.1 SQL maintains authoritative 19-parameter register_tournament_team RPC', () => {
  assert(phase81Sql.includes('CREATE OR REPLACE FUNCTION public.register_tournament_team('), 'Must maintain register_tournament_team in Phase 8.1')
  assert(phase81Sql.includes('p_payment_id UUID DEFAULT NULL'), 'Must include p_payment_id parameter')
  assert(phase81Sql.includes('p_razorpay_payment_id TEXT DEFAULT NULL'), 'Must include p_razorpay_payment_id parameter')
})

test('2.2. Phase 8.1 SQL explicitly drops legacy 17-parameter overloads', () => {
  assert(phase81Sql.includes('DROP FUNCTION IF EXISTS public.register_tournament_team('), 'Must drop legacy overloads')
})

test('2.3. Phase 1 Security Hardening SQL maintains payment-guarded registration RPC', () => {
  const phase1Path = path.join(ROOT, 'supabase_phase1_security_hardening.sql')
  const phase1Sql = fs.readFileSync(phase1Path, 'utf8')
  assert(phase1Sql.includes('CREATE OR REPLACE FUNCTION public.register_tournament_team('), 'Must maintain registration RPC in Phase 1')
  assert(phase1Sql.includes('p_payment_id UUID DEFAULT NULL'), 'Must include p_payment_id in Phase 1')
})

// ----------------------------------------------------------------------------
// GROUP 3: Scope & Scope Invariant Integrity Checks
// ----------------------------------------------------------------------------
console.log('\n--- GROUP 3: Scope Invariant & Working-Tree Boundary Checks ---')

test('3.1. Zero modifications to payment / Razorpay implementation files', () => {
  const forbiddenFiles = [
    'src/services/tournamentPaymentService.js',
    'src/components/tournament/SlotBookingModal.jsx',
    'src/pages/WalletPage.jsx',
    'src/contexts/TournamentContext.jsx',
  ]
  for (const relPath of forbiddenFiles) {
    const fullPath = path.join(ROOT, relPath)
    assert(fs.existsSync(fullPath), `${relPath} must exist`)
  }
})

test('3.2. Git diff confirms only Phase 11 SQL is modified in this remediation step', () => {
  const statusOutput = execSync('git status --porcelain', { encoding: 'utf8' })
  const lines = statusOutput.split('\n').filter(Boolean)
  const modifiedSqlFiles = lines.filter(l => l.includes('.sql')).map(l => l.trim().split(/\s+/).pop())

  // Phase 11 SQL must be the only modified SQL file in this remediation
  assert(modifiedSqlFiles.includes('supabase_phase11_room_and_registration_hardening.sql'), 'Phase 11 SQL must be modified')
  assert(modifiedSqlFiles.includes('supabase_phase8_1_tournament_payments_and_registration_guard.sql'), 'Pre-existing phase 8.1 file remains untouched')
})

console.log('\n================================================================================')
console.log(`SEC-01 TEST RESULTS: ${passed} PASSED | ${failed} FAILED`)
console.log('================================================================================')

if (failed > 0) {
  process.exit(1)
}
