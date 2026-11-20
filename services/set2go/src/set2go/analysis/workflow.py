"""Opt-in per-track analysis workflow built on the existing resolver (layers.py), sidecar.py and review.py. Nothing here runs unless called; the default export
path does not import it.

Layers (never merged):
  imported   values READ from the file (Mixed In Key payloads / plain tags) with explicit provenance; reading metadata is not detection
  predicted  fresh predictions from NAMED methods, each kept separately (audio only)
  manual     user override from the sidecar (hash-linked), survives re-analysis; the only layer that outranks `imported`
Effective key = manual > imported (valid payload/tag) > none. Predictions are NEVER promoted automatically, so a track with no stored key and no manual key has NO
effective key (missing), and the PDB gets key_id 0 for it.
Review reasons (no probabilities): method disagreement across FAMILIES (Essentia vs libKeyFinder), disagreement of any prediction with the imported/manual value,
mode disagreement, conflicting stored values, unknown-origin provenance, missing key. Method AGREEMENT is reported as agreement, never as proof of correctness;
same-family profiles (Essentia bgate/edma/braw share one front end) are counted as ONE family, not as independent votes.
"""
from __future__ import annotations

from pathlib import Path
from typing import Callable, Mapping

from . import keys as K, layers as L, refs as R, sidecar as S

# Method families: agreement is only meaningful across families.
FAMILY = {"libkeyfinder": "libkeyfinder"}


def family_of(method: str) -> str:
    return FAMILY.get(method, method.split(":")[0])


def analyse_track(path: Path, entry: dict | None, predictors: Mapping[str, Callable[[Path], str | None]] | None = None, policy: dict | None = None) -> dict:
    """Build the three layers for one file and the effective key with review reasons. `predictors`: {"<method name+version>": callable(path)->key text or None};
    failures are recorded, not hidden. `entry` is the track's sidecar entry (for the manual key)."""
    imported = L.imported_layer(path)
    predicted: dict[str, str | None] = {}
    failures: dict[str, str] = {}
    for name, fn in (predictors or {}).items():
        try:
            predicted[name] = fn(path)
        except Exception as e:                                  # a failing method must stay visible
            predicted[name] = None
            failures[name] = f"{type(e).__name__}: {e}"
    res = L.resolve_key(imported, predicted, entry, policy=policy)
    reasons = key_review(res, imported, failures)
    return {"key": res, "imported": imported, "predicted": predicted, "failures": failures, "review": reasons}


def key_review(res: dict, imported: dict | None, failures: dict | None = None) -> list[dict]:
    out: list[dict] = []
    eff = res["effective"]
    preds = {k: v for k, v in (res["layers"]["predicted"] or {}).items()}
    pol = res.get("policy")
    if res.get("invalid"):
        for layer, val in res["invalid"].items():
            out.append({"area": "key", "reason": f"{layer} value is not usable ({val!r}); the next layer applies" if layer != "policy" else f"prediction policy gave no key: {val}"})
    if not eff:
        out.append({"area": "key", "reason": ("no key: no valid manual or stored key and the selected prediction backend produced none" if pol
                                              else "no key available (no stored key, no manual key); predictions are not promoted automatically"),
                    "predictions": preds or None})
    if res.get("effective_origin") == "predicted":
        sp = res["selected_prediction"]
        out.append({"area": "key", "reason": f"key is a PREDICTION from {sp['backend']} (no manual or stored key exists); not verified, accuracy of this backend is not established",
                    "detail": {"backend": sp["backend"], "value": sp["value"]}})
    if imported:
        if imported["conflicts"]:
            conf = [c for c in imported["conflicts"] if c["quantity"] == "key"]
            if conf:
                out.append({"area": "key", "reason": "stored key fields conflict", "detail": conf})
        if imported["key"]["provenance"] != "mixedinkey_self_declared" and imported["key"]["value"]:
            out.append({"area": "key", "reason": "stored key has unknown origin (plain tag, no writer marker)"})
    parsed = {k: K.parse_key(v) for k, v in preds.items() if v and K.parse_key(v)}
    if eff and parsed:
        e = K.parse_key(eff["name"])
        rel = {k: K.relation(p, e) for k, p in parsed.items()}
        by_family: dict[str, list[str]] = {}
        for k, r in rel.items():
            by_family.setdefault(family_of(k), []).append(r)
        disagree = {f: v for f, v in by_family.items() if any(x != "exact" for x in v)}
        if disagree:
            out.append({"area": "key", "reason": f"predictions disagree with the {res['effective_origin']} key",
                        "detail": {"effective": eff["camelot"], "by_method": {k: {"camelot": K.camelot(*parsed[k]), "relation": rel[k]} for k in rel}}})
        modes = {k: p[1] for k, p in parsed.items()}
        if len(set(modes.values())) > 1:
            out.append({"area": "key", "reason": "methods disagree on MODE (major/minor)", "detail": modes})
        elif eff and set(modes.values()) and e[1] not in set(modes.values()):
            out.append({"area": "key", "reason": f"all predicted modes differ from the {res['effective_origin']} mode", "detail": modes})
    fam = {family_of(k) for k in parsed}
    if len(fam) >= 2:
        tonics = {family_of(k): K.camelot(*p) for k, p in parsed.items()}
        if len({K.parse_key(c)[0] for c in tonics.values()}) > 1:
            out.append({"area": "key", "reason": "method families disagree on the TONIC", "detail": tonics})
        else:
            out.append({"area": "info", "reason": "families agree on the tonic: agreement is not evidence of correctness (shared biases are possible)"})
    for m, err in (failures or {}).items():
        out.append({"area": "key", "reason": f"method failed: {m}", "detail": err})
    return out


