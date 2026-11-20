#!/usr/bin/env python3
"""Generate candidate_v3 — a clean-seed export without ghost data.

Uses diagnostic/clean_seed.pdb (structural tables from genuine rekordbox
fixture, all user-data rows soft-deleted) instead of the default seed.
Produces candidate_v3/ alongside candidate_v2/ without overwriting it.

Changes from candidate_v2:
  - Seed: clean_seed.pdb (no ghost track, no ghost playlist, no ghost artists)
  - Track IDs start from 1 (not 2), artist IDs start from 1
  - Only one playlist: "RekordSOS Test" (no inherited "aac" playlist)

Usage:
    uv run scripts/export_candidate_v3.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from set2go.export import export, TrackSpec

SEED = Path("diagnostic/clean_seed.pdb")
TRACKS_DIR = Path("test-tracks")
OUTPUT = Path("candidate_v3")

TRACK_SPECS = [
    TrackSpec(
        wav_path=TRACKS_DIR / "Earth n Days - Make It High (Extended Mix) [Toolroom Trax].aiff",
        title="Make It High (Extended Mix)",
        artist="Earth n Days",
    ),
    TrackSpec(
        wav_path=TRACKS_DIR / "Snoop Dogg, HUGEL - H.O.U.S.E (Extended Mix) [Make The Girls Dance Records].aiff",
        title="H.O.U.S.E (Extended Mix)",
        artist="Snoop Dogg, HUGEL",
    ),
    TrackSpec(
        wav_path=TRACKS_DIR / "Zsak - The Dancefloor (Extended Mix) [There Was Jack].aif",
        title="The Dancefloor (Extended Mix)",
        artist="Zsak",
    ),
]


def main() -> None:
    if not SEED.exists():
        sys.exit(f"Clean seed not found: {SEED}\nRun: uv run scripts/make_clean_seed.py")

    if OUTPUT.exists():
        sys.exit(f"{OUTPUT} already exists — remove it first to avoid overwriting.")

    for spec in TRACK_SPECS:
        if not spec.wav_path.exists():
            sys.exit(f"Track not found: {spec.wav_path}")

    print(f"Seed:    {SEED}")
    print(f"Output:  {OUTPUT}")
    print(f"Tracks:  {len(TRACK_SPECS)}")
    print()

    result = export(
        TRACK_SPECS,
        playlist_name="RekordSOS Test",
        dest_dir=OUTPUT,
        analyse=True,
        seed_path=SEED,
    )

    print(f"Elapsed: {result.elapsed_s:.1f}s")
    print(f"PDB:     {result.pdb_path}")
    print(f"Track IDs: {result.track_ids}")
    print(f"Playlist ID: {result.playlist_id}")
    print()
    print("BPM (aubio):")
    for name, bpm in result.bpm_map.items():
        print(f"  {name}: {bpm:.1f}")
    print()

    # Validate ANLZ paths resolve on disk
    from rekordbox_pdb import Database
    db = Database.from_file(result.pdb_path)
    all_ok = True
    for t in db.tracks:
        rel = t.analyze_path.lstrip("/")
        anlz = OUTPUT / rel
        exists = anlz.exists()
        status = "OK" if exists else "MISSING"
        print(f"  [{status}] track {t.id} — {t.title}")
        print(f"         anlz: {t.analyze_path}")
        print(f"         audio: {t.file_path}")
        if not exists:
            all_ok = False
    print()
    print("Ghost check:")
    print(f"  Tracks:    {len(db.tracks)} (expected 3)")
    print(f"  Playlists: {len(db.playlist_tree)} (expected 1)")
    print(f"  COLUMNS:   {len(db.columns)} (expected 27)")
    print()
    if all_ok and len(db.tracks) == 3 and len(db.playlist_tree) == 1:
        print("candidate_v3 looks correct.")
    else:
        print("WARNING: unexpected state — review output above.")


if __name__ == "__main__":
    main()
