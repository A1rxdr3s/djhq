#!/usr/bin/env python3
"""Bisection helper: take OUR generated 3-track PDB and substitute exactly ONE block from the successful adapted-official PDB.

    uv run scripts/pdb_bisect.py <ours_export_root> <successful_export_root> <block> <out_pdb>
    block: tracks | history

Both inputs must describe the same three tracks with the same ids (asserted). The output is OUR PDB with that one table's DATA PAGE
bytes replaced by the successful file's, and nothing else changed. Only the table's last data page content is copied; the page's own
index, next-page pointer and the table directory stay ours, so page chains remain valid. Everything is verified after writing.
"""
import struct
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))
from rekordbox_pdb.pdb import Database, TableType

PAGE = 4096
BLOCKS = {"tracks": 0, "history": 19}


def chain(raw: bytes, ttype: int):
    for i in range(struct.unpack_from("<I", raw, 8)[0]):
        t, empty, first, last = struct.unpack_from("<IIII", raw, 28 + i * 16)
        if t == ttype:
            c, p = [], first
            while True:
                c.append(p)
                if p == last:
                    return c
                p = struct.unpack_from("<I", raw, p * PAGE + 12)[0]
    raise KeyError(ttype)


def main() -> int:
    ours_root, good_root, block, out = Path(sys.argv[1]), Path(sys.argv[2]), sys.argv[3], Path(sys.argv[4])
    tt = BLOCKS[block]
    ours = bytearray((ours_root / "PIONEER/rekordbox/export.pdb").read_bytes())
    good = (good_root / "PIONEER/rekordbox/export.pdb").read_bytes()
    odb = Database.from_file(ours_root / "PIONEER/rekordbox/export.pdb")
    gdb = Database.from_file(good_root / "PIONEER/rekordbox/export.pdb")
    # same tracks, same ids across both files: a precondition for substituting track rows
    assert [(t.id, t.filename) for t in odb.tracks] == [(t.id, t.filename) for t in gdb.tracks], "track id/filename sets differ"
    co, cg = chain(bytes(ours), tt), chain(good, tt)
    assert len(co) == len(cg) == 2, f"expected index page + one data page in both files, got {co} / {cg}"
    po, pg = co[-1], cg[-1]
    page = bytearray(good[pg * PAGE:(pg + 1) * PAGE])
    # keep OUR page identity fields: own index (+0x04), next pointer (+0x0c) and generation (+0x10)
    for off in (0x04, 0x0C, 0x10):
        page[off:off + 4] = ours[po * PAGE + off:po * PAGE + off + 4]
    ours[po * PAGE:(po + 1) * PAGE] = page
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_bytes(ours)

    # ---- verification: nothing but that one page changed; chains/tables/references still valid ----
    new = out.read_bytes(); old = (ours_root / "PIONEER/rekordbox/export.pdb").read_bytes()
    changed = sorted({i // PAGE for i in range(len(old)) if old[i] != new[i]})
    assert changed == [po], f"only page {po} may change, got {changed}"
    ndb = Database.from_file(out)
    assert chain(new, tt) == co, "page chain changed"
    for name in ("artists", "albums", "genres", "labels", "keys", "artwork", "playlist_tree", "playlist_entries"):
        a = [(k, v) for r in getattr(odb, name) for k, v in sorted(vars(r).items()) if not k.startswith("_")]
        b = [(k, v) for r in getattr(ndb, name) for k, v in sorted(vars(r).items()) if not k.startswith("_")]
        assert a == b, f"table {name} changed"
    ids = {n: {r.id for r in getattr(ndb, n)} for n in ("artists", "albums", "genres", "labels", "keys", "artwork")}
    for t in ndb.tracks:
        assert t.artist_id in ids["artists"] and t.album_id in ids["albums"] and t.artwork_id in ids["artwork"], f"track {t.id} dangling ref"
        assert t.key_id == 0 or t.key_id in ids["keys"]
        assert t.genre_id == 0 or t.genre_id in ids["genres"]
        assert t.label_id == 0 or t.label_id in ids["labels"]
    print(f"{block}: substituted page {po} (from good page {pg}); only that page differs from ours; chains, lookups, ids intact; "
          f"{len(ndb.tracks)} tracks, {len(list(ndb.history_entries)) if hasattr(ndb, 'history_entries') else '-'} history entries")
    return 0


if __name__ == "__main__":
    sys.exit(main())
