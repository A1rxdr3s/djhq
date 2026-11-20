"""Core export logic: build a Pioneer device library from WAV files.

Produces the following structure inside dest_dir (treat as USB root):

    .PIONEER/
        rekordbox/
            export.pdb
        USBANLZ/
            P<hex>/
                <hex>/
                    ANLZ0000.DAT
    Contents/
        <filename>.wav   (original bytes, hash-verified)

Acceptance levels
-----------------
A: CDJ recognises library, playlist loads, tracks play.
   (No ANLZ = "NOT ANALYSED" banner but audio works.)
B: BPM, beat grid visible. Waveform NOT implemented in this spike.
"""

from __future__ import annotations

import hashlib
import os
import shutil
import struct
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable, Mapping, Sequence

from rekordbox_pdb.edit import PdbEditor, encode_string, _align4
from rekordbox_pdb.pdb import TableType
from .anlz_writer import write_dat, write_ext, BeatEntry
from .artwork import write_artwork
from . import rhythm as rhythm_mod
from .pdbcheck import inconsistent_pages
from .grid import Grid, beats_from_grid, effective_grid, load_overrides, manual_for, write_sidecar
from .metadata import read_metadata, strip_key_prefix
from .bpm_detect import analyse_beats, duration_seconds, wav_info
from .key_detect import KeyResult, resolve_key
from .waveform import compute_waveforms


# Seed database: structural-tables-only export.pdb derived from the
# fragmede/rekordbox-pdb test fixture (MIT licence) at commit ee3bac2f.
# The fixture (one-song-export.pdb) is a genuine single-song rekordbox
# export; scripts/make_clean_seed.py soft-deletes all user-data rows while
# preserving COLORS (8 presets), COLUMNS (27), and two unknown structural
# tables that real CDJs and rekordbox expect. All hardware-validated
# candidates (v3, diag_b–diag_e) were built from this seed.
# empty_seed.pdb (scripts/make_empty_seed.py) is clean_seed.pdb with the ghost
# data pages of user-data tables removed, so real rows start at slot 0 like an
# official export. clean_seed.pdb (hardware-validated for playback) is kept.
_SEED_PDB = Path(__file__).parent / "data" / "empty_seed.pdb"          # previous default; kept for reproducing older exports
# seed_v2.pdb = empty_seed + ARTIST sub-column (scripts/make_subcolumn_seed.py) + table-19 live-row repair with a neutral date
# (scripts/make_history_fix_seed.py). It is the structure validated on CDJ-2000NXS2 fw 1.87 (artists beside playlist titles, INFO/ARTIST browse,
# playback) and the default seed. Neither stage alone was ever sufficient on hardware, so they are never separated here.
_DEFAULT_SEED_PDB = Path(__file__).parent / "data" / "seed_v2.pdb"


@dataclass
class TrackSpec:
    """One source file. Empty fields are filled from the file's own tags.

    Explicit values override tags. Titles are never rewritten unless
    export_library(..., normalize_titles=True) is requested.
    """
    wav_path: Path
    title: str = ""
    artist: str = ""
    album: str = ""
    genre: str = ""


@dataclass
class ExportResult:
    dest_dir: Path
    pdb_path: Path
    track_ids: list[int]
    playlist_id: int
    sha256_map: dict[str, str]              # filename -> SHA-256 hex
    bpm_map: dict[str, float]               # filename -> detected BPM (0 = unknown)
    key_map: dict[str, KeyResult | None]    # filename -> KeyResult (with source label) or None
    elapsed_s: float
    playlists: dict[str, list[int]] = field(default_factory=dict)   # name -> track ids in order
    artwork_ids: dict[str, int] = field(default_factory=dict)       # filename -> artwork id (absent = none)
    report: dict[str, dict] = field(default_factory=dict)           # filename -> provenance/diagnostics
    excluded_tracks: list[str] = field(default_factory=list)        # filenames excluded when on_unresolved == "exclude"
    engine_report: dict | None = None                               # versioned engine-result contract (ENGINE_CONTRACT_VERSION)


class UnresolvedExportError(RuntimeError):
    """Raised when unresolved/failed tracks prevent a valid export under on_unresolved='stop' (or when all tracks are excluded)."""

    def __init__(self, message: str, *, report: dict[str, dict], engine_report: dict):
        super().__init__(message)
        self.report = report
        self.engine_report = engine_report


def _anlz_dirs(device_audio_path: str) -> tuple[str, str]:
    """Return (parent_hex3, child_hex8) for the USBANLZ path.

    Pioneer CDJs compute this from the USB-relative audio file path, ignoring
    the analyze_path field stored in the PDB. Algorithm confirmed against
    CDJ-2000NXS2 firmware 1.87 hardware evidence and fourfour source.
    """
    h = 0
    for c in device_audio_path:
        cu = ord(c) & 0xFFFF
        temp = (h * 0x5BC9 + cu) & 0xFFFFFFFF
        h = (temp * 0x93B5 + cu) & 0xFFFFFFFF
    r = h % 0x30D43  # reduce to [0, 200002]
    p = (((r >> 0) & 0x01) | ((r >> 1) & 0x02) | ((r >> 4) & 0x04) |
         ((r >> 4) & 0x08) | ((r >> 5) & 0x10) | ((r >> 8) & 0x20) |
         ((r >> 10) & 0x40))
    return f"P{p:03X}", f"{r:08X}"


