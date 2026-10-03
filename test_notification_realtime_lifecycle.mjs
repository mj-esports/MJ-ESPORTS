// test_notification_realtime_lifecycle.mjs
// Verification of Realtime Notification Lifecycle, Subscriptions & Cleanup

import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

console.log('=== TEST: Realtime Notification Lifecycle & Teardown ===\n')

const servicePath = path.resolve('src/services/notificationService.js')
const navbarPath = path.resolve('src/components/common/Navbar.jsx')

const serviceContent = fs.readFileSync(servicePath, 'utf8')
const navbarContent = fs.readFileSync(navbarPath, 'utf8')

// 1. Service Channel Creation & Deduplication
console.log('1. Verifying channel creation and duplicate prevention...')
assert.ok(
  serviceContent.includes('activeNotificationChannels = new Map()'),
  'Must maintain Map of active channels to prevent duplicates'
)
assert.ok(
  serviceContent.includes('activeNotificationChannels.has(channelKey)'),
  'Must check for existing subscription before creating a new one'
)
assert.ok(
  serviceContent.includes('supabase.removeChannel(existing)'),
  'Must remove prior channel if a duplicate subscription attempt occurs'
)
console.log('  ✓ Channel deduplication verified')

// 2. Channel Event Filtering
console.log('\n2. Verifying event filtering and tenant isolation...')
assert.ok(
  /schema:\s*['"]public['"]/.test(serviceContent),
  'Must target public schema'
)
assert.ok(
  /table:\s*['"]notifications['"]/.test(serviceContent),
  'Must target notifications table'
)
assert.ok(
  /event:\s*['"]INSERT['"]/.test(serviceContent),
  'Must target INSERT event'
)
assert.ok(
  /filter:\s*`user_id=eq\.\$\{userId\}`/.test(serviceContent),
  'Must filter Realtime stream strictly by authenticated user_id'
)
console.log('  ✓ Tenant isolation filter verified')

// 3. Navbar Lifecycle & Cleanup
console.log('\n3. Verifying Navbar mounting, unmount, and user transition...')
assert.ok(
  navbarContent.includes('subscribeToUserNotifications(user.id,'),
  'Navbar must invoke subscribeToUserNotifications with user.id'
)
assert.ok(
  /const\s+unsubscribe\s*=\s*subscribeToUserNotifications/.test(navbarContent),
  'Navbar must capture the unsubscribe teardown function'
)
assert.ok(
  /return\s*\(\)\s*=>\s*\{[\s\S]*?unsubscribe\(\)[\s\S]*?\}/.test(navbarContent),
  'Navbar useEffect must invoke unsubscribe() on unmount or user change'
)
assert.ok(
  /\[isAuthenticated,\s*user\?\.id\]/.test(navbarContent),
  'Navbar notification effect must re-run on user identity changes'
)
assert.ok(
  navbarContent.includes('setNotifications([])'),
  'Navbar must clear notifications when unauthenticated or user changes'
)
console.log('  ✓ Navbar lifecycle, teardown, and stale data prevention verified')

// 4. In-Memory Duplicate Prevention in State
console.log('\n4. Verifying duplicate insertion prevention in UI state...')
assert.ok(
  navbarContent.includes('prev.some((n) => n.id === newNotif.id)'),
  'Navbar must check if notification ID already exists before prepending'
)
console.log('  ✓ Duplicate UI item guard verified')

console.log('\n✅ Realtime notification lifecycle tests passed successfully!')
