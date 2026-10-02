// test_phase12_remove_ocr_schema.mjs
// Verification Suite for Phase 12: Remove Obsolete OCR Database Schema

import fs from 'fs'
import path from 'path'
import assert from 'assert'

const ROOT = process.cwd()

console.log('================================================================================')
console.log('MJ ESPORTS — PHASE 12: REMOVE OBSOLETE OCR DATABASE SCHEMA TEST SUITE')
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
    console.error(`     Error: ${err.message}`)
    failed++
  }
}

// ----------------------------------------------------------------------------
// GROUP 1: MIGRATION FILE PRESENCE & STRUCTURE
// ----------------------------------------------------------------------------
console.log('--- GROUP 1: Migration File Presence & Safety Structure ---')

const migrationPath = path.join(ROOT, 'supabase_phase12_remove_ocr_schema.sql')
test('1.1. supabase_phase12_remove_ocr_schema.sql exists and is non-empty', () => {
  assert(fs.existsSync(migrationPath), 'Migration file must exist')
  const stat = fs.statSync(migrationPath)
  assert(stat.size > 500, 'Migration file must be non-empty and substantial')
})

const sqlContent = fs.readFileSync(migrationPath, 'utf8')

test('1.2. Migration is wrapped in an atomic transaction (BEGIN / COMMIT)', () => {
  assert(sqlContent.includes('BEGIN;'), 'Migration must start transaction with BEGIN;')
  assert(sqlContent.includes('COMMIT;'), 'Migration must finalize transaction with COMMIT;')
})

test('1.3. Migration uses explicit schema-qualified names and does NOT drop tables', () => {
  assert(sqlContent.includes('public.match_scorecards'), 'Must schema-qualify match_scorecards')
  assert(sqlContent.includes('public.submit_match_scorecard'), 'Must schema-qualify submit_match_scorecard')
  assert(!sqlContent.includes('DROP TABLE'), 'Must NEVER drop tables')
  assert(!sqlContent.includes('DROP SCHEMA'), 'Must NEVER drop schemas')
})

// ----------------------------------------------------------------------------
// GROUP 2: OCR COLUMN REMOVAL FROM MATCH_SCORECARDS
// ----------------------------------------------------------------------------
console.log('\n--- GROUP 2: OCR Column Removal from match_scorecards ---')

test('2.1. Safely drops ocr_raw_text column with IF EXISTS', () => {
  assert(sqlContent.includes('DROP COLUMN IF EXISTS ocr_raw_text'), 'Must drop ocr_raw_text')
})

test('2.2. Safely drops ocr_candidate_kills column with IF EXISTS', () => {
  assert(sqlContent.includes('DROP COLUMN IF EXISTS ocr_candidate_kills'), 'Must drop ocr_candidate_kills')
})

test('2.3. Safely drops ocr_candidate_placement column with IF EXISTS', () => {
  assert(sqlContent.includes('DROP COLUMN IF EXISTS ocr_candidate_placement'), 'Must drop ocr_candidate_placement')
})

test('2.4. Safely drops ocr_confidence column with IF EXISTS', () => {
  assert(sqlContent.includes('DROP COLUMN IF EXISTS ocr_confidence'), 'Must drop ocr_confidence')
})

// ----------------------------------------------------------------------------
// GROUP 3: OVERLOAD REMOVAL & CLEAN RPC SIGNATURE
// ----------------------------------------------------------------------------
console.log('\n--- GROUP 3: Overload Removal & RPC Signature ---')

test('3.1. Drops legacy 10-parameter overload of submit_match_scorecard', () => {
  assert(
    sqlContent.includes('DROP FUNCTION IF EXISTS public.submit_match_scorecard(') &&
    sqlContent.includes('UUID, INT, INT, INT, TEXT, TEXT, TEXT, INT, INT, NUMERIC'),
    'Must explicitly drop 10-parameter overload'
  )
})

test('3.2. Recreates submit_match_scorecard with exactly 6 parameters', () => {
  assert(sqlContent.includes('CREATE OR REPLACE FUNCTION public.submit_match_scorecard('), 'Must recreate function')
  assert(sqlContent.includes('p_tournament_id UUID,'), 'Must accept p_tournament_id')
  assert(sqlContent.includes('p_lobby_slot INT,'), 'Must accept p_lobby_slot')
  assert(sqlContent.includes('p_reported_kills INT,'), 'Must accept p_reported_kills')
  assert(sqlContent.includes('p_reported_placement INT DEFAULT NULL,'), 'Must accept p_reported_placement')
  assert(sqlContent.includes('p_screenshot_url TEXT DEFAULT NULL,'), 'Must accept p_screenshot_url')
  assert(sqlContent.includes('p_storage_path TEXT DEFAULT NULL'), 'Must accept p_storage_path')
})

test('3.3. submit_match_scorecard parameter list contains zero OCR arguments', () => {
  // Extract parameter block
  const fnMatch = sqlContent.match(/CREATE OR REPLACE FUNCTION public\.submit_match_scorecard\(([\s\S]*?)\)\s*RETURNS/i)
  assert(fnMatch && fnMatch[1], 'Must match function signature')
  const paramsBlock = fnMatch[1]
  assert(!paramsBlock.includes('p_ocr_raw_text'), 'Must not contain p_ocr_raw_text')
  assert(!paramsBlock.includes('p_ocr_candidate_kills'), 'Must not contain p_ocr_candidate_kills')
  assert(!paramsBlock.includes('p_ocr_candidate_placement'), 'Must not contain p_ocr_candidate_placement')
  assert(!paramsBlock.includes('p_ocr_confidence'), 'Must not contain p_ocr_confidence')
})

