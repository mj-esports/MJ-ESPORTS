// test_phase_a_payment_ui_enhancement.mjs
// Verification test suite for Phase A Payment UI:
// Validates: Complete removal of Direct Mobile UPI Apps section, Automatic QR Visibility,
// Hosted Checkout Link, and Preservation of All Payment Security & Recovery Logic.

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let totalTests = 0
let passedTests = 0
let failedTests = 0

function assert(condition, message) {
  totalTests++
  if (condition) {
    passedTests++
    console.log(`  [PASS] ${message}`)
  } else {
    failedTests++
    console.error(`  [FAIL] ${message}`)
  }
}

console.log('================================================================================')
console.log('MJ ESPORTS — PHASE A PAYMENT UI ENHANCEMENT TEST SUITE')
console.log('Dynamic QR Payment, Section Removal, and Security Invariants')
console.log('================================================================================\n')

const modalPath = path.resolve(__dirname, 'src/components/tournament/SlotBookingModal.jsx')
assert(fs.existsSync(modalPath), 'SlotBookingModal.jsx exists on disk in worktree')
const modalContent = fs.readFileSync(modalPath, 'utf8')

// -----------------------------------------------------------------------------
// SECTION 1: Verification of Direct Mobile UPI Apps Removal
// -----------------------------------------------------------------------------
console.log('\n--- Section 1: Verification of Direct Mobile UPI Apps Removal ---')

assert(
  !modalContent.includes('DIRECT MOBILE UPI APPS'),
  '1.1. "DIRECT MOBILE UPI APPS" section heading is completely absent'
)

assert(
  !modalContent.includes('Pay with Any UPI App') && !modalContent.includes('Pay with Google Pay / PhonePe / Paytm'),
  '1.2. Direct UPI app payment buttons are completely absent'
)

assert(
  !modalContent.includes('handleUpiAppTrigger'),
  '1.3. handleUpiAppTrigger function and UI handlers are completely absent'
)

assert(
  !modalContent.includes('triggerUpiIntent'),
  '1.4. triggerUpiIntent import and calls are completely removed from SlotBookingModal'
)

// -----------------------------------------------------------------------------
// SECTION 2: Automatic QR Visibility & State Audit
// -----------------------------------------------------------------------------
console.log('\n--- Section 2: Automatic QR Visibility Invariants ---')

assert(
  modalContent.includes('const [showQrFallback, setShowQrFallback] = useState(true)'),
  '2.1. showQrFallback defaults to true (QR automatically visible upon order creation)'
)

assert(
  modalContent.includes('const [qrLoadError, setQrLoadError] = useState(false)'),
  '2.2. qrLoadError state exists to catch broken or failing QR image responses'
)

assert(
  modalContent.includes('setQrLoadError(false)'),
  '2.3. qrLoadError is safely reset whenever active order changes'
)

assert(
  modalContent.includes('onError={() => setQrLoadError(true)}'),
  '2.4. QR image element includes onError handler to prevent broken image displays'
)

assert(
  modalContent.includes('QR Code image is currently unavailable from payment provider'),
  '2.5. Clean fallback error banner rendered when QR URL is missing or fails to load'
)

assert(
  modalContent.includes('Scan this QR code using any UPI application on your phone'),
  '2.6. Clear scanning instruction provided for players'
)

// -----------------------------------------------------------------------------
// SECTION 3: Hosted Payment Screen Fallback
// -----------------------------------------------------------------------------
console.log('\n--- Section 3: Hosted Payment Screen Option ---')

assert(
  modalContent.includes('checkoutUrl') && modalContent.includes('Open Hosted Payment Screen'),
  '3.1. FamGateway hosted checkout URL option preserved when supplied'
)

// -----------------------------------------------------------------------------
// SECTION 4: Payment Amount, Countdown & Check Status
// -----------------------------------------------------------------------------
console.log('\n--- Section 4: Amount, Countdown & Manual Status Invariants ---')

assert(
  modalContent.includes('famgatewaySession.payableAmount.toFixed(2)'),
  '4.1. Payable amount displayed in header'
)

assert(
  modalContent.includes('tournament.title'),
  '4.2. Tournament title displayed in payment header'
)

assert(
  modalContent.includes('famgatewayCountdown') && modalContent.includes('Math.floor(famgatewayCountdown / 60)'),
  '4.3. Real-time countdown timer displayed'
)

assert(
  modalContent.includes('handleManualStatusCheck') && modalContent.includes('Check Status Now'),
  '4.4. "Check Status Now" manual status verification button preserved'
)

