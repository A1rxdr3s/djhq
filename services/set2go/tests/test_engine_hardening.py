"""Tests for the bounded engine-hardening round:
  1. Opt-in gridcheck policy (default off; production grids unchanged; blind2 recovered-grid construction without kick shift).
  2. Versioned engine-result contract (ENGINE_CONTRACT_VERSION = "1.0", no invented probabilities).
  3. Explicit analysis-to-export gating (stop before writing partial library; never substitute diagnostic phase_s; exclude preserves relative playlist order).
  4. Separate beat-grid acceptance vs downbeat/bar-origin warnings and accepted_clean vs accepted_with_warnings tiers.
  5. End-to-end local analysis-to-export CLI + verify_export.py --manifest=... --exact including ANLZ PQTZ 1 ms precision check.
"""
from __future__ import annotations

import hashlib
import json
import os
import struct
import subprocess
import sys
import wave
from pathlib import Path

import numpy as np
import pytest
from mutagen.aiff import AIFF
from mutagen.id3 import TKEY, TIT2, TPE1
from rekordbox_pdb.pdb import Database

from set2go import bpm_detect as BD, export as EX, grid as GR, rhythm as RH
from set2go.analysis import contract as C, gridcheck as G, manifest as MF, refs as R

ROOT = Path(__file__).resolve().parent.parent


def _make_synth_wav(path: Path, bpm: float = 128.0, duration_s: int = 20, sr: int = 44100) -> Path:
    """Create a synthetic constant-tempo WAV with clear low-band kicks and A440 tone."""
    t = np.arange(sr * duration_s) / sr
    sig = 0.2 * np.sin(2 * np.pi * 440.0 * t)
    per = 60.0 / bpm
    n_beats = int(duration_s / per)
    for k in range(n_beats):
        i0 = int(round((0.100 + k * per) * sr))
        if i0 + 800 < len(sig):
            env = np.exp(-np.arange(800) / (0.015 * sr))
            sig[i0 : i0 + 800] += 0.75 * env * np.sin(2 * np.pi * 75.0 * np.arange(800) / sr)
    pcm = (np.clip(sig, -0.95, 0.95) * 32767).astype("<i2")
    with wave.open(str(path), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sr)
        wf.writeframes(pcm.tobytes())
    return path


def _make_synth_aiff(path: Path, key_tag: str | None = "8A", bpm: float = 128.0, duration_s: int = 20, sr: int = 44100) -> Path:
    """Create a synthetic constant-tempo AIFF with optional TKEY tag."""
    t = np.arange(sr * duration_s) / sr
    sig = 0.2 * np.sin(2 * np.pi * 440.0 * t)
    per = 60.0 / bpm
    for k in range(int(duration_s / per)):
        i0 = int(round((0.100 + k * per) * sr))
        if i0 + 800 < len(sig):
            env = np.exp(-np.arange(800) / (0.015 * sr))
            sig[i0 : i0 + 800] += 0.75 * env * np.sin(2 * np.pi * 75.0 * np.arange(800) / sr)
    pcm = (np.clip(sig, -0.95, 0.95) * 32767).astype("<i2")
    n = len(pcm)
    comm = b"COMM" + struct.pack(">IhIh", 18, 1, n, 16) + bytes.fromhex("400EAC44000000000000")
    ssnd = b"SSND" + struct.pack(">III", 8 + n * 2, 0, 0) + pcm.byteswap().tobytes()
    body = b"AIFF" + comm + ssnd
    path.write_bytes(b"FORM" + struct.pack(">I", len(body)) + body)
    a = AIFF(str(path))
    a.add_tags()
    a.tags.add(TIT2(encoding=3, text=path.stem))
    a.tags.add(TPE1(encoding=3, text="SynthArtist"))
    if key_tag:
        a.tags.add(TKEY(encoding=3, text=key_tag))
    a.save()
    return path


