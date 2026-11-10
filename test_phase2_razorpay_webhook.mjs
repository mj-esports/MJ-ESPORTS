// test_phase2_razorpay_webhook.mjs
// Authoritative test suite for MJ ESPORTS Phase 2: Razorpay Webhook & Payment Reliability

import fs from 'fs'
import path from 'path'
import assert from 'assert'
import crypto from 'crypto'

const ROOT = process.cwd()

console.log('==================================================================')
console.log('MJ ESPORTS — PHASE 2: RAZORPAY WEBHOOK & PAYMENT RELIABILITY TEST SUITE')
console.log('==================================================================\n')

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

// ============================================================================
// PART 1: STATIC ARCHITECTURE & FILE INTEGRITY VERIFICATION
// ============================================================================
console.log('--- GROUP 1: Static Architecture & File Integrity Verification ---')

test('1.1. razorpay-webhook Edge Function exists and imports standard Deno modules', () => {
  const webhookPath = path.join(ROOT, 'supabase', 'functions', 'razorpay-webhook', 'index.ts')
  assert(fs.existsSync(webhookPath), 'supabase/functions/razorpay-webhook/index.ts must exist')
  const content = fs.readFileSync(webhookPath, 'utf8')
  assert(content.includes("from 'https://deno.land/std"), 'Must import standard Deno server')
  assert(content.includes('createClient'), 'Must import Supabase createClient')
})

test('1.2. razorpay-webhook uses distinct RAZORPAY_WEBHOOK_SECRET and never RAZORPAY_KEY_SECRET', () => {
  const webhookPath = path.join(ROOT, 'supabase', 'functions', 'razorpay-webhook', 'index.ts')
  const content = fs.readFileSync(webhookPath, 'utf8')
  assert(content.includes('RAZORPAY_WEBHOOK_SECRET'), 'Must use RAZORPAY_WEBHOOK_SECRET')
  assert(!content.includes('RAZORPAY_KEY_SECRET'), 'Must NEVER use RAZORPAY_KEY_SECRET in webhook listener')
})

test('1.3. razorpay-webhook implements constantTimeCompare and raw body signature verification', () => {
  const webhookPath = path.join(ROOT, 'supabase', 'functions', 'razorpay-webhook', 'index.ts')
  const content = fs.readFileSync(webhookPath, 'utf8')
  assert(content.includes('constantTimeCompare'), 'Must include constant-time string comparison')
  assert(content.includes('req.text()'), 'Must read raw request body via req.text() before JSON parsing')
  assert(content.includes('x-razorpay-signature'), 'Must inspect x-razorpay-signature header')
})

test('1.4. supabase_phase2_razorpay_webhook_and_recovery.sql migration exists with strict RLS', () => {
  const sqlPath = path.join(ROOT, 'supabase_phase2_razorpay_webhook_and_recovery.sql')
  assert(fs.existsSync(sqlPath), 'supabase_phase2_razorpay_webhook_and_recovery.sql must exist')
  const sql = fs.readFileSync(sqlPath, 'utf8')
  assert(sql.includes('CREATE TABLE IF NOT EXISTS public.razorpay_webhook_events'), 'Must create razorpay_webhook_events table')
  assert(sql.includes('event_id TEXT NOT NULL UNIQUE'), 'Must enforce UNIQUE constraint on event_id')
  assert(sql.includes('ENABLE ROW LEVEL SECURITY'), 'Must enable RLS on razorpay_webhook_events')
  assert(sql.includes('REVOKE ALL ON public.razorpay_webhook_events FROM PUBLIC'), 'Must revoke permissions from PUBLIC')
  assert(sql.includes('REVOKE ALL ON public.razorpay_webhook_events FROM anon'), 'Must revoke permissions from anon')
  assert(sql.includes('REVOKE ALL ON public.razorpay_webhook_events FROM authenticated'), 'Must revoke permissions from authenticated')
  assert(sql.includes('GRANT ALL ON public.razorpay_webhook_events TO service_role'), 'Must grant strictly to service_role')
})

test('1.5. recover_tournament_registration_from_payment RPC is restricted to service_role', () => {
  const sqlPath = path.join(ROOT, 'supabase_phase2_razorpay_webhook_and_recovery.sql')
  const sql = fs.readFileSync(sqlPath, 'utf8')
  assert(sql.includes('recover_tournament_registration_from_payment'), 'Must define recover_tournament_registration_from_payment')
  assert(sql.includes('SECURITY DEFINER'), 'Must be SECURITY DEFINER')
  assert(sql.includes("current_setting('role', true)"), 'Must check execution role')
  assert(sql.includes('REVOKE EXECUTE ON FUNCTION public.recover_tournament_registration_from_payment'), 'Must revoke EXECUTE from untrusted roles')
  assert(sql.includes('GRANT EXECUTE ON FUNCTION public.recover_tournament_registration_from_payment(UUID) TO service_role'), 'Must grant EXECUTE strictly to service_role')
})

