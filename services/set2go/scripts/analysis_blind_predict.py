#!/usr/bin/env python3
"""Blind batch, phase 1: RAW audio-only predictions under eval/analysis/blind1/FROZEN_CONFIG.json. Reads NO tag, filename text or reference.

    .venv/bin/python scripts/analysis_blind_predict.py

Writes eval/analysis/blind1/predictions_RAW.json (timestamps, parameters, versions, source hashes, per-stage runtime/RSS) and records its sha256 in RAW_SEAL.json.
Nothing is derived or compared here; scripts/analysis_blind_derive.py builds grids and review reasons from the SAVED raw values. Each stage that can be isolated runs in its
own process so its runtime and peak RSS are attributable."""
import hashlib, json, os, resource, subprocess, sys, time
from pathlib import Path
import numpy as np
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))
B1 = ROOT / "eval/analysis/blind1"
SRC = ROOT / "test-tracks/unprocessed"


def tempo_child(path: str) -> None:
    """Audio-only tempo + octave alternatives. Decodes with the project reader; touches no tag."""
    from set2go import bpm_detect as B
    from set2go.waveform import _read_mono_float32
    t0 = time.time(); m, sr = _read_mono_float32(Path(path)); t_dec = time.time() - t0
    t0 = time.time(); broad, kick, fps = B._onset_envelope(m, sr); t_env = time.time() - t0
    t0 = time.time(); bpm = B.estimate_tempo(broad, fps); t_est = time.time() - t0
    alts = {}
    for name, r in (("half", 0.5), ("double", 2.0), ("two_thirds", 2 / 3), ("three_halves", 1.5)):
        b = bpm * r
        alts[name] = {"bpm": round(b, 3), "score": float(B._tempo_scores(broad, fps, np.array([b]))[0]) if 40 <= b <= 250 else None}
    chosen = float(B._tempo_scores(broad, fps, np.array([bpm]))[0])
    print(json.dumps({"fourier_bpm": round(bpm, 3), "chosen_score": chosen, "alternatives": alts, "envelope_fps": fps, "audio_seconds": round(len(m) / sr, 3), "sample_rate": sr,
                      "seconds": {"decode": round(t_dec, 2), "envelope": round(t_env, 2), "tempo": round(t_est, 2)}, "peak_rss_mib": round(resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 2**20)}))


def kf_child(path: str) -> None:
    from set2go import key_detect as KD
    t0 = time.time()
    try:
        r = KD.detect_key_from_file(Path(path)); res = {"name": r.key_name, "camelot": r.camelot} if r else {"error": "no result (silent audio or library unavailable)"}
    except Exception as e:
        res = {"error": f"{type(e).__name__}: {e}"}
    res.update(seconds=round(time.time() - t0, 2), peak_rss_mib=round(resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 2**20))
    print(json.dumps(res))


