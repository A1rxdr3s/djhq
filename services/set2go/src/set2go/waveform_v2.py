"""Experimental detail/overview waveform generator (kept SEPARATE from the hardware-validated waveform.py).

Every rule below comes from a measurement against the preserved official ANLZ of three tracks AND the documented format semantics, not from
photographs. Nothing here is copied from a reference payload.

DETAIL (PWV3 mono, PWV5 colour; 150 entries/s, exact frame intervals [round(i*sr/150), round((i+1)*sr/150)) )
  height (5 bit, 0..31): round(31 * (peak / global_peak) ** 2)
      peak = max |mono mixdown| in the frame. Measured against official PWV3: mono-mixdown peak fits with MAE ~0.1 height units and a stable
      exponent (2.05-2.06 on all three tracks); channel-max and single-channel peaks fit 15-20x worse; RMS has r 0.83-0.91 vs 0.97-0.98 for peak.
      Frame alignment: best lag is 0 frames. The old model (RMS scaled to 25) had MAE ~5 and a spread half the official one.
  colour (PWV5 R,G,B 3 bit each): red = low band, green = mid band, blue = high band. Official channels correlate with the low/mid/high
      band-share of the frame at r 0.84-0.88 / 0.80-0.87 / 0.76-0.81 on all three tracks. Level_c = round(7 * band_peak_c / max_c(band_peak)),
      i.e. the documented preview semantics (colour = band / strongest band). Band edges 200 Hz and 2 kHz are an ASSUMPTION (the format docs only
      say bottom half / bottom third / middle / top of the range); they are not fitted.
  PWV3 byte = (whiteness 3 bit << 5) | height, whiteness left at the previous validated behaviour's convention (see below).

OVERVIEW PWV4 (1200 x 6): byte 5 = front height 0..127, bytes 3/4/5 = low/mid/high peaks normalised so the track's strongest column value is 127,
  as measured on the official sections (max(b3,b4,b5) reaches exactly 127 on every track). Bytes 0-2 are not derived here (see waveform.py).
Status: EXPERIMENT. Not used by the exporter. Hardware result: none.
"""
from __future__ import annotations

import math
from dataclasses import dataclass

import numpy as np
from scipy.signal import butter, sosfiltfilt

DETAIL_FPS = 150
LOW_HZ, HIGH_HZ = 200.0, 2000.0          # assumption, see module docstring
HEIGHT_EXPONENT = 2.0                    # measured 2.05-2.06; 2 is the interpretable value (power/energy)


@dataclass
class DetailV2:
    height: np.ndarray       # uint8 0..31, one per 150 fps frame
    rgb: np.ndarray          # uint8 (n,3) levels 0..7
    whiteness: np.ndarray | None = None   # uint8 0..7 (PWV3 bits 7-5); None = not derived (written as 0 by pack_pwv3)


def frame_edges(n_samples: int, sr: int) -> tuple[int, np.ndarray]:
    n = max(1, math.ceil(n_samples * DETAIL_FPS / sr))
    e = np.round(np.arange(n + 1) * sr / DETAIL_FPS).astype(int)
    e[-1] = min(e[-1], n_samples)
    return n, e


def _frame_peak(y: np.ndarray, e: np.ndarray) -> np.ndarray:
    # maximum.reduceat over exact frame starts; the final frame ends at len(y)
    starts = e[:-1]
    ok = e[1:] > starts
    out = np.zeros(len(starts))
    idx = starts[ok]
    out[ok] = np.maximum.reduceat(np.abs(y), idx)[: ok.sum()] if len(idx) else out[ok]
    return out


def band_peaks(mono: np.ndarray, sr: int, e: np.ndarray) -> np.ndarray:
    sos = {"low": butter(4, LOW_HZ, "low", fs=sr, output="sos"),
           "mid": butter(4, [LOW_HZ, HIGH_HZ], "band", fs=sr, output="sos"),
           "high": butter(4, HIGH_HZ, "high", fs=sr, output="sos")}
    return np.stack([_frame_peak(sosfiltfilt(s, mono), e) for s in sos.values()], axis=1)   # (n, 3) low, mid, high


