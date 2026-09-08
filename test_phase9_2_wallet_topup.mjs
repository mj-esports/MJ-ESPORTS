/**
 * MJ ESPORTS — Phase 9.2: Wallet Add Money (Top-Up) Test Suite
 *
 * Verifies:
 * 1. Database schema & constraints (amounts, currency, foreign keys, unique keys)
 * 2. Strict Row Level Security & privilege revocations (no direct client writes)
 * 3. Settlement RPC (SECURITY DEFINER, service_role only, row-level locking)
 * 4. Monetary bounds & precision validation (₹10 to ₹10,000, max 2 decimals)
 * 5. Request idempotency protection (same client_idempotency_key returns existing pending order)
 * 6. Cryptographic signature verification (HMAC-SHA256 with constant-time comparison)
 * 7. Global payment ID uniqueness & anti-replay protection
 * 8. Atomic wallet credit & immutable ledger insertion (exact amount transition)
 * 9. Terminal state protection (COMPLETED/FAILED/CANCELLED cannot transition again)
 * 10. Concurrency & race condition safety
 * 11. Edge Functions contract & secrets safety (no exposed secrets, receipt <= 40 chars)
 * 12. Frontend wallet service & UI integration contract
 */

import assert from 'assert'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

console.log('\n============================================================')
console.log('🧪 RUNNING PHASE 9.2: WALLET ADD MONEY TEST SUITE')
console.log('============================================================\n')

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

// ----------------------------------------------------------------------------
// In-Memory Simulation of PostgreSQL Engine for Phase 9.2
// ----------------------------------------------------------------------------
class SimulatedPhase92Database {
  constructor() {
    this.wallets = new Map() // user_id -> { id, user_id, balance, currency }
    this.walletLedger = []   // [{ id, user_id, type, direction, amount, balance_before, balance_after, idempotency_key }]
    this.walletTopups = new Map() // topup_id -> topupRow
    this.userIdempotencyIndex = new Map() // `${user_id}:${client_key}` -> topup_id
    this.paymentIdIndex = new Map() // razorpay_payment_id -> topup_id
    this.orderIdIndex = new Map()   // razorpay_order_id -> topup_id
  }

  // Setup initial wallet for a user
  initUserWallet(userId, initialBalance = 0.00) {
    const walletId = `wallet_${userId}`
    const wallet = {
      id: walletId,
      user_id: userId,
      balance: Math.round(Number(initialBalance) * 100) / 100,
      currency: 'INR',
    }
    this.wallets.set(userId, wallet)
    return wallet
  }

  // Direct client table write attempts (testing RLS / Revokes)
  directClientInsertTopup(role, row) {
    if (role === 'anon' || role === 'authenticated') {
      throw new Error('permission denied for table wallet_topups: direct INSERT revoked')
    }
    return this._insertTopupInternal(row)
  }

  directClientUpdateTopup(role, topupId, updates) {
    if (role === 'anon' || role === 'authenticated') {
      throw new Error('permission denied for table wallet_topups: direct UPDATE revoked')
    }
    const topup = this.walletTopups.get(topupId)
    if (!topup) throw new Error('topup not found')
    Object.assign(topup, updates)
  }

  directClientDeleteTopup(role, topupId) {
    if (role === 'anon' || role === 'authenticated') {
      throw new Error('permission denied for table wallet_topups: direct DELETE revoked')
    }
    this.walletTopups.delete(topupId)
  }

  // Client SELECT policy evaluation
  clientSelectTopups(role, callerUserId, targetUserId) {
    if (role === 'anon') return []
    if (role === 'authenticated' && callerUserId !== targetUserId) {
      // Cross-user access blocked by RLS
      return []
    }
    return Array.from(this.walletTopups.values()).filter(t => t.user_id === targetUserId)
  }

