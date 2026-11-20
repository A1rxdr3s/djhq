#!/usr/bin/env python3
"""Blind batch, phase 2: derive grids, consistency, downbeat stability, advisory half-bar evidence and REVIEW REASONS from the SAVED raw predictions
(predictions_RAW.json, verified against RAW_SEAL.json). Reads the audio (decoded PCM) but no tag, filename text or reference. Writes derived.json; the raw file is untouched.

    .venv/bin/python scripts/analysis_blind_derive.py
"""
import hashlib, json, sys, time
from pathlib import Path
import numpy as np
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))
from set2go import bpm_detect as B, rhythm as Rh
from set2go.analysis import barphase as BP, gridcheck as G, metrics as M, review as RV, keys as K
from set2go.waveform import _read_mono_float32

B1 = ROOT / "eval/analysis/blind1"
SRC = ROOT / "test-tracks/unprocessed"


def main(argv: list[str] | None = None) -> int:
    import argparse
    ap = argparse.ArgumentParser(allow_abbrev=False)
    ap.add_argument("--batch-dir", type=Path, default=B1)
    ap.add_argument("--src-dir", type=Path, default=SRC)
    args = ap.parse_args(argv)
    bdir = args.batch_dir
    sdir = args.src_dir
    if (bdir / "derived.json").exists():
        raise SystemExit(f"{bdir / 'derived.json'} already exists: refusing to overwrite existing evidence")
    seal = json.loads((bdir / "RAW_SEAL.json").read_text())
    assert hashlib.sha256((bdir / "predictions_RAW.json").read_bytes()).hexdigest() == seal["sha256"], "predictions_RAW.json changed after the seal"
    raw = json.loads((bdir / "predictions_RAW.json").read_text())
    out = {"created": time.strftime("%Y-%m-%dT%H:%M:%S%z"), "raw_sha256": seal["sha256"], "review_limits": RV.LIMITS, "tracks": {}}
    for name, t in raw["tracks"].items():
        st = t["stages"]; tempo = st["tempo"]; bt = st["beat_this"]; d = {"file": name, "decoded_pcm_sha256": t["decoded_pcm_sha256"]}
        bpm = tempo["fourier_bpm"]; per = 60 / bpm; dur_s = float(tempo["audio_seconds"])
        # tempo alternatives: compare scores relative to the chosen one (reporting only)
        alts = {k: {"bpm": v["bpm"], "score_ratio_to_chosen": (round(v["score"] / tempo["chosen_score"], 3) if v["score"] else None)} for k, v in tempo["alternatives"].items()}
        d["tempo"] = {"bpm": bpm, "alternatives": alts, "strong_alternative": [k for k, v in alts.items() if v["score_ratio_to_chosen"] and v["score_ratio_to_chosen"] >= 0.8]}
        if "error" in bt:
            d["rhythm"] = {"error": bt["error"]}; d["review"] = [{"area": "beats", "reason": f"Beat This! failed: {bt['error']}"}]
        else:
            mono, sr = _read_mono_float32(sdir / name)
            mr = Rh.ModelRaw(bt["beats"], bt["downbeats"], bt["model_seconds"], bt["model_peak_rss_mb"], "")
            c = Rh.check_consistency(mr, bpm)
            rr = Rh.build_rhythm(mr, bpm, mono, sr, True)
            gdec = G.evaluate(bt["beats"], bpm, production_status=c.status, model_slope_bpm=c.model_slope_bpm, duration_s=dur_s)
            gforced = G.evaluate(bt["beats"], bpm, production_status="inconsistent", model_slope_bpm=c.model_slope_bpm, duration_s=dur_s)
            gmeas = gdec if c.status != "consistent" else gforced
            r = {"phase_status": "model_consistent" if rr.anchor_s is not None else "model_inconsistent", "reasons": c.reasons, "model_slope_bpm": round(c.model_slope_bpm, 3),
                 "tempo_disagree_bpm": round(c.tempo_disagree_bpm, 3), "median_abs_residual_ms": round(c.median_abs_residual_ms, 1), "inlier_fraction": round(c.inlier_fraction, 3),
                 "bad_regions_s": c.bad_regions_s, "longest_bad_run": c.longest_bad_run, "anchor_s": rr.anchor_s, "kick_corr_ms": rr.kick_corr_ms, "bar_origin": rr.bar_origin,
                 "downbeat_status": rr.downbeat_status, "downbeat_majority_share": rr.downbeat_majority_share, "n_beats": len(bt["beats"]), "n_downbeats": len(bt["downbeats"]),
                 "experimental_gridcheck": {
                     "outcome": gdec.outcome,
                     "reasons": gdec.reasons,
                     "bad_windows_s": [list(w) for w in gdec.bad_windows_s],
                     "slope_explained": gdec.slope_explained,
                     "fit_fraction": round(gmeas.fit_fraction, 4),
                     "coverage": round(gmeas.coverage, 4),
                     "ramp_ms_per_min": round(gmeas.ramp_ms_per_min, 2),
                     "missing_slots": gmeas.n_missing_slots,
                     "extra_beats": gmeas.n_extra_beats,
                 }}
            # model tempo vs Fourier: a half/double relation would show as slope ratio near 0.5/2
            r["model_to_fourier_ratio"] = round(c.model_slope_bpm / bpm, 4)
            ev = None
            if rr.anchor_s is not None:
                r["downbeat_stability"] = M.downbeat_stability(bt["downbeats"], per, rr.anchor_s)
                f = BP.beat_features(mono, sr, rr.anchor_s, bpm)
                db = np.array(bt["downbeats"]); ph = np.round((db - rr.anchor_s) / per).astype(int) % 4; maj = int(np.bincount(ph, minlength=4).argmax())
                ev = BP.backbeat_evidence(f["full_flux"], f["times"], db, ph, maj, per); r["half_bar_evidence"] = ev
            d["rhythm"] = r
            d["review"] = RV.review_reasons({"phase_status": r["phase_status"], "reasons": r["reasons"], "downbeat_majority_share": r["downbeat_majority_share"],
                                             "tempo_disagree_bpm": r["tempo_disagree_bpm"]}, None, ev)
            if d["tempo"]["strong_alternative"]:
                d["review"].append({"area": "tempo", "reason": "tempogram has a strong metrical alternative (score >= 0.8 of the chosen tempo)", "detail": {k: alts[k] for k in d["tempo"]["strong_alternative"]}})
        kf = st["libkeyfinder"]; ess = st["essentia_advisory"]
        preds = {}
        if "name" in kf: preds["libkeyfinder 2.2.8"] = kf["name"]
        for k, v in (ess.get("profiles") or {}).items():
            if "name" in v: preds[f"essentia:{k} 2.1b6"] = v["name"]
        parsed = {k: K.parse_key(v) for k, v in preds.items() if K.parse_key(v)}
        base = parsed.get("libkeyfinder 2.2.8")
        dis = {}
        if base:
            for k, p in parsed.items():
                if k != "libkeyfinder 2.2.8": dis[k] = {"camelot": K.camelot(*p), "relation_to_libkeyfinder": K.relation(p, base)}
        d["key"] = {"selected_baseline": {"backend": "libkeyfinder 2.2.8", "name": kf.get("name"), "camelot": kf.get("camelot"), "error": kf.get("error")},
                    "advisory": dis, "advisory_note": "separate predictions; no selection or hybrid; agreement is not evidence of correctness"}
        if "error" in kf: d["review"].append({"area": "key", "reason": f"libKeyFinder failed: {kf['error']}"})
        nonexact = {k: v for k, v in dis.items() if v["relation_to_libkeyfinder"] != "exact"}
        if nonexact: d["review"].append({"area": "key", "reason": "advisory Essentia profiles disagree with the libKeyFinder baseline", "detail": {k: f"{v['camelot']} ({v['relation_to_libkeyfinder']})" for k, v in nonexact.items()}})
        modes = {k: p[1] for k, p in parsed.items()}
        if len(set(modes.values())) > 1: d["review"].append({"area": "key", "reason": "methods disagree on MODE (major/minor)", "detail": modes})
        fam = {k.split(":")[0].split(" ")[0] for k in parsed}
        if len(fam) >= 2 and len({p[0] for p in parsed.values()}) > 1: d["review"].append({"area": "key", "reason": "method families disagree on the TONIC", "detail": {k: K.camelot(*p) for k, p in parsed.items()}})
        d["runtime_s"] = {"tempo": tempo["wall_s"], "beat_this": bt.get("wall_s"), "libkeyfinder": kf.get("wall_s"), "essentia_batch_per_track": round(raw["essentia_wall_s"] / len(raw["tracks"]), 2)}
        d["runtime_s"]["total_excl_derive"] = round(d["runtime_s"]["tempo"] + (d["runtime_s"]["beat_this"] or 0) + (d["runtime_s"]["libkeyfinder"] or 0) + d["runtime_s"]["essentia_batch_per_track"], 1)
        out["tracks"][name] = d
    (bdir / "derived.json").write_text(json.dumps(out, indent=1, default=str))
    print("wrote", bdir / "derived.json", "for", len(out["tracks"]), "tracks; raw sha256 verified against the seal")
    return 0


if __name__ == "__main__":
    sys.exit(main())
