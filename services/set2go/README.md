# Set2Go — Pioneer CDJ Library Export Engine

Set2Go is the export and analysis engine for Pioneer CDJ-compatible USB libraries, integrated within the DJHQ monorepo under `services/set2go/`.

## DJHQ Monorepo Quickstart

### 1. Engine Health Check
Run the preflight health check to verify module resolution, seed data, contract v1.0, and external environments:
```bash
PYTHONPATH=services/set2go/src /Users/andresherrera/Developer/Set2Go/.venv/bin/python services/set2go/scripts/check_engine.py
```

### 2. Configuration (`SET2GO_*` Environment Variables)
Runtime paths have automatic fallbacks to local service directories and standalone developer directories (`/Users/andresherrera/Developer/Set2Go`), but can be explicitly customized:
- `SET2GO_BEAT_PYTHON`: Path to isolated PyTorch Python interpreter (default: `.venv-beat/bin/python` or `/Users/andresherrera/Developer/Set2Go/.venv-beat/bin/python`)
- `SET2GO_BEAT_WORKER`: Path to beat worker script (default: `services/set2go/scripts/beat_worker.py`)
- `SET2GO_BEAT_CHECKPOINT` / `SET2GO_CHECKPOINT`: Path to Beat This! checkpoint file (default: `/Users/andresherrera/Developer/Set2Go/models/beat_this-final0.ckpt`)
- `SET2GO_KEYFINDER_DYLIB`: Path to native `libKeyFinder` ctypes wrapper (default: `/tmp/libkf_wrapper.dylib` built via `scripts/build_kf.sh`)
- `SET2GO_STANDALONE_DIR`: Standalone source/test directory for resolving external reference data and raw test caches (default: `/Users/andresherrera/Developer/Set2Go`)

### 3. Running Supported CLI Analysis & Export
```bash
PYTHONPATH=services/set2go/src /Users/andresherrera/Developer/Set2Go/.venv/bin/python services/set2go/scripts/analysis_key_export.py \
    <out_dir> <audio_files...> \
    --sidecar <sidecar.json> \
    --gridcheck \
    [--reuse-raw --raw-cache <dir>]
```

### 4. Running Verification
```bash
PYTHONPATH=services/set2go/src /Users/andresherrera/Developer/Set2Go/.venv/bin/python services/set2go/scripts/verify_export.py \
    <out_dir> \
    --manifest=<out_dir>_MANIFEST.json \
    --exact
```

### 5. Running Engine Tests
```bash
PYTHONPATH=services/set2go/src /Users/andresherrera/Developer/Set2Go/.venv/bin/python -m pytest services/set2go/tests
```

---

Local proof-of-concept. Not a finished product. Not validated on hardware.

Generate a Pioneer CDJ-compatible USB device library from WAV files and a
playlist — without rekordbox.

## What it produces

```
<dest>/
  PIONEER/
    rekordbox/
      export.pdb          ← DeviceSQL library (tracks, artists, genres, playlist)
    USBANLZ/
      P<hex>/<hex>/
        ANLZ0000.DAT      ← beat grid, empty cue lists (no waveform data)
  Contents/
    <track>.wav           ← original audio, byte-for-byte copy (SHA-256 verified)
```

The folder is named `PIONEER` (no leading dot). CDJ firmware checks `PIONEER/`
first; it falls back to `.PIONEER/` for macOS-origin exports. Using the
primary name avoids that fallback.

## Setup

**Requirements:** macOS Apple Silicon (M1+), Homebrew, uv.

```sh
# 1. Install aubio for BPM detection (Homebrew — pip build fails on Python 3.15)
brew install aubio

# 2. Install project Python dependencies
uv sync

# 3. Copy aubio into the uv venv (one-time manual step — see note below)
bash scripts/setup_aubio.sh
```

**Why the manual step?** The aubio 0.4.9 C extension fails to build from
source under Python 3.15 (and 3.12). Homebrew provides a pre-built binary
for its own Python 3.15. `setup_aubio.sh` copies that binary into the uv
virtual environment. The copy is idempotent and safe to re-run.

## Running the export

```sh
uv run scripts/export_usb.py <dest_dir> <playlist_name> track1.wav track2.wav track3.wav

# Example
uv run scripts/export_usb.py ./my_usb "Friday Set" a.wav b.wav c.wav

# Skip BPM detection (no ANLZ beat grid; faster; CDJ shows '--' for BPM)
uv run scripts/export_usb.py --no-analyse ./my_usb "Quick Set" a.wav b.wav c.wav
```

## Running tests

```sh
uv run pytest tests/ -v
```

17 tests pass in under 1 second.

## Performance (measured, synthetic inputs)

| Input | Duration | File size | BPM detect | Copy + hash |
|-------|---------|-----------|------------|-------------|
| track_a.wav (44.1 kHz 16-bit mono sine) | 30 s | 2.52 MB | 62 ms | 2 ms |
| track_b.wav | 25 s | 2.10 MB | 44 ms | 2 ms |
| track_c.wav | 35 s | 2.94 MB | 51 ms | 3 ms |

