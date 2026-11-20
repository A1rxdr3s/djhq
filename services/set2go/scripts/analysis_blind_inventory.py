#!/usr/bin/env python3
"""Blind-batch inventory (read-only): hashes, formats, durations, duplicate checks against all prior sets, and a PRESENCE-ONLY inspection of analysis metadata.

    .venv/bin/python scripts/analysis_blind_inventory.py <dir> --out eval/analysis/blind1/inventory.json [--against dir ...]

BLINDNESS RULES: the stored key, BPM, beat grid and cue values are NOT read or recorded here. Only the NAMES of metadata frames/fields and, for payload frames, the
declared writer string are listed (so you can see that analysis metadata exists); the values stay unread until the predictions are saved. Filenames are scanned for key/BPM
hints and any hint is recorded as a flag (it is never used as a prediction input). Per file: sha256 of the bytes, sha256 of the DECODED mono float32 PCM (identity that
survives tag edits), container, sample rate, channels, duration. Duplicates are checked by byte hash and by decoded-PCM hash against every file in the --against folders.
"""
import argparse, hashlib, json, re, sys, time
from pathlib import Path
import numpy as np
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))
from set2go.analysis import refs as R
from set2go.waveform import _read_mono_float32
from set2go.bpm_detect import wav_info

EXTS = (".aif", ".aiff", ".wav", ".flac")
HINT = re.compile(r"(^|[\s\[\(\-_])(\d{1,2}[AB])([\s\]\)\-_.]|$)|\b\d{2,3}\s?bpm\b|\b[A-G][b#]?\s?(maj|min|major|minor)\b", re.I)


def meta_presence(p: Path) -> dict:
    """Names only. For ID3 containers: frame names; for FLAC: Vorbis field names. For GEOB payloads only whether a declared writer string is present (value not kept)."""
    out = {"container": None, "fields": [], "analysis_payload_frames": [], "declared_writers": []}
    try:
        if p.suffix.lower() == ".flac":
            from mutagen.flac import FLAC
            f = FLAC(str(p)); out["container"] = "FLAC/Vorbis"; out["fields"] = sorted({k.upper() for k, _ in (f.tags or [])})
            out["analysis_payload_frames"] = [k for k in out["fields"] if k in ("KEY", "BEATGRID", "ENERGY", "CUEPOINTS")]
            return out
        from set2go.metadata import _open_tags
        t = _open_tags(p)
        out["container"] = type(t).__name__ if t is not None else "no ID3"
        if t is not None:
            out["fields"] = sorted(k for k in t.keys() if not k.startswith("APIC"))
            out["analysis_payload_frames"] = [k for k in out["fields"] if k.startswith("GEOB:")]
            import base64
            for k in out["analysis_payload_frames"]:
                try:
                    w = json.loads(base64.b64decode(bytes(t[k].data))).get("source")                 # the declared writer string only
                except Exception:
                    w = None
                if w and w not in out["declared_writers"]:
                    out["declared_writers"].append(w)
    except Exception as e:
        out["error"] = f"{type(e).__name__}: {e}"
    return out


def main() -> int:
    ap = argparse.ArgumentParser(); ap.add_argument("dir", type=Path); ap.add_argument("--out", type=Path, required=True); ap.add_argument("--against", type=Path, nargs="*", default=[])
    a = ap.parse_args()
    files = sorted(p for p in a.dir.iterdir() if p.is_file() and p.suffix.lower() in EXTS and not p.name.startswith("."))
    prior = []
    for d in a.against:
        prior += [p for p in sorted(d.iterdir()) if p.is_file() and p.suffix.lower() in EXTS and not p.name.startswith(".")]
    def pcm_hash(p):
        m, sr = _read_mono_float32(p)
        return hashlib.sha256(m.tobytes()).hexdigest(), len(m) / sr, sr
    prior_rec = {}
    for p in prior:
        h, _, _ = pcm_hash(p); prior_rec[str(p)] = {"sha256": R.sha256_file(p), "pcm_sha256": h}
    rec = []
    for p in files:
        h, dur, sr = pcm_hash(p)
        e = {"file": p.name, "path": str(p.resolve()), "size_bytes": p.stat().st_size, "ext": p.suffix.lower(), "sha256": R.sha256_file(p), "decoded_pcm_sha256": h,
             "duration_s": round(dur, 3), "sample_rate": sr, "filename_hint_flag": bool(HINT.search(p.stem)), "metadata_presence": meta_presence(p)}
        e["duplicate_of_prior_by_bytes"] = [k for k, v in prior_rec.items() if v["sha256"] == e["sha256"]]
        e["duplicate_of_prior_by_pcm"] = [k for k, v in prior_rec.items() if v["pcm_sha256"] == h]
        rec.append(e)
    within = {}
    for e in rec: within.setdefault(e["decoded_pcm_sha256"], []).append(e["file"])
    out = {"created": time.strftime("%Y-%m-%dT%H:%M:%S%z"), "n_files": len(rec), "against_files": len(prior), "duplicates_within_batch": [v for v in within.values() if len(v) > 1],
           "blindness": "stored key/BPM/beatgrid/cue VALUES were not read; only frame names and declared writer strings are recorded", "files": rec}
    a.out.write_text(json.dumps(out, indent=1))
    for e in rec:
        mp = e["metadata_presence"]
        print(f"{e['file'][:48]:49s} {e['ext']:6s} {e['duration_s']:7.1f}s {e['sample_rate']} {e['size_bytes']/1e6:5.1f}MB | dup bytes/pcm: {len(e['duplicate_of_prior_by_bytes'])}/{len(e['duplicate_of_prior_by_pcm'])} | "
              f"payloads: {mp['analysis_payload_frames'] or 'none'} writers {mp['declared_writers'] or '-'} | filename hint: {e['filename_hint_flag']}")
    print("duplicates within batch:", out["duplicates_within_batch"] or "none", "| compared against", len(prior), "prior files")
    return 0


if __name__ == "__main__":
    sys.exit(main())
