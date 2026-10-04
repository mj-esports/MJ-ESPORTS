# MJ ESPORTS — Product Requirements Document (PRD)

## 1. Product Overview

### 1.1 Product Name
**MJ ESPORTS**

### 1.2 Product Purpose
MJ ESPORTS is an esports tournament and squad management platform designed specifically for competitive **Free Fire MAX** players and organizers in India. It provides end-to-end tournament lifecycle orchestration—from registration and slot reservation to multi-round match scheduling, captain check-in, numeric room credential distribution, authoritative scoring, global leaderboards, realtime player notifications, and squad roster management.

### 1.3 Product Vision
To be the premier, competitive, cheat-resistant, and high-performance esports platform for mobile gaming communities, delivering tournament automation, verified player identities, and a high-contrast cyberpunk user experience.

### 1.4 Target Audience
1. **Competitive Players:** Mobile esports athletes competing in Free Fire MAX tournaments across Solo, Duo, and Squad modes.
2. **Squad Captains / Clan Leaders:** Team managers organizing rosters, managing member invitations, assigning roles, and registering squads for events.
3. **Tournament Administrators:** Operators creating tournaments, configuring match schedules, auditing registrations, releasing room credentials, overseeing live matches, and finalizing official results.

---

## 2. Product Scope & Classification

| Status Category | Description | Included Features |
| :--- | :--- | :--- |
| **CURRENT / IMPLEMENTED** | Fully built, integrated, tested, and live in the current production release. | Auth, Profiles, Free Fire MAX Engine, Tournament Wizard, Registration, Multi-Round Match Scheduling (N2), Check-In (Phase 6), Room Credentials (SEC-03), Scoring (Phase 7), Notifications (N1), Squad Portal (N3), Team Auto-Fill (N3.5), Cloudflare Turnstile (SEC-02), Storage, Legal/Rulebook. |
| **DEFERRED** | Intentionally paused by project decision. Isolated in separate working drafts; not part of the active production release. | Online Payment Gateway (Razorpay), live UPI/wallet top-ups, automated webhook processing, and automated bank payout disbursement. |
| **FUTURE / PROPOSED** | Roadmapped for future milestones following payment integration. | Native Android/iOS mobile application, automated visual tournament brackets, live stream spectator overlays. |

---

## 3. Core Functional Capabilities (Implemented)

### 3.1 Dedicated Free Fire MAX Platform Engine
MJ ESPORTS exclusively supports **Free Fire MAX**. All arbitrary legacy game references (e.g. BGMI, PUBG) have been removed.
- **Supported Maps:** Bermuda, Purgatory, Kalahari, Alpine, Nexterra.
- **Competition Formats:**
  - **Solo:** 50 slots, 1 player per slot (50 players max).
  - **Duo:** 25 slots, 2 players per slot (50 players max).
  - **Squad:** 12 slots, 4 players per slot (48 players total + 2 spectator/admin slots = 50 room capacity cap).
- **Match Configurations:** Character skills toggles (Enabled/Disabled) and Gun attributes toggles (Enabled/Disabled).

### 3.2 Player Identity & Profile System
- **Authentication:** Email/password and Google OAuth via Supabase Auth with session persistence, password reset, and sign-out teardown.
- **Identity Invariants:**
  - 10-digit Free Fire MAX Character UID (numeric only, leading zeroes preserved).
  - 10-digit Indian WhatsApp/Phone contact number.
  - Unicode in-game name (IGN) support with canonical normalization for clan tags, ornaments, and superscripts.
- **Profile Hub:**
  - `/profile`: Core dashboard, bio, verified character UID, and competitive tier.
  - `/profile/edit`: Identity details, avatar management, and re-verification triggers upon UID modification.
  - `/profile/statistics`: Real tournament win rate, total confirmed kills, and podium ratios.
  - `/profile/history`: Filtered tournament history matching confirmed records.
  - `/profile/achievements`: Deterministic milestone unlock badges (First Blood, Booyah Champion, Veteran Competitor).
  - `/settings`: Security preferences and account management.

### 3.3 Player Team Management & Squad Portal (N3)
- **Permanent Squads:** Players can establish persistent clans/squads at `/profile/team`.
- **Roster Structure (Max 6 Players):**
  - Exactly 1 **Captain** (creator/owner with full management rights).
  - Up to 3 active **Members** (forming the 4-player starting core lineup).
  - Up to 2 **Substitutes** (reserve bench players).
  - Enforced by database constraint `chk_teams_max_members` (default: 6, range: 4–8) and `chk_team_members_role` (`Captain`, `Member`, `Substitute`).
- **One-Active-Team Invariant:** A player can only belong to one active team at any given time (enforced via database triggers and unique constraints).
- **Invitation Lifecycle:** Captains invite players by registered username or email. Players can `ACCEPT` or `REJECT` invitations. Captains can `CANCEL` outgoing pending invites.
- **Roster Controls:** Captains can promote/demote between Member and Substitute, transfer Captaincy to another roster member, or remove members (with explicit confirmation modals). Non-captains can leave the squad voluntarily.

