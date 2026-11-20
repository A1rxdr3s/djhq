#!/usr/bin/env python3
"""Field-level bisection helper: copy ONE group of track-row values from a successful PDB into OUR PDB's own rows.

    uv run scripts/pdb_field_patch.py <ours_export_root> <successful_export_root> <group> <out_pdb>
    group: unique_id | const18 | strings23 | dates | playcount | all_fixed

It rewrites ONLY the named fields of each shared track row (matched by id AND filename), keeps every other byte of our file, and
verifies afterwards that no other field, table, page or reference changed. Same-size patches only (fixed-width words and the two
short numeric strings), so no row is re-laid and the page layout stays ours. Diagnostic only: values come from a library with
private state and must never be shipped; the product fix must be a generic rule in add_track().
Groups:  unique_id = +0x14 (u32)   const18 = +0x18 (u32)   strings23 = string[2], string[3] (ASCII numbers)
         dates = string[10], string[15] (YYYY-MM-DD, same length)   playcount = +0x4e (u16)   all_fixed = unique_id+const18+playcount
"""
import struct
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))
from rekordbox_pdb.pdb import Database, TableType

GROUPS = {"unique_id": [(0x14, 4)], "const18": [(0x18, 4)], "playcount": [(0x4E, 2)], "all_fixed": [(0x14, 4), (0x18, 4), (0x4E, 2)]}
STR_GROUPS = {"strings23": (2, 3), "dates": (10, 15)}


def string_slots(raw: bytes, row: int, idx: int):
    """(absolute payload offset, payload length) of short-ASCII DeviceSQL string idx of a track row.

    Short form: one kind byte = ((len + 1) << 1) | 1, then len ASCII bytes. An empty string is the single byte 0x03.
    """
    off = struct.unpack_from("<21H", raw, row + 0x5E)[idx]
    kind = raw[row + off]
    if not kind & 1:
        raise ValueError(f"string[{idx}] is a long/wide string; not supported by this patcher")
    n = (kind >> 1) - 1
    return row + off + 1, n


def main() -> int:
    ours_root, good_root, group, out = Path(sys.argv[1]), Path(sys.argv[2]), sys.argv[3], Path(sys.argv[4])
    op, gp = ours_root / "PIONEER/rekordbox/export.pdb", good_root / "PIONEER/rekordbox/export.pdb"
    ours, good = bytearray(op.read_bytes()), gp.read_bytes()
    odb, gdb = Database.from_file(op), Database.from_file(gp)
    ol, gl = list(odb.row_locations(TableType.TRACKS)), list(gdb.row_locations(TableType.TRACKS))
    gmap = {(t.id, t.filename): l for t, l in zip(gdb.tracks, gl)}
    changed = []
    for t, l in zip(odb.tracks, ol):
        g = gmap[(t.id, t.filename)]
        if group in GROUPS:
            for off, size in GROUPS[group]:
                ours[l + off:l + off + size] = good[g + off:g + off + size]
                changed.append((t.id, hex(off)))
        else:
            for idx in STR_GROUPS[group]:
                oa, olen = string_slots(bytes(ours), l, idx)
                ga, glen = string_slots(good, g, idx)
                assert olen == glen, f"track {t.id} string[{idx}] payload length {olen} (ours) vs {glen} (good): would re-lay the row, not supported"
                ours[oa:oa + olen] = good[ga:ga + glen]
                changed.append((t.id, f"string[{idx}]"))
    # ---- verify (on the in-memory result; the output file is written only if everything holds): only the intended bytes differ, everything parses, nothing else moved ----
    old, new = op.read_bytes(), bytes(ours)
    assert len(old) == len(new)
    pages = sorted({i // 4096 for i in range(len(old)) if old[i] != new[i]})
    tracks_page = {i // 4096 for l in ol for i in (l,)}
    assert set(pages) <= tracks_page, f"unexpected pages changed: {pages}"
    tmp = Path("/tmp/_fieldpatch_check.pdb"); tmp.write_bytes(new)
    ndb = Database.from_file(tmp)
    keep = lambda r: {k: v for k, v in vars(r).items() if not k.startswith("_") and k != "strings"}
    allowed = {"unique_id": set(), "const18": set(), "playcount": {"play_count"}, "all_fixed": {"play_count"}, "strings23": set(), "dates": set()}[group]
    for a, b in zip(odb.tracks, ndb.tracks):
        for k, v in keep(a).items():
            assert k in allowed or getattr(b, k) == v, f"track {a.id}: {k} changed unexpectedly"
        for i, (x, y) in enumerate(zip(a.strings, b.strings)):
            assert x == y or (group in STR_GROUPS and i in STR_GROUPS[group]), f"track {a.id}: string[{i}] changed unexpectedly"
    for n in ("artists", "albums", "genres", "labels", "keys", "artwork", "playlist_tree", "playlist_entries"):
        f = lambda d: [(k, v) for r in getattr(d, n) for k, v in sorted(vars(r).items()) if not k.startswith("_")]
        assert f(odb) == f(ndb), f"table {n} changed"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_bytes(new)
    nbytes = sum(x != y for x, y in zip(old, new))
    print(f"{group}: {len(changed)} field(s) patched across {len(odb.tracks)} tracks; {nbytes} byte(s) differ from ours, all on page(s) {pages}; every other field/table intact")
    return 0


if __name__ == "__main__":
    sys.exit(main())
