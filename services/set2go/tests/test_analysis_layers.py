import pytest
from set2go.analysis import layers as L, sidecar as S


IMP = {"key": {"value": "7A", "provenance": "mixedinkey_self_declared"}, "bpm": {"value": 128.0}, "conflicts": [], "origin": "Mixed In Key payload (self-declared)"}


def test_imported_is_never_presented_as_a_prediction_and_predictions_are_not_promoted():
    r = L.resolve_key(IMP, {"essentia:bgate 2.1b6": "D major", "libkeyfinder 2.2.8": "D minor"})
    assert r["effective"]["camelot"] == "7A" and r["effective_origin"] == "imported"
    assert set(r["layers"]["predicted"]) == {"essentia:bgate 2.1b6", "libkeyfinder 2.2.8"}
    assert r["prediction_relation_to_effective"] == {"essentia:bgate 2.1b6": "parallel", "libkeyfinder 2.2.8": "exact"}
    assert L.resolve_key(None, {"x": "D minor"})["effective"] is None            # predictions alone never become the effective value silently


def test_manual_key_overrides_imported_but_both_stay_visible():
    d = {}
    S.record_analysis(d, "t.wav", "aa", {"run_id": "r"}, auto={"bpm": 128.0, "anchor_ms": 1.0})
    S.set_key(d, "t.wav", "aa", "D major", note="ear")
    r = L.resolve_key(IMP, {"p": "D minor"}, d["t.wav"])
    assert r["effective"]["camelot"] == "10B" and r["effective_origin"] == "manual"
    assert r["layers"]["imported"]["value"] == "7A" and r["layers"]["manual"]["provenance"]["by"] == "user"


def test_set_key_validates_input_and_audio_hash():
    d = {}
    S.record_analysis(d, "t.wav", "aa", {"run_id": "r"}, auto={"bpm": 128.0, "anchor_ms": 1.0})
    with pytest.raises(ValueError):
        S.set_key(d, "t.wav", "aa", "H flat")
    with pytest.raises(ValueError):
        S.set_key(d, "t.wav", "bb", "7A")
    S.set_key(d, "t.wav", "aa", "7A")
    assert d["t.wav"]["manual"]["key"] == "7A"
