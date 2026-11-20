# Separate local Python environment issue

The current Python 3.15 environment cannot build the `aubio` dependency required by the local audio engine. This affects local analysis and export checks that invoke the engine. It does not affect browser-to-R2 cloud staging, which transfers synthetic audio without running the Python engine. Resolve the Python dependency separately; do not alter the engine as part of cloud upload activation.
