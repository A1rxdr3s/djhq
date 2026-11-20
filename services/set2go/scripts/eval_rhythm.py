#!/usr/bin/env python3
"""Evaluate the Beat This! backend on saved raw predictions (eval/beat_this_raw/) for all test tracks.

    uv run scripts/eval_rhythm.py        # writes eval/rhythm_eval.json and prints the table
Tempo, beat phase, drift, downbeat, runtime and memory are reported as separate fields.
"""
import json, re, sys
from pathlib import Path
import numpy as np
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))
from set2go import rhythm as Rh, bpm_detect as B
from set2go.waveform import _read_mono_float32

OFF = {  # preserved official rekordbox export: track -> USBANLZ dir (comparison reference only)
    "Earth n Days - Make It High (Extended Mix) [Toolroom Trax].aiff": "P00E/000254CE",
    "Snoop Dogg, HUGEL - H.O.U.S.E (Extended Mix) [Make The Girls Dance Records].aiff": "P010/00029208",
    "Zsak - The Dancefloor (Extended Mix) [There Was Jack].aif": "P074/0001EA48"}


def official(name):
    import struct
    d = (ROOT / "reference/rekordbox_official/PIONEER/USBANLZ" / OFF[name] / "ANLZ0000.DAT").read_bytes()
    off = struct.unpack_from(">I", d, 4)[0]
    while off < len(d):
        t = d[off:off + 4]; lh, lt = struct.unpack_from(">II", d, off + 4)
        if t == b"PQTZ":
            body = d[off + lh:off + lt]
            q = [struct.unpack_from(">HHI", body, i * 8) for i in range(len(body) // 8)]
            return np.array([x[2] for x in q]) / 1000, np.array([x[0] for x in q])
        off += lt


def main():
    idx = [l.split(" ", 1) for l in (ROOT / "eval/beat_this_raw/index.txt").read_text().strip().splitlines()]
    out = {}
    for n, f in idx:
        P = ROOT / f.strip()
        raw = Rh.load_raw(ROOT / f"eval/beat_this_raw/{n}.json")
        tm = (ROOT / f"eval/beat_this_raw/{n}.time").read_text()
        rss = int(re.search(r"(\d+)\s+maximum resident", tm).group(1)) / 2**20
        wall = float(re.search(r"([\d,\.]+)\s+real", tm).group(1).replace(",", "."))
        mono, sr = _read_mono_float32(P)
        broad, kick, fps = B._onset_envelope(mono, sr)
        bpm = B.estimate_tempo(broad, fps); per = 60 / bpm
        e = {"tempo": {"fourier_bpm": round(bpm, 3)}, "runtime_s": wall, "peak_rss_mib": round(rss), "audio_s": round(len(mono) / sr, 1)}
        raw_r = Rh.build_rhythm(raw, bpm)
        c = raw_r.consistency
        e["tempo"].update(model_slope_bpm=round(c.model_slope_bpm, 3), delta_bpm=round(c.tempo_disagree_bpm, 3))
        e["consistency"] = {"status": c.status, "reasons": c.reasons, "bad_intervals": c.skipped_or_doubled,
                            "median_abs_residual_ms": round(c.median_abs_residual_ms, 1), "bad_regions_s": c.bad_regions_s}
        if raw_r.anchor_s is not None:
            ref = Rh.build_rhythm(raw, bpm, mono, sr, True)
            b = np.array(raw.beats); k = np.round((b - ref.anchor_s) / per); res = (b - (ref.anchor_s + k * per)) * 1000
            seg = [float(np.median(res[i * len(res) // 8:(i + 1) * len(res) // 8])) for i in range(8)]
            he = B._band_envelope(mono, sr, "hats")
            def hat(a):
                g = a + per * np.arange(int((len(mono) / sr - a) / per)); att = B._attack_times(mono, sr, g, 0.04, "hats", he)
                return float(np.median(att - np.array([g[np.argmin(abs(g - x))] for x in att])) * 1000)
            e["beat_phase"] = {"anchor_ms_unmodified": round(raw_r.anchor_s * 1000, 1), "anchor_ms_refined": round(ref.anchor_s * 1000, 1),
                               "kick_corr_ms": round(ref.kick_corr_ms, 1) if ref.kick_corr_ms is not None else None,
                               "hat_attack_residual_ms_unmodified": round(hat(raw_r.anchor_s), 1), "hat_attack_residual_ms_refined": round(hat(ref.anchor_s), 1)}
            e["drift"] = {"segment_median_ms": [round(x, 1) for x in seg], "span_ms": round(max(seg) - min(seg), 1),
                          "slope_ms_per_min": round(float(np.polyfit(b / 60, res, 1)[0]), 2)}
            e["downbeat"] = {"status": ref.downbeat_status, "majority_share": round(ref.downbeat_majority_share or 0, 3), "bar_origin": ref.bar_origin}
            if P.name in OFF:
                o, num = official(P.name)
                for lab, a in (("unmodified", raw_r.anchor_s), ("refined", ref.anchor_s)):
                    e["beat_phase"][f"official_minus_mine_ms_{lab}"] = [round((o[i] - (a + per * round((o[i] - a) / per))) * 1000, 1) for i in (10, len(o) // 2, len(o) - 10)]
                t1 = o[num == 1]; kk = np.round((t1 - ref.anchor_s) / per).astype(int) % 4
                maj = int(np.bincount(kk, minlength=4).argmax())
                e["downbeat"]["official_bar_origin"] = (-maj) % 4 + 1
                e["downbeat"]["matches_official"] = e["downbeat"]["official_bar_origin"] == ref.bar_origin
        out[P.name] = e
    (ROOT / "eval/rhythm_eval.json").write_text(json.dumps(out, indent=1))
    for k, e in out.items():
        bp, dr, db = e.get("beat_phase"), e.get("drift"), e.get("downbeat")
        print(f"{k[:24]:24} tempo Δ{e['tempo']['delta_bpm']:+7.3f} | {e['consistency']['status']:12} | "
              + (f"hat resid {bp['hat_attack_residual_ms_unmodified']:+5.1f}->{bp['hat_attack_residual_ms_refined']:+5.1f} | drift span {dr['span_ms']:4.1f} slope {dr['slope_ms_per_min']:+.2f} | bar {db['bar_origin']} share {db['majority_share']:.0%}"
                 + (f" official {'OK' if db['matches_official'] else 'DIFF'}" if 'matches_official' in db else "") if bp else "; ".join(e['consistency']['reasons'])[:80])
              + f" | {e['runtime_s']:.1f}s {e['peak_rss_mib']} MiB")


if __name__ == "__main__":
    main()