// ----------------------------------------------------------------------------
// GROUP 4: BUSINESS LOGIC & SECURITY PRESERVATION
// ----------------------------------------------------------------------------
console.log('\n--- GROUP 4: Business Logic & Security Preservation ---')

test('4.1. Preserves authentication check (UNAUTHENTICATED)', () => {
  assert(sqlContent.includes("v_user_id := auth.uid();"), 'Must check auth.uid()')
  assert(sqlContent.includes("'UNAUTHENTICATED'"), 'Must retain UNAUTHENTICATED error')
})

test('4.2. Preserves lifecycle validation (INVALID_LIFECYCLE_STATE)', () => {
  assert(sqlContent.includes("v_tourn.status IN ('Completed', 'Cancelled')"), 'Must check lifecycle')
  assert(sqlContent.includes("'INVALID_LIFECYCLE_STATE'"), 'Must retain INVALID_LIFECYCLE_STATE')
})

test('4.3. Preserves lobby slot & check-in authorization (NOT_REGISTERED, SLOT_MISMATCH)', () => {
  assert(sqlContent.includes("FROM public.match_checkins"), 'Must query match_checkins')
  assert(sqlContent.includes("'NOT_REGISTERED'"), 'Must retain NOT_REGISTERED')
  assert(sqlContent.includes("'SLOT_MISMATCH'"), 'Must retain SLOT_MISMATCH')
})

test('4.4. Preserves non-negative input validation (INVALID_INPUT)', () => {
  assert(sqlContent.includes("p_reported_kills < 0"), 'Must validate kills')
  assert(sqlContent.includes("p_reported_placement < 1"), 'Must validate placement')
  assert(sqlContent.includes("'INVALID_INPUT'"), 'Must retain INVALID_INPUT')
})

test('4.5. Preserves scorecard upsert and audit logging (SCORECARD_SUBMITTED)', () => {
  assert(sqlContent.includes("INSERT INTO public.match_scorecards"), 'Must insert match_scorecards')
  assert(sqlContent.includes("UPDATE public.match_scorecards"), 'Must update match_scorecards')
  assert(sqlContent.includes("INSERT INTO public.match_operations_audit_log"), 'Must record audit log')
  assert(sqlContent.includes("'SCORECARD_SUBMITTED'"), 'Must log SCORECARD_SUBMITTED')
})

test('4.6. Enforces explicit security grants and PostgREST reload notification', () => {
  assert(sqlContent.includes('REVOKE EXECUTE ON FUNCTION public.submit_match_scorecard(UUID, INT, INT, INT, TEXT, TEXT) FROM PUBLIC, anon;'), 'Must revoke anon execute')
  assert(sqlContent.includes('GRANT EXECUTE ON FUNCTION public.submit_match_scorecard(UUID, INT, INT, INT, TEXT, TEXT) TO authenticated, service_role;'), 'Must grant auth execute')
  assert(sqlContent.includes("NOTIFY pgrst, 'reload schema';"), 'Must notify PostgREST')
})

// ----------------------------------------------------------------------------
// GROUP 5: CLIENT INTEGRATION ALIGNMENT
// ----------------------------------------------------------------------------
console.log('\n--- GROUP 5: Client Integration Alignment ---')

test('5.1. matchScoringService.js invokes submit_match_scorecard with exact 6 parameters', () => {
  const serviceCode = fs.readFileSync(path.join(ROOT, 'src', 'services', 'matchScoringService.js'), 'utf8')
  assert(serviceCode.includes("supabase.rpc('submit_match_scorecard'"), 'Must call submit_match_scorecard')
  assert(serviceCode.includes('p_tournament_id: String(tournamentId)'), 'Must pass p_tournament_id')
  assert(serviceCode.includes('p_lobby_slot: parseInt(lobbySlot, 10)'), 'Must pass p_lobby_slot')
  assert(serviceCode.includes('p_reported_kills: parseInt(reportedKills, 10)'), 'Must pass p_reported_kills')
  assert(serviceCode.includes('p_reported_placement: reportedPlacement'), 'Must pass p_reported_placement')
  assert(serviceCode.includes('p_screenshot_url: screenshotUrl'), 'Must pass p_screenshot_url')
  assert(serviceCode.includes('p_storage_path: storagePath'), 'Must pass p_storage_path')
  assert(!serviceCode.includes('p_ocr_'), 'Must NOT pass any p_ocr_ parameters')
})

test('5.2. fetchTournamentScorecards does not request removed OCR columns', () => {
  const serviceCode = fs.readFileSync(path.join(ROOT, 'src', 'services', 'matchScoringService.js'), 'utf8')
  assert(!serviceCode.includes('ocr_raw_text'), 'Must not select ocr_raw_text')
  assert(!serviceCode.includes('ocr_candidate_kills'), 'Must not select ocr_candidate_kills')
  assert(!serviceCode.includes('ocr_candidate_placement'), 'Must not select ocr_candidate_placement')
  assert(!serviceCode.includes('ocr_confidence'), 'Must not select ocr_confidence')
})

console.log('================================================================================')
console.log(`PHASE 12 VERIFICATION RESULTS: ${passed} PASSED | ${failed} FAILED`)
console.log('================================================================================\n')

if (failed > 0) {
  process.exit(1)
}
