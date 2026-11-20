"""Local evaluation only: peak^gamma per band (gamma=2 = the exponent already measured for the DETAIL height, not fitted here)."""
import sys
from pathlib import Path
import numpy as np
sys.path.insert(0, str(Path(__file__).resolve().parent))
from eval_pwv4_b5blend import *

if __name__ == "__main__":
    for name in TR:
        mono, sr, off = load(name); bp = feats(mono, sr)[2]; gmax = bp.max()
        print(name)
        for g in (1.0, 1.5, 2.0, 2.5):
            x = 127 * (bp / gmax) ** g
            for b, lab in ((3, "low"), (4, "mid"), (5, "high")):
                print(f"   gamma {g} b{b} {lab:4s}", q(x[:, b-3], off[:, b]))
