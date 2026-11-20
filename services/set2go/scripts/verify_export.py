#!/usr/bin/env python3
"""Verify an export tree (local dir or mounted USB) against its sources.

    uv run scripts/verify_export.py <export_root> [--exact]
    uv run scripts/verify_export.py <export_root> --manifest=<out>_MANIFEST.json [--exact]     # export built by scripts/analysis_key_export.py from ANY source folder

--exact additionally fails on any file outside the expected set (stale files).
--allow-inconsistent-rows tolerates pages whose declared row count != presence bits (only for reproducing OLDER candidates).
--manifest=<json> OPT-IN: the source manifest written by analysis_key_export.py. Sources are identified by resolved path + sha256 (never by basename); playlists, source
files, destination paths, device paths (PDB/PPTH) and the expected effective key per track come from it. Without it, behaviour is unchanged (sources from test-tracks/).
--effective-keys=<json> OPT-IN: {source file name: {"camelot": ...} | null} from an opt-in key export; a listed track is checked against the mapped key (null = must have
no key); unlisted tracks keep the strict TKEY comparison.
--plan=<json> expected playlists for diagnostic exports; --allow-tombstones for PDBs derived from an official export (rekordbox leaves deleted slots).
Exit code 0 = all checks passed.
"""
import hashlib
import struct
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))
sys.path.insert(0, str(ROOT / "scripts"))

from PIL import Image
from rekordbox_pdb.pdb import Database, TableType
from set2go.export import _anlz_dirs
from export_desktop_v1 import PLAYLISTS as DEFAULT_PLAYLISTS, T

def _plan():
    """Expected playlists. --plan=<json> {"playlist name": ["source filename", ...]} for diagnostic exports with a different plan."""
    for a in sys.argv:
        if a.startswith("--plan="):
            import json
            return json.loads(Path(a.split("=", 1)[1]).read_text())
    return DEFAULT_PLAYLISTS

def _manifest():
    for a in sys.argv:
        if a.startswith("--manifest="):
            from set2go.analysis import manifest as MF
            return MF.load(Path(a.split("=", 1)[1]))
    return None


MANIFEST = _manifest()
if MANIFEST is not None:
    _names = [t["source"]["path"] for t in MANIFEST["tracks"]]
    PLAYLISTS = {n: [Path(MANIFEST["tracks"][i]["destination"]).name for i in idx] for n, idx in MANIFEST["playlists"].items()}
else:
    PLAYLISTS = _plan()


def _src_for(file_path: str) -> Path:
    """The SOURCE file for a PDB track row: from the manifest (identity = resolved path + sha256) or, by default, T / basename (unchanged behaviour)."""
    if MANIFEST is None:
        return T / Path(file_path).name
    for t in MANIFEST["tracks"]:
        if t["device_path"] == file_path:
            return Path(t["source"]["path"])
    raise KeyError(f"PDB track {file_path!r} is not in the manifest")


def _source_is_silent(path: Path) -> bool:
    """True only if the DECODED source audio is exactly zero everywhere (measured from the file, never inferred from a key or a name)."""
    from set2go.waveform import _read_mono_float32
    m, _ = _read_mono_float32(path)
    return len(m) > 0 and float(abs(m).max()) == 0.0


def _manifest_track(file_path: str):
    if MANIFEST is None:
        return None
    for t in MANIFEST["tracks"]:
        if t["device_path"] == file_path:
            return t

fails: list[str] = []


def check(ok: bool, msg: str) -> None:
    print(("  ok   " if ok else "  FAIL ") + msg)
    if not ok:
        fails.append(msg)


