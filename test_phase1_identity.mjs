/**
 * MJ ESPORTS — Phase 1: Player Identity Foundation Automated Test Suite
 * 
 * Tests:
 * 1. toCanonicalIgn (preserves Unicode, subscript, clan symbols, case, trims whitespace)
 * 2. normalizeIgn (Unicode NFKC, lowercase, whitespace collapse)
 * 3. isValidIgn (Unicode & length checks)
 * 4. buildRosterArray (structured player identity records)
 * 5. Solo Roster validation (Captain UID + IGN)
 * 6. Duo Roster validation (Captain + Teammate 1 UID + IGN)
 * 7. Squad Roster validation (Captain + 3 Teammates UID + IGN)
 * 8. Duplicate UID rejection (Intra-roster duplicate UID detection)
 * 9. Duplicate IGN allowance (Same IGN with different UIDs must succeed)
 * 10. Roster size validation (Exact active player count enforcement)
 */

import {
  toCanonicalIgn,
  normalizeIgn,
  isValidIgn,
  buildRosterArray,
} from './src/utils/playerIdentityUtils.js'
import {
  isValidGameUid,
} from './src/utils/validationUtils.js'

let totalTests = 0
let passedTests = 0
let failedTests = 0

function assert(condition, message) {
  totalTests++
  if (condition) {
    passedTests++
    console.log(`  ✅ [PASS] ${message}`)
  } else {
    failedTests++
    console.error(`  ❌ [FAIL] ${message}`)
  }
}

function assertEqual(actual, expected, message) {
  totalTests++
  if (actual === expected) {
    passedTests++
    console.log(`  ✅ [PASS] ${message}`)
  } else {
    failedTests++
    console.error(`  ❌ [FAIL] ${message} (Expected: "${expected}", Received: "${actual}")`)
  }
}

console.log('\n============================================================')
console.log('🧪 RUNNING PHASE 1 PLAYER IDENTITY FOUNDATION TEST SUITE')
console.log('============================================================\n')

// -------------------------------------------------------------
// 1. CANONICAL IGN & UNICODE PRESERVATION TESTS
// -------------------------------------------------------------
console.log('--- 1. Canonical IGN & Unicode Preservation ---')

const unicodeIgn1 = '  KA¹⁷ Mjᶠᶠ  '
assertEqual(toCanonicalIgn(unicodeIgn1), 'KA¹⁷ Mjᶠᶠ', 'toCanonicalIgn trims whitespace and preserves superscript')

const unicodeIgn2 = ' 亗 Ꭲ ɪ ᴛ ᴀ ɴ 亗 '
assertEqual(toCanonicalIgn(unicodeIgn2), '亗 Ꭲ ɪ ᴛ ᴀ ɴ 亗', 'toCanonicalIgn preserves special fonts and clan symbols')

const unicodeIgn3 = '꧁༺NINJA༻꧂'
assertEqual(toCanonicalIgn(unicodeIgn3), '꧁༺NINJA༻꧂', 'toCanonicalIgn preserves decorative Unicode ornaments')

const spacingIgn = 'V²   |    ᴀ ᴋ ᴀ ʏ'
assertEqual(toCanonicalIgn(spacingIgn), 'V² | ᴀ ᴋ ᴀ ʏ', 'toCanonicalIgn collapses redundant internal whitespace')

// -------------------------------------------------------------
// 2. NORMALIZED IGN DETERMINISM TESTS
// -------------------------------------------------------------
console.log('\n--- 2. Normalized IGN Determinism ---')

assertEqual(normalizeIgn('  KA¹⁷ Mjᶠᶠ  '), 'ka17 mjff', 'normalizeIgn converts superscripts to base digits and lowercases')
assertEqual(normalizeIgn('SHADOW'), 'shadow', 'normalizeIgn lowercases plain ASCII')
assertEqual(normalizeIgn('  Shadow   King  '), 'shadow king', 'normalizeIgn normalizes spacing and case')
assertEqual(normalizeIgn(''), '', 'normalizeIgn handles empty string safely')
assertEqual(normalizeIgn(null), '', 'normalizeIgn handles null safely')

