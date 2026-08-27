/**
 * Official Tournament Prize Calculator & Formatter
 * 
 * Rules:
 * - Placement Only: Display total placement prize pool (sum of all placement prizes).
 * - Placement + Per Kill: Display total placement prize pool plus "Per Kill ₹X".
 * - Per Kill Only: Display only "Per Kill ₹X".
 * - Winner Takes All: Display only the winner prize amount.
 */
export function calculateFormattedPrize(config) {
  if (!config) return '₹0'

  const prizeType = String(config.prizeType || config.prize_type || 'placement').toLowerCase()
  const perKill = Number(config.perKillReward ?? config.per_kill_reward ?? config.perKill ?? 30) || 0
  const prizes = config.prizes || config.prize_details || {}

  const first = Number(prizes.firstPrize ?? prizes.first_prize ?? 0) || 0
  const second = Number(prizes.secondPrize ?? prizes.second_prize ?? 0) || 0
  const third = Number(prizes.thirdPrize ?? prizes.third_prize ?? 0) || 0
  const fourth = Number(prizes.fourthPrize ?? prizes.fourth_prize ?? 0) || 0
  const fifth = Number(prizes.fifthPrize ?? prizes.fifth_prize ?? 0) || 0
  const mvp = Number(prizes.mvpBonus ?? prizes.mvp_bonus ?? 0) || 0
  const winner = Number(prizes.winnerPrize ?? prizes.winner_prize ?? 0) || 0

  const placementTotal = first + second + third + fourth + fifth + mvp

  if (prizeType === 'winner_takes_all') {
    const winnerAmount = winner || 1500
    return `₹${winnerAmount.toLocaleString('en-IN')}`
  }

  if (prizeType === 'per_kill') {
    return `Per Kill ₹${perKill.toLocaleString('en-IN')}`
  }

  if (prizeType === 'placement_kill' || prizeType === 'placement_plus_kill') {
    const formattedPlacement = `₹${placementTotal.toLocaleString('en-IN')}`
    if (perKill > 0) {
      return `${formattedPlacement} + Per Kill ₹${perKill.toLocaleString('en-IN')}`
    }
    return formattedPlacement
  }

  // Placement Only
  if (placementTotal > 0) {
    return `₹${placementTotal.toLocaleString('en-IN')}`
  }

  // Fallback if stored directly in prizePool/prize_pool
  const rawPool = config.prizePool || config.prize_pool
  if (rawPool && typeof rawPool === 'string' && rawPool.trim() && !rawPool.includes('1,00,000') && rawPool !== '100000') {
    return rawPool.trim()
  }

  return '₹0'
}

export function formatTournamentPrize(t) {
  if (!t) return '₹0'

  if (t.prizeType || t.prize_type || t.prizes) {
    return calculateFormattedPrize(t)
  }

  const rawPool = t.prizePool || t.prize_pool
  if (rawPool && typeof rawPool === 'string' && rawPool.trim() && !rawPool.includes('1,00,000') && rawPool !== '100000') {
    return rawPool.trim()
  }

  return '₹0'
}

/**
 * Detects whether a tournament is configured as a Per-Kill Only prize tournament.
 */
export function isPerKillTournament(tournament) {
  if (!tournament) return false

  const prizeType = String(tournament.prizeType || tournament.prize_type || '').toLowerCase().trim()
  if (prizeType === 'per_kill') return true

  const rawPool = String(tournament.prizePool || tournament.prize_pool || '').toLowerCase().trim()
  if (rawPool.includes('per kill') || rawPool.includes('/ kill') || rawPool.includes('/kill')) {
    // If it is a hybrid placement + per kill, prizeType or string will contain '+' or placement
    if (rawPool.includes('+') || prizeType === 'placement_kill' || prizeType === 'placement_plus_kill') {
      return false
    }
    return true
  }

  return false
}

/**
 * Detects whether a tournament is configured as Placement + Per Kill.
 */
export function isPlacementPlusKillTournament(tournament) {
  if (!tournament) return false

  const prizeType = String(tournament.prizeType || tournament.prize_type || '').toLowerCase().trim()
  if (prizeType === 'placement_kill' || prizeType === 'placement_plus_kill') return true

  const rawPool = String(tournament.prizePool || tournament.prize_pool || '').toLowerCase().trim()
  if (rawPool.includes('+') && (rawPool.includes('per kill') || rawPool.includes('/ kill') || rawPool.includes('/kill'))) {
    return true
  }

  return false
}

/**
 * Detects whether a tournament is configured as Winner Takes All.
 */
export function isWinnerTakesAllTournament(tournament) {
  if (!tournament) return false

  const prizeType = String(tournament.prizeType || tournament.prize_type || '').toLowerCase().trim()
  if (prizeType === 'winner_takes_all') return true

  return false
}

