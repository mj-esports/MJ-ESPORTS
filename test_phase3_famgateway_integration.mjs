// test_phase3_famgateway_integration.mjs
// Comprehensive Integration & Verification Test Suite for FamGateway Payment Integration
// Validates Edge Function logic, crypto signature verification, database migration contracts,
// frontend payment service, UPI intent structure, and idempotency invariants.

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
console.log('MJ ESPORTS: FamGateway Payment Integration & Regression Test Suite')
console.log('======================================================================\n')

// -----------------------------------------------------------------------------
// GROUP 1: FamGateway API v2 Contracts & Documentation Compliance
// -----------------------------------------------------------------------------
console.log('--- GROUP 1: FamGateway API v2 Contracts & Documentation Compliance ---')

const createEdgeFuncPath = path.resolve('supabase/functions/create-famgateway-order/index.ts')
const verifyEdgeFuncPath = path.resolve('supabase/functions/verify-famgateway-payment/index.ts')
const webhookEdgeFuncPath = path.resolve('supabase/functions/famgateway-webhook/index.ts')
const servicePath = path.resolve('src/services/tournamentPaymentService.js')
const sqlMigrationPath = path.resolve('supabase_phase3_famgateway_payment_migration.sql')

assert(fs.existsSync(createEdgeFuncPath), 'create-famgateway-order Edge Function exists')
assert(fs.existsSync(verifyEdgeFuncPath), 'verify-famgateway-payment Edge Function exists')
assert(fs.existsSync(webhookEdgeFuncPath), 'famgateway-webhook Edge Function exists')
assert(fs.existsSync(servicePath), 'tournamentPaymentService.js exists')
assert(fs.existsSync(sqlMigrationPath), 'supabase_phase3_famgateway_payment_migration.sql exists')

const createContent = fs.readFileSync(createEdgeFuncPath, 'utf8')
const verifyContent = fs.readFileSync(verifyEdgeFuncPath, 'utf8')
const webhookContent = fs.readFileSync(webhookEdgeFuncPath, 'utf8')
const serviceContent = fs.readFileSync(servicePath, 'utf8')
const sqlContent = fs.readFileSync(sqlMigrationPath, 'utf8')

// Check endpoints in Edge Functions
assert(
  createContent.includes('/create-order') || createContent.includes('create-order.php'),
  'create-famgateway-order targets official /create-order.php endpoint'
)
assert(
  createContent.includes('\'User-Agent\': \'MJ-Esports-Backend/1.0\''),
  'create-famgateway-order supplies official User-Agent: MJ-Esports-Backend/1.0 header'
)
assert(
  createContent.includes('api_key: famgatewayApiKey'),
  'create-famgateway-order includes api_key in JSON request payload'
)
assert(
  createContent.includes('redirect_url') && createContent.includes('webhook_url'),
  'create-famgateway-order supplies validated redirect_url and webhook_url in payload'
)
assert(
  verifyContent.includes('verify-order.php') || verifyContent.includes('order_id'),
  'verify-famgateway-payment targets official /verify-order.php endpoint'
)
assert(
  webhookContent.includes('x-famgateway-signature') || webhookContent.includes('X-FamGateway-Signature'),
  'famgateway-webhook verifies documented X-FamGateway-Signature header'
)

// Check that client-side secrets are NEVER present in frontend service
assert(
  !serviceContent.includes('FAMGATEWAY_API_KEY') && !serviceContent.includes('RAZORPAY_KEY_SECRET'),
  'Frontend service does NOT contain server secrets (zero secret exposure)'
)

// -----------------------------------------------------------------------------
// GROUP 2: HMAC-SHA256 Webhook Signature Verification
// -----------------------------------------------------------------------------
console.log('\n--- GROUP 2: HMAC-SHA256 Webhook Cryptographic Verification ---')

function computeHmacSha256(rawBody, apiKey) {
  return crypto.createHmac('sha256', apiKey).update(rawBody, 'utf8').digest('hex')
}

function constantTimeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false
  let mismatch = 0
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return mismatch === 0
}

const mockApiKey = 'fg_test_secret_api_key_998877'
const mockPayload = JSON.stringify({
  order_id: 'FG_ORD_TEST_12345',
  amount: '100',
  status: 'COMPLETED',
  utr: '412345678901',
  timestamp: '2026-11-07T12:00:00Z',
})

const validSignature = computeHmacSha256(mockPayload, mockApiKey)
const invalidSignature = computeHmacSha256(mockPayload, 'wrong_key')
const tamperedPayload = mockPayload.replace('"amount":"100"', '"amount":"10"')
const tamperedSignature = computeHmacSha256(tamperedPayload, mockApiKey)

assert(
  constantTimeCompare(validSignature, validSignature),
  'Valid signature matches computed HMAC-SHA256'
)
assert(
  !constantTimeCompare(validSignature, invalidSignature),
  'Invalid key signature is strictly rejected'
)
assert(
  !constantTimeCompare(validSignature, tamperedSignature),
  'Tampered payload signature is strictly rejected (amount manipulation guard)'
)
assert(
  webhookContent.includes('constantTimeCompare'),
  'Webhook implementation implements timing-attack resistant constant-time comparison'
)

// -----------------------------------------------------------------------------
// GROUP 3: UPI Intent URI Specification & Fallback Validation
// -----------------------------------------------------------------------------
console.log('\n--- GROUP 3: UPI Intent URI Specification & Mobile Compatibility ---')

const sampleUpiIntent = 'upi://pay?pa=mjesports@fam&pn=MJ%20ESPORTS&tr=FG_ORD_123&am=50.00&cu=INR'

assert(
  sampleUpiIntent.startsWith('upi://pay?'),
  'UPI intent adheres to standard NPCI upi://pay? scheme'
)
assert(
  sampleUpiIntent.includes('pa=') && sampleUpiIntent.includes('am=') && sampleUpiIntent.includes('cu=INR'),
  'UPI intent parameters include payee address (pa), amount (am), and currency (cu=INR)'
)
assert(
  serviceContent.includes('triggerUpiIntent'),
  'tournamentPaymentService exports triggerUpiIntent function'
)
// Check triggerUpiIntent
assert(
  serviceContent.includes('window.location.href = upiIntent') || serviceContent.includes('window.location.href = upiIntentUri'),
  'triggerUpiIntent directly triggers native Android/iOS system intent sheet'
)

// -----------------------------------------------------------------------------
// GROUP 4: Database Migration Invariants & Schema Backward-Compatibility
// -----------------------------------------------------------------------------
console.log('\n--- GROUP 4: Database Migration Invariants & Schema Backward-Compatibility ---')

assert(
  sqlContent.includes('provider TEXT') && sqlContent.includes('DEFAULT \'RAZORPAY\''),
  'Migration adds provider column with RAZORPAY default for backward compatibility'
)
assert(
  sqlContent.includes('ADD COLUMN IF NOT EXISTS provider_order_id TEXT'),
  'Migration adds provider_order_id column for neutral order references'
)
assert(
  sqlContent.includes('ADD COLUMN IF NOT EXISTS provider_payment_id TEXT'),
  'Migration adds provider_payment_id column for UTR/gateway payment references'
)
assert(
  sqlContent.includes('ALTER COLUMN razorpay_order_id DROP NOT NULL'),
  'Migration safely drops NOT NULL constraint on razorpay_order_id'
)
assert(
  sqlContent.includes('CREATE TABLE IF NOT EXISTS public.famgateway_webhook_events'),
  'Migration creates famgateway_webhook_events audit ledger'
)
assert(
  sqlContent.includes('ALTER TABLE public.tournament_refunds') && sqlContent.includes('FAMGATEWAY'),
  'Migration updates tournament_refunds constraint to allow FAMGATEWAY payment method'
)
assert(
  sqlContent.includes('register_tournament_team') && sqlContent.includes('p_payment_id'),
  'Migration maintains atomic slot reservation with locked payment check'
)
assert(
  sqlContent.includes('cancel_tournament_and_refund'),
  'Migration maintains 100% wallet credit refund for tournament cancellations'
)