// -------------------------------------------------------------
// 3. IGN VALIDATION TESTS
// -------------------------------------------------------------
console.log('\n--- 3. IGN Validation (Unicode & Length Allowance) ---')

assert(isValidIgn('KA¹⁷ Mjᶠᶠ'), 'isValidIgn accepts stylized Unicode IGN')
assert(isValidIgn('亗 Ꭲ ɪ ᴛ ᴀ ɴ 亗'), 'isValidIgn accepts clan symbol IGN')
assert(isValidIgn('A'), 'isValidIgn accepts single character IGN')
assert(isValidIgn('Player_12345'), 'isValidIgn accepts standard alphanumeric IGN')
assert(!isValidIgn(''), 'isValidIgn rejects empty string')
assert(!isValidIgn('   '), 'isValidIgn rejects whitespace-only string')
assert(!isValidIgn('a'.repeat(31)), 'isValidIgn rejects string longer than 30 characters')
assert(!isValidIgn(null), 'isValidIgn rejects null')

// -------------------------------------------------------------
// 4. ROSTER ARRAY BUILDER TESTS
// -------------------------------------------------------------
console.log('\n--- 4. Roster Array Builder ---')

const squadRoster = buildRosterArray({
  captainUid: '100000001',
  captainIgn: 'KA¹⁷ Mjᶠᶠ',
  teammateUids: ['100000002', '100000003', '100000004'],
  teammateIgns: ['亗 Ꭲ ɪ ᴛ ᴀ ɴ 亗', '꧁༺NINJA༻꧂', 'V² | ᴀ ᴋ ᴀ ʏ'],
  substituteUids: ['100000005'],
  substituteIgns: ['Reserve_One'],
})

assertEqual(squadRoster.length, 5, 'Roster builder produces 5 total roster members (1 Cap + 3 Members + 1 Sub)')
assertEqual(squadRoster[0].role, 'Captain', 'Roster member 1 is Captain')
assertEqual(squadRoster[0].canonicalIgn, 'KA¹⁷ Mjᶠᶠ', 'Captain canonical IGN preserved')
assertEqual(squadRoster[0].normalizedIgn, 'ka17 mjff', 'Captain normalized IGN computed')
assertEqual(squadRoster[1].role, 'Member', 'Roster member 2 is Member')
assertEqual(squadRoster[1].canonicalIgn, '亗 Ꭲ ɪ ᴛ ᴀ ɴ 亗', 'Teammate 1 canonical IGN preserved')
assertEqual(squadRoster[4].role, 'Substitute', 'Roster member 5 is Substitute')

// -------------------------------------------------------------
// 5. SOLO, DUO, SQUAD ROSTER INTEGRITY VALIDATION
// -------------------------------------------------------------
console.log('\n--- 5. Solo, Duo, Squad Roster Integrity ---')

function validateRosterSubmission({ mode, captainUid, captainIgn, teammateUids = [], teammateIgns = [] }) {
  const errors = []
  if (!captainUid || !isValidGameUid(captainUid)) errors.push('INVALID_CAPTAIN_UID')
  if (!captainIgn || !isValidIgn(captainIgn)) errors.push('INVALID_CAPTAIN_IGN')

  const reqTeammates = mode === 'Solo' ? 0 : mode === 'Duo' ? 1 : mode === 'Squad' ? 3 : 0
  if (teammateUids.length !== reqTeammates) {
    errors.push('INVALID_ROSTER_SIZE')
  }

  for (let i = 0; i < reqTeammates; i++) {
    const uid = teammateUids[i]
    const ign = teammateIgns[i]
    if (!uid || !isValidGameUid(uid)) errors.push(`INVALID_TEAMMATE_${i + 1}_UID`)
    if (!ign || !isValidIgn(ign)) errors.push(`INVALID_TEAMMATE_${i + 1}_IGN`)
  }

  // Intra-roster duplicate UID check
  const allUids = [captainUid, ...teammateUids].filter(Boolean)
  const uniqueUids = new Set(allUids)
  if (uniqueUids.size !== allUids.length) {
    errors.push('DUPLICATE_UID')
  }

  return { isValid: errors.length === 0, errors }
}

