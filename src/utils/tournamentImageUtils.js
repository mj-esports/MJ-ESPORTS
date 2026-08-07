/**
 * Built-in Esports Tournament Background Assets
 * Provides official hardcoded backgrounds for Free Fire / Free Fire MAX and BGMI tournaments.
 */

export const FREE_FIRE_BANNER =
  'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80'

export const BGMI_BANNER =
  'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80'

export const ORIGINAL_ESPORTS_ARENA_IMAGE = FREE_FIRE_BANNER

/**
 * Returns the built-in default background image for a given tournament based on its game title.
 * @param {Object} tournament
 * @returns {string} Image URL
 */
export function getTournamentImage(tournament) {
  const gameStr = String(tournament?.game || '').toLowerCase()
  if (gameStr.includes('bgmi') || gameStr.includes('battlegrounds')) {
    return BGMI_BANNER
  }
  return FREE_FIRE_BANNER
}
