# MJ ESPORTS — Technical Architecture & Systems Manual

## 1. High-Level Architectural Overview

MJ ESPORTS is architected as a modern, decoupled Single Page Application (SPA) backed by a serverless PostgreSQL database and Supabase infrastructure. The frontend acts strictly as a presentation and client-state layer, while all business rules, authorization, concurrency controls, and state transitions are enforced server-side.

```mermaid
graph TD
    Client["React 19 Frontend (Vite 8 SPA)"] -->|User Events| Services["Frontend Service Abstractions"]
    Services -->|Supabase-JS v2 (Anon Key Only)| PostgREST["Supabase PostgREST API"]
    Services -->|HTTP POST| EdgeFn["Supabase Edge Functions (Turnstile siteverify)"]
    PostgREST -->|RPC Invocation / JWT Auth Context| Postgres["PostgreSQL 15 (Supabase)"]
    
    subgraph "PostgreSQL Server-Authoritative Layer"
        Postgres --> RLS["Row-Level Security (RLS) Policies"]
        Postgres --> RPCs["SECURITY DEFINER RPCs (SET search_path = public, pg_temp)"]
        RPCs --> Tables[("Production Tables")]
        Tables --> Triggers["Integrity Triggers (One-Active-Team, Audit Logs)"]
    end
    
    Tables --> Realtime["Supabase Realtime (WebSockets)"]
    Realtime -->|INSERT notifications| Client
```

---

## 2. Frontend Architecture

### 2.1 Technology Stack
- **Framework:** React `19.2.7` with React DOM `19.2.7`.
- **Build Tool:** Vite `8.1.1` with `@vitejs/plugin-react` and `@tailwindcss/vite`.
- **Routing:** React Router DOM `7.18.1` with route-level code splitting via `React.lazy` and `Suspense`.
- **Styling:** Tailwind CSS `4.3.3` with custom cyberpunk theme tokens in `src/index.css`.
- **Icons:** `lucide-react` `1.25.0`.
- **Client SDK:** `@supabase/supabase-js` `2.110.7` initialized strictly with public anon keys.

### 2.2 Application Structure
```text
src/
├── components/          # Reusable UI components by feature domain
│   ├── admin/           # Administrative control center views & tournament wizard
│   ├── common/          # Global UI primitives (Navbar, Footer, Modals, Buttons)
│   ├── team/            # Player team/squad portal cards, roster, and modals (N3)
│   └── tournament/      # Tournament cards, slot booking modal, match schedule (N2)
├── contexts/            # Global application state providers
│   ├── AuthContext.jsx  # Authentication session, player profile, and RBAC
│   ├── ToastContext.jsx # Toast notification queue (success/error/info)
│   └── TournamentContext.jsx # Tournament state, registrations, and room details
├── layouts/             # Multi-tier route layouts
│   ├── AuthLayout.jsx   # Dedicated standalone layout for auth pages
│   ├── MainLayout.jsx   # Public & player layout with global Navbar
│   └── AdminLayout.jsx  # Control center layout with AdminHeader and AdminSidebar
├── lib/                 # Core client configuration (supabase.js)
├── pages/               # Top-level view entry points (lazy-loaded)
├── routes/              # Routing definitions, ProtectedRoute, and AdminRoute
├── services/            # Pure frontend abstractions over Supabase RPCs
└── utils/               # Pure utility functions (formatting, validation, prizes)
```

### 2.3 Route Architecture & Layout Tiers
Routes are defined centrally in `src/routes/AppRoutes.jsx`:
- **Tier 1 — Auth Layout (`/login`, `/register`, `/reset-password`):** Standalone distraction-free layout with Turnstile bot protection.
- **Tier 2 — Main Layout (`/`, `/tournaments`, `/tournaments/:id`, `/leaderboard`, `/about`):** Public viewing experience.
  - **Protected Player Routes:** Nested under `ProtectedRoute` (`/dashboard`, `/profile`, `/profile/team`, `/profile/edit`, `/profile/statistics`, `/profile/history`, `/profile/achievements`, `/settings`).
- **Tier 3 — Admin Layout (`/admin`, `/admin/match-control`, `/admin/results`, `/admin/finance`):** Guarded strictly by `AdminRoute`, which evaluates the server-authoritative `is_admin()` check. Unauthorized visitors redirect to `/403`.

### 2.4 Service Layer Abstraction Pattern
Components never execute raw SQL or direct table insertions on protected entities. Instead, components invoke dedicated service functions:
- `teamService.js`: Encapsulates all 10 squad portal RPCs (`create_player_team`, `invite_team_member`, etc.).
- `matchSchedulingService.js`: Encapsulates multi-round match queries and RPCs (`schedule_tournament_matches`, `update_match_status`, etc.).
- `matchCheckinService.js`: Handles captain check-in, readiness checks, and lobby slot assignments.
- `matchScoringService.js`: Handles 6-parameter scorecard submissions and official points finalization.
- `notificationService.js`: Handles unread count queries, mark-read RPCs, and Realtime websocket subscriptions.

---

## 3. Backend & Database Architecture

### 3.1 PostgreSQL Database Schema
All database tables reside in the `public` schema:

| Table Name | Primary Purpose | Key Constraints & Invariants |
| :--- | :--- | :--- |
| `tournaments` | Core tournament metadata, rules, capacity, and status. | `CHECK (max_teams IN (12, 25, 50))` for Free Fire Squad/Duo/Solo modes. |
| `tournament_registrations` | Confirmed team registrations and captain links. | Unique constraints on active registrations per user/UID; foreign key to `tournaments`. |
| `matches` | Multi-round match schedule for tournaments (N2). | Unique constraint on `(tournament_id, match_number)`. Matches order contiguous 1..12. |
| `match_checkins` | Pre-match participant check-ins and lobby slots. | Unique constraint on `(match_id, registration_id)` and `(match_id, lobby_slot)`. |
| `match_scorecards` | Captain scorecard submissions with screenshot proofs. | Checked non-negative values; foreign keys to `matches` and `tournament_registrations`. |
| `match_slot_results` | Authoritative match placement and kill results. | Unique placement rank per match (anti-collision). |
| `match_incidents` | Match incident logs and remakes. | Typed incident severity; audit link to match ID. |
| `match_operations_audit_log` | Immutable operational audit trail for room/match actions. | Credentials redacted; append-only audit records. |
| `teams` | Permanent player competitive clans/squads (N3). | Unique team tag; foreign key to captain profile. |
| `team_members` | Roster links binding players to teams with assigned roles. | Unique user link enforcing the **one-active-team invariant**. Roster capped at 6 slots (4 starters + 2 substitutes). |
| `team_invitations` | Pending, accepted, or rejected squad invitations. | Valid state machine (`pending`, `accepted`, `rejected`, `cancelled`, `expired`). |
| `notifications` | Player-facing in-app notifications (N1). | Row-level tenant isolation (`user_id = auth.uid()`). |
| `profiles` | Extended player identity and Free Fire credentials. | 10-digit UID and phone checks; verified status flag. |

### 3.2 Security Definer & Privilege Lockdown Pattern
All state mutations on protected tables must execute via PostgreSQL `SECURITY DEFINER` functions following this strict pattern:
```sql
CREATE OR REPLACE FUNCTION public.example_mutation_rpc(p_param text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- 1. Strict Authentication Check
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHENTICATED');
  END IF;

  -- 2. Authorization Verification (Admin or Owner)
  -- 3. Concurrency Lock: SELECT ... FOR UPDATE
  -- 4. Business Validation & Atomic State Mutation
  -- 5. Audit Logging
  RETURN jsonb_build_object('success', true);
END;
$$;

-- Revoke default public execution privileges
REVOKE ALL ON FUNCTION public.example_mutation_rpc(p_param text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.example_mutation_rpc(p_param text) FROM anon;
GRANT EXECUTE ON FUNCTION public.example_mutation_rpc(p_param text) TO authenticated;
```

### 3.3 Core Subsystem Architectures

#### A. Multi-Round Match Scheduling Subsystem (N2)
- **Table:** `public.matches`.
- **Scheduling RPC:** `schedule_tournament_matches(p_tournament_id, p_matches)` acquires a row lock on the tournament, validates chronological ordering (each round start ≥ 15 mins after previous), and upserts match records atomically.
- **Match 1 Backward Compatibility:** Standalone single-match tournaments automatically map to Match 1 without schema breakage.

#### B. Player Team Management Subsystem (N3)
- **Tables:** `public.teams`, `public.team_members`, `public.team_invitations`.
- **One-Active-Team Invariant:** Enforced via `check_single_active_team()` trigger and unique partial index on `team_members(user_id) WHERE status = 'active'`.
- **Roster Capacity:** Authoritatively enforced in team RPCs (`invite_player_to_team`, `accept_team_invitation`) rejecting additions if active member count reaches `teams.max_members` (default: 6 members = 1 Captain + 3 Members + up to 2 Substitutes).

#### C. Realtime Player Notification Hub (N1)
- **Table:** `public.notifications`.
- **Realtime Integration:** Configured in `supabase_realtime` publication.
- **Frontend Lifecycle:** `Navbar.jsx` initializes a user-scoped channel (`user_notifications_${userId}`) filtered by `user_id=eq.${userId}`. On unmount or logout, channels are explicitly unsubscribed and purged from memory.

#### D. Room Credentials & Operations Security (SEC-03)
- **Numeric Validation:** Room IDs must be strictly numeric (up to 15 digits) and Passwords numeric PINs (up to 10 digits).
- **Redaction:** Room passwords are never logged into `match_operations_audit_log` and never sent to clients unless the user is an administrator or an approved, checked-in participant.

#### E. Bot Mitigation & Cloudflare Turnstile (SEC-02)
- **Client Challenge:** Invisible or interactive widget rendered in auth and registration forms.
- **Server Siteverify:** Token dispatched to Supabase Edge Function `siteverify`, which validates against Cloudflare's API using the server-side `TURNSTILE_SECRET_KEY` secret. Bypasses are rejected with HTTP 403.

---

## 4. Storage Architecture
Supabase Storage is partitioned into isolated buckets:
- `avatars` (Public): Player profile avatars and squad logos.
- `tournament-banners` (Public): Official tournament banner artwork.
- `profile-proofs` (Private): Player identity evidence screenshots and match scorecards. Access is restricted via RLS policies; files are organized under user-scoped paths (`${userId}/filename.png`).

---

## 5. Security & Isolation Invariants
1. **Zero Client Secrets:** The client bundle contains exclusively `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Zero service_role keys exist in frontend code.
2. **Payment Isolation:** All payment and wallet infrastructure (Razorpay Edge Functions, online top-ups, automated payouts) is strictly isolated. Free tournaments operate without any payment dependencies.
3. **Fail-Closed Design:** Any RPC failure or missing authorization parameter defaults to atomic rollback (`ROLLBACK`) and returns `{ success: false }`.
