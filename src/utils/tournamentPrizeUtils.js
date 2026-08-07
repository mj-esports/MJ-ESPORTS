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

/**
 * Returns formatted prize for any tournament object `t`.
 */
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
