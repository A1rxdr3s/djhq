#!/usr/bin/env python3
"""Controlled synthetic scenarios for the experimental grid decision (analysis/gridcheck.py). Beat times only (cheap); ground truth is known by construction.
    .venv/bin/python scripts/analysis_gridcheck_synthetic.py
Each scenario: model beats = a true beat sequence with a defect applied, 20 ms quantisation (the model's frame), small jitter; `tempo` = the audio-derived tempo given to the decision
(the TRUE tempo unless the scenario says the audio tempo itself is wrong). `expected` is the set of acceptable outcomes; a scenario where a constant grid would be WRONG must never come out as
an accept. Prints the production gate's verdict next to the revised one."""
import sys
from pathlib import Path
import numpy as np
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))
from set2go import rhythm as Rh
from set2go.analysis import gridcheck as G

BPM, DUR = 128.0, 300.0


def q(t, rng, jitter_ms=6.0):
    return np.round((t + rng.normal(0, jitter_ms / 1000, len(t))) / 0.02) * 0.02


def true_beats(bpm=BPM, dur=DUR, phase=0.17):
    return phase + np.arange(int((dur - phase) / (60 / bpm))) * (60 / bpm)


def scen(name, rng):
    b = true_beats(); per = 60 / BPM; tempo = BPM
    if name == "clean":                       return q(b, rng), tempo, {"accept_audio_grid", "production_accept"}
    if name == "phase_offset_90ms":           return q(b + 0.09, rng), tempo, {"accept_audio_grid", "production_accept"}      # constant offset: a grid at the right phase is fine
    if name == "missing_beats_isolated":      return q(np.delete(b, [100, 101, 250, 400]), rng), tempo, {"accept_audio_grid", "accept_with_gaps", "production_accept", "needs_review"}
    if name == "missing_beats_run_12":        return q(np.delete(b, np.arange(300, 312)), rng), tempo, {"accept_with_gaps", "needs_review"}
    if name == "extra_beats_split_passage":                                                                                       # 20 beats split into half intervals (the Eyes Low pattern)
        seg = b[300:320]; extra = seg[:-1] + per / 2
        return q(np.sort(np.concatenate([b, extra])), rng), tempo, {"accept_with_gaps", "needs_review"}
    if name == "half_time_model":             return q(b[::2], rng), tempo, {"reject", "needs_review"}                          # model beats at half tempo: a 128 BPM grid has every other slot empty
    if name == "double_time_model":           return q(np.sort(np.concatenate([b, b + per / 2])), rng), tempo, {"reject", "needs_review"}
    if name == "wrong_audio_tempo_half":      return q(b, rng), BPM / 2, {"reject", "needs_review"}                              # audio tempo is half the truth
    if name == "wrong_audio_tempo_double":    return q(b, rng), BPM * 2, {"reject", "needs_review"}
    if name == "audio_tempo_off_by_0.4":      return q(b, rng), BPM + 0.4, {"needs_review", "reject"}                            # audio tempo wrong by 0.4 BPM: ramp ~190 ms/min
    if name == "tempo_change_midway":                                                                                              # 128 BPM for the first half, 124 for the second
        n1 = len(b) // 2; t2 = b[n1 - 1] + np.arange(1, len(b) - n1 + 1) * (60 / 124.0)
        return q(np.concatenate([b[:n1], t2]), rng), tempo, {"needs_review", "reject"}
    if name == "tempo_change_short_section":                                                                                       # a 20 s section at 120 BPM inside a 128 BPM track, then back on the old grid phase shifted
        n1, n2 = 140, 140 + int(20 / (60 / 120))
        mid = b[n1] + np.arange(n2 - n1) * (60 / 120.0); rest = mid[-1] + (60 / 120.0) + np.arange(len(b) - n1 - (n2 - n1)) * per
        return q(np.concatenate([b[:n1], mid, rest]), rng), tempo, {"needs_review", "reject"}
    if name == "slope_gap_from_count_error":                                                                                      # FYRE-like: grid fine everywhere, a local doubled-interval cluster inflates the model slope
        bb = np.delete(b, [200, 201, 202]); bb = np.sort(np.concatenate([bb, b[300:302] + per / 2]))
        return q(bb, rng), tempo, {"needs_review"}                                                          # scattered count errors with a slope gap and NO odd interval: unexplained -> review
    raise KeyError(name)


def drift_scenario(rng):                      # properly constructed gradual drift: tempo ramps from 128 to 128.6 BPM over the track
    inst = BPM + np.linspace(0, 0.6, 700); t = 0.17 + np.concatenate([[0], np.cumsum(60 / inst[:-1])]); t = t[t < DUR]
    return q(t, rng), BPM, {"needs_review", "reject"}


NAMES = ["clean", "phase_offset_90ms", "missing_beats_isolated", "missing_beats_run_12", "extra_beats_split_passage", "half_time_model", "double_time_model",
         "wrong_audio_tempo_half", "wrong_audio_tempo_double", "audio_tempo_off_by_0.4", "tempo_change_midway", "tempo_change_short_section", "slope_gap_from_count_error", "gradual_drift"]


def run(seeds=range(20)):
    rows = {}
    for name in NAMES:
        outs = []
        for s in seeds:
            rng = np.random.default_rng(1000 + s)
            b, tempo, exp = drift_scenario(rng) if name == "gradual_drift" else scen(name, rng)
            mr = Rh.ModelRaw(list(b), [], 0.0, 0.0, "")
            c = Rh.check_consistency(mr, tempo)
            d = G.evaluate(b, tempo, production_status=c.status, model_slope_bpm=c.model_slope_bpm)
            # the REVISION is only consulted when the production gate rejects; evaluate() already returns production_accept otherwise.
            d2 = G.evaluate(b, tempo, production_status="inconsistent", model_slope_bpm=c.model_slope_bpm)      # what the revision says about the SAME beats if production had rejected them
            outs.append({"prod": c.status, "rev": d.outcome, "rev_forced": d2.outcome, "exp": exp, "reasons": d2.reasons, "ramp": d2.ramp_ms_per_min, "fit": d2.fit_fraction})
        rows[name] = outs
    return rows


if __name__ == "__main__":
    rows = run()
    print(f"{'scenario':28s} {'production gate':26s} {'revision (if production rejected)':58s} wrongly accepted")
    wrong_total = 0
    for name, outs in rows.items():
        exp = outs[0]["exp"]
        prod = {k: sum(o['prod'] == k for o in outs) for k in ("consistent", "inconsistent")}
        rev = {}
        for o in outs: rev[o["rev_forced"]] = rev.get(o["rev_forced"], 0) + 1
        accepts = {"accept_audio_grid", "accept_with_gaps", "production_accept"}
        wrong = sum(1 for o in outs if o["rev_forced"] in accepts and not (o["rev_forced"] in exp))
        wrong_total += wrong
        print(f"{name:28s} cons {prod['consistent']:2d} / incons {prod['inconsistent']:2d}    " + ", ".join(f"{k} {v}" for k, v in sorted(rev.items())) + f"{'':{max(1,58-len(', '.join(f'{k} {v}' for k, v in sorted(rev.items()))))}s}{wrong:3d}/{len(outs)}")
    print("\nwrongly accepted (an accept where a constant grid would be wrong, or an outcome outside the acceptable set):", wrong_total)
