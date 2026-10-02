// test_phase7_match_scoring_payouts.mjs
// Comprehensive automated test suite for Phase 7: Live Match Scoring, Screenshot OCR & Authoritative Prize Distribution (MJ ESPORTS)

import fs from 'fs'
import path from 'path'
import assert from 'assert'

const ROOT = process.cwd()

console.log('================================================================================')
console.log('MJ ESPORTS — PHASE 7: LIVE MATCH SCORING, OCR & PRIZE DISTRIBUTION TEST SUITE')
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
const phase7Sql = fs.readFileSync(path.join(ROOT, 'supabase_phase7_match_scoring_and_payouts.sql'), 'utf8').replace(/\r\n/g, '\n')
const scoringService = fs.readFileSync(path.join(ROOT, 'src', 'services', 'matchScoringService.js'), 'utf8')
const matchResultsView = fs.readFileSync(path.join(ROOT, 'src', 'components', 'admin', 'results', 'MatchResultsWorkspaceView.jsx'), 'utf8')
const prizeUtils = fs.readFileSync(path.join(ROOT, 'src', 'utils', 'tournamentPrizeUtils.js'), 'utf8')

// ----------------------------------------------------------------------------
// GROUP 1: SCHEMA & DATA INTEGRITY
// ----------------------------------------------------------------------------
console.log('--- GROUP 1: Schema & Data Integrity ---')

test('1.1. match_scorecards table defines strictly typed schema with checks on non-negative values', () => {
  assert(phase7Sql.includes('CREATE TABLE IF NOT EXISTS public.match_scorecards'), 'match_scorecards table must exist')
  assert(phase7Sql.includes('reported_kills INT NOT NULL DEFAULT 0 CHECK (reported_kills >= 0)'), 'reported_kills must be non-negative')
  assert(phase7Sql.includes('reported_placement INT CHECK (reported_placement IS NULL OR reported_placement >= 1)'), 'reported_placement must be >= 1')
  assert(phase7Sql.includes("verification_status TEXT NOT NULL DEFAULT 'PENDING'"), 'Default verification status must be PENDING')
  assert(phase7Sql.includes("IN ('PENDING', 'VERIFIED', 'FLAGGED', 'REJECTED')"), 'verification_status must enforce check constraint')
})

test('1.2. match_slot_results table defines unique constraints on lobby slot and placement', () => {
  assert(phase7Sql.includes('CREATE TABLE IF NOT EXISTS public.match_slot_results'), 'match_slot_results table must exist')
  assert(phase7Sql.includes('CONSTRAINT uq_match_slot_results_slot UNIQUE (tournament_id, lobby_slot)'), 'Unique constraint on tournament_id and lobby_slot required')
  assert(phase7Sql.includes('CONSTRAINT uq_match_slot_results_placement UNIQUE (tournament_id, placement)'), 'Unique constraint on tournament_id and placement required')
})

test('1.3. Indexing created on tournament_id, match_id, and verification status', () => {
  assert(phase7Sql.includes('idx_match_scorecards_tournament'), 'Tournament index on scorecards must exist')
  assert(phase7Sql.includes('idx_match_slot_results_tournament'), 'Tournament index on slot results must exist')
  assert(phase7Sql.includes('idx_match_scorecards_verification'), 'Verification index must exist')
})

// ----------------------------------------------------------------------------
// GROUP 2: SCORECARD EVIDENCE SUBMISSION (submit_match_scorecard)
// ----------------------------------------------------------------------------
console.log('\n--- GROUP 2: Scorecard Evidence Submission (submit_match_scorecard) ---')

test('2.1. Unauthenticated users are rejected with UNAUTHENTICATED', () => {
  assert(phase7Sql.includes('IF v_user_id IS NULL THEN'), 'Must check auth.uid()')
  assert(phase7Sql.includes("'error_code', 'UNAUTHENTICATED'"), 'Must return UNAUTHENTICATED error code')
})

test('2.2. Unregistered participants are rejected with NOT_REGISTERED', () => {
  assert(phase7Sql.includes('FROM public.match_checkins'), 'Must verify match_checkins record')
  assert(phase7Sql.includes("'error_code', 'NOT_REGISTERED'"), 'Must return NOT_REGISTERED error code')
})

