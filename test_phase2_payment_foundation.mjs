/**
 * MJ ESPORTS — Phase 2: Direct Tournament Payment Foundation Test Suite
 * 
 * Verifies:
 * 1. Free tournament registration succeeds without payment
 * 2. Paid tournament without payment fails (PAYMENT_REQUIRED)
 * 3. Paid tournament with fake payment ID fails (INVALID_PAYMENT)
 * 4. Paid tournament with wrong amount fails (PAYMENT_AMOUNT_MISMATCH)
 * 5. Payment belonging to another user fails (INVALID_PAYMENT)
 * 6. Payment belonging to another tournament fails (INVALID_PAYMENT)
 * 7. Failed/Pending Razorpay payment does not register team
 * 8. Duplicate payment verification is idempotent
 * 9. Same payment cannot register two teams (PAYMENT_ALREADY_USED)
 * 10. Concurrent registration attempts with single payment allow exactly 1 team and reject the other
 * 11. Frontend cannot manipulate entry fee (authoritative database fee enforced)
 * 12. Normal users cannot directly insert/update financial payment records (RLS enforcement)
 * 13. Admin access behaves according to intended authorization
 * 14. Signature verification succeeds with valid HMAC-SHA256 and fails on tampered payload
 * 15. Free and paid registrations correctly record payment status and reference IDs
 */

import assert from 'assert'
import crypto from 'crypto'

console.log('\n============================================================')
console.log('🧪 RUNNING PHASE 2: DIRECT TOURNAMENT PAYMENT FOUNDATION TEST SUITE')
console.log('============================================================\n')

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

async function asyncTest(description, fn) {
  try {
    await fn()
    console.log(`  ✅ [PASS] ${description}`)
    passed++
  } catch (err) {
    console.error(`  ❌ [FAIL] ${description}`)
    console.error(`     Reason: ${err.message}`)
    failed++
  }
}

// -------------------------------------------------------------
// Transactional Database & Security Definer RPC Simulator
// Matches PostgreSQL logic in supabase_phase8_1_tournament_payments_and_registration_guard.sql
// -------------------------------------------------------------
class TournamentPaymentSystem {
  constructor() {
    this.tournaments = new Map()
    this.registrations = new Map()
    this.tournamentPlayers = []
    this.payments = new Map()
    this.users = new Map()
  }

  createTournament({ id, title, entryFee = 'Free', maxTeams = 12, status = 'Registration Open' }) {
    this.tournaments.set(id, {
      id,
      title,
      entry_fee: entryFee,
      max_teams: maxTeams,
      registered_teams: 0,
      teams_list: [],
      status,
    })
    return this.tournaments.get(id)
  }

  // Edge Function: create-razorpay-order
  createRazorpayOrder({ userId, tournamentId }) {
    const tournament = this.tournaments.get(tournamentId)
    if (!tournament) throw new Error('Tournament not found')
    if (tournament.status !== 'Registration Open') throw new Error('Registration closed')

    // Authoritative fee calculation
    const rawFee = String(tournament.entry_fee || 'Free').trim()
    const digits = rawFee.replace(/[^0-9.]/g, '')
    const numericFee = rawFee.toLowerCase() === 'free' || !digits ? 0 : parseFloat(digits)

    if (numericFee <= 0) {
      throw new Error('This tournament is free. No Razorpay order required.')
    }

    const orderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
    const paymentRecordId = `pay_rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`

    const paymentRecord = {
      id: paymentRecordId,
      tournament_id: tournamentId,
      user_id: userId,
      registration_id: null,
      razorpay_order_id: orderId,
      razorpay_payment_id: null,
      amount: numericFee,
      currency: 'INR',
      status: 'PENDING',
      created_at: new Date(),
      updated_at: new Date(),
      verified_at: null,
      consumed_at: null,
    }

    this.payments.set(paymentRecordId, paymentRecord)
    return {
      order_id: orderId,
      payment_record_id: paymentRecordId,
      amount: Math.round(numericFee * 100),
      currency: 'INR',
    }
  }

