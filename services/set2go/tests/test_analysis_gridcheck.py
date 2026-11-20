"""Experimental opt-in grid decision (analysis/gridcheck.py). Synthetic beat times with known truth; production gate untouched."""
import os
import sys
from pathlib import Path

import numpy as np
import pytest

from set2go import rhythm as Rh
from set2go.analysis import gridcheck as G

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
import analysis_gridcheck_synthetic as S

ACCEPTS = {"accept_audio_grid", "accept_with_gaps", "production_accept"}


def decide(name, seed=0):
    rng = np.random.default_rng(2000 + seed)
    b, tempo, exp = S.drift_scenario(rng) if name == "gradual_drift" else S.scen(name, rng)
    c = Rh.check_consistency(Rh.ModelRaw(list(b), [], 0, 0, ""), tempo)
    return G.evaluate(b, tempo, production_status="inconsistent", model_slope_bpm=c.model_slope_bpm), exp, c


@pytest.mark.parametrize("name", S.NAMES)
@pytest.mark.parametrize("seed", [0, 1, 2])
def test_every_synthetic_scenario_lands_in_its_acceptable_set(name, seed):
    d, exp, _ = decide(name, seed)
    assert d.outcome in exp, (name, d.outcome, d.reasons)


@pytest.mark.parametrize("name", ["half_time_model", "double_time_model", "wrong_audio_tempo_half", "wrong_audio_tempo_double", "audio_tempo_off_by_0.4",
                                  "tempo_change_midway", "tempo_change_short_section", "gradual_drift"])
def test_a_constant_grid_is_never_accepted_where_it_would_be_wrong(name):
    for seed in range(5):
        d, _, _ = decide(name, seed)
        assert d.outcome not in ACCEPTS, (name, seed, d.outcome)
        assert d.reasons                                              # an explicit reason accompanies every non-accept


def test_a_long_missing_run_is_flagged_not_silently_accepted_regression():
    d, _, _ = decide("missing_beats_run_12")
    assert d.outcome == "accept_with_gaps" and d.bad_windows_s and d.detail["missing_runs"]       # the first version accepted this as a clean grid


def test_production_accepted_tracks_are_returned_unchanged():
    rng = np.random.default_rng(0)
    base = S.true_beats()
    per = 60.0 / 128.0
    # Verify across multiple grids that `rhythm.check_consistency` actually accepts:
    # (1) clean grid, (2) 90 ms phase offset, (3) isolated missing beats within the 1% bad-interval limit,
    # and (4) an in-gate model-slope offset (+0.20 BPM <= 0.25 BPM limit) that would fail gridcheck if forced.
    cases = [
        (S.q(base, rng), None),
        (S.q(base + 0.09, rng), None),
        (S.q(np.delete(base, [100, 250, 400]), rng), None),
        (S.q(base, rng), 128.20),
    ]
    for b, slope_override in cases:
        c = Rh.check_consistency(Rh.ModelRaw(list(b), [], 0, 0, ""), 128.0)
        assert c.status == "consistent"
        slope = slope_override if slope_override is not None else c.model_slope_bpm
        d = G.evaluate(b, 128.0, production_status=c.status, model_slope_bpm=slope)
        assert d.outcome == "production_accept" and "unchanged" in d.reasons[0]
        assert d.tempo_bpm == 128.0 and d.model_slope_bpm == slope


def test_slope_gap_is_explained_only_by_identified_local_count_errors():
    # (a) a stretch of 20 split beats (40 half-beat intervals = +20 extra beats against +30.3 slope-implied beats) matches in direction and magnitude -> explained
    b = _beats(); per = 60 / 128.0
    split = np.sort(np.concatenate([b, b[300:320] + per / 2]))
    c = Rh.check_consistency(Rh.ModelRaw(list(_q(split)), [], 0, 0, ""), 128.0)
    d = G.evaluate(_q(split), 128.0, production_status="inconsistent", model_slope_bpm=c.model_slope_bpm)
    assert c.status == "inconsistent"
    assert d.slope_explained is True and d.outcome == "accept_with_gaps"
    assert d.detail["slope_check"]["split_beats_from_short_intervals"] == 20.0
    assert d.detail["slope_check"]["net_local_count_change"] == 20.0
    assert d.detail["slope_check"]["direction_matches"] is True and d.detail["slope_check"]["magnitude_matches"] is True
    # (b) scattered missing/extra beats with NO odd interval are not identified local errors -> a slope gap stays unexplained (the earlier rule explained it circularly)
    rng = np.random.default_rng(0)
    scattered = S.q(np.sort(np.concatenate([np.delete(b, [200, 201, 202]), b[300:302] + per / 2])), rng)
    c2 = Rh.check_consistency(Rh.ModelRaw(list(scattered), [], 0, 0, ""), 128.0)
    d2 = G.evaluate(scattered, 128.0, production_status="inconsistent", model_slope_bpm=c2.model_slope_bpm)
    assert abs(c2.model_slope_bpm - 128.0) > 0.25 and d2.slope_explained is False and d2.outcome == "needs_review"


