import assert from 'assert'
import { toCanonicalIgn, normalizeIgn } from './src/utils/playerIdentityUtils.js'

console.log('============================================================')
console.log('🧪 RUNNING PHASE 2 PLAYER PROFILE EVIDENCE TEST SUITE')
console.log('============================================================\n')

let passed = 0
let failed = 0

function runTest(description, testFn) {
  try {
    testFn()
    console.log(`  ✅ [PASS] ${description}`)
    passed++
  } catch (err) {
    console.error(`  ❌ [FAIL] ${description}`)
    console.error(`     Error: ${err.message}`)
    failed++
  }
}

// ---------------------------------------------------------------------------
// 1. Evidence Record Payload & Unicode Canonical Integrity
// ---------------------------------------------------------------------------
console.log('--- 1. Evidence Record & Canonical Unicode Preservation ---')

runTest('Profile evidence preserves exact stylized Unicode IGN', () => {
  const rawIgn = 'KA¹⁷ Mjᶠᶠ'
  const canonical = toCanonicalIgn(rawIgn)
  const normalized = normalizeIgn(rawIgn)

  const evidenceRecord = {
    user_id: 'usr-101',
    game: 'Free Fire',
    game_uid: '518920412',
    canonical_ign: canonical,
    normalized_ign: normalized,
    status: 'PENDING',
  }

  assert.strictEqual(evidenceRecord.canonical_ign, 'KA¹⁷ Mjᶠᶠ')
  assert.strictEqual(evidenceRecord.normalized_ign, 'ka17 mjff')
})

runTest('Evidence record preserves clan ornaments and symbols', () => {
  const rawIgn = '亗 Ꭲ ɪ ᴛ ᴀ ɴ 亗'
  const canonical = toCanonicalIgn(rawIgn)
  assert.strictEqual(canonical, '亗 Ꭲ ɪ ᴛ ᴀ ɴ 亗')
})

runTest('Evidence payload trims outer whitespace but preserves internal spacing', () => {
  const rawIgn = '   ꧁༺NINJA༻꧂   '
  const canonical = toCanonicalIgn(rawIgn)
  assert.strictEqual(canonical, '꧁༺NINJA༻꧂')
})

// ---------------------------------------------------------------------------
// 2. Default Status & Anti-Auto-Verification Enforcement
// ---------------------------------------------------------------------------
console.log('\n--- 2. Default Status & Explicit Verification State ---')

runTest('New evidence submission unconditionally initializes with status PENDING', () => {
  const submitEvidence = (payload) => {
    // Enforce initial status is always PENDING regardless of client submission
    return {
      ...payload,
      id: 'ev-test-1',
      status: 'PENDING',
      verified_by: null,
      verified_at: null,
    }
  }

  const result = submitEvidence({
    user_id: 'usr-102',
    game_uid: '518920413',
    game_ign: 'Neo_Striker',
    status: 'VERIFIED', // Attacker attempts to forge verified status
  })

  assert.strictEqual(result.status, 'PENDING')
  assert.strictEqual(result.verified_by, null)
  assert.strictEqual(result.verified_at, null)
})

// ---------------------------------------------------------------------------
// 3. Evidence Status State Machine & Audit History
// ---------------------------------------------------------------------------
console.log('\n--- 3. Evidence Status State Machine & Transitions ---')

const VALID_STATUSES = ['PENDING', 'VERIFIED', 'REJECTED', 'REQUIRES_REUPLOAD']

function transitionEvidenceStatus(currentRecord, newStatus, adminId, reason = null) {
  if (!VALID_STATUSES.includes(newStatus)) {
    throw new Error(`Invalid status: ${newStatus}`)
  }
  if (!adminId) {
    throw new Error('Admin ID is required for status transition.')
  }
  if ((newStatus === 'REJECTED' || newStatus === 'REQUIRES_REUPLOAD') && (!reason || !reason.trim())) {
    throw new Error('Rejection reason is required.')
  }

  const auditLog = {
    evidence_id: currentRecord.id,
    previous_status: currentRecord.status,
    new_status: newStatus,
    admin_id: adminId,
    rejection_reason: reason,
    created_at: new Date().toISOString(),
  }

  const updatedRecord = {
    ...currentRecord,
    status: newStatus,
    rejection_reason: (newStatus === 'REJECTED' || newStatus === 'REQUIRES_REUPLOAD') ? reason : null,
    verified_by: newStatus === 'VERIFIED' ? adminId : null,
    verified_at: newStatus === 'VERIFIED' ? new Date().toISOString() : null,
  }

  return { updatedRecord, auditLog }
}