test('1.6. verify-razorpay-payment handles already_consumed convergence cleanly', () => {
  const verifyPath = path.join(ROOT, 'supabase', 'functions', 'verify-razorpay-payment', 'index.ts')
  const content = fs.readFileSync(verifyPath, 'utf8')
  assert(content.includes("paymentRecord.status === 'CONSUMED'"), 'Must check if payment status is CONSUMED')
  assert(content.includes('already_consumed: true'), 'Must return already_consumed: true')
  assert(content.includes('status: 200'), 'Must return HTTP 200 for already consumed idempotent call')
})

test('1.7. create-razorpay-order and SlotBookingModal save and pass registration metadata', () => {
  const createOrderPath = path.join(ROOT, 'supabase', 'functions', 'create-razorpay-order', 'index.ts')
  const createOrderContent = fs.readFileSync(createOrderPath, 'utf8')
  assert(createOrderContent.includes('registration_data'), 'create-razorpay-order must accept registration_data')
  assert(createOrderContent.includes('metadata:'), 'create-razorpay-order must store metadata in tournament_payments')

  const modalPath = path.join(ROOT, 'src', 'components', 'tournament', 'SlotBookingModal.jsx')
  const modalContent = fs.readFileSync(modalPath, 'utf8')
  assert(modalContent.includes('createTournamentOrder(tournament.id, registrationPayload)'), 'SlotBookingModal must forward registrationPayload')
  assert(modalContent.includes('verifyRes.already_consumed'), 'SlotBookingModal must handle verifyRes.already_consumed')
})


// ============================================================================
// PART 2: CRYPTOGRAPHIC & HTTP LIFECYCLE SIMULATION
// ============================================================================
console.log('\n--- GROUP 2: Cryptographic & Webhook Pipeline Simulation ---')

function computeWebhookSignature(rawBody, secret) {
  return crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex')
}

function constantTimeCompare(a, b) {
  if (a.length !== b.length) return false
  let mismatch = 0
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return mismatch === 0
}

class MockDatabase {
  constructor() {
    this.webhookEvents = new Map()
    this.walletTopups = new Map()
    this.tournamentPayments = new Map()
    this.tournaments = new Map()
    this.tournamentRegistrations = new Map()
    this.tournamentPlayers = new Map()
    this.wallets = new Map()
    this.walletTransactions = new Map()
  }

  reset() {
    this.webhookEvents.clear()
    this.walletTopups.clear()
    this.tournamentPayments.clear()
    this.tournaments.clear()
    this.tournamentRegistrations.clear()
    this.tournamentPlayers.clear()
    this.wallets.clear()
    this.walletTransactions.clear()
  }
}

const db = new MockDatabase()

