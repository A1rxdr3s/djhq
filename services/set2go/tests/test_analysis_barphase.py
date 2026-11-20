import numpy as np
from set2go.analysis import barphase as BP


def test_phase_vote_finds_known_accent_and_reports_flat_as_undecided():
    n = 240
    v = np.ones(n)
    v[2::4] = 3.0                                             # accent on the third beat of every bar
    res = BP.phase_vote(v, nseg=4)
    assert [s["phase"] for s in res["segments"]] == [2, 2, 2, 2] and all(s["contrast"] > 1 for s in res["segments"])
    flat = BP.phase_vote(np.ones(n) + 0.001 * np.random.default_rng(0).standard_normal(n), nseg=4)
    assert all(s["phase"] is None for s in flat["segments"])


def test_phase_vote_tracks_a_mid_track_half_bar_flip():
    n = 480
    v = np.ones(n)
    v[0:240][2::4] = 3.0
    v[240:][0::4] = 3.0                                       # second half: accent now on beat 1 (flipped by two beats)
    res = BP.phase_vote(v, nseg=2)
    assert res["segments"][0]["phase"] == 2 and res["segments"][1]["phase"] == 0


def test_compare_with_model_counts_only_decided_segments():
    votes = {"f": {"segments": [{"phase": 2, "contrast": 1.0}, {"phase": None, "contrast": 0.0}, {"phase": 0, "contrast": 0.5}]}}
    r = BP.compare_with_model(votes, [2, 2, 1])
    assert r["f"] == {"decided": 2, "agree": 1}
