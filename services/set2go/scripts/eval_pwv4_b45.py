"""Local evaluation only: byte 4/5 candidate rules, aligned contours + section contrast (development tracks, no hold-out)."""
import sys
from pathlib import Path
import numpy as np
sys.path.insert(0, str(Path(__file__).resolve().parent))
from eval_pwv4_envelope import *
from scipy.signal import butter, sosfiltfilt

def band_rms(mono, sr, e, lo, hi):
    s = butter(4, [lo, hi], "band", fs=sr, output="sos") if lo and hi else butter(4, hi, "low", fs=sr, output="sos") if lo is None else butter(4, lo, "high", fs=sr, output="sos")
    y = sosfiltfilt(s, mono); return np.array([np.sqrt((y[a:b]**2).mean()) for a, b in zip(e[:-1], e[1:])])

def cand(mono, sr):
    e = np.round(np.arange(1201) * len(mono) / 1200).astype(int)
    full, rms, bp = feats(mono, sr)
    hr = band_rms(mono, sr, e, 2000, None); mr = band_rms(mono, sr, e, 200, 2000); lr = band_rms(mono, sr, e, None, 200)
    return {"high peak (v16 b5)": bp[:, 2], "high rms": hr, "mid peak (v16 b4)": bp[:, 1], "mid rms": mr, "full peak": full, "full peak^2": full**2,
            "full rms": rms, "max(band rms)": np.maximum.reduce([lr, mr, hr]), "mid+high rms": np.sqrt(mr**2 + hr**2)}

def row(tag, x, o):
    x = 127 * x / x.max()
    secs_e, secs_o = sec(x), sec(o)
    print(f"   {tag:20s} contrast {contrast(x):.2f} (off {contrast(o):.2f}) | env MAE {np.abs(sm(x)-sm(o)).mean():5.1f} r {r(sm(x),sm(o)):.2f} | 24-section MAE {np.abs(secs_e-secs_o).mean():5.1f} | raw r {r(x,o):.2f} step {np.abs(np.diff(x)).mean():4.1f} (off {np.abs(np.diff(o)).mean():4.1f})")

if __name__ == "__main__":
    for name in TR:
        mono, sr, off = load(name); c = cand(mono, sr)
        for b in (5, 4):
            print(name, f"byte {b}")
            for k, v in c.items(): row(k, v, off[:, b])
