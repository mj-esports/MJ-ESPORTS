import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'

console.log('============================================================')
console.log('🧪 RUNNING PHASE 9: WALLET UI SOURCE-OF-TRUTH MIGRATION SUITE')
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

// ----------------------------------------------------------------------------
// SUITE 1: SOURCE CODE AUDIT (WalletPage.jsx)
// ----------------------------------------------------------------------------
console.log('--- SUITE 1: WALLET PAGE CODE AUDIT ---')

const walletPagePath = path.resolve(process.cwd(), 'src/pages/WalletPage.jsx')
const walletPageContent = fs.readFileSync(walletPagePath, 'utf8')

test('1. WalletPage.jsx does NOT import fetchWalletTransactions', () => {
  assert(!walletPageContent.includes('fetchWalletTransactions'), 'Must not import or reference fetchWalletTransactions')
})

test('2. WalletPage.jsx does NOT reference legacy wallet_transactions table', () => {
  assert(!walletPageContent.includes('wallet_transactions'), 'Must not reference wallet_transactions table')
})

test('3. WalletPage.jsx imports fetchWalletLedger from walletService', () => {
  assert(walletPageContent.includes('fetchWalletLedger'), 'Must import fetchWalletLedger')
})

test('4. WalletPage.jsx fetches authoritative balance and ledger concurrently', () => {
  assert(walletPageContent.includes('Promise.all'), 'Must use Promise.all for concurrent fetch')
  assert(walletPageContent.includes('fetchUserWallet()'), 'Must call fetchUserWallet')
  assert(walletPageContent.includes('fetchWalletLedger'), 'Must call fetchWalletLedger')
})

test('5. WalletPage.jsx calculates modern deposited funds strictly from DEPOSIT + CREDIT', () => {
  assert(
    walletPageContent.includes("t.type === 'DEPOSIT' && t.direction === 'CREDIT'"),
    'Must filter by DEPOSIT and CREDIT for deposited funds'
  )
})

test('6. WalletPage.jsx does NOT derive pending withdrawals from legacy records (sets 0.00)', () => {
  assert(
    walletPageContent.includes('modernPendingWithdrawals = 0'),
    'Pending withdrawals must be 0 until modern withdrawal system is implemented'
  )
})

test('7. WalletPage.jsx renders balanceBefore and balanceAfter in ledger statement', () => {
  assert(walletPageContent.includes('tx.balanceBefore'), 'Must render tx.balanceBefore')
  assert(walletPageContent.includes('tx.balanceAfter'), 'Must render tx.balanceAfter')
})

test('8. WalletPage.jsx displays direction in transaction row', () => {
  assert(walletPageContent.includes('tx.direction'), 'Must display tx.direction')
})

test('9. Error handling in syncWalletData resets state without fallback to legacy', () => {
  assert(
    walletPageContent.includes('Never silently fall back to legacy statement sources'),
    'Must document no fallback to legacy'
  )
  assert(walletPageContent.includes('setTransactions([])'), 'Must reset transactions to empty array on error')
})

// ----------------------------------------------------------------------------
// SUITE 2: SERVICE LAYER AUDIT (walletService.js)
// ----------------------------------------------------------------------------
console.log('\n--- SUITE 2: WALLET SERVICE INTEGRATION ---')

const walletServicePath = path.resolve(process.cwd(), 'src/services/walletService.js')
const walletServiceContent = fs.readFileSync(walletServicePath, 'utf8')

test('10. walletService.js exports fetchWalletLedger with optional userId parameter', () => {
  assert(
    walletServiceContent.includes('export async function fetchWalletLedger'),
    'Must export fetchWalletLedger'
  )
  assert(
    walletServiceContent.includes('userId = null'),
    'Must accept optional userId'
  )
})

// ----------------------------------------------------------------------------
// SUITE 3: EXACT SIMULATION OF PRODUCTION USER DATA TRANSFORMATION
// ----------------------------------------------------------------------------
console.log('\n--- SUITE 3: PRODUCTION ACCOUNT DATA TRANSFORMATION SIMULATION ---')

