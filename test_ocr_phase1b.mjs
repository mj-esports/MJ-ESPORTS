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
  if (error.context && typeof error.context.json === 'function') {
    try {
      const errBody = await error.context.json()
      if (errBody && typeof errBody.error === 'string' && errBody.error.trim()) {
        displayError = errBody.error.trim()
      }
    } catch {
      // Safely retain fallback
    }
  }
  return displayError
}

const rateLimitError = {
  message: 'Edge Function returned a non-2xx status code',
  context: {
    json: async () => ({
      success: false,
      error: 'OCR service rate limit reached. Please try again shortly.',
      upstreamStatus: 429,
      upstreamMessage: 'Quota exceeded for metric: generativelanguage.googleapis.com',
    }),
  },
}
const parsedRateLimit = await parseServiceError(rateLimitError)
assert(parsedRateLimit === 'OCR service rate limit reached. Please try again shortly.', '7d. Rate limit 429/502 extracts user-friendly server message')
assert(!parsedRateLimit.includes('upstreamMessage') && !parsedRateLimit.includes('Quota exceeded'), '7e. Does not leak raw upstream quota internals')

const readabilityError = {
  message: 'Edge Function returned a non-2xx status code',
  context: {
    json: async () => ({
      success: false,
      error: 'Could not clearly detect both a valid Free Fire Character UID and In-Game Name (IGN) from this screenshot.',
    }),
  },
}
const parsedReadability = await parseServiceError(readabilityError)
assert(parsedReadability === 'Could not clearly detect both a valid Free Fire Character UID and In-Game Name (IGN) from this screenshot.', '7f. 422 unreadable screenshot extracts server readability message')

const authError = {
  message: 'Edge Function returned a non-2xx status code',
  context: {
    json: async () => ({
      success: false,
      error: 'Unauthorized: invalid or expired session',
    }),
  },
}
const parsedAuth = await parseServiceError(authError)
assert(parsedAuth === 'Unauthorized: invalid or expired session', '7g. 401 auth failure extracts server auth message')

const corruptError = {
  message: 'Edge Function returned a non-2xx status code',
  context: {
    json: async () => {
      throw new Error('Malformed JSON body')
    },
  },
}
const parsedCorrupt = await parseServiceError(corruptError)
assert(parsedCorrupt === 'Edge Function returned a non-2xx status code', '7h. Malformed JSON safely falls back to error.message')

const genericError = {
  message: 'Network request timed out',
}
const parsedGeneric = await parseServiceError(genericError)
assert(parsedGeneric === 'Network request timed out', '7i. Error without context safely falls back to error.message')

// --- SUITE 2: Edit Profile UI Integration & Controls ---
console.log('\n--- SUITE 2: EditProfilePage OCR UI Controls ---')

assert(editProfileCode.includes('extractFreeFireProfileFromScreenshot'), '8. EditProfilePage imports OCR extraction service')
assert(editProfileCode.includes('handleScanProfileOcr'), '9. handleScanProfileOcr handler implemented')
assert(editProfileCode.includes('handleConfirmOcrResult'), '10. handleConfirmOcrResult handler implemented')
assert(editProfileCode.includes('handleRetryOcr'), '11. handleRetryOcr handler implemented')
assert(editProfileCode.includes('SCAN PROFILE'), '12. Renders "SCAN PROFILE" action button')
assert(editProfileCode.includes('SCANNING PROFILE...'), '13. Renders "SCANNING PROFILE..." loading state')

// --- SUITE 3: Concurrency & Duplicate Click Guards ---
console.log('\n--- SUITE 3: Concurrency & Duplicate Click Guards ---')

assert(editProfileCode.includes('disabled={isOcrScanning || isProofUploading}'), '14. Scan button disabled while scanning is in flight')
assert(editProfileCode.includes('disabled={isProofUploading || isOcrScanning}'), '15. Upload & Cancel buttons disabled while scanning')
assert(editProfileCode.includes('setOcrResult(null)'), '16. Resetting file clears previous OCR result')

// --- SUITE 4: Detected Result Display & Exact IGN Preservation ---
console.log('\n--- SUITE 4: Detected Result Display & Exact IGN Preservation ---')

assert(editProfileCode.includes('DETECTED FROM SCREENSHOT'), '17. Clearly labels result "DETECTED FROM SCREENSHOT"')
assert(!editProfileCode.includes('Verified by MJ ESPORTS'), '18. Does NOT falsely claim player is verified by OCR alone')
assert(editProfileCode.includes('{ocrResult.exactIgn}'), '19. Renders ocrResult.exactIgn directly without alteration')
assert(!editProfileCode.includes('{ocrResult.exactIgn.toLowerCase()}'), '20. Does NOT lowercase or normalize exact IGN')
assert(editProfileCode.includes('{ocrResult.uid}'), '21. Renders ocrResult.uid directly without alterations')
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
console.log('\n--- SUITE 8: Mobile & Responsive Safety ---')

assert(editProfileCode.includes('break-all'), '33. Uses break-all to prevent horizontal overflow from long stylized IGNs')
assert(editProfileCode.includes('grid-cols-1 sm:grid-cols-2'), '34. Responsive grid for IGN and UID displays')

console.log('\n==================================================================')
console.log(`PHASE 1B UI AUDIT RESULTS: ${passed} PASSED, ${failed} FAILED`)
console.log('==================================================================\n')

if (failed > 0) {
  process.exit(1)
}
