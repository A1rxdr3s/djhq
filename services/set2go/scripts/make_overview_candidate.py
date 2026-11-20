#!/usr/bin/env python3
"""Overview-waveform candidate: ONLY the PWAV section (400-column overview, DAT) is canonicalised; everything else is taken byte-for-byte from the baseline.

    uv run scripts/make_overview_candidate.py <baseline_export> <out_dir>

Change (and the only one): in each ANLZ0000.DAT, every PWAV column whose height (5 low bits) is 0 gets whiteness (3 high bits) 0. Evidence: on the CDJ-2000NXS2
the player itself rewrote exactly such columns (silent trailing columns where our PWAV carried whiteness 3 or 5 on height 0) to 0x00 in three DAT files across
several sessions (Snoop 1 column, Sophia 5, Ritmo 10); a zero-height column draws no bar, so whiteness there carries no information. Nothing else in PWAV changes.
PWV4 (colour overview), PWV2, PWV3, PWV5, grids (PQTZ), cues (PCOB), the PDB, audio, artwork are untouched. Files are written as NEW files (baseline files are hardlinked elsewhere).
Expected visual effect: NONE (height-0 columns are invisible). This is a canonical-form fix, not an appearance improvement.
"""
import os, shutil, struct, sys
from pathlib import Path

def sections(d):
    o = struct.unpack_from(">I", d, 4)[0]; out = []
    while o < len(d):
        lh, lt = struct.unpack_from(">II", d, o + 4); out.append((d[o:o + 4], d[o:o + lt], lh)); o += lt
    return out

def canon_pwav(dat: bytes) -> tuple[bytes, int]:
    n = 0; parts = []
    for tag, blob, lh in sections(dat):
        if tag == b"PWAV":
            body = bytearray(blob[lh:])
            for i, b in enumerate(body):
                if b & 31 == 0 and b != 0:
                    body[i] = 0; n += 1
            blob = blob[:lh] + bytes(body)
        parts.append(blob)
    body = b"".join(parts); hdr = bytearray(dat[:28]); struct.pack_into(">I", hdr, 8, 28 + len(body))
    out = bytes(hdr) + body
    assert len(out) == len(dat)
    return out, n

def main() -> int:
    base, out = Path(sys.argv[1]).resolve(), Path(sys.argv[2]).resolve()
    if out.exists(): sys.exit(f"{out} exists")
    total = 0; touched = 0
    for f in sorted(base.rglob("*")):
        if not f.is_file() or f.name == ".DS_Store": continue
        dst = out / f.relative_to(base); dst.parent.mkdir(parents=True, exist_ok=True)
        if f.name == "ANLZ0000.DAT":
            new, n = canon_pwav(f.read_bytes())
            if n:
                dst.write_bytes(new); total += n; touched += 1
                print(f"  {f.parent.name}: {n} PWAV column(s) canonicalised"); continue
        try: os.link(f, dst)
        except OSError: shutil.copy2(f, dst)
    print(f"built {out}: {touched} DAT file(s) changed, {total} PWAV column(s) set to whiteness 0")
    return 0

if __name__ == "__main__":
    sys.exit(main())
