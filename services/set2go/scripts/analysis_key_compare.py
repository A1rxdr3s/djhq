#!/usr/bin/env python3
"""Score key estimators against the stored Mixed In Key DEVELOPMENT references (analysis_refs/dev_mik_stored.json). Not independent accuracy.

    .venv/bin/python scripts/analysis_key_compare.py [--essentia eval/analysis/essentia_keys_raw.json] [--run eval/analysis/run_dev_mik_lowmem.json]
Predictions (libKeyFinder, in-house chroma, Essentia profiles) are read from their raw outputs; references from the ref store; relations are separate classes.
"""
import argparse, json, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))
from set2go.analysis import keys as K

ap = argparse.ArgumentParser()
ap.add_argument("--essentia", default=str(ROOT / "eval/analysis/essentia_keys_raw.json"))
ap.add_argument("--run", default=str(ROOT / "eval/analysis/run_dev_mik_lowmem.json"))
ap.add_argument("--refs", default=str(ROOT / "analysis_refs/dev_mik_stored.json"))
ap.add_argument("--out", default=str(ROOT / "eval/analysis/key_compare.json"))
a = ap.parse_args()
refs = json.loads(Path(a.refs).read_text())["tracks"]
run = json.loads(Path(a.run).read_text())["tracks"]
ess = json.loads(Path(a.essentia).read_text())
ess = {Path(k).name: v for k, v in ess.items() if k != "_meta"}
by_name = {r["filename"]: r["labels"]["mik"]["key"] for r in refs.values()}
preds: dict[str, dict[str, str]] = {}
for n, t in run.items():
    e = t["key"]["estimators"]
    d = preds.setdefault(n, {})
    d["libkeyfinder"] = e["libkeyfinder"]["name"] if e["libkeyfinder"] else None
    d["chroma_krumhansl(own)"] = e["chroma_krumhansl"]["name"]
    d["chroma_temperley(own)"] = e["chroma_temperley"]["name"]
for n, v in ess.items():
    for p, r in v["profiles"].items():
        if "key" in r:
            preds.setdefault(n, {})[f"essentia:{p}"] = f"{r['key']} {r['scale']}"
names = sorted({m for d in preds.values() for m in d})
table, rows = {}, {}
for m in names:
    c = {"exact": 0, "parallel": 0, "relative": 0, "fifth": 0, "semitone": 0, "other": 0, "n": 0}
    for n, d in preds.items():
        if m not in d or d[m] is None:
            continue
        rel = K.relation(K.parse_key(d[m]), K.parse_key(by_name[n]))
        c[rel] += 1; c["n"] += 1
        rows.setdefault(n, {})[m] = rel
    table[m] = c
print(f"{'method':24s} n  exact parallel relative fifth semitone other   (vs stored MiK key; development references, NOT independent)")
for m, c in sorted(table.items(), key=lambda x: (-x[1]['exact'], -(x[1]['exact'] + x[1]['relative'] + x[1]['fifth']))):
    print(f"{m:24s} {c['n']:2d} {c['exact']:5d} {c['parallel']:8d} {c['relative']:8d} {c['fifth']:5d} {c['semitone']:8d} {c['other']:5d}")
Path(a.out).write_text(json.dumps({"table": table, "per_track_relation": rows, "references": by_name, "predictions": preds}, indent=1))
