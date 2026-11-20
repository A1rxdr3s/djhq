#!/usr/bin/env python3
"""Desktop export milestone: two playlists, ten unique tracks, clean local build.

Output goes to a NEW local directory (never the USB). Refuses to overwrite.

    uv run scripts/export_desktop_v1.py [output_dir] [--normalize-titles]
        [--analysis-from=<earlier export>] [--overrides=<GRIDS.json>]
        [--rhythm=auto|fourier|beat_this] [--no-kick-refine] [--raw-cache=<dir>] [--reuse-raw] [--link-audio-from=<verified export>] [--subcolumn-artist] [--refresh-waveforms]
"""
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))

from set2go.export import TrackSpec, export_library

T = ROOT / "test-tracks"
if not T.exists():
    _fallback_tracks = Path(os.environ.get("SET2GO_STANDALONE_DIR", "/Users/andresherrera/Developer/Set2Go")) / "test-tracks"
    if _fallback_tracks.exists():
        T = _fallback_tracks
ORIGINALS = [
    "Earth n Days - Make It High (Extended Mix) [Toolroom Trax].aiff",
    "Snoop Dogg, HUGEL - H.O.U.S.E (Extended Mix) [Make The Girls Dance Records].aiff",
    "Zsak - The Dancefloor (Extended Mix) [There Was Jack].aif",
]
NEW = [
    "01 1A - 6 - Also! (2015 Rework).aiff",
    "Alex Preston, Danny Rhys - What's Up Man (Extended Mix) [Toolroom Trax].aiff",
    "Chinonegro - For You (Original Mix) [8Bit].aiff",
    "Chris Valencia - Flip & Reverse  (Original Mix).wav",
    "jairo delli - Ritmo (Extended Mix).aiff",
    "Solomun, Skepta, Dom Dolla - DANGER DANGER (Extended) [Three Six Zero Recordings].aiff",
    "Sophia Guerrero - Habit (Extended Mix) [Toolroom Trax].aiff",
]
PLAYLISTS = {
    "RekordSOS Originals": ORIGINALS,
    "RekordSOS New Tracks": NEW,
}


def main() -> int:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    out = Path(args[0]) if args else ROOT / "desktop_v1"
    for n in ORIGINALS + NEW:
        if not (T / n).is_file():
            sys.exit(f"missing source: {T / n}")
    opts = {a.split("=", 1)[0]: a.split("=", 1)[1] for a in sys.argv[1:] if a.startswith("--") and "=" in a}
    res = export_library(
        {k: [TrackSpec(T / n) for n in v] for k, v in PLAYLISTS.items()},
        out, normalize_titles="--normalize-titles" in sys.argv,
        analysis_from=Path(opts["--analysis-from"]) if "--analysis-from" in opts else None,
        overrides_path=Path(opts["--overrides"]) if "--overrides" in opts else None,
        rhythm_backend=opts.get("--rhythm", "auto"),
        raw_cache=Path(opts["--raw-cache"]) if "--raw-cache" in opts else None,
        reuse_raw="--reuse-raw" in sys.argv,
        link_audio_from=Path(opts["--link-audio-from"]) if "--link-audio-from" in opts else None,
        subcolumn_artist="--subcolumn-artist" in sys.argv,
        refresh_waveforms="--refresh-waveforms" in sys.argv,
        refine_kick="--no-kick-refine" not in sys.argv,
    )
    (out.parent / f"{out.name}_REPORT.json").write_text(json.dumps({
        "playlists": res.playlists, "sha256": res.sha256_map,
        "artwork_ids": res.artwork_ids, "tracks": res.report}, indent=2, default=str))
    print(f"built {out} in {res.elapsed_s:.0f}s: {len(res.track_ids)} tracks")
    for name, r in res.report.items():
        print(f"  {r['track_id']:>2} {name[:42]:42} bpm={r['bpm']:<8} key={r['key']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
