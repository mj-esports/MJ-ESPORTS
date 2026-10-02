// test_phase6_match_checkin_operations.mjs
// Comprehensive automated test suite for Phase 6: Match Check-In & Operations Hardening (MJ ESPORTS)

import fs from 'fs'
import path from 'path'
import assert from 'assert'

const ROOT = process.cwd()

console.log('================================================================================')
console.log('MJ ESPORTS — PHASE 6: MATCH CHECK-IN & OPERATIONS HARDENING TEST SUITE')
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

// Read relevant files
const phase6Sql = fs.readFileSync(path.join(ROOT, 'supabase_phase6_match_checkin_operations.sql'), 'utf8').replace(/\r\n/g, '\n')
const phase5Sql = fs.readFileSync(path.join(ROOT, 'supabase_phase5_tournament_operations_security.sql'), 'utf8').replace(/\r\n/g, '\n')
const checkinService = fs.readFileSync(path.join(ROOT, 'src', 'services', 'matchCheckinService.js'), 'utf8')
const tournamentContext = fs.readFileSync(path.join(ROOT, 'src', 'contexts', 'TournamentContext.jsx'), 'utf8')
const lifecycleConstants = fs.readFileSync(path.join(ROOT, 'src', 'constants', 'tournamentLifecycle.js'), 'utf8')

// ----------------------------------------------------------------------------
// GROUP 1: CHECK-IN AUTHORIZATION & TIMING WINDOWS
// ----------------------------------------------------------------------------
console.log('--- GROUP 1: Check-In Authorization & Timing Windows ---')

test('1.1. Unauthenticated users are rejected with UNAUTHENTICATED', () => {
  assert(phase6Sql.includes("IF v_user_id IS NULL THEN"), 'check_in_tournament_participant must check auth.uid()')
  assert(phase6Sql.includes("'error_code', 'UNAUTHENTICATED'"), 'Must return UNAUTHENTICATED')
})

test('1.2. Unregistered users are rejected with NOT_REGISTERED', () => {
  assert(phase6Sql.includes("IF NOT FOUND THEN"), 'Must verify registration row')
  assert(phase6Sql.includes("'error_code', 'NOT_REGISTERED'"), 'Must return NOT_REGISTERED')
})

test('1.3. Cancelled registrations are rejected with REGISTRATION_CANCELLED', () => {
  assert(phase6Sql.includes("LOWER(COALESCE(v_reg.status, '')) = 'cancelled'"), 'Must check cancelled registration')
  assert(phase6Sql.includes("'error_code', 'REGISTRATION_CANCELLED'"), 'Must return REGISTRATION_CANCELLED')
})

test('1.4. Early check-in before check-in window opens is rejected with CHECKIN_NOT_OPEN', () => {
  assert(phase6Sql.includes("IN ('draft', 'published', 'registration open')"), 'Must detect pre-checkin stages')
  assert(phase6Sql.includes("'error_code', 'CHECKIN_NOT_OPEN'"), 'Must return CHECKIN_NOT_OPEN')
})

test('1.5. Late check-in after check-in window closes is rejected with CHECKIN_CLOSED', () => {
  assert(phase6Sql.includes("NOT IN ('check-in open', 'registration closed')"), 'Must reject when not in open check-in window')
  assert(phase6Sql.includes("'error_code', 'CHECKIN_CLOSED'"), 'Must return CHECKIN_CLOSED')
})

test('1.6. Valid registered captain or squad teammate can check in during Check-in Open', () => {
  assert(phase6Sql.includes("INSERT INTO public.match_checkins"), 'Must insert into match_checkins')
  assert(phase6Sql.includes("'status', 'CHECKED_IN'"), 'Must return status CHECKED_IN')
})

test('1.7. Duplicate check-in is idempotent and returns existing record without duplicate slot creation', () => {
  assert(phase6Sql.includes("SELECT id, status, uid_match_status, lobby_slot"), 'Must query existing checkin')
  assert(phase6Sql.includes("IF FOUND THEN"), 'Must handle existing checkin')
  assert(phase6Sql.includes("'message', 'You are already checked in for this match.'"), 'Must inform user idempotently')
})

test('1.8. Locked roster strictly rejects check-in modifications with ROSTER_LOCKED', () => {
  assert(phase6Sql.includes("IF v_existing_checkin.status = 'LOCKED' THEN"), 'Must check for LOCKED status')
  assert(phase6Sql.includes("'error_code', 'ROSTER_LOCKED'"), 'Must return ROSTER_LOCKED')
})

// ----------------------------------------------------------------------------
// GROUP 2: FREE FIRE UID VERIFICATION & DISCREPANCY HANDLING
// ----------------------------------------------------------------------------
console.log('\n--- GROUP 2: Free Fire UID Verification & Mismatch Handling ---')

