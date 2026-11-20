import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))
import usb_evidence as ev


@pytest.fixture(autouse=True)
def _writable_cleanup(tmp_path):
    yield
    import os, stat
    for p in [tmp_path, *tmp_path.rglob("*")]:
        try:
            os.chmod(p, os.stat(p).st_mode | stat.S_IWUSR)
        except OSError:
            pass


def _usb(tmp_path):
    m = tmp_path / "usb"
    for rel, data in {"PIONEER/rekordbox/export.pdb": b"pdb", "PIONEER/LOG/a.json": b"log",
                      "Contents/t.wav": b"audio", "PIONEER/zzz_LAST.DAT": b"last"}.items():
        (m / rel).parent.mkdir(parents=True, exist_ok=True)
        (m / rel).write_bytes(data)
    (m / ".Spotlight-V100").mkdir(); (m / ".Spotlight-V100" / "x").write_bytes(b"s")
    (m / "PIONEER" / "._junk").write_bytes(b"j")
    return m


def _baseline(tmp_path, m, drop=()):
    live = ev.owned_manifest(m)
    p = tmp_path / "base.sha256"
    p.write_text("".join(f"{h}  ./{k}\n" for k, h in live.items() if k not in drop))   # NO trailing-newline games
    return p


def test_snapshot_copies_every_changed_file_including_last(tmp_path):
    m = _usb(tmp_path)
    base = _baseline(tmp_path, m, drop=("PIONEER/rekordbox/export.pdb", "PIONEER/zzz_LAST.DAT"))
    r = ev.snapshot(m, base, tmp_path / "evid")
    assert set(r["changed"]) == {"PIONEER/rekordbox/export.pdb", "PIONEER/zzz_LAST.DAT"}
    assert (tmp_path / "evid/changed_files/PIONEER/zzz_LAST.DAT").read_bytes() == b"last"


def test_baseline_without_trailing_newline_is_read_fully(tmp_path):
    p = tmp_path / "b.sha256"
    p.write_text("aa  ./one\nbb  ./two")            # the exact shape that dropped the last line before
    assert ev.read_baseline(p) == {"one": "aa", "two": "bb"}


def test_missing_evidence_file_fails_verification(tmp_path):
    m = _usb(tmp_path)
    out = tmp_path / "evid"
    ev.snapshot(m, _baseline(tmp_path, m, drop=("PIONEER/LOG/a.json",)), out)
    d = out / "changed_files/PIONEER/LOG"
    d.chmod(0o755)
    (d / "a.json").unlink()
    with pytest.raises(SystemExit, match="INCOMPLETE"):
        ev.verify(out)


def test_macos_metadata_is_ignored(tmp_path):
    m = _usb(tmp_path)
    assert not any(k.startswith(".Spotlight") or "._" in k for k in ev.owned_manifest(m))


def test_usb_drift_is_detected(tmp_path):
    m = _usb(tmp_path)
    out = tmp_path / "evid"
    ev.snapshot(m, _baseline(tmp_path, m), out)
    (m / "Contents/t.wav").write_bytes(b"changed")
    with pytest.raises(SystemExit, match="no longer matches"):
        ev.verify(out, m)
