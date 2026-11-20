#!/usr/bin/env python3
"""Reproducible runner for the experimental opt-in grid decision (`set2go.analysis.gridcheck`) using SAVED RAW PREDICTIONS ONLY.

    .venv/bin/python scripts/analysis_gridcheck_eval.py [--out eval/analysis/blind1/gridcheck_eval_v2.json]

Rules enforced by this runner:
  * Verifies `eval/analysis/blind1/predictions_RAW.json` against `eval/analysis/blind1/RAW_SEAL.json` before reading.
  * Never decodes audio, never runs Beat This!, and never accesses tags or external devices.
  * Refuses to overwrite sealed predictions or the historical `eval/analysis/blind1/gridcheck_experiment.json` report.
  * Labels blind batch 1 explicitly as USED DEVELOPMENT / REGRESSION DATA (not independent validation).
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))
_STANDALONE = Path(os.environ.get("SET2GO_STANDALONE_DIR", "/Users/andresherrera/Developer/Set2Go"))

from set2go import rhythm as Rh
from set2go.analysis import gridcheck as G, metrics as M

B1 = ROOT / "eval/analysis/blind1"
if not B1.exists() and (_STANDALONE / "eval/analysis/blind1").exists():
    B1 = _STANDALONE / "eval/analysis/blind1"
DEFAULT_OUT = B1 / "gridcheck_eval_v2.json"
PROTECTED_FILES = {
    (B1 / "predictions_RAW.json").resolve(),
    (B1 / "RAW_SEAL.json").resolve(),
    (B1 / "derived.json").resolve(),
    (B1 / "comparison.json").resolve(),
    (B1 / "comparison_rekordbox.json").resolve(),
    (B1 / "gridcheck_experiment.json").resolve(),
}


def _sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def run_eval(batch_dir: Path = B1, out_path: Path = DEFAULT_OUT, dataset_status: str | None = None) -> dict:
    seal_path = batch_dir / "RAW_SEAL.json"
    raw_path = batch_dir / "predictions_RAW.json"
    rb_path = batch_dir / "rekordbox_refs.json"
    seal = json.loads(seal_path.read_text())
    actual_sha = _sha256(raw_path)
    if actual_sha != seal["sha256"]:
        raise RuntimeError(f"predictions_RAW.json sha256 {actual_sha} != RAW_SEAL.json {seal['sha256']}")

    raw = json.loads(raw_path.read_text())
    rb_linked = json.loads(rb_path.read_text())["linked"] if rb_path.exists() else {}
    der_path = batch_dir / "derived.json"
    der_tracks = json.loads(der_path.read_text()).get("tracks", {}) if der_path.exists() else {}

    code_files = [
        "src/set2go/analysis/gridcheck.py",
        "src/set2go/rhythm.py",
        "scripts/analysis_gridcheck_eval.py",
        "scripts/analysis_gridcheck_synthetic.py",
        "tests/test_analysis_gridcheck.py",
    ]
    code_hashes = {rel: _sha256(ROOT / rel) for rel in code_files if (ROOT / rel).exists()}

    tracks_out = {}
    for name, tr in raw["tracks"].items():
        st = tr["stages"]
        bpm = float(st["tempo"]["fourier_bpm"])
        dur_s = float(st["tempo"]["audio_seconds"])
        beats = list(st["beat_this"]["beats"])
        downbeats = list(st["beat_this"]["downbeats"])

        mr = Rh.ModelRaw(beats, downbeats, float(st["beat_this"].get("model_seconds", 0.0)),
                         float(st["beat_this"].get("model_peak_rss_mb", 0.0)), "")
        cons = Rh.check_consistency(mr, bpm)
        dec = G.evaluate(beats, bpm, production_status=cons.status, model_slope_bpm=cons.model_slope_bpm, duration_s=dur_s)
        forced = G.evaluate(beats, bpm, production_status="inconsistent", model_slope_bpm=cons.model_slope_bpm, duration_s=dur_s)
        meas_src = dec if cons.status != "consistent" else forced

        after_rb = None
        if name in rb_linked:
            r = rb_linked[name]
            rt = np.asarray(r["beat_times_s"], float)
            per = 60.0 / float(r["median_tempo_bpm"])
            per_our = 60.0 / bpm
            prod_anchor = der_tracks.get(name, {}).get("rhythm", {}).get("anchor_s")
            if dec.outcome == "production_accept" and prod_anchor is not None:
                a0 = float(prod_anchor)
                grid = a0 + np.arange(int((dur_s - a0) / per_our)) * per_our
                grid_src = "unchanged_production_grid"
            else:
                ph = float(meas_src.phase_s) % per_our
                grid = ph + np.arange(int((dur_s - ph) / per_our)) * per_our
                grid_src = "experimental_audio_period_grid" if dec.outcome in ("accept_audio_grid", "accept_with_gaps") else "diagnostic_hypothetical_unaccepted_grid"
            tm = M.beat_timing(grid, rt, per)
            after_rb = {
                "grid_source": grid_src,
                "offset_ms_start": round(float(tm["offset_ms_start"]), 2),
                "offset_ms_mid": round(float(tm["offset_ms_mid"]), 2),
                "offset_ms_end": round(float(tm["offset_ms_end"]), 2),
                "drift_ms": round(float(tm["drift_ms"]), 2),
                "f_measure": round(float(tm["f_measure"]), 4),
            }

        tracks_out[name] = {
            "production": {
                "decision": cons.status,
                "reasons": cons.reasons,
                "model_slope_bpm": round(cons.model_slope_bpm, 3),
                "tempo_disagree_bpm": round(cons.tempo_disagree_bpm, 3),
            },
            "revision": {
                "decision": dec.outcome,
                "reasons": dec.reasons,
                "bad_windows_s": [list(w) for w in dec.bad_windows_s],
                "slope_explained": dec.slope_explained,
                "slope_check": dec.detail.get("slope_check", {}),
                "drift_budget": {
                    "duration_s": meas_src.detail.get("duration_s"),
                    "ramp_ms_per_min": round(meas_src.ramp_ms_per_min, 2),
                    "ramp_total_ms_over_track": meas_src.detail.get("ramp_total_ms_over_track"),
                    "ramp_limit_ms_per_min": meas_src.detail.get("ramp_limit_ms_per_min"),
                    "max_total_drift_ms": meas_src.detail.get("max_total_drift_ms"),
                    "max_tempo_error_bpm": meas_src.detail.get("max_tempo_error_bpm"),
                    "estimator_resolution_drift_ms": meas_src.detail.get("estimator_resolution_drift_ms"),
                },
            },
            "measures": {
                "fit": round(meas_src.fit_fraction, 4),
                "coverage": round(meas_src.coverage, 4),
                "ramp_ms_per_min": round(meas_src.ramp_ms_per_min, 2),
                "median_abs_residual_ms": round(meas_src.median_abs_residual_ms, 1),
                "missing_slots": meas_src.n_missing_slots,
                "extra_beats": meas_src.n_extra_beats,
            },
            "after_the_fact_vs_rekordbox": after_rb,
        }

    rel_raw = str(raw_path.relative_to(ROOT)) if raw_path.is_relative_to(ROOT) else str(raw_path)
    rel_seal = str(seal_path.relative_to(ROOT)) if seal_path.is_relative_to(ROOT) else str(seal_path)
    rel_out = str(out_path.relative_to(ROOT)) if out_path.is_relative_to(ROOT) else str(out_path)
    rel_batch = str(batch_dir.relative_to(ROOT)) if batch_dir.is_relative_to(ROOT) else str(batch_dir)
    if dataset_status is None:
        if batch_dir.resolve() == B1.resolve():
            dataset_status = (
                "USED DEVELOPMENT / REGRESSION DATA (blind batch 1, 5 tracks). FYRE and Eyes Low motivated and refined this "
                "experiment after their sealed predictions and references were inspected; results on this batch are regression "
                "checks, NOT independent validation."
            )
        else:
            dataset_status = f"BLIND EVALUATION ({rel_batch}, {len(tracks_out)} tracks; evaluated from sealed raw predictions before any reference comparison)."

    repro_cmd = (
        f".venv/bin/python scripts/analysis_gridcheck_eval.py --out {rel_out}"
        if batch_dir.resolve() == B1.resolve()
        else f".venv/bin/python scripts/analysis_gridcheck_eval.py --batch-dir {rel_batch} --out {rel_out}"
    )

    return {
        "experiment": "set2go.analysis.gridcheck (opt-in revision of the rejected-grid decision; production gate unchanged)",
        "dataset_status": dataset_status,
        "reproduction_command": repro_cmd,
        "inputs": {
            "raw_predictions": rel_raw,
            "raw_seal": rel_seal,
            "raw_predictions_sha256": actual_sha,
            "rekordbox_reference_comparison": (
                f"{rb_path.relative_to(ROOT)} (used only for after_the_fact_vs_rekordbox)"
                if rb_path.exists() and rb_path.is_relative_to(ROOT)
                else "none (reference comparison not run yet)"
            ),
            "audio_decoded_during_eval": False,
        },
        "code_hashes_sha256": code_hashes,
        "experimental_config": {
            "FIT_MS": G.FIT_MS,
            "MODEL_FRAME_MS": G.MODEL_FRAME_MS,
            "TEMPO_RESOLUTION_BPM": G.TEMPO_RESOLUTION_BPM,
            "MIN_FIT_FRACTION": G.MIN_FIT_FRACTION,
            "WINDOW_S": G.WINDOW_S,
            "MIN_WINDOW_FIT": G.MIN_WINDOW_FIT,
            "MAX_BAD_WINDOW_FRACTION": G.MAX_BAD_WINDOW_FRACTION,
            "MAX_WINDOW_OFFSET_MS": G.MAX_WINDOW_OFFSET_MS,
            "MAX_TOTAL_DRIFT_MS": G.MAX_TOTAL_DRIFT_MS,
            "MAX_RAMP_MS_PER_MIN": G.MAX_RAMP_MS_PER_MIN,
            "MIN_COVERAGE": G.MIN_COVERAGE,
            "MAX_MISSING_RUN": G.MAX_MISSING_RUN,
            "SLOPE_LIMIT_BPM": G.SLOPE_LIMIT_BPM,
            "EXPLAIN_MIN_RATIO": G.EXPLAIN_MIN_RATIO,
            "EXPLAIN_MAX_RATIO": G.EXPLAIN_MAX_RATIO,
        },
        "derivations_and_tradeoffs": {
            "count_explanation_rule": (
                "Over beat span `span`, the signed beat-count discrepancy implied by `slope - tempo_bpm` against the audio "
                "tempo is `implied_diff_signed = count_model - count_audio = span * (slope - tempo_bpm) / 60`. In OLS "
                "regression of beat time on beat index over [0, N], a local count change dN at relative position u in (0, 1) "
                "shifts the slope-implied count by 6*u*(1-u)*dN (same sign as dN; leverage 1.5 at midpoint u=0.5, 1.0 for "
                "uniform spread, >=0.54 for u in [0.1, 0.9]). Extra beats from short intervals (<0.6*own) are counted per "
                "contiguous short-interval run as `max(len(run) - round(sum(ibi[run]) / per), 1)` so a 50/50 split of one "
                "period into two half-beat intervals counts as +1 extra beat (not +2). Skipped beats in long intervals "
                "(>1.6*own) contribute `round(ibi / per) - 1`. A slope gap > 0.25 BPM is explained only when the audio-indexed "
                "ramp is small AND `local_net = split - skipped` has the SAME SIGN as `implied_diff_signed` AND "
                "`0.5 * |implied_diff_signed| <= |local_net| <= 2.0 * |implied_diff_signed|` (with |local_net| >= 1 and "
                "|implied_diff_signed| >= 0.5). Otherwise returns needs_review."
            ),
            "duration_aware_drift_criterion": (
                "A median-anchored grid with total end-to-end drift D_total shifts track ends by +-0.5*D_total. Reserving "
                "one full Beat This! frame (MODEL_FRAME_MS = 20 ms) inside MAX_WINDOW_OFFSET_MS = 35 ms bounds the one-sided "
                "end displacement to 15 ms, giving MAX_TOTAL_DRIFT_MS = 30.0 ms end-to-end (matching rhythm.MAX_BEAT_RESIDUAL_MS "
                "and keeping end beats with +-20 ms frame error inside FIT_MS = 40 ms so inliers are not clipped). The ramp "
                "limit is `min(25.0, 30.0 / (duration_s / 60))` ms/min, corresponding to a maximum tolerable tempo error of "
                "`tempo_bpm * ramp_limit / 60000` BPM. Tradeoff: a 0.005 BPM tempogram step passes on standard 5 min tracks "
                "(~11.7 ms drift at 128 BPM) but is NOT assumed to always pass; on tracks longer than `6 * tempo_bpm` seconds "
                "(~12.8 min at 128 BPM, 12.0 min at 120 BPM) a 0.005 BPM error exceeds 30 ms and is flagged as needs_review."
            ),
        },
        "limitations": [
            "Blind batch 1 (5 tracks) is used development/regression data, not independent validation; a fresh blind batch is required before any production adoption.",
            "Isolated Experimental module: not imported by `set2go.rhythm`, `set2go.export`, or any production CLI.",
            "Only local odd-interval count errors (<0.6x or >1.6x period) are counted in `local_net`; scattered missing/extra beats without odd intervals (e.g. displaced off-grid beats on FYRE) remain unexplained and return `needs_review` by design.",
            "Does not validate or stabilize bar origin (downbeat phase): accepting a beat grid (`accept_with_gaps` on Eyes Low) leaves an unstable model downbeat phase flagged for review.",
            "Cumulative drift up to 30.0 ms end-to-end (+-15.0 ms at track ends, ~0.0128 BPM on a 5 min 128 BPM track) is tolerated when all other checks pass.",
        ],
        "tracks": tracks_out,
    }


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, allow_abbrev=False)
    ap.add_argument("--batch-dir", type=Path, default=B1, help="Evaluation batch directory containing predictions_RAW.json and RAW_SEAL.json")
    ap.add_argument("--out", type=Path, default=DEFAULT_OUT, help="Output JSON report path (must not overwrite historical/sealed files)")
    ap.add_argument("--dataset-status", type=str, default=None, help="Optional explicit dataset status string")
    args = ap.parse_args(argv)
    out_resolved = args.out.resolve()
    batch_protected = {
        (args.batch_dir / "predictions_RAW.json").resolve(),
        (args.batch_dir / "RAW_SEAL.json").resolve(),
    }
    if out_resolved in PROTECTED_FILES or out_resolved in batch_protected:
        print(f"error: refusing to overwrite protected historical/sealed file {args.out}", file=sys.stderr)
        return 2
    report = run_eval(batch_dir=args.batch_dir, out_path=args.out, dataset_status=args.dataset_status)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(report, indent=1) + "\n")
    print(f"wrote {args.out} ({len(report['tracks'])} tracks; seal verified)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
