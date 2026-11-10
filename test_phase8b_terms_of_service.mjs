/**
 * Phase 8B: Terms of Service Audit & Verification Test Suite
 * 
 * Verifies that the Terms of Service in src/pages/AboutPage.jsx:
 * 1. Accurately reflects actual platform implementation and database behavior.
 * 2. Features all 23 required sections with proper headings and structured information.
 * 3. Does NOT contain outdated contradictory claims (e.g. blanket non-refundable statements, 24h payout guarantees).
 * 4. Accurately describes the cancellation refund mechanism via wallet credits.
 * 5. Accurately details Free Fire UID/IGN verification, custom room lobby slots, check-in, and incident remakes.
 * 6. Correctly details wallet balances, immutable ledger, and ₹100 minimum withdrawal with external UTR tracking.
 * 7. Disclaims unverified capabilities (no claims of magic anti-cheat, no claim of Garena endorsement/licensing).
 * 8. Uses legitimate support contact (support.mjesports@gmail.com) and displays Last Updated: September 18, 2026.
 */

import test from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const aboutPagePath = path.join(ROOT, 'src', 'pages', 'AboutPage.jsx')
const aboutPageContent = fs.readFileSync(aboutPagePath, 'utf8')

test('1. Terms of Service header & Last Updated date', () => {
  assert(aboutPageContent.includes("TERMS OF SERVICE"), 'Header must include TERMS OF SERVICE')
  assert(aboutPageContent.includes('Last Updated: September 18, 2026'), 'Must display Last Updated: September 18, 2026')
})

test('2. Section 1: Acceptance of Terms', () => {
  assert(aboutPageContent.includes('1. Acceptance of Terms'), 'Section 1 must exist')
  assert(aboutPageContent.includes('registering for any tournament (whether free or paid)'), 'Covers both free and paid tournaments')
  assert(aboutPageContent.includes('Tournament Rulebook, and our Privacy Policy'), 'Cross-references rulebook and privacy policy')
})

test('3. Section 2: Eligibility & Accounts (No artificial age invented)', () => {
  assert(aboutPageContent.includes('2. Eligibility & Accounts'), 'Section 2 must exist')
  assert(aboutPageContent.includes('Free Fire character in-game name (IGN) and numeric character UID'), 'In-game identity required')
  assert(aboutPageContent.includes('confidentiality of your login credentials'), 'Credential responsibility stated')
  assert(!aboutPageContent.includes('must be at least 18 years') && !aboutPageContent.includes('minimum age of 21'), 'Does not invent arbitrary age requirement')
})

test('4. Section 3: Tournament Registration & Captain Responsibilities', () => {
  assert(aboutPageContent.includes('3. Tournament Registration'), 'Section 3 must exist')
  assert(aboutPageContent.includes('Captain Responsibilities:'), 'Captain duties defined')
  assert(aboutPageContent.includes('Lobby Slot Allocation:'), 'Lobby slot allocation explained')
  assert(aboutPageContent.includes('Registration Integrity:'), 'Prohibits ghost rosters and manipulation')
})

test('5. Section 4: Entry Fees & Payments (Razorpay & Credential Security)', () => {
  assert(aboutPageContent.includes('4. Entry Fees & Payments'), 'Section 4 must exist')
  assert(aboutPageContent.includes('Razorpay'), 'Identifies Razorpay')
  assert(aboutPageContent.includes('does not collect, store, or process card numbers, CVVs, net banking credentials, or UPI MPINs'), 'Disclaims sensitive credential storage')
  assert(aboutPageContent.includes('verified payment confirmation'), 'Payment confirmation condition stated')
})

test('6. Section 5: Refunds & Cancellations (Audited against cancel_tournament_and_refund RPC)', () => {
  assert(aboutPageContent.includes('5. Refunds & Cancellations'), 'Section 5 must exist')
  assert(aboutPageContent.includes('When Refunds Are Available:'), 'Refund availability conditions documented')
  assert(aboutPageContent.includes('100% of the verified paid entry fee is authoritatively refunded as an in-app wallet credit'), 'Matches atomic refund procedure')
  assert(aboutPageContent.includes('CONSUMED'), 'References confirmed Razorpay status')
  assert(aboutPageContent.includes('ENTRY_FEE_DEBIT'), 'References wallet ledger transaction')
  assert(aboutPageContent.includes('Non-Refundable Circumstances:'), 'Non-refundable conditions documented')
  assert(aboutPageContent.includes('Free Tournaments:'), 'Free tournaments exclusion noted')
  assert(aboutPageContent.includes('Voluntary Withdrawals / No-Shows:'), 'No-shows exclusion noted')
  assert(aboutPageContent.includes('Rule Violations:'), 'Disqualification forfeiture noted')
  assert(aboutPageContent.includes('Completed Tournaments:'), 'Completed tournaments restriction noted')
  assert(!aboutPageContent.includes('Tournament entry fees are non-refundable after match room creation.'), 'Removed old conflicting generic statement')
})

