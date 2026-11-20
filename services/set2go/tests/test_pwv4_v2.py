import numpy as np
from set2go import waveform_v2 as W


def test_pwv4_v2_shape_range_and_strongest_band():
    sr = 44100
    t = np.arange(sr * 12) / sr
    mono = (0.5 * np.sin(2 * np.pi * 80 * t)).astype(np.float32)          # pure low tone
    lv = W.pwv4_v2(mono, sr, 1200)
    assert lv.shape == (1200, 3) and lv.dtype == np.uint8 and lv.max() == 127
    assert lv[:, 0].max() == 127 and lv[:, 2].max() < 10                    # low band strongest, high band ~silent
