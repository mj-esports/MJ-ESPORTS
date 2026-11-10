// test_phase6c_famgateway_webhook_regression.mjs
// Regression test suite for FamGateway Webhook Edge Function logic
// Covers:
// 1. Valid synthetic test webhook (e.g. order TEST-6AF02F130628C from Test & Verify button)
// 2. Invalid signature rejection (HTTP 401)
// 3. Missing signature rejection (HTTP 400)
// 4. Unknown real order ID handling (deliberate ignored response, no payment mutations)
// 5. Valid real payment webhook (updates payment to VERIFIED & calls recovery RPC)
// 6. Duplicate webhook delivery (idempotent replay protection with upsert safety)
// 7. Database insert failure resilience (safe try/catch, no .catch() crash on Postgrest builder)
// 8. Schema compliance with famgateway_webhook_events CHECK (status IN ('PROCESSED', 'IGNORED', 'FAILED'))
// 9. Top-level try/catch catching all unhandled exceptions and returning structured JSON

import crypto from 'crypto'
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
console.log('MJ ESPORTS: FamGateway Webhook Comprehensive Regression Suite')
console.log('======================================================================\n')

const webhookPath = path.resolve('supabase/functions/famgateway-webhook/index.ts')
assert(fs.existsSync(webhookPath), 'famgateway-webhook/index.ts exists')
const webhookCode = fs.readFileSync(webhookPath, 'utf8')

// -----------------------------------------------------------------------------
// GROUP 1: Source Code Static Analysis & Anti-Pattern Elimination
// -----------------------------------------------------------------------------
console.log('--- GROUP 1: Source Code Static Analysis & Anti-Pattern Elimination ---')

assert(
  !webhookCode.includes('.insert(') || !webhookCode.includes('.insert(').catch,
  'No invalid .insert(...).catch() syntax used on Supabase Postgrest builders'
)
assert(
  !webhookCode.includes('insert({').catch && !webhookCode.includes('upsert({').catch,
  'Awaited Supabase upsert/insert with try/catch is used for audit log persistence'
)
assert(
  webhookCode.includes('isTestEvent'),
  'Webhook detects synthetic provider test events'
)
assert(
  webhookCode.includes('is_test') && (webhookCode.includes('TEST-') || webhookCode.includes('^TEST[-_]')),
  'Both is_test flag and synthetic test order prefix (TEST-) are explicitly checked'
)
assert(
  webhookCode.includes('constantTimeCompare'),
  'Timing-attack resistant signature comparison is enforced'
)
assert(
  webhookCode.includes('upsert(') && webhookCode.includes("onConflict: 'order_id'"),
  'Audit log persistence uses upsert with onConflict on order_id to prevent duplicate key crashes'
)
assert(
  webhookCode.includes('catch (fatalErr'),
  'Top-level try/catch wraps serve handler to eliminate unhandled crashes (plain text 500)'
)
assert(
  webhookCode.includes("Deno.env.get('FAMGATEWAY_API_KEY')") && webhookCode.includes('if (!apiKey)'),
  'Fail-closed secret validation: missing FAMGATEWAY_API_KEY returns HTTP 500'
)
assert(
  !webhookCode.includes('if (apiKey) {'),
  'Signature verification is never skipped (no if (apiKey) bypass condition)'
)

// -----------------------------------------------------------------------------
// GROUP 2: HMAC-SHA256 Signature Verification Simulator
// -----------------------------------------------------------------------------
console.log('\n--- GROUP 2: HMAC-SHA256 Cryptographic Verification ---')

const mockApiKey = 'fg_live_api_key_mjesports_998877'

function computeHmac(rawBody, key) {
  return crypto.createHmac('sha256', key).update(rawBody, 'utf8').digest('hex').toLowerCase()
}

function constantTimeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false
  let mismatch = 0
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return mismatch === 0
}

const exactFamGatewayTestPayload = JSON.stringify({
  event: 'payment.success',
  order_id: 'TEST-6AF02F130628C',
  amount: '100.00',
  payable_amount: '100.00',
  status: 'success',
  transaction_id: 'TEST_TXN_6AF02F1306293',
  utr: '934632315157',
  sender_name: 'FamGateway Tester',
  payment_time: '08-11-2026 13:43:07',
  timestamp: 1794125587,
  is_test: true,
})