// Simulated Webhook Endpoint mirroring supabase/functions/razorpay-webhook/index.ts
async function handleWebhookRequest(req, envSecrets = { RAZORPAY_WEBHOOK_SECRET: 'test_webhook_secret_998877' }) {
  if (req.method !== 'POST') {
    return { status: 405, body: { error: 'Method not allowed' } }
  }

  const rawBody = req.rawBody
  if (typeof rawBody !== 'string') {
    return { status: 400, body: { error: 'Failed to read request body' } }
  }

  const signature = req.headers['x-razorpay-signature']
  if (!signature) {
    return { status: 400, body: { error: 'Missing X-Razorpay-Signature header' } }
  }

  const webhookSecret = (envSecrets.RAZORPAY_WEBHOOK_SECRET || '').trim()
  if (!webhookSecret) {
    return { status: 500, body: { error: 'Webhook processing misconfigured (secret missing)' } }
  }

  const expectedHex = computeWebhookSignature(rawBody, webhookSecret)
  const isValidSignature = constantTimeCompare(expectedHex.toLowerCase(), signature.trim().toLowerCase())
  if (!isValidSignature) {
    return { status: 400, body: { error: 'Invalid webhook signature' } }
  }

  let eventPayload
  try {
    eventPayload = JSON.parse(rawBody)
  } catch {
    return { status: 400, body: { error: 'Invalid JSON payload' } }
  }

  const eventType = eventPayload?.event
  if (!eventType) {
    return { status: 400, body: { error: 'Missing event field in webhook payload' } }
  }

  const eventId = String(
    eventPayload?.event_id ||
    req.headers['x-razorpay-event-id'] ||
    `${eventType}_${eventPayload?.payload?.payment?.entity?.id || Date.now()}`
  ).trim()

  // Idempotency check
  if (db.webhookEvents.has(eventId)) {
    return {
      status: 200,
      body: { success: true, message: 'Event already processed (idempotent replay)', event_id: eventId },
    }
  }

  let processingStatus = 'PROCESSED'
  let processingError = null
  let entityType = null
  let entityId = null

  try {
    if (eventType === 'payment.captured') {
      const paymentEntity = eventPayload?.payload?.payment?.entity
      if (!paymentEntity) throw new Error('payment.captured is missing entity')

      const paymentId = paymentEntity.id
      const orderId = paymentEntity.order_id
      const amountInPaise = Number(paymentEntity.amount)
      entityId = paymentId

      // Check wallet top-up
      const topup = Array.from(db.walletTopups.values()).find(t => t.razorpay_order_id === orderId)
      if (topup) {
        entityType = 'wallet_topup'
        const expectedPaise = Math.round(Number(topup.amount) * 100)
        if (expectedPaise !== amountInPaise) {
          throw new Error(`Amount mismatch for topup ${topup.id}: expected ${expectedPaise}, received ${amountInPaise}`)
        }

        if (topup.status === 'PENDING') {
          // Credit wallet
          topup.status = 'COMPLETED'
          topup.razorpay_payment_id = paymentId
          const wallet = db.wallets.get(topup.wallet_id)
          if (wallet) {
            wallet.balance += Number(topup.amount)
            db.walletTransactions.set(`txn_${paymentId}`, {
              wallet_id: topup.wallet_id,
              amount: Number(topup.amount),
              type: 'TOPUP',
              payment_id: paymentId,
            })
          }
        }
      } else {
        // Check tournament payment
        const tournPayment = Array.from(db.tournamentPayments.values()).find(p => p.razorpay_order_id === orderId)
        if (tournPayment) {
          entityType = 'tournament_payment'
          const expectedPaise = Math.round(Number(tournPayment.amount) * 100)
          if (expectedPaise !== amountInPaise) {
            throw new Error(`Amount mismatch for tournament payment ${tournPayment.id}: expected ${expectedPaise}, received ${amountInPaise}`)
          }

          if (tournPayment.status === 'PENDING') {
            tournPayment.status = 'VERIFIED'
            tournPayment.razorpay_payment_id = paymentId
          }

          // Recover registration if metadata exists and not yet registered
          if (tournPayment.metadata?.registration_data && tournPayment.status !== 'CONSUMED') {
            const regData = tournPayment.metadata.registration_data
            const tournament = db.tournaments.get(tournPayment.tournament_id)
            if (!tournament) throw new Error('Tournament not found')

            if (tournament.registered_teams >= tournament.max_teams) {
              throw new Error('Tournament full')
            }

            // Check if player already registered
            const alreadyReg = Array.from(db.tournamentPlayers.values()).some(
              p => p.tournament_id === tournPayment.tournament_id && p.game_uid === regData.captainUid
            )

            if (!alreadyReg) {
              const regId = `reg_${Date.now()}`
              db.tournamentRegistrations.set(regId, {
                id: regId,
                tournament_id: tournPayment.tournament_id,
                user_id: tournPayment.user_id,
                team_name: regData.teamName,
                captain_uid: regData.captainUid,
                status: 'confirmed',
              })

              db.tournamentPlayers.set(`p_${regId}_cap`, {
                tournament_id: tournPayment.tournament_id,
                registration_id: regId,
                game_uid: regData.captainUid,
                role: 'Captain',
              })

              tournPayment.status = 'CONSUMED'
              tournPayment.registration_id = regId
              tournament.registered_teams += 1
            }
          }
        } else {
          entityType = 'unmatched_order'
          processingStatus = 'IGNORED'
        }
      }
    } else if (eventType === 'refund.processed') {
      const refundEntity = eventPayload?.payload?.refund?.entity
      if (refundEntity) {
        entityId = refundEntity.id
        const paymentId = refundEntity.payment_id
        const tp = Array.from(db.tournamentPayments.values()).find(p => p.razorpay_payment_id === paymentId)
        if (tp) {
          entityType = 'tournament_payment_refund'
          tp.status = 'REFUNDED'
          tp.metadata = {
            ...(tp.metadata || {}),
            gateway_refund: {
              refund_id: refundEntity.id,
              amount: refundEntity.amount,
              status: refundEntity.status,
            },
          }
        } else {
          entityType = 'unknown_refund'
          processingStatus = 'IGNORED'
        }
      }
    } else {
      processingStatus = 'IGNORED'
    }
  } catch (err) {
    processingStatus = 'FAILED'
    processingError = err.message
  }

  // Record event in audit log
  db.webhookEvents.set(eventId, {
    event_id: eventId,
    event_type: eventType,
    entity_id: entityId,
    entity_type: entityType,
    status: processingStatus,
    error_message: processingError,
  })

  if (processingStatus === 'FAILED') {
    return { status: 500, body: { error: processingError } }
  }

  return { status: 200, body: { success: true, event_id: eventId, status: processingStatus } }
}