test('2.3. Lobby slot mismatch rejects unauthorized slot reporting with SLOT_MISMATCH', () => {
  assert(phase7Sql.includes('v_checkin.lobby_slot <> p_lobby_slot'), 'Must compare reported slot with verified checkin slot')
  assert(phase7Sql.includes("'error_code', 'SLOT_MISMATCH'"), 'Must return SLOT_MISMATCH')
})

test('2.4. Negative reported values are rejected with INVALID_INPUT', () => {
  assert(phase7Sql.includes('p_reported_kills < 0'), 'Must validate kills non-negative')
  assert(phase7Sql.includes('p_reported_placement < 1'), 'Must validate placement >= 1')
  assert(phase7Sql.includes("'error_code', 'INVALID_INPUT'"), 'Must return INVALID_INPUT')
})

test('2.5. Scorecard evidence is recorded with status PENDING and audit log created', () => {
  assert(phase7Sql.includes('INSERT INTO public.match_scorecards'), 'Must insert into match_scorecards')
  assert(phase7Sql.includes("'SCORECARD_SUBMITTED'"), 'Must audit SCORECARD_SUBMITTED')
  assert(phase7Sql.includes("'verification_status', 'PENDING'"), 'Initial status must be PENDING')
})

// ----------------------------------------------------------------------------
// GROUP 3: SERVER-AUTHORITATIVE SCORE CALCULATION (calculate_and_finalize_scores)
// ----------------------------------------------------------------------------
console.log('\n--- GROUP 3: Server-Authoritative Score Calculation ---')

test('3.1. Finalization strictly requires admin or service_role authorization', () => {
  assert(phase7Sql.includes('CREATE OR REPLACE FUNCTION public.calculate_and_finalize_scores'), 'calculate_and_finalize_scores RPC must exist')
  assert(phase7Sql.includes("IF NOT (public.is_admin() OR (SELECT current_setting('role', true)) = 'service_role') THEN"), 'Admin check required')
  assert(phase7Sql.includes("'ADMIN_REQUIRED'"), 'Must return ADMIN_REQUIRED')
})

test('3.2. Acquires row lock FOR UPDATE on tournaments to prevent race conditions', () => {
  assert(phase7Sql.includes('FOR UPDATE'), 'Must acquire row lock FOR UPDATE')
})

test('3.3. Evaluates Free Fire standard esports points table authoritatively', () => {
  assert(phase7Sql.includes('WHEN 1 THEN v_placement_pts := 12;'), 'Booyah must award 12 points')
  assert(phase7Sql.includes('WHEN 2 THEN v_placement_pts := 9;'), '2nd place must award 9 points')
  assert(phase7Sql.includes('WHEN 3 THEN v_placement_pts := 8;'), '3rd place must award 8 points')
  assert(phase7Sql.includes('WHEN 4 THEN v_placement_pts := 7;'), '4th place must award 7 points')
  assert(phase7Sql.includes('WHEN 5 THEN v_placement_pts := 6;'), '5th place must award 6 points')
})

test('3.4. Exact formula: Total Points = Placement Points + Kill Points + Bonus Points', () => {
  assert(phase7Sql.includes('v_total_pts := v_placement_pts + v_kill_pts + v_bonus;'), 'Total points must strictly equal placement + kills + bonus')
})

test('3.5. Standings are ranked by Total Points desc, then Kills desc as authoritative tie-breaker', () => {
  assert(phase7Sql.includes('v_total_pts > v_top_points OR (v_total_pts = v_top_points AND v_kills > v_top_kills)'), 'Must track winner by total points desc, kills desc')
})

// ----------------------------------------------------------------------------
// GROUP 4: ESPORTS SANITY & ANTI-CHEAT GUARDS
// ----------------------------------------------------------------------------
console.log('\n--- GROUP 4: Esports Sanity & Anti-Cheat Guards ---')