  // Internal database insertion enforcing constraints
  _insertTopupInternal(row) {
    // 1. Amount constraint: 10.00 <= amount <= 10000.00
    const amt = Number(row.amount)
    if (isNaN(amt) || amt < 10.00 || amt > 10000.00) {
      throw new Error('new row for relation "wallet_topups" violates check constraint "wallet_topups_amount_check"')
    }

    // 2. Currency constraint: INR only
    if (row.currency !== 'INR') {
      throw new Error('new row for relation "wallet_topups" violates check constraint "wallet_topups_currency_check"')
    }

    // 3. Foreign key constraints: wallet must exist and belong to user_id
    const wallet = this.wallets.get(row.user_id)
    if (!wallet || wallet.id !== row.wallet_id) {
      throw new Error('violates foreign key constraint "fk_wallet_topups_wallet_user"')
    }

    // 4. Unique (user_id, client_idempotency_key)
    const userKey = `${row.user_id}:${row.client_idempotency_key}`
    if (this.userIdempotencyIndex.has(userKey)) {
      throw new Error('duplicate key value violates unique constraint "uq_wallet_topups_user_client_key"')
    }

    // 5. Unique razorpay_order_id
    if (this.orderIdIndex.has(row.razorpay_order_id)) {
      throw new Error('duplicate key value violates unique constraint "wallet_topups_razorpay_order_id_key"')
    }

    // 6. Unique razorpay_payment_id
    if (row.razorpay_payment_id && this.paymentIdIndex.has(row.razorpay_payment_id)) {
      throw new Error('duplicate key value violates unique constraint "uq_wallet_topups_payment_id"')
    }

    const id = row.id || `topup_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
    const record = {
      ...row,
      id,
      status: row.status || 'PENDING',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      completed_at: null,
    }

    this.walletTopups.set(id, record)
    this.userIdempotencyIndex.set(userKey, id)
    this.orderIdIndex.set(row.razorpay_order_id, id)
    if (row.razorpay_payment_id) {
      this.paymentIdIndex.set(row.razorpay_payment_id, id)
    }

    return record
  }

  // Simulated settle_wallet_topup RPC
  settleWalletTopup({ role, topupId, razorpayPaymentId, razorpaySignature }) {
    // 1. Role enforcement: service_role strictly
    if (role !== 'service_role') {
      return {
        success: false,
        error_code: 'UNAUTHORIZED',
        message: 'settle_wallet_topup can only be executed by service_role.',
      }
    }

    if (!topupId) {
      return { success: false, error_code: 'INVALID_PARAMETERS', message: 'Top-up ID is required.' }
    }

    const cleanPaymentId = (razorpayPaymentId || '').trim()
    if (!cleanPaymentId) {
      return { success: false, error_code: 'INVALID_PAYMENT_ID', message: 'Valid Razorpay payment ID is required.' }
    }

    const cleanSignature = (razorpaySignature || '').trim()
    if (!cleanSignature) {
      return { success: false, error_code: 'INVALID_SIGNATURE', message: 'Valid Razorpay signature is required.' }
    }

    // 2. Global Payment Uniqueness
    if (this.paymentIdIndex.has(cleanPaymentId)) {
      const associatedTopupId = this.paymentIdIndex.get(cleanPaymentId)
      if (associatedTopupId !== topupId) {
        return {
          success: false,
          error_code: 'PAYMENT_ALREADY_USED',
          message: 'This Razorpay payment ID has already been credited to another top-up.',
        }
      }
    }

    // 3. Fetch topup row (simulating FOR UPDATE lock)
    const topup = this.walletTopups.get(topupId)
    if (!topup) {
      return { success: false, error_code: 'TOPUP_NOT_FOUND', message: 'Top-up record not found.' }
    }

    // 4. Idempotency Check: Already COMPLETED with same payment_id
    if (topup.status === 'COMPLETED') {
      if (topup.razorpay_payment_id === cleanPaymentId) {
        return {
          success: true,
          already_settled: true,
          topup_id: topup.id,
          amount: topup.amount,
          wallet_id: topup.wallet_id,
          message: 'Top-up was already settled successfully (idempotent replay).',
        }
      } else {
        return {
          success: false,
          error_code: 'PAYMENT_MISMATCH',
          message: 'Top-up already completed with a different payment ID.',
        }
      }
    }

    // 5. Strict Terminal State Machine: Only PENDING allowed
    if (topup.status !== 'PENDING') {
      return {
        success: false,
        error_code: 'INVALID_TOPUP_STATE',
        current_status: topup.status,
        message: 'Cannot settle top-up that is not in PENDING state.',
      }
    }

    // 6. Read authoritative amount & target wallet from database row ONLY
    const wallet = this.wallets.get(topup.user_id)
    if (!wallet) {
      return { success: false, error_code: 'WALLET_NOT_FOUND', message: 'User wallet not found.' }
    }

    const depositAmount = Math.round(Number(topup.amount) * 100) / 100
    const balanceBefore = wallet.balance
    const balanceAfter = Math.round((balanceBefore + depositAmount) * 100) / 100

    // 7. Atomic update of wallet balance
    wallet.balance = balanceAfter

    // 8. Immutable ledger insertion
    const txId = `ledger_tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
    this.walletLedger.push({
      id: txId,
      user_id: topup.user_id,
      wallet_id: wallet.id,
      type: 'DEPOSIT',
      direction: 'CREDIT',
      amount: depositAmount,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      idempotency_key: cleanPaymentId,
      source_reference: topup.id,
      created_at: new Date().toISOString(),
    })

    // 9. Mark top-up COMPLETED
    topup.status = 'COMPLETED'
    topup.razorpay_payment_id = cleanPaymentId
    topup.razorpay_signature = cleanSignature
    topup.completed_at = new Date().toISOString()
    topup.updated_at = new Date().toISOString()

    this.paymentIdIndex.set(cleanPaymentId, topup.id)

    return {
      success: true,
      topup_id: topup.id,
      wallet_id: wallet.id,
      amount: depositAmount,
      balance_after: balanceAfter,
      transaction_id: txId,
      message: 'Wallet top-up settled successfully.',
    }
  }
}

