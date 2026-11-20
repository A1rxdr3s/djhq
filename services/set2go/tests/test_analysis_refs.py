import base64, json
import pytest
from set2go.analysis import refs as R


def _geob(payload):
    from mutagen.id3 import GEOB
    return GEOB(encoding=0, mime="application/json", desc="X", data=base64.b64encode(json.dumps(payload).encode()))


def _file_with_tags(tmp_path, frames):
    """Minimal AIFF with an ID3 tag built from mutagen frames; returns the path."""
    import struct
    from mutagen.aiff import AIFF
    p = tmp_path / "t.aiff"
    n = 1000
    comm = b"COMM" + struct.pack(">IhIh", 18, 1, n, 16) + bytes.fromhex("400EAC44000000000000")
    ssnd = b"SSND" + struct.pack(">III", 8 + n * 2, 0, 0) + b"\x00" * (n * 2)
    body = b"AIFF" + comm + ssnd
    p.write_bytes(b"FORM" + struct.pack(">I", len(body)) + body)
    a = AIFF(str(p)); a.add_tags()
    for f in frames:
        a.tags.add(f)
    a.save()
    return p


def test_reads_self_declared_mik_payloads_and_keeps_plain_tags_separate(tmp_path):
    from mutagen.id3 import TKEY, TBPM, TIT2
    g = _geob({"source": "mixedinkey", "key": "7A", "algorithm": 94})
    g.desc = "Key"
    b = _geob({"source": "mixedinkey", "tempo": 127.9998, "algorithm": 12, "beats": [0.0, 0.46875, 0.9375, 1.40625]})
    b.desc = "BeatGrid"
    p = _file_with_tags(tmp_path, [g, b, TKEY(encoding=3, text="7A"), TBPM(encoding=3, text="128"), TIT2(encoding=3, text="7A - 6 - Song")])
    before = p.read_bytes()
    a = R.read_mik_annotations(p)
    assert p.read_bytes() == before                                         # read-only
    assert a["stored_key"] == {"value": "7A", "from": "geob_key", "provenance": "mixedinkey_self_declared"}
    assert a["stored_bpm"]["value"] == pytest.approx(127.9998) and a["stored_bpm"]["provenance"] == "mixedinkey_self_declared"
    assert a["geob"]["beatgrid"]["n_beats"] == 4 and a["conflicts"] == []


def test_conflicting_values_are_preserved_not_resolved(tmp_path):
    from mutagen.id3 import TKEY, TBPM, TIT2
    g = _geob({"source": "mixedinkey", "key": "7A", "algorithm": 94})
    g.desc = "Key"
    p = _file_with_tags(tmp_path, [g, TKEY(encoding=3, text="8A"), TIT2(encoding=3, text="9A - 6 - X"), TBPM(encoding=3, text="100")])
    a = R.read_mik_annotations(p)
    assert a["conflicts"] and a["conflicts"][0]["quantity"] == "key"
    assert a["conflicts"][0]["values"] == {"geob_key": "7A", "tkey": "8A", "title_prefix": "9A"}


def test_plain_tags_without_payload_are_unknown_origin(tmp_path):
    from mutagen.id3 import TKEY
    p = _file_with_tags(tmp_path, [TKEY(encoding=3, text="1A")])
    a = R.read_mik_annotations(p)
    assert a["stored_key"]["value"] == "1A" and a["stored_key"]["provenance"] == "unknown_origin"
    assert a["stored_bpm"]["value"] is None


def test_non_mik_payload_source_is_not_labelled_mik(tmp_path):
    g = _geob({"source": "someotherprogram", "key": "7A", "algorithm": 1})
    g.desc = "Key"
    a = R.read_mik_annotations(_file_with_tags(tmp_path, [g]))
    assert a["stored_key"]["provenance"] == "unknown_origin"


def test_split_validation():
    import tempfile, pathlib
    d = pathlib.Path(tempfile.mkdtemp()) / "r.json"
    d.write_text(json.dumps({"tracks": {"aa": {"filename": "x", "split": "maybe"}}}))
    with pytest.raises(ValueError):
        R.load_refs(d)


def test_flac_vorbis_payloads_are_read_with_the_same_provenance_rules(tmp_path):
    import numpy as np, soundfile as sf
    from mutagen.flac import FLAC
    p = tmp_path / "t.flac"
    sf.write(str(p), np.zeros(4410, dtype="float32"), 44100, format="FLAC")
    f = FLAC(str(p))
    f["KEY"] = base64.b64encode(json.dumps({"source": "mixedinkey", "key": "12A", "algorithm": 94}).encode()).decode()
    f["INITIALKEY"] = "12A"
    f["BPM"] = "128"
    f.save()
    before = p.read_bytes()
    a = R.read_mik_annotations(p)
    assert p.read_bytes() == before
    assert a["stored_key"] == {"value": "12A", "from": "geob_key", "provenance": "mixedinkey_self_declared"}
    assert a["stored_bpm"]["value"] == 128.0 and a["stored_bpm"]["provenance"] == "unknown_origin"
    f = FLAC(str(p)); f["INITIALKEY"] = "5A"; f.save()
    assert R.read_mik_annotations(p)["conflicts"][0]["values"] == {"geob_key": "12A", "tkey": "5A"}
