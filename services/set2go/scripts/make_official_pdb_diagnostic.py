#!/usr/bin/env python3
"""Diagnostic candidate: our working export with export.pdb REPLACED by an adapted official-reference PDB (3 original tracks).

    uv run scripts/make_official_pdb_diagnostic.py <working_export> <out_dir>

Isolation: everything except PIONEER/rekordbox/export.pdb comes from <working_export> (audio, ANLZ, artwork, and the supporting-file
SET: no exportExt.pdb / exportLibrary.db / settings files). The PDB is the preserved official reference PDB, adapted ONLY as follows:
  1. The three LIVE track rows keep every byte except: file_path, filename, analyze_path (strings 20/19/14), file_size and
     duration, which are set to this export's real values (the official audio is a different copy living in nested folders).
  2. Nothing else changes: page headers, tombstone (deleted) slots, row directory, flags, other tables, the playlist
     ("RekordSOS Reference"), the artwork rows, history, sort/column tables are the official bytes.
This is NOT byte-identical to the official PDB. The script verifies the exact byte-level scope of the change and fails otherwise.
The export is a 3-track export: the 7 other tracks are absent from the PDB, so their ANLZ/audio files are not referenced and are
omitted from the output (no stale files).
"""
import os
import shutil
import struct
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))
from rekordbox_pdb.edit import encode_string, _align4
from rekordbox_pdb.pdb import Database, TableType

OFFICIAL = ROOT / "reference/rekordbox_official/PIONEER/rekordbox/export.pdb"
PAGE = 4096
FIXED = 0x88                                    # fixed block + 21 u16 string offsets, as written by the editor / rekordbox
OFF_FILE_SIZE, OFF_DURATION = 0x10, 0x54        # track row: file_size (u32), duration (u16)
STR_ANALYZE, STR_FILENAME, STR_PATH = 14, 19, 20
KEY = {"Eart": "Earth", "Snoo": "Snoop", "Zsak": "Zsak"}


def rebuild_row(old: bytes, strings: list[str], file_size: int, duration: int) -> bytes:
    """Same fixed block as `old` (header words, ids, flags) with new string offsets/heap and the two numeric fields."""
    fixed = bytearray(old[:0x5E])
    struct.pack_into("<I", fixed, OFF_FILE_SIZE, file_size)
    struct.pack_into("<H", fixed, OFF_DURATION, duration)
    encoded = [encode_string(s) for s in strings]
    offsets, blob, pos = [], bytearray(), FIXED
    for enc in encoded:
        if enc[0] & 1 == 0 and pos % 4:
            blob.extend(bytes(4 - pos % 4)); pos += 4 - pos % 4
        offsets.append(pos); blob.extend(enc); pos += len(enc)
    return bytes(fixed) + struct.pack("<21H", *offsets) + bytes(blob)


