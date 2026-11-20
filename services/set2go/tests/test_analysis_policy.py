import base64, json, struct
from pathlib import Path

import numpy as np
import pytest
from mutagen.aiff import AIFF
from mutagen.id3 import GEOB, TKEY, TIT2, TPE1

from rekordbox_pdb.pdb import Database
from set2go import key_detect as KD
from set2go.analysis import layers as L, refs as R, sidecar as S, workflow as W
from set2go.export import TrackSpec, export_library

pytestmark = pytest.mark.skipif(not KD.is_available(), reason="libKeyFinder wrapper library not built")


def _tonal(tonic_midi=50, minor=True, secs=40, sr=44100):
    ivs = [0, 2, 3, 5, 7, 8, 10] if minor else [0, 2, 4, 5, 7, 9, 11]
    wts = [3, 1, 2, 1, 2, 1, 1]
    t = np.arange(sr * secs) / sr
    x = np.zeros_like(t)
    for i, w in zip(ivs, wts):
        f = 440 * 2 ** ((tonic_midi + i - 69) / 12)
        x += w * sum(a * np.sin(2 * np.pi * f * k * t) for k, a in ((1, 1.0), (2, 0.5), (3, 0.25)))
    return (x / np.abs(x).max() * 0.5)


def _aiff(path, samples, frames):
    n = len(samples)
    comm = b"COMM" + struct.pack(">IhIh", 18, 1, n, 16) + bytes.fromhex("400EAC44000000000000")
    pcm = (samples * 32767).astype(">i2").tobytes()
    ssnd = b"SSND" + struct.pack(">III", 8 + len(pcm), 0, 0) + pcm
    body = b"AIFF" + comm + ssnd
    path.write_bytes(b"FORM" + struct.pack(">I", len(body)) + body)
    a = AIFF(str(path)); a.add_tags()
    for f in frames:
        a.tags.add(f)
    a.save()
    return path


def _mik(key):
    return [GEOB(encoding=0, mime="application/json", desc="Key", data=base64.b64encode(json.dumps({"source": "mixedinkey", "key": key, "algorithm": 94}).encode())),
            TKEY(encoding=3, text=key)]


@pytest.fixture
def lib(tmp_path):
    d = tmp_path / "src"; d.mkdir()
    meta = lambda t: [TIT2(encoding=3, text=t), TPE1(encoding=3, text="X")]
    return {"untagged.aiff": _aiff(d / "untagged.aiff", _tonal(50, True), meta("Untagged")),                  # D minor audio, NO key tag, NO payload
            "stored.aiff": _aiff(d / "stored.aiff", _tonal(50, True), _mik("1A") + meta("Stored")),              # D minor audio but stored 1A (a deliberate conflict)
            "silent.aiff": _aiff(d / "silent.aiff", np.zeros(44100 * 12), meta("Silent")),                         # no usable audio: prediction yields nothing
            "badtag.aiff": _aiff(d / "badtag.aiff", _tonal(50, True), [TKEY(encoding=3, text="H#"), *meta("BadTag")])}   # stored value that is not a key


def _sidecar(files):
    d = {}
    for n, p in files.items():
        S.record_analysis(d, n, R.sha256_file(p), {"run_id": "r"}, auto=None)
    return d


def test_backend_label_carries_the_real_version_and_makes_no_accuracy_claim():
    label, fn = W.libkeyfinder_backend()
    import re
    assert re.fullmatch(r"libkeyfinder \d+\.\d+\.\d+", label)


def test_policy_none_keeps_predictions_advisory_and_policy_enables_only_the_selected_backend(lib):
    label, fn = W.libkeyfinder_backend()
    sc = _sidecar(lib)
    off = W.analyse_track(lib["untagged.aiff"], sc["untagged.aiff"], {label: fn})
    assert off["key"]["effective"] is None                                             # default: no key, prediction not promoted
    on = W.analyse_track(lib["untagged.aiff"], sc["untagged.aiff"], {label: fn, "essentia:bgate 2.1b6": lambda p: "D major"}, policy={"backend": label})
    k = on["key"]
    assert k["effective_origin"] == "predicted" and k["effective"]["name"] == "D minor" and k["selected_prediction"]["backend"] == label
    assert any("PREDICTION from " + label in r["reason"] for r in on["review"])         # labelled with backend and version, flagged as unverified
    assert any("disagree" in r["reason"] for r in on["review"])                          # the advisory Essentia answer (D major) is reported, not used


def test_manual_and_imported_win_over_the_prediction_and_disagreement_never_replaces_them(lib):
    label, fn = W.libkeyfinder_backend()
    sc = _sidecar(lib)
    a = W.analyse_track(lib["stored.aiff"], sc["stored.aiff"], {label: fn}, policy={"backend": label})
    assert a["key"]["effective"]["camelot"] == "1A" and a["key"]["effective_origin"] == "imported"          # stored 1A (Ab minor) beats the prediction (D minor)
    assert a["key"]["layers"]["predicted"][label] == "D minor" and any("predictions differ" in r["reason"] or "disagree" in r["reason"] for r in a["review"])
    S.set_key(sc, "stored.aiff", R.sha256_file(lib["stored.aiff"]), "5B", note="ear")
    b = W.analyse_track(lib["stored.aiff"], sc["stored.aiff"], {label: fn}, policy={"backend": label})
    assert b["key"]["effective"]["camelot"] == "5B" and b["key"]["effective_origin"] == "manual"


