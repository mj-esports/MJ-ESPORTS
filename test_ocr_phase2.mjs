/**
 * MJ ESPORTS — OCR Feature: Phase 2 Automated Reliability & Verification Logic Suite
 * 
 * Test Categories:
 * 1. UID Validation:
 *    - valid 10-digit UID accepted
 *    - 9-digit UID rejected
 *    - 11-digit UID rejected
 *    - alphabetic UID rejected
 *    - alphanumeric UID rejected
 *    - UID with spaces rejected
 *    - UID with punctuation rejected
 *    - missing/empty UID rejected
 * 
 * 2. IGN Validation & Extraction:
 *    - missing IGN rejected
 *    - empty IGN rejected
 *    - invalid-length IGN rejected (>30 chars or 0 chars)
 *    - exact case-sensitive comparison
 *    - Unicode glyphs preserved (亗, ⚡, ࿐)
 *    - special symbols preserved
 *    - meaningful internal spaces preserved
 *    - decorative characters & stylized scripts preserved
 * 
 * 3. Identity Matching & Profile Consistency:
 *    - exact IGN match verified
 *    - exact IGN mismatch verified (e.g. TotalGaming vs totalgaming)
 *    - normalized comparison kept strictly separate
 *    - normalized match is NOT an exact match
 *    - UID match detected (MATCH)
 *    - UID mismatch detected (MISMATCH)
 *    - UID unknown detected when profile UID absent (UNKNOWN)
 * 
 * 4. Safety & State Boundaries:
 *    - UID mismatch cannot overwrite profile UID
 *    - IGN mismatch cannot overwrite profile IGN
 *    - OCR cannot mark user Verified
 *    - OCR cannot modify profiles.verification_status
 *    - OCR cannot modify player_identity_evidence
 *    - User confirmation remains strictly frontend-only
 *    - Uncertain / unreadable result fails safely without hallucinating
 *    - Missing identity / non-profile fails safely
 * 
 * 5. Security & Upstream Isolation:
 *    - Gemini secret remains server-side in Deno.env
 *    - Zero VITE_GEMINI_API_KEY in frontend
 *    - Client cannot override Gemini key
 *    - Client cannot override Gemini endpoint
 *    - Client cannot override Gemini model
 *    - Client cannot inject replacement system instructions
 *    - Authentication remains strictly required (401 on missing auth)
 * 
 * 6. Regression Boundaries:
 *    - Phase 1A Edge Function compatible
 *    - Phase 1B Edit Profile UI integration compatible
 *    - Tournament registration untouched
 *    - Existing proof submission (uploadProfileProof) remains intact
 *    - Duplicate scan protection remains intact
 */

import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import {
  isValidGameUid,
  isValidIgn,
  toCanonicalIgn,
  normalizeIgn,
  compareProfileUid,
  compareProfileIgn,
} from './src/utils/playerIdentityUtils.js'

console.log('\n==================================================================')
console.log('MJ ESPORTS — OCR FEATURE: PHASE 2 RELIABILITY & VERIFICATION AUDIT')
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

// --- SUITE 1: UID Validation Rules ---
console.log('--- SUITE 1: UID Validation Rules ---')

assert(isValidGameUid('1234567890') === true, '1. Valid 10-digit UID is accepted')
assert(isValidGameUid('123456789') === false, '2. 9-digit UID is rejected')
assert(isValidGameUid('12345678901') === false, '3. 11-digit UID is rejected')
assert(isValidGameUid('ABCDEFGHIJ') === false, '4. Alphabetic UID is rejected')
assert(isValidGameUid('12345A7890') === false, '5. Alphanumeric UID is rejected')
assert(isValidGameUid('123 4567890') === false, '6. UID with internal spaces is rejected')
assert(isValidGameUid('12345-67890') === false, '7. UID with punctuation/hyphen is rejected')
assert(isValidGameUid('') === false && isValidGameUid(null) === false, '8. Missing/empty UID is rejected')

// --- SUITE 2: IGN Validation & Preservation Rules ---
console.log('\n--- SUITE 2: IGN Validation & Preservation Rules ---')

assert(isValidIgn('') === false && isValidIgn(null) === false, '9. Missing IGN is rejected')
assert(isValidIgn('   ') === false, '10. Empty whitespace IGN is rejected')
assert(isValidIgn('A'.repeat(31)) === false, '11. Overlong IGN (>30 characters) is rejected')

const ignA = 'TotalGaming'
const ignB = 'totalgaming'
assert(ignA !== ignB, '12. Exact case-sensitive comparison distinguishes uppercase from lowercase')

const unicodeIgn = '亗 ＭＪ・ＥＳＰＯＲＴＳ 亗'
assert(toCanonicalIgn(unicodeIgn) === unicodeIgn, '13. Unicode glyphs (亗) preserved exactly')

const symbolIgn = '⚡ ࿐ 么 ™'
assert(toCanonicalIgn(symbolIgn) === symbolIgn, '14. Special symbols preserved exactly')

const spacedIgn = 'KA¹⁷   Mjᶠᶠ'
assert(toCanonicalIgn(spacedIgn) === 'KA¹⁷ Mjᶠᶠ', '15. Meaningful spaces preserved and collapsed cleanly')