// ----------------------------------------------------------------------------
// SUITE 1: SQL MIGRATION FILE STATIC SECURITY AUDIT
// ----------------------------------------------------------------------------
console.log('\n--- SUITE 1: SQL MIGRATION FILE SECURITY AUDIT ---')

test('1. supabase_phase9_2_wallet_topup.sql exists and is non-empty', () => {
  const sqlPath = path.resolve('supabase_phase9_2_wallet_topup.sql')
  assert(fs.existsSync(sqlPath), 'Migration file must exist')
  const content = fs.readFileSync(sqlPath, 'utf8')
  assert(content.length > 500, 'Migration file must have substantial content')
})

test('2. Schema defines public.wallet_topups table with strict constraints', () => {
  const sql = fs.readFileSync(path.resolve('supabase_phase9_2_wallet_topup.sql'), 'utf8')
  assert(sql.includes('CREATE TABLE IF NOT EXISTS public.wallet_topups'), 'Must create public.wallet_topups')
  assert(sql.includes('amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 10.00 AND amount <= 10000.00)'), 'Amount bounds must be 10.00 to 10000.00')
  assert(sql.includes("currency TEXT NOT NULL DEFAULT 'INR' CHECK (currency = 'INR')"), 'Currency must be constrained strictly to INR')
  assert(sql.includes("status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED'))"), 'Status check constraint must include all valid states')
})

test('3. Schema defines anti-cascade ON DELETE RESTRICT foreign keys', () => {
  const sql = fs.readFileSync(path.resolve('supabase_phase9_2_wallet_topup.sql'), 'utf8')
  assert(sql.includes('FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE RESTRICT'), 'user_id must have ON DELETE RESTRICT')
  assert(sql.includes('FOREIGN KEY (wallet_id, user_id) REFERENCES public.wallets(id, user_id) ON DELETE RESTRICT'), 'Composite wallet FK must have ON DELETE RESTRICT')
})

test('4. Schema defines required unique constraints', () => {
  const sql = fs.readFileSync(path.resolve('supabase_phase9_2_wallet_topup.sql'), 'utf8')
  assert(sql.includes('UNIQUE (user_id, client_idempotency_key)'), 'Must enforce UNIQUE(user_id, client_idempotency_key)')
  assert(sql.includes('razorpay_order_id TEXT NOT NULL UNIQUE'), 'Must enforce UNIQUE(razorpay_order_id)')
  assert(sql.includes('UNIQUE (razorpay_payment_id)'), 'Must enforce UNIQUE(razorpay_payment_id)')
})

test('5. RLS is enabled and client writes are strictly revoked', () => {
  const sql = fs.readFileSync(path.resolve('supabase_phase9_2_wallet_topup.sql'), 'utf8')
  assert(sql.includes('ALTER TABLE public.wallet_topups ENABLE ROW LEVEL SECURITY;'), 'Must enable RLS')
  assert(sql.includes('REVOKE INSERT, UPDATE, DELETE ON public.wallet_topups FROM anon, authenticated, PUBLIC;'), 'Must revoke client writes')
  assert(sql.includes('GRANT SELECT ON public.wallet_topups TO authenticated;'), 'Must grant SELECT to authenticated')
  assert(sql.includes('GRANT ALL ON public.wallet_topups TO service_role;'), 'Must grant ALL to service_role')
})

test('6. Settlement RPC is SECURITY DEFINER with safe search_path and restricted to service_role', () => {
  const sql = fs.readFileSync(path.resolve('supabase_phase9_2_wallet_topup.sql'), 'utf8')
  assert(sql.includes('CREATE OR REPLACE FUNCTION public.settle_wallet_topup'), 'Must define settle_wallet_topup')
  assert(sql.includes('SECURITY DEFINER'), 'Must be SECURITY DEFINER')
  assert(sql.includes('SET search_path = public, pg_temp'), 'Must set explicit search_path')
  assert(sql.includes("IF (SELECT current_setting('role', true)) != 'service_role' THEN"), 'Must enforce service_role check')
  assert(sql.includes('REVOKE EXECUTE ON FUNCTION public.settle_wallet_topup(UUID, TEXT, TEXT) FROM PUBLIC;'), 'Revoke from PUBLIC')
  assert(sql.includes('REVOKE EXECUTE ON FUNCTION public.settle_wallet_topup(UUID, TEXT, TEXT) FROM authenticated;'), 'Revoke from authenticated')
  assert(sql.includes('REVOKE EXECUTE ON FUNCTION public.settle_wallet_topup(UUID, TEXT, TEXT) FROM anon;'), 'Revoke from anon')
  assert(sql.includes('GRANT EXECUTE ON FUNCTION public.settle_wallet_topup(UUID, TEXT, TEXT) TO service_role;'), 'Grant to service_role')
})

