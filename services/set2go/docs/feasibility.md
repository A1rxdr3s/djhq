# Feasibility Report — Pioneer Device Library Export

Date: 2026-10-27

## Format summary

When rekordbox exports to USB it writes:

```
.PIONEER/
  rekordbox/
    export.pdb        DeviceSQL page-based binary store (20 tables, 4 096-byte pages)
    exportExt.pdb     My Tag data (companion, optional)
  USBANLZ/
    P<3hex>/<8hex>/
      ANLZ0000.DAT    per-track analysis: beat grid, cue list, waveform preview
      ANLZ0000.EXT    extended: colour waveform, song structure (CDJ-2000NXS2+)
  Artwork/            album art (optional)
Contents/
  <audio files>
```

All paths in export.pdb are device-relative (e.g. `/Contents/track.wav`,
`/.PIONEER/USBANLZ/P9B9/00000001/ANLZ0000.DAT`). The `.` prefix on the
PIONEER folder is FAT32-compatible; it is not a Unix hidden-file convention.

The format is fully undocumented by Pioneer. All knowledge is community
reverse engineering.

---

## Libraries evaluated

### 1. fragmede/rekordbox-pdb

| Property | Value |
|----------|-------|
| Commit | ee3bac2 (July 2026) |
| Licence | MIT |
| Language | Python 3.10+, no runtime dependencies |
| Read export.pdb | Yes — all 20 table types |
| Write export.pdb | Yes — `PdbEditor`: `add_track`, `create_playlist`, `add_to_playlist` |
| Create from scratch | Partially — requires a seed file; we generate one from the format spec |
| ANLZ generation | No |
| Validated in rekordbox | Yes (write path) |
| Validated on CDJ hardware | No |

**Decision: primary dependency.** MIT, pure Python, full write support,
well-specified format in FORMAT.md. We generate our own empty seed.pdb to
avoid carrying a copy of a real rekordbox export.

Notable gap: FORMAT.md documents 6 unknown table types (9, 10, 14–16, 17),
one unknown u32 track field, and incomplete index-page understanding. These
may or may not affect CDJ compatibility.

### 2. holzhaus/rekordcrate

| Property | Value |
|----------|-------|
| Version | 0.3.0 (Jan 2025), 710 commits |
| Licence | MPL-2.0 |
| Language | Rust |
| Read export.pdb | Yes |
| Write export.pdb | Low-level BinWrite on structs; no `add_track` API |
| Create from scratch | No |
| Read ANLZ | Yes |
| Write ANLZ | BinWrite structs exist; no high-level API |
| Validated on CDJ | No |

Issue #142 (open) explicitly states creating an export is not yet possible.
Requires Rust toolchain — not available on this machine.

**Decision: not used.** Provides structural reference but no usable API.

### 3. Deep-Symmetry/crate-digger

| Property | Value |
|----------|-------|
| Version | v0.2.1 (Jul 2025) |
| Licence | EPL-2.0 / MPL-2.0 / LGPL-3.0 |
| Language | Java / Clojure |
| Read export.pdb | Yes |
| Write | None — read-only Kaitai Struct parsers |
| Read ANLZ | Yes — all section types |
| Write ANLZ | No |
| Validated on CDJ | Yes — read path only |

**Decision: reference only.** The `rekordbox_anlz.ksy` spec was used to
understand the ANLZ binary format for our custom writer.

### 4. dylanljones/pyrekordbox

Targets the *desktop* rekordbox SQLite database (`master.db`), not the CDJ
DeviceSQL format. Its ANLZ module parses and builds `.DAT`/`.EXT` files but
has no `create()` factory. Not used directly; the ANLZ binary format was
verified against its struct definitions.

---

## ANLZ file format (DAT)

Big-endian. Written from scratch in `src/set2go/anlz_writer.py`.

