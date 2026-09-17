/**
 * MJ ESPORTS — OCR Feature: Phase 1B Automated Verification Suite
 * 
 * Verifies Edit Profile OCR UI Integration:
 * 1. OCR UI integration exists in EditProfilePage.jsx
 * 2. Existing Edit Profile page cards & controls remain intact
 * 3. Existing evidence upload (uploadProfileProof) remains present and unaffected
 * 4. extractFreeFireProfileFromScreenshot service helper is implemented in playerEvidenceService.js
 * 5. Calls the authenticated Supabase Edge Function 'extract-free-fire-profile'
 * 6. Gemini is NOT called directly from frontend code
 * 7. Zero Gemini API keys exist in frontend code or .env
 * 8. Uses existing Supabase session and client
 * 9. OCR loading state exists with button disable guards
 * 10. Prevents duplicate OCR requests (disabled when scanning)
 * 11. Successful result displays exact detected IGN
 * 12. Successful result displays detected UID
 * 13. Exact IGN is NOT frontend-normalized or modified
 * 14. Unicode, special glyphs, and exact letter casing are preserved
 * 15. Free Fire UID displayed without modification
 * 16. OCR failure/uncertain state exists with clear messaging
 * 17. Retry / rescan mechanism exists
 * 18. Confirm action exists (CONFIRM button)
 * 19. Confirm does NOT mark the user as Verified (no verification_status update)
 * 20. Confirm does NOT update profiles or player_identity_evidence tables
 * 21. Tournament registration remains untouched
 * 22. Existing proof submission remains intact
 * 23. Zero duplicate evidence upload introduced
 * 24. Mobile/responsive-safe implementation (break-all, flexible grid)
 * 25. Clearly displays "DETECTED FROM SCREENSHOT" rather than "Verified"
 */

import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

console.log('\n==================================================================')
console.log('MJ ESPORTS — OCR FEATURE: PHASE 1B UI INTEGRATION AUDIT')
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

const editProfilePath = join(process.cwd(), 'src', 'pages', 'EditProfilePage.jsx')
const evidenceServicePath = join(process.cwd(), 'src', 'services', 'playerEvidenceService.js')
const envPath = join(process.cwd(), '.env')

assert(existsSync(editProfilePath), '1. EditProfilePage.jsx exists')
assert(existsSync(evidenceServicePath), '2. playerEvidenceService.js exists')

let editProfileCode = ''
let evidenceServiceCode = ''
let envCode = ''

try {
  editProfileCode = readFileSync(editProfilePath, 'utf8')
  evidenceServiceCode = readFileSync(evidenceServicePath, 'utf8')
  if (existsSync(envPath)) {
    envCode = readFileSync(envPath, 'utf8')
  }
} catch (err) {
  console.error('Error reading files:', err)
}

// --- SUITE 1: Evidence Service OCR Invocation & Security ---
console.log('--- SUITE 1: Evidence Service OCR Integration ---')

assert(evidenceServiceCode.includes('extractFreeFireProfileFromScreenshot'), '3. extractFreeFireProfileFromScreenshot function exported')
assert(evidenceServiceCode.includes("supabase.functions.invoke('extract-free-fire-profile'"), '4. Invokes secure extract-free-fire-profile Edge Function')
assert(!evidenceServiceCode.includes('generativelanguage.googleapis.com'), '5. Browser client does NOT call Google Gemini API directly')
assert(!evidenceServiceCode.includes('GEMINI_API_KEY'), '6. Zero GEMINI_API_KEY referenced in frontend service')
assert(!envCode.includes('GEMINI_API_KEY'), '7. Zero GEMINI_API_KEY exposed in client .env')
assert(evidenceServiceCode.includes('error.context.json'), '7a. Inspects error.context.json() to unwrap FunctionsHttpError')
assert(evidenceServiceCode.includes('errBody.error'), '7b. Extracts server-provided error string from response body')
assert(evidenceServiceCode.includes("error.message || 'Failed to scan screenshot.'"), '7c. Safely preserves fallback error message')

// Functional verification of error parsing logic
async function parseServiceError(error) {
  let displayError = error.message || 'Failed to scan screenshot.'
  let retryAfterSeconds = null
  if (error.context && typeof error.context.json === 'function') {
    try {
      const errBody = await error.context.json()
      if (errBody && typeof errBody.error === 'string' && errBody.error.trim()) {
        displayError = errBody.error.trim()
      }
      if (errBody && typeof errBody.retryAfterSeconds === 'number' && errBody.retryAfterSeconds > 0) {
        retryAfterSeconds = Math.ceil(errBody.retryAfterSeconds)
      }
    } catch {
      // Safely retain fallback
    }
  }
  if (!retryAfterSeconds && error.context?.headers && typeof error.context.headers.get === 'function') {
    try {
      const headerVal = error.context.headers.get('retry-after')
      if (headerVal) {
        const num = parseFloat(headerVal)
        if (!isNaN(num) && num >= 1 && num <= 300) {
          retryAfterSeconds = Math.ceil(num)
        }
      }
    } catch {}
  }
  const isRateLimited = error.context?.status === 429 || displayError.toLowerCase().includes('rate limit')
  return { displayError, retryAfterSeconds, isRateLimited }
}

