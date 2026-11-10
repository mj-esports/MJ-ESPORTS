// test_phase8a_privacy_policy.mjs
// Automated verification for Phase 8A: Privacy Policy Audit & Update (MJ ESPORTS)

import fs from 'fs'
import path from 'path'
import assert from 'assert'

const ROOT = process.cwd()

console.log('================================================================================')
console.log('MJ ESPORTS — PHASE 8A: PRIVACY POLICY AUDIT & UPDATE TEST SUITE')
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

// 1. Last Updated Date
test('1.1. Privacy Policy displays clear Last Updated date with current implementation date', () => {
  assert(aboutPageContent.includes('Last Updated: September 18, 2026'), 'Must display Last Updated: September 18, 2026')
})

// 2. Information We Collect
test('2.1. Accurately details categories of information actually processed by MJ ESPORTS', () => {
  assert(aboutPageContent.includes('1. Information We Collect'), 'Section 1 must exist')
  assert(aboutPageContent.includes('Username, email address, password hash'), 'Account info accurately described')
  assert(aboutPageContent.includes('Free Fire in-game name (IGN) and character UID'), 'In-game identity accurately described')
  assert(aboutPageContent.includes('Team names, squad rosters, captain contact phone number'), 'Tournament details accurately described')
  assert(aboutPageContent.includes('Post-match screenshot proof uploads, reported kill counts, finish placements, and referee verification records'), 'Match evidence accurately described')
  assert(aboutPageContent.includes('Razorpay payment identifiers'), 'Payment metadata accurately described')
  assert(aboutPageContent.includes('wallet_ledger'), 'Wallet ledger reference included')
})

// 3. How We Use Information
test('3.1. Accurately details real operational tournament purposes', () => {
  assert(aboutPageContent.includes('2. How We Use Information'), 'Section 2 must exist')
  assert(aboutPageContent.includes('Authenticating user accounts'), 'Authentication purpose stated')
  assert(aboutPageContent.includes('Processing tournament registrations'), 'Registration purpose stated')
  assert(aboutPageContent.includes('Verifying player identities during match check-in'), 'Check-in verification stated')
  assert(aboutPageContent.includes('Calculating authoritative match standings'), 'Standings calculation stated')
  assert(aboutPageContent.includes('entry fee payments, wallet top-ups, tournament cancellation refunds, and withdrawal disbursements'), 'Financial operations stated')
  assert(aboutPageContent.includes('Auditing match score disputes, incident reports'), 'Dispute/incident purpose stated')
})

// 4. Publicly Displayed vs. Private Information
test('4.1. Clearly distinguishes public competition data from private personal/financial records', () => {
  assert(aboutPageContent.includes('3. Publicly Displayed vs. Private Information'), 'Section 3 must exist')
  assert(aboutPageContent.includes('Publicly Visible Details:'), 'Public details box must exist')
  assert(aboutPageContent.includes('Strictly Private Details:'), 'Private details box must exist')
  assert(aboutPageContent.includes('Account email address & hashed credentials'), 'Private credentials listed')
  assert(aboutPageContent.includes('Bank account numbers & UPI payout details (masked in UI)'), 'Masked banking details listed')
})

// 5. Payment Processing & Razorpay
test('5.1. Clarifies that Razorpay processes payments and MJ ESPORTS does not store card/UPI credentials', () => {
  assert(aboutPageContent.includes('4. Payment Processing'), 'Section 4 must exist')
  assert(aboutPageContent.includes('Razorpay'), 'Identifies Razorpay')
  assert(aboutPageContent.includes('does not collect, store, or process debit/credit card numbers, CVVs, net banking credentials, or UPI MPINs'), 'Denies sensitive credential storage')
})

// 6. Third-Party Services
test('6.1. Lists only verified third-party infrastructure actually in use', () => {
  assert(aboutPageContent.includes('5. Third-Party Services'), 'Section 5 must exist')
  assert(aboutPageContent.includes('Supabase:'), 'Lists Supabase')
  assert(aboutPageContent.includes('Razorpay:'), 'Lists Razorpay')
  assert(aboutPageContent.includes('Vercel:'), 'Lists Vercel')
  assert(aboutPageContent.includes('Google Fonts:'), 'Lists Google Fonts')
  assert(!aboutPageContent.includes('Mixpanel') && !aboutPageContent.includes('Facebook Pixel'), 'Does not list unverified services')
})

// 7. Data Security
test('7.1. Accurately details technical security measures without absolute claims', () => {
  assert(aboutPageContent.includes('6. Data Security'), 'Section 6 must exist')
  assert(aboutPageContent.includes('HTTPS/TLS encryption'), 'Details TLS encryption')
  assert(aboutPageContent.includes('Row Level Security (RLS)'), 'Details PostgreSQL RLS')
  assert(aboutPageContent.includes('no method of transmission over the internet or electronic storage is completely infallible'), 'Avoids absolute 100% security claim')
})

// 8. Data Retention
test('8.1. Explains data retention based on reasonable operational requirements', () => {
  assert(aboutPageContent.includes('7. Data Retention'), 'Section 7 must exist')
  assert(aboutPageContent.includes('Information may be retained for as long as reasonably necessary to provide the service, maintain transaction and tournament records, meet security requirements, resolve disputes, or comply with applicable obligations.'), 'Uses realistic operational retention standard')
})

// 9. Cookies & Local Storage
test('9.1. Accurately describes localStorage use and absence of marketing trackers', () => {
  assert(aboutPageContent.includes('8. Cookies & Local Storage'), 'Section 8 must exist')
  assert(aboutPageContent.includes('does not use third-party advertising cookies, cross-site trackers, or behavioral analytics cookies'), 'Disclaims third-party ad trackers')
  assert(aboutPageContent.includes('localStorage'), 'Explains localStorage usage')
})

// 10. User Rights & Contact
test('10.1. Provides clear user request mechanism using legitimate support email', () => {
  assert(aboutPageContent.includes('9. User Rights & Privacy Inquiries'), 'Section 9 must exist')
  assert(aboutPageContent.includes('support.mjesports@gmail.com'), 'Uses legitimate platform support email')
  assert(aboutPageContent.includes('mailto:support.mjesports@gmail.com?subject=MJ%20ESPORTS%20Privacy%20Request'), 'Provides clickable mailto link with clear subject')
})

// 11. Unsupported Claims Removal
test('11.1. Removed unsupported or overbroad claims', () => {
  assert(!aboutPageContent.includes('We never sell or share player contact details with third-party marketers.'), 'Removed old unsupported generic boilerplate')
})

console.log('\n================================================================================')
console.log(`PHASE 8A PRIVACY POLICY TEST RESULTS: ${passed} PASSED | ${failed} FAILED`)
console.log('================================================================================')

if (failed > 0) {
  process.exit(1)
} else {
  process.exit(0)
}
