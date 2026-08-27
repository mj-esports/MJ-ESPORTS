import assert from 'node:assert/strict'
import {
  isPerKillTournament,
  isPlacementPlusKillTournament,
  isWinnerTakesAllTournament,
  extractPerKillAmount,
  extractWinnerPrizeAmount,
  extractPlacementPrizes,
  calculatePerKillPayout,
  calculateTournamentTeamPayout,
  formatPayoutAmount,
  calculateFormattedPrize,
  formatTournamentPrize,
} from './src/utils/tournamentPrizeUtils.js'

console.log('============================================================')
console.log('🧪 RUNNING COMPREHENSIVE TOURNAMENT PRIZE PAYOUT TEST SUITE')
console.log('============================================================\n')

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`  ✅ [PASS] ${name}`)
    passed++
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}: ${err.message}`)
    failed++
  }
}

// ------------------------------------------------------------
// 1. PRIZE TYPE #3: PER KILL ONLY
// ------------------------------------------------------------
console.log('--- 1. Per Kill Only Formula (payout = kills × per_kill_prize) ---')

test('Case 1.1: Per-kill = ₹20, Kills = 1 -> Expected payout = ₹20', () => {
  const payout = calculatePerKillPayout(1, 20)
  assert.equal(payout, 20)
  assert.equal(formatPayoutAmount(payout), '₹20')
})

test('Case 1.2: Per-kill = ₹20, Kills = 5 -> Expected payout = ₹100', () => {
  const payout = calculatePerKillPayout(5, 20)
  assert.equal(payout, 100)
  assert.equal(formatPayoutAmount(payout), '₹100')
})

test('Case 1.3: Per-kill = ₹20, Kills = 10 -> Expected payout = ₹200', () => {
  const payout = calculatePerKillPayout(10, 20)
  assert.equal(payout, 200)
  assert.equal(formatPayoutAmount(payout), '₹200')
})

test('Case 1.4: Per-kill = ₹20, Kills = 0 -> Expected payout = ₹0 (Zero kills produces ₹0)', () => {
  const payout = calculatePerKillPayout(0, 20)
  assert.equal(payout, 0)
  assert.equal(formatPayoutAmount(payout), '₹0')
})

test('Case 1.5: Per-kill = ₹30, Kills = 4 -> Expected payout = ₹120', () => {
  const payout = calculatePerKillPayout(4, 30)
  assert.equal(payout, 120)
  assert.equal(formatPayoutAmount(payout), '₹120')
})

test('Case 1.6: Safe Numeric Handling: Negative or invalid kills clamp safely to 0', () => {
  assert.equal(calculatePerKillPayout(-3, 20), 0)
  assert.equal(calculatePerKillPayout(null, 20), 0)
  assert.equal(calculatePerKillPayout(undefined, 20), 0)
  assert.equal(calculatePerKillPayout('invalid', 20), 0)
  assert.equal(formatPayoutAmount(0), '₹0')
})

// ------------------------------------------------------------
// 2. PRIZE TYPE #2: PLACEMENT + PER KILL
// ------------------------------------------------------------
console.log('\n--- 2. Placement + Per Kill Formula (payout = placement_prize + [kills × per_kill]) ---')

test('Case 2.1: Placement = ₹100, Per-kill = ₹20, Kills = 5 -> Expected = ₹200 (₹100 + 5×₹20)', () => {
  const tournament = {
    prizeType: 'placement_kill',
    prizes: { firstPrize: 100, secondPrize: 50, thirdPrize: 25 },
    perKillReward: 20,
  }
  const result = calculateTournamentTeamPayout({ kills: 5 }, 1, tournament)
  assert.equal(result.amount, 200)
  assert.equal(result.formatted, '₹200')
  assert.equal(result.placementAmount, 100)
  assert.equal(result.killPayout, 100)
})

test('Case 2.2: Placement = ₹50 (2nd place), Per-kill = ₹20, Kills = 3 -> Expected = ₹110 (₹50 + 3×₹20)', () => {
  const tournament = {
    prizeType: 'placement_kill',
    prizes: { firstPrize: 100, secondPrize: 50, thirdPrize: 25 },
    perKillReward: 20,
  }
  const result = calculateTournamentTeamPayout({ kills: 3 }, 2, tournament)
  assert.equal(result.amount, 110)
  assert.equal(result.formatted, '₹110')
  assert.equal(result.placementAmount, 50)
  assert.equal(result.killPayout, 60)
})

test('Case 2.3: Placement = ₹100 (1st place), Per-kill = ₹20, Kills = 0 -> Expected = ₹100 (₹100 + 0×₹20)', () => {
  const tournament = {
    prizeType: 'placement_kill',
    prizes: { firstPrize: 100, secondPrize: 50, thirdPrize: 25 },
    perKillReward: 20,
  }
  const result = calculateTournamentTeamPayout({ kills: 0 }, 1, tournament)
  assert.equal(result.amount, 100)
  assert.equal(result.formatted, '₹100')
  assert.equal(result.placementAmount, 100)
  assert.equal(result.killPayout, 0)
})

test('Case 2.4: Placement + Per Kill from hybrid prize_pool string "₹150 + Per Kill ₹20"', () => {
  const tournament = {
    prize_pool: '₹150 + Per Kill ₹20',
  }
  assert.equal(isPlacementPlusKillTournament(tournament), true)
  assert.equal(extractPerKillAmount(tournament), 20)
  // Rank 1: Math.round(150 * 0.6) = 90. Kills = 4 => 4 * 20 = 80 => Total = 170
  const result = calculateTournamentTeamPayout({ kills: 4 }, 1, tournament)
  assert.equal(result.amount, 170)
  assert.equal(result.formatted, '₹170')
})

// ------------------------------------------------------------
// 3. PRIZE TYPE #4: WINNER TAKES ALL
// ------------------------------------------------------------
console.log('\n--- 3. Winner Takes All Formula (Rank #1 receives configured prize, others receive ₹0) ---')

test('Case 3.1: Winner prize = ₹500, Rank #1 -> Expected = ₹500', () => {
  const tournament = {
    prizeType: 'winner_takes_all',
    prizes: { winnerPrize: 500 },
  }
  const result = calculateTournamentTeamPayout({ kills: 10 }, 1, tournament)
  assert.equal(result.amount, 500)
  assert.equal(result.formatted, '₹500')
})

test('Case 3.2: Winner prize = ₹500, Rank #2 -> Expected = ₹0', () => {
  const tournament = {
    prizeType: 'winner_takes_all',
    prizes: { winnerPrize: 500 },
  }
  const result = calculateTournamentTeamPayout({ kills: 8 }, 2, tournament)
  assert.equal(result.amount, 0)
  assert.equal(result.formatted, '₹0')
})

test('Case 3.3: Winner prize = ₹500, Rank #3 -> Expected = ₹0', () => {
  const tournament = {
    prizeType: 'winner_takes_all',
    prizes: { winnerPrize: 500 },
  }
  const result = calculateTournamentTeamPayout({ kills: 5 }, 3, tournament)
  assert.equal(result.amount, 0)
  assert.equal(result.formatted, '₹0')
})

test('Case 3.4: Winner prize from prize_pool string "₹1,500" with prize_type "winner_takes_all"', () => {
  const tournament = {
    prize_type: 'winner_takes_all',
    prize_pool: '₹1,500',
  }
  assert.equal(isWinnerTakesAllTournament(tournament), true)
  assert.equal(extractWinnerPrizeAmount(tournament), 1500)
  const rank1 = calculateTournamentTeamPayout({ kills: 6 }, 1, tournament)
  const rank2 = calculateTournamentTeamPayout({ kills: 4 }, 2, tournament)
  assert.equal(rank1.formatted, '₹1,500')
  assert.equal(rank2.formatted, '₹0')
})

// ------------------------------------------------------------
// 4. PRIZE TYPE #1: PLACEMENT ONLY (PRESERVED)
// ------------------------------------------------------------
console.log('\n--- 4. Placement Only Formula (Standard 60% / 25% / 15% or configured prizes) ---')

test('Case 4.1: Placement Only with explicit prizes (1st: ₹1000, 2nd: ₹500, 3rd: ₹250)', () => {
  const tournament = {
    prizeType: 'placement',
    prizes: { firstPrize: 1000, secondPrize: 500, thirdPrize: 250 },
  }
  const r1 = calculateTournamentTeamPayout({ kills: 2 }, 1, tournament)
  const r2 = calculateTournamentTeamPayout({ kills: 5 }, 2, tournament)
  const r3 = calculateTournamentTeamPayout({ kills: 1 }, 3, tournament)
  const r4 = calculateTournamentTeamPayout({ kills: 0 }, 4, tournament)

  assert.equal(r1.formatted, '₹1,000')
  assert.equal(r2.formatted, '₹500')
  assert.equal(r3.formatted, '₹250')
  assert.equal(r4.formatted, '-')
})

// ------------------------------------------------------------
// 5. TOURNAMENT PRIZE DETECTION & EXTRACTION
// ------------------------------------------------------------
console.log('\n--- 5. Tournament Prize Type Detection & Extraction Invariants ---')

test('Detects per_kill via prizeType property', () => {
  const t = { prizeType: 'per_kill', perKillReward: 20 }
  assert.equal(isPerKillTournament(t), true)
  assert.equal(isPlacementPlusKillTournament(t), false)
  assert.equal(isWinnerTakesAllTournament(t), false)
  assert.equal(extractPerKillAmount(t), 20)
})

test('Detects placement_kill via prizeType property', () => {
  const t = { prizeType: 'placement_kill', perKillReward: 30 }
  assert.equal(isPlacementPlusKillTournament(t), true)
  assert.equal(isPerKillTournament(t), false)
  assert.equal(isWinnerTakesAllTournament(t), false)
})

test('Detects winner_takes_all via prizeType property', () => {
  const t = { prizeType: 'winner_takes_all', prizes: { winnerPrize: 2000 } }
  assert.equal(isWinnerTakesAllTournament(t), true)
  assert.equal(isPerKillTournament(t), false)
  assert.equal(isPlacementPlusKillTournament(t), false)
})

test('Detects and extracts per-kill amount from prize_pool string "Per Kill ₹20"', () => {
  const t = { prize_pool: 'Per Kill ₹20' }
  assert.equal(isPerKillTournament(t), true)
  assert.equal(extractPerKillAmount(t), 20)
})

console.log('\n============================================================')
console.log(`🏁 TEST RESULTS: ${passed}/${passed + failed} Passed (${failed} Failed)`)
console.log('============================================================\n')

if (failed > 0) {
  process.exit(1)
}
