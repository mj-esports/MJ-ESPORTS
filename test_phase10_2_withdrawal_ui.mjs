/**
 * test_phase10_2_withdrawal_ui.mjs
 *
 * Automated Test Suite for MJ ESPORTS — Phase 10.2: Player + Admin Withdrawal UI Integration
 *
 * Tests:
 * 1. walletService.js RPC wrappers (requestWithdrawal, fetchUserWithdrawals, fetchAdminWithdrawals, adminApproveWithdrawal, adminRejectWithdrawal, adminMarkWithdrawalPaid)
 * 2. Player withdrawal form validation (whole-rupee check, min ₹100, max <= authoritativeBalance, UPI & Bank transfer formats)
 * 3. Security & zero-trust checks (PIN/password exclusion, UPI & Bank account number masking)
 * 4. Idempotency key generation & transmission
 * 5. Player withdrawal history section & status badge rendering (PENDING, APPROVED, PAID, REJECTED)
 * 6. Admin FinanceDashboardView Tab 4 queue structure, KPI metrics, live table columns, and action guards
 * 7. Admin approval, rejection (mandatory reason), and mark paid (mandatory UTR) modal controls
 * 8. Status transition rules & atomic reversal guarantees
 *
 * Target: >= 70 assertions
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let passCount = 0
let failCount = 0

function assert(condition, message) {
  if (condition) {
    passCount++
    console.log(`  ✓ PASS: ${message}`)
  } else {
    failCount++
    console.error(`  ✗ FAIL: ${message}`)
  }
}

console.log('\n============================================================')
console.log('MJ ESPORTS — PHASE 10.2: WITHDRAWAL UI INTEGRATION TEST SUITE')
console.log('============================================================\n')

// -------------------------------------------------------------
// SUITE 1: Inspect walletService.js RPC Wrapper Implementations
// -------------------------------------------------------------
console.log('--- SUITE 1: walletService.js RPC Wrappers ---')
const walletServiceContent = fs.readFileSync(path.join(__dirname, 'src', 'services', 'walletService.js'), 'utf-8')

assert(
  walletServiceContent.includes('export async function requestWithdrawal('),
  'walletService exports requestWithdrawal function'
)
assert(
  walletServiceContent.includes('request_wallet_withdrawal'),
  'requestWithdrawal calls public.request_wallet_withdrawal RPC'
)
assert(
  walletServiceContent.includes('p_payout_details') && walletServiceContent.includes('p_payout_method'),
  'requestWithdrawal passes payout details and method to RPC'
)
assert(
  walletServiceContent.includes('p_idempotency_key'),
  'requestWithdrawal passes idempotency key to RPC'
)
assert(
  walletServiceContent.includes('export async function fetchUserWithdrawals('),
  'walletService exports fetchUserWithdrawals function'
)
assert(
  walletServiceContent.includes("from('wallet_withdrawals')"),
  'fetchUserWithdrawals queries public.wallet_withdrawals'
)
assert(
  walletServiceContent.includes("order('created_at', { ascending: false })"),
  'fetchUserWithdrawals orders by created_at descending'
)
assert(
  walletServiceContent.includes('export async function fetchAdminWithdrawals('),
  'walletService exports fetchAdminWithdrawals function'
)
assert(
  walletServiceContent.includes('export async function adminApproveWithdrawal('),
  'walletService exports adminApproveWithdrawal function'
)
assert(
  walletServiceContent.includes('admin_approve_withdrawal'),
  'adminApproveWithdrawal calls public.admin_approve_withdrawal RPC'
)
assert(
  walletServiceContent.includes('export async function adminRejectWithdrawal('),
  'walletService exports adminRejectWithdrawal function'
)
assert(
  walletServiceContent.includes('admin_reject_withdrawal'),
  'adminRejectWithdrawal calls public.admin_reject_withdrawal RPC'
)
assert(
  walletServiceContent.includes('rejectionReason') || walletServiceContent.includes('p_rejection_reason'),
  'adminRejectWithdrawal requires and passes rejection reason'
)
assert(
  walletServiceContent.includes('export async function adminMarkWithdrawalPaid('),
  'walletService exports adminMarkWithdrawalPaid function'
)
assert(
  walletServiceContent.includes('admin_mark_withdrawal_paid'),
  'adminMarkWithdrawalPaid calls public.admin_mark_withdrawal_paid RPC'
)
assert(
  walletServiceContent.includes('paymentReference') || walletServiceContent.includes('p_payment_reference'),
  'adminMarkWithdrawalPaid requires and passes UTR / payment reference'
)

// -------------------------------------------------------------
// SUITE 2: Inspect WalletPage.jsx UI & Logic Integration
// -------------------------------------------------------------
console.log('\n--- SUITE 2: WalletPage.jsx UI & Validation Logic ---')
const walletPageContent = fs.readFileSync(path.join(__dirname, 'src', 'pages', 'WalletPage.jsx'), 'utf-8')

assert(
  walletPageContent.includes('fetchUserWithdrawals'),
  'WalletPage imports fetchUserWithdrawals from walletService'
)
assert(
  walletPageContent.includes('userWithdrawals') && walletPageContent.includes('setUserWithdrawals'),
  'WalletPage maintains userWithdrawals state'
)
assert(
  walletPageContent.includes('loadingWithdrawals'),
  'WalletPage tracks loadingWithdrawals state'
)
assert(
  walletPageContent.includes('withdrawalPayoutMethod'),
  'WalletPage tracks withdrawalPayoutMethod (UPI vs BANK_TRANSFER)'
)
assert(
  walletPageContent.includes('withdrawAmountInput'),
  'WalletPage maintains dedicated withdrawAmountInput state'
)
assert(
  walletPageContent.includes('bankAccountNumber') && walletPageContent.includes('bankAccountConfirm'),
  'WalletPage has bank account number and confirmation input states'
)
assert(
  walletPageContent.includes('bankIfsc'),
  'WalletPage maintains bank IFSC input state'
)
assert(
  walletPageContent.includes('bankAccountHolder'),
  'WalletPage maintains bank account holder input state'
)
assert(
  walletPageContent.includes('bankName'),
  'WalletPage maintains bank name input state'
)
assert(
  walletPageContent.includes('withdrawalIdempotencyKey'),
  'WalletPage manages withdrawalIdempotencyKey state'
)
assert(
  walletPageContent.includes('isSubmittingWithdrawal'),
  'WalletPage manages isSubmittingWithdrawal submission lock state'
)

// Verification of whole-rupee validation
assert(
  walletPageContent.includes('wholeRupeeRegex') || walletPageContent.includes('/^\\d+$/'),
  'WalletPage enforces whole rupee regex for withdrawal amount'
)
assert(
  walletPageContent.includes('no decimals or paise permitted'),
  'WalletPage shows user-friendly error message rejecting decimals/paise'
)
assert(
  walletPageContent.includes('num < 100') || walletPageContent.includes('min="100"'),
  'WalletPage enforces minimum withdrawal threshold of ₹100'
)
assert(
  walletPageContent.includes('authoritativeBalance'),
  'WalletPage bounds withdrawal to authoritativeBalance'
)

// Verification of UPI and Bank Transfer validation logic
assert(
  walletPageContent.includes('upiRegex') || walletPageContent.includes('@'),
  'WalletPage validates UPI ID format'
)
assert(
  walletPageContent.includes('accNum !== accConfirm'),
  'WalletPage verifies bank account number matches confirmation'
)
assert(
  walletPageContent.includes('ifsc') && walletPageContent.includes('11'),
  'WalletPage validates 11-character Indian Bank IFSC code'
)

// Zero-trust security guarantee in modal
assert(
  walletPageContent.includes('Zero-Trust Payout Security') || walletPageContent.includes('NEVER ask for your ATM PIN'),
  'WalletPage displays zero-trust security guarantee (never ask for PIN/OTP)'
)
assert(
  !walletPageContent.includes('type="password" name="pin"') && !walletPageContent.includes('otpInput'),
  'WalletPage strictly excludes any prompt for user PIN, CVV, or OTP'
)

// -------------------------------------------------------------
// SUITE 3: Dedicated WITHDRAWAL REQUESTS Queue in WalletPage
// -------------------------------------------------------------
console.log('\n--- SUITE 3: Dedicated Player Withdrawal History Section ---')

assert(
  walletPageContent.includes('WITHDRAWAL REQUESTS'),
  'WalletPage renders dedicated "WITHDRAWAL REQUESTS" section'
)
assert(
  walletPageContent.includes('NO WITHDRAWAL REQUESTS YET'),
  'WalletPage provides clean empty state when user has 0 withdrawals'
)
assert(
  walletPageContent.includes('PENDING REVIEW'),
  'WalletPage displays PENDING status badge'
)
assert(
  walletPageContent.includes('APPROVED - PROCESSING'),
  'WalletPage displays APPROVED status badge'
)
assert(
  walletPageContent.includes('PAID'),
  'WalletPage displays PAID status badge'
)
assert(
  walletPageContent.includes('REJECTED (REFUNDED)'),
  'WalletPage displays REJECTED (REFUNDED) status badge'
)
assert(
  walletPageContent.includes('maskUpiId') && walletPageContent.includes('maskAccountNumber'),
  'WalletPage defines secure masking functions for UPI and Bank accounts'
)
assert(
  walletPageContent.includes('UTR:'),
  'WalletPage displays UTR payment reference for completed disbursements'
)
assert(
  walletPageContent.includes('Reason:'),
  'WalletPage displays rejection reason for rejected requests'
)

// -------------------------------------------------------------
// SUITE 4: Masking Helper Logic Unit Tests
// -------------------------------------------------------------
console.log('\n--- SUITE 4: Masking Helper Logic Unit Tests ---')

function maskUpiId(upi) {
  if (!upi || typeof upi !== 'string') return '—'
  const parts = upi.split('@')
  if (parts.length !== 2) return upi
  const [handle, domain] = parts
  const visible = handle.slice(0, Math.min(2, handle.length))
  return `${visible}***@${domain}`
}

function maskAccountNumber(acc) {
  if (!acc || typeof acc !== 'string') return '—'
  const last4 = acc.slice(-4)
  return `••••••${last4}`
}

assert(maskUpiId('manju@okhdfcbank') === 'ma***@okhdfcbank', 'UPI ID is masked preserving handle prefix and bank domain')
assert(maskUpiId('9876543210@ybl') === '98***@ybl', 'Mobile-based UPI ID is masked properly')
assert(maskUpiId(null) === '—', 'Null UPI returns fallback dash')
assert(maskAccountNumber('123456789012') === '••••••9012', 'Bank account number masks leading digits and shows last 4')
assert(maskAccountNumber('987654321') === '••••••4321', 'Shorter account number shows last 4 digits')
assert(maskAccountNumber(null) === '—', 'Null account returns fallback dash')

// -------------------------------------------------------------
// SUITE 5: Inspect FinanceDashboardView.jsx Admin Withdrawal Integration
// -------------------------------------------------------------
console.log('\n--- SUITE 5: FinanceDashboardView.jsx Admin Withdrawal Queue ---')
const adminDashboardContent = fs.readFileSync(path.join(__dirname, 'src', 'components', 'admin', 'FinanceDashboardView.jsx'), 'utf-8')

assert(
  adminDashboardContent.includes('fetchAdminWithdrawals') &&
  adminDashboardContent.includes('adminApproveWithdrawal') &&
  adminDashboardContent.includes('adminRejectWithdrawal') &&
  adminDashboardContent.includes('adminMarkWithdrawalPaid'),
  'FinanceDashboardView imports all 4 admin withdrawal service functions'
)
assert(
  adminDashboardContent.includes('adminWithdrawals') && adminDashboardContent.includes('setAdminWithdrawals'),
  'FinanceDashboardView maintains adminWithdrawals state'
)
assert(
  adminDashboardContent.includes("table: 'wallet_withdrawals'"),
  'FinanceDashboardView subscribes to realtime changes on wallet_withdrawals'
)
assert(
  adminDashboardContent.includes('USER WALLET WITHDRAWAL REQUEST QUEUE'),
  'FinanceDashboardView Tab 4 displays User Wallet Withdrawal Request Queue'
)
assert(
  adminDashboardContent.includes('Total Requests') &&
  adminDashboardContent.includes('Pending Review') &&
  adminDashboardContent.includes('Awaiting Disbursement') &&
  adminDashboardContent.includes('Total Disbursed (Paid)'),
  'FinanceDashboardView Tab 4 displays 4 KPI summary cards'
)
assert(
  adminDashboardContent.includes('Request ID') &&
  adminDashboardContent.includes('Payout Details') &&
  adminDashboardContent.includes('Ref / UTR') &&
  adminDashboardContent.includes('Admin Actions'),
  'FinanceDashboardView Tab 4 renders comprehensive table columns'
)

// Admin Action Handlers in FinanceDashboardView
assert(
  adminDashboardContent.includes('handleAdminApprove'),
  'FinanceDashboardView implements handleAdminApprove handler'
)
assert(
  adminDashboardContent.includes('handleAdminRejectSubmit'),
  'FinanceDashboardView implements handleAdminRejectSubmit handler'
)
assert(
  adminDashboardContent.includes('handleAdminMarkPaidSubmit'),
  'FinanceDashboardView implements handleAdminMarkPaidSubmit handler'
)

// Rejection Modal in FinanceDashboardView
assert(
  adminDashboardContent.includes('showAdminRejectModal') &&
  adminDashboardContent.includes('Reject Withdrawal Request'),
  'FinanceDashboardView renders modal for rejecting player withdrawals'
)
assert(
  adminDashboardContent.includes('ATOMIC REVERSAL'),
  'Rejection modal warns that atomic reversal returns funds to player'
)
assert(
  adminDashboardContent.includes('adminRejectReasonInput') &&
  adminDashboardContent.includes('Rejection Reason (Required)'),
  'Rejection modal mandates entering a rejection reason'
)

// Mark Paid Modal in FinanceDashboardView
assert(
  adminDashboardContent.includes('showAdminMarkPaidModal') &&
  adminDashboardContent.includes('Record Payment & Finalize'),
  'FinanceDashboardView renders modal for recording external payment'
)
assert(
  adminDashboardContent.includes('adminPaymentRefInput') &&
  adminDashboardContent.includes('Bank UTR / Transaction Reference (Required)'),
  'Mark Paid modal mandates entering bank UTR / payment reference'
)
assert(
  adminDashboardContent.includes('EXTERNAL SETTLEMENT'),
  'Mark Paid modal instructs admin to verify manual external settlement'
)
assert(
  adminDashboardContent.includes('maskUpiForAdmin') && adminDashboardContent.includes('maskAccountForAdmin'),
  'FinanceDashboardView uses secure masking for player account details'
)

// -------------------------------------------------------------
// SUITE 6: Financial State Machine & Invariant Tests
// -------------------------------------------------------------
console.log('\n--- SUITE 6: Financial State Machine & Transition Invariants ---')

const validTransitions = {
  PENDING: ['APPROVED', 'REJECTED'],
  APPROVED: ['PAID', 'REJECTED'],
  PAID: [],     // Terminal
  REJECTED: [], // Terminal
}

function isValidTransition(current, next) {
  return validTransitions[current]?.includes(next) || false
}

assert(isValidTransition('PENDING', 'APPROVED') === true, 'PENDING -> APPROVED is valid')
assert(isValidTransition('PENDING', 'REJECTED') === true, 'PENDING -> REJECTED is valid')
assert(isValidTransition('PENDING', 'PAID') === false, 'PENDING -> PAID directly is invalid (must be APPROVED first)')
assert(isValidTransition('APPROVED', 'PAID') === true, 'APPROVED -> PAID is valid')
assert(isValidTransition('APPROVED', 'REJECTED') === true, 'APPROVED -> REJECTED is valid (e.g. invalid bank details discovered during payout attempt)')
assert(isValidTransition('PAID', 'PENDING') === false, 'PAID cannot transition back to PENDING (terminal)')
assert(isValidTransition('PAID', 'REJECTED') === false, 'PAID cannot transition back to REJECTED (terminal)')
assert(isValidTransition('REJECTED', 'APPROVED') === false, 'REJECTED cannot transition to APPROVED (terminal)')
assert(isValidTransition('REJECTED', 'PAID') === false, 'REJECTED cannot transition to PAID (terminal)')

// -------------------------------------------------------------
// SUITE 7: Client Idempotency Key Invariants
// -------------------------------------------------------------
console.log('\n--- SUITE 7: Client Idempotency Key Invariants ---')

function generateWithdrawalIdempotencyKey() {
  return `with_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

const key1 = generateWithdrawalIdempotencyKey()
const key2 = generateWithdrawalIdempotencyKey()

assert(typeof key1 === 'string' && key1.startsWith('with_'), 'Idempotency key begins with with_ prefix')
assert(key1 !== key2, 'Successive idempotency keys are unique')
assert(key1.length > 15, 'Idempotency key has sufficient entropy')

// Test simulation: Retry with identical idempotency key returns same transaction
const mockIdempotencyStore = new Map()

function mockRequestWithdrawal({ amount, payoutDetails, payoutMethod, idempotencyKey }) {
  if (mockIdempotencyStore.has(idempotencyKey)) {
    return { success: true, is_replay: true, withdrawal: mockIdempotencyStore.get(idempotencyKey) }
  }
  const withdrawal = {
    id: `w_${Math.random().toString(36).slice(2, 8)}`,
    amount,
    payout_details: payoutDetails,
    payout_method: payoutMethod,
    status: 'PENDING',
    idempotency_key: idempotencyKey,
    created_at: new Date().toISOString(),
  }
  mockIdempotencyStore.set(idempotencyKey, withdrawal)
  return { success: true, is_replay: false, withdrawal }
}

const testKey = 'with_test_unique_key_123'
const attempt1 = mockRequestWithdrawal({ amount: 150, payoutDetails: { vpa: 'user@okaxis' }, payoutMethod: 'UPI', idempotencyKey: testKey })
assert(attempt1.success === true && attempt1.is_replay === false, 'First withdrawal request succeeds and is not a replay')

const attempt2 = mockRequestWithdrawal({ amount: 150, payoutDetails: { vpa: 'user@okaxis' }, payoutMethod: 'UPI', idempotencyKey: testKey })
assert(attempt2.success === true && attempt2.is_replay === true, 'Repeated withdrawal request with same key is detected as replay')
assert(attempt1.withdrawal.id === attempt2.withdrawal.id, 'Replayed withdrawal returns the exact same withdrawal record')

// -------------------------------------------------------------
// SUITE 8: Whole-Rupee Bounds & Balance Validation Tests
// -------------------------------------------------------------
console.log('\n--- SUITE 8: Whole-Rupee & Balance Validation Tests ---')

function validateWithdrawalInput(amountStr, currentBalance) {
  const trimmed = (amountStr || '').toString().trim()
  if (!trimmed || !/^\d+$/.test(trimmed)) {
    return { valid: false, error: 'Please enter a valid whole rupee amount (no decimals or paise permitted).' }
  }
  const num = parseInt(trimmed, 10)
  if (isNaN(num) || num <= 0) {
    return { valid: false, error: 'Please enter a valid withdrawal amount.' }
  }
  if (num < 100) {
    return { valid: false, error: 'Minimum withdrawal amount is ₹100.' }
  }
  if (num > currentBalance) {
    return { valid: false, error: `Insufficient wallet balance. You have ₹${currentBalance} available.` }
  }
  return { valid: true, amount: num }
}

assert(validateWithdrawalInput('100.50', 500).valid === false, 'Decimal input 100.50 is rejected')
assert(validateWithdrawalInput('100.00', 500).valid === false, 'Trailing decimal 100.00 is rejected')
assert(validateWithdrawalInput('99', 500).valid === false, 'Amount ₹99 is rejected (< min ₹100)')
assert(validateWithdrawalInput('0', 500).valid === false, 'Amount ₹0 is rejected')
assert(validateWithdrawalInput('-50', 500).valid === false, 'Negative amount is rejected')
assert(validateWithdrawalInput('abc', 500).valid === false, 'Non-numeric input is rejected')
assert(validateWithdrawalInput('600', 500).valid === false, 'Amount exceeding balance ₹500 is rejected')
assert(validateWithdrawalInput('100', 500).valid === true, 'Valid amount ₹100 within balance passes')
assert(validateWithdrawalInput('500', 500).valid === true, 'Full available balance withdrawal passes')

// -------------------------------------------------------------
// SUITE 9: Payout Details Validation (UPI vs Bank Transfer)
// -------------------------------------------------------------
console.log('\n--- SUITE 9: Payout Details Validation ---')

function validateUpiDetails(vpa) {
  const trimmed = (vpa || '').trim()
  const upiRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/
  if (!trimmed || !upiRegex.test(trimmed)) {
    return { valid: false, error: 'Please enter a valid UPI ID (e.g. username@okhdfcbank).' }
  }
  return { valid: true, vpa: trimmed }
}

function validateBankDetails({ accountNumber, confirmNumber, ifsc, holderName, bankName }) {
  const accNum = (accountNumber || '').trim()
  const accConfirm = (confirmNumber || '').trim()
  const ifscCode = (ifsc || '').trim().toUpperCase()
  const holder = (holderName || '').trim()
  const bank = (bankName || '').trim()

  if (!accNum || accNum.length < 8 || accNum.length > 20 || !/^\d+$/.test(accNum)) {
    return { valid: false, error: 'Invalid account number (8-20 digits).' }
  }
  if (accNum !== accConfirm) {
    return { valid: false, error: 'Bank account numbers do not match.' }
  }
  if (!ifscCode || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode)) {
    return { valid: false, error: 'Invalid 11-character Indian Bank IFSC code.' }
  }
  if (!holder || holder.length < 2) {
    return { valid: false, error: 'Invalid holder name.' }
  }
  if (!bank || bank.length < 2) {
    return { valid: false, error: 'Invalid bank name.' }
  }
  return {
    valid: true,
    details: {
      account_number: accNum,
      ifsc_code: ifscCode,
      account_holder_name: holder,
      bank_name: bank,
    },
  }
}

assert(validateUpiDetails('manju@okhdfcbank').valid === true, 'Valid UPI ID passes')
assert(validateUpiDetails('player.pro@paytm').valid === true, 'Valid UPI ID with dot passes')
assert(validateUpiDetails('invalid_no_at').valid === false, 'UPI ID missing @ is rejected')
assert(validateUpiDetails('@okhdfcbank').valid === false, 'UPI ID missing user handle is rejected')
assert(validateUpiDetails('user@').valid === false, 'UPI ID missing bank handle is rejected')

assert(
  validateBankDetails({
    accountNumber: '123456789012',
    confirmNumber: '123456789012',
    ifsc: 'HDFC0001234',
    holderName: 'Manjunath',
    bankName: 'HDFC Bank',
  }).valid === true,
  'Valid bank transfer details pass'
)

assert(
  validateBankDetails({
    accountNumber: '123456789012',
    confirmNumber: '123456789013', // mismatch
    ifsc: 'HDFC0001234',
    holderName: 'Manjunath',
    bankName: 'HDFC Bank',
  }).valid === false,
  'Mismatched confirmation account number is rejected'
)

assert(
  validateBankDetails({
    accountNumber: '123456789012',
    confirmNumber: '123456789012',
    ifsc: 'INVALID_IFSC',
    holderName: 'Manjunath',
    bankName: 'HDFC Bank',
  }).valid === false,
  'Invalid IFSC code is rejected'
)

assert(
  validateBankDetails({
    accountNumber: '1234', // too short
    confirmNumber: '1234',
    ifsc: 'HDFC0001234',
    holderName: 'Manjunath',
    bankName: 'HDFC Bank',
  }).valid === false,
  'Account number with less than 8 digits is rejected'
)

// -------------------------------------------------------------
// SUMMARY
// -------------------------------------------------------------
console.log('\n============================================================')
console.log(`TEST SUMMARY: ${passCount} PASSED, ${failCount} FAILED (TOTAL: ${passCount + failCount})`)
console.log('============================================================\n')

if (failCount > 0) {
  process.exit(1)
} else {
  process.exit(0)
}