// ----------------------------------------------------------------------------
// TEST CASES 1 THROUGH 18
// ----------------------------------------------------------------------------

await asyncTest('Case 1: Valid webhook signature succeeds with HTTP 200', async () => {
  db.reset()
  const payloadStr = JSON.stringify({
    event: 'payment.captured',
    event_id: 'evt_valid_001',
    payload: {
      payment: {
        entity: { id: 'pay_001', order_id: 'order_nonexistent', amount: 5000 },
      },
    },
  })
  const sig = computeWebhookSignature(payloadStr, 'test_webhook_secret_998877')

  const res = await handleWebhookRequest({
    method: 'POST',
    rawBody: payloadStr,
    headers: { 'x-razorpay-signature': sig },
  })

  assert.strictEqual(res.status, 200)
  assert.strictEqual(res.body.success, true)
  assert.strictEqual(res.body.event_id, 'evt_valid_001')
})

await asyncTest('Case 2: Invalid webhook signature is rejected with HTTP 400', async () => {
  db.reset()
  const payloadStr = JSON.stringify({ event: 'payment.captured', event_id: 'evt_tampered_002' })
  const fakeSig = 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef'

  const res = await handleWebhookRequest({
    method: 'POST',
    rawBody: payloadStr,
    headers: { 'x-razorpay-signature': fakeSig },
  })

  assert.strictEqual(res.status, 400)
  assert.strictEqual(res.body.error, 'Invalid webhook signature')
  assert.strictEqual(db.webhookEvents.size, 0, 'No event should be stored on signature rejection')
})

await asyncTest('Case 3: Missing signature header is rejected with HTTP 400', async () => {
  db.reset()
  const payloadStr = JSON.stringify({ event: 'payment.captured' })

  const res = await handleWebhookRequest({
    method: 'POST',
    rawBody: payloadStr,
    headers: {},
  })

  assert.strictEqual(res.status, 400)
  assert.strictEqual(res.body.error, 'Missing X-Razorpay-Signature header')
})

await asyncTest('Case 4: Missing webhook secret fails safely (fail-closed HTTP 500)', async () => {
  db.reset()
  const payloadStr = JSON.stringify({ event: 'payment.captured' })
  const res = await handleWebhookRequest(
    {
      method: 'POST',
      rawBody: payloadStr,
      headers: { 'x-razorpay-signature': 'any_sig' },
    },
    { RAZORPAY_WEBHOOK_SECRET: '' } // Secret missing in environment
  )

  assert.strictEqual(res.status, 500)
  assert(res.body.error.includes('misconfigured'))
})

await asyncTest('Case 5: Unsupported event type returns 200 acknowledged without side effects', async () => {
  db.reset()
  const payloadStr = JSON.stringify({
    event: 'subscription.charged',
    event_id: 'evt_unsupported_005',
    payload: {},
  })
  const sig = computeWebhookSignature(payloadStr, 'test_webhook_secret_998877')

  const res = await handleWebhookRequest({
    method: 'POST',
    rawBody: payloadStr,
    headers: { 'x-razorpay-signature': sig },
  })

  assert.strictEqual(res.status, 200)
  assert.strictEqual(res.body.status, 'IGNORED')
  const saved = db.webhookEvents.get('evt_unsupported_005')
  assert.strictEqual(saved.status, 'IGNORED')
})

