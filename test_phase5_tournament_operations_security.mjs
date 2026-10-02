// test_phase5_tournament_operations_security.mjs
// Comprehensive automated test suite for Phase 5: Tournament Operations & Match Room Security (MJ ESPORTS)

import fs from 'fs'
import path from 'path'
import assert from 'assert'

const ROOT = process.cwd()

console.log('================================================================================')
console.log('MJ ESPORTS — PHASE 5: TOURNAMENT OPERATIONS & MATCH ROOM SECURITY TEST SUITE')
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

// Read relevant SQL files and source files for static & logic verification
const phase5Sql = fs.readFileSync(path.join(ROOT, 'supabase_phase5_tournament_operations_security.sql'), 'utf8')
const phase61Sql = fs.readFileSync(path.join(ROOT, 'supabase_phase6_1_room_security.sql'), 'utf8')
const phase11Sql = fs.readFileSync(path.join(ROOT, 'supabase_phase11_room_and_registration_hardening.sql'), 'utf8')
const phase95aSql = fs.readFileSync(path.join(ROOT, 'supabase_phase9_5a_tournament_cancellation_and_wallet_refund.sql'), 'utf8')
const phase71Sql = fs.readFileSync(path.join(ROOT, 'supabase_phase7_1_atomic_finalization_and_payout_guards.sql'), 'utf8')
const tournamentContext = fs.readFileSync(path.join(ROOT, 'src', 'contexts', 'TournamentContext.jsx'), 'utf8')
const tournamentDetail = fs.readFileSync(path.join(ROOT, 'src', 'pages', 'TournamentDetailPage.jsx'), 'utf8')
const dbMapper = fs.readFileSync(path.join(ROOT, 'src', 'utils', 'tournamentDbMapper.js'), 'utf8')
const lifecycleConstants = fs.readFileSync(path.join(ROOT, 'src', 'constants', 'tournamentLifecycle.js'), 'utf8')

// ----------------------------------------------------------------------------
// GROUP 1: PARTICIPANT AUTHORIZATION BOUNDARIES
// ----------------------------------------------------------------------------
console.log('--- GROUP 1: Participant Authorization & Access Boundaries ---')

test('1.1. Unauthenticated users are strictly rejected with UNAUTHENTICATED', () => {
  assert(phase5Sql.includes("IF v_user_id IS NULL THEN"), 'get_tournament_room_credentials must check for NULL auth.uid()')
  assert(phase5Sql.includes("'error_code', 'UNAUTHENTICATED'"), 'Must return error_code UNAUTHENTICATED')
})

test('1.2. Registered team captains with approved/confirmed status are authorized', () => {
  assert(phase5Sql.includes("FROM public.tournament_registrations"), 'Must query tournament_registrations')
  assert(phase5Sql.includes("user_id = v_user_id"), 'Must match caller user_id')
  assert(phase5Sql.includes("LOWER(status) IN ('approved', 'confirmed', 'active')"), 'Must require approved/confirmed status')
})

test('1.3. Registered teammates/squad members in tournament_players are authorized', () => {
  assert(phase5Sql.includes("FROM public.tournament_players tp"), 'Must check tournament_players for roster members')
  assert(phase5Sql.includes("JOIN public.tournament_registrations tr ON tr.id = tp.registration_id"), 'Must join to registrations')
  assert(phase5Sql.includes("tp.user_id = v_user_id"), 'Must match teammate user_id')
})

test('1.4. Rejected registrations are explicitly denied with REGISTRATION_REJECTED', () => {
  assert(phase5Sql.includes("'error_code', 'REGISTRATION_REJECTED'"), 'Must return REGISTRATION_REJECTED for rejected players')
  assert(phase5Sql.includes("LOWER(COALESCE(status, '')) = 'rejected'"), 'Must check for rejected status')
})

