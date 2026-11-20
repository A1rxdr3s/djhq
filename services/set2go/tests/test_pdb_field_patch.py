"""pdb_field_patch: same-size, field-level patching; must change only the named fields and refuse what it cannot do safely."""
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
V6 = ROOT / "desktop_v6_officialpdb"
pytestmark = pytest.mark.skipif(not V6.exists(), reason="diagnostic tree not present")


def _ours3(tmp_path):
    sys.path.insert(0, str(ROOT / "src"))
    from set2go.export import TrackSpec, export_library
    names = ["Earth n Days - Make It High (Extended Mix) [Toolroom Trax].aiff",
             "Snoop Dogg, HUGEL - H.O.U.S.E (Extended Mix) [Make The Girls Dance Records].aiff",
             "Zsak - The Dancefloor (Extended Mix) [There Was Jack].aif"]
    src = ROOT / "test-tracks"
    if not all((src / n).exists() for n in names) or not (ROOT / "desktop_v4_rhythm").exists():
        pytest.skip("needs the test tracks and desktop_v4_rhythm (analysis reuse)")
    out = tmp_path / "ours3"
    export_library({"RekordSOS Reference": [TrackSpec(src / n) for n in names]}, out, analysis_from=ROOT / "desktop_v4_rhythm",
                   subcolumn_artist=True, link_audio_from=ROOT / "desktop_v4_rhythm")
    return out


@pytest.mark.parametrize("group", ["unique_id", "const18", "playcount", "dates"])
def test_group_patches_only_its_fields(tmp_path, group):
    ours = _ours3(tmp_path)
    out = tmp_path / "o" / "PIONEER/rekordbox/export.pdb"
    r = subprocess.run([sys.executable, "-I", str(ROOT / "scripts/pdb_field_patch.py"), str(ours), str(V6), group, str(out)], capture_output=True, text=True)
    assert r.returncode == 0, r.stderr[-400:]
    assert "every other field/table intact" in r.stdout and out.exists()


def test_unsupported_group_is_refused_and_writes_nothing(tmp_path):
    ours = _ours3(tmp_path)
    out = tmp_path / "o" / "PIONEER/rekordbox/export.pdb"
    r = subprocess.run([sys.executable, "-I", str(ROOT / "scripts/pdb_field_patch.py"), str(ours), str(V6), "strings23", str(out)], capture_output=True, text=True)
    assert r.returncode != 0 and "would re-lay the row" in r.stderr
    assert not out.exists()
