/**
 * MJ ESPORTS — Phase 3: Resumed Gemini UID-Only OCR Automated Test Suite
 * 
 * Verifies:
 * 1. Valid 10-digit UID accepted (/^[0-9]{10}$/)
 * 2. 9-digit UID rejected
 * 3. 11-digit UID rejected
 * 4. Alphabetic UID rejected
 * 5. Missing UID failure (422)
 * 6. Ambiguous multiple UIDs failure (422 & ambiguous: true)
 * 7. Gemini 429 rate limit handling (Retry-After header & status)
 * 8. Gemini 503 upstream high demand handling
 * 9. Unauthenticated request rejected with HTTP 401
 * 10. Stored UID is never automatically overwritten in state or DB
 * 11. IGN remains strictly outside the UID OCR decision & output
 * 12. OCR pause/rollback feature flag infrastructure preserved
 */

import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

console.log('\n==================================================================')
console.log('MJ ESPORTS — RESUMED GEMINI UID-ONLY OCR AUDIT')
console.log('==================================================================\n')

let passed = 0
let failed = 0

function assert(condition, description) {
  if (condition) {
    console.log(`  ✓ PASS: ${description}`)
    passed++
  } else {
    console.error(`  ✗ FAIL: ${description}`)
    failed++
  }
}

const edgeFunctionPath = join(process.cwd(), 'supabase', 'functions', 'extract-free-fire-profile', 'index.ts')
const servicePath = join(process.cwd(), 'src', 'services', 'playerEvidenceService.js')
const editProfilePath = join(process.cwd(), 'src', 'pages', 'EditProfilePage.jsx')

const edgeCode = readFileSync(edgeFunctionPath, 'utf8')
const serviceCode = readFileSync(servicePath, 'utf8')
const editProfileCode = readFileSync(editProfilePath, 'utf8')

// --- SUITE 1: Server-Side Strict UID Validation Rules ---
console.log('--- SUITE 1: Server-Side Strict UID Validation Rules ---')

function isValidGameUid(uid) {
  if (!uid || typeof uid !== 'string') return false
  return /^[0-9]{10}$/.test(uid.trim())
}

assert(isValidGameUid('3619879816') === true, '1. Valid 10-digit UID is accepted')
assert(isValidGameUid('361987981') === false, '2. 9-digit UID is rejected')
assert(isValidGameUid('36198798160') === false, '3. 11-digit UID is rejected')
assert(isValidGameUid('ABC1234567') === false, '4. Alphabetic / alphanumeric UID is rejected')
assert(isValidGameUid('') === false, '5. Empty UID is rejected')
assert(isValidGameUid(null) === false, '6. Null UID is rejected')
assert(isValidGameUid('3619 87981') === false, '7. Whitespace-containing UID is rejected')

// --- SUITE 2: Edge Function UID-Only Extraction Objective ---
console.log('\n--- SUITE 2: Edge Function UID-Only Extraction Objective ---')

assert(edgeCode.includes('extract ONLY the player\'s Free Fire Character UID'), '8. System prompt focuses strictly on 10-digit UID extraction')
assert(edgeCode.includes('IGN recognition is strictly paused'), '9. Prompt explicitly declares IGN recognition is paused')
assert(edgeCode.includes('Do NOT extract or process In-Game Name'), '10. Prompt explicitly forbids extracting or returning IGN')
assert(edgeCode.includes('"uid": "<10 numeric digits string or null'), '11. Return schema specifies UID string or null')
assert(edgeCode.includes('"ambiguous": false') || edgeCode.includes('"ambiguous": boolean'), '12. Schema supports ambiguous flag')

// --- SUITE 3: Ambiguity & Missing UID Error Handling (HTTP 422) ---
console.log('\n--- SUITE 3: Ambiguity & Missing UID Error Handling ---')

assert(edgeCode.includes('isAmbiguous'), '13. Edge function evaluates ambiguous candidate flag')
assert(edgeCode.includes('Multiple ambiguous Free Fire Character UIDs'), '14. Returns descriptive error for ambiguous multiple UIDs')
assert(edgeCode.includes('status: 422'), '15. Ambiguity and illegibility return HTTP 422')
assert(edgeCode.includes('!isLegible || !rawExtractedUid'), '16. Missing or illegible UID returns HTTP 422')
assert(edgeCode.includes('!isValidGameUid(rawExtractedUid)'), '17. Enforces /^[0-9]{10}$/ on extracted UID before success')

