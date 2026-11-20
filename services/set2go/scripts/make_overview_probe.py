#!/usr/bin/env python3
"""DIAGNOSTIC ONLY (never part of the production generator): one-track PWV4 mode probe.

    uv run scripts/make_overview_probe.py <baseline_export> <out_dir> [--track Zsak]

Question it answers: does the CDJ draw the small full-track overview from PWV4 (EXT, colour preview) in the player's current mode?
Change: in ONE track's ANLZ0000.EXT the PWV4 body (1200 columns x 6 bytes) bytes 3, 4, 5 are replaced by an unmistakable artificial pattern; bytes 0-2 of every
column, the PWV4 header, its length (7200), every other section of that file, and every other file are untouched. PWAV, PWV2, PWV3, PWV5, DAT files, PDB, audio, artwork identical.
Pattern: a SQUARE WAVE in height over 12 equal sections of 100 columns (~31 s of a 372 s track): even sections TALL (110), odd sections SHORT (14), with bytes 3, 4 and 5
ALL EQUAL in every column. Byte 5 is both the front height and the blue channel, so a pure single-band colour cannot also carry an independent height; equal bytes give the SAME
neutral colour (equal bass/mid/treble, which real music almost never produces) in every column, so the only thing that changes is height: 6 tall blocks and 6 short blocks,
an unmistakable artificial staircase. (An earlier draft tried per-section colours, but byte 5 doubling as the height contaminated them, so it was dropped.)
Encoding stays valid: all modified bytes in 0..127 (the official range), header and length unchanged, same section order.
"""
import os, shutil, struct, sys
from pathlib import Path

TRACKS = {"Zsak": "P03C/000076D8", "Earth": "P03A/0002FBAC", "Snoop": "P00D/000005F3"}
COLS = 1200


def sections(d):
    o = struct.unpack_from(">I", d, 4)[0]; out = []
    while o < len(d):
        lh, lt = struct.unpack_from(">II", d, o + 4); out.append((d[o:o + 4], d[o:o + lt], lh)); o += lt
    return out


def pattern():
    """(1200, 3) values for bytes 3, 4, 5: equal in every column, alternating 110 / 14 every 100 columns."""
    out = []
    for c in range(COLS):
        v = 110 if (c // 100) % 2 == 0 else 14
        out.append((v, v, v))
    return out


def main() -> int:
    base, out = Path(sys.argv[1]).resolve(), Path(sys.argv[2]).resolve()
    track = sys.argv[sys.argv.index("--track") + 1] if "--track" in sys.argv else "Zsak"
    target = f"PIONEER/USBANLZ/{TRACKS[track]}/ANLZ0000.EXT"
    if out.exists(): sys.exit(f"{out} exists")
    pat = pattern()
    assert all(0 <= v <= 127 for row in pat for v in row)
    for f in sorted(base.rglob("*")):
        if not f.is_file() or f.name == ".DS_Store": continue
        rel = f.relative_to(base); dst = out / rel; dst.parent.mkdir(parents=True, exist_ok=True)
        if rel.as_posix() == target:
            old = f.read_bytes(); parts = []
            for tag, blob, lh in sections(old):
                if tag == b"PWV4":
                    body = bytearray(blob[lh:]); assert len(body) == COLS * 6
                    for c, (b3, b4, b5) in enumerate(pat):
                        body[c * 6 + 3], body[c * 6 + 4], body[c * 6 + 5] = b3, b4, b5
                    blob = blob[:lh] + bytes(body)
                parts.append(blob)
            body = b"".join(parts); hdr = bytearray(old[:28]); struct.pack_into(">I", hdr, 8, 28 + len(body))
            new = bytes(hdr) + body; assert len(new) == len(old)
            dst.write_bytes(new)                                    # NEW file; the baseline file (hardlinked elsewhere) is never opened for writing
            print(f"  probe pattern written into PWV4 of {track}: {rel.as_posix()}")
        else:
            try: os.link(f, dst)
            except OSError: shutil.copy2(f, dst)
    print("built", out)
    return 0


if __name__ == "__main__":
    sys.exit(main())
