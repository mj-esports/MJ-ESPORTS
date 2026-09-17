// Supabase Edge Function: extract-free-fire-profile
// Secure Gemini Vision OCR for extracting Free Fire IGN & UID from profile screenshots

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Validation rules
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB ceiling
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']

// Server-side strict UID validator: exactly 10 numeric digits
function isValidGameUid(uid: string): boolean {
  if (!uid || typeof uid !== 'string') return false
  return /^[0-9]{10}$/.test(uid.trim())
}

// Server-side canonical IGN cleaner: preserves Unicode, emojis, stylized glyphs, trims & collapses excess spaces
function toCanonicalIgn(rawIgn: string): string {
  if (!rawIgn || typeof rawIgn !== 'string') return ''
  return rawIgn.trim().replace(/\s+/g, ' ')
}

// Server-side IGN validity: between 1 and 30 characters
function isValidIgn(ign: string): boolean {
  if (!ign || typeof ign !== 'string') return false
  const trimmed = ign.trim()
  return trimmed.length >= 1 && trimmed.length <= 30
}

// Server-side safe Retry-After parser: extracts integer seconds between 1 and 300, or returns null
function extractSafeRetryAfterSeconds(upstreamRes: Response | null, errText: string): number | null {
  // 1. Check upstream HTTP Retry-After header
  try {
    const headerVal = upstreamRes?.headers?.get('retry-after')
    if (headerVal) {
      const num = parseFloat(headerVal)
      if (!isNaN(num) && num >= 1 && num <= 300) {
        return Math.ceil(num)
      }
      const dateParsed = Date.parse(headerVal)
      if (!isNaN(dateParsed)) {
        const diffSec = Math.ceil((dateParsed - Date.now()) / 1000)
        if (diffSec >= 1 && diffSec <= 300) return diffSec
      }
    }
  } catch {
    // Ignore header parse exceptions
  }

  // 2. Parse Google RPC RetryInfo or message in errorText
  if (errText) {
    try {
      const parsed = JSON.parse(errText)
      const details = parsed?.error?.details
      if (Array.isArray(details)) {
        for (const item of details) {
          if (item?.retryDelay && typeof item.retryDelay === 'string') {
            const match = item.retryDelay.match(/^(\d+(?:\.\d+)?)s?$/)
            if (match) {
              const sec = Math.ceil(parseFloat(match[1]))
              if (sec >= 1 && sec <= 300) return sec
            }
          }
        }
      }
      const msg = parsed?.error?.message || ''
      const msgMatch = msg.match(/retry in\s+([\d.]+)\s*s/i)
      if (msgMatch) {
        const sec = Math.ceil(parseFloat(msgMatch[1]))
        if (sec >= 1 && sec <= 300) return sec
      }
    } catch {
      // Regex fallback on unparsed string
      try {
        const rawMatch = errText.match(/retry in\s+([\d.]+)\s*s/i)
        if (rawMatch) {
          const sec = Math.ceil(parseFloat(rawMatch[1]))
          if (sec >= 1 && sec <= 300) return sec
        }
      } catch {
        // ignore
      }
    }
  }

  return null
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed. Only POST is supported.' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    // 1. Authenticate caller via Supabase JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized: missing or invalid authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''

    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Server configuration error: missing Supabase environment' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized: invalid or expired session' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Parse request payload
    let body: any
    try {
      body = await req.json()
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid JSON payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Security Guard: Disallow client-provided configuration overrides
    if (body.apiKey || body.geminiApiKey || body.endpoint || body.model || body.systemInstruction) {
      return new Response(
        JSON.stringify({ success: false, error: 'Forbidden: client configuration overrides are not permitted' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. Validate image input
    const { imageBase64, mimeType } = body

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing or invalid imageBase64 payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const cleanMimeType = (mimeType || 'image/png').toLowerCase().trim()
    if (!ALLOWED_MIME_TYPES.includes(cleanMimeType)) {
      return new Response(
        JSON.stringify({ success: false, error: `Unsupported image format. Allowed formats: ${ALLOWED_MIME_TYPES.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Clean base64 string if data URL scheme is present
    const rawBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '').trim()
    if (!rawBase64) {
      return new Response(
        JSON.stringify({ success: false, error: 'Empty image base64 data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Estimate file size from base64 string length
    const approxSizeBytes = Math.round((rawBase64.length * 3) / 4)
    if (approxSizeBytes > MAX_IMAGE_SIZE_BYTES) {
      return new Response(
        JSON.stringify({ success: false, error: 'Image size exceeds maximum allowed limit of 5MB' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 5. Read GEMINI_API_KEY from server-side environment only
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'OCR service is currently unavailable: missing upstream credentials' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 6. Call Gemini Vision API with structured instructions
    // Production Model: gemini-3.8-flash (current official Google stable production model, upgraded from legacy v1beta/models/gemini-1.5-flash:generateContent)
    const CURRENT_GEMINI_MODEL = 'gemini-3.8-flash'
    const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${CURRENT_GEMINI_MODEL}:generateContent?key=${geminiApiKey}`

    const systemPrompt = `You are a high-precision OCR extraction engine specialized in Free Fire and Free Fire MAX profile banner screenshots.

YOUR SOLE MISSION:
Accurately locate and extract ONLY the player's Free Fire Character UID (numeric identifier) from the visible profile card in the screenshot.
Do NOT extract or process In-Game Name (IGN) — IGN recognition is strictly paused.
(Legacy reference notes: PRESERVE all Unicode characters, DO NOT autocorrect, normalize, translate, exact letter casing).

CRITICAL UID EXTRACTION RULES:
1. CHARACTER UID:
   - In Free Fire / Free Fire MAX, the Character UID is a numeric identifier displayed in the profile card / banner area, often directly below the avatar or next to a "UID:" label or copy icon.
   - The UID consists of EXACTLY 10 NUMERIC DIGITS (e.g. 3619879816).
   - Extract ONLY the digits. Exclude the literal text "UID:" or copy icons.
   - DO NOT guess or hallucinate missing digits.
   - DO NOT repair or complete partially visible or cut-off numbers.
   - If the UID is blurred, occluded, or unreadable, set "uid" to null and "is_legible" to false.
   - If multiple conflicting or ambiguous 10-digit candidate numbers are detected, set "ambiguous" to true, "uid" to null, and explain in "confidence_notes".

2. IGN IS EXCLUDED:
   - Do NOT attempt to read, normalize, or return the player's In-Game Name (IGN). Focus strictly and solely on the 10-digit UID.

RETURN FORMAT:
You MUST respond with valid, raw JSON only (no markdown code blocks, no backticks, no explanatory text):
{
  "uid": "<10 numeric digits string or null if unreadable or ambiguous>",
  "is_legible": true,
  "confidence_notes": "<brief assessment of UID visibility, clarity, and readability>",
  "ambiguous": false
}`

    const geminiPayload = {
      contents: [
        {
          role: 'user',
          parts: [
            { text: systemPrompt },
            {
              inline_data: {
                mime_type: cleanMimeType,
                data: rawBase64,
              },
            },
          ],
        },
      ],
      // Gemini 3.8 migration: deprecated sampling parameters (temperature: 0.1, top_p, top_k, candidate_count) removed
      generationConfig: {
        responseMimeType: 'application/json',
      },
    }

    // Upstream call with server-side transient retry for 503 and 429
    const MAX_RETRIES = 3
    const BACKOFF_DELAYS_MS = [1500, 3000]

    let upstreamResponse: Response | null = null
    let errorText = ''

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      upstreamResponse = await fetch(geminiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiPayload),
      })

      if (upstreamResponse.ok) {
        break
      }

      errorText = await upstreamResponse.text().catch(() => '')
      console.error(`[Gemini OCR Upstream Error] (attempt ${attempt}/${MAX_RETRIES}):`, upstreamResponse.status, errorText)

      // Only retry transient 503 (service high demand).
      // Do NOT retry HTTP 429: Google provides an explicit retry delay / quota reset window.
      // Retrying after 1.5s/3s can trigger immediate secondary quota violations and worsen rate-limit penalties.
      const isTransient503 = upstreamResponse.status === 503
      if (isTransient503 && attempt < MAX_RETRIES) {
        const delayMs = BACKOFF_DELAYS_MS[attempt - 1] || 3000
        await new Promise((resolve) => setTimeout(resolve, delayMs))
        continue
      }

      // Non-transient errors (429, 400, 401, 403, 422, etc.) or final attempt exhausted
      break
    }

    if (!upstreamResponse || !upstreamResponse.ok) {
      const upstreamStatus = upstreamResponse?.status || 502

      // 429 Quota Exhaustion / Rate Limit handling
      if (upstreamStatus === 429 || upstreamResponse.status === 429) {
        const safeRetryAfterSeconds = extractSafeRetryAfterSeconds(upstreamResponse, errorText)
        const responseHeaders: Record<string, string> = {
          ...corsHeaders,
          'Content-Type': 'application/json',
        }
        if (safeRetryAfterSeconds) {
          responseHeaders['Retry-After'] = String(safeRetryAfterSeconds)
        }

        return new Response(
          JSON.stringify({
            success: false,
            error: 'OCR service rate limit reached. Please try again shortly.',
            retryAfterSeconds: safeRetryAfterSeconds,
          }),
          { status: 429, headers: responseHeaders }
        )
      }

      // 503 Service High Demand handling
      if (upstreamStatus === 503) {
        const safeRetryAfterSeconds = extractSafeRetryAfterSeconds(upstreamResponse, errorText)
        const responseHeaders: Record<string, string> = {
          ...corsHeaders,
          'Content-Type': 'application/json',
        }
        if (safeRetryAfterSeconds) {
          responseHeaders['Retry-After'] = String(safeRetryAfterSeconds)
        }

        return new Response(
          JSON.stringify({
            success: false,
            error: 'Upstream Gemini vision service is currently experiencing high demand. Please retry shortly.',
            retryAfterSeconds: safeRetryAfterSeconds,
          }),
          { status: 503, headers: responseHeaders }
        )
      }

      // Other 5xx or unhandled upstream status -> 502 Bad Gateway
      const clientMessage = upstreamStatus >= 500
        ? 'Upstream OCR vision service is temporarily unavailable.'
        : 'Failed to process screenshot with OCR engine'

      return new Response(
        JSON.stringify({
          success: false,
          error: clientMessage,
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const geminiData = await upstreamResponse.json()
    const rawCandidateText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text

    if (!rawCandidateText) {
      return new Response(
        JSON.stringify({ success: false, error: 'OCR engine returned empty analysis' }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 7. Parse structured extraction from Gemini response
    let extractedResult: any
    try {
      // Strip markdown code fences if model enclosed JSON in ```json ... ```
      const cleanedText = rawCandidateText
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/, '')
        .replace(/\s*```$/, '')
        .trim()
      extractedResult = JSON.parse(cleanedText)
    } catch (parseErr) {
      console.error('[Gemini OCR Parse Exception]:', parseErr, rawCandidateText)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to parse structured OCR data from vision response' }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 8. Server-side validation of extracted data (UID ONLY)
    const rawExtractedUid = extractedResult?.uid ? String(extractedResult.uid).trim() : ''
    const isLegible = extractedResult?.is_legible !== false
    const isAmbiguous = extractedResult?.ambiguous === true

    // Check for ambiguous multiple UIDs
    if (isAmbiguous) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Multiple ambiguous Free Fire Character UIDs were detected in the screenshot. Please upload a clearer, uncropped screenshot focused on your profile card.',
          details: {
            ambiguous: true,
            notes: extractedResult?.confidence_notes || 'Ambiguous multiple UID candidates detected.',
          },
        }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check for illegible or missing UID
    if (!isLegible || !rawExtractedUid) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Could not clearly detect a valid Free Fire Character UID from this screenshot. Please ensure the screenshot clearly displays the profile card banner with the 10-digit UID.',
          details: {
            detectedUid: null,
            notes: extractedResult?.confidence_notes || 'UID text was blurry, cropped, or not clearly identifiable.',
          },
        }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 9. Enforce strict 10-digit UID rule (/^[0-9]{10}$/)
    if (!isValidGameUid(rawExtractedUid)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Extracted Character UID '${rawExtractedUid}' does not match the required 10-digit format for Free Fire. Please upload an uncropped, high-resolution screenshot.`,
          details: {
            detectedUid: rawExtractedUid,
          },
        }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 10. Return safe validated result to frontend (UID ONLY - IGN is not returned)
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          uid: rawExtractedUid,
          isLegible: true,
          confidenceNotes: extractedResult?.confidence_notes || 'UID extracted successfully',
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err: any) {
    console.error('[extract-free-fire-profile Exception]:', err)
    return new Response(
      JSON.stringify({ success: false, error: 'An unexpected internal error occurred while processing OCR request' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
