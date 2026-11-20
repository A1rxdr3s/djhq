"""End-to-end tests of scripts/analysis_key_export.py and the manifest mode of scripts/verify_export.py, run as real subprocesses on small synthetic sources in
temporary directories OUTSIDE test-tracks/. Sources are never edited; every export is a few MB."""
import base64, json, os, shutil, subprocess, sys
from pathlib import Path

import numpy as np
import pytest
from mutagen.id3 import GEOB, TIT2, TPE1, TKEY

from set2go import key_detect as KD
from set2go.analysis import refs as R

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tests"))
import test_analysis_policy as T                        # fixture helpers (_tonal, _aiff, _mik)

pytestmark = pytest.mark.skipif(not KD.is_available(), reason="libKeyFinder wrapper library not built")
CLI = ROOT / "scripts/analysis_key_export.py"
VER = ROOT / "scripts/verify_export.py"
GRID = ROOT / "scripts/grid_tool.py"


def run(*args, script=CLI):
    return subprocess.run([sys.executable, str(script), *map(str, args)], capture_output=True, text=True, cwd=str(ROOT), env={**os.environ, "PYTHONPATH": str(ROOT / "src")})


def meta(t):
    return [TIT2(encoding=3, text=t), TPE1(encoding=3, text="Synthetic")]


@pytest.fixture
def world(tmp_path):
    a, b = tmp_path / "folderA", tmp_path / "folderB"
    a.mkdir(); b.mkdir()
    x = T._tonal(50, True, secs=14)                                     # D minor audio
    T._aiff(a / "stored.aiff", x, T._mik("1A") + meta("Stored"))        # imported key 1A (conflicts with the audio on purpose)
    T._aiff(a / "predicted.aiff", x, meta("Predicted"))                  # no key tag, no payload
    T._aiff(a / "manual.aiff", x, T._mik("5A") + meta("Manual"))         # imported 5A, will be overridden
    T._aiff(a / "silent.aiff", np.zeros(44100 * 12), meta("Silent"))     # the prediction yields nothing
    T._aiff(b / "stored.aiff", T._tonal(52, True, secs=14), meta("Other stored"))   # SAME basename as folderA/stored.aiff, different audio
    return {"A": a, "B": b, "tmp": tmp_path}


def export(w, out="out", extra=(), sources=None):
    srcs = sources or [w["A"]]
    return run(w["tmp"] / out, *srcs, "--sidecar", w["tmp"] / "side.json", "--predict", "libkeyfinder", *extra)


def test_full_flow_imported_predicted_manual_failed_and_matching_verification(world):
    w = world
    # 1. analyse first (dry run) so a manual override can be set on a hash-linked entry
    d = export(w, extra=["--dry-run"])
    assert d.returncode == 0 and "dry run: no export" in d.stdout, d.stdout + d.stderr
    k = run("key", w["tmp"] / "side.json", "manual.aiff", "A major", "--note", "e2e", script=GRID)
    assert k.returncode == 0, k.stdout + k.stderr
    r = export(w)
    assert r.returncode == 0, r.stdout + r.stderr
    out = w["tmp"] / "out"
    man = json.loads((w["tmp"] / "out_MANIFEST.json").read_text())
    by = {Path(t["destination"]).name: t for t in man["tracks"]}
    assert by["stored.aiff"]["expected_key"]["camelot"] == "1A" and by["stored.aiff"]["expected_key"]["origin"] == "imported"
    pk = by["predicted.aiff"]["expected_key"]
    assert pk["camelot"] == "7A" and pk["origin"] == "predicted" and pk["backend"].startswith("libkeyfinder ") and "unverified" in pk["provenance"]
    assert by["manual.aiff"]["expected_key"]["camelot"] == "11B" and by["manual.aiff"]["expected_key"]["origin"] == "manual"
    assert by["silent.aiff"]["expected_key"] is None and "silent.aiff" in r.stdout and "no key" in r.stdout.lower() + r.stdout
    assert by["stored.aiff"]["source"]["path"] == str((w["A"] / "stored.aiff").resolve()) and by["stored.aiff"]["source"]["sha256"] == R.sha256_file(w["A"] / "stored.aiff")
    v = run(out, f"--manifest={w['tmp'] / 'out_MANIFEST.json'}", "--exact", script=VER)
    assert v.returncode == 0 and "ALL CHECKS PASSED" in v.stdout, v.stdout[-1500:]
    assert "[manifest]" in v.stdout and "explicit effective key '7A'" in v.stdout and "[manual:" in v.stdout and "[no key expected]" in v.stdout
    # the failed prediction is visible in the sidecar run record and the stored sources were not touched
    side = json.loads((w["tmp"] / "side.json").read_text())
    last = side["silent.aiff"]["analysis"][sorted(side["silent.aiff"]["analysis"])[-1]]["key_layers"]
    assert last["effective"] is None and last["predicted"][man["policy"]["backend"]] is None
    assert side["manual.aiff"]["manual"]["key"] == "11B" and side["manual.aiff"]["manual_meta"]["key"]["note"] == "e2e [entered as 'A major']"


