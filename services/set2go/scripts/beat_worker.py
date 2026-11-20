#!/usr/bin/env python
"""Isolated Beat This! worker. Runs inside .venv-beat; the main project never imports torch.

    .venv-beat/bin/python scripts/beat_worker.py <checkpoint.ckpt> <out.json> <audio> [<audio> ...]

Writes raw model output (beats, downbeats), per-file wall time and process peak RSS. Nothing is post-processed.
"""
import json
import resource
import sys
import time

from beat_this.inference import File2Beats


def main() -> int:
    ckpt, out, files = sys.argv[1], sys.argv[2], sys.argv[3:]
    t0 = time.perf_counter()
    f2b = File2Beats(checkpoint_path=ckpt, device="cpu", dbn=False)
    res = {"_meta": {"checkpoint": ckpt, "device": "cpu", "load_s": round(time.perf_counter() - t0, 2)}}
    for f in files:
        t = time.perf_counter()
        beats, downbeats = f2b(f)
        res[f] = {"beats": [float(x) for x in beats], "downbeats": [float(x) for x in downbeats],
                  "seconds": round(time.perf_counter() - t, 2),
                  "peak_rss_mb_so_far": round(resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1e6, 0)}
    res["_meta"]["peak_rss_mb"] = round(resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1e6, 0)  # macOS: bytes
    json.dump(res, open(out, "w"))
    return 0


if __name__ == "__main__":
    sys.exit(main())