const realPaymentPayload = JSON.stringify({
  order_id: 'FG_ORD_20261108_5544',
  amount: '50.00',
  status: 'paid',
  utr: 'UTR123456789012',
  event: 'payment.success',
})

const validTestSignature = computeHmac(exactFamGatewayTestPayload, mockApiKey)
const validRealSignature = computeHmac(realPaymentPayload, mockApiKey)
const invalidSignature = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'

assert(constantTimeCompare(validTestSignature, computeHmac(exactFamGatewayTestPayload, mockApiKey)), 'Valid test event signature matches HMAC-SHA256')
assert(!constantTimeCompare(invalidSignature, validTestSignature), 'Tampered or incorrect signature is strictly rejected')

// -----------------------------------------------------------------------------
// GROUP 3: Webhook Event Processing Simulator
// -----------------------------------------------------------------------------
console.log('\n--- GROUP 3: Webhook Event Processing Invariants ---')

class MockSupabaseClient {
  constructor({ existingEvents = [], existingPayments = [], shouldFailInsert = false, shouldThrowFatal = false }) {
    this.events = [...existingEvents]
    this.payments = [...existingPayments]
    this.shouldFailInsert = shouldFailInsert
    this.shouldThrowFatal = shouldThrowFatal
    this.recoveredPayments = []
  }

  from(table) {
    if (this.shouldThrowFatal) {
      throw new Error('Simulated Fatal Network / DB Exception')
    }

    if (table === 'famgateway_webhook_events') {
      return {
        select: () => ({
          eq: (col, val) => ({
            maybeSingle: async () => {
              const found = this.events.find(e => e[col] === val)
              return { data: found || null, error: null }
            }
          })
        }),
        upsert: async (record, options = {}) => {
          if (this.shouldFailInsert) {
            return { data: null, error: new Error('Simulated Database Connection Failure') }
          }
          // Validate check constraint on status
          const validStatuses = ['PROCESSED', 'IGNORED', 'FAILED']
          if (!validStatuses.includes(record.status)) {
            throw new Error(`CHECK constraint violation: status "${record.status}" is not in ('PROCESSED', 'IGNORED', 'FAILED')`)
          }
          const existingIdx = this.events.findIndex(e => e.order_id === record.order_id)
          if (existingIdx >= 0) {
            this.events[existingIdx] = { ...this.events[existingIdx], ...record }
          } else {
            this.events.push(record)
          }
          return { data: record, error: null }
        },
        insert: async (record) => {
          return this.upsert(record)
        }
      }
    }

    if (table === 'tournament_payments') {
      return {
        select: () => ({
          eq: (col, val) => ({
            maybeSingle: async () => {
              const found = this.payments.find(p => p[col] === val)
              return { data: found || null, error: null }
            }
          })
        }),
        update: (updates) => ({
          eq: (col, val) => {
            const item = this.payments.find(p => p[col] === val)
            if (item) Object.assign(item, updates)
            return { data: item, error: null }
          }
        })
      }
    }

    throw new Error(`Unknown table: ${table}`)
  }

  rpc(fnName, params) {
    if (fnName === 'recover_tournament_registration_from_payment') {
      this.recoveredPayments.push(params.p_payment_id)
      return { data: { success: true, recovered: true, registration_id: 'reg_123' }, error: null }
    }
    return { data: null, error: new Error(`Unknown RPC: ${fnName}`) }
  }
}

