# Stage 2 local integration

## Implementation

The local `/set2go` page submits WAV, AIFF and FLAC files to Node.js route handlers. The server stores each upload under a generated name in a private, generated temporary directory; original names are display-only. Jobs use random capability identifiers and are retained in memory, with one upload, analysis or ZIP operation at a time. Uploads are limited to 10 tracks and 200 MiB total, with basic format-signature checks. The routes operate only in development mode, require a loopback Host, and require a same-origin header for mutations. Start the development server bound to loopback, as shown below: Host and Origin checks alone do not prove the network peer is local.

Endpoints:

- `POST /api/set2go/jobs`: multipart files and optional `gridcheck=true`; starts analysis.
- `GET /api/set2go/jobs/{id}`: polls status and sanitized track results.
- `POST /api/set2go/jobs/{id}`: authorizes ZIP creation for a ready job.
- `GET /api/set2go/jobs/{id}?download=1`: downloads that job's archive.

The server directly spawns `services/set2go/scripts/analysis_key_export.py` with an argument array, no shell, an explicit `PYTHONPATH`, and `--on-unresolved exclude`. It uses `SET2GO_PYTHON` if set, otherwise the documented standalone `.venv/bin/python`; the engine retains its existing `SET2GO_*` configuration. Gridcheck and key prediction are not enabled by default. The subprocess has a 30-minute timeout, a bounded diagnostics capture, and a separate process group. Diagnostics remain in the private job directory; API errors do not return them.

The CLI's `--dry-run` performs key analysis but does not produce the full Contract v1.0 rhythm/eligibility report. Therefore analysis runs the canonical CLI through its export phase into a private job directory. The review screen is shown after this preparation; the user explicitly authorizes creation of the downloadable ZIP afterward. No second analysis is needed. The engine's exclusion policy is mandatory, and zero eligible tracks block export. The server checks the contract version, tier and export flags before making the archive available. `/usr/bin/zip` archives the contents of the engine-generated export directory without flattening it.

Files created: `app/set2go/page.tsx`, `app/api/set2go/jobs/route.ts`, `app/api/set2go/jobs/[id]/route.ts`, `lib/set2go/jobs.ts`, `scripts/test-set2go-local.mjs`, `scripts/test-set2go-contract.mjs`, and this report. No existing application or engine source files were modified.

Completed jobs are removed after 24 hours while the same server process is running; an active job is checked again later. A new job also triggers cleanup of expired completed jobs. Restarting the server loses the in-memory job registry, so old directories become inaccessible through the API but are not automatically removed. With the server stopped, remove only the `set2go-` prefixed job directories in the current user's temporary directory using Finder when cleanup is needed. Active jobs and downloads do not survive server restart. This is a single-process local development workflow, not a durable or multi-user job system.

## Validation

- `./node_modules/.bin/tsc --noEmit --incremental false`: passed.
- `./node_modules/.bin/eslint app/set2go/page.tsx app/api/set2go/jobs/route.ts 'app/api/set2go/jobs/[id]/route.ts' lib/set2go/jobs.ts scripts/test-set2go-local.mjs scripts/test-set2go-contract.mjs`: passed.
- `node scripts/test-set2go-contract.mjs`: passed synthetic contract mapping checks for all four tiers, warning preservation, failed/unresolved exclusion flags, inconsistent flags, and version rejection. Node emitted its module-type performance warning.
- `node scripts/test-set2go-local.mjs`: real two-fixture HTTP run passed page access, unsupported extension and incorrect signature rejection, hostile filename handling, unknown download ID and cross-origin rejection, and zero-eligible export blocking. Both real tracks were unresolved. The engine report confirmed gridcheck disabled and `on_unresolved=exclude`.
- `node scripts/test-set2go-local.mjs '<existing local test-track AIFF>'`: real two-track HTTP run with gridcheck enabled produced one unresolved and one `accepted_with_warnings` track, then created and downloaded a ZIP with `PIONEER/rekordbox/export.pdb`, `PIONEER/USBANLZ/` and the engine-generated hierarchy. Inspection confirmed only the eligible audio was included; the engine report recorded one excluded track and one exported track.

The local browser automation surface was unavailable; visual rendering, drag-and-drop and failure presentation were not manually checked in a browser. A real failed-tier engine result and a shell-metacharacter filename were not exercised end-to-end; failed classification is covered by the focused contract check, and subprocess invocation uses `spawn` with `shell: false` and server-generated audio paths. If the CLI fails before producing a contract report, the job shows a failure and analysis unavailable; it cannot provide per-track contract classifications for that run. Existing routes and authentication were not changed, but their full runtime regression was not repeated. No production build was run. The historical Stage 1 210 passes, 22 skips, 15-file comparison and build were not repeated; the documented seven pre-existing lint errors remain incompletely inventoried and full-project lint was not run.

The handoff describes `app/set2go/` as existing, but it was absent in the current tree and was created here. The documented checkpoint size also differs from the current local file; engine defaults were not changed.

## Protected boundaries and deferred work

No validated engine algorithms, Contract v1.0, frozen baselines, historical fixtures, reference exports, evidence manifests, or protected validation records were modified. The synthetic engine fixtures were read for testing only. No deployment, dependency installation, USB operation or Git command was performed.

Public deployment, authentication for public Set2Go access, cloud processing and storage, iPhone-to-USB transfer, physical USB writing, CDJ hardware validation, recovered-grid physical validation, RGB waveform rendering confirmation, and 3Band waveform implementation remain deferred. A generated ZIP does not establish USB or CDJ compatibility.

## Manual local start

From the repository root, run `pnpm run dev --hostname 127.0.0.1` and open `http://127.0.0.1:3000/set2go`. The documented standalone Python environment and engine dependencies must be available. Set `SET2GO_PYTHON` to an existing compatible engine Python executable if the documented standalone environment is elsewhere.
