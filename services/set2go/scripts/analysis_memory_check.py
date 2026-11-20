#!/usr/bin/env python3
"""Compare the original onset envelope with the blocked one on the real tracks: equality and peak memory (each in its own process via the CLI flag).

    .venv/bin/python scripts/analysis_memory_check.py equal      # prints equality for all tracks (loads both: memory not meaningful here)
    .venv/bin/python scripts/analysis_memory_check.py mem orig|blocked <track-index>
"""
import resource, sys, time
from pathlib import Path
import numpy as np
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))
from set2go import bpm_detect as B
from set2go.analysis.lowmem import onset_envelope_blocked
from set2go.waveform import _read_mono_float32
tr = sorted(p for p in (ROOT / "test-tracks").iterdir() if p.suffix.lower() in (".wav", ".aiff", ".aif"))
rss = lambda: round(resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 2**20)
if sys.argv[1] == "equal":
    for p in tr:
        m, sr = _read_mono_float32(p)
        a = B._onset_envelope(m, sr); b = onset_envelope_blocked(m, sr)
        d = max(float(np.max(np.abs(a[i] - b[i]))) for i in (0, 1))
        ta, tb = B.estimate_tempo(a[0], a[2]), B.estimate_tempo(b[0], b[2])
        print(f"{p.name[:30]:31s} len {len(a[0])}=={len(b[0])} max|diff| {d:.2e} tempo {ta:.3f}=={tb:.3f} {'OK' if len(a[0])==len(b[0]) and ta==tb else 'MISMATCH'}")
else:
    p = tr[int(sys.argv[3])]; m, sr = _read_mono_float32(p); r0 = rss(); t0 = time.time()
    f = B._onset_envelope if sys.argv[2] == "orig" else onset_envelope_blocked
    e = f(m, sr); tempo = B.estimate_tempo(e[0], e[2])
    print(f"{sys.argv[2]:8s} {p.name[:24]} audio {len(m)/sr:.0f}s: peak RSS {rss()} MiB (after decode {r0}), {time.time()-t0:.1f} s, tempo {tempo:.3f}")