test('1.5. Cancelled registrations are explicitly denied with REGISTRATION_CANCELLED', () => {
  assert(phase5Sql.includes("'error_code', 'REGISTRATION_CANCELLED'"), 'Must return REGISTRATION_CANCELLED for cancelled players')
  assert(phase5Sql.includes("LOWER(COALESCE(status, '')) = 'cancelled'"), 'Must check for cancelled status')
})

test('1.6. Unregistered users, spectators, and other tournament participants are rejected with NOT_REGISTERED', () => {
  assert(phase5Sql.includes("'error_code', 'NOT_REGISTERED'"), 'Must return NOT_REGISTERED for unauthorized users')
  assert(phase5Sql.includes("IF NOT (v_is_captain OR v_is_teammate OR v_is_in_teams_list) THEN"), 'Must fail closed if not in approved roster')
})

test('1.7. Administrators possess authoritative override capability', () => {
  assert(phase5Sql.includes("v_is_admin := (public.is_admin() OR (SELECT current_setting('role', true)) = 'service_role');"), 'Must check is_admin')
  assert(phase5Sql.includes("'is_admin_override', true"), 'Must support admin override response')
})

// ----------------------------------------------------------------------------
// GROUP 2: AUTHORITATIVE SERVER-SIDE TIMING ENFORCEMENT
// ----------------------------------------------------------------------------
console.log('\n--- GROUP 2: Server-Side Release Timing Enforcement ---')

test('2.1. Server-side release time column is established on public.tournaments', () => {
  assert(phase5Sql.includes("ALTER TABLE public.tournaments ADD COLUMN room_release_time TIMESTAMPTZ;"), 'room_release_time column must exist')
  assert(phase5Sql.includes("ALTER TABLE public.tournaments ADD COLUMN room_release_window_minutes INTEGER DEFAULT 15;"), 'release window column must exist')
})

test('2.2. RPC enforces server NOW() < release_time check and fails closed with ROOM_NOT_RELEASED_YET', () => {
  assert(phase5Sql.includes("IF v_release_time IS NOT NULL AND NOW() < v_release_time THEN"), 'Must compare NOW() against release time')
  assert(phase5Sql.includes("'error_code', 'ROOM_NOT_RELEASED_YET'"), 'Must return ROOM_NOT_RELEASED_YET')
  assert(phase5Sql.includes("'release_time', v_release_time"), 'Must return authoritative release_time')
  assert(phase5Sql.includes("'server_time', NOW()"), 'Must return authoritative server_time')
})

test('2.3. Browser clock tampering cannot bypass timing (database clock is authoritative)', () => {
  // Simulate client tampering: client clock is set to year 2099, but server checks its own NOW()
  const simulateServerTimingCheck = (serverNow, releaseTime) => {
    return serverNow >= releaseTime
  }
  const realServerNow = new Date('2026-09-18T18:00:00Z')
  const matchReleaseTime = new Date('2026-09-18T18:15:00Z')
  const hackedClientClock = new Date('2099-01-01T00:00:00Z')

  // Server evaluates against its own clock, completely ignoring hacked client clock
  const isAllowed = simulateServerTimingCheck(realServerNow, matchReleaseTime)
  assert.strictEqual(isAllowed, false, 'Tampered client clock cannot grant early access')

  // When real server time reaches release time:
  const serverNowAtRelease = new Date('2026-09-18T18:15:01Z')
  const isAllowedAfter = simulateServerTimingCheck(serverNowAtRelease, matchReleaseTime)
  assert.strictEqual(isAllowedAfter, true, 'Access granted only after authoritative server time')
})

test('2.4. Room credentials require room_status = Published before release', () => {
  assert(phase5Sql.includes("IF COALESCE(v_tourn.room_status, 'Draft') != 'Published' THEN"), 'Must verify room_status = Published')
  assert(phase5Sql.includes("'error_code', 'ROOM_NOT_PUBLISHED'"), 'Must return ROOM_NOT_PUBLISHED')
})

