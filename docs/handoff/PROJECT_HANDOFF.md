# DJHQ + Set2Go: Project Handoff & Architecture Baseline

**Document Version:** 1.0  
**Date:** 2026-10-30  
**Repository Root:** `/Users/andresherrera/Hacking/djhq-saa-s-design`

> **Architecture direction update (2026-11-01):** For the approved future multi-product route responsibilities and safe `/hq` evolution, see [DJHQ Multi-Product HQ Architecture](./DJHQ_MULTIPRODUCT_HQ_ARCHITECTURE.md). This update does not imply implementation or replace the historical validation evidence below. The Stage 2 description below is historical; the repository now contains a local Set2Go vertical slice.

---

## 1. Product Decisions & Boundaries

1. **DJHQ Platform Umbrella:** DJHQ is the umbrella platform hosting DJ productivity and workflow tools.
2. **Initial Public Launch (Set2Go Only):** Only **Set2Go** is targeted for the upcoming public launch, served under the reserved route `/set2go` on `djhq.app`.
3. **Artist Website Service Deferred:** Public rollout of the general DJ website builder is deferred. However, all existing website functionality, domain routing (`proxy.ts`), database schemas, and management interfaces (`/hq`, `/dashboard`) for the live `ANDRES:HERRERA` website are strictly preserved.
4. **No Artist Profile Requirement for Set2Go:** Set2Go users are normal platform users; using Set2Go must **never** require creating, publishing, or linking an artist profile.
5. **Andrés Herrera is a Standard User:** Platform architecture treats Andrés as a standard authenticated user in Supabase (`auth.users`), not an engine-level hardcoded privileged tenant.

---

## 2. Monorepo Layout & Active Locations

```
/Users/andresherrera/Hacking/djhq-saa-s-design/
├── app/                  # Next.js 16 (App Router) web application
│   ├── (auth)/           # Authentication routes
│   ├── [handle]/         # Dynamic artist public profiles (e.g. /andres-herrera)
│   ├── dashboard/        # Artist dashboard (deferred public service)
│   ├── hq/               # Management interface
│   └── set2go/           # Future landing & local vertical slice route
├── components/           # React UI component library (shadcn/radix)
├── docs/
│   ├── handoff/          # Authoritative handoff documentation (THIS DIRECTORY)
│   │   ├── PROJECT_HANDOFF.md
│   │   └── VALIDATION_STATUS.md
│   └── set2go/           # Stage 1 integration records & manifests
├── lib/                  # Shared web utilities, Supabase client
├── proxy.ts              # Custom domain and reserved route middleware
├── services/
│   └── set2go/           # ACTIVE canonical source for Set2Go Python export engine
│       ├── docs/         # Hardware test specifications and design notes
│       ├── pyproject.toml# Engine dependencies and metadata
│       ├── scripts/      # Supported CLI entry points, workers, and verifiers
│       ├── src/set2go/   # Core analysis, DSP, contract v1.0, and PDB exporter
│       └── tests/        # 232 pytest unit and integration tests
```

### Canonical vs. External Locations
- **Active Engine Development:** `/Users/andresherrera/Hacking/djhq-saa-s-design/services/set2go`
- **Standalone Reference & External Corpora (Left Intact):** `/Users/andresherrera/Developer/Set2Go`
- **Compatibility Symlink:** `/Users/andresherrera/Developer/RekordSOS -> /Users/andresherrera/Developer/Set2Go` (required for existing venv shebangs and historical evidence paths).

---

## 3. Runtime & Path Configuration (`SET2GO_*`)

All engine paths use dynamic configuration with automatic fallbacks to standalone developer trees:

| Variable | Default Fallback | Purpose |
|---|---|---|
| `SET2GO_BEAT_PYTHON` | `services/set2go/.venv-beat/bin/python` → `/Users/andresherrera/Developer/Set2Go/.venv-beat/bin/python` | Isolated PyTorch environment |
| `SET2GO_BEAT_WORKER` | `services/set2go/scripts/beat_worker.py` | Beat This! inference worker |
| `SET2GO_BEAT_CHECKPOINT` | `/Users/andresherrera/Developer/Set2Go/models/beat_this-final0.ckpt` | 314MB neural checkpoint |
| `SET2GO_KEYFINDER_DYLIB` | `services/set2go/lib/libkf_wrapper.dylib` → `/tmp/libkf_wrapper.dylib` | libKeyFinder ctypes wrapper |
| `SET2GO_STANDALONE_DIR` | `/Users/andresherrera/Developer/Set2Go` | External audio corpora / eval data |