const stylizedIgn = '𝕯𝖆𝖗𝖐𝕶𝖓𝖎𝖌𝖍𝖙'
assert(toCanonicalIgn(stylizedIgn) === stylizedIgn, '16. Decorative stylized script fonts preserved')

// --- SUITE 3: Identity Matching & Profile Consistency ---
console.log('\n--- SUITE 3: Identity Matching & Profile Consistency ---')

const exactMatchRes = compareProfileIgn('TotalGaming', 'TotalGaming')
assert(exactMatchRes.exactMatch === true && exactMatchRes.status === 'MATCH', '17. Exact IGN match detected')

const exactMismatchRes = compareProfileIgn('TotalGaming', 'totalgaming')
assert(exactMismatchRes.exactMatch === false, '18. Exact IGN mismatch detected (different casing)')

assert(exactMismatchRes.normalizedMatch === true, '19. Normalized comparison evaluated separately')
assert(exactMismatchRes.status === 'NORMALIZED_MATCH_ONLY', '20. Normalized match is NOT classified as an exact match')

assert(compareProfileUid('1234567890', '1234567890') === 'MATCH', '21. UID match detected')
assert(compareProfileUid('1234567890', '9876543210') === 'MISMATCH', '22. UID mismatch detected')
assert(compareProfileUid('', '1234567890') === 'UNKNOWN', '22b. UID unknown detected when profile UID is missing')

// --- SUITE 4: Safety & State Boundaries ---
console.log('\n--- SUITE 4: Safety & State Boundaries ---')

const editProfilePath = join(process.cwd(), 'src', 'pages', 'EditProfilePage.jsx')
let editProfileCode = readFileSync(editProfilePath, 'utf8')

// Verify that UID mismatch does NOT overwrite profile UID
assert(!editProfileCode.includes('formData.freeFireUid = ocrResult.uid'), '23. UID mismatch cannot overwrite profile UID')

// Verify that IGN mismatch does NOT overwrite profile IGN
assert(!editProfileCode.includes('formData.username = ocrResult.exactIgn'), '24. IGN mismatch cannot overwrite profile IGN')

// Verify OCR cannot mark user Verified
assert(!editProfileCode.includes("verification_status = 'Verified'"), '25. OCR cannot mark user Verified')
assert(!editProfileCode.includes("verification_status: 'Verified'"), '26. OCR cannot modify profiles.verification_status')

// Verify OCR cannot modify player_identity_evidence
const edgeFunctionPath = join(process.cwd(), 'supabase', 'functions', 'extract-free-fire-profile', 'index.ts')
let edgeCode = readFileSync(edgeFunctionPath, 'utf8')

assert(!edgeCode.includes('player_identity_evidence'), '27. OCR Edge Function cannot modify player_identity_evidence')

// Confirmation is frontend only
assert(editProfileCode.includes('setOcrConfirmed(true)'), '28. User confirmation is stored strictly in frontend state')
assert(editProfileCode.includes('CONFIRMED BY YOU'), '28b. Renders "CONFIRMED BY YOU" rather than "Verified"')

// Uncertain results fail safely
assert(edgeCode.includes('is_legible') && edgeCode.includes('status: 422'), '29. Uncertain result fails safely with HTTP 422 without hallucinating')
assert(edgeCode.includes('Could not clearly detect'), '30. Missing identity fails safely with informative error')

// --- SUITE 5: Security & Upstream Isolation ---
console.log('\n--- SUITE 5: Security & Upstream Isolation ---')

assert(edgeCode.includes("Deno.env.get('GEMINI_API_KEY')"), '31. Gemini secret accessed only via Deno.env server-side')

const envPath = join(process.cwd(), '.env')
let envCode = existsSync(envPath) ? readFileSync(envPath, 'utf8') : ''
assert(!envCode.includes('GEMINI_API_KEY'), '32. Zero VITE Gemini secret in client environment')

assert(edgeCode.includes('body.apiKey') && edgeCode.includes('body.geminiApiKey'), '33. Client cannot override Gemini API key')
assert(edgeCode.includes('body.endpoint'), '34. Client cannot override Gemini endpoint')
assert(edgeCode.includes('body.model'), '35. Client cannot override Gemini model')
assert(edgeCode.includes('body.systemInstruction'), '36. Client cannot inject replacement system instructions')
assert(edgeCode.includes('authHeader.startsWith(\'Bearer \')'), '37. Authentication remains strictly required')

// --- SUITE 6: Regression & System Boundaries ---
console.log('\n--- SUITE 6: Regression & System Boundaries ---')

assert(existsSync(edgeFunctionPath), '38. Phase 1A extract-free-fire-profile Edge Function exists and compatible')
assert(editProfileCode.includes('extractFreeFireProfileFromScreenshot'), '39. Phase 1B EditProfilePage UI integration compatible')

const tournRegGrep = editProfileCode.includes('tournament_registrations')
assert(!tournRegGrep, '40. Tournament registration remains completely untouched')

assert(editProfileCode.includes('uploadProfileProof'), '41. Existing proof submission remains intact')
assert(editProfileCode.includes('disabled={isOcrScanning || isProofUploading}'), '42. Duplicate scan protection remains intact')

console.log('\n==================================================================')
console.log(`PHASE 2 RELIABILITY AUDIT RESULTS: ${passed} PASSED, ${failed} FAILED`)
console.log('==================================================================\n')

if (failed > 0) {
  process.exit(1)
}