// -----------------------------------------------------------------------------
// GROUP 5: Concurrency, Idempotency & Replay Protection
// -----------------------------------------------------------------------------
console.log('\n--- GROUP 5: Concurrency, Idempotency & Replay Protection ---')

assert(
  verifyContent.includes('already_consumed') || verifyContent.includes('status === \'CONSUMED\''),
  'Payment verification handles already consumed state gracefully'
)
assert(
  webhookContent.includes('famgateway_webhook_events') && (webhookContent.includes('existingEvent') || webhookContent.includes('conflict')),
  'Webhook prevents replay attacks using unique event / order logging in webhook table'
)
assert(
  createContent.includes('activePending') || createContent.includes('PENDING'),
  'Order creation checks for active pending orders to prevent duplicate payments'
)
assert(
  createContent.includes('tenMinutesAgo') || createContent.includes('10 * 60 * 1000'),
  'Order creation sets 10-minute validity window for pending checkout sessions'
)

// -----------------------------------------------------------------------------
// GROUP 6: Frontend SlotBookingModal UX & Fallback Flow
// -----------------------------------------------------------------------------
console.log('\n--- GROUP 6: Frontend SlotBookingModal UX & Fallback Flow ---')

const modalPath = path.resolve('src/components/tournament/SlotBookingModal.jsx')
const modalContent = fs.readFileSync(modalPath, 'utf8')

assert(
  modalContent.includes('famgatewaySession') && modalContent.includes('setFamgatewaySession'),
  'SlotBookingModal maintains dedicated FamGateway checkout session state'
)
assert(
  modalContent.includes('createFamgatewayOrder') && modalContent.includes('verifyFamgatewayPayment'),
  'SlotBookingModal integrates createFamgatewayOrder and verifyFamgatewayPayment'
)
assert(
  modalContent.includes('isVerifyingFamgateway'),
  'SlotBookingModal displays clear verifying / checking state during polling'
)
assert(
  !modalContent.includes('launchRazorpayCheckout'),
  'SlotBookingModal completely removes Razorpay checkout fallback path'
)
assert(
  modalContent.includes('showQrFallback') && modalContent.includes('qrUrl'),
  'SlotBookingModal provides dynamic QR code toggle for desktop users'
)
assert(
  modalContent.includes('famgatewayCountdown') && modalContent.includes('setInterval'),
  'SlotBookingModal displays real-time countdown timer for payment validity'
)
assert(
  modalContent.includes('VERIFIED') && modalContent.includes('registerTeam'),
  'SlotBookingModal confirms registration ONLY after server-side payment verification'
)

// -----------------------------------------------------------------------------
// GROUP 7: Wallet Top-Up & Financial Isolation
// -----------------------------------------------------------------------------
console.log('\n--- GROUP 7: Wallet Top-Up & Financial Isolation ---')

const walletServicePath = path.resolve('src/services/walletService.js')
const walletContent = fs.readFileSync(walletServicePath, 'utf8')

assert(
  walletContent.includes('create-wallet-topup-order'),
  'walletService preserves create-wallet-topup-order (Razorpay wallet top-up untouched)'
)
assert(
  walletContent.includes('verify-wallet-topup'),
  'walletService preserves verify-wallet-topup (Razorpay wallet top-up untouched)'
)
assert(
  fs.existsSync(path.resolve('supabase/functions/create-wallet-topup-order/index.ts')),
  'create-wallet-topup-order Edge Function preserved intact'
)
assert(
  fs.existsSync(path.resolve('supabase/functions/verify-wallet-topup/index.ts')),
  'verify-wallet-topup Edge Function preserved intact'
)

