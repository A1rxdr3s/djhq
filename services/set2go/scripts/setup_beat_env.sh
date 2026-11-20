#!/bin/bash
# Optional rhythm backend: isolated venv for Beat This! (separate from the main .venv).
# Usage: bash scripts/setup_beat_env.sh        (creates .venv-beat, downloads checkpoint final0)
set -euo pipefail
cd "$(dirname "$0")/.."
[ -d .venv-beat ] || uv venv --python 3.12 .venv-beat
uv pip install --python .venv-beat/bin/python "beat-this==1.1.0" soundfile
mkdir -p models
.venv-beat/bin/python - <<'PY'
import torch, hashlib, pathlib, shutil
from beat_this.inference import File2Beats
File2Beats(checkpoint_path="final0", device="cpu", dbn=False)   # triggers download into torch hub cache
src = pathlib.Path(torch.hub.get_dir()) / "checkpoints" / "beat_this-final0.ckpt"
dst = pathlib.Path("models/beat_this-final0.ckpt"); shutil.copy2(src, dst)
print("checkpoint", dst, hashlib.sha256(dst.read_bytes()).hexdigest())
PY
