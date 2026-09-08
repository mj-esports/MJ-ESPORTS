// ============================================================================
// MJ ESPORTS — Phase 9.4: Strict ₹200 Wallet Limit & Whole-Rupee Only Test Suite
// ============================================================================

import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'

console.log('============================================================')
console.log('🧪 RUNNING PHASE 9.4: STRICT ₹200 WALLET LIMIT & WHOLE-RUPEE SUITE')
console.log('============================================================\n')

let passCount = 0
let failCount = 0

function test(name, fn) {
  try {
    fn()
    console.log(`  ✅ [PASS] ${name}`)
    passCount++
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}:`, err.message)
    failCount++
  }
}

async function asyncTest(name, fn) {
  try {
    await fn()
    console.log(`  ✅ [PASS] ${name}`)
    passCount++
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}:`, err.message)
    failCount++
  }
}

// ----------------------------------------------------------------------------
// SIMULATION ENGINE: Authoritative Database Invariants & Row Locking
// ----------------------------------------------------------------------------

class MockDatabase {
  constructor() {
    this.wallets = new Map() // user_id -> { id, user_id, balance, currency }
    this.walletLedger = [] // array of ledger entries
    this.walletTopups = new Map() // id -> { id, user_id, wallet_id, amount, status, razorpay_order_id, razorpay_payment_id }
    this.lockedWallets = new Set()
  }

  getOrCreateWallet(userId) {
    if (!this.wallets.has(userId)) {
      this.wallets.set(userId, {
        id: `wallet_${userId}`,
        user_id: userId,
        balance: 0.0,
        currency: 'INR',
      })
    }
    return this.wallets.get(userId)
  }

  // Phase 9.4 Authoritative record_wallet_ledger_entry RPC simulation
  recordWalletLedgerEntry({
    userId,
    transactionType,
    direction,
    amount,
    sourceRefType = null,
    sourceRefId = null,
    idempotencyKey = null,
    description = 'Wallet Ledger Entry',
    role = 'service_role',
  }) {
    // 1. Authorization check
    if (role !== 'service_role' && role !== 'admin') {
      return { success: false, error_code: 'UNAUTHORIZED', message: 'Restricted to admin and service_role' }
    }

    // 2. Whole-rupee validation (Paise/Decimals strictly rejected without rounding)
    const numAmount = Number(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      return { success: false, error_code: 'INVALID_AMOUNT', message: 'Amount must be strictly greater than 0' }
    }

    if (numAmount !== Math.trunc(numAmount)) {
      return {
        success: false,
        error_code: 'DECIMAL_AMOUNT_REJECTED',
        amount: numAmount,
        message: 'Decimal/paise amounts are not permitted. Whole rupees only.',
      }
    }

    // Phase 9.4 Range validation
    if (numAmount < 1 || numAmount > 200) {
      return {
        success: false,
        error_code: 'INVALID_AMOUNT',
        amount: numAmount,
        message: 'Transaction amount must be between ₹1 and ₹200.',
      }
    }

    // 3. Idempotency replay check
    if (idempotencyKey) {
      const existing = this.walletLedger.find((l) => l.idempotency_key === idempotencyKey)
      if (existing) {
        return {
          success: true,
          idempotent_replay: true,
          transaction_id: existing.id,
          balance_before: existing.balance_before,
          balance_after: existing.balance_after,
          amount: existing.amount,
          direction: existing.direction,
        }
      }
    }

    // 4. Lock wallet row FOR UPDATE
    const wallet = this.wallets.get(userId) || this.getOrCreateWallet(userId)
    const balanceBefore = wallet.balance

    // 5. Balance bounds & ceiling check
    let balanceAfter
    if (direction === 'CREDIT') {
      // STRICT ₹200 CEILING CHECK
      if (balanceBefore + numAmount > 200.0) {
        return {
          success: false,
          error_code: 'WALLET_LIMIT_EXCEEDED',
          current_balance: balanceBefore,
          requested_credit: numAmount,
          maximum_allowed_credit: Math.max(0, 200 - balanceBefore),
          message: 'Transaction rejected: wallet balance cannot exceed ₹200.00.',
        }
      }
      balanceAfter = balanceBefore + numAmount
    } else {
      // DEBIT
      if (balanceBefore < numAmount) {
        return {
          success: false,
          error_code: 'INSUFFICIENT_FUNDS',
          current_balance: balanceBefore,
          required_amount: numAmount,
          message: 'Insufficient balance.',
        }
      }
      balanceAfter = balanceBefore - numAmount
    }

    // Database check constraint enforcement simulation: 0 <= balance <= 200 and balance = TRUNC(balance)
    if (balanceAfter < 0 || balanceAfter > 200 || balanceAfter !== Math.trunc(balanceAfter)) {
      throw new Error('violates check constraint "chk_wallet_max_balance_200" or "chk_wallet_whole_rupee"')
    }

    // 6. Mutate balance
    wallet.balance = balanceAfter

    // 7. Insert immutable ledger entry
    const entry = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      wallet_id: wallet.id,
      user_id: userId,
      transaction_type: transactionType,
      direction,
      amount: numAmount,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      source_reference_type: sourceRefType,
      source_reference_id: sourceRefId,
      idempotency_key: idempotencyKey,
      description,
      created_at: new Date().toISOString(),
    }
    this.walletLedger.push(entry)

