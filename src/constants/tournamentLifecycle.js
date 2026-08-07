/**
 * Canonical 12-Stage Production Tournament Lifecycle Constants & Transition Logic
 * 
 * Order:
 * Draft -> Published -> Registration Open -> Registration Closed -> Check-in Open ->
 * Check-in Closed -> Room Released -> Live -> Results Pending -> Completed ->
 * Prize Distributed -> Archived
 */

export const TOURNAMENT_LIFECYCLE_STAGES = [
  'Draft',
  'Published',
  'Registration Open',
  'Registration Closed',
  'Check-in Open',
  'Check-in Closed',
  'Room Released',
  'Live',
  'Results Pending',
  'Completed',
  'Prize Distributed',
  'Archived',
]

/**
 * Normalizes legacy database status strings into canonical lifecycle stages.
 * @param {string} rawStatus
 * @returns {string} Canonical lifecycle stage
 */
export function normalizeLifecycleStatus(rawStatus) {
  if (!rawStatus || typeof rawStatus !== 'string') {
    return 'Draft'
  }

  const trimmed = rawStatus.trim()

  // Exact match
  if (TOURNAMENT_LIFECYCLE_STAGES.includes(trimmed)) {
    return trimmed
  }

  const s = trimmed.toLowerCase()

  if (s.includes('draft')) return 'Draft'
  if (s.includes('published')) return 'Published'
  if (s.includes('open') && !s.includes('check-in') && !s.includes('room')) return 'Registration Open'
  if (s.includes('closed') && !s.includes('check-in')) return 'Registration Closed'
  if (s.includes('check-in open') || (s.includes('check') && s.includes('open'))) return 'Check-in Open'
  if (s.includes('check-in closed') || (s.includes('check') && s.includes('close'))) return 'Check-in Closed'
  if (s.includes('room') || s.includes('released')) return 'Room Released'
  if (s.includes('live')) return 'Live'
  if (s.includes('result') || s.includes('pending')) return 'Results Pending'
  if (s.includes('completed') || s.includes('finished') || s.includes('ended')) return 'Completed'
  if (s.includes('prize') || s.includes('distribut')) return 'Prize Distributed'
  if (s.includes('archive')) return 'Archived'

  return 'Draft'
}

/**
 * Checks if a transition between two lifecycle stages is valid according to business rules.
 * @param {string} currentStatus 
 * @param {string} nextStatus 
 * @returns {boolean}
 */
export function isValidLifecycleTransition(currentStatus, nextStatus) {
  const currentNormalized = normalizeLifecycleStatus(currentStatus)
  const nextNormalized = normalizeLifecycleStatus(nextStatus)

  if (currentNormalized === nextNormalized) return true

  // Archived is accessible from any stage by admin override
  if (nextNormalized === 'Archived') return true

  const currentIndex = TOURNAMENT_LIFECYCLE_STAGES.indexOf(currentNormalized)
  const nextIndex = TOURNAMENT_LIFECYCLE_STAGES.indexOf(nextNormalized)

  if (currentIndex === -1 || nextIndex === -1) return false

  // Strict linear transition: next stage must be exactly current index + 1
  return nextIndex === currentIndex + 1
}

/**
 * Returns the next logical stage in the tournament lifecycle.
 * @param {string} currentStatus 
 * @returns {string|null} Next stage or null if already at terminal stage
 */
export function getNextLifecycleStage(currentStatus) {
  const currentNormalized = normalizeLifecycleStatus(currentStatus)
  const currentIndex = TOURNAMENT_LIFECYCLE_STAGES.indexOf(currentNormalized)

  if (currentIndex === -1 || currentIndex >= TOURNAMENT_LIFECYCLE_STAGES.length - 1) {
    return null
  }

  return TOURNAMENT_LIFECYCLE_STAGES[currentIndex + 1]
}

/**
 * Returns the previous stage in the tournament lifecycle for administrative rollback.
 * @param {string} currentStatus 
 * @returns {string|null} Previous stage or null if at initial stage
 */
export function getPreviousLifecycleStage(currentStatus) {
  const currentNormalized = normalizeLifecycleStatus(currentStatus)
  const currentIndex = TOURNAMENT_LIFECYCLE_STAGES.indexOf(currentNormalized)

  if (currentIndex <= 0) {
    return null
  }

  return TOURNAMENT_LIFECYCLE_STAGES[currentIndex - 1]
}
