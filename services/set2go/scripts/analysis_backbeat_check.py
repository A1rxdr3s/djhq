#!/usr/bin/env python3
"""Experiment: does the full-band accent feature (backbeat) tell majority-phase bars from the model's half-bar minority bars?

For each bar (4 beats starting at a model downbeat), the feature's mean at each of the 4 beats is computed in the model's own frame. If the model's bar
start is conventional, the strongest recurring accent sits at beat offset 2 (the usual house backbeat position relative to the downbeat as measured on Zsak/
Earth/Snoop against the official analysis). In a half-bar-flipped block the same accent should appear at offset 0. Reports, per track, the share of bars
whose accent offset is 2 (conventional) among majority bars and among minority bars.
"""
import json, sys
from pathlib import Path
import numpy as np
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))
from set2go import rhythm as Rh, bpm_detect as B
from set2go.analysis import barphase as BP, lowmem as LM
from set2go.waveform import _read_mono_float32
B._onset_envelope = LM.onset_envelope_blocked
run = json.loads((ROOT / "eval/analysis/run_dev_mik_lowmem.json").read_text())
res = {}
for name, t in run["tracks"].items():
    r = t["rhythm"]
    if r.get("anchor_s") is None: continue
    bpm, anc = t["tempo"]["fourier_bpm"], r["anchor_s"]; per = 60 / bpm
    mono, sr = _read_mono_float32(ROOT / "test-tracks" / name)
    f = BP.beat_features(mono, sr, anc, bpm); ff = f["full_flux"]; tt = f["times"]
    raw = Rh.load_raw(ROOT / "frozen/desktop_v4_rhythm/raw_predictions" / (name + ".json"))
    db = np.array(raw.downbeats); ph = np.round((db - anc) / per).astype(int) % 4; maj = int(np.bincount(ph, minlength=4).argmax())
    acc_maj, acc_min = [], []
    for d, p in zip(db, ph):
        i = int(np.argmin(np.abs(tt - d)))
        if i + 3 >= len(ff) or abs(tt[i] - d) > 0.1 * per: continue
        bar = ff[i:i + 4]
        if bar.sum() <= 0: continue
        off = int(bar.argmax())
        (acc_maj if p == maj else acc_min).append(off)
    def share(a, o): return None if not a else round(float(np.mean(np.array(a) == o)), 3)
    res[name] = {"majority_bars": len(acc_maj), "minority_bars": len(acc_min),
                 "accent_offset_hist_majority": np.bincount(acc_maj, minlength=4).tolist(), "accent_offset_hist_minority": np.bincount(acc_min, minlength=4).tolist() if acc_min else None}
    print(f"{name[:28]:29s} majority bars {len(acc_maj):3d} accent-offset histogram {res[name]['accent_offset_hist_majority']} | minority bars {len(acc_min):3d} {res[name]['accent_offset_hist_minority']}")
(ROOT / "eval/analysis/backbeat_check.json").write_text(json.dumps(res, indent=1))
