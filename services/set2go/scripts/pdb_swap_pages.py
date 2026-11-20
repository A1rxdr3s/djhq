#!/usr/bin/env python3
"""Positive-control bisection helper: start from a SUCCESSFUL PDB and replace ONE table's pages with the same table's pages from another PDB.

    uv run scripts/pdb_swap_pages.py <successful_export_root> <other_export_root> <table> <out_pdb>
    table: history

Only tables whose page numbers, table-directory entry (empty_candidate/first/last), own page index, type and next pointers are IDENTICAL in
both files can be swapped; anything else is refused (it would need pointer surgery). Pages are copied whole (content, gen counters and
written-masks travel with them). Verification: only those pages differ from the successful file; every table other than the swapped one is
unchanged field-by-field; the swapped table's live rows equal the other file's; the file still parses; all track references still resolve.
"""
import struct
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))
from rekordbox_pdb.pdb import Database

PAGE = 4096
TABLES = {"history": 19}


def entry(raw: bytes, ttype: int):
    for i in range(struct.unpack_from("<I", raw, 8)[0]):
        t, empty, first, last = struct.unpack_from("<IIII", raw, 28 + i * 16)
        if t == ttype:
            return empty, first, last
    raise KeyError(ttype)


def chain(raw: bytes, ttype: int):
    _, first, last = entry(raw, ttype)
    c, p = [], first
    while True:
        c.append(p)
        if p == last:
            return c
        p = struct.unpack_from("<I", raw, p * PAGE + 12)[0]


def main() -> int:
    good_root, other_root, table, out = Path(sys.argv[1]), Path(sys.argv[2]), sys.argv[3], Path(sys.argv[4])
    tt = TABLES[table]
    gp, op = good_root / "PIONEER/rekordbox/export.pdb", other_root / "PIONEER/rekordbox/export.pdb"
    good, other = bytearray(gp.read_bytes()), op.read_bytes()
    assert entry(bytes(good), tt) == entry(other, tt), "table directory entries differ: pointer surgery would be needed"
    cg, co = chain(bytes(good), tt), chain(other, tt)
    assert cg == co, f"page chains differ {cg} vs {co}"
    for pg in cg:                                   # own index, type and next pointer must already agree
        a, b = good[pg * PAGE:pg * PAGE + 16], other[pg * PAGE:pg * PAGE + 16]
        assert a == b, f"page {pg} identity/pointer fields differ"
    for pg in cg:
        good[pg * PAGE:(pg + 1) * PAGE] = other[pg * PAGE:(pg + 1) * PAGE]

    new = bytes(good)
    old = gp.read_bytes()
    changed = sorted({i // PAGE for i in range(len(old)) if old[i] != new[i]})
    assert set(changed) <= set(cg) and changed, f"pages changed {changed}, expected only {cg}"
    tmp = Path("/tmp/_swap_check.pdb"); tmp.write_bytes(new)
    gdb, odb, ndb = Database.from_file(gp), Database.from_file(op), Database.from_file(tmp)
    flat = lambda rows: [(k, v) for r in rows for k, v in sorted(vars(r).items()) if not k.startswith("_")]
    for name in ("tracks", "artists", "albums", "genres", "labels", "keys", "artwork", "playlist_tree", "playlist_entries", "colors", "columns"):
        assert flat(getattr(gdb, name)) == flat(getattr(ndb, name)), f"table {name} changed"
    hname = {"history": "history_playlists"}[table]
    ids = {n: {r.id for r in getattr(ndb, n)} for n in ("artists", "albums", "genres", "labels", "keys", "artwork")}
    for t in ndb.tracks:
        assert t.artist_id in ids["artists"] and t.album_id in ids["albums"] and t.artwork_id in ids["artwork"]
        assert t.key_id == 0 or t.key_id in ids["keys"]
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_bytes(new)
    print(f"{table}: pages {cg} taken whole from {other_root.name}; only those pages differ from {good_root.name} ({sum(x != y for x, y in zip(old, new))} bytes); "
          f"every other table identical; refs resolve; {len(list(ndb.tracks))} tracks")
    return 0


if __name__ == "__main__":
    sys.exit(main())
