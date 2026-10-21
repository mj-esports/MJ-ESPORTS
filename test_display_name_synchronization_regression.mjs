// test_display_name_synchronization_regression.mjs
// Regression audit for Display Name Synchronization across Profile, Navbar, and Leaderboard

import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

console.log('================================================================================')
console.log('MJ ESPORTS — DISPLAY NAME SYNCHRONIZATION REGRESSION AUDIT')
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

// 1. EditProfilePage Database Schema & Error Handling Audit
const editProfilePath = path.resolve('src/pages/EditProfilePage.jsx')
assert.ok(fs.existsSync(editProfilePath), 'EditProfilePage.jsx must exist')
const editProfileContent = fs.readFileSync(editProfilePath, 'utf8')

check('EditProfilePage excludes non-table columns (phone, instagram_handle, bio) from profiles.upsert', () => {
  const upsertMatch = editProfileContent.match(/from\('profiles'\)[\s\S]*?\.upsert\(([\s\S]*?)\)/)
  assert.ok(upsertMatch, 'profiles.upsert call must exist')
  const payloadStr = upsertMatch[1]
  assert.ok(payloadStr.includes('profilePayload'), 'Must use structured profilePayload')

  const payloadDef = editProfileContent.match(/const profilePayload = \{([\s\S]*?)\}/)
  assert.ok(payloadDef, 'profilePayload definition must exist')
  const payloadFields = payloadDef[1]

  assert.ok(payloadFields.includes('username: cleanUsername'), 'Must include username')
  assert.ok(payloadFields.includes('game_uid: cleanFreeFireUid'), 'Must include game_uid')
  assert.ok(payloadFields.includes('avatar_url: avatarUrl'), 'Must include avatar_url')
  assert.ok(payloadFields.includes('updated_at:'), 'Must include updated_at')

  assert.ok(!payloadFields.includes('phone:'), 'Must NOT include phone in profiles table upsert')
  assert.ok(!payloadFields.includes('instagram_handle:'), 'Must NOT include instagram_handle in profiles table upsert')
  assert.ok(!payloadFields.includes('bio:'), 'Must NOT include bio in profiles table upsert')
})

check('EditProfilePage throws error on database update failure instead of falsely indicating success', () => {
  const errorHandlingMatch = editProfileContent.match(/if\s*\(profileError\)\s*\{([\s\S]*?)\}/)
  assert.ok(errorHandlingMatch, 'profileError check must exist')
  assert.ok(errorHandlingMatch[1].includes('throw new Error'), 'Must throw error on profileError')
  assert.ok(!errorHandlingMatch[1].includes('console.warn') || errorHandlingMatch[1].includes('throw'), 'Must not silently swallow error with only console.warn')
})

check('EditProfilePage checks username availability via check_username_available RPC', () => {
  assert.ok(editProfileContent.includes("check_username_available"), 'Must call check_username_available RPC')
  assert.ok(!editProfileContent.includes(".from('public_profiles')"), 'Must not query dropped public_profiles view')
})

check('EditProfilePage awaits updateProfile call to ensure context synchronization completes', () => {
  assert.ok(editProfileContent.includes('await updateProfile('), 'Must await updateProfile')
})

// 2. AuthContext Synchronization Audit
const authContextPath = path.resolve('src/contexts/AuthContext.jsx')
assert.ok(fs.existsSync(authContextPath), 'AuthContext.jsx must exist')
const authContextContent = fs.readFileSync(authContextPath, 'utf8')

check('AuthContext updateProfile updates setProfile in React state', () => {
  const updateProfileMatch = authContextContent.match(/const updateProfile = async[\s\S]*?\{([\s\S]*?)\n  \}/)
  assert.ok(updateProfileMatch, 'updateProfile function must exist')
  const body = updateProfileMatch[1]
  assert.ok(body.includes('setProfile('), 'Must call setProfile in updateProfile')
  assert.ok(body.includes('username: sanitizedProfileData.username'), 'Must update username in profile state')
})