def _write_raw_pred(raw_dir: Path, audio_path: Path, beats: list[float], downbeats: list[float], use_rel_key: bool = False) -> Path:
    ck_sha = hashlib.sha256(RH.CHECKPOINT.read_bytes()).hexdigest()
    a_sha = R.sha256_file(audio_path)
    dict_key = f"rel/{audio_path.name}" if use_rel_key else str(audio_path.resolve())
    out = raw_dir / f"{audio_path.name}.json"
    out.write_text(
        json.dumps(
            {
                dict_key: {"beats": beats, "downbeats": downbeats, "seconds": 0.05},
                "_meta": {"peak_rss_mb": 120.0, "checkpoint": "beat_this-final0.ckpt"},
                "_provenance": {"checkpoint_sha256": ck_sha, "audio_sha256": a_sha, "model": "beat_this final0", "device": "cpu"},
            }
        )
    )
    return out


def _read_pqtz_entries(dat_path: Path) -> list[tuple[int, int, int]]:
    d = dat_path.read_bytes()
    off = struct.unpack_from(">I", d, 4)[0]
    while off < len(d):
        tag = d[off : off + 4].decode()
        lh, lt = struct.unpack_from(">II", d, off + 4)
        if tag == "PQTZ":
            q = d[off + lh : off + lt]
            nb = len(q) // 8
            return [struct.unpack_from(">HHI", q, i * 8) for i in range(nb)]
        off += lt
    return []


def test_default_off_compatibility_and_rhythm_isolation(tmp_path, monkeypatch):
    """Default export_library(gridcheck=False) never calls gridcheck.evaluate and rhythm.py stays free of gridcheck."""
    assert b"gridcheck" not in Path(RH.__file__).read_bytes()

    wav = _make_synth_wav(tmp_path / "clean.wav", bpm=128.0, duration_s=20)
    ba = BD.analyse_beats(wav)
    per = 60.0 / ba.bpm
    # Create an inconsistent beat sequence so we also verify legacy_fallback is used by default when gridcheck=False
    bad_beats = [round(0.1 + k * (per * 1.03), 4) for k in range(40)]
    bad_dbs = bad_beats[::4]
    rc = tmp_path / "raw"
    rc.mkdir()
    _write_raw_pred(rc, wav, bad_beats, bad_dbs, use_rel_key=True)

    def _forbid_gridcheck(*a, **kw):
        raise AssertionError("gridcheck.evaluate must not be called when gridcheck=False")

    monkeypatch.setattr(G, "evaluate", _forbid_gridcheck)

    out_dir = tmp_path / "out_default"
    res = EX.export_library(
        {"DefaultPL": [EX.TrackSpec(wav)]},
        out_dir,
        rhythm_backend="beat_this",
        raw_cache=rc,
        reuse_raw=True,
    )
    assert out_dir.exists()
    assert res.excluded_tracks == []
    assert res.report["clean.wav"]["grid_auto"]["phase_status"] == "model_inconsistent"
    assert res.engine_report is not None
    assert C.validate_engine_report(res.engine_report) == []
    assert res.engine_report["policy"]["gridcheck"] is False
    assert res.engine_report["policy"]["on_unresolved"] == "legacy_fallback"
    assert res.engine_report["tracks"]["clean.wav"]["grid"]["source"] == "fourier_fallback_unaccepted"


