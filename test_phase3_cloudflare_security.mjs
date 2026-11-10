// test_phase3_cloudflare_security.mjs
// Comprehensive verification suite for Phase 3: Cloudflare Security & Edge Integration (MJ ESPORTS)

import fs from 'fs'
import path from 'path'
import assert from 'assert'

const ROOT = process.cwd()

console.log('==================================================================')
console.log('MJ ESPORTS — PHASE 3: CLOUDFLARE SECURITY & EDGE INTEGRATION TEST SUITE')
console.log('==================================================================\n')

let passed = 0
let failed = 0

function test(description, fn) {
  try {
    fn()
    console.log(`  ✅ [PASS] ${description}`)
    passed++
  } catch (err) {
    console.error(`  ❌ [FAIL] ${description}`)
    console.error(`     Reason: ${err.message}`)
    failed++
  }
}

// ----------------------------------------------------------------------------
// GROUP 1: VERCEL CONFIGURATION & SECURITY HEADERS AUDIT
// ----------------------------------------------------------------------------
console.log('--- GROUP 1: Vercel Configuration & Security Headers Audit ---')

test('1.1. vercel.json is valid JSON with headers and SPA rewrite preserved', () => {
  const vercelPath = path.join(ROOT, 'vercel.json')
  assert(fs.existsSync(vercelPath), 'vercel.json must exist')
  const content = fs.readFileSync(vercelPath, 'utf8')
  const parsed = JSON.parse(content)

  assert(Array.isArray(parsed.rewrites), 'rewrites array must exist')
  const spaRewrite = parsed.rewrites.find(r => r.destination === '/index.html')
  assert(spaRewrite, 'SPA fallback rewrite to /index.html must exist')

  assert(Array.isArray(parsed.headers), 'headers array must exist')
})

test('1.2. vercel.json defines immutable cache headers for hashed static assets', () => {
  const parsed = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'))
  const assetRule = parsed.headers.find(h => h.source.includes('/assets/'))
  assert(assetRule, 'Asset caching rule must exist')
  const cacheHeader = assetRule.headers.find(h => h.key.toLowerCase() === 'cache-control')
  assert(cacheHeader, 'Cache-Control header must exist on static assets')
  assert(cacheHeader.value.includes('immutable'), 'Static assets must be marked immutable')
  assert(cacheHeader.value.includes('31536000'), 'Static assets must cache for 1 year')
})

test('1.3. vercel.json enforces HSTS, X-Content-Type-Options, X-Frame-Options, and Referrer-Policy', () => {
  const parsed = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'))
  const globalRule = parsed.headers.find(h => h.source === '/(.*)')
  assert(globalRule, 'Global headers rule must exist for /(.*)')

  const getHeader = (key) => globalRule.headers.find(h => h.key.toLowerCase() === key.toLowerCase())?.value || ''

  assert.strictEqual(getHeader('x-content-type-options'), 'nosniff', 'Must enforce nosniff')
  assert.strictEqual(getHeader('x-frame-options'), 'DENY', 'Must enforce X-Frame-Options: DENY')
  assert(getHeader('referrer-policy').includes('strict-origin'), 'Must enforce strict Referrer-Policy')
  assert(getHeader('strict-transport-security').includes('max-age=63072000'), 'Must enforce HSTS with long max-age')
  assert(getHeader('strict-transport-security').includes('preload'), 'Must enable HSTS preload')
})

test('1.4. Permissions-Policy restricts sensitive APIs while permitting Razorpay checkout', () => {
  const parsed = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'))
  const globalRule = parsed.headers.find(h => h.source === '/(.*)')
  const pp = globalRule.headers.find(h => h.key.toLowerCase() === 'permissions-policy')?.value || ''

  assert(pp.includes('camera=()'), 'Camera must be disabled')
  assert(pp.includes('microphone=()'), 'Microphone must be disabled')
  assert(pp.includes('geolocation=()'), 'Geolocation must be disabled')
  assert(pp.includes('payment='), 'Payment API must be granted for checkout')
  assert(pp.includes('checkout.razorpay.com'), 'Payment API must permit checkout.razorpay.com')
})

// ----------------------------------------------------------------------------
// GROUP 2: CONTENT SECURITY POLICY (CSP) COMPATIBILITY AUDIT
// ----------------------------------------------------------------------------
console.log('\n--- GROUP 2: Content Security Policy (CSP) Compatibility Audit ---')

let csp = ''
try {
  const parsed = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'))
  const globalRule = parsed.headers.find(h => h.source === '/(.*)')
  csp = globalRule.headers.find(h => h.key.toLowerCase() === 'content-security-policy')?.value || ''
} catch {}

