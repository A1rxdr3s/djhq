#!/usr/bin/env python3
"""Derive src/set2go/data/subcol_seed.pdb from empty_seed.pdb: select ARTIST as the browser sub-column.

What the field is (verified against the preserved official export, not guessed):
  export.pdb table 18 ("UNKNOWN_18") is the CDJ browse-sort configuration. Its 17 rows join one-to-one with the
  `sort` table of the official exportLibrary.db (public schema: fourfour PIONEER.md,
  `sort(sort_id, menuItem_id, sequenceNo, isVisible, isSelectedAsSubColumn)`):
      u16 @0 = menuItem_id    u16 @2 = sort_id    u8 @4 = state    u8 @5 = sequenceNo
  state: 1 = hidden (isVisible 0), 0 = visible, 2 = visible AND selected as sub-column (isSelectedAsSubColumn 1).
  In the official export exactly one row has state 2: menuItem 2 (ARTIST). The CDJ protocol docs (Deep Symmetry) state
  that playlist entries carry a second label (secondary text), "e.g. artist name for playlist entries".
  The seed inherited from the one-song fixture has state 0 on the ARTIST row, i.e. no sub-column selected.

Only that one byte is changed. No other table, no personal settings, no database is copied.

    uv run scripts/make_subcolumn_seed.py
"""
import struct
from pathlib import Path

D = Path(__file__).resolve().parent.parent / "src/set2go/data"
PAGE = 4096
SORT_TABLE = 18
ARTIST_MENU_ITEM = 2


def main() -> None:
    d = bytearray((D / "empty_seed.pdb").read_bytes())
    entry = next(28 + i * 16 for i in range(struct.unpack_from("<I", d, 8)[0])
                 if struct.unpack_from("<I", d, 28 + i * 16)[0] == SORT_TABLE)
    first, last = struct.unpack_from("<II", d, entry + 8)
    changed = 0
    pg = first
    while True:
        o = pg * PAGE
        n = d[o + 0x18] + 0x100 * (d[o + 0x19] & 1)
        if not d[o + 0x1B] & 0x40:                              # data page
            for slot in range(n):
                grp, bit = divmod(slot, 16)
                present = struct.unpack_from("<H", d, o + PAGE - grp * 0x24 - 4)[0] >> bit & 1
                off = struct.unpack_from("<H", d, o + PAGE - grp * 0x24 - 6 - 2 * bit)[0]
                row = o + 0x28 + off
                menu, sort_id, state, seq = struct.unpack_from("<HHBB", d, row)
                if present and menu == ARTIST_MENU_ITEM:
                    assert state in (0, 2), f"unexpected state {state}"
                    if state != 2:
                        d[row + 4] = 2
                        changed += 1
        if pg == last:
            break
        pg = struct.unpack_from("<I", d, o + 0x0C)[0]
    assert changed == 1, f"expected to change exactly one row, changed {changed}"
    (D / "subcol_seed.pdb").write_bytes(d)
    print("wrote", D / "subcol_seed.pdb", "(ARTIST row state 0 -> 2)")


if __name__ == "__main__":
    main()
