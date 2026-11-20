# Set2Go Engine Status

> **Monorepo Integration Notice (2026-10-30):**  
> Set2Go has been integrated into the DJHQ monorepo. Active development source is at `services/set2go/`.  
> The standalone directory `/Users/andresherrera/Developer/Set2Go` is preserved for external reference data and bulky artifacts.  
> Monorepo handoff documentation: [`docs/handoff/PROJECT_HANDOFF.md`](../../docs/handoff/PROJECT_HANDOFF.md).

**Date:** 2026-10-29  
**Contract Version:** `ENGINE_CONTRACT_VERSION = "1.0"` (`src/set2go/analysis/contract.py`)  
**Analysis Version:** `ANALYSIS_VERSION = "0.1.0"` (`src/set2go/analysis/__init__.py`)

---

## 1. Ready for Local DJHQ Integration

1. **Versioned Engine-Result Contract (`ENGINE_CONTRACT_VERSION = "1.0"`):**
   - Implemented in [`src/set2go/analysis/contract.py`](file:///Users/andresherrera/Developer/Set2Go/src/set2go/analysis/contract.py) (`build_track_contract`, `build_engine_report`, `validate_engine_report`) and attached to every `ExportResult.engine_report` (and `UnresolvedExportError.engine_report`) as well as written to `<out>_ENGINE_REPORT.json` by `scripts/analysis_key_export.py`.
   - **Per-track sections:**
     - `track_identity`: `{filename, source_path, sha256, duration_s, sample_rate}`
     - `bpm`: `{value, source, model_slope_bpm, tempo_disagree_bpm}`
     - `key`: `{effective, origin, provenance, backend, layers: {manual, imported, predicted}}` (preserving `manual > imported > opt-in predicted > none`)
     - `grid`: `{status, decision, source, bpm, anchor_ms, kick_corr_ms, reasons, flagged_windows_s}`
     - `downbeat`: `{bar_origin, status, majority_share, review_required}`
     - `review_reasons`: list of structured `{area, reason, ...}` items (no invented confidence percentages or uncalibrated probabilities)
     - `flagged_windows_s`: list of `[t0_s, t1_s]` breakdown/glitch intervals
     - `failures`: stage-level error map
     - `export_eligibility`: `{eligible, tier, exported, excluded, blocking_reasons, warning_reasons}` with 4 explicit tiers: `accepted_clean`, `accepted_with_warnings`, `unresolved_needs_review`, `failed`.

2. **Opt-In Experimental `gridcheck` Policy (Disabled by Default):**
   - Available via `export_library(..., gridcheck=True)` or `scripts/analysis_key_export.py --gridcheck`.
   - `src/set2go/rhythm.py` remains untouched by `gridcheck` (`b"gridcheck"` absent from `rhythm.py`); default `gridcheck=False` behavior is 100% preserved.
   - **Unchanged production grids:** When `rhythm.check_consistency` returns `consistent`, the exact production grid (including `kick_corr_ms` when `refine_kick=True`) is preserved verbatim (`decision="production_accept"`, `source="production_beat_this"`).
   - **Recovered grids (`accept_audio_grid` / `accept_with_gaps`):** Uses the exact grid construction evaluated in `blind2` (`anchor_s = float(gdec.phase_s) % (60.0 / bpm)`, `kick_corr_ms = None`, no kick refinement or extra phase shift).
   - **Separate beat-grid acceptance vs downbeat/bar-origin review:** Recovered grids and unstable-downbeat tracks (`downbeat_majority_share < 0.90`) set `downbeat.review_required = True` and `export_eligibility.tier = "accepted_with_warnings"`, keeping them strictly distinguishable from `accepted_clean`.

3. **Explicit Analysis-to-Export Gating (`on_unresolved`):**
   - **Never silently drops a track or substitutes a diagnostic hypothetical grid (`gdec.phase_s`):** Unaccepted tracks (`needs_review` / `reject` without a hash-linked manual anchor override) have `grid.anchor_ms = None` and `grid.source = "none"`.
   - **`on_unresolved="stop"` (default when `gridcheck=True`):** Stops in Phase 1 **before** creating `dest_dir` or writing a partial library, raising `UnresolvedExportError` with the complete per-track `engine_report` (`summary.export_status = "blocked_unresolved"`).
   - **`on_unresolved="exclude"` (`--exclude-unresolved`):** Excludes only unresolved/failed tracks, preserves the exact relative playlist order of remaining eligible tracks across all playlists, records `excluded_tracks` in `ExportResult`, `<out>_ENGINE_REPORT.json`, and `<out>_MANIFEST.json`, and stops before creating `dest_dir` if 0 eligible tracks remain.
   - **`on_unresolved="legacy_fallback"` (default when `gridcheck=False`):** Preserves historical fallback behavior for backward compatibility.

4. **End-to-End Local Export & Verifier (`verify_export.py --manifest=... --exact`):**
   - `scripts/verify_export.py` in `--manifest=` mode now verifies:
     - Every exported track's PDB tempo and serialized `ANLZ0000.DAT` (`PQTZ`) beat timestamps match the chosen engine grid (`expected_grid`) within the format's `<= 1.0 ms` integer precision (`max |err| <= 0.5 ms` observed), with identical `beat_number` (`1..4`) and `tempo_bpm100`.
     - Any `excluded_tracks` recorded in the manifest are absent from `export.pdb` and `Contents/`.

5. **Measured Stage Optimizations, Temporary-Array Lifetimes & Peak Memory ([`eval/analysis/perf_benchmark.json`](file:///Users/andresherrera/Developer/Set2Go/eval/analysis/perf_benchmark.json), Bit-Identical Outputs):**
   - **Verified benchmark input identity:**
     - **2-track real-audio benchmark (`test-tracks/blind2/`, verified against [`eval/analysis/blind2/inventory.json`](file:///Users/andresherrera/Developer/Set2Go/eval/analysis/blind2/inventory.json)):**
       - `Giovanni Lucchetti, ACID HARRY - Bora Bora (Extended Mix) [Alleanza].aiff`: **`323.633 s`**, `44100 Hz`, `2` ch, `14,272,230` decoded mono frames, `sha256: a81d5d85...`, `decoded_pcm_sha256: 1e9d4d3f...` *(earlier prose mistakenly wrote `388.0 s`)*.
       - `Jewel Kid - Beat Back (Extended Mix) [Alleanza].aiff`: **`304.0 s`**, `44100 Hz`, `2` ch, `13,406,400` decoded mono frames, `sha256: 48e5b078...`, `decoded_pcm_sha256: e249a875...` *(earlier prose mistakenly wrote `312.6 s`)*.
     - **2-track synthetic benchmark:** `synth_untagged.wav` (`30.0 s`, `44100 Hz`, `1` ch, `1,323,000` frames) + `synth_tagged.aiff` (`30.0 s`, `44100 Hz`, `1` ch, `1,323,000` frames).
   - **Stage call & runtime improvements (byte-for-byte identical across all 15 exported files):**
     - Single-pass audio decode in [`export_library`](file:///Users/andresherrera/Developer/Set2Go/src/set2go/export.py#L335-L343) (`1` `_read_mono_float32` call/track instead of `3`; `6 -> 2` calls on a 2-track run, `0.2489s -> 0.0909s`), immediately releasing `mono_sr` and `mono_` once per-track DSP finishes.
     - Skipped redundant `resolve_key` when `effective_keys` already provides a track's key (`3 -> 2` `libKeyFinder` C++ calls on the 2-track synthetic mix, `0.1529s -> 0.1095s`).
     - Reused precomputed source SHA-256 hashes across `dedupe_sources`, `reanalyse`, `effective_key_map`, `export_library`, and `manifest.build` (`12 -> 4` SHA-256 calls on a 2-track run, `0.3325s -> 0.1072s`).
     - **Total 2-track real-audio runtime:** **`12.6769s -> 12.1833s` (`-0.4936s` / `-3.9%`)**; **2-track synthetic runtime:** **`1.8975s -> 1.8244s` (`-0.0731s` / `-3.9%`)**.
   - **Temporary-array lifetimes & `kick_env` tradeoff evaluation:**
     - Measured in isolated subprocesses on the 2-track real-audio benchmark: retaining `kick_env` (`14,272,230` `float64` samples = `108.9 MiB` on `Bora Bora`) on `BeatAnalysis` saved only `~0.43 s` in `build_rhythm` (`~0.07 s` / `0.6%` of total 2-track wall time, and `0.0 s` on rejected/recovered tracks like `Beat Back`), while increasing parent-process peak RSS by **`+101.4 MiB`** (`1236.4 MiB -> 1337.8 MiB`) across `compute_waveforms()`.
     - **Action taken:** Removed `kick_env` retention from [`BeatAnalysis`](file:///Users/andresherrera/Developer/Set2Go/src/set2go/bpm_detect.py#L333-L378), [`rhythm.build_rhythm`](file:///Users/andresherrera/Developer/Set2Go/src/set2go/rhythm.py#L177-L200), [`contract.resolve_rhythm_with_gridcheck`](file:///Users/andresherrera/Developer/Set2Go/src/set2go/analysis/contract.py#L55-L80), and [`export_library`](file:///Users/andresherrera/Developer/Set2Go/src/set2go/export.py#L363-L485); freed intermediate `broad`, `kick`, and `be` envelopes inside `analyse_beats` as soon as used; released `mono_sr`, `mono_`, and `ba` immediately after each track in Phase 1; retained only compact metadata and packed payloads in `prepared[src]`; and popped each track from `prepared` in Phase 2 as soon as written.
   - **Peak-memory measurement method, units, and process scope:**
     - **Method & units:** `resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / (1024 * 1024)` and `resource.getrusage(resource.RUSAGE_CHILDREN).ru_maxrss / (1024 * 1024)` on macOS/Darwin (`ru_maxrss` in bytes divided by $2^{20}$ = **`MiB`**, stored as `peak_rss_mb`).
     - **Per-process peaks vs concurrent memory (`reuse_raw=True` vs full model inference):** Each `before` and `after` run executed in its own fresh Python subprocess. With `reuse_raw=True`, all work (decode, Fourier tempogram, waveform generation, `ctypes` `libkeyfinder.dylib`) runs in-process (`RUSAGE_SELF`; `RUSAGE_CHILDREN = 0.0 MiB`). Full Beat This! neural inference (`reuse_raw=False`) spawns a sequential `.venv-beat` child subprocess per track (`scripts/beat_this_worker.py`) while the parent waits in `subprocess.run()`; the worker's own `RUSAGE_SELF` is recorded separately in [`eval/analysis/blind2/beat_this_raw/`](file:///Users/andresherrera/Developer/Set2Go/eval/analysis/blind2/beat_this_raw) (`_meta.peak_rss_mb`: **`1000.0 MiB`** on `Bora Bora`, **`975.0 MiB`** on `Beat Back`). Independent process peaks occur at different points in time and are never summed as a total.
     - **Before/after figures (`reuse_raw=True`, isolated processes):**
       - **2-track real-audio (`Bora Bora` `323.633s` + `Beat Back` `304.0s`):** `RUSAGE_SELF` **`1235.0 MiB` (before) -> `1236.4 MiB` (after)** (`+1.4 MiB`, neutral within noise; down `-106.1 MiB` from the `1342.5 MiB` when `kick_env` was retained); `RUSAGE_CHILDREN` **`0.0 MiB` -> `0.0 MiB`**.
       - **2-track synthetic (`2 x 30.0s`, 1 untagged WAV + 1 tagged AIFF):** `RUSAGE_SELF` **`361.8 MiB` (before) -> `362.1 MiB` (after)** (`+0.3 MiB`); `RUSAGE_CHILDREN` **`0.0 MiB` -> `0.0 MiB`**.
     - **No memory-reduction claim is made:** Peak parent-process RSS is unchanged within measurement noise (`1235.0 -> 1236.4 MiB` real-audio; `361.8 -> 362.1 MiB` synthetic).

---

## 2. Hardware Validation Record & Scope

1. **`v17` `PWV4` Overview Acceptance (`desktop_v17_pwv4`, `waveform_v2.pwv4_v3`):**
   - Deployed to `/Volumes/REKTEST` via the guarded pipeline (`diagnostic/pre_write_desktop_v17_pwv4_20261029_054011/`, mount-verified written manifest `diagnostic/written_desktop_v17_pwv4_20261029_054202/`, post-test stick state preserved in `diagnostic/v17_hw_result_20261029_055807/`).
   - **Hardware result on CDJ-2000NXS2 fw 1.87 (`HANDOFF.md` lines 629–638):** Visually accepted by the user on the tested tracks and player configuration (*"overview looks better than v16; could use slightly more height, but is acceptable as-is"*). The stale comment at [`src/set2go/waveform.py`](file:///Users/andresherrera/Developer/Set2Go/src/set2go/waveform.py#L208-L210) has also been updated to match this record.
2. **`v18` Ten-Track Hardware Checks & Scope (`desktop_v18_consolidated`):**
   - **Payload equivalence:** Across all 10 tracks in `desktop_v18_consolidated`, the `PWV4` overview section (header and body) is **byte-identical** to `desktop_v17_pwv4`'s, and `PWV3`/`PWV5` detail sections use the accepted `v13` detail rule (`detail_v2`, byte-identical to `v13` on `Earth n Days`, `Snoop Dogg / H.O.U.S.E`, and `Zsak`).
   - **Hardware result ([`frozen/desktop_v18_consolidated/HARDWARE_RESULT.md`](file:///Users/andresherrera/Developer/Set2Go/frozen/desktop_v18_consolidated/HARDWARE_RESULT.md), `diagnostic/written_desktop_v18_consolidated_20261029_060030/`):** Passed the ten-track hardware checks performed on CDJ-2000NXS2 fw 1.87: both playlists and track order, metadata (artist/title, browse), playback, artwork, BPM/grid, and detail and overview waveforms.
   - **Waveform-mode caveat:** All waveforms appeared blue on the player during the `v18` hardware check. Blue appearance does **not** establish the player's waveform mode (i.e. it does not distinguish whether the player rendered `PWAV`/`PWV3` in `BLUE` mode or `PWV4`/`PWV5` in `RGB` mode).
3. **Newly Integrated Opt-In `gridcheck`-Recovered Exports (Not Hardware-Tested):**
   - Tracks recovered via the newly integrated opt-in `--gridcheck` policy (`accept_audio_grid` / `accept_with_gaps`, such as `Beat Back` and `Pink Soldiers`) have been validated locally against `rekordbox` reference exports (`eval/analysis/blind2/comparison_rekordbox.json`) and `verify_export.py --manifest=... --exact`, but have **not** been hardware-tested on a CDJ.
4. **`RGB` / `3Band` Modes and Other CDJ Models (Deferred / Unverified):**
   - `RGB` mode rendering confirmation and `3Band` waveform support (`.2EX` `PWV6`/`PWV7`/`PWVC`/`PVDI`, not implemented) remain deferred/unverified ([`frozen/desktop_v18_consolidated/PRODUCT_PLAN_waveform_styles.md`](file:///Users/andresherrera/Developer/Set2Go/frozen/desktop_v18_consolidated/PRODUCT_PLAN_waveform_styles.md)).
   - Only CDJ-2000NXS2 fw 1.87 has ever been tested; CDJ-3000 / CDJ-3000X / XDJ models and other firmware versions remain unverified (no compatibility claim).

---

## 3. Deferred Items (Out of Scope for This Hardening Round)

1. **Kick Refinement on `gridcheck`-Recovered Grids:**
   - Intentionally excluded from the `gridcheck` recovery path (`kick_corr_ms = None`) to preserve the exact audio-period grid evaluated on `blind1` and `blind2`. Evaluating whether sample-domain kick refinement improves or degrades `gridcheck`-recovered grids requires a fresh, unused blind evaluation batch.
2. **Automatic Bar-Origin / Downbeat Correction (`barphase.py`):**
   - `barphase.py` remains diagnostic/advisory only. `gridcheck` validates beat period and phase, not bar origin; only a human override (`grid_tool.py` / `--overrides`) marks `downbeat` as `"manual"` and clears downbeat review.
3. **Mode-Aware Hybrid Key Selection (`libKeyFinder` tonic + `essentia:edmm` mode):**
   - Remains a hypothesis formulated on used batches (`blind1` / `blind2`); `libKeyFinder` remains the only selectable `--predict` backend until tested on a fresh blind batch.
4. **Web Server / Job Queue / UI:**
   - Deferred to the DJHQ application layer, which should invoke the local engine contract (`export_library` / `analysis_key_export.py`) and consume `<out>_ENGINE_REPORT.json` (`ENGINE_CONTRACT_VERSION = "1.0"`).


---

## 4. Naming, Canonical Paths & Compatibility (Set2Go migration, 2026-10-30)

- **Product / package:** Set2Go; Python package and distribution `set2go` (`src/set2go/`, `pyproject.toml` `name = "set2go"`, `uv.lock` project entry). Future public route: `djhq.app/set2go`. Naming only: no algorithm, threshold, export-policy, binary-format or contract-field change (`ENGINE_CONTRACT_VERSION` stays `"1.0"`).
- **Canonical project path:** `/Users/andresherrera/Developer/Set2Go`.
- **Compatibility symlink (required for now):** `/Users/andresherrera/Developer/RekordSOS -> Set2Go`. Needed because (a) the three venvs' script shebangs still say `/Users/andresherrera/Developer/RekordSOS/.venv*/bin/python`, and (b) immutable historical evidence (`frozen/`, `eval/`, `diagnostic/`, `backups/`, historical manifests, sidecars, `desktop_v*` reports) records old absolute paths. Do not remove it until the venvs are recreated at the new path (deliberately not done: no reinstalls) and the historical references are accepted as text only.
- **Environments (unchanged, not recreated):** `.venv` (Python 3.15.1, editable `set2go` install: `__editable__.set2go-0.1.0.pth` -> `/Users/andresherrera/Developer/Set2Go/src`; dist-info renamed to `set2go-0.1.0.dist-info`, RECORD rewritten), `.venv-beat` (3.12.13, Beat This! worker), `.venv-key` (3.14.8, Essentia). The interpreters link to system/uv Pythons, so the move does not break them.
- **Path resolution from the canonical path:** `set2go.rhythm.ROOT` resolves to `/Users/andresherrera/Developer/Set2Go`; `BEAT_PY` (`.venv-beat/bin/python`), `BEAT_WORKER` (`scripts/beat_worker.py`), `CHECKPOINT` (`models/beat_this-final0.ckpt`) all exist and `rhythm.available()` is true. Package data (`src/set2go/data/seed_v2.pdb`, etc.) loads from the package directory. `import rekordsos` no longer exists (no alias shim was added).
- **Configuration names:** no `REKORDSOS_*` variables existed, so there are no compatibility aliases. Current (non-project-prefixed) variables remain `KEYVAL_ONLY/TAG/REFS` (evaluation script only). Any future setting must use `SET2GO_*`.
- **Commands (from `/Users/andresherrera/Developer/Set2Go`):** `.venv/bin/python scripts/analysis_key_export.py <out_dir> <sources...> --sidecar <sidecar.json> [--gridcheck] [--exclude-unresolved] ...`; `.venv/bin/python scripts/verify_export.py <out_dir> --manifest=<out_dir>_MANIFEST.json --exact`; `.venv/bin/pytest -q` (232 passed after the move). Imports: `from set2go.export import export_library`.
- **Equivalence evidence:** control export (Bora Bora + Beat Back, saved blind2 raw predictions, `gridcheck=True`, `reuse_raw=True`, playlist "Control") built before any edit and again after the rename: all 15 files (PDB, ANLZ DAT/EXT, audio, artwork) byte-identical by relative path and SHA-256; engine report and `_GRIDS.json` also identical. Inventories: `/Users/andresherrera/.gemini/antigravity-cli/brain/8d257543-5f94-4907-ab08-68b9ed601e77/scratch/ctl/{pre,post}_inventory.json` (audio trees removed).
- **Intentionally unchanged historical playlist labels:** `"RekordSOS Originals"`, `"RekordSOS New Tracks"` (`scripts/export_desktop_v1.py`, keeps the frozen v18 recipe byte-identical), `"RekordSOS Blind Reference"` / `"... 2"` (names on the reference stick; `scripts/analysis_blind_compare_rb.py`), `"RekordSOS Test"`, `"RekordSOS Reference"` (candidate/diagnostic scripts and tests).
- **Outstanding migration constraints:** (1) the symlink dependency above; (2) historical reports record `src/rekordsos/...` paths in code-hash keys (e.g. `eval/analysis/blind*/gridcheck_eval*.json`, FROZEN_CONFIG files) while new reports use `src/set2go/...`; (3) frozen/backup code snapshots still import `rekordsos` and are not runnable against the current tree by design; (4) `memory/project_rekordsos.md` is an old notes file, not updated; (5) generated `*_REPORT.json`/`PLAN.json` beside historical `desktop_v*` trees keep old names; (6) DJHQ must import `set2go`, not `rekordsos`; (7) venv shebangs/`prompt = rekordsos` in `.venv/pyvenv.cfg` still carry the old name until the venvs are recreated.
