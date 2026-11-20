import numpy as np
from set2go import bpm_detect as B
from set2go.analysis.lowmem import onset_envelope_blocked


def _clicks(sr=22050, bpm=127.0, secs=40):
    n = int(sr * secs)
    x = (np.random.default_rng(1).standard_normal(n) * 0.01).astype(np.float32)
    per = int(sr * 60 / bpm)
    for i in range(0, n - 400, per):
        x[i:i + 300] += (np.hanning(300) * np.sin(2 * np.pi * 90 * np.arange(300) / sr)).astype(np.float32)
    return x, sr


def test_blocked_envelope_equals_original_for_any_block_size():
    x, sr = _clicks()
    ref = B._onset_envelope_full(x, sr)
    for bf in (7, 64, 2048, 100000):                          # block boundaries must not change the result (incl. a block of 7 frames)
        got = onset_envelope_blocked(x, sr, block_frames=bf)
        assert got[2] == ref[2]
        for a, b in zip(ref[:2], got[:2]):
            assert a.shape == b.shape and np.max(np.abs(a - b)) < 1e-9
    assert B.estimate_tempo(ref[0], ref[2]) == B.estimate_tempo(got[0], got[2])
    assert B._onset_envelope.__defaults__ == (2048,)        # production default is the blocked version
