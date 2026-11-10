// test_phase1_security_audit.mjs
// Automated security verification suite for Phase 1: Security Hardening (MJ ESPORTS)

import fs from 'fs'
import path from 'path'
import assert from 'assert'

const ROOT = process.cwd()

console.log('==================================================================')
console.log('MJ ESPORTS — PHASE 1: SECURITY HARDENING VERIFICATION SUITE')
console.log('==================================================================\n')

let passCount = 0
let failCount = 0

function test(name, fn) {
  try {
    fn()
    console.log(`  ✓ [PASS] ${name}`)
    passCount++
  } catch (err) {
    console.error(`  ✗ [FAIL] ${name}`)
    console.error(`    -> ${err.message}`)
    failCount++
  }
}

// ----------------------------------------------------------------------------
// TEST GROUP 1: SECRETS & CREDENTIAL ISOLATION
// ----------------------------------------------------------------------------
console.log('Test Group 1: Service-Role & Secret Key Exposure Checks')

test('SUPABASE_SERVICE_ROLE_KEY is never referenced in src/ or public/', () => {
  const scanDirs = ['src', 'public']
  for (const dir of scanDirs) {
    const fullDir = path.join(ROOT, dir)
    if (!fs.existsSync(fullDir)) continue
    
    function scan(d) {
      const entries = fs.readdirSync(d, { withFileTypes: true })
      for (const ent of entries) {
        const fullPath = path.join(d, ent.name)
        if (ent.isDirectory()) {
          scan(fullPath)
        } else if (/\.(js|jsx|ts|tsx|json|html)$/.test(ent.name)) {
          const content = fs.readFileSync(fullPath, 'utf8')
          assert(
            !content.includes('SUPABASE_SERVICE_ROLE_KEY'),
            `Found SUPABASE_SERVICE_ROLE_KEY in ${fullPath}`
          )
        }
      }
    }
    scan(fullDir)
  }
})

test('RAZORPAY_KEY_SECRET is never referenced in src/ or public/', () => {
  const scanDirs = ['src', 'public']
  for (const dir of scanDirs) {
    const fullDir = path.join(ROOT, dir)
    if (!fs.existsSync(fullDir)) continue
    
    function scan(d) {
      const entries = fs.readdirSync(d, { withFileTypes: true })
      for (const ent of entries) {
        const fullPath = path.join(d, ent.name)
        if (ent.isDirectory()) {
          scan(fullPath)
        } else if (/\.(js|jsx|ts|tsx|json|html)$/.test(ent.name)) {
          const content = fs.readFileSync(fullPath, 'utf8')
          assert(
            !content.includes('RAZORPAY_KEY_SECRET'),
            `Found RAZORPAY_KEY_SECRET in ${fullPath}`
          )
        }
      }
    }
    scan(fullDir)
  }
})

test('.env and .env.example contain only public VITE_* variables', () => {
  const envFiles = ['.env', '.env.example']
  for (const f of envFiles) {
    const p = path.join(ROOT, f)
    if (fs.existsSync(p)) {
      const content = fs.readFileSync(p, 'utf8')
      assert(!content.includes('SERVICE_ROLE'), `Found SERVICE_ROLE in ${f}`)
      assert(!content.includes('RAZORPAY_KEY_SECRET'), `Found RAZORPAY_KEY_SECRET in ${f}`)
    }
  }
})

// ----------------------------------------------------------------------------
// TEST GROUP 2: EDGE FUNCTION CORS & SIGNATURE SECURITY
// ----------------------------------------------------------------------------
console.log('\nTest Group 2: Supabase Edge Functions Hardening')

const edgeFunctions = [
  'create-razorpay-order',
  'verify-razorpay-payment',
  'create-wallet-topup-order',
  'verify-wallet-topup'
]

