#!/usr/bin/env python3
"""Set2Go local engine verification and health check.

Usage:
    PYTHONPATH=services/set2go/src /Users/andresherrera/Developer/Set2Go/.venv/bin/python services/set2go/scripts/check_engine.py
    # or from inside services/set2go:
    python scripts/check_engine.py
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

# Ensure services/set2go/src is at head of sys.path
SCRIPT_DIR = Path(__file__).resolve().parent
SET2GO_ROOT = SCRIPT_DIR.parent
SRC_DIR = SET2GO_ROOT / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))


def check_engine() -> int:
    errors: list[str] = []
    warnings: list[str] = []
    print(f"=== Set2Go Engine Check ===")
    print(f"Python: {sys.version.split()[0]} ({sys.executable})")

    # 1. Package import and source path check
    try:
        import set2go
        pkg_path = Path(set2go.__file__).resolve()
        expected_parent = (SRC_DIR / "set2go").resolve()
        print(f"Package loaded: {pkg_path}")
        if pkg_path.parent != expected_parent:
            errors.append(
                f"Imported set2go from unexpected location: {pkg_path.parent} "
                f"(expected {expected_parent}). Ensure PYTHONPATH points to services/set2go/src."
            )
    except ImportError as e:
        errors.append(f"Failed to import set2go: {e}")
        return 1

    # 2. Dependencies check
    deps = ["construct", "librosa", "mutagen", "numpy", "pyrekordbox"]
    for dep in deps:
        try:
            __import__(dep)
        except ImportError:
            errors.append(f"Missing required dependency: {dep}")

    try:
        from rekordbox_pdb.pdb import Database
    except ImportError:
        errors.append("Missing required dependency: rekordbox-pdb")

    # 3. Package data check (PDB seeds)
    from set2go.export import _DEFAULT_SEED_PDB, _SEED_PDB
    for name, p in [("default_seed_v2", _DEFAULT_SEED_PDB), ("empty_seed", _SEED_PDB)]:
        if not p.exists() or p.stat().st_size == 0:
            errors.append(f"Missing package seed data: {name} at {p}")
        else:
            print(f"Seed verified: {name} ({p.stat().st_size} bytes)")

    # 4. Engine Contract v1.0
    try:
        from set2go.analysis import contract as C
        print(f"Contract version: {C.ENGINE_CONTRACT_VERSION}")
        if C.ENGINE_CONTRACT_VERSION != "1.0":
            errors.append(f"Unexpected contract version: {C.ENGINE_CONTRACT_VERSION} (expected 1.0)")
    except Exception as e:
        errors.append(f"Failed to validate contract v1.0: {e}")

    # 5. Beat This! rhythm backend
    from set2go import rhythm as RH
    print(f"Beat This! python: {RH.BEAT_PY} (exists: {RH.BEAT_PY.exists()})")
    print(f"Beat This! worker: {RH.BEAT_WORKER} (exists: {RH.BEAT_WORKER.exists()})")
    print(f"Beat This! checkpoint: {RH.CHECKPOINT} (exists: {RH.CHECKPOINT.exists()})")
    if not RH.BEAT_PY.exists():
        warnings.append(
            f"Beat This! python environment not found at {RH.BEAT_PY}. "
            "Set SET2GO_BEAT_PYTHON to specify an isolated PyTorch environment."
        )
    if not RH.CHECKPOINT.exists():
        warnings.append(
            f"Beat This! model checkpoint not found at {RH.CHECKPOINT}. "
            "Set SET2GO_BEAT_CHECKPOINT or SET2GO_CHECKPOINT to specify model location."
        )
    if not RH.available():
        warnings.append("Beat This! rhythm backend is UNAVAILABLE. Fourier-only fallback will be used.")
    else:
        print("Beat This! rhythm backend: OK")

    # 6. libKeyFinder native dependency
    from set2go import key_detect as KD
    print(f"KeyFinder dylib: {KD._DYLIB_PATH} (exists: {KD._DYLIB_PATH.exists()})")
    if not KD._DYLIB_PATH.exists():
        warnings.append(
            f"KeyFinder wrapper dylib not found at {KD._DYLIB_PATH}. "
            "Run services/set2go/scripts/build_kf.sh or set SET2GO_KEYFINDER_DYLIB."
        )
    elif not KD.is_available():
        warnings.append(f"KeyFinder dylib exists at {KD._DYLIB_PATH} but failed to load via ctypes.")
    else:
        print("KeyFinder native library: OK")

    print("\n=== Summary ===")
    if warnings:
        print(f"Warnings ({len(warnings)}):")
        for w in warnings:
            print(f"  - {w}")
    if errors:
        print(f"Errors ({len(errors)}):")
        for err in errors:
            print(f"  - {err}")
        return 1

    print("Engine check passed successfully.")
    return 0


if __name__ == "__main__":
    sys.exit(check_engine())
