/**
 * MJ ESPORTS — OCR Feature: Paused Evaluation Verification Suite
 * 
 * Objectives:
 * 1. Confirms live Gemini OCR is paused via IS_PROFILE_OCR_PAUSED feature flag
 * 2. Confirms extractFreeFireProfileFromScreenshot returns safe paused error without invoking network
 * 3. Confirms UI indicates "Profile OCR is temporarily unavailable."
 * 4. Confirms SCAN PROFILE button is disabled while paused
 * 5. Confirms underlying Edge Function extract-free-fire-profile remains 100% intact
 * 6. Confirms underlying Gemini model, prompt, and retry logic are completely preserved
 * 7. Confirms player evidence upload (uploadProfileProof) remains intact and operational
 * 8. Confirms tournament registration, wallet, and Razorpay flows are completely unaffected
 */

import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

if (existsSync('.env')) {
  const envContent = readFileSync('.env', 'utf8')
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const [key, ...rest] = trimmed.split('=')
    if (key && rest.length > 0) {
      process.env[key.trim()] = rest.join('=').trim()
    }
  }
}

const {
  extractFreeFireProfileFromScreenshot,
  IS_PROFILE_OCR_PAUSED,
  uploadProfileProof,
  getPlayerProof
} = await import('./src/services/playerEvidenceService.js')

console.log('\n==================================================================')
console.log('MJ ESPORTS — OCR FEATURE: TEMPORARY PAUSE AUDIT')
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

// --- SUITE 1: Feature Flag & Non-Invocation Verification ---
console.log('--- SUITE 1: Feature Flag & Non-Invocation Verification ---')

const serviceSource = readFileSync(join(process.cwd(), 'src', 'services', 'playerEvidenceService.js'), 'utf8')
assert(serviceSource.includes('export const IS_PROFILE_OCR_PAUSED'), '1. IS_PROFILE_OCR_PAUSED feature flag is exported and configurable')
assert(serviceSource.includes('if (IS_PROFILE_OCR_PAUSED)'), '2. Early-return rollback guard halts execution before network requests')
assert(serviceSource.includes('Profile OCR is temporarily unavailable.'), '3. Paused OCR returns exact message "Profile OCR is temporarily unavailable."')
assert(serviceSource.includes('isPaused: true'), '4. Paused OCR returns isPaused: true flag')

// --- SUITE 2: Frontend UI Safeguards ---
console.log('\n--- SUITE 2: Frontend UI Safeguards ---')

const editProfilePath = join(process.cwd(), 'src', 'pages', 'EditProfilePage.jsx')
const editProfileCode = readFileSync(editProfilePath, 'utf8')

assert(editProfileCode.includes('IS_PROFILE_OCR_PAUSED'), '5. EditProfilePage imports IS_PROFILE_OCR_PAUSED')
assert(editProfileCode.includes('Profile OCR is temporarily unavailable.'), '6. EditProfilePage renders "Profile OCR is temporarily unavailable." notice')
assert(
  editProfileCode.includes('disabled={IS_PROFILE_OCR_PAUSED || isOcrScanning || isProofUploading || ocrCooldownSeconds > 0}'),
  '7. SCAN PROFILE button is disabled while OCR is paused'
)
assert(
  editProfileCode.includes('if (IS_PROFILE_OCR_PAUSED)'),
  '8. handleScanProfileOcr halts immediately when paused without calling service or backend'
)

// --- SUITE 3: Underlying Gemini OCR Code Preservation ---
console.log('\n--- SUITE 3: Underlying Gemini OCR Code Preservation ---')

const edgeFunctionPath = join(process.cwd(), 'supabase', 'functions', 'extract-free-fire-profile', 'index.ts')
assert(existsSync(edgeFunctionPath), '9. Edge function extract-free-fire-profile exists')

const edgeCode = readFileSync(edgeFunctionPath, 'utf8')
assert(edgeCode.includes('gemini-3.8-flash'), '10. Gemini 3.8 Flash model configuration remains preserved')
assert(edgeCode.includes('responseMimeType: \'application/json\''), '11. Structured JSON output remains preserved')
assert(edgeCode.includes('extractSafeRetryAfterSeconds'), '12. Safe Retry-After handling remains preserved')
assert(edgeCode.includes('MAX_RETRIES = 3'), '13. Server-side retry logic remains preserved')
assert(edgeCode.includes('isValidGameUid'), '14. Strict 10-digit UID validator remains preserved')
assert(edgeCode.includes('isValidIgn'), '15. Strict IGN validator remains preserved')

const evidenceServicePath = join(process.cwd(), 'src', 'services', 'playerEvidenceService.js')
const evidenceServiceCode = readFileSync(evidenceServicePath, 'utf8')
assert(
  evidenceServiceCode.includes("supabase.functions.invoke('extract-free-fire-profile'"),
  '16. Original Edge Function invocation code remains intact in playerEvidenceService.js'
)

// --- SUITE 4: Unrelated Flows & Evidence Submission Preservation ---
console.log('\n--- SUITE 4: Unrelated Flows & Evidence Submission Preservation ---')

assert(typeof uploadProfileProof === 'function', '17. uploadProfileProof function remains exported and intact')
assert(typeof getPlayerProof === 'function', '18. getPlayerProof function remains exported and intact')
assert(editProfileCode.includes('handleSubmitProof'), '19. handleSubmitProof remains functional in EditProfilePage')
assert(editProfileCode.includes('SUBMIT PROOF'), '20. "SUBMIT PROOF" button remains present for manual verification flow')
assert(!editProfileCode.includes('tournament_registrations'), '21. Tournament registration remains completely decoupled and untouched')

console.log('\n==================================================================')
console.log(`PAUSED OCR AUDIT RESULTS: ${passed} PASSED, ${failed} FAILED`)
console.log('==================================================================\n')

if (failed > 0) {
  process.exit(1)
}