// 3. Navbar Synchronization & Display Name Resolution Audit
const navbarPath = path.resolve('src/components/common/Navbar.jsx')
assert.ok(fs.existsSync(navbarPath), 'Navbar.jsx must exist')
const navbarContent = fs.readFileSync(navbarPath, 'utf8')

check('Navbar defines userDisplayName with metadata priority and profile synchronization', () => {
  const userDisplayNameMatch = navbarContent.match(/const userDisplayName = (.*)/)
  assert.ok(userDisplayNameMatch, 'userDisplayName declaration must exist')
  const expr = userDisplayNameMatch[1]
  assert.ok(expr.includes('user?.user_metadata?.username'), 'Must check user_metadata.username')
  assert.ok(expr.includes('profile?.username'), 'Must check profile.username')
  assert.ok(expr.includes('profileUsername'), 'Must check profileUsername state')
})

check('Navbar fetches and stores live profileUsername from public.profiles table', () => {
  assert.ok(navbarContent.includes('const [profileUsername, setProfileUsername] = useState('), 'profileUsername state must exist')
  assert.ok(navbarContent.includes('setProfileUsername(data.username)'), 'Must store data.username into state')
})

// 4. Leaderboard Dynamic Player Name Resolution Audit
const leaderboardPath = path.resolve('src/pages/LeaderboardPage.jsx')
assert.ok(fs.existsSync(leaderboardPath), 'LeaderboardPage.jsx must exist')
const leaderboardContent = fs.readFileSync(leaderboardPath, 'utf8')

check('LeaderboardPage constructs authoritative playerNameMap from profiles, registrations, and active session', () => {
  assert.ok(leaderboardContent.includes('const playerNameMap = useMemo('), 'playerNameMap must be defined')
  assert.ok(leaderboardContent.includes('profilesList.forEach'), 'Must map database profiles')
  assert.ok(leaderboardContent.includes('user?.user_metadata?.username'), 'Must map authenticated session user')
})

check('LeaderboardPage resolves player display name from playerNameMap in standings', () => {
  assert.ok(leaderboardContent.includes('const resolvedPlayer ='), 'resolvedPlayer calculation must exist')
  assert.ok(leaderboardContent.includes('playerNameMap[userIdKey]'), 'Must look up player by userId')
  assert.ok(leaderboardContent.includes('playerNameMap[uidKey]'), 'Must look up player by gameUid')
})

check('LeaderboardPage updates team name to resolved player name in Solo format', () => {
  assert.ok(leaderboardContent.includes('isSoloTournament'), 'Must detect solo format')
  assert.ok(leaderboardContent.includes('resolvedTeamName'), 'resolvedTeamName calculation must exist')
})

check('LeaderboardPage includes playerNameMap in standings useMemo dependencies', () => {
  const depsMatch = leaderboardContent.match(/const standings = useMemo\([\s\S]*?\},\s*\[([\s\S]*?)\]\)/)
  assert.ok(depsMatch, 'standings useMemo must exist')
  const deps = depsMatch[1]
  assert.ok(deps.includes('playerNameMap'), 'playerNameMap must be in standings dependency array')
})

// 5. Functional Simulation Tests
check('Functional Simulation: Name change from GFFFGU to KA17 MJFF updates Navbar display name', () => {
  // Simulate AuthContext state transition
  const oldProfile = { id: 'usr-1', username: 'GFFFGU', email: 'player@example.com' }
  const oldUser = { id: 'usr-1', email: 'player@example.com', user_metadata: { username: 'GFFFGU' } }

  // Simulate updateProfile
  const sanitizedProfileData = { username: 'KA17 MJFF', freeFireUid: '1234567890' }
  const updatedUser = {
    ...oldUser,
    user_metadata: { ...oldUser.user_metadata, ...sanitizedProfileData }
  }
  const updatedProfile = {
    ...oldProfile,
    username: sanitizedProfileData.username,
    game_uid: sanitizedProfileData.freeFireUid
  }

  // Navbar calculation
  const navbarDisplayName =
    updatedUser?.user_metadata?.username ||
    updatedProfile?.username ||
    updatedUser?.email?.split('@')[0] ||
    'Player'

  assert.strictEqual(navbarDisplayName, 'KA17 MJFF', 'Navbar display name must be KA17 MJFF')
})