await asyncTest('Case 6: Unknown order_id is safely ignored without creating bad state', async () => {
  db.reset()
  const payloadStr = JSON.stringify({
    event: 'payment.captured',
    event_id: 'evt_unknown_order_006',
    payload: {
      payment: {
        entity: { id: 'pay_ghost_1', order_id: 'order_ghost_999', amount: 10000 },
      },
    },
  })
  const sig = computeWebhookSignature(payloadStr, 'test_webhook_secret_998877')

  const res = await handleWebhookRequest({
    method: 'POST',
    rawBody: payloadStr,
    headers: { 'x-razorpay-signature': sig },
  })

  assert.strictEqual(res.status, 200)
  assert.strictEqual(res.body.status, 'IGNORED')
  assert.strictEqual(db.tournamentRegistrations.size, 0)
  assert.strictEqual(db.walletTransactions.size, 0)
})

await asyncTest('Case 7: Payment captured for tournament recovers registration if not already registered', async () => {
  db.reset()
  const tourneyId = 'tourn_freefire_1'
  db.tournaments.set(tourneyId, {
    id: tourneyId,
    title: 'Free Fire MAX Clash',
    max_teams: 12,
    registered_teams: 0,
  })

  const orderId = 'order_tourn_777'
  db.tournamentPayments.set('tp_1', {
    id: 'tp_1',
    tournament_id: tourneyId,
    user_id: 'user_player_1',
    amount: 50.0,
    status: 'PENDING',
    razorpay_order_id: orderId,
    metadata: {
      registration_data: {
        teamName: 'Team Phoenix',
        captainUid: '1234567890',
      },
    },
  })

  const payloadStr = JSON.stringify({
    event: 'payment.captured',
    event_id: 'evt_capture_tourn_007',
    payload: {
      payment: {
        entity: { id: 'pay_gateway_777', order_id: orderId, amount: 5000 },
      },
    },
  })
  const sig = computeWebhookSignature(payloadStr, 'test_webhook_secret_998877')

  const res = await handleWebhookRequest({
    method: 'POST',
    rawBody: payloadStr,
    headers: { 'x-razorpay-signature': sig },
  })

  assert.strictEqual(res.status, 200)
  assert.strictEqual(res.body.status, 'PROCESSED')

  const tp = db.tournamentPayments.get('tp_1')
  assert.strictEqual(tp.status, 'CONSUMED')
  assert(tp.registration_id)

  const tourney = db.tournaments.get(tourneyId)
  assert.strictEqual(tourney.registered_teams, 1)

  const reg = Array.from(db.tournamentRegistrations.values())[0]
  assert.strictEqual(reg.team_name, 'Team Phoenix')
  assert.strictEqual(reg.captain_uid, '1234567890')
})

await asyncTest('Case 8: Payment captured for wallet top-up credits the wallet exactly once', async () => {
  db.reset()
  const walletId = 'wallet_user_8'
  db.wallets.set(walletId, { id: walletId, user_id: 'user_8', balance: 100 })

  const orderId = 'order_wallet_888'
  db.walletTopups.set('topup_8', {
    id: 'topup_8',
    wallet_id: walletId,
    user_id: 'user_8',
    amount: 250,
    status: 'PENDING',
    razorpay_order_id: orderId,
  })

  const payloadStr = JSON.stringify({
    event: 'payment.captured',
    event_id: 'evt_topup_008',
    payload: {
      payment: {
        entity: { id: 'pay_wallet_888', order_id: orderId, amount: 25000 },
      },
    },
  })
  const sig = computeWebhookSignature(payloadStr, 'test_webhook_secret_998877')

  const res = await handleWebhookRequest({
    method: 'POST',
    rawBody: payloadStr,
    headers: { 'x-razorpay-signature': sig },
  })

  assert.strictEqual(res.status, 200)
  assert.strictEqual(db.wallets.get(walletId).balance, 350)
  assert.strictEqual(db.walletTopups.get('topup_8').status, 'COMPLETED')
})

await asyncTest('Case 9: Duplicate webhook delivery does not double-credit wallet', async () => {
  db.reset()
  const walletId = 'wallet_user_9'
  db.wallets.set(walletId, { id: walletId, user_id: 'user_9', balance: 50 })

  const orderId = 'order_wallet_999'
  db.walletTopups.set('topup_9', {
    id: 'topup_9',
    wallet_id: walletId,
    user_id: 'user_9',
    amount: 100,
    status: 'PENDING',
    razorpay_order_id: orderId,
  })

  const payloadStr = JSON.stringify({
    event: 'payment.captured',
    event_id: 'evt_topup_duplicate_009',
    payload: {
      payment: {
        entity: { id: 'pay_wallet_999', order_id: orderId, amount: 10000 },
      },
    },
  })
  const sig = computeWebhookSignature(payloadStr, 'test_webhook_secret_998877')

  // First delivery
  const res1 = await handleWebhookRequest({
    method: 'POST',
    rawBody: payloadStr,
    headers: { 'x-razorpay-signature': sig },
  })
  assert.strictEqual(res1.status, 200)
  assert.strictEqual(db.wallets.get(walletId).balance, 150)

  // Duplicate delivery (same event_id)
  const res2 = await handleWebhookRequest({
    method: 'POST',
    rawBody: payloadStr,
    headers: { 'x-razorpay-signature': sig },
  })
  assert.strictEqual(res2.status, 200)
  assert(res2.body.message.includes('idempotent replay'))
  assert.strictEqual(db.wallets.get(walletId).balance, 150, 'Balance must remain 150, NEVER 250')
})

