#!/usr/bin/env python3
"""Prepare short review windows for the difficult bar-origin cases (read-only on sources; writes only under review/).

    .venv/bin/python scripts/analysis_review_windows.py [--out review/bar_origin]

For each track with unstable downbeats (or no constant grid): for the model's LONGEST minority (half-bar) block and for one stable majority passage, writes
  * a short mono 16-bit WAV excerpt (default 14 s, ~1.2 MB at 44.1 kHz mono -> 22.05 kHz to stay small) with an audible click on every grid beat (a different
    pitch on the beat the model calls beat 1), so you can hear whether the "1" click lands on the first beat of a bar;
  * a JSON card: window start/end in the source, the beat times and the beat-in-bar labels from the model reading and from the alternative (half-bar-shifted)
    reading, and the advisory accent histogram. Nothing is decided here; the card says how to record your answer (grid_tool.py set ... --bar-origin).
The source audio is only read. Output size is bounded (~1.2 MB per window, a few windows).
"""
import argparse, json, struct, sys, wave
from pathlib import Path
import numpy as np
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))
from set2go import rhythm as Rh
from set2go.waveform import _read_mono_float32

ap = argparse.ArgumentParser(); ap.add_argument("--out", default=str(ROOT / "review/bar_origin")); ap.add_argument("--secs", type=float, default=14.0)
ap.add_argument("--run", default=str(ROOT / "eval/analysis/run_dev_mik_lowmem.json")); a = ap.parse_args()
run = json.loads(Path(a.run).read_text())["tracks"]
out = Path(a.out); out.mkdir(parents=True, exist_ok=True)
OUT_SR = 22050


def clicks(n, sr, times, labels, start_s):
    y = np.zeros(n, np.float32)
    for t, lab in zip(times, labels):
        i = int((t - start_s) * sr)
        if i < 0 or i + 400 >= n: continue
        f = 1500.0 if lab == 1 else 800.0                      # higher click = the beat labelled "1"
        k = (np.hanning(400) * np.sin(2 * np.pi * f * np.arange(400) / sr)).astype(np.float32)
        y[i:i + 400] += k * (0.6 if lab == 1 else 0.35)
    return y


def write_wav(path, y, sr):
    pcm = (np.clip(y, -1, 1) * 32767).astype("<i2")
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes(pcm.tobytes())


cards = []
for name, t in run.items():
    r = t["rhythm"]
    ds = r.get("downbeat_stability")
    unstable = (r.get("phase_status") == "model_inconsistent") or (ds and ds.get("majority_share", 1) < 0.9)
    if not unstable:
        continue
    bpm = t["tempo"]["fourier_bpm"]; per = 60 / bpm
    raw = Rh.load_raw(ROOT / "frozen/desktop_v4_rhythm/raw_predictions" / (name + ".json"))
    mono, sr = _read_mono_float32(ROOT / "test-tracks" / name)
    dur = len(mono) / sr
    if r.get("anchor_s") is None:
        # no constant grid: use the model's raw beats around the beat-loss stretch and the model downbeats as the reading
        region = (r["bad_regions_s"][0] if r.get("bad_regions_s") else [dur / 3, dur / 3 + a.secs])
        wins = [("model_lost_the_beat_region", float(region[0]), None)]
        anchor, maj = None, None
    else:
        anchor = r["anchor_s"]; db = np.array(raw.downbeats); ph = np.round((db - anchor) / per).astype(int) % 4
        maj = int(np.bincount(ph, minlength=4).argmax()); mn = ph != maj
        runs = []; i = 0
        while i < len(db):
            if mn[i]:
                j = i
                while j + 1 < len(db) and mn[j + 1]: j += 1
                runs.append((i, j)); i = j + 1
            else: i += 1
        wins = []
        if runs:
            i0, j0 = max(runs, key=lambda x: x[1] - x[0])
            wins.append(("longest_model_minority_block", float(db[i0]) - 2 * per * 4, (i0, j0)))
        ok = np.nonzero(~mn)[0]
        if len(ok):
            mid = ok[len(ok) // 2]; wins.append(("stable_majority_passage", float(db[mid]) - 2 * per * 4, None))
    for kind, start, rr in wins:
        start = max(0.0, min(start, dur - a.secs)); end = start + a.secs
        seg = mono[int(start * sr):int(end * sr)]
        # downsample 2:1 (simple decimation after a 2-point average) to keep files small; this is a listening aid, not an analysis input
        step = max(1, int(round(sr / OUT_SR))); seg = seg[: len(seg) // step * step].reshape(-1, step).mean(1).astype(np.float32); osr = sr // step
        if anchor is not None:
            k0 = int(np.ceil((start - anchor) / per)); k1 = int(np.floor((end - anchor) / per))
            beats = anchor + np.arange(k0, k1 + 1) * per
            lab_model = ((np.arange(k0, k1 + 1) - np.round((np.array(raw.downbeats)[np.argmin(np.abs(np.array(raw.downbeats) - (start + end) / 2))] - anchor) / per)) % 4 + 1).astype(int)
            lab_alt = ((lab_model - 1 + 2) % 4 + 1).astype(int)
            for tag, lab in (("A_model_reading", lab_model), ("B_half_bar_shifted", lab_alt)):
                y = seg * 0.8 + clicks(len(seg), osr, beats, lab, start)
                fn = f"{Path(name).stem[:24].replace(' ', '_')}_{kind}_{int(start)}s_{tag}.wav"
                write_wav(out / fn, y, osr)
        else:
            beats = np.array([b for b in raw.beats if start <= b <= end]); lab_model = np.array([1 if (b in set(raw.downbeats)) else 2 for b in beats])
            y = seg * 0.8 + clicks(len(seg), osr, beats, lab_model, start); fn = f"{Path(name).stem[:24].replace(' ', '_')}_{kind}_{int(start)}s_A_model_reading.wav"
            write_wav(out / fn, y, osr)
        cards.append({"track": name, "window": kind, "start_s": round(start, 2), "end_s": round(end, 2), "bpm": bpm, "grid_anchor_s": anchor,
                      "model_majority_phase": maj, "beat_times_s": [round(float(b), 3) for b in beats][:64],
                      "model_reading_beat_in_bar": [int(x) for x in lab_model][:64], "files": sorted(p.name for p in out.glob(Path(name).stem[:24].replace(' ', '_') + f"_{kind}_{int(start)}s_*.wav")),
                      "how_to_answer": "Listen for which click is the FIRST beat of a bar (the high click is the beat the reading calls 1). If the 'B' file's high click lands on the bar start, "
                                       "the model reading is half a bar off here. Record the bar origin with: grid_tool.py set <export>_GRIDS.json \"<filename>\" --bar-origin N (N = beat number carried by the anchor beat)."})
(out / "review_cards.json").write_text(json.dumps(cards, indent=1))
sz = sum(p.stat().st_size for p in out.glob("*.wav"))
print(f"{len(cards)} window cards, {len(list(out.glob('*.wav')))} wav files, {sz/1e6:.1f} MB in {out}")
for c in cards: print(" ", c["track"][:30], c["window"], f"{c['start_s']}-{c['end_s']}s", len(c["files"]), "files")