def test_unchanged_production_grid_under_opt_in_gridcheck(tmp_path):
    """When production accepts (cons.status == 'consistent'), gridcheck=True preserves the exact production grid and kick_corr_ms."""
    wav = _make_synth_wav(tmp_path / "prod_ok.wav", bpm=128.0, duration_s=25)
    ba = BD.analyse_beats(wav)
    per = 60.0 / ba.bpm
    beats = [round(0.105 + k * per, 4) for k in range(int(24 / per))]
    dbs = beats[::4]
    rc = tmp_path / "raw"
    rc.mkdir()
    _write_raw_pred(rc, wav, beats, dbs)

    r_off = EX.export_library(
        {"PL": [EX.TrackSpec(wav)]},
        tmp_path / "exp_off",
        rhythm_backend="beat_this",
        raw_cache=rc,
        reuse_raw=True,
        gridcheck=False,
    )
    r_on = EX.export_library(
        {"PL": [EX.TrackSpec(wav)]},
        tmp_path / "exp_on",
        rhythm_backend="beat_this",
        raw_cache=rc,
        reuse_raw=True,
        gridcheck=True,
    )

    ga_off = r_off.report["prod_ok.wav"]["grid_auto"]
    ga_on = r_on.report["prod_ok.wav"]["grid_auto"]
    assert ga_off["anchor_ms"] == ga_on["anchor_ms"]
    assert ga_off["bar_origin"] == ga_on["bar_origin"]
    assert ga_off["kick_corr_ms"] == ga_on["kick_corr_ms"]
    assert ga_on["gridcheck_outcome"] == "production_accept"

    hi, lo = EX._anlz_dirs("/Contents/prod_ok.wav")
    dat_off = (tmp_path / "exp_off/PIONEER/USBANLZ" / hi / lo / "ANLZ0000.DAT").read_bytes()
    dat_on = (tmp_path / "exp_on/PIONEER/USBANLZ" / hi / lo / "ANLZ0000.DAT").read_bytes()
    assert dat_off == dat_on

    # Also verify on real blind2 Bora Bora (125.0 BPM) raw prediction against resolve_rhythm_with_gridcheck
    raw_dir = ROOT / "eval/analysis/blind2/beat_this_raw"
    if not raw_dir.exists():
        fallback = Path(os.environ.get("SET2GO_STANDALONE_DIR", "/Users/andresherrera/Developer/Set2Go")) / "eval/analysis/blind2/beat_this_raw"
        if fallback.exists():
            raw_dir = fallback
    bora_matches = list(raw_dir.glob("*Bora Bora*.json"))
    assert len(bora_matches) == 1
    raw_bora = RH.load_raw(bora_matches[0])
    res_off = C.resolve_rhythm_with_gridcheck(raw_bora, 125.0, 323.0, refine_kick=False, gridcheck=False)
    res_on = C.resolve_rhythm_with_gridcheck(raw_bora, 125.0, 323.0, refine_kick=False, gridcheck=True)
    assert res_on["decision"] == "production_accept"
    assert res_on["anchor_ms"] == res_off["anchor_ms"]
    assert res_on["bar_origin"] == res_off["bar_origin"]


