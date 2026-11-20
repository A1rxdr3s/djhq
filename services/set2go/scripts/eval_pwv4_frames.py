"""Local evaluation only (not production): relate official PWV4 bytes to per-frame signal measures inside each 1200-column grid cell."""
import struct, sys
from pathlib import Path
import numpy as np
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))
from set2go import waveform_v2 as W
from set2go.waveform import _read_mono_float32

REF = ROOT / "reference/rekordbox_official/PIONEER/USBANLZ"
TR = {"Earth": "P00E/000254CE", "Snoop": "P010/00029208", "Zsak": "P074/0001EA48"}

def pwv4(path):
    d = Path(path).read_bytes(); o = struct.unpack_from(">I", d, 4)[0]
    while o < len(d):
        lh, lt = struct.unpack_from(">II", d, o + 4)
        if d[o:o+4] == b"PWV4": return np.frombuffer(d[o+lh:o+lt], np.uint8).reshape(-1, 6)
        o += lt

def load(name):
    f = next(p for p in (ROOT/"test-tracks").iterdir() if p.name.startswith(name))
    mono, sr = _read_mono_float32(f)
    off = pwv4(REF / TR[name] / "ANLZ0000.EXT").astype(float)
    return mono, sr, off

def r(a, b): return float(np.corrcoef(a, b)[0, 1]) if a.std() and b.std() else 0.0

if __name__ == "__main__":
    for name in TR:
        mono, sr, off = load(name)
        n, e = W.frame_edges(len(mono), sr)
        pk = W._frame_peak(mono, e); h = (pk / pk.max()) ** 2
        bp = W.band_peaks(mono, sr, e)
        print(name, "frames", n, "frames/col", n / 1200)
        # frame index for column c, offset k: floor(c*n/1200)+k
        fpc = n / 1200
        base = np.floor(np.arange(1200) * fpc).astype(int)
        for lab, ser, col in (("height^2 b5", h, 5), ("height^2 b3", h, 3), ("low b3", bp[:,0]/bp.max(), 3), ("high b5", bp[:,2]/bp.max(), 5)):
            best = max(((r(ser[np.minimum(base + k, n-1)], off[:, col]), k) for k in range(0, int(fpc) + 1)))
            agg = r(np.array([ser[b:int(b+fpc)].max() for b in base]), off[:, col])
            print(f"  {lab:12s} best single-frame r={best[0]:.3f} at offset {best[1]:2d}; column max r={agg:.3f}")
