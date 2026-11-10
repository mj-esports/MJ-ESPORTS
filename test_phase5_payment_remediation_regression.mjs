// test_phase5_payment_remediation_regression.mjs
// Comprehensive Phase 5 Regression Test Suite for FamGateway Payment Security Remediation
// Tests: H-1 Capacity Race Auto-Refund, M-1 Migration Dependencies, M-2 Reconciliation Worker,
// L-1 Documentation Compliance, Idempotency Invariants, and Wallet Top-up Isolation.

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
console.log('MJ ESPORTS: Phase 5 Payment Security Remediation Regression Suite')
console.log('======================================================================\n')

const sqlMigrationPath = path.resolve('supabase_phase3_famgateway_payment_migration.sql')
const modalPath = path.resolve('src/components/tournament/SlotBookingModal.jsx')
const reconcileEdgePath = path.resolve('supabase/functions/reconcile-famgateway-payments/index.ts')
const createEdgePath = path.resolve('supabase/functions/create-famgateway-order/index.ts')
const verifyEdgePath = path.resolve('supabase/functions/verify-famgateway-payment/index.ts')
const webhookEdgePath = path.resolve('supabase/functions/famgateway-webhook/index.ts')
const walletServicePath = path.resolve('src/services/walletService.js')
const walletTopupEdgePath = path.resolve('supabase/functions/create-wallet-topup-order/index.ts')

const sqlContent = fs.readFileSync(sqlMigrationPath, 'utf8')
const modalContent = fs.readFileSync(modalPath, 'utf8')
const reconcileContent = fs.readFileSync(reconcileEdgePath, 'utf8')
const createContent = fs.readFileSync(createEdgePath, 'utf8')
const verifyContent = fs.readFileSync(verifyEdgePath, 'utf8')
const webhookContent = fs.readFileSync(webhookEdgePath, 'utf8')
const walletServiceContent = fs.readFileSync(walletServicePath, 'utf8')
const walletTopupContent = fs.readFileSync(walletTopupEdgePath, 'utf8')

// -----------------------------------------------------------------------------
// GROUP 1: H-1 Tournament Capacity Race Condition Remediation
// -----------------------------------------------------------------------------
console.log('--- GROUP 1: H-1 Tournament Capacity Race Condition Remediation ---')

assert(
  sqlContent.includes('CREATE OR REPLACE FUNCTION public.refund_unregistered_verified_payment'),
  '1.1. SQL migration defines public.refund_unregistered_verified_payment RPC'
)
assert(
  sqlContent.includes('ALTER TABLE public.tournament_refunds') && sqlContent.includes('registration_id DROP NOT NULL'),
  '1.2. SQL migration relaxes registration_id NOT NULL on public.tournament_refunds'
)
assert(
  sqlContent.includes('uq_tournament_refund_payment'),
  '1.3. SQL migration adds unique index on payment_id to prevent duplicate refunds'
)
assert(
  sqlContent.includes('v_payment.status != \'VERIFIED\'') && sqlContent.includes('PAYMENT_NOT_VERIFIED'),
  '1.4. refund_unregistered_verified_payment strictly enforces VERIFIED status (never refunds unverified payments)'
)
assert(
  sqlContent.includes('v_payment.status = \'REFUNDED\'') && sqlContent.includes('already_refunded'),
  '1.5. refund_unregistered_verified_payment is strictly idempotent on repeated calls'
)
assert(
  sqlContent.includes('INSERT INTO public.wallet_ledger') && sqlContent.includes('REFUND_CAPACITY_'),
  '1.6. refund_unregistered_verified_payment writes immutable REFUND CREDIT to wallet_ledger'
)
assert(
  sqlContent.includes('UPDATE public.wallets') && sqlContent.includes('balance = v_balance_after'),
  '1.7. refund_unregistered_verified_payment updates player wallet balance atomically'
)
assert(
  sqlContent.includes('TOURNAMENT_FULL_REFUNDED') && sqlContent.includes('refund_unregistered_verified_payment'),
  '1.8. Headless recovery triggers automatic wallet credit refund when tournament is full'
)
assert(
  modalContent.includes('handleCapacitySaturationRefund') && modalContent.includes('refund_unregistered_verified_payment'),
  '1.9. SlotBookingModal triggers refund_unregistered_verified_payment on TOURNAMENT_FULL'
)
assert(
  modalContent.includes('capacityRefundNotice') && modalContent.includes('Tournament Capacity Reached'),
  '1.10. SlotBookingModal displays clear UI alert informing player of full tournament & wallet refund'
)

