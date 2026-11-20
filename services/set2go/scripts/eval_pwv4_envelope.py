"""Local evaluation only: aligned column-level contour + quiet/loud section contrast of PWV4 candidates vs official (3 development tracks)."""
import sys
from pathlib import Path
import numpy as np
sys.path.insert(0, str(Path(__file__).resolve().parent))
from eval_pwv4_candidates import *
from scipy.ndimage import uniform_filter1d

def sm(x, w=25): return uniform_filter1d(x.astype(float), w, mode="nearest")
def contrast(x, w=25):
    s = sm(x, w); lo, hi = np.percentile(s, [10, 90]); return lo / max(hi, 1e-9)       # quiet/loud ratio of the smoothed envelope
def sec(x, n=24): return np.array([c.mean() for c in np.array_split(x.astype(float), n)])

def feats(mono, sr):
    e = np.round(np.arange(1201) * len(mono) / 1200).astype(int)
    full = np.array([np.abs(mono[a:b]).max() for a, b in zip(e[:-1], e[1:])])
    rms = np.array([np.sqrt((mono[a:b].astype(float)**2).mean()) for a, b in zip(e[:-1], e[1:])])
    bp = cols(mono, sr, [(None, 200), (200, 2000), (2000, None)], "peak")
    return full, rms, bp

if __name__ == "__main__":
    for name in TR:
        mono, sr, off = load(name)
        full, rms, bp = feats(mono, sr)
        print(name, "| official bytes: smoothed quiet/loud (p10/p90) and corr of 25-col smoothed envelope with full-band peak / rms / low-band peak")
        for i in range(6):
            print(f"   b{i}: contrast {contrast(off[:,i]):.2f}  mean {off[:,i].mean():5.1f}  r(full peak) {r(sm(off[:,i]),sm(full)):.2f}  r(rms) {r(sm(off[:,i]),sm(rms)):.2f}  r(low) {r(sm(off[:,i]),sm(bp[:,0])):.2f}")
        print("   signal: contrast full-peak %.2f rms %.2f low %.2f mid %.2f high %.2f" % (contrast(full), contrast(rms), *[contrast(bp[:,i]) for i in range(3)]))