def test_duplicate_basenames_are_refused_with_both_paths_and_nothing_is_written(world):
    w = world
    r = export(w, sources=[w["A"], w["B"]])
    assert r.returncode == 2 and "share the basename 'stored.aiff'" in r.stderr
    assert str((w["A"] / "stored.aiff").resolve()) in r.stderr and str((w["B"] / "stored.aiff").resolve()) in r.stderr and "sha256" in r.stderr
    assert not (w["tmp"] / "out").exists() and not (w["tmp"] / "out_MANIFEST.json").exists()
    assert not (w["tmp"] / "side.json").exists()                          # refused before any analysis or provenance was written


def test_same_file_selected_twice_is_collapsed_not_duplicated(world):
    w = world
    f = w["A"] / "predicted.aiff"
    r = export(w, sources=[f, w["A"] / ".." / "folderA" / "predicted.aiff"])
    assert r.returncode == 0 and "collapsed" in r.stdout, r.stdout + r.stderr
    man = json.loads((w["tmp"] / "out_MANIFEST.json").read_text())
    assert len(man["tracks"]) == 1 and man["playlists"] == {"Analysis export": [0]}


@pytest.mark.parametrize("bad", [["--bogus"], ["--predict", "essentia"], ["--analysis-from", "/tmp"], ["--link-audio-from", "/tmp"]])
def test_invalid_arguments_fail_clearly(world, bad):
    w = world
    r = run(w["tmp"] / "o", w["A"], "--sidecar", w["tmp"] / "s.json", *bad)
    assert r.returncode == 2 and r.stderr.strip(), r.stdout + r.stderr          # usage error, explained, nothing exported
    assert not (w["tmp"] / "o").exists()


def test_missing_source_unsupported_type_and_missing_sidecar_flag_fail_clearly(world):
    w = world
    assert run(w["tmp"] / "o", w["tmp"] / "nope", "--sidecar", w["tmp"] / "s.json").returncode == 2
    (w["tmp"] / "notes.txt").write_text("x")
    r = run(w["tmp"] / "o", w["tmp"] / "notes.txt", "--sidecar", w["tmp"] / "s.json")
    assert r.returncode == 2 and "unsupported file type" in r.stderr
    r = run(w["tmp"] / "o", w["A"])
    assert r.returncode == 2 and "--sidecar" in r.stderr


def test_non_empty_output_dir_is_refused_before_any_analysis(world):
    w = world
    (w["tmp"] / "out").mkdir(); (w["tmp"] / "out" / "x").write_text("x")
    r = export(w)
    assert r.returncode == 2 and "not empty" in r.stderr and not (w["tmp"] / "side.json").exists()


def _built(world):
    w = world
    r = export(w, sources=[w["A"] / "predicted.aiff", w["A"] / "stored.aiff"])
    assert r.returncode == 0, r.stdout + r.stderr
    return w["tmp"] / "out", w["tmp"] / "out_MANIFEST.json"


def verify(out, man):
    return run(out, f"--manifest={man}", "--exact", script=VER)


