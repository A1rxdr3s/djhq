"""Versioned engine-result contract for DJHQ integration and opt-in gridcheck resolution.

Contract invariants:
  1. No invented confidence percentages or uncalibrated probabilities. Measured count shares (e.g. downbeat_majority_share,
     fit_fraction, coverage) are labelled with their exact meaning and compared against documented heuristic limits.
  2. Beat-grid acceptance and downbeat/bar-origin review are kept separate: a recovered or production-accepted beat grid
     can still require downbeat review (e.g. downbeat_majority_share < 0.90 or unvalidated bar origin on a gridcheck recovery).
  3. Unaccepted grids (needs_review / reject without a manual override) never have a diagnostic hypothetical grid substituted.
  4. Accepted tracks are partitioned into `accepted_clean` and `accepted_with_warnings` so callers can distinguish clean
     tracks from tracks accepted with flagged breakdown windows, unstable/unvalidated downbeats, or key/tempo warnings.
"""
from __future__ import annotations

from pathlib import Path
from typing import Any, Mapping, Sequence

import numpy as np

from . import ANALYSIS_VERSION, gridcheck as G, review as RV

ENGINE_CONTRACT_VERSION = "1.0"

VALID_GRID_STATUSES = ("accepted", "accepted_with_warnings", "needs_review", "rejected", "failed")
VALID_ELIGIBILITY_TIERS = ("accepted_clean", "accepted_with_warnings", "unresolved_needs_review", "failed")
VALID_EXPORT_STATUSES = ("exported", "blocked_unresolved", "dry_run", "failed")


def _project_downbeats(downbeats: Sequence[float], anchor_s: float, period_s: float) -> tuple[int, float | None, str]:
    """Project raw model downbeats onto a constant grid at (anchor_s, period_s).

    Matches the exact bar-origin convention of rhythm.build_rhythm and analysis_blind_compare_rb:
    pos = round((d - anchor_s) / period_s) mod 4; bar_origin = (-majority_pos) mod 4 + 1.
    """
    d = np.asarray(downbeats, float)
    if len(d) == 0:
        return 1, None, "unavailable (no model downbeats)"
    pos = np.round((d - anchor_s) / period_s).astype(int) % 4
    counts = np.bincount(pos, minlength=4)
    major = int(np.argmax(counts))
    share = float(counts[major] / len(d))
    bar_origin = (-major) % 4 + 1
    if share < RV.LIMITS["downbeat_majority_share_min"]:
        status = (
            f"model_predicted_unstable ({share:.0%} of model downbeats on the "
            f"majority bar phase; the rest are offset by whole beats; bar origin not validated by gridcheck)"
        )
    else:
        status = (
            f"model_predicted_unvalidated_by_gridcheck ({share:.0%} of model downbeats on the "
            f"majority bar phase; gridcheck validates beat timing only, not bar origin)"
        )
    return bar_origin, share, status


