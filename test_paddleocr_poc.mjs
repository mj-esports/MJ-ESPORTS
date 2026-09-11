import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

console.log('\n==================================================================')
console.log('MJ ESPORTS — PADDLEOCR.JS PROOF-OF-CONCEPT ISOLATION AUDIT')
console.log('==================================================================\n')

let passed = 0
let failed = 0

function it(desc, fn) {
  try {
    fn()
    console.log(`  ✓ PASS: ${desc}`)
    passed++
  } catch (err) {
    console.error(`  ✗ FAIL: ${desc}`)
    console.error(`    ${err.message}`)
    failed++
  }
}

// SUITE 1: Package Version & Dependency Isolation
console.log('--- SUITE 1: Package Version & Dependency Isolation ---')

it('1. @paddleocr/paddleocr-js is installed at expected version', () => {
  const pkgJsonPath = path.join(__dirname, 'node_modules', '@paddleocr', 'paddleocr-js', 'package.json')
  assert(fs.existsSync(pkgJsonPath), 'PaddleOCR package.json must exist')
  const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'))
  assert.equal(pkg.name, '@paddleocr/paddleocr-js')
  assert.equal(pkg.version, '0.4.2')
})

it('2. PaddleOCR dependencies are installed (onnxruntime-web, @techstark/opencv-js)', () => {
  const ortPkgPath = path.join(__dirname, 'node_modules', 'onnxruntime-web', 'package.json')
  const cvPkgPath = path.join(__dirname, 'node_modules', '@techstark', 'opencv-js', 'package.json')
  assert(fs.existsSync(ortPkgPath), 'onnxruntime-web must exist')
  assert(fs.existsSync(cvPkgPath), '@techstark/opencv-js must exist')
})

// SUITE 2: Strict Isolation & No Gemini/Supabase Contamination
console.log('\n--- SUITE 2: Strict Isolation & No Contamination ---')

const testPagePath = path.join(__dirname, 'src', 'pages', 'PaddleOcrTestPage.jsx')
const testPageContent = fs.readFileSync(testPagePath, 'utf8')

it('3. Test page does NOT import supabase or supabaseClient', () => {
  assert(!testPageContent.includes('supabaseClient'), 'Must not import supabaseClient')
  assert(!testPageContent.includes('@supabase/'), 'Must not import @supabase')
})

it('4. Test page does NOT import or call playerEvidenceService', () => {
  assert(!testPageContent.includes('playerEvidenceService'), 'Must not import playerEvidenceService')
  assert(!testPageContent.includes('extractFreeFireProfile'), 'Must not call extractFreeFireProfile')
  assert(!testPageContent.includes('uploadProfileProof'), 'Must not call uploadProfileProof')
})

it('5. Test page does NOT import or call Gemini or Edge Function', () => {
  assert(!testPageContent.includes('extract-free-fire-profile'), 'Must not reference Edge Function')
  assert(!testPageContent.includes('gemini'), 'Must not reference Gemini')
  assert(!testPageContent.includes('apiKey'), 'Must not contain or reference API keys')
})

it('6. Test page does NOT perform UID/IGN matching or verification', () => {
  assert(!testPageContent.includes('compareProfileUid'), 'Must not compare UID')
  assert(!testPageContent.includes('compareProfileIgn'), 'Must not compare IGN')
  assert(!testPageContent.includes('normalizeIgn'), 'Must not normalize IGN')
})

// SUITE 3: UI Requirements Compliance
console.log('\n--- SUITE 3: UI Requirements Compliance ---')

it('7. Page displays exact header "PADDLE OCR TEST"', () => {
  assert(testPageContent.includes('PADDLE OCR TEST'), 'Must display PADDLE OCR TEST')
})

it('8. Page displays mandatory safety notice', () => {
  assert(
    testPageContent.includes('PaddleOCR.js browser proof-of-concept. No profile data is changed or submitted.'),
    'Must display exact safety notice'
  )
})

it('9. Page provides [ Select Screenshot ] action', () => {
  assert(testPageContent.includes('[ Select Screenshot ]'), 'Must have [ Select Screenshot ] button/label')
  assert(testPageContent.includes('type="file"'), 'Must have file input')
})

it('10. Page provides [ RUN PADDLE OCR ] action', () => {
  assert(testPageContent.includes('RUN PADDLE OCR'), 'Must have RUN PADDLE OCR button')
})

it('11. Page implements all required status states (Idle, Loading, Processing, Complete, Error)', () => {
  assert(testPageContent.includes("'Idle'"), 'Must handle Idle status')
  assert(testPageContent.includes("'Loading'"), 'Must handle Loading status')
  assert(testPageContent.includes("'Processing'"), 'Must handle Processing status')
  assert(testPageContent.includes("'Complete'"), 'Must handle Complete status')
  assert(testPageContent.includes("'Error'"), 'Must handle Error status')
})

it('12. Page displays OCR metrics (detMs, recMs, totalMs)', () => {
  assert(testPageContent.includes('detMs'), 'Must display detMs')
  assert(testPageContent.includes('recMs'), 'Must display recMs')
  assert(testPageContent.includes('totalMs'), 'Must display totalMs')
})

it('13. Page displays detected text, confidence score, and coordinates/polygon', () => {
  assert(testPageContent.includes('Detected Text'), 'Must have column for Detected Text')
  assert(testPageContent.includes('Confidence'), 'Must have column for Confidence')
  assert(testPageContent.includes('Coordinates (Polygon)'), 'Must have column for Coordinates (Polygon)')
  assert(testPageContent.includes('item.poly'), 'Must access polygon coordinates')
  assert(testPageContent.includes('item.score'), 'Must access confidence score')
  assert(testPageContent.includes('item.text'), 'Must access text string')
})

// SUITE 4: Routing & Build Configuration
console.log('\n--- SUITE 4: Routing & Isolation Configuration ---')

const routesPath = path.join(__dirname, 'src', 'routes', 'AppRoutes.jsx')
const routesContent = fs.readFileSync(routesPath, 'utf8')

it('14. AppRoutes.jsx lazy-imports PaddleOcrTestPage', () => {
  assert(routesContent.includes("lazy(() => import('../pages/PaddleOcrTestPage'))"), 'Must lazy load test page')
})

it('15. AppRoutes.jsx mounts /test/paddle-ocr route', () => {
  assert(routesContent.includes('path="test/paddle-ocr"'), 'Must define route path test/paddle-ocr')
})

const viteConfigPath = path.join(__dirname, 'vite.config.js')
const viteConfigContent = fs.readFileSync(viteConfigPath, 'utf8')

it('16. vite.config.js isolates paddleocr into vendor-paddleocr chunk', () => {
  assert(viteConfigContent.includes("'vendor-paddleocr'"), 'Must define vendor-paddleocr manual chunk')
})

console.log('\n==================================================================')
console.log(`PADDLEOCR PROOF OF CONCEPT AUDIT: ${passed} PASSED, ${failed} FAILED`)
console.log('==================================================================\n')

if (failed > 0) {
  process.exit(1)
}
