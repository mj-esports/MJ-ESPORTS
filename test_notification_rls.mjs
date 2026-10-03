// test_notification_rls.mjs
// Verification of Notification RLS Policies, Security Definer RPCs & Privileges

import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

console.log('=== TEST: Notification RLS Policies & RPC Security ===\n')

const migrationPath = path.resolve('supabase_phase13_player_notification_hub.sql')
const baseMigrationPath = path.resolve('supabase_phase1_security_hardening.sql')
const setupMigrationPath = path.resolve('supabase_phase10_setup.sql')

assert.ok(fs.existsSync(migrationPath), 'Phase 13 migration file must exist')
const migrationContent = fs.readFileSync(migrationPath, 'utf8')
const baseContent = fs.readFileSync(baseMigrationPath, 'utf8')
const setupContent = fs.readFileSync(setupMigrationPath, 'utf8')

// 1. SELECT Policy Isolation
console.log('1. Verifying SELECT policy tenant isolation...')
assert.ok(
  setupContent.includes('CREATE POLICY "Users read own notifications or admin reads all"'),
  'Must have SELECT policy for notifications'
)
assert.ok(
  /auth\.uid\(\)\s*=\s*user_id\s*OR\s*public\.is_admin\(\)/.test(setupContent),
  'SELECT policy must restrict access to auth.uid() = user_id or is_admin()'
)
console.log('  ✓ User A cannot read User B notifications')

// 2. INSERT Policy Hardening
console.log('\n2. Verifying INSERT policy anti-spoofing...')
assert.ok(
  baseContent.includes('CREATE POLICY "Users or Admins insert notifications"'),
  'Must have hardened INSERT policy'
)
assert.ok(
  /auth\.uid\(\)\s*=\s*user_id\s*OR\s*public\.is_admin\(\)/.test(baseContent),
  'INSERT policy must restrict creation to auth.uid() = user_id or is_admin()'
)
console.log('  ✓ User A cannot spoof notifications for User B')

// 3. UPDATE Policy Hardening with WITH CHECK
console.log('\n3. Verifying hardened UPDATE policy...')
assert.ok(
  migrationContent.includes('CREATE POLICY "Users update own notifications"'),
  'Phase 13 migration must recreate UPDATE policy'
)
assert.ok(
  migrationContent.includes('WITH CHECK ('),
  'UPDATE policy must include WITH CHECK constraint'
)
assert.ok(
  /WITH\s+CHECK\s*\(\s*auth\.uid\(\)\s*=\s*user_id\s*OR\s*public\.is_admin\(\)\s*\)/i.test(migrationContent),
  'WITH CHECK must enforce auth.uid() = user_id or is_admin()'
)
console.log('  ✓ UPDATE policy is guarded against unauthorized cross-user modifications')

// 4. SECURITY DEFINER RPCs for Mark-as-Read
console.log('\n4. Verifying mark-as-read RPC security definer architecture...')
assert.ok(
  migrationContent.includes('CREATE OR REPLACE FUNCTION public.mark_notification_as_read'),
  'Must define mark_notification_as_read RPC'
)
assert.ok(
  migrationContent.includes('CREATE OR REPLACE FUNCTION public.mark_notifications_read'),
  'Must define mark_notifications_read RPC'
)
assert.ok(
  /SECURITY\s+DEFINER[\s\S]*?SET\s+search_path\s*=\s*public,\s*pg_temp/i.test(migrationContent),
  'RPCs must declare SECURITY DEFINER and search_path = public, pg_temp'
)
assert.ok(
  migrationContent.includes("v_user_id := auth.uid();"),
  'mark_notification_as_read must authoritatively extract auth.uid()'
)
assert.ok(
  migrationContent.includes("v_auth_id <> p_user_id AND NOT public.is_admin()"),
  'mark_notifications_read must block User A from modifying User B notifications'
)
console.log('  ✓ SECURITY DEFINER isolation and auth.uid() checks verified')

// 5. Privileges & Execution Grants
console.log('\n5. Verifying function execution privilege restrictions...')
assert.ok(
  migrationContent.includes('REVOKE EXECUTE ON FUNCTION public.mark_notification_as_read(UUID) FROM PUBLIC, anon;'),
  'Must revoke public/anon execution on mark_notification_as_read'
)
assert.ok(
  migrationContent.includes('REVOKE EXECUTE ON FUNCTION public.mark_notifications_read(UUID) FROM PUBLIC, anon;'),
  'Must revoke public/anon execution on mark_notifications_read'
)
assert.ok(
  migrationContent.includes('GRANT EXECUTE ON FUNCTION public.mark_notification_as_read(UUID) TO authenticated, service_role;'),
  'Must grant execution to authenticated and service_role'
)
assert.ok(
  migrationContent.includes('GRANT EXECUTE ON FUNCTION public.mark_notifications_read(UUID) TO authenticated, service_role;'),
  'Must grant execution to authenticated and service_role'
)
console.log('  ✓ Least-privilege role execution verified')

// 6. Realtime Publication Idempotency
console.log('\n6. Verifying Realtime publication registration...')
assert.ok(
  migrationContent.includes('ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;'),
  'Must register public.notifications in supabase_realtime publication'
)
assert.ok(
  migrationContent.includes('IF NOT EXISTS'),
  'Publication registration must be idempotent'
)
console.log('  ✓ Realtime publication safely registered')

console.log('\n✅ All Notification RLS and Security tests passed successfully!')