test('2.1. CSP permits Razorpay checkout scripts, iframes, and telemetry', () => {
  assert(csp.includes('script-src') && csp.includes('https://checkout.razorpay.com'), 'script-src must include https://checkout.razorpay.com')
  assert(csp.includes('frame-src') && csp.includes('https://api.razorpay.com'), 'frame-src must include https://api.razorpay.com')
  assert(csp.includes('frame-src') && csp.includes('https://checkout.razorpay.com'), 'frame-src must include https://checkout.razorpay.com')
  assert(csp.includes('connect-src') && csp.includes('https://api.razorpay.com'), 'connect-src must include https://api.razorpay.com')
  assert(csp.includes('connect-src') && csp.includes('https://lumberjack.razorpay.com'), 'connect-src must include https://lumberjack.razorpay.com')
})

test('2.2. CSP permits Supabase REST, Auth, Storage, and Realtime WebSockets', () => {
  assert(csp.includes('connect-src') && csp.includes('https://*.supabase.co'), 'connect-src must include https://*.supabase.co')
  assert(csp.includes('connect-src') && csp.includes('wss://*.supabase.co'), 'connect-src must include wss://*.supabase.co')
  assert(csp.includes('img-src') && csp.includes('https://*.supabase.co'), 'img-src must include https://*.supabase.co for avatars/evidence')
})

test('2.3. CSP enforces WebAssembly and Worker hardening (No wasm-unsafe-eval, no worker blob:)', () => {
  assert(!csp.includes("'wasm-unsafe-eval'"), 'script-src must NOT include wasm-unsafe-eval (WebAssembly obsolete post-OCR removal)')
  const workerSrcMatch = csp.match(/worker-src\s+([^;]+)/)
  assert(workerSrcMatch, 'worker-src directive must exist')
  assert(!workerSrcMatch[1].includes('blob:'), 'worker-src must NOT allow blob: (worker-entry obsolete post-OCR removal)')
  assert(csp.includes('img-src') && csp.includes('blob:'), 'img-src must allow blob: for canvas/image/proof preview')
})

test('2.4. CSP permits Google Fonts stylesheets and font binaries', () => {
  assert(csp.includes('style-src') && csp.includes('https://fonts.googleapis.com'), 'style-src must allow fonts.googleapis.com')
  assert(csp.includes('font-src') && csp.includes('https://fonts.gstatic.com'), 'font-src must allow fonts.gstatic.com')
})

test('2.5. CSP permits Cloudflare Turnstile challenge iframes and scripts', () => {
  assert(csp.includes('script-src') && csp.includes('https://challenges.cloudflare.com'), 'script-src must allow Turnstile script')
  assert(csp.includes('frame-src') && csp.includes('https://challenges.cloudflare.com'), 'frame-src must allow Turnstile iframe')
  assert(csp.includes('connect-src') && csp.includes('https://challenges.cloudflare.com'), 'connect-src must allow Turnstile connect')
})

test('2.6. CSP blocks framing of MJ ESPORTS to prevent clickjacking', () => {
  assert(csp.includes("frame-ancestors 'none'"), "frame-ancestors must be set to 'none'")
})

// ----------------------------------------------------------------------------
// GROUP 3: SUPABASE EDGE FUNCTION CORS ALIGNMENT
// ----------------------------------------------------------------------------
console.log('\n--- GROUP 3: Supabase Edge Functions CORS Alignment ---')

const edgeFunctions = [
  'create-razorpay-order',
  'verify-razorpay-payment',
  'create-wallet-topup-order',
  'verify-wallet-topup',
]

test('3.1. All sensitive Edge Functions include mj-esports.vercel.app in defaultOrigins', () => {
  for (const fnName of edgeFunctions) {
    const fnPath = path.join(ROOT, 'supabase', 'functions', fnName, 'index.ts')
    const content = fs.readFileSync(fnPath, 'utf8')
    assert(
      content.includes("'https://mj-esports.vercel.app'"),
      `${fnName} must include 'https://mj-esports.vercel.app' in defaultOrigins`
    )
  }
})

test('3.2. All sensitive Edge Functions allow root and preview Vercel domains via regex', () => {
  for (const fnName of edgeFunctions) {
    const fnPath = path.join(ROOT, 'supabase', 'functions', fnName, 'index.ts')
    const content = fs.readFileSync(fnPath, 'utf8')
    assert(
      content.includes('/^https:\\/\\/[a-zA-Z0-9-]+\\.vercel\\.app$/'),
      `${fnName} must match all Vercel domains with broadened regex`
    )
  }
})

test('3.3. All sensitive Edge Functions support custom domains via ALLOWED_ORIGINS env', () => {
  for (const fnName of edgeFunctions) {
    const fnPath = path.join(ROOT, 'supabase', 'functions', fnName, 'index.ts')
    const content = fs.readFileSync(fnPath, 'utf8')
    assert(
      content.includes("Deno.env.get('ALLOWED_ORIGINS')"),
      `${fnName} must read ALLOWED_ORIGINS for custom Cloudflare domains`
    )
  }
})