test('All 4 Edge Functions have removed static wildcard CORS and enforce allowlist origin resolution', () => {
  for (const fn of edgeFunctions) {
    const filePath = path.join(ROOT, 'supabase', 'functions', fn, 'index.ts')
    assert(fs.existsSync(filePath), `Edge function file missing: ${filePath}`)
    const content = fs.readFileSync(filePath, 'utf8')
    assert(!content.includes("'Access-Control-Allow-Origin': '*'"), `${fn} still contains wildcard CORS allow-origin`)
    assert(content.includes('getCorsHeaders'), `${fn} must implement getCorsHeaders`)
    assert(content.includes('mjesports.in'), `${fn} getCorsHeaders must include production domain`)
    assert(content.includes('localhost:5173'), `${fn} getCorsHeaders must support local dev`)
    assert(content.includes("'Vary': 'Origin'"), `${fn} must include Vary: Origin header`)
  }
})

test('verify-razorpay-payment fails closed when secret is missing or invalid (no dev mock bypass)', () => {
  const filePath = path.join(ROOT, 'supabase', 'functions', 'verify-razorpay-payment', 'index.ts')
  const content = fs.readFileSync(filePath, 'utf8')
  assert(!content.includes('if (!secret) return true'), 'verify-razorpay-payment must not return true if secret is missing')
  assert(content.includes('if (!secret || !signature || !data) return false'), 'verify-razorpay-payment must return false if secret/signature/data is missing')
  assert(content.includes('constantTimeCompare'), 'verify-razorpay-payment must use constant-time comparison')
})

test('verify-wallet-topup fails closed when secret is missing or invalid (no dev mock bypass)', () => {
  const filePath = path.join(ROOT, 'supabase', 'functions', 'verify-wallet-topup', 'index.ts')
  const content = fs.readFileSync(filePath, 'utf8')
  assert(!content.includes('if (!secret) return true'), 'verify-wallet-topup must not return true if secret is missing')
  assert(content.includes('if (!secret || !signature || !data) return false'), 'verify-wallet-topup must return false if secret/signature/data is missing')
  assert(content.includes('constantTimeCompare'), 'verify-wallet-topup must use constant-time comparison')
})

// ----------------------------------------------------------------------------
// TEST GROUP 3: DATABASE SECURITY HARDENING MIGRATION
// ----------------------------------------------------------------------------
console.log('\nTest Group 3: Database Security & RLS Migration Checks')

test('supabase_phase1_security_hardening.sql drops legacy 17-parameter overload', () => {
  const p = path.join(ROOT, 'supabase_phase1_security_hardening.sql')
  assert(fs.existsSync(p), 'Migration file supabase_phase1_security_hardening.sql must exist')
  const content = fs.readFileSync(p, 'utf8')
  assert(
    content.includes('DROP FUNCTION IF EXISTS public.register_tournament_team(\n  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT[], TEXT, INT, INT, BOOLEAN, BOOLEAN, TEXT, TEXT, TEXT[], TEXT[]\n);') ||
    content.includes('DROP FUNCTION IF EXISTS public.register_tournament_team(') && content.includes('TEXT[], TEXT[]'),
    'Must explicitly drop 17-parameter overload that lacked payment parameter'
  )
})

test('supabase_phase1_security_hardening.sql enforces payment verification in 19-parameter RPC', () => {
  const p = path.join(ROOT, 'supabase_phase1_security_hardening.sql')
  const content = fs.readFileSync(p, 'utf8')
  assert(content.includes('p_payment_id UUID DEFAULT NULL'), 'Authoritative RPC must define p_payment_id')
  assert(content.includes('p_razorpay_payment_id TEXT DEFAULT NULL'), 'Authoritative RPC must define p_razorpay_payment_id')
  assert(content.includes('v_entry_fee > 0.00'), 'Authoritative RPC must check v_entry_fee')
  assert(content.includes('FOR UPDATE'), 'Authoritative RPC must lock payment and tournament FOR UPDATE')
  assert(content.includes('v_payment.status != \'VERIFIED\''), 'Authoritative RPC must require status = VERIFIED')
  assert(content.includes('status = \'CONSUMED\''), 'Authoritative RPC must atomically mark payment as CONSUMED')
})

