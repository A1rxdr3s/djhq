"""Compute waveform data from audio for Pioneer ANLZ waveform sections.

All waveform entry encoding follows the Pioneer format:
  PWAV / PWV2 / PWV3:  1 byte = (color:3 << 5) | (height:5)
  PWV5:                2 bytes BE = (r:3 << 13) | (g:3 << 10) | (b:3 << 7) | (height:5 << 2)
  PWV4:                6 bytes/entry = [d0, d1, d2, d3, d4, d5] (see Pioneer docs)

Overview colour (PWV4) is separate from detail colour (PWV3/PWV5); see _PWV_W below.
Color assignment for PWAV/PWV3 uses adaptive spectral centroid thresholds calibrated
against three-track rekordbox_official reference ANLZ:

  Bottom p10 centroid  → color 0  (bass-dominant: kick, drop)
  Top p25 centroid     → color 5  (treble: hi-hats, breakdown)
  Remainder (65%)      → color 3  (balanced EDM body — teal)

  Adaptive thresholds avoid hardcoded Hz values that fail across different tracks.
  Rekordbox reference distribution: c=0 ~10%, c=3 ~72%, c=5 ~11% (3-track mean).

Height normalization: rekordbox caps at 25/31 (observed 4-25 range).
  Hitting 31 may cause display saturation. We scale to [0, 25].
"""

from __future__ import annotations

import math
import struct
from dataclasses import dataclass
from pathlib import Path

import numpy as np


_DETAIL_FPS = 150    # frames per second for detail waveforms (PWV3 / PWV5)
_PWAV_COUNT  = 400   # fixed entry count for PWAV
_PWV2_COUNT  = 100   # fixed entry count for PWV2
_PWV4_COUNT  = 1200  # fixed entry count for PWV4

_MAX_HEIGHT  = 25    # rekordbox observed maximum (4-25); not 31 to avoid display saturation
_MAX_HEIGHT63 = 63   # absolute max for PWV4 6-bit field

# Hop size when reading audio via aubio
_HOP = 4096


@dataclass
class WaveformData:
    pwav:       bytes   # 400 uint8 entries (DAT PWAV)
    pwv2:       bytes   # 100 uint8 entries (DAT PWV2)
    n_detail:   int     # number of 150fps entries in PWV3/PWV5
    pwv3:       bytes   # n_detail uint8 entries (EXT PWV3)
    pwv4:       bytes   # 1200*6 raw bytes (EXT PWV4)
    pwv5:       bytes   # n_detail uint16be packed values (EXT PWV5)


def _read_mono_float32(path: Path) -> tuple[np.ndarray, int]:
    """Read audio file and return (mono float32 array, sample_rate)."""
    import aubio
    src = aubio.source(str(path), 0, _HOP)
    sr = src.samplerate
    chunks: list[np.ndarray] = []
    while True:
        samples, read = src()
        chunks.append(samples[:read].copy())
        if read < _HOP:
            break
    if not chunks:
        return np.zeros(0, dtype=np.float32), sr
    return np.concatenate(chunks).astype(np.float32), sr


def _rms_windows(mono: np.ndarray, n: int) -> np.ndarray:
    """RMS amplitude for n equal windows (float64)."""
    total = len(mono)
    if total == 0 or n == 0:
        return np.zeros(n, dtype=np.float64)
    win = total // n
    if win == 0:
        return np.zeros(n, dtype=np.float64)
    arr = mono[:win * n].astype(np.float64)
    return np.sqrt(np.mean(arr.reshape(n, win) ** 2, axis=1))


def _scale(rms: np.ndarray, max_val: int = _MAX_HEIGHT) -> np.ndarray:
    """Scale RMS values linearly to [0, max_val] as uint8."""
    peak = float(rms.max())
    if peak == 0.0:
        return np.zeros(len(rms), dtype=np.uint8)
    return np.clip((rms / peak * max_val).round(), 0, max_val).astype(np.uint8)