def test_failure_and_unsupported_input_give_no_key_and_stay_visible(lib):
    label, fn = W.libkeyfinder_backend()
    sc = _sidecar(lib)
    silent = W.analyse_track(lib["silent.aiff"], sc["silent.aiff"], {label: fn}, policy={"backend": label})
    assert silent["key"]["effective"] is None and any("selected prediction backend produced none" in r["reason"] or "prediction policy gave no key" in r["reason"] for r in silent["review"])
    def boom(p): raise RuntimeError("backend died")
    crashed = W.analyse_track(lib["untagged.aiff"], sc["untagged.aiff"], {label: boom}, policy={"backend": label})
    assert crashed["key"]["effective"] is None and label in crashed["failures"] and any("method failed" in r["reason"] for r in crashed["review"])
    missing = W.analyse_track(lib["untagged.aiff"], sc["untagged.aiff"], {}, policy={"backend": label})
    assert missing["key"]["effective"] is None and missing["key"]["invalid"]["policy"].startswith("backend")


def test_unparseable_stored_value_is_invalid_not_effective_and_falls_through_to_the_policy(lib):
    label, fn = W.libkeyfinder_backend()
    sc = _sidecar(lib)
    a = W.analyse_track(lib["badtag.aiff"], sc["badtag.aiff"], {label: fn}, policy={"backend": label})
    assert a["key"]["invalid"]["imported"] == "H#"
    assert a["key"]["effective_origin"] == "predicted" and a["key"]["effective"]["name"] == "D minor"
    assert any("imported value is not usable" in r["reason"] for r in a["review"])
    plain = W.analyse_track(lib["badtag.aiff"], sc["badtag.aiff"], {label: fn})                  # without a policy: no effective key, the invalid value is reported
    assert plain["key"]["effective"] is None and plain["key"]["invalid"]["imported"] == "H#"


def test_reanalysis_preserves_manual_and_records_the_policy(lib):
    label, fn = W.libkeyfinder_backend()
    sc = _sidecar(lib)
    S.set_key(sc, "untagged.aiff", R.sha256_file(lib["untagged.aiff"]), "8B", note="ear")
    a = W.reanalyse(sc, "untagged.aiff", lib["untagged.aiff"], {label: fn}, policy={"backend": label})
    assert a["key"]["effective_origin"] == "manual" and sc["untagged.aiff"]["manual"]["key"] == "8B"
    last = sc["untagged.aiff"]["analysis"][sorted(sc["untagged.aiff"]["analysis"])[-1]]["key_layers"]
    assert last["policy"] == {"backend": label} and last["predicted"][label] == "D minor" and last["effective_origin"] == "manual"
    S.clear_manual(sc, "untagged.aiff", "key")
    b = W.reanalyse(sc, "untagged.aiff", lib["untagged.aiff"], {label: fn}, policy={"backend": label})
    assert b["key"]["effective_origin"] == "predicted"                                           # with the correction removed the policy applies again


def _pdb_keys(out):
    db = Database.from_file(out / "PIONEER/rekordbox/export.pdb")
    kn = {k.id: k.name for k in db.keys}
    return {t.filename: (t.key_id, kn.get(t.key_id)) for t in db.tracks}


def test_prediction_reaches_the_resolved_pdb_key_and_default_export_is_unchanged(tmp_path, lib):
    label, fn = W.libkeyfinder_backend()
    sc = _sidecar(lib)
    S.set_key(sc, "stored.aiff", R.sha256_file(lib["stored.aiff"]), "5B")
    preds = {n: {label: fn(p)} for n, p in lib.items()}
    ek = W.effective_key_map(sc, lib, predictions=preds, policy={"backend": label})
    assert ek["untagged.aiff"] == {"camelot": "7A", "name": "D minor", "origin": "predicted", "backend": label}
    assert ek["stored.aiff"]["origin"] == "manual" and ek["silent.aiff"] is None and ek["badtag.aiff"]["origin"] == "predicted"
    out = tmp_path / "exp"
    export_library({"pl": [TrackSpec(p) for p in lib.values()]}, out, analyse=False, effective_keys=ek)
    got = _pdb_keys(out)
    assert got["untagged.aiff"][1] == "7A" and got["stored.aiff"][1] == "5B" and got["badtag.aiff"][1] == "7A" and got["silent.aiff"] == (0, None)
    # the default (no mapping, analyse=False) writes no key at all, exactly as before
    out2 = tmp_path / "exp_default"
    export_library({"pl": [TrackSpec(p) for p in lib.values()]}, out2, analyse=False)
    assert all(v == (0, None) for v in _pdb_keys(out2).values())


def test_source_files_are_never_modified(lib):
    label, fn = W.libkeyfinder_backend()
    before = {n: R.sha256_file(p) for n, p in lib.items()}
    sc = _sidecar(lib)
    for n, p in lib.items():
        W.reanalyse(sc, n, p, {label: fn}, policy={"backend": label})
    assert before == {n: R.sha256_file(p) for n, p in lib.items()}


def test_policy_uses_only_the_selected_backend_even_when_another_prediction_comes_first(lib):
    label, fn = W.libkeyfinder_backend()
    sc = _sidecar(lib)
    # an advisory backend listed FIRST and disagreeing: it must never become the effective key
    preds = {"essentia:bgate 2.1b6": "G major", label: "D minor"}
    r = L.resolve_key(None, preds, sc["untagged.aiff"], policy={"backend": label})
    assert r["effective"]["name"] == "D minor" and r["selected_prediction"]["backend"] == label
    r2 = L.resolve_key(None, {"essentia:bgate 2.1b6": "G major"}, sc["untagged.aiff"], policy={"backend": label})
    assert r2["effective"] is None and r2["invalid"]["policy"].startswith("backend")             # the advisory answer is NOT used when the selected backend is absent
    r3 = L.resolve_key(None, {"essentia:bgate 2.1b6": "G major", label: None}, sc["untagged.aiff"], policy={"backend": label})
    assert r3["effective"] is None and "no usable key" in r3["invalid"]["policy"]