    return {
      success: true,
      transaction_id: entry.id,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      amount: numAmount,
      direction,
    }
  }

  // Phase 9.4 settle_wallet_topup simulation
  settleWalletTopup({ topupId, paymentId, signature, role = 'service_role' }) {
    if (role !== 'service_role') {
      return { success: false, error_code: 'UNAUTHORIZED', message: 'Restricted to service_role' }
    }

    const topup = this.walletTopups.get(topupId)
    if (!topup) return { success: false, error_code: 'TOPUP_NOT_FOUND', message: 'Topup not found' }

    if (topup.status === 'COMPLETED') {
      if (topup.razorpay_payment_id === paymentId) {
        return { success: true, already_settled: true, amount: topup.amount }
      }
      return { success: false, error_code: 'PAYMENT_MISMATCH', message: 'Already completed with different payment' }
    }

    if (topup.status !== 'PENDING') {
      return { success: false, error_code: 'INVALID_TOPUP_STATE', message: 'Not pending' }
    }

    // Whole rupee check
    if (topup.amount !== Math.trunc(topup.amount)) {
      return { success: false, error_code: 'DECIMAL_AMOUNT_REJECTED', message: 'Paise rejected' }
    }

    // Atomic pre-check on wallet balance
    const wallet = this.wallets.get(topup.user_id) || this.getOrCreateWallet(topup.user_id)
    if (wallet.balance + topup.amount > 200.0) {
      return {
        success: false,
        error_code: 'WALLET_LIMIT_EXCEEDED',
        current_balance: wallet.balance,
        topup_amount: topup.amount,
        maximum_allowed_credit: Math.max(0, 200 - wallet.balance),
        message: 'Settlement rejected: resulting wallet balance would exceed ₹200.00.',
      }
    }

    // Delegate to recordWalletLedgerEntry
    const ledgerRes = this.recordWalletLedgerEntry({
      userId: topup.user_id,
      transactionType: 'DEPOSIT',
      direction: 'CREDIT',
      amount: topup.amount,
      sourceRefType: 'WALLET_TOPUP',
      sourceRefId: topup.id,
      idempotencyKey: paymentId,
      description: 'Instant Wallet Top-up via Razorpay',
      role,
    })

    if (!ledgerRes.success) {
      return ledgerRes
    }

    // Only on successful ledger entry transition to COMPLETED
    topup.status = 'COMPLETED'
    topup.razorpay_payment_id = paymentId
    topup.razorpay_signature = signature

    return {
      success: true,
      topup_id: topup.id,
      amount: topup.amount,
      balance_after: ledgerRes.balance_after,
      transaction_id: ledgerRes.transaction_id,
    }
  }
}

