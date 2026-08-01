/**
 * Production Readiness Phase 9.5 - Form Validation & Input Sanitization Utilities
 * Provides strict input sanitization, XSS prevention, and standardized format validation
 * for authentication, user profiles, tournament registrations, and admin controls.
 */

/**
 * Trims leading/trailing whitespace and strips harmful HTML tags to prevent XSS attacks.
 */
export function sanitizeString(input) {
  if (typeof input !== 'string') return ''
  return input
    .trim()
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/**
 * Strips HTML tags completely for safe display in plaintext fields.
 */
export function stripHtml(input) {
  if (typeof input !== 'string') return ''
  return input.trim().replace(/<[^>]*>?/gm, '')
}

/**
 * Validates standard email address format.
 */
export function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  return emailRegex.test(email.trim())
}

/**
 * Validates password strength: minimum 6 characters (recommended 8+), at least 1 letter and 1 number.
 */
export function isStrongPassword(password) {
  if (!password || typeof password !== 'string') return false
  const trimmed = password.trim()
  if (trimmed.length < 6) return false
  const hasLetter = /[a-zA-Z]/.test(trimmed)
  const hasNumber = /[0-9]/.test(trimmed)
  return hasLetter && hasNumber
}

/**
 * Validates Free Fire or BGMI Game UID format (8 to 12 digits/alphanumeric).
 */
export function isValidGameUid(uid) {
  if (!uid || typeof uid !== 'string') return false
  const uidRegex = /^[a-zA-Z0-9]{8,12}$/
  return uidRegex.test(uid.trim())
}

/**
 * Validates 10-digit phone number format.
 */
export function isValidPhoneNumber(phone) {
  if (!phone || typeof phone !== 'string') return false
  const cleanPhone = phone.trim().replace(/[\s\-\(\)\+]/g, '')
  return /^[0-9]{10}$/.test(cleanPhone)
}

/**
 * Validates team name (3 to 30 characters, no dangerous scripts).
 */
export function isValidTeamName(name) {
  if (!name || typeof name !== 'string') return false
  const trimmed = name.trim()
  return trimmed.length >= 3 && trimmed.length <= 30
}

/**
 * Validates non-negative numerical values (fees, prize pool, points, kills).
 */
export function isNonNegativeNumber(val) {
  if (val === null || val === undefined || val === '') return false
  const num = Number(val)
  return !isNaN(num) && num >= 0
}

/**
 * Validates positive numerical values (slots count > 0).
 */
export function isPositiveInteger(val) {
  if (val === null || val === undefined || val === '') return false
  const num = Number(val)
  return Number.isInteger(num) && num > 0
}

/**
 * Validates that a given date string is not in the past.
 */
export function isNotPastDate(dateStr) {
  if (!dateStr) return false
  const selectedDate = new Date(dateStr)
  if (isNaN(selectedDate.getTime())) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return selectedDate >= today
}

/**
 * Validates that end date is equal to or after start date.
 */
export function isEndDateAfterStartDate(startDateStr, endDateStr) {
  if (!startDateStr || !endDateStr) return false
  const start = new Date(startDateStr)
  const end = new Date(endDateStr)
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return false
  return end >= start
}

/**
 * Validates player username/handle (3 to 30 characters, alphanumeric, underscores or hyphens allowed).
 */
export function isValidUsername(name) {
  if (!name || typeof name !== 'string') return false
  const trimmed = name.trim()
  if (trimmed.length < 3 || trimmed.length > 30) return false
  return /^[a-zA-Z0-9_\-]+$/.test(trimmed)
}

/**
 * Validates valid HTTP or HTTPS URLs.
 */
export function isValidUrl(url) {
  if (!url || typeof url !== 'string') return false
  const trimmed = url.trim()
  if (!trimmed) return false
  try {
    const parsed = new URL(trimmed)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * Checks if input is a non-empty string.
 */
export function isNonEmptyString(val) {
  if (val === null || val === undefined || typeof val !== 'string') return false
  return val.trim().length > 0
}

/**
 * Validates avatar image uploads (allowed MIME types and max size in MB).
 */
export function validateImageFile(file, maxSizeMB = 5) {
  if (!file) return { isValid: false, message: 'Please select an image file to upload.' }
  
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    return { isValid: false, message: 'Invalid file type. Only JPEG, PNG, and WebP images are allowed.' }
  }

  const maxSizeBytes = maxSizeMB * 1024 * 1024
  if (file.size > maxSizeBytes) {
    return { isValid: false, message: `File size exceeds ${maxSizeMB} MB. Please upload a smaller image.` }
  }

  return { isValid: true, message: '' }
}

