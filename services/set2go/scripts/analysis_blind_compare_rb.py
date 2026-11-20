#!/usr/bin/env python3
"""Blind batch: sealed predictions + Mixed In Key vs the rekordbox reference grid read from the post-export evidence. Writes comparison_rekordbox.json only.
    .venv/bin/python scripts/analysis_blind_compare_rb.py [--batch-dir eval/analysis/blind1] [--playlist "RekordSOS Blind Reference"] [--pdb <export.pdb>]
Refuses to run if comparison_rekordbox.json already exists or if predictions_RAW.json no longer matches RAW_SEAL.json.
rekordbox's PQTZ beat NUMBER 1 is rekordbox's downbeat; its first beat is not always number 1."""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))
from set2go import rhythm as Rh
from set2go.analysis import gridcheck as G, metrics as M

B1 = ROOT / "eval/analysis/blind1"


def _quarter_timing(est_s: np.ndarray, ref_s: np.ndarray, period_s: float) -> list[dict]:
    """Signed offset medians (est - ref, ms), MAD (ms), and matched count in each of the 4 time quarters of the reference span."""
    est_s, ref_s = np.asarray(est_s, float), np.asarray(ref_s, float)
    win = min(0.5 * period_s, 0.25)
    ie, jr = M.match_beats(est_s, ref_s, win)
    if len(ie) == 0:
        return []
    off = (est_s[ie] - ref_s[jr]) * 1000.0
    t = ref_s[jr]
    lo, hi = float(t.min()), float(t.max())
    out = []
    for q in range(4):
        a = lo + (hi - lo) * q / 4.0
        b = lo + (hi - lo) * (q + 1) / 4.0
        m = (t >= a) & (t <= b if q == 3 else t < b)
        if m.any():
            sub = off[m]
            med = float(np.median(sub))
            out.append({
                "quarter": q + 1,
                "t0_s": round(a, 2),
                "t1_s": round(b, 2),
                "matched": int(m.sum()),
                "offset_ms_median": round(med, 3),
                "mad_ms": round(float(np.median(np.abs(sub - med))), 3),
            })
        else:
            out.append({"quarter": q + 1, "t0_s": round(a, 2), "t1_s": round(b, 2), "matched": 0, "offset_ms_median": None, "mad_ms": None})
    return out


def _window_timing(est_s: np.ndarray, ref_s: np.ndarray, period_s: float, windows: list[list[float]], tol_s: float = 0.070) -> list[dict]:
    """Beat timing inside each [t0, t1] window against reference beats in [t0, t1]."""
    est_s, ref_s = np.asarray(est_s, float), np.asarray(ref_s, float)
    win = min(0.5 * period_s, 0.25)
    out = []
    for w in windows:
        t0, t1 = float(w[0]), float(w[1])
        eb = est_s[(est_s >= t0) & (est_s <= t1)]
        rb = ref_s[(ref_s >= t0) & (ref_s <= t1)]
        ie, jr = M.match_beats(eb, rb, win)
        if len(ie) > 0:
            off = (eb[ie] - rb[jr]) * 1000.0
            med = float(np.median(off))
            hit = int((np.abs(off) <= tol_s * 1000.0).sum())
            prec = hit / max(len(eb), 1)
            rec = hit / max(len(rb), 1)
            f1 = 2 * prec * rec / (prec + rec) if (prec + rec) else 0.0
            out.append({
                "window_s": [t0, t1],
                "est_beats_in_window": int(len(eb)),
                "ref_beats_in_window": int(len(rb)),
                "matched": int(len(ie)),
                "offset_ms_median": round(med, 3),
                "mad_ms": round(float(np.median(np.abs(off - med))), 3),
                "max_abs_offset_ms": round(float(np.max(np.abs(off))), 3),
                "f_measure_70ms": round(float(f1), 4),
            })
        else:
            out.append({
                "window_s": [t0, t1],
                "est_beats_in_window": int(len(eb)),
                "ref_beats_in_window": int(len(rb)),
                "matched": 0,
                "offset_ms_median": None,
                "mad_ms": None,
                "max_abs_offset_ms": None,
                "f_measure_70ms": 0.0,
            })
    return out