def _device_audio_path(filename: str) -> str:
    return f"/Contents/{filename}"


def _device_anlz_path(device_audio_path: str) -> str:
    hi, lo = _anlz_dirs(device_audio_path)
    return f"/PIONEER/USBANLZ/{hi}/{lo}/ANLZ0000.DAT"


def _sha256(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def _add_artwork_row(ed: PdbEditor, art_id: int, path: str) -> None:
    s = encode_string(path)
    ed._append_row(TableType.ARTWORK, struct.pack("<I", art_id) + s, _align4(4 + len(s)))


def export_library(
    playlists: dict[str, Sequence[TrackSpec]],
    dest_dir: Path,
    *,
    analyse: bool = True,
    seed_path: Path | None = None,
    normalize_titles: bool = False,
    key_style: str = "camelot",
    analysis_from: Path | None = None,
    overrides_path: Path | None = None,
    rhythm_backend: str = "auto",
    refine_kick: bool = True,
    raw_cache: Path | None = None,
    reuse_raw: bool = False,
    link_audio_from: Path | None = None,
    refresh_waveforms: bool = False,
    effective_keys: "Mapping[str, dict | None] | None" = None,
    _allow_inconsistent_seed: bool = False,
    subcolumn_artist: bool = False,
    gridcheck: bool = False,
    on_unresolved: str | None = None,
    key_resolutions: "Mapping[str, dict] | None" = None,
    source_sha256_map: "Mapping[str, str] | None" = None,
    progress_callback: Callable[[str, str | None], None] | None = None,
) -> ExportResult:
    """Export one or more playlists to dest_dir as a Pioneer device library.

    Tracks are de-duplicated by resolved source path: a file listed in several
    playlists gets one track row, one audio copy and one ANLZ set. Playlist
    order is the order given. dest_dir must be an empty/non-existent local
    directory; it is never merged with prior output.

    gridcheck: OPT-IN (default False). When True and rhythm_backend == "beat_this",
    runs analysis.gridcheck.evaluate() on tracks rejected by the production consistency
    gate. Production-accepted grids (cons.status == "consistent") are preserved unchanged.
    Recovered grids (accept_audio_grid / accept_with_gaps) use the exact blind2 audio-period
    grid construction (anchor_s = gdec.phase_s % (60/bpm), no kick shift). Unaccepted tracks
    (needs_review / reject without a manual override) never have a diagnostic phase substituted.

    on_unresolved: how to handle tracks whose beat grid is unaccepted (needs_review / reject
    without manual anchor override) or whose rhythm analysis failed:
      - "stop" (default when gridcheck=True): stop BEFORE creating dest_dir or writing a
        partial library, and raise UnresolvedExportError carrying .report and .engine_report.
      - "exclude": exclude unresolved/failed tracks from the export, preserving the relative
        playlist order of all remaining eligible tracks and recording excluded_tracks. If 0
        eligible tracks remain, raises UnresolvedExportError before creating dest_dir.
      - "legacy_fallback" (default when gridcheck=False): preserve historical behaviour by
        falling back to the Fourier onset-phase grid and flagging the track needs_review.

    subcolumn_artist: kept for compatibility; the default seed (seed_v2.pdb) already includes the ARTIST sub-column. An explicit seed_path
    always wins (older exports are reproduced with their own seed).
    seed_path: default is src/set2go/data/seed_v2.pdb (sub-column byte + consistent table 19). The produced PDB is checked with
    pdbcheck.inconsistent_pages() and the export fails if any data page declares a different live-row count than its presence bitmap holds.

    refresh_waveforms: with analysis_from, keep the reused DAT (grids, PWAV, PWV2, cues) but REGENERATE the EXT file (PWV3/PWV5/PWV4) with the current
    waveform generator (waveform.compute_waveforms). Without it the reused EXT is copied unchanged.
    effective_keys: OPT-IN. {source file name: {"camelot", "name", "origin"} | None} from analysis.workflow.effective_key_map (manual > imported). A file name present
    in the mapping REPLACES the key for that track (None = no key, key_id 0); files not in the mapping, and the default (None), keep resolve_key() exactly as before.
    link_audio_from: an earlier export whose audio is hardlinked (only when its sha256 equals the source's) instead of
    copied, to save disk on rebuilds. Never links to the source files. Do not edit audio inside linked exports.

    reuse_raw: load raw Beat This! predictions from raw_cache when they record the same audio and checkpoint hashes
    (otherwise the model runs). Makes a rebuild reproducible without re-running the model.

    rhythm_backend: "auto" (default): "beat_this" when the optional environment + checkpoint exist (scripts/setup_beat_env.sh),
    otherwise "fourier"; the backend actually used is recorded per track in the report and sidecar. "fourier" = the
    desktop_v1/v2 analysis; "beat_this" requires the environment or raises. The hardware-tested configuration (desktop_v4_rhythm) is
    "beat_this" with refine_kick=True.

    analysis_from: an earlier export root. Its ANLZ files and PDB tempo values are
    reused byte-for-byte (matched by audio path + SHA-256 of the copied audio) so
    a candidate can change only PDB/seed generation. No analysis is run.

    overrides_path: JSON sidecar (see grid.py) with manual tempo / beat anchor /
    beat-one overrides. They replace the automatic grid in PQTZ and PDB tempo.
    A <out>_GRIDS.json sidecar (beside the export, never on the USB) with the
    automatic results is written when analysis runs.

    key_style: "camelot" stores "7A" in the PDB key table (as official
    rekordbox exports do); "musical" stores "D minor". The musical name and the
    key source are always kept in ExportResult.key_map.
    """
    from .analysis import contract as contract_mod
    from .waveform import _read_mono_float32 as _rd

    t0 = time.perf_counter()
    dest_dir = Path(dest_dir).resolve()
    if dest_dir.exists() and any(dest_dir.iterdir()):
        raise FileExistsError(f"{dest_dir} is not empty; export never overlays old output")

    if on_unresolved is None:
        on_unresolved = "stop" if gridcheck else "legacy_fallback"
    elif on_unresolved not in ("stop", "exclude", "legacy_fallback"):
        raise ValueError(f"unknown on_unresolved policy {on_unresolved!r}; expected 'stop', 'exclude', or 'legacy_fallback'")

    if rhythm_backend == "auto":
        rhythm_backend = "beat_this" if rhythm_mod.available() else "fourier"
    elif rhythm_backend not in ("fourier", "beat_this"):
        raise ValueError(f"unknown rhythm_backend {rhythm_backend!r}")

    overrides = load_overrides(overrides_path)
    reuse_pdb = None
    if analysis_from is not None:
        from rekordbox_pdb.pdb import Database
        reuse_pdb = {Path(t.file_path).name: t for t in
                     Database.from_file(Path(analysis_from) / "PIONEER/rekordbox/export.pdb").tracks}

    # ---- Phase 1: Deduplicate, analyse, and evaluate export eligibility BEFORE creating dest_dir ----
    names_seen: dict[str, Path] = {}
    unique_specs: list[tuple[Path, TrackSpec]] = []
    seen_srcs: set[Path] = set()
    for pl_name, specs in playlists.items():
        for spec in specs:
            src = Path(spec.wav_path).resolve()
            if names_seen.setdefault(src.name, src) != src:
                raise ValueError(f"two different sources share the filename {src.name}")
            if src not in seen_srcs:
                seen_srcs.add(src)
                unique_specs.append((src, spec))

    prepared: dict[Path, dict] = {}
    all_reports: dict[str, dict] = {}
    track_contracts: dict[str, dict] = {}

    for src, spec in unique_specs:
        if progress_callback is not None:
            progress_callback("track_started", src.name)
        sha = (
            (source_sha256_map or {}).get(src.name)
            or (source_sha256_map or {}).get(str(src))
            or _sha256(src)
        )
        meta = read_metadata(src)
        title = spec.title or meta.title
        if normalize_titles:
            title = strip_key_prefix(title)
        artist = spec.artist or meta.artist
        album = spec.album or meta.album
        genre = spec.genre or meta.genre

        sr, n_ch, n_frames = wav_info(src)
        duration_s = n_frames / sr
        dur_int = round(duration_s)

        bpm = 0.0
        ba = None
        beats: list[BeatEntry] = []
        waveform = None
        key_result: KeyResult | None = None
        grid: Grid | None = None
        grid_auto: dict | None = None
        reused_anlz: Path | None = None

        # Contract fields
        c_bpm_source = "none"
        c_model_slope_bpm: float | None = None
        c_tempo_disagree_bpm: float | None = None
        c_grid_status = "accepted_with_warnings"
        c_grid_decision = "unanalysed"
        c_grid_source = "none"
        c_grid_bpm: float | None = None
        c_grid_anchor_ms: float | None = None
        c_grid_kick_corr_ms: float | None = None
        c_grid_reasons: list[str] = []
        c_flagged_windows_s: list[list[float]] = []
        c_db_bar_origin: int | None = None
        c_db_status = "n/a"
        c_db_share: float | None = None
        c_db_review_req = True
        c_failures: dict[str, str] = {}

        # Key resolution: skip redundant resolve_key(src) when effective_keys already specifies this file
        has_eff_key_override = effective_keys is not None and src.name in effective_keys
        if has_eff_key_override:
            ek = effective_keys[src.name]
            key_result = (
                KeyResult(ek["name"], ek["camelot"], "user" if ek.get("origin") == "manual" else "tkey_frame")
                if ek else None
            )

        if reuse_pdb is not None:
            old = reuse_pdb[src.name]
            bpm = old.tempo / 100.0
            reused_anlz = Path(analysis_from) / old.analyze_path.lstrip("/")
            if not has_eff_key_override:
                key_result = resolve_key(src)
            c_bpm_source = "reused_pdb"
            c_grid_status = "accepted"
            c_grid_decision = "reused"
            c_grid_source = "reused"
            c_grid_bpm = bpm
            c_db_status = "reused"
            c_db_review_req = False
        elif analyse:
            mono_sr = _rd(src)
            mono_, sr_ = mono_sr
            ba = analyse_beats(src, mono_sr=mono_sr)
            bpm, beats = ba.bpm, ba.beats
            waveform = compute_waveforms(src, mono_sr=mono_sr)
            if not has_eff_key_override:
                key_result = resolve_key(src)
            man = manual_for(overrides, src.name, sha)

            if ba.bpm <= 0.0:
                c_failures["rhythm"] = "audio shorter than 10s or unreadable for tempo/beat analysis"
                c_grid_status = "failed"
                c_grid_decision = "failed"
                c_grid_source = "none"
                c_grid_reasons = [c_failures["rhythm"]]
                c_db_status = "unavailable (rhythm analysis failed)"
                c_db_review_req = True
            elif rhythm_backend == "beat_this":
                c_bpm_source = "fourier_tempogram"
                rc = Path(raw_cache) if raw_cache else dest_dir.parent / f"{dest_dir.name}_BEAT_THIS_RAW"
                if not rc.is_dir():
                    rc.mkdir(parents=True, exist_ok=True)
                raw = rhythm_mod.run_model(
                    src,
                    rc / f"{src.name}.json",
                    reuse=reuse_raw,
                    audio_sha256=sha,
                )
                if not gridcheck:
                    rr = rhythm_mod.build_rhythm(raw, ba.bpm, mono_, sr_, refine_kick)
                    c_model_slope_bpm = rr.consistency.model_slope_bpm
                    c_tempo_disagree_bpm = rr.consistency.tempo_disagree_bpm
                    if rr.anchor_s is not None:
                        grid_auto = {
                            "bpm": ba.bpm,
                            "anchor_ms": round(rr.anchor_s * 1000, 1),
                            "bar_origin": rr.bar_origin or 1,
                            "phase_status": "model_consistent",
                            "downbeat": rr.downbeat_status,
                            "backend": "beat_this",
                            "kick_corr_ms": rr.kick_corr_ms,
                            "downbeat_majority_share": rr.downbeat_majority_share,
                            "model_slope_bpm": round(rr.consistency.model_slope_bpm, 3),
                            "median_abs_residual_ms": round(rr.consistency.median_abs_residual_ms, 1),
                            "notes": rr.notes,
                        }
                        grid = effective_grid(grid_auto, man)
                        beats = beats_from_grid(grid, duration_s)
                        bpm = grid.bpm
                        c_flagged_windows_s = [list(w) for w in rr.consistency.bad_regions_s]
                        c_db_bar_origin = grid.bar_origin
                        c_db_status = grid.downbeat
                        c_db_share = rr.downbeat_majority_share
                        c_db_review_req = (grid.downbeat != "manual") and (
                            rr.downbeat_majority_share is None or rr.downbeat_majority_share < 0.90
                        )
                        c_grid_decision = "manual_override" if grid.source == "manual" else "production_accept"
                        c_grid_source = "manual_override" if grid.source == "manual" else "production_beat_this"
                        c_grid_bpm = grid.bpm
                        c_grid_anchor_ms = grid.anchor_ms
                        c_grid_kick_corr_ms = rr.kick_corr_ms if grid.source == "auto" else None
                        c_grid_status = (
                            "accepted_with_warnings"
                            if (c_flagged_windows_s or c_db_review_req)
                            else "accepted"
                        )
                    else:
                        # Production rejected (`cons.status != "consistent"`) with gridcheck=False
                        c_flagged_windows_s = [list(w) for w in rr.consistency.bad_regions_s]
                        c_grid_reasons = list(rr.consistency.reasons)
                        if man and "anchor_ms" in man:
                            grid_auto = {
                                "bpm": ba.bpm,
                                "anchor_ms": beats[0].time_ms if beats else 0.0,
                                "bar_origin": 1,
                                "phase_status": "model_inconsistent",
                                "downbeat": rr.downbeat_status,
                                "backend": "beat_this",
                                "reasons": rr.consistency.reasons,
                                "bad_regions_s": rr.consistency.bad_regions_s,
                            }
                            grid = effective_grid(grid_auto, man)
                            beats = beats_from_grid(grid, duration_s)
                            bpm = grid.bpm
                            c_db_bar_origin = grid.bar_origin
                            c_db_status = grid.downbeat
                            c_db_review_req = grid.downbeat != "manual"
                            c_grid_decision = "manual_override"
                            c_grid_source = "manual_override"
                            c_grid_bpm = grid.bpm
                            c_grid_anchor_ms = grid.anchor_ms
                            c_grid_status = "accepted_with_warnings" if c_db_review_req else "accepted"
                        elif on_unresolved == "legacy_fallback":
                            grid_auto = {
                                "bpm": ba.bpm,
                                "anchor_ms": beats[0].time_ms if beats else 0.0,
                                "bar_origin": 1,
                                "phase_status": "model_inconsistent",
                                "downbeat": rr.downbeat_status,
                                "backend": "beat_this",
                                "reasons": rr.consistency.reasons,
                                "bad_regions_s": rr.consistency.bad_regions_s,
                            }
                            grid = effective_grid(grid_auto, man)
                            beats = beats_from_grid(grid, duration_s)
                            bpm = grid.bpm
                            c_db_bar_origin = grid.bar_origin
                            c_db_status = grid.downbeat
                            c_db_review_req = True
                            c_grid_decision = "legacy_fourier_fallback"
                            c_grid_source = "fourier_fallback_unaccepted"
                            c_grid_bpm = grid.bpm
                            c_grid_anchor_ms = grid.anchor_ms
                            c_grid_status = "accepted_with_warnings"
                        else:
                            grid_auto = {
                                "bpm": ba.bpm,
                                "anchor_ms": None,
                                "bar_origin": 1,
                                "phase_status": "model_inconsistent",
                                "downbeat": rr.downbeat_status,
                                "backend": "beat_this",
                                "reasons": rr.consistency.reasons,
                                "bad_regions_s": rr.consistency.bad_regions_s,
                            }
                            grid = None
                            beats = []
                            c_db_bar_origin = None
                            c_db_status = rr.downbeat_status
                            c_db_review_req = True
                            c_grid_decision = "needs_review"
                            c_grid_source = "none"
                            c_grid_bpm = ba.bpm
                            c_grid_anchor_ms = None
                            c_grid_status = "needs_review"
                else:
                    # Opt-in gridcheck=True path
                    res_gc = contract_mod.resolve_rhythm_with_gridcheck(
                        raw,
                        ba.bpm,
                        duration_s,
                        mono=mono_,
                        sr=sr_,
                        refine_kick=refine_kick,
                        gridcheck=True,
                    )
                    rr = res_gc["rhythm_result"]
                    grid_auto = res_gc["grid_auto"]
                    c_model_slope_bpm = rr.consistency.model_slope_bpm
                    c_tempo_disagree_bpm = rr.consistency.tempo_disagree_bpm
                    c_flagged_windows_s = res_gc["flagged_windows_s"]
                    c_grid_reasons = res_gc["reasons"]

                    if res_gc["grid_accepted"]:
                        grid = effective_grid(grid_auto, man)
                        beats = beats_from_grid(grid, duration_s)
                        bpm = grid.bpm
                        c_db_bar_origin = grid.bar_origin
                        c_db_status = grid.downbeat
                        c_db_share = res_gc["downbeat_majority_share"]
                        if grid.source == "manual":
                            c_grid_decision = "manual_override"
                            c_grid_source = "manual_override"
                            c_db_review_req = grid.downbeat != "manual"
                            c_grid_kick_corr_ms = None
                        else:
                            c_grid_decision = res_gc["decision"]
                            c_grid_source = res_gc["grid_source_kind"]
                            c_db_review_req = (
                                c_db_share is None
                                or c_db_share < 0.90
                                or c_grid_decision in ("accept_audio_grid", "accept_with_gaps")
                            )
                            c_grid_kick_corr_ms = res_gc["kick_corr_ms"]
                        c_grid_bpm = grid.bpm
                        c_grid_anchor_ms = grid.anchor_ms
                        has_warn = (
                            c_grid_decision in ("accept_audio_grid", "accept_with_gaps")
                            or bool(c_flagged_windows_s)
                            or c_db_review_req
                        )
                        c_grid_status = "accepted_with_warnings" if has_warn else "accepted"
                    else:
                        # Unaccepted under both production and gridcheck (needs_review / reject)
                        if man and "anchor_ms" in man:
                            fallback_base = dict(grid_auto, anchor_ms=0.0)
                            grid = effective_grid(fallback_base, man)
                            beats = beats_from_grid(grid, duration_s)
                            bpm = grid.bpm
                            c_db_bar_origin = grid.bar_origin
                            c_db_status = grid.downbeat
                            c_db_review_req = grid.downbeat != "manual"
                            c_grid_decision = "manual_override"
                            c_grid_source = "manual_override"
                            c_grid_bpm = grid.bpm
                            c_grid_anchor_ms = grid.anchor_ms
                            if grid.source == "manual":
                                c_flagged_windows_s = []
                                c_tempo_disagree_bpm = None
                            c_grid_status = "accepted_with_warnings" if c_db_review_req else "accepted"
                        elif on_unresolved == "legacy_fallback":
                            fallback_auto = dict(grid_auto, anchor_ms=beats[0].time_ms if beats else 0.0)
                            grid = effective_grid(fallback_auto, man)
                            beats = beats_from_grid(grid, duration_s)
                            bpm = grid.bpm
                            c_db_bar_origin = grid.bar_origin
                            c_db_status = grid.downbeat
                            c_db_review_req = True
                            c_grid_decision = "legacy_fourier_fallback"
                            c_grid_source = "fourier_fallback_unaccepted"
                            c_grid_bpm = grid.bpm
                            c_grid_anchor_ms = grid.anchor_ms
                            c_grid_status = "accepted_with_warnings"
                        else:
                            # Never substitute diagnostic gdec.phase_s or Fourier fallback
                            grid = None
                            beats = []
                            c_db_bar_origin = None
                            c_db_status = res_gc["downbeat_status"]
                            c_db_share = None
                            c_db_review_req = True
                            c_grid_decision = res_gc["decision"]
                            c_grid_source = "none"
                            c_grid_bpm = ba.bpm
                            c_grid_anchor_ms = None
                            c_grid_status = "rejected" if res_gc["decision"] == "reject" else "needs_review"
            elif ba.phase and beats:
                c_bpm_source = "fourier_tempogram"
                grid_auto = {
                    "bpm": ba.bpm,
                    "anchor_ms": beats[0].time_ms,
                    "bar_origin": beats[0].beat_number,
                    "phase_status": ba.phase.status,
                    "downbeat": ba.downbeat,
                    "kick_conf": round(ba.phase.kick_conf, 2),
                    "hat_conf": round(ba.phase.hat_conf, 2),
                    "band_gap_ms": round(ba.phase.band_gap_ms, 1),
                }
                grid = effective_grid(grid_auto, man)
                beats = beats_from_grid(grid, duration_s)
                bpm = grid.bpm
                c_db_bar_origin = grid.bar_origin
                c_db_status = grid.downbeat
                c_db_review_req = grid.downbeat != "manual"
                c_grid_decision = "manual_override" if grid.source == "manual" else "fourier_phase"
                c_grid_source = "manual_override" if grid.source == "manual" else "fourier_phase"
                c_grid_bpm = grid.bpm
                c_grid_anchor_ms = grid.anchor_ms
                c_grid_status = "accepted_with_warnings" if c_db_review_req or ba.phase.status == "uncertain" else "accepted"

            # Release decoded mono float32 array immediately once per-track DSP finishes
            mono_sr = None
            mono_ = None

        # Assemble key resolution metadata for the engine contract
        if key_resolutions is not None and src.name in key_resolutions:
            kr_entry = key_resolutions[src.name]
            kr_dict = kr_entry.get("key") or kr_entry
            kr_reviews = kr_entry.get("review") or ()
            for fk, fv in (kr_entry.get("failures") or {}).items():
                c_failures[f"key:{fk}"] = fv
        else:
            if has_eff_key_override:
                ek = effective_keys[src.name]
                eff = {"camelot": ek["camelot"], "name": ek["name"]} if ek else None
                orig = ek.get("origin") if ek else None
                sel_pred = (
                    {"backend": ek["backend"], "value": ek["name"]}
                    if (ek and orig == "predicted" and ek.get("backend"))
                    else None
                )
                kr_dict = {
                    "effective": eff,
                    "effective_origin": orig,
                    "selected_prediction": sel_pred,
                    "layers": {
                        "manual": eff if orig == "manual" else None,
                        "imported": {"value": ek["name"], "provenance": ek.get("provenance", "tag_plain")}
                        if (ek and orig == "imported")
                        else None,
                        "predicted": {ek["backend"]: ek["name"]}
                        if (ek and orig == "predicted" and ek.get("backend"))
                        else None,
                    },
                }
            elif key_result is not None:
                orig = (
                    "manual"
                    if key_result.source == "user"
                    else ("imported" if key_result.source == "tkey_frame" else "predicted")
                )
                eff = {"camelot": key_result.camelot, "name": key_result.key_name}
                kr_dict = {
                    "effective": eff,
                    "effective_origin": orig,
                    "selected_prediction": {"backend": "libkeyfinder", "value": key_result.key_name}
                    if orig == "predicted"
                    else None,
                    "layers": {
                        "manual": eff if orig == "manual" else None,
                        "imported": {"value": key_result.key_name, "provenance": "tag_plain"}
                        if orig == "imported"
                        else None,
                        "predicted": {"libkeyfinder": key_result.key_name} if orig == "predicted" else None,
                    },
                }
            else:
                kr_dict = {
                    "effective": None,
                    "effective_origin": None,
                    "selected_prediction": None,
                    "layers": {"manual": None, "imported": None, "predicted": None},
                }
            kr_reviews = ()

        if grid is not None and grid.source in ("manual", "mixed") and "bpm" in (manual_for(overrides, src.name, sha) or {}):
            c_bpm_source = "manual_override"

        beat_phase_summary = (
            {
                "status": ba.phase.status,
                "phase_ms": round(ba.phase.phase_s * 1000, 1),
                "kick_conf": round(ba.phase.kick_conf, 2),
                "hat_conf": round(ba.phase.hat_conf, 2),
                "band_gap_ms": round(ba.phase.band_gap_ms, 1),
            }
            if ba is not None and ba.phase
            else None
        )
        drift_ms_summary = ba.drift_ms if ba is not None else None
        ba = None

        tr_report = {
            "track_id": None,
            "title": title,
            "artist": artist,
            "album": album,
            "label": meta.label,
            "source": meta.sources,
            "bpm": bpm,
            "bpm_tag": meta.bpm_tag,
            "key": str(key_result) if key_result else None,
            "artwork_id": 0,
            "grid_auto": grid_auto,
            "grid_source": grid.source if grid else ("reused" if reused_anlz else None),
            "grid_review": grid.review if grid else ("needs_review" if analyse else None),
            "rhythm_backend": rhythm_backend if analyse and reused_anlz is None else None,
            "beat_phase": beat_phase_summary,
            "downbeat": (grid.downbeat if grid else "n/a"),
            "drift_ms": drift_ms_summary,
        }
        all_reports[src.name] = tr_report

        track_contracts[src.name] = contract_mod.build_track_contract(
            filename=src.name,
            source_path=src,
            sha256=sha,
            duration_s=duration_s,
            sample_rate=sr,
            bpm_value=bpm if bpm > 0 else None,
            bpm_source=c_bpm_source,
            model_slope_bpm=c_model_slope_bpm,
            tempo_disagree_bpm=c_tempo_disagree_bpm,
            key_resolution=kr_dict,
            key_review_items=kr_reviews,
            grid_status=c_grid_status,
            grid_decision=c_grid_decision,
            grid_source=c_grid_source,
            grid_bpm=c_grid_bpm,
            grid_anchor_ms=c_grid_anchor_ms,
            grid_kick_corr_ms=c_grid_kick_corr_ms,
            grid_reasons=c_grid_reasons,
            flagged_windows_s=c_flagged_windows_s,
            downbeat_bar_origin=c_db_bar_origin,
            downbeat_status=c_db_status,
            downbeat_majority_share=c_db_share,
            downbeat_review_required=c_db_review_req,
            failures=c_failures,
            exported=False,
            excluded=False,
        )

        # Retain only compact metadata and serialized payloads required in Phase 2
        prepared[src] = {
            "sha": sha,
            "meta": meta,
            "title": title,
            "artist": artist,
            "album": album,
            "genre": genre,
            "sr": sr,
            "n_ch": n_ch,
            "dur_int": dur_int,
            "bpm": bpm,
            "beats": beats,
            "waveform": waveform,
            "key_result": key_result,
            "reused_anlz": reused_anlz,
            "report": tr_report,
        }

        if progress_callback is not None:
            progress_callback("track_completed", src.name)

    if progress_callback is not None:
        progress_callback("batch_finalizing", None)

    # Evaluate export eligibility and apply on_unresolved policy BEFORE creating dest_dir
    playlists_requested = {
        pl_name: [Path(sp.wav_path).resolve().name for sp in specs]
        for pl_name, specs in playlists.items()
    }
    policy_summary = {
        "rhythm_backend": rhythm_backend if analyse and reuse_pdb is None else ("reused" if reuse_pdb is not None else "none"),
        "gridcheck": bool(gridcheck),
        "refine_kick": bool(refine_kick),
        "on_unresolved": on_unresolved,
    }
    ineligible_names = [
        name for name, tc in track_contracts.items() if not tc["export_eligibility"]["eligible"]
    ]
    excluded_tracks: list[str] = []

    if on_unresolved == "stop" and ineligible_names:
        engine_report = contract_mod.build_engine_report(
            track_contracts,
            policy=policy_summary,
            export_status="blocked_unresolved",
            playlists_requested=playlists_requested,
            playlists_exported={pl_name: [] for pl_name in playlists},
            excluded_tracks=[],
        )
        raise UnresolvedExportError(
            f"export stopped before writing library: {len(ineligible_names)} unresolved/failed track(s): {', '.join(ineligible_names)}",
            report=all_reports,
            engine_report=engine_report,
        )
    elif on_unresolved == "exclude":
        excluded_tracks = list(ineligible_names)
        excluded_set = set(excluded_tracks)
        filtered_playlists = {
            pl_name: [sp for sp in specs if Path(sp.wav_path).resolve().name not in excluded_set]
            for pl_name, specs in playlists.items()
        }
        if unique_specs and len(excluded_set) == len(unique_specs):
            for name, tc in track_contracts.items():
                tc["export_eligibility"]["excluded"] = True
                tc["export_eligibility"]["exported"] = False
            engine_report = contract_mod.build_engine_report(
                track_contracts,
                policy=policy_summary,
                export_status="blocked_unresolved",
                playlists_requested=playlists_requested,
                playlists_exported={pl_name: [] for pl_name in playlists},
                excluded_tracks=excluded_tracks,
            )
            raise UnresolvedExportError(
                f"export stopped before writing library: all {len(excluded_tracks)} selected track(s) were unresolved/excluded",
                report=all_reports,
                engine_report=engine_report,
            )
        for name, tc in track_contracts.items():
            if name in excluded_set:
                tc["export_eligibility"]["excluded"] = True
                tc["export_eligibility"]["exported"] = False
            else:
                tc["export_eligibility"]["excluded"] = False
                tc["export_eligibility"]["exported"] = True
    else:
        filtered_playlists = playlists
        for tc in track_contracts.values():
            tc["export_eligibility"]["excluded"] = False
            tc["export_eligibility"]["exported"] = True

    # ---- Phase 2: Write Pioneer library to dest_dir ----
    dest_dir.mkdir(parents=True, exist_ok=True)
    pioneer_dir = dest_dir / "PIONEER"
    rekordbox_dir = pioneer_dir / "rekordbox"
    usbanlz_dir = pioneer_dir / "USBANLZ"
    contents_dir = dest_dir / "Contents"
    for d in (rekordbox_dir, usbanlz_dir, contents_dir):
        d.mkdir(parents=True, exist_ok=True)

    pdb_path = rekordbox_dir / "export.pdb"
    if seed_path is None:
        seed_path = (
            _DEFAULT_SEED_PDB
            if _DEFAULT_SEED_PDB.exists()
            else (_SEED_PDB.with_name("subcol_seed.pdb") if subcolumn_artist else _SEED_PDB)
        )
    shutil.copy2(seed_path, pdb_path)
    ed = PdbEditor.from_file(pdb_path)

    sha256_map: dict[str, str] = {}
    bpm_map: dict[str, float] = {}
    key_map: dict[str, KeyResult | None] = {}
    artwork_ids: dict[str, int] = {}
    report: dict[str, dict] = {}
    by_src: dict[Path, int] = {}
    track_ids: list[int] = []
    art_by_hash: dict[str, int] = {}
    next_art = 1

    for pl_name, specs in filtered_playlists.items():
        for spec in specs:
            src = Path(spec.wav_path).resolve()
            if src in by_src:
                continue
            p = prepared.pop(src)
            sha = p["sha"]
            meta = p["meta"]
            bpm = p["bpm"]
            key_result = p["key_result"]
            reused_anlz = p["reused_anlz"]
            beats = p["beats"]
            waveform = p["waveform"]
            sr = p["sr"]
            n_ch = p["n_ch"]
            dur_int = p["dur_int"]

            sha256_map[src.name] = sha
            bpm_map[src.name] = bpm
            key_map[src.name] = key_result

            dest_audio = contents_dir / src.name
            linked = Path(link_audio_from) / "Contents" / src.name if link_audio_from else None
            if linked is not None and linked.is_file() and _sha256(linked) == sha:
                os.link(linked, dest_audio)      # disk-saving rebuilds from a VERIFIED earlier export; never links to the source
            else:
                shutil.copy2(src, dest_audio)
            if _sha256(dest_audio) != sha:
                raise RuntimeError(f"SHA-256 mismatch after copy: {src.name}")

            art_id = 0
            if meta.artwork:
                digest = hashlib.sha256(meta.artwork).hexdigest()
                if digest not in art_by_hash:
                    art_path = write_artwork(pioneer_dir / "Artwork", next_art, meta.artwork)
                    _add_artwork_row(ed, next_art, art_path)
                    art_by_hash[digest] = next_art
                    next_art += 1
                art_id = art_by_hash[digest]
                artwork_ids[src.name] = art_id

            device_path = _device_audio_path(src.name)
            key_name = None
            if key_result:
                key_name = key_result.camelot if key_style == "camelot" else key_result.key_name

            tid = ed.add_track(
                title=p["title"],
                file_path=device_path,
                filename=src.name,
                artist=p["artist"] or None,
                album=p["album"] or None,
                genre=p["genre"] or None,
                label=meta.label or None,
                key=key_name,
                tempo=round(bpm * 100) if bpm else 0,
                duration=dur_int,
                year=meta.year,
                bitrate=round(sr * 16 * n_ch / 1000),
                sample_rate=sr,
                sample_depth=16,
                file_size=src.stat().st_size,
                analyze_path=_device_anlz_path(device_path),
                artwork_id=art_id,
            )
            by_src[src] = tid
            track_ids.append(tid)
            tr_rep = dict(p["report"])
            tr_rep["track_id"] = tid
            tr_rep["artwork_id"] = art_id
            report[src.name] = tr_rep

            hi, lo = _anlz_dirs(device_path)
            anlz_dir = usbanlz_dir / hi / lo
            if reused_anlz is not None:
                for ext in ("DAT", "EXT"):
                    (anlz_dir).mkdir(parents=True, exist_ok=True)
                    if ext == "EXT" and refresh_waveforms:
                        write_ext(anlz_dir / "ANLZ0000.EXT", device_path, compute_waveforms(src))
                        continue
                    shutil.copy2(reused_anlz.with_suffix("." + ext), anlz_dir / f"ANLZ0000.{ext}")
            elif analyse:
                write_dat(anlz_dir / "ANLZ0000.DAT", device_path, beats, waveform)
                if waveform is not None:
                    write_ext(anlz_dir / "ANLZ0000.EXT", device_path, waveform)

    pl_ids: dict[str, list[int]] = {}
    first_pid = 0
    for pl_name, specs in filtered_playlists.items():
        pid = ed.create_playlist(pl_name)
        first_pid = first_pid or pid
        ids = [by_src[Path(sp.wav_path).resolve()] for sp in specs]
        for i, tid in enumerate(ids, start=1):
            ed.add_to_playlist(pid, tid, entry_index=i)
        pl_ids[pl_name] = ids

    ed.save(pdb_path)
    _bad = inconsistent_pages(pdb_path.read_bytes())
    if _bad and not _allow_inconsistent_seed:
        raise RuntimeError(f"export.pdb has pages whose declared row count disagrees with the presence bitmap: {_bad[:4]}")
    if any(r.get("grid_auto") for r in report.values()):
        write_sidecar(dest_dir.parent / f"{dest_dir.name}_GRIDS.json", report, sha256_map, overrides)

    playlists_exported = {
        pl_name: [Path(sp.wav_path).resolve().name for sp in specs]
        for pl_name, specs in filtered_playlists.items()
    }
    engine_report = contract_mod.build_engine_report(
        track_contracts,
        policy=policy_summary,
        export_status="exported",
        playlists_requested=playlists_requested,
        playlists_exported=playlists_exported,
        excluded_tracks=excluded_tracks,
    )

    return ExportResult(
        dest_dir=dest_dir,
        pdb_path=pdb_path,
        track_ids=track_ids,
        playlist_id=first_pid,
        sha256_map=sha256_map,
        bpm_map=bpm_map,
        key_map=key_map,
        elapsed_s=time.perf_counter() - t0,
        playlists=pl_ids,
        artwork_ids=artwork_ids,
        report=report,
        excluded_tracks=excluded_tracks,
        engine_report=engine_report,
    )


def export(
    tracks: Sequence[TrackSpec],
    playlist_name: str,
    dest_dir: Path,
    *,
    analyse: bool = True,
    seed_path: Path | None = None,
) -> ExportResult:
    """Single-playlist convenience wrapper around export_library()."""
    return export_library({playlist_name: list(tracks)}, dest_dir,
                          analyse=analyse, seed_path=seed_path)