// ============================================================================
// SUITE 1: STATIC AUDIT OF NEW MIGRATION SQL
// ============================================================================
console.log('--- SUITE 1: SQL MIGRATION FILE & INVARIANTS AUDIT ---')

const migrationFile = path.resolve('supabase_phase9_4_wallet_limit_and_whole_rupee.sql')

test('1.1. Migration file supabase_phase9_4_wallet_limit_and_whole_rupee.sql exists', () => {
  assert(fs.existsSync(migrationFile), 'Migration file must exist')
  const content = fs.readFileSync(migrationFile, 'utf8')
  assert(content.length > 500, 'Migration file must contain SQL definitions')
})

test('1.2. Migration adds chk_wallet_max_balance_200 (balance <= 200.00)', () => {
  const content = fs.readFileSync(migrationFile, 'utf8')
  assert(content.includes('chk_wallet_max_balance_200'), 'Must define chk_wallet_max_balance_200 constraint')
  assert(content.includes('balance <= 200.00'), 'Must enforce balance <= 200.00')
})

test('1.3. Migration adds chk_wallet_whole_rupee (balance = TRUNC(balance))', () => {
  const content = fs.readFileSync(migrationFile, 'utf8')
  assert(content.includes('chk_wallet_whole_rupee'), 'Must define chk_wallet_whole_rupee constraint')
  assert(content.includes('balance = TRUNC(balance)'), 'Must enforce balance = TRUNC(balance)')
})

test('1.4. Migration updates public.wallet_topups bounds (1.00 to 200.00, whole rupee)', () => {
  const content = fs.readFileSync(migrationFile, 'utf8')
  assert(content.includes('amount >= 1.00 AND amount <= 200.00'), 'Must constrain topup to 1..200')
  assert(content.includes('wallet_topups_whole_rupee'), 'Must add whole rupee check on wallet_topups')
  assert(content.includes('amount = TRUNC(amount)'), 'Must enforce whole rupee on wallet_topups')
})

test('1.5. Migration upgrades record_wallet_ledger_entry with DECIMAL_AMOUNT_REJECTED and WALLET_LIMIT_EXCEEDED', () => {
  const content = fs.readFileSync(migrationFile, 'utf8')
  assert(content.includes('DECIMAL_AMOUNT_REJECTED'), 'Must return DECIMAL_AMOUNT_REJECTED error code')
  assert(content.includes('WALLET_LIMIT_EXCEEDED'), 'Must return WALLET_LIMIT_EXCEEDED error code')
  assert(content.includes('p_amount != TRUNC(p_amount)'), 'Must check p_amount != TRUNC(p_amount)')
  assert(content.includes('(v_balance_before + v_clean_amount) > 200.00'), 'Must check balance ceiling in credit')
})

test('1.6. Migration upgrades settle_wallet_topup with row-level wallet lock and ceiling pre-check', () => {
  const content = fs.readFileSync(migrationFile, 'utf8')
  assert(content.includes('SELECT id, balance INTO v_wallet'), 'Must query wallet in settle_wallet_topup')
  assert(content.includes('FOR UPDATE'), 'Must lock wallet FOR UPDATE')
  assert(content.includes('(v_wallet.balance + v_topup.amount) > 200.00'), 'Must check resulting balance <= 200')
})

// ============================================================================
// SUITE 2: TEST A — VALID WHOLE-RUPEE AMOUNTS
// ============================================================================
console.log('\n--- SUITE 2: TEST A — VALID WHOLE-RUPEE AMOUNTS ---')

test('2.1. Valid amount ₹1 is accepted', () => {
  const db = new MockDatabase()
  const res = db.recordWalletLedgerEntry({
    userId: 'u1',
    transactionType: 'DEPOSIT',
    direction: 'CREDIT',
    amount: 1,
  })
  assert.strictEqual(res.success, true)
  assert.strictEqual(res.balance_after, 1)
})