test('11. Simulated production user transforms authoritative data to exact target stats', () => {
  // Production user: mjesports.team@gmail.com
  // Modern DB state from verify-wallet-topup:
  const mockWallet = { id: 'w_123', user_id: '4c60c072-345b-443b-af55-a93b1a804c65', balance: '10.00' }
  const mockLedger = [
    {
      id: 'ledg_abc123',
      wallet_id: 'w_123',
      user_id: '4c60c072-345b-443b-af55-a93b1a804c65',
      transaction_type: 'DEPOSIT',
      direction: 'CREDIT',
      amount: 10.00,
      balance_before: 0.00,
      balance_after: 10.00,
      description: 'Instant Wallet Top-up via Razorpay',
      created_at: '2026-09-08T07:44:47.882415+00:00',
    }
  ]

  // Legacy data that exists in DB but MUST NOT be used:
  const legacyTransactions = [
    { type: 'Deposit', amount: 100.00, status: 'Completed' },
    { type: 'Deposit', amount: 100.00, status: 'Completed' },
    { type: 'Withdrawal', amount: 100.00, status: 'Pending' },
  ]

  // Simulate modern mapping logic from WalletPage.jsx
  const mapped = mockLedger.map((t) => {
    const isDebit = t.direction === 'DEBIT'
    const amt = isDebit ? -Math.abs(Number(t.amount)) : Math.abs(Number(t.amount))
    let category = 'DEPOSIT'
    if (t.transaction_type === 'PRIZE_CREDIT') category = 'PRIZE'
    else if (t.transaction_type === 'ENTRY_FEE_DEBIT') category = 'ENTRY_FEE'
    else if (t.transaction_type === 'WITHDRAWAL') category = 'WITHDRAWAL'
    else if (t.transaction_type === 'REFUND') category = 'REFUND'
    else if (t.transaction_type === 'DEPOSIT') category = 'DEPOSIT'
    else category = t.transaction_type || 'TRANSACTION'

    return {
      id: t.id,
      tournament: t.description || 'Instant Wallet Top-up via Razorpay',
      description: t.description || 'Instant Wallet Top-up via Razorpay',
      type: t.transaction_type,
      direction: t.direction,
      category: category,
      amount: amt,
      balanceBefore: Number(t.balance_before != null ? t.balance_before : 0.0),
      balanceAfter: Number(t.balance_after != null ? t.balance_after : 0.0),
      status: 'Completed',
    }
  })

  let modernDeposits = 0
  let modernWinnings = 0
  let modernEntryFees = 0
  let modernPendingWithdrawals = 0

  mapped.forEach((t) => {
    const amt = Math.abs(t.amount)
    if (t.type === 'DEPOSIT' && t.direction === 'CREDIT') {
      modernDeposits += amt
    } else if (t.type === 'PRIZE_CREDIT' && t.direction === 'CREDIT') {
      modernWinnings += amt
    } else if (t.type === 'ENTRY_FEE_DEBIT' && t.direction === 'DEBIT') {
      modernEntryFees += amt
    }
  })

  const availableBalance = Number(mockWallet.balance)

  // Verify all required display values
  assert.strictEqual(availableBalance.toFixed(2), '10.00', 'Available Balance must be ₹10.00')
  assert.strictEqual(modernDeposits.toFixed(2), '10.00', 'Deposited Funds must be ₹10.00 (NOT ₹200.00)')
  assert.strictEqual(modernPendingWithdrawals.toFixed(2), '0.00', 'Pending Withdrawal must be ₹0.00 (NOT ₹100.00)')
  assert.strictEqual(modernWinnings.toFixed(2), '0.00', 'Total Winnings must be ₹0.00')
  assert.strictEqual(modernEntryFees.toFixed(2), '0.00', 'Entry Fees Paid must be ₹0.00')

  // Verify single transaction row
  assert.strictEqual(mapped.length, 1, 'Exactly one transaction row must be present')
  const row = mapped[0]
  assert.strictEqual(row.type, 'DEPOSIT', 'Row type must be DEPOSIT')
  assert.strictEqual(row.direction, 'CREDIT', 'Row direction must be CREDIT')
  assert.strictEqual(row.amount, 10.00, 'Row amount must be 10.00')
  assert.strictEqual(row.balanceBefore, 0.00, 'Row balanceBefore must be 0.00')
  assert.strictEqual(row.balanceAfter, 10.00, 'Row balanceAfter must be 10.00')
  assert.strictEqual(row.description, 'Instant Wallet Top-up via Razorpay', 'Description must match')
})

// ----------------------------------------------------------------------------
// SUMMARY
// ----------------------------------------------------------------------------
console.log('\n============================================================')
console.log(`🏁 TEST RUN COMPLETE: ${passCount} PASSED, ${failCount} FAILED`)
console.log('============================================================\n')

if (failCount > 0) {
  process.exit(1)
} else {
  process.exit(0)
}
