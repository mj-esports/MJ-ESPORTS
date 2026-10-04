# MJ ESPORTS — Engineering & Operational Rules (RULES.md)

> **CRITICAL NOTICE:** This document constitutes the binding engineering law for all human developers, reviewers, and AI coding agents operating on the MJ ESPORTS repository. Every rule defined herein must be strictly adhered to without exception.

---

## 1. General Development Rules

1. **Inspect Before Modifying:** Always inspect the actual codebase, active SQL definitions, and component hierarchies before proposing or implementing changes. Never make assumptions about table columns, RPC arguments, or component props.
2. **Understand Existing Architecture:** Respect the decoupled client/server boundary (`Frontend → Service Layer → PostgREST/RPC → RLS/PostgreSQL`). Never introduce ad-hoc architecture or direct client mutations where service wrappers and RPCs exist.
3. **Do Not Invent Functionality:** Do not assume or hallucinate features, fields, or endpoints that are not in the repository. Verify all claims against live code.
4. **Do Not Duplicate Functionality:** Before writing a helper, service method, or SQL function, search the repository. Reuse existing utilities in `src/utils/`, services in `src/services/`, and RPCs in PostgreSQL.
5. **Prefer Existing Components:** Leverage verified design system primitives and components in `src/components/common/`, `src/components/tournament/`, and `src/components/team/` rather than re-creating visual elements.
6. **Strict Task Scoping:** Restrict modifications strictly to the files and components required for the immediate task. Never opportunistically refactor unrelated modules, touch formatting on untouched files, or edit out-of-scope workflows.

---

## 2. Security Rules

