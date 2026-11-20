# Codex Session Transfer

## Architectural decisions

- `/hq` is the authenticated DJHQ Product Hub; the existing Artist Website manager is at `/hq/website`; Set2Go remains at `/set2go`; `/admin` behavior was left unchanged.
- Legacy `/dashboard` routes redirect to `/hq/website`, preserving path suffixes and query parameters.
- Product visibility is derived server-side from the authenticated Supabase user. Website access requires existing artist ownership or the platform-admin email allowlist. Set2Go access is development-only and requires an exact UUID match with `SET2GO_DEV_CLOUD_USER_ID`. UI cards do not authorize access.
- Website and Set2Go routes enforce access on the server. Set2Go local job APIs also enforce the development product entitlement. The existing R2 cloud endpoint’s development and origin checks were not relaxed.
- OAuth callback destinations are restricted to local paths; external `next` URLs fall back to `/hq`.

## Completed and verified

- The signed-in Chrome session at `http://127.0.0.1:3000/hq` displayed both authorized product cards for the current Website owner/development allowlisted user.
- The Website card opened the existing editor at `/hq/website`, showing the artist identity, releases, shows, bookings and press-kit controls. “All products” returned to `/hq`.
- The Set2Go card opened `/set2go`; the existing local Rekordbox selection/workspace remained available, and the UI provided a return link to the Hub.
- At a 458 px emulated browser width, product cards stacked vertically. Keyboard tab navigation reached the Website and Set2Go cards.
- Read-only unauthenticated requests to `/hq`, `/hq/website` and `/set2go` redirected to `/sign-in`; an unauthenticated Set2Go job request returned 404. `/dashboard?section=releases` returned a 308 to `/hq/website?section=releases`.
- OAuth callback check: an external `next=https://example.com` redirected to local `/hq`; an internal `/hq/website?section=releases` destination was preserved. The existing authenticated browser session and earlier Google OAuth return to local `/hq` had been verified in the preceding session.
- `pnpm exec tsc --noEmit` passed. Targeted ESLint for the changed routes/modules passed. Product access and Set2Go regression tests passed: 35 tests, 0 failures.
- The large existing Website editor has two ESLint errors at unchanged code: a synchronous state update inside an effect and an unescaped apostrophe. The only editor change in this session was the “All products” link.

## Supabase, R2 and OAuth status

- Existing hosted Supabase is in use. Migration 082 is already applied; checksum recorded in prior verified project notes: `9a07300016f3ea5fc17d0bb68c48af4e788f402e24c246a555059e4ea83cb071`. Do not reapply or edit it.
- Migration 082 provides durable Set2Go upload-session/track state and RPC-based reservation, signing/completion authorization and cleanup claims. Prior notes record PostgreSQL 17.6 and a hosted postflight showing RLS, service-role read/RPC permissions and restricted direct writes. This session did not re-query hosted PostgreSQL.
- The private R2 bucket is `set2go-prod-temp`. The development CORS rule was previously saved and read back for exact origin `http://127.0.0.1:3000`; a prior live preflight returned 204 for that origin and 403 for `http://localhost:3000`. Do not make the bucket public or change CORS as part of the next task absent new evidence.
- Google OAuth’s local callback URL is already allowlisted. The Supabase Site URL remains `https://djhq.app`. Earlier browser verification captured local `redirect_to` and a successful authenticated return to local `/hq`; do not change dashboard Auth configuration.
- The local `.env.local` has the existing developer UUID allowlist entry, but the cloud upload enable flag was left off. No privileged credentials belong in client-visible variables or this document.

## Product Hub authorization status and limitations

- The current signed-in account is an existing Website owner and matches the development Set2Go allowlist. Both cards are therefore justified by the respective entitlements. The session did not establish that the account is a platform administrator under `DJHQ_PLATFORM_ADMIN_EMAILS`; do not infer global admin status from seeing both cards.
- Production Set2Go entitlement does not exist. Production Set2Go access remains fail-closed. Invitation records are not yet linked to authenticated Website manager identity; current Website access uses ownership or the existing platform-admin allowlist.
- Policy tests cover Set2Go-only identity isolation from Website access, but no separate live Set2Go-only browser account was available for an end-to-end denial test.

## Set2Go status and blockers

- Local analysis/export remains the existing Python-backed path (20 tracks / 200 MiB limits documented in project notes). This session confirmed the local Rekordbox UI path, not a new Python engine run.
- Cloud staging code supports direct browser-to-R2 multipart transfer, 16 MiB Blob slices, sequential part uploads, on-demand signed URLs, ETag completion, XHR byte progress, server-side size/header checks, durable state and guarded cleanup. Unit/provider tests exercise these components; they do not prove a browser-originated upload succeeded.
- **The first authenticated Chrome-to-R2 upload remains unverified.** PostgreSQL session/track state, the corresponding R2 object and exact uploaded size have not been evidenced together from a real browser upload. Multipart upload above 16 MiB and real throughput/memory measurements are also pending.
- Cleanup/reconciliation has an explicit CLI, but no automatic scheduler is active. Uncertain completion and unsafe cleanup states intentionally fail closed; do not bypass their persisted authorization/lease protections.
- The local Python 3.15 environment cannot build `aubio`; this is a separate local-engine environment issue. Do not alter the Python engine or let it block browser staging validation.

## Exact next implementation task

Complete the first real authenticated browser-to-R2 upload from Set2Go using the existing hosted Supabase project and private R2 bucket:

1. Verify the current local Supabase session and user ID through trusted server-side `auth.getUser()`.
2. Enable only the existing development cloud flags and exact `http://127.0.0.1:3000` origin for that verified allowlisted identity; keep production access closed.
3. From Chrome, upload the existing 88,244-byte synthetic WAV fixture. Capture actual transferred-byte progress and duration.
4. Verify the matching PostgreSQL session/track state and R2 object metadata/size.
5. Upload the existing 18,000,044-byte synthetic WAV fixture and verify multipart initiation, 16 MiB part sizing, signing, ETags, completion and durable state.
6. Record measured throughput and observable request concurrency/memory; exercise only safe cancellation and cleanup for test objects.

Migration 082, the local OAuth callback and R2 CORS have already been handled. Do not repeat their setup. Do not enable public cloud access, use production audio collections, alter Supabase Auth settings, or declare success without browser, PostgreSQL and R2 evidence.