/**
 * Extracts the Winner Takes All prize amount (numeric integer).
 */
export function extractWinnerPrizeAmount(tournament) {
  if (!tournament) return 0

  const prizes = tournament.prizes || tournament.prize_details || {}
  const explicit = Number(prizes.winnerPrize ?? prizes.winner_prize ?? tournament.winnerPrize ?? tournament.winner_prize ?? 0)
  if (!isNaN(explicit) && explicit > 0) {
    return explicit
  }

  const rawPool = String(tournament.prizePool || tournament.prize_pool || '')
  if (rawPool) {
    const cleaned = rawPool.replace(/[^0-9]/g, '')
    const parsed = parseInt(cleaned, 10)
    if (!isNaN(parsed) && parsed > 0) {
      return parsed
    }
  }

  return 0
}

/**
 * Extracts placement prize amounts ({ first, second, third, fourth, fifth, mvp }).
 */
export function extractPlacementPrizes(tournament) {
  if (!tournament) return { first: 0, second: 0, third: 0, fourth: 0, fifth: 0, mvp: 0 }

  const prizes = tournament.prizes || tournament.prize_details || {}
  const first = Number(prizes.firstPrize ?? prizes.first_prize ?? tournament.firstPrize ?? tournament.first_prize ?? 0) || 0
  const second = Number(prizes.secondPrize ?? prizes.second_prize ?? tournament.secondPrize ?? tournament.second_prize ?? 0) || 0
  const third = Number(prizes.thirdPrize ?? prizes.third_prize ?? tournament.thirdPrize ?? tournament.third_prize ?? 0) || 0
  const fourth = Number(prizes.fourthPrize ?? prizes.fourth_prize ?? tournament.fourthPrize ?? tournament.fourth_prize ?? 0) || 0
  const fifth = Number(prizes.fifthPrize ?? prizes.fifth_prize ?? tournament.fifthPrize ?? tournament.fifth_prize ?? 0) || 0
  const mvp = Number(prizes.mvpBonus ?? prizes.mvp_bonus ?? tournament.mvpBonus ?? tournament.mvp_bonus ?? 0) || 0

  // If explicit breakdown exists, return it
  if (first > 0 || second > 0 || third > 0) {
    return { first, second, third, fourth, fifth, mvp }
  }

  // Parse placement pool portion from raw prize pool string (e.g., "₹1,750 + Per Kill ₹20" or "₹25,000")
  const rawPool = String(tournament.prizePool || tournament.prize_pool || '')
  if (rawPool) {
    // If hybrid, get placement part before '+'
    const placementPart = rawPool.includes('+') ? rawPool.split('+')[0] : rawPool
    const digits = placementPart.replace(/[^0-9]/g, '')
    const totalPlacement = parseInt(digits, 10) || 0

    if (totalPlacement > 0) {
      const calcFirst = Math.round(totalPlacement * 0.6)
      const calcSecond = Math.round(totalPlacement * 0.25)
      const calcThird = Math.max(0, totalPlacement - calcFirst - calcSecond)
      return { first: calcFirst, second: calcSecond, third: calcThird, fourth: 0, fifth: 0, mvp: 0 }
    }
  }

  return { first: 0, second: 0, third: 0, fourth: 0, fifth: 0, mvp: 0 }
}

/**
 * Extracts the per-kill prize amount (numeric integer) from a tournament object or string.
 */
export function extractPerKillAmount(tournament) {
  if (!tournament) return 0

  // 1. Explicit per-kill reward property
  const explicitReward = Number(
    tournament.perKillReward ?? tournament.per_kill_reward ?? tournament.perKill ?? 0
  )
  if (!isNaN(explicitReward) && explicitReward > 0) {
    return explicitReward
  }

  // 2. Parse from prize_pool or prizePool text (e.g., "Per Kill ₹20", "₹20 / Kill", "Per Kill 20", "20/kill")
  const rawPool = String(tournament.prizePool || tournament.prize_pool || '')
  if (rawPool) {
    const match =
      rawPool.match(/(?:per\s*kill|\/\s*kill)\D*(\d[\d,]*)/i) ||
      rawPool.match(/(?:₹|rs\.?)\s*(\d[\d,]*)\s*(?:\/|\s*per)\s*kill/i) ||
      rawPool.match(/(\d[\d,]*)\s*(?:\/|\s*per)\s*kill/i)

    if (match && match[1]) {
      const parsed = parseInt(match[1].replace(/,/g, ''), 10)
      if (!isNaN(parsed) && parsed > 0) {
        return parsed
      }
    }
  }

  return 0
}