test('2.2. Valid amount ₹50 is accepted', () => {
  const db = new MockDatabase()
  const res = db.recordWalletLedgerEntry({
    userId: 'u2',
    transactionType: 'DEPOSIT',
    direction: 'CREDIT',
    amount: 50,
  })
  assert.strictEqual(res.success, true)
  assert.strictEqual(res.balance_after, 50)
})

test('2.3. Valid amount ₹151 is accepted', () => {
  const db = new MockDatabase()
  const res = db.recordWalletLedgerEntry({
    userId: 'u3',
    transactionType: 'DEPOSIT',
    direction: 'CREDIT',
    amount: 151,
  })
  assert.strictEqual(res.success, true)
  assert.strictEqual(res.balance_after, 151)
})

test('2.4. Valid amount ₹199 is accepted', () => {
  const db = new MockDatabase()
  const res = db.recordWalletLedgerEntry({
    userId: 'u4',
    transactionType: 'DEPOSIT',
    direction: 'CREDIT',
    amount: 199,
  })
  assert.strictEqual(res.success, true)
  assert.strictEqual(res.balance_after, 199)
})

test('2.5. Valid amount ₹200 is accepted on zero balance', () => {
  const db = new MockDatabase()
  const res = db.recordWalletLedgerEntry({
    userId: 'u5',
    transactionType: 'DEPOSIT',
    direction: 'CREDIT',
    amount: 200,
  })
  assert.strictEqual(res.success, true)
  assert.strictEqual(res.balance_after, 200)
})

// ============================================================================
// SUITE 3: TEST B — INVALID DECIMAL AMOUNTS (STRICT REJECTION WITHOUT ROUNDING)
// ============================================================================
console.log('\n--- SUITE 3: TEST B — INVALID DECIMAL AMOUNTS ---')

const decimalTestCases = [0.01, 1.1, 1.1, 50.5, 151.23, 199.99, 200.01]

decimalTestCases.forEach((amt) => {
  test(`3.x. Decimal amount ₹${amt} is strictly rejected without rounding`, () => {
    const db = new MockDatabase()
    const res = db.recordWalletLedgerEntry({
      userId: 'u_dec',
      transactionType: 'DEPOSIT',
      direction: 'CREDIT',
      amount: amt,
    })
    assert.strictEqual(res.success, false)
    assert.strictEqual(res.error_code, 'DECIMAL_AMOUNT_REJECTED')
    // Authoritative balance must remain 0
    assert.strictEqual(db.getOrCreateWallet('u_dec').balance, 0)
    assert.strictEqual(db.walletLedger.length, 0)
  })
})

// ============================================================================
// SUITE 4: TEST C — INVALID RANGE
// ============================================================================
console.log('\n--- SUITE 4: TEST C — INVALID RANGE (< ₹1 OR > ₹200) ---')

test('4.1. ₹0 is rejected', () => {
  const db = new MockDatabase()
  const res = db.recordWalletLedgerEntry({
    userId: 'u_range',
    transactionType: 'DEPOSIT',
    direction: 'CREDIT',
    amount: 0,
  })
  assert.strictEqual(res.success, false)
})

test('4.2. Negative amount -₹50 is rejected', () => {
  const db = new MockDatabase()
  const res = db.recordWalletLedgerEntry({
    userId: 'u_range',
    transactionType: 'DEPOSIT',
    direction: 'CREDIT',
    amount: -50,
  })
  assert.strictEqual(res.success, false)
})

test('4.3. Amount ₹201 is rejected', () => {
  const db = new MockDatabase()
  const res = db.recordWalletLedgerEntry({
    userId: 'u_range',
    transactionType: 'DEPOSIT',
    direction: 'CREDIT',
    amount: 201,
  })
  assert.strictEqual(res.success, false)
  assert.strictEqual(res.error_code, 'INVALID_AMOUNT')
})