test('4.1. Kill count anomaly guard: Total reported kills cannot exceed maximum lobby players', () => {
  assert(phase7Sql.includes('v_total_lobby_kills > v_max_possible_kills'), 'Must check kill ceiling against max possible participants')
  assert(phase7Sql.includes("'error_code', 'KILL_COUNT_ANOMALY'"), 'Must reject anomalous kill counts with KILL_COUNT_ANOMALY')
})

test('4.2. Placement uniqueness guard: Duplicate finish placement ranks are strictly rejected', () => {
  assert(phase7Sql.includes('v_placement = ANY(v_seen_placements)'), 'Must check if placement rank was already used')
  assert(phase7Sql.includes("'error_code', 'DUPLICATE_PLACEMENT'"), 'Must return DUPLICATE_PLACEMENT')
})

test('4.3. Active remake incident guard: Blocks scoring if unaddressed remake requests exist', () => {
  assert(phase7Sql.includes("incident_type = 'REMAKE_REQUEST'"), 'Must check remake incident requests')
  assert(phase7Sql.includes("'error_code', 'ACTIVE_REMAKE_REQUEST'"), 'Must return ACTIVE_REMAKE_REQUEST')
})

// ----------------------------------------------------------------------------
// GROUP 5: PRIZE ALLOCATION & PAYOUT QUEUE SAFEGUARDS
// ----------------------------------------------------------------------------
console.log('\n--- GROUP 5: Prize Allocation & Payout Queue Safeguards ---')

test('5.1. Supports Winner Takes All prize distribution model', () => {
  assert(phase7Sql.includes("v_prize_type IN ('winner_takes_all'"), 'Must identify Winner Takes All model')
  assert(phase7Sql.includes('v_team_winnings := v_winner_prize;'), 'Winner gets full prize allocation')
})

test('5.2. Supports Per-Kill Only prize distribution model', () => {
  assert(phase7Sql.includes("v_prize_type IN ('per_kill'"), 'Must identify Per Kill model')
  assert(phase7Sql.includes('v_team_winnings := v_kills * v_per_kill_rate;'), 'Payout must equal kills * per_kill_rate')
})

test('5.3. Supports Placement + Per-Kill Hybrid prize distribution model', () => {
  assert(phase7Sql.includes("v_prize_type IN ('placement_kill', 'placement_plus_kill', 'placement_and_kill', 'hybrid')"), 'Must identify Placement + Kill model')
  assert(phase7Sql.includes('v_team_winnings := v_team_winnings + (v_kills * v_per_kill_rate);'), 'Payout must sum placement reward and kill rewards')
})

test('5.4. Hard prize pool ceiling guard: Total payout liability cannot exceed tournament prize pool', () => {
  assert(phase7Sql.includes('v_total_calculated_prize > (v_configured_prize_pool + 5)'), 'Must verify total payout liability against prize pool ceiling')
  assert(phase7Sql.includes("'error_code', 'EXCEEDS_PRIZE_POOL'"), 'Must return EXCEEDS_PRIZE_POOL')
})

test('5.5. Payout queue proposals are generated with safe idempotency keys', () => {
  assert(phase7Sql.includes("'payout_' || p_tournament_id || '_slot_' || v_slot || '_' || v_placement"), 'Safe idempotency key format')
  assert(phase7Sql.includes('finalize_tournament_results'), 'Delegates to atomic finalization RPC')
})

// ----------------------------------------------------------------------------
// GROUP 6: STORAGE INVARIANTS & ANTI-LEAKAGE (PHASE 4 COMPLIANCE)
// ----------------------------------------------------------------------------
console.log('\n--- GROUP 6: Storage Invariants & Anti-Leakage (Phase 4 Compliance) ---')

test('6.1. Dropped buckets (scoreboard-proofs, match-scorecards) are NEVER resurrected in Phase 7', () => {
  assert(!phase7Sql.includes("'scoreboard-proofs'"), 'Must NOT reference scoreboard-proofs bucket')
  assert(!phase7Sql.includes("'match-scorecards'"), 'Must NOT reference match-scorecards bucket')
  assert(!scoringService.includes("'scoreboard-proofs'"), 'Service must not reference scoreboard-proofs')
  assert(!scoringService.includes("'match-scorecards'"), 'Service must not reference match-scorecards')
})

