"""Regression tests for the Pioneer ANLZ path hash algorithm.

All expected values are verified against external evidence FIRST:
CDJ hardware observation or official rekordbox output. None are computed
from our own implementation and then used as expected values.

Source provenance tags:
  [CDJ] = directory created by CDJ-2000NXS2 firmware 1.87 during a hardware test
  [RB]  = directory in official rekordbox export (reference/rekordbox_official/)

diag_e baseline: CDJ-2000NXS2 firmware 1.87, serial REMP013618CC, 2026-10-28.
PASS: immediate overview, detail waveform, seeking. Known defects: white color, BPM +2.
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from set2go.export import _anlz_dirs, _device_anlz_path


# ---------------------------------------------------------------------------
# Hardware-verified vectors
# Each: (device_audio_path, expected_P_dir, expected_lo_dir, provenance)
# device_audio_path is the exact string from the PDB file_path column and the
# ANLZ PPTH section — these must match for CDJ to accept the ANLZ file.
# ---------------------------------------------------------------------------

VECTORS = [
    # --- Flat audio paths: CDJ created these directories during hardware tests ---
    # diag_e PASS 2026-10-28: CDJ loaded waveforms from our ANLZ at these paths.
    (
        "/Contents/Earth n Days - Make It High (Extended Mix) [Toolroom Trax].aiff",
        "P03A", "0002FBAC",
        "[CDJ] diag_e PASS / flat path — CDJ-2000NXS2 fw 1.87",
    ),
    (
        "/Contents/Snoop Dogg, HUGEL - H.O.U.S.E (Extended Mix) [Make The Girls Dance Records].aiff",
        "P00D", "000005F3",
        "[CDJ] diag_e PASS / flat path — CDJ-2000NXS2 fw 1.87",
    ),
    (
        "/Contents/Zsak - The Dancefloor (Extended Mix) [There Was Jack].aif",
        "P03C", "000076D8",
        "[CDJ] diag_e PASS / flat path — CDJ-2000NXS2 fw 1.87",
    ),

    # --- Official rekordbox nested paths (from reference/rekordbox_official/) ---
    # The file_path values below are exactly what rekordbox wrote to the PDB;
    # some are truncated by rekordbox for long filenames (observed, not our bug).
    (
        "/Contents/Earth n Days/Make It High/Earth n Days - Make It High (Extended Mix) .aiff",
        "P00E", "000254CE",
        "[RB] rekordbox_official USBANLZ/P00E/000254CE",
    ),
    (
        "/Contents/Snoop Dogg, HUGEL/H.O.U.S.E (Extended Mix)/Snoop Dogg, HUGEL - H.O.U.S.E (Extended Mix.aiff",
        "P010", "00029208",
        "[RB] rekordbox_official USBANLZ/P010/00029208",
    ),
    (
        "/Contents/Zsak/Zsak - The Dancefloor/Zsak - The Dancefloor (Extended Mix) [There .aif",
        "P074", "0001EA48",
        "[RB] rekordbox_official USBANLZ/P074/0001EA48",
    ),
]


@pytest.mark.parametrize("device_path,expected_hi,expected_lo,note", VECTORS)
def test_anlz_dirs(device_path, expected_hi, expected_lo, note):
    hi, lo = _anlz_dirs(device_path)
    assert hi == expected_hi, (
        f"P-dir mismatch for {device_path!r}\n"
        f"  expected: {expected_hi}  got: {hi}\n"
        f"  source: {note}"
    )
    assert lo == expected_lo, (
        f"lo-dir mismatch for {device_path!r}\n"
        f"  expected: {expected_lo}  got: {lo}\n"
        f"  source: {note}"
    )


def test_anlz_path_format():
    """device_anlz_path assembles the full USB-relative ANLZ path."""
    p = "/Contents/Earth n Days - Make It High (Extended Mix) [Toolroom Trax].aiff"
    expected = "/PIONEER/USBANLZ/P03A/0002FBAC/ANLZ0000.DAT"
    assert _device_anlz_path(p) == expected


def test_anlz_dirs_deterministic():
    """Same input always produces the same output."""
    p = "/Contents/Earth n Days - Make It High (Extended Mix) [Toolroom Trax].aiff"
    assert _anlz_dirs(p) == _anlz_dirs(p)


def test_distinct_paths_produce_distinct_dirs():
    """All 6 hardware-verified paths hash to distinct directories (no collisions)."""
    seen = set()
    for path, _, _, _ in VECTORS:
        key = _anlz_dirs(path)
        assert key not in seen, f"Hash collision for {path}"
        seen.add(key)


def test_p_dir_range():
    """P-directory must be P000–P07F (7 non-contiguous bits, max 127 = 0x7F)."""
    for path, _, _, _ in VECTORS:
        hi, _ = _anlz_dirs(path)
        p_val = int(hi[1:], 16)
        assert 0 <= p_val <= 0x7F, f"P-dir {hi} out of [P000, P07F] for {path}"


def test_lo_dir_is_8_hex_digits():
    """lo-dir is always an 8-digit uppercase hex string."""
    import re
    for path, _, _, _ in VECTORS:
        _, lo = _anlz_dirs(path)
        assert re.fullmatch(r"[0-9A-F]{8}", lo), f"lo-dir bad format for {path}: {lo}"