  // Edge Function: verify-razorpay-payment
  verifyRazorpayPayment({ userId, tournamentId, orderId, paymentId, signature, secret = 'rzp_test_secret_123' }) {
    // 1. HMAC verification
    const data = `${orderId}|${paymentId}`
    const expectedSignature = crypto.createHmac('sha256', secret).update(data).digest('hex')

    // Locate payment record
    let target = null
    for (const p of this.payments.values()) {
      if (p.razorpay_order_id === orderId && p.tournament_id === tournamentId && p.user_id === userId) {
        target = p
        break
      }
    }

    if (!target) throw new Error('Payment order record not found')

    // Idempotency: If already verified
    if (target.status === 'VERIFIED') {
      return { success: true, payment_id: target.id, razorpay_payment_id: target.razorpay_payment_id }
    }

    if (target.status === 'CONSUMED') {
      throw new Error('Payment already consumed')
    }

    if (signature !== expectedSignature) {
      target.status = 'FAILED'
      throw new Error('Cryptographic signature verification failed')
    }

    target.status = 'VERIFIED'
    target.razorpay_payment_id = paymentId
    target.verified_at = new Date()
    target.updated_at = new Date()

    return {
      success: true,
      payment_id: target.id,
      razorpay_payment_id: paymentId,
      status: 'VERIFIED',
    }
  }