def detail_v2(mono: np.ndarray, sr: int) -> DetailV2:
    n, e = frame_edges(len(mono), sr)
    peak = _frame_peak(mono, e)
    gp = float(peak.max()) or 1.0
    height = np.clip(np.round(31.0 * (peak / gp) ** HEIGHT_EXPONENT), 0, 31).astype(np.uint8)
    bp = band_peaks(mono, sr, e)
    strongest = np.maximum(bp.max(axis=1, keepdims=True), 1e-12)
    rgb = np.clip(np.round(7.0 * bp / strongest), 0, 7).astype(np.uint8)       # R=low, G=mid, B=high
    rgb[height == 0] = 0
    # PWV3 whiteness (3 bits): the format doc says higher values are drawn whiter/less saturated. Measured on the official PWV3 of three tracks:
    # the code is strongly anti-correlated with the LOW-band share (r -0.92..-0.95) and positively with mid/high. Rule, defined from that direction
    # and from the band split above (no fitted parameter): round(7 * (1 - low_share)); on the three tracks MAE 0.67-0.80 of 7, r 0.92-0.94, versus
    # 3.5-3.65 for all zeros. STRUCTURE-DERIVED, UNVALIDATED ON HARDWARE; not claimed to be the official rule.
    total = np.maximum(bp.sum(axis=1), 1e-12)
    whiteness = np.clip(np.round(7.0 * (1.0 - bp[:, 0] / total)), 0, 7).astype(np.uint8)
    whiteness[height == 0] = 0
    return DetailV2(height, rgb, whiteness)


def pack_pwv3(d: DetailV2, derive_whiteness: bool = True) -> bytes:
    """PWV3 bytes: (whiteness << 5) | height. derive_whiteness=False reproduces the earlier experiment (whiteness 0)."""
    w = d.whiteness if (derive_whiteness and d.whiteness is not None) else np.zeros_like(d.height)
    return ((w.astype(np.uint8) << 5) | d.height.astype(np.uint8)).tobytes()


def pack_pwv5(d: DetailV2) -> bytes:
    r, g, b = (d.rgb[:, i].astype(np.uint16) for i in range(3))
    return ((r << 13) | (g << 10) | (b << 7) | (d.height.astype(np.uint16) << 2)).astype(">u2").tobytes()


def pwv4_v2(mono: np.ndarray, sr: int, n_cols: int = 1200) -> np.ndarray:
    """Return (1200,3) low/mid/high peak levels 0..127 normalised to the track's strongest value (bytes 3,4,5)."""
    e = np.round(np.arange(n_cols + 1) * len(mono) / n_cols).astype(int)
    bp = band_peaks(mono, sr, e)
    return np.clip(np.round(127.0 * bp / max(float(bp.max()), 1e-12)), 0, 127).astype(np.uint8)


# PWV4 v3 (diagnostic candidate v17): per-byte level exponents. Bytes 4 (mid) and 5 (high) use the SAME exponent 2 as the detail height (measured 2.05 on
# the official PWV3), byte 3 (low) stays linear. Rationale and measurements: HANDOFF.md ("v17"). 3 development tracks, no hold-out; the choice of 1 vs 2 was made
# by looking at the sweep {1, 1.5, 2, 2.5} on those tracks, so it is NOT independent evidence.
PWV4_EXPONENTS = (1.0, 2.0, 2.0)


def pwv4_v3(mono: np.ndarray, sr: int, n_cols: int = 1200) -> np.ndarray:
    """(1200,3) low/mid/high levels 0..127: (band_peak / strongest band peak of the track) ** exponent_c * 127."""
    e = np.round(np.arange(n_cols + 1) * len(mono) / n_cols).astype(int)
    bp = band_peaks(mono, sr, e)
    rel = bp / max(float(bp.max()), 1e-12)
    out = 127.0 * rel ** np.array(PWV4_EXPONENTS)
    return np.clip(np.round(out), 0, 127).astype(np.uint8)