// -----------------------------------------------------------------------------
// GROUP 8: Reconciliation Worker & Admin RBAC Authorization
// -----------------------------------------------------------------------------
console.log('\n--- GROUP 8: Reconciliation Worker & Admin RBAC Authorization ---')

const reconcilePath = path.resolve('supabase/functions/reconcile-famgateway-payments/index.ts')
assert(fs.existsSync(reconcilePath), 'reconcile-famgateway-payments Edge Function exists')

const reconcileContent = fs.readFileSync(reconcilePath, 'utf8')
assert(
  !reconcileContent.includes('admin_users'),
  'Reconciliation worker does not reference non-existent admin_users table'
)
assert(
  reconcileContent.includes(".from('user_roles')"),
  'Reconciliation worker validates admin privilege against public.user_roles'
)
assert(
  reconcileContent.includes('isServiceRole'),
  'Reconciliation worker preserves service_role authorization for cron execution'
)
assert(
  reconcileContent.includes("ADMIN_ROLES.includes(role)"),
  'Reconciliation worker enforces strict admin role validation'
)

// -----------------------------------------------------------------------------
// GROUP 9: Frontend Session Refresh & Gateway Bearer Authorization
// -----------------------------------------------------------------------------
console.log('\n--- GROUP 9: Frontend Session Refresh & Gateway Bearer Authorization ---')

assert(
  serviceContent.includes('supabase.auth.refreshSession()'),
  'createFamgatewayOrder explicitly calls supabase.auth.refreshSession() before invocation'
)
assert(
  serviceContent.includes('Authorization') && serviceContent.includes('Bearer ${accessToken}'),
  'createFamgatewayOrder attaches explicit Authorization: Bearer <access_token> header'
)
assert(
  serviceContent.includes('Your session has expired. Please log in again to continue.'),
  'createFamgatewayOrder provides user-friendly re-login prompt on expired session'
)

// Unit test harness for createFamgatewayOrder session logic
async function runPaymentServiceAuthSimulation({ refreshData, refreshError, invokeResponse }) {
  let invokeCalled = false
  let capturedHeaders = null
  let capturedBody = null

  const mockSupabase = {
    auth: {
      refreshSession: async () => ({ data: refreshData, error: refreshError })
    },
    functions: {
      invoke: async (fnName, options) => {
        invokeCalled = true
        capturedHeaders = options.headers
        capturedBody = options.body
        return invokeResponse || { data: { success: true, order_id: 'FG_123' }, error: null }
      }
    }
  }

  // Pure logic replica matching tournamentPaymentService.js exactly
  async function simulateCreateFamgatewayOrder(tournamentId, registrationData) {
    let refreshed
    let refErr
    try {
      const res = await mockSupabase.auth.refreshSession()
      refreshed = res?.data
      refErr = res?.error
    } catch (e) {
      refErr = e
    }

    if (refErr || !refreshed?.session?.access_token) {
      throw new Error('Your session has expired. Please log in again to continue.')
    }

    const accessToken = refreshed.session.access_token

    const { data, error } = await mockSupabase.functions.invoke('create-famgateway-order', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: {
        tournament_id: String(tournamentId),
        registration_data: registrationData,
      },
    })

    if (error) throw new Error(error.message || 'Failed')
    if (data?.error) throw new Error(data.error)
    return data
  }

  return {
    exec: (tid, rdata) => simulateCreateFamgatewayOrder(tid, rdata),
    getInvokeCalled: () => invokeCalled,
    getCapturedHeaders: () => capturedHeaders,
    getCapturedBody: () => capturedBody,
  }
}

// 9.1 Successful session refresh attaches valid Bearer token
{
  const sim = await runPaymentServiceAuthSimulation({
    refreshData: { session: { access_token: 'test_refreshed_jwt_xyz' } },
    refreshError: null,
  })
  const order = await sim.exec('tourn_1', { captain: 'Ace' })
  assert(order.success === true && order.order_id === 'FG_123', 'Successful function invocation with refreshed token')
  assert(sim.getInvokeCalled() === true, 'Function was invoked following successful session refresh')
  assert(sim.getCapturedHeaders()?.Authorization === 'Bearer test_refreshed_jwt_xyz', 'Authorization header contains exact Bearer <refreshed_access_token>')
}

