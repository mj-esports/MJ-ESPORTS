import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  isInstagramUserAgent,
  isAndroidPlatform,
  isIOSPlatform,
  buildChromeIntentUrl,
} from './src/utils/browserDetection.js'

console.log('======================================================================')
console.log('MJ ESPORTS: Instagram In-App Browser Prompt Regression Suite')
console.log('======================================================================')

let passed = 0
let total = 0

function test(name, fn) {
  total++
  try {
    fn()
    console.log(`  ✓ ${name}`)
    passed++
  } catch (err) {
    console.error(`  ✗ ${name}`)
    console.error(`    ${err.message}`)
  }
}

// -----------------------------------------------------------------------------
// GROUP 1: User-Agent Detection Invariants
// -----------------------------------------------------------------------------
console.log('\n--- GROUP 1: User-Agent & Platform Detection Invariants ---')

const IG_ANDROID_UA =
  'Mozilla/5.0 (Linux; Android 14; SM-S918B Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.6099.230 Mobile Safari/537.36 Instagram 312.1.0.34.111 Android (34/14; 480dpi; 1080x2340; samsung; SM-S918B; dm3q; qcom; en_US; 551917725)'

const IG_IOS_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 312.1.0.34.111 (iPhone15,2; iOS 17_2; en_US; en-US; scale=3.00; 1179x2556; 551917725)'

const CHROME_ANDROID_UA =
  'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'

const SAFARI_IOS_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1'

const DESKTOP_CHROME_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

test('1.1. Correctly detects Instagram Android browser', () => {
  assert.equal(isInstagramUserAgent(IG_ANDROID_UA), true)
  assert.equal(isAndroidPlatform(IG_ANDROID_UA), true)
  assert.equal(isIOSPlatform(IG_ANDROID_UA), false)
})

test('1.2. Correctly detects Instagram iOS browser', () => {
  assert.equal(isInstagramUserAgent(IG_IOS_UA), true)
  assert.equal(isAndroidPlatform(IG_IOS_UA), false)
  assert.equal(isIOSPlatform(IG_IOS_UA), true)
})

test('1.3. Rejects standard Chrome Android browser (not Instagram)', () => {
  assert.equal(isInstagramUserAgent(CHROME_ANDROID_UA), false)
  assert.equal(isAndroidPlatform(CHROME_ANDROID_UA), true)
  assert.equal(isIOSPlatform(CHROME_ANDROID_UA), false)
})

test('1.4. Rejects standard Safari iOS browser (not Instagram)', () => {
  assert.equal(isInstagramUserAgent(SAFARI_IOS_UA), false)
  assert.equal(isAndroidPlatform(SAFARI_IOS_UA), false)
  assert.equal(isIOSPlatform(SAFARI_IOS_UA), true)
})

test('1.5. Rejects standard desktop Chrome browser', () => {
  assert.equal(isInstagramUserAgent(DESKTOP_CHROME_UA), false)
  assert.equal(isAndroidPlatform(DESKTOP_CHROME_UA), false)
  assert.equal(isIOSPlatform(DESKTOP_CHROME_UA), false)
})

test('1.6. Handles empty, null, or malformed user agent safely', () => {
  assert.equal(isInstagramUserAgent(''), false)
  assert.equal(isInstagramUserAgent(null), false)
  assert.equal(isInstagramUserAgent(undefined), false)
  assert.equal(isAndroidPlatform(''), false)
  assert.equal(isIOSPlatform(''), false)
})

// -----------------------------------------------------------------------------
// GROUP 2: Chrome Android Intent URI Builder
// -----------------------------------------------------------------------------
console.log('\n--- GROUP 2: Chrome Android Intent URI Builder ---')

test('2.1. Builds valid Chrome Intent URI for simple homepage URL', () => {
  const url = 'https://mj-esports.vercel.app/'
  const intent = buildChromeIntentUrl(url)
  assert.equal(
    intent,
    'intent://mj-esports.vercel.app/#Intent;scheme=https;package=com.android.chrome;end'
  )
})

test('2.2. Preserves path, multiple query parameters, and hash fragment', () => {
  const url = 'https://mj-esports.vercel.app/tournaments/t-101?ref=ig_bio&squad=solo#register'
  const intent = buildChromeIntentUrl(url)
  assert.equal(
    intent,
    'intent://mj-esports.vercel.app/tournaments/t-101?ref=ig_bio&squad=solo#register#Intent;scheme=https;package=com.android.chrome;end'
  )
})

test('2.3. Correctly handles HTTP URLs for local dev testing', () => {
  const url = 'http://localhost:5173/tournaments?tab=live'
  const intent = buildChromeIntentUrl(url)
  assert.equal(
    intent,
    'intent://localhost:5173/tournaments?tab=live#Intent;scheme=http;package=com.android.chrome;end'
  )
})

