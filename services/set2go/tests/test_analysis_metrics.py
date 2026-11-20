import numpy as np
from set2go.analysis import metrics as M


def test_bpm_exact_and_octave_classes():
    assert M.bpm_metrics(128.2, 128.0)["class"] == "exact"
    assert M.bpm_metrics(64.0, 128.0)["class"] == "half"
    assert M.bpm_metrics(256.0, 128.0)["class"] == "double"
    assert M.bpm_metrics(192.0, 128.0)["class"] == "three_halves"
    assert M.bpm_metrics(131.0, 128.0)["class"] == "other"          # 2.3 % off is a plain error, not an octave error
    r = M.bpm_metrics(127.0, 128.0)
    assert r["abs_err_bpm"] == 1.0 and r["signed_err_bpm"] == -1.0


def test_beat_timing_known_offset_and_drift():
    period = 60 / 128
    ref = 0.2 + np.arange(400) * period
    est = ref + 0.020                                        # constant +20 ms
    r = M.beat_timing(est, ref, period)
    assert abs(r["offset_ms_start"] - 20) < 0.01 and abs(r["offset_ms_end"] - 20) < 0.01 and abs(r["drift_ms"]) < 0.01
    assert r["f_measure"] == 1.0
    est2 = ref + np.linspace(0, 0.060, len(ref))             # grows to +60 ms: a drift, not an offset
    r2 = M.beat_timing(est2, ref, period)
    assert 30 < r2["drift_ms"] < 60 and r2["offset_ms_start"] < r2["offset_ms_mid"] < r2["offset_ms_end"]


def test_beat_timing_whole_beat_shift_is_not_matched_as_correct():
    period = 60 / 128
    ref = np.arange(200) * period
    r = M.beat_timing(ref + period, ref, period)             # shifted by exactly one beat: matching window is < half a beat
    assert r["matched"] >= 6 and abs(r["offset_ms_start"]) < 1       # matches the NEXT ref beat (identical grid), offset ~0
    # but a half-beat shift cannot be matched within the window: no pairs
    r2 = M.beat_timing(ref + 0.5 * period, ref, period)
    assert r2.get("matched", 0) < 6 or r2["f_measure"] < 0.1


def test_downbeat_phase_separate_from_timing():
    period = 60 / 128
    ref = np.arange(200) * period
    ref_n = np.arange(200) % 4 + 1
    est_n = (np.arange(200) + 2) % 4 + 1                      # same beat times, bar origin two beats off
    r = M.downbeat_phase(ref, est_n, ref, ref_n, period)
    assert r["majority_shift_beats"] == 2 and not r["correct_bar_origin"] and r["share"] == 1.0
    assert M.beat_timing(ref, ref, period)["f_measure"] == 1.0          # timing is perfect while the downbeat is wrong
    assert M.downbeat_phase(ref, ref_n, ref, ref_n, period)["correct_bar_origin"]


def test_downbeat_stability_reports_where_minority_phases_sit():
    period = 0.5
    anchor = 0.0
    bars = np.arange(60) * 4 * period
    db = bars.copy()
    db[40:] += 2 * period                                    # last third of the track sits a half-bar late
    r = M.downbeat_stability(db, period, anchor)
    assert 0.6 < r["majority_share"] < 0.7
    assert r["segments"][0]["share_of_global_majority"] == 1.0 and r["segments"][-1]["share_of_global_majority"] == 0.0