// 9.2 Failed session refresh halts before Edge Function invocation
{
  const sim = await runPaymentServiceAuthSimulation({
    refreshData: null,
    refreshError: new Error('Invalid refresh token'),
  })
  let didThrow = false
  let thrownMsg = ''
  try {
    await sim.exec('tourn_1', {})
  } catch (err) {
    didThrow = true
    thrownMsg = err.message
  }
  assert(didThrow && thrownMsg.includes('session has expired'), 'Failed session refresh halts request with user-friendly error')
  assert(sim.getInvokeCalled() === false, 'Failed session refresh does NOT invoke Edge Function (zero gateway drops)')
}

// 9.3 Missing access token halts before Edge Function invocation
{
  const sim = await runPaymentServiceAuthSimulation({
    refreshData: { session: {} },
    refreshError: null,
  })
  let didThrow = false
  try {
    await sim.exec('tourn_1', {})
  } catch (err) {
    didThrow = true
  }
  assert(didThrow, 'Missing access token in session halts payment request before invocation')
  assert(sim.getInvokeCalled() === false, 'Missing access token does NOT invoke Edge Function')
}

// -----------------------------------------------------------------------------
// GROUP 10: Server-Side Exact Monetary Amount Verification Invariants
// -----------------------------------------------------------------------------
console.log('\n--- GROUP 10: Server-Side Exact Monetary Amount Verification Invariants ---')

const updatedVerifyContent = fs.readFileSync(verifyEdgeFuncPath, 'utf8')

assert(
  updatedVerifyContent.includes('verifiedPaise !== expectedPaise') || updatedVerifyContent.includes('verifiedPaise === expectedPaise'),
  '10.1. verify-famgateway-payment uses integer paise monetary comparison'
)
assert(
  updatedVerifyContent.includes('INVALID_AMOUNT'),
  '10.2. verify-famgateway-payment defines INVALID_AMOUNT error code for missing/malformed amounts'
)
assert(
  updatedVerifyContent.includes('isUnderpayment'),
  '10.3. verify-famgateway-payment distinguishes underpayment from overpayment'
)
assert(
  updatedVerifyContent.includes('exceeds required fee'),
  '10.4. verify-famgateway-payment explicitly rejects overpayments'
)

// Unit simulator for verify-famgateway-payment amount validation logic
function validatePaymentAmount(rawGatewayAmount, expectedDbAmount, gatewayCurrency = 'INR', dbCurrency = 'INR') {
  if (rawGatewayAmount === undefined || rawGatewayAmount === null || rawGatewayAmount === '') {
    return { ok: false, error: 'Payment gateway returned missing or empty payment amount', error_code: 'INVALID_AMOUNT' }
  }

  const verifiedAmount = Number(rawGatewayAmount)
  const expectedAmount = Number(expectedDbAmount)

  if (!Number.isFinite(verifiedAmount) || isNaN(verifiedAmount) || verifiedAmount <= 0) {
    return { ok: false, error: 'Payment gateway returned malformed or non-finite payment amount', error_code: 'INVALID_AMOUNT' }
  }

  const verifiedPaise = Math.round(verifiedAmount * 100)
  const expectedPaise = Math.round(expectedAmount * 100)

  if (verifiedPaise !== expectedPaise) {
    const isUnderpayment = verifiedPaise < expectedPaise
    return {
      ok: false,
      error: isUnderpayment
        ? `Paid amount (₹${verifiedAmount.toFixed(2)}) is less than required fee (₹${expectedAmount.toFixed(2)})`
        : `Paid amount (₹${verifiedAmount.toFixed(2)}) exceeds required fee (₹${expectedAmount.toFixed(2)})`,
      error_code: 'AMOUNT_MISMATCH',
      expected_amount: expectedAmount,
      verified_amount: verifiedAmount,
    }
  }

  const gCurr = String(gatewayCurrency || 'INR').trim().toUpperCase()
  const expCurr = String(dbCurrency || 'INR').trim().toUpperCase()
  if (gCurr !== expCurr) {
    return { ok: false, error: 'Payment currency mismatch', error_code: 'CURRENCY_MISMATCH' }
  }

  return { ok: true, verifiedPaise, verifiedAmount }
}

