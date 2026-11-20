"""needs_review reasons: interpretable signals only. No probability is invented from arbitrary thresholds; each reason names the measured signal and
the published/derived limit it was compared with, so a person can judge it. Limits are reported alongside the values.

Signals (all produced by existing code or the metrics module):
  tempo:     Fourier vs model-slope disagreement (rhythm.check_consistency), tempo_octave_candidates (strong peaks at 2x / 0.5x)
  beats:     consistency status, median residual, inlier fraction, bad regions
  downbeat:  majority bar-phase share and where minority phases sit; advisory half-bar evidence (barphase.backbeat_evidence)
  key:       profile margin, parallel-mode gap, disagreement between independent estimators, disagreement with an embedded tag
"""
from __future__ import annotations

# Documented review limits (heuristic, NOT calibrated probabilities; echoed in every report).
LIMITS = {"downbeat_majority_share_min": 0.90, "key_margin_min": 0.05, "key_parallel_gap_min": 0.05}


def review_reasons(rhythm: dict | None, key: dict | None, backbeat: dict | None = None) -> list[dict]:
    out: list[dict] = []
    if rhythm is not None:
        if rhythm.get("phase_status") == "model_inconsistent":
            out.append({"area": "beats", "reason": "model beats inconsistent with a constant grid", "detail": rhythm.get("reasons")})
        share = rhythm.get("downbeat_majority_share")
        if share is not None and share < LIMITS["downbeat_majority_share_min"]:
            out.append({"area": "downbeat", "reason": "bar phase unstable", "value": round(share, 3),
                        "limit": LIMITS["downbeat_majority_share_min"]})
        if rhythm.get("phase_status") != "model_inconsistent" and share is None:
            out.append({"area": "downbeat", "reason": "no downbeat evidence"})
        if rhythm.get("tempo_disagree_bpm") is not None and rhythm["tempo_disagree_bpm"] > 0.1:
            out.append({"area": "tempo", "reason": "model slope differs from Fourier tempo", "value": round(rhythm["tempo_disagree_bpm"], 3)})
    if backbeat is not None and backbeat.get("verdict") in ("flip_signature", "minority_conventional", "mixed"):
        txt = {"flip_signature": "minority downbeat blocks look like half-bar flips of the model (accent at offset 0 where majority bars have it at 2)",
               "minority_conventional": "the model's minority bar reading matches the conventional accent position; the majority reading may be the flipped one",
               "mixed": "accent evidence neither confirms nor contradicts the model's minority blocks"}[backbeat["verdict"]]
        out.append({"area": "downbeat", "reason": "half-bar evidence (advisory, not applied): " + txt,
                    "detail": {k: backbeat[k] for k in ("majority_bars", "minority_bars", "accent_offset_hist_majority", "accent_offset_hist_minority")},
                    "limit": backbeat["limits"]})
    if key is not None:
        est = key.get("estimators", {})
        names = {k: v["camelot"] for k, v in est.items() if v}
        if len(set(names.values())) > 1:
            out.append({"area": "key", "reason": "independent estimators disagree", "detail": names})
        for k, v in est.items():
            if v and v.get("parallel_gap") is not None and v["parallel_gap"] < LIMITS["key_parallel_gap_min"]:
                out.append({"area": "key", "reason": f"{k}: major/minor nearly tied", "value": round(v["parallel_gap"], 3),
                            "limit": LIMITS["key_parallel_gap_min"]})
        tag = key.get("tag")
        if tag and names and tag["camelot"] not in names.values():
            out.append({"area": "key", "reason": "no estimator agrees with the embedded tag (tag is a candidate, not truth)",
                        "detail": {"tag": tag["camelot"], **names}})
    return out
