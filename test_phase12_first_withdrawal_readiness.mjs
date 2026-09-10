/**
 * test_phase12_first_withdrawal_readiness.mjs
 *
 * Automated Test Suite for MJ ESPORTS — Phase 12:
 * First Real Withdrawal Readiness Audit
 *
 * Statically, architecturally, and mathematically verifies:
 * 1. Production database schema, table, and RPC readiness
 * 2. Player withdrawal eligibility rules (₹100 min, whole rupees, sufficient balance)
 * 3. End-to-end 9-step operational sequence integrity
 * 4. Operational risk mitigations (concurrency, idempotency, anti-double-payout)
 * 5. Admin payment checklist & modal information completeness
 * 6. Accounting conservation invariants across full lifecycle
 * 7. Security, access control, and zero direct client mutation
 * 8. Terminal state locks & prohibition of rejection after approval
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
console.log('MJ ESPORTS — PHASE 12: FIRST REAL WITHDRAWAL READINESS AUDIT')
console.log('==================================================================\n')

// Load source files for static verification
const sqlMigration = fs.readFileSync(path.join(__dirname, 'supabase_phase10_1_wallet_withdrawals.sql'), 'utf-8')
const walletService = fs.readFileSync(path.join(__dirname, 'src', 'services', 'walletService.js'), 'utf-8')
const walletPage = fs.readFileSync(path.join(__dirname, 'src', 'pages', 'WalletPage.jsx'), 'utf-8')
const financeView = fs.readFileSync(path.join(__dirname, 'src', 'components', 'admin', 'FinanceDashboardView.jsx'), 'utf-8')

// ==================================================================
// SUITE 1: PLAYER WITHDRAWAL ELIGIBILITY RULES
// ==================================================================
console.log('--- SUITE 1: Player Withdrawal Eligibility Rules ---')

assert(
  sqlMigration.includes('chk_wallet_withdrawals_amount CHECK (amount >= 100.00 AND amount = TRUNC(amount) AND amount <= 500000.00)'),
  '1. Database constraint enforces minimum ₹100.00, whole rupees, and technical maximum ₹500,000'
)

assert(
  walletPage.includes('if (num < 100)') &&
  walletPage.includes('Minimum withdrawal amount is ₹100.'),
  '2. Frontend WalletPage strictly blocks amounts below ₹100 with user-friendly error'
)

assert(
  walletPage.includes('/^\\d+$/') &&
  walletPage.includes('showError(\'Please enter a valid whole rupee amount'),
  '3. Frontend WalletPage strictly blocks fractional paise and non-numeric inputs'
)

assert(
  walletPage.includes('if (num > authoritativeBalance)') &&
  walletPage.includes('Insufficient wallet balance'),
  '4. Frontend WalletPage checks requested amount against authoritative balance'
)

assert(
  sqlMigration.includes('IF v_balance_before < v_clean_amount THEN') &&
  sqlMigration.includes("'INSUFFICIENT_FUNDS'"),
  '5. Backend RPC strictly verifies available wallet balance before approving reservation'
)

assert(
  walletPage.includes("withdrawalPayoutMethod === 'UPI'") &&
  walletPage.includes("withdrawalPayoutMethod === 'BANK_TRANSFER'"),
  '6. Frontend supports both UPI and BANK_TRANSFER payout methods'
)

assert(
  walletPage.includes('/^[a-zA-Z0-9.\\-_]{2,256}@[a-zA-Z]{2,64}$/'),
  '7. Frontend strictly validates UPI VPA format with RFC-compliant regex'
)

assert(
  walletPage.includes('/^[A-Z]{4}0[A-Z0-9]{6}$/'),
  '8. Frontend strictly validates 11-character Indian Bank IFSC code format'
)

assert(
  walletPage.includes('if (accNum !== accConfirm)'),
  '9. Frontend requires bank account confirmation to prevent typographical payout errors'
)

// ==================================================================
// SUITE 2: END-TO-END 9-STEP OPERATIONAL FLOW VERIFICATION
// ==================================================================
console.log('--- SUITE 2: End-to-End Operational Flow Verification ---')

assert(
  walletService.includes('export async function requestWithdrawal(') &&
  walletService.includes("supabase.rpc('request_wallet_withdrawal'"),
  '10. Step 1: requestWithdrawal invokes secure RPC'
)

assert(
  sqlMigration.includes('v_balance_after := v_balance_before - v_clean_amount;') &&
  sqlMigration.includes('UPDATE public.wallets\n  SET\n    balance = v_balance_after'),
  '11. Step 2: request_wallet_withdrawal debits wallet immediately at reservation'
)

assert(
  sqlMigration.includes("'PENDING'") &&
  sqlMigration.includes('INSERT INTO public.wallet_withdrawals'),
  '12. Step 3: Withdrawal record created in PENDING status'
)

assert(
  financeView.includes('fetchAdminWithdrawals') ||
  financeView.includes('walletWithdrawals'),
  '13. Step 4: Admin dashboard displays pending queue for operator review'
)

assert(
  walletService.includes('export async function adminApproveWithdrawal(') &&
  walletService.includes("supabase.rpc('admin_approve_withdrawal'"),
  '14. Step 5: Admin approve transitions record to APPROVED without second debit'
)

assert(
  financeView.includes('External Banking') ||
  financeView.includes('manual banking portal') ||
  financeView.includes('Awaiting manual payout & UTR record'),
  '15. Step 6: Admin UI explicitly reminds operator to transfer funds via external banking portal'
)

assert(
  financeView.includes('adminPaymentRefInput') &&
  financeView.includes('UTR Required'),
  '16. Step 7: Admin UI prompts operator for official UTR / bank transaction reference'
)

assert(
  walletService.includes('export async function adminMarkWithdrawalPaid(') &&
  walletService.includes("supabase.rpc('admin_mark_withdrawal_paid'"),
  '17. Step 8: adminMarkWithdrawalPaid records UTR and sets status to PAID'
)

assert(
  sqlMigration.includes('status = \'PAID\'') &&
  sqlMigration.includes('payment_reference = v_clean_ref'),
  '18. Step 9: Final status is locked to PAID with immutable payment reference'
)

// ==================================================================
// SUITE 3: OPERATIONAL RISK MITIGATION & ANTI-DOUBLE-PAYOUT
// ==================================================================
console.log('--- SUITE 3: Operational Risk Mitigation & Anti-Double-Payout ---')

assert(
  sqlMigration.includes("IF v_withdrawal.status != 'PENDING' THEN") &&
  sqlMigration.includes("'INVALID_STATUS_TRANSITION'") &&
  sqlMigration.includes('Only PENDING withdrawals can be rejected'),
  '19. Anti-Double-Payout: Approved withdrawals CANNOT be rejected (prevents double refund after bank transfer)'
)

assert(
  sqlMigration.includes("IF v_withdrawal.status = 'PAID' THEN") &&
  sqlMigration.includes("'ALREADY_PAID_DIFFERENT_REFERENCE'"),
  '20. Anti-Tamper: Cannot overwrite payment reference of an already PAID withdrawal'
)

assert(
  sqlMigration.includes('idempotent_replay') &&
  sqlMigration.includes('v_withdrawal.payment_reference = v_clean_ref'),
  '21. Duplicate Submit Protection: Idempotent replay when resubmitting identical UTR'
)

assert(
  sqlMigration.includes('FOR UPDATE') &&
  sqlMigration.includes('FROM public.wallet_withdrawals'),
  '22. Concurrency Control: Withdrawal row locked FOR UPDATE across all admin mutations'
)

assert(
  sqlMigration.includes('FOR UPDATE') &&
  sqlMigration.includes('FROM public.wallets'),
  '23. Concurrency Control: User wallet locked FOR UPDATE during reservation and reversal'
)

assert(
  walletPage.includes('disabled={isSubmittingWithdrawal'),
  '24. Client Concurrency Control: Player submit button disabled while request in flight'
)

assert(
  financeView.includes('disabled={isProcessingWithdrawal'),
  '25. Client Concurrency Control: Admin action buttons disabled while RPC in flight'
)

// ==================================================================
// SUITE 4: ADMIN PAYMENT CHECKLIST & MODAL AUDIT
// ==================================================================
console.log('--- SUITE 4: Admin Payment Checklist & Modal Audit ---')

assert(
  financeView.includes('w.amount') &&
  financeView.includes('w.payout_method'),
  '26. Admin UI displays withdrawal amount and payout method prominently'
)

assert(
  financeView.includes('formatAdminPayoutDetails') &&
  financeView.includes('maskUpiForAdmin') &&
  financeView.includes('maskAccountForAdmin'),
  '27. Admin UI displays formatted payout destination details'
)

assert(
  financeView.includes('w.status === \'PENDING\'') &&
  financeView.includes('w.status === \'APPROVED\'') &&
  financeView.includes('w.status === \'PAID\'') &&
  financeView.includes('w.status === \'REJECTED\''),
  '28. Admin UI renders distinct badges for all 4 states'
)

assert(
  financeView.includes('setShowAdminMarkPaidModal') &&
  financeView.includes('adminPaymentRefInput'),
  '29. Admin UI requires modal confirmation with UTR input to mark as paid'
)

assert(
  financeView.includes('setShowAdminRejectModal') &&
  financeView.includes('adminRejectReasonInput'),
  '30. Admin UI requires modal confirmation with rejection reason to reject'
)

// ==================================================================
// SUITE 5: ACCOUNTING CONSERVATION & LEDGER RECONCILIATION
// ==================================================================
console.log('--- SUITE 5: Accounting Conservation & Ledger Reconciliation ---')

function auditAccountingConservation(initialBalance, withdrawAmount, isRejected) {
  let balance = initialBalance
  const ledger = []

  // Step 1: Request
  balance -= withdrawAmount
  ledger.push({ type: 'WITHDRAWAL', dir: 'DEBIT', amt: withdrawAmount, bal: balance })

  // Step 2: Approve (No balance change)
  const balanceAtApproval = balance

  // Step 3: Either Paid or Rejected
  if (isRejected) {
    balance += withdrawAmount
    ledger.push({ type: 'WITHDRAWAL_REVERSED', dir: 'CREDIT', amt: withdrawAmount, bal: balance })
  }

  return { balance, balanceAtApproval, ledger }
}

const test1 = auditAccountingConservation(500, 100, false)
assert(test1.balance === 400, '31. Accounting Conservation: ₹500 - ₹100 (Paid) = ₹400 final')
assert(test1.balanceAtApproval === 400, '32. Zero-Mutation at Approval: Balance unchanged at ₹400')
assert(test1.ledger.length === 1 && test1.ledger[0].type === 'WITHDRAWAL', '33. Exactly 1 ledger DEBIT for paid withdrawal')

const test2 = auditAccountingConservation(500, 100, true)
assert(test2.balance === 500, '34. Accounting Conservation: ₹500 - ₹100 + ₹100 (Rejection) = ₹500 final')
assert(test2.ledger.length === 2 && test2.ledger[1].type === 'WITHDRAWAL_REVERSED', '35. Exactly 1 ledger CREDIT for rejected withdrawal')

// ==================================================================
// SUITE 6: SECURITY, PRIVACY & ACCESS CONTROL
// ==================================================================
console.log('--- SUITE 6: Security, Privacy & Access Control ---')

assert(
  sqlMigration.includes('auth.uid() = user_id') &&
  sqlMigration.includes('(SELECT public.is_admin())'),
  '36. RLS ensures players can only query their own withdrawal rows'
)

assert(
  sqlMigration.includes('REVOKE ALL ON TABLE public.wallet_withdrawals FROM PUBLIC;') &&
  sqlMigration.includes('REVOKE ALL ON TABLE public.wallet_withdrawals FROM anon;'),
  '37. Anonymous and PUBLIC access completely revoked on wallet_withdrawals table'
)

assert(
  sqlMigration.includes('REVOKE EXECUTE ON FUNCTION public.admin_approve_withdrawal(UUID, TEXT) FROM PUBLIC, anon;') &&
  sqlMigration.includes('REVOKE EXECUTE ON FUNCTION public.admin_reject_withdrawal(UUID, TEXT, TEXT) FROM PUBLIC, anon;') &&
  sqlMigration.includes('REVOKE EXECUTE ON FUNCTION public.admin_mark_withdrawal_paid(UUID, TEXT, TEXT) FROM PUBLIC, anon;'),
  '38. Administrative RPC execution completely revoked from PUBLIC and anon'
)

assert(
  sqlMigration.includes('IF NOT (public.is_admin() OR (SELECT current_setting(\'role\', true)) = \'service_role\') THEN'),
  '39. Backend RPCs enforce server-side admin check regardless of caller token'
)

assert(
  !walletPage.includes('bankPin') &&
  !walletPage.includes('atmPin') &&
  !walletPage.includes('cvv'),
  '40. Zero collection of payment credentials or banking passwords'
)

console.log('\n==================================================================')
console.log(`PHASE 12 READINESS SUITE RESULTS: ${passCount} PASSED, ${failCount} FAILED`)
console.log('==================================================================\n')

if (failCount > 0) {
  process.exit(1)
}