/**
 * Authoritative Per-Kill Payout Formula:
 * payout = total_kills * per_kill_prize
 * 
 * Invariants:
 * - 0 kills = 0 (₹0)
 * - Safe numeric handling without floating point inaccuracies
 */
export function calculatePerKillPayout(kills, perKillPrize) {
  const safeKills = Math.max(0, parseInt(kills, 10) || 0)
  const safePrize = Math.max(0, parseInt(perKillPrize, 10) || 0)
  return safeKills * safePrize
}

/**
 * Authoritative Unified Tournament Payout Calculation:
 * 
 * Prize Types Supported:
 * 1. Placement Only:
 *    Rank 1: 1st prize (or 60%)
 *    Rank 2: 2nd prize (or 25%)
 *    Rank 3: 3rd prize (or 15%)
 *    Rank 4+: 4th/5th if configured, else '-'
 * 
 * 2. Placement + Per Kill:
 *    TOTAL PAYOUT = Placement Prize + (Total Kills * Per-Kill Prize)
 * 
 * 3. Per Kill Only:
 *    TOTAL PAYOUT = Total Kills * Per-Kill Prize (0 kills = ₹0)
 * 
 * 4. Winner Takes All:
 *    Rank #1: Winner Prize
 *    Rank #2+: ₹0
 */
export function calculateTournamentTeamPayout(team, rank, tournament, prizePoolSummary = null) {
  const kills = Math.max(0, parseInt(team?.kills ?? team?.finishes ?? 0, 10) || 0)

  // 1. PER KILL ONLY (#3)
  if (isPerKillTournament(tournament)) {
    const perKillPrize = extractPerKillAmount(tournament)
    const amount = calculatePerKillPayout(kills, perKillPrize)
    return {
      amount,
      formatted: formatPayoutAmount(amount),
      prizeType: 'per_kill',
    }
  }

  // 2. WINNER TAKES ALL (#4)
  if (isWinnerTakesAllTournament(tournament)) {
    const winnerPrize = extractWinnerPrizeAmount(tournament)
    const isWinner = rank === 1
    const amount = isWinner ? winnerPrize : 0
    return {
      amount,
      formatted: isWinner ? formatPayoutAmount(amount) : '₹0',
      prizeType: 'winner_takes_all',
    }
  }

  // 3. PLACEMENT + PER KILL (#2)
  if (isPlacementPlusKillTournament(tournament)) {
    const perKillPrize = extractPerKillAmount(tournament)
    const placementPrizes = extractPlacementPrizes(tournament)

    let placementAmount = 0
    if (rank === 1) placementAmount = placementPrizes.first || (prizePoolSummary?.firstPlacePrize ?? 0)
    else if (rank === 2) placementAmount = placementPrizes.second || (prizePoolSummary?.secondPlacePrize ?? 0)
    else if (rank === 3) placementAmount = placementPrizes.third || (prizePoolSummary?.thirdPlacePrize ?? 0)
    else if (rank === 4) placementAmount = placementPrizes.fourth || 0
    else if (rank === 5) placementAmount = placementPrizes.fifth || 0

    const killPayout = calculatePerKillPayout(kills, perKillPrize)
    const totalAmount = placementAmount + killPayout

    return {
      amount: totalAmount,
      placementAmount,
      killPayout,
      formatted: formatPayoutAmount(totalAmount),
      prizeType: 'placement_kill',
    }
  }

  // 4. PLACEMENT ONLY (#1)
  const placementPrizes = extractPlacementPrizes(tournament)
  let placementAmount = 0
  if (rank === 1) {
    placementAmount = placementPrizes.first || (prizePoolSummary?.firstPlacePrize ?? 0)
  } else if (rank === 2) {
    placementAmount = placementPrizes.second || (prizePoolSummary?.secondPlacePrize ?? 0)
  } else if (rank === 3) {
    placementAmount = placementPrizes.third || (prizePoolSummary?.thirdPlacePrize ?? 0)
  } else if (rank === 4 && placementPrizes.fourth > 0) {
    placementAmount = placementPrizes.fourth
  } else if (rank === 5 && placementPrizes.fifth > 0) {
    placementAmount = placementPrizes.fifth
  }

  return {
    amount: placementAmount,
    formatted: placementAmount > 0 ? formatPayoutAmount(placementAmount) : '-',
    prizeType: 'placement',
  }
}

/**
 * Formats a payout amount safely as an Indian Rupee string (e.g., "₹20", "₹100", "₹0").
 */
export function formatPayoutAmount(amount) {
  const num = Math.max(0, Number(amount) || 0)
  return `₹${num.toLocaleString('en-IN')}`
}
