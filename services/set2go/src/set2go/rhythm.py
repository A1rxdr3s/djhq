"""Rhythm analysis backend combining Fourier tempo with Beat This! beats/downbeats.

Layers stay separate in the output:
  tempo_fourier   : Fourier-tempogram BPM (bpm_detect.estimate_tempo)
  model_raw       : untouched Beat This! beats / downbeats (kept verbatim)
  consistency     : how well the model's beats follow a constant grid at the Fourier tempo
  grid            : the exported constant-tempo grid, only when consistency passes

A constant grid is never forced onto inconsistent model output silently: when the check fails the result is
status "inconsistent" with the reason, and the export falls back to flagging the track for manual review.

Kick-attack refinement is optional (`refine_kick`) and reported separately (`kick_corr_ms`) so its effect can
be evaluated against the unmodified model anchor.
"""

from __future__ import annotations

import json
import os
import subprocess
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent.parent
_STANDALONE_FALLBACK = Path("/Users/andresherrera/Developer/Set2Go")

def _resolve_engine_path(env_var: str, rel_path: Path, standalone_fallback: Path = _STANDALONE_FALLBACK) -> Path:
    val = os.environ.get(env_var)
    if val:
        return Path(val)
    local = ROOT / rel_path
    if local.exists():
        return local
    fallback = standalone_fallback / rel_path
    if fallback.exists():
        return fallback
    return local

def _resolve_checkpoint() -> Path:
    val = os.environ.get("SET2GO_BEAT_CHECKPOINT") or os.environ.get("SET2GO_CHECKPOINT")
    if val:
        return Path(val)
    local = ROOT / "models" / "beat_this-final0.ckpt"
    if local.exists():
        return local
    fallback = _STANDALONE_FALLBACK / "models" / "beat_this-final0.ckpt"
    if fallback.exists():
        return fallback
    return local

BEAT_PY = _resolve_engine_path("SET2GO_BEAT_PYTHON", Path(".venv-beat/bin/python"))
BEAT_WORKER = _resolve_engine_path("SET2GO_BEAT_WORKER", Path("scripts/beat_worker.py"))
CHECKPOINT = _resolve_checkpoint()

# Consistency gates (documented, not fitted to the three references).
MAX_TEMPO_DISAGREE_BPM = 0.25   # model-slope vs Fourier tempo: Fourier has 0.005 resolution; 0.25 = 0.2 %
MAX_BEAT_RESIDUAL_MS = 30.0     # robust (median abs) residual of model beats from the constant grid
MIN_INLIER_FRACTION = 0.90      # fraction of model beats within 40 ms of the grid
MAX_BAD_FRACTION = 0.01         # skipped/doubled intervals tolerated as isolated glitches
MAX_BAD_RUN = 8                 # a sustained run of bad intervals means the model lost the beat


@dataclass
class ModelRaw:
    beats: list[float]
    downbeats: list[float]
    seconds: float = 0.0
    peak_rss_mb: float = 0.0
    checkpoint: str = ""


@dataclass
class Consistency:
    status: str                      # "consistent" | "inconsistent"
    reasons: list[str]
    model_slope_bpm: float
    tempo_disagree_bpm: float
    median_abs_residual_ms: float
    inlier_fraction: float
    n_beats: int
    skipped_or_doubled: int          # intervals far from one period
    longest_bad_run: int = 0         # consecutive bad intervals (a sustained loss, not a glitch)
    bad_regions_s: list[tuple[float, float]] = field(default_factory=list)   # where the model departs from the grid


@dataclass
class RhythmResult:
    tempo_fourier: float
    model_raw: ModelRaw
    consistency: Consistency
    anchor_s: float | None = None            # constant-grid anchor from the unmodified model beats
    kick_corr_ms: float | None = None        # optional kick-attack correction applied on top (None = not applied)
    bar_origin: int | None = None            # beat number (1-4) carried by the first grid beat
    downbeat_status: str = "model_predicted"
    downbeat_majority_share: float | None = None   # share of model downbeats on the majority bar phase
    notes: list[str] = field(default_factory=list)


def available() -> bool:
    """True when the optional Beat This! environment and the pinned checkpoint are present."""
    return BEAT_PY.exists() and CHECKPOINT.exists()


