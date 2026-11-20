"""Local evaluation only: score unfitted PWV4 byte 3-5 rules vs the official sections (3 development tracks; no hold-out)."""
import sys
from pathlib import Path
import numpy as np
from scipy.signal import butter, sosfiltfilt
sys.path.insert(0, str(Path(__file__).resolve().parent))
from eval_pwv4_frames import *

V13 = ROOT / "desktop_v13_waveform/PIONEER/USBANLZ"

def cols(mono, sr, lo_hi, kind):
    e = np.round(np.arange(1201) * len(mono) / 1200).astype(int)
    out = []
    for lo, hi in lo_hi:
        s = butter(4, hi, "low", fs=sr, output="sos") if lo is None else butter(4, [lo, hi], "band", fs=sr, output="sos") if hi else butter(4, lo, "high", fs=sr, output="sos")
        y = sosfiltfilt(s, mono)
        out.append(np.array([np.abs(y[a:b]).max() if kind == "peak" else np.sqrt((y[a:b]**2).mean()) for a, b in zip(e[:-1], e[1:])]))
    return np.stack(out, 1)

def norm127(x): return np.clip(np.round(127 * x / x.max()), 0, 127)

def score(tag, pred, off):
    mae = [np.abs(pred[:, i] - off[:, 3+i]).mean() for i in range(3)]
    rr = [r(pred[:, i], off[:, 3+i]) for i in range(3)]
    hi = (pred.argmax(1) == 2).mean(); ohi = (off[:, 3:6].argmax(1) == 2).mean()
    st = np.abs(np.diff(pred[:, 2])).mean(); ost = np.abs(np.diff(off[:, 5])).mean()
    print(f"   {tag:28s} MAE {mae[0]:5.1f} {mae[1]:5.1f} {mae[2]:5.1f} | r {rr[0]:.2f} {rr[1]:.2f} {rr[2]:.2f} | high-strongest {hi:.2f} (off {ohi:.2f}) | b5 step {st:4.1f} (off {ost:4.1f})")

if __name__ == "__main__":
    from rekordbox_pdb.pdb import Database
    db = Database.from_file(ROOT / "desktop_v13_waveform/PIONEER/rekordbox/export.pdb")
    V13P = {n: ROOT / "desktop_v13_waveform" / Path(t.analyze_path).relative_to("/").with_name("ANLZ0000.EXT")
            for t in db.tracks for n in TR if t.filename.startswith(n)}
    B3 = [(None, 200), (200, 2000), (2000, None)]
    for name in TR:
        mono, sr, off = load(name)
        print(name)
        v13 = pwv4(V13P[name]).astype(float)
        score("v13 file (regression fit)", v13[:, 3:6], off)
        pk = cols(mono, sr, B3, "peak"); rms = cols(mono, sr, B3, "rms")
        score("A band peaks /global max", norm127(pk), off)
        score("B band peaks, each own max", np.stack([norm127(pk[:, i]) for i in range(3)], 1), off)
        # C: per-band peak normalised by that band's track-wide 95th pct, clipped (bands are not in a common unit)
        c = np.stack([np.clip(127 * pk[:, i] / np.percentile(pk[:, i], 95), 0, 127) for i in range(3)], 1)
        score("C band peaks / own p95", np.round(c), off)
        # D: peaks with spectral-density (per-Hz) weighting: divide by sqrt(bandwidth) (200, 1800, ~sr/2-2000)
        bw = np.sqrt(np.array([200., 1800., sr / 2 - 2000.]))
        score("D peaks / sqrt(bandwidth)", norm127(pk / bw), off)
        score("E band RMS /global max", norm127(rms), off)