test('2.1. Matching Free Fire UID is recognized and marked as UID_MATCH', () => {
  assert(phase6Sql.includes("IF v_clean_uid = v_registered_uid"), 'Must compare clean checkin UID with registered UID')
  assert(phase6Sql.includes("v_uid_match_status := 'UID_MATCH';"), 'Must assign UID_MATCH')
})

test('2.2. Mismatching Free Fire UID is detected and marked as UID_MISMATCH (does not overwrite registered UID)', () => {
  assert(phase6Sql.includes("v_uid_match_status := 'UID_MISMATCH';"), 'Must flag UID_MISMATCH')
  assert(!phase6Sql.includes("UPDATE public.tournament_registrations SET captain_uid = v_clean_uid"), 'Must NEVER silently overwrite registered UID')
})

test('2.3. Admin UID verification requires admin authority and audits action', () => {
  assert(phase6Sql.includes("CREATE OR REPLACE FUNCTION public.admin_verify_participant_uid"), 'admin_verify_participant_uid must exist')
  assert(phase6Sql.includes("IF NOT (public.is_admin() OR (SELECT current_setting('role', true)) = 'service_role') THEN"), 'Admin check required')
  assert(phase6Sql.includes("'ADMIN_REQUIRED'"), 'Must return ADMIN_REQUIRED for unauthorized calls')
  assert(phase6Sql.includes("'PLAYER_VERIFIED'"), 'Must record audit log for player verification')
})

test('2.4. Admin can approve (ADMIN_VERIFIED) or reject (REJECTED) UID discrepancy', () => {
  assert(phase6Sql.includes("v_new_uid_status := 'ADMIN_VERIFIED';"), 'Must support ADMIN_VERIFIED')
  assert(phase6Sql.includes("v_new_uid_status := 'REJECTED';"), 'Must support REJECTED')
})

// ----------------------------------------------------------------------------
// GROUP 3: LOBBY SLOT ASSIGNMENT & CONFLICT PREVENTION
// ----------------------------------------------------------------------------
console.log('\n--- GROUP 3: Lobby Slot Assignment & Conflict Prevention ---')

test('3.1. Automatic lobby slot assignment allocates lowest available slot (1..max_teams)', () => {
  assert(phase6Sql.includes("v_candidate_slot := 1;"), 'Must start searching from slot 1')
  assert(phase6Sql.includes("WHILE v_candidate_slot <= v_max_slots LOOP"), 'Must search through max_slots')
  assert(phase6Sql.includes("v_assigned_slot := v_candidate_slot;"), 'Must assign lowest vacant slot')
})

test('3.2. Database constraint prevents duplicate slot assignment in same tournament', () => {
  assert(phase6Sql.includes("CONSTRAINT uq_match_checkins_slot UNIQUE (tournament_id, lobby_slot)"), 'Unique constraint on (tournament_id, lobby_slot) must exist')
})

test('3.3. Database constraint prevents duplicate team check-in in same tournament', () => {
  assert(phase6Sql.includes("CONSTRAINT uq_match_checkins_registration UNIQUE (tournament_id, registration_id)"), 'Unique constraint on (tournament_id, registration_id) must exist')
})

test('3.4. Admin slot assignment checks slot bounds and rejects occupied slots with SLOT_UNAVAILABLE', () => {
  assert(phase6Sql.includes("CREATE OR REPLACE FUNCTION public.admin_assign_lobby_slot"), 'admin_assign_lobby_slot must exist')
  assert(phase6Sql.includes("'error_code', 'SLOT_UNAVAILABLE'"), 'Must return SLOT_UNAVAILABLE if slot is taken')
  assert(phase6Sql.includes("'error_code', 'SLOT_OUT_OF_BOUNDS'"), 'Must validate slot bounds')
  assert(phase6Sql.includes("'SLOT_REASSIGNED'"), 'Must log slot reassignment event')
})

// ----------------------------------------------------------------------------
// GROUP 4: SERVER-AUTHORITATIVE MATCH READINESS
// ----------------------------------------------------------------------------
console.log('\n--- GROUP 4: Server-Authoritative Match Readiness ---')

test('4.1. check_match_readiness RPC evaluates registered vs checked-in participants', () => {
  assert(phase6Sql.includes("CREATE OR REPLACE FUNCTION public.check_match_readiness"), 'check_match_readiness must exist')
  assert(phase6Sql.includes("v_total_checked_in"), 'Must calculate checked-in count')
  assert(phase6Sql.includes("v_verified_count"), 'Must calculate verified count')
})

test('4.2. Incomplete match with 0 check-ins is marked is_ready = false', () => {
  assert(phase6Sql.includes("IF v_total_checked_in = 0 THEN\n    v_is_ready := FALSE;"), '0 check-ins must be marked not ready')
})

