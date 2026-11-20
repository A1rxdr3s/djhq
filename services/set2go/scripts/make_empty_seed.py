#!/usr/bin/env python3
"""Derive src/set2go/data/empty_seed.pdb from clean_seed.pdb.

clean_seed.pdb keeps soft-deleted ghost rows (present-flags zeroed) in every
user-data table, so real rows start at slot 2+ and the page index describes rows
that no longer exist. An official rekordbox export has none of that. This script
resets each user-data table to the empty-table shape GENRES/LABELS already have:
first_page == last_page == the index page, heap "first data page" = 0x03FFFFFF.

Structural tables (COLORS 6, COLUMNS 16, UNKNOWN_17/18, HISTORY 19) are untouched.

    uv run scripts/make_empty_seed.py
"""
import struct
from pathlib import Path

D = Path(__file__).resolve().parent.parent / "src/set2go/data"
USER_TABLES = {0, 2, 3, 5, 7, 8, 13}     # tracks artists albums keys playlist-tree/-entries artwork
PAGE = 4096


def main() -> None:
    d = bytearray((D / "clean_seed.pdb").read_bytes())
    for i in range(struct.unpack_from("<I", d, 8)[0]):
        e = 28 + i * 16
        t, empty, first, last = struct.unpack_from("<IIII", d, e)
        if t not in USER_TABLES or first == last:
            continue
        struct.pack_into("<I", d, e + 12, first)             # last_page = index page
        o = first * PAGE
        d[o + 0x1B] = 0x64                                    # index-only page, as GENRES
        struct.pack_into("<I", d, o + 0x0C, empty)            # next page -> empty candidate
        heap = o + 0x28
        struct.pack_into("<I", d, heap + 4, 0x03FFFFFF)       # no first data page
        # wipe the orphaned data page so no ghost rows survive in the file
        lo = last * PAGE
        d[lo:lo + PAGE] = bytes(PAGE)
        print(f"table {t:2d}: dropped data page {last}")
    (D / "empty_seed.pdb").write_bytes(d)
    print("wrote", D / "empty_seed.pdb")


if __name__ == "__main__":
    main()
