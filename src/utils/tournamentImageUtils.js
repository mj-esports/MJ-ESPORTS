/**
 * Built-in Esports Tournament Background Assets
 * Provides official hardcoded backgrounds for Free Fire / Free Fire MAX tournaments.
 */

export const FREE_FIRE_BANNER =
  'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80'

export const ORIGINAL_ESPORTS_ARENA_IMAGE = FREE_FIRE_BANNER

// Responsive srcSet for mobile, tablet, and desktop viewports
export const HERO_IMAGE_SRCSET = [
  'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=480&q=75 480w',
  'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=768&q=75 768w',
  'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80 1200w',
  'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1600&q=80 1600w',
].join(', ')

export const HERO_IMAGE_SIZES = '100vw'

/**
 * Returns the built-in default background image for a given tournament.
 * @param {Object} [tournament]
 * @returns {string} Image URL
 */
export function getTournamentImage(tournament) {
  return FREE_FIRE_BANNER
}