// Solo Test
const soloValid = validateRosterSubmission({
  mode: 'Solo',
  captainUid: '518920412',
  captainIgn: 'Solo_Sniper',
})
assert(soloValid.isValid, 'Solo registration with Captain UID + IGN is valid')

// Duo Test
const duoValid = validateRosterSubmission({
  mode: 'Duo',
  captainUid: '518920412',
  captainIgn: 'Duo_Lead',
  teammateUids: ['518920413'],
  teammateIgns: ['Duo_Mate'],
})
assert(duoValid.isValid, 'Duo registration with Captain + Teammate 1 UID & IGN is valid')

const duoMissingIgn = validateRosterSubmission({
  mode: 'Duo',
  captainUid: '518920412',
  captainIgn: 'Duo_Lead',
  teammateUids: ['518920413'],
  teammateIgns: [''],
})
assert(!duoMissingIgn.isValid && duoMissingIgn.errors.includes('INVALID_TEAMMATE_1_IGN'), 'Duo registration fails if Teammate 1 IGN is missing')

// Squad Test
const squadValid = validateRosterSubmission({
  mode: 'Squad',
  captainUid: '518920412',
  captainIgn: 'Squad_Leader',
  teammateUids: ['518920413', '518920414', '518920415'],
  teammateIgns: ['Teammate_A', 'Teammate_B', 'Teammate_C'],
})
assert(squadValid.isValid, 'Squad registration with 4 complete UID + IGN pairs is valid')

const squadIncomplete = validateRosterSubmission({
  mode: 'Squad',
  captainUid: '518920412',
  captainIgn: 'Squad_Leader',
  teammateUids: ['518920413', '518920414'],
  teammateIgns: ['Teammate_A', 'Teammate_B'],
})
assert(!squadIncomplete.isValid && squadIncomplete.errors.includes('INVALID_ROSTER_SIZE'), 'Squad registration fails if only 2 teammates provided instead of 3')

// -------------------------------------------------------------
// 6. DUPLICATE UID REJECTION VS DUPLICATE IGN ALLOWANCE
// -------------------------------------------------------------
console.log('\n--- 6. Duplicate UID Rejection & Duplicate IGN Allowance ---')

const duplicateUidRoster = validateRosterSubmission({
  mode: 'Duo',
  captainUid: '518920412',
  captainIgn: 'Player_Alpha',
  teammateUids: ['518920412'], // Identical to captain UID
  teammateIgns: ['Player_Beta'],
})
assert(!duplicateUidRoster.isValid && duplicateUidRoster.errors.includes('DUPLICATE_UID'), 'Duplicate UID in same roster is rejected')

const duplicateIgnRoster = validateRosterSubmission({
  mode: 'Duo',
  captainUid: '518920412',
  captainIgn: 'Shadow',
  teammateUids: ['518920413'], // Different UID
  teammateIgns: ['Shadow'],     // Identical IGN
})
assert(duplicateIgnRoster.isValid, 'Identical IGN with different UIDs is permitted (IGN is not primary key)')

// -------------------------------------------------------------
// FINAL REPORT
// -------------------------------------------------------------
console.log('\n============================================================')
console.log(`🏁 TEST RESULTS: ${passedTests}/${totalTests} Passed (${failedTests} Failed)`)
console.log('============================================================\n')

if (failedTests > 0) {
  process.exit(1)
} else {
  process.exit(0)
}