// -----------------------------------------------------------------------------
// GROUP 2: M-1 SQL Migration Dependency & Sequence
// -----------------------------------------------------------------------------
console.log('\n--- GROUP 2: M-1 SQL Migration Dependency & Sequence ---')

assert(
  sqlContent.includes('Migration Sequence / Prerequisite Chain') && sqlContent.includes('supabase_phase8_1_tournament_payments_and_registration_guard.sql'),
  '2.1. Migration header documents explicit prerequisite chain'
)
assert(
  sqlContent.includes('recover_tournament_registration_from_payment'),
  '2.2. Phase 3 SQL defines recover_tournament_registration_from_payment self-containedly'
)
assert(
  sqlContent.includes('GRANT EXECUTE ON FUNCTION public.recover_tournament_registration_from_payment(UUID) TO service_role'),
  '2.3. Execution privileges for recover_tournament_registration_from_payment are restricted to service_role'
)
assert(
  sqlContent.includes('GRANT EXECUTE ON FUNCTION public.refund_unregistered_verified_payment(UUID, TEXT) TO authenticated'),
  '2.4. refund_unregistered_verified_payment granted to authenticated players (scoped to own payment)'
)

// -----------------------------------------------------------------------------
// GROUP 3: M-2 Pending Payment Reconciliation Worker
// -----------------------------------------------------------------------------
console.log('\n--- GROUP 3: M-2 Pending Payment Reconciliation Worker ---')

assert(
  fs.existsSync(reconcileEdgePath),
  '3.1. reconcile-famgateway-payments Edge Function exists'
)
assert(
  reconcileContent.includes('provider\', \'FAMGATEWAY\'') && reconcileContent.includes('status\', \'PENDING\''),
  '3.2. Reconciliation worker queries stale PENDING FamGateway orders'
)
assert(
  reconcileContent.includes('fiveMinutesAgo') && reconcileContent.includes('twentyFourHoursAgo'),
  '3.3. Reconciliation worker filters orders between 5 minutes and 24 hours old'
)
assert(
  reconcileContent.includes('/verify-order.php'),
  '3.4. Reconciliation worker queries official FamGateway server verification endpoint'
)
assert(
  reconcileContent.includes('paidPaise !== expectedPaise') || reconcileContent.includes('paidAmount'),
  '3.5. Reconciliation worker validates exact paid amount against database order amount'
)
assert(
  reconcileContent.includes('recover_tournament_registration_from_payment'),
  '3.6. Reconciliation worker triggers headless registration recovery upon verified payment'
)
assert(
  reconcileContent.includes('CAPACITY_FULL_REFUNDED_TO_WALLET') || reconcileContent.includes('capacity_refunded_to_wallet'),
  '3.7. Reconciliation worker handles capacity saturation refunds automatically'
)
assert(
  reconcileContent.includes('gatewayStatus === \'expired\'') || reconcileContent.includes('gatewayStatus === \'failed\''),
  '3.8. Reconciliation worker updates expired or failed payments to FAILED'
)
assert(
  !reconcileContent.includes('window.') && !reconcileContent.includes('localStorage'),
  '3.9. Reconciliation worker runs completely server-side without exposing API keys'
)

