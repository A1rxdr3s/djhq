#!/usr/bin/env python3
"""Waveform experiment candidate: ONLY the PWV3 + PWV5 detail sections of three tracks are regenerated (waveform_v2); nothing else changes.

    uv run scripts/make_waveform_candidate.py <baseline_export> <out_dir> [--whiteness-zero]

Baseline must contain the three reference tracks. Output is a 3-track export (PDB rows for the other seven tracks are NOT removed, so the
output reuses the baseline PDB and keeps all ten tracks' files hardlinked) -- EXT files of the three tracks are written as NEW files, never
modified in place (the baseline's files are hardlinked into other trees). DAT files (beat grids, PWAV, PWV2) and PWV4 are unchanged.
PWV3 whiteness bits: derived from the low-band share (waveform_v2.detail_v2, structure-derived and unvalidated) unless --whiteness-zero reproduces the
earlier experiment (desktop_v8_waveform wrote 0). The baseline may be any export containing the three reference tracks (desktop_v12_full is the hardware-validated one).
Experimental: no hardware result. Do not combine with the artist/PDB experiments.
"""
import os
import shutil
import struct
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))
from set2go import waveform_v2 as W
from set2go.anlz_writer import _pwv3_tag, _pwv5_tag
from set2go.waveform import _read_mono_float32
from rekordbox_pdb.pdb import Database

TARGETS = ("Earth", "Snoop", "Zsak")


def sections(d: bytes):
    off = struct.unpack_from(">I", d, 4)[0]
    out = []
    while off < len(d):
        lh, lt = struct.unpack_from(">II", d, off + 4)
        out.append((d[off:off + 4], d[off:off + lt]))
        off += lt
    return out


def main() -> int:
    base, out = Path(sys.argv[1]).resolve(), Path(sys.argv[2]).resolve()
    if out.exists():
        sys.exit(f"{out} exists")
    db = Database.from_file(base / "PIONEER/rekordbox/export.pdb")
    redo = {Path(t.analyze_path).parent.relative_to("/").as_posix(): t for t in db.tracks if t.filename.startswith(TARGETS)}
    assert len(redo) == 3
    for f in sorted(base.rglob("*")):
        if not f.is_file() or f.name == ".DS_Store":
            continue
        rel = f.relative_to(base)
        dst = out / rel
        dst.parent.mkdir(parents=True, exist_ok=True)
        key = rel.parent.as_posix()
        if f.name == "ANLZ0000.EXT" and key in redo:
            t = redo[key]
            mono, sr = _read_mono_float32(ROOT / "test-tracks" / t.filename)
            d = W.detail_v2(mono, sr)
            n = len(d.height)
            pwv3 = _pwv3_tag(n, W.pack_pwv3(d, derive_whiteness="--whiteness-zero" not in sys.argv))
            pwv5 = _pwv5_tag(n, W.pack_pwv5(d))
            old = f.read_bytes()
            body = b"".join(pwv3 if tag == b"PWV3" else pwv5 if tag == b"PWV5" else blob for tag, blob in sections(old))
            hdr = bytearray(old[:28]); struct.pack_into(">I", hdr, 8, 28 + len(body))
            dst.write_bytes(bytes(hdr) + body)                                       # NEW file; baseline untouched
            print(f"  regenerated PWV3+PWV5 for {t.filename[:34]} ({n} frames)")
        else:
            try:
                os.link(f, dst)
            except OSError:
                shutil.copy2(f, dst)
    print("built", out)
    return 0


if __name__ == "__main__":
    sys.exit(main())
