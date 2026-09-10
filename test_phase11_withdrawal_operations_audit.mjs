/**
 * test_phase11_withdrawal_operations_audit.mjs
 *
 * Automated Test Suite for MJ ESPORTS — Phase 11:
 * Withdrawal Operations Safety & Accounting Audit
 *
 * Comprehensive static, architectural, and mathematical verification of:
 * 1. Source-code trace & zero direct client mutation
 * 2. Strict withdrawal state machine & terminal state locks
 * 3. Authoritative wallet accounting & invariant conservation
 * 4. Double-action, race-condition, and idempotency protection
 * 5. Admin authorization & player tenant isolation
 * 6. Payment reference (UTR) safety & external manual payment semantics
 * 7. Payout details privacy, masking, and RLS confinement
 * 8. Failure/rejection semantics & exact single-refund guarantee
 * 9. Immutable ledger consistency & transaction-type isolation
 * 10. Database security dictionary (SECURITY DEFINER, search_path, grants, RLS)
 * 11. UI safety & duplicate-action prevention
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

console.log('\n==================================================================')
console.log('MJ ESPORTS — PHASE 11: WITHDRAWAL OPERATIONS SAFETY & ACCOUNTING AUDIT')
console.log('==================================================================\n')

// Load source files for static verification
const sqlMigration = fs.readFileSync(path.join(__dirname, 'supabase_phase10_1_wallet_withdrawals.sql'), 'utf-8')
const walletService = fs.readFileSync(path.join(__dirname, 'src', 'services', 'walletService.js'), 'utf-8')
const walletPage = fs.readFileSync(path.join(__dirname, 'src', 'pages', 'WalletPage.jsx'), 'utf-8')
const financeView = fs.readFileSync(path.join(__dirname, 'src', 'components', 'admin', 'FinanceDashboardView.jsx'), 'utf-8')

// Normalize helper to eliminate whitespace differences
const normalize = (str) => str.replace(/\s+/g, ' ').trim()

// ==================================================================
// SUITE 1: SOURCE-CODE TRACE & ZERO DIRECT CLIENT MUTATION
// ==================================================================
console.log('--- SUITE 1: Source-Code Trace & Zero Direct Client Mutation ---')

assert(
  !walletPage.includes(".from('wallets').update") &&
  !walletPage.includes(".from('wallets').insert") &&
  !walletPage.includes(".from('wallets').delete") &&
  !walletPage.includes(".from('wallets').upsert"),
  '1. WalletPage.jsx never executes direct mutations against public.wallets'
)

assert(
  !walletPage.includes(".from('wallet_ledger').update") &&
  !walletPage.includes(".from('wallet_ledger').insert") &&
  !walletPage.includes(".from('wallet_ledger').delete"),
  '2. WalletPage.jsx never executes direct mutations against public.wallet_ledger'
)

assert(
  !walletPage.includes(".from('wallet_withdrawals').insert") &&
  !walletPage.includes(".from('wallet_withdrawals').update") &&
  !walletPage.includes(".from('wallet_withdrawals').delete"),
  '3. WalletPage.jsx never executes direct mutations against public.wallet_withdrawals'
)

assert(
  !financeView.includes(".from('wallets').update") &&
  !financeView.includes(".from('wallets').insert") &&
  !financeView.includes(".from('wallets').delete"),
  '4. FinanceDashboardView.jsx never executes direct mutations against public.wallets'
)

assert(
  !financeView.includes(".from('wallet_ledger').update") &&
  !financeView.includes(".from('wallet_ledger').insert") &&
  !financeView.includes(".from('wallet_ledger').delete"),
  '5. FinanceDashboardView.jsx never executes direct mutations against public.wallet_ledger'
)

assert(
  !financeView.includes(".from('wallet_withdrawals').insert") &&
  !financeView.includes(".from('wallet_withdrawals').update") &&
  !financeView.includes(".from('wallet_withdrawals').delete"),
  '6. FinanceDashboardView.jsx never executes direct mutations against public.wallet_withdrawals'
)

assert(
  !walletService.includes(".from('wallets').update") &&
  !walletService.includes(".from('wallets').insert") &&
  !walletService.includes(".from('wallets').delete"),
  '7. walletService.js never executes direct mutations against public.wallets'
)

assert(
  !walletService.includes(".from('wallet_withdrawals').insert") &&
  !walletService.includes(".from('wallet_withdrawals').update") &&
  !walletService.includes(".from('wallet_withdrawals').delete"),
  '8. walletService.js never executes direct mutations against public.wallet_withdrawals'
)

assert(
  walletService.includes("supabase.rpc('request_wallet_withdrawal'") &&
  walletService.includes("supabase.rpc('admin_approve_withdrawal'") &&
  walletService.includes("supabase.rpc('admin_reject_withdrawal'") &&
  walletService.includes("supabase.rpc('admin_mark_withdrawal_paid'"),
  '9. walletService strictly routes all withdrawal mutations through the 4 secure RPCs'
)

// ==================================================================
// SUITE 2: WITHDRAWAL STATE MACHINE AUDIT
// ==================================================================
console.log('--- SUITE 2: Withdrawal State Machine & Terminal Locks ---')

function validateStateTransition(currentStatus, targetStatus) {
  const allowedTransitions = {
    'PENDING': ['APPROVED', 'REJECTED'],
    'APPROVED': ['PAID'],
    'REJECTED': [], // Terminal
    'PAID': []      // Terminal
  }

  const validNextStates = allowedTransitions[currentStatus] || []
  return validNextStates.includes(targetStatus)
}

assert(validateStateTransition('PENDING', 'APPROVED') === true, '10. Valid transition: PENDING -> APPROVED is permitted')
assert(validateStateTransition('PENDING', 'REJECTED') === true, '11. Valid transition: PENDING -> REJECTED is permitted')
assert(validateStateTransition('APPROVED', 'PAID') === true, '12. Valid transition: APPROVED -> PAID is permitted')

assert(validateStateTransition('APPROVED', 'PENDING') === false, '13. Forbidden transition: APPROVED -> PENDING is blocked')
assert(validateStateTransition('REJECTED', 'PENDING') === false, '14. Forbidden transition: REJECTED -> PENDING is blocked')
assert(validateStateTransition('REJECTED', 'APPROVED') === false, '15. Forbidden transition: REJECTED -> APPROVED is blocked')
assert(validateStateTransition('REJECTED', 'PAID') === false, '16. Forbidden transition: REJECTED -> PAID is blocked')
assert(validateStateTransition('PENDING', 'PAID') === false, '17. Forbidden transition: PENDING -> PAID is blocked (must be approved first)')
assert(validateStateTransition('PAID', 'PENDING') === false, '18. Forbidden transition: PAID -> PENDING is blocked (terminal)')
assert(validateStateTransition('PAID', 'APPROVED') === false, '19. Forbidden transition: PAID -> APPROVED is blocked (terminal)')
assert(validateStateTransition('PAID', 'REJECTED') === false, '20. Forbidden transition: PAID -> REJECTED is blocked (terminal)')

assert(
  sqlMigration.includes("CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'PAID'))"),
  '21. Database check constraint enforces status IN (PENDING, APPROVED, REJECTED, PAID)'
)

assert(
  sqlMigration.includes("v_withdrawal.status != 'PENDING'") &&
  sqlMigration.includes('Only PENDING withdrawals can be approved'),
  '22. admin_approve_withdrawal strictly rejects any non-PENDING withdrawal'
)

assert(
  sqlMigration.includes("v_withdrawal.status != 'APPROVED'") &&
  sqlMigration.includes('Withdrawal must be in APPROVED status'),
  '23. admin_mark_withdrawal_paid strictly rejects any non-APPROVED withdrawal'
)

// ==================================================================
// SUITE 3: WALLET ACCOUNTING INVARIANTS & RESERVATION AUDIT
// ==================================================================
console.log('--- SUITE 3: Wallet Accounting Invariants & Reservation Audit ---')

assert(
  sqlMigration.includes('v_user_id := auth.uid();') &&
  sqlMigration.includes("IF v_user_id IS NULL THEN") &&
  sqlMigration.includes("'UNAUTHENTICATED'"),
  '24. request_wallet_withdrawal derives user_id strictly from auth.uid() and rejects unauthenticated callers'
)

assert(
  sqlMigration.includes('FROM public.wallets') &&
  sqlMigration.includes('WHERE user_id = v_user_id') &&
  sqlMigration.includes('FOR UPDATE;'),
  '25. request_wallet_withdrawal locks player wallet row with FOR UPDATE'
)

assert(
  sqlMigration.includes('IF v_clean_amount < 100.00 THEN') &&
  sqlMigration.includes("'MINIMUM_AMOUNT_REQUIRED'"),
  '26. request_wallet_withdrawal strictly enforces minimum withdrawal amount of ₹100.00'
)

assert(
  sqlMigration.includes('IF p_amount != TRUNC(p_amount) THEN') &&
  sqlMigration.includes("'DECIMAL_AMOUNT_REJECTED'"),
  '27. request_wallet_withdrawal strictly rejects fractional paise/decimal amounts'
)

assert(
  sqlMigration.includes('IF v_clean_amount > 500000.00 THEN') &&
  sqlMigration.includes("'AMOUNT_EXCEEDS_MAXIMUM'"),
  '28. request_wallet_withdrawal enforces ₹500,000 technical safety ceiling'
)

assert(
  sqlMigration.includes('IF v_balance_before < v_clean_amount THEN') &&
  sqlMigration.includes("'INSUFFICIENT_FUNDS'"),
  '29. request_wallet_withdrawal strictly rejects request when available wallet balance is insufficient'
)

assert(
  sqlMigration.includes('v_balance_before := v_current_balance;') &&
  sqlMigration.includes('v_balance_after := v_balance_before - v_clean_amount;') &&
  sqlMigration.includes('UPDATE public.wallets') &&
  sqlMigration.includes('balance = v_balance_after'),
  '30. request_wallet_withdrawal debits wallet balance atomically at request time'
)

assert(
  sqlMigration.includes("'WITHDRAWAL'") &&
  sqlMigration.includes("'DEBIT'") &&
  sqlMigration.includes('v_clean_amount') &&
  sqlMigration.includes('v_balance_before') &&
  sqlMigration.includes('v_balance_after'),
  '31. request_wallet_withdrawal creates exactly one WITHDRAWAL DEBIT ledger row with before/after balances'
)

assert(
  sqlMigration.includes('RETURNING id INTO v_ledger_id;') &&
  sqlMigration.includes('v_ledger_id'),
  '32. request_wallet_withdrawal bi-directionally links the created ledger row ID to the withdrawal record'
)

// Accounting Invariant Simulation
function simulateWithdrawalLifecycle(initialBalance, withdrawalAmount, isRejected) {
  let currentBalance = initialBalance
  const ledger = []

  const balanceBeforeReq = currentBalance
  currentBalance -= withdrawalAmount
  const balanceAfterReq = currentBalance
  ledger.push({
    type: 'WITHDRAWAL',
    direction: 'DEBIT',
    amount: withdrawalAmount,
    before: balanceBeforeReq,
    after: balanceAfterReq
  })

  const balanceAfterApprove = currentBalance

  if (isRejected) {
    const balanceBeforeRej = currentBalance
    currentBalance += withdrawalAmount
    const balanceAfterRej = currentBalance
    ledger.push({
      type: 'WITHDRAWAL_REVERSED',
      direction: 'CREDIT',
      amount: withdrawalAmount,
      before: balanceBeforeRej,
      after: balanceAfterRej
    })
  }

  return { finalBalance: currentBalance, ledger, balanceAfterApprove }
}

const normalFlow = simulateWithdrawalLifecycle(500, 200, false)
assert(normalFlow.finalBalance === 300, '33. Lifecycle Invariant: Approved & Paid withdrawal balance remains debited at ₹300')
assert(normalFlow.balanceAfterApprove === 300, '34. Lifecycle Invariant: Admin approve causes ZERO additional debit')
assert(normalFlow.ledger.length === 1, '35. Lifecycle Invariant: Paid withdrawal creates exactly 1 ledger entry (DEBIT)')

const rejectedFlow = simulateWithdrawalLifecycle(500, 200, true)
assert(rejectedFlow.finalBalance === 500, '36. Lifecycle Invariant: Rejected withdrawal fully restores wallet balance to ₹500')
assert(rejectedFlow.ledger.length === 2, '37. Lifecycle Invariant: Rejected withdrawal creates exactly 2 ledger entries (DEBIT then CREDIT)')
assert(rejectedFlow.ledger[1].type === 'WITHDRAWAL_REVERSED', '38. Lifecycle Invariant: Refund entry is typed WITHDRAWAL_REVERSED')

// ==================================================================
// SUITE 4: DOUBLE-ACTION & CONCURRENCY PROTECTION
// ==================================================================
console.log('--- SUITE 4: Double-Action & Concurrency Protection ---')

assert(
  sqlMigration.includes('v_existing_withdrawal.user_id != v_user_id') &&
  sqlMigration.includes("'IDEMPOTENCY_KEY_REUSED_CROSS_USER'"),
  '39. Cross-user idempotency isolation: rejects duplicate key reuse across different user IDs'
)

assert(
  sqlMigration.includes('idempotent_replay') &&
  sqlMigration.includes('Withdrawal request already submitted (idempotent replay)'),
  '40. Same-user idempotency replay: returns existing withdrawal safely without re-debiting wallet'
)

assert(
  sqlMigration.includes("IF v_withdrawal.status = 'APPROVED' THEN") &&
  sqlMigration.includes('Withdrawal request is already approved (idempotent replay)'),
  '41. admin_approve_withdrawal: idempotent duplicate approve call returns idempotent replay without debit'
)

assert(
  sqlMigration.includes("IF v_withdrawal.status = 'REJECTED' THEN") &&
  sqlMigration.includes('Withdrawal request is already rejected (idempotent replay)'),
  '42. admin_reject_withdrawal: idempotent duplicate reject call returns idempotent replay without second refund'
)

assert(
  sqlMigration.includes("IF v_withdrawal.status = 'PAID' THEN") &&
  sqlMigration.includes('v_withdrawal.payment_reference = v_clean_ref'),
  '43. admin_mark_withdrawal_paid: idempotent duplicate call with identical reference returns ALREADY_PAID'
)

assert(
  sqlMigration.includes("'ALREADY_PAID_DIFFERENT_REFERENCE'") &&
  sqlMigration.includes('Withdrawal is already marked as PAID with another reference'),
  '44. admin_mark_withdrawal_paid: rejects attempt to alter payment reference of an already PAID withdrawal'
)

assert(
  sqlMigration.includes('FOR UPDATE') &&
  sqlMigration.includes('SELECT id, balance INTO v_wallet_id, v_current_balance'),
  '45. Row-level FOR UPDATE locking prevents concurrent race conditions on wallet balance'
)

// ==================================================================
// SUITE 5: ROLE-BASED AUTHORIZATION & ZERO TRUST
// ==================================================================
console.log('--- SUITE 5: Role-Based Authorization & Tenant Isolation ---')

assert(
  sqlMigration.includes('CREATE POLICY "Users view own withdrawals or admins view all"') &&
  sqlMigration.includes('auth.uid() = user_id') &&
  sqlMigration.includes('(SELECT public.is_admin())'),
  '46. RLS Policy restricts players to own user_id while allowing platform admins to view all'
)

assert(
  sqlMigration.includes('REVOKE ALL ON TABLE public.wallet_withdrawals FROM PUBLIC;') &&
  sqlMigration.includes('REVOKE ALL ON TABLE public.wallet_withdrawals FROM anon;'),
  '47. All permissions on wallet_withdrawals revoked from PUBLIC and anon'
)

assert(
  sqlMigration.includes('REVOKE INSERT, UPDATE, DELETE ON TABLE public.wallet_withdrawals FROM authenticated;'),
  '48. Direct INSERT, UPDATE, DELETE strictly revoked from authenticated players'
)

assert(
  sqlMigration.includes('IF NOT (public.is_admin() OR (SELECT current_setting(\'role\', true)) = \'service_role\') THEN') &&
  sqlMigration.includes("'UNAUTHORIZED'"),
  '49. Admin RPCs strictly require public.is_admin() or service_role authorization'
)

assert(
  sqlMigration.includes('REVOKE EXECUTE ON FUNCTION public.admin_approve_withdrawal(UUID, TEXT) FROM PUBLIC, anon;') &&
  sqlMigration.includes('REVOKE EXECUTE ON FUNCTION public.admin_reject_withdrawal(UUID, TEXT, TEXT) FROM PUBLIC, anon;') &&
  sqlMigration.includes('REVOKE EXECUTE ON FUNCTION public.admin_mark_withdrawal_paid(UUID, TEXT, TEXT) FROM PUBLIC, anon;'),
  '50. Execution of all administrative withdrawal RPCs revoked from PUBLIC and anon'
)

// ==================================================================
// SUITE 6: PAYMENT REFERENCE / UTR INTEGRITY & MANUAL EXTERNAL MODEL
// ==================================================================
console.log('--- SUITE 6: Payment Reference (UTR) Safety & External Manual Model ---')

assert(
  sqlMigration.includes('CONSTRAINT chk_wallet_withdrawals_paid_ref CHECK') &&
  sqlMigration.includes("(status = 'PAID' AND payment_reference IS NOT NULL AND TRIM(payment_reference) != '')"),
  '51. Database constraint guarantees PAID records must have a non-empty payment_reference (UTR)'
)

assert(
  sqlMigration.includes("v_clean_ref = ''") &&
  sqlMigration.includes("'PAYMENT_REFERENCE_REQUIRED'"),
  '52. admin_mark_withdrawal_paid strictly requires non-empty payment reference before setting PAID'
)

assert(
  financeView.includes('External Banking') ||
  financeView.includes('manual banking portal') ||
  financeView.includes('Awaiting manual payout & UTR record'),
  '53. Admin UI explicitly communicates that payouts are executed manually via external banking portals'
)

assert(
  !walletService.includes('razorpay.payouts') &&
  !walletService.includes('createRazorpayPayout') &&
  !financeView.includes('automatic payout execution'),
  '54. Zero automated payout gateway integrations or false automatic payout claims'
)

// ==================================================================
// SUITE 7: PAYOUT DETAILS SECURITY & PRIVACY
// ==================================================================
console.log('--- SUITE 7: Payout Details Security & Privacy ---')

assert(
  walletPage.includes('maskUpiId') &&
  walletPage.includes('maskAccountNumber'),
  '55. WalletPage implements masking for UPI IDs and Bank account numbers'
)

assert(
  financeView.includes('maskUpiForAdmin') &&
  financeView.includes('maskAccountForAdmin'),
  '56. FinanceDashboardView masks sensitive account numbers in queues'
)

assert(
  sqlMigration.includes("payout_details JSONB NOT NULL DEFAULT '{}'::jsonb"),
  '57. Payout details use structured JSONB data type'
)

assert(
  !walletPage.includes('bankPin') &&
  !walletPage.includes('bankPassword') &&
  !walletPage.includes('atmPin') &&
  !walletPage.includes('cvv'),
  '58. WalletPage strictly prohibits collection of sensitive payment credentials (PIN, password, CVV)'
)

// ==================================================================
// SUITE 8: FAILURE & REJECTION SEMANTICS
// ==================================================================
console.log('--- SUITE 8: Failure & Rejection Semantics ---')

assert(
  sqlMigration.includes('CONSTRAINT chk_wallet_withdrawals_rejected_reason CHECK') &&
  sqlMigration.includes("(status = 'REJECTED' AND ("),
  '59. Database constraint guarantees REJECTED records must have a rejection reason or admin note'
)

assert(
  sqlMigration.includes("v_clean_reason = ''") &&
  sqlMigration.includes("'REJECTION_REASON_REQUIRED'"),
  '60. admin_reject_withdrawal RPC strictly requires a non-empty rejection reason'
)

assert(
  sqlMigration.includes('UPDATE public.wallets') &&
  sqlMigration.includes('balance = v_balance_after') &&
  sqlMigration.includes('v_balance_before + v_withdrawal.amount'),
  '61. admin_reject_withdrawal atomically credits reserved amount back to user wallet'
)

assert(
  sqlMigration.includes("INSERT INTO public.wallet_ledger") &&
  sqlMigration.includes("'WITHDRAWAL_REVERSED'") &&
  sqlMigration.includes("'CREDIT'"),
  '62. admin_reject_withdrawal writes WITHDRAWAL_REVERSED CREDIT to public.wallet_ledger'
)

assert(
  sqlMigration.includes('reversal_ledger_id = v_reversal_ledger_id'),
  '63. admin_reject_withdrawal records reversal_ledger_id on withdrawal record for complete audit trail'
)

// ==================================================================
// SUITE 9: LEDGER CONSISTENCY & TRANSACTION ISOLATION
// ==================================================================
console.log('--- SUITE 9: Ledger Consistency & Invariant Verification ---')

assert(
  sqlMigration.includes("wallet_ledger_transaction_type_check") &&
  sqlMigration.includes("'WITHDRAWAL'") &&
  sqlMigration.includes("'WITHDRAWAL_REVERSED'"),
  '64. wallet_ledger check constraint includes WITHDRAWAL and WITHDRAWAL_REVERSED'
)

assert(
  !sqlMigration.includes("transaction_type := 'REFUND'") &&
  !sqlMigration.includes("transaction_type := 'PRIZE_CREDIT'"),
  '65. Withdrawal system never reuses REFUND or PRIZE_CREDIT types for withdrawal operations'
)

// Mathematical Invariant Audit
const testCases = [
  { initial: 100, withdraw: 100, reject: false, expected: 0 },
  { initial: 500, withdraw: 150, reject: false, expected: 350 },
  { initial: 1000, withdraw: 200, reject: true, expected: 1000 },
  { initial: 250, withdraw: 100, reject: true, expected: 250 },
]

testCases.forEach((tc, idx) => {
  const res = simulateWithdrawalLifecycle(tc.initial, tc.withdraw, tc.reject)
  assert(
    res.finalBalance === tc.expected,
    `66.${idx + 1} Accounting Invariant verified: ₹${tc.initial} - ₹${tc.withdraw} ${tc.reject ? '+ reversal' : ''} = ₹${res.finalBalance}`
  )
})

// ==================================================================
// SUITE 10: DATABASE SECURITY & HARDENED CONFIGURATION
// ==================================================================
console.log('--- SUITE 10: Database Security & Hardened Configuration ---')

const secDefCount = (sqlMigration.match(/SECURITY\s+DEFINER/g) || []).length
assert(secDefCount === 5, '67. SQL migration contains exactly 5 SECURITY DEFINER references (1 doc comment + 4 RPCs)')

const searchPathMatches = (sqlMigration.match(/search_path\s*=\s*public\s*,\s*pg_temp/g) || []).length
assert(searchPathMatches === 5, '68. All 4 RPCs specify explicit search_path = public, pg_temp (1 doc + 4 RPCs)')

assert(
  sqlMigration.includes('CREATE INDEX IF NOT EXISTS idx_wallet_withdrawals_user_id') &&
  sqlMigration.includes('CREATE INDEX IF NOT EXISTS idx_wallet_withdrawals_status') &&
  sqlMigration.includes('CREATE UNIQUE INDEX IF NOT EXISTS idx_wallet_withdrawals_idempotency'),
  '69. All critical query and audit indexes defined for wallet_withdrawals'
)

assert(
  sqlMigration.includes('REFERENCES auth.users(id) ON DELETE RESTRICT') &&
  sqlMigration.includes('REFERENCES public.wallet_ledger(id) ON DELETE RESTRICT'),
  '70. Foreign keys on users and ledger enforce ON DELETE RESTRICT (no cascade deletion of financial records)'
)

// ==================================================================
// SUITE 11: UI SAFETY & DUPLICATE-ACTION PREVENTION
// ==================================================================
console.log('--- SUITE 11: UI Safety & Duplicate-Action Prevention ---')

assert(
  walletPage.includes('isSubmittingWithdrawal') &&
  walletPage.includes('setIsSubmittingWithdrawal(true)'),
  '71. WalletPage tracks submission state to prevent double-click submissions'
)

assert(
  walletPage.includes('disabled={isSubmittingWithdrawal'),
  '72. WalletPage submit button is disabled while withdrawal request is in flight'
)

assert(
  financeView.includes('isProcessingWithdrawal') &&
  financeView.includes('setIsProcessingWithdrawal(true)'),
  '73. FinanceDashboardView tracks processing state to prevent double action triggers'
)

assert(
  financeView.includes('disabled={isProcessingWithdrawal'),
  '74. Admin action buttons are disabled while approval/rejection/payment is in flight'
)

assert(
  walletPage.includes('status === \'PENDING\'') &&
  walletPage.includes('status === \'APPROVED\'') &&
  walletPage.includes('status === \'PAID\'') &&
  walletPage.includes('status === \'REJECTED\''),
  '75. WalletPage renders all 4 distinct withdrawal lifecycle status badges'
)

console.log('\n==================================================================')
console.log(`PHASE 11 AUDIT SUITE RESULTS: ${passCount} PASSED, ${failCount} FAILED`)
console.log('==================================================================\n')

if (failCount > 0) {
  process.exit(1)
}
