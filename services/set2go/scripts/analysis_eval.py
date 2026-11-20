#!/usr/bin/env python3
"""Reproducible analysis evaluation (local, read-only on audio; never touches a USB or the stable export).

    .venv/bin/python scripts/analysis_eval.py [--refs analysis_refs/dev.json] [--out eval/analysis/run_<stamp>.json]
        [--raw-dir frozen/desktop_v4_rhythm/raw_predictions] [--tracks <dir>]

For every audio file: sha256, tags (candidate references), official rekordbox analysis where preserved (comparison reference), user/MiK labels where
supplied (analysis_refs), then the algorithm predictions: tempo (Fourier), Beat This! raw beats/downbeats (cached predictions are reused, never silently
re-run), rhythm consistency, key from libKeyFinder and from the chroma estimator (run even when a tag exists). Key relations are reported as separate
categories. Missing references are reported as "no reference", never scored.
"""
import argparse, json, platform, resource, sys, time
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))
from set2go import bpm_detect as B, rhythm as Rh, key_detect as KD
from set2go.waveform import _read_mono_float32
from set2go.analysis import ANALYSIS_VERSION, metrics as M, keys as K, refs as R, review as RV, lowmem as LM

OFF = {  # preserved official rekordbox export (comparison reference): audio name prefix -> USBANLZ dir
    "Earth": "P00E/000254CE", "Snoop": "P010/00029208", "Zsak": "P074/0001EA48"}
EXTS = (".wav", ".aiff", ".aif")


def rss_mib() -> float:
    return resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 2**20


def official_for(name: str):
    for pre, d in OFF.items():
        if name.startswith(pre):
            return R.official_pqtz(ROOT / "reference/rekordbox_official/PIONEER/USBANLZ" / d / "ANLZ0000.DAT")
    return None


