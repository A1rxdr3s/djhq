"""Row-count consistency check, the seed chain, and the writer's gate."""
import struct
import subprocess
import sys
from pathlib import Path

import pytest

from set2go.pdbcheck import inconsistent_pages

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "src/set2go/data"


def test_default_seed_is_consistent():
    assert inconsistent_pages((DATA / "seed_v2.pdb").read_bytes()) == []


def test_earlier_seeds_keep_their_known_inconsistency_and_are_unmodified():
    assert [t for t, _, _ in inconsistent_pages((DATA / "subcol_seed.pdb").read_bytes())] == [19]
    assert [t for t, _, _ in inconsistent_pages((DATA / "empty_seed.pdb").read_bytes())] == [19]
    assert len(inconsistent_pages((DATA / "clean_seed.pdb").read_bytes())) == 8


def test_checker_detects_a_cleared_presence_bit():
    raw = bytearray((DATA / "seed_v2.pdb").read_bytes())
    # clear the live slot of table 19's data page: the header still declares 1 valid row
    for i in range(struct.unpack_from("<I", raw, 8)[0]):
        t, _, first, last = struct.unpack_from("<IIII", raw, 28 + i * 16)
        if t == 19:
            struct.pack_into("<H", raw, last * 4096 + 4096 - 4, 0)
    assert [(t, p) for t, p, _ in inconsistent_pages(bytes(raw))] == [(19, 40)]


def test_checker_detects_a_wrong_declared_count():
    raw = bytearray((DATA / "seed_v2.pdb").read_bytes())
    for i in range(struct.unpack_from("<I", raw, 8)[0]):
        t, _, first, last = struct.unpack_from("<IIII", raw, 28 + i * 16)
        if t == 6:                                              # COLORS: 8 rows, bump the declared count
            o = last * 4096
            v = raw[o + 0x18] | raw[o + 0x19] << 8 | raw[o + 0x1A] << 16
            v = (v & 0x1FFF) | (((v >> 13) + 1) << 13)
            raw[o + 0x18], raw[o + 0x19], raw[o + 0x1A] = v & 255, (v >> 8) & 255, (v >> 16) & 255
    assert [t for t, _, _ in inconsistent_pages(bytes(raw))] == [6]


def test_seed_v2_differs_from_subcol_only_in_the_table19_page():
    a, b = (DATA / "subcol_seed.pdb").read_bytes(), (DATA / "seed_v2.pdb").read_bytes()
    assert len(a) == len(b)
    d = [i for i in range(len(a)) if a[i] != b[i]]
    assert {i // 4096 for i in d} == {40} and len(d) == 11
    assert sum(1 for i in d if i % 4096 == 0xFFC) == 1                         # exactly one presence-bit byte
    assert b"2024-02-29" not in b and b"2000-01-01" in b                       # neutral constant, no fixture date


def test_seed_v2_equals_the_hardware_validated_seed():
    exp = ROOT / "experiments/hist_fix_seed.pdb"
    if not exp.exists():
        pytest.skip("experimental seed not present")
    assert exp.read_bytes() == (DATA / "seed_v2.pdb").read_bytes()


def test_stage_script_regenerates_the_identical_seed(tmp_path):
    before = (DATA / "seed_v2.pdb").read_bytes()
    r = subprocess.run([sys.executable, "-I", str(ROOT / "scripts/make_history_fix_seed.py")], capture_output=True, text=True)
    assert r.returncode == 0, r.stderr[-300:]
    assert (DATA / "seed_v2.pdb").read_bytes() == before                       # regeneration is deterministic


def test_writer_refuses_an_inconsistent_seed(tmp_path):
    import wave
    import numpy as np
    from set2go.export import TrackSpec, export_library
    sr = 44100
    x = (np.sin(2 * np.pi * 220 * np.arange(sr * 12) / sr) * 0.5 * 32767).astype("<i2")
    wav = tmp_path / "t.wav"
    with wave.open(str(wav), "wb") as f:
        f.setnchannels(2); f.setsampwidth(2); f.setframerate(sr); f.writeframes(np.stack([x, x], 1).tobytes())
    with pytest.raises(RuntimeError, match="declared row count"):
        export_library({"P": [TrackSpec(wav)]}, tmp_path / "bad", analyse=False, seed_path=DATA / "subcol_seed.pdb")
    r = export_library({"P": [TrackSpec(wav)]}, tmp_path / "good", analyse=False)             # default seed
    assert inconsistent_pages((r.dest_dir / "PIONEER/rekordbox/export.pdb").read_bytes()) == []