test('4.3. Match with unresolved UID discrepancies is marked is_ready = false', () => {
  assert(phase6Sql.includes("IF v_mismatch_count > 0 THEN\n    v_is_ready := FALSE;"), 'Unresolved UID mismatches must block readiness')
})

test('4.4. Match with missing slot assignments is marked is_ready = false', () => {
  assert(phase6Sql.includes("IF v_slots_count < v_total_checked_in THEN\n    v_is_ready := FALSE;"), 'Unassigned slots must block readiness')
})

test('4.5. Cancelled or completed matches return is_ready = false', () => {
  assert(phase6Sql.includes("LOWER(COALESCE(v_tourn.status, '')) = 'cancelled'"), 'Cancelled status check')
  assert(phase6Sql.includes("LOWER(COALESCE(v_tourn.status, '')) IN ('completed', 'prize distributed', 'archived')"), 'Completed status check')
})

// ----------------------------------------------------------------------------
// GROUP 5: ROSTER LOCK & IMMUTABILITY
// ----------------------------------------------------------------------------
console.log('\n--- GROUP 5: Roster Lock & Immutability ---')

test('5.1. admin_lock_match_roster transitions tournament to Check-in Closed and checkins to LOCKED', () => {
  assert(phase6Sql.includes("CREATE OR REPLACE FUNCTION public.admin_lock_match_roster"), 'admin_lock_match_roster must exist')
  assert(phase6Sql.includes("status = 'Check-in Closed'"), 'Must update tournament status to Check-in Closed')
  assert(phase6Sql.includes("status = 'LOCKED'"), 'Must update checkins status to LOCKED')
  assert(phase6Sql.includes("'ROSTER_LOCKED'"), 'Must log ROSTER_LOCKED to audit log')
})

test('5.2. Locked check-ins cannot be modified by players', () => {
  assert(phase6Sql.includes("IF v_existing_checkin.status = 'LOCKED' THEN"), 'Must guard against modifying locked records')
})

// ----------------------------------------------------------------------------
// GROUP 6: MATCH INCIDENT & REMAKE SECURITY
// ----------------------------------------------------------------------------
console.log('\n--- GROUP 6: Match Incident & Remake Security ---')

test('6.1. match_incidents table exists with valid incident type constraints', () => {
  assert(phase6Sql.includes("CREATE TABLE IF NOT EXISTS public.match_incidents"), 'match_incidents table must exist')
  assert(phase6Sql.includes("'PLAYER_DISCONNECTED'"), 'Must support PLAYER_DISCONNECTED')
  assert(phase6Sql.includes("'REMAKE_REQUEST'"), 'Must support REMAKE_REQUEST')
  assert(phase6Sql.includes("'TECHNICAL_ISSUE'"), 'Must support TECHNICAL_ISSUE')
})

test('6.2. Registered participants can report incidents for their tournament', () => {
  assert(phase6Sql.includes("CREATE OR REPLACE FUNCTION public.report_match_incident"), 'report_match_incident RPC must exist')
  assert(phase6Sql.includes("SELECT EXISTS (\n      SELECT 1 FROM public.tournament_registrations"), 'Must verify caller registration in tournament')
  assert(phase6Sql.includes("'INCIDENT_REPORTED'"), 'Must audit incident report')
})

test('6.3. Unauthorized users cannot report incidents for tournaments they are not in', () => {
  assert(phase6Sql.includes("IF NOT v_is_registered THEN"), 'Must block non-participants')
  assert(phase6Sql.includes("'error_code', 'NOT_REGISTERED'"), 'Must return NOT_REGISTERED')
})

test('6.4. Admin incident resolution requires admin authority', () => {
  assert(phase6Sql.includes("CREATE OR REPLACE FUNCTION public.admin_resolve_match_incident"), 'admin_resolve_match_incident must exist')
  assert(phase6Sql.includes("IF NOT (public.is_admin() OR (SELECT current_setting('role', true)) = 'service_role') THEN"), 'Admin check required')
})

test('6.5. Duplicate incident resolution is prevented with INCIDENT_ALREADY_RESOLVED', () => {
  assert(phase6Sql.includes("IF v_incident.status IN ('APPROVED', 'REJECTED', 'RESOLVED') THEN"), 'Check if already resolved')
  assert(phase6Sql.includes("'INCIDENT_ALREADY_RESOLVED'"), 'Must return INCIDENT_ALREADY_RESOLVED')
})

