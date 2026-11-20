#!/usr/bin/env python3
"""Opt-in key workflow (local; never writes to the source audio/tags, never touches a USB).

    .venv/bin/python scripts/analysis_key_workflow.py <tracks_dir> <sidecar.json> [--essentia] [--list] [--export-map out.json]

  * reads each file's EXISTING Mixed In Key annotation (imported layer, explicit provenance: reading metadata, not detection);
  * optionally runs fresh predictions from audio: libKeyFinder always, Essentia KeyExtractor (bgate, edma, edmm, braw; frozen configuration) with --essentia via the
    isolated .venv-key worker; the methods and parameters are the frozen ones and are NOT tuned here;
  * records the run in the hash-linked sidecar (raw predictions appended; manual overrides preserved; changed audio retires old overrides as stale);
  * prints the review queue: reasons are descriptive (disagreement, unknown origin, missing key, failures); no confidence probabilities; agreement is not proof;
  * --export-map writes {filename: {camelot,name,origin}|null} (manual > imported only) for export_library(effective_keys=...).
Manual correction stays in grid_tool.py (key / key-clear). The default exporter never reads any of this.
"""
import json, subprocess, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))
from set2go import key_detect as KD
from set2go.analysis import sidecar as S, workflow as W, refs as R

PROFILES = ["bgate", "edma", "edmm", "braw"]           # frozen


def main(argv):
    args = [a for a in argv if not a.startswith("--")]
    if len(args) < 2:
        print(__doc__); return 2
    d, sc_path = Path(args[0]), Path(args[1])
    files = {p.name: p for p in sorted(d.iterdir()) if p.is_file() and p.suffix.lower() in (".aif", ".aiff", ".wav", ".flac")}
    sidecar = S.load(sc_path)
    ess = {}
    if "--essentia" in argv:
        raw = Path("/tmp/_key_workflow_essentia.json")
        subprocess.run([str(ROOT / ".venv-key/bin/python"), str(ROOT / "scripts/key_worker.py"), str(raw), *map(str, files.values()), "--profiles", ",".join(PROFILES)],
                       check=True, stdout=subprocess.DEVNULL)
        ess = json.loads(raw.read_text()); raw.unlink()
    out = {}
    for name, p in files.items():
        preds = {"libkeyfinder 2.2.8": (lambda path: (lambda r: r.key_name if r else None)(KD.detect_key_from_file(path)))}
        e = ess.get(str(p), {}).get("profiles", {}) if ess else {}
        for prof in PROFILES:
            if prof in e and "key" in e[prof]:
                preds[f"essentia:{prof} 2.1b6"] = (lambda v: (lambda path: v))(f"{e[prof]['key']} {e[prof]['scale']}")
        if sidecar.get(name) is None:
            S.record_analysis(sidecar, name, R.sha256_file(p), {"run_id": "init"}, auto=None)
        out[name] = W.reanalyse(sidecar, name, p, preds)
    S.save(sc_path, sidecar)
    if "--export-map" in argv:
        m = W.effective_key_map(sidecar, files)
        Path(argv[argv.index("--export-map") + 1]).write_text(json.dumps(m, indent=1))
    n_rev = 0
    for name, a in out.items():
        k = a["key"]; eff = k["effective"]
        reasons = [r for r in a["review"] if r["area"] != "info"]
        n_rev += bool(reasons)
        print(f"{name[:46]:47s} effective {eff['camelot'] if eff else '-':>3} [{k['effective_origin'] or 'none'}] | predicted "
              + ", ".join(f"{m.split()[0].split(':')[-1]}={v}" for m, v in a['predicted'].items() if v) + (f" | {len(reasons)} review reason(s)" if reasons else " | no review reasons"))
        if "--list" in argv:
            for r in reasons: print("      -", r["reason"], "" if "detail" not in r else json.dumps(r["detail"])[:150])
    print(f"\n{n_rev} of {len(out)} tracks have review reasons; sidecar: {sc_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