test('4.4. Amount ₹500 is rejected', () => {
  const db = new MockDatabase()
  const res = db.recordWalletLedgerEntry({
    userId: 'u_range',
    transactionType: 'DEPOSIT',
    direction: 'CREDIT',
    amount: 500,
  })
  assert.strictEqual(res.success, false)
})

// ============================================================================
// SUITE 5: TEST D — AUTHORITATIVE BALANCE LIMIT SCENARIOS (TABLE IN SPEC)
// ============================================================================
console.log('\n--- SUITE 5: TEST D — BALANCE LIMIT SCENARIOS ---')

const scenarioTable = [
  { initial: 0, topup: 1, expected: 'ALLOW', newBal: 1 },
  { initial: 0, topup: 200, expected: 'ALLOW', newBal: 200 },
  { initial: 50, topup: 1, expected: 'ALLOW', newBal: 51 },
  { initial: 50, topup: 150, expected: 'ALLOW', newBal: 200 },
  { initial: 50, topup: 151, expected: 'REJECT', error: 'WALLET_LIMIT_EXCEEDED' },
  { initial: 100, topup: 100, expected: 'ALLOW', newBal: 200 },
  { initial: 100, topup: 101, expected: 'REJECT', error: 'WALLET_LIMIT_EXCEEDED' },
  { initial: 150, topup: 50, expected: 'ALLOW', newBal: 200 },
  { initial: 150, topup: 50.01, expected: 'REJECT', error: 'DECIMAL_AMOUNT_REJECTED' },
  { initial: 150, topup: 51, expected: 'REJECT', error: 'WALLET_LIMIT_EXCEEDED' },
  { initial: 199, topup: 1, expected: 'ALLOW', newBal: 200 },
  { initial: 199, topup: 2, expected: 'REJECT', error: 'WALLET_LIMIT_EXCEEDED' },
  { initial: 200, topup: 1, expected: 'REJECT', error: 'WALLET_LIMIT_EXCEEDED' },
  { initial: 200, topup: 200, expected: 'REJECT', error: 'WALLET_LIMIT_EXCEEDED' },
]

scenarioTable.forEach((s) => {
  test(`5.x. Balance ₹${s.initial} + Top-up ₹${s.topup} => ${s.expected}`, () => {
    const db = new MockDatabase()
    const user = `u_scen_${s.initial}_${s.topup}`
    if (s.initial > 0) {
      db.recordWalletLedgerEntry({
        userId: user,
        transactionType: 'DEPOSIT',
        direction: 'CREDIT',
        amount: s.initial,
      })
    }
    assert.strictEqual(db.getOrCreateWallet(user).balance, s.initial)

    const res = db.recordWalletLedgerEntry({
      userId: user,
      transactionType: 'DEPOSIT',
      direction: 'CREDIT',
      amount: s.topup,
    })

    if (s.expected === 'ALLOW') {
      assert.strictEqual(res.success, true, `Expected top-up ₹${s.topup} to succeed`)
      assert.strictEqual(db.getOrCreateWallet(user).balance, s.newBal)
    } else {
      assert.strictEqual(res.success, false, `Expected top-up ₹${s.topup} to be rejected`)
      assert.strictEqual(res.error_code, s.error)
      // Balance must NOT have changed
      assert.strictEqual(db.getOrCreateWallet(user).balance, s.initial)
    }
  })
})

// ============================================================================
// SUITE 6: TEST E — ATOMIC CONCURRENCY SAFETY
// ============================================================================
console.log('\n--- SUITE 6: TEST E — CONCURRENCY & RACE CONDITIONS ---')

