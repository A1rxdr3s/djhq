"""The browser sub-column (secondary text on playlist rows) is configured by export.pdb table 18."""
import os
import struct
from pathlib import Path

from rekordbox_pdb.pdb import Database, TableType

DATA = Path(__file__).resolve().parent.parent / "src/set2go/data"
OFFICIAL = Path(__file__).resolve().parent.parent / "reference/rekordbox_official/PIONEER/rekordbox/export.pdb"
if not OFFICIAL.exists():
    _fallback_official = Path(os.environ.get("SET2GO_STANDALONE_DIR", "/Users/andresherrera/Developer/Set2Go")) / "reference/rekordbox_official/PIONEER/rekordbox/export.pdb"
    if _fallback_official.exists():
        OFFICIAL = _fallback_official


def _sort_rows(path):
    raw = path.read_bytes()
    db = Database.from_file(path)
    return [struct.unpack_from("<HHBB", raw, loc) for loc in db.row_locations(TableType.UNKNOWN_18)]


def test_subcol_seed_differs_from_empty_seed_by_one_byte():
    a = (DATA / "empty_seed.pdb").read_bytes()
    b = (DATA / "subcol_seed.pdb").read_bytes()
    assert len(a) == len(b)
    assert [(i, x, y) for i, (x, y) in enumerate(zip(a, b)) if x != y] == [(155788, 0, 2)]


def test_exactly_artist_is_selected_as_subcolumn():
    rows = _sort_rows(DATA / "subcol_seed.pdb")
    assert [r[0] for r in rows if r[2] == 2] == [2]          # menuItem 2 = ARTIST


def test_subcol_seed_sort_table_equals_official():
    assert _sort_rows(DATA / "subcol_seed.pdb") == _sort_rows(OFFICIAL)
