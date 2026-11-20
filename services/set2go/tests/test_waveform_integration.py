import numpy as np
from set2go import waveform as W1, waveform_v2 as W2


def test_compute_waveforms_uses_accepted_rules(tmp_path, monkeypatch):
    sr = 44100
    t = np.arange(sr * 14) / sr
    mono = (0.4 * np.sin(2 * np.pi * 70 * t) * (1 + np.sin(2 * np.pi * 2 * t)) / 2 + 0.05 * np.sin(2 * np.pi * 4000 * t)).astype(np.float32)
    monkeypatch.setattr(W1, "_read_mono_float32", lambda p: (mono, sr))
    wf = W1.compute_waveforms(tmp_path / "x.wav")
    d = W2.detail_v2(mono, sr)
    assert wf.pwv3 == W2.pack_pwv3(d) and wf.pwv5 == W2.pack_pwv5(d) and wf.n_detail == len(d.height)
    p4 = np.frombuffer(wf.pwv4, np.uint8).reshape(1200, 6)
    assert np.array_equal(p4[:, 3:6], W2.pwv4_v3(mono, sr, 1200))
    old = np.frombuffer(W1._pack_pwv4(mono, sr), np.uint8).reshape(1200, 6)
    assert np.array_equal(p4[:, :3], old[:, :3])                       # bytes 0-2 keep the earlier behaviour