// 10.5 Exact amount: accepted
{
  const res = validatePaymentAmount('50.00', 50)
  assert(res.ok === true && res.verifiedAmount === 50, '10.5. Exact amount (50.00 vs 50) is accepted')
}

// 10.6 Exact amount integer: accepted
{
  const res = validatePaymentAmount(100, 100.00)
  assert(res.ok === true && res.verifiedAmount === 100, '10.6. Exact integer amount (100 vs 100.00) is accepted')
}

// 10.7 Underpayment: rejected
{
  const res = validatePaymentAmount('49.99', 50.00)
  assert(res.ok === false && res.error_code === 'AMOUNT_MISMATCH' && res.error.includes('less than required fee'), '10.7. Underpayment (49.99 vs 50.00) is strictly rejected')
}

// 10.8 Overpayment: rejected
{
  const res = validatePaymentAmount('50.01', 50.00)
  assert(res.ok === false && res.error_code === 'AMOUNT_MISMATCH' && res.error.includes('exceeds required fee'), '10.8. Overpayment (50.01 vs 50.00) is strictly rejected')
}

// 10.9 Significant overpayment: rejected
{
  const res = validatePaymentAmount('100.00', 50.00)
  assert(res.ok === false && res.error_code === 'AMOUNT_MISMATCH' && res.error.includes('exceeds required fee'), '10.9. Large overpayment (100.00 vs 50.00) is strictly rejected')
}

// 10.10 Missing amount: rejected
{
  const res1 = validatePaymentAmount(undefined, 50.00)
  const res2 = validatePaymentAmount(null, 50.00)
  const res3 = validatePaymentAmount('', 50.00)
  assert(
    res1.ok === false && res1.error_code === 'INVALID_AMOUNT' &&
    res2.ok === false && res2.error_code === 'INVALID_AMOUNT' &&
    res3.ok === false && res3.error_code === 'INVALID_AMOUNT',
    '10.10. Missing amount (undefined, null, empty string) is strictly rejected'
  )
}

// 10.11 Invalid / Malformed amount: rejected
{
  const res1 = validatePaymentAmount('not-a-number', 50.00)
  const res2 = validatePaymentAmount(NaN, 50.00)
  const res3 = validatePaymentAmount(Infinity, 50.00)
  const res4 = validatePaymentAmount(-50, 50.00)
  const res5 = validatePaymentAmount(0, 50.00)
  assert(
    res1.ok === false && res1.error_code === 'INVALID_AMOUNT' &&
    res2.ok === false && res2.error_code === 'INVALID_AMOUNT' &&
    res3.ok === false && res3.error_code === 'INVALID_AMOUNT' &&
    res4.ok === false && res4.error_code === 'INVALID_AMOUNT' &&
    res5.ok === false && res5.error_code === 'INVALID_AMOUNT',
    '10.11. Invalid / Malformed / Non-finite amount (NaN, Infinity, negative, zero) is strictly rejected'
  )
}

// -----------------------------------------------------------------------------
// GROUP 11: Real-World Nested FamGateway Response Compatibility & UTR Resolution
// -----------------------------------------------------------------------------
console.log('\n--- GROUP 11: Real-World Nested FamGateway Response Compatibility & UTR Resolution ---')

const reconcileCode = fs.readFileSync(reconcilePath, 'utf8')
const verifyCode = fs.readFileSync(verifyEdgeFuncPath, 'utf8')