def test_recovered_grids_and_separate_downbeat_warnings_on_blind2_saved_raw():
    """Verify Beat Back (accept_audio_grid + unstable downbeat warning) and Pink Soldiers (accept_with_gaps + flagged window)
    use the exact blind2 grid construction without kick shift and keep beat-grid acceptance separate from downbeat review."""
    raw_dir = ROOT / "eval/analysis/blind2/beat_this_raw"
    if not raw_dir.exists():
        fallback = Path(os.environ.get("SET2GO_STANDALONE_DIR", "/Users/andresherrera/Developer/Set2Go")) / "eval/analysis/blind2/beat_this_raw"
        if fallback.exists():
            raw_dir = fallback
    bb_raw_path = next(raw_dir.glob("*Beat Back*.json"))
    ps_raw_path = next(raw_dir.glob("*Pink Soldiers*.json"))
    oomh_raw_path = next(raw_dir.glob("*Out Of My Head*.json"))

    raw_bb = RH.load_raw(bb_raw_path)
    res_bb = C.resolve_rhythm_with_gridcheck(raw_bb, 128.0, 360.0, gridcheck=True)
    assert res_bb["grid_accepted"] is True
    assert res_bb["decision"] == "accept_audio_grid"
    assert res_bb["grid_source_kind"] == "gridcheck_audio_period"
    assert res_bb["kick_corr_ms"] is None
    expected_bb_anchor_ms = round((float(res_bb["gridcheck_decision"].phase_s) % (60.0 / 128.0)) * 1000.0, 6)
    assert res_bb["anchor_ms"] == expected_bb_anchor_ms
    assert res_bb["bar_origin"] == 1
    assert res_bb["downbeat_majority_share"] == pytest.approx(0.8065, abs=1e-3)
    assert "model_predicted_unstable" in res_bb["downbeat_status"]

    tc_bb = C.build_track_contract(
        filename="Beat Back.aiff",
        source_path="/tmp/Beat Back.aiff",
        sha256="a" * 64,
        duration_s=360.0,
        sample_rate=44100,
        bpm_value=128.0,
        bpm_source="fourier_tempogram",
        model_slope_bpm=res_bb["rhythm_result"].consistency.model_slope_bpm,
        tempo_disagree_bpm=res_bb["rhythm_result"].consistency.tempo_disagree_bpm,
        grid_status="accepted_with_warnings",
        grid_decision=res_bb["decision"],
        grid_source=res_bb["grid_source_kind"],
        grid_bpm=128.0,
        grid_anchor_ms=res_bb["anchor_ms"],
        grid_kick_corr_ms=res_bb["kick_corr_ms"],
        grid_reasons=res_bb["reasons"],
        flagged_windows_s=res_bb["flagged_windows_s"],
        downbeat_bar_origin=res_bb["bar_origin"],
        downbeat_status=res_bb["downbeat_status"],
        downbeat_majority_share=res_bb["downbeat_majority_share"],
        downbeat_review_required=True,
        exported=True,
    )
    assert tc_bb["export_eligibility"]["eligible"] is True
    assert tc_bb["export_eligibility"]["tier"] == "accepted_with_warnings"
    assert tc_bb["downbeat"]["review_required"] is True
    assert any(r["area"] == "downbeat" and r["reason"] == "bar phase unstable" for r in tc_bb["review_reasons"])

    # Pink Soldiers: accept_with_gaps, flagged window [210.0, 240.0], separate downbeat unvalidated warning
    raw_ps = RH.load_raw(ps_raw_path)
    res_ps = C.resolve_rhythm_with_gridcheck(raw_ps, 128.0, 297.231, gridcheck=True)
    assert res_ps["grid_accepted"] is True
    assert res_ps["decision"] == "accept_with_gaps"
    assert res_ps["kick_corr_ms"] is None
    assert res_ps["flagged_windows_s"] == [[210.0, 240.0]]
    expected_ps_anchor_ms = round((float(res_ps["gridcheck_decision"].phase_s) % (60.0 / 128.0)) * 1000.0, 6)
    assert res_ps["anchor_ms"] == expected_ps_anchor_ms
    assert "model_predicted_unvalidated_by_gridcheck" in res_ps["downbeat_status"]

    # Out Of My Head (128.0 BPM): needs_review -> NEVER substitutes diagnostic phase_s
    raw_oomh = RH.load_raw(oomh_raw_path)
    res_oomh = C.resolve_rhythm_with_gridcheck(raw_oomh, 128.0, 340.0, gridcheck=True)
    assert res_oomh["grid_accepted"] is False
    assert res_oomh["decision"] == "needs_review"
    assert res_oomh["anchor_s"] is None
    assert res_oomh["anchor_ms"] is None
    assert res_oomh["grid_auto"]["anchor_ms"] is None


