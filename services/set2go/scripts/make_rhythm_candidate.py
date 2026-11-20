#!/usr/bin/env python3
"""Build a rhythm-experiment candidate: a hardware-tested baseline export with ONLY the beat grid (PQTZ) replaced.

    uv run scripts/make_rhythm_candidate.py <baseline_export> <grid_source_export> <out_dir> [--tempo-from-grid]

Everything except the PQTZ section of each ANLZ0000.DAT is taken from <baseline_export> byte-for-byte (audio and artwork are
hardlinked, so no extra disk is used; hardlinked baseline files are never modified: DAT/PDB files are rewritten as new files).
The PQTZ section comes from <grid_source_export> for the same track. DAT section lengths are recomputed; PWAV/PWV2/PCOB and
all EXT files remain identical. The PDB keeps the baseline's rows except track tempo (set from the grid source BPM)
when --tempo-from-grid is given; the diff is reported.
"""
import os
import shutil
import struct
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))


def sections(d: bytes):
    off = struct.unpack_from(">I", d, 4)[0]
    out = []
    while off < len(d):
        lh, lt = struct.unpack_from(">II", d, off + 4)
        out.append((d[off:off + 4], d[off:off + lt]))
        off += lt
    return out


def swap_pqtz(base_dat: bytes, grid_dat: bytes) -> bytes:
    grid_pqtz = next(b for t, b in sections(grid_dat) if t == b"PQTZ")
    body = b"".join(grid_pqtz if t == b"PQTZ" else b for t, b in sections(base_dat))
    hdr = bytearray(base_dat[:28])
    struct.pack_into(">I", hdr, 8, 28 + len(body))
    return bytes(hdr) + body


def link_or_copy(src: Path, dst: Path):
    dst.parent.mkdir(parents=True, exist_ok=True)
    try:
        os.link(src, dst)
    except OSError:
        shutil.copy2(src, dst)


def main() -> int:
    base, grid, out = (Path(a).resolve() for a in sys.argv[1:4])
    if out.exists():
        sys.exit(f"{out} exists")
    n_swapped = 0
    for f in sorted(base.rglob("*")):
        if not f.is_file() or f.name == ".DS_Store":
            continue
        rel = f.relative_to(base)
        if f.name == "ANLZ0000.DAT":
            (out / rel).parent.mkdir(parents=True, exist_ok=True)
            (out / rel).write_bytes(swap_pqtz(f.read_bytes(), (grid / rel).read_bytes()))
            n_swapped += 1
        elif f.name == "export.pdb" and "--tempo-from-grid" in sys.argv:
            from rekordbox_pdb.edit import PdbEditor
            from rekordbox_pdb.pdb import Database
            (out / rel).parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(f, out / rel)                      # new file; baseline untouched
            g = {t.filename: t.tempo for t in Database.from_file(grid / rel).tracks}
            ed = PdbEditor.from_file(out / rel)
            for t in ed.db.tracks:
                if t.tempo != g[t.filename]:
                    ed.set_track_field(t.id, "tempo", g[t.filename])
                    print(f"  PDB tempo {t.filename[:30]}: {t.tempo} -> {g[t.filename]}")
            ed.save(out / rel)
        else:
            link_or_copy(f, out / rel)
    print(f"built {out}: {n_swapped} PQTZ sections replaced from {grid.name}; all else from {base.name}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