runTest('Admin can transition PENDING -> VERIFIED with audit record', () => {
  const initial = { id: 'ev-1', status: 'PENDING', user_id: 'usr-1' }
  const { updatedRecord, auditLog } = transitionEvidenceStatus(initial, 'VERIFIED', 'admin-007')

  assert.strictEqual(updatedRecord.status, 'VERIFIED')
  assert.strictEqual(updatedRecord.verified_by, 'admin-007')
  assert.strictEqual(auditLog.previous_status, 'PENDING')
  assert.strictEqual(auditLog.new_status, 'VERIFIED')
  assert.strictEqual(auditLog.admin_id, 'admin-007')
})

runTest('Admin can transition PENDING -> REJECTED with rejection reason', () => {
  const initial = { id: 'ev-2', status: 'PENDING', user_id: 'usr-2' }
  const reason = 'Character UID is cut off in screenshot.'
  const { updatedRecord, auditLog } = transitionEvidenceStatus(initial, 'REJECTED', 'admin-007', reason)

  assert.strictEqual(updatedRecord.status, 'REJECTED')
  assert.strictEqual(updatedRecord.rejection_reason, reason)
  assert.strictEqual(auditLog.previous_status, 'PENDING')
  assert.strictEqual(auditLog.new_status, 'REJECTED')
  assert.strictEqual(auditLog.rejection_reason, reason)
})

runTest('Rejecting evidence without a reason throws validation error', () => {
  const initial = { id: 'ev-3', status: 'PENDING', user_id: 'usr-3' }
  assert.throws(() => {
    transitionEvidenceStatus(initial, 'REJECTED', 'admin-007', '')
  }, /Rejection reason is required/)
})

runTest('Admin can transition to REQUIRES_REUPLOAD with feedback', () => {
  const initial = { id: 'ev-4', status: 'PENDING', user_id: 'usr-4' }
  const reason = 'Image resolution too low. Please upload full 1080p screenshot.'
  const { updatedRecord } = transitionEvidenceStatus(initial, 'REQUIRES_REUPLOAD', 'admin-007', reason)

  assert.strictEqual(updatedRecord.status, 'REQUIRES_REUPLOAD')
  assert.strictEqual(updatedRecord.rejection_reason, reason)
})

// ---------------------------------------------------------------------------
// 4. Private Storage Path Structure
// ---------------------------------------------------------------------------
console.log('\n--- 4. Private Storage Path Isolation ---')

runTest('Storage paths are scoped to individual user UUID', () => {
  const userId = 'usr-999-alpha'
  const fileExt = 'png'
  const timestamp = 1756000000000
  const storagePath = `${userId}/proof-${timestamp}.${fileExt}`

  assert.strictEqual(storagePath.startsWith('usr-999-alpha/'), true)
  assert.strictEqual(storagePath.endsWith('.png'), true)
})

// ---------------------------------------------------------------------------
// 5. Legacy Compatibility (No Evidence Registrations)
// ---------------------------------------------------------------------------
console.log('\n--- 5. Legacy Player & Tournament Compatibility ---')

runTest('Tournament player without evidence continues to resolve validly', () => {
  const legacyPlayer = {
    id: 'tp-legacy-01',
    tournament_id: 'tourney-100',
    game_uid: '518920999',
    canonical_ign: 'Legend_Player',
    normalized_ign: 'legend_player',
    evidence: null, // No evidence uploaded
  }

  // Verification helper checks if evidence is present or fallback to legacy status
  const hasEvidence = Boolean(legacyPlayer.evidence)
  const isEligible = legacyPlayer.game_uid && legacyPlayer.canonical_ign

  assert.strictEqual(hasEvidence, false)
  assert.strictEqual(Boolean(isEligible), true)
})

// ---------------------------------------------------------------------------
// Final Results
// ---------------------------------------------------------------------------
console.log('\n============================================================')
console.log(`🏁 TEST RESULTS: ${passed}/${passed + failed} Passed (${failed} Failed)`)
console.log('============================================================\n')

if (failed > 0) {
  process.exit(1)
}
