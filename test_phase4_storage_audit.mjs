// test_phase4_storage_audit.mjs
// Comprehensive automated test suite for Phase 4: Storage Optimization & Cloudflare R2 Audit (MJ ESPORTS)

import fs from 'fs'
import path from 'path'
import assert from 'assert'

const ROOT = process.cwd()

console.log('==================================================================')
console.log('MJ ESPORTS — PHASE 4: STORAGE OPTIMIZATION & R2 AUDIT TEST SUITE')
console.log('==================================================================\n')

let passed = 0
let failed = 0

function test(description, fn) {
  try {
    fn()
    console.log(`  ✅ [PASS] ${description}`)
    passed++
  } catch (err) {
    console.error(`  ❌ [FAIL] ${description}`)
    console.error(`     Reason: ${err.message}`)
    failed++
  }
}

// ----------------------------------------------------------------------------
// GROUP 1: STORAGE BUCKET INVENTORY & CONFIGURATION
// ----------------------------------------------------------------------------
console.log('--- GROUP 1: Storage Bucket Inventory & Declarations ---')

test('1.1. Active production buckets (avatars, profile-proofs) are correctly declared', () => {
  const supabaseLib = fs.readFileSync(path.join(ROOT, 'src', 'lib', 'supabase.js'), 'utf8')
  assert(supabaseLib.includes("AVATAR_BUCKET = 'avatars'"), 'AVATAR_BUCKET must be declared')
  assert(supabaseLib.includes("PROFILE_PROOFS_BUCKET = 'profile-proofs'"), 'PROFILE_PROOFS_BUCKET must be declared')

  const storageService = fs.readFileSync(path.join(ROOT, 'src', 'services', 'storageService.js'), 'utf8')
  assert(storageService.includes("AVATARS: AVATAR_BUCKET || 'avatars'"), 'KNOWN_BUCKETS must include AVATARS')
  assert(storageService.includes("PROFILE_PROOFS: PROFILE_PROOFS_BUCKET || 'profile-proofs'"), 'KNOWN_BUCKETS must include PROFILE_PROOFS')
})

test('1.2. Historical OCR buckets remain safely dropped and are not resurrected', () => {
  const cleanupSql = fs.readFileSync(path.join(ROOT, 'supabase_phase_ocr_cleanup.sql'), 'utf8')
  assert(cleanupSql.includes("DELETE FROM storage.buckets WHERE id IN ('scoreboard-proofs', 'match-scorecards');"))
  
  // Verify neither active service references dropped buckets
  const avatarService = fs.readFileSync(path.join(ROOT, 'src', 'services', 'avatarService.js'), 'utf8')
  assert(!avatarService.includes('scoreboard-proofs') && !avatarService.includes('match-scorecards'))

  const evidenceService = fs.readFileSync(path.join(ROOT, 'src', 'services', 'playerEvidenceService.js'), 'utf8')
  assert(!evidenceService.includes('scoreboard-proofs') && !evidenceService.includes('match-scorecards'))
})

// ----------------------------------------------------------------------------
// GROUP 2: ROW LEVEL SECURITY & POLICY AUDIT
// ----------------------------------------------------------------------------
console.log('\n--- GROUP 2: Storage Row Level Security (RLS) & Access Control ---')

test('2.1. avatars bucket enforces strict user-folder isolation on UPDATE and DELETE', () => {
  const sql = fs.readFileSync(path.join(ROOT, 'supabase_phase1_security_hardening.sql'), 'utf8')
  assert(sql.includes("CREATE POLICY \"Authenticated Users Update Avatar\""))
  assert(sql.includes("auth.uid()::text = (storage.foldername(name))[1]"))
  assert(sql.includes("CREATE POLICY \"Authenticated Users Delete Avatar\""))
})

test('2.2. profile-proofs bucket enforces private storage, owner-upload, and admin read', () => {
  const sql = fs.readFileSync(path.join(ROOT, 'supabase_phase2_player_profile_evidence.sql'), 'utf8')
  assert(sql.includes("CREATE POLICY \"Users upload own profile proof evidence\""))
  assert(sql.includes("bucket_id = 'profile-proofs'"))
  assert(sql.includes("auth.uid()::text = (storage.foldername(name))[1]"))
  assert(sql.includes("CREATE POLICY \"Users and admins read profile proof evidence\""))
  assert(sql.includes("public.is_admin()"))
})

// ----------------------------------------------------------------------------
// GROUP 3: CLIENT-SIDE VALIDATION & STORAGE SERVICE INTERFACE
// ----------------------------------------------------------------------------
console.log('\n--- GROUP 3: Storage Validation & Unified Service Interface ---')

import { validateStorageFile, STORAGE_LIMITS, KNOWN_BUCKETS, STORAGE_PROVIDERS } from './src/services/storageService.js'

