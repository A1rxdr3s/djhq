"""ANLZ .DAT and .EXT file writer for Pioneer CDJ device libraries.

All multi-byte integers are big-endian (the format's byte order).

DAT sections: PPTH, PQTZ, PWAV (400), PWV2 (100), PCOB×2
EXT sections: PPTH, PWV3 (150fps), PWV5 (150fps), PWV4 (1200)

Reference DAT also includes PVBR, PCOB×2 in EXT, PCO2×2, [PQT2], PSSI — not yet generated.

References: Deep Symmetry crate-digger rekordbox_anlz.ksy,
            dylanljones/pyrekordbox anlz/structs.py and tags.py.
"""

from __future__ import annotations

import struct
from dataclasses import dataclass, field
from pathlib import Path
from typing import Sequence

from .waveform import WaveformData


@dataclass
class BeatEntry:
    beat_number: int   # 1-4, position within bar
    tempo_bpm100: int  # BPM * 100 (e.g. 12800 = 128.00 BPM)
    time_ms: int       # milliseconds from track start


def _tag(fourcc: str, len_header: int, body: bytes) -> bytes:
    len_tag = 12 + len(body)
    return fourcc.encode("ascii") + struct.pack(">II", len_header, len_tag) + body


# ---------------------------------------------------------------------------
# Shared sections
# ---------------------------------------------------------------------------

def _ppth_tag(device_audio_path: str) -> bytes:
    """PPTH — path to audio file, UTF-16BE encoded."""
    encoded = device_audio_path.encode("utf-16-be")
    len_path = len(encoded) + 2  # +2 for null terminator
    body = struct.pack(">I", len_path) + encoded + b"\x00\x00"
    return _tag("PPTH", 16, body)


def _pqtz_tag(beats: Sequence[BeatEntry]) -> bytes:
    """PQTZ — beat grid."""
    entries = b"".join(
        struct.pack(">HHI", b.beat_number, b.tempo_bpm100, b.time_ms)
        for b in beats
    )
    body = struct.pack(">III", 0, 0x00080000, len(beats)) + entries
    return _tag("PQTZ", 24, body)


def _pcob_tag(memory: bool = True) -> bytes:
    """PCOB — cue list (empty)."""
    cue_type = 0 if memory else 1
    body = struct.pack(">IHHI", cue_type, 0, 0, 0)
    return _tag("PCOB", 24, body)


# ---------------------------------------------------------------------------
# DAT waveform sections
# ---------------------------------------------------------------------------

def _pwav_tag(entries: bytes) -> bytes:
    """PWAV — 400-entry waveform preview (overview, small bar)."""
    assert len(entries) == 400
    body = struct.pack(">II", 400, 0x00010000) + entries
    return _tag("PWAV", 20, body)


def _pwv2_tag(entries: bytes) -> bytes:
    """PWV2 — 100-entry tiny waveform preview."""
    assert len(entries) == 100
    body = struct.pack(">II", 100, 0x00010000) + entries
    return _tag("PWV2", 20, body)


# ---------------------------------------------------------------------------
# EXT waveform sections
# ---------------------------------------------------------------------------

def _pwv3_tag(n_entries: int, entries: bytes) -> bytes:
    """PWV3 — monochrome waveform detail (150fps, 1 byte/entry)."""
    assert len(entries) == n_entries
    body = struct.pack(">III", 1, n_entries, 0x00960000) + entries
    return _tag("PWV3", 24, body)


def _pwv4_tag(entries_raw: bytes) -> bytes:
    """PWV4 — color waveform overview (1200 × 6 bytes, fixed)."""
    assert len(entries_raw) == 1200 * 6
    body = struct.pack(">III", 6, 1200, 0x00000000) + entries_raw
    return _tag("PWV4", 24, body)


def _pwv5_tag(n_entries: int, entries: bytes) -> bytes:
    """PWV5 — color waveform detail (150fps, 2 bytes/entry BE)."""
    assert len(entries) == n_entries * 2
    body = struct.pack(">III", 2, n_entries, 0x00960305) + entries
    return _tag("PWV5", 24, body)


# ---------------------------------------------------------------------------
# File builders
# ---------------------------------------------------------------------------

def _anlz_header(body: bytes) -> bytes:
    """Prepend the PMAI file header."""
    len_file = 28 + len(body)
    return b"PMAI" + struct.pack(">II", 28, len_file) + bytes(16)


def build_dat(
    device_audio_path: str,
    beats: Sequence[BeatEntry] = (),
    waveform: WaveformData | None = None,
) -> bytes:
    """Return the bytes of an ANLZ0000.DAT file."""
    ppth  = _ppth_tag(device_audio_path)
    pqtz  = _pqtz_tag(beats)
    pwav  = _pwav_tag(waveform.pwav) if waveform else b""
    pwv2  = _pwv2_tag(waveform.pwv2) if waveform else b""
    pcob_mem = _pcob_tag(memory=True)
    pcob_hot = _pcob_tag(memory=False)

    body = ppth + pqtz + pwav + pwv2 + pcob_mem + pcob_hot
    return _anlz_header(body) + body


def build_ext(
    device_audio_path: str,
    waveform: WaveformData,
) -> bytes:
    """Return the bytes of an ANLZ0000.EXT file.

    Section order matches the reference rekordbox export:
    PPTH → PWV3 → PWV5 → PWV4
    """
    ppth = _ppth_tag(device_audio_path)
    pwv3 = _pwv3_tag(waveform.n_detail, waveform.pwv3)
    pwv5 = _pwv5_tag(waveform.n_detail, waveform.pwv5)
    pwv4 = _pwv4_tag(waveform.pwv4)

    body = ppth + pwv3 + pwv5 + pwv4
    return _anlz_header(body) + body


def write_dat(
    path: Path,
    device_audio_path: str,
    beats: Sequence[BeatEntry] = (),
    waveform: WaveformData | None = None,
) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(build_dat(device_audio_path, beats, waveform))


def write_ext(
    path: Path,
    device_audio_path: str,
    waveform: WaveformData,
) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(build_ext(device_audio_path, waveform))