test('6.6. Approved remake resets room status to Draft and reopens check-in with audit logging', () => {
  assert(phase6Sql.includes("v_clean_action = 'REMAKE'"), 'Must detect REMAKE action')
  assert(phase6Sql.includes("room_status = 'Draft'"), 'Must reset room status to Draft')
  assert(phase6Sql.includes("status = 'Check-in Open'"), 'Must reset tournament status to Check-in Open')
  assert(phase6Sql.includes("'REMAKE_APPROVED'"), 'Must log REMAKE_APPROVED to audit trail')
})

// ----------------------------------------------------------------------------
// GROUP 7: ROW LEVEL SECURITY & CROSS-TENANT ISOLATION
// ----------------------------------------------------------------------------
console.log('\n--- GROUP 7: Row Level Security & Cross-Tenant Isolation ---')

test('7.1. Direct INSERT, UPDATE, DELETE on match_checkins is revoked from authenticated players', () => {
  assert(phase6Sql.includes("REVOKE INSERT, UPDATE, DELETE ON public.match_checkins FROM PUBLIC, anon, authenticated;"), 'Direct mutations revoked')
})

test('7.2. Direct INSERT, UPDATE, DELETE on match_incidents is revoked from authenticated players', () => {
  assert(phase6Sql.includes("REVOKE INSERT, UPDATE, DELETE ON public.match_incidents FROM PUBLIC, anon, authenticated;"), 'Direct mutations revoked')
})

test('7.3. Incident read policy restricts non-admins to their own registered tournaments', () => {
  assert(phase6Sql.includes('CREATE POLICY "Participants read tournament incidents"'), 'Participant read policy must exist')
  assert(phase6Sql.includes("tr.tournament_id = match_incidents.tournament_id"), 'Must filter by tournament_id')
})

// ----------------------------------------------------------------------------
// GROUP 8: SERVICE LAYER & CLIENT CONTRACTS
// ----------------------------------------------------------------------------
console.log('\n--- GROUP 8: Service Layer & Client Contracts ---')

test('8.1. matchCheckinService exports checkInParticipant and handles RPC response', () => {
  assert(checkinService.includes("export async function checkInParticipant"), 'Must export checkInParticipant')
  assert(checkinService.includes("check_in_tournament_participant"), 'Must call check_in_tournament_participant RPC')
})

test('8.2. matchCheckinService exports checkMatchReadiness and returns structured report', () => {
  assert(checkinService.includes("export async function checkMatchReadiness"), 'Must export checkMatchReadiness')
  assert(checkinService.includes("check_match_readiness"), 'Must call check_match_readiness RPC')
})

test('8.3. matchCheckinService exports adminVerifyParticipantUid, adminAssignLobbySlot, and adminLockMatchRoster', () => {
  assert(checkinService.includes("export async function adminVerifyParticipantUid"), 'Must export adminVerifyParticipantUid')
  assert(checkinService.includes("export async function adminAssignLobbySlot"), 'Must export adminAssignLobbySlot')
  assert(checkinService.includes("export async function adminLockMatchRoster"), 'Must export adminLockMatchRoster')
})

test('8.4. matchCheckinService exports reportMatchIncident and adminResolveMatchIncident', () => {
  assert(checkinService.includes("export async function reportMatchIncident"), 'Must export reportMatchIncident')
  assert(checkinService.includes("export async function adminResolveMatchIncident"), 'Must export adminResolveMatchIncident')
})

// ----------------------------------------------------------------------------
// GROUP 9: AUDIT LOGGING & ANTI-LEAKAGE
// ----------------------------------------------------------------------------
console.log('\n--- GROUP 9: Audit Logging & Anti-Leakage ---')

test('9.1. match_operations_audit_log records all Phase 6 operational events', () => {
  const events = ['PLAYER_CHECKED_IN', 'PLAYER_VERIFIED', 'SLOT_REASSIGNED', 'ROSTER_LOCKED', 'INCIDENT_REPORTED', 'INCIDENT_RESOLVED', 'REMAKE_APPROVED']
  for (const ev of events) {
    assert(phase6Sql.includes(`'${ev}'`), `Audit log must record ${ev}`)
  }
})

test('9.2. Zero room passwords, auth tokens, or secrets logged in checkin migration or audit log', () => {
  assert(!phase6Sql.includes("details ->> 'room_password'"), 'No plaintext passwords in audit')
  assert(!phase6Sql.includes("'room_password', v_clean_password"), 'No plaintext passwords in audit')
  assert(!checkinService.includes("roomPassword"), 'Checkin service must never handle room password')
})

// ----------------------------------------------------------------------------
// SUMMARY REPORT
// ----------------------------------------------------------------------------
console.log('\n================================================================================')
console.log(`PHASE 6 TEST RESULTS: ${passed} PASSED | ${failed} FAILED`)
console.log('================================================================================')

if (failed > 0) {
  process.exit(1)
} else {
  process.exit(0)
}