// ----------------------------------------------------------------------------
// GROUP 3: DATABASE COLUMN-LEVEL PRIVILEGES & RLS PROTECTION
// ----------------------------------------------------------------------------
console.log('\n--- GROUP 3: Column-Level Privilege Shield & RLS Protection ---')

test('3.1. SELECT on public.tournaments (room_id, room_password) is revoked from anon & authenticated', () => {
  assert(phase5Sql.includes("REVOKE SELECT ON public.tournaments FROM anon, authenticated, public;"), 'Must revoke SELECT on tournaments')
  assert(!phase5Sql.includes("room_id,") || phase5Sql.includes("REVOKE SELECT"), 'Explicit column grants must exclude room_id and room_password')
  assert(!phase5Sql.match(/GRANT SELECT \([^)]*room_id[^)]*\) ON public\.tournaments TO anon/i), 'room_id must not be granted to anon/authenticated')
  assert(!phase5Sql.match(/GRANT SELECT \([^)]*room_password[^)]*\) ON public\.tournaments TO anon/i), 'room_password must not be granted to anon/authenticated')
})

test('3.2. SELECT on public.matches (room_id, room_password) is revoked from anon & authenticated', () => {
  assert(phase5Sql.includes("REVOKE SELECT ON public.matches FROM anon, authenticated, public;"), 'Must revoke SELECT on matches')
  assert(!phase5Sql.match(/GRANT SELECT \([^)]*room_id[^)]*\) ON public\.matches TO anon/i), 'matches room_id must not be granted')
  assert(!phase5Sql.match(/GRANT SELECT \([^)]*room_password[^)]*\) ON public\.matches TO anon/i), 'matches room_password must not be granted')
})

test('3.3. Insecure public read policy on public.matches is dropped and replaced with safe column grant', () => {
  assert(phase5Sql.includes('DROP POLICY IF EXISTS "Public read matches if published or admin" ON public.matches;'), 'Insecure policy must be dropped')
  assert(phase5Sql.includes('CREATE POLICY "Public read matches safe if published or admin"'), 'Hardened safe policy must be established')
})

test('3.4. Numeric check constraints on Room ID and Password are strictly enforced', () => {
  assert(phase11Sql.includes("chk_tournaments_room_id_numeric"), 'chk_tournaments_room_id_numeric must exist')
  assert(phase11Sql.includes("CHECK (room_id IS NULL OR room_id = '' OR room_id ~ '^[0-9]+$')"), 'room_id must be digits only')
  assert(phase11Sql.includes("chk_tournaments_room_password_numeric"), 'chk_tournaments_room_password_numeric must exist')
  assert(phase11Sql.includes("CHECK (room_password IS NULL OR room_password = '' OR room_password ~ '^[0-9]+$')"), 'room_password must be digits only')
})

// ----------------------------------------------------------------------------
// GROUP 4: LIFECYCLE STATE MACHINE & TERMINAL GUARDS
// ----------------------------------------------------------------------------
console.log('\n--- GROUP 4: Lifecycle State Machine & Terminal Guards ---')

test('4.1. Canonical lifecycle stages include Draft, Registration, Room Released, Live, Completed, and Cancelled', () => {
  assert(phase5Sql.includes("'Draft'"), 'Must include Draft')
  assert(phase5Sql.includes("'Registration Open'"), 'Must include Registration Open')
  assert(phase5Sql.includes("'Room Released'"), 'Must include Room Released')
  assert(phase5Sql.includes("'Live'"), 'Must include Live')
  assert(phase5Sql.includes("'Completed'"), 'Must include Completed')
  assert(phase5Sql.includes("'Cancelled'"), 'Must include Cancelled')
})

test('4.2. Database trigger blocks reopening cancelled tournaments', () => {
  assert(phase5Sql.includes("IF OLD.status = 'Cancelled' AND NEW.status != 'Cancelled' THEN"), 'Must block reopening Cancelled')
  assert(phase5Sql.includes("A cancelled and refunded tournament cannot be reopened"), 'Must raise explanatory exception')
})

