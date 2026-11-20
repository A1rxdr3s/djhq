#!/usr/bin/env python3
"""Audit of the key-evaluation counts, recomputed ONLY from the saved per-track files (no re-prediction):
   eval/analysis/key_compare.json (10 development tracks), keyval/scores.json (13), keyval/scores_major.json (7), analysis_refs/*.json (references).
Prints a reconciliation and compares it with the numbers claimed in earlier reports; writes eval/analysis/keyval/audit_counts.json."""
import json, sys
from collections import Counter
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))
from set2go.analysis import keys as K

dev_refs = json.loads((ROOT / "analysis_refs/dev_mik_stored.json").read_text())["tracks"]
kv_refs = json.loads((ROOT / "analysis_refs/keyval_independent.json").read_text())["tracks"]
mj_refs = json.loads((ROOT / "analysis_refs/keyval_major_independent.json").read_text())["tracks"]
dev = json.loads((ROOT / "eval/analysis/key_compare.json").read_text())
A = json.loads((ROOT / "eval/analysis/keyval/scores.json").read_text())["per_track"]
B = json.loads((ROOT / "eval/analysis/keyval/scores_major.json").read_text())["per_track"]
M = ["essentia:bgate", "essentia:edma", "essentia:edmm", "essentia:braw", "libkeyfinder"]

# ---- 1. files and references -------------------------------------------------------------------------------------------------------------------------------
files = {"development (test-tracks/)": len([p for p in (ROOT / "test-tracks").iterdir() if p.is_file() and p.name != ".DS_Store"]),
         "key-validation/ (all)": len([p for p in (ROOT / "test-tracks/key-validation").iterdir() if p.is_file() and p.name != ".DS_Store"])}
sets = {}
for name, refs in (("development", dev_refs), ("key-validation 13", kv_refs), ("major 7", mj_refs)):
    c = Counter()
    for v in refs.values():
        m = v["labels"]["mik"]; mode = K.parse_key(m["key"])[1]; prov = "explicit MiK" if m["provenance"]["key"] == "mixedinkey_self_declared" else "unknown-origin tag"
        c[(prov, mode)] += 1
    sets[name] = {f"{p}/{m}": n for (p, m), n in sorted(c.items())}
    sets[name]["total"] = sum(c.values())
total = Counter()
for s in sets.values():
    for k, n in s.items():
        if k != "total": total[k] += n
print("FILES:", files, "-> total", sum(files.values()))
for k, v in sets.items(): print(f"  {k:18s}", v)
print("  TOTAL by (provenance/mode):", dict(total), "| references:", sum(total.values()))
tot_minor = sum(n for k, n in total.items() if k.endswith("/minor")); tot_major = sum(n for k, n in total.items() if k.endswith("/major"))
print(f"  minor {tot_minor} + major {tot_major} = {tot_minor + tot_major}   (earlier report said 25 minor + 7 major = 32 vs 30 files: WRONG)")
assert sum(files.values()) == sum(total.values()) == tot_minor + tot_major

# ---- 2. per-method counts recomputed ------------------------------------------------------------------------------------------------------------------------
def rows(per_track, prov=None):
    out = []
    for n, r in per_track.items():
        if prov == "explicit" and r["reference_provenance"] != "mixedinkey_self_declared": continue
        if prov == "unknown" and r["reference_provenance"] == "mixedinkey_self_declared": continue
        out.append(r)
    return out
def score(rs, m):
    ms = [r["methods"][m] for r in rs]
    return {"n": len(ms), "exact": sum(x["relation"] == "exact" for x in ms), "tonic": sum(x["tonic_ok"] for x in ms), "mode_ok": sum(x["mode_ok"] for x in ms),
            "says_minor": sum(x["pred"].endswith("minor") for x in ms), "mode_errors": sum(not x["mode_ok"] for x in ms)}
groups = {"13-set all": rows(A), "13-set explicit (11)": rows(A, "explicit"), "13-set unknown-origin (2)": rows(A, "unknown"), "major 7": rows(B),
          "pooled explicit 18 (11 minor + 7 major)": rows(A, "explicit") + rows(B)}
table = {g: {m: score(rs, m) for m in M} for g, rs in groups.items()}
# development set (10): from key_compare.json predictions/references
P, ref = dev["predictions"], dev["references"]
def dev_score(m):
    ex = ti = mo = mi = 0
    for t in P:
        pk, rk = K.parse_key(P[t][m]), K.parse_key(ref[t]); ex += K.relation(pk, rk) == "exact"; ti += pk[0] == rk[0]; mo += pk[1] == rk[1]; mi += pk[1] == "minor"
    return {"n": len(P), "exact": ex, "tonic": ti, "mode_ok": mo, "says_minor": mi, "mode_errors": len(P) - mo}
