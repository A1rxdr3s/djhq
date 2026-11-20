"""The hardware-tested desktop_v4_rhythm configuration must stay reproducible from the frozen raw predictions.

Uses frozen/desktop_v4_rhythm (read-only evidence): its raw model output and sidecar. No torch, no audio decode needed for the
decision logic; audio is only used for the optional kick refinement, which is skipped if the test tracks are absent.
"""
import json
from pathlib import Path

import pytest

from set2go.grid import beats_from_grid, effective_grid
from set2go.rhythm import build_rhythm, check_consistency, load_raw

ROOT = Path(__file__).resolve().parent.parent
FROZEN = ROOT / "frozen" / "desktop_v4_rhythm"
pytestmark = pytest.mark.skipif(not FROZEN.exists(), reason="frozen baseline not present")


def _grids():
    return json.loads((FROZEN / "GRIDS.json").read_text())


def _raw(name):
    return load_raw(FROZEN / "raw_predictions" / f"{name}.json")


def test_frozen_files_are_read_only_and_listed():
    listed = {l.split("  ", 1)[1].strip().removeprefix("./") for l in (FROZEN / "FROZEN_FILES.sha256").read_text().splitlines() if l}
    present = {p.relative_to(FROZEN).as_posix() for p in FROZEN.rglob("*") if p.is_file() and p.name != "FROZEN_FILES.sha256"}
    assert present == listed


def test_every_track_stays_needs_review():
    for name, e in _grids().items():
        assert effective_grid(e["auto"], None).review == "needs_review", name


def test_consistency_decisions_match_the_tested_export():
    status = {n: check_consistency(_raw(n), e["auto"]["bpm"]).status for n, e in _grids().items()}
    inconsistent = sorted(n for n, s in status.items() if s == "inconsistent")
    assert len(inconsistent) == 1 and inconsistent[0].startswith("Alex Preston")
    assert all(s == "consistent" for n, s in status.items() if not n.startswith("Alex Preston"))


def test_downbeat_labels_match_the_tested_export():
    for name, e in _grids().items():
        if name.startswith("Alex Preston"):
            assert e["auto"]["phase_status"] == "model_inconsistent"
            assert e["auto"]["downbeat"].startswith("unavailable")
            continue
        r = build_rhythm(_raw(name), e["auto"]["bpm"])
        assert r.downbeat_status == e["auto"]["downbeat"], name
    unstable = {n for n, e in _grids().items() if "unstable" in e["auto"]["downbeat"]}
    assert {k.split(" - ")[0] for k in unstable} == {"01 1A", "Chris Valencia", "jairo delli", "Sophia Guerrero"}


def test_exported_anchor_and_bar_origin_reproduce():
    for name, e in _grids().items():
        if name.startswith("Alex Preston"):
            continue
        a = e["auto"]
        r = build_rhythm(_raw(name), a["bpm"])           # unrefined anchor; the sidecar anchor includes the kick correction
        assert r.bar_origin == a["bar_origin"], name
        corr = (a["kick_corr_ms"] or 0.0)
        assert abs((r.anchor_s * 1000 + corr) % (60000 / a["bpm"]) - a["anchor_ms"]) < 0.2, name


def test_pqtz_is_generated_from_the_effective_grid():
    e = _grids()["Snoop Dogg, HUGEL - H.O.U.S.E (Extended Mix) [Make The Girls Dance Records].aiff"]["auto"]
    g = effective_grid(e, None)
    b = beats_from_grid(g, 300.9)
    assert b[0].time_ms == round(e["anchor_ms"]) and b[0].beat_number == e["bar_origin"]
    assert all(x.tempo_bpm100 == round(e["bpm"] * 100) for x in b)


def test_manual_override_still_wins_and_marks_reviewed():
    e = next(iter(_grids().values()))["auto"]
    g = effective_grid(e, {"bar_origin": 3, "note": "checked by ear"})
    assert (g.review, g.bar_origin, g.downbeat) == ("reviewed", 3, "manual")


def test_auto_backend_resolution_without_running_the_model(tmp_path, monkeypatch):
    """`auto` picks beat_this only when the optional env exists, and the choice is recorded per track."""
    import wave
    import numpy as np
    from set2go import rhythm
    from set2go.export import TrackSpec, export_library

    sr = 44100
    x = np.zeros(sr * 12)
    for t in np.arange(0.3, 11.5, 0.5):
        i = int(t * sr); x[i:i + 2000] += np.sin(2 * np.pi * 60 * np.arange(2000) / sr) * np.exp(-np.arange(2000) / 400)
    s = (x / np.abs(x).max() * 0.8 * 32767).astype("<i2")
    wav = tmp_path / "t.wav"
    with wave.open(str(wav), "wb") as f:
        f.setnchannels(2); f.setsampwidth(2); f.setframerate(sr); f.writeframes(np.stack([s, s], 1).tobytes())
    monkeypatch.setattr(rhythm, "available", lambda: False)
    r = export_library({"P": [TrackSpec(wav)]}, tmp_path / "o", analyse=True)          # default = auto
    assert r.report["t.wav"]["rhythm_backend"] == "fourier"


def test_unknown_backend_is_rejected(tmp_path):
    from set2go.export import TrackSpec, export_library
    with pytest.raises(ValueError, match="unknown rhythm_backend"):
        export_library({"P": []}, tmp_path / "o", rhythm_backend="bogus")