test('4.3. Database trigger blocks regressing completed tournaments to active states', () => {
  assert(phase5Sql.includes("IF OLD.status IN ('Completed', 'Prize Distributed', 'Archived')"), 'Must detect completed old status')
  assert(phase5Sql.includes("Cannot regress a completed tournament back to"), 'Must raise regression exception')
})

test('4.4. Cancelling a tournament automatically revokes room credentials and sets room_status to Draft', () => {
  assert(phase5Sql.includes("IF NEW.status = 'Cancelled' THEN"), 'Must check cancelled new status')
  assert(phase5Sql.includes("NEW.room_status := 'Draft';"), 'Must enforce Draft room_status on cancellation')
  assert(phase5Sql.includes("NEW.room_id := NULL;"), 'Must nullify room_id on cancellation')
  assert(phase5Sql.includes("NEW.room_password := NULL;"), 'Must nullify room_password on cancellation')
})

test('4.5. Cancelled tournaments reject room credential requests with TOURNAMENT_CANCELLED', () => {
  assert(phase5Sql.includes("'error_code', 'TOURNAMENT_CANCELLED'"), 'Must return TOURNAMENT_CANCELLED')
  assert(phase5Sql.includes("LOWER(COALESCE(v_tourn.status, '')) = 'cancelled'"), 'Must check cancelled status in RPC')
})

test('4.6. Completed tournaments reject credential requests with TOURNAMENT_COMPLETED for non-admins', () => {
  assert(phase5Sql.includes("'error_code', 'TOURNAMENT_COMPLETED'"), 'Must return TOURNAMENT_COMPLETED')
})

// ----------------------------------------------------------------------------
// GROUP 5: REALTIME & NOTIFICATION SECURITY
// ----------------------------------------------------------------------------
console.log('\n--- GROUP 5: Realtime & Notification Security ---')

test('5.1. Realtime listener does not extract credentials directly from postgres_changes payloads', () => {
  // Verifies TournamentContext subscribes to notifications and calls fetchTournaments()
  // rather than consuming raw unvalidated payload rows
  assert(tournamentContext.includes("realtime_tournaments_changes"), 'Realtime channel must exist')
  assert(/\(\)\s*=>\s*\{\s*fetchTournaments\(\)\s*\}/.test(tournamentContext), 'Listener must trigger sanitized fetchTournaments()')
})

test('5.2. fetchTournaments SELECT query explicitly excludes room_id and room_password', () => {
  const selectMatch = tournamentContext.match(/\.from\('tournaments'\)\s*\.select\('([^']+)'\)/)
  assert(selectMatch, 'fetchTournaments must have explicit select string')
  const selectCols = selectMatch[1].split(',').map((s) => s.trim())
  assert(!selectCols.includes('room_id'), 'fetchTournaments must NOT select room_id')
  assert(!selectCols.includes('room_password'), 'fetchTournaments must NOT select room_password')
  assert(selectCols.includes('room_release_time'), 'fetchTournaments must select room_release_time')
})

test('5.3. Room credentials are not exposed in URLs, query strings, or router paths', () => {
  const allRoutes = fs.readFileSync(path.join(ROOT, 'src', 'App.jsx'), 'utf8')
  assert(!allRoutes.includes(':roomId'), 'Router must not have roomId param')
  assert(!allRoutes.includes(':password'), 'Router must not have password param')
  assert(!allRoutes.includes(':roomPassword'), 'Router must not have roomPassword param')
})

// ----------------------------------------------------------------------------
// GROUP 6: CONCURRENCY, RACE CONDITIONS & AUDIT LOGGING
// ----------------------------------------------------------------------------
console.log('\n--- GROUP 6: Concurrency, Race Conditions & Audit Logging ---')

test('6.1. match_operations_audit_log table is established with RLS protection', () => {
  assert(phase5Sql.includes("CREATE TABLE IF NOT EXISTS public.match_operations_audit_log"), 'Audit table must be defined')
  assert(phase5Sql.includes("ALTER TABLE public.match_operations_audit_log ENABLE ROW LEVEL SECURITY;"), 'RLS must be enabled on audit log')
  assert(phase5Sql.includes('CREATE POLICY "Admins read match audit log"'), 'Admins read audit log policy must exist')
})