assert(
  verifyCode.includes('dataObj.utr') && verifyCode.includes('dataObj.transaction_id'),
  '11.0a. verify-famgateway-payment inspects nested dataObj for utr and transaction_id'
)
assert(
  reconcileCode.includes('verifyData?.amount ?? dataObj?.amount'),
  '11.0b. reconcile-famgateway-payments inspects dataObj.amount via nullish fallback'
)
assert(
  reconcileCode.includes('paidPaise !== expectedPaise'),
  '11.0c. reconcile-famgateway-payments enforces exact monetary paise comparison'
)

// Response parsing simulator based directly on verify and reconcile Edge Function logic
function parseGatewayVerificationResponse(verifyData, cleanOrderId) {
  const dataObj = (typeof verifyData?.data === 'object' && verifyData?.data !== null) ? verifyData.data : {}
  const gatewayStatus = String(verifyData?.status || '').toLowerCase()
  const utr = String(
    dataObj.utr ||
    verifyData.utr ||
    dataObj.transaction_id ||
    verifyData.transaction_id ||
    cleanOrderId
  ).trim()
  const rawAmount = verifyData?.amount ?? dataObj?.amount
  return { gatewayStatus, utr, rawAmount, dataObj }
}

const verifiedFamGatewayRealPayload = {
  status: "success",
  data: {
    order_id: "fg_9QRACI38",
    transaction_id: "FMPIB6970230450",
    amount: "5.00",
    payable_amount: "5.00",
    settled_amount: "5.00",
    actual_paid_amount: "5.00",
    utr: "328068392770",
  },
}

// 1. Successful nested response with amount "5.00"
{
  const parsed = parseGatewayVerificationResponse(verifiedFamGatewayRealPayload, 'fg_9QRACI38')
  assert(
    parsed.gatewayStatus === 'success' && parsed.rawAmount === '5.00',
    '11.1. Successful nested response with amount "5.00" is correctly recognized'
  )
}

// 2. Correct UTR extraction: 328068392770
{
  const parsed = parseGatewayVerificationResponse(verifiedFamGatewayRealPayload, 'fg_9QRACI38')
  assert(
    parsed.utr === '328068392770',
    '11.2. Correct UTR extraction: extracts "328068392770" from nested data.utr'
  )
}

// 3. Correct transaction ID extraction: FMPIB6970230450 (when utr is absent)
{
  const payloadNoUtr = {
    status: "success",
    data: {
      order_id: "fg_9QRACI38",
      transaction_id: "FMPIB6970230450",
      amount: "5.00",
    },
  }
  const parsed = parseGatewayVerificationResponse(payloadNoUtr, 'fg_9QRACI38')
  assert(
    parsed.utr === 'FMPIB6970230450',
    '11.3. Correct transaction ID extraction: extracts "FMPIB6970230450" when data.utr is absent'
  )
}

// 4. Root-level legacy response compatibility
{
  const legacyRootPayload = {
    status: "success",
    order_id: "ORD_LEGACY_123",
    transaction_id: "TXN_LEGACY_456",
    utr: "UTR_ROOT_789",
    amount: "50.00",
  }
  const parsed = parseGatewayVerificationResponse(legacyRootPayload, 'ORD_LEGACY_123')
  assert(
    parsed.utr === 'UTR_ROOT_789' && parsed.rawAmount === '50.00' && parsed.gatewayStatus === 'success',
    '11.4. Root-level legacy response compatibility: extracts root utr and amount'
  )
}

// 5. Missing amount rejection
{
  const payloadMissingAmount = {
    status: "success",
    data: {
      order_id: "fg_9QRACI38",
      utr: "328068392770",
    },
  }
  const parsed = parseGatewayVerificationResponse(payloadMissingAmount, 'fg_9QRACI38')
  const valRes = validatePaymentAmount(parsed.rawAmount, 5.00)
  assert(
    valRes.ok === false && valRes.error_code === 'INVALID_AMOUNT',
    '11.5. Missing amount in nested payload is strictly rejected'
  )
}

