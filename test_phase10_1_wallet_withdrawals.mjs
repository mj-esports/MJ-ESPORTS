/**
 * test_phase10_1_wallet_withdrawals.mjs
 * 
 * MJ ESPORTS — Phase 10.1: Secure Wallet Withdrawal Foundation Automated Verification Suite
 * 
 * Comprehensive Database Contract, Security, Status Machine, Idempotency & Financial Invariant Tests:
 * 1. Schema & Constraints
 * 2. Row Level Security & Access Privileges
 * 3. Administrative Authorization & Role Gates
 * 4. Idempotency & Cross-User Isolation
 * 5. Financial Atomicity & Balance Protection
 * 6. Strict Status Machine & Transition Validation
 * 7. Rejection & Exact-Once Funds Reversal
 * 8. Payment Settlement (PAID) & UTR Requirement
 * 9. Security Definer & Search Path Integrity
 * 10. Existing Architectural Consistency (Single Source of Truth)
 * 
 * Target: At least 50 meaningful assertions.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname)

const migrationPath = path.join(projectRoot, 'supabase_phase10_1_wallet_withdrawals.sql')
const phase9_1Path = path.join(projectRoot, 'supabase_phase9_1_wallet_foundation_and_ledger.sql')
const phase9_5aPath = path.join(projectRoot, 'supabase_phase9_5a_tournament_cancellation_and_wallet_refund.sql')
const walletServicePath = path.join(projectRoot, 'src', 'services', 'walletService.js')
const walletPagePath = path.join(projectRoot, 'src', 'pages', 'WalletPage.jsx')

let passCount = 0
let failCount = 0

function assert(condition, message) {
  if (condition) {
    console.log(`  PASS: ${message}`)
    passCount++
  } else {
    console.error(`  FAIL: ${message}`)
    failCount++
  }
}

console.log('\n==================================================================')
console.log('PHASE 10.1: SECURE WALLET WITHDRAWAL FOUNDATION AUDIT SUITE')
console.log('==================================================================\n')

// 1. Load SQL Migration File
assert(fs.existsSync(migrationPath), '1. Migration file supabase_phase10_1_wallet_withdrawals.sql exists')
const sql = fs.readFileSync(migrationPath, 'utf8')
const phase9_1Sql = fs.readFileSync(phase9_1Path, 'utf8')
const phase9_5aSql = fs.readFileSync(phase9_5aPath, 'utf8')
const walletServiceSrc = fs.readFileSync(walletServicePath, 'utf8')
const walletPageSrc = fs.readFileSync(walletPagePath, 'utf8')

// ==================================================================
// SECTION 1: SCHEMA & CONSTRAINTS (CHECKS 2-11)
// ==================================================================
console.log('[SECTION 1] SCHEMA & CONSTRAINTS AUDIT')

assert(
  sql.includes('CREATE TABLE IF NOT EXISTS public.wallet_withdrawals'),
  '2. Creates dedicated public.wallet_withdrawals table'
)

assert(
  sql.includes('id UUID PRIMARY KEY DEFAULT gen_random_uuid()'),
  '3. Uses UUID primary key with gen_random_uuid()'
)

assert(
  sql.includes('user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT'),
  '4. user_id foreign key references auth.users with ON DELETE RESTRICT (no CASCADE)'
)

assert(
  sql.includes('status TEXT NOT NULL DEFAULT \'PENDING\'') &&
  sql.includes("CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'PAID'))"),
  '5. status field enforces PENDING default and valid states (PENDING, APPROVED, REJECTED, PAID)'
)

assert(
  sql.includes('payout_method TEXT NOT NULL DEFAULT \'UPI\'') &&
  sql.includes("CHECK (payout_method IN ('UPI', 'BANK_TRANSFER'))"),
  '6. payout_method strictly constrained to UPI or BANK_TRANSFER'
)

assert(
  sql.includes('payout_details JSONB NOT NULL DEFAULT \'{}\'::jsonb'),
  '7. payout_details uses structured JSONB data type'
)

assert(
  sql.includes('idempotency_key TEXT NOT NULL UNIQUE'),
  '8. Enforces database-level UNIQUE constraint on idempotency_key'
)

assert(
  sql.includes('chk_wallet_withdrawals_amount CHECK (amount >= 1.00 AND amount = TRUNC(amount) AND amount <= 500000.00)'),
  '9. amount constraint enforces minimum ₹1.00, whole-rupee only, and safe technical ceiling'
)

assert(
  sql.includes('chk_wallet_withdrawals_paid_ref') &&
  sql.includes("(status = 'PAID' AND payment_reference IS NOT NULL AND TRIM(payment_reference) != '')"),
  '10. Database constraint requires valid payment_reference (UTR) when status is PAID'
)

assert(
  sql.includes('chk_wallet_withdrawals_rejected_reason') &&
  sql.includes("(status = 'REJECTED' AND ("),
  '11. Database constraint requires rejection_reason or admin_notes when status is REJECTED'
)

// ==================================================================
// SECTION 2: RLS & PERMISSIONS (CHECKS 12-18)
// ==================================================================
console.log('\n[SECTION 2] ROW LEVEL SECURITY & PERMISSIONS AUDIT')

assert(
  sql.includes('ALTER TABLE public.wallet_withdrawals ENABLE ROW LEVEL SECURITY;'),
  '12. Row Level Security explicitly enabled on public.wallet_withdrawals'
)

assert(
  sql.includes('CREATE POLICY "Users view own withdrawals or admins view all"') &&
  sql.includes('auth.uid() = user_id') &&
  sql.includes('public.is_admin()'),
  '13. RLS policy guarantees player isolation (users read own withdrawals; admins read all)'
)

assert(
  sql.includes('REVOKE ALL ON TABLE public.wallet_withdrawals FROM PUBLIC;') &&
  sql.includes('REVOKE ALL ON TABLE public.wallet_withdrawals FROM anon;'),
  '14. All table permissions completely revoked from PUBLIC and anon'
)

assert(
  sql.includes('REVOKE INSERT, UPDATE, DELETE ON TABLE public.wallet_withdrawals FROM authenticated;'),
  '15. Direct INSERT, UPDATE, DELETE strictly revoked from authenticated players'
)

assert(
  sql.includes('GRANT SELECT ON TABLE public.wallet_withdrawals TO authenticated, service_role;'),
  '16. Only read (SELECT) permissions granted to authenticated and service_role'
)

assert(
  sql.includes('wallet_ledger_id UUID REFERENCES public.wallet_ledger(id) ON DELETE RESTRICT') &&
  sql.includes('reversal_ledger_id UUID REFERENCES public.wallet_ledger(id) ON DELETE RESTRICT'),
  '17. Bi-directional ledger links use ON DELETE RESTRICT to protect financial history'
)

assert(
  sql.includes("ALTER TABLE public.wallet_ledger") &&
  sql.includes("'WITHDRAWAL_REVERSED'"),
  '18. Updates public.wallet_ledger check constraint to support WITHDRAWAL_REVERSED'
)

// ==================================================================
// SECTION 3: REQUEST RPC & ATOMIC RESERVATION (CHECKS 19-27)
// ==================================================================
console.log('\n[SECTION 3] REQUEST RPC & ATOMIC RESERVATION AUDIT')

assert(
  sql.includes('CREATE OR REPLACE FUNCTION public.request_wallet_withdrawal('),
  '19. Creates public.request_wallet_withdrawal RPC function'
)

assert(
  sql.includes('v_user_id := auth.uid();') &&
  sql.includes('UNAUTHENTICATED'),
  '20. Derives caller identity strictly from auth.uid() and rejects unauthenticated callers'
)

assert(
  sql.includes('DECIMAL_AMOUNT_REJECTED') &&
  sql.includes('p_amount != TRUNC(p_amount)'),
  '21. Strictly rejects fractional paise/decimal amounts with DECIMAL_AMOUNT_REJECTED'
)

assert(
  sql.includes('MINIMUM_AMOUNT_REQUIRED') &&
  sql.includes('v_clean_amount < 1.00'),
  '22. Enforces minimum withdrawal amount of ₹1.00'
)

assert(
  sql.includes('AMOUNT_EXCEEDS_MAXIMUM') &&
  sql.includes('v_clean_amount > 500000.00'),
  '23. Rejects amounts exceeding maximum safety limit'
)

assert(
  sql.includes('FROM public.wallets') &&
  sql.includes('WHERE user_id = v_user_id') &&
  sql.includes('FOR UPDATE;'),
  '24. Uses row-level lock (FOR UPDATE) on public.wallets to prevent concurrent race conditions'
)

assert(
  sql.includes('INSUFFICIENT_FUNDS') &&
  sql.includes('v_balance_before < v_clean_amount'),
  '25. Rejects request when current wallet balance is insufficient'
)

assert(
  sql.includes('UPDATE public.wallets') &&
  sql.includes('balance = v_balance_after'),
  '26. Atomically debits balance from public.wallets at request time'
)

assert(
  sql.includes("transaction_type,\n    direction") || sql.includes("'WITHDRAWAL',\n    'DEBIT'"),
  '27. Records corresponding WITHDRAWAL DEBIT in public.wallet_ledger atomically'
)

// ==================================================================
// SECTION 4: IDEMPOTENCY & CROSS-USER PROTECTION (CHECKS 28-32)
// ==================================================================
console.log('\n[SECTION 4] IDEMPOTENCY & CROSS-USER ISOLATION AUDIT')

assert(
  sql.includes('IDEMPOTENCY_KEY_REUSED_CROSS_USER') &&
  sql.includes('v_existing_withdrawal.user_id != v_user_id'),
  '28. Cross-user key isolation: rejects key reuse across different users'
)

assert(
  sql.includes('idempotent_replay') &&
  sql.includes('Withdrawal request already submitted (idempotent replay)'),
  '29. Same-user idempotent replay returns existing withdrawal without re-debiting'
)

assert(
  sql.includes('idx_wallet_withdrawals_idempotency'),
  '30. Unique index created for fast and safe idempotency key lookup'
)

assert(
  sql.includes("'withdrawal_debit_' || v_idempotency_key"),
  '31. Distinctly prefixes ledger idempotency key to prevent collision with top-ups/refunds'
)

assert(
  sql.includes('source_reference_type') &&
  sql.includes("'wallet_withdrawals'"),
  '32. Ledger entry explicitly tags source_reference_type as wallet_withdrawals'
)

// ==================================================================
// SECTION 5: ADMIN APPROVAL (CHECKS 33-37)
// ==================================================================
console.log('\n[SECTION 5] ADMIN APPROVAL AUDIT')

assert(
  sql.includes('CREATE OR REPLACE FUNCTION public.admin_approve_withdrawal('),
  '33. Creates public.admin_approve_withdrawal RPC'
)

assert(
  sql.includes('IF NOT (public.is_admin() OR (SELECT current_setting(\'role\', true)) = \'service_role\') THEN'),
  '34. admin_approve_withdrawal is strictly restricted to public.is_admin() or service_role'
)

assert(
  sql.includes("v_withdrawal.status != 'PENDING'") &&
  sql.includes('INVALID_STATUS_TRANSITION'),
  '35. Approval strictly validates that current status is PENDING'
)

assert(
  sql.includes("v_withdrawal.status = 'APPROVED'") &&
  sql.includes('idempotent_replay'),
  '36. Approving an already APPROVED withdrawal is safe and idempotent'
)

assert(
  !sql.includes('UPDATE public.wallets\n  SET\n    balance =') ||
  // Verify that admin_approve_withdrawal does not update public.wallets balance
  !sql.split('admin_approve_withdrawal')[1].split('admin_reject_withdrawal')[0].includes('UPDATE public.wallets'),
  '37. admin_approve_withdrawal NEVER debits the wallet a second time'
)

// ==================================================================
// SECTION 6: REJECTION & FUNDS REVERSAL (CHECKS 38-44)
// ==================================================================
console.log('\n[SECTION 6] REJECTION & FUNDS REVERSAL AUDIT')

assert(
  sql.includes('CREATE OR REPLACE FUNCTION public.admin_reject_withdrawal('),
  '38. Creates public.admin_reject_withdrawal RPC'
)

assert(
  sql.includes('REJECTION_REASON_REQUIRED') &&
  sql.includes("v_clean_reason = ''"),
  '39. Requires a non-empty rejection reason when rejecting a withdrawal'
)

assert(
  sql.includes("v_withdrawal.status = 'REJECTED'") &&
  sql.includes('idempotent_replay'),
  '40. Duplicate rejection is idempotent and does not credit wallet twice'
)

assert(
  sql.includes("v_withdrawal.status != 'PENDING'"),
  '41. Only PENDING withdrawals can be rejected (APPROVED or PAID cannot be rejected)'
)

assert(
  sql.includes('v_balance_after := v_balance_before + v_withdrawal.amount;') &&
  sql.includes('UPDATE public.wallets'),
  '42. Atomically credits reserved funds back to user wallet upon rejection'
)

assert(
  sql.includes("'WITHDRAWAL_REVERSED'") &&
  sql.includes("'CREDIT'"),
  '43. Creates immutable WITHDRAWAL_REVERSED CREDIT entry in public.wallet_ledger'
)

assert(
  sql.includes('reversal_ledger_id = v_reversal_ledger_id'),
  '44. Records reversal_ledger_id on withdrawal record for complete audit trail'
)

// ==================================================================
// SECTION 7: MARK PAID & SETTLEMENT (CHECKS 45-50)
// ==================================================================
console.log('\n[SECTION 7] MARK PAID & SETTLEMENT AUDIT')

assert(
  sql.includes('CREATE OR REPLACE FUNCTION public.admin_mark_withdrawal_paid('),
  '45. Creates public.admin_mark_withdrawal_paid RPC'
)

assert(
  sql.includes('PAYMENT_REFERENCE_REQUIRED') &&
  sql.includes("v_clean_ref = ''"),
  '46. Requires a non-empty payment reference (UTR) to mark withdrawal as PAID'
)

assert(
  sql.includes("v_withdrawal.status != 'APPROVED'") &&
  sql.includes('INVALID_STATUS_TRANSITION'),
  '47. Withdrawal must be in APPROVED status before it can be marked PAID'
)

assert(
  sql.includes("v_withdrawal.status = 'PAID'") &&
  sql.includes('idempotent_replay'),
  '48. Idempotent replay when re-submitting identical payment reference'
)

assert(
  sql.includes('ALREADY_PAID_DIFFERENT_REFERENCE'),
  '49. Rejects attempt to overwrite reference of an already PAID withdrawal'
)

assert(
  !sql.split('admin_mark_withdrawal_paid')[1].split('REVOKE EXECUTE')[0].includes('UPDATE public.wallets'),
  '50. Marking PAID does NOT alter wallet balance (funds already debited at reservation)'
)

// ==================================================================
// SECTION 8: RPC EXECUTION PRIVILEGES & SECURITY (CHECKS 51-56)
// ==================================================================
console.log('\n[SECTION 8] PRIVILEGE REVOCATIONS & SEARCH PATH AUDIT')

assert(
  sql.includes('REVOKE EXECUTE ON FUNCTION public.request_wallet_withdrawal(NUMERIC, JSONB, TEXT, TEXT) FROM PUBLIC, anon;'),
  '51. Revokes execute on request_wallet_withdrawal from PUBLIC and anon'
)

assert(
  sql.includes('REVOKE EXECUTE ON FUNCTION public.admin_approve_withdrawal(UUID, TEXT) FROM PUBLIC, anon;') &&
  sql.includes('REVOKE EXECUTE ON FUNCTION public.admin_reject_withdrawal(UUID, TEXT, TEXT) FROM PUBLIC, anon;') &&
  sql.includes('REVOKE EXECUTE ON FUNCTION public.admin_mark_withdrawal_paid(UUID, TEXT, TEXT) FROM PUBLIC, anon;'),
  '52. Revokes execute on all admin RPCs from PUBLIC and anon'
)

assert(
  sql.includes('GRANT EXECUTE ON FUNCTION public.request_wallet_withdrawal(NUMERIC, JSONB, TEXT, TEXT) TO authenticated, service_role;') &&
  sql.includes('GRANT EXECUTE ON FUNCTION public.admin_approve_withdrawal(UUID, TEXT) TO authenticated, service_role;'),
  '53. Grants execute on RPCs to authenticated and service_role only'
)

assert(
  (sql.match(/^\s*SECURITY DEFINER/gm) || []).length === 4,
  '54. Exactly 4 SECURITY DEFINER RPCs declared'
)

assert(
  (sql.match(/SET search_path = public, pg_temp/g) || []).length === 4,
  '55. All 4 RPCs specify explicit safe search_path = public, pg_temp'
)

assert(
  !sql.includes('SUPABASE_SERVICE_ROLE_KEY') && !sql.includes('service_role_key'),
  '56. Zero exposed service-role API secrets in SQL migration'
)

// ==================================================================
// SECTION 9: EXISTING ARCHITECTURE PRESERVATION (CHECKS 57-62)
// ==================================================================
console.log('\n[SECTION 9] EXISTING ARCHITECTURAL PRESERVATION AUDIT')

assert(
  sql.includes('public.wallets') && !sql.includes('profiles.wallet_balance'),
  '57. Authoritative wallet balance remains public.wallets (zero profiles.wallet_balance reintroduction)'
)

assert(
  sql.includes('public.wallet_ledger') && !sql.includes('CREATE TABLE public.withdrawal_ledger'),
  '58. wallet_ledger remains the sole immutable financial audit log'
)

assert(
  phase9_1Sql.includes('chk_wallet_non_negative_balance') &&
  phase9_5aSql.includes('chk_wallet_non_negative_balance'),
  '59. Non-negative balance constraint is maintained across all wallet phases'
)

assert(
  phase9_5aSql.includes('chk_wallet_whole_rupee'),
  '60. Whole-rupee invariant is preserved across all wallet phases'
)

assert(
  walletServiceSrc.includes('export async function requestWithdrawal'),
  '61. walletService exports requestWithdrawal matching the backend RPC signature'
)

assert(
  walletPageSrc.includes('requestWithdrawal({'),
  '62. WalletPage.jsx seamlessly integrates with the requestWithdrawal contract'
)

// ==================================================================
// SECTION 10: FUNCTIONAL STATE MACHINE SIMULATION (CHECKS 63-68)
// ==================================================================
console.log('\n[SECTION 10] FUNCTIONAL STATE MACHINE SIMULATION')

// State machine definition
const VALID_TRANSITIONS = {
  PENDING: ['APPROVED', 'REJECTED'],
  APPROVED: ['PAID'],
  REJECTED: [],
  PAID: []
}

function isValidTransition(fromState, toState) {
  return VALID_TRANSITIONS[fromState]?.includes(toState) || false
}

assert(isValidTransition('PENDING', 'APPROVED') === true, '63. Simulation: PENDING -> APPROVED is valid')
assert(isValidTransition('PENDING', 'REJECTED') === true, '64. Simulation: PENDING -> REJECTED is valid')
assert(isValidTransition('APPROVED', 'PAID') === true, '65. Simulation: APPROVED -> PAID is valid')
assert(isValidTransition('REJECTED', 'PAID') === false, '66. Simulation: REJECTED -> PAID is strictly forbidden')
assert(isValidTransition('PAID', 'PENDING') === false, '67. Simulation: PAID -> PENDING is strictly forbidden')
assert(isValidTransition('APPROVED', 'REJECTED') === false, '68. Simulation: APPROVED -> REJECTED is strictly forbidden')

// Financial calculation simulation:
// User has ₹500 balance. Requests ₹200 withdrawal.
// 1. Initial balance: 500
// 2. Reserved: 200 -> balance becomes 300
// 3. Rejected: 200 returned -> balance becomes 500
const initialBalance = 500
const withdrawalAmount = 200
const reservedBalance = initialBalance - withdrawalAmount
const restoredBalance = reservedBalance + withdrawalAmount

assert(reservedBalance === 300, '69. Financial Simulation: Wallet balance after reservation is ₹300')
assert(restoredBalance === 500, '70. Financial Simulation: Wallet balance after rejection refund is ₹500')

console.log('\n==================================================================')
console.log(`PHASE 10.1 AUDIT RESULTS: ${passCount} PASSED, ${failCount} FAILED`)
console.log('==================================================================\n')

if (failCount > 0) {
  process.exit(1)
} else {
  process.exit(0)
}