1. **Never Bypass Row-Level Security (RLS):** All production tables MUST have RLS enabled (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`). No table may have permissive `USING (true)` or `WITH CHECK (true)` policies for non-admin mutations (`INSERT`, `UPDATE`, `DELETE`).
2. **Never Bypass Server-Authoritative RPCs:** All privileged state transitions, financial transactions, roster changes, registrations, and scoring finalizations MUST execute via PostgreSQL `SECURITY DEFINER` RPCs. The client is strictly a presentation tier.
3. **Never Trust Client Data:** The server RPC must independently validate player identities, auth sessions (`auth.uid()`), tournament capacities, roster sizes, UID formats, and lifecycle prerequisites.
4. **Never Move Authorization to Client:** Client-side checks (e.g., hiding buttons, routing guards) are strictly for user experience. Authorization must be authoritatively verified inside the database via `auth.uid()` and `public.is_admin()`.
5. **Lock Down `SECURITY DEFINER` Functions:**
   - Every `SECURITY DEFINER` function MUST specify `SET search_path = public, pg_temp` to eliminate search-path hijacking attacks.
   - Always revoke `EXECUTE` privileges from `PUBLIC` and `anon` on sensitive administrative RPCs (`REVOKE EXECUTE ON FUNCTION ... FROM PUBLIC, anon;`).
   - Explicitly grant execution only to `authenticated` users when appropriate (`GRANT EXECUTE ON FUNCTION ... TO authenticated;`).
6. **No Client-Side Sensitive Secrets:**
   - Never place `SUPABASE_SERVICE_ROLE_KEY`, database superuser credentials, or third-party secret keys in frontend environment variables (`VITE_*`) or anywhere under `src/`.
   - The frontend must only possess `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
7. **Never Log Sensitive Credentials:**
   - Never log plain-text passwords, room credentials, authorization tokens, or private identity data to `console.log`, client monitoring, or unmasked database tables.
   - Match room passwords must be masked (`[CONFIGURED]`) in audit logs (`public.match_operations_audit_log`).
8. **Preserve `auth.uid()` Identity Isolation:** Users may only mutate records they own, invite users as themselves, or check in to matches where their verified profile is on the confirmed roster.
9. **Preserve Admin Authorization Checks:** All administrative actions must verify `public.is_admin()` inside the SQL transaction before applying state mutations.

---

## 3. Database & SQL Rules

1. **Additive Schema Evolution:**
   - Always apply schema changes additively (`ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`).
   - Wrap constraint creation in safe `DO $$ BEGIN ... END $$;` blocks to prevent deployment collisions.
2. **Preserve Existing Constraints & Indexes:** Never drop foreign keys, unique constraints, or validation check constraints without explicit system architecture review and approval.
3. **Inspect Before Creating:** Check existing migrations and schema before defining new tables or functions. Do not create duplicate RPCs or divergent variants of existing RPCs.
4. **Maintain Relational Integrity:** Enforce foreign keys with appropriate cascade rules (`ON DELETE CASCADE` for dependent child records like match check-ins, `ON DELETE RESTRICT` for structural entities).
5. **Safe Data Types:**
   - Use `UUID` for entity primary keys (`DEFAULT gen_random_uuid()`).
   - Store monetary values and prize allocations as `NUMERIC(10,2)` or integer cents—never floating point (`FLOAT`/`REAL`).
   - Store Indian phone numbers and Free Fire UIDs as `VARCHAR(10)` or `TEXT` with strict regex check constraints (`^[0-9]{10}$`) to preserve leading zeros.
6. **No Silent Rule Changes:** Business constraints (e.g., maximum squad size of 6, maximum 12 matches per tournament, single active team constraint) must never be altered silently.
7. **Never Delete Production Schema:** Destructive commands (`DROP TABLE`, `TRUNCATE`, cascade drops) are strictly forbidden in production migrations.

---

## 4. Tournament Rules

1. **Supported Game:** Strictly **Free Fire MAX**. Legacy battle royale titles (BGMI, PUBG, etc.) are strictly prohibited.
2. **Tournament Formats & Capacities:**
   - **Solo:** 50 slots, 1 player per slot (50 players total).
   - **Duo:** 25 slots, 2 players per slot (50 players total).
   - **Squad:** 12 slots, 4 players per slot (48 players total + 2 spectator/admin slots = 50 room capacity cap).
3. **Lifecycle State Machine:**
   - Valid lifecycle transitions: `Upcoming` → `Registration Open` → `Check-in Open` → `Ongoing / Live` → `Results Pending` → `Completed` (or `Cancelled`).
   - Registrations automatically close when slot capacity is reached or when the registration deadline expires.
4. **Registration Rules:**
   - Registrations must be submitted via the server-authoritative `register_tournament_participant` RPC.
   - Enforce duplicate registration prevention: A player UID cannot be registered twice in the same tournament.
   - Enforce roster validation: The submitted team size must match the tournament format requirement.

---

## 5. Match & Multi-Round Rules (N2)

1. **Match Schedule Invariants:**
   - A tournament can have between 1 and 12 scheduled matches.
   - Match numbers must be contiguous positive integers starting at 1 (`1, 2, 3, ...`).
   - Deletion of an intermediate unstarted match triggers atomic server-side reindexing to maintain sequence integrity.
2. **Match Lifecycle:**
   - States: `Scheduled` → `Check-in Open` → `Room Ready` → `Live` → `Completed` (or `Cancelled`).
   - Completed and Live matches cannot have their room credentials modified or be deleted without administrative incident clearance.
3. **Numeric Room Credentials (SEC-03):**
   - Free Fire Custom Room IDs must consist strictly of 5–10 digits (`^[0-9]{5,10}$`).
   - Custom Room Passwords must consist strictly of 4–10 digits (`^[0-9]{4,10}$`).
   - Credentials can only be released when the match status is `Room Ready` or `Live` and after the captain's registration is confirmed.
4. **Check-In Protocol:**
   - Check-in window opens before match start (typically 15–30 minutes prior).
   - Only confirmed captains or registered solo players can submit check-in.
   - Failure to check in marks the slot as absent, enabling waitlist substitution.

---

## 6. Team & Squad Portal Rules (N3)

1. **Roster Structure (Max 6 Players):**
   - Exactly 1 **Captain** (creator/owner with full management rights).
   - Up to 3 active **Members** (forming the 4-player starting core lineup).
   - Up to 2 **Substitutes / Bench** players.
   - Default ceiling: 6 active roster members per squad (enforced by `chk_teams_max_members` with permissible range 4–8).
2. **Single Active Team Policy:**
   - A user can belong to only ONE Active team at any given time.
   - Enforced by partial unique database index: `idx_team_members_single_active_user ON team_members (user_id) WHERE status = 'Active'`.
3. **Captaincy & Ownership Rules:**
   - A captain cannot leave their team without explicitly transferring captaincy to an active member.
   - If a captain leaves and is the sole remaining member, the team is automatically disbanded.
   - Disbanding a team cancels all pending invitations and notifies all members.
4. **Invitation Lifecycle:**
   - Invitations expire automatically after 7 days (`expires_at = NOW() + INTERVAL '7 days'`).
   - Only the team captain can issue, cancel, or modify invitations.
   - Duplicate pending invitations for the same user to the same squad are blocked by unique constraint.
5. **Tournament Auto-Fill (N3.5):**
   - Team auto-fill in `SlotBookingModal.jsx` is strictly a client-side UX convenience.
   - The server registration RPC remains the final, sole authority validating roster eligibility, UID uniqueness, and format compliance.

---

## 7. Scoring & Leaderboard Rules

1. **Scoring Model (Free Fire MAX Standard):**
   - **Placement Points:**
     - 1st Place: 12 pts
     - 2nd Place: 9 pts
     - 3rd Place: 8 pts
     - 4th Place: 7 pts
     - 5th Place: 6 pts
     - 6th Place: 5 pts
     - 7th Place: 4 pts
     - 8th Place: 3 pts
     - 9th Place: 2 pts
     - 10th Place: 1 pt
     - 11th–12th Place: 0 pts
   - **Kill Points:** +1 pt per confirmed kill.
   - **Total Points:** `Placement Points + (Total Kills * 1) + Bonus Points`.
2. **Anomaly Protection:**
   - Kill count anomaly guard: Total reported kills across all teams in a match cannot exceed the lobby player capacity.
   - Prize pool ceiling guard: Sum of proposed payouts cannot exceed the authorized tournament prize pool.
   - Active remake guard: Scoring cannot be finalized if there is an unresolved match remake request.
3. **Leaderboard Aggregation:**
   - Tournament standings aggregate all completed rounds.
   - Tiebreakers: Highest total placement points, then highest total kill points, then most recent match placement.

---

## 8. Notification & Realtime Rules (N1)

1. **Atomic Notification Dispatch:**
   - All state transitions (match scheduling, room release, team invites, removals, remakes) must generate notifications within the same atomic database transaction.
2. **RLS on Notifications:**
   - `SELECT`, `UPDATE` (mark read), and `DELETE` on `public.notifications` must enforce `user_id = auth.uid()`.
   - Players cannot inspect or alter other players' notifications.
3. **Realtime WebSocket Delivery:**
   - Client listens via Supabase Realtime channel for `INSERT` events on `notifications` filtered by `user_id=eq.${user.id}`.
   - The unread badge count updates reactively in the global Navbar.

---

## 9. Payment Isolation Rule (MANDATORY)

> [!CAUTION]
> **PAYMENT IS A SEPARATE, DEFERRED WORKSTREAM.**

1. **Do Not Touch Payment Code:** Do not modify, refactor, or delete existing payment drafts in `src/services/tournamentPaymentService.js`, `supabase/functions/verify-razorpay-payment/`, or `SlotBookingModal.jsx`.
2. **Do Not Add Payment Logic to Unrelated Features:** Never introduce payment requirements, wallet deduction checks, or gateway calls into tournament registration, match scheduling, or team management.
3. **Do Not Remove Payment Drafts:** Leave deferred payment infrastructure intact in the working tree until the payment milestone is explicitly authorized.
4. **Do Not Claim Payment is Live:** Documentation and UI copy must clearly state that automated payments and wallet top-ups are currently deferred.
5. **Future Isolation:** When payment work is resumed, it must be executed in its own dedicated, tightly scoped phase with full sandbox verification.

---

## 10. Git & Version Control Rules

1. **Inspect Git Status First:** Always run `git status --short` and `git diff --stat` before staging or editing files.
2. **Selective Staging Only:** Stage only the specific files modified for the active task.
   - **STRICTLY PROHIBITED:** `git add .`
   - **STRICTLY PROHIBITED:** `git add -A`
   - **STRICTLY PROHIBITED:** `git commit -am`
3. **Never Touch Unrelated Work:** Never clean, reset, checkout, or stash working tree modifications belonging to other streams (e.g., deferred payment drafts).
4. **Review Diffs Before Commit:** Always run `git diff --staged` to verify that only intended changes are included in the commit.
5. **Atomic Commit Messages:** Follow the Conventional Commits specification:
   - `feat(scope): ...` for new features
   - `fix(scope): ...` for bug fixes
   - `docs(scope): ...` for documentation
   - `test(scope): ...` for test suites
6. **Push Only at Approved Checkpoints:** Never push to remote branches without explicit authorization and verification that all tests pass.

---

## 11. Testing & Quality Assurance Rules

Every meaningful code modification must complete the mandatory verification pipeline before commit:

```text
IMPLEMENTATION
      ↓
TARGETED AUTOMATED TESTS (Domain test scripts)
      ↓
FULL REGRESSION SUITE (Zero failures tolerated)
      ↓
PRODUCTION BUILD (npm run build with 0 errors)
      ↓
SECURITY & RLS AUDIT (Zero leaked secrets / RPC search_path verified)
      ↓
MANUAL / BROWSER REVIEW
      ↓
SELECTIVE COMMIT
      ↓
CONTROLLED PUSH
```

- Target assertion pass rate: **100%**.
- Production build must succeed with zero Vite/Rollup errors.

---

## 12. Permanent Documentation Contract

> **RULE:** "DOCUMENTATION IS PART OF DEVELOPMENT."

No development phase, architectural change, bug fix, or feature is considered complete until its documentation has been updated.

### Phase Execution Workflow:
1. **Read Relevant Documentation:** Review `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/RULES.md`, and `docs/DESIGN.md` before writing code.
2. **Implement Task:** Write code respecting all engineering and security rules.
3. **Test:** Run domain tests, full regression, and production build.
4. **Update Affected Documentation:**
   - If product behavior or features changed → Update `docs/PRD.md`.
   - If system architecture, RPCs, or schema changed → Update `docs/ARCHITECTURE.md`.
   - If engineering constraints, lifecycles, or rules changed → Update `docs/RULES.md`.
   - If UI styling, components, or tokens changed → Update `docs/DESIGN.md`.
   - Always update roadmap/status in `docs/TASKS.md`.
   - If a permanent milestone or decision occurred → Update `docs/MEMORY.md`.
5. **Consistency Check:** Ensure no documentation file contradicts another.
6. **Review Git Diff:** Verify documentation updates alongside implementation code.