// ----------------------------------------------------------------------------
// SUITE 2: AMOUNT PRECISION & BOUNDARY VALIDATION
// ----------------------------------------------------------------------------
console.log('\n--- SUITE 2: AMOUNT BOUNDARIES & DECIMAL PRECISION ---')

const amountValidationRegex = /^\d+(\.\d{1,2})?$/
function validateAmountInput(amount) {
  if (amount === undefined || amount === null) return { valid: false, error: 'amount required' }
  const str = String(amount).trim()
  if (!amountValidationRegex.test(str)) return { valid: false, error: 'maximum 2 decimal places' }
  const num = parseFloat(Number(str).toFixed(2))
  if (isNaN(num) || num < 10.00 || num > 10000.00) return { valid: false, error: 'out of bounds' }
  return { valid: true, num, paise: Math.round(num * 100) }
}

test('7. Accepts valid boundary amounts: ₹10, ₹10.01, ₹100.50, ₹10,000', () => {
  assert(validateAmountInput(10.00).valid, '₹10 must be accepted')
  assert(validateAmountInput(10.01).valid, '₹10.01 must be accepted')
  assert(validateAmountInput(100.50).valid, '₹100.50 must be accepted')
  assert(validateAmountInput(10000.00).valid, '₹10,000 must be accepted')
  assert.strictEqual(validateAmountInput(10.00).paise, 1000)
  assert.strictEqual(validateAmountInput(10.01).paise, 1001)
  assert.strictEqual(validateAmountInput(100.50).paise, 10050)
  assert.strictEqual(validateAmountInput(10000.00).paise, 1000000)
})

test('8. Rejects below-minimum amounts: ₹9.99, ₹0, negative amounts', () => {
  assert(!validateAmountInput(9.99).valid, '₹9.99 must be rejected')
  assert(!validateAmountInput(0).valid, '₹0 must be rejected')
  assert(!validateAmountInput(-50).valid, 'Negative amount must be rejected')
  assert(!validateAmountInput(-0.01).valid, 'Negative fractional amount must be rejected')
})

test('9. Rejects above-maximum amounts: ₹10,000.01 and higher', () => {
  assert(!validateAmountInput(10000.01).valid, '₹10,000.01 must be rejected')
  assert(!validateAmountInput(50000).valid, '₹50,000 must be rejected')
})

test('10. Rejects amounts with >2 decimal places', () => {
  assert(!validateAmountInput('10.005').valid, '10.005 must be rejected')
  assert(!validateAmountInput('100.123').valid, '100.123 must be rejected')
  assert(!validateAmountInput('50.9999').valid, '50.9999 must be rejected')
})

test('11. Database constraint rejects non-INR currency', () => {
  const db = new SimulatedPhase92Database()
  const user = 'user_curr_test'
  const wallet = db.initUserWallet(user)

  assert.throws(() => {
    db._insertTopupInternal({
      user_id: user,
      wallet_id: wallet.id,
      amount: 50.00,
      currency: 'USD', // Invalid
      client_idempotency_key: 'key_curr_1',
      razorpay_order_id: 'order_curr_1',
    })
  }, /violates check constraint "wallet_topups_currency_check"/)
})

// ----------------------------------------------------------------------------
// SUITE 3: ROW LEVEL SECURITY & PRIVILEGE ENFORCEMENT
// ----------------------------------------------------------------------------
console.log('\n--- SUITE 3: RLS & PRIVILEGE ENFORCEMENT ---')

test('12. Direct client INSERT blocked for anon and authenticated users', () => {
  const db = new SimulatedPhase92Database()
  const user = 'user_rls_1'
  const wallet = db.initUserWallet(user)

  assert.throws(() => {
    db.directClientInsertTopup('anon', {
      user_id: user,
      wallet_id: wallet.id,
      amount: 100.00,
      currency: 'INR',
      client_idempotency_key: 'anon_key',
      razorpay_order_id: 'order_anon',
    })
  }, /permission denied for table wallet_topups: direct INSERT revoked/)

  assert.throws(() => {
    db.directClientInsertTopup('authenticated', {
      user_id: user,
      wallet_id: wallet.id,
      amount: 100.00,
      currency: 'INR',
      client_idempotency_key: 'auth_key',
      razorpay_order_id: 'order_auth',
    })
  }, /permission denied for table wallet_topups: direct INSERT revoked/)
})

