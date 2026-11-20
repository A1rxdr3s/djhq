"""Read source tags (ID3 in AIFF/WAV/MP3) without altering them.

Titles are returned exactly as tagged. Key-prefix patterns such as
"7A - 6 - Title" are NOT stripped here; use strip_key_prefix() only when the
caller explicitly asks for normalization.

When a tag is missing, artist/title may be recovered from the filename
("Artist - Title.ext"). Every field records its provenance in `sources`
("tag" | "filename" | "missing") so exports can report what was inferred.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path

_KEY_PREFIX = re.compile(r"^\d{1,2}[AB]\s*-\s*\d\s*-\s*")


@dataclass
class TrackMeta:
    title: str = ""
    artist: str = ""
    album: str = ""
    genre: str = ""
    label: str = ""
    key_tag: str = ""
    bpm_tag: str = ""
    year: int = 0
    artwork: bytes | None = None
    artwork_mime: str = ""
    sources: dict[str, str] = field(default_factory=dict)


def strip_key_prefix(title: str) -> str:
    """Explicit normalization helper: "7A - 6 - Habit" -> "Habit"."""
    return _KEY_PREFIX.sub("", title, count=1)


def _open_tags(path: Path):
    from mutagen.aiff import AIFF
    from mutagen.wave import WAVE
    from mutagen.id3 import ID3

    ext = path.suffix.lower()
    try:
        if ext in (".aif", ".aiff"):
            return AIFF(str(path)).tags
        if ext == ".wav":
            return WAVE(str(path)).tags
        return ID3(str(path))
    except Exception:
        return None


def _text(tags, frame: str) -> str:
    if tags is None or frame not in tags:
        return ""
    try:
        return str(tags[frame].text[0]).strip()
    except Exception:
        return ""


def read_metadata(path: Path) -> TrackMeta:
    path = Path(path)
    tags = _open_tags(path)
    m = TrackMeta()
    for attr, frame in (("title", "TIT2"), ("artist", "TPE1"), ("album", "TALB"),
                        ("genre", "TCON"), ("label", "TPUB"), ("key_tag", "TKEY"),
                        ("bpm_tag", "TBPM")):
        v = _text(tags, frame)
        setattr(m, attr, v)
        m.sources[attr] = "tag" if v else "missing"

    ym = re.match(r"\d{4}", _text(tags, "TDRC"))
    if ym:
        m.year = int(ym.group(0))

    # Filename fallback: only for artist/title, only when the tag is absent.
    stem = path.stem
    if " - " in stem and (not m.artist or not m.title):
        f_artist, f_title = stem.split(" - ", 1)
        if not m.artist:
            m.artist, m.sources["artist"] = f_artist.strip(), "filename"
        if not m.title:
            m.title, m.sources["title"] = f_title.strip(), "filename"
    if not m.title:
        m.title, m.sources["title"] = stem, "filename"

    if tags is not None:
        pics = tags.getall("APIC")
        if pics:
            pic = next((p for p in pics if p.type == 3), pics[0])
            m.artwork, m.artwork_mime = bytes(pic.data), pic.mime
    return m
