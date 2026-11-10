// test_phase8a_rulebook_logo.mjs
// Automated verification for Phase 8A: Rulebook Page Logo Fix (MJ ESPORTS)

import fs from 'fs'
import path from 'path'
import assert from 'assert'

const ROOT = process.cwd()

console.log('================================================================================')
console.log('MJ ESPORTS — PHASE 8A: RULEBOOK PAGE LOGO FIX TEST SUITE')
console.log('================================================================================\n')

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

const aboutPageContent = fs.readFileSync(path.join(ROOT, 'src', 'pages', 'AboutPage.jsx'), 'utf8')
const navbarContent = fs.readFileSync(path.join(ROOT, 'src', 'components', 'common', 'Navbar.jsx'), 'utf8')
const logoPath = path.join(ROOT, 'public', 'mj-esports-logo.png')

// 1. Logo Asset Verification
test('1.1. Official MJ ESPORTS logo asset exists in public directory and is valid PNG', () => {
  assert(fs.existsSync(logoPath), 'public/mj-esports-logo.png must exist')
  const buf = fs.readFileSync(logoPath)
  assert.strictEqual(buf.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', 'Must be a valid PNG file')
  assert(buf.length > 100000, 'Logo must be high-res production asset')
})

test('1.2. Reuses the exact logo asset used by Navbar without duplication', () => {
  assert(navbarContent.includes('src="/mj-esports-logo.png"'), 'Navbar must use /mj-esports-logo.png')
  assert(aboutPageContent.includes('src="/mj-esports-logo.png"'), 'AboutPage must reuse /mj-esports-logo.png')
})

// 2. Replacement of Generic Icon
test('2.1. Generic crossed-swords icon in circular badge has been removed from header banner', () => {
  assert(!aboutPageContent.includes('<Swords className="w-6 h-6 sm:w-7 sm:h-7"'), 'Generic swords icon in header must be removed')
})

test('2.2. Official MJ ESPORTS logo is placed in top-center position of header banner', () => {
  assert(aboutPageContent.includes('{/* Header Banner */}'), 'Header banner must exist')
  assert(aboutPageContent.includes('alt="MJ ESPORTS"'), 'Logo must have accessible alt text')
  assert(aboutPageContent.includes('object-contain'), 'Proportions must be preserved with object-contain')
})

test('2.3. Logo is appropriately sized for brand presence with responsive desktop/mobile scaling', () => {
  assert(aboutPageContent.includes('w-16 h-16'), 'Must have mobile size')
  assert(aboutPageContent.includes('sm:w-20 sm:h-20'), 'Must have tablet size')
  assert(aboutPageContent.includes('md:w-24 md:h-24'), 'Must have desktop size')
  assert(aboutPageContent.includes('rounded-full'), 'Must maintain circular framing')
})

test('2.4. Logo includes subtle cyberpunk cyan styling visible on dark background', () => {
  assert(aboutPageContent.includes('border-[#00f2ff]'), 'Must use cyan accent border')
  assert(aboutPageContent.includes('shadow-['), 'Must include glowing drop shadow')
})

// 3. Tab and Structure Preservation
test('3.1. All 4 tabs remain intact and unchanged', () => {
  assert(aboutPageContent.includes("id: 'about', label: 'Platform & Rules'"), 'Platform & Rules tab preserved')
  assert(aboutPageContent.includes("id: 'privacy', label: 'Privacy Policy'"), 'Privacy Policy tab preserved')
  assert(aboutPageContent.includes("id: 'terms', label: 'Terms of Service'"), 'Terms of Service tab preserved')
  assert(aboutPageContent.includes("id: 'contact', label: 'Support & Contact'"), 'Support & Contact tab preserved')
})

test('3.2. Title and descriptive text remain unchanged', () => {
  assert(aboutPageContent.includes('MJ ESPORTS ARENA'), 'Title preserved')
  assert(aboutPageContent.includes("India's premier tournament platform engineered for competitive gamers"), 'Subtitle preserved')
})

console.log('\n================================================================================')
console.log(`PHASE 8A TEST RESULTS: ${passed} PASSED | ${failed} FAILED`)
console.log('================================================================================')

if (failed > 0) {
  process.exit(1)
} else {
  process.exit(0)
}
