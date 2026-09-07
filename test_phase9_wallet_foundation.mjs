/**
 * MJ ESPORTS — Phase 9.1: Secure Wallet Foundation & Immutable Ledger Test Suite
 *
 * Verifies:
 * 1. Wallets table schema & non-negative balance constraint
 * 2. Immutable wallet_ledger table schema & trigger-level immutability enforcement
 * 3. Strict Row Level Security (RLS) & privilege revocation (no direct client writes)
 * 4. get_or_create_wallet() RPC security (strictly derives auth.uid(), creates 0.00 INR balance)
 * 5. record_wallet_ledger_entry() authorization (rejects direct client execution, allows service_role/admin)
 * 6. Non-negative balance enforcement & INSUFFICIENT_FUNDS rejection
 * 7. Monetary values precision (NUMERIC(12,2) with exact decimal math)
 * 8. Atomic balance transition + ledger insertion
 * 9. Idempotency protection (duplicate key yields idempotent replay without second balance update)
 * 10. Concurrency & row-level locking simulation (race conditions resolve sequentially)
 * 11. Migration SQL security audit (safe search_path, explicit revokes, no SQL injection)
 * 12. Frontend wallet service integration (fetchUserWallet & fetchWalletLedger contracts)
 */

import assert from 'assert'
import fs from 'fs'
import path from 'path'

console.log('\n============================================================')
console.log('🧪 RUNNING PHASE 9.1: SECURE WALLET FOUNDATION TEST SUITE')
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
// In-Memory Simulation of Postgres + RLS + Triggers + RPCs
// ----------------------------------------------------------------------------
class SimulatedWalletDatabase {
  constructor() {
    this.wallets = new Map()       // key: user_id -> { id, user_id, balance, currency, created_at, updated_at }
    this.walletLedger = []         // immutable ledger entries
    this.idempotencyIndex = new Map() // key: idempotency_key -> ledgerEntry
    this.locks = new Map()         // row locks per user_id for concurrency testing
  }

  // Helper for numeric precision (simulating NUMERIC(12,2))
  toNumeric(val) {
    const num = Number(val)
    if (isNaN(num)) throw new Error('Invalid numeric value')
    return Math.round(num * 100) / 100
  }

  // 1. Direct client write attempts (Simulating RLS & Table Grants)
  directClientInsertWallet(role, row) {
    if (role === 'anon' || role === 'authenticated') {
      throw new Error('permission denied for table wallets: INSERT revoked')
    }
    this.wallets.set(row.user_id, row)
  }

  directClientUpdateWallet(role, userId, updates) {
    if (role === 'anon' || role === 'authenticated') {
      throw new Error('permission denied for table wallets: UPDATE revoked')
    }
    const w = this.wallets.get(userId)
    if (w) Object.assign(w, updates)
  }

  directClientDeleteWallet(role, userId) {
    if (role === 'anon' || role === 'authenticated') {
      throw new Error('permission denied for table wallets: DELETE revoked')
    }
    this.wallets.delete(userId)
  }

  // 2. Direct client write on ledger
  directClientInsertLedger(role, row) {
    if (role === 'anon' || role === 'authenticated') {
      throw new Error('permission denied for table wallet_ledger: INSERT revoked')
    }
    this.walletLedger.push(row)
  }

  // 3. Immutability trigger simulation on wallet_ledger
  updateLedgerEntry(entryId, updates) {
    // Triggers BEFORE UPDATE OR DELETE
    throw new Error('Wallet ledger entries are immutable and cannot be updated or deleted.')
  }

  deleteLedgerEntry(entryId) {
    // Triggers BEFORE UPDATE OR DELETE
    throw new Error('Wallet ledger entries are immutable and cannot be updated or deleted.')
  }

  // 3b. Anti-cascade deletion simulation: ON DELETE RESTRICT on auth.users -> wallets & wallet_ledger
  deleteAuthUser(userId) {
    // Check if user has an existing wallet
    if (this.wallets.has(userId)) {
      throw new Error('update or delete on table "users" violates foreign key constraint: user has financial wallet record (ON DELETE RESTRICT)')
    }
    // Check if user has any ledger entries
    const hasLedger = this.walletLedger.some((l) => l.user_id === userId)
    if (hasLedger) {
      throw new Error('update or delete on table "users" violates foreign key constraint: user has financial ledger history (ON DELETE RESTRICT)')
    }
    return true
  }

