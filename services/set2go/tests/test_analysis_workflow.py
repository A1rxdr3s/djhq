import base64, json, struct
from pathlib import Path

import numpy as np
import pytest
from mutagen.aiff import AIFF
from mutagen.id3 import GEOB, TKEY, TIT2, TPE1

from rekordbox_pdb.pdb import Database
from set2go.analysis import refs as R, sidecar as S, workflow as W
from set2go.export import TrackSpec, export_library


def _aiff(tmp_path, name, frames, secs=2):
    sr = 44100
    n = sr * secs
    comm = b"COMM" + struct.pack(">IhIh", 18, 1, n, 16) + bytes.fromhex("400EAC44000000000000")
    ssnd = b"SSND" + struct.pack(">III", 8 + n * 2, 0, 0) + (np.random.default_rng(0).standard_normal(n) * 800).astype("<i2").byteswap().tobytes()
    body = b"AIFF" + comm + ssnd
    p = tmp_path / name
    p.write_bytes(b"FORM" + struct.pack(">I", len(body)) + body)
    a = AIFF(str(p)); a.add_tags()
    for f in frames:
        a.tags.add(f)
    a.save()
    return p


def _mik(key):
    g = GEOB(encoding=0, mime="application/json", desc="Key", data=base64.b64encode(json.dumps({"source": "mixedinkey", "key": key, "algorithm": 94}).encode()))
    return [g, TKEY(encoding=3, text=key)]


@pytest.fixture
def tracks(tmp_path):
    return {"imported.aiff": _aiff(tmp_path, "imported.aiff", _mik("7A") + [TIT2(encoding=3, text="Imported"), TPE1(encoding=3, text="A")]),
            "plain.aiff": _aiff(tmp_path, "plain.aiff", [TKEY(encoding=3, text="Em"), TIT2(encoding=3, text="Plain"), TPE1(encoding=3, text="B")]),
            "nokey.aiff": _aiff(tmp_path, "nokey.aiff", [TIT2(encoding=3, text="NoKey"), TPE1(encoding=3, text="C")]),
            "over.aiff": _aiff(tmp_path, "over.aiff", _mik("1A") + [TIT2(encoding=3, text="Over"), TPE1(encoding=3, text="D")])}


def _sidecar(tracks):
    d = {}
    for n, p in tracks.items():
        S.record_analysis(d, n, R.sha256_file(p), {"run_id": "r"}, auto={"bpm": 128.0, "anchor_ms": 1.0})
    return d


def test_layers_for_imported_predicted_overridden_and_missing(tracks):
    sc = _sidecar(tracks)
    S.set_key(sc, "over.aiff", R.sha256_file(tracks["over.aiff"]), "D major", note="ear")
    pred = {"essentia:bgate": lambda p: "D minor", "libkeyfinder": lambda p: "A minor"}
    a = {n: W.analyse_track(p, sc[n], pred) for n, p in tracks.items()}
    assert a["imported.aiff"]["key"]["effective"]["camelot"] == "7A" and a["imported.aiff"]["key"]["effective_origin"] == "imported"
    assert a["imported.aiff"]["imported"]["origin"].startswith("Mixed In Key payload")
    assert a["plain.aiff"]["key"]["effective_origin"] == "imported" and a["plain.aiff"]["imported"]["origin"] == "embedded tag (writer unknown)"
    assert any("unknown origin" in r["reason"] for r in a["plain.aiff"]["review"])
    assert a["nokey.aiff"]["key"]["effective"] is None and a["nokey.aiff"]["key"]["effective_origin"] is None            # predictions are NOT promoted
    assert any("no key available" in r["reason"] for r in a["nokey.aiff"]["review"])
    assert a["over.aiff"]["key"]["effective"]["camelot"] == "10B" and a["over.aiff"]["key"]["effective_origin"] == "manual"
    assert a["over.aiff"]["key"]["layers"]["imported"]["value"] == "1A"                                                  # the imported value stays visible
    assert a["over.aiff"]["predicted"] == {"essentia:bgate": "D minor", "libkeyfinder": "A minor"}


def test_disagreement_reasons_are_descriptive_and_agreement_is_not_proof(tracks):
    p = tracks["imported.aiff"]
    dis = W.analyse_track(p, None, {"essentia:bgate": lambda x: "D major", "essentia:braw": lambda x: "D major", "libkeyfinder": lambda x: "A minor"})
    txt = [r["reason"] for r in dis["review"]]
    assert any("predictions disagree" in t for t in txt) and any("MODE" in t for t in txt) and any("families disagree on the TONIC" in t for t in txt)
    agree = W.analyse_track(p, None, {"essentia:bgate": lambda x: "D minor", "libkeyfinder": lambda x: "D minor"})
    t2 = [r for r in agree["review"]]
    assert not any("disagree" in r["reason"] for r in t2)
    assert any(r["area"] == "info" and "not evidence of correctness" in r["reason"] for r in t2)
    assert not any("probab" in json.dumps(r).lower() for r in dis["review"] + agree["review"])


