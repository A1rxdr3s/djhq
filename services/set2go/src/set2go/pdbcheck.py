"""Structural checks for DeviceSQL export.pdb files.

inconsistent_pages(): data pages whose DECLARED live-row count disagrees with their row-presence bitmap.

Page header bytes 0x18-0x1a hold a 24-bit little-endian value: low 13 bits = num_row_offsets (slots ever allocated), high 11 bits =
num_rows (valid rows, per the Deep Symmetry analysis). The presence bitmap lives in the row-group trailer at the end of the page (one 16-bit
word per group of 16 slots, at page_end - group*0x24 - 4). A consistent page has declared num_rows == number of set presence bits and
num_row_offsets == the slot count.

Why this matters: the project's seed once declared one valid row in the table-19 (type 0x13) data page while its bitmap marked none (the
fixture's only row had been soft-deleted without updating the count). Across all generated and reference files tested, the only page with
this disagreement was that one, and the hardware (CDJ-2000NXS2 fw 1.87) showed playlist-row artists only for files without it. That is a
correlation over the tested files, not a proven mechanism; this check exists so the condition cannot reappear unnoticed.
"""
from __future__ import annotations

import struct

PAGE = 4096


def _tables(raw: bytes):
    for i in range(struct.unpack_from("<I", raw, 8)[0]):
        t, _empty, first, last = struct.unpack_from("<IIII", raw, 28 + i * 16)
        yield t, first, last


def inconsistent_pages(raw: bytes) -> list[tuple[int, int, str]]:
    """Return [(table_type, page_index, reason)] for every inconsistent data page (empty list = consistent)."""
    bad: list[tuple[int, int, str]] = []
    for t, first, last in _tables(raw):
        pg, seen = first, set()
        while pg not in seen:
            seen.add(pg)
            o = pg * PAGE
            if not raw[o + 0x1B] & 0x40:                      # data page (index pages carry flag 0x40)
                v = raw[o + 0x18] | raw[o + 0x19] << 8 | raw[o + 0x1A] << 16
                offsets, declared = v & 0x1FFF, v >> 13
                slots = raw[o + 0x18] + 0x100 * (raw[o + 0x19] & 1)
                present = 0
                for g in range((slots + 15) // 16):
                    word = struct.unpack_from("<H", raw, o + PAGE - g * 0x24 - 4)[0] & ((1 << min(16, slots - g * 16)) - 1)
                    present += bin(word).count("1")
                if declared != present:
                    bad.append((t, pg, f"declared num_rows {declared} != {present} present rows"))
                elif offsets != slots and slots < 256:
                    bad.append((t, pg, f"num_row_offsets {offsets} != {slots} slots"))
            if pg == last:
                break
            pg = struct.unpack_from("<I", raw, o + 12)[0]
    return bad
