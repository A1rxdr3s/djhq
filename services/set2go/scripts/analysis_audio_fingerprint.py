#!/usr/bin/env python3
"""Decoded-audio duplicate check across sets (read-only). Retagged copies change the FILE hash but not the decoded samples.

    .venv/bin/python scripts/analysis_audio_fingerprint.py <dir> [<dir> ...] --out eval/analysis/keyval/fingerprints.json

Per file: (1) sha256 of the decoded mono float32 samples (bit-exact audio identity), (2) duration, (3) a coarse fingerprint robust to re-encoding/gain: the mean
log-magnitude in 32 log-spaced bands over the whole track, normalised, plus an energy envelope at ~2 Hz. Pairs are reported as: EXACT AUDIO (same decoded-sample
hash), NEAR (|duration diff| <= 0.5 s AND spectral-fingerprint correlation >= 0.999 AND envelope correlation >= 0.99), otherwise distinct. Thresholds are stated limits.
"""
import hashlib, json, sys
from pathlib import Path
import numpy as np
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))
from set2go.waveform import _read_mono_float32

args = [a for a in sys.argv[1:] if not a.startswith("--")]
out = Path(sys.argv[sys.argv.index("--out") + 1]) if "--out" in sys.argv else ROOT / "eval/analysis/keyval/fingerprints.json"
args = [a for a in args if a != str(out)]
files = []
for d in args:
    files += [(Path(d).name, p) for p in sorted(Path(d).iterdir()) if p.is_file() and p.name != ".DS_Store"]


def fp(p):
    m, sr = _read_mono_float32(p)
    h = hashlib.sha256(m.tobytes()).hexdigest()
    n = 8192
    nfr = (len(m) - n) // 8192
    idx = np.unique(np.linspace(0, nfr - 1, 400).astype(int))
    spec = np.zeros(n // 2 + 1)
    for i in idx:
        spec += np.abs(np.fft.rfft(m[i * 8192:i * 8192 + n] * np.hanning(n)))
    f = np.fft.rfftfreq(n, 1 / sr)
    edges = np.geomspace(40, 12000, 33)
    band = np.array([np.log1p(spec[(f >= a) & (f < b)].mean()) for a, b in zip(edges[:-1], edges[1:])])
    band = (band - band.mean()) / (band.std() + 1e-12)
    hop = int(sr * 0.5)
    env = np.array([np.sqrt(np.mean(m[i:i + hop].astype(np.float64) ** 2)) for i in range(0, len(m) - hop, hop)])
    env = (np.log1p(env * 100) - np.log1p(env * 100).mean())
    return {"sample_sha256": h, "duration_s": round(len(m) / sr, 3), "sr": sr, "band": band.tolist(), "env": env.tolist()}


rec = []
for grp, p in files:
    r = fp(p); r.update(group=grp, name=p.name); rec.append(r); print(f"{grp:20s} {p.name[:50]:51s} {r['duration_s']:8.2f}s {r['sample_sha256'][:10]}", flush=True)
pairs = []
for i in range(len(rec)):
    for j in range(i + 1, len(rec)):
        a, b = rec[i], rec[j]
        if a["sample_sha256"] == b["sample_sha256"]:
            pairs.append({"a": a["name"], "b": b["name"], "ga": a["group"], "gb": b["group"], "verdict": "EXACT AUDIO"}); continue
        if abs(a["duration_s"] - b["duration_s"]) <= 0.5:
            bc = float(np.corrcoef(a["band"], b["band"])[0, 1]); L = min(len(a["env"]), len(b["env"]))
            ec = float(np.corrcoef(a["env"][:L], b["env"][:L])[0, 1])
            pairs.append({"a": a["name"], "b": b["name"], "ga": a["group"], "gb": b["group"], "duration_diff_s": round(abs(a["duration_s"] - b["duration_s"]), 3),
                          "band_corr": round(bc, 5), "env_corr": round(ec, 4), "verdict": "NEAR" if (bc >= 0.999 and ec >= 0.99) else "similar duration, distinct audio"})
out.write_text(json.dumps({"files": [{k: v for k, v in r.items() if k not in ("band", "env")} for r in rec], "pairs": pairs,
                           "limits": {"duration_s": 0.5, "band_corr": 0.999, "env_corr": 0.99}}, indent=1))
print("\nEXACT/NEAR pairs:", [p for p in pairs if p["verdict"] in ("EXACT AUDIO", "NEAR")] or "none")
print("pairs with similar duration checked:", len(pairs))
for p in pairs:
    if p["verdict"].startswith("similar"): print("  ", p["a"][:34], "|", p["b"][:34], p["duration_diff_s"], p["band_corr"], p["env_corr"])
