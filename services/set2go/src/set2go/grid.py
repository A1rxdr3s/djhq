"""Editable beat grid: automatic analysis + manual override, with provenance.

A grid is (bpm, anchor_ms, bar_origin). anchor_ms is the time of a beat; bar_origin
is which beat number (1-4) that anchor carries, i.e. where beat one of the bar
sits. Source audio is never modified; overrides live in a JSON sidecar keyed by
the audio file's SHA-256, so an edit can never silently attach to different audio.

    {
      "<filename>": {
        "sha256": "...",
        "auto":   {"bpm": 128.0, "anchor_ms": 3, "bar_origin": 1,
                   "phase_status": "corroborated", "downbeat": "not_detected", ...},
        "manual": {"bpm": 128.0, "anchor_ms": 468, "bar_origin": 2, "note": "..."}   # optional, any key optional
      }
    }

Effective grid = auto, overridden field by field by manual. Every exported track
carries `grid_source` ("auto" | "manual" | "mixed") and a review state in the report:
  "needs_review"  automatic phase uncertain or downbeat undetected and no manual bar_origin
  "reviewed"      the user supplied a manual override (bar_origin at least)
Automatic uncertainty is never cleared by the machine; only a manual override does.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, asdict
from pathlib import Path

from .anlz_writer import BeatEntry


@dataclass
class Grid:
    bpm: float
    anchor_ms: float
    bar_origin: int = 1          # beat number carried by the anchor beat (1-4)
    source: str = "auto"         # auto | manual | mixed
    review: str = "needs_review"
    phase_status: str = "unknown"
    downbeat: str = "not_detected"
    note: str = ""


def beats_from_grid(g: Grid, duration_s: float) -> list[BeatEntry]:
    """Synthesize PQTZ entries: constant tempo from the anchor, backwards and forwards."""
    per_ms = 60000.0 / g.bpm
    bpm100 = round(g.bpm * 100)
    k0 = -int(g.anchor_ms // per_ms)             # first beat with time >= 0
    out: list[BeatEntry] = []
    k = k0
    while True:
        t = g.anchor_ms + k * per_ms
        if t > duration_s * 1000:
            break
        if t >= 0:
            out.append(BeatEntry(beat_number=(g.bar_origin - 1 + k) % 4 + 1,
                                 tempo_bpm100=bpm100, time_ms=round(t)))
        k += 1
    return out


def effective_grid(auto: dict, manual: dict | None) -> Grid:
    m = manual or {}
    bpm = float(m.get("bpm", auto["bpm"]))
    anchor = float(m.get("anchor_ms", auto["anchor_ms"]))
    origin = int(m.get("bar_origin", auto.get("bar_origin", 1)))
    if not 1 <= origin <= 4:
        raise ValueError("bar_origin must be 1-4")
    if not 40 <= bpm <= 250:
        raise ValueError("bpm out of range")
    manual_keys = {k for k in ("bpm", "anchor_ms", "bar_origin") if k in m}
    source = "auto" if not manual_keys else ("manual" if manual_keys == {"bpm", "anchor_ms", "bar_origin"} else "mixed")
    reviewed = "bar_origin" in m          # only a human can establish the bar start
    return Grid(bpm=bpm, anchor_ms=anchor, bar_origin=origin, source=source,
                review="reviewed" if reviewed else "needs_review",
                phase_status=auto.get("phase_status", "unknown"),
                downbeat=auto.get("downbeat", "not_detected") if not reviewed else "manual",
                note=str(m.get("note", "")))


def load_overrides(path: Path | None) -> dict:
    if path is None or not Path(path).exists():
        return {}
    return json.loads(Path(path).read_text())


def manual_for(overrides: dict, filename: str, sha256: str) -> dict | None:
    e = overrides.get(filename)
    if not e or "manual" not in e:
        return None
    if e.get("sha256") and e["sha256"] != sha256:
        raise ValueError(f"override for {filename} was made for different audio (sha256 mismatch)")
    return e["manual"]


def write_sidecar(path: Path, report: dict, sha256_map: dict, existing: dict | None = None) -> None:
    """Write/refresh the sidecar with automatic results; never discards manual entries."""
    out = dict(existing or {})
    for name, r in report.items():
        e = out.setdefault(name, {})
        e["sha256"] = sha256_map[name]
        e["auto"] = r["grid_auto"]
    Path(path).write_text(json.dumps(out, indent=2))