def test_verifier_catches_corruption_negative_controls(world):
    w = world
    out, man = _built(w)
    assert verify(out, man).returncode == 0
    # (a) audio swapped in the export
    shutil.copy2(out / "Contents/stored.aiff", w["tmp"] / "keep.aiff")
    (out / "Contents/stored.aiff").write_bytes(b"FORM" + b"\x00" * 100)
    r = verify(out, man)
    assert r.returncode != 0 and "sha256 == source" in r.stdout and "FAIL" in r.stdout
    shutil.copy2(w["tmp"] / "keep.aiff", out / "Contents/stored.aiff")
    assert verify(out, man).returncode == 0
    # (b) manifest expects a different key than the PDB holds
    m = json.loads(man.read_text())
    for t in m["tracks"]:
        if t["destination"].endswith("predicted.aiff"):
            t["expected_key"]["camelot"] = "3B"
    bad = w["tmp"] / "bad_manifest.json"; bad.write_text(json.dumps(m))
    r = run(out, f"--manifest={bad}", "--exact", script=VER)
    assert r.returncode != 0 and "FAIL" in r.stdout and "'3B'" in r.stdout
    # (c) manifest source hash no longer matches the real source (source modified after the export)
    m = json.loads(man.read_text()); m["tracks"][0]["source"]["sha256"] = "0" * 64
    bad2 = w["tmp"] / "bad_manifest2.json"; bad2.write_text(json.dumps(m))
    r = run(out, f"--manifest={bad2}", "--exact", script=VER)
    assert r.returncode != 0 and "manifest sha256" in r.stdout and "FAIL" in r.stdout
    # (d) playlist order differs from the manifest
    m = json.loads(man.read_text()); m["playlists"]["Analysis export"] = m["playlists"]["Analysis export"][::-1]
    bad3 = w["tmp"] / "bad_manifest3.json"; bad3.write_text(json.dumps(m))
    r = run(out, f"--manifest={bad3}", "--exact", script=VER)
    assert r.returncode != 0 and "FAIL" in r.stdout
    # (e) a stray file in the export
    (out / "Contents/stray.aiff").write_bytes(b"x")
    r = verify(out, man)
    assert r.returncode != 0 and "no unexpected files" in r.stdout
    (out / "Contents/stray.aiff").unlink()
    # (f) the PDB's key row differs from the manifest (a manifest built for a different key map)
    m = json.loads(man.read_text())
    for t in m["tracks"]:
        if t["destination"].endswith("stored.aiff"):
            t["expected_key"] = None
    bad4 = w["tmp"] / "bad_manifest4.json"; bad4.write_text(json.dumps(m))
    assert run(out, f"--manifest={bad4}", "--exact", script=VER).returncode != 0


def test_default_verifier_command_for_v18_is_unchanged_and_sources_are_never_modified(world):
    w = world
    before = {p: R.sha256_file(p) for d in (w["A"], w["B"]) for p in d.iterdir()}
    _built(w)
    assert before == {p: R.sha256_file(p) for d in (w["A"], w["B"]) for p in d.iterdir()}
    v18 = ROOT / "desktop_v18_consolidated"
    if not v18.exists():
        fallback = Path(os.environ.get("SET2GO_STANDALONE_DIR", "/Users/andresherrera/Developer/Set2Go")) / "desktop_v18_consolidated"
        if fallback.exists():
            v18 = fallback
    if not v18.exists():
        pytest.skip("desktop_v18_consolidated not available")
    v = run(v18, "--exact", script=VER)
    assert v.returncode == 0 and "ALL CHECKS PASSED" in v.stdout and "[manifest]" not in v.stdout


def test_source_modified_after_export_is_detected_independently_of_the_destination(world):
    w = world
    out, man = _built(w)
    assert verify(out, man).returncode == 0
    src = w["A"] / "predicted.aiff"
    original = src.read_bytes()
    from mutagen.aiff import AIFF
    a = AIFF(str(src)); a.tags.add(TPE1(encoding=3, text="edited after export")); a.save()     # source changes; the export and the manifest still agree with each other
    r = verify(out, man)
    assert r.returncode != 0
    assert any("source still has the manifest sha256" in l and "FAIL" in l for l in r.stdout.splitlines()), r.stdout[-800:]
    assert not any("destination Contents/predicted.aiff sha256 == manifest" in l and "FAIL" in l for l in r.stdout.splitlines())    # the destination check itself still passes
    src.write_bytes(original)
    assert verify(out, man).returncode == 0


def test_rekordbox_grid_extractor_refuses_a_mounted_volume_while_rekordbox_runs(monkeypatch, capsys):
    import importlib.util, types
    spec = importlib.util.spec_from_file_location("rbgrid", ROOT / "scripts/analysis_rekordbox_grid.py")
    g = importlib.util.module_from_spec(spec); spec.loader.exec_module(g)
    assert g.is_mounted_volume(Path("/Volumes/REKTEST")) and not g.is_mounted_volume(ROOT / "reference/rekordbox_official")
    real = subprocess.run
    monkeypatch.setattr(g.subprocess if hasattr(g, "subprocess") else subprocess, "run",
                        lambda cmd, *a, **k: types.SimpleNamespace(stdout="777 rekordbox\n", returncode=0) if cmd[0] == "pgrep" else real(cmd, *a, **k))
    monkeypatch.setattr(sys, "argv", ["x", "/Volumes/REKTEST", "--inventory", str(ROOT / "eval/analysis/blind1/inventory.json")])
    rc = g.main()
    err = capsys.readouterr().err
    assert rc == 2 and "rekordbox is running" in err and "partial export" in err          # the REASON must be the guard, not a missing folder
