"""Reference store for the analysis evaluation. Evidence kinds are kept APART and never merged into one "truth":

  tag        embedded metadata (TKEY/TBPM/title prefix). A reference CANDIDATE only: its origin (which program wrote it, whether a person checked it)
             is unknown here, so a tag is never ground truth by itself.
  official   analysis exported by rekordbox for the same audio (preserved reference export). A comparison reference, not a human label.
  user       explicit labels supplied by the user (the only kind that is called "labelled" in reports).
  mik        Mixed In Key values supplied by the user (a comparison reference, never ground truth).

Tracks are identified by audio SHA-256. Each track belongs to a split: "development" (used while building/tuning) or "independent" (never used
for any tuning). The report states n per split and refuses to call anything generalisation without independent tracks.

File format (analysis_refs/<name>.json):
  {"tracks": {"<sha256>": {"filename": "...", "split": "development|independent",
      "labels": {"user": {"bpm": 128.0, "key": "D minor", "downbeat_beat_in_bar_at_anchor": 1, "anchor_ms": 14.9, "note": "..."},
                 "mik":  {"bpm": 128, "key": "7A"}}}}}
"""
from __future__ import annotations

import hashlib
import json
import struct
from pathlib import Path

import numpy as np

KINDS = ("user", "mik")


def sha256_file(path: Path, chunk: int = 1 << 20) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for b in iter(lambda: f.read(chunk), b""):
            h.update(b)
    return h.hexdigest()


def load_refs(path: Path | None) -> dict:
    if path is None or not Path(path).exists():
        return {"tracks": {}}
    d = json.loads(Path(path).read_text())
    for sha, t in d.get("tracks", {}).items():
        if t.get("split") not in ("development", "independent"):
            raise ValueError(f"{sha[:12]}: split must be 'development' or 'independent'")
    return d


def tags_for(path: Path) -> dict:
    """Embedded candidates, with their provenance, from the existing metadata/key readers (no truth claim)."""
    from ..metadata import read_metadata
    from ..key_detect import read_embedded_key
    m = read_metadata(path)
    k = read_embedded_key(path)
    out = {"tkey": m.key_tag or None, "tbpm": m.bpm_tag or None}
    if k is not None:
        out["key"] = {"name": k.key_name, "camelot": k.camelot, "source": k.source}
    try:
        out["tbpm_value"] = float(m.bpm_tag) if m.bpm_tag else None
    except ValueError:
        out["tbpm_value"] = None
    return out