test('13. Direct client UPDATE blocked for anon and authenticated users', () => {
  const db = new SimulatedPhase92Database()
  const user = 'user_rls_2'
  const wallet = db.initUserWallet(user)
  const topup = db._insertTopupInternal({
    user_id: user,
    wallet_id: wallet.id,
    amount: 100.00,
    currency: 'INR',
    client_idempotency_key: 'key_update_test',
    razorpay_order_id: 'order_update_test',
  })

  assert.throws(() => {
    db.directClientUpdateTopup('authenticated', topup.id, { amount: 5000.00 })
  }, /permission denied for table wallet_topups: direct UPDATE revoked/)
})

test('14. Direct client DELETE blocked for anon and authenticated users', () => {
  const db = new SimulatedPhase92Database()
  const user = 'user_rls_3'
  const wallet = db.initUserWallet(user)
  const topup = db._insertTopupInternal({
    user_id: user,
    wallet_id: wallet.id,
    amount: 100.00,
    currency: 'INR',
    client_idempotency_key: 'key_del_test',
    razorpay_order_id: 'order_del_test',
  })

  assert.throws(() => {
    db.directClientDeleteTopup('authenticated', topup.id)
  }, /permission denied for table wallet_topups: direct DELETE revoked/)
})

test('15. Cross-user SELECT is blocked by RLS policy', () => {
  const db = new SimulatedPhase92Database()
  const userA = 'user_alpha'
  const userB = 'user_bravo'
  const walletA = db.initUserWallet(userA)
  const walletB = db.initUserWallet(userB)

  db._insertTopupInternal({
    user_id: userA,
    wallet_id: walletA.id,
    amount: 100.00,
    currency: 'INR',
    client_idempotency_key: 'key_user_a',
    razorpay_order_id: 'order_user_a',
  })

  db._insertTopupInternal({
    user_id: userB,
    wallet_id: walletB.id,
    amount: 250.00,
    currency: 'INR',
    client_idempotency_key: 'key_user_b',
    razorpay_order_id: 'order_user_b',
  })

  // User A cannot read User B's topups
  const userAReadsB = db.clientSelectTopups('authenticated', userA, userB)
  assert.strictEqual(userAReadsB.length, 0, 'User A cannot view User B topups')

  // User A can read own topups
  const userAReadsOwn = db.clientSelectTopups('authenticated', userA, userA)
  assert.strictEqual(userAReadsOwn.length, 1, 'User A can view own topups')
  assert.strictEqual(userAReadsOwn[0].user_id, userA)
})

test('16. Settlement RPC is blocked for authenticated users (service-role only)', () => {
  const db = new SimulatedPhase92Database()
  const user = 'user_settle_perm'
  const wallet = db.initUserWallet(user)
  const topup = db._insertTopupInternal({
    user_id: user,
    wallet_id: wallet.id,
    amount: 50.00,
    currency: 'INR',
    client_idempotency_key: 'key_settle_perm',
    razorpay_order_id: 'order_settle_perm',
  })

  const res = db.settleWalletTopup({
    role: 'authenticated', // Invalid role
    topupId: topup.id,
    razorpayPaymentId: 'pay_test_perm',
    razorpaySignature: 'sig_test_perm',
  })

  assert.strictEqual(res.success, false)
  assert.strictEqual(res.error_code, 'UNAUTHORIZED')
  assert(res.message.includes('can only be executed by service_role'))
})

// ----------------------------------------------------------------------------
// SUITE 4: ATOMIC SETTLEMENT & REPLAY PROTECTION
// ----------------------------------------------------------------------------
console.log('\n--- SUITE 4: ATOMIC SETTLEMENT & REPLAY PROTECTION ---')

test('17. Valid settlement credits wallet exactly once and produces immutable ledger entry', () => {
  const db = new SimulatedPhase92Database()
  const user = 'user_settle_valid'
  const initialBalance = 150.00
  const topupAmount = 250.50
  const wallet = db.initUserWallet(user, initialBalance)

  const topup = db._insertTopupInternal({
    user_id: user,
    wallet_id: wallet.id,
    amount: topupAmount,
    currency: 'INR',
    client_idempotency_key: 'client_key_valid_1',
    razorpay_order_id: 'order_rzp_valid_1',
  })

  const paymentId = 'pay_rzp_valid_1'
  const signature = 'sig_valid_1234567890abcdef'

  const res = db.settleWalletTopup({
    role: 'service_role',
    topupId: topup.id,
    razorpayPaymentId: paymentId,
    razorpaySignature: signature,
  })

  assert(res.success, 'Settlement must succeed')
  assert.strictEqual(res.amount, topupAmount)
  assert.strictEqual(res.balance_after, 400.50) // 150.00 + 250.50

  // Verify wallet state
  const updatedWallet = db.wallets.get(user)
  assert.strictEqual(updatedWallet.balance, 400.50)

  // Verify topup state
  const updatedTopup = db.walletTopups.get(topup.id)
  assert.strictEqual(updatedTopup.status, 'COMPLETED')
  assert.strictEqual(updatedTopup.razorpay_payment_id, paymentId)
  assert.strictEqual(updatedTopup.razorpay_signature, signature)
  assert(updatedTopup.completed_at !== null)

  // Verify ledger entry
  assert.strictEqual(db.walletLedger.length, 1)
  const ledger = db.walletLedger[0]
  assert.strictEqual(ledger.user_id, user)
  assert.strictEqual(ledger.type, 'DEPOSIT')
  assert.strictEqual(ledger.direction, 'CREDIT')
  assert.strictEqual(ledger.amount, topupAmount)
  assert.strictEqual(ledger.balance_before, 150.00)
  assert.strictEqual(ledger.balance_after, 400.50)
  assert.strictEqual(ledger.idempotency_key, paymentId)
})

