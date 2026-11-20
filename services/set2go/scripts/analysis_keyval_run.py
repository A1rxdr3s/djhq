#!/usr/bin/env python3
"""Independent key evaluation run under eval/analysis/keyval/FROZEN_CONFIG.json (no tuning, no per-track selection; audio-only predictions).

    .venv/bin/python scripts/analysis_keyval_run.py predict           # predictions only: libKeyFinder (separate process per track) + Essentia worker (.venv-key)
    .venv/bin/python scripts/analysis_keyval_run.py score             # scoring against the stored references (never feeds back into prediction)
Failures and missing references are recorded, not skipped.
"""
import json, resource, subprocess, sys, time
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))
import os
D = ROOT / "test-tracks/key-validation"
OUT = ROOT / "eval/analysis/keyval"
# optional: restrict to files listed in a JSON ([{name, sha256}]) and write to a different tag (used for the major-key round; the method code is unchanged)
ONLY = os.environ.get("KEYVAL_ONLY")            # path to JSON list of {name, sha256}
TAG = os.environ.get("KEYVAL_TAG", "")           # suffix for the output files
REFS = os.environ.get("KEYVAL_REFS", str(ROOT / "analysis_refs/keyval_independent.json"))
PROFILES = ["bgate", "edma", "edmm", "braw"]                 # frozen


def kf_child(path: str) -> None:
    from set2go import key_detect as KD
    t0 = time.time()
    try:
        r = KD.detect_key_from_file(Path(path))
        res = {"name": r.key_name, "camelot": r.camelot} if r else {"error": "no result (silent or library unavailable)"}
    except Exception as e:
        res = {"error": f"{type(e).__name__}: {e}"}
    res.update(seconds=round(time.time() - t0, 2), peak_rss_mib=round(resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 2**20))
    print(json.dumps(res))


def predict() -> None:
    files = sorted(p for p in D.iterdir() if p.is_file() and p.name != ".DS_Store")
    if ONLY:
        keep = {x["name"] for x in json.loads(Path(ONLY).read_text())}
        files = [p for p in files if p.name in keep]
    preds = {p.name: {} for p in files}
    for p in files:
        o = subprocess.run([sys.executable, __file__, "kf-child", str(p)], capture_output=True, text=True)
        try:
            preds[p.name]["libkeyfinder"] = json.loads(o.stdout.strip().splitlines()[-1])
        except Exception:
            preds[p.name]["libkeyfinder"] = {"error": f"child failed: {o.stderr[-200:]}"}
        print("kf", p.name[:40], preds[p.name]["libkeyfinder"], flush=True)
    raw = OUT / f"essentia_raw{TAG}.json"
    subprocess.run([str(ROOT / ".venv-key/bin/python"), str(ROOT / "scripts/key_worker.py"), str(raw), *map(str, files), "--profiles", ",".join(PROFILES)], check=True,
                   stdout=subprocess.DEVNULL)
    ess = json.loads(raw.read_text())
    for p in files:
        e = ess.get(str(p))
        for prof in PROFILES:
            r = (e or {}).get("profiles", {}).get(prof)
            preds[p.name][f"essentia:{prof}"] = ({"name": f"{r['key']} {r['scale']}", "strength": r["strength"], "seconds": r["seconds"]} if r and "key" in r
                                                 else {"error": (r or {}).get("error", "no result")})
        preds[p.name]["_essentia_load_s"] = (e or {}).get("load_s")
    (OUT / f"predictions{TAG}.json").write_text(json.dumps({"config": "FROZEN_CONFIG.json", "essentia_meta": ess["_meta"], "predictions": preds}, indent=1))
    print("wrote predictions.json; essentia peak RSS MiB", ess["_meta"]["peak_rss_mb"])


def score() -> None:
    from set2go.analysis import keys as K
    refs = json.loads(Path(REFS).read_text())
    by = {v["filename"]: v for v in refs["tracks"].values()}
    P = json.loads((OUT / f"predictions{TAG}.json").read_text())["predictions"]
    methods = ["essentia:bgate", "essentia:edma", "essentia:edmm", "essentia:braw", "libkeyfinder"]
    res = {"per_track": {}, "summary": {}, "missing_reference": [n for n in P if n not in by], "failures": []}
    for n, pr in P.items():
        if n not in by:
            continue
        ref = by[n]["labels"]["mik"]; rk = K.parse_key(ref["key"])
        row = {"reference": ref["camelot"], "reference_mode": ref["mode"], "reference_provenance": ref["provenance"]["key"], "methods": {}}
        for m in methods:
            r = pr.get(m, {})
            if "name" not in r:
                res["failures"].append({"track": n, "method": m, "error": r.get("error")}); row["methods"][m] = {"error": r.get("error")}; continue
            pk = K.parse_key(r["name"])
            row["methods"][m] = {"pred": r["name"], "camelot": K.camelot(*pk), "relation": K.relation(pk, rk), "tonic_ok": pk[0] == rk[0], "mode_ok": pk[1] == rk[1]}
        res["per_track"][n] = row
    for m in methods:
        rows = [(n, v["methods"][m]) for n, v in res["per_track"].items() if "relation" in v["methods"].get(m, {})]
        c = {k: sum(r["relation"] == k for _, r in rows) for k in ("exact", "parallel", "relative", "fifth", "semitone", "other")}
        res["summary"][m] = {"n": len(rows), **c, "tonic_ok": sum(r["tonic_ok"] for _, r in rows), "mode_ok": sum(r["mode_ok"] for _, r in rows),
                             "predicts_minor": sum(r["pred"].endswith("minor") for _, r in rows)}
    (OUT / f"scores{TAG}.json").write_text(json.dumps(res, indent=1))


if __name__ == "__main__":
    {"predict": predict, "score": score}.get(sys.argv[1], lambda: kf_child(sys.argv[2]))()
