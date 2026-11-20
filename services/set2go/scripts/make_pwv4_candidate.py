#!/usr/bin/env python3
"""PWV4 (colour overview) candidate v16: base = the accepted v13 tree; the ONLY change is PWV4 bytes 3,4,5 of every column of every track's EXT.

    .venv/bin/python scripts/make_pwv4_candidate.py <v13_export> <out_dir>

Rule (waveform_v2.pwv4_v2, UNFITTED): per 1200-column cell (equal split of the track), peak |x| of the low (<200 Hz), mid (200-2000 Hz) and high (>2 kHz)
band signals; the three values are divided by the track's single strongest value and scaled to 127 (documented semantics: colour = band / strongest band;
measured: max(b3,b4,b5) reaches 127 on every official track). Band edges are an ASSUMPTION. Bytes 0-2 (v13 regression fit), PWV4 header/length, PWV3/PWV5
(accepted detail), PWAV, PWV2, grids, cues, PDB, audio, artwork are untouched. New files are written; baseline files (hardlinked elsewhere) are never opened for writing.
Known residuals vs the official sections (3 development tracks): high band is the strongest in 45-59% of columns (official 11-30%), mid/high MAE 15-18 / 31-35.
"""
import os, shutil, struct, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))
from set2go import waveform_v2 as W
from set2go.waveform import _read_mono_float32
from rekordbox_pdb.pdb import Database
COLS = 1200

def sections(d):
    o = struct.unpack_from(">I", d, 4)[0]; out = []
    while o < len(d):
        lh, lt = struct.unpack_from(">II", d, o + 4); out.append((d[o:o + 4], d[o:o + lt], lh)); o += lt
    return out

def main() -> int:
    base, out = Path(sys.argv[1]).resolve(), Path(sys.argv[2]).resolve()
    if out.exists(): sys.exit(f"{out} exists")
    db = Database.from_file(base / "PIONEER/rekordbox/export.pdb")
    redo = {Path(t.analyze_path).relative_to("/").with_name("ANLZ0000.EXT").as_posix(): t for t in db.tracks}
    assert len(redo) == 10
    done = 0
    for f in sorted(base.rglob("*")):
        if not f.is_file() or f.name == ".DS_Store": continue
        rel = f.relative_to(base); dst = out / rel; dst.parent.mkdir(parents=True, exist_ok=True)
        t = redo.get(rel.as_posix())
        if t is not None:
            mono, sr = _read_mono_float32(ROOT / "test-tracks" / t.filename)
            lv = W.pwv4_v2(mono, sr, COLS); assert lv.shape == (COLS, 3) and lv.max() <= 127
            old = f.read_bytes(); parts = []
            for tag, blob, lh in sections(old):
                if tag == b"PWV4":
                    body = bytearray(blob[lh:]); assert len(body) == COLS * 6
                    for c in range(COLS): body[c*6+3], body[c*6+4], body[c*6+5] = int(lv[c,0]), int(lv[c,1]), int(lv[c,2])
                    blob = blob[:lh] + bytes(body)
                parts.append(blob)
            body = b"".join(parts); hdr = bytearray(old[:28]); struct.pack_into(">I", hdr, 8, 28 + len(body))
            new = bytes(hdr) + body; assert len(new) == len(old); dst.write_bytes(new); done += 1
            print(f"  PWV4 bytes 3-5 regenerated: {t.filename[:40]}")
        else:
            try: os.link(f, dst)
            except OSError: shutil.copy2(f, dst)
    print(f"built {out}: {done} EXT file(s) changed"); return 0

if __name__ == "__main__":
    sys.exit(main())