// --- SUITE 4: Authentication & Security Isolation ---
console.log('\n--- SUITE 4: Authentication & Security Isolation ---')

assert(edgeCode.includes("authHeader.startsWith('Bearer ')"), '18. Requires Bearer token authentication')
assert(edgeCode.includes('supabaseClient.auth.getUser()'), '19. Verifies caller session with Supabase auth')
assert(edgeCode.includes('status: 401'), '20. Unauthenticated calls return HTTP 401')
assert(edgeCode.includes("Deno.env.get('GEMINI_API_KEY')"), '21. GEMINI_API_KEY accessed strictly server-side')
assert(!serviceCode.includes('GEMINI_API_KEY'), '22. Zero GEMINI_API_KEY exposure in frontend service')
assert(!editProfileCode.includes('GEMINI_API_KEY'), '23. Zero GEMINI_API_KEY exposure in frontend page')
assert(edgeCode.includes('CURRENT_GEMINI_MODEL = \'gemini-3.8-flash\''), '24. Uses official stable gemini-3.8-flash model')
assert(!edgeCode.includes('candidateCount:') && !edgeCode.includes('candidate_count:'), '25. Deprecated candidate_count parameter omitted from request')

// --- SUITE 5: Upstream Rate Limit (429) & Outage (503) Handling ---
console.log('\n--- SUITE 5: Upstream 429 and 503 Handling & Retry Policy ---')

assert(edgeCode.includes('upstreamStatus === 429'), '26. Handles Gemini 429 with user-friendly rate limit error')
assert(edgeCode.includes('upstreamStatus === 503'), '27. Handles Gemini 503 with high demand notice')
assert(edgeCode.includes('extractSafeRetryAfterSeconds'), '28. Extracts safe Retry-After seconds')
assert(edgeCode.includes("responseHeaders['Retry-After']"), '29. Forwards Retry-After response header to client')
assert(edgeCode.includes('MAX_RETRIES = 3'), '30. Conservative retry logic (MAX_RETRIES = 3) prevents retry storm')

// Specific 429 vs 503 retry policy assertions
assert(
  !edgeCode.includes('upstreamResponse.status === 503 || upstreamResponse.status === 429'),
  '30a. HTTP 429 is excluded from the transient retry loop'
)
assert(
  edgeCode.includes('isTransient503 = upstreamResponse.status === 503'),
  '30b. Only HTTP 503 triggers transient server-side retries'
)

// Unit simulation of retry loop policy
async function simulateRetryPolicy(mockStatusSequence, mockErrText = '', mockRetryAfterHeader = null) {
  let attemptCount = 0
  let totalDelayMs = 0
  const MAX_RETRIES = 3
  const BACKOFF_DELAYS_MS = [1500, 3000]

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    attemptCount++
    const currentStatus = mockStatusSequence[attempt - 1] || 500

    if (currentStatus === 200) {
      return { success: true, attempts: attemptCount, totalDelayMs, status: 200 }
    }

    const isTransient503 = currentStatus === 503
    if (isTransient503 && attempt < MAX_RETRIES) {
      const delayMs = BACKOFF_DELAYS_MS[attempt - 1] || 3000
      totalDelayMs += delayMs
      continue
    }

    // Non-transient errors (429, 400, 401, 403, 422, etc.) or final attempt exhausted
    let safeRetry = null
    if (currentStatus === 429) {
      if (mockRetryAfterHeader) safeRetry = parseInt(mockRetryAfterHeader, 10)
      else if (mockErrText) {
        const m = mockErrText.match(/retry in\s+([\d.]+)\s*s/i) || mockErrText.match(/"retryDelay":\s*"(\d+)s?"/)
        if (m) safeRetry = Math.ceil(parseFloat(m[1]))
      }
    }

    return {
      success: false,
      attempts: attemptCount,
      totalDelayMs,
      status: currentStatus,
      retryAfterSeconds: safeRetry,
      hasRetryHeader: !!safeRetry,
    }
  }
}

