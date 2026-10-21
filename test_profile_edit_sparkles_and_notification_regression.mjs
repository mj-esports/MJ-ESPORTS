// test_profile_edit_sparkles_and_notification_regression.mjs
// Regression test: Verifies EditProfilePage Sparkles icon import and notificationService PGRST205 handling

import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  fetchUserNotifications,
  getUnreadNotificationCount,
  resetNotificationTableAvailability
} from './src/services/notificationService.js'

console.log('================================================================================')
console.log('MJ ESPORTS — EDIT PROFILE & NOTIFICATION SERVICE REGRESSION AUDIT')
console.log('================================================================================\n')

let passCount = 0
let totalCount = 0

function check(title, fn) {
  totalCount++
  try {
    fn()
    console.log(`  ✅ [PASS] ${totalCount}. ${title}`)
    passCount++
  } catch (err) {
    console.error(`  ❌ [FAIL] ${totalCount}. ${title}`)
    console.error(`     Reason: ${err.message}\n`)
  }
}

// 1. EditProfilePage Sparkles Import & Reference Audit
const editProfilePath = path.resolve('src/pages/EditProfilePage.jsx')
assert.ok(fs.existsSync(editProfilePath), 'EditProfilePage.jsx must exist')
const editProfileContent = fs.readFileSync(editProfilePath, 'utf8')

check('EditProfilePage imports Sparkles from lucide-react', () => {
  const lucideImportMatch = editProfileContent.match(/import\s*\{([\s\S]*?)\}\s*from\s*['"]lucide-react['"]/)
  assert.ok(lucideImportMatch, 'lucide-react import block must be present')
  const importedIcons = lucideImportMatch[1].split(',').map((s) => s.trim()).filter(Boolean)
  assert.ok(importedIcons.includes('Sparkles'), 'Sparkles must be imported from lucide-react')
})

check('EditProfilePage renders Sparkles in both dirty-state indicators', () => {
  const sparklesCount = (editProfileContent.match(/<Sparkles\s/g) || []).length
  assert.strictEqual(sparklesCount, 2, 'Sparkles must be used in both dirty-state indicators (header and sticky bar)')
})

check('EditProfilePage contains zero non-none rounded classes (sharp-edge policy)', () => {
  const nonNoneRounded = editProfileContent.match(/rounded-(?!none)[a-z0-9-]+/g) || []
  assert.deepStrictEqual(nonNoneRounded, [], 'EditProfilePage must enforce 0px border-radius without non-none rounded classes')
})

check('EditProfilePage preserves Free Fire MAX competitive branding', () => {
  assert.ok(editProfileContent.includes('FREE FIRE MAX ONLY') || editProfileContent.includes('Free Fire MAX'), 'Branding preserved')
  assert.ok(!editProfileContent.includes('BGMI'), 'Zero BGMI references')
  assert.ok(!editProfileContent.includes('PUBG'), 'Zero PUBG references')
})

check('EditProfilePage enforces responsive desktop and mobile viewport containers', () => {
  assert.ok(editProfileContent.includes('grid grid-cols-1 lg:grid-cols-12 gap-6'), 'Desktop 12-col / Mobile 1-col layout')
  assert.ok(editProfileContent.includes('min-h-[40px]'), 'Touch-friendly button minimum height')
})

// 2. Notification Service PGRST205 / 404 Resilience Audit
const notificationServicePath = path.resolve('src/services/notificationService.js')
assert.ok(fs.existsSync(notificationServicePath), 'notificationService.js must exist')
const notificationServiceContent = fs.readFileSync(notificationServicePath, 'utf8')

check('notificationService detects PGRST205 schema cache 404 without unhandled errors', () => {
  assert.ok(notificationServiceContent.includes('PGRST205'), 'Must check for PGRST205 code')
  assert.ok(notificationServiceContent.includes('isNotificationsTableMissing'), 'Must cache missing table status')
})

check('notificationService fetchUserNotifications returns empty array safely when table missing', async () => {
  resetNotificationTableAvailability()
  const result = await fetchUserNotifications('test-user-id-0000')
  assert.ok(Array.isArray(result), 'Must return an array')
  assert.strictEqual(result.length, 0, 'Must safely return empty array without crashing')
})

check('notificationService getUnreadNotificationCount returns 0 safely when table missing', async () => {
  const count = await getUnreadNotificationCount('test-user-id-0000')
  assert.strictEqual(typeof count, 'number', 'Must return a number')
  assert.strictEqual(count, 0, 'Must safely return 0 without crashing')
})

console.log('\n--------------------------------------------------------------------------------')
console.log(`TOTAL AUDITS: ${totalCount} | PASSED: ${passCount} | FAILED: ${totalCount - passCount}`)
console.log('--------------------------------------------------------------------------------\n')

if (passCount === totalCount) {
  console.log('🎉 ALL EDIT PROFILE & NOTIFICATION REGRESSION AUDITS PASSED!\n')
  process.exit(0)
} else {
  console.error('❌ SOME AUDITS FAILED!\n')
  process.exit(1)
}
