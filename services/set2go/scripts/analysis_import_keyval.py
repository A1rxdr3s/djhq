#!/usr/bin/env python3
"""Import stored annotations of the key-validation folder into analysis_refs/keyval_independent.json (split "independent"; read-only on audio).
Duplicates of the development tracks (by sha256) are excluded and listed. Tracks with no key annotation are kept as 'no reference'."""
import json, sys, time
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))
from set2go.analysis import refs as R, keys as K

dev = {R.sha256_file(p) for p in (ROOT / "test-tracks").iterdir() if p.is_file() and p.name != ".DS_Store"}
store = {"tracks": {}, "excluded_duplicates": [], "no_reference": [], "note": "split 'independent' = not used to build or select methods; references are stored annotations (Mixed In Key where self-declared), NOT human ground truth"}
for p in sorted((ROOT / "test-tracks/key-validation").iterdir()):
    if p.name == ".DS_Store" or not p.is_file():
        continue
    sha = R.sha256_file(p)
    if sha in dev:
        store["excluded_duplicates"].append(p.name); continue
    ann = R.read_mik_annotations(p)
    if ann is None or ann["stored_key"]["value"] is None:
        store["no_reference"].append(p.name); continue
    pk = K.parse_key(ann["stored_key"]["value"])
    store["tracks"][sha] = {"filename": p.name, "split": "independent", "labels": {"mik": {
        "key": ann["stored_key"]["value"], "camelot": K.camelot(*pk) if pk else None, "mode": pk[1] if pk else None, "bpm": ann["stored_bpm"]["value"],
        "provenance": {"key": ann["stored_key"]["provenance"], "bpm": ann["stored_bpm"]["provenance"]}, "fields": ann["fields"], "conflicts": ann["conflicts"],
        "kind": "stored annotation read from the file's own tags (NOT human ground truth); provenance label says whether the writer declared itself", "imported": time.strftime("%Y-%m-%dT%H:%M:%S%z")}}}
(ROOT / "analysis_refs/keyval_independent.json").write_text(json.dumps(store, indent=1))
t = store["tracks"].values()
modes = [x["labels"]["mik"]["mode"] for x in t]
print(f"{len(store['tracks'])} tracks with a stored key | excluded duplicates {len(store['excluded_duplicates'])} | no reference {len(store['no_reference'])}")
print("minor", modes.count("minor"), "major", modes.count("major"), "unparseable", modes.count(None))
print("provenance:", {k: [x['labels']['mik']['provenance']['key'] for x in t].count(k) for k in set(x['labels']['mik']['provenance']['key'] for x in t)})
for x in t: m = x["labels"]["mik"]; print(f"  {x['filename'][:40]:41s} {m['key']:>4} -> {m['camelot']:>3} {m['mode']:5s} [{m['provenance']['key']}] conflicts {len(m['conflicts'])}")
