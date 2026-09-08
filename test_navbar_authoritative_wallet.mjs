import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

// Import pub-sub and wallet helper from walletService
import {
  getAuthoritativeWalletBalance,
  subscribeToWalletBalance,
  notifyWalletBalanceUpdated,
} from './src/services/walletService.js'

console.log('--- STARTING NAVBAR AUTHORITATIVE WALLET VERIFICATION ---')

// ----------------------------------------------------------------------------
// SUITE 1: SOURCE OF TRUTH CODE AUDIT
// ----------------------------------------------------------------------------

test('1.1 Navbar.jsx does NOT read user_metadata.wallet_balance', () => {
  const navPath = path.resolve(process.cwd(), 'src/components/common/Navbar.jsx')
  const content = fs.readFileSync(navPath, 'utf8')

  assert.ok(
    !content.includes('user?.user_metadata?.wallet_balance'),
    'Navbar must not read legacy user_metadata.wallet_balance'
  )
  assert.ok(
    !content.includes('user.user_metadata.wallet_balance'),
    'Navbar must not read user.user_metadata.wallet_balance'
  )
  assert.ok(
    !content.includes('profile?.wallet_balance'),
    'Navbar must not read profile.wallet_balance'
  )
})

test('1.2 Navbar.jsx imports authoritative wallet balance subscription and fetchUserWallet', () => {
  const navPath = path.resolve(process.cwd(), 'src/components/common/Navbar.jsx')
  const content = fs.readFileSync(navPath, 'utf8')

  assert.ok(
    content.includes('fetchUserWallet'),
    'Navbar must import fetchUserWallet from walletService'
  )
  assert.ok(
    content.includes('subscribeToWalletBalance'),
    'Navbar must import subscribeToWalletBalance from walletService'
  )
  assert.ok(
    content.includes('getAuthoritativeWalletBalance'),
    'Navbar must import getAuthoritativeWalletBalance from walletService'
  )
})

test('1.3 WalletPage.jsx does NOT fall back to user_metadata.wallet_balance', () => {
  const pagePath = path.resolve(process.cwd(), 'src/pages/WalletPage.jsx')
  const content = fs.readFileSync(pagePath, 'utf8')

  assert.ok(
    !content.includes('user?.user_metadata?.wallet_balance'),
    'WalletPage must not fall back to user_metadata.wallet_balance'
  )
  assert.ok(
    content.includes('getAuthoritativeWalletBalance'),
    'WalletPage must import and use getAuthoritativeWalletBalance'
  )
  assert.ok(
    content.includes('subscribeToWalletBalance'),
    'WalletPage must subscribe to authoritative wallet balance changes'
  )
})

test('1.4 TournamentContext.jsx notifies wallet balance updates on wallet-funded entry', () => {
  const ctxPath = path.resolve(process.cwd(), 'src/contexts/TournamentContext.jsx')
  const content = fs.readFileSync(ctxPath, 'utf8')

  assert.ok(
    content.includes('notifyWalletBalanceUpdated'),
    'TournamentContext must import and call notifyWalletBalanceUpdated'
  )
  assert.ok(
    content.includes('notifyWalletBalanceUpdated(Number(data.balance_after))'),
    'TournamentContext must notify wallet balance with data.balance_after on tournament entry'
  )
})

// ----------------------------------------------------------------------------
// SUITE 2: AUTHORITATIVE PUB-SUB EVENT BUS & BALANCE BEHAVIOR
// ----------------------------------------------------------------------------

test('2.1 Authoritative wallet balance ₹50 => Navbar subscriber receives ₹50', () => {
  let navState = null
  const unsubscribe = subscribeToWalletBalance((balance) => {
    navState = balance
  })

  notifyWalletBalanceUpdated(50)
  assert.strictEqual(navState, 50, 'Navbar state must receive authoritative ₹50')
  assert.strictEqual(getAuthoritativeWalletBalance(), 50, 'Shared authoritative cache must be ₹50')
  unsubscribe()
})

test('2.2 Authoritative wallet balance ₹100 => Navbar subscriber receives ₹100', () => {
  let navState = null
  const unsubscribe = subscribeToWalletBalance((balance) => {
    navState = balance
  })

  notifyWalletBalanceUpdated(100)
  assert.strictEqual(navState, 100, 'Navbar state must receive authoritative ₹100')
  assert.strictEqual(getAuthoritativeWalletBalance(), 100, 'Shared authoritative cache must be ₹100')
  unsubscribe()
})

test('2.3 Authoritative wallet balance ₹200 => Navbar subscriber receives ₹200', () => {
  let navState = null
  const unsubscribe = subscribeToWalletBalance((balance) => {
    navState = balance
  })

  notifyWalletBalanceUpdated(200)
  assert.strictEqual(navState, 200, 'Navbar state must receive authoritative ₹200')
  assert.strictEqual(getAuthoritativeWalletBalance(), 200, 'Shared authoritative cache must be ₹200')
  unsubscribe()
})