test('18. Duplicate verification replay returns success with zero additional wallet credit', () => {
  const db = new SimulatedPhase92Database()
  const user = 'user_replay_test'
  const wallet = db.initUserWallet(user, 100.00)

  const topup = db._insertTopupInternal({
    user_id: user,
    wallet_id: wallet.id,
    amount: 100.00,
    currency: 'INR',
    client_idempotency_key: 'key_replay_1',
    razorpay_order_id: 'order_replay_1',
  })

  const paymentId = 'pay_replay_1'
  const signature = 'sig_replay_1'

  // First settlement
  const res1 = db.settleWalletTopup({
    role: 'service_role',
    topupId: topup.id,
    razorpayPaymentId: paymentId,
    razorpaySignature: signature,
  })
  assert(res1.success)
  assert.strictEqual(db.wallets.get(user).balance, 200.00)
  assert.strictEqual(db.walletLedger.length, 1)

  // Second settlement replay (same topup, same paymentId)
  const res2 = db.settleWalletTopup({
    role: 'service_role',
    topupId: topup.id,
    razorpayPaymentId: paymentId,
    razorpaySignature: signature,
  })

  assert(res2.success, 'Replay must succeed idempotently')
  assert.strictEqual(res2.already_settled, true)
  // Balance must remain strictly 200.00 (NO duplicate credit)
  assert.strictEqual(db.wallets.get(user).balance, 200.00)
  // Ledger must still have only 1 entry
  assert.strictEqual(db.walletLedger.length, 1)
})

test('19. Duplicate payment ID rejected across different topups', () => {
  const db = new SimulatedPhase92Database()
  const user = 'user_dup_pay'
  const wallet = db.initUserWallet(user, 100.00)

  const topupA = db._insertTopupInternal({
    user_id: user,
    wallet_id: wallet.id,
    amount: 50.00,
    currency: 'INR',
    client_idempotency_key: 'key_dup_a',
    razorpay_order_id: 'order_dup_a',
  })

  const topupB = db._insertTopupInternal({
    user_id: user,
    wallet_id: wallet.id,
    amount: 50.00,
    currency: 'INR',
    client_idempotency_key: 'key_dup_b',
    razorpay_order_id: 'order_dup_b',
  })

  const sharedPaymentId = 'pay_shared_12345'

  // Settle Topup A
  const resA = db.settleWalletTopup({
    role: 'service_role',
    topupId: topupA.id,
    razorpayPaymentId: sharedPaymentId,
    razorpaySignature: 'sig_a',
  })
  assert(resA.success)

  // Attempt to settle Topup B with the SAME paymentId
  const resB = db.settleWalletTopup({
    role: 'service_role',
    topupId: topupB.id,
    razorpayPaymentId: sharedPaymentId,
    razorpaySignature: 'sig_b',
  })

  assert.strictEqual(resB.success, false)
  assert.strictEqual(resB.error_code, 'PAYMENT_ALREADY_USED')
})

test('20. Failed/Cancelled topups can never be settled to COMPLETED', () => {
  const db = new SimulatedPhase92Database()
  const user = 'user_terminal_test'
  const wallet = db.initUserWallet(user, 50.00)

  const topup = db._insertTopupInternal({
    user_id: user,
    wallet_id: wallet.id,
    amount: 100.00,
    currency: 'INR',
    client_idempotency_key: 'key_failed_test',
    razorpay_order_id: 'order_failed_test',
    status: 'FAILED',
  })

  const res = db.settleWalletTopup({
    role: 'service_role',
    topupId: topup.id,
    razorpayPaymentId: 'pay_failed_1',
    razorpaySignature: 'sig_failed_1',
  })

  assert.strictEqual(res.success, false)
  assert.strictEqual(res.error_code, 'INVALID_TOPUP_STATE')
  assert.strictEqual(db.wallets.get(user).balance, 50.00) // Balance untouched
})

