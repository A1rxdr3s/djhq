"""Musical analysis engine (opt-in; independent of the validated export path).

Nothing here is imported by export.py. Modules:
  metrics  - BPM / beat-timing / downbeat metrics as pure functions (separate quantities)
  keys     - key naming, relations (exact / parallel / relative / fifth / other) and a permissive chroma estimator
  refs     - reference store: tags, official rekordbox analysis and user labels are kept apart; development vs independent split
  review   - interpretable needs_review reasons (no invented probabilities)
  sidecar  - hash-linked analysis sidecar: raw predictions preserved, manual overrides preserved, stale detection
"""
ANALYSIS_VERSION = "0.1.0"
