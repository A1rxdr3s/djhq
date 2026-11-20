"""Hash-linked analysis sidecar (one JSON per library), compatible with the existing GRIDS.json layout.

Per track (keyed by file name, linked by audio SHA-256):
  "sha256"   : hash of the analysed audio
  "auto"     : existing grid fields (bpm, anchor_ms, bar_origin, ...) - read by grid.effective_grid; this module never rewrites them
  "analysis" : {"<analysis_version>": {run record}} - RAW predictions + parameters + versions of every run, appended, never overwritten
  "manual"   : user overrides: bpm, anchor_ms, bar_origin (existing keys, used by grid.effective_grid) and the NEW "key"; each manual field carries
               provenance in "manual_meta": {"<field>": {"by": "user", "at": ISO time, "analysis_version": "...", "note": "..."}}

Rules (tested):
  * re-analysis appends a run record and refreshes "auto"; it never touches "manual" or "manual_meta";
  * if the audio hash changed, the entry is marked stale: the old analysis and overrides are KEPT under "stale" (nothing is deleted), the new
    hash is stored, "manual" is NOT applied to the new audio (overrides apply only to the audio they were made for);
  * an override can only be set for a track whose current hash is known; reading an override for different audio raises (existing behaviour).
"""
from __future__ import annotations

import datetime as _dt
import json
from pathlib import Path

from . import ANALYSIS_VERSION

MANUAL_FIELDS = ("bpm", "anchor_ms", "bar_origin", "key")


def _now() -> str:
    return _dt.datetime.now(_dt.timezone.utc).isoformat(timespec="seconds")


def load(path: Path) -> dict:
    p = Path(path)
    return json.loads(p.read_text()) if p.exists() else {}


def save(path: Path, data: dict) -> None:
    Path(path).write_text(json.dumps(data, indent=2, sort_keys=False))


def record_analysis(data: dict, filename: str, sha256: str, run: dict, auto: dict | None = None, version: str = ANALYSIS_VERSION) -> dict:
    """Add/refresh the automatic result for a track. Preserves manual overrides; flags stale audio.

    Returns the entry. If the stored hash differs from sha256 the previous state is moved under "stale" (appended list) and manual overrides
    are detached from the active entry (kept in the stale record) because they were made for different audio.
    """
    e = data.setdefault(filename, {})
    old = e.get("sha256")
    if old and old != sha256:
        e.setdefault("stale", []).append({"sha256": old, "retired_at": _now(), "auto": e.get("auto"), "analysis": e.get("analysis"),
                                          "manual": e.get("manual"), "manual_meta": e.get("manual_meta")})
        for k in ("analysis", "manual", "manual_meta"):
            e.pop(k, None)
    e["sha256"] = sha256
    if auto is not None:
        e["auto"] = auto
    e.setdefault("analysis", {})[version + "@" + run.get("run_id", _now())] = run
    return e


def set_manual(data: dict, filename: str, sha256: str, version: str = ANALYSIS_VERSION, note: str = "", **fields) -> dict:
    """Set manual override fields with provenance. Refuses unknown fields, unknown tracks and audio whose hash does not match the entry."""
    e = data.get(filename)
    if e is None:
        raise KeyError(f"unknown track {filename!r}")
    if e.get("sha256") != sha256:
        raise ValueError(f"override for {filename} refused: audio hash differs from the analysed audio")
    bad = set(fields) - set(MANUAL_FIELDS)
    if bad:
        raise ValueError(f"unsupported manual fields: {sorted(bad)}")
    m, meta = e.setdefault("manual", {}), e.setdefault("manual_meta", {})
    for k, v in fields.items():
        m[k] = v
        meta[k] = {"by": "user", "at": _now(), "analysis_version": version, "note": note}
    return e


def clear_manual(data: dict, filename: str, *names: str) -> None:
    e = data[filename]
    for n in (names or list(e.get("manual", {}))):
        e.get("manual", {}).pop(n, None)
        e.get("manual_meta", {}).pop(n, None)


def is_stale(data: dict, filename: str, current_sha256: str) -> bool:
    e = data.get(filename)
    return bool(e) and e.get("sha256") != current_sha256


def set_key(data: dict, filename: str, sha256: str, key: str, note: str = "", version: str = ANALYSIS_VERSION) -> dict:
    """Manual key override. Accepts a key name ('D minor', 'F# major') or a Camelot code ('7A'); stored in the canonical Camelot form with the entered text kept
    in the provenance note. Refused when the text is not a key, or the audio hash differs (same rules as every manual field)."""
    from . import keys as K
    pk = K.parse_key(key)
    if pk is None:
        raise ValueError(f"not a key: {key!r}")
    return set_manual(data, filename, sha256, version=version, note=(note + f" [entered as {key!r}]").strip(), key=K.camelot(*pk))


def effective_key(entry: dict, detected: dict | None) -> dict | None:
    """Manual key (if any) wins; the detected/auto key is kept visible. Returned dict says which is which."""
    man = (entry.get("manual") or {}).get("key")
    if man:
        return {"value": man, "source": "manual", "auto": detected}
    return {"value": detected, "source": "auto"} if detected else None