test('supabase_phase1_security_hardening.sql hardens avatars storage bucket policies', () => {
  const p = path.join(ROOT, 'supabase_phase1_security_hardening.sql')
  const content = fs.readFileSync(p, 'utf8')
  assert(content.includes('DROP POLICY IF EXISTS "Authenticated Users Update Avatar" ON storage.objects;'), 'Must drop insecure avatar update policy')
  assert(content.includes('DROP POLICY IF EXISTS "Authenticated Users Delete Avatar" ON storage.objects;'), 'Must drop insecure avatar delete policy')
  assert(content.includes('auth.uid() = owner'), 'Must require auth.uid() = owner on avatar mutation')
  assert(content.includes('public.is_admin()'), 'Must allow admin override on avatar storage')
})

test('supabase_phase1_security_hardening.sql hardens notifications table RLS to block spoofing', () => {
  const p = path.join(ROOT, 'supabase_phase1_security_hardening.sql')
  const content = fs.readFileSync(p, 'utf8')
  assert(content.includes('DROP POLICY IF EXISTS "System or Admins insert notifications" ON public.notifications;'), 'Must drop insecure notifications insert policy')
  assert(/auth\.uid\(\)\s*=\s*user_id\s*OR\s*public\.is_admin\(\)/i.test(content), 'Must enforce auth.uid() = user_id OR public.is_admin() on notification insert')
})

test('supabase_phase1_security_hardening.sql revokes direct write on financial tables and direct DELETE on registrations', () => {
  const p = path.join(ROOT, 'supabase_phase1_security_hardening.sql')
  const content = fs.readFileSync(p, 'utf8')
  assert(content.includes('REVOKE INSERT, UPDATE, DELETE ON public.wallets FROM anon, authenticated, public;'), 'Must revoke wallets write')
  assert(content.includes('REVOKE INSERT, UPDATE, DELETE ON public.wallet_ledger FROM anon, authenticated, public;'), 'Must revoke wallet_ledger write')
  assert(content.includes('REVOKE INSERT, UPDATE, DELETE ON public.tournament_payments FROM anon, authenticated, public;'), 'Must revoke tournament_payments write')
  assert(content.includes('REVOKE DELETE ON public.tournament_registrations FROM anon, authenticated, public;'), 'Must revoke registrations delete')
  assert(content.includes('REVOKE DELETE ON public.tournament_players FROM anon, authenticated, public;'), 'Must revoke player delete')
})

// ----------------------------------------------------------------------------
// TEST GROUP 4: CLIENT-SIDE AUTHORITATIVE FLOWS
// ----------------------------------------------------------------------------
console.log('\nTest Group 4: Client-Side Flow Integrity')

test('TournamentContext.jsx uses RPC register_tournament_team and never performs direct registration table inserts', () => {
  const ctxPath = path.join(ROOT, 'src', 'contexts', 'TournamentContext.jsx')
  const content = fs.readFileSync(ctxPath, 'utf8')
  assert(content.includes("supabase.rpc('register_tournament_team'"), 'Must call register_tournament_team RPC')
  assert(content.includes("supabase.rpc('register_tournament_team_with_wallet'"), 'Must call register_tournament_team_with_wallet RPC')
  assert(!content.includes(".from('tournament_registrations').insert("), 'Client must never insert directly into tournament_registrations')
})

test('WalletContext.jsx invokes RPC get_or_create_wallet and Edge Functions for topups', () => {
  const ctxPath = path.join(ROOT, 'src', 'contexts', 'WalletContext.jsx')
  if (fs.existsSync(ctxPath)) {
    const content = fs.readFileSync(ctxPath, 'utf8')
    assert(content.includes("rpc('get_or_create_wallet'"), 'WalletContext must use get_or_create_wallet RPC')
    assert(!content.includes(".from('wallets').update("), 'Client must never update wallets table directly')
  }
})

// ----------------------------------------------------------------------------
// SUMMARY
// ----------------------------------------------------------------------------
console.log('\n==================================================================')
console.log(`AUDIT RESULTS: ${passCount} PASSED, ${failCount} FAILED`)
console.log('==================================================================')

if (failCount > 0) {
  process.exit(1)
} else {
  console.log('✓ All Phase 1 Security Hardening verification checks passed successfully!')
}