def test_same_family_profiles_count_as_one_family(tracks):
    p = tracks["imported.aiff"]
    a = W.analyse_track(p, None, {"essentia:bgate": lambda x: "D minor", "essentia:braw": lambda x: "D minor", "essentia:edma": lambda x: "D minor"})
    assert not any("families agree" in r["reason"] for r in a["review"])           # three Essentia profiles are one family: no cross-family statement
    assert W.family_of("essentia:bgate") == W.family_of("essentia:braw") != W.family_of("libkeyfinder")


def test_failing_predictor_is_recorded_not_hidden(tracks):
    def boom(p): raise RuntimeError("worker died")
    a = W.analyse_track(tracks["imported.aiff"], None, {"essentia:bgate": boom, "libkeyfinder": lambda x: "D minor"})
    assert "essentia:bgate" in a["failures"] and any("method failed" in r["reason"] for r in a["review"]) and a["predicted"]["libkeyfinder"] == "D minor"


def test_override_survives_reanalysis_and_is_retired_when_audio_changes(tracks):
    sc = _sidecar(tracks)
    p = tracks["imported.aiff"]
    S.set_key(sc, "imported.aiff", R.sha256_file(p), "5B", note="ear")
    a1 = W.reanalyse(sc, "imported.aiff", p, {"libkeyfinder": lambda x: "D minor"})
    assert sc["imported.aiff"]["manual"]["key"] == "5B" and a1["key"]["effective_origin"] == "manual" and not a1["stale_overrides_retired"]
    assert len(sc["imported.aiff"]["analysis"]) >= 2                              # raw runs are appended, never overwritten
    AIFF(str(p)).tags.add(TPE1(encoding=3, text="changed")); a = AIFF(str(p)); a.tags.add(TPE1(encoding=3, text="changed")); a.save()   # retag -> different file hash
    a2 = W.reanalyse(sc, "imported.aiff", p, {})
    assert a2["stale_overrides_retired"] and "manual" not in sc["imported.aiff"] and sc["imported.aiff"]["stale"][0]["manual"]["key"] == "5B"
    assert a2["key"]["effective_origin"] == "imported"                            # falls back to the stored key; the old override is NOT applied


def _export(tmp_path, tracks, **kw):
    out = tmp_path / "exp"
    export_library({"pl": [TrackSpec(p) for p in tracks.values()]}, out, analyse=False, **kw)
    db = Database.from_file(out / "PIONEER/rekordbox/export.pdb")
    keyname = {k.id: k.name for k in db.keys}
    return {t.filename: (t.key_id, keyname.get(t.key_id)) for t in db.tracks}


def test_opt_in_export_resolves_effective_key_into_pdb_table_and_track_reference(tmp_path, tracks):
    sc = _sidecar(tracks)
    S.set_key(sc, "over.aiff", R.sha256_file(tracks["over.aiff"]), "D major")
    ek = W.effective_key_map(sc, tracks)
    assert ek["imported.aiff"]["camelot"] == "7A" and ek["over.aiff"] == {"camelot": "10B", "name": "D major", "origin": "manual"} and ek["nokey.aiff"] is None
    got = _export(tmp_path, tracks, effective_keys=ek)
    assert got["imported.aiff"][1] == "7A" and got["plain.aiff"][1] == "9A"       # stored 'Em' is resolved to Camelot 9A
    assert got["over.aiff"][1] == "10B"                                           # manual override beats the imported 1A
    assert got["nokey.aiff"] == (0, None)                                         # missing key: key_id 0, no KEYS row for it
    assert got["imported.aiff"][0] != 0 and got["imported.aiff"][0] != got["over.aiff"][0]
    assert "1A" not in {v[1] for v in got.values()}                               # the overridden stored key is not written anywhere


def test_default_export_path_is_unchanged_without_effective_keys(tmp_path, tracks):
    # analyse=False and no mapping: no key is resolved at all (key_result stays None) -> every key_id 0, exactly the pre-change behaviour of this call
    got = _export(tmp_path, tracks)
    assert all(v == (0, None) for v in got.values())


def test_override_for_different_audio_is_not_applied_in_the_export_map(tmp_path, tracks):
    sc = _sidecar(tracks)
    p = tracks["over.aiff"]
    S.set_key(sc, "over.aiff", R.sha256_file(p), "D major")
    a = AIFF(str(p)); a.tags.add(TPE1(encoding=3, text="retagged")); a.save()      # same name, different bytes
    assert W.effective_key_map(sc, tracks)["over.aiff"]["camelot"] == "1A"        # falls back to the stored key



def _vk():
    import importlib.util
    spec = importlib.util.spec_from_file_location("verify_export_mod", Path(__file__).resolve().parent.parent / "scripts/verify_export.py")
    m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m); return m


def test_verifier_key_check_default_is_strict_and_effective_map_is_narrow():
    vk = _vk()
    assert vk.key_check("7A", "7A")[0] and not vk.key_check("10B", "7A")[0]                 # default: PDB key must equal TKEY (unchanged behaviour)
    assert vk.key_check("10B", "7A", {"camelot": "10B"})[0]                                  # explicit override accepted
    assert not vk.key_check("10B", "7A", {"camelot": "3A"})[0]                               # a wrong map entry is rejected
    assert vk.key_check(None, "7A", None)[0] and not vk.key_check("7A", "7A", None)[0]      # null entry = must have NO key
    assert not vk.key_check("7A", "", {"camelot": "10B"})[0]