def _spectral_colors_vectorized(mono: np.ndarray, n: int, sr: int) -> list[int]:
    """Assign Pioneer PWAV color codes for n windows using vectorized FFT.

    Colors are signal-derived: the centroid thresholds (c10, c75) are computed
    from the track's own spectral centroid distribution, so they differ per track
    and per section. A quiet electronic breakdown will have different thresholds
    than a dense EDM drop.

    The percentile split (p10 / p75) is a design constant — it produces a fixed
    10%/65%/25% distribution by definition. This approximates the dominant
    color=3 pattern in rekordbox_official ANLZ but does not replicate rekordbox's
    proprietary multi-band algorithm, which varies its distribution per track.
    Visual correctness is pending physical hardware validation on CDJ-2000NXS2.
    """
    total = len(mono)
    win = total // n if n > 0 else 0
    if win < 8:
        return [3] * n

    data = mono[: n * win].reshape(n, win).astype(np.float64)
    spec = np.abs(np.fft.rfft(data, axis=1)) ** 2          # (n, win//2+1)
    freqs = np.fft.rfftfreq(win, 1.0 / sr)                 # (win//2+1,)

    total_energy = spec.sum(axis=1)                         # (n,)
    safe_energy = np.where(total_energy > 1e-12, total_energy, 1.0)
    centroids = (spec * freqs[np.newaxis, :]).sum(axis=1) / safe_energy
    centroids = np.where(total_energy > 1e-12, centroids, 0.0)

    c10 = float(np.percentile(centroids, 10))
    c75 = float(np.percentile(centroids, 75))

    colors = np.where(centroids < c10, 0, np.where(centroids > c75, 5, 3))
    return colors.tolist()


def _pack_spectral(heights: np.ndarray, colors: list[int]) -> bytes:
    """Pack height + color into 1-byte PWAV/PWV3 entries."""
    return bytes(((c << 5) | int(h)) for c, h in zip(colors, heights))


def _pack_pwv5(heights: np.ndarray, colors: list[int]) -> bytes:
    """Pack heights + colors into PWV5 2-byte BE entries.

    PWV color codes map to (r, g, b) triads:
      0 (bass)  → R=0, G=0, B=7  (deep blue)
      3 (mid)   → R=0, G=2, B=3  (teal)
      5 (treble)→ R=0, G=3, B=1  (bright teal)
    """
    _rgb = {0: (0,0,7), 1:(0,1,6), 2:(0,2,5), 3:(0,2,3), 4:(0,3,2), 5:(0,3,1)}
    result = bytearray(len(heights) * 2)
    for i, (h, c) in enumerate(zip(heights, colors)):
        r, g, b = _rgb.get(c, (0, 2, 3))
        struct.pack_into(">H", result, i * 2, (r << 13) | (g << 10) | (b << 7) | (int(h) << 2))
    return bytes(result)


# PWV4 colour-overview model. Fitted by least squares on the three official
# rekordbox PWV4 sections for the original tracks (Earth n Days, Snoop Dogg,
# Zsak), features = [1, log10 peak, log10 rms, log10 low<200Hz, log10 mid
# 200-2k, log10 high>2k]; columns = the six PWV4 bytes. Leave-one-track-out
# correlation: b0 0.85-0.95, b2/b3 0.84-0.96, b1/b4/b5 0.3-0.8, so this is an
# APPROXIMATION of rekordbox's encoding, not a reproduction. Visual result is
# unvalidated until tested on hardware.
_PWV4_W = np.array([
    [142.513, 95.436, 148.96, 124.944, 136.655, 144.747],
    [43.921, 34.172, -67.91, -108.208, -60.412, -60.249],
    [4.352, 5.989, 68.474, 129.056, 24.219, 5.57],
    [10.287, -18.499, 36.376, 37.22, 5.328, 13.603],
    [-2.788, -12.738, 4.15, -29.116, 66.778, -14.409],
    [11.183, -13.246, -10.779, -12.445, -3.918, 77.801],
])


