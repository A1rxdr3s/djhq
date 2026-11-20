"""EXPERIMENTAL, OPT-IN revision of the rejected-grid decision (set2go.rhythm.check_consistency is NOT modified and remains the production gate).

Question: when the model's slope disagrees with the audio-derived (tempogram) tempo, is that a BEAT-COUNT/INDEX artefact (missing, extra or split beats; the beats still sit on
one constant grid at the audio tempo) or REAL drift / variable tempo? The production gate cannot tell, because its slope is a regression on an index built from
round(interval / own_period), which a local count error shifts.

Decision is made from measurements against the AUDIO-DERIVED grid only (period = 60 / tempo_bpm), never by loosening a threshold:
  1. phase     robust (median) offset of the beats modulo the audio period; beats are assigned to grid slots by rounding against the AUDIO period, so a count error elsewhere cannot shift them
  2. fit       fraction of beats within FIT_MS of their slot, and the median |residual|
  3. ramp      linear trend of the residual against time (ms/min) and cumulative end-to-end drift over the track duration: bounded by a duration- and BPM-aware timing budget
               derived from FIT_MS (40 ms), MAX_WINDOW_OFFSET_MS (35 ms), MODEL_FRAME_MS (20 ms) and TEMPO_RESOLUTION_BPM (0.005 BPM)
  4. windows   the track is cut into WINDOW_S windows; each window gets its own residual offset and fit. A tempo CHANGE or a local failure shows as windows that disagree with the global grid
  5. coverage  slots of the audio grid that have no model beat within FIT_MS (missing beats), and model beats that fall in no slot (extra/split beats). A CONTIGUOUS run of more than
               MAX_MISSING_RUN empty slots is a local failure (a window with no beats is invisible to a fit-only check, which is how a first version accepted a 12-beat hole): the
               time span of every such run is marked as a bad window
  6. explain   the model-slope disagreement is "explained" only if (a) the beats, indexed by the AUDIO period, advance at the audio tempo (residual ramp within the duration-aware
               drift limit and < 25% of what a real tempo difference of that size would produce) AND (b) IDENTIFIED local count errors (odd intervals: skipped/doubled/split beats)
               produce a signed net beat-count change (local_net = split_extra - skipped) that matches the signed slope-implied beat discrepancy
               (implied_diff = span * (slope - tempo_bpm) / 60) in BOTH direction (same sign, non-zero) and magnitude (0.5x to 2.0x, matching the OLS leverage range 6*u*(1-u) in
               [0.5, 1.5] of interior count errors). A large absolute count alone never establishes an explanation; if the available evidence cannot justify it, return needs_review.

Outcomes (each carries explicit reasons):
  accept_audio_grid   beats fit the audio grid globally and in every window, no ramp, any slope disagreement is explained by local count errors  -> a constant grid at the audio tempo
  accept_with_gaps    as above but some windows are bad (local failures): grid accepted ONLY with the bad windows listed (needs_review stays set for them)
  needs_review        ambiguous or conflicting evidence (e.g. a ramp, windows with a different offset, low coverage, or an unexplained slope gap): NEVER forced into a constant grid
  reject              no usable fit (beats do not follow the audio tempo at all, or tempo variable)
The production-consistent case (model slope within the limit and all gates passing) is reported as `production_accept` unchanged.
MEASURED PROPERTIES OF THE LIMITS (synthetic probes plus mutation checks):
  * LOAD-BEARING: the duration-aware ramp/drift limit (catches small tempo errors such as 0.02 BPM on a 5 min track or 0.005 BPM on a 15 min track before the 40 ms slot window clips
    beats), the bad-window fraction limit (disabling it turned 92 of 156 probes into accepts), the window-offset check in window classification, the fit/coverage reject guard (0.6),
    the missing-run detection, and the signed direction+magnitude explanation rule.
  * REDUNDANT here: the global fit limit (MIN_FIT_FRACTION) and global coverage limit (MIN_COVERAGE) when `not bad` (local failures trigger bad windows first, while uniform failures
    trigger the 0.6 reject guard or bad windows). They are kept as documentation of intent, not as independent safeguards; do not count them as sole protection.
  * DURATION-DEPENDENT DRIFT TRADEOFF: bounding cumulative end-to-end drift to MAX_TOTAL_DRIFT_MS = 30 ms (+-15 ms from the median anchor at track ends, reserving one 20 ms model frame
    inside the 35 ms window-offset / 40 ms slot-fit budget) means the tolerable BPM error scales as tempo_bpm * 30 / (1000 * duration_s). A 0.005 BPM tempogram step passes on a 5 min
    128 BPM track (~11.7 ms drift) but is NOT assumed to always pass: on tracks longer than 6 * tempo_bpm seconds (~12.8 min at 128 BPM, 12.0 min at 120 BPM) even a 0.005 BPM error
    exceeds 30 ms and returns needs_review. Conversely, short tracks (e.g. 2 min) tolerate up to ~0.03 BPM while still staying under 30 ms of total drift.
All limits below are DOCUMENTED HEURISTICS chosen from first principles (beat quantisation of the model is 20 ms; tempogram fine step is 0.005 BPM), NOT fitted to the development cases."""
from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np