def key_block(path: Path, mono, sr: int, tag: dict, ref_keys: dict) -> dict:
    t0 = time.time()
    kf = KD.detect_key_from_file(path)
    t_kf = time.time() - t0
    t0 = time.time()
    chroma, cinfo = K.chroma_from_audio(mono, sr)
    est = {"krumhansl": K.estimate_from_chroma(chroma, "krumhansl"), "temperley": K.estimate_from_chroma(chroma, "temperley")}
    t_ch = time.time() - t0
    ests = {"libkeyfinder": ({"name": kf.key_name, "camelot": kf.camelot, "parallel_gap": None} if kf else None),
            "chroma_krumhansl": est["krumhansl"], "chroma_temperley": est["temperley"]}
    out = {"estimators": ests, "chroma_params": cinfo, "runtime_s": {"libkeyfinder": round(t_kf, 2), "chroma": round(t_ch, 2)},
           "tag": tag.get("key"), "references": {}}
    cands = {}
    if tag.get("key"):
        cands["tag"] = tag["key"]["name"]
    for kind, v in ref_keys.items():
        cands[kind] = v
    for kind, v in cands.items():
        pk = K.parse_key(v)
        if pk is None:
            out["references"][kind] = {"value": v, "error": "unparseable"}
            continue
        rel = {}
        for en, e in ests.items():
            pe = K.parse_key(e["name"]) if e else None
            rel[en] = K.relation(pe, pk) if pe else "no estimate"
        out["references"][kind] = {"value": v, "camelot": K.camelot(*pk), "relation_by_estimator": rel}
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--refs"); ap.add_argument("--out"); ap.add_argument("--tracks", default=str(ROOT / "test-tracks"))
    ap.add_argument("--raw-dir", default=str(ROOT / "frozen/desktop_v4_rhythm/raw_predictions"))
    ap.add_argument("--no-chroma", action="store_true")
    ap.add_argument("--lowmem", action="store_true", help="use the blocked (bit-identical, ~80%% less memory) onset envelope")
    a = ap.parse_args()
    refs = R.load_refs(Path(a.refs) if a.refs else None)
    tracks = sorted(p for p in Path(a.tracks).iterdir() if p.suffix.lower() in EXTS)
    ck_sha = R.sha256_file(Rh.CHECKPOINT) if Rh.CHECKPOINT.exists() else None
    run = {"analysis_version": ANALYSIS_VERSION, "started": time.strftime("%Y-%m-%dT%H:%M:%S%z"), "host": platform.platform(),
           "python": sys.version.split()[0], "beat_this_checkpoint_sha256": ck_sha, "raw_dir": a.raw_dir,
           "review_limits": RV.LIMITS, "lowmem": a.lowmem, "tracks": {}}
    for p in tracks:
        t_all = time.time()
        sha = R.sha256_file(p)
        entry_ref = refs["tracks"].get(sha, {})
        labels = entry_ref.get("labels", {})
        mono, sr = _read_mono_float32(p)
        dur = len(mono) / sr
        tag = R.tags_for(p)
        e = {"filename": p.name, "sha256": sha, "split": entry_ref.get("split", "development (default, no refs entry)"), "duration_s": round(dur, 1),
             "tags": tag, "labels": labels}
        # tempo (Fourier) -- same function the export uses
        t0 = time.time(); broad, kick, fps = (LM.onset_envelope_blocked if a.lowmem else B._onset_envelope)(mono, sr); bpm = B.estimate_tempo(broad, fps); t_tempo = time.time() - t0
        e["tempo"] = {"fourier_bpm": round(bpm, 3), "runtime_s": round(t_tempo, 2)}
        # Beat This! cached raw predictions (provenance checked by rhythm.load_raw)
        rawp = Path(a.raw_dir) / f"{p.name}.json"
        rr = None
        if rawp.exists():
            rd = json.loads(rawp.read_text()); prov = rd.get("_provenance")
            frozen = json.loads((ROOT / "frozen/desktop_v4_rhythm/GRIDS.json").read_text()).get(p.name, {}).get("sha256")
            if prov and prov.get("audio_sha256") != sha:
                sys.exit(f"{p.name}: cached prediction was made for different audio (provenance sha256 mismatch)")
            if not prov and frozen != sha:
                sys.exit(f"{p.name}: frozen prediction has no provenance and its audio sha256 differs from the frozen sidecar")
            raw = Rh.load_raw(rawp)
            rr = Rh.build_rhythm(raw, bpm, mono, sr, True)
            c = rr.consistency
            per = 60.0 / bpm
            e["rhythm"] = {"phase_status": "model_consistent" if rr.anchor_s is not None else "model_inconsistent", "reasons": c.reasons,
                           "model_slope_bpm": round(c.model_slope_bpm, 3), "tempo_disagree_bpm": round(c.tempo_disagree_bpm, 3),
                           "median_abs_residual_ms": round(c.median_abs_residual_ms, 1), "inlier_fraction": round(c.inlier_fraction, 3),
                           "bad_regions_s": c.bad_regions_s, "anchor_s": rr.anchor_s, "kick_corr_ms": rr.kick_corr_ms,
                           "bar_origin": rr.bar_origin, "downbeat_majority_share": rr.downbeat_majority_share,
                           "model_runtime_s": raw.seconds, "model_peak_rss_mb": raw.peak_rss_mb,
                           "raw_beats": len(raw.beats), "raw_downbeats": len(raw.downbeats)}
            if rr.anchor_s is not None:
                e["rhythm"]["downbeat_stability"] = M.downbeat_stability(raw.downbeats, per, rr.anchor_s)
            else:   # intrinsic stability only informative when a constant grid exists; report model downbeat spacing instead
                d = np.diff(np.array(raw.downbeats))
                e["rhythm"]["downbeat_interval_s"] = {"median": float(np.median(d)), "min": float(d.min()), "max": float(d.max())} if len(d) else None
        else:
            e["rhythm"] = {"note": f"no cached Beat This! prediction at {rawp} (not re-run by this script)"}
        # references: BPM / beats / downbeats
        refs_bpm = {}
        if labels.get("user", {}).get("bpm"): refs_bpm["user"] = labels["user"]["bpm"]
        if labels.get("mik", {}).get("bpm"): refs_bpm["mik"] = labels["mik"]["bpm"]
        if tag.get("tbpm_value"): refs_bpm["tag(TBPM, candidate)"] = tag["tbpm_value"]
        off = official_for(p.name)
        if off is not None: refs_bpm["official rekordbox (comparison)"] = float(np.median(off[2]))
        e["bpm_vs_refs"] = {k: M.bpm_metrics(bpm, v) for k, v in refs_bpm.items()} or "no reference"
        if off is not None and rr is not None and rr.anchor_s is not None:
            est_s = rr.anchor_s + np.arange(int((dur - rr.anchor_s) / (60 / bpm))) * (60 / bpm) - (rr.kick_corr_ms or 0) / 1000.0 * 0
            est_num = (rr.bar_origin - 1 + np.arange(len(est_s))) % 4 + 1
            e["beats_vs_official"] = M.beat_timing(est_s + 0.0, off[0], 60 / bpm)
            e["downbeat_vs_official"] = M.downbeat_phase(est_s, est_num, off[0], off[1], 60 / bpm)
        else:
            e["beats_vs_official"] = "no reference" if off is None else "no exported grid (model inconsistent)"
        ru = {k: v["key"] for k, v in labels.items() if v.get("key")}
        e["key"] = key_block(p, mono, sr, tag, ru) if not a.no_chroma else {"skipped": True}
        e["review"] = RV.review_reasons(e["rhythm"] if "phase_status" in e["rhythm"] else None, e["key"] if not a.no_chroma else None)
        e["runtime_total_s"] = round(time.time() - t_all, 2)
        run["tracks"][p.name] = e
        print(f"{p.name[:34]:35s} tempo {bpm:8.3f} | key tag {tag.get('key',{}).get('camelot','-'):>3} kf {e['key']['estimators']['libkeyfinder']['camelot'] if not a.no_chroma and e['key']['estimators']['libkeyfinder'] else '-':>3}"
              f" | review: {len(e['review'])} reason(s)", flush=True)
    run["peak_rss_mib"] = round(rss_mib())
    out = Path(a.out) if a.out else ROOT / f"eval/analysis/run_{time.strftime('%Y%m%d_%H%M%S')}.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(run, indent=1, default=str))
    print("wrote", out)
    return 0


if __name__ == "__main__":
    sys.exit(main())
