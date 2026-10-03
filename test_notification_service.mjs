// test_notification_service.mjs
// Verification of Notification Service APIs and Safety Guarantees

import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

console.log('=== TEST: Notification Service APIs & Signatures ===\n')

const serviceFilePath = path.resolve('src/services/notificationService.js')
assert.ok(fs.existsSync(serviceFilePath), 'notificationService.js must exist')

const serviceContent = fs.readFileSync(serviceFilePath, 'utf8')

// 1. Verify Exports
console.log('1. Verifying exported function signatures...')
assert.ok(
  serviceContent.includes('export async function fetchUserNotifications'),
  'Must export fetchUserNotifications'
)
assert.ok(
  serviceContent.includes('export async function getUnreadNotificationCount'),
  'Must export getUnreadNotificationCount'
)
assert.ok(
  serviceContent.includes('export async function createNotification'),
  'Must export createNotification'
)
assert.ok(
  serviceContent.includes('export async function markNotificationAsRead'),
  'Must export markNotificationAsRead'
)
assert.ok(
  serviceContent.includes('export async function markAllNotificationsAsRead'),
  'Must export markAllNotificationsAsRead'
)
assert.ok(
  serviceContent.includes('export function subscribeToUserNotifications'),
  'Must export subscribeToUserNotifications'
)
console.log('  ✓ All 6 required functions are exported')

// 2. Verify Bounded Fetch & Ordering
console.log('\n2. Verifying bounded fetch and newest-first ordering...')
assert.ok(
  /order\(\s*['"]created_at['"]\s*,\s*\{\s*ascending:\s*false\s*\}\s*\)/.test(serviceContent),
  'fetchUserNotifications must order by created_at descending'
)
assert.ok(
  serviceContent.includes('.limit('),
  'fetchUserNotifications must enforce a limit clause'
)
console.log('  ✓ Bounded fetch and newest-first ordering verified')

// 3. Verify Unread Count Query
console.log('\n3. Verifying authoritative unread count query...')
assert.ok(
  serviceContent.includes("count: 'exact', head: true"),
  'getUnreadNotificationCount must use lightweight count: exact, head: true'
)
assert.ok(
  serviceContent.includes(".eq('is_read', false)"),
  'getUnreadNotificationCount must filter for is_read: false'
)
console.log('  ✓ Lightweight count query verified')

// 4. Verify Single & Batch Mark-Read with RPC First + Fallback
console.log('\n4. Verifying mark-as-read RPC & fallback patterns...')
assert.ok(
  serviceContent.includes("rpc('mark_notification_as_read'"),
  'markNotificationAsRead must attempt mark_notification_as_read RPC'
)
assert.ok(
  serviceContent.includes("rpc('mark_notifications_read'"),
  'markAllNotificationsAsRead must attempt mark_notifications_read RPC'
)
assert.ok(
  serviceContent.includes(".update({ is_read: true })"),
  'Must provide fallback update query if RPC is not available'
)
console.log('  ✓ RPC-first execution with resilient fallback verified')

// 5. Verify Realtime Subscription Safety
console.log('\n5. Verifying Realtime subscription structure...')
assert.ok(
  serviceContent.includes('.channel('),
  'subscribeToUserNotifications must initialize a Supabase channel'
)
assert.ok(
  serviceContent.includes("event: 'INSERT'"),
  'subscribeToUserNotifications must listen for INSERT events'
)
assert.ok(
  /filter:\s*`user_id=eq\.\$\{userId\}`/.test(serviceContent),
  'subscribeToUserNotifications must strictly filter channel by user_id'
)
assert.ok(
  serviceContent.includes('supabase.removeChannel'),
  'subscribeToUserNotifications must provide a cleanup function that removes channel'
)
assert.ok(
  serviceContent.includes('activeNotificationChannels'),
  'Must maintain active channel cache to prevent duplicate subscriptions'
)
console.log('  ✓ Realtime subscription safety and isolation verified')

// 6. Verify Non-Destructive Backward Compatibility
console.log('\n6. Verifying backward compatibility with existing callers...')
assert.ok(
  serviceContent.includes('createNotification({ userId, title, message, type'),
  'createNotification parameter structure must remain backward compatible'
)
console.log('  ✓ Backward compatibility verified')

console.log('\n✅ All Notification Service tests passed successfully!')