test('2.4. Contains exact package=com.android.chrome directive', () => {
  const intent = buildChromeIntentUrl('https://mj-esports.vercel.app')
  assert.ok(intent.includes('package=com.android.chrome'))
  assert.ok(intent.startsWith('intent://'))
  assert.ok(intent.endsWith('#Intent;scheme=https;package=com.android.chrome;end'))
})

test('2.5. Automatically encodes special characters in URL path and query parameters', () => {
  const url = 'https://mj-esports.vercel.app/tournaments?game=Free Fire MAX&squad=Pro Squad'
  const intent = buildChromeIntentUrl(url)
  assert.ok(intent.includes('Free%20Fire%20MAX'))
  assert.ok(intent.includes('Pro%20Squad'))
  assert.ok(intent.endsWith('#Intent;scheme=https;package=com.android.chrome;end'))
})

// -----------------------------------------------------------------------------
// GROUP 3: Component Source & Architecture Static Audit
// -----------------------------------------------------------------------------
console.log('\n--- GROUP 3: Component Source & Architecture Static Audit ---')

const promptPath = path.resolve('src/components/common/InstagramBrowserPrompt.jsx')
const appPath = path.resolve('src/App.jsx')

const promptContent = fs.readFileSync(promptPath, 'utf8')
const appContent = fs.readFileSync(appPath, 'utf8')

test('3.1. App.jsx mounts InstagramBrowserPrompt globally', () => {
  assert.ok(appContent.includes('import InstagramBrowserPrompt from'), 'App.jsx must import InstagramBrowserPrompt')
  assert.ok(appContent.includes('<InstagramBrowserPrompt />'), 'App.jsx must render <InstagramBrowserPrompt />')
})

test('3.2. InstagramBrowserPrompt uses dedicated sessionStorage dismiss key', () => {
  assert.ok(
    promptContent.includes('mj_ig_browser_prompt_dismissed'),
    'Must use mj_ig_browser_prompt_dismissed key'
  )
  assert.ok(
    promptContent.includes('sessionStorage.setItem'),
    'Must store dismissal in sessionStorage'
  )
})

test('3.3. Provides explicit "Continue in Instagram" option', () => {
  assert.ok(
    promptContent.includes('Continue in Instagram'),
    'Must contain Continue in Instagram option'
  )
})

test('3.4. Displays "OPEN IN GOOGLE CHROME" on Android with intent URI', () => {
  assert.ok(
    promptContent.includes('OPEN IN GOOGLE CHROME'),
    'Must contain OPEN IN GOOGLE CHROME action'
  )
  assert.ok(
    promptContent.includes('chromeIntentUrl'),
    'Must bind chromeIntentUrl to anchor'
  )
})

test('3.5. Includes fallback message & copy link option for Android', () => {
  assert.ok(
    promptContent.includes('showFallback') || promptContent.includes('setShowFallback'),
    'Must implement fallback state'
  )
  assert.ok(
    promptContent.includes('COPY WEBSITE LINK') || promptContent.includes('handleCopyLink'),
    'Must provide copy link helper'
  )
})

test('3.6. Displays visual instructions for iOS external browser (Safari)', () => {
  assert.ok(
    promptContent.includes('Open in Safari') || promptContent.includes('How to open in Safari'),
    'Must guide iOS users to Open in Safari'
  )
  assert.ok(
    promptContent.includes('three dots'),
    'Must mention three dots menu'
  )
})

test('3.7. Preserves Supabase Auth, FamGateway payments, and Tournament flows intact', () => {
  // Confirm prompt does not touch any payment or auth state
  assert.ok(!promptContent.includes('supabase.auth.signOut'), 'Must not alter auth state')
  assert.ok(!promptContent.includes('createFamgatewayOrder'), 'Must not alter payment flow')
  assert.ok(!promptContent.includes('verifyFamgatewayPayment'), 'Must not alter payment verification')
})

test('3.8. Guards sessionStorage initialization against SecurityError / DOMException', () => {
  assert.ok(
    promptContent.includes('try {') && promptContent.includes('window.sessionStorage.getItem'),
    'Must wrap sessionStorage.getItem in try/catch'
  )
})

test('3.9. Cleans up timers and document visibilitychange listeners on unmount', () => {
  assert.ok(
    promptContent.includes('fallbackTimerRef') && promptContent.includes('clearTimeout'),
    'Must clean up fallback timers on unmount'
  )
  assert.ok(
    promptContent.includes('removeEventListener(\'visibilitychange\''),
    'Must clean up visibilitychange listener on unmount'
  )
})

// -----------------------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------------------
console.log('\n======================================================================')
console.log(`TOTAL CHECKS: ${total}`)
console.log(`PASSED: ${passed}`)
console.log(`FAILED: ${total - passed}`)
console.log('======================================================================')

if (passed === total) {
  console.log('ALL INSTAGRAM BROWSER PROMPT CHECKS PASSED!')
  process.exit(0)
} else {
  console.error('SOME CHECKS FAILED!')
  process.exit(1)
}

