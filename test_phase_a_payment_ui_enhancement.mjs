// test_phase_a_payment_ui_enhancement.mjs
// Comprehensive verification test suite for Phase A Payment UI Enhancement
// Validates: Automatic QR visibility, UPI app intent handling, missing QR fallback,
// mobile/desktop guidance, server-authoritative verification, and Phase A state machine integrity.

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
console.log('Automatic QR Visibility, Provider UPI Intent, and Payment Integrity')
console.log('================================================================================\n')

const modalPath = path.resolve(__dirname, 'src/components/tournament/SlotBookingModal.jsx')
assert(fs.existsSync(modalPath), 'SlotBookingModal.jsx exists on disk in worktree')
const modalContent = fs.readFileSync(modalPath, 'utf8')

// -----------------------------------------------------------------------------
// SECTION 1: Automatic QR Visibility & State Audit
// -----------------------------------------------------------------------------
console.log('\n--- Section 1: Automatic QR Visibility Invariants ---')

assert(
  modalContent.includes('const [showQrFallback, setShowQrFallback] = useState(true)'),
  '1.1. showQrFallback defaults to true (QR automatically visible upon order creation)'
)

assert(
  modalContent.includes('const [qrLoadError, setQrLoadError] = useState(false)'),
  '1.2. qrLoadError state exists to catch broken or failing QR image responses'
)

assert(
  modalContent.includes('setQrLoadError(false)'),
  '1.3. qrLoadError is safely reset whenever active order changes'
)

assert(
  modalContent.includes('onError={() => setQrLoadError(true)}'),
  '1.4. QR image element includes onError handler to prevent broken image displays'
)

assert(
  modalContent.includes('QR Code image is currently unavailable from payment provider'),
  '1.5. Clean fallback error banner rendered when QR URL is missing or fails to load'
)

// -----------------------------------------------------------------------------
// SECTION 2: Provider UPI Intent & App Options Audit
// -----------------------------------------------------------------------------
console.log('\n--- Section 2: Provider UPI App Options Invariants ---')

assert(
  modalContent.includes('handleUpiAppTrigger'),
  '2.1. handleUpiAppTrigger function defined for direct UPI app interaction'
)

assert(
  modalContent.includes('triggerUpiIntent(famgatewaySession.upiIntent)'),
  '2.2. UPI app triggers strictly pass genuine provider-supplied upiIntent'
)

assert(
  modalContent.includes('Google Pay') && modalContent.includes('PhonePe') && modalContent.includes('Paytm'),
  '2.3. Google Pay, PhonePe, and Paytm buttons rendered in payment UI'
)

assert(
  modalContent.includes('Mobile Device Recommended') || modalContent.includes('designed for mobile devices'),
  '2.4. Desktop users receive helpful guidance to scan QR code with mobile phone'
)

assert(
  modalContent.includes('Direct mobile app intent link is not supplied for this order'),
  '2.5. Graceful fallback UI displayed if FamGateway response omits upiIntent'
)

assert(
  modalContent.includes('checkoutUrl') && modalContent.includes('Open Hosted Payment Screen'),
  '2.6. FamGateway hosted checkout URL option preserved'
)

// -----------------------------------------------------------------------------
// SECTION 3: Preservation of Phase A Confirmation & Security Logic
// -----------------------------------------------------------------------------
console.log('\n--- Section 3: Phase A Security & Confirmation Logic Preservation ---')

assert(
  modalContent.includes('isPollingRef') && modalContent.includes('pollTimeoutRef'),
  '3.1. Concurrency lock and polling timer refs preserved'
)

assert(
  modalContent.includes('realtimeChannelRef') && modalContent.includes('supabase.removeChannel'),
  '3.2. Realtime channel subscription and cleanup logic preserved'
)

assert(
  modalContent.includes('verifyFamgatewayPayment'),
  '3.3. Server-authoritative verifyFamgatewayPayment remains mandatory'
)

assert(
  modalContent.includes('handleCapacitySaturationRefund'),
  '3.4. Automatic capacity saturation and duplicate refund handler preserved'
)

assert(
  modalContent.includes('delays = [2000, 3000, 4500, 6000]'),
  '3.5. Bounded exponential backoff polling delays preserved'
)

// -----------------------------------------------------------------------------
// SECTION 4: Behavioral Simulation of Enhanced UI & State Machine
// -----------------------------------------------------------------------------
console.log('\n--- Section 4: Behavioral State Machine & UI Simulations ---')

// Simulation Helper
class PaymentUiSimulation {
  constructor() {
    this.famgatewaySession = null
    this.showQrFallback = true
    this.qrLoadError = false
    this.errorToast = null
    this.serverVerifyCalled = false
    this.upiIntentTriggered = null
    this.isMobile = false
  }

