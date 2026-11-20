"""Independent bar-phase estimator (opt-in, experimental): which beat of the 4-beat bar a recurring accent sits on, per segment of the track.

It does NOT claim to find "the downbeat". It measures, from the audio on a given constant grid, three per-beat features and reports for each segment the
phase (0-3 beats after the grid's own beat 1) where that feature's 4-beat-periodic pattern is strongest, with a contrast value. Features:
  low_energy   mean energy of the <150 Hz band in the beat window (bass/kick weight)
  low_onset    low-band flux at the beat (new bass event)
  full_flux    broadband spectral flux at the beat (any new event, e.g. a chord or a clap-less accent)
Agreement between independent features and with a model's downbeats is reported; disagreement is a needs_review signal, never silently resolved.
"""
from __future__ import annotations

import numpy as np

from .. import bpm_detect as _B


def beat_features(mono, sr: int, anchor_s: float, bpm: float, duration_s: float | None = None, win_frac: float = 0.25) -> dict:
    """Per-beat features on the constant grid anchor_s + k*60/bpm. Returns arrays aligned with `times`."""
    per = 60.0 / bpm
    dur = duration_s if duration_s is not None else len(mono) / sr
    k = np.arange(int((dur - anchor_s) / per))
    t = anchor_s + k * per
    broad, kick, fps = _B._onset_envelope(mono, sr)
    w = max(1, int(win_frac * per * fps))
    lo_env = np.asarray(_B._band_envelope(mono, sr, "kick"), float)
    out = {"times": t, "k": k, "low_energy": np.zeros(len(t)), "low_onset": np.zeros(len(t)), "full_flux": np.zeros(len(t))}
    for i, tt in enumerate(t):
        a = int(tt * fps)
        out["low_onset"][i] = kick[max(a - 1, 0):a + w].max() if a < len(kick) else 0
        out["full_flux"][i] = broad[max(a - 1, 0):a + w].max() if a < len(broad) else 0
        s0, s1 = int(tt * sr), int((tt + win_frac * per) * sr)
        out["low_energy"][i] = lo_env[s0:s1].mean() if s1 <= len(lo_env) and s1 > s0 else 0
    return out


def phase_vote(values: np.ndarray, nseg: int = 6) -> dict:
    """For a per-beat feature, the 4-beat phase with the highest mean (after dividing by the segment mean) per segment, and its contrast.

    contrast = (best phase mean - mean of the other three) / segment mean: 0 = no bar structure. A segment with contrast below 0.05 is reported as
    undecided (limit documented, heuristic, not a probability).
    """
    n = len(values)
    segs = []
    for part in np.array_split(np.arange(n), nseg):
        v = values[part]
        ph = part % 4
        m = np.array([v[ph == p].mean() if (ph == p).any() else 0.0 for p in range(4)])
        mu = m.mean()
        if mu <= 0:
            segs.append({"phase": None, "contrast": 0.0}); continue
        best = int(m.argmax())
        c = float((m[best] - np.delete(m, best).mean()) / mu)
        segs.append({"phase": best if c >= 0.05 else None, "contrast": round(c, 3)})
    return {"segments": segs}


def compare_with_model(feature_votes: dict, model_phase_per_segment: list[int | None]) -> dict:
    """Agreement of each feature's segment votes with the model's majority phase per segment (decided segments only)."""
    out = {}
    for name, v in feature_votes.items():
        pairs = [(a["phase"], b) for a, b in zip(v["segments"], model_phase_per_segment) if a["phase"] is not None and b is not None]
        out[name] = {"decided": len(pairs), "agree": sum(a == b for a, b in pairs)}
    return out


def backbeat_evidence(feat_flux: np.ndarray, times: np.ndarray, model_downbeats_s, model_phase_of_bar: np.ndarray, majority_phase: int,
                      beat_period_s: float) -> dict:
    """Advisory half-bar evidence: where the strongest broadband accent of each model bar sits (offset 0-3 from the model's downbeat), split into the model's
    majority-phase bars and its minority-phase bars.

    Interpretation (ADVISORY ONLY, never applied): in conventional house phrasing the accent tends to sit at offset 2 relative to a correct bar start (checked on
    the three official-reference tracks). If minority bars concentrate their accent at offset 0 while majority bars concentrate it at offset 2, the minority
    blocks look like half-bar flips of the model ("flip_signature"). If minority bars instead show offset 2, the minority reading may be the conventional one
    ("minority_conventional"). A flat histogram is "uninformative". Limits are documented heuristics, not probabilities.
    """
    maj, mino = [], []
    for d, p in zip(np.asarray(model_downbeats_s, float), np.asarray(model_phase_of_bar)):
        i = int(np.argmin(np.abs(times - d)))
        if i + 3 >= len(feat_flux) or abs(times[i] - d) > 0.1 * beat_period_s:
            continue
        bar = feat_flux[i:i + 4]
        if bar.sum() <= 0:
            continue
        (maj if p == majority_phase else mino).append(int(bar.argmax()))
    hm = np.bincount(maj, minlength=4).tolist() if maj else [0, 0, 0, 0]
    hn = np.bincount(mino, minlength=4).tolist() if mino else None

    def dom(h):
        t = sum(h)
        if t == 0:
            return None, 0.0
        o = int(np.argmax(h))
        return o, h[o] / t
    om, sm = dom(hm)
    on, sn = dom(hn) if hn else (None, 0.0)
    verdict = "no_minority_bars"
    if hn and sum(hn) >= 8:
        if sm < 0.40:
            verdict = "uninformative"            # majority bars themselves show no clear accent position
        elif on == 0 and om == 2 and sn >= 0.40:
            verdict = "flip_signature"
        elif on == om and sn >= 0.40:
            verdict = "minority_conventional"
        else:
            verdict = "mixed"
    return {"majority_bars": len(maj), "minority_bars": len(mino), "accent_offset_hist_majority": hm, "accent_offset_hist_minority": hn,
            "majority_dominant_offset": om, "majority_dominant_share": round(sm, 3), "minority_dominant_offset": on, "minority_dominant_share": round(sn, 3),
            "verdict": verdict, "limits": {"min_minority_bars": 8, "min_dominant_share": 0.40}, "advisory_only": True}
