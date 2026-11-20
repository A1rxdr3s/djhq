#!/usr/bin/env python3
"""Local experiment: do the half-bar (2-beat) minority downbeat runs coincide with low-kick passages? Reads cached raw predictions, never writes outside eval/analysis."""
import json, sys
from pathlib import Path
import numpy as np
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))
from set2go import bpm_detect as B, rhythm as Rh
from set2go.waveform import _read_mono_float32

run = json.loads((ROOT / "eval/analysis/run_dev_baseline.json").read_text())
out = {}
for name in ("01 1A - 6 - Also! (2015 Rework).aiff", "Chris Valencia - Flip & Reverse  (Original Mix).wav",
             "Sophia Guerrero - Habit (Extended Mix) [Toolroom Trax].aiff", "jairo delli - Ritmo (Extended Mix).aiff",
             "Earth n Days - Make It High (Extended Mix) [Toolroom Trax].aiff", "Zsak - The Dancefloor (Extended Mix) [There Was Jack].aif"):
    t = run["tracks"][name]; r = t["rhythm"]; per = 60 / t["tempo"]["fourier_bpm"]; anc = r["anchor_s"]
    raw = Rh.load_raw(ROOT / "frozen/desktop_v4_rhythm/raw_predictions" / (name + ".json"))
    mono, sr = _read_mono_float32(ROOT / "test-tracks" / name)
    kenv = B._band_envelope(mono, sr, "kick")
    _, _, fps = B._onset_envelope(mono[: sr * 5], sr)           # only to obtain fps cheaply
    kenv = np.asarray(kenv, float)
    fps_k = len(kenv) / (len(mono) / sr)
    db = np.array(raw.downbeats); ph = np.round((db - anc) / per).astype(int) % 4; maj = int(np.bincount(ph).argmax())
    bar = per * 4
    # kick strength per bar (mean of kick envelope over the bar), relative to the track's median bar
    def bar_kick(t0):
        a, b = int(t0 * fps_k), int((t0 + bar) * fps_k)
        return float(kenv[a:b].mean()) if b > a and b <= len(kenv) else np.nan
    ks = np.array([bar_kick(x) for x in db]); med = np.nanmedian(ks)
    rel = ks / med
    mn, mj = ph != maj, ph == maj
    out[name] = {"bars": int(len(db)), "minority_bars": int(mn.sum()),
                 "kick_rel_median_in_minority": float(np.nanmedian(rel[mn])) if mn.any() else None,
                 "kick_rel_median_in_majority": float(np.nanmedian(rel[mj])),
                 "share_minority_bars_with_kick_below_0.5_median": float(np.nanmean(rel[mn] < 0.5)) if mn.any() else None,
                 "share_majority_bars_with_kick_below_0.5_median": float(np.nanmean(rel[mj] < 0.5))}
    print(name[:28], {k: (round(v, 3) if isinstance(v, float) else v) for k, v in out[name].items()})
(ROOT / "eval/analysis/downbeat_regions.json").write_text(json.dumps(out, indent=1))
