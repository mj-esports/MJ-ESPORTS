// test_phase16_production_operations.mjs
// Automated verification suite for Phase 16: Production Operations Hardening (MJ ESPORTS)

import fs from 'fs'
import path from 'path'
import assert from 'assert'

const ROOT = process.cwd()

console.log('==================================================================')
console.log('MJ ESPORTS — PHASE 16: PRODUCTION OPERATIONS HARDENING AUDIT')
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
// GROUP 1: REACT GLOBAL ERROR HANDLING & SECURITY SANITIZATION
// ----------------------------------------------------------------------------
console.log('Test Group 1: React Global Error Boundary & Security Sanitization')

const errorBoundaryPath = path.join(ROOT, 'src/components/common/ErrorBoundary.jsx')
const errorBoundaryContent = fs.readFileSync(errorBoundaryPath, 'utf8')

test('1.1. ErrorBoundary imports and uses sanitizeError for user-friendly messaging', () => {
  assert(errorBoundaryContent.includes("import { sanitizeError } from '../../utils/errorHandler'"), 'Must import sanitizeError')
  assert(errorBoundaryContent.includes('const sanitized = sanitizeError(this.state.error)'), 'Must call sanitizeError on captured error')
})

test('1.2. ErrorBoundary strictly gates stack traces and raw errors to import.meta.env.DEV (Zero production leaks)', () => {
  assert(errorBoundaryContent.includes('import.meta.env.DEV'), 'Must gate diagnostic details behind import.meta.env.DEV')
  assert(errorBoundaryContent.includes('{import.meta.env.DEV && ('), 'Must render diagnostics conditionally with import.meta.env.DEV')
  // Verify that stack trace only occurs after import.meta.env.DEV
  const devIndex = errorBoundaryContent.indexOf('{import.meta.env.DEV && (')
  const stackIndex = errorBoundaryContent.indexOf('this.state.error?.stack')
  assert(devIndex !== -1, 'DEV block must exist')
  assert(stackIndex !== -1, 'Stack trace must be present in DEV block')
  assert(stackIndex > devIndex, 'Stack trace must be positioned after import.meta.env.DEV check')
  // Ensure stack only occurs once in the entire file
  const stackMatches = errorBoundaryContent.match(/this\.state\.error\?\.stack/g)
  assert.strictEqual(stackMatches.length, 1, 'Stack trace must not appear anywhere outside DEV block')
})

test('1.3. ErrorBoundary provides recovery actions: reload button and return home link', () => {
  assert(errorBoundaryContent.includes('onClick={this.handleRetry}'), 'Must have retry handler button')
  assert(errorBoundaryContent.includes('window.location.reload()'), 'Retry must trigger reload')
  assert(errorBoundaryContent.includes('href="/"'), 'Must have safe return home link')
})

test('1.4. Global unhandled rejection listener is registered in src/main.jsx', () => {
  const mainContent = fs.readFileSync(path.join(ROOT, 'src/main.jsx'), 'utf8')
  assert(mainContent.includes("window.addEventListener('unhandledrejection'"), 'main.jsx must register unhandledrejection listener')
  assert(mainContent.includes('[Global Unhandled Rejection Caught]'), 'main.jsx must log unhandled rejection diagnostic')
})

// ----------------------------------------------------------------------------
// GROUP 2: POST-DEPLOYMENT RESILIENCY & CHUNK RECOVERY
// ----------------------------------------------------------------------------
console.log('\nTest Group 2: Post-Deployment Chunk Hash Invalidation Recovery')

const appRoutesPath = path.join(ROOT, 'src/routes/AppRoutes.jsx')
const appRoutesContent = fs.readFileSync(appRoutesPath, 'utf8')

test('2.1. AppRoutes implements resilient lazy wrapper over reactLazy for dynamic component imports', () => {
  assert(appRoutesContent.includes('lazy as reactLazy'), 'AppRoutes must import lazy as reactLazy')
  assert(appRoutesContent.includes('function lazy(componentImport)'), 'AppRoutes must define resilient lazy wrapper')
})

