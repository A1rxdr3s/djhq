"""Local evaluation only: is v16 byte 5 biased, and do peak/RMS blends keep transients while restoring the envelope?"""
import sys
from pathlib import Path
import numpy as np
sys.path.insert(0, str(Path(__file__).resolve().parent))
from eval_pwv4_b45 import *

def q(x, o):
    s_x, s_o = sm(x), sm(o); n = len(x)
    lo = np.argsort(s_o)[: n // 5]; hi = np.argsort(s_o)[-n // 5:]          # quietest / loudest 20% of columns BY OFFICIAL envelope
    return (f"bias {np.mean(x-o):+5.1f} | quiet20 ours {x[lo].mean():5.1f} off {o[lo].mean():5.1f} | loud20 ours {x[hi].mean():5.1f} off {o[hi].mean():5.1f} | "
            f"q/l ours {x[lo].mean()/x[hi].mean():.2f} off {o[lo].mean()/o[hi].mean():.2f} | env MAE {np.abs(s_x-s_o).mean():5.1f} | step {np.abs(np.diff(x)).mean():4.1f} (off {np.abs(np.diff(o)).mean():4.1f}) | raw r {r(x,o):.2f}")

if __name__ == "__main__":
    for name in TR:
        mono, sr, off = load(name); c = cand(mono, sr); o = off[:, 5]
        e = np.round(np.arange(1201) * len(mono) / 1200).astype(int)
        hp, hr = c["high peak (v16 b5)"], c["high rms"]
        print(name)
        def n(x, ref): return np.clip(127 * x / ref, 0, 127)
        glob = max(c["high peak (v16 b5)"].max(), c["mid peak (v16 b4)"].max(), 1)
        # v16: all three bands share the single strongest peak (our low band is the global max)
        full_max = cand(mono, sr)
        feats_bp = feats(mono, sr)[2]; gmax = feats_bp.max()
        for tag, x in (("v16 (high peak/global max)", n(hp, gmax)),
                       ("high peak / own max", n(hp, hp.max())),
                       ("high rms / own max", n(hr, hr.max())),
                       ("geomean(peak,rms) own max", n(np.sqrt(hp*hr), np.sqrt(hp*hr).max())),
                       ("peak^.5 * rms^.5 *2 (=above) p99", n(np.sqrt(hp*hr), np.percentile(np.sqrt(hp*hr), 99.5)))):
            print(f"   {tag:34s}", q(x, o))