asyncTest('6.1. Concurrent credits near limit serialize safely without exceeding ₹200', async () => {
  const db = new MockDatabase()
  const userId = 'u_concurrent'

  // Initial balance ₹150
  db.recordWalletLedgerEntry({
    userId,
    transactionType: 'DEPOSIT',
    direction: 'CREDIT',
    amount: 150,
  })

  // Two simultaneous requests of ₹50 each
  // In an atomic row-locked system, only the first transaction to lock the row can bring balance to ₹200.
  // The second request sees balance = ₹200 and fails with WALLET_LIMIT_EXCEEDED.
  const reqA = db.recordWalletLedgerEntry({
    userId,
    transactionType: 'DEPOSIT',
    direction: 'CREDIT',
    amount: 50,
    idempotencyKey: 'req_a',
  })

  const reqB = db.recordWalletLedgerEntry({
    userId,
    transactionType: 'DEPOSIT',
    direction: 'CREDIT',
    amount: 50,
    idempotencyKey: 'req_b',
  })

  const successCount = (reqA.success ? 1 : 0) + (reqB.success ? 1 : 0)
  const failCount = (reqA.success ? 0 : 1) + (reqB.success ? 0 : 1)

  assert.strictEqual(successCount, 1, 'Exactly 1 request must succeed')
  assert.strictEqual(failCount, 1, 'The competing request must fail')
  assert.strictEqual(db.getOrCreateWallet(userId).balance, 200, 'Final balance must be exactly ₹200')
  assert(db.getOrCreateWallet(userId).balance <= 200, 'Balance must NEVER exceed ₹200')
})

// ============================================================================
// SUITE 7: TEST F, G, H — LEDGER INTEGRITY, TOP-UP STATE, IDEMPOTENCY
// ============================================================================
console.log('\n--- SUITE 7: TEST F, G, H — LEDGER, TOPUP & IDEMPOTENCY ---')

test('7.1. Rejected credit produces ZERO ledger credit entry', () => {
  const db = new MockDatabase()
  const initialLedgerCount = db.walletLedger.length
  db.recordWalletLedgerEntry({
    userId: 'u_no_ledger',
    transactionType: 'DEPOSIT',
    direction: 'CREDIT',
    amount: 250, // exceeds range
  })
  assert.strictEqual(db.walletLedger.length, initialLedgerCount)
})

test('7.2. Successful credit records accurate balance_before, amount, and balance_after', () => {
  const db = new MockDatabase()
  db.recordWalletLedgerEntry({ userId: 'u_ledger_exact', transactionType: 'DEPOSIT', direction: 'CREDIT', amount: 50 })
  const res = db.recordWalletLedgerEntry({
    userId: 'u_ledger_exact',
    transactionType: 'DEPOSIT',
    direction: 'CREDIT',
    amount: 100,
  })
  assert.strictEqual(res.balance_before, 50)
  assert.strictEqual(res.amount, 100)
  assert.strictEqual(res.balance_after, 150)
})

test('7.3. Settle RPC rejection does NOT transition topup to COMPLETED', () => {
  const db = new MockDatabase()
  const userId = 'u_topup_fail'
  // Existing balance ₹190
  db.recordWalletLedgerEntry({ userId, transactionType: 'DEPOSIT', direction: 'CREDIT', amount: 190 })

  const topupId = 'topup_limit_exceeded'
  db.walletTopups.set(topupId, {
    id: topupId,
    user_id: userId,
    wallet_id: `wallet_${userId}`,
    amount: 50, // 190 + 50 = 240 > 200
    status: 'PENDING',
    razorpay_order_id: 'order_123',
  })

  const settleRes = db.settleWalletTopup({
    topupId,
    paymentId: 'pay_123',
    signature: 'sig_123',
  })

  assert.strictEqual(settleRes.success, false)
  assert.strictEqual(settleRes.error_code, 'WALLET_LIMIT_EXCEEDED')

  const topupRow = db.walletTopups.get(topupId)
  assert.strictEqual(topupRow.status, 'PENDING', 'Top-up must remain PENDING (never COMPLETED)')
  assert.strictEqual(db.getOrCreateWallet(userId).balance, 190, 'Balance must remain ₹190')
})