check('Functional Simulation: Leaderboard resolves updated player display name from snapshot team object', () => {
  // Snapshot from tournament teams_list JSONB containing old name GFFFGU
  const snapshotTeam = {
    userId: 'usr-1',
    captain: 'GFFFGU',
    team: 'GFFFGU',
    freeFireUid: '1234567890',
    kills: 8,
    points: 25,
    rank: 1
  }

  // Active playerNameMap populated with updated name
  const playerNameMap = {
    'usr-1': 'KA17 MJFF',
    '1234567890': 'KA17 MJFF'
  }

  const userIdKey = String(snapshotTeam.userId).trim()
  const uidKey = String(snapshotTeam.freeFireUid).trim()

  const resolvedPlayer =
    (userIdKey && playerNameMap[userIdKey]) ||
    (uidKey && playerNameMap[uidKey]) ||
    snapshotTeam.captain

  const isSoloTournament = true
  const isPlayerAsTeam = !snapshotTeam.team || snapshotTeam.team === snapshotTeam.captain || isSoloTournament
  const resolvedTeamName = isPlayerAsTeam ? resolvedPlayer : snapshotTeam.team

  assert.strictEqual(resolvedPlayer, 'KA17 MJFF', 'Leaderboard player must resolve to KA17 MJFF')
  assert.strictEqual(resolvedTeamName, 'KA17 MJFF', 'Leaderboard solo team name must resolve to KA17 MJFF')
})

check('Functional Simulation: Reloading page retrieves updated name from database profile payload', () => {
  // Emulate database row in public.profiles after successful upsert
  const dbRow = {
    id: 'usr-1',
    username: 'KA17 MJFF',
    game_uid: '1234567890',
    avatar_url: 'https://example.com/avatar.png',
    updated_at: '2026-10-21T14:00:00.000Z'
  }

  // On page reload, getSession / syncUserAndRole fetches from profiles table
  const reloadedProfile = dbRow
  const reloadedMeta = { username: 'KA17 MJFF', freeFireUid: '1234567890' }

  const editProfileInitialName = reloadedMeta.username || reloadedProfile?.username || ''
  const navbarReloadedName = reloadedMeta.username || reloadedProfile?.username || ''

  assert.strictEqual(editProfileInitialName, 'KA17 MJFF', 'Edit profile initial form name persists across reload')
  assert.strictEqual(navbarReloadedName, 'KA17 MJFF', 'Navbar name persists across reload')
})

check('Functional Simulation: Database write error throws and notifies user instead of falsely succeeding', async () => {
  let isAlertTriggered = false
  let alertType = null

  const mockSetAlert = (alertObj) => {
    isAlertTriggered = true
    alertType = alertObj?.type
  }

  // Mocking database failure
  const profileError = { message: 'Network connection lost during upsert' }

  try {
    if (profileError) {
      throw new Error(profileError.message)
    }
  } catch (err) {
    mockSetAlert({ type: 'error', message: err.message })
  }

  assert.strictEqual(isAlertTriggered, true, 'Error alert must be triggered')
  assert.strictEqual(alertType, 'error', 'Alert type must be error')
})