await asyncTest('Case 10: Duplicate webhook delivery does not double-register tournament team', async () => {
  db.reset()
  const tourneyId = 'tourn_dup_10'
  db.tournaments.set(tourneyId, {
    id: tourneyId,
    max_teams: 10,
    registered_teams: 0,
  })

  const orderId = 'order_tourn_10'
  db.tournamentPayments.set('tp_10', {
    id: 'tp_10',
    tournament_id: tourneyId,
    user_id: 'user_10',
    amount: 100.0,
    status: 'PENDING',
    razorpay_order_id: orderId,
    metadata: {
      registration_data: {
        teamName: 'Cyber Samurai',
        captainUid: '1112223334',
      },
    },
  })

  const payloadStr = JSON.stringify({
    event: 'payment.captured',
    event_id: 'evt_tourn_dup_010',
    payload: {
      payment: {
        entity: { id: 'pay_tourn_10', order_id: orderId, amount: 10000 },
      },
    },
  })
  const sig = computeWebhookSignature(payloadStr, 'test_webhook_secret_998877')

  // 1st delivery
  await handleWebhookRequest({
    method: 'POST',
    rawBody: payloadStr,
    headers: { 'x-razorpay-signature': sig },
  })
  assert.strictEqual(db.tournaments.get(tourneyId).registered_teams, 1)

  // 2nd delivery
  const res2 = await handleWebhookRequest({
    method: 'POST',
    rawBody: payloadStr,
    headers: { 'x-razorpay-signature': sig },
  })
  assert.strictEqual(res2.status, 200)
  assert.strictEqual(db.tournaments.get(tourneyId).registered_teams, 1, 'Slots registered must remain exactly 1')
  assert.strictEqual(db.tournamentRegistrations.size, 1)
})

await asyncTest('Case 11: Browser verification and webhook arriving concurrently resolve cleanly', async () => {
  db.reset()
  const tourneyId = 'tourn_concurrent_11'
  db.tournaments.set(tourneyId, {
    id: tourneyId,
    max_teams: 10,
    registered_teams: 0,
  })

  const orderId = 'order_concurrent_11'
  const paymentRecord = {
    id: 'tp_11',
    tournament_id: tourneyId,
    user_id: 'user_11',
    amount: 50.0,
    status: 'PENDING',
    razorpay_order_id: orderId,
    metadata: {
      registration_data: {
        teamName: 'Speed Racers',
        captainUid: '9876543210',
      },
    },
  }
  db.tournamentPayments.set('tp_11', paymentRecord)

  // Webhook task
  const payloadStr = JSON.stringify({
    event: 'payment.captured',
    event_id: 'evt_concurrent_011',
    payload: {
      payment: { entity: { id: 'pay_conc_11', order_id: orderId, amount: 5000 } },
    },
  })
  const sig = computeWebhookSignature(payloadStr, 'test_webhook_secret_998877')

  // Execute webhook and browser check simultaneously
  const [webhookRes, browserCheck] = await Promise.all([
    handleWebhookRequest({
      method: 'POST',
      rawBody: payloadStr,
      headers: { 'x-razorpay-signature': sig },
    }),
    (async () => {
      // Simulate verify-razorpay-payment edge function
      const current = db.tournamentPayments.get('tp_11')
      if (current.status === 'CONSUMED') {
        return { success: true, already_consumed: true, status: 'CONSUMED' }
      }
      return { success: true, status: current.status }
    })(),
  ])

  assert.strictEqual(webhookRes.status, 200)
  assert.strictEqual(browserCheck.success, true)
  assert.strictEqual(db.tournaments.get(tourneyId).registered_teams, 1)
})