def test_unresolved_stop_before_writing_partial_library_and_contract_validation(tmp_path):
    """When gridcheck=True and a track is unresolved, export_library stops BEFORE creating dest_dir and returns a valid engine_report."""
    w_ok = _make_synth_aiff(tmp_path / "01_ok.aiff", key_tag="8A", bpm=128.0, duration_s=20)
    w_bad = _make_synth_aiff(tmp_path / "02_unresolved.aiff", key_tag="9A", bpm=128.0, duration_s=20)

    ba_ok = BD.analyse_beats(w_ok)
    per_ok = 60.0 / ba_ok.bpm
    beats_ok = [round(0.100 + k * per_ok, 4) for k in range(int(19 / per_ok))]

    # Unexplained slope mismatch on w_bad -> production rejects AND gridcheck returns needs_review
    ba_bad = BD.analyse_beats(w_bad)
    per_bad = 60.0 / (ba_bad.bpm + 1.5)
    beats_bad = [round(0.100 + k * per_bad, 4) for k in range(int(19 / per_bad))]

    rc = tmp_path / "raw"
    rc.mkdir()
    _write_raw_pred(rc, w_ok, beats_ok, beats_ok[::4])
    _write_raw_pred(rc, w_bad, beats_bad, beats_bad[::4])

    dest_dir = tmp_path / "should_not_exist"
    with pytest.raises(EX.UnresolvedExportError) as exc_info:
        EX.export_library(
            {"Main": [EX.TrackSpec(w_ok), EX.TrackSpec(w_bad)]},
            dest_dir,
            rhythm_backend="beat_this",
            raw_cache=rc,
            reuse_raw=True,
            gridcheck=True,
        )

    # Critical invariant: dest_dir was NOT created; no partial library written
    assert not dest_dir.exists()

    eng = exc_info.value.engine_report
    assert eng is not None
    assert C.validate_engine_report(eng) == []
    assert eng["contract_version"] == C.ENGINE_CONTRACT_VERSION
    assert eng["summary"]["export_status"] == "blocked_unresolved"
    assert eng["summary"]["total_selected"] == 2
    assert eng["summary"]["eligible_count"] == 1
    assert eng["summary"]["exported_count"] == 0
    assert eng["tracks"]["01_ok.aiff"]["export_eligibility"]["eligible"] is True
    assert eng["tracks"]["01_ok.aiff"]["export_eligibility"]["tier"] == "accepted_clean"
    assert eng["tracks"]["02_unresolved.aiff"]["export_eligibility"]["eligible"] is False
    assert eng["tracks"]["02_unresolved.aiff"]["grid"]["anchor_ms"] is None
    assert eng["tracks"]["02_unresolved.aiff"]["grid"]["source"] == "none"


