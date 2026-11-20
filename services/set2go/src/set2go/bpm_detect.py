"""BPM detection and beat-grid generation using aubio.

Produces a list of BeatEntry objects from a WAV (or any source aubio can open)
that can be passed directly to anlz_writer.build_dat().

Beat grid strategy
------------------
aubio's tempo tracker accurately locates beats on short timescales, but its
per-beat timestamps scatter around the true grid by 50-700ms RMS. For
electronic music with constant BPM, a synthesized grid is more accurate:

  1. Detect all beat timestamps with aubio.
  2. Fit a linear model (sequential-index regression) to get the true slope.
     Median IBI is biased when aubio clusters beats at shorter intervals than
     the true period (observed +2 BPM bias on constant-tempo EDM). Regression
     across the full track eliminates that local bias.
  3. Use the regression slope as the authoritative beat period.
  4. Anchor to the first detected beat, then synthesize evenly-spaced entries
     at that period. This gives zero residual error at the anchor and grows
     only with the tempo-estimation error.

Limitations:
- Beat 1 ≠ downbeat. We cannot determine which bar-beat the first detection
  corresponds to without a separate downbeat detector. beat_number is assigned
  as (i % 4)+1 starting from the first detected onset.
- Variable-BPM tracks (live recordings, rubato) will show an averaged grid.
- Requires the aubio package (installed via Homebrew; vendored into .venv).
"""

from __future__ import annotations

import struct
import wave
from pathlib import Path
from dataclasses import dataclass
from typing import NamedTuple

from .anlz_writer import BeatEntry


def _aiff_info(path: Path) -> tuple[int, int, int]:
    """Read (sample_rate, n_channels, n_frames) from an AIFF/AIFC header."""
    with open(path, 'rb') as f:
        form = f.read(12)
        if form[:4] != b'FORM' or form[8:12] not in (b'AIFF', b'AIFC'):
            raise ValueError(f"Not a valid AIFF file: {path}")
        while True:
            hdr = f.read(8)
            if len(hdr) < 8:
                raise ValueError(f"COMM chunk not found: {path}")
            ck_id = hdr[:4]
            ck_size = struct.unpack('>I', hdr[4:])[0]
            if ck_id == b'COMM':
                data = f.read(min(ck_size, 26))
                n_channels = struct.unpack('>h', data[0:2])[0]
                n_frames = struct.unpack('>I', data[2:6])[0]
                exp = struct.unpack('>H', data[8:10])[0]
                mantissa = struct.unpack('>Q', data[10:18])[0]
                sign = -1 if (exp & 0x8000) else 1
                exp = (exp & 0x7FFF) - 16383
                sample_rate = int(sign * mantissa * (2.0 ** (exp - 63)))
                return sample_rate, n_channels, n_frames
            f.seek(ck_size + (ck_size % 2), 1)

try:
    import aubio
    _AUBIO_AVAILABLE = True
except ImportError:
    _AUBIO_AVAILABLE = False


def wav_info(path: Path) -> tuple[int, int, int]:
    """Return (sample_rate, n_channels, n_frames) from a WAV or AIFF file."""
    if path.suffix.lower() in ('.aif', '.aiff'):
        return _aiff_info(path)
    with wave.open(str(path)) as w:
        return w.getframerate(), w.getnchannels(), w.getnframes()


def duration_seconds(path: Path) -> float:
    sr, _, frames = wav_info(path)
    return frames / sr


class BpmResult(NamedTuple):
    bpm: float
    n_beats: int
    anchor_ms: float           # timestamp of beat[0] (first synthesized beat)
    aubio_scatter_rms_ms: float  # RMS of raw aubio timestamps vs regression line;
    # measures aubio's detection scatter, NOT musical alignment accuracy.
    # The synthesized PQTZ entries are by construction on the regression line,
    # so their own internal residual is only integer-ms rounding (~0.3ms).
    # Musical alignment (is beat[0] actually a downbeat?) is unvalidated.


_ENV_HOP = 256
_ENV_NFFT = 1024


def _onset_envelope_full(mono, sr: int):
    """Reference implementation: the whole (frames x NFFT) matrix at once (~2.5 GiB peak on a 6.5-minute track). Kept for the equivalence tests and as the
    documentation of the algorithm; the default is the blocked version below, which is bit-identical (tests/test_analysis_lowmem.py, scripts/analysis_adopt_check.py)."""
    import numpy as np
    n = (len(mono) - _ENV_NFFT) // _ENV_HOP
    idx = np.arange(_ENV_NFFT)[None, :] + _ENV_HOP * np.arange(n)[:, None]
    spec = np.abs(np.fft.rfft(mono[idx] * np.hanning(_ENV_NFFT), axis=1))
    freqs = np.fft.rfftfreq(_ENV_NFFT, 1.0 / sr)

    def flux(s):
        f = np.maximum(s[1:] - s[:-1], 0).sum(1)
        f = f - np.convolve(f, np.ones(43) / 43, "same")
        return np.maximum(f, 0)

    broad = flux(np.log1p(100 * spec))
    kick = flux(np.log1p(100 * spec[:, freqs < 150]))
    return broad, kick, sr / _ENV_HOP


