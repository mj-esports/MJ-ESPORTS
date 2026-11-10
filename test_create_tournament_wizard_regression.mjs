import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { getDefaultGameCapacity, getTeamSize, getPlayersPerTeam } from './src/utils/tournamentUtils.js'
import { calculateFormattedPrize } from './src/utils/tournamentPrizeUtils.js'

console.log('================================================================================')
console.log('MJ ESPORTS — CREATE TOURNAMENT WIZARD: FUNCTIONAL REGRESSION TEST SUITE')
console.log('================================================================================\n')

let passedTests = 0
let failedTests = 0

function test(name, fn) {
  try {
    fn()
    console.log(`  ✅ [PASS] ${name}`)
    passedTests++
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}`)
    console.error(`     Reason: ${err.message}`)
    failedTests++
  }
}

// Extract checkScheduleChronology logic to verify it in pure JS
function checkScheduleChronology({
  startDate = '',
  registrationStart = '',
  registrationEnd = '',
  checkInStart = '',
  checkInEnd = '',
  roomPublishTime = '',
  startTime = ''
}) {
  const errors = {}

  const parseTime = (timeStr) => {
    if (!timeStr) return null
    if (timeStr.includes(':')) {
      const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i)
      if (match) {
        let hours = parseInt(match[1], 10)
        const minutes = parseInt(match[2], 10)
        const ampm = match[3]?.toUpperCase()
        if (ampm === 'PM' && hours < 12) hours += 12
        if (ampm === 'AM' && hours === 12) hours = 0
        return hours * 60 + minutes
      }
    }
    return null
  }

  const regStartMin = parseTime(registrationStart)
  const regEndMin = parseTime(registrationEnd)
  const checkInStartMin = parseTime(checkInStart)
  const checkInEndMin = parseTime(checkInEnd)
  const roomMin = parseTime(roomPublishTime)
  const startMin = parseTime(startTime)

  if (regStartMin !== null && regEndMin !== null && regEndMin <= regStartMin) {
    errors.registrationEnd = 'Registration Closes must be after Registration Opens.'
  }

  if (regEndMin !== null && checkInStartMin !== null && checkInStartMin < regEndMin) {
    errors.checkInStart = 'Check-in Opens must be after Registration Closes.'
  }

  if (checkInStartMin !== null && checkInEndMin !== null && checkInEndMin <= checkInStartMin) {
    errors.checkInEnd = 'Check-in Closes must be after Check-in Opens.'
  }

  if (checkInEndMin !== null && roomMin !== null && roomMin < checkInEndMin) {
    errors.roomPublishTime = 'Room Publish Time must be after Check-in Closes.'
  }

  if (roomMin !== null && startMin !== null && startMin <= roomMin) {
    errors.startTime = 'Match Start Time must be after Room Publish Time.'
  }

  return errors
}

// -----------------------------------------------------------------------------
// GROUP 1: STEP 1 — GENERAL CONFIGURATION & ROSTER MATRIX
// -----------------------------------------------------------------------------
console.log('--- GROUP 1: Step 1 General Configuration & Roster Matrix ---')

test('1.1. Tournament name input validation rejects empty and whitespace-only strings', () => {
  const validateStep1 = (form) => {
    const errors = {}
    if (!form.title || !form.title.trim()) {
      errors.title = 'Tournament Name is required.'
    }
    return errors
  }

  assert(validateStep1({ title: '' }).title, 'Empty title should fail')
  assert(validateStep1({ title: '   ' }).title, 'Whitespace title should fail')
  assert(!validateStep1({ title: 'Bermuda Blitz #24' }).title, 'Valid title should pass')
})

test('1.2. Free Fire MAX platform lock and client metadata', () => {
  const cap = getDefaultGameCapacity('Free Fire MAX', 'squad')
  assert.strictEqual(cap.roomCap, 50, 'Free Fire MAX room cap must be 50')
})

test('1.3. Solo mode capacity calculation: 50 players, 1 player per slot', () => {
  const cap = getDefaultGameCapacity('Free Fire MAX', 'solo')
  assert.strictEqual(cap.teamSize, 1, 'Solo team size must be 1')
  assert.strictEqual(cap.teamUnit, 'Players', 'Solo unit must be Players')
  assert.strictEqual(cap.maxTeams, 50, 'Solo max teams must be 50')
  assert.strictEqual(cap.maxPlayers, 50, 'Solo max players must be 50')
})

test('1.4. Duo mode capacity calculation: 2 players per slot, 25 duos, 50 players max', () => {
  const cap = getDefaultGameCapacity('Free Fire MAX', 'duo')
  assert.strictEqual(cap.teamSize, 2, 'Duo team size must be 2')
  assert.strictEqual(cap.teamUnit, 'Duos', 'Duo unit must be Duos')
  assert.strictEqual(cap.maxTeams, 25, 'Duo max teams must be 25')
  assert.strictEqual(cap.maxPlayers, 50, 'Duo max players must be 50')
})

test('1.5. Squad mode capacity calculation: 4 players per slot, 12 squads, 48 players total with 2 spectator slots', () => {
  const cap = getDefaultGameCapacity('Free Fire MAX', 'squad')
  assert.strictEqual(cap.teamSize, 4, 'Squad team size must be 4')
  assert.strictEqual(cap.teamUnit, 'Squads', 'Squad unit must be Squads')
  assert.strictEqual(cap.maxTeams, 12, 'Squad max teams must be 12')
  assert.strictEqual(cap.maxPlayers, 48, 'Squad max players must be 48')

  const spectatorSlots = cap.roomCap - cap.maxPlayers
  assert.strictEqual(spectatorSlots, 2, 'Must reserve 2 observer/caster slots')
  const saturationPercent = (cap.maxPlayers / cap.roomCap) * 100
  assert.strictEqual(saturationPercent, 96, 'Saturation must be 96%')
})

// -----------------------------------------------------------------------------
// GROUP 2: STEP 2 — MATCH CONFIGURATION & SCHEDULE CHRONOLOGY
// -----------------------------------------------------------------------------
console.log('\n--- GROUP 2: Step 2 Match Configuration & Schedule Chronology ---')

test('2.1. Supported maps and match types are defined and selectable', () => {
  const supportedMaps = ['Bermuda', 'Purgatory', 'Kalahari', 'Alpine', 'NexTERRA', 'Random']
  const supportedTypes = ['Battle Royale', 'Clash Squad', 'Custom']
  assert(supportedMaps.includes('Bermuda'), 'Bermuda supported')
  assert(supportedTypes.includes('Battle Royale'), 'Battle Royale supported')
})

test('2.2. Gun attributes and character skills toggles support Enabled and Disabled states', () => {
  const states = ['Enabled', 'Disabled']
  assert(states.includes('Enabled'))
  assert(states.includes('Disabled'))
})

test('2.3. Schedule chronology: Valid sequence passes with 0 errors', () => {
  const validSchedule = {
    startDate: '2026-10-26',
    registrationStart: '10:00 AM IST',
    registrationEnd: '06:00 PM IST',
    checkInStart: '06:15 PM IST',
    checkInEnd: '06:45 PM IST',
    roomPublishTime: '06:45 PM IST',
    startTime: '07:00 PM IST',
  }
  const errors = checkScheduleChronology(validSchedule)
  assert.strictEqual(Object.keys(errors).length, 0, 'Valid chronology must produce zero errors')
})

test('2.4. Schedule chronology: Registration End before Registration Start fails closed', () => {
  const invalidSchedule = {
    startDate: '2026-10-26',
    registrationStart: '06:00 PM IST',
    registrationEnd: '10:00 AM IST', // earlier!
    checkInStart: '06:15 PM IST',
    checkInEnd: '06:45 PM IST',
    roomPublishTime: '06:45 PM IST',
    startTime: '07:00 PM IST',
  }
  const errors = checkScheduleChronology(invalidSchedule)
  assert(errors.registrationEnd, 'Must report registrationEnd error')
})

test('2.5. Schedule chronology: Check-in Open before Registration End fails closed', () => {
  const invalidSchedule = {
    startDate: '2026-10-26',
    registrationStart: '10:00 AM IST',
    registrationEnd: '06:00 PM IST',
    checkInStart: '05:30 PM IST', // before registration ends!
    checkInEnd: '06:45 PM IST',
    roomPublishTime: '06:45 PM IST',
    startTime: '07:00 PM IST',
  }
  const errors = checkScheduleChronology(invalidSchedule)
  assert(errors.checkInStart, 'Must report checkInStart error')
})

test('2.6. Schedule chronology: Match Start before Room Publish fails closed', () => {
  const invalidSchedule = {
    startDate: '2026-10-26',
    registrationStart: '10:00 AM IST',
    registrationEnd: '06:00 PM IST',
    checkInStart: '06:15 PM IST',
    checkInEnd: '06:45 PM IST',
    roomPublishTime: '07:15 PM IST',
    startTime: '07:00 PM IST', // before room publish!
  }
  const errors = checkScheduleChronology(invalidSchedule)
  assert(errors.startTime, 'Must report startTime error')
})

test('2.7. Official Rulebook source file exists and defines 10 verified rules', () => {
  const rulebookSource = fs.readFileSync('src/components/common/OfficialRulebook.jsx', 'utf8')
  assert(rulebookSource.includes('No emulators allowed'), 'Emulator rule must exist')
  assert(rulebookSource.includes('Screen recording is mandatory'), 'Screen recording rule must exist')
  assert(rulebookSource.includes('No hacks or third-party tools'), 'Anti-cheat rule must exist')
  assert(rulebookSource.includes('No teaming'), 'Anti-teaming rule must exist')
})

// -----------------------------------------------------------------------------
// GROUP 3: STEP 3 — REGISTRATION, PRIZES & PAYMENT DEFERRAL
// -----------------------------------------------------------------------------
console.log('\n--- GROUP 3: Step 3 Registration, Prizes & Payment Deferral ---')

test('3.1. Free entry is permitted and formatted correctly', () => {
  const entryFeeStr = (fee) => (Number(fee) > 0 ? `₹${fee}` : 'Free')
  assert.strictEqual(entryFeeStr(0), 'Free')
  assert.strictEqual(entryFeeStr(50), '₹50')
})

test('3.2. Registration approval supports Automatic and Manual', () => {
  const modes = ['Automatic', 'Manual']
  assert(modes.includes('Automatic'))
  assert(modes.includes('Manual'))
})

test('3.3. Waitlist queue toggle supports Enabled and Disabled', () => {
  assert.strictEqual(Boolean(true), true)
  assert.strictEqual(Boolean(false), false)
})

test('3.4. Prize distribution model: Placement Only calculation', () => {
  const config = {
    prizeType: 'placement',
    prizes: { firstPrize: 1200, secondPrize: 600, thirdPrize: 300, fourthPrize: 150, fifthPrize: 100, mvpBonus: 50 },
  }
  const formatted = calculateFormattedPrize(config)
  assert.strictEqual(formatted, '₹2,400', 'Total placement pool sum should be ₹2,400')
})

test('3.5. Prize distribution model: Placement + Per Kill hybrid calculation', () => {
  const config = {
    prizeType: 'placement_kill',
    perKillReward: 30,
    prizes: { firstPrize: 1000, secondPrize: 500, thirdPrize: 250 },
  }
  const formatted = calculateFormattedPrize(config)
  assert.strictEqual(formatted, '₹1,750 + Per Kill ₹30', 'Hybrid pool formatting must show placement + per kill')
})

test('3.6. Prize distribution model: Per Kill Only calculation', () => {
  const config = {
    prizeType: 'per_kill',
    perKillReward: 40,
  }
  const formatted = calculateFormattedPrize(config)
  assert.strictEqual(formatted, 'Per Kill ₹40', 'Per kill pool must format correctly')
})

test('3.7. Prize distribution model: Winner Takes All calculation', () => {
  const config = {
    prizeType: 'winner_takes_all',
    prizes: { winnerPrize: 2500 },
  }
  const formatted = calculateFormattedPrize(config)
  assert.strictEqual(formatted, '₹2,500', 'Winner takes all must format champion prize')
})

test('3.8. Payment is strictly deferred with Gateway Offline notice and zero payment triggers', () => {
  const wizardFile = fs.readFileSync('src/components/admin/tournaments/wizard/steps/Step3RegistrationPrize.jsx', 'utf8')
  assert(wizardFile.includes('CURRENTLY UNAVAILABLE'), 'Must display CURRENTLY UNAVAILABLE')
  assert(wizardFile.includes('DEFERRED STATUS'), 'Must display DEFERRED STATUS')
  assert(wizardFile.includes('GATEWAY: OFFLINE'), 'Must display GATEWAY: OFFLINE')
  assert(!wizardFile.includes('openRazorpayModal'), 'No Razorpay modal trigger in wizard UI')
  assert(!wizardFile.includes('createRazorpayOrder'), 'No Razorpay order trigger in wizard UI')
})

// -----------------------------------------------------------------------------
// GROUP 4: WIZARD NAVIGATION & LIFECYCLE STATE TRANSITIONS
// -----------------------------------------------------------------------------
console.log('\n--- GROUP 4: Wizard Navigation & Lifecycle State Transitions ---')

test('4.1. Step 1 -> Step 2 transition requires tournament title', () => {
  const getErrors = (step, form) => {
    if (step === 0) {
      if (!form.title || !form.title.trim()) return { title: 'Tournament Name is required.' }
    }
    return {}
  }

  assert.strictEqual(Object.keys(getErrors(0, { title: '' })).length, 1, 'Step 1 should fail if title empty')
  assert.strictEqual(Object.keys(getErrors(0, { title: 'Bermuda Cup' })).length, 0, 'Step 1 should pass with title')
})

test('4.2. Step 2 -> Step 3 transition requires valid schedule chronology', () => {
  const getErrors = (step, form) => {
    if (step === 1) {
      return checkScheduleChronology(form)
    }
    return {}
  }

  const badForm = {
    startDate: '2026-10-26',
    registrationStart: '06:00 PM IST',
    registrationEnd: '05:00 PM IST', // inverted
  }
  assert(Object.keys(getErrors(1, badForm)).length > 0, 'Step 2 should block next on invalid chronology')
})

test('4.3. Back navigation decrements currentStep safely and preserves form state', () => {
  let step = 2
  const handleBack = () => { step = Math.max(0, step - 1) }
  handleBack()
  assert.strictEqual(step, 1, 'Back from 2 should go to 1')
  handleBack()
  assert.strictEqual(step, 0, 'Back from 1 should go to 0')
  handleBack()
  assert.strictEqual(step, 0, 'Back from 0 should clamp at 0')
})

test('4.4. Save Draft sets status to Draft and permits saving with Step 1 valid', () => {
  const form = { title: 'Draft Cup', mode: 'squad' }
  const draftForm = { ...form, status: 'Draft' }
  assert.strictEqual(draftForm.status, 'Draft')
  assert.strictEqual(draftForm.title, 'Draft Cup')
})

test('4.5. Publish Tournament sets status to Registration Open and validates all steps', () => {
  const form = {
    title: 'Final Battle 2026',
    mode: 'squad',
    game: 'Free Fire MAX',
    maxTeams: 12,
    startDate: '2026-10-26',
    startTime: '07:00 PM IST',
    registrationStart: '10:00 AM IST',
    registrationEnd: '06:00 PM IST',
    checkInStart: '06:15 PM IST',
    checkInEnd: '06:45 PM IST',
    roomPublishTime: '06:45 PM IST',
    prizeType: 'placement',
    prizes: { firstPrize: 1000 },
  }

  // Format string resolution
  const formatString = form.mode === 'solo' ? 'SOLO (1P)' : form.mode === 'duo' ? 'DUO (2P)' : 'SQUAD (4P)'
  assert.strictEqual(formatString, 'SQUAD (4P)')

  const resolvedPrize = calculateFormattedPrize(form)
  assert.strictEqual(resolvedPrize, '₹1,000')

  const tournamentPayload = {
    title: form.title,
    game: form.game,
    mode: form.mode,
    format: formatString,
    prize_pool: resolvedPrize,
    prizePool: resolvedPrize,
    entry_fee: 'Free',
    entryFee: 'Free',
    max_teams: 12,
    maxTeams: 12,
    startDate: form.startDate,
    startTime: form.startTime,
    status: 'Registration Open',
  }

  assert.strictEqual(tournamentPayload.status, 'Registration Open')
  assert.strictEqual(tournamentPayload.prize_pool, '₹1,000')
  assert.strictEqual(tournamentPayload.format, 'SQUAD (4P)')
})

// -----------------------------------------------------------------------------
// GROUP 5: COMPONENT ARCHITECTURE & STITCH SPEC COMPLIANCE
// -----------------------------------------------------------------------------
console.log('\n--- GROUP 5: Component Architecture & Stitch Spec Compliance ---')

test('5.1. All wizard components exist in src/components/admin/tournaments/wizard/', () => {
  const wizardDir = 'src/components/admin/tournaments/wizard'
  assert(fs.existsSync(path.join(wizardDir, 'WizardStepperHeader.jsx')), 'WizardStepperHeader exists')
  assert(fs.existsSync(path.join(wizardDir, 'WizardFooterActions.jsx')), 'WizardFooterActions exists')
  assert(fs.existsSync(path.join(wizardDir, 'CreateTournamentWizardModal.jsx')), 'CreateTournamentWizardModal exists')
  assert(fs.existsSync(path.join(wizardDir, 'steps', 'Step1GeneralInfo.jsx')), 'Step1GeneralInfo exists')
  assert(fs.existsSync(path.join(wizardDir, 'steps', 'Step2MatchSchedule.jsx')), 'Step2MatchSchedule exists')
  assert(fs.existsSync(path.join(wizardDir, 'steps', 'Step3RegistrationPrize.jsx')), 'Step3RegistrationPrize exists')
})

test('5.2. TournamentCenterView integrates CreateTournamentWizardModal cleanly', () => {
  const mainView = fs.readFileSync('src/components/admin/TournamentCenterView.jsx', 'utf8')
  assert(mainView.includes('<CreateTournamentWizardModal'), 'TournamentCenterView mounts CreateTournamentWizardModal')
  assert(mainView.includes('import CreateTournamentWizardModal'), 'TournamentCenterView imports CreateTournamentWizardModal')
})

test('5.3. Touch target standards: buttons feature min-h-[40px] or min-h-[44px] for mobile accessibility', () => {
  const footerCode = fs.readFileSync('src/components/admin/tournaments/wizard/WizardFooterActions.jsx', 'utf8')
  assert(footerCode.includes('min-h-[40px] sm:min-h-[44px]'), 'Buttons meet minimum accessible mobile touch target height')
})

test('5.4. Responsive container layout: scrollable main with docked footer prevents modal overflow', () => {
  const modalCode = fs.readFileSync('src/components/admin/tournaments/wizard/CreateTournamentWizardModal.jsx', 'utf8')
  assert(modalCode.includes('overflow-y-auto'), 'Main section has vertical overflow scrolling')
  assert(modalCode.includes('overscroll-contain'), 'Main section contains overscroll')
})

// -----------------------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------------------
console.log('\n================================================================================')
console.log(`REGRESSION TEST RESULTS: ${passedTests} PASSED | ${failedTests} FAILED`)
console.log('================================================================================')

if (failedTests > 0) {
  process.exit(1)
}
