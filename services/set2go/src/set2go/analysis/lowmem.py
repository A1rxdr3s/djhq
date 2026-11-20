"""Compatibility shim: the blocked onset envelope is now the production default in bpm_detect._onset_envelope (adopted after the equivalence gates).
onset_envelope_blocked() is kept as an alias so existing scripts keep working; the full-matrix reference is bpm_detect._onset_envelope_full()."""
from .. import bpm_detect as _B


def onset_envelope_blocked(mono, sr: int, block_frames: int = 2048):
    return _B._onset_envelope(mono, sr, block_frames)
