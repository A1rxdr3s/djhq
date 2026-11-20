"""Embedded-artwork export in the layout rekordbox uses.

For artwork id N the CDJ reads /PIONEER/Artwork/00001/a<N>.jpg (80x80) and
a<N>_m.jpg (240x240). Official exports also carry identical b<N>/b<N>_m copies;
we write them too. Source images are decoded, centre-cropped to a square and
resized; nothing is invented for tracks without embedded art.
"""

from __future__ import annotations

import io
from pathlib import Path

from PIL import Image

_SIZES = {"": 80, "_m": 240}
_BUCKET = "00001"


def render(data: bytes, size: int) -> bytes:
    img = Image.open(io.BytesIO(data)).convert("RGB")
    w, h = img.size
    side = min(w, h)
    img = img.crop(((w - side) // 2, (h - side) // 2, (w - side) // 2 + side, (h - side) // 2 + side))
    img = img.resize((size, size), Image.LANCZOS)
    out = io.BytesIO()
    img.save(out, "JPEG", quality=90, optimize=False)
    return out.getvalue()


def write_artwork(artwork_dir: Path, art_id: int, data: bytes) -> str:
    """Write the four files for art_id; return the PDB path of the 80px image."""
    d = artwork_dir / _BUCKET
    d.mkdir(parents=True, exist_ok=True)
    for suffix, size in _SIZES.items():
        blob = render(data, size)
        for prefix in ("a", "b"):
            (d / f"{prefix}{art_id}{suffix}.jpg").write_bytes(blob)
    return f"/PIONEER/Artwork/{_BUCKET}/a{art_id}.jpg"