# Limits (heuristics, derived from the timing budget and estimator resolution, not fitted):
FIT_MS = 40.0                  # a beat belongs to its slot if within 40 ms (same tolerance the production gate uses for inliers)
MODEL_FRAME_MS = 20.0          # Beat This! frame step (20 ms quantisation -> +-10 ms half-frame uncertainty)
TEMPO_RESOLUTION_BPM = 0.005   # Fourier tempogram fine grid step (bpm_detect.estimate_tempo)
MIN_FIT_FRACTION = 0.97        # global: stricter than the production 0.90 because the audio tempo is not corroborated by the model slope here
WINDOW_S = 30.0                # window length for local checks (about 60 beats at 120 BPM)
MIN_WINDOW_FIT = 0.90          # a window with < 90% of beats on the grid is a bad window
MAX_BAD_WINDOW_FRACTION = 0.15 # more than 15% bad windows -> not a constant grid
MAX_WINDOW_OFFSET_MS = 35.0    # a window whose median offset differs from the global phase by more than this has a different phase (tempo change or a shifted section)
MAX_TOTAL_DRIFT_MS = 2.0 * (MAX_WINDOW_OFFSET_MS - MODEL_FRAME_MS)  # 30.0 ms end-to-end (+-15 ms at ends from median anchor, leaving 20 ms frame margin inside 35 ms window / 40 ms fit)
MAX_RAMP_MS_PER_MIN = 25.0     # per-minute rate ceiling for very short clips (< 72 s); on full tracks MAX_TOTAL_DRIFT_MS / (duration_s / 60) binds first
MIN_COVERAGE = 0.97            # fraction of audio-grid slots that hold a model beat
MAX_MISSING_RUN = 8            # contiguous audio-grid slots without a model beat: the production gate's own "model lost the beat" length (rhythm.MAX_BAD_RUN)
SLOPE_LIMIT_BPM = 0.25         # the production tempo-disagreement limit (rhythm.MAX_TEMPO_DISAGREE_BPM), reused only to judge whether a slope gap is explained
EXPLAIN_MIN_RATIO = 0.5        # minimum |local_net| / |implied_diff| (at track midpoint u=0.5, OLS leverage 6*u*(1-u) = 1.5 -> ratio 2/3 >= 0.5)
EXPLAIN_MAX_RATIO = 2.0        # maximum |local_net| / |implied_diff| (near outer quarters u=0.1..0.9, leverage >= 0.54 -> ratio <= 1.85 <= 2.0)


def max_ramp_ms_per_min(duration_s: float) -> float:
    """Duration-aware ramp limit (ms/min): caps cumulative drift across `duration_s` at MAX_TOTAL_DRIFT_MS (30 ms) and rate at MAX_RAMP_MS_PER_MIN (25 ms/min)."""
    dur_min = max(float(duration_s), 1.0) / 60.0
    return float(min(MAX_RAMP_MS_PER_MIN, MAX_TOTAL_DRIFT_MS / dur_min))


def max_tempo_error_bpm(tempo_bpm: float, duration_s: float) -> float:
    """Maximum tempo error (BPM) at `tempo_bpm` and `duration_s` before cumulative drift exceeds the timing budget."""
    return float(tempo_bpm * max_ramp_ms_per_min(duration_s) / 60000.0)


