#!/usr/bin/env python3
"""Create a clean DeviceSQL seed from a genuine rekordbox fixture.

Reads one-song-export.pdb from the rekordbox-pdb test fixtures and produces
a version with all user-data rows soft-deleted (present-flag bits zeroed),
while leaving the structural tables (COLORS, COLUMNS, UNKNOWN_17, UNKNOWN_18)
intact.

The resulting file is suitable as a PdbEditor seed: it inherits the structural
tables that real rekordbox exports require, but contains no ghost tracks,
artists, playlists, or history entries.

Output: diagnostic/clean_seed.pdb

Usage:
    uv run scripts/make_clean_seed.py
"""

import struct
from pathlib import Path

FIXTURE = Path(
    "/Users/andresherrera/.cache/uv/git-v0/checkouts"
    "/c569a6a09412e3f6/ee3bac2/tests/data/one-song-export.pdb"
)
OUTPUT = Path("diagnostic/clean_seed.pdb")

# TableType enum values from rekordbox_pdb/pdb.py.
# These four tables hold rekordbox browser metadata (column names, sort
# orders, colours) and must be preserved for the CDJ to render the library.
STRUCTURAL_TYPES = {
    6,   # COLORS
    16,  # COLUMNS
    17,  # UNKNOWN_17
    18,  # UNKNOWN_18
}

ROW_GROUP_SIZE = 0x24  # 36 bytes: 16×u16 offsets + u16 present_flags + u16 pad


def main() -> None:
    if not FIXTURE.exists():
        raise FileNotFoundError(f"Fixture not found: {FIXTURE}")

    data = bytearray(FIXTURE.read_bytes())
    page_size = struct.unpack_from("<I", data, 4)[0]
    num_tables = struct.unpack_from("<I", data, 8)[0]
    table_dir = 0x1C

    rows_cleared: dict[int, int] = {}
    pages_touched = 0

    for i in range(num_tables):
        entry = table_dir + i * 16
        ttype = struct.unpack_from("<I", data, entry)[0]
        first_page = struct.unpack_from("<I", data, entry + 8)[0]
        last_page = struct.unpack_from("<I", data, entry + 12)[0]

        if ttype in STRUCTURAL_TYPES:
            continue

        cleared = 0
        current = first_page
        while True:
            pg_off = current * page_size
            page_flags = data[pg_off + 27]

            if not (page_flags & 0x40):  # data page (bit 6 clear)
                num_rows = data[pg_off + 24] + 0x100 * (data[pg_off + 25] & 1)
                if num_rows > 0:
                    num_groups = (num_rows - 1) // 16 + 1
                    for group in range(num_groups):
                        base = page_size - group * ROW_GROUP_SIZE
                        pf_off = pg_off + base - 4
                        old_pf = struct.unpack_from("<H", data, pf_off)[0]
                        if old_pf != 0:
                            data[pf_off] = 0
                            data[pf_off + 1] = 0
                            cleared += bin(old_pf).count("1")
                            pages_touched += 1

            if current == last_page:
                break
            current = struct.unpack_from("<I", data, pg_off + 12)[0]

        if cleared:
            rows_cleared[ttype] = cleared

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_bytes(data)

    print(f"Clean seed written → {OUTPUT}  ({len(data)} bytes)")
    print(f"Data pages touched: {pages_touched}")
    if rows_cleared:
        print("Rows soft-deleted by table type:")
        for tt, n in sorted(rows_cleared.items()):
            print(f"  type {tt:2d}: {n} row(s)")
    else:
        print("No rows to clear — seed was already clean")


if __name__ == "__main__":
    main()
