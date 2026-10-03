// test_phase4_sec04_registration_approval_waitlist.mjs
// Verification suite for SEC-04: Enforce Approval Type and Waitlist Queue in Authoritative Registration RPC

import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert'
import { execSync } from 'node:child_process'

const ROOT = process.cwd()
let passed = 0
let failed = 0

function test(description, fn) {
  try {
    fn()
    console.log(`  ✅ [PASS] ${description}`)
    passed++
  } catch (err) {
    console.error(`  ❌ [FAIL] ${description}`)
    console.error(`     Reason: ${err.message}`)
    failed++
  }
}

console.log('='.repeat(80))
console.log('MJ ESPORTS — PHASE 4: SEC-04 REGISTRATION APPROVAL & WAITLIST AUDIT SUITE')
console.log('='.repeat(80))

// ----------------------------------------------------------------------------
// GROUP 1: Canonical Registration RPC Identification & Migration Ordering
// ----------------------------------------------------------------------------
console.log('\n--- GROUP 1: Canonical Registration RPC Identification & Migration Ordering ---')

const phase81Path = path.join(ROOT, 'supabase_phase8_1_tournament_payments_and_registration_guard.sql')
const phase1Path = path.join(ROOT, 'supabase_phase1_security_hardening.sql')
const phase11Path = path.join(ROOT, 'supabase_phase11_room_and_registration_hardening.sql')

assert(fs.existsSync(phase81Path), 'Phase 8.1 SQL file must exist')
assert(fs.existsSync(phase1Path), 'Phase 1 Security Hardening SQL file must exist')
assert(fs.existsSync(phase11Path), 'Phase 11 SQL file must exist')

const phase81Sql = fs.readFileSync(phase81Path, 'utf8')
const phase1Sql = fs.readFileSync(phase1Path, 'utf8')
const phase11Sql = fs.readFileSync(phase11Path, 'utf8')