def main(argv: list[str] | None = None) -> int:
    import argparse
    from set2go import rhythm as Rh
    ap = argparse.ArgumentParser(allow_abbrev=False)
    ap.add_argument("--batch-dir", type=Path, default=B1)
    ap.add_argument("--src-dir", type=Path, default=SRC)
    args = ap.parse_args(argv)
    bdir = args.batch_dir
    sdir = args.src_dir
    cfg = json.loads((bdir / "FROZEN_CONFIG.json").read_text()); inv = json.loads((bdir / "inventory.json").read_text())
    if (bdir / "predictions_RAW.json").exists() or (bdir / "RAW_SEAL.json").exists():
        raise SystemExit("predictions_RAW.json or RAW_SEAL.json already exists: the initial results are preserved and never overwritten")
    started = time.strftime("%Y-%m-%dT%H:%M:%S%z")
    out = {"started": started, "frozen_config": "FROZEN_CONFIG.json", "frozen_config_sha256": hashlib.sha256((bdir / "FROZEN_CONFIG.json").read_bytes()).hexdigest(), "tracks": {}}
    ck = hashlib.sha256(Rh.CHECKPOINT.read_bytes()).hexdigest()
    for e in inv["files"]:
        p = sdir / e["file"]
        assert hashlib.sha256(p.read_bytes()).hexdigest() == e["sha256"], f"{e['file']}: bytes changed since the inventory"
        t = {"file": e["file"], "sha256": e["sha256"], "decoded_pcm_sha256": e["decoded_pcm_sha256"], "stages": {}}
        t0 = time.time()
        o = subprocess.run([sys.executable, __file__, "tempo-child", str(p)], capture_output=True, text=True)
        t["stages"]["tempo"] = json.loads(o.stdout.strip().splitlines()[-1]) if o.returncode == 0 else {"error": o.stderr[-300:]}
        t["stages"]["tempo"]["wall_s"] = round(time.time() - t0, 2); t["stages"]["tempo"]["at"] = time.strftime("%H:%M:%S")
        raw_path = bdir / "beat_this_raw" / f"{p.name}.json"; raw_path.parent.mkdir(exist_ok=True)
        t0 = time.time()
        try:
            raw = Rh.run_model(p, raw_path, audio_sha256=e["sha256"])
            d = json.loads(raw_path.read_text())
            t["stages"]["beat_this"] = {"beats": raw.beats, "downbeats": raw.downbeats, "model_seconds": raw.seconds, "model_peak_rss_mb": raw.peak_rss_mb, "checkpoint_sha256": ck,
                                        "provenance": d.get("_provenance"), "n_beats": len(raw.beats), "n_downbeats": len(raw.downbeats)}
        except Exception as ex:
            t["stages"]["beat_this"] = {"error": f"{type(ex).__name__}: {ex}"}
        t["stages"]["beat_this"]["wall_s"] = round(time.time() - t0, 2); t["stages"]["beat_this"]["at"] = time.strftime("%H:%M:%S")
        t0 = time.time()
        o = subprocess.run([sys.executable, __file__, "kf-child", str(p)], capture_output=True, text=True)
        t["stages"]["libkeyfinder"] = json.loads(o.stdout.strip().splitlines()[-1]) if o.returncode == 0 else {"error": o.stderr[-300:]}
        t["stages"]["libkeyfinder"].update(label="libkeyfinder 2.2.8", wall_s=round(time.time() - t0, 2), at=time.strftime("%H:%M:%S"))
        out["tracks"][e["file"]] = t
        print(f"{e['file'][:40]:41s} tempo {t['stages']['tempo'].get('fourier_bpm')} | beats {t['stages']['beat_this'].get('n_beats')} | kf {t['stages']['libkeyfinder'].get('camelot')}", flush=True)
    # Essentia advisory profiles: one isolated worker process for all batch files (frozen profiles, library defaults)
    t0 = time.time(); raw_e = bdir / "essentia_raw.json"
    r = subprocess.run([str(ROOT / ".venv-key/bin/python"), str(ROOT / "scripts/key_worker.py"), str(raw_e), *[str(sdir / x["file"]) for x in inv["files"]], "--profiles", "bgate,edma,edmm,braw"],
                       capture_output=True, text=True)
    ess = json.loads(raw_e.read_text()) if r.returncode == 0 and raw_e.exists() else {}
    for e in inv["files"]:
        v = ess.get(str(sdir / e["file"]))
        out["tracks"][e["file"]]["stages"]["essentia_advisory"] = ({"essentia": ess["_meta"]["essentia"], "ml_models_loaded": ess["_meta"]["ml_models_loaded"], "decode_s": v["load_s"],
                                                                   "profiles": {k: ({"name": f"{x['key']} {x['scale']}", "strength": x["strength"], "seconds": x["seconds"], "params": x["params"]} if "key" in x else {"error": x.get("error")})
                                                                                for k, x in v["profiles"].items()}} if v else {"error": f"worker failed: {r.stderr[-300:]}"})
    out["essentia_wall_s"] = round(time.time() - t0, 2); out["essentia_peak_rss_mib"] = ess.get("_meta", {}).get("peak_rss_mb")
    for e in inv["files"]:
        assert hashlib.sha256((sdir / e["file"]).read_bytes()).hexdigest() == e["sha256"], f"{e['file']}: bytes changed after prediction"
    out["finished"] = time.strftime("%Y-%m-%dT%H:%M:%S%z")
    (bdir / "predictions_RAW.json").write_text(json.dumps(out, indent=1))
    seal = {"file": "predictions_RAW.json", "sha256": hashlib.sha256((bdir / "predictions_RAW.json").read_bytes()).hexdigest(), "sealed_at": out["finished"],
            "note": "initial results; not edited afterwards; any comparison with Mixed In Key or rekordbox happens only after this seal"}
    (bdir / "RAW_SEAL.json").write_text(json.dumps(seal, indent=1)); print("sealed", seal["sha256"][:16], seal["sealed_at"])
    return 0


if __name__ == "__main__":
    if len(sys.argv) > 2 and sys.argv[1] == "tempo-child": tempo_child(sys.argv[2])
    elif len(sys.argv) > 2 and sys.argv[1] == "kf-child": kf_child(sys.argv[2])
    else: sys.exit(main())