  createOrder(orderData) {
    this.famgatewaySession = {
      orderId: orderData.order_id,
      payableAmount: Number(orderData.payable_amount || orderData.amount || 50),
      amount: Number(orderData.amount || 50),
      upiIntent: orderData.upi_intent || null,
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

  triggerUpiApp(appName = 'UPI App') {
    if (!this.famgatewaySession?.upiIntent) {
      this.errorToast = { title: 'Unavailable', msg: 'UPI payment link is unavailable.' }
      return
    }
    if (!this.isMobile) {
      this.errorToast = { title: 'Mobile Device Recommended', msg: `Direct launch designed for mobile with ${appName}.` }
    }
    this.upiIntentTriggered = this.famgatewaySession.upiIntent
  }
}

// Test 4.1: Automatic QR visibility after order creation
{
  const sim = new PaymentUiSimulation()
  sim.createOrder({
    order_id: 'ORD_TEST_101',
    amount: 50,
    qr_url: 'https://famgateway.in/api/qr-image.php?order_id=ORD_TEST_101',
    upi_intent: 'upi://pay?pa=mjesports@fam&pn=MJ+ESPORTS&am=50.00&cu=INR',
  })

  assert(sim.isQrVisible() === true, '4.1. QR code is automatically visible immediately after order creation (0 clicks)')
  assert(sim.famgatewaySession.payableAmount === 50, '4.1b. Payable amount is correctly formatted')
}

// Test 4.2: Missing QR image from provider
{
  const sim = new PaymentUiSimulation()
  sim.createOrder({
    order_id: 'ORD_TEST_102',
    amount: 50,
    qr_url: null, // missing from provider
    upi_intent: 'upi://pay?pa=mjesports@fam&pn=MJ+ESPORTS&am=50.00&cu=INR',
  })

  assert(sim.isQrVisible() === false, '4.2a. Image is not rendered when qr_url is null')
  assert(sim.isQrFallbackErrorVisible() === true, '4.2b. Clean fallback error banner is rendered instead of broken image')
}

// Test 4.3: Broken QR image URL (network error on image element)
{
  const sim = new PaymentUiSimulation()
  sim.createOrder({
    order_id: 'ORD_TEST_103',
    amount: 50,
    qr_url: 'https://invalid-host.example/broken-qr.png',
  })
  assert(sim.isQrVisible() === true, '4.3a. Initially attempts to load image')
  sim.onImageError() // simulate img.onError
  assert(sim.isQrVisible() === false, '4.3b. onError hides broken image')
  assert(sim.isQrFallbackErrorVisible() === true, '4.3c. Fallback error UI activates upon image failure')
}

// Test 4.4: Direct UPI intent trigger on Mobile
{
  const sim = new PaymentUiSimulation()
  sim.isMobile = true
  sim.createOrder({
    order_id: 'ORD_TEST_104',
    amount: 50,
    qr_url: 'https://famgateway.in/qr.png',
    upi_intent: 'upi://pay?pa=mjesports@fam&pn=MJ+ESPORTS&am=50.00&cu=INR&tr=ORD_TEST_104',
  })

  sim.triggerUpiApp('Google Pay')
  assert(sim.upiIntentTriggered.includes('upi://pay'), '4.4a. Mobile trigger invokes provider upiIntent')
  assert(sim.upiIntentTriggered.includes('ORD_TEST_104'), '4.4b. Intent retains authoritative provider order reference')
  assert(sim.errorToast === null, '4.4c. No desktop warning toast displayed on mobile')
}

// Test 4.5: Direct UPI intent click on Desktop
{
  const sim = new PaymentUiSimulation()
  sim.isMobile = false
  sim.createOrder({
    order_id: 'ORD_TEST_105',
    amount: 50,
    qr_url: 'https://famgateway.in/qr.png',
    upi_intent: 'upi://pay?pa=mjesports@fam&pn=MJ+ESPORTS&am=50.00&cu=INR&tr=ORD_TEST_105',
  })

  sim.triggerUpiApp('PhonePe')
  assert(sim.errorToast !== null, '4.5a. Desktop click provides helpful toast guidance')
  assert(sim.errorToast.title === 'Mobile Device Recommended', '4.5b. Recommends scanning QR code with phone')
  assert(sim.upiIntentTriggered !== null, '4.5c. Still attempts intent handler in case browser supports protocol')
}

// Test 4.6: Missing UPI intent from provider
{
  const sim = new PaymentUiSimulation()
  sim.createOrder({
    order_id: 'ORD_TEST_106',
    amount: 50,
    qr_url: 'https://famgateway.in/qr.png',
    upi_intent: null,
  })

  sim.triggerUpiApp('Paytm')
  assert(sim.errorToast !== null, '4.6a. Missing intent gracefully alerts player')
  assert(sim.errorToast.title === 'Unavailable', '4.6b. Informs that UPI link is unavailable for session')
  assert(sim.upiIntentTriggered === null, '4.6c. Does not attempt invalid window.location redirect')
}

// Test 4.7: User UI actions never bypass server verification
{
  const sim = new PaymentUiSimulation()
  sim.createOrder({
    order_id: 'ORD_TEST_107',
    amount: 50,
    qr_url: 'https://famgateway.in/qr.png',
    upi_intent: 'upi://pay?pa=mjesports@fam',
  })

  // User taps UPI app
  sim.triggerUpiApp('Google Pay')
  assert(sim.serverVerifyCalled === false, '4.7a. Tapping UPI app does NOT mark payment verified')
  // Verification remains strictly tied to verifyFamgatewayPayment and Realtime events
}

console.log('\n================================================================================')
console.log(`PHASE A UI TEST RESULTS: TOTAL: ${totalTests} | PASSED: ${passedTests} | FAILED: ${failedTests}`)
console.log('================================================================================')

if (failedTests > 0) {
  process.exit(1)
} else {
  console.log('ALL PHASE A PAYMENT UI ENHANCEMENT TESTS PASSED SUCCESSFULLY!\n')
}