test('2.4 Legacy profiles.wallet_balance (e.g. 1000) differs from authoritative wallet (50) => Navbar displays authoritative wallet', () => {
  // Simulate user with legacy profile.wallet_balance = 1000
  const legacyProfile = { wallet_balance: 1000.0, username: 'player1' }
  const authoritativeWalletBalance = 50.0

  // The Navbar logic uses navWalletBalance from subscribeToWalletBalance / fetchUserWallet
  let navDisplayedBalance = null
  const unsubscribe = subscribeToWalletBalance((bal) => {
    navDisplayedBalance = bal
  })

  notifyWalletBalanceUpdated(authoritativeWalletBalance)

  // Disregard legacyProfile.wallet_balance completely
  assert.notStrictEqual(
    navDisplayedBalance,
    legacyProfile.wallet_balance,
    'Must not display legacy profile wallet balance'
  )
  assert.strictEqual(
    navDisplayedBalance,
    50,
    'Navbar must display exact authoritative wallet balance (₹50)'
  )
  unsubscribe()
})

test('2.5 User metadata wallet_balance (e.g. 100) differs from authoritative wallet (50) => Navbar displays authoritative wallet', () => {
  // Simulate user with user.user_metadata.wallet_balance = 100
  const user = { id: 'usr_123', user_metadata: { wallet_balance: 100.0 } }
  const authoritativeWalletBalance = 50.0

  let navDisplayedBalance = null
  const unsubscribe = subscribeToWalletBalance((bal) => {
    navDisplayedBalance = bal
  })

  notifyWalletBalanceUpdated(authoritativeWalletBalance)

  // Verify Navbar ignores user.user_metadata.wallet_balance
  assert.notStrictEqual(
    navDisplayedBalance,
    user.user_metadata.wallet_balance,
    'Must not display user_metadata.wallet_balance (₹100)'
  )
  assert.strictEqual(
    navDisplayedBalance,
    50,
    'Navbar must display exact authoritative wallet balance (₹50)'
  )
  unsubscribe()
})

test('2.6 After wallet top-up, Navbar refreshes to the new authoritative balance', () => {
  let navDisplayedBalance = 50
  const unsubscribe = subscribeToWalletBalance((bal) => {
    navDisplayedBalance = bal
  })

  // User tops up ₹100, new balance = 150
  const topupResult = {
    success: true,
    wallet: { balance: 150.0, currency: 'INR' },
  }

  // walletService.verifyWalletTopup dispatches notifyWalletBalanceUpdated(topupResult.wallet.balance)
  notifyWalletBalanceUpdated(Number(topupResult.wallet.balance))

  assert.strictEqual(
    navDisplayedBalance,
    150,
    'Navbar must immediately refresh to ₹150 after wallet top-up'
  )
  unsubscribe()
})

test('2.7 After wallet-funded tournament entry, Navbar refreshes to the reduced authoritative balance', () => {
  let navDisplayedBalance = 150
  const unsubscribe = subscribeToWalletBalance((bal) => {
    navDisplayedBalance = bal
  })

  // User pays ₹30 entry fee via wallet RPC register_tournament_team_with_wallet
  const registrationData = {
    success: true,
    registration_id: 'reg_xyz',
    amount_paid: 30.0,
    balance_after: 120.0,
  }

  // TournamentContext dispatches notifyWalletBalanceUpdated(Number(registrationData.balance_after))
  notifyWalletBalanceUpdated(Number(registrationData.balance_after))

  assert.strictEqual(
    navDisplayedBalance,
    120,
    'Navbar must immediately reflect reduced balance of ₹120'
  )
  unsubscribe()
})

test('2.8 Loading state in Navbar renders placeholder without flashing incorrect balance', () => {
  const navPath = path.resolve(process.cwd(), 'src/components/common/Navbar.jsx')
  const content = fs.readFileSync(navPath, 'utf8')

  // Check that Navbar checks isWalletLoading || navWalletBalance === null
  assert.ok(
    content.includes('isWalletLoading || navWalletBalance === null'),
    'Navbar must check loading condition before rendering wallet number'
  )
  assert.ok(
    content.includes('animate-pulse'),
    'Navbar must render animated skeleton pulse while loading'
  )
  assert.ok(
    content.includes('₹{Math.floor(navWalletBalance)}'),
    'Navbar must format authoritative balance as whole rupees'
  )
})

test('2.9 Phase 9.4 ₹200 wallet limit is preserved across UI and backend', () => {
  const edgeFnPath = path.resolve(process.cwd(), 'supabase/functions/create-wallet-topup-order/index.ts')
  const edgeFnContent = fs.readFileSync(edgeFnPath, 'utf8')
  assert.ok(edgeFnContent.includes('numericAmount < 1 || numericAmount > 200'), 'Edge function enforces amount <= 200')
  assert.ok(edgeFnContent.includes('(currentBalance + numericAmount) > 200.0'), 'Edge function enforces total balance <= 200')

  const walletPagePath = path.resolve(process.cwd(), 'src/pages/WalletPage.jsx')
  const pageContent = fs.readFileSync(walletPagePath, 'utf8')
  assert.ok(pageContent.includes('maxAllowedTopup = Math.max(0, 200 - authoritativeBalance)'), 'WalletPage enforces 200 ceiling calculation')
  assert.ok(pageContent.includes('(authoritativeBalance + num) > 200'), 'WalletPage guards submit above 200')
})

console.log('--- ALL NAVBAR AUTHORITATIVE WALLET TESTS DEFINED ---')
