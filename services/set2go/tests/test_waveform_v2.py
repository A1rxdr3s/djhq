"""waveform_v2 is experimental: tests pin its rules so a refactor cannot silently change them."""
import numpy as np

from set2go import waveform_v2 as W

SR = 44100


def _tone(freq, dur=2.0, amp=0.8):
    t = np.arange(int(dur * SR)) / SR
    return (amp * np.sin(2 * np.pi * freq * t)).astype(np.float32)


def test_frame_edges_cover_the_signal_exactly():
    n, e = W.frame_edges(SR * 3, SR)
    assert n == 450 and e[0] == 0 and e[-1] == SR * 3 and np.all(np.diff(e) > 0)


def test_frame_peak_matches_a_plain_loop():
    x = (np.random.RandomState(1).rand(SR) * 2 - 1).astype(np.float32)
    n, e = W.frame_edges(len(x), SR)
    ref = np.array([np.abs(x[e[i]:e[i + 1]]).max() for i in range(n)])
    assert np.array_equal(W._frame_peak(x, e), ref)


def test_height_is_squared_peak_scaled_to_31():
    x = np.concatenate([_tone(100, 1.0, 1.0), _tone(100, 1.0, 0.5)])
    d = W.detail_v2(x, SR)
    assert d.height.max() == 31 and d.height.min() == 8             # 31 * 0.5**2 = 7.75 -> 8
    assert d.height[:100].min() == 31 and abs(int(d.height[-100:].max()) - 8) <= 1


def test_height_uses_the_full_5_bit_range_unlike_the_old_cap_of_25():
    assert W.detail_v2(_tone(80, 1.0, 1.0), SR).height.max() == 31


def test_colour_channels_follow_the_band():
    low = W.detail_v2(_tone(60, 1.0), SR).rgb[10:-10]
    high = W.detail_v2(_tone(6000, 1.0), SR).rgb[10:-10]
    assert low[:, 0].min() == 7 and low[:, 2].max() <= 1             # R = low band dominates a bass tone
    assert high[:, 2].min() == 7 and high[:, 0].max() <= 1           # B = high band dominates a treble tone


def test_red_channel_is_produced_unlike_the_old_model():
    assert W.detail_v2(_tone(60, 1.0), SR).rgb[:, 0].max() == 7


def test_pwv5_packing_round_trips():
    d = W.detail_v2(_tone(1000, 1.0), SR)
    w = np.frombuffer(W.pack_pwv5(d), ">u2")
    assert np.array_equal((w >> 2) & 31, d.height) and np.array_equal((w >> 13) & 7, d.rgb[:, 0])
    assert np.array_equal((w >> 10) & 7, d.rgb[:, 1]) and np.array_equal((w >> 7) & 7, d.rgb[:, 2])


def test_silence_gives_zero_height_and_no_colour():
    d = W.detail_v2(np.zeros(SR, np.float32), SR)
    assert d.height.max() == 0 and d.rgb.max() == 0