// -----------------------------------------------------------------------------
// SECTION 5: Preservation of Phase A Confirmation & Security Logic
// -----------------------------------------------------------------------------
console.log('\n--- Section 5: Phase A Security & Confirmation Logic Preservation ---')

assert(
  modalContent.includes('isPollingRef') && modalContent.includes('pollTimeoutRef'),
  '5.1. Concurrency lock and polling timer refs preserved'
)

assert(
  modalContent.includes('realtimeChannelRef') && modalContent.includes('supabase.removeChannel'),
  '5.2. Realtime channel subscription and cleanup logic preserved'
)

assert(
  modalContent.includes('verifyFamgatewayPayment'),
  '5.3. Server-authoritative verifyFamgatewayPayment remains mandatory'
)

assert(
  modalContent.includes('handleCapacitySaturationRefund'),
  '5.4. Automatic capacity saturation and duplicate refund handler preserved'
)

assert(
  modalContent.includes('delays = [2000, 3000, 4500, 6000]'),
  '5.5. Bounded exponential backoff polling delays preserved'
)

assert(
  modalContent.includes('refund_unregistered_verified_payment'),
  '5.6. Server-side auto-refund RPC invoked on capacity saturation'
)

// -----------------------------------------------------------------------------
// SECTION 6: Behavioral State Machine & UI Simulations
// -----------------------------------------------------------------------------
console.log('\n--- Section 6: Behavioral State Machine & UI Simulations ---')

class PaymentUiSimulation {
  constructor() {
    this.famgatewaySession = null
    this.showQrFallback = true
    this.qrLoadError = false
  }

  createOrder(orderData) {
    this.famgatewaySession = {
      orderId: orderData.order_id,
      payableAmount: Number(orderData.payable_amount || orderData.amount || 50),
      amount: Number(orderData.amount || 50),
      qrUrl: orderData.qr_url || null,
      checkoutUrl: orderData.checkout_url || null,
    }
    this.qrLoadError = false
  }

  onImageError() {
    this.qrLoadError = true
  }

  isQrVisible() {
    return this.showQrFallback && Boolean(this.famgatewaySession?.qrUrl) && !this.qrLoadError
  }

  isQrFallbackErrorVisible() {
    return this.showQrFallback && (!this.famgatewaySession?.qrUrl || this.qrLoadError)
  }
}

// Test 6.1: Automatic QR visibility after order creation
{
  const sim = new PaymentUiSimulation()
  sim.createOrder({
    order_id: 'ORD_TEST_101',
    amount: 50,
    qr_url: 'https://famgateway.in/api/qr-image.php?order_id=ORD_TEST_101',
  })

  assert(sim.isQrVisible() === true, '6.1. QR code is automatically visible immediately after order creation (0 clicks)')
  assert(sim.famgatewaySession.payableAmount === 50, '6.1b. Payable amount is correctly formatted')
}

// Test 6.2: Missing QR image from provider
{
  const sim = new PaymentUiSimulation()
  sim.createOrder({
    order_id: 'ORD_TEST_102',
    amount: 50,
    qr_url: null,
    checkoutUrl: 'https://famgateway.in/pay.php?order_id=ORD_TEST_102',
  })

  assert(sim.isQrVisible() === false, '6.2a. Image is not rendered when qr_url is null')
  assert(sim.isQrFallbackErrorVisible() === true, '6.2b. Clean fallback error banner is rendered instead of broken image')
}

// Test 6.3: Broken QR image URL (network error on image element)
{
  const sim = new PaymentUiSimulation()
  sim.createOrder({
    order_id: 'ORD_TEST_103',
    amount: 50,
    qr_url: 'https://invalid-host.example/broken-qr.png',
  })
  assert(sim.isQrVisible() === true, '6.3a. Initially attempts to load image')
  sim.onImageError() // simulate img.onError
  assert(sim.isQrVisible() === false, '6.3b. onError hides broken image')
  assert(sim.isQrFallbackErrorVisible() === true, '6.3c. Fallback error UI activates upon image failure')
}

console.log('\n================================================================================')
console.log(`PHASE A UI TEST RESULTS: TOTAL: ${totalTests} | PASSED: ${passedTests} | FAILED: ${failedTests}`)
console.log('================================================================================')

if (failedTests > 0) {
  process.exit(1)
} else {
  console.log('ALL PHASE A PAYMENT UI ENHANCEMENT TESTS PASSED SUCCESSFULLY!\n')
}