def _onset_envelope(mono, sr: int, block_frames: int = 2048):
    """Spectral-flux onset envelope. Returns (broadband, kick<150Hz, fps).

    Computed in frame blocks (one frame carried across block edges) so peak memory is ~0.8 GiB instead of ~2.5 GiB on a 6.5-minute track; the result is
    bit-identical to _onset_envelope_full (max |diff| 0.0 on all ten development tracks; identical analyse_beats output; frozen v18 reproduced byte-for-byte).
    """
    import numpy as np
    x = np.asarray(mono)
    n = (len(x) - _ENV_NFFT) // _ENV_HOP
    win = np.hanning(_ENV_NFFT)
    kmask = np.fft.rfftfreq(_ENV_NFFT, 1.0 / sr) < 150
    broad_flux = np.empty(max(n - 1, 0))
    kick_flux = np.empty(max(n - 1, 0))
    prev_b = prev_k = None
    pos = 0
    for s in range(0, n, block_frames):
        e = min(s + block_frames, n)
        idx = np.arange(_ENV_NFFT)[None, :] + _ENV_HOP * np.arange(s, e)[:, None]
        spec = np.abs(np.fft.rfft(x[idx] * win, axis=1))
        lb = np.log1p(100 * spec)
        lk = np.log1p(100 * spec[:, kmask])
        if prev_b is not None:
            lb = np.vstack([prev_b, lb])
            lk = np.vstack([prev_k, lk])
        fb = np.maximum(lb[1:] - lb[:-1], 0).sum(1)
        fk = np.maximum(lk[1:] - lk[:-1], 0).sum(1)
        broad_flux[pos:pos + len(fb)] = fb
        kick_flux[pos:pos + len(fk)] = fk
        pos += len(fb)
        prev_b, prev_k = lb[-1:].copy(), lk[-1:].copy()

    def finish(f):
        f = f - np.convolve(f, np.ones(43) / 43, "same")
        return np.maximum(f, 0)

    return finish(broad_flux), finish(kick_flux), sr / _ENV_HOP


def _tempo_scores(env, fps, bpms):
    """Fourier tempogram magnitude at each candidate BPM (fundamental + 0.5 x 2nd harmonic).

    Same sums as evaluating one frequency at a time, computed in blocks so the
    phase matrix stays small. Results are identical up to floating-point order.
    """
    import numpy as np
    t = np.arange(len(env)) / fps
    out = np.empty(len(bpms))
    step = 64
    for i in range(0, len(bpms), step):
        f = np.asarray(bpms[i:i + step]) / 60.0
        ph = np.exp(-2j * np.pi * np.outer(f, t))
        out[i:i + step] = np.abs(ph @ env) + 0.5 * np.abs((ph * ph) @ env)
    return out


def estimate_tempo(env, fps, lo: float = 70.0, hi: float = 180.0) -> float:
    """Fine-resolution tempo from the onset envelope (Fourier tempogram).

    Coarse 0.1 BPM scan over [lo, hi], then 0.005 BPM refinement. Sub-BPM
    resolution is what the old aubio-IBI estimate lacked (it quantised near
    hop-size multiples and landed 0.5-3 BPM off). The result is NOT rounded to
    integers: tracks with fractional tempo keep it.
    """
    import numpy as np
    coarse = np.arange(lo, hi, 0.1)
    b0 = coarse[int(np.argmax(_tempo_scores(env, fps, coarse)))]
    fine = np.arange(b0 - 0.3, b0 + 0.3, 0.005)
    return float(fine[int(np.argmax(_tempo_scores(env, fps, fine)))])


_BANDS = {
    "kick": ("low", 200),
    "hats": ("band", (2000, 8000)),
}


def _band_envelope(mono, sr: int, band: str):
    """Zero-phase band-pass, rectify, 1 ms smoothing. Expensive: compute once per file."""
    import numpy as np
    from scipy.signal import butter, sosfiltfilt
    kind, fc = _BANDS[band]
    env = np.abs(sosfiltfilt(butter(4, fc, kind, fs=sr, output="sos"), mono))
    k = max(1, int(sr * 0.001))
    return np.convolve(env, np.ones(k) / k, "same")