// ----------------------------------------------------------------------------
// GROUP 4: SECRETS & CREDENTIAL ISOLATION
// ----------------------------------------------------------------------------
console.log('\n--- GROUP 4: Secret Key & Cloudflare Credential Isolation ---')

test('4.1. Zero exposure of CLOUDFLARE_API_TOKEN in frontend source code', () => {
  const scanDirs = ['src', 'public']
  for (const dir of scanDirs) {
    const fullDir = path.join(ROOT, dir)
    if (!fs.existsSync(fullDir)) continue

    function scan(d) {
      const entries = fs.readdirSync(d, { withFileTypes: true })
      for (const ent of entries) {
        const fullPath = path.join(d, ent.name)
        if (ent.isDirectory()) scan(fullPath)
        else if (/\.(js|jsx|ts|tsx|json|html)$/.test(ent.name)) {
          const content = fs.readFileSync(fullPath, 'utf8')
          assert(!content.includes('CLOUDFLARE_API_TOKEN'), `Exposed CLOUDFLARE_API_TOKEN in ${fullPath}`)
        }
      }
    }
    scan(fullDir)
  }
})

test('4.2. Zero exposure of CLOUDFLARE_TURNSTILE_SECRET_KEY in frontend source code', () => {
  const scanDirs = ['src', 'public']
  for (const dir of scanDirs) {
    const fullDir = path.join(ROOT, dir)
    if (!fs.existsSync(fullDir)) continue

    function scan(d) {
      const entries = fs.readdirSync(d, { withFileTypes: true })
      for (const ent of entries) {
        const fullPath = path.join(d, ent.name)
        if (ent.isDirectory()) scan(fullPath)
        else if (/\.(js|jsx|ts|tsx|json|html)$/.test(ent.name)) {
          const content = fs.readFileSync(fullPath, 'utf8')
          assert(!content.includes('CLOUDFLARE_TURNSTILE_SECRET_KEY'), `Exposed CLOUDFLARE_TURNSTILE_SECRET_KEY in ${fullPath}`)
        }
      }
    }
    scan(fullDir)
  }
})

test('4.3. Turnstile helper only references public VITE_CLOUDFLARE_TURNSTILE_SITE_KEY', () => {
  const helperPath = path.join(ROOT, 'src', 'services', 'turnstileService.js')
  assert(fs.existsSync(helperPath), 'turnstileService.js must exist')
  const content = fs.readFileSync(helperPath, 'utf8')
  assert(content.includes('VITE_CLOUDFLARE_TURNSTILE_SITE_KEY'), 'Must read VITE_CLOUDFLARE_TURNSTILE_SITE_KEY')
  assert(!content.includes('VITE_CLOUDFLARE_TURNSTILE_SECRET_KEY'), 'Must NEVER define VITE_CLOUDFLARE_TURNSTILE_SECRET_KEY')
})

// ----------------------------------------------------------------------------
// GROUP 5: ARCHITECTURAL PRESERVATION & DIRECT INTEGRATION AUDIT
// ----------------------------------------------------------------------------
console.log('\n--- GROUP 5: Architectural Preservation & Direct Connections ---')

test('5.1. Frontend Supabase client connects directly to Supabase cloud (not proxied)', () => {
  const supabasePath = path.join(ROOT, 'src', 'lib', 'supabase.js')
  const content = fs.readFileSync(supabasePath, 'utf8')
  assert(content.includes('VITE_SUPABASE_URL'), 'Must use authoritative VITE_SUPABASE_URL')
  assert(!content.includes('cloudflare'), 'Supabase client must not route through Cloudflare proxy')
})

test('5.2. Razorpay webhook listener is direct Edge Function and not proxied', () => {
  const webhookPath = path.join(ROOT, 'supabase', 'functions', 'razorpay-webhook', 'index.ts')
  assert(fs.existsSync(webhookPath), 'razorpay-webhook Edge Function exists')
  const content = fs.readFileSync(webhookPath, 'utf8')
  assert(content.includes('payment.captured'), 'Listens directly for payment.captured')
  assert(content.includes('refund.processed'), 'Listens directly for refund.processed')
})

test('5.3. Supabase Storage buckets remain on Supabase (No R2 migration in Phase 3)', () => {
  const supabaseClient = fs.readFileSync(path.join(ROOT, 'src', 'lib', 'supabase.js'), 'utf8')
  assert(supabaseClient.includes("AVATAR_BUCKET = 'avatars'"), 'Avatars bucket remains on Supabase')
  assert(supabaseClient.includes("PROFILE_PROOFS_BUCKET = 'profile-proofs'"), 'Profile proofs bucket remains on Supabase')
})

console.log('\n==================================================================')
console.log(`PHASE 3 VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`)
console.log('==================================================================\n')

if (failed > 0) {
  process.exit(1)
}