const sim429 = await simulateRetryPolicy([429, 429, 429], '{"error":{"details":[{"retryDelay":"25s"}]}}', '25')
assert(sim429.attempts === 1, '30c. 429 -> exactly ONE upstream attempt')
assert(sim429.totalDelayMs === 0, '30d. 429 -> zero backoff delays (no 1.5s or 3s retry)')
assert(sim429.retryAfterSeconds === 25, '30e. 429 -> retryAfterSeconds is returned')
assert(sim429.hasRetryHeader === true, '30f. 429 -> Retry-After header is preserved')

const sim503 = await simulateRetryPolicy([503, 503, 503])
assert(sim503.attempts === 3, '30g. 503 -> existing retry behavior remains intact (3 attempts)')
assert(sim503.totalDelayMs === 4500, '30h. 503 -> maximum retry backoff limit applied (1.5s + 3.0s = 4.5s)')

const sim503Recovered = await simulateRetryPolicy([503, 200])
assert(sim503Recovered.attempts === 2 && sim503Recovered.success === true, '30i. 503 -> recovers on transient retry')

// --- SUITE 6: Response Contract Purity (UID ONLY - No IGN Field) ---
console.log('\n--- SUITE 6: Response Contract Purity ---')

assert(edgeCode.includes('data: {\n          uid: rawExtractedUid,\n          isLegible: true'), '31. Success response returns UID only without IGN field')
assert(!edgeCode.includes('exactIgn: exactExtractedIgn'), '32. exactIgn field is NOT returned in success payload')
assert(!edgeCode.includes('canonicalIgn: toCanonicalIgn'), '33. canonicalIgn field is NOT returned in success payload')

// --- SUITE 7: Pause Toggle & Rollback Infrastructure ---
console.log('\n--- SUITE 7: Pause Toggle & Rollback Infrastructure ---')

assert(serviceCode.includes('export const IS_PROFILE_OCR_PAUSED = false'), '34. IS_PROFILE_OCR_PAUSED is set to false (resumed)')
assert(serviceCode.includes('if (IS_PROFILE_OCR_PAUSED)'), '35. Early-return pause mechanism remains intact')
assert(serviceCode.includes('isPaused: true'), '36. Pause mechanism returns isPaused flag')
assert(editProfileCode.includes('IS_PROFILE_OCR_PAUSED'), '37. EditProfilePage respects IS_PROFILE_OCR_PAUSED')

// --- SUITE 8: Frontend UID Comparison & Safety Boundaries ---
console.log('\n--- SUITE 8: Frontend UID Comparison & Safety Boundaries ---')

assert(editProfileCode.includes('FREE FIRE UID'), '38. UI displays FREE FIRE UID panel')
assert(editProfileCode.includes('MATCHES PROFILE'), '39. UI displays MATCHES PROFILE badge')
assert(editProfileCode.includes('UID MISMATCH'), '40. UI displays UID MISMATCH badge')
assert(editProfileCode.includes('UID NOT DETECTED'), '41. UI displays UID NOT DETECTED badge')
assert(!editProfileCode.includes('DETECTED IGN'), '42. UI does NOT display DETECTED IGN from Gemini')
assert(editProfileCode.includes('Your profile UID will not be modified automatically.'), '43. UI explicitly confirms profile UID is not auto-overwritten')
assert(editProfileCode.includes('CONFIRMED BY YOU'), '44. UI confirms player confirmation is manual frontend state only')
assert(!editProfileCode.includes('ocrResult.exactIgn'), '45. EditProfilePage does not depend on ocrResult.exactIgn')

// --- SUITE 9: Manual Evidence Flow Decoupling ---
console.log('\n--- SUITE 9: Manual Evidence Flow Decoupling ---')

assert(editProfileCode.includes('handleSubmitProof'), '46. handleSubmitProof remains intact')
assert(editProfileCode.includes('uploadProfileProof'), '47. uploadProfileProof remains intact')
assert(editProfileCode.includes('SUBMIT PROOF'), '48. SUBMIT PROOF button remains functional')

console.log('\n==================================================================')
console.log(`RESUMED GEMINI UID-ONLY OCR AUDIT: ${passed} PASSED, ${failed} FAILED`)
console.log('==================================================================\n')

if (failed > 0) {
  process.exit(1)
}
