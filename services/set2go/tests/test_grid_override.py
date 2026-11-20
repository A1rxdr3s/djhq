"""Manual grid override: tempo / anchor / beat-one propagate into PQTZ and PDB; audio untouched."""
import hashlib
import json
import struct
import wave
from pathlib import Path

import numpy as np
import pytest
from rekordbox_pdb.pdb import Database

from set2go.export import TrackSpec, export_library, _anlz_dirs
from set2go.grid import Grid, beats_from_grid, effective_grid

SR = 44100


def _track(path: Path, bpm=128.0, t0=0.4, dur=30.0):
    x = np.zeros(int(dur * SR)); per = 60 / bpm; t = t0
    while t < dur - 0.5:
        i = int(round(t * SR)); tt = np.arange(int(0.12 * SR)) / SR
        x[i:i + len(tt)] += np.sin(2 * np.pi * (55 + 90 * np.exp(-tt * 40)) * tt) * np.exp(-tt * 25)
        t += per
    s = (x / np.abs(x).max() * 0.8 * 32767).astype("<i2")
    with wave.open(str(path), "wb") as f:
        f.setnchannels(2); f.setsampwidth(2); f.setframerate(SR)
        f.writeframes(np.stack([s, s], 1).tobytes())


def _pqtz(root: Path, file_path: str):
    hi, lo = _anlz_dirs(file_path)
    d = (root / "PIONEER/USBANLZ" / hi / lo / "ANLZ0000.DAT").read_bytes()
    off = struct.unpack_from(">I", d, 4)[0]
    while off < len(d):
        tag = d[off:off + 4]; lh, lt = struct.unpack_from(">II", d, off + 4)
        if tag == b"PQTZ":
            body = d[off + lh:off + lt]
            return [struct.unpack_from(">HHI", body, i * 8) for i in range(len(body) // 8)]
        off += lt


def test_beats_from_grid_numbering_and_range():
    g = Grid(bpm=120.0, anchor_ms=500, bar_origin=3)
    b = beats_from_grid(g, 10)
    assert b[0].time_ms == 0 and b[1].time_ms == 500
    # anchor beat (500 ms) carries beat number 3; the beat before it carries 2
    assert [x.beat_number for x in b[:4]] == [2, 3, 4, 1]
    assert all(x.tempo_bpm100 == 12000 for x in b)


def test_effective_grid_states():
    auto = {"bpm": 128.0, "anchor_ms": 3, "bar_origin": 1, "phase_status": "uncertain", "downbeat": "not_detected"}
    g = effective_grid(auto, None)
    assert (g.source, g.review, g.downbeat) == ("auto", "needs_review", "not_detected")
    g = effective_grid(auto, {"bar_origin": 2})
    assert (g.source, g.review, g.downbeat) == ("mixed", "reviewed", "manual")
    # changing tempo/anchor alone does not clear the bar-start uncertainty
    g = effective_grid(auto, {"bpm": 127.5, "anchor_ms": 10})
    assert g.review == "needs_review"
    with pytest.raises(ValueError):
        effective_grid(auto, {"bar_origin": 5})


def test_override_round_trip(tmp_path):
    src = tmp_path / "src"; src.mkdir(); wav = src / "t.wav"; _track(wav)
    before = hashlib.sha256(wav.read_bytes()).hexdigest()
    spec = {"P": [TrackSpec(wav, title="T", artist="A")]}
    r1 = export_library(spec, tmp_path / "out1", rhythm_backend="fourier")
    sidecar = tmp_path / "out1_GRIDS.json"
    data = json.loads(sidecar.read_text())
    assert data["t.wav"]["sha256"] == before and r1.report["t.wav"]["grid_review"] == "needs_review"
    auto = data["t.wav"]["auto"]
    data["t.wav"]["manual"] = {"bpm": 127.0, "anchor_ms": auto["anchor_ms"] + 468, "bar_origin": 2, "note": "checked by ear"}
    sidecar.write_text(json.dumps(data))
    r2 = export_library(spec, tmp_path / "out2", overrides_path=sidecar, rhythm_backend="fourier")
    q = _pqtz(tmp_path / "out2", "/Contents/t.wav")
    assert q[0][1] == 12700 and q[0][2] >= 0
    first_anchor = next(b for b in q if abs(b[2] - round(auto["anchor_ms"] + 468)) <= 1)
    assert first_anchor[0] == 2                                   # beat-one origin propagated
    assert Database.from_file(tmp_path / "out2/PIONEER/rekordbox/export.pdb").tracks[0].tempo == 12700
    assert r2.report["t.wav"]["grid_source"] == "manual" and r2.report["t.wav"]["grid_review"] == "reviewed"
    assert hashlib.sha256(wav.read_bytes()).hexdigest() == before                      # source untouched
    assert hashlib.sha256((tmp_path / "out2/Contents/t.wav").read_bytes()).hexdigest() == before
    # re-running with the sidecar keeps the manual entry
    export_library(spec, tmp_path / "out3", overrides_path=sidecar, rhythm_backend="fourier")
    assert "manual" in json.loads((tmp_path / "out3_GRIDS.json").read_text())["t.wav"]


def test_override_for_different_audio_is_refused(tmp_path):
    src = tmp_path / "src"; src.mkdir(); wav = src / "t.wav"; _track(wav)
    sidecar = tmp_path / "g.json"
    sidecar.write_text(json.dumps({"t.wav": {"sha256": "0" * 64, "manual": {"bar_origin": 2}}}))
    with pytest.raises(ValueError, match="different audio"):
        export_library({"P": [TrackSpec(wav)]}, tmp_path / "o", overrides_path=sidecar, rhythm_backend="fourier")
