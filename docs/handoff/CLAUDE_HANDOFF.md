# DJHQ + Set2Go: Claude Code Engineering Handoff

**Baseline Source:** Transferred directly from `docs/handoff/CODEX_SESSION_TRANSFER.md` and verified session state.  
**Platform Umbrella:** DJHQ (`djhq.app`) hosting Artist Website Manager (`/hq/website`) and Set2Go (`/set2go`).

---

## 1. Architectural Decisions & Current Baseline

1. **Product Hub Structure:**
   - `/hq` is the authenticated DJHQ Product Hub.
   - The Artist Website Manager is at `/hq/website`.
   - Set2Go is at `/set2go`.
   - `/admin` behavior is unchanged.
   - Legacy `/dashboard` routes issue a permanent redirect (308) to `/hq/website`, preserving path suffixes and query parameters.
2. **Server-Side Entitlement & Isolation:**
   - Product visibility is derived strictly on the server from the authenticated Supabase user (`auth.getUser()`).
   - Website access requires artist ownership or membership in the platform-admin email allowlist (`DJHQ_PLATFORM_ADMIN_EMAILS`).
   - Set2Go access is currently development-only, requiring an exact UUID match with `SET2GO_DEV_CLOUD_USER_ID`.
   - UI cards do not grant or authorize access; all routes and Set2Go local job APIs enforce checks on the server.
   - R2 cloud endpoints enforce development flags and strict origin checks (`http://127.0.0.1:3000`).
3. **Authentication & Redirection Security:**
   - OAuth callback destinations are strictly restricted to local paths; external `next` destinations fall back safely to `/hq`.
   - Unauthenticated requests to `/hq`, `/hq/website`, and `/set2go` redirect to `/sign-in`.

---

## 2. Completed & Verified Functionality

- **Product Hub Navigation & Layout:**
  - Authenticated session in Chrome at `http://127.0.0.1:3000/hq` rendered both product cards for the verified allowlisted developer account.
  - The Website card navigates to `/hq/website` (artist identity, releases, shows, bookings, press kit); "All products" returns to `/hq`.
  - The Set2Go card navigates to `/set2go`; local Rekordbox workflow remains intact, with navigation back to the Hub.
  - Responsive design verified: at 458 px width, cards stack vertically; keyboard tab navigation reaches both cards.
- **Route Protection & Redirections:**
  - Unauthenticated requests to `/hq`, `/hq/website`, and `/set2go` redirect to `/sign-in`.
  - Unauthenticated Set2Go job requests return 404.
  - `/dashboard?section=releases` returns 308 to `/hq/website?section=releases`.
  - External OAuth redirection attacks (e.g. `next=https://example.com`) redirect to local `/hq`; valid internal paths are preserved.
- **Code Quality & Automated Tests:**
  - `pnpm exec tsc --noEmit` passed with 0 errors.
  - Targeted ESLint passed for changed routes and modules.
  - Product access and Set2Go regression tests passed: 35 tests, 0 failures.
  - *Note:* The pre-existing Website editor contains two ESLint issues in unchanged code (synchronous state update inside effect, unescaped apostrophe); only the "All products" link was touched.

---

## 3. Infrastructure & Authentication Status

- **Supabase:**
  - Existing hosted Supabase project is active.
  - Migration `082_set2go_upload_sessions.sql` is already applied (checksum: `9a07300016f3ea5fc17d0bb68c48af4e788f402e24c246a555059e4ea83cb071`). **Do not reapply or alter.**
  - Migration 082 provides durable upload-session/track state, RPC reservation, signing/completion authorization, and cleanup claims under PostgreSQL 17.6 with RLS.
- **Cloudflare R2:**
  - Private bucket: `set2go-prod-temp`.
  - Development CORS is configured and verified for exact origin `http://127.0.0.1:3000` (preflight returns 204 for `127.0.0.1:3000`; returns 403 for `localhost:3000`).
  - **Do not make the bucket public or alter CORS rules.**
- **OAuth & Environment:**
  - Google OAuth local callback URL is allowlisted. Supabase Site URL is `https://djhq.app`.
  - Local `.env.local` contains `SET2GO_DEV_CLOUD_USER_ID`; cloud upload enablement flag was left disabled by default.

---

## 4. Known Limitations, Blockers & Unverified Areas

1. **First Browser-to-R2 Upload Unverified (PRIMARY BLOCKER):**
   - Cloud staging code supports browser-to-R2 multipart transfer (16 MiB slices, sequential part upload, on-demand signed URLs, ETag completion, XHR byte progress, server-side checks).
   - While unit and provider tests pass, **a real browser upload from Chrome to R2 has not yet been executed or evidenced end-to-end.**
   - Persistence across PostgreSQL session state, R2 object creation, and exact byte verification remains pending.
2. **Entitlement Limitations:**
   - Production Set2Go access does not exist and remains fail-closed.
   - The current developer account is an existing Website owner and allowlisted Set2Go developer; it is not confirmed as a global platform admin under `DJHQ_PLATFORM_ADMIN_EMAILS`.
   - No dedicated Set2Go-only test account has been tested end-to-end for Website denial.
3. **Local Engine & Environment:**
   - Local analysis/export relies on the Python engine (limits: 20 tracks / 200 MiB).
   - Local Python 3.15 environment cannot compile `aubio` (unverified/known issue); do not attempt to fix or let it block browser cloud staging.
   - Cleanup/reconciliation CLI is available, but no automated cron or scheduler is running.
4. **WAV Fixtures:**
   - Mentioned test fixtures (88,244 bytes small WAV and 18,000,044 bytes multipart WAV) are referenced in Codex specifications; exact file system location is unverified in this session and must not trigger extensive directory scanning.

---

## 5. Exact Next Implementation Task for Claude Code

Execute the first real authenticated browser-to-R2 upload from Set2Go:

1. **Verify Session:** Verify the current local Supabase session and user ID via server-side `auth.getUser()` at `http://127.0.0.1:3000`.
2. **Enable Dev Flags:** Enable only the existing development cloud flags and origin `http://127.0.0.1:3000` for the allowlisted UUID. Keep production fail-closed.
3. **Small Upload:** Upload the small synthetic WAV fixture (~88 KB) via Chrome; record transferred bytes, progress events, and duration.
4. **Verify State:** Confirm matching PostgreSQL session/track record and inspect the R2 object metadata/size.
5. **Multipart Upload:** Upload the large synthetic WAV fixture (>16 MB) to test multipart initialization, 16 MiB part slicing, signing, ETags, and completion.
6. **Telemetry & Cleanup:** Record measured throughput, concurrency, and memory; test cancellation and safe cleanup claims.
