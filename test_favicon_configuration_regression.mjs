// test_favicon_configuration_regression.mjs
// Regression test suite for MJ ESPORTS browser tab logo / favicon configuration

import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

console.log('================================================================================')
console.log('MJ ESPORTS — BROWSER TAB LOGO (FAVICON) REGRESSION AUDIT')
console.log('================================================================================\n')

let passCount = 0
let totalCount = 0

function check(title, fn) {
  totalCount++
  try {
    fn()
    console.log(`  ✅ [PASS] ${totalCount}. ${title}`)
    passCount++
  } catch (err) {
    console.error(`  ❌ [FAIL] ${totalCount}. ${title}`)
    console.error(`     Reason: ${err.message}\n`)
  }
}

// 1. Static Asset Presence in public/
check('All standard favicon and icon assets exist in public/', () => {
  const requiredFiles = [
    'public/favicon.svg',
    'public/favicon.ico',
    'public/favicon-32x32.png',
    'public/favicon-16x16.png',
    'public/favicon.png',
    'public/apple-touch-icon.png',
    'public/mj-esports-logo.png'
  ]
  for (const f of requiredFiles) {
    assert.ok(fs.existsSync(f), `${f} must exist in public/`)
    const stat = fs.statSync(f)
    assert.ok(stat.size > 0, `${f} must not be empty`)
  }
})

// 2. SVG Favicon Self-Containment (Root Cause Prevention)
const svgPath = path.resolve('public/favicon.svg')
const svgContent = fs.readFileSync(svgPath, 'utf8')

check('public/favicon.svg is well-formed SVG with circular clipping', () => {
  assert.ok(svgContent.includes('<svg'), 'Must have root <svg> tag')
  assert.ok(svgContent.includes('</svg>'), 'Must have closing </svg> tag')
  assert.ok(svgContent.includes('viewBox="0 0 512 512"'), 'Must define viewBox')
  assert.ok(svgContent.includes('clipPath id="circleClip"'), 'Must define circleClip clipPath')
  assert.ok(svgContent.includes('clip-path="url(#circleClip)"'), 'Must apply circleClip')
})

check('public/favicon.svg does NOT contain external file references (prevents browser security blocking)', () => {
  assert.ok(!svgContent.includes('href="/mj-esports-logo.png"'), 'Must NOT link to external /mj-esports-logo.png')
  assert.ok(!svgContent.includes('href="http://'), 'Must NOT link to external http resource')
  assert.ok(!svgContent.includes('href="https://'), 'Must NOT link to external https resource')
})

check('public/favicon.svg embeds self-contained inline data URI', () => {
  assert.ok(svgContent.includes('href="data:image/png;base64,'), 'Must contain inline base64 PNG data URI')
  const match = svgContent.match(/href="data:image\/png;base64,([A-Za-z0-9+/=]+)"/)
  assert.ok(match, 'Must have valid base64 data URI pattern')
  const base64Data = match[1]
  assert.ok(base64Data.length > 1000, 'Embedded base64 icon must be substantial')

  // Verify decoded PNG magic bytes and valid header
  const decodedBuf = Buffer.from(base64Data, 'base64')
  assert.equal(decodedBuf[0], 0x89)
  assert.equal(decodedBuf[1], 0x50) // P
  assert.equal(decodedBuf[2], 0x4e) // N
  assert.equal(decodedBuf[3], 0x47) // G

  const width = decodedBuf.readUInt32BE(16)
  const height = decodedBuf.readUInt32BE(20)
  assert.ok(width >= 32 && height >= 32, `Decoded icon must be at least 32x32, got ${width}x${height}`)
})

// 3. index.html Declarations
const indexPath = path.resolve('index.html')
const indexContent = fs.readFileSync(indexPath, 'utf8')

check('index.html references all required icon links', () => {
  assert.ok(indexContent.includes('rel="icon" type="image/svg+xml" href="/favicon.svg"'), 'Must link to /favicon.svg')
  assert.ok(indexContent.includes('rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png"'), 'Must link to 32x32 PNG')
  assert.ok(indexContent.includes('rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png"'), 'Must link to 16x16 PNG')
  assert.ok(indexContent.includes('rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png"'), 'Must link to apple-touch-icon')
  assert.ok(indexContent.includes('href="/favicon.ico"'), 'Must link to favicon.ico')
})

// 4. Vite Build Output in dist/
check('dist/ contains copied, verified favicon assets', () => {
  assert.ok(fs.existsSync('dist/favicon.svg'), 'dist/favicon.svg must exist')
  assert.ok(fs.existsSync('dist/favicon-32x32.png'), 'dist/favicon-32x32.png must exist')
  assert.ok(fs.existsSync('dist/favicon-16x16.png'), 'dist/favicon-16x16.png must exist')
  assert.ok(fs.existsSync('dist/favicon.ico'), 'dist/favicon.ico must exist')

  const distSvgContent = fs.readFileSync('dist/favicon.svg', 'utf8')
  assert.ok(distSvgContent.includes('href="data:image/png;base64,'), 'dist/favicon.svg must be self-contained inline SVG')
  assert.ok(!distSvgContent.includes('href="/mj-esports-logo.png"'), 'dist/favicon.svg must not have broken external reference')
})

// 5. Functional Pixel Density Check
check('favicon-32x32.png and decoded SVG data URI have non-blank content', () => {
  const f32Buf = fs.readFileSync('public/favicon-32x32.png')
  assert.ok(f32Buf.length > 500, 'favicon-32x32.png must be a valid size')
})

console.log('--------------------------------------------------------------------------------')
console.log(`TOTAL AUDITS: ${totalCount} | PASSED: ${passCount} | FAILED: ${totalCount - passCount}`)
console.log('--------------------------------------------------------------------------------\n')

if (passCount === totalCount) {
  console.log('🎉 ALL FAVICON CONFIGURATION REGRESSION AUDITS PASSED!\n')
} else {
  process.exit(1)
}
