"""The one-track PWV4 probe is diagnostic only: its scope is pinned, and the production code must never reference it."""
import struct
import subprocess
import sys
from pathlib import Path

import numpy as np
import pytest

ROOT = Path(__file__).resolve().parent.parent
V13, V15 = ROOT / "desktop_v13_waveform", ROOT / "desktop_v15_overview_probe"
EXT = "PIONEER/USBANLZ/P03C/000076D8/ANLZ0000.EXT"


def _sections(d):
    o = struct.unpack_from(">I", d, 4)[0]; out = {}
    while o < len(d):
        lh, lt = struct.unpack_from(">II", d, o + 4); out[d[o:o + 4].decode()] = (d[o:o + lh], d[o + lh:o + lt]); o += lt
    return out


def test_production_code_does_not_reference_the_probe():
    for p in (ROOT / "src").rglob("*.py"):
        assert "overview_probe" not in p.read_text(), p


@pytest.mark.skipif(not (V13.exists() and V15.exists()), reason="trees not present")
def test_probe_changes_only_the_zsak_pwv4_body():
    files = sorted(p.relative_to(V13) for p in V13.rglob("*") if p.is_file() and p.name != ".DS_Store")
    diff = [f for f in files if (V13 / f).read_bytes() != (V15 / f).read_bytes()]
    assert [f.as_posix() for f in diff] == [EXT]
    a, b = _sections((V13 / EXT).read_bytes()), _sections((V15 / EXT).read_bytes())
    assert [t for t in a if a[t] != b[t]] == ["PWV4"]
    assert a["PWV4"][0] == b["PWV4"][0] and len(a["PWV4"][1]) == len(b["PWV4"][1]) == 7200
    x = np.frombuffer(a["PWV4"][1], np.uint8).reshape(-1, 6); y = np.frombuffer(b["PWV4"][1], np.uint8).reshape(-1, 6)
    assert (x[:, :3] == y[:, :3]).all() and y[:, 3:].max() <= 127
    assert [int(y[s * 100, 3]) for s in range(12)] == [110, 14] * 6