*Portability Note:* The native `libKeyFinder` wrapper currently defaults to `/tmp/libkf_wrapper.dylib` (built via `services/set2go/scripts/build_kf.sh`). In production, this must be built into a permanent library directory.

---

## 4. Engine Result Contract v1.0

The engine exposes a strictly typed contract in `services/set2go/src/set2go/analysis/contract.py` (`ENGINE_CONTRACT_VERSION = "1.0"`):
- **Per-track sections:** `track_identity`, `bpm`, `key` (`manual > imported > opt-in predicted > none`), `grid`, `downbeat`, `review_reasons`, `flagged_windows_s`, `failures`, and `export_eligibility`.
- **Eligibility Tiers:** `accepted_clean`, `accepted_with_warnings`, `unresolved_needs_review`, `failed`.
- **Policy Gates:** Opt-in `gridcheck` (`--gridcheck`), gating on unresolved tracks (`on_unresolved="stop"` or `on_unresolved="exclude"`).

---

## 5. Exact Supported Local Commands

Execute all Python commands from the monorepo root using `PYTHONPATH=services/set2go/src`:

```bash
# 1. Engine Health Check
PYTHONPATH=services/set2go/src /Users/andresherrera/Developer/Set2Go/.venv/bin/python services/set2go/scripts/check_engine.py

# 2. Run Engine Pytest Suite
PYTHONPATH=services/set2go/src /Users/andresherrera/Developer/Set2Go/.venv/bin/python -m pytest services/set2go/tests

# 3. CLI Analysis & Export
PYTHONPATH=services/set2go/src /Users/andresherrera/Developer/Set2Go/.venv/bin/python services/set2go/scripts/analysis_key_export.py \
    <out_dir> <sources...> \
    --sidecar <sidecar.json> \
    --gridcheck \
    [--reuse-raw --raw-cache <dir>]

# 4. Verify Export Library
PYTHONPATH=services/set2go/src /Users/andresherrera/Developer/Set2Go/.venv/bin/python services/set2go/scripts/verify_export.py \
    <out_dir> \
    --manifest=<out_dir>_MANIFEST.json \
    --exact

# 5. Monorepo Web Typecheck & Build
npx tsc --noEmit
npm run build
```

---

## 6. Immediate Next Task: Local `/set2go` Vertical Slice

The goal of Stage 2 is to build the smallest functional local vertical slice connecting web UI to the engine:
1. **Audio Selection/Upload:** Local file dropzone on `/set2go` supporting `.wav`, `.aiff`, `.flac`.
2. **Engine Invocation:** Server action / local API route invoking `services/set2go` engine.
3. **Per-Track Diagnostics:** Display BPM, musical key, beat-grid status, and review warnings using Contract v1.0.
4. **Local Export:** Generate Pioneer CDJ-compatible export directory locally (PDB, ANLZ, audio).
5. **Explicitly Deferred:** Cloud deployment, cloud audio storage, payment/billing, iPhone USB writing, and user artist profile requirements.

---

## 7. Recommended Reading Order

1. [`docs/handoff/PROJECT_HANDOFF.md`](./PROJECT_HANDOFF.md) — (This document) Overall strategy, layout, and commands.
2. [`docs/handoff/VALIDATION_STATUS.md`](./VALIDATION_STATUS.md) — Detailed verification records, skips, and known issues.
3. [`docs/set2go/STAGE1_INTEGRATION_HANDOFF.md`](../set2go/STAGE1_INTEGRATION_HANDOFF.md) — File-by-file hash inventories and stage 1 notes.
4. [`services/set2go/ENGINE_STATUS.md`](../../services/set2go/ENGINE_STATUS.md) — Engine contract v1.0 specification and DSP performance benchmarks.
5. [`services/set2go/README.md`](../../services/set2go/README.md) — Engine package layout and CLI usage.
6. [`ARCHITECTURE.md`](../../ARCHITECTURE.md) — Platform stack and artist website structure (historical context).