test('6.2. Scorecard proofs store relative paths in authorized private profile-proofs bucket', () => {
  assert(phase7Sql.includes('storage_path TEXT'), 'Must store storage_path reference')
  assert(!phase7Sql.includes('CREATE BUCKET'), 'Phase 7 must not create unvetted storage buckets')
})

test('6.3. Zero API keys, secrets, or service-role credentials exposed in client code', () => {
  assert(!scoringService.includes('SUPABASE_SERVICE_ROLE_KEY'), 'No service role key in scoring service')
  assert(!scoringService.includes('RAZORPAY_KEY_SECRET'), 'No payment secret in scoring service')
})

// ----------------------------------------------------------------------------
// GROUP 7: SERVICE LAYER & CLIENT CONTRACTS
// ----------------------------------------------------------------------------
console.log('\n--- GROUP 7: Service Layer & Client Contracts ---')

test('7.1. matchScoringService exports submitMatchScorecard with fallback compatibility', () => {
  assert(scoringService.includes('export async function submitMatchScorecard'), 'Must export submitMatchScorecard')
  assert(scoringService.includes("supabase.rpc('submit_match_scorecard'"), 'Must call submit_match_scorecard RPC')
})

test('7.2. matchScoringService exports fetchTournamentScorecards and fetchTournamentSlotResults', () => {
  assert(scoringService.includes('export async function fetchTournamentScorecards'), 'Must export fetchTournamentScorecards')
  assert(scoringService.includes('export async function fetchTournamentSlotResults'), 'Must export fetchTournamentSlotResults')
})

test('7.3. matchScoringService exports calculateAndFinalizeScores with server RPC call', () => {
  assert(scoringService.includes('export async function calculateAndFinalizeScores'), 'Must export calculateAndFinalizeScores')
  assert(scoringService.includes("supabase.rpc('calculate_and_finalize_scores'"), 'Must call calculate_and_finalize_scores RPC')
})


test('7.5. MatchResultsWorkspaceView links Phase 6 lobby slots to teams', () => {
  assert(matchResultsView.includes('getTournamentCheckins'), 'Must import getTournamentCheckins')
  assert(matchResultsView.includes('chk.lobby_slot'), 'Must map lobby_slot from checkins')
  assert(matchResultsView.includes('SLOT'), 'Must render SLOT column in table')
})


test('7.7. MatchResultsWorkspaceView calls calculateAndFinalizeScores upon finalization', () => {
  assert(matchResultsView.includes('calculateAndFinalizeScores'), 'Must invoke calculateAndFinalizeScores')
  assert(matchResultsView.includes('KILL_COUNT_ANOMALY'), 'Must handle kill anomaly feedback')
  assert(matchResultsView.includes('ACTIVE_REMAKE_REQUEST'), 'Must handle remake request feedback')
})

// ----------------------------------------------------------------------------
// GROUP 8: OPERATIONAL AUDIT LOGGING
// ----------------------------------------------------------------------------
console.log('\n--- GROUP 8: Operational Audit Logging ---')

test('8.1. match_operations_audit_log records SCORES_FINALIZED with detailed metrics', () => {
  assert(phase7Sql.includes("'SCORES_FINALIZED'"), 'Must audit SCORES_FINALIZED')
  assert(phase7Sql.includes("'total_kills', v_total_lobby_kills"), 'Must audit total_kills')
  assert(phase7Sql.includes("'total_payout_liability', v_total_calculated_prize"), 'Must audit total_payout_liability')
  assert(phase7Sql.includes("'winner_team', v_winner_team"), 'Must audit winner_team')
})

// ----------------------------------------------------------------------------
// SUMMARY REPORT
// ----------------------------------------------------------------------------
console.log('\n================================================================================')
console.log(`PHASE 7 TEST RESULTS: ${passed} PASSED | ${failed} FAILED`)
console.log('================================================================================')

if (failed > 0) {
  process.exit(1)
} else {
  process.exit(0)
}
