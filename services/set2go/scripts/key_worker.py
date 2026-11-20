#!/usr/bin/env python
"""Isolated Essentia key worker (opt-in experiment; runs inside .venv-key, Python 3.14; the main project never imports essentia).

    .venv-key/bin/python scripts/key_worker.py <out.json> <audio> [<audio> ...] [--profiles p1,p2,...]

Runs essentia.standard.KeyExtractor on each file once per key profile (classic DSP algorithm; NO machine-learning model weights are loaded) and writes the raw result
(key, scale, strength) with every parameter, versions, wall time and peak RSS. Nothing is post-processed or compared here. Audio is decoded by Essentia's MonoLoader
(read-only) at 44.1 kHz.
"""
import json, resource, sys, time
import essentia
import essentia.standard as es

DEFAULT_PROFILES = ["bgate", "edma", "edmm", "krumhansl", "temperley", "shaath", "braw", "diatonic", "weichai", "tonictriad", "temperley2005", "thpcp", "gomez", "noland", "faraldo", "pentatonic"]


def main() -> int:
    a = sys.argv[1:]
    prof = DEFAULT_PROFILES
    if "--profiles" in a:
        i = a.index("--profiles"); prof = a[i + 1].split(","); del a[i:i + 2]
    out, files = a[0], a[1:]
    res = {"_meta": {"essentia": essentia.__version__, "profiles": prof, "sampleRate": 44100, "algorithm": "KeyExtractor", "ml_models_loaded": False}}
    for f in files:
        t0 = time.perf_counter()
        audio = es.MonoLoader(filename=f, sampleRate=44100)()
        load_s = time.perf_counter() - t0
        e = {"load_s": round(load_s, 2), "samples": int(len(audio)), "profiles": {}}
        for p in prof:
            t = time.perf_counter()
            try:
                params = dict(profileType=p, sampleRate=44100)
                k = es.KeyExtractor(**params)
                key, scale, strength = k(audio)
                e["profiles"][p] = {"key": key, "scale": scale, "strength": float(strength), "seconds": round(time.perf_counter() - t, 2),
                                    "params": {n: k.paramValue(n) for n in k.parameterNames()}}      # the algorithm's ACTUAL parameters (not assumed)
            except Exception as ex:
                e["profiles"][p] = {"error": f"{type(ex).__name__}: {ex}"}
        res[f] = e
        print(f.split("/")[-1][:34], {p: (v.get("key", "?") + (" m" if v.get("scale") == "minor" else "")) for p, v in e["profiles"].items() if "key" in v}, flush=True)
    res["_meta"]["peak_rss_mb"] = round(resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 2**20)
    json.dump(res, open(out, "w"), indent=1)
    return 0


if __name__ == "__main__":
    sys.exit(main())
