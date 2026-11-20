#!/usr/bin/env python3
"""Review and correct beat grids. Source audio is never modified.

    uv run scripts/grid_tool.py list  <export>_GRIDS.json
    uv run scripts/grid_tool.py set   <export>_GRIDS.json "<filename>" [--bpm X] [--anchor-ms X] [--bar-origin 1-4] [--note TEXT]
    uv run scripts/grid_tool.py clear <export>_GRIDS.json "<filename>"
    uv run scripts/grid_tool.py key   <export>_GRIDS.json "<filename>" <key|camelot> [--note TEXT]     # manual key override (hash-checked, provenance recorded)
    uv run scripts/grid_tool.py key-clear <export>_GRIDS.json "<filename>"

Then rebuild:  uv run scripts/export_desktop_v1.py <new_dir> --overrides=<export>_GRIDS.json

Review state: only a manual bar_origin marks a track "reviewed"; automatic uncertainty
(uncertain phase, undetected downbeat) stays "needs_review" until a human sets it.
`--anchor-ms` is the time of any beat; `--bar-origin` is the beat number (1-4) that beat carries
(2 means "this beat is the second of the bar", so beat one is one beat earlier).
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))
from set2go.grid import effective_grid


def main(argv: list[str]) -> int:
    if len(argv) < 2 or argv[0] not in ("list", "set", "clear", "key", "key-clear"):
        print(__doc__); return 2
    cmd, path = argv[0], Path(argv[1])
    data = json.loads(path.read_text())
    if cmd == "list":
        for name, e in data.items():
            g = effective_grid(e["auto"], e.get("manual"))
            a = e["auto"]
            print(f"{g.review:12} {g.source:6} bpm {g.bpm:8.3f} anchor {g.anchor_ms:8.1f} ms bar_origin {g.bar_origin} "
                  f"| auto phase {a['phase_status']:12} kick {a.get('kick_conf','-')} hat {a.get('hat_conf','-')} | {name[:48]}")
        n = sum(effective_grid(e["auto"], e.get("manual")).review == "needs_review" for e in data.values())
        print(f"\n{n} of {len(data)} tracks need review")
        return 0
    name = argv[2]
    if name not in data:
        sys.exit(f"unknown track {name!r}")
    if cmd in ("key", "key-clear"):
        from set2go.analysis import sidecar as S
        if cmd == "key-clear":
            S.clear_manual(data, name, "key")
        else:
            note = argv[argv.index("--note") + 1] if "--note" in argv else ""
            S.set_key(data, name, data[name]["sha256"], argv[3], note=note)
        path.write_text(json.dumps(data, indent=2))
        print(name, "->", data[name].get("manual", {}).get("key", "(no manual key)"))
        return 0
    if cmd == "clear":
        data[name].pop("manual", None)
    else:
        opts, m, i = argv[3:], data[name].setdefault("manual", {}), 0
        while i < len(opts):
            k, v = opts[i], opts[i + 1]
            key = {"--bpm": "bpm", "--anchor-ms": "anchor_ms", "--bar-origin": "bar_origin", "--note": "note"}[k]
            m[key] = v if key == "note" else (int(v) if key == "bar_origin" else float(v))
            i += 2
        effective_grid(data[name]["auto"], m)             # validate
    path.write_text(json.dumps(data, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