def test_slope_explanation_requires_matching_direction_and_magnitude():
    b = _beats(); per = 60.0 / 128.0
    # 1. Opposite direction (positive slope gap > +0.25 BPM, but local errors are skipped/missing beats -> net negative): must NOT explain
    skipped_b = _q(np.delete(b, [150, 250, 350, 450, 550]))  # 5 isolated skipped beats -> local_net = -5.0
    d_opp_pos = G.evaluate(skipped_b, 128.0, production_status="inconsistent", model_slope_bpm=129.0)  # +1.0 BPM implies ~+5.0 beats
    assert d_opp_pos.detail["slope_check"]["net_local_count_change"] == -5.0
    assert d_opp_pos.detail["slope_check"]["direction_matches"] is False
    assert d_opp_pos.slope_explained is False and d_opp_pos.outcome == "needs_review"

    # 2. Opposite direction (negative slope gap < -0.25 BPM, but local errors are split/extra beats -> net positive): must NOT explain
    split_5 = _q(np.sort(np.concatenate([b, b[300:305] + per / 2])))  # 5 split beats -> local_net = +5.0
    d_opp_neg = G.evaluate(split_5, 128.0, production_status="inconsistent", model_slope_bpm=127.0)  # -1.0 BPM implies ~-5.0 beats
    assert d_opp_neg.detail["slope_check"]["net_local_count_change"] == 5.0
    assert d_opp_neg.detail["slope_check"]["direction_matches"] is False
    assert d_opp_neg.slope_explained is False and d_opp_neg.outcome == "needs_review"

    # 3. Same negative direction and matching magnitude: negative slope gap (-1.0 BPM -> ~-5.0 beats) with 5 skipped beats (local_net = -5.0) -> explained
    d_neg_ok = G.evaluate(skipped_b, 128.0, production_status="inconsistent", model_slope_bpm=127.0)
    assert d_neg_ok.detail["slope_check"]["direction_matches"] is True and d_neg_ok.detail["slope_check"]["magnitude_matches"] is True
    assert d_neg_ok.slope_explained is True and d_neg_ok.outcome in ACCEPTS

    # 4. Magnitude too small: +3.0 BPM slope gap (~+15.0 implied beats) with only +2 split beats (ratio 2/15 = 0.13 < 0.5) -> needs_review
    split_2 = _q(np.sort(np.concatenate([b, b[300:302] + per / 2])))
    d_small = G.evaluate(split_2, 128.0, production_status="inconsistent", model_slope_bpm=131.0)
    assert d_small.detail["slope_check"]["net_local_count_change"] == 2.0
    assert d_small.detail["slope_check"]["direction_matches"] is True and d_small.detail["slope_check"]["magnitude_matches"] is False
    assert d_small.slope_explained is False and d_small.outcome == "needs_review"

    # 5. Magnitude too large ("a large absolute count alone must not establish an explanation"):
    # +0.35 BPM slope gap (~+1.75 implied beats) with +15 split beats (ratio 15/1.75 = 8.6 > 2.0) -> needs_review
    split_15 = _q(np.sort(np.concatenate([b, b[300:315] + per / 2])))
    d_large = G.evaluate(split_15, 128.0, production_status="inconsistent", model_slope_bpm=128.35)
    assert d_large.detail["slope_check"]["net_local_count_change"] == 15.0
    assert d_large.detail["slope_check"]["direction_matches"] is True and d_large.detail["slope_check"]["magnitude_matches"] is False
    assert d_large.slope_explained is False and d_large.outcome == "needs_review"

    # 6. Cancelling local errors (2 skipped + 2 split -> net 0 against +0.6 BPM slope gap, the FYRE pattern) -> needs_review
    cancel_b = _q(np.sort(np.concatenate([np.delete(b, [150, 250]), b[350:352] + per / 2])))
    d_cancel = G.evaluate(cancel_b, 128.0, production_status="inconsistent", model_slope_bpm=128.6)
    assert d_cancel.detail["slope_check"]["net_local_count_change"] == 0.0
    assert d_cancel.slope_explained is False and d_cancel.outcome == "needs_review"


def test_a_real_tempo_error_is_not_explained_away_as_a_count_error():
    rng = np.random.default_rng(3)
    b = S.true_beats(); per = 60 / S.BPM
    bb = S.q(np.sort(np.concatenate([np.delete(b, [200, 201]), b[300:302] + per / 2])), rng)    # count errors present...
    d = G.evaluate(bb, S.BPM + 0.08, production_status="inconsistent")                            # ...but the audio tempo is also 0.08 BPM wrong (ramp ~37 ms/min)
    assert d.outcome in ("needs_review", "reject") and not (d.slope_explained and d.outcome in ACCEPTS)


