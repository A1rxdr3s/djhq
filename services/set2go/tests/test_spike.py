"""End-to-end tests for the export spike.

Tests are intentionally run against generated audio (pure sine waves) to
avoid distributing copyrighted content. Sine waves are not evidence of
musical BPM detection quality — that requires real tracks.
"""

from __future__ import annotations

import hashlib
import math
import struct
import sys
import wave
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from rekordbox_pdb import Database
from set2go.anlz_writer import BeatEntry, build_dat
from set2go.export import TrackSpec, export, export_library


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _sine_wav(path: Path, freq: float, duration: float, sr: int = 44100) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    n = int(sr * duration)
    with wave.open(str(path), "w") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        data = bytearray()
        for i in range(n):
            v = int(0.5 * 32767 * math.sin(2 * math.pi * freq * i / sr))
            data += struct.pack("<h", v)
        w.writeframes(bytes(data))
    return path


def _sha256(path: Path) -> str:
    h = hashlib.sha256()
    h.update(path.read_bytes())
    return h.hexdigest()


# ---------------------------------------------------------------------------
# ANLZ writer unit tests
# ---------------------------------------------------------------------------

class TestAnlzWriter:
    def test_file_header(self):
        dat = build_dat("/Contents/x.wav")
        assert dat[:4] == b"PMAI"
        assert int.from_bytes(dat[4:8], "big") == 28
        assert int.from_bytes(dat[8:12], "big") == len(dat)

    def test_ppth_tag(self):
        path = "/Contents/my track.wav"
        dat = build_dat(path)
        i = 28  # first tag starts after 28-byte file header
        assert dat[i : i + 4] == b"PPTH"
        len_tag = int.from_bytes(dat[i + 8 : i + 12], "big")
        len_path = int.from_bytes(dat[i + 12 : i + 16], "big")
        decoded = dat[i + 16 : i + 16 + len_path - 2].decode("utf-16-be")
        assert decoded == path
        assert len_tag == 12 + 4 + len_path

    def test_pqtz_empty(self):
        dat = build_dat("/Contents/x.wav", beats=[])
        # find PQTZ tag
        i = 28
        while i < len(dat) and dat[i : i + 4] != b"PQTZ":
            lt = int.from_bytes(dat[i + 8 : i + 12], "big")
            i += lt
        assert dat[i : i + 4] == b"PQTZ"
        num_beats = int.from_bytes(dat[i + 20 : i + 24], "big")
        assert num_beats == 0

    def test_pqtz_with_beats(self):
        beats = [BeatEntry(1, 12800, 0), BeatEntry(2, 12800, 468)]
        dat = build_dat("/Contents/x.wav", beats=beats)
        i = 28
        while i < len(dat) and dat[i : i + 4] != b"PQTZ":
            lt = int.from_bytes(dat[i + 8 : i + 12], "big")
            i += lt
        num_beats = int.from_bytes(dat[i + 20 : i + 24], "big")
        assert num_beats == 2
        b0_num = int.from_bytes(dat[i + 24 : i + 26], "big")
        b0_tempo = int.from_bytes(dat[i + 26 : i + 28], "big")
        b0_time = int.from_bytes(dat[i + 28 : i + 32], "big")
        assert b0_num == 1
        assert b0_tempo == 12800
        assert b0_time == 0

    def test_file_length_consistent(self):
        beats = [BeatEntry(i % 4 + 1, 12500, i * 480) for i in range(16)]
        dat = build_dat("/Contents/track.wav", beats=beats)
        claimed = int.from_bytes(dat[8:12], "big")
        assert claimed == len(dat)


# ---------------------------------------------------------------------------
# Export integration tests
# ---------------------------------------------------------------------------

@pytest.fixture(scope="module")
def three_wav_files(tmp_path_factory):
    d = tmp_path_factory.mktemp("wavs")
    a = _sine_wav(d / "track_a.wav", 440, 20)
    b = _sine_wav(d / "track_b.wav", 528, 15)
    c = _sine_wav(d / "track_c.wav", 660, 25)
    return [a, b, c]


