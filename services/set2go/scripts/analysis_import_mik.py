#!/usr/bin/env python3
"""Import stored Mixed In Key annotations from the source files into the evaluation reference store (read-only on the audio).

    .venv/bin/python scripts/analysis_import_mik.py [--tracks test-tracks] [--out analysis_refs/dev_mik_stored.json]

Writes labels.mik per track (hash-keyed) as DEVELOPMENT references (stored annotations, not independent ground truth). Predictions are not written
here. Source files are never modified. Existing entries for the same hash are merged: other label kinds (e.g. user) are kept.
"""
import argparse, json, sys, time
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))
from set2go.analysis import refs as R

ap = argparse.ArgumentParser()
ap.add_argument("--tracks", default=str(ROOT / "test-tracks")); ap.add_argument("--out", default=str(ROOT / "analysis_refs/dev_mik_stored.json"))
a = ap.parse_args()
out = Path(a.out)
store = R.load_refs(out)
for p in sorted(x for x in Path(a.tracks).iterdir() if x.suffix.lower() in (".wav", ".aiff", ".aif")):
    ann = R.read_mik_annotations(p)
    if ann is None or ann["stored_key"]["value"] is None:
        print("no stored annotation:", p.name); continue
    sha = R.sha256_file(p)
    e = store["tracks"].setdefault(sha, {"filename": p.name, "split": "development", "labels": {}})
    e["filename"] = p.name
    if e.get("split") != "development":
        sys.exit(f"{p.name}: refusing to overwrite a non-development split")
    e["labels"]["mik"] = {"key": ann["stored_key"]["value"], "bpm": ann["stored_bpm"]["value"], "provenance": {
        "key": ann["stored_key"]["provenance"], "bpm": ann["stored_bpm"]["provenance"]},
        "kind": "stored annotation read from the file's own ID3 tag (NOT independent ground truth; may have been edited in the program)",
        "fields": ann["fields"], "geob": {k: ({kk: vv for kk, vv in v.items() if kk != "beat_times_s"} if k == "beatgrid" else v) for k, v in ann["geob"].items()},
        "conflicts": ann["conflicts"], "imported": time.strftime("%Y-%m-%dT%H:%M:%S%z")}
    print(f"{p.name[:34]:35s} key {ann['stored_key']['value']} [{ann['stored_key']['provenance']}] bpm {ann['stored_bpm']['value']:.4f} conflicts {len(ann['conflicts'])}")
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps(store, indent=1))
print("wrote", out, "-", len(store["tracks"]), "tracks (all development)")
