#!/usr/bin/env python3
"""Link files that were later processed by Mixed In Key / rekordbox back to their BLIND-run identity by DECODED-PCM hash (read-only on every file).

    .venv/bin/python scripts/analysis_blind_link.py <folder_with_processed_copies> [--inventory eval/analysis/blind1/inventory.json]

Byte hashes change when an app rewrites tags; the decoded PCM does not change unless the app re-encodes or resamples the audio. For every audio file in the folder the decoded
mono float32 PCM hash is compared with the blind inventory: MATCH (same audio, tags may differ), NO MATCH (audio changed or an unknown file). A file whose duration and sample rate
match but PCM differs is reported as 'AUDIO CHANGED' (re-encoded/resampled/trimmed): its references must NOT be linked to the blind predictions without a human decision.
Nothing is written except an optional --out JSON; no tag is modified."""
import argparse, json, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))
import hashlib
from set2go.waveform import _read_mono_float32
EXTS = (".aif", ".aiff", ".wav", ".flac")

ap = argparse.ArgumentParser(); ap.add_argument("folder", type=Path); ap.add_argument("--inventory", type=Path, default=ROOT / "eval/analysis/blind1/inventory.json"); ap.add_argument("--out", type=Path)
a = ap.parse_args()
inv = {e["decoded_pcm_sha256"]: e for e in json.loads(a.inventory.read_text())["files"]}
by_dur = {round(e["duration_s"], 1): e for e in inv.values()}
rows, bad = [], 0
for p in sorted(x for x in a.folder.iterdir() if x.is_file() and x.suffix.lower() in EXTS and not x.name.startswith(".")):
    m, sr = _read_mono_float32(p); h = hashlib.sha256(m.tobytes()).hexdigest()
    if h in inv:
        e = inv[h]; rows.append({"file": p.name, "status": "MATCH", "blind_identity": e["file"], "bytes_changed": hashlib.sha256(p.read_bytes()).hexdigest() != e["sha256"]})
    else:
        near = by_dur.get(round(len(m) / sr, 1)); bad += 1
        rows.append({"file": p.name, "status": "AUDIO CHANGED" if near else "NO MATCH", "possible_blind_identity": near["file"] if near else None})
for r in rows: print(f"{r['status']:14s} {r['file'][:60]:61s} -> {r.get('blind_identity') or r.get('possible_blind_identity') or '-'}" + (" (tags/bytes differ, audio identical)" if r.get("bytes_changed") else ""))
print(f"{len(rows)} files; {bad} not linked" + ("" if not bad else " -> do NOT attach references to the blind predictions for those"))
if a.out: a.out.write_text(json.dumps(rows, indent=1))
sys.exit(1 if bad else 0)
