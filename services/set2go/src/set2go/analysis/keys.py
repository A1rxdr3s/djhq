"""Musical key naming, relations and a permissive chroma-based estimator (second opinion next to libKeyFinder).

Keys are (tonic pitch class 0-11 with C=0, mode "major"|"minor"). Camelot follows the standard wheel used elsewhere in the project.
Relations between an estimate and a reference are reported as SEPARATE categories, never folded into "exact":
  exact | parallel (same tonic, other mode) | relative (relative major/minor = same Camelot number, other letter) |
  fifth (neighbouring Camelot number, same letter = a perfect fifth apart, same mode) | semitone (tonic one semitone apart, same mode) | other
"""
from __future__ import annotations

import numpy as np

NOTE_NAMES = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"]
_ALIASES = {"C#": "Db", "D#": "Eb", "Gb": "F#", "G#": "Ab", "A#": "Bb", "Cb": "B", "Fb": "E", "E#": "F", "B#": "C"}
# Camelot numbers: major keys 8B=C, then +7 semitones (a fifth) per step; minor 8A=A minor
_CAM_MAJOR = {0: 8, 7: 9, 2: 10, 9: 11, 4: 12, 11: 1, 6: 2, 1: 3, 8: 4, 3: 5, 10: 6, 5: 7}     # pitch class -> number
_CAM_MINOR = {(pc - 3) % 12: n for pc, n in _CAM_MAJOR.items()}                               # relative minor: tonic = major tonic - 3 semitones, same number


def parse_key(s: str) -> tuple[int, str] | None:
    """'D minor' / 'Dm' / 'F# major' / 'Eb minor' -> (tonic, mode). Camelot codes ('7A') are parsed too."""
    s = s.strip()
    if not s:
        return None
    if s[-1].upper() in "AB" and s[:-1].isdigit() and 1 <= int(s[:-1]) <= 12:
        n, mode = int(s[:-1]), ("minor" if s[-1].upper() == "A" else "major")
        table = _CAM_MINOR if mode == "minor" else _CAM_MAJOR
        for pc, num in table.items():
            if num == n:
                return pc, mode
    parts = s.replace("♭", "b").replace("♯", "#").split()
    name = parts[0]
    name = name[0].upper() + name[1:]
    mode = "major"
    if len(parts) > 1:
        mode = "minor" if parts[1].lower().startswith("min") or parts[1] == "m" else "major"
    elif name.endswith("m") and len(name) > 1:
        name, mode = name[:-1], "minor"
    name = _ALIASES.get(name, name)
    if name not in NOTE_NAMES:
        return None
    return NOTE_NAMES.index(name), mode


def camelot(tonic: int, mode: str) -> str:
    return f"{(_CAM_MINOR if mode == 'minor' else _CAM_MAJOR)[tonic % 12]}{'A' if mode == 'minor' else 'B'}"


def key_name(tonic: int, mode: str) -> str:
    return f"{NOTE_NAMES[tonic % 12]} {mode}"


def relation(est: tuple[int, str], ref: tuple[int, str]) -> str:
    (te, me), (tr, mr) = est, ref
    if (te, me) == (tr, mr):
        return "exact"
    if te == tr:
        return "parallel"
    ce, cr = camelot(te, me), camelot(tr, mr)
    if ce[:-1] == cr[:-1]:
        return "relative"
    d = (int(ce[:-1]) - int(cr[:-1])) % 12
    if me == mr and d in (1, 11):
        return "fifth"
    if me == mr and (te - tr) % 12 in (1, 11):
        return "semitone"
    return "other"


# Published key profiles (12 values, tonic first). Krumhansl & Kessler (1982) probe-tone ratings; Temperley (2001, "Cognition of Basic Musical
# Structures") major/minor profiles. Used as published tables; no parameters were fitted to this project's tracks.
KK_MAJOR = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
KK_MINOR = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])
TEMP_MAJOR = np.array([5.0, 2.0, 3.5, 2.0, 4.5, 4.0, 2.0, 4.5, 2.0, 3.5, 1.5, 4.0])
TEMP_MINOR = np.array([5.0, 2.0, 3.5, 4.5, 2.0, 4.0, 2.0, 4.5, 3.5, 2.0, 1.5, 4.0])
PROFILES = {"krumhansl": (KK_MAJOR, KK_MINOR), "temperley": (TEMP_MAJOR, TEMP_MINOR)}


def score_profiles(chroma: np.ndarray, profile: str = "krumhansl") -> np.ndarray:
    """(24,) Pearson correlations of a 12-bin chroma vector against all 24 rotated profiles: indices 0-11 major tonic 0-11, 12-23 minor."""
    maj, mnr = PROFILES[profile]
    c = np.asarray(chroma, float)
    out = np.empty(24)
    for t in range(12):
        out[t] = np.corrcoef(c, np.roll(maj, t))[0, 1]
        out[12 + t] = np.corrcoef(c, np.roll(mnr, t))[0, 1]
    return out