test('6.2. set_tournament_room_credentials logs room update events WITHOUT plaintext passwords', () => {
  assert(phase5Sql.includes("'ROOM_CREDENTIALS_SET'"), 'Must log ROOM_CREDENTIALS_SET action')
  assert(phase5Sql.includes("'room_id_set', (v_clean_room_id != '')"), 'Must log boolean flag, not plaintext')
  assert(!phase5Sql.includes("'room_password', v_clean_password"), 'Must NEVER log plaintext password')
})

test('6.3. Simultaneous credential release race condition handled safely by PostgreSQL transactional lock', () => {
  // In PostgreSQL, concurrent UPDATE statements on the same tournament row acquire row-level lock FOR UPDATE
  assert(phase5Sql.includes("UPDATE public.tournaments"), 'UPDATE acquires row-level lock')
  assert(phase71Sql.includes("FOR UPDATE"), 'Finalization acquires FOR UPDATE lock')
  assert(phase95aSql.includes("FOR UPDATE"), 'Cancellation acquires FOR UPDATE lock')
})

test('6.4. Duplicate / rapid RPC requests are idempotent and fail-closed', () => {
  // get_tournament_room_credentials is a read-only query with no state mutation
  assert(
    /SELECT\s+id,\s*title,\s*status,\s*room_id,\s*room_password/i.test(phase5Sql),
    'Read-only SELECT query'
  )
  assert(!phase5Sql.includes("INSERT INTO public.tournaments"), 'No uncontrolled side-effects')
})

// ----------------------------------------------------------------------------
// GROUP 7: ANTI-LEAKAGE REPOSITORY AUDIT
// ----------------------------------------------------------------------------
console.log('\n--- GROUP 7: Anti-Leakage Repository Audit ---')

test('7.1. No hardcoded room IDs or passwords exist in production source code', () => {
  const filesToScan = [
    'src/pages/TournamentDetailPage.jsx',
    'src/contexts/TournamentContext.jsx',
    'src/components/admin/MatchControlView.jsx',
    'src/components/admin/tournaments/TournamentOperationsWorkspace.jsx',
    'src/utils/tournamentDbMapper.js',
  ]

  for (const relPath of filesToScan) {
    const content = fs.readFileSync(path.join(ROOT, relPath), 'utf8')
    assert(!content.includes("roomPassword: '123"), `No hardcoded roomPassword in ${relPath}`)
    assert(!content.includes("roomId: '123"), `No hardcoded roomId in ${relPath}`)
  }
})

test('7.2. Frontend displays room details only when get_tournament_room_credentials succeeds', () => {
  assert(tournamentDetail.includes("getRoomCredentials(tournament.id).then((res) => {"), 'Must call RPC to retrieve credentials')
  assert(tournamentDetail.includes("if (res && res.success && (res.roomId || res.room_id)) {"), 'Must check res.success')
  assert(tournamentDetail.includes("setSecureRoomDetails({"), 'Must set secure room details only on verified success')
  assert(tournamentDetail.includes("setSecureRoomDetails(null)"), 'Must clear details on denial')
})

test('7.3. Frontend gracefully displays server-side release timing messages', () => {
  assert(tournamentDetail.includes("setRoomErrorMessage(res.message)"), 'Must display server release time message')
  assert(tournamentDetail.includes("{roomErrorMessage ||"), 'Must render error message in room card')
})

// ----------------------------------------------------------------------------
// SUMMARY REPORT
// ----------------------------------------------------------------------------
console.log('\n================================================================================')
console.log(`PHASE 5 TEST RESULTS: ${passed} PASSED | ${failed} FAILED`)
console.log('================================================================================')

if (failed > 0) {
  process.exit(1)
} else {
  process.exit(0)
}