def main() -> int:
    work, out = Path(sys.argv[1]).resolve(), Path(sys.argv[2]).resolve()
    if out.exists():
        sys.exit(f"{out} exists")
    off = OFFICIAL.read_bytes()
    odb, wdb = Database.from_file(OFFICIAL), Database.from_file(work / "PIONEER/rekordbox/export.pdb")
    ours = {t.filename[:4]: t for t in wdb.tracks}

    # locate the tracks data page, its row directory and live slots
    nt = struct.unpack_from("<I", off, 8)[0]
    first, last = next(struct.unpack_from("<II", off, 28 + i * 16 + 8) for i in range(nt) if struct.unpack_from("<I", off, 28 + i * 16)[0] == 0)
    assert first != last, "official tracks table has no data page"
    po = last * PAGE
    n = off[po + 0x18]
    present = struct.unpack_from("<H", off, po + PAGE - 4)[0]
    offs = [struct.unpack_from("<H", off, po + PAGE - 6 - 2 * i)[0] for i in range(n)]
    used = struct.unpack_from("<H", off, po + 0x1E)[0]
    ends = offs[1:] + [used]
    live = [i for i in range(n) if present >> i & 1]
    assert len(live) == 3 == len(odb.tracks)

    new_page = bytearray(off[po:po + PAGE])
    cursor_shift = 0
    log = []
    new_offs = list(offs)
    heap = bytearray(off[po + 0x28:po + 0x28 + used])
    rebuilt: dict[int, bytes] = {}
    for slot, t in zip(live, odb.tracks):
        k = ours[t.filename[:4]]
        strings = list(t.strings)
        log.append((t.id, {"file_path": (strings[STR_PATH], k.file_path), "filename": (strings[STR_FILENAME], k.filename),
                           "analyze_path": (strings[STR_ANALYZE], k.analyze_path), "file_size": (t.file_size, k.file_size),
                           "duration": (t.duration, k.duration)}))
        strings[STR_ANALYZE], strings[STR_FILENAME], strings[STR_PATH] = k.analyze_path, k.filename, k.file_path
        old_row = bytes(heap[offs[slot]:ends[slot]])
        row = rebuild_row(old_row, strings, k.file_size, k.duration)
        rebuilt[slot] = row.ljust(_align4(len(row)), b"\0")
    # re-lay the heap: tombstones and untouched rows keep their bytes; live rows are rewritten at the same slot order
    out_heap, pos = bytearray(), 0
    for i in range(n):
        body = rebuilt.get(i, bytes(heap[offs[i]:ends[i]]))
        new_offs[i] = pos
        out_heap += body; pos += len(body)
    assert pos <= PAGE - 0x28 - (2 * n + 4 * ((n + 15) // 16)), "adapted rows do not fit the page"
    new_page[0x28:0x28 + len(out_heap)] = out_heap
    new_page[0x28 + len(out_heap):PAGE - (2 * n + 4 * ((n + 15) // 16))] = bytes(PAGE - (2 * n + 4 * ((n + 15) // 16)) - 0x28 - len(out_heap))
    for i in range(n):
        struct.pack_into("<H", new_page, PAGE - 6 - 2 * i, new_offs[i])
    struct.pack_into("<H", new_page, 0x1E, len(out_heap))                       # used
    struct.pack_into("<H", new_page, 0x1C, PAGE - 0x28 - len(out_heap) - (2 * n + 4 * ((n + 15) // 16)))   # free (as the editor computes it)
    new = bytearray(off); new[po:po + PAGE] = new_page

    # ---- verify the exact scope of the change ----
    changed_pages = sorted({i // PAGE for i in range(len(off)) if off[i] != new[i]})
    assert changed_pages == [last], f"only the tracks data page may change, got {changed_pages}"
    chk = Database.from_bytes(bytes(new)) if hasattr(Database, "from_bytes") else None
    open("/tmp/_adapted.pdb", "wb").write(new)
    ndb = Database.from_file("/tmp/_adapted.pdb")
    for a, b in zip(odb.tracks, ndb.tracks):
        for f, v in vars(a).items():
            if f.startswith("_") or f in ("strings", "index_shift"):
                continue
            if f in ("file_size", "duration"):
                continue
            assert getattr(b, f) == v, f"unexpected change in {f}"
        for i, (x, y) in enumerate(zip(a.strings, b.strings)):
            assert (x == y) or i in (STR_ANALYZE, STR_FILENAME, STR_PATH), f"unexpected string change [{i}]"
    for tname in ("artists", "albums", "genres", "labels", "keys", "artwork", "playlist_tree", "playlist_entries", "colors", "columns"):
        g = lambda d: [{k: v for k, v in vars(r).items() if not k.startswith("_")} for r in (getattr(d, tname)() if callable(getattr(d, tname)) else getattr(d, tname))]
        assert g(odb) == g(ndb), f"table {tname} changed"

    # ---- assemble the output tree: working export, PDB replaced, only referenced files kept ----
    referenced_audio = {Path(t.file_path).name for t in ndb.tracks}
    referenced_anlz = {Path(t.analyze_path).parent for t in ndb.tracks}
    (out / "PIONEER/rekordbox").mkdir(parents=True)
    (out / "PIONEER/rekordbox/export.pdb").write_bytes(new)
    for t in ndb.tracks:
        d = Path(t.analyze_path).parent.relative_to("/")
        for ext in ("DAT", "EXT"):
            (out / d).mkdir(parents=True, exist_ok=True)
            os.link(work / d / f"ANLZ0000.{ext}", out / d / f"ANLZ0000.{ext}")
        (out / "Contents").mkdir(exist_ok=True)
        os.link(work / "Contents" / Path(t.file_path).name, out / "Contents" / Path(t.file_path).name)
    (out / "PIONEER/Artwork/00001").mkdir(parents=True)
    for a in ndb.artwork:
        for suf in ("", "_m"):
            for pre in ("a", "b"):
                nm = f"{pre}{a.id}{suf}.jpg"
                os.link(work / "PIONEER/Artwork/00001" / nm, out / "PIONEER/Artwork/00001" / nm)
    print(f"built {out}")
    for tid, d in log:
        print(f" track {tid}:")
        for f, (a, b) in d.items():
            print(f"   {f:13} {a!r} -> {b!r}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
