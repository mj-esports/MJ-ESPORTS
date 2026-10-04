# MJ ESPORTS — Production Operations Runbook (`OPERATIONS.md`)

This runbook defines the operational standards, recovery protocols, incident response procedures, deployment validation, and emergency rollbacks for the **MJ ESPORTS** production platform.

---

## 1. System Architecture & Tier Overview

| Component | Technology | Operational Role |
| :--- | :--- | :--- |
| **Frontend Shell** | React 19 + Vite 8 + Tailwind CSS 4 | Client SPA hosted on Vercel CDN |
| **Authentication** | Supabase Auth (GoTrue) | JWT session tokens, refresh tokens, Google OAuth |
| **Database & RPCs** | PostgreSQL 15 + PostgREST | Server-authoritative data layer, RLS, `SECURITY DEFINER` |
| **Edge Functions** | Deno Deploy (Supabase Edge) | Cloudflare Turnstile token validation (`verify-turnstile-token`) |
| **Realtime WebSockets**| Supabase Realtime | Live match updates, check-ins, notifications |
| **Storage CDN** | Supabase Storage (S3 API) | Encrypted identity proofs (`profile-proofs`), avatars |

---

## 2. Production Failure Recovery Protocols

### 2.1 Post-Deployment Chunk Hash Invalidation (404 Module Import Error)
- **Symptom:** Users actively browsing during a Vercel release see blank components or console errors: `Failed to fetch dynamically imported module: .../ProfilePage-[hash].js`.
- **Automated Mitigation:** `src/routes/AppRoutes.jsx` implements `lazyWithRetry`. When a dynamic import fails due to hash rotation:
  1. The client intercepts the error.
  2. Inspects `sessionStorage.getItem('mj_chunk_force_reload')`.
  3. If false, sets the flag to `'true'` and triggers an automatic single reload (`window.location.reload()`) to download the fresh `index.html` manifest.
  4. If already attempted once and still failing, routes safely into `ErrorBoundary`.
- **Manual Operator Action:** If persistent, clear CDN edge cache on Vercel Dashboard or instruct users to hard-refresh (`Ctrl+F5` / `Cmd+Shift+R`).

### 2.2 Global React Render Exception
- **Symptom:** Unhandled runtime exception in React component lifecycle.
- **Automated Mitigation:** `src/components/common/ErrorBoundary.jsx` catches the failure, suppresses sensitive stack traces from normal users, logs diagnostic details via `console.error`, and renders a cyberpunk recovery UI with:
  - **Retry Application** (`handleRetry` clears error state and reloads).
  - **Return Home** (Safe navigation link to `/`).
- **Development Mode:** If running in `import.meta.env.DEV`, an expandable `<details>` section displays raw error strings and component stack traces for developers.

### 2.3 Unhandled Promise Rejections
- **Symptom:** Asynchronous rejection outside component tree (e.g., Supabase realtime socket timeout).
- **Automated Mitigation:** Global listener in `src/main.jsx` captures unhandled rejections, filters noisy browser extension events, and logs formatted warnings to `console.warn` without breaking runtime execution.

---

## 3. Authentication & Session Recovery

### 3.1 Expired Session or Invalidation
1. **Normal Player Routes:** `ProtectedRoute.jsx` checks `user` state. If session is destroyed or invalid, cleanly redirects to `/login` preserving the intended destination in `location.state.from`.
2. **Admin Route:** `AdminRoute.jsx` checks `isAdmin` and session.
   - If user is logged out: redirects to `/login`.
   - If user is authenticated but not an admin: redirects to `/403` (Access Denied).
3. **Session Switching:** Top-right ADMIN identity pill in `AdminHeader.jsx` provides **"Open User Portal"** to switch back to player view (`/`) without invalidating tokens or logging the administrator out.

### 3.2 Network Blip During Auth Verification
- If `getUserRole` fails due to a network interruption, it safely falls back to role `'user'` (principle of least privilege). An admin can never accidentally escalate normal users, and temporary network blips resolve upon next token refresh.

---

## 4. Admin Incident Handling

### 4.1 Match Incident & Remake Protocol
- **Location:** `MatchResultsWorkspaceView.jsx` and `MatchControlView.jsx`
- **Procedure:**
  1. When a lobby disconnects or server crash occurs in Free Fire MAX, the Admin logs an incident under the match tab.
  2. The system flags the match with status `Remake Requested`.
  3. Scoring mutations for that round are blocked by PostgreSQL constraints (`ACTIVE_REMAKE_REQUEST`) until the incident is marked resolved.
  4. New room credentials are generated and dispatched to checked-in squad captains.

### 4.2 Room Credential Rotation
- **Security Invariant:** Room Passwords are never queried in plain text during normal schedule views.
- **Admin Action:** Enter `MatchControlView`, select tournament and match round, input new numeric 5-10 digit Room ID and 4-10 digit Room Password, and select **"Publish Credentials"**.
- Captains receive immediate push notifications via Supabase Realtime channel `realtime_tournaments_changes`.

---

## 5. Deployment Verification Checklist

Run before and immediately after any production deployment:

1. **Build Validation:**
   ```bash
   npm run build
   ```
   *Requirement: 0 errors, no broken chunk references.*
2. **Automated Regression Suite:**
   ```bash
   node test_phase16_production_operations.mjs
   node test_admin_user_portal_navigation.mjs
   node test_player_team_navigation.mjs
   node test_mobile_hamburger_menu.mjs
   node test_responsive_viewports.mjs
   ```
3. **Production Smoke Check:**
   ```bash
   node test_production_smoke.mjs
   ```
   *Verifies HTTP 200 on all canonical routes on live production.*

---

## 6. Emergency Git Rollback Procedure

If a critical defect is identified on production that cannot be immediately hotfixed:

### Step 1: Identify Last Known Good Commit
```bash
git log -5 --oneline
```
Identify the target stable commit hash (e.g. `4f995d0`).

### Step 2: Create a Revert Commit (Never Force-Push to Main)
```bash
# Revert the faulty commit cleanly preserving history
git revert <bad-commit-hash> -m 1
```

### Step 3: Run Validation on Revert
```bash
npm run build
node test_production_smoke.mjs
```

### Step 4: Push to Main Branch
```bash
git push origin main
```
Vercel will automatically trigger a clean atomic deployment of the previous stable state within ~45 seconds.

---

## 7. Configuration & Environment Security

- **Client Environment Variables:**
  - `VITE_SUPABASE_URL`: Public HTTPS API URL.
  - `VITE_SUPABASE_ANON_KEY`: Public publishable anonymous key protected by Row Level Security (RLS).
- **Prohibited Secrets:**
  - `SUPABASE_SERVICE_ROLE_KEY` must **NEVER** appear in frontend code, client bundles, or `.env`.
  - `CLOUDFLARE_TURNSTILE_SECRET_KEY` is strictly managed within Supabase Edge Functions environment secrets (`verify-turnstile-token`).