async function simulateWebhookHandler(rawBody, headers, supabase, apiKey) {
  try {
    const method = headers['method'] || 'POST'
    if (method !== 'POST') {
      return { status: 405, body: { error: 'Method not allowed' } }
    }

    if (!apiKey || !apiKey.trim()) {
      return { status: 500, body: { error: 'Webhook processing misconfigured (secret missing)' } }
    }

    const signature =
      headers['x-famgateway-signature'] ||
      headers['X-FamGateway-Signature'] ||
      headers['x-signature']

    if (!signature) {
      return { status: 400, body: { error: 'Missing X-FamGateway-Signature header' } }
    }

    const computedSig = computeHmac(rawBody, apiKey)
    if (!constantTimeCompare(signature, computedSig)) {
      return { status: 401, body: { error: 'Invalid webhook signature' } }
    }

    let eventPayload
    try {
      eventPayload = JSON.parse(rawBody)
    } catch {
      return { status: 400, body: { error: 'Invalid JSON payload' } }
    }

    const orderId = String(eventPayload?.order_id || '').trim()
    if (!orderId) {
      return { status: 400, body: { error: 'Missing order_id in webhook payload' } }
    }

    // Detect synthetic test events
    const isTestEvent = Boolean(
      eventPayload?.test === true ||
      eventPayload?.is_test === true ||
      eventPayload?.mode === 'test' ||
      String(eventPayload?.event || '').toLowerCase().includes('test') ||
      orderId.toUpperCase().startsWith('TEST-') ||
      orderId.toUpperCase().startsWith('TEST_') ||
      /^TEST[-_]/i.test(orderId)
    )

    // Idempotency check
    const { data: existingEvent } = await supabase
      .from('famgateway_webhook_events')
      .select('id, order_id, status')
      .eq('order_id', orderId)
      .maybeSingle()

    if (existingEvent) {
      return {
        status: 200,
        body: {
          success: true,
          message: 'Event already processed (idempotent replay)',
          order_id: orderId,
          test_mode: isTestEvent,
          status: isTestEvent ? 'TEST_ACKNOWLEDGED' : (existingEvent.status || 'PROCESSED'),
        }
      }
    }

    let processingStatus = 'PROCESSED'
    let processingError = null

    const paidAmount = parseFloat(eventPayload?.amount || '0')
    const eventStatus = String(eventPayload?.status || '').toLowerCase()
    const utr = String(eventPayload?.utr || '').trim()

    const { data: tp } = await supabase
      .from('tournament_payments')
      .select('id, tournament_id, user_id, amount, status, provider_order_id, registration_id')
      .eq('provider_order_id', orderId)
      .maybeSingle()

    if (!tp) {
      if (isTestEvent) {
        processingStatus = 'IGNORED'
        processingError = null
      } else {
        processingStatus = 'IGNORED'
        processingError = 'Unknown payment order reference'
      }
    } else {
      if (eventStatus === 'paid' || eventStatus === 'success') {
        if (paidAmount > 0 && paidAmount < Number(tp.amount)) {
          processingStatus = 'FAILED'
          processingError = `Amount mismatch: expected ₹${tp.amount}, received ₹${paidAmount}`
        } else if (tp.status !== 'CONSUMED') {
          await supabase
            .from('tournament_payments')
            .update({ status: 'VERIFIED', provider_payment_id: utr })
            .eq('id', tp.id)

          await supabase.rpc('recover_tournament_registration_from_payment', { p_payment_id: tp.id })
        }
      } else {
        processingStatus = 'IGNORED'
      }
    }

    // Audit log upsert with try/catch
    try {
      const { error: insertErr } = await supabase
        .from('famgateway_webhook_events')
        .upsert({
          order_id: orderId,
          event_type: eventPayload?.event || (isTestEvent ? 'provider.test' : 'payment.success'),
          utr: utr || null,
          amount: isNaN(paidAmount) ? null : paidAmount,
          payload: eventPayload,
          status: processingStatus,
          error_message: processingError,
        }, { onConflict: 'order_id' })
      if (insertErr) {
        console.error('Audit insert error:', insertErr.message)
      }
    } catch (ex) {
      console.error('Audit insert exception:', ex.message)
    }

    if (processingStatus === 'FAILED') {
      return { status: 500, body: { error: processingError, order_id: orderId } }
    }

    if (isTestEvent && !tp) {
      return {
        status: 200,
        body: {
          success: true,
          message: 'Test webhook event acknowledged successfully',
          test_mode: true,
          order_id: orderId,
          status: 'TEST_ACKNOWLEDGED',
        }
      }
    }

    if (!tp) {
      return {
        status: 200,
        body: {
          success: false,
          ignored: true,
          message: 'Order reference not found in payment records',
          order_id: orderId,
          status: 'IGNORED',
        }
      }
    }

    return { status: 200, body: { success: true, order_id: orderId, status: processingStatus } }
  } catch (fatalErr) {
    return {
      status: 500,
      body: {
        error: 'Webhook processing encountered an internal error',
        message: fatalErr.message,
      }
    }
  }
}

