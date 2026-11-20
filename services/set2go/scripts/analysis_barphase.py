#!/usr/bin/env python3
"""Experiment: per-segment bar-phase votes of independent features vs Beat This! downbeats on every track (no labels needed; official downbeats where preserved)."""
import json, sys
from pathlib import Path
import numpy as np
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))
from set2go import rhythm as Rh
from set2go.analysis import barphase as BP, lowmem as LM
from set2go.waveform import _read_mono_float32
from set2go import bpm_detect as B

run = json.loads((ROOT / "eval/analysis/run_dev_mik_lowmem.json").read_text())
B._onset_envelope = LM.onset_envelope_blocked            # experiment-local: bit-identical, avoids the 2.7 GiB peak
out = {}
for name, t in run["tracks"].items():
    r = t["rhythm"]
    if r.get("anchor_s") is None:
        print(f"{name[:28]:29s} no constant grid (model inconsistent): skipped"); continue
    bpm, anc = t["tempo"]["fourier_bpm"], r["anchor_s"]
    mono, sr = _read_mono_float32(ROOT / "test-tracks" / name)
    f = BP.beat_features(mono, sr, anc, bpm)
    votes = {k: BP.phase_vote(f[k]) for k in ("low_energy", "low_onset", "full_flux")}
    raw = Rh.load_raw(ROOT / "frozen/desktop_v4_rhythm/raw_predictions" / (name + ".json"))
    per = 60 / bpm; db = np.array(raw.downbeats); ph = np.round((db - anc) / per).astype(int) % 4
    segs = np.array_split(np.arange(len(f["times"])), 6)
    model = []
    for part in segs:
        a, b = f["times"][part[0]], f["times"][part[-1]]
        m = (db >= a) & (db <= b)
        model.append(int(np.bincount(ph[m], minlength=4).argmax()) if m.sum() >= 3 else None)
    cmp = BP.compare_with_model(votes, model)
    out[name] = {"model_majority_phase_per_sixth": model, "votes": votes, "agreement_with_model": cmp}
    print(f"{name[:28]:29s} model {model}")
    for k, v in votes.items():
        print(f"   {k:11s} {[s['phase'] for s in v['segments']]} contrast {[s['contrast'] for s in v['segments']]}  agree {cmp[k]['agree']}/{cmp[k]['decided']}")
(ROOT / "eval/analysis/barphase.json").write_text(json.dumps(out, indent=1))
