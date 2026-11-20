# DJHQ + Set2Go: Validation Status & Evidence Inventory

**Document Version:** 1.0  
**Date:** 2026-10-30  
**Repository Root:** `/Users/andresherrera/Hacking/djhq-saa-s-design`

---

## 1. Verified Evidence Locations

| Category | Location | Contents & Purpose |
|---|---|---|
| **Monorepo Tests** | `services/set2go/tests/` | 232 test items covering analysis, rhythm, export, gridcheck, waveforms |
| **Monorepo Seeds** | `services/set2go/src/set2go/data/` | Validated PDB seeds (`seed_v2.pdb`, `subcol_seed.pdb`, `empty_seed.pdb`) |
| **Monorepo Fixtures** | `services/set2go/tests/fixtures/` | 3 synthetic WAV files (`track_a.wav`, `track_b.wav`, `track_c.wav`, ~7.5MB total) |
| **Standalone Evidence** | `/Users/andresherrera/Developer/Set2Go/frozen/` | Frozen baseline exports (`desktop_v18_consolidated`, `desktop_v12_full`) |
| **Standalone Raw Caches** | `/Users/andresherrera/Developer/Set2Go/eval/analysis/blind2/beat_this_raw/` | Sealed Beat This! raw predictions for deterministic testing (`Bora Bora`, `Beat Back`) |
| **Seals & Manifests** | `/Users/andresherrera/Developer/Set2Go/eval/analysis/blind1/RAW_SEAL.json` | Hash-sealed historical predictions (regression protected) |

---

## 2. Test Execution Summary

### Pytest Monorepo Execution
Command:
```bash
PYTHONPATH=services/set2go/src /Users/andresherrera/Developer/Set2Go/.venv/bin/python -m pytest services/set2go/tests
```
**Result:** `210 passed, 22 skipped in 51.68s` (0 failures).

### Detailed Breakdown of the 22 Skipped Tests
The 22 tests validate historical diagnostic directories and frozen run folders that were intentionally excluded from monorepo source migration:

1. **Waveform Overview Probing (`test_overview_probe.py` - 1 skipped):**
   - `test_desktop_v15_probed_overview_matches_synthetic`
   - *Skip Reason:* `not (V14.exists() and V15.exists())` ("trees not present")
   - *Subject:* Byte comparison between historical runs `desktop_v14_overview` and `desktop_v15_overview_probe`.

2. **Binary PDB Field Patching (`test_pdb_field_patch.py` - 5 skipped):**
   - `test_group_patches_only_its_fields[unique_id]`, `[const18]`, `[playcount]`, `[dates]`
   - `test_subcolumn_patch_preserves_everything_else`
   - *Skip Reason:* `not (ROOT / "desktop_v6_officialpdb").exists()` ("diagnostic tree not present")
   - *Subject:* Direct binary patching of DeviceSQL pages against the v6 diagnostic export.

3. **PDB Page-Swapping Experiments (`test_pdb_swap_pages.py` - 6 skipped):**
   - `test_v6_with_v9_history_passes_pdbcheck`, `test_v6_with_v9_tables_0_and_1_is_clean`, `test_converse_v9_with_v6_history_leaves_history_dirty`, `test_v6_with_v9_history_and_art_is_clean`, `test_patch_history_pages_directly_matches_cut_t`, `test_candidate_v4_passes_pdbcheck`
   - *Skip Reason:* `not (ROOT / "desktop_v6_officialpdb").exists()`, `desktop_v9`, `candidate_v4` ("diagnostic trees not present")
   - *Subject:* Experimental page transplants between historical diagnostic trees.

4. **Diagnostic PDB Validation (`test_pdbcheck.py` - 1 skipped):**
   - `test_diagnostic_official_pdb_is_accepted`
   - *Skip Reason:* `not (ROOT / "desktop_v6_officialpdb").exists()` ("experimental seed not present")
   - *Subject:* Validating historical official PDB diagnostic tree.