test('3.1. validateStorageFile rejects files exceeding maximum size limit', () => {
  const oversizedFile = { size: 6 * 1024 * 1024, type: 'image/png' } // 6 MB
  assert.throws(() => {
    validateStorageFile(oversizedFile, { maxBytes: 5 * 1024 * 1024 })
  }, /exceeds the maximum allowed limit/)
})

test('3.2. validateStorageFile rejects dangerous or disallowed MIME types', () => {
  const executableFile = { size: 1024, type: 'application/x-msdownload' }
  assert.throws(() => {
    validateStorageFile(executableFile)
  }, /Unsupported file format/)

  const scriptFile = { size: 1024, type: 'text/html' }
  assert.throws(() => {
    validateStorageFile(scriptFile)
  }, /Unsupported file format/)
})

test('3.3. validateStorageFile accepts valid image types within size limit', () => {
  assert.strictEqual(validateStorageFile({ size: 1024 * 500, type: 'image/jpeg' }), true)
  assert.strictEqual(validateStorageFile({ size: 1024 * 800, type: 'image/png' }), true)
  assert.strictEqual(validateStorageFile({ size: 1024 * 300, type: 'image/webp' }), true)
})

test('3.4. storageService exports unified interface with correct providers and constants', () => {
  assert.strictEqual(STORAGE_PROVIDERS.SUPABASE, 'supabase')
  assert.strictEqual(STORAGE_PROVIDERS.R2, 'r2')
  assert.strictEqual(KNOWN_BUCKETS.AVATARS, 'avatars')
  assert.strictEqual(KNOWN_BUCKETS.PROFILE_PROOFS, 'profile-proofs')
  assert.strictEqual(STORAGE_LIMITS.AVATAR_MAX_BYTES, 5 * 1024 * 1024)
})

// ----------------------------------------------------------------------------
// GROUP 4: SECRET & CREDENTIAL ISOLATION
// ----------------------------------------------------------------------------
console.log('\n--- GROUP 4: R2 & Cloudflare Credential Isolation ---')

test('4.1. Zero exposure of R2 credentials in frontend source code', () => {
  const forbiddenPatterns = [
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY',
    'VITE_R2_SECRET',
    'VITE_R2_ACCESS_KEY',
  ]

  const scanDirs = ['src', 'public']
  for (const dir of scanDirs) {
    const fullDir = path.join(ROOT, dir)
    if (!fs.existsSync(fullDir)) continue

    function scan(d) {
      const entries = fs.readdirSync(d, { withFileTypes: true })
      for (const ent of entries) {
        const fullPath = path.join(d, ent.name)
        if (ent.isDirectory()) scan(fullPath)
        else if (/\.(js|jsx|ts|tsx|json|html)$/.test(ent.name)) {
          const content = fs.readFileSync(fullPath, 'utf8')
          for (const pattern of forbiddenPatterns) {
            assert(!content.includes(pattern), `Forbidden credential pattern ${pattern} found in ${fullPath}`)
          }
        }
      }
    }
    scan(fullDir)
  }
})

// ----------------------------------------------------------------------------
// GROUP 5: DATABASE PATH STABILITY & OCR STORAGE AUDIT
// ----------------------------------------------------------------------------
console.log('\n--- GROUP 5: Database Path Stability & OCR Storage Integrity ---')

test('5.1. player_identity_evidence stores stable relative path and not temporary signed URLs', () => {
  const evidenceService = fs.readFileSync(path.join(ROOT, 'src', 'services', 'playerEvidenceService.js'), 'utf8')
  assert(evidenceService.includes("storage_path: storagePath,"), 'Must save stable storagePath')
  assert(!evidenceService.includes("storage_path: signedUrl"), 'Must NEVER save signedUrl as storage_path')
})


test('5.3. Documentation file STORAGE_ARCHITECTURE_AND_R2_AUDIT.md exists and covers all criteria', () => {
  const docPath = path.join(ROOT, 'docs', 'STORAGE_ARCHITECTURE_AND_R2_AUDIT.md')
  assert(fs.existsSync(docPath), 'docs/STORAGE_ARCHITECTURE_AND_R2_AUDIT.md must exist')
  const content = fs.readFileSync(docPath, 'utf8')
  assert(content.includes('Category A: Private / Security-Sensitive Evidence'))
  assert(content.includes('Category B: User-Specific Application Media'))
  assert(content.includes('Category C: Public High-Volume Media'))
  assert(content.includes('Category D: Temporary Processing Artifacts'))
  assert(content.includes('Hybrid Model'))
})

console.log('\n==================================================================')
console.log(`PHASE 4 VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`)
console.log('==================================================================\n')

if (failed > 0) {
  process.exit(1)
}
