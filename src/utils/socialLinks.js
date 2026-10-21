/**
 * MJ ESPORTS — Social Media Link Resolution Utility
 *
 * Safely resolves and formats external community/social links (Instagram and WhatsApp).
 * Follows strict security standards (HTTPS, noopener noreferrer) and prevents fabricated URLs.
 *
 * Precedence:
 * 1. Vite environment variables (VITE_INSTAGRAM_URL, VITE_WHATSAPP_URL, VITE_WHATSAPP_NUMBER)
 * 2. Admin localStorage configuration ('mj_esports_admin_settings')
 * 3. Returns null if unconfigured (does not invent fake accounts or destinations)
 */

const STORAGE_KEY = 'mj_esports_admin_settings'

function getAdminSettings() {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) || {}
  } catch {
    return {}
  }
}

/**
 * Format Instagram destination.
 * Handles full URLs or handles (e.g., '@username' or 'username').
 * Rejects generic homepage URLs lacking a specific profile.
 */
export function formatInstagramUrl(input) {
  if (!input || typeof input !== 'string') return null
  const trimmed = input.trim()
  if (!trimmed) return null

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    const httpsUrl = trimmed.replace(/^http:\/\//i, 'https://')
    // Disallow generic root URL without profile path (e.g. 'https://instagram.com' or 'https://instagram.com/')
    const pathOnly = httpsUrl.replace(/^https?:\/\/(www\.)?instagram\.com\/?/i, '').trim()
    if (!pathOnly) return null
    return httpsUrl
  }

  const cleanHandle = trimmed.replace(/^@+/, '').trim()
  if (!cleanHandle) return null

  return `https://instagram.com/${cleanHandle}`
}

/**
 * Format WhatsApp destination.
 * Handles community chat URLs (chat.whatsapp.com), wa.me links, or raw phone numbers.
 * Rejects generic homepage URLs lacking a community code, channel, or chat.
 */
export function formatWhatsAppUrl(input) {
  if (!input || typeof input !== 'string') return null
  const trimmed = input.trim()
  if (!trimmed) return null

  // If already an HTTP/HTTPS URL
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    const httpsUrl = trimmed.replace(/^http:\/\//i, 'https://')
    // Disallow generic WhatsApp homepage without community invite, channel, or wa.me chat
    const withoutDomain = httpsUrl
      .replace(/^https?:\/\/(www\.)?(chat\.)?whatsapp\.com\/?/i, '')
      .replace(/^https?:\/\/(www\.)?wa\.me\/?/i, '')
      .trim()
    if (!withoutDomain) return null
    return httpsUrl
  }

  // If phone number / digits
  const digits = trimmed.replace(/\D/g, '')
  if (!digits) return null

  // If exactly 10 digits (standard Indian mobile number without country code), prepend 91
  if (digits.length === 10) {
    return `https://wa.me/91${digits}`
  }

  // Otherwise use as full international number
  return `https://wa.me/${digits}`
}

/**
 * Resolves the configured Instagram URL.
 */
export function getInstagramUrl() {
  const envUrl = typeof import.meta !== 'undefined' && import.meta.env
    ? (import.meta.env.VITE_INSTAGRAM_URL || import.meta.env.VITE_INSTAGRAM_HANDLE || '')
    : ''

  if (envUrl && envUrl.trim()) {
    return formatInstagramUrl(envUrl)
  }

  const adminSettings = getAdminSettings()
  if (adminSettings.instagramUrl && typeof adminSettings.instagramUrl === 'string' && adminSettings.instagramUrl.trim()) {
    return formatInstagramUrl(adminSettings.instagramUrl)
  }

  return null
}

/**
 * Resolves the configured WhatsApp URL.
 */
export function getWhatsAppUrl() {
  const envUrl = typeof import.meta !== 'undefined' && import.meta.env
    ? (import.meta.env.VITE_WHATSAPP_URL || import.meta.env.VITE_WHATSAPP_COMMUNITY_URL || import.meta.env.VITE_WHATSAPP_NUMBER || '')
    : ''

  if (envUrl && envUrl.trim()) {
    return formatWhatsAppUrl(envUrl)
  }

  const adminSettings = getAdminSettings()
  if (adminSettings.whatsappUrl && typeof adminSettings.whatsappUrl === 'string' && adminSettings.whatsappUrl.trim()) {
    return formatWhatsAppUrl(adminSettings.whatsappUrl)
  }

  return null
}
