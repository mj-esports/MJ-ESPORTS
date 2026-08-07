/**
 * Safe, universal UUID v4 generator for React + Vite + Browser + Vercel deployment.
 * Prevents "TypeError: crypto.randomUUID is not a function" in non-secure contexts,
 * older WebViews, or environments without native window.crypto.randomUUID support.
 * @returns {string} UUID v4 formatted string
 */
export function generateUUID() {
  if (typeof window !== 'undefined' && window.crypto && typeof window.crypto.randomUUID === 'function') {
    try {
      return window.crypto.randomUUID()
    } catch {
      // Fallback to custom generator
    }
  }

  if (typeof window !== 'undefined' && window.crypto && typeof window.crypto.getRandomValues === 'function') {
    try {
      const buffer = new Uint8Array(16)
      window.crypto.getRandomValues(buffer)
      buffer[6] = (buffer[6] & 0x0f) | 0x40 // Version 4
      buffer[8] = (buffer[8] & 0x3f) | 0x80 // Variant 10xx
      const hex = Array.from(buffer, (byte) => byte.toString(16).padStart(2, '0')).join('')
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
    } catch {
      // Fallback to RFC4122 generator
    }
  }

  // RFC4122 compliant pure JS fallback
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}