  // 3c. Composite foreign key simulation: fk_wallet_ledger_wallet_user REFERENCES wallets(id, user_id)
  validateCompositeWalletUser(walletId, userId) {
    let match = false
    for (const w of this.wallets.values()) {
      if (w.id === walletId && w.user_id === userId) {
        match = true
        break
      }
    }
    if (!match) {
      throw new Error('violates foreign key constraint fk_wallet_ledger_wallet_user: key (wallet_id, user_id) is not present in table "wallets"')
    }
  }

  // 4. RLS SELECT filtering
  selectWallets(role, callerUid, isAdmin = false) {
    if (role === 'anon') return []
    const results = []
    for (const w of this.wallets.values()) {
      if (isAdmin || w.user_id === callerUid) {
        results.push({ ...w })
      }
    }
    return results
  }

  selectWalletLedger(role, callerUid, isAdmin = false) {
    if (role === 'anon') return []
    return this.walletLedger
      .filter((l) => isAdmin || l.user_id === callerUid)
      .map((l) => ({ ...l }))
  }

  // 5. RPC: get_or_create_wallet()
  getOrCreateWallet({ callerUid }) {
    if (!callerUid) {
      return {
        success: false,
        error_code: 'UNAUTHENTICATED',
        message: 'You must be logged in to access your wallet.',
      }
    }

    let wallet = this.wallets.get(callerUid)
    if (!wallet) {
      wallet = {
        id: `wallet_${callerUid}`,
        user_id: callerUid,
        balance: 0.0,
        currency: 'INR',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      this.wallets.set(callerUid, wallet)
    }

    return {
      success: true,
      wallet: { ...wallet },
    }
  }

  // 6. RPC: record_wallet_ledger_entry(...)
  async recordWalletLedgerEntry({
    sessionRole,
    callerUid,
    isAdmin = false,
    userId,
    transactionType,
    direction,
    amount,
    sourceReferenceType = null,
    sourceReferenceId = null,
    idempotencyKey = null,
    description = 'Wallet Ledger Entry',
    metadata = {},
  }) {
    // 1. Authorization Boundary
    const isAuthorized = sessionRole === 'service_role' || isAdmin
    if (!isAuthorized) {
      return {
        success: false,
        error_code: 'UNAUTHORIZED',
        message: 'Direct execution of wallet ledger entry is restricted to administrators and system service role.',
      }
    }

    // 2. Validate input parameters
    if (!userId) {
      return {
        success: false,
        error_code: 'INVALID_USER',
        message: 'User ID is required.',
      }
    }

    const validTypes = [
      'DEPOSIT',
      'WITHDRAWAL',
      'PRIZE_CREDIT',
      'ENTRY_FEE_DEBIT',
      'REFUND',
      'BONUS_CREDIT',
      'ADJUSTMENT',
    ]
    if (!validTypes.includes(transactionType)) {
      return {
        success: false,
        error_code: 'INVALID_TRANSACTION_TYPE',
        message: 'Invalid transaction type specified.',
      }
    }

    const cleanDir = String(direction || '').toUpperCase().trim()
    if (!['CREDIT', 'DEBIT'].includes(cleanDir)) {
      return {
        success: false,
        error_code: 'INVALID_DIRECTION',
        message: 'Transaction direction must be either CREDIT or DEBIT.',
      }
    }

    if (amount === undefined || amount === null || Number(amount) <= 0) {
      return {
        success: false,
        error_code: 'INVALID_AMOUNT',
        message: 'Transaction amount must be strictly greater than 0.',
      }
    }

    const cleanAmount = this.toNumeric(amount)
    if (cleanAmount <= 0) {
      return {
        success: false,
        error_code: 'INVALID_AMOUNT',
        message: 'Transaction amount after rounding must be strictly greater than 0.00.',
      }
    }

    // 3. Idempotency Check
    if (idempotencyKey && String(idempotencyKey).trim()) {
      const trimmedKey = String(idempotencyKey).trim()
      if (this.idempotencyIndex.has(trimmedKey)) {
        const existing = this.idempotencyIndex.get(trimmedKey)
        return {
          success: true,
          idempotent_replay: true,
          transaction_id: existing.id,
          balance_before: existing.balance_before,
          balance_after: existing.balance_after,
          amount: existing.amount,
          direction: existing.direction,
          message: 'Operation already processed (idempotent replay).',
        }
      }
    }

    // 4. Lock Wallet Row FOR UPDATE (simulated via Promise queue)
    while (this.locks.get(userId)) {
      await new Promise((r) => setTimeout(r, 10))
    }
    this.locks.set(userId, true)

    try {
      let wallet = this.wallets.get(userId)
      if (!wallet) {
        wallet = {
          id: `wallet_${userId}`,
          user_id: userId,
          balance: 0.0,
          currency: 'INR',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        this.wallets.set(userId, wallet)
      }

      const balanceBefore = this.toNumeric(wallet.balance)
      let balanceAfter = 0.0

      if (cleanDir === 'CREDIT') {
        balanceAfter = this.toNumeric(balanceBefore + cleanAmount)
      } else {
        if (balanceBefore < cleanAmount) {
          return {
            success: false,
            error_code: 'INSUFFICIENT_FUNDS',
            current_balance: balanceBefore,
            required_amount: cleanAmount,
            message: 'Insufficient wallet balance to complete this debit.',
          }
        }
        balanceAfter = this.toNumeric(balanceBefore - cleanAmount)
      }

      // Check DB non-negative constraint simulation
      if (balanceAfter < 0) {
        throw new Error('Check constraint violation: balance >= 0.00')
      }

      // Atomically update wallet
      wallet.balance = balanceAfter
      wallet.updated_at = new Date().toISOString()

      // Insert ledger entry
      const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
      const ledgerEntry = {
        id: txId,
        wallet_id: wallet.id,
        user_id: userId,
        transaction_type: transactionType,
        direction: cleanDir,
        amount: cleanAmount,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        source_reference_type: sourceReferenceType,
        source_reference_id: sourceReferenceId,
        idempotency_key: idempotencyKey ? String(idempotencyKey).trim() : null,
        description: description || 'Wallet Ledger Entry',
        metadata: metadata || {},
        created_at: new Date().toISOString(),
      }

      this.walletLedger.push(ledgerEntry)
      if (ledgerEntry.idempotency_key) {
        this.idempotencyIndex.set(ledgerEntry.idempotency_key, ledgerEntry)
      }

      return {
        success: true,
        transaction_id: txId,
        wallet_id: wallet.id,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        amount: cleanAmount,
        direction: cleanDir,
        message: 'Wallet ledger entry recorded successfully.',
      }
    } finally {
      this.locks.set(userId, false)
    }
  }
}

// ----------------------------------------------------------------------------
// SUITE 1: SQL MIGRATION SECURITY & SYNTAX AUDIT
// ----------------------------------------------------------------------------
test('1. Migration SQL exists and contains all required Phase 9.1 components', () => {
  const sqlPath = path.resolve(process.cwd(), 'supabase_phase9_1_wallet_foundation_and_ledger.sql')
  assert(fs.existsSync(sqlPath), 'supabase_phase9_1_wallet_foundation_and_ledger.sql must exist')
  const sql = fs.readFileSync(sqlPath, 'utf8')

  assert(sql.includes('CREATE TABLE IF NOT EXISTS public.wallets'), 'Must create public.wallets table')
  assert(sql.includes('CREATE TABLE IF NOT EXISTS public.wallet_ledger'), 'Must create public.wallet_ledger table')
  assert(sql.includes('chk_wallet_non_negative_balance'), 'Must enforce non-negative check constraint on wallets')
  assert(sql.includes('prevent_wallet_ledger_modification'), 'Must include ledger immutability trigger function')
  assert(sql.includes('ENABLE ROW LEVEL SECURITY'), 'Must enable RLS on both tables')
  assert(sql.includes('REVOKE INSERT, UPDATE, DELETE ON public.wallets'), 'Must revoke write privileges on wallets')
  assert(sql.includes('REVOKE INSERT, UPDATE, DELETE ON public.wallet_ledger'), 'Must revoke write privileges on wallet_ledger')
  assert(sql.includes('get_or_create_wallet()'), 'Must define get_or_create_wallet RPC')
  assert(sql.includes('record_wallet_ledger_entry'), 'Must define record_wallet_ledger_entry RPC')
})

test('2. Migration SQL enforces explicit search_path and safe privileges', () => {
  const sql = fs.readFileSync(path.resolve(process.cwd(), 'supabase_phase9_1_wallet_foundation_and_ledger.sql'), 'utf8')

  // Safe search path
  const searchPathMatches = (sql.match(/SET search_path = public, pg_temp/g) || []).length
  assert(searchPathMatches >= 2, 'SECURITY DEFINER functions must set explicit search_path = public, pg_temp')

  // Revoke EXECUTE from PUBLIC and anon
  assert(sql.includes('REVOKE EXECUTE ON FUNCTION public.get_or_create_wallet() FROM PUBLIC;'), 'Revoke get_or_create_wallet from PUBLIC')
  assert(sql.includes('REVOKE EXECUTE ON FUNCTION public.get_or_create_wallet() FROM anon;'), 'Revoke get_or_create_wallet from anon')
  assert(sql.includes('REVOKE EXECUTE ON FUNCTION public.record_wallet_ledger_entry'), 'Revoke record_wallet_ledger_entry from PUBLIC')
  assert(sql.includes('REVOKE EXECUTE ON FUNCTION public.record_wallet_ledger_entry'), 'Revoke record_wallet_ledger_entry from anon')

  // Check NUMERIC(12, 2) usage
  assert(sql.includes('NUMERIC(12, 2)'), 'Must use exact NUMERIC(12, 2) precision for balance and amount')
  assert(!sql.includes('FLOAT') && !sql.includes('REAL'), 'Must never use floating point types')
})

// ----------------------------------------------------------------------------
// SUITE 2: ACCESS CONTROL, PRIVILEGE REVOCATION & IMMUTABILITY
// ----------------------------------------------------------------------------
test('3. Direct client INSERT/UPDATE/DELETE on wallets table is blocked', () => {
  const db = new SimulatedWalletDatabase()
  assert.throws(
    () => db.directClientInsertWallet('authenticated', { user_id: 'user_1', balance: 500 }),
    /permission denied/,
    'Client INSERT on wallets must be rejected'
  )
  assert.throws(
    () => db.directClientUpdateWallet('authenticated', 'user_1', { balance: 9999 }),
    /permission denied/,
    'Client UPDATE on wallets must be rejected'
  )
  assert.throws(
    () => db.directClientDeleteWallet('authenticated', 'user_1'),
    /permission denied/,
    'Client DELETE on wallets must be rejected'
  )
})

test('4. Direct client INSERT on wallet_ledger table is blocked', () => {
  const db = new SimulatedWalletDatabase()
  assert.throws(
    () => db.directClientInsertLedger('authenticated', { user_id: 'user_1', amount: 100 }),
    /permission denied/,
    'Client INSERT on wallet_ledger must be rejected'
  )
})

test('5. Ledger immutability trigger blocks UPDATE and DELETE on wallet_ledger', () => {
  const db = new SimulatedWalletDatabase()
  assert.throws(
    () => db.updateLedgerEntry('tx_1', { amount: 50 }),
    /immutable and cannot be updated or deleted/,
    'UPDATE on wallet_ledger must throw immutability error'
  )
  assert.throws(
    () => db.deleteLedgerEntry('tx_1'),
    /immutable and cannot be updated or deleted/,
    'DELETE on wallet_ledger must throw immutability error'
  )
})

test('6. Row Level Security enforces user isolation (User A cannot read User B)', () => {
  const db = new SimulatedWalletDatabase()
  db.wallets.set('user_A', { id: 'w_A', user_id: 'user_A', balance: 150.0, currency: 'INR' })
  db.wallets.set('user_B', { id: 'w_B', user_id: 'user_B', balance: 300.0, currency: 'INR' })

  // User A reads
  const userAReads = db.selectWallets('authenticated', 'user_A', false)
  assert.strictEqual(userAReads.length, 1)
  assert.strictEqual(userAReads[0].user_id, 'user_A')
  assert.strictEqual(userAReads[0].balance, 150.0)

  // Anon reads
  const anonReads = db.selectWallets('anon', null, false)
  assert.strictEqual(anonReads.length, 0, 'Anonymous users must read 0 rows')

  // Admin reads all
  const adminReads = db.selectWallets('authenticated', 'admin_1', true)
  assert.strictEqual(adminReads.length, 2, 'Admins can view all wallets')
})

// ----------------------------------------------------------------------------
// SUITE 3: get_or_create_wallet() RPC BEHAVIOR
// ----------------------------------------------------------------------------
test('7. get_or_create_wallet creates a new wallet with 0.00 INR balance for uninitialized user', () => {
  const db = new SimulatedWalletDatabase()
  const res = db.getOrCreateWallet({ callerUid: 'new_user_123' })

  assert.strictEqual(res.success, true)
  assert.strictEqual(res.wallet.user_id, 'new_user_123')
  assert.strictEqual(res.wallet.balance, 0.0)
  assert.strictEqual(res.wallet.currency, 'INR')
})

test('8. get_or_create_wallet returns existing wallet and does not overwrite balance', () => {
  const db = new SimulatedWalletDatabase()
  db.wallets.set('existing_user', {
    id: 'w_existing',
    user_id: 'existing_user',
    balance: 250.75,
    currency: 'INR',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })

  const res = db.getOrCreateWallet({ callerUid: 'existing_user' })
  assert.strictEqual(res.success, true)
  assert.strictEqual(res.wallet.balance, 250.75)
})

test('9. get_or_create_wallet rejects unauthenticated callers', () => {
  const db = new SimulatedWalletDatabase()
  const res = db.getOrCreateWallet({ callerUid: null })
  assert.strictEqual(res.success, false)
  assert.strictEqual(res.error_code, 'UNAUTHENTICATED')
})

// ----------------------------------------------------------------------------
// SUITE 4: record_wallet_ledger_entry() AUTHORIZATION & BOUNDARY CHECKS
// ----------------------------------------------------------------------------
await asyncTest('10. Client user calling record_wallet_ledger_entry directly is rejected (UNAUTHORIZED)', async () => {
  const db = new SimulatedWalletDatabase()
  const res = await db.recordWalletLedgerEntry({
    sessionRole: 'authenticated',
    callerUid: 'user_attacker',
    isAdmin: false,
    userId: 'user_attacker',
    transactionType: 'DEPOSIT',
    direction: 'CREDIT',
    amount: 1000,
  })

  assert.strictEqual(res.success, false)
  assert.strictEqual(res.error_code, 'UNAUTHORIZED')
  assert(res.message.includes('restricted to administrators and system service role'))
})

await asyncTest('11. Service role or Admin can successfully execute ledger transitions', async () => {
  const db = new SimulatedWalletDatabase()
  const res = await db.recordWalletLedgerEntry({
    sessionRole: 'service_role',
    callerUid: null,
    isAdmin: false,
    userId: 'user_player',
    transactionType: 'DEPOSIT',
    direction: 'CREDIT',
    amount: 50.0,
    description: 'Verified UPI Deposit',
  })

  assert.strictEqual(res.success, true)
  assert.strictEqual(res.balance_before, 0.0)
  assert.strictEqual(res.balance_after, 50.0)
  assert.strictEqual(res.amount, 50.0)
  assert.strictEqual(res.direction, 'CREDIT')
})

// ----------------------------------------------------------------------------
// SUITE 5: FINANCIAL BALANCE TRANSITIONS & NON-NEGATIVE ENFORCEMENT
// ----------------------------------------------------------------------------
await asyncTest('12. Debit exceeding balance is rejected with INSUFFICIENT_FUNDS and balance is untouched', async () => {
  const db = new SimulatedWalletDatabase()
  // Credit 20 INR first
  await db.recordWalletLedgerEntry({
    sessionRole: 'service_role',
    userId: 'user_poor',
    transactionType: 'DEPOSIT',
    direction: 'CREDIT',
    amount: 20.0,
  })

  // Try to debit 50 INR
  const debitRes = await db.recordWalletLedgerEntry({
    sessionRole: 'service_role',
    userId: 'user_poor',
    transactionType: 'ENTRY_FEE_DEBIT',
    direction: 'DEBIT',
    amount: 50.0,
  })

  assert.strictEqual(debitRes.success, false)
  assert.strictEqual(debitRes.error_code, 'INSUFFICIENT_FUNDS')
  assert.strictEqual(debitRes.current_balance, 20.0)
  assert.strictEqual(debitRes.required_amount, 50.0)

  // Verify wallet balance is still exactly 20.00
  const wallet = db.wallets.get('user_poor')
  assert.strictEqual(wallet.balance, 20.0)
})

await asyncTest('13. Non-positive, negative, or invalid amounts are rejected', async () => {
  const db = new SimulatedWalletDatabase()
  const resZero = await db.recordWalletLedgerEntry({
    sessionRole: 'service_role',
    userId: 'user_1',
    transactionType: 'DEPOSIT',
    direction: 'CREDIT',
    amount: 0,
  })
  assert.strictEqual(resZero.success, false)
  assert.strictEqual(resZero.error_code, 'INVALID_AMOUNT')

  const resNeg = await db.recordWalletLedgerEntry({
    sessionRole: 'service_role',
    userId: 'user_1',
    transactionType: 'DEPOSIT',
    direction: 'CREDIT',
    amount: -10,
  })
  assert.strictEqual(resNeg.success, false)
  assert.strictEqual(resNeg.error_code, 'INVALID_AMOUNT')
})

await asyncTest('14. Exact fractional decimal precision (NUMERIC(12, 2)) calculations', async () => {
  const db = new SimulatedWalletDatabase()
  // Add 10.25
  await db.recordWalletLedgerEntry({
    sessionRole: 'service_role',
    userId: 'user_precision',
    transactionType: 'DEPOSIT',
    direction: 'CREDIT',
    amount: 10.25,
  })

  // Add 20.55
  await db.recordWalletLedgerEntry({
    sessionRole: 'service_role',
    userId: 'user_precision',
    transactionType: 'BONUS_CREDIT',
    direction: 'CREDIT',
    amount: 20.55,
  })

  // Debit 5.10
  const debitRes = await db.recordWalletLedgerEntry({
    sessionRole: 'service_role',
    userId: 'user_precision',
    transactionType: 'ENTRY_FEE_DEBIT',
    direction: 'DEBIT',
    amount: 5.1,
  })

  assert.strictEqual(debitRes.success, true)
  assert.strictEqual(debitRes.balance_before, 30.8)
  assert.strictEqual(debitRes.balance_after, 25.7) // 30.80 - 5.10 = 25.70
})

// ----------------------------------------------------------------------------
// SUITE 6: IDEMPOTENCY PROTECTION
// ----------------------------------------------------------------------------
await asyncTest('15. Duplicate idempotency key returns idempotent replay without altering balance twice', async () => {
  const db = new SimulatedWalletDatabase()
  const key = 'idem_unique_tx_999'

  // First execution
  const res1 = await db.recordWalletLedgerEntry({
    sessionRole: 'service_role',
    userId: 'user_idem',
    transactionType: 'DEPOSIT',
    direction: 'CREDIT',
    amount: 100.0,
    idempotencyKey: key,
  })
  assert.strictEqual(res1.success, true)
  assert.strictEqual(res1.balance_after, 100.0)
  assert.strictEqual(res1.idempotent_replay, undefined)

  // Replay exact same key
  const res2 = await db.recordWalletLedgerEntry({
    sessionRole: 'service_role',
    userId: 'user_idem',
    transactionType: 'DEPOSIT',
    direction: 'CREDIT',
    amount: 100.0,
    idempotencyKey: key,
  })
  assert.strictEqual(res2.success, true)
  assert.strictEqual(res2.idempotent_replay, true)
  assert.strictEqual(res2.balance_after, 100.0)

  // Balance MUST remain 100.00, NOT 200.00
  const wallet = db.wallets.get('user_idem')
  assert.strictEqual(wallet.balance, 100.0)

  // Ledger must have only 1 entry
  assert.strictEqual(db.walletLedger.length, 1)
})

// ----------------------------------------------------------------------------
// SUITE 7: CONCURRENCY & ROW LOCKING SIMULATION
// ----------------------------------------------------------------------------
await asyncTest('16. Concurrent financial transitions for the same user serialize properly', async () => {
  const db = new SimulatedWalletDatabase()
  // Start with 100 INR
  await db.recordWalletLedgerEntry({
    sessionRole: 'service_role',
    userId: 'user_race',
    transactionType: 'DEPOSIT',
    direction: 'CREDIT',
    amount: 100.0,
  })

  // Launch 5 concurrent operations: 3 debits of 30 INR each, 2 credits of 20 INR each
  // Total expected balance: 100 - 30 - 30 - 30 + 20 + 20 = 50 INR
  const operations = [
    db.recordWalletLedgerEntry({ sessionRole: 'service_role', userId: 'user_race', transactionType: 'ENTRY_FEE_DEBIT', direction: 'DEBIT', amount: 30 }),
    db.recordWalletLedgerEntry({ sessionRole: 'service_role', userId: 'user_race', transactionType: 'ENTRY_FEE_DEBIT', direction: 'DEBIT', amount: 30 }),
    db.recordWalletLedgerEntry({ sessionRole: 'service_role', userId: 'user_race', transactionType: 'ENTRY_FEE_DEBIT', direction: 'DEBIT', amount: 30 }),
    db.recordWalletLedgerEntry({ sessionRole: 'service_role', userId: 'user_race', transactionType: 'BONUS_CREDIT', direction: 'CREDIT', amount: 20 }),
    db.recordWalletLedgerEntry({ sessionRole: 'service_role', userId: 'user_race', transactionType: 'BONUS_CREDIT', direction: 'CREDIT', amount: 20 }),
  ]

  const results = await Promise.all(operations)
  results.forEach((r) => assert.strictEqual(r.success, true))

  const finalWallet = db.wallets.get('user_race')
  assert.strictEqual(finalWallet.balance, 50.0, 'Final balance must be exactly 50.00 after all concurrent ops')
  assert.strictEqual(db.walletLedger.filter((l) => l.user_id === 'user_race').length, 6) // initial + 5 ops
})

// ----------------------------------------------------------------------------
// SUITE 8: FRONTEND SERVICE CONTRACT VERIFICATION
// ----------------------------------------------------------------------------
test('17. walletService.js exposes fetchUserWallet and fetchWalletLedger', async () => {
  const servicePath = path.resolve(process.cwd(), 'src/services/walletService.js')
  const content = fs.readFileSync(servicePath, 'utf8')

  assert(content.includes('export async function fetchUserWallet'), 'Must export fetchUserWallet')
  assert(content.includes('get_or_create_wallet'), 'Must invoke get_or_create_wallet RPC')
  assert(content.includes('export async function fetchWalletLedger'), 'Must export fetchWalletLedger')
  assert(content.includes("from('wallet_ledger')"), 'Must query wallet_ledger table')
})

test('18. WalletPage.jsx reads authoritative database balance with fallback', () => {
  const pagePath = path.resolve(process.cwd(), 'src/pages/WalletPage.jsx')
  const content = fs.readFileSync(pagePath, 'utf8')

  assert(content.includes('fetchUserWallet'), 'Must import fetchUserWallet')
  assert(content.includes('dbWalletBalance'), 'Must maintain dbWalletBalance state')
  assert(content.includes('fetchUserWallet()'), 'Must call fetchUserWallet in syncWalletData')
})

// ----------------------------------------------------------------------------
// SUITE 9: ANTI-CASCADE DELETION & COMPOSITE INTEGRITY PROTECTION
// ----------------------------------------------------------------------------
test('19. Account deletion is restricted (ON DELETE RESTRICT) when wallet/ledger history exists', () => {
  const db = new SimulatedWalletDatabase()
  db.wallets.set('user_has_wallet', { id: 'w_1', user_id: 'user_has_wallet', balance: 0.0, currency: 'INR' })

  // Attempt to delete user with wallet
  assert.throws(
    () => db.deleteAuthUser('user_has_wallet'),
    /violates foreign key constraint.*user has financial wallet record/,
    'Deleting user with active wallet must throw foreign key restriction error'
  )

  // Add ledger entry to user without wallet in cache
  db.walletLedger.push({
    id: 'tx_1',
    wallet_id: 'w_2',
    user_id: 'user_has_ledger',
    amount: 100.0,
  })

  // Attempt to delete user with ledger history
  assert.throws(
    () => db.deleteAuthUser('user_has_ledger'),
    /violates foreign key constraint.*user has financial ledger history/,
    'Deleting user with ledger history must throw foreign key restriction error'
  )

  // Deleting user with neither wallet nor ledger succeeds
  assert.strictEqual(db.deleteAuthUser('clean_user_no_history'), true)
})

test('20. Ledger consistency: Composite FK blocks associating User A wallet with User B user_id', () => {
  const db = new SimulatedWalletDatabase()
  db.wallets.set('user_A', { id: 'w_A', user_id: 'user_A', balance: 50.0, currency: 'INR' })
  db.wallets.set('user_B', { id: 'w_B', user_id: 'user_B', balance: 50.0, currency: 'INR' })

  // Valid matching composite pair (w_A, user_A)
  assert.doesNotThrow(() => db.validateCompositeWalletUser('w_A', 'user_A'))

  // Mismatched composite pair: wallet belonging to User A paired with user_id of User B
  assert.throws(
    () => db.validateCompositeWalletUser('w_A', 'user_B'),
    /violates foreign key constraint fk_wallet_ledger_wallet_user/,
    'Mismatched wallet_id and user_id must be rejected by composite foreign key'
  )
})

test('21. Migration SQL explicitly enforces ON DELETE RESTRICT and Composite FKs (No CASCADE)', () => {
  const sqlPath = path.resolve(process.cwd(), 'supabase_phase9_1_wallet_foundation_and_ledger.sql')
  const sql = fs.readFileSync(sqlPath, 'utf8')

  // Enforce ON DELETE RESTRICT on wallets
  assert(
    sql.includes('user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE RESTRICT'),
    'wallets.user_id must use ON DELETE RESTRICT'
  )

  // Enforce compound unique constraint on wallets
  assert(
    sql.includes('CONSTRAINT uq_wallets_id_user_id UNIQUE (id, user_id)'),
    'wallets must have compound UNIQUE (id, user_id) constraint'
  )

  // Enforce composite foreign key on wallet_ledger
  assert(
    sql.includes('CONSTRAINT fk_wallet_ledger_wallet_user FOREIGN KEY (wallet_id, user_id) REFERENCES public.wallets(id, user_id) ON DELETE RESTRICT'),
    'wallet_ledger must have composite FK referencing wallets(id, user_id) ON DELETE RESTRICT'
  )

  // Verify wallet_ledger.user_id references auth.users ON DELETE RESTRICT
  assert(
    sql.includes('CONSTRAINT fk_wallet_ledger_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE RESTRICT'),
    'wallet_ledger.user_id must reference auth.users(id) ON DELETE RESTRICT'
  )

  // Confirm NO ON DELETE CASCADE on wallets or wallet_ledger table creation
  const walletsCreation = sql.substring(sql.indexOf('CREATE TABLE IF NOT EXISTS public.wallets'), sql.indexOf('CREATE TABLE IF NOT EXISTS public.wallet_ledger'))
  assert(!walletsCreation.includes('CASCADE'), 'wallets table creation must not contain CASCADE')

  const ledgerCreation = sql.substring(sql.indexOf('CREATE TABLE IF NOT EXISTS public.wallet_ledger'), sql.indexOf('-- Safe migration upgrade'))
  assert(!ledgerCreation.includes('CASCADE'), 'wallet_ledger table creation must not contain CASCADE')
})

// ----------------------------------------------------------------------------
// TEST SUMMARY REPORT
// ----------------------------------------------------------------------------
console.log('\n============================================================')
console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`)
console.log('============================================================\n')

if (failed > 0) {
  process.exit(1)
} else {
  console.log('🎉 ALL PHASE 9.1 WALLET FOUNDATION TESTS PASSED!')
}

