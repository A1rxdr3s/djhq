"""Beat-phase and tempo behaviour on synthetic audio with known onset times."""
import wave
from pathlib import Path

import numpy as np
import pytest

from set2go.bpm_detect import analyse_beats

SR = 44100


def _make(bpm: float, t0: float, dur: float = 40.0) -> np.ndarray:
    x = np.zeros(int(dur * SR))
    per = 60 / bpm
    t = t0
    rng = np.random.RandomState(1)
    while t < dur - 0.5:
        i = int(round(t * SR))
        tt = np.arange(int(0.12 * SR)) / SR
        x[i:i + len(tt)] += np.sin(2 * np.pi * (55 + 90 * np.exp(-tt * 40)) * tt) * np.exp(-tt * 25)
        h = int(round((t + per / 2) * SR))
        n = int(0.03 * SR)
        x[h:h + n] += 0.3 * rng.randn(n) * np.exp(-np.arange(n) / SR * 150)
        t += per
    return x / np.abs(x).max() * 0.8


def _write(path: Path, x: np.ndarray) -> None:
    s = (x * 32767).astype("<i2")
    with wave.open(str(path), "wb") as f:
        f.setnchannels(2); f.setsampwidth(2); f.setframerate(SR)
        f.writeframes(np.stack([s, s], 1).tobytes())


@pytest.mark.parametrize("bpm,t0", [(128, 0.437), (126, 1.12), (129, 0.9), (124.4, 0.31)])
def test_phase_matches_known_kick_onsets(tmp_path, bpm, t0):
    p = tmp_path / "s.wav"
    _write(p, _make(bpm, t0))
    a = analyse_beats(p)
    per = 60 / bpm
    assert abs(a.bpm - bpm) < 0.05
    err = ((a.beats[0].time_ms / 1000 - t0 + per / 2) % per) - per / 2
    assert abs(err) < 0.008, f"first beat off by {err*1000:.1f} ms"
    # last beat: no cumulative drift
    last = a.beats[-1].time_ms / 1000
    k = round((last - t0) / per)
    assert abs(last - (t0 + k * per)) < 0.010


def test_downbeat_is_never_claimed(tmp_path):
    p = tmp_path / "s.wav"
    _write(p, _make(128, 0.4))
    assert analyse_beats(p).downbeat == "not_detected"


def test_unstructured_audio_is_not_called_corroborated(tmp_path):
    p = tmp_path / "noise.wav"
    _write(p, np.random.RandomState(3).randn(SR * 40) * 0.1)
    a = analyse_beats(p)
    assert a.phase is None or a.phase.status != "corroborated"