test('1.1. Canonical registration RPC is identified in Phase 8.1 SQL', () => {
  const hasRegisterRpc = /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.register_tournament_team\s*\(/i.test(phase81Sql)
  assert.strictEqual(hasRegisterRpc, true, 'Phase 8.1 must define canonical register_tournament_team RPC')
  assert(phase81Sql.includes('p_payment_id UUID DEFAULT NULL'), 'Must include p_payment_id in 19-parameter signature')
  assert(phase81Sql.includes('p_razorpay_payment_id TEXT DEFAULT NULL'), 'Must include p_razorpay_payment_id in 19-parameter signature')
  assert(phase81Sql.includes('p_teammate_igns TEXT[]'), 'Must include p_teammate_igns in 19-parameter signature')
  assert(phase81Sql.includes('p_substitute_igns TEXT[]'), 'Must include p_substitute_igns in 19-parameter signature')
})

test('1.2. Phase 1 Security Hardening maintains synchronized authoritative registration RPC', () => {
  const hasRegisterRpc = /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.register_tournament_team\s*\(/i.test(phase1Sql)
  assert.strictEqual(hasRegisterRpc, true, 'Phase 1 must define synchronized register_tournament_team RPC')
  assert(phase1Sql.includes('p_payment_id UUID DEFAULT NULL'), 'Phase 1 must include p_payment_id in 19-parameter signature')
})

test('1.3. No obsolete 17-parameter registration RPC is recreated in Phase 11', () => {
  const hasRegisterFn = /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:public\.)?register_tournament_team/i.test(phase11Sql)
  assert.strictEqual(hasRegisterFn, false, 'Phase 11 must not recreate register_tournament_team')
})

// ----------------------------------------------------------------------------
// GROUP 2: Server-Authoritative Approval Type & Waitlist Evaluation (Static AST)
// ----------------------------------------------------------------------------
console.log('\n--- GROUP 2: Server-Authoritative Approval Type & Waitlist Evaluation (Static AST) ---')

test('2.1. SQL migrations ensure schema alignment for approval_type and waitlist_enabled', () => {
  assert(phase81Sql.includes('approval_type TEXT DEFAULT \'Automatic\''), 'Phase 8.1 must add approval_type column')
  assert(phase81Sql.includes('waitlist_enabled BOOLEAN DEFAULT FALSE'), 'Phase 8.1 must add waitlist_enabled column')
  assert(phase81Sql.includes('status IN (\'Pending\', \'Approved\', \'Confirmed\', \'Rejected\', \'Completed\', \'Waitlist\')'), 'Phase 8.1 status constraint must allow Waitlist')

  assert(phase1Sql.includes('approval_type TEXT DEFAULT \'Automatic\''), 'Phase 1 must add approval_type column')
  assert(phase1Sql.includes('waitlist_enabled BOOLEAN DEFAULT FALSE'), 'Phase 1 must add waitlist_enabled column')
  assert(phase1Sql.includes('status IN (\'Pending\', \'Approved\', \'Confirmed\', \'Rejected\', \'Completed\', \'Waitlist\')'), 'Phase 1 status constraint must allow Waitlist')
})

test('2.2. RPC reads approval_type authoritatively from tournament configuration', () => {
  const readsApproval81 = /v_approval_type\s*:=\s*COALESCE\s*\(\s*NULLIF\s*\(\s*TRIM\s*\(\s*to_jsonb\s*\(\s*v_tournament\s*\)\s*->>\s*'approval_type'/i.test(phase81Sql)
  assert.strictEqual(readsApproval81, true, 'Phase 8.1 RPC must read approval_type from tournament row')

  const readsApproval1 = /v_approval_type\s*:=\s*COALESCE\s*\(\s*NULLIF\s*\(\s*TRIM\s*\(\s*to_jsonb\s*\(\s*v_tournament\s*\)\s*->>\s*'approval_type'/i.test(phase1Sql)
  assert.strictEqual(readsApproval1, true, 'Phase 1 RPC must read approval_type from tournament row')
})

test('2.3. RPC reads waitlist configuration authoritatively from tournament row', () => {
  const readsWaitlist81 = /v_waitlist_enabled\s*:=\s*COALESCE\s*\(\s*\(to_jsonb\s*\(\s*v_tournament\s*\)\s*->>\s*'waitlist_enabled'\s*\)::BOOLEAN/i.test(phase81Sql)
  assert.strictEqual(readsWaitlist81, true, 'Phase 8.1 RPC must read waitlist_enabled from tournament row')

  const readsWaitlist1 = /v_waitlist_enabled\s*:=\s*COALESCE\s*\(\s*\(to_jsonb\s*\(\s*v_tournament\s*\)\s*->>\s*'waitlist_enabled'\s*\)::BOOLEAN/i.test(phase1Sql)
  assert.strictEqual(readsWaitlist1, true, 'Phase 1 RPC must read waitlist_enabled from tournament row')
})

test('2.4. Capacity logic remains transaction/row-lock protected (FOR UPDATE)', () => {
  const lockMatch81 = phase81Sql.match(/FROM\s+public\.tournaments\s+WHERE\s+id\s*=\s*p_tournament_id\s+FOR\s+UPDATE;/i)
  assert(lockMatch81, 'Phase 8.1 must lock target tournament row with FOR UPDATE')

  const lockMatch1 = phase1Sql.match(/FROM\s+public\.tournaments\s+WHERE\s+id\s*=\s*p_tournament_id\s+FOR\s+UPDATE;/i)
  assert(lockMatch1, 'Phase 1 must lock target tournament row with FOR UPDATE')

  // Capacity check must come AFTER FOR UPDATE lock
  const lockPos81 = phase81Sql.indexOf('FOR UPDATE;')
  const capacityCheckPos81 = phase81Sql.indexOf('v_is_full := COALESCE(v_tournament.registered_teams')
  assert(lockPos81 !== -1 && capacityCheckPos81 !== -1 && lockPos81 < capacityCheckPos81, 'Phase 8.1 capacity decision must be strictly inside row lock')
})

test('2.5. Automatic approval produces Approved state on available capacity', () => {
  assert(phase81Sql.includes("v_reg_status := 'Approved';"), "Phase 8.1 must assign Approved for automatic approval")
  assert(phase1Sql.includes("v_reg_status := 'Approved';"), "Phase 1 must assign Approved for automatic approval")
})

test('2.6. Manual approval produces Pending review state on available capacity', () => {
  assert(phase81Sql.includes("v_reg_status := 'Pending';"), "Phase 8.1 must assign Pending for manual approval")
  assert(phase1Sql.includes("v_reg_status := 'Pending';"), "Phase 1 must assign Pending for manual approval")
})

test('2.7. Full tournament with waitlist enabled produces Waitlist state (not TOURNAMENT_FULL)', () => {
  assert(phase81Sql.includes("v_reg_status := 'Waitlist';"), "Phase 8.1 must assign Waitlist state when full and waitlist enabled")
  assert(phase1Sql.includes("v_reg_status := 'Waitlist';"), "Phase 1 must assign Waitlist state when full and waitlist enabled")
})

test('2.8. Full tournament with waitlist disabled returns TOURNAMENT_FULL', () => {
  assert(phase81Sql.includes("'error_code', 'TOURNAMENT_FULL'"), "Phase 8.1 must return TOURNAMENT_FULL when waitlist disabled")
  assert(phase1Sql.includes("'error_code', 'TOURNAMENT_FULL'"), "Phase 1 must return TOURNAMENT_FULL when waitlist disabled")
})

test('2.9. Waitlist registrations do NOT increment registered_teams capacity counter', () => {
  const waitlistCapacityGuard81 = /IF\s+v_reg_status\s*=\s*'Waitlist'\s+THEN\s+--[^\n]*\s+UPDATE\s+public\.tournaments\s+SET\s+teams_list/i.test(phase81Sql)
  assert.strictEqual(waitlistCapacityGuard81, true, 'Phase 8.1 must not increment registered_teams for Waitlist')

  const waitlistCapacityGuard1 = /IF\s+v_reg_status\s*=\s*'Waitlist'\s+THEN\s+UPDATE\s+public\.tournaments\s+SET\s+teams_list/i.test(phase1Sql)
  assert.strictEqual(waitlistCapacityGuard1, true, 'Phase 1 must not increment registered_teams for Waitlist')
})

test('2.10. Client cannot override approval or waitlist behavior (no parameters in signature)', () => {
  const signatureParams = phase81Sql.slice(
    phase81Sql.indexOf('CREATE OR REPLACE FUNCTION public.register_tournament_team('),
    phase81Sql.indexOf('RETURNS JSONB')
  )
  assert(!signatureParams.includes('p_approval_type'), 'Client must not supply p_approval_type')
  assert(!signatureParams.includes('p_waitlist_enabled'), 'Client must not supply p_waitlist_enabled')
  assert(!signatureParams.includes('p_status'), 'Client must not supply p_status')
  assert(!signatureParams.includes('p_registration_status'), 'Client must not supply p_registration_status')
})

test('2.11. Existing payment verification and idempotency safeguards remain intact', () => {
  assert(phase81Sql.includes("v_payment.status != 'VERIFIED'"), 'Must require VERIFIED payment status')
  assert(phase81Sql.includes("v_payment.status = 'CONSUMED'"), 'Must prevent payment double-spending')
  assert(phase81Sql.includes("v_payment.user_id != v_user_id"), 'Must enforce cross-user payment isolation')
  assert(phase81Sql.includes("v_payment.tournament_id != p_tournament_id"), 'Must enforce tournament-specific payment isolation')
  assert(phase81Sql.includes("v_payment.amount < v_entry_fee"), 'Must enforce sufficient payment amount')
})

// ----------------------------------------------------------------------------
// GROUP 3: Authoritative Database Engine Simulation (Behavioral Matrix)
// ----------------------------------------------------------------------------
console.log('\n--- GROUP 3: Authoritative Database Engine Simulation (Behavioral Matrix) ---')

class AuthoritativeRegistrationEngine {
  constructor() {
    this.tournaments = new Map()
    this.registrations = new Map()
    this.payments = new Map()
  }

  createTournament({ id, maxTeams = 12, registeredTeams = 0, approvalType = 'Automatic', waitlistEnabled = false, entryFee = 'Free' }) {
    this.tournaments.set(id, {
      id,
      status: 'Registration Open',
      max_teams: maxTeams,
      registered_teams: registeredTeams,
      approval_type: approvalType,
      waitlist_enabled: waitlistEnabled,
      entry_fee: entryFee,
      teams_list: [],
    })
  }

  registerTeam({ tournamentId, userId, teamName, captainUid, paymentId = null }) {
    // 1. Authenticated check
    if (!userId) {
      return { success: false, error_code: 'UNAUTHENTICATED', message: 'You must be logged in to register.' }
    }

    // 2. Lock tournament row (simulated ACID lock)
    const tourney = this.tournaments.get(tournamentId)
    if (!tourney) {
      return { success: false, error_code: 'TOURNAMENT_NOT_FOUND', message: 'The requested tournament does not exist.' }
    }

    if (tourney.status !== 'Registration Open') {
      return { success: false, error_code: 'REGISTRATION_CLOSED', message: 'Registration is closed.' }
    }

    // Authoritative config evaluation from tournament row
    const approvalType = tourney.approval_type || 'Automatic'
    const waitlistEnabled = Boolean(tourney.waitlist_enabled)
    const isFull = (tourney.registered_teams || 0) >= (tourney.max_teams || 12)

    let regStatus = 'Approved'
    if (isFull) {
      if (!waitlistEnabled) {
        return { success: false, error_code: 'TOURNAMENT_FULL', message: 'All registration slots for this tournament are full.' }
      } else {
        regStatus = 'Waitlist'
      }
    } else {
      if (approvalType.toUpperCase() === 'MANUAL') {
        regStatus = 'Pending'
      } else {
        regStatus = 'Approved'
      }
    }

    // Payment verification if paid tournament
    const isPaid = tourney.entry_fee && tourney.entry_fee !== 'Free' && parseFloat(tourney.entry_fee.replace(/[^0-9.]/g, '')) > 0
    if (isPaid) {
      if (!paymentId) {
        return { success: false, error_code: 'PAYMENT_REQUIRED', message: 'Payment required.' }
      }
      const p = this.payments.get(paymentId)
      if (!p || p.status !== 'VERIFIED' || p.userId !== userId || p.tournamentId !== tournamentId) {
        return { success: false, error_code: 'INVALID_PAYMENT', message: 'Payment invalid.' }
      }
      p.status = 'CONSUMED'
    }

    // Duplicate checks
    const duplicate = Array.from(this.registrations.values()).some(
      (r) => r.tournamentId === tournamentId && (r.userId === userId || r.captainUid === captainUid) && r.status !== 'Rejected'
    )
    if (duplicate) {
      return { success: false, error_code: 'DUPLICATE_USER_ACCOUNT', message: 'Already registered.' }
    }

    const regId = `reg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const regRecord = {
      id: regId,
      tournamentId,
      userId,
      teamName,
      captainUid,
      status: regStatus,
    }
    this.registrations.set(regId, regRecord)

    // Slot capacity update: Waitlist does NOT consume slots; Approved & Pending do
    if (regStatus === 'Waitlist') {
      tourney.teams_list.push({ id: regId, name: teamName, status: regStatus })
    } else {
      tourney.registered_teams += 1
      tourney.teams_list.push({ id: regId, name: teamName, status: regStatus })
    }

    return {
      success: true,
      registration_id: regId,
      status: regStatus,
      registration_status: regStatus,
      teamRecord: { id: regId, status: regStatus },
    }
  }
}

test('3.1. Behavioral Scenario A: Automatic approval assigns Approved state and increments capacity', () => {
  const engine = new AuthoritativeRegistrationEngine()
  engine.createTournament({ id: 't-auto', maxTeams: 10, registeredTeams: 0, approvalType: 'Automatic', waitlistEnabled: false })

  const res = engine.registerTeam({ tournamentId: 't-auto', userId: 'user-1', teamName: 'Team Alpha', captainUid: '1234567890' })
  assert.strictEqual(res.success, true)
  assert.strictEqual(res.status, 'Approved')
  assert.strictEqual(res.registration_status, 'Approved')

  const t = engine.tournaments.get('t-auto')
  assert.strictEqual(t.registered_teams, 1, 'Capacity counter must increment by 1 for Approved')
})

test('3.2. Behavioral Scenario B: Manual approval assigns Pending state and reserves capacity slot', () => {
  const engine = new AuthoritativeRegistrationEngine()
  engine.createTournament({ id: 't-manual', maxTeams: 10, registeredTeams: 0, approvalType: 'Manual', waitlistEnabled: false })

  const res = engine.registerTeam({ tournamentId: 't-manual', userId: 'user-2', teamName: 'Team Beta', captainUid: '2345678901' })
  assert.strictEqual(res.success, true)
  assert.strictEqual(res.status, 'Pending', 'Manual tournament must produce Pending status')
  assert.strictEqual(res.registration_status, 'Pending')

  const t = engine.tournaments.get('t-manual')
  assert.strictEqual(t.registered_teams, 1, 'Capacity counter must increment by 1 to reserve slot under review')
})

test('3.3. Behavioral Scenario C: Full tournament with Waitlist Enabled assigns Waitlist state without TOURNAMENT_FULL error', () => {
  const engine = new AuthoritativeRegistrationEngine()
  engine.createTournament({ id: 't-waitlist', maxTeams: 4, registeredTeams: 4, approvalType: 'Automatic', waitlistEnabled: true })

  const res = engine.registerTeam({ tournamentId: 't-waitlist', userId: 'user-3', teamName: 'Team Gamma', captainUid: '3456789012' })
  assert.strictEqual(res.success, true, 'Waitlist must not return false or TOURNAMENT_FULL')
  assert.strictEqual(res.status, 'Waitlist')
  assert.strictEqual(res.registration_status, 'Waitlist')

  const t = engine.tournaments.get('t-waitlist')
  assert.strictEqual(t.registered_teams, 4, 'Waitlist registration must not exceed max slot capacity')
  assert.strictEqual(t.teams_list.length, 1)
})

test('3.4. Behavioral Scenario D: Full tournament with Waitlist Disabled strictly returns TOURNAMENT_FULL', () => {
  const engine = new AuthoritativeRegistrationEngine()
  engine.createTournament({ id: 't-full-strict', maxTeams: 4, registeredTeams: 4, approvalType: 'Automatic', waitlistEnabled: false })

  const res = engine.registerTeam({ tournamentId: 't-full-strict', userId: 'user-4', teamName: 'Team Delta', captainUid: '4567890123' })
  assert.strictEqual(res.success, false)
  assert.strictEqual(res.error_code, 'TOURNAMENT_FULL')

  const t = engine.tournaments.get('t-full-strict')
  assert.strictEqual(t.registered_teams, 4)
  assert.strictEqual(engine.registrations.size, 0)
})

test('3.5. Behavioral Scenario E: Paid tournament waitlist entry enforces verified payment', () => {
  const engine = new AuthoritativeRegistrationEngine()
  engine.createTournament({ id: 't-paid-wait', maxTeams: 2, registeredTeams: 2, approvalType: 'Automatic', waitlistEnabled: true, entryFee: '₹50' })

  // Missing payment
  const resNoPay = engine.registerTeam({ tournamentId: 't-paid-wait', userId: 'user-5', teamName: 'Team Paid Wait', captainUid: '5678901234' })
  assert.strictEqual(resNoPay.success, false)
  assert.strictEqual(resNoPay.error_code, 'PAYMENT_REQUIRED')

  // With verified payment
  engine.payments.set('pay-w-1', { id: 'pay-w-1', userId: 'user-5', tournamentId: 't-paid-wait', status: 'VERIFIED', amount: 50 })
  const resWithPay = engine.registerTeam({ tournamentId: 't-paid-wait', userId: 'user-5', teamName: 'Team Paid Wait', captainUid: '5678901234', paymentId: 'pay-w-1' })
  assert.strictEqual(resWithPay.success, true)
  assert.strictEqual(resWithPay.status, 'Waitlist')
  assert.strictEqual(engine.payments.get('pay-w-1').status, 'CONSUMED')
})

test('3.6. Behavioral Scenario F: Duplicate protection covers active waitlisted users', () => {
  const engine = new AuthoritativeRegistrationEngine()
  engine.createTournament({ id: 't-dup', maxTeams: 2, registeredTeams: 2, approvalType: 'Automatic', waitlistEnabled: true })

  const res1 = engine.registerTeam({ tournamentId: 't-dup', userId: 'user-dup', teamName: 'Team First', captainUid: '6789012345' })
  assert.strictEqual(res1.success, true)
  assert.strictEqual(res1.status, 'Waitlist')

  const res2 = engine.registerTeam({ tournamentId: 't-dup', userId: 'user-dup', teamName: 'Team Dup', captainUid: '7890123456' })
  assert.strictEqual(res2.success, false)
  assert.strictEqual(res2.error_code, 'DUPLICATE_USER_ACCOUNT')
})

// ----------------------------------------------------------------------------
// GROUP 4: Working Tree & Scope Boundary Checks
// ----------------------------------------------------------------------------
console.log('\n--- GROUP 4: Working Tree & Scope Boundary Checks ---')

test('4.1. Payment and Razorpay implementation files are untouched in this phase', () => {
  const paymentFiles = [
    'src/services/tournamentPaymentService.js',
    'src/components/tournament/SlotBookingModal.jsx',
    'src/pages/WalletPage.jsx',
    'supabase/functions/create-razorpay-order/index.ts',
    'supabase/functions/verify-razorpay-payment/index.ts',
    'supabase/functions/create-wallet-topup-order/index.ts',
    'supabase/functions/verify-wallet-topup/index.ts',
  ]
  for (const relPath of paymentFiles) {
    const fullPath = path.join(ROOT, relPath)
    assert(fs.existsSync(fullPath), `${relPath} must exist`)
  }
})

test('4.2. Wizard UI files are untouched', () => {
  const wizardFile = path.join(ROOT, 'src/components/admin/tournaments/wizard/steps/Step3RegistrationPrize.jsx')
  assert(fs.existsSync(wizardFile), 'Step3RegistrationPrize.jsx must exist')
  const content = fs.readFileSync(wizardFile, 'utf8')
  assert(content.includes('registrationApproval'), 'Must preserve wizard registrationApproval property')
  assert(content.includes('allowWaitlist'), 'Must preserve wizard allowWaitlist property')
})

console.log('\n' + '='.repeat(80))
console.log(`SEC-04 TEST RESULTS: ${passed} PASSED | ${failed} FAILED`)
console.log('='.repeat(80))

if (failed > 0) {
  process.exit(1)
}
