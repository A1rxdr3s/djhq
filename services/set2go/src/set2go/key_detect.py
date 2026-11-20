"""Key detection and key-source labelling for Pioneer CDJ export.

Key sources (in priority order for export):
  "tkey_frame"    — Standard ID3 TKEY frame. Most reliable embedded source.
  "title_prefix"  — Camelot code parsed from TIT2 prefix pattern "XY - N - Title".
                    Unambiguous only when the pattern matches exactly.
                    Origin (e.g. Mixed In Key) is not assumed; we only record
                    what the tag contains.
  "detected"      — libKeyFinder 2.x via ctypes (GPL-2.0-or-later dylib built
                    by scripts/build_kf.sh). Accuracy is genre/track dependent;
                    may confuse parallel major/minor.
  "user"          — Provided explicitly at export time (not yet implemented).
  None            — No key information available; PDB key field left blank.

libKeyFinder Camelot Wheel (standard MiK Easymix notation):
  key_t 0..23 from keyfinder/constants.h → name → Camelot code.
"""
from __future__ import annotations

import ctypes
import os
import re
import struct
from dataclasses import dataclass
from pathlib import Path
from typing import Literal, Optional

import numpy as np

KeySource = Literal["tkey_frame", "title_prefix", "detected", "user", "none"]


@dataclass
class KeyResult:
    key_name: str          # e.g. "D minor"
    camelot: str           # e.g. "7A"
    source: KeySource      # "embedded" | "detected" | "user" | "none"

    def __str__(self) -> str:
        return f"{self.key_name} ({self.camelot}) [{self.source}]"


_MIK_PREFIX = re.compile(r'^(\d{1,2}[AB])\s*-\s*\d\s*-\s*')

# -- libKeyFinder key_t enum order (from keyfinder/constants.h) ---------------
_KEY_NAMES = [
    "A major", "A minor", "Bb major", "Bb minor", "B major", "B minor",
    "C major", "C minor", "Db major", "Db minor", "D major", "D minor",
    "Eb major", "Eb minor", "E major", "E minor", "F major", "F minor",
    "F# major", "F# minor", "G major", "G minor", "Ab major", "Ab minor",
]  # index 24 = SILENCE

# Standard Camelot Easymix notation
_CAMELOT: dict[str, str] = {
    "A major": "11B", "A minor": "8A",
    "Bb major": "6B", "Bb minor": "3A",
    "B major": "1B", "B minor": "10A",
    "C major": "8B", "C minor": "5A",
    "Db major": "3B", "Db minor": "12A",
    "D major": "10B", "D minor": "7A",
    "Eb major": "5B", "Eb minor": "2A",
    "E major": "12B", "E minor": "9A",
    "F major": "7B", "F minor": "4A",
    "F# major": "2B", "F# minor": "11A",
    "G major": "9B", "G minor": "6A",
    "Ab major": "4B", "Ab minor": "1A",
}

# Configurable path to libKeyFinder ctypes wrapper dylib.
# SET2GO_KEYFINDER_DYLIB overrides default location; checks local services/set2go/lib then falls back to /tmp/libkf_wrapper.dylib
def _get_dylib_path() -> Path:
    env_path = os.environ.get("SET2GO_KEYFINDER_DYLIB")
    if env_path:
        return Path(env_path)
    local_lib = Path(__file__).resolve().parent.parent.parent / "lib" / "libkf_wrapper.dylib"
    if local_lib.exists():
        return local_lib
    return Path("/tmp/libkf_wrapper.dylib")

_DYLIB_PATH = _get_dylib_path()
_lib: ctypes.CDLL | None = None
_load_attempted = False


def _load_lib() -> ctypes.CDLL | None:
    global _lib, _load_attempted
    if _load_attempted:
        return _lib
    _load_attempted = True
    if not _DYLIB_PATH.exists():
        return None
    try:
        lib = ctypes.CDLL(str(_DYLIB_PATH))
        lib.keyfinder_key.restype = ctypes.c_int
        lib.keyfinder_key.argtypes = [
            ctypes.POINTER(ctypes.c_float), ctypes.c_int, ctypes.c_int, ctypes.c_int,
        ]
        _lib = lib
    except OSError:
        pass
    return _lib


