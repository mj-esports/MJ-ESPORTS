# MJ ESPORTS — Permanent Project Context & Engineering Memory (MEMORY.md)

## 1. Project Identity & Scope
- **Project Name:** MJ ESPORTS
- **Product Scope:** Competitive esports tournament orchestration and permanent squad management platform exclusively for **Free Fire MAX** players and organizers in India.
- **Game Focus:** Strictly Free Fire MAX (Bermuda, Purgatory, Kalahari, Alpine, Nexterra). All legacy titles (BGMI, PUBG) are completely removed.
- **Room Limits:** 50 players max room capacity clamp (Squad: 12 squads = 48 players; Duo: 25 duos = 50 players; Solo: 50 players).

---

## 2. Technology Stack
- **Frontend:** React 19 (`19.2.7`), React Router DOM (`7.18.1`), Vite (`8.1.1`), Tailwind CSS 4 (`4.3.3`), `@supabase/supabase-js` (`2.110.7`), `lucide-react` (`1.25.0`).
- **Backend / Database:** PostgreSQL 15 on Supabase, PostgREST, Supabase Auth, Row-Level Security (RLS), Supabase Storage, Supabase Realtime (WebSockets), Supabase Edge Functions (Deno).
- **Design System:** Google Stitch UI-1 cyberpunk aesthetic with dark tonal depth (`#131314`), Cyber Cyan (`#00f2ff`), and Action Orange (`#ff5e07`).

---

## 3. Core Architecture Principles
- **Decoupled Client/Server:** Frontend is strictly a presentation tier. All state transitions, validations, financial logic, and scoring are server-authoritative.
- **Data Flow Pattern:** `Frontend UI → Service Layer (src/services/) → PostgREST RPC → RLS / PostgreSQL Database`. Direct unprivileged table writes are disabled.
- **Layout Tiers:** Standalone `AuthLayout` for login/signup, global `MainLayout` with Navbar for public/player pages, and `AdminLayout` with sidebar for operators.

---

## 4. Critical Security Principles
- **RLS Invariant:** 100% of tables have Row-Level Security enabled. No permissive `WITH CHECK (true)` policies for non-admin mutations.
- **RPC Lockdown:** 100% of `SECURITY DEFINER` functions specify `SET search_path = public, pg_temp` to prevent search-path hijacking.
- **Privilege Separation:** `EXECUTE` privileges on sensitive administrative RPCs are revoked from `PUBLIC` and `anon`.
- **Zero Secrets on Client:** No `service_role` keys or third-party secret keys exist in frontend code (`src/`). Only `VITE_SUPABASE_ANON_KEY` is public.
- **Credential Masking:** Match room passwords are strictly numeric (4–10 digits) and masked (`[CONFIGURED]`) in audit logs.
- **Bot Defense:** Cloudflare Turnstile validated server-side via `verify-turnstile-token` Edge Function.

---

## 5. Important Database Conventions
- **Schema Evolution:** Strictly additive (`ADD COLUMN IF NOT EXISTS`, safe `DO $$ BEGIN ... END $$;` constraint wrappers).
- **Primary Keys:** UUID v4 (`DEFAULT gen_random_uuid()`).
- **Identifiers:** Free Fire Character UIDs and Indian mobile numbers are stored as 10-digit strings (`CHECK (uid ~ '^[0-9]{10}$')`) to preserve leading zeros.
- **Monetary Data:** Stored as `NUMERIC(10,2)` or integer cents. Never floating point.

---

## 6. Domain Rules Summary
- **Tournament Lifecycle:** `Upcoming` → `Registration Open` → `Check-in Open` → `Live` → `Results Pending` → `Completed` (or `Cancelled`).
- **Match Scheduling (N2):** 1 to 12 scheduled matches per tournament with contiguous 1-based numbering. Deletion triggers automatic sequence reindexing.
- **Squad / Team System (N3):** Max 6 players per team (1 Captain, up to 3 core Members, up to 2 Substitutes; clamped by `chk_teams_max_members` 4–8 range). Players may only belong to ONE active team at a time (enforced by partial unique index).
- **Scoring Engine (Phase 7):** Free Fire MAX standard: 1st (12 pts), 2nd (9 pts), 3rd (8 pts), 4th (7 pts), 5th (6 pts), 6th (5 pts), 7th (4 pts), 8th (3 pts), 9th (2 pts), 10th (1 pt), 11th–12th (0 pts) + 1 pt per kill. Anomaly guards prevent kill counts exceeding lobby capacity or payouts exceeding prize pools.
- **Notifications (N1):** Atomic database triggers dispatch to `public.notifications` (`user_id = auth.uid()`), delivered live to clients via Supabase Realtime WebSockets.

---

## 7. Deferred Payment Workstream (MANDATORY)
- **Status:** **EXPLICITLY DEFERRED.** Razorpay gateway, real-money wallet top-ups, automated payment webhooks, and automated bank payouts are paused.
- **Isolation Rule:** Never modify, clean, or delete uncommitted working-tree payment drafts. Never add payment logic to tournament, match, or squad features. Keep payment in its own future dedicated phase.

---

## 8. Development, Testing & Git Workflows
- **Engineering Rule:** Inspect before modifying. Understand existing code before writing new code. No fabricated functionality.
- **Testing Standard:** Mandatory 8-step pipeline: `Implement → Targeted Tests → Full Regression → Production Build (npm run build) → Security Audit → Manual Review → Selective Commit → Push`. Pass rate must be 100%.
- **Git Discipline:** Selective staging only (`git add <file>`). Never use `git add .`, `git add -A`, or `git commit -am`. Never touch unrelated working-tree modifications.
- **Documentation Contract:** "DOCUMENTATION IS PART OF DEVELOPMENT." Every future phase, bug fix, or feature MUST update its corresponding documentation files (`PRD.md`, `ARCHITECTURE.md`, `RULES.md`, `DESIGN.md`, `TASKS.md`, `MEMORY.md`) before completion.

---

## 9. Major Completed Milestones
- **Phase 1–5:** Core Auth, Profiles, Free Fire MAX Engine, 5-Step Tournament Wizard, Registration & Waitlist.
- **Phase 6:** Custom Room Operations, Numeric Credentials (SEC-03), Captain Check-In.
- **Phase 7:** Authoritative Match Scoring, Free Fire Scoring Matrix, Anomaly Guards, Cumulative Leaderboards.
- **Phase 12:** Removed legacy OCR schema; unified referee scorecard review workflow.
- **Phase N1:** Realtime Notification Schema, Atomic Triggers, Navbar Bell Drawer.
- **Phase N2:** Multi-Round Match Scheduling, Contiguous Reindexing, Match Control Console.
- **Phase N3:** Player Team Management, Permanent Squads, 10 RPCs, Squad Portal (`/profile/team`), Registration Auto-Fill (`SlotBookingModal.jsx`).
- **Documentation System:** Complete authoritative repository documentation suite established under `docs/`.