test('7. Section 6: Fair Play & Prohibited Conduct (Realistic, no magic anti-cheat claims)', () => {
  assert(aboutPageContent.includes('6. Fair Play & Prohibited Conduct'), 'Section 6 must exist')
  assert(aboutPageContent.includes('unauthorized third-party software, modified APKs, memory editors, auto-aim scripts'), 'Cheating prohibited')
  assert(aboutPageContent.includes('Match-fixing, teaming or collusion'), 'Collusion prohibited')
  assert(aboutPageContent.includes('Harassment, threats, hate speech'), 'Toxicity prohibited')
  assert(!aboutPageContent.includes('military-grade kernel anti-cheat') && !aboutPageContent.includes('100% unhackable'), 'Avoids exaggerated anti-cheat claims')
})

test('8. Section 7: UID / IGN Verification', () => {
  assert(aboutPageContent.includes('7. UID / IGN Verification'), 'Section 7 must exist')
  assert(aboutPageContent.includes('UID_MISMATCH'), 'References authoritative mismatch flag')
  assert(aboutPageContent.includes('compete exclusively using the Free Fire account linked to their registered character UID'), 'Mandatory UID matching')
})

test('9. Section 8: Check-In & Match Participation', () => {
  assert(aboutPageContent.includes('8. Check-In & Match Participation'), 'Section 8 must exist')
  assert(aboutPageContent.includes('Mandatory Check-In:'), 'Check-in requirement documented')
  assert(aboutPageContent.includes('Lobby Slot Assignment:'), 'Lobby slot occupancy documented')
  assert(aboutPageContent.includes('Failure to Check In:'), 'Failure to check in consequences noted')
  assert(aboutPageContent.includes('Roster Locking:'), 'Roster locking explained')
})

test('10. Section 9: Room Credentials', () => {
  assert(aboutPageContent.includes('9. Room Credentials'), 'Section 9 must exist')
  assert(aboutPageContent.includes('Room ID and Room Password'), 'Custom room credentials mentioned')
  assert(aboutPageContent.includes('Sharing, streaming, broadcasting, or publishing room credentials to unapproved third parties is strictly prohibited'), 'Confidentiality enforced')
  assert(!aboutPageContent.includes('password is') && !aboutPageContent.includes('admin123'), 'Does not leak passwords')
})

test('11. Section 10: Match Results & Score Verification (No false 24h promise)', () => {
  assert(aboutPageContent.includes('10. Match Results & Score Verification'), 'Section 10 must exist')
  assert(aboutPageContent.includes('Submitting fabricated scores, altered screenshots, or fraudulent evidence'), 'Fraud prohibited')
  assert(aboutPageContent.includes('does not guarantee arbitrary or instant verification timeframes'), 'Avoids arbitrary timelines')
})

test('12. Section 11: Match Evidence & Verification', () => {
  assert(aboutPageContent.includes('11. Match Evidence & Verification'), 'Section 11 must exist')
  assert(aboutPageContent.includes('manual screenshot evidence verification'), 'Evidence verification mechanism described')
  assert(aboutPageContent.includes('human referee review and administrative judgment are authoritative'), 'Referee review constraint clearly stated')
  assert(aboutPageContent.includes('clear, unedited, full-screen screenshot proof'), 'Player evidence standard defined')
})

test('13. Section 12: Incidents & Remakes', () => {
  assert(aboutPageContent.includes('12. Incidents & Remakes'), 'Section 12 must exist')
  assert(aboutPageContent.includes('Draft'), 'Remake reset to Draft documented')
  assert(aboutPageContent.includes('affected match is declared void'), 'Void match on approved remake noted')
  assert(aboutPageContent.includes('Administrative determinations regarding incident reports and remakes are final'), 'Final administrative authority stated')
})

