#!/usr/bin/env python3
"""Validate beat grids as WRITTEN in an export's PQTZ (not from analysis JSON). Report only; nothing is modified.

    uv run scripts/validate_grid_export.py <export_dir> [--json out.json]

Per track: tempo (PQTZ vs PDB vs Fourier), spacing regularity, hat-band attack residual (an independent measure),
bar numbering (beat_number cycle) and, for the 3 reference tracks, offset to the preserved official grid.
"""
import json, struct, sys
from pathlib import Path
import numpy as np
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))
from rekordbox_pdb.pdb import Database
from set2go import bpm_detect as B
from set2go.export import _anlz_dirs
from set2go.waveform import _read_mono_float32

OFF = {"Earth n Days": "P00E/000254CE", "Snoop Dogg": "P010/00029208", "Zsak": "P074/0001EA48"}


def pqtz(p: Path):
    d = p.read_bytes(); off = struct.unpack_from(">I", d, 4)[0]
    while off < len(d):
        lh, lt = struct.unpack_from(">II", d, off + 4)
        if d[off:off + 4] == b"PQTZ":
            b = d[off + lh:off + lt]; return [struct.unpack_from(">HHI", b, i * 8) for i in range(len(b) // 8)]
        off += lt


def main():
    ex = Path(sys.argv[1]); db = Database.from_file(ex / "PIONEER/rekordbox/export.pdb")
    sidecar = ex.parent / f"{ex.name}_GRIDS.json"
    meta = json.loads(sidecar.read_text()) if sidecar.exists() else {}
    res = {}
    for t in db.tracks:
        name = Path(t.file_path).name; hi, lo = _anlz_dirs(t.file_path)
        q = pqtz(ex / "PIONEER/USBANLZ" / hi / lo / "ANLZ0000.DAT")
        times = np.array([b[2] for b in q]) / 1000; nums = [b[0] for b in q]; bpm100 = {b[1] for b in q}
        mono, sr = _read_mono_float32(ROOT / "test-tracks" / name)
        broad, kick, fps = B._onset_envelope(mono, sr); fourier = B.estimate_tempo(broad, fps)
        span_bpm = 60 * (len(times) - 1) / (times[-1] - times[0])
        ibi = np.diff(times) * 1000; per = 60000 / (next(iter(bpm100)) / 100)
        cyc_ok = all(nums[i] == (nums[0] - 1 + i) % 4 + 1 for i in range(len(nums)))
        he = B._band_envelope(mono, sr, "hats")
        att = B._attack_times(mono, sr, times[10:-10], 0.04, "hats", he)
        near = np.array([times[10:-10][np.argmin(abs(times[10:-10] - a))] for a in att])
        hat = float(np.median(att - near) * 1000)
        seg = [float(np.median((att - near)[i * len(att) // 6:(i + 1) * len(att) // 6]) * 1000) for i in range(6)]
        e = {"pqtz_bpm": next(iter(bpm100)) / 100, "pdb_bpm": t.tempo / 100, "fourier_bpm": round(fourier, 3),
             "span_bpm": round(span_bpm, 3), "ibi_max_dev_ms": round(float(np.abs(ibi - per).max()), 1),
             "first_beat_ms": int(times[0] * 1000), "first_beat_number": nums[0], "bar_cycle_consistent": cyc_ok,
             "hat_residual_ms": round(hat, 1), "hat_residual_start_to_end_ms": [round(x, 1) for x in seg],
             "grid_review": (meta.get(name, {}).get("auto", {}) or {}).get("phase_status"),
             "downbeat": (meta.get(name, {}).get("auto", {}) or {}).get("downbeat")}
        for k, d in OFF.items():
            if name.startswith(k.split()[0]):
                o = [b[2] for b in pqtz(ROOT / "reference/rekordbox_official/PIONEER/USBANLZ" / d / "ANLZ0000.DAT")]
                oq = pqtz(ROOT / "reference/rekordbox_official/PIONEER/USBANLZ" / d / "ANLZ0000.DAT")
                mt = times * 1000
                e["official_minus_exported_ms"] = [round(o[i] - float(mt[int(np.argmin(abs(mt - o[i])))]), 1) for i in (10, len(o) // 2, len(o) - 10)]
                t1 = [b[2] for b in oq if b[0] == 1][0]; j = int(np.argmin(abs(mt - t1)))
                e["official_beat1_lands_on_exported_beat_number"] = nums[j]
        res[name] = e
    for n, e in res.items():
        flag = []
        if e["pqtz_bpm"] != e["pdb_bpm"]: flag.append("PQTZ!=PDB tempo")
        if abs(e["span_bpm"] - e["pqtz_bpm"]) > 0.02: flag.append("span tempo off")
        if not e["bar_cycle_consistent"]: flag.append("bar cycle broken")
        print(f"{n[:22]:22} bpm pqtz {e['pqtz_bpm']:8.3f} pdb {e['pdb_bpm']:8.2f} fourier {e['fourier_bpm']:8.3f} span {e['span_bpm']:8.3f} | "
              f"hat {e['hat_residual_ms']:+6.1f} ms ({e['hat_residual_start_to_end_ms'][0]:+.0f}..{e['hat_residual_start_to_end_ms'][-1]:+.0f}) | "
              f"first beat {e['first_beat_ms']:5d} ms #{e['first_beat_number']} | {e['grid_review']} | {str(e['downbeat'])[:34]}"
              + (f" | OFFICIAL {e['official_minus_exported_ms']} beat1->#{e['official_beat1_lands_on_exported_beat_number']}" if "official_minus_exported_ms" in e else "")
              + (f"  !! {flag}" if flag else ""))
    if "--json" in sys.argv: Path(sys.argv[sys.argv.index("--json") + 1]).write_text(json.dumps(res, indent=1))


if __name__ == "__main__":
    main()