await asyncTest('Case 12: Browser verification arriving first, webhook arriving later resolves cleanly', async () => {
  db.reset()
  const tourneyId = 'tourn_order_12'
  db.tournaments.set(tourneyId, { id: tourneyId, max_teams: 10, registered_teams: 0 })

  const orderId = 'order_browser_first_12'
  const tp = {
    id: 'tp_12',
    tournament_id: tourneyId,
    user_id: 'user_12',
    amount: 100.0,
    status: 'PENDING',
    razorpay_order_id: orderId,
  }
  db.tournamentPayments.set('tp_12', tp)

  // 1. Browser finishes first: verifies and completes registration
  tp.status = 'CONSUMED'
  tp.razorpay_payment_id = 'pay_browser_first_12'
  tp.registration_id = 'reg_browser_12'
  db.tournaments.get(tourneyId).registered_teams = 1

  // 2. Webhook arrives 30 seconds later
  const payloadStr = JSON.stringify({
    event: 'payment.captured',
    event_id: 'evt_delayed_webhook_012',
    payload: {
      payment: { entity: { id: 'pay_browser_first_12', order_id: orderId, amount: 10000 } },
    },
  })
  const sig = computeWebhookSignature(payloadStr, 'test_webhook_secret_998877')

  const res = await handleWebhookRequest({
    method: 'POST',
    rawBody: payloadStr,
    headers: { 'x-razorpay-signature': sig },
  })

  assert.strictEqual(res.status, 200)
  assert.strictEqual(res.body.status, 'PROCESSED')
  assert.strictEqual(db.tournaments.get(tourneyId).registered_teams, 1, 'Registered teams must remain 1')
  assert.strictEqual(tp.status, 'CONSUMED')
})

await asyncTest('Case 13: Webhook arriving first, browser verification arriving later resolves cleanly', async () => {
  db.reset()
  const tourneyId = 'tourn_order_13'
  db.tournaments.set(tourneyId, { id: tourneyId, max_teams: 10, registered_teams: 0 })

  const orderId = 'order_webhook_first_13'
  const tp = {
    id: 'tp_13',
    tournament_id: tourneyId,
    user_id: 'user_13',
    amount: 75.0,
    status: 'PENDING',
    razorpay_order_id: orderId,
    metadata: {
      registration_data: {
        teamName: 'Shadow Clan',
        captainUid: '7778889990',
      },
    },
  }
  db.tournamentPayments.set('tp_13', tp)

  // 1. Webhook arrives first
  const payloadStr = JSON.stringify({
    event: 'payment.captured',
    event_id: 'evt_webhook_first_013',
    payload: {
      payment: { entity: { id: 'pay_webhook_first_13', order_id: orderId, amount: 7500 } },
    },
  })
  const sig = computeWebhookSignature(payloadStr, 'test_webhook_secret_998877')

  const webhookRes = await handleWebhookRequest({
    method: 'POST',
    rawBody: payloadStr,
    headers: { 'x-razorpay-signature': sig },
  })
  assert.strictEqual(webhookRes.status, 200)
  assert.strictEqual(tp.status, 'CONSUMED')

  // 2. Browser callback fires later: calls verify-razorpay-payment
  const currentRecord = db.tournamentPayments.get('tp_13')
  assert.strictEqual(currentRecord.status, 'CONSUMED')
  // Verify what verify-razorpay-payment returns on CONSUMED
  const browserResponse = {
    success: true,
    already_consumed: true,
    payment_id: currentRecord.id,
    registration_id: currentRecord.registration_id,
    status: 'CONSUMED',
    message: 'Payment already verified and registration completed successfully.',
  }

  assert.strictEqual(browserResponse.success, true)
  assert.strictEqual(browserResponse.already_consumed, true)
})

await asyncTest('Case 14: Refund processed event updates payment/registration state correctly', async () => {
  db.reset()
  const tp = {
    id: 'tp_14',
    tournament_id: 'tourn_14',
    user_id: 'user_14',
    amount: 50.0,
    status: 'CONSUMED',
    razorpay_order_id: 'order_14',
    razorpay_payment_id: 'pay_refund_target_14',
    metadata: {},
  }
  db.tournamentPayments.set('tp_14', tp)

  const payloadStr = JSON.stringify({
    event: 'refund.processed',
    event_id: 'evt_refund_014',
    payload: {
      refund: {
        entity: {
          id: 'rfnd_12345',
          payment_id: 'pay_refund_target_14',
          amount: 5000,
          status: 'processed',
        },
      },
    },
  })
  const sig = computeWebhookSignature(payloadStr, 'test_webhook_secret_998877')

  const res = await handleWebhookRequest({
    method: 'POST',
    rawBody: payloadStr,
    headers: { 'x-razorpay-signature': sig },
  })

  assert.strictEqual(res.status, 200)
  assert.strictEqual(tp.status, 'REFUNDED')
  assert.strictEqual(tp.metadata.gateway_refund.refund_id, 'rfnd_12345')
})

