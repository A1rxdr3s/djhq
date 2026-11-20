"""BPM, beat-timing and downbeat metrics. Pure functions; each quantity is reported separately.

Tolerances are explicit parameters and are echoed in the results; none is fitted.
"""
from __future__ import annotations

import numpy as np

OCTAVE_CLASSES = (("double", 2.0), ("half", 0.5), ("three_halves", 1.5), ("two_thirds", 2.0 / 3.0))


def bpm_metrics(est: float, ref: float, exact_tol_bpm: float = 0.5, ratio_tol: float = 0.02) -> dict:
    """Absolute error plus an octave/metrical-level classification (est/ref ratio).

    exact: |err| <= exact_tol_bpm. A ratio near 2, 1/2, 3/2 or 2/3 (within ratio_tol, relative) is reported as that metrical error and is
    NOT counted as exact; everything else is "other".
    """
    err = est - ref
    ratio = est / ref if ref else float("nan")
    cls = "exact" if abs(err) <= exact_tol_bpm else "other"
    if cls == "other":
        for name, r in OCTAVE_CLASSES:
            if abs(ratio / r - 1.0) <= ratio_tol:
                cls = name
                break
    return {"est": est, "ref": ref, "abs_err_bpm": abs(err), "signed_err_bpm": err, "ratio": ratio, "class": cls,
            "tolerances": {"exact_tol_bpm": exact_tol_bpm, "ratio_tol": ratio_tol}}


def match_beats(est_s: np.ndarray, ref_s: np.ndarray, max_dist_s: float) -> tuple[np.ndarray, np.ndarray]:
    """Index pairs (i_est, j_ref): each est beat to its nearest ref beat when closer than max_dist_s; each ref beat used at most once."""
    est_s, ref_s = np.asarray(est_s, float), np.asarray(ref_s, float)
    if len(est_s) == 0 or len(ref_s) == 0:
        return np.array([], int), np.array([], int)
    j = np.searchsorted(ref_s, est_s)
    j = np.clip(j, 1, len(ref_s) - 1) if len(ref_s) > 1 else np.zeros(len(est_s), int)
    left = np.maximum(j - 1, 0)
    pick = np.where(np.abs(est_s - ref_s[left]) <= np.abs(est_s - ref_s[j]), left, j)
    d = np.abs(est_s - ref_s[pick])
    ok = d <= max_dist_s
    ie, jr = np.nonzero(ok)[0], pick[ok]
    _, first = np.unique(jr, return_index=True)       # a ref beat is matched once (the closest est beat wins)
    best = {}
    for a, b in zip(ie, jr):
        if b not in best or d[a] < d[best[b]]:
            best[b] = a
    ie = np.array(sorted(best.values()), int)
    return ie, pick[ie]


def beat_timing(est_s, ref_s, period_s: float, tol_s: float = 0.070) -> dict:
    """Timing of est beats against ref beats: signed offsets (est - ref) in ms at the start / middle / end thirds, drift and F-measure.

    Matching window is min(0.5 * period, 0.25 s) so an offset by a whole beat is never silently matched.
    offset_ms_* are MEDIANS of the signed offsets inside each third of the reference span; drift_ms = end - start.
    f_measure uses tol_s (default 70 ms, the common beat-tracking tolerance) on the matched pairs.
    """
    est_s, ref_s = np.asarray(est_s, float), np.asarray(ref_s, float)
    win = min(0.5 * period_s, 0.25)
    ie, jr = match_beats(est_s, ref_s, win)
    if len(ie) < 6:
        return {"matched": int(len(ie)), "error": "too few matched beats"}
    off = (est_s[ie] - ref_s[jr]) * 1000.0
    t = ref_s[jr]
    lo, hi = t.min(), t.max()
    thirds = [(lo + (hi - lo) * k / 3, lo + (hi - lo) * (k + 1) / 3) for k in range(3)]
    seg = []
    for a, b in thirds:
        m = (t >= a) & (t <= b)
        seg.append(float(np.median(off[m])) if m.any() else None)
    hit = np.abs(off) <= tol_s * 1000
    prec = hit.sum() / max(len(est_s), 1)
    rec = hit.sum() / max(len(ref_s), 1)
    f = 2 * prec * rec / (prec + rec) if (prec + rec) else 0.0
    return {"matched": int(len(ie)), "est_beats": int(len(est_s)), "ref_beats": int(len(ref_s)),
            "offset_ms_start": seg[0], "offset_ms_mid": seg[1], "offset_ms_end": seg[2],
            "drift_ms": (seg[2] - seg[0]) if None not in (seg[0], seg[2]) else None,
            "median_abs_dev_ms": float(np.median(np.abs(off - np.median(off)))),
            "f_measure": float(f), "tolerances": {"match_window_s": win, "f_tol_s": tol_s}}


def downbeat_phase(est_s, est_num, ref_s, ref_num, period_s: float, nseg: int = 4) -> dict:
    """Which beat-in-bar the estimate puts where the reference has beat 1, separate from tempo and timing.

    For every matched beat the shift k = (est_number - ref_number) mod 4 is computed; the majority shift over the track is the
    bar-origin error (0 = same bar origin). Per-segment majorities and the agreement share expose instability.
    """
    est_s, ref_s = np.asarray(est_s, float), np.asarray(ref_s, float)
    ie, jr = match_beats(est_s, ref_s, min(0.5 * period_s, 0.25))
    if len(ie) < 8:
        return {"matched": int(len(ie)), "error": "too few matched beats"}
    k = (np.asarray(est_num)[ie] - np.asarray(ref_num)[jr]) % 4
    counts = np.bincount(k, minlength=4)
    maj = int(counts.argmax())
    segs = []
    for part in np.array_split(np.arange(len(k)), nseg):
        c = np.bincount(k[part], minlength=4)
        segs.append({"majority_shift": int(c.argmax()), "share": float(c.max() / max(c.sum(), 1))})
    return {"matched": int(len(ie)), "majority_shift_beats": maj, "share": float(counts[maj] / counts.sum()),
            "correct_bar_origin": maj == 0, "segments": segs}


def downbeat_stability(downbeats_s, beat_period_s: float, anchor_s: float, nseg: int = 6) -> dict:
    """Intrinsic (no reference) stability of model downbeats against a constant grid: bar phase (0-3 beats) per time segment.

    Phase of a downbeat = round((t - anchor) / period) mod 4. Reports the overall majority share and where, in time, the minority phases sit.
    """
    d = np.asarray(downbeats_s, float)
    if len(d) < 4:
        return {"n": int(len(d)), "error": "too few downbeats"}
    ph = np.round((d - anchor_s) / beat_period_s).astype(int) % 4
    counts = np.bincount(ph, minlength=4)
    maj = int(counts.argmax())
    edges = np.linspace(d.min(), d.max() + 1e-9, nseg + 1)
    segs = []
    for a, b in zip(edges[:-1], edges[1:]):
        m = (d >= a) & (d < b)
        if m.any():
            c = np.bincount(ph[m], minlength=4)
            segs.append({"t0_s": round(float(a), 1), "t1_s": round(float(b), 1), "n": int(m.sum()), "majority_phase": int(c.argmax()),
                         "share_of_global_majority": float((ph[m] == maj).mean())})
    return {"n": int(len(d)), "majority_phase": maj, "majority_share": float(counts[maj] / counts.sum()), "segments": segs}