def reanalyse(sidecar: dict, filename: str, path: Path, predictors: Mapping[str, Callable[[Path], str | None]] | None = None, version: str | None = None,
              policy: dict | None = None, sha256: str | None = None) -> dict:
    """Re-run the analysis for a file and record it in the sidecar WITHOUT touching manual overrides (sidecar.record_analysis keeps them; changed audio retires
    them as stale). Returns the analysis dict (layers, review). The audio is hashed here; the file is only read."""
    from . import ANALYSIS_VERSION
    sha = sha256 or R.sha256_file(path)
    entry = sidecar.get(filename)
    stale = bool(entry) and entry.get("sha256") != sha
    e = S.record_analysis(sidecar, filename, sha, {"run_id": __import__("time").strftime("%Y%m%dT%H%M%S"), "kind": "key workflow"},
                          auto=(entry or {}).get("auto") if not stale else None, version=version or ANALYSIS_VERSION)
    a = analyse_track(path, e, predictors, policy)
    a["stale_overrides_retired"] = stale
    e.setdefault("analysis", {})
    run_key = sorted(e["analysis"])[-1]
    e["analysis"][run_key]["key_layers"] = {"imported": a["imported"]["key"] if a["imported"] else None, "predicted": a["predicted"],
                                            "effective": a["key"]["effective"], "effective_origin": a["key"]["effective_origin"],
                                            "policy": policy, "selected_prediction": a["key"]["selected_prediction"], "failures": a["failures"]}
    return a


def effective_key_map(sidecar: dict, files: Mapping[str, Path], predictions: Mapping[str, Mapping[str, str | None]] | None = None,
                      policy: dict | None = None, sha256_map: Mapping[str, str] | None = None) -> dict[str, dict | None]:
    """filename -> {"camelot", "name", "origin", ["backend"]} or None. Default (no policy): manual > imported only. With a policy and `predictions`
    ({filename: {backend: key text}}): manual > imported > the selected backend's prediction > None. Used by the opt-in export path."""
    out: dict[str, dict | None] = {}
    for name, path in files.items():
        imp = L.imported_layer(path)
        entry = sidecar.get(name)
        if entry and entry.get("manual", {}).get("key"):
            sha = (sha256_map or {}).get(name) or (sha256_map or {}).get(str(path)) or R.sha256_file(path)
            if entry.get("sha256") != sha:
                entry = None                                          # an override made for different audio is not applied
        r = L.resolve_key(imp, dict((predictions or {}).get(name, {})), entry, policy=policy)
        if r["effective"]:
            out[name] = {"camelot": r["effective"]["camelot"], "name": r["effective"]["name"], "origin": r["effective_origin"]}
            if r["effective_origin"] == "predicted":
                out[name]["backend"] = r["selected_prediction"]["backend"]
        else:
            out[name] = None
    return out


# ---- prediction backends -------------------------------------------------------------------------------------------------------------------------------------
def libkeyfinder_backend() -> tuple[str, Callable[[Path], str | None]]:
    """The initial prediction backend: libKeyFinder through the project's ctypes wrapper (key_detect.detect_key_from_file). Returns (label with the REAL library
    version read from the installed dylib, callable). The label is what is stored as the prediction's backend. Choosing it is a policy decision for availability and
    licence/runtime simplicity; it is NOT a claim that it is the most accurate method (the evaluation sets show mode-dependent errors).
    The callable raises (not returns None) when the library is unavailable, so a missing backend stays visible as a failure."""
    import re
    from .. import key_detect as KD
    version = "unknown"
    for cand in sorted(Path("/opt/homebrew/lib").glob("libkeyfinder.*.*.*.dylib")):
        m = re.search(r"libkeyfinder\.(\d+\.\d+\.\d+)\.dylib", cand.name)
        if m:
            version = m.group(1)
    label = f"libkeyfinder {version}"

    def predict(path: Path) -> str | None:
        if not KD.is_available():
            raise RuntimeError("libKeyFinder wrapper library is not available (build it with scripts/build_kf.sh)")
        r = KD.detect_key_from_file(Path(path))
        return r.key_name if r else None                       # None = silent audio / no result / unsupported input

    return label, predict
