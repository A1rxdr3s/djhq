#!/usr/bin/env python3
"""CLI: export WAV files and a playlist to a Pioneer device library.

Usage:
    uv run scripts/export_usb.py <dest_dir> <playlist_name> <track.wav> [<track.wav> ...]

Options:
    --no-analyse    Skip BPM detection (faster; CDJ shows 'NOT ANALYSED').
    --title TITLE   Override title for the next track (repeatable).
    --artist ARTIST Override artist for the next track (repeatable).
    --genre GENRE   Override genre for the next track (repeatable).

Example:
    uv run scripts/export_usb.py ./my_usb "Friday Set" a.wav b.wav c.wav

The output directory is a self-contained Pioneer device library. Copy its
contents to the root of a FAT32-formatted USB drive to use it on a CDJ.

Never specify a mounted USB as dest_dir — the script writes to a local
folder first. Copy manually after verifying the output.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from set2go.export import TrackSpec, export


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Export WAV files to a Pioneer CDJ device library.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("dest_dir", help="Output directory (treat as USB root)")
    parser.add_argument("playlist_name", help="Name of the playlist to create")
    parser.add_argument("wav_files", nargs="+", metavar="track.wav")
    parser.add_argument("--no-analyse", action="store_true",
                        help="Skip BPM detection")
    parser.add_argument("--title", action="append", default=[],
                        metavar="TITLE", help="Track title (one per track, in order)")
    parser.add_argument("--artist", action="append", default=[],
                        metavar="ARTIST", help="Artist name (one per track)")
    parser.add_argument("--genre", action="append", default=[],
                        metavar="GENRE", help="Genre (one per track)")
    args = parser.parse_args()

    wav_paths = [Path(p) for p in args.wav_files]
    for p in wav_paths:
        if not p.is_file():
            print(f"ERROR: file not found: {p}", file=sys.stderr)
            return 1
        if p.suffix.lower() != ".wav":
            print(f"WARNING: {p.name} does not have a .wav extension", file=sys.stderr)

    def _get(lst: list[str], i: int, default: str = "") -> str:
        return lst[i] if i < len(lst) else default

    tracks = [
        TrackSpec(
            wav_path=p,
            title=_get(args.title, i) or p.stem,
            artist=_get(args.artist, i),
            genre=_get(args.genre, i),
        )
        for i, p in enumerate(wav_paths)
    ]

    dest = Path(args.dest_dir)
    print(f"Exporting {len(tracks)} track(s) to: {dest}")
    print(f"Playlist:  {args.playlist_name!r}")
    print(f"Analysis:  {'disabled' if args.no_analyse else 'enabled (BPM detection)'}")
    print()

    result = export(
        tracks,
        args.playlist_name,
        dest,
        analyse=not args.no_analyse,
    )

    print(f"Done in {result.elapsed_s:.1f}s")
    print()
    print("Tracks exported:")
    for i, (tid, spec) in enumerate(zip(result.track_ids, tracks), start=1):
        bpm = result.bpm_map.get(spec.wav_path.name, 0)
        bpm_str = f"{bpm:.1f} BPM" if bpm else "BPM unknown"
        print(f"  {i}. [{tid}] {spec.title!r} ({spec.wav_path.name}) — {bpm_str}")

    print()
    print("SHA-256 integrity:")
    for fname, sha in result.sha256_map.items():
        print(f"  {fname}: {sha}")

    print()
    print("Output structure:")
    for p in sorted(dest.rglob("*")):
        rel = p.relative_to(dest)
        if p.is_file():
            size_kb = p.stat().st_size // 1024
            print(f"  {rel}  ({size_kb} KB)")

    print()
    print("Next steps:")
    print("  1. Verify the output looks correct above.")
    print("  2. Format a spare USB drive as FAT32 (MBR partition table).")
    print(f"  3. Copy the contents of '{dest}' to the USB root.")
    print("  4. Eject safely and test on CDJ-2000NXS2.")
    print("  5. Report results in docs/hardware-test.md.")

    return 0


if __name__ == "__main__":
    sys.exit(main())