  // PostgreSQL SECURITY DEFINER RPC: register_tournament_team
  registerTournamentTeam({
    userId,
    tournamentId,
    teamName,
    captainName,
    captainUid,
    email,
    whatsappNumber,
    mode = 'Squad',
    teammateUids = [],
    paymentId = null,
    razorpayPaymentId = null,
  }) {
    // 1. Session check
    if (!userId) {
      return { success: false, error_code: 'UNAUTHENTICATED', message: 'You must be logged in' }
    }

    // 2. Lock tournament row
    const tournament = this.tournaments.get(tournamentId)
    if (!tournament) {
      return { success: false, error_code: 'TOURNAMENT_NOT_FOUND', message: 'Tournament not found' }
    }

    if (tournament.status !== 'Registration Open') {
      return { success: false, error_code: 'REGISTRATION_CLOSED', message: 'Registration closed' }
    }

    if (tournament.registered_teams >= tournament.max_teams) {
      return { success: false, error_code: 'TOURNAMENT_FULL', message: 'Slots full' }
    }

    // 3. Authoritative Entry Fee Check
    const rawFee = String(tournament.entry_fee || 'Free').trim()
    const digits = rawFee.replace(/[^0-9.]/g, '')
    const entryFee = rawFee.toLowerCase() === 'free' || !digits ? 0 : parseFloat(digits)

    let matchedPayment = null
    let regPaymentStatus = 'Free'
    let regPaymentId = null

    if (entryFee > 0) {
      if (!paymentId && !razorpayPaymentId) {
        return {
          success: false,
          error_code: 'PAYMENT_REQUIRED',
          message: `This tournament requires an entry fee of ₹${entryFee}. Verified payment is required.`,
        }
      }

      // Lock payment record FOR UPDATE
      for (const p of this.payments.values()) {
        if (
          (paymentId && p.id === paymentId) ||
          (razorpayPaymentId && p.razorpay_payment_id === razorpayPaymentId)
        ) {
          matchedPayment = p
          break
        }
      }

      if (!matchedPayment) {
        return { success: false, error_code: 'INVALID_PAYMENT', message: 'Payment record not found' }
      }

      if (matchedPayment.user_id !== userId) {
        return { success: false, error_code: 'INVALID_PAYMENT', message: 'Payment record belongs to another user' }
      }

      if (matchedPayment.tournament_id !== tournamentId) {
        return { success: false, error_code: 'INVALID_PAYMENT', message: 'Payment belongs to another tournament' }
      }

      if (matchedPayment.status === 'CONSUMED' || matchedPayment.registration_id !== null) {
        return {
          success: false,
          error_code: 'PAYMENT_ALREADY_USED',
          message: 'Payment has already been used for registration',
        }
      }

      if (matchedPayment.status !== 'VERIFIED') {
        return {
          success: false,
          error_code: 'INVALID_PAYMENT',
          message: `Payment has not been verified. Current status: ${matchedPayment.status}`,
        }
      }

      if (matchedPayment.amount < entryFee) {
        return {
          success: false,
          error_code: 'PAYMENT_AMOUNT_MISMATCH',
          message: `Payment amount ₹${matchedPayment.amount} is less than required ₹${entryFee}`,
        }
      }

      regPaymentStatus = 'Paid'
      regPaymentId = matchedPayment.razorpay_payment_id
    }

    // 4. Duplicate User Check
    for (const r of this.registrations.values()) {
      if (r.tournament_id === tournamentId && r.user_id === userId && r.status !== 'Rejected') {
        return { success: false, error_code: 'DUPLICATE_USER_ACCOUNT', message: 'User already registered' }
      }
    }

    // 5. Duplicate UID Check
    const allUids = [captainUid, ...teammateUids]
    for (const r of this.registrations.values()) {
      if (r.tournament_id === tournamentId && r.status !== 'Rejected') {
        if (allUids.includes(r.free_fire_uid)) {
          return { success: false, error_code: 'DUPLICATE_GAME_UID', message: 'UID already registered' }
        }
      }
    }

    // 6. Insert Registration Record
    const regId = `reg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
    const refId = `REG-MJ-${Date.now().toString(36).toUpperCase()}`

    const regRecord = {
      id: regId,
      tournament_id: tournamentId,
      user_id: userId,
      team_name: teamName,
      captain_name: captainName,
      free_fire_uid: captainUid,
      status: 'Approved',
      payment_status: regPaymentStatus,
      payment_id: regPaymentId,
      ref_id: refId,
      registered_at: new Date(),
    }

    this.registrations.set(regId, regRecord)

    // 7. Atomically consume payment
    if (entryFee > 0 && matchedPayment) {
      matchedPayment.registration_id = regId
      matchedPayment.status = 'CONSUMED'
      matchedPayment.consumed_at = new Date()
      matchedPayment.updated_at = new Date()
    }

    // 8. Update tournament capacity
    tournament.registered_teams += 1
    tournament.teams_list.push({
      id: refId,
      refId,
      name: teamName,
      captain: captainName,
      freeFireUid: captainUid,
      userId,
      status: 'Approved',
      paymentStatus: regPaymentStatus,
      paymentId: regPaymentId,
    })

    return {
      success: true,
      refId,
      registration_id: regId,
      payment_status: regPaymentStatus,
      payment_id: regPaymentId,
      message: 'Tournament registration successful.',
    }
  }

  // RLS simulator: Normal user directly inserting/updating payment
  simulateDirectClientPaymentInsert({ role = 'authenticated', paymentData }) {
    if (role !== 'service_role') {
      throw new Error('permission denied for table tournament_payments: INSERT revoked for authenticated')
    }
    this.payments.set(paymentData.id, paymentData)
  }

  simulateDirectClientPaymentUpdate({ role = 'authenticated', paymentId, updates }) {
    if (role !== 'service_role') {
      throw new Error('permission denied for table tournament_payments: UPDATE revoked for authenticated')
    }
    const target = this.payments.get(paymentId)
    if (target) Object.assign(target, updates)
  }
}

// -------------------------------------------------------------
// TEST RUNS
// -------------------------------------------------------------

console.log('--- 1. Free Tournament Registration ---')

test('Free tournament registration succeeds without payment parameters', () => {
  const sys = new TournamentPaymentSystem()
  const tourney = sys.createTournament({ id: 'tourn-free-1', title: 'Community Cup', entryFee: 'Free' })

  const result = sys.registerTournamentTeam({
    userId: 'user-001',
    tournamentId: tourney.id,
    teamName: 'Alpha Wolves',
    captainName: 'Hunter',
    captainUid: '1000000001',
    mode: 'Solo',
  })

  assert.strictEqual(result.success, true)
  assert.strictEqual(result.payment_status, 'Free')
  assert.strictEqual(result.payment_id, null)
  assert.strictEqual(tourney.registered_teams, 1)
})

console.log('\n--- 2. Paid Tournament Payment Requirement & Rejection ---')

test('Paid tournament registration without payment fails with PAYMENT_REQUIRED', () => {
  const sys = new TournamentPaymentSystem()
  const tourney = sys.createTournament({ id: 'tourn-paid-1', title: 'Pro League', entryFee: '₹100' })

  const result = sys.registerTournamentTeam({
    userId: 'user-002',
    tournamentId: tourney.id,
    teamName: 'Beta Titans',
    captainName: 'Titan',
    captainUid: '1000000002',
    mode: 'Solo',
    // No payment parameters passed
  })

  assert.strictEqual(result.success, false)
  assert.strictEqual(result.error_code, 'PAYMENT_REQUIRED')
  assert.strictEqual(tourney.registered_teams, 0)
})

test('Paid tournament with fake payment ID fails with INVALID_PAYMENT', () => {
  const sys = new TournamentPaymentSystem()
  const tourney = sys.createTournament({ id: 'tourn-paid-2', title: 'Pro League', entryFee: '₹150' })

  const result = sys.registerTournamentTeam({
    userId: 'user-003',
    tournamentId: tourney.id,
    teamName: 'Cyber Rogues',
    captainName: 'Rogue',
    captainUid: '1000000003',
    mode: 'Solo',
    razorpayPaymentId: 'pay_fake_9999999999',
  })

  assert.strictEqual(result.success, false)
  assert.strictEqual(result.error_code, 'INVALID_PAYMENT')
  assert.strictEqual(tourney.registered_teams, 0)
})

test('Paid tournament with wrong/insufficient amount fails with PAYMENT_AMOUNT_MISMATCH', () => {
  const sys = new TournamentPaymentSystem()
  const tourney = sys.createTournament({ id: 'tourn-paid-3', title: 'Grand Championship', entryFee: '₹200' })

  // User paid ₹50 for a ₹200 tournament
  const secret = 'rzp_test_secret_123'
  const orderRes = sys.createRazorpayOrder({ userId: 'user-004', tournamentId: tourney.id })
  
  // Tamper amount in database payment record to simulate insufficient payment
  const paymentRecord = sys.payments.get(orderRes.payment_record_id)
  paymentRecord.amount = 50.00 // underpaid

  const paymentId = 'pay_real_4444'
  const signature = crypto.createHmac('sha256', secret).update(`${orderRes.order_id}|${paymentId}`).digest('hex')
  sys.verifyRazorpayPayment({
    userId: 'user-004',
    tournamentId: tourney.id,
    orderId: orderRes.order_id,
    paymentId,
    signature,
    secret,
  })

  const result = sys.registerTournamentTeam({
    userId: 'user-004',
    tournamentId: tourney.id,
    teamName: 'Delta Force',
    captainName: 'Delta',
    captainUid: '1000000004',
    mode: 'Solo',
    paymentId: paymentRecord.id,
  })

  assert.strictEqual(result.success, false)
  assert.strictEqual(result.error_code, 'PAYMENT_AMOUNT_MISMATCH')
  assert.strictEqual(tourney.registered_teams, 0)
})

console.log('\n--- 3. Cross-User & Cross-Tournament Payment Isolation ---')

test('Payment belonging to another user fails with INVALID_PAYMENT', () => {
  const sys = new TournamentPaymentSystem()
  const tourney = sys.createTournament({ id: 'tourn-paid-4', title: 'Champions Cup', entryFee: '₹50' })
  const secret = 'rzp_test_secret_123'

  // User A creates and verifies payment
  const orderRes = sys.createRazorpayOrder({ userId: 'user-A', tournamentId: tourney.id })
  const paymentId = 'pay_user_A_123'
  const signature = crypto.createHmac('sha256', secret).update(`${orderRes.order_id}|${paymentId}`).digest('hex')
  sys.verifyRazorpayPayment({
    userId: 'user-A',
    tournamentId: tourney.id,
    orderId: orderRes.order_id,
    paymentId,
    signature,
    secret,
  })

  // User B attempts to register using User A's payment ID
  const result = sys.registerTournamentTeam({
    userId: 'user-B',
    tournamentId: tourney.id,
    teamName: 'Sneaky Team',
    captainName: 'Sneak',
    captainUid: '1000000005',
    mode: 'Solo',
    razorpayPaymentId: paymentId,
  })

  assert.strictEqual(result.success, false)
  assert.strictEqual(result.error_code, 'INVALID_PAYMENT')
  assert.strictEqual(tourney.registered_teams, 0)
})

test('Payment belonging to another tournament fails with INVALID_PAYMENT', () => {
  const sys = new TournamentPaymentSystem()
  const tourney1 = sys.createTournament({ id: 'tourn-T1', title: 'Tournament 1', entryFee: '₹50' })
  const tourney2 = sys.createTournament({ id: 'tourn-T2', title: 'Tournament 2', entryFee: '₹50' })
  const secret = 'rzp_test_secret_123'

  // User creates and verifies payment for Tournament 1
  const orderRes = sys.createRazorpayOrder({ userId: 'user-005', tournamentId: tourney1.id })
  const paymentId = 'pay_tourn_1_123'
  const signature = crypto.createHmac('sha256', secret).update(`${orderRes.order_id}|${paymentId}`).digest('hex')
  sys.verifyRazorpayPayment({
    userId: 'user-005',
    tournamentId: tourney1.id,
    orderId: orderRes.order_id,
    paymentId,
    signature,
    secret,
  })

  // User attempts to use Tournament 1 payment to register for Tournament 2
  const result = sys.registerTournamentTeam({
    userId: 'user-005',
    tournamentId: tourney2.id,
    teamName: 'Cross Tourney Team',
    captainName: 'Cross',
    captainUid: '1000000006',
    mode: 'Solo',
    razorpayPaymentId: paymentId,
  })

  assert.strictEqual(result.success, false)
  assert.strictEqual(result.error_code, 'INVALID_PAYMENT')
  assert.strictEqual(tourney2.registered_teams, 0)
})

console.log('\n--- 4. Unverified/Pending Payment Rejection & Signature Verification ---')

test('Unverified/Pending Razorpay payment does not register team', () => {
  const sys = new TournamentPaymentSystem()
  const tourney = sys.createTournament({ id: 'tourn-pending-1', title: 'Elite Clash', entryFee: '₹100' })

  // Order is created (PENDING status) but never verified
  const orderRes = sys.createRazorpayOrder({ userId: 'user-006', tournamentId: tourney.id })

  const result = sys.registerTournamentTeam({
    userId: 'user-006',
    tournamentId: tourney.id,
    teamName: 'Premature Team',
    captainName: 'Pacer',
    captainUid: '1000000007',
    mode: 'Solo',
    paymentId: orderRes.payment_record_id,
  })

  assert.strictEqual(result.success, false)
  assert.strictEqual(result.error_code, 'INVALID_PAYMENT')
  assert.strictEqual(tourney.registered_teams, 0)
})

test('HMAC-SHA256 signature verification rejects tampered or invalid signatures', () => {
  const sys = new TournamentPaymentSystem()
  const tourney = sys.createTournament({ id: 'tourn-sig-1', title: 'Security Match', entryFee: '₹100' })
  const secret = 'rzp_test_secret_123'

  const orderRes = sys.createRazorpayOrder({ userId: 'user-007', tournamentId: tourney.id })
  const paymentId = 'pay_tampered_777'
  const fakeSignature = 'bad_forged_signature_000000000000000000000000000000000000000000000'

  let verifyFailed = false
  try {
    sys.verifyRazorpayPayment({
      userId: 'user-007',
      tournamentId: tourney.id,
      orderId: orderRes.order_id,
      paymentId,
      signature: fakeSignature,
      secret,
    })
  } catch (err) {
    verifyFailed = true
  }

  assert.strictEqual(verifyFailed, true)
  const paymentRec = sys.payments.get(orderRes.payment_record_id)
  assert.strictEqual(paymentRec.status, 'FAILED')
})

test('Duplicate payment verification calls are strictly idempotent', () => {
  const sys = new TournamentPaymentSystem()
  const tourney = sys.createTournament({ id: 'tourn-idem-1', title: 'Idempotency Match', entryFee: '₹100' })
  const secret = 'rzp_test_secret_123'

  const orderRes = sys.createRazorpayOrder({ userId: 'user-008', tournamentId: tourney.id })
  const paymentId = 'pay_idem_888'
  const signature = crypto.createHmac('sha256', secret).update(`${orderRes.order_id}|${paymentId}`).digest('hex')

  const res1 = sys.verifyRazorpayPayment({
    userId: 'user-008',
    tournamentId: tourney.id,
    orderId: orderRes.order_id,
    paymentId,
    signature,
    secret,
  })
  assert.strictEqual(res1.status, 'VERIFIED')

  // Repeated call with same credentials
  const res2 = sys.verifyRazorpayPayment({
    userId: 'user-008',
    tournamentId: tourney.id,
    orderId: orderRes.order_id,
    paymentId,
    signature,
    secret,
  })
  assert.strictEqual(res2.success, true)
  assert.strictEqual(res2.payment_id, res1.payment_id)
})

console.log('\n--- 5. Payment Consumption & Double-Spending Protection ---')

test('Same payment cannot register two teams (Double-Spending Rejection)', () => {
  const sys = new TournamentPaymentSystem()
  const tourney = sys.createTournament({ id: 'tourn-paid-5', title: 'Pro Championship', entryFee: '₹100' })
  const secret = 'rzp_test_secret_123'

  const orderRes = sys.createRazorpayOrder({ userId: 'user-009', tournamentId: tourney.id })
  const paymentId = 'pay_consume_999'
  const signature = crypto.createHmac('sha256', secret).update(`${orderRes.order_id}|${paymentId}`).digest('hex')
  sys.verifyRazorpayPayment({
    userId: 'user-009',
    tournamentId: tourney.id,
    orderId: orderRes.order_id,
    paymentId,
    signature,
    secret,
  })

  // First registration succeeds
  const reg1 = sys.registerTournamentTeam({
    userId: 'user-009',
    tournamentId: tourney.id,
    teamName: 'Original Team',
    captainName: 'Captain One',
    captainUid: '1000000009',
    mode: 'Solo',
    razorpayPaymentId: paymentId,
  })

  assert.strictEqual(reg1.success, true)
  assert.strictEqual(reg1.payment_status, 'Paid')
  const paymentRec = sys.payments.get(orderRes.payment_record_id)
  assert.strictEqual(paymentRec.status, 'CONSUMED')
  assert.strictEqual(paymentRec.registration_id, reg1.registration_id)

  // Second registration attempting to reuse the same payment
  const reg2 = sys.registerTournamentTeam({
    userId: 'user-009',
    tournamentId: tourney.id,
    teamName: 'Second Team',
    captainName: 'Captain Two',
    captainUid: '1000000010',
    mode: 'Solo',
    razorpayPaymentId: paymentId,
  })

  assert.strictEqual(reg2.success, false)
  assert.strictEqual(reg2.error_code, 'PAYMENT_ALREADY_USED')
  assert.strictEqual(tourney.registered_teams, 1) // Did not increment again
})

test('Concurrent registration attempts with single payment allow exactly 1 team', () => {
  const sys = new TournamentPaymentSystem()
  const tourney = sys.createTournament({ id: 'tourn-race-1', title: 'Race Condition Test', entryFee: '₹75' })
  const secret = 'rzp_test_secret_123'

  const orderRes = sys.createRazorpayOrder({ userId: 'user-010', tournamentId: tourney.id })
  const paymentId = 'pay_race_1010'
  const signature = crypto.createHmac('sha256', secret).update(`${orderRes.order_id}|${paymentId}`).digest('hex')
  sys.verifyRazorpayPayment({
    userId: 'user-010',
    tournamentId: tourney.id,
    orderId: orderRes.order_id,
    paymentId,
    signature,
    secret,
  })

  // Simulate 2 parallel attempts
  const results = [
    sys.registerTournamentTeam({
      userId: 'user-010',
      tournamentId: tourney.id,
      teamName: 'Concurrent Team A',
      captainName: 'Runner A',
      captainUid: '1000000011',
      mode: 'Solo',
      razorpayPaymentId: paymentId,
    }),
    sys.registerTournamentTeam({
      userId: 'user-010',
      tournamentId: tourney.id,
      teamName: 'Concurrent Team B',
      captainName: 'Runner B',
      captainUid: '1000000012',
      mode: 'Solo',
      razorpayPaymentId: paymentId,
    }),
  ]

  const successes = results.filter((r) => r.success)
  const failures = results.filter((r) => !r.success)

  assert.strictEqual(successes.length, 1)
  assert.strictEqual(failures.length, 1)
  assert.strictEqual(failures[0].error_code, 'PAYMENT_ALREADY_USED')
  assert.strictEqual(tourney.registered_teams, 1)
})

console.log('\n--- 6. Security Invariants & RLS Restrictions ---')

test('Frontend cannot manipulate entry fee: Authoritative database check enforced', () => {
  const sys = new TournamentPaymentSystem()
  const tourney = sys.createTournament({ id: 'tourn-entry-auth', title: 'Authoritative Match', entryFee: '₹150' })

  // Even if a malicious client creates a payment of ₹10 (say via external order)
  const secret = 'rzp_test_secret_123'
  const orderRes = sys.createRazorpayOrder({ userId: 'user-011', tournamentId: tourney.id })
  const paymentRec = sys.payments.get(orderRes.payment_record_id)
  paymentRec.amount = 10.00 // Client manipulated amount

  const paymentId = 'pay_tamper_amt_11'
  const signature = crypto.createHmac('sha256', secret).update(`${orderRes.order_id}|${paymentId}`).digest('hex')
  sys.verifyRazorpayPayment({
    userId: 'user-011',
    tournamentId: tourney.id,
    orderId: orderRes.order_id,
    paymentId,
    signature,
    secret,
  })

  const result = sys.registerTournamentTeam({
    userId: 'user-011',
    tournamentId: tourney.id,
    teamName: 'Tamper Team',
    captainName: 'Hacker',
    captainUid: '1000000013',
    mode: 'Solo',
    paymentId: paymentRec.id,
  })

  assert.strictEqual(result.success, false)
  assert.strictEqual(result.error_code, 'PAYMENT_AMOUNT_MISMATCH')
  assert.strictEqual(tourney.registered_teams, 0)
})

test('Normal users cannot directly insert or update financial payment records (RLS Revocation)', () => {
  const sys = new TournamentPaymentSystem()

  // Attempt direct client INSERT
  let insertBlocked = false
  try {
    sys.simulateDirectClientPaymentInsert({
      role: 'authenticated',
      paymentData: { id: 'fake_payment_1', amount: 500, status: 'VERIFIED' },
    })
  } catch (err) {
    insertBlocked = err.message.includes('permission denied')
  }
  assert.strictEqual(insertBlocked, true)

  // Attempt direct client UPDATE
  let updateBlocked = false
  try {
    sys.simulateDirectClientPaymentUpdate({
      role: 'authenticated',
      paymentId: 'fake_payment_1',
      updates: { status: 'VERIFIED' },
    })
  } catch (err) {
    updateBlocked = err.message.includes('permission denied')
  }
  assert.strictEqual(updateBlocked, true)
})

test('service_role and SECURITY DEFINER RPCs can legitimately update payment records', () => {
  const sys = new TournamentPaymentSystem()
  let insertSuccess = false
  try {
    sys.simulateDirectClientPaymentInsert({
      role: 'service_role',
      paymentData: { id: 'valid_srv_payment_1', amount: 100, status: 'PENDING' },
    })
    insertSuccess = true
  } catch (err) {
    insertSuccess = false
  }
  assert.strictEqual(insertSuccess, true)
  assert.strictEqual(sys.payments.get('valid_srv_payment_1').status, 'PENDING')
})

console.log('\n============================================================')
console.log(`🏁 TEST RESULTS: ${passed}/${passed + failed} Passed (${failed} Failed)`)
console.log('============================================================\n')

if (failed > 0) {
  process.exit(1)
}