def resolve_rhythm_with_gridcheck(
    raw,
    tempo_bpm: float,
    duration_s: float,
    *,
    mono=None,
    sr: int = 0,
    refine_kick: bool = True,
    gridcheck: bool = False,
) -> dict[str, Any]:
    """Evaluate Beat This! raw predictions against the Fourier tempo with optional opt-in gridcheck recovery.

    - When production accepts (`cons.status == "consistent"`), the actual production grid (including `kick_corr_ms`
      when `refine_kick=True`) is preserved verbatim whether `gridcheck` is True or False.
    - When production rejects and `gridcheck=True`, `gridcheck.evaluate()` runs:
      * For `accept_audio_grid` / `accept_with_gaps`, builds the exact audio-period grid evaluated in blind2:
        `anchor_s = float(gdec.phase_s) % (60.0 / tempo_bpm)` with `kick_corr_ms = None` (no kick shift).
      * For `needs_review` / `reject`, refuses to build a grid (`anchor_s = None`, `anchor_ms = None`); the diagnostic
        hypothetical phase is never substituted as an accepted grid.
    """
    from .. import rhythm as rhythm_mod

    rr = rhythm_mod.build_rhythm(raw, tempo_bpm, mono, sr, refine_kick)
    cons = rr.consistency

    if cons.status == "consistent" and rr.anchor_s is not None:
        gdec = (
            G.evaluate(raw.beats, tempo_bpm, production_status="consistent", model_slope_bpm=cons.model_slope_bpm, duration_s=duration_s)
            if gridcheck
            else None
        )
        anchor_ms = round(rr.anchor_s * 1000.0, 1)
        grid_auto: dict[str, Any] = {
            "bpm": tempo_bpm,
            "anchor_ms": anchor_ms,
            "bar_origin": rr.bar_origin or 1,
            "phase_status": "model_consistent",
            "downbeat": rr.downbeat_status,
            "backend": "beat_this",
            "kick_corr_ms": rr.kick_corr_ms,
            "downbeat_majority_share": rr.downbeat_majority_share,
            "model_slope_bpm": round(cons.model_slope_bpm, 3),
            "median_abs_residual_ms": round(cons.median_abs_residual_ms, 1),
            "notes": list(rr.notes),
        }
        if gridcheck and gdec is not None:
            grid_auto["gridcheck_outcome"] = gdec.outcome
            grid_auto["gridcheck_reasons"] = list(gdec.reasons)
            grid_auto["flagged_windows_s"] = []
        return {
            "rhythm_result": rr,
            "gridcheck_decision": gdec,
            "grid_accepted": True,
            "decision": "production_accept",
            "grid_source_kind": "production_beat_this",
            "anchor_s": rr.anchor_s,
            "anchor_ms": anchor_ms,
            "bar_origin": rr.bar_origin or 1,
            "kick_corr_ms": rr.kick_corr_ms,
            "downbeat_status": rr.downbeat_status,
            "downbeat_majority_share": rr.downbeat_majority_share,
            "flagged_windows_s": [list(w) for w in cons.bad_regions_s],
            "reasons": list(gdec.reasons) if gdec is not None else [],
            "grid_auto": grid_auto,
        }

    # Production rejected (`cons.status != "consistent"`)
    if not gridcheck:
        grid_auto = {
            "bpm": tempo_bpm,
            "anchor_ms": None,
            "bar_origin": 1,
            "phase_status": "model_inconsistent",
            "downbeat": rr.downbeat_status,
            "backend": "beat_this",
            "reasons": list(cons.reasons),
            "bad_regions_s": list(cons.bad_regions_s),
        }
        return {
            "rhythm_result": rr,
            "gridcheck_decision": None,
            "grid_accepted": False,
            "decision": "needs_review",
            "grid_source_kind": "none",
            "anchor_s": None,
            "anchor_ms": None,
            "bar_origin": None,
            "kick_corr_ms": None,
            "downbeat_status": rr.downbeat_status,
            "downbeat_majority_share": None,
            "flagged_windows_s": [list(w) for w in cons.bad_regions_s],
            "reasons": list(cons.reasons),
            "grid_auto": grid_auto,
        }

    # Opt-in gridcheck evaluation on production-rejected track
    gdec = G.evaluate(
        raw.beats,
        tempo_bpm,
        production_status=cons.status,
        model_slope_bpm=cons.model_slope_bpm,
        duration_s=duration_s,
    )
    flagged_win = [list(w) for w in gdec.bad_windows_s]

    if gdec.outcome in ("accept_audio_grid", "accept_with_gaps"):
        per = 60.0 / tempo_bpm
        anchor_s = float(gdec.phase_s) % per
        # Exact blind2 grid construction: audio-period phase in [0, per), no kick shift, microsecond precision in ms
        anchor_ms = round(anchor_s * 1000.0, 6)
        bar_origin, db_share, db_status = _project_downbeats(raw.downbeats, anchor_s, per)
        notes = list(gdec.reasons)
        if db_share is not None and db_share < RV.LIMITS["downbeat_majority_share_min"]:
            notes.append("model downbeats disagree with each other on bar phase")
        notes.append("recovered by opt-in gridcheck (audio-period grid at median inlier phase; no kick refinement applied)")
        phase_status = f"gridcheck_{gdec.outcome}"
        grid_auto = {
            "bpm": tempo_bpm,
            "anchor_ms": anchor_ms,
            "bar_origin": bar_origin,
            "phase_status": phase_status,
            "downbeat": db_status,
            "backend": "beat_this+gridcheck",
            "kick_corr_ms": None,
            "downbeat_majority_share": db_share,
            "model_slope_bpm": round(cons.model_slope_bpm, 3),
            "median_abs_residual_ms": round(gdec.median_abs_residual_ms, 1),
            "gridcheck_outcome": gdec.outcome,
            "gridcheck_reasons": list(gdec.reasons),
            "production_reasons": list(cons.reasons),
            "flagged_windows_s": flagged_win,
            "slope_explained": gdec.slope_explained,
            "fit_fraction": round(gdec.fit_fraction, 4),
            "coverage": round(gdec.coverage, 4),
            "ramp_ms_per_min": round(gdec.ramp_ms_per_min, 2),
            "notes": notes,
        }
        return {
            "rhythm_result": rr,
            "gridcheck_decision": gdec,
            "grid_accepted": True,
            "decision": gdec.outcome,
            "grid_source_kind": "gridcheck_audio_period",
            "anchor_s": anchor_s,
            "anchor_ms": anchor_ms,
            "bar_origin": bar_origin,
            "kick_corr_ms": None,
            "downbeat_status": db_status,
            "downbeat_majority_share": db_share,
            "flagged_windows_s": flagged_win,
            "reasons": list(gdec.reasons),
            "grid_auto": grid_auto,
        }

    # Unaccepted under both production and gridcheck (needs_review or reject): NEVER substitute gdec.phase_s!
    combined_reasons = list(cons.reasons) + [r for r in gdec.reasons if r not in cons.reasons]
    unavail_status = f"unavailable (model beats inconsistent with constant grid; gridcheck {gdec.outcome})"
    grid_auto = {
        "bpm": tempo_bpm,
        "anchor_ms": None,
        "bar_origin": 1,
        "phase_status": "model_inconsistent",
        "downbeat": unavail_status,
        "backend": "beat_this+gridcheck",
        "reasons": combined_reasons,
        "production_reasons": list(cons.reasons),
        "gridcheck_outcome": gdec.outcome,
        "gridcheck_reasons": list(gdec.reasons),
        "bad_regions_s": list(cons.bad_regions_s),
        "flagged_windows_s": flagged_win,
        "slope_explained": gdec.slope_explained,
    }
    return {
        "rhythm_result": rr,
        "gridcheck_decision": gdec,
        "grid_accepted": False,
        "decision": gdec.outcome,
        "grid_source_kind": "none",
        "anchor_s": None,
        "anchor_ms": None,
        "bar_origin": None,
        "kick_corr_ms": None,
        "downbeat_status": unavail_status,
        "downbeat_majority_share": None,
        "flagged_windows_s": flagged_win or [list(w) for w in cons.bad_regions_s],
        "reasons": combined_reasons,
        "grid_auto": grid_auto,
    }


