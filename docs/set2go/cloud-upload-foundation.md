# Set2Go cloud staging (development only; activation pending)

The local 20-track / 200 MiB analysis and export route remains unchanged. A separate development browser staging path is implemented in `app/set2go/cloud-upload.tsx` and `app/api/set2go/cloud/route.ts`. The endpoint authenticates through the existing Supabase cookie client, checks the explicit development allowlist and exact loopback origin, reserves through migration 082 RPCs, then signs short-lived direct-to-R2 part requests. Audio bodies do not pass through Next.js. Cloud staging does not provide analysis or export.

Migration 082 was applied to the existing hosted DJHQ Supabase project on November 4, 2026 after backup verification and disposable PostgreSQL tests. Its SHA-256 is `9a07300016f3ea5fc17d0bb68c48af4e788f402e24c246a555059e4ea83cb071`. Bucket CORS and an authenticated local DJHQ session remain pending. Until those are available and a real browser run succeeds, direct browser staging is not operational. Production requests fail closed, and production entitlement integration is not implemented. The current development allowlist is not a substitute for product authorization.

Server-only configuration: `SET2GO_DEV_CLOUD_UPLOAD`, `SET2GO_UPLOAD_MODE`, `SET2GO_DEV_CLOUD_ORIGIN`, `SET2GO_DEV_CLOUD_USER_ID`, `R2_ACCOUNT_ID`, `R2_PRIVATE_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, and optional `SET2GO_UPLOAD_URL_TTL_SECONDS`. The R2 endpoint is built from the account ID; there is no separate endpoint override. Never expose credentials through `NEXT_PUBLIC_*` variables.

## Development browser CORS (manual, not applied)

For the configured local origin and port, use `docs/set2go/r2-development-cors.json`. The current example permits only `http://127.0.0.1:3000`, `PUT` and `HEAD`, allows the `content-type` request header, exposes `ETag`, and caches preflight for 300 seconds. R2 handles preflight `OPTIONS`. Change the origin only to the exact local origin in use; do not use a wildcard or make the bucket public.

The uploader sends 16 MiB `Blob.slice()` parts sequentially, signs each part just before transfer, retries transient failures with bounded exponential backoff and jitter, and reports XHR-transmitted bytes. A refresh can restore server session status but cannot restore browser `File` objects; interrupted upload resume across reload is not implemented. See `docs/set2go/cloud-staging-activation.md` for the controlled migration procedure and limitations.

## Executable cleanup worker

`services/set2go/scripts/cleanup-cloud.mjs` uses the shared cleanup store and R2 adapter. Load private configuration via Node's `--env-file=.env.local`; do not put secrets on the command line. Review pending work with:

```sh
NODE_ENV=development SET2GO_CLEANUP_ENABLED=enabled node --env-file=.env.local services/set2go/scripts/cleanup-cloud.mjs --dry-run --limit 5
```

Replace `--dry-run` with `--execute` only after the revised migration has been approved/applied and the cleanup authorization policy is operational. No scheduler is configured. The CLI never enqueues sessions or invents deletion keys. It claims terminal sessions, aborts their scoped multipart uploads, deletes scoped objects, confirms absence, then records completion. A lost confirmation leaves an expiring claim; a later invocation repeats idempotent cleanup. Failures record bounded exponential retry delays. Logs contain event categories and session IDs only.

Signing now requires durable authorization callbacks. The shared cleanup store exposes callbacks for `set2go_record_upload_capability` and `set2go_begin_remote_completion`; pass them to `developmentR2FromEnv` when wiring a future authorized upload path. The URL's signing timestamp is fixed before committing its deadline, so later signing cannot extend the URL beyond that reservation. No current public signing path exists.

Remote completion is blocked from cleanup until reconciled. A completion request can start before a URL expires and finish later: `completion_unreconciled` is therefore an independent fail-closed barrier. The recovery command can now clear the flag for a size-verified object whose tracked multipart ID is closed. Missing or ambiguous objects intentionally remain unclaimable. Never clear that flag merely because a timeout expired. Previously issued untracked URLs likewise have no proven cleanup deadline and remain blocked. The worker can safely process only sessions with a known passed capability deadline and no unresolved completion.

Real local execution (no hosted database or real R2): `./tests/set2go-postgres/local.sh`. Its cleanup E2E driver launches the actual CLI in independent child processes against PostgreSQL 17 and a persistent file-backed fake R2 runtime, proving successful deletion, retry after transient failure, and recovery after process exit following deletion but before confirmation. Test-runtime injection requires NODE_ENV=test and SET2GO_DISPOSABLE_PG and is never the normal storage path.


## Uncertain completion recovery

Use the same CLI with `--reconcile --dry-run --limit 5` or `--reconcile --execute --limit 5`. Recovery reads database-bound track and multipart IDs, acquires the session lease, queries R2 HEAD and ListParts, and commits only through the lease-fenced resolution RPC. A matching size plus NoSuchUpload for that exact multipart ID resolves the track as UPLOADED. Other states retain uncertainty with a persisted retry time. Recovery never deletes active audio. Run cleanup separately after an explicit terminal cleanup authorization; unresolved completion blocks that authorization.

The existing disposable test command runs actual recovery CLI child processes and verifies successful resolution, idempotence, ambiguous/missing/incomplete evidence, transient storage errors and a process crash before database confirmation. Fake R2 evidence is deterministic. A separate 1 MiB provider smoke test confirmed HEAD/ListParts open-versus-closed behavior and cleaned its own test object. That test did not simulate a real lost provider response or prove missing-object quiescence. Automatic absent-object resolution remains unsupported; a missing object is never treated as proof that an in-flight CompleteMultipartUpload cannot finish later. Stage B.2 therefore remains incomplete for absent uncertain completions.