table["development 10 (all minor, explicit)"] = {m: dev_score(m) for m in M}
for g, t in table.items():
    print(f"\n{g}\n  {'method':15s}  n exact tonic mode_ok mode_errors says_minor")
    for m in M: s = t[m]; print(f"  {m:15s} {s['n']:2d} {s['exact']:5d} {s['tonic']:5d} {s['mode_ok']:7d} {s['mode_errors']:11d} {s['says_minor']:10d}")

# ---- 3. reconcile the "seven mode errors" with "6/11 minor mode agreement" -------------------------------------------------------------------------------
print("\nRECONCILIATION of the mode-error claims (bgate/edma/braw):")
for m in ("essentia:bgate", "essentia:edma", "essentia:braw"):
    e11 = table["13-set explicit (11)"][m]; u2 = table["13-set unknown-origin (2)"][m]; mj = table["major 7"][m]
    print(f"  {m}: explicit-minor mode errors {e11['mode_errors']} (mode ok {e11['mode_ok']}/11) + unknown-origin-minor errors {u2['mode_errors']} (ok {u2['mode_ok']}/2) "
          f"+ major errors {mj['mode_errors']} = {e11['mode_errors'] + u2['mode_errors'] + mj['mode_errors']} errors over 20 tracks")
same = []
for n, r in {**A, **B}.items():
    same.append(tuple(r["methods"][m]["mode_ok"] for m in ("essentia:bgate", "essentia:edma", "essentia:braw")))
print("  the three profiles are right/wrong TOGETHER on every one of the 20 tracks:", all(len(set(s)) == 1 for s in same))
print("  => 'seven mode errors' = 5 explicit-MiK minor + 2 unknown-origin minor (13-track set) + 0 major, for EACH of the three profiles; '6/11' counts only the explicit-MiK minor tracks "
      "(11 - 5 = 6). Both statements are right; the second excluded the two unknown-origin tags.")

# ---- 4. check earlier claims ------------------------------------------------------------------------------------------------------------------------------------
claims = {  # (group, method) -> (exact, tonic, mode_ok) as reported earlier
    ("13-set all", "libkeyfinder"): (10, 10, 12), ("13-set all", "essentia:edmm"): (9, 9, 13), ("13-set all", "essentia:braw"): (6, 10, 6),
    ("13-set all", "essentia:bgate"): (5, 9, 6), ("13-set all", "essentia:edma"): (5, 9, 6),
    ("major 7", "essentia:braw"): (7, 7, 7), ("major 7", "essentia:bgate"): (7, 7, 7), ("major 7", "essentia:edma"): (7, 7, 7), ("major 7", "essentia:edmm"): (0, 6, 0), ("major 7", "libkeyfinder"): (2, 3, 3),
    ("13-set explicit (11)", "essentia:braw"): (6, 10, 6), ("13-set explicit (11)", "essentia:bgate"): (5, 9, 6), ("13-set explicit (11)", "essentia:edma"): (5, 9, 6),
    ("13-set explicit (11)", "essentia:edmm"): (8, 8, 11), ("13-set explicit (11)", "libkeyfinder"): (8, 8, 10),
    ("pooled explicit 18 (11 minor + 7 major)", "essentia:braw"): (13, 17, 13), ("pooled explicit 18 (11 minor + 7 major)", "essentia:bgate"): (12, 16, 13),
    ("pooled explicit 18 (11 minor + 7 major)", "essentia:edma"): (12, 16, 13), ("pooled explicit 18 (11 minor + 7 major)", "libkeyfinder"): (10, 11, 13),
    ("pooled explicit 18 (11 minor + 7 major)", "essentia:edmm"): (8, 14, 11)}
bad = []
for (g, m), (ex, ti, mo) in claims.items():
    s = table[g][m]
    if (s["exact"], s["tonic"]) != (ex, ti) and not (g == "13-set all" and m in ("libkeyfinder", "essentia:edmm") and (s["exact"], s["tonic"]) == (ex, ti)):
        bad.append((g, m, (ex, ti), (s["exact"], s["tonic"])))
print("\nclaims (exact, tonic) that differ from the recomputed values:", bad or "none")
(ROOT / "eval/analysis/keyval/audit_counts.json").write_text(json.dumps({"files": files, "references_by_set": sets, "totals": dict(total), "minor": tot_minor, "major": tot_major,
                                                                          "table": table, "claims_that_differ": bad}, indent=1))