def test_too_few_beats_and_missing_input_are_rejected_with_a_reason():
    d = G.evaluate(np.arange(10) * 0.47, 128.0, production_status="inconsistent")
    assert d.outcome == "reject" and "only 10 model beats" in d.reasons[0]


def test_duration_dependent_drift_and_timing_budget_rationale():
    # A 0.02 BPM tempo error at 128 BPM drifts at 0.02 / 128 * 60000 = 9.375 ms/min (~18.8 ms over 2 min, ~46.9 ms over 5 min).
    # With MAX_TOTAL_DRIFT_MS = 30.0 ms, the same 0.02 BPM error passes on a 2-minute track (120 s) and fails on a 5-minute track (300 s).
    t_2min = 0.17 + np.arange(300) * (60.0 / 128.02)
    t_2min = t_2min[t_2min < 120.0]
    d_short = G.evaluate(_q(t_2min), 128.0, production_status="inconsistent")
    assert d_short.outcome == "accept_audio_grid"
    assert abs(d_short.detail["ramp_total_ms_over_track"]) < G.MAX_TOTAL_DRIFT_MS

    t_5min = 0.17 + np.arange(700) * (60.0 / 128.02)
    t_5min = t_5min[t_5min < 300.0]
    d_5min = G.evaluate(_q(t_5min), 128.0, production_status="inconsistent")
    assert d_5min.outcome == "needs_review" and any("residual ramp" in r for r in d_5min.reasons)
    assert abs(d_5min.detail["ramp_total_ms_over_track"]) > G.MAX_TOTAL_DRIFT_MS
    # Isolating check: on the 5-minute 0.02 BPM case, fit is 1.0 and no window is bad, so the duration-aware ramp check is load-bearing
    assert d_5min.fit_fraction == 1.0 and not d_5min.bad_windows_s


def test_0_005_bpm_estimator_resolution_error_is_duration_dependent_not_assumed_to_always_pass():
    # At 120 BPM, a 1-step tempogram resolution error (0.005 BPM) drifts at 0.005 / 120 * 60000 = 2.5 ms/min.
    # Over 5 minutes (300 s) that is 12.5 ms <= 30.0 ms -> passes.
    # Over 15 minutes (900 s) that is 37.5 ms > 30.0 ms -> flagged as needs_review (not assumed to always pass).
    t_5min = 0.17 + np.arange(650) * (60.0 / 120.005)
    t_5min = t_5min[t_5min < 300.0]
    d_5min = G.evaluate(_q(t_5min, jitter=1.0), 120.0, production_status="inconsistent")
    assert d_5min.outcome == "accept_audio_grid"

    t_15min = 0.17 + np.arange(1900) * (60.0 / 120.005)
    t_15min = t_15min[t_15min < 900.0]
    d_15min = G.evaluate(_q(t_15min, jitter=1.0), 120.0, production_status="inconsistent")
    assert d_15min.outcome == "needs_review" and any("residual ramp" in r for r in d_15min.reasons)
    assert d_15min.detail["estimator_resolution_drift_ms"] == 37.5
    assert G.max_tempo_error_bpm(120.0, 900.0) < G.TEMPO_RESOLUTION_BPM


def test_the_production_gate_is_unchanged():
    src = Path(Rh.__file__).read_bytes()
    assert b"def check_consistency" in src and b"MAX_TEMPO_DISAGREE_BPM = 0.25" in src and b"gridcheck" not in src      # production code does not reference the experiment


# ---- isolating tests: each safeguard is exercised by an input that ONLY that safeguard can catch ----
def _beats(bpm=128.0, dur=300.0, phase=0.17):
    return phase + np.arange(int((dur - phase) / (60 / bpm))) * (60 / bpm)


def _q(t, seed=0, jitter=4.0):
    rng = np.random.default_rng(seed)
    return np.round((t + rng.normal(0, jitter / 1000, len(t))) / 0.02) * 0.02


def test_larger_tempo_errors_are_rejected_with_drift_and_window_reasons():
    # A 0.05 BPM tempo error at 128 BPM drifts ~117 ms over five minutes (~23.4 ms/min vs 6.0 ms/min limit)
    t = 0.17 + np.arange(700) * (60 / 128.05); t = t[t < 300]
    d = G.evaluate(_q(t), 128.0, production_status="inconsistent")
    assert d.outcome in ("needs_review", "reject") and d.outcome not in ACCEPTS and d.reasons


