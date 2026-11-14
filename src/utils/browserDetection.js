/**
 * MJ ESPORTS - Browser Detection & In-App Browser Utilities
 * 
 * Provides reliable User-Agent detection for Instagram in-app browser
 * and builds Chrome Android Intent URIs preserving the complete current URL.
 */

/**
 * Detects if the provided User-Agent belongs to Instagram's in-app browser.
 * @param {string} userAgent
 * @returns {boolean}
 */
export function isInstagramUserAgent(userAgent = '') {
  if (typeof userAgent !== 'string' || !userAgent) return false
  return /instagram/i.test(userAgent)
}

/**
 * Detects if the platform is Android.
 * @param {string} userAgent
 * @returns {boolean}
 */
export function isAndroidPlatform(userAgent = '') {
  if (typeof userAgent !== 'string' || !userAgent) return false
  return /android/i.test(userAgent)
}

/**
 * Detects if the platform is iOS (iPhone, iPad, iPod, or iPadOS desktop UA).
 * @param {string} userAgent
 * @param {string} platform
 * @param {number} maxTouchPoints
 * @returns {boolean}
 */
export function isIOSPlatform(userAgent = '', platform = '', maxTouchPoints = 0) {
  if (typeof userAgent !== 'string') return false
  if (/iphone|ipad|ipod/i.test(userAgent)) return true
  // iPadOS 13+ reports MacIntel but with touch support
  if (platform === 'MacIntel' && maxTouchPoints > 1) return true
  return false
}

/**
 * Builds an Android Chrome Intent URL that prompts the Android OS to open Google Chrome.
 * Preserves the full path, query parameters, and hash.
 * 
 * Android Intent URI Syntax:
 * intent://${cleanUrl}#Intent;scheme=${scheme};package=com.android.chrome;end
 * 
 * @param {string} targetUrl - Optional full URL; defaults to window.location.href
 * @returns {string} Android Intent URI
 */
export function buildChromeIntentUrl(targetUrl = '') {
  if (!targetUrl && typeof window === 'undefined') return ''
  const rawUrl = targetUrl || (typeof window !== 'undefined' ? window.location.href : '')
  if (!rawUrl) return ''

  try {
    const parsed = new URL(rawUrl)
    // parsed.host includes hostname and port (e.g. mj-esports.vercel.app)
    // parsed.pathname includes path (e.g. /tournaments/123)
    // parsed.search includes query parameters (e.g. ?ref=ig_bio&tab=rules)
    // parsed.hash includes anchor hash (e.g. #register)
    const hostAndPathAndQuery = `${parsed.host}${parsed.pathname}${parsed.search}${parsed.hash}`
    const scheme = parsed.protocol.replace(':', '') || 'https'
    
    return `intent://${hostAndPathAndQuery}#Intent;scheme=${scheme};package=com.android.chrome;end`
  } catch {
    // Robust fallback for raw strings
    const cleanUrl = rawUrl.replace(/^https?:\/\//i, '')
    const scheme = rawUrl.startsWith('http://') ? 'http' : 'https'
    return `intent://${cleanUrl}#Intent;scheme=${scheme};package=com.android.chrome;end`
  }
}

/**
 * Returns comprehensive browser and in-app environment context.
 * @returns {{
 *   isInstagram: boolean,
 *   isAndroid: boolean,
 *   isIOS: boolean,
 *   currentUrl: string,
 *   chromeIntentUrl: string
 * }}
 */
export function getInAppBrowserContext() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      isInstagram: false,
      isAndroid: false,
      isIOS: false,
      currentUrl: '',
      chromeIntentUrl: '',
    }
  }

  const ua = navigator.userAgent || ''
  const platform = navigator.platform || ''
  const touchPoints = navigator.maxTouchPoints || 0
  let previewParam = null
  try {
    const searchParams = new URLSearchParams(window.location.search || '')
    previewParam = searchParams.get('preview_ig_prompt')
  } catch {
    // Ignore URL parse errors
  }
  const isPreviewMode = Boolean(previewParam)
  const isInstagram = isPreviewMode ? true : isInstagramUserAgent(ua)
  
  let isAndroid = isAndroidPlatform(ua)
  let isIOS = isIOSPlatform(ua, platform, touchPoints)

  if (previewParam === 'android') {
    isAndroid = true
    isIOS = false
  } else if (previewParam === 'ios') {
    isAndroid = false
    isIOS = true
  }

  const currentUrl = window.location.href
  const chromeIntentUrl = isAndroid ? buildChromeIntentUrl(currentUrl) : ''

  return {
    isInstagram,
    isAndroid,
    isIOS,
    currentUrl,
    chromeIntentUrl,
  }
}