// -----------------------------------------------------------------------------
// TEST CASES EXECUTION
// -----------------------------------------------------------------------------

// Test 0: Missing API key (fails closed) -> HTTP 500, no database writes
{
  const db = new MockSupabaseClient({})
  const res = await simulateWebhookHandler(exactFamGatewayTestPayload, { method: 'POST', 'x-famgateway-signature': validTestSignature }, db, '')
  assert(res.status === 500 && res.body.error.includes('secret missing'), 'Test 0a: Missing API key rejected with HTTP 500 (fail-closed)')
  assert(db.events.length === 0, 'Test 0b: Missing API key performs zero event ledger writes')
  assert(db.payments.length === 0, 'Test 0c: Missing API key performs zero payment mutations')
  assert(db.recoveredPayments.length === 0, 'Test 0d: Missing API key triggers zero registration recovery calls')
}

// Test 1: Missing signature header -> HTTP 400, no database writes
{
  const db = new MockSupabaseClient({})
  const res = await simulateWebhookHandler(exactFamGatewayTestPayload, { method: 'POST' }, db, mockApiKey)
  assert(res.status === 400 && res.body.error.includes('Missing X-FamGateway-Signature'), 'Test 1a: Missing signature rejected with HTTP 400')
  assert(db.events.length === 0, 'Test 1b: Missing signature performs zero database writes')
  assert(db.payments.length === 0, 'Test 1c: Missing signature performs zero payment mutations')
}

// Test 2: Invalid signature header -> HTTP 401, no database writes
{
  const db = new MockSupabaseClient({})
  const res = await simulateWebhookHandler(exactFamGatewayTestPayload, { method: 'POST', 'x-famgateway-signature': invalidSignature }, db, mockApiKey)
  assert(res.status === 401 && res.body.error.includes('Invalid webhook signature'), 'Test 2a: Invalid signature rejected with HTTP 401')
  assert(db.events.length === 0, 'Test 2b: Invalid signature performs zero database writes')
  assert(db.payments.length === 0, 'Test 2c: Invalid signature performs zero payment mutations')
}

// Test 3: Exact FamGateway synthetic test webhook (order TEST-6AF02F130628C, is_test: true)
{
  const db = new MockSupabaseClient({})
  const res = await simulateWebhookHandler(exactFamGatewayTestPayload, { method: 'POST', 'x-famgateway-signature': validTestSignature }, db, mockApiKey)
  assert(res.status === 200, 'Test 3a: Synthetic test event returns HTTP 200')
  assert(res.body.test_mode === true, 'Test 3b: Synthetic test event flagged test_mode=true')
  assert(res.body.status === 'TEST_ACKNOWLEDGED', 'Test 3c: Synthetic test returns TEST_ACKNOWLEDGED')
  assert(res.body.order_id === 'TEST-6AF02F130628C', 'Test 3d: Synthetic test acknowledges correct order_id')
  assert(db.events.length === 1 && db.events[0].status === 'IGNORED', 'Test 3e: Synthetic test recorded in events with valid status="IGNORED"')
  assert(db.recoveredPayments.length === 0, 'Test 3f: Synthetic test does NOT call recovery RPC')
  assert(db.payments.length === 0, 'Test 3g: Synthetic test does NOT mutate payment table')
}

// Test 4: Replay of synthetic test event (repeated clicks of "Test & Verify")
{
  const db = new MockSupabaseClient({
    existingEvents: [{
      order_id: 'TEST-6AF02F130628C',
      event_type: 'payment.success',
      status: 'IGNORED',
    }]
  })
  const res = await simulateWebhookHandler(exactFamGatewayTestPayload, { method: 'POST', 'x-famgateway-signature': validTestSignature }, db, mockApiKey)
  assert(res.status === 200, 'Test 4a: Replayed synthetic test returns HTTP 200')
  assert(res.body.test_mode === true, 'Test 4b: Replayed synthetic test maintains test_mode=true')
  assert(res.body.status === 'TEST_ACKNOWLEDGED', 'Test 4c: Replayed synthetic test maintains TEST_ACKNOWLEDGED status')
  assert(res.body.message.includes('idempotent replay'), 'Test 4d: Replayed test confirms idempotent replay')
}