def run_model(audio: Path, out_json: Path, checkpoint: Path = CHECKPOINT, reuse: bool = False,
              audio_sha256: str | None = None) -> ModelRaw:
    """Run the isolated worker (subprocess in .venv-beat) and return the raw prediction.

    reuse=True loads out_json instead of re-running the model, but only when it records the SAME audio hash and checkpoint
    hash (a stale or foreign cache is refused, never silently used). Raw predictions are always stored with those hashes.
    """
    import hashlib
    ck_sha = hashlib.sha256(Path(checkpoint).read_bytes()).hexdigest()
    if reuse and Path(out_json).exists():
        d = json.loads(Path(out_json).read_text())
        prov = d.get("_provenance", {})
        if prov.get("checkpoint_sha256") != ck_sha or (audio_sha256 and prov.get("audio_sha256") != audio_sha256):
            raise RuntimeError(f"cached raw prediction {out_json} does not match this audio/checkpoint; refusing to reuse")
        return load_raw(out_json, str(audio))
    if not BEAT_PY.exists():
        raise RuntimeError("Beat This! environment missing; run scripts/setup_beat_env.sh")
    subprocess.run([str(BEAT_PY), str(BEAT_WORKER), str(checkpoint), str(out_json), str(audio)],
                   check=True, capture_output=True)
    d = json.loads(Path(out_json).read_text())
    d["_provenance"] = {"checkpoint_sha256": ck_sha, "audio_sha256": audio_sha256 or hashlib.sha256(Path(audio).read_bytes()).hexdigest(),
                        "model": "beat_this final0", "device": "cpu"}
    Path(out_json).write_text(json.dumps(d))
    return load_raw(out_json, str(audio))


def load_raw(path: Path, key: str | None = None) -> ModelRaw:
    d = json.loads(Path(path).read_text())
    meta = d.get("_meta", {})
    non_meta = [k for k in d if not k.startswith("_")]
    if key and key in d:
        k = key
    elif key:
        by_name = [k for k in non_meta if Path(k).name == Path(key).name]
        if len(by_name) == 1:
            k = by_name[0]
        elif len(non_meta) == 1:
            k = non_meta[0]
        else:
            raise KeyError(key)
    else:
        k = non_meta[0]
    e = d[k]
    return ModelRaw(e["beats"], e["downbeats"], e.get("seconds", 0.0),
                    float(meta.get("peak_rss_mb", 0.0)), meta.get("checkpoint", ""))