def _key_provenance_text(eff_origin: str | None, key_layers: Mapping[str, Any] | None, selected_pred: Mapping[str, Any] | None) -> str | None:
    if eff_origin == "manual":
        return "user override (sidecar, hash-linked)"
    if eff_origin == "imported":
        imp = (key_layers or {}).get("imported") or {}
        prov = imp.get("provenance")
        if prov == "mixedinkey_self_declared":
            return "Mixed In Key payload (self-declared; reading metadata, not detection)"
        return "embedded tag (writer unknown; reading metadata, not detection)"
    if eff_origin == "predicted":
        backend = (selected_pred or {}).get("backend") or "unknown backend"
        return f"audio prediction from {backend} (unverified)"
    return None


def build_track_contract(
    *,
    filename: str,
    source_path: Path | str,
    sha256: str,
    duration_s: float,
    sample_rate: int,
    bpm_value: float | None,
    bpm_source: str,
    model_slope_bpm: float | None = None,
    tempo_disagree_bpm: float | None = None,
    key_resolution: Mapping[str, Any] | None = None,
    key_review_items: Sequence[Mapping[str, Any]] | None = None,
    grid_status: str,
    grid_decision: str,
    grid_source: str,
    grid_bpm: float | None,
    grid_anchor_ms: float | None,
    grid_kick_corr_ms: float | None = None,
    grid_reasons: Sequence[str] = (),
    flagged_windows_s: Sequence[Sequence[float]] = (),
    downbeat_bar_origin: int | None = None,
    downbeat_status: str = "unavailable",
    downbeat_majority_share: float | None = None,
    downbeat_review_required: bool = True,
    failures: Mapping[str, str] | None = None,
    exported: bool = False,
    excluded: bool = False,
) -> dict[str, Any]:
    """Construct a single per-track versioned engine-result record."""
    if grid_status not in VALID_GRID_STATUSES:
        raise ValueError(f"invalid grid_status {grid_status!r}")

    kr = key_resolution or {}
    eff_key = kr.get("effective")
    eff_origin = kr.get("effective_origin")
    layers = kr.get("layers") or {"manual": None, "imported": None, "predicted": None}
    sel_pred = kr.get("selected_prediction")
    backend = sel_pred.get("backend") if sel_pred else None
    prov = _key_provenance_text(eff_origin, layers, sel_pred)

    failures_dict = dict(failures or {})
    flagged_list = [[float(w[0]), float(w[1])] for w in flagged_windows_s]
    reasons_list = [str(r) for r in grid_reasons]

    # Assemble interpretable review reasons across beats, tempo, downbeat, and key (no invented probabilities)
    review_items: list[dict[str, Any]] = []
    if grid_status in ("needs_review", "rejected", "failed"):
        review_items.append({
            "area": "beats",
            "reason": "beat grid not accepted as a constant grid" if grid_status != "failed" else "rhythm analysis failed",
            "detail": reasons_list,
        })
    elif grid_decision == "accept_with_gaps":
        review_items.append({
            "area": "beats",
            "reason": f"gridcheck accepted audio-tempo grid with {len(flagged_list)} flagged local window(s)",
            "flagged_windows_s": flagged_list,
            "detail": reasons_list,
        })
    elif grid_decision == "accept_audio_grid":
        review_items.append({
            "area": "beats",
            "reason": "gridcheck recovered audio-tempo grid after production slope rejection (bar origin not validated by gridcheck)",
            "detail": reasons_list,
        })
    elif flagged_list:
        review_items.append({
            "area": "beats",
            "reason": "isolated model beat glitches present on accepted grid",
            "flagged_windows_s": flagged_list,
        })

    if tempo_disagree_bpm is not None and abs(tempo_disagree_bpm) > 0.25:
        review_items.append({
            "area": "tempo",
            "reason": "model slope differs from Fourier tempo",
            "value_bpm": round(float(tempo_disagree_bpm), 3),
            "limit_bpm": 0.25,
        })

    if grid_status in ("accepted", "accepted_with_warnings") or grid_source == "fourier_fallback_unaccepted":
        if downbeat_majority_share is not None and downbeat_majority_share < RV.LIMITS["downbeat_majority_share_min"]:
            review_items.append({
                "area": "downbeat",
                "reason": "bar phase unstable",
                "value": round(float(downbeat_majority_share), 4),
                "limit": RV.LIMITS["downbeat_majority_share_min"],
            })
        elif downbeat_review_required and downbeat_status != "manual":
            review_items.append({
                "area": "downbeat",
                "reason": f"downbeat/bar origin requires review ({downbeat_status})",
            })

    for item in (key_review_items or ()):
        review_items.append(dict(item))

    for stage_name, err_msg in failures_dict.items():
        if not any(r.get("area") == "key" and stage_name in str(r.get("reason", "")) for r in review_items):
            review_items.append({"area": stage_name, "reason": f"stage failed: {stage_name}", "detail": err_msg})

    non_info_reviews = [r for r in review_items if r.get("area") != "info"]

    blocking_reasons: list[str] = []
    warning_reasons: list[str] = []

    if grid_status == "failed" or ("rhythm" in failures_dict) or ("audio" in failures_dict):
        eligible = False
        tier = "failed"
        blocking_reasons.extend(reasons_list or [f"{k}: {v}" for k, v in failures_dict.items()])
    elif grid_status in ("needs_review", "rejected"):
        eligible = False
        tier = "unresolved_needs_review"
        blocking_reasons.extend(reasons_list or ["beat grid is not accepted and has no manual override"])
    else:
        eligible = True
        if grid_decision in ("accept_audio_grid", "accept_with_gaps"):
            warning_reasons.extend(reasons_list)
        if flagged_list:
            warning_reasons.append(f"flagged beat window(s): {flagged_list}")
        if downbeat_review_required:
            warning_reasons.append(f"downbeat review required: {downbeat_status}")
        for r in non_info_reviews:
            if r["area"] == "key":
                warning_reasons.append(r["reason"])
        if grid_status == "accepted_with_warnings" or warning_reasons:
            tier = "accepted_with_warnings"
        else:
            tier = "accepted_clean"

    # Deduplicate while preserving order
    warning_reasons = list(dict.fromkeys(warning_reasons))
    blocking_reasons = list(dict.fromkeys(blocking_reasons))

    return {
        "track_identity": {
            "filename": filename,
            "source_path": str(Path(source_path).resolve()),
            "sha256": sha256,
            "duration_s": round(float(duration_s), 3),
            "sample_rate": int(sample_rate),
        },
        "bpm": {
            "value": round(float(bpm_value), 3) if bpm_value is not None else None,
            "source": bpm_source,
            "model_slope_bpm": round(float(model_slope_bpm), 3) if model_slope_bpm is not None else None,
            "tempo_disagree_bpm": round(float(tempo_disagree_bpm), 3) if tempo_disagree_bpm is not None else None,
        },
        "key": {
            "effective": dict(eff_key) if eff_key else None,
            "origin": eff_origin,
            "provenance": prov,
            "backend": backend,
            "layers": {
                "manual": layers.get("manual"),
                "imported": layers.get("imported"),
                "predicted": layers.get("predicted"),
            },
        },
        "grid": {
            "status": grid_status,
            "decision": grid_decision,
            "source": grid_source,
            "bpm": round(float(grid_bpm), 3) if grid_bpm is not None else None,
            "anchor_ms": round(float(grid_anchor_ms), 6) if grid_anchor_ms is not None else None,
            "kick_corr_ms": round(float(grid_kick_corr_ms), 3) if grid_kick_corr_ms is not None else None,
            "reasons": reasons_list,
            "flagged_windows_s": flagged_list,
        },
        "downbeat": {
            "bar_origin": int(downbeat_bar_origin) if downbeat_bar_origin is not None else None,
            "status": downbeat_status,
            "majority_share": round(float(downbeat_majority_share), 4) if downbeat_majority_share is not None else None,
            "review_required": bool(downbeat_review_required),
        },
        "review_reasons": review_items,
        "flagged_windows_s": flagged_list,
        "failures": failures_dict,
        "export_eligibility": {
            "eligible": bool(eligible),
            "tier": tier,
            "exported": bool(exported),
            "excluded": bool(excluded),
            "blocking_reasons": blocking_reasons,
            "warning_reasons": warning_reasons,
        },
    }


