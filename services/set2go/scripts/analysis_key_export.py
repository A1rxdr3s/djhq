#!/usr/bin/env python3
"""End-to-end opt-in key workflow: analyse selected files -> hash-linked provenance -> local export through the opt-in key mapping -> source manifest.

    .venv/bin/python scripts/analysis_key_export.py <out_dir> <audio_file_or_dir> [more ...] --sidecar <sidecar.json> [--predict libkeyfinder] [--essentia]
        [--playlist NAME] [--analysis-from DIR --link-audio-from DIR] [--dry-run]
    .venv/bin/python scripts/verify_export.py <out_dir> --manifest=<out_dir>_MANIFEST.json --exact          # the matching verification (any source folder)

Precedence per track: 1 valid manual override (grid_tool.py key) > 2 valid imported annotation (Mixed In Key payload/plain tag; labelled as reading metadata) >
3 the prediction of the explicitly selected backend (only with --predict; libKeyFinder; accuracy NOT established) > 4 NO key (also when the backend fails or the input is
unsupported: the failure is printed and stored). Disagreement between methods adds review reasons and never replaces a manual or imported value.
Sources are identified by resolved path + sha256 (the basename is the export's destination name): two DIFFERENT files with the same basename are refused naming both
paths; the same file selected twice is collapsed (reported). Invalid arguments fail with an error (unknown flags are not ignored). Source audio/tags are only read; the
export goes to a new local directory (never a USB). Outputs next to <out_dir>: <out>_KEYS.json, <out>_MANIFEST.json, <out>_PLAN.json. Exit 1 if any file failed to analyse, 2 on usage errors.
"""
import argparse, json, os, shutil, subprocess, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))
from set2go.analysis import ANALYSIS_VERSION, contract as C, manifest as MF, sidecar as S, workflow as W, refs as R
from set2go.export import TrackSpec, UnresolvedExportError, export_library

_progress_current_track: str | None = None


def report_progress(event: str, track_id: str | None = None) -> None:
    """Write framed progress only to the optional private parent-owned pipe."""
    global _progress_current_track
    if event == "track_started":
        _progress_current_track = track_id
    elif event in ("track_completed", "track_failed"):
        _progress_current_track = None
    fd, job_id = os.environ.get("SET2GO_PROGRESS_FD"), os.environ.get("SET2GO_JOB_ID")
    if fd is None or not job_id:
        return
    try:
        os.write(int(fd), (json.dumps({"jobId": job_id, "type": event, "trackId": track_id}) + "\n").encode())
    except (OSError, ValueError):
        pass  # Progress is advisory and must never change an export.


EXTS = (".aif", ".aiff", ".wav", ".flac")
PROFILES = ["bgate", "edma", "edmm", "braw"]          # frozen advisory profiles


def parser() -> argparse.ArgumentParser:
    ap = argparse.ArgumentParser(prog="analysis_key_export.py", description="Opt-in key analysis + local export + source manifest.", allow_abbrev=False)
    ap.add_argument("out_dir", type=Path, help="NEW local export directory (must be empty or absent)")
    ap.add_argument("sources", nargs="+", type=Path, help="audio files and/or directories (non-recursive; .aif .aiff .wav .flac)")
    ap.add_argument("--sidecar", type=Path, required=True, help="hash-linked analysis sidecar (created if absent)")
    ap.add_argument("--predict", choices=["libkeyfinder"], help="OPT-IN prediction policy backend (only libkeyfinder is selectable)")
    ap.add_argument("--essentia", action="store_true", help="advisory Essentia comparison (isolated .venv-key); never the policy backend")
    ap.add_argument("--playlist", default="Analysis export")
    ap.add_argument("--analysis-from", type=Path); ap.add_argument("--link-audio-from", type=Path)
    ap.add_argument("--gridcheck", action="store_true", help="OPT-IN experimental gridcheck recovery for Beat This! rhythm consistency")
    ap.add_argument("--on-unresolved", choices=["stop", "exclude", "legacy-fallback"], default=None,
                    help="policy for unresolved/failed beat grids (default: 'stop' with --gridcheck, else 'legacy-fallback')")
    ap.add_argument("--exclude-unresolved", action="store_true", help="shorthand for --on-unresolved=exclude")
    ap.add_argument("--raw-cache", type=Path, default=None, help="directory for Beat This! raw prediction cache")
    ap.add_argument("--reuse-raw", action="store_true", help="reuse hash-verified cached Beat This! raw predictions")
    ap.add_argument("--overrides", type=Path, default=None, help="grid override JSON sidecar")
    ap.add_argument("--dry-run", action="store_true", help="analyse and save provenance; write no export")
    return ap


