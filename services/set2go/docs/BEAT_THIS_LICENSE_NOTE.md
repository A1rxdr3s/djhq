# Beat This! — licence record (verified 2026-10-28)

| Item | Version / id | Licence | Evidence |
|---|---|---|---|
| Code `beat-this` | 1.1.0 (repo HEAD b95c8ab0c58c, tag v1.1.0) | MIT, (c) 2024 JKU Linz | pip package LICENSE is byte-identical to repo main LICENSE; pyproject `license = "MIT"` |
| Weights `final0` | `models/beat_this-final0.ckpt`, sha256 `8c328b45f59d8dd3dff219253ff6a8d6482be57d0133a29140e2febbf8eb8331` (78 MB) | MIT ("the code and the published model weights are released under the MIT license") | README "License" section |
| Annotations repo | CPJKU/beat_this_annotations | MIT (repo metadata) | each source dataset credited separately |

## Training-data caveat (verbatim from the README)
"Note that some of the training files are fully copyrighted or under limited Creative Commons licenses, and it is
up to the user to assess whether this may impact their use case."

Context: `final*` models were trained on 16 datasets minus GTZAN (ASAP, Ballroom, Beatles, Candombe, Filosax, Groove
MIDI, GuitarSet, Hainsworth, Harmonix, HJDB, JAAH, RWC, SIMAC, SMC, TapCorrect, ...), several of which are
research-licensed or rely on commercial recordings. The model authors grant MIT on weights; they do not warrant
the status of the training audio. This is a risk to assess before any commercial distribution, not a finding of
infringement and not treated here as disqualifying for local evaluation. Not legal advice.

Also relevant: GTZAN is excluded from `final*` training; results on training-set tracks can be optimistic.
Our ten test tracks are commercial releases that are not in the published datasets, to the best of our knowledge.

Other engines: madmom models CC BY-NC-SA 4.0 (non-commercial) and essentia AGPL-3.0 were not adopted.