def build_engine_report(
    tracks: Mapping[str, dict[str, Any]],
    *,
    policy: Mapping[str, Any],
    export_status: str,
    playlists_requested: Mapping[str, Sequence[str]],
    playlists_exported: Mapping[str, Sequence[str]],
    excluded_tracks: Sequence[str] = (),
    analysis_version: str = ANALYSIS_VERSION,
) -> dict[str, Any]:
    """Build the top-level versioned engine-result report."""
    if export_status not in VALID_EXPORT_STATUSES:
        raise ValueError(f"invalid export_status {export_status!r}")

    tiers = [t["export_eligibility"]["tier"] for t in tracks.values()]
    exported_count = sum(1 for t in tracks.values() if t["export_eligibility"]["exported"])
    eligible_count = sum(1 for t in tracks.values() if t["export_eligibility"]["eligible"])

    return {
        "contract_version": ENGINE_CONTRACT_VERSION,
        "analysis_version": analysis_version,
        "policy": dict(policy),
        "summary": {
            "total_selected": len(tracks),
            "eligible_count": eligible_count,
            "accepted_clean_count": sum(1 for x in tiers if x == "accepted_clean"),
            "accepted_with_warnings_count": sum(1 for x in tiers if x == "accepted_with_warnings"),
            "unresolved_count": sum(1 for x in tiers if x == "unresolved_needs_review"),
            "failed_count": sum(1 for x in tiers if x == "failed"),
            "exported_count": exported_count,
            "excluded_tracks": list(excluded_tracks),
            "export_status": export_status,
            "playlists_requested": {k: list(v) for k, v in playlists_requested.items()},
            "playlists_exported": {k: list(v) for k, v in playlists_exported.items()},
        },
        "tracks": dict(tracks),
    }


