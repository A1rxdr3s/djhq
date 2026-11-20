#!/usr/bin/env python3
"""Read rekordbox beat-grid references from a rekordbox EXPORT folder (USB-style: PIONEER/USBANLZ + Contents). Read-only; never touches a live rekordbox database or a USB.

    .venv/bin/python scripts/analysis_rekordbox_grid.py <export_root> [--inventory eval/analysis/blind1/inventory.json] [--out refs.json]

For every ANLZ0000.DAT under <export_root>/PIONEER/USBANLZ: reads PPTH (the audio path inside the export) and PQTZ (beat times, beat-in-bar numbers, per-beat tempo). The audio file
named by PPTH is located under <export_root>/Contents and linked to the blind inventory by DECODED-PCM hash (never by file name), so a renamed or retagged file still links; a track
whose audio is not in the inventory is listed as unlinked. Output per linked track: PQTZ beat times, beat numbers, median tempo, first-beat time and the bar-origin convention
(the beat number at the first beat). rekordbox's grid is a COMPARISON reference (the downbeat is rekordbox's own convention), not ground truth."""
import argparse, hashlib, json, struct, sys
from pathlib import Path
import numpy as np
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))
from set2go.analysis import refs as R
from set2go.waveform import _read_mono_float32


def sections(d: bytes):
    off = struct.unpack_from(">I", d, 4)[0]
    while off < len(d):
        lh, lt = struct.unpack_from(">II", d, off + 4)
        yield d[off:off + 4].decode(), d[off + lh:off + lt]
        off += lt


def read_dat(p: Path) -> dict:
    secs = dict(sections(p.read_bytes()))
    out = {"dat": str(p), "sections": sorted(secs)}
    if "PPTH" in secs:
        out["ppth"] = secs["PPTH"][:-2].decode("utf-16-be")
    if "PQTZ" in secs:
        body = secs["PQTZ"]
        q = [struct.unpack_from(">HHI", body, i * 8) for i in range(len(body) // 8)]
        out["beat_numbers"] = [x[0] for x in q]; out["tempo_bpm"] = [x[1] / 100 for x in q]; out["beat_times_s"] = [x[2] / 1000 for x in q]
    return out


def is_mounted_volume(root: Path) -> bool:
    """True if the path, as given OR after resolving symlinks, lies under /Volumes (a mounted device)."""
    return str(root).startswith("/Volumes/") or str(Path(root).resolve()).startswith("/Volumes/")


def main() -> int:
    ap = argparse.ArgumentParser(); ap.add_argument("root", type=Path); ap.add_argument("--inventory", type=Path, default=ROOT / "eval/analysis/blind1/inventory.json"); ap.add_argument("--out", type=Path)
    a = ap.parse_args()
    if is_mounted_volume(a.root):                                           # a mounted volume: never read it while rekordbox may still be writing to it
        import subprocess
        r = subprocess.run(["pgrep", "-il", "rekordbox"], capture_output=True, text=True)
        if r.stdout.strip():
            print(f"error: rekordbox is running ({r.stdout.strip().splitlines()[0]}); close it before reading {a.root} (a partial export could be captured)", file=sys.stderr); return 2
    anlz = a.root / "PIONEER/USBANLZ"
    if not anlz.is_dir():
        print(f"error: {anlz} not found: pass the export ROOT (the folder that contains PIONEER/ and Contents/)", file=sys.stderr); return 2
    inv = {e["decoded_pcm_sha256"]: e for e in json.loads(a.inventory.read_text())["files"]}
    res, unlinked = {}, []
    for dat in sorted(anlz.rglob("ANLZ0000.DAT")):
        g = read_dat(dat)
        if "ppth" not in g or "beat_times_s" not in g:
            unlinked.append({"dat": str(dat), "reason": "no PPTH or PQTZ"}); continue
        audio = a.root / g["ppth"].lstrip("/")
        if not audio.is_file():
            unlinked.append({"dat": str(dat), "ppth": g["ppth"], "reason": "audio named by PPTH not found in the export"}); continue
        m, sr = _read_mono_float32(audio); h = hashlib.sha256(m.tobytes()).hexdigest()
        if h not in inv:
            unlinked.append({"dat": str(dat), "ppth": g["ppth"], "reason": "decoded audio is not in the blind inventory (re-encoded, or another track)"}); continue
        e = inv[h]; t = np.array(g["beat_times_s"]); nums = g["beat_numbers"]
        res[e["file"]] = {"linked_by": "decoded_pcm_sha256", "export_audio": str(audio), "ppth": g["ppth"], "n_beats": len(t), "first_beat_s": float(t[0]), "last_beat_s": float(t[-1]),
                          "first_beat_number": nums[0], "median_tempo_bpm": float(np.median(g["tempo_bpm"])), "tempo_changes": int(len(set(g["tempo_bpm"])) - 1),
                          "beat_times_s": [round(x, 4) for x in t], "beat_numbers": nums, "dat_sections": g["sections"]}
    out = {"export_root": str(a.root), "linked": res, "unlinked": unlinked, "convention": "PQTZ beat number 1 = rekordbox's downbeat; the grid is a comparison reference, not ground truth"}
    if a.out: a.out.write_text(json.dumps(out, indent=1))
    for k, v in res.items(): print(f"LINKED {k[:50]:51s} {v['n_beats']} beats, median {v['median_tempo_bpm']:.2f} BPM, first beat {v['first_beat_s']:.3f}s = beat number {v['first_beat_number']}, tempo changes {v['tempo_changes']}")
    for u in unlinked: print("UNLINKED", u.get("ppth") or u["dat"], "-", u["reason"])
    print(f"{len(res)} linked, {len(unlinked)} unlinked")
    return 0


if __name__ == "__main__":
    sys.exit(main())
