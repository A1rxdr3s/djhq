import numpy as np
from set2go.analysis import keys as K
from set2go.key_detect import _CAMELOT


def test_camelot_matches_existing_project_map_for_all_24_keys():
    for name, code in _CAMELOT.items():
        assert K.camelot(*K.parse_key(name)) == code


def test_parse_and_roundtrip():
    assert K.parse_key("7A") == (2, "minor") and K.parse_key("10B") == (2, "major") and K.parse_key("F# minor") == (6, "minor")
    assert K.parse_key("not a key") is None
    assert all(K.parse_key(K.camelot(t, m)) == (t, m) for t in range(12) for m in ("major", "minor"))


def test_relations_are_separate_categories():
    P = K.parse_key
    assert K.relation(P("D minor"), P("D minor")) == "exact"
    assert K.relation(P("D minor"), P("D major")) == "parallel"
    assert K.relation(P("D minor"), P("F major")) == "relative"
    assert K.relation(P("A minor"), P("D minor")) == "fifth"
    assert K.relation(P("F# minor"), P("G minor")) == "semitone"
    assert K.relation(P("C minor"), P("F# major")) == "other"


def _piece(sr, tonic, mode, cents=0.0, dur=20):
    ivs = [0, 2, 3, 5, 7, 8, 10] if mode == "minor" else [0, 2, 4, 5, 7, 9, 11]
    t = np.arange(int(sr * dur)) / sr
    x = np.zeros_like(t)
    for i, w in zip(ivs, [3, 1, 2, 1, 2, 1, 1]):
        f = 440 * 2 ** ((48 + (tonic + i) % 12 + cents / 100 - 69) / 12)
        x += w * sum(a * np.sin(2 * np.pi * f * k * t) for k, a in ((1, 1.0), (2, 0.5), (3, 0.25)))
    return (x / np.abs(x).max()).astype(np.float32)


def test_chroma_estimator_recovers_known_keys_and_tuning():
    sr = 22050
    for tonic, mode in ((2, "minor"), (9, "major"), (6, "minor"), (10, "major")):
        c, info = K.chroma_from_audio(_piece(sr, tonic, mode, 25.0), sr)
        e = K.estimate_from_chroma(c)
        assert (e["tonic"], e["mode"]) == (tonic, mode)
        assert abs(info["tuning_cents"] - 25.0) < 5.0