test('2.2. lazy wrapper detects module import failure and triggers clean single reload without loop', () => {
  assert(appRoutesContent.includes('mj_chunk_force_reload'), 'Must track reload flag in sessionStorage')
  assert(appRoutesContent.includes('failed to fetch dynamically imported module'), 'Must match chunk load error')
  assert(appRoutesContent.includes('window.location.reload()'), 'Must reload page on chunk failure')
})

test('2.3. All lazy-loaded feature pages in AppRoutes use resilient lazy wrapper', () => {
  const lazyImports = [
    'TournamentDetailPage',
    'LeaderboardPage',
    'AboutPage',
    'ResetPasswordPage',
    'DashboardPage',
    'ProfilePage',
    'PlayerTeamPortalPage',
    'EditProfilePage',
    'StatisticsPage',
    'TournamentHistoryPage',
    'AchievementsPage',
    'WalletPage',
    'SettingsPage',
    'AdminDashboardPage',
    'AdminFinancePage',
    'NotFoundPage',
    'ServerErrorPage',
  ]
  for (const page of lazyImports) {
    const regex = new RegExp(`const ${page} = lazy\\(`)
    assert(regex.test(appRoutesContent), `${page} must be wrapped in lazy`)
  }
})

// ----------------------------------------------------------------------------
// GROUP 3: AUTHENTICATION & SESSION RESILIENCE
// ----------------------------------------------------------------------------
console.log('\nTest Group 3: Authentication & Session Resilience')

const adminRouteContent = fs.readFileSync(path.join(ROOT, 'src/routes/AdminRoute.jsx'), 'utf8')
const protectedRouteContent = fs.readFileSync(path.join(ROOT, 'src/routes/ProtectedRoute.jsx'), 'utf8')
const authContextContent = fs.readFileSync(path.join(ROOT, 'src/contexts/AuthContext.jsx'), 'utf8')

test('3.1. AdminRoute verifies authorization and redirects unauthenticated to /login and non-admin to /403', () => {
  assert(adminRouteContent.includes('to="/login"'), 'Unauthenticated must redirect to /login')
  assert(adminRouteContent.includes('to="/403"'), 'Non-admin must redirect to /403')
  assert(adminRouteContent.includes('isAdmin'), 'AdminRoute must verify isAdmin flag')
})

test('3.2. ProtectedRoute preserves location state during login redirection', () => {
  assert(protectedRouteContent.includes('to={redirectTo}'), 'Must redirect to redirectTo path')
  assert(protectedRouteContent.includes('state={{ from: location }}'), 'Must preserve location state')
})

test('3.3. AuthContext getUserRole defaults to user role on error to prevent privilege escalation', () => {
  assert(authContextContent.includes("setRole('user')"), 'On role error, must default role to user')
  assert(authContextContent.includes("roleRef.current = 'user'"), 'On role error, roleRef must be user')
})

// ----------------------------------------------------------------------------
// GROUP 4: DOUBLE-SUBMISSION PROTECTION & MUTATION SAFETY
// ----------------------------------------------------------------------------
console.log('\nTest Group 4: Double-Submission Protection & Mutation Safety')

const tournamentContextContent = fs.readFileSync(path.join(ROOT, 'src/contexts/TournamentContext.jsx'), 'utf8')
const matchScheduleModalContent = fs.readFileSync(path.join(ROOT, 'src/components/admin/tournaments/MatchScheduleModal.jsx'), 'utf8')

test('4.1. TournamentContext uses activeSubmissionsRef lock on tournament creation', () => {
  assert(tournamentContextContent.includes('activeSubmissionsRef'), 'Must declare activeSubmissionsRef')
  assert(tournamentContextContent.includes('activeSubmissionsRef.current.has(lockKey)'), 'Must check activeSubmissionsRef for lock')
})