def _raw_downbeat_numbers(bts: np.ndarray, dbs: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    num = np.zeros(len(bts), int)
    idx = np.searchsorted(bts, dbs - 1e-6)
    marks = np.full(len(bts), -1)
    for i in idx:
        if 0 <= i < len(bts):
            marks[i] = 1
    cur = 0
    for i in range(len(bts)):
        cur = 1 if marks[i] == 1 else (cur % 4 + 1 if cur else 0)
        num[i] = cur
    ok = num > 0
    return bts[ok], num[ok]


def _majority_bar_origin_for_grid(grid: np.ndarray, dbs: np.ndarray, per: float) -> tuple[int, float]:
    """Majority bar origin (1..4) of raw model downbeats projected onto a constant grid."""
    anchor = float(grid[0])
    ph = np.round((dbs - anchor) / per).astype(int) % 4
    counts = np.bincount(ph, minlength=4)
    maj = int(counts.argmax())
    share = float(counts[maj] / max(counts.sum(), 1))
    bar_origin = (1 - maj) % 4 or 4
    return bar_origin, share


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, allow_abbrev=False)
    ap.add_argument("--batch-dir", type=Path, default=B1)
    ap.add_argument("--playlist", type=str, default=None)
    ap.add_argument("--pdb", type=Path, default=None)
    args = ap.parse_args(argv)

    bdir = args.batch_dir.resolve()
    pdb_path = args.pdb.resolve() if args.pdb is not None else None
    out_path = bdir / "comparison_rekordbox.json"
    if out_path.exists():
        raise SystemExit(f"{out_path} already exists: refusing to overwrite existing comparison")

    seal = json.loads((bdir / "RAW_SEAL.json").read_text())
    raw_bytes = (bdir / "predictions_RAW.json").read_bytes()
    assert hashlib.sha256(raw_bytes).hexdigest() == seal["sha256"], "sealed predictions changed"
    raw = json.loads(raw_bytes)
    cfg_path = bdir / "FROZEN_CONFIG.json"
    cfg_sha = hashlib.sha256(cfg_path.read_bytes()).hexdigest()
    assert cfg_sha == raw.get("frozen_config_sha256", cfg_sha), "FROZEN_CONFIG.json changed after predictions"

    inv = json.loads((bdir / "inventory.json").read_text())
    inv_by_pcm = {f["decoded_pcm_sha256"]: f for f in inv["files"]}
    der = json.loads((bdir / "derived.json").read_text())["tracks"]
    rb_doc = json.loads((bdir / "rekordbox_refs.json").read_text())
    rb = rb_doc["linked"]
    mik = json.loads((bdir / "comparison.json").read_text())["tracks"]

    pl_name = args.playlist or ("RekordSOS Blind Reference" if bdir.resolve() == B1.resolve() else "RekordSOS Blind Reference 2")
    pdb_info = None
    if pdb_path is not None and pdb_path.is_file():
        from rekordbox_pdb.pdb import Database
        db = Database.from_file(pdb_path)
        tracks_by_id = {t.id: t for t in db.tracks}
        keys_by_id = {k.id: k.name for k in db.keys}
        tree = {n.id: n.name for n in db.playlist_tree}
        pl_ids = [pid for pid, name in tree.items() if name == pl_name]
        if len(pl_ids) != 1:
            raise SystemExit(f"Expected 1 playlist named {pl_name!r}, found {pl_ids}")
        pl_id = pl_ids[0]
        ents = sorted((e for e in db.playlist_entries if e.playlist_id == pl_id), key=lambda e: e.entry_index)
        if len(ents) != len(inv["files"]):
            raise SystemExit(f"Playlist {pl_name!r} has {len(ents)} entries, expected {len(inv['files'])}")
        excluded_playlists = {
            name: len([e for e in db.playlist_entries if e.playlist_id == pid])
            for pid, name in tree.items()
            if pid != pl_id
        }
        pl_entries = []
        for e in ents:
            tr = tracks_by_id[e.track_id]
            pl_entries.append({
                "entry_index": e.entry_index,
                "track_id": tr.id,
                "title": tr.title,
                "device_path": tr.file_path,
                "pdb_tempo_bpm": round(tr.tempo / 100.0, 2) if tr.tempo else None,
                "pdb_key_imported_from_tag": keys_by_id.get(tr.key_id),
            })
        pdb_info = {
            "pdb_path": str(pdb_path.relative_to(ROOT)) if pdb_path.is_relative_to(ROOT) else str(pdb_path),
            "pdb_sha256": hashlib.sha256(pdb_path.read_bytes()).hexdigest(),
            "target_playlist_id": pl_id,
            "target_playlist_name": pl_name,
            "target_playlist_entry_count": len(ents),
            "one_to_one_linked_by_decoded_pcm": len(rb) == len(inv["files"]) == len(ents),
            "excluded_other_playlists": excluded_playlists,
            "excluded_unlinked_track_count": len(rb_doc.get("unlinked", [])),
            "entries": pl_entries,
            "key_note": "rekordbox PDB keys are imported from the embedded TKEY/GEOB tags, NOT an independent key analysis by rekordbox.",
        }

    tolerances = {
        "tempo_exact_tol_bpm": 0.5,
        "beat_match_window_s": "min(0.5 * period_s, 0.25)",
        "beat_f_measure_tol_ms": 70.0,
        "accepted_grid_offset_limit_ms": G.MAX_WINDOW_OFFSET_MS,
        "accepted_grid_drift_limit_ms": G.MAX_TOTAL_DRIFT_MS,
        "accepted_grid_min_f_measure": 0.99,
        "bar_origin_agreement": "majority_shift_beats == 0 against rekordbox PQTZ beat_number == 1 (evaluated separately from beat timing)",
    }

    tracks_out = {}
    prod_accepted = []
    exp_accepted = []
    prod_false_accepts = []
    exp_false_accepts = []

    for name, t in raw["tracks"].items():
        r = rb[name]
        rt = np.array(r["beat_times_s"], float)
        rn = np.array(r["beat_numbers"], int)
        d = der[name]
        st = t["stages"]
        bpm = float(d["tempo"]["bpm"])
        per_rb = 60.0 / float(r["median_tempo_bpm"])
        per_our = 60.0 / bpm
        dur = float(st["tempo"]["audio_seconds"])
        bts = np.array(st["beat_this"]["beats"], float)
        dbs = np.array(st["beat_this"]["downbeats"], float)

        mr = Rh.ModelRaw(list(bts), list(dbs), float(st["beat_this"].get("model_seconds", 0.0)),
                         float(st["beat_this"].get("model_peak_rss_mb", 0.0)), "")
        cons = Rh.check_consistency(mr, bpm)
        gdec = G.evaluate(list(bts), bpm, production_status=cons.status, model_slope_bpm=cons.model_slope_bpm, duration_s=dur)

        row = {
            "rekordbox": {
                "tempo": r["median_tempo_bpm"],
                "n_beats": r["n_beats"],
                "first_beat_s": r["first_beat_s"],
                "last_beat_s": r["last_beat_s"],
                "first_beat_number": r["first_beat_number"],
                "tempo_changes": r["tempo_changes"],
            },
            "bpm_vs_rekordbox": {
                "tempogram": M.bpm_metrics(bpm, r["median_tempo_bpm"]),
                "beat_this_slope": M.bpm_metrics(d["rhythm"]["model_slope_bpm"], r["median_tempo_bpm"]),
                "mik_tempo_bpm": mik[name]["mik"]["tempo"],
            },
            "production_outcome": {
                "status": d["rhythm"]["phase_status"],
                "accepted": d["rhythm"].get("anchor_s") is not None,
                "reasons": d["rhythm"]["reasons"],
            },
            "experimental_gridcheck_outcome": {
                "decision": gdec.outcome,
                "accepted": gdec.outcome in ("production_accept", "accept_audio_grid", "accept_with_gaps"),
                "grid_source": (
                    "unchanged_production_grid"
                    if gdec.outcome == "production_accept"
                    else ("experimental_audio_period_grid" if gdec.outcome in ("accept_audio_grid", "accept_with_gaps") else "none_refused_needs_review")
                ),
                "reasons": gdec.reasons,
                "bad_windows_s": [list(w) for w in gdec.bad_windows_s],
                "slope_explained": gdec.slope_explained,
            },
            "timing": {},
            "downbeat": {},
            "flagged_windows_vs_rekordbox": [],
            "diagnostic_hypothetical_unaccepted_grid": None,
        }

        # 1. Production constant grid (when accepted by production)
        if d["rhythm"].get("anchor_s") is not None:
            a0 = float(d["rhythm"]["anchor_s"])
            ours = a0 + np.arange(int((dur - a0) / per_our)) * per_our
            onum = (int(d["rhythm"]["bar_origin"]) - 1 + np.arange(len(ours))) % 4 + 1
            tm_prod = M.beat_timing(ours, rt, per_rb)
            q_prod = _quarter_timing(ours, rt, per_rb)
            db_prod = M.downbeat_phase(ours, onum, rt, rn, per_rb)
            row["timing"]["our_constant_grid"] = {
                **tm_prod,
                "quarters": q_prod,
                "quarter_drift_q4_minus_q1_ms": (
                    round(q_prod[3]["offset_ms_median"] - q_prod[0]["offset_ms_median"], 3)
                    if len(q_prod) == 4 and None not in (q_prod[0]["offset_ms_median"], q_prod[3]["offset_ms_median"])
                    else None
                ),
            }
            row["downbeat"]["our_constant_grid"] = db_prod
            # Requirement 6: For production_accept cases, experimental_accepted_grid IS the unchanged production grid.
            row["timing"]["experimental_accepted_grid"] = {
                "grid_origin": "unchanged_production_grid (anchor_s + kick_corr_ms preserved verbatim)",
                **row["timing"]["our_constant_grid"],
            }
            row["downbeat"]["experimental_accepted_grid"] = {
                "grid_origin": "unchanged_production_grid",
                **db_prod,
            }
            prod_accepted.append(name)
            exp_accepted.append(name)
            if (
                abs(tm_prod["offset_ms_mid"]) > tolerances["accepted_grid_offset_limit_ms"]
                or abs(tm_prod["drift_ms"]) > tolerances["accepted_grid_drift_limit_ms"]
                or tm_prod["f_measure"] < tolerances["accepted_grid_min_f_measure"]
            ):
                prod_false_accepts.append(name)
                exp_false_accepts.append(name)

        # 2. Newly accepted experimental gridcheck grids (accept_audio_grid / accept_with_gaps)
        elif gdec.outcome in ("accept_audio_grid", "accept_with_gaps"):
            ph = float(gdec.phase_s) % per_our
            ggrid = ph + np.arange(int((dur - ph) / per_our)) * per_our
            bar_orig, maj_share = _majority_bar_origin_for_grid(ggrid, dbs, per_our)
            gnum = (bar_orig - 1 + np.arange(len(ggrid))) % 4 + 1
            tm_exp = M.beat_timing(ggrid, rt, per_rb)
            q_exp = _quarter_timing(ggrid, rt, per_rb)
            db_exp = M.downbeat_phase(ggrid, gnum, rt, rn, per_rb)
            row["timing"]["experimental_accepted_grid"] = {
                "grid_origin": f"gridcheck:{gdec.outcome} (audio-period grid at median inlier phase_s={round(ph, 6)}s; no kick shift)",
                **tm_exp,
                "quarters": q_exp,
                "quarter_drift_q4_minus_q1_ms": (
                    round(q_exp[3]["offset_ms_median"] - q_exp[0]["offset_ms_median"], 3)
                    if len(q_exp) == 4 and None not in (q_exp[0]["offset_ms_median"], q_exp[3]["offset_ms_median"])
                    else None
                ),
            }
            row["downbeat"]["experimental_accepted_grid"] = {
                "grid_origin": f"projected_majority_downbeat_on_{gdec.outcome} (bar_origin={bar_orig}, model_downbeat_majority_share={round(maj_share, 4)}; NOT validated by gridcheck)",
                "model_downbeat_majority_share": round(maj_share, 4),
                "downbeat_review_required": maj_share < 0.90,
                **db_exp,
            }
            exp_accepted.append(name)
            if (
                abs(tm_exp["offset_ms_mid"]) > tolerances["accepted_grid_offset_limit_ms"]
                or abs(tm_exp["drift_ms"]) > tolerances["accepted_grid_drift_limit_ms"]
                or tm_exp["f_measure"] < tolerances["accepted_grid_min_f_measure"]
            ):
                exp_false_accepts.append(name)

        # 3. Refused / needs_review cases: keep diagnostic hypothetical grid strictly separate from accepted outputs
        else:
            ph = float(gdec.phase_s) % per_our if gdec.phase_s is not None else 0.0
            hgrid = ph + np.arange(int((dur - ph) / per_our)) * per_our
            bar_orig, maj_share = _majority_bar_origin_for_grid(hgrid, dbs, per_our)
            hnum = (bar_orig - 1 + np.arange(len(hgrid))) % 4 + 1
            tm_hyp = M.beat_timing(hgrid, rt, per_rb)
            q_hyp = _quarter_timing(hgrid, rt, per_rb)
            db_hyp = M.downbeat_phase(hgrid, hnum, rt, rn, per_rb)
            row["diagnostic_hypothetical_unaccepted_grid"] = {
                "note": "DIAGNOSTIC ONLY — NOT AN ACCEPTED OUTPUT. Both production and gridcheck refused this track (needs_review).",
                "hypothetical_phase_s": round(ph, 6),
                "timing_vs_rekordbox": {
                    **tm_hyp,
                    "quarters": q_hyp,
                    "quarter_drift_q4_minus_q1_ms": (
                        round(q_hyp[3]["offset_ms_median"] - q_hyp[0]["offset_ms_median"], 3)
                        if len(q_hyp) == 4 and None not in (q_hyp[0]["offset_ms_median"], q_hyp[3]["offset_ms_median"])
                        else None
                    ),
                },
                "downbeat_vs_rekordbox": {
                    "projected_bar_origin": bar_orig,
                    "model_downbeat_majority_share": round(maj_share, 4),
                    **db_hyp,
                },
            }

        # 4. Raw Beat This! timing and downbeats across track and by quarter
        tm_raw = M.beat_timing(bts, rt, per_rb)
        q_raw = _quarter_timing(bts, rt, per_rb)
        row["timing"]["beat_this_raw"] = {
            **tm_raw,
            "quarters": q_raw,
            "quarter_drift_q4_minus_q1_ms": (
                round(q_raw[3]["offset_ms_median"] - q_raw[0]["offset_ms_median"], 3)
                if len(q_raw) == 4 and None not in (q_raw[0]["offset_ms_median"], q_raw[3]["offset_ms_median"])
                else None
            ),
        }
        bts_ok, num_ok = _raw_downbeat_numbers(bts, dbs)
        row["downbeat"]["beat_this_raw"] = M.downbeat_phase(bts_ok, num_ok, rt, rn, per_rb)

        # 5. Flagged-window timing (for any track where gridcheck flagged bad_windows_s)
        if gdec.bad_windows_s:
            w_list = [list(w) for w in gdec.bad_windows_s]
            ph_w = float(gdec.phase_s) % per_our if gdec.phase_s is not None else 0.0
            wgrid = ph_w + np.arange(int((dur - ph_w) / per_our)) * per_our
            raw_win = _window_timing(bts, rt, per_rb, w_list)
            grid_win = _window_timing(wgrid, rt, per_rb, w_list)
            for rw, gw in zip(raw_win, grid_win):
                row["flagged_windows_vs_rekordbox"].append({
                    "window_s": rw["window_s"],
                    "gridcheck_decision": gdec.outcome,
                    "beat_this_raw_in_window": rw,
                    "audio_period_grid_in_window": gw,
                })

        row["sealed_review"] = [x["reason"] for x in d["review"]]
        tracks_out[name] = row

    n_total = len(tracks_out)
    out = {
        "seal_sha256": seal["sha256"],
        "frozen_config_sha256": cfg_sha,
        "reproduction_command": (
            f".venv/bin/python scripts/analysis_blind_compare_rb.py --batch-dir {bdir.relative_to(ROOT)}"
            + (f" --playlist {pl_name!r}" if args.playlist else "")
            + (f" --pdb {pdb_path.relative_to(ROOT)}" if pdb_path and pdb_path.is_relative_to(ROOT) else "")
        ),
        "reference": (
            f"rekordbox PQTZ (analysis files of the official device export, playlist {pl_name!r}); "
            "a COMPARISON reference, NOT ground truth. rekordbox keys in export.pdb are imported from tags, not independent key analysis."
        ),
        "playlist_resolution": pdb_info,
        "comparison_tolerances": tolerances,
        "summary": {
            "n_tracks": n_total,
            "production_policy": {
                "accepted_count": len(prod_accepted),
                "accepted_coverage_fraction": round(len(prod_accepted) / max(n_total, 1), 4),
                "accepted_tracks": prod_accepted,
                "false_acceptances_under_tolerances": prod_false_accepts,
            },
            "experimental_gridcheck_policy": {
                "accepted_count": len(exp_accepted),
                "accepted_coverage_fraction": round(len(exp_accepted) / max(n_total, 1), 4),
                "accepted_unchanged_from_production": [k for k in exp_accepted if k in prod_accepted],
                "newly_accepted_tracks": [k for k in exp_accepted if k not in prod_accepted],
                "held_for_review_tracks": [k for k in tracks_out if k not in exp_accepted],
                "false_acceptances_under_tolerances": exp_false_accepts,
            },
        },
        "tracks": tracks_out,
    }
    out_path.write_text(json.dumps(out, indent=1) + "\n")
    print(f"wrote {out_path} ({n_total} tracks; seal verified)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