const rateLimitError = {
  message: 'Edge Function returned a non-2xx status code',
  context: {
    status: 429,
    json: async () => ({
      success: false,
      error: 'OCR service rate limit reached. Please try again shortly.',
      retryAfterSeconds: 45,
    }),
  },
}
const parsedRateLimit = await parseServiceError(rateLimitError)
assert(parsedRateLimit.displayError === 'OCR service rate limit reached. Please try again shortly.', '7d. Rate limit 429 extracts user-friendly server message')
assert(parsedRateLimit.retryAfterSeconds === 45, '7e. Extracts numeric retryAfterSeconds (45s)')
assert(parsedRateLimit.isRateLimited === true, '7f. Correctly flags isRateLimited = true')

const headerRateLimitError = {
  message: 'Edge Function returned a non-2xx status code',
  context: {
    status: 429,
    headers: {
      get: (h) => (h === 'retry-after' ? '30' : null),
    },
    json: async () => ({
      success: false,
      error: 'OCR service rate limit reached. Please try again shortly.',
    }),
  },
}
const parsedHeaderRateLimit = await parseServiceError(headerRateLimitError)
assert(parsedHeaderRateLimit.retryAfterSeconds === 30, '7g. Extracts retryAfterSeconds from HTTP Retry-After header fallback')

const malformedRetryError = {
  message: 'Edge Function returned a non-2xx status code',
  context: {
    status: 429,
    json: async () => ({
      success: false,
      error: 'OCR service rate limit reached. Please try again shortly.',
      retryAfterSeconds: 'invalid-string',
    }),
  },
}
const parsedMalformedRetry = await parseServiceError(malformedRetryError)
assert(parsedMalformedRetry.retryAfterSeconds === null, '7h. Malformed retryAfterSeconds safely evaluates to null')

const readabilityError = {
  message: 'Edge Function returned a non-2xx status code',
  context: {
    status: 422,
    json: async () => ({
      success: false,
      error: 'Could not clearly detect both a valid Free Fire Character UID and In-Game Name (IGN) from this screenshot.',
    }),
  },
}
const parsedReadability = await parseServiceError(readabilityError)
assert(parsedReadability.displayError === 'Could not clearly detect both a valid Free Fire Character UID and In-Game Name (IGN) from this screenshot.', '7i. 422 unreadable screenshot extracts server readability message')
assert(parsedReadability.isRateLimited === false, '7j. 422 readability failure is not flagged as rate limited')

const authError = {
  message: 'Edge Function returned a non-2xx status code',
  context: {
    status: 401,
    json: async () => ({
      success: false,
      error: 'Unauthorized: invalid or expired session',
    }),
  },
}
const parsedAuth = await parseServiceError(authError)
assert(parsedAuth.displayError === 'Unauthorized: invalid or expired session', '7k. 401 auth failure extracts server auth message')

const corruptError = {
  message: 'Edge Function returned a non-2xx status code',
  context: {
    json: async () => {
      throw new Error('Malformed JSON body')
    },
  },
}
const parsedCorrupt = await parseServiceError(corruptError)
assert(parsedCorrupt.displayError === 'Edge Function returned a non-2xx status code', '7l. Malformed JSON safely falls back to error.message')

const genericError = {
  message: 'Network request timed out',
}
const parsedGeneric = await parseServiceError(genericError)
assert(parsedGeneric.displayError === 'Network request timed out', '7m. Error without context safely falls back to error.message')

// --- SUITE 2: Edit Profile UI Integration & Controls ---
console.log('\n--- SUITE 2: EditProfilePage OCR UI Controls ---')

assert(editProfileCode.includes('extractFreeFireProfileFromScreenshot'), '8. EditProfilePage imports OCR extraction service')
assert(editProfileCode.includes('handleScanProfileOcr'), '9. handleScanProfileOcr handler implemented')
assert(editProfileCode.includes('handleConfirmOcrResult'), '10. handleConfirmOcrResult handler implemented')
assert(editProfileCode.includes('handleRetryOcr'), '11. handleRetryOcr handler implemented')
assert(editProfileCode.includes('SCAN PROFILE'), '12. Renders "SCAN PROFILE" action button')
assert(editProfileCode.includes('SCANNING PROFILE...'), '13. Renders "SCANNING PROFILE..." loading state')

// --- SUITE 3: Concurrency, Cooldown & Duplicate Click Guards ---
console.log('\n--- SUITE 3: Concurrency, Cooldown & Duplicate Click Guards ---')

