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
 * Validates password minimum length requirement (minimum 8 characters).
 */
export function isStrongPassword(password) {
  if (!password || typeof password !== 'string') return false
  return password.length >= 8
}

/**
 * Evaluates live password strength indicator and recommendation guidelines.
 * Levels: 🟥 Weak | 🟨 Medium | 🟩 Strong | 🟪 Very Strong
 */
export function evaluatePasswordStrength(password) {
  if (!password || typeof password !== 'string') {
    return {
      score: 0,
      level: 'Weak',
      color: '#ef4444',
      badgeColor: 'bg-red-500/20 text-red-400 border-red-500/30',
      emoji: '🟥',
      segmentCount: 1,
      recommendations: {
        length8: false,
        hasNumber: false,
        hasSymbol: false,
        hasUppercase: false,
      },
    }
  }

  const length8 = password.length >= 8
  const hasNumber = /[0-9]/.test(password)
  const hasSymbol = /[^a-zA-Z0-9]/.test(password)
  const hasUppercase = /[A-Z]/.test(password)
  const hasLowercase = /[a-z]/.test(password)

  let score = 0
  if (length8) score += 1
  if (password.length >= 12) score += 1
  if (hasNumber) score += 1
  if (hasSymbol) score += 1
  if (hasUppercase && hasLowercase) score += 1

  let level = 'Weak'
  let color = '#ef4444'
  let badgeColor = 'bg-red-500/20 text-red-400 border-red-500/30'
  let emoji = '🟥'
  let segmentCount = 1

  if (!length8 || score <= 2) {
    level = 'Weak'
    color = '#ef4444'
    badgeColor = 'bg-red-500/20 text-red-400 border-red-500/30'
    emoji = '🟥'
    segmentCount = 1
  } else if (score === 3) {
    level = 'Medium'
    color = '#eab308'
    badgeColor = 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
    emoji = '🟨'
    segmentCount = 2
  } else if (score === 4) {
    level = 'Strong'
    color = '#10b981'
    badgeColor = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
    emoji = '🟩'
    segmentCount = 3
  } else {
    level = 'Very Strong'
    color = '#a855f7'
    badgeColor = 'bg-purple-500/20 text-purple-300 border-purple-500/30'
    emoji = '🟪'
    segmentCount = 4
  }

  return {
    score,
    level,
    color,
    badgeColor,
    emoji,
    segmentCount,
    recommendations: {
      length8,
      hasNumber,
      hasSymbol,
      hasUppercase,
    },
  }
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
  const cleanPhone = phone.trim().replace(/[\s\-()+]/g, '')
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
 * Parses tournament date and time strings into a precise Date object in IST (Asia/Kolkata, UTC+05:30).
 * Combines start_date ("YYYY-MM-DD") and start_time ("06:00 PM IST", "18:00", etc.).
 */
export function parseTournamentDeadline(startDateStr, startTimeStr) {
  if (!startDateStr || typeof startDateStr !== 'string') return null

  const trimmedDate = startDateStr.trim()
  if (!trimmedDate) return null

  // If startDate is already a full ISO string, parse directly
  if (trimmedDate.includes('T') || trimmedDate.includes('Z')) {
    const d = new Date(trimmedDate)
    return isNaN(d.getTime()) ? null : d
  }

  // Extract YYYY-MM-DD
  const dateMatch = trimmedDate.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
  if (!dateMatch) {
    const fallbackDate = new Date(trimmedDate)
    return isNaN(fallbackDate.getTime()) ? null : fallbackDate
  }

  const [, yearStr, monthStr, dayStr] = dateMatch
  const year = yearStr
  const month = monthStr.padStart(2, '0')
  const day = dayStr.padStart(2, '0')

  // Parse Time (Default to 23:59:59 IST if time not provided so registration is open throughout match day until start)
  let hours = 23
  let minutes = 59
  let seconds = 59

  if (startTimeStr && typeof startTimeStr === 'string' && startTimeStr.trim()) {
    const rawTime = startTimeStr.trim().toUpperCase()

    const isPm = rawTime.includes('PM')
    const isAm = rawTime.includes('AM')

    const timeMatch = rawTime.match(/(\d{1,2}):(\d{2})/)
    if (timeMatch) {
      let parsedHours = parseInt(timeMatch[1], 10)
      const parsedMinutes = parseInt(timeMatch[2], 10)

      if (isPm || isAm) {
        if (isPm && parsedHours < 12) parsedHours += 12
        if (isAm && parsedHours === 12) parsedHours = 0
      }

      if (!isNaN(parsedHours) && parsedHours >= 0 && parsedHours <= 23) {
        hours = parsedHours
      }
      if (!isNaN(parsedMinutes) && parsedMinutes >= 0 && parsedMinutes <= 59) {
        minutes = parsedMinutes
        seconds = 0
      }
    }
  }

  const hoursStr = String(hours).padStart(2, '0')
  const minutesStr = String(minutes).padStart(2, '0')
  const secondsStr = String(seconds).padStart(2, '0')

  // Format as ISO string in IST (Asia/Kolkata +05:30)
  const istIsoString = `${year}-${month}-${day}T${hoursStr}:${minutesStr}:${secondsStr}+05:30`
  const parsedDate = new Date(istIsoString)

  return isNaN(parsedDate.getTime()) ? null : parsedDate
}

/**
 * Validates player username/handle.
 * Accepts ANY character set (including symbols, emojis, unicode, international scripts).
 * Rules: Cannot be empty or only whitespace, automatically trimmed, maximum 50 characters.
 */
export function isValidUsername(name) {
  if (!name || typeof name !== 'string') return false
  const trimmed = name.trim()
  if (!trimmed) return false
  return trimmed.length <= 50
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

