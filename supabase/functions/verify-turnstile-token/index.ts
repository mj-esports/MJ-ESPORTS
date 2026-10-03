// Supabase Edge Function: verify-turnstile-token
// Server-side Cloudflare Turnstile token verification

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') || ''
  const customOrigins = (Deno.env.get('ALLOWED_ORIGINS') || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)

  const defaultOrigins = [
    'https://mj-esports.vercel.app',
    'https://mjesports.in',
    'https://www.mjesports.in',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:4173',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:4173',
  ]

  const isVercel = /^https:\/\/[a-zA-Z0-9-]+\.vercel\.app$/.test(origin)
  const isAllowed = defaultOrigins.includes(origin) || customOrigins.includes(origin) || isVercel

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : 'https://mjesports.in',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  }
}

const CLOUDFLARE_SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'METHOD_NOT_ALLOWED', message: 'Only POST is supported.' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const secretKey = (Deno.env.get('CLOUDFLARE_TURNSTILE_SECRET_KEY') || '').trim()
    if (!secretKey) {
      console.error('[verify-turnstile-token Error]: CLOUDFLARE_TURNSTILE_SECRET_KEY environment variable is missing.')
      return new Response(
        JSON.stringify({
          success: false,
          error: 'TURNSTILE_SECRET_NOT_CONFIGURED',
          message: 'Server security configuration error. Cloudflare Turnstile secret key is not set.',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let body: any
    try {
      body = await req.json()
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: 'INVALID_JSON', message: 'Malformed JSON payload.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = typeof body?.token === 'string' ? body.token.trim() : ''
    const expectedAction = typeof body?.action === 'string' ? body.action.trim() : null

    // Strictly reject missing or empty token - fail closed
    if (!token) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'MISSING_TURNSTILE_TOKEN',
          message: 'Turnstile challenge token is required.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Call Cloudflare Turnstile siteverify server-side
    const remoteIp = req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined

    const verifyPayload: Record<string, string> = {
      secret: secretKey,
      response: token,
    }
    if (remoteIp) {
      verifyPayload.remoteip = remoteIp
    }

    const cfResponse = await fetch(CLOUDFLARE_SITEVERIFY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(verifyPayload),
    })

    if (!cfResponse.ok) {
      console.error('[verify-turnstile-token Error]: Cloudflare siteverify HTTP error', cfResponse.status)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'CLOUDFLARE_API_ERROR',
          message: 'Upstream challenge service returned an error.',
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const cfData = await cfResponse.json()

    // Inspect outcome
    if (!cfData.success) {
      // Do NOT log secret key or full token!
      const maskedToken = token.length > 8 ? `${token.slice(0, 4)}...${token.slice(-4)}` : '***'
      console.warn('[verify-turnstile-token]: Verification rejected by Cloudflare.', {
        maskedToken,
        errorCodes: cfData['error-codes'],
      })
      return new Response(
        JSON.stringify({
          success: false,
          error: 'TURNSTILE_VERIFICATION_FAILED',
          error_codes: cfData['error-codes'] || ['invalid-input-response'],
          message: 'Security challenge verification failed. Please refresh and try again.',
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Action validation if expectedAction provided
    if (expectedAction && cfData.action && cfData.action !== expectedAction) {
      console.warn('[verify-turnstile-token]: Action mismatch', { expected: expectedAction, got: cfData.action })
      return new Response(
        JSON.stringify({
          success: false,
          error: 'ACTION_MISMATCH',
          message: 'Security challenge action mismatch.',
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        challenge_ts: cfData.challenge_ts,
        hostname: cfData.hostname,
        action: cfData.action,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err: any) {
    console.error('[verify-turnstile-token Exception]:', err?.message || err)
    return new Response(
      JSON.stringify({
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error while processing security challenge.',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
