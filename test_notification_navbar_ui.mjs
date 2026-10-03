// test_notification_navbar_ui.mjs
// Verification of Navbar Notification UI, Actions, Badges & Mobile Architecture

import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

console.log('=== TEST: Navbar Notification Hub UI & Interactions ===\n')

const navbarPath = path.resolve('src/components/common/Navbar.jsx')
const bottomNavPath = path.resolve('src/components/common/BottomNavigation.jsx')

const navbarContent = fs.readFileSync(navbarPath, 'utf8')
const bottomNavContent = fs.readFileSync(bottomNavPath, 'utf8')

// 1. Notification Bell & Unread Badge
console.log('1. Verifying notification bell and unread badge...')
assert.ok(
  navbarContent.includes('title="Alert Feed"'),
  'Desktop Navbar must contain notification bell button'
)
assert.ok(
  navbarContent.includes('unreadNotificationsCount > 0'),
  'Must calculate unread count dynamically'
)
assert.ok(
  navbarContent.includes('animate-pulse'),
  'Unread badge must have cybernetic pulse indicator'
)
console.log('  ✓ Bell button and badge rendering verified')

// 2. Relative Time & Type Icons
console.log('\n2. Verifying relative timestamps and category icons...')
assert.ok(
  navbarContent.includes('formatRelativeTime'),
  'Must include relative time formatting helper'
)
assert.ok(
  navbarContent.includes('getNotificationIcon'),
  'Must include category icon helper'
)
assert.ok(
  navbarContent.includes('Just now') && navbarContent.includes('Yesterday'),
  'formatRelativeTime must support Just now and Yesterday'
)
assert.ok(
  navbarContent.includes('Key') && navbarContent.includes('Trophy') && navbarContent.includes('AlertTriangle'),
  'getNotificationIcon must support Key (room), Trophy (prize), and AlertTriangle (warning)'
)
console.log('  ✓ Relative timestamps and category icon mapping verified')

// 3. Individual Click-to-Read & Safe Navigation
console.log('\n3. Verifying individual click handler and safe router navigation...')
assert.ok(
  navbarContent.includes('handleNotificationClick'),
  'Navbar must define handleNotificationClick'
)
assert.ok(
  navbarContent.includes('markNotificationAsRead(notif.id)'),
  'handleNotificationClick must mark individual notification as read'
)
assert.ok(
  navbarContent.includes('navigate(targetPath)'),
  'handleNotificationClick must navigate when link is present'
)
assert.ok(
  navbarContent.includes("notif.link.startsWith('/')"),
  'Must validate link safety (relative path or origin)'
)
console.log('  ✓ Individual mark-read and safe navigation verified')

// 4. Batch Mark-All-Read
console.log('\n4. Verifying batch mark-all-read action...')
assert.ok(
  navbarContent.includes('markAllNotificationsAsRead(user.id)'),
  'handleMarkAllRead must invoke batch markAllNotificationsAsRead'
)
assert.ok(
  !navbarContent.includes('Promise.all(unread.map'),
  'Must NOT use client-side Promise.all map for mark-all-read'
)
console.log('  ✓ Batch mark-all-read verified')

// 5. Mobile Notification Tray in Hamburger Drawer
console.log('\n5. Verifying mobile drawer notification tray...')
assert.ok(
  navbarContent.includes('mobileNotifOpen'),
  'Navbar must maintain mobile notification drawer state'
)
assert.ok(
  navbarContent.includes('onClick={() => setMobileNotifOpen(!mobileNotifOpen)}'),
  'Mobile drawer must have expandable notifications tray'
)
assert.ok(
  navbarContent.includes('mobile-notif-'),
  'Mobile drawer must render interactive notification cards'
)
console.log('  ✓ Mobile drawer notification tray verified')

// 6. Preservation of BottomNavigation Architecture
console.log('\n6. Verifying BottomNavigation isolation...')
assert.ok(
  !bottomNavContent.includes('Bell'),
  'BottomNavigation must NOT include Bell icon (kept in Navbar/hamburger to avoid overcrowding)'
)
assert.ok(
  !bottomNavContent.includes('notifications'),
  'BottomNavigation must remain isolated from notification state'
)
console.log('  ✓ BottomNavigation architecture preserved cleanly')

console.log('\n✅ All Navbar Notification Hub UI tests passed successfully!')