@dataclass
class GridDecision:
    outcome: str                        # production_accept | accept_audio_grid | accept_with_gaps | needs_review | reject
    reasons: list[str]
    tempo_bpm: float
    phase_s: float | None = None
    fit_fraction: float = 0.0
    median_abs_residual_ms: float = 0.0
    ramp_ms_per_min: float = 0.0
    coverage: float = 0.0
    n_missing_slots: int = 0
    n_extra_beats: int = 0
    bad_windows_s: list[tuple[float, float]] = field(default_factory=list)
    window_offsets_ms: list[float] = field(default_factory=list)
    model_slope_bpm: float | None = None
    slope_explained: bool | None = None
    detail: dict = field(default_factory=dict)


def _slope_bpm(b: np.ndarray, own: float) -> float:
    ibi = np.diff(b)
    plaus = ibi[(ibi > 0.8 * own) & (ibi < 1.25 * own)]
    own_p = float(np.median(plaus)) if len(plaus) else own
    idx = np.concatenate([[0], np.cumsum(np.maximum(np.round(ibi / own_p), 1))])
    return 60.0 / float(np.polyfit(idx, b, 1)[0])


def evaluate(beats, tempo_bpm: float, production_status: str | None = None, model_slope_bpm: float | None = None, duration_s: float | None = None) -> GridDecision:
    """Decide from the model's raw beat times and the audio-derived tempo. `production_status` = the production gate's verdict ('consistent' / 'inconsistent') when known:
    a track the production gate accepts is returned as production_accept unchanged (this revision never changes an accepted track)."""
    b = np.asarray(beats, float)
    per = 60.0 / tempo_bpm
    if production_status == "consistent":
        return GridDecision("production_accept", ["accepted by the production gate; unchanged"], tempo_bpm, model_slope_bpm=model_slope_bpm)
    if len(b) < 32:
        return GridDecision("reject", [f"only {len(b)} model beats"], tempo_bpm)
    reasons: list[str] = []
    # 1 phase: beats assigned to slots by the AUDIO period (immune to model count errors)
    k = np.round((b - b[0]) / per)
    off = (b - b[0]) - k * per
    phase = float(np.median(off)) + b[0]
    res = (b - (phase + np.round((b - phase) / per) * per)) * 1000.0
    ok = np.abs(res) <= FIT_MS
    fit = float(ok.mean()); med = float(np.median(np.abs(res)))
    # 3 ramp (drift): linear trend of the residual against time over the beats that fit, evaluated against the duration-aware timing budget
    span = float(b[-1] - b[0])
    eff_duration_s = max(float(duration_s), span) if duration_s is not None else span
    t = b[ok]
    ramp = float(np.polyfit(t, res[ok], 1)[0] * 60.0) if ok.sum() > 16 else 0.0
    ramp_total = ramp * (eff_duration_s / 60.0)
    ramp_limit = max_ramp_ms_per_min(eff_duration_s)
    max_bpm_err = max_tempo_error_bpm(tempo_bpm, eff_duration_s)
    res_drift_ms = (TEMPO_RESOLUTION_BPM / tempo_bpm) * eff_duration_s * 1000.0
    # 5 coverage: audio-grid slots with / without a model beat
    first, last = b[0], b[-1]
    slots = np.arange(int(np.ceil((first - phase) / per)), int(np.floor((last - phase) / per)) + 1)
    slot_t = phase + slots * per
    near = np.abs(b[None, :] - slot_t[:, None]).min(axis=1) <= FIT_MS / 1000.0
    coverage = float(near.mean()); n_missing = int((~near).sum())
    missing_runs = []
    miss = ~near; i = 0
    while i < len(miss):
        if miss[i]:
            j = i
            while j + 1 < len(miss) and miss[j + 1]:
                j += 1
            if j - i + 1 > MAX_MISSING_RUN:
                missing_runs.append((round(float(slot_t[i]), 1), round(float(slot_t[j]), 1), j - i + 1))
            i = j + 1
        else:
            i += 1
    own_slot = np.round((b - phase) / per).astype(int)
    n_extra = int(len(b) - len(np.unique(own_slot[ok])))                      # beats beyond one per slot (duplicates/splits) + beats off the grid
    # 4 windows
    wins, offs, bad = [], [], []
    t0 = b[0]
    for s in np.arange(t0, b[-1], WINDOW_S):
        m = (b >= s) & (b < s + WINDOW_S)
        if m.sum() < 8:
            continue
        w_fit = float((np.abs(res[m]) <= FIT_MS).mean()); w_off = float(np.median(res[m]))
        wins.append((float(s), float(s + WINDOW_S))); offs.append(w_off)
        if w_fit < MIN_WINDOW_FIT or abs(w_off) > MAX_WINDOW_OFFSET_MS:
            bad.append((round(float(s), 1), round(float(s + WINDOW_S), 1)))
    for (ms, me, n) in missing_runs:                                              # windows that contain a long missing run are bad even though they hold no (or few) beats
        for s0 in np.arange(t0, b[-1], WINDOW_S):
            if s0 < me and s0 + WINDOW_S > ms and (round(float(s0), 1), round(float(s0 + WINDOW_S), 1)) not in bad:
                bad.append((round(float(s0), 1), round(float(s0 + WINDOW_S), 1)))
                if (float(s0), float(s0 + WINDOW_S)) not in wins:
                    wins.append((float(s0), float(s0 + WINDOW_S))); offs.append(0.0)
    bad_frac = len(bad) / max(len(wins), 1)
    # 6 explain the slope disagreement (direction AND magnitude)
    own = float(np.median(np.diff(b)))
    slope = model_slope_bpm if model_slope_bpm is not None else _slope_bpm(b, own)
    signed_gap = float(slope - tempo_bpm)
    gap = abs(signed_gap)
    explained = None
    if gap > SLOPE_LIMIT_BPM:
        # Over `span`, the audio tempo puts `count_audio = span / per` beat periods, while the model slope implies `count_model = span / (60 / slope)`.
        # The signed beat-count discrepancy implied by the tempo-slope gap is `implied_diff_signed = count_model - count_audio = span * (slope - tempo_bpm) / 60`.
        # In OLS regression of beat time on beat index over [0, N], a local count change of dN at relative position u in (0, 1) shifts the slope-implied count by
        # dN_implied = 6*u*(1-u) * dN: same sign as dN, with leverage 1.5 at the track midpoint (u=0.5), 1.0 for uniform spread, and >= 0.54 across u in [0.1, 0.9].
        # For a contiguous run of `r` short intervals (< 0.6 * own) spanning `dt`, `round(dt / per)` audio periods were split into `r` intervals, adding
        # `max(r - round(dt / per), 1)` extra beats (so one period split 50/50 into two half-beat intervals counts as +1 extra beat, not +2).
        implied_ms_per_min = gap / tempo_bpm * 60000.0
        ramp_small = abs(ramp) <= ramp_limit and abs(ramp) < 0.25 * implied_ms_per_min
        count_audio = span / per
        count_model = span / (60.0 / slope)
        count_actual = len(b) - 1
        implied_diff_signed = count_model - count_audio
        implied_diff = abs(implied_diff_signed)
        ibi = np.diff(b)
        plaus = ibi[(ibi > 0.8 * own) & (ibi < 1.25 * own)]
        own_ibi = float(np.median(plaus)) if len(plaus) else own
        short_mask = ibi < 0.6 * own_ibi
        long_mask = ibi > 1.6 * own_ibi
        odd = short_mask | long_mask
        skipped = float(np.sum(np.where(long_mask, np.round(ibi / per) - 1, 0)))     # audio-grid beats skipped inside long intervals
        short_idx = np.nonzero(short_mask)[0]
        short_runs = np.split(short_idx, np.nonzero(np.diff(short_idx) > 1)[0] + 1) if len(short_idx) else []
        split = float(sum(max(len(r) - int(np.round(ibi[r].sum() / per)), 1) for r in short_runs))  # extra beats created by splitting periods
        local_net = split - skipped                                                   # signed net beat-count change from identified odd intervals
        same_direction = (local_net * implied_diff_signed) > 0.0
        magnitude_ok = (implied_diff >= 0.5) and (abs(local_net) >= 1.0) and (EXPLAIN_MIN_RATIO * implied_diff <= abs(local_net) <= EXPLAIN_MAX_RATIO * implied_diff)
        explained = bool(ramp_small and same_direction and magnitude_ok)
        detail_slope = {"ramp_ms_per_min": round(ramp, 2), "ramp_a_real_tempo_error_would_give": round(implied_ms_per_min, 1),
                        "beats_expected_at_audio_tempo": round(count_audio, 1), "beats_implied_by_model_slope": round(count_model, 1),
                        "implied_slope_beat_diff": round(implied_diff_signed, 2), "intervals_actually_present": int(count_actual),
                        "n_missing_slots": n_missing, "n_extra_beats": n_extra, "odd_intervals": int(odd.sum()),
                        "short_intervals": int(short_mask.sum()), "long_intervals": int(long_mask.sum()),
                        "skipped_beats_in_long_intervals": skipped, "split_beats_from_short_intervals": split,
                        "net_local_count_change": local_net, "direction_matches": bool(same_direction), "magnitude_matches": bool(magnitude_ok)}
    else:
        detail_slope = {}
    # decision
    detail = {"fit_ms": FIT_MS, "n_beats": int(len(b)), "n_slots": int(len(slots)), "duration_s": round(eff_duration_s, 1),
              "ramp_total_ms_over_track": round(ramp_total, 1), "ramp_limit_ms_per_min": round(ramp_limit, 2),
              "max_total_drift_ms": MAX_TOTAL_DRIFT_MS, "max_tempo_error_bpm": round(max_bpm_err, 4),
              "estimator_resolution_drift_ms": round(res_drift_ms, 1), "missing_runs": missing_runs, "slope_check": detail_slope}
    if fit < 0.6 or coverage < 0.6:
        reasons.append(f"beats do not follow the audio tempo grid (fit {fit:.0%}, coverage {coverage:.0%})")
        return GridDecision("reject", reasons, tempo_bpm, phase, fit, med, ramp, coverage, n_missing, n_extra, bad, offs, slope, explained, detail)
    if abs(ramp) > ramp_limit:
        reasons.append(f"residual ramp {ramp:+.1f} ms/min ({ramp_total:+.1f} ms over {eff_duration_s:.0f}s; limit {ramp_limit:.1f} ms/min, {MAX_TOTAL_DRIFT_MS:.0f} ms total, ~{max_bpm_err:.4f} BPM at {tempo_bpm:.1f} BPM): drift or a wrong audio tempo")
    if bad_frac > MAX_BAD_WINDOW_FRACTION:
        reasons.append(f"{len(bad)} of {len(wins)} windows do not fit the grid (limit {MAX_BAD_WINDOW_FRACTION:.0%}): not a constant grid")
    if fit < MIN_FIT_FRACTION and not bad:
        reasons.append(f"only {fit:.1%} of beats fit the audio grid (limit {MIN_FIT_FRACTION:.0%}) and the misfits are not confined to windows")
    if coverage < MIN_COVERAGE and not bad:
        reasons.append(f"coverage {coverage:.1%} of audio-grid slots (limit {MIN_COVERAGE:.0%}) without confined bad windows: beats are missing")
    if gap > SLOPE_LIMIT_BPM and not explained:
        reasons.append(f"model slope {slope:.3f} vs audio tempo {tempo_bpm:.3f} is NOT explained: "
                       + ("the residual ramp is not small, so the audio tempo itself or the track tempo is in doubt"
                          if not ramp_small else
                          f"the beats advance at the audio tempo but no IDENTIFIED local beat-count error (odd intervals, missing runs) accounts for the slope gap in direction and magnitude (local net {local_net:+.1f} vs slope-implied {implied_diff_signed:+.1f} beats)"))
    if reasons:
        out = "reject" if (abs(ramp) > 3 * MAX_RAMP_MS_PER_MIN or bad_frac > 0.5) else "needs_review"
        return GridDecision(out, reasons, tempo_bpm, phase, fit, med, ramp, coverage, n_missing, n_extra, bad, offs, slope, explained, detail)
    if bad:
        reasons.append(f"audio-tempo grid fits globally; {len(bad)} window(s) {bad} contain local beat errors"
                       + (f" (missing runs {[(a, b_, n) for a, b_, n in missing_runs]})" if missing_runs else "") + ": grid accepted only with those windows flagged")
        out = "accept_with_gaps"
    else:
        reasons.append("beats fit the audio-tempo grid globally and in every window, no ramp"
                       + (f"; model slope gap {signed_gap:+.3f} BPM is explained: beats advance at the audio tempo (ramp {ramp:+.1f} ms/min vs {implied_ms_per_min:.0f} ms/min for a real tempo error) and identified local count change ({local_net:+.1f} beats) matches the slope-implied discrepancy ({implied_diff_signed:+.1f} beats)" if gap > SLOPE_LIMIT_BPM else ""))
        out = "accept_audio_grid"
    return GridDecision(out, reasons, tempo_bpm, phase, fit, med, ramp, coverage, n_missing, n_extra, bad, offs, slope, explained, detail)