def detect_key(mono_float32: np.ndarray, sample_rate: int) -> Optional[tuple[str, str]]:
    """Detect musical key from mono float32 PCM.

    Returns (key_name, camelot_code) e.g. ("D minor", "7A"), or None if
    libKeyFinder is unavailable or input is silent.
    """
    lib = _load_lib()
    if lib is None:
        return None
    arr = np.ascontiguousarray(mono_float32, dtype=np.float32)
    ptr = arr.ctypes.data_as(ctypes.POINTER(ctypes.c_float))
    key_idx = lib.keyfinder_key(ptr, len(arr), 1, int(sample_rate))
    if key_idx < 0 or key_idx >= len(_KEY_NAMES):
        return None
    key_name = _KEY_NAMES[key_idx]
    camelot = _CAMELOT.get(key_name, "?")
    return key_name, camelot


def _read_id3_frame(path: Path, target_frame: str) -> str | None:
    """Read one ID3 text frame via mutagen (handles AIFF/WAV/MP3, all encodings)."""
    from .metadata import _open_tags, _text
    return _text(_open_tags(Path(path)), target_frame) or None


# Inverse Camelot map: "7A" → "D minor"
_CAMELOT_TO_KEY: dict[str, str] = {}


def _build_camelot_inverse() -> None:
    for k, v in _CAMELOT.items():
        _CAMELOT_TO_KEY[v] = k


def read_embedded_key(path: Path) -> KeyResult | None:
    """Extract key from ID3 metadata, in priority order:
      1. TKEY frame (standard ID3 key field)
      2. TIT2 prefix pattern "XY - N - Title" (common key-embedding convention)

    Source is labelled to distinguish metadata provenance.
    Returns None if no recognisable key is found.
    """
    if not _CAMELOT_TO_KEY:
        _build_camelot_inverse()

    # 1. TKEY frame — standard, most explicit
    tkey = _read_id3_frame(path, "TKEY")
    if tkey:
        m = _MIK_PREFIX.match(tkey) or re.match(r'^(\d{1,2}[AB])$', tkey)
        if m:
            camelot = m.group(1).upper()
            key_name = _CAMELOT_TO_KEY.get(camelot)
            if key_name:
                return KeyResult(key_name, camelot, "tkey_frame")

    # 2. TIT2 prefix "7A - N - Title" — unambiguous only when pattern matches exactly.
    #    We record what the tag contains without assuming the writing application.
    title = _read_id3_frame(path, "TIT2") or ""
    m = _MIK_PREFIX.match(title)
    if m:
        camelot = m.group(1).upper()
        key_name = _CAMELOT_TO_KEY.get(camelot)
        if key_name:
            return KeyResult(key_name, camelot, "title_prefix")

    # 3. Filename pattern "NN XY - N - Title.ext" — last resort, less reliable
    fn = Path(path).stem
    m = re.match(r'^\d{2}\s+(\d{1,2}[AB])\s*-\s*\d\s*-', fn)
    if m:
        camelot = m.group(1).upper()
        key_name = _CAMELOT_TO_KEY.get(camelot)
        if key_name:
            return KeyResult(key_name, camelot, "title_prefix")

    return None


def detect_key_from_file(path) -> KeyResult | None:
    """Detect musical key from audio file using libKeyFinder.

    Uses aubio for PCM decoding; returns None if libKeyFinder or aubio unavailable.
    """
    try:
        import aubio
        import numpy as np
    except ImportError:
        return None
    hop = 512
    src = aubio.source(str(path), 0, hop)
    sr = src.samplerate
    chunks = []
    while True:
        smp, read = src()
        chunks.append(smp.copy())
        if read < hop:
            break
    mono = np.concatenate(chunks)
    result = detect_key(mono, sr)
    if result is None:
        return None
    return KeyResult(result[0], result[1], "detected")


def resolve_key(path: Path) -> KeyResult | None:
    """Return best available key: embedded (MiK) → detected (libKeyFinder) → None."""
    embedded = read_embedded_key(path)
    if embedded is not None:
        return embedded
    return detect_key_from_file(path)


def is_available() -> bool:
    return _load_lib() is not None
