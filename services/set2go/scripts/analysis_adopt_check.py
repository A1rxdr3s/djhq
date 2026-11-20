#!/usr/bin/env python3
"""Adoption gate for the blocked onset envelope (no production file is edited): run the REAL bpm_detect.analyse_beats with the original and with the blocked
envelope on every track and require the complete BeatAnalysis (tempo, every beat entry, phase result, drift) to be identical, plus the memory of each.

    .venv/bin/python scripts/analysis_adopt_check.py            # prints a table and exits 1 on any difference
Each variant runs in a SEPARATE process so peak RSS is meaningful.
"""
import dataclasses, json, resource, subprocess, sys, time
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))
tr = sorted(p for p in (ROOT / "test-tracks").iterdir() if p.suffix.lower() in (".wav", ".aiff", ".aif"))


def child(variant: str, i: int) -> None:
    from set2go import bpm_detect as B
    if variant == "blocked":
        from set2go.analysis.lowmem import onset_envelope_blocked
        B._onset_envelope = onset_envelope_blocked
    t0 = time.time(); r = B.analyse_beats(tr[i]); dt = time.time() - t0
    d = {"bpm": r.bpm, "beats": [(b.beat_number, b.tempo_bpm100, b.time_ms) for b in r.beats],
         "phase": dataclasses.asdict(r.phase) if r.phase is not None and dataclasses.is_dataclass(r.phase) else repr(r.phase),
         "drift": r.drift_ms}
    print(json.dumps({"rss": round(resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 2**20), "s": round(dt, 1), "result": d}, default=str))


if len(sys.argv) > 1:
    child(sys.argv[1], int(sys.argv[2])); sys.exit(0)
bad = 0
print(f"{'track':32s} {'orig MiB':>9s} {'blocked MiB':>11s} {'orig s':>7s} {'blk s':>6s}  identical BeatAnalysis")
for i, p in enumerate(tr):
    o = json.loads(subprocess.run([sys.executable, __file__, "orig", str(i)], capture_output=True, text=True, check=True).stdout.strip().splitlines()[-1])
    b = json.loads(subprocess.run([sys.executable, __file__, "blocked", str(i)], capture_output=True, text=True, check=True).stdout.strip().splitlines()[-1])
    same = o["result"] == b["result"]; bad += (not same)
    print(f"{p.name[:32]:32s} {o['rss']:9d} {b['rss']:11d} {o['s']:7.1f} {b['s']:6.1f}  {'YES' if same else 'NO'} ({len(o['result']['beats'])} beats)")
print("ALL IDENTICAL" if not bad else f"{bad} DIFFERENCES")
sys.exit(1 if bad else 0)
