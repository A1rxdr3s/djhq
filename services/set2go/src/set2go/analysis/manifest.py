"""Source manifest for an opt-in analysis export: the verifier's ONLY source of truth for an export built from arbitrary files (no hardcoded folder).

A manifest (JSON, written next to the export as <out>_MANIFEST.json) records, per exported track, in playlist order:
  source.path        resolved absolute path of the selected source file
  source.sha256      hash of that file's bytes (identity; the basename is NOT an identity)
  destination        "Contents/<basename>" (the exporter's destination; basename uniqueness is enforced here)
  device_path        "/Contents/<basename>" (what the PDB and PPTH must contain)
  expected_key       {"camelot", "name", "origin", "provenance", "backend"?} or null (no key); origin is manual | imported | predicted
  key_layers         the imported/predicted values at export time (for the record; the verifier checks only expected_key)
Playlists: {"<name>": [index into tracks, ...]} so the same file can appear in several playlists.
Hash-linked: the manifest stores the sha256 of the key map it was built from and its own format version.
"""
from __future__ import annotations

import json
from pathlib import Path

from . import refs as R

FORMAT = 1


class SourceConflict(ValueError):
    pass


def dedupe_sources(paths: list[Path], sha256_out: dict[str, str] | None = None) -> tuple[list[Path], list[str]]:
    """Resolve and collapse identical resolved paths (reported); refuse DIFFERENT files that share a basename (they would collide on Contents/<basename>),
    naming both paths and hashes. Identical bytes under different basenames are allowed (distinct destinations) and noted."""
    seen_path: dict[Path, Path] = {}
    by_name: dict[str, Path] = {}
    notes: list[str] = []
    out: list[Path] = []
    for p in paths:
        rp = Path(p).resolve()
        if not rp.is_file():
            raise SourceConflict(f"not a file: {p}")
        if rp in seen_path:
            notes.append(f"same file selected more than once, collapsed: {rp}")
            continue
        other = by_name.get(rp.name)
        if other is not None:
            raise SourceConflict(f"two different source files share the basename {rp.name!r} and would collide on Contents/{rp.name}:\n"
                                 f"  {other}  sha256 {R.sha256_file(other)[:16]}\n  {rp}  sha256 {R.sha256_file(rp)[:16]}\n"
                                 "rename or select only one of them (an export never silently picks one)")
        seen_path[rp] = rp
        by_name[rp.name] = rp
        out.append(rp)
    hashes: dict[str, str] = {}
    for p in out:
        h = R.sha256_file(p)
        if sha256_out is not None:
            sha256_out[p.name] = h
            sha256_out[str(p)] = h
        if h in hashes:
            notes.append(f"identical bytes under different names: {hashes[h]} and {p.name} (kept as two tracks)")
        hashes.setdefault(h, p.name)
    return out, notes


def build(sources: list[Path], playlists: dict[str, list[Path]], effective_keys: dict[str, dict | None], key_layers: dict[str, dict] | None = None,
          analysis_version: str = "", policy: dict | None = None, *, sha256_map: dict[str, str] | None = None,
          expected_grids: dict[str, dict | None] | None = None, excluded_tracks: list[str] | None = None) -> dict:
    """sources: the deduplicated, resolved selection (order = track order). playlists: name -> list of resolved source paths (membership/order)."""
    idx = {Path(p).resolve(): i for i, p in enumerate(sources)}
    tracks = []
    for p in sources:
        n = p.name
        ek = effective_keys.get(n)
        sha = (sha256_map or {}).get(n) or (sha256_map or {}).get(str(p)) or R.sha256_file(p)
        entry = {"source": {"path": str(p), "sha256": sha}, "destination": f"Contents/{n}", "device_path": f"/Contents/{n}",
                 "expected_key": ({"camelot": ek["camelot"], "name": ek["name"], "origin": ek["origin"], **({"backend": ek["backend"]} if ek.get("backend") else {}),
                                   "provenance": _provenance(ek)} if ek else None),
                 "key_layers": (key_layers or {}).get(n)}
        if expected_grids is not None and expected_grids.get(n) is not None:
            entry["expected_grid"] = expected_grids[n]
        tracks.append(entry)
    out = {"format": FORMAT, "analysis_version": analysis_version, "policy": policy, "tracks": tracks,
           "playlists": {name: [idx[Path(p).resolve()] for p in ps] for name, ps in playlists.items()}}
    if excluded_tracks is not None:
        out["excluded_tracks"] = list(excluded_tracks)
    return out


def _provenance(ek: dict) -> str:
    return {"manual": "user override (sidecar, hash-linked)", "imported": "existing annotation read from the source file (not our detection)",
            "predicted": f"audio prediction from {ek.get('backend', 'unknown backend')} (unverified)"}.get(ek["origin"], ek["origin"])


def save(path: Path, manifest: dict) -> None:
    Path(path).write_text(json.dumps(manifest, indent=1))


def load(path: Path) -> dict:
    m = json.loads(Path(path).read_text())
    if m.get("format") != FORMAT:
        raise ValueError(f"unsupported manifest format {m.get('format')!r}")
    names = [Path(t["destination"]).name for t in m["tracks"]]
    if len(names) != len(set(names)):
        raise ValueError("manifest has duplicate destinations")
    return m