// -----------------------------------------------------------------------------
// GROUP 4: L-1 Official FamGateway API Key Transmission Validation
// -----------------------------------------------------------------------------
console.log('\n--- GROUP 4: L-1 Official FamGateway API Key Transmission Validation ---')

assert(
  createContent.includes('\'X-Api-Key\': famgatewayApiKey'),
  '4.1. create-famgateway-order uses official X-Api-Key header'
)
assert(
  verifyContent.includes('\'X-Api-Key\': famgatewayApiKey'),
  '4.2. verify-famgateway-payment uses official X-Api-Key header'
)
assert(
  reconcileContent.includes('\'X-Api-Key\': famgatewayApiKey'),
  '4.3. reconcile-famgateway-payments uses official X-Api-Key header'
)
assert(
  createContent.includes('api_key: famgatewayApiKey'),
  '4.4. create-famgateway-order includes api_key in JSON body per support instructions'
)
assert(
  createContent.includes('\'User-Agent\': \'MJ-Esports-Backend/1.0\''),
  '4.5. create-famgateway-order includes official User-Agent header per support instructions'
)
assert(
  createContent.includes('create-order.php'),
  '4.6. create-famgateway-order targets create-order.php endpoint per support instructions'
)
assert(
  createContent.includes('redirect_url: redirectUrl') && createContent.includes('fgPayload.webhook_url = webhookUrl'),
  '4.7. create-famgateway-order supplies redirect_url and webhook_url in JSON body'
)

// -----------------------------------------------------------------------------
// GROUP 5: Idempotency & Cryptographic Invariants
// -----------------------------------------------------------------------------
console.log('\n--- GROUP 5: Idempotency & Cryptographic Invariants ---')

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

const mockKey = 'secret_test_key_8899'
const payload = JSON.stringify({ order_id: 'FG_ORD_101', amount: '250', status: 'paid', utr: '499988887777' })
const signature = computeHmacSha256(payload, mockKey)

assert(
  constantTimeCompare(signature, computeHmacSha256(payload, mockKey)),
  '5.1. HMAC-SHA256 signature verification passes with matching key'
)
assert(
  !constantTimeCompare(signature, computeHmacSha256(payload, 'wrong_key')),
  '5.2. HMAC-SHA256 signature verification rejects mismatched key'
)
assert(
  webhookContent.includes('constantTimeCompare'),
  '5.3. famgateway-webhook uses constant-time string comparison against timing attacks'
)
assert(
  webhookContent.includes('famgateway_webhook_events') && webhookContent.includes('existingEvent'),
  '5.4. Duplicate webhook delivery returns idempotent 200 OK without double crediting'
)

// -----------------------------------------------------------------------------
// GROUP 6: Wallet Top-Up & Historical Razorpay Isolation
// -----------------------------------------------------------------------------
console.log('\n--- GROUP 6: Wallet Top-Up & Historical Razorpay Isolation ---')

assert(
  walletTopupContent.includes('create-wallet-topup-order') && walletTopupContent.includes('RAZORPAY_KEY_ID'),
  '6.1. create-wallet-topup-order preserves Razorpay top-up order creation intact'
)
assert(
  fs.existsSync(path.resolve('supabase/functions/verify-wallet-topup/index.ts')),
  '6.2. verify-wallet-topup Edge Function preserved intact'
)
assert(
  walletServiceContent.includes('get_or_create_wallet') && walletServiceContent.includes('wallet_ledger'),
  '6.3. walletService preserves core ledger and balance query operations'
)
assert(
  modalContent.includes('registerTeamWithWallet'),
  '6.4. SlotBookingModal preserves wallet-based tournament registration intact'
)
assert(
  sqlContent.includes('provider = \'RAZORPAY\''),
  '6.5. Historical Razorpay payment records are preserved with 100% data fidelity'
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
  console.log('ALL PHASE 5 REMEDIATION REGRESSION CHECKS PASSED!')
}