def estimate_from_chroma(chroma: np.ndarray, profile: str = "krumhansl") -> dict:
    """Best key + interpretable quality signals: best score, margin to the runner-up, and the best score of the OTHER mode at the same tonic."""
    s = score_profiles(chroma, profile)
    order = np.argsort(s)[::-1]
    b, r = int(order[0]), int(order[1])
    tonic, mode = (b, "major") if b < 12 else (b - 12, "minor")
    par = s[(tonic + 12) if mode == "major" else tonic]       # same tonic, other mode
    return {"tonic": tonic, "mode": mode, "name": key_name(tonic, mode), "camelot": camelot(tonic, mode), "profile": profile,
            "score": float(s[b]), "margin_to_second": float(s[b] - s[r]),
            "second": (key_name(*((r, "major") if r < 12 else (r - 12, "minor")))),
            "parallel_mode_score": float(par), "parallel_gap": float(s[b] - par)}


def chroma_from_audio(mono: np.ndarray, sr: int, fmin: float = 65.0, fmax: float = 2100.0, n_fft: int = 16384, hop: int = 8192,
                      max_frames: int = 300, harmonic_weight: float = 0.5) -> tuple[np.ndarray, dict]:
    """Track-level 12-bin chroma from SPECTRAL PEAKS (not raw bins).

    Per frame, local maxima of the magnitude spectrum inside [fmin, fmax] are picked and refined by parabolic interpolation; each peak adds its
    (log-compressed) magnitude to the pitch class of its refined frequency, weighted by 1/(1+rank) over harmonics is NOT used - instead a simple
    harmonic suppression removes a peak that sits near 2x or 3x of a stronger peak in the same frame (its energy is attributed to the
    fundamental), scaled by `harmonic_weight` (0 = full suppression, 1 = none). Tuning is the circular mean of the peaks' deviations from the nearest
    semitone (cents), estimated from the track's own peaks and then removed, not searched.
    Frames: up to max_frames evenly spaced; n_fft=16384 at 22.05/44.1 kHz resolves semitones above ~65 Hz.
    """
    x = np.asarray(mono, np.float32)
    win = np.hanning(n_fft).astype(np.float32)
    nfr = max(1, 1 + (len(x) - n_fft) // hop)
    idx = np.unique(np.linspace(0, nfr - 1, min(max_frames, nfr)).astype(int))
    freqs = np.fft.rfftfreq(n_fft, 1.0 / sr)
    df = freqs[1]
    lo, hi = int(fmin / df), int(fmax / df)
    midis, mags = [], []
    for i in idx:
        seg = x[i * hop:i * hop + n_fft]
        if len(seg) < n_fft:
            seg = np.pad(seg, (0, n_fft - len(seg)))
        sp = np.abs(np.fft.rfft(seg * win))
        a = sp[lo - 1:hi + 2]
        c = a[1:-1]
        pk = np.nonzero((c > a[:-2]) & (c >= a[2:]) & (c > c.max() * 0.02))[0]
        if len(pk) == 0:
            continue
        al, be, ga = np.log(a[pk] + 1e-12), np.log(a[pk + 1] + 1e-12), np.log(a[pk + 2] + 1e-12)
        den = (al - 2 * be + ga)
        off = np.where(np.abs(den) > 1e-12, 0.5 * (al - ga) / den, 0.0)
        f = (lo + pk + off) * df
        m = np.log1p(c[pk] / c.max() * 100.0)
        # harmonic suppression inside the frame
        order = np.argsort(-m)
        keep = m.copy()
        for r in order:
            for h in (2, 3):
                near = np.abs(f / h - f[r]) < 0.03 * f[r] / 1.0
                near &= (m < m[r]) & (np.arange(len(f)) != r)
                keep[near] *= harmonic_weight
        midis.append(69 + 12 * np.log2(f / 440.0))
        mags.append(keep)
    if not midis:
        return np.ones(12) / 12, {"error": "no spectral peaks"}
    midi, w = np.concatenate(midis), np.concatenate(mags)
    dev = midi - np.round(midi)                                       # semitone deviation of each peak
    ang = 2 * np.pi * dev
    tune = float(np.angle(np.sum(w * np.exp(1j * ang))) / (2 * np.pi))            # circular mean, in semitones
    cents = tune * 100.0
    midi_c = midi - tune
    pc = np.round(midi_c).astype(int) % 12
    chroma = np.bincount(pc, weights=w, minlength=12).astype(float)
    return chroma / max(chroma.sum(), 1e-12), {"tuning_cents": round(cents, 1), "fmin": fmin, "fmax": fmax, "n_fft": n_fft, "hop": hop,
                                               "frames": int(len(idx)), "harmonic_weight": harmonic_weight, "n_peaks": int(len(midi))}
