import numpy as np
from set2go import waveform_v2 as W


def test_pwv4_v3_exponents_and_range():
    sr = 44100
    t = np.arange(sr * 12) / sr
    mono = (0.5 * np.sin(2 * np.pi * 80 * t) + 0.05 * np.sin(2 * np.pi * 5000 * t)).astype(np.float32)
    v2, v3 = W.pwv4_v2(mono, sr, 1200).astype(float), W.pwv4_v3(mono, sr, 1200).astype(float)
    assert v3.shape == (1200, 3) and v3.max() <= 127
    assert np.array_equal(v3[:, 0], v2[:, 0])                         # low band stays linear
    mid = slice(100, 1100)
    assert np.all(v3[mid, 2] <= v2[mid, 2] + 1)                       # squared band is never above the linear one