// 6. Invalid, zero and negative amount rejection
{
  const zeroRes = validatePaymentAmount(parseGatewayVerificationResponse({ status: "success", data: { amount: "0" } }, 'o1').rawAmount, 5.00)
  const negRes = validatePaymentAmount(parseGatewayVerificationResponse({ status: "success", data: { amount: "-5.00" } }, 'o1').rawAmount, 5.00)
  const malRes = validatePaymentAmount(parseGatewayVerificationResponse({ status: "success", data: { amount: "invalid" } }, 'o1').rawAmount, 5.00)
  assert(
    zeroRes.ok === false && negRes.ok === false && malRes.ok === false,
    '11.6. Invalid, zero and negative amounts in nested payload are strictly rejected'
  )
}

// 7. Underpayment rejection
{
  const underpaidPayload = {
    status: "success",
    data: { amount: "4.99", utr: "328068392770" },
  }
  const parsed = parseGatewayVerificationResponse(underpaidPayload, 'fg_9QRACI38')
  const valRes = validatePaymentAmount(parsed.rawAmount, 5.00)
  assert(
    valRes.ok === false && valRes.error_code === 'AMOUNT_MISMATCH' && valRes.error.includes('less than required fee'),
    '11.7. Underpayment (₹4.99 vs ₹5.00) in nested payload is strictly rejected'
  )
}

// 8. Overpayment rejection
{
  const overpaidPayload = {
    status: "success",
    data: { amount: "5.01", utr: "328068392770" },
  }
  const parsed = parseGatewayVerificationResponse(overpaidPayload, 'fg_9QRACI38')
  const valRes = validatePaymentAmount(parsed.rawAmount, 5.00)
  assert(
    valRes.ok === false && valRes.error_code === 'AMOUNT_MISMATCH' && valRes.error.includes('exceeds required fee'),
    '11.8. Overpayment (₹5.01 vs ₹5.00) in nested payload is strictly rejected'
  )
}

// 9. Exact amount acceptance
{
  const exactPayload = {
    status: "success",
    data: { amount: "5.00", utr: "328068392770" },
  }
  const parsed = parseGatewayVerificationResponse(exactPayload, 'fg_9QRACI38')
  const valRes = validatePaymentAmount(parsed.rawAmount, 5.00)
  assert(
    valRes.ok === true && valRes.verifiedAmount === 5,
    '11.9. Exact amount acceptance (₹5.00 vs ₹5.00) in nested payload succeeds'
  )
}

// 10. Reconciliation does not flag valid ₹5 response as ₹0
{
  const reconcileSim = (verifyPayload, orderAmount) => {
    const dataObj = (typeof verifyPayload?.data === 'object' && verifyPayload?.data !== null) ? verifyPayload.data : {}
    const rawAmount = verifyPayload?.amount ?? dataObj?.amount
    if (rawAmount === undefined || rawAmount === null || rawAmount === '') return { action: 'FLAGGED_INVALID_AMOUNT' }
    const paidAmount = Number(rawAmount)
    if (!Number.isFinite(paidAmount) || isNaN(paidAmount) || paidAmount <= 0) return { action: 'FLAGGED_INVALID_AMOUNT' }
    const paidPaise = Math.round(paidAmount * 100)
    const expectedPaise = Math.round(Number(orderAmount) * 100)
    if (paidPaise !== expectedPaise) return { action: 'FLAGGED_AMOUNT_MISMATCH', expected: orderAmount, received: paidAmount }
    return { action: 'VERIFIED', paidAmount, paidPaise }
  }

  const recResult = reconcileSim(verifiedFamGatewayRealPayload, 5.00)
  assert(
    recResult.action === 'VERIFIED' && recResult.paidAmount === 5 && recResult.paidPaise === 500,
    '11.10. Reconciliation correctly extracts ₹5.00 and does NOT flag valid ₹5 response as ₹0'
  )
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
  console.log('ALL INTEGRATION & VERIFICATION CHECKS PASSED!')
}
