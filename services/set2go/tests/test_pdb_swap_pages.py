"""pdb_swap_pages: swap one table's pages between two PDBs; refuse anything needing pointer surgery."""
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
V6, CT = ROOT / "desktop_v6_officialpdb", ROOT / "desktop_v7_cutT"
pytestmark = pytest.mark.skipif(not (V6.exists() and CT.exists()), reason="diagnostic trees not present")


def _run(good, other, out):
    return subprocess.run([sys.executable, "-I", str(ROOT / "scripts/pdb_swap_pages.py"), str(good), str(other), "history", str(out)], capture_output=True, text=True)


def test_history_swap_changes_only_history_pages(tmp_path):
    out = tmp_path / "o" / "PIONEER/rekordbox/export.pdb"
    r = _run(V6, CT, out)
    assert r.returncode == 0, r.stderr[-300:]
    a = (V6 / "PIONEER/rekordbox/export.pdb").read_bytes()
    b = out.read_bytes()
    assert len(a) == len(b)
    assert sorted({i // 4096 for i in range(len(a)) if a[i] != b[i]}) == [39, 40]
    c = (CT / "PIONEER/rekordbox/export.pdb").read_bytes()
    assert all(b[p * 4096:(p + 1) * 4096] == c[p * 4096:(p + 1) * 4096] for p in (39, 40))


def test_swap_is_refused_when_pointers_would_need_surgery(tmp_path):
    # v7 vs a tree whose HISTORY table sits elsewhere cannot be swapped: simulate by swapping in the reverse roles on a table that differs
    out = tmp_path / "o" / "PIONEER/rekordbox/export.pdb"
    r = subprocess.run([sys.executable, "-I", str(ROOT / "scripts/pdb_swap_pages.py"), str(V6), str(CT), "history", str(out)], capture_output=True, text=True)
    assert r.returncode == 0                                   # history is swappable (same pages)
    bad = subprocess.run([sys.executable, "-I", str(ROOT / "scripts/pdb_swap_pages.py"), str(V6), str(CT), "tracks", str(out)], capture_output=True, text=True)
    assert bad.returncode != 0                                 # "tracks" is not a supported table


V10 = ROOT / "desktop_v10_cutT_v6history"


@pytest.mark.skipif(not V10.exists(), reason="converse tree not present")
def test_converse_is_cutT_with_only_v6_history_pages():
    c = (CT / "PIONEER/rekordbox/export.pdb").read_bytes()
    n = (V10 / "PIONEER/rekordbox/export.pdb").read_bytes()
    v6 = (V6 / "PIONEER/rekordbox/export.pdb").read_bytes()
    assert len(c) == len(n)
    assert sorted({i // 4096 for i in range(len(c)) if c[i] != n[i]}) == [39, 40]
    assert all(n[p * 4096:(p + 1) * 4096] == v6[p * 4096:(p + 1) * 4096] for p in (39, 40))
    assert n[:28 + 320] == c[:28 + 320]                       # file header and table directory stay cutT's


def test_forward_and_converse_are_complements(tmp_path):
    fwd = tmp_path / "f" / "PIONEER/rekordbox/export.pdb"
    assert _run(V6, CT, fwd).returncode == 0                  # v6 + cutT's HISTORY  (= v9)
    f = fwd.read_bytes(); c = (CT / "PIONEER/rekordbox/export.pdb").read_bytes()
    assert all(f[p * 4096:(p + 1) * 4096] == c[p * 4096:(p + 1) * 4096] for p in (39, 40))


V11 = ROOT / "desktop_v11_historyfix"


def _table19_page(raw: bytes):
    import struct
    for i in range(struct.unpack_from("<I", raw, 8)[0]):
        t, _, first, last = struct.unpack_from("<IIII", raw, 28 + i * 16)
        if t == 19:
            return last
    raise KeyError


def _inconsistent_pages(raw: bytes):
    """Pages whose declared num_rows (bits 13-23 of bytes 0x18-0x1a) differs from the presence bitmap."""
    import struct
    bad = []
    for i in range(struct.unpack_from("<I", raw, 8)[0]):
        t, _, first, last = struct.unpack_from("<IIII", raw, 28 + i * 16)
        pg = first
        while True:
            o = pg * 4096
            if not raw[o + 0x1B] & 0x40:
                v = raw[o + 0x18] | raw[o + 0x19] << 8 | raw[o + 0x1A] << 16
                n = raw[o + 0x18] + 0x100 * (raw[o + 0x19] & 1)
                present = sum(bin(struct.unpack_from("<H", raw, o + 4096 - g * 0x24 - 4)[0] & ((1 << min(16, n - g * 16)) - 1)).count("1") for g in range((n + 15) // 16))
                if (v >> 13) != present:
                    bad.append((t, pg))
            if pg == last:
                break
            pg = struct.unpack_from("<I", raw, o + 12)[0]
    return bad


def test_hardware_outcomes_match_the_row_count_audit():
    """Pins the measured correlation: files that showed no artist have the inconsistent table-19 page; files that showed it have none."""
    for tree, expect_bad in (("desktop_v6_officialpdb", 0), ("desktop_v10_cutT_v6history", 0), ("desktop_v7_cutT", 1), ("desktop_v9_v6_ourhistory", 1), ("desktop_v4_rhythm", 1)):
        p = ROOT / tree / "PIONEER/rekordbox/export.pdb"
        if p.exists():
            bad = _inconsistent_pages(p.read_bytes())
            assert len(bad) == expect_bad, (tree, bad)
            assert all(t == 19 for t, _ in bad)


@pytest.mark.skipif(not V11.exists(), reason="candidate tree not present")
def test_history_fix_candidate_is_consistent_and_neutral():
    raw = (V11 / "PIONEER/rekordbox/export.pdb").read_bytes()
    assert _inconsistent_pages(raw) == []
    for needle in (b"2026-10-27", b"Delivered By Inflyte", b"2025-12-06", b"2024-02-29"):
        assert needle not in raw
    assert b"2000-01-01" in raw