def test_explicit_exclusion_preserves_playlist_order_and_passes_verifier(tmp_path):
    """Test 4 tracks (clean, unresolved, recovered-with-warnings, clean) across playlists and through analysis_key_export.py + verify_export.py."""
    t1 = _make_synth_aiff(tmp_path / "10_clean_first.aiff", key_tag="8A", bpm=128.0, duration_s=22)
    t2 = _make_synth_aiff(tmp_path / "20_unresolved_drop.aiff", key_tag="9A", bpm=128.0, duration_s=22)
    t3 = _make_synth_aiff(tmp_path / "30_recovered_warn.aiff", key_tag="10A", bpm=128.0, duration_s=22)
    t4 = _make_synth_aiff(tmp_path / "40_clean_last.aiff", key_tag="11A", bpm=128.0, duration_s=22)

    rc = tmp_path / "raw"
    rc.mkdir()

    # t1 & t4: clean production_accept (100% downbeat majority share)
    for p in (t1, t4):
        ba = BD.analyse_beats(p)
        per = 60.0 / ba.bpm
        b = [round(0.100 + k * per, 4) for k in range(int(21 / per))]
        _write_raw_pred(rc, p, b, b[::4])

    # t2: unexplained slope mismatch -> needs_review
    ba2 = BD.analyse_beats(t2)
    per2 = 60.0 / (ba2.bpm + 1.8)
    b2 = [round(0.100 + k * per2, 4) for k in range(int(21 / per2))]
    _write_raw_pred(rc, t2, b2, b2[::4])

    # t3: beats match audio tempo, except 1 extra beat inserted in the middle so production slope > 0.25 BPM
    # while gridcheck explains the slope from the extra beat and recovers via accept_audio_grid!
    ba3 = BD.analyse_beats(t3)
    per3 = 60.0 / ba3.bpm
    b3_base = [round(0.123456 + k * per3, 6) for k in range(int(21 / per3))]
    mid = len(b3_base) // 2
    b3 = sorted(b3_base + [round(b3_base[mid] + 0.5 * per3, 6)])
    # Also make downbeats slightly unstable (one shifted by 1 beat) so downbeat warning is exercised
    db3 = list(b3_base[::4])
    db3[-1] = b3_base[-3]
    _write_raw_pred(rc, t3, b3, db3)

    # First test multi-playlist relative order via export_library directly
    out_lib = tmp_path / "lib_excl"
    res = EX.export_library(
        {
            "Set A": [EX.TrackSpec(t1), EX.TrackSpec(t2), EX.TrackSpec(t3), EX.TrackSpec(t4)],
            "Set B": [EX.TrackSpec(t4), EX.TrackSpec(t2), EX.TrackSpec(t1)],
        },
        out_lib,
        rhythm_backend="beat_this",
        raw_cache=rc,
        reuse_raw=True,
        gridcheck=True,
        on_unresolved="exclude",
    )
    assert res.excluded_tracks == ["20_unresolved_drop.aiff"]
    eng = res.engine_report
    assert C.validate_engine_report(eng) == []
    assert eng["summary"]["accepted_clean_count"] == 2
    assert eng["summary"]["accepted_with_warnings_count"] == 1
    assert eng["summary"]["unresolved_count"] == 1
    assert eng["summary"]["exported_count"] == 3
    assert eng["summary"]["playlists_exported"]["Set A"] == [
        "10_clean_first.aiff",
        "30_recovered_warn.aiff",
        "40_clean_last.aiff",
    ]
    assert eng["summary"]["playlists_exported"]["Set B"] == [
        "40_clean_last.aiff",
        "10_clean_first.aiff",
    ]

    # Verify recovered grid on t3 has kick_corr_ms=None and PQTZ matches within <= 1.0 ms
    tc3 = eng["tracks"]["30_recovered_warn.aiff"]
    assert tc3["grid"]["decision"] == "accept_audio_grid"
    assert tc3["grid"]["source"] == "gridcheck_audio_period"
    assert tc3["grid"]["kick_corr_ms"] is None
    assert tc3["export_eligibility"]["tier"] == "accepted_with_warnings"

    hi3, lo3 = EX._anlz_dirs("/Contents/30_recovered_warn.aiff")
    pqtz3 = _read_pqtz_entries(out_lib / "PIONEER/USBANLZ" / hi3 / lo3 / "ANLZ0000.DAT")
    assert len(pqtz3) >= 40
    anchor3 = tc3["grid"]["anchor_ms"]
    per3_ms = 60000.0 / tc3["grid"]["bpm"]
    k0 = -int(anchor3 // per3_ms)
    max_err_ms = max(abs(e[2] - (anchor3 + (k0 + i) * per3_ms)) for i, e in enumerate(pqtz3))
    assert max_err_ms <= 0.500001  # exact 1 ms rounding precision

    # Now exercise scripts/analysis_key_export.py CLI end-to-end:
    # 1) Default --gridcheck (stop on unresolved) -> exits 1, no out_dir created, writes _ENGINE_REPORT.json
    cli_stop_out = tmp_path / "cli_stop"
    sidecar_path = tmp_path / "sidecar.json"
    p_stop = subprocess.run(
        [
            sys.executable,
            str(ROOT / "scripts/analysis_key_export.py"),
            str(cli_stop_out),
            str(t1),
            str(t2),
            str(t3),
            str(t4),
            "--sidecar",
            str(sidecar_path),
            "--gridcheck",
            "--raw-cache",
            str(rc),
            "--reuse-raw",
        ],
        capture_output=True,
        text=True,
    )
    assert p_stop.returncode == 1
    assert not cli_stop_out.exists()
    assert not Path(f"{cli_stop_out}_MANIFEST.json").exists()
    stop_report_path = Path(f"{cli_stop_out}_ENGINE_REPORT.json")
    assert stop_report_path.exists()
    stop_rep = json.loads(stop_report_path.read_text())
    assert C.validate_engine_report(stop_rep) == []
    assert stop_rep["summary"]["export_status"] == "blocked_unresolved"

    # 2) --gridcheck --exclude-unresolved -> exits 0, writes export + manifest + engine report, and passes verify_export.py --exact
    cli_excl_out = tmp_path / "cli_excl"
    p_excl = subprocess.run(
        [
            sys.executable,
            str(ROOT / "scripts/analysis_key_export.py"),
            str(cli_excl_out),
            str(t1),
            str(t2),
            str(t3),
            str(t4),
            "--sidecar",
            str(sidecar_path),
            "--gridcheck",
            "--exclude-unresolved",
            "--raw-cache",
            str(rc),
            "--reuse-raw",
        ],
        capture_output=True,
        text=True,
    )
    assert p_excl.returncode == 0, p_excl.stderr
    assert cli_excl_out.exists()
    man_path = Path(f"{cli_excl_out}_MANIFEST.json")
    eng_path = Path(f"{cli_excl_out}_ENGINE_REPORT.json")
    assert man_path.exists() and eng_path.exists()
    man_data = MF.load(man_path)
    assert man_data["excluded_tracks"] == ["20_unresolved_drop.aiff"]
    assert [Path(x["destination"]).name for x in man_data["tracks"]] == [
        "10_clean_first.aiff",
        "30_recovered_warn.aiff",
        "40_clean_last.aiff",
    ]

    p_ver = subprocess.run(
        [
            sys.executable,
            str(ROOT / "scripts/verify_export.py"),
            str(cli_excl_out),
            f"--manifest={man_path}",
            "--exact",
        ],
        capture_output=True,
        text=True,
    )
    assert p_ver.returncode == 0, p_ver.stdout + "\n" + p_ver.stderr
    assert "ALL CHECKS PASSED" in p_ver.stdout
    assert "PQTZ matches engine grid" in p_ver.stdout
    assert "excluded tracks absent from PDB" in p_ver.stdout


def test_manual_override_resolves_unaccepted_track_under_gridcheck_stop(tmp_path):
    """A hash-linked manual grid override resolves an otherwise unaccepted track so on_unresolved='stop' succeeds."""
    w_bad = _make_synth_aiff(tmp_path / "manual_fixed.aiff", key_tag="8A", bpm=128.0, duration_s=20)
    ba = BD.analyse_beats(w_bad)
    per_bad = 60.0 / (ba.bpm + 1.8)
    beats_bad = [round(0.100 + k * per_bad, 4) for k in range(int(19 / per_bad))]
    rc = tmp_path / "raw"
    rc.mkdir()
    _write_raw_pred(rc, w_bad, beats_bad, beats_bad[::4])

    overrides_file = tmp_path / "overrides.json"
    overrides_file.write_text(
        json.dumps(
            {
                w_bad.name: {
                    "sha256": R.sha256_file(w_bad),
                    "manual": {"bpm": 128.0, "anchor_ms": 100.0, "bar_origin": 1, "note": "human grid"},
                }
            }
        )
    )

    out_dir = tmp_path / "exp_manual"
    res = EX.export_library(
        {"PL": [EX.TrackSpec(w_bad)]},
        out_dir,
        rhythm_backend="beat_this",
        raw_cache=rc,
        reuse_raw=True,
        gridcheck=True,
        on_unresolved="stop",
        overrides_path=overrides_file,
    )
    assert out_dir.exists()
    tc = res.engine_report["tracks"][w_bad.name]
    assert tc["grid"]["status"] == "accepted"
    assert tc["grid"]["decision"] == "manual_override"
    assert tc["grid"]["source"] == "manual_override"
    assert tc["export_eligibility"]["tier"] == "accepted_clean"


def test_beat_analysis_does_not_retain_kick_envelope_and_preserves_numerical_outputs(tmp_path):
    """BeatAnalysis must not retain a full-track float64 kick_env array, while preserving exact outputs."""
    from set2go.waveform import _read_mono_float32, compute_waveforms

    w = _make_synth_aiff(tmp_path / "equiv.aiff", key_tag="8A", bpm=125.0, duration_s=15)
    mono, sr = _read_mono_float32(w)
    ba_direct = BD.analyse_beats(w)
    ba_shared = BD.analyse_beats(w, mono_sr=(mono, sr))
    assert not hasattr(ba_direct, "kick_env")
    assert not hasattr(ba_shared, "kick_env")
    assert ba_direct.bpm == ba_shared.bpm
    assert ba_direct.beats == ba_shared.beats
    assert ba_direct.phase == ba_shared.phase
    assert ba_direct.drift_ms == ba_shared.drift_ms

    wf_direct = compute_waveforms(w)
    wf_shared = compute_waveforms(w, mono_sr=(mono, sr))
    assert wf_direct == wf_shared