def _pwv4_features(mono: np.ndarray, sr: int, n: int) -> np.ndarray:
    win = len(mono) // n
    x = mono[: n * win].reshape(n, win).astype(np.float64)
    spec = np.abs(np.fft.rfft(x, axis=1)) ** 2
    f = np.fft.rfftfreq(win, 1.0 / sr)

    def band(lo, hi):
        return np.log10(np.sqrt(spec[:, (f >= lo) & (f < hi)].sum(1)) / win + 1e-6)

    return np.stack([
        np.ones(n),
        np.log10(np.abs(x).max(1) + 1e-4),
        np.log10(np.sqrt((x ** 2).mean(1)) + 1e-4),
        band(0, 200), band(200, 2000), band(2000, 1e5),
    ], axis=1)


def _pack_pwv4(mono: np.ndarray, sr: int) -> bytes:
    """PWV4: 1200 x 6 bytes, every byte derived from the track's own signal.

    Byte order as in the official sections: [peak, 255-ish complement, low-band,
    low-band, mid, high]. Values are clipped to the ranges seen in the official
    files (b0/b2-b5 <= 127, b1 <= 255).
    """
    feats = _pwv4_features(mono, sr, _PWV4_COUNT)
    out = np.clip(feats @ _PWV4_W, 0, 255)
    out[:, [0, 2, 3, 4, 5]] = np.minimum(out[:, [0, 2, 3, 4, 5]], 127)
    return out.round().astype(np.uint8).tobytes()


def compute_waveforms(audio_path: Path, mono_sr: tuple[np.ndarray, int] | None = None) -> WaveformData:
    """Read audio file and return all waveform section payloads."""
    mono, sr = mono_sr if mono_sr is not None else _read_mono_float32(audio_path)
    n_frames = len(mono)

    # Overview (400 entries) — adaptive spectral color + normalized height [0-25]
    rms_pwav = _rms_windows(mono, _PWAV_COUNT)
    h_pwav = _scale(rms_pwav, _MAX_HEIGHT)
    colors_pwav = _spectral_colors_vectorized(mono, _PWAV_COUNT, sr)
    pwav_bytes = _pack_spectral(h_pwav, colors_pwav)

    # Tiny preview (100 entries) — amplitude only, no color
    pwv2_bytes = bytes(_scale(_rms_windows(mono, _PWV2_COUNT), 15).tolist())

    # Detail (PWV3 mono / PWV5 colour) and colour overview (PWV4 bytes 3-5): waveform_v2 rules: v13 detail (detail_v2) and v17 overview (pwv4_v3) were both
    # visually accepted on CDJ-2000NXS2 fw 1.87 and consolidated in desktop_v18_consolidated (which passed the ten-track hardware checks; see HANDOFF.md and
    # frozen/desktop_v18_consolidated/HARDWARE_RESULT.md). PWAV/PWV2 above and PWV4 bytes 0-2 keep the earlier validated behaviour.
    from . import waveform_v2 as _v2
    d2 = _v2.detail_v2(mono, sr)
    n_detail = len(d2.height)
    assert n_detail == max(1, math.ceil(n_frames * _DETAIL_FPS / sr))
    pwv3_bytes = _v2.pack_pwv3(d2)
    pwv5_bytes = _v2.pack_pwv5(d2)

    pwv4_arr = np.frombuffer(_pack_pwv4(mono, sr), dtype=np.uint8).reshape(_PWV4_COUNT, 6).copy()
    pwv4_arr[:, 3:6] = _v2.pwv4_v3(mono, sr, _PWV4_COUNT)
    pwv4_bytes = pwv4_arr.tobytes()

    return WaveformData(
        pwav=pwav_bytes,
        pwv2=pwv2_bytes,
        n_detail=n_detail,
        pwv3=pwv3_bytes,
        pwv4=pwv4_bytes,
        pwv5=pwv5_bytes,
    )
