#!/usr/bin/env python3
"""Replace the project-owned test content (PIONEER/, Contents/) of the dedicated REKTEST USB with a local export.

    uv run scripts/deploy_to_usb.py <export_dir> --baseline=<manifest> [--yes] [--diagnostic-experimental=<reason>]
        [--plan=<json>] [--allow-tombstones]    # verification flags for diagnostic exports with a different plan / official-derived PDB

Safety:
  * Aborts unless the mounted volume matches the pinned REKTEST identity (UUID, size, fs, USB, removable)
    and rekordbox is not running. Identity is re-pinned immediately before any deletion.
  * Verifies the local export (scripts/verify_export.py --exact) first.
  * Preserves the current USB state via scripts/usb_evidence.py (manifest + every changed/new file in full)
    and refuses to continue unless that evidence verifies.
  * Deletes ONLY <mount>/PIONEER and <mount>/Contents. It never touches .Spotlight-V100, .fseventsd, .Trashes,
    ._* or any other macOS folder, and never formats.
  * Copies, then verifies the USB's project-owned file set and every sha256 against the export, writes the
    post-write manifest to a NEW diagnostic/ directory, and ejects.
  * Experimental candidates (<export>_EXPERIMENTAL.txt) are refused unless --diagnostic-experimental=<reason>
    is given. That option is narrow: it still prints the marker text, stores it with the written manifest, and
    does not change any other check.
"""
import datetime
import plistlib
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
import usb_evidence as ue

PIN = {"VolumeName": "REKTEST", "VolumeUUID": "F6FADDE0-C670-3275-9AD8-1C2EC10B9A9F",
       "Size": 30984372224, "TotalSize": 30969249792, "FilesystemType": "msdos", "BusProtocol": "USB"}
OWNED = ue.OWNED                              # ("PIONEER", "Contents"), the only things this script may delete


def arg(name: str) -> str | None:
    for a in sys.argv:
        if a.startswith(name + "="):
            return a.split("=", 1)[1]
    return None


def identify() -> tuple[Path, str]:
    mount = Path("/Volumes/REKTEST")
    if not mount.exists():
        sys.exit("ABORT: /Volumes/REKTEST not mounted")
    info = plistlib.loads(subprocess.run(["diskutil", "info", "-plist", str(mount)], check=True, capture_output=True).stdout)
    got = {k: info.get(k) for k in PIN}
    bad = {k: (got[k], v) for k, v in PIN.items() if got[k] != v}
    if bad or not info.get("Removable", info.get("RemovableMedia")) or info.get("Internal"):
        sys.exit(f"ABORT: device identity mismatch {bad} internal={info.get('Internal')}")
    if Path(info["MountPoint"]).resolve() != mount.resolve():
        sys.exit("ABORT: mount point mismatch")
    return mount, info["ParentWholeDisk"]


def main() -> int:
    if len(sys.argv) < 2 or sys.argv[1].startswith("--"):
        sys.exit(__doc__)
    src = Path(sys.argv[1]).resolve()
    baseline = arg("--baseline")
    if not baseline:
        sys.exit("ABORT: --baseline=<manifest of the expected current USB content> is required for evidence")

    marker = src.parent / f"{src.name}_EXPERIMENTAL.txt"
    if marker.exists():
        reason = arg("--diagnostic-experimental")
        if not reason:
            sys.exit(f"ABORT: {src.name} is experimental ({marker.name}); not deploying. "
                     f"Explicit diagnostic override: --diagnostic-experimental=<reason>")
        print("=" * 70 + f"\nEXPERIMENTAL DIAGNOSTIC DEPLOYMENT: {reason}\n" + marker.read_text() + "=" * 70)

    if subprocess.run(["pgrep", "-ilf", "rekordbox"], capture_output=True).returncode == 0:
        sys.exit("ABORT: rekordbox is running")
    if not (src / "PIONEER/rekordbox/export.pdb").is_file():
        sys.exit(f"ABORT: {src} is not an export")
    vflags = [a for a in sys.argv if a.startswith("--plan=") or a == "--allow-tombstones"]   # explicit, per-run, never implicit
    if subprocess.run([sys.executable, "-I", str(ROOT / "scripts/verify_export.py"), str(src), "--exact", *vflags],
                      capture_output=True).returncode:
        sys.exit("ABORT: local export fails verification")

    mount, disk = identify()
    print(f"identified {mount} on /dev/{disk} (pinned UUID, size, fs, USB, removable)")

    ev = ROOT / "diagnostic" / f"pre_write_{src.name}_{datetime.datetime.now():%Y%m%d_%H%M%S}"
    rec = ue.snapshot(mount, Path(baseline), ev)             # raises SystemExit if any evidence file is missing/mismatched
    print(f"evidence preserved + verified: {ev} ({rec['n_files']} files; changed since baseline: {rec['changed']})")

    if "--yes" not in sys.argv:
        print("dry run complete; pass --yes to replace PIONEER/ and Contents/")
        return 0

    mount2, _ = identify()                                   # re-pin immediately before deleting
    assert mount2 == mount
    ue.verify(ev, mount)                                     # USB must still equal the evidence
    for name in OWNED:
        t = mount / name
        if t.exists():
            assert t.resolve() == (mount / name).resolve() and t.parent.resolve() == mount.resolve()
            shutil.rmtree(t)
    for name in OWNED:
        shutil.copytree(src / name, mount / name)
    subprocess.run(["sync"], check=True)

    got, want = ue.owned_manifest(mount), ue.owned_manifest(src)
    if got != want:
        sys.exit(f"FAIL: USB != export: missing={sorted(set(want)-set(got))[:5]} extra={sorted(set(got)-set(want))[:5]} "
                 f"diff={[k for k in want if k in got and got[k] != want[k]][:5]}")
    r = subprocess.run([sys.executable, "-I", str(ROOT / "scripts/verify_export.py"), str(mount), *vflags], capture_output=True, text=True)
    print(r.stdout.splitlines()[-1])
    if r.returncode:
        sys.exit("FAIL: verify on USB")
    wd = ROOT / "diagnostic" / f"written_{src.name}_{datetime.datetime.now():%Y%m%d_%H%M%S}"
    wd.mkdir(parents=True)
    (wd / "WRITTEN_MANIFEST.sha256").write_text("".join(f"{h}  ./{p}\n" for p, h in sorted(got.items())))
    if marker.exists():
        (wd / "EXPERIMENTAL_DIAGNOSTIC.txt").write_text(f"reason: {arg('--diagnostic-experimental')}\n" + marker.read_text())
    print(f"USB project-owned file set == export ({len(got)} files, all sha256 equal); evidence: {ev}; written manifest: {wd}")
    subprocess.run(["diskutil", "eject", f"/dev/{disk}"], check=True)
    print(f"ejected /dev/{disk}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