def _attack_times(mono, sr: int, centers_s, win_s: float = 0.06, band: str = "kick", env=None):
    """Attack time (s) in one frequency band near each expected beat.

    Zero-phase filtering (no group delay), rectify, 1 ms smoothing. The attack
    is the last upward crossing of 10% of the way from the window floor to the
    window peak before that peak: dense mixes keep the low band energised
    between kicks, so a fixed fraction of the peak is meaningless. A threshold
    crossing is used rather than max-rise because max-rise lags by an amount
    that depends on the sound (measured +0..+22 ms on synthetic kicks), whereas
    the crossing stays within about -5..0 ms. No STFT frame/centre convention
    is involved.
    """
    import numpy as np
    if env is None:
        env = _band_envelope(mono, sr, band)
    w = int(win_s * sr)
    out = []
    for c in centers_s:
        i = int(round(c * sr))
        if i - w < 0 or i + w >= len(env):
            continue
        seg = env[i - w:i + w]
        lo_v, hi_v = float(seg.min()), float(seg.max())
        if hi_v - lo_v <= 1e-4 or hi_v < 2.0 * lo_v:
            continue
        pk = int(np.argmax(seg))
        below = np.nonzero(seg[:pk + 1] <= lo_v + 0.1 * (hi_v - lo_v))[0]
        out.append((i - w + (int(below[-1]) + 1 if len(below) else 0)) / sr)
    return np.array(out)


def _refine_band(mono, sr: int, per: float, ph0: float, band: str, env=None):
    """Iteratively align a grid to one band's attacks. Returns (phase, conf)."""
    import numpy as np
    if env is None:
        env = _band_envelope(mono, sr, band)
    ph = ph0
    win = min(0.06, per / 4)
    for _ in range(4):
        n = int((len(mono) / sr - ph) / per)
        att = _attack_times(mono, sr, ph + per * np.arange(n), win, band, env)
        if len(att) < 20:
            return ph, 0.0
        resid = att - (ph + np.round((att - ph) / per) * per)
        ph = (ph + float(np.median(resid))) % per
    n = int((len(mono) / sr - ph) / per)
    att = _attack_times(mono, sr, ph + per * np.arange(n), win, band, env)
    if len(att) < 20:
        return ph, 0.0
    resid = att - (ph + np.round((att - ph) / per) * per)
    return ph, float(np.mean(np.abs(resid) < 0.015))


@dataclass
class PhaseResult:
    phase_s: float          # grid offset in [0, period)
    status: str             # "corroborated" | "kick_only" | "uncertain"
    kick_conf: float
    hat_conf: float
    band_gap_ms: float      # signed hat-minus-kick phase difference, mod one beat


# Kick and hat grids that agree this closely are treated as the same beat.
_BAND_AGREE_S = 0.040
_MIN_CONF = 0.5


def _grid_phase(env, fps, bpm: float, mono, sr: int, band_env: dict | None = None) -> PhaseResult:
    """Beat phase from sample-domain attacks in two independent bands.

    Coarse phase from the onset envelope, refined separately on the kick band
    (<200 Hz) and the hat band (2-8 kHz). Two independent bands agreeing within
    40 ms corroborate the phase (reported as the mean of the two). Otherwise the
    better-supported band is used only when its confidence is >= 0.5, and the
    result is flagged so callers never present it as established.
    Downbeats are NOT inferred here.
    """
    import numpy as np
    per = 60.0 / bpm
    best_s, ph0 = -1.0, 0.0
    for ph in np.arange(0.0, per, 0.002):
        ii = (np.arange(ph, len(env) / fps, per) * fps).round().astype(int)
        ii = ii[(ii > 1) & (ii < len(env) - 2)]
        s_ = float((env[ii - 1] + 2 * env[ii] + env[ii + 1]).sum())
        if s_ > best_s:
            best_s, ph0 = s_, float(ph)
    be = band_env or {b: _band_envelope(mono, sr, b) for b in _BANDS}
    kp, kc = _refine_band(mono, sr, per, ph0, "kick", be["kick"])
    hp, hc = _refine_band(mono, sr, per, kp, "hats", be["hats"])
    gap = ((hp - kp + per / 2) % per) - per / 2
    if abs(gap) <= _BAND_AGREE_S and kc >= _MIN_CONF * 0.5 and hc >= _MIN_CONF:
        w = kc / (kc + hc)
        return PhaseResult((kp + (1 - w) * gap) % per, "corroborated", kc, hc, gap * 1000)
    best = (kp, kc) if kc >= hc else (hp, hc)
    status = "kick_only" if best[1] >= _MIN_CONF and best[0] == kp else "uncertain"
    if best[1] < _MIN_CONF:
        status = "uncertain"
    return PhaseResult(best[0], status, kc, hc, gap * 1000)