### 3.4 Tournament Creation & Configuration
- **Modular 5-Step Admin Wizard:**
  1. *Basic Info:* Title, Free Fire MAX platform lock, format (Solo/Duo/Squad), description, banner asset.
  2. *Format & Rules:* Map selection, skills/gun attribute rules, official rulebook binding.
  3. *Schedule & Rounds:* Registration window, check-in window, room release time, and match start time with chronological sequence validation.
  4. *Prizes & Slots:* Free vs. paid configuration, slot capacity presets, prize models (Per-Kill Only, Placement Only, Placement + Kill Hybrid, Winner Takes All).
  5. *Review & Publish:* Complete sanity validation, Draft save option, or immediate publication to `Registration Open`.

### 3.5 Tournament Registration & Auto-Fill (N3.5)
- **Canonical RPC:** Registration executed via the 19-parameter `register_tournament_team` PostgreSQL `SECURITY DEFINER` function with row locking (`FOR UPDATE`).
- **Team Auto-Fill:** "Use My Team" button in the slot booking modal pre-populates client form fields with active squad members from `/profile/team` (Solo, Duo, Squad modes). Client auto-fill does not bypass server validation.
- **Approval & Waitlist (SEC-04):**
  - Automatic Approval: Instantly assigns `Approved` status and decrements available capacity.
  - Manual Approval: Assigns `Pending` status and reserves capacity pending admin review.
  - Waitlist Queuing: When capacity is reached and waitlist is enabled, registrations queue with status `Waitlist` without exceeding the tournament slot counter.

### 3.6 Multi-Round Match Scheduling (N2)
- **Multi-Match Engine:** Tournaments support 1 to 12 sequentially scheduled rounds in `public.matches`.
- **Chronological Validation:** Consecutive matches must have scheduled start times separated by at least 15 minutes.
- **Status State Machine:** `Scheduled` → `Check-in Open` → `Room Ready` → `Live` → `Completed` / `Cancelled`.
- **Admin Match Control:** Interactive multi-match tabbed selector in `MatchControlView`, allowing administrators to manage room credentials, check-in, and lifecycle state independently for each round.
- **Player Match Schedule:** Dedicated public timetable on `TournamentDetailPage` displaying round numbers, map names, scheduled times, and live status badges without exposing administrative credentials.

### 3.7 Match Check-In & Room Operations (Phase 6 & SEC-03)
- **Check-in Window:** 15-minute pre-match check-in requirement for registered captains.
- **Numeric Room Credentials:**
  - Room ID: strictly numeric digits (1 to 15 digits).
  - Room Password / PIN: strictly numeric digits (4 to 10 digits).
  - Redacted from audit logs and visible only to checked-in, approved participants when status is `Room Ready` or `Live`.

### 3.8 Match Scoring & Leaderboards (Phase 7 & Phase 12)
- **Free Fire Official Scoring Matrix:**
  - 1st Place (Booyah!): 12 pts
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
  - Eliminations: +1 pt per confirmed kill.
- **Tie-Breaking:** Total points descending, broken by total kills descending.
- **Anomaly Detection:** Rejects impossible kill counts exceeding lobby capacity and duplicate finish ranks.
- **Clean Scorecard Pipeline:** Captain screenshot evidence upload via private `profile-proofs` bucket and audited 6-parameter `submit_match_scorecard` RPC (obsolete OCR schema completely dropped in Phase 12).

### 3.9 Player Realtime Notification Hub (N1)
- Persistent notifications stored in `public.notifications` table.
- Realtime Supabase publication updates unread notification counter instantly in desktop Navbar and mobile drawer.
- Interactive notification dropdown tray with direct router deep-linking and batch mark-all-read RPC.
- Graceful degradation: If websocket disconnects, polling/fetching continues without breaking the UI.

### 3.10 Bot Protection & Security (SEC-02 & SEC-05)
- **Cloudflare Turnstile:** Invisible bot detection integrated into Login, Registration, and Slot Booking forms. Validated server-side via Supabase Edge Function (`siteverify`) with fail-closed enforcement.
- **Guest Guard (SEC-05):** Unauthenticated visitors cannot open or trigger slot booking submissions.
- **Row-Level Security (RLS):** Enabled across 100% of production tables.

---

## 4. Explicitly Deferred Functionality

Payment integration was formally paused and deprecated by project architecture decision.
The following items remain **DEFERRED** and out of scope:
1. **Production Razorpay Gateway:** Live API key activation, webhook signature verification in Edge Functions, and automated payment callbacks.
2. **Online Wallet Top-Ups:** Direct UPI, Netbanking, or card deposits into user wallets.
3. **Automated Payout Disbursements:** Automated bank transfers from the prize queue (prize calculations are completed server-side, but disbursements are handled operationally/manually).

---

## 5. Non-Functional & Operational Requirements
- **Performance:** Production build compiles in < 5 seconds with chunk splitting (`vendor-react`, `vendor-supabase`, `vendor-libs`).
- **Responsive Coverage:** Fluid layout testing across 7 standard viewports (375px, 390px, 430px, 768px, 1024px, 1280px, 1440px).
- **Accessibility:** Minimum touch targets of 44px, WAI-ARIA modal dialogs (`role="dialog"`, `aria-modal="true"`), and keyboard navigation (Escape key dismissal).
- **Observability:** Zero sensitive PII, passwords, or diagnostic dumps in browser production console logs.
