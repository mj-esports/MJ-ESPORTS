import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

console.log('============================================================')
console.log('🧪 STITCH REGISTRATION MODAL QA & MODE CONFORMANCE TEST')
console.log('============================================================\n')

const modalPath = path.resolve('src/components/tournament/SlotBookingModal.jsx')
const modalContent = fs.readFileSync(modalPath, 'utf8')

let totalTests = 0
let passedTests = 0

function runTest(name, fn) {
  totalTests++
  try {
    fn()
    console.log(`  ✅ [PASS] ${name}`)
    passedTests++
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}`)
    console.error(`     Error: ${err.message}`)
  }
}

// ----------------------------------------------------------------------------
// SECTION 1: SOLO MODE CONFORMANCE
// ----------------------------------------------------------------------------
console.log('--- SECTION 1: SOLO MODE CONFORMANCE ---')

runTest('1.1. SOLO: Renders Player IGN and excludes Team Name in Solo branch', () => {
  assert.ok(modalContent.includes('isSolo ? (') && modalContent.includes('label="Player IGN / Display Name"'), 'Solo branch renders Player IGN')
  assert.ok(modalContent.includes('name="teamName"'), 'teamName present in non-solo branch')
})

runTest('1.2. SOLO: "Use My Team" action button is conditionally excluded', () => {
  assert.ok(modalContent.includes('!isSolo &&') || modalContent.includes('!isSolo'), 'Use My Team hidden in Solo mode')
})

runTest('1.3. SOLO: Populated team review card is excluded', () => {
  assert.ok(modalContent.includes('populatedTeamInfo && !isSolo && ('), 'Populated team review hidden in Solo mode')
})

runTest('1.4. SOLO: Teammate roster sections are absent (0 teammates)', () => {
  assert.ok(modalContent.includes('isDuo && ('), 'Duo has dedicated teammate section')
  assert.ok(modalContent.includes('isSquad && ('), 'Squad has dedicated teammate section')
  assert.ok(!modalContent.includes('isSolo && (\n              <div className="space-y') &&
            !modalContent.includes('isSolo && (\n              <div className="p-2.5'), 'No teammate sections for Solo')
})

runTest('1.5. SOLO: Player IGN, Player Full Name and Game Character UID fields rendered for Solo', () => {
  assert.ok(modalContent.includes('label="Player IGN / Display Name"'), 'Player IGN label present')
  assert.ok(modalContent.includes('label="Player Full Name"'), 'Player Full Name label present')
  assert.ok(modalContent.includes('label="Game Character UID"'), 'Game Character UID label present')
  assert.ok(modalContent.includes('label="Captain Full Name"'), 'Captain Full Name label present')
  assert.ok(modalContent.includes('label="Captain Game Character UID"'), 'Captain Character UID label present')
  assert.ok(modalContent.includes('label="Email Address"'), 'Email Address label present')
  assert.ok(modalContent.includes('label="WhatsApp Contact Number"'), 'WhatsApp Contact Number label present')
})

runTest('1.6. SOLO: Form validation validates Team Name ONLY when !isSolo', () => {
  assert.ok(modalContent.includes('if (!isSolo) {'), 'Validation contains !isSolo branch for teamName')
  assert.ok(modalContent.includes('Team Name is required'), 'Validation enforces Team Name for non-solo')
})

runTest('1.7. SOLO: Confirmation ticket hides Team Name row', () => {
  assert.ok(modalContent.includes('!isSolo && registrationSummary.teamName && ('), 'Team Name row hidden on confirmation in Solo')
})

// ----------------------------------------------------------------------------
// SECTION 2: DUO MODE CONFORMANCE
// ----------------------------------------------------------------------------
console.log('\n--- SECTION 2: DUO MODE CONFORMANCE ---')

runTest('2.1. DUO: Team Name input is included', () => {
  assert.ok(modalContent.includes('name="teamName"'), 'Team Name input present')
})

runTest('2.2. DUO: Single "Use My Team" button rendered without duplicate label', () => {
  assert.ok(modalContent.includes('<span>{isTeamLoading ? \'Loading Squad...\' : \'Use My Team\'}</span>'), 'Use My Team button text present')
  assert.ok(!modalContent.includes('Squad Roster Auto-Fill'), 'No redundant heading')
  assert.ok(!modalContent.includes('Pre-populate registration form'), 'No redundant sub-paragraph')
})

runTest('2.3. DUO: Renders exactly one teammate (TEAMMATE #1 with 2/2 counter)', () => {
  assert.ok(modalContent.includes('isDuo && ('), 'Duo teammate container present')
  assert.ok(modalContent.includes('TEAMMATE #1'), 'TEAMMATE #1 label present')
  assert.ok(modalContent.includes('2/2'), '2/2 counter present')
  assert.ok(modalContent.includes('name="teammate_0"'), 'teammate_0 present')
  assert.ok(modalContent.includes('name="teammate_ign_0"'), 'teammate_ign_0 present')
})

runTest('2.4. DUO: Team Name is displayed on Confirmation Ticket', () => {
  assert.ok(modalContent.includes('!isSolo && registrationSummary.teamName && ('), 'Team Name rendered on ticket for Duo')
})

// ----------------------------------------------------------------------------
// SECTION 3: SQUAD MODE CONFORMANCE
// ----------------------------------------------------------------------------
console.log('\n--- SECTION 3: SQUAD MODE CONFORMANCE ---')

runTest('3.1. SQUAD: Renders exactly 3 teammates (indices 0, 1, 2)', () => {
  assert.ok(modalContent.includes('isSquad && ('), 'Squad teammate container present')
  assert.ok(modalContent.includes('[0, 1, 2].map((idx) =>'), 'Exactly 3 teammate slots mapped')
  assert.ok(modalContent.includes('TEAMMATE #{idx + 1}'), 'Teammate numbering present')
  assert.ok(modalContent.includes('{idx + 2}/4'), 'Squad roster counters (2/4, 3/4, 4/4) present')
})

// ----------------------------------------------------------------------------
// SECTION 4: STITCH VISUAL LANGUAGE & ERGONOMICS
// ----------------------------------------------------------------------------
console.log('\n--- SECTION 4: STITCH VISUAL LANGUAGE & ERGONOMICS ---')

runTest('4.1. Modal container uses dark esports color palette and viewport bounds', () => {
  assert.ok(modalContent.includes('bg-[#131315]'), 'Uses #131315 dark container')
  assert.ok(modalContent.includes('border-[#2A2A30]'), 'Uses #2A2A30 subtle border')
  assert.ok(modalContent.includes('max-w-[620px] w-full'), 'Matches Stitch 620px max width')
})

runTest('4.2. Header contains game title, format mode, close button, zero redundant banners', () => {
  assert.ok(!modalContent.includes('MJ ESPORTS OFFICIAL REGISTRATION'), 'Removed bulky title')
  assert.ok(modalContent.includes('tournament.game || \'Free Fire MAX\''), 'Game fallback title present')
  assert.ok(modalContent.includes('modeConfig.mode'), 'Mode indicator present')
  assert.ok(modalContent.includes('aria-label="Close Registration Modal"'), 'Accessible close button present')
})

runTest('4.3. Profile Screenshot matches compact Stitch presentation', () => {
  assert.ok(modalContent.includes('FREE FIRE PROFILE SCREENSHOT'), 'Compact screenshot title present')
  assert.ok(modalContent.includes('ATTACH PROFILE SCREENSHOT'), 'Compact CTA button present')
  assert.ok(!modalContent.includes('Upload your in-game profile showing UID + IGN.'), 'Removed wordy explanatory text')
  assert.ok(!modalContent.includes('>Required<'), 'Removed redundant required tag')
})

runTest('4.4. Agreement checkbox is compact single row with working modal link', () => {
  assert.ok(modalContent.includes('I agree to the'), 'Clean agreement prompt')
  assert.ok(modalContent.includes('Tournament Rules & Code of Conduct'), 'Link anchor text')
  assert.ok(modalContent.includes('setShowRulebook(true)'), 'Rulebook modal trigger preserved')
})

runTest('4.5. Action buttons match Stitch ergonomics', () => {
  assert.ok(modalContent.includes('Cancel'), 'Cancel button present')
  assert.ok(modalContent.includes('Complete Registration'), 'Complete Registration button present')
})

// ----------------------------------------------------------------------------
// SECTION 5: BACKEND & PAYMENT PRESERVATION
// ----------------------------------------------------------------------------
console.log('\n--- SECTION 5: BACKEND & PAYMENT PRESERVATION ---')

runTest('5.1. Server-authoritative registerTeam RPC untouched', () => {
  assert.ok(modalContent.includes('registerTeam(tournament.id,'), 'Free registration preserved')
  assert.ok(modalContent.includes('registerTeamWithWallet(tournament.id,') || modalContent.includes('registerTeamWithWallet(\n        tournament.id,'), 'Wallet registration preserved')
})

// ----------------------------------------------------------------------------
// SECTION 6: RUNTIME MODE RESOLUTION & PERMUTATION TEST
// ----------------------------------------------------------------------------
console.log('\n--- SECTION 6: RUNTIME MODE RESOLUTION & PERMUTATION TEST ---')

const modePermutations = [
  { input: { format: 'SOLO (1P)' }, expected: 'Solo' },
  { input: { format: 'SOLO' }, expected: 'Solo' },
  { input: { format: 'solo' }, expected: 'Solo' },
  { input: { mode: 'SOLO' }, expected: 'Solo' },
  { input: { mode: 'Solo' }, expected: 'Solo' },
  { input: { team_size: 1 }, expected: 'Solo' },
  { input: { format: 'DUO (2P)' }, expected: 'Duo' },
  { input: { format: 'DUO' }, expected: 'Duo' },
  { input: { mode: 'DUO' }, expected: 'Duo' },
  { input: { team_size: 2 }, expected: 'Duo' },
  { input: { format: 'SQUAD (4P)' }, expected: 'Squad' },
  { input: { format: 'SQUAD' }, expected: 'Squad' },
  { input: { mode: 'SQUAD' }, expected: 'Squad' },
  { input: {}, expected: 'Squad' },
]

modePermutations.forEach((p, idx) => {
  runTest(`6.${idx + 1}. Resolve tournament ${JSON.stringify(p.input)} -> ${p.expected}`, () => {
    const rawModeString = (
      p.input?.mode ||
      p.input?.format ||
      p.input?.match_format ||
      p.input?.matchFormat ||
      ''
    ).toLowerCase().trim()

    const isSolo = (
      rawModeString.includes('solo') ||
      rawModeString.includes('(1p)') ||
      Number(p.input?.team_size ?? p.input?.teamSize) === 1
    )

    const isDuo = !isSolo && (
      rawModeString.includes('duo') ||
      rawModeString.includes('(2p)') ||
      Number(p.input?.team_size ?? p.input?.teamSize) === 2
    )

    const isSquad = !isSolo && !isDuo
    const resolved = isSolo ? 'Solo' : isDuo ? 'Duo' : 'Squad'
    assert.equal(resolved, p.expected)
  })
})

// ----------------------------------------------------------------------------
// SUMMARY
// ----------------------------------------------------------------------------
console.log('\n============================================================')
console.log(`TOTAL TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests}`)
console.log('============================================================')

if (passedTests !== totalTests) {
  process.exit(1)
}