def check_consistency(raw: ModelRaw, tempo_bpm: float) -> Consistency:
    """Do the model's beats follow ONE constant grid at the independently estimated tempo?"""
    b = np.asarray(raw.beats)
    per = 60.0 / tempo_bpm
    reasons: list[str] = []
    if len(b) < 16:
        return Consistency("inconsistent", ["fewer than 16 model beats"], 0.0, 0.0, 0.0, 0.0, len(b), 0, 0, [])
    ibi = np.diff(b)
    # Model tempo from the model's OWN intervals (median of plausible ones), independent of the Fourier
    # period: indexing beats by the Fourier period would absorb a tempo disagreement into the beat index.
    own = float(np.median(ibi))
    plaus = ibi[(ibi > 0.8 * own) & (ibi < 1.25 * own)]
    own = float(np.median(plaus)) if len(plaus) else own
    # Intervals are judged against the model's own beat period, so a tempo mismatch and a lost region are
    # reported as separate causes.
    badmask = (ibi < 0.6 * own) | (ibi > 1.6 * own)               # skipped, doubled, or a gap in tracking
    gap_beats = np.where(ibi > 1.6 * own, np.round(ibi / own) - 1, 0)   # beats the model skipped in a gap
    bad = int(badmask.sum())
    bad_idx = np.nonzero(badmask)[0]
    runs = np.split(bad_idx, np.nonzero(np.diff(bad_idx) > 1)[0] + 1) if bad else []
    longest = max([len(r) for r in runs] + [int(gap_beats.max())] if bad else [0])
    regions = [(round(float(b[r[0]]), 1), round(float(b[min(r[-1] + 1, len(b) - 1)]), 1)) for r in runs]
    # Model tempo independent of the Fourier period, immune to the model's 20 ms frame quantisation: count beats
    # between far-apart plausible beats from the integer part of their separation in MODEL periods (unambiguous
    # over long baselines), then take the slope of time against that count. Median IBI alone is quantised
    # (e.g. 60/0.46 = 130.435 BPM) and must not be used as the tempo.
    idx = np.concatenate([[0], np.cumsum(np.maximum(np.round(ibi / own), 1))])
    slope = float(np.polyfit(idx, b, 1)[0])
    model_bpm = 60.0 / slope
    disagree = abs(model_bpm - tempo_bpm)
    # constant grid at the FOURIER tempo, anchored by the median offset (robust to outliers); residuals use the
    # Fourier-period index so a tempo disagreement shows up as growing residual too
    kf = np.round((b - b[0]) / per)
    anchor = float(np.median(b - kf * per))
    resid = (b - (anchor + kf * per)) * 1000
    med = float(np.median(np.abs(resid)))
    inl = float(np.mean(np.abs(resid) < 40.0))
    if disagree > MAX_TEMPO_DISAGREE_BPM:
        reasons.append(f"model slope {model_bpm:.3f} vs Fourier {tempo_bpm:.3f} BPM")
    if bad / max(len(ibi), 1) > MAX_BAD_FRACTION and longest <= MAX_BAD_RUN:
        reasons.append(f"{bad} skipped/doubled intervals ({bad / len(ibi):.1%})")
    if longest > MAX_BAD_RUN:
        reasons.append(f"model lost the beat for {longest} beats/intervals in one stretch")
    if med > MAX_BEAT_RESIDUAL_MS:
        reasons.append(f"median |residual| {med:.1f} ms")
    if inl < MIN_INLIER_FRACTION:
        reasons.append(f"only {inl:.0%} of beats within 40 ms of a constant grid")
    return Consistency("inconsistent" if reasons else "consistent", reasons, model_bpm, model_bpm - tempo_bpm,
                       med, inl, len(b), bad, longest, regions)


def build_rhythm(raw: ModelRaw, tempo_bpm: float, mono=None, sr: int = 0, refine_kick: bool = False) -> RhythmResult:
    cons = check_consistency(raw, tempo_bpm)
    res = RhythmResult(tempo_bpm, raw, cons)
    if cons.status != "consistent":
        res.downbeat_status = "unavailable (model beats inconsistent with constant grid)"
        res.notes.append("not exported as a reliable grid: " + "; ".join(cons.reasons))
        return res
    b = np.asarray(raw.beats)
    per = 60.0 / tempo_bpm
    k = np.round((b - b[0]) / per)
    anchor = float(np.median(b - k * per))
    if cons.bad_regions_s:
        res.notes.append(f"isolated model glitches at {cons.bad_regions_s}; constant grid kept (glitches <= {MAX_BAD_FRACTION:.0%} of intervals)")
    if refine_kick and mono is not None:
        from .bpm_detect import _attack_times
        n = int((len(mono) / sr - anchor) / per)
        grid = anchor + per * np.arange(n)
        att = _attack_times(mono, sr, grid, 0.02, "kick")
        if len(att) >= 20:
            near = np.array([grid[int(np.argmin(np.abs(grid - a)))] for a in att])
            res.kick_corr_ms = float(np.median(att - near)) * 1000
            anchor += res.kick_corr_ms / 1000
    res.anchor_s = anchor % per
    d = np.asarray(raw.downbeats)
    if len(d):
        # downbeats should be spaced 4 beats apart on the grid; report if they are not
        # every model downbeat is placed on the grid; the bar origin is the MAJORITY grid phase (mod 4), not
        # just the first downbeat (one early downbeat decided it before, which was an artefact)
        pos = np.round((d - res.anchor_s) / per).astype(int) % 4
        counts = np.bincount(pos, minlength=4)
        major = int(np.argmax(counts))
        res.downbeat_majority_share = float(counts[major] / len(d))
        res.bar_origin = (-major) % 4 + 1
        if res.downbeat_majority_share < 0.90:
            res.downbeat_status = (f"model_predicted_unstable ({res.downbeat_majority_share:.0%} of model downbeats on the "
                                   f"majority bar phase; the rest are offset by whole beats)")
            res.notes.append("model downbeats disagree with each other on bar phase")
    else:
        res.downbeat_status = "unavailable (no model downbeats)"
    return res