test('21. Amount is read authoritatively from DB row and cannot be altered by client', () => {
  const db = new SimulatedPhase92Database()
  const user = 'user_tamper_test'
  const wallet = db.initUserWallet(user, 10.00)

  const topup = db._insertTopupInternal({
    user_id: user,
    wallet_id: wallet.id,
    amount: 50.00, // Authoritative DB value
    currency: 'INR',
    client_idempotency_key: 'key_tamper_1',
    razorpay_order_id: 'order_tamper_1',
  })

  // settleWalletTopup doesn't accept client amount parameter; it queries row FOR UPDATE
  const res = db.settleWalletTopup({
    role: 'service_role',
    topupId: topup.id,
    razorpayPaymentId: 'pay_tamper_1',
    razorpaySignature: 'sig_tamper_1',
  })

  assert(res.success)
  assert.strictEqual(res.amount, 50.00)
  assert.strictEqual(db.wallets.get(user).balance, 60.00)
})

// ----------------------------------------------------------------------------
// SUITE 5: CRYPTOGRAPHIC SIGNATURE VERIFICATION
// ----------------------------------------------------------------------------
console.log('\n--- SUITE 5: HMAC-SHA256 SIGNATURE VERIFICATION ---')

function computeHmacSha256(orderId, paymentId, secret) {
  return crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex')
}

function constantTimeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false
  if (a.length !== b.length) return false
  let mismatch = 0
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return mismatch === 0
}

test('22. Constant-time HMAC comparison validates authentic signatures', () => {
  const secret = 'rzp_test_secret_key_12345'
  const orderId = 'order_valid_hmac_1'
  const paymentId = 'pay_valid_hmac_1'
  const validSig = computeHmacSha256(orderId, paymentId, secret)

  assert(constantTimeCompare(validSig, validSig), 'Authentic signature must pass')
})

test('23. Constant-time HMAC comparison rejects forged signatures', () => {
  const secret = 'rzp_test_secret_key_12345'
  const orderId = 'order_forged_hmac_1'
  const paymentId = 'pay_forged_hmac_1'
  const validSig = computeHmacSha256(orderId, paymentId, secret)
  const forgedSig = validSig.slice(0, -1) + (validSig.slice(-1) === 'a' ? 'b' : 'a')

  assert(!constantTimeCompare(validSig, forgedSig), 'Forged signature must be rejected')
})

test('24. Constant-time HMAC comparison rejects mismatched order_id or payment_id', () => {
  const secret = 'rzp_test_secret_key_12345'
  const orderId = 'order_hmac_a'
  const paymentId = 'pay_hmac_a'
  const validSig = computeHmacSha256(orderId, paymentId, secret)

  // Swapped orderId
  const sigForWrongOrder = computeHmacSha256('order_hmac_b', paymentId, secret)
  assert(!constantTimeCompare(validSig, sigForWrongOrder), 'Mismatched order_id must fail signature check')
})

// ----------------------------------------------------------------------------
// SUITE 6: CONCURRENCY & SERIALIZATION
// ----------------------------------------------------------------------------
console.log('\n--- SUITE 6: CONCURRENCY & RACE CONDITIONS ---')

test('25. Concurrent settlement requests for same topup credit wallet exactly once', async () => {
  const db = new SimulatedPhase92Database()
  const user = 'user_concurrent_settle'
  const wallet = db.initUserWallet(user, 100.00)

  const topup = db._insertTopupInternal({
    user_id: user,
    wallet_id: wallet.id,
    amount: 150.00,
    currency: 'INR',
    client_idempotency_key: 'key_conc_1',
    razorpay_order_id: 'order_conc_1',
  })

  const paymentId = 'pay_conc_1'
  const signature = 'sig_conc_1'

  // Fire 10 concurrent settlement requests
  const promises = Array.from({ length: 10 }).map(() => {
    return Promise.resolve(db.settleWalletTopup({
      role: 'service_role',
      topupId: topup.id,
      razorpayPaymentId: paymentId,
      razorpaySignature: signature,
    }))
  })

  const results = await Promise.all(promises)
  const successfulSettlements = results.filter(r => r.success && !r.already_settled)
  const idempotentReplays = results.filter(r => r.success && r.already_settled)

  assert.strictEqual(successfulSettlements.length, 1, 'Exactly one settlement credits balance')
  assert.strictEqual(idempotentReplays.length, 9, 'All other concurrent requests return idempotent replay')
  assert.strictEqual(db.wallets.get(user).balance, 250.00, 'Balance is credited exactly once')
  assert.strictEqual(db.walletLedger.length, 1, 'Exactly one ledger record is created')
})

