// test_phase6a_staging_configuration.mjs
// Verification suite for Phase 6A: Staging Environment Isolation & Safety Guards

import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

let totalTests = 0
let passedTests = 0
let failedTests = 0

function assert(condition, message) {
  totalTests++
  if (condition) {
    passedTests++
    console.log(`  ✓ ${message}`)
  } else {
    failedTests++
    console.error(`  ✗ FAIL: ${message}`)
  }
}

console.log('======================================================================')
console.log('MJ ESPORTS: Phase 6A Staging Environment Safety & Isolation Tests')
console.log('======================================================================\n')

// -----------------------------------------------------------------------------
// GROUP 1: Environment Files Verification
// -----------------------------------------------------------------------------
console.log('--- GROUP 1: Environment Files & Isolation ---')

const envPath = path.resolve('.env')
const envExamplePath = path.resolve('.env.example')
const stagingEnvPath = path.resolve('.env.staging')
const stagingExamplePath = path.resolve('.env.staging.example')

assert(fs.existsSync(envPath), '1.1. Production .env exists')
assert(fs.existsSync(envExamplePath), '1.2. .env.example exists')
assert(fs.existsSync(stagingEnvPath), '1.3. Local .env.staging exists')
assert(fs.existsSync(stagingExamplePath), '1.4. .env.staging.example exists')

const envContent = fs.readFileSync(envPath, 'utf8')
const stagingContent = fs.readFileSync(stagingEnvPath, 'utf8')
const stagingExampleContent = fs.readFileSync(stagingExamplePath, 'utf8')

// Production .env must remain pointing to production ref fdhjqlejomtgwffqgmoq
assert(
  envContent.includes('fdhjqlejomtgwffqgmoq'),
  '1.5. Production .env retains production project ref fdhjqlejomtgwffqgmoq (untouched)'
)

// Staging files must NOT contain production credentials
assert(
  !stagingContent.includes('fdhjqlejomtgwffqgmoq') && !stagingContent.includes('sb_publishable_AjUHF2VOsf0876XE1YNq-w_NTt22lCR'),
  '1.6. .env.staging does NOT contain production credentials (clean placeholders)'
)
assert(
  !stagingExampleContent.includes('fdhjqlejomtgwffqgmoq') && !stagingExampleContent.includes('sb_publishable_'),
  '1.7. .env.staging.example does NOT contain production credentials'
)

// FamGateway restriction check
assert(
  stagingContent.includes('VITE_FAMGATEWAY_ENABLED=false') && stagingExampleContent.includes('VITE_FAMGATEWAY_ENABLED=false'),
  '1.8. VITE_FAMGATEWAY_ENABLED is explicitly false in staging configuration files'
)

// -----------------------------------------------------------------------------
// GROUP 2: Git Exclusion & Inclusion Rules
// -----------------------------------------------------------------------------
console.log('\n--- GROUP 2: Git Ignored & Tracked Rules ---')

try {
  const ignoredStaging = execSync('git check-ignore .env.staging', { encoding: 'utf8' }).trim()
  assert(
    ignoredStaging === '.env.staging',
    '2.1. .env.staging is strictly ignored by Git (zero credential leakage risk)'
  )
} catch {
  assert(false, '2.1. .env.staging check-ignore failed')
}

try {
  let isExampleIgnored = false
  try {
    execSync('git check-ignore .env.staging.example', { encoding: 'utf8' })
    isExampleIgnored = true
  } catch {
    isExampleIgnored = false
  }
  assert(
    !isExampleIgnored,
    '2.2. .env.staging.example is NOT ignored and can be tracked by Git'
  )
} catch {
  assert(false, '2.2. .env.staging.example check failed')
}

// -----------------------------------------------------------------------------
// GROUP 3: package.json Scripts
// -----------------------------------------------------------------------------
console.log('\n--- GROUP 3: package.json Scripts Preservation & Expansion ---')

const pkgJsonPath = path.resolve('package.json')
const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'))
const scripts = pkgJson.scripts || {}

assert(scripts['dev'] === 'vite', '3.1. Production dev script is preserved ("vite")')
assert(scripts['build'] === 'vite build', '3.2. Production build script is preserved ("vite build")')
assert(scripts['lint'] === 'eslint .', '3.3. Lint script is preserved ("eslint .")')
assert(scripts['preview'] === 'vite preview', '3.4. Preview script is preserved ("vite preview")')
assert(scripts['dev:staging'] === 'vite --mode staging', '3.5. Staging dev script added ("vite --mode staging")')
assert(scripts['build:staging'] === 'vite build --mode staging', '3.6. Staging build script added ("vite build --mode staging")')

// -----------------------------------------------------------------------------
// GROUP 4: Supabase Client Startup Safety Checks
// -----------------------------------------------------------------------------
console.log('\n--- GROUP 4: Supabase Client Startup Safety Checks ---')

const supabaseJsPath = path.resolve('src/lib/supabase.js')
const supabaseJsContent = fs.readFileSync(supabaseJsPath, 'utf8')

assert(
  supabaseJsContent.includes('PRODUCTION_PROJECT_REF = \'fdhjqlejomtgwffqgmoq\''),
  '4.1. supabase.js defines authoritative PRODUCTION_PROJECT_REF'
)
assert(
  supabaseJsContent.includes('isStagingMode') && supabaseJsContent.includes('currentMode === \'staging\''),
  '4.2. supabase.js detects active staging mode dynamically'
)
assert(
  supabaseJsContent.includes('activeProjectRef === PRODUCTION_PROJECT_REF') && supabaseJsContent.includes('isStagingSafetyViolated'),
  '4.3. supabase.js blocks initialization if staging mode points to production'
)
assert(
  !supabaseJsContent.includes('console.log(rawSupabaseAnonKey') && !supabaseJsContent.includes('console.info(rawSupabaseAnonKey'),
  '4.4. supabase.js never prints API keys or secrets in logs'
)
assert(
  supabaseJsContent.includes('[MJ ESPORTS ENV]'),
  '4.5. supabase.js logs active environment label in development'
)

// -----------------------------------------------------------------------------
// GROUP 5: Production Link Safety Verification
// -----------------------------------------------------------------------------
console.log('\n--- GROUP 5: Production Link Safety Verification ---')

const linkedProjPath = path.resolve('supabase/.temp/linked-project.json')
const linkedProj = JSON.parse(fs.readFileSync(linkedProjPath, 'utf8'))

assert(
  linkedProj.ref === 'fdhjqlejomtgwffqgmoq',
  '5.1. supabase/.temp/linked-project.json was untouched (still points to production ref)'
)

// -----------------------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------------------
console.log('\n======================================================================')
console.log(`TOTAL CHECKS: ${totalTests}`)
console.log(`PASSED: ${passedTests}`)
console.log(`FAILED: ${failedTests}`)
console.log('======================================================================')

if (failedTests > 0) {
  process.exit(1)
} else {
  console.log('ALL PHASE 6A STAGING CONFIGURATION & SAFETY CHECKS PASSED!')
}