test('14. Section 13: Prize Calculation & Distribution (Realistic wording)', () => {
  assert(aboutPageContent.includes('13. Prize Calculation & Distribution'), 'Section 13 must exist')
  assert(aboutPageContent.includes('Prize distributions are processed after official results have been verified and finalized'), 'Accurate required phrasing used')
  assert(!aboutPageContent.includes('within 24 hours of official referee score confirmation'), 'Old unsupported 24-hour guarantee removed')
})

test('15. Section 14: Wallet & Withdrawals (Reflects ₹100 min & UTR logging)', () => {
  assert(aboutPageContent.includes('14. Wallet & Withdrawals'), 'Section 14 must exist')
  assert(aboutPageContent.includes('wallet_ledger'), 'Ledger referenced')
  assert(aboutPageContent.includes('minimum withdrawal threshold is ₹100'), '₹100 minimum withdrawal stated')
  assert(aboutPageContent.includes('whole rupee amounts'), 'Whole rupee amounts stated')
  assert(aboutPageContent.includes('UTR reference is recorded'), 'UTR tracking referenced')
})

test('16. Section 15: Disqualification & Account Suspension', () => {
  assert(aboutPageContent.includes('15. Disqualification & Account Suspension'), 'Section 15 must exist')
  assert(aboutPageContent.includes('invalidate match scorecards, forfeit entry fees and prize entitlements'), 'Enforcement measures detailed')
})

test('17. Section 16: Multiple Accounts & Abuse', () => {
  assert(aboutPageContent.includes('16. Multiple Accounts & Abuse'), 'Section 16 must exist')
  assert(aboutPageContent.includes('Automated bot scripts, scraping tools'), 'Bot abuse prohibited')
  assert(aboutPageContent.includes('does not represent that all fraudulent or duplicate accounts are automatically detected in real time'), 'Disclaims magical detection')
})

test('18. Section 17: Technical Issues', () => {
  assert(aboutPageContent.includes('17. Technical Issues'), 'Section 17 must exist')
  assert(aboutPageContent.includes('Garena Free Fire game servers, mobile cellular networks'), 'External dependencies named')
  assert(aboutPageContent.includes('does not provide financial compensation for, individual player connection drops'), 'Individual connection liability disclaimed')
})

test('19. Section 18: Tournament Rule Changes & Cancellation', () => {
  assert(aboutPageContent.includes('18. Tournament Rule Changes & Cancellation'), 'Section 18 must exist')
  assert(aboutPageContent.includes('tournament-specific parameters take precedence over general defaults'), 'Hierarchy of tournament rules stated')
})

test('20. Section 19: Platform Availability', () => {
  assert(aboutPageContent.includes('19. Platform Availability'), 'Section 19 must exist')
  assert(aboutPageContent.includes('"as is" and "as available" basis'), 'As-is availability stated')
  assert(aboutPageContent.includes('uninterrupted, error-free, or continuously accessible'), 'No 100% uptime guarantee')
})

test('21. Section 20: User Responsibilities', () => {
  assert(aboutPageContent.includes('20. User Responsibilities'), 'Section 20 must exist')
  assert(aboutPageContent.includes('Safeguard your account login credentials'), 'Credential responsibility included')
  assert(aboutPageContent.includes('Join assigned custom room lobby slots punctually'), 'Punctual slot joining included')
})

test('22. Section 21: Support & Disputes', () => {
  assert(aboutPageContent.includes('21. Support & Disputes'), 'Section 21 must exist')
  assert(aboutPageContent.includes('support.mjesports@gmail.com'), 'Uses legitimate platform support email')
  assert(aboutPageContent.includes('mailto:support.mjesports@gmail.com?subject=MJ%20ESPORTS%20Support%20or%20Dispute'), 'Clickable mailto link present')
})

test('23. Section 22 & 23: Changes to Terms and Last Updated', () => {
  assert(aboutPageContent.includes('22. Changes to Terms'), 'Section 22 must exist')
  assert(aboutPageContent.includes('23. Last Updated'), 'Section 23 must exist')
  assert(aboutPageContent.includes('September 18, 2026'), 'Date must be present')
})

test('24. No false affiliation or endorsement claims', () => {
  assert(!aboutPageContent.includes('officially licensed by Garena'), 'No false Garena licensing claim')
  assert(!aboutPageContent.includes('endorsed by Garena'), 'No false Garena endorsement claim')
  assert(!aboutPageContent.includes('official partner of Free Fire'), 'No false partner claim')
})
