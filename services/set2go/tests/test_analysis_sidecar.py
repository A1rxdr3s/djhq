import pytest
from set2go.analysis import sidecar as S
from set2go.grid import effective_grid, manual_for

AUTO = {"bpm": 128.0, "anchor_ms": 10.0, "bar_origin": 1, "phase_status": "model_consistent"}


def _seed():
    d = {}
    S.record_analysis(d, "t.wav", "aa", {"run_id": "r1", "tempo": 128.0}, auto=dict(AUTO), version="0.1.0")
    return d


def test_manual_override_has_provenance_and_feeds_existing_grid_code():
    d = _seed()
    S.set_manual(d, "t.wav", "aa", bar_origin=3, key="D minor", note="by ear")
    e = d["t.wav"]
    assert e["manual_meta"]["bar_origin"]["by"] == "user" and e["manual_meta"]["key"]["note"] == "by ear"
    assert e["manual_meta"]["key"]["analysis_version"] == "0.1.0" and "at" in e["manual_meta"]["key"]
    g = effective_grid(e["auto"], e["manual"])
    assert g.bar_origin == 3 and g.review == "reviewed"                        # existing behaviour unchanged by the extra "key" field


def test_reanalysis_preserves_manual_and_keeps_raw_runs():
    d = _seed()
    S.set_manual(d, "t.wav", "aa", bpm=127.5, anchor_ms=12.0, bar_origin=2)
    S.record_analysis(d, "t.wav", "aa", {"run_id": "r2", "tempo": 128.01}, auto={**AUTO, "bpm": 128.01}, version="0.2.0")
    e = d["t.wav"]
    assert e["manual"] == {"bpm": 127.5, "anchor_ms": 12.0, "bar_origin": 2}      # untouched
    assert e["auto"]["bpm"] == 128.01
    assert len(e["analysis"]) == 2 and any(k.startswith("0.1.0@r1") for k in e["analysis"])   # raw run from the older version is kept


def test_changed_audio_marks_stale_and_does_not_apply_old_overrides():
    d = _seed()
    S.set_manual(d, "t.wav", "aa", bar_origin=3)
    assert S.is_stale(d, "t.wav", "bb") and not S.is_stale(d, "t.wav", "aa")
    S.record_analysis(d, "t.wav", "bb", {"run_id": "r3"}, auto=dict(AUTO))
    e = d["t.wav"]
    assert e["sha256"] == "bb" and "manual" not in e                          # not applied to the new audio
    assert e["stale"][0]["sha256"] == "aa" and e["stale"][0]["manual"] == {"bar_origin": 3}       # but nothing is deleted
    with pytest.raises(ValueError):
        S.set_manual(d, "t.wav", "aa", bar_origin=1)                           # cannot override for the audio that was replaced


def test_existing_manual_for_still_refuses_mismatched_audio():
    d = _seed()
    S.set_manual(d, "t.wav", "aa", bar_origin=3)
    assert manual_for(d, "t.wav", "aa")["bar_origin"] == 3
    with pytest.raises(ValueError):
        manual_for(d, "t.wav", "bb")


def test_unsupported_field_and_unknown_track_refused():
    d = _seed()
    with pytest.raises(ValueError):
        S.set_manual(d, "t.wav", "aa", tempo_octave=2)
    with pytest.raises(KeyError):
        S.set_manual(d, "nope.wav", "aa", bpm=120)


def test_effective_key_manual_wins_and_auto_stays_visible():
    d = _seed()
    S.set_manual(d, "t.wav", "aa", key="10B")
    k = S.effective_key(d["t.wav"], {"camelot": "7A"})
    assert k["value"] == "10B" and k["source"] == "manual" and k["auto"]["camelot"] == "7A"