def test_slope_gap_is_not_explained_when_the_ramp_is_large_even_with_count_errors():
    t = 0.17 + np.arange(700) * (60 / 128.07); t = t[t < 300]
    t = np.sort(np.concatenate([np.delete(t, [200, 201, 202]), t[300:302] + 0.234]))             # a count discrepancy exists ...
    d = G.evaluate(_q(t), 128.0, production_status="inconsistent", model_slope_bpm=128.6)          # ... and a slope gap > 0.25 BPM, but a large ramp
    assert not d.slope_explained and d.outcome not in ACCEPTS


def test_window_offset_safeguard_catches_a_phase_shifted_section():
    b = _beats(); b2 = b.copy(); b2[200:260] += 0.055                                                # a 28 s section shifted by 55 ms (a tempo-change-like phase jump)
    d = G.evaluate(_q(b2), 128.0, production_status="inconsistent")
    assert d.bad_windows_s, d.reasons                                                                 # the shifted windows are reported
    assert d.outcome != "accept_audio_grid"


def test_fit_coverage_guard_rejects_beats_that_do_not_follow_the_audio_grid():
    rng = np.random.default_rng(4)
    b = np.sort(rng.uniform(0, 300, 640))                                                              # uncorrelated beats: no grid at all
    d = G.evaluate(b, 128.0, production_status="inconsistent")
    assert d.outcome == "reject" and "do not follow the audio tempo grid" in " ".join(d.reasons)


def test_a_clean_grid_with_a_small_slope_gap_and_no_count_discrepancy_stays_unexplained():
    d = G.evaluate(_q(_beats()), 128.0, production_status="inconsistent", model_slope_bpm=128.6)     # perfect beats, nothing explains a model slope of 128.6
    assert d.slope_explained is False and d.outcome == "needs_review" and "no IDENTIFIED local beat-count error" in " ".join(d.reasons)


def test_bad_window_fraction_limit_is_load_bearing_a_shifted_section_is_not_accepted():
    # found by a probe search: with the limit disabled 92 of 156 probes turned a non-accept into an accept, e.g. a 10 s section shifted by 55-120 ms.
    b = _beats(); n = int(10 / (60 / 128)); b2 = b.copy(); b2[250:250 + n] += 0.08
    d = G.evaluate(_q(b2), 128.0, production_status="inconsistent")
    assert d.outcome == "needs_review" and d.bad_windows_s
    assert any("do not fit the grid" in r or "window" in r for r in d.reasons)
    old = G.MAX_BAD_WINDOW_FRACTION
    try:
        G.MAX_BAD_WINDOW_FRACTION = 1.1                                                    # disabling the limit must change the outcome: proves the test can fail
        assert G.evaluate(_q(b2), 128.0, production_status="inconsistent").outcome in ACCEPTS
    finally:
        G.MAX_BAD_WINDOW_FRACTION = old


def test_redundant_limits_are_documented_as_redundant():
    # global fit/coverage limits when `not bad` are redundant with window/reject guards; the duration-aware ramp limit is load-bearing
    assert "REDUNDANT" in G.__doc__ and "LOAD-BEARING" in G.__doc__


def test_reproducible_eval_runner_uses_saved_raw_predictions_and_protects_historical_files(tmp_path):
    import analysis_gridcheck_eval as E
    # Must refuse to overwrite historical gridcheck_experiment.json or sealed predictions_RAW.json
    b1 = ROOT / "eval/analysis/blind1"
    if not b1.exists():
        fallback = Path(os.environ.get("SET2GO_STANDALONE_DIR", "/Users/andresherrera/Developer/Set2Go")) / "eval/analysis/blind1"
        if fallback.exists():
            b1 = fallback
    assert E.main(["--out", str(b1 / "gridcheck_experiment.json")]) == 2
    assert E.main(["--out", str(b1 / "predictions_RAW.json")]) == 2
    out_file = tmp_path / "gridcheck_eval_test.json"
    assert E.main(["--out", str(out_file)]) == 0
    rep = E.json.loads(out_file.read_text())
    assert "USED DEVELOPMENT / REGRESSION DATA" in rep["dataset_status"]
    assert rep["inputs"]["audio_decoded_during_eval"] is False
    assert "src/set2go/analysis/gridcheck.py" in rep["code_hashes_sha256"]
    assert len(rep["tracks"]) == 5
    fyre = rep["tracks"]["Sanchez (UK) - FYRE [Time Bandits].aiff"]["revision"]
    eyes = rep["tracks"]["The Reactivitz - Eyes Low (Original Mix) [There Is A Light].aiff"]["revision"]
    assert fyre["decision"] == "needs_review" and fyre["slope_explained"] is False
    assert eyes["decision"] == "accept_with_gaps" and eyes["slope_explained"] is True
    assert eyes["slope_check"]["split_beats_from_short_intervals"] == 9.0
    assert eyes["slope_check"]["net_local_count_change"] == 9.0
