# Stage 1 Integration Handoff: Set2Go Python Engine in DJHQ Monorepo

## 1. Executive Summary
The standalone Python engine (`set2go`) has been integrated into the DJHQ monorepo under `services/set2go/` with zero modifications to the existing Next.js web application, database schemas, authentication, routing, or artist website functionality.

- **Monorepo engine root:** `services/set2go/`
- **Canonical development location for active engine work:** `/Users/andresherrera/Hacking/djhq-saa-s-design/services/set2go`
- **Standalone reference & external data location (left intact):** `/Users/andresherrera/Developer/Set2Go` (with `/Users/andresherrera/Developer/RekordSOS` symlink)
- **Engine test suite:** 232 items collected (`210 passed`, `22 skipped` on historical diagnostic/frozen trees).
- **Deterministic 2-track export verification:** 15/15 files byte-identical to frozen baseline SHA-256 hashes (`0 diffs`).
- **Next.js web build:** Completed successfully with 0 errors (`41/41` pages generated, TypeScript check clean).

---

## 2. Test Reconciliation: Standalone (232 Passed) vs Monorepo (210 Passed / 22 Skipped)

The 22 tests that passed in the standalone repository and skipped in the monorepo explicitly validate historical diagnostic runs, page-swap experiments, and frozen output baselines (`desktop_v6_officialpdb`, `desktop_v4_rhythm`, `desktop_v9`, `desktop_v10`, `desktop_v14`, `desktop_v15`, `candidate_v4`). Because those historical run trees were deliberately excluded from source migration to prevent monorepo bloat, pytest skipped them via their built-in `skipif` decorators:

1. **`test_overview_probe.py` (1 skipped):**
   - `test_desktop_v15_probed_overview_matches_synthetic`
   - *Condition:* `not (V14.exists() and V15.exists())` ("trees not present")
   - *Scope:* Probing waveform overview byte differences between historical runs `desktop_v14_overview` and `desktop_v15_overview_probe`.

2. **`test_pdb_field_patch.py` (5 skipped):**
   - `test_group_patches_only_its_fields[unique_id]`, `[const18]`, `[playcount]`, `[dates]` (4)
   - `test_subcolumn_patch_preserves_everything_else` (1)
   - *Condition:* `not (ROOT / "desktop_v6_officialpdb").exists()` ("diagnostic tree not present")
   - *Scope:* In-place binary field patching on the historical v6 diagnostic PDB.

3. **`test_pdb_swap_pages.py` (6 skipped):**
   - `test_v6_with_v9_history_passes_pdbcheck`, `test_v6_with_v9_tables_0_and_1_is_clean`, `test_converse_v9_with_v6_history_leaves_history_dirty`, `test_v6_with_v9_history_and_art_is_clean`, `test_patch_history_pages_directly_matches_cut_t`, `test_candidate_v4_passes_pdbcheck`
   - *Condition:* `not (ROOT / "desktop_v6_officialpdb").exists()`, `desktop_v9_v6_ourhistory`, `candidate_v4` ("diagnostic trees not present")
   - *Scope:* Historical table/page-swapping experiments across historical diagnostic runs.

4. **`test_pdbcheck.py` (1 skipped):**
   - `test_diagnostic_official_pdb_is_accepted`
   - *Condition:* `not (ROOT / "desktop_v6_officialpdb").exists()` ("experimental seed not present")
   - *Scope:* Validation of the historical official PDB diagnostic export.

5. **`test_v4_configuration.py` (9 skipped):**
   - `test_v4_uses_expected_subcol_seed`, `test_v4_has_two_playlists_in_expected_order`, `test_v4_has_ten_tracks_no_duplicates`, `test_v4_all_ten_tracks_have_matching_anlz`, `test_v4_audio_sha_matches_source_audio`, `test_v4_metadata_matches_source_tags`, `test_v4_artwork_generated_for_all_nine_artwork_tracks`, `test_v4_anlz_beat_grids_match_expected_bpm_and_bar_origin`, `test_v4_waveform_sections_present_in_all_anlz`
   - *Condition:* `not (ROOT / "frozen/desktop_v4_rhythm").exists()`, `desktop_v1_subcol` ("frozen baseline not present")
   - *Scope:* Historical regression checks asserting that `desktop_v4_rhythm` matches `desktop_v1_subcol`.

All 210 core engine unit tests, contract v1.0 tests, gridcheck tests, and workflow tests pass completely in the monorepo.

---

## 3. Web Lint vs Build Status
- **TypeScript:** `npx tsc --noEmit` exited `0` with no type errors.
- **Next.js Production Build:** `npm run build` exited `0` with 41/41 routes generated.
- **ESLint:** `npm run lint` exists (`eslint .`) and exited `1` with `174 problems (7 errors, 167 warnings)`. All 7 errors are pre-existing React Hook errors in existing UI components (`components/dashboard/audience-section.tsx`, `components/djhq/career-updates-section.tsx`, `components/profile/mobile-scroll-nav.tsx`). The 167 warnings are pre-existing unused variables in `.claude/skills/impeccable/`. Zero lint issues are related to `services/set2go`.

---

## 4. Tracked Inventory, External Data & Symlink Safeguards
- **Excluded Items:** No credentials, no `.env` files, no virtualenvs (`.venv*`), no full audio corpora (`test-tracks/`), and no bulky historical folders (`desktop_v*`, `eval/`, `reference/`) were copied.
- **Symlinks:** Zero symlinks were created inside the monorepo (`services/set2go/` contains 0 symlinks). The only symlink is external: `/Users/andresherrera/Developer/RekordSOS -> Set2Go`. Build and deployment tools cannot inadvertently traverse or bundle external artifacts.

---

## 5. Configuration & Exact Commands

### Configurable Environment Variables (`SET2GO_*`)
- `SET2GO_BEAT_PYTHON`: Path to PyTorch Python (default: `/Users/andresherrera/Developer/Set2Go/.venv-beat/bin/python`)
- `SET2GO_BEAT_WORKER`: Path to beat worker (default: `services/set2go/scripts/beat_worker.py`)
- `SET2GO_BEAT_CHECKPOINT`: Path to checkpoint (default: `/Users/andresherrera/Developer/Set2Go/models/beat_this-final0.ckpt`)
- `SET2GO_KEYFINDER_DYLIB`: Path to native dylib (default: `/tmp/libkf_wrapper.dylib`)
- `SET2GO_STANDALONE_DIR`: Standalone root for external test corpora (default: `/Users/andresherrera/Developer/Set2Go`)

### Local Commands
```bash
# 1. Health check
PYTHONPATH=services/set2go/src /Users/andresherrera/Developer/Set2Go/.venv/bin/python services/set2go/scripts/check_engine.py

# 2. Pytest suite
PYTHONPATH=services/set2go/src /Users/andresherrera/Developer/Set2Go/.venv/bin/python -m pytest services/set2go/tests

# 3. Web build
npm run build
```