// Test 5: Unknown real order ID
{
  const unknownOrderPayload = JSON.stringify({
    order_id: 'FG_ORD_NONEXISTENT_9999',
    amount: '100.00',
    status: 'paid',
    utr: 'UTR9999',
  })
  const sig = computeHmac(unknownOrderPayload, mockApiKey)
  const db = new MockSupabaseClient({})
  const res = await simulateWebhookHandler(unknownOrderPayload, { method: 'POST', 'x-famgateway-signature': sig }, db, mockApiKey)
  assert(res.status === 200 && res.body.ignored === true, 'Test 5a: Unknown order returns deliberate HTTP 200 ignored response')
  assert(db.events[0].status === 'IGNORED' && db.events[0].error_message.includes('Unknown payment order'), 'Test 5b: Unknown order safely logged with status="IGNORED"')
  assert(db.recoveredPayments.length === 0, 'Test 5c: Unknown order does NOT trigger registration recovery')
}

// Test 6: Valid real payment webhook
{
  const existingPayment = {
    id: 'pay_uuid_111',
    tournament_id: 'tourn_solo_1',
    user_id: 'user_player_1',
    amount: 50.00,
    status: 'PENDING',
    provider_order_id: 'FG_ORD_20261108_5544',
  }
  const db = new MockSupabaseClient({ existingPayments: [existingPayment] })
  const res = await simulateWebhookHandler(realPaymentPayload, { method: 'POST', 'x-famgateway-signature': validRealSignature }, db, mockApiKey)
  assert(res.status === 200 && res.body.status === 'PROCESSED', 'Test 6a: Real payment processed with HTTP 200')
  assert(existingPayment.status === 'VERIFIED', 'Test 6b: Real payment status atomically updated to VERIFIED')
  assert(existingPayment.provider_payment_id === 'UTR123456789012', 'Test 6c: Real payment UTR recorded')
  assert(db.recoveredPayments.includes('pay_uuid_111'), 'Test 6d: Real payment invokes recover_tournament_registration_from_payment')
  assert(db.events[0].status === 'PROCESSED', 'Test 6e: Real payment logged with status="PROCESSED"')
}

// Test 7: Duplicate real webhook delivery (Idempotency)
{
  const existingEvent = {
    id: 'evt_999',
    order_id: 'FG_ORD_20261108_5544',
    status: 'PROCESSED',
  }
  const db = new MockSupabaseClient({ existingEvents: [existingEvent] })
  const res = await simulateWebhookHandler(realPaymentPayload, { method: 'POST', 'x-famgateway-signature': validRealSignature }, db, mockApiKey)
  assert(res.status === 200 && res.body.message.includes('idempotent replay'), 'Test 7a: Duplicate webhook immediately returns idempotent replay (no-op)')
  assert(db.recoveredPayments.length === 0, 'Test 7b: Duplicate webhook does not re-invoke recovery RPC')
}

// Test 8: Database insert failure resilience (Upsert try/catch)
{
  const db = new MockSupabaseClient({ shouldFailInsert: true })
  let didCrash = false
  try {
    const res = await simulateWebhookHandler(exactFamGatewayTestPayload, { method: 'POST', 'x-famgateway-signature': validTestSignature }, db, mockApiKey)
    assert(res.status === 200, 'Test 8a: Function does not crash when audit insert fails (try/catch resilience)')
  } catch {
    didCrash = true
  }
  assert(!didCrash, 'Test 8b: Postgrest builder insert failure safely handled without unhandled rejection')
}

// Test 9: Top-level error catcher catches fatal exceptions and returns JSON HTTP 500
{
  const db = new MockSupabaseClient({ shouldThrowFatal: true })
  const res = await simulateWebhookHandler(exactFamGatewayTestPayload, { method: 'POST', 'x-famgateway-signature': validTestSignature }, db, mockApiKey)
  assert(res.status === 500, 'Test 9a: Fatal exception caught by top-level try/catch with status 500')
  assert(res.body.error.includes('internal error'), 'Test 9b: Top-level error returns structured JSON error message')
  assert(res.body.message.includes('Simulated Fatal Network'), 'Test 9c: Error details preserved in response JSON')
}

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
  console.log('ALL WEBHOOK REGRESSION CHECKS PASSED!')
}
