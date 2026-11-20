#!/usr/bin/env python3
"""Preserve and verify USB evidence. No audio is copied; changed/new files are copied in full.

    uv run scripts/usb_evidence.py snapshot <mount> <baseline_manifest> <out_dir>   # write evidence
    uv run scripts/usb_evidence.py verify   <mount_or_none> <out_dir>               # re-verify evidence

Design rules (each fixes a real earlier failure):
  * File lists are JSON, never newline-split text, so a missing final newline cannot drop the last file.
  * Every file listed as changed MUST exist in the evidence and hash-match; the snapshot fails otherwise.
  * Only project-owned content is considered (PIONEER/, Contents/); macOS metadata (.Spotlight-V100, .fseventsd,
    .Trashes, ._*, .DS_Store) is ignored and never touched.
  * The evidence directory is made read-only only AFTER it verifies.
"""
import hashlib
import json
import os
import shutil
import stat
import sys
from pathlib import Path

OWNED = ("PIONEER", "Contents")


def sha(p: Path) -> str:
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for c in iter(lambda: f.read(1 << 20), b""):
            h.update(c)
    return h.hexdigest()


def owned_manifest(root: Path) -> dict[str, str]:
    out = {}
    for top in OWNED:
        base = root / top
        if not base.is_dir():
            continue
        for p in sorted(base.rglob("*")):
            if p.is_file() and not p.name.startswith("._") and p.name != ".DS_Store":
                out[p.relative_to(root).as_posix()] = sha(p)
    return out


def read_baseline(path: Path) -> dict[str, str]:
    out = {}
    for line in Path(path).read_text().splitlines():
        if line.strip():
            h, f = line.split("  ", 1)
            out[f.strip().removeprefix("./")] = h
    return out


def snapshot(mount: Path, baseline: Path, out: Path) -> dict:
    live = owned_manifest(mount)
    base = read_baseline(baseline)
    changed = sorted(k for k in live if base.get(k) != live[k])
    missing = sorted(k for k in base if k not in live)
    out.mkdir(parents=True, exist_ok=False)
    (out / "usb_manifest.json").write_text(json.dumps(live, indent=1, sort_keys=True))
    for rel in changed:
        dst = out / "changed_files" / rel
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(mount / rel, dst)
    rec = {"baseline": str(baseline), "n_files": len(live), "changed": changed, "missing_vs_baseline": missing}
    (out / "evidence.json").write_text(json.dumps(rec, indent=1))
    verify(out, mount)                                   # raises if any required file is absent or mismatched
    for p in [out, *out.rglob("*")]:
        os.chmod(p, os.stat(p).st_mode & ~(stat.S_IWUSR | stat.S_IWGRP | stat.S_IWOTH))
    return rec


def verify(out: Path, mount: Path | None = None) -> None:
    rec = json.loads((out / "evidence.json").read_text())
    live = json.loads((out / "usb_manifest.json").read_text())
    for rel in rec["changed"]:
        f = out / "changed_files" / rel
        if not f.is_file():
            raise SystemExit(f"EVIDENCE INCOMPLETE: {rel} was listed as changed but is not in {out}")
        if sha(f) != live[rel]:
            raise SystemExit(f"EVIDENCE CORRUPT: {rel} does not match the recorded hash")
    extra = sorted(str(p.relative_to(out / 'changed_files')) for p in (out / "changed_files").rglob("*")
                   if p.is_file()) if (out / "changed_files").is_dir() else []
    if sorted(extra) != sorted(rec["changed"]):
        raise SystemExit("EVIDENCE MISMATCH: changed_files does not equal the changed list")
    if mount is not None and owned_manifest(mount) != live:
        raise SystemExit("USB no longer matches the evidence manifest")


if __name__ == "__main__":
    cmd = sys.argv[1]
    if cmd == "snapshot":
        r = snapshot(Path(sys.argv[2]), Path(sys.argv[3]), Path(sys.argv[4]))
        print(f"evidence OK: {r['n_files']} files, {len(r['changed'])} changed copied and verified: {r['changed']}")
    elif cmd == "verify":
        verify(Path(sys.argv[3]), Path(sys.argv[2]) if sys.argv[2] != "none" else None)
        print("evidence OK")