def validate_engine_report(report: Mapping[str, Any]) -> list[str]:
    """Validate an engine-result report against the versioned contract schema and invariants. Returns a list of errors (empty = valid)."""
    errors: list[str] = []
    if report.get("contract_version") != ENGINE_CONTRACT_VERSION:
        errors.append(f"unexpected contract_version: {report.get('contract_version')!r}")
    if not report.get("analysis_version"):
        errors.append("missing analysis_version")
    if not isinstance(report.get("policy"), Mapping):
        errors.append("missing or invalid policy mapping")
    summary = report.get("summary")
    if not isinstance(summary, Mapping):
        errors.append("missing or invalid summary mapping")
        return errors
    if summary.get("export_status") not in VALID_EXPORT_STATUSES:
        errors.append(f"invalid summary.export_status: {summary.get('export_status')!r}")

    tracks = report.get("tracks")
    if not isinstance(tracks, Mapping):
        errors.append("missing or invalid tracks mapping")
        return errors

    if summary.get("total_selected") != len(tracks):
        errors.append(f"summary.total_selected ({summary.get('total_selected')}) != len(tracks) ({len(tracks)})")

    for name, tr in tracks.items():
        ident = tr.get("track_identity") or {}
        if ident.get("filename") != name:
            errors.append(f"{name}: track_identity.filename mismatch ({ident.get('filename')!r})")
        if not ident.get("sha256") or len(str(ident.get("sha256"))) != 64:
            errors.append(f"{name}: invalid track_identity.sha256")

        for section in ("bpm", "key", "grid", "downbeat", "export_eligibility"):
            if not isinstance(tr.get(section), Mapping):
                errors.append(f"{name}: missing section {section!r}")

        grid = tr.get("grid") or {}
        g_status = grid.get("status")
        if g_status not in VALID_GRID_STATUSES:
            errors.append(f"{name}: invalid grid.status {g_status!r}")
        if g_status in ("needs_review", "rejected", "failed") and grid.get("source") != "fourier_fallback_unaccepted":
            if grid.get("anchor_ms") is not None:
                errors.append(f"{name}: unaccepted grid ({g_status}) must not carry an anchor_ms ({grid.get('anchor_ms')})")

        elig = tr.get("export_eligibility") or {}
        tier = elig.get("tier")
        if tier not in VALID_ELIGIBILITY_TIERS:
            errors.append(f"{name}: invalid export_eligibility.tier {tier!r}")
        if not elig.get("eligible") and not elig.get("blocking_reasons") and grid.get("source") != "fourier_fallback_unaccepted":
            errors.append(f"{name}: ineligible track must list blocking_reasons")
        if tier == "accepted_with_warnings" and not elig.get("warning_reasons"):
            errors.append(f"{name}: accepted_with_warnings track must list warning_reasons")
        if tier == "accepted_clean" and elig.get("warning_reasons"):
            errors.append(f"{name}: accepted_clean track must not have warning_reasons")

        # Ensure no invented probability or confidence percentage strings appear in review_reasons
        for rev in tr.get("review_reasons") or ():
            txt = str(rev).lower()
            if "confidence_pct" in txt or "probability" in txt:
                errors.append(f"{name}: invented probability/confidence field in review_reasons: {rev}")

    return errors
