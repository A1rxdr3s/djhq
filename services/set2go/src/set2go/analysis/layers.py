"""Three separate layers for every analysed quantity, never merged silently:

  imported   values READ from the source file (Mixed In Key GEOB payloads, plain tags). This is reading existing metadata, NOT our detection capability; the
             origin string says exactly where each value came from and how certain that provenance is.
  predicted  fresh predictions from named algorithms (name + version/profile), each kept individually; none is promoted to "the" answer here.
  manual     user overrides from the sidecar, with provenance.

`resolve_key()` returns all three plus an `effective` value and `effective_origin` ("manual" > "imported" > "predicted" is NOT assumed: the caller passes the
precedence; the default is manual > imported > predicted because a stored annotation the user already accepted is what the library shows today).
Nothing in this module reports an imported value as a detection result: reports must use `origin`.
"""
from __future__ import annotations

from pathlib import Path

from . import keys as K, refs as R, sidecar as S

DEFAULT_PRECEDENCE = ("manual", "imported", "predicted")


def imported_layer(path: Path) -> dict | None:
    """Existing-analysis values from the file, with provenance. None if the file carries no key/tempo annotation."""
    a = R.read_mik_annotations(path)
    if a is None or (a["stored_key"]["value"] is None and a["stored_bpm"]["value"] is None):
        return None
    return {"key": a["stored_key"], "bpm": a["stored_bpm"], "conflicts": a["conflicts"],
            "origin": ("Mixed In Key payload (self-declared)" if a["stored_key"]["provenance"] == "mixedinkey_self_declared"
                       else "embedded tag (writer unknown)"),
            "note": "imported from the source file's own metadata; not produced by Set2Go analysis"}


def resolve_key(imported: dict | None, predicted: dict[str, str | None], entry: dict | None = None,
                precedence: tuple[str, ...] = DEFAULT_PRECEDENCE, policy: dict | None = None) -> dict:
    """predicted: {"<method name+version>": "D minor" | "7A" | None}. entry: the sidecar entry (for the manual key).

    policy (OPT-IN, default None = predictions are never promoted): {"backend": "<exact key of ONE entry in `predicted`>"}. Precedence then is
      1. valid manual override   2. valid imported annotation   3. the prediction of the explicitly selected backend   4. no key.
    A manual or imported value that does not parse as a key is INVALID: it is skipped (and reported under `invalid`), so the next layer applies; it is never
    reported as the effective key. Predictions from other backends stay advisory; disagreement never replaces a manual or imported value. A prediction that is
    missing/None/unparseable (backend failed or unsupported) gives no key (step 4)."""
    manual = (entry or {}).get("manual", {}).get("key")
    meta = (entry or {}).get("manual_meta", {}).get("key")
    layers = {"manual": {"value": manual, "provenance": meta} if manual else None,
              "imported": ({"value": imported["key"]["value"], "origin": imported["origin"], "provenance": imported["key"]["provenance"],
                            "conflicts": imported["conflicts"]} if imported and imported["key"]["value"] else None),
              "predicted": {k: v for k, v in predicted.items() if v} or None}
    eff, origin, selected, invalid = None, None, None, {}
    for name in precedence:
        lay = layers.get(name)
        if not lay or name == "predicted":
            continue
        if K.parse_key(lay["value"]) is None:
            invalid[name] = lay["value"]                      # unparseable stored/manual value: skip, keep visible
            continue
        eff, origin = lay["value"], name
        break
    if eff is None and policy and policy.get("backend"):
        b = policy["backend"]
        if b not in predicted:
            invalid["policy"] = f"backend {b!r} produced no entry"
        elif predicted[b] and K.parse_key(predicted[b]):
            eff, origin = predicted[b], "predicted"
            selected = {"backend": b, "value": predicted[b]}
        else:
            invalid["policy"] = f"backend {b!r} returned no usable key ({predicted[b]!r})"
    parsed = K.parse_key(eff) if eff else None
    agreeing = {}
    if parsed:
        for k, v in (layers["predicted"] or {}).items():
            pk = K.parse_key(v)
            agreeing[k] = K.relation(pk, parsed) if pk else "unparseable"
    return {"effective": ({"name": K.key_name(*parsed), "camelot": K.camelot(*parsed)} if parsed else None), "effective_origin": origin, "layers": layers,
            "prediction_relation_to_effective": agreeing, "selected_prediction": selected, "invalid": invalid or None, "policy": policy}
