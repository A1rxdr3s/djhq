"""Beat This! consistency/combination logic on synthetic raw predictions (no torch needed)."""
import numpy as np

from set2go.rhythm import ModelRaw, build_rhythm, check_consistency


def _raw(bpm, anchor=0.37, dur=120, jitter_ms=5, drop=(), double=(), bar_phase=0, seed=0):
    per = 60 / bpm
    rng = np.random.RandomState(seed)
    k = np.arange(int(dur / per))
    t = anchor + k * per + rng.randn(len(k)) * jitter_ms / 1000
    keep = np.array([i not in drop for i in k])
    beats = list(t[keep]) + [t[i] + per / 2 for i in double]
    beats = sorted(beats)
    downs = [anchor + (i * 4 + bar_phase) * per for i in range(len(k) // 4 - 1)]
    return ModelRaw(beats, downs)


def test_consistent_model_gives_grid_and_bar_origin():
    r = build_rhythm(_raw(128.0, bar_phase=0), 128.0)
    assert r.consistency.status == "consistent" and r.anchor_s is not None
    assert abs(((r.anchor_s - 0.37 + 0.234) % 0.46875) - 0.234) < 0.012
    assert r.bar_origin == 1 and r.downbeat_majority_share == 1.0


def test_bar_origin_follows_majority_phase():
    # downbeats sit on grid index 2 -> anchor beat is beat number 3 of its bar
    r = build_rhythm(_raw(128.0, bar_phase=2), 128.0)
    assert r.bar_origin == 3


def test_model_loses_beat_is_not_forced_onto_grid():
    raw = _raw(125.0, dur=300, drop=set(range(150, 280)))   # 130 beats missing mid-track
    c = check_consistency(raw, 125.0)
    assert c.status == "inconsistent" and c.longest_bad_run > 8
    r = build_rhythm(raw, 125.0)
    assert r.anchor_s is None and r.bar_origin is None and "unavailable" in r.downbeat_status


def test_isolated_glitches_keep_grid_but_are_reported():
    raw = _raw(124.0, dur=400, drop={100}, double={200})   # 3 odd intervals in ~800 = 0.4 %
    r = build_rhythm(raw, 124.0)
    assert r.consistency.status == "consistent" and r.consistency.bad_regions_s and r.notes


def test_tempo_disagreement_blocks_combination():
    r = build_rhythm(_raw(128.0), 125.0)          # Fourier says 125, model says 128
    assert r.consistency.status == "inconsistent"
    assert any("Fourier" in x for x in r.consistency.reasons)


def test_unstable_downbeats_are_labelled():
    raw = _raw(128.0)
    per = 60 / 128.0
    raw.downbeats = [0.37 + (i * 4 + (2 if i % 3 == 0 else 0)) * per for i in range(len(raw.downbeats))]
    r = build_rhythm(raw, 128.0)
    assert r.downbeat_status.startswith("model_predicted_unstable") and r.downbeat_majority_share < 0.9