def official_pqtz(anlz_dat: Path) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """(beat times s, beat numbers, tempo bpm) from a rekordbox ANLZ DAT PQTZ section (comparison reference)."""
    d = Path(anlz_dat).read_bytes()
    off = struct.unpack_from(">I", d, 4)[0]
    while off < len(d):
        t = d[off:off + 4]
        lh, lt = struct.unpack_from(">II", d, off + 4)
        if t == b"PQTZ":
            body = d[off + lh:off + lt]
            q = [struct.unpack_from(">HHI", body, i * 8) for i in range(len(body) // 8)]
            return (np.array([x[2] for x in q]) / 1000.0, np.array([x[0] for x in q]), np.array([x[1] for x in q]) / 100.0)
        off += lt
    raise ValueError("no PQTZ")


def read_mik_annotations(path: Path) -> dict | None:
    """Stored Mixed In Key annotations from an audio file's ID3 tag (read-only; the file is never modified).

    Evidence read, kept separately, none treated as ground truth:
      geob_key        GEOB:Key payload (base64 JSON {source, key, algorithm})  -> self-declared provenance
      geob_beatgrid   GEOB:BeatGrid payload ({source, tempo, algorithm, beats[]}) -> tempo and beat TIMES (no downbeat/bar information)
      geob_energy / geob_cues  GEOB:Energy / GEOB:CuePoints (energy level, energy-section cues; not used for scoring here)
      tkey, tbpm, title_prefix  plain tags that may or may not have been written by the same program
    Provenance label per field: "mixedinkey_self_declared" when the payload says source == "mixedinkey" (a program-written marker; it cannot exclude a
    later manual edit inside that program), else "unknown_origin". Conflicts between sources are preserved in `conflicts`, never silently resolved.
    Returns None if the file has no ID3 tag.
    """
    import base64
    import re
    if Path(path).suffix.lower() == ".flac":
        return _read_mik_flac(Path(path))
    from ..metadata import _open_tags
    tags = _open_tags(Path(path))
    if tags is None:
        return None

    def geob(name: str):
        fr = tags.get("GEOB:" + name)
        if fr is None:
            return None
        try:
            return json.loads(base64.b64decode(bytes(fr.data)))
        except Exception:
            return {"_unreadable": True}

    def txt(frame: str):
        fr = tags.get(frame)
        try:
            return str(fr.text[0]).strip() or None if fr is not None else None
        except Exception:
            return None

    key_p, grid_p, en_p, cue_p = geob("Key"), geob("BeatGrid"), geob("Energy"), geob("CuePoints")
    title = txt("TIT2") or ""
    m = re.match(r"^(\d{1,2}[AB])\s*-\s*(\d)\s*-", title)
    out: dict = {"fields": {"tkey": txt("TKEY"), "tbpm": txt("TBPM"), "title_prefix_key": m.group(1) if m else None,
                            "title_prefix_energy": int(m.group(2)) if m else None, "txxx_energylevel": txt("TXXX:EnergyLevel")},
                 "geob": {}, "provenance": {}, "conflicts": []}
    sd = lambda p: "mixedinkey_self_declared" if (p and p.get("source") == "mixedinkey") else "unknown_origin"
    if key_p and not key_p.get("_unreadable"):
        out["geob"]["key"] = {"key": key_p.get("key"), "algorithm": key_p.get("algorithm"), "source": key_p.get("source")}
        out["provenance"]["key"] = sd(key_p)
    if grid_p and not grid_p.get("_unreadable"):
        beats = np.asarray(grid_p.get("beats", []), float)
        out["geob"]["beatgrid"] = {"tempo": grid_p.get("tempo"), "algorithm": grid_p.get("algorithm"), "source": grid_p.get("source"),
                                   "n_beats": int(len(beats)), "first_beat_s": float(beats[0]) if len(beats) else None,
                                   "last_beat_s": float(beats[-1]) if len(beats) else None,
                                   "interval_sd_ms": float(np.diff(beats).std() * 1000) if len(beats) > 2 else None,
                                   "beat_times_s": [round(float(b), 6) for b in beats]}
        out["provenance"]["tempo"] = sd(grid_p)
    if en_p and not en_p.get("_unreadable"):
        out["geob"]["energy"] = {"level": en_p.get("energyLevel"), "algorithm": en_p.get("algorithm"), "source": en_p.get("source")}
    if cue_p and not cue_p.get("_unreadable"):
        out["geob"]["cues"] = {"n": len(cue_p.get("cues", [])), "source": cue_p.get("source"), "kind": "energy-section cues"}
    # best stored value per quantity: the payload when present, else the plain tag (labelled accordingly)
    key_vals = {k: v for k, v in (("geob_key", out["geob"].get("key", {}).get("key")), ("tkey", out["fields"]["tkey"]),
                                  ("title_prefix", out["fields"]["title_prefix_key"])) if v}
    if len(set(key_vals.values())) > 1:
        out["conflicts"].append({"quantity": "key", "values": key_vals})
    out["stored_key"] = {"value": next(iter(key_vals.values()), None), "from": next(iter(key_vals), None),
                         "provenance": out["provenance"].get("key", "unknown_origin" if key_vals else None)}
    bpm_vals = {}
    if out["geob"].get("beatgrid", {}).get("tempo") is not None:
        bpm_vals["geob_tempo"] = float(out["geob"]["beatgrid"]["tempo"])
    if out["fields"]["tbpm"]:
        try:
            bpm_vals["tbpm"] = float(out["fields"]["tbpm"])
        except ValueError:
            pass
    if len(bpm_vals) > 1 and abs(bpm_vals.get("geob_tempo", 0) - bpm_vals.get("tbpm", 0)) > 0.5:
        out["conflicts"].append({"quantity": "bpm", "values": bpm_vals})
    out["stored_bpm"] = {"value": bpm_vals.get("geob_tempo", bpm_vals.get("tbpm")), "from": "geob_tempo" if "geob_tempo" in bpm_vals else ("tbpm" if bpm_vals else None),
                         "provenance": out["provenance"].get("tempo", "unknown_origin" if bpm_vals else None), "all": bpm_vals}
    return out


def _read_mik_flac(path: Path) -> dict | None:
    """FLAC variant of read_mik_annotations: Mixed In Key stores the same JSON payloads as base64 text in Vorbis comment fields
    (KEY, BEATGRID, ENERGY, CUEPOINTS) next to plain INITIALKEY / BPM / ENERGYLEVEL. Same provenance rules; the file is only read."""
    import base64
    from mutagen.flac import FLAC
    f = FLAC(str(path))
    if not f.tags:
        return None
    t = {k.upper(): v for k, v in f.tags}

    def one(name):
        v = t.get(name)
        return (str(v[0]).strip() if isinstance(v, list) else str(v).strip()) if v else None

    def js(name):
        raw = one(name)
        if not raw:
            return None
        try:
            return json.loads(base64.b64decode(raw))
        except Exception:
            return {"_unreadable": True}

    key_p, grid_p, en_p, cue_p = js("KEY"), js("BEATGRID"), js("ENERGY"), js("CUEPOINTS")
    out: dict = {"fields": {"tkey": one("INITIALKEY"), "tbpm": one("BPM"), "title_prefix_key": None, "title_prefix_energy": None,
                            "txxx_energylevel": one("ENERGYLEVEL")}, "geob": {}, "provenance": {}, "conflicts": []}
    sd = lambda p: "mixedinkey_self_declared" if (p and p.get("source") == "mixedinkey") else "unknown_origin"
    if key_p and not key_p.get("_unreadable"):
        out["geob"]["key"] = {"key": key_p.get("key"), "algorithm": key_p.get("algorithm"), "source": key_p.get("source")}
        out["provenance"]["key"] = sd(key_p)
    if grid_p and not grid_p.get("_unreadable"):
        beats = np.asarray(grid_p.get("beats", []), float)
        out["geob"]["beatgrid"] = {"tempo": grid_p.get("tempo"), "algorithm": grid_p.get("algorithm"), "source": grid_p.get("source"), "n_beats": int(len(beats)),
                                   "first_beat_s": float(beats[0]) if len(beats) else None, "last_beat_s": float(beats[-1]) if len(beats) else None,
                                   "interval_sd_ms": float(np.diff(beats).std() * 1000) if len(beats) > 2 else None, "beat_times_s": [round(float(b), 6) for b in beats]}
        out["provenance"]["tempo"] = sd(grid_p)
    if en_p and not en_p.get("_unreadable"):
        out["geob"]["energy"] = {"level": en_p.get("energyLevel"), "algorithm": en_p.get("algorithm"), "source": en_p.get("source")}
    if cue_p and not cue_p.get("_unreadable"):
        out["geob"]["cues"] = {"n": len(cue_p.get("cues", [])), "source": cue_p.get("source"), "kind": "energy-section cues"}
    key_vals = {k: v for k, v in (("geob_key", out["geob"].get("key", {}).get("key")), ("tkey", out["fields"]["tkey"])) if v}
    if len(set(key_vals.values())) > 1:
        out["conflicts"].append({"quantity": "key", "values": key_vals})
    out["stored_key"] = {"value": next(iter(key_vals.values()), None), "from": next(iter(key_vals), None),
                         "provenance": out["provenance"].get("key", "unknown_origin" if key_vals else None)}
    bpm_vals = {}
    if out["geob"].get("beatgrid", {}).get("tempo") is not None:
        bpm_vals["geob_tempo"] = float(out["geob"]["beatgrid"]["tempo"])
    if out["fields"]["tbpm"]:
        try:
            bpm_vals["tbpm"] = float(out["fields"]["tbpm"])
        except ValueError:
            pass
    if len(bpm_vals) > 1 and abs(bpm_vals.get("geob_tempo", 0) - bpm_vals.get("tbpm", 0)) > 0.5:
        out["conflicts"].append({"quantity": "bpm", "values": bpm_vals})
    out["stored_bpm"] = {"value": bpm_vals.get("geob_tempo", bpm_vals.get("tbpm")), "from": "geob_tempo" if "geob_tempo" in bpm_vals else ("tbpm" if bpm_vals else None),
                         "provenance": out["provenance"].get("tempo", "unknown_origin" if bpm_vals else None), "all": bpm_vals}
    return out
