# Controlled development activation

Cloud staging is development-only and disabled unless all configuration and identity checks pass. Production requests always fail closed. The local FormData path remains capped at 200 MiB.

## Hosted database application (completed November 4, 2026)

The existing private public-schema backup was readable before application. It excludes managed Auth/Storage data, external assets, roles and grants. Read-only preflight confirmed PostgreSQL 17.6, `auth.users`, required role and foreign-key privileges, existing artist tables and no Set2Go object conflicts. `./tests/set2go-postgres/local.sh` passed on disposable PostgreSQL 17.

Only migration `082_set2go_upload_sessions.sql` was applied to hosted Supabase in one transaction with a 5-second lock timeout and 30-second statement timeout. SHA-256: `9a07300016f3ea5fc17d0bb68c48af4e788f402e24c246a555059e4ea83cb071`. Read-only postflight found two tables, seven indexes including constraint indexes, 13 functions, RLS on both tables, service-role SELECT and RPC execution, no direct service-role table writes or anon reservation RPC execution. The five previously observed artist-named tables remain present. No Supabase CLI migration-history entry was invented.

## Configuration and CORS

Keep existing server-only R2 configuration. Use the local origin `http://127.0.0.1:3000`. Set `SET2GO_DEV_CLOUD_UPLOAD=enabled`, `SET2GO_UPLOAD_MODE=r2-development`, `SET2GO_DEV_CLOUD_ORIGIN=http://127.0.0.1:3000`, and `SET2GO_DEV_CLOUD_USER_ID` to the UUID of the existing authenticated developer account. No user is created by this feature. The allowlist is a development restriction, not a production product entitlement. Restart the development server after configuration. Do not use a public tunnel.

The Cloudflare R2 bucket has the rule in `docs/set2go/r2-development-cors.json` for that exact local origin/port. Dashboard read-back on November 4, 2026 showed the exact origin, PUT/HEAD, `content-type`, exposed `ETag`, and 300-second max age; the public development URL remained disabled. A live OPTIONS request from `http://127.0.0.1:3000` returned 204 with the expected allow headers, while `http://localhost:3000` returned 403. PUT sends Blob slices, and ETag must be readable for completion. HEAD is allowed for controlled development diagnostics; application verification uses the server adapter. The restricted R2 object key cannot read or update bucket CORS.

## Application behavior

The existing shared Auth session is verified with `auth.getUser()` on every metadata request. `/api/set2go/cloud` accepts only POST JSON capped at 32 KiB with exact loopback origin, configured development mode and allowlisted verified user ID. Actions: create, reserve, initiate, sign, complete, status, cancel. Bucket/key paths are derived server-side. Client file bytes go directly to R2; no cloud FormData endpoint exists.

The cloud panel reserves the whole batch before starting. Files and parts upload sequentially (one active PUT), with 16 MiB slices, on-demand part signing, up to three attempts with exponential backoff/jitter, and XHR byte progress throttled to 100 ms. State is not analysis progress. A confirmed staging response requires R2 completion, actual size validation and a supported file header, followed by fenced PostgreSQL confirmation. No cloud analysis or Generate Export action is available. Local workflow state stays mounted when toggling modes.

A refresh restores only session identity and server status; the browser cannot restore File objects. Partial transfers cannot currently resume after reload. Use status and cancellation to inspect/recover, then start a new selection after cleanup is requested. Interrupted initiation is stored as INITIATING rather than silently allocating another multipart upload. A lost initialization response, invalid audio header or unresolved completion may require controlled recovery; cleanup remains fail-closed when no safe authorization deadline is known.

Cancellation requests durable terminal cleanup. It does not promise immediate deletion. Run the existing cleanup and reconciliation CLI explicitly; no scheduler is active. Abandoned sessions with unresolved remote operations are not automatically deleted. Production entitlement, full initiation recovery and absent uncertain-completion reconciliation remain launch blockers.

## Validation boundaries

Local tests cover the actual migration and CLI against PostgreSQL 17 with fake R2, prior real R2 tests cover SDK multipart semantics, and browser helper tests measure one active operation, two signatures for a 17 MiB fixture and a maximum 16 MiB slice without invoking whole-file arrayBuffer. This is not a throughput, peak RSS, 2 GB upload, PostgREST endpoint or browser benchmark. The hosted migration is installed and bucket CORS has been saved and preflight-checked. An authenticated browser upload remains required before calling direct staging operational. Local `/login` redirects to the existing Supabase `/sign-in` route in development. The exact `http://127.0.0.1:3000/auth/callback` URL is in the hosted redirect allowlist. A browser network trace confirmed OAuth sent that `redirect_to` and reached the local callback; the callback had then redirected to the development bind address `0.0.0.0`, which the proxy sent to the production site. The callback now selects `127.0.0.1:3000` for that exact development Host. A fresh Google sign-in returned to local `/hq`, where the existing server-side `auth.getUser()` check admitted the developer account. The development cloud allowlist and first browser upload remain pending.