test('4.2. TournamentContext uses activeSubmissionsRef lock on team registration', () => {
  assert(tournamentContextContent.includes('reg_${tournamentId}'), 'Must format registration lock key')
  assert(tournamentContextContent.includes('Registration is currently processing. Please wait.'), 'Must reject duplicate registrations')
})

test('4.3. MatchScheduleModal guards against duplicate scheduling clicks via isSaving', () => {
  assert(matchScheduleModalContent.includes('if (isSaving) return'), 'handleSaveSchedule must check isSaving')
  assert(matchScheduleModalContent.includes('disabled={isSaving'), 'Save button must be disabled when isSaving is true')
})

// ----------------------------------------------------------------------------
// GROUP 5: PRODUCTION CONFIGURATION & OPERATIONS DOCUMENTATION
// ----------------------------------------------------------------------------
console.log('\nTest Group 5: Production Configuration & Operations Documentation')

test('5.1. Zero private secrets or service role keys in src/ or public/', () => {
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
        } else if (/\.(js|jsx|ts|tsx)$/.test(ent.name)) {
          const content = fs.readFileSync(fullPath, 'utf8')
          assert(!content.includes('SUPABASE_SERVICE_ROLE_KEY'), `Found SUPABASE_SERVICE_ROLE_KEY in ${fullPath}`)
          assert(!content.includes('RAZORPAY_KEY_SECRET'), `Found RAZORPAY_KEY_SECRET in ${fullPath}`)
          assert(!content.includes('CLOUDFLARE_TURNSTILE_SECRET_KEY'), `Found CLOUDFLARE_TURNSTILE_SECRET_KEY in ${fullPath}`)
        }
      }
    }
    scan(fullDir)
  }
})

test('5.2. Permanent runbook docs/OPERATIONS.md exists with all required operational protocols', () => {
  const opsDocPath = path.join(ROOT, 'docs/OPERATIONS.md')
  assert(fs.existsSync(opsDocPath), 'docs/OPERATIONS.md must exist')
  const opsDoc = fs.readFileSync(opsDocPath, 'utf8')
  assert(opsDoc.includes('Production Failure Recovery Protocols'), 'Must detail failure recovery')
  assert(opsDoc.includes('Emergency Git Rollback Procedure'), 'Must detail rollback procedure')
  assert(opsDoc.includes('Deployment Verification Checklist'), 'Must detail verification checklist')
  assert(opsDoc.includes('Authentication & Session Recovery'), 'Must detail session recovery')
  assert(opsDoc.includes('Admin Incident Handling'), 'Must detail incident handling')
})

test('5.3. docs/TASKS.md records Phase 16 as completed', () => {
  const tasksDoc = fs.readFileSync(path.join(ROOT, 'docs/TASKS.md'), 'utf8')
  assert(tasksDoc.includes('[x] **Phase 16 — Production Operations Hardening:**'), 'Phase 16 must be checked in TASKS.md')
})

test('5.4. vercel.json enforces security headers, CSP, and SPA rewrite', () => {
  const vercelConfig = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'))
  assert(vercelConfig.rewrites.some((r) => r.destination === '/index.html'), 'Must rewrite all paths to /index.html')
  const headerKeys = vercelConfig.headers[1].headers.map((h) => h.key)
  assert(headerKeys.includes('Content-Security-Policy'), 'Must set Content-Security-Policy')
  assert(headerKeys.includes('X-Frame-Options'), 'Must set X-Frame-Options')
  assert(headerKeys.includes('Strict-Transport-Security'), 'Must set Strict-Transport-Security')
})

// ----------------------------------------------------------------------------
// SUMMARY
// ----------------------------------------------------------------------------
console.log('\n==================================================================')
console.log(`TOTAL TESTS: ${passCount + failCount} | PASSED: ${passCount} | FAILED: ${failCount}`)
console.log('==================================================================\n')

if (failCount > 0) {
  process.exit(1)
} else {
  console.log('>>> ALL PHASE 16 PRODUCTION OPERATIONS AUDIT CHECKS PASSED <<<\n')
}
