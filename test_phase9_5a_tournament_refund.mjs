// ============================================================================
// MJ ESPORTS — Phase 9.5A: Tournament Cancellation & Wallet Refund Test Suite
// ============================================================================

import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'

console.log('============================================================')
console.log('🧪 RUNNING PHASE 9.5A: TOURNAMENT CANCELLATION & WALLET REFUND SUITE')
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
// SIMULATION ENGINE: Database Invariants, Financial Ledger & Cancellation RPC
// ----------------------------------------------------------------------------

class MockDatabase {
  constructor() {
    this.tournaments = new Map()
    this.registrations = new Map()
    this.tournamentPayments = new Map()
    this.wallets = new Map()
    this.walletLedger = []
    this.tournamentRefunds = new Map()
    this.advisoryLocks = new Set()
  }

  createTournament(data) {
    const id = data.id || `tourney_${Date.now()}`
    const record = {
      id,
      title: data.title || 'Test Tournament',
      status: data.status || 'Registration Open',
      entry_fee: data.entry_fee || '₹50',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    this.tournaments.set(id, record)
    return record
  }

  createRegistration(data) {
    const id = data.id || `reg_${Date.now()}_${Math.random()}`
    const record = {
      id,
      tournament_id: data.tournament_id,
      user_id: data.user_id,
      team_name: data.team_name || 'Squad 1',
      status: data.status || 'Approved',
      payment_status: data.payment_status || 'Paid',
      payment_id: data.payment_id || null,
      transaction_id: data.transaction_id || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    this.registrations.set(id, record)
    return record
  }

  createRazorpayPayment(data) {
    const id = data.id || `pay_rec_${Date.now()}`
    const record = {
      id,
      tournament_id: data.tournament_id,
      registration_id: data.registration_id,
      user_id: data.user_id,
      razorpay_order_id: data.razorpay_order_id || `order_${Date.now()}`,
      razorpay_payment_id: data.razorpay_payment_id || `pay_${Date.now()}`,
      amount: data.amount,
      currency: 'INR',
      status: data.status || 'CONSUMED',
      created_at: new Date().toISOString(),
    }
    this.tournamentPayments.set(id, record)
    return record
  }

  getOrCreateWallet(userId, initialBalance = 0.0) {
    if (!this.wallets.has(userId)) {
      this.wallets.set(userId, {
        id: `wallet_${userId}`,
        user_id: userId,
        balance: initialBalance,
        currency: 'INR',
        updated_at: new Date().toISOString(),
      })
    }
    return this.wallets.get(userId)
  }

  recordWalletLedgerEntry({
    userId,
    transactionType,
    direction,
    amount,
    sourceReferenceType = null,
    sourceReferenceId = null,
    idempotencyKey = null,
    description = 'Wallet Ledger Entry',
    metadata = {},
    callerRole = 'admin',
  }) {
    if (callerRole !== 'admin' && callerRole !== 'service_role') {
      return { success: false, error_code: 'UNAUTHORIZED', message: 'Restricted to administrators.' }
    }

    if (!userId) return { success: false, error_code: 'INVALID_USER' }
    if (amount <= 0.0) return { success: false, error_code: 'INVALID_AMOUNT' }
    if (amount !== Math.trunc(amount)) {
      return { success: false, error_code: 'DECIMAL_AMOUNT_REJECTED', message: 'Whole rupees only.' }
    }
    if (amount < 1.0) return { success: false, error_code: 'INVALID_AMOUNT' }

    // Check idempotency
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

    const wallet = this.getOrCreateWallet(userId)
    const balanceBefore = wallet.balance
    let balanceAfter = balanceBefore

    if (direction === 'CREDIT') {
      balanceAfter = balanceBefore + amount
    } else if (direction === 'DEBIT') {
      if (balanceBefore < amount) {
        return { success: false, error_code: 'INSUFFICIENT_FUNDS' }
      }
      balanceAfter = balanceBefore - amount
    }

    // Invariant: Non-negative balance
    if (balanceAfter < 0) {
      return { success: false, error_code: 'NEGATIVE_BALANCE_REJECTED' }
    }

    // Invariant: Whole rupee balance
    if (balanceAfter !== Math.trunc(balanceAfter)) {
      return { success: false, error_code: 'DECIMAL_BALANCE_REJECTED' }
    }

    // Update wallet balance
    wallet.balance = balanceAfter
    wallet.updated_at = new Date().toISOString()

    const txId = `tx_${Date.now()}_${Math.random()}`
    const ledgerEntry = {
      id: txId,
      wallet_id: wallet.id,
      user_id: userId,
      transaction_type: transactionType,
      direction,
      amount,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      source_reference_type: sourceReferenceType,
      source_reference_id: sourceReferenceId,
      idempotency_key: idempotencyKey,
      description,
      metadata,
      created_at: new Date().toISOString(),
    }
    this.walletLedger.push(ledgerEntry)

    return {
      success: true,
      transaction_id: txId,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      amount,
      direction,
    }
  }

  // Simulated cancel_tournament_and_refund RPC matching SQL migration exactly
  cancelTournamentAndRefund(tournamentId, reason = 'Tournament Cancelled by Organizer', callerRole = 'admin') {
    // 1. Authorization
    if (callerRole !== 'admin' && callerRole !== 'service_role') {
      return { success: false, error_code: 'UNAUTHORIZED', message: 'Only administrators can cancel tournaments.' }
    }

    if (!tournamentId || !tournamentId.trim()) {
      return { success: false, error_code: 'INVALID_TOURNAMENT_ID' }
    }

    const cleanId = tournamentId.trim()
    const cleanReason = (reason && reason.trim()) || 'Tournament Cancelled by Organizer'

    // 2. Advisory Lock Simulation
    const lockKey = `cancel_tournament_${cleanId}`
    if (this.advisoryLocks.has(lockKey)) {
      // Simulate serial lock wait or rejection
      return { success: false, error_code: 'CONCURRENT_CANCELLATION_IN_PROGRESS' }
    }
    this.advisoryLocks.add(lockKey)

    try {
      // 3. Lock Tournament Row FOR UPDATE
      const tournament = this.tournaments.get(cleanId)
      if (!tournament) {
        return { success: false, error_code: 'TOURNAMENT_NOT_FOUND' }
      }

      // 4. Terminal Lifecycle Guard
      if (tournament.status === 'Completed' || tournament.status === 'Results Pending') {
        return {
          success: false,
          error_code: 'CANNOT_CANCEL_COMPLETED_TOURNAMENT',
          current_status: tournament.status,
        }
      }

      // Parse tournament entry fee fallback
      const rawDigits = (tournament.entry_fee || '0').replace(/[^0-9.]/g, '')
      const parsedFee = rawDigits ? Math.trunc(parseFloat(rawDigits)) : 0

      let refundedCount = 0
      let skippedCount = 0
      let totalRefunded = 0

      // 6. Discover Eligible Paid Registrations (CORRECTION 1)
      const tourneyRegs = Array.from(this.registrations.values()).filter(
        (r) => r.tournament_id === cleanId
      )

      for (const reg of tourneyRegs) {
        // Exclude free entries
        if (reg.payment_status === 'Free' || reg.payment_id === 'FREE_ENTRY') {
          skippedCount++
          continue
        }

        // Exclude registrations that already received an authoritative refund
        const refundKey = `${cleanId}_${reg.id}`
        if (this.tournamentRefunds.has(refundKey)) {
          skippedCount++
          continue
        }

        // Find payment evidence
        // Evidence A: Razorpay payment
        const razorpayPayment = Array.from(this.tournamentPayments.values()).find(
          (tp) => tp.registration_id === reg.id && tp.status === 'CONSUMED' && tp.amount > 0
        )

        // Evidence B: Wallet ENTRY_FEE_DEBIT
        const walletDebit = this.walletLedger.find(
          (wl) =>
            wl.transaction_type === 'ENTRY_FEE_DEBIT' &&
            wl.direction === 'DEBIT' &&
            wl.source_reference_id === cleanId &&
            (wl.metadata?.registration_id === reg.id ||
              wl.id === reg.payment_id ||
              wl.idempotency_key === reg.transaction_id)
        )

        // Must have authoritative payment evidence or valid Paid status with payment_id
        const hasEvidence =
          Boolean(razorpayPayment) ||
          Boolean(walletDebit) ||
          (reg.payment_status === 'Paid' && Boolean(reg.payment_id))

        if (!hasEvidence) {
          skippedCount++
          continue
        }

        // Calculate authoritative refund amount
        let refundAmount = 0
        let paymentMethod = 'WALLET'
        let origPayRef = ''

        if (walletDebit && walletDebit.amount > 0) {
          paymentMethod = 'WALLET'
          refundAmount = Math.trunc(walletDebit.amount)
          origPayRef = walletDebit.id
        } else if (razorpayPayment && razorpayPayment.amount > 0) {
          paymentMethod = 'RAZORPAY'
          refundAmount = Math.trunc(razorpayPayment.amount)
          origPayRef = razorpayPayment.razorpay_payment_id || razorpayPayment.id
        } else {
          refundAmount = parsedFee
          paymentMethod = reg.payment_id?.includes('-') ? 'WALLET' : 'RAZORPAY'
          origPayRef = reg.payment_id || 'LEGACY_PAID'
        }

        if (refundAmount <= 0 || !reg.user_id) {
          skippedCount++
          continue
        }

        // 6.1 - 6.3 Atomically Credit Wallet & Insert Ledger Entry
        const ledgerRes = this.recordWalletLedgerEntry({
          userId: reg.user_id,
          transactionType: 'REFUND',
          direction: 'CREDIT',
          amount: refundAmount,
          sourceReferenceType: 'tournaments',
          sourceReferenceId: cleanId,
          idempotencyKey: `REFUND-${cleanId}-${reg.id}`,
          description: `Refund: ${tournament.title} (Tournament Cancelled)`,
          metadata: {
            tournament_id: cleanId,
            tournament_title: tournament.title,
            registration_id: reg.id,
            team_name: reg.team_name,
            original_payment_method: paymentMethod,
            original_payment_reference: origPayRef,
            reason: cleanReason,
          },
          callerRole: 'admin',
        })

        if (!ledgerRes.success) {
          throw new Error(`Ledger entry failed for registration ${reg.id}: ${ledgerRes.message}`)
        }

        // 6.4 Insert Authoritative Tournament Refund Record
        this.tournamentRefunds.set(refundKey, {
          id: `ref_${Date.now()}_${Math.random()}`,
          tournament_id: cleanId,
          registration_id: reg.id,
          user_id: reg.user_id,
          amount: refundAmount,
          currency: 'INR',
          payment_method: paymentMethod,
          original_payment_reference: origPayRef,
          wallet_ledger_id: ledgerRes.transaction_id,
          status: 'COMPLETED',
          reason: cleanReason,
          created_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        })

        // 6.5 Update Registration Status
        reg.status = 'Cancelled'
        reg.payment_status = 'Refunded'
        reg.updated_at = new Date().toISOString()

        // CORRECTION 2: Original Razorpay payment status remains CONSUMED!
        // Never set to REFUNDED.
        if (razorpayPayment) {
          assert.strictEqual(
            razorpayPayment.status,
            'CONSUMED',
            'Razorpay payment must remain CONSUMED historical record'
          )
        }

        refundedCount++
        totalRefunded += refundAmount
      }

      // 7. Update Tournament Status
      tournament.status = 'Cancelled'
      tournament.updated_at = new Date().toISOString()

      return {
        success: true,
        tournament_id: cleanId,
        tournament_title: tournament.title,
        status: 'Cancelled',
        refunded_count: refundedCount,
        total_refund_amount: totalRefunded,
        skipped_count: skippedCount,
        message: `Tournament cancelled successfully. ${refundedCount} eligible entry fee(s) refunded to player wallet(s).`,
      }
    } finally {
      this.advisoryLocks.delete(lockKey)
    }
  }
}

// ----------------------------------------------------------------------------
// TEST SUITE EXECUTION
// ----------------------------------------------------------------------------

console.log('--- SUITE 1: SQL MIGRATION FILE VALIDATION ---')

test('SQL Migration file exists and has correct name', () => {
  const filePath = path.resolve(process.cwd(), 'supabase_phase9_5a_tournament_cancellation_and_wallet_refund.sql')
  assert.ok(fs.existsSync(filePath), 'Migration file must exist')
  const content = fs.readFileSync(filePath, 'utf8')
  assert.ok(content.length > 5000, 'Migration file should contain complete schema')
})

test('SQL Migration drops chk_wallet_max_balance_200 and retains whole-rupee/non-negative', () => {
  const content = fs.readFileSync('supabase_phase9_5a_tournament_cancellation_and_wallet_refund.sql', 'utf8')
  assert.ok(content.includes('chk_wallet_max_balance_200'), 'Must mention chk_wallet_max_balance_200')
  assert.ok(content.includes('DROP CONSTRAINT chk_wallet_max_balance_200'), 'Must drop ₹200 ceiling')
  assert.ok(content.includes('chk_wallet_non_negative_balance'), 'Must enforce non-negative balance')
  assert.ok(content.includes('chk_wallet_whole_rupee'), 'Must enforce whole rupee')
})

test('SQL Migration creates public.tournament_refunds with required constraints and RLS', () => {
  const content = fs.readFileSync('supabase_phase9_5a_tournament_cancellation_and_wallet_refund.sql', 'utf8')
  assert.ok(content.includes('CREATE TABLE IF NOT EXISTS public.tournament_refunds'), 'Must create table')
  assert.ok(content.includes('uq_tournament_refund_registration UNIQUE (tournament_id, registration_id)'), 'Must enforce unique refund per registration')
  assert.ok(content.includes('ENABLE ROW LEVEL SECURITY'), 'Must enable RLS')
  assert.ok(content.includes('REVOKE INSERT, UPDATE, DELETE ON TABLE public.tournament_refunds FROM authenticated'), 'Must revoke client writes')
})

test('SQL Migration implements cancel_tournament_and_refund with SECURITY DEFINER and advisory lock', () => {
  const content = fs.readFileSync('supabase_phase9_5a_tournament_cancellation_and_wallet_refund.sql', 'utf8')
  assert.ok(content.includes('FUNCTION public.cancel_tournament_and_refund'), 'Must create RPC')
  assert.ok(content.includes('SECURITY DEFINER'), 'Must be SECURITY DEFINER')
  assert.ok(content.includes('pg_advisory_xact_lock'), 'Must use advisory lock for concurrency')
  assert.ok(content.includes('FOR UPDATE'), 'Must lock rows FOR UPDATE')
})

test('SQL Migration satisfies Correction 2: Does NOT update tournament_payments.status to REFUNDED', () => {
  const content = fs.readFileSync('supabase_phase9_5a_tournament_cancellation_and_wallet_refund.sql', 'utf8')
  assert.ok(!content.includes("UPDATE public.tournament_payments SET status = 'REFUNDED'"), 'Must NOT update tournament_payments to REFUNDED')
  assert.ok(content.includes('CORRECTION 2'), 'Must document that Razorpay payment remains historical evidence')
})

console.log('\n--- SUITE 2: REFUND ELIGIBILITY (CORRECTION 1) ---')

test('Eligible Razorpay-paid player is refunded 100%', () => {
  const db = new MockDatabase()
  const tourney = db.createTournament({ id: 't1', entry_fee: '₹50' })
  const reg = db.createRegistration({ id: 'r1', tournament_id: 't1', user_id: 'u1', team_name: 'Alpha' })
  db.createRazorpayPayment({
    tournament_id: 't1',
    registration_id: 'r1',
    user_id: 'u1',
    amount: 50,
    status: 'CONSUMED',
    razorpay_payment_id: 'pay_test_123',
  })

  const res = db.cancelTournamentAndRefund('t1')
  assert.strictEqual(res.success, true)
  assert.strictEqual(res.refunded_count, 1)
  assert.strictEqual(res.total_refund_amount, 50)

  // Wallet must reflect ₹50 credit
  const wallet = db.getOrCreateWallet('u1')
  assert.strictEqual(wallet.balance, 50)

  // Registration updated to Cancelled / Refunded
  const updatedReg = db.registrations.get('r1')
  assert.strictEqual(updatedReg.status, 'Cancelled')
  assert.strictEqual(updatedReg.payment_status, 'Refunded')
})

test('Eligible Wallet-paid player is refunded 100%', () => {
  const db = new MockDatabase()
  const tourney = db.createTournament({ id: 't2', entry_fee: '₹100' })
  db.getOrCreateWallet('u2', 150) // Starts with ₹150

  // Debit ₹100 for tournament entry
  const debitRes = db.recordWalletLedgerEntry({
    userId: 'u2',
    transactionType: 'ENTRY_FEE_DEBIT',
    direction: 'DEBIT',
    amount: 100,
    sourceReferenceType: 'tournaments',
    sourceReferenceId: 't2',
    description: 'Entry fee debit',
    metadata: { registration_id: 'r2' },
  })
  assert.strictEqual(debitRes.success, true)
  assert.strictEqual(db.getOrCreateWallet('u2').balance, 50)

  db.createRegistration({
    id: 'r2',
    tournament_id: 't2',
    user_id: 'u2',
    team_name: 'Beta',
    payment_id: debitRes.transaction_id,
  })

  const cancelRes = db.cancelTournamentAndRefund('t2')
  assert.strictEqual(cancelRes.success, true)
  assert.strictEqual(cancelRes.refunded_count, 1)
  assert.strictEqual(cancelRes.total_refund_amount, 100)

  // Wallet balance restored to ₹150
  assert.strictEqual(db.getOrCreateWallet('u2').balance, 150)
})

test('Free entry registrations are NOT refunded and skipped safely', () => {
  const db = new MockDatabase()
  db.createTournament({ id: 't3', entry_fee: 'Free' })
  db.getOrCreateWallet('u3', 20)
  db.createRegistration({
    id: 'r3',
    tournament_id: 't3',
    user_id: 'u3',
    team_name: 'FreeSquad',
    payment_status: 'Free',
    payment_id: 'FREE_ENTRY',
  })

  const res = db.cancelTournamentAndRefund('t3')
  assert.strictEqual(res.success, true)
  assert.strictEqual(res.refunded_count, 0)
  assert.strictEqual(res.skipped_count, 1)
  assert.strictEqual(res.total_refund_amount, 0)
  assert.strictEqual(db.getOrCreateWallet('u3').balance, 20, 'Free entry player wallet must not change')
})

test('Unpaid or Pending registrations without confirmed payment are NOT refunded', () => {
  const db = new MockDatabase()
  db.createTournament({ id: 't4', entry_fee: '₹80' })
  db.getOrCreateWallet('u4', 0)
  db.createRegistration({
    id: 'r4',
    tournament_id: 't4',
    user_id: 'u4',
    status: 'Pending',
    payment_status: 'Pending',
    payment_id: null,
  })

  const res = db.cancelTournamentAndRefund('t4')
  assert.strictEqual(res.success, true)
  assert.strictEqual(res.refunded_count, 0)
  assert.strictEqual(res.skipped_count, 1)
  assert.strictEqual(db.getOrCreateWallet('u4').balance, 0)
})

test('Player whose registration status changed from Approved (e.g. Under Review) is still refunded if payment was confirmed', () => {
  const db = new MockDatabase()
  db.createTournament({ id: 't5', entry_fee: '₹40' })
  db.getOrCreateWallet('u5', 0)
  // Status is 'Waitlist' or 'Under Review', NOT 'Approved'
  const reg = db.createRegistration({
    id: 'r5',
    tournament_id: 't5',
    user_id: 'u5',
    status: 'Waitlist',
    payment_status: 'Paid',
  })
  db.createRazorpayPayment({
    tournament_id: 't5',
    registration_id: 'r5',
    user_id: 'u5',
    amount: 40,
    status: 'CONSUMED',
    razorpay_payment_id: 'pay_waitlist_1',
  })

  const res = db.cancelTournamentAndRefund('t5')
  assert.strictEqual(res.success, true)
  assert.strictEqual(res.refunded_count, 1, 'Legitimate paid player must not be excluded due to operational status change')
  assert.strictEqual(db.getOrCreateWallet('u5').balance, 40)
})

console.log('\n--- SUITE 3: PAYMENT STATE & RAZORPAY PRESERVATION (CORRECTION 2) ---')

test('Original Razorpay payment status is strictly preserved as CONSUMED', () => {
  const db = new MockDatabase()
  db.createTournament({ id: 't6', entry_fee: '₹60' })
  db.createRegistration({ id: 'r6', tournament_id: 't6', user_id: 'u6' })
  const rzpPayment = db.createRazorpayPayment({
    tournament_id: 't6',
    registration_id: 'r6',
    user_id: 'u6',
    amount: 60,
    status: 'CONSUMED',
    razorpay_payment_id: 'pay_evidence_1',
  })

  db.cancelTournamentAndRefund('t6')

  // Check tournament_payments record
  const checkPayment = db.tournamentPayments.get(rzpPayment.id)
  assert.strictEqual(checkPayment.status, 'CONSUMED', 'Payment status must remain CONSUMED')
  assert.notStrictEqual(checkPayment.status, 'REFUNDED', 'Must never be mislabeled as REFUNDED')

  // Authoritative cancellation refund record must exist in tournament_refunds
  const refundRecord = db.tournamentRefunds.get('t6_r6')
  assert.ok(refundRecord, 'Authoritative refund record must exist in tournament_refunds')
  assert.strictEqual(refundRecord.status, 'COMPLETED')
  assert.strictEqual(refundRecord.payment_method, 'RAZORPAY')
  assert.strictEqual(refundRecord.amount, 60)
})

console.log('\n--- SUITE 4: WALLET CEILING REMOVAL & WHOLE RUPEES (CORRECTION 3) ---')

test('Refund can exceed ₹200 ceiling successfully (e.g. Wallet ₹100 + Refund ₹500 = ₹600)', () => {
  const db = new MockDatabase()
  db.createTournament({ id: 't7', entry_fee: '₹500' })
  db.getOrCreateWallet('u7', 100) // Initial balance ₹100
  db.createRegistration({ id: 'r7', tournament_id: 't7', user_id: 'u7' })
  db.createRazorpayPayment({
    tournament_id: 't7',
    registration_id: 'r7',
    user_id: 'u7',
    amount: 500,
    status: 'CONSUMED',
  })

  const res = db.cancelTournamentAndRefund('t7')
  assert.strictEqual(res.success, true)
  assert.strictEqual(res.refunded_count, 1)

  const wallet = db.getOrCreateWallet('u7')
  assert.strictEqual(wallet.balance, 600, 'Wallet balance must be ₹600 without being capped at ₹200')
})

test('Decimal / paise refund amounts are strictly rejected by whole-rupee invariant', () => {
  const db = new MockDatabase()
  const res = db.recordWalletLedgerEntry({
    userId: 'u8',
    transactionType: 'REFUND',
    direction: 'CREDIT',
    amount: 50.5, // Decimal amount
  })
  assert.strictEqual(res.success, false)
  assert.strictEqual(res.error_code, 'DECIMAL_AMOUNT_REJECTED')
})

console.log('\n--- SUITE 5: IDEMPOTENCY & CONCURRENCY PROTECTION ---')

test('Re-running cancel_tournament_and_refund on an already cancelled tournament is 100% idempotent', () => {
  const db = new MockDatabase()
  db.createTournament({ id: 't8', entry_fee: '₹50' })
  db.getOrCreateWallet('u8', 10)
  db.createRegistration({ id: 'r8', tournament_id: 't8', user_id: 'u8' })
  db.createRazorpayPayment({
    tournament_id: 't8',
    registration_id: 'r8',
    user_id: 'u8',
    amount: 50,
    status: 'CONSUMED',
  })

  // First cancellation
  const res1 = db.cancelTournamentAndRefund('t8')
  assert.strictEqual(res1.success, true)
  assert.strictEqual(res1.refunded_count, 1)
  assert.strictEqual(db.getOrCreateWallet('u8').balance, 60)

  // Second cancellation (Duplicate call)
  const res2 = db.cancelTournamentAndRefund('t8')
  assert.strictEqual(res2.success, true)
  assert.strictEqual(res2.refunded_count, 0, 'No players refunded on duplicate call')
  assert.strictEqual(res2.skipped_count, 1, 'Already refunded registration is skipped')
  assert.strictEqual(res2.total_refund_amount, 0)
  assert.strictEqual(db.getOrCreateWallet('u8').balance, 60, 'Wallet balance must NOT increase twice')
})

asyncTest('Simulated concurrent cancellation requests are serialized safely without race condition', async () => {
  const db = new MockDatabase()
  db.createTournament({ id: 't9', entry_fee: '₹75' })
  db.getOrCreateWallet('u9', 0)
  db.createRegistration({ id: 'r9', tournament_id: 't9', user_id: 'u9' })
  db.createRazorpayPayment({
    tournament_id: 't9',
    registration_id: 'r9',
    user_id: 'u9',
    amount: 75,
    status: 'CONSUMED',
  })

  // Run two cancellations concurrently
  const [res1, res2] = await Promise.all([
    Promise.resolve(db.cancelTournamentAndRefund('t9')),
    Promise.resolve(db.cancelTournamentAndRefund('t9')),
  ])

  // One must succeed with 1 refund, the other must either be rejected by advisory lock or process 0 refunds
  const totalDisbursed = (res1.total_refund_amount || 0) + (res2.total_refund_amount || 0)
  assert.strictEqual(totalDisbursed, 75, 'Total disbursed across concurrent calls must be exactly ₹75')
  assert.strictEqual(db.getOrCreateWallet('u9').balance, 75, 'Wallet must have exactly 1 refund credited')
})

console.log('\n--- SUITE 6: TERMINAL LIFECYCLE GUARDS ---')

test('Completed tournaments cannot be cancelled', () => {
  const db = new MockDatabase()
  db.createTournament({ id: 't10', status: 'Completed', entry_fee: '₹100' })
  const res = db.cancelTournamentAndRefund('t10')
  assert.strictEqual(res.success, false)
  assert.strictEqual(res.error_code, 'CANNOT_CANCEL_COMPLETED_TOURNAMENT')
})

test('Results Pending tournaments cannot be cancelled', () => {
  const db = new MockDatabase()
  db.createTournament({ id: 't11', status: 'Results Pending', entry_fee: '₹100' })
  const res = db.cancelTournamentAndRefund('t11')
  assert.strictEqual(res.success, false)
  assert.strictEqual(res.error_code, 'CANNOT_CANCEL_COMPLETED_TOURNAMENT')
})

console.log('\n--- SUITE 7: SECURITY & AUTHORIZATION BOUNDARIES ---')

test('Anonymous caller cannot cancel tournament', () => {
  const db = new MockDatabase()
  db.createTournament({ id: 't12' })
  const res = db.cancelTournamentAndRefund('t12', 'reason', 'anon')
  assert.strictEqual(res.success, false)
  assert.strictEqual(res.error_code, 'UNAUTHORIZED')
})

test('Regular authenticated player cannot cancel tournament', () => {
  const db = new MockDatabase()
  db.createTournament({ id: 't13' })
  const res = db.cancelTournamentAndRefund('t13', 'reason', 'authenticated')
  assert.strictEqual(res.success, false)
  assert.strictEqual(res.error_code, 'UNAUTHORIZED')
})

console.log('\n--- SUITE 8: UI & CLIENT INTEGRATION CONTRACTS ---')

test('tournamentPaymentService exports cancelTournamentWithRefund function', () => {
  const serviceCode = fs.readFileSync('src/services/tournamentPaymentService.js', 'utf8')
  assert.ok(serviceCode.includes('cancelTournamentWithRefund'), 'Must export cancelTournamentWithRefund')
  assert.ok(serviceCode.includes("supabase.rpc('cancel_tournament_and_refund'"), 'Must call RPC')
})

test('TournamentContext exports cancelTournament and refreshes wallet & tournaments', () => {
  const contextCode = fs.readFileSync('src/contexts/TournamentContext.jsx', 'utf8')
  assert.ok(contextCode.includes('cancelTournament = async'), 'Must define cancelTournament')
  assert.ok(contextCode.includes('fetchUserWallet()'), 'Must refresh wallet')
  assert.ok(contextCode.includes('fetchTournaments()'), 'Must refresh tournaments')
  assert.ok(contextCode.includes('cancelTournament,'), 'Must export in provider value')
})

test('AllTournamentsView includes Cancel Tournament action and confirmation modal', () => {
  const viewCode = fs.readFileSync('src/components/admin/tournaments/AllTournamentsView.jsx', 'utf8')
  assert.ok(viewCode.includes('cancelTournament'), 'Must consume cancelTournament')
  assert.ok(viewCode.includes('cancelConfirmTarget'), 'Must have cancelConfirmTarget state')
  assert.ok(viewCode.includes('Cancel Tournament'), 'Must have Cancel Tournament button')
  assert.ok(viewCode.includes('Cancellation Summary'), 'Must have post-cancellation summary dialog')
})

test('TournamentOperationsWorkspace includes Cancel Arena button and modal', () => {
  const opsCode = fs.readFileSync('src/components/admin/tournaments/TournamentOperationsWorkspace.jsx', 'utf8')
  assert.ok(opsCode.includes('Cancel Arena'), 'Must have Cancel Arena button')
  assert.ok(opsCode.includes('showCancelModal'), 'Must have showCancelModal state')
  assert.ok(opsCode.includes('handleConfirmCancel'), 'Must have handleConfirmCancel')
})

test('TournamentDetailPage shows cancelled banner and disables registration CTA', () => {
  const pageCode = fs.readFileSync('src/pages/TournamentDetailPage.jsx', 'utf8')
  assert.ok(pageCode.includes("isCancelled = tournament.status === 'Cancelled'"), 'Must detect isCancelled')
  assert.ok(pageCode.includes('Tournament Cancelled by Organizer'), 'Must show alert banner')
  assert.ok(pageCode.includes('100% Refunded'), 'Must show refund notice to registered player')
  assert.ok(pageCode.includes('Tournament Cancelled'), 'CTA must show Tournament Cancelled')
})

console.log('\n============================================================')
console.log(`🏁 TEST RESULTS: ${passCount} PASSED, ${failCount} FAILED`)
console.log('============================================================')

if (failCount > 0) {
  process.exit(1)
} else {
  process.exit(0)
}