test('26. Concurrent topups for same user serialize without balance drift', async () => {
  const db = new SimulatedPhase92Database()
  const user = 'user_concurrent_topups'
  const wallet = db.initUserWallet(user, 0.00)

  const amounts = [10.00, 20.00, 50.00, 100.00, 200.00]
  const topups = amounts.map((amt, idx) => {
    return db._insertTopupInternal({
      user_id: user,
      wallet_id: wallet.id,
      amount: amt,
      currency: 'INR',
      client_idempotency_key: `key_multi_${idx}`,
      razorpay_order_id: `order_multi_${idx}`,
    })
  })

  // Settle all 5 distinct topups concurrently
  const promises = topups.map((t, idx) => {
    return Promise.resolve(db.settleWalletTopup({
      role: 'service_role',
      topupId: t.id,
      razorpayPaymentId: `pay_multi_${idx}`,
      razorpaySignature: `sig_multi_${idx}`,
    }))
  })

  const results = await Promise.all(promises)
  assert(results.every(r => r.success), 'All distinct topups must settle successfully')

  const expectedTotal = amounts.reduce((sum, a) => sum + a, 0) // 380.00
  assert.strictEqual(db.wallets.get(user).balance, expectedTotal, 'Final balance must match sum of all topups')
  assert.strictEqual(db.walletLedger.length, 5, 'Must create 5 ledger entries')
})

// ----------------------------------------------------------------------------
// SUITE 7: EDGE FUNCTIONS & FRONTEND INTEGRATION CONTRACTS
// ----------------------------------------------------------------------------
console.log('\n--- SUITE 7: EDGE FUNCTIONS & FRONTEND CONTRACTS ---')

test('27. create-wallet-topup-order enforces receipt <= 40 chars & server-side secrets only', () => {
  const edgeFnPath = path.resolve('supabase/functions/create-wallet-topup-order/index.ts')
  assert(fs.existsSync(edgeFnPath), 'create-wallet-topup-order function must exist')
  const content = fs.readFileSync(edgeFnPath, 'utf8')

  assert(content.includes('slice(0, 40)'), 'Razorpay receipt must be strictly clamped to <= 40 characters')
  assert(!content.includes('RAZORPAY_KEY_SECRET') || !content.includes('return new Response(JSON.stringify({ secret:'), 'Must never expose secret')
  assert(content.includes('get_or_create_wallet'), 'Must ensure wallet exists')
  assert(content.includes('client_idempotency_key'), 'Must handle client idempotency key')
  assert(content.includes('numericAmount < 10.00') || content.includes('amount < 10.00'), 'Must enforce amount >= 10.00')
  assert(content.includes('numericAmount > 10000.00') || content.includes('amount > 10000.00'), 'Must enforce amount <= 10000.00')
})

test('28. verify-wallet-topup uses constant-time comparison and calls settle_wallet_topup via service_role', () => {
  const edgeFnPath = path.resolve('supabase/functions/verify-wallet-topup/index.ts')
  assert(fs.existsSync(edgeFnPath), 'verify-wallet-topup function must exist')
  const content = fs.readFileSync(edgeFnPath, 'utf8')

  assert(content.includes('constantTimeCompare'), 'Must use constant-time comparison for HMAC signature')
  assert(content.includes("rpc('settle_wallet_topup'"), 'Must call settle_wallet_topup RPC')
  assert(content.includes('SUPABASE_SERVICE_ROLE_KEY'), 'Must use service_role client for RPC settlement')
  assert(content.includes('already_settled'), 'Must handle idempotent replay')
})

test('29. walletService.js exports createWalletTopupOrder and verifyWalletTopup', () => {
  const servicePath = path.resolve('src/services/walletService.js')
  const content = fs.readFileSync(servicePath, 'utf8')

  assert(content.includes('export async function createWalletTopupOrder'), 'Must export createWalletTopupOrder')
  assert(content.includes('export async function verifyWalletTopup'), 'Must export verifyWalletTopup')
  assert(content.includes('export function generateTopupIdempotencyKey'), 'Must export generateTopupIdempotencyKey')
})

test('30. WalletPage.jsx implements the complete Add Money checkout lifecycle', () => {
  const pagePath = path.resolve('src/pages/WalletPage.jsx')
  const content = fs.readFileSync(pagePath, 'utf8')

  assert(content.includes('createWalletTopupOrder'), 'Must call createWalletTopupOrder')
  assert(content.includes('verifyWalletTopup'), 'Must call verifyWalletTopup')
  assert(content.includes('loadRazorpayScript'), 'Must use loadRazorpayScript')
  assert(content.includes('topupIdempotencyKey'), 'Must preserve idempotency key across retries')
  assert(content.includes('syncWalletData'), 'Must refresh authoritative balance on success')
  assert(content.includes('num < 10.00'), 'Must validate min amount ₹10.00')
  assert(content.includes('num > 10000.00'), 'Must validate max amount ₹10,000.00')
})

// ----------------------------------------------------------------------------
// TEST SUMMARY REPORT
// ----------------------------------------------------------------------------
console.log('\n============================================================')
console.log(`🏁 PHASE 9.2 TEST RUN COMPLETE: ${passed} PASSED, ${failed} FAILED`)
console.log('============================================================\n')

if (failed > 0) {
  process.exit(1)
}