@pytest.fixture(scope="module")
def export_result(tmp_path_factory, three_wav_files):
    dest = tmp_path_factory.mktemp("usb_export")
    tracks = [
        TrackSpec(three_wav_files[0], "Alpha", artist="DJ X", genre="Techno"),
        TrackSpec(three_wav_files[1], "Beta",  artist="DJ Y", genre="House"),
        TrackSpec(three_wav_files[2], "Gamma", artist="DJ X", genre="Techno"),
    ]
    return export_library({"Spike Set": list(tracks)}, dest, analyse=True, rhythm_backend="fourier")


class TestExport:
    def test_audio_integrity(self, export_result, three_wav_files):
        for orig in three_wav_files:
            orig_sha = _sha256(orig)
            copy = export_result.dest_dir / "Contents" / orig.name
            assert copy.exists(), f"audio not copied: {orig.name}"
            assert _sha256(copy) == orig_sha, f"SHA-256 mismatch: {orig.name}"

    def test_pdb_tracks(self, export_result):
        db = Database.from_file(export_result.pdb_path)
        tracks = list(db.tracks)
        assert len(tracks) == 3
        titles = [t.title for t in tracks]
        assert "Alpha" in titles
        assert "Beta" in titles
        assert "Gamma" in titles

    def test_pdb_artists(self, export_result):
        db = Database.from_file(export_result.pdb_path)
        artist_names = {a.name for a in db.artists}
        assert "DJ X" in artist_names
        assert "DJ Y" in artist_names

    def test_pdb_genres(self, export_result):
        db = Database.from_file(export_result.pdb_path)
        genre_names = {g.name for g in db.genres}
        assert "Techno" in genre_names
        assert "House" in genre_names

    def test_playlist_order(self, export_result):
        db = Database.from_file(export_result.pdb_path)
        playlists = {p.id: p.name for p in db.playlist_tree}
        assert any(v == "Spike Set" for v in playlists.values())
        entries = sorted(db.playlist_entries, key=lambda e: e.entry_index)
        assert [e.track_id for e in entries] == export_result.track_ids

    def test_pdb_file_paths(self, export_result, three_wav_files):
        db = Database.from_file(export_result.pdb_path)
        paths = {t.file_path for t in db.tracks}
        for orig in three_wav_files:
            expected = f"/Contents/{orig.name}"
            assert expected in paths, f"missing path in PDB: {expected}"

    def test_anlz_files_exist(self, export_result):
        db = Database.from_file(export_result.pdb_path)
        for t in db.tracks:
            assert t.analyze_path, f"track {t.title} has no analyze_path"
            rel = t.analyze_path.lstrip("/")
            anlz = export_result.dest_dir / rel
            assert anlz.exists(), f"ANLZ not found: {anlz}"

    def test_anlz_structure(self, export_result):
        db = Database.from_file(export_result.pdb_path)
        for t in db.tracks:
            rel = t.analyze_path.lstrip("/")
            data = (export_result.dest_dir / rel).read_bytes()
            assert data[:4] == b"PMAI", f"bad magic in {rel}"
            claimed_len = int.from_bytes(data[8:12], "big")
            assert claimed_len == len(data), f"len_file mismatch in {rel}"

    def test_anlz_path_matches_audio(self, export_result):
        db = Database.from_file(export_result.pdb_path)
        track_map = {t.id: t for t in db.tracks}
        for tid in export_result.track_ids:
            t = track_map[tid]
            rel = t.analyze_path.lstrip("/")
            data = (export_result.dest_dir / rel).read_bytes()
            # find PPTH path
            i = int.from_bytes(data[4:8], "big")
            while i < len(data) and data[i : i + 4] != b"PPTH":
                lt = int.from_bytes(data[i + 8 : i + 12], "big")
                i += lt
            lp = int.from_bytes(data[i + 12 : i + 16], "big")
            anlz_path = data[i + 16 : i + 16 + lp - 2].decode("utf-16-be")
            assert anlz_path == t.file_path

    def test_bpm_detected(self, export_result):
        for bpm in export_result.bpm_map.values():
            assert bpm > 0, "BPM detection failed entirely"

    def test_track_ids_sequential(self, export_result):
        assert export_result.track_ids == [1, 2, 3]

    def test_elapsed_under_60s(self, export_result):
        assert export_result.elapsed_s < 60, (
            f"export took {export_result.elapsed_s:.1f}s — expected under 60s"
        )
