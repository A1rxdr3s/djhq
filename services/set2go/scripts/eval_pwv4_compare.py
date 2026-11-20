"""Local evaluation only: v13 / v16 / v17 PWV4 files vs the official sections. File measurements; no photo-derived values. 3 development tracks."""
import sys
from pathlib import Path
import numpy as np
sys.path.insert(0, str(Path(__file__).resolve().parent))
from eval_pwv4_b5blend import *
from rekordbox_pdb.pdb import Database

def ext(tree, name):
    db = Database.from_file(ROOT / tree / "PIONEER/rekordbox/export.pdb")
    t = next(t for t in db.tracks if t.filename.startswith(name))
    return pwv4(ROOT / tree / Path(t.analyze_path).relative_to("/").with_name("ANLZ0000.EXT")).astype(float)

if __name__ == "__main__":
    for name in TR:
        mono, sr, off = load(name)
        print(name)
        for tag, tree in (("v13", "desktop_v13_waveform"), ("v16", "desktop_v16_pwv4"), ("v17", "desktop_v17_pwv4")):
            x = ext(tree, name)
            print(f"  {tag}: high-strongest {np.mean(x[:,3:6].argmax(1)==2):.2f} (off {np.mean(off[:,3:6].argmax(1)==2):.2f}) | mean b3/b4/b5 {x[:,3].mean():.0f}/{x[:,4].mean():.0f}/{x[:,5].mean():.0f} (off {off[:,3].mean():.0f}/{off[:,4].mean():.0f}/{off[:,5].mean():.0f})")
            for b in (3, 4, 5):
                print(f"     b{b}", q(x[:, b], off[:, b]))