**What is timed:** `time.perf_counter()` wraps the entire `export()` call,
including BPM detection, audio copy, SHA-256 verification, PDB generation,
and ANLZ file writes. The 0.2s total includes all three tracks.

**What this does NOT prove:** These are synthetic sine waves (7.56 MB total).
A typical 3-promo set of stereo 24-bit WAV files at 5 minutes each is roughly
3 × 150 MB = 450 MB. At measured copy+hash throughput (~2 MB/s for these
tiny files) the wall time will be dominated by USB write speed, not CPU.
BPM detection for a real 5-minute track at 44.1 kHz will take more time —
estimate 1–5 s per track based on aubio's O(n_frames) algorithm; unmeasured.

## BPM and beat grid — what is detected vs. assumed

**What aubio detects:**
- Beat onset timestamps (seconds from file start) using an energy-based
  tempo tracker (`aubio.tempo`), hop size 512 samples.
- A single global BPM estimate (median of inter-beat intervals).

**What is assumed (not detected):**
- **Beat-in-bar position** (1–4): computed as `(i % 4) + 1` starting from
  the first detected onset. The true bar position depends on where the music
  actually starts on beat 1 of bar 1 — this is not determined.
- **Bar alignment:** the first beat time is from aubio's first stable onset
  detection. It is NOT the audio's actual downbeat. Real rekordbox analysis
  does phrase detection to align the grid to bar 1.
- **BPM constancy:** we store a single constant BPM for all beats.
  Variable-tempo or rubato tracks will have incorrect grids.

**Sine-wave test results are not evidence of BPM quality.** A pure sine wave
has no musical beat; aubio's energy detector finds arbitrary onsets in its
amplitude envelope. The BPM values (~125, ~119, ~120) from the sine tests
are artifacts of the sine frequency and hop size, not meaningful tempo data.

**Level B (BPM grid visible on CDJ) requires hardware validation** to confirm
that our ANLZ PQTZ format is accepted and the grid aligns on real music.

## Current limitations

| Feature | Status |
|---------|--------|
| export.pdb: tracks, artists, genres, playlists | Implemented |
| Audio copy with SHA-256 verification | Implemented |
| ANLZ .DAT: file path (PPTH), empty cue lists (PCOB) | Implemented |
| ANLZ .DAT: beat grid (PQTZ) | Implemented — constant BPM, bar alignment unvalidated |
| Waveform preview (PWAV, PWV2) | Not implemented |
| Extended analysis (.EXT file) | Not implemented |
| PIONEER vs .PIONEER folder | Using `PIONEER` (CDJ primary path) |
| CDJ-2000NXS2 hardware validation | **Pending** |
| CDJ-3000 validation | Pending |
| Bar alignment / downbeat detection | Not implemented |
| iPhone/USB-C write workflow | Untested (see below) |

## Mobile feasibility

`showDirectoryPicker()` is blocked in Safari on iOS as of 2026-10-27. A pure
web app cannot write to a USB-C drive from Safari.

**Untested alternatives (do not assume impossible):**
- Download export as ZIP → Files app → copy to USB-C drive via Files drag
- A native iOS app using UIDocumentPickerViewController (standard API, solved)
- A shortcut running a local Python script (Pythonista, a-Shell)

The "download ZIP → Files → USB" path does NOT require showDirectoryPicker.
It requires: (1) a server to generate the ZIP, (2) the user to manually copy
in Files app. Whether Files app allows copying to an external USB drive on
iPhone 15+ with the correct folder structure has NOT been physically tested.
This must be marked **untested**, not impossible.

## Architecture

```
src/set2go/
  anlz_writer.py   — pure-Python binary ANLZ .DAT generator (PPTH, PQTZ, PCOB)
  bpm_detect.py    — BPM + beat timestamps via aubio (constant BPM, i%4 bar pos)
  export.py        — orchestrates copy + PDB + ANLZ generation
  data/seed.pdb    — empty 21-page DeviceSQL seed (self-generated from format spec)

scripts/
  export_usb.py    — CLI entry point
  setup_aubio.sh   — one-time aubio setup

tests/
  test_spike.py    — 17 unit and integration tests
  fixtures/        — synthetic WAV files (sine waves, not for BPM validation)
```

## Dependency versions

| Dependency | Version / Commit | License |
|-----------|-----------------|---------|
| rekordbox-pdb (fragmede) | git ee3bac2 | MIT |
| aubio | 0.4.9 (Homebrew) | GPL-3.0 |
| numpy | 2.5.4 | BSD |
| pyrekordbox | 0.5.0 (added for validation) | MIT |
| construct | 2.10.70 | MIT |
| pytest | 9.2.0 | MIT |

**aubio GPL-3.0 note:** aubio is used as a library (imported, not subprocess).
GPL-3.0 may impose copyleft obligations on distribution. BPM detection is
optional (`--no-analyse`). Before distributing this tool, replace aubio with
an LGPL/MIT alternative (essentia-tensorflow, librosa) or remove it entirely.

## See also

- `docs/feasibility.md` — format research and library evaluation
- `docs/hardware-test.md` — CDJ test procedure with A/B/C acceptance levels
