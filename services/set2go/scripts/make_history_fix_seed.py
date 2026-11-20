#!/usr/bin/env python3
"""Derive src/set2go/data/seed_v2.pdb from subcol_seed.pdb: repair the ONE self-inconsistent page, table 19 (type 0x13) data page.

Seed chain:  clean_seed.pdb -> empty_seed.pdb -> subcol_seed.pdb -> seed_v2.pdb (this stage; the default seed of the exporter).

EVIDENCE (measured on the files, see HANDOFF.md):
  * Table 19 rows are a constant-format database-properties record: [0x0280][index_shift][id][0][date "YYYY-MM-DD"][version block "1000"]. The
    strings match OneLibrary's `property` row (dbVersion "1000", createdDate). It is NOT playback history (those are tables 11 and 12, empty here).
  * Page-header bytes 0x18-0x1a encode num_row_offsets (13 bits) and num_rows (11 bits). In the seed that header declares ONE valid row while the
    row-presence bitmap marks NONE: make_clean_seed.py soft-deleted the fixture's only HISTORY row (clearing the presence bit) without updating the
    count. This is the only page in our generated PDBs whose declared row count disagrees with its presence bits; v6 and the upstream fixture
    (genuine exports) have zero such pages. Hardware: files with this inconsistency (v4, cutT, v9) lack playlist-row artists; files without it
    (v6, v10) show them. Correlation across the tested configurations, not a proven mechanism.
FIX (smallest, generic, neutral): mark the LAST slot present, which makes the declared "1 valid row" true and matches both genuine exports
  (one live row, the highest slot). The upstream author's date (2024-02-29) in the rows is replaced by a fixed neutral constant so no library
  date is carried. Nothing else changes: header word, slot count, written mask, counters stay as in the seed (they equal the genuine fixture's).

    uv run scripts/make_history_fix_seed.py          (writes src/set2go/data/seed_v2.pdb; the earlier seeds are never modified)
"""
import re
import struct
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src/set2go/data/subcol_seed.pdb"
OUT = ROOT / "src/set2go/data/seed_v2.pdb"
PAGE = 4096
HISTORY = 19
NEUTRAL_DATE = b"2000-01-01"          # fixed constant: reproducible, no library state


def check_consistency(raw: bytes) -> None:
    """Fail loudly if ANY data page declares a different live-row count than its presence bitmap holds."""
    import sys
    sys.path.insert(0, str(ROOT / "src"))
    from set2go.pdbcheck import inconsistent_pages
    bad = inconsistent_pages(raw)
    assert not bad, f"seed still has inconsistent pages: {bad}"


def main() -> None:
    d = bytearray(SRC.read_bytes())
    entry = next(28 + i * 16 for i in range(struct.unpack_from("<I", d, 8)[0]) if struct.unpack_from("<I", d, 28 + i * 16)[0] == HISTORY)
    first, last = struct.unpack_from("<II", d, entry + 8)
    o = last * PAGE
    n = d[o + 0x18]
    declared = (d[o + 0x18] | d[o + 0x19] << 8 | d[o + 0x1A] << 16) >> 13
    present = struct.unpack_from("<H", d, o + PAGE - 4)[0]
    assert (n, declared, present) == (2, 1, 0), f"unexpected seed state slots={n} declared={declared} present={present:#b}"
    # 1. neutralise the date in every row of the page (dead rows included: they still carry the fixture author's date)
    heap = d[o + 0x28:o + 0x28 + struct.unpack_from("<H", d, o + 0x1E)[0]]
    hits = [m.start() for m in re.finditer(rb"\d{4}-\d{2}-\d{2}", heap)]
    assert len(hits) == 2, hits
    for h in hits:
        d[o + 0x28 + h:o + 0x28 + h + len(NEUTRAL_DATE)] = NEUTRAL_DATE
    # 2. mark the last slot present (the live row is the highest slot in genuine exports)
    struct.unpack_from("<H", d, o + PAGE - 4)
    struct.pack_into("<H", d, o + PAGE - 4, present | (1 << (n - 1)))
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_bytes(d)
    check_consistency(bytes(d))
    print("wrote", OUT, "| live slot", n - 1, "| presence", bin(struct.unpack_from("<H", d, o + PAGE - 4)[0]))


if __name__ == "__main__":
    main()