```
File header (28 bytes):
  PMAI | len_header=28 | len_file | 16 zero bytes

Tags (concatenated):
  [fourcc 4B] [len_header 4B] [len_tag 4B] [body (len_tag-12) bytes]

PPTH (path tag):
  fourcc=PPTH, len_header=16
  body: len_path (u32be) | path UTF-16BE (len_path-2 bytes) | 0x0000

PQTZ (beat grid):
  fourcc=PQTZ, len_header=24
  body: 0x00000000 | 0x00080000 | num_beats (u32be)
        [ beat_number (u16be) | tempo_bpm×100 (u16be) | time_ms (u32be) ] × N

PCOB (cue list, memory):
  fourcc=PCOB, len_header=24
  body: cue_type=0 (u32be) | 0x0000 | count=0 (u16be) | memory_count=0 (i32be)

PCOB (cue list, hot cue):
  same with cue_type=1
```

Waveform tags (PWAV, PWV2–PWV7) are not yet written.
The `.EXT` file is not generated.

---

## BPM detection

`aubio 0.4.9` is used via Homebrew. Not pip-installable for Python 3.15 on
this machine; vendored into the virtual environment manually.

The aubio `tempo` object returns beat timestamps from audio frames. BPM is
computed as `60 / median(inter-beat-intervals)`.

Accuracy on real music: adequate for a coarse grid; not validated against
rekordbox. Sine-wave test files show plausible (if arbitrary) BPM values.

---

## Architecture recommendation

```
┌─────────────────────────────────────────────────────┐
│  1. Audio ingestion                                  │
│     wav → duration, sample_rate, file_size (stdlib)  │
│     metadata → title/artist/BPM (ID3, XMP, manual)  │
├─────────────────────────────────────────────────────┤
│  2. Audio analysis                                   │
│     BPM detection: aubio (local, CLI helper)         │
│     Waveform generation: not yet implemented         │
├─────────────────────────────────────────────────────┤
│  3. Device-library generation                        │
│     export.pdb: rekordbox-pdb PdbEditor (Python)     │
│     ANLZ .DAT: set2go.anlz_writer (pure Python)   │
├─────────────────────────────────────────────────────┤
│  4. Packaging / transfer                             │
│     Script copies to local dest_dir                  │
│     User copies manually to FAT32 USB               │
└─────────────────────────────────────────────────────┘
```

**Browser / iPhone:** `showDirectoryPicker()` is blocked in Safari (as of
iOS 17). Writing to an external USB drive from a web browser on iPhone is
not possible today. A native iOS app or a desktop helper app is required for
the iPhone workflow. This is a later milestone.

**Server vs. local:** BPM analysis (0.2s for 3 × 30s sine waves) is fast
enough to run locally on a laptop. Real 5-minute tracks will take longer;
order-of-magnitude estimate is 2–10s per track for BPM. Waveform generation
will add significant time if implemented. No reason to move analysis to a
server for the initial desktop use case.

---

## Known gaps

1. **Hardware validation:** The CDJ may reject our export.pdb if any of the
   six unknown table types need non-empty content. The CDJ may also require
   valid waveform data before allowing full playback controls.

2. **Waveform tags (PWAV / PWV2–PWV7):** Not generated. CDJ will show no
   waveform. Whether this prevents playback is unknown.

3. **`.EXT` file:** Not generated. Extended analysis (colour waveform, song
   structure) requires this. CDJ-2000NXS2 and CDJ-3000 may not require it
   for basic playback.

4. **Genre/Colour/Key display:** Keys, colours, and My Tags are not set.
   Minor cosmetic limitation.

5. **VBR audio:** PVBR seek-index tag is not generated. WAV is CBR/uncompressed
   so this should not matter for WAV files.

6. **Seed PDB from-scratch generation:** Our empty seed replicates the
   index-page binary pattern from a real rekordbox export. The six unknown
   table types are initialised as empty; we don't know if the CDJ expects
   content in any of them.

7. **aubio GPL-3.0:** Using aubio as a library (not subprocess). Legal
   review needed before distribution. BPM detection could be replaced with
   an LGPL alternative (essentia) or skipped for early distribution.