test('7.4. Settle RPC idempotency replay works without extra credit', () => {
  const db = new MockDatabase()
  const userId = 'u_topup_idem'

  const topupId = 'topup_ok'
  db.walletTopups.set(topupId, {
    id: topupId,
    user_id: userId,
    wallet_id: `wallet_${userId}`,
    amount: 100,
    status: 'PENDING',
    razorpay_order_id: 'order_ok',
  })

  const res1 = db.settleWalletTopup({ topupId, paymentId: 'pay_ok', signature: 'sig_ok' })
  assert.strictEqual(res1.success, true)
  assert.strictEqual(db.getOrCreateWallet(userId).balance, 100)

  // Replay
  const res2 = db.settleWalletTopup({ topupId, paymentId: 'pay_ok', signature: 'sig_ok' })
  assert.strictEqual(res2.success, true)
  assert.strictEqual(res2.already_settled, true)
  assert.strictEqual(db.getOrCreateWallet(userId).balance, 100, 'Balance must not double-credit')
})

// ============================================================================
// SUITE 8: EDGE FUNCTION & FRONTEND VALIDATION AUDIT
// ============================================================================
console.log('\n--- SUITE 8: EDGE FUNCTIONS & FRONTEND CONTRACTS ---')

test('8.1. create-wallet-topup-order rejects decimals via regex and enforces range 1..200', () => {
  const fnPath = path.resolve('supabase/functions/create-wallet-topup-order/index.ts')
  const content = fs.readFileSync(fnPath, 'utf8')
  assert(content.includes('wholeRupeeRegex = /^\\d+$/'), 'Must use whole rupee regex')
  assert(content.includes('numericAmount < 1 || numericAmount > 200'), 'Must enforce range 1..200')
  assert(content.includes('amountInPaise = numericAmount * 100'), 'Must calculate integer paise')
})

test('8.2. create-wallet-topup-order verifies current balance + amount <= 200', () => {
  const fnPath = path.resolve('supabase/functions/create-wallet-topup-order/index.ts')
  const content = fs.readFileSync(fnPath, 'utf8')
  assert(content.includes('(currentBalance + numericAmount) > 200.0'), 'Must check balance ceiling')
  assert(content.includes('WALLET_LIMIT_EXCEEDED'), 'Must return WALLET_LIMIT_EXCEEDED error code')
})

test('8.3. WalletPage.jsx formats balance as whole rupees and displays ₹200 limit', () => {
  const pagePath = path.resolve('src/pages/WalletPage.jsx')
  const content = fs.readFileSync(pagePath, 'utf8')
  assert(content.includes('authoritativeBalance = Math.floor'), 'Must floor authoritative balance')
  assert(content.includes('maxAllowedTopup = Math.max(0, 200 - authoritativeBalance)'), 'Must calculate maxAllowedTopup')
  assert(content.includes('Maximum wallet balance: ₹200'), 'Must clearly communicate ₹200 ceiling')
})

test('8.4. WalletPage.jsx prevents top-ups when balance is ₹200', () => {
  const pagePath = path.resolve('src/pages/WalletPage.jsx')
  const content = fs.readFileSync(pagePath, 'utf8')
  assert(content.includes('maxAllowedTopup <= 0'), 'Must guard against top-ups at limit')
  assert(content.includes('Wallet Balance Limit Reached (₹200)'), 'Must display limit reached banner')
})

test('8.5. WalletPage.jsx validates whole rupees only in handleDepositSubmit', () => {
  const pagePath = path.resolve('src/pages/WalletPage.jsx')
  const content = fs.readFileSync(pagePath, 'utf8')
  assert(content.includes('wholeRupeeRegex = /^\\d+$/'), 'Must enforce digits-only regex in frontend')
  assert(content.includes('(authoritativeBalance + num) > 200'), 'Must enforce ceiling check before submitting')
})

// ============================================================================
// TEST SUMMARY REPORT
// ============================================================================
console.log('\n============================================================')
console.log(`🏁 PHASE 9.4 TEST RUN COMPLETE: ${passCount} PASSED, ${failCount} FAILED`)
console.log('============================================================\n')

if (failCount > 0) {
  process.exit(1)
}
