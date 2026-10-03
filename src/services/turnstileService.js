// src/services/turnstileService.js
// Cloudflare Turnstile Bot Protection Helper (Phase 3)
//
// ARCHITECTURAL SECURITY CONTRACT:
// 1. Only the public site key (VITE_CLOUDFLARE_TURNSTILE_SITE_KEY) is read by the frontend.
// 2. The server-side verification secret must NEVER be placed in any VITE_* variable or React code.
// 3. Server-side verification takes place in Supabase Edge Functions via:
//    POST https://challenges.cloudflare.com/turnstile/v0/siteverify
// 4. If VITE_CLOUDFLARE_TURNSTILE_SITE_KEY is not configured in the environment,
//    Turnstile is disabled and operations proceed cleanly without blocking legitimate players.

import { supabase, isSupabaseConfigured } from '../lib/supabase.js'

const TURNSTILE_SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

export const TURNSTILE_SITE_KEY =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_CLOUDFLARE_TURNSTILE_SITE_KEY) || ''

export const isTurnstileEnabled = () => Boolean(TURNSTILE_SITE_KEY && TURNSTILE_SITE_KEY.trim().length > 0)

let scriptPromise = null

/**
 * Loads the Cloudflare Turnstile explicit rendering script once.
 */
export function loadTurnstileScript() {
  if (typeof window === 'undefined') return Promise.resolve(false)
  if (window.turnstile) return Promise.resolve(true)

  if (!scriptPromise) {
    scriptPromise = new Promise((resolve) => {
      const existingScript = document.querySelector(`script[src^="${TURNSTILE_SCRIPT_URL}"]`)
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve(true))
        existingScript.addEventListener('error', () => resolve(false))
        return
      }

      const script = document.createElement('script')
      script.src = TURNSTILE_SCRIPT_URL
      script.async = true
      script.defer = true
      script.onload = () => resolve(true)
      script.onerror = (err) => {
        console.warn('[Turnstile]: Failed to load Turnstile script from Cloudflare.', err)
        resolve(false)
      }
      document.head.appendChild(script)
    })
  }

  return scriptPromise
}

/**
 * Renders a Turnstile widget into a target DOM container.
 * @param {HTMLElement|string} container - DOM element or selector
 * @param {object} options - Callbacks: { onSuccess, onError, onExpired, action }
 * @returns {Promise<string|null>} widgetId
 */
export async function renderTurnstileWidget(container, options = {}) {
  if (!isTurnstileEnabled()) {
    console.debug('[Turnstile]: Site key not configured; skipping widget render.')
    return null
  }

  const loaded = await loadTurnstileScript()
  if (!loaded || !window.turnstile) {
    console.warn('[Turnstile]: Window.turnstile is not available.')
    return null
  }

  try {
    const targetElement = typeof container === 'string' ? document.querySelector(container) : container
    if (!targetElement) {
      console.warn('[Turnstile]: Container element not found.')
      return null
    }

    const renderParams = {
      sitekey: TURNSTILE_SITE_KEY,
      theme: 'dark',
      callback: (token) => {
        if (options.onSuccess) options.onSuccess(token)
      },
      'error-callback': (err) => {
        console.warn('[Turnstile]: Challenge encountered an error:', err)
        if (options.onError) options.onError(err)
      },
      'expired-callback': () => {
        console.warn('[Turnstile]: Challenge expired.')
        if (options.onExpired) options.onExpired()
      },
    }

    if (options.action) {
      renderParams.action = options.action
    }

    const widgetId = window.turnstile.render(targetElement, renderParams)
    return widgetId
  } catch (err) {
    console.error('[Turnstile Exception]:', err)
    return null
  }
}

/**
 * Resets an active Turnstile widget.
 */
export function resetTurnstileWidget(widgetId) {
  if (typeof window !== 'undefined' && window.turnstile && widgetId) {
    try {
      window.turnstile.reset(widgetId)
    } catch (err) {
      console.warn('[Turnstile Reset Error]:', err)
    }
  }
}

/**
 * Server-side Turnstile token verification via Supabase Edge Function
 * Calls Cloudflare siteverify endpoint securely from server side.
 * @param {string} token - Turnstile response token from challenge
 * @param {object} options - Optional parameters: { action }
 * @returns {Promise<{ success: boolean, message?: string, error?: string, challengeTs?: string, hostname?: string }>}
 */
export async function verifyTurnstileToken(token, options = {}) {
  // 1. If Turnstile is not configured in environment, permit pass-through gracefully in dev
  if (!isTurnstileEnabled()) {
    return { success: true, skipped: true }
  }

  const cleanToken = typeof token === 'string' ? token.trim() : ''
  if (!cleanToken) {
    return {
      success: false,
      error: 'MISSING_TURNSTILE_TOKEN',
      message: 'Security challenge token is required. Please complete the captcha.',
    }
  }

  if (!isSupabaseConfigured) {
    console.warn('[Turnstile]: Supabase not configured in current environment; passing through in dev mode.')
    return { success: true, devMode: true }
  }

  try {
    const { data, error } = await supabase.functions.invoke('verify-turnstile-token', {
      body: {
        token: cleanToken,
        action: options.action || undefined,
      },
    })

    if (error) {
      console.error('[Turnstile Server Verification Error]:', error)
      return {
        success: false,
        error: error.message || 'TURNSTILE_VERIFICATION_FAILED',
        message: 'Security challenge verification failed. Please try again.',
      }
    }

    if (data && data.success === true) {
      return {
        success: true,
        challengeTs: data.challenge_ts,
        hostname: data.hostname,
        action: data.action,
      }
    }

    return {
      success: false,
      error: data?.error || 'TURNSTILE_VERIFICATION_FAILED',
      message: data?.message || 'Security verification was not successful. Please try again.',
    }
  } catch (err) {
    console.error('[Turnstile Invocation Exception]:', err)
    return {
      success: false,
      error: 'NETWORK_ERROR',
      message: 'Failed to communicate with security verification service.',
    }
  }
}
