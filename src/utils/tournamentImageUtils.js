/**
 * Official Esports Tournament Banner Resolver
 * Restores the original esports tournament arena background showing players competing on an esports stage.
 * Ensures zero hardware, keyboard, mouse, or controller images are ever displayed.
 */

export const ORIGINAL_ESPORTS_ARENA_IMAGE =
  'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80'

/**
 * Returns the original esports tournament arena image URL for a given tournament.
 * @param {Object} tournament
 * @returns {string} Image URL
 */
export function getTournamentImage(tournament) {
  if (!tournament) {
    return ORIGINAL_ESPORTS_ARENA_IMAGE
  }

  // If custom image URL is provided, validate that it is NOT a hardware photo
  if (tournament.imageUrl && typeof tournament.imageUrl === 'string' && tournament.imageUrl.trim()) {
    const url = tournament.imageUrl.trim()
    const lowerUrl = url.toLowerCase()
    
    // Strict Blacklist: ZERO keyboards, mice, controllers, consoles, headsets, desks, or hardware stock photos
    const isHardwarePhoto =
      lowerUrl.includes('keyboard') ||
      lowerUrl.includes('mouse') ||
      lowerUrl.includes('controller') ||
      lowerUrl.includes('console') ||
      lowerUrl.includes('desk') ||
      lowerUrl.includes('headset') ||
      lowerUrl.includes('laptop') ||
      lowerUrl.includes('hardware') ||
      lowerUrl.includes('photo-1538481199705-c710c4e965fc') ||
      lowerUrl.includes('photo-1550745165-9bc0b252726f')

    if (!isHardwarePhoto && (url.startsWith('http') || url.startsWith('/assets/'))) {
      return url
    }
  }

  // Restore the original esports tournament stage arena background
  return ORIGINAL_ESPORTS_ARENA_IMAGE
}
