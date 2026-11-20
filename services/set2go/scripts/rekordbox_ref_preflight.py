#!/usr/bin/env python3
"""Pre-export preservation for the rekordbox REFERENCE export onto the dedicated REKTEST stick. READ-ONLY on the stick: writes only a local evidence folder.

    .venv/bin/python scripts/rekordbox_ref_preflight.py check                     # guards only, no evidence written
    .venv/bin/python scripts/rekordbox_ref_preflight.py snapshot [<baseline>]     # guards + evidence snapshot + verification (default baseline: the v18 manifest)

Refuses (exit 1) unless ALL hold: rekordbox is NOT running; /Volumes/REKTEST is mounted and matches the pinned identity (UUID, size, FAT32, USB, removable, not internal);
the local frozen v18 record and tree verify. `snapshot` then runs the existing usb_evidence.snapshot (manifest of every project-owned file, every file that differs from the
baseline copied in full and hash-verified) into diagnostic/pre_rbexport_<timestamp>/ and re-verifies it against the live stick. Nothing is written, deleted or formatted on the stick.
After the official rekordbox export the stick holds rekordbox's library, NOT v18: restore v18 afterwards ONLY with the guarded scripts/deploy_to_usb.py using the evidence from the
post-export snapshot as the baseline."""
import hashlib, plistlib, subprocess, sys, time
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts")); sys.path.insert(0, str(ROOT / "src"))
import usb_evidence as ue

PIN = {"VolumeName": "REKTEST", "VolumeUUID": "F6FADDE0-C670-3275-9AD8-1C2EC10B9A9F", "Size": 30984372224, "TotalSize": 30969249792, "FilesystemType": "msdos", "BusProtocol": "USB"}
V18 = ROOT / "backups/seedfix_manifest/desktop_v18_consolidated.sha256"


def fail(msg: str) -> None:
    print("REFUSED:", msg); sys.exit(1)


def guards() -> Path:
    r = subprocess.run(["pgrep", "-il", "rekordbox"], capture_output=True, text=True)
    if r.stdout.strip():
        fail(f"rekordbox appears to be running ({r.stdout.strip().splitlines()[0]}): close it first")
    mount = Path("/Volumes/REKTEST")
    if not mount.exists():
        fail("/Volumes/REKTEST is not mounted (plug in the stick; do not use another volume)")
    info = plistlib.loads(subprocess.run(["diskutil", "info", "-plist", str(mount)], check=True, capture_output=True).stdout)
    bad = {k: (info.get(k), v) for k, v in PIN.items() if info.get(k) != v}
    if bad or not info.get("Removable", info.get("RemovableMedia")) or info.get("Internal"):
        fail(f"identity mismatch with the pinned REKTEST stick: {bad} internal={info.get('Internal')}")
    for t, man in (("desktop_v18_consolidated", V18),):                                  # local v18 must be intact BEFORE the stick is touched by anything
        lines = [l.split("  ", 1) for l in man.read_text().splitlines()]
        badf = [f for h, f in lines if hashlib.sha256((ROOT / t / f.lstrip("./")).read_bytes()).hexdigest() != h]
        if badf:
            fail(f"local {t} does not match its manifest ({len(badf)} file(s)): not safe to proceed")
    fz = ROOT / "frozen/desktop_v18_consolidated"
    rows = [l.split("  ", 1) for l in (fz / "FROZEN_FILES.sha256").read_text().splitlines()]
    if [f for h, f in rows if hashlib.sha256((fz / f.lstrip("./")).read_bytes()).hexdigest() != h]:
        fail("frozen v18 record does not verify")
    print(f"guards OK: rekordbox not running; {mount} == pinned REKTEST ({info.get('MountPoint')}, {info.get('ParentWholeDisk')}); local v18 and the frozen record verify")
    return mount


def main() -> int:
    if len(sys.argv) < 2 or sys.argv[1] not in ("check", "snapshot"):
        print(__doc__); return 2
    mount = guards()
    if sys.argv[1] == "check":
        print("check only: nothing written anywhere"); return 0
    base = Path(sys.argv[2]) if len(sys.argv) > 2 else V18
    out = ROOT / f"diagnostic/pre_rbexport_{time.strftime('%Y%m%d_%H%M%S')}"
    rec = ue.snapshot(mount, base, out)
    print(f"evidence OK: {out}\n  {rec['n_files']} project-owned files hashed; {len(rec['changed'])} differ from {base.name} and were copied in full: {rec['changed']}\n  missing vs baseline: {rec['missing_vs_baseline']}")
    ue.verify(out, mount)
    print("re-verified against the live stick: the stick still equals the evidence; nothing was written to it")
    return 0


if __name__ == "__main__":
    sys.exit(main())