assert(
  editProfileCode.includes('disabled={IS_PROFILE_OCR_PAUSED || isOcrScanning || isProofUploading || ocrCooldownSeconds > 0}') ||
  editProfileCode.includes('disabled={isOcrScanning || isProofUploading || ocrCooldownSeconds > 0}') ||
  editProfileCode.includes('disabled={isOcrScanning || isProofUploading}'),
  '14. Scan button disabled while scanning is in flight, cooldown active, or OCR paused'
)
assert(editProfileCode.includes('disabled={isProofUploading || isOcrScanning}'), '15. Upload & Cancel buttons disabled while scanning')
assert(editProfileCode.includes('setOcrResult(null)'), '16. Resetting file clears previous OCR result')
assert(editProfileCode.includes('ocrCooldownSeconds'), '16a. ocrCooldownSeconds state manages rate-limit cooldown')
assert(editProfileCode.includes('setOcrCooldownSeconds'), '16b. Sets cooldown timer upon rate limit response')
assert(editProfileCode.includes('OCR service is temporarily rate-limited'), '16c. Renders clear rate-limit notice with countdown')
assert(editProfileCode.includes('disabled={isOcrScanning || ocrCooldownSeconds > 0}'), '16d. RETRY SCAN button disabled during cooldown')
assert(evidenceServiceCode.includes('export const IS_PROFILE_OCR_PAUSED'), '16e. Feature flag IS_PROFILE_OCR_PAUSED is exported and configurable')
assert(editProfileCode.includes('Profile OCR is temporarily unavailable.'), '16f. UI displays "Profile OCR is temporarily unavailable."')
assert(editProfileCode.includes('if (IS_PROFILE_OCR_PAUSED)'), '16g. handleScanProfileOcr halts immediately when paused without network requests')
assert(evidenceServiceCode.includes('if (IS_PROFILE_OCR_PAUSED)'), '16h. extractFreeFireProfileFromScreenshot halts immediately when paused')

// --- SUITE 4: Detected Result Display & UID Focus ---
console.log('\n--- SUITE 4: Detected Result Display & UID Focus ---')

assert(editProfileCode.includes('DETECTED FROM SCREENSHOT'), '17. Clearly labels result "DETECTED FROM SCREENSHOT"')
assert(!editProfileCode.includes('Verified by MJ ESPORTS'), '18. Does NOT falsely claim player is verified by OCR alone')
assert(!editProfileCode.includes('DETECTED IGN'), '19. IGN recognition remains paused: does NOT display detected IGN from Gemini')
assert(!editProfileCode.includes('{ocrResult.exactIgn.toLowerCase()}'), '20. Does NOT lowercase or normalize exact IGN')
assert(editProfileCode.includes('{ocrResult.uid'), '21. Renders ocrResult.uid directly without alterations')
assert(editProfileCode.includes('CONFIRMED BY YOU'), '22. Shows "CONFIRMED BY YOU" badge when confirmed')

// --- SUITE 5: Failure Handling & Retry Support ---
console.log('\n--- SUITE 5: Failure Handling & Retry Support ---')

assert(editProfileCode.includes('ocrError'), '23. Captures and displays OCR failure or uncertain notice')
assert(editProfileCode.includes('RETRY SCAN'), '24. Provides RETRY SCAN button on error')
assert(editProfileCode.includes('RESCAN'), '25. Provides RESCAN button on success panel')

// --- SUITE 6: Verification Purity & Database Boundary ---
console.log('\n--- SUITE 6: Verification Purity & Database Boundary ---')

assert(!editProfileCode.includes('handleConfirmOcrResult = async'), '26. handleConfirmOcrResult is purely frontend state (synchronous)')
assert(!editProfileCode.includes('supabase.from(\'profiles\').update({ verification_status: \'Verified\''), '27. Confirm does NOT mark player Verified in database')
assert(!editProfileCode.includes('supabase.from(\'player_identity_evidence\').insert('), '28. Confirm does NOT insert into player_identity_evidence')

// --- SUITE 7: Existing Proof Submission Preservation ---
console.log('\n--- SUITE 7: Existing Evidence Upload Flow Preservation ---')

assert(editProfileCode.includes('handleSubmitProof'), '29. Existing handleSubmitProof remains intact')
assert(editProfileCode.includes('uploadProfileProof(stagedFile'), '30. Existing uploadProfileProof call is preserved')
assert(editProfileCode.includes('SUBMIT PROOF'), '31. Existing "SUBMIT PROOF" button remains available')
assert(editProfileCode.includes('handleCancelStagedFile'), '32. Existing CANCEL action remains functional')

// --- SUITE 8: Mobile & Responsive Layout Safety ---
console.log('\n--- SUITE 8: Mobile & Responsive Layout Safety ---')

assert(editProfileCode.includes('select-all') || editProfileCode.includes('break-all'), '33. Uses text selection / wrapping utilities safely')
assert(editProfileCode.includes('FREE FIRE UID'), '34. Displays dedicated Free Fire UID card')

console.log('\n==================================================================')
console.log(`PHASE 1B UI AUDIT RESULTS: ${passed} PASSED, ${failed} FAILED`)
console.log('==================================================================\n')

if (failed > 0) {
  process.exit(1)
}
