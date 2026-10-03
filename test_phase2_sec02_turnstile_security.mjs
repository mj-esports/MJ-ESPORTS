// test_phase2_sec02_turnstile_security.mjs
// Verification suite for SEC-02: Activate Turnstile with Server-Side Verification

import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert'

const ROOT = process.cwd()
let passCount = 0
let failCount = 0

function test(name, fn) {
  try {
    fn()
    console.log(`  ✅ [PASS] ${name}`)
    passCount++
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}`)
    console.error(`     Error: ${err.message}`)
    failCount++
  }
}

console.log('='.repeat(80))
console.log('MJ ESPORTS — PHASE 2: SEC-02 TURNSTILE BOT PROTECTION SECURITY SUITE')
console.log('='.repeat(80))

// ----------------------------------------------------------------------------
// GROUP 1: Turnstile Service & Client-Side Integrations
// ----------------------------------------------------------------------------
console.log('\n--- GROUP 1: Turnstile Service & Client-Side Integration ---')

test('1. Turnstile helper exists and exports required client APIs', () => {
  const servicePath = path.join(ROOT, 'src', 'services', 'turnstileService.js')
  assert(fs.existsSync(servicePath), 'turnstileService.js must exist')
  const content = fs.readFileSync(servicePath, 'utf8')

  assert(content.includes('export const TURNSTILE_SITE_KEY'), 'Must export TURNSTILE_SITE_KEY')
  assert(content.includes('export const isTurnstileEnabled'), 'Must export isTurnstileEnabled')
  assert(content.includes('renderTurnstileWidget'), 'Must define renderTurnstileWidget')
  assert(content.includes('resetTurnstileWidget'), 'Must define resetTurnstileWidget')
  assert(content.includes('verifyTurnstileToken'), 'Must define verifyTurnstileToken')
  assert(content.includes('VITE_CLOUDFLARE_TURNSTILE_SITE_KEY'), 'Must read public VITE_CLOUDFLARE_TURNSTILE_SITE_KEY')
})

test('2. Login page has an active Turnstile integration', () => {
  const loginPath = path.join(ROOT, 'src', 'pages', 'LoginPage.jsx')
  assert(fs.existsSync(loginPath), 'LoginPage.jsx must exist')
  const content = fs.readFileSync(loginPath, 'utf8')

  assert(content.includes('TurnstileWidget'), 'LoginPage must import TurnstileWidget')
  assert(content.includes('verifyTurnstileToken'), 'LoginPage must import verifyTurnstileToken')
  assert(content.includes('turnstileToken'), 'LoginPage must maintain turnstileToken state')
  assert(content.includes('isTurnstileEnabled()'), 'LoginPage must check isTurnstileEnabled')
  assert(
    content.includes('verifyTurnstileToken(turnstileToken'),
    'LoginPage must verify token with server before signing in'
  )
  assert(/<TurnstileWidget[\s\S]*?\/>/.test(content), 'LoginPage JSX must render TurnstileWidget')
})

test('3. Registration page has an active Turnstile integration', () => {
  const registerPath = path.join(ROOT, 'src', 'pages', 'RegisterPage.jsx')
  assert(fs.existsSync(registerPath), 'RegisterPage.jsx must exist')
  const content = fs.readFileSync(registerPath, 'utf8')

  assert(content.includes('TurnstileWidget'), 'RegisterPage must import TurnstileWidget')
  assert(content.includes('verifyTurnstileToken'), 'RegisterPage must import verifyTurnstileToken')
  assert(content.includes('turnstileToken'), 'RegisterPage must maintain turnstileToken state')
  assert(content.includes('isTurnstileEnabled()'), 'RegisterPage must check isTurnstileEnabled')
  assert(
    content.includes('verifyTurnstileToken(turnstileToken'),
    'RegisterPage must verify token with server before creating account'
  )
  assert(/<TurnstileWidget[\s\S]*?\/>/.test(content), 'RegisterPage JSX must render TurnstileWidget')
})

test('4. Slot booking/registration has the intended active protection', () => {
  const slotModalPath = path.join(ROOT, 'src', 'components', 'tournament', 'SlotBookingModal.jsx')
  assert(fs.existsSync(slotModalPath), 'SlotBookingModal.jsx must exist')
  const content = fs.readFileSync(slotModalPath, 'utf8')

  assert(content.includes('TurnstileWidget'), 'SlotBookingModal must import TurnstileWidget')
  assert(content.includes('verifyTurnstileToken'), 'SlotBookingModal must import verifyTurnstileToken')
  assert(content.includes('turnstileToken'), 'SlotBookingModal must maintain turnstileToken state')
  assert(content.includes('isTurnstileEnabled()'), 'SlotBookingModal must check isTurnstileEnabled')
  assert(
    content.includes("action: 'slot_booking'"),
    'SlotBookingModal must tag action as slot_booking'
  )
  assert(/<TurnstileWidget[\s\S]*?\/>/.test(content), 'SlotBookingModal JSX must render TurnstileWidget')
})

// ----------------------------------------------------------------------------
// GROUP 2: Server-Side Edge Function Architecture & Secret Isolation
// ----------------------------------------------------------------------------
console.log('\n--- GROUP 2: Server-Side Verification & Secret Isolation ---')

test('5. Server-side siteverify exists in dedicated Edge Function', () => {
  const edgeFnPath = path.join(ROOT, 'supabase', 'functions', 'verify-turnstile-token', 'index.ts')
  assert(fs.existsSync(edgeFnPath), 'verify-turnstile-token Edge Function must exist')
  const content = fs.readFileSync(edgeFnPath, 'utf8')

  assert(
    content.includes('https://challenges.cloudflare.com/turnstile/v0/siteverify'),
    'Edge Function must call official Cloudflare siteverify endpoint'
  )
  assert(content.includes('POST'), 'Must use POST method for siteverify')
})

test('6. siteverify uses secret strictly from server-side environment', () => {
  const edgeFnPath = path.join(ROOT, 'supabase', 'functions', 'verify-turnstile-token', 'index.ts')
  const content = fs.readFileSync(edgeFnPath, 'utf8')

  assert(
    content.includes("Deno.env.get('CLOUDFLARE_TURNSTILE_SECRET_KEY')"),
    'Must read CLOUDFLARE_TURNSTILE_SECRET_KEY strictly from Deno.env'
  )
  assert(
    content.includes('TURNSTILE_SECRET_NOT_CONFIGURED'),
    'Must fail closed with error when secret key is not configured'
  )
})

test('7. No Turnstile secret appears in frontend source code', () => {
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
            !content.includes('CLOUDFLARE_TURNSTILE_SECRET_KEY'),
            `Found forbidden CLOUDFLARE_TURNSTILE_SECRET_KEY in frontend file: ${fullPath}`
          )
          assert(
            !content.includes('VITE_CLOUDFLARE_TURNSTILE_SECRET_KEY'),
            `Found forbidden VITE_CLOUDFLARE_TURNSTILE_SECRET_KEY in frontend file: ${fullPath}`
          )
        }
      }
    }
    scan(fullDir)
  }
})

// ----------------------------------------------------------------------------
// GROUP 3: Server Verification Logic & Behavioral Guards
// ----------------------------------------------------------------------------
console.log('\n--- GROUP 3: Server Verification Logic & Behavioral Guards ---')

test('8. Missing token is rejected server-side', () => {
  const edgeFnPath = path.join(ROOT, 'supabase', 'functions', 'verify-turnstile-token', 'index.ts')
  const content = fs.readFileSync(edgeFnPath, 'utf8')

  assert(content.includes('MISSING_TURNSTILE_TOKEN'), 'Must return MISSING_TURNSTILE_TOKEN when token is empty')
  assert(content.includes('status: 400'), 'Must return HTTP 400 for missing token')
})

test('9. Failed verification is rejected with status 403', () => {
  const edgeFnPath = path.join(ROOT, 'supabase', 'functions', 'verify-turnstile-token', 'index.ts')
  const content = fs.readFileSync(edgeFnPath, 'utf8')

  assert(content.includes('TURNSTILE_VERIFICATION_FAILED'), 'Must reject invalid token with TURNSTILE_VERIFICATION_FAILED')
  assert(content.includes('status: 403'), 'Must return HTTP 403 for failed verification')
})

test('10. Successful verification returns 200 and challenge metadata', () => {
  const edgeFnPath = path.join(ROOT, 'supabase', 'functions', 'verify-turnstile-token', 'index.ts')
  const content = fs.readFileSync(edgeFnPath, 'utf8')

  assert(content.includes('success: true'), 'Must return success: true upon validation')
  assert(content.includes('status: 200'), 'Must return HTTP 200 for valid token')
  assert(content.includes('challenge_ts:'), 'Must include challenge_ts in successful payload')
  assert(content.includes('hostname:'), 'Must include hostname in successful payload')
})

test('11. No production bypass flag exists (fail closed security)', () => {
  const edgeFnPath = path.join(ROOT, 'supabase', 'functions', 'verify-turnstile-token', 'index.ts')
  const content = fs.readFileSync(edgeFnPath, 'utf8')

  assert(!content.includes('dev_bypass'), 'No dev_bypass flag permitted in Edge Function')
  assert(!content.includes('skip_verification'), 'No skip_verification flag permitted in Edge Function')
  assert(!content.includes('captchaVerified'), 'Must not trust client boolean captchaVerified')
  assert(!content.includes('test_mode_token'), 'No fake test_mode_token backdoor permitted')
})

// ----------------------------------------------------------------------------
// GROUP 4: CORS Alignment & Credential Safety
// ----------------------------------------------------------------------------
console.log('\n--- GROUP 4: CORS Alignment & Security Isolation ---')

test('12. Existing CORS controls and origin protections remain intact', () => {
  const edgeFnPath = path.join(ROOT, 'supabase', 'functions', 'verify-turnstile-token', 'index.ts')
  const content = fs.readFileSync(edgeFnPath, 'utf8')

  assert(content.includes('getCorsHeaders'), 'Must define authoritative getCorsHeaders')
  assert(content.includes("'https://mj-esports.vercel.app'"), 'Must include mj-esports.vercel.app in allowed origins')
  assert(content.includes('/^https:\\/\\/[a-zA-Z0-9-]+\\.vercel\\.app$/'), 'Must match Vercel preview domains via regex')
  assert(content.includes("Deno.env.get('ALLOWED_ORIGINS')"), 'Must support custom ALLOWED_ORIGINS')
  assert(content.includes("req.method === 'OPTIONS'"), 'Must handle OPTIONS preflight cleanly')
})

// ----------------------------------------------------------------------------
// GROUP 5: Scope Non-Interference
// ----------------------------------------------------------------------------
console.log('\n--- GROUP 5: Non-Interference with Payment Architecture ---')

test('13. Payment and Razorpay files are completely untouched', () => {
  const paymentFiles = [
    'src/services/tournamentPaymentService.js',
    'supabase/functions/create-razorpay-order/index.ts',
    'supabase/functions/verify-razorpay-payment/index.ts',
    'supabase/functions/create-wallet-topup-order/index.ts',
    'supabase/functions/verify-wallet-topup/index.ts',
  ]

  for (const relPath of paymentFiles) {
    const fullPath = path.join(ROOT, relPath)
    assert(fs.existsSync(fullPath), `${relPath} must exist`)
    const content = fs.readFileSync(fullPath, 'utf8')
    assert(!content.includes('TurnstileWidget'), `${relPath} must not be modified by Turnstile`)
  }
})

console.log('='.repeat(80))
console.log(`SEC-02 TEST RESULTS: ${passCount} PASSED | ${failCount} FAILED`)
console.log('='.repeat(80))

if (failCount > 0) {
  process.exit(1)
}