5. **Historical v4 Regression Suite (`test_v4_configuration.py` - 9 skipped):**
   - `test_v4_uses_expected_subcol_seed`, `test_v4_has_two_playlists_in_expected_order`, `test_v4_has_ten_tracks_no_duplicates`, `test_v4_all_ten_tracks_have_matching_anlz`, `test_v4_audio_sha_matches_source_audio`, `test_v4_metadata_matches_source_tags`, `test_v4_artwork_generated_for_all_nine_artwork_tracks`, `test_v4_anlz_beat_grids_match_expected_bpm_and_bar_origin`, `test_v4_waveform_sections_present_in_all_anlz`
   - *Skip Reason:* `not (ROOT / "frozen/desktop_v4_rhythm").exists()`, `desktop_v1_subcol` ("frozen baseline not present")
   - *Subject:* Asserting that `desktop_v4_rhythm` matches historical `desktop_v1_subcol`.

---

## 3. Deterministic Export Equivalence
- **Method:** 2-track export test (`Bora Bora` + `Beat Back`) using saved raw predictions from `/Users/andresherrera/Developer/Set2Go/eval/analysis/blind2/beat_this_raw/` with `gridcheck=True`.
- **Reference Hashes:** Compared against frozen post-rename baseline inventory.
- **Outcome:** **15/15 files byte-identical matches, 0 diffs**.
  - `export.pdb`: `c7e70b061704f4c1fb0383875be84b246fda0836b5bd8f60cd36c8901067bf40` (Identical)
  - `P006/0002CD46/ANLZ0000.DAT`: `afddd5b8212599f1a2d1d42b82346ac262306ee4e146800841e82f314eb257db` (Identical)
  - `P01F/000292FD/ANLZ0000.DAT`: `b0afbd1d8e5c134db425aa8f5539c9af7b6ab14d5f8402df8ae225b146e2dbc9` (Identical)
  - Artwork JPEGs & audio: Identical byte-for-byte.

---

## 4. Web Build & Known Lint Failures

### TypeScript Check & Production Build
- `npx tsc --noEmit`: Clean exit (`code 0`).
- `npm run build`: Clean exit (`code 0`), generating 41/41 routes in 8.9s.

### Web Lint (`npm run lint`)
- **Status:** Fails with exit code 1 (`174 problems: 7 errors, 167 warnings`).
- **Nature of Errors:** Pre-existing React Hook errors (`react-hooks/set-state-in-effect`) in existing UI components:
  1. `components/dashboard/audience-section.tsx:82:5`
  2. `components/djhq/career-updates-section.tsx:779:21`
  3. `components/profile/mobile-scroll-nav.tsx:39:7`
  4. 4 additional component hook warnings.
- **Nature of Warnings:** 167 unused variable warnings in legacy skills/scripts (`.claude/skills/impeccable/scripts/...`).
- **Set2Go Scope:** ESLint checks only JS/TS/TSX; **zero** lint failures originate from `services/set2go/`.

---

## 5. Hardware Validation Scope & Untested Areas

### Tested on Hardware
- **Target Device:** Pioneer CDJ-2000NXS2 (Firmware 1.87 only).
- **Tested Baseline:** `desktop_v18_consolidated` (10 tracks, 2 playlists, metadata, artwork, blue detail waveform `PWV3`/`PWV5`, blue overview waveform `PWV4`).
- **Result:** Successfully browsed, loaded, and played.

### Untested & Limitations
1. **No Hardware Test for Recovered Grids:** Opt-in `gridcheck` recovered grids (`accept_audio_grid`, `accept_with_gaps` e.g. `Beat Back`, `Pink Soldiers`) have not been tested on physical CDJ hardware.
2. **Untested Hardware Models:** CDJ-3000, CDJ-3000X, XDJ series, and other firmware revisions have never been tested; no compatibility claims are made.
3. **Untested Waveform Modes:** 3-Band and RGB waveforms (`.2EX` `PWV6`/`PWV7`/`PVDI`) are not implemented.
4. **USB / Mobile Writing:** Writing directly to iPhone USB drives or web-based WebUSB exports is untested and unverified.
