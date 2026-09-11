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
Accurately locate and extract the player's In-Game Name (IGN) and Character UID from the provided profile banner screenshot.

CRITICAL EXTRACTION RULES:
1. IN-GAME NAME (IGN):
   - In Free Fire, the IGN appears in the top-left player card / profile banner area, near the avatar, player level, and rank icon.
   - You MUST extract the IGN EXACTLY as displayed in the image.
   - PRESERVE all Unicode characters, special fonts, subscript/superscript digits, clan tags, symbols (e.g. 亗, ⚡, ࿐, ™, 么, ᶠᶠ, ⁰¹²³⁴⁵⁶⁷⁸⁹), and spaces.
   - PRESERVE exact letter casing (e.g. uppercase vs lowercase).
   - DO NOT autocorrect, normalize, translate, simplify, or convert stylized fonts to basic Latin.
   - DO NOT guess or hallucinate missing letters.
   - Pay extreme attention to: 'O' vs '0', 'I' vs 'l' vs '1', 'S' vs '5'.

2. CHARACTER UID:
   - In Free Fire, the Character UID is a numeric identifier displayed directly below or beside the IGN in the profile card, often next to a "UID:" label or copy icon.
   - The UID consists of NUMERIC DIGITS (typically 10 digits).
   - Extract ONLY the digits. Exclude the literal text "UID:" or copy icons.
   - DO NOT guess digits that are blurred or unreadable.

3. UNCERTAINTY / BLURRED IMAGES:
   - If either the IGN or UID cannot be clearly and legibly read from the screenshot, set is_legible to false and specify the issue in notes.

RETURN FORMAT:
You MUST respond with valid, raw JSON only (no markdown code blocks, no backticks, no explanatory text):
{
  "ign": "<exact string or null if unreadable>",
  "uid": "<digits string or null if unreadable>",
  "is_legible": true,
  "confidence_notes": "<brief assessment of clarity, font style, and readability>"
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

    const upstreamResponse = await fetch(geminiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiPayload),
    })

    if (!upstreamResponse.ok) {
      const errorText = await upstreamResponse.text().catch(() => '')
      console.error('[Gemini OCR Upstream Error]:', upstreamResponse.status, errorText)
      
      let clientMessage = 'Failed to process screenshot with OCR engine'
      if (upstreamResponse.status === 429) {
        clientMessage = 'OCR service rate limit reached. Please try again shortly.'
      } else if (upstreamResponse.status === 503) {
        clientMessage = 'Upstream Gemini vision service is currently experiencing high demand. Please retry shortly.'
      } else if (upstreamResponse.status >= 500) {
        clientMessage = 'Upstream OCR vision service is temporarily unavailable.'
      }

      let sanitizedUpstreamError = ''
      try {
        const parsedErr = JSON.parse(errorText)
        sanitizedUpstreamError = parsedErr?.error?.message || ''
      } catch {
        sanitizedUpstreamError = (errorText || '').slice(0, 150)
      }
      return new Response(
        JSON.stringify({
          success: false,
          error: clientMessage,
          upstreamStatus: upstreamResponse.status,
          upstreamMessage: sanitizedUpstreamError,
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

    // 8. Server-side validation of extracted data
    const rawExtractedIgn = extractedResult?.ign
    const rawExtractedUid = extractedResult?.uid ? String(extractedResult.uid).trim() : ''
    const isLegible = extractedResult?.is_legible !== false

    if (!isLegible || !rawExtractedUid || !rawExtractedIgn) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Could not clearly detect both a valid Free Fire Character UID and In-Game Name (IGN) from this screenshot. Please ensure the screenshot clearly displays the profile card banner.',
          details: {
            detectedIgn: rawExtractedIgn || null,
            detectedUid: rawExtractedUid || null,
            notes: extractedResult?.confidence_notes || 'Image text was blurry, cropped, or not clearly identifiable as a Free Fire profile.',
          },
        }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 9. Enforce existing 10-digit UID rule
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

    // 10. Enforce existing IGN validity rule (1 to 30 characters)
    const exactExtractedIgn = String(rawExtractedIgn).trim()
    if (!isValidIgn(exactExtractedIgn)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Extracted IGN length must be between 1 and 30 characters.',
          details: {
            detectedIgn: exactExtractedIgn,
          },
        }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 11. Return safe validated result to frontend
    // Notice: exact extracted IGN is preserved untouched. Canonical IGN is computed cleanly.
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          exactIgn: exactExtractedIgn,
          canonicalIgn: toCanonicalIgn(exactExtractedIgn),
          uid: rawExtractedUid,
          isLegible: true,
          confidenceNotes: extractedResult?.confidence_notes || 'Extracted successfully',
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