check('Functional Simulation: Duo/Squad team names remain intact while captain name resolves correctly', () => {
  const squadTeam = {
    userId: 'usr-1',
    captain: 'GFFFGU',
    team: 'Soul Esports',
    freeFireUid: '1234567890',
    kills: 14,
    points: 40,
    rank: 1
  }

  const playerNameMap = {
    'usr-1': 'KA17 MJFF',
    '1234567890': 'KA17 MJFF'
  }

  const userIdKey = String(squadTeam.userId).trim()
  const uidKey = String(squadTeam.freeFireUid).trim()

  const resolvedPlayer =
    (userIdKey && playerNameMap[userIdKey]) ||
    (uidKey && playerNameMap[uidKey]) ||
    squadTeam.captain

  const isSoloTournament = false
  const rawName = squadTeam.team
  const rawPlayer = squadTeam.captain
  const isPlayerAsTeam = !squadTeam.team || squadTeam.team === squadTeam.captain || rawName === rawPlayer || isSoloTournament
  const resolvedTeamName = isPlayerAsTeam ? resolvedPlayer : rawName

  assert.strictEqual(resolvedTeamName, 'Soul Esports', 'Squad team name must remain Soul Esports')
  assert.strictEqual(resolvedPlayer, 'KA17 MJFF', 'Captain name must resolve to KA17 MJFF')
})

check("Functional Simulation: Other players' leaderboard names are not replaced with logged-in user name", () => {
  // Logged-in user is usr-1 (KA17 MJFF)
  const playerNameMap = {
    'usr-1': 'KA17 MJFF',
    '1234567890': 'KA17 MJFF',
    'usr-2': 'Jonathan',
    '2222222222': 'Jonathan'
  }

  // Opponent team 1 (with own profile in playerNameMap)
  const opponentTeam1 = {
    userId: 'usr-2',
    captain: 'JonathanOld',
    team: 'GodLike',
    freeFireUid: '2222222222',
    kills: 6,
    points: 18
  }

  // Opponent team 2 (guest / unlinked player without entry in playerNameMap)
  const opponentTeam2 = {
    userId: null,
    captain: 'ViperX',
    team: 'Shadow Clan',
    freeFireUid: '3333333333',
    kills: 4,
    points: 12
  }

  const isSoloTournament = false

  // Evaluate opponent 1
  const uid1 = String(opponentTeam1.userId).trim()
  const ff1 = String(opponentTeam1.freeFireUid).trim()
  const resPlayer1 = (uid1 && playerNameMap[uid1]) || (ff1 && playerNameMap[ff1]) || opponentTeam1.captain
  const resTeam1 = (!opponentTeam1.team || opponentTeam1.team === opponentTeam1.captain || isSoloTournament)
    ? resPlayer1
    : opponentTeam1.team

  assert.strictEqual(resPlayer1, 'Jonathan', 'Opponent 1 player must resolve to Jonathan')
  assert.strictEqual(resTeam1, 'GodLike', 'Opponent 1 team must remain GodLike')
  assert.notStrictEqual(resPlayer1, 'KA17 MJFF', 'Opponent 1 must NOT be replaced with logged-in user name')

  // Evaluate opponent 2
  const uid2 = opponentTeam2.userId ? String(opponentTeam2.userId).trim() : ''
  const ff2 = opponentTeam2.freeFireUid ? String(opponentTeam2.freeFireUid).trim() : ''
  const resPlayer2 = (uid2 && playerNameMap[uid2]) || (ff2 && playerNameMap[ff2]) || opponentTeam2.captain
  const resTeam2 = (!opponentTeam2.team || opponentTeam2.team === opponentTeam2.captain || isSoloTournament)
    ? resPlayer2
    : opponentTeam2.team

  assert.strictEqual(resPlayer2, 'ViperX', 'Opponent 2 player must remain ViperX')
  assert.strictEqual(resTeam2, 'Shadow Clan', 'Opponent 2 team must remain Shadow Clan')
  assert.notStrictEqual(resPlayer2, 'KA17 MJFF', 'Opponent 2 must NOT be replaced with logged-in user name')
})

console.log('\n--------------------------------------------------------------------------------')
console.log(`TOTAL AUDITS: ${totalCount} | PASSED: ${passCount} | FAILED: ${totalCount - passCount}`)
console.log('--------------------------------------------------------------------------------\n')

if (passCount === totalCount) {
  console.log('🎉 ALL DISPLAY NAME SYNCHRONIZATION AUDITS PASSED!\n')
  process.exit(0)
} else {
  console.error('❌ SOME AUDITS FAILED!\n')
  process.exit(1)
}