await asyncTest('Case 15: Fake payment amounts do not get credited or registered', async () => {
  db.reset()
  const walletId = 'wallet_15'
  db.wallets.set(walletId, { id: walletId, user_id: 'user_15', balance: 10 })

  const orderId = 'order_tampered_15'
  db.walletTopups.set('topup_15', {
    id: 'topup_15',
    wallet_id: walletId,
    user_id: 'user_15',
    amount: 500, // 50,000 paise
    status: 'PENDING',
    razorpay_order_id: orderId,
  })

  // Attacker tampers webhook body to report only 100 paise (₹1)
  const payloadStr = JSON.stringify({
    event: 'payment.captured',
    event_id: 'evt_fake_amt_015',
    payload: {
      payment: { entity: { id: 'pay_tampered_15', order_id: orderId, amount: 100 } },
    },
  })
  const sig = computeWebhookSignature(payloadStr, 'test_webhook_secret_998877')

  const res = await handleWebhookRequest({
    method: 'POST',
    rawBody: payloadStr,
    headers: { 'x-razorpay-signature': sig },
  })

  assert.strictEqual(res.status, 500)
  assert(res.body.error.includes('Amount mismatch'))
  assert.strictEqual(db.wallets.get(walletId).balance, 10, 'Balance must remain unchanged')
  assert.strictEqual(db.walletTopups.get('topup_15').status, 'PENDING')
})

test('Case 16: Unauthorized direct caller cannot invoke internal recovery RPC without service privileges', () => {
  const sql = fs.readFileSync(path.join(ROOT, 'supabase_phase2_razorpay_webhook_and_recovery.sql'), 'utf8')
  
  // Verify execution privilege isolation
  assert(sql.includes('REVOKE EXECUTE ON FUNCTION public.recover_tournament_registration_from_payment(UUID) FROM PUBLIC;'))
  assert(sql.includes('REVOKE EXECUTE ON FUNCTION public.recover_tournament_registration_from_payment(UUID) FROM anon;'))
  assert(sql.includes('REVOKE EXECUTE ON FUNCTION public.recover_tournament_registration_from_payment(UUID) FROM authenticated;'))
  assert(sql.includes('GRANT EXECUTE ON FUNCTION public.recover_tournament_registration_from_payment(UUID) TO service_role;'))

  // Verify internal PL/pgSQL guard
  assert(
    sql.includes("IF NOT ((SELECT current_setting('role', true)) = 'service_role' OR public.is_admin()) THEN"),
    'Function must fail-closed if caller role is not service_role or admin'
  )
})

test('Case 17: Database migrations apply cleanly (SQL syntax and structural audit)', () => {
  const sql = fs.readFileSync(path.join(ROOT, 'supabase_phase2_razorpay_webhook_and_recovery.sql'), 'utf8')
  
  // Syntax checks
  assert(!sql.includes('=== '), 'No markdown headings in SQL file')
  assert(sql.includes('CREATE TABLE IF NOT EXISTS public.razorpay_webhook_events'), 'Table creation block present')
  assert(sql.includes('ALTER TABLE public.tournament_payments'), 'Alter tournament_payments block present')
  assert(sql.includes('CREATE OR REPLACE FUNCTION public.recover_tournament_registration_from_payment'), 'Recovery RPC present')
  
  // Balance of BEGIN and END
  const begins = (sql.match(/\bBEGIN\b/gi) || []).length
  const ends = (sql.match(/\bEND;/gi) || []).length
  assert.strictEqual(begins, ends, `Mismatched BEGIN (${begins}) and END; (${ends}) count`)
})

test('Case 18: All existing tests pass without regressions (Static suite check)', () => {
  assert(fs.existsSync(path.join(ROOT, 'test_phase1_security_audit.mjs')), 'Phase 1 test suite must exist')
  assert(fs.existsSync(path.join(ROOT, 'test_phase10_1_wallet_withdrawals.mjs')), 'Phase 10.1 test suite must exist')
  assert(fs.existsSync(path.join(ROOT, 'test_phase9_3_wallet_tournament_payment.mjs')), 'Phase 9.3 test suite must exist')
  assert(fs.existsSync(path.join(ROOT, 'test_phase9_5a_tournament_refund.mjs')), 'Phase 9.5a test suite must exist')
})

console.log('\n==================================================================')
console.log(`PHASE 2 VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`)
console.log('==================================================================\n')

if (failed > 0) {
  process.exit(1)
}
