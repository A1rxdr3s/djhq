#!/usr/bin/env python3
"""Blind batch comparison (after the seal): sealed predictions vs Mixed In Key payloads. Writes comparison.json only.
    .venv/bin/python scripts/analysis_blind_compare.py [--batch-dir eval/analysis/blind1] [--copies-dir test-tracks/blind1-comparison]
Refuses to run if comparison.json already exists, if predictions_RAW.json no longer matches RAW_SEAL.json, or if source/copy audio does not match the inventory."""
import argparse, hashlib, json, sys
from pathlib import Path
import numpy as np
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))
from set2go.analysis import gridcheck as G, keys as K, metrics as M, refs as R
from set2go.waveform import _read_mono_float32
B1 = ROOT / "eval/analysis/blind1"; COPIES = ROOT / "test-tracks/blind1-comparison"


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(allow_abbrev=False)
    ap.add_argument("--batch-dir", type=Path, default=B1)
    ap.add_argument("--copies-dir", type=Path, default=COPIES)
    args = ap.parse_args(argv)
    bdir = args.batch_dir
    cdir = args.copies_dir
    comp_path = bdir / "comparison.json"
    if comp_path.exists():
        raise SystemExit(f"{comp_path} already exists: refusing to overwrite existing comparison")

    seal = json.loads((bdir / "RAW_SEAL.json").read_text())
    raw_bytes = (bdir / "predictions_RAW.json").read_bytes()
    assert hashlib.sha256(raw_bytes).hexdigest() == seal["sha256"], "sealed predictions changed"
    raw = json.loads(raw_bytes)
    inv = json.loads((bdir / "inventory.json").read_text())
    inv_by_name = {f["file"]: f for f in inv["files"]}
    der = json.loads((bdir / "derived.json").read_text())["tracks"]
    out = {
        "seal_sha256": seal["sha256"],
        "frozen_config_sha256": hashlib.sha256((bdir / "FROZEN_CONFIG.json").read_bytes()).hexdigest(),
        "references": "Mixed In Key GEOB payloads (self-declared writer); comparison reference ONLY, NOT ground truth. MiK GEOB:BeatGrid has no bar/downbeat numbers and cannot validate bar origin. Tempo agreement does not validate gridcheck.",
        "tracks": {},
    }
    for name, t in raw["tracks"].items():
        p = cdir / name
        byte_sha = hashlib.sha256(p.read_bytes()).hexdigest()
        byte_matches_inv = (name in inv_by_name and byte_sha == inv_by_name[name]["sha256"])
        m, sr = _read_mono_float32(p)
        linked = hashlib.sha256(m.tobytes()).hexdigest() == t["decoded_pcm_sha256"]
        assert linked, f"{name}: copy audio differs from the blind run"
        a = R.read_mik_annotations(p) or {"fields": {}, "geob": {}, "provenance": {}, "conflicts": []}
        g = a.get("geob") or {}
        bt = g.get("beatgrid") or {}
        gk = g.get("key") or {}
        d = der[name]; st = t["stages"]

        mik_key_str = gk.get("key") or a.get("fields", {}).get("tkey")
        ref_key = K.parse_key(mik_key_str) if mik_key_str else None
        preds = {"libkeyfinder 2.2.8": st["libkeyfinder"]["name"]}
        preds.update({f"essentia:{k} 2.1b6": v["name"] for k, v in st["essentia_advisory"]["profiles"].items() if "name" in v})
        if ref_key:
            krel = {
                k: {
                    "pred": K.camelot(*K.parse_key(v)),
                    "relation": K.relation(K.parse_key(v), ref_key),
                    "tonic": K.parse_key(v)[0] == ref_key[0],
                    "mode": K.parse_key(v)[1] == ref_key[1],
                }
                for k, v in preds.items()
                if K.parse_key(v)
            }
        else:
            krel = {"error": "missing or unreadable MiK key reference"}

        bpm = d["tempo"]["bpm"]
        mik_bpm = bt.get("tempo")
        if mik_bpm is None and a.get("stored_bpm", {}).get("value") is not None:
            mik_bpm = a["stored_bpm"]["value"]
        if mik_bpm:
            brel = {
                "fourier": M.bpm_metrics(bpm, mik_bpm),
                "beat_this_slope": M.bpm_metrics(d["rhythm"]["model_slope_bpm"], mik_bpm),
            }
        else:
            brel = {"error": "missing or unreadable MiK tempo reference"}

        raw_mik_beats = np.array(bt.get("beat_times_s") or [], dtype=float)
        mik_beats = raw_mik_beats[raw_mik_beats >= 0]
        timing = {}
        rr = d["rhythm"]
        dur = len(m) / sr
        if len(mik_beats) >= 2 and mik_bpm:
            per = 60.0 / float(mik_bpm)
            if rr.get("anchor_s") is not None:
                ours = rr["anchor_s"] + np.arange(int((dur - rr["anchor_s"]) / (60.0 / bpm))) * (60.0 / bpm)
                timing["our_constant_grid_vs_mik"] = M.beat_timing(ours, mik_beats, per)
            gdec = G.evaluate(
                st["beat_this"]["beats"],
                float(bpm),
                production_status="consistent" if rr.get("anchor_s") is not None else "inconsistent",
                model_slope_bpm=float(rr["model_slope_bpm"]),
                duration_s=float(dur),
            )
            gforced = G.evaluate(
                st["beat_this"]["beats"],
                float(bpm),
                production_status="inconsistent",
                model_slope_bpm=float(rr["model_slope_bpm"]),
                duration_s=float(dur),
            )
            gsrc = gdec if rr.get("anchor_s") is None else gforced
            if gsrc.phase_s is not None:
                ph = float(gsrc.phase_s) % (60.0 / bpm)
                ggrid = ph + np.arange(int((dur - ph) / (60.0 / bpm))) * (60.0 / bpm)
                timing["experimental_gridcheck_grid_vs_mik"] = {
                    "gridcheck_decision": gdec.outcome,
                    "phase_s": round(ph, 6),
                    **M.beat_timing(ggrid, mik_beats, per),
                }
            timing["beat_this_raw_vs_mik"] = M.beat_timing(np.array(st["beat_this"]["beats"]), mik_beats, per)
        else:
            timing["status"] = "missing or unusable MiK beatgrid data"

        out["tracks"][name] = {
            "source_byte_sha256_verified": byte_matches_inv,
            "linked_by_decoded_pcm": True,
            "mik": {
                "key": gk.get("key"),
                "tempo": mik_bpm,
                "n_beats_total": bt.get("n_beats"),
                "n_beats_nonnegative": int(len(mik_beats)),
                "first_beat_s": bt.get("first_beat_s"),
                "last_beat_s": bt.get("last_beat_s"),
                "interval_sd_ms": bt.get("interval_sd_ms"),
                "payload_algorithms": {"key": gk.get("algorithm"), "beatgrid": bt.get("algorithm")},
                "conflicts": a.get("conflicts", []),
            },
            "title_prefix_key": a.get("fields", {}).get("title_prefix_key"),
            "tkey": a.get("fields", {}).get("tkey"),
            "tbpm": a.get("fields", {}).get("tbpm"),
            "key": krel,
            "bpm": brel,
            "beat_timing": timing,
            "production_grid_status": rr.get("phase_status"),
            "experimental_gridcheck_status": rr.get("experimental_gridcheck", {}).get("outcome"),
            "sealed_review_reasons": [x["reason"] for x in d["review"]],
        }
        assert hashlib.sha256(p.read_bytes()).hexdigest() == byte_sha, f"{name}: source bytes changed during read"
    comp_path.write_text(json.dumps(out, indent=1) + "\n")
    print(f"wrote {comp_path} (seal verified; all {len(out['tracks'])} tracks linked and source hashes verified)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