def sha(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


def sections(p: Path) -> dict[str, list[bytes]]:
    d = p.read_bytes()
    off = struct.unpack_from(">I", d, 4)[0]
    out: dict[str, list[bytes]] = {}
    while off < len(d):
        tag = d[off:off + 4].decode()
        lh, lt = struct.unpack_from(">II", d, off + 4)
        out.setdefault(tag, []).append(d[off + lh:off + lt])
        off += lt
    assert off == len(d), "section lengths do not sum to file length"
    return out


_UNSET = object()


def key_check(pdb_key, tkey, effective=_UNSET):
    """(ok, message). Default: the PDB key must equal the source TKEY. With an explicit effective entry (opt-in map): it must equal that entry's Camelot,
    or be absent when the entry is None. Only tracks named in the map are affected."""
    if effective is _UNSET:
        return pdb_key == tkey.upper(), f"key {pdb_key!r} == TKEY {tkey!r}"
    want = effective["camelot"] if effective else None
    return pdb_key == want, f"key {pdb_key!r} == explicit effective key {want!r} (opt-in map; source TKEY {tkey!r})"


def _effective_keys() -> dict:
    for a in sys.argv:
        if a.startswith("--effective-keys="):
            import json
            return json.loads(Path(a.split("=", 1)[1]).read_text())
    return {}


EFFECTIVE_KEYS = _effective_keys()


def main() -> int:
    root = Path(sys.argv[1])
    db = Database.from_file(root / "PIONEER/rekordbox/export.pdb")
    tracks = {t.id: t for t in db.tracks}
    uniq = list(dict.fromkeys(n for v in PLAYLISTS.values() for n in v))

    print("[playlists]")
    tree = {n.id: n for n in db.playlist_tree}
    check(sorted(n.name for n in tree.values()) == sorted(PLAYLISTS), f"playlist names {[n.name for n in tree.values()]}")
    for n in tree.values():
        ents = sorted((e for e in db.playlist_entries if e.playlist_id == n.id), key=lambda e: e.entry_index)
        got = [Path(tracks[e.track_id].file_path).name for e in ents]
        check(got == PLAYLISTS[n.name], f"{n.name}: {len(got)} entries in expected order")
        check([e.entry_index for e in ents] == list(range(1, len(ents) + 1)), f"{n.name}: entry_index contiguous")

    if MANIFEST is not None:
        print("[manifest]")
        mp = {n: [MANIFEST["tracks"][i]["device_path"] for i in idx] for n, idx in MANIFEST["playlists"].items()}
        for n in tree.values():
            ents = sorted((e for e in db.playlist_entries if e.playlist_id == n.id), key=lambda e: e.entry_index)
            check([tracks[e.track_id].file_path for e in ents] == mp.get(n.name), f"{n.name}: device paths and order equal the manifest")
        check(sorted(t.file_path for t in tracks.values()) == sorted(x["device_path"] for x in MANIFEST["tracks"]), f"{len(tracks)} PDB tracks == {len(MANIFEST['tracks'])} manifest tracks (by device path)")
        if "excluded_tracks" in MANIFEST:
            excl_set = set(MANIFEST["excluded_tracks"])
            exported_names = {Path(t.file_path).name for t in tracks.values()}
            check(not (excl_set & exported_names), f"excluded tracks absent from PDB ({len(excl_set)} excluded)")
    print("[tracks / dedup]")
    check(len(tracks) == len(uniq) == len({n for v in PLAYLISTS.values() for n in v}), f"{len(tracks)} track rows, {len(uniq)} unique sources (plan: {len({n for v in PLAYLISTS.values() for n in v})})")
    check(len({t.file_path for t in tracks.values()}) == len(tracks), "no duplicate file_path rows")

    print("[metadata relationships]")
    artists = {r.id: r.name for r in db.artists}
    albums = {r.id: r.name for r in db.albums}
    keys = {r.id: r.name for r in db.keys}
    genres = {r.id: r.name for r in db.genres}
    labels = {r.id: r.name for r in db.labels}
    arts = {r.id: r.path for r in db.artwork}
    from set2go.metadata import read_metadata
    for t in tracks.values():
        src = _src_for(t.file_path)
        mt = _manifest_track(t.file_path)
        if mt is not None:
            check(sha(src) == mt["source"]["sha256"], f"{src.name[:30]}: source still has the manifest sha256 (not modified since the export)")
        m = read_metadata(src)
        tag = f"{src.name[:30]}"
        check(t.title == m.title, f"{tag}: title == source tag/fallback ({t.title!r})")
        check(artists.get(t.artist_id, "") == m.artist, f"{tag}: artist {artists.get(t.artist_id)!r}")
        check(albums.get(t.album_id, "") == m.album, f"{tag}: album {albums.get(t.album_id)!r}")
        check(genres.get(t.genre_id, "") == m.genre, f"{tag}: genre {genres.get(t.genre_id)!r}")
        check(labels.get(t.label_id, "") == m.label, f"{tag}: label {labels.get(t.label_id)!r}")
        if mt is not None:
            ek = mt["expected_key"]
            ok, msg = key_check(keys.get(t.key_id), m.key_tag, ek)
            check(ok, f"{tag}: {msg}" + (f" [{ek['origin']}: {ek['provenance']}]" if ek else " [no key expected]"))
        else:
            ok, msg = key_check(keys.get(t.key_id), m.key_tag, EFFECTIVE_KEYS.get(src.name, _UNSET))
            check(ok, f"{tag}: {msg}")
        check((t.artwork_id in arts) == bool(m.artwork), f"{tag}: artwork presence matches source (id {t.artwork_id})")
    check(all(r.id in {t.artist_id for t in tracks.values()} for r in db.artists), "no orphan artist rows")

    print("[page integrity]")
    raw = (root / "PIONEER/rekordbox/export.pdb").read_bytes()
    for ti in range(struct.unpack_from("<I", raw, 8)[0]):
        tt, _, first, last = struct.unpack_from("<IIII", raw, 28 + ti * 16)
        if tt not in (0, 2, 3, 4, 5, 7, 8, 13, 1):
            continue
        pg = first
        while True:
            o = pg * 4096
            n = raw[o + 0x18] + 0x100 * (raw[o + 0x19] & 1)
            pres = sum(bin(struct.unpack_from("<H", raw, o + 4096 - g * 0x24 - 4)[0] & ((1 << min(16, n - g * 16)) - 1)).count("1")
                       for g in range((n + 15) // 16))
            if "--allow-tombstones" in sys.argv:
                print(f"  info table {tt} page {pg}: {n} slots, {pres} present (tombstones allowed: official-derived PDB)")
            else:
                check(pres == n, f"table {tt} page {pg}: {n} slots, {pres} present (no soft-deleted ghosts)")
            if pg == last:
                break
            pg = struct.unpack_from("<I", raw, o + 0x0C)[0]
    shifts = [a.index_shift for a in db.artists]
    if "--allow-tombstones" not in sys.argv:
        check(shifts == [32 * i for i in range(len(shifts))], f"artist index_shift starts at 0 and steps by 32 {shifts[:3]}")

    print("[row-count consistency]")
    from set2go.pdbcheck import inconsistent_pages
    bad_pages = inconsistent_pages(raw)
    if "--allow-inconsistent-rows" in sys.argv:
        print(f"  info {len(bad_pages)} page(s) whose declared row count != presence bits (allowed by flag): {bad_pages[:4]}")
    else:
        check(not bad_pages, f"every data page's declared row count equals its presence bitmap {bad_pages[:3]}")

    print("[browser sub-column]")
    srows = [struct.unpack_from("<HHBB", raw, l) for l in db.row_locations(TableType.UNKNOWN_18)]
    sel = [r[0] for r in srows if r[2] == 2]
    if "--require-subcolumn-artist" in sys.argv:
        check(sel == [2], f"ARTIST (menuItem 2) is the selected sub-column; selected rows: {sel}")
    else:
        print(f"  info selected sub-column menu items: {sel} (pass --require-subcolumn-artist to enforce)")

    print("[artwork]")
    for aid, path in arts.items():
        for suffix, size in (("", 80), ("_m", 240)):
            for pre in ("a", "b"):
                p = root / path.lstrip("/").replace("/a", f"/{pre}", 1) if False else root / (path.lstrip("/").rsplit("/", 1)[0]) / f"{pre}{aid}{suffix}.jpg"
                ok = p.is_file()
                if ok:
                    im = Image.open(p); im.verify(); im = Image.open(p)
                    ok = im.size == (size, size) and im.format == "JPEG"
                check(ok, f"{p.name} valid {size}x{size} JPEG")

    print("[audio hashes]")
    for t in tracks.values():
        name = Path(t.file_path).name
        check(sha(root / "Contents" / name) == sha(_src_for(t.file_path)), f"{name[:50]} sha256 == source")
        mt = _manifest_track(t.file_path)
        if mt is not None:
            check(sha(root / mt["destination"]) == mt["source"]["sha256"], f"{name[:50]} destination {mt['destination']} sha256 == manifest source hash")

    print("[ANLZ]")
    for t in tracks.values():
        hi, lo = _anlz_dirs(t.file_path)
        d = root / "PIONEER/USBANLZ" / hi / lo
        check(t.analyze_path == f"/PIONEER/USBANLZ/{hi}/{lo}/ANLZ0000.DAT", f"{hi}/{lo} analyze_path == hash of audio path")
        dat, ext = sections(d / "ANLZ0000.DAT"), sections(d / "ANLZ0000.EXT")
        check(len(dat["PWAV"][0]) == 400 and len(dat["PWV2"][0]) == 100, f"{hi}: PWAV=400 PWV2=100")
        n = len(ext["PWV3"][0])
        check(len(ext["PWV5"][0]) == 2 * n, f"{hi}: PWV3/PWV5 length consistent ({n})")
        pw4 = ext["PWV4"][0]
        distinct = len({pw4[i:i+6] for i in range(0, 7200, 6)})
        if MANIFEST is not None and _source_is_silent(_src_for(t.file_path)):
            check(len(pw4) == 7200, f"{hi}: PWV4 1200x6 (source is digital silence: {distinct} distinct entries accepted, measured from the audio)")
        else:
            check(len(pw4) == 7200 and distinct > 100, f"{hi}: PWV4 1200x6, varied")
        q = dat["PQTZ"][0]
        nb = len(q) // 8
        times = [struct.unpack_from(">HHI", q, i * 8)[2] for i in range(nb)]
        if MANIFEST is None:
            check(nb > 100 and times == sorted(times), f"{hi}: PQTZ {nb} beats ascending")                      # v18 command: unchanged (full-length tracks)
        else:                                                                                              # arbitrary sources may be short: scale the minimum with the duration
            min_beats = max(4, int(t.duration / 2))                                                        # >= one beat per 2 s (any tempo above 30 BPM)
            check(nb >= min_beats and times == sorted(times) and len(set(times)) == nb, f"{hi}: PQTZ {nb} beats ascending and distinct (>= {min_beats} for {t.duration}s)")
        dur = t.duration
        check(abs(times[-1] / 1000 - dur) < 2, f"{hi}: grid spans track ({times[-1]/1000:.0f}s vs {dur}s)")
        ppth = dat["PPTH"][0]
        check(ppth[:-2].decode("utf-16-be") == t.file_path, f"{hi}: PPTH == file_path")
        mt = _manifest_track(t.file_path)
        if mt is not None:
            check(ppth[:-2].decode("utf-16-be") == mt["device_path"] and t.analyze_path.endswith("ANLZ0000.DAT"),
                  f"{hi}: PPTH and PDB path == manifest device path {mt['device_path'][:40]}")
            ext_ppth = ext["PPTH"][0] if "PPTH" in ext else b""
            check(ext_ppth[:-2].decode("utf-16-be") == mt["device_path"], f"{hi}: EXT PPTH == manifest device path")
            eg = mt.get("expected_grid")
            if eg and eg.get("bpm") and eg.get("anchor_ms") is not None:
                ebpm = float(eg["bpm"])
                eanchor = float(eg["anchor_ms"])
                eorigin = int(eg.get("bar_origin") or 1)
                ebpm100 = round(ebpm * 100)
                per_ms = 60000.0 / ebpm
                k0 = -int(eanchor // per_ms)
                pqtz_entries = [struct.unpack_from(">HHI", q, i * 8) for i in range(nb)]
                max_err_ms = max((abs(e[2] - (eanchor + (k0 + i) * per_ms)) for i, e in enumerate(pqtz_entries)), default=0.0)
                bn_ok = all(e[0] == ((eorigin - 1 + k0 + i) % 4 + 1) and e[1] == ebpm100 for i, e in enumerate(pqtz_entries))
                check(t.tempo == ebpm100 and max_err_ms <= 1.0 and bn_ok,
                      f"{hi}: PQTZ matches engine grid (bpm={ebpm:.3f}, anchor={eanchor:.3f}ms, origin={eorigin}, max |err|={max_err_ms:.3f}ms <= 1.0ms)")

    print("[file set]")
    present = {p.relative_to(root).as_posix() for p in root.rglob("*") if p.is_file()}
    expected = {"PIONEER/rekordbox/export.pdb"} | {f"Contents/{n}" for n in uniq}
    for t in tracks.values():
        hi, lo = _anlz_dirs(t.file_path)
        expected |= {f"PIONEER/USBANLZ/{hi}/{lo}/ANLZ0000.DAT", f"PIONEER/USBANLZ/{hi}/{lo}/ANLZ0000.EXT"}
    for aid in arts:
        for pre in "ab":
            for suf in ("", "_m"):
                expected.add(f"PIONEER/Artwork/00001/{pre}{aid}{suf}.jpg")
    missing = sorted(expected - present)
    extra = sorted(present - expected)
    check(not missing, f"no expected files missing {missing[:3]}")
    if "--exact" in sys.argv:
        ignorable = lambda f: f.split("/")[-1].startswith("._") or f.startswith((".Spotlight", ".fseventsd", ".Trashes", ".DS_Store"))
        extra = [f for f in extra if not ignorable(f)]
        check(not extra, f"no unexpected files ({len(extra)}) {extra[:5]}")
    print(f"\n{'ALL CHECKS PASSED' if not fails else str(len(fails)) + ' FAILED'}")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