def collect(ap: argparse.ArgumentParser, sources: list[Path]) -> list[Path]:
    files: list[Path] = []
    for p in sources:
        if p.is_dir():
            files += sorted(x for x in p.iterdir() if x.is_file() and x.suffix.lower() in EXTS and not x.name.startswith("."))
        elif p.is_file():
            if p.suffix.lower() not in EXTS:
                ap.error(f"unsupported file type {p.suffix!r}: {p}")
            files.append(p)
        else:
            ap.error(f"no such file or directory: {p}")
    return files


def main(argv: list[str]) -> int:
    report_progress("job_started")
    ap = parser()
    a = ap.parse_args(argv)                            # unknown flags raise a usage error (exit 2)
    if bool(a.analysis_from) != bool(a.link_audio_from):
        ap.error("--analysis-from and --link-audio-from must be given together (or neither)")
    if a.exclude_unresolved:
        if a.on_unresolved and a.on_unresolved != "exclude":
            ap.error("--exclude-unresolved conflicts with --on-unresolved")
        a.on_unresolved = "exclude"
    on_unresolved_arg = a.on_unresolved.replace("-", "_") if a.on_unresolved else None
    for d in (a.analysis_from, a.link_audio_from):
        if d is not None and not (d / "PIONEER/rekordbox/export.pdb").is_file():
            ap.error(f"not an export directory: {d}")
    sha_map: dict[str, str] = {}
    try:
        files, notes = MF.dedupe_sources(collect(ap, a.sources), sha256_out=sha_map)
    except MF.SourceConflict as e:
        print(f"error: {e}", file=sys.stderr); return 2
    if not files:
        ap.error("no audio files selected")
    if not a.dry_run and a.out_dir.exists() and any(a.out_dir.iterdir()):
        ap.error(f"{a.out_dir} is not empty; export never overlays old output")
    for n in notes: print("note:", n)
    policy, predictors = None, {}
    if a.predict:
        label, fn = W.libkeyfinder_backend()
        predictors[label] = fn; policy = {"backend": label}
    ess = {}
    if a.essentia:
        raw = Path(f"/tmp/_key_export_essentia_{os.getpid()}.json")
        subprocess.run([str(ROOT / ".venv-key/bin/python"), str(ROOT / "scripts/key_worker.py"), str(raw), *map(str, files), "--profiles", ",".join(PROFILES)],
                       check=True, stdout=subprocess.DEVNULL)
        ess = json.loads(raw.read_text()); raw.unlink()
    sidecar = S.load(a.sidecar)
    results, failed = {}, []
    for p in files:
        pr = dict(predictors)
        for prof in PROFILES:
            e = ess.get(str(p), {}).get("profiles", {}).get(prof)
            if e and "key" in e:
                pr[f"essentia:{prof} 2.1b6"] = (lambda v: (lambda path: v))(f"{e['key']} {e['scale']}")
        key = p.name
        sha = sha_map.get(key) or R.sha256_file(p)
        sha_map[key] = sha
        if sidecar.get(key) is None:
            S.record_analysis(sidecar, key, sha, {"run_id": "init", "source_path": str(p)}, auto=None)
        try:
            results[key] = W.reanalyse(sidecar, key, p, pr, policy=policy, sha256=sha)
        except Exception as ex:
            failed.append((key, f"{type(ex).__name__}: {ex}")); print(f"FAILED {key}: {ex}")
    S.save(a.sidecar, sidecar)
    ok_files = {p.name: p for p in files if p.name in results}
    ek = W.effective_key_map(sidecar, ok_files, predictions={n: r["predicted"] for n, r in results.items()}, policy=policy, sha256_map=sha_map)
    print(f"{'file':44s} {'effective':>9s} {'origin':10s} notes")
    for n, r in results.items():
        k = r["key"]; e = k["effective"]
        notes_ = [x["reason"] for x in r["review"] if x["area"] != "info"]
        print(f"{n[:44]:44s} {e['camelot'] if e else '-':>9s} {k['effective_origin'] or 'none':10s} {len(notes_)} review reason(s)" + (f": {notes_[0][:70]}" if notes_ else ""))
        for m, err in r["failures"].items(): print(f"{'':44s} FAILURE {m}: {err}")
    if failed or a.dry_run:
        print(f"\n{len(failed)} file(s) failed; sidecar saved: {a.sidecar}" + ("; dry run: no export" if a.dry_run else ""))
        return 1 if failed else 0
    out = a.out_dir.resolve()
    base = out.parent / out.name
    need = (0 if a.link_audio_from else sum(p.stat().st_size for p in files)) + 50_000_000
    parent = out.parent if out.parent.exists() else Path(".")
    free = shutil.disk_usage(parent).free
    if need * 1.2 > free:
        print(f"error: not enough free disk ({free/1e6:.0f} MB free, ~{need/1e6:.0f} MB needed); use --link-audio-from or free space", file=sys.stderr); return 2
    try:
        exp_res = export_library(
            {a.playlist: [TrackSpec(p) for p in files]},
            out,
            analysis_from=a.analysis_from,
            link_audio_from=a.link_audio_from,
            effective_keys=ek,
            gridcheck=a.gridcheck,
            on_unresolved=on_unresolved_arg,
            raw_cache=a.raw_cache,
            reuse_raw=a.reuse_raw,
            overrides_path=a.overrides,
            key_resolutions=results,
            source_sha256_map=sha_map,
            progress_callback=report_progress,
        )
    except UnresolvedExportError as uex:
        if uex.engine_report is not None:
            Path(f"{base}_ENGINE_REPORT.json").write_text(json.dumps(uex.engine_report, indent=2))
        print(f"\nerror: {uex}", file=sys.stderr)
        print("per-track review report:", file=sys.stderr)
        for tname, tc in (uex.engine_report or {}).get("tracks", {}).items():
            elig = tc["export_eligibility"]
            g = tc["grid"]
            reasons = elig["blocking_reasons"] or elig["warning_reasons"]
            print(f"  {tname:44s} tier={elig['tier']:24s} grid={g['decision']:20s} reasons={reasons}", file=sys.stderr)
        print(f"engine report written to {base}_ENGINE_REPORT.json; no library or manifest was written", file=sys.stderr)
        return 1
    except Exception as ex:
        if _progress_current_track is not None:
            report_progress("track_failed", _progress_current_track)
        print(f"error: export failed ({type(ex).__name__}: {ex}); {out} may hold a PARTIAL export and must not be used; no manifest was written", file=sys.stderr)
        return 1

    if exp_res.engine_report is not None:
        Path(f"{base}_ENGINE_REPORT.json").write_text(json.dumps(exp_res.engine_report, indent=2))
    excluded_set = set(exp_res.excluded_tracks)
    exported_files = [p for p in files if p.name not in excluded_set]
    if exp_res.excluded_tracks:
        print(f"\nexcluded {len(exp_res.excluded_tracks)} unresolved track(s) (relative playlist order preserved): {', '.join(exp_res.excluded_tracks)}")
    layers = {n: {"imported": r["key"]["layers"]["imported"], "predicted": r["predicted"], "failures": r["failures"]} for n, r in results.items() if n not in excluded_set}
    ek_exported = {n: v for n, v in ek.items() if n not in excluded_set}
    expected_grids = {}
    if exp_res.engine_report is not None:
        for p in exported_files:
            tc = exp_res.engine_report["tracks"].get(p.name)
            if tc and tc["grid"]["bpm"] is not None and tc["grid"]["anchor_ms"] is not None:
                expected_grids[p.name] = {
                    "bpm": tc["grid"]["bpm"],
                    "anchor_ms": tc["grid"]["anchor_ms"],
                    "bar_origin": tc["downbeat"]["bar_origin"] or 1,
                    "status": tc["grid"]["status"],
                    "decision": tc["grid"]["decision"],
                    "source": tc["grid"]["source"],
                    "flagged_windows_s": tc["grid"]["flagged_windows_s"],
                }
    full_policy = dict(policy or {})
    if a.gridcheck or on_unresolved_arg:
        full_policy["gridcheck"] = bool(a.gridcheck)
        full_policy["on_unresolved"] = on_unresolved_arg or ("stop" if a.gridcheck else "legacy_fallback")
    man = MF.build(
        exported_files,
        {a.playlist: exported_files},
        ek_exported,
        layers,
        ANALYSIS_VERSION,
        full_policy or None,
        sha256_map=sha_map,
        expected_grids=expected_grids if expected_grids else None,
        excluded_tracks=exp_res.excluded_tracks if exp_res.excluded_tracks else None,
    )
    MF.save(Path(f"{base}_MANIFEST.json"), man)
    Path(f"{base}_KEYS.json").write_text(json.dumps(ek_exported, indent=1))
    Path(f"{base}_PLAN.json").write_text(json.dumps({a.playlist: [p.name for p in exported_files]}, indent=1))
    print(f"\nexported {len(exported_files)} track(s) to {out}\nmanifest {base}_MANIFEST.json\nengine report {base}_ENGINE_REPORT.json\nverify: .venv/bin/python scripts/verify_export.py {out} --manifest={base}_MANIFEST.json --exact")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
