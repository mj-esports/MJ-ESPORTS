/**
 * MJ ESPORTS — Phase 4: Room Credentials & 10-Digit Player Registration Automated Test Suite
 *
 * Tests:
 * 1. Room ID Validation (Numbers only, no letters, no spaces, no symbols, no email addresses)
 * 2. Room Password Validation (Numbers only, independent PIN)
 * 3. Independent Random Numeric Credential Generators
 * 4. Player Game UID Validation (Strictly 10 numeric digits, preserves leading zeroes)
 * 5. Player Phone Number Validation (Strictly 10 numeric digits, no embedded +91)
 * 6. Digit Sanitizer (Strips non-digits, preserves leading zeroes, enforces maxLength)
 */

import {
  sanitizeDigitsOnly,
  isValidGameUid,
  isValidPhoneNumber,
  isValidRoomId,
  isValidRoomPassword,
  generateRandomNumericRoomId,
  generateRandomNumericRoomPassword,
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
console.log('🧪 RUNNING PHASE 4: ROOM CREDENTIALS & 10-DIGIT REGISTRATION TESTS')
console.log('============================================================\n')

// -------------------------------------------------------------
// 1. ROOM ID (NUMBERS ONLY) TESTS
// -------------------------------------------------------------
console.log('--- 1. Room ID (Numbers Only) Validation ---')

assert(isValidRoomId('5839174261'), 'Accepts 10-digit numeric Room ID: 5839174261')
assert(isValidRoomId('9845120'), 'Accepts 7-digit numeric Room ID: 9845120')
assert(isValidRoomId('123456789012345'), 'Accepts long numeric Room ID: 123456789012345')

assert(!isValidRoomId('MJES-7K4P9X'), 'Rejects alphanumeric Room ID: MJES-7K4P9X')
assert(!isValidRoomId('mjesports.team@gmail.com'), 'Rejects admin email as Room ID: mjesports.team@gmail.com')
assert(!isValidRoomId('admin@mjesports.pro'), 'Rejects admin email address: admin@mjesports.pro')
assert(!isValidRoomId('ROOM-583917'), 'Rejects prefixed Room ID: ROOM-583917')
assert(!isValidRoomId('5839 174261'), 'Rejects Room ID with spaces: 5839 174261')
assert(!isValidRoomId('5839174261#'), 'Rejects Room ID with special chars: 5839174261#')
assert(!isValidRoomId(''), 'Rejects empty Room ID')
assert(!isValidRoomId(null), 'Rejects null Room ID')

// -------------------------------------------------------------
// 2. ROOM PASSWORD (NUMBERS ONLY) TESTS
// -------------------------------------------------------------
console.log('\n--- 2. Room Password (Numbers Only) Validation ---')

assert(isValidRoomPassword('84920173'), 'Accepts 8-digit numeric Room Password: 84920173')
assert(isValidRoomPassword('556677'), 'Accepts 6-digit numeric Room Password: 556677')
assert(isValidRoomPassword('1234'), 'Accepts 4-digit numeric Room Password: 1234')

assert(!isValidRoomPassword('AdminPass123!'), 'Rejects alphanumeric admin password')
assert(!isValidRoomPassword('secret_pwd'), 'Rejects symbols/letters password')
assert(!isValidRoomPassword('12 34 56'), 'Rejects password with spaces')
assert(!isValidRoomPassword(''), 'Rejects empty Room Password')
assert(!isValidRoomPassword(null), 'Rejects null Room Password')

// -------------------------------------------------------------
// 3. INDEPENDENT RANDOM NUMERIC CREDENTIAL GENERATORS
// -------------------------------------------------------------
console.log('\n--- 3. Independent Random Numeric Credential Generators ---')

const genRoomId1 = generateRandomNumericRoomId(10)
const genRoomId2 = generateRandomNumericRoomId(10)

assert(/^[0-9]{10}$/.test(genRoomId1), `Generated Room ID is exactly 10 digits: ${genRoomId1}`)
assert(/^[0-9]{10}$/.test(genRoomId2), `Generated Room ID is exactly 10 digits: ${genRoomId2}`)
assert(genRoomId1 !== genRoomId2, 'Subsequent generated Room IDs are random and unique')
assert(!genRoomId1.includes('@'), 'Generated Room ID contains no email characters')

const genPin1 = generateRandomNumericRoomPassword(8)
const genPin2 = generateRandomNumericRoomPassword(8)

assert(/^[0-9]{8}$/.test(genPin1), `Generated Room Password PIN is exactly 8 digits: ${genPin1}`)
assert(/^[0-9]{8}$/.test(genPin2), `Generated Room Password PIN is exactly 8 digits: ${genPin2}`)
assert(genPin1 !== genPin2, 'Subsequent generated Room PINs are random and unique')

// -------------------------------------------------------------
// 4. PLAYER GAME UID (STRICTLY 10 DIGITS, STRING PRESERVED)
// -------------------------------------------------------------
console.log('\n--- 4. Player Game UID (Strictly 10 Digits) ---')

assert(isValidGameUid('5189204120'), 'Accepts 10-digit UID: 5189204120')
assert(isValidGameUid('0123456789'), 'Accepts 10-digit UID with leading zero: 0123456789')
assert(isValidGameUid('0000000001'), 'Accepts 10-digit UID with multiple leading zeroes: 0000000001')

// Rejections
assert(!isValidGameUid('518920412'), 'Rejects 9-digit UID (too short): 518920412')
assert(!isValidGameUid('12345678'), 'Rejects 8-digit UID (too short): 12345678')
assert(!isValidGameUid('51892041201'), 'Rejects 11-digit UID (too long): 51892041201')
assert(!isValidGameUid('UID-5189204120'), 'Rejects prefixed UID: UID-5189204120')
assert(!isValidGameUid('518920412A'), 'Rejects alphanumeric UID: 518920412A')
assert(!isValidGameUid('51892 04120'), 'Rejects UID with whitespace: 51892 04120')
assert(!isValidGameUid(''), 'Rejects empty UID')
assert(!isValidGameUid(null), 'Rejects null UID')

// -------------------------------------------------------------
// 5. PLAYER PHONE NUMBER (STRICTLY 10 DIGITS, NO EMBEDDED +91)
// -------------------------------------------------------------
console.log('\n--- 5. Player Phone Number (Strictly 10 Digits) ---')

assert(isValidPhoneNumber('9876543210'), 'Accepts valid 10-digit Indian mobile number: 9876543210')
assert(isValidPhoneNumber('8765432109'), 'Accepts valid 10-digit mobile number: 8765432109')

// Rejections
assert(!isValidPhoneNumber('+919876543210'), 'Rejects embedded +91 inside the input field: +919876543210')
assert(!isValidPhoneNumber('+91 98765 43210'), 'Rejects formatted +91 with spaces: +91 98765 43210')
assert(!isValidPhoneNumber('98765 43210'), 'Rejects phone number with spaces: 98765 43210')
assert(!isValidPhoneNumber('987654321'), 'Rejects 9-digit phone number: 987654321')
assert(!isValidPhoneNumber('98765432101'), 'Rejects 11-digit phone number: 98765432101')
assert(!isValidPhoneNumber('987654321a'), 'Rejects phone number with letters')
assert(!isValidPhoneNumber(''), 'Rejects empty phone number')
assert(!isValidPhoneNumber(null), 'Rejects null phone number')

// -------------------------------------------------------------
// 6. SANITIZE DIGITS ONLY TESTS (STRIP, LEADING ZERO, MAXLENGTH)
// -------------------------------------------------------------
console.log('\n--- 6. sanitizeDigitsOnly Helper Function ---')

assertEqual(sanitizeDigitsOnly('5189204120'), '5189204120', 'Preserves clean 10-digit string')
assertEqual(sanitizeDigitsOnly('0123456789'), '0123456789', 'Preserves leading zeroes as string')
assertEqual(sanitizeDigitsOnly('UID-0123456789'), '0123456789', 'Strips non-numeric prefix and keeps leading zero')
assertEqual(sanitizeDigitsOnly('+91 98765 43210', 10), '9198765432', 'Strips spaces and caps at 10 digits')
assertEqual(sanitizeDigitsOnly('98765432109999', 10), '9876543210', 'Caps overflow paste at 10 digits')
assertEqual(sanitizeDigitsOnly('abc', 10), '', 'Returns empty string if no digits present')
assertEqual(sanitizeDigitsOnly(null, 10), '', 'Handles null safely')

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