def segment_drift_ms(mono, sr: int, bpm: float, phase_s: float, nseg: int = 8, band_env: dict | None = None) -> dict[str, list[float | None]]:
    """Per-segment median attack-minus-grid residual (ms), for kick and hats.

    Measured from sample-domain attacks against the exported grid. Flat values
    mean the constant-tempo grid holds across the track; a steady slope means
    tempo error. (An earlier Fourier-phase version reported spurious ~190 ms
    jumps from phase wrapping and was removed.) None = too few attacks.
    """
    import numpy as np
    per = 60.0 / bpm
    n = int((len(mono) / sr - phase_s) / per)
    grid = phase_s + per * np.arange(n)
    out: dict[str, list[float | None]] = {}
    for band in _BANDS:
        row: list[float | None] = []
        for k in range(nseg):
            g = grid[k * n // nseg:(k + 1) * n // nseg]
            att = _attack_times(mono, sr, g, min(0.06, per / 4), band, (band_env or {}).get(band))
            if len(att) < 8:
                row.append(None)
                continue
            near = np.array([g[int(np.argmin(np.abs(g - a)))] for a in att])
            row.append(round(float(np.median(att - near)) * 1000, 1))
        out[band] = row
    return out


@dataclass
class BeatAnalysis:
    bpm: float
    beats: list[BeatEntry]
    phase: PhaseResult | None
    downbeat: str = "not_detected"   # bar position is an arbitrary origin, never "detected"
    drift_ms: dict | None = None


def analyse_beats(path: Path, mono_sr: tuple | None = None) -> BeatAnalysis:
    """Tempo, beat grid, phase evidence and per-segment drift for one file.

    Tempo: Fourier tempogram over the broadband onset envelope, 0.005 BPM
    resolution. Phase: _grid_phase() (two-band, sample-domain attacks).
    beat_number cycles 1-4 from the first grid beat: that is an ARBITRARY bar
    origin. `downbeat` stays "not_detected"; do not present it otherwise.
    """
    try:
        if mono_sr is not None:
            mono, sr = mono_sr
        else:
            from .waveform import _read_mono_float32
            mono, sr = _read_mono_float32(Path(path))
        if len(mono) < sr * 10:
            return BeatAnalysis(0.0, [], None)
        broad, kick, fps = _onset_envelope(mono, sr)
        bpm = estimate_tempo(broad, fps)
        del broad
        per = 60.0 / bpm
        be = {b: _band_envelope(mono, sr, b) for b in _BANDS}
        pr = _grid_phase(kick, fps, bpm, mono, sr, be)
        del kick
        drift_ms = segment_drift_ms(mono, sr, bpm, pr.phase_s, band_env=be)
        del be

        bpm100 = round(bpm * 100)
        total_s = len(mono) / sr
        entries: list[BeatEntry] = []
        n = 0
        t = pr.phase_s
        while t <= total_s:
            entries.append(BeatEntry(beat_number=(n % 4) + 1, tempo_bpm100=bpm100,
                                     time_ms=round(t * 1000)))
            n += 1
            t = pr.phase_s + n * per
        return BeatAnalysis(round(bpm, 3), entries, pr, drift_ms=drift_ms)
    except Exception:
        return BeatAnalysis(0.0, [], None)


def detect_beats(path: Path, hop_size: int = 512) -> tuple[float, list[BeatEntry]]:
    """Compatibility wrapper: (bpm, beat_entries). See analyse_beats()."""
    a = analyse_beats(path)
    return a.bpm, a.beats


def detect_beats_raw(path: Path, hop_size: int = 512) -> tuple[float, list[float], BpmResult]:
    """Return (bpm, raw_aubio_timestamps_s, quality_metrics) for diagnostics."""
    if not _AUBIO_AVAILABLE:
        return 0.0, [], BpmResult(0.0, 0, 0.0, 0.0)

    import numpy as np

    src = aubio.source(str(path), 0, hop_size)
    tempo_detector = aubio.tempo("default", hop_size * 4, hop_size, src.samplerate)

    beat_times: list[float] = []
    while True:
        samples, read = src()
        if tempo_detector(samples):
            beat_times.append(tempo_detector.get_last_s())
        if read < hop_size:
            break

    if len(beat_times) < 4:
        return 0.0, [], BpmResult(0.0, 0, 0.0, 0.0)

    t_arr = np.array(beat_times)
    n_arr = np.arange(len(t_arr))
    slope, intercept = np.polyfit(n_arr, t_arr, 1)
    bpm = round(60.0 / slope, 2) if slope > 0 else 0.0

    ideal = intercept + slope * n_arr
    rms_ms = float(np.sqrt(np.mean(((t_arr - ideal) * 1000) ** 2)))
    metrics = BpmResult(bpm, len(beat_times), float(t_arr[0] * 1000), rms_ms)
    return bpm, beat_times, metrics
