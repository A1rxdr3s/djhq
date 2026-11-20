import numpy as np
from set2go.analysis import barphase as BP, review as RV


def _synth(flip_bars=(), nbars=60, per=0.5):
    n = nbars * 4
    times = np.arange(n) * per
    ff = np.ones(n)
    ph = np.zeros(nbars, int)
    for b in range(nbars):
        off = 0 if b in flip_bars else 2                   # accent at offset 2 in a conventional bar, offset 0 in a flipped one
        ff[b * 4 + off] = 5.0
        ph[b] = 2 if b in flip_bars else 0                 # the model labels flipped bars with a different phase
    return ff, times, times[::4], ph


def test_flip_signature_when_minority_bars_accent_at_offset_zero():
    ff, t, db, ph = _synth(flip_bars=range(40, 52))
    r = BP.backbeat_evidence(ff, t, db, ph, 0, 0.5)
    assert r["verdict"] == "flip_signature" and r["minority_bars"] == 12 and r["advisory_only"]


def test_minority_conventional_and_uninformative_and_no_minority():
    ff, t, db, ph = _synth()
    ph2 = ph.copy(); ph2[20:30] = 2                       # model minority bars whose accent is still at offset 2
    assert BP.backbeat_evidence(ff, t, db, ph2, 0, 0.5)["verdict"] == "minority_conventional"
    assert BP.backbeat_evidence(ff, t, db, ph, 0, 0.5)["verdict"] == "no_minority_bars"
    flat = np.ones_like(ff) + 0.001 * np.random.default_rng(0).standard_normal(len(ff))
    assert BP.backbeat_evidence(flat, t, db, ph2, 0, 0.5)["verdict"] in ("uninformative", "mixed")


def test_review_reason_is_advisory_and_carries_the_histograms():
    ff, t, db, ph = _synth(flip_bars=range(40, 52))
    ev = BP.backbeat_evidence(ff, t, db, ph, 0, 0.5)
    r = RV.review_reasons({"phase_status": "model_consistent", "downbeat_majority_share": 0.95, "tempo_disagree_bpm": 0.0}, None, ev)
    hb = [x for x in r if "half-bar evidence" in x["reason"]]
    assert hb and "not applied" in hb[0]["reason"] and hb[0]["detail"]["accent_offset_hist_minority"] is not None
    assert RV.review_reasons({"phase_status": "model_consistent", "downbeat_majority_share": 0.95, "tempo_disagree_bpm": 0.0}, None,
                             {"verdict": "uninformative", "limits": {}}) == []
